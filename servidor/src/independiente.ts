import express from "express";
import pg from "pg";
import { contrasenaDe } from "../bd.js";
import { leerConfig, MONTAJE, numero, type ConfigSrp } from "./modulos/srp/config";
import { crearRutasSrp, manejarErroresSrp } from "./modulos/srp/rutas";

/* EL MÓDULO FUERA DEL SIA: para desarrollo y pruebas, contra la base local. En el SIA no se usa este
   archivo: el backend central monta crearRutasSrp(poolSrp) en /api/srp con su propia conexión, la de
   SRP_DB_USER y SRP_DB_PASS. Nada de esta carpeta, salvo modulos/srp/, viaja al SIA.

   SRP_PUERTO   Puerto (por omisión 3100).
   SRP_PROXY    Saltos de intermediario conocidos entre la persona y el servicio (por omisión 2: el que
                termina el cifrado y el servidor web del SIA).
   SRP_ROL      Cuenta que se asume al conectar (el parámetro role), para que la cuenta local de administración
                opere con los permisos de srp_api. */

export { leerConfig, MONTAJE } from "./modulos/srp/config";
export { derivar, temporal, verificar } from "./modulos/srp/contrasenas";
// Para las pruebas, que comparan estas reglas con las de la aplicación
export * as permisos from "./modulos/srp/permisos";
export * as catalogos from "./modulos/srp/catalogos";
export * as parametros from "./modulos/srp/parametros";

export interface ConfigLocal {
  puerto: number;
  proxy: number;
  rol: string;
}

export function leerConfigLocal(env: Record<string, string | undefined> = process.env): ConfigLocal {
  return { puerto: numero(env.SRP_PUERTO, 3100), proxy: numero(env.SRP_PROXY, 2), rol: env.SRP_ROL || "" };
}

/* La conexión local: las variables de PostgreSQL (PGHOST, PGPORT, PGDATABASE, PGUSER) o la base de
   desarrollo, con la contraseña del archivo de contraseñas del equipo. Con `rol`, cada conexión asume
   esa cuenta al abrirse; si no puede, no se usa: operaría con más permisos de los que tendrá en el SIA. */
export function crearGrupo({ rol = "" }: { rol?: string } = {}): pg.Pool {
  const datos = {
    host: process.env.PGHOST || "127.0.0.1",
    port: Number(process.env.PGPORT || 5432),
    database: process.env.PGDATABASE || "srp_local",
    user: process.env.PGUSER || "srp_local_admin",
  };
  // La cuenta se asume al abrir la conexión, como parámetro de arranque: no hay un instante en que opere sin ella
  if (rol && !/^[a-z_][a-z0-9_]*$/.test(rol)) throw new Error("SRP_ROL no es un nombre de cuenta válido: " + rol);
  return new pg.Pool({
    ...datos,
    max: 10,
    password: process.env.PGPASSWORD || (async () => contrasenaDe(datos) ?? ""),
    ...(rol ? { options: "-c role=" + rol } : {}),
  });
}

/* La aplicación: el módulo montado como lo monta el SIA (/api/srp, con su manejador de errores detrás), y antes el
   lector de JSON de todas las peticiones, como el del backend del SIA. La ruta del navegador la traduce el servidor web */
export function crearApp({ pool, config = leerConfig(), proxy = 2 }: { pool: pg.Pool; config?: ConfigSrp; proxy?: number }): express.Express {
  const app = express();
  app.disable("x-powered-by");
  app.set("trust proxy", proxy);
  app.use(express.json());
  app.use(MONTAJE, crearRutasSrp(pool, config), manejarErroresSrp);
  return app;
}
