import type { Request } from "express";

/* PROCEDENCIA DE UNA PETICIÓN, fuera del SIA. En `sia-backend` este archivo es el suyo,
   `src/comun/procedencia.ts`, y el módulo srp lo importa de ahí: no viaja en el paquete ni se copia. Éste
   lo sustituye sólo para correr el módulo solo y en las pruebas, con las mismas dos funciones y el mismo
   criterio que el del SIA:

   · la dirección de la persona es la primera que no es de un intermediario propio, leyendo X-Forwarded-For
     de derecha a izquierda: lo de la izquierda lo puede escribir quien llama; lo de la derecha, no;
   · ese encabezado sólo vale si la petición llega de un intermediario propio; si no, manda la conexión.

   Los intermediarios propios van en SIA_PROXIES_CONFIABLES, separados por comas; aquí, por omisión, el mismo
   equipo, porque el servidor de la aplicación de las pruebas reenvía la API.

   La procedencia sirve para el forense y para contar las entradas fallidas; no identifica a nadie. */

const FORMA_IP = /^[0-9a-fA-F.:]{3,45}$/;

const PROPIOS = new Set((process.env.SIA_PROXIES_CONFIABLES ?? "127.0.0.1,::1").split(",").map((s) => s.trim()).filter(Boolean));

// «::ffff:10.0.0.1» y «10.0.0.1» son la misma dirección; lo que no tiene forma de dirección no sale (la columna es inet)
function normal(ip: string | undefined): string | null {
  const limpia = String(ip ?? "").trim().replace(/^::ffff:(?=\d+\.\d+\.\d+\.\d+$)/i, "");
  return FORMA_IP.test(limpia) ? limpia : null;
}

export function ipDeOrigen(req: Request): string | null {
  const directa = normal(req.socket.remoteAddress);
  if (directa === null || !PROPIOS.has(directa)) return directa;
  const reenviada = req.header("x-forwarded-for");
  if (typeof reenviada !== "string") return directa;
  let candidata = directa;
  for (const parte of reenviada.split(",").reverse()) {
    const ip = normal(parte);
    if (ip === null) break;
    candidata = ip;
    if (!PROPIOS.has(ip)) break;
  }
  return candidata;
}

// El navegador y el equipo, recortado
export function agenteDeUsuario(req: Request): string | null {
  const agente = req.header("user-agent");
  return typeof agente === "string" && agente.trim() !== "" ? agente.slice(0, 400) : null;
}
