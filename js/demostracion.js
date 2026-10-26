/* DATOS DE DEMOSTRACIÓN. Sólo con datos de prueba (ES_FICTICIO). Para probar Supervisión,
   Mi avance, los informes y las listas con volumen de verdad, la ventana «Datos de prueba» carga casi
   tres años de trabajo inventado —desde enero de 2024 hasta hoy— y los quita sin tocar lo que se haya
   capturado a mano. Volver a cargarlos da las mismas cuentas, jornadas y árboles: el generador usa
   una semilla fija. Los folios no se repiten: siguen la secuencia simulada, que nunca retrocede
   (R5), así que al recuperar los datos los árboles reciben folios nuevos.

   QUÉ SE CARGA. Tres pasadas por el calendario, cada una con su semilla, así que agregar una no
   cambia lo que dan las anteriores:
   1. La Secretaría: una segunda coordinación con tres cabos, tres cabos más para la coordinación de
      prueba y jornadas también para la cabo de prueba. Los cuatro programas.
   2. La Alcaldía Iztapalapa (dos cabos con el coordinador de prueba de la alcaldía, desde febrero de
      2025) y una empresa de demostración (un cabo sin coordinación, desde marzo de 2026).
   3. Una institución de cada tipo con coordinador y cabo de prueba, cada una con sus cabos de
      demostración: PAOT, Green Cover y Reforestamos México; además SOBSE y la Alcaldía Coyoacán, con
      un cabo sin coordinación. Capturan también los cabos de prueba de fuera y los coordinadores
      (menos seguido que un cabo), así que cada una de las once cuentas de prueba que registra tiene
      datos. Cada institución con sus programas: Reforestación Urbana, o Palmeras las empresas.
   4. Eventos masivos y relevos. Cada coordinación abre jornadas compartidas con 2 a 5 cabos de su
      institución, que registran a la vez (cada árbol, a nombre de quien lo capturó); casi todos
      terminan su parte, a alguno lo quitan a media jornada y alguno olvida terminarla. En otras
      jornadas, la coordinación pasa la jornada de un cabo a otro (relevo) y a veces se la devuelve.
      Hoy quedan abiertas una compartida (coordina Estela Ramírez; registran Rocío Hernández y
      Yolanda Cruz) y una con relevo (la empezó Julián Ortega y sigue Marisol Pérez).
   Las cuentas no guardan coordinadores: desde la 1.4 la coordinación trabaja con toda su institución.
   Fuera de la Secretaría no hay personal, chófer ni vehículo. Cada cabo trabaja en sus alcaldías, más en la
   temporada de lluvias que en secas y un poco más cada año. Cada jornada tiene su sitio dentro de
   una colonia real de la capa, de 5 a 22 árboles alrededor, meta, cierre y, casi siempre, reporte.
   El territorio de cada árbol se deriva con las capas, como al registrar; los folios salen de la
   misma secuencia simulada y lo anterior a hoy ya está «enviado». Hay de todo lo que la
   supervisión debe encontrar: jornadas abiertas de días anteriores, puntos sin revisar, jornadas
   sin reporte, árboles eliminados y editados, precisión baja, algunas fotografías.

   CÓMO SE RECONOCEN. Todo lo cargado lleva identificador con prefijo «demo-» (las cuentas,
   «u-demo-»): así se quita sin tocar lo demás y sin agregar un campo al esquema. Si alguien
   capturó algo propio dentro de lo de demostración —un árbol en una jornada de demostración, o
   entró con una cuenta de demostración y registró—, esa jornada y esa cuenta se conservan, con las
   cuentas que registran en ella (su titular, sus relevos y sus cabos de apoyo). */
window.SRP = window.SRP || {};

SRP.demo = {
  cargando: false,
  DESDE: '2024-01-08',
  ALMACENES: ['usuarios', 'jornadas', 'plantaciones', 'bitacora', 'instituciones'],   // de los catálogos, sólo trae una institución

  el(id) { return document.getElementById(id); },
  es(id) { return /^(demo-|u-demo-)/.test(String(id || '')); },

  // Las solicitudes de la demostración: de SOBSE, de una alcaldía y de una instancia fuera del catálogo
  SOLICITUDES: [
    { solicitante_id: 's-sobse', solicitante_otro: '', solicitud_descripcion: 'Compensación por obra vial.' },
    { solicitante_id: 's-alc-09007', solicitante_otro: '', solicitud_descripcion: 'Arbolado para el parque de la colonia.\nPetición vecinal turnada por la alcaldía.' },
    { solicitante_id: 's-sobse', solicitante_otro: '', solicitud_descripcion: 'Camellón rehabilitado.' },
    { solicitante_id: null, solicitante_otro: 'Sistema de Transporte Colectivo Metro', solicitud_descripcion: 'Entorno de estación.' }],

  // La empresa de demostración: sólo existe mientras estén cargados los datos
  EMPRESA: { id: 'demo-org-empresa', tipo: 'organizacion', clave: 'DEMO_EMPRESA', nombre: 'Viveros y Paisaje Ejemplo, S.A. de C.V.', activo: true,
    tipo_organizacion: 'Empresa privada',
    creado_por_id: 'u-admin-1', fecha_creacion: '2026-03-02T09:00:00-06:00', editado_por_id: null, fecha_ultima_edicion: null },

  /* Las cuentas: una coordinación más y seis cabos de la Secretaría; de fuera, dos cabos de la
     Alcaldía Iztapalapa, que trabajan con el coordinador de arranque de esa alcaldía, y uno de la
     empresa de demostración, sin coordinación. Nombres inventados, apellido «Demo». La quinta columna
     es la institución (SEDEMA si falta). */
  CUENTAS: [
    ['u-demo-k1', 'Estela', 'Ramírez', 'COORDINADOR'],
    ['u-demo-c1', 'Marisol', 'Pérez', 'CABO'],
    ['u-demo-c2', 'Julián', 'Ortega', 'CABO'],
    ['u-demo-c3', 'Rocío', 'Hernández', 'CABO'],
    ['u-demo-c4', 'Tomás', 'Díaz', 'CABO'],
    ['u-demo-c5', 'Yolanda', 'Cruz', 'CABO'],
    ['u-demo-c6', 'Arturo', 'Méndez', 'CABO'],
    ['u-demo-z2', 'Ernesto', 'Luna', 'CABO', 'o-alc-09007'],
    ['u-demo-z3', 'Paula', 'Sánchez', 'CABO', 'o-alc-09007'],
    ['u-demo-e2', 'Nadia', 'Flores', 'CABO', 'demo-org-empresa'],
    ['u-demo-g1', 'Gerardo', 'Paredes', 'CABO', 'o-paot'],
    ['u-demo-s1', 'Silvia', 'Rangel', 'CABO', 'o-sobse'],
    ['u-demo-v1', 'Valeria', 'Castro', 'CABO', 'o-green-cover'],
    ['u-demo-o1', 'Omar', 'Fuentes', 'CABO', 'o-reforestamos'],
    ['u-demo-o2', 'Olivia', 'Reyes', 'CABO', 'o-reforestamos'],
    ['u-demo-z4', 'Zacarías', 'Molina', 'CABO', 'o-alc-09003']
  ],
  // Dónde trabaja cada cabo, desde cuándo y hasta cuándo (Arturo dejó de trabajar en febrero)
  CUADRILLAS: [
    ['u-cabo-1', ['Cuauhtémoc', 'Benito Juárez'], '2024-01-08', null],
    ['u-demo-c1', ['Gustavo A. Madero', 'Azcapotzalco'], '2024-01-08', null],
    ['u-demo-c2', ['Miguel Hidalgo', 'Cuauhtémoc'], '2024-01-08', null],
    ['u-demo-c3', ['Venustiano Carranza', 'Iztacalco'], '2025-03-03', null],
    ['u-demo-c4', ['Coyoacán', 'Tlalpan'], '2024-01-08', null],
    ['u-demo-c5', ['Iztapalapa', 'Tláhuac'], '2024-01-08', null],
    ['u-demo-c6', ['Álvaro Obregón', 'Xochimilco'], '2024-01-08', '2026-02-15']
  ],
  // Las de fuera de la Secretaría, con su programa: la alcaldía reforesta; la empresa, palmeras
  CUADRILLAS_EXTERNAS: [
    ['u-demo-z2', ['Iztapalapa'], '2025-02-03', null, 'p-refor'],
    ['u-demo-z3', ['Iztapalapa'], '2025-02-03', null, 'p-refor'],
    ['u-demo-e2', ['Miguel Hidalgo', 'Álvaro Obregón'], '2026-03-02', null, 'p-palmeras']
  ],
  /* La tercera pasada: una institución de cada tipo con sus cuentas de prueba y sus cabos de
     demostración, y los coordinadores, que capturan menos. La sexta columna es cuánto captura
     respecto de un cabo; el programa fijo, el de la institución (sin él, los de la Secretaría). */
  CUADRILLAS_INSTITUCIONES: [
    ['u-cabo-alc', ['Iztapalapa'], '2025-02-03', null, 'p-refor', 1],
    ['u-coord-alc', ['Iztapalapa'], '2025-02-03', null, 'p-refor', 0.35],
    ['u-demo-z4', ['Coyoacán'], '2025-08-04', null, 'p-refor', 1],
    ['u-cabo-gob', ['Tlalpan', 'Coyoacán'], '2025-06-02', null, 'p-refor', 1],
    ['u-demo-g1', ['Tlalpan', 'La Magdalena Contreras'], '2025-06-02', null, 'p-refor', 1],
    ['u-coord-gob', ['Tlalpan'], '2025-06-02', null, 'p-refor', 0.35],
    ['u-demo-s1', ['Gustavo A. Madero', 'Venustiano Carranza'], '2025-10-06', null, 'p-refor', 1],
    ['u-cabo-emp', ['Cuajimalpa de Morelos', 'Miguel Hidalgo'], '2025-11-03', null, 'p-palmeras', 1],
    ['u-demo-v1', ['Cuajimalpa de Morelos', 'Álvaro Obregón'], '2025-11-03', null, 'p-palmeras', 1],
    ['u-coord-emp', ['Miguel Hidalgo'], '2025-11-03', null, 'p-palmeras', 0.35],
    ['u-cabo-osc', ['Xochimilco', 'Tláhuac'], '2025-04-07', null, 'p-refor', 1],
    ['u-demo-o1', ['Xochimilco'], '2025-04-07', null, 'p-refor', 1],
    ['u-demo-o2', ['Milpa Alta', 'Tlalpan'], '2025-04-07', null, 'p-refor', 1],
    ['u-coord-osc', ['Xochimilco'], '2025-04-07', null, 'p-refor', 0.35],
    ['u-coord-1', ['Cuauhtémoc', 'Benito Juárez', 'Iztapalapa'], '2024-01-08', null, null, 0.35],
    ['u-demo-k1', ['Coyoacán', 'Tlalpan', 'Álvaro Obregón'], '2024-01-08', null, null, 0.35]
  ],
  // Especies y su peso: lo que más se planta en la ciudad, casi todo nativo (catálogo real)
  ESPECIES: [['ESP-0029', 12], ['ESP-0041', 9], ['ESP-0036', 7], ['ESP-0004', 7], ['ESP-0070', 6], ['ESP-0002', 6], ['ESP-0027', 6], ['ESP-0062', 6],
    ['ESP-0024', 5], ['ESP-0057', 5], ['ESP-0018', 4], ['ESP-0032', 4], ['ESP-0010', 3], ['ESP-0049', 3], ['ESP-0074', 3], ['ESP-0047', 3],
    ['ESP-0038', 2], ['ESP-0043', 2], ['ESP-0051', 2], ['ESP-0067', 2], ['ESP-0073', 2], ['ESP-0033', 1]],
  SITIOS: ['Parque vecinal', 'Camellón', 'Jardín', 'Deportivo', 'Escuela primaria', 'Andador', 'Plaza cívica', 'Unidad habitacional', 'Centro de salud', 'Glorieta', 'Mercado', 'Biblioteca'],
  PERSONAL: ['Ana Ejemplo', 'Beto Ejemplo', 'Carla Ejemplo', 'Dante Ejemplo', 'Elena Ejemplo', 'Fermín Ejemplo', 'Gloria Ejemplo', 'Hugo Ejemplo', 'Irma Ejemplo', 'Joel Ejemplo', 'Karla Ejemplo', 'Lalo Ejemplo'],
  OBSERVACIONES: ['Cepas con cascajo: se agregó tierra y composta.', 'Se regó al terminar.', 'Participaron vecinos del comité.', 'Dos cepas quedaron sin plantar por instalación de agua.', 'Se colocaron tutores.'],

  // Números al azar con semilla fija: los mismos datos cada vez (mulberry32)
  azar(semilla) {
    let a = semilla >>> 0;
    return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  },

  /* ---------- Cuánto hay ---------- */

  // Una jornada de demostración que se conservó por un árbol propio (ver quitar) ya no cuenta
  async contar() {
    const [j, p, u] = await Promise.all(['jornadas', 'plantaciones', 'usuarios'].map(a => SRP.almacen.todos(a)));
    const demo = p.filter(x => this.es(x.id)), conArboles = new Set(demo.map(x => x.jornada_id));
    return { jornadas: j.filter(x => this.es(x.id) && conArboles.has(x.id)).length, arboles: demo.filter(x => x.estatus === 'activo').length,
      cuentas: u.filter(x => this.es(x.id)).length };
  },

  /* ---------- Generar ---------- */

  // Las colonias de cada alcaldía, para poner cada sitio dentro de una colonia real
  coloniasPorAlcaldia() {
    if (this._colonias) return this._colonias;
    const salida = {};
    SRP.CAPAS.colonias.geojson.features.forEach(f => {
      const [x, y] = this.puntoDe(f);
      const d = SRP.derivacion.derivar(y, x);
      if (d.alcaldia) (salida[d.alcaldia] = salida[d.alcaldia] || []).push(f);
    });
    this._colonias = salida;
    return salida;
  },
  // Un vértice interior aproximado: el promedio del primer anillo
  puntoDe(f) {
    const anillo = f.geometry.type === 'MultiPolygon' ? f.geometry.coordinates[0][0] : f.geometry.coordinates[0];
    const n = anillo.length;
    return [anillo.reduce((s, p) => s + p[0], 0) / n, anillo.reduce((s, p) => s + p[1], 0) / n];
  },
  // Un punto al azar dentro de la colonia (rechazo dentro de su caja)
  puntoEn(f, r) {
    let o = Infinity, s = Infinity, e = -Infinity, n = -Infinity;
    const polis = f.geometry.type === 'MultiPolygon' ? f.geometry.coordinates : [f.geometry.coordinates];
    polis.forEach(pg => pg[0].forEach(([x, y]) => { if (x < o) o = x; if (x > e) e = x; if (y < s) s = y; if (y > n) n = y; }));
    for (let i = 0; i < 30; i++) {
      const x = o + r() * (e - o), y = s + r() * (n - s);
      if (window.turfPIP({ type: 'Feature', geometry: { type: 'Point', coordinates: [x, y] } }, f)) return [y, x];
    }
    const [x, y] = this.puntoDe(f); return [y, x];
  },

  /* Todo en memoria, sin tocar la base: cuentas, jornadas, árboles, bitácora, folios y envíos.
     `avance(fraccion)` se llama de vez en cuando, para que la pantalla diga cuánto va. */
  async generar(avance) {
    // Semilla de la Secretaría; las cuadrillas de fuera usan la suya (ver QUÉ SE CARGA)
    const principal = this.azar(20260925);
    let r = principal;
    const I = SRP.indicadores, U = SRP.util;
    const hoy = U.fechaHoy();
    const pick = lista => lista[Math.floor(r() * lista.length)];
    const pesos = this.ESPECIES.reduce((s, e) => s + e[1], 0);
    const especie = () => { let x = r() * pesos; for (const [id, w] of this.ESPECIES) { x -= w; if (x < 0) return id; } return 'ESP-0029'; };
    const hora = (fecha, h, m) => new Date(fecha + 'T' + String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0') + ':00-06:00').toISOString();
    // «SANTA MARIA NATIVITAS (PBLO)» → «Santa Maria Nativitas»: como lo escribiría quien abre la jornada
    const titulo = t => t.replace(/\s*\([^)]*\)/g, '').trim().toLowerCase().replace(/(^|[\s.-])(\p{L})/gu, (a, b, c) => b + c.toUpperCase());
    const usuarios = {}; SRP.ref.usuarios.forEach(u => { usuarios[u.id] = u; });
    const F0 = hora(this.DESDE, 8, 0);
    const cuentas = this.CUENTAS.map(([id, nombre, ap, perfil, org]) => ({
      id, correo: id.replace('u-demo-', 'demo.') + '@ejemplo.local', nombre_completo: nombre + ' ' + ap + ' Demo',
      organizacion_id: org || SRP.CONFIG.ORGANIZACION_SEDEMA, area_id: org ? null : 'a-dgsanpava',
      cargo_rol: perfil === 'CABO' ? 'Cabo de cuadrilla' : 'Coordinación de cuadrilla', perfil, coordinadores_ids: [],
      activo: true, fecha_creacion: F0, creado_por_id: 'u-admin-1', fecha_ultima_edicion: null, editado_por_id: null }));
    cuentas.forEach(u => { usuarios[u.id] = u; });
    const nombre = id => usuarios[id] ? SRP.util.nombreCompleto(usuarios[id]) : id;
    // La institución de cada cuenta y sus coordinaciones: corrigen los árboles de sus cabos y abren las compartidas
    const orgDe = id => (usuarios[id] || {}).organizacion_id || SRP.CONFIG.ORGANIZACION_SEDEMA;
    const coordsDe = o => Object.values(usuarios).filter(u => u.perfil === 'COORDINADOR' && orgDe(u.id) === o).map(u => u.id).sort();
    const colonias = this.coloniasPorAlcaldia();
    const jornadas = [], arboles = [], bitacora = [];
    const secuencias = SRP.folio.leerSecuencias(), recibidos = {};
    let nb = 0, na = 0, nj = 0;
    const bit = (accion, entidad, id, fecha, quien, detalle) => bitacora.push({ id: 'demo-b-' + String(++nb).padStart(6, '0'), fecha, usuario_id: quien,
      usuario_nombre: nombre(quien), perfil: (usuarios[quien] || {}).perfil || 'CABO', accion, entidad, entidad_id: id, detalle: detalle || '' });
    // Temporada: más en lluvias (junio a septiembre) que en secas; un poco más cada año
    const temporada = [0.35, 0.35, 0.45, 0.5, 0.6, 1, 1, 1, 0.95, 0.7, 0.5, 0.2];
    const anual = { 2024: 0.8, 2025: 1, 2026: 1.15 };
    // Lo que alimenta «Qué atender»: dos jornadas abiertas de días anteriores y dos de hoy
    const abiertasViejas = { 'u-demo-c2': I.sumarDias(hoy, -15), 'u-demo-c5': I.sumarDias(hoy, -28) };
    const hoyAbiertas = ['u-demo-c4', 'u-demo-c1'];
    /* Vehículos del catálogo: cada cabo usa casi siempre uno o dos, y de vez en cuando otro,
       para que el cierre ofrezca sus frecuentes. Con su propia semilla: no mueve lo demás */
    const rv = this.azar(162);
    const vehiculos = SRP.ref.deTipo('vehiculo', true).slice().sort((a, b) => a.id.localeCompare(b.id));
    const favoritos = {};
    this.CUADRILLAS.forEach(([cabo], i) => { favoritos[cabo] = vehiculos.length ? [vehiculos[(i * 2) % vehiculos.length], vehiculos[(i * 2 + 5) % vehiculos.length]] : []; });
    const vehiculoDe = cabo => {
      if (!vehiculos.length) return null;
      const x = rv(), f = favoritos[cabo] || [vehiculos[0], vehiculos[1 % vehiculos.length]];
      return x < 0.6 ? f[0] : x < 0.9 ? f[1] : vehiculos[Math.floor(rv() * vehiculos.length)];
    };
    /* La jornada de demostración, completa: lo que se escribe al iniciarla y al cerrarla. Sortea en el mismo orden
       en todas las pasadas. De fuera de la Secretaría no se piden personal, chófer ni vehículo; el personal se sortea
       igual y se descarta, así la demostración sale siempre igual. */
    const jornadaDe = ({ idj, t, alc, lat, lng, d, cabo, abierta, inicio, fin, n, revisar, conReporte, externa, veh, solicitud, programa }) => ({ id: idj, nombre: pick(this.SITIOS) + ' · ' + titulo(t.colonia || alc), ubicacion: r() < 0.3 ? pick(['Frente al mercado', 'Entre las calles principales', 'Lado oriente', 'Junto a la escuela']) : '',
      programa_id: programa, lat: +lat.toFixed(6), lng: +lng.toFixed(6), punto_origen: 'gps', gps_precision_m: 10,
      alcaldia_cve: t.alcaldia_cve, alcaldia: t.alcaldia, colonia_cve: t.colonia_cve, colonia: t.colonia, fecha: d, comentarios: r() < 0.15 ? 'Plantación con participación vecinal.' : '',
      cabo_id: cabo, organizacion_id: (usuarios[cabo] && usuarios[cabo].organizacion_id) || SRP.CONFIG.ORGANIZACION_SEDEMA,
      estatus: abierta ? 'abierta' : 'cerrada', fecha_inicio: inicio, fecha_cierre: abierta ? null : new Date(new Date(fin).getTime() + 25 * 60000).toISOString(),
      encargado_id: cabo, relevo_id: null, relevos: [], cabos_apoyo: [], editado_por_id: null, fecha_ultima_edicion: null,
      ...(solicitud ? this.SOLICITUDES[(nj / 7) % this.SOLICITUDES.length] : SRP.solicitud.vacio()),
      arboles_previstos: Math.max(1, n + (r() < 0.6 ? 0 : r() < 0.75 ? 1 + Math.floor(r() * 4) : -1 - Math.floor(r() * 2))),
      puntos_revisados: !abierta && r() < 0.85 ? revisar : [], reporte_en: conReporte ? new Date(new Date(fin).getTime() + 90 * 60000).toISOString() : null, carga_id: null,
      personal: (v => externa ? '' : v)(conReporte ? Array.from({ length: 3 + Math.floor(r() * 4) }, () => pick(this.PERSONAL)).filter((x, i, l) => l.indexOf(x) === i).join('\n') : ''),
      apoyo: (v => externa ? '' : v)(conReporte && r() < 0.3 ? pick(this.PERSONAL) : ''), observaciones: conReporte && r() < 0.25 ? pick(this.OBSERVACIONES) : '',
      chofer: conReporte && !externa ? pick(this.PERSONAL) : '', vehiculo_id: veh ? veh.id : null, vehiculo_placa: veh ? veh.nombre : '', vehiculo_modelo: veh ? veh.modelo : '', vehiculo_tipo: veh ? veh.tipo_vehiculo : '',
      hora: conReporte ? '13:' + String(Math.floor(r() * 6) * 10).padStart(2, '0') : '' });
    /* Dos pasadas por el calendario: la Secretaría con su semilla y, después, las cuadrillas de
       fuera con otra. Así agregar organizaciones no cambia ni un árbol de lo que ya había. */
    const pasadas = [[this.CUADRILLAS, principal, 0, 0.6], [this.CUADRILLAS_EXTERNAS, this.azar(20260929), 0.6, 0.08], [this.CUADRILLAS_INSTITUCIONES, this.azar(20260930), 0.68, 0.14]];
    for (const [cuadrillas, semilla, base, parte] of pasadas) {
    r = semilla;
    let dias = 0;
    const total = Math.round((I.aFecha(hoy) - I.aFecha(this.DESDE)) / 864e5) + 1;
    for (let d = this.DESDE; d <= hoy; d = I.sumarDias(d, 1), dias++) {
      if (dias % 40 === 0 && avance) { avance(base + dias / total * parte); await new Promise(res => setTimeout(res, 0)); }
      const dow = I.aFecha(d).getDay();
      for (const [cabo, alcaldias, desde, hasta, programaFijo, cuanto] of cuadrillas) {
        if (d < desde || (hasta && d > hasta)) continue;
        const externa = !SRP.ref.esSedema((usuarios[cabo] || {}).organizacion_id || SRP.CONFIG.ORGANIZACION_SEDEMA);
        const forzada = abiertasViejas[cabo] === d || (d === hoy && hoyAbiertas.includes(cabo));
        let p = 0.18 * temporada[Number(d.slice(5, 7)) - 1] * (anual[d.slice(0, 4)] || 1) * (cuanto || 1);
        if (dow === 0) p = 0; else if (dow === 6) p *= 0.3;
        if (!forzada && (d === hoy || r() >= p)) continue;
        // El sitio: una colonia de sus alcaldías
        const alc = pick(alcaldias);
        const col = pick(colonias[alc] || colonias[Object.keys(colonias)[0]]);
        const [lat, lng] = this.puntoEn(col, r);
        const t = SRP.derivacion.derivar(+lat.toFixed(6), +lng.toFixed(6));   // el punto que se guarda
        if (!t.alcaldia) continue;
        const idj = 'demo-j-' + String(++nj).padStart(5, '0');
        const abierta = forzada;
        // Los programas sin consumir azar de más, para que la demostración salga siempre igual
        const deCatalogo = programaFijo || (t.alcaldia === 'Cuauhtémoc' && r() < 0.5 ? 'p-centro'
          : nj % 10 === 3 ? 'p-palmeras' : nj % 10 === 7 ? 'p-compensaciones' : 'p-refor');
        // Una de cada siete jornadas de la Secretaría atiende una solicitud; sin sortear, para no mover el resto de la demostración
        const solicitud = !externa && nj % 7 === 0;
        const programa = solicitud ? SRP.CONFIG.PROGRAMA_SOLICITUD : deCatalogo;
        const n = forzada && d === hoy ? 3 + Math.floor(r() * 5) : 5 + Math.floor(r() * 18);
        const inicio = hora(d, 8, Math.floor(r() * 50));
        // Quien corrige: la coordinación de su institución; sin ella, o si quien registra coordina, la propia persona
        const coord = (usuarios[cabo] || {}).perfil === 'COORDINADOR' ? cabo : coordsDe(orgDe(cabo))[0] || cabo;
        const regs = [];
        let minuto = 0;
        for (let i = 0; i < n; i++) {
          // Alrededor del sitio, a menos de ~70 m; de vez en cuando uno lejos (un error de captura)
          const lejos = !abierta && r() < 0.025 && i === n - 1;
          const radio = lejos ? 0.0035 : 0.0006;
          // Con seis decimales, como los guarda la captura, y la ubicación de ese mismo punto
          let la = +(lat + (r() - 0.5) * radio * 2).toFixed(6), lo = +(lng + (r() - 0.5) * radio * 2).toFixed(6);
          let ta = SRP.derivacion.derivar(la, lo);
          // En el límite de la ciudad el desplazamiento puede sacarlo de la CDMX: entonces se queda en el sitio
          if (!ta.alcaldia) { la = +lat.toFixed(6); lo = +lng.toFixed(6); ta = t; }
          const x = r();
          const origen = x < 0.85 ? 'gps' : x < 0.95 ? 'mapa' : 'manual';
          const prec = origen === 'gps' ? (r() < 0.03 ? 32 + Math.floor(r() * 25) : 3 + Math.floor(r() * 18)) : null;
          minuto += 6 + Math.floor(r() * 12);
          const reg = hora(d, 8 + Math.floor(minuto / 60), minuto % 60);
          const id = 'demo-a-' + String(++na).padStart(6, '0');
          const a = { id, estatus: 'activo', cabo_id: cabo, lat: la, lng: lo, punto_origen: origen, gps_precision_m: prec,
            folio: null,
            especie_id: especie(), especie_otra: '',
            alcaldia_cve: ta.alcaldia_cve, alcaldia: ta.alcaldia, colonia_cve: ta.colonia_cve, colonia: ta.colonia, uga: ta.uga, uga_borde_m: ta.uga_borde_m, capa_version: ta.capa_version,
            // Uno de cada 37 en macetón, sin sortearlo: el resto de la demostración sale igual que antes
            programa_id: programa, fecha_plantacion: d, jornada_id: idj, sitio_plantacion: na % 37 === 0 ? 'maceton' : 'suelo', comentarios: r() < 0.06 ? pick(['Junto a la banqueta.', 'Cerca de luminaria.', 'Cepa de 60 × 60 cm.', 'Con tutor.']) : '',
            foto_base64: null, foto_id: null, fecha_registro: reg, fecha_ultima_edicion: null, editado_por_id: null,
            sustituye_id: null, motivo_sustitucion: null, motivo_sustitucion_otro: '', sustituido_por_id: null };
          // Un posible duplicado: la misma especie a un par de metros del anterior
          if (!abierta && i > 0 && r() < 0.012) {
            const o = regs[i - 1], dla = +(o.lat + 0.00001).toFixed(6), t2 = SRP.derivacion.derivar(dla, o.lng);
            Object.assign(a, { especie_id: o.especie_id, lat: dla, lng: o.lng, alcaldia_cve: t2.alcaldia_cve, alcaldia: t2.alcaldia, colonia_cve: t2.colonia_cve,
              colonia: t2.colonia, uga: t2.uga, uga_borde_m: t2.uga_borde_m, capa_version: t2.capa_version });
          }
          regs.push(a);
          bit('CREADO', 'plantacion', id, reg, cabo);
        }
        const fin = regs.length ? regs[regs.length - 1].fecha_registro : inicio;
        const flag = SRP.jornadas.avisos({ registros: regs });
        const revisar = Object.keys(flag);
        const viejo = I.sumarDias(hoy, -7) > d;
        const conReporte = !abierta && r() < (viejo ? 0.92 : 0.5);
        const veh = conReporte && !externa ? vehiculoDe(cabo) : null;
        const j = jornadaDe({ idj, t, alc, lat, lng, d, cabo, abierta, inicio, fin, n, revisar, conReporte, externa, veh, solicitud, programa });
        jornadas.push(j);
        bit('CREADO', 'jornada', idj, inicio, cabo);
        // Eliminados y editados: la trazabilidad que ve la coordinación
        regs.forEach(a => {
          const x = r();
          if (!abierta && x < 0.015) {
            const cuando = new Date(new Date(a.fecha_registro).getTime() + (1 + Math.floor(r() * 5)) * 864e5).toISOString();
            Object.assign(a, { estatus: 'eliminado', fecha_ultima_edicion: cuando, editado_por_id: r() < 0.5 ? cabo : coord });
            bit('ELIMINADO', 'plantacion', a.id, cuando, a.editado_por_id);
          } else if (!abierta && x < 0.045) {
            const cuando = new Date(new Date(a.fecha_registro).getTime() + (1 + Math.floor(r() * 9)) * 864e5).toISOString();
            Object.assign(a, { fecha_ultima_edicion: cuando, editado_por_id: r() < 0.6 ? cabo : coord });
            bit('EDITADO', 'plantacion', a.id, cuando, a.editado_por_id, 'Campos: ' + pick(['especie_id', 'comentarios', 'lat, lng, punto_origen']));
          }
        });
        arboles.push(...regs);
      }
    }
    }
    if (avance) avance(0.8);
    this.eventos({ jornadas, arboles, jornadaDe, bit, hora, especie, pick, colonias, usuarios, orgDe, coordsDe, nombre, hoy, vehiculoDe,
      azar: x => { r = x; }, sig: { arbol: () => 'demo-a-' + String(++na).padStart(6, '0'), jornada: () => 'demo-j-' + String(++nj).padStart(5, '0') }, temporada });
    r = principal;
    // Folios y envío: lo anterior a hoy ya salió; lo de hoy espera, como en campo
    arboles.filter(a => a.fecha_plantacion < hoy && a.estatus === 'activo' && SRP.folio.puedeEmitir(a))
      .sort((a, b) => a.fecha_registro.localeCompare(b.fecha_registro)).forEach(a => {
        const celda = a.uga && /^[A-Z]{3}-\d{3}$/.test(a.uga) ? a.uga : 'EXT-000';
        secuencias[celda] = (secuencias[celda] || 0) + 1;
        Object.assign(a, { folio: SRP.folio.armar(celda, secuencias[celda]) });
        recibidos[a.id] = new Date(new Date(a.fecha_registro).getTime() + 40 * 60000).toISOString();
      });
    // Algunas fotografías: pocas y chicas, para ver la galería sin llenar el teléfono
    if (avance) avance(0.85);
    const conFoto = arboles.filter(() => r() < 0.04);
    const lienzo = document.createElement('canvas'); lienzo.width = 320; lienzo.height = 240;
    const g = lienzo.getContext('2d');
    conFoto.forEach((a, i) => {
      const e = SRP.ref.especieDe(a);
      g.fillStyle = SRP.util.colorBase('croquis-fondo'); g.fillRect(0, 0, 320, 240);
      g.fillStyle = SRP.util.colorBase('exito'); g.beginPath(); g.arc(160, 105, 60 + (i % 5) * 6, 0, Math.PI * 2); g.fill();
      g.fillStyle = SRP.util.colorBase('texto'); g.fillRect(154, 150, 12, 60);
      g.font = 'bold 18px Roboto, Arial, sans-serif'; g.textAlign = 'center'; g.fillText(e.comun + ' (demostración)', 160, 230);
      const datos = lienzo.toDataURL('image/jpeg', 0.6);
      Object.assign(a, { foto_base64: datos, foto_id: 'demo-f-' + a.id.slice(7) });
    });
    return { cuentas, jornadas, arboles, bitacora, secuencias, recibidos, catalogos: [this.EMPRESA] };
  },

  /* 4. EVENTOS MASIVOS Y RELEVOS, con su propia semilla. `g` trae lo de generar(): las listas que se llenan, la
     jornada de demostración (jornadaDe), la bitácora, el sorteo y los consecutivos. */
  eventos(g) {
    const I = SRP.indicadores, r = this.azar(20261025);
    g.azar(r);   // pick y especie sortean con esta semilla
    const todas = this.CUADRILLAS.concat(this.CUADRILLAS_EXTERNAS, this.CUADRILLAS_INSTITUCIONES);
    const trabaja = (id, d) => todas.some(([c, , desde, hasta]) => c === id && d >= desde && (!hasta || d <= hasta));
    const alcaldiasDe = id => (todas.find(([c]) => c === id) || [])[1] || ['Cuauhtémoc'];
    const desdeDe = id => todas.filter(([c]) => c === id).map(x => x[2]).sort()[0] || this.DESDE;
    const cabosDe = (o, d) => [...new Set(todas.map(x => x[0]))].filter(id => (g.usuarios[id] || {}).perfil === 'CABO' && g.orgDe(id) === o && trabaja(id, d)).sort();
    const revolver = xs => xs.map(x => [r(), x]).sort((a, b) => a[0] - b[0]).map(x => x[1]);
    const ayer = I.sumarDias(g.hoy, -1);
    // Un día de trabajo desde `desde`: entre semana, más en lluvias
    const unDia = desde => {
      const total = Math.round((I.aFecha(ayer) - I.aFecha(desde)) / 864e5);
      for (let k = 0; k < 60; k++) {
        const d = I.sumarDias(desde, Math.floor(r() * (total + 1)));
        if (I.aFecha(d).getDay() !== 0 && r() < g.temporada[Number(d.slice(5, 7)) - 1]) return d;
      }
      return ayer;
    };
    const minutos = (d, m) => g.hora(d, 8 + Math.floor(m / 60), m % 60);
    const masMin = (iso, m) => new Date(new Date(iso).getTime() + m * 60000).toISOString();
    // El sitio: una colonia de las alcaldías de quien abre la jornada
    const sitio = id => {
      const alc = g.pick(alcaldiasDe(id));
      const col = g.pick(g.colonias[alc] || g.colonias[Object.keys(g.colonias)[0]]);
      const [lat, lng] = this.puntoEn(col, r);
      return { alc, lat, lng, t: SRP.derivacion.derivar(+lat.toFixed(6), +lng.toFixed(6)) };
    };
    // Un árbol alrededor del sitio, a nombre de quien lo captura
    const arbol = (s, d, idj, cabo, programa, m) => {
      let la = +(s.lat + (r() - 0.5) * 0.0012).toFixed(6), lo = +(s.lng + (r() - 0.5) * 0.0012).toFixed(6);
      let ta = SRP.derivacion.derivar(la, lo);
      if (!ta.alcaldia) { la = +s.lat.toFixed(6); lo = +s.lng.toFixed(6); ta = s.t; }
      const x = r(), origen = x < 0.85 ? 'gps' : x < 0.95 ? 'mapa' : 'manual';
      const reg = minutos(d, m), id = g.sig.arbol();
      g.bit('CREADO', 'plantacion', id, reg, cabo);
      return { id, estatus: 'activo', cabo_id: cabo, lat: la, lng: lo, punto_origen: origen, gps_precision_m: origen === 'gps' ? 3 + Math.floor(r() * 18) : null, folio: null,
        especie_id: g.especie(), especie_otra: '',
        alcaldia_cve: ta.alcaldia_cve, alcaldia: ta.alcaldia, colonia_cve: ta.colonia_cve, colonia: ta.colonia, uga: ta.uga, uga_borde_m: ta.uga_borde_m, capa_version: ta.capa_version,
        programa_id: programa, fecha_plantacion: d, jornada_id: idj, sitio_plantacion: 'suelo', comentarios: '',
        foto_base64: null, foto_id: null, fecha_registro: reg, fecha_ultima_edicion: null, editado_por_id: null,
        sustituye_id: null, motivo_sustitucion: null, motivo_sustitucion_otro: '', sustituido_por_id: null };
    };
    // La jornada, con sus árboles ya hechos; abierta o cerrada como corresponde
    const cerrar = (s, d, idj, titular, regs, abierta, inicio, extra) => {
      const fin = regs.length ? regs.map(a => a.fecha_registro).sort().pop() : inicio;
      const externa = !SRP.ref.esSedema(g.orgDe(titular));
      const conReporte = !abierta && r() < (I.sumarDias(g.hoy, -7) > d ? 0.92 : 0.5);
      // El vehículo, del catálogo, como en las demás jornadas de la Secretaría con reporte
      const veh = conReporte && !externa ? g.vehiculoDe(titular) : null;
      const programa = regs.length ? regs[0].programa_id : 'p-refor';
      const j = Object.assign(g.jornadaDe({ idj, t: s.t, alc: s.alc, lat: s.lat, lng: s.lng, d, cabo: titular, abierta, inicio, fin, n: regs.length,
        revisar: Object.keys(SRP.jornadas.avisos({ registros: regs })), conReporte, externa, veh, solicitud: false, programa }), extra);
      g.jornadas.push(j); g.arboles.push(...regs);
      g.bit('CREADO', 'jornada', idj, inicio, titular);
      return j;
    };
    // Las empresas, palmeras; la Secretaría, a veces Centro Histórico, que sólo va en Cuauhtémoc; lo demás, reforestación
    const programaDe = (id, alc) => { const o = g.orgDe(id); return o === 'o-green-cover' ? 'p-palmeras' : SRP.ref.esSedema(o) && alc === 'Cuauhtémoc' && r() < 0.5 ? 'p-centro' : 'p-refor'; };

    /* Jornadas compartidas: la coordinación abre, marca a sus cabos de apoyo y registra menos que ellos */
    const compartida = (titular, d, apoyos, n, abierta) => {
      const s = sitio(titular), idj = g.sig.jornada(), programa = programaDe(titular, s.alc);
      const inicio = minutos(d, Math.floor(r() * 30));
      const quitado = !abierta && apoyos.length > 2 && r() < 0.12 ? apoyos[apoyos.length - 1] : null;
      const olvida = !abierta && !quitado && r() < 0.15 ? apoyos[0] : null;
      const corte = 60 + Math.floor(r() * 60);
      const reloj = {}, regs = [];
      [titular].concat(apoyos).forEach(id => { reloj[id] = 10 + Math.floor(r() * 20); });
      for (let i = 0; i < n; i++) {
        // La coordinación captura la mitad que un cabo; en la abierta de hoy, por turno, para que cada quien tenga los suyos
        let quien = abierta ? [titular].concat(apoyos)[i % (apoyos.length + 1)] : r() < 0.5 / (apoyos.length + 0.5) ? titular : apoyos[Math.floor(r() * apoyos.length)];
        if (quien === quitado && reloj[quien] > corte) quien = titular;
        reloj[quien] += 4 + Math.floor(r() * 6);
        regs.push(arbol(s, d, idj, quien, programa, reloj[quien]));
      }
      const desde = masMin(inicio, 5);
      const cabos_apoyo = apoyos.map(id => {
        const suyos = regs.filter(a => a.cabo_id === id).map(a => a.fecha_registro).sort();
        if (abierta || id === olvida) return { cabo_id: id, desde, por_id: titular, hasta: null, fin: null };
        if (id === quitado) return { cabo_id: id, desde, por_id: titular, hasta: minutos(d, corte), fin: 'quitado' };
        return { cabo_id: id, desde, por_id: titular, hasta: masMin(suyos.length ? suyos[suyos.length - 1] : desde, 5 + Math.floor(r() * 10)), fin: 'terminado' };
      });
      g.bit('APOYO', 'jornada', idj, desde, titular, 'Agrega: ' + apoyos.map(g.nombre).join(', '));
      cabos_apoyo.filter(a => a.fin).forEach(a => {
        const suyos = regs.filter(x => x.cabo_id === a.cabo_id).length;
        if (a.fin === 'quitado') g.bit('APOYO', 'jornada', idj, a.hasta, titular, 'Quita: ' + g.nombre(a.cabo_id));
        else g.bit('APOYO', 'jornada', idj, a.hasta, a.cabo_id, 'Terminó su parte: ' + suyos + (suyos === 1 ? ' árbol' : ' árboles'));
      });
      // La abierta de hoy va a medias: lo previsto es lo de un evento masivo
      return cerrar(s, d, idj, titular, regs, abierta, inicio, abierta ? { cabos_apoyo, arboles_previstos: 60 } : { cabos_apoyo });
    };
    // Unas 40: nueve por coordinación de la Secretaría y cinco por cada una de fuera
    [['u-coord-1', 9], ['u-demo-k1', 9], ['u-coord-alc', 5], ['u-coord-gob', 5], ['u-coord-emp', 5], ['u-coord-osc', 5]].forEach(([titular, veces]) => {
      for (let k = 0; k < veces; k++) {
        const d = unDia(desdeDe(titular));
        const cabos = revolver(cabosDe(g.orgDe(titular), d));
        if (cabos.length < 2) continue;
        compartida(titular, d, cabos.slice(0, Math.min(cabos.length, 2 + Math.floor(r() * 4))), 40 + Math.floor(r() * 111), false);
      }
    });
    // La de hoy, abierta: Estela coordina; Rocío y Yolanda registran y no han terminado
    compartida('u-demo-k1', g.hoy, ['u-demo-c3', 'u-demo-c5'], 9, true);

    /* Relevos: la coordinación pasa la jornada de un cabo a otro de la institución; a veces se la devuelve */
    const relevo = (titular, otro, coord, d, n, abierta, vuelve) => {
      const s = sitio(titular), idj = g.sig.jornada(), programa = programaDe(titular, s.alc);
      const inicio = minutos(d, Math.floor(r() * 30));
      const pasa = Math.max(1, Math.floor(n * (0.3 + r() * 0.4))), regresa = vuelve ? Math.min(n - 1, pasa + 2 + Math.floor(r() * 4)) : n;
      const regs = [];
      let m = 10;
      for (let i = 0; i < n; i++) { m += 6 + Math.floor(r() * 10); regs.push(arbol(s, d, idj, i >= pasa && i < regresa ? otro : titular, programa, m)); }
      const t1 = masMin(regs[pasa - 1].fecha_registro, 3), t2 = vuelve ? masMin(regs[regresa - 1].fecha_registro, 3) : null;
      const relevos = [{ cabo_id: otro, fecha: t1, por_id: coord }].concat(vuelve ? [{ cabo_id: titular, fecha: t2, por_id: coord }] : []);
      g.bit('RELEVO', 'jornada', idj, t1, coord, 'Registra ' + g.nombre(otro) + ' en lugar de ' + g.nombre(titular) + '; titular: ' + g.nombre(titular));
      if (vuelve) g.bit('RELEVO', 'jornada', idj, t2, coord, 'Registra ' + g.nombre(titular) + ' en lugar de ' + g.nombre(otro) + ': vuelve el titular');
      return cerrar(s, d, idj, titular, regs, abierta, inicio, { relevo_id: vuelve ? null : otro, relevos });
    };
    // Unos 20, en las instituciones con coordinación y dos cabos o más
    const conCoordinacion = [SRP.CONFIG.ORGANIZACION_SEDEMA, 'o-alc-09007', 'o-paot', 'o-green-cover', 'o-reforestamos'];
    for (let k = 0; k < 20; k++) {
      const o = conCoordinacion[k % 2 ? 0 : 1 + (k >> 1) % 4], coord = g.coordsDe(o)[0];
      const desde = [...new Set(todas.map(x => x[0]))].filter(id => g.orgDe(id) === o).map(desdeDe).sort().pop();
      const d = unDia(desde > this.DESDE ? desde : this.DESDE);
      const cabos = revolver(cabosDe(o, d));
      if (!coord || cabos.length < 2) continue;
      relevo(cabos[0], cabos[1], coord, d, 8 + Math.floor(r() * 12), false, r() < 0.25);
    }
    // El de hoy, abierto: Julián la empezó y sigue Marisol
    relevo('u-demo-c2', 'u-demo-c1', 'u-coord-1', g.hoy, 5, true, false);
  },

  /* ---------- Cargar y quitar ---------- */

  // Carga (o vuelve a cargar) los datos de demostración. Primero quita los que hubiera
  async cargar(avance) {
    if (!SRP.CONFIG.ES_FICTICIO || this.cargando) return null;
    this.cargando = true;
    try {
      await this.quitar();
      const d = await this.generar(avance);
      if (avance) avance(0.9);
      // Cada árbol con su calle, como la pondría el servidor al recibirlos. Sin la capa (sin señal), la reciben al enviar
      try {
        const conCalle = new Map((await SRP.calles.conCalle(d.arboles, avance ? (i, n) => avance(0.9 + 0.08 * i / n) : null)).map(a => [a.id, a]));
        d.arboles = d.arboles.map(a => conCalle.get(a.id) || a);
      } catch (err) { /* la calle llega con el siguiente envío */ }
      await SRP.almacen._tx(this.ALMACENES, 'readwrite', (tx) => {
        d.cuentas.forEach(x => tx.objectStore('usuarios').put(x));
        d.jornadas.forEach(x => tx.objectStore('jornadas').put(x));
        d.arboles.forEach(x => tx.objectStore('plantaciones').put(x));
        d.bitacora.forEach(x => tx.objectStore('bitacora').put(x));
        d.catalogos.forEach(x => SRP.almacen.ponerCatalogo(tx, x));
      });
      try { localStorage.setItem(SRP.CONFIG.CLAVE_SECUENCIAS_PRUEBA, JSON.stringify(d.secuencias)); } catch (e) { /* sin persistencia */ }
      const e = SRP.envio.leer(); Object.assign(e.recibidos, d.recibidos); SRP.envio.escribir(e);
      await SRP.ref.recargar();
      return { jornadas: d.jornadas.length, arboles: d.arboles.filter(a => a.estatus === 'activo').length, cuentas: d.cuentas.length };
    } finally { this.cargando = false; }
  },

  /* Quita todo lo que tenga prefijo de demostración, y lo que la bitácora diga de ello. Se
     conserva lo de demostración de que dependa algo propio: la jornada donde alguien puso un árbol
     suyo, la cuenta con que se capturó y las cuentas que registran en esa jornada. De la jornada
     conservada se quitan sus árboles de demostración; queda con los propios. */
  async quitar() {
    const d = {};
    await Promise.all(this.ALMACENES.map(async n => { d[n] = await SRP.almacen.todos(n); }));
    const conservar = new Set();
    const guardar = (...ids) => ids.forEach(id => { if (this.es(id)) conservar.add(id); });
    d.plantaciones.filter(a => !this.es(a.id)).forEach(a => guardar(a.jornada_id, a.cabo_id));
    d.jornadas.filter(j => !this.es(j.id)).forEach(j => guardar(...SRP.permisos.personasDe(j), j.encargado_id));
    d.jornadas.filter(j => conservar.has(j.id)).forEach(j => guardar(...SRP.permisos.personasDe(j)));
    // La empresa de demostración se queda si una cuenta o jornada que se conserva es suya
    d.usuarios.filter(u => !this.es(u.id) || conservar.has(u.id)).forEach(u => guardar(u.organizacion_id));
    d.jornadas.filter(j => !this.es(j.id) || conservar.has(j.id)).forEach(j => guardar(j.organizacion_id));
    // Lo que se quita, y lo que la bitácora dijo de ello aunque la acción haya sido propia
    const ids = [].concat(...this.ALMACENES.map(n => d[n].filter(x => this.es(x.id) && !conservar.has(x.id)).map(x => x.id)));
    const sueltas = d.bitacora.filter(x => !this.es(x.id) && this.es(x.entidad_id) && !conservar.has(x.entidad_id)).map(x => x.id);
    /* Se borra por rango de clave (todo lo «demo-…» de un golpe: uno por uno tardaba 5 s con
       16,000 renglones) y se vuelve a poner lo que se conserva, en la misma transacción */
    const rango = pre => IDBKeyRange.bound(pre, pre + '\uffff');
    await SRP.almacen._tx(this.ALMACENES, 'readwrite', (tx) => {
      this.ALMACENES.forEach(n => {
        const al = tx.objectStore(n);
        al.delete(rango(n === 'usuarios' ? 'u-demo-' : 'demo-'));
        d[n].filter(x => conservar.has(x.id)).forEach(x => al.put(x));
      });
      sueltas.forEach(id => tx.objectStore('bitacora').delete(id));
    });
    const e = SRP.envio.leer();
    ids.forEach(id => { delete e.recibidos[id]; });
    e.cambios = e.cambios.filter(id => !this.es(id) || conservar.has(id));
    SRP.envio.escribir(e);
    await SRP.ref.recargar();
    return { quitados: ids.length + sueltas.length, conservar, jornadas: [...conservar].filter(id => /^demo-j-/.test(id)).length };
  },

  /* ---------- Los botones de la ventana «Datos de prueba» ---------- */

  iniciar() {
    if (!SRP.CONFIG.ES_FICTICIO) return;
    this.el('btn-demo-cargar').addEventListener('click', () => this.alCargar());
    this.el('btn-demo-quitar').addEventListener('click', () => this.alQuitar());
  },

  async pintar() {
    const caja = this.el('caja-demo');
    caja.hidden = !SRP.CONFIG.ES_FICTICIO || !SRP.almacen.db || !SRP.sesion.usuario;
    if (caja.hidden) return;
    const c = await this.contar();
    const hay = c.jornadas > 0;
    this.el('demo-estado').textContent = hay
      ? 'Cargados: ' + c.jornadas.toLocaleString('es-MX') + ' jornadas y ' + c.arboles.toLocaleString('es-MX') + ' árboles de cabos y coordinaciones de la Secretaría y de otras instituciones, desde enero de 2024 hasta hoy.'
      : 'Jornadas inventadas de enero de 2024 a hoy, de la Secretaría y de una institución de cada tipo —alcaldías, Gobierno de la CDMX, empresas y organizaciones civiles—, con cabos y coordinaciones de todas, jornadas compartidas, relevos y los cuatro programas, para probar Supervisión, Mi avance y los informes. No tocan lo que usted capture.';
    const cargar = this.el('btn-demo-cargar');
    cargar.querySelector('span').textContent = hay ? 'Volver a cargar' : this.huboAntes() ? 'Recuperar datos de demostración' : 'Cargar datos de demostración';
    cargar.disabled = this.cargando;
    this.el('btn-demo-quitar').disabled = !hay || this.cargando;
  },
  huboAntes() { try { return localStorage.getItem('srp_demo_quitados') === '1'; } catch (e) { return false; } },

  async alCargar() {
    const ok = await SRP.app.confirmar({ titulo: 'Datos de demostración', pregunta: '¿Cargar datos inventados, de enero de 2024 a hoy, en este equipo?',
      puntosTitulo: 'Qué pasa:', puntos: ['Se agregan más de 1,400 jornadas y más de 22,000 árboles, de enero de 2024 a hoy, de cabos y coordinaciones de la Secretaría y de otras instituciones: alcaldías, Gobierno de la CDMX, empresas y organizaciones civiles.',
        'Entre ellas, unas 40 jornadas compartidas y 20 con relevo. Hoy quedan abiertas una compartida, que coordina Estela Ramírez, y una con relevo, que empezó Julián Ortega.',
        'Lo que usted haya capturado no se toca. Si ya había datos de demostración, se vuelven a cargar iguales.',
        'Tarda unos segundos. Se quitan con «Quitar datos de demostración».'], boton: 'Cargar', icono: 'descargar' });
    if (!ok) return;
    const b = this.el('btn-demo-cargar');
    const libre = SRP.util.ocupado(b, 'Cargando…', 'reloj');
    this.el('btn-demo-quitar').disabled = true;   // mientras carga no se quita
    const estado = this.el('demo-estado');
    try {
      const res = await this.cargar(f => { estado.textContent = 'Cargando datos de demostración… ' + Math.round(f * 100) + ' %'; });
      try { localStorage.removeItem('srp_demo_quitados'); } catch (e) { /* sin persistencia */ }
      SRP.app.cerrarDatosPrueba();
      SRP.util.anunciar('Datos de demostración cargados: ' + res.jornadas.toLocaleString('es-MX') + ' jornadas y ' + res.arboles.toLocaleString('es-MX') +
        ' árboles. Con «Cambiar usuario (pruebas)», en el menú de la cuenta, puede entrar como uno de sus cabos o coordinaciones.', 'exito');
      await this.refrescar();
    } finally { libre(); await this.pintar(); }
  },

  async alQuitar() {
    const c = await this.contar();
    const ok = await SRP.app.confirmar({ titulo: 'Quitar los datos de demostración', pregunta: '¿Quitar los datos de demostración de este equipo?',
      puntosTitulo: 'Qué pasa:', puntos: ['Se quitan ' + c.jornadas.toLocaleString('es-MX') + ' jornadas, ' + c.arboles.toLocaleString('es-MX') + ' árboles y las ' + c.cuentas + ' cuentas de demostración.',
        'Lo que usted capturó se queda.', 'Se pueden volver a cargar iguales con «Recuperar datos de demostración».'], boton: 'Quitar', icono: 'basura' });
    if (!ok) return;
    const libre = SRP.util.ocupado(this.el('btn-demo-quitar'), 'Quitando…', 'reloj');
    this.el('btn-demo-cargar').disabled = true;
    try {
      const u = SRP.sesion.usuario;
      const res = await this.quitar();
      try { localStorage.setItem('srp_demo_quitados', '1'); } catch (e) { /* sin persistencia */ }
      SRP.app.cerrarDatosPrueba();
      SRP.util.anunciar('Datos de demostración quitados.' + (res.jornadas ? ' Se conservó ' + (res.jornadas === 1 ? '1 jornada' : res.jornadas + ' jornadas') + ' donde se registró un árbol propio.' : ''), 'exito');
      // Quien estaba dentro con una cuenta de demostración sale: esa cuenta ya no existe
      if (u && this.es(u.id) && !res.conservar.has(u.id)) { SRP.sesion.cerrar(); SRP.app.mostrarAcceso(); }
      else await this.refrescar();
    } finally { libre(); await this.pintar(); }
  },

  // La sección a la vista se vuelve a pintar con lo nuevo; las cuentas de prueba, también
  async refrescar() {
    if (SRP.app.vista === 'acceso') { SRP.app.mostrarAcceso(); return; }
    if (SRP.app.vista) SRP.app.mostrarVista(SRP.app.vista);
    SRP.conexion.refrescar();
  }
};

// Si algo falla al cargar o quitar, se dice qué no se pudo hacer
SRP.util.proteger(SRP.demo, { alCargar: 'cargar los datos de demostración', alQuitar: 'quitar los datos de demostración' });
