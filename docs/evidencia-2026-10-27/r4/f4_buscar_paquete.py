"""F4 · Busca en el paquete (texto, sin PDF/imagenes/fuentes/zip) direcciones internas, servidores, correos reales,
cadenas de conexion, claves con valor, rutas personales y restos de prueba. Dice archivo y cuantas veces; no
copia los valores. Uso: PYTHONUTF8=1 python -I f4_buscar_paquete.py <carpeta del paquete>"""
import os, re, sys
raiz = sys.argv[1]
pat = {'IP privada': re.compile(rb'\b(10\.\d{1,3}\.\d{1,3}\.\d{1,3}|192\.168\.\d{1,3}\.\d{1,3}|172\.(1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3})\b'),
       'servidor interno': re.compile(rb'\b[a-z0-9-]+\.(internal|intranet|lan|corp)\b|\b(?<!ejemplo\.)[a-z0-9-]+\.local\b(?<!ejemplo\.local)'),
       'correo que no es de ejemplo': re.compile(rb'[A-Za-z0-9._%+-]+@(?!ejemplo\.local|example\.|ejemplo\.)[A-Za-z0-9.-]+\.(com|mx|org|net|gob\.mx)\b'),
       'cadena de conexion': re.compile(rb'(?i)postgres(ql)?://[^:\s/]+:[^@\s]+@'),
       'variable de clave con valor': re.compile(rb'(?i)(_PASS|PASSWORD|SECRET|TOKEN)\s*=\s*["\']?[^\s"\'$<{(]{6,}'),
       'ruta personal': re.compile(rb'(?i)C:\\Users\\|C:/Users/|/home/[a-z]+/'),
       'ssh o salto': re.compile(rb'(?i)ssh\s+-J'),
       'correo de prueba @ejemplo.local': re.compile(rb'@ejemplo\.local'),
       'cuenta de prueba (u-demo-, u-cabo-1...)': re.compile(rb'u-demo-|u-cabo-1|u-admin-1|u-coord-1')}
cuenta = {}
for d, _, fs in os.walk(raiz):
    if '.git' in d.split(os.sep): continue
    for f in fs:
        if f.endswith(('.zip', '.pdf', '.png', '.woff2', '.ttf')): continue
        r = os.path.relpath(os.path.join(d, f), raiz).replace(os.sep, '/')
        b = open(os.path.join(d, f), 'rb').read()
        for n, p in pat.items():
            m = p.findall(b)
            if m: cuenta.setdefault(n, []).append((r, len(m)))
for n in pat:
    l = cuenta.get(n, [])
    print('%s: %d archivos' % (n, len(l)))
    for r, k in l[:12]: print('    %s (%d)' % (r, k))
