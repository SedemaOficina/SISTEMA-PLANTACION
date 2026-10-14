/* POSIBLES DUPLICADOS: al recibir un árbol, el servidor busca otro árbol activo de otra jornada a menos de la
   incertidumbre combinada de los dos puntos (la suma de sus precisiones, con el piso del parámetro). Si es de la
   misma institución, lo avisa; si es de otra, recibe el árbol sin decir nada y anota la pareja en la bandeja que
   sólo la Administración global ve y revisa. Trabaja en un lugar de la Ciudad sin árboles cerca, crea sus
   cuentas, jornadas y árboles, y al terminar los quita. */
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { conectar, limpiar } from './apoyo.js';
import { leerConfig, crearGrupo, crearApp, derivar } from '../dist/independiente.js';

const CORRIDA = Date.now();
const CLAVE = 'Duplicados de prueba 2026';
const uuid = () => crypto.randomUUID();
const INST = 'o-prueba-dup-' + CORRIDA;
const cuenta = (nombre, perfil, organizacion_id, coordinadores = []) => ({ id: uuid(), nombre, perfil, organizacion_id, coordinadores, correo: nombre + '.duplicados.prueba.' + CORRIDA + '@ejemplo.local' });
const COORD = cuenta('coordinador', 'COORDINADOR', 'o-sedema');
const CABO = cuenta('cabo', 'CABO', 'o-sedema', [COORD.id]);
const VECINO = cuenta('vecino', 'CABO', 'o-sedema');
const EXTERNO = cuenta('externo', 'CABO', INST);
const ADMIN = cuenta('admin', 'ADMIN', 'o-sedema');
const CUENTAS = [COORD, CABO, VECINO, EXTERNO, ADMIN];
const PROG = 'p-prueba-dup-' + CORRIDA, PROG_EMP = 'p-prueba-dup-emp-' + CORRIDA;
const HOY = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Mexico_City' }).format(new Date());

let admin, grupo, servidor, base, ESPECIE, NOMBRE_ESPECIE, P;

// Un punto a tantos metros al norte de otro, con los seis decimales del teléfono
const alNorte = (p, m) => ({ lat: Number((p.lat + m / 110_800).toFixed(6)), lng: p.lng });

before(async () => {
  admin = await conectar();
  await admin.query('GRANT srp_api TO CURRENT_USER WITH INHERIT FALSE, SET TRUE');
  ({ id: ESPECIE, nombre: NOMBRE_ESPECIE } = (await admin.query('SELECT id, nombre FROM srp.especies WHERE activo ORDER BY id LIMIT 1')).rows[0]);
  // Un lugar dentro de la Ciudad sin ningún árbol a medio kilómetro. Sólo se ubican los más céntricos
  P = (await admin.query(`
    WITH libres AS (
      SELECT g.lat, g.lng FROM (SELECT round(19.20 + i * 0.02, 6) AS lat, round(-99.30 + k * 0.02, 6) AS lng FROM generate_series(0, 20) i, generate_series(0, 20) k) g
       WHERE NOT EXISTS (SELECT 1 FROM srp.plantaciones p WHERE srp.punto(p.lat, p.lng) && ST_Expand(srp.punto(g.lat, g.lng), 0.005))
       ORDER BY abs(g.lat - 19.40) + abs(g.lng + 99.15) LIMIT 10)
    SELECT lat::float8 AS lat, lng::float8 AS lng FROM libres WHERE (SELECT dentro FROM srp.derivar(lat, lng, 0))
     ORDER BY abs(lat - 19.40) + abs(lng + 99.15) LIMIT 1`)).rows[0];
  assert.ok(P, 'hay un lugar sin árboles cerca');
  await admin.query('BEGIN');
  await admin.query('SET CONSTRAINTS ALL DEFERRED');
  await admin.query(`INSERT INTO srp.instituciones VALUES ('o-sedema', 'SEDEMA', 'Secretaría del Medio Ambiente', true, NULL, now(), NULL, NULL, 'Gobierno de la CDMX') ON CONFLICT DO NOTHING`);
  await admin.query(`INSERT INTO srp.instituciones VALUES ($1, $2, $3, true, NULL, now(), NULL, NULL, 'Empresa privada')`, [INST, 'PRUEBA_DUP_' + CORRIDA, 'Empresa de prueba de duplicados ' + CORRIDA]);
  await admin.query(`INSERT INTO srp.areas VALUES ('a-sia', 'SIA', 'Sistema de Información Ambiental', true, NULL, now(), NULL, NULL) ON CONFLICT DO NOTHING`);
  await admin.query(`INSERT INTO srp.programas VALUES ($1, $2, $3, true, NULL, now(), NULL, NULL, '{}')`, [PROG, 'PRUEBA_DUP_' + CORRIDA, 'Programa de prueba de duplicados ' + CORRIDA]);
  await admin.query(`INSERT INTO srp.programas VALUES ($1, $2, $3, true, NULL, now(), NULL, NULL, '{Empresa privada}')`, [PROG_EMP, 'PRUEBA_DUP_EMP_' + CORRIDA, 'Programa de empresas de prueba de duplicados ' + CORRIDA]);
  const derivada = await derivar(CLAVE);
  for (const u of CUENTAS) {
    await admin.query(`INSERT INTO srp.usuarios VALUES ($1, $2, $3, $4, $5, $6, $7, $8, true, now(), $1, NULL, NULL)`,
      [u.id, u.correo, 'Prueba ' + u.nombre, u.organizacion_id, u.organizacion_id === 'o-sedema' ? 'a-sia' : null, u.perfil, u.perfil, u.coordinadores]);
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
  const ids = CUENTAS.map((u) => u.id);
  await limpiar(admin, async () => {
    const jornadas = (await admin.query('SELECT id FROM srp.jornadas WHERE cabo_id = ANY($1::uuid[])', [ids])).rows.map((r) => r.id);
    const arboles = (await admin.query('SELECT id FROM srp.plantaciones WHERE jornada_id = ANY($1::uuid[])', [jornadas])).rows.map((r) => r.id);
    await admin.query('ALTER TABLE srp.folios DISABLE TRIGGER folios_inmutables');
    await admin.query('DELETE FROM srp.folios WHERE plantacion_id = ANY($1::uuid[])', [arboles]);
    await admin.query('ALTER TABLE srp.folios ENABLE TRIGGER folios_inmutables');
    // Las parejas de la bandeja y las prioridades se van con sus árboles
    await admin.query('DELETE FROM srp.plantaciones WHERE id = ANY($1::uuid[])', [arboles]);
    await admin.query('DELETE FROM srp.jornadas WHERE id = ANY($1::uuid[])', [jornadas]);
    for (const t of ['bitacora', 'bitacora_acceso']) await admin.query(`ALTER TABLE srp.${t} DISABLE TRIGGER bitacora_inmutable`);
    await admin.query('DELETE FROM srp.bitacora WHERE usuario_id = ANY($1::uuid[])', [ids]);
    await admin.query('DELETE FROM srp.bitacora_acceso WHERE usuario_id = ANY($1::uuid[])', [ids]);
    for (const t of ['bitacora', 'bitacora_acceso']) await admin.query(`ALTER TABLE srp.${t} ENABLE TRIGGER bitacora_inmutable`);
    await admin.query('DELETE FROM srp.usuarios WHERE id = ANY($1::uuid[])', [ids]);
    await admin.query('DELETE FROM srp.programas WHERE id = ANY($1)', [[PROG, PROG_EMP]]);
    await admin.query('DELETE FROM srp.instituciones WHERE id = $1', [INST]);
  });
});

// Un teléfono o una computadora con su sesión
async function sesion(u) {
  const r = await fetch(base + '/acceso/entrar', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ correo: u.correo, contrasena: CLAVE }) });
  assert.equal(r.status, 200);
  const cookie = (r.headers.get('set-cookie') || '').split(';')[0];
  const pedir = async (metodo, ruta, cuerpo) => {
    const x = await fetch(base + ruta, { method: metodo, headers: { cookie, 'content-type': 'application/json' }, body: cuerpo && JSON.stringify(cuerpo) });
    return { estado: x.status, datos: await x.json() };
  };
  const una = async (tipo, datos) => (await pedir('POST', '/envios', { operaciones: [{ tipo, datos }] })).datos.resultados[0];
  return { pedir, una };
}

// La del externo, con un programa para empresas
const nuevaJornada = async (t, nombre, programa = PROG) => {
  const id = uuid();
  const r = await t.una('jornada.crear', { id, nombre, programa_id: programa, ...P, punto_origen: 'manual', fecha: HOY, arboles_previstos: 5 });
  assert.equal(r.estado, 'recibido', JSON.stringify(r));
  return id;
};
const arbol = (jornadaId, punto, precision = 5, extra = {}) => ({ id: uuid(), jornada_id: jornadaId, ...punto, punto_origen: precision == null ? 'mapa' : 'gps',
  gps_precision_m: precision, especie_id: ESPECIE, especie_otra: '', fecha_plantacion: HOY, comentarios: '', fecha_registro: new Date().toISOString(), ...extra });
const plantar = async (t, jornadaId, punto, precision, extra) => {
  const datos = arbol(jornadaId, punto, precision, extra);
  const r = await t.una('registro.crear', datos);
  assert.equal(r.estado, 'recibido', JSON.stringify(r));
  return { datos, r };
};
const bandeja = async (ids) => (await admin.query('SELECT plantacion_id, cercano_id, distancia_m::float8 AS d, umbral_m::float8 AS umbral, resolucion FROM srp.duplicados WHERE plantacion_id = ANY($1::uuid[]) OR cercano_id = ANY($1::uuid[]) ORDER BY id', [ids])).rows;

let J1, A1, A2, B1, E1;

test('cerca de otro árbol suyo de otra jornada, el árbol se recibe con el aviso; en su misma jornada, sin él', async () => {
  const cabo = await sesion(CABO);
  J1 = await nuevaJornada(cabo, 'Jornada uno de duplicados');
  A1 = (await plantar(cabo, J1, P)).r.fila;
  // A un metro, en su misma jornada: eso lo avisa el teléfono
  const a2 = await plantar(cabo, J1, alNorte(P, 1));
  A2 = a2.r.fila;
  assert.equal(a2.r.duplicado, undefined);
  // En otra jornada, a dos metros del primero y a uno del segundo: el aviso dice el más cercano
  const J2 = await nuevaJornada(cabo, 'Jornada dos de duplicados');
  const b1 = await plantar(cabo, J2, alNorte(P, 2));
  B1 = b1.r.fila;
  const d = b1.r.duplicado;
  assert.equal(d.plantacion_id, A2.id);
  assert.equal(d.folio, A2.folio);
  assert.ok(Math.abs(d.distancia_m - 1) < 0.3, 'a ' + d.distancia_m + ' m');
  assert.equal(d.umbral_m, 10, 'la suma de las dos precisiones');
  assert.equal(d.texto, 'Posible duplicado: a ' + d.distancia_m.toFixed(1) + ' m de ' + NOMBRE_ESPECIE + ' (' + A2.folio + '), de la jornada «Jornada uno de duplicados». Revise si es el mismo árbol.');
  // Un reenvío da el mismo aviso
  const otra = await cabo.una('registro.crear', b1.datos);
  assert.equal(otra.repetido, true);
  assert.deepEqual(otra.duplicado, d);
  // Nada de esto va a la bandeja: es la misma institución
  assert.deepEqual(await bandeja([A1.id, A2.id, B1.id]), []);
});

test('la distancia que cuenta es la suma de las precisiones, nunca menos que el parámetro de puntos duplicados', async () => {
  const cabo = await sesion(CABO);
  const J = await nuevaJornada(cabo, 'Jornada de distancias');
  // A 15 m de A1 (precisión 5): con 5 no alcanza (10 m); con 12, sí (17 m)
  assert.equal((await plantar(cabo, J, alNorte(P, -15), 5)).r.duplicado, undefined);
  const J3 = await nuevaJornada(cabo, 'Jornada de distancias 2');
  assert.equal((await plantar(cabo, J3, alNorte(P, -15), 12)).r.duplicado?.umbral_m, 17);
  // Sin precisión (punto puesto en el mapa) cuenta el piso: el de A1 más nada, pero nunca menos de 4 m.
  // Lejos de los anteriores, para comparar sólo con un árbol
  const Q = alNorte(P, 200);
  const J4 = await nuevaJornada(cabo, 'Jornada del piso');
  await plantar(cabo, J4, Q, null);
  const J5 = await nuevaJornada(cabo, 'Jornada del piso 2');
  assert.equal((await plantar(cabo, J5, alNorte(Q, 3), null)).r.duplicado?.umbral_m, 4);
  const J6 = await nuevaJornada(cabo, 'Jornada del piso 3');
  assert.equal((await plantar(cabo, J6, alNorte(Q, -5), null)).r.duplicado, undefined, 'a 5 m del primero, fuera del piso');
});

test('si el árbol cercano es de alguien de su institución que no puede ver, el aviso no dice cuál', async () => {
  const vecino = await sesion(VECINO);
  const J = await nuevaJornada(vecino, 'Jornada del vecino');
  const r = (await plantar(vecino, J, alNorte(P, 0.5))).r;
  assert.deepEqual(Object.keys(r.duplicado).sort(), ['distancia_m', 'texto', 'umbral_m']);
  assert.equal(r.duplicado.texto, 'Posible duplicado: a ' + r.duplicado.distancia_m.toFixed(1) + ' m de un árbol que registró otra persona de su institución. Revise con su coordinación si es el mismo árbol.');
});

test('cerca de un árbol de otra institución, se recibe sin aviso y la pareja va a la bandeja, una sola vez', async () => {
  const externo = await sesion(EXTERNO);
  const J = await nuevaJornada(externo, 'Jornada externa', PROG_EMP);
  const e1 = await plantar(externo, J, alNorte(P, 0.2));
  E1 = e1.r.fila;
  assert.equal(e1.r.duplicado, undefined);
  // La respuesta no dice nada de los árboles de la otra institución
  const texto = JSON.stringify(e1.r);
  for (const x of [A1, A2, B1]) assert.ok(!texto.includes(x.id) && !texto.includes(x.folio));
  const filas = await bandeja([E1.id]);
  assert.equal(filas.length, 1);
  assert.deepEqual([filas[0].plantacion_id, filas[0].cercano_id, filas[0].umbral, filas[0].resolucion], [E1.id, A1.id, 10, null]);
  // Un reenvío no repite la pareja
  assert.equal((await externo.una('registro.crear', e1.datos)).repetido, true);
  assert.equal((await bandeja([E1.id])).length, 1);
});

test('la bandeja: sólo la Administración global la ve y la revisa; una revisión no se repite', async () => {
  const cabo = await sesion(CABO), adm = await sesion(ADMIN);
  for (const [m, ruta, cuerpo] of [['GET', '/duplicados'], ['POST', '/duplicados/revision', { ids: [1], resolucion: 'mismo' }]]) {
    const r = await cabo.pedir(m, ruta, cuerpo);
    assert.deepEqual([r.estado, r.datos.mensaje], [403, 'No tiene permiso para revisar los posibles duplicados.']);
  }
  const sedema = (await admin.query("SELECT nombre FROM srp.instituciones WHERE id = 'o-sedema'")).rows[0].nombre;
  const lista = (await adm.pedir('GET', '/duplicados?limite=500')).datos;
  const fila = lista.filas.find((f) => f.llego.id === E1.id);
  assert.ok(lista.pendientes >= 1);
  assert.deepEqual([fila.cercano.id, fila.llego.institucion, fila.cercano.institucion, fila.cercano.cabo, fila.llego.jornada, fila.cercano.especie, fila.resolucion],
    [A1.id, 'Empresa de prueba de duplicados ' + CORRIDA, sedema, 'Prueba cabo', 'Jornada externa', NOMBRE_ESPECIE, null]);
  assert.equal(fila.distancia_actual_m, fila.distancia_m);
  // Revisar: errores, una vez, y otra vez ya no
  const malo = await adm.pedir('POST', '/duplicados/revision', { ids: [fila.id], resolucion: 'quizá', nota: 'x'.repeat(501) });
  assert.deepEqual(malo.datos.errores.map((e) => e[0]), ['resolucion', 'nota']);
  const ok = await adm.pedir('POST', '/duplicados/revision', { ids: [fila.id, 999999999], resolucion: 'distintos', nota: ' Son dos árboles, uno en cada lado de la banqueta. ' });
  assert.deepEqual(ok.datos, { revisados: [fila.id], ya_revisados: [], no_existen: [999999999] });
  assert.deepEqual((await adm.pedir('POST', '/duplicados/revision', { ids: [fila.id], resolucion: 'mismo' })).datos, { revisados: [], ya_revisados: [fila.id], no_existen: [] });
  const revisada = (await adm.pedir('GET', '/duplicados?estado=revisados&limite=500')).datos.filas.find((f) => f.id === fila.id);
  assert.deepEqual([revisada.resolucion, revisada.nota, revisada.revisado_por], ['distintos', 'Son dos árboles, uno en cada lado de la banqueta.', 'Prueba admin']);
  assert.ok(!(await adm.pedir('GET', '/duplicados?limite=500')).datos.filas.some((f) => f.id === fila.id), 'ya no está pendiente');
  assert.equal((await adm.pedir('GET', '/duplicados?estado=otro')).estado, 400);
});

test('un árbol eliminado deja de estar pendiente; restaurado, vuelve; corregir el punto vuelve a buscar', async () => {
  const externo = await sesion(EXTERNO), adm = await sesion(ADMIN);
  const J = await nuevaJornada(externo, 'Jornada externa dos', PROG_EMP);
  // Lejos de todo, y luego corregido junto a B1
  const recibido = (await plantar(externo, J, alNorte(P, 400))).r, lejos = recibido.fila;
  assert.deepEqual(await bandeja([lejos.id]), []);
  const editado = await externo.una('registro.editar', { id: lejos.id, version: recibido.version, cambios: alNorte(P, 2.3) });
  assert.equal(editado.estado, 'recibido', JSON.stringify(editado));
  const [pareja] = await bandeja([lejos.id]);
  assert.equal(pareja.cercano_id, B1.id, 'el más cercano de otra institución');
  const pendiente = async () => (await adm.pedir('GET', '/duplicados?limite=500')).datos.filas.some((f) => f.llego.id === lejos.id);
  assert.ok(await pendiente());
  const eliminado = await externo.una('registro.eliminar', { id: lejos.id, version: editado.version });
  assert.ok(!(await pendiente()), 'eliminado, ya no cuenta dos veces');
  await externo.una('registro.restaurar', { id: lejos.id, version: eliminado.version });
  assert.ok(await pendiente(), 'restaurado, vuelve a estar pendiente');
  assert.equal((await bandeja([lejos.id])).length, 1, 'sin repetir la pareja');
});

test('un sustituto junto al árbol que reemplaza no es su duplicado', async () => {
  const cabo = await sesion(CABO);
  const r = await cabo.una('registro.sustituir', { ...arbol(J1, alNorte(P, 0.3)), sustituye_id: A1.id, motivo_sustitucion: 'ROBO' });
  assert.equal(r.estado, 'recibido', JSON.stringify(r));
  // Entra en la jornada del original, que el teléfono revisa; los cercanos de otras jornadas sí cuentan
  const vecinos = (await admin.query('SELECT cercano_id FROM srp.vecinos($1, 4)', [r.id])).rows.map((v) => v.cercano_id);
  assert.ok(vecinos.length && r.duplicado);
  assert.ok(![A1.id, A2.id].some((id) => vecinos.includes(id)), 'ni el original ni los de su jornada');
});
