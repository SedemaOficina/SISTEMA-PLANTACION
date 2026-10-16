import { Router, type Request, type RequestHandler, type Response } from "express";
import type pg from "pg";
import { sesionDe } from "./acceso";
import { responder } from "./errores";
import { exigirPermiso, Parametros, veArbolSql } from "./permisos";
import { enTransaccion } from "./transaccion";

/* LO QUE DICE LA BITÁCORA, para la pantalla. Con datos reales el teléfono no guarda la bitácora de lo que ya
   envió (S-11): la consulta aquí.

   GET /plantaciones/:id/historial   lo que se le hizo a un árbol, del más antiguo al más reciente. Sólo de un
                                     árbol que quien pregunta puede ver; si no, como si no existiera
   GET /cambios                      los cambios de cuentas, catálogos y parámetros, y las cargas masivas, del
                                     más reciente al más antiguo. Sólo la Administración global

   /cambios va por páginas: `?despues=<siguiente de la página anterior>&limite=<n>` (500 por omisión, hasta
   2000), y responde { filas, siguiente }, con `siguiente` en null al terminar. Las fechas van en UTC. */

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const LIMITE = 500;
const LIMITE_MAXIMO = 2000;
// Lo que va al Registro de cambios de Configuración; lo de jornadas y árboles va en su propio historial
const ENTIDADES_DE_CAMBIOS = ["usuario", "catalogo", "carga"];

interface Renglon {
  id: string;
  fecha: string;
}

/* El renglón, con la fecha al milésimo de segundo como las demás del servicio: así la lee cualquier navegador.
   La exacta, al millonésimo, sólo marca dónde sigue la página siguiente. */
const FILA = `jsonb_set(to_jsonb(b), '{fecha}', to_jsonb(to_char(b.fecha, 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')))`;
const EXACTA = `to_char(b.fecha, 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"')`;

// La página que sigue empieza después de este renglón: «fecha exacta|id», el orden de la lista
const cursorDe = (x: { exacta: string; fila: Renglon }): string => x.exacta + "|" + x.fila.id;
function leerCursor(v: unknown): { fecha: string; id: string } | null {
  if (typeof v !== "string") return null;
  const corte = v.lastIndexOf("|");
  const fecha = v.slice(0, corte), id = v.slice(corte + 1);
  return corte > 0 && !Number.isNaN(Date.parse(fecha)) && UUID.test(id) ? { fecha, id } : null;
}

export function rutasHistorial(pool: pg.Pool, sesion: RequestHandler): Router {
  const r = Router();

  // En una transacción con las fechas en UTC, que es como salen en las consultas
  const enUtc = <T>(trabajo: (c: pg.PoolClient) => Promise<T>) =>
    enTransaccion(pool, async (c) => {
      await c.query("SET LOCAL TIME ZONE 'UTC'");
      return trabajo(c);
    });

  r.get("/plantaciones/:id/historial", sesion, async (req: Request, res: Response) => {
    const id = String(req.params.id);
    if (!UUID.test(id)) return responder(res, 404, "NO_EXISTE", "Ese árbol no existe o no lo puede ver.");
    const u = sesionDe(res).usuario;
    const filas = await enUtc(async (c) => {
      const p = new Parametros();
      const ve = await c.query(`SELECT 1 FROM srp.plantaciones x WHERE x.id = ${p.agregar(id)}::uuid AND ${veArbolSql(u, "x", p)}`, p.valores);
      if (!ve.rowCount) return null;
      return (await c.query<{ fila: Renglon }>(
        `SELECT ${FILA} AS fila FROM srp.bitacora b WHERE b.entidad = 'plantacion' AND b.entidad_id = $1 ORDER BY b.fecha, b.id`,
        [id],
      )).rows.map((x) => x.fila);
    });
    if (!filas) return responder(res, 404, "NO_EXISTE", "Ese árbol no existe o no lo puede ver.");
    res.json({ filas });
  });

  r.get("/cambios", sesion, exigirPermiso("usuario.administrar"), async (req: Request, res: Response) => {
    const { despues, limite } = req.query;
    const cursor = despues === undefined ? null : leerCursor(despues);
    if (despues !== undefined && !cursor) return responder(res, 400, "CONSULTA_INVALIDA", "«despues» debe ser el valor «siguiente» de la página anterior.");
    if (limite !== undefined && (typeof limite !== "string" || !/^\d{1,5}$/.test(limite) || Number(limite) < 1)) return responder(res, 400, "CONSULTA_INVALIDA", "«limite» debe ser un número entero positivo.");
    const n = Math.min(limite ? Number(limite) : LIMITE, LIMITE_MAXIMO);
    const p = new Parametros();
    const condicion = "b.entidad = ANY(" + p.agregar(ENTIDADES_DE_CAMBIOS) + "::text[])" +
      (cursor ? ` AND (b.fecha, b.id) < (${p.agregar(cursor.fecha)}::timestamptz, ${p.agregar(cursor.id)}::uuid)` : "");
    const renglones = await enUtc(async (c) => (await c.query<{ fila: Renglon; exacta: string }>(
      `SELECT ${FILA} AS fila, ${EXACTA} AS exacta FROM srp.bitacora b WHERE ${condicion} ORDER BY b.fecha DESC, b.id DESC LIMIT ${p.agregar(n + 1)}`,
      p.valores,
    )).rows);
    const hayMas = renglones.length > n;
    if (hayMas) renglones.pop();
    res.json({ filas: renglones.map((x) => x.fila), siguiente: hayMas ? cursorDe(renglones[renglones.length - 1]) : null });
  });

  return r;
}
