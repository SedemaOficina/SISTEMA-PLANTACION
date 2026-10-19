#!/bin/bash
# A3: construir dos veces desde cero lo que el proyecto genera y comparar contra lo publicado (el repositorio).
R="<proyecto>"
C=/c/sia-rev/tmp/a3
export PYTHONUTF8=1 PYTHONIOENCODING=utf-8
GEN="assets/capas/capa-alcaldias.js assets/capas/capa-colonias.js assets/capas/capa-prioritarias.js assets/capas/capa-uga.js assets/catalogos/catalogo-especies.js datos/DICCIONARIO-DATOS.md js/esquema.js servidor/db/srp/02-srp-tablas.sql datos/HUELLA-CAPAS.md datos/HUELLA-CAPAS.json"
for vuelta in 1 2; do
  echo "=== vuelta $vuelta"
  cd $C
  python herramientas/generar_capas.py > /dev/null 2>&1; echo "capas: $?"
  python herramientas/generar_especies.py > /dev/null 2>&1; echo "especies: $?"
  python herramientas/generar_diccionario.py > /dev/null 2>&1; echo "diccionario: $?"
  python herramientas/generar_sql.py > /dev/null 2>&1; echo "sql: $?"
  python herramientas/huella_capas.py > /dev/null 2>&1; echo "huella: $?"
  for f in $GEN; do
    if cmp -s "$C/$f" "$R/$f"; then echo "  igual        $f";
    elif diff -q <(tr -d '\r' < "$C/$f") <(tr -d '\r' < "$R/$f") > /dev/null; then echo "  SÓLO SALTOS  $f";
    else echo "  DISTINTO     $f ($(diff <(tr -d '\r' < "$C/$f") <(tr -d '\r' < "$R/$f") | grep -c '^[<>]') renglones)"; fi
    cp "$C/$f" "$C/$f.v$vuelta"
  done
  rm -rf /c/sia-rev/tmp/a3-app$vuelta; python herramientas/preparar_produccion.py /c/sia-rev/tmp/a3-app$vuelta > /dev/null; echo "copia real: $?"
done
echo "=== vuelta 1 contra vuelta 2"
for f in $GEN; do cmp -s "$C/$f.v1" "$C/$f.v2" && echo "  igual $f" || echo "  DISTINTO $f"; done
diff -rq /c/sia-rev/tmp/a3-app1 /c/sia-rev/tmp/a3-app2 && echo "  copia real: idéntica las dos veces"
diff -rq /c/sia-rev/tmp/a3-app1 "$R/servidor/local/entrega-sia/srp-v1-2026-10-17/app" && echo "  copia real: idéntica a la del paquete"
echo "=== servidor: compilar dos veces"
cd $C/servidor && cp -r /c/sia-rev/tmp/aud/servidor/node_modules . 2>/dev/null
for vuelta in 1 2; do npx tsup > /dev/null 2>&1; echo "tsup $vuelta: $?"; rm -rf ../dist$vuelta; cp -r dist ../dist$vuelta; done
diff -rq ../dist1 ../dist2 && echo "  dist: idéntico las dos veces"
echo "=== paquete: backend/completos contra la copia integrada"
diff -rq "$R/servidor/local/entrega-sia/srp-v1-2026-10-17/backend/completos/src/modulos/srp" "$R/servidor/src/modulos/srp" && echo "  módulo del paquete = módulo del repositorio"
for f in $(ls "$R/servidor/db/srp"); do cmp -s "$R/servidor/db/srp/$f" "$R/servidor/local/entrega-sia/srp-v1-2026-10-17/db/srp/$f" || echo "  DISTINTO db/srp/$f"; done; echo "  guiones SQL del paquete revisados"
