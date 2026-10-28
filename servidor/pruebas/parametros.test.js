/* PARÁMETROS: el servidor tiene los mismos que la aplicación muestra en Configuración › Parámetros, con sus
   valores de arranque de js/config.js; con sesión se leen, sólo la Administración global los cambia, dentro de
   su rango, y cada cambio queda en la bitácora. La recepción usa el margen del límite de la Ciudad que dice el
   parámetro. Crea sus cuentas y al terminar deja los parámetros como estaban. */
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { conectar, limpiar, RAIZ } from './apoyo.js';
import { leerConfig, crearGrupo, crearApp, derivar, parametros as P } from '../dist/independiente.js';

const CORRIDA = Date.now();
const CLAVE = 'Parametros de prueba 2026';
const cuenta = (nombre, perfil) => ({ id: crypto.randomUUID(), nombre, perfil, correo: nombre + '.parametros.prueba.' + CORRIDA + '@ejemplo.local' });
const ADMIN = cuenta('admin', 'ADMIN'), CABO = cuenta('cabo', 'CABO');
const HOY = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Mexico_City' }).format(new Date());
const JORNADAS = [];

let admin, grupo, servidor, base;

before(async () => {
  admin = await conectar();
  await admin.query('GRANT srp_api TO CURRENT_USER WITH INHERIT FALSE, SET TRUE');
  const derivada = await derivar(CLAVE);
  await admin.query('BEGIN');
  await admin.query(`INSERT INTO srp.instituciones VALUES ('o-sedema', 'SEDEMA', 'Secretaría del Medio Ambiente', true, NULL, now(), NULL, NULL, 'Gobierno de la CDMX') ON CONFLICT DO NOTHING`);
  await admin.query(`INSERT INTO srp.areas VALUES ('a-sia', 'SIA', 'Sistema de Información Ambiental', true, NULL, now(), NULL, NULL) ON CONFLICT DO NOTHING`);
  for (const u of [ADMIN, CABO]) {
    await admin.query(`INSERT INTO srp.usuarios VALUES ($1, $2, $3, 'o-sedema', 'a-sia', $4, $4, true, now(), $1, NULL, NULL)`, [u.id, u.correo, 'Prueba ' + u.nombre, u.perfil]);
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
  const ids = [ADMIN.id, CABO.id];
  await limpiar(admin, async () => {
    // Los parámetros vuelven a como estaban: sin cambios guardados
    await admin.query('DELETE FROM srp.parametros WHERE editado_por_id = ANY($1::uuid[])', [ids]);
    await admin.query('DELETE FROM srp.jornadas WHERE id = ANY($1::uuid[])', [JORNADAS]);
    for (const t of ['bitacora', 'bitacora_acceso']) await admin.query(`ALTER TABLE srp.${t} DISABLE TRIGGER bitacora_inmutable`);
    await admin.query('DELETE FROM srp.bitacora WHERE usuario_id = ANY($1::uuid[])', [ids]);
    await admin.query('DELETE FROM srp.bitacora_acceso WHERE usuario_id = ANY($1::uuid[])', [ids]);
    for (const t of ['bitacora', 'bitacora_acceso']) await admin.query(`ALTER TABLE srp.${t} ENABLE TRIGGER bitacora_inmutable`);
    await admin.query('DELETE FROM srp.usuarios WHERE id = ANY($1::uuid[])', [ids]);
  });
});

async function sesion(u) {
  const r = await fetch(base + '/acceso/entrar', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ correo: u.correo, contrasena: CLAVE }) });
  const cookie = (r.headers.get('set-cookie') || '').split(';')[0];
  return async (metodo, ruta, cuerpo) => {
    const x = await fetch(base + ruta, { method: metodo, headers: { cookie, 'content-type': 'application/json' }, body: cuerpo && JSON.stringify(cuerpo) });
    return { estado: x.status, datos: await x.json() };
  };
}

test('los parámetros del servidor son los que muestra Configuración › Parámetros, con los valores de arranque de js/config.js', () => {
  const ctx = { console, document: { currentScript: { src: 'https://srp.local/js/config.js?v=0' } } };
  ctx.window = ctx;
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(path.join(RAIZ, 'js', 'config.js'), 'utf8'), ctx, { filename: 'js/config.js' });
  const C = ctx.SRP.CONFIG;
  const valor = (clave) => clave.split('.').reduce((o, k) => o[k], C);
  for (const p of P.PARAMETROS) {
    assert.equal(p.porOmision, valor(p.clave), p.clave);
    assert.ok(p.porOmision >= p.minimo && p.porOmision <= p.maximo, 'el de arranque cabe en su rango: ' + p.clave);
    if (p.opciones) assert.deepEqual(p.opciones, Array.from(C.TAMANOS_PAGINA), p.clave);
  }
  // Los que lee la pantalla de Parámetros (js/configuracion.js), ni uno más ni uno menos
  const t = fs.readFileSync(path.join(RAIZ, 'js', 'configuracion.js'), 'utf8');
  const cuerpo = t.slice(t.indexOf('parametros(C = SRP.CONFIG) {'), t.indexOf('prepararParametros()'));
  const enPantalla = new Set([...cuerpo.matchAll(/\bC\.([A-Z_]+(?:\.[A-Z_]+)?)/g)].map((m) => m[1]).concat([...cuerpo.matchAll(/\bM\.([A-Z_]+)/g)].map((m) => 'MAPA.' + m[1])));
  for (const k of ['MAPA', 'TAMANOS_PAGINA']) enPantalla.delete(k);
  assert.deepEqual([...enPantalla].sort(), P.PARAMETROS.map((p) => p.clave).sort());
});

test('con sesión se leen; sólo la Administración global los cambia, dentro de su rango, y cada cambio queda en la bitácora', async () => {
  const cabo = await sesion(CABO), adm = await sesion(ADMIN);
  const lista = (await cabo('GET', '/parametros')).datos;
  const dup = lista.find((p) => p.clave === 'JORNADA.DUPLICADO_M');
  assert.deepEqual([dup.valor, dup.porOmision, dup.minimo, dup.maximo, dup.unidad], [4, 4, 1, 50, 'm']);
  assert.equal((await cabo('PUT', '/parametros/JORNADA.DUPLICADO_M', { valor: 6 })).datos.mensaje, 'No tiene permiso para administrar los catálogos.');
  const r = await adm('PUT', '/parametros/JORNADA.DUPLICADO_M', { valor: 6 });
  assert.deepEqual([r.estado, r.datos], [200, { clave: 'JORNADA.DUPLICADO_M', valor: 6 }]);
  assert.equal((await cabo('GET', '/parametros')).datos.find((p) => p.clave === 'JORNADA.DUPLICADO_M').valor, 6, 'todos los teléfonos lo reciben');
  assert.equal((await adm('PUT', '/parametros/JORNADA.DUPLICADO_M', { valor: 6 })).datos.repetido, true);
  const bit = (await admin.query("SELECT accion, entidad, detalle FROM srp.bitacora WHERE entidad_id = 'parametro:JORNADA.DUPLICADO_M' AND usuario_id = $1", [ADMIN.id])).rows;
  assert.deepEqual(bit, [{ accion: 'EDITADO', entidad: 'catalogo', detalle: 'Parámetro «Puntos duplicados»: 4 → 6 m' }]);
  // Las reglas: entero, en su rango, de sus opciones, y la precisión buena más estricta que la aceptable
  const error = async (clave, valor) => (await adm('PUT', '/parametros/' + clave, { valor })).datos.errores?.[0]?.[1];
  assert.equal(await error('JORNADA.DUPLICADO_M', 0), 'Puntos duplicados va de 1 m a 50 m.');
  assert.equal(await error('JORNADA.DUPLICADO_M', 2.5), 'Puntos duplicados es un número entero.');
  assert.equal(await error('JORNADA.DUPLICADO_M', '6'), 'Escriba un número.');
  assert.equal(await error('LISTA_PAGINA', 30), 'Elija 10, 25, 50 o 100.');
  assert.equal(await error('MAPA.PRECISION_BUENA_M', 40), 'La precisión buena tiene que ser menor que la aceptable.');
  assert.equal((await adm('PUT', '/parametros/OTRO.PARAMETRO', { valor: 1 })).estado, 404);
});

test('la recepción usa el margen del límite de la Ciudad que dice el parámetro', async () => {
  // Un punto unos cientos de metros fuera de la Ciudad: se camina hacia el norte desde el centro hasta salir
  let lat = 19.4326;
  const lng = -99.1332;
  for (let i = 0; i < 100 && (await admin.query('SELECT dentro FROM srp.derivar($1, $2, 0)', [lat.toFixed(6), lng])).rows[0].dentro; i++) lat += 0.003;
  const fuera = (await admin.query('SELECT fuera_m FROM srp.derivar($1, $2, 1000)', [lat.toFixed(6), lng])).rows[0].fuera_m;
  assert.ok(fuera > 0 && fuera < 1000, 'el punto quedó a ' + fuera + ' m del límite');
  const adm = await sesion(ADMIN), cabo = await sesion(CABO);
  const programa = (await admin.query('SELECT id FROM srp.programas WHERE activo ORDER BY id LIMIT 1')).rows[0].id;
  const jornada = () => { const id = crypto.randomUUID(); JORNADAS.push(id); return { tipo: 'jornada.crear', datos: { id, nombre: 'Junto al límite', programa_id: programa, lat: Number(lat.toFixed(6)), lng, punto_origen: 'manual', fecha: HOY, arboles_previstos: 1 } }; };
  await adm('PUT', '/parametros/MAPA.MARGEN_AMBITO_M', { valor: 0 });
  assert.deepEqual((await cabo('POST', '/envios', { operaciones: [jornada()] })).datos.resultados[0].errores, [['lat', 'El punto está fuera de la Ciudad de México. Revise las coordenadas.']]);
  await adm('PUT', '/parametros/MAPA.MARGEN_AMBITO_M', { valor: 1000 });
  const dentro = (await cabo('POST', '/envios', { operaciones: [jornada()] })).datos.resultados[0];
  assert.equal(dentro.estado, 'recibido', 'con el margen amplio, toma la alcaldía más cercana');
  assert.ok(dentro.fila.alcaldia);
});
