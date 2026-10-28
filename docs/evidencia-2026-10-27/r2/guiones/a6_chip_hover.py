"""A6 · Un chip marcado con el puntero encima (computadora): ¿qué color de fondo y de letra queda? Modo sol encendido y
apagado. Datos de prueba, Coordinación, «Varios cabos» y un cabo de la lista. Uso: python a6_chip_hover.py <url>"""
import sys
from playwright.sync_api import sync_playwright
BASE = sys.argv[1].rstrip('/') + '/'
J = """s => { const e = document.querySelector(s), c = getComputedStyle(e); return [c.color, c.backgroundColor]; }"""
with sync_playwright() as p:
    b = p.chromium.launch()
    for modo in ('sol', 'normal'):
        for v in (1, 2):
            ctx = b.new_context(viewport={'width': 1440, 'height': 900}, service_workers='block')
            if modo == 'normal': ctx.add_init_script("try { localStorage.setItem('srp_contraste', 'normal'); } catch (e) {}")
            pg = ctx.new_page(); pg.goto(BASE); pg.wait_for_selector('html[data-listo]', state='attached')
            pg.select_option('#sel-usuario-prueba', 'u-coord-1'); pg.click('#btn-entrar-prueba'); pg.wait_for_function("() => SRP.sesion && SRP.sesion.usuario"); pg.wait_for_timeout(1500)
            pg.evaluate("() => document.querySelectorAll('dialog[open]').forEach(d => d.close())"); pg.evaluate("SRP.app.mostrarVista('registrar')"); pg.wait_for_timeout(800)
            pg.click('#ini-quien .chip[data-quien="varios"]'); pg.wait_for_timeout(600)
            a = pg.evaluate(J, '#ini-quien .chip[data-quien="varios"]')
            pg.click('#ini-apoyos .chip'); pg.wait_for_timeout(600)
            c = pg.evaluate(J, '#ini-apoyos .chip[aria-pressed="true"]')
            pg.mouse.move(0, 0); pg.wait_for_timeout(600)
            d = pg.evaluate(J, '#ini-apoyos .chip[aria-pressed="true"]')
            print(modo, v, '«Varios cabos» marcado, con el puntero encima:', a, '· cabo marcado, con el puntero encima:', c, '· sin el puntero:', d, flush=True)
            ctx.close()
    b.close()
