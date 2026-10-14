import { Router, type NextFunction, type Request, type RequestHandler, type Response } from "express";
import type pg from "pg";
import { agenteDeUsuario, ipDeOrigen } from "../../comun/procedencia";
import type { ConfigSrp } from "./config";
import { derivar, revisarNueva, verificar, verificarSombra } from "./contrasenas";
import { responder } from "./errores";
import * as S from "./sesiones";
import { enTransaccion } from "./transaccion";

/* ACCESO CON CUENTAS PROPIAS: correo y contraseña. No hay servicio de correo: la contraseña la da y la
   restablece la Administración global, como temporal de un solo uso que se cambia al primer acceso.

   POST /acceso/entrar             { correo, contrasena } → abre la sesión
   POST /acceso/salir              cierra la sesión de este equipo
   GET  /acceso/yo                 la cuenta de la sesión y si debe cambiar su contraseña
   POST /acceso/contrasena         { actual, nueva } → cambia la contraseña y cierra sus otras sesiones

   Las respuestas de error llevan { codigo, mensaje }. Toda entrada fallida responde lo mismo y tarda lo
   mismo —el correo no existe, la cuenta o su institución están desactivadas, la cuenta está bloqueada o
   la contraseña es mala—, como el módulo `acceso` del SIA: si se distinguieran, se sabría qué correos
   tienen cuenta.

   Cada intento de entrar, logrado o no, cada bloqueo, cada salida y cada cambio de contraseña queda en
   srp.bitacora_acceso con su procedencia, como en `acceso.bitacora`. La procedencia la da el módulo común
   del SIA (src/comun/procedencia.ts). Toda entrada fallida anota un solo renglón, así que tampoco el
   registro cambia el tiempo de respuesta. */

type EventoAcceso = "ENTRADA" | "ENTRADA_FALLIDA" | "BLOQUEO" | "SALIDA" | "CONTRASENA_CAMBIADA";

// Un renglón del registro de entradas: de la cuenta, o del correo intentado si no tiene cuenta
async function anotar(bd: S.Consultable, req: Request, evento: EventoAcceso, quien: { usuarioId: string } | { correo: string }): Promise<void> {
  const usuarioId = "usuarioId" in quien ? quien.usuarioId : null;
  const correo = "correo" in quien ? quien.correo.slice(0, 254) : null;
  await bd.query("INSERT INTO srp.bitacora_acceso (evento, usuario_id, correo_intentado, ip, agente) VALUES ($1, $2, $3, $4, $5)", [
    evento,
    usuarioId,
    correo,
    ipDeOrigen(req),
    agenteDeUsuario(req),
  ]);
}

export interface Sesion {
  id: string;
  usuario: S.Usuario;
  debeCambiar: boolean;
}

// La sesión que dejó exigirSesion para la ruta
export const sesionDe = (res: Response): Sesion => res.locals.sesion as Sesion;

// Lo que se dice de la cuenta: los campos de la tabla usuarios, como los tiene el teléfono
export const cuentaPublica = (u: S.Usuario) => ({
  id: u.id,
  correo: u.correo,
  nombre_completo: u.nombre_completo,
  organizacion_id: u.organizacion_id,
  area_id: u.area_id,
  cargo_rol: u.cargo_rol,
  perfil: u.perfil,
  coordinadores_ids: u.coordinadores_ids,
  activo: u.activo,
});

const TEXTOS_CIERRE: Record<S.MotivoCierre, string> = {
  SALIDA: "Su sesión terminó. Vuelva a entrar.",
  VENCIDA: "Su sesión venció. Vuelva a escribir su contraseña; lo capturado se conserva.",
  CUENTA_DESACTIVADA: "Su cuenta fue desactivada. Consulte a la Administración global.",
  INSTITUCION_DESACTIVADA: "Su institución fue desactivada. Consulte a la Administración global.",
  CONTRASENA_CAMBIADA: "La contraseña cambió. Vuelva a entrar con la nueva.",
  CONTRASENA_RESTABLECIDA: "La Administración global restableció su contraseña. Entre con la temporal que le dio.",
};

/* La sesión es obligatoria en toda la API salvo al entrar. Con contraseña temporal sólo se puede ver la
   cuenta, cambiar la contraseña y salir. */
export function exigirSesion(pool: pg.Pool, config: ConfigSrp): RequestHandler {
  const libres = new Set(["/acceso/yo", "/acceso/contrasena", "/acceso/salir"]);
  return async (req: Request, res: Response, next: NextFunction) => {
    const s = await S.validar(pool, S.testigoDe(req), config.acceso);
    if (!s) return responder(res, 401, "SIN_SESION", "Entre con su correo y contraseña.");
    if ("cerrada" in s) {
      S.borrarCookie(res, { ruta: config.ruta, segura: config.cookieSegura });
      return responder(res, 401, "SESION_" + s.cerrada, TEXTOS_CIERRE[s.cerrada]);
    }
    const cred = (await pool.query<{ temporal: boolean }>("SELECT temporal FROM srp.credenciales WHERE usuario_id = $1", [s.usuario.id])).rows[0];
    const sesion: Sesion = { id: s.id, usuario: s.usuario, debeCambiar: !cred || cred.temporal };
    res.locals.sesion = sesion;
    if (sesion.debeCambiar && !libres.has(req.path)) return responder(res, 403, "DEBE_CAMBIAR", "Antes de seguir, cambie su contraseña temporal.");
    next();
  };
}

interface FilaEntrada extends S.Usuario {
  institucion_activa: boolean;
  derivada: string | null;
  temporal: boolean | null;
  temporal_vencida: boolean | null;
}

const texto = (v: unknown) => (typeof v === "string" ? v : v === undefined || v === null ? "" : String(v));

export function rutasAcceso(pool: pg.Pool, config: ConfigSrp): { router: Router; sesion: RequestHandler } {
  const r = Router();
  const A = config.acceso;

  r.post("/acceso/entrar", async (req: Request, res: Response) => {
    const correo = texto(req.body?.correo).trim().toLowerCase();
    const contrasena = texto(req.body?.contrasena);
    // El mensaje le dice a quien sí tiene cuenta a quién acudir, sin decir qué pasó
    const incorrecto = () => responder(res, 401, "INCORRECTO", "Correo o contraseña incorrectos. Si son correctos y no puede entrar, consulte a la Administración global.");
    if (!correo || !contrasena) return responder(res, 400, "FALTAN_DATOS", "Escriba su correo y su contraseña.");
    if (correo.length > 254 || contrasena.length > 256) {
      await verificarSombra(contrasena.slice(0, 256));
      return incorrecto();
    }
    const { rows } = await pool.query<FilaEntrada>(
      `SELECT u.*, o.activo AS institucion_activa, c.derivada, c.temporal,
              c.temporal AND c.temporal_expira_en <= now() AS temporal_vencida
         FROM srp.usuarios u JOIN srp.instituciones o ON o.id = u.organizacion_id
         LEFT JOIN srp.credenciales c ON c.usuario_id = u.id
        WHERE u.correo = $1`,
      [correo],
    );
    const u = rows[0];
    if (!u || !u.derivada) {
      await verificarSombra(contrasena);
      await anotar(pool, req, "ENTRADA_FALLIDA", u ? { usuarioId: u.id } : { correo });
      return incorrecto();
    }
    /* Cada intento se anota antes de verificar la contraseña, en un solo paso de la base: intentos
       simultáneos no pasan del máximo. El que llega al máximo bloquea la cuenta; una cuenta bloqueada no
       recibe turno; vencido el bloqueo, vuelve a contar desde uno. */
    const turno = (
      await pool.query(
        `UPDATE srp.credenciales SET
            intentos_fallidos = CASE WHEN bloqueada_hasta IS NULL THEN intentos_fallidos + 1 ELSE 1 END,
            bloqueada_hasta = CASE WHEN (CASE WHEN bloqueada_hasta IS NULL THEN intentos_fallidos + 1 ELSE 1 END) >= $2
                                   THEN now() + make_interval(mins => $3) END
          WHERE usuario_id = $1 AND (bloqueada_hasta IS NULL OR bloqueada_hasta <= now())
          RETURNING bloqueada_hasta`,
        [u.id, A.intentosMaximos, A.bloqueoMinutos],
      )
    ).rows[0];
    // Se verifica siempre, también bloqueada o desactivada: el tiempo no debe decir en qué estado está la cuenta
    const correcta = await verificar(contrasena, u.derivada);
    const quien = { usuarioId: u.id };
    if (!turno || !correcta) {
      // El intento que llega al máximo es el que bloquea la cuenta
      await anotar(pool, req, turno?.bloqueada_hasta ? "BLOQUEO" : "ENTRADA_FALLIDA", quien);
      return incorrecto();
    }
    // La contraseña es correcta: la cuenta vuelve a contar desde cero
    await pool.query("UPDATE srp.credenciales SET intentos_fallidos = 0, bloqueada_hasta = NULL WHERE usuario_id = $1", [u.id]);
    if (!u.activo || !u.institucion_activa) {
      await anotar(pool, req, "ENTRADA_FALLIDA", quien);
      return incorrecto();
    }
    // Una temporal vencida sólo se dice a quien escribió la contraseña correcta
    if (u.temporal_vencida) {
      await anotar(pool, req, "ENTRADA_FALLIDA", quien);
      return responder(res, 403, "TEMPORAL_VENCIDA", "Su contraseña temporal venció. Pida otra a la Administración global.");
    }
    const testigo = await S.abrir(pool, u.id, { agente: req.get("user-agent") || "", inactividadDias: A.inactividadDias });
    await anotar(pool, req, "ENTRADA", quien);
    S.ponerCookie(res, testigo, { ruta: config.ruta, segura: config.cookieSegura });
    res.json({ usuario: cuentaPublica(u), debeCambiar: Boolean(u.temporal) });
  });

  const sesion = exigirSesion(pool, config);

  r.post("/acceso/salir", sesion, async (req: Request, res: Response) => {
    const s = sesionDe(res);
    await S.cerrar(pool, s.id, "SALIDA");
    await anotar(pool, req, "SALIDA", { usuarioId: s.usuario.id });
    S.borrarCookie(res, { ruta: config.ruta, segura: config.cookieSegura });
    res.json({ ok: true });
  });

  r.get("/acceso/yo", sesion, (req: Request, res: Response) => {
    const s = sesionDe(res);
    res.json({ usuario: cuentaPublica(s.usuario), debeCambiar: s.debeCambiar });
  });

  r.post("/acceso/contrasena", sesion, async (req: Request, res: Response) => {
    const actual = texto(req.body?.actual), nueva = texto(req.body?.nueva);
    const s = sesionDe(res), u = s.usuario;
    const cred = (await pool.query<{ derivada: string }>("SELECT derivada FROM srp.credenciales WHERE usuario_id = $1", [u.id])).rows[0];
    if (!cred || !(await verificar(actual, cred.derivada))) return responder(res, 400, "ACTUAL_INCORRECTA", "La contraseña actual no es correcta.");
    const motivo = revisarNueva(nueva, { largoMinimo: A.largoMinimo, correo: u.correo, actual });
    if (motivo) return responder(res, 400, "NUEVA_INVALIDA", motivo);
    const derivada = await derivar(nueva);
    await enTransaccion(pool, async (c) => {
      await c.query(
        `UPDATE srp.credenciales SET derivada = $2, temporal = false, temporal_expira_en = NULL, intentos_fallidos = 0,
          bloqueada_hasta = NULL, cambiada_en = now(), cambiada_por_id = $1 WHERE usuario_id = $1`,
        [u.id, derivada],
      );
      await S.cerrarDeCuenta(c, u.id, "CONTRASENA_CAMBIADA", s.id);
      await anotar(c, req, "CONTRASENA_CAMBIADA", { usuarioId: u.id });
    });
    res.json({ ok: true });
  });

  return { router: r, sesion };
}
