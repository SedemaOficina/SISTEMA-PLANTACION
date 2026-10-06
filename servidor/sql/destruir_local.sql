-- DESTRUCCIÓN DEL ESQUEMA srp Y SUS CUENTAS. SÓLO PARA LA BASE LOCAL DE DESARROLLO Y SUS PRUEBAS:
-- borra todos los datos del SRP sin preguntar. Nunca se entrega ni se corre en los servidores del SIA.
-- El esquema lo borra su dueña, la cuenta propietaria; las cuentas, quien las creó.

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_namespace WHERE nspname = 'srp') THEN
    EXECUTE 'SET ROLE srp_propietario';
    EXECUTE 'DROP SCHEMA srp CASCADE';
    EXECUTE 'RESET ROLE';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'srp_servicio') THEN
    DROP ROLE srp_servicio;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'srp_propietario') THEN
    EXECUTE format('REVOKE srp_propietario FROM %I', current_user);
    DROP ROLE srp_propietario;
  END IF;
END $$;
