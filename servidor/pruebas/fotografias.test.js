/* FOTOGRAFÍAS: llegan después de su árbol, de quien puede editarlo, y quedan como archivos fuera de la base,
   con su registro y su huella. No se reemplazan; un reenvío de la misma no se repite. Las descarga quien ve
   el árbol y puede descargar fotografías. La Administración ve cuánto ocupan y cuánto ocuparían en un año.
   Usa una carpeta temporal propia y sus propias cuentas, jornada y árbol, y al terminar los quita. */
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { conectar, limpiar } from './apoyo.js';
import { leerConfig, crearGrupo, crearApp, derivar } from '../dist/independiente.js';

const CORRIDA = Date.now();
const CLAVE = 'Fotografias de prueba 2026';
const uuid = () => crypto.randomUUID();
const cuenta = (nombre, perfil) => ({ id: uuid(), nombre, perfil, correo: nombre + '.fotos.prueba.' + CORRIDA + '@ejemplo.local' });
const ADMIN = cuenta('admin', 'ADMIN'), CABO = cuenta('cabo', 'CABO'), OTRO = cuenta('otrocabo', 'CABO'), DIRECTIVO = cuenta('directivo', 'DIRECTIVO');
const CUENTAS = [ADMIN, CABO, OTRO, DIRECTIVO];
const CARPETA = fs.mkdtempSync(path.join(os.tmpdir(), 'srp-fotos-prueba-'));
const HOY = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Mexico_City' }).format(new Date());
// Una imagen JPEG de verdad, la más pequeña, y otra distinta
const JPEG = Buffer.from('/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=', 'base64');
const OTRA = Buffer.concat([JPEG, Buffer.from('distinta')]);

let admin, grupo, servidor, sinCarpeta, base, baseSin;
const FOTO = uuid(), ARBOL = uuid(), JORNADA = uuid(), FOTO2 = uuid(), ARBOL2 = uuid(), FOTO3 = uuid(), ARBOL3 = uuid();

before(async () => {
  admin = await conectar();
  await admin.query('GRANT srp_api TO CURRENT_USER WITH INHERIT FALSE, SET TRUE');
  const derivada = await derivar(CLAVE);
  await admin.query('BEGIN');
  await admin.query(`INSERT INTO srp.instituciones VALUES ('o-sedema', 'SEDEMA', 'Secretaría del Medio Ambiente', true, NULL, now(), NULL, NULL, 'Gobierno de la CDMX') ON CONFLICT DO NOTHING`);
  await admin.query(`INSERT INTO srp.areas VALUES ('a-sia', 'SIA', 'Sistema de Información Ambiental', true, NULL, now(), NULL, NULL) ON CONFLICT DO NOTHING`);
  for (const u of CUENTAS) {
    await admin.query(`INSERT INTO srp.usuarios VALUES ($1, $2, $3, 'o-sedema', 'a-sia', $4, $4, '{}', true, now(), $1, NULL, NULL)`, [u.id, u.correo, 'Prueba ' + u.nombre, u.perfil]);
    await admin.query(`INSERT INTO srp.credenciales VALUES ($1, $2, false, NULL, 0, NULL, now(), $1)`, [u.id, derivada]);
  }
  await admin.query('COMMIT');
  grupo = crearGrupo({ rol: 'srp_api' });
  const config = leerConfig({ SRP_COOKIE_SEGURA: 'no', SRP_FOTOS_DIR: CARPETA, SRP_FOTO_MAXIMO_KB: '64' });
  servidor = crearApp({ pool: grupo, config, proxy: 0 }).listen(0);
  sinCarpeta = crearApp({ pool: grupo, config: leerConfig({ SRP_COOKIE_SEGURA: 'no' }), proxy: 0 }).listen(0);
  await Promise.all([servidor, sinCarpeta].map((s) => new Promise((r) => s.once('listening', r))));
  base = 'http://127.0.0.1:' + servidor.address().port + config.ruta;
  baseSin = 'http://127.0.0.1:' + sinCarpeta.address().port + config.ruta;
});

after(async () => {
  servidor && servidor.close();
  sinCarpeta && sinCarpeta.close();
  grupo && await grupo.end();
  const ids = CUENTAS.map((u) => u.id);
  await limpiar(admin, async () => {
    await admin.query('DELETE FROM srp.fotografias WHERE id = ANY($1::uuid[])', [[FOTO, FOTO2, FOTO3]]);
    await admin.query('ALTER TABLE srp.folios DISABLE TRIGGER folios_inmutables');
    await admin.query('DELETE FROM srp.folios WHERE plantacion_id = ANY($1::uuid[])', [[ARBOL, ARBOL2, ARBOL3]]);
    await admin.query('ALTER TABLE srp.folios ENABLE TRIGGER folios_inmutables');
    await admin.query('DELETE FROM srp.plantaciones WHERE id = ANY($1::uuid[])', [[ARBOL, ARBOL2, ARBOL3]]);
    await admin.query('DELETE FROM srp.jornadas WHERE id = $1', [JORNADA]);
    for (const t of ['bitacora', 'bitacora_acceso']) await admin.query(`ALTER TABLE srp.${t} DISABLE TRIGGER bitacora_inmutable`);
    await admin.query('DELETE FROM srp.bitacora WHERE usuario_id = ANY($1::uuid[])', [ids]);
    await admin.query('DELETE FROM srp.bitacora_acceso WHERE usuario_id = ANY($1::uuid[])', [ids]);
    for (const t of ['bitacora', 'bitacora_acceso']) await admin.query(`ALTER TABLE srp.${t} ENABLE TRIGGER bitacora_inmutable`);
    await admin.query('DELETE FROM srp.usuarios WHERE id = ANY($1::uuid[])', [ids]);
  });
  fs.rmSync(CARPETA, { recursive: true, force: true });
});

// Una cuenta con su sesión
async function sesion(u, en = base) {
  const r = await fetch(en + '/acceso/entrar', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ correo: u.correo, contrasena: CLAVE }) });
  const cookie = (r.headers.get('set-cookie') || '').split(';')[0];
  return {
    subir: async (id, datos) => { const x = await fetch(en + '/fotos/' + id, { method: 'PUT', headers: { cookie, 'content-type': 'image/jpeg' }, body: datos }); return { estado: x.status, datos: await x.json() }; },
    bajar: (id) => fetch(en + '/fotos/' + id, { headers: { cookie } }),
    json: async (ruta, metodo = 'GET', cuerpo) => { const x = await fetch(en + ruta, { method: metodo, headers: { cookie, 'content-type': 'application/json' }, body: cuerpo && JSON.stringify(cuerpo) }); return { estado: x.status, datos: await x.json() }; },
  };
}

test('la fotografía llega después de su árbol, de quien puede editarlo, y queda como archivo con su registro y su huella', async () => {
  const cabo = await sesion(CABO);
  assert.equal((await cabo.subir(FOTO, JPEG)).datos.codigo, 'ARBOL_PENDIENTE', 'antes que su árbol, no');
  const programa = (await admin.query('SELECT id FROM srp.programas WHERE activo ORDER BY id LIMIT 1')).rows[0].id;
  const especie = (await admin.query('SELECT id FROM srp.especies WHERE activo ORDER BY id LIMIT 1')).rows[0].id;
  const punto = { lat: 19.4326, lng: -99.1332, punto_origen: 'gps' };
  const r = await cabo.json('/envios', 'POST', { operaciones: [
    { tipo: 'jornada.crear', datos: { id: JORNADA, nombre: 'Jornada de prueba de fotografías', programa_id: programa, ...punto, fecha: HOY, arboles_previstos: 1 } },
    { tipo: 'registro.crear', datos: { id: ARBOL, jornada_id: JORNADA, ...punto, especie_id: especie, fecha_plantacion: HOY, foto_id: FOTO } }] });
  assert.ok(r.datos.resultados.every((x) => x.estado === 'recibido'), JSON.stringify(r.datos));

  assert.equal((await (await sesion(OTRO)).subir(FOTO, JPEG)).estado, 403, 'quien no puede editar el árbol, no');
  const subida = await cabo.subir(FOTO, JPEG);
  const huella = crypto.createHash('sha256').update(JPEG).digest('hex');
  assert.deepEqual([subida.estado, subida.datos], [201, { id: FOTO, tipo: 'image/jpeg', bytes: JPEG.length, sha256: huella }]);
  assert.deepEqual(fs.readFileSync(path.join(CARPETA, FOTO.slice(0, 2), FOTO + '.jpg')), JPEG, 'el archivo, completo');
  const reg = (await admin.query('SELECT plantacion_id, bytes, sha256, recibida_por_id FROM srp.fotografias WHERE id = $1', [FOTO])).rows[0];
  assert.deepEqual(reg, { plantacion_id: ARBOL, bytes: JPEG.length, sha256: huella, recibida_por_id: CABO.id });
  // La misma otra vez no se repite; otra distinta con el mismo id, no entra
  assert.deepEqual([(await cabo.subir(FOTO, JPEG)).estado, (await cabo.subir(FOTO, JPEG)).datos.repetida], [200, true]);
  assert.equal((await cabo.subir(FOTO, OTRA)).datos.codigo, 'YA_EXISTE');
  assert.equal((await cabo.subir(uuid(), Buffer.from('no soy una imagen'))).datos.codigo, 'NO_ES_IMAGEN');
  assert.deepEqual(await cabo.subir(uuid(), Buffer.concat([JPEG, Buffer.alloc(70 * 1024)])), { estado: 413, datos: { codigo: 'FOTO_GRANDE', mensaje: 'La fotografía pesa más de 64 KB.' } });
});

test('dos envíos al mismo tiempo de fotografías distintas con el mismo id: entra una, y el archivo es el de su registro', async () => {
  const cabo = await sesion(CABO);
  const especie = (await admin.query('SELECT id FROM srp.especies WHERE activo ORDER BY id LIMIT 1')).rows[0].id;
  const r = await cabo.json('/envios', 'POST', { operaciones: [{ tipo: 'registro.crear',
    datos: { id: ARBOL2, jornada_id: JORNADA, lat: 19.4327, lng: -99.1333, punto_origen: 'gps', especie_id: especie, fecha_plantacion: HOY, foto_id: FOTO2 } }] });
  assert.equal(r.datos.resultados[0].estado, 'recibido', JSON.stringify(r.datos));
  const llegadas = await Promise.all([cabo.subir(FOTO2, JPEG), cabo.subir(FOTO2, OTRA)]);
  assert.deepEqual(llegadas.map((x) => x.estado).sort(), [201, 409]);
  const registrada = (await admin.query('SELECT sha256 FROM srp.fotografias WHERE id = $1', [FOTO2])).rows[0].sha256;
  const archivo = fs.readFileSync(path.join(CARPETA, FOTO2.slice(0, 2), FOTO2 + '.jpg'));
  assert.equal(crypto.createHash('sha256').update(archivo).digest('hex'), registrada);
  assert.deepEqual(fs.readdirSync(path.join(CARPETA, FOTO2.slice(0, 2))).filter((f) => f.endsWith('.parcial')), [], 'no quedan archivos a medias');
});

test('la descargan quienes ven el árbol y pueden descargar fotografías; para los demás no existe', async () => {
  const r = await (await sesion(CABO)).bajar(FOTO);
  assert.equal(r.status, 200);
  assert.deepEqual(Buffer.from(await r.arrayBuffer()), JPEG);
  assert.deepEqual([r.headers.get('content-type'), r.headers.get('cache-control')], ['image/jpeg', 'no-store']);
  assert.equal((await (await sesion(DIRECTIVO)).bajar(FOTO)).status, 200, 'la dirección de la Secretaría ve todo');
  assert.equal((await (await sesion(OTRO)).bajar(FOTO)).status, 404, 'otro cabo no ve ese árbol');
  assert.equal((await fetch(base + '/fotos/' + FOTO)).status, 401, 'sin sesión');
  assert.equal((await (await sesion(CABO)).bajar(uuid())).status, 404);
});

test('la Administración ve cuánto ocupan las fotografías y cuánto ocuparían en un año al ritmo de los últimos 30 días', async () => {
  const uso = await (await sesion(ADMIN)).json('/fotos/uso');
  assert.equal(uso.estado, 200);
  assert.ok(uso.datos.fotografias >= 1 && uso.datos.ultimos_30_dias.fotografias >= 1, JSON.stringify(uso.datos));
  assert.deepEqual(Object.keys(uso.datos).sort(), ['al_ano_megabytes', 'fotografias', 'megabytes', 'promedio_kb', 'ultimos_30_dias']);
  assert.equal((await (await sesion(CABO)).json('/fotos/uso')).estado, 403);
});

test('si falta el archivo se dice, y sin carpeta el servidor responde que todavía no recibe fotografías', async () => {
  fs.rmSync(path.join(CARPETA, FOTO.slice(0, 2), FOTO + '.jpg'));
  const r = await (await sesion(CABO)).bajar(FOTO);
  assert.deepEqual([r.status, (await r.json()).codigo], [404, 'SIN_ARCHIVO']);
  assert.deepEqual(await (await sesion(CABO, baseSin)).subir(FOTO, JPEG), { estado: 503, datos: { codigo: 'SIN_FOTOGRAFIAS', mensaje: 'Este servidor todavía no recibe fotografías.' } });
});

// Un bloque de una JPEG: su marca, su largo y su contenido
const bloque = (marca, texto) => { const c = Buffer.from(texto, 'latin1'), b = Buffer.from([0xff, marca, 0, 0]); b.writeUInt16BE(c.length + 2, 2); return Buffer.concat([b, c]); };

test('lo que llega se revisa entero y se guarda sin los datos de la cámara; la fotografía es de un solo árbol', async () => {
  const cabo = await sesion(CABO);
  // Sólo el comienzo de una imagen y luego otra cosa, o una WebP que sólo trae su cabecera: no entran
  const polizon = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff]), Buffer.from('<html><script>alert(1)</script></html>')]);
  assert.equal((await cabo.subir(uuid(), polizon)).datos.codigo, 'NO_ES_IMAGEN');
  assert.equal((await cabo.subir(uuid(), Buffer.concat([Buffer.from('RIFF'), Buffer.alloc(4), Buffer.from('WEBP')]))).datos.codigo, 'NO_ES_IMAGEN');
  // Una JPEG con la ubicación y el modelo del teléfono (APP1) y un comentario se guarda sin ellos
  const especie = (await admin.query('SELECT id FROM srp.especies WHERE activo ORDER BY id LIMIT 1')).rows[0].id;
  const arbol = (id, foto) => ({ tipo: 'registro.crear', datos: { id, jornada_id: JORNADA, lat: 19.4328, lng: -99.1334, punto_origen: 'gps', especie_id: especie, fecha_plantacion: HOY, foto_id: foto } });
  assert.equal((await cabo.json('/envios', 'POST', { operaciones: [arbol(ARBOL3, FOTO3)] })).datos.resultados[0].estado, 'recibido');
  const conCamara = Buffer.concat([JPEG.subarray(0, 2), bloque(0xe1, 'Exif\0\0GPS 19N 99W, Telefono X'), bloque(0xfe, 'un comentario'), JPEG.subarray(2)]);
  const s = await cabo.subir(FOTO3, conCamara);
  assert.deepEqual([s.estado, s.datos.bytes], [201, JPEG.length], JSON.stringify(s.datos));
  assert.deepEqual(fs.readFileSync(path.join(CARPETA, FOTO3.slice(0, 2), FOTO3 + '.jpg')), JPEG, 'el archivo, sin los datos de la cámara');
  // Lo que responde el servicio no se interpreta por su contenido
  assert.equal((await cabo.bajar(FOTO3)).headers.get('x-content-type-options'), 'nosniff');
  // Otro árbol no puede reclamar esa fotografía
  const otro = (await cabo.json('/envios', 'POST', { operaciones: [arbol(uuid(), FOTO3)] })).datos.resultados[0];
  assert.deepEqual([otro.estado, otro.errores], ['rechazado', [['foto_id', 'Esa fotografía ya es de otro árbol.']]]);
});
