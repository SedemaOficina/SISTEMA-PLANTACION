/* Borra las cuentas r4.*@ejemplo.local de la base local y todo lo que hicieron, como `quitar` de
   pruebas/apoyo_servidor.mjs, pero SIN quitarle el rol srp_api a la cuenta local (eso tumbaría los
   servicios de los demás revisores, que corren con SRP_ROL=srp_api).

   Uso, desde la raíz de la copia r4:   node evidencia/e1_limpiar.mjs */
import { conectar } from '../servidor/bd.js';

const TABLAS_CATALOGO = ['programas', 'areas', 'especies', 'vehiculos', 'instituciones', 'solicitantes'];
const c = await conectar();
try {
  await c.query('BEGIN');
  const ids = (await c.query("SELECT id FROM srp.usuarios WHERE correo LIKE 'r4.%@ejemplo.local'")).rows.map((r) => r.id);
  const todos = (await c.query('SELECT id FROM srp.usuarios WHERE id = ANY($1::uuid[]) OR creado_por_id = ANY($1::uuid[])', [ids])).rows.map((r) => r.id);
  const arboles = (await c.query('SELECT id FROM srp.plantaciones WHERE cabo_id = ANY($1::uuid[])', [todos])).rows.map((r) => r.id);
  await c.query('ALTER TABLE srp.folios DISABLE TRIGGER folios_inmutables');
  await c.query('DELETE FROM srp.folios WHERE plantacion_id = ANY($1::uuid[])', [arboles]);
  await c.query('ALTER TABLE srp.folios ENABLE TRIGGER folios_inmutables');
  await c.query('DELETE FROM srp.fotografias WHERE plantacion_id = ANY($1::uuid[])', [arboles]);
  await c.query('DELETE FROM srp.duplicados WHERE plantacion_id = ANY($1::uuid[]) OR cercano_id = ANY($1::uuid[])', [arboles]);
  await c.query('DELETE FROM srp.plantaciones WHERE id = ANY($1::uuid[])', [arboles]);
  await c.query('DELETE FROM srp.jornadas WHERE cabo_id = ANY($1::uuid[])', [todos]);
  await c.query('DELETE FROM srp.cargas WHERE creada_por_id = ANY($1::uuid[])', [todos]);
  await c.query('DELETE FROM srp.parametros WHERE editado_por_id = ANY($1::uuid[])', [todos]);
  for (const t of TABLAS_CATALOGO) {
    await c.query(`DELETE FROM srp.${t} WHERE creado_por_id = ANY($1::uuid[])`, [todos]);
    await c.query(`UPDATE srp.${t} SET editado_por_id = NULL WHERE editado_por_id = ANY($1::uuid[])`, [todos]);
  }
  await c.query('DELETE FROM srp.sesiones WHERE usuario_id = ANY($1::uuid[])', [todos]);
  await c.query('DELETE FROM srp.credenciales WHERE usuario_id = ANY($1::uuid[])', [todos]);
  for (const t of ['bitacora', 'bitacora_acceso']) await c.query(`ALTER TABLE srp.${t} DISABLE TRIGGER bitacora_inmutable`);
  await c.query('DELETE FROM srp.bitacora WHERE usuario_id = ANY($1::uuid[])', [todos]);
  await c.query('DELETE FROM srp.bitacora_acceso WHERE usuario_id = ANY($1::uuid[]) OR correo_intentado LIKE $2', [todos, 'r4.%@ejemplo.local']);
  for (const t of ['bitacora', 'bitacora_acceso']) await c.query(`ALTER TABLE srp.${t} ENABLE TRIGGER bitacora_inmutable`);
  await c.query('DELETE FROM srp.usuarios WHERE id = ANY($1::uuid[])', [todos]);
  await c.query('COMMIT');
  console.log(JSON.stringify({ ok: true, cuentas: todos.length, arboles: arboles.length }));
} catch (e) {
  await c.query('ROLLBACK').catch(() => {});
  console.log(JSON.stringify({ ok: false, error: String(e.message || e) }));
} finally {
  await c.end();
}
