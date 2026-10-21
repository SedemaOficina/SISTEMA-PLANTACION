"""La prueba completa (pruebas/prueba.py) por tramos: cada tramo corre en su propio proceso, con su navegador
y un tiempo máximo, y uno que se detiene no detiene a los demás: se anota y sigue el siguiente.

Un tramo es una sección que abre su propia ventana («ctxNN = b.new_context(…)») con las que la siguen sin abrir
otra; el primero es el recorrido inicial, que comparte su ventana, con las secciones que también la usan. Al
final se suman las comprobaciones, las fallas y los tramos detenidos. Sale con 0 sólo si todo pasó.

Uso:  python pruebas/por_tramos.py [opciones]
  --lista            muestra los tramos y su renglón, sin correrlos
  --solo 3,7         sólo esos tramos (su número en la lista)
  --desde 40         del tramo 40 en adelante
  --a-la-vez 2       cuántos tramos corren al mismo tiempo (1 por omisión: el equipo ocupado da fallas de tiempo)
  --lento 4          el navegador corre como en un equipo 4 veces más lento (SRP_LENTO, sólo Chromium)
  --json ruta        guarda el resultado de cada tramo
Las variables de prueba.py (SRP_BASE, SRP_SALIDA, SRP_MOTOR, SRP_HOY) valen igual. Sólo usa la biblioteca estándar."""
import json, os, re, subprocess, sys, tempfile, time
from concurrent.futures import ThreadPoolExecutor

AQUI = os.path.dirname(os.path.abspath(__file__))
PRUEBA = os.path.join(AQUI, 'prueba.py')
ESPERA_TRAMO_S = int(os.environ.get('SRP_ESPERA_TRAMO_S', '1200'))
PIE = "\n    b.close()\nprint(chr(10).join(r for r in res if r.startswith('FALLA'))); print('fallas:', sum(r.startswith('FALLA') for r in res), 'de', len(res))\n"


def opcion(nombre, defecto=None):
    if nombre in sys.argv:
        i = sys.argv.index(nombre)
        return sys.argv[i + 1] if i + 1 < len(sys.argv) else defecto
    return defecto


def tramos():
    """[(número, renglón, nombre, texto del guion)] con la cabecera de prueba.py delante de cada tramo. Una
    sección que usa la ventana compartida (`pg`) va en el primer tramo, en su orden, aunque abra la suya."""
    L = open(PRUEBA, encoding='utf-8').read().split('\n')
    cab = [k for k, l in enumerate(L) if l.strip() == 'b.new_context = _contexto'][0] + 1
    inicios = [k for k, l in enumerate(L) if l.startswith('    # ---------- ')]
    fin = [k for k, l in enumerate(L) if l.strip() == 'b.close()' and k > inicios[-1]][0]
    secciones = [(a, inicios[i + 1] if i + 1 < len(inicios) else fin) for i, a in enumerate(inicios)]
    grupos = []
    for a, b in secciones:
        propio = re.search(r'\bctx\w*\s*=\s*(b\.new_context|contexto_llano)\(', '\n'.join(L[a:a + 12]))
        if propio or not grupos: grupos.append([(a, b)])
        else: grupos[-1].append((a, b))
    primero = [(cab, inicios[0])] + grupos[0]   # lo que abre la ventana compartida, y su recorrido
    resto = []
    for g in grupos[1:]:
        if re.search(r'(?<![\w.])pg\.', '\n'.join('\n'.join(L[a:b]) for a, b in g)): primero.extend(g)
        else: resto.append(g)
    salida = []
    for n, g in enumerate([primero] + resto, 1):
        nombre = L[g[1][0] if n == 1 else g[0][0]].strip().strip('#- ').strip()
        texto = '__file__ = ' + repr(PRUEBA) + '\n' + '\n'.join(L[:cab]) + '\n' + '\n'.join('\n'.join(L[a:b]) for a, b in g) + PIE
        # El renglón de prueba.py de cada renglón del guion del tramo (el primero es el de __file__)
        renglones = [0] + list(range(1, cab + 1)) + [k + 1 for a, b in g for k in range(a, b)]
        salida.append((n, (g[1][0] if n == 1 else g[0][0]) + 1, nombre, texto, renglones))
    return salida


def correr(tramo, carpeta, env):
    n, renglon, nombre, texto, renglones = tramo
    guion = os.path.join(carpeta, 'tramo_%02d.py' % n)
    open(guion, 'w', encoding='utf-8').write(texto)
    t0 = time.time()
    try:
        p = subprocess.run([sys.executable, guion], capture_output=True, text=True, timeout=ESPERA_TRAMO_S, env=env,
                           encoding='utf-8', errors='replace', cwd=os.path.dirname(AQUI))
        out = p.stdout + p.stderr
    except subprocess.TimeoutExpired:
        out = 'Se agotó el tiempo del tramo (%d s)' % ESPERA_TRAMO_S
    cuenta = re.findall(r'^fallas: (\d+) de (\d+)$', out, flags=re.M)
    # Cada falla se dice al ocurrir, con su renglón, y otra vez en el resumen del tramo: vale la primera, con
    # el renglón de prueba.py
    a_prueba = lambda m: '[renglón %d]' % renglones[int(m.group(1)) - 1] if int(m.group(1)) <= len(renglones) else m.group(0)
    fallas = [re.sub(r'\[renglón (\d+)\]$', a_prueba, x) for x in out.split('\n') if x.startswith('FALLA') and re.search(r'\[renglón \d+\]$', x)]
    detenido = ''
    if not cuenta:
        # Dónde se detuvo: el último renglón del guion del tramo que nombra el error, en prueba.py
        donde = [renglones[int(x) - 1] for x in re.findall(r'tramo_%02d\.py", line (\d+)' % n, out) if int(x) <= len(renglones)]
        detenido = (re.findall(r'^\w*(?:Error|Exception)[^\n]*', out, flags=re.M) or [out.strip().split('\n')[-1] if out.strip() else 'sin salida'])[-1][:300]
        if donde: detenido = '[renglón %d] %s' % (donde[-1], detenido)
    return {'tramo': n, 'renglon': renglon, 'nombre': nombre, 'segundos': round(time.time() - t0),
            'comprobaciones': int(cuenta[-1][1]) if cuenta else None, 'fallas': fallas, 'detenido': detenido,
            'final': out[-4000:] if detenido else ''}


def main():
    # Una consola de Windows sin UTF-8 escribe «?» en lo que no tiene, en vez de detenerse
    sys.stdout.reconfigure(errors='replace')
    lista = tramos()
    if '--lista' in sys.argv:
        for n, renglon, nombre, _, _ in lista: print('%3d  renglón %5d  %s' % (n, renglon, nombre[:90]))
        return 0
    solo = opcion('--solo'); desde = int(opcion('--desde', '1'))
    if solo: lista = [t for t in lista if t[0] in {int(x) for x in solo.split(',')}]
    lista = [t for t in lista if t[0] >= desde]
    env = dict(os.environ, PYTHONUTF8='1', PYTHONIOENCODING='utf-8')
    if opcion('--lento'): env['SRP_LENTO'] = opcion('--lento')
    a_la_vez = int(opcion('--a-la-vez', '1'))
    t0 = time.time()
    with tempfile.TemporaryDirectory(prefix='srp_tramos_') as carpeta, ThreadPoolExecutor(a_la_vez) as grupo:
        resultados = []
        for r in grupo.map(lambda t: correr(t, carpeta, env), lista):
            resultados.append(r)
            estado = ('DETENIDO: ' + r['detenido'][:90]) if r['detenido'] else '%d fallas de %d' % (len(r['fallas']), r['comprobaciones'])
            print('%3d  %-62s %4d s  %s' % (r['tramo'], r['nombre'][:62], r['segundos'], estado), flush=True)
            for f in r['fallas']: print('       ' + f[:200], flush=True)
    total = sum(r['comprobaciones'] or 0 for r in resultados)
    fallas = sum(len(r['fallas']) for r in resultados)
    detenidos = [r['tramo'] for r in resultados if r['detenido']]
    print('\ntramos: %d · comprobaciones: %d · fallas: %d · tramos detenidos: %d%s · %d min'
          % (len(resultados), total, fallas, len(detenidos), (' (%s)' % ', '.join(map(str, detenidos))) if detenidos else '', round((time.time() - t0) / 60)))
    if opcion('--json'):
        json.dump(resultados, open(opcion('--json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    return 0 if not fallas and not detenidos else 1


if __name__ == '__main__':
    sys.exit(main())
