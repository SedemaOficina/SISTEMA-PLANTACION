/* APOYO DE prueba_conexion.py: lo que la prueba necesita hacer en la base local, con la cuenta que la
   administra. Recibe un JSON por la entrada estándar y responde otro por la salida.

     node pruebas/apoyo_servidor.mjs preparar   { cuentas: [{ id, correo, nombre, perfil, organizacion_id, clave, temporal }] }
     node pruebas/apoyo_servidor.mjs renombrar  { id, nombre }
     node pruebas/apoyo_servidor.mjs vencer     { id }          las sesiones abiertas de la cuenta vencen
     node pruebas/apoyo_servidor.mjs sesiones   { id }          cuántas tiene abiertas y cuántas cerradas
     node pruebas/apoyo_servidor.mjs quitar     { ids }         las cuentas, sus sesiones y sus registros

   «preparar» presta a la cuenta local el rol srp_api, con el que corre el servicio; «quitar» lo devuelve. */
import { conectar } from '../servidor/bd.js';
import { derivar } from '../servidor/dist/independiente.js';

const leer = async () => { let t = ''; for await (const x of process.stdin) t += x; return t ? JSON.parse(t) : {}; };
const [orden] = process.argv.slice(2);
const d = await leer();
const c = await conectar();
let salida = { ok: true };
try {
  if (orden === 'preparar') {
    await c.query('GRANT srp_api TO CURRENT_USER WITH INHERIT FALSE, SET TRUE');
    await c.query('BEGIN');
    await c.query(`INSERT INTO srp.areas VALUES ('a-sia', 'SIA', 'Sistema de Información Ambiental', true, NULL, now(), NULL, NULL) ON CONFLICT DO NOTHING`);
    for (const u of d.cuentas) {
      await c.query(`INSERT INTO srp.usuarios VALUES ($1, $2, $3, $4, $5, $6, $7, '{}', true, now(), $1, NULL, NULL)`,
        [u.id, u.correo, u.nombre, u.organizacion_id, u.organizacion_id === 'o-sedema' ? 'a-sia' : null, u.perfil, u.perfil]);
      await c.query(`INSERT INTO srp.credenciales VALUES ($1, $2, $3, $4, 0, NULL, now(), $1)`,
        [u.id, await derivar(u.clave), Boolean(u.temporal), u.temporal ? new Date(Date.now() + 72 * 3600_000) : null]);
    }
    await c.query('COMMIT');
  } else if (orden === 'renombrar') {
    await c.query('UPDATE srp.usuarios SET nombre_completo = $2 WHERE id = $1', [d.id, d.nombre]);
  } else if (orden === 'vencer') {
    await c.query("UPDATE srp.sesiones SET expira_en = now() - interval '1 minute' WHERE usuario_id = $1 AND cerrada_en IS NULL", [d.id]);
  } else if (orden === 'sesiones') {
    salida = (await c.query('SELECT count(*) FILTER (WHERE cerrada_en IS NULL)::int AS abiertas, count(*) FILTER (WHERE cerrada_en IS NOT NULL)::int AS cerradas FROM srp.sesiones WHERE usuario_id = $1', [d.id])).rows[0];
  } else if (orden === 'quitar') {
    await c.query('BEGIN');
    await c.query('DELETE FROM srp.sesiones WHERE usuario_id = ANY($1::uuid[])', [d.ids]);
    await c.query('DELETE FROM srp.credenciales WHERE usuario_id = ANY($1::uuid[])', [d.ids]);
    for (const t of ['bitacora', 'bitacora_acceso']) await c.query(`ALTER TABLE srp.${t} DISABLE TRIGGER bitacora_inmutable`);
    await c.query('DELETE FROM srp.bitacora WHERE usuario_id = ANY($1::uuid[])', [d.ids]);
    await c.query('DELETE FROM srp.bitacora_acceso WHERE usuario_id = ANY($1::uuid[])', [d.ids]);
    for (const t of ['bitacora', 'bitacora_acceso']) await c.query(`ALTER TABLE srp.${t} ENABLE TRIGGER bitacora_inmutable`);
    await c.query('DELETE FROM srp.usuarios WHERE id = ANY($1::uuid[])', [d.ids]);
    await c.query('COMMIT');
    await c.query('REVOKE srp_api FROM CURRENT_USER');
  } else {
    throw new Error('Orden desconocida: ' + orden);
  }
} catch (e) {
  await c.query('ROLLBACK').catch(() => {});
  salida = { ok: false, error: String(e.message || e) };
} finally {
  await c.end();
}
process.stdout.write(JSON.stringify(salida));
