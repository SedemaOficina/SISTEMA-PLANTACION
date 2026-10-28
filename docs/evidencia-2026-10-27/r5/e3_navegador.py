"""r5 · E3/B5 en el navegador, con datos reales contra el servicio (app 8125 -> servicio 3125).

Uso:  PYTHONUTF8=1 R5_CLAVE_ARCHIVO=<archivo> python evidencia/e3_navegador.py <corrida> [B1 B2 B3 B5 B6 B7]
Escribe evidencia/salidas/e3_navegador_<corrida>.txt y capturas en evidencia/capturas/.
La Coordinación actúa por la API (lo mismo que manda su teléfono); el cabo de apoyo, en el navegador.
"""
import json
import os
import subprocess
import sys
import time
import urllib.request
import uuid

from playwright.sync_api import sync_playwright

AQUI = os.path.dirname(os.path.abspath(__file__))
RAIZ = os.path.dirname(AQUI)
API = 'http://127.0.0.1:3125/api/srp'
BASE = 'http://127.0.0.1:8125/'
CLAVE = os.environ.get('R5_CLAVE') or open(os.environ['R5_CLAVE_ARCHIVO'], encoding='utf-8').read().strip()
CORRIDA = sys.argv[1] if len(sys.argv) > 1 else '1'
ESCENARIOS = sys.argv[2:] or ['B1', 'B2', 'B3', 'B5', 'B6', 'B7']
HOY = time.strftime('%Y-%m-%d')
ID = lambda n: 'a5a5a5a5-0000-4000-8000-%012d' % n
K = {'coord': ID(2), 'cabo1': ID(3), 'cabo2': ID(4), 'cabo3': ID(5)}
CORREO = {'coord': 'r5.coord@ejemplo.local', 'cabo1': 'r5.cabo1@ejemplo.local', 'cabo2': 'r5.cabo2@ejemplo.local'}
os.makedirs(os.path.join(AQUI, 'salidas'), exist_ok=True)
os.makedirs(os.path.join(AQUI, 'capturas'), exist_ok=True)
LINEAS = []


def log(*xs):
    t = ' '.join(x if isinstance(x, str) else json.dumps(x, ensure_ascii=False) for x in xs)
    LINEAS.append(t)
    print(t, flush=True)
    with open(os.path.join(AQUI, 'salidas', 'e3_navegador_%s.txt' % CORRIDA), 'a', encoding='utf-8') as f:
        f.write(t + '\n')


def apoyo(orden, datos):
    r = subprocess.run(['node', os.path.join('pruebas', 'apoyo_servidor.mjs'), orden], input=json.dumps(datos), capture_output=True, text=True, encoding='utf-8', cwd=RAIZ, timeout=120)
    return json.loads(r.stdout or '{}')


def bitacora(jid):
    js = "import('./evidencia/comun.mjs').then(async m => { const r = await m.leerBase(\"SELECT accion, detalle FROM srp.bitacora WHERE entidad_id = $1 ORDER BY fecha\", [process.argv[1]]); console.log(JSON.stringify(r.map(x => x.accion + ': ' + x.detalle))); process.exit(0); })"
    r = subprocess.run(['node', '-e', js, jid], capture_output=True, text=True, encoding='utf-8', cwd=RAIZ, timeout=60)
    return json.loads(r.stdout or '[]')


def api_entrar(quien):
    req = urllib.request.Request(API + '/acceso/entrar', data=json.dumps({'correo': CORREO[quien], 'contrasena': CLAVE}).encode(), headers={'content-type': 'application/json'})
    with urllib.request.urlopen(req) as r:
        return r.headers['set-cookie'].split(';')[0]


def envios(galleta, ops):
    req = urllib.request.Request(API + '/envios', data=json.dumps({'operaciones': ops}).encode(), headers={'content-type': 'application/json', 'cookie': galleta})
    with urllib.request.urlopen(req) as r:
        return json.loads(r.read())['resultados']


def compartida(gC, nombre, cabos):
    jid = str(uuid.uuid4())
    r = envios(gC, [{'tipo': 'jornada.crear', 'datos': {'id': jid, 'nombre': nombre, 'ubicacion': 'Prueba r5', 'programa_id': 'p-refor', 'lat': 19.357, 'lng': -99.06,
                                                          'punto_origen': 'gps', 'gps_precision_m': 5, 'fecha': HOY, 'arboles_previstos': 10}},
                    {'tipo': 'jornada.compartir', 'datos': {'id': jid, 'agregar': [K[c] for c in cabos], 'quitar': []}}])
    assert all(x['estado'] == 'recibido' for x in r), r
    return jid, r[1]['version']


def config_real(route):
    r = route.fetch()
    route.fulfill(response=r, body=r.text().replace('ES_FICTICIO: true,', 'ES_FICTICIO: false,'))


def telefono(b, quien):
    c = b.new_context(service_workers='block', geolocation={'latitude': 19.357, 'longitude': -99.06, 'accuracy': 5}, permissions=['geolocation'])
    c.route('**/js/config.js*', config_real)
    p = c.new_page()
    errores = []
    p.on('pageerror', lambda e: errores.append(str(e)))
    p.goto(BASE)
    p.wait_for_selector('html[data-listo]')
    p.fill('#acceso-correo', CORREO[quien]); p.fill('#acceso-clave', CLAVE)
    p.click('#form-acceso button[type="submit"]')
    p.wait_for_function("() => !document.getElementById('navegacion').hidden", timeout=30000)
    t0 = time.time()
    try:
        p.wait_for_function("() => ['listo', 'error', 'sin-senal'].includes(SRP.remoto.estado)", timeout=150000)
    except Exception:
        pass
    estado = p.evaluate("() => SRP.remoto.estado")
    if estado != 'listo':
        log('AVISO', quien, 'lo enviado quedó en', estado, 'tras', round(time.time() - t0), 's; se vuelve a pedir')
        p.evaluate("() => SRP.remoto.cargar()")
        p.wait_for_function("() => ['listo', 'error', 'sin-senal'].includes(SRP.remoto.estado)", timeout=150000)
        log('AVISO', quien, 'segunda vez:', p.evaluate("() => SRP.remoto.estado"))
    p.wait_for_timeout(1500)
    if p.evaluate("() => document.getElementById('dlg-confirmar').open"):
        p.click('#btn-confirmar-si'); p.wait_for_timeout(400)
    return c, p, errores


def registrar(p):
    p.evaluate("SRP.app.mostrarVista('registrar')"); p.wait_for_timeout(400)
    p.click('#btn-ubicacion'); p.wait_for_timeout(900)
    p.fill('#campo-especie', 'ahuehu'); p.wait_for_timeout(200)
    p.dispatch_event('.combo-opcion[data-id="ESP-0070"]', 'mousedown'); p.wait_for_timeout(150)
    p.click('#form-plantacion button[type=submit]'); p.wait_for_timeout(800)
    if p.is_visible('#dlg-confirmar'): p.click('#btn-confirmar-si'); p.wait_for_timeout(800)
    if p.is_visible('#dlg-resumen'): p.click('#btn-resumen-guardar'); p.wait_for_timeout(700)
    return p.evaluate("SRP.formulario.estado.ultimoGuardado")


RECHAZOS = """() => [...document.querySelectorAll('#lista-rechazos > li')].map(li => ({ que: li.querySelector('.rechazo-que').textContent,
  porque: li.querySelector('.rechazo-porque').textContent, botones: [...li.querySelectorAll('button')].map(b => b.textContent.trim()) }))"""


def revisar(p, captura):
    p.click('#btn-franja-enviar'); p.wait_for_selector('#dlg-rechazos[open]'); p.wait_for_timeout(400)
    p.screenshot(path=os.path.join(AQUI, 'capturas', captura))
    x = p.evaluate(RECHAZOS)
    p.evaluate("() => document.getElementById('dlg-rechazos').close()")
    return x


def enviar_y_esperar(p):
    p.evaluate("() => SRP.envio.enviar({ manual: true })")
    p.wait_for_timeout(500)
    p.wait_for_function("() => !SRP.envio.enviando", timeout=30000)
    p.wait_for_timeout(500)


def arboles_de(jid, quien):
    return [a for a in apoyo('apoyos', {'id': jid})['arboles'] if a == K[quien]]


def escenario_atorado(b, gC, nombre, que_hace, captura):
    """El cabo de apoyo registra dos árboles sin señal; la Coordinación hace `que_hace`; vuelve la señal; luego la Coordinación lo deshace."""
    jid, v = compartida(gC, 'r5 %s c%s' % (nombre, CORRIDA), ['cabo1'])
    c, p, err = telefono(b, 'cabo1')
    activa = p.evaluate("() => SRP.activa.jornada && SRP.activa.jornada.id") == jid
    c.route('**/api/srp/**', lambda r: r.abort())
    ids = [registrar(p), registrar(p)]
    en_cola = p.evaluate("() => SRP.cola.ops.filter(o => o.tipo === 'registro.crear').length")
    deshacer = que_hace(jid, v)
    c.unroute('**/api/srp/**')
    enviar_y_esperar(p)
    rech = p.evaluate("() => SRP.cola.rechazadas().map(o => o.tipo + ':' + o.rechazo.codigo)")
    ventana = revisar(p, captura)
    deshacer()
    enviar_y_esperar(p)
    p.reload(); p.wait_for_selector('html[data-listo]'); p.wait_for_function("() => !document.getElementById('navegacion').hidden", timeout=30000); p.wait_for_timeout(2500)
    enviar_y_esperar(p)
    rech2 = p.evaluate("() => SRP.cola.rechazadas().map(o => o.tipo + ':' + o.rechazo.codigo)")
    log(nombre, '· jornada activa en el teléfono del cabo:', activa, '· árboles sin señal en la cola:', en_cola, '· al volver la señal:', rech)
    log(nombre, '· «Revisar» dice:', ventana)
    log(nombre, '· después de que la Coordinación lo deshace, enviar otra vez y recargar: rechazados', rech2, '· árboles del cabo en el servidor:', len(arboles_de(jid, 'cabo1')),
        '· estado:', apoyo('apoyos', {'id': jid}))
    log(nombre, '· errores de página:', err[:2])
    c.close()


def main():
    log('== Corrida %s · %s · %s' % (CORRIDA, time.strftime('%Y-%m-%d %H:%M:%S'), ESCENARIOS))
    gC = api_entrar('coord')
    with sync_playwright() as pw:
        b = pw.chromium.launch()

        if 'B1' in ESCENARIOS:
            # B1. La Coordinación cierra la jornada mientras el cabo de apoyo tiene árboles por enviar; después la reabre
            def cerrar(jid, v):
                r = envios(gC, [{'tipo': 'jornada.cerrar', 'datos': {'id': jid, 'version': v}}])
                return lambda: envios(gC, [{'tipo': 'jornada.reabrir', 'datos': {'id': jid, 'version': r[0]['version']}}])
            escenario_atorado(b, gC, 'B1 cierre', cerrar, 'B1_revisar_c%s.png' % CORRIDA)

        if 'B2' in ESCENARIOS:
            # B2. La Coordinación quita al cabo mientras registra sin señal; después lo vuelve a marcar
            def quitar(jid, v):
                envios(gC, [{'tipo': 'jornada.compartir', 'datos': {'id': jid, 'agregar': [], 'quitar': [K['cabo1']]}}])
                return lambda: envios(gC, [{'tipo': 'jornada.compartir', 'datos': {'id': jid, 'agregar': [K['cabo1']], 'quitar': []}}])
            escenario_atorado(b, gC, 'B2 quitar', quitar, 'B2_revisar_c%s.png' % CORRIDA)

        if 'B3' in ESCENARIOS:
            # B3. «Cabos de apoyo» de la Coordinación: el servidor lo aplica, la respuesta se pierde y la señal no vuelve;
            # el cabo termina su parte; la señal vuelve y el teléfono de la Coordinación reenvía lo mismo
            jid, v = compartida(gC, 'r5 B3 respuesta perdida c%s' % CORRIDA, [])
            c, p, err = telefono(b, 'coord')
            p.evaluate("async id => { SRP.app.mostrarVista('jornadas'); await SRP.jornadas.abrir(id); }", jid); p.wait_for_timeout(1500)
            p.click('#btn-jornada-apoyos'); p.wait_for_selector('#dlg-apoyos[open]')
            p.click('#apoyos-cabos .chip[data-id="%s"]' % K['cabo1'])
            veces = {'n': 0}

            def corte(r):
                veces['n'] += 1
                if veces['n'] == 1:
                    r.fetch()   # llega al servicio, que lo aplica
                r.abort()       # y la respuesta no vuelve; después, sin señal
            c.route('**/api/srp/envios', corte)
            p.click('#btn-apoyos-guardar')
            p.wait_for_function("() => SRP.cola.ops.some(o => o.tipo === 'jornada.compartir' && o.enviado) && !SRP.envio.enviando", timeout=30000)
            s1 = apoyo('apoyos', {'id': jid})['apoyos']
            gA = api_entrar('cabo1')
            t = envios(gA, [{'tipo': 'jornada.terminar', 'datos': {'id': jid}}])
            s2 = apoyo('apoyos', {'id': jid})['apoyos']
            c.unroute('**/api/srp/envios')
            enviar_y_esperar(p)
            s3 = apoyo('apoyos', {'id': jid})['apoyos']
            b3 = apoyo('apoyos', {'id': jid})
            log('B3 compartir aplicado sin respuesta:', s1, '· cabo1 termina:', t[0]['estado'], s2, '· vuelve la señal y el teléfono reenvía:', s3, '· intentos de envío cortados:', veces['n'],
                '· cola de la Coordinación:', p.evaluate("() => SRP.cola.ops.map(o => o.tipo)"))
            log('B3 errores de página:', err[:2])
            c.close()

        if 'B5' in ESCENARIOS:
            # B5. Sesión vencida a mitad de la jornada compartida: la Coordinación guarda «Cabos de apoyo» con la sesión vencida
            jid, v = compartida(gC, 'r5 B5 sesión vencida c%s' % CORRIDA, ['cabo1'])
            c, p, err = telefono(b, 'coord')
            p.evaluate("async id => { SRP.app.mostrarVista('jornadas'); await SRP.jornadas.abrir(id); }", jid); p.wait_for_timeout(1500)
            p.click('#btn-jornada-apoyos'); p.wait_for_selector('#dlg-apoyos[open]')
            p.click('#apoyos-cabos .chip[data-id="%s"]' % K['cabo2'])
            apoyo('vencer', {'id': K['coord']})   # la sesión vence con la ventana abierta
            p.click('#btn-apoyos-guardar')
            p.wait_for_timeout(1500); p.evaluate("() => SRP.envio.enviar({ manual: true })"); p.wait_for_timeout(2500)
            estado = p.evaluate("""() => ({ acceso: !document.getElementById('vista-acceso').hidden || document.getElementById('dlg-sesion') && document.getElementById('dlg-sesion').open,
                cola: SRP.cola.ops.map(o => o.tipo + (o.rechazo ? ':' + o.rechazo.codigo : '')), aviso: document.getElementById('aviso').textContent.trim().slice(0, 160) })""")
            p.screenshot(path=os.path.join(AQUI, 'capturas', 'B5_sesion_vencida_c%s.png' % CORRIDA))
            servidor1 = apoyo('apoyos', {'id': jid})['apoyos']
            # Vuelve a entrar con su contraseña donde se la pida
            dialogo = p.evaluate("() => [...document.querySelectorAll('dialog[open]')].map(d => d.id)")
            if p.is_visible('#acceso-correo'):
                p.fill('#acceso-correo', CORREO['coord']); p.fill('#acceso-clave', CLAVE); p.click('#form-acceso button[type="submit"]')
            elif p.is_visible('#sesion-clave'):
                p.fill('#sesion-clave', CLAVE); p.keyboard.press('Enter')
            p.wait_for_timeout(3000); enviar_y_esperar(p)
            servidor2 = apoyo('apoyos', {'id': jid})['apoyos']
            log('B5 con la sesión vencida:', estado, '· ventanas abiertas:', dialogo, '· servidor antes de volver a entrar:', servidor1, '· después:', servidor2,
                '· cola:', p.evaluate("() => SRP.cola.ops.map(o => o.tipo + (o.rechazo ? ':' + o.rechazo.codigo : ''))"))
            log('B5 errores de página:', err[:2])
            c.close()

        if 'B6' in ESCENARIOS:
            gC = api_entrar('coord')   # B5 vence las sesiones de la Coordinación
            # B6. Respuestas raras a jornada.compartir: 502, 409, un «200» que no es del servicio y JSON sin resultados
            jid, v = compartida(gC, 'r5 B6 respuestas raras c%s' % CORRIDA, [])
            c, p, err = telefono(b, 'coord')
            p.evaluate("async id => { SRP.app.mostrarVista('jornadas'); await SRP.jornadas.abrir(id); }", jid); p.wait_for_timeout(1500)
            casos = [('502', 502, 'text/html', '<html>Bad gateway</html>'), ('409', 409, 'application/json', '{"codigo":"CONFLICTO","mensaje":"Conflicto de prueba."}'),
                     ('200 portal', 200, 'text/html', '<html><body>Portal de la red</body></html>'), ('200 sin resultados', 200, 'application/json', '{"ok":true}'),
                     ('200 resultados vacíos', 200, 'application/json', '{"resultados":[]}')]
            p.click('#btn-jornada-apoyos'); p.wait_for_selector('#dlg-apoyos[open]')
            p.click('#apoyos-cabos .chip[data-id="%s"]' % K['cabo1'])
            c.route('**/api/srp/envios', lambda r: r.abort())
            p.click('#btn-apoyos-guardar'); p.wait_for_timeout(1500)
            c.unroute('**/api/srp/envios')
            for nombre, st, tipo, cuerpo in casos:
                c.route('**/api/srp/envios', (lambda st, tipo, cuerpo: (lambda r: r.fulfill(status=st, content_type=tipo, body=cuerpo)))(st, tipo, cuerpo))
                p.evaluate("() => { document.getElementById('aviso').textContent = ''; }")
                p.evaluate("() => SRP.envio.enviar({ manual: true })"); p.wait_for_timeout(1200)
                x = p.evaluate("""() => ({ aviso: document.getElementById('aviso').textContent.trim().slice(0, 200), cola: SRP.cola.ops.map(o => o.tipo + (o.rechazo ? ':' + o.rechazo.codigo : '') + (o.enviado ? ':salió' : '')),
                    pastilla: document.getElementById('conexion').textContent.trim().replace(/\\s+/g, ' ') })""")
                log('B6', nombre, '→', x)
                c.unroute('**/api/srp/envios')
            enviar_y_esperar(p)
            log('B6 con el servicio de vuelta:', apoyo('apoyos', {'id': jid})['apoyos'], '· cola:', p.evaluate("() => SRP.cola.ops.map(o => o.tipo + (o.rechazo ? ':' + o.rechazo.codigo : ''))"),
                '· errores de página:', err[:2])
            c.close()

        if 'B7' in ESCENARIOS:
            gC = api_entrar('coord')   # B5 vence las sesiones de la Coordinación
            # B7. Doble toque: «Guardar» de cabos de apoyo, «Iniciar jornada compartida» y «Terminar mi parte»
            jid, v = compartida(gC, 'r5 B7 doble toque c%s' % CORRIDA, ['cabo1'])
            c, p, err = telefono(b, 'coord')
            p.evaluate("async id => { SRP.app.mostrarVista('jornadas'); await SRP.jornadas.abrir(id); }", jid); p.wait_for_timeout(1500)
            p.click('#btn-jornada-apoyos'); p.wait_for_selector('#dlg-apoyos[open]')
            p.click('#apoyos-cabos .chip[data-id="%s"]' % K['cabo2'])
            p.dblclick('#btn-apoyos-guardar'); p.wait_for_timeout(2500)
            enviar_y_esperar(p)
            bit = apoyo('apoyos', {'id': jid})
            # Iniciar jornada compartida con doble toque
            p.evaluate("SRP.app.mostrarVista('registrar')"); p.wait_for_timeout(600)
            if p.is_hidden('#panel-iniciar-jornada'):
                p.click('#btn-jornada-cambiar'); p.wait_for_timeout(200); p.click('#btn-cambiar-nueva'); p.wait_for_timeout(300)
            nombre = 'r5 B7 iniciar doble c%s %s' % (CORRIDA, time.strftime('%H%M%S'))
            p.fill('#ini-nombre', nombre); p.fill('#ini-fecha', HOY); p.select_option('#ini-programa', 'p-refor'); p.fill('#ini-meta', '10')
            p.click('#btn-ini-detectar'); p.wait_for_timeout(1200)
            p.click('#ini-quien .chip[data-quien="varios"]'); p.click('#ini-apoyos .chip[data-id="%s"]' % K['cabo1'])
            p.dblclick('#btn-iniciar-jornada'); p.wait_for_timeout(2500)
            enviar_y_esperar(p)
            locales = p.evaluate("n => SRP.almacen.todos('jornadas').then(js => js.filter(j => j.nombre === n).length)", nombre)
            log('B7 bitácora de la jornada tras doble toque en «Guardar»:', bitacora(jid))
            log('B7 doble toque en «Guardar»: servidor', bit['apoyos'], '· jornadas con ese nombre tras doble toque en «Iniciar jornada compartida»:', locales,
                '· cola:', p.evaluate("() => SRP.cola.ops.map(o => o.tipo)"), '· errores:', err[:2])
            c.close()
            # «Terminar mi parte» con doble toque, desde el teléfono del cabo
            c, p, err = telefono(b, 'cabo1')
            p.evaluate("async id => { SRP.activa.jornada = await SRP.almacen.uno('jornadas', id); SRP.app.mostrarVista('registrar'); await SRP.activa.preparar(); }", jid); p.wait_for_timeout(800)
            log('B7 jornada activa del cabo:', p.evaluate("() => SRP.activa.jornada && SRP.activa.jornada.nombre"), '· botón:', p.inner_text('#btn-jornada-cerrar'))
            p.dblclick('#btn-jornada-cerrar'); p.wait_for_timeout(600)
            abiertas = p.evaluate("() => [...document.querySelectorAll('dialog[open]')].map(d => d.id)")
            if p.is_visible('#btn-confirmar-si'): p.dblclick('#btn-confirmar-si')
            p.wait_for_timeout(1500); enviar_y_esperar(p)
            bit2 = apoyo('apoyos', {'id': jid})
            log('B7 doble toque en «Terminar mi parte»: ventanas', abiertas, '· servidor', bit2['apoyos'], '· errores:', err[:2])
            log('B7 bitácora tras «Terminar mi parte» con doble toque:', [x for x in bitacora(jid) if 'Terminó' in x])
            c.close()
        b.close()


if __name__ == '__main__':
    main()
