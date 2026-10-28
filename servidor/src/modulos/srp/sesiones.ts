import { createHash, randomBytes } from "node:crypto";
import type { Request, Response } from "express";
import type pg from "pg";

/* SESIONES. Al entrar se da un testigo al azar que viaja en una cookie sólo HTTP; en la base se guarda
   únicamente su resumen, así que quien lea la tabla no puede hacerse pasar por nadie. Testigo y resumen
   tienen la forma del módulo `acceso` del SIA: 32 bytes al azar en base64url (43 caracteres) y su sha256
   en hexadecimal; un testigo con otra forma no se busca en la base.

   Una sesión deja de valer al salir, al pasar el tiempo de inactividad sin usarla, al cambiar o
   restablecer la contraseña, y en cuanto su cuenta o su institución dejan de estar activas. Cada uso
   renueva el plazo: `expira_en` es el momento en que vencerá si nadie la vuelve a usar. */

// El nombre sigue el de las cookies del SIA: sia_<módulo>_sesion
export const COOKIE = "sia_srp_sesion";
const BIEN_FORMADO = /^[A-Za-z0-9_-]{43}$/;

export type MotivoCierre =
  | "SALIDA"
  | "VENCIDA"
  | "CUENTA_DESACTIVADA"
  | "INSTITUCION_DESACTIVADA"
  | "CONTRASENA_CAMBIADA"
  | "CONTRASENA_RESTABLECIDA";

/** La fila de srp.usuarios, como la guarda también el teléfono. */
export interface Usuario {
  id: string;
  correo: string;
  nombre_completo: string;
  organizacion_id: string;
  area_id: string | null;
  cargo_rol: string;
  perfil: string;
  activo: boolean;
}

export type Validacion = null | { cerrada: MotivoCierre } | { id: string; usuario: Usuario };

/** Pool o cliente de una transacción: las funciones se usan en los dos contextos. */
export type Consultable = pg.Pool | pg.PoolClient;

export const resumen = (testigo: string): string => createHash("sha256").update(String(testigo), "utf8").digest("hex");

export async function abrir(bd: Consultable, usuarioId: string, { agente = "", inactividadDias }: { agente?: string; inactividadDias: number }): Promise<string> {
  const testigo = randomBytes(32).toString("base64url");
  await bd.query(
    `INSERT INTO srp.sesiones (testigo_resumen, usuario_id, expira_en, agente)
     VALUES ($1, $2, now() + make_interval(days => $3), $4)`,
    [resumen(testigo), usuarioId, inactividadDias, String(agente).slice(0, 300)],
  );
  return testigo;
}

interface FilaSesion {
  id: string;
  cerrada_en: Date | null;
  motivo_cierre: MotivoCierre | null;
  vencida: boolean;
  anotar: boolean;
  cuenta_activa: boolean;
  institucion_activa: boolean;
  usuario: Usuario;
}

/* La sesión del testigo, con su cuenta, si sigue valiendo; si no, la cierra diciendo por qué y devuelve
   { cerrada: motivo }. La actividad, y con ella el nuevo vencimiento, se anota a lo más una vez por minuto. */
export async function validar(bd: Consultable, testigo: string | null, { inactividadDias }: { inactividadDias: number }): Promise<Validacion> {
  if (!testigo || !BIEN_FORMADO.test(testigo)) return null;
  const { rows } = await bd.query<FilaSesion>(
    `SELECT s.id, s.cerrada_en, s.motivo_cierre,
            s.expira_en <= now() AS vencida,
            s.ultima_actividad <= now() - interval '1 minute' AS anotar,
            u.activo AS cuenta_activa, o.activo AS institucion_activa, row_to_json(u) AS usuario
       FROM srp.sesiones s JOIN srp.usuarios u ON u.id = s.usuario_id JOIN srp.instituciones o ON o.id = u.organizacion_id
      WHERE s.testigo_resumen = $1`,
    [resumen(testigo)],
  );
  const s = rows[0];
  if (!s) return null;
  if (s.cerrada_en) return { cerrada: s.motivo_cierre ?? "SALIDA" };
  const motivo: MotivoCierre | null = s.vencida ? "VENCIDA" : !s.cuenta_activa ? "CUENTA_DESACTIVADA" : !s.institucion_activa ? "INSTITUCION_DESACTIVADA" : null;
  if (motivo) {
    await bd.query("UPDATE srp.sesiones SET cerrada_en = now(), motivo_cierre = $2 WHERE id = $1", [s.id, motivo]);
    return { cerrada: motivo };
  }
  if (s.anotar) {
    await bd.query("UPDATE srp.sesiones SET ultima_actividad = now(), expira_en = now() + make_interval(days => $2) WHERE id = $1", [s.id, inactividadDias]);
  }
  return { id: s.id, usuario: s.usuario };
}

export async function cerrar(bd: Consultable, sesionId: string, motivo: MotivoCierre): Promise<void> {
  await bd.query("UPDATE srp.sesiones SET cerrada_en = now(), motivo_cierre = $2 WHERE id = $1 AND cerrada_en IS NULL", [sesionId, motivo]);
}

// Cierra todas las sesiones abiertas de una cuenta, salvo `salvo` (la que hace el cambio)
export async function cerrarDeCuenta(bd: Consultable, usuarioId: string, motivo: MotivoCierre, salvo: string | null = null): Promise<number> {
  const r = await bd.query(
    `UPDATE srp.sesiones SET cerrada_en = now(), motivo_cierre = $2
      WHERE usuario_id = $1 AND cerrada_en IS NULL AND id IS DISTINCT FROM $3`,
    [usuarioId, motivo, salvo],
  );
  return r.rowCount ?? 0;
}

// El testigo de la cookie de la petición. Express 5 no trae lector de cookies, y no hace falta uno para leer una
export function testigoDe(req: Request): string | null {
  const encabezado = req.header("cookie");
  if (typeof encabezado !== "string") return null;
  for (const par of encabezado.split(";")) {
    const i = par.indexOf("=");
    if (i < 0 || par.slice(0, i).trim() !== COOKIE) continue;
    // Un testigo bien formado no lleva nada que decodificar; uno mal escrito no tumba la petición
    try {
      return decodeURIComponent(par.slice(i + 1).trim());
    } catch {
      return null;
    }
  }
  return null;
}

/* La cookie: sólo HTTP, del mismo sitio, sólo para la API y, en el SIA, sólo por conexión cifrada. Dura lo
   más que admiten los navegadores (400 días): quien decide si la sesión sigue valiendo es el servidor, y una
   cookie de una semana dejaría fuera a quien entra todos los días. */
const COOKIE_MAX_DIAS = 400;
export function ponerCookie(res: Response, testigo: string, { ruta, segura }: { ruta: string; segura: boolean }): void {
  res.cookie(COOKIE, testigo, { httpOnly: true, sameSite: "strict", secure: segura, path: ruta, maxAge: COOKIE_MAX_DIAS * 86_400_000 });
}
export function borrarCookie(res: Response, { ruta, segura }: { ruta: string; segura: boolean }): void {
  res.clearCookie(COOKIE, { httpOnly: true, sameSite: "strict", secure: segura, path: ruta });
}
