import { randomUUID } from "node:crypto";
import { Router, type Request, type RequestHandler, type Response } from "express";
import type pg from "pg";
import { sesionDe } from "./acceso";
import { anotarCambio } from "./bitacora";
import { responder } from "./errores";
import { exigirPermiso, SEDEMA } from "./permisos";
import { cerrarDeCuenta, type Consultable } from "./sesiones";
import { enTransaccion } from "./transaccion";

/* CATÁLOGOS: programas, áreas, especies, vehículos, instituciones y solicitantes, con las reglas del
   editor de catálogos de la aplicación (js/catalogos.js). Una prueba compara la validación con la de la
   aplicación, caso por caso.

   GET    /catalogos                       los seis, completos, también lo inactivo   Con sesión
   GET    /catalogos/:tabla/usos           cuántos árboles, jornadas y cuentas usan cada valor
   POST   /catalogos/:tabla                alta
   PUT    /catalogos/:tabla/:id            edición (en instituciones, sólo el nombre), con la versión del valor
   POST   /catalogos/:tabla/:id/estado     { activo } → activa o desactiva; una institución desactivada cierra las
                                           sesiones de sus cuentas
   DELETE /catalogos/:tabla/:id            elimina un valor sin uso
   Salvo la lectura, todo es de quien administra catálogos: la Administración global.

   Un valor con uso no se elimina: se desactiva, y deja de ofrecerse sin que cambien los registros que lo
   usan. Las instituciones no se eliminan; las 16 alcaldías ya vienen dadas de alta y sólo se activan y
   desactivan; la Secretaría no se desactiva, porque sus cuentas administran el sistema. Todo cambio va a la
   bitácora, con la forma que le da la aplicación. */

export const TABLAS = ["programas", "areas", "especies", "vehiculos", "instituciones", "solicitantes"] as const;
export type Tabla = (typeof TABLAS)[number];
const esTabla = (t: string): t is Tabla => (TABLAS as readonly string[]).includes(t);

// El nombre que la aplicación da a cada catálogo; es el que va en la bitácora
export const TIPO_DE_TABLA: Record<Tabla, string> = {
  programas: "programa", areas: "area", especies: "especie", vehiculos: "vehiculo", instituciones: "organizacion", solicitantes: "solicitante",
};

export const TIPOS_INSTITUCION = ["Alcaldía", "Gobierno de la CDMX", "Empresa privada", "Organización civil"];
export const TIPOS_SOLICITANTE = ["Dependencia de gobierno", "Alcaldía", "Congreso", "Empresa", "Organización civil", "Escuela", "Vecinos"];
export const DISTRIBUCIONES = ["Nativa", "Endémica", "Exótica", "Exótica-Invasora"];
export const PALETA = ["Sí", "No"];
export const FRUTO = ["Sí", "No", "Por determinar"];

// Los campos propios de cada tabla, además de los comunes
const PROPIOS: Record<Tabla, string[]> = {
  programas: ["tipos_organizacion"],
  areas: [],
  especies: ["nombre_cientifico", "otros_nombres_comunes", "tipo_distribucion", "formadecrecimiento", "paleta_vegetal", "fruto_comestible", "id_snib", "id_enciclovida"],
  vehiculos: ["modelo", "tipo_vehiculo"],
  instituciones: ["tipo_organizacion"],
  solicitantes: ["tipo_solicitante"],
};

/* Quién usa cada valor: las mismas relaciones con que la aplicación cuenta el uso (una prueba las compara
   con las llaves foráneas de la base). La bitácora no cuenta: es la constancia. */
type Origen = "plantaciones" | "jornadas" | "usuarios";
export const REFERENCIAS: Record<Tabla, [Origen, string][]> = {
  programas: [["plantaciones", "programa_id"], ["jornadas", "programa_id"]],
  areas: [["usuarios", "area_id"]],
  especies: [["plantaciones", "especie_id"]],
  vehiculos: [["jornadas", "vehiculo_id"]],
  instituciones: [["jornadas", "organizacion_id"], ["usuarios", "organizacion_id"]],
  solicitantes: [["jornadas", "solicitante_id"]],
};

export interface Fila {
  id: string;
  clave: string;
  nombre: string;
  activo: boolean;
  [campo: string]: unknown;
}
export type Datos = Record<string, unknown> & { nombre: string; clave: string };

// Sin acentos, en minúsculas y sin espacios a la orilla: así se comparan los nombres
export const normalizar = (t: unknown): string => String(t ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
// 'Reforestación Urbana' → 'REFORESTACION_URBANA'
export const claveDesdeNombre = (nombre: unknown): string =>
  normalizar(nombre).toUpperCase().replace(/[^A-Z0-9]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 30).replace(/_+$/, "");
// La placa sin espacios ni guiones: «1234AB» y «1234 AB» son la misma
export const clavePlaca = (placa: unknown): string => String(placa ?? "").toUpperCase().replace(/[^A-Z0-9]/g, "");
// Una alcaldía no se renombra: son las 16 de la Ciudad
export const esFija = (tabla: Tabla, c: Fila): boolean => tabla === "instituciones" && c.tipo_organizacion === "Alcaldía";

// Si la clave ya existe, agrega _2, _3… hasta encontrar una libre
export function claveLibre(usadas: string[], base: string): string {
  if (!base) return "";
  if (!usadas.includes(base)) return base;
  for (let n = 2; n < 100; n++) {
    const tope = base.slice(0, 30 - String(n).length - 1);
    if (!usadas.includes(tope + "_" + n)) return tope + "_" + n;
  }
  return base;
}

// El id_especie que sigue: consecutivo después del mayor en uso
export function siguienteClaveEspecie(existentes: Fila[]): string {
  const n = existentes.filter((c) => /^ESP-\d{4}$/.test(c.clave)).reduce((m, c) => Math.max(m, parseInt(c.clave.slice(4), 10)), 0);
  return "ESP-" + String(n + 1).padStart(4, "0");
}

const limpio = (v: unknown): string => String(v ?? "").trim().replace(/\s+/g, " ");
const lista = (v: unknown): string => limpio(v).split(",").map((t) => t.trim()).filter(Boolean).join(", ");

/** Lo que se guarda, a partir de lo que llega: los mismos recortes y claves que el formulario de la
 *  aplicación. La clave de instituciones, solicitantes y vehículos la pone el sistema; la de especies es el
 *  consecutivo; la de programas y áreas la da quien administra (la aplicación la sugiere del nombre). */
export function datosDe(tabla: Tabla, b: Record<string, unknown>, editando: Fila | null, existentes: Fila[]): Datos {
  const enciclovida = typeof b.id_enciclovida === "number" ? String(b.id_enciclovida) : limpio(b.id_enciclovida);
  const tipoVehiculo = limpio(b.tipo_vehiculo);
  const d: Datos = {
    nombre: limpio(b.nombre),
    clave: String(b.clave ?? "").trim().toUpperCase(),
    nombre_cientifico: limpio(b.nombre_cientifico),
    tipo_distribucion: String(b.tipo_distribucion ?? ""),
    otros_nombres_comunes: lista(b.otros_nombres_comunes),
    formadecrecimiento: lista(b.formadecrecimiento),
    paleta_vegetal: String(b.paleta_vegetal ?? ""),
    fruto_comestible: String(b.fruto_comestible ?? ""),
    id_snib: limpio(b.id_snib).toUpperCase() || null,
    id_enciclovida: enciclovida === "" ? null : /^\d+$/.test(enciclovida) ? parseInt(enciclovida, 10) : NaN,
    modelo: limpio(b.modelo),
    tipo_vehiculo: tipoVehiculo ? tipoVehiculo.charAt(0).toUpperCase() + tipoVehiculo.slice(1) : "",
    tipo_organizacion: String(b.tipo_organizacion ?? ""),
    tipo_solicitante: String(b.tipo_solicitante ?? ""),
    tipos_organizacion: Array.isArray(b.tipos_organizacion) ? b.tipos_organizacion.map(String) : [],
  };
  const usadas = existentes.map((c) => c.clave);
  if (tabla === "instituciones") d.clave = editando ? editando.clave : claveLibre(usadas, claveDesdeNombre(d.nombre) || "INSTITUCION");
  if (tabla === "solicitantes") d.clave = editando ? editando.clave : claveLibre(usadas, claveDesdeNombre(d.nombre) || "SOLICITANTE");
  if (tabla === "vehiculos") {
    d.nombre = d.nombre.toUpperCase();
    d.clave = editando ? editando.clave : clavePlaca(d.nombre);
  }
  if (tabla === "especies" && !editando && !d.clave) d.clave = siguienteClaveEspecie(existentes);
  return d;
}

// Los largos máximos, los mismos que la pantalla (maxlength) y que las columnas de la base
export const LARGOS = { nombre: 120, nombre_cientifico: 140, otros_nombres_comunes: 400, modelo: 40, tipo_vehiculo: 30 };
const LARGO_NOMBRE = "El nombre lleva hasta " + LARGOS.nombre + " caracteres.";

/** Las reglas del formulario de catálogos de la aplicación, una por una. `existentes`: los renglones de
 *  la tabla, también los inactivos; `editando`: el que se edita, o null en un alta. Devuelve
 *  [campo, mensaje] por cada error. */
export function validarCatalogo(tabla: Tabla, d: Datos, existentes: Fila[], editando: Fila | null): [string, string][] {
  const e: [string, string][] = [];
  const mismos = existentes.filter((c) => !editando || c.id !== editando.id);
  const repetido = (campo: string, valor: unknown) => mismos.some((c) => normalizar(c[campo]) === normalizar(valor));
  if (tabla === "vehiculos") {
    if (!d.nombre) e.push(["nombre", "Escriba la placa."]);
    else if (!/^[A-Z0-9][A-Z0-9 -]{2,10}[A-Z0-9]$/.test(d.nombre) || !/\d/.test(d.nombre)) e.push(["nombre", "La placa lleva de 4 a 12 letras y números, con espacios o guiones: «1234 AB»."]);
    else if (mismos.some((c) => clavePlaca(c.nombre) === clavePlaca(d.nombre))) e.push(["nombre", "Ya existe un vehículo con esa placa."]);
    if (!d.modelo) e.push(["modelo", "Escriba el modelo."]);
    else if (String(d.modelo).length > LARGOS.modelo) e.push(["modelo", "El modelo lleva hasta " + LARGOS.modelo + " caracteres."]);
    if (!d.tipo_vehiculo) e.push(["tipo_vehiculo", "Escriba el tipo de vehículo."]);
    else if (String(d.tipo_vehiculo).length > LARGOS.tipo_vehiculo) e.push(["tipo_vehiculo", "El tipo de vehículo lleva hasta " + LARGOS.tipo_vehiculo + " caracteres."]);
    return e;
  }
  // Institución: tipo al agregarla (nunca Alcaldía), nombre único entre todas; una alcaldía no se renombra
  if (tabla === "instituciones") {
    if (!editando && !d.tipo_organizacion) e.push(["tipo_organizacion", "Elija el tipo de institución."]);
    else if (!editando && d.tipo_organizacion === "Alcaldía") e.push(["tipo_organizacion", "Las alcaldías ya están dadas de alta: actívela en la lista."]);
    if (!d.nombre) e.push(["nombre", "Escriba el nombre."]);
    else if (d.nombre.length > LARGOS.nombre) e.push(["nombre", LARGO_NOMBRE]);
    else if (repetido("nombre", d.nombre)) e.push(["nombre", "Ya existe una institución con ese nombre."]);
    if (editando && esFija(tabla, editando)) e.push(["nombre", "Las alcaldías no se renombran."]);
    return e;
  }
  if (tabla === "solicitantes") {
    if (!d.nombre) e.push(["nombre", "Escriba el nombre."]);
    else if (d.nombre.length > LARGOS.nombre) e.push(["nombre", LARGO_NOMBRE]);
    else if (repetido("nombre", d.nombre)) e.push(["nombre", "Ya existe un solicitante con ese nombre."]);
    if (!TIPOS_SOLICITANTE.includes(String(d.tipo_solicitante))) e.push(["tipo_solicitante", "Elija el tipo de solicitante."]);
    return e;
  }
  if (!d.nombre) e.push(["nombre", "Escriba el nombre."]);
  else if (d.nombre.length > LARGOS.nombre) e.push(["nombre", LARGO_NOMBRE]);
  else if (repetido("nombre", d.nombre)) e.push(["nombre", "Ya existe un valor con ese nombre."]);
  if (!editando) {
    if (tabla === "especies") {
      if (!/^ESP-\d{4}$/.test(d.clave)) e.push(["clave", "La clave de especie es ESP-0000."]);
    } else if (!/^[A-Z0-9_]{2,30}$/.test(d.clave)) e.push(["clave", "La clave debe tener de 2 a 30 caracteres: mayúsculas, números o guion bajo."]);
    else if (mismos.some((c) => c.clave === d.clave)) e.push(["clave", "Esa clave ya está en uso."]);
  }
  if (tabla === "especies") {
    const cientifico = String(d.nombre_cientifico);
    if (!cientifico) e.push(["nombre_cientifico", "Escriba el nombre científico."]);
    else if (cientifico.length > LARGOS.nombre_cientifico) e.push(["nombre_cientifico", "El nombre científico lleva hasta " + LARGOS.nombre_cientifico + " caracteres."]);
    else if (!/^[A-ZÁÉÍÓÚ][a-záéíóú-]+ \S+/.test(cientifico)) e.push(["nombre_cientifico", "El nombre científico lleva género con inicial mayúscula y epíteto: «Quercus rugosa»."]);
    else if (repetido("nombre_cientifico", cientifico)) e.push(["nombre_cientifico", "Ya existe una especie con ese nombre científico."]);
    if (String(d.otros_nombres_comunes).length > LARGOS.otros_nombres_comunes) e.push(["otros_nombres_comunes", "Otros nombres comunes lleva hasta " + LARGOS.otros_nombres_comunes + " caracteres."]);
    if (!PALETA.includes(String(d.paleta_vegetal))) e.push(["paleta_vegetal", "Diga si la especie pertenece a la paleta vegetal de la Secretaría."]);
    if (!FRUTO.includes(String(d.fruto_comestible))) e.push(["fruto_comestible", "Diga si su fruto es comestible; si aún no se sabe, elija «Por determinar»."]);
    if (d.id_enciclovida !== null && !Number.isInteger(d.id_enciclovida)) e.push(["id_enciclovida", "El id de EncicloVida es un número entero."]);
    if (d.id_snib && !/^\d+(ANGIO|GIMNO)$/.test(String(d.id_snib))) e.push(["id_snib", "El id SNIB es un número seguido de ANGIO o GIMNO: «26796ANGIO»."]);
  }
  return e;
}

/* Lo que en la aplicación limita la pantalla (una lista para elegir) y aquí se revisa, porque al servidor
   le puede llegar cualquier cosa. */
function revisarOpciones(tabla: Tabla, d: Datos, existentes: Fila[], editando: Fila | null): [string, string][] {
  const e: [string, string][] = [];
  if (tabla === "instituciones" && !editando && d.tipo_organizacion && !TIPOS_INSTITUCION.includes(String(d.tipo_organizacion))) e.push(["tipo_organizacion", "Elija el tipo de institución."]);
  if (tabla === "programas" && (d.tipos_organizacion as string[]).some((t) => !TIPOS_INSTITUCION.includes(t))) e.push(["tipos_organizacion", "Elija los tipos de institución de la lista."]);
  if (tabla === "especies" && !DISTRIBUCIONES.includes(String(d.tipo_distribucion))) e.push(["tipo_distribucion", "Elija el tipo de distribución."]);
  // El consecutivo de especies lo sugiere la aplicación; dos altas al mismo tiempo no deben tomar el mismo
  if (tabla === "especies" && !editando && existentes.some((c) => c.clave === d.clave)) e.push(["clave", "Esa clave ya está en uso."]);
  return e;
}

// Los campos que se guardan de cada tabla; en instituciones, el tipo se fija al darla de alta
function valoresDe(tabla: Tabla, d: Datos, editando: Fila | null): Record<string, unknown> {
  const v: Record<string, unknown> = { nombre: d.nombre };
  for (const campo of PROPIOS[tabla]) v[campo] = d[campo];
  if (tabla === "programas") v.tipos_organizacion = TIPOS_INSTITUCION.filter((t) => (d.tipos_organizacion as string[]).includes(t));
  if (tabla === "instituciones" && editando) v.tipo_organizacion = editando.tipo_organizacion;
  return v;
}

const NOMBRES_ORIGEN: Record<Origen, [string, string]> = { plantaciones: ["árbol", "árboles"], jornadas: ["jornada", "jornadas"], usuarios: ["cuenta", "cuentas"] };

// «12 árboles, 3 jornadas y 1 cuenta»; '' si nada lo usa
export function textoUsos(u: Partial<Record<Origen, number>> | undefined): string {
  const partes = (Object.keys(NOMBRES_ORIGEN) as Origen[]).filter((t) => u?.[t]).map((t) => u![t] + " " + NOMBRES_ORIGEN[t][u![t] === 1 ? 0 : 1]);
  return partes.length > 1 ? partes.slice(0, -1).join(", ") + " y " + partes[partes.length - 1] : partes[0] || "";
}

// Cuántos renglones de cada tabla usan cada valor (o sólo `id`)
async function usosDe(bd: Consultable, tabla: Tabla, id: string | null = null): Promise<Record<string, Partial<Record<Origen, number>>>> {
  const usos: Record<string, Partial<Record<Origen, number>>> = {};
  for (const [origen, campo] of REFERENCIAS[tabla]) {
    const { rows } = await bd.query<{ id: string; n: number }>(
      `SELECT ${campo} AS id, count(*)::int AS n FROM srp.${origen} WHERE ${campo} IS NOT NULL${id ? ` AND ${campo} = $1` : ""} GROUP BY ${campo}`,
      id ? [id] : [],
    );
    for (const r of rows) (usos[r.id] ??= {})[origen] = r.n;
  }
  return usos;
}

const filasDe = async (bd: Consultable, tabla: Tabla): Promise<Fila[]> => (await bd.query<{ fila: Fila }>(`SELECT to_jsonb(x) AS fila FROM srp.${tabla} x ORDER BY x.id`)).rows.map((r) => r.fila);

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

/* LA VERSIÓN DE UN VALOR DE CATÁLOGO O DE UNA CUENTA: el momento de su último cambio, o el de su alta. La edición
   la trae como la conoció quien la abrió; si otra Administración la cambió mientras tanto, no se escribe encima,
   como con árboles y jornadas (S-16). Se compara al milésimo, la precisión con que viaja. Sin versión —una
   aplicación de antes— no se revisa. */
export async function mismaVersion(c: pg.PoolClient, tabla: "usuarios" | Tabla, id: string, version: unknown): Promise<boolean> {
  if (version === undefined || version === null) return true;
  if (typeof version !== "string" || Number.isNaN(Date.parse(version))) return false;
  const r = await c.query<{ igual: boolean }>(
    `SELECT date_trunc('milliseconds', coalesce(fecha_ultima_edicion, fecha_creacion)) = date_trunc('milliseconds', $2::timestamptz) AS igual FROM srp.${tabla} WHERE id = $1`,
    [id, version],
  );
  return r.rows[0]?.igual === true;
}

export function rutasCatalogos(pool: pg.Pool, sesion: RequestHandler): Router {
  const r = Router();
  const administrar = exigirPermiso("catalogo.administrar");

  // La tabla de la ruta, si es un catálogo; si no, la respuesta ya se dio
  const tablaDe = (req: Request, res: Response): Tabla | null => {
    const t = String(req.params.tabla);
    if (esTabla(t)) return t;
    responder(res, 404, "NO_EXISTE", "Ese catálogo no existe.");
    return null;
  };

  // En una transacción con las fechas en UTC, que es como salen en las consultas
  const enUtc = <T>(trabajo: (c: pg.PoolClient) => Promise<T>) =>
    enTransaccion(pool, async (c) => {
      await c.query("SET LOCAL TIME ZONE 'UTC'");
      return trabajo(c);
    });

  r.get("/catalogos", sesion, async (req: Request, res: Response) => {
    const todo = await enUtc(async (c) => {
      const salida: Partial<Record<Tabla, Fila[]>> = {};
      for (const t of TABLAS) salida[t] = await filasDe(c, t);
      return salida;
    });
    res.json(todo);
  });

  r.get("/catalogos/:tabla/usos", sesion, administrar, async (req: Request, res: Response) => {
    const tabla = tablaDe(req, res);
    if (tabla) res.json(await usosDe(pool, tabla));
  });

  r.post("/catalogos/:tabla", sesion, administrar, async (req: Request, res: Response) => {
    const tabla = tablaDe(req, res);
    if (!tabla) return;
    const actor = sesionDe(res).usuario, b = req.body ?? {};
    const resultado = await enUtc(async (c) => {
      // Las altas de un mismo catálogo van una tras otra: la clave sugerida y el consecutivo no se repiten
      await c.query(`LOCK TABLE srp.${tabla} IN SHARE ROW EXCLUSIVE MODE`);
      const existentes = await filasDe(c, tabla);
      const d = datosDe(tabla, b, null, existentes);
      const errores = [...validarCatalogo(tabla, d, existentes, null), ...revisarOpciones(tabla, d, existentes, null)];
      if (errores.length) return { errores };
      // En especies el id es la propia clave ESP-0000: es la llave del catálogo del SIA
      const id = tabla === "especies" ? d.clave : typeof b.id === "string" && UUID.test(b.id) ? b.id : randomUUID();
      const valores = valoresDe(tabla, d, null);
      const campos = ["id", "clave", "activo", "creado_por_id", ...Object.keys(valores)];
      const fila = (await c.query<{ fila: Fila }>(
        `INSERT INTO srp.${tabla} (${campos.join(", ")}, fecha_creacion) VALUES (${campos.map((_, i) => "$" + (i + 1)).join(", ")}, now())
         RETURNING to_jsonb(${tabla}) AS fila`,
        [id, d.clave, true, actor.id, ...Object.values(valores)],
      )).rows[0].fila;
      await anotarCambio(c, actor, "CREADO", "catalogo", id, TIPO_DE_TABLA[tabla] + " " + d.clave);
      return { fila };
    });
    if ("errores" in resultado) return res.status(400).json({ codigo: "DATOS_INVALIDOS", mensaje: "Revise los datos del catálogo.", errores: resultado.errores });
    res.status(201).json(resultado.fila);
  });

  r.put("/catalogos/:tabla/:id", sesion, administrar, async (req: Request, res: Response) => {
    const tabla = tablaDe(req, res);
    if (!tabla) return;
    const actor = sesionDe(res).usuario, id = String(req.params.id), b = req.body ?? {};
    const resultado = await enUtc(async (c) => {
      await c.query(`LOCK TABLE srp.${tabla} IN SHARE ROW EXCLUSIVE MODE`);
      const existentes = await filasDe(c, tabla);
      const previo = existentes.find((x) => x.id === id);
      if (!previo) return null;
      if (!(await mismaVersion(c, tabla, id, b.version))) return { vieja: true };
      const d = datosDe(tabla, b, previo, existentes);
      const errores = [...validarCatalogo(tabla, d, existentes, previo), ...revisarOpciones(tabla, d, existentes, previo)];
      if (errores.length) return { errores };
      const valores = valoresDe(tabla, d, previo);
      const cambiados = Object.keys(valores).filter((k) => String(previo[k] ?? "") !== String(valores[k] ?? ""));
      const campos = Object.keys(valores);
      const fila = (await c.query<{ fila: Fila }>(
        `UPDATE srp.${tabla} SET ${campos.map((k, i) => `${k} = $${i + 2}`).join(", ")}, editado_por_id = $${campos.length + 2}, fecha_ultima_edicion = now()
          WHERE id = $1 RETURNING to_jsonb(${tabla}) AS fila`,
        [id, ...Object.values(valores), actor.id],
      )).rows[0].fila;
      await anotarCambio(c, actor, "EDITADO", "catalogo", id, "Campos: " + (cambiados.join(", ") || "ninguno"));
      return { fila };
    });
    if (!resultado) return responder(res, 404, "NO_EXISTE", "Ese valor no existe en el catálogo.");
    if ("vieja" in resultado) return responder(res, 409, "VERSION_VIEJA", "Alguien más cambió este valor mientras usted lo editaba.");
    if ("errores" in resultado) return res.status(400).json({ codigo: "DATOS_INVALIDOS", mensaje: "Revise los datos del catálogo.", errores: resultado.errores });
    res.json(resultado.fila);
  });

  r.post("/catalogos/:tabla/:id/estado", sesion, administrar, async (req: Request, res: Response) => {
    const tabla = tablaDe(req, res);
    if (!tabla) return;
    const actor = sesionDe(res).usuario, id = String(req.params.id), activo = req.body?.activo;
    if (typeof activo !== "boolean") return responder(res, 400, "FALTAN_DATOS", "Diga si el valor queda activo o no.");
    if (tabla === "instituciones" && id === SEDEMA && !activo) return responder(res, 400, "PROTEGIDO", "La Secretaría no se desactiva: sus cuentas administran el sistema.");
    const fila = await enUtc(async (c) => {
      const previo = (await c.query<{ activo: boolean }>(`SELECT activo FROM srp.${tabla} WHERE id = $1 FOR UPDATE`, [id])).rows[0];
      if (!previo) return null;
      const actual = (await c.query<{ fila: Fila }>(
        previo.activo === activo
          ? `SELECT to_jsonb(x) AS fila FROM srp.${tabla} x WHERE id = $1`
          : `UPDATE srp.${tabla} SET activo = $2, editado_por_id = $3, fecha_ultima_edicion = now() WHERE id = $1 RETURNING to_jsonb(${tabla}) AS fila`,
        previo.activo === activo ? [id] : [id, activo, actor.id],
      )).rows[0].fila;
      // Si ya estaba así, no hay cambio que anotar
      if (previo.activo !== activo) await anotarCambio(c, actor, activo ? "ACTIVADO" : "DESACTIVADO", "catalogo", id);
      // Una institución desactivada deja fuera a sus cuentas al momento, como al desactivar una cuenta
      if (tabla === "instituciones" && previo.activo && !activo) {
        for (const x of (await c.query<{ id: string }>("SELECT id FROM srp.usuarios WHERE organizacion_id = $1", [id])).rows) await cerrarDeCuenta(c, x.id, "INSTITUCION_DESACTIVADA");
      }
      return actual;
    });
    if (!fila) return responder(res, 404, "NO_EXISTE", "Ese valor no existe en el catálogo.");
    res.json(fila);
  });

  r.delete("/catalogos/:tabla/:id", sesion, administrar, async (req: Request, res: Response) => {
    const tabla = tablaDe(req, res);
    if (!tabla) return;
    const actor = sesionDe(res).usuario, id = String(req.params.id);
    if (tabla === "instituciones") return responder(res, 400, "NO_SE_ELIMINA", "Las instituciones no se eliminan: se desactivan, y sus cuentas dejan de entrar.");
    const eliminar = () => enTransaccion(pool, async (c) => {
      const fila = (await c.query<Fila>(`SELECT * FROM srp.${tabla} WHERE id = $1 FOR UPDATE`, [id])).rows[0];
      if (!fila) return null;
      // Se cuenta justo antes de decidir; la llave foránea de la base lo impide de todos modos
      const usos = textoUsos((await usosDe(c, tabla, id))[id]);
      if (usos) return { usos };
      await c.query(`DELETE FROM srp.${tabla} WHERE id = $1`, [id]);
      await anotarCambio(c, actor, "ELIMINADO", "catalogo", id, TIPO_DE_TABLA[tabla] + " " + fila.clave + ": " + fila.nombre);
      return { ok: true };
    });
    // Si alguien lo empezó a usar entre la cuenta y el borrado, la llave foránea de la base lo detiene
    const resultado = await eliminar().catch((e: { code?: string }) => {
      if (e?.code === "23503") return { usos: "otro registro" };
      throw e;
    });
    if (!resultado) return responder(res, 404, "NO_EXISTE", "Ese valor no existe en el catálogo.");
    if ("usos" in resultado) return responder(res, 409, "EN_USO", "No se puede eliminar: aparece en " + resultado.usos + ". Desactívelo: eso sí se deshace.");
    res.json({ ok: true });
  });

  return r;
}
