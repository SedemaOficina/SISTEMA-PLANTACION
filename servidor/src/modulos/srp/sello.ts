import type { NextFunction, Request, Response } from "express";
import type pg from "pg";

/* EL SELLO DE LOS DATOS. Nace con la instalación y cambia cuando el servidor se vacía después de la prueba en campo
   (db/srp/vaciar-tras-prueba.sql). Empieza con la fecha y la hora: compararlos como texto es compararlos en el tiempo.
   El teléfono lo recibe al entrar y al confirmar su sesión, lo guarda con su cola de envío, y cada operación lleva el
   que estaba vigente cuando se capturó, en la cabecera X-SRP-Sello. Si es más viejo que el del servidor, el servicio no
   acepta el envío (409 SELLO_DISTINTO, con el sello vigente) y el teléfono borra lo que guardaba: así los datos de la
   prueba no vuelven al servidor limpio. Si es más nuevo —el servidor volvió a un respaldo de antes del vaciado— se
   acepta: lo que el teléfono no ha enviado es real.
   Sin cabecera se atiende mientras el servidor no se haya vaciado; después, no: lo que llega sin sello podría ser de la
   prueba. Se sabe que se vació porque la constancia del sello ya no es la de la instalación. El acceso no se revisa:
   entrar, salir y cambiar la contraseña no envían datos. */
export const leerSello = async (pool: pg.Pool): Promise<string> =>
  String((await pool.query("SELECT valor FROM srp.sello")).rows[0]?.valor ?? "");

export function revisarSello(pool: pg.Pool) {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (req.method === "GET" || req.method === "HEAD" || req.path.startsWith("/acceso/")) return next();
    const suyo = req.get("x-srp-sello");
    try {
      const fila = (await pool.query("SELECT valor, nota <> 'Instalación' AS vaciado FROM srp.sello")).rows[0];
      const sello = String(fila?.valor ?? "");
      if (suyo ? suyo >= sello : !fila?.vaciado) return next();
      res.status(409).json({ codigo: "SELLO_DISTINTO", mensaje: "El servidor se vació después de la prueba: lo que guardaba este teléfono ya no se envía.", sello });
    } catch (e) {
      next(e);
    }
  };
}
