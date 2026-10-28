from playwright.sync_api import sync_playwright
BASE='http://127.0.0.1:8132/'
with sync_playwright() as p:
    b = p.chromium.launch(); ctx = b.new_context(viewport={'width':390,'height':844}, timezone_id='America/Mexico_City', service_workers='block')
    pg = ctx.new_page(); pg.goto(BASE); pg.wait_for_selector('html[data-listo]', state='attached')
    pg.select_option('#sel-usuario-prueba', 'u-admin-1'); pg.click('#btn-entrar-prueba'); pg.wait_for_function("() => SRP.sesion && SRP.sesion.usuario")
    pg.evaluate("async () => { await SRP.demo.cargar(); }")
    pg.evaluate("id => SRP.sesion.iniciar(SRP.ref.usuarioPorId[id])", 'u-coord-1'); pg.reload(); pg.wait_for_selector('html[data-listo]', state='attached'); pg.wait_for_timeout(3000)
    pg.evaluate("() => document.querySelectorAll('dialog[open]').forEach(d => d.close())")
    pg.evaluate("SRP.app.mostrarVista('jornadas')"); pg.wait_for_timeout(2000)
    print('antes', pg.evaluate("() => [SRP.jornadas.lista.length, document.querySelectorAll('#lista-jornadas > li').length, (document.querySelector('#lista-jornadas > li')||{}).className]"))
    pg.evaluate("() => { const c = document.querySelector('#jornada-atajos .chip[data-atajo=todas]'); if (c) c.click(); }"); pg.wait_for_timeout(1500)
    pg.evaluate("([s, v]) => { const e = document.querySelector(s); e.value = v; e.dispatchEvent(new Event('change', { bubbles: true })); }", ['#jornada-compartida', 'si']); pg.wait_for_timeout(1500)
    print('compartidas', pg.evaluate("() => [SRP.jornadas.lista.length, document.querySelectorAll('#lista-jornadas > li').length, [...document.querySelectorAll('#lista-jornadas > li')].slice(0,2).map(l => l.innerText.replace(/\s+/g,' ').slice(0,200)), document.querySelector('#vista-jornadas .conteo-lista') && document.querySelector('#vista-jornadas .conteo-lista').textContent, document.querySelector('#vista-jornadas [aria-live]') && document.querySelector('#vista-jornadas [aria-live]').id]"))
    b.close()
