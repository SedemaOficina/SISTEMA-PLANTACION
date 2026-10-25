import type pg from "pg";
import { anotarCambio } from "./bitacora";
import { apoyoVigente, capacidadesDe, puede, SEDEMA } from "./permisos";
import {
  AHORA, autoresDe, comoObjeto, conVigente, antesDelPrograma, esFecha, esVigente, fechaCorta, filaDe, hoyEnLaCiudad, idDe, instante, jornadaEliminada, puntoDe, rechazo, recibido,
  noAntes, repetida, seElimino, sinPermiso, texto, textoFolio, ubicar, versionVieja, congelarPrioridad, nombreDesactivado, type Errores, type Fila, type Punto, type Resultado, type Territorio,
} from "./recepcion-apoyo";
import type { Usuario } from "./sesiones";

/* LAS JORNADAS QUE LLEGAN DEL TELÉFONO: el alta, con las reglas de «Iniciar jornada» (js/jornada-activa.js), y
   lo que después se le hace, con las de la ficha de la jornada (js/jornadas.js), el cierre y el reporte
   (js/jornada-activa.js, js/reportes.js). Lo que cambia una jornada que ya está en el servidor trae la versión
   que conocía el teléfono, como en los árboles. */

export const PROGRAMA_SOLICITUD = "p-solicitud";

// Los largos de los campos de texto, como los del formulario de la aplicación
const LARGOS: Record<string, [number, string]> = {
  nombre: [120, "El nombre lleva hasta 120 caracteres."],
  ubicacion: [200, "La dirección lleva hasta 200 caracteres."],
  comentarios: [500, "Los comentarios llevan hasta 500 caracteres."],
  personal: [2000, "El personal lleva hasta 2,000 caracteres."],
  apoyo: [2000, "El apoyo lleva hasta 2,000 caracteres."],
  observaciones: [2000, "Las observaciones llevan hasta 2,000 caracteres."],
  chofer: [120, "El nombre del chófer lleva hasta 120 caracteres."],
};
const largos = (v: Record<string, unknown>): Errores =>
  Object.entries(LARGOS).filter(([k, [n]]) => typeof v[k] === "string" && (v[k] as string).length > n).map(([k, [, m]]) => [k, m]);

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

// Por qué no se acepta un programa: si se desactivó, se dice; si no, que no es de esa institución
async function sinPrograma(c: pg.PoolClient, programaId: string, de: string): Promise<string> {
  const desactivado = await nombreDesactivado(c, "programas", programaId);
  return desactivado ? "El programa «" + desactivado + "» se desactivó en el catálogo: elija otro." : "Ese programa no está disponible para " + de + ".";
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

/* Los errores de la solicitud, como el bloque de la aplicación (js/solicitud.js): uno a la vez. Al editar, el
   solicitante que ya tenía la jornada se conserva aunque se haya desactivado. */
async function erroresSolicitud(c: pg.PoolClient, s: Solicitud, yaTenia: unknown = null): Promise<Errores> {
  if (s.solicitante_id) {
    const vale = s.solicitante_id === yaTenia || (await c.query("SELECT 1 FROM srp.solicitantes WHERE id = $1 AND activo", [s.solicitante_id])).rowCount;
    if (!vale) {
      const desactivado = await nombreDesactivado(c, "solicitantes", s.solicitante_id);
      return [["solicitante_id", desactivado ? "«" + desactivado + "» se desactivó en el catálogo de solicitantes: elija otro." : "Elija quién lo solicita."]];
    }
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
  errores.push(...largos({ nombre, ubicacion: texto(d.ubicacion), comentarios: texto(d.comentarios) }));
  // La jornada se ubica siempre, con el GPS o con las coordenadas a mano
  const punto = puntoDe(d);
  const territorio = punto ? await ubicar(c, punto) : null;
  if (!punto) errores.push(["lat", "Ubique la jornada: use «Detectar ubicación de la jornada» o capture las coordenadas a mano."]);
  else if (!territorio?.dentro) errores.push(["lat", "El punto está fuera de la Ciudad de México. Revise las coordenadas."]);
  const programaId = texto(d.programa_id);
  if (!programaId) errores.push(["programa_id", "Elija el programa de la jornada."]);
  else if (!(await programaPermitido(c, programaId, u.organizacion_id))) errores.push(["programa_id", await sinPrograma(c, programaId, "su institución")]);
  const solicitud = solicitudDe(programaId, d);
  if (programaId === PROGRAMA_SOLICITUD) errores.push(...(await erroresSolicitud(c, solicitud)));
  const previstos = d.arboles_previstos;
  if (typeof previstos !== "number" || !Number.isInteger(previstos) || previstos < 1 || previstos > 9999) errores.push(["arboles_previstos", "Escriba cuántos árboles se van a plantar: un número entero mayor que cero."]);
  const fecha = d.fecha;
  if (!esFecha(fecha)) errores.push(["fecha", "Indique la fecha de la jornada."]);
  else if (fecha > (await hoyEnLaCiudad(c))) errores.push(["fecha", "La fecha no puede ser posterior a hoy."]);
  else if (antesDelPrograma(fecha)) errores.push(["fecha", noAntes("La fecha")]);
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
  // La prioridad de la jornada es la de la colonia donde se ubicó, y la imprime su reporte: se congela aquí
  await congelarPrioridad(c, "jornadas", id, p.lat, p.lng);
  return recibido(fila);
}

/* ---------- Lo que se le hace a una jornada que ya está en el servidor ---------- */

type Otras = NonNullable<Resultado["otras"]>;
const SOLICITUD = ["solicitante_id", "solicitante_otro", "solicitud_descripcion"];
const vacio = (x: unknown) => (x === undefined || x === null ? "" : x);

// La jornada, bloqueada mientras cambia
async function jornadaParaCambiar(c: pg.PoolClient, d: Record<string, unknown>): Promise<Resultado | { id: string; actual: Fila }> {
  const id = idDe(d.id);
  if (!id) return rechazo(null, "DATOS_INVALIDOS", "El cambio no dice de qué jornada es.");
  const actual = await filaDe(c, "jornadas", id, "FOR UPDATE");
  if (!actual) return (await seElimino(c, id)) ? jornadaEliminada(id) : rechazo(id, "NO_EXISTE", "Esa jornada no está en el servidor.");
  return { id, actual };
}
const esResultado = (x: object): x is Resultado => "estado" in x;

// El nombre de una cuenta, para la bitácora
const nombreDe = async (c: pg.PoolClient, id: unknown): Promise<string> =>
  (await c.query<{ n: string }>("SELECT nombre_completo AS n FROM srp.usuarios WHERE id = $1", [id])).rows[0]?.n ?? "Usuario no identificado";

const actualizar = async (c: pg.PoolClient, id: string, u: Usuario, campos: Record<string, unknown>): Promise<Fila> => {
  const k = Object.keys(campos);
  return (await c.query<{ fila: Fila }>(
    `UPDATE srp.jornadas SET ${k.map((x, i) => `${x} = $${i + 2}`).join(", ")}${k.length ? ", " : ""}editado_por_id = $${k.length + 2}, fecha_ultima_edicion = ${AHORA}
      WHERE id = $1 RETURNING to_jsonb(jornadas) AS fila`,
    [id, ...Object.values(campos), u.id],
  )).rows[0].fila;
};

/* EDICIÓN de la jornada: nombre, dirección, programa, árboles previstos, fecha, comentarios y solicitud. Sus
   árboles toman el programa nuevo y, los plantados el día de inicio, también la fecha nueva; los de otros
   días conservan la suya. Todos, también los eliminados, en la misma transacción. La jornada no puede empezar
   después de un árbol plantado otro día. */
export async function editarJornada(c: pg.PoolClient, u: Usuario, d: Record<string, unknown>): Promise<Resultado> {
  const leido = await jornadaParaCambiar(c, d);
  if (esResultado(leido)) return leido;
  const { id, actual } = leido;
  if (!puede("jornada.editar", u, comoObjeto(actual), await autoresDe(c, actual))) return sinPermiso(id, "jornada.editar");

  const cambios = d.cambios && typeof d.cambios === "object" ? (d.cambios as Record<string, unknown>) : {};
  const de = (k: string) => (Object.hasOwn(cambios, k) ? cambios[k] : actual[k]);
  const programaId = texto(de("programa_id"));
  const nuevo: Record<string, unknown> = {
    nombre: texto(de("nombre")), ubicacion: texto(de("ubicacion")), programa_id: programaId,
    arboles_previstos: de("arboles_previstos"), fecha: de("fecha"), comentarios: texto(de("comentarios")),
    ...solicitudDe(programaId, Object.fromEntries(SOLICITUD.map((k) => [k, de(k)]))),
  };
  const campos = Object.keys(nuevo).filter((k) => vacio(actual[k]) !== vacio(nuevo[k]));
  if (!campos.length) return recibido(actual, { repetido: true });
  if (!(await esVigente(c, "jornadas", id, d.version))) return versionVieja(actual);

  const errores: Errores = [];
  if (!nuevo.nombre) errores.push(["nombre", "Escriba el nombre de la jornada."]);
  errores.push(...largos(nuevo));
  if (!programaId) errores.push(["programa_id", "Elija el programa."]);
  // Los programas de la institución que ejecuta la jornada, más el que ya tiene
  else if (programaId !== actual.programa_id && !(await programaPermitido(c, programaId, String(actual.organizacion_id)))) {
    errores.push(["programa_id", await sinPrograma(c, programaId, "la institución de la jornada")]);
  }
  if (programaId === PROGRAMA_SOLICITUD) errores.push(...(await erroresSolicitud(c, nuevo as unknown as Solicitud, actual.solicitante_id)));
  const previstos = nuevo.arboles_previstos;
  if (typeof previstos !== "number" || !Number.isInteger(previstos) || previstos < 1 || previstos > 9999) errores.push(["arboles_previstos", "Escriba cuántos árboles se van a plantar: un entero mayor que cero."]);
  const fecha = nuevo.fecha;
  if (!esFecha(fecha)) errores.push(["fecha", "Indique la fecha."]);
  else if (fecha > (await hoyEnLaCiudad(c))) errores.push(["fecha", "La fecha no puede ser posterior a hoy."]);
  else if (fecha !== actual.fecha && antesDelPrograma(fecha)) errores.push(["fecha", noAntes("La fecha")]);
  if (errores.length) return conVigente(rechazo(id, "DATOS_INVALIDOS", "Revise los datos de la jornada.", errores), actual);
  const cambiaFecha = campos.includes("fecha"), cambiaPrograma = campos.includes("programa_id");
  if (cambiaFecha) {
    const antes = (await c.query<{ f: string }>(
      "SELECT min(fecha_plantacion)::text AS f FROM srp.plantaciones WHERE jornada_id = $1 AND fecha_plantacion <> $2 AND fecha_plantacion < $3",
      [id, actual.fecha, fecha],
    )).rows[0].f;
    if (antes) return conVigente(rechazo(id, "DATOS_INVALIDOS", "Revise los datos de la jornada.",
      [["fecha", "Hay árboles de esta jornada plantados el " + fechaCorta(antes) + ": la jornada no puede empezar después de ese día."]]), actual);
  }

  const fila = await actualizar(c, id, u, Object.fromEntries(campos.map((k) => [k, nuevo[k]])));
  await anotarCambio(c, u, "EDITADO", "jornada", id, "Campos: " + campos.join(", "));
  const otras: Otras = [];
  if (cambiaFecha || cambiaPrograma) {
    const programa = cambiaPrograma ? (await c.query<{ nombre: string }>("SELECT nombre FROM srp.programas WHERE id = $1", [programaId])).rows[0]?.nombre ?? "" : "";
    const arboles = (await c.query<{ id: string; fecha: string }>(
      "SELECT id, fecha_plantacion::text AS fecha FROM srp.plantaciones WHERE jornada_id = $1 ORDER BY id FOR UPDATE", [id])).rows;
    for (const a of arboles) {
      const nuevaFecha = cambiaFecha && a.fecha === actual.fecha;
      const detalle = [nuevaFecha ? "fecha " + fechaCorta(fecha as string) : "", cambiaPrograma ? "programa " + programa : ""].filter(Boolean).join(" y ");
      if (!detalle) continue;
      otras.push({ tabla: "plantaciones", fila: (await c.query<{ fila: Fila }>(
        `UPDATE srp.plantaciones SET fecha_plantacion = $2, programa_id = $3, editado_por_id = $4, fecha_ultima_edicion = ${AHORA}
          WHERE id = $1 RETURNING to_jsonb(plantaciones) - 'foto_base64' AS fila`,
        [a.id, nuevaFecha ? fecha : a.fecha, programaId, u.id],
      )).rows[0].fila });
      await anotarCambio(c, u, "EDITADO", "plantacion", a.id, "Por cambio de la jornada: " + detalle);
    }
  }
  return recibido(fila, otras.length ? { otras } : {});
}

/* CERRAR Y REABRIR. Al cerrarla queda la hora del cierre; al reabrirla, su reporte deja de estar vigente,
   porque va a cambiar. */
async function cambiarEstatus(c: pg.PoolClient, u: Usuario, d: Record<string, unknown>, estatus: "abierta" | "cerrada"): Promise<Resultado> {
  const leido = await jornadaParaCambiar(c, d);
  if (esResultado(leido)) return leido;
  const { id, actual } = leido;
  if (!puede("jornada.editar", u, comoObjeto(actual), await autoresDe(c, actual))) return sinPermiso(id, "jornada.editar");
  if (actual.estatus === estatus) return recibido(actual, { repetido: true });
  if (!(await esVigente(c, "jornadas", id, d.version))) return versionVieja(actual);
  const caduca = estatus === "abierta" && !!actual.reporte_en;
  const fila = (await c.query<{ fila: Fila }>(
    `UPDATE srp.jornadas SET estatus = $2, fecha_cierre = CASE WHEN $2 = 'cerrada' THEN ${AHORA} END,
        reporte_en = CASE WHEN $2 = 'cerrada' THEN reporte_en END, editado_por_id = $3, fecha_ultima_edicion = ${AHORA}
      WHERE id = $1 RETURNING to_jsonb(jornadas) AS fila`,
    [id, estatus, u.id],
  )).rows[0].fila;
  await anotarCambio(c, u, "EDITADO", "jornada", id, estatus === "cerrada" ? "Jornada cerrada" : "Jornada reabierta" + (caduca ? "; su reporte deja de estar vigente" : ""));
  return recibido(fila);
}
export const cerrarJornada = (c: pg.PoolClient, u: Usuario, d: Record<string, unknown>) => cambiarEstatus(c, u, d, "cerrada");
export const reabrirJornada = (c: pg.PoolClient, u: Usuario, d: Record<string, unknown>) => cambiarEstatus(c, u, d, "abierta");

/* LOS PUNTOS REVISADOS: los árboles con aviso que quien revisa ya vio en el mapa y están bien. Llega la lista
   completa; la bitácora dice cuáles se agregaron y cuáles se quitaron, por su folio. */
export async function revisarPuntos(c: pg.PoolClient, u: Usuario, d: Record<string, unknown>): Promise<Resultado> {
  const leido = await jornadaParaCambiar(c, d);
  if (esResultado(leido)) return leido;
  const { id, actual } = leido;
  if (!puede("jornada.editar", u, comoObjeto(actual), await autoresDe(c, actual))) return sinPermiso(id, "jornada.editar");
  const lista = Array.isArray(d.puntos_revisados) ? [...new Set(d.puntos_revisados.map(idDe))] : [null];
  const antes = (actual.puntos_revisados as string[] | undefined) ?? [];
  const agregados = lista.filter((x): x is string => !!x && !antes.includes(x)), quitados = antes.filter((x) => !lista.includes(x));
  if (!agregados.length && !quitados.length && !lista.includes(null)) return recibido(actual, { repetido: true });
  if (!(await esVigente(c, "jornadas", id, d.version))) return versionVieja(actual);
  const arboles = (await c.query<Fila>("SELECT id, folio FROM srp.plantaciones WHERE jornada_id = $1 AND id = ANY($2::uuid[])", [id, [...agregados, ...quitados]])).rows;
  if (lista.includes(null) || agregados.some((x) => !arboles.some((a) => a.id === x))) {
    return conVigente(rechazo(id, "DATOS_INVALIDOS", "Revise los puntos.", [["puntos_revisados", "Los puntos revisados son árboles de esta jornada."]]), actual);
  }
  const folios = (ids: string[]) => ids.map((x) => textoFolio(arboles.find((a) => a.id === x) ?? { id: x })).join(", ");
  const detalle = [
    agregados.length === 1 ? "Punto revisado: está bien (" + folios(agregados) + ")" : agregados.length ? agregados.length + " puntos revisados de una vez: están bien (" + folios(agregados) + ")" : "",
    quitados.length === 1 ? "Se deshizo la revisión del punto " + folios(quitados) : quitados.length ? "Se deshizo la revisión de " + quitados.length + " puntos (" + folios(quitados) + ")" : "",
  ].filter(Boolean).join("; ");
  const fila = await actualizar(c, id, u, { puntos_revisados: lista });
  await anotarCambio(c, u, "EDITADO", "jornada", id, detalle);
  return recibido(fila);
}

const HORA = /^([01]\d|2[0-3]):[0-5]\d$/;
/* LOS DATOS DE CIERRE DEL REPORTE, de una jornada cerrada: encargado, personal, apoyo, observaciones, chófer,
   vehículo y hora. El vehículo sale del catálogo, y su placa, modelo y tipo se copian en la jornada, porque
   el reporte es un documento y no cambia si después se corrige el catálogo. Personal, apoyo, chófer y
   vehículo sólo son de las jornadas de la Secretaría. El encargado de un cabo es él mismo; quien ve a varias
   personas elige entre quienes registraron árboles en la jornada. */
export async function cierreJornada(c: pg.PoolClient, u: Usuario, d: Record<string, unknown>): Promise<Resultado> {
  const leido = await jornadaParaCambiar(c, d);
  if (esResultado(leido)) return leido;
  const { id, actual } = leido;
  if (!puede("jornada.editar", u, comoObjeto(actual), await autoresDe(c, actual))) return sinPermiso(id, "jornada.editar");
  if (actual.estatus !== "cerrada") return conVigente(rechazo(id, "NO_CERRADA", "El reporte es de una jornada cerrada: ciérrela primero."), actual);

  const propios = capacidadesDe(u).alcance === "propios";
  const nuevo: Record<string, unknown> = {
    encargado_id: propios ? u.id : idDe(d.encargado_id),
    personal: texto(d.personal), apoyo: texto(d.apoyo), observaciones: texto(d.observaciones), chofer: texto(d.chofer), hora: texto(d.hora),
    vehiculo_id: texto(d.vehiculo_id) || null,
  };
  const iguales = Object.keys(nuevo).every((k) => vacio(actual[k]) === vacio(nuevo[k]));
  if (iguales) return recibido(actual, { repetido: true });
  if (!(await esVigente(c, "jornadas", id, d.version))) return versionVieja(actual);

  const errores: Errores = [];
  if (actual.organizacion_id !== SEDEMA && (nuevo.personal || nuevo.apoyo || nuevo.chofer || nuevo.vehiculo_id)) {
    errores.push(["personal", "Personal, apoyo, chófer y vehículo sólo se piden en las jornadas de la Secretaría."]);
  }
  if (nuevo.hora && !HORA.test(String(nuevo.hora))) errores.push(["hora", "Escriba la hora como 14:30."]);
  errores.push(...largos(nuevo));
  const vehiculo = nuevo.vehiculo_id
    ? (await c.query<{ nombre: string; modelo: string; tipo_vehiculo: string }>("SELECT nombre, modelo, tipo_vehiculo FROM srp.vehiculos WHERE id = $1 AND (activo OR id = $2)",
      [nuevo.vehiculo_id, actual.vehiculo_id])).rows[0]
    : undefined;
  if (nuevo.vehiculo_id && !vehiculo) {
    const desactivado = await nombreDesactivado(c, "vehiculos", nuevo.vehiculo_id);
    errores.push(["vehiculo_id", desactivado ? "El vehículo «" + desactivado + "» se desactivó en el catálogo: elija otro." : "Elija un vehículo del catálogo."]);
  }
  if (!propios && nuevo.encargado_id && !(await c.query("SELECT 1 FROM srp.plantaciones WHERE jornada_id = $1 AND cabo_id = $2", [id, nuevo.encargado_id])).rowCount) {
    errores.push(["encargado_id", "El encargado es alguien que registró árboles en la jornada."]);
  }
  if (errores.length) return conVigente(rechazo(id, "DATOS_INVALIDOS", "Revise los datos del cierre.", errores), actual);

  const fila = await actualizar(c, id, u, { ...nuevo, vehiculo_placa: vehiculo?.nombre ?? "", vehiculo_modelo: vehiculo?.modelo ?? "", vehiculo_tipo: vehiculo?.tipo_vehiculo ?? "" });
  await anotarCambio(c, u, "EDITADO", "jornada", id, "Datos de cierre del reporte");
  return recibido(fila);
}

/* EL REPORTE ENTREGADO: cuenta como generado cuando el PDF se entregó, no al verlo. Vale para lo que la
   jornada tenía entonces: cualquier cambio a sus árboles lo deja sin vigencia. */
export async function reporteJornada(c: pg.PoolClient, u: Usuario, d: Record<string, unknown>): Promise<Resultado> {
  const leido = await jornadaParaCambiar(c, d);
  if (esResultado(leido)) return leido;
  const { id, actual } = leido;
  if (!puede("jornada.editar", u, comoObjeto(actual), await autoresDe(c, actual))) return sinPermiso(id, "jornada.editar");
  if (actual.estatus !== "cerrada") return conVigente(rechazo(id, "NO_CERRADA", "El reporte es de una jornada cerrada: ciérrela primero."), actual);
  const vigente = await esVigente(c, "jornadas", id, d.version);
  // Ya generado y sin cambios desde entonces: es el mismo aviso que vuelve a llegar
  if (actual.reporte_en && !vigente) return recibido(actual, { repetido: true });
  if (!vigente) return versionVieja(actual);
  const fila = (await c.query<{ fila: Fila }>(
    `UPDATE srp.jornadas SET reporte_en = ${AHORA}, editado_por_id = $2, fecha_ultima_edicion = ${AHORA} WHERE id = $1 RETURNING to_jsonb(jornadas) AS fila`,
    [id, u.id],
  )).rows[0].fila;
  await anotarCambio(c, u, "EDITADO", "jornada", id, actual.reporte_en ? "Reporte generado de nuevo" : "Reporte generado");
  return recibido(fila);
}

/* RELEVO: la coordinación pasa una jornada abierta a otro cabo activo de la institución de la jornada, o se la
   devuelve al titular. Queda en `relevo_id` (nulo si vuelve el titular), en la lista de
   relevos —con quién, cuándo y quién lo hizo— y en la bitácora. La jornada y sus árboles no cambian de dueño. */
export async function relevoJornada(c: pg.PoolClient, u: Usuario, d: Record<string, unknown>): Promise<Resultado> {
  const leido = await jornadaParaCambiar(c, d);
  if (esResultado(leido)) return leido;
  const { id, actual } = leido;
  if (!puede("jornada.relevo", u, comoObjeto(actual), await autoresDe(c, actual))) return sinPermiso(id, "jornada.relevo");
  const destino = idDe(d.cabo_id);
  const capturista = String(actual.relevo_id ?? actual.cabo_id);
  if (destino === capturista) return recibido(actual, { repetido: true });
  if (!(await esVigente(c, "jornadas", id, d.version))) return versionVieja(actual);
  const vuelve = destino === actual.cabo_id;
  const deLaInstitucion = !!destino && !vuelve && !!(await c.query(
    `SELECT 1 FROM srp.usuarios WHERE id = $1 AND activo AND perfil = 'CABO' AND organizacion_id = $2`,
    [destino, actual.organizacion_id],
  )).rowCount;
  if (!vuelve && !deLaInstitucion) return conVigente(rechazo(id, "DATOS_INVALIDOS", "Revise el relevo.", [["cabo_id", "Elija el cabo que sigue registrando."]]), actual);
  const fila = (await c.query<{ fila: Fila }>(
    `UPDATE srp.jornadas SET relevo_id = $2,
        relevos = relevos || jsonb_build_array(jsonb_build_object('cabo_id', $3::text, 'fecha', to_char(${AHORA} AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'), 'por_id', $4::text)),
        editado_por_id = $5, fecha_ultima_edicion = ${AHORA}
      WHERE id = $1 RETURNING to_jsonb(jornadas) AS fila`,
    [id, vuelve ? null : destino, destino, u.id, u.id],
  )).rows[0].fila;
  await anotarCambio(c, u, "RELEVO", "jornada", id, "Registra " + (await nombreDe(c, destino)) + " en lugar de " + (await nombreDe(c, capturista)) +
    (vuelve ? ": vuelve el titular" : "; titular: " + (await nombreDe(c, actual.cabo_id))));
  return recibido(fila);
}

// Un cabo de apoyo en la lista de la jornada (02-srp-tablas.sql, jornadas.cabos_apoyo)
interface Apoyo {
  cabo_id: string;
  desde: string;
  por_id: string;
  hasta: string | null;
  fin: "terminado" | "quitado" | null;
}
const apoyosDe = (j: Fila): Apoyo[] => (j.cabos_apoyo as Apoyo[] | null) ?? [];

// Este momento, como lo escriben las listas de la jornada
const ahoraIso = async (c: pg.PoolClient): Promise<string> =>
  (await c.query<{ t: string }>(`SELECT to_char(${AHORA} AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') AS t`)).rows[0].t;

/* JORNADA COMPARTIDA. Su titular, una cuenta de Coordinación, agrega o quita cabos de apoyo: cabos activos de la
   institución de la jornada, que registran en ella a la vez. Llega lo que cambió en su teléfono —`agregar` y
   `quitar`—, no la lista entera: si mientras tanto un cabo terminó su parte, eso no se deshace. Al que entra se le
   anota desde cuándo y quién lo puso; al que sale, hasta cuándo y que lo quitaron; uno que vuelve queda vigente otra
   vez. Cada cabo aparece una vez, y todo queda en la bitácora (APOYO). */
export async function compartirJornada(c: pg.PoolClient, u: Usuario, d: Record<string, unknown>): Promise<Resultado> {
  const leido = await jornadaParaCambiar(c, d);
  if (esResultado(leido)) return leido;
  const { id, actual } = leido;
  if (!puede("jornada.compartir", u, comoObjeto(actual))) return sinPermiso(id, "jornada.compartir");
  const ids = (v: unknown) => (Array.isArray(v) ? [...new Set(v.map(idDe).filter((x): x is string => !!x))] : []);
  const vigente = (x: string) => apoyoVigente(comoObjeto(actual), x);
  const agregar = ids(d.agregar).filter((x) => !vigente(x));
  const quitar = ids(d.quitar).filter((x) => vigente(x) && !agregar.includes(x));
  if (!agregar.length && !quitar.length) return recibido(actual, { repetido: true });
  if (agregar.length) {
    const { n } = (await c.query<{ n: number }>(
      "SELECT count(*)::int AS n FROM srp.usuarios WHERE id = ANY($1::uuid[]) AND activo AND perfil = 'CABO' AND organizacion_id = $2",
      [agregar, actual.organizacion_id],
    )).rows[0];
    if (n !== agregar.length) return conVigente(rechazo(id, "DATOS_INVALIDOS", "Revise los cabos de apoyo.", [["cabos_apoyo", "Elija cabos activos de la institución de la jornada."]]), actual);
  }
  const ahora = await ahoraIso(c), lista = apoyosDe(actual);
  const nueva: Apoyo[] = lista.map((a) => (agregar.includes(a.cabo_id) ? { cabo_id: a.cabo_id, desde: ahora, por_id: u.id, hasta: null, fin: null }
    : quitar.includes(a.cabo_id) ? { ...a, hasta: ahora, fin: "quitado" } : a));
  for (const x of agregar) if (!lista.some((a) => a.cabo_id === x)) nueva.push({ cabo_id: x, desde: ahora, por_id: u.id, hasta: null, fin: null });
  const fila = await actualizar(c, id, u, { cabos_apoyo: JSON.stringify(nueva) });
  const nombres = async (xs: string[]) => (await Promise.all(xs.map((x) => nombreDe(c, x)))).join(", ");
  await anotarCambio(c, u, "APOYO", "jornada", id,
    [agregar.length ? "Agrega: " + (await nombres(agregar)) : "", quitar.length ? "Quita: " + (await nombres(quitar)) : ""].filter(Boolean).join("; "));
  return recibido(fila);
}

/* «TERMINAR MI PARTE». El cabo de apoyo vigente avisa que acabó: queda hasta cuándo y que terminó, y deja de
   registrar en la jornada. No cambia la versión de la jornada, para que lo que la Coordinación tenga por enviar de
   ella no choque con esto. Si hace falta que vuelva, la Coordinación lo marca otra vez. */
export async function terminarParte(c: pg.PoolClient, u: Usuario, d: Record<string, unknown>): Promise<Resultado> {
  const leido = await jornadaParaCambiar(c, d);
  if (esResultado(leido)) return leido;
  const { id, actual } = leido;
  const lista = apoyosDe(actual);
  if (!apoyoVigente(comoObjeto(actual), u.id) && lista.some((a) => a.cabo_id === u.id && a.fin === "terminado")) return recibido(actual, { repetido: true });
  if (!puede("jornada.terminar", u, comoObjeto(actual))) return sinPermiso(id, "jornada.terminar");
  const ahora = await ahoraIso(c);
  const nueva = lista.map((a) => (a.cabo_id === u.id && !a.hasta ? { ...a, hasta: ahora, fin: "terminado" } : a));
  const fila = (await c.query<{ fila: Fila }>(
    "UPDATE srp.jornadas SET cabos_apoyo = $2::jsonb WHERE id = $1 RETURNING to_jsonb(jornadas) AS fila",
    [id, JSON.stringify(nueva)],
  )).rows[0].fila;
  const { n } = (await c.query<{ n: number }>(
    "SELECT count(*)::int AS n FROM srp.plantaciones WHERE jornada_id = $1 AND cabo_id = $2 AND estatus = 'activo'", [id, u.id])).rows[0];
  await anotarCambio(c, u, "APOYO", "jornada", id, "Terminó su parte: " + n + (n === 1 ? " árbol" : " árboles"));
  return recibido(fila);
}

/* ELIMINAR UNA JORNADA: sólo si no tiene árboles. Los eliminados también cuentan: se conservan como
   constancia y siguen apuntando a su jornada. */
export async function eliminarJornada(c: pg.PoolClient, u: Usuario, d: Record<string, unknown>): Promise<Resultado> {
  const id = idDe(d.id);
  if (!id) return rechazo(null, "DATOS_INVALIDOS", "El cambio no dice de qué jornada es.");
  const actual = await filaDe(c, "jornadas", id, "FOR UPDATE");
  if (!actual) {
    // Ya se eliminó: es el mismo cambio que vuelve a llegar
    const ya = (await c.query("SELECT 1 FROM srp.bitacora WHERE entidad = 'jornada' AND entidad_id = $1 AND accion = 'ELIMINADO'", [id])).rowCount;
    return ya ? { id, estado: "recibido", repetido: true } : rechazo(id, "NO_EXISTE", "Esa jornada no está en el servidor.");
  }
  if (!puede("jornada.eliminar", u, comoObjeto(actual), await autoresDe(c, actual))) return sinPermiso(id, "jornada.eliminar");
  if (!(await esVigente(c, "jornadas", id, d.version))) return versionVieja(actual);
  const { activos, otros } = (await c.query<{ activos: number; otros: number }>(
    "SELECT count(*) FILTER (WHERE estatus = 'activo')::int AS activos, count(*) FILTER (WHERE estatus <> 'activo')::int AS otros FROM srp.plantaciones WHERE jornada_id = $1",
    [id],
  )).rows[0];
  if (activos) return conVigente(rechazo(id, "CON_ARBOLES", "No se puede eliminar: tiene árboles registrados. Muévalos o elimínelos primero."), actual);
  if (otros) return conVigente(rechazo(id, "CON_ARBOLES", "No se puede eliminar: guarda " + (otros === 1 ? "1 árbol eliminado, que se conserva" : otros + " árboles eliminados, que se conservan") +
    " como constancia. Si ya no se usará, ciérrela."), actual);
  await c.query("DELETE FROM srp.jornadas WHERE id = $1", [id]);
  await anotarCambio(c, u, "ELIMINADO", "jornada", id, "Jornada «" + String(actual.nombre) + "» eliminada (sin árboles)");
  return recibido(actual);
}
