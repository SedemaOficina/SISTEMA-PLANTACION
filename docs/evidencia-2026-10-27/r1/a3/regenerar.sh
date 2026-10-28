#!/bin/bash
# A3 · Regenera dos veces, desde cero y en carpetas temporales, lo que sale de herramientas/ y compara contra lo
# guardado en el commit. Uso: bash evidencia/a3/regenerar.sh   (desde cualquier carpeta)
# No escribe en el repositorio: copia herramientas/ y datos/esquema.json a una raíz temporal.
set -u
COPIA=/c/sia-rev/tmp/aud1027/r1
GPKG="<carpeta del usuario>/OneDrive/Escritorio/SEDEMA/Sistema de Información Ambiental/Páginas web/calles-cdmx/salidas/entrega/calles-cdmx-1.0.0/datos/calles_cdmx.gpkg"
TMP=$COPIA/evidencia/a3/tmp
export PYTHONUTF8=1
rm -rf "$TMP"; mkdir -p "$TMP"
for k in 1 2; do
  R=$TMP/gen$k
  mkdir -p $R/herramientas $R/datos $R/servidor/db/srp $R/js $R/assets/calles
  cp $COPIA/herramientas/*.py $R/herramientas/
  cp $COPIA/datos/esquema.json $R/datos/
  ( cd $R && python herramientas/generar_sql.py && python herramientas/generar_diccionario.py && python herramientas/generar_calles.py "$GPKG" ) > $TMP/gen$k.log 2>&1
  echo "corrida $k: $(tail -3 $TMP/gen$k.log | tr '\n' ' ')"
  # Producción: de la copia del repositorio a una carpeta vacía
  ( cd $COPIA && python herramientas/preparar_produccion.py "$TMP/prod$k" ) > $TMP/prod$k.log 2>&1
  echo "produccion $k: $(tail -2 $TMP/prod$k.log | tr '\n' ' ')"
done
echo "--- generados: corrida 1 contra corrida 2"
diff -rq $TMP/gen1/servidor $TMP/gen2/servidor; diff -rq $TMP/gen1/datos $TMP/gen2/datos; diff -rq $TMP/gen1/js $TMP/gen2/js; diff -rq $TMP/gen1/assets $TMP/gen2/assets && echo "iguales"
echo "--- generados: corrida 1 contra el commit"
diff -q $TMP/gen1/servidor/db/srp/02-srp-tablas.sql $COPIA/servidor/db/srp/02-srp-tablas.sql && echo "02-srp-tablas.sql igual"
diff -q $TMP/gen1/datos/DICCIONARIO-DATOS.md $COPIA/datos/DICCIONARIO-DATOS.md && echo "DICCIONARIO-DATOS.md igual"
diff -q $TMP/gen1/js/esquema.js $COPIA/js/esquema.js && echo "esquema.js igual"
diff -rq $TMP/gen1/assets/calles $COPIA/assets/calles && echo "assets/calles igual ($(ls $COPIA/assets/calles | wc -l) archivos)"
echo "--- producción: corrida 1 contra corrida 2"
diff -rq $TMP/prod1 $TMP/prod2 && echo "iguales ($(find $TMP/prod1 -type f | wc -l) archivos)"
echo "--- producción contra el repositorio: archivos que cambian o faltan"
( cd $TMP/prod1 && find . -type f | sort ) > $TMP/prod_lista.txt
( cd $COPIA && git ls-files index.html sw.js manifest.webmanifest VERSION css js vendor assets | sed 's|^|./|' | sort ) > $TMP/repo_lista.txt
echo "en el repo y no en producción:"; comm -13 $TMP/prod_lista.txt $TMP/repo_lista.txt | sed 's|/c[^/]*\.json$|/c*.json|' | sort | uniq -c
echo "en producción y no en el repo:"; comm -23 $TMP/prod_lista.txt $TMP/repo_lista.txt
echo "distintos:"; while read f; do cmp -s "$TMP/prod1/$f" "$COPIA/$f" || echo "  $f"; done < <(comm -12 $TMP/prod_lista.txt $TMP/repo_lista.txt)
