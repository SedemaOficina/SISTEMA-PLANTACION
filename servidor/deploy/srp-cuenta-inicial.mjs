// LA PRIMERA CUENTA DE ADMINISTRACIÓN GLOBAL del SRP, como da las suyas el SIA: genera una contraseña
// temporal, calcula su resumen en ESTE equipo e imprime el SQL del alta. La contraseña en claro nunca toca el
// servidor ni la base: sólo viaja su resumen.
//
//   salida estándar   → el SQL, para mandarlo a psql como quien administra la base
//   salida de errores → la contraseña temporal, UNA vez, para entregarla en mano
//
// Uso:
//   node srp-cuenta-inicial.mjs <correo> "<nombre y al menos un apellido>" "<cargo>" | psql -d <base> -v ON_ERROR_STOP=on
//
// Córralo en su propia terminal: la contraseña sale una sola vez y no debe quedar en ningún registro. Crea, si
// faltan, la institución de la Secretaría (o-sedema) y el área del Sistema de Información Ambiental (a-sia).
// Se niega si ya hay una cuenta de Administración global: las demás se dan de alta desde la aplicación. La
// temporal vale 72 horas y se cambia en el primer acceso.
//
// ⚠️ El formato del resumen es el de src/modulos/srp/contrasenas.ts (el de `acceso` del SIA), y la temporal,
//    la de esa misma función. Si cambia algo allá, se cambia aquí.
import { randomBytes, randomInt, randomUUID, scryptSync } from "node:crypto";

const HORAS = 72;
const recortar = (t) => String(t ?? "").trim().replace(/\s+/g, " ");
const [correo, nombre, cargo] = process.argv.slice(2).map(recortar);
if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(correo) || nombre.split(" ").length < 2 || !cargo) {
  console.error('Uso: node srp-cuenta-inicial.mjs <correo> "<nombre y al menos un apellido>" "<cargo>" | psql -d <base> -v ON_ERROR_STOP=on');
  process.exit(1);
}

// La temporal: doce caracteres en tres grupos, sin los que se confunden al dictarla (0 y o, 1, l e i)
const LETRAS = "abcdefghjkmnpqrstuvwxyz23456789";
const t = Array.from({ length: 12 }, () => LETRAS[randomInt(LETRAS.length)]).join("");
const temporal = t.slice(0, 4) + "-" + t.slice(4, 8) + "-" + t.slice(8, 12);
const sal = randomBytes(16);
const derivada = scryptSync(temporal.normalize("NFKC"), sal, 64, { N: 16384, r: 8, p: 1 });
const resumen = `scrypt$16384$8$1$${sal.toString("base64url")}$${derivada.toString("base64url")}`;

// Literales de SQL: la comilla simple, duplicada. El correo ya pasó por su forma; nombre y cargo son texto libre
const lit = (v) => "'" + String(v).replace(/'/g, "''") + "'";
const id = randomUUID();

process.stdout.write(`-- Primera cuenta de Administración global del SRP: ${correo.toLowerCase()}
BEGIN;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM srp.usuarios WHERE perfil = 'ADMIN') THEN
    RAISE EXCEPTION 'Ya hay una cuenta de Administración global: las demás se dan de alta desde la aplicación';
  END IF;
END $$;
INSERT INTO srp.instituciones (id, clave, nombre, activo, creado_por_id, fecha_creacion, editado_por_id, fecha_ultima_edicion, tipo_organizacion)
  VALUES ('o-sedema', 'SEDEMA', 'Secretaría del Medio Ambiente', true, NULL, now(), NULL, NULL, 'Gobierno de la CDMX') ON CONFLICT (id) DO NOTHING;
INSERT INTO srp.areas (id, clave, nombre, activo, creado_por_id, fecha_creacion, editado_por_id, fecha_ultima_edicion)
  VALUES ('a-sia', 'SIA', 'Sistema de Información Ambiental', true, NULL, now(), NULL, NULL) ON CONFLICT (id) DO NOTHING;
INSERT INTO srp.usuarios (id, correo, nombre_completo, organizacion_id, area_id, cargo_rol, perfil, coordinadores_ids, activo,
    fecha_creacion, creado_por_id, fecha_ultima_edicion, editado_por_id)
  VALUES (${lit(id)}, ${lit(correo.toLowerCase())}, ${lit(nombre)}, 'o-sedema', 'a-sia', ${lit(cargo)}, 'ADMIN', '{}', true, now(), ${lit(id)}, NULL, NULL);
INSERT INTO srp.credenciales (usuario_id, derivada, temporal, temporal_expira_en, intentos_fallidos, bloqueada_hasta, cambiada_en, cambiada_por_id)
  VALUES (${lit(id)}, ${lit(resumen)}, true, now() + interval '${HORAS} hours', 0, NULL, now(), ${lit(id)});
INSERT INTO srp.bitacora (id, fecha, usuario_id, usuario_nombre, perfil, accion, entidad, entidad_id, detalle)
  VALUES (gen_random_uuid(), now(), ${lit(id)}, ${lit(nombre)}, 'ADMIN', 'CREADO', 'usuario', ${lit(id)}, 'Cuenta inicial de la Administración global');
COMMIT;
`);
process.stderr.write(`\nContraseña temporal de ${correo.toLowerCase()} (se muestra sólo esta vez; vence en ${HORAS} horas): ${temporal}\n`);
