-- INSTALACIÓN COMPLETA DEL ESQUEMA srp, en una sola transacción: o queda todo o no queda nada.
-- Se corre con psql, conectado a la base donde vivirá el esquema, como quien la administra, desde esta
-- carpeta. Requiere PostGIS y el esquema territorio con su rol territorio_lectura.
--
--   psql -d <base> -v ON_ERROR_STOP=on -f instalar.sql
--
-- Después siguen los pasos de la cuenta srp_api, al principio de 05-srp-rol-y-grants.sql.

\set ON_ERROR_STOP on
BEGIN;
\ir 01-srp-esquema.sql
\ir 02-srp-tablas.sql
\ir 03-srp-acceso.sql
\ir 04-srp-sobre-territorio.sql
\ir 05-srp-rol-y-grants.sql
COMMIT;
