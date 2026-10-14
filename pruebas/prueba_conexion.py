"""PRUEBA DE LA CONEXIÓN CON EL SERVIDOR: la aplicación con datos reales, en un navegador, contra el servicio
local, como quedará en el SIA: la aplicación y su servicio en el mismo sitio (pruebas/servir.py reenvía /api/).

Arranca el servicio (servidor/dist/iniciar.js) y el servidor de la aplicación en puertos propios, crea sus
cuentas en la base local y al terminar las quita. La aplicación se abre con ES_FICTICIO en false sólo para
esta prueba: el archivo no cambia.

Comprueba: que con datos reales no hay nada de prueba en la pantalla; entrar con correo y contraseña, y los
mensajes del servicio al no poder; que al entrar bajan la cuenta y los catálogos; que al volver a abrir se
entra sin esperar y la sesión se confirma; que sin señal se entra igual; que un cambio de la cuenta en el
servidor llega; que una sesión vencida pide la contraseña sin perder lo guardado; la contraseña temporal; y
que «Cerrar sesión» cierra también la del servicio.

Uso, desde la carpeta del proyecto (con la base local cargada):  python pruebas/prueba_conexion.py
"""
import json
import os
import socket
import subprocess
import sys
import tempfile
import time
import uuid
from playwright.sync_api import sync_playwright

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SERVIDOR = os.path.join(RAIZ, 'servidor')
PUERTO_API, PUERTO_APP = 3109, 8098
BASE = 'http://127.0.0.1:%d/' % PUERTO_APP
CLAVE = 'Conexion de prueba 2026'
CORRIDA = str(int(time.time()))
cuenta = lambda nombre, perfil, **x: dict(id=str(uuid.uuid4()), correo='%s.conexion.prueba.%s@ejemplo.local' % (nombre, CORRIDA),
                                          nombre='Prueba %s Conexión' % nombre.capitalize(), perfil=perfil, organizacion_id='o-sedema', clave=CLAVE, **x)
CABO = cuenta('cabo', 'CABO')
TEMPORAL = cuenta('temporal', 'CABO', temporal=True)
CUENTAS = [CABO, TEMPORAL]

resultados = []


def ok(cond, texto):
    resultados.append(('OK    ' if cond else 'FALLA ') + texto)


def apoyo(orden, datos):
    r = subprocess.run(['node', os.path.join('pruebas', 'apoyo_servidor.mjs'), orden], input=json.dumps(datos), capture_output=True,
                       text=True, encoding='utf-8', cwd=RAIZ, timeout=120)
    salida = json.loads(r.stdout or '{}')
    if salida.get('ok') is False:
        raise RuntimeError('apoyo_servidor %s: %s %s' % (orden, salida.get('error'), r.stderr))
    return salida


def esperar_puerto(puerto, segundos=30):
    fin = time.time() + segundos
    while time.time() < fin:
        with socket.socket() as s:
            if s.connect_ex(('127.0.0.1', puerto)) == 0:
                return True
        time.sleep(0.2)
    return False


# La aplicación como irá al SIA: con datos reales
def config_real(route):
    r = route.fetch()
    texto = r.text()
    assert 'ES_FICTICIO: true,' in texto
    route.fulfill(response=r, body=texto.replace('ES_FICTICIO: true,', 'ES_FICTICIO: false,'))


def abrir(pg):
    pg.goto(BASE)
    pg.wait_for_selector('html[data-listo]')


def entrar(pg, correo, clave):
    pg.fill('#acceso-correo', correo)
    pg.fill('#acceso-clave', clave)
    pg.click('#form-acceso button[type="submit"]')
    pg.wait_for_function("() => !document.getElementById('navegacion').hidden || !document.getElementById('acceso-errores').hidden", timeout=30000)


def dentro(pg):
    return pg.evaluate("() => !document.getElementById('navegacion').hidden && !!SRP.sesion.usuario")


def main():
    subprocess.run('npm run build', cwd=SERVIDOR, shell=True, check=True, capture_output=True)
    apoyo('preparar', {'cuentas': CUENTAS})
    fotos = tempfile.mkdtemp(prefix='srp-conexion-fotos-')
    entorno = dict(os.environ, SRP_PUERTO=str(PUERTO_API), SRP_COOKIE_SEGURA='no', SRP_ROL='srp_api', SRP_PROXY='1', SRP_FOTOS_DIR=fotos)
    servicio = subprocess.Popen(['node', os.path.join('dist', 'iniciar.js')], cwd=SERVIDOR, env=entorno, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    app = subprocess.Popen([sys.executable, os.path.join('pruebas', 'servir.py'), str(PUERTO_APP), '--api', 'http://127.0.0.1:%d' % PUERTO_API],
                           cwd=RAIZ, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    try:
        if not (esperar_puerto(PUERTO_API) and esperar_puerto(PUERTO_APP)):
            raise RuntimeError('el servicio o el servidor de la aplicación no arrancaron')
        with sync_playwright() as p:
            b = p.chromium.launch()
            ctx = b.new_context(service_workers='block')
            ctx.route('**/js/config.js*', config_real)
            pg = ctx.new_page()
            errores, pedidos = [], []
            pg.on('pageerror', lambda e: errores.append(str(e)))
            pg.on('request', lambda r: pedidos.append((r.method, r.url.split('/api/srp')[-1])) if '/api/srp/' in r.url else None)

            # Con datos reales, nada de prueba
            abrir(pg)
            v = pg.evaluate("""() => ({ proveedor: SRP.CONFIG.AUTENTICACION.PROVEEDOR, base: SRP.CONFIG.DB_NOMBRE,
                prueba: !document.getElementById('acceso-prueba').hidden, banda: !document.getElementById('banda-ficticio').hidden,
                acceso: !document.getElementById('vista-acceso').hidden })""")
            ok(v == {'proveedor': 'servidor', 'base': 'srp_sia', 'prueba': False, 'banda': False, 'acceso': True},
               'con datos reales se entra con el servidor, en la base real, sin «Usuario ficticio» ni la franja de datos de prueba: %s' % v)

            # Lo que el servicio no acepta, con su mensaje
            entrar(pg, CABO['correo'], 'Otra contraseña 2026')
            ok(not dentro(pg) and 'Correo o contraseña incorrectos' in pg.inner_text('#acceso-errores'), 'una contraseña equivocada no entra, con el mensaje del servicio')
            ctx.route('**/api/srp/**', lambda r: r.abort())
            entrar(pg, CABO['correo'], CLAVE)
            ok(not dentro(pg) and 'hace falta conexión con el servidor' in pg.inner_text('#acceso-errores'), 'sin conexión con el servidor no se puede entrar la primera vez, y se dice')
            ctx.unroute('**/api/srp/**')
            entrar(pg, TEMPORAL['correo'], CLAVE)
            ok(not dentro(pg) and 'Su contraseña es temporal' in pg.inner_text('#acceso-errores'), 'con una contraseña temporal no se entra todavía, y se dice')
            ok(apoyo('sesiones', {'id': TEMPORAL['id']})['abiertas'] == 0, 'y la sesión que abrió el servicio para cambiarla queda cerrada')

            # Entrar: bajan la cuenta y los catálogos
            pedidos.clear()
            entrar(pg, CABO['correo'], CLAVE)
            d = pg.evaluate("""async () => ({ nombre: document.getElementById('usuario-nombre').textContent, sesion: localStorage.getItem(SRP.CONFIG.CLAVE_SESION),
                especies: SRP.ref.deTipo('especie', true).length, instituciones: (await SRP.almacen.todos('instituciones')).length,
                cuenta: (await SRP.almacen.uno('usuarios', SRP.sesion.usuario.id) || {}).correo })""")
            ok(dentro(pg) and d['nombre'] == CABO['nombre'] and d['sesion'] == CABO['id'] and d['cuenta'] == CABO['correo'],
               'con correo y contraseña se entra, y la cuenta queda guardada en el teléfono: %s' % d)
            ok(d['especies'] > 50 and d['instituciones'] > 5, 'al entrar bajan los catálogos del servidor: %d especies activas, %d instituciones' % (d['especies'], d['instituciones']))
            ok([x for x in pedidos if x[1] == '/acceso/entrar'] and [x for x in pedidos if x[1] == '/catalogos'], 'pidió entrar y los catálogos: %s' % pedidos)
            galleta = [c for c in ctx.cookies() if c['name'] == 'sia_srp_sesion']
            ok(len(galleta) == 1 and galleta[0]['httpOnly'] and galleta[0]['path'] == '/api/srp' and galleta[0]['sameSite'] == 'Strict',
               'la sesión es una cookie sólo HTTP, del mismo sitio y sólo para la API: la aplicación no la puede leer')
            ok(pg.evaluate("() => document.cookie.includes('sia_srp_sesion')") is False, 'y en efecto, document.cookie no la trae')

            # Volver a abrir: se entra sin esperar y se confirma la sesión
            pedidos.clear()
            abrir(pg)
            pg.wait_for_timeout(1500)
            ok(dentro(pg) and ('GET', '/acceso/yo') in pedidos, 'al volver a abrir se entra con la sesión guardada y el servidor la confirma')

            # Sin señal se entra igual
            ctx.route('**/api/srp/**', lambda r: r.abort())
            abrir(pg)
            pg.wait_for_timeout(1500)
            ok(dentro(pg) and pg.evaluate("() => !!SRP.sesion.usuario"), 'sin conexión con el servidor se abre igual, con la última sesión')
            ctx.unroute('**/api/srp/**')

            # Un cambio de la cuenta en el servidor llega al confirmar
            apoyo('renombrar', {'id': CABO['id'], 'nombre': CABO['nombre'] + ' Renombrada'})
            abrir(pg)
            pg.wait_for_function("n => document.getElementById('usuario-nombre').textContent === n", arg=CABO['nombre'] + ' Renombrada', timeout=10000)
            ok(True, 'un cambio de la cuenta en el servidor llega al teléfono al volver a abrir')

            # Sesión vencida: se vuelve a pedir la contraseña y lo guardado se queda
            apoyo('vencer', {'id': CABO['id']})
            abrir(pg)
            pg.wait_for_function("() => !document.getElementById('vista-acceso').hidden", timeout=10000)
            aviso = pg.evaluate("() => [...document.querySelectorAll('.aviso')].map(a => a.textContent).join(' ')")
            guardado = pg.evaluate("async () => ({ sesion: localStorage.getItem(SRP.CONFIG.CLAVE_SESION), instituciones: (await SRP.almacen.todos('instituciones')).length })")
            ok('Su sesión venció' in aviso and guardado['sesion'] is None and guardado['instituciones'] > 5,
               'con la sesión vencida en el servidor se vuelve a pedir la contraseña, se dice por qué y lo guardado se queda: %s' % guardado)
            entrar(pg, CABO['correo'], CLAVE)
            ok(dentro(pg), 'y se vuelve a entrar con la contraseña')

            # Cerrar sesión cierra también la del servicio
            antes = apoyo('sesiones', {'id': CABO['id']})
            pg.click('#btn-cuenta')
            pg.click('#btn-cerrar-sesion')
            pg.wait_for_timeout(1500)
            despues = apoyo('sesiones', {'id': CABO['id']})
            ok(not dentro(pg) and antes['abiertas'] == 1 and despues['abiertas'] == 0, '«Cerrar sesión» cierra también la sesión en el servidor: %s → %s' % (antes, despues))
            abrir(pg)
            ok(not dentro(pg), 'y al volver a abrir se pide entrar')

            ok(not errores, 'sin errores en la página: %s' % errores)
            ctx.close()
            b.close()
    finally:
        servicio.terminate()
        app.terminate()
        apoyo('quitar', {'ids': [u['id'] for u in CUENTAS]})
    print('\n'.join(resultados))
    fallas = [r for r in resultados if r.startswith('FALLA')]
    print('\n%d comprobaciones, %d fallas' % (len(resultados), len(fallas)))
    sys.exit(1 if fallas else 0)


if __name__ == '__main__':
    main()
