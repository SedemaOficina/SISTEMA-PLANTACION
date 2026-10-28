"""r3 · Cuentas de prueba para el modo real: crea (preparar) o borra (quitar) tres cuentas r3.* en la base local con
pruebas/apoyo_servidor.mjs. La contraseña se genera al azar en cada corrida y sólo se guarda en un archivo temporal
fuera de la evidencia (no se escribe en los hallazgos). Uso: python real_cuentas.py preparar|quitar"""
import json, os, secrets, subprocess, sys, tempfile, uuid
RAIZ = r'C:\sia-rev\tmp\aud1027\r3'
CLAVES = os.path.join(tempfile.gettempdir(), 'r3-claves-temporales.json')
# Identificadores fijos (uuid5 de un nombre) para poder quitarlas después en otra corrida
U = lambda n: str(uuid.uuid5(uuid.NAMESPACE_DNS, 'r3.' + n + '.ejemplo.local'))
CUENTAS = [
    {'id': U('coord'), 'correo': 'r3.coord@ejemplo.local', 'nombre': 'Coordinación Revisión Tres', 'perfil': 'COORDINADOR', 'organizacion_id': 'o-sedema', 'cargo': 'Coordinador de cuadrilla'},
    {'id': U('cabo1'), 'correo': 'r3.cabo1@ejemplo.local', 'nombre': 'Cabo Uno Revisión', 'perfil': 'CABO', 'organizacion_id': 'o-sedema', 'cargo': 'Cabo de cuadrilla'},
    {'id': U('cabo2'), 'correo': 'r3.cabo2@ejemplo.local', 'nombre': 'Cabo Dos Revisión', 'perfil': 'CABO', 'organizacion_id': 'o-sedema', 'cargo': 'Cabo de cuadrilla'},
]

def apoyo(orden, datos):
    r = subprocess.run(['node', 'pruebas/apoyo_servidor.mjs', orden], cwd=RAIZ, input=json.dumps(datos), capture_output=True, text=True, encoding='utf-8')
    return r.returncode, (r.stdout or '') + (r.stderr or '')[-400:]

if __name__ == '__main__':
    if sys.argv[1] == 'preparar':
        clave = 'R3-' + secrets.token_urlsafe(12) + '-2026'
        json.dump({'clave': clave}, open(CLAVES, 'w'))
        print(apoyo('preparar', {'cuentas': [dict(c, clave=clave, temporal=False) for c in CUENTAS]}))
    else:
        print(apoyo('quitar', {'ids': [c['id'] for c in CUENTAS]}))
        print(apoyo('preparar', {'cuentas': []}))   # devuelve el rol prestado, como pide la coordinación
