/* CARGA DE DATOS EN EL ESQUEMA srp.

   Uso:  npm run cargar -- <orden> [<orden>…]

   capas      Las cuatro capas territoriales, de assets/capas/ (las mismas de la aplicación). Se
              reemplazan completas. También en los servidores del SIA, después de instalar.
   especies   El catálogo de especies, de assets/catalogos/catalogo-especies.js. Agrega las que falten;
              no toca las que ya están. También en el SIA.
   vehiculos  La lista de vehículos de un CSV con columnas placa, modelo y tipo (por omisión, el más
              reciente originales/vehiculos_reales_*.csv). La lista real nunca entra al repositorio.
   app        Lo que exportó herramientas/exportar_datos_app.py (servidor/local/datos-app.json): cuentas
              de prueba, catálogos de arranque y los datos de demostración. SÓLO EN LA BASE LOCAL.
   todo       capas, especies, vehiculos y app, los que tengan su archivo.
   rehacer    SÓLO EN LA BASE LOCAL: destruye el esquema, lo instala y carga todo.

   Las capas y las especies las carga la cuenta propietaria; lo de la aplicación entra con la cuenta
   del servicio, como llegará de los teléfonos, en una sola transacción. */
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import crypto from 'node:crypto';
import { conectar, instalar, destruir, RAIZ, SERVIDOR } from './bd.js';

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

// ---------- Capas ----------
const CAPAS = {
  alcaldias: { tabla: 'capa_alcaldias', campos: "f->'properties'->>'cvegeo', f->'properties'->>'nombre', f->'properties'->>'clave'", columnas: 'cvegeo, nombre, clave' },
  colonias: { tabla: 'capa_colonias', campos: "f->'properties'->>'clave', f->'properties'->>'nombre'", columnas: 'clave, nombre' },
  uga: { tabla: 'capa_uga', campos: "f->'properties'->>'clave'", columnas: 'clave' },
  prioritarias: { tabla: 'capa_prioritarias', campos: "(f->'properties'->>'id')::int, f->'properties'->>'colonia', f->'properties'->>'alcaldia', (f->'properties'->>'prioridad')::smallint", columnas: 'id, colonia, alcaldia, prioridad' }
};

async function cargarCapas(c) {
  await c.query('BEGIN');
  await c.query('SET LOCAL ROLE srp_propietario');
  for (const [nombre, d] of Object.entries(CAPAS)) {
    const capa = delaApp(`assets/capas/capa-${nombre}.js`).CAPAS[nombre];
    await c.query(`DELETE FROM srp.${d.tabla}`);
    await c.query(`INSERT INTO srp.${d.tabla} (${d.columnas}, orden, geom)
      SELECT ${d.campos}, t.orden::int, ST_Multi(ST_SetSRID(ST_GeomFromGeoJSON(f->>'geometry'), 4326))
        FROM jsonb_array_elements($1::jsonb) WITH ORDINALITY AS t(f, orden)`, [JSON.stringify(capa.geojson.features)]);
    await c.query(`INSERT INTO srp.capas (nombre, version, fecha_corte, origen, elementos) VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (nombre) DO UPDATE SET version = EXCLUDED.version, fecha_corte = EXCLUDED.fecha_corte, origen = EXCLUDED.origen,
        elementos = EXCLUDED.elementos, cargada_en = now()`,
      [nombre, capa.meta.version, String(capa.meta.fecha_corte), capa.meta.origen, capa.geojson.features.length]);
    console.log(`capa ${nombre}: ${await contar(c, d.tabla)} polígonos, versión ${capa.meta.version}`);
  }
  await c.query('COMMIT');
}

// ---------- Especies ----------
async function cargarEspecies(c) {
  const especies = delaApp('assets/catalogos/catalogo-especies.js').CATALOGO_ESPECIES.especies;
  await c.query('BEGIN');
  await c.query('SET LOCAL ROLE srp_propietario');
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
  await c.query('SET LOCAL ROLE srp_propietario');
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
  await c.query('GRANT srp_servicio TO CURRENT_USER WITH INHERIT FALSE, SET TRUE');
  await c.query('BEGIN');
  try {
    await c.query('SET LOCAL ROLE srp_servicio');
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
    await c.query('REVOKE srp_servicio FROM CURRENT_USER');
  }
  console.log(`datos de la aplicación exportados el ${exportado_en}: cargados`);
}

// ---------- Órdenes ----------
async function principal(ordenes) {
  if (!ordenes.length) { console.log(fs.readFileSync(new URL(import.meta.url), 'utf8').match(/\/\* CARGA[\s\S]*?\*\//)[0]); return; }
  const c = await conectar();
  try {
    for (const o of ordenes) {
      if (o === 'rehacer') { await destruir(c); await instalar(c); console.log('esquema srp instalado de nuevo'); await principal.todo(c); }
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
