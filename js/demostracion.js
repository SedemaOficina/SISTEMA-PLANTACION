/* DATOS DE DEMOSTRACIÓN (D160). Sólo con datos de prueba (ES_FICTICIO). Para probar Supervisión,
   Mi avance, los informes y las listas con volumen de verdad, un botón al pie carga casi tres años
   de trabajo inventado —desde enero de 2024 hasta hoy— y otro lo quita sin tocar lo que se haya
   capturado a mano. Volver a cargarlos da las mismas cuentas, jornadas y árboles: el generador usa
   una semilla fija. Los folios no se repiten: siguen la secuencia simulada, que nunca retrocede
   (R5, D110), así que al recuperar los datos los árboles reciben folios nuevos.

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
   Fuera de la Secretaría no hay personal, chófer ni vehículo. Cada cabo trabaja en sus alcaldías, más en la
   temporada de lluvias que en secas y un poco más cada año. Cada jornada tiene su sitio dentro de
   una colonia real de la capa, de 5 a 22 árboles alrededor, meta, cierre y, casi siempre, reporte.
   El territorio de cada árbol se deriva con las capas, como al registrar; los folios salen de la
   misma secuencia simulada (D110) y lo anterior a hoy ya está «enviado». Hay de todo lo que la
   supervisión debe encontrar: jornadas abiertas de días anteriores, puntos sin revisar, jornadas
   sin reporte, árboles eliminados y editados, precisión baja, algunas fotografías.

   CÓMO SE RECONOCEN. Todo lo cargado lleva identificador con prefijo «demo-» (las cuentas,
   «u-demo-»): así se quita sin tocar lo demás y sin agregar un campo al esquema. Si alguien
   capturó algo propio dentro de lo de demostración —un árbol en una jornada de demostración, o
   entró con una cuenta de demostración y registró—, esa jornada y esa cuenta se conservan. */
window.SRP = window.SRP || {};

SRP.demo = {
  cargando: false,
  DESDE: '2024-01-08',
  ALMACENES: ['usuarios', 'jornadas', 'plantaciones', 'bitacora', 'instituciones'],   // de los catálogos, sólo trae una institución

  el(id) { return document.getElementById(id); },
  es(id) { return /^(demo-|u-demo-)/.test(String(id || '')); },

  // Los pedidos especiales de la demostración: de SOBSE, de una alcaldía y de una instancia fuera del catálogo
  PEDIDOS: [
    { origen: 'PEDIDO', solicitante_id: 's-sobse', solicitante_otro: '', pedido_descripcion: 'Compensación por obra vial.' },
    { origen: 'PEDIDO', solicitante_id: 's-alc-09007', solicitante_otro: '', pedido_descripcion: '' },
    { origen: 'PEDIDO', solicitante_id: 's-sobse', solicitante_otro: '', pedido_descripcion: 'Camellón rehabilitado.' },
    { origen: 'PEDIDO', solicitante_id: null, solicitante_otro: 'Sistema de Transporte Colectivo Metro', pedido_descripcion: 'Entorno de estación.' }],

  // La empresa de demostración: sólo existe mientras estén cargados los datos
  EMPRESA: { id: 'demo-org-empresa', tipo: 'organizacion', clave: 'DEMO_EMPRESA', nombre: 'Viveros y Paisaje Ejemplo, S.A. de C.V.', activo: true,
    tipo_organizacion: 'Empresa privada',
    creado_por_id: 'u-admin-1', fecha_creacion: '2026-03-02T09:00:00-06:00', editado_por_id: null, fecha_ultima_edicion: null },

  /* Las cuentas: una coordinación más y seis cabos de la Secretaría; de fuera, dos cabos de la
     Alcaldía Iztapalapa, con el coordinador de arranque de esa alcaldía, y uno de la empresa de
     demostración, sin coordinación. Nombres inventados, apellido «Demo». La sexta columna es la
     institución (SEDEMA si falta). */
  CUENTAS: [
    ['u-demo-k1', 'Estela', 'Ramírez', 'COORDINADOR', null],
    ['u-demo-c1', 'Marisol', 'Pérez', 'CABO', 'u-coord-1'],
    ['u-demo-c2', 'Julián', 'Ortega', 'CABO', 'u-coord-1'],
    ['u-demo-c3', 'Rocío', 'Hernández', 'CABO', 'u-coord-1'],
    ['u-demo-c4', 'Tomás', 'Díaz', 'CABO', 'u-demo-k1'],
    ['u-demo-c5', 'Yolanda', 'Cruz', 'CABO', 'u-demo-k1'],
    ['u-demo-c6', 'Arturo', 'Méndez', 'CABO', 'u-demo-k1'],
    ['u-demo-z2', 'Ernesto', 'Luna', 'CABO', 'u-coord-alc', 'o-alc-09007'],
    ['u-demo-z3', 'Paula', 'Sánchez', 'CABO', 'u-coord-alc', 'o-alc-09007'],
    ['u-demo-e2', 'Nadia', 'Flores', 'CABO', null, 'demo-org-empresa'],
    ['u-demo-g1', 'Gerardo', 'Paredes', 'CABO', 'u-coord-gob', 'o-paot'],
    ['u-demo-s1', 'Silvia', 'Rangel', 'CABO', null, 'o-sobse'],
    ['u-demo-v1', 'Valeria', 'Castro', 'CABO', 'u-coord-emp', 'o-green-cover'],
    ['u-demo-o1', 'Omar', 'Fuentes', 'CABO', 'u-coord-osc', 'o-reforestamos'],
    ['u-demo-o2', 'Olivia', 'Reyes', 'CABO', 'u-coord-osc', 'o-reforestamos'],
    ['u-demo-z4', 'Zacarías', 'Molina', 'CABO', null, 'o-alc-09003']
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
  // Especies y su peso: lo que más se planta en la ciudad, casi todo nativo (catálogo real, D84)
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
    const cuentas = this.CUENTAS.map(([id, nombre, ap, perfil, coord, org]) => ({
      id, correo: id.replace('u-demo-', 'demo.') + '@ejemplo.local', nombre_completo: nombre + ' ' + ap + ' Demo',
      organizacion_id: org || SRP.CONFIG.ORGANIZACION_SEDEMA, area_id: org ? null : 'a-dgsanpava',
      cargo_rol: perfil === 'CABO' ? 'Cabo de cuadrilla' : 'Coordinación de cuadrilla', perfil, coordinadores_ids: coord ? [coord] : [],
      activo: true, fecha_creacion: F0, creado_por_id: 'u-admin-1', fecha_ultima_edicion: null, editado_por_id: null }));
    cuentas.forEach(u => { usuarios[u.id] = u; });
    const nombre = id => usuarios[id] ? SRP.util.nombreCompleto(usuarios[id]) : id;
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
    /* Vehículos del catálogo (D162): cada cabo usa casi siempre uno o dos, y de vez en cuando otro,
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
        const t = SRP.derivacion.derivar(lat, lng);
        if (!t.alcaldia) continue;
        const idj = 'demo-j-' + String(++nj).padStart(5, '0');
        const abierta = forzada;
        // Los programas sin consumir azar de más, para que la demostración salga siempre igual
        const programa = programaFijo || (t.alcaldia === 'Cuauhtémoc' && r() < 0.5 ? 'p-centro'
          : nj % 10 === 3 ? 'p-palmeras' : nj % 10 === 7 ? 'p-compensaciones' : 'p-refor');
        const n = forzada && d === hoy ? 3 + Math.floor(r() * 5) : 5 + Math.floor(r() * 18);
        const inicio = hora(d, 8, Math.floor(r() * 50));
        // Quien corrige: su coordinación; si no tiene (fuera, o quien coordina), la propia persona (sin consumir azar de más)
        const coord = ((usuarios[cabo] || {}).coordinadores_ids || [])[0] || (externa || (usuarios[cabo] || {}).perfil === 'COORDINADOR' ? cabo : 'u-coord-1');
        const regs = [];
        let minuto = 0;
        for (let i = 0; i < n; i++) {
          // Alrededor del sitio, a menos de ~70 m; de vez en cuando uno lejos (un error de captura)
          const lejos = !abierta && r() < 0.025 && i === n - 1;
          const radio = lejos ? 0.0035 : 0.0006;
          const la = lat + (r() - 0.5) * radio * 2, lo = lng + (r() - 0.5) * radio * 2;
          const ta = SRP.derivacion.derivar(la, lo);
          const x = r();
          const origen = x < 0.85 ? 'gps' : x < 0.95 ? 'mapa' : 'manual';
          const prec = origen === 'gps' ? (r() < 0.03 ? 32 + Math.floor(r() * 25) : 3 + Math.floor(r() * 18)) : null;
          minuto += 6 + Math.floor(r() * 12);
          const reg = hora(d, 8 + Math.floor(minuto / 60), minuto % 60);
          const id = 'demo-a-' + String(++na).padStart(6, '0');
          const a = { id, estatus: 'activo', cabo_id: cabo, lat: +la.toFixed(6), lng: +lo.toFixed(6), punto_origen: origen, gps_precision_m: prec,
            folio: null,
            especie_id: especie(), especie_otra: '',
            alcaldia_cve: ta.alcaldia_cve, alcaldia: ta.alcaldia, colonia_cve: ta.colonia_cve, colonia: ta.colonia, uga: ta.uga, uga_borde_m: ta.uga_borde_m, capa_version: ta.capa_version,
            programa_id: programa, fecha_plantacion: d, jornada_id: idj, comentarios: r() < 0.06 ? pick(['Junto a la banqueta.', 'Cerca de luminaria.', 'Cepa de 60 × 60 cm.', 'Con tutor.']) : '',
            foto_base64: null, foto_id: null, fecha_registro: reg, fecha_ultima_edicion: null, editado_por_id: null,
            sustituye_id: null, motivo_sustitucion: null, motivo_sustitucion_otro: '', sustituido_por_id: null };
          // Un posible duplicado: la misma especie a un par de metros del anterior
          if (!abierta && i > 0 && r() < 0.012) { const o = regs[i - 1]; Object.assign(a, { especie_id: o.especie_id, lat: +(o.lat + 0.00001).toFixed(6), lng: o.lng }); }
          regs.push(a);
          bit('CREADO', 'plantacion', id, reg, cabo);
        }
        const fin = regs.length ? regs[regs.length - 1].fecha_registro : inicio;
        const flag = SRP.jornadas.avisos({ registros: regs });
        const revisar = Object.keys(flag);
        const viejo = I.sumarDias(hoy, -7) > d;
        const conReporte = !abierta && r() < (viejo ? 0.92 : 0.5);
        /* De fuera de la Secretaría no se piden personal, chófer ni vehículo. El personal se sortea igual
           y en el mismo orden, y se descarta: así la demostración sale siempre igual */
        const veh = conReporte && !externa ? vehiculoDe(cabo) : null;
        const soloSedema = v => externa ? '' : v;
        const j = { id: idj, nombre: pick(this.SITIOS) + ' · ' + titulo(t.colonia || alc), ubicacion: r() < 0.3 ? pick(['Frente al mercado', 'Entre las calles principales', 'Lado oriente', 'Junto a la escuela']) : '',
          programa_id: programa, lat: +lat.toFixed(6), lng: +lng.toFixed(6), punto_origen: 'gps', gps_precision_m: 10,
          alcaldia_cve: t.alcaldia_cve, alcaldia: t.alcaldia, colonia_cve: t.colonia_cve, colonia: t.colonia, fecha: d, comentarios: r() < 0.15 ? 'Plantación con participación vecinal.' : '',
          cabo_id: cabo, organizacion_id: (usuarios[cabo] && usuarios[cabo].organizacion_id) || SRP.CONFIG.ORGANIZACION_SEDEMA,
          estatus: abierta ? 'abierta' : 'cerrada', fecha_inicio: inicio, fecha_cierre: abierta ? null : new Date(new Date(fin).getTime() + 25 * 60000).toISOString(),
          encargado_id: cabo, relevo_id: null, relevos: [], editado_por_id: null, fecha_ultima_edicion: null,
          // Una de cada siete jornadas de la Secretaría es un pedido especial; sin sortear, para no mover el resto de la demostración
          ...(externa || nj % 7 ? SRP.pedido.vacio() : this.PEDIDOS[(nj / 7) % this.PEDIDOS.length]),
          arboles_previstos: Math.max(1, n + (r() < 0.6 ? 0 : r() < 0.75 ? 1 + Math.floor(r() * 4) : -1 - Math.floor(r() * 2))),
          puntos_revisados: !abierta && r() < 0.85 ? revisar : [], reporte_en: conReporte ? new Date(new Date(fin).getTime() + 90 * 60000).toISOString() : null, carga_id: null,
          personal: soloSedema(conReporte ? Array.from({ length: 3 + Math.floor(r() * 4) }, () => pick(this.PERSONAL)).filter((x, i, l) => l.indexOf(x) === i).join('\n') : ''),
          apoyo: soloSedema(conReporte && r() < 0.3 ? pick(this.PERSONAL) : ''), observaciones: conReporte && r() < 0.25 ? pick(this.OBSERVACIONES) : '',
          chofer: conReporte && !externa ? pick(this.PERSONAL) : '', vehiculo_id: veh ? veh.id : null, vehiculo_placa: veh ? veh.nombre : '', vehiculo_modelo: veh ? veh.modelo : '', vehiculo_tipo: veh ? veh.tipo_vehiculo : '',
          hora: conReporte ? '13:' + String(Math.floor(r() * 6) * 10).padStart(2, '0') : '' };
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
    r = principal;
    // Folios y envío: lo anterior a hoy ya salió; lo de hoy espera, como en campo (D110, D111)
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

  /* ---------- Cargar y quitar ---------- */

  // Carga (o vuelve a cargar) los datos de demostración. Antes quita los que hubiera
  async cargar(avance) {
    if (!SRP.CONFIG.ES_FICTICIO || this.cargando) return null;
    this.cargando = true;
    try {
      await this.quitar();
      const d = await this.generar(avance);
      if (avance) avance(0.9);
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
     suyo, la cuenta con que se capturó y la coordinación de esa cuenta. De la jornada conservada
     se quitan sus árboles de demostración; queda con los propios. */
  async quitar() {
    const d = {};
    await Promise.all(this.ALMACENES.map(async n => { d[n] = await SRP.almacen.todos(n); }));
    const conservar = new Set();
    const guardar = (...ids) => ids.forEach(id => { if (this.es(id)) conservar.add(id); });
    d.plantaciones.filter(a => !this.es(a.id)).forEach(a => guardar(a.jornada_id, a.cabo_id));
    d.jornadas.filter(j => !this.es(j.id)).forEach(j => guardar(j.cabo_id, j.encargado_id));
    d.usuarios.filter(u => !this.es(u.id)).forEach(u => guardar(...(u.coordinadores_ids || [])));
    d.jornadas.filter(j => conservar.has(j.id)).forEach(j => guardar(j.cabo_id));
    d.usuarios.filter(u => conservar.has(u.id)).forEach(u => guardar(...(u.coordinadores_ids || [])));
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

  /* ---------- Los botones del pie ---------- */

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
      : 'Casi tres años de jornadas inventadas (2024 a hoy), de la Secretaría y de una institución de cada tipo —alcaldías, Gobierno de la CDMX, empresas y organizaciones civiles—, con cabos y coordinaciones de todas y los cuatro programas, para probar Supervisión, Mi avance y los informes. No tocan lo que usted capture.';
    const cargar = this.el('btn-demo-cargar');
    cargar.querySelector('span').textContent = hay ? 'Volver a cargar' : this.huboAntes() ? 'Recuperar datos de demostración' : 'Cargar datos de demostración';
    cargar.disabled = this.cargando;
    this.el('btn-demo-quitar').disabled = !hay || this.cargando;
  },
  huboAntes() { try { return localStorage.getItem('srp_demo_quitados') === '1'; } catch (e) { return false; } },

  async alCargar() {
    const ok = await SRP.app.confirmar({ titulo: 'Datos de demostración', pregunta: '¿Cargar casi tres años de datos inventados en este dispositivo?',
      puntosTitulo: 'Qué pasa:', puntos: ['Se agregan más de 1,300 jornadas y más de 17,000 árboles, de enero de 2024 a hoy, de cabos y coordinaciones de la Secretaría y de otras instituciones: alcaldías, Gobierno de la CDMX, empresas y organizaciones civiles.',
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
      SRP.util.anunciar('Datos de demostración cargados: ' + res.jornadas.toLocaleString('es-MX') + ' jornadas y ' + res.arboles.toLocaleString('es-MX') +
        ' árboles. Con «Cambiar usuario (pruebas)», en el menú de la cuenta, puede entrar como uno de sus cabos o coordinaciones.', 'exito');
      await this.refrescar();
    } finally { libre(); await this.pintar(); }
  },

  async alQuitar() {
    const c = await this.contar();
    const ok = await SRP.app.confirmar({ titulo: 'Quitar los datos de demostración', pregunta: '¿Quitar los datos de demostración de este dispositivo?',
      puntosTitulo: 'Qué pasa:', puntos: ['Se quitan ' + c.jornadas.toLocaleString('es-MX') + ' jornadas, ' + c.arboles.toLocaleString('es-MX') + ' árboles y las ' + c.cuentas + ' cuentas de demostración.',
        'Lo que usted capturó se queda.', 'Se pueden volver a cargar iguales con «Recuperar datos de demostración».'], boton: 'Quitar', icono: 'basura' });
    if (!ok) return;
    const libre = SRP.util.ocupado(this.el('btn-demo-quitar'), 'Quitando…', 'reloj');
    this.el('btn-demo-cargar').disabled = true;
    try {
      const u = SRP.sesion.usuario;
      const res = await this.quitar();
      try { localStorage.setItem('srp_demo_quitados', '1'); } catch (e) { /* sin persistencia */ }
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

// Si algo falla al cargar o quitar, se dice qué no se pudo hacer (D149)
SRP.util.proteger(SRP.demo, { alCargar: 'cargar los datos de demostración', alQuitar: 'quitar los datos de demostración' });
