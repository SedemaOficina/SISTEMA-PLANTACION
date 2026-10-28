"""B6 · La calle por celdas sin señal (datos de prueba: el servidor simulado baja la celda de assets/calles/ al enviar).
  A. Sin señal (contexto sin red): el árbol se guarda; con señal se envía y recibe su calle.
  B. Señal mala: el teléfono cree tener red pero las celdas no llegan (se cortan las peticiones a assets/calles/):
     ¿el árbol se da por enviado sin calle? ¿cuándo la recibe? ¿qué dice el detalle mientras?
Dos vueltas. Uso: python calles_sin_senal.py <url> [chromium|webkit]"""
import json, sys
from playwright.sync_api import sync_playwright
BASE = sys.argv[1].rstrip('/') + '/'
MOTOR = sys.argv[2] if len(sys.argv) > 2 else 'chromium'
P = {'lat': 19.4204, 'lng': -99.1819}

def correr(b, vuelta):
    P['lat'], P['lng'] = 19.4204, -99.1819
    op = dict(viewport={'width': 390, 'height': 844}, timezone_id='America/Mexico_City', service_workers='block')
    if MOTOR == 'chromium': op.update(geolocation={'latitude': P['lat'], 'longitude': P['lng'], 'accuracy': 6}, permissions=['geolocation'])
    ctx = b.new_context(**op); pg = ctx.new_page(); err = []
    pg.on('pageerror', lambda e: err.append(str(e)[:200]))
    pg.goto(BASE); pg.wait_for_selector('html[data-listo]', state='attached', timeout=60000)
    pg.select_option('#sel-usuario-prueba', 'u-cabo-1'); pg.click('#btn-entrar-prueba'); pg.wait_for_function("() => SRP.sesion && SRP.sesion.usuario"); pg.wait_for_timeout(1500)
    pg.evaluate("() => document.querySelectorAll('dialog[open]').forEach(d => d.close())")
    def punto(inicio=False):
        pre = 'ini-' if inicio else ''
        if MOTOR == 'chromium': pg.click('#btn-ini-detectar' if inicio else '#btn-ubicacion'); pg.wait_for_timeout(1200)
        else:
            pg.evaluate("p => document.getElementById(p + 'detalles-coord').open = true", pre)
            pg.fill('#%scoord-lat' % pre, str(P['lat'])); pg.fill('#%scoord-lng' % pre, str(-P['lng'])); pg.click('#btn-%scoord-aplicar' % pre); pg.wait_for_timeout(800)
    pg.evaluate("SRP.app.mostrarVista('registrar')"); pg.wait_for_timeout(800)
    pg.fill('#ini-nombre', 'Calles r2'); pg.select_option('#ini-programa', 'p-refor'); pg.fill('#ini-meta', '5'); pg.click('#btn-ini-hoy'); punto(True)
    pg.click('#btn-iniciar-jornada'); pg.wait_for_selector('#franja-jornada', state='visible'); pg.wait_for_timeout(1500)
    pg.evaluate("() => document.querySelectorAll('dialog[open]').forEach(d => d.close())")
    def registrar():
        pg.evaluate("SRP.app.mostrarVista('registrar')"); pg.wait_for_timeout(600)
        punto(); pg.fill('#campo-especie', 'ahuehu'); pg.wait_for_timeout(300); pg.dispatch_event('.combo-opcion[data-id="ESP-0070"]', 'mousedown'); pg.wait_for_timeout(200)
        pg.click('#form-plantacion button[type=submit]'); pg.wait_for_timeout(900)
        for _ in range(3):
            if pg.is_visible('#dlg-confirmar'): pg.click('#btn-confirmar-si'); pg.wait_for_timeout(600)
            if pg.is_visible('#dlg-resumen'): pg.click('#btn-resumen-guardar'); pg.wait_for_timeout(900)
        return pg.evaluate("SRP.formulario.estado.ultimoGuardado")
    calle = lambda aid: pg.evaluate("async id => { const a = await SRP.almacen.uno('plantaciones', id); return a ? [a.calle_estado, a.calle] : null; }", aid)
    pend = lambda: pg.evaluate("() => SRP.envio.leer ? SRP.envio.leer().cambios.length : null")
    out = {}
    # A. sin red
    ctx.set_offline(True); pg.wait_for_timeout(500)
    a = registrar(); pg.wait_for_timeout(2500)
    out['A sin red: calle y pendientes'] = [calle(a), pend(), pg.inner_text('#conexion')]
    ctx.set_offline(False); pg.evaluate("() => window.dispatchEvent(new Event('online'))"); pg.wait_for_timeout(6000)
    out['A con red: calle y pendientes'] = [calle(a), pend(), pg.inner_text('#conexion')]
    # B. red que no trae las celdas: otra zona (celda distinta), con assets/calles/ cortado
    pg.route('**/assets/calles/**', lambda r: r.abort('internetdisconnected'))
    P['lat'], P['lng'] = 19.3000, -99.1000   # otra celda, aún no bajada
    if MOTOR == 'chromium': ctx.set_geolocation({'latitude': P['lat'], 'longitude': P['lng'], 'accuracy': 6})
    b2 = registrar(); pg.wait_for_timeout(6000)
    out['B celdas cortadas: calle, pendientes, píldora'] = [calle(b2), pend(), pg.inner_text('#conexion')]
    pg.evaluate("async id => { const r = await SRP.almacen.uno('plantaciones', id); await SRP.registros.verDetalle(r); }", b2); pg.wait_for_timeout(1200)
    out['B detalle: renglón de la calle'] = pg.evaluate("() => { const d = document.getElementById('dlg-detalle'); const t = d.innerText; const i = t.indexOf('Calle'); return i >= 0 ? t.slice(i, i + 120) : t.slice(0, 200); }")
    pg.screenshot(path='b6-calle-sin-celda-%s-%d.png' % (MOTOR, vuelta))
    pg.evaluate("() => document.querySelectorAll('dialog[open]').forEach(d => d.close())")
    pg.unroute('**/assets/calles/**')
    pg.wait_for_timeout(8000)
    out['B celdas de vuelta, sin otro envío: calle'] = calle(b2)
    pg.reload(); pg.wait_for_selector('html[data-listo]', state='attached'); pg.wait_for_timeout(5000)
    out['B tras recargar: calle'] = calle(b2)
    pg.evaluate("() => document.querySelectorAll('dialog[open]').forEach(d => d.close())")
    c3 = registrar(); pg.wait_for_timeout(6000)
    out['B tras otro árbol enviado: calle del anterior y del nuevo'] = [calle(b2), calle(c3)]
    out['errores'] = err[:3]
    ctx.close()
    return out

with sync_playwright() as p:
    b = getattr(p, MOTOR).launch()
    for v in (1, 2):
        for k, x in correr(b, v).items(): print(MOTOR, v, k, json.dumps(x, ensure_ascii=False)[:300], flush=True)
    b.close()
