/* APOYO DE prueba_conexion.py: lo que la prueba necesita hacer en la base local, con la cuenta que la
   administra. Recibe un JSON por la entrada estándar y responde otro por la salida.

     node pruebas/apoyo_servidor.mjs preparar   { cuentas: [{ id, correo, nombre, perfil, organizacion_id, clave, temporal }] }
     node pruebas/apoyo_servidor.mjs renombrar  { id, nombre }
     node pruebas/apoyo_servidor.mjs vencer     { id }          las sesiones abiertas de la cuenta vencen
     node pruebas/apoyo_servidor.mjs sesiones   { id }          cuántas tiene abiertas y cuántas cerradas
     node pruebas/apoyo_servidor.mjs parametro  { clave, valor, id }   un parámetro cambiado por esa cuenta
     node pruebas/apoyo_servidor.mjs tocar      { id, comentarios, por }   otra persona (`por`) cambia un árbol en el servidor
     node pruebas/apoyo_servidor.mjs leer       { id }          cómo tiene el servidor un árbol o una jornada
     node pruebas/apoyo_servidor.mjs catalogo   { tabla, clave }       cómo tiene el servidor un valor de catálogo
     node pruebas/apoyo_servidor.mjs otro_valor { tabla, id, clave, nombre, por }   otra persona da de alta un valor
     node pruebas/apoyo_servidor.mjs pareja     { llego, cercano, distancia }  una pareja en la bandeja de posibles duplicados
     node pruebas/apoyo_servidor.mjs quitar     { ids }         las cuentas, sus sesiones, sus jornadas, árboles y
                                                                fotografías, sus parámetros, los valores de catálogo
                                                                que dieron de alta y sus registros

   «preparar» presta a la cuenta local el rol srp_api, con el que corre el servicio; «quitar» lo devuelve. */
import { conectar } from '../servidor/bd.js';
import { derivar } from '../servidor/dist/independiente.js';

const TABLAS_CATALOGO = ['programas', 'areas', 'especies', 'vehiculos', 'instituciones', 'solicitantes'];
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
  } else if (orden === 'parametro') {
    await c.query(`INSERT INTO srp.parametros (clave, valor, editado_por_id, fecha_ultima_edicion) VALUES ($1, $2, $3, now())
      ON CONFLICT (clave) DO UPDATE SET valor = EXCLUDED.valor, editado_por_id = EXCLUDED.editado_por_id`, [d.clave, d.valor, d.id]);
  } else if (orden === 'tocar') {
    await c.query("UPDATE srp.plantaciones SET comentarios = $2, editado_por_id = $3, fecha_ultima_edicion = date_trunc('milliseconds', now()) WHERE id = $1", [d.id, d.comentarios, d.por]);
  } else if (orden === 'leer') {
    const a = (await c.query('SELECT folio, comentarios, estatus, foto_id, jornada_id FROM srp.plantaciones WHERE id = $1', [d.id])).rows[0];
    const j = (await c.query('SELECT estatus, reporte_en IS NOT NULL AS reporte, nombre FROM srp.jornadas WHERE id = $1', [d.id])).rows[0];
    const f = a && a.foto_id ? (await c.query('SELECT count(*)::int AS n FROM srp.fotografias WHERE id = $1', [a.foto_id])).rows[0].n : 0;
    salida = { arbol: a || null, jornada: j || null, fotos: f };
  } else if (orden === 'catalogo') {
    if (!TABLAS_CATALOGO.includes(d.tabla)) throw new Error('No es un catálogo: ' + d.tabla);
    salida = { fila: (await c.query(`SELECT to_jsonb(x) AS fila FROM srp.${d.tabla} x WHERE clave = $1`, [d.clave])).rows[0]?.fila ?? null };
  } else if (orden === 'otro_valor') {
    if (!TABLAS_CATALOGO.includes(d.tabla)) throw new Error('No es un catálogo: ' + d.tabla);
    await c.query(`INSERT INTO srp.${d.tabla} (id, clave, nombre, activo, creado_por_id, fecha_creacion) VALUES ($1, $2, $3, true, $4, now())`, [d.id, d.clave, d.nombre, d.por]);
  } else if (orden === 'pareja') {
    salida = { id: Number((await c.query('INSERT INTO srp.duplicados (plantacion_id, cercano_id, distancia_m, umbral_m) VALUES ($1, $2, $3, $4) RETURNING id',
      [d.llego, d.cercano, d.distancia, 4])).rows[0].id) };
  } else if (orden === 'quitar') {
    await c.query('BEGIN');
    const arboles = (await c.query('SELECT id FROM srp.plantaciones WHERE cabo_id = ANY($1::uuid[])', [d.ids])).rows.map((r) => r.id);
    await c.query('ALTER TABLE srp.folios DISABLE TRIGGER folios_inmutables');
    await c.query('DELETE FROM srp.folios WHERE plantacion_id = ANY($1::uuid[])', [arboles]);
    await c.query('ALTER TABLE srp.folios ENABLE TRIGGER folios_inmutables');
    await c.query('DELETE FROM srp.fotografias WHERE plantacion_id = ANY($1::uuid[])', [arboles]);
    await c.query('DELETE FROM srp.duplicados WHERE plantacion_id = ANY($1::uuid[]) OR cercano_id = ANY($1::uuid[])', [arboles]);
    await c.query('DELETE FROM srp.plantaciones WHERE id = ANY($1::uuid[])', [arboles]);
    await c.query('DELETE FROM srp.jornadas WHERE cabo_id = ANY($1::uuid[])', [d.ids]);
    await c.query('DELETE FROM srp.parametros WHERE editado_por_id = ANY($1::uuid[])', [d.ids]);
    for (const t of TABLAS_CATALOGO) {
      await c.query(`DELETE FROM srp.${t} WHERE creado_por_id = ANY($1::uuid[])`, [d.ids]);
      await c.query(`UPDATE srp.${t} SET editado_por_id = NULL WHERE editado_por_id = ANY($1::uuid[])`, [d.ids]);
    }
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
