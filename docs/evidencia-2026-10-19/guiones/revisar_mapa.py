"""¿Por qué revisar.py dice «el mapa mide 0 px»? Repite sus pasos en Nuevo registro y mira qué queda en pantalla."""
from playwright.sync_api import sync_playwright
URL = 'http://127.0.0.1:8099/'
with sync_playwright() as p:
    b = p.chromium.launch()
    for vuelta in (1, 2):
        ctx = b.new_context(viewport={'width': 390, 'height': 900}, geolocation={'latitude': 19.4326, 'longitude': -99.1332}, permissions=['geolocation'])
        pg = ctx.new_page()
        pg.goto(URL); pg.wait_for_selector('html[data-listo]')
        pg.select_option('#sel-usuario-prueba', 'u-cabo-1'); pg.click('#btn-entrar-prueba'); pg.wait_for_timeout(800)
        pg.evaluate("SRP.app.mostrarVista('registrar')"); pg.wait_for_timeout(600)
        antes = pg.evaluate("() => ({ panel: !document.getElementById('panel-iniciar-jornada').hidden, mapa: document.getElementById('mapa').getBoundingClientRect().height })")
        pg.fill('#ini-nombre', 'Jornada de revisión'); pg.select_option('#ini-programa', 'p-refor'); pg.fill('#ini-meta', '10')
        pg.click('#btn-ini-hoy'); pg.click('#btn-iniciar-jornada'); pg.wait_for_timeout(1000)
        despues = pg.evaluate("""() => ({ panel: !document.getElementById('panel-iniciar-jornada').hidden, jornada: !!(SRP.activa && SRP.activa.jornada),
            errores: document.getElementById('ini-errores') ? document.getElementById('ini-errores').textContent.trim().slice(0, 200) : null,
            mapa: document.getElementById('mapa').getBoundingClientRect().height,
            mapaVisible: !!document.getElementById('mapa').offsetParent,
            formulario: !document.getElementById('form-plantacion').closest('[hidden]') })""")
        print('vuelta', vuelta, 'antes', antes, 'después', despues)
        pg.screenshot(path=f'C:/sia-rev/tmp/revisar_mapa_{vuelta}.png')
        ctx.close()
    b.close()
