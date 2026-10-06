-- INSTALACIÓN COMPLETA DEL ESQUEMA srp, en una sola transacción: o queda todo o no queda nada.
-- Se corre con psql, conectado a la base donde vivirá el esquema, como quien la administra:
--
--   psql -h <servidor> -U <administrador> -d <base> -v ON_ERROR_STOP=1 -f instalar.sql
--
-- Después, el administrador le pone contraseña a srp_servicio (ALTER ROLE srp_servicio PASSWORD …)
-- y la entrega a quien configure el servicio, fuera del repositorio.

\set ON_ERROR_STOP on
BEGIN;
\ir 00_cuentas.sql
\ir 01_esquema.sql
\ir 02_tablas.sql
\ir 03_acceso.sql
\ir 04_capas.sql
\ir 05_permisos.sql
COMMIT;
