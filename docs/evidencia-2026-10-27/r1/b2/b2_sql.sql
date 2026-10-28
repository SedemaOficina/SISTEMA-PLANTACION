-- B2 · Recálculo propio, sólo con SQL sobre srp.*, de lo que debe ver una Coordinación de la Secretaría (o-sedema) en
-- «Todo»: árboles activos de cabos de su institución, en jornadas cerradas de su institución. Por tipo de jornada
-- (compartida: alguna vez tuvo cabos de apoyo), por red vial, por quién atiende y por calle (llave + alcaldía).
-- Uso: psql ... -q < evidencia/b2/b2_sql.sql
SET ROLE srp_api;
CREATE TEMP VIEW cuentan AS
  SELECT p.*, j.estatus AS j_estatus, (jsonb_array_length(j.cabos_apoyo) > 0) AS compartida
    FROM srp.plantaciones p JOIN srp.jornadas j ON j.id = p.jornada_id JOIN srp.usuarios u ON u.id = p.cabo_id
   WHERE p.estatus = 'activo' AND j.organizacion_id = 'o-sedema' AND u.organizacion_id = 'o-sedema' AND j.estatus <> 'abierta';
\echo '== Totales: árboles, jornadas con árboles, lejos, sin calcular (todo / compartidas / no compartidas)'
SELECT 'todo' t, count(*), count(DISTINCT jornada_id), count(*) FILTER (WHERE calle_estado = 'lejos'), count(*) FILTER (WHERE calle_estado IS NULL) FROM cuentan
UNION ALL SELECT 'si', count(*), count(DISTINCT jornada_id), count(*) FILTER (WHERE calle_estado = 'lejos'), count(*) FILTER (WHERE calle_estado IS NULL) FROM cuentan WHERE compartida
UNION ALL SELECT 'no', count(*), count(DISTINCT jornada_id), count(*) FILTER (WHERE calle_estado = 'lejos'), count(*) FILTER (WHERE calle_estado IS NULL) FROM cuentan WHERE NOT compartida;
\echo '== Jornadas cerradas de la institución (todas / compartidas)'
SELECT count(*), count(*) FILTER (WHERE jsonb_array_length(cabos_apoyo) > 0) FROM srp.jornadas WHERE organizacion_id = 'o-sedema' AND estatus <> 'abierta';
\echo '== Árboles activos en jornadas compartidas de la institución, por estatus de la jornada y por institución del cabo'
SELECT j.estatus, u.organizacion_id, count(*) FROM srp.plantaciones p JOIN srp.jornadas j ON j.id = p.jornada_id JOIN srp.usuarios u ON u.id = p.cabo_id
 WHERE p.estatus = 'activo' AND j.organizacion_id = 'o-sedema' AND jsonb_array_length(j.cabos_apoyo) > 0 GROUP BY 1, 2 ORDER BY 1, 2;
\echo '== Por red vial (todo): árboles, calles distintas (llave+alcaldía con algún árbol en esa red)'
SELECT vialidad_red, count(*), count(DISTINCT coalesce(calle_llave, '') || '|' || coalesce(alcaldia, '')) FROM cuentan WHERE calle_estado = 'ok' GROUP BY 1 ORDER BY 1;
\echo '== Calles (llave+alcaldía) con árboles en más de una red vial'
SELECT count(*) FROM (SELECT coalesce(calle_llave, '') || '|' || coalesce(alcaldia, '') k FROM cuentan WHERE calle_estado = 'ok' GROUP BY 1 HAVING count(DISTINCT vialidad_red) > 1) x;
\echo '== Por quién atiende (todo)'
SELECT coalesce(calle_atiende, 'Por confirmar'), count(*) FROM cuentan WHERE calle_estado = 'ok' GROUP BY 1 ORDER BY 2 DESC, 1;
\echo '== Por red vial y quién atiende (todo)'
SELECT vialidad_red, coalesce(calle_atiende, 'Por confirmar'), count(*) FROM cuentan WHERE calle_estado = 'ok' GROUP BY 1, 2 ORDER BY 1, 3 DESC;
\echo '== Por calle (todo): número de calles y las 15 con más árboles'
SELECT count(DISTINCT coalesce(calle_llave, '') || '|' || coalesce(alcaldia, '')) FROM cuentan WHERE calle_estado = 'ok';
SELECT coalesce(calle_llave, '') || '|' || coalesce(alcaldia, '') k, count(*), count(DISTINCT jornada_id) FROM cuentan WHERE calle_estado = 'ok' GROUP BY 1 ORDER BY 2 DESC, 1 LIMIT 15;
\echo '== Por red vial (compartidas / no)'
SELECT compartida, vialidad_red, count(*), count(DISTINCT coalesce(calle_llave, '') || '|' || coalesce(alcaldia, '')) FROM cuentan WHERE calle_estado = 'ok' GROUP BY 1, 2 ORDER BY 1, 2;
