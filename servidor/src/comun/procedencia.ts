import type { Request } from "express";

/* PROCEDENCIA DE UNA PETICIÓN, fuera del SIA. En `sia-backend` este archivo es el suyo,
   `src/comun/procedencia.ts`, y el módulo srp lo importa de ahí: no viaja en el paquete ni se copia. Éste
   lo sustituye sólo para correr el módulo solo y en las pruebas, con las mismas dos funciones y la misma
   forma de respuesta. Si el SIA cambia cómo toma la dirección, el módulo lo recibe sin tocar nada.

   La procedencia sirve para el forense; no identifica a nadie. */

const FORMA_IP = /^[0-9a-fA-F.:]{3,45}$/;

// La dirección de origen, o null si no tiene forma de dirección (la columna es inet)
export function ipDeOrigen(req: Request): string | null {
  const reenviada = req.header("x-forwarded-for");
  if (typeof reenviada === "string" && reenviada.trim() !== "") {
    const ultima = reenviada.split(",").map((s) => s.trim()).filter(Boolean).pop();
    if (ultima && FORMA_IP.test(ultima)) return ultima;
  }
  const directa = req.socket.remoteAddress;
  return directa && FORMA_IP.test(directa) ? directa : null;
}

// El navegador y el equipo, recortado
export function agenteDeUsuario(req: Request): string | null {
  const agente = req.header("user-agent");
  return typeof agente === "string" && agente.trim() !== "" ? agente.slice(0, 400) : null;
}
