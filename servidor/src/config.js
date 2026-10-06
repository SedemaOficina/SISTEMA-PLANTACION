/* CONFIGURACIÓN DEL SERVICIO. Todo se toma de variables de entorno, con valores de arranque. Nada
   secreto vive aquí: la contraseña de la base la lee el cliente del archivo de contraseñas de
   PostgreSQL o la pone quien instala en el entorno del servidor, nunca en el repositorio.

   Base de datos: las variables de PostgreSQL (PGHOST, PGPORT, PGDATABASE, PGUSER, PGPASSWORD o
   PGPASSFILE, PGSSLMODE). En el SIA la cuenta es srp_servicio y la conexión va cifrada.
   SRP_ROL       Sólo en desarrollo: cuenta que se asume al conectar (SET ROLE), para que una cuenta de
                 administración local opere con los permisos de srp_servicio.
   SRP_PUERTO    Puerto cuando el servicio corre solo (por omisión 3100).
   SRP_RUTA      Ruta bajo la que se monta la API (por omisión /api/srp).
   SRP_PROXY     Saltos de intermediario en que se confía para saber si la petición llegó cifrada
                 (por omisión 1: el servidor web del SIA termina el cifrado y reenvía en HTTP).
   SRP_COOKIE_SEGURA  «no» sólo en desarrollo sin HTTPS; en el SIA la cookie de sesión es segura. */

const num = (v, d) => (v === undefined || v === '' ? d : Number(v));

export function leerConfig(env = process.env) {
  return {
    puerto: num(env.SRP_PUERTO, 3100),
    ruta: env.SRP_RUTA || '/api/srp',
    proxy: num(env.SRP_PROXY, 1),
    cookieSegura: env.SRP_COOKIE_SEGURA !== 'no',
    rol: env.SRP_ROL || '',
    // Parámetros del acceso. Se podrán cambiar desde Configuración › Parámetros cuando vivan en la base
    acceso: {
      inactividadHoras: num(env.SRP_SESION_INACTIVIDAD_H, 12),
      duracionMaximaDias: num(env.SRP_SESION_MAXIMA_DIAS, 7),
      largoMinimo: num(env.SRP_CONTRASENA_MINIMO, 10),
      intentosMaximos: num(env.SRP_INTENTOS_MAXIMOS, 5),
      bloqueoMinutos: num(env.SRP_BLOQUEO_MINUTOS, 15),
      temporalHoras: num(env.SRP_TEMPORAL_HORAS, 72)
    }
  };
}
