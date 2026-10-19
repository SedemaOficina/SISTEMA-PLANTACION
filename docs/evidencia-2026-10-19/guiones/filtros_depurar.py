"""Los pasos de la sección de filtros (renglón 4661 de prueba.py), con el estado de la pantalla en cada paso."""
import time
from playwright.sync_api import sync_playwright
with sync_playwright() as p:
    b = p.chromium.launch()
    for vuelta in (1, 2):
        ctx = b.new_context(viewport={'width': 390, 'height': 844}, timezone_id='America/Mexico_City')
        pg = ctx.new_page(); errores = []
        pg.on('pageerror', lambda e: errores.append(str(e)))
        pg.goto('http://127.0.0.1:8099/'); pg.wait_for_selector('html[data-listo]')
        pg.select_option('#sel-usuario-prueba', 'u-admin-1'); pg.click('#btn-entrar-prueba'); pg.wait_for_timeout(700)
        t = time.time()
        pg.evaluate("async () => { await SRP.demo.cargar(); }")
        carga = time.time() - t
        pg.evaluate("SRP.app.mostrarVista('registros')")
        for espera in (0.5, 1.5, 3, 6, 12):
            time.sleep(espera if espera == 0.5 else espera / 2)
            e = pg.evaluate("""() => ({ visibles: SRP.registros.filtrados ? SRP.registros.filtrados.length : null,
                periodo: [...document.querySelectorAll('#filtro-periodo [aria-pressed=true]')].map(x => x.dataset.rapido || x.textContent.trim()),
                resumen: document.querySelector('#filtro-mas-filtros summary').textContent.trim(),
                especies: document.querySelectorAll('#filtro-especie option').length,
                ocultos: ['filtro-especie','filtro-programa','filtro-alcaldia','filtro-org'].map(id => !!document.getElementById(id).closest('[hidden]')) })""")
            print('vuelta', vuelta, 'carga %.1f s' % carga, 'tras %.1f s' % espera, e)
        print('errores', errores[:3])
        ctx.close()
    b.close()
