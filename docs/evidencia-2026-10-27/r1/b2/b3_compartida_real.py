"""B2/B3 · En modo real: la Coordinación r1.coord abre una jornada compartida con «Varios cabos» (r1.cabo y r1.cabo2),
con un nombre que empieza con «=» y lleva acentos; registra 1 árbol junto a una calle. r1.cabo registra 2 y termina su
parte; r1.cabo2 no hace nada. La Coordinación cierra. Se leen: el modelo del reporte (renglón «Cabos de apoyo», columnas
«Calle» y «Cabo»), el PDF del reporte, «Mi avance» del cabo de apoyo y el CSV de Supervisión con el nombre de la jornada.
Uso: R1_CUENTAS=<ruta fuera de la evidencia> python evidencia/b2/b3_compartida_real.py"""
import csv, io, json, os, datetime
from playwright.sync_api import sync_playwright
BASE = 'http://127.0.0.1:8121/'
EV = os.path.dirname(os.path.abspath(__file__))
C = {c['correo']: c for c in json.load(open(os.environ['R1_CUENTAS'], encoding='utf-8'))['cuentas']}
COORD, CABO, CABO2 = C['r1.coord@ejemplo.local'], C['r1.cabo@ejemplo.local'], C['r1.cabo2@ejemplo.local']
NOMBRE = '=HIPERVINCULO("x") Jornada ñandú r1 ' + datetime.datetime.now().strftime('%H%M%S')
HOY = datetime.date.today().isoformat()
PUNTOS = [(19.396114, -99.125925), (19.396300, -99.125700), (19.396500, -99.125500)]


def config_real(route):
    r = route.fetch()
    route.fulfill(response=r, body=r.text().replace('ES_FICTICIO: true,', 'ES_FICTICIO: false,'))


def entrar(pg, u):
    pg.goto(BASE); pg.wait_for_selector('html[data-listo]')
    pg.fill('#acceso-correo', u['correo']); pg.fill('#acceso-clave', u['clave']); pg.click('#form-acceso button[type="submit"]')
    pg.wait_for_function("() => !document.getElementById('navegacion').hidden && SRP.sesion.usuario", timeout=60000)
    pg.wait_for_function("() => SRP.remoto && SRP.remoto.estado === 'listo'", timeout=300000)


def aviso(pg):
    try:
        pg.wait_for_function("() => document.getElementById('dlg-confirmar').open", timeout=8000)
        t = pg.inner_text('#dlg-confirmar'); pg.click('#btn-confirmar-si'); pg.wait_for_timeout(400)
        return t
    except Exception:
        return None


def cola(pg):
    pg.wait_for_function("() => SRP.cola.ops.length === 0 && !SRP.envio.enviando", timeout=60000); pg.wait_for_timeout(500)


def registrar(pg, ctx, punto):
    ctx.set_geolocation({'latitude': punto[0], 'longitude': punto[1], 'accuracy': 5})
    pg.evaluate("SRP.app.mostrarVista('registrar')"); pg.wait_for_timeout(600)
    pg.click('#btn-ubicacion'); pg.wait_for_timeout(1500)
    pg.fill('#campo-especie', 'ahuehu'); pg.wait_for_timeout(300)
    pg.dispatch_event('.combo-opcion[data-id="ESP-0070"]', 'mousedown'); pg.wait_for_timeout(200)
    pg.click('#form-plantacion button[type=submit]'); pg.wait_for_timeout(900)
    for _ in range(2):
        if pg.is_visible('#dlg-confirmar'):
            pg.click('#btn-confirmar-si'); pg.wait_for_timeout(800)
    if pg.is_visible('#dlg-resumen'):
        pg.click('#btn-resumen-guardar'); pg.wait_for_timeout(800)
    return pg.evaluate("SRP.formulario.estado.ultimoGuardado")


out = {'nombre': NOMBRE}
with sync_playwright() as p:
    b = p.chromium.launch()

    def mk():
        c = b.new_context(viewport={'width': 390, 'height': 844}, geolocation={'latitude': PUNTOS[0][0], 'longitude': PUNTOS[0][1], 'accuracy': 5},
                          permissions=['geolocation'], accept_downloads=True, timezone_id='America/Mexico_City')
        c.route('**/js/config.js*', config_real)
        return c
    err = []
    ctxC = mk(); pgC = ctxC.new_page(); pgC.on('pageerror', lambda e: err.append(str(e)))
    entrar(pgC, COORD); aviso(pgC)
    pgC.evaluate("SRP.app.mostrarVista('registrar')"); pgC.wait_for_timeout(800)
    if pgC.is_hidden('#panel-iniciar-jornada'):
        pgC.click('#btn-jornada-cambiar'); pgC.wait_for_timeout(200); pgC.click('#btn-cambiar-nueva'); pgC.wait_for_timeout(300)
    pgC.fill('#ini-nombre', NOMBRE); pgC.fill('#ini-fecha', HOY); pgC.select_option('#ini-programa', 'p-refor'); pgC.fill('#ini-meta', '10')
    pgC.click('#btn-ini-detectar'); pgC.wait_for_timeout(1500)
    pgC.click('#ini-quien .chip[data-quien="varios"]')
    pgC.click('#ini-apoyos .chip[data-id="%s"]' % CABO['id']); pgC.click('#ini-apoyos .chip[data-id="%s"]' % CABO2['id'])
    pgC.click('#btn-iniciar-jornada')
    pgC.wait_for_function("n => SRP.activa.jornada && SRP.activa.jornada.nombre === n", arg=NOMBRE, timeout=30000)
    jid = pgC.evaluate("SRP.activa.jornada.id"); out['jornada'] = jid
    out['arbol_coord'] = registrar(pgC, ctxC, PUNTOS[0]); pgC.evaluate("SRP.envio.enviar({ manual: true })"); cola(pgC)
    print('1) jornada compartida y árbol de la Coordinación', flush=True)
    # El cabo de apoyo
    ctxA = mk(); pgA = ctxA.new_page(); pgA.on('pageerror', lambda e: err.append(str(e)))
    entrar(pgA, CABO); out['aviso_cabo'] = aviso(pgA)
    pgA.evaluate("SRP.app.mostrarVista('registrar')"); pgA.wait_for_timeout(1000)
    if pgA.evaluate("id => !SRP.activa.jornada || SRP.activa.jornada.id !== id", jid):
        pgA.click('#btn-jornada-cambiar'); pgA.wait_for_selector('#dlg-cambiar-jornada[open]')
        pgA.click('#lista-jornadas-abiertas button[data-id="%s"]' % jid); pgA.wait_for_timeout(800)
    out['arboles_cabo'] = [registrar(pgA, ctxA, PUNTOS[1]), registrar(pgA, ctxA, PUNTOS[2])]
    pgA.evaluate("SRP.envio.enviar({ manual: true })"); cola(pgA)
    pgA.evaluate("SRP.app.mostrarVista('registrar')"); pgA.wait_for_timeout(600)
    pgA.evaluate("() => { const d = document.getElementById('dlg-completa'); if (d && d.open) d.close(); }")   # «Jornada completa» (llegó a la meta)
    pgA.click('#btn-jornada-cerrar'); pgA.wait_for_selector('#dlg-confirmar[open]')
    out['terminar_texto'] = pgA.inner_text('#dlg-confirmar'); pgA.click('#btn-confirmar-si'); cola(pgA)
    print('2) el cabo de apoyo registró 2 y terminó su parte', flush=True)
    # La Coordinación cierra
    pgC.reload(); pgC.wait_for_selector('html[data-listo]')
    pgC.wait_for_function("() => SRP.remoto && SRP.remoto.estado === 'listo'", timeout=300000); aviso(pgC)
    out['pendientes_al_cerrar'] = pgC.evaluate("async id => { const j = await SRP.almacen.uno('jornadas', id); return (await SRP.activa.confirmacionCierre(j)).puntos; }", jid)
    pgC.evaluate("async id => { const j = await SRP.almacen.uno('jornadas', id); await SRP.activa.cambiarEstatus(j, 'cerrada'); }", jid); pgC.wait_for_timeout(800)
    pgC.evaluate("SRP.envio.enviar({ manual: true })"); cola(pgC)
    out['reporte_modelo'] = pgC.evaluate("""async id => { const j = await SRP.almacen.uno('jornadas', id); const regs = await SRP.activa.registrosDe(j);
      const m = SRP.reportes.modelo(regs, j, j.fecha, j);
      return { rotulo: m.rotuloCabo, cabo: m.cabo, identificacion: m.identificacion, cabecera: m.ejemplares.cabecera, filas: m.ejemplares.filas }; }""", jid)
    print('3) cerrada; modelo del reporte leído', flush=True)
    # El PDF del reporte, desde la ficha
    pgC.evaluate("async id => { SRP.app.mostrarVista('jornadas'); await SRP.jornadas.abrir(id); }", jid); pgC.wait_for_timeout(2500)
    pgC.evaluate("SRP.jornadas.irAlReporte()"); pgC.wait_for_timeout(1200)
    pgC.evaluate("() => { const e = document.getElementById('cie-hora'); if (e && !e.value) e.value = '12:00'; }")
    pgC.click('#btn-cierre-generar'); pgC.wait_for_timeout(1500)
    out['previa_tabla'] = pgC.evaluate("""() => { const t = document.querySelector('#previa-hoja table'); return t ? [[...t.querySelectorAll('thead th')].map(x => x.textContent),
      [...t.querySelectorAll('tbody tr')].map(tr => [...tr.children].map(x => x.textContent))] : null; }""")
    with pgC.expect_download(timeout=120000) as d:
        pgC.click('#btn-previa-generar')
    d.value.save_as(os.path.join(EV, 'reporte_compartida.pdf')); out['pdf'] = d.value.suggested_filename
    print('4) PDF del reporte', flush=True)
    # Mi avance del cabo de apoyo
    pgA.reload(); pgA.wait_for_selector('html[data-listo]')
    pgA.wait_for_function("() => SRP.remoto && SRP.remoto.estado === 'listo'", timeout=300000); aviso(pgA)
    pgA.evaluate("SRP.app.mostrarVista('supervision')"); pgA.wait_for_timeout(1500)
    pgA.click('#sup-tipos .chip[data-tipo=todo]'); pgA.wait_for_timeout(2500)
    out['mi_avance_cabo'] = pgA.evaluate("""() => ({ titulo: document.getElementById('titulo-supervision').textContent, arboles: SRP.supervision.modelo.cifras.arboles,
      jornadas: SRP.supervision.modelo.cifras.jornadas, red: SRP.supervision.modelo.calles.porRed.map(x => [x.red, x.arboles, x.calles]) })""")
    # CSV de la Coordinación, la semana en curso
    pgC.evaluate("SRP.app.mostrarVista('supervision')"); pgC.wait_for_timeout(1500)
    pgC.click('#sup-tipos .chip[data-tipo=semana]'); pgC.wait_for_timeout(2500)
    with pgC.expect_download(timeout=120000) as d2:
        pgC.click('#btn-sup-csv')
    ruta = os.path.join(EV, 'csv_semana_compartida.csv'); d2.value.save_as(ruta)
    filas = list(csv.reader(io.StringIO(open(ruta, encoding='utf-8-sig').read())))
    cab = filas[0]; suyas = [f for f in filas[1:] if 'HIPERVINCULO' in f[cab.index('Jornada')]]
    out['csv'] = [[f[cab.index(k)] for k in ('Jornada', 'Jornada compartida', 'Quién registró', 'Calle', 'Entre calles', 'Red vial', 'Quién atiende la calle')] for f in suyas]
    out['errores'] = err
    json.dump(out, open(os.path.join(EV, 'b3_compartida_real.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    print(json.dumps(out, ensure_ascii=False, indent=1)[:7000])
    b.close()
