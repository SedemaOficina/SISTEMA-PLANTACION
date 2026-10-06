/* ARRANCA EL SERVICIO SOLO, en SRP_PUERTO (por omisión 3100), con la configuración de src/config.js.
   En el SIA, si el servicio se monta en el backend central, no se usa este archivo: se monta
   crearRutas() de src/app.js. */
import { leerConfig } from './src/config.js';
import { crearGrupo } from './src/conexion.js';
import { crearApp } from './src/app.js';

const config = leerConfig();
const grupo = crearGrupo({ rol: config.rol });
const servidor = crearApp({ grupo, config }).listen(config.puerto, () => {
  console.log(`Servicio del SRP en el puerto ${config.puerto}, bajo ${config.ruta}`);
});
const terminar = () => servidor.close(() => grupo.end().then(() => process.exit(0)));
process.on('SIGINT', terminar);
process.on('SIGTERM', terminar);
