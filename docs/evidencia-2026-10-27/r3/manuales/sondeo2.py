"""Segundo sondeo para los manuales: «Ver detalle» de la franja, la franja del cabo de apoyo y «Terminar mi parte»,
«Cabos de apoyo» y el cierre de la compartida (sin confirmar), y el botón de marcar revisados.
Uso: PYTHONUTF8=1 python -I sondeo2.py <carpeta de salida>"""
import json, os, sys
from playwright.sync_api import sync_playwright
BASE = 'http://127.0.0.1:8133/'
S = sys.argv[1]; os.makedirs(S, exist_ok=True); R = {}
CERRAR = "() => document.querySelectorAll('dialog[open]').forEach(d => d.close())"
DLG = r"() => [...document.querySelectorAll('dialog[open]')].map(d => d.innerText.replace(/\s+/g,' ').slice(0,900))"
with sync_playwright() as p:
    b = p.chromium.launch()
    ctx = b.new_context(viewport={'width': 390, 'height': 844}, service_workers='block', geolocation={'latitude': 19.4326, 'longitude': -99.1332, 'accuracy': 5}, permissions=['geolocation'], timezone_id='America/Mexico_City')
    pg = ctx.new_page(); pg.set_default_timeout(120000)
    pg.goto(BASE); pg.wait_for_selector('html[data-listo]')
    pg.evaluate("id => { const s = document.getElementById('sel-usuario-prueba'); if (![...s.options].some(o => o.value === id)) s.add(new Option(id, id)); }", 'u-admin-1')
    pg.select_option('#sel-usuario-prueba', 'u-admin-1'); pg.click('#btn-entrar-prueba'); pg.wait_for_function("() => SRP.sesion && SRP.sesion.usuario")
    pg.evaluate("async () => { await SRP.demo.cargar(); }")
    def como(uid):
        pg.evaluate("id => SRP.sesion.iniciar(SRP.ref.usuarioPorId[id])", uid); pg.reload(); pg.wait_for_selector('html[data-listo]')
        pg.wait_for_function("id => SRP.sesion && SRP.sesion.usuario && SRP.sesion.usuario.id === id", arg=uid); pg.wait_for_timeout(3000)
        pg.evaluate(CERRAR)
    # 1. Cabo de apoyo: la franja y «Terminar mi parte» (se cancela)
    como('u-demo-c3')
    pg.evaluate("SRP.app.mostrarVista('registrar')"); pg.wait_for_timeout(2500); pg.evaluate(CERRAR)
    R['apoyo_franja'] = pg.evaluate("() => document.getElementById('franja-jornada').innerText")
    pg.screenshot(path=os.path.join(S, 'apoyo-franja.png'))
    # «Ver detalle»: qué hace
    antes = pg.evaluate("[SRP.app.vista, document.getElementById('btn-franja-detalle').innerText]")
    pg.click('#btn-franja-detalle'); pg.wait_for_timeout(600)
    R['ver_detalle'] = {'antes': antes, 'despues': pg.evaluate("[SRP.app.vista, document.getElementById('btn-franja-detalle').innerText]")}
    pg.screenshot(path=os.path.join(S, 'ver-detalle-abierto.png'))
    pg.click('#btn-jornada-cerrar'); pg.wait_for_timeout(1200)
    R['terminar_dialogo'] = pg.evaluate(DLG)
    pg.screenshot(path=os.path.join(S, 'terminar-mi-parte.png'))
    pg.evaluate(CERRAR)
    # 2. Coordinación con compartida abierta hoy: «Cabos de apoyo» y el cierre
    como('u-demo-k1')
    pg.evaluate("SRP.app.mostrarVista('registrar')"); pg.wait_for_timeout(2500); pg.evaluate(CERRAR)
    R['coord_vista'] = pg.evaluate("SRP.app.vista")
    if pg.is_visible('#panel-iniciar-jornada'):
        # Sin jornada activa: se elige la compartida abierta
        R['coord_activa'] = None
        pg.evaluate("async () => { const j = (await SRP.almacen.todos('jornadas')).find(x => x.estatus === 'abierta' && x.cabo_id === 'u-demo-k1'); SRP.activa.jornada = j; await SRP.activa.preparar(); }"); pg.wait_for_timeout(1500)
    R['coord_franja'] = pg.evaluate("() => document.getElementById('franja-jornada').innerText")
    pg.screenshot(path=os.path.join(S, 'coord-franja.png'))
    pg.click('#btn-franja-apoyos'); pg.wait_for_timeout(1200)
    R['apoyos_dialogo'] = pg.evaluate(DLG); R['apoyos_boton'] = pg.evaluate("document.getElementById('btn-apoyos-guardar').innerText")
    pg.screenshot(path=os.path.join(S, 'cabos-de-apoyo.png'), full_page=True)
    pg.evaluate(CERRAR)
    pg.click('#btn-jornada-cerrar'); pg.wait_for_timeout(2500)
    R['cierre_dialogo'] = pg.evaluate(DLG)
    R['cierre_botones'] = pg.evaluate("() => [...document.querySelectorAll('dialog[open] button')].filter(b => b.offsetParent).map(b => b.innerText.trim())")
    pg.screenshot(path=os.path.join(S, 'cierre-compartida.png'), full_page=True)
    pg.evaluate(CERRAR)
    # 3. Ficha de una jornada cerrada con puntos por revisar: el botón de marcar revisados
    pg.evaluate("SRP.app.mostrarVista('jornadas')"); pg.wait_for_timeout(2000)
    pg.evaluate("document.querySelector('#jornada-atajos .chip[data-atajo=todas]').click()"); pg.wait_for_timeout(2000)
    R['ficha'] = pg.evaluate("""async () => { const js = SRP.jornadas.lista.filter(j => j.dato && j.dato.estatus === 'cerrada').map(j => j.clave);
      for (const c of js.slice(0, 60)) { await SRP.jornadas.abrir(c); await new Promise(r => setTimeout(r, 300));
        const t = document.getElementById('btn-jornada-todos-bien'); if (t && !t.hidden) return { jornada: c, boton: t.innerText,
          botones: [...document.querySelectorAll('#jornada-detalle button')].filter(b => b.offsetParent).map(b => b.innerText.trim()).filter(Boolean).slice(0, 25) }; }
      return { revisadas: js.length }; }""")
    pg.screenshot(path=os.path.join(S, 'ficha-revisar.png'))
    b.close()
json.dump(R, open(os.path.join(S, 'sondeo2.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
print(json.dumps(R, ensure_ascii=False, indent=1))
