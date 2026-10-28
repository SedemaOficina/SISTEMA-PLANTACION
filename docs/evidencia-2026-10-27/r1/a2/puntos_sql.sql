-- A2/D3 · Muestra de puntos y la calle que les da srp.calle(), como la cuenta del servicio. Sólo tablas temporales.
-- Uso: psql -w -h localhost -U srp_local_admin -d srp_local -q < evidencia/a2/puntos_sql.sql > evidencia/a2/puntos_sql.csv
SET ROLE srp_api;
SELECT setseed(0.27) \g /dev/null
CREATE TEMP TABLE pts (n serial, origen text, lat numeric, lng numeric, g_estado text, g_clave text, g_version text, g_calle text, g_e1 text, g_e2 text,
  g_esq text, g_red text, g_tipo text, g_atiende text, g_llave text, g_m integer);
-- A) los árboles de la base, con la calle que guardaron
INSERT INTO pts (origen, lat, lng, g_estado, g_clave, g_version, g_calle, g_e1, g_e2, g_esq, g_red, g_tipo, g_atiende, g_llave, g_m)
  SELECT 'arbol', lat, lng, calle_estado, calle_clave, calle_version, calle, calle_entre_1, calle_entre_2, calle_esquina, vialidad_red, vialidad_tipo, calle_atiende, calle_llave, calle_distancia_m
    FROM srp.plantaciones WHERE lat IS NOT NULL ORDER BY id;
-- B) 12,000 puntos a 0-50 m de un tramo al azar
INSERT INTO pts (origen, lat, lng)
  SELECT 'azar', round(ST_Y(q)::numeric, 6), round(ST_X(q)::numeric, 6) FROM (
    SELECT ST_Project(ST_LineInterpolatePoint(geom, random())::geography, random() * 50, random() * 2 * pi())::geometry q
      FROM (SELECT geom FROM territorio.calles ORDER BY random() LIMIT 12000) t) s;
-- C) puntos a 0-45 m de un tramo y a menos de 50 m del borde de una celda de 0.04° de la copia ligera
INSERT INTO pts (origen, lat, lng)
  SELECT 'borde', lat, lng FROM (
    SELECT round(ST_Y(q)::numeric, 6) lat, round(ST_X(q)::numeric, 6) lng FROM (
      SELECT ST_Project(ST_LineInterpolatePoint(geom, random())::geography, random() * 45, random() * 2 * pi())::geometry q
        FROM (SELECT geom FROM territorio.calles ORDER BY random() LIMIT 80000) t) s) u
   WHERE abs(lng / 0.04 - round(lng / 0.04)) * 0.04 < 0.00045 OR abs(lat / 0.04 - round(lat / 0.04)) * 0.04 < 0.00045;
COPY (
  SELECT p.n, p.origen, p.lat, p.lng, x.calle_estado, x.calle_clave, x.calle_version, x.calle, x.calle_entre_1, x.calle_entre_2, x.calle_esquina, x.vialidad_red,
         x.vialidad_tipo, x.calle_atiende, x.calle_llave, x.calle_distancia_m,
         p.g_estado, p.g_clave, p.g_version, p.g_calle, p.g_e1, p.g_e2, p.g_esq, p.g_red, p.g_tipo, p.g_atiende, p.g_llave, p.g_m
    FROM pts p, LATERAL srp.calle(p.lat, p.lng) x ORDER BY p.n
) TO STDOUT WITH CSV HEADER;
