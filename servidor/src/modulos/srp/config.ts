/* CONFIGURACIÓN DEL MÓDULO SRP. Todo se toma de variables de entorno, con valores de arranque. Nada secreto
   vive aquí: la cuenta de la base la pone el backend, con SRP_DB_USER y SRP_DB_PASS en su archivo de entorno.

   SRP_RUTA                  Ruta de la API que ve el navegador (por omisión /api/srp): acota la cookie.
   SRP_COOKIE_SEGURA         «no» sólo en desarrollo sin HTTPS. Se decide aquí y no por la petición: el
                             intermediario que termina el cifrado no avisa que llegó cifrada.
   SRP_SESION_INACTIVIDAD_DIAS   Días sin uso tras los que la sesión pide otra vez la contraseña (7).
   SRP_CONTRASENA_MINIMO     Largo mínimo de una contraseña nueva (10).
   SRP_INTENTOS_MAXIMOS      Intentos fallidos seguidos que bloquean la cuenta (5).
   SRP_BLOQUEO_MINUTOS       Cuánto dura el bloqueo (15).
   SRP_TEMPORAL_HORAS        Cuánto vale una contraseña temporal (72).
   SRP_FOTOS_DIR             Carpeta donde se guardan las fotografías: en el servidor de aplicaciones, fuera
                             de lo que se publica, con permiso de escritura para el backend y su propio
                             respaldo. Sin ella el módulo arranca igual y las fotografías responden que no
                             están disponibles.
   SRP_FOTO_MAXIMO_KB        Lo más que puede pesar una fotografía (1024). La aplicación las guarda a 800 × 600
                             y pesan entre 60 y 120 KB.

   Los parámetros del acceso se podrán cambiar desde Configuración › Parámetros cuando vivan en la base. */

export interface ConfigAcceso {
  inactividadDias: number;
  largoMinimo: number;
  intentosMaximos: number;
  bloqueoMinutos: number;
  temporalHoras: number;
}

export interface ConfigFotos {
  carpeta: string | null;
  maximoKb: number;
}

export interface ConfigSrp {
  ruta: string;
  cookieSegura: boolean;
  acceso: ConfigAcceso;
  fotos: ConfigFotos;
}

export type Entorno = Record<string, string | undefined>;

export const numero = (v: string | undefined, porOmision: number): number =>
  v === undefined || v === "" ? porOmision : Number(v);

export function leerConfig(env: Entorno = process.env): ConfigSrp {
  return {
    ruta: env.SRP_RUTA || "/api/srp",
    cookieSegura: env.SRP_COOKIE_SEGURA !== "no",
    acceso: {
      // Una semana sin entrar y pide la contraseña otra vez; cada uso renueva la semana, sin límite total
      inactividadDias: numero(env.SRP_SESION_INACTIVIDAD_DIAS, 7),
      largoMinimo: numero(env.SRP_CONTRASENA_MINIMO, 10),
      intentosMaximos: numero(env.SRP_INTENTOS_MAXIMOS, 5),
      bloqueoMinutos: numero(env.SRP_BLOQUEO_MINUTOS, 15),
      temporalHoras: numero(env.SRP_TEMPORAL_HORAS, 72),
    },
    fotos: { carpeta: env.SRP_FOTOS_DIR || null, maximoKb: numero(env.SRP_FOTO_MAXIMO_KB, 1024) },
  };
}
