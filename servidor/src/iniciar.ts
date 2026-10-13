import { crearApp, crearGrupo, leerConfig, leerConfigLocal } from "./independiente";

/* ARRANCA EL MÓDULO SOLO, para desarrollo, en SRP_PUERTO (por omisión 3100) y bajo SRP_RUTA (/api/srp).
   En el SIA no se usa: el backend central monta crearRutasSrp. */

const config = leerConfig();
const local = leerConfigLocal();
const pool = crearGrupo({ rol: local.rol });
const servidor = crearApp({ pool, config, proxy: local.proxy }).listen(local.puerto, () => {
  console.log(`Servicio del SRP en el puerto ${local.puerto}, bajo ${config.ruta}`);
});
const terminar = () => servidor.close(() => void pool.end().then(() => process.exit(0)));
process.on("SIGINT", terminar);
process.on("SIGTERM", terminar);
