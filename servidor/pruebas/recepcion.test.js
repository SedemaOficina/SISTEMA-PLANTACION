/* RECEPCIÓN: el servidor recibe jornadas y árboles nuevos como los manda el teléfono. Los vuelve a ubicar,
   pone autor, institución y programa, asigna el folio por celda sin repetirlo nunca, y rechaza con los
   mensajes de los formularios de la aplicación. Reenviar no duplica nada. Crea sus cuentas, programas,
   jornadas y árboles, y al terminar los quita. */
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { conectar, limpiar } from './apoyo.js';
import { leerConfig, crearGrupo, crearApp, derivar } from '../dist/independiente.js';

const CORRIDA = Date.now();
const CLAVE = 'Recepcion de prueba 2026';
const uuid = () => crypto.randomUUID();
const cuenta = (nombre, perfil, organizacion_id) => ({ id: uuid(), nombre, perfil, organizacion_id, correo: nombre.toLowerCase() + '.recepcion.prueba.' + CORRIDA + '@ejemplo.local' });
const INST = 'o-prueba-rec-' + CORRIDA;
const CABO = cuenta('cabo', 'CABO', 'o-sedema');
const CABO2 = cuenta('otrocabo', 'CABO', 'o-sedema');
const EXTERNO = cuenta('externo', 'CABO', INST);
const DIRECTIVO = cuenta('directivo', 'DIRECTIVO', 'o-sedema');
const CUENTAS = [CABO, CABO2, EXTERNO, DIRECTIVO];
const PROG = 'p-prueba-rec-' + CORRIDA, PROG_EMP = 'p-prueba-rec-emp-' + CORRIDA, SOLICITUD = 'p-solicitud';
const SOLICITANTE = 's-prueba-rec-' + CORRIDA;
const PUNTO = { lat: 19.432600, lng: -99.133200 };
const MESES = ['ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN', 'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC'];

// Hoy y otros días en la Ciudad de México, como los ve el servidor
const diaDe = (fecha) => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Mexico_City' }).format(fecha);
const HOY = diaDe(new Date());
const dias = (n) => diaDe(new Date(Date.now() + n * 86_400_000));
const fechaCorta = (iso) => { const [a, m, d] = iso.split('-'); return d + '-' + MESES[Number(m) - 1] + '-' + a; };

let admin, grupo, servidor, base, ESPECIE, creoSolicitud = false;
const config = leerConfig({ SRP_COOKIE_SEGURA: 'no' });

before(async () => {
  admin = await conectar();
  await admin.query('GRANT srp_api TO CURRENT_USER WITH INHERIT FALSE, SET TRUE');
  ESPECIE = (await admin.query('SELECT id FROM srp.especies WHERE activo ORDER BY id LIMIT 1')).rows[0].id;
  await admin.query('BEGIN');
  await admin.query(`INSERT INTO srp.instituciones VALUES ('o-sedema', 'SEDEMA', 'Secretaría del Medio Ambiente', true, NULL, now(), NULL, NULL, 'Gobierno de la CDMX') ON CONFLICT DO NOTHING`);
  await admin.query(`INSERT INTO srp.instituciones VALUES ($1, $2, $3, true, NULL, now(), NULL, NULL, 'Empresa privada')`, [INST, 'PRUEBA_REC_' + CORRIDA, 'Empresa de prueba de recepción ' + CORRIDA]);
  await admin.query(`INSERT INTO srp.areas VALUES ('a-sia', 'SIA', 'Sistema de Información Ambiental', true, NULL, now(), NULL, NULL) ON CONFLICT DO NOTHING`);
  await admin.query(`INSERT INTO srp.programas VALUES ($1, $2, $3, true, NULL, now(), NULL, NULL, '{}')`, [PROG, 'PRUEBA_REC_' + CORRIDA, 'Programa de prueba de recepción ' + CORRIDA]);
  await admin.query(`INSERT INTO srp.programas VALUES ($1, $2, $3, true, NULL, now(), NULL, NULL, '{Empresa privada}')`, [PROG_EMP, 'PRUEBA_REC_EMP_' + CORRIDA, 'Programa de empresas de prueba ' + CORRIDA]);
  creoSolicitud = (await admin.query(`INSERT INTO srp.programas VALUES ($1, 'SOLICITUD_ESPECIAL', 'Solicitud especial', true, NULL, now(), NULL, NULL, '{}') ON CONFLICT DO NOTHING`, [SOLICITUD])).rowCount === 1;
  await admin.query(`INSERT INTO srp.solicitantes VALUES ($1, $2, $3, true, NULL, now(), NULL, NULL, 'Vecinos')`, [SOLICITANTE, 'PRUEBA_REC_' + CORRIDA, 'Vecinos de prueba ' + CORRIDA]);
  const derivada = await derivar(CLAVE);
  for (const u of CUENTAS) {
    await admin.query(`INSERT INTO srp.usuarios VALUES ($1, $2, $3, $4, $5, $6, $7, '{}', true, now(), $1, NULL, NULL)`,
      [u.id, u.correo, 'Prueba ' + u.nombre, u.organizacion_id, u.organizacion_id === 'o-sedema' ? 'a-sia' : null, u.perfil, u.perfil]);
    await admin.query(`INSERT INTO srp.credenciales VALUES ($1, $2, false, NULL, 0, NULL, now(), $1)`, [u.id, derivada]);
  }
  await admin.query('COMMIT');
  grupo = crearGrupo({ rol: 'srp_api' });
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
    await admin.query('DELETE FROM srp.plantaciones WHERE id = ANY($1::uuid[])', [arboles]);
    await admin.query('DELETE FROM srp.jornadas WHERE id = ANY($1::uuid[])', [jornadas]);
    for (const t of ['bitacora', 'bitacora_acceso']) await admin.query(`ALTER TABLE srp.${t} DISABLE TRIGGER bitacora_inmutable`);
    await admin.query('DELETE FROM srp.bitacora WHERE usuario_id = ANY($1::uuid[])', [ids]);
    await admin.query('DELETE FROM srp.bitacora_acceso WHERE usuario_id = ANY($1::uuid[])', [ids]);
    for (const t of ['bitacora', 'bitacora_acceso']) await admin.query(`ALTER TABLE srp.${t} ENABLE TRIGGER bitacora_inmutable`);
    await admin.query('DELETE FROM srp.usuarios WHERE id = ANY($1::uuid[])', [ids]);
    await admin.query('DELETE FROM srp.programas WHERE id = ANY($1)', [[PROG, PROG_EMP, ...(creoSolicitud ? [SOLICITUD] : [])]]);
    await admin.query('DELETE FROM srp.solicitantes WHERE id = $1', [SOLICITANTE]);
    await admin.query('DELETE FROM srp.instituciones WHERE id = $1', [INST]);
  });
});

// Un teléfono con su sesión, que manda operaciones
async function telefono(u) {
  const r = await fetch(base + '/acceso/entrar', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ correo: u.correo, contrasena: CLAVE }) });
  assert.equal(r.status, 200);
  const cookie = (r.headers.get('set-cookie') || '').split(';')[0];
  const enviar = async (operaciones) => {
    const x = await fetch(base + '/envios', { method: 'POST', headers: { cookie, 'content-type': 'application/json' }, body: JSON.stringify({ operaciones }) });
    return { estado: x.status, datos: await x.json() };
  };
  const una = async (tipo, datos) => (await enviar([{ tipo, datos }])).datos.resultados[0];
  return { enviar, una };
}

// Como los arma el teléfono, con lo que el servidor no debe creerle
const jornada = (extra = {}) => ({ id: uuid(), nombre: 'Jornada de prueba de recepción', ubicacion: 'Parque de prueba', programa_id: PROG, ...PUNTO,
  punto_origen: 'gps', gps_precision_m: 4.6, fecha: HOY, comentarios: '', arboles_previstos: 10, fecha_inicio: new Date().toISOString(),
  alcaldia: 'Inventada', cabo_id: uuid(), organizacion_id: 'o-otra', estatus: 'cerrada', ...extra });
const arbol = (jornadaId, extra = {}) => ({ id: uuid(), jornada_id: jornadaId, ...PUNTO, punto_origen: 'gps', gps_precision_m: 5, especie_id: ESPECIE, especie_otra: '',
  fecha_plantacion: HOY, comentarios: 'Árbol de prueba', fecha_registro: new Date().toISOString(),
  programa_id: 'p-otro', folio: 'XXX-000-00001', uga: 'ZZZ-999', alcaldia: 'Inventada', cabo_id: uuid(), estatus: 'eliminado', ...extra });

const ubicado = async () => (await admin.query('SELECT * FROM srp.derivar($1, $2)', [PUNTO.lat, PUNTO.lng])).rows[0];
const consecutivo = (folio) => Number(folio.slice(-5));
let J1, A1, A2;

test('una jornada y sus árboles llegan en un solo envío: el servidor los ubica, pone autor, institución y programa, y da folio', async () => {
  const t = await telefono(CABO);
  J1 = jornada();
  A1 = arbol(J1.id);
  A2 = arbol(J1.id);
  const r = await t.enviar([{ tipo: 'jornada.crear', datos: J1 }, { tipo: 'registro.crear', datos: A1 }, { tipo: 'registro.crear', datos: A2 }]);
  assert.equal(r.estado, 200);
  assert.deepEqual(r.datos.resultados.map((x) => [x.id, x.estado]), [[J1.id, 'recibido'], [A1.id, 'recibido'], [A2.id, 'recibido']]);
  const [j, a1, a2] = r.datos.resultados.map((x) => x.fila);
  const u = await ubicado();
  assert.deepEqual([j.cabo_id, j.encargado_id, j.organizacion_id, j.estatus, j.alcaldia, j.colonia, j.relevos, j.fecha],
    [CABO.id, CABO.id, 'o-sedema', 'abierta', u.alcaldia, u.colonia, [], HOY]);
  for (const a of [a1, a2]) {
    assert.deepEqual([a.cabo_id, a.estatus, a.programa_id, a.alcaldia, a.uga, a.capa_version, a.especie_id], [CABO.id, 'activo', PROG, u.alcaldia, u.uga, u.capa_version, ESPECIE]);
    assert.match(a.folio, new RegExp('^' + u.uga + '-\\d{5}$'), 'el folio es de la celda del punto');
    assert.ok(!('foto_base64' in a));
  }
  assert.equal(consecutivo(a2.folio), consecutivo(a1.folio) + 1, 'el consecutivo de la celda sólo avanza');
  // Lo que se congela con el folio, y la bitácora como la anota la aplicación
  const f = (await admin.query('SELECT folio, folio_uga, folio_capa_version, folio_lat::float8 AS lat, folio_lng::float8 AS lng FROM srp.folios WHERE plantacion_id = $1', [A1.id])).rows[0];
  assert.deepEqual(f, { folio: a1.folio, folio_uga: u.uga, folio_capa_version: u.capa_version, lat: PUNTO.lat, lng: PUNTO.lng });
  const bit = (await admin.query('SELECT entidad_id, accion, detalle FROM srp.bitacora WHERE entidad_id = ANY($1) ORDER BY entidad_id, accion', [[J1.id, A1.id]])).rows;
  assert.deepEqual(bit.filter((b) => b.entidad_id === J1.id).map((b) => [b.accion, b.detalle]), [['CREADO', 'Jornada «Jornada de prueba de recepción» del ' + fechaCorta(HOY)]]);
  assert.deepEqual(bit.filter((b) => b.entidad_id === A1.id).map((b) => [b.accion, b.detalle]), [['CREADO', ''], ['FOLIO_ASIGNADO', 'Folio ' + a1.folio]]);
});

test('reenviar lo ya recibido no duplica nada: la respuesta es la misma, con el mismo folio', async () => {
  const t = await telefono(CABO);
  const antes = (await admin.query('SELECT ultimo FROM srp.folio_secuencias WHERE celda = $1', [(await ubicado()).uga])).rows[0].ultimo;
  const r = await t.enviar([{ tipo: 'jornada.crear', datos: J1 }, { tipo: 'registro.crear', datos: A1 }, { tipo: 'registro.crear', datos: A2 }]);
  assert.ok(r.datos.resultados.every((x) => x.estado === 'recibido' && x.repetido));
  const folios = (await admin.query('SELECT id, folio FROM srp.plantaciones WHERE jornada_id = $1 ORDER BY folio', [J1.id])).rows;
  assert.equal(folios.length, 2);
  assert.deepEqual(r.datos.resultados.slice(1).map((x) => x.fila.folio).sort(), folios.map((x) => x.folio));
  assert.equal((await admin.query('SELECT ultimo FROM srp.folio_secuencias WHERE celda = $1', [(await ubicado()).uga])).rows[0].ultimo, antes, 'la secuencia no avanzó');
  // El mismo id con otro autor no se toma como suyo
  assert.equal((await (await telefono(CABO2)).una('registro.crear', A1)).codigo, 'YA_EXISTE');
});

test('el folio de una celda no se repite, aun con envíos al mismo tiempo', async () => {
  const t = await telefono(CABO);
  const r = await Promise.all(Array.from({ length: 12 }, () => t.una('registro.crear', arbol(J1.id))));
  const folios = r.map((x) => x.fila.folio);
  assert.equal(new Set(folios).size, 12, 'doce folios distintos');
  const numeros = folios.map(consecutivo).sort((a, b) => a - b);
  assert.equal(numeros[11] - numeros[0], 11, 'sin huecos cuando nada falla');
});

test('la jornada se rechaza con los mensajes del formulario de la aplicación', async () => {
  const t = await telefono(CABO);
  const mala = await t.una('jornada.crear', jornada({ nombre: '  ', lat: undefined, programa_id: '', arboles_previstos: 0, fecha: dias(2) }));
  assert.deepEqual([mala.estado, mala.codigo, mala.errores], ['rechazado', 'DATOS_INVALIDOS', [
    ['nombre', 'Escriba el nombre de la jornada: el parque, la calle o el sitio.'],
    ['lat', 'Ubique la jornada: use «Detectar ubicación de la jornada» o capture las coordenadas a mano.'],
    ['programa_id', 'Elija el programa de la jornada.'],
    ['arboles_previstos', 'Escriba cuántos árboles se van a plantar: un número entero mayor que cero.'],
    ['fecha', 'La fecha no puede ser posterior a hoy.'],
  ]]);
  assert.deepEqual((await t.una('jornada.crear', jornada({ lat: 25.0, lng: -100.0 }))).errores, [['lat', 'El punto está fuera de la Ciudad de México. Revise las coordenadas.']]);
  // Una empresa sólo usa los programas marcados para su tipo de institución
  const ext = await telefono(EXTERNO);
  assert.deepEqual((await ext.una('jornada.crear', jornada())).errores, [['programa_id', 'Ese programa no está disponible para su institución.']]);
  const suya = await ext.una('jornada.crear', jornada({ programa_id: PROG_EMP }));
  assert.deepEqual([suya.estado, suya.fila.organizacion_id], ['recibido', INST]);
  // Solicitud especial: quién lo solicita y de qué se trata; con otro programa, los tres van vacíos
  assert.deepEqual((await t.una('jornada.crear', jornada({ programa_id: SOLICITUD }))).errores, [['solicitante_id', 'Elija quién lo solicita.']]);
  assert.deepEqual((await t.una('jornada.crear', jornada({ programa_id: SOLICITUD, solicitante_id: SOLICITANTE }))).errores, [['solicitud_descripcion', 'Escriba de qué se trata la solicitud.']]);
  const otra = await t.una('jornada.crear', jornada({ programa_id: SOLICITUD, solicitante_id: null, solicitante_otro: ' Vecinos de la colonia ', solicitud_descripcion: 'Compensación' }));
  assert.deepEqual([otra.estado, otra.fila.solicitante_id, otra.fila.solicitante_otro, otra.fila.solicitud_descripcion], ['recibido', null, 'Vecinos de la colonia', 'Compensación']);
  const sin = await t.una('jornada.crear', jornada({ solicitante_id: SOLICITANTE, solicitante_otro: 'x', solicitud_descripcion: 'y' }));
  assert.deepEqual([sin.fila.solicitante_id, sin.fila.solicitante_otro, sin.fila.solicitud_descripcion], [null, '', '']);
});

test('el árbol se rechaza con los mensajes del formulario: fecha entre el inicio de la jornada y hoy, especie y ubicación', async () => {
  const t = await telefono(CABO);
  const J = jornada({ fecha: dias(-3) });
  assert.equal((await t.una('jornada.crear', J)).estado, 'recibido');
  const errores = async (extra) => (await t.una('registro.crear', arbol(J.id, extra))).errores;
  assert.deepEqual(await errores({ fecha_plantacion: dias(-4) }), [['fecha_plantacion', 'La fecha de plantación no puede ser anterior al inicio de la jornada (' + fechaCorta(dias(-3)) + ').']]);
  assert.deepEqual(await errores({ fecha_plantacion: dias(1) }), [['fecha_plantacion', 'La fecha de plantación no puede ser posterior a hoy.']]);
  assert.deepEqual(await errores({ fecha_plantacion: '2026-02-30' }), [['fecha_plantacion', 'Indique la fecha de plantación.']]);
  assert.deepEqual(await errores({ especie_id: null, especie_otra: ' ' }), [['especie_id', 'Elija una especie de la lista o la opción «Otra especie».']]);
  assert.deepEqual(await errores({ especie_id: 'ESP-9999' }), [['especie_id', 'Elija una especie de la lista o la opción «Otra especie».']]);
  assert.deepEqual(await errores({ lat: null }), [['lat', 'Falta la ubicación: use el botón de ubicación, toque el mapa o capture coordenadas.']]);
  assert.deepEqual(await errores({ lat: 25.0, lng: -100.0 }), [['lat', 'El punto está fuera de la Ciudad de México. Revise las coordenadas.']]);
  const escrita = await t.una('registro.crear', arbol(J.id, { especie_id: null, especie_otra: '  Ahuehuete raro ', fecha_plantacion: dias(-1) }));
  assert.deepEqual([escrita.estado, escrita.fila.especie_id, escrita.fila.especie_otra, escrita.fila.fecha_plantacion], ['recibido', null, 'Ahuehuete raro', dias(-1)]);
});

test('sólo quien tiene la jornada a su cargo registra en ella, y sólo quien registra inicia jornadas', async () => {
  const otro = await telefono(CABO2);
  const ajeno = arbol(J1.id);
  assert.deepEqual(await otro.una('registro.crear', ajeno), { id: ajeno.id, estado: 'rechazado', codigo: 'SIN_PERMISO', mensaje: 'No tiene permiso para registrar en esta jornada.' });
  const J = jornada();
  assert.deepEqual(await (await telefono(DIRECTIVO)).una('jornada.crear', J), { id: J.id, estado: 'rechazado', codigo: 'SIN_PERMISO', mensaje: 'No tiene permiso para iniciar jornadas.' });
  // Un árbol cuya jornada todavía no llega se recibirá después de ella
  assert.equal((await otro.una('registro.crear', arbol(uuid()))).codigo, 'JORNADA_PENDIENTE');
});

test('una operación rechazada no detiene a las demás del envío', async () => {
  const t = await telefono(CABO);
  const bueno = arbol(J1.id), malo = arbol(J1.id, { especie_id: null, especie_otra: '' });
  const r = await t.enviar([{ tipo: 'registro.crear', datos: malo }, { tipo: 'operacion.inventada', datos: { id: uuid() } }, { tipo: 'registro.crear', datos: bueno }]);
  assert.deepEqual(r.datos.resultados.map((x) => [x.estado, x.codigo ?? null]), [['rechazado', 'DATOS_INVALIDOS'], ['rechazado', 'OPERACION_DESCONOCIDA'], ['recibido', null]]);
  assert.equal(r.datos.resultados[1].mensaje, 'El servidor no reconoce la operación «operacion.inventada».');
});

test('el envío se revisa antes de procesarse: con sesión, con operaciones y no más de cien', async () => {
  const t = await telefono(CABO);
  assert.deepEqual([(await t.enviar([])).estado, (await t.enviar([])).datos.codigo], [400, 'SIN_OPERACIONES']);
  const muchas = Array.from({ length: 101 }, () => ({ tipo: 'registro.crear', datos: arbol(J1.id) }));
  assert.deepEqual([(await t.enviar(muchas)).estado, (await t.enviar(muchas)).datos.codigo], [413, 'DEMASIADAS']);
  const sin = await fetch(base + '/envios', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ operaciones: [] }) });
  assert.equal(sin.status, 401);
});

test('al llegar una celda a 99,999 deja de dar folios: el árbol se recibe y queda PROVISIONAL, sin reiniciar el contador', async () => {
  const t = await telefono(CABO);
  const celda = (await ubicado()).uga;
  const antes = (await admin.query('SELECT ultimo FROM srp.folio_secuencias WHERE celda = $1', [celda])).rows[0].ultimo;
  await admin.query('UPDATE srp.folio_secuencias SET ultimo = 99999 WHERE celda = $1', [celda]);
  try {
    const r = await t.una('registro.crear', arbol(J1.id));
    assert.deepEqual([r.estado, r.fila.folio, r.aviso], ['recibido', null, 'La celda ' + celda + ' llegó al tope de 99,999 folios: el árbol queda PROVISIONAL hasta que el SIA decida cómo seguir.']);
    assert.equal((await admin.query('SELECT ultimo FROM srp.folio_secuencias WHERE celda = $1', [celda])).rows[0].ultimo, 99999);
  } finally {
    // Sólo en la base local: la celda vuelve a donde estaba
    await admin.query('UPDATE srp.folio_secuencias SET ultimo = $2 WHERE celda = $1', [celda, antes]);
  }
});

test('un folio emitido no cambia ni se borra, ni siquiera para quien administra la base', async () => {
  await admin.query('BEGIN');
  try {
    await assert.rejects(admin.query('UPDATE srp.plantaciones SET folio = NULL WHERE id = $1', [A1.id]), /no cambia ni se anula/);
  } finally { await admin.query('ROLLBACK'); }
  await admin.query('BEGIN');
  try {
    await assert.rejects(admin.query('UPDATE srp.folios SET folio_lat = 0 WHERE plantacion_id = $1', [A1.id]), /no se edita ni se borra/);
  } finally { await admin.query('ROLLBACK'); }
  await admin.query('BEGIN');
  try {
    await assert.rejects(admin.query('DELETE FROM srp.folios WHERE plantacion_id = $1', [A1.id]), /no se edita ni se borra/);
  } finally { await admin.query('ROLLBACK'); }
});
