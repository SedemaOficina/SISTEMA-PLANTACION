import { Router, type Request, type RequestHandler, type Response } from "express";
import type pg from "pg";
import { sesionDe } from "./acceso";
import { responder, traducir } from "./errores";
import { crearArbol, editarArbol, eliminarArbol, moverArbol, restaurarArbol, sustituirArbol } from "./recepcion-arboles";
import { idDe, rechazo, type Operacion, type Resultado } from "./recepcion-apoyo";
import {
  cerrarJornada, cierreJornada, compartirJornada, crearJornada, editarJornada, eliminarJornada, reabrirJornada, relevoJornada, reporteJornada, revisarPuntos, terminarParte,
} from "./recepcion-jornadas";
import { enTransaccion } from "./transaccion";

/* RECEPCIÓN: lo que envían los teléfonos.

   POST /envios   { operaciones: [{ tipo, datos }] }, hasta 100 por envío, en el orden en que se hicieron

   Cada operación lleva el nombre de la acción de permisos.ts que la autoriza, o de lo que hace con ella:
     jornada.crear        una jornada nueva
     jornada.editar       { id, version, cambios }: nombre, dirección, programa, previstos, fecha, comentarios, solicitud
     jornada.cerrar       { id, version }                        (con el permiso jornada.editar)
     jornada.reabrir      { id, version }                        (jornada.editar)
     jornada.revisar      { id, version, puntos_revisados }      (jornada.editar)
     jornada.cierre       { id, version, encargado_id, personal, apoyo, observaciones, chofer, vehiculo_id, hora }  (jornada.editar)
     jornada.reporte      { id, version }: el reporte se entregó  (jornada.editar)
     jornada.relevo       { id, version, cabo_id }
     jornada.compartir    { id, agregar, quitar }: los cabos de apoyo que entran y salen de una jornada compartida
     jornada.terminar     { id }: el cabo de apoyo terminó su parte
     jornada.eliminar     { id, version }: sólo sin árboles
     registro.crear       un árbol nuevo, en una jornada que ya está en el servidor
     registro.editar      { id, version, cambios }: sólo los campos que cambiaron
     registro.eliminar    { id, version }
     registro.restaurar   { id, version }
     registro.sustituir   el sustituto, con `sustituye_id`, su motivo y la fecha en que se planta
     registro.mover       { id, version, jornada_id }: a otra jornada del mismo cabo

   Cada operación va en su propia transacción: si una se rechaza, las demás siguen. La respuesta dice, para
   cada una y en el mismo orden, si quedó recibida —con el registro como lo guardó el servidor, que es el que
   vale desde ahí, y su versión— o rechazada y por qué. Reenviar una operación ya recibida no duplica nada.

   El servidor no se queda con lo que calcula el teléfono: vuelve a ubicar el punto (alcaldía, colonia,
   celda UGA y versión de capas), pone el autor, la institución, el estado y el programa del árbol, que es
   el de su jornada, y asigna el folio al recibir el árbol, en la misma transacción. Las reglas y los
   mensajes son los de la aplicación. */

export const MAXIMO_OPERACIONES = 100;

const OPERACIONES: Record<string, Operacion> = {
  "jornada.crear": crearJornada,
  "jornada.editar": editarJornada,
  "jornada.cerrar": cerrarJornada,
  "jornada.reabrir": reabrirJornada,
  "jornada.revisar": revisarPuntos,
  "jornada.cierre": cierreJornada,
  "jornada.reporte": reporteJornada,
  "jornada.relevo": relevoJornada,
  "jornada.compartir": compartirJornada,
  "jornada.terminar": terminarParte,
  "jornada.eliminar": eliminarJornada,
  "registro.crear": crearArbol,
  "registro.editar": editarArbol,
  "registro.eliminar": eliminarArbol,
  "registro.restaurar": restaurarArbol,
  "registro.sustituir": sustituirArbol,
  "registro.mover": moverArbol,
};

export function rutasRecepcion(pool: pg.Pool, sesion: RequestHandler): Router {
  const r = Router();

  r.post("/envios", sesion, async (req: Request, res: Response) => {
    const operaciones: unknown = req.body?.operaciones;
    if (!Array.isArray(operaciones) || !operaciones.length) return responder(res, 400, "SIN_OPERACIONES", "El envío no trae operaciones.");
    if (operaciones.length > MAXIMO_OPERACIONES) return responder(res, 413, "DEMASIADAS", "Envíe hasta " + MAXIMO_OPERACIONES + " operaciones por vez.");
    const u = sesionDe(res).usuario;
    const resultados: Resultado[] = [];
    for (const op of operaciones) {
      const tipo = String(op?.tipo ?? "");
      const datos = op?.datos && typeof op.datos === "object" ? (op.datos as Record<string, unknown>) : {};
      const operar = Object.hasOwn(OPERACIONES, tipo) ? OPERACIONES[tipo] : undefined;
      if (!operar) {
        resultados.push(rechazo(idDe(datos.id), "OPERACION_DESCONOCIDA", "El servidor no reconoce la operación «" + tipo + "»."));
        continue;
      }
      try {
        resultados.push(await enTransaccion(pool, async (c) => {
          // Las fechas de la respuesta salen en UTC, como en las consultas
          await c.query("SET LOCAL TIME ZONE 'UTC'");
          return operar(c, u, datos);
        }));
      } catch (e) {
        // Una falla del servidor en una operación no detiene a las demás; el detalle va al registro
        const t = traducir(e);
        console.error(`🔥 [SRP] ${tipo} ${String(datos.id ?? "")} → ${t.detalle}`);
        resultados.push(rechazo(idDe(datos.id), t.codigo, t.mensaje));
      }
    }
    res.json({ resultados });
  });

  return r;
}
