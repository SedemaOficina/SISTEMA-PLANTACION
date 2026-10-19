#!/bin/bash
# Línea base de la auditoría: todas las suites del proyecto, sobre la copia /c/sia-rev/tmp/aud
C=/c/sia-rev/tmp/aud
S="$(dirname "$0")"
export PYTHONUTF8=1 PYTHONIOENCODING=utf-8
t() { date +%s; }
r() { echo "$1 | $2 s | $3" >> "$S/linea_base.txt"; }
: > "$S/linea_base.txt"

a=$(t); (cd $C/servidor && timeout 3000 npm test > "$S/lb_servidor.txt" 2>&1); e=$?
r "servidor npm test" $(( $(t)-a )) "salida $e; $(grep -E '^ℹ (tests|pass|fail)' "$S/lb_servidor.txt" | tr '\n' ' ')"

a=$(t); (cd $C && timeout 2400 python pruebas/prueba_conexion.py > "$S/lb_conexion.txt" 2>&1); e=$?
r "prueba_conexion (repositorio)" $(( $(t)-a )) "salida $e; $(tail -1 "$S/lb_conexion.txt")"

rm -rf /c/sia-rev/tmp/aud-app
(cd $C && python herramientas/preparar_produccion.py /c/sia-rev/tmp/aud-app > /dev/null)
a=$(t); (cd $C && timeout 2400 python pruebas/prueba_conexion.py --app 'C:\sia-rev\tmp\aud-app' > "$S/lb_conexion_copia.txt" 2>&1); e=$?
r "prueba_conexion --app (copia real)" $(( $(t)-a )) "salida $e; $(tail -1 "$S/lb_conexion_copia.txt")"

(cd $C && timeout 14400 python pruebas/servir.py 8099 > /dev/null 2>&1 &)
sleep 3
a=$(t); (cd $C && timeout 900 python pruebas/auditoria.py > "$S/lb_auditoria.txt" 2>&1); e=$?
r "auditoria.py" $(( $(t)-a )) "salida $e; $(tail -1 "$S/lb_auditoria.txt")"
a=$(t); (cd $C && timeout 300 python pruebas/auditoria_css.py > "$S/lb_css.txt" 2>&1); e=$?
r "auditoria_css.py" $(( $(t)-a )) "salida $e; $(tail -1 "$S/lb_css.txt")"
a=$(t); (cd $C && timeout 900 python pruebas/revisar.py > "$S/lb_revisar.txt" 2>&1); e=$?
r "revisar.py" $(( $(t)-a )) "salida $e; $(tail -2 "$S/lb_revisar.txt" | tr '\n' ' ')"
a=$(t); (cd $C && timeout 5400 python pruebas/prueba.py > "$S/lb_prueba.txt" 2>&1); e=$?
r "prueba.py" $(( $(t)-a )) "salida $e; $(tail -1 "$S/lb_prueba.txt")"
echo FIN >> "$S/linea_base.txt"
