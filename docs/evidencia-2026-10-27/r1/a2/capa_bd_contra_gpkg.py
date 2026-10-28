"""A2/D3 · La capa instalada en la base (territorio.calles) contra la fuente (calles_cdmx.gpkg del paquete 1.0.0), tramo
por tramo: claves, los 7 atributos que usa el SRP y una huella de la geometría (vértices, primer y último vértice,
largo en grados). Lee el gpkg en sólo lectura y la base con la cuenta del servicio (SET ROLE srp_api).
Uso: python evidencia/a2/capa_bd_contra_gpkg.py"""
import csv, io, os, sqlite3, subprocess, sys, collections
import shapely
GPKG = r'<carpeta del usuario>\OneDrive\Escritorio\SEDEMA\Sistema de Información Ambiental\Páginas web\calles-cdmx\salidas\entrega\calles-cdmx-1.0.0\datos\calles_cdmx.gpkg'
PSQL = r'C:\Program Files\PostgreSQL\17\bin\psql.exe'
ATR = ['nombre', 'entre_1', 'entre_2', 'red_vial', 'tipo_via', 'atiende', 'llave']
def wkb(b): return b[8 + (0, 32, 48, 48, 64)[(b[3] >> 1) & 7]:]
def huella(g):
    partes = list(g.geoms) if g.geom_type.startswith('Multi') else [g]
    c = [xy for p in partes for xy in p.coords]
    return (g.geom_type.replace('Multi', ''), len(partes), len(c), '%.7f' % c[0][0], '%.7f' % c[0][1], '%.7f' % c[-1][0], '%.7f' % c[-1][1], '%.9f' % g.length)
con = sqlite3.connect('file:' + GPKG + '?mode=ro&immutable=1', uri=True)
fuente = {}
tipos = collections.Counter()
for row in con.execute('SELECT clave, %s, geom FROM calles' % ', '.join(ATR)):
    g = shapely.from_wkb(wkb(row[-1])); tipos[g.geom_type] += 1
    fuente[row[0]] = (tuple(row[1:-1]), huella(g))
sql = ("SET ROLE srp_api; COPY (SELECT clave, %s, GeometryType(geom), 1, ST_NPoints(geom), to_char(ST_X(ST_StartPoint(geom)), 'FM990.0000000'), "
       "to_char(ST_Y(ST_StartPoint(geom)), 'FM990.0000000'), to_char(ST_X(ST_EndPoint(geom)), 'FM990.0000000'), to_char(ST_Y(ST_EndPoint(geom)), 'FM990.0000000'), "
       "to_char(ST_Length(geom), 'FM990.000000000') FROM territorio.calles) TO STDOUT WITH CSV" % ', '.join(ATR))
out = subprocess.run([PSQL, '-w', '-h', 'localhost', '-U', 'srp_local_admin', '-d', 'srp_local', '-q'], input=sql, capture_output=True, text=True, encoding='utf-8',
                     env=dict(os.environ, PGCLIENTENCODING='UTF8')).stdout
base = {}
for r in csv.reader(io.StringIO(out)):
    v = [x if x != '' else None for x in r]
    base[v[0]] = (tuple(v[1:8]), (v[8], int(v[9]), int(v[10]), v[11], v[12], v[13], v[14], v[15]))
print('gpkg: %d tramos (%s); base: %d tramos' % (len(fuente), dict(tipos), len(base)))
print('claves sólo en el gpkg: %d · sólo en la base: %d' % (len(fuente.keys() - base.keys()), len(base.keys() - fuente.keys())))
dif_atr = collections.Counter(); dif_geo = collections.Counter(); ej = []
for k in fuente.keys() & base.keys():
    (a1, h1), (a2, h2) = fuente[k], base[k]
    for n, x, y in zip(ATR, a1, a2):
        if (x or None) != (y or None): dif_atr[n] += 1; len(ej) < 8 and ej.append((k, n, x, y))
    for n, x, y in zip(['tipo', 'partes', 'vértices', 'x0', 'y0', 'x1', 'y1', 'largo'], h1, h2):
        if str(x).upper() != str(y).upper(): dif_geo[n] += 1; len(ej) < 16 and ej.append((k, n, x, y))
print('diferencias de atributos:', dict(dif_atr) or 'ninguna')
print('diferencias de geometría:', dict(dif_geo) or 'ninguna')
for e in ej: print('  ejemplo:', e)
