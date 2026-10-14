import { Router, type Request, type RequestHandler, type Response } from "express";
import type pg from "pg";
import { sesionDe } from "./acceso";
import { anotarCambio } from "./bitacora";
import { responder, traducir } from "./errores";
import { ACCIONES, puede, SEDEMA, type Accion, type Objeto } from "./permisos";
import type { Usuario } from "./sesiones";
import { enTransaccion } from "./transaccion";

/* RECEPCIÓN: lo que envían los teléfonos.

   POST /envios   { operaciones: [{ tipo, datos }] }, hasta 100 por envío, en el orden en que se hicieron

   Cada operación lleva el nombre de la acción de permisos.ts que la autoriza:
     jornada.crear     una jornada nueva
     registro.crear    un árbol nuevo, en una jornada que ya está en el servidor

   Cada operación va en su propia transacción: si una se rechaza, las demás siguen. La respuesta dice, para
   cada una y en el mismo orden, si quedó recibida —con el renglón como lo guardó el servidor, que es el que
   vale desde ahí— o rechazada y por qué. Reenviar una operación ya recibida no duplica nada: el id del
   registro es la clave (R4), y la respuesta es la misma.

   El servidor no se queda con lo que calcula el teléfono: vuelve a ubicar el punto (alcaldía, colonia,
   celda UGA y versión de capas), pone el autor, la institución, el estado y el programa del árbol, que es
   el de su jornada, y asigna el folio al recibir el árbol, en la misma transacción. Las reglas y los
   mensajes son los de los formularios de la aplicación. */

export const MAXIMO_OPERACIONES = 100;
export const PROGRAMA_SOLICITUD = "p-solicitud";
// Un punto unos metros fuera del límite toma la alcaldía más cercana, como en la aplicación
const MARGEN_AMBITO_M = 100;
const ORIGENES = ["gps", "mapa", "manual", "ajustado"];
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const MESES = ["ENE", "FEB", "MAR", "ABR", "MAY", "JUN", "JUL", "AGO", "SEP", "OCT", "NOV", "DIC"];

type Errores = [string, string][];
type Fila = Record<string, unknown> & { id: string };

export interface Resultado {
  id: string | null;
  estado: "recibido" | "rechazado";
  codigo?: string;
  mensaje?: string;
  errores?: Errores;
  fila?: Fila;
  repetido?: boolean;
  aviso?: string;
}

const recibido = (fila: Fila, extra: Partial<Resultado> = {}): Resultado => ({ id: fila.id, estado: "recibido", fila, ...extra });
const rechazo = (id: string | null, codigo: string, mensaje: string, errores?: Errores): Resultado => ({ id, estado: "rechazado", codigo, mensaje, ...(errores ? { errores } : {}) });
const sinPermiso = (id: string | null, accion: Accion) => rechazo(id, "SIN_PERMISO", "No tiene permiso para " + ACCIONES[accion].texto + ".");

const texto = (v: unknown): string => (typeof v === "string" ? v.trim() : "");
const idDe = (v: unknown): string | null => (typeof v === "string" && UUID.test(v) ? v : null);
// AAAA-MM-DD que sea un día del calendario
const esFecha = (v: unknown): v is string => typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v) && new Date(v + "T00:00:00Z").toISOString().startsWith(v);
// El momento que dice el teléfono, o ahora si no trae uno que se entienda
const instante = (v: unknown): string => (typeof v === "string" && !Number.isNaN(Date.parse(v)) ? new Date(v).toISOString() : new Date().toISOString());
// «05-OCT-2026», como lo escribe la aplicación
const fechaCorta = (iso: string): string => {
  const [a, m, d] = iso.slice(0, 10).split("-");
  return d + "-" + MESES[Number(m) - 1] + "-" + a;
};

interface Punto {
  lat: number;
  lng: number;
  punto_origen: string;
  gps_precision_m: number | null;
}

// El punto como lo manda el teléfono, con seis decimales; null si falta o no es un número
function puntoDe(d: Record<string, unknown>): Punto | null {
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

interface Territorio {
  alcaldia_cve: string | null;
  alcaldia: string | null;
  colonia_cve: string | null;
  colonia: string | null;
  uga: string | null;
  uga_borde_m: number | null;
  capa_version: string | null;
  dentro: boolean;
}

// Alcaldía, colonia y celda UGA del punto, sobre territorio, con las mismas reglas que la aplicación
const ubicar = async (c: pg.PoolClient, p: Punto): Promise<Territorio> =>
  (await c.query<Territorio>("SELECT * FROM srp.derivar($1, $2, $3)", [p.lat, p.lng, MARGEN_AMBITO_M])).rows[0];

// Hoy en la Ciudad de México, sea cual sea la zona del servidor
const hoyEnLaCiudad = async (c: pg.PoolClient): Promise<string> =>
  (await c.query<{ hoy: string }>("SELECT (now() AT TIME ZONE 'America/Mexico_City')::date::text AS hoy")).rows[0].hoy;

const filaDe = async (c: pg.PoolClient, tabla: "jornadas" | "plantaciones", id: string, bloquear = false): Promise<Fila | undefined> =>
  (await c.query<{ fila: Fila }>(`SELECT to_jsonb(x) - 'foto_base64' AS fila FROM srp.${tabla} x WHERE id = $1${bloquear ? " FOR SHARE" : ""}`, [id])).rows[0]?.fila;

/* Los programas que puede elegir una institución: la Secretaría, todos los activos; las demás, los que tienen
   marcado su tipo de institución (js/referencias.js, programasPara). */
async function programaPermitido(c: pg.PoolClient, programaId: string, organizacionId: string): Promise<boolean> {
  const r = await c.query(
    `SELECT 1 FROM srp.programas p WHERE p.id = $1 AND p.activo
        AND ($2 = $3 OR p.tipos_organizacion @> ARRAY[(SELECT tipo_organizacion FROM srp.instituciones WHERE id = $2)]::varchar[])`,
    [programaId, organizacionId, SEDEMA],
  );
  return (r.rowCount ?? 0) > 0;
}

interface Solicitud {
  solicitante_id: string | null;
  solicitante_otro: string;
  solicitud_descripcion: string;
}

// Con el programa «Solicitud especial», quién lo solicita y de qué se trata; con otro, los tres vacíos
function solicitudDe(programaId: string, d: Record<string, unknown>): Solicitud {
  if (programaId !== PROGRAMA_SOLICITUD) return { solicitante_id: null, solicitante_otro: "", solicitud_descripcion: "" };
  const id = texto(d.solicitante_id) || null;
  return { solicitante_id: id, solicitante_otro: id ? "" : texto(d.solicitante_otro), solicitud_descripcion: texto(d.solicitud_descripcion) };
}

// Los errores de la solicitud, como el bloque de la aplicación (js/solicitud.js): uno a la vez
async function erroresSolicitud(c: pg.PoolClient, s: Solicitud): Promise<Errores> {
  if (s.solicitante_id) {
    if (!(await c.query("SELECT 1 FROM srp.solicitantes WHERE id = $1 AND activo", [s.solicitante_id])).rowCount) return [["solicitante_id", "Elija quién lo solicita."]];
  } else if (!s.solicitante_otro) return [["solicitante_id", "Elija quién lo solicita."]];
  else if (s.solicitante_otro.length > 120) return [["solicitante_otro", "El nombre de la instancia lleva hasta 120 caracteres."]];
  if (!s.solicitud_descripcion) return [["solicitud_descripcion", "Escriba de qué se trata la solicitud."]];
  if (s.solicitud_descripcion.length > 500) return [["solicitud_descripcion", "La descripción lleva hasta 500 caracteres."]];
  return [];
}

// Un registro que ya llegó: la misma respuesta si es de quien lo manda; si no, el id está tomado
function repetido(previa: Fila, u: Usuario): Resultado {
  return previa.cabo_id === u.id ? recibido(previa, { repetido: true }) : rechazo(previa.id, "YA_EXISTE", "Ya existe otro registro con ese identificador.");
}

async function crearJornada(c: pg.PoolClient, u: Usuario, d: Record<string, unknown>): Promise<Resultado> {
  const id = idDe(d.id);
  if (!id) return rechazo(null, "DATOS_INVALIDOS", "La jornada no trae un identificador válido.");
  if (!puede("jornada.crear", u)) return sinPermiso(id, "jornada.crear");
  const previa = await filaDe(c, "jornadas", id);
  if (previa) return repetido(previa, u);

  const errores: Errores = [];
  const nombre = texto(d.nombre);
  if (!nombre) errores.push(["nombre", "Escriba el nombre de la jornada: el parque, la calle o el sitio."]);
  // La jornada se ubica siempre, con el GPS o con las coordenadas a mano
  const punto = puntoDe(d);
  const territorio = punto ? await ubicar(c, punto) : null;
  if (!punto) errores.push(["lat", "Ubique la jornada: use «Detectar ubicación de la jornada» o capture las coordenadas a mano."]);
  else if (!territorio?.dentro) errores.push(["lat", "El punto está fuera de la Ciudad de México. Revise las coordenadas."]);
  const programaId = texto(d.programa_id);
  if (!programaId) errores.push(["programa_id", "Elija el programa de la jornada."]);
  else if (!(await programaPermitido(c, programaId, u.organizacion_id))) errores.push(["programa_id", "Ese programa no está disponible para su institución."]);
  const solicitud = solicitudDe(programaId, d);
  if (programaId === PROGRAMA_SOLICITUD) errores.push(...(await erroresSolicitud(c, solicitud)));
  const previstos = d.arboles_previstos;
  if (typeof previstos !== "number" || !Number.isInteger(previstos) || previstos < 1 || previstos > 9999) errores.push(["arboles_previstos", "Escriba cuántos árboles se van a plantar: un número entero mayor que cero."]);
  const fecha = d.fecha;
  if (!esFecha(fecha)) errores.push(["fecha", "Indique la fecha de la jornada."]);
  else if (fecha > (await hoyEnLaCiudad(c))) errores.push(["fecha", "La fecha no puede ser posterior a hoy."]);
  if (errores.length) return rechazo(id, "DATOS_INVALIDOS", "Revise los datos de la jornada.", errores);

  const t = territorio as Territorio, p = punto as Punto;
  // Lo demás lo pone el sistema: quién la inicia, su institución, abierta, sin relevos, sin reporte ni vehículo
  const fila = (await c.query<{ fila: Fila }>(
    `INSERT INTO srp.jornadas (id, nombre, ubicacion, programa_id, lat, lng, punto_origen, gps_precision_m, alcaldia_cve, alcaldia, colonia_cve, colonia,
        fecha, comentarios, cabo_id, organizacion_id, estatus, fecha_inicio, fecha_cierre, encargado_id, relevo_id, relevos,
        solicitante_id, solicitante_otro, solicitud_descripcion, editado_por_id, fecha_ultima_edicion, arboles_previstos, puntos_revisados,
        reporte_en, carga_id, personal, apoyo, observaciones, chofer, vehiculo_modelo, vehiculo_placa, vehiculo_tipo, vehiculo_id, hora)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, 'abierta', $17, NULL, $15, NULL, '[]',
        $18, $19, $20, NULL, NULL, $21, '{}', NULL, NULL, '', '', '', '', '', '', '', NULL, '')
     ON CONFLICT (id) DO NOTHING
     RETURNING to_jsonb(jornadas) AS fila`,
    [id, nombre, texto(d.ubicacion), programaId, p.lat, p.lng, p.punto_origen, p.gps_precision_m, t.alcaldia_cve, t.alcaldia, t.colonia_cve, t.colonia,
      fecha, texto(d.comentarios), u.id, u.organizacion_id, instante(d.fecha_inicio), solicitud.solicitante_id, solicitud.solicitante_otro,
      solicitud.solicitud_descripcion, previstos],
  )).rows[0]?.fila;
  // Otro envío de la misma jornada ganó por un instante: es la misma
  if (!fila) return repetido((await filaDe(c, "jornadas", id)) as Fila, u);
  await anotarCambio(c, u, "CREADO", "jornada", id, "Jornada «" + nombre + "» del " + fechaCorta(fecha as string));
  return recibido(fila);
}

/* EL FOLIO, al recibir el árbol y en su misma transacción. Hace falta su alcaldía y las tres capas; la celda
   es la UGA del punto, o EXT-000 si quedó fuera de la malla. Devuelve el folio, o el aviso de por qué el
   árbol se queda PROVISIONAL. */
async function asignarFolio(c: pg.PoolClient, u: Usuario, a: Fila): Promise<{ folio: string } | { aviso: string }> {
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

async function crearArbol(c: pg.PoolClient, u: Usuario, d: Record<string, unknown>): Promise<Resultado> {
  const id = idDe(d.id);
  if (!id) return rechazo(null, "DATOS_INVALIDOS", "El árbol no trae un identificador válido.");
  if (!puede("registro.crear", u)) return sinPermiso(id, "registro.crear");
  const previa = await filaDe(c, "plantaciones", id);
  if (previa) return repetido(previa, u);

  // La jornada, que no se cierra mientras se recibe su árbol
  const jornadaId = idDe(d.jornada_id);
  const jornada = jornadaId ? await filaDe(c, "jornadas", jornadaId, true) : undefined;
  if (!jornada) return rechazo(id, "JORNADA_PENDIENTE", "La jornada de este árbol todavía no está en el servidor: el árbol se recibe después de ella.");
  // Sólo quien la tiene a su cargo registra en ella: el titular o, durante un relevo, el cabo del relevo
  if (!puede("jornada.registrar", u, jornada as Objeto)) return sinPermiso(id, "jornada.registrar");

  const errores: Errores = [];
  const punto = puntoDe(d);
  const territorio = punto ? await ubicar(c, punto) : null;
  if (!punto) errores.push(["lat", "Falta la ubicación: use el botón de ubicación, toque el mapa o capture coordenadas."]);
  else if (!territorio?.dentro) errores.push(["lat", "El punto está fuera de la Ciudad de México. Revise las coordenadas."]);
  const especieId = texto(d.especie_id) || null;
  const especieOtra = especieId ? "" : texto(d.especie_otra);
  if (especieId) {
    if (!(await c.query("SELECT 1 FROM srp.especies WHERE id = $1 AND activo", [especieId])).rowCount) errores.push(["especie_id", "Elija una especie de la lista o la opción «Otra especie»."]);
  } else if (!especieOtra) errores.push(["especie_id", "Elija una especie de la lista o la opción «Otra especie»."]);
  // La fecha de plantación: entre el inicio de la jornada y hoy
  const fecha = d.fecha_plantacion;
  if (!esFecha(fecha)) errores.push(["fecha_plantacion", "Indique la fecha de plantación."]);
  else if (fecha > (await hoyEnLaCiudad(c))) errores.push(["fecha_plantacion", "La fecha de plantación no puede ser posterior a hoy."]);
  else if (fecha < String(jornada.fecha)) errores.push(["fecha_plantacion", "La fecha de plantación no puede ser anterior al inicio de la jornada (" + fechaCorta(String(jornada.fecha)) + ")."]);
  const comentarios = texto(d.comentarios);
  if (comentarios.length > 500) errores.push(["comentarios", "Los comentarios llevan hasta 500 caracteres."]);
  if (errores.length) return rechazo(id, "DATOS_INVALIDOS", "Revise los datos del árbol.", errores);

  const t = territorio as Territorio, p = punto as Punto;
  // El programa es el de su jornada; la fotografía llega aparte
  let fila = (await c.query<{ fila: Fila }>(
    `INSERT INTO srp.plantaciones (id, estatus, cabo_id, lat, lng, punto_origen, gps_precision_m, folio, especie_id, especie_otra,
        alcaldia_cve, alcaldia, colonia_cve, colonia, uga, uga_borde_m, capa_version, programa_id, fecha_plantacion, jornada_id,
        sustituye_id, motivo_sustitucion, comentarios, sustituido_por_id, motivo_sustitucion_otro, foto_base64, foto_id,
        fecha_registro, fecha_ultima_edicion, editado_por_id)
     VALUES ($1, 'activo', $2, $3, $4, $5, $6, NULL, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18,
        NULL, NULL, $19, NULL, '', NULL, $20, $21, NULL, NULL)
     ON CONFLICT (id) DO NOTHING
     RETURNING to_jsonb(plantaciones) - 'foto_base64' AS fila`,
    [id, u.id, p.lat, p.lng, p.punto_origen, p.gps_precision_m, especieId, especieOtra, t.alcaldia_cve, t.alcaldia, t.colonia_cve, t.colonia,
      t.uga, t.uga_borde_m, t.capa_version, jornada.programa_id, fecha, jornada.id, comentarios, idDe(d.foto_id), instante(d.fecha_registro)],
  )).rows[0]?.fila;
  if (!fila) return repetido((await filaDe(c, "plantaciones", id)) as Fila, u);
  await anotarCambio(c, u, "CREADO", "plantacion", id);
  const folio = await asignarFolio(c, u, fila);
  if ("folio" in folio) fila = { ...fila, folio: folio.folio };
  return recibido(fila, "aviso" in folio ? { aviso: folio.aviso } : {});
}

type Operacion = (c: pg.PoolClient, u: Usuario, datos: Record<string, unknown>) => Promise<Resultado>;
const OPERACIONES: Record<string, Operacion> = { "jornada.crear": crearJornada, "registro.crear": crearArbol };

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
