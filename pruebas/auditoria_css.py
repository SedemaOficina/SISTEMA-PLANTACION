"""Auditoría 360 de la hoja de estilos (css/estilos.css). Sólo lee: no cambia nada.

Revisa lo que la norma de la hoja pide y lo que la mantiene sana:
  A. Norma dura      colores fuera de :root, selectores #id, !important, selectores repetidos,
                     variables sin definir, propiedades repetidas en una regla, reglas vacías.
  B. Tokens          medidas sueltas donde hay token: espacios (margin, padding, gap), tamaño de
                     letra, radio, sombra; z-index, grosor de letra, transiciones y alturas de línea.
  C. Limpieza        variables que nadie usa, clases de la hoja que no aparecen en index.html ni en
                     js/, bloques de declaraciones idénticos, selectores largos o con etiqueta.
  D. Fuera de la hoja  style="" en index.html y en el HTML que arma el código; el.style.x en js/.

Uso:  python3 pruebas/auditoria_css.py            resumen
      python3 pruebas/auditoria_css.py --todo     con todos los casos
"""
import re, os, sys, glob, collections
APP = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TODO = '--todo' in sys.argv
fuente = open(APP + '/css/estilos.css', encoding='utf-8').read()
# Quita comentarios conservando los saltos, para dar el renglón
css = re.sub(r'/\*.*?\*/', lambda m: re.sub(r'[^\n]', ' ', m.group(0)), fuente, flags=re.S)

def reglas(texto, base=0, ctx=''):
    """(contexto, selector, cuerpo, renglón) de cada regla, entrando en @media y @supports."""
    i, n = 0, len(texto)
    while i < n:
        a = texto.find('{', i)
        if a < 0: break
        cab = texto[i:a].strip(); prof = 1; j = a + 1
        while j < n and prof:
            prof += texto[j] == '{'; prof -= texto[j] == '}'; j += 1
        cuerpo = texto[a + 1:j - 1]; linea = fuente.count('\n', 0, base + i + len(texto[i:a]) - len(texto[i:a].lstrip())) + 1
        if cab.startswith(('@media', '@supports')): yield from reglas(cuerpo, base + a + 1, cab)
        elif cab.startswith('@'): yield (ctx, cab, cuerpo, linea)
        else: yield (ctx, ' '.join(cab.split()), cuerpo, linea)
        i = j

R = [r for r in reglas(css)]
normales = [r for r in R if not r[1].startswith('@')]
def decls(cuerpo):
    return [(p.strip(), v.strip()) for p, _, v in (d.partition(':') for d in cuerpo.split(';')) if p.strip() and v.strip()]
esroot = lambda s: s.startswith(':root')
hallazgos = collections.OrderedDict()
def anota(clave, titulo, casos): hallazgos[clave] = (titulo, casos)

# ---------- A. Norma dura ----------
definidas = set(re.findall(r'(--[\w-]+)\s*:', css)); usadas = collections.Counter(re.findall(r'var\((--[\w-]+)', css))
for f in glob.glob(APP + '/js/*.js') + [APP + '/index.html']:
    t = open(f, encoding='utf-8').read()
    for v in definidas:
        # El código las lee por nombre, con o sin los guiones: c('pdf-gris'), setProperty('--subir-sobre')
        if v in t or re.search(r"['\"]" + re.escape(v[2:]) + r"['\"]", t): usadas[v] += 1
col = []; ids = []; imp = []; rep_prop = []; vacias = []
for ctx, sel, cuerpo, ln in normales:
    d = decls(cuerpo)
    if not d: vacias.append('%d  %s' % (ln, sel))
    if not esroot(sel):
        for p, v in d:
            for m in re.findall(r'#[0-9A-Fa-f]{3,8}\b|rgba?\([^)]*\)|hsla?\([^)]*\)|\b(?:white|black|red|gray|grey)\b', re.sub(r'url\([^)]*\)', '', v)):
                col.append('%d  %s { %s: %s }' % (ln, sel, p, v))
    for m in re.findall(r'#[a-zA-Z][\w-]*', sel): ids.append('%d  %s' % (ln, sel))
    for p, v in d:
        if '!important' in v and not ('prefers-reduced-motion' in ctx or '[hidden]' in sel): imp.append('%d  %s { %s: %s }' % (ln, sel, p, v))
    c = collections.Counter(p for p, _ in d)
    for p, k in c.items():
        if k > 1 and not p.startswith('--'): rep_prop.append('%d  %s: «%s» %d veces' % (ln, sel, p, k))
anota('A1', 'Colores escritos fuera de :root', col)
anota('A2', 'Selectores con #id', ids)
anota('A3', '!important fuera de reduced-motion y [hidden]', imp)
# Una regla (su lista completa de selectores) se declara una vez por consulta. Un selector puede estar
# además en un grupo que da lo común a varios («h1, h2 {…}» y luego «h1 {…}»), si el grupo va justo antes:
# lejos de su grupo, lo propio se pierde de vista
vistos = collections.defaultdict(list); grupos = collections.defaultdict(list)
for ctx, sel, cuerpo, ln in normales:
    if esroot(sel): continue
    partes = sorted(x.strip() for x in sel.split(','))
    vistos[(ctx, ', '.join(partes))].append(ln)
    if len(partes) > 1:
        for x in partes: grupos[(ctx, x)].append(ln)
a4 = ['%s  %s%s' % (', '.join(map(str, l)), s, '  [' + c + ']' if c else '') for (c, s), l in vistos.items() if len(l) > 1]
a4 += ['%d y %d  %s: lo propio, lejos de su grupo%s' % (g, vistos[(c, s)][0], s, '  [' + c + ']' if c else '') for (c, s), gs in grupos.items() if (c, s) in vistos for g in gs if abs(vistos[(c, s)][0] - g) > 12]
anota('A4', 'Regla declarada más de una vez en la misma consulta, o lo propio de un selector lejos de su grupo', a4)
puestas = set(re.findall(r"setProperty\(\s*'(--[\w-]+)'", ''.join(open(f, encoding='utf-8').read() for f in glob.glob(APP + '/js/*.js'))))
anota('A5', 'Variables usadas que no están definidas ni las pone el código', sorted(v for v in usadas if v not in definidas and v not in puestas))
anota('A6', 'Propiedad repetida dentro de una regla', rep_prop)
anota('A7', 'Reglas vacías', vacias)

# ---------- B. Tokens ----------
ESP = re.compile(r'^(margin|padding|gap|row-gap|column-gap|inset|top|right|bottom|left)(-|$)')
def sueltas(v):
    v = re.sub(r'var\([^)]*\)|calc\([^)]*\)|clamp\([^)]*\)|min\([^)]*\)|max\([^)]*\)|env\([^)]*\)', '', v)
    # Las medidas en em van con la letra del propio elemento: son relativas a propósito. Hasta 3 px es ajuste fino (filetes)
    return [x for x in re.findall(r'-?\d*\.?\d+(?:px|rem)\b', v) if not re.match(r'^-?0*(\.0+)?(px|rem)$', x) and x not in ('1px', '2px', '-1px', '-2px', '3px', '-3px')]
b = collections.defaultdict(list); cuenta = collections.defaultdict(collections.Counter)
for ctx, sel, cuerpo, ln in normales:
    if esroot(sel): continue
    for p, v in decls(cuerpo):
        caso = '%d  %s { %s: %s }' % (ln, sel, p, v)
        if ESP.match(p) and p not in ('top', 'right', 'bottom', 'left', 'inset') and sueltas(v): b['B1'].append(caso); [cuenta['B1'].update([x]) for x in sueltas(v)]
        if p == 'font-size' and 'var(--t-' not in v and v not in ('inherit', '100%') and not v.endswith('em') or p == 'font-size' and v.endswith('rem'): b['B2'].append(caso); cuenta['B2'].update([v])
        if p.endswith('radius') and 'var(' not in v and v not in ('0', '50%'): b['B3'].append(caso); cuenta['B3'].update([v])
        if p == 'box-shadow' and 'var(' not in v and v != 'none': b['B4'].append(caso)
        if p == 'z-index' and 'var(--z-' not in v: b['B5'].append(caso); cuenta['B5'].update([v])
        if p == 'font-weight': cuenta['B6'].update([v])
        if p in ('transition', 'animation') and re.search(r'\d(ms|s)\b', v): b['B7'].append(caso); [cuenta['B7'].update([x]) for x in re.findall(r'[\d.]+m?s\b', v)]
        if p == 'line-height': cuenta['B8'].update([v])
        if p in ('width', 'height', 'min-width', 'min-height', 'max-width', 'max-height') and sueltas(v): b['B9'].append(caso); [cuenta['B9'].update([x]) for x in sueltas(v)]
T = {'B1': 'Espacios (margin, padding, gap) con medida suelta en lugar de --e-*', 'B2': 'Tamaño de letra sin token --t-*', 'B3': 'Radio sin token --radio*',
     'B4': 'Sombra escrita fuera de :root', 'B5': 'z-index fuera de la escala de capas --z-*', 'B7': 'Transiciones y animaciones: duraciones sin token',
     'B9': 'Anchos y altos con medida suelta (controles, mapas, iconos)'}
for k in ('B1', 'B2', 'B3', 'B4', 'B5', 'B7', 'B9'): anota(k, T[k], b[k])

# ---------- C. Limpieza ----------
anota('C1', 'Variables definidas que nadie usa', sorted(v for v in definidas if not usadas[v]))
codigo = ''.join(open(f, encoding='utf-8').read() for f in glob.glob(APP + '/js/*.js') + [APP + '/index.html'])
palabras = set(re.findall(r'[A-Za-z_][\w-]*', codigo))
clases = collections.defaultdict(list)
for ctx, sel, cuerpo, ln in normales:
    for c in re.findall(r'\.([A-Za-z_][\w-]*)', re.sub(r'\[[^\]]*\]', '', sel)): clases[c].append(ln)
# Una clase armada por partes en el código («pri-nivel-» + n) cuenta si su prefijo aparece
prefijos = set(re.findall(r"['\"\s]([a-z][\w-]*-)['\"]\s*\+", codigo))
muertas = sorted(c for c in clases if c not in palabras and not any(c.startswith(p) for p in prefijos) and not c.startswith('leaflet'))
anota('C2', 'Clases de la hoja que no aparecen en index.html ni en js/ (posible código muerto)', ['%d  .%s' % (clases[c][0], c) for c in muertas])
cuerpos = collections.defaultdict(list)
for ctx, sel, cuerpo, ln in normales:
    if esroot(sel): continue
    d = tuple(sorted(decls(cuerpo)))
    if len(d) >= 3: cuerpos[(ctx, d)].append((ln, sel))
# Sólo los del mismo componente (a pocos renglones): unir los de componentes distintos los ataría sin razón
cerca = lambda l: any(abs(a[0] - b[0]) <= 25 for a in l for b in l if a is not b)
anota('C3', 'Bloques idénticos de tres o más declaraciones en el mismo componente (se unen)', ['  =  '.join('%d %s' % x for x in l) for l in cuerpos.values() if len(l) > 1 and cerca(l)])
anota('C3b', 'Para saber: bloques idénticos en componentes distintos (no se unen)', ['  =  '.join('%d %s' % x for x in l) for l in cuerpos.values() if len(l) > 1 and not cerca(l)])
largos = []; etiq = []
for ctx, sel, cuerpo, ln in normales:
    for s in [x.strip() for x in sel.split(',')]:
        partes = [x for x in re.split(r'\s+|\s*[>+~]\s*', s) if x]
        if len(partes) >= 4: largos.append('%d  %s' % (ln, s))
        if re.search(r'(^|\s)(div|span|p|ul|li|section|button|input|select|a|h[1-6]|label|table|td|th)\.[\w-]', s): etiq.append('%d  %s' % (ln, s))
anota('C4', 'Selectores de cuatro o más niveles (frágiles ante cambios de estructura)', largos)
anota('C5', 'Selectores que atan la clase a una etiqueta (div.x, button.x)', etiq)

# ---------- D. Fuera de la hoja ----------
html = re.sub(r'<!--.*?-->', lambda m: re.sub(r'[^\n]', ' ', m.group(0)), open(APP + '/index.html', encoding='utf-8').read(), flags=re.S)
anota('D1', 'style="" en index.html', ['%d  %s' % (html.count('\n', 0, m.start()) + 1, m.group(0)[:90]) for m in re.finditer(r'\sstyle="[^"]*"', html)])
d2 = []; d3 = collections.Counter(); d3c = []
for f in sorted(glob.glob(APP + '/js/*.js')):
    t = open(f, encoding='utf-8').read(); n = os.path.basename(f)
    for m in re.finditer(r'style=\\?["\'][^"\']*', t): d2.append('%s:%d  %s' % (n, t.count('\n', 0, m.start()) + 1, m.group(0)[:90]))
    for m in re.finditer(r'\.style\.(\w+)\s*=\s*([^;\n]{0,60})', t): d3[m.group(1)] += 1; d3c.append('%s:%d  .style.%s = %s' % (n, t.count('\n', 0, m.start()) + 1, m.group(1), m.group(2)))
anota('D2', 'style="" dentro del HTML que arma el código (la CSP lo bloquea)', d2)
anota('D3', 'el.style.x = … en js/ (permitido; conviene que sea sólo para valores calculados)', d3c)

# ---------- Informe ----------
print('AUDITORÍA DE LA HOJA DE ESTILOS · %d renglones · %d reglas · %d variables · %d clases' % (fuente.count('\n') + 1, len(normales), len(definidas), len(clases)))
for k, (titulo, casos) in hallazgos.items():
    print('\n%s  %s: %d' % (k, titulo, len(casos)))
    if k in cuenta: print('    valores: ' + ', '.join('%s ×%d' % x for x in cuenta[k].most_common(14)))
    if k == 'D3': print('    propiedades: ' + ', '.join('%s ×%d' % x for x in d3.most_common()))
    for c in (casos if TODO else casos[:6]): print('    ' + c[:170])
    if not TODO and len(casos) > 6: print('    … y %d más (--todo)' % (len(casos) - 6))
print('\nGrosor de letra en uso: ' + ', '.join('%s ×%d' % x for x in cuenta['B6'].most_common()))
print('Altura de línea en uso: ' + ', '.join('%s ×%d' % x for x in cuenta['B8'].most_common()))
# Lo que tiene que estar en cero; lo demás es para saber
DUROS = ['A1', 'A2', 'A3', 'A4', 'A5', 'A6', 'A7', 'B1', 'B2', 'B3', 'B4', 'B5', 'B7', 'C1', 'C2', 'C3', 'C5', 'D1', 'D2']
total = sum(len(hallazgos[k][1]) for k in DUROS)
print('\nNorma de la hoja: %d hallazgos' % total)
sys.exit(1 if total else 0)
