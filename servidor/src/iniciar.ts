import { fileURLToPath } from "node:url";
import { crearApp, crearGrupo, leerConfig, leerConfigLocal, MONTAJE } from "./independiente";

/* ARRANCA EL MÓDULO SOLO, para desarrollo, en SRP_PUERTO (por omisión 3100) y bajo /api/srp, como en el SIA (el
   navegador lo ve en SRP_RUTA, /srp/api, y pruebas/servir.py traduce la ruta como el servidor web), con
   las fotografías en servidor/local/fotos si no se dice otra carpeta. En el SIA no se usa: el backend
   central monta crearRutasSrp. */

const config = leerConfig();
// Sin carpeta de fotografías, la de desarrollo, que no se sube
config.fotos.carpeta ??= fileURLToPath(new URL("../local/fotos", import.meta.url));
const local = leerConfigLocal();
const pool = crearGrupo({ rol: local.rol });
const servidor = crearApp({ pool, config, proxy: local.proxy }).listen(local.puerto, () => {
  console.log(`Servicio del SRP en el puerto ${local.puerto}, bajo ${MONTAJE} (el navegador lo ve en ${config.ruta})`);
});
const terminar = () => servidor.close(() => void pool.end().then(() => process.exit(0)));
process.on("SIGINT", terminar);
process.on("SIGTERM", terminar);
