/* EL VACIADO DESPUÉS DE LA PRUEBA EN CAMPO (db/srp/vaciar-tras-prueba.sql): sin la palabra de confirmación no toca nada;
   con ella borra jornadas, árboles, fotografías, folios y lo que la bitácora dice de ellos, conserva cuentas, catálogos,
   parámetros y el registro de entradas, y cambia el sello de los datos. La cuenta del servicio no lo puede correr.
   Corre contra la base local con los datos de demostración (los carga si no están) y al terminar los vuelve a cargar. */
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { conectar, RAIZ } from './apoyo.js';
import { vaciarTrasPrueba } from '../bd.js';

const rehacer = () => execFileSync(process.execPath, [path.join(RAIZ, 'servidor', 'cargar.js'), 'rehacer'], { stdio: 'ignore' });
let c;

// Lo que hay en cada tabla que importa al vaciar
async function conteos() {
  const n = async (sql) => Number((await c.query(sql)).rows[0].n);
  return {
    jornadas: await n('SELECT count(*) AS n FROM srp.jornadas'),
    arboles: await n('SELECT count(*) AS n FROM srp.plantaciones'),
    fotografias: await n('SELECT count(*) AS n FROM srp.fotografias'),
    folios: await n('SELECT count(*) AS n FROM srp.folios'),
    secuencias: await n('SELECT count(*) AS n FROM srp.folio_secuencias'),
    prioridades: await n('SELECT count(*) AS n FROM srp.prioridades'),
    duplicados: await n('SELECT count(*) AS n FROM srp.duplicados'),
    cargas: await n('SELECT count(*) AS n FROM srp.cargas'),
    bitacoraDeLaPrueba: await n("SELECT count(*) AS n FROM srp.bitacora WHERE entidad IN ('plantacion', 'jornada', 'carga')"),
    bitacoraQueSigue: await n("SELECT count(*) AS n FROM srp.bitacora WHERE entidad IN ('usuario', 'catalogo')"),
    cuentas: await n('SELECT count(*) AS n FROM srp.usuarios'),
    contrasenas: await n('SELECT count(*) AS n FROM srp.credenciales'),
    especies: await n('SELECT count(*) AS n FROM srp.especies'),
    programas: await n('SELECT count(*) AS n FROM srp.programas'),
    entradas: await n('SELECT count(*) AS n FROM srp.bitacora_acceso')
  };
}
const sello = async () => (await c.query('SELECT valor FROM srp.sello')).rows[0].valor;

before(async () => {
  c = await conectar();
  if (!Number((await c.query('SELECT count(*) AS n FROM srp.plantaciones')).rows[0].n)) { await c.end(); rehacer(); c = await conectar(); }
});
after(async () => {
  await c.end();
  rehacer();
});

test('sin la palabra de confirmación, o con otra, no se vacía nada', async () => {
  const antes = await conteos(), s = await sello();
  assert.ok(antes.jornadas > 0 && antes.arboles > 0 && antes.folios > 0 && antes.bitacoraDeLaPrueba > 0, 'hay datos de la prueba: ' + JSON.stringify(antes));
  await assert.rejects(vaciarTrasPrueba(c, null), /la confirmación debe ser exactamente VACIAR-SRP/);
  await assert.rejects(vaciarTrasPrueba(c, 'vaciar-srp'), /la confirmación debe ser exactamente VACIAR-SRP/);
  assert.deepEqual(await conteos(), antes);
  assert.equal(await sello(), s);
});

test('la cuenta del servicio no lo puede correr', async () => {
  const antes = await conteos();
  await c.query('GRANT srp_api TO CURRENT_USER WITH INHERIT FALSE, SET TRUE');
  await c.query('SET ROLE srp_api');
  try {
    await assert.rejects(vaciarTrasPrueba(c, 'VACIAR-SRP'), /must be owner|debe ser dueño|permission denied|permiso denegado/);
  } finally {
    await c.query('RESET ROLE');
  }
  assert.deepEqual(await conteos(), antes);
});

test('con VACIAR-SRP borra lo de la prueba, conserva cuentas, catálogos y entradas, y cambia el sello', async () => {
  const antes = await conteos(), s = await sello();
  await vaciarTrasPrueba(c, 'VACIAR-SRP');
  const despues = await conteos();
  assert.deepEqual([despues.jornadas, despues.arboles, despues.fotografias, despues.folios, despues.secuencias, despues.prioridades, despues.duplicados, despues.cargas, despues.bitacoraDeLaPrueba],
    [0, 0, 0, 0, 0, 0, 0, 0, 0], JSON.stringify(despues));
  assert.deepEqual([despues.bitacoraQueSigue, despues.cuentas, despues.contrasenas, despues.especies, despues.programas, despues.entradas],
    [antes.bitacoraQueSigue, antes.cuentas, antes.contrasenas, antes.especies, antes.programas, antes.entradas]);
  assert.ok((await sello()) > s, 'el sello cambió por uno más nuevo: los teléfonos borran lo que guardaban');
  const nota = (await c.query('SELECT nota FROM srp.sello')).rows[0].nota;
  assert.equal(nota, `Vaciado tras la prueba en campo: ${antes.jornadas} jornadas, ${antes.arboles} árboles, ${antes.fotografias} registros de fotografías, ${antes.folios} folios y ${antes.bitacoraDeLaPrueba} renglones de la bitácora`);
  // Los disparadores de inmutabilidad vuelven a estar encendidos
  const t = (await c.query("SELECT tgname, tgenabled FROM pg_trigger WHERE tgname IN ('bitacora_inmutable', 'folios_inmutables') AND tgrelid IN ('srp.bitacora'::regclass, 'srp.folios'::regclass) ORDER BY tgname")).rows;
  assert.deepEqual(t.map(x => [x.tgname, x.tgenabled]), [['bitacora_inmutable', 'O'], ['folios_inmutables', 'O']]);
  await assert.rejects(c.query('TRUNCATE srp.bitacora'), /no se edita ni se borra/);
});
