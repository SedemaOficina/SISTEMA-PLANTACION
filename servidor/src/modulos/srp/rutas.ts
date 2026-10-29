import express, { Router, type NextFunction, type Request, type Response } from "express";
import type pg from "pg";
import { rutasAcceso } from "./acceso";
import { rutasCargas } from "./cargas";
import { rutasCatalogos } from "./catalogos";
import { leerConfig, type ConfigSrp } from "./config";
import { rutasConsultas } from "./consultas";
import { rutasCuentas } from "./cuentas";
import { rutasDuplicados } from "./duplicados";
import { rutasFotografias } from "./fotografias";
import { rutasHistorial } from "./historial";
import { rutasParametros } from "./parametros";
import { rutasRecepcion } from "./recepcion";
import { revisarSello } from "./sello";
import { traducir } from "./errores";

/* ============================================================
   Módulo SRP · Sistema de Registro de Plantaciones
   ============================================================
   Frontera propia y conexión propia: entra como `srp_api`, que sólo alcanza el esquema `srp` y lee
   `territorio` por su rol de grupo. Se monta así en el backend:

     app.use("/api/srp", crearRutasSrp(poolSrp));

   como los demás módulos. El navegador lo ve en /srp/api/, dentro de la ruta de la aplicación: el servidor web pasa
   /srp/api/ a /api/srp/, como con Categorías, y la cookie va acotada a /srp/api (SRP_RUTA).

   Hoy: el acceso con cuentas propias y su registro de entradas, la administración de cuentas, de
   catálogos y de parámetros, la consulta de jornadas y árboles, cada quien lo de su alcance (permisos.ts), y la recepción
   de lo que mandan los teléfonos —jornadas, árboles, su folio y sus fotografías— con todo lo que después se
   les hace, la bandeja de posibles duplicados entre instituciones, y lo que dice la bitácora: el historial de
   cada árbol y el registro de cambios de la Administración; y la carga masiva del histórico. Lo que debe valer siempre (derivar el territorio de un punto, el folio, la
   bitácora) lo hace la base.
   ============================================================ */

export function crearRutasSrp(pool: pg.Pool, config: ConfigSrp = leerConfig()): Router {
  const r = Router();
  r.use(express.json({ limit: "100kb" }));
  // Nada de la API se guarda en cachés intermedias, y el navegador no adivina el tipo de lo que responde
  r.use((req: Request, res: Response, next: NextFunction) => {
    res.set({ "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" });
    next();
  });
  // Lo que envía un teléfono con el sello de antes de vaciar el servidor no entra (sello.ts)
  r.use(revisarSello(pool));
  const acceso = rutasAcceso(pool, config);
  r.use(acceso.router);
  r.use(rutasCuentas(pool, config, acceso.sesion));
  r.use(rutasConsultas(pool, acceso.sesion));
  r.use(rutasCatalogos(pool, acceso.sesion));
  r.use(rutasParametros(pool, acceso.sesion));
  r.use(rutasRecepcion(pool, acceso.sesion));
  r.use(rutasFotografias(pool, config, acceso.sesion));
  r.use(rutasDuplicados(pool, acceso.sesion));
  r.use(rutasHistorial(pool, acceso.sesion));
  r.use(rutasCargas(pool, acceso.sesion));
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
