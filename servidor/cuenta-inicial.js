/* LA PRIMERA CUENTA DE ADMINISTRACIÓN GLOBAL de una base recién instalada, que después da de alta las
   demás desde la aplicación. Lo corre quien administra la base, una sola vez:

     npm run cuenta-inicial -- <correo> "<nombre completo>" "<cargo>"

   Crea, si faltan, la institución de la Secretaría (o-sedema) y el área del Sistema de Información
   Ambiental (a-sia), y la cuenta con una contraseña temporal que se escribe una sola vez en pantalla y
   se cambia al primer acceso. Se niega si ya hay alguna cuenta de Administración global. */
import crypto from 'node:crypto';
import { conectar } from './bd.js';
import { derivar, temporal } from './src/contrasenas.js';
import { leerConfig } from './src/config.js';

const [correo, nombre, cargo] = process.argv.slice(2).map(x => String(x || '').trim());
if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(correo || '') || !nombre || nombre.split(/\s+/).length < 2 || !cargo) {
  console.error('Uso: npm run cuenta-inicial -- <correo> "<nombre y al menos un apellido>" "<cargo>"');
  process.exit(1);
}

const c = await conectar();
try {
  await c.query('BEGIN');
  if ((await c.query("SELECT 1 FROM srp.usuarios WHERE perfil = 'ADMIN'")).rowCount) throw new Error('Ya hay una cuenta de Administración global: las demás se dan de alta desde la aplicación.');
  await c.query(`INSERT INTO srp.instituciones (id, clave, nombre, activo, creado_por_id, fecha_creacion, editado_por_id, fecha_ultima_edicion, tipo_organizacion)
    VALUES ('o-sedema', 'SEDEMA', 'Secretaría del Medio Ambiente', true, NULL, now(), NULL, NULL, 'Gobierno de la CDMX') ON CONFLICT (id) DO NOTHING`);
  await c.query(`INSERT INTO srp.areas (id, clave, nombre, activo, creado_por_id, fecha_creacion, editado_por_id, fecha_ultima_edicion)
    VALUES ('a-sia', 'SIA', 'Sistema de Información Ambiental', true, NULL, now(), NULL, NULL) ON CONFLICT (id) DO NOTHING`);
  const id = crypto.randomUUID(), t = temporal(), horas = leerConfig().acceso.temporalHoras;
  await c.query(`INSERT INTO srp.usuarios (id, correo, nombre_completo, organizacion_id, area_id, cargo_rol, perfil, coordinadores_ids, activo,
      fecha_creacion, creado_por_id, fecha_ultima_edicion, editado_por_id) VALUES ($1, $2, $3, 'o-sedema', 'a-sia', $4, 'ADMIN', '{}', true, now(), $1, NULL, NULL)`,
    [id, correo.toLowerCase(), nombre.replace(/\s+/g, ' '), cargo]);
  await c.query(`INSERT INTO srp.credenciales (usuario_id, derivada, temporal, temporal_expira_en, intentos_fallidos, bloqueada_hasta, cambiada_en, cambiada_por_id)
    VALUES ($1, $2, true, now() + make_interval(hours => $3), 0, NULL, now(), $1)`, [id, await derivar(t), horas]);
  await c.query(`INSERT INTO srp.bitacora (id, fecha, usuario_id, usuario_nombre, perfil, accion, entidad, entidad_id, detalle)
    VALUES (gen_random_uuid(), now(), $1, $2, 'ADMIN', 'CREADO', 'usuario', $3, 'Cuenta inicial de la Administración global')`, [id, nombre, id]);
  await c.query('COMMIT');
  console.log(`Cuenta creada: ${correo.toLowerCase()}\nContraseña temporal (se muestra sólo esta vez; vence en ${horas} horas): ${t}`);
} catch (e) {
  await c.query('ROLLBACK').catch(() => {});
  console.error('No se creó la cuenta:', e.message);
  process.exitCode = 1;
} finally {
  await c.end();
}
