import type pg from "pg";
import { anotarCambio } from "./bitacora";
import { conDuplicado } from "./duplicados";
import { puede } from "./permisos";
import {
  AHORA, antesDelPrograma, asignarFolio, autoresDe, caducarReporte, comoObjeto, conVigente, esFecha, especieComun, esVigente, fechaCorta, fechaEnJornada, filaDe,
  hoyEnLaCiudad, idDe, instante, jornadaEliminada, MOTIVOS_SUSTITUCION, motivoSustitucion, noAntes, puntoDe, rechazo, recibido, repetida, seElimino, sinPermiso, texto, textoFolio,
  ubicar, versionVieja, congelarPrioridad, type Errores, type Fila, type Punto, type Resultado, type Tabla, type Territorio,
} from "./recepcion-apoyo";
import type { Usuario } from "./sesiones";

/* LOS ÁRBOLES QUE LLEGAN DEL TELÉFONO: alta, edición, eliminación, restauración, sustitución y cambio de
   jornada, con las reglas de la aplicación (js/formulario.js, js/registros.js, js/jornadas.js).

   Lo que cambia un árbol que ya está en el servidor trae la versión que conocía el teléfono, y se rechaza
   si alguien lo cambió mientras tanto. Un reenvío de algo que ya se aplicó se reconoce y no se repite. Lo
   que toca a otro registro —el árbol que un sustituto reemplaza, el reporte de su jornada— cambia en la
   misma transacción y vuelve en `otras`. Un árbol que queda en un punto nuevo, o vuelve a contar, se compara
   con los cercanos de otras jornadas (duplicados.ts). */

type Otras = NonNullable<Resultado["otras"]>;

// Lo que se revisa de un árbol al darlo de alta o al editarlo: el punto, la especie y los comentarios
async function revisarArbol(c: pg.PoolClient, v: Record<string, unknown>, especieAntes: string | null): Promise<{ errores: Errores; punto: Punto | null; territorio: Territorio | null }> {
  const errores: Errores = [];
  const punto = puntoDe(v);
  const territorio = punto ? await ubicar(c, punto) : null;
  if (!punto) errores.push(["lat", "Falta la ubicación: use el botón de ubicación, toque el mapa o capture coordenadas."]);
  else if (!territorio?.dentro) errores.push(["lat", "El punto está fuera de la Ciudad de México. Revise las coordenadas."]);
  // Una especie nueva tiene que estar activa; la que ya tenía el árbol se conserva aunque se haya desactivado
  if (v.especie_id) {
    if (v.especie_id !== especieAntes && !(await c.query("SELECT 1 FROM srp.especies WHERE id = $1 AND activo", [v.especie_id])).rowCount) {
      errores.push(["especie_id", "Elija una especie de la lista o la opción «Otra especie»."]);
    }
  } else if (!v.especie_otra) errores.push(["especie_id", "Elija una especie de la lista o la opción «Otra especie»."]);
  else if (String(v.especie_otra).length > 120) errores.push(["especie_id", "El nombre de la especie lleva hasta 120 caracteres."]);
  if (String(v.comentarios ?? "").length > 500) errores.push(["comentarios", "Los comentarios llevan hasta 500 caracteres."]);
  return { errores, punto, territorio };
}

interface Alta {
  id: string;
  punto: Punto;
  territorio: Territorio;
  especieId: string | null;
  especieOtra: string;
  comentarios: string;
  fecha: string;
  jornada: Fila;
  fotoId: string | null;
  fechaRegistro: string;
  sustituye?: { id: string; motivo: string; otro: string };
}

/* Un árbol nuevo: el programa es el de su jornada, la fotografía llega aparte, la prioridad de su colonia se
   congela aquí y el folio se asigna después */
async function insertarArbol(c: pg.PoolClient, u: Usuario, a: Alta): Promise<Fila | undefined> {
  const t = a.territorio, p = a.punto;
  const fila = (await c.query<{ fila: Fila }>(
    `INSERT INTO srp.plantaciones (id, estatus, cabo_id, lat, lng, punto_origen, gps_precision_m, folio, especie_id, especie_otra,
        alcaldia_cve, alcaldia, colonia_cve, colonia, uga, uga_borde_m, capa_version, programa_id, fecha_plantacion, jornada_id,
        sustituye_id, motivo_sustitucion, comentarios, sustituido_por_id, motivo_sustitucion_otro, foto_base64, foto_id,
        fecha_registro, fecha_ultima_edicion, editado_por_id)
     VALUES ($1, 'activo', $2, $3, $4, $5, $6, NULL, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18,
        $19, $20, $21, NULL, $22, NULL, $23, $24, NULL, NULL)
     ON CONFLICT (id) DO NOTHING
     RETURNING to_jsonb(plantaciones) - 'foto_base64' AS fila`,
    [a.id, u.id, p.lat, p.lng, p.punto_origen, p.gps_precision_m, a.especieId, a.especieOtra, t.alcaldia_cve, t.alcaldia, t.colonia_cve, t.colonia,
      t.uga, t.uga_borde_m, t.capa_version, a.jornada.programa_id, a.fecha, a.jornada.id, a.sustituye?.id ?? null, a.sustituye?.motivo ?? null,
      a.comentarios, a.sustituye?.otro ?? "", a.fotoId, a.fechaRegistro],
  )).rows[0]?.fila;
  if (fila) await congelarPrioridad(c, "plantaciones", fila.id, p.lat, p.lng);
  return fila;
}

// Lo que el teléfono manda de un árbol nuevo, recortado como lo guarda el formulario
const especieDe = (d: Record<string, unknown>) => {
  const especieId = texto(d.especie_id) || null;
  return { especieId, especieOtra: especieId ? "" : texto(d.especie_otra) };
};

/* ---------- Alta ---------- */

export async function crearArbol(c: pg.PoolClient, u: Usuario, d: Record<string, unknown>): Promise<Resultado> {
  const id = idDe(d.id);
  if (!id) return rechazo(null, "DATOS_INVALIDOS", "El árbol no trae un identificador válido.");
  if (!puede("registro.crear", u)) return sinPermiso(id, "registro.crear");
  const previa = await filaDe(c, "plantaciones", id);
  if (previa) return conDuplicado(c, u, repetida(previa, u));

  // La jornada, que no se cierra mientras se recibe su árbol
  const jornadaId = idDe(d.jornada_id);
  const jornada = jornadaId ? await filaDe(c, "jornadas", jornadaId, "FOR SHARE") : undefined;
  if (!jornada) {
    return jornadaId && (await seElimino(c, jornadaId)) ? jornadaEliminada(id)
      : rechazo(id, "JORNADA_PENDIENTE", "La jornada de este árbol todavía no está en el servidor: el árbol se recibe después de ella.");
  }
  // Sólo quien la tiene a su cargo registra en ella: el titular o, durante un relevo, el cabo del relevo
  if (!puede("jornada.registrar", u, comoObjeto(jornada))) return sinPermiso(id, "jornada.registrar");

  const { especieId, especieOtra } = especieDe(d);
  const comentarios = texto(d.comentarios);
  const { errores, punto, territorio } = await revisarArbol(c, { ...d, especie_id: especieId, especie_otra: especieOtra, comentarios }, null);
  // La fecha de plantación: entre el inicio de la jornada y hoy
  const fecha = d.fecha_plantacion;
  if (!esFecha(fecha)) errores.push(["fecha_plantacion", "Indique la fecha de plantación."]);
  else if (fecha > (await hoyEnLaCiudad(c))) errores.push(["fecha_plantacion", "La fecha de plantación no puede ser posterior a hoy."]);
  else if (antesDelPrograma(fecha)) errores.push(["fecha_plantacion", noAntes("La fecha de plantación")]);
  else if (fecha < String(jornada.fecha)) errores.push(["fecha_plantacion", "La fecha de plantación no puede ser anterior al inicio de la jornada (" + fechaCorta(String(jornada.fecha)) + ")."]);
  if (errores.length) return rechazo(id, "DATOS_INVALIDOS", "Revise los datos del árbol.", ordenar(errores));

  let fila = await insertarArbol(c, u, { id, punto: punto as Punto, territorio: territorio as Territorio, especieId, especieOtra, comentarios,
    fecha: fecha as string, jornada, fotoId: idDe(d.foto_id), fechaRegistro: instante(d.fecha_registro) });
  if (!fila) return conDuplicado(c, u, repetida((await filaDe(c, "plantaciones", id)) as Fila, u));
  await anotarCambio(c, u, "CREADO", "plantacion", id);
  const folio = await asignarFolio(c, u, fila);
  if ("folio" in folio) fila = { ...fila, folio: folio.folio };
  return conDuplicado(c, u, recibido(fila, "aviso" in folio ? { aviso: folio.aviso } : {}));
}

// Los errores en el orden de los campos del formulario: ubicación, especie, fecha y comentarios
const ORDEN = ["motivo_sustitucion", "motivo_sustitucion_otro", "lat", "especie_id", "fecha_plantacion", "comentarios"];
const ordenar = (e: Errores): Errores => e.slice().sort((a, b) => ORDEN.indexOf(a[0]) - ORDEN.indexOf(b[0]));

/* ---------- Lo que se le hace a un árbol que ya está en el servidor ---------- */

// El árbol, bloqueado mientras cambia, y lo que hace falta para decidir sobre él
async function arbolParaCambiar(c: pg.PoolClient, d: Record<string, unknown>): Promise<{ id: string; actual?: Fila } | Resultado> {
  const id = idDe(d.id);
  if (!id) return rechazo(null, "DATOS_INVALIDOS", "El cambio no dice de qué árbol es.");
  const actual = await filaDe(c, "plantaciones", id, "FOR UPDATE");
  if (!actual) return rechazo(id, "NO_EXISTE", "Ese árbol no está en el servidor.");
  return { id, actual };
}
const esResultado = (x: object): x is Resultado => "estado" in x;

const EDITABLES = ["lat", "lng", "punto_origen", "gps_precision_m", "especie_id", "especie_otra", "fecha_plantacion", "comentarios", "foto_id"];
// Los que dice la bitácora al editar, y el territorio que se vuelve a calcular
const DICHOS = ["lat", "lng", "punto_origen", "especie_id", "especie_otra", "programa_id", "fecha_plantacion", "comentarios", "foto_id"];
const TERRITORIO = ["alcaldia", "colonia", "uga", "capa_version"];
const igual = (a: unknown, b: unknown) => (a ?? null) === (b ?? null) || ((a ?? "") === "" && (b ?? "") === "");

/* EDICIÓN. Llegan sólo los campos que cambiaron, en `cambios`, y se aplican sobre lo vigente. El territorio se
   vuelve a calcular con las capas vigentes; el folio no cambia. Un árbol que quedó PROVISIONAL porque su
   territorio no se pudo ubicar recibe aquí su folio, si ahora sí se puede. */
export async function editarArbol(c: pg.PoolClient, u: Usuario, d: Record<string, unknown>): Promise<Resultado> {
  const leido = await arbolParaCambiar(c, d);
  if (esResultado(leido)) return leido;
  const { id, actual } = leido as { id: string; actual: Fila };
  if (!puede("registro.editar", u, comoObjeto(actual), await autoresDe(c, actual))) return sinPermiso(id, "registro.editar");
  if (actual.estatus !== "activo") return conVigente(rechazo(id, "NO_ACTIVO", "Ese árbol ya no está activo: no se edita."), actual);

  // Lo vigente con los cambios encima, recortados como los guarda el formulario
  const cambios = d.cambios && typeof d.cambios === "object" ? (d.cambios as Record<string, unknown>) : {};
  const v: Record<string, unknown> = Object.fromEntries(EDITABLES.map((k) => [k, actual[k]]));
  for (const k of EDITABLES.filter((x) => Object.hasOwn(cambios, x))) {
    const x = cambios[k];
    v[k] = k === "lat" || k === "lng" ? (typeof x === "number" && Number.isFinite(x) ? Number(x.toFixed(6)) : null)
      : k === "gps_precision_m" ? (typeof x === "number" && x >= 0 ? Math.round(x) : null)
      : k === "foto_id" ? idDe(x)
      : k === "fecha_plantacion" ? x
      : texto(x) || (k === "especie_id" ? null : "");
  }
  if (v.especie_id) v.especie_otra = "";
  // Si ya es así, es un reenvío de un cambio que llegó
  if (EDITABLES.every((k) => igual(v[k], actual[k]))) return recibido(actual, { repetido: true });
  if (!(await esVigente(c, "plantaciones", id, d.version))) return versionVieja(actual);

  const jornada = (await filaDe(c, "jornadas", String(actual.jornada_id), "FOR SHARE")) as Fila;
  const { errores, punto, territorio } = await revisarArbol(c, v, (actual.especie_id as string | null) ?? null);
  if (!esFecha(v.fecha_plantacion)) errores.push(["fecha_plantacion", "Indique la fecha de plantación."]);
  else if (v.fecha_plantacion > (await hoyEnLaCiudad(c))) errores.push(["fecha_plantacion", "La fecha de plantación no puede ser posterior a hoy."]);
  else if (v.fecha_plantacion !== actual.fecha_plantacion && antesDelPrograma(v.fecha_plantacion)) errores.push(["fecha_plantacion", noAntes("La fecha de plantación")]);
  else if (v.fecha_plantacion < String(jornada.fecha)) errores.push(["fecha_plantacion", "La fecha de plantación no puede ser anterior al inicio de la jornada (" + fechaCorta(String(jornada.fecha)) + ")."]);
  if (errores.length) return conVigente(rechazo(id, "DATOS_INVALIDOS", "Revise los datos del árbol.", ordenar(errores)), actual);

  const p = punto as Punto, t = territorio as Territorio;
  let fila = (await c.query<{ fila: Fila }>(
    `UPDATE srp.plantaciones SET lat = $2, lng = $3, punto_origen = $4, gps_precision_m = $5, especie_id = $6, especie_otra = $7,
        fecha_plantacion = $8, comentarios = $9, foto_id = $10, programa_id = $11, alcaldia_cve = $12, alcaldia = $13, colonia_cve = $14,
        colonia = $15, uga = $16, uga_borde_m = $17, capa_version = $18, editado_por_id = $19, fecha_ultima_edicion = ${AHORA}
      WHERE id = $1 RETURNING to_jsonb(plantaciones) - 'foto_base64' AS fila`,
    [id, p.lat, p.lng, p.punto_origen, p.gps_precision_m, v.especie_id, v.especie_otra, v.fecha_plantacion, v.comentarios, v.foto_id, jornada.programa_id,
      t.alcaldia_cve, t.alcaldia, t.colonia_cve, t.colonia, t.uga, t.uga_borde_m, t.capa_version, u.id],
  )).rows[0].fila;

  // La bitácora dice qué campos cambiaron, de dónde a dónde se movió el punto y si cambió su territorio
  const cambiados = DICHOS.filter((k) => !igual(actual[k], fila[k]));
  const punto2 = actual.lat !== fila.lat || actual.lng !== fila.lng
    ? "Punto: " + Number(actual.lat).toFixed(6) + ", " + Number(actual.lng).toFixed(6) + " → " + Number(fila.lat).toFixed(6) + ", " + Number(fila.lng).toFixed(6) : "";
  const territorio2 = TERRITORIO.filter((k) => !igual(actual[k], fila[k]));
  const detalle = [cambiados.length ? "Campos: " + cambiados.join(", ") : "", punto2,
    territorio2.length ? "Territorio recalculado: " + territorio2.map((k) => (k === "capa_version" ? "capas " + (fila[k] || "—") : k + " " + (actual[k] || "—") + " → " + (fila[k] || "—"))).join("; ") : "",
  ].filter(Boolean).join(". ");
  await anotarCambio(c, u, "EDITADO", "plantacion", id, detalle || "Sin cambios en los datos");
  const folio = fila.folio ? null : await asignarFolio(c, u, fila);
  if (folio && "folio" in folio) fila = { ...fila, folio: folio.folio };
  // Corregir el punto es lo único que vuelve a calcular la prioridad de su colonia
  if (punto2) await congelarPrioridad(c, "plantaciones", id, fila.lat, fila.lng);
  const otras = detalle ? await caducarReporte(c, u, fila.jornada_id, "se editó un árbol") : [];
  const r = recibido(fila, otras.length ? { otras } : {});
  return punto2 ? conDuplicado(c, u, r) : r;
}

/* ELIMINACIÓN: se marca, no se borra, y se deshace con «restaurar». Sin su sustituto, el árbol que había
   sustituido vuelve a contar como plantado. */
export async function eliminarArbol(c: pg.PoolClient, u: Usuario, d: Record<string, unknown>): Promise<Resultado> {
  const leido = await arbolParaCambiar(c, d);
  if (esResultado(leido)) return leido;
  const { id, actual } = leido as { id: string; actual: Fila };
  if (!puede("registro.eliminar", u, comoObjeto(actual), await autoresDe(c, actual))) return sinPermiso(id, "registro.eliminar");
  if (actual.estatus === "eliminado") return recibido(actual, { repetido: true });
  if (actual.estatus !== "activo") return conVigente(rechazo(id, "NO_ACTIVO", "Ese árbol está sustituido: no se elimina."), actual);
  if (!(await esVigente(c, "plantaciones", id, d.version))) return versionVieja(actual);

  const fila = (await c.query<{ fila: Fila }>(
    `UPDATE srp.plantaciones SET estatus = 'eliminado', editado_por_id = $2, fecha_ultima_edicion = ${AHORA}
      WHERE id = $1 RETURNING to_jsonb(plantaciones) - 'foto_base64' AS fila`,
    [id, u.id],
  )).rows[0].fila;
  await anotarCambio(c, u, "ELIMINADO", "plantacion", id);
  const otras: Otras = [];
  const original = actual.sustituye_id ? await filaDe(c, "plantaciones", String(actual.sustituye_id), "FOR UPDATE") : undefined;
  if (original && original.estatus === "sustituido" && original.sustituido_por_id === id) {
    otras.push({ tabla: "plantaciones", fila: (await c.query<{ fila: Fila }>(
      `UPDATE srp.plantaciones SET estatus = 'activo', sustituido_por_id = NULL, editado_por_id = $2, fecha_ultima_edicion = ${AHORA}
        WHERE id = $1 RETURNING to_jsonb(plantaciones) - 'foto_base64' AS fila`,
      [original.id, u.id],
    )).rows[0].fila });
    await anotarCambio(c, u, "RESTAURADO", "plantacion", original.id, "Se eliminó su sustituto: vuelve a contar como plantado");
  }
  otras.push(...(await caducarReporte(c, u, actual.jornada_id, "se eliminó un árbol")));
  return recibido(fila, otras.length ? { otras } : {});
}

/* RESTAURACIÓN: vuelve a activo como está ahora, con el programa de su jornada y su fecha, salvo que la
   jornada ahora empiece después. Un sustituto que vuelve deja otra vez sustituido a su original, si nadie lo
   sustituyó entre tanto. */
export async function restaurarArbol(c: pg.PoolClient, u: Usuario, d: Record<string, unknown>): Promise<Resultado> {
  const leido = await arbolParaCambiar(c, d);
  if (esResultado(leido)) return leido;
  const { id, actual } = leido as { id: string; actual: Fila };
  if (!puede("registro.restaurar", u, comoObjeto(actual), await autoresDe(c, actual))) return sinPermiso(id, "registro.restaurar");
  if (actual.estatus === "activo") return recibido(actual, { repetido: true });
  if (actual.estatus !== "eliminado") return conVigente(rechazo(id, "NO_ELIMINADO", "Ese árbol está sustituido: no se restaura."), actual);
  if (!(await esVigente(c, "plantaciones", id, d.version))) return versionVieja(actual);

  const jornada = (await filaDe(c, "jornadas", String(actual.jornada_id), "FOR SHARE")) as Fila;
  const fila = (await c.query<{ fila: Fila }>(
    `UPDATE srp.plantaciones SET estatus = 'activo', fecha_plantacion = $2, programa_id = $3, editado_por_id = $4, fecha_ultima_edicion = ${AHORA}
      WHERE id = $1 RETURNING to_jsonb(plantaciones) - 'foto_base64' AS fila`,
    [id, fechaEnJornada(String(actual.fecha_plantacion), jornada), jornada.programa_id, u.id],
  )).rows[0].fila;
  await anotarCambio(c, u, "RESTAURADO", "plantacion", id, "Se deshizo la eliminación");
  const otras: Otras = [];
  const original = actual.sustituye_id ? await filaDe(c, "plantaciones", String(actual.sustituye_id), "FOR UPDATE") : undefined;
  if (original && original.estatus === "activo" && !original.sustituido_por_id) {
    otras.push({ tabla: "plantaciones", fila: (await c.query<{ fila: Fila }>(
      `UPDATE srp.plantaciones SET estatus = 'sustituido', sustituido_por_id = $2, editado_por_id = $3, fecha_ultima_edicion = ${AHORA}
        WHERE id = $1 RETURNING to_jsonb(plantaciones) - 'foto_base64' AS fila`,
      [original.id, id, u.id],
    )).rows[0].fila });
    await anotarCambio(c, u, "SUSTITUIDO", "plantacion", original.id, "Vuelve su sustituto: " + motivoSustitucion(actual));
  }
  otras.push(...(await caducarReporte(c, u, actual.jornada_id, "se restauró un árbol")));
  return conDuplicado(c, u, recibido(fila, otras.length ? { otras } : {}));
}

/* SUSTITUCIÓN de un árbol perdido: el sustituto entra en la jornada del original, con la fecha en que se
   planta y su propio folio, y el original pasa a «sustituido», en una sola operación. `id` es el del
   sustituto; `sustituye_id`, el del original. */
export async function sustituirArbol(c: pg.PoolClient, u: Usuario, d: Record<string, unknown>): Promise<Resultado> {
  const id = idDe(d.id);
  if (!id) return rechazo(null, "DATOS_INVALIDOS", "El sustituto no trae un identificador válido.");
  const previa = await filaDe(c, "plantaciones", id);
  if (previa) return conDuplicado(c, u, repetida(previa, u));
  if (!puede("registro.crear", u)) return sinPermiso(id, "registro.crear");
  const originalId = idDe(d.sustituye_id);
  const original = originalId ? await filaDe(c, "plantaciones", originalId, "FOR UPDATE") : undefined;
  if (!original) return rechazo(id, "NO_EXISTE", "El árbol que se sustituye no está en el servidor.");
  if (original.estatus !== "activo" || original.sustituido_por_id) {
    return { ...rechazo(id, "NO_SUSTITUIBLE", "Ese árbol ya no se puede sustituir: se eliminó o ya tiene sustituto."), otras: [{ tabla: "plantaciones", fila: original }] };
  }
  if (!puede("registro.sustituir", u, comoObjeto(original), await autoresDe(c, original))) return sinPermiso(id, "registro.sustituir");
  const jornada = await filaDe(c, "jornadas", String(original.jornada_id), "FOR SHARE");
  if (!jornada) return rechazo(id, "NO_EXISTE", "No se puede sustituir: la jornada de ese árbol ya no existe.");

  // Primero el motivo y la fecha de la sustitución, como el diálogo de la aplicación; luego el árbol nuevo
  const errores: Errores = [];
  const motivo = String(d.motivo_sustitucion ?? ""), otro = motivo === "OTRO" ? texto(d.motivo_sustitucion_otro) : "";
  if (!Object.hasOwn(MOTIVOS_SUSTITUCION, motivo)) errores.push(["motivo_sustitucion", "Elija por qué se sustituye."]);
  else if (motivo === "OTRO" && !otro) errores.push(["motivo_sustitucion_otro", "Escriba el motivo."]);
  else if (otro.length > 120) errores.push(["motivo_sustitucion_otro", "El motivo lleva hasta 120 caracteres."]);
  const fecha = d.fecha_plantacion;
  if (!esFecha(fecha)) errores.push(["fecha_plantacion", "Indique la fecha de la sustitución."]);
  else if (fecha > (await hoyEnLaCiudad(c))) errores.push(["fecha_plantacion", "La fecha de la sustitución no puede ser posterior a hoy."]);
  else if (antesDelPrograma(fecha)) errores.push(["fecha_plantacion", noAntes("La fecha de la sustitución")]);
  else if (fecha < String(original.fecha_plantacion)) errores.push(["fecha_plantacion", "La fecha de la sustitución no puede ser anterior a la plantación del árbol perdido (" + fechaCorta(String(original.fecha_plantacion)) + ")."]);
  const { especieId, especieOtra } = especieDe(d);
  const comentarios = texto(d.comentarios);
  const revisado = await revisarArbol(c, { ...d, especie_id: especieId, especie_otra: especieOtra, comentarios }, null);
  errores.push(...revisado.errores);
  if (errores.length) return rechazo(id, "DATOS_INVALIDOS", "Revise los datos de la sustitución.", ordenar(errores));

  const nuevo = await insertarArbol(c, u, { id, punto: revisado.punto as Punto, territorio: revisado.territorio as Territorio, especieId, especieOtra, comentarios,
    fecha: fecha as string, jornada, fotoId: idDe(d.foto_id), fechaRegistro: instante(d.fecha_registro), sustituye: { id: original.id, motivo, otro } });
  if (!nuevo) return conDuplicado(c, u, repetida((await filaDe(c, "plantaciones", id)) as Fila, u));
  let fila = nuevo;
  const texto2 = motivoSustitucion(fila);
  await anotarCambio(c, u, "CREADO", "plantacion", id, "Sustituye a " + (await especieComun(c, original)) + " (" + textoFolio(original) + "): " + texto2);
  const folio = await asignarFolio(c, u, fila);
  if ("folio" in folio) fila = { ...fila, folio: folio.folio };
  const otras: Otras = [{ tabla: "plantaciones", fila: (await c.query<{ fila: Fila }>(
    `UPDATE srp.plantaciones SET estatus = 'sustituido', sustituido_por_id = $2, editado_por_id = $3, fecha_ultima_edicion = ${AHORA}
      WHERE id = $1 RETURNING to_jsonb(plantaciones) - 'foto_base64' AS fila`,
    [original.id, id, u.id],
  )).rows[0].fila }];
  await anotarCambio(c, u, "SUSTITUIDO", "plantacion", original.id, "Sustituido por " + (await especieComun(c, fila)) + ": " + texto2);
  otras.push(...(await caducarReporte(c, u, jornada.id, "se sustituyó un árbol")));
  return conDuplicado(c, u, recibido(fila, { otras, ...("aviso" in folio ? { aviso: folio.aviso } : {}) }));
}

/* CAMBIO DE JORNADA, a otra del mismo cabo: el árbol toma el programa de la jornada destino. Si era del día
   de inicio de su jornada, toma también su fecha; si era de otro día, conserva la suya, nunca antes de que
   la jornada destino empiece. La jornada de origen pierde la marca de «revisado» de ese punto, y el reporte
   de las dos deja de estar vigente. */
export async function moverArbol(c: pg.PoolClient, u: Usuario, d: Record<string, unknown>): Promise<Resultado> {
  const leido = await arbolParaCambiar(c, d);
  if (esResultado(leido)) return leido;
  const { id, actual } = leido as { id: string; actual: Fila };
  if (!puede("registro.mover", u, comoObjeto(actual), await autoresDe(c, actual))) return sinPermiso(id, "registro.mover");
  if (actual.estatus !== "activo") return conVigente(rechazo(id, "NO_ACTIVO", "Ese árbol ya no está activo: no se mueve."), actual);
  const destinoId = idDe(d.jornada_id);
  const destino = destinoId ? await filaDe(c, "jornadas", destinoId, "FOR UPDATE") : undefined;
  if (!destino) return destinoId && (await seElimino(c, destinoId)) ? jornadaEliminada(id) : rechazo(id, "NO_EXISTE", "Esa jornada no está en el servidor.");
  if (actual.jornada_id === destino.id) return recibido(actual, { repetido: true });
  if (!(await esVigente(c, "plantaciones", id, d.version))) return versionVieja(actual);
  if (destino.cabo_id !== actual.cabo_id) return conVigente(rechazo(id, "OTRO_CABO", "Sólo se mueve a otra jornada del mismo cabo."), actual);

  const origen = await filaDe(c, "jornadas", String(actual.jornada_id), "FOR UPDATE");
  const cambiaPrograma = actual.programa_id !== destino.programa_id;
  const sigue = !origen || actual.fecha_plantacion === origen.fecha;
  const fecha = sigue ? String(destino.fecha) : fechaEnJornada(String(actual.fecha_plantacion), destino);
  const tomaFecha = sigue || fecha !== actual.fecha_plantacion;
  const que = [tomaFecha ? "su fecha" : "", cambiaPrograma ? "su programa" : ""].filter(Boolean).join(" y ");
  const fila = (await c.query<{ fila: Fila }>(
    `UPDATE srp.plantaciones SET jornada_id = $2, fecha_plantacion = $3, programa_id = $4, editado_por_id = $5, fecha_ultima_edicion = ${AHORA}
      WHERE id = $1 RETURNING to_jsonb(plantaciones) - 'foto_base64' AS fila`,
    [id, destino.id, fecha, destino.programa_id, u.id],
  )).rows[0].fila;
  await anotarCambio(c, u, "EDITADO", "plantacion", id,
    "Movido a la jornada «" + String(destino.nombre) + "»" + (que ? "; toma " + que : "; conserva su fecha, " + fechaCorta(fecha)));
  const otras: Otras = [];
  const revisado = !!origen && ((origen.puntos_revisados as string[] | undefined) ?? []).includes(id);
  if (origen && (revisado || origen.reporte_en)) {
    otras.push({ tabla: "jornadas" as Tabla, fila: (await c.query<{ fila: Fila }>(
      `UPDATE srp.jornadas SET puntos_revisados = array_remove(puntos_revisados, $2::uuid), reporte_en = NULL, editado_por_id = $3, fecha_ultima_edicion = ${AHORA}
        WHERE id = $1 RETURNING to_jsonb(jornadas) AS fila`,
      [origen.id, id, u.id],
    )).rows[0].fila });
    await anotarCambio(c, u, "EDITADO", "jornada", origen.id, [revisado ? "Sale un punto revisado: se movió a «" + String(destino.nombre) + "»" : "Sale un árbol: se movió a «" + String(destino.nombre) + "»",
      origen.reporte_en ? "su reporte deja de estar vigente" : ""].filter(Boolean).join("; "));
  }
  otras.push(...(await caducarReporte(c, u, destino.id, "recibió un árbol de otra jornada")));
  return recibido(fila, otras.length ? { otras } : {});
}
