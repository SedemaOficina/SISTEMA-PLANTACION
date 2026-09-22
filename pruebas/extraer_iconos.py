"""Extrae iconos del set de iconografía del Manual de Identidad Gráfica CDMX 2024-2030 (D88).

Fuente: assets/fuentes/ICONOS_SET_CDMX_2024-2030.ai (Illustrator con compatibilidad PDF, una
página con 300 iconos). Cada icono es un trazado relleno; se agrupan por cercanía, se numeran por
renglón y columna (el número es el de la hoja índice) y los elegidos se normalizan a una caja de
24×24 con margen de 2, listos para pegar en js/iconos.js.

Uso:  python3 pruebas/extraer_iconos.py            imprime los trazados de SELECCION
      python3 pruebas/extraer_iconos.py --indice   además escribe pruebas/iconos_indice.svg
Requiere pdftocairo (poppler).
"""
import json, os, re, subprocess, sys, tempfile

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FUENTE = os.path.join(RAIZ, 'assets', 'fuentes', 'ICONOS_SET_CDMX_2024-2030.ai')

# nombre en js/iconos.js → número en la hoja índice
SELECCION = {
    # bloque 35 (D88)
    'basura': 1, 'cerrar': 31, 'ubicacion': 12, 'camara': 62, 'ver': 21,
    # bloque 36 (D89): acceso, cuenta, pestañas y acciones
    'correo': 53, 'candado': 63, 'entrar': 11, 'usuario': 261, 'mas': 32, 'registros': 183,
    'reportes': 50, 'catalogos': 48, 'usuarios': 270, 'ayuda': 24, 'buscar': 4, 'usuarioMas': 264, 'info': 22,
}

def trazados_del_set():
    with tempfile.TemporaryDirectory() as t:
        salida = os.path.join(t, 'set.svg')
        subprocess.run(['pdftocairo', '-svg', FUENTE, salida], check=True)
        svg = open(salida, encoding='utf-8').read()
    return re.findall(r'<path[^>]*\sd="([^"]+)"', svg)

def caja(d):
    nums = [float(x) for x in re.findall(r'-?\d+\.?\d*', d)]
    xs, ys = nums[0::2], nums[1::2]
    return min(xs), min(ys), max(xs), max(ys)

def agrupar(paths, margen=2.0):
    def cerca(a, b):
        return not (a[2] + margen < b[0] or b[2] + margen < a[0] or a[3] + margen < b[1] or b[3] + margen < a[1])
    grupos = []
    for d in paths:
        b = caja(d); destino = None
        for g in grupos:
            if g['items'] and cerca(g['b'], b):
                if destino is None:
                    g['items'].append(d); g['b'] = union(g['b'], b); destino = g
                else:
                    destino['items'] += g['items']; destino['b'] = union(destino['b'], g['b']); g['items'] = []
        if destino is None: grupos.append({'items': [d], 'b': b})
    grupos = [g for g in grupos if g['items']]
    grupos.sort(key=lambda g: (round((g['b'][1] + g['b'][3]) / 2 / 24), (g['b'][0] + g['b'][2]) / 2))
    return grupos

def union(a, b):
    return min(a[0], b[0]), min(a[1], b[1]), max(a[2], b[2]), max(a[3], b[3])

def normalizar(g, box=24, margen=2):
    x0, y0, x1, y1 = g['b']; w, h = x1 - x0, y1 - y0; s = (box - 2 * margen) / max(w, h)
    ox = (box - w * s) / 2 - x0 * s; oy = (box - h * s) / 2 - y0 * s
    def num(v): return ('%.2f' % v).rstrip('0').rstrip('.')
    out = []
    for d in g['items']:
        toks = re.findall(r'[MLCZ]|-?\d+\.?\d*', d); res = []; k = 0
        while k < len(toks):
            if toks[k] in 'MLCZ': res.append(toks[k]); k += 1
            else:
                res.append(num(float(toks[k]) * s + ox) + ' ' + num(float(toks[k + 1]) * s + oy)); k += 2
        out.append(' '.join(res))
    return ' '.join(out)

def main():
    grupos = agrupar(trazados_del_set())
    print('%d iconos en el set' % len(grupos), file=sys.stderr)
    for nombre, n in SELECCION.items():
        print("  %s: '<path fill=\"currentColor\" d=\"%s\"/>'," % (nombre, normalizar(grupos[n - 1])))
    if '--indice' in sys.argv:
        cols, cell = 25, 32
        filas = (len(grupos) + cols - 1) // cols
        out = ['<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 %d %d">' % (cols * cell, filas * cell)]
        for i, g in enumerate(grupos):
            x0, y0, x1, y1 = g['b']; s = 20 / max(x1 - x0, y1 - y0)
            cx, cy = (i % cols) * cell + 6, (i // cols) * cell + 2
            out.append('<g transform="translate(%f,%f) scale(%f) translate(%f,%f)">%s</g>' % (
                cx, cy, s, -x0, -y0, ''.join('<path fill="#555" d="%s"/>' % d for d in g['items'])))
            out.append('<text x="%f" y="%f" font-size="5" font-family="Arial" fill="#9D2148">%d</text>' % (cx, cy + 28, i + 1))
        out.append('</svg>')
        ruta = os.path.join(RAIZ, 'pruebas', 'iconos_indice.svg')
        open(ruta, 'w', encoding='utf-8').write('\n'.join(out))
        print('índice en', os.path.relpath(ruta, RAIZ), file=sys.stderr)

if __name__ == '__main__':
    main()
