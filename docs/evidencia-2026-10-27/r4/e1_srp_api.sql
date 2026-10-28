-- E1: permisos de srp_api, probados CON ese rol (SET ROLE), dentro de una transacción que se deshace.
-- Cada intento va en su propio SAVEPOINT; nada queda escrito (ROLLBACK al final).
\set ON_ERROR_STOP off
SET lock_timeout = '2s';
SET statement_timeout = '20s';
BEGIN;
SET LOCAL ROLE srp_api;
SELECT current_user AS ahora_soy, current_setting('search_path') AS search_path;
-- Debe funcionar
SAVEPOINT a; SELECT count(*) AS plantaciones FROM srp.plantaciones; RELEASE a;
SAVEPOINT a; SELECT count(*) AS alcaldias FROM territorio.alcaldia; RELEASE a;
SAVEPOINT a; SELECT to_regclass('territorio.calles') AS capa_calles, to_regclass('territorio.calles_version') AS capa_version; RELEASE a;
SAVEPOINT a; SELECT count(*) AS tramos FROM territorio.calles; RELEASE a;
SAVEPOINT a; SELECT version, instalada FROM territorio.calles_version ORDER BY instalada DESC LIMIT 3; RELEASE a;
SAVEPOINT a; SELECT calle_estado, calle, calle_entre_1, calle_entre_2, calle_distancia_m, calle_version FROM srp.calle(19.4326, -99.1332); RELEASE a;
SAVEPOINT a; SELECT has_table_privilege('srp.bitacora', 'INSERT') AS bit_ins, has_table_privilege('srp.bitacora_acceso', 'INSERT') AS acc_ins; RELEASE a;
SAVEPOINT a; SHOW statement_timeout; RELEASE a;
-- Debe fallar
SAVEPOINT a; UPDATE srp.bitacora SET detalle = 'x' WHERE false; ROLLBACK TO a;
SAVEPOINT a; DELETE FROM srp.bitacora WHERE false; ROLLBACK TO a;
SAVEPOINT a; DELETE FROM srp.bitacora_acceso WHERE false; ROLLBACK TO a;
SAVEPOINT a; DELETE FROM srp.folios WHERE false; ROLLBACK TO a;
SAVEPOINT a; DELETE FROM srp.fotografias WHERE false; ROLLBACK TO a;
SAVEPOINT a; DELETE FROM srp.duplicados WHERE false; ROLLBACK TO a;
SAVEPOINT a; DELETE FROM srp.cargas WHERE false; ROLLBACK TO a;
SAVEPOINT a; DELETE FROM srp.plantaciones WHERE false; ROLLBACK TO a;
SAVEPOINT a; DELETE FROM srp.sesiones WHERE false; ROLLBACK TO a;
SAVEPOINT a; DELETE FROM srp.credenciales WHERE false; ROLLBACK TO a;
SAVEPOINT a; CREATE TABLE srp.otra (x int); ROLLBACK TO a;
SAVEPOINT a; CREATE TABLE public.otra (x int); ROLLBACK TO a;
SAVEPOINT a; CREATE SCHEMA srp_api; ROLLBACK TO a;
SAVEPOINT a; INSERT INTO srp.migraciones VALUES (2, 'x'); ROLLBACK TO a;
SAVEPOINT a; SELECT srp.recalcular_calles(); ROLLBACK TO a;
SAVEPOINT a; UPDATE territorio.alcaldia SET nombre = 'x' WHERE false; ROLLBACK TO a;
SAVEPOINT a; UPDATE territorio.calles SET nombre = 'x' WHERE false; ROLLBACK TO a;
SAVEPOINT a; INSERT INTO territorio.calles_version (version) VALUES ('9.9.9'); ROLLBACK TO a;
SAVEPOINT a; DELETE FROM territorio.calles_version WHERE false; ROLLBACK TO a;
SAVEPOINT a; UPDATE srp.capa_prioritarias SET geom = geom WHERE false; ROLLBACK TO a;
-- Control global: ningún permiso directo fuera de srp
SAVEPOINT a; SELECT count(*) AS permisos_directos_fuera_de_srp FROM information_schema.role_table_grants WHERE grantee = 'srp_api' AND table_schema <> 'srp'; RELEASE a;
-- Lo que sí puede escribir directamente en campos que "pone la base" (la calle): sólo se consulta el privilegio
SAVEPOINT a; SELECT has_column_privilege('srp.plantaciones', 'calle', 'UPDATE') AS puede_escribir_calle, has_column_privilege('srp.plantaciones', 'calle_version', 'UPDATE') AS puede_escribir_calle_version; RELEASE a;
SAVEPOINT a; SELECT has_function_privilege('srp.recalcular_calles()', 'EXECUTE') AS ejecuta_recalcular, has_function_privilege('srp.calle(numeric,numeric)', 'EXECUTE') AS ejecuta_calle, has_function_privilege('srp.poner_calle()', 'EXECUTE') AS ejecuta_poner_calle; RELEASE a;
SAVEPOINT a; SELECT has_database_privilege(current_database(), 'CREATE') AS crea_esquemas, has_database_privilege(current_database(), 'TEMP') AS crea_temporales; RELEASE a;
SAVEPOINT a; SELECT nspname AS esquema, has_schema_privilege(oid, 'USAGE') AS usage, has_schema_privilege(oid, 'CREATE') AS crear FROM pg_namespace WHERE nspname NOT LIKE 'pg_%' AND nspname <> 'information_schema' ORDER BY 1; RELEASE a;
SAVEPOINT a; SELECT table_schema, table_name, string_agg(privilege_type, ',' ORDER BY privilege_type) AS privilegios FROM information_schema.role_table_grants WHERE grantee IN ('srp_api','PUBLIC') AND table_schema IN ('srp') GROUP BY 1,2 ORDER BY 1,2; RELEASE a;
ROLLBACK;
