/* EL SERVICIO DEL SRP como aplicación Express. Se monta bajo `config.ruta` (/api/srp): puede correr solo
   (iniciar.js) o montarse en el backend central del SIA con `app.use(crearRutas(...))`.

   La aplicación y su API viven en el mismo dominio, así que no hace falta abrir el acceso a otros
   sitios. El servidor web del SIA termina el cifrado y reenvía en HTTP: se confía en su cabecera para
   saber que la petición llegó cifrada y dar la cookie de sesión como segura. */
import express from 'express';
import { rutasAcceso } from './acceso.js';
import { rutasCuentas } from './cuentas.js';

// Las rutas de la API, para montarlas donde se quiera
export function crearRutas({ grupo, config }) {
  const r = express.Router();
  r.use(express.json({ limit: '100kb' }));
  // Nada de la API se guarda en cachés intermedias
  r.use((req, res, next) => { res.set('Cache-Control', 'no-store'); next(); });
  const acceso = rutasAcceso({ grupo, config });
  r.use(acceso.router);
  r.use(rutasCuentas({ grupo, config, sesion: acceso.sesion }));
  r.use((req, res) => res.status(404).json({ codigo: 'NO_EXISTE', mensaje: 'Esa dirección no existe en el servicio.' }));
  // Un error inesperado no enseña detalles internos; queda en el registro del servidor
  r.use((e, req, res, next) => {
    if (e && e.type === 'entity.parse.failed') return res.status(400).json({ codigo: 'JSON_INVALIDO', mensaje: 'La petición no es un JSON válido.' });
    if (e && e.type === 'entity.too.large') return res.status(413).json({ codigo: 'DEMASIADO_GRANDE', mensaje: 'La petición es demasiado grande.' });
    console.error(new Date().toISOString(), req.method, req.originalUrl, e);
    res.status(500).json({ codigo: 'ERROR_INTERNO', mensaje: 'Algo falló en el servidor. Intente de nuevo; si sigue, avise a la Administración.' });
  });
  return r;
}

export function crearApp({ grupo, config }) {
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', config.proxy);
  app.use(config.ruta, crearRutas({ grupo, config }));
  return app;
}
