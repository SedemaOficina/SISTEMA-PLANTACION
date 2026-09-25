/* ALMACÉN LOCAL (IndexedDB). Única fuente de datos de la Fase 1.
   Migraciones numeradas en MIGRACIONES: nunca se edita una ya publicada; se agrega la siguiente. */
window.SRP = window.SRP || {};

SRP.almacen = {
  db: null,

  /* LO CAPTURADO NO SE BORRA SOLO (D149). Antes, un sello de datos nuevo, un sello perdido o una
     base de otra versión vaciaban el teléfono sin preguntar, aunque hubiera árboles sin respaldo:
     en la Etapa 1 esa es la única copia. Ahora:
       · El sello (SELLO_DATOS) sólo rehace los datos de ejemplo —cuentas y catálogos— cuando no
         hay nada capturado (árboles, jornadas o bitácora). Si lo hay, se conserva todo.
       · Una base a la que le falta un almacén, o que viene de una versión posterior, se rehace
         conservando lo que tenía: se lee entera, se recrea y se devuelve cada renglón a su almacén.
       · Un cambio en la forma de los datos viaja como migración numerada, nunca como borrado. */
  // Los almacenes que este código da por existentes; se comprueban al abrir
  ALMACENES: ['plantaciones', 'usuarios', 'catalogos', 'bitacora', 'jornadas'],
  conservados: null,   // lo que se devolvió al rehacer la base ({ arboles, jornadas }), para avisarlo

  /* MIGRACIONES NUMERADAS. Nunca se edita una ya publicada; se agrega la siguiente. Regla: lo que
     un almacén va a dejar de guardar se traslada ANTES de borrarlo (la 2 retiró «cierres» sin
     trasladarlo; con datos reales eso habría perdido los cierres). */
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
    },
    /* JORNADAS (D119). La jornada se declara antes de registrar y guarda también lo que antes
       vivía en «cierres» (conteo, puntos revisados, datos de cierre del reporte). La tabla de
       cierres se retira; los datos de prueba se rehacen al cambiar el sello. */
    2(db) {
      const jo = db.createObjectStore('jornadas', { keyPath: 'id' });
      jo.createIndex('cabo_id', 'cabo_id');
      jo.createIndex('fecha', 'fecha');
      jo.createIndex('estatus', 'estatus');
      if (db.objectStoreNames.contains('cierres')) db.deleteObjectStore('cierres');
    },
    /* ÍNDICES AL USO (D153). Cada jornada recorría todos los árboles para encontrar los suyos: se
       agrega `jornada_id`. Se retiran cinco índices que nada consulta —cabo y fecha de los árboles,
       tipo de catálogo, fecha y estatus de las jornadas—. Crear o quitar un índice no toca los datos. */
    3(db, tx) {
      const pl = tx.objectStore('plantaciones');
      if (!pl.indexNames.contains('jornada_id')) pl.createIndex('jornada_id', 'jornada_id');
      [['plantaciones', 'cabo_id'], ['plantaciones', 'fecha_plantacion'], ['catalogos', 'tipo'], ['jornadas', 'fecha'], ['jornadas', 'estatus']]
        .forEach(([almacen, indice]) => { const s = tx.objectStore(almacen); if (s.indexNames.contains(indice)) s.deleteIndex(indice); });
    }
  },

  abrir() {
    return new Promise((resolver, rechazar) => {
      const pet = indexedDB.open(SRP.CONFIG.DB_NOMBRE, SRP.CONFIG.DB_VERSION);
      pet.onupgradeneeded = (ev) => {
        for (let v = ev.oldVersion + 1; v <= SRP.CONFIG.DB_VERSION; v++) this.MIGRACIONES[v](pet.result, pet.transaction);
      };
      // Otra pestaña con una versión anterior abierta detiene la actualización hasta que se cierre
      pet.onblocked = () => SRP.util.anunciar('Hay otra pestaña del SRP abierta con una versión anterior. Ciérrela para continuar.', 'alerta');
      pet.onsuccess = () => {
        this.db = pet.result;
        this.vigilarVersion();
        const faltan = this.ALMACENES.filter(n => !this.db.objectStoreNames.contains(n));
        if (!faltan.length) { resolver(); return; }
        if (!SRP.CONFIG.ES_FICTICIO) {
          rechazar(new Error('La base de este dispositivo no tiene: ' + faltan.join(', ') + '.'));
          return;
        }
        this.db.close();
        this.rehacerConservando().then(resolver, rechazar);
      };
      /* Una base de una versión posterior (se abrió una versión nueva y luego el navegador sirvió
         la anterior) no se puede abrir hacia atrás. Con datos de prueba se rehace conservando lo
         que tenía; con datos reales se pide recargar para obtener la versión nueva. */
      pet.onerror = () => {
        const version = pet.error && pet.error.name === 'VersionError';
        if (version && SRP.CONFIG.ES_FICTICIO) this.rehacerConservando().then(resolver, rechazar);
        else if (version) rechazar(new Error('Este teléfono guarda datos de una versión más nueva del sistema. Recargue la página para obtenerla'));
        else rechazar(pet.error);
      };
    });
  },

  // Si otra pestaña abre una versión nueva, ésta suelta la base para no bloquearla y pide recargar
  vigilarVersion() {
    this.db.onversionchange = () => {
      this.db.close();
      SRP.util.anunciar('Se abrió una versión nueva del SRP en otra pestaña. Recargue esta página para seguir.', 'alerta');
    };
  },

  // Lee la base tal como esté, sin pedir versión: todos sus almacenes y renglones
  leerTodo() {
    return new Promise((resolver, rechazar) => {
      const pet = indexedDB.open(SRP.CONFIG.DB_NOMBRE);
      pet.onsuccess = () => {
        const db = pet.result;
        const nombres = [...db.objectStoreNames];
        const copia = {};
        if (!nombres.length) { db.close(); resolver(copia); return; }
        const tx = db.transaction(nombres, 'readonly');
        nombres.forEach(n => { const g = tx.objectStore(n).getAll(); g.onsuccess = () => { copia[n] = g.result; }; });
        tx.oncomplete = () => { db.close(); resolver(copia); };
        tx.onerror = () => { db.close(); rechazar(tx.error); };
      };
      pet.onerror = () => rechazar(pet.error);
    });
  },

  /* Rehace la base sin perder lo que tenía (D149): la copia vive en memoria el instante entre el
     borrado y la recreación, y cada renglón vuelve al almacén del mismo nombre si existe. */
  async rehacerConservando() {
    const copia = await this.leerTodo();
    await this.rehacerBase();
    this.vigilarVersion();
    const destinos = Object.keys(copia).filter(n => this.db.objectStoreNames.contains(n) && copia[n].length);
    if (destinos.length) {
      await this._tx(destinos, 'readwrite', (tx) => destinos.forEach(n => copia[n].forEach(o => tx.objectStore(n).put(o))));
    }
    this.conservados = { arboles: (copia.plantaciones || []).length, jornadas: (copia.jornadas || []).length };
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

  /* Varios cambios que van juntos, en una sola transacción: entran todos o ninguno (D151). Así una
     jornada y sus árboles no pueden quedar a medias si el teléfono se queda sin espacio o se cierra
     la página a la mitad. `cambios`: [{ almacen, objeto, bitacora }]. */
  guardarJuntos(cambios) {
    const almacenes = [...new Set(cambios.map(c => c.almacen).concat('bitacora'))];
    return this._tx(almacenes, 'readwrite', (tx) => cambios.forEach(c => {
      tx.objectStore(c.almacen).put(c.objeto);
      if (c.bitacora) tx.objectStore('bitacora').put(c.bitacora);
    }));
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

  // Lo que alguien capturó en este teléfono: árboles, jornadas o cualquier cambio con bitácora
  async contarCapturados() {
    const [p, j, b] = await Promise.all(['plantaciones', 'jornadas', 'bitacora'].map(a => this.todos(a)));
    return p.length + j.length + b.length;
  },

  /* Datos de ejemplo al arrancar (sólo con ES_FICTICIO). Devuelve qué hizo, para avisarlo:
     'sembrado' (sin cuentas), 'igual', 'resembrado' (sello nuevo y nada capturado) o
     'conservado' (sello nuevo o perdido, pero hay capturas: no se toca nada, D149). */
  async sembrarSiVacio() {
    const cuentas = await this.todos('usuarios');
    if (!cuentas.length) { await this.sembrar(); return 'sembrado'; }   // agrega cuentas y catálogos; no toca lo demás
    if (this.selloGuardado() === SRP.CONFIG.SELLO_DATOS) return 'igual';
    if (await this.contarCapturados()) { this.anotarSello(); return 'conservado'; }
    await this.restablecer();
    return 'resembrado';
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
  },

  /* ALMACENAMIENTO PROTEGIDO (D149). Sin protección, el navegador puede desalojar lo guardado
     cuando le falta espacio (y Safari, tras 7 días sin abrir un sitio que no está en la pantalla
     de inicio). Se pide la protección al guardar un árbol, que es cuando ya hay algo que perder,
     y se vigila el espacio: al 80 % se avisa una vez por sesión. */
  async cuidarAlmacenamiento() {
    const s = navigator.storage;
    try {
      if (s && s.persist && !(await s.persisted())) await s.persist();
      if (s && s.estimate && !this._avisoEspacio) {
        const e = await s.estimate();
        if (e.quota && e.usage / e.quota >= 0.8) {
          this._avisoEspacio = true;
          SRP.util.anunciar('El espacio del teléfono para el SRP va en ' + Math.round(100 * e.usage / e.quota) + ' %. Guarde un respaldo y libere espacio.', 'aviso');
        }
      }
    } catch (e) { /* el navegador no lo ofrece: queda dicho en la guía */ }
  },

  // Para la guía: si está protegido y cuánto ocupa (null donde el navegador no lo dice)
  async estadoAlmacenamiento() {
    const s = navigator.storage;
    const r = { protegido: null, usado: null, cuota: null };
    try {
      if (s && s.persisted) r.protegido = await s.persisted();
      if (s && s.estimate) { const e = await s.estimate(); r.usado = e.usage; r.cuota = e.quota; }
    } catch (e) { /* sin datos */ }
    return r;
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
