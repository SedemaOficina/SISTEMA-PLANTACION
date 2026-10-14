import { Router, type Request, type RequestHandler, type Response } from "express";
import type pg from "pg";
import { sesionDe } from "./acceso";
import { responder } from "./errores";
import { valorParametro } from "./parametros";
import { exigirPermiso, Parametros, veArbolSql } from "./permisos";
import { especieComun, textoFolio, type Duplicado, type Fila, type Resultado } from "./recepcion-apoyo";
import type { Usuario } from "./sesiones";
import { enTransaccion } from "./transaccion";

/* LOS POSIBLES DUPLICADOS. Al recibir un árbol —alta, sustitución, restauración o punto corregido— se busca otro
   árbol activo, de otra jornada, a menos de la incertidumbre combinada de los dos puntos: la suma de sus
   precisiones, nunca menos que el parámetro de puntos duplicados (srp.vecinos). Los de la misma jornada los
   revisa el teléfono con sus propios avisos.

   · Si es de la misma institución, la respuesta trae el aviso en `duplicado`. Dice de qué árbol se trata sólo si
     quien mandó éste lo puede ver.
   · Si es de otra, el árbol se recibe igual y la pareja va a la bandeja que atiende la Administración global, sin
     decirle nada a ninguna de las dos instituciones.

   Es un aviso, nunca un rechazo. Un reenvío vuelve a dar el mismo aviso y no repite la pareja.

   GET  /duplicados            la bandeja, por páginas: ?estado=pendientes (por omisión), revisados o todos
   POST /duplicados/revision   { ids, resolucion: "mismo" | "distintos", nota }
   Las dos, sólo la Administración global. Una pareja revisada no se vuelve a revisar. Si son el mismo árbol, se
   elimina uno de los dos como cualquier otro registro. */

interface Vecino {
  misma_institucion: boolean;
  cercano_id: string;
  distancia_m: string;
  umbral_m: string;
}

// Busca los vecinos del árbol, anota en la bandeja el de otra institución y devuelve el aviso del de la suya
async function revisarVecinos(c: pg.PoolClient, u: Usuario, id: string): Promise<Duplicado | undefined> {
  const piso = await valorParametro(c, "JORNADA.DUPLICADO_M");
  const { rows } = await c.query<Vecino>("SELECT * FROM srp.vecinos($1, $2)", [id, piso]);
  const otra = rows.find((v) => !v.misma_institucion);
  if (otra) {
    await c.query(
      `INSERT INTO srp.duplicados (plantacion_id, cercano_id, distancia_m, umbral_m) VALUES ($1, $2, $3, $4)
       ON CONFLICT ((least(plantacion_id, cercano_id)), (greatest(plantacion_id, cercano_id))) DO NOTHING`,
      [id, otra.cercano_id, otra.distancia_m, otra.umbral_m],
    );
  }
  const misma = rows.find((v) => v.misma_institucion);
  if (!misma) return undefined;
  const aviso: Duplicado = { texto: "", distancia_m: Number(misma.distancia_m), umbral_m: Number(misma.umbral_m) };
  const metros = aviso.distancia_m.toFixed(1);
  const p = new Parametros();
  const ve = veArbolSql(u, "y", p);
  const y = (await c.query<{ ve: boolean; fila: Fila; jornada: string | null }>(
    `SELECT ${ve} AS ve, to_jsonb(y) - 'foto_base64' AS fila, j.nombre AS jornada
       FROM srp.plantaciones y LEFT JOIN srp.jornadas j ON j.id = y.jornada_id WHERE y.id = ${p.agregar(misma.cercano_id)}`,
    p.valores,
  )).rows[0];
  if (!y.ve) {
    aviso.texto = "Posible duplicado: a " + metros + " m de un árbol que registró otra persona de su institución. Revise con su coordinación si es el mismo árbol.";
    return aviso;
  }
  aviso.plantacion_id = y.fila.id;
  aviso.folio = textoFolio(y.fila);
  aviso.texto = "Posible duplicado: a " + metros + " m de " + (await especieComun(c, y.fila)) + " (" + aviso.folio + "), de la jornada «" + String(y.jornada ?? "") +
    "». Revise si es el mismo árbol.";
  return aviso;
}

// El resultado con el aviso de posible duplicado, si el árbol quedó activo
export async function conDuplicado(c: pg.PoolClient, u: Usuario, r: Resultado): Promise<Resultado> {
  if (r.estado !== "recibido" || !r.fila || r.fila.estatus !== "activo") return r;
  const duplicado = await revisarVecinos(c, u, r.fila.id);
  return duplicado ? { ...r, duplicado } : r;
}

/* ---------- La bandeja ---------- */

// Pendiente: sin revisar y con los dos árboles activos; si se eliminó uno, ya no cuenta dos veces
const PENDIENTE = "d.resolucion IS NULL AND a.estatus = 'activo' AND b.estatus = 'activo'";
const ESTADOS: Record<string, string> = { pendientes: PENDIENTE, revisados: "d.resolucion IS NOT NULL", todos: "true" };
const LIMITE = 100;
const LIMITE_MAXIMO = 500;
const RESOLUCIONES = ["mismo", "distintos"];

// Lo que la Administración necesita ver de cada árbol de la pareja para decidir
const ficha = (x: string) => `(SELECT jsonb_build_object('id', ${x}.id, 'folio', ${x}.folio, 'estatus', ${x}.estatus,
    'especie', coalesce(e.nombre, ${x}.especie_otra), 'fecha_plantacion', ${x}.fecha_plantacion, 'lat', ${x}.lat, 'lng', ${x}.lng,
    'punto_origen', ${x}.punto_origen, 'gps_precision_m', ${x}.gps_precision_m, 'alcaldia', ${x}.alcaldia, 'colonia', ${x}.colonia,
    'institucion', i.nombre, 'cabo', u.nombre_completo, 'jornada_id', ${x}.jornada_id, 'jornada', j.nombre, 'fecha_registro', ${x}.fecha_registro)
  FROM srp.usuarios u LEFT JOIN srp.instituciones i ON i.id = u.organizacion_id LEFT JOIN srp.especies e ON e.id = ${x}.especie_id
  LEFT JOIN srp.jornadas j ON j.id = ${x}.jornada_id WHERE u.id = ${x}.cabo_id)`;

const DE_LA_PAREJA = "FROM srp.duplicados d JOIN srp.plantaciones a ON a.id = d.plantacion_id JOIN srp.plantaciones b ON b.id = d.cercano_id";

export function rutasDuplicados(pool: pg.Pool, sesion: RequestHandler): Router {
  const r = Router();

  r.get("/duplicados", sesion, exigirPermiso("duplicado.revisar"), async (req: Request, res: Response) => {
    const { estado = "pendientes", despues, limite } = req.query;
    if (typeof estado !== "string" || !Object.hasOwn(ESTADOS, estado)) return responder(res, 400, "CONSULTA_INVALIDA", "«estado» es pendientes, revisados o todos.");
    if (despues !== undefined && (typeof despues !== "string" || !/^\d{1,18}$/.test(despues))) return responder(res, 400, "CONSULTA_INVALIDA", "«despues» debe ser el número del último renglón recibido.");
    if (limite !== undefined && (typeof limite !== "string" || !/^\d{1,5}$/.test(limite) || Number(limite) < 1)) return responder(res, 400, "CONSULTA_INVALIDA", "«limite» debe ser un número entero positivo.");
    const n = Math.min(limite ? Number(limite) : LIMITE, LIMITE_MAXIMO);
    const valores: unknown[] = [n + 1];
    const desde = despues ? " AND d.id > $" + valores.push(despues) : "";
    const { filas, pendientes } = await enTransaccion(pool, async (c) => {
      // Las fechas salen en UTC, sea cual sea la zona de la base
      await c.query("SET LOCAL TIME ZONE 'UTC'");
      const filas = (await c.query<{ fila: { id: number } }>(
        `SELECT jsonb_build_object('id', d.id, 'distancia_m', d.distancia_m, 'umbral_m', d.umbral_m, 'detectado_en', d.detectado_en,
            'distancia_actual_m', round(ST_Distance(srp.punto(a.lat, a.lng)::geography, srp.punto(b.lat, b.lng)::geography)::numeric, 1),
            'resolucion', d.resolucion, 'nota', d.nota, 'revisado_por', r.nombre_completo, 'revisado_en', d.revisado_en,
            'llego', ${ficha("a")}, 'cercano', ${ficha("b")}) AS fila
           ${DE_LA_PAREJA} LEFT JOIN srp.usuarios r ON r.id = d.revisado_por_id
          WHERE ${ESTADOS[estado]}${desde} ORDER BY d.id LIMIT $1`,
        valores,
      )).rows.map((x) => x.fila);
      const pendientes = (await c.query<{ n: number }>(`SELECT count(*)::int AS n ${DE_LA_PAREJA} WHERE ${PENDIENTE}`)).rows[0].n;
      return { filas, pendientes };
    });
    const hayMas = filas.length > n;
    if (hayMas) filas.pop();
    res.json({ filas, siguiente: hayMas ? String(filas[filas.length - 1].id) : null, pendientes });
  });

  r.post("/duplicados/revision", sesion, exigirPermiso("duplicado.revisar"), async (req: Request, res: Response) => {
    const { ids, resolucion, nota = "" } = req.body ?? {};
    const errores: [string, string][] = [];
    const lista = Array.isArray(ids) ? [...new Set(ids)] : [];
    if (!lista.length || lista.length > LIMITE_MAXIMO || !lista.every((x) => Number.isSafeInteger(x) && x > 0)) {
      errores.push(["ids", "Indique de 1 a " + LIMITE_MAXIMO + " parejas por su número."]);
    }
    if (!RESOLUCIONES.includes(resolucion)) errores.push(["resolucion", "Diga si es el mismo árbol o son distintos."]);
    if (typeof nota !== "string" || nota.trim().length > 500) errores.push(["nota", "La nota lleva hasta 500 caracteres."]);
    if (errores.length) return res.status(400).json({ codigo: "DATOS_INVALIDOS", mensaje: "Revise la revisión.", errores });
    const u = sesionDe(res).usuario;
    const resultado = await enTransaccion(pool, async (c) => {
      const revisados = (await c.query<{ id: string }>(
        `UPDATE srp.duplicados SET resolucion = $2, nota = $3, revisado_por_id = $4, revisado_en = now()
          WHERE id = ANY($1::bigint[]) AND resolucion IS NULL RETURNING id`,
        [lista, resolucion, (nota as string).trim(), u.id],
      )).rows.map((x) => Number(x.id));
      const existen = (await c.query<{ id: string }>("SELECT id FROM srp.duplicados WHERE id = ANY($1::bigint[])", [lista])).rows.map((x) => Number(x.id));
      return {
        revisados: revisados.sort((a, b) => a - b),
        ya_revisados: existen.filter((x) => !revisados.includes(x)).sort((a, b) => a - b),
        no_existen: (lista as number[]).filter((x) => !existen.includes(x)).sort((a, b) => a - b),
      };
    });
    res.json(resultado);
  });

  return r;
}
