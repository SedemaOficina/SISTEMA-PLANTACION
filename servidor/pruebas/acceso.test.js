/* ACCESO Y CUENTAS: el servicio corre en un puerto libre y se le habla como lo hará la aplicación, con
   la cuenta del servicio. Crea su propia Administración global de prueba y sus cuentas, y al terminar
   las quita. Corre contra la base local de desarrollo, ya instalada. */
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { conectar, limpiar } from './apoyo.js';
// El módulo compilado, tal como corre (npm test compila antes de probar)
import { leerConfig, crearGrupo, crearApp, derivar } from '../dist/independiente.js';

const config = leerConfig({ SRP_COOKIE_SEGURA: 'no', SRP_INTENTOS_MAXIMOS: '3', SRP_BLOQUEO_MINUTOS: '15' });
const ADMIN = { id: crypto.randomUUID(), correo: 'admin.prueba.' + Date.now() + '@ejemplo.local', clave: 'Clave de prueba 2026' };
let admin, grupo, servidor, base;

// Un cliente con su propia cookie, como un navegador
function cliente() {
  let cookie = '';
  const pedir = async (metodo, ruta, cuerpo) => {
    const r = await fetch(base + ruta, { method: metodo, headers: Object.assign({ 'content-type': 'application/json' }, cookie ? { cookie } : {}),
      body: cuerpo === undefined ? undefined : JSON.stringify(cuerpo) });
    const puesta = r.headers.get('set-cookie');
    if (puesta) cookie = /sia_srp_sesion=;|Expires=Thu, 01 Jan 1970/.test(puesta) ? '' : puesta.split(';')[0];
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
  servidor = crearApp({ pool: grupo, config, proxy: 0 }).listen(0);
  await new Promise(r => servidor.once('listening', r));
  base = 'http://127.0.0.1:' + servidor.address().port + config.ruta;
});

after(async () => {
  servidor && servidor.close();
  grupo && await grupo.end();
  // Se quita lo que creó la prueba: sus cuentas (con sus contraseñas y sesiones), sus bitácoras y su institución
  await limpiar(admin, async () => {
    const ids = (await admin.query("SELECT id FROM srp.usuarios WHERE correo LIKE '%.prueba.%@ejemplo.local' OR organizacion_id = 'o-prueba-acceso'")).rows.map(r => r.id);
    // La bitácora sólo crece: para quitar la de la prueba, la dueña de la tabla apaga un momento sus disparadores
    await admin.query('ALTER TABLE srp.bitacora DISABLE TRIGGER bitacora_inmutable');
    await admin.query('DELETE FROM srp.bitacora WHERE usuario_id = ANY($1::uuid[]) OR entidad_id = ANY($1::text[])', [ids]);
    await admin.query('ALTER TABLE srp.bitacora ENABLE TRIGGER bitacora_inmutable');
    await admin.query('ALTER TABLE srp.bitacora_acceso DISABLE TRIGGER bitacora_inmutable');
    await admin.query("DELETE FROM srp.bitacora_acceso WHERE usuario_id = ANY($1::uuid[]) OR correo_intentado LIKE '%.prueba.%@ejemplo.local'", [ids]);
    await admin.query('ALTER TABLE srp.bitacora_acceso ENABLE TRIGGER bitacora_inmutable');
    await admin.query('DELETE FROM srp.credenciales WHERE usuario_id = ANY($1::uuid[])', [ids]);
    await admin.query('DELETE FROM srp.usuarios WHERE id = ANY($1::uuid[]) AND id <> $2', [ids, ADMIN.id]);
    await admin.query('DELETE FROM srp.usuarios WHERE id = $1', [ADMIN.id]);
    await admin.query("DELETE FROM srp.instituciones WHERE id = 'o-prueba-acceso'");
  });
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
  assert.deepEqual([a.estado, a.datos], [401, { codigo: 'INCORRECTO', mensaje: 'Correo o contraseña incorrectos. Si son correctos y no puede entrar, consulte a la Administración global.' }]);
  assert.deepEqual([b.estado, b.datos], [a.estado, a.datos]);
});

test('toda entrada fallida responde igual: desactivada, bloqueada o de institución desactivada, aun con la contraseña correcta', async () => {
  const a = cliente();
  await a.pedir('POST', '/acceso/entrar', { correo: ADMIN.correo, contrasena: ADMIN.clave });
  const cuenta = async (correo, clave) => {
    const alta = await a.pedir('POST', '/cuentas', { correo, nombre_completo: 'Cabo Prueba Igual', organizacion_id: 'o-prueba-acceso', cargo_rol: 'Cabo', perfil: 'CABO' });
    const c = cliente();
    await c.pedir('POST', '/acceso/entrar', { correo, contrasena: alta.datos.temporal });
    await c.pedir('POST', '/acceso/contrasena', { actual: alta.datos.temporal, nueva: clave });
    return alta.datos.usuario.id;
  };
  const entrar = async (correo, clave) => { const r = await cliente().pedir('POST', '/acceso/entrar', { correo, contrasena: clave }); return [r.estado, r.datos]; };
  const nadie = await entrar('nadie.prueba.igual@ejemplo.local', 'Clave igual 2026');
  const inactiva = await cuenta('cabo.prueba.inactiva@ejemplo.local', 'Clave inactiva 2026');
  await a.pedir('POST', '/cuentas/' + inactiva + '/estado', { activo: false });
  const bloqueada = await cuenta('cabo.prueba.bloqueada@ejemplo.local', 'Clave bloqueada 2026');
  for (let i = 0; i < 3; i++) await entrar('cabo.prueba.bloqueada@ejemplo.local', 'equivocada ' + i);
  assert.equal((await admin.query('SELECT bloqueada_hasta > now() AS b FROM srp.credenciales WHERE usuario_id = $1', [bloqueada])).rows[0].b, true);
  const resultados = [nadie, await entrar('cabo.prueba.inactiva@ejemplo.local', 'Clave inactiva 2026'), await entrar('cabo.prueba.bloqueada@ejemplo.local', 'Clave bloqueada 2026')];
  await cuenta('cabo.prueba.sininstitucion@ejemplo.local', 'Clave institucion 2026');
  await admin.query("UPDATE srp.instituciones SET activo = false WHERE id = 'o-prueba-acceso'");
  try {
    resultados.push(await entrar('cabo.prueba.sininstitucion@ejemplo.local', 'Clave institucion 2026'));
  } finally {
    await admin.query("UPDATE srp.instituciones SET activo = true WHERE id = 'o-prueba-acceso'");
  }
  for (const r of resultados) assert.deepEqual(r, [401, { codigo: 'INCORRECTO', mensaje: 'Correo o contraseña incorrectos. Si son correctos y no puede entrar, consulte a la Administración global.' }]);
});

test('al entrar, la cookie es sólo HTTP, del mismo sitio y sólo para la API; al salir, la sesión se cierra', async () => {
  const c = cliente();
  const e = await c.pedir('POST', '/acceso/entrar', { correo: ADMIN.correo.toUpperCase(), contrasena: ADMIN.clave });
  assert.equal(e.estado, 200);
  assert.equal(e.datos.usuario.perfil, 'ADMIN');
  assert.equal(e.datos.debeCambiar, false);
  assert.match(e.puesta, /^sia_srp_sesion=/); assert.match(e.puesta, /HttpOnly/i); assert.match(e.puesta, /SameSite=Strict/i); assert.match(e.puesta, /Path=\/api\/srp/);
  const testigo = decodeURIComponent(c.cookie.split('=')[1]);
  assert.match(testigo, /^[A-Za-z0-9_-]{43}$/, 'el testigo: 32 bytes al azar en base64url, como en acceso');
  const g = (await admin.query("SELECT count(*) FILTER (WHERE testigo_resumen = $1)::int AS tal_cual, count(*) FILTER (WHERE testigo_resumen = encode(sha256(convert_to($1, 'UTF8')), 'hex'))::int AS resumen FROM srp.sesiones", [testigo])).rows[0];
  assert.deepEqual(g, { tal_cual: 0, resumen: 1 }, 'la base guarda el resumen sha256 en hexadecimal, no el testigo');
  // Un testigo con otra forma no se busca, y uno mal escrito no tumba la petición
  for (const malo of ['corto', '%E0%A4%A', 'x'.repeat(43) + '!']) {
    const m = await fetch(base + '/acceso/yo', { headers: { cookie: 'sia_srp_sesion=' + malo } });
    assert.deepEqual([m.status, (await m.json()).codigo], [401, 'SIN_SESION']);
  }
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
  // Bloqueada, ni con la contraseña correcta entra, y responde como cualquier entrada fallida
  const bloqueada = await cliente().pedir('POST', '/acceso/entrar', { correo: 'cabo.prueba.dos@ejemplo.local', contrasena: 'Mi clave segura 77' });
  assert.deepEqual([bloqueada.estado, bloqueada.datos.codigo], [401, 'INCORRECTO']);
  assert.equal((await admin.query('SELECT bloqueada_hasta > now() AS b FROM srp.credenciales WHERE usuario_id = $1', [alta.datos.usuario.id])).rows[0].b, true);
  const nueva = await a.pedir('POST', '/cuentas/' + alta.datos.usuario.id + '/restablecer');
  assert.equal(nueva.estado, 200);
  const r = await cabo.pedir('GET', '/acceso/yo');
  assert.equal(r.datos.codigo, 'SESION_CONTRASENA_RESTABLECIDA', 'la sesión abierta se cerró');
  const e = await cliente().pedir('POST', '/acceso/entrar', { correo: 'cabo.prueba.dos@ejemplo.local', contrasena: nueva.datos.temporal });
  assert.deepEqual([e.estado, e.datos.debeCambiar], [200, true]);
});

test('intentos simultáneos no pasan del máximo: la cuenta queda bloqueada con el máximo exacto', async () => {
  const a = cliente();
  await a.pedir('POST', '/acceso/entrar', { correo: ADMIN.correo, contrasena: ADMIN.clave });
  const correo = 'cabo.prueba.simultanea@ejemplo.local';
  const alta = await a.pedir('POST', '/cuentas', { correo, nombre_completo: 'Cabo Prueba Simultánea', organizacion_id: 'o-prueba-acceso', cargo_rol: 'Cabo', perfil: 'CABO' });
  assert.equal(alta.estado, 201);
  const r = await Promise.all(Array.from({ length: 8 }, (_, i) => cliente().pedir('POST', '/acceso/entrar', { correo, contrasena: 'equivocada simultánea ' + i })));
  assert.ok(r.every(x => x.estado === 401 && x.datos.codigo === 'INCORRECTO'), 'todas responden como entrada fallida');
  // Tres turnos y no más: con el contador leído y escrito en dos pasos, quedaba en uno y sin bloquear
  const c = (await admin.query('SELECT intentos_fallidos, bloqueada_hasta > now() AS bloqueada FROM srp.credenciales WHERE usuario_id = $1', [alta.datos.usuario.id])).rows[0];
  assert.deepEqual([c.intentos_fallidos, c.bloqueada], [3, true]);
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
  assert.equal((await cliente().pedir('POST', '/acceso/entrar', { correo: 'cabo.prueba.tres@ejemplo.local', contrasena: 'Otra clave segura 88' })).datos.codigo, 'INCORRECTO');
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

test('una sesión dura una semana sin uso: cada uso la renueva, y a los siete días sin entrar vence', async () => {
  const c = cliente();
  const e = await c.pedir('POST', '/acceso/entrar', { correo: ADMIN.correo, contrasena: ADMIN.clave });
  // La cookie no se cae antes que la sesión: dura lo más que admiten los navegadores
  assert.match(e.puesta, /Max-Age=34560000/);
  const plazo = async () => Number((await admin.query(`SELECT extract(epoch FROM expira_en - now()) / 86400 AS d FROM srp.sesiones
    WHERE usuario_id = $1 AND cerrada_en IS NULL ORDER BY creada_en DESC LIMIT 1`, [ADMIN.id])).rows[0].d);
  assert.ok(Math.abs(await plazo() - 7) < 0.01, 'al entrar vence en siete días');
  // Seis días sin entrar: sigue valiendo y el uso le devuelve la semana completa
  await admin.query("UPDATE srp.sesiones SET ultima_actividad = now() - interval '6 days', expira_en = now() + interval '1 day' WHERE usuario_id = $1 AND cerrada_en IS NULL", [ADMIN.id]);
  assert.equal((await c.pedir('GET', '/acceso/yo')).estado, 200);
  assert.ok(Math.abs(await plazo() - 7) < 0.01, 'usarla renueva la semana');
  // Siete días sin entrar: pide la contraseña otra vez, sin perder lo capturado
  await admin.query("UPDATE srp.sesiones SET ultima_actividad = now() - interval '7 days 1 minute', expira_en = now() - interval '1 minute' WHERE usuario_id = $1 AND cerrada_en IS NULL", [ADMIN.id]);
  const r = await c.pedir('GET', '/acceso/yo');
  assert.equal(r.datos.codigo, 'SESION_VENCIDA');
  assert.match(r.datos.mensaje, /lo capturado se conserva/);
});

test('la contraseña nunca se guarda en claro, con el formato de acceso del SIA, y la temporal vence', async () => {
  const a = cliente();
  await a.pedir('POST', '/acceso/entrar', { correo: ADMIN.correo, contrasena: ADMIN.clave });
  const alta = await a.pedir('POST', '/cuentas', { correo: 'cabo.prueba.cinco@ejemplo.local', nombre_completo: 'Cabo Prueba Cinco', organizacion_id: 'o-prueba-acceso', cargo_rol: 'Cabo', perfil: 'CABO' });
  const cred = (await admin.query('SELECT derivada FROM srp.credenciales WHERE usuario_id = $1', [alta.datos.usuario.id])).rows[0];
  await admin.query("UPDATE srp.credenciales SET temporal_expira_en = now() - interval '1 minute' WHERE usuario_id = $1", [alta.datos.usuario.id]);
  assert.ok(!cred.derivada.includes(alta.datos.temporal));
  assert.match(cred.derivada, /^scrypt\$16384\$8\$1\$[A-Za-z0-9_-]{22}\$[A-Za-z0-9_-]{86}$/, 'scrypt N=2^14, sal de 16 bytes y 64 de derivada, en base64url');
  assert.equal((await cliente().pedir('POST', '/acceso/entrar', { correo: 'cabo.prueba.cinco@ejemplo.local', contrasena: alta.datos.temporal })).datos.codigo, 'TEMPORAL_VENCIDA');
});

test('el registro de entradas anota cada intento con su procedencia: entrada, cambio de contraseña, salida, fallidas y bloqueo', async () => {
  const a = cliente();
  await a.pedir('POST', '/acceso/entrar', { correo: ADMIN.correo, contrasena: ADMIN.clave });
  const correo = 'cabo.prueba.registro@ejemplo.local', clave = 'Registro de entradas 2026';
  const alta = await a.pedir('POST', '/cuentas', { correo, nombre_completo: 'Cabo Prueba Registro', organizacion_id: 'o-prueba-acceso', cargo_rol: 'Cabo', perfil: 'CABO' });
  const cabo = cliente();
  await cabo.pedir('POST', '/acceso/entrar', { correo, contrasena: alta.datos.temporal });
  await cabo.pedir('POST', '/acceso/contrasena', { actual: alta.datos.temporal, nueva: clave });
  await cabo.pedir('POST', '/acceso/salir');
  for (let i = 0; i < 3; i++) await cliente().pedir('POST', '/acceso/entrar', { correo, contrasena: 'equivocada ' + i });
  // Bloqueada, ni con la contraseña correcta: también queda anotado
  await cliente().pedir('POST', '/acceso/entrar', { correo, contrasena: clave });
  const filas = (await admin.query('SELECT evento, ip IS NOT NULL AS con_ip, correo_intentado FROM srp.bitacora_acceso WHERE usuario_id = $1 ORDER BY id', [alta.datos.usuario.id])).rows;
  assert.deepEqual(filas.map(f => f.evento), ['ENTRADA', 'CONTRASENA_CAMBIADA', 'SALIDA', 'ENTRADA_FALLIDA', 'ENTRADA_FALLIDA', 'BLOQUEO', 'ENTRADA_FALLIDA']);
  assert.ok(filas.every(f => f.con_ip && f.correo_intentado === null), 'cada renglón lleva la procedencia y la cuenta, no el correo');
  // Un correo sin cuenta se anota tal como se intentó, con el navegador de donde vino
  const intentado = 'nadie.prueba.registro@ejemplo.local';
  await fetch(base + '/acceso/entrar', { method: 'POST', headers: { 'content-type': 'application/json', 'user-agent': 'Prueba del registro' },
    body: JSON.stringify({ correo: intentado.toUpperCase(), contrasena: 'Lo que sea 123' }) });
  const sinCuenta = (await admin.query('SELECT evento, usuario_id, agente FROM srp.bitacora_acceso WHERE correo_intentado = $1', [intentado])).rows;
  assert.deepEqual(sinCuenta, [{ evento: 'ENTRADA_FALLIDA', usuario_id: null, agente: 'Prueba del registro' }]);
});

test('editar una cuenta sigue las reglas del formulario: el correo no cambia y la bitácora dice qué campos', async () => {
  const a = cliente();
  await a.pedir('POST', '/acceso/entrar', { correo: ADMIN.correo, contrasena: ADMIN.clave });
  const coord = (await a.pedir('POST', '/cuentas', { correo: 'coord.prueba.editar@ejemplo.local', nombre_completo: 'Coordinación Prueba Editar', organizacion_id: 'o-prueba-acceso', cargo_rol: 'Coordinación', perfil: 'COORDINADOR' })).datos.usuario;
  const cabo = (await a.pedir('POST', '/cuentas', { correo: 'cabo.prueba.editar@ejemplo.local', nombre_completo: 'Cabo Prueba Editar', organizacion_id: 'o-prueba-acceso', cargo_rol: 'Cabo', perfil: 'CABO', coordinadores_ids: [coord.id] })).datos.usuario;
  const base = { organizacion_id: 'o-prueba-acceso', perfil: 'CABO', coordinadores_ids: [coord.id] };
  const r = await a.pedir('PUT', '/cuentas/' + cabo.id, { ...base, correo: 'otro.prueba@ejemplo.local', nombre_completo: '  Cabo   Prueba Editado ', cargo_rol: 'Jefe de cuadrilla' });
  assert.deepEqual([r.estado, r.datos.usuario.nombre_completo, r.datos.usuario.cargo_rol, r.datos.usuario.correo], [200, 'Cabo Prueba Editado', 'Jefe de cuadrilla', 'cabo.prueba.editar@ejemplo.local']);
  const bit = (await admin.query("SELECT detalle FROM srp.bitacora WHERE entidad_id = $1 AND accion = 'EDITADO'", [cabo.id])).rows.map((b) => b.detalle);
  assert.deepEqual(bit, ['Campos: nombre_completo, cargo_rol']);
  const error = async (id, cuerpo) => { const x = await a.pedir('PUT', '/cuentas/' + id, cuerpo); return [x.estado, x.datos.errores && x.datos.errores[0]]; };
  // La Administración global es sólo de la Secretaría
  assert.deepEqual(await error(cabo.id, { ...base, nombre_completo: 'Cabo Prueba Editado', cargo_rol: 'X', perfil: 'ADMIN' }), [400, ['perfil', 'La Administración global es sólo de la Secretaría.']]);
  // Quien coordina cabos no cambia de institución
  assert.deepEqual(await error(coord.id, { organizacion_id: 'o-sedema', area_id: 'a-sia', nombre_completo: 'Coordinación Prueba Editar', cargo_rol: 'X', perfil: 'COORDINADOR' }),
    [400, ['organizacion_id', 'Coordina a 1 cabo: asígnelos a otra persona antes de cambiarla de institución.']]);
  // Quien administra no se quita a sí mismo la Administración
  assert.deepEqual(await error(ADMIN.id, { organizacion_id: 'o-sedema', area_id: 'a-sia', nombre_completo: 'Administración Prueba Acceso', cargo_rol: 'X', perfil: 'DIRECTIVO' }),
    [400, ['perfil', 'No puede cambiar su propio perfil de administración. Pida a otra cuenta de administración que lo haga.']]);
  assert.equal((await a.pedir('PUT', '/cuentas/' + crypto.randomUUID(), base)).estado, 404);
});

test('eliminar una cuenta sólo si no aparece en nada; una que ya entró se desactiva', async () => {
  const a = cliente();
  await a.pedir('POST', '/acceso/entrar', { correo: ADMIN.correo, contrasena: ADMIN.clave });
  const alta = (correo) => a.pedir('POST', '/cuentas', { correo, nombre_completo: 'Cabo Prueba Eliminar', organizacion_id: 'o-prueba-acceso', cargo_rol: 'Cabo', perfil: 'CABO' });
  const nueva = (await alta('cabo.prueba.eliminar@ejemplo.local')).datos.usuario;
  const d = await a.pedir('DELETE', '/cuentas/' + nueva.id);
  assert.deepEqual([d.estado, d.datos], [200, { ok: true }]);
  assert.equal((await admin.query('SELECT count(*)::int AS n FROM srp.usuarios WHERE id = $1', [nueva.id])).rows[0].n, 0);
  assert.deepEqual((await admin.query("SELECT accion, detalle FROM srp.bitacora WHERE entidad_id = $1 AND accion = 'ELIMINADO'", [nueva.id])).rows, [{ accion: 'ELIMINADO', detalle: 'cabo.prueba.eliminar@ejemplo.local' }]);
  // Una cuenta que ya entró deja constancia en el registro de entradas: no se elimina
  const entro = await alta('cabo.prueba.entro@ejemplo.local');
  await cliente().pedir('POST', '/acceso/entrar', { correo: 'cabo.prueba.entro@ejemplo.local', contrasena: entro.datos.temporal });
  const e = await a.pedir('DELETE', '/cuentas/' + entro.datos.usuario.id);
  assert.deepEqual([e.estado, e.datos.codigo, e.datos.mensaje], [409, 'EN_USO', 'No se puede eliminar: ya entró al sistema. Desactívela: eso sí se deshace.']);
  // Quien coordina a un cabo no se elimina aunque nunca haya entrado: el cabo quedaría con un coordinador que no existe
  const coord = (await a.pedir('POST', '/cuentas', { correo: 'coord.prueba.eliminar@ejemplo.local', nombre_completo: 'Coordinación Prueba Eliminar', organizacion_id: 'o-prueba-acceso', cargo_rol: 'Coordinación', perfil: 'COORDINADOR' })).datos.usuario;
  const suCabo = (await a.pedir('POST', '/cuentas', { correo: 'cabo.prueba.coordinado@ejemplo.local', nombre_completo: 'Cabo Prueba Coordinado', organizacion_id: 'o-prueba-acceso', cargo_rol: 'Cabo', perfil: 'CABO', coordinadores_ids: [coord.id] })).datos.usuario;
  const usos = (await a.pedir('GET', '/cuentas/usos')).datos;
  assert.deepEqual([usos[coord.id], usos[suCabo.id], Object.keys(usos[entro.datos.usuario.id])], [{ usuarios: 1, cabos: 1 }, undefined, ['entradas']]);
  assert.equal(usos[ADMIN.id].usuarios >= 4 && usos[ADMIN.id].entradas >= 1, true);
  const ec = await a.pedir('DELETE', '/cuentas/' + coord.id);
  assert.deepEqual([ec.estado, ec.datos.mensaje], [409, 'No se puede eliminar: coordina a 1 cabo. Desactívela: eso sí se deshace.']);
  assert.equal((await a.pedir('DELETE', '/cuentas/' + suCabo.id)).estado, 200);
  assert.equal((await a.pedir('DELETE', '/cuentas/' + coord.id)).estado, 200);
  const propia = await a.pedir('DELETE', '/cuentas/' + ADMIN.id);
  assert.deepEqual([propia.estado, propia.datos.codigo], [400, 'PROPIA']);
  // Un cabo no edita ni elimina cuentas
  const cabo = cliente();
  const c2 = await alta('cabo.prueba.sinpermiso@ejemplo.local');
  await cabo.pedir('POST', '/acceso/entrar', { correo: 'cabo.prueba.sinpermiso@ejemplo.local', contrasena: c2.datos.temporal });
  await cabo.pedir('POST', '/acceso/contrasena', { actual: c2.datos.temporal, nueva: 'Sin permiso 2026' });
  assert.equal((await cabo.pedir('PUT', '/cuentas/' + nueva.id, {})).datos.codigo, 'SIN_PERMISO');
  assert.equal((await cabo.pedir('DELETE', '/cuentas/' + entro.datos.usuario.id)).datos.codigo, 'SIN_PERMISO');
  assert.equal((await cabo.pedir('GET', '/cuentas/usos')).datos.codigo, 'SIN_PERMISO');
});
