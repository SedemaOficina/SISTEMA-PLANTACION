"""Corre una sola sección de pruebas/prueba.py: las utilidades y el arranque del navegador (renglones 1 a 150),
la sección que empieza en el renglón dado (hasta el siguiente «# ---------- ») y el resumen.
Uso: python seccion.py <prueba.py> <renglón de la sección> [veces]"""
import io, os, sys, time
ruta, inicio = sys.argv[1], int(sys.argv[2])
veces = int(sys.argv[3]) if len(sys.argv) > 3 else 1
L = io.open(ruta, encoding='utf-8').read().split('\n')
fin = next(i for i in range(inicio, len(L)) if L[i].startswith('    # ---------- '))
codigo = '\n'.join(L[:150] + L[inicio - 1:fin] + ['    b.close()', "print('\\n'.join(r for r in res if r.startswith('FALLA')))",
                                                   "print('fallas:', sum(r.startswith('FALLA') for r in res), 'de', len(res))"])
for n in range(veces):
    t = time.time()
    try:
        exec(compile(codigo, ruta, 'exec'), {'__file__': ruta, '__name__': '__main__'})
    except Exception as e:
        import traceback
        tb = [f for f in traceback.extract_tb(e.__traceback__) if f.filename == ruta]
        print('SE DETUVO:', type(e).__name__, str(e).split('\n')[0][:200], '| en:', (tb[-1].line or '')[:200] if tb else '?')
    print('corrida %d: %.0f s' % (n + 1, time.time() - t))
