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
--     borrar: un valor de catálogo o una cuenta sin uso, y una jornada sin árboles. Al borrar una cuenta,
--     la base se lleva su contraseña y sus sesiones; la cuenta del servicio no las borra por su cuenta, y
--     un árbol nunca se borra: se marca eliminado.
--   · Cada consulta suya termina en 50 segundos o se cancela: el servidor web corta la API al minuto, y
--     así nada sigue corriendo en la base después.
--   · Registrar los lotes de carga masiva y marcarlos completos o deshechos; no los borra.
--   · A las bitácoras (la de cambios y la de entradas), sólo leerlas y agregarles renglones.
--   · Avanzar la secuencia de folios de cada celda y agregar folios; un folio emitido no lo cambia ni lo borra.
--   · Registrar fotografías; no las cambia ni las borra.
--   · Leer y cambiar los parámetros.
--   · Congelar la prioridad de la colonia de cada árbol y cada jornada al recibirlos.
--   · Buscar los vecinos de un árbol, anotar en la bandeja los posibles duplicados entre instituciones y
--     marcarlos revisados; no los borra.
--   · Leer territorio, por el rol de grupo territorio_lectura, y la capa propia de prioritarias.
--   · Calcular la calle de un árbol; volver a calcular la de todos lo hace quien administra la base.
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
ALTER ROLE srp_api SET statement_timeout = '50s';

REVOKE CREATE ON SCHEMA public FROM srp_api;

GRANT USAGE ON SCHEMA srp TO srp_api;

GRANT SELECT, INSERT, UPDATE ON srp.plantaciones, srp.credenciales, srp.sesiones TO srp_api;
GRANT SELECT, INSERT, UPDATE, DELETE ON
  srp.jornadas, srp.usuarios,
  srp.programas, srp.areas, srp.especies, srp.vehiculos, srp.instituciones, srp.solicitantes
TO srp_api;

GRANT SELECT, INSERT ON srp.bitacora, srp.bitacora_acceso TO srp_api;

-- El folio: la secuencia de cada celda avanza; los folios emitidos sólo se agregan
GRANT SELECT, INSERT, UPDATE ON srp.folio_secuencias TO srp_api;
GRANT SELECT, INSERT ON srp.folios TO srp_api;

-- El registro de las fotografías sólo crece: una fotografía no se cambia
GRANT SELECT, INSERT ON srp.fotografias TO srp_api;

-- La prioridad congelada: se agrega al recibir y se vuelve a calcular si se corrige el punto
GRANT SELECT, INSERT, UPDATE ON srp.prioridades TO srp_api;

-- La bandeja de posibles duplicados: se anota al recibir y la Administración la revisa
GRANT SELECT, INSERT, UPDATE ON srp.duplicados TO srp_api;

-- Los lotes de carga masiva: se registran, se completan y se deshacen; ninguno se borra
GRANT SELECT, INSERT, UPDATE ON srp.cargas TO srp_api;

-- Los parámetros: la Administración los cambia; volver al valor de arranque es escribirlo
GRANT SELECT, INSERT, UPDATE ON srp.parametros TO srp_api;
GRANT SELECT ON srp.migraciones TO srp_api;

-- La capa propia sólo se lee: la carga quien administra la base
GRANT SELECT ON srp.capas, srp.capa_prioritarias TO srp_api;
REVOKE ALL ON FUNCTION srp.punto(numeric, numeric), srp.derivar(numeric, numeric, integer), srp.prioridad(numeric, numeric), srp.especie_clave(text, text), srp.vecinos(uuid, numeric), srp.de_carga_oculta(uuid), srp.calle(numeric, numeric) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION srp.punto(numeric, numeric), srp.derivar(numeric, numeric, integer), srp.prioridad(numeric, numeric), srp.especie_clave(text, text), srp.vecinos(uuid, numeric), srp.de_carga_oculta(uuid), srp.calle(numeric, numeric) TO srp_api;
-- Volver a calcular la calle de todos los árboles es de quien administra la base, después de instalar la capa
REVOKE ALL ON FUNCTION srp.recalcular_calles() FROM PUBLIC;

-- territorio, de sólo lectura, como cualquier módulo del SIA
GRANT territorio_lectura TO srp_api;

INSERT INTO srp.migraciones (version, nombre)
VALUES (1, 'Instalación: diez tablas del SRP, contraseñas, sesiones, registro de entradas, prioritarias, derivación sobre territorio, folio, fotografías, parámetros, prioridad congelada, posibles duplicados, lotes de carga masiva y la calle de cada árbol')
ON CONFLICT (version) DO NOTHING;

/*
  VERIFICACIÓN · conectado COMO srp_api, no como quien administra la base

  Debe funcionar:
      SELECT count(*) FROM srp.plantaciones;
      SELECT count(*) FROM territorio.alcaldia;                  -- 16, por territorio_lectura
      SELECT * FROM srp.derivar(19.4326, -99.1332);              -- Cuauhtémoc, su colonia y su celda
      SELECT * FROM srp.calle(19.4326, -99.1332);                -- su calle, si territorio.calles está instalada
      SELECT has_table_privilege('srp.bitacora', 'INSERT');      -- t
      SELECT has_table_privilege('srp.bitacora_acceso', 'INSERT');  -- t
      SHOW statement_timeout;                                    -- 50s

  Debe fallar (permiso denegado); si alguna pasa, la cuenta quedó abierta de más:
      UPDATE srp.bitacora SET detalle = 'x';
      DELETE FROM srp.bitacora;
      DELETE FROM srp.bitacora_acceso;
      DELETE FROM srp.folios;
      DELETE FROM srp.fotografias;
      DELETE FROM srp.duplicados;
      DELETE FROM srp.cargas;
      DELETE FROM srp.plantaciones;
      DELETE FROM srp.sesiones;
      TRUNCATE srp.plantaciones;
      CREATE TABLE srp.otra (x int);
      CREATE TABLE public.otra (x int);
      INSERT INTO srp.migraciones VALUES (2, 'x');
      SELECT srp.recalcular_calles();
      UPDATE territorio.alcaldia SET nombre = 'x';

  Y el control global, que debe dar 0: ningún permiso directo fuera de srp
      SELECT count(*) FROM information_schema.role_table_grants
       WHERE grantee = 'srp_api' AND table_schema <> 'srp';
*/
