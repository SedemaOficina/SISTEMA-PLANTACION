import json, sys
from playwright.sync_api import sync_playwright
BASE='http://127.0.0.1:8132/'
with sync_playwright() as p:
    b = p.chromium.launch(); ctx = b.new_context(viewport={'width':390,'height':844}, geolocation={'latitude':19.4326,'longitude':-99.1332,'accuracy':5}, permissions=['geolocation'], timezone_id='America/Mexico_City', service_workers='block')
    pg = ctx.new_page(); err=[]; pg.on('pageerror', lambda e: err.append(str(e)[:300])); pg.on('console', lambda m: m.type=='error' and err.append(m.text[:300]))
    pg.goto(BASE); pg.wait_for_selector('html[data-listo]', state='attached')
    pg.select_option('#sel-usuario-prueba', 'u-admin-1'); pg.click('#btn-entrar-prueba'); pg.wait_for_function("() => SRP.sesion && SRP.sesion.usuario")
    pg.evaluate("async () => { await SRP.demo.cargar(); }")
    def como(uid):
        pg.evaluate("id => SRP.sesion.iniciar(SRP.ref.usuarioPorId[id])", uid); pg.reload(); pg.wait_for_selector('html[data-listo]', state='attached')
        pg.wait_for_function("id => SRP.sesion && SRP.sesion.usuario && SRP.sesion.usuario.id === id", arg=uid)
    como('u-coord-1'); pg.wait_for_timeout(1500)
    print('coord dialogos', pg.eval_on_selector_all('dialog[open]', 'l => l.map(d => [d.id, d.innerText.slice(0,200)])'))
    pg.evaluate("() => document.querySelectorAll('dialog[open]').forEach(d => d.close())")
    jid = pg.evaluate("""async () => { const u = SRP.sesion.usuario; await SRP.activa.guardarJornadaNueva({ nombre: 'Dep r2', ubicacion: { lat: 19.4326, lng: -99.1332 }, fecha: SRP.util.fechaHoy(), comentarios: '', programa_id: 'p-refor', previstos: 10, apoyos: ['u-cabo-1'] }); return SRP.activa.jornada.id; }""")
    print('jid', jid, pg.evaluate("async id => (await SRP.almacen.uno('jornadas', id)).cabos_apoyo", jid))
    como('u-cabo-1')
    for i in range(8):
        pg.wait_for_timeout(700)
        print(i, pg.eval_on_selector_all('dialog[open]', 'l => l.map(d => [d.id, d.innerText.slice(0,160)])'), pg.evaluate("SRP.activa.jornada && SRP.activa.jornada.id"), pg.evaluate("SRP.app.vista"))
    print('err', err)
    b.close()
