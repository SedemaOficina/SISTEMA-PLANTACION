# GENERA LAS CAPAS QUE CARGA LA APLICACIÓN A PARTIR DE LOS ARCHIVOS TAL COMO LLEGARON DEL SIA.
#
# Los originales viven en assets/fuentes/ y no se tocan: son la constancia de qué se recibió.
# Este script los valida, se queda sólo con los atributos que el sistema usa, redondea a seis
# decimales (~11 cm, por debajo de la exactitud de cualquier capa de límites) y escribe dos
# scripts clásicos que definen SRP.CAPAS.alcaldias, SRP.CAPAS.uga y SRP.CAPAS.colonias. Clásicos y no módulos,
# porque la aplicación también abre con doble clic (file://).
#
# Uso:  python3 generar_capas.py          (desde la carpeta de la aplicación o desde pruebas/)
# Si algo del original no cuadra —un feature de más, una clave repetida, una geometría rota—
# se detiene y lo dice; no genera capas a medias.
import json, os, sys, math, re
import shapely
from shapely.geometry import shape, mapping

AQUI = os.path.dirname(os.path.abspath(__file__))
RAIZ = AQUI if os.path.exists(os.path.join(AQUI, 'assets')) else os.path.join(AQUI, '..')
FUENTES = os.path.join(RAIZ, 'assets', 'fuentes')
DESTINO = os.path.join(RAIZ, 'assets')
DECIMALES = 6

# Lo que se sabe de cada entrega. Si llega una capa nueva, se actualiza aquí y se vuelve a correr.
META = {
    'alcaldias': {
        'archivo': 'alcaldias_cdmx.json',
        'origen': 'SIA (CSIA/SEDEMA) con base en INEGI, 16 demarcaciones publicadas el 14-AGO-2017; metadato del 01-ENE-2026 (assets/fuentes/documentacion). DEFINITIVA: sin solapes ni huecos (bloque 38)',
        'version': 'sia-2026-01-01',
        'fecha_corte': '2026-01-01',
        'crs': 'EPSG:4326 (longitud, latitud)',
        'esperados': 16,
        'clave': 'cvegeo'
    },
    'uga': {
        'archivo': 'UGA_CDMX.geojson',
        'origen': 'SIA, entregada el 22-SEP-2026 como versión final. Malla hexagonal de ~1 km2, misma geometría que la del 21-SEP. El prefijo de la clave NO indica la alcaldía del punto: 8 celdas siguen con prefijo distinto a su alcaldía (bloque 38)',
        'version': 'sia-2026-09-22',
        'fecha_corte': '2026-09-22',
        'crs': 'EPSG:4326 (longitud, latitud)',
        'esperados': 1624,
        'clave': 'clave'
    },
    'colonias': {
        'archivo': 'colonias_iecm2022.geojson',
        'origen': 'IECM 2022, unidades territoriales (colonias, pueblos, barrios, U HAB). CAPA DE PRUEBA: no es la definitiva; se sustituye antes de liberar la etapa, junto con alcaldías y UGA',
        'version': 'iecm-2022-prueba',
        'fecha_corte': '2022',
        'crs': 'EPSG:4326 (longitud, latitud)',
        'esperados': 1837,
        'clave': 'CVEUT'
    }
}

def fallar(msg):
    print('ERROR:', msg); sys.exit(1)

def redondear(o):
    if isinstance(o, float): return round(o, DECIMALES)
    if isinstance(o, list): return [redondear(x) for x in o]
    return o

def anillo_cerrado(r): return len(r) >= 4 and r[0] == r[-1]

def listas(o):
    return [listas(x) for x in o] if isinstance(o, (list, tuple)) else o

def geometria_final(coords, clave, archivo):
    """Redondea a seis decimales y comprueba que la geometría siga siendo válida (D152). El redondeo
    simple puede dejar anillos que se tocan o se cruzan: pasó en nueve colonias, y una geometría
    inválida hace que el cruce punto-en-polígono falle sin avisar. Si el redondeo la rompe, se
    ajusta a la misma rejilla con shapely.set_precision, que la conserva válida; si aun así no lo
    es, se detiene."""
    r = redondear(coords)
    if shape({'type': 'MultiPolygon', 'coordinates': r}).is_valid: return r, False
    g = shape({'type': 'MultiPolygon', 'coordinates': coords})
    if not g.is_valid: g = shapely.make_valid(g)
    g = shapely.set_precision(g, 10 ** -DECIMALES)
    partes = [p for p in getattr(g, 'geoms', [g]) if p.geom_type in ('Polygon', 'MultiPolygon')]
    polis = [q for p in partes for q in getattr(p, 'geoms', [p])]
    r = redondear(listas([mapping(p)['coordinates'] for p in polis]))
    if not polis or not shape({'type': 'MultiPolygon', 'coordinates': r}).is_valid:
        fallar(f'{archivo}: la geometría de {clave} queda inválida al redondear y no se pudo ajustar')
    return r, True

# Prefijo de tres letras de cada alcaldía, por clave INEGI. La capa definitiva ya no lo trae
# (sí la anterior, como clv_mun); es el mismo que usa la malla UGA en sus claves.
PREFIJO = {'09002': 'AZC', '09003': 'COY', '09004': 'CUJ', '09005': 'GAM', '09006': 'IZC', '09007': 'IZP',
           '09008': 'MAC', '09009': 'MLP', '09010': 'AOB', '09011': 'TLH', '09012': 'TLP', '09013': 'XOC',
           '09014': 'BJU', '09015': 'CUH', '09016': 'MIH', '09017': 'VCA'}

def cargar(nombre):
    m = META[nombre]
    ruta = os.path.join(FUENTES, m['archivo'])
    texto = open(ruta, encoding='utf-8').read()
    try:
        d = json.loads(texto)
    except json.JSONDecodeError:
        # GeoJSON por renglones (un Feature por línea, como exporta la capa definitiva de alcaldías):
        # se arma la colección en memoria; el original no se toca
        d = {'type': 'FeatureCollection', 'features': [json.loads(l) for l in texto.splitlines() if l.strip()]}
    fs = d.get('features', [])
    if d.get('type') != 'FeatureCollection': fallar(f'{m["archivo"]}: no es FeatureCollection')
    if len(fs) != m['esperados']: fallar(f'{m["archivo"]}: {len(fs)} features, se esperaban {m["esperados"]}')
    claves = [f['properties'].get(m['clave']) for f in fs]
    if any(c in (None, '') for c in claves): fallar(f'{m["archivo"]}: hay features sin {m["clave"]}')
    if len(set(claves)) != len(claves): fallar(f'{m["archivo"]}: claves repetidas en {m["clave"]}')
    for f in fs:
        g = f['geometry']
        # Un Polygon se guarda como MultiPolygon de una parte: la derivación trata una sola forma
        if g['type'] == 'Polygon': g['type'], g['coordinates'] = 'MultiPolygon', [g['coordinates']]
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
    ajustadas = []
    for f in features:
        clave = f['properties'].get(m['clave'])
        coords, ajustada = geometria_final(f['geometry']['coordinates'], clave, m['archivo'])
        if ajustada: ajustadas.append(clave)
        salida['geojson']['features'].append({
            'type': 'Feature',
            'properties': props(f['properties']),
            # Sin caja incrustada: la derivación la calcula al cargar, en un milisegundo,
            # y así no viajan 80 KB de números que se deducen de los que ya viajan.
            'geometry': {'type': 'MultiPolygon', 'coordinates': coords}
        })
    if ajustadas: print(f'{nombre}: {len(ajustadas)} geometrías ajustadas a la rejilla para que sigan válidas: {", ".join(ajustadas)}')
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
col = cargar('colonias')

# El prefijo de la UGA debe ser una clave de alcaldía conocida
if set(PREFIJO) != {f['properties']['cvegeo'] for f in alc}: fallar('las claves cvegeo no son las 16 esperadas')
clv = set(PREFIJO.values())
raros = sorted({f['properties']['clave'].split('-')[0] for f in uga} - clv)
if raros: fallar(f'UGAs con prefijo que no es alcaldía: {raros}')

escribir('alcaldias', alc, lambda p: {'cvegeo': p['cvegeo'], 'nombre': p['nomgeo'], 'clave': PREFIJO[p['cvegeo']]})
escribir('uga', uga, lambda p: {'clave': p['clave']})
# El nombre va como viene —mayúsculas y tipo entre paréntesis, D62—; sólo se quitan los espacios
# dobles (23 casos como «GRAL C  A  MADRAZO»), que son error de captura y no parte del nombre.
# La demarcación del IECM no se conserva: la alcaldía del punto sale de su propia capa (D47).
escribir('colonias', col, lambda p: {'clave': p['CVEUT'], 'nombre': re.sub(r' {2,}', ' ', p['UT']).strip()})
print('capas generadas sin hallazgos')
