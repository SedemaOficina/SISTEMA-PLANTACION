import type pg from "pg";
import { anotarCambio } from "./bitacora";
import { puede, SEDEMA } from "./permisos";
import {
  esFecha, fechaCorta, filaDe, hoyEnLaCiudad, idDe, instante, puntoDe, rechazo, recibido, repetida, sinPermiso, texto, ubicar,
  type Errores, type Fila, type Punto, type Resultado, type Territorio,
} from "./recepcion-apoyo";
import type { Usuario } from "./sesiones";

/* LAS JORNADAS QUE LLEGAN DEL TELÉFONO, con las reglas de «Iniciar jornada» (js/jornada-activa.js). */

export const PROGRAMA_SOLICITUD = "p-solicitud";

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

export async function crearJornada(c: pg.PoolClient, u: Usuario, d: Record<string, unknown>): Promise<Resultado> {
  const id = idDe(d.id);
  if (!id) return rechazo(null, "DATOS_INVALIDOS", "La jornada no trae un identificador válido.");
  if (!puede("jornada.crear", u)) return sinPermiso(id, "jornada.crear");
  const previa = await filaDe(c, "jornadas", id);
  if (previa) return repetida(previa, u);

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
  if (!fila) return repetida((await filaDe(c, "jornadas", id)) as Fila, u);
  await anotarCambio(c, u, "CREADO", "jornada", id, "Jornada «" + nombre + "» del " + fechaCorta(fecha as string));
  return recibido(fila);
}
