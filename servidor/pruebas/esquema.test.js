/* EL ESQUEMA srp: se crea y se destruye en limpio, sus tablas son las del diccionario de datos, sus
   reglas rechazan lo inválido y la cuenta del servicio tiene sólo los permisos que necesita.
   Corre contra la base local de desarrollo: al empezar la deja sin el esquema y al terminar lo vuelve a
   instalar y a cargar con lo que haya (npm run cargar -- rehacer). */
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { conectar, instalar, destruir, codigoDeError, RAIZ } from './apoyo.js';

const ESQUEMA = JSON.parse(fs.readFileSync(path.join(RAIZ, 'datos', 'esquema.json'), 'utf8'));
const PROPIAS_DEL_SERVIDOR = ['capa_alcaldias', 'capa_colonias', 'capa_prioritarias', 'capa_uga', 'capas', 'credenciales', 'migraciones', 'sesiones'];
const PERMISO_DENEGADO = '42501', VIOLA_CHECK = '23514', VIOLA_FORANEA = '23503', VIOLA_UNICO = '23505';

// El tipo del diccionario como lo escribe PostgreSQL (format_type)
function tipoPg(t) {
  const lista = t.endsWith('[]'), base = lista ? t.slice(0, -2) : t;
  if (t === 'objeto[]') return 'jsonb';
  const m = base.match(/^(\w+)(\(.+\))?$/);
  const nombre = { varchar: 'character varying', char: 'character', timestamptz: 'timestamp with time zone' }[m[1]] || m[1];
  return nombre + (m[2] || '') + (lista ? '[]' : '');
}

let c;
before(async () => {
  c = await conectar();
  await destruir(c);
});
after(async () => {
  try {
    await c.query('ROLLBACK').catch(() => {});
  } finally {
    await c.end();
  }
  execFileSync(process.execPath, [path.join(RAIZ, 'servidor', 'cargar.js'), 'rehacer'], { stdio: 'ignore' });
});

test('la instalación crea el esquema completo en una sola transacción', async () => {
  await instalar(c);
  await c.query('SET ROLE srp_propietario');
  const { rows } = await c.query("SELECT tablename, tableowner FROM pg_tables WHERE schemaname = 'srp' ORDER BY tablename");
  await c.query('RESET ROLE');
  const esperadas = Object.keys(ESQUEMA.tablas).concat(PROPIAS_DEL_SERVIDOR).sort();
  assert.deepEqual(rows.map(r => r.tablename), esperadas);
  assert.ok(rows.every(r => r.tableowner === 'srp_propietario'), 'todas las tablas son de la cuenta propietaria');
});

test('cada tabla tiene los campos del diccionario, en su orden, con su tipo y sus nulos', async () => {
  await c.query('SET ROLE srp_propietario');
  for (const [tabla, info] of Object.entries(ESQUEMA.tablas)) {
    const { rows } = await c.query(
      `SELECT a.attname AS campo, format_type(a.atttypid, a.atttypmod) AS tipo, NOT a.attnotnull AS nulo
         FROM pg_attribute a WHERE a.attrelid = $1::regclass AND a.attnum > 0 AND NOT a.attisdropped ORDER BY a.attnum`, ['srp.' + tabla]);
    assert.deepEqual(rows, info.campos.map(x => ({ campo: x.campo, tipo: tipoPg(x.tipo), nulo: x.nulo })), 'tabla ' + tabla);
  }
  await c.query('RESET ROLE');
});

test('queda anotada la versión 1 y una segunda instalación falla sin dejar nada a medias', async () => {
  await c.query('SET ROLE srp_propietario');
  const v = await c.query('SELECT version FROM srp.migraciones');
  await c.query('RESET ROLE');
  assert.deepEqual(v.rows, [{ version: 1 }]);
  await assert.rejects(instalar(c), /ya existe|already exists/);
  await c.query('SET ROLE srp_propietario');
  const n = await c.query("SELECT count(*)::int AS n FROM pg_tables WHERE schemaname = 'srp'");
  await c.query('RESET ROLE');
  assert.equal(n.rows[0].n, Object.keys(ESQUEMA.tablas).length + PROPIAS_DEL_SERVIDOR.length);
});

test('quien administra la base no ve los datos sin asumir la cuenta propietaria', async () => {
  await c.query('BEGIN');
  assert.equal(await codigoDeError(c, 'SELECT 1 FROM srp.plantaciones'), PERMISO_DENEGADO);
  await c.query('ROLLBACK');
});

test('la cuenta del servicio sólo opera datos; la bitácora sólo crece', async () => {
  await c.query('GRANT srp_servicio TO CURRENT_USER WITH INHERIT FALSE, SET TRUE');
  await c.query('BEGIN');
  await c.query('SET LOCAL ROLE srp_servicio');
  const ahora = new Date().toISOString();
  const admin = '00000000-0000-4000-8000-000000000001';
  // Una cadena completa: institución, cuenta, catálogos, jornada y árbol
  await c.query("INSERT INTO srp.instituciones VALUES ('o-sedema', 'SEDEMA', 'Secretaría del Medio Ambiente', true, NULL, $1, NULL, NULL, 'Gobierno de la CDMX')", [ahora]);
  await c.query("INSERT INTO srp.areas VALUES ('a-sia', 'SIA', 'Sistema de Información Ambiental', true, NULL, $1, NULL, NULL)", [ahora]);
  await c.query("INSERT INTO srp.usuarios VALUES ($1, 'administracion@ejemplo.local', 'Administración Ejemplo', 'o-sedema', 'a-sia', 'Administración global', 'ADMIN', '{}', true, $2, $1, NULL, NULL)", [admin, ahora]);
  await c.query("INSERT INTO srp.programas VALUES ('p-refor', 'REFORESTACION_URBANA', 'Reforestación Urbana', true, NULL, $1, NULL, NULL, '{Alcaldía}')", [ahora]);
  await c.query("INSERT INTO srp.especies VALUES ('ESP-0029', 'ESP-0029', 'Fresno', true, NULL, $1, NULL, NULL, 'Fraxinus uhdei', '', 'Nativa', 'Árbol', 'Sí', 'No', NULL, NULL)", [ahora]);
  const jornada = '00000000-0000-4000-8000-0000000000a1';
  await c.query(`INSERT INTO srp.jornadas VALUES ($1, 'Jornada de prueba', '', 'p-refor', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2026-10-05', '', $2,
    'o-sedema', 'abierta', $3, NULL, NULL, NULL, '[]', NULL, '', '', NULL, NULL, 10, '{}', NULL, NULL, '', '', '', '', '', '', '', NULL, '')`, [jornada, admin, ahora]);
  const arbol = (id, extra = {}) => {
    const v = Object.assign({ especie_id: 'ESP-0029', especie_otra: '', folio: null, estatus: 'activo', sustituye_id: null, sustituido_por_id: null, motivo: null }, extra);
    return c.query(`INSERT INTO srp.plantaciones VALUES ($1, $2, $3, 19.432600, -99.133200, 'gps', 5, $4, $5, $6, NULL, NULL, NULL, NULL, NULL, NULL, NULL,
      'p-refor', '2026-10-05', $7, $8, $9, '', $10, '', NULL, NULL, $11, NULL, NULL)`,
      [id, v.estatus, admin, v.folio, v.especie_id, v.especie_otra, jornada, v.sustituye_id, v.motivo, v.sustituido_por_id, ahora]);
  };
  await arbol('00000000-0000-4000-8000-0000000000b1', { folio: 'CUH-001-00001' });
  await c.query("INSERT INTO srp.bitacora VALUES (gen_random_uuid(), $1, $2, 'Administración Ejemplo', 'ADMIN', 'CREADO', 'plantacion', 'x', '')", [ahora, admin]);

  // Un árbol perdido y su sustituto se señalan entre sí: se escriben juntos y se comprueban al confirmar
  await c.query('SET CONSTRAINTS ALL DEFERRED');
  await arbol('00000000-0000-4000-8000-0000000000b2', { estatus: 'sustituido', sustituido_por_id: '00000000-0000-4000-8000-0000000000b3' });
  await arbol('00000000-0000-4000-8000-0000000000b3', { sustituye_id: '00000000-0000-4000-8000-0000000000b2', motivo: 'ROBO' });
  await c.query('SET CONSTRAINTS ALL IMMEDIATE');

  // Las reglas rechazan lo inválido
  assert.equal(await codigoDeError(c, "UPDATE srp.plantaciones SET estatus = 'perdido'"), VIOLA_CHECK, 'estatus fuera de la lista');
  assert.equal(await codigoDeError(c, "UPDATE srp.plantaciones SET folio = 'CUH-1-1' WHERE folio IS NOT NULL"), VIOLA_CHECK, 'folio con otro formato');
  assert.equal(await codigoDeError(c, "UPDATE srp.plantaciones SET especie_id = NULL, especie_otra = ''"), VIOLA_CHECK, 'sin especie ni especie escrita');
  assert.equal(await codigoDeError(c, "UPDATE srp.plantaciones SET especie_id = 'ESP-9999'"), VIOLA_FORANEA, 'especie que no existe');
  assert.equal(await codigoDeError(c, "UPDATE srp.plantaciones SET motivo_sustitucion = 'OTRO' WHERE sustituye_id IS NOT NULL"), VIOLA_CHECK, 'motivo OTRO sin escribirlo');
  assert.equal(await codigoDeError(c, "UPDATE srp.jornadas SET hora = '25:00'"), VIOLA_CHECK, 'hora inválida');
  assert.equal(await codigoDeError(c, "UPDATE srp.jornadas SET hora = '14:30'"), null, 'hora válida');
  assert.equal(await codigoDeError(c, "UPDATE srp.jornadas SET arboles_previstos = 0"), VIOLA_CHECK, 'cero árboles previstos');
  assert.equal(await codigoDeError(c, "UPDATE srp.usuarios SET correo = 'Mayusculas@ejemplo.local'"), VIOLA_CHECK, 'correo con mayúsculas');
  assert.equal(await codigoDeError(c, "UPDATE srp.programas SET tipos_organizacion = '{Cooperativa}'"), VIOLA_CHECK, 'tipo de institución inexistente');
  assert.equal(await codigoDeError(c, "UPDATE srp.especies SET paleta_vegetal = 'Tal vez'"), VIOLA_CHECK, 'paleta vegetal fuera de la lista');
  assert.equal(await codigoDeError(c, "INSERT INTO srp.areas VALUES ('a-otra', 'SIA', 'Otra', true, NULL, now(), NULL, NULL)"), VIOLA_UNICO, 'clave repetida');
  assert.equal(await codigoDeError(c, "DELETE FROM srp.especies WHERE id = 'ESP-0029'"), VIOLA_FORANEA, 'una especie en uso no se elimina');

  // Lo que la cuenta del servicio no puede hacer
  assert.equal(await codigoDeError(c, "UPDATE srp.bitacora SET detalle = 'cambiado'"), PERMISO_DENEGADO, 'editar la bitácora');
  assert.equal(await codigoDeError(c, 'DELETE FROM srp.bitacora'), PERMISO_DENEGADO, 'borrar la bitácora');
  assert.equal(await codigoDeError(c, 'TRUNCATE srp.plantaciones'), PERMISO_DENEGADO, 'vaciar una tabla');
  assert.equal(await codigoDeError(c, 'CREATE TABLE srp.otra (x int)'), PERMISO_DENEGADO, 'crear tablas');
  assert.equal(await codigoDeError(c, 'DROP TABLE srp.plantaciones'), PERMISO_DENEGADO, 'borrar tablas');
  assert.equal(await codigoDeError(c, 'ALTER TABLE srp.plantaciones ADD COLUMN x int'), PERMISO_DENEGADO, 'cambiar tablas');
  assert.equal(await codigoDeError(c, "INSERT INTO srp.migraciones VALUES (2, 'x')"), PERMISO_DENEGADO, 'anotar versiones');
  assert.equal(await codigoDeError(c, 'CREATE TABLE public.otra (x int)'), PERMISO_DENEGADO, 'crear tablas fuera del esquema');
  await c.query('ROLLBACK');
  await c.query('REVOKE srp_servicio FROM CURRENT_USER');
});

test('al eliminar una cuenta sin registros se van su contraseña y sus sesiones', async () => {
  await c.query('BEGIN');
  await c.query('SET LOCAL ROLE srp_propietario');
  const id = '00000000-0000-4000-8000-000000000002';
  await c.query("INSERT INTO srp.instituciones VALUES ('o-x', 'X', 'Institución X', true, NULL, now(), NULL, NULL, 'Empresa privada')");
  await c.query("INSERT INTO srp.usuarios VALUES ($1, 'cabo@ejemplo.local', 'Cabo Ejemplo', 'o-x', NULL, 'Cabo', 'CABO', '{}', true, now(), $1, NULL, NULL)", [id]);
  await c.query("INSERT INTO srp.credenciales VALUES ($1, 'scrypt$x', true, now() + interval '1 day', 0, NULL, now(), $1)", [id]);
  await c.query("INSERT INTO srp.sesiones (testigo_resumen, usuario_id, expira_en) VALUES ('\\x01', $1, now() + interval '1 day')", [id]);
  assert.equal(await codigoDeError(c, "UPDATE srp.sesiones SET cerrada_en = now()"), VIOLA_CHECK, 'una sesión cerrada dice por qué');
  await c.query('DELETE FROM srp.usuarios WHERE id = $1', [id]);
  const r = await c.query('SELECT (SELECT count(*) FROM srp.credenciales)::int + (SELECT count(*) FROM srp.sesiones)::int AS n');
  assert.equal(r.rows[0].n, 0);
  await c.query('ROLLBACK');
});

test('destruir deja la base sin el esquema ni sus cuentas, y se puede volver a instalar', async () => {
  await destruir(c);
  const r = await c.query("SELECT (SELECT count(*) FROM pg_namespace WHERE nspname = 'srp')::int AS esquemas, (SELECT count(*) FROM pg_roles WHERE rolname IN ('srp_propietario', 'srp_servicio'))::int AS cuentas");
  assert.deepEqual(r.rows[0], { esquemas: 0, cuentas: 0 });
  await instalar(c);
  await destruir(c);
});
