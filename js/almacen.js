/* ALMACÉN LOCAL (IndexedDB). Única fuente de datos de la Fase 1.
   Migraciones numeradas en MIGRACIONES: nunca se edita una ya publicada; se agrega la siguiente. */
window.SRP = window.SRP || {};

SRP.almacen = {
  db: null,

  /* ESTRUCTURA DE LA BASE.
     Mientras todo sea ficticio, un cambio de estructura se hace aquí y la base se recrea: es lo
     que pidió Liber para no arrastrar migraciones de una nomenclatura que todavía se está
     decidiendo. Se borra lo que haya en el dispositivo, y no importa porque son datos de prueba.

     [pendiente] En cuanto exista el primer dato real esto deja de valer: a partir de ahí cada
     cambio de estructura es una migración numerada que conserva lo guardado (Norma 4.1 y 4.2),
     y ESTRUCTURA_VERSION deja de poder bajar ni cambiar de significado. */
  /* Los almacenes que este código da por existentes. Se declaran aquí una sola vez y se
     comprueban al abrir: mientras la estructura viva entera en MIGRACIONES[1], un dispositivo que
     ya abrió el sistema no vuelve a ejecutarla, y un almacén nuevo no aparecería solo. Es el mismo
     problema que SELLO_DATOS resolvió para los datos, ahora para la estructura. */
  ALMACENES: ['plantaciones', 'usuarios', 'catalogos', 'bitacora', 'cierres'],

  MIGRACIONES: {
    1(db) {
      const pl = db.createObjectStore('plantaciones', { keyPath: 'id' });
      pl.createIndex('cabo_id', 'cabo_id');
      pl.createIndex('fecha_plantacion', 'fecha_plantacion');
      pl.createIndex('estatus', 'estatus');
      db.createObjectStore('usuarios', { keyPath: 'id' });
      const ca = db.createObjectStore('catalogos', { keyPath: 'id' });
      ca.createIndex('tipo', 'tipo');
      const bi = db.createObjectStore('bitacora', { keyPath: 'id' });
      bi.createIndex('entidad_id', 'entidad_id');
      /* CIERRES DE REPORTE. Lo que acompaña al reporte del día y no vive en los registros: sitio,
         actividades, personal, observaciones y logística. La clave es «fecha|cabo», para que
         regenerar el reporte de un día no obligue a volver a escribirlo (ver reportes.js). */
      const ci = db.createObjectStore('cierres', { keyPath: 'id' });
      ci.createIndex('fecha', 'fecha');
    }
  },

  abrir() {
    return new Promise((resolver, rechazar) => {
      const pet = indexedDB.open(SRP.CONFIG.DB_NOMBRE, SRP.CONFIG.DB_VERSION);
      pet.onupgradeneeded = (ev) => {
        for (let v = ev.oldVersion + 1; v <= SRP.CONFIG.DB_VERSION; v++) this.MIGRACIONES[v](pet.result, pet.transaction);
      };
      pet.onsuccess = () => {
        this.db = pet.result;
        const faltan = this.ALMACENES.filter(n => !this.db.objectStoreNames.contains(n));
        if (!faltan.length) { resolver(); return; }
        /* [pendiente] Con el primer dato real esto deja de valer: un almacén que falta pasa a
           ser una migración numerada que conserva lo guardado (Norma 4.1), nunca un borrado. */
        if (!SRP.CONFIG.ES_FICTICIO) {
          rechazar(new Error('La base de este dispositivo no tiene: ' + faltan.join(', ') + '.'));
          return;
        }
        this.db.close();
        this.rehacerBase().then(() => this.sembrar()).then(resolver, rechazar);
      };
      // Un dispositivo que abrió una estructura posterior a la que pide este código no puede
      // abrirla hacia atrás. Mientras los datos sean ficticios se descarta y se rehace; con
      // datos reales esto tendría que ser una migración, nunca un borrado.
      pet.onerror = () => {
        if (pet.error && pet.error.name === 'VersionError' && SRP.CONFIG.ES_FICTICIO) {
          this.rehacerBase().then(resolver, rechazar);
        } else {
          rechazar(pet.error);
        }
      };
    });
  },

  rehacerBase() {
    return new Promise((resolver, rechazar) => {
      const borrado = indexedDB.deleteDatabase(SRP.CONFIG.DB_NOMBRE);
      const seguir = () => {
        const pet2 = indexedDB.open(SRP.CONFIG.DB_NOMBRE, SRP.CONFIG.DB_VERSION);
        pet2.onupgradeneeded = (ev) => {
          for (let v = ev.oldVersion + 1; v <= SRP.CONFIG.DB_VERSION; v++) this.MIGRACIONES[v](pet2.result, pet2.transaction);
        };
        pet2.onsuccess = () => { this.db = pet2.result; resolver(); };
        pet2.onerror = () => rechazar(pet2.error);
      };
      borrado.onsuccess = seguir;
      borrado.onerror = () => rechazar(borrado.error);
      // Si otra pestaña tiene la base abierta, el borrado se queda esperando: se avisa
      borrado.onblocked = () => rechazar(new Error(
        'Hay otra pestaña con el sistema abierto. Ciérrela y vuelva a cargar esta página.'));
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

  selloGuardado() {
    try { return localStorage.getItem(SRP.CONFIG.CLAVE_SELLO); } catch (e) { return null; }
  },

  anotarSello() {
    try { localStorage.setItem(SRP.CONFIG.CLAVE_SELLO, SRP.CONFIG.SELLO_DATOS); } catch (e) { /* sin persistencia */ }
  },

  // Devuelve true si tuvo que rehacer los datos de prueba, para poder avisarlo
  async sembrarSiVacio() {
    const existentes = await this.todos('usuarios');
    const selloViejo = this.selloGuardado();
    if (existentes.length && selloViejo === SRP.CONFIG.SELLO_DATOS) return false;
    if (existentes.length) {           // hay datos, pero de una versión anterior de las pruebas
      await this.restablecer();
      return true;
    }
    await this.sembrar();
    return false;
  },

  async sembrar() {
    const d = SRP.DATOS_FICTICIOS;
    await this._tx(['usuarios', 'catalogos', 'plantaciones'], 'readwrite', (tx) => {
      d.usuarios.forEach(u => tx.objectStore('usuarios').put(u));
      d.catalogos.forEach(c => tx.objectStore('catalogos').put(c));
      // Si alguna vez vuelven a cargarse plantaciones de prueba, su territorio se deriva aquí
      d.plantaciones.forEach(p => {
        const t = SRP.derivacion.derivar(p.lat, p.lng);
        tx.objectStore('plantaciones').put(Object.assign({}, p, {
          alcaldia: t.alcaldia, colonia: t.colonia, uga: t.uga, capa_version: t.capa_version
        }));
      });
    });
    this.anotarSello();
  },

  async restablecer() {
    await this._tx(this.ALMACENES, 'readwrite', (tx) => {
      this.ALMACENES.forEach(n => tx.objectStore(n).clear());
    });
    await this.sembrar();
  }
};

/* BITÁCORA (Norma 7.7): quién, cuándo, qué. No se edita desde la aplicación. */
SRP.bitacora = {
  entrada(accion, entidad, entidad_id, detalle) {
    const u = SRP.sesion.usuario;
    return {
      id: SRP.util.generarId(),
      es_ficticio: SRP.CONFIG.ES_FICTICIO,   // D87: la depuración de datos de prueba también alcanza a la bitácora
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
