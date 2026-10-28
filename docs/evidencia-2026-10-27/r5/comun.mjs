/* r5 · Apoyo común de los guiones de ataque (auditoría 27-10-2026).
   Cuentas de prueba de r5, entrada al servicio, envíos y lectura de la base local (sólo lectura).
   La contraseña de las cuentas de prueba NO se escribe aquí: se lee de la variable R5_CLAVE
   (o del archivo que diga R5_CLAVE_ARCHIVO). Servicio en http://127.0.0.1:3125/api/srp. */
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

export const AQUI = path.dirname(fileURLToPath(import.meta.url));
export const RAIZ = path.join(AQUI, '..');
export const API = process.env.R5_API || 'http://127.0.0.1:3125/api/srp';
export const CLAVE = process.env.R5_CLAVE || (process.env.R5_CLAVE_ARCHIVO ? fs.readFileSync(process.env.R5_CLAVE_ARCHIVO, 'utf8').trim() : '');

const id = (n) => 'a5a5a5a5-0000-4000-8000-' + String(n).padStart(12, '0');
const c = (n, alias, perfil, org) => ({ id: id(n), correo: 'r5.' + alias + '@ejemplo.local', nombre: 'R5 ' + alias, perfil, organizacion_id: org, clave: CLAVE });
export const CUENTAS = {
  admin: c(1, 'admin', 'ADMIN', 'o-sedema'),
  coord: c(2, 'coord', 'COORDINADOR', 'o-sedema'),
  cabo1: c(3, 'cabo1', 'CABO', 'o-sedema'),
  cabo2: c(4, 'cabo2', 'CABO', 'o-sedema'),
  cabo3: c(5, 'cabo3', 'CABO', 'o-sedema'),
  coord2: c(6, 'coord2', 'COORDINADOR', 'o-sedema'),
  otroCabo: c(7, 'otro.cabo', 'CABO', 'o-paot'),
  otroCoord: c(8, 'otro.coord', 'COORDINADOR', 'o-paot'),
  dir: c(9, 'dir', 'DIRECTIVO', 'o-sedema'),
};
export const IDS = Object.values(CUENTAS).map((x) => x.id);

// apoyo_servidor.mjs de la copia r5 (preparar, quitar, apoyos, leer, vencer…)
export function apoyo(orden, datos = {}) {
  const r = spawnSync('node', [path.join('pruebas', 'apoyo_servidor.mjs'), orden], { cwd: RAIZ, input: JSON.stringify(datos), encoding: 'utf8', timeout: 120000 });
  const s = JSON.parse(r.stdout || '{}');
  if (s.ok === false) throw new Error('apoyo ' + orden + ': ' + s.error + ' ' + (r.stderr || ''));
  return s;
}

// Una sesión en el servicio: la cookie, como la guarda el navegador
export async function entrar(cuenta) {
  const r = await fetch(API + '/acceso/entrar', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ correo: cuenta.correo, contrasena: CLAVE }) });
  const galleta = (r.headers.get('set-cookie') || '').split(';')[0];
  if (r.status !== 200) throw new Error('No entró ' + cuenta.correo + ': ' + r.status + ' ' + (await r.text()));
  return { cuenta, galleta };
}

export async function pedir(s, metodo, ruta, cuerpo) {
  const t0 = performance.now();
  const r = await fetch(API + ruta, { method: metodo, headers: { 'content-type': 'application/json', cookie: s.galleta }, body: cuerpo === undefined ? undefined : JSON.stringify(cuerpo) });
  const texto = await r.text();
  let datos = null;
  try { datos = JSON.parse(texto); } catch { datos = texto; }
  return { estado: r.status, datos, ms: Math.round(performance.now() - t0) };
}

// Un envío de operaciones: devuelve los resultados
export async function enviar(s, operaciones) {
  const r = await pedir(s, 'POST', '/envios', { operaciones });
  if (r.estado !== 200) return { http: r.estado, datos: r.datos };
  return r.datos.resultados;
}
export const op = (tipo, datos) => ({ tipo, datos });

// Lectura directa de la base local (sólo SELECT) con la cuenta local
export async function leerBase(sql, valores = []) {
  const { conectar } = await import(path.join(RAIZ, 'servidor', 'bd.js').replace(/\\/g, '/').replace(/^([A-Za-z]):/, 'file:///$1:'));
  const k = await conectar();
  try { return (await k.query(sql, valores)).rows; } finally { await k.end(); }
}

export const uuid = () => crypto.randomUUID();
export const HOY = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Mexico_City' }).format(new Date());

// Una jornada válida en la Ciudad de México (Iztapalapa, como prueba_conexion.py)
export function jornadaNueva(nombre, extra = {}) {
  return { id: uuid(), nombre, ubicacion: 'Prueba r5', programa_id: 'p-refor', lat: 19.357, lng: -99.06, punto_origen: 'gps', gps_precision_m: 5,
    fecha: HOY, comentarios: '', arboles_previstos: 10, fecha_inicio: new Date().toISOString(), ...extra };
}
export function arbolNuevo(jornadaId, extra = {}) {
  return { id: uuid(), jornada_id: jornadaId, lat: 19.357 + (Math.random() - 0.5) * 0.002, lng: -99.06 + (Math.random() - 0.5) * 0.002, punto_origen: 'gps', gps_precision_m: 5,
    especie_id: 'ESP-0001', sitio_plantacion: 'suelo', comentarios: '', fecha_plantacion: HOY, fecha_registro: new Date().toISOString(), ...extra };
}

// Para dejar constancia: cada línea va a la salida y a un archivo
export function bitacoraDePrueba(nombre) {
  const archivo = path.join(AQUI, 'salidas', nombre);
  fs.mkdirSync(path.dirname(archivo), { recursive: true });
  const lineas = [];
  const log = (...xs) => { const t = xs.map((x) => (typeof x === 'string' ? x : JSON.stringify(x))).join(' '); lineas.push(t); console.log(t); };
  log.guardar = () => fs.writeFileSync(archivo, lineas.join('\n') + '\n', 'utf8');
  return log;
}
