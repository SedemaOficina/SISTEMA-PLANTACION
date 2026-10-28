"""Une los JSON del barrido de cada perfil (b1-<modo>/<PERFIL>/barrido-<modo>.json) y resume por categoría.
Uso: python resumen_r2.py <carpeta b1-modo> <modo>"""
import json, sys, os, collections
raiz, modo = sys.argv[1], sys.argv[2]
t = collections.Counter(); ej = collections.defaultdict(list)
def anota(k, x):
    t[k] += 1
    if len(ej[k]) < 12 and x not in ej[k]: ej[k].append(x)
corr = vistas = pres = nopres = muertos = 0
for P in ('ADMIN', 'DIRECTIVO', 'COORDINADOR', 'CABO'):
    r = json.load(open(os.path.join(raiz, P, 'barrido-%s.json' % modo), encoding='utf-8'))
    for c in r['corridas']:
        corr += 1; q = '%s/%s' % (c['perfil'], c['tamano'])
        if c.get('error'): anota('corrida con error', q + ': ' + c['error'][:150])
        for v, reg in c['vistas'].items():
            vistas += 1
            e = reg.get('estatico')
            if e:
                if e['desborde']: anota('desborde horizontal', '%s %s %s→%s %s' % (q, v, e['desborde']['visible'], e['desborde']['ancho'], e['desborde']['culpables'][:3]))
                for x in e['chicos']: anota('objetivo chico (<24 px)', '%s %s %s' % (q, v, x))
                for x in e['tapados']: anota('control tapado', '%s %s %s' % (q, v, x))
                for x in e['cortados']: anota('texto cortado', '%s %s %s' % (q, v, x))
            for a in reg.get('axe', []): anota('axe ' + a[0], '%s %s %s nodos · %s' % (q, v, a[2], a[3][:90]))
            for bt in reg.get('botones', []):
                if bt[2] in ('no se presiona', 'ya no está'): nopres += 1
                else: pres += 1
                if bt[2] == 'NO HACE NADA': muertos += 1; anota('botón que no hace nada', '%s %s «%s» #%s' % (q, v, bt[0], bt[1]))
                if bt[2] == 'ok' and len(bt) > 4 and bt[4]: anota('error de consola al presionar', '%s %s «%s» %s' % (q, v, bt[0], bt[4][:1]))
                if len(bt) > 3 and isinstance(bt[3], dict) and bt[3].get('error_clic'): anota('no se pudo presionar', '%s %s «%s» %s' % (q, v, bt[0], bt[3]['error_clic'][:90]))
        for d, x in (c.get('ventanas') or {}).items():
            for a in x.get('axe', []): anota('axe en ventana ' + a[0], '%s %s %s' % (q, d, a[3][:70]))
            e = x.get('estatico') or {}
            for k in ('chicos',):
                for y in e.get(k, []): anota('ventana: objetivo chico', '%s %s %s' % (q, d, y))
        ev = c.get('eventos', {})
        for x in ev.get('consola', []): anota('error de consola', q + ' ' + x[:150])
        for x in ev.get('pagina', []): anota('error de página', q + ' ' + x[:150])
        for x in ev.get('fallidos', []): anota('petición fallida', q + ' ' + x[:150])
        for x in ev.get('csp', []): anota('violación de CSP', q + ' ' + x[:150])
        for h, n in ev.get('externos', {}).items(): anota('dominio externo ' + h, '%s %d' % (q, n))
print('%s: corridas %d · pantallas revisadas %d · botones presionados %d (sin hacer nada: %d) · no presionados a propósito %d' % (modo, corr, vistas, pres, muertos, nopres))
for k, n in sorted(t.items(), key=lambda x: -x[1]):
    print('\n%d · %s' % (n, k))
    for e in ej[k]: print('     ', e)
