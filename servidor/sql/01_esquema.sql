-- ESQUEMA srp. Lo corre quien administra la base, después de 00_cuentas.sql. Falla si el esquema ya
-- existe: una instalación nunca escribe sobre otra; los cambios posteriores van como migraciones.

CREATE SCHEMA srp AUTHORIZATION srp_propietario;

SET ROLE srp_propietario;

COMMENT ON SCHEMA srp IS 'Sistema de Registro de Plantaciones (SRP): jornadas y árboles plantados, catálogos, cuentas y bitácora.';

-- Nadie más usa el esquema salvo a quien se le concede en 04_permisos.sql
REVOKE ALL ON SCHEMA srp FROM PUBLIC;

-- Qué versiones del esquema están aplicadas. La instalación es la 1; cada migración agrega la suya.
CREATE TABLE srp.migraciones (
  version      integer      NOT NULL,
  nombre       text         NOT NULL,
  aplicada_en  timestamptz  NOT NULL DEFAULT now(),
  CONSTRAINT migraciones_pk PRIMARY KEY (version)
);
COMMENT ON TABLE srp.migraciones IS 'Versiones del esquema aplicadas, en orden. La instalación es la 1.';

RESET ROLE;
