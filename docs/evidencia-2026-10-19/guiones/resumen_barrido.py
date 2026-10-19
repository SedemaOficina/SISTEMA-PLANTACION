"""Resume el JSON del barrido: por pantalla, perfil y tamaño, lo que salió."""
import json, sys, collections
r = json.load(open(sys.argv[1], encoding='utf-8'))
t = collections.Counter(); ej = collections.defaultdict(list)
def anota(clave, texto):
    t[clave] += 1
    if len(ej[clave]) < 8 and texto not in ej[clave]: ej[clave].append(texto)
vistas = 0; botones = 0; corridas = 0
for c in r['corridas']:
    corridas += 1
    quien = '%s/%s' % (c['perfil'], c['tamano'])
    if c.get('error'): anota('corrida con error', quien + ': ' + c['error'][:120])
    for v, reg in c['vistas'].items():
        vistas += 1
        e = reg.get('estatico')
        if e:
            if e['desborde']: anota('desborde horizontal', '%s %s %s' % (quien, v, e['desborde']['culpables'][:3]))
            for x in e['chicos']: anota('objetivo chico (<24 px)', '%s %s %s' % (quien, v, x))
            for x in e['tapados']: anota('control tapado', '%s %s %s' % (quien, v, x))
            for x in e['cortados']: anota('texto cortado', '%s %s %s' % (quien, v, x))
        for a in reg.get('axe', []): anota('axe ' + a[0] + ' (' + str(a[1]) + ')', '%s %s %s nodos · %s' % (quien, v, a[2], a[3][:80]))
        for bt in reg.get('botones', []):
            botones += 1
            if bt[2] == 'NO HACE NADA': anota('botón que no hace nada', '%s %s «%s» %s' % (quien, v, bt[0], bt[1]))
            if bt[2] == 'ok' and len(bt) > 4 and bt[4]: anota('error de consola al presionar', '%s %s «%s» %s' % (quien, v, bt[0], bt[4][:1]))
            if len(bt) > 3 and isinstance(bt[3], dict) and bt[3].get('error_clic'): anota('no se pudo presionar', '%s %s «%s» %s' % (quien, v, bt[0], bt[3]['error_clic'][:80]))
    for d, x in (c.get('ventanas') or {}).items():
        for a in x.get('axe', []): anota('axe en ventana ' + a[0], '%s %s %s' % (quien, d, a[3][:60]))
    ev = c.get('eventos', {})
    for x in ev.get('consola', []): anota('error de consola', quien + ' ' + x[:140])
    for x in ev.get('pagina', []): anota('error de página', quien + ' ' + x[:140])
    for x in ev.get('fallidos', []): anota('petición fallida', quien + ' ' + x[:140])
    for x in ev.get('csp', []): anota('violación de CSP', quien + ' ' + x[:140])
    for h, n in ev.get('externos', {}).items(): anota('dominio externo ' + h, '%s %d peticiones' % (quien, n))
print('corridas %d · pantallas revisadas %d · botones presionados o revisados %d' % (corridas, vistas, botones))
for k, n in sorted(t.items(), key=lambda x: -x[1]):
    print('\n%d · %s' % (n, k))
    for e in ej[k]: print('     ', e)
