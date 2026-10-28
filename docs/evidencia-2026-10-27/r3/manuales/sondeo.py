"""Sondeo de pantallas para verificar afirmaciones de los manuales (modo de prueba, http://127.0.0.1:8133/).
Uso: PYTHONUTF8=1 python -I sondeo.py <carpeta de salida>"""
import json, os, sys
from playwright.sync_api import sync_playwright
BASE = 'http://127.0.0.1:8133/'
S = sys.argv[1]; os.makedirs(S, exist_ok=True)
R = {}
def entrar(pg, uid):
    pg.evaluate("id => { const s = document.getElementById('sel-usuario-prueba'); if (![...s.options].some(o => o.value === id)) s.add(new Option(id, id)); }", uid)
    pg.select_option('#sel-usuario-prueba', uid); pg.click('#btn-entrar-prueba')
def como(pg, uid):
    pg.evaluate("id => SRP.sesion.iniciar(SRP.ref.usuarioPorId[id])", uid); pg.reload(); pg.wait_for_selector('html[data-listo]')
    pg.wait_for_function("id => SRP.sesion && SRP.sesion.usuario && SRP.sesion.usuario.id === id", arg=uid); pg.wait_for_timeout(1500)
    R.setdefault(uid, {})['dialogos_al_entrar'] = pg.evaluate(r"() => [...document.querySelectorAll('dialog[open]')].map(d => d.innerText.replace(/\s+/g,' ').slice(0,400))")
    pg.screenshot(path=os.path.join(S, uid + '-entrada.png'))
    pg.evaluate("() => document.querySelectorAll('dialog[open]').forEach(d => d.close())")
TXT = r"sel => { const e = document.querySelector(sel); return e ? e.innerText.slice(0, 3000) : null; }"
with sync_playwright() as p:
    b = p.chromium.launch()
    ctx = b.new_context(viewport={'width': 390, 'height': 844}, service_workers='block', geolocation={'latitude': 19.4326, 'longitude': -99.1332, 'accuracy': 5}, permissions=['geolocation'], timezone_id='America/Mexico_City')
    pg = ctx.new_page(); errs = []; pg.set_default_timeout(120000)
    pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto(BASE); pg.wait_for_selector('html[data-listo]')
    entrar(pg, 'u-admin-1'); pg.wait_for_function("() => SRP.sesion && SRP.sesion.usuario")
    pg.evaluate("async () => { await SRP.demo.cargar(); }")
    for uid in ['u-cabo-1', 'u-demo-c3', 'u-coord-1', 'u-demo-k1', 'u-dir-1', 'u-admin-1', 'u-demo-c1']:
        print('perfil', uid, flush=True); como(pg, uid)
        r = R[uid]
        r['vista_inicial'] = pg.evaluate("SRP.app.vista")
        r['pestanas'] = pg.evaluate("() => [...document.querySelectorAll('#navegacion .pestana')].filter(b => !b.hidden).map(b => b.innerText.trim())")
        r['nav_abajo'] = pg.evaluate("() => { const n = document.getElementById('navegacion').getBoundingClientRect(); return n.top > innerHeight/2; }")
        pg.wait_for_timeout(1500); R[uid]['dialogos_tarde'] = pg.evaluate(r"() => [...document.querySelectorAll('dialog[open]')].map(d => d.innerText.replace(/\s+/g,' ').slice(0,600))"); pg.evaluate("() => document.querySelectorAll('dialog[open]').forEach(d => d.close())"); pg.click('#btn-cuenta'); pg.wait_for_timeout(200)
        r['menu'] = pg.evaluate("() => [...document.querySelectorAll('#menu-cuenta p, #menu-cuenta .menu-opcion')].filter(e => e.offsetParent).map(e => e.innerText.trim())")
        pg.keyboard.press('Escape'); pg.wait_for_timeout(100)
        r['version_arriba'] = pg.evaluate("document.getElementById('version-sia').innerText")
        # Registros
        pg.evaluate("SRP.app.mostrarVista('registros')"); pg.wait_for_timeout(1500)
        r['registros_titulo'] = pg.evaluate("document.getElementById('titulo-registros').innerText")
        r['registros_atajos'] = pg.evaluate("() => [...document.querySelectorAll('#filtro-atajos .chip')].map(c => c.innerText)")
        r['registros_mas'] = pg.evaluate("() => [...document.querySelectorAll('#filtro-mas-filtros label')].filter(l => !l.closest('[hidden]')).map(l => l.innerText)")
        r['registros_orden'] = pg.evaluate(TXT, '#registros-orden')
        r['registros_tarjeta'] = pg.evaluate(TXT, '#lista-registros li')
        # Jornadas
        pg.evaluate("SRP.app.mostrarVista('jornadas')"); pg.wait_for_timeout(1500)
        r['jornadas_mas'] = pg.evaluate("() => [...document.querySelectorAll('#jornada-mas-filtros label')].filter(l => !l.closest('[hidden]')).map(l => l.innerText)")
        r['jornadas_otros'] = pg.evaluate("() => [...document.querySelectorAll('#jornada-panel-filtros > .campo-doble label')].map(l => l.innerText)")
        r['jornada_tarjeta'] = pg.evaluate(TXT, '#lista-jornadas li')
        # Supervisión / Mi avance
        if any(t in ('Supervisión', 'Mi avance') for t in r['pestanas']):
            pg.evaluate("SRP.app.mostrarVista('supervision')"); pg.wait_for_timeout(2500)
            pg.evaluate("document.querySelector('#sup-tipos .chip[data-tipo=todo]').click()"); pg.wait_for_timeout(2500)
            r['sup_titulo'] = pg.evaluate("document.getElementById('titulo-supervision').innerText")
            r['sup_mas'] = pg.evaluate("() => [...document.querySelectorAll('#sup-filtros label')].filter(l => !l.closest('[hidden]')).map(l => l.innerText)")
            r['sup_cifras'] = pg.evaluate(TXT, '#sup-cuerpo .sup-cifras')
            r['sup_atender'] = pg.evaluate(TXT, '#sup-cuerpo .sup-atender')
            r['sup_desgloses'] = pg.evaluate(r"() => [...document.querySelectorAll('#sup-cuerpo details[data-seccion] > summary')].map(s => s.innerText.replace(/\s+/g,' ').slice(0,160))")
            r['sup_acciones'] = pg.evaluate("() => [...document.querySelectorAll('#sup-acciones button')].filter(b => b.offsetParent).map(b => b.innerText.trim())")
            pg.screenshot(path=os.path.join(S, uid + '-supervision.png'), full_page=True)
            if pg.is_visible('#btn-sup-fotos'):
                pg.evaluate("() => document.querySelectorAll('dialog[open]').forEach(d => d.close())"); pg.evaluate("document.getElementById('btn-sup-fotos').click()"); pg.wait_for_timeout(2500)
                r['galeria_filtros'] = pg.evaluate("() => [...document.querySelectorAll('#galeria-filtros label, #galeria-filtros summary, #galeria-filtros input[type=search]')].map(l => l.innerText || l.placeholder || l.getAttribute('aria-label'))")
                r['galeria_zip'] = pg.evaluate("document.getElementById('btn-galeria-zip').innerText")
        R[uid] = r
    R['errores'] = errs
    # Escritorio
    ctx2 = b.new_context(viewport={'width': 1440, 'height': 900}, service_workers='block')
    pg2 = ctx2.new_page(); pg2.goto(BASE); pg2.wait_for_selector('html[data-listo]')
    entrar(pg2, 'u-cabo-1'); pg2.wait_for_function("() => SRP.sesion && SRP.sesion.usuario"); pg2.wait_for_timeout(1500)
    R['escritorio'] = {'nav_top': pg2.evaluate("document.getElementById('navegacion').getBoundingClientRect().top"),
                       'logo': pg2.evaluate("document.getElementById('logo').currentSrc"),
                       'ver_detalle_visible': pg2.is_visible('#btn-franja-detalle')}
    pg2.screenshot(path=os.path.join(S, 'escritorio-cabo.png'))
    R['telefono_logo'] = pg.evaluate("document.getElementById('logo').currentSrc")
    b.close()
json.dump(R, open(os.path.join(S, 'sondeo.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
print(json.dumps(R, ensure_ascii=False, indent=1))
