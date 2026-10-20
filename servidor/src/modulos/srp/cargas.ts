import { Router, type Request, type RequestHandler, type Response } from "express";
import type pg from "pg";
import { sesionDe } from "./acceso";
import { anotarCambio } from "./bitacora";
import { responder } from "./errores";
import { valorParametro } from "./parametros";
import { exigirPermiso } from "./permisos";
import { AHORA, antesDelPrograma, asignarFolio, congelarPrioridad, esFecha, hoyEnLaCiudad, idDe, noAntes, type Fila, type Territorio } from "./recepcion-apoyo";
import { PROGRAMA_SOLICITUD } from "./recepcion-jornadas";
import type { Usuario } from "./sesiones";
import { enTransaccion } from "./transaccion";

/* LA CARGA MASIVA DEL HISTÓRICO: los árboles plantados antes de usar el sistema, que la Administración global
   sube desde un archivo, con las mismas reglas que la aplicación (js/carga.js). El teléfono ya revisó el archivo,
   agrupó los árboles en jornadas y numeró cada renglón; el servidor vuelve a revisar todo.

   PUT    /cargas/:id/tandas/:n   una tanda del lote: { archivo, jornadas, arboles }
   POST   /cargas/:id/completa    { arboles }: llegó entero; desde ahora se ve
   GET    /cargas                 los lotes, lo más reciente primero
   DELETE /cargas/:id             deshace un lote: lo oculta y elimina sus árboles

   · Una tanda trae hasta 400 árboles y las jornadas que estrena. Va en su propia transacción: si un árbol no
     pasa, no guarda nada de la tanda y dice qué renglones y por qué. Lo que guarda lleva su folio, su
     territorio y su prioridad, como cualquier árbol. Reenviar una tanda que ya llegó no la repite.
   · Mientras el lote sube no se ve nada de él (srp.de_carga_oculta). Al completarlo se ve entero, cada jornada
     se ubica en el centro de sus árboles y la bitácora anota el lote.
   · Deshacer un lote lo oculta y elimina sus árboles; no borra nada, porque un árbol con folio no se borra y su
     folio no se vuelve a usar. El archivo se puede volver a cargar.
   · Los árboles y las jornadas quedan a nombre de quien carga, en jornadas cerradas de la institución del
     archivo. La carga histórica no pasa por la bandeja de posibles duplicados.
   · UNA CARGA A LA VEZ: mientras un lote sube, otro no empieza; el que llega se rechaza y se le dice que espere.
     Un lote que dejó de subir hace más de MINUTOS_SIN_SUBIR ya no estorba: se quedó a medias y se quita en
     «Cargas hechas». Y al completar un lote se revisa otra vez que otro, completado mientras éste subía, no
     haya traído los mismos árboles: dos cargas del mismo archivo no duplican el histórico. */

const MINUTOS_SIN_SUBIR = 15;

// Así una tanda cabe en los 100 KB de cada pedido
export const TANDA_MAXIMA = 400;

interface ArbolDeCarga {
  id: string;
  jornada_id: string;
  renglon: number;
  lat: number;
  lng: number;
  especie_id: string;
  fecha_plantacion: string;
  revisado: boolean;
}
interface JornadaDeCarga {
  id: string;
  organizacion_id: string;
  programa_id: string;
  fecha: string;
}
interface Lote {
  id: string;
  estado: string;
  archivo: string;
  arboles: number;
  creada_por_id: string;
}

// Un renglón con problema, como lo dice la revisión de la aplicación: «Renglón 12 · Latitud y longitud»
type Problema = [string, string];
const problema = (renglon: number, columna: string, texto: string): Problema => ["Renglón " + renglon + " · " + columna, texto];
const MAXIMO_PROBLEMAS = 50;

const numero = (v: unknown): number => (typeof v === "number" && Number.isFinite(v) ? v : NaN);
const seis = (v: number): string => v.toFixed(6);

// Lo que llega, recortado; null si la forma no es la de una tanda
function leerTanda(b: Record<string, unknown>): { archivo: string; jornadas: JornadaDeCarga[]; arboles: ArbolDeCarga[] } | string {
  const archivo = typeof b.archivo === "string" ? b.archivo.trim().slice(0, 200) : "";
  if (!archivo) return "Falta el nombre del archivo.";
  if (!Array.isArray(b.arboles) || !b.arboles.length) return "La tanda no trae árboles.";
  if (b.arboles.length > TANDA_MAXIMA) return "Una tanda lleva hasta " + TANDA_MAXIMA + " árboles.";
  if (!Array.isArray(b.jornadas) || b.jornadas.length > TANDA_MAXIMA) return "Las jornadas de la tanda no se entienden.";
  const jornadas = b.jornadas.map((j: Record<string, unknown>) => ({ id: idDe(j?.id) ?? "", organizacion_id: String(j?.organizacion_id ?? ""), programa_id: String(j?.programa_id ?? ""), fecha: String(j?.fecha ?? "") }));
  const arboles = b.arboles.map((a: Record<string, unknown>) => ({
    id: idDe(a?.id) ?? "", jornada_id: idDe(a?.jornada_id) ?? "", renglon: Number.isInteger(a?.renglon) ? (a.renglon as number) : 0,
    lat: numero(a?.lat), lng: numero(a?.lng), especie_id: String(a?.especie_id ?? ""), fecha_plantacion: String(a?.fecha_plantacion ?? ""), revisado: a?.revisado === true,
  }));
  if (jornadas.some((j) => !j.id) || arboles.some((a) => !a.id || !a.jornada_id || a.renglon < 1)) return "Cada árbol y cada jornada llevan su identificador, y cada árbol su renglón.";
  return { archivo, jornadas, arboles };
}

// La bitácora del lote: «Archivo «x.xlsx»: 1,200 árboles en 14 jornadas de 3 instituciones»
const plural = (n: number, uno: string, varios: string) => n.toLocaleString("es-MX") + " " + (n === 1 ? uno : varios);

export function rutasCargas(pool: pg.Pool, sesion: RequestHandler): Router {
  const r = Router();
  const cargar = exigirPermiso("carga.masiva");

  // En una transacción con las fechas en UTC, que es como salen en las consultas
  const enUtc = <T>(trabajo: (c: pg.PoolClient) => Promise<T>) =>
    enTransaccion(pool, async (c) => {
      await c.query("SET LOCAL TIME ZONE 'UTC'");
      return trabajo(c);
    });

  const loteDe = async (c: pg.PoolClient, id: string): Promise<Lote | undefined> =>
    (await c.query<Lote>("SELECT id, estado, archivo, arboles, creada_por_id FROM srp.cargas WHERE id = $1 FOR UPDATE", [id])).rows[0];

  r.put("/cargas/:id/tandas/:n", sesion, cargar, async (req: Request, res: Response) => {
    const lote = idDe(req.params.id);
    if (!lote) return responder(res, 404, "NO_EXISTE", "Ese lote no existe.");
    const t = leerTanda(req.body ?? {});
    if (typeof t === "string") return responder(res, 400, "DATOS_INVALIDOS", t);
    const u = sesionDe(res).usuario;
    const resultado = await enUtc(async (c) => {
      const otra = await otraSubiendo(c, lote);
      if (otra) return { codigo: "OTRA_CARGA", mensaje: "Hay otra carga subiendo: la de " + otra.por + ", del archivo «" + otra.archivo + "». Espere a que termine e intente de nuevo." };
      await c.query("INSERT INTO srp.cargas (id, archivo, creada_por_id) VALUES ($1, $2, $3) ON CONFLICT (id) DO NOTHING", [lote, t.archivo, u.id]);
      const k = (await loteDe(c, lote)) as Lote;
      if (k.creada_por_id !== u.id) return { codigo: "OTRA_PERSONA", mensaje: "Ese lote lo está subiendo otra persona." };
      if (k.estado !== "subiendo") return { codigo: "YA_NO_SUBE", mensaje: k.estado === "completa" ? "Ese lote ya está completo." : "Ese lote se deshizo." };
      // Reenviar una tanda que ya llegó no la repite; una que llegó a medias no puede ser
      const ya = (await c.query<{ n: number }>("SELECT count(*)::int AS n FROM srp.plantaciones WHERE id = ANY($1::uuid[])", [t.arboles.map((a) => a.id)])).rows[0].n;
      if (ya === t.arboles.length) return { repetida: true, arboles: 0 };
      if (ya) return { codigo: "TANDA_A_MEDIAS", mensaje: "Algunos árboles de esa tanda ya están en el sistema y otros no." };
      const guardada = await guardarTanda(c, u, lote, t);
      // Un lote cuya primera tanda no pasó no se queda: no trae nada, y estorbaría a la siguiente carga. Se deshace la transacción
      if ("codigo" in guardada && guardada.codigo && !k.arboles) throw new SinLote(guardada as SinLote["resultado"]);
      return guardada;
    }).catch((e: unknown) => {
      if (e instanceof SinLote) return e.resultado;
      throw e;
    });
    if ("codigo" in resultado) return res.status(resultado.codigo === "DATOS_INVALIDOS" ? 400 : 409).json(resultado);
    res.json(resultado);
  });

  r.post("/cargas/:id/completa", sesion, cargar, async (req: Request, res: Response) => {
    const lote = idDe(req.params.id);
    const esperados = req.body?.arboles;
    if (!lote) return responder(res, 404, "NO_EXISTE", "Ese lote no existe.");
    if (!Number.isInteger(esperados) || esperados < 1) return responder(res, 400, "DATOS_INVALIDOS", "Diga cuántos árboles trae el lote.");
    const u = sesionDe(res).usuario;
    const resultado = await enUtc(async (c) => {
      const k = await loteDe(c, lote);
      if (!k) return { codigo: "NO_EXISTE", mensaje: "Ese lote no existe." };
      if (k.creada_por_id !== u.id) return { codigo: "OTRA_PERSONA", mensaje: "Ese lote lo está subiendo otra persona." };
      if (k.estado === "completa") return { repetida: true, ...(await resumen(c, lote)) };
      if (k.estado !== "subiendo") return { codigo: "YA_NO_SUBE", mensaje: "Ese lote se deshizo." };
      if (k.arboles !== esperados) return { codigo: "FALTAN_TANDAS", mensaje: "Faltan tandas: llegaron " + plural(k.arboles, "árbol", "árboles") + " de " + esperados.toLocaleString("es-MX") + "." };
      await c.query("SELECT pg_advisory_xact_lock(hashtextextended('srp.cargas', 0))");
      const repetidos = await repetidosDeOtraCarga(c, k.id);
      if (repetidos) return { codigo: "YA_CARGADOS", mensaje: "Mientras se subía, otra carga trajo " + plural(repetidos, "árbol igual", "árboles iguales") + " a los de este archivo." };
      return completar(c, u, k);
    });
    if ("codigo" in resultado) return res.status(resultado.codigo === "NO_EXISTE" ? 404 : 409).json(resultado);
    res.json(resultado);
  });

  r.get("/cargas", sesion, cargar, async (req: Request, res: Response) => {
    const filas = await enUtc(async (c) => (await c.query<{ fila: Fila }>(
      `SELECT jsonb_build_object('id', k.id, 'estado', k.estado, 'archivo', k.archivo, 'arboles', k.arboles, 'jornadas', k.jornadas,
          'instituciones', k.instituciones, 'creada_en', to_char(k.creada_en, 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'), 'creada_por', a.nombre_completo,
          'deshecha_en', to_char(k.deshecha_en, 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'), 'deshecha_por', d.nombre_completo) AS fila
         FROM srp.cargas k JOIN srp.usuarios a ON a.id = k.creada_por_id LEFT JOIN srp.usuarios d ON d.id = k.deshecha_por_id
        ORDER BY k.creada_en DESC`,
    )).rows.map((x) => x.fila));
    res.json({ filas });
  });

  r.delete("/cargas/:id", sesion, cargar, async (req: Request, res: Response) => {
    const lote = idDe(req.params.id);
    if (!lote) return responder(res, 404, "NO_EXISTE", "Ese lote no existe.");
    const u = sesionDe(res).usuario;
    const resultado = await enUtc(async (c) => {
      const k = await loteDe(c, lote);
      if (!k) return { codigo: "NO_EXISTE", mensaje: "Ese lote no existe." };
      if (k.estado === "deshecha") return { codigo: "YA_DESHECHA", mensaje: "Ese lote ya se había deshecho." };
      const arboles = (await c.query(
        `UPDATE srp.plantaciones SET estatus = 'eliminado', editado_por_id = $2, fecha_ultima_edicion = ${AHORA}
          WHERE jornada_id IN (SELECT id FROM srp.jornadas WHERE carga_id = $1) AND estatus <> 'eliminado'`,
        [lote, u.id],
      )).rowCount ?? 0;
      const jornadas = (await c.query<{ n: number }>("SELECT count(*)::int AS n FROM srp.jornadas WHERE carga_id = $1", [lote])).rows[0].n;
      await c.query("UPDATE srp.cargas SET estado = 'deshecha', deshecha_por_id = $2, deshecha_en = now() WHERE id = $1", [lote, u.id]);
      const detalle = (k.estado === "subiendo" ? "Carga sin terminar quitada" : "Carga deshecha") + " del archivo «" + k.archivo + "»: " +
        plural(arboles, "árbol", "árboles") + " y " + plural(jornadas, "jornada", "jornadas") + " quitados";
      await anotarCambio(c, u, "ELIMINADO", "carga", lote, detalle);
      return { arboles, jornadas, detalle };
    });
    if ("codigo" in resultado) return res.status(resultado.codigo === "NO_EXISTE" ? 404 : 409).json(resultado);
    res.json(resultado);
  });

  return r;
}

/* ---------- Una carga a la vez ---------- */

// La primera tanda de un lote no pasó: su transacción se deshace y la respuesta es la de la tanda
class SinLote {
  constructor(readonly resultado: { codigo: string; mensaje: string; errores?: Problema[] }) {}
}

// Otro lote que está subiendo, con quién lo sube; null si no hay. Con candado: dos que empiezan juntos no pasan los dos
async function otraSubiendo(c: pg.PoolClient, lote: string): Promise<{ archivo: string; por: string } | null> {
  await c.query("SELECT pg_advisory_xact_lock(hashtextextended('srp.cargas', 0))");
  return (await c.query<{ archivo: string; por: string }>(
    `SELECT k.archivo, u.nombre_completo AS por FROM srp.cargas k JOIN srp.usuarios u ON u.id = k.creada_por_id
      WHERE k.estado = 'subiendo' AND k.id <> $1
        AND greatest(k.creada_en, (SELECT max(x.fecha_registro) FROM srp.plantaciones x JOIN srp.jornadas j ON j.id = x.jornada_id WHERE j.carga_id = k.id))
            > now() - make_interval(mins => $2)
      ORDER BY k.creada_en LIMIT 1`,
    [lote, MINUTOS_SIN_SUBIR],
  )).rows[0] ?? null;
}

// Cuántos árboles del lote son iguales —punto, especie, fecha e institución— a los de otro lote completado después de que éste empezó
async function repetidosDeOtraCarga(c: pg.PoolClient, lote: string): Promise<number> {
  return (await c.query<{ n: number }>(
    `SELECT count(DISTINCT x.id)::int AS n
       FROM srp.cargas k JOIN srp.jornadas j ON j.carga_id = k.id JOIN srp.plantaciones x ON x.jornada_id = j.id
       JOIN srp.cargas o ON o.estado = 'completa' AND o.id <> k.id AND o.completa_en > k.creada_en
       JOIN srp.jornadas oj ON oj.carga_id = o.id AND oj.organizacion_id = j.organizacion_id
       JOIN srp.plantaciones y ON y.jornada_id = oj.id AND y.estatus <> 'eliminado' AND y.especie_id = x.especie_id
        AND y.fecha_plantacion = x.fecha_plantacion AND round(y.lat, 6) = round(x.lat, 6) AND round(y.lng, 6) = round(x.lng, 6)
      WHERE k.id = $1`,
    [lote],
  )).rows[0].n;
}

/* ---------- Una tanda ---------- */

async function guardarTanda(c: pg.PoolClient, u: Usuario, lote: string, t: { archivo: string; jornadas: JornadaDeCarga[]; arboles: ArbolDeCarga[] }) {
  const problemas: Problema[] = [];
  const hoy = await hoyEnLaCiudad(c);
  // Las jornadas que estrena la tanda, y las que ya trajo una tanda anterior del mismo lote
  const nuevas = new Map(t.jornadas.map((j) => [j.id, j]));
  const previas = new Map((await c.query<JornadaDeCarga & { carga_id: string | null }>(
    "SELECT id, organizacion_id, programa_id, fecha::text AS fecha, carga_id FROM srp.jornadas WHERE id = ANY($1::uuid[])",
    [[...new Set(t.arboles.map((a) => a.jornada_id))]],
  )).rows.map((j) => [j.id, j]));
  for (const [id, j] of previas) if (j.carga_id !== lote) return { codigo: "DATOS_INVALIDOS", mensaje: "La jornada " + id + " no es de este lote." };
  for (const j of nuevas.values()) {
    if (previas.has(j.id)) nuevas.delete(j.id);
    else if (!esFecha(j.fecha) || j.fecha > hoy || antesDelPrograma(j.fecha)) return { codigo: "DATOS_INVALIDOS", mensaje: "Una jornada de la tanda no tiene una fecha válida." };
  }
  // Catálogos: la institución y el programa de cada jornada, y la especie de cada árbol
  const existe = async (tabla: string, ids: string[]) => new Set((await c.query<{ id: string }>(`SELECT id FROM srp.${tabla} WHERE id = ANY($1::text[])`, [ids])).rows.map((x) => x.id));
  const orgs = await existe("instituciones", [...nuevas.values()].map((j) => j.organizacion_id));
  const programas = await existe("programas", [...nuevas.values()].map((j) => j.programa_id));
  const especies = await existe("especies", t.arboles.map((a) => a.especie_id));
  const jornadaDe = (id: string) => nuevas.get(id) ?? previas.get(id);

  // El territorio de todos los puntos, en una sola consulta
  const margen = await valorParametro(c, "MAPA.MARGEN_AMBITO_M");
  const conPunto = t.arboles.filter((a) => Number.isFinite(a.lat) && Number.isFinite(a.lng));
  const territorios = new Map<string, Territorio>();
  if (conPunto.length) {
    const filas = (await c.query<Territorio & { i: string }>(
      `SELECT p.i, d.* FROM unnest($1::numeric[], $2::numeric[]) WITH ORDINALITY AS p(lat, lng, i) CROSS JOIN LATERAL srp.derivar(p.lat, p.lng, $3) d`,
      [conPunto.map((a) => seis(a.lat)), conPunto.map((a) => seis(a.lng)), margen],
    )).rows;
    filas.forEach((x) => territorios.set(conPunto[Number(x.i) - 1].id, x));
  }

  /* Lo que ya está en el sistema, por huella —punto con seis decimales, especie, fecha e institución—, sin lo de
     este lote ni lo eliminado ni lo oculto: cada árbol guardado empata con un solo renglón, como en la aplicación */
  const huella = (a: ArbolDeCarga) => [seis(a.lat), seis(a.lng), a.especie_id, a.fecha_plantacion, jornadaDe(a.jornada_id)?.organizacion_id ?? ""].join("|");
  const clave = (a: { lat: number; lng: number; especie_id: string; fecha_plantacion: string }) => [seis(a.lat), seis(a.lng), a.especie_id, a.fecha_plantacion].join("|");
  const validos = t.arboles.filter((a) => territorios.get(a.id)?.dentro);
  const existentes = new Map<string, number>(), enElLote = new Map<string, number>(), clavesDelLote = new Set<string>();
  if (validos.length) {
    (await c.query<{ h: string; n: number }>(
      `SELECT concat_ws('|', to_char(x.lat, 'FM990.000000'), to_char(x.lng, 'FM990.000000'), x.especie_id, x.fecha_plantacion::text, j.organizacion_id) AS h, count(*)::int AS n
         FROM srp.plantaciones x JOIN srp.jornadas j ON j.id = x.jornada_id
        WHERE x.estatus <> 'eliminado' AND x.especie_id IS NOT NULL AND j.carga_id IS DISTINCT FROM $1 AND NOT srp.de_carga_oculta(j.carga_id)
          AND (round(x.lat, 6), round(x.lng, 6)) IN (SELECT * FROM unnest($2::numeric[], $3::numeric[]))
        GROUP BY 1`,
      [lote, validos.map((a) => seis(a.lat)), validos.map((a) => seis(a.lng))],
    )).rows.forEach((x) => existentes.set(x.h, x.n));
    (await c.query<{ h: string; k: string }>(
      `SELECT concat_ws('|', to_char(x.lat, 'FM990.000000'), to_char(x.lng, 'FM990.000000'), x.especie_id, x.fecha_plantacion::text, j.organizacion_id) AS h,
              concat_ws('|', to_char(x.lat, 'FM990.000000'), to_char(x.lng, 'FM990.000000'), x.especie_id, x.fecha_plantacion::text) AS k
         FROM srp.plantaciones x JOIN srp.jornadas j ON j.id = x.jornada_id WHERE j.carga_id = $1`,
      [lote],
    )).rows.forEach((x) => { enElLote.set(x.h, (enElLote.get(x.h) ?? 0) + 1); clavesDelLote.add(x.k); });
  }

  // Cada renglón, con las reglas de la revisión de la aplicación
  const vistas = new Set(clavesDelLote);
  for (const a of t.arboles) {
    const j = jornadaDe(a.jornada_id), ter = territorios.get(a.id);
    const antes = problemas.length;
    if (!j) problemas.push(problema(a.renglon, "Renglón", "Su jornada no viene en la tanda."));
    else if (nuevas.has(j.id)) {
      if (!orgs.has(j.organizacion_id)) problemas.push(problema(a.renglon, "Institución", "La institución no está en Catálogos › Instituciones."));
      if (!programas.has(j.programa_id)) problemas.push(problema(a.renglon, "Programa", "El programa no está en el catálogo de programas."));
      else if (j.programa_id === PROGRAMA_SOLICITUD) problemas.push(problema(a.renglon, "Programa", "Una solicitud especial no se carga por archivo."));
    }
    if (!ter) problemas.push(problema(a.renglon, "Latitud y longitud", "Escriba latitud y longitud en grados decimales, con punto."));
    else if (!ter.dentro) problemas.push(problema(a.renglon, "Latitud y longitud", "El punto (" + a.lat + ", " + a.lng + ") queda fuera de la Ciudad de México."));
    if (!especies.has(a.especie_id)) problemas.push(problema(a.renglon, "Nombre científico", "La especie no está en el catálogo de especies."));
    if (!esFecha(a.fecha_plantacion)) problemas.push(problema(a.renglon, "Fecha de plantación", "Fecha no válida."));
    else if (a.fecha_plantacion > hoy) problemas.push(problema(a.renglon, "Fecha de plantación", "La fecha es posterior a hoy."));
    else if (antesDelPrograma(a.fecha_plantacion)) problemas.push(problema(a.renglon, "Fecha de plantación", noAntes("La fecha")));
    else if (j && a.fecha_plantacion !== j.fecha) problemas.push(problema(a.renglon, "Fecha de plantación", "No es la fecha de su jornada."));
    if (problemas.length === antes) {
      const h = huella(a), usados = enElLote.get(h) ?? 0;
      if (usados < (existentes.get(h) ?? 0)) problemas.push(problema(a.renglon, "Renglón", "Ya está en el sistema: un árbol con el mismo punto, especie, fecha e institución."));
      else if (vistas.has(clave(a))) problemas.push(problema(a.renglon, "Renglón", "Repite otro renglón del archivo: mismo punto, especie y fecha."));
      enElLote.set(h, usados + 1);
      vistas.add(clave(a));
    }
    if (problemas.length >= MAXIMO_PROBLEMAS) break;
  }
  if (problemas.length) return { codigo: "DATOS_INVALIDOS", mensaje: "El servidor no aceptó la tanda: revise el archivo otra vez.", errores: problemas };

  /* Las jornadas nuevas, cerradas y a nombre de quien carga, con lo previsto que trae la tanda; al completar el
     lote se ubican en el centro de sus árboles y lo previsto es todo lo cargado */
  for (const j of nuevas.values()) {
    const a0 = t.arboles.find((a) => a.jornada_id === j.id) as ArbolDeCarga, ter = territorios.get(a0.id) as Territorio;
    await c.query(
      `INSERT INTO srp.jornadas (id, nombre, ubicacion, programa_id, lat, lng, punto_origen, gps_precision_m, alcaldia_cve, alcaldia, colonia_cve, colonia,
          fecha, comentarios, cabo_id, organizacion_id, estatus, fecha_inicio, fecha_cierre, encargado_id, relevo_id, relevos,
          solicitante_id, solicitante_otro, solicitud_descripcion, editado_por_id, fecha_ultima_edicion, arboles_previstos, puntos_revisados,
          reporte_en, carga_id, personal, apoyo, observaciones, chofer, vehiculo_modelo, vehiculo_placa, vehiculo_tipo, vehiculo_id, hora)
       VALUES ($1, $2, '', $3, $4, $5, 'manual', NULL, $6, $7, $8, $9, $10, $11, $12, $13, 'cerrada', ${AHORA}, ${AHORA}, $12, NULL, '[]',
          NULL, '', '', NULL, NULL, $15, '{}', NULL, $14, '', '', '', '', '', '', '', NULL, '')`,
      [j.id, "Carga histórica · " + (ter.alcaldia ?? ""), j.programa_id, seis(a0.lat), seis(a0.lng), ter.alcaldia_cve, ter.alcaldia, ter.colonia_cve, ter.colonia,
        j.fecha, "Carga masiva del archivo «" + t.archivo + "».", u.id, j.organizacion_id, lote, t.arboles.filter((a) => a.jornada_id === j.id).length],
    );
    await anotarCambio(c, u, "CREADO", "jornada", j.id, "Carga masiva del archivo «" + t.archivo + "»");
  }

  // Cada árbol con su territorio, su prioridad, su folio y su bitácora, como al recibirlo de un teléfono
  let folios = 0;
  for (const a of t.arboles) {
    const j = jornadaDe(a.jornada_id) as JornadaDeCarga, ter = territorios.get(a.id) as Territorio;
    const fila = (await c.query<{ fila: Fila }>(
      `INSERT INTO srp.plantaciones (id, estatus, cabo_id, lat, lng, punto_origen, gps_precision_m, folio, especie_id, especie_otra,
          alcaldia_cve, alcaldia, colonia_cve, colonia, uga, uga_borde_m, capa_version, programa_id, fecha_plantacion, jornada_id,
          sustituye_id, motivo_sustitucion, comentarios, sustituido_por_id, motivo_sustitucion_otro, foto_base64, foto_id,
          fecha_registro, fecha_ultima_edicion, editado_por_id)
       VALUES ($1, 'activo', $2, $3, $4, 'manual', NULL, NULL, $5, '', $6, $7, $8, $9, $10, $11, $12, $13, $14, $15,
          NULL, NULL, '', NULL, '', NULL, NULL, ${AHORA}, NULL, NULL)
       RETURNING to_jsonb(plantaciones) - 'foto_base64' AS fila`,
      [a.id, u.id, seis(a.lat), seis(a.lng), a.especie_id, ter.alcaldia_cve, ter.alcaldia, ter.colonia_cve, ter.colonia, ter.uga, ter.uga_borde_m, ter.capa_version,
        j.programa_id, a.fecha_plantacion, a.jornada_id],
    )).rows[0].fila;
    await congelarPrioridad(c, "plantaciones", a.id, fila.lat, fila.lng);
    await anotarCambio(c, u, "CREADO", "plantacion", a.id, "Carga masiva");
    if ("folio" in (await asignarFolio(c, u, fila))) folios++;
  }
  // Los avisos de una carga histórica no los revisa nadie en campo: quedan como revisados
  const revisados = t.arboles.filter((a) => a.revisado);
  if (revisados.length) {
    await c.query(
      `UPDATE srp.jornadas j SET puntos_revisados = j.puntos_revisados || r.ids
         FROM (SELECT jornada_id, array_agg(id) AS ids FROM unnest($1::uuid[], $2::uuid[]) AS x(id, jornada_id) GROUP BY jornada_id) r
        WHERE j.id = r.jornada_id`,
      [revisados.map((a) => a.id), revisados.map((a) => a.jornada_id)],
    );
  }
  await c.query("UPDATE srp.cargas SET arboles = arboles + $2 WHERE id = $1", [lote, t.arboles.length]);
  return { arboles: t.arboles.length, folios };
}

/* ---------- Completar el lote ---------- */

async function resumen(c: pg.PoolClient, lote: string) {
  return (await c.query<{ arboles: number; jornadas: number; instituciones: number }>("SELECT arboles, jornadas, instituciones FROM srp.cargas WHERE id = $1", [lote])).rows[0];
}

async function completar(c: pg.PoolClient, u: Usuario, k: Lote) {
  const margen = await valorParametro(c, "MAPA.MARGEN_AMBITO_M");
  /* Cada jornada se ubica en el centro de sus árboles; si ese centro cae en otra alcaldía, se queda con la del
     primer árbol, como en la aplicación. Lo prevista es lo cargado */
  const jornadas = (await c.query<{ id: string; lat: string; lng: string; n: number; alcaldia_cve: string | null }>(
    `SELECT j.id, round(avg(x.lat), 6)::text AS lat, round(avg(x.lng), 6)::text AS lng, count(*)::int AS n, j.alcaldia_cve
       FROM srp.jornadas j JOIN srp.plantaciones x ON x.jornada_id = j.id WHERE j.carga_id = $1 GROUP BY j.id`,
    [k.id],
  )).rows;
  for (const j of jornadas) {
    const t = (await c.query<Territorio>("SELECT * FROM srp.derivar($1, $2, $3)", [j.lat, j.lng, margen])).rows[0];
    const igual = t.alcaldia_cve === j.alcaldia_cve;
    await c.query(
      `UPDATE srp.jornadas SET lat = $2, lng = $3, arboles_previstos = $4,
          alcaldia_cve = CASE WHEN $5 THEN $6 ELSE alcaldia_cve END, alcaldia = CASE WHEN $5 THEN $7 ELSE alcaldia END,
          colonia_cve = CASE WHEN $5 THEN $8 ELSE colonia_cve END, colonia = CASE WHEN $5 THEN $9 ELSE colonia END
        WHERE id = $1`,
      [j.id, j.lat, j.lng, j.n, igual, t.alcaldia_cve, t.alcaldia, t.colonia_cve, t.colonia],
    );
    await congelarPrioridad(c, "jornadas", j.id, j.lat, j.lng);
  }
  const instituciones = (await c.query<{ n: number }>("SELECT count(DISTINCT organizacion_id)::int AS n FROM srp.jornadas WHERE carga_id = $1", [k.id])).rows[0].n;
  await c.query("UPDATE srp.cargas SET estado = 'completa', jornadas = $2, instituciones = $3, completa_en = now() WHERE id = $1", [k.id, jornadas.length, instituciones]);
  await anotarCambio(c, u, "CREADO", "carga", k.id, "Archivo «" + k.archivo + "»: " + plural(k.arboles, "árbol", "árboles") + " en " +
    plural(jornadas.length, "jornada", "jornadas") + " de " + plural(instituciones, "institución", "instituciones"));
  return { arboles: k.arboles, jornadas: jornadas.length, instituciones };
}
