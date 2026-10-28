-- E1: propiedades de las funciones de la calle y de los permisos de srp_api (sólo lectura)
SELECT current_user, session_user;
SELECT p.proname, pg_get_function_identity_arguments(p.oid) AS args, p.prosecdef AS security_definer, p.proconfig, p.provolatile,
       pg_get_userbyid(p.proowner) AS dueno, p.proacl
  FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
 WHERE n.nspname = 'srp' ORDER BY 1;
SELECT rolname, rolsuper, rolinherit, rolcreaterole, rolcreatedb, rolcanlogin, rolconnlimit, rolbypassrls, rolconfig FROM pg_roles WHERE rolname IN ('srp_api','territorio_lectura','srp_local_admin');
SELECT r.rolname AS miembro, g.rolname AS grupo FROM pg_auth_members m JOIN pg_roles r ON r.oid=m.member JOIN pg_roles g ON g.oid=m.roleid WHERE r.rolname IN ('srp_api','srp_local_admin') OR g.rolname IN ('srp_api','territorio_lectura');
SELECT * FROM srp.migraciones ORDER BY version;
