"""C1-C6 · Las pantallas nuevas desde el 12-10 (modo real, Administración, 390×844): captura de cada una y su carga
(palabras visibles, controles, campos) para la revisión de tareas, heurísticas, textos y sistema visual."""
import json, os
from playwright.sync_api import sync_playwright
C = json.load(open(r'C:\sia-rev\tmp\herr\cuentas-real.json', encoding='utf-8')); A = [c for c in C if c['perfil'] == 'ADMIN'][0]
S = r'C:\sia-rev\tmp\herr\c-pantallas'; os.makedirs(S, exist_ok=True)
CARGA = r"""(sel) => { const raiz = document.querySelector(sel); const vis = e => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0 && !e.closest('[hidden]') && getComputedStyle(e).visibility !== 'hidden'; };
  const txt = raiz.innerText || ''; const palabras = txt.split(/\s+/).filter(w => /\p{L}/u.test(w)).length;
  return { palabras, botones: [...raiz.querySelectorAll('button, [role=button], summary')].filter(vis).length,
    campos: [...raiz.querySelectorAll('input:not([type=hidden]), select, textarea')].filter(vis).length,
    alto: Math.round(raiz.scrollHeight) }; }"""
with sync_playwright() as p:
    b = p.chromium.launch(); ctx = b.new_context(viewport={'width': 390, 'height': 844}, device_scale_factor=1, service_workers='block'); pg = ctx.new_page()
    pg.goto('http://127.0.0.1:8090/'); pg.wait_for_selector('html[data-listo]')
    pg.fill('#acceso-correo', A['correo']); pg.fill('#acceso-clave', A['clave']); pg.click('#form-acceso button[type="submit"]')
    pg.wait_for_function("() => SRP.remoto.estado === 'listo'", timeout=180000); pg.wait_for_timeout(1000)
    res = {}
    for v in ['configuracion', 'usuarios', 'catalogos', 'parametros', 'cambios', 'duplicados', 'carga', 'revision-especies', 'acerca']:
        pg.evaluate("v => SRP.app.mostrarVista(v)", v); pg.wait_for_timeout(2500)
        res[v] = pg.evaluate(CARGA, '#vista-' + v)
        pg.screenshot(path=os.path.join(S, v + '.png'), full_page=True)
    # Ventanas de Administración: alta de cuenta, valor de catálogo, parámetro
    pg.evaluate("SRP.app.mostrarVista('usuarios')"); pg.wait_for_timeout(1500)
    pg.click('#btn-usr-agregar') if pg.locator('#btn-usr-agregar').count() else None; pg.wait_for_timeout(800)
    if pg.is_visible('#dlg-usuario'): res['dlg-usuario'] = pg.evaluate(CARGA, '#dlg-usuario'); pg.screenshot(path=os.path.join(S, 'dlg-usuario.png'), full_page=True)
    print(json.dumps(res, ensure_ascii=False, indent=0))
    b.close()
