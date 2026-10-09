-- EL SRP SOBRE territorio: la derivación de alcaldía, colonia y celda UGA de un punto, y la única capa
-- que es propia del programa. Lo corre quien administra la base, dentro de instalar.sql.
--
-- Alcaldías, colonias del IECM y malla UGA viven en el esquema compartido territorio, de sólo lectura:
-- existirían aunque el SRP no existiera, así que el SRP no guarda copia. Las colonias prioritarias para
-- reforestar sí son del programa: viven aquí, con su propia geometría, porque son otro marco de colonias
-- (2,243, no las 1,837 del IECM).

-- Qué versión de la capa propia está cargada
CREATE TABLE srp.capas (
  nombre       text         NOT NULL,
  version      text         NOT NULL,
  fecha_corte  text         NOT NULL,
  origen       text         NOT NULL,
  elementos    integer      NOT NULL,
  cargada_en   timestamptz  NOT NULL DEFAULT now(),
  CONSTRAINT capas_pk PRIMARY KEY (nombre),
  CONSTRAINT capas_nombre_valido CHECK (nombre IN ('prioritarias'))
);
COMMENT ON TABLE srp.capas IS 'Versión cargada de la capa propia del SRP, la misma de assets/capas/ en la aplicación.';

CREATE TABLE srp.capa_prioritarias (
  id         integer                       NOT NULL,
  colonia    text                          NOT NULL,
  alcaldia   text                          NOT NULL,
  prioridad  smallint                      NOT NULL,
  geom       geometry(MultiPolygon, 4326)  NOT NULL,
  CONSTRAINT capa_prioritarias_pk PRIMARY KEY (id),
  CONSTRAINT capa_prioritarias_prioridad CHECK (prioridad BETWEEN 0 AND 4)
);
CREATE INDEX capa_prioritarias_geom ON srp.capa_prioritarias USING gist (geom);
COMMENT ON TABLE srp.capa_prioritarias IS 'Colonias prioritarias para reforestar, prioridad 0 (muy baja) a 4 (muy alta). Modelo de priorización propio del programa.';

-- El punto de un árbol o de una jornada. Las tablas guardan latitud y longitud, como el teléfono; el
-- punto se calcula y tiene su índice espacial, sin agregar campos a las tablas.
CREATE FUNCTION srp.punto(lat numeric, lng numeric) RETURNS geometry
  LANGUAGE sql IMMUTABLE PARALLEL SAFE SET search_path FROM CURRENT
  AS $$ SELECT ST_SetSRID(ST_MakePoint(lng::float8, lat::float8), 4326) $$;
CREATE INDEX plantaciones_punto ON srp.plantaciones USING gist (srp.punto(lat, lng));
CREATE INDEX jornadas_punto ON srp.jornadas USING gist (srp.punto(lat, lng));

/* DERIVACIÓN TERRITORIAL: las mismas reglas que la aplicación (js/derivacion.js), sobre territorio.
   · Alcaldía (territorio.alcaldia): la que contiene el punto; el borde cuenta como dentro. Si ninguna
     lo contiene pero hay una a `margen_m` metros o menos, la más cercana, y `fuera_m` dice a cuántos
     metros quedó (al menos 1). La clave es cvegeo ('09015').
   · Celda UGA (territorio.malla_uga_1km): la que lo contiene, y a cuántos metros de su borde cayó.
   · Colonia (territorio.colonias_iecm_2022): entre las que lo contienen, la más pequeña; si no cae en
     ninguna, nula. El nombre va sin espacios dobles, como en la aplicación.
   · Donde dos polígonos empatan (un punto sobre un borde compartido) gana la clave menor, igual que en
     la aplicación, que lleva sus capas en orden de clave.
   · capa_version: la versión vigente de cada capa en territorio.version_capa, con los nombres que
     escribe la aplicación.
   Las distancias se miden sobre el elipsoide; la aplicación usa una proyección local, así que pueden
   diferir en uno o dos metros. */
CREATE FUNCTION srp.derivar(lat numeric, lng numeric, margen_m integer DEFAULT 100)
  RETURNS TABLE (alcaldia_cve text, alcaldia text, colonia_cve text, colonia text, uga text,
                 uga_borde_m integer, capa_version text, dentro boolean, fuera_m integer)
  LANGUAGE sql STABLE PARALLEL SAFE SET search_path FROM CURRENT
AS $$
  WITH p AS (SELECT srp.punto(lat, lng) AS g),
  a AS (
    SELECT x.cvegeo::text AS cve, x.nombre::text AS nombre, NULL::float8 AS d FROM territorio.alcaldia x, p
     WHERE ST_Intersects(x.geom, p.g) ORDER BY x.cvegeo LIMIT 1),
  cerca AS (
    SELECT x.cvegeo::text, x.nombre::text, ST_Distance(x.geom::geography, p.g::geography) FROM territorio.alcaldia x, p
     WHERE NOT EXISTS (SELECT 1 FROM a) AND ST_DWithin(x.geom::geography, p.g::geography, margen_m)
     ORDER BY 3, x.cvegeo LIMIT 1),
  alc AS (SELECT * FROM a UNION ALL SELECT * FROM cerca),
  u AS (
    SELECT x.clave::text AS clave, ST_Distance(ST_Boundary(x.geom)::geography, p.g::geography) AS d
      FROM territorio.malla_uga_1km x, p
     WHERE ST_Intersects(x.geom, p.g) ORDER BY x.clave LIMIT 1),
  col AS (
    SELECT x.cveut::text AS clave, btrim(regexp_replace(x.ut, ' {2,}', ' ', 'g')) AS nombre
      FROM territorio.colonias_iecm_2022 x, p
     WHERE ST_Intersects(x.geom, p.g) ORDER BY ST_Area(x.geom), x.cveut LIMIT 1),
  vigente AS (
    SELECT DISTINCT ON (v.capa) v.capa, v.version FROM territorio.version_capa v
     WHERE v.vigente AND v.capa IN ('alcaldia', 'malla_uga_1km', 'colonias_iecm_2022')
     ORDER BY v.capa, v.cargada_en DESC),
  ver AS (
    SELECT string_agg(n.app || '=' || v.version, ';' ORDER BY n.orden) AS v
      FROM vigente v JOIN (VALUES ('alcaldia', 'alcaldias', 1), ('malla_uga_1km', 'uga', 2), ('colonias_iecm_2022', 'colonias', 3))
        AS n(capa, app, orden) USING (capa))
  SELECT alc.cve, alc.nombre, col.clave, col.nombre, u.clave, round(u.d)::integer, ver.v,
         alc.cve IS NOT NULL, CASE WHEN alc.d IS NULL THEN 0 ELSE greatest(1, round(alc.d))::integer END
    FROM ver LEFT JOIN alc ON true LEFT JOIN u ON true LEFT JOIN col ON true
$$;
COMMENT ON FUNCTION srp.derivar(numeric, numeric, integer) IS 'Alcaldía, colonia y celda UGA de un punto sobre territorio, con las mismas reglas que la aplicación (js/derivacion.js).';
