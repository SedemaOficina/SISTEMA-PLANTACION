import express, { Router, type NextFunction, type Request, type Response } from "express";
import type pg from "pg";
import { rutasAcceso } from "./acceso";
import { rutasCatalogos } from "./catalogos";
import { leerConfig, type ConfigSrp } from "./config";
import { rutasConsultas } from "./consultas";
import { rutasCuentas } from "./cuentas";
import { rutasFotografias } from "./fotografias";
import { rutasRecepcion } from "./recepcion";
import { traducir } from "./errores";

/* ============================================================
   Módulo SRP · Sistema de Registro de Plantaciones
   ============================================================
   Frontera propia y conexión propia: entra como `srp_api`, que sólo alcanza el esquema `srp` y lee
   `territorio` por su rol de grupo. Se monta así en el backend:

     app.use("/api/srp", crearRutasSrp(poolSrp));

   Hoy: el acceso con cuentas propias y su registro de entradas, la administración de cuentas y de
   catálogos, la consulta de jornadas y árboles, cada quien lo de su alcance (permisos.ts), y la recepción
   de lo que mandan los teléfonos —jornadas, árboles, su folio y sus fotografías— con todo lo que después se
   les hace. Lo que debe valer siempre (derivar el territorio de un punto, el folio, la
   bitácora) lo hace la base.
   ============================================================ */

export function crearRutasSrp(pool: pg.Pool, config: ConfigSrp = leerConfig()): Router {
  const r = Router();
  r.use(express.json({ limit: "100kb" }));
  // Nada de la API se guarda en cachés intermedias
  r.use((req: Request, res: Response, next: NextFunction) => {
    res.set("Cache-Control", "no-store");
    next();
  });
  const acceso = rutasAcceso(pool, config);
  r.use(acceso.router);
  r.use(rutasCuentas(pool, config, acceso.sesion));
  r.use(rutasConsultas(pool, acceso.sesion));
  r.use(rutasCatalogos(pool, acceso.sesion));
  r.use(rutasRecepcion(pool, acceso.sesion));
  r.use(rutasFotografias(pool, config, acceso.sesion));
  r.use((req: Request, res: Response) => {
    res.status(404).json({ codigo: "NO_EXISTE", mensaje: "Esa dirección no existe en el servicio." });
  });
  // Un error inesperado no enseña detalles internos: el detalle queda en el registro del servidor
  r.use((e: unknown, req: Request, res: Response, _next: NextFunction) => {
    const t = traducir(e);
    if (t.estado >= 500) console.error(`🔥 [SRP] ${req.method} ${req.originalUrl} → ${t.detalle}`);
    res.status(t.estado).json({ codigo: t.codigo, mensaje: t.mensaje });
  });
  return r;
}
