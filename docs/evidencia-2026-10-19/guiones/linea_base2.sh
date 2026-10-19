#!/bin/bash
# Línea base, segunda parte: auditoria.py con originales/ y prueba.py dos veces (hoy y con la fecha del 17-10)
C=/c/sia-rev/tmp/aud
S="$(dirname "$0")"
export PYTHONUTF8=1 PYTHONIOENCODING=utf-8
t() { date +%s; }
r() { echo "$1 | $2 s | $3" >> "$S/linea_base.txt"; }
R="<proyecto>"
cp -r "$R/originales/." $C/originales/
curl -s -o /dev/null -m 3 http://127.0.0.1:8099/index.html || (cd $C && timeout 14400 python pruebas/servir.py 8099 > /dev/null 2>&1 &)
sleep 3
a=$(t); (cd $C && timeout 900 python pruebas/auditoria.py > "$S/lb_auditoria.txt" 2>&1); e=$?
r "auditoria.py (con originales/)" $(( $(t)-a )) "salida $e; $(tail -1 "$S/lb_auditoria.txt")"
a=$(t); (cd $C && timeout 5400 python pruebas/prueba.py > "$S/lb_prueba2.txt" 2>&1); e=$?
r "prueba.py, otra vez, hoy (lunes 19-10)" $(( $(t)-a )) "salida $e; $(grep -c FALLA "$S/lb_prueba2.txt") FALLA; $(tail -1 "$S/lb_prueba2.txt" | cut -c1-200)"
a=$(t); (cd $C && SRP_HOY=2026-10-17 timeout 5400 python pruebas/prueba.py > "$S/lb_prueba3.txt" 2>&1); e=$?
r "prueba.py con SRP_HOY=2026-10-17 (sábado)" $(( $(t)-a )) "salida $e; $(grep -c FALLA "$S/lb_prueba3.txt") FALLA; $(tail -1 "$S/lb_prueba3.txt" | cut -c1-200)"
echo FIN2 >> "$S/linea_base.txt"
