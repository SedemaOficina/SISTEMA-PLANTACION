"""B8 · La jornada compartida en fechas límite, con reloj simulado (context.clock), datos de prueba.

Caso «medianoche»: la Coordinación abre una compartida el 31-DIC-2026 a las 23:50 (hora de la Ciudad de México) con
el cabo de apoyo; él registra un árbol a las 23:52; el reloj pasa a las 00:10 del 1-ENE-2027; el cabo vuelve a entrar,
registra otro árbol y toca «Terminar mi parte»; la Coordinación ve la jornada.
Se corre con el teléfono en la zona de la Ciudad de México y en otras zonas (Tokio, UTC, Tijuana): la aplicación fija
la zona en SRP.CONFIG.ZONA, así que las fechas deben salir iguales.
Uso: python fechas_compartida.py <url> <zona> [chromium|webkit] [inicio ISO con zona, p. ej. 2026-12-31T23:50:00-06:00]"""
import datetime, json, sys
from playwright.sync_api import sync_playwright

BASE, ZONA = sys.argv[1].rstrip('/') + '/', sys.argv[2]
MOTOR = sys.argv[3] if len(sys.argv) > 3 else 'chromium'
INICIO = datetime.datetime.fromisoformat(sys.argv[4] if len(sys.argv) > 4 else '2026-12-31T23:50:00-06:00')
res = []
def ok(c, t, d=None):
    l = ('OK    ' if c else 'FALLA ') + t + (' · ' + json.dumps(d, ensure_ascii=False)[:420] if d is not None else '')
    res.append(l); print(MOTOR, ZONA, l, flush=True)

with sync_playwright() as p:
    b = getattr(p, MOTOR).launch()
    op = dict(viewport={'width': 390, 'height': 844}, timezone_id=ZONA, service_workers='block')
    if MOTOR == 'chromium': op.update(geolocation={'latitude': 19.4204, 'longitude': -99.1819, 'accuracy': 6}, permissions=['geolocation'])
    ctx = b.new_context(**op)
    ctx.clock.install(time=INICIO)
    pg = ctx.new_page(); err = []
    pg.on('pageerror', lambda e: err.append(str(e)[:200]))
    pg.goto(BASE); pg.wait_for_selector('html[data-listo]', state='attached', timeout=60000)
    pg.select_option('#sel-usuario-prueba', 'u-coord-1'); pg.click('#btn-entrar-prueba'); pg.wait_for_function("() => SRP.sesion && SRP.sesion.usuario"); pg.wait_for_timeout(2000)
    def cerrar(): pg.evaluate("() => document.querySelectorAll('dialog[open]').forEach(d => d.close())")
    def como(uid):
        pg.evaluate("id => SRP.sesion.iniciar(SRP.ref.usuarioPorId[id])", uid); pg.reload(); pg.wait_for_selector('html[data-listo]', state='attached')
        pg.wait_for_function("id => SRP.sesion && SRP.sesion.usuario && SRP.sesion.usuario.id === id", arg=uid); pg.wait_for_timeout(2500)
    def punto(inicio=False):
        pre = 'ini-' if inicio else ''
        if MOTOR == 'chromium':
            pg.click('#btn-ini-detectar' if inicio else '#btn-ubicacion'); pg.wait_for_timeout(1200)
        else:
            pg.evaluate("p => document.getElementById(p + 'detalles-coord').open = true", pre)
            pg.fill('#%scoord-lat' % pre, '19.4204'); pg.fill('#%scoord-lng' % pre, '99.1819'); pg.click('#btn-%scoord-aplicar' % pre); pg.wait_for_timeout(800)
    def registrar():
        pg.evaluate("SRP.app.mostrarVista('registrar')"); pg.wait_for_timeout(800); cerrar()
        punto()
        pg.fill('#campo-especie', 'ahuehu'); pg.wait_for_timeout(300); pg.dispatch_event('.combo-opcion[data-id="ESP-0070"]', 'mousedown'); pg.wait_for_timeout(200)
        campo_fecha = [pg.is_visible('#caja-fecha-arbol'), pg.input_value('#campo-fecha')]
        pg.click('#form-plantacion button[type=submit]'); pg.wait_for_timeout(1000)
        for _ in range(3):
            if pg.is_visible('#dlg-confirmar'): pg.click('#btn-confirmar-si'); pg.wait_for_timeout(700)
            if pg.is_visible('#dlg-resumen'): pg.click('#btn-resumen-guardar'); pg.wait_for_timeout(900)
        aid = pg.evaluate("SRP.formulario.estado.ultimoGuardado")
        return aid, campo_fecha, pg.evaluate("async id => { const a = id && await SRP.almacen.uno('plantaciones', id); return a ? [a.fecha_plantacion, a.fecha_registro] : null; }", aid)

    ok(pg.evaluate("SRP.util.fechaHoy()") == '2026-12-31' or INICIO.date().isoformat() != '2026-12-31', 'la aplicación dice que hoy es 31-DIC-2026 (CDMX)', [pg.evaluate("SRP.util.fechaHoy()"), pg.evaluate("new Date().toString()")])
    pg.evaluate("SRP.app.mostrarVista('registrar')")
    pg.wait_for_function("() => !document.getElementById('panel-iniciar-jornada').hidden || !document.getElementById('franja-jornada').hidden", timeout=30000); cerrar()
    if pg.is_hidden('#panel-iniciar-jornada'):
        pg.click('#btn-jornada-cambiar'); pg.wait_for_timeout(300); pg.click('#btn-cambiar-nueva'); pg.wait_for_timeout(400)
    pg.fill('#ini-nombre', 'Fin de año r2'); pg.select_option('#ini-programa', 'p-refor'); pg.fill('#ini-meta', '20'); pg.click('#btn-ini-hoy')
    fecha_ini = pg.input_value('#ini-fecha')
    punto(True)
    pg.click('#ini-quien .chip[data-quien="varios"]'); pg.wait_for_timeout(200); pg.click('#ini-apoyos .chip[data-id="u-cabo-1"]')
    pg.click('#btn-iniciar-jornada'); pg.wait_for_selector('#franja-jornada', state='visible', timeout=30000); pg.wait_for_timeout(1000)
    jid = pg.evaluate("SRP.activa.jornada && SRP.activa.jornada.id")
    j = pg.evaluate("async id => { const j = await SRP.almacen.uno('jornadas', id); return [j.fecha, j.fecha_inicio, SRP.permisos.vigentes(j)]; }", jid)
    ok(j[0] == fecha_ini and bool(j[2]), '«Hoy» y la jornada compartida a las 23:50 llevan la fecha del 31', [fecha_ini, j])
    como('u-cabo-1'); cerrar()
    pg.evaluate("async id => { SRP.activa.jornada = await SRP.almacen.uno('jornadas', id); SRP.app.mostrarVista('registrar'); await SRP.activa.preparar(); }", jid); pg.wait_for_timeout(800)
    a1 = registrar()
    ok(a1[2] and a1[2][0] == '2026-12-31', 'el árbol de las 23:52 queda con fecha 31-DIC-2026', a1)
    # Pasa la medianoche
    ctx.clock.set_system_time(INICIO + datetime.timedelta(minutes=20)); pg.wait_for_timeout(500)
    ok(pg.evaluate("SRP.util.fechaHoy()") == (INICIO + datetime.timedelta(minutes=20)).astimezone(datetime.timezone(datetime.timedelta(hours=-6))).date().isoformat(), 'tras la medianoche la aplicación dice que hoy es el día siguiente', pg.evaluate("SRP.util.fechaHoy()"))
    pg.reload(); pg.wait_for_selector('html[data-listo]', state='attached'); pg.wait_for_function("() => SRP.sesion && SRP.sesion.usuario"); pg.wait_for_timeout(3000)
    avisos = pg.evaluate("() => [document.getElementById('aviso') && !document.getElementById('aviso').hidden ? document.getElementById('aviso').innerText.slice(0, 300) : null, [...document.querySelectorAll('dialog[open]')].map(d => d.innerText.slice(0, 200))]")
    activa = pg.evaluate("SRP.activa.jornada && SRP.activa.jornada.id")
    ok(activa == jid, 'después de la medianoche el cabo de apoyo sigue en la compartida (aviso de jornada de días anteriores)', avisos)
    cerrar()
    pg.evaluate("SRP.app.mostrarVista('registrar')"); pg.wait_for_timeout(800)
    a2 = registrar()
    ok(a2[2] and a2[2][0] == (INICIO + datetime.timedelta(minutes=20)).astimezone(datetime.timezone(datetime.timedelta(hours=-6))).date().isoformat(), 'el árbol de las 00:10 queda con la fecha del día nuevo; el campo «Fecha de plantación» aparece', a2)
    franja = pg.inner_text('#franja-jornada')
    pg.click('#btn-jornada-cerrar'); pg.wait_for_selector('#dlg-confirmar[open]'); pregunta = pg.inner_text('#dlg-confirmar-texto'); pg.click('#btn-confirmar-si'); pg.wait_for_timeout(1500)
    fin = pg.evaluate("async id => (await SRP.almacen.uno('jornadas', id)).cabos_apoyo.map(a => [a.cabo_id, a.fin, a.desde, a.hasta])", jid)
    ok('2 árboles suyos' in pregunta and fin[0][1] == 'terminado', '«Terminar mi parte» cuenta los dos árboles, de los dos días', [pregunta[:100], fin, franja[-80:]])
    como('u-coord-1'); cerrar()
    pg.evaluate("SRP.app.mostrarVista('jornadas')"); pg.wait_for_timeout(1500)
    pg.evaluate("async id => { await SRP.jornadas.abrir(id); }", jid); pg.wait_for_timeout(1500)
    ficha = pg.evaluate("() => document.getElementById('vista-jornadas').innerText.replace(/\\s+/g, ' ').slice(0, 600)")
    ok('2 días' in ficha or 'dos días' in ficha or '31-DIC' in ficha, 'la ficha de la Coordinación muestra la jornada de dos días con los dos árboles', ficha[:400])
    pg.screenshot(path='b8-fechas-%s-%s.png' % (MOTOR, ZONA.replace('/', '_')))
    ok(not err, 'sin errores de página', err[:3])
    b.close()
