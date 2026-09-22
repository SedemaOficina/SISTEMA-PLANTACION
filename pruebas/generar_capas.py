# GENERA LAS CAPAS QUE CARGA LA APLICACIÓN A PARTIR DE LOS ARCHIVOS TAL COMO LLEGARON DEL SIA.
#
# Los originales viven en assets/fuentes/ y no se tocan: son la constancia de qué se recibió.
# Este script los valida, se queda sólo con los atributos que el sistema usa, redondea a seis
# decimales (~11 cm, por debajo de la exactitud de cualquier capa de límites) y escribe dos
# scripts clásicos que definen SRP.CAPAS.alcaldias y SRP.CAPAS.uga. Clásicos y no módulos,
# porque la aplicación también abre con doble clic (file://).
#
# Uso:  python3 generar_capas.py          (desde la carpeta de la aplicación o desde pruebas/)
# Si algo del original no cuadra —un feature de más, una clave repetida, una geometría rota—
# se detiene y lo dice; no genera capas a medias.
import json, os, sys, math, re

AQUI = os.path.dirname(os.path.abspath(__file__))
RAIZ = AQUI if os.path.exists(os.path.join(AQUI, 'assets')) else os.path.join(AQUI, '..')
FUENTES = os.path.join(RAIZ, 'assets', 'fuentes')
DESTINO = os.path.join(RAIZ, 'assets')
DECIMALES = 6

# Lo que se sabe de cada entrega. Si llega una capa nueva, se actualiza aquí y se vuelve a correr.
META = {
    'alcaldias': {
        'archivo': 'alcaldias_cdmx.json',
        'origen': 'SIA, entregada el 21-SEP-2026. [pendiente] confirmar fuente (INEGI Marco Geoestadístico) y fecha de corte',
        'version': 'sia-2026-09-21',
        'fecha_corte': '2026-09-21',
        'crs': 'EPSG:4326 (longitud, latitud)',
        'esperados': 16,
        'clave': 'cvegeo'
    },
    'uga': {
        'archivo': 'ugasdata.wgs84.json',
        'origen': 'SIA, entregada el 21-SEP-2026. Malla hexagonal de ~1 km2; el prefijo de la clave es la alcaldía. [pendiente] confirmar fecha de corte',
        'version': 'sia-2026-09-21',
        'fecha_corte': '2026-09-21',
        'crs': 'EPSG:4326 (longitud, latitud)',
        'esperados': 1624,
        'clave': 'CLAVE'
    }
}

def fallar(msg):
    print('ERROR:', msg); sys.exit(1)

def redondear(o):
    if isinstance(o, float): return round(o, DECIMALES)
    if isinstance(o, list): return [redondear(x) for x in o]
    return o

def anillo_cerrado(r): return len(r) >= 4 and r[0] == r[-1]

def cargar(nombre):
    m = META[nombre]
    ruta = os.path.join(FUENTES, m['archivo'])
    d = json.load(open(ruta, encoding='utf-8'))
    fs = d.get('features', [])
    if d.get('type') != 'FeatureCollection': fallar(f'{m["archivo"]}: no es FeatureCollection')
    if len(fs) != m['esperados']: fallar(f'{m["archivo"]}: {len(fs)} features, se esperaban {m["esperados"]}')
    claves = [f['properties'].get(m['clave']) for f in fs]
    if any(c in (None, '') for c in claves): fallar(f'{m["archivo"]}: hay features sin {m["clave"]}')
    if len(set(claves)) != len(claves): fallar(f'{m["archivo"]}: claves repetidas en {m["clave"]}')
    for f in fs:
        g = f['geometry']
        if g['type'] != 'MultiPolygon': fallar(f'{m["archivo"]}: geometría {g["type"]}, se esperaba MultiPolygon')
        for pg in g['coordinates']:
            for r in pg:
                if not anillo_cerrado(r): fallar(f'{m["archivo"]}: anillo abierto en {f["properties"].get(m["clave"])}')
                for x, y in r:
                    if not (-99.5 < x < -98.8 and 18.9 < y < 19.7): fallar(f'{m["archivo"]}: coordenada fuera de la CDMX ({x}, {y}); ¿está en EPSG:4326?')
    return fs

def escribir(nombre, features, props):
    m = META[nombre]
    salida = {
        'meta': {k: m[k] for k in ('origen', 'version', 'fecha_corte', 'crs')},
        'geojson': {'type': 'FeatureCollection', 'features': []}
    }
    salida['meta']['features'] = len(features)
    salida['meta']['generado_por'] = 'generar_capas.py a partir de assets/fuentes/' + m['archivo']
    for f in features:
        salida['geojson']['features'].append({
            'type': 'Feature',
            'properties': props(f['properties']),
            # Sin caja incrustada: la derivación la calcula al cargar, en un milisegundo,
            # y así no viajan 80 KB de números que se deducen de los que ya viajan.
            'geometry': {'type': 'MultiPolygon', 'coordinates': redondear(f['geometry']['coordinates'])}
        })
    texto = json.dumps(salida, separators=(',', ':'), ensure_ascii=False)
    ruta = os.path.join(DESTINO, f'capa-{nombre}.js')
    with open(ruta, 'w', encoding='utf-8') as w:
        w.write(f'/* CAPA {nombre.upper()} — GENERADA, NO EDITAR A MANO.\n')
        w.write(f'   Sale de assets/fuentes/{m["archivo"]} con pruebas/generar_capas.py: atributos mínimos,\n')
        w.write(f'   {DECIMALES} decimales. Para cambiarla, cambiar el original y volver a generar. */\n')
        w.write('window.SRP = window.SRP || {}; SRP.CAPAS = SRP.CAPAS || {};\n')
        w.write(f'SRP.CAPAS.{nombre} = {texto};\n')
    print(f'{os.path.relpath(ruta, RAIZ)}: {len(features)} features, {os.path.getsize(ruta)/1024:.0f} KB')

alc = cargar('alcaldias')
uga = cargar('uga')

# El prefijo de la UGA debe ser una clave de alcaldía conocida
clv = {f['properties']['clv_mun'] for f in alc}
raros = sorted({f['properties']['CLAVE'].split('-')[0] for f in uga} - clv)
if raros: fallar(f'UGAs con prefijo que no es alcaldía: {raros}')

escribir('alcaldias', alc, lambda p: {'cvegeo': p['cvegeo'], 'nombre': p['nomgeo'], 'clave': p['clv_mun']})
escribir('uga', uga, lambda p: {'clave': p['CLAVE']})
print('capas generadas sin hallazgos')
