/* ACCESO Y CUENTAS: el servicio corre en un puerto libre y se le habla como lo hará la aplicación, con
   la cuenta del servicio. Crea su propia Administración global de prueba y sus cuentas, y al terminar
   las quita. Corre contra la base local de desarrollo, ya instalada. */
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { conectar, limpiar } from './apoyo.js';
// El módulo compilado, tal como corre (npm test compila antes de probar)
import { leerConfig, crearGrupo, crearApp, derivar } from '../dist/independiente.js';

// El límite por procedencia se prueba aparte, con su propio servicio: aquí todas las peticiones vienen del mismo equipo
const config = leerConfig({ SRP_COOKIE_SEGURA: 'no', SRP_INTENTOS_MAXIMOS: '3', SRP_BLOQUEO_MINUTOS: '15', SRP_INTENTOS_POR_PROCEDENCIA: '0' });
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
  await admin.query(`INSERT INTO srp.usuarios VALUES ($1, $2, 'Administración Prueba Acceso', 'o-sedema', 'a-sia', 'Administración global', 'ADMIN', true, now(), $1, NULL, NULL)`, [ADMIN.id, ADMIN.correo]);
  await admin.query(`INSERT INTO srp.credenciales VALUES ($1, $2, false, NULL, 0, NULL, now(), $1)`, [ADMIN.id, await derivar(ADMIN.clave)]);
  // Un renglón de hace más de un año: lo recorta la primera entrada del día (la prueba del final)
  await admin.query("INSERT INTO srp.bitacora_acceso (momento, evento, correo_intentado) VALUES (now() - interval '400 days', 'ENTRADA_FALLIDA', 'viejo.prueba.recorte@ejemplo.local')");
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
    await admin.query("DELETE FROM srp.bitacora_acceso WHERE usuario_id = ANY($1::uuid[]) OR correo_intentado LIKE '%.prueba.%@ejemplo.local' OR correo_intentado = '(no es un correo)'", [ids]);
    await admin.query('ALTER TABLE srp.bitacora_acceso ENABLE TRIGGER bitacora_inmutable');
    await admin.query('DELETE FROM srp.credenciales WHERE usuario_id = ANY($1::uuid[])', [ids]);
    // La institución de prueba recuerda quién la activó y desactivó en Catálogos
    await admin.query("UPDATE srp.instituciones SET editado_por_id = NULL WHERE editado_por_id = ANY($1::uuid[])", [ids]);
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
  // Lo que no tiene forma de correo no se guarda: quien escribe ahí su contraseña no la deja en el registro
  await cliente().pedir('POST', '/acceso/entrar', { correo: 'MiClave.Secreta2026', contrasena: 'Lo que sea 123' });
  assert.deepEqual((await admin.query('SELECT correo_intentado FROM srp.bitacora_acceso WHERE usuario_id IS NULL ORDER BY id DESC LIMIT 1')).rows, [{ correo_intentado: '(no es un correo)' }]);
  assert.equal((await admin.query("SELECT count(*)::int AS n FROM srp.bitacora_acceso WHERE correo_intentado ILIKE '%secreta%'")).rows[0].n, 0);
});

test('editar una cuenta sigue las reglas del formulario: el correo no cambia y la bitácora dice qué campos', async () => {
  const a = cliente();
  await a.pedir('POST', '/acceso/entrar', { correo: ADMIN.correo, contrasena: ADMIN.clave });
  const coord = (await a.pedir('POST', '/cuentas', { correo: 'coord.prueba.editar@ejemplo.local', nombre_completo: 'Coordinación Prueba Editar', organizacion_id: 'o-prueba-acceso', cargo_rol: 'Coordinación', perfil: 'COORDINADOR' })).datos.usuario;
  const cabo = (await a.pedir('POST', '/cuentas', { correo: 'cabo.prueba.editar@ejemplo.local', nombre_completo: 'Cabo Prueba Editar', organizacion_id: 'o-prueba-acceso', cargo_rol: 'Cabo', perfil: 'CABO' })).datos.usuario;
  const base = { organizacion_id: 'o-prueba-acceso', perfil: 'CABO' };
  const r = await a.pedir('PUT', '/cuentas/' + cabo.id, { ...base, correo: 'otro.prueba@ejemplo.local', nombre_completo: '  Cabo   Prueba Editado ', cargo_rol: 'Jefe de cuadrilla' });
  assert.deepEqual([r.estado, r.datos.usuario.nombre_completo, r.datos.usuario.cargo_rol, r.datos.usuario.correo], [200, 'Cabo Prueba Editado', 'Jefe de cuadrilla', 'cabo.prueba.editar@ejemplo.local']);
  const bit = (await admin.query("SELECT detalle FROM srp.bitacora WHERE entidad_id = $1 AND accion = 'EDITADO'", [cabo.id])).rows.map((b) => b.detalle);
  assert.deepEqual(bit, ['Campos: nombre_completo, cargo_rol']);
  const error = async (id, cuerpo) => { const x = await a.pedir('PUT', '/cuentas/' + id, cuerpo); return [x.estado, x.datos.errores && x.datos.errores[0]]; };
  // La Administración global es sólo de la Secretaría
  assert.deepEqual(await error(cabo.id, { ...base, nombre_completo: 'Cabo Prueba Editado', cargo_rol: 'X', perfil: 'ADMIN' }), [400, ['perfil', 'La Administración global es sólo de la Secretaría.']]);
  // Los cabos no se asignan a una coordinación: un teléfono anterior que mande `coordinadores_ids` no guarda nada
  const conCoordinador = await a.pedir('PUT', '/cuentas/' + cabo.id, { ...base, nombre_completo: 'Cabo Prueba Editado', cargo_rol: 'Jefe de cuadrilla', coordinadores_ids: [coord.id], version: r.datos.usuario.fecha_ultima_edicion });
  assert.deepEqual([conCoordinador.estado, 'coordinadores_ids' in conCoordinador.datos.usuario], [200, false]);
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
  // Una coordinación sin registros se elimina aunque su institución tenga cabos: ya no se le asignan
  const coord = (await a.pedir('POST', '/cuentas', { correo: 'coord.prueba.eliminar@ejemplo.local', nombre_completo: 'Coordinación Prueba Eliminar', organizacion_id: 'o-prueba-acceso', cargo_rol: 'Coordinación', perfil: 'COORDINADOR' })).datos.usuario;
  const suCabo = (await a.pedir('POST', '/cuentas', { correo: 'cabo.prueba.coordinado@ejemplo.local', nombre_completo: 'Cabo Prueba Coordinado', organizacion_id: 'o-prueba-acceso', cargo_rol: 'Cabo', perfil: 'CABO', coordinadores_ids: [coord.id] })).datos.usuario;
  const usos = (await a.pedir('GET', '/cuentas/usos')).datos;
  assert.deepEqual([usos[coord.id], usos[suCabo.id], Object.keys(usos[entro.datos.usuario.id])], [undefined, undefined, ['entradas']]);
  assert.equal(usos[ADMIN.id].usuarios >= 4 && usos[ADMIN.id].entradas >= 1, true);
  assert.equal((await a.pedir('DELETE', '/cuentas/' + coord.id)).estado, 200);
  assert.equal((await a.pedir('DELETE', '/cuentas/' + suCabo.id)).estado, 200);
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

test('las entradas fallidas de una misma dirección se cuentan: pasado el tope, esa dirección espera sin que se verifique nada', async () => {
  const conTope = crearApp({ pool: grupo, config: leerConfig({ SRP_COOKIE_SEGURA: 'no', SRP_INTENTOS_POR_PROCEDENCIA: '3' }), proxy: 0 }).listen(0);
  await new Promise((r) => conTope.once('listening', r));
  const en = 'http://127.0.0.1:' + conTope.address().port + config.ruta;
  // El servidor de pruebas es un intermediario propio: la dirección de la persona es la que reenvía
  const entrar = (ip, correo, contrasena) => fetch(en + '/acceso/entrar', { method: 'POST', headers: { 'content-type': 'application/json', 'x-forwarded-for': ip },
    body: JSON.stringify({ correo, contrasena }) }).then(async (r) => [r.status, (await r.json()).codigo]);
  const azar = () => crypto.randomInt(1, 255);
  const A = '203.0.113.' + azar(), B = '198.51.100.' + azar();
  try {
    // Entrar bien no cuenta
    assert.deepEqual(await entrar(A, ADMIN.correo, ADMIN.clave), [200, undefined]);
    // Tres fallidas, con correos que no existen y con una contraseña mala
    assert.deepEqual(await entrar(A, 'nadie.prueba.' + Date.now() + '@ejemplo.local', 'Cualquiera 2026'), [401, 'INCORRECTO']);
    assert.deepEqual(await entrar(A, 'otro.prueba.' + Date.now() + '@ejemplo.local', 'Cualquiera 2026'), [401, 'INCORRECTO']);
    assert.deepEqual(await entrar(A, ADMIN.correo, 'Equivocada 2026'), [401, 'INCORRECTO']);
    // Desde esa dirección ya no se verifica nada, ni la contraseña buena; desde otra, sí
    assert.deepEqual(await entrar(A, ADMIN.correo, ADMIN.clave), [429, 'DEMASIADOS_INTENTOS']);
    assert.deepEqual(await entrar(B, ADMIN.correo, ADMIN.clave), [200, undefined]);
    const filas = (await admin.query('SELECT host(ip) AS ip, evento FROM srp.bitacora_acceso WHERE ip = $1::inet ORDER BY id', [A])).rows;
    assert.deepEqual(filas.map((f) => f.evento), ['ENTRADA', 'ENTRADA_FALLIDA', 'ENTRADA_FALLIDA', 'ENTRADA_FALLIDA'], 'la que espera no se anota');
  } finally {
    conTope.close();
  }
});

test('la contraseña actual también tiene tope al cambiarla: cuenta como un intento de entrar', async () => {
  const a = cliente();
  await a.pedir('POST', '/acceso/entrar', { correo: ADMIN.correo, contrasena: ADMIN.clave });
  const correo = 'cabo.prueba.actual.' + Date.now() + '@ejemplo.local';
  const alta = (await a.pedir('POST', '/cuentas', { correo, nombre_completo: 'Cabo Prueba Actual', organizacion_id: 'o-prueba-acceso', cargo_rol: 'Cabo', perfil: 'CABO' })).datos;
  const c = cliente();
  await c.pedir('POST', '/acceso/entrar', { correo, contrasena: alta.temporal });
  const cambiar = async (actual, nueva = 'Nueva clave 2026') => (await c.pedir('POST', '/acceso/contrasena', { actual, nueva })).datos.codigo ?? 'ok';
  // Dos malas; una buena, aunque la nueva no sirva, vuelve a contar desde cero
  assert.deepEqual([await cambiar('Mala 1'), await cambiar('Mala 2'), await cambiar(alta.temporal, 'corta')], ['ACTUAL_INCORRECTA', 'ACTUAL_INCORRECTA', 'NUEVA_INVALIDA']);
  assert.deepEqual([await cambiar('Mala 3'), await cambiar('Mala 4'), await cambiar(alta.temporal)], ['ACTUAL_INCORRECTA', 'ACTUAL_INCORRECTA', 'ok']);
  // Con la propia: la tercera mala bloquea la cuenta; después, ni la buena, ni para entrar
  assert.deepEqual([await cambiar('Mala 5'), await cambiar('Mala 6'), await cambiar('Mala 7')], ['ACTUAL_INCORRECTA', 'ACTUAL_INCORRECTA', 'ACTUAL_INCORRECTA']);
  const r = await c.pedir('POST', '/acceso/contrasena', { actual: 'Nueva clave 2026', nueva: 'Otra clave 2026' });
  assert.deepEqual([r.estado, r.datos.codigo, r.datos.mensaje], [429, 'DEMASIADOS_INTENTOS', 'Hubo demasiados intentos con la contraseña actual. Espere 15 minutos e intente de nuevo.']);
  assert.equal((await cliente().pedir('POST', '/acceso/entrar', { correo, contrasena: 'Nueva clave 2026' })).estado, 401);
  const eventos = (await admin.query('SELECT evento FROM srp.bitacora_acceso WHERE usuario_id = $1 ORDER BY id', [alta.usuario.id])).rows.map((f) => f.evento);
  assert.deepEqual(eventos, ['ENTRADA', 'CONTRASENA_CAMBIADA', 'BLOQUEO', 'ENTRADA_FALLIDA'], 'el intento que bloquea, y el de entrar con la cuenta bloqueada');
});

test('un valor de configuración mal escrito no detiene el servicio: se usa el de arranque', () => {
  const c = leerConfig({ SRP_TEMPORAL_HORAS: '72 horas', SRP_INTENTOS_MAXIMOS: '-1', SRP_BLOQUEO_MINUTOS: '30' });
  assert.deepEqual([c.acceso.temporalHoras, c.acceso.intentosMaximos, c.acceso.bloqueoMinutos, c.acceso.intentosPorProcedencia], [72, 5, 30, 30]);
});

/* ---------- La Administración global, la versión de una cuenta y el correo ---------- */

// Una cuenta de Administración global que ya entró y escribió su contraseña: su cliente con sesión
async function administracion(a, nombre) {
  const correo = nombre + '.prueba.ultima@ejemplo.local', clave = 'Clave de ' + nombre + ' 2026';
  const alta = await a.pedir('POST', '/cuentas', { correo, nombre_completo: 'Administración ' + nombre + ' Prueba', organizacion_id: 'o-sedema', area_id: 'a-sia', cargo_rol: 'Administración', perfil: 'ADMIN' });
  assert.equal(alta.estado, 201, JSON.stringify(alta.datos));
  const c = cliente();
  await c.pedir('POST', '/acceso/entrar', { correo, contrasena: alta.datos.temporal });
  await c.pedir('POST', '/acceso/contrasena', { actual: alta.datos.temporal, nueva: clave });
  return { id: alta.datos.usuario.id, c };
}

test('nunca queda el sistema sin una Administración global activa, ni cuando dos se desactivan o se quitan el perfil una a la otra al mismo tiempo', async () => {
  const a = cliente();
  await a.pedir('POST', '/acceso/entrar', { correo: ADMIN.correo, contrasena: ADMIN.clave });
  const uno = await administracion(a, 'uno'), dos = await administracion(a, 'dos');
  // Mientras dura la prueba, éstas dos son las únicas activas
  const otras = (await admin.query("SELECT id FROM srp.usuarios WHERE perfil = 'ADMIN' AND activo AND id <> ALL($1::uuid[])", [[uno.id, dos.id]])).rows.map((r) => r.id);
  await admin.query('UPDATE srp.usuarios SET activo = false WHERE id = ANY($1::uuid[])', [otras]);
  const activas = async () => (await admin.query("SELECT count(*)::int AS n FROM srp.usuarios WHERE perfil = 'ADMIN' AND activo AND id = ANY($1::uuid[])", [[uno.id, dos.id]])).rows[0].n;
  try {
    for (let vuelta = 0; vuelta < 4; vuelta++) {
      const r = await Promise.all([uno.c.pedir('POST', '/cuentas/' + dos.id + '/estado', { activo: false }), dos.c.pedir('POST', '/cuentas/' + uno.id + '/estado', { activo: false })]);
      const ultima = r.find((x) => x.estado === 409);
      assert.equal(await activas(), 1, 'queda una, vuelta ' + vuelta + ': ' + JSON.stringify(r.map((x) => [x.estado, x.datos.codigo])));
      assert.ok(!ultima || (ultima.datos.codigo === 'ULTIMA_ADMINISTRACION' &&
        ultima.datos.mensaje === 'Es la única Administración global activa: si se desactiva, nadie podría administrar el sistema. Active o dé de alta otra antes.'));
      await admin.query('UPDATE srp.usuarios SET activo = true WHERE id = ANY($1::uuid[])', [[uno.id, dos.id]]);
      await admin.query("UPDATE srp.sesiones SET cerrada_en = NULL, motivo_cierre = NULL WHERE usuario_id = ANY($1::uuid[]) AND motivo_cierre = 'CUENTA_DESACTIVADA'", [[uno.id, dos.id]]);
    }
    // Quitarse el perfil una a la otra, al mismo tiempo: una lo pierde y a la otra se le dice por qué no
    const perfil = (yo) => ({ organizacion_id: 'o-sedema', area_id: 'a-sia', nombre_completo: 'Administración Prueba Cambiada', cargo_rol: 'Dirección', perfil: 'DIRECTIVO', id: yo });
    const r = await Promise.all([uno.c.pedir('PUT', '/cuentas/' + dos.id, perfil(dos.id)), dos.c.pedir('PUT', '/cuentas/' + uno.id, perfil(uno.id))]);
    const quedan = (await admin.query("SELECT count(*)::int AS n FROM srp.usuarios WHERE perfil = 'ADMIN' AND activo AND id = ANY($1::uuid[])", [[uno.id, dos.id]])).rows[0].n;
    const rechazo = r.find((x) => x.estado !== 200);
    assert.ok(quedan >= 1, 'al menos una sigue siendo Administración: ' + JSON.stringify(r.map((x) => x.datos)));
    // A la otra se le dice por qué no; o, si la primera ya le quitó el perfil, ya no tiene permiso de administrar cuentas
    if (quedan === 1) {
      assert.ok(rechazo && (rechazo.estado === 403 ||
        JSON.stringify(rechazo.datos.errores) === JSON.stringify([['perfil', 'Es la única Administración global activa: no puede dejar de serlo. Active o dé de alta otra antes.']])),
        JSON.stringify(r.map((x) => [x.estado, x.datos])));
    }
  } finally {
    await admin.query('UPDATE srp.usuarios SET activo = true WHERE id = ANY($1::uuid[])', [otras]);
  }
});

test('editar una cuenta trae su versión: si otra Administración la cambió mientras tanto, no escribe encima', async () => {
  const a = cliente();
  await a.pedir('POST', '/acceso/entrar', { correo: ADMIN.correo, contrasena: ADMIN.clave });
  const alta = (await a.pedir('POST', '/cuentas', { correo: 'cabo.prueba.version@ejemplo.local', nombre_completo: 'Cabo Prueba Versión', organizacion_id: 'o-prueba-acceso', cargo_rol: 'Cabo', perfil: 'CABO' })).datos.usuario;
  const cuerpo = (extra) => ({ organizacion_id: 'o-prueba-acceso', nombre_completo: 'Cabo Prueba Versión', cargo_rol: 'Cabo', perfil: 'CABO', ...extra });
  const v0 = alta.fecha_ultima_edicion || alta.fecha_creacion;
  assert.ok(v0, 'el alta responde con su versión');
  const r1 = await a.pedir('PUT', '/cuentas/' + alta.id, cuerpo({ cargo_rol: 'Jefe de cuadrilla', version: v0 }));
  assert.equal(r1.estado, 200, JSON.stringify(r1.datos));
  // Otra edición sobre la versión de antes: no escribe, y se dice
  const vieja = await a.pedir('PUT', '/cuentas/' + alta.id, cuerpo({ nombre_completo: 'Cabo Prueba Encima', version: v0 }));
  assert.deepEqual([vieja.estado, vieja.datos.codigo, vieja.datos.mensaje], [409, 'VERSION_VIEJA', 'Alguien más cambió esta cuenta mientras usted la editaba.']);
  assert.equal((await admin.query('SELECT cargo_rol FROM srp.usuarios WHERE id = $1', [alta.id])).rows[0].cargo_rol, 'Jefe de cuadrilla', 'el cambio de la otra se queda');
  // Con la versión de la lista, que trae microsegundos, también
  const enLista = (await a.pedir('GET', '/cuentas')).datos.filas.find((u) => u.id === alta.id);
  assert.equal((await a.pedir('PUT', '/cuentas/' + alta.id, cuerpo({ cargo_rol: 'Cabo', version: enLista.fecha_ultima_edicion }))).estado, 200);
  // Sin versión, como una aplicación de antes, no se revisa
  assert.equal((await a.pedir('PUT', '/cuentas/' + alta.id, cuerpo({}))).estado, 200);
});

test('el correo lleva hasta 254 caracteres: más largo nunca podría entrar', async () => {
  const a = cliente();
  await a.pedir('POST', '/acceso/entrar', { correo: ADMIN.correo, contrasena: ADMIN.clave });
  const largo = 'x'.repeat(250) + '.prueba@ejemplo.local';
  const r = await a.pedir('POST', '/cuentas', { correo: largo, nombre_completo: 'Correo Largo', organizacion_id: 'o-prueba-acceso', cargo_rol: 'Cabo', perfil: 'CABO' });
  assert.deepEqual([r.estado, r.datos.errores], [400, [['correo', 'El correo lleva hasta 254 caracteres.']]]);
});

test('desactivar una institución en Catálogos cierra al momento las sesiones de sus cuentas', async () => {
  const a = cliente();
  await a.pedir('POST', '/acceso/entrar', { correo: ADMIN.correo, contrasena: ADMIN.clave });
  const alta = await a.pedir('POST', '/cuentas', { correo: 'cabo.prueba.institucion@ejemplo.local', nombre_completo: 'Cabo Prueba Institución', organizacion_id: 'o-prueba-acceso', cargo_rol: 'Cabo', perfil: 'CABO' });
  await cliente().pedir('POST', '/acceso/entrar', { correo: 'cabo.prueba.institucion@ejemplo.local', contrasena: alta.datos.temporal });
  try {
    assert.equal((await a.pedir('POST', '/catalogos/instituciones/o-prueba-acceso/estado', { activo: false })).estado, 200);
    const s = (await admin.query('SELECT count(*) FILTER (WHERE cerrada_en IS NULL)::int AS abiertas, count(*) FILTER (WHERE motivo_cierre = \'INSTITUCION_DESACTIVADA\')::int AS cerradas FROM srp.sesiones WHERE usuario_id = $1', [alta.datos.usuario.id])).rows[0];
    assert.deepEqual(s, { abiertas: 0, cerradas: 1 }, 'sin esperar a que la sesión se vuelva a usar');
  } finally {
    await a.pedir('POST', '/catalogos/instituciones/o-prueba-acceso/estado', { activo: true });
  }
});

test('una vez al día, con la primera entrada, se borra el registro de entradas de hace más de un año', async () => {
  const viejos = async () => (await admin.query("SELECT count(*)::int AS n FROM srp.bitacora_acceso WHERE correo_intentado = 'viejo.prueba.recorte@ejemplo.local'")).rows[0].n;
  for (let i = 0; i < 30 && (await viejos()); i++) await new Promise((r) => setTimeout(r, 100));
  assert.equal(await viejos(), 0);
});
