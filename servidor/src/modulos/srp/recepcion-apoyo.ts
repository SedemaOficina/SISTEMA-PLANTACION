import type pg from "pg";
import { anotarCambio } from "./bitacora";
import { valorParametro } from "./parametros";
import { textoDe, type Accion, type Autores, type Objeto } from "./permisos";
import type { Usuario } from "./sesiones";

/* LO COMÚN A LAS OPERACIONES QUE RECIBE EL SERVIDOR: la forma de la respuesta, la lectura de lo que manda el
   teléfono, la ubicación del punto, la versión de un registro, el folio y el reporte que deja de estar
   vigente. */

export type Errores = [string, string][];
export type Fila = Record<string, unknown> & { id: string };
export type Tabla = "jornadas" | "plantaciones";

export interface Resultado {
  id: string | null;
  estado: "recibido" | "rechazado";
  codigo?: string;
  mensaje?: string;
  errores?: Errores;
  /** El registro como quedó en el servidor (o como está, si se rechazó por versión). */
  fila?: Fila;
  /** La versión de `fila`: la que el teléfono manda con su siguiente cambio. */
  version?: string;
  /** Otros registros que cambiaron con la operación, para que el teléfono los ponga al día. */
  otras?: { tabla: Tabla; fila: Fila }[];
  repetido?: boolean;
  aviso?: string;
  /** Otro árbol de la misma institución, de otra jornada, que podría ser el mismo (duplicados.ts). */
  duplicado?: Duplicado;
}

export interface Duplicado {
  texto: string;
  distancia_m: number;
  /** La incertidumbre combinada de los dos puntos, con su piso. */
  umbral_m: number;
  /** El otro árbol, sólo si quien mandó éste lo puede ver. */
  plantacion_id?: string;
  folio?: string;
}

export type Operacion = (c: pg.PoolClient, u: Usuario, datos: Record<string, unknown>) => Promise<Resultado>;

/* LA VERSIÓN DE UN REGISTRO es el momento de su último cambio en el servidor; si nunca ha cambiado, el de su
   alta. Cada cambio la trae tal como la conoce el teléfono y se rechaza si ya no es la vigente: así nadie
   escribe sobre lo que otra persona cambió mientras tanto (S-16). Los cambios se fechan al milésimo de
   segundo, la precisión con que el teléfono guarda y devuelve las fechas. */
export const AHORA = "date_trunc('milliseconds', now())";
const VERSION_DE: Record<Tabla, string> = { plantaciones: "coalesce(fecha_ultima_edicion, fecha_registro)", jornadas: "coalesce(fecha_ultima_edicion, fecha_inicio)" };
const versionDe = (f: Fila): string | undefined => (f.fecha_ultima_edicion ?? f.fecha_registro ?? f.fecha_inicio) as string | undefined;

export const recibido = (fila: Fila, extra: Partial<Resultado> = {}): Resultado => ({ id: fila.id, estado: "recibido", fila, version: versionDe(fila), ...extra });
export const rechazo = (id: string | null, codigo: string, mensaje: string, errores?: Errores): Resultado =>
  ({ id, estado: "rechazado", codigo, mensaje, ...(errores ? { errores } : {}) });
export const sinPermiso = (id: string | null, accion: Accion) => rechazo(id, "SIN_PERMISO", "No tiene permiso para " + textoDe(accion) + ".");
// Rechazado con el registro como está ahora, para que el teléfono lo muestre y se vuelva a aplicar el cambio
export const conVigente = (r: Resultado, fila: Fila): Resultado => ({ ...r, fila, version: versionDe(fila) });
export const versionVieja = (fila: Fila) =>
  conVigente(rechazo(fila.id, "VERSION_VIEJA", "Alguien más cambió este registro antes: se devuelve como está ahora. Revíselo y vuelva a hacer su cambio."), fila);

// Un alta que ya llegó: la misma respuesta si es de quien la manda; si no, el id está tomado (R4)
export const repetida = (previa: Fila, u: Usuario): Resultado =>
  previa.cabo_id === u.id ? recibido(previa, { repetido: true }) : rechazo(previa.id, "YA_EXISTE", "Ya existe otro registro con ese identificador.");

export async function esVigente(c: pg.PoolClient, tabla: Tabla, id: string, version: unknown): Promise<boolean> {
  if (typeof version !== "string" || Number.isNaN(Date.parse(version))) return false;
  const r = await c.query<{ vigente: boolean }>(`SELECT ${VERSION_DE[tabla]} = $2::timestamptz AS vigente FROM srp.${tabla} WHERE id = $1`, [id, version]);
  return r.rows[0]?.vigente === true;
}

export const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
export const texto = (v: unknown): string => (typeof v === "string" ? v.trim() : "");
export const idDe = (v: unknown): string | null => (typeof v === "string" && UUID.test(v) ? v : null);
// AAAA-MM-DD que sea un día del calendario; una fecha imposible (mes 13, día 45) no lo es, y no truena
export const esFecha = (v: unknown): v is string => {
  if (typeof v !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(v)) return false;
  const d = new Date(v + "T00:00:00Z");
  return !Number.isNaN(d.getTime()) && d.toISOString().startsWith(v);
};
// El momento que dice el teléfono, o ahora si no trae uno que se entienda
export const instante = (v: unknown): string => (typeof v === "string" && !Number.isNaN(Date.parse(v)) ? new Date(v).toISOString() : new Date().toISOString());
const MESES = ["ENE", "FEB", "MAR", "ABR", "MAY", "JUN", "JUL", "AGO", "SEP", "OCT", "NOV", "DIC"];
// «05-OCT-2026», como lo escribe la aplicación
export const fechaCorta = (iso: string): string => {
  const [a, m, d] = iso.slice(0, 10).split("-");
  return d + "-" + MESES[Number(m) - 1] + "-" + a;
};
/* LA FECHA MÍNIMA. El programa empezó en octubre de 2024: ninguna jornada ni árbol es de antes. Detiene también el
   año tecleado con dos cifras, que el campo de fecha deja como 0026. La aplicación usa la misma
   (CONFIG.FECHA_MINIMA). Al editar, vale sólo si la fecha cambia. */
export const FECHA_MINIMA = "2024-10-01";
export const antesDelPrograma = (fecha: string): boolean => fecha < FECHA_MINIMA;
export const noAntes = (que: string): string => que + " no puede ser anterior al " + fechaCorta(FECHA_MINIMA) + ", cuando empezó el programa.";
// La fecha de un árbol dentro de su jornada: la suya, salvo que la jornada empiece después
export const fechaEnJornada = (fecha: string, j: Fila): string => (fecha && fecha >= String(j.fecha) ? fecha : String(j.fecha));

export const filaDe = async (c: pg.PoolClient, tabla: Tabla, id: string, bloqueo: "" | "FOR SHARE" | "FOR UPDATE" = ""): Promise<Fila | undefined> =>
  (await c.query<{ fila: Fila }>(`SELECT to_jsonb(x) - 'foto_base64' AS fila FROM srp.${tabla} x WHERE id = $1 ${bloqueo}`, [id])).rows[0]?.fila;

/* Una jornada que no está en el servidor: si estuvo y se eliminó, lo dice la bitácora. Lo que llegue para ella ya
   no tiene dónde quedar, y el teléfono lo pone en «Revisar» en lugar de esperarla. */
export const seElimino = async (c: pg.PoolClient, jornadaId: string): Promise<boolean> =>
  !!(await c.query("SELECT 1 FROM srp.bitacora WHERE entidad = 'jornada' AND entidad_id = $1 AND accion = 'ELIMINADO' LIMIT 1", [jornadaId])).rowCount;
export const jornadaEliminada = (id: string | null): Resultado => rechazo(id, "JORNADA_ELIMINADA", "Esa jornada se eliminó en el servidor.");

// De quién es un registro: la institución y la coordinación de cada persona que responde de él
export async function autoresDe(c: pg.PoolClient, x: Fila): Promise<Autores> {
  const ids = [x.cabo_id, x.relevo_id, ...((x.relevos as { cabo_id?: string }[] | undefined) ?? []).map((r) => r.cabo_id)].filter(Boolean);
  const { rows } = await c.query<{ id: string; organizacion_id: string; coordinadores_ids: string[] }>(
    "SELECT id, organizacion_id, coordinadores_ids FROM srp.usuarios WHERE id = ANY($1::uuid[])",
    [ids],
  );
  return new Map(rows.map((r) => [r.id, r]));
}
export const comoObjeto = (f: Fila): Objeto => f as Objeto;

/* ---------- El punto ---------- */

const ORIGENES = ["gps", "mapa", "manual", "ajustado"];

export interface Punto {
  lat: number;
  lng: number;
  punto_origen: string;
  gps_precision_m: number | null;
}

// El punto como lo manda el teléfono, con seis decimales; null si falta o no es un número
export function puntoDe(d: Record<string, unknown>): Punto | null {
  const { lat, lng } = d;
  if (typeof lat !== "number" || typeof lng !== "number" || !Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  const precision = typeof d.gps_precision_m === "number" && Number.isFinite(d.gps_precision_m) && d.gps_precision_m >= 0 ? Math.round(d.gps_precision_m) : null;
  return {
    lat: Number(lat.toFixed(6)),
    lng: Number(lng.toFixed(6)),
    punto_origen: ORIGENES.includes(String(d.punto_origen)) ? String(d.punto_origen) : "manual",
    gps_precision_m: precision,
  };
}

export interface Territorio {
  alcaldia_cve: string | null;
  alcaldia: string | null;
  colonia_cve: string | null;
  colonia: string | null;
  uga: string | null;
  uga_borde_m: number | null;
  capa_version: string | null;
  dentro: boolean;
}

/* Alcaldía, colonia y celda UGA del punto, sobre territorio, con las mismas reglas que la aplicación. Un punto
   unos metros fuera del límite toma la alcaldía más cercana: tantos metros como diga el parámetro. */
export const ubicar = async (c: pg.PoolClient, p: Punto): Promise<Territorio> =>
  (await c.query<Territorio>("SELECT * FROM srp.derivar($1, $2, $3)", [p.lat, p.lng, await valorParametro(c, "MAPA.MARGEN_AMBITO_M")])).rows[0];

// Hoy en la Ciudad de México, sea cual sea la zona del servidor
export const hoyEnLaCiudad = async (c: pg.PoolClient): Promise<string> =>
  (await c.query<{ hoy: string }>("SELECT (now() AT TIME ZONE 'America/Mexico_City')::date::text AS hoy")).rows[0].hoy;

/* LA PRIORIDAD DE LA COLONIA donde cae el punto, congelada con la versión de la capa al recibir el árbol o la
   jornada: si la capa cambia, lo ya recibido conserva la suya. Sólo se vuelve a calcular si se corrige el
   punto. Sin capa cargada, la versión lo dice. */
export async function congelarPrioridad(c: pg.PoolClient, tabla: Tabla, id: string, lat: unknown, lng: unknown): Promise<void> {
  const columna = tabla === "plantaciones" ? "plantacion_id" : "jornada_id";
  await c.query(
    `INSERT INTO srp.prioridades (${columna}, colonia_id, prioridad, capa_version)
     SELECT $1, p.colonia_id, p.prioridad, coalesce((SELECT version FROM srp.capas WHERE nombre = 'prioritarias'), 'sin capa')
       FROM (SELECT 1) uno LEFT JOIN srp.prioridad($2, $3) p ON true
     ON CONFLICT (${columna}) DO UPDATE SET colonia_id = EXCLUDED.colonia_id, prioridad = EXCLUDED.prioridad,
       capa_version = EXCLUDED.capa_version, congelada_en = now()`,
    [id, lat, lng],
  );
}

/* ---------- Cómo se nombra un árbol en la bitácora ---------- */

export const MOTIVOS_SUSTITUCION: Record<string, string> = { VANDALISMO: "Vandalismo", IMPACTO_VEHICULAR: "Impacto vehicular", ROBO: "Robo", MUERTE: "Muerte", OTRO: "Otro" };
// «Robo», «Otro: lo atropelló una grúa»
export function motivoSustitucion(a: Fila): string {
  const m = MOTIVOS_SUSTITUCION[String(a.motivo_sustitucion)] ?? String(a.motivo_sustitucion ?? "");
  return a.motivo_sustitucion === "OTRO" && a.motivo_sustitucion_otro ? m + ": " + String(a.motivo_sustitucion_otro) : m;
}
// El nombre común de su especie, o lo escrito en «Otra especie»
export async function especieComun(c: pg.PoolClient, a: Fila): Promise<string> {
  if (!a.especie_id) return String(a.especie_otra ?? "");
  return (await c.query<{ nombre: string }>("SELECT nombre FROM srp.especies WHERE id = $1", [a.especie_id])).rows[0]?.nombre ?? "";
}
export const textoFolio = (a: Fila): string => (typeof a.folio === "string" && /^[A-Z]{3}-\d{3}-\d{5}$/.test(a.folio) ? a.folio : "PROVISIONAL");

/* ---------- El reporte de la jornada ---------- */

/* El reporte vale para lo que la jornada tenía al generarlo: si se elimina, restaura, edita, mueve o
   sustituye uno de sus árboles, deja de estar vigente, en la misma transacción. Devuelve la jornada si
   cambió. */
export async function caducarReporte(c: pg.PoolClient, u: Usuario, jornadaId: unknown, motivo: string): Promise<{ tabla: Tabla; fila: Fila }[]> {
  if (typeof jornadaId !== "string") return [];
  const fila = (await c.query<{ fila: Fila }>(
    `UPDATE srp.jornadas SET reporte_en = NULL, editado_por_id = $2, fecha_ultima_edicion = ${AHORA}
      WHERE id = $1 AND reporte_en IS NOT NULL RETURNING to_jsonb(jornadas) AS fila`,
    [jornadaId, u.id],
  )).rows[0]?.fila;
  if (!fila) return [];
  await anotarCambio(c, u, "EDITADO", "jornada", jornadaId, "Su reporte deja de estar vigente: " + motivo);
  return [{ tabla: "jornadas", fila }];
}

/* ---------- El folio ---------- */

/* EL FOLIO, al recibir el árbol y en su misma transacción. Hace falta su alcaldía y las tres capas; la celda
   es la UGA del punto, o EXT-000 si quedó fuera de la malla. Devuelve el folio, o el aviso de por qué el
   árbol se queda PROVISIONAL. */
export async function asignarFolio(c: pg.PoolClient, u: Usuario, a: Fila): Promise<{ folio: string } | { aviso: string }> {
  const version = String(a.capa_version ?? "");
  if (!a.alcaldia || !["alcaldias=", "uga=", "colonias="].every((k) => version.includes(k))) {
    return { aviso: "El territorio del punto quedó pendiente: el árbol queda PROVISIONAL hasta que se pueda ubicar." };
  }
  const celda = /^[A-Z]{3}-\d{3}$/.test(String(a.uga ?? "")) ? String(a.uga) : "EXT-000";
  // Se lee y se incrementa en un solo paso; en el tope, la celda no da más
  const n = (await c.query<{ ultimo: number }>(
    `INSERT INTO srp.folio_secuencias (celda, ultimo) VALUES ($1, 1)
     ON CONFLICT (celda) DO UPDATE SET ultimo = folio_secuencias.ultimo + 1 WHERE folio_secuencias.ultimo < 99999
     RETURNING ultimo`,
    [celda],
  )).rows[0]?.ultimo;
  if (!n) return { aviso: "La celda " + celda + " llegó al tope de 99,999 folios: el árbol queda PROVISIONAL hasta que el SIA decida cómo seguir." };
  const folio = celda + "-" + String(n).padStart(5, "0");
  await c.query("UPDATE srp.plantaciones SET folio = $2 WHERE id = $1", [a.id, folio]);
  await c.query(
    "INSERT INTO srp.folios (plantacion_id, folio, folio_uga, folio_capa_version, folio_lat, folio_lng) VALUES ($1, $2, $3, $4, $5, $6)",
    [a.id, folio, celda, version, a.lat, a.lng],
  );
  await anotarCambio(c, u, "FOLIO_ASIGNADO", "plantacion", a.id, "Folio " + folio);
  return { folio };
}
