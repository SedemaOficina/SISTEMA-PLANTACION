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
END $$;

CREATE SCHEMA IF NOT EXISTS srp;

COMMENT ON SCHEMA srp IS 'Sistema de Registro de Plantaciones (SRP): jornadas y árboles plantados, catálogos, cuentas y bitácora.';

-- Nadie más usa el esquema salvo a quien se le concede en 05-srp-rol-y-grants.sql
REVOKE ALL ON SCHEMA srp FROM PUBLIC;

-- Qué versiones del esquema están aplicadas. La instalación es la 1; cada migración agrega la suya.
CREATE TABLE srp.migraciones (
  version      integer      NOT NULL,
  nombre       text         NOT NULL,
  aplicada_en  timestamptz  NOT NULL DEFAULT now(),
  CONSTRAINT migraciones_pk PRIMARY KEY (version)
);
COMMENT ON TABLE srp.migraciones IS 'Versiones del esquema aplicadas, en orden. La instalación es la 1.';
