"""B7 (terceros) y B9 (CSP) del SRP, con lo nuevo desde la 1.1, en los dos modos. Revisor r4, 27-10-2026.

Bloquea TODO dominio que no sea el del sitio (se aborta y se cuenta por dominio), escucha cada violación de la
política de seguridad de contenido (evento securitypolicyviolation y consola) y busca HTML inyectado.

  prueba: la app de la copia r4 servida por pruebas/servir.py en 8134; entra con las cuentas de prueba, carga la
          demostración y recorre todas las vistas con cada perfil; además: la ficha de una jornada compartida y
          «Cabos de apoyo» (Coordinación), el filtro «Tipo de jornada» en Jornadas, Registros y Supervisión, el
          cabo de apoyo vigente con su franja («Terminar mi parte»), la calle por celdas (assets/calles) y los
          informes en PDF y CSV.
  real:   la copia de producción armada con herramientas/preparar_produccion.py, detrás de un nginx local con
          servidor-web/srp.conf tal cual (8124/srp/), contra el servicio en 3124; entra por el formulario con las
          cuentas r4.b9.*; abre la jornada compartida preparada con texto que intentaría inyectar HTML.

Uso:  PYTHONUTF8=1 python b7b9_barrido.py prueba|real <salida.json> [cuentas.json] [--sw]
  --sw  deja correr el service worker (por omisión se bloquea, como en el barrido de la auditoría anterior)."""
import json, sys, time, urllib.parse
from playwright.sync_api import sync_playwright

MODO, SALIDA = sys.argv[1], sys.argv[2]
SW = '--sw' in sys.argv
BASE = 'http://127.0.0.1:8134/' if MODO == 'prueba' else 'http://127.0.0.1:8124/srp/'
ORIGEN = urllib.parse.urlsplit(BASE).netloc
CUENTAS = json.load(open(sys.argv[3], encoding='utf-8')) if MODO == 'real' else None
VISTAS = ['supervision', 'registrar', 'registros', 'jornadas', 'galeria', 'configuracion', 'catalogos', 'usuarios',
          'parametros', 'cambios', 'duplicados', 'carga', 'revision-especies', 'acerca']
ESCUCHA = """window.__csp = []; document.addEventListener('securitypolicyviolation', e => window.__csp.push(
  [e.violatedDirective, e.effectiveDirective, (e.blockedURI || '').slice(0, 120), (e.sourceFile || '').split('/').pop(), e.lineNumber, (e.sample || '').slice(0, 60)]), true);"""
INYECTADO = """() => ({ img: document.querySelectorAll('img[data-r4]').length, corrio: window.__r4xss || 0,
  texto: [...document.querySelectorAll('body *')].filter(e => e.children.length === 0 && (e.textContent || '').includes('data-r4')).length })"""


def main():
    res = {'modo': MODO, 'base': BASE, 'sw': SW, 'inicio': time.strftime('%Y-%m-%d %H:%M:%S'), 'perfiles': {}}
    with sync_playwright() as p:
        b = p.chromium.launch()
        if MODO == 'prueba':
            perfiles = [('ADMIN', 'u-admin-1'), ('DIRECTIVO', 'u-dir-1'), ('COORDINADOR', 'u-coord-1'), ('CABO', 'u-cabo-1'), ('CABO_APOYO', None)]
        else:
            perfiles = [(c['perfil'], c) for c in CUENTAS['cuentas']]
        for (perfil, quien) in perfiles:
            ctx = b.new_context(viewport={'width': 1280, 'height': 900}, geolocation={'latitude': 19.4326, 'longitude': -99.1332, 'accuracy': 5},
                                permissions=['geolocation'], service_workers='allow' if SW else 'block', timezone_id='America/Mexico_City', locale='es-MX',
                                accept_downloads=True)
            ctx.add_init_script(ESCUCHA)
            ev = {'externos': {}, 'csp_consola': [], 'errores': [], 'fallidos': [], 'peticiones_origen': 0, 'pasos': {}}

            def ruta(route):
                h = urllib.parse.urlsplit(route.request.url).netloc
                if route.request.url.startswith(('data:', 'blob:')) or h == ORIGEN:
                    return route.continue_()
                ev['externos'][h] = ev['externos'].get(h, 0) + 1
                route.abort('blockedbyclient')
            ctx.route('**/*', ruta)
            pg = ctx.new_page()
            pg.on('console', lambda m: ('Content Security Policy' in m.text or 'Refused to' in m.text) and ev['csp_consola'].append(m.text[:220]))
            pg.on('console', lambda m: m.type == 'error' and 'net::ERR_BLOCKED_BY_CLIENT' not in m.text and 'Failed to load resource' not in m.text and ev['errores'].append(m.text[:200]))
            pg.on('pageerror', lambda e: ev['errores'].append('pageerror: ' + str(e)[:200]))
            pg.on('request', lambda r: urllib.parse.urlsplit(r.url).netloc == ORIGEN and ev.__setitem__('peticiones_origen', ev['peticiones_origen'] + 1))
            pg.on('response', lambda r: r.status >= 400 and urllib.parse.urlsplit(r.url).netloc == ORIGEN and '/api/srp/acceso/yo' not in r.url and ev['fallidos'].append('%s %s' % (r.status, r.url.replace(BASE, '/')[:100])))

            def paso(nombre, fn):
                try:
                    out = fn(); pg.wait_for_timeout(900)
                    ev['pasos'][nombre] = out if out is not None else 'ok'
                except Exception as e:
                    ev['pasos'][nombre] = 'ERROR: ' + str(e).split('\n')[0][:160]

            try:
                pg.goto(BASE); pg.wait_for_selector('html[data-listo]', state='attached', timeout=40000)
                if MODO == 'prueba':
                    pg.select_option('#sel-usuario-prueba', 'u-admin-1'); pg.click('#btn-entrar-prueba')
                    pg.wait_for_function("() => SRP.sesion && SRP.sesion.usuario", timeout=20000)
                    pg.evaluate("async () => { await SRP.demo.cargar(); }")
                    uid = quien
                    if perfil == 'CABO_APOYO':
                        uid = pg.evaluate("""async () => { const j = (await SRP.almacen.todos('jornadas')).find(x => x.estatus === 'abierta' && SRP.permisos.vigentes(x).length);
                          return j ? SRP.permisos.vigentes(j)[0] : null; }""")
                        ev['cabo_apoyo'] = uid
                    pg.evaluate("id => SRP.sesion.iniciar(SRP.ref.usuarioPorId[id])", uid); pg.reload(); pg.wait_for_selector('html[data-listo]', state='attached')
                    pg.wait_for_function("id => SRP.sesion && SRP.sesion.usuario && SRP.sesion.usuario.id === id", arg=uid, timeout=20000); pg.wait_for_timeout(1500)
                else:
                    pg.fill('#acceso-correo', quien['correo']); pg.fill('#acceso-clave', quien['clave']); pg.click('#form-acceso button[type="submit"]')
                    pg.wait_for_function("() => !document.getElementById('navegacion').hidden", timeout=60000); pg.wait_for_timeout(3000)
                pg.evaluate("() => document.querySelectorAll('dialog[open]').forEach(d => d.close())")
                for v in VISTAS:
                    paso('vista:' + v, lambda v=v: pg.evaluate("v => { SRP.app.mostrarVista(v); return SRP.app.vista === v ? 'abre' : 'no es de su perfil'; }", v))
                # Lo nuevo
                paso('tipo de jornada (3 filtros)', lambda: pg.evaluate("""() => ['sup-compartida', 'filtro-compartida', 'jornada-compartida'].map(id => { const s = document.getElementById(id);
                    if (!s) return id + ': no está'; const ops = [...s.options].map(o => o.value); ops.forEach(v => { s.value = v; s.dispatchEvent(new Event('change', { bubbles: true })); });
                    return id + ': ' + ops.length + ' opciones'; })"""))
                if MODO == 'real':
                    paso('jornada con texto inyectado: ficha', lambda: pg.evaluate("async id => { SRP.app.mostrarVista('jornadas'); await SRP.jornadas.abrir(id); return document.getElementById('jornada-sub') ? 'abre' : 'sin ficha'; }", CUENTAS['jornada']))
                    paso('… inyectado en la ficha', lambda: pg.evaluate(INYECTADO))
                    paso('jornada con texto inyectado: lista', lambda: pg.evaluate("() => { document.querySelectorAll('dialog[open]').forEach(d => d.close()); SRP.app.mostrarVista('jornadas'); }"))
                    paso('registros (con el árbol inyectado)', lambda: pg.evaluate("() => SRP.app.mostrarVista('registros')"))
                    paso('supervisión', lambda: pg.evaluate("() => SRP.app.mostrarVista('supervision')"))
                else:
                    paso('ficha de una compartida + Cabos de apoyo', lambda: pg.evaluate("""async () => { const j = SRP.jornadas._todas && SRP.jornadas._todas.find(x => SRP.jornadas.compartida(x.dato) && x.estatus === 'abierta');
                        if (!j) return 'sin compartida abierta a su alcance'; SRP.app.mostrarVista('jornadas'); await SRP.jornadas.abrir(j.id);
                        const b = document.getElementById('btn-jornada-apoyos'); if (b && !b.hidden) { b.click(); await new Promise(r => setTimeout(r, 600));
                        const d = document.getElementById('dlg-apoyos'); const ab = d && d.open; if (d) d.close(); return 'ficha y diálogo ' + (ab ? 'abierto' : 'no abrió'); } return 'ficha (sin botón: no es la titular)'; }"""))
                    paso('franja del cabo de apoyo y cambiar jornada', lambda: pg.evaluate("""async () => { SRP.app.mostrarVista('registrar'); await new Promise(r => setTimeout(r, 1200));
                        const t = document.getElementById('btn-jornada-cerrar'); const c = document.getElementById('btn-jornada-cambiar');
                        if (c && !c.hidden) { c.click(); await new Promise(r => setTimeout(r, 500)); const d = document.getElementById('dlg-cambiar-jornada'); if (d && d.open) d.close(); }
                        return 'botón: ' + (t ? t.textContent.trim() : '—'); }"""))
                    paso('calle por celdas (servidor simulado)', lambda: pg.evaluate("async () => { const r = await SRP.calles.calcular(19.4205, -99.1640); return r ? (r.calle_estado + ' · ' + (r.calle ? 'con nombre' : 'sin nombre')) : 'nada'; }"))
                if perfil in ('ADMIN', 'DIRECTIVO'):
                    def informe(boton):
                        pg.evaluate("() => SRP.app.mostrarVista('supervision')"); pg.wait_for_timeout(1500)
                        if not pg.is_visible('#' + boton): return 'botón oculto'
                        with pg.expect_download(timeout=60000) as d:
                            pg.click('#' + boton)
                        return d.value.suggested_filename
                    paso('informe PDF', lambda: informe('btn-sup-pdf'))
                    paso('tabla CSV', lambda: informe('btn-sup-csv'))
                pg.wait_for_timeout(1500)
                ev['csp_eventos'] = pg.evaluate("window.__csp")
                ev['inyectado_final'] = pg.evaluate(INYECTADO)
            except Exception as e:
                ev['falla'] = str(e).split('\n')[0][:300]
                try: ev['csp_eventos'] = pg.evaluate("window.__csp")
                except Exception: pass
            res['perfiles'][perfil] = ev
            ctx.close()
        b.close()
    res['fin'] = time.strftime('%Y-%m-%d %H:%M:%S')
    tot = {'externas': sum(sum(e['externos'].values()) for e in res['perfiles'].values()),
           'dominios': sorted({h for e in res['perfiles'].values() for h in e['externos']}),
           'csp_eventos': sum(len(e.get('csp_eventos') or []) for e in res['perfiles'].values()),
           'csp_consola': sum(len(e['csp_consola']) for e in res['perfiles'].values()),
           'errores': sum(len(e['errores']) for e in res['perfiles'].values()),
           'pasos_con_error': [(p, k, v) for p, e in res['perfiles'].items() for k, v in e['pasos'].items() if isinstance(v, str) and v.startswith('ERROR')],
           'inyectado': {p: e.get('inyectado_final') for p, e in res['perfiles'].items()}}
    res['totales'] = tot
    json.dump(res, open(SALIDA, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    print(json.dumps(tot, ensure_ascii=False, indent=1))


main()
