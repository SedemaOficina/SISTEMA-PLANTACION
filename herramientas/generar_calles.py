# GENERA LA COPIA LIGERA DE LA CAPA DE CALLES PARA LA VERSIÓN DE PRUEBA.
#
# En el SIA, la calle de cada árbol la pone el servidor con territorio.calles (servidor/db/srp/09-srp-calles.sql).
# La versión de prueba no tiene servidor: su servidor simulado (js/calles.js) la calcula con esta copia, que lleva
# sólo lo que usa el SRP: el trazo, la clave, el nombre, entre qué calles va, la red vial, el tipo de vía, quién la
# atiende y la llave para comparar nombres. Va partida en celdas de 0.04° (unos 4 km): un árbol baja sólo la de su
# punto. Cada celda trae todo tramo que pase a 60 m o menos de ella, así que la calle de un punto siempre está en su
# celda, aunque el tramo sea de la vecina.
#
# Fuente: el GeoPackage del paquete calles-cdmx (datos/calles_cdmx.gpkg), tal como se aprobó. No viaja con el
# repositorio: es del proyecto calles-cdmx, carpeta hermana de ésta.
#
# Uso:  python herramientas/generar_calles.py [ruta del calles_cdmx.gpkg]
# Coordenadas en millonésimas de grado (unos 11 cm), en diferencias desde el primer vértice. Si la capa no trae lo
# que se espera (sus conteos de control), se detiene y no escribe nada.
import hashlib, json, math, os, shutil, sqlite3, sys
import shapely

AQUI = os.path.dirname(os.path.abspath(__file__))
RAIZ = os.path.join(AQUI, '..')
FUENTE = sys.argv[1] if len(sys.argv) > 1 else os.path.join(RAIZ, '..', 'calles-cdmx', 'salidas', 'entrega', 'calles-cdmx-1.0.0', 'datos', 'calles_cdmx.gpkg')
DESTINO = os.path.join(RAIZ, 'assets', 'calles')
VERSION = '1.0.0'
TRAMOS = 178771                     # conteo de control del paquete 1.0.0
CELDA = 0.04                        # grados por lado
MARGEN = 0.0006                     # unos 60 m: más que los 40 m de la regla y los 4 m de la esquina
ESCALA = 1_000_000
REDES = ['primaria', 'secundaria', 'carretera o camino']   # como SRP.calles.REDES
CITA = ('Elaborado por SEDEMA con información de: INEGI, Marco Geoestadístico. Encuesta Intercensal 2025; INEGI, Red Nacional de Caminos 2025 '
        '(INEGI, SICT, IMT); SEMOVI, Vialidades primarias de la Ciudad de México (Portal de Datos Abiertos de la Ciudad de México, CC BY 4.0), y '
        'ACUERDO/CCV/016/3ORD/SEPTIEMBRE/2024 de la Comisión de Clasificación de Vialidades. SEDEMA unió, partió y clasificó los tramos, y homologó '
        'sus nombres; esas transformaciones no son del INEGI ni de SEMOVI, ni están respaldadas por ellos.')

if not os.path.isfile(FUENTE):
    sys.exit('No está la capa de calles en ' + os.path.abspath(FUENTE) + ': es del proyecto calles-cdmx (salidas/entrega/calles-cdmx-' + VERSION + '/datos/).')
suma = hashlib.sha256(open(FUENTE, 'rb').read()).hexdigest()
con = sqlite3.connect('file:' + FUENTE + '?mode=ro', uri=True)
filas = con.execute('SELECT geom, clave, nombre, entre_1, entre_2, red_vial, tipo_via, atiende, llave FROM calles ORDER BY clave').fetchall()
if len(filas) != TRAMOS:
    sys.exit('La capa trae %d tramos; el paquete %s trae %d. ¿Es otra versión?' % (len(filas), VERSION, TRAMOS))
if any(f[5] not in REDES for f in filas):
    sys.exit('Hay redes viales que el SRP no conoce: %s' % sorted({f[5] for f in filas} - set(REDES)))


def wkb(b):
    """La geometría de GeoPackage: cabecera «GP», versión, banderas y recuadro, luego el WKB."""
    return b[8 + (0, 32, 48, 48, 64)[(b[3] >> 1) & 7]:]


celdas = {}
for g, clave, nombre, e1, e2, red, tipo, atiende, llave in filas:
    geo = shapely.from_wkb(wkb(g))
    partes = list(geo.geoms) if geo.geom_type == 'MultiLineString' else [geo]
    trazos = []
    for parte in partes:
        xy = [(round(x * ESCALA), round(y * ESCALA)) for x, y in parte.coords]
        plano = [xy[0][0], xy[0][1]]
        for (xa, ya), (xb, yb) in zip(xy, xy[1:]):
            plano += [xb - xa, yb - ya]
        trazos.append(plano)
    x0, y0, x1, y1 = geo.bounds
    for i in range(math.floor((x0 - MARGEN) / CELDA), math.floor((x1 + MARGEN) / CELDA) + 1):
        for j in range(math.floor((y0 - MARGEN) / CELDA), math.floor((y1 + MARGEN) / CELDA) + 1):
            celdas.setdefault((i, j), []).append((clave, nombre, e1, e2, REDES.index(red), tipo, atiende, llave, trazos))

os.makedirs(DESTINO, exist_ok=True)
# Las celdas de una versión anterior que ya no salen no se borran: van a _to_delete/
sobran = [a for a in os.listdir(DESTINO) if a.endswith('.json') and a != 'indice.json' and tuple(map(int, a[1:-5].split('_'))) not in celdas]
if sobran:
    viejas = os.path.join(RAIZ, '_to_delete', 'calles-celdas-anteriores')
    os.makedirs(viejas, exist_ok=True)
    for a in sobran:
        shutil.move(os.path.join(DESTINO, a), os.path.join(viejas, a))
    print('%d celdas que ya no salen, movidas a _to_delete/calles-celdas-anteriores/' % len(sobran))
total = 0
for (i, j), tramos in sorted(celdas.items()):
    textos = [None]
    indice = {None: 0}
    def t(s):
        if s not in indice:
            indice[s] = len(textos); textos.append(s)
        return indice[s]
    salida = {'celda': [i, j], 'textos': textos,
              'tramos': [[c, t(n), t(a), t(b), r, t(ti), t(at), t(ll), tr] for c, n, a, b, r, ti, at, ll, tr in tramos]}
    texto = json.dumps(salida, ensure_ascii=False, separators=(',', ':'))
    open(os.path.join(DESTINO, 'c%d_%d.json' % (i, j)), 'w', encoding='utf-8', newline='\n').write(texto)
    total += len(texto.encode())
indice = {
    'capa': 'calles-cdmx', 'version': VERSION, 'tramos': TRAMOS, 'sha256_fuente': suma, 'celda_grados': CELDA, 'margen_grados': MARGEN,
    'escala': ESCALA, 'redes': REDES, 'cita': CITA,
    'campos': ['clave', 'nombre', 'entre_1', 'entre_2', 'red_vial', 'tipo_via', 'atiende', 'llave', 'trazos'],
    'celdas': sorted('%d_%d' % k for k in celdas),
}
open(os.path.join(DESTINO, 'indice.json'), 'w', encoding='utf-8', newline='\n').write(json.dumps(indice, ensure_ascii=False, indent=1) + '\n')
print('%d celdas, %.1f MB, fuente %s…' % (len(celdas), total / 1e6, suma[:16]))
