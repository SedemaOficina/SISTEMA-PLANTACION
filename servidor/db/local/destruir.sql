-- DESTRUCCIÓN DEL ESQUEMA srp Y DE SU CUENTA. SÓLO PARA LA BASE LOCAL DE DESARROLLO Y SUS PRUEBAS:
-- borra todos los datos del SRP sin preguntar. Nunca se entrega ni se corre en los servidores del SIA.
-- La réplica local de territorio se queda: no es del SRP y tarda en cargarse.

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_namespace WHERE nspname = 'srp') THEN
    -- Las bases instaladas antes de alinearse con el SIA dejaban el esquema a nombre de srp_propietario
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'srp_propietario') THEN
      EXECUTE 'SET ROLE srp_propietario';
      EXECUTE 'DROP SCHEMA srp CASCADE';
      EXECUTE 'RESET ROLE';
    ELSE
      EXECUTE 'DROP SCHEMA srp CASCADE';
    END IF;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'srp_api') THEN
    DROP ROLE srp_api;
  END IF;
  -- Las cuentas de esas instalaciones anteriores
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'srp_servicio') THEN
    DROP ROLE srp_servicio;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'srp_propietario') THEN
    EXECUTE format('REVOKE srp_propietario FROM %I', current_user);
    DROP ROLE srp_propietario;
  END IF;
END $$;
