/* CUENTAS: alta, restablecimiento de contraseña y activación. Sólo la Administración global las
   administra (la regla `usuario.administrar` de la aplicación).

   POST /cuentas                     alta con contraseña temporal; responde la cuenta y la temporal
   POST /cuentas/:id/restablecer     otra temporal; cierra las sesiones de la cuenta
   POST /cuentas/:id/estado          { activo } → desactivar cierra las sesiones de la cuenta

   La contraseña temporal se dice una sola vez, en la respuesta: la Administración la entrega a la
   persona por teléfono o en persona. Cada cambio deja su renglón en la bitácora, como en la aplicación. */
import crypto from 'node:crypto';
import express from 'express';
import { derivar, temporal } from './contrasenas.js';
import { cerrarDeCuenta } from './sesiones.js';
import { enTransaccion } from './conexion.js';
import { error, cuentaPublica } from './acceso.js';

const PERFILES = ['CABO', 'COORDINADOR', 'DIRECTIVO', 'ADMIN'];
const SEDEMA = 'o-sedema';
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const limpio = (t) => String(t || '').trim().replace(/\s+/g, ' ');

// El renglón de bitácora de quien hace el cambio
export async function bitacora(c, actor, accion, entidadId, detalle) {
  await c.query(`INSERT INTO srp.bitacora (id, fecha, usuario_id, usuario_nombre, perfil, accion, entidad, entidad_id, detalle)
    VALUES (gen_random_uuid(), now(), $1, $2, $3, $4, 'usuario', $5, $6)`, [actor.id, actor.nombre_completo, actor.perfil, accion, entidadId, detalle || '']);
}

// La contraseña temporal de una cuenta, con su vencimiento
async function ponerTemporal(c, usuarioId, actorId, horas) {
  const t = temporal();
  await c.query(`INSERT INTO srp.credenciales (usuario_id, derivada, temporal, temporal_expira_en, intentos_fallidos, bloqueada_hasta, cambiada_en, cambiada_por_id)
    VALUES ($1, $2, true, now() + make_interval(hours => $4), 0, NULL, now(), $3)
    ON CONFLICT (usuario_id) DO UPDATE SET derivada = EXCLUDED.derivada, temporal = true, temporal_expira_en = EXCLUDED.temporal_expira_en,
      intentos_fallidos = 0, bloqueada_hasta = NULL, cambiada_en = now(), cambiada_por_id = EXCLUDED.cambiada_por_id`,
    [usuarioId, await derivar(t), actorId, horas]);
  return t;
}

/* Las mismas reglas que el formulario de Usuarios de la aplicación (js/usuarios.js): institución
   activa, área en la Secretaría, nombre y al menos un apellido, correo válido y sin otra cuenta, cargo,
   perfil, Administración global sólo en la Secretaría y coordinadores de la misma institución. */
async function validarAlta(c, d) {
  const e = [];
  const org = d.organizacion_id ? (await c.query('SELECT id, activo FROM srp.instituciones WHERE id = $1', [d.organizacion_id])).rows[0] : null;
  if (!org) e.push(['organizacion_id', 'Elija la institución.']);
  else if (!org.activo) e.push(['organizacion_id', 'Esa institución está desactivada.']);
  const sedema = d.organizacion_id === SEDEMA;
  if (sedema && !d.area_id) e.push(['area_id', 'Elija el área.']);
  if (d.area_id && !(await c.query('SELECT 1 FROM srp.areas WHERE id = $1 AND activo', [d.area_id])).rowCount) e.push(['area_id', 'Esa área no existe o está desactivada.']);
  if (!d.nombre_completo) e.push(['nombre_completo', 'Escriba el nombre completo.']);
  else if (d.nombre_completo.split(' ').length < 2) e.push(['nombre_completo', 'Escriba nombre y al menos un apellido.']);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(d.correo)) e.push(['correo', 'Escriba un correo válido.']);
  else if ((await c.query('SELECT 1 FROM srp.usuarios WHERE correo = $1', [d.correo])).rowCount) e.push(['correo', 'Ese correo ya tiene cuenta.']);
  if (!d.cargo_rol) e.push(['cargo_rol', 'Escriba el cargo.']);
  if (!PERFILES.includes(d.perfil)) e.push(['perfil', 'Elija el perfil de captura.']);
  else if (d.perfil === 'ADMIN' && !sedema) e.push(['perfil', 'La Administración global es sólo de la Secretaría.']);
  if (d.coordinadores_ids.length) {
    const ok = (await c.query("SELECT count(*)::int AS n FROM srp.usuarios WHERE id = ANY($1::uuid[]) AND perfil = 'COORDINADOR' AND organizacion_id = $2",
      [d.coordinadores_ids, d.organizacion_id])).rows[0].n;
    if (ok !== d.coordinadores_ids.length) e.push(['coordinadores_ids', 'Los coordinadores del cabo son de su misma institución.']);
  }
  return e;
}

export function rutasCuentas({ grupo, config, sesion }) {
  const r = express.Router();
  const soloAdministracion = (req, res, next) => req.sesion.usuario.perfil === 'ADMIN' ? next()
    : error(res, 403, 'SIN_PERMISO', 'Sólo la Administración global administra las cuentas.');
  r.use('/cuentas', sesion, soloAdministracion);

  r.post('/cuentas', async (req, res, next) => {
    try {
      const b = req.body || {}, actor = req.sesion.usuario;
      const sedema = b.organizacion_id === SEDEMA;
      const d = {
        id: UUID.test(b.id || '') ? b.id : crypto.randomUUID(),
        correo: limpio(b.correo).toLowerCase(), nombre_completo: limpio(b.nombre_completo), organizacion_id: limpio(b.organizacion_id),
        // Sin área fuera de la Secretaría; coordinadores, sólo el cabo
        area_id: sedema ? (limpio(b.area_id) || null) : null, cargo_rol: limpio(b.cargo_rol), perfil: limpio(b.perfil),
        coordinadores_ids: b.perfil === 'CABO' && Array.isArray(b.coordinadores_ids) ? b.coordinadores_ids.filter(x => UUID.test(x)) : []
      };
      const resultado = await enTransaccion(grupo, async (c) => {
        const errores = await validarAlta(c, d);
        if (errores.length) return { errores };
        await c.query(`INSERT INTO srp.usuarios (id, correo, nombre_completo, organizacion_id, area_id, cargo_rol, perfil, coordinadores_ids, activo,
            fecha_creacion, creado_por_id, fecha_ultima_edicion, editado_por_id) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, true, now(), $9, NULL, NULL)`,
          [d.id, d.correo, d.nombre_completo, d.organizacion_id, d.area_id, d.cargo_rol, d.perfil, d.coordinadores_ids, actor.id]);
        const t = await ponerTemporal(c, d.id, actor.id, config.acceso.temporalHoras);
        const org = (await c.query('SELECT nombre FROM srp.instituciones WHERE id = $1', [d.organizacion_id])).rows[0];
        await bitacora(c, actor, 'CREADO', d.id, 'Alta de ' + d.correo + ' con perfil ' + d.perfil + ' en ' + org.nombre);
        const u = (await c.query('SELECT * FROM srp.usuarios WHERE id = $1', [d.id])).rows[0];
        return { usuario: cuentaPublica(u), temporal: t };
      });
      if (resultado.errores) return res.status(400).json({ codigo: 'DATOS_INVALIDOS', mensaje: 'Revise los datos de la cuenta.', errores: resultado.errores });
      res.status(201).json(Object.assign(resultado, { temporalVence: config.acceso.temporalHoras + ' horas' }));
    } catch (e) { next(e); }
  });

  r.post('/cuentas/:id/restablecer', async (req, res, next) => {
    try {
      const actor = req.sesion.usuario, id = req.params.id;
      if (!UUID.test(id)) return error(res, 404, 'NO_EXISTE', 'Esa cuenta no existe.');
      const t = await enTransaccion(grupo, async (c) => {
        const u = (await c.query('SELECT id, correo FROM srp.usuarios WHERE id = $1', [id])).rows[0];
        if (!u) return null;
        const t = await ponerTemporal(c, id, actor.id, config.acceso.temporalHoras);
        await cerrarDeCuenta(c, id, 'CONTRASENA_RESTABLECIDA');
        await bitacora(c, actor, 'EDITADO', id, 'Contraseña restablecida');
        return t;
      });
      if (!t) return error(res, 404, 'NO_EXISTE', 'Esa cuenta no existe.');
      res.json({ temporal: t, temporalVence: config.acceso.temporalHoras + ' horas' });
    } catch (e) { next(e); }
  });

  r.post('/cuentas/:id/estado', async (req, res, next) => {
    try {
      const actor = req.sesion.usuario, id = req.params.id, activo = (req.body || {}).activo;
      if (typeof activo !== 'boolean') return error(res, 400, 'FALTAN_DATOS', 'Diga si la cuenta queda activa o no.');
      if (!UUID.test(id)) return error(res, 404, 'NO_EXISTE', 'Esa cuenta no existe.');
      // Quien administra no se desactiva a sí mismo: el sistema podría quedar sin administración
      if (id === actor.id && !activo) return error(res, 400, 'PROPIA', 'No puede desactivar su propia cuenta. Pida a otra cuenta de administración que lo haga.');
      const r2 = await enTransaccion(grupo, async (c) => {
        const u = (await c.query('UPDATE srp.usuarios SET activo = $2, fecha_ultima_edicion = now(), editado_por_id = $3 WHERE id = $1 RETURNING *', [id, activo, actor.id])).rows[0];
        if (!u) return null;
        const cerradas = activo ? 0 : await cerrarDeCuenta(c, id, 'CUENTA_DESACTIVADA');
        await bitacora(c, actor, activo ? 'ACTIVADO' : 'DESACTIVADO', id, '');
        return { usuario: cuentaPublica(u), sesionesCerradas: cerradas };
      });
      if (!r2) return error(res, 404, 'NO_EXISTE', 'Esa cuenta no existe.');
      res.json(r2);
    } catch (e) { next(e); }
  });

  return r;
}
