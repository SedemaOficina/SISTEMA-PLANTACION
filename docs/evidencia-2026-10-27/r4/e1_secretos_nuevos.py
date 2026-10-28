"""E1 · Secretos y datos reales en los commits nuevos (8d0cfcd..1eb30e6), adaptado de
docs/evidencia-2026-10-19/guiones/secretos_historial.py.

Además de los patrones del guion anterior, busca las PLACAS REALES de la base local: se leen por la entrada
estándar (una por renglón, salida de psql), se guardan sólo en memoria y el informe dice cuántas aparecen y en
qué archivo, SIN escribir ninguna. También extrae el texto de los PDF nuevos o cambiados (los manuales) y lo
revisa con los mismos patrones.

Uso (desde la raíz de la copia r4):
  printf 'SELECT clave FROM srp.vehiculos UNION SELECT placa FROM srp.vehiculos;\n' | psql -w -A -t ... | \
      PYTHONUTF8=1 python -I evidencia/e1_secretos_nuevos.py . 8d0cfcd..1eb30e6
"""
import collections, io, re, subprocess, sys

REPO, RANGO = sys.argv[1], sys.argv[2]
placas = {p.strip() for p in sys.stdin.read().splitlines() if len(p.strip()) >= 5}
normal = lambda s: re.sub(r'[\s\-]', '', s).upper()
placas_n = {normal(p) for p in placas if len(normal(p)) >= 5}

PATRONES = {
    'llave privada': re.compile(r'-----BEGIN [A-Z ]*PRIVATE KEY-----'),
    'llave de AWS': re.compile(r'AKIA[0-9A-Z]{16}'),
    'llave de Google': re.compile(r'AIza[0-9A-Za-z_\-]{35}'),
    'token de GitHub': re.compile(r'gh[pousr]_[0-9A-Za-z]{30,}'),
    'llave tipo sk-': re.compile(r'\bsk-[0-9A-Za-z]{20,}'),
    'JWT': re.compile(r'eyJ[0-9A-Za-z_\-]{10,}\.eyJ[0-9A-Za-z_\-]{10,}\.[0-9A-Za-z_\-]{10,}'),
    'contraseña asignada': re.compile(r'(?i)(password|passwd|contrase[nñ]a|clave|secret|token|api[_-]?key|_PASS)\s*[:=]\s*["\']?([^"\'\s]{8,})'),
    'cadena de conexión con clave': re.compile(r'(?i)postgres(ql)?://[^:\s/]+:[^@\s]+@'),
    'dirección IP privada': re.compile(r'\b(10\.\d{1,3}\.\d{1,3}\.\d{1,3}|192\.168\.\d{1,3}\.\d{1,3}|172\.(1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3})\b'),
    'nombre de servidor interno': re.compile(r'(?i)\b[a-z0-9-]+\.(internal|intranet|local|lan|corp)\b(?<!ejemplo\.local)'),
    'correo que no es de ejemplo': re.compile(r'[A-Za-z0-9._%+-]+@(?!ejemplo\.local|users\.noreply\.github\.com|anthropic\.com|example\.(com|org)|ejemplo\.(com|org)\b)[A-Za-z0-9.-]+\.(com|mx|org|net|gob\.mx|edu)\b'),
    'ruta personal': re.compile(r'(?i)C:[\\/]+Users[\\/]+[a-z]+|/home/[a-z]+/'),
    'placa con formato real': re.compile(r'\b[A-Z]{3}[- ]?\d{3,4}\b|\b\d{2,3}[- ][A-Z]{3}\b|\b[A-Z]\d{3}[- ]?[A-Z]{2}\b'),
}
IGNORAR_PLACA = re.compile(r'\b(PRU|ESP|ALC|UTF|GMT|CDMX|ISO|USB|SHA|RGB|HSL|SVG|PNG|PDF|CSV|XLS|API|CSS|DOM|URL|SQL|WGS|EPSG|NOM|CRS)\b')
IGNORAR_CLAVE = re.compile(r'(?i)prueba|ejemplo|xxxx|\.\.\.|<|\$\{|process\.env|env\.|CLAVE\s*=\s*["\']R4|derivar\(|\bclave:\s*[a-z_]+\b')

hallazgos = collections.defaultdict(list)
placas_vistas = collections.Counter()


def revisar(texto, archivo, commit):
    for nombre, pat in PATRONES.items():
        for m in pat.finditer(texto):
            t = m.group(0)
            if nombre == 'placa con formato real' and (IGNORAR_PLACA.search(t) or archivo.endswith(('.md', '.py'))):
                continue
            if nombre == 'contraseña asignada' and IGNORAR_CLAVE.search(texto[max(0, m.start() - 80):m.end() + 40]):
                continue
            hallazgos[nombre].append((commit, archivo, t[:60] if nombre != 'placa con formato real' else '<formato de placa>'))
    if placas_n:
        plano = normal(texto)
        for p in placas_n:
            if p in plano:
                placas_vistas[(commit, archivo)] += 1


r = subprocess.run(['git', '-C', REPO, 'log', RANGO, '-p', '--no-color', '--format=@@COMMIT %h %ad', '--date=short'],
                   capture_output=True, text=True, encoding='utf-8', errors='replace')
commit = archivo = ''
for linea in r.stdout.split('\n'):
    if linea.startswith('@@COMMIT '):
        commit = linea[9:]; continue
    if linea.startswith('+++ b/'):
        archivo = linea[6:]; continue
    if linea.startswith('+') and not linea.startswith('+++'):
        revisar(linea, archivo, commit)
# Los mensajes de los commits
msgs = subprocess.run(['git', '-C', REPO, 'log', RANGO, '--format=@@%h %B'], capture_output=True, text=True, encoding='utf-8', errors='replace').stdout
revisar(msgs, '(mensajes de commit)', RANGO)

# Los PDF que entraron o cambiaron en el rango, por su texto
pdfs = subprocess.run(['git', '-C', REPO, 'diff', '--name-only', RANGO.replace('..', ' ').split()[0], RANGO.split('..')[1], '--', '*.pdf'],
                      capture_output=True, text=True, encoding='utf-8').stdout.split()
try:
    from pypdf import PdfReader
    for pdf in pdfs:
        datos = subprocess.run(['git', '-C', REPO, 'show', RANGO.split('..')[1] + ':' + pdf], capture_output=True).stdout
        texto = '\n'.join((p.extract_text() or '') for p in PdfReader(io.BytesIO(datos)).pages)
        revisar(texto, pdf + ' (texto)', RANGO.split('..')[1])
except ImportError:
    print('pypdf no está: los PDF no se revisaron')

print('Rango:', RANGO, '· commits:', r.stdout.count('@@COMMIT '), '· PDF revisados por su texto:', len(pdfs))
print('Placas reales de la base local cargadas en memoria:', len(placas_n))
print('\nplacas reales de la base encontradas: %d apariciones en %d archivos' % (sum(placas_vistas.values()), len(placas_vistas)))
for (c, a), n in sorted(placas_vistas.items()):
    print('   ', c, a, n)
for nombre in PATRONES:
    lista = hallazgos.get(nombre, [])
    unicos = sorted(set((a, t) for _, a, t in lista))
    print('\n%s: %d apariciones, %d distintas' % (nombre, len(lista), len(unicos)))
    for a, t in unicos[:15]:
        print('   ', a, '|', t)
