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
  ALMACENES: ['plantaciones', 'usuarios', 'bitacora', 'jornadas', 'programas', 'areas', 'especies', 'vehiculos', 'instituciones', 'solicitantes'],

  /* LOS SEIS CATÁLOGOS, CADA UNO EN SU TABLA. La pantalla los trata como una familia —la sección
     Catálogos, con una pestaña por cada uno— y en memoria cada renglón lleva `tipo` para saber de cuál
     es; en la base ese dato no existe: lo dice la tabla. Son las mismas seis tablas del servidor. */
  TABLA_DE_TIPO: { programa: 'programas', area: 'areas', especie: 'especies', vehiculo: 'vehiculos', organizacion: 'instituciones', solicitante: 'solicitantes' },
  TABLAS_CATALOGO: ['programas', 'areas', 'especies', 'vehiculos', 'instituciones', 'solicitantes'],
  CAMPOS_CATALOGO: {
    comunes: ['id', 'clave', 'nombre', 'activo', 'creado_por_id', 'fecha_creacion', 'editado_por_id', 'fecha_ultima_edicion'],
    programas: ['tipos_organizacion'], areas: [],
    especies: ['nombre_cientifico', 'otros_nombres_comunes', 'tipo_distribucion', 'formadecrecimiento', 'paleta_vegetal', 'fruto_comestible', 'id_snib', 'id_enciclovida'],
    vehiculos: ['modelo', 'tipo_vehiculo'], instituciones: ['tipo_organizacion'], solicitantes: ['tipo_solicitante']
  },
  tipoDeTabla(tabla) { return Object.keys(this.TABLA_DE_TIPO).find(t => this.TABLA_DE_TIPO[t] === tabla); },
  // El renglón tal como se guarda: sin `tipo` y sólo con los campos de su tabla
  filaCatalogo(item) {
    const tabla = this.TABLA_DE_TIPO[item.tipo];
    if (!tabla) throw new Error('Catálogo de tipo desconocido: ' + item.tipo);
    const fila = {};
    this.CAMPOS_CATALOGO.comunes.concat(this.CAMPOS_CATALOGO[tabla]).forEach(k => { if (k in item) fila[k] = item[k]; });
    return { tabla, fila };
  },
  // Dentro de una transacción que ya incluye las tablas de catálogo
  ponerCatalogo(tx, item) { const { tabla, fila } = this.filaCatalogo(item); tx.objectStore(tabla).put(fila); },
  quitarCatalogo(tx, item) { tx.objectStore(this.TABLA_DE_TIPO[item.tipo]).delete(item.id); },
  // Todos los catálogos, cada renglón con su `tipo`
  async catalogos() {
    const listas = await Promise.all(this.TABLAS_CATALOGO.map(t => this.todos(t)));
    return [].concat(...listas.map((filas, i) => { const tipo = this.tipoDeTabla(this.TABLAS_CATALOGO[i]); return filas.map(f => Object.assign({ tipo }, f)); }));
  },
  async catalogo(id) {
    for (const t of this.TABLAS_CATALOGO) { const f = await this.uno(t, id); if (f) return Object.assign({ tipo: this.tipoDeTabla(t) }, f); }
    return undefined;
  },
  guardarCatalogo(item, entradaBitacora) { const { tabla, fila } = this.filaCatalogo(item); return this.guardarConBitacora(tabla, fila, entradaBitacora); },
  borrarCatalogo(item, entradaBitacora) { return this.borrarConBitacora(this.TABLA_DE_TIPO[item.tipo], item.id, entradaBitacora); },
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
    },
    /* VEHÍCULO SÓLO DEL CATÁLOGO (D174). «Otro vehículo» se retiró. Una jornada con placa, modelo o tipo
       escritos a mano (o el `vehiculo` de antes del bloque 20) y sin vehículo del catálogo: si su placa
       está en el catálogo, se enlaza con él y toma sus tres datos; si no, esos datos se quitan. No se
       borra ninguna jornada ni ningún otro dato. */
    4(db, tx) {
      const clave = p => String(p || '').toUpperCase().replace(/[^A-Z0-9]/g, '');   // como SRP.catalogos.clavePlaca
      const pet = tx.objectStore('catalogos').getAll();
      pet.onsuccess = () => {
        const porPlaca = {};
        (pet.result || []).filter(c => c.tipo === 'vehiculo').forEach(c => { porPlaca[clave(c.nombre)] = c; });
        tx.objectStore('jornadas').openCursor().onsuccess = (e) => {
          const cur = e.target.result; if (!cur) return;
          const j = cur.value;
          if (!j.vehiculo_id && (j.vehiculo_placa || j.vehiculo_modelo || j.vehiculo_tipo || j.vehiculo)) {
            const v = porPlaca[clave(j.vehiculo_placa)];
            Object.assign(j, v ? { vehiculo_id: v.id, vehiculo_placa: v.nombre, vehiculo_modelo: v.modelo || '', vehiculo_tipo: v.tipo_vehiculo || '' }
              : { vehiculo_placa: '', vehiculo_modelo: '', vehiculo_tipo: '' });
            delete j.vehiculo;
            cur.update(j);
          }
          cur.continue();
        };
      };
    },
    /* CAMPOS DEPURADOS. Se quitan los datos que repetían otro: género, epíteto y nota de discrepancia
       de las especies (salen del nombre científico y del catálogo del SIA), y quién creó la jornada y
       cuándo (son el cabo y la hora de inicio). Los árboles previstos de la jornada se guardan como
       `arboles_previstos`; las cuentas registran su alta como `fecha_creacion` y `creado_por_id`, igual
       que los catálogos; una jornada que nunca se editó queda sin datos de edición, su vehículo sin
       nulos y su punto con seis decimales. No se borra ningún registro. */
    5(db, tx) {
      const recorrer = (almacen, cambiar) => {
        tx.objectStore(almacen).openCursor().onsuccess = (e) => {
          const cur = e.target.result; if (!cur) return;
          const o = cur.value;
          if (cambiar(o)) cur.update(o);
          cur.continue();
        };
      };
      recorrer('catalogos', (c) => {
        if (!('genero' in c || 'especie' in c || 'nota_discrepancia' in c)) return false;
        delete c.genero; delete c.especie; delete c.nota_discrepancia;
        return true;
      });
      recorrer('jornadas', (j) => {
        const previstos = Number.isInteger(j.arboles_previstos) ? j.arboles_previstos
          : Number.isInteger(j.meta_arboles) ? j.meta_arboles
          : Number.isInteger(j.arboles_plantados) ? j.arboles_plantados : null;
        const sinEditar = !!j.fecha_ultima_edicion && j.fecha_ultima_edicion === (j.fecha_creacion || j.fecha_inicio);
        j.arboles_previstos = previstos;
        delete j.meta_arboles; delete j.arboles_plantados; delete j.creado_por_id; delete j.fecha_creacion;
        if (sinEditar) { j.editado_por_id = null; j.fecha_ultima_edicion = null; }
        ['vehiculo_placa', 'vehiculo_modelo', 'vehiculo_tipo'].forEach(k => { if (j[k] == null) j[k] = ''; });
        ['lat', 'lng'].forEach(k => { if (typeof j[k] === 'number') j[k] = Number(j[k].toFixed(6)); });
        return true;
      });
      recorrer('usuarios', (u) => {
        if (!('fecha_alta' in u || 'alta_por_id' in u)) return false;
        if (!('fecha_creacion' in u)) u.fecha_creacion = u.fecha_alta || null;
        if (!('creado_por_id' in u)) u.creado_por_id = u.alta_por_id || null;
        delete u.fecha_alta; delete u.alta_por_id;
        return true;
      });
    },
    /* SIN MARCA DE PRUEBA NI CAMPOS SIN USO. La marca de dato de prueba sale de las cinco tablas: la
       versión de prueba y la real ya usan bases distintas. De los árboles salen el punto del primer
       guardado (la bitácora dice ahora el punto anterior cuando se mueve), los datos que congela el
       servidor al asignar el folio, el nombre y el peso de la foto (el peso se calcula de la propia
       foto) y el estatus de la especie (lo dice «Otra especie»). No se borra ningún registro. */
    6(db, tx) {
      const fuera = { plantaciones: ['es_ficticio', 'lat_original', 'lng_original', 'folio_uga', 'folio_capa_version', 'folio_lat', 'folio_lng',
                                     'foto_nombre', 'foto_bytes', 'especie_estatus'],
                      jornadas: ['es_ficticio'], usuarios: ['es_ficticio'], catalogos: ['es_ficticio'], bitacora: ['es_ficticio'] };
      Object.entries(fuera).forEach(([almacen, campos]) => {
        tx.objectStore(almacen).openCursor().onsuccess = (e) => {
          const cur = e.target.result; if (!cur) return;
          const o = cur.value;
          if (campos.some(k => k in o)) { campos.forEach(k => { delete o[k]; }); cur.update(o); }
          cur.continue();
        };
      });
    },
    /* 7. La capa de colonias del IECM pasa de prueba a definitiva con la misma geometría: en lo ya
       derivado sólo cambia el nombre de su versión. */
    7(db, tx) {
      tx.objectStore('plantaciones').openCursor().onsuccess = (e) => {
        const cur = e.target.result; if (!cur) return;
        const o = cur.value;
        if (typeof o.capa_version === 'string' && o.capa_version.includes('colonias=iecm-2022-prueba')) {
          o.capa_version = o.capa_version.replace('colonias=iecm-2022-prueba', 'colonias=iecm-2022'); cur.update(o);
        }
        cur.continue();
      };
    },
    /* 8. CADA CATÁLOGO EN SU TABLA. La tabla única `catalogos`, con `tipo`, se reparte en seis:
       programas, áreas, especies, vehículos, instituciones y solicitantes, cada una sólo con sus
       campos. Cada renglón pasa a la suya antes de retirar la tabla anterior; no se pierde ninguno. */
    8(db, tx) {
      const A = SRP.almacen;
      A.TABLAS_CATALOGO.forEach(t => { if (!db.objectStoreNames.contains(t)) db.createObjectStore(t, { keyPath: 'id' }); });
      if (!db.objectStoreNames.contains('catalogos')) return;
      const pet = tx.objectStore('catalogos').getAll();
      pet.onsuccess = () => {
        (pet.result || []).forEach(c => { if (A.TABLA_DE_TIPO[c.tipo]) A.ponerCatalogo(tx, c); });
        db.deleteObjectStore('catalogos');
      };
    },
    /* 9. LA SOLICITUD ES UN PROGRAMA. Se retira el origen de la jornada: la que venía de otra instancia
       pasa al programa «Solicitud», y sus árboles con ella; conserva quién lo solicitó y la descripción,
       que cambia de nombre. No se borra ningún registro. */
    9(db, tx) {
      const A = SRP.almacen, P = SRP.CONFIG.PROGRAMA_SOLICITUD, solicitudes = new Set();
      tx.objectStore('jornadas').openCursor().onsuccess = (e) => {
        const cur = e.target.result;
        if (!cur) {
          if (!solicitudes.size) return;
          const fila = ((SRP.DATOS_FICTICIOS || {}).catalogos || []).find(c => c.id === P);
          const programas = tx.objectStore('programas');
          programas.get(P).onsuccess = (g) => { if (!g.target.result && fila) A.ponerCatalogo(tx, fila); };
          tx.objectStore('plantaciones').openCursor().onsuccess = (ev) => {
            const c = ev.target.result; if (!c) return;
            if (solicitudes.has(c.value.jornada_id) && c.value.programa_id !== P) c.update(Object.assign(c.value, { programa_id: P }));
            c.continue();
          };
          return;
        }
        const j = cur.value;
        if ('origen' in j || 'pedido_descripcion' in j || !('solicitud_descripcion' in j)) {
          const era = j.origen === 'PEDIDO';
          if (era) { j.programa_id = P; solicitudes.add(j.id); }
          j.solicitud_descripcion = era ? (j.pedido_descripcion || '') : '';
          if (!era) { j.solicitante_id = null; j.solicitante_otro = ''; }
          delete j.origen; delete j.pedido_descripcion;
          cur.update(j);
        }
        cur.continue();
      };
    }
  },

  /* Abre la base y deja al día cuentas, jornadas, instituciones y programas (ver normalizar). */
  abrir() { return this.abrirBase().then(() => this.normalizar()); },

  /* CUENTAS, JORNADAS, INSTITUCIONES Y PROGRAMAS AL DÍA. Corre al abrir, ya con la base al día; sólo escribe lo
     que falte o sobre, así que repetirla no cambia nada. No borra ningún registro.
     - Cuenta o jornada sin institución: antes de las instituciones todo era de la Secretaría.
     - Jornada cuyo solicitante es una institución: quien solicita una jornada sale del
       catálogo de solicitantes. Pasa al solicitante que corresponde a esa institución (una
       alcaldía, SOBSE) o, si no lo hay, queda escrito con su nombre como «Otra instancia».
     - Nombre de la cuenta en tres campos: se une en `nombre_completo`.
     - Cuenta con un solo coordinador (`coordinador_id`): pasa a la lista `coordinadores_ids`, con ese
       coordinador o vacía.
     - Institución con un tipo que ya no existe, contrato o vigencia, o alcaldía con la palabra
       «Alcaldía» en el nombre: se ajusta a los cuatro tipos fijos y se quita lo que ya no se usa.
     - Programa sin `tipos_organizacion`: el de arranque toma los suyos; el que agregó la
       Administración queda sólo para la Secretaría, como estaba.
     No es una migración numerada porque la estructura no cambia, y porque una migración recorre sus
     renglones a la par de las anteriores en la misma actualización y podía pisar lo que éstas
     acababan de cambiar. */
  TIPOS_ANTERIORES: { 'Dependencia de gobierno': 'Gobierno de la CDMX', 'Organismo público': 'Gobierno de la CDMX' },
  async normalizar() {
    const [cuentas, jornadas, catalogos] = await Promise.all([this.todos('usuarios'), this.todos('jornadas'), this.catalogos()]);
    const sedema = SRP.CONFIG.ORGANIZACION_SEDEMA;
    const cambios = [];
    cuentas.forEach(u => {
      const tres = ['nombre', 'apellido_paterno', 'apellido_materno'].some(k => k in u);
      const unCoordinador = 'coordinador_id' in u || !Array.isArray(u.coordinadores_ids);
      if (u.organizacion_id && u.nombre_completo && !tres && !unCoordinador) return;
      const n = Object.assign({}, u, { organizacion_id: u.organizacion_id || sedema });
      if (unCoordinador) {
        n.coordinadores_ids = Array.isArray(u.coordinadores_ids) ? u.coordinadores_ids : (u.coordinador_id ? [u.coordinador_id] : []);
        delete n.coordinador_id;
      }
      if (!n.nombre_completo) n.nombre_completo = [u.nombre, u.apellido_paterno, u.apellido_materno].filter(Boolean).join(' ');
      delete n.nombre; delete n.apellido_paterno; delete n.apellido_materno;
      cambios.push(['usuarios', n]);
    });
    const porId = Object.fromEntries(catalogos.map(c => [c.id, c]));
    const deArranque = new Set(SRP.DATOS_FICTICIOS.catalogos.filter(c => c.tipo === 'solicitante').map(c => c.id));
    jornadas.forEach(j => {
      const n = Object.assign({}, j);
      if (!j.organizacion_id) n.organizacion_id = sedema;
      const o = j.solicitante_id ? porId[j.solicitante_id] : null;
      if (o && o.tipo === 'organizacion') {
        const s = 's-' + String(o.id).replace(/^o-/, '');
        const hay = porId[s] ? porId[s].tipo === 'solicitante' : deArranque.has(s);
        n.solicitante_id = hay ? s : null;
        n.solicitante_otro = hay ? '' : (o.tipo_organizacion === 'Alcaldía' ? 'Alcaldía ' : '') + o.nombre.replace(/^Alcald[ií]a\s+/i, '');
      }
      if (n.organizacion_id !== j.organizacion_id || n.solicitante_id !== j.solicitante_id) cambios.push(['jornadas', n]);
    });
    catalogos.filter(c => c.tipo === 'organizacion').forEach(c => {
      const tipo = this.TIPOS_ANTERIORES[c.tipo_organizacion] || c.tipo_organizacion;
      const nombre = tipo === 'Alcaldía' ? c.nombre.replace(/^Alcald[ií]a\s+/i, '') : c.nombre;
      if (tipo === c.tipo_organizacion && nombre === c.nombre && !('instrumento' in c) && !('vigente_hasta' in c)) return;
      const n = Object.assign({}, c, { tipo_organizacion: tipo, nombre });
      delete n.instrumento; delete n.vigente_hasta;
      cambios.push(['catalogos', n]);
    });
    const arranque = {}; SRP.DATOS_FICTICIOS.catalogos.filter(c => c.tipo === 'programa').forEach(c => { arranque[c.id] = c.tipos_organizacion; });
    catalogos.filter(c => c.tipo === 'programa' && !Array.isArray(c.tipos_organizacion))
      .forEach(c => cambios.push(['catalogos', Object.assign({}, c, { tipos_organizacion: (arranque[c.id] || []).slice() })]));
    if (!cambios.length) return;
    await this._tx(['usuarios', 'jornadas'].concat(this.TABLAS_CATALOGO), 'readwrite', (tx) => cambios.forEach(([almacen, o]) => { if (almacen === 'catalogos') this.ponerCatalogo(tx, o); else tx.objectStore(almacen).put(o); }));
  },

  /* La versión en que está la base de este dispositivo, sin cambiarla; 0 si todavía no existe (se
     cancela la creación para no dejar una base vacía). */
  versionActual() {
    return new Promise((resolver) => {
      const pet = indexedDB.open(SRP.CONFIG.DB_NOMBRE);
      let nueva = false;
      pet.onupgradeneeded = () => { nueva = true; pet.transaction.abort(); };
      pet.onsuccess = () => { const v = pet.result.version; pet.result.close(); resolver(nueva ? 0 : v); };
      pet.onerror = (e) => { e.preventDefault(); resolver(0); };
    });
  },

  // Lleva la base a una versión intermedia y la cierra
  subirA(version) {
    return new Promise((resolver, rechazar) => {
      const pet = indexedDB.open(SRP.CONFIG.DB_NOMBRE, version);
      pet.onupgradeneeded = (ev) => { for (let v = ev.oldVersion + 1; v <= version; v++) this.MIGRACIONES[v](pet.result, pet.transaction); };
      pet.onsuccess = () => { pet.result.close(); resolver(); };
      pet.onerror = () => rechazar(pet.error);
      pet.onblocked = () => rechazar(new Error('Hay otra pestaña con el sistema abierto. Ciérrela y vuelva a cargar esta página.'));
    });
  },

  /* La migración 8 retira una tabla que las anteriores recorren. En una misma actualización las
     migraciones corren a la par, y retirar la tabla a media lectura de otra la interrumpe: una base
     anterior a la 7 sube primero a la 7, sola, y después a la versión vigente. */
  VERSION_ANTES_DE_REPARTIR: 7,
  async abrirBase() {
    const actual = await this.versionActual();
    if (actual > 0 && actual < this.VERSION_ANTES_DE_REPARTIR) await this.subirA(this.VERSION_ANTES_DE_REPARTIR);
    return this.abrirVigente();
  },

  abrirVigente() {
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
    // Una base de antes de separar los catálogos los traía en una sola tabla: cada uno va a la suya
    const unicos = (copia.catalogos || []).filter(c => this.TABLA_DE_TIPO[c.tipo]);
    if (unicos.length) await this._tx(this.TABLAS_CATALOGO, 'readwrite', (tx) => unicos.forEach(c => this.ponerCatalogo(tx, c)));
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
    // Un sello anterior al de reinicio: todo es de prueba y se vuelve a empezar, aunque haya capturas
    const guardado = this.selloGuardado();
    if (guardado && SRP.CONFIG.SELLO_REINICIO && guardado < SRP.CONFIG.SELLO_REINICIO) { await this.reiniciar(); return 'reiniciado'; }
    if (await this.contarCapturados()) { await this.completarCatalogos(); this.anotarSello(); return 'conservado'; }
    await this.restablecer();
    return 'resembrado';
  },

  /* Un catálogo nuevo de una versión (los vehículos, D162) llega también al teléfono que ya tiene
     capturas: se agrega lo que falte, por id, sin tocar lo que ya está ni lo que se editó. Corre una
     sola vez por sello; lo que la administración quite después no vuelve. */
  async completarCatalogos() {
    const todos = await this.catalogos();
    const hay = new Set(todos.map(c => c.id));
    const faltan = SRP.DATOS_FICTICIOS.catalogos.filter(c => !hay.has(c.id));
    /* Los vehículos y los programas de arranque que ya no vienen en el catálogo se retiran: sin uso se
       quitan; con uso se desactivan, y lo capturado conserva su referencia (la jornada, además, su
       copia de placa, modelo y tipo). Los vehículos que dio de alta la administración (con
       creado_por_id) y los programas que editó no se tocan. */
    const vigentes = new Set(SRP.DATOS_FICTICIOS.catalogos.map(c => c.id));
    const jornadas = await this.todos('jornadas');
    const usados = new Set(jornadas.map(j => j.vehiculo_id).concat(jornadas.map(j => j.programa_id),
      (await this.todos('plantaciones')).map(p => p.programa_id)).filter(Boolean));
    const programasRetirados = SRP.DATOS_FICTICIOS.programasRetirados || [];
    const viejos = todos.filter(c => !vigentes.has(c.id) && ((c.tipo === 'vehiculo' && !c.creado_por_id) ||
      (c.tipo === 'programa' && programasRetirados.includes(c.id) && !c.fecha_ultima_edicion)));
    /* Las áreas de arranque que se retiraron pasan sus cuentas a la que las sustituye y se quitan;
       las áreas y los programas de arranque que nadie editó toman su nombre y clave nuevos
       («Coordinación del SIA» → «Sistema de Información Ambiental», «Palmeras y compensaciones» →
       «Palmeras»). Lo que dio de alta o editó la administración no se toca. */
    const retiradas = SRP.DATOS_FICTICIOS.areasRetiradas || {};
    const cuentas = (await this.todos('usuarios')).filter(u => retiradas[u.area_id]);
    const renombrar = todos.filter(c => (c.tipo === 'area' || c.tipo === 'programa') && !c.fecha_ultima_edicion && vigentes.has(c.id))
      .map(c => [c, SRP.DATOS_FICTICIOS.catalogos.find(x => x.id === c.id)]).filter(([c, n]) => n && (n.nombre !== c.nombre || n.clave !== c.clave));
    const quitar = todos.filter(c => c.tipo === 'area' && retiradas[c.id]);
    /* Las especies que aún no dicen si son de la paleta vegetal o si su fruto es comestible toman lo
       que dice el catálogo; las que dio de alta la administración, que no están en él, quedan «Por
       determinar» en el fruto. La paleta de éstas no se supone: la declara la administración al editarlas. */
    const marcas = todos.filter(c => c.tipo === 'especie' && (!c.paleta_vegetal || !c.fruto_comestible)).map(c => {
      const n = SRP.DATOS_FICTICIOS.catalogos.find(x => x.id === c.id) || {};
      return Object.assign({}, c, { paleta_vegetal: c.paleta_vegetal || n.paleta_vegetal || '', fruto_comestible: c.fruto_comestible || n.fruto_comestible || 'Por determinar' });
    });
    /* Alcaldías y solicitantes que de arranque vienen inactivos: los que nadie activó ni editó toman ese
       estado. Una alcaldía con cuentas se queda activa: desactivarla les cortaría el acceso. */
    const conCuentas = new Set((await this.todos('usuarios')).map(u => u.organizacion_id));
    const apagar = todos.filter(c => c.activo && !c.fecha_ultima_edicion && !conCuentas.has(c.id) && (c.tipo === 'organizacion' || c.tipo === 'solicitante') &&
      (SRP.DATOS_FICTICIOS.catalogos.find(x => x.id === c.id) || {}).activo === false);
    if (faltan.length || viejos.length || cuentas.length || renombrar.length || quitar.length || marcas.length || apagar.length) await this._tx(this.TABLAS_CATALOGO.concat('usuarios'), 'readwrite', (tx) => {
      apagar.forEach(c => this.ponerCatalogo(tx, Object.assign({}, c, { activo: false })));
      faltan.forEach(c => this.ponerCatalogo(tx, c));
      viejos.forEach(c => { if (!usados.has(c.id)) this.quitarCatalogo(tx, c); else if (c.activo) this.ponerCatalogo(tx, Object.assign({}, c, { activo: false })); });
      renombrar.forEach(([c, n]) => this.ponerCatalogo(tx, Object.assign({}, c, { nombre: n.nombre, clave: n.clave })));
      quitar.forEach(c => this.quitarCatalogo(tx, c));
      marcas.forEach(c => this.ponerCatalogo(tx, c));
      cuentas.forEach(u => tx.objectStore('usuarios').put(Object.assign({}, u, { area_id: retiradas[u.area_id] })));
    });
    return faltan.length;
  },

  async sembrar() {
    const d = SRP.DATOS_FICTICIOS;
    await this._tx(['usuarios', 'plantaciones'].concat(this.TABLAS_CATALOGO), 'readwrite', (tx) => {
      d.usuarios.forEach(u => tx.objectStore('usuarios').put(u));
      d.catalogos.forEach(c => this.ponerCatalogo(tx, c));
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

  /* Vuelve a empezar con los datos de prueba: se borra lo capturado y los datos de demostración, y se
     siembran las cuentas y catálogos de arranque. Dice cuánto había, para avisarlo. Los folios
     simulados no retroceden: su secuencia se conserva (R5). */
  async reiniciar() {
    const [p, j] = await Promise.all(['plantaciones', 'jornadas'].map(a => this.todos(a)));
    this.reiniciados = { arboles: p.length, jornadas: j.length };
    await this.restablecer();
    try { [SRP.CONFIG.CLAVE_ENVIOS_PRUEBA, 'srp_demo_quitados'].forEach(k => localStorage.removeItem(k)); } catch (e) { /* sin persistencia */ }
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
          SRP.util.anunciar('El espacio del teléfono para el SRP va en ' + Math.round(100 * e.usage / e.quota) + ' %. Libere espacio en el teléfono (fotos, videos o aplicaciones) sin borrar los datos del navegador.', 'aviso');
        }
      }
    } catch (e) { /* el navegador no lo ofrece */ }
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
      entidad,                // plantacion | jornada | catalogo | usuario | carga
      entidad_id,
      detalle: detalle || ''  // p. ej. campos cambiados
    };
  },

  async deEntidad(id) {
    const lista = await SRP.almacen.porIndice('bitacora', 'entidad_id', id);
    return lista.sort((a, b) => a.fecha.localeCompare(b.fecha));
  }
};
