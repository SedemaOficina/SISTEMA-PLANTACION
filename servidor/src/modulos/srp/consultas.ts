import { Router, type Request, type RequestHandler, type Response } from "express";
import type pg from "pg";
import { sesionDe } from "./acceso";
import { responder } from "./errores";
import { alcanceSql, veArbolSql, Parametros } from "./permisos";
import { enTransaccion } from "./transaccion";

/* CONSULTAS: las jornadas y los árboles que cada quien puede ver, con las reglas de permisos.ts.

   GET /jornadas        las jornadas de su alcance
   GET /plantaciones    los árboles de su alcance y, de una jornada donde estuvo de relevo, todos los suyos

   Lo de un lote de carga masiva que todavía sube o que se deshizo no se ve (cargas.ts).

   Por páginas, en orden de identificador: `?despues=<id del último recibido>&limite=<n>` (500 por omisión,
   hasta 2000). La respuesta trae { filas, siguiente }: `siguiente` es el `despues` de la página que sigue,
   o null al terminar. Las filas llevan los campos de las tablas del teléfono, con las fechas como texto
   ISO 8601 en UTC; la fotografía no viaja en la lista. */

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const LIMITE = 500;
const LIMITE_MAXIMO = 2000;

interface Pagina {
  despues: string | null;
  limite: number;
}

function paginaDe(req: Request): Pagina | string {
  const { despues, limite } = req.query;
  if (despues !== undefined && (typeof despues !== "string" || !UUID.test(despues))) return "«despues» debe ser el identificador del último renglón recibido.";
  if (limite !== undefined && (typeof limite !== "string" || !/^\d{1,5}$/.test(limite) || Number(limite) < 1)) return "«limite» debe ser un número entero positivo.";
  return { despues: despues ?? null, limite: Math.min(limite ? Number(limite) : LIMITE, LIMITE_MAXIMO) };
}

// Una página de la tabla con la condición de alcance; `quitar`, las columnas que no viajan en la lista
async function listar(pool: pg.Pool, tabla: string, condicion: string, p: Parametros, pagina: Pagina, quitar: string[] = []) {
  const sinColumnas = quitar.map((c) => ` - '${c}'`).join("");
  const desde = pagina.despues ? ` AND x.id > ${p.agregar(pagina.despues)}::uuid` : "";
  const sql = `SELECT to_jsonb(x)${sinColumnas} AS fila FROM srp.${tabla} x WHERE ${condicion}${desde} ORDER BY x.id LIMIT ${p.agregar(pagina.limite + 1)}`;
  const filas = await enTransaccion(pool, async (c) => {
    // Las fechas salen en UTC, sea cual sea la zona de la base
    await c.query("SET LOCAL TIME ZONE 'UTC'");
    return (await c.query<{ fila: { id: string } }>(sql, p.valores)).rows.map((r) => r.fila);
  });
  const hayMas = filas.length > pagina.limite;
  if (hayMas) filas.pop();
  return { filas, siguiente: hayMas ? filas[filas.length - 1].id : null };
}

export function rutasConsultas(pool: pg.Pool, sesion: RequestHandler): Router {
  const r = Router();

  r.get("/jornadas", sesion, async (req: Request, res: Response) => {
    const pagina = paginaDe(req);
    if (typeof pagina === "string") return responder(res, 400, "CONSULTA_INVALIDA", pagina);
    const p = new Parametros();
    res.json(await listar(pool, "jornadas", alcanceSql(sesionDe(res).usuario, "jornadas", "x", p) + " AND NOT srp.de_carga_oculta(x.carga_id)", p, pagina));
  });

  r.get("/plantaciones", sesion, async (req: Request, res: Response) => {
    const pagina = paginaDe(req);
    if (typeof pagina === "string") return responder(res, 400, "CONSULTA_INVALIDA", pagina);
    const p = new Parametros();
    const visible = " AND NOT EXISTS (SELECT 1 FROM srp.jornadas jc WHERE jc.id = x.jornada_id AND srp.de_carga_oculta(jc.carga_id))";
    res.json(await listar(pool, "plantaciones", veArbolSql(sesionDe(res).usuario, "x", p) + visible, p, pagina, ["foto_base64"]));
  });

  return r;
}
