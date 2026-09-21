/* ALMACÉN LOCAL (IndexedDB). Única fuente de datos de la Fase 1.
   Migraciones numeradas en MIGRACIONES: nunca se edita una ya publicada; se agrega la siguiente. */
window.SRP = window.SRP || {};

SRP.almacen = {
  db: null,

  MIGRACIONES: {
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
    }
  },

  abrir() {
    return new Promise((resolver, rechazar) => {
      const pet = indexedDB.open(SRP.CONFIG.DB_NOMBRE, SRP.CONFIG.DB_VERSION);
      pet.onupgradeneeded = (ev) => {
        for (let v = ev.oldVersion + 1; v <= SRP.CONFIG.DB_VERSION; v++) this.MIGRACIONES[v](pet.result);
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
