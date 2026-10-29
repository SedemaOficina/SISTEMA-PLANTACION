-- INSTALACIÓN COMPLETA DEL ESQUEMA srp, en una sola transacción: o queda todo o no queda nada.
-- Se corre con psql, conectado a la base donde vivirá el esquema, como quien la administra, desde esta
-- carpeta. Requiere PostGIS y el esquema territorio con su rol territorio_lectura.
--
--   psql -d <base> -v ON_ERROR_STOP=on -f instalar.sql
--
-- Si psql recibe el SQL por la entrada estándar, `\ir` no encuentra los archivos: para esa vía está
-- srp-instalar-por-stdin.sql, que trae estos mismos guiones ya juntos, dentro de BEGIN y COMMIT.
--
-- Después siguen los pasos de la cuenta srp_api, al principio de 10-srp-rol-y-grants.sql.

\set ON_ERROR_STOP on
BEGIN;
\ir 01-srp-esquema.sql
\ir 02-srp-tablas.sql
\ir 03-srp-acceso.sql
\ir 04-srp-sobre-territorio.sql
\ir 05-srp-fotografias.sql
\ir 06-srp-parametros.sql
\ir 07-srp-duplicados.sql
\ir 08-srp-cargas.sql
\ir 09-srp-calles.sql
\ir 10-srp-rol-y-grants.sql
COMMIT;
