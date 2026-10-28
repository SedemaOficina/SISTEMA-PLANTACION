"""r3 · Apoyo común de los guiones de la revisión C1–C6 (modo de prueba, http://127.0.0.1:8133/).
Uso: desde otro guion, `from comun import *`. Correr con PYTHONUTF8=1 y Python 3.12 con Playwright."""
import json, os, re, datetime
from playwright.sync_api import sync_playwright

BASE = os.environ.get('R3_BASE', 'http://127.0.0.1:8133/')
EVID = os.path.dirname(os.path.abspath(__file__))
CAPT = os.path.join(EVID, 'capturas'); os.makedirs(CAPT, exist_ok=True)
TEL = {'width': 390, 'height': 844}
ESC = {'width': 1440, 'height': 900}
HOY = datetime.date.today().isoformat()

# Palabras, botones, campos y alto de un contenedor visible (C3)
CARGA = r"""(sel) => { const raiz = typeof sel === 'string' ? document.querySelector(sel) : sel; if (!raiz) return null;
  const vis = e => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0 && !e.closest('[hidden]') && getComputedStyle(e).visibility !== 'hidden'; };
  const txt = raiz.innerText || ''; const palabras = txt.split(/\s+/).filter(w => /\p{L}/u.test(w)).length;
  return { palabras, botones: [...raiz.querySelectorAll('button, [role=button], summary, a[href]')].filter(vis).length,
    campos: [...raiz.querySelectorAll('input:not([type=hidden]), select, textarea')].filter(vis).filter(e => !e.classList.contains('oculto-visual')).length,
    alto: Math.round(raiz.scrollHeight) }; }"""


def contexto(b, vp=TEL, acc=5, sol=True):
    ctx = b.new_context(viewport=vp, device_scale_factor=1, service_workers='block', timezone_id='America/Mexico_City',
                        geolocation={'latitude': 19.4326, 'longitude': -99.1332, 'accuracy': acc}, permissions=['geolocation'],
                        locale='es-MX', accept_downloads=True)
    if not sol:
        ctx.add_init_script("try { if (localStorage.getItem('srp_contraste') === null) localStorage.setItem('srp_contraste', 'normal'); } catch (e) {}")
    return ctx


def pagina(ctx, errores):
    pg = ctx.new_page()
    pg.on('pageerror', lambda e: errores.append('pageerror: ' + str(e)))
    pg.on('console', lambda m: m.type == 'error' and 'net::' not in m.text and 'Failed to load' not in m.text and errores.append('console: ' + m.text))
    return pg


def arrancar(pg):
    pg.goto(BASE); pg.wait_for_selector('html[data-listo]', state='attached', timeout=30000)


def entrar(pg, uid):
    pg.evaluate("id => { const s = document.getElementById('sel-usuario-prueba'); if (![...s.options].some(o => o.value === id)) s.add(new Option(id, id)); }", uid)
    pg.select_option('#sel-usuario-prueba', uid); pg.click('#btn-entrar-prueba')
    pg.wait_for_function("id => SRP.sesion && SRP.sesion.usuario && SRP.sesion.usuario.id === id", arg=uid, timeout=20000)


def como(pg, uid, cerrar=True):
    """Cambia de cuenta sin salir (como en pruebas/prueba.py) y recarga; deja abiertos los avisos si cerrar=False"""
    pg.evaluate("id => SRP.sesion.iniciar(SRP.ref.usuarioPorId[id])", uid); pg.reload()
    pg.wait_for_selector('html[data-listo]', state='attached', timeout=30000)
    pg.wait_for_function("id => SRP.sesion && SRP.sesion.usuario && SRP.sesion.usuario.id === id", arg=uid, timeout=20000)
    pg.wait_for_timeout(1500)
    if cerrar: cerrar_dialogos(pg)


def cerrar_dialogos(pg):
    pg.evaluate("() => document.querySelectorAll('dialog[open]').forEach(d => d.close())")


def cargar_demo(pg):
    pg.evaluate("async () => { await SRP.demo.cargar(); }")


def vista(pg, v, espera=1500):
    pg.evaluate("v => SRP.app.mostrarVista(v)", v); pg.wait_for_timeout(espera)


def foto(pg, nombre, completa=True):
    ruta = os.path.join(CAPT, nombre + '.png'); pg.screenshot(path=ruta, full_page=completa); return ruta


def texto(pg, sel):
    return pg.evaluate("s => { const e = document.querySelector(s); return e ? e.innerText : null; }", sel)


def dialogo_abierto(pg):
    return pg.evaluate("""() => [...document.querySelectorAll('dialog[open]')].map(d => ({ id: d.id, texto: d.innerText }))""")


def carga(pg, sel):
    return pg.evaluate(CARGA, sel)


def guardar(nombre, datos):
    with open(os.path.join(EVID, nombre), 'w', encoding='utf-8') as f: json.dump(datos, f, ensure_ascii=False, indent=1)
