/* ALMACÉN LOCAL (IndexedDB). Única fuente de datos de la Fase 1.
   Migraciones numeradas en MIGRACIONES: nunca se edita una ya publicada; se agrega la siguiente. */
window.SRP = window.SRP || {};

SRP.almacen = {
  db: null,

  MIGRACIONES: {
    // No se edita una migración ya publicada, aunque los nombres hayan cambiado después:
    // los dispositivos que la corrieron tienen exactamente esta estructura. Lo que cambia
    // va en la siguiente.
    1(db) {
      const pl = db.createObjectStore('plantaciones', { keyPath: 'id' });
      pl.createIndex('registrador_id', 'registrador_id');
      pl.createIndex('fecha_plantacion', 'fecha_plantacion');
      pl.createIndex('estatus', 'estatus');
      db.createObjectStore('usuarios', { keyPath: 'id' });
      const ca = db.createObjectStore('catalogos', { keyPath: 'id' });
      ca.createIndex('tipo', 'tipo');
      const bi = db.createObjectStore('bitacora', { keyPath: 'id' });
      bi.createIndex('entidad_id', 'entidad_id');
    },

    /* 2: «registrador» pasa a llamarse «cabo» y «jefe de registradores» a «coordinador»,
       que son los términos que usa el personal. Cambia el nombre, no el significado.
       Renombrar sólo en el código habría dejado los dispositivos ya usados con los campos
       viejos: un cabo dejaría de ver sus propios registros. Por eso el cambio de datos
       también es migración (Norma 4.2). */
    2(db, tx) {
      const pl = tx.objectStore('plantaciones');
      if (pl.indexNames.contains('registrador_id')) pl.deleteIndex('registrador_id');
      if (!pl.indexNames.contains('cabo_id')) pl.createIndex('cabo_id', 'cabo_id');

      pl.openCursor().onsuccess = (ev) => {
        const c = ev.target.result; if (!c) return;
        const r = c.value;
        if ('registrador_id' in r) { r.cabo_id = r.registrador_id; delete r.registrador_id; c.update(r); }
        c.continue();
      };

      const PERFIL = { REGISTRADOR: 'CABO', JEFE: 'COORDINADOR' };
      tx.objectStore('usuarios').openCursor().onsuccess = (ev) => {
        const c = ev.target.result; if (!c) return;
        const u = c.value; let tocado = false;
        if ('jefe_id' in u) { u.coordinador_id = u.jefe_id; delete u.jefe_id; tocado = true; }
        if (PERFIL[u.perfil]) { u.perfil = PERFIL[u.perfil]; tocado = true; }
        if (tocado) c.update(u);
        c.continue();
      };

      // La bitácora guarda el perfil de quien actuó: se traduce para que el historial
      // siga siendo legible, sin alterar qué se hizo ni cuándo.
      tx.objectStore('bitacora').openCursor().onsuccess = (ev) => {
        const c = ev.target.result; if (!c) return;
        const b = c.value;
        if (PERFIL[b.perfil]) { b.perfil = PERFIL[b.perfil]; c.update(b); }
        c.continue();
      };
    }
  },

  abrir() {
    return new Promise((resolver, rechazar) => {
      const pet = indexedDB.open(SRP.CONFIG.DB_NOMBRE, SRP.CONFIG.DB_VERSION);
      pet.onupgradeneeded = (ev) => {
        // pet.transaction es la transacción de la actualización: la única desde la que se
        // pueden cambiar índices y datos a la vez
        for (let v = ev.oldVersion + 1; v <= SRP.CONFIG.DB_VERSION; v++) this.MIGRACIONES[v](pet.result, pet.transaction);
      };
      pet.onsuccess = () => { this.db = pet.result; resolver(); };
      pet.onerror = () => rechazar(pet.error);
    });
  },

  _tx(almacenes, modo, trabajo) {
    return new Promise((resolver, rechazar) => {
      const tx = this.db.transaction(almacenes, modo);
      let salida;
      tx.oncomplete = () => resolver(salida);
      tx.onerror = () => rechazar(tx.error);
      tx.onabort = () => rechazar(tx.error);
      salida = trabajo(tx);
    });
  },

  todos(almacen) {
    return new Promise((resolver, rechazar) => {
      const pet = this.db.transaction(almacen).objectStore(almacen).getAll();
      pet.onsuccess = () => resolver(pet.result);
      pet.onerror = () => rechazar(pet.error);
    });
  },

  uno(almacen, id) {
    return new Promise((resolver, rechazar) => {
      const pet = this.db.transaction(almacen).objectStore(almacen).get(id);
      pet.onsuccess = () => resolver(pet.result);
      pet.onerror = () => rechazar(pet.error);
    });
  },

  porIndice(almacen, indice, valor) {
    return new Promise((resolver, rechazar) => {
      const pet = this.db.transaction(almacen).objectStore(almacen).index(indice).getAll(valor);
      pet.onsuccess = () => resolver(pet.result);
      pet.onerror = () => rechazar(pet.error);
    });
  },

  // Guarda el objeto y su renglón de bitácora en la misma transacción: o quedan los dos o ninguno.
  guardarConBitacora(almacen, objeto, entradaBitacora) {
    return this._tx([almacen, 'bitacora'], 'readwrite', (tx) => {
      tx.objectStore(almacen).put(objeto);
      if (entradaBitacora) tx.objectStore('bitacora').put(entradaBitacora);
    });
  },

  borrarConBitacora(almacen, id, entradaBitacora) {
    return this._tx([almacen, 'bitacora'], 'readwrite', (tx) => {
      tx.objectStore(almacen).delete(id);
      tx.objectStore('bitacora').put(entradaBitacora);
    });
  },

  async sembrarSiVacio() {
    const existentes = await this.todos('usuarios');
    if (existentes.length) return;
    const d = SRP.DATOS_FICTICIOS;
    await this._tx(['usuarios', 'catalogos', 'plantaciones'], 'readwrite', (tx) => {
      d.usuarios.forEach(u => tx.objectStore('usuarios').put(u));
      d.catalogos.forEach(c => tx.objectStore('catalogos').put(c));
      d.plantaciones.forEach(p => {
        const t = SRP.derivacion.derivar(p.lat, p.lng);
        tx.objectStore('plantaciones').put(Object.assign({}, p, {
          alcaldia: t.alcaldia, colonia: t.colonia, uga: t.uga, capa_version: t.capa_version
        }));
      });
    });
  },

  async restablecer() {
    await this._tx(['usuarios', 'catalogos', 'plantaciones', 'bitacora'], 'readwrite', (tx) => {
      ['usuarios', 'catalogos', 'plantaciones', 'bitacora'].forEach(a => tx.objectStore(a).clear());
    });
    await this.sembrarSiVacio();
  }
};

/* BITÁCORA (Norma 7.7): quién, cuándo, qué. No se edita desde la aplicación. */
SRP.bitacora = {
  entrada(accion, entidad, entidad_id, detalle) {
    const u = SRP.sesion.usuario;
    return {
      id: SRP.util.generarId(),
      fecha: SRP.util.ahoraISO(),
      usuario_id: u.id,
      usuario_nombre: SRP.util.nombreCompleto(u),
      perfil: u.perfil,
      accion,                 // CREADO | EDITADO | ELIMINADO | DESACTIVADO | ACTIVADO
      entidad,                // plantacion | catalogo | usuario
      entidad_id,
      detalle: detalle || ''  // p. ej. campos cambiados
    };
  },

  async deEntidad(id) {
    const lista = await SRP.almacen.porIndice('bitacora', 'entidad_id', id);
    return lista.sort((a, b) => a.fecha.localeCompare(b.fecha));
  }
};
