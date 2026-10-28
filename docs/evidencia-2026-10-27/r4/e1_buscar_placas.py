"""Busca las placas reales de la base local (leídas por la entrada estándar, sólo en memoria) en carpetas de r4.
Dice cuántas aparecen y en qué archivo; nunca las escribe. Uso: psql ... | python -I e1_buscar_placas.py <carpeta>..."""
import os, re, sys, zipfile
norm = lambda s: re.sub(rb'[\s\-]', b'', s).upper()
placas = {norm(p.strip().encode()) for p in sys.stdin.read().splitlines() if len(p.strip()) >= 5}
total = 0
for raiz in sys.argv[1:]:
    for d, sub, fs in os.walk(raiz):
        sub[:] = [x for x in sub if x not in ('node_modules', '.git')]
        for f in fs:
            r = os.path.join(d, f)
            try: b = open(r, 'rb').read()
            except OSError: continue
            datos = [b]
            if f.endswith('.zip'):
                with zipfile.ZipFile(r) as z: datos = [z.read(n) for n in z.namelist()]
            n = sum(1 for x in datos for p in placas if p in norm(x))
            if n: print(r, n); total += n
print('placas cargadas:', len(placas), '· apariciones:', total)
