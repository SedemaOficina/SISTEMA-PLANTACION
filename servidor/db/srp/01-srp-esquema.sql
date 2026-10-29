-- ESQUEMA srp · Sistema de Registro de Plantaciones. Lo corre quien administra la base, dentro de
-- instalar.sql. Requiere PostGIS y el esquema compartido territorio (alcaldías, colonias y malla UGA),
-- que el SRP sólo lee.
--
-- Una instalación nunca escribe sobre otra: si el esquema ya tiene sus tablas, se detiene sin tocar
-- nada. Los cambios posteriores van como migraciones numeradas, anotadas en srp.migraciones.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'postgis') THEN
    RAISE EXCEPTION 'PostGIS no está instalado en esta base: lo instala quien la administra antes del SRP';
  END IF;
  IF to_regclass('territorio.alcaldia') IS NULL OR to_regclass('territorio.malla_uga_1km') IS NULL
     OR to_regclass('territorio.colonias_iecm_2022') IS NULL THEN
    RAISE EXCEPTION 'Falta el esquema territorio (alcaldia, malla_uga_1km, colonias_iecm_2022): el SRP lo lee, no lo crea';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'territorio_lectura') THEN
    RAISE EXCEPTION 'Falta el rol territorio_lectura: con él la cuenta del SRP lee territorio';
  END IF;
  IF to_regclass('srp.migraciones') IS NOT NULL THEN
    RAISE EXCEPTION 'El esquema srp ya está instalado (versión %): los cambios van como migración, no como instalación',
      (SELECT max(version) FROM srp.migraciones);
  END IF;
  -- Las funciones del SRP toman al crearse la ruta de búsqueda de esta transacción (SET search_path FROM CURRENT):
  -- se fija aquí, para que no dependa de la sesión de quien instala. El esquema srp y el de PostGIS, nada más.
  PERFORM set_config('search_path', 'srp, ' || (SELECT quote_ident(n.nspname) FROM pg_extension e JOIN pg_namespace n ON n.oid = e.extnamespace
                                                 WHERE e.extname = 'postgis'), true);
END $$;

CREATE SCHEMA IF NOT EXISTS srp;

COMMENT ON SCHEMA srp IS 'Sistema de Registro de Plantaciones (SRP): jornadas y árboles plantados, catálogos, cuentas y bitácora.';

-- Nadie más usa el esquema salvo a quien se le concede en 10-srp-rol-y-grants.sql
REVOKE ALL ON SCHEMA srp FROM PUBLIC;

-- Qué versiones del esquema están aplicadas. La instalación es la 1; cada migración agrega la suya.
CREATE TABLE srp.migraciones (
  version      integer      NOT NULL,
  nombre       text         NOT NULL,
  aplicada_en  timestamptz  NOT NULL DEFAULT now(),
  CONSTRAINT migraciones_pk PRIMARY KEY (version)
);
COMMENT ON TABLE srp.migraciones IS 'Versiones del esquema aplicadas, en orden. La instalación es la 1.';

-- El sello de los datos: nace con la instalación y cambia cuando el servidor se vacía (vaciar-tras-prueba.sql). Cada
-- teléfono lo recibe al entrar y lo manda con lo que envía: si el del servidor es más nuevo, el servicio no acepta lo
-- que manda y el teléfono borra lo que guardaba, para que los datos de la prueba no vuelvan al servidor limpio. Empieza
-- con la fecha y la hora en UTC, así que ordenarlos como texto es ordenarlos en el tiempo: si un día se restaura un
-- respaldo de antes del vaciado, el sello del servidor queda más viejo que el de los teléfonos y nadie borra nada.
-- `nota` deja la constancia de cuándo se instaló o se vació, y qué se borró.
CREATE FUNCTION srp.sello_nuevo() RETURNS text LANGUAGE sql VOLATILE SET search_path = pg_catalog, pg_temp AS $$
  SELECT to_char(clock_timestamp() AT TIME ZONE 'UTC', 'YYYYMMDD"T"HH24MISS.US') || '-' || substr(md5(random()::text), 1, 8)
$$;
CREATE TABLE srp.sello (
  unico  boolean      NOT NULL DEFAULT true,
  valor  text         NOT NULL,
  desde  timestamptz  NOT NULL DEFAULT now(),
  nota   text         NOT NULL,
  CONSTRAINT sello_pk PRIMARY KEY (unico),
  CONSTRAINT sello_uno CHECK (unico)
);
COMMENT ON TABLE srp.sello IS 'Un solo renglón: el sello de los datos del servidor, ordenable en el tiempo. Cambia al vaciarlo después de la prueba; nota dice qué pasó.';
INSERT INTO srp.sello (valor, nota) VALUES (srp.sello_nuevo(), 'Instalación');
