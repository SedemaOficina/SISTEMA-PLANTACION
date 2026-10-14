-- LOS POSIBLES DUPLICADOS. Al recibir un árbol, el servidor busca otro árbol activo de la misma especie a menos de
-- la incertidumbre combinada de los dos puntos: la suma de sus precisiones, nunca menos que el piso que dice el
-- parámetro de puntos duplicados. Si es de la misma institución, se lo avisa a quien lo mandó. Si es de otra, recibe el
-- árbol de todos modos y anota la pareja en la bandeja que atiende la Administración global: ninguna de las
-- dos instituciones ve esa marca ni los datos de la otra. Lo corre quien administra la base, dentro de
-- instalar.sql.

-- La peor precisión registrada, que da el tamaño de la búsqueda, sale de este índice sin recorrer la tabla
CREATE INDEX plantaciones_gps_precision_m ON srp.plantaciones (gps_precision_m);

-- LA ESPECIE DE UN ÁRBOL, para comparar: la del catálogo o, si se escribió en «Otra especie», ese texto sin
-- acentos, mayúsculas ni espacios en los extremos, como lo compara la aplicación (js/jornadas.js)
CREATE FUNCTION srp.especie_clave(especie_id text, especie_otra text)
  RETURNS text LANGUAGE sql IMMUTABLE PARALLEL SAFE
AS $$
  SELECT coalesce(nullif(especie_id, ''), 'otra:' || lower(btrim(regexp_replace(normalize(coalesce(especie_otra, ''), NFD), '[\u0300-\u036f]', '', 'g'))))
$$;
COMMENT ON FUNCTION srp.especie_clave(text, text) IS 'La especie de un árbol para compararla: su id del catálogo, u «otra:» y lo escrito sin acentos ni mayúsculas.';

-- LOS VECINOS DE UN ÁRBOL que podrían ser el mismo: el más cercano de su institución y el más cercano de otra,
-- activos, de la misma especie y a menos de la incertidumbre combinada. Un árbol distinto a pocos metros es lo
-- normal en una banqueta o un parque; el mismo árbol registrado dos veces casi siempre lleva la misma especie.
-- Quedan fuera los de su misma jornada, que el teléfono revisa con sus propios avisos. La institución de un
-- árbol es la de quien lo capturó. Si el árbol no está activo, ninguna fila.
CREATE FUNCTION srp.vecinos(arbol uuid, piso_m numeric)
  RETURNS TABLE (misma_institucion boolean, cercano_id uuid, distancia_m numeric, umbral_m numeric)
  LANGUAGE sql STABLE PARALLEL SAFE SET search_path FROM CURRENT
AS $$
  WITH x AS (
    SELECT p.id, p.jornada_id, srp.punto(p.lat, p.lng) AS g, coalesce(p.gps_precision_m, 0) AS pr, u.organizacion_id AS org,
           srp.especie_clave(p.especie_id, p.especie_otra) AS especie
      FROM srp.plantaciones p JOIN srp.usuarios u ON u.id = p.cabo_id
     WHERE p.id = arbol AND p.estatus = 'activo'
  ),
  -- La caja que se busca en el índice del punto alcanza al vecino de peor precisión. En la Ciudad un grado mide
  -- más de 100 km, así que dividir los metros entre 100,000 da una caja un poco mayor que la necesaria
  caja AS (
    SELECT ST_Expand(x.g, greatest(x.pr + coalesce((SELECT max(gps_precision_m) FROM srp.plantaciones), 0), piso_m) / 100000.0) AS b FROM x
  ),
  cerca AS (
    SELECT uy.organizacion_id = x.org AS misma, y.id,
           ST_Distance(x.g::geography, srp.punto(y.lat, y.lng)::geography) AS d,
           greatest(x.pr + coalesce(y.gps_precision_m, 0), piso_m) AS umbral
      FROM x, caja, srp.plantaciones y JOIN srp.usuarios uy ON uy.id = y.cabo_id
     WHERE srp.punto(y.lat, y.lng) && caja.b
       AND y.estatus = 'activo' AND y.id <> x.id AND y.jornada_id IS DISTINCT FROM x.jornada_id
       AND srp.especie_clave(y.especie_id, y.especie_otra) = x.especie
  )
  SELECT DISTINCT ON (misma) misma, id, round(d::numeric, 1), round(umbral::numeric, 1)
    FROM cerca WHERE d < umbral
   ORDER BY misma, d, id
$$;
COMMENT ON FUNCTION srp.vecinos(uuid, numeric) IS 'El árbol activo más cercano de la misma institución y el de otra, de otra jornada y de la misma especie, a menos de la suma de las precisiones de los dos puntos (con piso).';

-- LA BANDEJA: cada pareja de árboles de la misma especie y de instituciones distintas que podrían ser el mismo,
-- una sola vez. La
-- Administración global la revisa y dice si es el mismo árbol o son distintos; una revisión no se cambia. Un
-- árbol que se elimina deja de estar pendiente, porque ya no cuenta dos veces.
CREATE TABLE srp.duplicados (
  id               bigint        GENERATED ALWAYS AS IDENTITY,
  plantacion_id    uuid          NOT NULL,
  cercano_id       uuid          NOT NULL,
  distancia_m      numeric(9,1)  NOT NULL,
  umbral_m         numeric(9,1)  NOT NULL,
  detectado_en     timestamptz   NOT NULL DEFAULT now(),
  resolucion       text          NULL,
  nota             text          NOT NULL DEFAULT '',
  revisado_por_id  uuid          NULL,
  revisado_en      timestamptz   NULL,
  CONSTRAINT duplicados_pk PRIMARY KEY (id),
  CONSTRAINT duplicados_pareja_distinta CHECK (plantacion_id <> cercano_id),
  CONSTRAINT duplicados_resolucion CHECK (resolucion IN ('mismo', 'distintos')),
  CONSTRAINT duplicados_revision CHECK ((resolucion IS NULL) = (revisado_por_id IS NULL) AND (resolucion IS NULL) = (revisado_en IS NULL)),
  CONSTRAINT duplicados_nota CHECK (length(nota) <= 500)
);
CREATE UNIQUE INDEX duplicados_pareja ON srp.duplicados (least(plantacion_id, cercano_id), greatest(plantacion_id, cercano_id));
CREATE INDEX duplicados_cercano_id ON srp.duplicados (cercano_id);
CREATE INDEX duplicados_pendientes ON srp.duplicados (id) WHERE resolucion IS NULL;
COMMENT ON TABLE srp.duplicados IS 'Parejas de árboles de instituciones distintas que podrían ser el mismo: la bandeja de revisión de la Administración global.';
COMMENT ON COLUMN srp.duplicados.plantacion_id IS 'El árbol que llegó.';
COMMENT ON COLUMN srp.duplicados.cercano_id IS 'El de otra institución que ya estaba cerca.';
COMMENT ON COLUMN srp.duplicados.resolucion IS 'mismo: los dos registros son un solo árbol; distintos: son dos árboles. Vacío mientras está pendiente.';
-- La pareja se va con sus árboles
ALTER TABLE srp.duplicados ADD CONSTRAINT duplicados_plantacion_id_fk FOREIGN KEY (plantacion_id) REFERENCES srp.plantaciones (id) ON DELETE CASCADE;
ALTER TABLE srp.duplicados ADD CONSTRAINT duplicados_cercano_id_fk FOREIGN KEY (cercano_id) REFERENCES srp.plantaciones (id) ON DELETE CASCADE;
ALTER TABLE srp.duplicados ADD CONSTRAINT duplicados_revisado_por_id_fk FOREIGN KEY (revisado_por_id) REFERENCES srp.usuarios (id) ON DELETE RESTRICT;
