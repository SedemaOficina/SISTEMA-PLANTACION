/* ACCESO Y CUENTAS: el servicio corre en un puerto libre y se le habla como lo hará la aplicación, con
   la cuenta del servicio. Crea su propia Administración global de prueba y sus cuentas, y al terminar
   las quita. Corre contra la base local de desarrollo, ya instalada. */
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { conectar } from './apoyo.js';
import { leerConfig } from '../src/config.js';
import { crearGrupo } from '../src/conexion.js';
import { crearApp } from '../src/app.js';
import { derivar } from '../src/contrasenas.js';

const config = leerConfig({ SRP_COOKIE_SEGURA: 'no', SRP_PROXY: '0', SRP_INTENTOS_MAXIMOS: '3', SRP_BLOQUEO_MINUTOS: '15' });
const ADMIN = { id: crypto.randomUUID(), correo: 'admin.prueba.' + Date.now() + '@ejemplo.local', clave: 'Clave de prueba 2026' };
let admin, grupo, servidor, base;

// Un cliente con su propia cookie, como un navegador
function cliente() {
  let cookie = '';
  const pedir = async (metodo, ruta, cuerpo) => {
    const r = await fetch(base + ruta, { method: metodo, headers: Object.assign({ 'content-type': 'application/json' }, cookie ? { cookie } : {}),
      body: cuerpo === undefined ? undefined : JSON.stringify(cuerpo) });
    const puesta = r.headers.get('set-cookie');
    if (puesta) cookie = /srp_sesion=;|Expires=Thu, 01 Jan 1970/.test(puesta) ? '' : puesta.split(';')[0];
    return { estado: r.status, datos: await r.json().catch(() => null), puesta };
  };
  return { pedir, get cookie() { return cookie; } };
}

before(async () => {
  admin = await conectar();
  await admin.query('GRANT srp_api TO CURRENT_USER WITH INHERIT FALSE, SET TRUE');
  await admin.query('BEGIN');
  await admin.query(`INSERT INTO srp.instituciones VALUES ('o-sedema', 'SEDEMA', 'Secretaría del Medio Ambiente', true, NULL, now(), NULL, NULL, 'Gobierno de la CDMX') ON CONFLICT (id) DO NOTHING`);
  await admin.query(`INSERT INTO srp.areas VALUES ('a-sia', 'SIA', 'Sistema de Información Ambiental', true, NULL, now(), NULL, NULL) ON CONFLICT (id) DO NOTHING`);
  await admin.query(`INSERT INTO srp.instituciones VALUES ('o-prueba-acceso', 'PRUEBA_ACCESO', 'Institución de prueba del acceso', true, NULL, now(), NULL, NULL, 'Empresa privada') ON CONFLICT (id) DO NOTHING`);
  await admin.query(`INSERT INTO srp.usuarios VALUES ($1, $2, 'Administración Prueba Acceso', 'o-sedema', 'a-sia', 'Administración global', 'ADMIN', '{}', true, now(), $1, NULL, NULL)`, [ADMIN.id, ADMIN.correo]);
  await admin.query(`INSERT INTO srp.credenciales VALUES ($1, $2, false, NULL, 0, NULL, now(), $1)`, [ADMIN.id, await derivar(ADMIN.clave)]);
  await admin.query('COMMIT');
  grupo = crearGrupo({ rol: 'srp_api' });
  servidor = crearApp({ grupo, config }).listen(0);
  await new Promise(r => servidor.once('listening', r));
  base = 'http://127.0.0.1:' + servidor.address().port + config.ruta;
});

after(async () => {
  servidor && servidor.close();
  grupo && await grupo.end();
  // Se quita lo que creó la prueba: sus cuentas (con sus contraseñas y sesiones), su bitácora y su institución
  await admin.query('BEGIN');
  const ids = (await admin.query("SELECT id FROM srp.usuarios WHERE correo LIKE '%.prueba.%@ejemplo.local' OR organizacion_id = 'o-prueba-acceso'")).rows.map(r => r.id);
  await admin.query('DELETE FROM srp.bitacora WHERE usuario_id = ANY($1::uuid[]) OR entidad_id = ANY($1::text[])', [ids]);
  await admin.query('DELETE FROM srp.credenciales WHERE usuario_id = ANY($1::uuid[])', [ids]);
  await admin.query('DELETE FROM srp.usuarios WHERE id = ANY($1::uuid[]) AND id <> $2', [ids, ADMIN.id]);
  await admin.query('DELETE FROM srp.usuarios WHERE id = $1', [ADMIN.id]);
  await admin.query("DELETE FROM srp.instituciones WHERE id = 'o-prueba-acceso'");
  await admin.query('COMMIT');
  await admin.query('REVOKE srp_api FROM CURRENT_USER');
  await admin.end();
});

test('sin sesión no se entra a nada, y la respuesta no se guarda en cachés', async () => {
  const r = await cliente().pedir('GET', '/acceso/yo');
  assert.equal(r.estado, 401);
  assert.equal(r.datos.codigo, 'SIN_SESION');
  assert.equal((await fetch(base + '/acceso/yo')).headers.get('cache-control'), 'no-store');
});

test('una cuenta que no existe y una contraseña equivocada responden lo mismo', async () => {
  const a = await cliente().pedir('POST', '/acceso/entrar', { correo: 'nadie.prueba.x@ejemplo.local', contrasena: 'Lo que sea 123' });
  const b = await cliente().pedir('POST', '/acceso/entrar', { correo: ADMIN.correo, contrasena: 'Equivocada 123' });
  assert.deepEqual([a.estado, a.datos], [401, { codigo: 'INCORRECTO', mensaje: 'Correo o contraseña incorrectos.' }]);
  assert.deepEqual([b.estado, b.datos], [a.estado, a.datos]);
});

test('al entrar, la cookie es sólo HTTP, del mismo sitio y sólo para la API; al salir, la sesión se cierra', async () => {
  const c = cliente();
  const e = await c.pedir('POST', '/acceso/entrar', { correo: ADMIN.correo.toUpperCase(), contrasena: ADMIN.clave });
  assert.equal(e.estado, 200);
  assert.equal(e.datos.usuario.perfil, 'ADMIN');
  assert.equal(e.datos.debeCambiar, false);
  assert.match(e.puesta, /HttpOnly/i); assert.match(e.puesta, /SameSite=Strict/i); assert.match(e.puesta, /Path=\/api\/srp/);
  const testigo = decodeURIComponent(c.cookie.split('=')[1]);
  const g = (await admin.query("SELECT count(*) FILTER (WHERE testigo_resumen = convert_to($1, 'UTF8'))::int AS tal_cual, count(*) FILTER (WHERE testigo_resumen = sha256(convert_to($1, 'UTF8')))::int AS resumen FROM srp.sesiones", [testigo])).rows[0];
  assert.deepEqual(g, { tal_cual: 0, resumen: 1 }, 'la base guarda el resumen del testigo, no el testigo');
  assert.equal((await c.pedir('GET', '/acceso/yo')).estado, 200);
  const anterior = c.cookie;
  assert.equal((await c.pedir('POST', '/acceso/salir')).estado, 200);
  const r = await fetch(base + '/acceso/yo', { headers: { cookie: anterior } });
  assert.equal(r.status, 401);
  assert.equal((await r.json()).codigo, 'SESION_SALIDA');
});

test('la Administración da de alta una cuenta con contraseña temporal, que obliga a cambiarla al primer acceso', async () => {
  const a = cliente();
  await a.pedir('POST', '/acceso/entrar', { correo: ADMIN.correo, contrasena: ADMIN.clave });
  const malo = await a.pedir('POST', '/cuentas', { correo: 'no-es-correo', nombre_completo: 'Solo', organizacion_id: 'o-prueba-acceso', cargo_rol: '', perfil: 'ADMIN' });
  assert.equal(malo.estado, 400);
  assert.deepEqual(malo.datos.errores.map(e => e[0]).sort(), ['cargo_rol', 'correo', 'nombre_completo', 'perfil']);
  const alta = await a.pedir('POST', '/cuentas', { correo: 'Cabo.Prueba.Uno@Ejemplo.Local', nombre_completo: '  Cabo   Prueba Uno ', organizacion_id: 'o-prueba-acceso', cargo_rol: 'Cabo', perfil: 'CABO' });
  assert.equal(alta.estado, 201);
  assert.equal(alta.datos.usuario.correo, 'cabo.prueba.uno@ejemplo.local');
  assert.equal(alta.datos.usuario.nombre_completo, 'Cabo Prueba Uno');
  assert.equal(alta.datos.usuario.area_id, null, 'fuera de la Secretaría no hay área');
  assert.match(alta.datos.temporal, /^[a-z2-9]{4}-[a-z2-9]{4}-[a-z2-9]{4}$/);
  assert.equal((await a.pedir('POST', '/cuentas', { correo: 'cabo.prueba.uno@ejemplo.local', nombre_completo: 'Otro Nombre', organizacion_id: 'o-prueba-acceso', cargo_rol: 'X', perfil: 'CABO' })).datos.errores[0][1], 'Ese correo ya tiene cuenta.');

  const cabo = cliente();
  const e = await cabo.pedir('POST', '/acceso/entrar', { correo: 'cabo.prueba.uno@ejemplo.local', contrasena: alta.datos.temporal });
  assert.equal(e.datos.debeCambiar, true);
  assert.equal((await cabo.pedir('POST', '/cuentas', {})).datos.codigo, 'DEBE_CAMBIAR', 'con la temporal no se hace nada más');
  assert.equal((await cabo.pedir('POST', '/acceso/contrasena', { actual: alta.datos.temporal, nueva: 'corta1' })).datos.codigo, 'NUEVA_INVALIDA');
  assert.equal((await cabo.pedir('POST', '/acceso/contrasena', { actual: alta.datos.temporal, nueva: 'sinnumerosninguno' })).datos.codigo, 'NUEVA_INVALIDA');
  assert.equal((await cabo.pedir('POST', '/acceso/contrasena', { actual: 'otra cosa', nueva: 'Arboles plantados 2026' })).datos.codigo, 'ACTUAL_INCORRECTA');
  assert.equal((await cabo.pedir('POST', '/acceso/contrasena', { actual: alta.datos.temporal, nueva: 'Arboles plantados 2026' })).estado, 200);
  assert.equal((await cabo.pedir('GET', '/acceso/yo')).datos.debeCambiar, false);
  // Un cabo no administra cuentas
  assert.equal((await cabo.pedir('POST', '/cuentas', {})).datos.codigo, 'SIN_PERMISO');
  // La temporal ya no sirve
  assert.equal((await cliente().pedir('POST', '/acceso/entrar', { correo: 'cabo.prueba.uno@ejemplo.local', contrasena: alta.datos.temporal })).datos.codigo, 'INCORRECTO');
  const bit = (await admin.query('SELECT accion, detalle FROM srp.bitacora WHERE entidad_id = $1', [alta.datos.usuario.id])).rows;
  assert.deepEqual(bit, [{ accion: 'CREADO', detalle: 'Alta de cabo.prueba.uno@ejemplo.local con perfil CABO en Institución de prueba del acceso' }]);
});

test('tras varios intentos fallidos la cuenta se bloquea; restablecer la desbloquea y cierra sus sesiones', async () => {
  const a = cliente();
  await a.pedir('POST', '/acceso/entrar', { correo: ADMIN.correo, contrasena: ADMIN.clave });
  const alta = await a.pedir('POST', '/cuentas', { correo: 'cabo.prueba.dos@ejemplo.local', nombre_completo: 'Cabo Prueba Dos', organizacion_id: 'o-prueba-acceso', cargo_rol: 'Cabo', perfil: 'CABO' });
  const cabo = cliente();
  await cabo.pedir('POST', '/acceso/entrar', { correo: 'cabo.prueba.dos@ejemplo.local', contrasena: alta.datos.temporal });
  await cabo.pedir('POST', '/acceso/contrasena', { actual: alta.datos.temporal, nueva: 'Mi clave segura 77' });
  for (let i = 0; i < 3; i++) await cliente().pedir('POST', '/acceso/entrar', { correo: 'cabo.prueba.dos@ejemplo.local', contrasena: 'equivocada ' + i });
  const bloqueada = await cliente().pedir('POST', '/acceso/entrar', { correo: 'cabo.prueba.dos@ejemplo.local', contrasena: 'Mi clave segura 77' });
  assert.equal(bloqueada.estado, 423);
  assert.equal(bloqueada.datos.codigo, 'BLOQUEADA');
  const nueva = await a.pedir('POST', '/cuentas/' + alta.datos.usuario.id + '/restablecer');
  assert.equal(nueva.estado, 200);
  const r = await cabo.pedir('GET', '/acceso/yo');
  assert.equal(r.datos.codigo, 'SESION_CONTRASENA_RESTABLECIDA', 'la sesión abierta se cerró');
  const e = await cliente().pedir('POST', '/acceso/entrar', { correo: 'cabo.prueba.dos@ejemplo.local', contrasena: nueva.datos.temporal });
  assert.deepEqual([e.estado, e.datos.debeCambiar], [200, true]);
});

test('desactivar una cuenta cierra sus sesiones y le impide entrar; la Administración no se desactiva a sí misma', async () => {
  const a = cliente();
  await a.pedir('POST', '/acceso/entrar', { correo: ADMIN.correo, contrasena: ADMIN.clave });
  const alta = await a.pedir('POST', '/cuentas', { correo: 'cabo.prueba.tres@ejemplo.local', nombre_completo: 'Cabo Prueba Tres', organizacion_id: 'o-prueba-acceso', cargo_rol: 'Cabo', perfil: 'CABO' });
  const cabo = cliente();
  await cabo.pedir('POST', '/acceso/entrar', { correo: 'cabo.prueba.tres@ejemplo.local', contrasena: alta.datos.temporal });
  await cabo.pedir('POST', '/acceso/contrasena', { actual: alta.datos.temporal, nueva: 'Otra clave segura 88' });
  const d = await a.pedir('POST', '/cuentas/' + alta.datos.usuario.id + '/estado', { activo: false });
  assert.deepEqual([d.estado, d.datos.usuario.activo, d.datos.sesionesCerradas], [200, false, 1]);
  assert.equal((await cabo.pedir('GET', '/acceso/yo')).datos.codigo, 'SESION_CUENTA_DESACTIVADA');
  assert.equal((await cliente().pedir('POST', '/acceso/entrar', { correo: 'cabo.prueba.tres@ejemplo.local', contrasena: 'Otra clave segura 88' })).datos.codigo, 'CUENTA_INACTIVA');
  assert.equal((await a.pedir('POST', '/cuentas/' + ADMIN.id + '/estado', { activo: false })).datos.codigo, 'PROPIA');
});

test('si la institución se desactiva, sus sesiones dejan de valer', async () => {
  const a = cliente();
  await a.pedir('POST', '/acceso/entrar', { correo: ADMIN.correo, contrasena: ADMIN.clave });
  const alta = await a.pedir('POST', '/cuentas', { correo: 'cabo.prueba.cuatro@ejemplo.local', nombre_completo: 'Cabo Prueba Cuatro', organizacion_id: 'o-prueba-acceso', cargo_rol: 'Cabo', perfil: 'CABO' });
  const cabo = cliente();
  await cabo.pedir('POST', '/acceso/entrar', { correo: 'cabo.prueba.cuatro@ejemplo.local', contrasena: alta.datos.temporal });
  await admin.query("UPDATE srp.instituciones SET activo = false WHERE id = 'o-prueba-acceso'");
  try {
    assert.equal((await cabo.pedir('GET', '/acceso/yo')).datos.codigo, 'SESION_INSTITUCION_DESACTIVADA');
  } finally {
    await admin.query("UPDATE srp.instituciones SET activo = true WHERE id = 'o-prueba-acceso'");
  }
});

test('una sesión vence por inactividad y por su duración máxima', async () => {
  const c = cliente();
  await c.pedir('POST', '/acceso/entrar', { correo: ADMIN.correo, contrasena: ADMIN.clave });
  await admin.query("UPDATE srp.sesiones SET ultima_actividad = now() - interval '13 hours' WHERE usuario_id = $1 AND cerrada_en IS NULL", [ADMIN.id]);
  const r = await c.pedir('GET', '/acceso/yo');
  assert.equal(r.datos.codigo, 'SESION_VENCIDA');
  assert.match(r.datos.mensaje, /lo capturado se conserva/);
  const c2 = cliente();
  await c2.pedir('POST', '/acceso/entrar', { correo: ADMIN.correo, contrasena: ADMIN.clave });
  await admin.query("UPDATE srp.sesiones SET expira_en = now() - interval '1 minute' WHERE usuario_id = $1 AND cerrada_en IS NULL", [ADMIN.id]);
  assert.equal((await c2.pedir('GET', '/acceso/yo')).datos.codigo, 'SESION_VENCIDA');
});

test('la contraseña nunca se guarda en claro y la temporal vence', async () => {
  const a = cliente();
  await a.pedir('POST', '/acceso/entrar', { correo: ADMIN.correo, contrasena: ADMIN.clave });
  const alta = await a.pedir('POST', '/cuentas', { correo: 'cabo.prueba.cinco@ejemplo.local', nombre_completo: 'Cabo Prueba Cinco', organizacion_id: 'o-prueba-acceso', cargo_rol: 'Cabo', perfil: 'CABO' });
  const cred = (await admin.query('SELECT derivada FROM srp.credenciales WHERE usuario_id = $1', [alta.datos.usuario.id])).rows[0];
  await admin.query("UPDATE srp.credenciales SET temporal_expira_en = now() - interval '1 minute' WHERE usuario_id = $1", [alta.datos.usuario.id]);
  assert.ok(!cred.derivada.includes(alta.datos.temporal) && cred.derivada.startsWith('scrypt$32768$8$1$'));
  assert.equal((await cliente().pedir('POST', '/acceso/entrar', { correo: 'cabo.prueba.cinco@ejemplo.local', contrasena: alta.datos.temporal })).datos.codigo, 'TEMPORAL_VENCIDA');
});
