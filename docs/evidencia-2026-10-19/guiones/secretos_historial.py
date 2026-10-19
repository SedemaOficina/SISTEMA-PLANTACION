"""Busca secretos y datos sensibles en TODO el historial de git (cada versión de cada archivo), sin gitleaks.
Uso: python secretos_historial.py <repo>"""
import re, subprocess, sys, collections
REPO = sys.argv[1]
PATRONES = {
    'llave privada': re.compile(r'-----BEGIN [A-Z ]*PRIVATE KEY-----'),
    'llave de AWS': re.compile(r'AKIA[0-9A-Z]{16}'),
    'llave de Google': re.compile(r'AIza[0-9A-Za-z_\-]{35}'),
    'token de GitHub': re.compile(r'gh[pousr]_[0-9A-Za-z]{30,}'),
    'llave tipo sk-': re.compile(r'\bsk-[0-9A-Za-z]{20,}'),
    'JWT': re.compile(r'eyJ[0-9A-Za-z_\-]{10,}\.eyJ[0-9A-Za-z_\-]{10,}\.[0-9A-Za-z_\-]{10,}'),
    'contraseña asignada': re.compile(r'(?i)(password|passwd|contrase[nñ]a|clave|secret|token|api[_-]?key)\s*[:=]\s*["\']([^"\'\s]{8,})["\']'),
    'cadena de conexión con clave': re.compile(r'(?i)postgres(ql)?://[^:\s/]+:[^@\s]+@'),
    'dirección IP privada': re.compile(r'\b(10\.\d{1,3}\.\d{1,3}\.\d{1,3}|192\.168\.\d{1,3}\.\d{1,3}|172\.(1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3})\b'),
    'correo que no es de ejemplo': re.compile(r'[A-Za-z0-9._%+-]+@(?!ejemplo\.local|users\.noreply\.github\.com|anthropic\.com|example\.(com|org)|ejemplo\.(com|org)\b)[A-Za-z0-9.-]+\.(com|mx|org|net|gob\.mx|edu)\b'),
    'placa con formato real': re.compile(r'\b[A-Z]{3}[- ]?\d{3,4}\b|\b\d{2,3}[- ][A-Z]{3}\b'),
}
IGNORAR_PLACA = re.compile(r'\b(PRU|ESP|ALC|UTF|GMT|CDMX|ISO|USB|SHA|RGB|HSL|SVG|PNG|PDF|CSV|XLS|API|CSS|DOM|URL|SQL|WGS|EPSG|NOM|CRS)\b')
r = subprocess.run(['git', '-C', REPO, 'log', '--all', '-p', '--no-color', '--format=@@COMMIT %h %ad', '--date=short'],
                   capture_output=True, text=True, encoding='utf-8', errors='replace')
commit, archivo = '', ''
hallazgos = collections.defaultdict(list)
for linea in r.stdout.split('\n'):
    if linea.startswith('@@COMMIT '): commit = linea[9:]; continue
    if linea.startswith('+++ b/'): archivo = linea[6:]; continue
    if not linea.startswith('+') or linea.startswith('+++'): continue
    for nombre, pat in PATRONES.items():
        for m in pat.finditer(linea):
            texto = m.group(0)
            if nombre == 'placa con formato real' and (IGNORAR_PLACA.search(texto) or archivo.endswith(('.md', '.py'))):
                continue
            if nombre == 'contraseña asignada' and re.search(r'(?i)prueba|ejemplo|conexion de prueba|xxxx|\.\.\.|<|\$\{|process\.env', linea):
                continue
            hallazgos[nombre].append((commit, archivo, texto[:60]))
print('Commits revisados:', r.stdout.count('@@COMMIT '))
for nombre in PATRONES:
    lista = hallazgos.get(nombre, [])
    unicos = sorted(set((a, t) for _, a, t in lista))
    print('\n%s: %d apariciones, %d distintas' % (nombre, len(lista), len(unicos)))
    for a, t in unicos[:12]: print('   ', a, '|', t)
