/* SESIONES. Al entrar se da un testigo al azar que viaja en una cookie sólo HTTP; en la base se guarda
   únicamente su resumen, así que quien lea la tabla no puede hacerse pasar por nadie. Una sesión deja de
   valer al salir, al pasar el tiempo de inactividad sin usarla, al cambiar o restablecer la contraseña, y
   en cuanto su cuenta o su institución dejan de estar activas. Cada uso renueva el plazo: `expira_en` es
   el momento en que vencerá si nadie la vuelve a usar. */
import crypto from 'node:crypto';

export const COOKIE = 'srp_sesion';
const resumen = (testigo) => crypto.createHash('sha256').update(String(testigo)).digest();

export async function abrir(bd, usuarioId, { agente = '', inactividadDias }) {
  const testigo = crypto.randomBytes(32).toString('base64url');
  await bd.query(`INSERT INTO srp.sesiones (testigo_resumen, usuario_id, expira_en, agente)
    VALUES ($1, $2, now() + make_interval(days => $3), $4)`, [resumen(testigo), usuarioId, inactividadDias, String(agente).slice(0, 300)]);
  return testigo;
}

/* La sesión del testigo, con su cuenta, si sigue valiendo; si no, la cierra diciendo por qué y devuelve
   { cerrada: motivo }. La actividad, y con ella el nuevo vencimiento, se anota a lo más una vez por minuto. */
export async function validar(bd, testigo, { inactividadDias }) {
  if (!testigo) return null;
  const { rows } = await bd.query(`
    SELECT s.id, s.expira_en, s.ultima_actividad, s.cerrada_en, s.motivo_cierre,
           s.expira_en <= now() AS vencida,
           s.ultima_actividad <= now() - interval '1 minute' AS anotar,
           u.activo AS cuenta_activa, o.activo AS institucion_activa, row_to_json(u) AS usuario
      FROM srp.sesiones s JOIN srp.usuarios u ON u.id = s.usuario_id JOIN srp.instituciones o ON o.id = u.organizacion_id
     WHERE s.testigo_resumen = $1`, [resumen(testigo)]);
  const s = rows[0];
  if (!s) return null;
  if (s.cerrada_en) return { cerrada: s.motivo_cierre };
  const motivo = s.vencida ? 'VENCIDA' : !s.cuenta_activa ? 'CUENTA_DESACTIVADA' : !s.institucion_activa ? 'INSTITUCION_DESACTIVADA' : null;
  if (motivo) {
    await bd.query("UPDATE srp.sesiones SET cerrada_en = now(), motivo_cierre = $2 WHERE id = $1", [s.id, motivo]);
    return { cerrada: motivo };
  }
  if (s.anotar) await bd.query('UPDATE srp.sesiones SET ultima_actividad = now(), expira_en = now() + make_interval(days => $2) WHERE id = $1', [s.id, inactividadDias]);
  return { id: s.id, usuario: s.usuario };
}

export async function cerrar(bd, sesionId, motivo) {
  await bd.query('UPDATE srp.sesiones SET cerrada_en = now(), motivo_cierre = $2 WHERE id = $1 AND cerrada_en IS NULL', [sesionId, motivo]);
}

// Cierra todas las sesiones abiertas de una cuenta, salvo `salvo` (la que hace el cambio)
export async function cerrarDeCuenta(bd, usuarioId, motivo, salvo = null) {
  const r = await bd.query(`UPDATE srp.sesiones SET cerrada_en = now(), motivo_cierre = $2
     WHERE usuario_id = $1 AND cerrada_en IS NULL AND id IS DISTINCT FROM $3`, [usuarioId, motivo, salvo]);
  return r.rowCount;
}

// El testigo de la cookie de la petición
export function testigoDe(req) {
  const c = req.headers.cookie || '';
  for (const parte of c.split(';')) {
    const [k, ...v] = parte.trim().split('=');
    if (k === COOKIE) return decodeURIComponent(v.join('='));
  }
  return null;
}

/* La cookie: sólo HTTP, del mismo sitio, sólo para la API y, en el SIA, sólo por conexión cifrada. Dura lo
   más que admiten los navegadores (400 días): quien decide si la sesión sigue valiendo es el servidor, y una
   cookie de una semana dejaría fuera a quien entra todos los días. */
const COOKIE_MAX_DIAS = 400;
export function cookie(res, testigo, { ruta, segura }) {
  res.cookie(COOKIE, testigo, { httpOnly: true, sameSite: 'strict', secure: segura, path: ruta, maxAge: COOKIE_MAX_DIAS * 86400000 });
}
export function borrarCookie(res, { ruta, segura }) {
  res.clearCookie(COOKIE, { httpOnly: true, sameSite: 'strict', secure: segura, path: ruta });
}
