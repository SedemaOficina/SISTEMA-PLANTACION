import type { NextFunction, Request, RequestHandler, Response } from "express";
import { sesionDe } from "./acceso";
import { responder } from "./errores";
import type { Usuario } from "./sesiones";

/* REGLAS DE PERFIL EN EL SERVIDOR. Son las de la aplicación (js/permisos.js): perfiles, alcance y
   acciones. Aquí se imponen; la pantalla sólo las refleja. Una prueba las compara una por una con las de
   la aplicación, para que no se separen: si cambia una regla, cambia en los dos lados.

   El alcance dice qué registros toca cada quien: el cabo, los suyos; el coordinador, los suyos y los de
   los cabos que lo tienen asignado; el directivo, todo si es de la Secretaría y sólo lo de su institución
   si es de otra; la Administración global, todo. Un perfil que no existe no recibe nada. */

export type Alcance = "propios" | "equipo" | "institucion" | "todos" | "ninguno";

export interface Capacidades {
  etiqueta: string;
  alcance: Alcance;
  registrar: boolean;
  editar: boolean;
  eliminar: boolean;
  eliminarJornadaVacia: boolean;
  relevar: boolean;
  catalogos: boolean;
  usuarios: boolean;
  galeria: boolean;
}

export const SEDEMA = "o-sedema";

export const PERFILES: Readonly<Record<string, Capacidades>> = {
  CABO: { etiqueta: "Cabo", alcance: "propios", registrar: true, editar: true, eliminar: true, eliminarJornadaVacia: true, relevar: false, catalogos: false, usuarios: false, galeria: true },
  COORDINADOR: { etiqueta: "Coordinador", alcance: "equipo", registrar: true, editar: true, eliminar: true, eliminarJornadaVacia: true, relevar: true, catalogos: false, usuarios: false, galeria: true },
  DIRECTIVO: { etiqueta: "Directivo", alcance: "todos", registrar: false, editar: false, eliminar: false, eliminarJornadaVacia: false, relevar: false, catalogos: false, usuarios: false, galeria: true },
  ADMIN: { etiqueta: "Administración global", alcance: "todos", registrar: false, editar: true, eliminar: true, eliminarJornadaVacia: true, relevar: false, catalogos: true, usuarios: true, galeria: true },
};

export const SIN_PERMISOS: Capacidades = {
  etiqueta: "Perfil no reconocido", alcance: "ninguno", registrar: false, editar: false, eliminar: false, eliminarJornadaVacia: false,
  relevar: false, catalogos: false, usuarios: false, galeria: false,
};

/** Lo que de la cuenta deciden las reglas. */
export type Cuenta = Pick<Usuario, "id" | "perfil" | "organizacion_id">;

/** De quien capturó o tuvo a su cargo un registro: su institución y sus coordinadores. */
export interface Autor {
  organizacion_id: string;
  coordinadores_ids: string[];
}
export type Autores = ReadonlyMap<string, Autor>;

/** Un árbol o una jornada: los campos con que se decide. */
export interface Objeto {
  cabo_id?: string | null;
  relevo_id?: string | null;
  relevos?: { cabo_id?: string | null }[] | null;
  organizacion_id?: string | null;
  estatus?: string | null;
  sustituido_por_id?: string | null;
}

export function capacidadesDe(u: Pick<Usuario, "perfil" | "organizacion_id">): Capacidades {
  const p = Object.hasOwn(PERFILES, u.perfil) ? PERFILES[u.perfil] : undefined;
  if (!p) return SIN_PERMISOS;
  return u.perfil === "DIRECTIVO" && u.organizacion_id !== SEDEMA ? { ...p, alcance: "institucion" } : p;
}

/** Quién responde de un registro: en un árbol, el cabo que lo capturó; en una jornada, su titular y los
 *  cabos que la recibieron en relevo, aunque después la hayan devuelto. */
export function personasDe(x: Objeto): string[] {
  return [x.cabo_id, x.relevo_id, ...(x.relevos ?? []).map((r) => r.cabo_id)].filter((id): id is string => Boolean(id));
}

export function alcanza(u: Cuenta, x: Objeto, autores: Autores): boolean {
  const alcance = capacidadesDe(u).alcance;
  if (alcance === "ninguno") return false;
  if (alcance === "todos") return true;
  const personas = personasDe(x);
  // De la institución: la jornada dice la suya; el árbol, la de quien lo capturó
  if (alcance === "institucion") {
    if (x.organizacion_id) return x.organizacion_id === u.organizacion_id;
    return personas.some((id) => autores.get(id)?.organizacion_id === u.organizacion_id);
  }
  if (personas.includes(u.id)) return true;
  if (alcance === "equipo") return personas.some((id) => (autores.get(id)?.coordinadores_ids ?? []).includes(u.id));
  return false;
}

/** Qué árboles se ven: los de su alcance y, en una jornada donde estuvo de relevo sin ser su titular,
 *  todos los de esa jornada. */
export function veArbol(u: Cuenta, arbol: Objeto, jornada: Objeto | null, autores: Autores): boolean {
  if (alcanza(u, arbol, autores)) return true;
  return !!jornada && jornada.cabo_id !== u.id && personasDe(jornada).includes(u.id) && alcanza(u, jornada, autores);
}

type Regla = (p: Capacidades, u: Cuenta, x: Objeto, autores: Autores) => boolean;

// Lo que exige cada acción. El texto completa «No tiene permiso para …», como en la aplicación
export const ACCIONES = {
  "registro.crear": { texto: "registrar árboles", regla: (p) => p.registrar },
  "registro.editar": { texto: "editar este registro", regla: (p, u, x, a) => p.editar && alcanza(u, x, a) },
  "registro.eliminar": { texto: "eliminar este registro", regla: (p, u, x, a) => p.eliminar && alcanza(u, x, a) },
  "registro.restaurar": { texto: "restaurar este registro", regla: (p, u, x, a) => p.eliminar && alcanza(u, x, a) },
  // Sustituir un árbol perdido: quien registra, sobre un árbol activo de su alcance que no tenga ya sustituto
  "registro.sustituir": { texto: "sustituir este árbol", regla: (p, u, x, a) => p.registrar && x.estatus === "activo" && !x.sustituido_por_id && alcanza(u, x, a) },
  "registro.mover": { texto: "mover este registro de jornada", regla: (p, u, x, a) => p.editar && alcanza(u, x, a) },
  "jornada.crear": { texto: "iniciar jornadas", regla: (p) => p.registrar },
  "jornada.editar": { texto: "modificar esta jornada", regla: (p, u, x, a) => p.editar && alcanza(u, x, a) },
  "jornada.eliminar": { texto: "eliminar esta jornada", regla: (p, u, x, a) => p.eliminarJornadaVacia && alcanza(u, x, a) },
  // Registrar en una jornada abierta: sólo quien la tiene a su cargo, el titular o el cabo del relevo
  "jornada.registrar": { texto: "registrar en esta jornada", regla: (p, u, x) => p.registrar && x.estatus === "abierta" && (x.relevo_id || x.cabo_id) === u.id },
  // Relevo: la coordinación pasa una jornada abierta a otro cabo de su cuadrilla
  "jornada.relevo": { texto: "pasar esta jornada a otro cabo", regla: (p, u, x, a) => p.relevar && x.estatus === "abierta" && alcanza(u, x, a) },
  "catalogo.administrar": { texto: "administrar los catálogos", regla: (p) => p.catalogos },
  "usuario.administrar": { texto: "administrar las cuentas", regla: (p) => p.usuarios },
  "carga.masiva": { texto: "cargar árboles en bloque", regla: (p) => p.usuarios && p.catalogos },
  "galeria.descargar": { texto: "descargar las fotografías", regla: (p) => p.galeria },
  // La bandeja de posibles duplicados entre instituciones la atiende la Administración global
  "duplicado.revisar": { texto: "revisar los posibles duplicados", regla: (p) => p.usuarios && p.catalogos },
} satisfies Record<string, { texto: string; regla: Regla }>;

/* LO QUE SÓLO EXISTE EN EL SERVIDOR mientras la aplicación no tiene su pantalla. Hoy, nada: cuando algo
   llega a la aplicación, su acción pasa a ACCIONES, en los dos lados. */
export const ACCIONES_DEL_SERVIDOR = {} satisfies Record<string, { texto: string; regla: Regla }>;

export type Accion = keyof typeof ACCIONES | keyof typeof ACCIONES_DEL_SERVIDOR;
const TODAS: Record<Accion, { texto: string; regla: Regla }> = { ...ACCIONES, ...ACCIONES_DEL_SERVIDOR };

// «No tiene permiso para …»
export const textoDe = (accion: Accion): string => TODAS[accion].texto;

export function puede(accion: Accion, u: Cuenta | null, x: Objeto = {}, autores: Autores = new Map()): boolean {
  if (!u || !Object.hasOwn(TODAS, accion)) return false;
  return TODAS[accion].regla(capacidadesDe(u), u, x, autores);
}

// La respuesta cuando no alcanza: la misma frase que da la aplicación
export function negar(res: Response, accion: Accion): void {
  responder(res, 403, "SIN_PERMISO", "No tiene permiso para " + textoDe(accion) + ".");
}

// Para las rutas de una acción que no depende de un registro (administrar cuentas o catálogos)
export function exigirPermiso(accion: Accion): RequestHandler {
  return (req: Request, res: Response, next: NextFunction) => (puede(accion, sesionDe(res).usuario) ? next() : negar(res, accion));
}

/* EL ALCANCE EN LA BASE: la misma regla de `alcanza`, como condición de SQL, para listar sin traer todo
   a memoria. Cada valor entra como parámetro, nunca escrito en el texto de la consulta. */
export class Parametros {
  readonly valores: unknown[] = [];
  agregar(v: unknown): string {
    this.valores.push(v);
    return "$" + this.valores.length;
  }
}

type Tabla = "jornadas" | "plantaciones";

// «`id` es una de las personas del registro». El árbol tiene sólo a su cabo; la jornada, también sus relevos
function esPersona(tabla: Tabla, x: string, id: string): string {
  if (tabla === "plantaciones") return `${x}.cabo_id = ${id}`;
  return `(${x}.cabo_id = ${id} OR ${x}.relevo_id = ${id} OR ${x}.relevos @> jsonb_build_array(jsonb_build_object('cabo_id', (${id})::text)))`;
}

/** Condición de SQL equivalente a `alcanza` para los renglones `x` de la tabla. */
export function alcanceSql(u: Cuenta, tabla: Tabla, x: string, p: Parametros): string {
  const alcance = capacidadesDe(u).alcance;
  if (alcance === "ninguno") return "false";
  if (alcance === "todos") return "true";
  if (alcance === "institucion") {
    const org = p.agregar(u.organizacion_id);
    const deAutor = `EXISTS (SELECT 1 FROM srp.usuarios a WHERE a.organizacion_id = ${org} AND ${esPersona(tabla, x, "a.id")})`;
    return tabla === "jornadas" ? `(CASE WHEN ${x}.organizacion_id <> '' THEN ${x}.organizacion_id = ${org} ELSE ${deAutor} END)` : deAutor;
  }
  const yo = p.agregar(u.id) + "::uuid";
  const suyos = esPersona(tabla, x, yo);
  if (alcance === "propios") return suyos;
  return `(${suyos} OR EXISTS (SELECT 1 FROM srp.usuarios a WHERE a.coordinadores_ids @> ARRAY[${yo}] AND ${esPersona(tabla, x, "a.id")}))`;
}

/** Condición de SQL equivalente a `veArbol` para los árboles `x`. */
export function veArbolSql(u: Cuenta, x: string, p: Parametros): string {
  const alcance = capacidadesDe(u).alcance;
  if (alcance === "ninguno" || alcance === "todos") return alcanceSql(u, "plantaciones", x, p);
  const yo = p.agregar(u.id) + "::uuid";
  return `(${alcanceSql(u, "plantaciones", x, p)} OR EXISTS (SELECT 1 FROM srp.jornadas j WHERE j.id = ${x}.jornada_id
    AND j.cabo_id <> ${yo} AND ${esPersona("jornadas", "j", yo)} AND ${alcanceSql(u, "jornadas", "j", p)}))`;
}
