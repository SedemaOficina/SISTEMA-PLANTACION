#!/bin/sh
# r5 · La calle con el servidor SIN la capa instalada, simulada en una COPIA de 09-srp-calles.sql dentro de pg_temp:
# la función, el disparador y el recálculo se crean como temporales, sobre una tabla temporal copiada de srp.plantaciones,
# y apuntan a territorio.calles_r5_ausente (que no existe). No toca la base compartida: todo vive en la sesión y termina en ROLLBACK.
# Uso: sh evidencia/calles_sin_capa.sh > evidencia/salidas/calles_sin_capa.txt 2>&1
AQUI=$(cd "$(dirname "$0")" && pwd)
PSQL="/c/Program Files/PostgreSQL/17/bin/psql.exe"
export PGCLIENTENCODING=UTF8
COPIA=$(sed -e 's/territorio\.calles_version/territorio.calles_r5_ausente_version/g' \
            -e 's/territorio\.calles\([^_]\)/territorio.calles_r5_ausente\1/g' \
            -e "s/to_regclass('territorio\.calles')/to_regclass('territorio.calles_r5_ausente')/g" \
            -e 's/srp\.calle(/pg_temp.calle(/g' -e 's/srp\.poner_calle()/pg_temp.poner_calle()/g' -e 's/srp\.recalcular_calles()/pg_temp.recalcular_calles()/g' \
            -e 's/ON srp\.plantaciones/ON pg_temp.r5_plantaciones/g' -e 's/UPDATE srp\.plantaciones/UPDATE pg_temp.r5_plantaciones/g' \
            -e '/^COMMENT ON FUNCTION/d' "$AQUI/../servidor/db/srp/09-srp-calles.sql")
echo "--- Lo que cambió la copia (las referencias que quedan a la capa y a srp.plantaciones):"
echo "$COPIA" | grep -n "territorio\.\|plantaciones\|pg_temp" | head -20
"$PSQL" -w -h localhost -U srp_local_admin -d srp_local -v ON_ERROR_STOP=0 <<SQL
\timing on
BEGIN;
SELECT to_regclass('territorio.calles_r5_ausente') AS capa_ausente;
CREATE TEMP TABLE r5_plantaciones (LIKE srp.plantaciones INCLUDING DEFAULTS INCLUDING CONSTRAINTS);
$COPIA
-- 1. Alta de árboles con la capa ausente: entran, sin calle
INSERT INTO r5_plantaciones SELECT * FROM srp.plantaciones ORDER BY id LIMIT 200;
SELECT count(*) AS altas, count(*) FILTER (WHERE calle_estado IS NULL AND calle IS NULL AND calle_version IS NULL) AS sin_calle FROM r5_plantaciones;
-- 2. Mover el punto con la capa ausente: no falla y la calle queda por calcular
UPDATE r5_plantaciones SET lat = lat + 0.0005 WHERE id IN (SELECT id FROM r5_plantaciones LIMIT 5);
SELECT count(*) FILTER (WHERE calle_estado IS NULL) AS sin_calle_tras_mover FROM r5_plantaciones;
-- 3. El recálculo con la capa ausente: se detiene con su mensaje
SAVEPOINT a;
SELECT pg_temp.recalcular_calles();
ROLLBACK TO SAVEPOINT a;
-- 4. La función sola
SELECT * FROM pg_temp.calle(19.4326, -99.1332);
ROLLBACK;
SQL
