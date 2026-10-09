-- LA CUENTA DEL SERVICIO · srp_api, con lo mínimo para operar. Lo corre quien administra la base, al
-- final de instalar.sql, y anota la versión 1 del esquema.
--
-- La cuenta se crea SIN contraseña. Después, fuera de este guion:
--   1. quien administra la base le pone contraseña de forma interactiva (\password srp_api en psql),
--      para que no quede en ningún registro;
--   2. se habilita su entrada cifrada en la configuración de acceso de PostgreSQL;
--   3. se anotan SRP_DB_USER y SRP_DB_PASS en el archivo de entorno del backend;
--   4. y sólo entonces se despliega el backend con el módulo: sin sus variables, el módulo no arranca.
-- La contraseña nunca va en este guion ni en el repositorio.
--
-- Lo que puede:
--   · Usar el esquema srp, sin crear nada en él ni fuera de él.
--   · Leer, agregar y cambiar renglones de las tablas de datos. Borra sólo lo que el sistema permite
--     borrar: un valor de catálogo o una cuenta sin uso, un lote de carga masiva al deshacerlo, y las
--     sesiones.
--   · A la bitácora, sólo leerla y agregarle renglones.
--   · Leer territorio, por el rol de grupo territorio_lectura, y la capa propia de prioritarias.
-- Lo que no puede: crear, cambiar o borrar tablas; editar o borrar la bitácora; anotar versiones del
-- esquema; escribir en territorio; ver otros esquemas del SIA.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'srp_api') THEN
    -- INHERIT: sin él, el permiso de territorio_lectura no le llega
    CREATE ROLE srp_api LOGIN INHERIT
      NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS
      CONNECTION LIMIT 20;
  END IF;
END $$;

ALTER ROLE srp_api SET search_path = srp, public;

REVOKE CREATE ON SCHEMA public FROM srp_api;

GRANT USAGE ON SCHEMA srp TO srp_api;

GRANT SELECT, INSERT, UPDATE, DELETE ON
  srp.plantaciones, srp.jornadas, srp.usuarios,
  srp.programas, srp.areas, srp.especies, srp.vehiculos, srp.instituciones, srp.solicitantes,
  srp.credenciales, srp.sesiones
TO srp_api;

GRANT SELECT, INSERT ON srp.bitacora TO srp_api;
GRANT SELECT ON srp.migraciones TO srp_api;

-- La capa propia sólo se lee: la carga quien administra la base
GRANT SELECT ON srp.capas, srp.capa_prioritarias TO srp_api;
REVOKE ALL ON FUNCTION srp.punto(numeric, numeric), srp.derivar(numeric, numeric, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION srp.punto(numeric, numeric), srp.derivar(numeric, numeric, integer) TO srp_api;

-- territorio, de sólo lectura, como cualquier módulo del SIA
GRANT territorio_lectura TO srp_api;

INSERT INTO srp.migraciones (version, nombre)
VALUES (1, 'Instalación: diez tablas del SRP, contraseñas, sesiones, prioritarias y derivación sobre territorio')
ON CONFLICT (version) DO NOTHING;

/*
  VERIFICACIÓN · conectado COMO srp_api, no como quien administra la base

  Debe funcionar:
      SELECT count(*) FROM srp.plantaciones;
      SELECT count(*) FROM territorio.alcaldia;                  -- 16, por territorio_lectura
      SELECT * FROM srp.derivar(19.4326, -99.1332);              -- Cuauhtémoc, su colonia y su celda
      SELECT has_table_privilege('srp.bitacora', 'INSERT');      -- t

  Debe fallar (permiso denegado); si alguna pasa, la cuenta quedó abierta de más:
      UPDATE srp.bitacora SET detalle = 'x';
      DELETE FROM srp.bitacora;
      TRUNCATE srp.plantaciones;
      CREATE TABLE srp.otra (x int);
      CREATE TABLE public.otra (x int);
      INSERT INTO srp.migraciones VALUES (2, 'x');
      UPDATE territorio.alcaldia SET nombre = 'x';

  Y el control global, que debe dar 0: ningún permiso directo fuera de srp
      SELECT count(*) FROM information_schema.role_table_grants
       WHERE grantee = 'srp_api' AND table_schema <> 'srp';
*/
