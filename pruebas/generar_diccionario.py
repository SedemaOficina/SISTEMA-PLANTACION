"""Genera DICCIONARIO-DATOS.md a partir de esquema.json (D86).

esquema.json es la fuente única del modelo de datos: tablas, campos, dominios, relaciones,
derivaciones, campos efímeros y reglas. Este script sólo lo pone en prosa y tablas legibles;
no se edita el .md a mano. pruebas/auditoria.py comprueba que el esquema coincide con lo que el
sistema guarda y que el .md está regenerado.

Uso:  python3 pruebas/generar_diccionario.py           escribe DICCIONARIO-DATOS.md
      python3 pruebas/generar_diccionario.py --texto   imprime el resultado sin escribir
"""
import json, os, sys

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ESQUEMA = os.path.join(RAIZ, 'esquema.json')
SALIDA = os.path.join(RAIZ, 'DICCIONARIO-DATOS.md')

def celda(t):
    return str(t).replace('|', '\\|').replace('\n', ' ') if t not in (None, '') else '—'

def tabla_md(cabeceras, filas):
    out = ['| ' + ' | '.join(cabeceras) + ' |', '|' + '---|' * len(cabeceras)]
    out += ['| ' + ' | '.join(celda(c) for c in f) + ' |' for f in filas]
    return '\n'.join(out)

def generar(d):
    L = []
    p = L.append
    p('# Diccionario de datos e inventario de tablas')
    p('')
    p('**Generado de `esquema.json` por `pruebas/generar_diccionario.py`: no se edita a mano.** '
      'Versión del esquema: %s. %s.' % (d['version_esquema'], d['etapa']))
    p('')
    p('Qué guarda el sistema, tabla por tabla: cada campo con su tipo, si admite nulo, de dónde sale, '
      'qué valores admite y qué regla lo gobierna; qué se deriva sin verse en pantalla; qué se calcula '
      'y no se guarda; qué vive sólo en memoria mientras se captura; cómo se relacionan las tablas; y qué '
      'reglas aplican hoy en el dispositivo y cuáles esperan al servidor. `pruebas/auditoria.py` compara '
      'este esquema contra lo que el sistema guarda de verdad y contra los dominios del código, y avisa '
      'si algo sobra, falta o no está regenerado. `MAPEO-CAMPOS.md` sigue siendo la vista por pantalla '
      '(etiqueta ↔ campo, con la explicación larga de cada decisión); este documento es la vista por tabla, '
      'pensada para construir la base y la API de la Fase 2 sin volver a leer el código.')
    p('')
    p('## 1. Dónde viven los datos')
    p('')
    p('- **Motor:** %s.' % d['almacenamiento']['motor'])
    p('- **Tablas (almacenes):** ' + ', '.join('`%s`' % t for t in d['almacenamiento']['tablas']) + '.')
    p('')
    p(tabla_md(['Dónde', 'Qué guarda', 'En Fase 2'],
               [(o['donde'], o['que'], o['fase2']) for o in d['almacenamiento']['otros']]))
    p('')
    p('## 2. Cómo leer la columna «Origen»')
    p('')
    p(tabla_md(['Origen', 'Qué significa'], [(k, v) for k, v in d['origenes'].items()]))
    p('')
    p('## 3. Dominios (valores válidos y de dónde salen)')
    p('')
    filas = []
    for k, v in d['dominios'].items():
        vals = ' · '.join('`%s`' % x for x in v['valores']) if isinstance(v['valores'], list) else v['valores']
        filas.append(('`%s`' % k, vals, v['fuente']))
    p(tabla_md(['Dominio', 'Valores', 'Fuente'], filas))
    p('')
    p('## 4. Tablas')
    p('')
    for nombre, t in d['tablas'].items():
        p('### 4.%d `%s`' % (list(d['tablas']).index(nombre) + 1, nombre))
        p('')
        p(t['que_es'])
        p('')
        p('- **Llave:** `%s`. **Índices:** %s. **Pantalla:** %s.' % (
            t['llave'], ', '.join('`%s`' % i for i in t['indices']) or 'ninguno', t['pantalla']))
        p('- **Campos:** %d.' % len(t['campos']))
        p('')
        filas = []
        for c in t['campos']:
            dom = c['dominio']
            if dom in d['dominios']: dom = 'dominio `%s`' % dom
            filas.append(('`%s`' % c['campo'] + (' *(sólo %s)*' % c['solo_tipo'] if c.get('solo_tipo') else ''),
                          c['tipo'], 'Sí' if c['nulo'] else 'No', c['origen'], dom, c['pantalla'], c['regla']))
        p(tabla_md(['Campo', 'Tipo', 'Nulo', 'Origen', 'Dominio / formato', 'Se ve en pantalla', 'Regla'], filas))
        p('')
    p('## 5. Relaciones entre tablas')
    p('')
    p(tabla_md(['De', 'A', 'Cardinalidad', 'Regla'],
               [(r['de'], r['a'], r['cardinalidad'], r['regla']) for r in d['relaciones']]))
    p('')
    p('## 6. Campos que se derivan sin capturarse')
    p('')
    p('Se guardan en la tabla, pero nadie los teclea: salen de otro dato o de la sesión.')
    p('')
    p(tabla_md(['Campo', 'Se deriva de', 'Cuándo', 'Se ve como'],
               [(x['campo'], x['de'], x['cuando'], x['ver']) for x in d['derivados']]))
    p('')
    p('## 7. Lo que se calcula y no se guarda')
    p('')
    p(tabla_md(['Qué', 'A partir de', 'Dónde se usa'],
               [(x['que'], x['de'], x['donde']) for x in d['calculados_no_guardados']]))
    p('')
    p('## 8. Estado efímero (vive sólo en memoria mientras se usa la pantalla)')
    p('')
    p('Nada de esto llega a la base tal cual; es lo que el formulario necesita mientras se captura y '
      'desaparece con la acción que se indica.')
    p('')
    p(tabla_md(['Dónde', 'Qué es', 'Cuándo desaparece'],
               [(x['nombre'], x['que'], x['desaparece']) for x in d['efimeros']]))
    p('')
    p('## 9. Campos condicionales (aparecen o se vacían según otro dato)')
    p('')
    p(tabla_md(['Campo', 'Aparece', 'Se vacía'],
               [(x['campo'], x['aparece'], x['se_vacia']) for x in d['campos_condicionales']]))
    p('')
    p('## 10. Reglas y validaciones vigentes (Fase 1, en el dispositivo)')
    p('')
    p(tabla_md(['Id', 'Tabla', 'Regla', 'Dónde vive'],
               [(r['id'], r['tabla'], r['regla'], r['donde']) for r in d['reglas_fase1']]))
    p('')
    p('## 11. Reglas que esperan al servidor (Fase 2)')
    p('')
    p(tabla_md(['Id', 'Qué', 'Detalle', 'Referencia'],
               [(r['id'], r['que'], r['detalle'], r['referencia']) for r in d['reglas_fase2']]))
    p('')
    p('## 12. Capas y catálogos externos que alimentan campos')
    p('')
    p(tabla_md(['Capa', 'Archivo', 'Versión', 'Alimenta', 'Estado'],
               [(c['capa'], c['archivo'], c['version'], c['alimenta'], c['estado']) for c in d['capas']]))
    p('')
    p('## 13. Borrador de tablas para la Fase 2 (PostgreSQL)')
    p('')
    p('Traducción directa del esquema, para no rediseñarlo desde cero. Los tipos son los de la columna '
      '«Tipo»; las llaves foráneas, las de la sección 5. Las cinco tablas se crean tal cual y se agregan '
      'las dos columnas de la cola de envío (S-01) y la tabla de secuencias del folio (S-02) cuando toque.')
    p('')
    p('```sql')
    for nombre, t in d['tablas'].items():
        p('CREATE TABLE %s (' % nombre)
        cols = []
        for c in t['campos']:
            cols.append('  %-24s %-14s %s' % (c['campo'], c['tipo'], 'NULL' if c['nulo'] else 'NOT NULL'))
        cols.append('  PRIMARY KEY (%s)' % t['llave'])
        p(',\n'.join(cols))
        p(');')
        for i in t['indices']:
            p('CREATE INDEX %s_%s ON %s (%s);' % (nombre, i, nombre, i))
        p('')
    p('```')
    p('')
    return '\n'.join(L) + '\n'

def main():
    d = json.load(open(ESQUEMA, encoding='utf-8'))
    texto = generar(d)
    if '--texto' in sys.argv:
        sys.stdout.write(texto); return
    with open(SALIDA, 'w', encoding='utf-8') as s: s.write(texto)
    n = sum(len(t['campos']) for t in d['tablas'].values())
    print('%s: %d tablas, %d campos, %d reglas de Fase 1, %d de Fase 2' % (
        os.path.relpath(SALIDA, RAIZ), len(d['tablas']), n, len(d['reglas_fase1']), len(d['reglas_fase2'])))

if __name__ == '__main__':
    main()
