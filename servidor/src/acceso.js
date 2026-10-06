/* ACCESO CON CUENTAS PROPIAS: correo y contraseña. No hay servicio de correo: la contraseña la da y la
   restablece la Administración global, como temporal de un solo uso que se cambia al primer acceso.

   POST /acceso/entrar             { correo, contrasena } → abre la sesión
   POST /acceso/salir              cierra la sesión de este equipo
   GET  /acceso/yo                 la cuenta de la sesión y si debe cambiar su contraseña
   POST /acceso/contrasena         { actual, nueva } → cambia la contraseña y cierra sus otras sesiones

   Las respuestas de error llevan { codigo, mensaje }. Una cuenta que no existe y una contraseña
   equivocada responden lo mismo, y tardan lo mismo, para no revelar qué correos tienen cuenta. */
import express from 'express';
import { verificar, verificarSombra, derivar, revisarNueva } from './contrasenas.js';
import * as S from './sesiones.js';
import { enTransaccion } from './conexion.js';

export const error = (res, estado, codigo, mensaje) => res.status(estado).json({ codigo, mensaje });

// Lo que se dice de la cuenta: los campos de la tabla usuarios, como los tiene el teléfono
export const cuentaPublica = (u) => u && ({
  id: u.id, correo: u.correo, nombre_completo: u.nombre_completo, organizacion_id: u.organizacion_id, area_id: u.area_id,
  cargo_rol: u.cargo_rol, perfil: u.perfil, coordinadores_ids: u.coordinadores_ids, activo: u.activo
});

/* La sesión es obligatoria en toda la API salvo al entrar. Con contraseña temporal sólo se puede ver la
   cuenta, cambiar la contraseña y salir. */
export function exigirSesion({ grupo, config }) {
  const libres = new Set(['/acceso/yo', '/acceso/contrasena', '/acceso/salir']);
  return async (req, res, next) => {
    try {
      const s = await S.validar(grupo, S.testigoDe(req), config.acceso);
      if (!s) return error(res, 401, 'SIN_SESION', 'Entre con su correo y contraseña.');
      if (s.cerrada) {
        S.borrarCookie(res, { ruta: config.ruta, segura: config.cookieSegura });
        const textos = {
          VENCIDA: 'Su sesión venció. Vuelva a escribir su contraseña; lo capturado se conserva.',
          CUENTA_DESACTIVADA: 'Su cuenta fue desactivada. Consulte a la Administración global.',
          INSTITUCION_DESACTIVADA: 'Su institución fue desactivada. Consulte a la Administración global.',
          CONTRASENA_CAMBIADA: 'La contraseña cambió. Vuelva a entrar con la nueva.',
          CONTRASENA_RESTABLECIDA: 'La Administración global restableció su contraseña. Entre con la temporal que le dio.'
        };
        return error(res, 401, 'SESION_' + s.cerrada, textos[s.cerrada] || 'Su sesión terminó. Vuelva a entrar.');
      }
      const cred = (await grupo.query('SELECT temporal FROM srp.credenciales WHERE usuario_id = $1', [s.usuario.id])).rows[0];
      req.sesion = { id: s.id, usuario: s.usuario, debeCambiar: !cred || cred.temporal };
      if (req.sesion.debeCambiar && !libres.has(req.path)) return error(res, 403, 'DEBE_CAMBIAR', 'Antes de seguir, cambie su contraseña temporal.');
      next();
    } catch (e) { next(e); }
  };
}

export function rutasAcceso({ grupo, config }) {
  const r = express.Router();
  const A = config.acceso;

  r.post('/acceso/entrar', async (req, res, next) => {
    try {
      const correo = String((req.body || {}).correo || '').trim().toLowerCase();
      const contrasena = String((req.body || {}).contrasena || '');
      const incorrecto = () => error(res, 401, 'INCORRECTO', 'Correo o contraseña incorrectos.');
      if (!correo || !contrasena) return error(res, 400, 'FALTAN_DATOS', 'Escriba su correo y su contraseña.');
      const { rows } = await grupo.query(`
        SELECT u.*, o.activo AS institucion_activa, c.derivada, c.temporal, c.intentos_fallidos, c.bloqueada_hasta,
               c.bloqueada_hasta > now() AS bloqueada, c.temporal AND c.temporal_expira_en <= now() AS temporal_vencida
          FROM srp.usuarios u JOIN srp.instituciones o ON o.id = u.organizacion_id
          LEFT JOIN srp.credenciales c ON c.usuario_id = u.id
         WHERE u.correo = $1`, [correo]);
      const u = rows[0];
      if (!u || !u.derivada) { await verificarSombra(contrasena); return incorrecto(); }
      if (u.bloqueada) {
        const hasta = new Date(u.bloqueada_hasta).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Mexico_City' });
        return error(res, 423, 'BLOQUEADA', 'Demasiados intentos fallidos. Podrá intentarlo de nuevo a las ' + hasta + ', o pida a la Administración global que restablezca su contraseña.');
      }
      if (!(await verificar(contrasena, u.derivada))) {
        const intentos = u.intentos_fallidos + 1;
        if (intentos >= A.intentosMaximos) {
          await grupo.query("UPDATE srp.credenciales SET intentos_fallidos = 0, bloqueada_hasta = now() + make_interval(mins => $2) WHERE usuario_id = $1", [u.id, A.bloqueoMinutos]);
        } else {
          await grupo.query('UPDATE srp.credenciales SET intentos_fallidos = $2 WHERE usuario_id = $1', [u.id, intentos]);
        }
        return incorrecto();
      }
      // La contraseña es correcta: ya se puede decir por qué no entra
      if (!u.activo) return error(res, 403, 'CUENTA_INACTIVA', 'Su cuenta está desactivada. Consulte a la Administración global.');
      if (!u.institucion_activa) return error(res, 403, 'INSTITUCION_INACTIVA', 'Su institución está desactivada. Consulte a la Administración global.');
      if (u.temporal_vencida) return error(res, 403, 'TEMPORAL_VENCIDA', 'Su contraseña temporal venció. Pida otra a la Administración global.');
      await grupo.query('UPDATE srp.credenciales SET intentos_fallidos = 0, bloqueada_hasta = NULL WHERE usuario_id = $1', [u.id]);
      const testigo = await S.abrir(grupo, u.id, { agente: req.get('user-agent') || '', duracionMaximaDias: A.duracionMaximaDias });
      S.cookie(res, testigo, { ruta: config.ruta, segura: config.cookieSegura, duracionMaximaDias: A.duracionMaximaDias });
      res.json({ usuario: cuentaPublica(u), debeCambiar: u.temporal });
    } catch (e) { next(e); }
  });

  const sesion = exigirSesion({ grupo, config });

  r.post('/acceso/salir', sesion, async (req, res, next) => {
    try {
      await S.cerrar(grupo, req.sesion.id, 'SALIDA');
      S.borrarCookie(res, { ruta: config.ruta, segura: config.cookieSegura });
      res.json({ ok: true });
    } catch (e) { next(e); }
  });

  r.get('/acceso/yo', sesion, (req, res) => res.json({ usuario: cuentaPublica(req.sesion.usuario), debeCambiar: req.sesion.debeCambiar }));

  r.post('/acceso/contrasena', sesion, async (req, res, next) => {
    try {
      const actual = String((req.body || {}).actual || ''), nueva = String((req.body || {}).nueva || '');
      const u = req.sesion.usuario;
      const cred = (await grupo.query('SELECT derivada FROM srp.credenciales WHERE usuario_id = $1', [u.id])).rows[0];
      if (!cred || !(await verificar(actual, cred.derivada))) return error(res, 400, 'ACTUAL_INCORRECTA', 'La contraseña actual no es correcta.');
      const motivo = revisarNueva(nueva, { largoMinimo: A.largoMinimo, correo: u.correo, actual });
      if (motivo) return error(res, 400, 'NUEVA_INVALIDA', motivo);
      const derivada = await derivar(nueva);
      await enTransaccion(grupo, async (c) => {
        await c.query(`UPDATE srp.credenciales SET derivada = $2, temporal = false, temporal_expira_en = NULL, intentos_fallidos = 0,
          bloqueada_hasta = NULL, cambiada_en = now(), cambiada_por_id = $1 WHERE usuario_id = $1`, [u.id, derivada]);
        await S.cerrarDeCuenta(c, u.id, 'CONTRASENA_CAMBIADA', req.sesion.id);
      });
      res.json({ ok: true });
    } catch (e) { next(e); }
  });

  return { router: r, sesion };
}
