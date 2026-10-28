#!/bin/bash
# E2 · RESPALDO Y RESTAURACIÓN DEL ESQUEMA srp — versión 1.4.2 (auditoría 27-10-2026, revisor r5)
#
# Adaptado de docs/evidencia-2026-10-19/guiones/e2_respaldo.sh a lo que entró después de la 1.1:
#   · plantaciones: sitio_plantacion y los doce campos de la calle (calle_estado … calle_distancia_m);
#   · jornadas: cabos_apoyo (jsonb, con su CHECK de lista);
#   · bitácora: la acción APOYO en su CHECK;
#   · funciones y disparadores nuevos: srp.calle, srp.poner_calle (plantaciones_calle_alta y plantaciones_calle_punto) y
#     srp.recalcular_calles, con sus permisos (srp_api ejecuta calle; recalcular_calles NO);
#   · la capa territorio.calles vive FUERA de srp: el respaldo de srp no la lleva y la restauración depende de ella.
#
# LO CORRE LA COORDINACIÓN AL FINAL, CON LA BASE LIBRE: borra el esquema srp de la base local y lo restaura.
# Antes: detener los servicios de los cinco revisores y quitar sus cuentas de prueba (apoyo_servidor.mjs quitar).
# Uso:  COPIA=/c/sia-rev/tmp/aud1027/r5 bash e2_respaldo.sh 2>&1 | tee e2_respaldo.salida.txt
#       (FORZAR=1 lo corre aunque haya otras conexiones a la base)
set -u
PG="/c/Program Files/PostgreSQL/17/bin"
COPIA="${COPIA:-/c/sia-rev/tmp/aud1027/r5}"
D="${D:-/c/sia-rev/tmp/aud1027/e2}"; rm -rf "$D"; mkdir -p "$D"
export PGCLIENTENCODING=UTF8
CON="-h 127.0.0.1 -U srp_local_admin -d srp_local -w"
cd "$COPIA/servidor" || exit 1
consulta() { node -e "import('./bd.js').then(async m => { const c = await m.conectar(); try { const r = await c.query(process.argv[1]); console.log(Array.isArray(r) ? 'PASÓ: ' + r.map(x => x.command + ' ' + (x.rowCount ?? '')).join(' ; ') : r.rows.map(x => Object.values(x).join('|')).join('\n')); } catch (e) { console.log('ERROR ' + e.code + ' ' + e.message); } await c.end(); })" "$1"; }

echo "== 0. ¿La base está libre?"
OTRAS=$(consulta "SELECT count(*) FROM pg_stat_activity WHERE datname = 'srp_local' AND pid <> pg_backend_pid()")
echo "  otras conexiones: $OTRAS"
if [ "$OTRAS" != "0" ] && [ "${FORZAR:-0}" != "1" ]; then echo "  Hay otras conexiones: detenga los servicios de los revisores o use FORZAR=1."; exit 2; fi

# Huella por tabla: renglones y md5 de todos sus renglones como texto (incluye los campos nuevos: calle_*, cabos_apoyo, sitio_plantacion)
HUELLA="SELECT t || '=' || n || ':' || h FROM (
  SELECT c.relname AS t, (xpath('/row/n/text()', query_to_xml(format('SELECT count(*) AS n FROM srp.%I', c.relname), false, true, '')))[1]::text AS n,
         (xpath('/row/h/text()', query_to_xml(format('SELECT md5(coalesce(string_agg(x::text, ''|'' ORDER BY x::text), '''')) AS h FROM srp.%I x', c.relname), false, true, '')))[1]::text AS h
    FROM pg_class c JOIN pg_namespace s ON s.oid = c.relnamespace WHERE s.nspname = 'srp' AND c.relkind = 'r') q ORDER BY t"
# Lo nuevo, contado aparte para que se lea sin comparar md5
NUEVO="SELECT 'jornadas compartidas=' || count(*) FILTER (WHERE jsonb_array_length(cabos_apoyo) > 0) || ' · cabos de apoyo=' || coalesce(sum(jsonb_array_length(cabos_apoyo)), 0) FROM srp.jornadas
  UNION ALL SELECT 'árboles por calle_estado=' || string_agg(coalesce(calle_estado, 'sin calcular') || ':' || n, ', ' ORDER BY calle_estado) FROM (SELECT calle_estado, count(*) n FROM srp.plantaciones GROUP BY 1) x
  UNION ALL SELECT 'calle_version=' || string_agg(coalesce(calle_version, 'nula') || ':' || n, ', ') FROM (SELECT calle_version, count(*) n FROM srp.plantaciones GROUP BY 1) x
  UNION ALL SELECT 'bitácora APOYO=' || count(*) FILTER (WHERE accion = 'APOYO') || ' · RELEVO=' || count(*) FILTER (WHERE accion = 'RELEVO') FROM srp.bitacora
  UNION ALL SELECT 'sitio_plantacion=' || string_agg(sitio_plantacion || ':' || n, ', ') FROM (SELECT sitio_plantacion, count(*) n FROM srp.plantaciones GROUP BY 1) x"

echo "== 1. huella antes"; consulta "$HUELLA" > "$D/antes.txt"; wc -l < "$D/antes.txt"; consulta "$NUEVO" | tee "$D/nuevo_antes.txt"
echo "== 2. respaldo (sólo el esquema srp)"; "$PG/pg_dump" $CON -n srp -Fc -f "$D/srp.dump" && ls -la "$D/srp.dump" | awk '{print "  " $5 " bytes"}'
sha256sum "$D/srp.dump" | tee "$D/srp.dump.sha256"
echo "  ¿El respaldo lleva la capa de calles? (debe decir 0: vive en territorio)"; "$PG/pg_restore" -l "$D/srp.dump" | grep -c "territorio calles" || true
echo "  ¿Lleva las funciones y disparadores nuevos?"; "$PG/pg_restore" -l "$D/srp.dump" | grep -E "FUNCTION srp (calle|poner_calle|recalcular_calles)|TRIGGER srp plantaciones plantaciones_calle" | sed 's/^/    /'

echo "== 3. respaldos alterados: bytes cambiados a la mitad, y cortado al 90 %"
python -c "
import sys
p = sys.argv[1]
d = bytearray(open(p + '/srp.dump','rb').read()); m = len(d)//2
for i in range(m, m+64): d[i] ^= 0xFF
open(p + '/srp-alterado.dump','wb').write(d)
open(p + '/srp-cortado.dump','wb').write(bytes(open(p + '/srp.dump','rb').read())[: int(len(d)*0.9)])
print('  alterado', len(d), 'bytes; cortado', int(len(d)*0.9), 'bytes')" "$(cygpath -w "$D" 2>/dev/null || echo "$D")"
echo "  suma del alterado: $(sha256sum "$D/srp-alterado.dump" | cut -c1-16)… · la del respaldo: $(cut -c1-16 "$D/srp.dump.sha256")… (deben ser distintas)"

echo "== 4. se borra el esquema"; consulta "DROP SCHEMA srp CASCADE"; consulta "SELECT count(*) FROM pg_namespace WHERE nspname = 'srp'"
echo "== 5. restaurar los alterados (deben fallar sin dejar nada)"
for x in alterado cortado; do
  "$PG/pg_restore" $CON --single-transaction --exit-on-error "$D/srp-$x.dump" > "$D/$x.log" 2>&1; echo "  $x: salida $?"; tail -1 "$D/$x.log" | sed 's/^/    /'
  QUEDA=$(consulta "SELECT count(*) FROM pg_namespace WHERE nspname = 'srp'")
  echo "  esquema srp tras el $x: $QUEDA"
  if [ "$QUEDA" != "0" ]; then echo "  ¡El respaldo $x se restauró! Se detiene aquí: no se restaura el bueno encima. Avise a la coordinación."; exit 4; fi
done
echo "== 6. restaurar el bueno (sólo si su suma coincide)"
(cd "$D" && sha256sum -c srp.dump.sha256) || { echo "  la suma del respaldo no coincide: no se restaura"; exit 3; }
"$PG/pg_restore" $CON --single-transaction --exit-on-error "$D/srp.dump" > "$D/bueno.log" 2>&1; echo "  salida $?"; tail -2 "$D/bueno.log"
echo "== 7. huella después"; consulta "$HUELLA" > "$D/despues.txt"; wc -l < "$D/despues.txt"; consulta "$NUEVO" | tee "$D/nuevo_despues.txt"
if diff -q "$D/antes.txt" "$D/despues.txt" > /dev/null && diff -q "$D/nuevo_antes.txt" "$D/nuevo_despues.txt" > /dev/null; then echo "  IGUAL: todas las tablas con las mismas filas"; else echo "  DISTINTO:"; diff "$D/antes.txt" "$D/despues.txt" | head; fi

echo "== 8. lo que debe seguir en pie después de restaurar"
echo "  bitácora inmutable, cuenta dueña (ERROR P0001):"; consulta "BEGIN; UPDATE srp.bitacora SET detalle = 'x' WHERE id IN (SELECT id FROM srp.bitacora LIMIT 1); ROLLBACK;"
echo "  bitácora con srp_api, UPDATE (ERROR 42501):"; consulta "BEGIN; SET LOCAL ROLE srp_api; UPDATE srp.bitacora SET detalle = 'x' WHERE id IN (SELECT id FROM srp.bitacora LIMIT 1); ROLLBACK;"
echo "  bitácora con srp_api, DELETE (ERROR 42501):"; consulta "BEGIN; SET LOCAL ROLE srp_api; DELETE FROM srp.bitacora WHERE id IN (SELECT id FROM srp.bitacora LIMIT 1); ROLLBACK;"
echo "  bitácora con srp_api, INSERT permitido (t):"; consulta "SELECT has_table_privilege('srp_api', 'srp.bitacora', 'INSERT')"
echo "  disparadores (nombre · activo):"; consulta "SELECT c.relname || '.' || t.tgname || ' · ' || t.tgenabled::text FROM pg_trigger t JOIN pg_class c ON c.oid = t.tgrelid JOIN pg_namespace s ON s.oid = c.relnamespace WHERE s.nspname = 'srp' AND NOT t.tgisinternal ORDER BY 1" | sed 's/^/    /'
echo "  esperados (9): bitacora.bitacora_inmutable y bitacora_sin_vaciar, bitacora_acceso.bitacora_inmutable y bitacora_sin_vaciar, folios.folios_inmutables y folios_sin_vaciar, plantaciones.plantaciones_folio_inmutable, plantaciones.plantaciones_calle_alta, plantaciones.plantaciones_calle_punto (todos «O»)"
echo "  la acción APOYO en la regla de la bitácora (t):"; consulta "SELECT pg_get_constraintdef(oid) LIKE '%APOYO%' FROM pg_constraint WHERE conname = 'bitacora_accion_valido'"
echo "  la lista de cabos de apoyo (1):"; consulta "SELECT count(*) FROM pg_constraint WHERE conname = 'jornadas_cabos_apoyo_lista'"
echo "  permisos de srp_api: INSERT plantaciones (t) · DELETE plantaciones (f) · EXECUTE srp.calle (t) · EXECUTE srp.recalcular_calles (f):"
consulta "SELECT has_table_privilege('srp_api', 'srp.plantaciones', 'INSERT') || ' · ' || has_table_privilege('srp_api', 'srp.plantaciones', 'DELETE') || ' · ' ||
  has_function_privilege('srp_api', 'srp.calle(numeric, numeric)', 'EXECUTE') || ' · ' || has_function_privilege('srp_api', 'srp.recalcular_calles()', 'EXECUTE')"
echo "  lo que vive en la cuenta y no en el respaldo (statement_timeout=50s · miembro de territorio_lectura):"
consulta "SELECT coalesce(array_to_string(rolconfig, ','), 'SIN CONFIGURACIÓN') || ' · ' || pg_has_role('srp_api', 'territorio_lectura', 'MEMBER') FROM pg_roles WHERE rolname = 'srp_api'"
echo "  la calle se sigue calculando con la capa de territorio (ok · Calle 5 de Mayo):"; consulta "SELECT calle_estado || ' · ' || calle FROM srp.calle(19.4342, -99.1386)"
echo "  árboles que recalcular_calles tocaría tras restaurar (0; sólo se cuenta, no se corre):"; consulta "SELECT count(*) FROM srp.plantaciones WHERE calle_version IS DISTINCT FROM (SELECT version FROM territorio.calles_version ORDER BY instalada DESC LIMIT 1)"
echo "  versión del esquema:"; consulta "SELECT max(version) FROM srp.migraciones"
echo "  conteos (plantaciones · jornadas · usuarios · bitácora):"; consulta "SELECT (SELECT count(*) FROM srp.plantaciones) || ' · ' || (SELECT count(*) FROM srp.jornadas) || ' · ' || (SELECT count(*) FROM srp.usuarios) || ' · ' || (SELECT count(*) FROM srp.bitacora)"
echo "  srp_api prestado a srp_local_admin (otorgante · SET):"; consulta "SELECT pg_get_userbyid(grantor) || ' · ' || set_option FROM pg_auth_members WHERE roleid = 'srp_api'::regrole AND member = 'srp_local_admin'::regrole ORDER BY 1"
echo
echo "NOTA. Una restauración de SÓLO DATOS (--data-only) sobre un esquema ya creado dispara plantaciones_calle_alta en cada árbol:"
echo "la calle se recalcula con la capa vigente y se pierde la calle_version con que se guardó. Para eso, --disable-triggers."
echo "Después de restaurar, la prueba con el servicio: pruebas/prueba_conexion.py (con los puertos de la coordinación)."
