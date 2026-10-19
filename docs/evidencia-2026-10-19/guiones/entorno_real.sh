#!/bin/bash
# El modo real para la auditoría: servicio en 3130 (copia aud), aplicación real (aud-app) en 8090, y cuentas aud.*
C=/c/sia-rev/tmp/aud
export PYTHONUTF8=1 PYTHONIOENCODING=utf-8
mkdir -p /c/sia-rev/tmp/herr/fotos-real
cd $C/servidor
(SRP_PUERTO=3130 SRP_COOKIE_SEGURA=no SRP_ROL=srp_api SRP_PROXY=1 SRP_FOTOS_DIR='C:\sia-rev\tmp\herr\fotos-real' timeout 28800 node dist/iniciar.js > /c/sia-rev/tmp/herr/servicio-3130.log 2>&1 &)
cd $C
(timeout 28800 python pruebas/servir.py 8090 --api http://127.0.0.1:3130 --raiz 'C:\sia-rev\tmp\aud-app' > /dev/null 2>&1 &)
CLAVE="$SRP_AUD_CLAVE"
echo "[
 {\"id\":\"a0d10000-0000-4000-8000-000000000001\",\"correo\":\"aud.admin@ejemplo.local\",\"nombre\":\"Auditoria Admin Ejemplo\",\"perfil\":\"ADMIN\",\"organizacion_id\":\"o-sedema\",\"clave\":\"$CLAVE\"},
 {\"id\":\"a0d10000-0000-4000-8000-000000000002\",\"correo\":\"aud.dir@ejemplo.local\",\"nombre\":\"Auditoria Direccion Ejemplo\",\"perfil\":\"DIRECTIVO\",\"organizacion_id\":\"o-sedema\",\"clave\":\"$CLAVE\"},
 {\"id\":\"a0d10000-0000-4000-8000-000000000003\",\"correo\":\"aud.coord@ejemplo.local\",\"nombre\":\"Auditoria Coordinacion Ejemplo\",\"perfil\":\"COORDINADOR\",\"organizacion_id\":\"o-sedema\",\"clave\":\"$CLAVE\"},
 {\"id\":\"a0d10000-0000-4000-8000-000000000004\",\"correo\":\"aud.cabo@ejemplo.local\",\"nombre\":\"Auditoria Cabo Ejemplo\",\"perfil\":\"CABO\",\"organizacion_id\":\"o-sedema\",\"clave\":\"$CLAVE\"}
]" > /c/sia-rev/tmp/herr/cuentas-real.json
python -c "import json; c=json.load(open(r'C:\sia-rev\tmp\herr\cuentas-real.json')); print(json.dumps({'cuentas': c}))" | node pruebas/apoyo_servidor.mjs preparar
sleep 3
curl -s -o /dev/null -w "servicio %{http_code}\n" http://127.0.0.1:3130/api/srp/acceso/yo
curl -s -o /dev/null -w "app %{http_code}\n" http://127.0.0.1:8090/index.html
