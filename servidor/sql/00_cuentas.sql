-- CUENTAS DE BASE DE DATOS DEL SRP. Lo corre quien administra la base, con permiso para crear cuentas.
-- Se puede correr más de una vez: crea sólo lo que falta.
--
--   srp_propietario  Dueña del esquema srp y de todo lo que hay en él. No se conecta: quien instala
--                    o actualiza el esquema la asume con SET ROLE.
--   srp_servicio     La cuenta con la que se conecta el servicio del SRP. Lee y escribe datos, nada más:
--                    no crea, altera ni borra tablas. Su contraseña la pone el administrador de la base
--                    y vive en la configuración del servidor, nunca en el repositorio.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'srp_propietario') THEN
    CREATE ROLE srp_propietario NOLOGIN NOINHERIT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'srp_servicio') THEN
    CREATE ROLE srp_servicio LOGIN NOINHERIT NOCREATEDB NOCREATEROLE;
  END IF;
END $$;

-- Quien instala puede asumir la cuenta propietaria para que todo quede a su nombre
GRANT srp_propietario TO CURRENT_USER WITH INHERIT FALSE, SET TRUE;
