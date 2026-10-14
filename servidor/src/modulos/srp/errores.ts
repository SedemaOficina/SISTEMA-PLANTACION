import type { Response } from "express";

/* TRADUCCIÓN DE ERRORES A RESPUESTAS. La misma regla que los módulos del SIA:

     lo que la base le dice a la persona se elige aquí, no se reenvía.

   Los mensajes de PostgreSQL nombran tablas, columnas y reglas, y al insertar pueden repetir el dato que se
   intentó guardar. El detalle va al registro del servidor; a la persona le llega un mensaje escrito para
   ella, con un código que la aplicación entiende. */

export interface ErrorHttp {
  estado: number;
  codigo: string;
  mensaje: string;
  /** Detalle para el registro del servidor. Nunca va en la respuesta. */
  detalle: string;
}

interface ErrorPg {
  code?: string;
  message?: string;
  constraint?: string;
  type?: string;
}

export const responder = (res: Response, estado: number, codigo: string, mensaje: string) => res.status(estado).json({ codigo, mensaje });

// La base no contesta: caída, firewall o tiempo agotado. No es un error de datos
export function esFalloDeConexion(e: unknown): boolean {
  const err = e as ErrorPg;
  const code = String(err?.code ?? "").toUpperCase();
  const msg = String(err?.message ?? "").toLowerCase();
  return ["ECONNREFUSED", "ETIMEDOUT", "ENOTFOUND", "EHOSTUNREACH"].includes(code) || msg.includes("timeout") || msg.includes("terminated") || msg.includes("connection");
}

// Reglas únicas del esquema → lo que se le dice a la persona. Los nombres son los de 02-srp-tablas.sql
const POR_REGLA: Record<string, string> = {
  usuarios_correo_unico: "Ese correo ya tiene cuenta.",
  programas_clave_unico: "Esa clave ya está en uso.",
  areas_clave_unico: "Esa clave ya está en uso.",
  vehiculos_clave_unico: "Ya existe un vehículo con esa placa.",
  instituciones_clave_unico: "Esa clave ya está en uso.",
  solicitantes_clave_unico: "Esa clave ya está en uso.",
  especies_pk: "Esa clave ya está en uso.",
  programas_nombre_unico: "Ya existe un valor con ese nombre.",
  areas_nombre_unico: "Ya existe un valor con ese nombre.",
  especies_nombre_unico: "Ya existe un valor con ese nombre.",
  especies_nombre_cientifico_unico: "Ya existe una especie con ese nombre científico.",
  vehiculos_nombre_unico: "Ya existe un vehículo con esa placa.",
  instituciones_nombre_unico: "Ya existe una institución con ese nombre.",
  solicitantes_nombre_unico: "Ya existe un solicitante con ese nombre.",
};

export function traducir(e: unknown): ErrorHttp {
  const err = e as ErrorPg;
  const code = String(err?.code ?? "");
  const detalle = String(err?.message ?? "error desconocido");

  // Lo que Express ya reconoce del cuerpo de la petición
  if (err?.type === "entity.parse.failed") return { estado: 400, codigo: "JSON_INVALIDO", mensaje: "La petición no es un JSON válido.", detalle };
  if (err?.type === "entity.too.large") return { estado: 413, codigo: "DEMASIADO_GRANDE", mensaje: "La petición es demasiado grande.", detalle };

  if (esFalloDeConexion(e)) {
    return { estado: 503, codigo: "SIN_SERVICIO", mensaje: "El servicio no está disponible en este momento. Intente de nuevo en unos minutos.", detalle };
  }
  // 42501, permiso denegado: a srp_api le falta un permiso. Es un error de instalación, no de la persona, y
  // en el registro se distingue de cualquier otro
  if (code === "42501") {
    return { estado: 500, codigo: "ERROR_INTERNO", mensaje: "Algo falló en el servidor. Intente de nuevo; si sigue, avise a la Administración.", detalle: "PERMISO FALTANTE para srp_api → " + detalle };
  }
  // 23505, valor repetido: dos altas del mismo correo al mismo tiempo, por ejemplo
  if (code === "23505") {
    return { estado: 409, codigo: "REPETIDO", mensaje: POR_REGLA[err.constraint ?? ""] ?? "Ese dato ya existe.", detalle };
  }
  return { estado: 500, codigo: "ERROR_INTERNO", mensaje: "Algo falló en el servidor. Intente de nuevo; si sigue, avise a la Administración.", detalle };
}
