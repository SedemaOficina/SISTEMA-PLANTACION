"""D2 · El diccionario de datos (datos/esquema.json) contra la base local (esquema srp): tablas, campos, orden, tipo y
nulos; y las restricciones e índices de los 12 campos de la calle y de jornadas.cabos_apoyo. Lee como srp_api.
Uso: python evidencia/d2/diccionario_contra_base.py"""
import json, os, subprocess, csv, io
PSQL = r'C:\Program Files\PostgreSQL\17\bin\psql.exe'
RAIZ = r'C:\sia-rev\tmp\aud1027\r1'
def q(sql):
    out = subprocess.run([PSQL, '-w', '-h', 'localhost', '-U', 'srp_local_admin', '-d', 'srp_local', '-q'], input='SET ROLE srp_api;\nCOPY (' + sql + ') TO STDOUT WITH CSV;\n',
                         capture_output=True, text=True, encoding='utf-8', env=dict(os.environ, PGCLIENTENCODING='UTF8'))
    if out.stderr.strip(): print('ERROR psql:', out.stderr.strip()[:300])
    return list(csv.reader(io.StringIO(out.stdout)))
def tipo_pg(t):
    lista = t.endswith('[]'); base = t[:-2] if lista else t
    if t == 'objeto[]': return 'jsonb'
    import re; m = re.match(r'^(\w+)(\(.+\))?$', base)
    n = {'varchar': 'character varying', 'char': 'character', 'timestamptz': 'timestamp with time zone'}.get(m.group(1), m.group(1))
    return n + (m.group(2) or '') + ('[]' if lista else '')
E = json.load(open(os.path.join(RAIZ, 'datos', 'esquema.json'), encoding='utf-8'))
cols = q("SELECT c.relname, a.attnum, a.attname, format_type(a.atttypid, a.atttypmod), a.attnotnull FROM pg_attribute a JOIN pg_class c ON c.oid = a.attrelid "
         "JOIN pg_namespace n ON n.oid = c.relnamespace WHERE n.nspname = 'srp' AND c.relkind = 'r' AND a.attnum > 0 AND NOT a.attisdropped ORDER BY 1, 2")
base = {}
for t, _, campo, tipo, nn in cols: base.setdefault(t, []).append((campo, tipo, nn == 't'))
dif = 0
for t, info in E['tablas'].items():
    b = base.get(t)
    if b is None: print('falta la tabla', t); dif += 1; continue
    esp = [(c['campo'], tipo_pg(c['tipo']), not c['nulo']) for c in info['campos']]
    if [x[0] for x in esp] != [x[0] for x in b]:
        print('%s: campos u orden distintos. Sólo en el esquema: %s · sólo en la base: %s' % (t, sorted({x[0] for x in esp} - {x[0] for x in b}), sorted({x[0] for x in b} - {x[0] for x in esp}))); dif += 1
    bd = {x[0]: x for x in b}
    for c, ti, nn in esp:
        if c in bd and (bd[c][1] != ti or bd[c][2] != nn): print('%s.%s: esquema %s %s · base %s %s' % (t, c, ti, 'NOT NULL' if nn else 'NULL', bd[c][1], 'NOT NULL' if bd[c][2] else 'NULL')); dif += 1
print('tablas del esquema: %d · campos: %d · diferencias: %d' % (len(E['tablas']), sum(len(i['campos']) for i in E['tablas'].values()), dif))
print('tablas propias del servidor (no están en el esquema):', sorted(set(base) - set(E['tablas'])))
CALLE = ['calle_estado', 'calle_clave', 'calle_version', 'calle', 'calle_entre_1', 'calle_entre_2', 'calle_esquina', 'vialidad_red', 'vialidad_tipo', 'calle_atiende', 'calle_llave', 'calle_distancia_m']
print('\nRestricciones CHECK de plantaciones que nombran un campo de la calle:')
for n, d in q("SELECT conname, pg_get_constraintdef(oid) FROM pg_constraint WHERE conrelid = 'srp.plantaciones'::regclass AND contype = 'c' ORDER BY 1"):
    if any(c in d for c in CALLE): print('  ', n, d)
print('Índices de plantaciones que nombran un campo de la calle:', [i for (i,) in q("SELECT indexdef FROM pg_indexes WHERE schemaname = 'srp' AND tablename = 'plantaciones'") if any(c in i for c in CALLE)] or 'ninguno')
print('Restricciones de jornadas sobre cabos_apoyo:', [r for r in q("SELECT conname, pg_get_constraintdef(oid) FROM pg_constraint WHERE conrelid = 'srp.jornadas'::regclass") if 'cabos_apoyo' in r[1]])
print('Índices de jornadas sobre cabos_apoyo:', [i for (i,) in q("SELECT indexdef FROM pg_indexes WHERE schemaname = 'srp' AND tablename = 'jornadas'") if 'cabos_apoyo' in i] or 'ninguno')
print('Disparadores de plantaciones:', [r[0] for r in q("SELECT tgname FROM pg_trigger WHERE tgrelid = 'srp.plantaciones'::regclass AND NOT tgisinternal ORDER BY 1")])
# Coherencia de lo guardado
print('\nCoherencia de los campos de la calle en la base:')
for r in q("""SELECT count(*) FILTER (WHERE calle_estado IS NULL), count(*) FILTER (WHERE calle_estado = 'ok'), count(*) FILTER (WHERE calle_estado = 'lejos'),
  count(*) FILTER (WHERE calle_estado = 'ok' AND (calle IS NULL OR calle_clave IS NULL OR vialidad_red IS NULL OR calle_atiende IS NULL OR calle_distancia_m IS NULL)),
  count(*) FILTER (WHERE calle_estado = 'ok' AND calle_distancia_m NOT BETWEEN 0 AND 40),
  count(*) FILTER (WHERE calle_estado IS DISTINCT FROM 'ok' AND num_nonnulls(calle_clave, calle, calle_entre_1, calle_entre_2, calle_esquina, vialidad_red, vialidad_tipo, calle_atiende, calle_llave, calle_distancia_m) > 0),
  count(*) FILTER (WHERE vialidad_red = 'primaria' AND vialidad_tipo IS NULL), count(*) FILTER (WHERE vialidad_red <> 'primaria' AND vialidad_tipo IS NOT NULL),
  count(*) FILTER (WHERE lat IS NOT NULL AND calle_estado IS NULL) FROM srp.plantaciones"""):
    print('  sin calcular %s · ok %s · lejos %s · ok con campos vacíos %s · ok fuera de 0-40 m %s · no-ok con campos llenos %s · primaria sin tipo %s · no primaria con tipo %s · con punto y sin calcular %s' % tuple(r))
print('\nJornadas compartidas en la base:')
for r in q("""SELECT count(*) FILTER (WHERE jsonb_array_length(cabos_apoyo) > 0), count(*) FROM srp.jornadas"""): print('  compartidas %s de %s' % tuple(r))
for r in q("""SELECT count(*) FILTER (WHERE u.id IS NULL), count(*) FILTER (WHERE u.perfil <> 'CABO'), count(*) FILTER (WHERE u.organizacion_id <> j.organizacion_id),
  count(*) FILTER (WHERE (a->>'fin') IS NOT NULL AND a->>'fin' NOT IN ('terminado', 'quitado')), count(*) FILTER (WHERE (a->>'hasta') IS NULL AND (a->>'fin') IS NOT NULL),
  count(*) FILTER (WHERE p.id IS NULL), count(*) FILTER (WHERE t.perfil <> 'COORDINADOR'), count(*)
  FROM srp.jornadas j CROSS JOIN LATERAL jsonb_array_elements(j.cabos_apoyo) a LEFT JOIN srp.usuarios u ON u.id::text = a->>'cabo_id'
  LEFT JOIN srp.usuarios p ON p.id::text = a->>'por_id' JOIN srp.usuarios t ON t.id = j.cabo_id"""):
    print('  cabos de apoyo: %s sin cuenta · %s no son cabo · %s de otra institución · %s con «fin» fuera de la lista · %s vigentes con «fin» · %s con «por» inexistente · %s en jornadas de un titular que no es Coordinación · de %s' % tuple(r))
