/* LO QUE DICE LA BITÁCORA: el historial de un árbol lo ve quien ve el árbol, y nadie más; el registro de
   cambios de cuentas, catálogos y parámetros, sólo la Administración global, del más reciente al más antiguo
   y por páginas. Las fechas llegan al milésimo de segundo, como las demás del servicio. Crea sus cuentas, su
   programa, su jornada, su árbol y sus áreas, y al terminar los quita. */
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { conectar, limpiar } from './apoyo.js';
import { leerConfig, crearGrupo, crearApp, derivar, MONTAJE } from '../dist/independiente.js';

const CORRIDA = Date.now();
const CLAVE = 'Historial de prueba 2026';
const uuid = () => crypto.randomUUID();
const cuenta = (nombre, perfil) => ({ id: uuid(), nombre, perfil, correo: nombre + '.historial.prueba.' + CORRIDA + '@ejemplo.local' });
const COORD = cuenta('coordinador', 'COORDINADOR');
const CABO = cuenta('cabo', 'CABO');
const OTRO = cuenta('otrocabo', 'CABO');
const ADMIN = cuenta('admin', 'ADMIN');
const CUENTAS = [COORD, CABO, OTRO, ADMIN];
const PROG = 'p-prueba-hist-' + CORRIDA;
const HOY = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Mexico_City' }).format(new Date());
const MILESIMO = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;

let admin, grupo, servidor, base, ESPECIE, ARBOL;

before(async () => {
  admin = await conectar();
  await admin.query('GRANT srp_api TO CURRENT_USER WITH INHERIT FALSE, SET TRUE');
  ESPECIE = (await admin.query('SELECT id FROM srp.especies WHERE activo ORDER BY id LIMIT 1')).rows[0].id;
  await admin.query('BEGIN');
  await admin.query(`INSERT INTO srp.instituciones VALUES ('o-sedema', 'SEDEMA', 'Secretaría del Medio Ambiente', true, NULL, now(), NULL, NULL, 'Gobierno de la CDMX') ON CONFLICT DO NOTHING`);
  await admin.query(`INSERT INTO srp.areas VALUES ('a-sia', 'SIA', 'Sistema de Información Ambiental', true, NULL, now(), NULL, NULL) ON CONFLICT DO NOTHING`);
  await admin.query(`INSERT INTO srp.programas VALUES ($1, $2, $3, true, NULL, now(), NULL, NULL, '{}')`, [PROG, 'PRUEBA_HIST_' + CORRIDA, 'Programa de prueba del historial ' + CORRIDA]);
  const derivada = await derivar(CLAVE);
  for (const u of CUENTAS) {
    await admin.query(`INSERT INTO srp.usuarios VALUES ($1, $2, $3, 'o-sedema', 'a-sia', $4, $4, true, now(), $1, NULL, NULL)`, [u.id, u.correo, 'Prueba ' + u.nombre, u.perfil]);
    await admin.query(`INSERT INTO srp.credenciales VALUES ($1, $2, false, NULL, 0, NULL, now(), $1)`, [u.id, derivada]);
  }
  await admin.query('COMMIT');
  grupo = crearGrupo({ rol: 'srp_api' });
  const config = leerConfig({ SRP_COOKIE_SEGURA: 'no' });
  servidor = crearApp({ pool: grupo, config, proxy: 0 }).listen(0);
  await new Promise((r) => servidor.once('listening', r));
  base = 'http://127.0.0.1:' + servidor.address().port + MONTAJE;
});

after(async () => {
  servidor && servidor.close();
  grupo && await grupo.end();
  const ids = CUENTAS.map((u) => u.id);
  await limpiar(admin, async () => {
    const jornadas = (await admin.query('SELECT id FROM srp.jornadas WHERE cabo_id = ANY($1::uuid[])', [ids])).rows.map((r) => r.id);
    const arboles = (await admin.query('SELECT id FROM srp.plantaciones WHERE jornada_id = ANY($1::uuid[])', [jornadas])).rows.map((r) => r.id);
    await admin.query('ALTER TABLE srp.folios DISABLE TRIGGER folios_inmutables');
    await admin.query('DELETE FROM srp.folios WHERE plantacion_id = ANY($1::uuid[])', [arboles]);
    await admin.query('ALTER TABLE srp.folios ENABLE TRIGGER folios_inmutables');
    await admin.query('DELETE FROM srp.plantaciones WHERE id = ANY($1::uuid[])', [arboles]);
    await admin.query('DELETE FROM srp.jornadas WHERE id = ANY($1::uuid[])', [jornadas]);
    await admin.query('DELETE FROM srp.areas WHERE creado_por_id = ANY($1::uuid[])', [ids]);
    for (const t of ['bitacora', 'bitacora_acceso']) await admin.query(`ALTER TABLE srp.${t} DISABLE TRIGGER bitacora_inmutable`);
    await admin.query('DELETE FROM srp.bitacora WHERE usuario_id = ANY($1::uuid[])', [ids]);
    await admin.query('DELETE FROM srp.bitacora_acceso WHERE usuario_id = ANY($1::uuid[])', [ids]);
    for (const t of ['bitacora', 'bitacora_acceso']) await admin.query(`ALTER TABLE srp.${t} ENABLE TRIGGER bitacora_inmutable`);
    await admin.query('DELETE FROM srp.usuarios WHERE id = ANY($1::uuid[])', [ids]);
    await admin.query('DELETE FROM srp.programas WHERE id = $1', [PROG]);
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

test('el historial de un árbol dice lo que se le hizo, en orden, a quien lo puede ver', async () => {
  const cabo = await sesion(CABO);
  const J = uuid();
  ARBOL = uuid();
  const r = await cabo('POST', '/envios', { operaciones: [
    { tipo: 'jornada.crear', datos: { id: J, nombre: 'Jornada del historial', programa_id: PROG, lat: 19.4326, lng: -99.1332, punto_origen: 'gps', gps_precision_m: 5, fecha: HOY, arboles_previstos: 2 } },
    { tipo: 'registro.crear', datos: { id: ARBOL, jornada_id: J, lat: 19.4326, lng: -99.1332, punto_origen: 'gps', gps_precision_m: 5, especie_id: ESPECIE, especie_otra: '', fecha_plantacion: HOY, comentarios: '' } }] });
  assert.deepEqual(r.datos.resultados.map((x) => x.estado), ['recibido', 'recibido']);
  const version = r.datos.resultados[1].version;
  const e = await cabo('POST', '/envios', { operaciones: [{ tipo: 'registro.editar', datos: { id: ARBOL, version, cambios: { comentarios: 'Con tutor' } } }] });
  assert.equal(e.datos.resultados[0].estado, 'recibido');

  const h = await cabo('GET', '/plantaciones/' + ARBOL + '/historial');
  assert.equal(h.estado, 200);
  assert.deepEqual(h.datos.filas.map((b) => [b.accion, b.entidad, b.entidad_id, b.usuario_id]),
    [['CREADO', 'plantacion', ARBOL, CABO.id], ['FOLIO_ASIGNADO', 'plantacion', ARBOL, CABO.id], ['EDITADO', 'plantacion', ARBOL, CABO.id]]);
  assert.ok(h.datos.filas.every((b) => MILESIMO.test(b.fecha)), 'la fecha va al milésimo, en UTC: ' + h.datos.filas[0].fecha);
  assert.equal(h.datos.filas[2].detalle, 'Campos: comentarios');
  // Su coordinación y la Administración también lo ven; otro cabo, no: para él el árbol no existe
  for (const u of [COORD, ADMIN]) assert.equal((await (await sesion(u))('GET', '/plantaciones/' + ARBOL + '/historial')).datos.filas.length, 3, u.nombre);
  const otro = await (await sesion(OTRO))('GET', '/plantaciones/' + ARBOL + '/historial');
  assert.deepEqual([otro.estado, otro.datos.codigo], [404, 'NO_EXISTE']);
  assert.equal((await cabo('GET', '/plantaciones/' + uuid() + '/historial')).estado, 404);
  assert.equal((await cabo('GET', '/plantaciones/no-es-un-id/historial')).estado, 404);
});

test('el registro de cambios es sólo de la Administración global: cuentas, catálogos y parámetros, lo más reciente primero, por páginas', async () => {
  const adm = await sesion(ADMIN);
  const nombres = [];
  for (let i = 1; i <= 3; i++) {
    const nombre = 'Área del historial ' + i + ' ' + CORRIDA;
    const r = await adm('POST', '/catalogos/areas', { nombre, clave: 'HIST_' + i + '_' + CORRIDA });
    assert.equal(r.estado, 201, JSON.stringify(r.datos));
    nombres.push(r.datos.id);
  }
  const p1 = await adm('GET', '/cambios?limite=2');
  assert.equal(p1.estado, 200);
  // Las tres altas, de la más reciente a la más antigua
  assert.deepEqual(p1.datos.filas.map((b) => [b.accion, b.entidad, b.entidad_id]), [['CREADO', 'catalogo', nombres[2]], ['CREADO', 'catalogo', nombres[1]]]);
  assert.ok(p1.datos.siguiente, 'hay otra página');
  const p2 = await adm('GET', '/cambios?limite=2&despues=' + encodeURIComponent(p1.datos.siguiente));
  assert.equal(p2.datos.filas[0].entidad_id, nombres[0], 'la página que sigue empieza donde terminó la anterior');
  assert.ok(p2.datos.filas.every((b) => MILESIMO.test(b.fecha)));
  // Lo de jornadas y árboles no va aquí: va en su historial
  const todo = await adm('GET', '/cambios?limite=2000');
  assert.ok(todo.datos.filas.every((b) => ['usuario', 'catalogo', 'carga'].includes(b.entidad)));
  assert.ok(!todo.datos.filas.some((b) => b.entidad_id === ARBOL));
  // Quien no administra no lo ve; una página mal pedida se dice
  const cabo = await sesion(CABO);
  const negado = await cabo('GET', '/cambios');
  assert.deepEqual([negado.estado, negado.datos.codigo], [403, 'SIN_PERMISO']);
  assert.equal((await adm('GET', '/cambios?despues=cualquier-cosa')).estado, 400);
});
