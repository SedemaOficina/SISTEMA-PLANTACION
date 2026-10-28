"""r5 · B5/E3 en el navegador, datos reales: inyección en el nombre de la jornada compartida, catálogos dañados y el reloj
del teléfono un día adelante con una compartida abierta ayer.

Uso:  PYTHONUTF8=1 R5_CLAVE_ARCHIVO=<archivo> python evidencia/e3_navegador2.py <corrida> [C1 C2 C3]
"""
import datetime
import os
import sys
import time
import uuid

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import e3_navegador as N  # noqa: E402  (mismas cuentas, entrada y ayudantes)
from playwright.sync_api import sync_playwright  # noqa: E402

CORRIDA = sys.argv[1] if len(sys.argv) > 1 else '1'
ESC = sys.argv[2:] or ['C1', 'C2', 'C3']
N.CORRIDA = 'nav2_' + CORRIDA
NOMBRE = '=HYPERLINK("x") <img src=x onerror="window.__r5=1"> \';DROP TABLE j;-- \U0001F333 ‮أشجار ' + CORRIDA + time.strftime('%H%M%S')


def telefono_reloj(b, quien, cuando):
    c = b.new_context(service_workers='block', geolocation={'latitude': 19.357, 'longitude': -99.06, 'accuracy': 5}, permissions=['geolocation'],
                      timezone_id='America/Mexico_City')
    c.route('**/js/config.js*', N.config_real)
    p = c.new_page(); err = []
    p.on('pageerror', lambda e: err.append(str(e)))
    p.clock.install(time=cuando)
    p.goto(N.BASE); p.wait_for_selector('html[data-listo]')
    p.fill('#acceso-correo', N.CORREO[quien]); p.fill('#acceso-clave', N.CLAVE); p.click('#form-acceso button[type="submit"]')
    p.wait_for_function("() => !document.getElementById('navegacion').hidden", timeout=30000)
    p.wait_for_function("() => ['listo', 'error', 'sin-senal'].includes(SRP.remoto.estado)", timeout=150000)
    p.wait_for_timeout(1500)
    return c, p, err


def main():
    gC = N.api_entrar('coord')
    with sync_playwright() as pw:
        b = pw.chromium.launch()

        if 'C1' in ESC:
            jid, v = N.compartida(gC, NOMBRE, ['cabo1'])
            # El aviso «Jornada compartida» se lee antes de aceptarlo: se abre el teléfono a mano
            c = b.new_context(service_workers='block', geolocation={'latitude': 19.357, 'longitude': -99.06, 'accuracy': 5}, permissions=['geolocation'])
            c.route('**/js/config.js*', N.config_real)
            p = c.new_page(); err = []
            p.on('pageerror', lambda e: err.append(str(e)))
            p.goto(N.BASE); p.wait_for_selector('html[data-listo]')
            p.fill('#acceso-correo', N.CORREO['cabo1']); p.fill('#acceso-clave', N.CLAVE); p.click('#form-acceso button[type="submit"]')
            p.wait_for_function("() => !document.getElementById('navegacion').hidden", timeout=30000)
            p.wait_for_function("() => ['listo', 'error', 'sin-senal'].includes(SRP.remoto.estado)", timeout=150000)
            p.wait_for_timeout(2500)
            aviso = p.evaluate("() => document.getElementById('dlg-confirmar').open ? document.getElementById('dlg-confirmar').innerText.slice(0, 400) : null")
            p.screenshot(path=os.path.join(N.AQUI, 'capturas', 'C1_aviso_inyeccion_c%s.png' % CORRIDA))
            if p.evaluate("() => document.getElementById('dlg-confirmar').open"): p.click('#btn-confirmar-si'); p.wait_for_timeout(300)
            p.evaluate("async id => { SRP.activa.jornada = await SRP.almacen.uno('jornadas', id); SRP.app.mostrarVista('registrar'); await SRP.activa.preparar(); }", jid); p.wait_for_timeout(800)
            p.evaluate("() => SRP.activa.abrirCambiar()"); p.wait_for_timeout(600)
            p.evaluate("() => document.getElementById('dlg-cambiar-jornada').close()")
            p.evaluate("async id => { SRP.app.mostrarVista('jornadas'); await new Promise(r => setTimeout(r, 1200)); await SRP.jornadas.abrir(id); }", jid); p.wait_for_timeout(1500)
            x = p.evaluate("() => ({ xss: window.__r5 === 1, imgs: document.querySelectorAll('img[src=\"x\"]').length, scripts: document.querySelectorAll('script:not([src])').length })")
            N.log('C1 nombre con marcado, fórmula, SQL, emoji y escritura de derecha a izquierda · cabo de apoyo · aviso:', aviso)
            N.log('C1 tras el aviso, «Cambiar de jornada» y la ficha: ¿se ejecutó?', x, '· errores:', err[:2])
            c.close()
            # La Coordinación: ficha y «Cabos de apoyo»; y el CSV del informe con ese nombre y una calle que empieza con «=»
            c, p, err = N.telefono(b, 'coord')
            p.evaluate("async id => { SRP.app.mostrarVista('jornadas'); await SRP.jornadas.abrir(id); }", jid); p.wait_for_timeout(1500)
            p.click('#btn-jornada-apoyos'); p.wait_for_selector('#dlg-apoyos[open]'); p.wait_for_timeout(300)
            texto = p.inner_text('#dlg-apoyos-texto')
            p.evaluate("() => document.getElementById('dlg-apoyos').close()")
            csv = p.evaluate("""n => SRP.informes.texto({ detalle: [{ folio: 'X', jornada: n, calle: '=1+1', entreCalles: '@SUMA(A1)', atiende: '-2+3', lng: '-99.06', compartida: 'Sí' }] }).split('\\r\\n')[1]""", NOMBRE)
            x = p.evaluate("() => ({ xss: window.__r5 === 1, imgs: document.querySelectorAll('img[src=\"x\"]').length })")
            N.log('C1 Coordinación · «Cabos de apoyo» dice:', texto[:200], '· ¿se ejecutó?', x, '· errores:', err[:2])
            N.log('C1 CSV del informe, renglón:', csv)
            c.close()

        if 'C2' in ESC:
            # Catálogos dañados al entrar: tres formas
            for nombre, tipo, cuerpo in [('JSON con listas dañadas', 'application/json', '{"especies":"dañado","programas":null,"instituciones":[{"id":null}]}'),
                                         ('JSON cortado', 'application/json', '{"especies":[{"id":"ESP-0001"'),
                                         ('vacío', 'application/json', '{}')]:
                c = b.new_context(service_workers='block')
                c.route('**/js/config.js*', N.config_real)
                c.route('**/api/srp/catalogos*', (lambda t, x: (lambda r: r.fulfill(status=200, content_type=t, body=x)))(tipo, cuerpo))
                p = c.new_page(); err = []
                p.on('pageerror', lambda e: err.append(str(e)))
                p.goto(N.BASE); p.wait_for_selector('html[data-listo]')
                p.fill('#acceso-correo', N.CORREO['cabo2']); p.fill('#acceso-clave', N.CLAVE); p.click('#form-acceso button[type="submit"]')
                try:
                    p.wait_for_function("() => !document.getElementById('navegacion').hidden || !document.getElementById('acceso-errores').hidden", timeout=30000)
                except Exception:
                    pass
                p.wait_for_timeout(2500)
                estado = p.evaluate("""() => ({ dentro: !document.getElementById('navegacion').hidden, error: document.getElementById('acceso-errores').hidden ? null : document.getElementById('acceso-errores').innerText.slice(0, 160),
                    aviso: document.getElementById('aviso').textContent.trim().slice(0, 160), especies: (SRP.ref && SRP.ref.deTipo) ? SRP.ref.deTipo('especie', true).length : null })""")
                p.screenshot(path=os.path.join(N.AQUI, 'capturas', 'C2_catalogos_%s_c%s.png' % (nombre.split()[0] + nombre.split()[-1], CORRIDA)))
                N.log('C2 catálogos', nombre, '→', estado, '· errores de página:', err[:2])
                c.close()

        if 'C2' in ESC:
            # C2b. Un teléfono que YA tiene catálogos y recibe un «200» con {} al bajarlos (lo mismo que hace al entrar)
            c, p, err = N.telefono(b, 'cabo2')
            antes = p.evaluate("() => ({ especies: SRP.ref.deTipo('especie', true).length, programas: SRP.ref.deTipo('programa', true).length })")
            c.route('**/api/srp/catalogos*', lambda r: r.fulfill(status=200, content_type='application/json', body='{}'))
            r = p.evaluate("() => SRP.remoto.bajarCatalogos()")
            p.wait_for_timeout(500)
            despues = p.evaluate("async () => ({ especies: (await SRP.almacen.todos('especies')).length, programas: (await SRP.almacen.todos('programas')).length })")
            N.log('C2b teléfono con catálogos recibe {}:', antes, '→ respuesta', r, '→', despues, '· errores:', err[:2])
            c.close()

        if 'C3' in ESC:
            # El reloj del teléfono un día adelante: la compartida que abrió hoy la Coordinación se ve «de ayer»
            jid, v = N.compartida(gC, 'r5 C3 reloj c%s %s' % (CORRIDA, time.strftime('%H%M%S')), ['cabo1'])
            manana = datetime.datetime.now() + datetime.timedelta(days=1)
            c, p, err = telefono_reloj(b, 'cabo1', manana)
            dlg = p.evaluate("() => document.getElementById('dlg-confirmar').open")
            if dlg: p.click('#btn-confirmar-si'); p.wait_for_timeout(300)
            p.evaluate("async id => { SRP.activa.jornada = await SRP.almacen.uno('jornadas', id); SRP.app.mostrarVista('registrar'); await SRP.activa.preparar(); }", jid); p.wait_for_timeout(800)
            franja = p.evaluate("() => { const f = document.getElementById('franja-reloj'); return f && !f.hidden ? f.innerText.trim().slice(0, 200) : null; }")
            campo = p.evaluate("() => { const c = document.getElementById('caja-fecha-arbol'); return c ? !c.hidden : null; }")
            arbol = N.registrar(p)
            N.enviar_y_esperar(p)
            rech = p.evaluate("() => SRP.cola.rechazadas().map(o => o.tipo + ':' + o.rechazo.codigo + ' ' + JSON.stringify(o.rechazo.errores))")
            N.log('C3 reloj +1 día · franja del reloj:', franja, '· campo «Fecha de plantación» visible:', campo, '· árbol', arbol is not None, '· rechazos:', rech, '· errores:', err[:2])
            c.close()
        b.close()


if __name__ == '__main__':
    main()
