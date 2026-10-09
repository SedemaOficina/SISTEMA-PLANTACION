/* CARGA DE DATOS EN EL ESQUEMA srp.

   Uso:  npm run cargar -- <orden> [<orden>…]

   territorio SÓLO EN LA BASE LOCAL: la réplica de territorio (alcaldías, malla UGA y colonias del IECM),
              de assets/capas/, las mismas capas de la aplicación. En el SIA territorio ya existe y
              es del SIA: si encuentra capas que no cargó el SRP, no toca nada.
   capas      La capa propia del SRP, las colonias prioritarias, de assets/capas/. Se reemplaza
              completa. También en los servidores del SIA, después de instalar.
   especies   El catálogo de especies, de assets/catalogos/catalogo-especies.js. Agrega las que falten;
              no toca las que ya están. También en el SIA.
   vehiculos  La lista de vehículos de un CSV con columnas placa, modelo y tipo (por omisión, el más
              reciente originales/vehiculos_reales_*.csv). La lista real nunca entra al repositorio.
   app        Lo que exportó herramientas/exportar_datos_app.py (servidor/local/datos-app.json): cuentas
              de prueba, catálogos de arranque y los datos de demostración. SÓLO EN LA BASE LOCAL.
   todo       capas, especies, vehiculos y app, los que tengan su archivo.
   rehacer    SÓLO EN LA BASE LOCAL: destruye el esquema, lo instala y carga territorio y todo.

   Las capas y las especies las carga quien administra la base; lo de la aplicación entra con la cuenta
   del servicio, srp_api, como llegará de los teléfonos, en una sola transacción. */
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import crypto from 'node:crypto';
import { conectar, instalar, destruir, prepararTerritorio, RAIZ, SERVIDOR } from './bd.js';

const ESQUEMA = JSON.parse(fs.readFileSync(path.join(RAIZ, 'datos', 'esquema.json'), 'utf8'));
const APP_JSON = path.join(SERVIDOR, 'local', 'datos-app.json');
const LOTE = 2000;

// Un archivo de la aplicación (window.SRP = …) leído fuera del navegador
function delaApp(relativo) {
  const ctx = {};
  ctx.window = ctx;
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(path.join(RAIZ, relativo), 'utf8'), ctx, { filename: relativo });
  return ctx.SRP;
}

// Inserta renglones con los mismos nombres de campo que la tabla, por lotes
async function insertar(c, tabla, filas, conflicto = '') {
  for (let i = 0; i < filas.length; i += LOTE) {
    await c.query(`INSERT INTO srp.${tabla} SELECT * FROM jsonb_populate_recordset(NULL::srp.${tabla}, $1::jsonb) ${conflicto}`,
      [JSON.stringify(filas.slice(i, i + LOTE))]);
  }
}

async function contar(c, tabla) {
  return (await c.query(`SELECT count(*)::int AS n FROM srp.${tabla}`)).rows[0].n;
}

// ---------- Réplica local de territorio ----------
const CAPAS_TERRITORIO = ['alcaldia', 'malla_uga_1km', 'colonias_iecm_2022'];
const FUENTE_LOCAL = 'Réplica local del SRP, de assets/capas/';

const geomDe = "ST_Multi(ST_SetSRID(ST_GeomFromGeoJSON(f->>'geometry'), 4326))";

async function cargarTerritorio(c) {
  const ajenas = (await c.query('SELECT count(*)::int AS n FROM territorio.version_capa WHERE fuente <> $1', [FUENTE_LOCAL])).rows[0].n;
  if (ajenas) throw new Error('territorio tiene capas que no cargó el SRP: es el del SIA y no se toca');
  const leer = (n) => delaApp(`assets/capas/capa-${n}.js`).CAPAS[n];
  const alc = leer('alcaldias'), uga = leer('uga'), col = leer('colonias');
  await c.query('BEGIN');
  await c.query('DELETE FROM territorio.alcaldia; DELETE FROM territorio.malla_uga_1km; DELETE FROM territorio.colonias_iecm_2022');
  await c.query(`INSERT INTO territorio.alcaldia (cve_alcaldia, cve_ut_prefijo, nombre, cvegeo, geom)
    SELECT right(f->'properties'->>'cvegeo', 3), lpad(ltrim(right(f->'properties'->>'cvegeo', 3), '0'), 2, '0'),
           f->'properties'->>'nombre', f->'properties'->>'cvegeo', ${geomDe}
      FROM jsonb_array_elements($1::jsonb) AS t(f)`, [JSON.stringify(alc.geojson.features)]);
  // La malla del SIA guarda polígonos sencillos: cada celda es un solo hexágono
  await c.query(`INSERT INTO territorio.malla_uga_1km (clave, cve_alcaldia_3, consecutivo, geom, version)
    SELECT f->'properties'->>'clave', split_part(f->'properties'->>'clave', '-', 1), split_part(f->'properties'->>'clave', '-', 2),
           ST_GeometryN(${geomDe}, 1), $2
      FROM jsonb_array_elements($1::jsonb) AS t(f)`, [JSON.stringify(uga.geojson.features), uga.meta.version]);
  await c.query(`INSERT INTO territorio.colonias_iecm_2022 (id, cveut, ut, geom)
    SELECT t.n::int, f->'properties'->>'clave', f->'properties'->>'nombre', ${geomDe}
      FROM jsonb_array_elements($1::jsonb) WITH ORDINALITY AS t(f, n)`, [JSON.stringify(col.geojson.features)]);
  await c.query('DELETE FROM territorio.version_capa WHERE capa = ANY($1)', [CAPAS_TERRITORIO]);
  for (const [capa, d] of [['alcaldia', alc], ['malla_uga_1km', uga], ['colonias_iecm_2022', col]]) {
    await c.query(`INSERT INTO territorio.version_capa (capa, version, fuente, filas, nota) VALUES ($1, $2, $3, $4, $5)`,
      [capa, d.meta.version, FUENTE_LOCAL, d.geojson.features.length, d.meta.origen]);
    console.log(`territorio.${capa}: ${d.geojson.features.length} polígonos, versión ${d.meta.version}`);
  }
  await c.query('COMMIT');
}

// ---------- Capa propia: colonias prioritarias ----------
async function cargarCapas(c) {
  const capa = delaApp('assets/capas/capa-prioritarias.js').CAPAS.prioritarias;
  await c.query('BEGIN');
  await c.query('DELETE FROM srp.capa_prioritarias');
  await c.query(`INSERT INTO srp.capa_prioritarias (id, colonia, alcaldia, prioridad, geom)
    SELECT (f->'properties'->>'id')::int, f->'properties'->>'colonia', f->'properties'->>'alcaldia',
           (f->'properties'->>'prioridad')::smallint, ${geomDe}
      FROM jsonb_array_elements($1::jsonb) AS t(f)`, [JSON.stringify(capa.geojson.features)]);
  await c.query(`INSERT INTO srp.capas (nombre, version, fecha_corte, origen, elementos) VALUES ('prioritarias', $1, $2, $3, $4)
    ON CONFLICT (nombre) DO UPDATE SET version = EXCLUDED.version, fecha_corte = EXCLUDED.fecha_corte, origen = EXCLUDED.origen,
      elementos = EXCLUDED.elementos, cargada_en = now()`,
    [capa.meta.version, String(capa.meta.fecha_corte), capa.meta.origen, capa.geojson.features.length]);
  console.log(`capa prioritarias: ${await contar(c, 'capa_prioritarias')} polígonos, versión ${capa.meta.version}`);
  await c.query('COMMIT');
}

// ---------- Especies ----------
async function cargarEspecies(c) {
  const especies = delaApp('assets/catalogos/catalogo-especies.js').CATALOGO_ESPECIES.especies;
  await c.query('BEGIN');
  await insertar(c, 'especies', especies, 'ON CONFLICT (id) DO NOTHING');
  console.log(`especies: ${await contar(c, 'especies')} en la base (${especies.length} en el catálogo)`);
  await c.query('COMMIT');
}

// ---------- Vehículos ----------
function csvMasReciente() {
  const dir = path.join(RAIZ, 'originales');
  if (!fs.existsSync(dir)) return null;
  const f = fs.readdirSync(dir).filter(n => /^vehiculos_reales_.*\.csv$/.test(n)).sort().pop();
  return f ? path.join(dir, f) : null;
}

// Una lista sencilla en CSV: comas, comillas dobles opcionales y la primera fila de encabezados
function leerCsv(archivo) {
  const renglones = fs.readFileSync(archivo, 'utf8').replace(/^﻿/, '').split(/\r?\n/).filter(r => r.trim());
  const partir = r => [...r.matchAll(/("([^"]|"")*"|[^,]*)(,|$)/g)].map(m => m[1].replace(/^"|"$/g, '').replace(/""/g, '"').trim()).slice(0, -1);
  const enc = partir(renglones[0]);
  return renglones.slice(1).map(r => Object.fromEntries(partir(r).map((v, i) => [enc[i], v])));
}

const clavePlaca = (placa) => String(placa || '').toUpperCase().replace(/[^A-Z0-9]/g, '');

async function cargarVehiculos(c, archivo) {
  const ahora = new Date().toISOString();
  const filas = leerCsv(archivo).map(v => ({
    id: 'v-' + clavePlaca(v.placa), clave: clavePlaca(v.placa), nombre: v.placa.toUpperCase(), activo: true,
    creado_por_id: null, fecha_creacion: ahora, editado_por_id: null, fecha_ultima_edicion: null, modelo: v.modelo, tipo_vehiculo: v.tipo
  }));
  await c.query('BEGIN');
  await insertar(c, 'vehiculos', filas, 'ON CONFLICT (id) DO NOTHING');
  console.log(`vehículos: ${await contar(c, 'vehiculos')} en la base (${filas.length} en ${path.basename(archivo)})`);
  await c.query('COMMIT');
}

// ---------- Lo exportado de la aplicación ----------
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

/* Las cuentas de prueba (u-admin-1) y los datos de demostración (u-demo-…, demo-…) no usan UUID, que es
   lo que guarda el servidor. Cada identificador así toma un UUID fijo derivado de él: el mismo en cada
   carga y en todas las referencias. Los que ya son UUID no cambian. */
function uuidDe(v) {
  if (v == null || v === '' || UUID.test(v)) return v === '' ? null : v;
  const h = crypto.createHash('sha1').update('srp:' + v).digest('hex');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-5${h.slice(13, 16)}-${(8 + (parseInt(h[16], 16) & 3)).toString(16)}${h.slice(17, 20)}-${h.slice(20, 32)}`;
}

function adaptar(tabla, fila, mapaVehiculos) {
  const n = Object.assign({}, fila);
  for (const campo of ESQUEMA.tablas[tabla].campos) {
    const v = n[campo.campo];
    if (campo.tipo === 'uuid') n[campo.campo] = uuidDe(v);
    else if (campo.tipo === 'uuid[]') n[campo.campo] = (v || []).map(uuidDe);
  }
  if (tabla === 'jornadas') {
    n.relevos = (n.relevos || []).map(r => Object.assign({}, r, { cabo_id: uuidDe(r.cabo_id), por_id: uuidDe(r.por_id) }));
    const real = n.vehiculo_id && mapaVehiculos[n.vehiculo_id];
    if (real) Object.assign(n, { vehiculo_id: real.id, vehiculo_placa: real.nombre, vehiculo_modelo: real.modelo, vehiculo_tipo: real.tipo_vehiculo });
  }
  if (tabla === 'bitacora' && ['plantacion', 'usuario', 'jornada', 'carga'].includes(n.entidad)) n.entidad_id = uuidDe(n.entidad_id);
  return n;
}

async function cargarApp(c, archivo) {
  const { tablas, exportado_en } = JSON.parse(fs.readFileSync(archivo, 'utf8'));
  await c.query('GRANT srp_api TO CURRENT_USER WITH INHERIT FALSE, SET TRUE');
  await c.query('BEGIN');
  try {
    await c.query('SET LOCAL ROLE srp_api');
    await c.query('SET CONSTRAINTS ALL DEFERRED');
    // Si ya están los vehículos reales, los de prueba de la aplicación se cambian por ellos, uno por uno
    const reales = (await c.query("SELECT id, nombre, modelo, tipo_vehiculo FROM srp.vehiculos WHERE id NOT LIKE 'v-PRU%' ORDER BY clave")).rows;
    const prueba = tablas.vehiculos.slice().sort((a, b) => a.clave.localeCompare(b.clave));
    const mapaVehiculos = reales.length ? Object.fromEntries(prueba.map((v, i) => [v.id, reales[i % reales.length]])) : {};
    const orden = ['instituciones', 'areas', 'programas', 'solicitantes', 'vehiculos', 'usuarios', 'jornadas', 'plantaciones', 'bitacora'];
    for (const t of orden) {
      if (t === 'vehiculos' && reales.length) continue;
      const filas = tablas[t].map(f => adaptar(t, f, mapaVehiculos));
      await insertar(c, t, filas, ESQUEMA.tablas[t].campos.some(x => x.campo === 'clave') ? 'ON CONFLICT (id) DO NOTHING' : '');
      console.log(`${t}: ${filas.length}`);
    }
    await c.query('COMMIT');
  } catch (e) {
    await c.query('ROLLBACK');
    throw e;
  } finally {
    await c.query('REVOKE srp_api FROM CURRENT_USER');
  }
  console.log(`datos de la aplicación exportados el ${exportado_en}: cargados`);
}

// ---------- Órdenes ----------
async function principal(ordenes) {
  if (!ordenes.length) { console.log(fs.readFileSync(new URL(import.meta.url), 'utf8').match(/\/\* CARGA[\s\S]*?\*\//)[0]); return; }
  const c = await conectar();
  try {
    for (const o of ordenes) {
      if (o === 'rehacer') { await destruir(c); await instalar(c); console.log('esquema srp instalado de nuevo'); await cargarTerritorio(c); await principal.todo(c); }
      else if (o === 'territorio') { await prepararTerritorio(c); await cargarTerritorio(c); }
      else if (o === 'todo') await principal.todo(c);
      else if (o === 'capas') await cargarCapas(c);
      else if (o === 'especies') await cargarEspecies(c);
      else if (o === 'vehiculos') { const a = csvMasReciente(); if (!a) throw new Error('No hay originales/vehiculos_reales_*.csv'); await cargarVehiculos(c, a); }
      else if (o === 'app') { if (!fs.existsSync(APP_JSON)) throw new Error('Falta ' + APP_JSON + ': correr herramientas/exportar_datos_app.py'); await cargarApp(c, APP_JSON); }
      else throw new Error('Orden desconocida: ' + o);
    }
  } finally {
    await c.end();
  }
}
principal.todo = async (c) => {
  await cargarCapas(c);
  await cargarEspecies(c);
  const csv = csvMasReciente();
  if (csv) await cargarVehiculos(c, csv); else console.log('vehículos: sin lista real en originales/; se usan los de la aplicación');
  if (fs.existsSync(APP_JSON)) await cargarApp(c, APP_JSON); else console.log('datos de la aplicación: no hay exportación; se omiten');
};

principal(process.argv.slice(2)).catch(e => { console.error('Error:', e.message, e.detail || ''); process.exit(1); });
