/* CARGA MASIVA: un lote llega en tandas, cada árbol con su folio, y nada se ve hasta completarlo; cada jornada se
   ubica en el centro de sus árboles. El servidor revisa cada renglón con las reglas de la aplicación y, si uno no
   pasa, no guarda nada de la tanda. Deshacer un lote lo oculta y elimina sus árboles sin borrar nada, y el archivo
   se puede volver a cargar. Sólo la Administración global. Crea sus cuentas, su institución y su programa, y al
   terminar quita todo lo que cargó. */
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { conectar, limpiar } from './apoyo.js';
import { leerConfig, crearGrupo, crearApp, derivar } from '../dist/independiente.js';

const CORRIDA = Date.now();
const CLAVE = 'Carga de prueba 2026';
const uuid = () => crypto.randomUUID();
const cuenta = (nombre, perfil) => ({ id: uuid(), nombre, perfil, correo: nombre + '.carga.prueba.' + CORRIDA + '@ejemplo.local' });
const ADMIN = cuenta('admin', 'ADMIN'), CABO = cuenta('cabo', 'CABO');
const INST = 'o-prueba-carga-' + CORRIDA, PROG = 'p-prueba-carga-' + CORRIDA;
const HOY = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Mexico_City' }).format(new Date());
const FECHA = '2025-03-14';
// Puntos propios de esta corrida, en la Ciudad, para no empatar con lo que ya hay
const BASE_LAT = 19.40 + (CORRIDA % 1000) / 100000, BASE_LNG = -99.15;
const punto = (i) => ({ lat: +(BASE_LAT + i * 0.00002).toFixed(6), lng: +(BASE_LNG - i * 0.00002).toFixed(6) });

let admin, grupo, servidor, base, ESPECIE;

before(async () => {
  admin = await conectar();
  await admin.query('GRANT srp_api TO CURRENT_USER WITH INHERIT FALSE, SET TRUE');
  ESPECIE = (await admin.query('SELECT id FROM srp.especies WHERE activo ORDER BY id LIMIT 1')).rows[0].id;
  await admin.query('BEGIN');
  await admin.query(`INSERT INTO srp.instituciones VALUES ('o-sedema', 'SEDEMA', 'Secretaría del Medio Ambiente', true, NULL, now(), NULL, NULL, 'Gobierno de la CDMX') ON CONFLICT DO NOTHING`);
  await admin.query(`INSERT INTO srp.instituciones VALUES ($1, $2, $3, true, NULL, now(), NULL, NULL, 'Empresa privada')`, [INST, 'PRUEBA_CARGA_' + CORRIDA, 'Empresa de prueba de carga ' + CORRIDA]);
  await admin.query(`INSERT INTO srp.areas VALUES ('a-sia', 'SIA', 'Sistema de Información Ambiental', true, NULL, now(), NULL, NULL) ON CONFLICT DO NOTHING`);
  await admin.query(`INSERT INTO srp.programas VALUES ($1, $2, $3, true, NULL, now(), NULL, NULL, '{}')`, [PROG, 'PRUEBA_CARGA_' + CORRIDA, 'Programa de prueba de carga ' + CORRIDA]);
  const derivada = await derivar(CLAVE);
  for (const u of [ADMIN, CABO]) {
    await admin.query(`INSERT INTO srp.usuarios VALUES ($1, $2, $3, 'o-sedema', 'a-sia', $4, $4, true, now(), $1, NULL, NULL)`, [u.id, u.correo, 'Prueba ' + u.nombre, u.perfil]);
    await admin.query(`INSERT INTO srp.credenciales VALUES ($1, $2, false, NULL, 0, NULL, now(), $1)`, [u.id, derivada]);
  }
  await admin.query('COMMIT');
  grupo = crearGrupo({ rol: 'srp_api' });
  const config = leerConfig({ SRP_COOKIE_SEGURA: 'no' });
  servidor = crearApp({ pool: grupo, config, proxy: 0 }).listen(0);
  await new Promise((r) => servidor.once('listening', r));
  base = 'http://127.0.0.1:' + servidor.address().port + config.ruta;
});

after(async () => {
  servidor && servidor.close();
  grupo && await grupo.end();
  const ids = [ADMIN.id, CABO.id];
  await limpiar(admin, async () => {
    const jornadas = (await admin.query('SELECT id FROM srp.jornadas WHERE cabo_id = ANY($1::uuid[])', [ids])).rows.map((r) => r.id);
    const arboles = (await admin.query('SELECT id FROM srp.plantaciones WHERE jornada_id = ANY($1::uuid[])', [jornadas])).rows.map((r) => r.id);
    await admin.query('ALTER TABLE srp.folios DISABLE TRIGGER folios_inmutables');
    await admin.query('DELETE FROM srp.folios WHERE plantacion_id = ANY($1::uuid[])', [arboles]);
    await admin.query('ALTER TABLE srp.folios ENABLE TRIGGER folios_inmutables');
    await admin.query('DELETE FROM srp.plantaciones WHERE id = ANY($1::uuid[])', [arboles]);
    await admin.query('DELETE FROM srp.jornadas WHERE id = ANY($1::uuid[])', [jornadas]);
    await admin.query('DELETE FROM srp.cargas WHERE creada_por_id = ANY($1::uuid[])', [ids]);
    for (const t of ['bitacora', 'bitacora_acceso']) await admin.query(`ALTER TABLE srp.${t} DISABLE TRIGGER bitacora_inmutable`);
    await admin.query('DELETE FROM srp.bitacora WHERE usuario_id = ANY($1::uuid[])', [ids]);
    await admin.query('DELETE FROM srp.bitacora_acceso WHERE usuario_id = ANY($1::uuid[])', [ids]);
    for (const t of ['bitacora', 'bitacora_acceso']) await admin.query(`ALTER TABLE srp.${t} ENABLE TRIGGER bitacora_inmutable`);
    await admin.query('DELETE FROM srp.usuarios WHERE id = ANY($1::uuid[])', [ids]);
    await admin.query('DELETE FROM srp.programas WHERE id = $1', [PROG]);
    await admin.query('DELETE FROM srp.instituciones WHERE id = $1', [INST]);
  });
});

async function sesion(u) {
  const r = await fetch(base + '/acceso/entrar', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ correo: u.correo, contrasena: CLAVE }) });
  assert.equal(r.status, 200);
  const cookie = (r.headers.get('set-cookie') || '').split(';')[0];
  return async (metodo, ruta, cuerpo) => {
    const x = await fetch(base + ruta, { method: metodo, headers: { cookie, 'content-type': 'application/json' }, body: cuerpo && JSON.stringify(cuerpo) });
    return { estado: x.status, datos: await x.json() };
  };
}

// Una jornada del archivo y sus árboles, como los arma la aplicación
const jornada = (extra = {}) => ({ id: uuid(), organizacion_id: INST, programa_id: PROG, fecha: FECHA, ...extra });
const arbol = (j, i, renglon, extra = {}) => ({ id: uuid(), jornada_id: j.id, renglon, ...punto(i), especie_id: ESPECIE, fecha_plantacion: j.fecha, revisado: false, ...extra });
// ¿Se ve en la consulta de jornadas? Página por página, como la aplicación
async function seVe(adm, id) {
  let despues = null;
  do {
    const r = await adm('GET', '/jornadas?limite=2000' + (despues ? '&despues=' + despues : ''));
    if (r.datos.filas.some((j) => j.id === id)) return true;
    despues = r.datos.siguiente;
  } while (despues);
  return false;
}

let L1, J1, J2, ARBOLES1 = [];

test('un lote llega en tandas: cada árbol con su folio, y nada se ve hasta completarlo', async () => {
  const adm = await sesion(ADMIN);
  L1 = uuid(); J1 = jornada(); J2 = jornada({ fecha: '2025-03-15' });
  const t1 = [arbol(J1, 1, 2), arbol(J1, 2, 3, { revisado: true }), arbol(J1, 3, 4)];
  const t2 = [arbol(J1, 4, 5), arbol(J2, 5, 6), arbol(J2, 6, 7)];
  ARBOLES1 = t1.concat(t2);
  const r1 = await adm('PUT', '/cargas/' + L1 + '/tandas/1', { archivo: 'prueba.xlsx', jornadas: [J1], arboles: t1 });
  assert.deepEqual([r1.estado, r1.datos.arboles, r1.datos.folios], [200, 3, 3], JSON.stringify(r1.datos));
  // Lo que ya llegó lleva su folio, pero no se ve
  const f = (await admin.query("SELECT count(*)::int AS n FROM srp.plantaciones WHERE id = ANY($1::uuid[]) AND folio ~ '^[A-Z]{3}-\\d{3}-\\d{5}$'", [t1.map((a) => a.id)])).rows[0].n;
  assert.equal(f, 3);
  assert.equal(await seVe(adm, J1.id), false, 'mientras sube, su jornada no se ve');
  // Reenviar una tanda no la repite
  assert.equal((await adm('PUT', '/cargas/' + L1 + '/tandas/1', { archivo: 'prueba.xlsx', jornadas: [J1], arboles: t1 })).datos.repetida, true);
  const r2 = await adm('PUT', '/cargas/' + L1 + '/tandas/2', { archivo: 'prueba.xlsx', jornadas: [J2], arboles: t2 });
  assert.equal(r2.datos.arboles, 3, JSON.stringify(r2.datos));
  // Completar con la cuenta que no es dice qué falta
  const corto = await adm('POST', '/cargas/' + L1 + '/completa', { arboles: 7 });
  assert.deepEqual([corto.estado, corto.datos.codigo], [409, 'FALTAN_TANDAS']);
  const c = await adm('POST', '/cargas/' + L1 + '/completa', { arboles: 6 });
  assert.deepEqual([c.estado, c.datos.arboles, c.datos.jornadas, c.datos.instituciones], [200, 6, 2, 1], JSON.stringify(c.datos));
  assert.equal(await seVe(adm, J1.id), true, 'completo, se ve');
  // La jornada: cerrada, de la institución del archivo, a nombre de quien carga, en el centro de sus árboles
  const j = (await admin.query('SELECT estatus, organizacion_id, cabo_id, carga_id, arboles_previstos, lat::float8 AS lat, lng::float8 AS lng, puntos_revisados FROM srp.jornadas WHERE id = $1', [J1.id])).rows[0];
  const suyos = ARBOLES1.filter((a) => a.jornada_id === J1.id);
  const centro = (k) => +(suyos.reduce((s, a) => s + a[k], 0) / suyos.length).toFixed(6);
  assert.deepEqual([j.estatus, j.organizacion_id, j.cabo_id, j.carga_id, j.arboles_previstos, j.lat, j.lng, j.puntos_revisados],
    ['cerrada', INST, ADMIN.id, L1, 4, centro('lat'), centro('lng'), [t1[1].id]]);
  const bit = (await admin.query("SELECT detalle FROM srp.bitacora WHERE entidad = 'carga' AND entidad_id = $1", [L1])).rows.map((b) => b.detalle);
  assert.deepEqual(bit, ['Archivo «prueba.xlsx»: 6 árboles en 2 jornadas de 1 institución']);
  const lotes = (await adm('GET', '/cargas')).datos.filas;
  assert.deepEqual((({ estado, archivo, arboles, jornadas }) => ({ estado, archivo, arboles, jornadas }))(lotes.find((k) => k.id === L1)), { estado: 'completa', archivo: 'prueba.xlsx', arboles: 6, jornadas: 2 });
});

test('el servidor revisa cada renglón con las reglas de la aplicación; si uno no pasa, no guarda nada de la tanda', async () => {
  const adm = await sesion(ADMIN);
  const L = uuid(), J = jornada(), otra = jornada({ fecha: '2099-01-01' });
  const arboles = [
    arbol(J, 20, 2),
    arbol(J, 21, 3, { lat: 20.5, lng: -98.5 }),
    arbol(J, 22, 4, { especie_id: 'ESP-9999' }),
    arbol(J, 23, 5, { fecha_plantacion: '2025-03-16' }),
    arbol(J, 24, 6), arbol(J, 24, 7),
    { ...ARBOLES1[0], id: uuid(), jornada_id: J.id, renglon: 8 },
    arbol(J, 25, 9, { fecha_plantacion: '2024-09-30' }),
    arbol(J, 26, 10, { fecha_plantacion: '2026-13-45' })];
  const r = await adm('PUT', '/cargas/' + L + '/tandas/1', { archivo: 'errores.xlsx', jornadas: [J], arboles });
  assert.equal(r.estado, 400);
  const por = Object.fromEntries(r.datos.errores.map(([donde, que]) => [donde, que]));
  assert.match(por['Renglón 3 · Latitud y longitud'], /fuera de la Ciudad de México/);
  assert.match(por['Renglón 4 · Nombre científico'], /no está en el catálogo/);
  assert.match(por['Renglón 5 · Fecha de plantación'], /No es la fecha de su jornada/);
  assert.match(por['Renglón 7 · Renglón'], /Repite otro renglón/);
  assert.match(por['Renglón 8 · Renglón'], /Ya está en el sistema/);
  assert.equal(por['Renglón 9 · Fecha de plantación'], 'La fecha no puede ser anterior al 01-OCT-2024, cuando empezó el programa.');
  assert.equal(por['Renglón 10 · Fecha de plantación'], 'Fecha no válida.', 'una fecha imposible es un problema del renglón, no un error del servidor');
  assert.ok(!por['Renglón 2 · Renglón'] && !por['Renglón 6 · Renglón'], 'los renglones buenos no tienen problema');
  assert.equal((await admin.query('SELECT count(*)::int AS n FROM srp.plantaciones WHERE id = ANY($1::uuid[])', [arboles.map((a) => a.id)])).rows[0].n, 0, 'nada de la tanda se guardó');
  // Una jornada con fecha futura no entra
  const f = await adm('PUT', '/cargas/' + uuid() + '/tandas/1', { archivo: 'futuro.xlsx', jornadas: [otra], arboles: [arbol(otra, 30, 2)] });
  assert.equal(f.estado, 400);
  // Ni una de antes del programa, ni una imposible, que antes tiraba la tanda con un error interno
  for (const fecha of ['2024-09-30', '2026-13-45']) {
    const x = jornada({ fecha });
    assert.equal((await adm('PUT', '/cargas/' + uuid() + '/tandas/1', { archivo: 'fecha.xlsx', jornadas: [x], arboles: [arbol(x, 31, 2)] })).estado, 400, fecha);
  }
});

test('deshacer un lote lo oculta y elimina sus árboles sin borrarlos; el archivo se puede volver a cargar', async () => {
  const adm = await sesion(ADMIN);
  const d = await adm('DELETE', '/cargas/' + L1);
  assert.deepEqual([d.estado, d.datos.arboles, d.datos.jornadas], [200, 6, 2], JSON.stringify(d.datos));
  const x = (await admin.query('SELECT estatus, folio FROM srp.plantaciones WHERE id = ANY($1::uuid[])', [ARBOLES1.map((a) => a.id)])).rows;
  assert.ok(x.length === 6 && x.every((a) => a.estatus === 'eliminado' && a.folio), 'siguen ahí, eliminados y con su folio');
  assert.equal(await seVe(adm, J1.id), false, 'su jornada ya no se ve');
  assert.equal((await adm('DELETE', '/cargas/' + L1)).estado, 409, 'no se deshace dos veces');
  const bit = (await admin.query("SELECT accion, detalle FROM srp.bitacora WHERE entidad = 'carga' AND entidad_id = $1 ORDER BY fecha", [L1])).rows;
  assert.deepEqual(bit.map((b) => b.accion), ['CREADO', 'ELIMINADO']);
  assert.match(bit[1].detalle, /^Carga deshecha del archivo «prueba\.xlsx»: 6 árboles y 2 jornadas quitados$/);
  // Lo mismo, otra vez: ya no empata con lo deshecho
  const L3 = uuid(), J3 = jornada();
  const otra = await adm('PUT', '/cargas/' + L3 + '/tandas/1', { archivo: 'prueba.xlsx', jornadas: [J3], arboles: [{ ...ARBOLES1[0], id: uuid(), jornada_id: J3.id }] });
  assert.equal(otra.estado, 200, JSON.stringify(otra.datos));
  // Un lote sin terminar también se quita
  const sinTerminar = await adm('DELETE', '/cargas/' + L3);
  assert.match(sinTerminar.datos.detalle, /^Carga sin terminar quitada/);
});

test('sólo la Administración global carga, completa, consulta y deshace', async () => {
  const cabo = await sesion(CABO);
  const L = uuid(), J = jornada();
  for (const [metodo, ruta, cuerpo] of [['PUT', '/cargas/' + L + '/tandas/1', { archivo: 'x.xlsx', jornadas: [J], arboles: [arbol(J, 40, 2)] }],
    ['POST', '/cargas/' + L + '/completa', { arboles: 1 }], ['GET', '/cargas'], ['DELETE', '/cargas/' + L]]) {
    const r = await cabo(metodo, ruta, cuerpo);
    assert.deepEqual([r.estado, r.datos.codigo], [403, 'SIN_PERMISO'], metodo + ' ' + ruta);
  }
});

/* ---------- Una carga a la vez ---------- */

// Un lote que dejó de subir hace `minutos`: su alta y sus árboles, más viejos
async function envejecer(lote, minutos) {
  await admin.query("UPDATE srp.cargas SET creada_en = creada_en - make_interval(mins => $2) WHERE id = $1", [lote, minutos]);
  await admin.query("UPDATE srp.plantaciones SET fecha_registro = fecha_registro - make_interval(mins => $2) WHERE jornada_id IN (SELECT id FROM srp.jornadas WHERE carga_id = $1)", [lote, minutos]);
}

test('una carga a la vez: mientras un lote sube, otro no empieza; el que dejó de subir ya no estorba', async () => {
  const adm = await sesion(ADMIN);
  const A = uuid(), JA = jornada(), B = uuid(), JB = jornada();
  const tandaB = { archivo: 'b.xlsx', jornadas: [JB], arboles: [arbol(JB, 51, 2)] };
  assert.equal((await adm('PUT', '/cargas/' + A + '/tandas/1', { archivo: 'a.xlsx', jornadas: [JA], arboles: [arbol(JA, 50, 2)] })).estado, 200);
  const b = await adm('PUT', '/cargas/' + B + '/tandas/1', tandaB);
  assert.deepEqual([b.estado, b.datos.codigo], [409, 'OTRA_CARGA'], JSON.stringify(b.datos));
  assert.match(b.datos.mensaje, /^Hay otra carga subiendo: la de .+, del archivo «a\.xlsx»\. Espere a que termine e intente de nuevo\.$/);
  assert.equal((await admin.query('SELECT count(*)::int AS n FROM srp.cargas WHERE id = $1', [B])).rows[0].n, 0, 'del lote que esperó no queda nada');
  // El que dejó de subir hace más de 15 minutos se quedó a medias: ya no estorba
  await envejecer(A, 20);
  assert.equal((await adm('PUT', '/cargas/' + B + '/tandas/1', tandaB)).estado, 200);
  for (const k of [A, B]) assert.equal((await adm('DELETE', '/cargas/' + k)).estado, 200);
});

test('dos cargas del mismo archivo no duplican el histórico: la que se completa después lo dice y no se completa', async () => {
  const adm = await sesion(ADMIN);
  const A = uuid(), JA = jornada({ fecha: '2025-04-01' }), B = uuid(), JB = jornada({ fecha: '2025-04-01' });
  const deA = [arbol(JA, 60, 2), arbol(JA, 61, 3)], deB = deA.map((a) => ({ ...a, id: uuid(), jornada_id: JB.id }));
  assert.equal((await adm('PUT', '/cargas/' + A + '/tandas/1', { archivo: 'mismo.xlsx', jornadas: [JA], arboles: deA })).estado, 200);
  // A se quedó a medias y otra persona sube el mismo archivo, entero
  await envejecer(A, 20);
  assert.equal((await adm('PUT', '/cargas/' + B + '/tandas/1', { archivo: 'mismo.xlsx', jornadas: [JB], arboles: deB })).estado, 200);
  assert.equal((await adm('POST', '/cargas/' + B + '/completa', { arboles: 2 })).estado, 200);
  // Si A sigue, no se completa: traería los mismos dos árboles otra vez
  const a = await adm('POST', '/cargas/' + A + '/completa', { arboles: 2 });
  assert.deepEqual([a.estado, a.datos.codigo, a.datos.mensaje], [409, 'YA_CARGADOS', 'Mientras se subía, otra carga trajo 2 árboles iguales a los de este archivo.']);
  assert.equal(await seVe(adm, JA.id), false, 'lo de A no se ve');
  for (const k of [A, B]) assert.equal((await adm('DELETE', '/cargas/' + k)).estado, 200);
});
