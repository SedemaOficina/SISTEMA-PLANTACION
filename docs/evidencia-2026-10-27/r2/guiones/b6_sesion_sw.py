"""B6 · Dos casos con datos reales (copia de producción, servicio con srp_api):
  SESION: en horizontal (844×390), el cabo 2 se queda sin señal, su sesión vence en el servidor, registra un árbol y
          vuelve la señal: ¿qué le pide la pantalla? Entra otra vez: ¿llega el árbol una sola vez?
  SW:     instalar con red (sw.js, versión 1.4.2) → sin red sale una versión nueva (1.4.3-r2, copia con otra marca) y
          la app abre sin red con la guardada, con un árbol pendiente → vuelve la red: ¿se instala la nueva entera, sin
          mezclar archivos, y el pendiente llega?
El caso SW levanta su propio servidor de la app en el puerto 8142 (el de la app real de r2 sigue en 8122).
Uso: python b6_sesion_sw.py <sesion|sw> <vuelta>"""
import json, os, shutil, subprocess, sys, tempfile, time
from PIL import Image
from playwright.sync_api import sync_playwright

CASO, VUELTA = sys.argv[1], sys.argv[2]
RAIZ = os.path.join('C:' + os.sep, 'sia-rev', 'tmp', 'aud1027', 'r2')
EVI = os.path.join(RAIZ, 'evidencia'); SALIDA = os.path.join(EVI, 'b6'); os.makedirs(SALIDA, exist_ok=True)
C = {c['correo'].split('@')[0].split('.')[1]: c for c in json.load(open(os.path.join(RAIZ, 'cuentas-r2.json'), encoding='utf-8'))}
CABO = C['cabo2']
def ok(c, t, d=None):
    print(CASO, VUELTA, ('OK    ' if c else 'FALLA ') + t + (' · ' + json.dumps(d, ensure_ascii=False)[:500] if d is not None else ''), flush=True)
def apoyo(orden, d):
    r = subprocess.run(['node', 'pruebas/apoyo_servidor.mjs', orden], input=json.dumps(d), capture_output=True, text=True, cwd=RAIZ, encoding='utf-8')
    return json.loads(r.stdout or '{}')
def psql(sql):
    r = subprocess.run([os.path.join('C:' + os.sep, 'Program Files', 'PostgreSQL', '17', 'bin', 'psql.exe'), '-w', '-h', '127.0.0.1', '-U', 'srp_local_admin', '-d', 'srp_local', '-At'],
                       input=sql, capture_output=True, text=True, encoding='utf-8', env=dict(os.environ, PGCLIENTENCODING='UTF8'))
    return r.stdout.strip()

def entrar(pg, base):
    pg.goto(base); pg.wait_for_selector('html[data-listo]', state='attached', timeout=60000)
    pg.fill('#acceso-correo', CABO['correo']); pg.fill('#acceso-clave', CABO['clave']); pg.click('#form-acceso button[type="submit"]')
    pg.wait_for_function("() => !document.getElementById('navegacion').hidden", timeout=90000); pg.wait_for_function("() => SRP.remoto.listo()", timeout=240000); pg.wait_for_timeout(2000)
    pg.evaluate("() => document.querySelectorAll('dialog[open]').forEach(d => d.close())")

def jornada(pg):
    pg.evaluate("SRP.app.mostrarVista('registrar')")
    pg.wait_for_function("() => !document.getElementById('panel-iniciar-jornada').hidden || !document.getElementById('franja-jornada').hidden", timeout=30000)
    pg.evaluate("() => document.querySelectorAll('dialog[open]').forEach(d => d.close())")
    if pg.is_visible('#panel-iniciar-jornada'):
        pg.fill('#ini-nombre', 'B6 r2 %s %s' % (CASO, VUELTA)); pg.select_option('#ini-programa', 'p-refor'); pg.fill('#ini-meta', '5'); pg.click('#btn-ini-hoy')
        pg.click('#btn-ini-detectar'); pg.wait_for_timeout(1500); pg.click('#btn-iniciar-jornada'); pg.wait_for_selector('#franja-jornada', state='visible', timeout=30000); pg.wait_for_timeout(1000)
        pg.wait_for_function("() => SRP.cola.ops.filter(o => !o.rechazo).length === 0 && !SRP.envio.enviando", timeout=60000)

def registrar(pg):
    pg.evaluate("SRP.app.mostrarVista('registrar')"); pg.wait_for_timeout(800); pg.evaluate("() => document.querySelectorAll('dialog[open]').forEach(d => d.close())")
    pg.click('#btn-ubicacion'); pg.wait_for_timeout(1500)
    pg.fill('#campo-especie', 'ahuehu'); pg.wait_for_timeout(300); pg.dispatch_event('.combo-opcion[data-id="ESP-0070"]', 'mousedown'); pg.wait_for_timeout(200)
    pg.click('#form-plantacion button[type=submit]'); pg.wait_for_timeout(1000)
    for _ in range(3):
        if pg.is_visible('#dlg-confirmar'): pg.click('#btn-confirmar-si'); pg.wait_for_timeout(800)
        if pg.is_visible('#dlg-resumen'): pg.click('#btn-resumen-guardar'); pg.wait_for_timeout(1000)
    return pg.evaluate("SRP.formulario.estado.ultimoGuardado")

GEO = dict(geolocation={'latitude': 19.4204, 'longitude': -99.1819, 'accuracy': 6}, permissions=['geolocation'], timezone_id='America/Mexico_City', locale='es-MX')
with sync_playwright() as p:
    b = p.chromium.launch()
    if CASO == 'sesion':
        BASE = 'http://127.0.0.1:8122/'
        ctx = b.new_context(viewport={'width': 844, 'height': 390}, service_workers='block', **GEO); pg = ctx.new_page(); err = []
        pg.on('pageerror', lambda e: err.append(str(e)[:200]))
        entrar(pg, BASE); jornada(pg)
        ctx.set_offline(True); pg.wait_for_timeout(800)
        ok(apoyo('vencer', {'id': CABO['id']}).get('ok'), 'la sesión del cabo vence en el servidor mientras está sin señal')
        aid = registrar(pg)
        ok(bool(aid) and pg.evaluate("() => SRP.cola.ops.length") >= 1, 'sin señal y con la sesión vencida, el árbol se guarda en el teléfono', aid)
        ctx.set_offline(False); pg.evaluate("() => { window.dispatchEvent(new Event('online')); SRP.envio.enviar && SRP.envio.enviar(); }"); pg.wait_for_timeout(8000)
        estado = pg.evaluate("""() => ({ acceso: !document.getElementById('vista-acceso').hidden, nav: !document.getElementById('navegacion').hidden,
          dialogos: [...document.querySelectorAll('dialog[open]')].map(d => d.id + ': ' + d.innerText.replace(/\\s+/g, ' ').slice(0, 200)),
          aviso: !document.getElementById('aviso').hidden ? document.getElementById('aviso').innerText.slice(0, 200) : null, conexion: document.getElementById('conexion').innerText,
          cola: SRP.cola.ops.map(o => [o.tipo, o.rechazo && o.rechazo.codigo]), desborde: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1 })""")
        pg.screenshot(path=os.path.join(SALIDA, 'sesion-vencida-horizontal-%s.png' % VUELTA))
        ok(estado['acceso'] or any('sesi' in d.lower() for d in estado['dialogos']) or (estado['aviso'] and 'sesi' in estado['aviso'].lower()), 'con señal, la pantalla dice que la sesión venció y pide entrar', estado)
        # entra otra vez: ¿llega una sola vez?
        if pg.is_visible('#acceso-correo'):
            pg.fill('#acceso-correo', CABO['correo']); pg.fill('#acceso-clave', CABO['clave']); pg.click('#form-acceso button[type="submit"]')
        elif pg.locator('dialog[open] input[type=password]').count():
            pg.fill('dialog[open] input[type=password]', CABO['clave']); pg.click('dialog[open] button[type=submit]')
        pg.wait_for_timeout(3000)
        try: pg.wait_for_function("() => SRP.cola.ops.filter(o => !o.rechazo).length === 0 && !SRP.envio.enviando", timeout=60000)
        except Exception: pass
        n = psql("select count(*) from srp.plantaciones where id = '%s';" % aid)
        ok(n == '1', 'después de entrar otra vez, el árbol llega una sola vez al servidor', {'en_servidor': n, 'cola': pg.evaluate("() => SRP.cola.ops.map(o => [o.tipo, o.rechazo && o.rechazo.codigo])"), 'errores': err[:2]})
        pg.screenshot(path=os.path.join(SALIDA, 'sesion-vencida-horizontal-despues-%s.png' % VUELTA))
    else:
        PUERTO = 8142; BASE = 'http://127.0.0.1:%d/' % PUERTO
        v1 = os.path.join(EVI, 'app-produccion'); v2 = os.path.join(EVI, 'app-produccion-v2')
        if not os.path.isdir(v2):
            shutil.copytree(v1, v2)
            i = os.path.join(v2, 'index.html'); t = open(i, encoding='utf-8').read(); open(i, 'w', encoding='utf-8', newline='').write(t.replace('?v=1.4.2', '?v=1.4.3-r2'))
        import atexit
        PROCESOS = []
        atexit.register(lambda: [x.terminate() for x in PROCESOS])   # que ningún servidor de 8142 quede vivo si algo falla
        def servir(raiz):
            PROCESOS.append(subprocess.Popen([sys.executable, 'pruebas/servir.py', str(PUERTO), '--api', 'http://127.0.0.1:3122', '--raiz', raiz], cwd=RAIZ, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL))
            return PROCESOS[-1]
        s = servir(v1); time.sleep(2)
        ctx = b.new_context(viewport={'width': 390, 'height': 844}, service_workers='allow', **GEO); pg = ctx.new_page(); err = []
        pg.on('pageerror', lambda e: err.append(str(e)[:200]))
        entrar(pg, BASE)
        pg.wait_for_function("async () => (await caches.keys()).includes('srp-1.4.2') && !!navigator.serviceWorker.controller", timeout=120000)
        ok(True, '1. con red se instala la 1.4.2 y su caché', pg.evaluate("async () => [await caches.keys(), (await (await caches.open('srp-1.4.2')).keys()).length]"))
        jornada(pg)
        # 2. sin red; en el servidor ya está la versión nueva
        ctx.set_offline(True); s.terminate(); s.wait(); s = servir(v2); time.sleep(2)
        pg.reload(); pg.wait_for_selector('html[data-listo]', state='attached', timeout=60000); pg.wait_for_timeout(2500)
        pg.evaluate("() => document.querySelectorAll('dialog[open]').forEach(d => d.close())")
        ok(pg.evaluate("SRP.CONFIG.VERSION") == '1.4.2' and pg.evaluate("!!SRP.sesion.usuario"), '2. sin red abre la 1.4.2 guardada, con la sesión', pg.evaluate("SRP.CONFIG.VERSION"))
        pg.evaluate("SRP.app.mostrarVista('registrar')"); pg.wait_for_timeout(2500)
        diag = pg.evaluate("() => ({ panel: !document.getElementById('panel-iniciar-jornada').hidden, franja: !document.getElementById('franja-jornada').hidden, activa: SRP.activa.jornada && SRP.activa.jornada.nombre, vista: SRP.app.vista, ubicacion: !!document.getElementById('btn-ubicacion').offsetParent, remoto: SRP.remoto.estado })")
        pg.screenshot(path=os.path.join(SALIDA, 'sw-sin-red-registrar-%s.png' % VUELTA))
        ok(diag['franja'] and diag['ubicacion'], '2. sin red, Nuevo registro sigue en la jornada abierta', diag)
        aid = registrar(pg) if diag['ubicacion'] else None
        ok(bool(aid), '2. sin red registra un árbol pendiente', aid)
        # 3. vuelve la red
        ctx.set_offline(False); pg.evaluate("() => window.dispatchEvent(new Event('online'))"); t0 = time.time()
        try:
            pg.wait_for_function("async () => (await caches.keys()).includes('srp-1.4.3-r2')", timeout=120000)
            instalada = round(time.time() - t0, 1)
        except Exception:
            instalada = None
        pg.wait_for_timeout(5000)
        try: pg.wait_for_selector('html[data-listo]', state='attached', timeout=60000)
        except Exception: pass
        pg.wait_for_timeout(3000)
        estado = pg.evaluate("""async () => ({ version: SRP.CONFIG.VERSION, caches: await caches.keys(),
          mezcla: [...new Set([...document.querySelectorAll('script[src], link[href]')].map(e => (e.src || e.href).split('?v=')[1]).filter(Boolean))],
          aviso: !document.getElementById('aviso').hidden ? document.getElementById('aviso').innerText.slice(0, 160) : null,
          cola: SRP.cola.ops.length, sesion: !!SRP.sesion.usuario })""")
        ok(instalada is not None, '3. con red se instala la versión nueva (segundos)', instalada)
        if estado['version'] != '1.4.3-r2':
            pg.reload(); pg.wait_for_selector('html[data-listo]', state='attached', timeout=60000); pg.wait_for_timeout(4000)
            estado['tras_recargar'] = pg.evaluate("async () => ({ version: SRP.CONFIG.VERSION, caches: await caches.keys(), mezcla: [...new Set([...document.querySelectorAll('script[src], link[href]')].map(e => (e.src || e.href).split('?v=')[1]).filter(Boolean))] })")
        ok(True, '3. lo que queda: versión, cachés, marcas de los archivos cargados, aviso', estado)
        try: pg.wait_for_function("() => SRP.cola.ops.filter(o => !o.rechazo).length === 0 && !SRP.envio.enviando", timeout=60000)
        except Exception: pass
        n = psql("select count(*) from srp.plantaciones where id = '%s';" % aid) if aid else 'sin árbol'
        ok(n == '1', '3. el árbol pendiente de la versión vieja llega una vez al servidor', {'en_servidor': n, 'errores': err[:3]})
        pg.screenshot(path=os.path.join(SALIDA, 'sw-ciclo-%s.png' % VUELTA))
        ctx.close(); s.terminate()
    b.close()
