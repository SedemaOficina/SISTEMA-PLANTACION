"""B2 · En modo real (servicio en 3121, aplicación en 8121), con la cuenta de Coordinación r1.coord (Secretaría): lo que
dicen Supervisión (el modelo y la tabla «Por red vial»), el informe PDF y el CSV, en «Todo» y con el filtro «Tipo de
jornada» (sí / no). Guarda todo en evidencia/b2/app_*.json, *.pdf y *.csv para compararlo con b2_sql.py.
La contraseña de prueba se lee de un archivo fuera de la evidencia (variable R1_CUENTAS).
Uso: R1_CUENTAS=<ruta> python evidencia/b2/b2_real.py"""
import json, os, time
from playwright.sync_api import sync_playwright
BASE = 'http://127.0.0.1:8121/'
EV = os.path.dirname(os.path.abspath(__file__))
C = {c['correo']: c for c in json.load(open(os.environ['R1_CUENTAS'], encoding='utf-8'))['cuentas']}
def config_real(route):
    r = route.fetch(); t = r.text(); assert 'ES_FICTICIO: true,' in t
    route.fulfill(response=r, body=t.replace('ES_FICTICIO: true,', 'ES_FICTICIO: false,'))
def resumen(pg):
    return pg.evaluate("""() => { const m = SRP.supervision.modelo, k = m.calles;
      return { periodo: m.periodo && m.periodo.etiqueta, filtros: SRP.supervision.filtros, arboles: m.cifras.arboles, jornadas: m.cifras.jornadas, detalle: m.detalle.length,
        lejos: k.lejos, porAsignar: k.porAsignar, versiones: k.versiones,
        porRed: k.porRed.map(x => ({ red: x.red, arboles: x.arboles, calles: x.calles, atiende: x.atiende })),
        porCalle: k.porCalle.map(e => ({ clave: e.clave, calle: e.calle, alcaldia: e.alcaldia, red: e.red, arboles: e.arboles, jornadas: e.jornadas })),
        porAtiende: (() => { const s = {}; m.detalle.forEach(d => { if (d.atiende) s[d.atiende] = (s[d.atiende] || 0) + 1; }); return s; })(),
        tablaRed: [...document.querySelectorAll('#sup-cuerpo table')].map(t => [...t.querySelectorAll('tr')].map(tr => [...tr.children].map(c => c.innerText.trim()))).filter(t => t[0] && t[0][0] === 'Red vial') }; }""")
def descargar(pg, boton, nombre):
    with pg.expect_download(timeout=120000) as d: pg.click(boton)
    ruta = os.path.join(EV, nombre + ('.pdf' if 'pdf' in boton else '.csv')); d.value.save_as(ruta)
    return d.value.suggested_filename
with sync_playwright() as p:
    b = p.chromium.launch()
    ctx = b.new_context(viewport={'width': 1440, 'height': 900}, accept_downloads=True, timezone_id='America/Mexico_City')
    ctx.route('**/js/config.js*', config_real)
    pg = ctx.new_page(); errores = []; pg.on('pageerror', lambda e: errores.append(str(e)))
    pg.goto(BASE); pg.wait_for_selector('html[data-listo]')
    u = C['r1.coord@ejemplo.local']
    pg.fill('#acceso-correo', u['correo']); pg.fill('#acceso-clave', u['clave']); pg.click('#form-acceso button[type="submit"]')
    pg.wait_for_function("() => !document.getElementById('navegacion').hidden && SRP.sesion.usuario", timeout=60000)
    t = time.time(); pg.wait_for_function("() => SRP.remoto && SRP.remoto.estado === 'listo'", timeout=300000)
    print('datos del servidor en %.1f s' % (time.time() - t), flush=True)
    pg.evaluate("() => document.querySelectorAll('dialog[open]').forEach(d => d.close())")
    pg.click('.pestana[data-vista=supervision]'); pg.wait_for_timeout(1500)
    pg.click('#sup-tipos .chip[data-tipo=todo]'); pg.wait_for_function("() => SRP.supervision.modelo && SRP.supervision.modelo.periodo.tipo === 'todo'", timeout=120000); pg.wait_for_timeout(1500)
    pg.evaluate("SRP.supervision.abrirTodo()"); pg.wait_for_timeout(500)
    salida = {'todo': resumen(pg)}
    salida['todo']['pdf'] = descargar(pg, '#btn-sup-pdf', 'app_todo'); salida['todo']['csv'] = descargar(pg, '#btn-sup-csv', 'app_todo')
    for v in ('si', 'no'):
        pg.evaluate("v => { const e = document.getElementById('sup-compartida'); e.value = v; e.dispatchEvent(new Event('change', { bubbles: true })); }", v)
        pg.wait_for_function("v => SRP.supervision.filtros.compartida === v", arg=v, timeout=60000); pg.wait_for_timeout(2500)
        pg.evaluate("SRP.supervision.abrirTodo()"); pg.wait_for_timeout(500)
        salida['compartida_' + v] = resumen(pg)
        salida['compartida_' + v]['csv'] = descargar(pg, '#btn-sup-csv', 'app_compartida_' + v)
        salida['compartida_' + v]['pdf'] = descargar(pg, '#btn-sup-pdf', 'app_compartida_' + v)
    salida['usuario'] = pg.evaluate("SRP.sesion.usuario.id"); salida['errores'] = errores
    json.dump(salida, open(os.path.join(EV, 'app_real.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    for k in ('todo', 'compartida_si', 'compartida_no'):
        s = salida[k]; print(k, '· árboles', s['arboles'], '· jornadas', s['jornadas'], '· filas CSV', s['detalle'], '· lejos', s['lejos'], '· por asignar', s['porAsignar'],
                              '· por red', [(x['red'], x['arboles'], x['calles']) for x in s['porRed']], '· calles', len(s['porCalle']))
    print('errores:', errores)
    b.close()
