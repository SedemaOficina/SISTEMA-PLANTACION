/* APOYO DE LAS PRUEBAS DEL SERVIDOR: conexión a la base local de desarrollo, instalación y destrucción
   del esquema srp. Sólo para esa base: destruir borra todos los datos del SRP sin preguntar.

   La conexión se toma de las variables de PostgreSQL (PGHOST, PGPORT, PGDATABASE, PGUSER) y, si
   faltan, de la base local de desarrollo. La contraseña nunca va aquí: la lee el cliente del archivo
   de contraseñas de PostgreSQL del equipo (pgpass). */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

const AQUI = path.dirname(fileURLToPath(import.meta.url));
export const SQL = path.join(AQUI, '..', 'sql');
export const RAIZ = path.join(AQUI, '..', '..');

/* La contraseña del archivo de contraseñas de PostgreSQL (pgpass.conf en Windows, ~/.pgpass en los
   demás): renglones «servidor:puerto:base:cuenta:contraseña», con * como comodín y \ para escapar
   «:» y «\». Gana el primer renglón que coincide. */
function contrasenaDe({ host, port, database, user }) {
  const archivo = process.env.PGPASSFILE || (process.platform === 'win32'
    ? path.join(process.env.APPDATA || '', 'postgresql', 'pgpass.conf')
    : path.join(process.env.HOME || '', '.pgpass'));
  if (!fs.existsSync(archivo)) return undefined;
  const buscados = [host, String(port), database, user];
  for (const renglon of fs.readFileSync(archivo, 'utf8').split(/\r?\n/)) {
    if (!renglon || renglon.startsWith('#')) continue;
    const partes = renglon.match(/(?:\\.|[^:])+|(?<=:)(?=:|$)|^(?=:)/g).map(p => p.replace(/\\(.)/g, '$1'));
    if (partes.length === 5 && partes.slice(0, 4).every((p, i) => p === '*' || p === buscados[i])) return partes[4];
  }
  return undefined;
}

export async function conectar() {
  const datos = {
    host: process.env.PGHOST || '127.0.0.1',
    port: Number(process.env.PGPORT || 5432),
    database: process.env.PGDATABASE || 'srp_local',
    user: process.env.PGUSER || 'srp_local_admin'
  };
  const c = new pg.Client(Object.assign({ password: async () => contrasenaDe(datos) }, datos));
  await c.connect();
  return c;
}

const leer = (nombre) => fs.readFileSync(path.join(SQL, nombre), 'utf8');

// Los guiones en el orden en que los corre instalar.sql: el orden vive en un solo lugar
export function guionesDeInstalacion() {
  return leer('instalar.sql').split('\n').map(l => l.match(/^\\ir\s+(\S+)/)).filter(Boolean).map(m => m[1]);
}

// La instalación completa, en una transacción, como la hace instalar.sql con psql
export async function instalar(c) {
  await c.query('BEGIN');
  try {
    for (const g of guionesDeInstalacion()) await c.query(leer(g));
    await c.query('COMMIT');
  } catch (e) {
    await c.query('ROLLBACK');
    throw e;
  }
}

export async function destruir(c) {
  await c.query(leer('destruir_local.sql'));
}

// Ejecuta una consulta que debe fallar y devuelve el código de error de PostgreSQL. Usa un punto de
// guardado para que la transacción en curso siga viva.
export async function codigoDeError(c, sql, valores) {
  await c.query('SAVEPOINT intento');
  try {
    await c.query(sql, valores);
  } catch (e) {
    await c.query('ROLLBACK TO SAVEPOINT intento');
    return e.code;
  }
  await c.query('RELEASE SAVEPOINT intento');
  return null;
}
