/* PERMISOS: las reglas del servidor (permisos.ts) son las de la aplicación (js/permisos.js), una por una,
   y cada consulta trae justo lo que la aplicación le deja ver a cada cuenta. js/permisos.js se carga tal
   cual, en un contexto aparte, y se compara con el servidor:
     · las reglas, con cada perfil, cada acción y cientos de registros armados para los casos de borde;
     · la consulta en la base, con todas las cuentas, jornadas y árboles que haya (la demostración, si está
       cargada, más los de esta prueba);
     · las rutas, como las usará la aplicación: por páginas, sin fotografía y con las fechas en texto.
   Crea sus instituciones, cuentas, jornadas y árboles, y al terminar los quita. */
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { conectar, limpiar, RAIZ } from './apoyo.js';
import { leerConfig, crearGrupo, crearApp, derivar, permisos as S, MONTAJE } from '../dist/independiente.js';

const SEDEMA = 'o-sedema', INST_A = 'o-prueba-permisos-a', INST_B = 'o-prueba-permisos-b', PROGRAMA = 'p-prueba-permisos';
const CLAVE = 'Permisos de prueba 2026';
const id = () => crypto.randomUUID();
const CORRIDA = Date.now();

// Las cuentas de la prueba: cada perfil, de la Secretaría y de fuera, y cabos con y sin coordinación
const U = {};
const cuenta = (nombre, perfil, organizacion_id) => (U[nombre] = {
  id: id(), correo: nombre.toLowerCase().replace(/_/g, '.') + '.permisos.prueba.' + CORRIDA + '@ejemplo.local', perfil, organizacion_id
});
cuenta('ADMIN', 'ADMIN', SEDEMA);
cuenta('DIR_SEDEMA', 'DIRECTIVO', SEDEMA);
cuenta('DIR_A', 'DIRECTIVO', INST_A);
cuenta('COORD_S', 'COORDINADOR', SEDEMA);
cuenta('COORD_A', 'COORDINADOR', INST_A);
cuenta('CABO_S1', 'CABO', SEDEMA);
cuenta('CABO_S2', 'CABO', SEDEMA);
cuenta('CABO_S3', 'CABO', SEDEMA);
cuenta('CABO_A1', 'CABO', INST_A);
cuenta('CABO_B1', 'CABO', INST_B);
cuenta('TEMPORAL', 'CABO', SEDEMA);

// Jornadas y árboles con titulares, relevos vigentes y devueltos, una jornada que dice otra institución y una compartida
const J = {}, T = {};
const relevo = (nombre) => ({ cabo_id: U[nombre].id, fecha: '2026-10-05T15:00:00.000Z', por_id: U.COORD_S.id });
const apoyo = (nombre, fin = null) => ({ cabo_id: U[nombre].id, desde: '2026-10-05T15:00:00.000Z', por_id: U.COORD_S.id, hasta: fin ? '2026-10-05T18:00:00.000Z' : null, fin });
function jornadas() {
  const j = (nombre, titular, organizacion_id, extra = {}) => (J[nombre] = Object.assign({ id: id(), cabo_id: U[titular].id, organizacion_id, relevo_id: null, relevos: [], cabos_apoyo: [], estatus: 'abierta' }, extra));
  j('J1', 'CABO_S1', SEDEMA);
  j('J2', 'CABO_S1', SEDEMA, { relevo_id: U.CABO_S2.id, relevos: [relevo('CABO_S2')] });
  j('J3', 'CABO_S3', SEDEMA, { relevos: [relevo('CABO_S1'), relevo('CABO_S3')] });
  j('J4', 'CABO_A1', INST_A);
  j('J5', 'CABO_B1', INST_B);
  j('J6', 'COORD_S', SEDEMA);
  j('J7', 'CABO_A1', SEDEMA);
  j('J8', 'CABO_S2', SEDEMA, { estatus: 'cerrada', relevos: [relevo('CABO_A1'), relevo('CABO_S2')] });
  j('J9', 'COORD_S', SEDEMA, { cabos_apoyo: [apoyo('CABO_S3'), apoyo('CABO_S2', 'terminado')] });
  const t = (nombre, jornada, cabo) => (T[nombre] = { id: id(), jornada_id: J[jornada].id, cabo_id: U[cabo].id });
  t('T1', 'J1', 'CABO_S1'); t('T2', 'J2', 'CABO_S1'); t('T3', 'J2', 'CABO_S2'); t('T4', 'J3', 'CABO_S3'); t('T5', 'J3', 'CABO_S1');
  t('T6', 'J4', 'CABO_A1'); t('T7', 'J5', 'CABO_B1'); t('T8', 'J6', 'COORD_S'); t('T9', 'J7', 'CABO_A1'); t('T10', 'J8', 'CABO_A1');
  t('T11', 'J9', 'COORD_S'); t('T12', 'J9', 'CABO_S3'); t('T13', 'J9', 'CABO_S2');
}
jornadas();

// js/permisos.js tal cual, con lo poco que toma del resto de la aplicación
function reglasDeLaAplicacion(usuarios) {
  const ctx = { console };
  ctx.window = ctx;
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(path.join(RAIZ, 'js', 'permisos.js'), 'utf8'), ctx, { filename: 'js/permisos.js' });
  const SRP = ctx.SRP;
  SRP.ref = { esSedema: (o) => o === SEDEMA, usuarioPorId: Object.fromEntries(usuarios.map((u) => [u.id, u])) };
  SRP.sesion = { usuario: null };
  SRP.util = { anunciar() {} };
  return SRP;
}

// Lo que la aplicación deja ver de los árboles: los de su alcance y, en la vista de Jornadas, todos los
// de una jornada de su alcance donde estuvo de relevo sin ser el titular (js/jornadas.js)
function veArbolEnLaAplicacion(SRP, u, arbol, jornada) {
  const P = SRP.permisos, porId = SRP.ref.usuarioPorId;
  if (P.alcanza(u, arbol, porId)) return true;
  return !!jornada && P.alcanza(u, jornada, porId) && jornada.cabo_id !== u.id && P.personasDe(jornada).includes(u.id);
}

const autoresDe = (usuarios) => new Map(usuarios.map((u) => [u.id, { organizacion_id: u.organizacion_id }]));
const conjunto = (filas) => new Set(filas.map((f) => f.id));
const diferencia = (a, b) => [...a].filter((x) => !b.has(x));

let admin, grupo, servidor, base;
const config = leerConfig({ SRP_COOKIE_SEGURA: 'no' });

before(async () => {
  admin = await conectar();
  await admin.query('GRANT srp_api TO CURRENT_USER WITH INHERIT FALSE, SET TRUE');
  await admin.query('BEGIN');
  await admin.query(`INSERT INTO srp.instituciones VALUES ($1, 'SEDEMA', 'Secretaría del Medio Ambiente', true, NULL, now(), NULL, NULL, 'Gobierno de la CDMX') ON CONFLICT DO NOTHING`, [SEDEMA]);
  for (const [o, clave] of [[INST_A, 'PRUEBA_PERMISOS_A'], [INST_B, 'PRUEBA_PERMISOS_B']]) {
    await admin.query(`INSERT INTO srp.instituciones VALUES ($1, $2, $3, true, NULL, now(), NULL, NULL, 'Empresa privada') ON CONFLICT DO NOTHING`, [o, clave, 'Institución de prueba ' + clave]);
  }
  await admin.query(`INSERT INTO srp.areas VALUES ('a-sia', 'SIA', 'Sistema de Información Ambiental', true, NULL, now(), NULL, NULL) ON CONFLICT DO NOTHING`);
  await admin.query(`INSERT INTO srp.programas VALUES ($1, 'PRUEBA_PERMISOS', 'Programa de prueba de permisos', true, NULL, now(), NULL, NULL, '{Alcaldía}') ON CONFLICT DO NOTHING`, [PROGRAMA]);
  const derivada = await derivar(CLAVE);
  await admin.query('SET CONSTRAINTS ALL DEFERRED');
  for (const [nombre, u] of Object.entries(U)) {
    await admin.query(`INSERT INTO srp.usuarios VALUES ($1, $2, $3, $4, $5, $6, $7, true, now(), $1, NULL, NULL)`,
      [u.id, u.correo, 'Prueba ' + nombre.replace(/_/g, ' '), u.organizacion_id, u.organizacion_id === SEDEMA ? 'a-sia' : null, u.perfil, u.perfil]);
    await admin.query(`INSERT INTO srp.credenciales VALUES ($1, $2, $3, $4, 0, NULL, now(), $1)`,
      [u.id, derivada, nombre === 'TEMPORAL', nombre === 'TEMPORAL' ? new Date(Date.now() + 3_600_000) : null]);
  }
  for (const j of Object.values(J)) {
    await admin.query(`INSERT INTO srp.jornadas (id, nombre, ubicacion, programa_id, fecha, comentarios, cabo_id, organizacion_id, estatus, fecha_inicio,
        relevo_id, relevos, solicitante_otro, solicitud_descripcion, arboles_previstos, puntos_revisados, personal, apoyo, observaciones, chofer,
        vehiculo_modelo, vehiculo_placa, vehiculo_tipo, hora, cabos_apoyo)
      VALUES ($1, 'Prueba de permisos', '', $2, '2026-10-05', '', $3, $4, $5, '2026-10-05T15:00:00Z', $6, $7, '', '', 10, '{}', '', '', '', '', '', '', '', '', $8)`,
      [j.id, PROGRAMA, j.cabo_id, j.organizacion_id, j.estatus, j.relevo_id, JSON.stringify(j.relevos), JSON.stringify(j.cabos_apoyo)]);
  }
  for (const t of Object.values(T)) {
    await admin.query(`INSERT INTO srp.plantaciones (id, estatus, cabo_id, lat, lng, punto_origen, gps_precision_m, especie_id, especie_otra, programa_id,
        fecha_plantacion, jornada_id, comentarios, motivo_sustitucion_otro, foto_base64, fecha_registro)
      VALUES ($1, 'activo', $2, 19.432600, -99.133200, 'gps', 5, NULL, 'Árbol de prueba', $3, '2026-10-05', $4, '', '', 'data:image/jpeg;base64,AAAA', '2026-10-05T15:30:00Z')`,
      [t.id, t.cabo_id, PROGRAMA, t.jornada_id]);
  }
  await admin.query('COMMIT');
  grupo = crearGrupo({ rol: 'srp_api' });
  servidor = crearApp({ pool: grupo, config, proxy: 0 }).listen(0);
  await new Promise((r) => servidor.once('listening', r));
  base = 'http://127.0.0.1:' + servidor.address().port + MONTAJE;
});

after(async () => {
  servidor && servidor.close();
  grupo && await grupo.end();
  const ids = Object.values(U).map((u) => u.id);
  await limpiar(admin, async () => {
    await admin.query('ALTER TABLE srp.bitacora_acceso DISABLE TRIGGER bitacora_inmutable');
    await admin.query('DELETE FROM srp.bitacora_acceso WHERE usuario_id = ANY($1::uuid[])', [ids]);
    await admin.query('ALTER TABLE srp.bitacora_acceso ENABLE TRIGGER bitacora_inmutable');
    await admin.query('DELETE FROM srp.plantaciones WHERE programa_id = $1', [PROGRAMA]);
    await admin.query('DELETE FROM srp.jornadas WHERE programa_id = $1', [PROGRAMA]);
    await admin.query('SET CONSTRAINTS ALL DEFERRED');
    await admin.query('DELETE FROM srp.usuarios WHERE id = ANY($1::uuid[])', [ids]);
    await admin.query('DELETE FROM srp.programas WHERE id = $1', [PROGRAMA]);
    await admin.query('DELETE FROM srp.instituciones WHERE id = ANY($1)', [[INST_A, INST_B]]);
  });
});

test('cada perfil puede lo mismo en el servidor que en la aplicación, acción por acción y registro por registro', () => {
  const usuarios = Object.values(U).map((u) => ({ id: u.id, perfil: u.perfil, organizacion_id: u.organizacion_id }));
  // Y una cuenta con un perfil que no existe: no recibe nada en ningún lado
  usuarios.push({ id: id(), perfil: 'CONSULTA', organizacion_id: SEDEMA });
  const SRP = reglasDeLaAplicacion(usuarios);
  const autores = autoresDe(usuarios);
  const acciones = Object.keys(SRP.permisos.ACCIONES);
  assert.deepEqual(Object.keys(S.ACCIONES).sort(), [...acciones].sort(), 'las mismas acciones');
  // Lo que sólo existe en el servidor no está en la aplicación: cuando llegue a ella, pasa a ACCIONES
  for (const accion of Object.keys(S.ACCIONES_DEL_SERVIDOR)) assert.ok(!acciones.includes(accion), accion);
  // La bandeja de posibles duplicados la revisa sólo la Administración global
  assert.deepEqual([...new Set(usuarios.filter((u) => S.puede('duplicado.revisar', u)).map((u) => u.perfil))], ['ADMIN']);
  assert.deepEqual(Object.keys(S.PERFILES).sort(), Object.keys(SRP.PERFILES).sort(), 'los mismos perfiles');

  // Registros para los casos de borde: titular, relevo vigente y devuelto, cabos de apoyo vigentes y terminados,
  // institución escrita o no, estatus
  const personas = [U.CABO_S1.id, U.CABO_A1.id, U.COORD_S.id, id()];
  const apoyos = [[], [{ cabo_id: U.CABO_S3.id, hasta: null }], [{ cabo_id: U.CABO_S1.id, hasta: '2026-10-05T18:00:00.000Z' }, { cabo_id: U.CABO_B1.id, hasta: null }]];
  const objetos = [];
  for (const cabo_id of personas) for (const relevo_id of [null, U.CABO_S2.id]) for (const relevos of [[], [{ cabo_id: U.CABO_S3.id }], [{ cabo_id: U.CABO_B1.id }]])
    for (const cabos_apoyo of apoyos) for (const organizacion_id of [undefined, '', SEDEMA, INST_A]) for (const estatus of ['abierta', 'cerrada', 'activo', 'eliminado'])
      for (const sustituido_por_id of [null, id()]) objetos.push({ cabo_id, relevo_id, relevos, cabos_apoyo, organizacion_id, estatus, sustituido_por_id });

  let comparaciones = 0;
  const sinTexto = (p) => { const { descripcion, ...resto } = p; return resto; };
  for (const u of usuarios) {
    SRP.sesion.usuario = u;
    assert.deepEqual(sinTexto(S.capacidadesDe(u)), sinTexto(SRP.permisos.de(u)), 'capacidades de ' + u.perfil + ' en ' + u.organizacion_id);
    for (const x of objetos) {
      assert.equal(S.alcanza(u, x, autores), SRP.permisos.alcanza(u, x, SRP.ref.usuarioPorId), 'alcance de ' + u.perfil);
      for (const accion of acciones) {
        assert.equal(S.puede(accion, u, x, autores), SRP.permisos.puede(accion, x), accion + ' de ' + u.perfil + ' sobre ' + JSON.stringify(x));
        comparaciones++;
      }
      for (const jornada of objetos.slice(0, 48)) {
        assert.equal(S.veArbol(u, x, jornada, autores), veArbolEnLaAplicacion(SRP, u, x, jornada), 'ver un árbol, de ' + u.perfil);
      }
    }
  }
  assert.ok(comparaciones > 50_000, comparaciones + ' comparaciones');
});

test('la consulta en la base trae a cada cuenta lo mismo que le enseña la aplicación, con todos los datos que haya', async () => {
  const usuarios = (await admin.query('SELECT id, perfil, organizacion_id FROM srp.usuarios')).rows;
  const todasJ = (await admin.query('SELECT id, cabo_id, relevo_id, relevos, cabos_apoyo, organizacion_id FROM srp.jornadas')).rows;
  const todosT = (await admin.query('SELECT id, cabo_id, jornada_id FROM srp.plantaciones')).rows;
  const SRP = reglasDeLaAplicacion(usuarios);
  const jornadaPorId = new Map(todasJ.map((j) => [j.id, j]));
  for (const u of usuarios) {
    const p = new S.Parametros();
    const condJ = S.alcanceSql(u, 'jornadas', 'x', p);
    const enBaseJ = conjunto((await admin.query(`SELECT x.id FROM srp.jornadas x WHERE ${condJ}`, p.valores)).rows);
    const q = new S.Parametros();
    const condT = S.veArbolSql(u, 'x', q);
    const enBaseT = conjunto((await admin.query(`SELECT x.id FROM srp.plantaciones x WHERE ${condT}`, q.valores)).rows);
    const enAppJ = conjunto(todasJ.filter((j) => SRP.permisos.alcanza(u, j, SRP.ref.usuarioPorId)));
    const enAppT = conjunto(todosT.filter((t) => veArbolEnLaAplicacion(SRP, u, t, jornadaPorId.get(t.jornada_id))));
    assert.deepEqual([diferencia(enBaseJ, enAppJ), diferencia(enAppJ, enBaseJ)], [[], []], 'jornadas de ' + u.perfil + ' ' + u.id);
    assert.deepEqual([diferencia(enBaseT, enAppT), diferencia(enAppT, enBaseT)], [[], []], 'árboles de ' + u.perfil + ' ' + u.id);
  }
});

// Un cliente con su sesión, como la aplicación
async function sesion(nombre) {
  const r = await fetch(base + '/acceso/entrar', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ correo: U[nombre].correo, contrasena: CLAVE }) });
  const cookie = (r.headers.get('set-cookie') || '').split(';')[0];
  const pedir = async (ruta, metodo = 'GET') => { const x = await fetch(base + ruta, { method: metodo, headers: { cookie } }); return { estado: x.status, datos: await x.json() }; };
  // Todas las páginas de una consulta
  const todo = async (ruta, limite = 500) => {
    const filas = [];
    let despues = null, paginas = 0;
    do {
      const r2 = await pedir(ruta + '?limite=' + limite + (despues ? '&despues=' + despues : ''));
      assert.equal(r2.estado, 200);
      filas.push(...r2.datos.filas);
      despues = r2.datos.siguiente;
      paginas++;
    } while (despues);
    return { filas, paginas };
  };
  return { pedir, todo, estado: r.status };
}

test('cada cuenta consulta sólo lo suyo: el cabo, sus jornadas, las de sus relevos y las compartidas donde fue de apoyo; la coordinación y, fuera de la Secretaría, la dirección, su institución', async () => {
  const nuestras = (filas) => new Set(filas.map((f) => f.id).filter((x) => Object.values(J).some((j) => j.id === x) || Object.values(T).some((t) => t.id === x)));
  const nombres = (conj, tabla) => Object.entries(tabla).filter(([, v]) => conj.has(v.id)).map(([k]) => k).sort();
  const ver = async (nombre) => {
    const s = await sesion(nombre);
    assert.equal(s.estado, 200, 'entra ' + nombre);
    return { jornadas: nombres(nuestras((await s.todo('/jornadas')).filas), J), arboles: nombres(nuestras((await s.todo('/plantaciones')).filas), T) };
  };
  // Titular de J1 y J2, devuelto de J3: de J3 ve todos los árboles; de J2, que es suya, no el del relevo
  assert.deepEqual(await ver('CABO_S1'), { jornadas: ['J1', 'J2', 'J3'], arboles: ['T1', 'T2', 'T4', 'T5'] });
  // De la compartida J9, el cabo de apoyo vigente y el que ya terminó ven todos los árboles
  assert.deepEqual(await ver('CABO_S2'), { jornadas: ['J2', 'J8', 'J9'], arboles: ['T11', 'T12', 'T13', 'T2', 'T3'] });
  assert.deepEqual(await ver('CABO_S3'), { jornadas: ['J3', 'J9'], arboles: ['T11', 'T12', 'T13', 'T4'] });
  // La coordinación, todo lo de su institución: también J7, que dice la Secretaría
  assert.deepEqual(await ver('COORD_S'), { jornadas: ['J1', 'J2', 'J3', 'J6', 'J7', 'J8', 'J9'], arboles: ['T1', 'T11', 'T12', 'T13', 'T2', 'T3', 'T4', 'T5', 'T8'] });
  // La jornada J7 dice la Secretaría, aunque su árbol lo capturó un cabo de la institución A
  assert.deepEqual(await ver('DIR_A'), { jornadas: ['J4'], arboles: ['T10', 'T6', 'T9'] });
  assert.deepEqual(await ver('CABO_B1'), { jornadas: ['J5'], arboles: ['T7'] });
  const todas = { jornadas: Object.keys(J).sort(), arboles: Object.keys(T).sort() };
  assert.deepEqual(await ver('DIR_SEDEMA'), todas);
  assert.deepEqual(await ver('ADMIN'), todas);
});

test('cada cuenta ve los nombres de quien aparece en lo suyo; sólo la Administración ve todas, con su correo', async () => {
  const nuestras = (filas) => Object.entries(U).filter(([, v]) => filas.some((f) => f.id === v.id)).map(([k]) => k).sort();
  const ver = async (nombre) => {
    const r = await (await sesion(nombre)).pedir('/cuentas');
    assert.equal(r.estado, 200, nombre);
    return r.datos.filas;
  };
  const SIN_CORREO = ['activo', 'area_id', 'cargo_rol', 'id', 'nombre_completo', 'organizacion_id', 'perfil'];
  // El cabo: el relevo de su jornada y el titular de la jornada donde estuvo de relevo
  const s1 = await ver('CABO_S1');
  assert.deepEqual(nuestras(s1), ['CABO_S1', 'CABO_S2', 'CABO_S3']);
  assert.ok(s1.every((f) => JSON.stringify(Object.keys(f).sort()) === JSON.stringify(SIN_CORREO)), 'sin correo ni fechas');
  assert.deepEqual(nuestras(await ver('CABO_B1')), ['CABO_B1']);
  // La coordinación: su institución y quien estuvo de relevo en sus jornadas, aunque sea de otra
  assert.deepEqual(nuestras(await ver('COORD_S')), Object.keys(U).filter((k) => U[k].organizacion_id === SEDEMA).concat('CABO_A1').sort());
  assert.deepEqual(nuestras(await ver('DIR_A')), ['CABO_A1', 'COORD_A', 'DIR_A']);
  const dir = await ver('DIR_SEDEMA');
  assert.deepEqual(nuestras(dir), Object.keys(U).sort());
  assert.ok(dir.every((f) => !('correo' in f)), 'el directivo no ve correos');
  const adm = await ver('ADMIN');
  assert.deepEqual(nuestras(adm), Object.keys(U).sort());
  assert.ok(adm.every((f) => typeof f.correo === 'string'), 'la Administración ve el correo de cada cuenta');
  assert.equal((await (await sesion('TEMPORAL')).pedir('/cuentas')).datos.codigo, 'DEBE_CAMBIAR');
});

test('la consulta va por páginas, sin la fotografía y con las fechas como texto; pide sesión y la contraseña ya cambiada', async () => {
  const coord = await sesion('COORD_S');
  const enUna = await coord.todo('/plantaciones', 2000);
  const deA2 = await coord.todo('/plantaciones', 2);
  assert.ok(deA2.paginas >= 3, 'varias páginas');
  assert.deepEqual(deA2.filas.map((f) => f.id), enUna.filas.map((f) => f.id), 'las páginas, juntas y sin repetir, son la consulta completa');
  const s = await sesion('ADMIN');
  const todos = await s.todo('/plantaciones', 2000);
  const total = (await admin.query('SELECT count(*)::int AS n FROM srp.plantaciones')).rows[0].n;
  assert.equal(todos.filas.length, total, 'la Administración ve todos los árboles');
  const t1 = todos.filas.find((f) => f.id === T.T1.id);
  assert.ok(!('foto_base64' in t1), 'la fotografía no viaja en la lista');
  assert.equal(t1.fecha_plantacion, '2026-10-05');
  assert.equal(t1.fecha_registro, '2026-10-05T15:30:00+00:00');
  assert.equal(t1.lat, 19.4326);
  const j2 = (await s.todo('/jornadas', 2000)).filas.find((f) => f.id === J.J2.id);
  assert.deepEqual(j2.relevos, J.J2.relevos, 'los relevos, como los guarda el teléfono');

  assert.deepEqual([(await s.pedir('/jornadas?despues=no-es-un-id')).datos.codigo, (await s.pedir('/jornadas?limite=0')).datos.codigo], ['CONSULTA_INVALIDA', 'CONSULTA_INVALIDA']);
  assert.equal((await fetch(base + '/jornadas')).status, 401, 'sin sesión');
  const temporal = await sesion('TEMPORAL');
  assert.deepEqual([temporal.estado, (await temporal.pedir('/jornadas')).datos.codigo], [200, 'DEBE_CAMBIAR'], 'con la temporal sólo se cambia la contraseña');
});

test('sólo quien administra cuentas las administra: los demás reciben la frase de la aplicación', async () => {
  for (const nombre of ['CABO_S1', 'COORD_S', 'DIR_SEDEMA']) {
    const r = await (await sesion(nombre)).pedir('/cuentas/' + U.CABO_S3.id + '/restablecer', 'POST');
    assert.deepEqual(r, { estado: 403, datos: { codigo: 'SIN_PERMISO', mensaje: 'No tiene permiso para administrar las cuentas.' } }, nombre);
  }
});
