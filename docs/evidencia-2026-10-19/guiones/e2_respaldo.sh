#!/bin/bash
# E2 · RESPALDO Y RESTAURACIÓN: respaldo del esquema srp con pg_dump, un respaldo alterado que debe notarse, y la
# restauración en limpio (el esquema se borra y se vuelve a crear desde el respaldo). Base local de desarrollo.
PG="/c/Program Files/PostgreSQL/17/bin"
D=/c/sia-rev/tmp/herr/e2; rm -rf $D; mkdir -p $D
export PGCLIENTENCODING=UTF8
CON="-h 127.0.0.1 -U srp_local_admin -d srp_local -w"
cd /c/sia-rev/tmp/aud/servidor
HUELLA="SELECT string_agg(t || '=' || n || ':' || h, E'\n' ORDER BY t) FROM (
  SELECT c.relname AS t, (xpath('/row/n/text()', query_to_xml(format('SELECT count(*) AS n FROM srp.%I', c.relname), false, true, '')))[1]::text AS n,
         (xpath('/row/h/text()', query_to_xml(format('SELECT md5(coalesce(string_agg(x::text, ''|'' ORDER BY x::text), '''')) AS h FROM srp.%I x', c.relname), false, true, '')))[1]::text AS h
    FROM pg_class c JOIN pg_namespace s ON s.oid = c.relnamespace WHERE s.nspname = 'srp' AND c.relkind = 'r') q"
consulta() { node -e "import('./bd.js').then(async m => { const c = await m.conectar(); try { const r = await c.query(process.argv[1]); console.log(Object.values(r.rows[0] || {})[0]); } catch (e) { console.log('ERROR ' + e.code + ' ' + e.message); } await c.end(); })" "$1"; }
echo "== 1. huella de las tablas antes"; consulta "$HUELLA" > $D/antes.txt; wc -l < $D/antes.txt; head -3 $D/antes.txt
echo "== 2. respaldo"; "$PG/pg_dump" $CON -n srp -Fc -f $D/srp.dump && ls -la $D/srp.dump | awk '{print $5" bytes"}'
echo "== 3. respaldo alterado (bytes cambiados a la mitad)"; python -c "
d = bytearray(open(r'C:\sia-rev\tmp\herr\e2\srp.dump','rb').read()); m = len(d)//2
for i in range(m, m+64): d[i] ^= 0xFF
open(r'C:\sia-rev\tmp\herr\e2\srp-alterado.dump','wb').write(d); print('alterado', len(d))"
echo "== 4. se borra el esquema"; consulta "DROP SCHEMA srp CASCADE"; consulta "SELECT count(*) FROM pg_namespace WHERE nspname = 'srp'"
echo "== 5. restaurar el alterado (debe fallar sin dejar nada)"; "$PG/pg_restore" $CON --single-transaction --exit-on-error $D/srp-alterado.dump > $D/alterado.log 2>&1; echo "salida $?"; tail -2 $D/alterado.log; consulta "SELECT count(*) FROM pg_namespace WHERE nspname = 'srp'"
echo "== 6. restaurar el bueno"; "$PG/pg_restore" $CON --single-transaction --exit-on-error $D/srp.dump > $D/bueno.log 2>&1; echo "salida $?"; tail -2 $D/bueno.log
echo "== 7. huella después"; consulta "$HUELLA" > $D/despues.txt; wc -l < $D/despues.txt
if diff -q $D/antes.txt $D/despues.txt > /dev/null; then echo "  IGUAL: todas las tablas con las mismas filas"; else echo "  DISTINTO:"; diff $D/antes.txt $D/despues.txt | head; fi
echo "== 8. después de restaurar"
consulta "UPDATE srp.bitacora SET detalle = 'x' WHERE false"
consulta "SELECT count(*) FROM pg_trigger t JOIN pg_class c ON c.oid = t.tgrelid JOIN pg_namespace s ON s.oid = c.relnamespace WHERE s.nspname = 'srp' AND NOT t.tgisinternal"
consulta "SELECT has_table_privilege('srp_api', 'srp.plantaciones', 'INSERT')::text || ' / ' || has_table_privilege('srp_api', 'srp.plantaciones', 'DELETE')::text"
consulta "SELECT version FROM srp.migraciones ORDER BY version DESC LIMIT 1"
