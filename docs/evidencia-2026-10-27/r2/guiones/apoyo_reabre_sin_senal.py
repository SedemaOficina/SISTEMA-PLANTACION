"""B6 · El cabo de apoyo recibe la jornada compartida con señal, como dicen las instrucciones («Cada cabo abre el
sistema con señal un momento: así le llega la jornada a su teléfono»), y después, YA SIN SEÑAL, la aplicación se
vuelve a abrir (se recarga, como cuando el teléfono la cierra o se reinicia). ¿Sigue la jornada en Nuevo registro?
Datos reales, copia de producción. La app se sirve con sw.js activo (para que abra sin red), en el puerto 8122.
Uso: python apoyo_reabre_sin_senal.py <chromium|webkit> <vuelta>"""
import json, os, subprocess, sys, time
from playwright.sync_api import sync_playwright
MOTOR, VUELTA = sys.argv[1], sys.argv[2]
RAIZ = os.path.join('C:' + os.sep, 'sia-rev', 'tmp', 'aud1027', 'r2'); SALIDA = os.path.join(RAIZ, 'evidencia', 'b6')
C = {c['correo'].split('@')[0].split('.')[1]: c for c in json.load(open(os.path.join(RAIZ, 'cuentas-r2.json'), encoding='utf-8'))}
BASE = 'http://127.0.0.1:8122/'
def ok(c, t, d=None): print(MOTOR, VUELTA, ('OK    ' if c else 'FALLA ') + t + (' · ' + json.dumps(d, ensure_ascii=False)[:500] if d is not None else ''), flush=True)
def entrar(pg, c):
    pg.goto(BASE); pg.wait_for_selector('html[data-listo]', state='attached', timeout=60000)
    pg.fill('#acceso-correo', c['correo']); pg.fill('#acceso-clave', c['clave']); pg.click('#form-acceso button[type="submit"]')
    pg.wait_for_function("() => !document.getElementById('navegacion').hidden", timeout=90000); pg.wait_for_function("() => SRP.remoto.listo()", timeout=240000); pg.wait_for_timeout(2000)
    pg.evaluate("() => document.querySelectorAll('dialog[open]').forEach(d => d.close())")
with sync_playwright() as p:
    b = getattr(p, MOTOR).launch()
    geo = {'geolocation': {'latitude': 19.4204, 'longitude': -99.1819, 'accuracy': 6}, 'permissions': ['geolocation']} if MOTOR == 'chromium' else {}
    # La Coordinación abre la compartida con el cabo 2, por la API de la página (lo mismo que el formulario)
    cc = b.new_context(viewport={'width': 1440, 'height': 900}, service_workers='block', **geo); pc = cc.new_page()
    entrar(pc, C['coord'])
    pc.evaluate("SRP.app.mostrarVista('registrar')")
    pc.wait_for_function("() => !document.getElementById('panel-iniciar-jornada').hidden || !document.getElementById('franja-jornada').hidden", timeout=30000)
    pc.evaluate("() => document.querySelectorAll('dialog[open]').forEach(d => d.close())")
    if pc.is_hidden('#panel-iniciar-jornada'):
        pc.click('#btn-jornada-cambiar'); pc.wait_for_timeout(300); pc.click('#btn-cambiar-nueva'); pc.wait_for_timeout(500)
    pc.fill('#ini-nombre', 'Reabre r2 %s %s' % (MOTOR, VUELTA)); pc.select_option('#ini-programa', 'p-refor'); pc.fill('#ini-meta', '10'); pc.click('#btn-ini-hoy')
    if MOTOR == 'chromium':
        pc.click('#btn-ini-detectar'); pc.wait_for_timeout(1500)
    else:
        pc.evaluate("document.getElementById('ini-detalles-coord').open = true"); pc.fill('#ini-coord-lat', '19.4204'); pc.fill('#ini-coord-lng', '99.1819'); pc.click('#btn-ini-coord-aplicar'); pc.wait_for_timeout(900)
    pc.click('#ini-quien .chip[data-quien="varios"]'); pc.wait_for_timeout(300); pc.click('#ini-apoyos .chip[data-id="%s"]' % C['cabo2']['id'])
    pc.click('#btn-iniciar-jornada'); pc.wait_for_selector('#franja-jornada', state='visible', timeout=30000); pc.wait_for_timeout(1500)
    jid = pc.evaluate("SRP.activa.jornada && SRP.activa.jornada.id")
    try: pc.wait_for_function("() => SRP.cola.ops.filter(o => !o.rechazo).length === 0 && !SRP.envio.enviando", timeout=60000)
    except Exception: print('cola de la Coordinación:', pc.evaluate("() => SRP.cola.ops.map(o => [o.tipo, o.enviado, o.rechazo && o.rechazo.codigo])"))
    cc.close()
    # El cabo 2: con señal, le llega
    ctx = b.new_context(viewport={'width': 390, 'height': 844}, service_workers='allow', **geo); pg = ctx.new_page(); err = []
    pg.on('pageerror', lambda e: err.append(str(e)[:200]))
    entrar(pg, C['cabo2'])
    try: pg.wait_for_function("async () => !!navigator.serviceWorker.controller && (await caches.keys()).length > 0", timeout=120000)
    except Exception: pass
    pg.evaluate("SRP.app.mostrarVista('registrar')"); pg.wait_for_timeout(2000); pg.evaluate("() => document.querySelectorAll('dialog[open]').forEach(d => d.close())")
    pg.evaluate("async id => { const j = await SRP.almacen.uno('jornadas', id); if (j) { SRP.activa.jornada = j; await SRP.activa.preparar(); } }", jid); pg.wait_for_timeout(1000)
    con = pg.evaluate("() => ({ activa: SRP.activa.jornada && SRP.activa.jornada.id, franja: !document.getElementById('franja-jornada').hidden })")
    ok(con['activa'] == jid and con['franja'], 'con señal, la compartida le llega al cabo de apoyo y está en Nuevo registro', con)
    # Sin señal, la aplicación se vuelve a abrir
    ctx.set_offline(True); pg.wait_for_timeout(500)
    pg.reload(); pg.wait_for_selector('html[data-listo]', state='attached', timeout=60000); pg.wait_for_timeout(4000)
    pg.evaluate("() => document.querySelectorAll('dialog[open]').forEach(d => d.close())")
    pg.evaluate("SRP.app.mostrarVista('registrar')"); pg.wait_for_timeout(2000)
    sin = pg.evaluate("""() => ({ sesion: !!SRP.sesion.usuario, activa: SRP.activa.jornada && SRP.activa.jornada.id, panelIniciar: !document.getElementById('panel-iniciar-jornada').hidden,
      franja: !document.getElementById('franja-jornada').hidden, remoto: SRP.remoto.estado, avisos: [...document.querySelectorAll('.franja-aviso:not([hidden]), #aviso:not([hidden])')].map(e => e.innerText.slice(0, 160)),
      titulo: (document.querySelector('#panel-iniciar-jornada h2, #panel-iniciar-jornada .nota') || {}).textContent })""")
    pg.screenshot(path=os.path.join(SALIDA, 'apoyo-reabre-sin-senal-%s-%s.png' % (MOTOR, VUELTA)))
    ok(sin['activa'] == jid, 'sin señal, tras volver a abrir la aplicación, la compartida sigue en Nuevo registro', sin)
    ctx.close(); b.close()
