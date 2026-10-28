#!/bin/sh
# r5 · ¿Cuánto tarda srp.recalcular_calles() con muchos árboles? Se mide el MISMO UPDATE de la función, con la srp.calle real
# y la capa instalada, sobre COPIAS temporales de srp.plantaciones (x1 y x4). No toca la base compartida: termina en ROLLBACK.
# Uso: sh evidencia/calles_recalcular.sh > evidencia/salidas/calles_recalcular.txt 2>&1
PSQL="/c/Program Files/PostgreSQL/17/bin/psql.exe"
export PGCLIENTENCODING=UTF8
"$PSQL" -w -h localhost -U srp_local_admin -d srp_local <<'SQL'
\timing on
BEGIN;
CREATE TEMP TABLE r5_plantaciones (LIKE srp.plantaciones INCLUDING DEFAULTS);
INSERT INTO r5_plantaciones SELECT * FROM srp.plantaciones;
SELECT count(*) AS arboles_copia FROM r5_plantaciones;
-- x1: todos sin calle, como tras instalar la capa por primera vez
UPDATE r5_plantaciones SET calle_version = NULL;
UPDATE r5_plantaciones x
   SET (calle_estado, calle_clave, calle_version, calle, calle_entre_1, calle_entre_2, calle_esquina, vialidad_red, vialidad_tipo,
        calle_atiende, calle_llave, calle_distancia_m) = (SELECT * FROM srp.calle(x.lat, x.lng))
 WHERE x.calle_version IS DISTINCT FROM '1.0.0';
-- ¿Da lo mismo que lo guardado?
SELECT count(*) AS comparados, count(*) FILTER (WHERE r.calle_clave IS DISTINCT FROM p.calle_clave OR r.calle_estado IS DISTINCT FROM p.calle_estado) AS distintos
  FROM r5_plantaciones r JOIN srp.plantaciones p USING (id);
-- x4: tres copias más con otro identificador
INSERT INTO r5_plantaciones SELECT (jsonb_populate_record(NULL::r5_plantaciones, to_jsonb(p) || jsonb_build_object('id', gen_random_uuid(), 'folio', NULL))).* FROM srp.plantaciones p, generate_series(1, 3);
SELECT count(*) AS arboles_copia_x4 FROM r5_plantaciones;
UPDATE r5_plantaciones SET calle_version = NULL;
UPDATE r5_plantaciones x
   SET (calle_estado, calle_clave, calle_version, calle, calle_entre_1, calle_entre_2, calle_esquina, vialidad_red, vialidad_tipo,
        calle_atiende, calle_llave, calle_distancia_m) = (SELECT * FROM srp.calle(x.lat, x.lng))
 WHERE x.calle_version IS DISTINCT FROM '1.0.0';
-- Una sola calle, 200 veces (lo que cuesta cada alta)
SELECT count(*) FROM (SELECT (srp.calle(19.35 + i * 0.0003, -99.10 + i * 0.0002)).calle_estado FROM generate_series(1, 200) i) x;
ROLLBACK;
SQL
