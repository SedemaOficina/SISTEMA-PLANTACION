-- CAPAS TERRITORIALES EN PostGIS y la derivación de alcaldía, colonia y celda UGA de un punto. Las
-- capas son las mismas que lleva la aplicación (assets/capas/), para que el teléfono y el servidor
-- ubiquen igual cada árbol; se cargan después de instalar, con «npm run cargar -- capas». Lo corre la
-- cuenta propietaria. PostGIS lo instala antes quien administra la base, en un esquema que esté en la
-- ruta de búsqueda de quien instala (de costumbre, public).

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'postgis') THEN
    RAISE EXCEPTION 'PostGIS no está instalado en esta base: lo instala quien la administra (CREATE EXTENSION postgis) antes del SRP';
  END IF;
END $$;

SET ROLE srp_propietario;

-- Qué versión de cada capa está cargada: la misma que anota cada árbol en capa_version
CREATE TABLE srp.capas (
  nombre       text         NOT NULL,
  version      text         NOT NULL,
  fecha_corte  text         NOT NULL,
  origen       text         NOT NULL,
  elementos    integer      NOT NULL,
  cargada_en   timestamptz  NOT NULL DEFAULT now(),
  CONSTRAINT capas_pk PRIMARY KEY (nombre),
  CONSTRAINT capas_nombre_valido CHECK (nombre IN ('alcaldias', 'colonias', 'uga', 'prioritarias'))
);
COMMENT ON TABLE srp.capas IS 'Versión cargada de cada capa territorial, la misma de assets/capas/ en la aplicación.';

-- `orden` es el de la capa en la aplicación: donde dos polígonos contienen el punto, el orden decide
CREATE TABLE srp.capa_alcaldias (
  cvegeo  char(5)                       NOT NULL,
  nombre  text                          NOT NULL,
  clave   char(3)                       NOT NULL,
  orden   integer                       NOT NULL,
  geom    geometry(MultiPolygon, 4326)  NOT NULL,
  CONSTRAINT capa_alcaldias_pk PRIMARY KEY (cvegeo),
  CONSTRAINT capa_alcaldias_valida CHECK (ST_IsValid(geom))
);
CREATE TABLE srp.capa_colonias (
  clave   text                          NOT NULL,
  nombre  text                          NOT NULL,
  orden   integer                       NOT NULL,
  geom    geometry(MultiPolygon, 4326)  NOT NULL,
  CONSTRAINT capa_colonias_pk PRIMARY KEY (clave),
  CONSTRAINT capa_colonias_valida CHECK (ST_IsValid(geom))
);
CREATE TABLE srp.capa_uga (
  clave   char(7)                       NOT NULL,
  orden   integer                       NOT NULL,
  geom    geometry(MultiPolygon, 4326)  NOT NULL,
  CONSTRAINT capa_uga_pk PRIMARY KEY (clave),
  CONSTRAINT capa_uga_valida CHECK (ST_IsValid(geom))
);
CREATE TABLE srp.capa_prioritarias (
  id         integer                       NOT NULL,
  colonia    text                          NOT NULL,
  alcaldia   text                          NOT NULL,
  prioridad  smallint                      NOT NULL,
  orden      integer                       NOT NULL,
  geom       geometry(MultiPolygon, 4326)  NOT NULL,
  CONSTRAINT capa_prioritarias_pk PRIMARY KEY (id),
  CONSTRAINT capa_prioritarias_prioridad CHECK (prioridad BETWEEN 0 AND 4)
);
CREATE INDEX capa_alcaldias_geom ON srp.capa_alcaldias USING gist (geom);
CREATE INDEX capa_colonias_geom ON srp.capa_colonias USING gist (geom);
CREATE INDEX capa_uga_geom ON srp.capa_uga USING gist (geom);
CREATE INDEX capa_prioritarias_geom ON srp.capa_prioritarias USING gist (geom);
COMMENT ON TABLE srp.capa_alcaldias IS 'Las 16 alcaldías (clave INEGI cvegeo). Definen la alcaldía de cada árbol.';
COMMENT ON TABLE srp.capa_colonias IS 'Las colonias del IECM 2022 (clave CVEUT), unidad oficial de reporte. Donde se enciman, gana la más pequeña.';
COMMENT ON TABLE srp.capa_uga IS 'La malla UGA de hexágonos de ~1 km². Su clave forma el folio de cada árbol.';
COMMENT ON TABLE srp.capa_prioritarias IS 'Colonias prioritarias para reforestar, prioridad 0 (muy baja) a 4 (muy alta).';

-- El punto de un árbol o de una jornada. Las tablas guardan latitud y longitud, como el teléfono; el
-- punto se calcula y tiene su índice espacial, sin agregar campos a las tablas.
CREATE FUNCTION srp.punto(lat numeric, lng numeric) RETURNS geometry
  LANGUAGE sql IMMUTABLE PARALLEL SAFE SET search_path FROM CURRENT
  AS $$ SELECT ST_SetSRID(ST_MakePoint(lng::float8, lat::float8), 4326) $$;
CREATE INDEX plantaciones_punto ON srp.plantaciones USING gist (srp.punto(lat, lng));
CREATE INDEX jornadas_punto ON srp.jornadas USING gist (srp.punto(lat, lng));

/* DERIVACIÓN TERRITORIAL: las mismas reglas que la aplicación (js/derivacion.js).
   · Alcaldía: el primer polígono, en el orden de la capa, que contiene el punto; el borde cuenta como
     dentro. Si ninguno lo contiene pero hay uno a `margen_m` metros o menos, el más cercano, y
     `fuera_m` dice a cuántos metros quedó (al menos 1).
   · Celda UGA: la primera que lo contiene, y a cuántos metros de su borde cayó el punto.
   · Colonia: entre las que lo contienen, la más pequeña; si no cae en ninguna, nula.
   · capa_version: la versión de cada capa usada, como la escribe la aplicación.
   Las distancias se miden sobre el elipsoide; la aplicación usa una proyección local, así que pueden
   diferir en uno o dos metros. */
CREATE FUNCTION srp.derivar(lat numeric, lng numeric, margen_m integer DEFAULT 100)
  RETURNS TABLE (alcaldia_cve text, alcaldia text, colonia_cve text, colonia text, uga text,
                 uga_borde_m integer, capa_version text, dentro boolean, fuera_m integer)
  LANGUAGE sql STABLE PARALLEL SAFE SET search_path FROM CURRENT
AS $$
  WITH p AS (SELECT srp.punto(lat, lng) AS g),
  a AS (
    SELECT x.cvegeo::text AS cve, x.nombre, NULL::float8 AS d FROM srp.capa_alcaldias x, p
     WHERE ST_Intersects(x.geom, p.g) ORDER BY x.orden LIMIT 1),
  cerca AS (
    SELECT x.cvegeo::text AS cve, x.nombre, ST_Distance(x.geom::geography, p.g::geography) AS d FROM srp.capa_alcaldias x, p
     WHERE NOT EXISTS (SELECT 1 FROM a) AND ST_DWithin(x.geom::geography, p.g::geography, margen_m)
     ORDER BY 3, x.orden LIMIT 1),
  alc AS (SELECT * FROM a UNION ALL SELECT * FROM cerca),
  u AS (
    SELECT x.clave::text AS clave, ST_Distance(ST_Boundary(x.geom)::geography, p.g::geography) AS d FROM srp.capa_uga x, p
     WHERE ST_Intersects(x.geom, p.g) ORDER BY x.orden LIMIT 1),
  col AS (
    SELECT x.clave, x.nombre FROM srp.capa_colonias x, p
     WHERE ST_Intersects(x.geom, p.g) ORDER BY ST_Area(x.geom), x.orden LIMIT 1),
  ver AS (
    SELECT string_agg(c.nombre || '=' || c.version, ';' ORDER BY array_position(ARRAY['alcaldias', 'uga', 'colonias'], c.nombre)) AS v
      FROM srp.capas c WHERE c.nombre IN ('alcaldias', 'uga', 'colonias'))
  SELECT alc.cve, alc.nombre, col.clave, col.nombre, u.clave, round(u.d)::integer, ver.v,
         alc.cve IS NOT NULL, CASE WHEN alc.d IS NULL THEN 0 ELSE greatest(1, round(alc.d))::integer END
    FROM ver LEFT JOIN alc ON true LEFT JOIN u ON true LEFT JOIN col ON true
$$;
COMMENT ON FUNCTION srp.derivar(numeric, numeric, integer) IS 'Alcaldía, colonia y celda UGA de un punto, con las mismas reglas que la aplicación (js/derivacion.js).';

RESET ROLE;
