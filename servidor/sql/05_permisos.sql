-- PERMISOS DE LA CUENTA DEL SERVICIO: lo mínimo para operar. Lo corre la cuenta propietaria al final
-- de la instalación, y anota la versión 1 del esquema.
--
--   · Usa el esquema, pero no crea nada en él.
--   · Lee, agrega y cambia renglones de las tablas de datos. Borra sólo lo que el sistema permite borrar:
--     un valor de catálogo o una cuenta sin uso, un lote de carga masiva al deshacerlo, y las sesiones.
--   · La bitácora sólo se lee y se le agregan renglones: nadie la edita ni la borra.
--   · La tabla de versiones y las capas territoriales sólo se leen.

SET ROLE srp_propietario;

GRANT USAGE ON SCHEMA srp TO srp_servicio;

GRANT SELECT, INSERT, UPDATE, DELETE ON
  srp.plantaciones, srp.jornadas, srp.usuarios,
  srp.programas, srp.areas, srp.especies, srp.vehiculos, srp.instituciones, srp.solicitantes,
  srp.credenciales, srp.sesiones
TO srp_servicio;

GRANT SELECT, INSERT ON srp.bitacora TO srp_servicio;
GRANT SELECT ON srp.migraciones TO srp_servicio;

-- Las capas territoriales y sus funciones sólo se leen: las carga y las cambia la cuenta propietaria
GRANT SELECT ON srp.capas, srp.capa_alcaldias, srp.capa_colonias, srp.capa_uga, srp.capa_prioritarias TO srp_servicio;
REVOKE ALL ON FUNCTION srp.punto(numeric, numeric), srp.derivar(numeric, numeric, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION srp.punto(numeric, numeric), srp.derivar(numeric, numeric, integer) TO srp_servicio;

INSERT INTO srp.migraciones (version, nombre) VALUES (1, 'Instalación: diez tablas del SRP, contraseñas, sesiones y capas territoriales');

RESET ROLE;
