"""B8 · El flujo principal en modo real, en Chromium y en WebKit (el motor de Safari): entrar, iniciar jornada,
registrar un árbol con fotografía, que se envíe, cerrar la jornada; y, como Administración, Usuarios, Catálogos
y Parámetros. Dos vueltas por motor. Uso: python motores.py <chromium|webkit>"""
import json, os, sys, tempfile, time
from PIL import Image
from playwright.sync_api import sync_playwright
MOTOR = sys.argv[1]
C = json.load(open(r'C:\sia-rev\tmp\herr\cuentas-real.json', encoding='utf-8'))
CABO = [c for c in C if c['perfil'] == 'CABO'][0]; ADMIN = [c for c in C if c['perfil'] == 'ADMIN'][0]
HOY = time.strftime('%Y-%m-%d')
foto = os.path.join(tempfile.gettempdir(), 'aud-motor.jpg'); Image.new('RGB', (64, 48), (40, 120, 60)).save(foto, 'JPEG')

def entrar(pg, c):
    pg.goto('http://127.0.0.1:8090/'); pg.wait_for_selector('html[data-listo]', state='attached', timeout=60000)
    pg.fill('#acceso-correo', c['correo']); pg.fill('#acceso-clave', c['clave']); pg.click('#form-acceso button[type="submit"]')
    pg.wait_for_function("() => !document.getElementById('navegacion').hidden", timeout=90000); pg.wait_for_timeout(1500)

with sync_playwright() as p:
    b = getattr(p, MOTOR).launch()
    for vuelta in (1, 2):
        res = []
        ok = lambda cond, t: res.append(('OK   ' if cond else 'FALLA') + ' ' + t)
        ctx = b.new_context(viewport={'width': 390, 'height': 844}, service_workers='block',
                            **({'geolocation': {'latitude': 19.357, 'longitude': -99.06, 'accuracy': 5}, 'permissions': ['geolocation']} if MOTOR == 'chromium' else {}))
        pg = ctx.new_page(); err = []
        pg.on('pageerror', lambda e: err.append(str(e)[:150]))
        entrar(pg, CABO)
        ok(pg.evaluate("SRP.sesion.usuario && SRP.sesion.usuario.perfil") == 'CABO', 'el cabo entra')
        pg.evaluate("SRP.app.mostrarVista('registrar')"); pg.wait_for_timeout(600)
        if pg.is_hidden('#panel-iniciar-jornada'):
            pg.click('#btn-jornada-cambiar'); pg.wait_for_timeout(200); pg.click('#btn-cambiar-nueva'); pg.wait_for_timeout(300)
        pg.fill('#ini-nombre', 'Auditoria motor %s %d' % (MOTOR, vuelta)); pg.fill('#ini-fecha', HOY); pg.select_option('#ini-programa', 'p-refor'); pg.fill('#ini-meta', '2')
        # WebKit de Playwright no da ubicación: se escribe a mano, como quien no tiene GPS
        if MOTOR == 'chromium':
            pg.click('#btn-ini-detectar'); pg.wait_for_timeout(1500)
        else:
            pg.evaluate("document.getElementById('ini-detalles-coord').open = true")
            pg.fill('#ini-coord-lat', '19.357'); pg.fill('#ini-coord-lng', '99.06'); pg.click('#btn-ini-coord-aplicar'); pg.wait_for_timeout(800)
        pg.click('#btn-iniciar-jornada'); pg.wait_for_timeout(1200)
        jid = pg.evaluate("SRP.activa.jornada && SRP.activa.jornada.id")
        ok(bool(jid), 'inicia la jornada')
        if MOTOR == 'chromium':
            pg.click('#btn-ubicacion'); pg.wait_for_timeout(1000)
        else:
            pg.evaluate("document.getElementById('detalles-coord').open = true")
            pg.fill('#coord-lat', '19.3571'); pg.fill('#coord-lng', '99.0601'); pg.click('#btn-coord-aplicar'); pg.wait_for_timeout(800)
        pg.fill('#campo-especie', 'ahuehu'); pg.wait_for_timeout(300); pg.dispatch_event('.combo-opcion[data-id="ESP-0070"]', 'mousedown'); pg.wait_for_timeout(200)
        pg.set_input_files('#foto-archivo', foto); pg.wait_for_timeout(1200)
        pg.click('#form-plantacion button[type=submit]'); pg.wait_for_timeout(1000)
        if pg.is_visible('#dlg-confirmar'): pg.click('#btn-confirmar-si'); pg.wait_for_timeout(800)
        if pg.is_visible('#dlg-resumen'): pg.click('#btn-resumen-guardar'); pg.wait_for_timeout(900)
        aid = pg.evaluate("SRP.formulario.estado.ultimoGuardado")
        ok(bool(aid), 'guarda el árbol con su fotografía' + ('' if aid else ': ' + pg.evaluate("document.getElementById('form-errores') ? document.getElementById('form-errores').textContent.slice(0, 160) : ''")))
        try:
            pg.wait_for_function("() => SRP.cola.ops.length === 0 && !SRP.envio.enviando", timeout=60000); enviado = True
        except Exception: enviado = False
        ok(enviado, 'la cola se vacía: llegó al servidor, con la fotografía')
        pg.evaluate("async id => { const j = await SRP.almacen.uno('jornadas', id); if (j) await SRP.activa.cambiarEstatus(j, 'cerrada'); }", jid); pg.wait_for_timeout(1500)
        ok(pg.evaluate("async id => { const j = await SRP.almacen.uno('jornadas', id); return j && j.estatus; }", jid) == 'cerrada', 'cierra la jornada')
        ctx.close()
        # La Administración, en computadora
        ctx = b.new_context(viewport={'width': 1440, 'height': 900}, service_workers='block'); pg = ctx.new_page(); pg.on('pageerror', lambda e: err.append(str(e)[:150]))
        entrar(pg, ADMIN)
        pg.wait_for_function("() => SRP.remoto.estado === 'listo'", timeout=180000)
        for v, sel in [('usuarios', '#vista-usuarios'), ('catalogos', '#tabla-catalogo tbody tr'), ('parametros', '#vista-parametros'), ('supervision', '#vista-supervision .sup-cifra'), ('jornadas', '#lista-jornadas .jornada'), ('registros', '#vista-registros')]:
            pg.evaluate("v => SRP.app.mostrarVista(v)", v); pg.wait_for_timeout(2500)
            ok(pg.evaluate("v => SRP.app.vista === v", v) and pg.locator(sel).count() > 0, 'la Administración abre %s' % v)
        ok(not err, 'sin errores de página: %s' % err[:3])
        ctx.close()
        print('%s vuelta %d' % (MOTOR, vuelta)); print('\n'.join('   ' + r for r in res))
    b.close()
