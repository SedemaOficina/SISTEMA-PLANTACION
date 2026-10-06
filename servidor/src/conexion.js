/* LA CONEXIÓN DEL SERVICIO A LA BASE: un grupo de conexiones con la cuenta del servicio. En desarrollo,
   con SRP_ROL, cada conexión asume esa cuenta al abrirse, para operar con sus mismos permisos. */
import pg from 'pg';
import { contrasenaDe } from '../bd.js';

export function crearGrupo({ rol } = {}) {
  const datos = {
    host: process.env.PGHOST || '127.0.0.1',
    port: Number(process.env.PGPORT || 5432),
    database: process.env.PGDATABASE || 'srp_local',
    user: process.env.PGUSER || 'srp_local_admin'
  };
  const grupo = new pg.Pool(Object.assign({ max: 10, password: process.env.PGPASSWORD || (async () => contrasenaDe(datos)) }, datos));
  if (rol) grupo.on('connect', (c) => { c.query('SET ROLE ' + pg.escapeIdentifier(rol)).catch(() => {}); });
  return grupo;
}

// Una transacción: si algo falla, no queda nada a medias
export async function enTransaccion(grupo, trabajo) {
  const c = await grupo.connect();
  try {
    await c.query('BEGIN');
    const r = await trabajo(c);
    await c.query('COMMIT');
    return r;
  } catch (e) {
    await c.query('ROLLBACK').catch(() => {});
    throw e;
  } finally {
    c.release();
  }
}
