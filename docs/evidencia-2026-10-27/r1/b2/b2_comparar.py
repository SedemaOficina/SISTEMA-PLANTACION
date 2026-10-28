"""B2 · Compara lo capturado de la aplicación (app_real.json, los CSV y los PDF) con el recálculo en SQL (b2_sql_salida.txt
y consultas propias). Uso: python evidencia/b2/b2_comparar.py"""
import csv, json, os, re, subprocess, collections, io
from pypdf import PdfReader
EV = os.path.dirname(os.path.abspath(__file__))
PSQL = r'C:\Program Files\PostgreSQL\17\bin\psql.exe'
A = json.load(open(os.path.join(EV, 'app_real.json'), encoding='utf-8'))
def sql(q):
    r = subprocess.run([PSQL, '-w', '-h', 'localhost', '-U', 'srp_local_admin', '-d', 'srp_local', '-q', '-A', '-t', '-F', '\t'], input='SET ROLE srp_api;\n' + q,
                       capture_output=True, text=True, encoding='utf-8', env=dict(os.environ, PGCLIENTENCODING='UTF8'))
    return [l.split('\t') for l in r.stdout.strip().split('\n') if l]
BASE = ("FROM srp.plantaciones p JOIN srp.jornadas j ON j.id = p.jornada_id JOIN srp.usuarios u ON u.id = p.cabo_id WHERE p.estatus = 'activo' AND j.organizacion_id = 'o-sedema' "
        "AND u.organizacion_id = 'o-sedema' AND j.estatus <> 'abierta'")
FILTRO = {'todo': '', 'compartida_si': ' AND jsonb_array_length(j.cabos_apoyo) > 0', 'compartida_no': ' AND jsonb_array_length(j.cabos_apoyo) = 0'}
RED_CSV = {'primaria': 'Vialidad primaria', 'secundaria': 'Calle secundaria', 'carretera o camino': 'Carretera o camino'}
for k, f in FILTRO.items():
    a = A[k]; print('=== %s' % k)
    s_red = {r[0]: (int(r[1]), int(r[2])) for r in sql("SELECT vialidad_red, count(*), count(DISTINCT coalesce(calle_llave,'')||'|'||coalesce(p.alcaldia,'')) " + BASE + f + " AND calle_estado = 'ok' GROUP BY 1;")}
    s_at = {r[0]: int(r[1]) for r in sql("SELECT coalesce(calle_atiende,'Por confirmar'), count(*) " + BASE + f + " AND calle_estado = 'ok' GROUP BY 1;")}
    s_calles = {r[0]: int(r[1]) for r in sql("SELECT coalesce(calle_llave,'')||'|'||coalesce(p.alcaldia,''), count(*) " + BASE + f + " AND calle_estado = 'ok' GROUP BY 1;")}
    s_tot = sql("SELECT count(*), count(*) FILTER (WHERE calle_estado='lejos') " + BASE + f + ";")[0]
    print('árboles  app %s · sql %s · lejos app %s · sql %s' % (a['arboles'], s_tot[0], a['lejos'], s_tot[1]))
    for x in a['porRed']:
        suma_lista = sum(e['arboles'] for e in a['porCalle'] if e['red'] == x['red'])
        print('red %-11s árboles app %5d · sql %5d | calles app %4d · sql %4d (distintas con algún árbol en la red) | suma de las calles de su lista en la app %5d'
              % (x['red'], x['arboles'], s_red.get(x['red'], (0, 0))[0], x['calles'], s_red.get(x['red'], (0, 0))[1], suma_lista))
    print('quién atiende: iguales' if a['porAtiende'] == s_at else 'quién atiende: DISTINTO app %s sql %s' % (a['porAtiende'], s_at))
    app_calles = {e['clave']: e['arboles'] for e in a['porCalle']}
    print('por calle: %d en la app · %d en sql · árboles distintos en %d calles' % (len(app_calles), len(s_calles), sum(1 for c in s_calles if app_calles.get(c) != s_calles[c])))
    # CSV
    ruta = os.path.join(EV, 'app_%s.csv' % k)
    filas = list(csv.DictReader(io.StringIO(open(ruta, encoding='utf-8-sig').read())))
    red_csv = collections.Counter(r['Red vial'] for r in filas if r['Red vial'])
    at_csv = collections.Counter(r['Quién atiende la calle'] for r in filas if r['Quién atiende la calle'])
    ok_red = all(red_csv.get(RED_CSV[r], 0) == v[0] for r, v in s_red.items())
    print('CSV: %d renglones (sql %s) · red vial %s · quién atiende %s · «Sin calle a menos de 40 m» en la columna Calle: %d · columna compartida: %s'
          % (len(filas), s_tot[0], 'igual' if ok_red else 'DISTINTA %s' % dict(red_csv), 'igual' if dict(at_csv) == s_at else 'DISTINTO',
             sum(1 for r in filas if r['Calle'] == 'Sin calle a menos de 40 m'), dict(collections.Counter(r['Jornada compartida'] for r in filas))))
    # PDF
    ruta = os.path.join(EV, 'app_%s.pdf' % k)
    if os.path.exists(ruta):
        pdf = PdfReader(ruta); txt = '\n'.join(p.extract_text() or '' for p in pdf.pages)
        i = txt.find('POR RED VIAL'); bloque = txt[i:i + 700] if i >= 0 else '(sin «POR RED VIAL»)'
        print('PDF: %d páginas · metadatos %s' % (len(pdf.pages), {kk: str(vv)[:60] for kk, vv in (pdf.metadata or {}).items()}))
        print('PDF «Por red vial»:', ' '.join(bloque.split())[:600])
mixtas = sql("SELECT coalesce(calle_llave,'')||'|'||coalesce(p.alcaldia,''), string_agg(DISTINCT vialidad_red, ' + '), count(*) FILTER (WHERE vialidad_red='primaria'), count(*) FILTER (WHERE vialidad_red='secundaria') " + BASE + " AND calle_estado='ok' GROUP BY 1 HAVING count(DISTINCT vialidad_red) > 1;")
print('\nCalles (llave|alcaldía) con árboles en dos redes:'); [print('  ', m, '· en la app va en', next((e['red'] for e in A['todo']['porCalle'] if e['clave'] == m[0]), '?')) for m in mixtas]
