-- VACIAR EL SERVIDOR DESPUÉS DE LA PRUEBA EN CAMPO. Se corre UNA vez, cuando la Secretaría terminó de probar con datos
-- ficticios y quiere empezar a operar con el servidor en blanco. Lo corre quien administra la base, con psql directo,
-- después de sacar un respaldo:
--
--   psql -d <base> -v ON_ERROR_STOP=on -v confirmar=VACIAR-SRP < vaciar-tras-prueba.sql
--
-- Sin «-v confirmar=VACIAR-SRP» se detiene sin tocar nada y sale con error, para que nadie lo tome por un vaciado hecho.
-- Va en una sola transacción: o se vacía todo o nada.
--
-- Borra:     las jornadas, los árboles, los registros de sus fotografías, los folios (vuelven a empezar en 1), los
--            posibles duplicados, las prioridades congeladas, los lotes de carga masiva y, de la bitácora, lo que dice
--            de jornadas, árboles y cargas.
-- Conserva:  las cuentas con sus contraseñas y sesiones, los catálogos, los parámetros, la capa de prioritarias, el
--            registro de entradas y lo que la bitácora dice de cuentas y catálogos.
-- Cambia:    el sello de los datos: cada teléfono, al conectarse, borra lo que guardaba de la prueba y lo dice. La
--            constancia del vaciado, con lo que borró, queda en srp.sello.nota. Los folios vuelven a empezar en 1.
--
-- Las fotografías en disco no las borra la base: en ese mismo momento se vacía la carpeta SRP_FOTOS_DIR.

\set ON_ERROR_STOP on
\if :{?confirmar}
\else
  DO $$ BEGIN RAISE EXCEPTION 'No se vació nada: falta -v confirmar=VACIAR-SRP'; END $$;
  \quit
\endif
BEGIN;
-- La confirmación vale sólo dentro de esta transacción
SELECT set_config('srp.confirmar_vaciado', :'confirmar', true);

DO $$
DECLARE
  n_jornadas integer; n_arboles integer; n_fotos integer; n_folios integer; n_bitacora integer;
BEGIN
  IF current_setting('srp.confirmar_vaciado', true) IS DISTINCT FROM 'VACIAR-SRP' THEN
    RAISE EXCEPTION 'No se vació nada: la confirmación debe ser exactamente VACIAR-SRP';
  END IF;
  SELECT count(*) INTO n_jornadas FROM srp.jornadas;
  SELECT count(*) INTO n_arboles FROM srp.plantaciones;
  SELECT count(*) INTO n_fotos FROM srp.fotografias;
  SELECT count(*) INTO n_folios FROM srp.folios;
  SELECT count(*) INTO n_bitacora FROM srp.bitacora WHERE entidad IN ('plantacion', 'jornada', 'carga');

  -- Los disparadores que hacen inmutables la bitácora y los folios se apagan sólo dentro de esta transacción
  ALTER TABLE srp.bitacora DISABLE TRIGGER bitacora_inmutable;
  ALTER TABLE srp.folios DISABLE TRIGGER folios_inmutables;

  DELETE FROM srp.duplicados;
  DELETE FROM srp.prioridades;
  DELETE FROM srp.fotografias;
  DELETE FROM srp.folios;
  DELETE FROM srp.folio_secuencias;
  DELETE FROM srp.plantaciones;
  DELETE FROM srp.jornadas;
  DELETE FROM srp.cargas;
  DELETE FROM srp.bitacora WHERE entidad IN ('plantacion', 'jornada', 'carga');

  ALTER TABLE srp.bitacora ENABLE TRIGGER bitacora_inmutable;
  ALTER TABLE srp.folios ENABLE TRIGGER folios_inmutables;

  -- La constancia del vaciado queda con el sello nuevo: la bitácora de cambios sólo guarda lo de la operación real
  UPDATE srp.sello SET valor = srp.sello_nuevo(), desde = now(),
    nota = format('Vaciado tras la prueba en campo: %s jornadas, %s árboles, %s registros de fotografías, %s folios y %s renglones de la bitácora',
      n_jornadas, n_arboles, n_fotos, n_folios, n_bitacora);

  RAISE NOTICE 'Vaciado: % jornadas, % árboles, % registros de fotografías, % folios y % renglones de la bitácora. Las cuentas, los catálogos y los parámetros siguen.',
    n_jornadas, n_arboles, n_fotos, n_folios, n_bitacora;
END $$;

COMMIT;

-- Lo que debe quedar: todo en 0 menos las cuentas, los catálogos y el sello nuevo
SELECT (SELECT count(*) FROM srp.jornadas) AS jornadas, (SELECT count(*) FROM srp.plantaciones) AS arboles,
       (SELECT count(*) FROM srp.fotografias) AS fotografias, (SELECT count(*) FROM srp.folios) AS folios,
       (SELECT count(*) FROM srp.usuarios) AS cuentas, (SELECT desde FROM srp.sello) AS sello_desde, (SELECT nota FROM srp.sello) AS constancia;
