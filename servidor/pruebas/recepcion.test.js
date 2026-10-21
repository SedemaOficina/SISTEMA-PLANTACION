/* RECEPCIÓN: el servidor recibe jornadas y árboles como los manda el teléfono. Los vuelve a ubicar, pone
   autor, institución y programa, asigna el folio por celda sin repetirlo nunca, y rechaza con los mensajes
   de los formularios de la aplicación. Recibe también ediciones, eliminaciones, restauraciones,
   sustituciones y cambios de jornada, sin escribir sobre una versión vieja. Reenviar no duplica nada.
   Crea sus cuentas, programas, jornadas y árboles, y al terminar los quita. */
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { conectar, limpiar } from './apoyo.js';
import { leerConfig, crearGrupo, crearApp, derivar } from '../dist/independiente.js';

const CORRIDA = Date.now();
const CLAVE = 'Recepcion de prueba 2026';
const uuid = () => crypto.randomUUID();
const cuenta = (nombre, perfil, organizacion_id, coordinadores = []) => ({ id: uuid(), nombre, perfil, organizacion_id, coordinadores, correo: nombre.toLowerCase() + '.recepcion.prueba.' + CORRIDA + '@ejemplo.local' });
const INST = 'o-prueba-rec-' + CORRIDA;
const COORD = cuenta('coordinador', 'COORDINADOR', 'o-sedema');
const CABO = cuenta('cabo', 'CABO', 'o-sedema', [COORD.id]);
const CABO2 = cuenta('otrocabo', 'CABO', 'o-sedema');
const CABO3 = cuenta('cabotres', 'CABO', 'o-sedema', [COORD.id]);
const EXTERNO = cuenta('externo', 'CABO', INST);
const DIRECTIVO = cuenta('directivo', 'DIRECTIVO', 'o-sedema');
const CUENTAS = [COORD, CABO, CABO2, CABO3, EXTERNO, DIRECTIVO];
const PROG = 'p-prueba-rec-' + CORRIDA, PROG2 = 'p-prueba-rec-2-' + CORRIDA, PROG_EMP = 'p-prueba-rec-emp-' + CORRIDA, SOLICITUD = 'p-solicitud';
const SOLICITANTE = 's-prueba-rec-' + CORRIDA;
const VEHICULO = { id: 'v-prueba-rec-' + CORRIDA, placa: 'PR ' + String(CORRIDA).slice(-6) };
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
  await admin.query('SET CONSTRAINTS ALL DEFERRED');
  await admin.query(`INSERT INTO srp.instituciones VALUES ('o-sedema', 'SEDEMA', 'Secretaría del Medio Ambiente', true, NULL, now(), NULL, NULL, 'Gobierno de la CDMX') ON CONFLICT DO NOTHING`);
  await admin.query(`INSERT INTO srp.instituciones VALUES ($1, $2, $3, true, NULL, now(), NULL, NULL, 'Empresa privada')`, [INST, 'PRUEBA_REC_' + CORRIDA, 'Empresa de prueba de recepción ' + CORRIDA]);
  await admin.query(`INSERT INTO srp.areas VALUES ('a-sia', 'SIA', 'Sistema de Información Ambiental', true, NULL, now(), NULL, NULL) ON CONFLICT DO NOTHING`);
  await admin.query(`INSERT INTO srp.programas VALUES ($1, $2, $3, true, NULL, now(), NULL, NULL, '{}')`, [PROG, 'PRUEBA_REC_' + CORRIDA, 'Programa de prueba de recepción ' + CORRIDA]);
  await admin.query(`INSERT INTO srp.programas VALUES ($1, $2, $3, true, NULL, now(), NULL, NULL, '{}')`, [PROG2, 'PRUEBA_REC_2_' + CORRIDA, 'Otro programa de prueba ' + CORRIDA]);
  await admin.query(`INSERT INTO srp.programas VALUES ($1, $2, $3, true, NULL, now(), NULL, NULL, '{Empresa privada}')`, [PROG_EMP, 'PRUEBA_REC_EMP_' + CORRIDA, 'Programa de empresas de prueba ' + CORRIDA]);
  creoSolicitud = (await admin.query(`INSERT INTO srp.programas VALUES ($1, 'SOLICITUD_ESPECIAL', 'Solicitud especial', true, NULL, now(), NULL, NULL, '{}') ON CONFLICT DO NOTHING`, [SOLICITUD])).rowCount === 1;
  await admin.query(`INSERT INTO srp.solicitantes VALUES ($1, $2, $3, true, NULL, now(), NULL, NULL, 'Vecinos')`, [SOLICITANTE, 'PRUEBA_REC_' + CORRIDA, 'Vecinos de prueba ' + CORRIDA]);
  await admin.query(`INSERT INTO srp.vehiculos VALUES ($1, $2, $3, true, NULL, now(), NULL, NULL, 'Modelo de prueba', 'Pipa')`, [VEHICULO.id, VEHICULO.placa.replace(' ', ''), VEHICULO.placa]);
  const derivada = await derivar(CLAVE);
  for (const u of CUENTAS) {
    await admin.query(`INSERT INTO srp.usuarios VALUES ($1, $2, $3, $4, $5, $6, $7, $8, true, now(), $1, NULL, NULL)`,
      [u.id, u.correo, 'Prueba ' + u.nombre, u.organizacion_id, u.organizacion_id === 'o-sedema' ? 'a-sia' : null, u.perfil, u.perfil, u.coordinadores]);
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
    await admin.query('DELETE FROM srp.programas WHERE id = ANY($1)', [[PROG, PROG2, PROG_EMP, ...(creoSolicitud ? [SOLICITUD] : [])]]);
    await admin.query('DELETE FROM srp.solicitantes WHERE id = $1', [SOLICITANTE]);
    await admin.query('DELETE FROM srp.vehiculos WHERE id = $1', [VEHICULO.id]);
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
  // Nada antes del 01-OCT-2024, cuando empezó el programa: tampoco el año tecleado con dos cifras. Una fecha imposible no truena
  const NO_ANTES = 'La fecha no puede ser anterior al 01-OCT-2024, cuando empezó el programa.';
  for (const fecha of ['0026-10-19', '1900-01-01', '2024-09-30']) assert.deepEqual((await t.una('jornada.crear', jornada({ fecha }))).errores, [['fecha', NO_ANTES]], fecha);
  assert.equal((await t.una('jornada.crear', jornada({ fecha: '2024-10-01' }))).estado, 'recibido', 'el día en que empezó, sí');
  for (const fecha of ['2026-13-45', '2026-00-00']) assert.deepEqual((await t.una('jornada.crear', jornada({ fecha }))).errores, [['fecha', 'Indique la fecha de la jornada.']], fecha);
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
  assert.deepEqual(await errores({ fecha_plantacion: '2026-13-45' }), [['fecha_plantacion', 'Indique la fecha de plantación.']], 'una fecha imposible no truena');
  assert.deepEqual(await errores({ especie_id: null, especie_otra: ' ' }), [['especie_id', 'Elija una especie de la lista o la opción «Otra especie».']]);
  assert.deepEqual(await errores({ especie_id: 'ESP-9999' }), [['especie_id', 'Elija una especie de la lista o la opción «Otra especie».']]);
  assert.deepEqual(await errores({ lat: null }), [['lat', 'Falta la ubicación: use el botón de ubicación, toque el mapa o capture coordenadas.']]);
  assert.deepEqual(await errores({ lat: 25.0, lng: -100.0 }), [['lat', 'El punto está fuera de la Ciudad de México. Revise las coordenadas.']]);
  const escrita = await t.una('registro.crear', arbol(J.id, { especie_id: null, especie_otra: '  Ahuehuete raro ', fecha_plantacion: dias(-1) }));
  assert.deepEqual([escrita.estado, escrita.fila.especie_id, escrita.fila.especie_otra, escrita.fila.fecha_plantacion], ['recibido', null, 'Ahuehuete raro', dias(-1)]);
});

test('un valor del catálogo que se desactivó se nombra en el rechazo: especie, programa, solicitante y vehículo', async () => {
  const ESP_OFF = 'ESP-8' + String(CORRIDA).slice(-3);
  await admin.query(`INSERT INTO srp.especies SELECT (jsonb_populate_record(NULL::srp.especies, to_jsonb(e) || jsonb_build_object('id', $1::text, 'clave', $1::text, 'nombre', $2::text, 'nombre_cientifico', $2::text || ' sp.', 'activo', false))).*
    FROM srp.especies e WHERE id = $3`, [ESP_OFF, 'Especie retirada ' + CORRIDA, ESPECIE]);
  try {
    const t = await telefono(CABO);
    const J = jornada({ fecha: dias(-1) });
    assert.equal((await t.una('jornada.crear', J)).estado, 'recibido');
    assert.deepEqual((await t.una('registro.crear', arbol(J.id, { especie_id: ESP_OFF }))).errores,
      [['especie_id', 'La especie «Especie retirada ' + CORRIDA + '» se desactivó en el catálogo: elija otra de la lista o la opción «Otra especie».']]);
    const { J: C } = await conArbol(t);
    let version = (await admin.query("SELECT to_jsonb(j) ->> 'fecha_inicio' AS v FROM srp.jornadas j WHERE id = $1", [C.id])).rows[0].v;
    version = (await t.una('jornada.cerrar', { id: C.id, version })).version;
    await admin.query('UPDATE srp.programas SET activo = false WHERE id = $1', [PROG2]);
    await admin.query('UPDATE srp.solicitantes SET activo = false WHERE id = $1', [SOLICITANTE]);
    await admin.query('UPDATE srp.vehiculos SET activo = false WHERE id = $1', [VEHICULO.id]);
    assert.deepEqual((await t.una('jornada.crear', jornada({ programa_id: PROG2 }))).errores,
      [['programa_id', 'El programa «Otro programa de prueba ' + CORRIDA + '» se desactivó en el catálogo: elija otro.']]);
    assert.deepEqual((await t.una('jornada.crear', jornada({ programa_id: SOLICITUD, solicitante_id: SOLICITANTE, solicitud_descripcion: 'Compensación' }))).errores,
      [['solicitante_id', '«Vecinos de prueba ' + CORRIDA + '» se desactivó en el catálogo de solicitantes: elija otro.']]);
    assert.deepEqual((await t.una('jornada.cierre', { id: C.id, version, vehiculo_id: VEHICULO.id })).errores,
      [['vehiculo_id', 'El vehículo «' + VEHICULO.placa + '» se desactivó en el catálogo: elija otro.']]);
    // Lo que no existe sigue diciendo que se elija de la lista
    assert.deepEqual((await t.una('registro.crear', arbol(J.id, { especie_id: 'ESP-9999' }))).errores, [['especie_id', 'Elija una especie de la lista o la opción «Otra especie».']]);
  } finally {
    await admin.query('UPDATE srp.programas SET activo = true WHERE id = $1', [PROG2]);
    await admin.query('UPDATE srp.solicitantes SET activo = true WHERE id = $1', [SOLICITANTE]);
    await admin.query('UPDATE srp.vehiculos SET activo = true WHERE id = $1', [VEHICULO.id]);
    await admin.query('DELETE FROM srp.especies WHERE id = $1', [ESP_OFF]);
  }
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
  let r;
  try {
    r = await t.una('registro.crear', arbol(J1.id));
    assert.deepEqual([r.estado, r.fila.folio, r.aviso], ['recibido', null, 'La celda ' + celda + ' llegó al tope de 99,999 folios: el árbol queda PROVISIONAL hasta que el SIA decida cómo seguir.']);
    assert.equal((await admin.query('SELECT ultimo FROM srp.folio_secuencias WHERE celda = $1', [celda])).rows[0].ultimo, 99999);
  } finally {
    // Sólo en la base local: la celda vuelve a donde estaba
    await admin.query('UPDATE srp.folio_secuencias SET ultimo = $2 WHERE celda = $1', [celda, antes]);
  }
  // Cuando la celda vuelve a dar folios, el árbol PROVISIONAL recibe el suyo al editarlo
  const e = await t.una('registro.editar', { id: r.fila.id, version: r.version, cambios: { comentarios: 'Ya con folio' } });
  assert.deepEqual([e.estado, e.fila.folio], ['recibido', celda + '-' + String(antes + 1).padStart(5, '0')]);
  assert.deepEqual((await bitacora(r.fila.id)).map((b) => b[0]), ['CREADO', 'EDITADO', 'FOLIO_ASIGNADO']);
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

test('los textos llevan los largos del formulario de la aplicación', async () => {
  const t = await telefono(CABO);
  const larga = await t.una('jornada.crear', jornada({ nombre: 'n'.repeat(121), ubicacion: 'u'.repeat(201), comentarios: 'c'.repeat(501) }));
  assert.deepEqual(larga.errores, [['nombre', 'El nombre lleva hasta 120 caracteres.'], ['ubicacion', 'La dirección lleva hasta 200 caracteres.'],
    ['comentarios', 'Los comentarios llevan hasta 500 caracteres.']]);
  const { J, A, version } = await conArbol(t);
  assert.deepEqual((await t.una('registro.editar', { id: A.id, version, cambios: { especie_id: null, especie_otra: 'e'.repeat(121) } })).errores,
    [['especie_id', 'El nombre de la especie lleva hasta 120 caracteres.']]);
  assert.deepEqual((await t.una('jornada.editar', { id: J.id, version: J.fecha_inicio, cambios: { nombre: 'n'.repeat(121) } })).errores,
    [['nombre', 'El nombre lleva hasta 120 caracteres.']]);
});

/* ---------- Lo que se le hace a un árbol que ya está en el servidor ---------- */

// Una jornada con un árbol, ya recibidos; devuelve los dos como quedaron y la versión del árbol
async function conArbol(t, extraJornada = {}, extraArbol = {}) {
  const J = jornada(extraJornada);
  const A = arbol(J.id, { fecha_plantacion: J.fecha, ...extraArbol });
  const r = await t.enviar([{ tipo: 'jornada.crear', datos: J }, { tipo: 'registro.crear', datos: A }]);
  assert.ok(r.datos.resultados.every((x) => x.estado === 'recibido'), JSON.stringify(r.datos));
  return { J: r.datos.resultados[0].fila, A: r.datos.resultados[1].fila, version: r.datos.resultados[1].version };
}
const bitacora = async (id) => (await admin.query('SELECT accion, detalle FROM srp.bitacora WHERE entidad_id = $1 ORDER BY fecha, accion', [id])).rows.map((b) => [b.accion, b.detalle]);

test('editar aplica sólo lo que cambió sobre lo vigente: el territorio se recalcula, el folio no cambia y una versión vieja no escribe', async () => {
  const t = await telefono(CABO);
  const { A, version } = await conArbol(t);
  const otro = { lat: 19.350000, lng: -99.160000 };
  const r = await t.una('registro.editar', { id: A.id, version, cambios: { ...otro, comentarios: '  Corregido  ' } });
  assert.equal(r.estado, 'recibido', JSON.stringify(r));
  const u2 = (await admin.query('SELECT * FROM srp.derivar($1, $2)', [otro.lat, otro.lng])).rows[0];
  assert.deepEqual([r.fila.comentarios, r.fila.alcaldia, r.fila.uga, r.fila.folio, r.fila.editado_por_id], ['Corregido', u2.alcaldia, u2.uga, A.folio, CABO.id]);
  assert.notEqual(r.version, version);
  assert.equal(Number((await admin.query('SELECT folio_lat FROM srp.folios WHERE plantacion_id = $1', [A.id])).rows[0].folio_lat), PUNTO.lat, 'lo congelado con el folio no se mueve');
  const editado = (await bitacora(A.id)).find((b) => b[0] === 'EDITADO')[1];
  assert.match(editado, /^Campos: lat, lng, comentarios\. Punto: 19\.432600, -99\.133200 → 19\.350000, -99\.160000\. Territorio recalculado: alcaldia .+; uga /);
  // Reenviar el mismo cambio no lo repite
  const otraVez = await t.una('registro.editar', { id: A.id, version, cambios: { ...otro, comentarios: 'Corregido' } });
  assert.deepEqual([otraVez.estado, otraVez.repetido], ['recibido', true]);
  // Otro cambio sobre la versión de antes no escribe: devuelve lo vigente, con su versión
  const viejo = await t.una('registro.editar', { id: A.id, version, cambios: { comentarios: 'Escrito sobre lo viejo' } });
  assert.deepEqual([viejo.estado, viejo.codigo, viejo.fila.comentarios, viejo.version], ['rechazado', 'VERSION_VIEJA', 'Corregido', r.version]);
  assert.equal((await t.una('registro.editar', { id: A.id, cambios: { comentarios: 'Sin versión' } })).codigo, 'VERSION_VIEJA');
  // Con la versión vigente, las reglas del formulario
  const mala = await t.una('registro.editar', { id: A.id, version: r.version, cambios: { fecha_plantacion: dias(1), especie_id: null, especie_otra: '' } });
  assert.deepEqual(mala.errores, [['especie_id', 'Elija una especie de la lista o la opción «Otra especie».'], ['fecha_plantacion', 'La fecha de plantación no puede ser posterior a hoy.']]);
  assert.equal((await t.una('registro.editar', { id: uuid(), version, cambios: {} })).codigo, 'NO_EXISTE');
  // Una corrección que al final dejó todo igual llega vacía: se reconoce y trae la versión vigente, que toma el cambio siguiente
  const vacia = await t.una('registro.editar', { id: A.id, version, cambios: {} });
  assert.deepEqual([vacia.estado, vacia.repetido, vacia.version], ['recibido', true, r.version]);
});

test('eliminar y restaurar se deshacen entre sí, cada uno sobre la versión vigente; el reporte de la jornada deja de estar vigente', async () => {
  const t = await telefono(CABO);
  const { J, A, version } = await conArbol(t, { fecha: dias(-2) });
  await admin.query('UPDATE srp.jornadas SET reporte_en = now() WHERE id = $1', [J.id]);
  const e = await t.una('registro.eliminar', { id: A.id, version });
  assert.deepEqual([e.estado, e.fila.estatus, e.fila.folio], ['recibido', 'eliminado', A.folio]);
  assert.deepEqual(e.otras.map((o) => [o.tabla, o.fila.id, o.fila.reporte_en]), [['jornadas', J.id, null]]);
  assert.equal((await t.una('registro.eliminar', { id: A.id, version })).repetido, true, 'un reenvío no se repite');
  assert.equal((await t.una('registro.editar', { id: A.id, version: e.version, cambios: { comentarios: 'x' } })).codigo, 'NO_ACTIVO');
  // Si la jornada ahora empieza después, al restaurarlo toma su fecha
  await admin.query('UPDATE srp.jornadas SET fecha = $2 WHERE id = $1', [J.id, dias(-1)]);
  const r = await t.una('registro.restaurar', { id: A.id, version: e.version });
  assert.deepEqual([r.estado, r.fila.estatus, r.fila.fecha_plantacion], ['recibido', 'activo', dias(-1)]);
  assert.deepEqual((await bitacora(A.id)).filter((b) => ['ELIMINADO', 'RESTAURADO'].includes(b[0])), [['ELIMINADO', ''], ['RESTAURADO', 'Se deshizo la eliminación']]);
  assert.ok((await bitacora(J.id)).some((b) => b[1] === 'Su reporte deja de estar vigente: se eliminó un árbol'));
});

test('la sustitución entra en la jornada del original con su folio y lo deja sustituido; eliminar el sustituto lo devuelve, y restaurarlo lo vuelve a sustituir', async () => {
  const t = await telefono(CABO);
  const { J, A } = await conArbol(t, { fecha: dias(-2) });
  const especie = (await admin.query('SELECT nombre FROM srp.especies WHERE id = $1', [ESPECIE])).rows[0].nombre;
  const S = { id: uuid(), sustituye_id: A.id, motivo_sustitucion: 'OTRO', motivo_sustitucion_otro: ' Lo atropelló una grúa ', fecha_plantacion: HOY, ...PUNTO,
    punto_origen: 'gps', gps_precision_m: 3, especie_id: ESPECIE, comentarios: 'Árbol de prueba', fecha_registro: new Date().toISOString() };
  // Primero las reglas del diálogo de sustitución
  const errores = async (extra) => (await t.una('registro.sustituir', { ...S, id: uuid(), ...extra })).errores;
  assert.deepEqual(await errores({ motivo_sustitucion: '' }), [['motivo_sustitucion', 'Elija por qué se sustituye.']]);
  assert.deepEqual(await errores({ motivo_sustitucion_otro: '' }), [['motivo_sustitucion_otro', 'Escriba el motivo.']]);
  assert.deepEqual(await errores({ fecha_plantacion: dias(-3) }), [['fecha_plantacion', 'La fecha de la sustitución no puede ser anterior a la plantación del árbol perdido (' + fechaCorta(dias(-2)) + ').']]);
  const r = await t.una('registro.sustituir', S);
  assert.equal(r.estado, 'recibido', JSON.stringify(r));
  assert.deepEqual([r.fila.sustituye_id, r.fila.jornada_id, r.fila.programa_id, r.fila.motivo_sustitucion, r.fila.motivo_sustitucion_otro, r.fila.fecha_plantacion],
    [A.id, J.id, PROG, 'OTRO', 'Lo atropelló una grúa', HOY]);
  assert.match(r.fila.folio, /^[A-Z]{3}-\d{3}-\d{5}$/, 'el sustituto tiene su propio folio');
  assert.deepEqual(r.otras.map((o) => [o.fila.id, o.fila.estatus, o.fila.sustituido_por_id]), [[A.id, 'sustituido', S.id]]);
  assert.deepEqual((await bitacora(S.id)).find((b) => b[0] === 'CREADO'), ['CREADO', 'Sustituye a ' + especie + ' (' + A.folio + '): Otro: Lo atropelló una grúa']);
  assert.deepEqual((await bitacora(A.id)).find((b) => b[0] === 'SUSTITUIDO'), ['SUSTITUIDO', 'Sustituido por ' + especie + ': Otro: Lo atropelló una grúa']);
  assert.equal((await t.una('registro.sustituir', { ...S, id: uuid() })).codigo, 'NO_SUSTITUIBLE', 'no se sustituye dos veces');
  // Eliminar el sustituto devuelve al original; restaurarlo lo vuelve a sustituir
  const e = await t.una('registro.eliminar', { id: S.id, version: r.version });
  assert.deepEqual(e.otras.map((o) => [o.fila.id, o.fila.estatus, o.fila.sustituido_por_id]), [[A.id, 'activo', null]]);
  const v = await t.una('registro.restaurar', { id: S.id, version: e.version });
  assert.deepEqual(v.otras.map((o) => [o.fila.id, o.fila.estatus, o.fila.sustituido_por_id]), [[A.id, 'sustituido', S.id]]);
  assert.deepEqual((await bitacora(A.id)).filter((b) => ['RESTAURADO', 'SUSTITUIDO'].includes(b[0])).map((b) => b[1]).sort(), [
    'Se eliminó su sustituto: vuelve a contar como plantado', 'Sustituido por ' + especie + ': Otro: Lo atropelló una grúa', 'Vuelve su sustituto: Otro: Lo atropelló una grúa']);
});

test('mover lleva el árbol a otra jornada del mismo cabo, con la fecha y el programa de esa jornada; la de origen pierde su marca de revisado', async () => {
  const t = await telefono(CABO);
  const { J, A, version } = await conArbol(t, { fecha: dias(-3), nombre: 'Jornada de origen' });
  const D = jornada({ fecha: dias(-1), nombre: 'Jornada de destino', programa_id: PROG2 });
  assert.equal((await t.una('jornada.crear', D)).estado, 'recibido');
  await admin.query('UPDATE srp.jornadas SET puntos_revisados = ARRAY[$2::uuid] WHERE id = $1', [J.id, A.id]);
  const m = await t.una('registro.mover', { id: A.id, version, jornada_id: D.id });
  assert.deepEqual([m.estado, m.fila.jornada_id, m.fila.fecha_plantacion, m.fila.programa_id, m.fila.folio], ['recibido', D.id, dias(-1), PROG2, A.folio]);
  assert.deepEqual(m.otras.map((o) => [o.fila.id, o.fila.puntos_revisados]), [[J.id, []]]);
  assert.deepEqual((await bitacora(A.id)).find((b) => b[0] === 'EDITADO'), ['EDITADO', 'Movido a la jornada «Jornada de destino»; toma su fecha y su programa']);
  assert.deepEqual((await bitacora(J.id)).find((b) => b[0] === 'EDITADO'), ['EDITADO', 'Sale un punto revisado: se movió a «Jornada de destino»']);
  assert.equal((await t.una('registro.mover', { id: A.id, version, jornada_id: D.id })).repetido, true, 'un reenvío no se repite');
  const ajena = jornada({ nombre: 'Jornada de otro cabo' });
  assert.equal((await (await telefono(CABO2)).una('jornada.crear', ajena)).estado, 'recibido');
  assert.equal((await t.una('registro.mover', { id: A.id, version: m.version, jornada_id: ajena.id })).codigo, 'OTRO_CABO');
});

test('cada quien cambia lo de su alcance: la coordinación, lo de su cuadrilla; otro cabo y la dirección, nada', async () => {
  const t = await telefono(CABO);
  const { A, version } = await conArbol(t);
  const ajeno = await (await telefono(CABO2)).una('registro.editar', { id: A.id, version, cambios: { comentarios: 'x' } });
  assert.deepEqual([ajeno.codigo, ajeno.mensaje], ['SIN_PERMISO', 'No tiene permiso para editar este registro.']);
  assert.equal((await (await telefono(DIRECTIVO)).una('registro.eliminar', { id: A.id, version })).codigo, 'SIN_PERMISO');
  const coord = await (await telefono(COORD)).una('registro.editar', { id: A.id, version, cambios: { comentarios: 'Lo corrige la coordinación' } });
  assert.deepEqual([coord.estado, coord.fila.comentarios, coord.fila.editado_por_id, coord.fila.cabo_id], ['recibido', 'Lo corrige la coordinación', COORD.id, CABO.id]);
});

/* ---------- La vida de la jornada ---------- */

test('editar la jornada: sus árboles del día de inicio toman la fecha nueva y todos el programa nuevo; no puede empezar después de un árbol de otro día', async () => {
  const t = await telefono(CABO);
  const { J, A } = await conArbol(t, { fecha: dias(-3) });
  const B = (await t.una('registro.crear', arbol(J.id, { fecha_plantacion: dias(-2) }))).fila;
  const version = (await admin.query("SELECT to_jsonb(j) ->> 'fecha_inicio' AS v FROM srp.jornadas j WHERE id = $1", [J.id])).rows[0].v;
  const errores = async (cambios) => (await t.una('jornada.editar', { id: J.id, version, cambios })).errores;
  assert.deepEqual(await errores({ nombre: ' ', arboles_previstos: 0 }), [['nombre', 'Escriba el nombre de la jornada.'], ['arboles_previstos', 'Escriba cuántos árboles se van a plantar: un entero mayor que cero.']]);
  assert.deepEqual(await errores({ fecha: dias(-1) }), [['fecha', 'Hay árboles de esta jornada plantados el ' + fechaCorta(dias(-2)) + ': la jornada no puede empezar después de ese día.']]);
  const r = await t.una('jornada.editar', { id: J.id, version, cambios: { nombre: 'Jornada renombrada', programa_id: PROG2, fecha: dias(-2) } });
  assert.equal(r.estado, 'recibido', JSON.stringify(r));
  assert.deepEqual([r.fila.nombre, r.fila.programa_id, r.fila.fecha], ['Jornada renombrada', PROG2, dias(-2)]);
  const porId = Object.fromEntries(r.otras.map((o) => [o.fila.id, o.fila]));
  assert.deepEqual([porId[A.id].fecha_plantacion, porId[A.id].programa_id, porId[B.id].fecha_plantacion, porId[B.id].programa_id], [dias(-2), PROG2, dias(-2), PROG2]);
  const programa = 'Otro programa de prueba ' + CORRIDA;
  assert.deepEqual((await bitacora(J.id)).find((b) => b[0] === 'EDITADO'), ['EDITADO', 'Campos: nombre, programa_id, fecha']);
  assert.deepEqual((await bitacora(A.id)).find((b) => b[0] === 'EDITADO'), ['EDITADO', 'Por cambio de la jornada: fecha ' + fechaCorta(dias(-2)) + ' y programa ' + programa]);
  assert.deepEqual((await bitacora(B.id)).find((b) => b[0] === 'EDITADO'), ['EDITADO', 'Por cambio de la jornada: programa ' + programa]);
  // Sobre la versión de antes no escribe; el mismo cambio otra vez, tampoco
  assert.equal((await t.una('jornada.editar', { id: J.id, version, cambios: { comentarios: 'Escrito sobre lo viejo' } })).codigo, 'VERSION_VIEJA');
  assert.equal((await t.una('jornada.editar', { id: J.id, version, cambios: { nombre: 'Jornada renombrada' } })).repetido, true);
});

test('cerrar y reabrir; los datos de cierre y el reporte son de una jornada cerrada, y reabrirla deja sin vigencia el reporte', async () => {
  const t = await telefono(CABO);
  const { J } = await conArbol(t);
  let version = (await admin.query("SELECT to_jsonb(j) ->> 'fecha_inicio' AS v FROM srp.jornadas j WHERE id = $1", [J.id])).rows[0].v;
  assert.equal((await t.una('jornada.cierre', { id: J.id, version, personal: 'Cuadrilla 1' })).codigo, 'NO_CERRADA');
  assert.equal((await t.una('jornada.reporte', { id: J.id, version })).codigo, 'NO_CERRADA');
  const cerrada = await t.una('jornada.cerrar', { id: J.id, version });
  assert.deepEqual([cerrada.estado, cerrada.fila.estatus, !!cerrada.fila.fecha_cierre], ['recibido', 'cerrada', true]);
  assert.equal((await t.una('jornada.cerrar', { id: J.id, version })).repetido, true, 'un reenvío no se repite');
  assert.equal((await t.una('registro.crear', arbol(J.id))).codigo, 'SIN_PERMISO', 'en una jornada cerrada no se registra');
  version = cerrada.version;
  assert.deepEqual((await t.una('jornada.cierre', { id: J.id, version, hora: '25:00' })).errores, [['hora', 'Escriba la hora como 14:30.']]);
  const cierre = await t.una('jornada.cierre', { id: J.id, version, personal: ' Cuadrilla 1 ', observaciones: 'Sin novedad', hora: '14:30', vehiculo_id: VEHICULO.id, encargado_id: CABO2.id });
  assert.deepEqual([cierre.estado, cierre.fila.personal, cierre.fila.hora, cierre.fila.vehiculo_placa, cierre.fila.vehiculo_modelo, cierre.fila.vehiculo_tipo, cierre.fila.encargado_id],
    ['recibido', 'Cuadrilla 1', '14:30', VEHICULO.placa, 'Modelo de prueba', 'Pipa', CABO.id], 'el encargado de un cabo es él mismo; el vehículo se copia del catálogo');
  const reporte = await t.una('jornada.reporte', { id: J.id, version: cierre.version });
  assert.ok(reporte.fila.reporte_en, 'el reporte queda entregado');
  assert.equal((await t.una('jornada.reporte', { id: J.id, version: cierre.version })).repetido, true);
  const reabierta = await t.una('jornada.reabrir', { id: J.id, version: reporte.version });
  assert.deepEqual([reabierta.fila.estatus, reabierta.fila.fecha_cierre, reabierta.fila.reporte_en], ['abierta', null, null]);
  assert.deepEqual((await bitacora(J.id)).filter((b) => b[0] === 'EDITADO').map((b) => b[1]),
    ['Jornada cerrada', 'Datos de cierre del reporte', 'Reporte generado', 'Jornada reabierta; su reporte deja de estar vigente']);
  // Personal, apoyo, chófer y vehículo, sólo en las jornadas de la Secretaría
  const ext = await telefono(EXTERNO);
  const E = jornada({ programa_id: PROG_EMP });
  const ce = await ext.una('jornada.cerrar', { id: E.id, version: (await ext.una('jornada.crear', E)).version });
  assert.deepEqual((await ext.una('jornada.cierre', { id: E.id, version: ce.version, chofer: 'Alguien' })).errores,
    [['personal', 'Personal, apoyo, chófer y vehículo sólo se piden en las jornadas de la Secretaría.']]);
});

test('el relevo pasa la jornada a un cabo de la cuadrilla, que desde entonces registra en ella; el titular no, hasta que se la devuelven', async () => {
  const t = await telefono(CABO);
  const { J } = await conArbol(t);
  const coord = await telefono(COORD);
  const version = (await admin.query("SELECT to_jsonb(j) ->> 'fecha_inicio' AS v FROM srp.jornadas j WHERE id = $1", [J.id])).rows[0].v;
  assert.equal((await t.una('jornada.relevo', { id: J.id, version, cabo_id: CABO3.id })).mensaje, 'No tiene permiso para pasar esta jornada a otro cabo.');
  assert.deepEqual((await coord.una('jornada.relevo', { id: J.id, version, cabo_id: CABO2.id })).errores, [['cabo_id', 'Elija el cabo que sigue registrando.']], 'sólo a su cuadrilla');
  const r = await coord.una('jornada.relevo', { id: J.id, version, cabo_id: CABO3.id });
  assert.equal(r.estado, 'recibido', JSON.stringify(r));
  const ultimo = r.fila.relevos[r.fila.relevos.length - 1];
  assert.deepEqual([r.fila.relevo_id, r.fila.cabo_id, ultimo.cabo_id, ultimo.por_id], [CABO3.id, CABO.id, CABO3.id, COORD.id]);
  assert.match(ultimo.fecha, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
  assert.equal((await (await telefono(CABO3)).una('registro.crear', arbol(J.id))).estado, 'recibido', 'registra quien la recibió');
  assert.equal((await t.una('registro.crear', arbol(J.id))).mensaje, 'No tiene permiso para registrar en esta jornada.', 'el titular ya no');
  const vuelve = await coord.una('jornada.relevo', { id: J.id, version: r.version, cabo_id: CABO.id });
  assert.equal(vuelve.fila.relevo_id, null);
  assert.deepEqual((await bitacora(J.id)).filter((b) => b[0] === 'RELEVO').map((b) => b[1]),
    ['Registra Prueba cabotres en lugar de Prueba cabo; titular: Prueba cabo', 'Registra Prueba cabo en lugar de Prueba cabotres: vuelve el titular']);
});

test('los puntos revisados son árboles de la jornada, y la bitácora dice cuáles por su folio', async () => {
  const t = await telefono(CABO);
  const { J, A } = await conArbol(t);
  const v0 = (await admin.query("SELECT to_jsonb(j) ->> 'fecha_inicio' AS v FROM srp.jornadas j WHERE id = $1", [J.id])).rows[0].v;
  assert.deepEqual((await t.una('jornada.revisar', { id: J.id, version: v0, puntos_revisados: [uuid()] })).errores, [['puntos_revisados', 'Los puntos revisados son árboles de esta jornada.']]);
  const r = await t.una('jornada.revisar', { id: J.id, version: v0, puntos_revisados: [A.id] });
  assert.deepEqual(r.fila.puntos_revisados, [A.id]);
  const d = await t.una('jornada.revisar', { id: J.id, version: r.version, puntos_revisados: [] });
  assert.deepEqual(d.fila.puntos_revisados, []);
  assert.deepEqual((await bitacora(J.id)).filter((b) => b[0] === 'EDITADO').map((b) => b[1]), ['Punto revisado: está bien (' + A.folio + ')', 'Se deshizo la revisión del punto ' + A.folio]);
});

test('una jornada sólo se elimina sin árboles, y los eliminados también cuentan', async () => {
  const t = await telefono(CABO);
  const V = jornada({ nombre: 'Jornada vacía' });
  const creada = await t.una('jornada.crear', V);
  const { J, A, version } = await conArbol(t);
  const vj = (await admin.query("SELECT to_jsonb(j) ->> 'fecha_inicio' AS v FROM srp.jornadas j WHERE id = $1", [J.id])).rows[0].v;
  assert.equal((await t.una('jornada.eliminar', { id: J.id, version: vj })).mensaje, 'No se puede eliminar: tiene árboles registrados. Muévalos o elimínelos primero.');
  await t.una('registro.eliminar', { id: A.id, version });
  assert.equal((await t.una('jornada.eliminar', { id: J.id, version: vj })).mensaje,
    'No se puede eliminar: guarda 1 árbol eliminado, que se conserva como constancia. Si ya no se usará, ciérrela.');
  const e = await t.una('jornada.eliminar', { id: V.id, version: creada.version });
  assert.equal(e.estado, 'recibido');
  assert.equal((await admin.query('SELECT count(*)::int AS n FROM srp.jornadas WHERE id = $1', [V.id])).rows[0].n, 0);
  assert.deepEqual((await bitacora(V.id)).find((b) => b[0] === 'ELIMINADO'), ['ELIMINADO', 'Jornada «Jornada vacía» eliminada (sin árboles)']);
  assert.equal((await t.una('jornada.eliminar', { id: V.id, version: creada.version })).repetido, true, 'un reenvío no se repite');
  // Lo que llega después para la jornada eliminada ya no la espera: se dice que se eliminó
  assert.equal((await t.una('registro.crear', arbol(V.id))).codigo, 'JORNADA_ELIMINADA', 'un árbol para ella');
  assert.equal((await t.una('jornada.cerrar', { id: V.id, version: creada.version })).codigo, 'JORNADA_ELIMINADA', 'un cambio de ella');
  const activo = await conArbol(t);
  assert.equal((await t.una('registro.mover', { id: activo.A.id, version: activo.version, jornada_id: V.id })).codigo, 'JORNADA_ELIMINADA', 'mover un árbol a ella');
  assert.equal((await t.una('registro.crear', arbol(uuid()))).codigo, 'JORNADA_PENDIENTE', 'la que todavía no llega se sigue esperando');
});

/* ---------- La prioridad de la colonia ---------- */

test('la prioridad de la colonia se congela al recibir el árbol y la jornada: si la capa cambia la conservan, y corregir el punto la recalcula', async () => {
  // Un punto dentro de una colonia de la capa propia
  const col = (await admin.query('SELECT id, prioridad, ST_Y(ST_PointOnSurface(geom)) AS lat, ST_X(ST_PointOnSurface(geom)) AS lng FROM srp.capa_prioritarias ORDER BY id LIMIT 1')).rows[0];
  const lugar = { lat: Number(col.lat.toFixed(6)), lng: Number(col.lng.toFixed(6)) };
  const t = await telefono(CABO);
  const { J, A, version } = await conArbol(t, lugar, lugar);
  const congelada = async (id) => (await admin.query(`SELECT CASE WHEN plantacion_id IS NULL THEN 'jornadas' ELSE 'plantaciones' END AS tabla, colonia_id, prioridad, capa_version
    FROM srp.prioridades WHERE plantacion_id = $1 OR jornada_id = $1`, [id])).rows[0];
  const capa = (await admin.query("SELECT version FROM srp.capas WHERE nombre = 'prioritarias'")).rows[0].version;
  assert.deepEqual(await congelada(A.id), { tabla: 'plantaciones', colonia_id: col.id, prioridad: col.prioridad, capa_version: capa });
  assert.deepEqual(await congelada(J.id), { tabla: 'jornadas', colonia_id: col.id, prioridad: col.prioridad, capa_version: capa });
  const otra = (col.prioridad + 1) % 5;
  await admin.query('UPDATE srp.capa_prioritarias SET prioridad = $2 WHERE id = $1', [col.id, otra]);
  try {
    // Lo ya recibido conserva la suya; lo nuevo toma la de la capa de hoy
    const B = (await t.una('registro.crear', arbol(J.id, lugar))).fila;
    assert.equal((await congelada(A.id)).prioridad, col.prioridad);
    assert.equal((await congelada(J.id)).prioridad, col.prioridad);
    assert.equal((await congelada(B.id)).prioridad, otra);
    // Cambiar sólo los comentarios no la toca; corregir el punto sí
    const e = await t.una('registro.editar', { id: A.id, version, cambios: { comentarios: 'Sin mover el punto' } });
    assert.equal((await congelada(A.id)).prioridad, col.prioridad);
    await t.una('registro.editar', { id: A.id, version: e.version, cambios: { lat: lugar.lat + 0.000001 } });
    assert.equal((await congelada(A.id)).prioridad, otra);
  } finally {
    await admin.query('UPDATE srp.capa_prioritarias SET prioridad = $2 WHERE id = $1', [col.id, col.prioridad]);
  }
});

test('lo raro que llega por la API no da error interno: una precisión imposible queda sin dato, el carácter nulo se quita y una hora del futuro es la del servidor', async () => {
  const t = await telefono(CABO);
  const J = jornada();
  assert.equal((await t.una('jornada.crear', J)).estado, 'recibido');
  const a = await t.una('registro.crear', arbol(J.id, { gps_precision_m: 9999999999, comentarios: 'con\u0000nulo', fecha_registro: '2999-01-01T00:00:00Z' }));
  assert.deepEqual([a.estado, a.fila.gps_precision_m, a.fila.comentarios], ['recibido', null, 'connulo'], JSON.stringify(a));
  assert.ok(Date.parse(a.fila.fecha_registro) <= Date.now() + 60000, 'la hora del futuro se cambió por la del servidor: ' + a.fila.fecha_registro);
});
