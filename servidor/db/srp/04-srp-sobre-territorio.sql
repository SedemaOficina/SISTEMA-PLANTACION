-- EL SRP SOBRE territorio: la derivación de alcaldía, colonia y celda UGA de un punto, el folio que se
-- arma con esa celda, la única capa que es propia del programa y la prioridad que se congela con ella. Lo
-- corre quien administra la base, dentro de instalar.sql.
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

-- EL FOLIO DEL EJEMPLAR: AAA-000-00000, la celda UGA del punto y un consecutivo de esa celda. Lo asigna el
-- servidor una sola vez, al recibir el árbol, en la misma transacción (R3), con el id del árbol como
-- clave (R4). El consecutivo sale de una secuencia por celda, perpetua y que sólo avanza: se lee y se
-- incrementa en un solo paso, nunca con MAX(folio)+1 ni contando árboles (R5). Los huecos se aceptan;
-- repetir un número, no. Al llegar a 99,999 la celda deja de dar folios y el árbol queda PROVISIONAL hasta
-- que el SIA decida (R6). Un folio no cambia ni se anula (R7). EXT-000 es la celda de un punto fuera de la
-- malla.
CREATE TABLE srp.folio_secuencias (
  celda    char(7)  NOT NULL,
  ultimo   integer  NOT NULL,
  CONSTRAINT folio_secuencias_pk PRIMARY KEY (celda),
  CONSTRAINT folio_secuencias_celda CHECK (celda ~ '^[A-Z]{3}-\d{3}$'),
  CONSTRAINT folio_secuencias_rango CHECK (ultimo BETWEEN 1 AND 99999)
);
COMMENT ON TABLE srp.folio_secuencias IS 'El último consecutivo dado en cada celda UGA. Sólo avanza: no se reinicia por ejercicio, administración ni versión.';

-- Lo que se congela al asignar el folio (R8): la celda, la versión de las capas y el punto con que se
-- asignó. Son datos del servidor: el teléfono sólo recibe el folio. Nada de esto se edita ni se borra.
CREATE TABLE srp.folios (
  plantacion_id        uuid          NOT NULL,
  folio                char(13)      NOT NULL,
  folio_uga            char(7)       NOT NULL,
  folio_capa_version   text          NOT NULL,
  folio_lat            numeric(9,6)  NOT NULL,
  folio_lng            numeric(9,6)  NOT NULL,
  asignado_en          timestamptz   NOT NULL DEFAULT now(),
  CONSTRAINT folios_pk PRIMARY KEY (plantacion_id),
  CONSTRAINT folios_folio_unico UNIQUE (folio),
  CONSTRAINT folios_folio_patron CHECK (folio ~ '^[A-Z]{3}-\d{3}-\d{5}$' AND left(folio, 7) = folio_uga)
);
COMMENT ON TABLE srp.folios IS 'Cada folio emitido, con la celda, la versión de capas y el punto congelados al asignarlo (R8).';
ALTER TABLE srp.folios ADD CONSTRAINT folios_plantacion_id_fk FOREIGN KEY (plantacion_id) REFERENCES srp.plantaciones (id) ON DELETE RESTRICT;

CREATE FUNCTION srp.folio_inmutable() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_TABLE_NAME = 'plantaciones' THEN
    IF OLD.folio IS NOT NULL AND NEW.folio IS DISTINCT FROM OLD.folio THEN
      RAISE EXCEPTION 'El folio % no cambia ni se anula', OLD.folio;
    END IF;
    RETURN NEW;
  END IF;
  RAISE EXCEPTION 'Un folio emitido no se edita ni se borra';
END $$;
CREATE TRIGGER plantaciones_folio_inmutable BEFORE UPDATE OF folio ON srp.plantaciones
  FOR EACH ROW EXECUTE FUNCTION srp.folio_inmutable();
CREATE TRIGGER folios_inmutables BEFORE UPDATE OR DELETE ON srp.folios
  FOR EACH ROW EXECUTE FUNCTION srp.folio_inmutable();
CREATE TRIGGER folios_sin_vaciar BEFORE TRUNCATE ON srp.folios
  FOR EACH STATEMENT EXECUTE FUNCTION srp.folio_inmutable();

-- LA PRIORIDAD DE LA COLONIA donde cae un punto, sobre la capa propia: la del polígono que lo contiene; si se
-- enciman, la del más pequeño, como en la aplicación (js/prioritarias.js). Sin colonia de la capa, ninguna fila.
CREATE FUNCTION srp.prioridad(lat numeric, lng numeric)
  RETURNS TABLE (colonia_id integer, prioridad smallint)
  LANGUAGE sql STABLE PARALLEL SAFE SET search_path FROM CURRENT
AS $$
  SELECT x.id, x.prioridad FROM srp.capa_prioritarias x
   WHERE ST_Intersects(x.geom, srp.punto(lat, lng))
   ORDER BY ST_Area(x.geom), x.id LIMIT 1
$$;
COMMENT ON FUNCTION srp.prioridad(numeric, numeric) IS 'Prioridad (0 muy baja a 4 muy alta) de la colonia de la capa propia donde cae el punto.';

-- LA PRIORIDAD CONGELADA: la de cada árbol y cada jornada al recibirlos, con la versión de la capa con que se
-- calculó. Si la capa cambia, lo ya recibido conserva la suya, y un reporte regenerado dice la misma. Sólo se
-- vuelve a calcular si se corrige el punto. Sin colonia de la capa, la prioridad queda vacía: «Sin dato».
CREATE TABLE srp.prioridades (
  id              bigint       GENERATED ALWAYS AS IDENTITY,
  plantacion_id   uuid         NULL,
  jornada_id      uuid         NULL,
  colonia_id      integer      NULL,
  prioridad       smallint     NULL,
  capa_version    text         NOT NULL,
  congelada_en    timestamptz  NOT NULL DEFAULT now(),
  CONSTRAINT prioridades_pk PRIMARY KEY (id),
  CONSTRAINT prioridades_plantacion_unica UNIQUE (plantacion_id),
  CONSTRAINT prioridades_jornada_unica UNIQUE (jornada_id),
  CONSTRAINT prioridades_de_uno CHECK ((plantacion_id IS NULL) <> (jornada_id IS NULL)),
  CONSTRAINT prioridades_rango CHECK (prioridad BETWEEN 0 AND 4),
  CONSTRAINT prioridades_juntas CHECK ((colonia_id IS NULL) = (prioridad IS NULL))
);
COMMENT ON TABLE srp.prioridades IS 'La prioridad de la colonia de cada árbol y de cada jornada, congelada al recibirlos con la versión de la capa.';
-- Es de un árbol o de una jornada, y se va con él
ALTER TABLE srp.prioridades ADD CONSTRAINT prioridades_plantacion_id_fk FOREIGN KEY (plantacion_id) REFERENCES srp.plantaciones (id) ON DELETE CASCADE;
ALTER TABLE srp.prioridades ADD CONSTRAINT prioridades_jornada_id_fk FOREIGN KEY (jornada_id) REFERENCES srp.jornadas (id) ON DELETE CASCADE;
