-- RÉPLICA LOCAL DEL ESQUEMA territorio DEL SIA. SÓLO PARA LA BASE LOCAL DE DESARROLLO: nunca se entrega
-- ni se corre en los servidores del SIA, donde territorio ya existe y lo administra el SIA.
--
-- Crea sólo las tablas de territorio que lee el SRP, con los mismos nombres, columnas y tipos que en el
-- SIA, y el rol de grupo territorio_lectura con su permiso de sólo lectura. Los datos los carga
-- «npm run cargar -- territorio» desde assets/capas/, que son las mismas capas que lleva la aplicación.
-- Se puede correr más de una vez: crea sólo lo que falta.

CREATE SCHEMA IF NOT EXISTS territorio;

-- Qué versión de cada capa está cargada y de dónde salió
CREATE TABLE IF NOT EXISTS territorio.version_capa (
  id_version  bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  capa        varchar(40)  NOT NULL,
  version     varchar(100) NOT NULL,
  fuente      text         NOT NULL,
  cargada_en  timestamptz  NOT NULL DEFAULT now(),
  filas       integer      NOT NULL CHECK (filas >= 0),
  vigente     boolean      NOT NULL DEFAULT true,
  nota        text,
  UNIQUE (capa, version)
);

-- Las 16 alcaldías. cve_alcaldia es la clave municipal del INEGI ('015'); cvegeo, entidad y municipio ('09015')
CREATE TABLE IF NOT EXISTS territorio.alcaldia (
  cve_alcaldia    char(3) PRIMARY KEY CHECK (cve_alcaldia ~ '^[0-9]{3}$'),
  cve_ut_prefijo  char(2) NOT NULL UNIQUE CHECK (cve_ut_prefijo ~ '^[0-9]{2}$'),
  nombre          varchar(100) NOT NULL UNIQUE,
  cvegeo          char(5),
  geom            geometry(MultiPolygon, 4326) NOT NULL,
  CHECK (ST_IsValid(geom))
);
CREATE INDEX IF NOT EXISTS ix_alcaldia_geom ON territorio.alcaldia USING gist (geom);

-- La malla hexagonal de 1 km² que forma el prefijo del folio ('CUH-021')
CREATE TABLE IF NOT EXISTS territorio.malla_uga_1km (
  clave           varchar(20) PRIMARY KEY CHECK (clave ~ '^[A-Z]{3}-[0-9]{3}$'),
  cve_alcaldia_3  char(3) NOT NULL,
  consecutivo     char(3) NOT NULL,
  geom            geometry(Polygon, 4326) NOT NULL,
  version         varchar(100) NOT NULL,
  CHECK (ST_IsValid(geom))
);
CREATE INDEX IF NOT EXISTS ix_malla_uga_geom ON territorio.malla_uga_1km USING gist (geom);

-- Las colonias del IECM 2022: clave cveut ('15-001') y nombre ut, como vienen del shapefile
CREATE TABLE IF NOT EXISTS territorio.colonias_iecm_2022 (
  id          integer PRIMARY KEY,
  cveut       varchar(30)  NOT NULL,
  ut          varchar(200) NOT NULL,
  demarcacio  varchar(100),
  geom        geometry(MultiPolygon, 4326) NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS ux_colonias_iecm_2022_cveut ON territorio.colonias_iecm_2022 (cveut);
CREATE INDEX IF NOT EXISTS ix_colonias_iecm_2022_geom ON territorio.colonias_iecm_2022 USING gist (geom);

-- El rol de grupo con que cada módulo lee territorio: no se conecta, sólo se otorga
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'territorio_lectura') THEN
    CREATE ROLE territorio_lectura NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS;
  END IF;
END $$;

GRANT USAGE ON SCHEMA territorio TO territorio_lectura;
GRANT SELECT ON territorio.version_capa, territorio.alcaldia, territorio.malla_uga_1km, territorio.colonias_iecm_2022
  TO territorio_lectura;
