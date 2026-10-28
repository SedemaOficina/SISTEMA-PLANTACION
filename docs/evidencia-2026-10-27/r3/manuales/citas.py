"""Busca cada texto citado entre «» en los dos manuales dentro de index.html y js/*.js (letra por letra).
Uso: PYTHONUTF8=1 python -I citas.py <raiz de la copia>"""
import re, sys, glob, os, html
raiz = sys.argv[1]
fuentes = ''
for f in [os.path.join(raiz, 'index.html')] + sorted(glob.glob(os.path.join(raiz, 'js', '*.js'))):
    fuentes += open(f, encoding='utf-8').read() + '\n'
fuentes_norm = html.unescape(fuentes)
for man in ['manual-personal.html', 'manual-administracion.html']:
    ruta = os.path.join(raiz, 'docs', 'manual', man)
    lineas = open(ruta, encoding='utf-8').read().split('\n')
    print('=====', man)
    vistos = set()
    for n, l in enumerate(lineas, 1):
        txt = html.unescape(re.sub(r'<[^>]+>', '', l))
        for c in re.findall(r'«([^»]+)»', txt):
            c2 = c.rstrip('…').rstrip('.').strip()
            clave = c2
            if clave in vistos: continue
            vistos.add(clave)
            esta = c2 in fuentes_norm
            if not esta:
                # sin distinguir mayúsculas
                esta_ci = c2.lower() in fuentes_norm.lower()
                print('%s:%d  «%s»  %s' % (man, n, c, 'SÓLO SIN MAYÚSCULAS' if esta_ci else 'NO ESTÁ'))
