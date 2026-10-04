# HUELLA DE LAS CAPAS TERRITORIALES CON QUE TRABAJA EL SISTEMA.
#
# Sirve para comprobar que las capas de otra fuente —el esquema territorial del SIA— son las mismas:
# mismos polígonos, mismas claves, misma versión. De cada capa dice cuántos polígonos tiene, sus
# claves, la superficie total y la envolvente; de cada polígono, su superficie y su centroide.
# Con eso basta para detectar una capa distinta sin comparar vértice por vértice.
#
# Uso:  python3 herramientas/huella_capas.py                 escribe datos/HUELLA-CAPAS.md y .json
#       python3 herramientas/huella_capas.py otra.json       compara contra la huella de otra fuente
#
# La huella de la otra fuente es un JSON con la misma forma que datos/HUELLA-CAPAS.json:
#   { "alcaldias": { "poligonos": { "<clave>": { "area_ha": 0.0, "cx": 0.0, "cy": 0.0 } } }, ... }
# Las consultas para obtenerla en PostGIS están al final de datos/HUELLA-CAPAS.md.
import json, os, sys, math, hashlib

AQUI = os.path.dirname(os.path.abspath(__file__))
RAIZ = AQUI if os.path.exists(os.path.join(AQUI, 'assets')) else os.path.join(AQUI, '..')
CAPAS = {'alcaldias': 'cvegeo', 'colonias': 'clave', 'uga': 'clave'}
# Tolerancias: las capas del sistema van redondeadas a seis decimales (~11 cm)
TOL_AREA = 0.005      # 0.5 % de la superficie del polígono
TOL_CENTRO = 0.00005  # ~5 m


def leer(capa):
    t = open(os.path.join(RAIZ, 'assets', 'capas', 'capa-%s.js' % capa), encoding='utf-8').read()
    marca = 'SRP.CAPAS.%s = ' % capa
    return json.loads(t[t.index(marca) + len(marca):].rstrip().rstrip(';'))


def metros_por_grado(lat):
    # Longitud de un grado de longitud y de latitud en el elipsoide WGS84, a esa latitud
    f = math.radians(lat)
    return (111412.84 * math.cos(f) - 93.5 * math.cos(3 * f) + 0.118 * math.cos(5 * f),
            111132.92 - 559.82 * math.cos(2 * f) + 1.175 * math.cos(4 * f))


def anillo(a, lat0):
    # Superficie (m2, con signo) y momentos del anillo, en una proyección local a la latitud del polígono
    kx, ky = metros_por_grado(lat0)
    s = cx = cy = 0.0
    for (x1, y1), (x2, y2) in zip(a, a[1:]):
        f = (x1 * kx) * (y2 * ky) - (x2 * kx) * (y1 * ky)
        s += f; cx += (x1 + x2) * f; cy += (y1 + y2) * f
    return s / 2.0, cx, cy


def medir(geom):
    polis = geom['coordinates'] if geom['type'] == 'MultiPolygon' else [geom['coordinates']]
    lats = [p[1] for poli in polis for p in poli[0]]
    lat0 = (min(lats) + max(lats)) / 2.0
    area = mx = my = 0.0
    xs, ys, vertices = [], [], 0
    for poli in polis:
        for i, a in enumerate(poli):
            s, cx, cy = anillo(a, lat0)
            signo = 1 if i == 0 else -1          # los anillos interiores restan
            area += signo * abs(s); mx += signo * abs(s) * (cx / (6 * s) if s else 0); my += signo * abs(s) * (cy / (6 * s) if s else 0)
            vertices += len(a)
            if i == 0: xs += [p[0] for p in a]; ys += [p[1] for p in a]
    return {'area_ha': round(area / 10000.0, 2), 'cx': round(mx / area, 6), 'cy': round(my / area, 6), 'vertices': vertices,
            'caja': [min(xs), min(ys), max(xs), max(ys)]}


def huella():
    salida = {}
    for capa, campo in CAPAS.items():
        d = leer(capa)
        polis = {}
        for f in d['geojson']['features']:
            m = medir(f['geometry'])
            polis[str(f['properties'][campo])] = m
        cajas = [m.pop('caja') for m in polis.values()]
        claves = sorted(polis)
        salida[capa] = {
            'version': d['meta'].get('version'), 'campo_clave': campo, 'n': len(polis),
            'area_total_ha': round(sum(m['area_ha'] for m in polis.values()), 2),
            'envolvente': [round(min(c[0] for c in cajas), 6), round(min(c[1] for c in cajas), 6), round(max(c[2] for c in cajas), 6), round(max(c[3] for c in cajas), 6)],
            'sha256_claves': hashlib.sha256('\n'.join(claves).encode('utf-8')).hexdigest(),
            'poligonos': {k: polis[k] for k in claves},
        }
    return salida


SQL = '''-- Una consulta por capa. Sustituir <tabla>, <clave> y <geom> por los nombres reales del esquema territorial.
-- El resultado, guardado como JSON, se compara con: python3 herramientas/huella_capas.py resultado.json
SELECT json_object_agg(clave, json_build_object('area_ha', area_ha, 'cx', cx, 'cy', cy)) AS poligonos
FROM (
  SELECT <clave>::text AS clave,
         round((ST_Area(ST_Transform(<geom>, 4326)::geography) / 10000.0)::numeric, 2) AS area_ha,
         round(ST_X(ST_Centroid(ST_Transform(<geom>, 4326)))::numeric, 6) AS cx,
         round(ST_Y(ST_Centroid(ST_Transform(<geom>, 4326)))::numeric, 6) AS cy
  FROM <tabla>
) t;

-- Resumen rápido, para una primera mirada:
SELECT count(*) AS n, round((sum(ST_Area(ST_Transform(<geom>, 4326)::geography)) / 10000.0)::numeric, 2) AS area_total_ha,
       ST_SRID(<geom>) AS srid, ST_Extent(ST_Transform(<geom>, 4326)) AS envolvente
FROM <tabla> GROUP BY ST_SRID(<geom>);'''


def escribir(h):
    datos = os.path.join(RAIZ, 'datos')
    json.dump(h, open(os.path.join(datos, 'HUELLA-CAPAS.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1, sort_keys=True)
    L = ['# Huella de las capas territoriales', '',
         'Generado con `python3 herramientas/huella_capas.py`. No se edita a mano.', '',
         'Describe las capas con que el sistema deriva alcaldía, colonia y celda de cada árbol. Sirve para',
         'comprobar que las capas de otra fuente son las mismas antes de consumirlas: si la cuenta, las claves,',
         'la superficie o los centroides difieren, lo ya derivado puede cambiar de alcaldía, colonia o celda.', '',
         '| Capa | Versión | Campo clave | Polígonos | Superficie total (ha) | Envolvente (lon, lat) | Huella de las claves (SHA-256) |',
         '|---|---|---|---|---|---|---|']
    for capa, c in h.items():
        L.append('| %s | %s | `%s` | %d | %s | %s | `%s…` |' % (capa, c['version'], c['campo_clave'], c['n'], format(c['area_total_ha'], ',.2f'), ', '.join(str(x) for x in c['envolvente']), c['sha256_claves'][:16]))
    L += ['', 'El detalle por polígono —superficie y centroide— está en `datos/HUELLA-CAPAS.json`.',
          'La superficie se calcula en una proyección local a la latitud de cada polígono; contra PostGIS puede',
          'diferir en centésimas de punto porcentual, por eso la comparación tolera %.1f %% de superficie y ~5 m de centroide.' % (TOL_AREA * 100), '',
          '## Cómo se compara con otra fuente', '',
          '1. En la base de la otra fuente se corre la consulta de abajo, una vez por capa, y se guarda el resultado',
          '   en un archivo `{ "alcaldias": { "poligonos": {…} }, "colonias": {…}, "uga": {…} }`.',
          '2. `python3 herramientas/huella_capas.py ese_archivo.json` dice, por capa, qué claves faltan, cuáles sobran',
          '   y qué polígonos cambiaron de superficie o de lugar.', '', '```sql', SQL, '```', '']
    open(os.path.join(datos, 'HUELLA-CAPAS.md'), 'w', encoding='utf-8').write('\n'.join(L))


def comparar(h, otra):
    iguales = True
    for capa, c in h.items():
        o = (otra.get(capa) or {}).get('poligonos')
        if o is None: print('%-10s no viene en la otra fuente' % capa); iguales = False; continue
        mias, suyas = set(c['poligonos']), set(o)
        faltan, sobran = sorted(mias - suyas), sorted(suyas - mias)
        distintos = []
        for k in sorted(mias & suyas):
            a, b = c['poligonos'][k], o[k]
            da = abs(a['area_ha'] - float(b['area_ha'])) / max(a['area_ha'], 0.01)
            dc = math.hypot(a['cx'] - float(b['cx']), a['cy'] - float(b['cy']))
            if da > TOL_AREA or dc > TOL_CENTRO: distintos.append('%s (superficie %+.1f %%, centroide a %.0f m)' % (k, 100 * (float(b['area_ha']) - a['area_ha']) / max(a['area_ha'], 0.01), dc * 111000))
        bien = not faltan and not sobran and not distintos
        iguales = iguales and bien
        print('%-10s %s: aquí %d, allá %d' % (capa, 'IGUAL' if bien else 'DISTINTA', len(mias), len(suyas)))
        if faltan: print('   sólo aquí (%d): %s' % (len(faltan), ', '.join(faltan[:20]) + (' …' if len(faltan) > 20 else '')))
        if sobran: print('   sólo allá (%d): %s' % (len(sobran), ', '.join(sobran[:20]) + (' …' if len(sobran) > 20 else '')))
        if distintos: print('   cambiaron (%d): %s' % (len(distintos), '; '.join(distintos[:10]) + (' …' if len(distintos) > 10 else '')))
    return iguales


if __name__ == '__main__':
    h = huella()
    if len(sys.argv) > 1:
        sys.exit(0 if comparar(h, json.load(open(sys.argv[1], encoding='utf-8'))) else 1)
    escribir(h)
    for capa, c in h.items(): print('%-10s %s  %d polígonos  %s ha' % (capa, c['version'], c['n'], format(c['area_total_ha'], ',.2f')))
