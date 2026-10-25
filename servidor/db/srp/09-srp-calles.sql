-- LA CALLE DE CADA ÁRBOL, sobre territorio.calles (la capa de calles de la Ciudad de México, paquete calles-cdmx).
-- Lo corre quien administra la base, dentro de instalar.sql.
--
-- La capa vive en territorio, de sólo lectura, como las alcaldías y las colonias: el SRP no guarda copia. Puede
-- no estar instalada todavía: entonces los árboles quedan sin calle (calle_estado nulo) y nada falla. Después
-- de instalar la capa, o una versión nueva, quien administra la base corre una vez:
--
--   SELECT srp.recalcular_calles();
--
-- y cada árbol sin calle, o calculado con otra versión, recibe la suya.

/* LA CALLE DE UN PUNTO: el tramo más cercano, a 40 m o menos, con las mismas reglas que el servidor simulado de
   la versión de prueba (js/calles.js calcular).
   · Entre los 12 tramos más cercanos en grados, el de menor distancia sobre el elipsoide; si empatan, la clave
     menor. A más de 40 m: «lejos», sin tramo.
   · Esquina: otro tramo de otra calle (otra llave) a menos de 4 m más que el elegido; el más cercano de ellos.
   · Un tramo sin nombre se llama «calle sin nombre», como sugiere la capa.
   · calle_version: la versión instalada de la capa (territorio.calles_version).
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
  IF lat IS NULL OR lng IS NULL OR to_regclass('territorio.calles') IS NULL OR to_regclass('territorio.calles_version') IS NULL THEN
    RETURN QUERY SELECT NULL::text, NULL::text, NULL::text, NULL::text, NULL::text, NULL::text, NULL::text, NULL::text, NULL::text, NULL::text, NULL::text, NULL::integer;
    RETURN;
  END IF;
  p := srp.punto(lat, lng);
  SELECT x.version INTO v FROM territorio.calles_version x ORDER BY x.instalada DESC LIMIT 1;
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

-- Después de instalar la capa, o una versión nueva: calcula la calle de cada árbol sin calle o de otra versión.
-- Si se interrumpe, se vuelve a correr y sigue con lo que falta. Devuelve cuántos árboles calculó.
CREATE FUNCTION srp.recalcular_calles() RETURNS integer
  LANGUAGE plpgsql SET search_path FROM CURRENT
AS $$
DECLARE
  v text;
  n integer;
BEGIN
  IF to_regclass('territorio.calles') IS NULL OR to_regclass('territorio.calles_version') IS NULL THEN
    RAISE EXCEPTION 'territorio.calles no está instalada: primero se instala la capa de calles';
  END IF;
  SELECT x.version INTO v FROM territorio.calles_version x ORDER BY x.instalada DESC LIMIT 1;
  UPDATE srp.plantaciones x
     SET (calle_estado, calle_clave, calle_version, calle, calle_entre_1, calle_entre_2, calle_esquina, vialidad_red, vialidad_tipo,
          calle_atiende, calle_llave, calle_distancia_m) = (SELECT * FROM srp.calle(x.lat, x.lng))
   WHERE x.calle_version IS DISTINCT FROM v;
  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n;
END $$;
COMMENT ON FUNCTION srp.recalcular_calles() IS 'Calcula la calle de los árboles sin calle o calculados con otra versión de territorio.calles. La corre quien administra la base después de instalar o actualizar la capa.';
