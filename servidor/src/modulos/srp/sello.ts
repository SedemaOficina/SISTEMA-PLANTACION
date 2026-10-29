import type { NextFunction, Request, Response } from "express";
import type pg from "pg";

/* EL SELLO DE LOS DATOS. Nace con la instalación y cambia cuando el servidor se vacía después de la prueba en campo
   (db/srp/vaciar-tras-prueba.sql). Empieza con la fecha y la hora: compararlos como texto es compararlos en el tiempo.
   El teléfono lo recibe al entrar y al confirmar su sesión, y lo manda en la cabecera X-SRP-Sello con lo que envía. Si
   el del teléfono es más viejo que el del servidor, el servicio no acepta el envío (409 SELLO_DISTINTO, con el sello
   vigente) y el teléfono borra lo que guardaba: así los datos de la prueba no vuelven al servidor limpio. Si es más
   nuevo —el servidor volvió a un respaldo de antes del vaciado— se acepta: lo que el teléfono no ha enviado es real.
   Sin cabecera (un teléfono que todavía no lo conoce) se atiende como siempre. El acceso no se revisa: entrar, salir y
   cambiar la contraseña no envían datos. */
export const leerSello = async (pool: pg.Pool): Promise<string> =>
  String((await pool.query("SELECT valor FROM srp.sello")).rows[0]?.valor ?? "");

export function revisarSello(pool: pg.Pool) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const suyo = req.get("x-srp-sello");
    if (!suyo || req.method === "GET" || req.method === "HEAD" || req.path.startsWith("/acceso/")) return next();
    try {
      const sello = await leerSello(pool);
      if (suyo >= sello) return next();
      res.status(409).json({ codigo: "SELLO_DISTINTO", mensaje: "El servidor se vació después de la prueba: lo que guardaba este teléfono ya no se envía.", sello });
    } catch (e) {
      next(e);
    }
  };
}
