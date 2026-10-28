-- LA CALLE DE CADA ÁRBOL, sobre territorio.calles (la capa de calles de la Ciudad de México, paquete calles-cdmx).
-- Lo corre quien administra la base, dentro de instalar.sql.
--
-- La capa vive en territorio, de sólo lectura, como las alcaldías y las colonias: el SRP no guarda copia. Puede
-- no estar instalada todavía: entonces los árboles quedan sin calle (calle_estado nulo) y nada falla. Después
-- de instalar la capa, o una versión nueva, quien administra la base corre una vez, fuera de una transacción:
--
--   CALL srp.recalcular_calles();
--
-- y cada árbol sin calle, o calculado con otra versión, recibe la suya.

/* LA VERSIÓN VIGENTE DE LA CAPA: la que el SIA tiene por vigente en territorio.version_capa, como las alcaldías,
   las colonias y la malla UGA (04-srp-sobre-territorio.sql). Si el SIA todavía no la registró ahí, la del propio
   paquete de calles (territorio.calles_version). Nula si no hay ninguna. */
CREATE FUNCTION srp.version_calles() RETURNS text
  LANGUAGE plpgsql STABLE PARALLEL SAFE SET search_path FROM CURRENT
AS $$
DECLARE
  v text;
BEGIN
  SELECT x.version INTO v FROM territorio.version_capa x WHERE x.capa = 'calles' AND x.vigente ORDER BY x.cargada_en DESC LIMIT 1;
  IF v IS NULL AND to_regclass('territorio.calles_version') IS NOT NULL THEN
    SELECT x.version INTO v FROM territorio.calles_version x ORDER BY x.instalada DESC LIMIT 1;
  END IF;
  RETURN v;
END $$;
COMMENT ON FUNCTION srp.version_calles() IS 'La versión vigente de territorio.calles: la de territorio.version_capa y, si el SIA no la ha registrado ahí, la del paquete de calles.';

/* LA CALLE DE UN PUNTO: el tramo más cercano, a 40 m o menos, con las mismas reglas que el servidor simulado de
   la versión de prueba (js/calles.js calcular).
   · Entre los 12 tramos más cercanos en grados, el de menor distancia sobre el elipsoide; si empatan, la clave
     menor. A más de 40 m: «lejos», sin tramo.
   · Esquina: otro tramo de otra calle (otra llave) a menos de 4 m más que el elegido; el más cercano de ellos.
   · Un tramo sin nombre se llama «calle sin nombre», como sugiere la capa.
   · calle_version: la versión vigente de la capa (srp.version_calles).
   Sin la capa, o sin punto, una fila vacía: el árbol queda por calcular. */
CREATE FUNCTION srp.calle(lat numeric, lng numeric)
  RETURNS TABLE (calle_estado text, calle_clave text, calle_version text, calle text, calle_entre_1 text, calle_entre_2 text,
                 calle_esquina text, vialidad_red text, vialidad_tipo text, calle_atiende text, calle_llave text, calle_distancia_m integer)
  LANGUAGE plpgsql STABLE PARALLEL SAFE SET search_path FROM CURRENT
AS $$
#variable_conflict use_column
DECLARE
  p geometry;
  v text;
BEGIN
  IF lat IS NULL OR lng IS NULL OR to_regclass('territorio.calles') IS NULL THEN
    RETURN QUERY SELECT NULL::text, NULL::text, NULL::text, NULL::text, NULL::text, NULL::text, NULL::text, NULL::text, NULL::text, NULL::text, NULL::text, NULL::integer;
    RETURN;
  END IF;
  p := srp.punto(lat, lng);
  v := srp.version_calles();
  RETURN QUERY
  WITH cerca AS (
    SELECT c.clave, c.nombre, c.entre_1, c.entre_2, c.red_vial, c.tipo_via, c.atiende, c.llave, ST_Distance(c.geom::geography, p::geography) AS m
      FROM territorio.calles c ORDER BY c.geom <-> p LIMIT 12),
  t AS (SELECT * FROM cerca x WHERE x.m <= 40 ORDER BY x.m, x.clave LIMIT 1),
  e AS (
    SELECT coalesce(x.nombre, 'calle sin nombre') AS nombre FROM cerca x, t
     WHERE x.clave <> t.clave AND x.llave IS DISTINCT FROM t.llave AND x.m - t.m < 4 ORDER BY x.m, x.clave LIMIT 1)
  SELECT CASE WHEN t.clave IS NULL THEN 'lejos' ELSE 'ok' END, t.clave, v,
         CASE WHEN t.clave IS NULL THEN NULL ELSE coalesce(t.nombre, 'calle sin nombre') END, t.entre_1, t.entre_2, e.nombre,
         t.red_vial, t.tipo_via, t.atiende, t.llave, round(t.m)::integer
    FROM (SELECT 1) uno LEFT JOIN t ON true LEFT JOIN e ON true;
END $$;
COMMENT ON FUNCTION srp.calle(numeric, numeric) IS 'La calle de un punto sobre territorio.calles: el tramo más cercano a 40 m o menos, entre qué calles va, su red vial y quién la atiende. Vacía si la capa no está instalada.';

-- Al recibir un árbol y al corregir su punto, la base pone su calle: vale aunque alguien escriba sin pasar por la
-- aplicación, y lo que mande el teléfono en esos campos no cuenta
CREATE FUNCTION srp.poner_calle() RETURNS trigger
  LANGUAGE plpgsql SET search_path FROM CURRENT
AS $$
BEGIN
  SELECT x.calle_estado, x.calle_clave, x.calle_version, x.calle, x.calle_entre_1, x.calle_entre_2, x.calle_esquina, x.vialidad_red, x.vialidad_tipo,
         x.calle_atiende, x.calle_llave, x.calle_distancia_m
    INTO NEW.calle_estado, NEW.calle_clave, NEW.calle_version, NEW.calle, NEW.calle_entre_1, NEW.calle_entre_2, NEW.calle_esquina, NEW.vialidad_red,
         NEW.vialidad_tipo, NEW.calle_atiende, NEW.calle_llave, NEW.calle_distancia_m
    FROM srp.calle(NEW.lat, NEW.lng) x;
  RETURN NEW;
END $$;
CREATE TRIGGER plantaciones_calle_alta BEFORE INSERT ON srp.plantaciones
  FOR EACH ROW EXECUTE FUNCTION srp.poner_calle();
CREATE TRIGGER plantaciones_calle_punto BEFORE UPDATE OF lat, lng ON srp.plantaciones
  FOR EACH ROW WHEN (NEW.lat IS DISTINCT FROM OLD.lat OR NEW.lng IS DISTINCT FROM OLD.lng) EXECUTE FUNCTION srp.poner_calle();

/* Después de instalar la capa, o una versión nueva: calcula la calle de cada árbol sin calle o de otra versión, por
   tandas de 2,000 árboles, y confirma cada tanda. Si se interrumpe, lo confirmado se queda; se vuelve a correr y
   sigue con lo que falta. Es un procedimiento, no una función, para poder confirmar por tandas: se llama con CALL
   fuera de una transacción abierta, y no lleva su propia ruta de búsqueda porque un procedimiento que confirma no
   puede tenerla; todo lo que usa va con su esquema. Avisa cuántos lleva y devuelve cuántos calculó. */
CREATE PROCEDURE srp.recalcular_calles(INOUT calculados integer DEFAULT 0)
  LANGUAGE plpgsql
AS $$
DECLARE
  v text;
  n integer;
BEGIN
  IF pg_catalog.to_regclass('territorio.calles') IS NULL THEN
    RAISE EXCEPTION 'territorio.calles no está instalada: primero se instala la capa de calles';
  END IF;
  calculados := 0;
  LOOP
    -- La versión se vuelve a leer en cada tanda: si cambia a la mitad, se sigue con la nueva y el ciclo termina
    v := srp.version_calles();
    UPDATE srp.plantaciones x
       SET (calle_estado, calle_clave, calle_version, calle, calle_entre_1, calle_entre_2, calle_esquina, vialidad_red, vialidad_tipo,
            calle_atiende, calle_llave, calle_distancia_m) = (SELECT * FROM srp.calle(x.lat, x.lng))
     WHERE x.id IN (SELECT y.id FROM srp.plantaciones y WHERE y.calle_version IS DISTINCT FROM v LIMIT 2000);
    GET DIAGNOSTICS n = ROW_COUNT;
    EXIT WHEN n = 0;
    calculados := calculados + n;
    COMMIT;
    RAISE NOTICE 'Calle calculada: % árboles', calculados;
  END LOOP;
END $$;
COMMENT ON PROCEDURE srp.recalcular_calles(integer) IS 'Calcula, por tandas de 2,000 confirmadas una por una, la calle de los árboles sin calle o calculados con otra versión de territorio.calles. La corre quien administra la base, con CALL, después de instalar o actualizar la capa.';
