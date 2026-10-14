"""PRUEBA DE LA CONEXIÓN CON EL SERVIDOR: la aplicación con datos reales, en un navegador, contra el servicio
local, como quedará en el SIA: la aplicación y su servicio en el mismo sitio (pruebas/servir.py reenvía /api/).

Arranca el servicio (servidor/dist/iniciar.js) y el servidor de la aplicación en puertos propios, crea sus
cuentas en la base local y al terminar las quita. La aplicación se abre con ES_FICTICIO en false sólo para
esta prueba: el archivo no cambia.

Comprueba: que con datos reales no hay nada de prueba en la pantalla; entrar con correo y contraseña, y los
mensajes del servicio al no poder; que al entrar bajan la cuenta, los catálogos, las cuentas que se ven y los
parámetros; que lo enviado llega del servidor y se ve sin guardarse en el teléfono, con sus fotografías,
que se piden al servidor al verlas o descargarlas, y la que no llegó no se ve rota; los avisos cuando no
llega, sin señal o porque el servidor falló; que al volver a abrir se entra sin esperar y la sesión se
confirma; que sin señal se entra igual, con los últimos parámetros; que un cambio de la cuenta en el servidor
llega; que una sesión vencida pide la contraseña sin perder lo guardado; la contraseña temporal; que «Cerrar
sesión» cierra también la del servicio y suelta lo enviado; y cuánto tarda la Administración en traer todo.

Uso, desde la carpeta del proyecto (con la base local cargada):  python pruebas/prueba_conexion.py
"""
import json
import os
import shutil
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
ADMIN = cuenta('admin', 'ADMIN')
CUENTAS = [CABO, TEMPORAL, ADMIN]

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


def esperar_remoto(pg, estados=('listo',), espera=90000):
    pg.wait_for_function("e => e.includes(SRP.remoto.estado)", arg=list(estados), timeout=espera)


# Una jornada y dos árboles de hoy, mandados al servidor como los mandará el teléfono. El primero lleva su
# fotografía, que se sube aparte; el segundo dice tener una que nunca llegó
JPEG = '/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA='
CREAR = """async (jpeg) => {
  const hoy = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Mexico_City' }).format(new Date());
  const programa = SRP.ref.deTipo('programa', true).find(p => p.id !== SRP.CONFIG.PROGRAMA_SOLICITUD).id;
  const especie = SRP.ref.deTipo('especie', true)[0].id;
  const j = crypto.randomUUID();
  const fotos = [crypto.randomUUID(), crypto.randomUUID()];
  const arbol = (lat, foto_id) => ({ tipo: 'registro.crear', datos: { id: crypto.randomUUID(), jornada_id: j, lat, lng: -99.1332, punto_origen: 'mapa', especie_id: especie, fecha_plantacion: hoy, comentarios: '', foto_id } });
  const r = await SRP.servidor.pedir('POST', '/envios', { operaciones: [
    { tipo: 'jornada.crear', datos: { id: j, nombre: 'Jornada de la prueba de conexión', programa_id: programa, lat: 19.4326, lng: -99.1332, punto_origen: 'manual', fecha: hoy, arboles_previstos: 2 } },
    arbol(19.43262, fotos[0]), arbol(19.43266, fotos[1])] });
  const bin = Uint8Array.from(atob(jpeg), c => c.charCodeAt(0));
  const f = await fetch(SRP.CONFIG.API + '/fotos/' + fotos[0], { method: 'PUT', credentials: 'same-origin', headers: { 'content-type': 'image/jpeg' }, body: bin });
  return r.ok ? r.datos.resultados.map(x => x.estado).concat(f.status) : r;
}"""

# Las miniaturas de Mis registros: la imagen (oculta, cargada, del servidor) y la miniatura vacía
MINIATURAS = """async () => { SRP.app.mostrarVista('registros'); await new Promise(r => setTimeout(r, 1500));
  return [...document.querySelectorAll('#lista-registros > li')].map(li => { const img = li.querySelector('img.registro-miniatura'), vacia = li.querySelector('.registro-sin-foto');
    return { img: img ? [img.hidden, img.naturalWidth > 0, img.getAttribute('src').startsWith('/api/srp/fotos/')] : null, vacia: vacia ? !vacia.hidden : null }; })
    .sort((a, b) => String(a.img && a.img[0]).localeCompare(String(b.img && b.img[0]))); }"""

# Lo que enseña una sección: su franja, su total y el aviso de Supervisión
VISTA = """async v => { SRP.app.mostrarVista(v); await new Promise(r => setTimeout(r, 700));
  const f = document.getElementById(v + '-remoto'), total = document.getElementById(v + '-total'), sup = document.getElementById('supervision-remoto');
  return { franja: f && f.classList.contains('franja-remoto') && !f.hidden ? f.textContent : null, total: total ? total.textContent : null,
    aviso: !sup.hidden ? sup.textContent : null }; }"""


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
            esperar_remoto(pg)
            c = pg.evaluate("async () => (await SRP.almacen.todosLocales('usuarios')).map(u => [u.id, 'correo' in u])")
            ok(c == [[CABO['id'], True]], 'el cabo baja sólo las cuentas que ve —aquí, la suya— y sólo la suya trae correo: %s' % c)

            # Lo enviado llega del servidor y se ve, sin guardarse en el teléfono
            ok(pg.evaluate(CREAR, JPEG) == ['recibido'] * 3 + [201], 'el cabo manda al servidor una jornada y dos árboles, y la fotografía del primero')
            abrir(pg)
            esperar_remoto(pg)
            v = pg.evaluate(VISTA, 'registros')
            n = pg.evaluate("async () => [(await SRP.almacen.todosLocales('plantaciones')).length, (await SRP.almacen.todosLocales('jornadas')).length, (await SRP.almacen.todos('plantaciones')).length]")
            ok(v['total'] == 'Total: 2 registros' and v['franja'] is None and n == [0, 0, 2],
               'al abrir, lo enviado llega del servidor y se ve en Mis registros, sin guardarse en el teléfono: %s, %s' % (v, n))
            v = pg.evaluate(VISTA, 'jornadas')
            ok(v['total'] == '1 jornada · 2 árboles', 'y en Jornadas: %s' % v['total'])

            # Las fotografías de lo enviado se piden al servidor; la que no llegó no se ve rota
            m = pg.evaluate(MINIATURAS)
            ok(m == [{'img': [False, True, True], 'vacia': False}, {'img': [True, False, True], 'vacia': True}],
               'en Mis registros, la fotografía del servidor se ve, y en lugar de la que nunca llegó queda la miniatura vacía: %s' % m)
            g = pg.evaluate("""async () => { SRP.app.mostrarVista('galeria'); await new Promise(r => setTimeout(r, 1500));
              const r = [...SRP.remoto.plantaciones.values()].find(x => x.foto_id && document.querySelector('.galeria-foto img[src$="' + x.foto_id + '"]:not([hidden])'));
              const b = r ? await SRP.foto.bytes(r) : null;
              return { cuadros: [...document.querySelectorAll('#galeria-rejilla > li')].filter(li => !li.hidden).length, bytes: b ? b.datos.length : null, tipo: b && b.tipo,
                locales: (await SRP.almacen.todosLocales('plantaciones')).length }; }""")
            ok(g == {'cuadros': 1, 'bytes': len(__import__('base64').b64decode(JPEG)), 'tipo': 'image/jpeg', 'locales': 0},
               'en Fotografías se ve la del servidor, se descarga entera y no queda en el teléfono; la que no llegó no ocupa cuadro: %s' % g)

            # Los parámetros del servidor valen en el teléfono, y se quedan para abrir sin señal
            apoyo('parametro', {'clave': 'JORNADA.DUPLICADO_M', 'valor': 7, 'id': CABO['id']})
            abrir(pg)
            esperar_remoto(pg)
            ok(pg.evaluate("() => SRP.CONFIG.JORNADA.DUPLICADO_M") == 7, 'un parámetro cambiado en el servidor llega al teléfono')

            # Sin señal: sólo lo del teléfono, con su aviso, y los últimos parámetros
            ctx.route('**/api/srp/**', lambda r: r.abort())
            abrir(pg)
            esperar_remoto(pg, ('sin-senal',))
            v = pg.evaluate(VISTA, 'registros')
            ok(v['franja'] and 'Sin señal' in v['franja'] and 'Sólo puede ver y corregir lo que aún no se envía' in v['franja'] and v['total'] == '',
               'sin señal, Mis registros dice por qué no se ve lo enviado y enseña sólo lo del teléfono: %s' % v)
            v = pg.evaluate(VISTA, 'supervision')
            oculto = pg.evaluate("() => getComputedStyle(document.getElementById('sup-nota')).display")
            ok(v['aviso'] and 'Sin señal' in v['aviso'] and 'Mi avance se arma con lo que ya envió' in v['aviso'] and oculto == 'none',
               'y Mi avance enseña sólo su aviso, en lugar de las cifras: %s' % v['aviso'])
            ok(pg.evaluate("() => SRP.CONFIG.JORNADA.DUPLICADO_M") == 7, 'sin señal se abre con los últimos parámetros del servidor')
            ctx.unroute('**/api/srp/**')

            # El servidor falla al dar lo enviado: se dice distinto
            ctx.route('**/api/srp/jornadas*', lambda r: r.fulfill(status=500, content_type='application/json', body='{"codigo":"ERROR","mensaje":"Falla de prueba."}'))
            abrir(pg)
            esperar_remoto(pg, ('error',))
            v = pg.evaluate(VISTA, 'registros')
            ok(v['franja'] and 'No se pudo traer lo enviado' in v['franja'], 'si el servidor falla, la franja lo dice: %s' % v['franja'])
            ctx.unroute('**/api/srp/jornadas*')

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
            ok(pg.evaluate("() => [SRP.remoto.plantaciones.size, SRP.remoto.jornadas.size, SRP.remoto.estado]") == [0, 0, 'sin-cargar'], 'y suelta lo enviado que tenía en memoria')
            abrir(pg)
            ok(not dentro(pg), 'y al volver a abrir se pide entrar')

            # La Administración: todas las cuentas, con correo, y todo lo enviado; cuánto tarda en llegar
            entrar(pg, ADMIN['correo'], CLAVE)
            t0 = time.time()
            esperar_remoto(pg)
            segundos = time.time() - t0
            a = pg.evaluate("""async () => ({ cuentas: (await SRP.almacen.todosLocales('usuarios')).filter(u => typeof u.correo === 'string').length,
                arboles: SRP.remoto.plantaciones.size, jornadas: SRP.remoto.jornadas.size, locales: (await SRP.almacen.todosLocales('plantaciones')).length })""")
            ok(a['cuentas'] > 20 and a['arboles'] > 17000 and a['jornadas'] > 1000 and a['locales'] == 0,
               'la Administración baja todas las cuentas con su correo y trae todo lo enviado en %.1f s, sin guardarlo: %s' % (segundos, a))

            ok(not errores, 'sin errores en la página: %s' % errores)
            ctx.close()
            b.close()
    finally:
        servicio.terminate()
        app.terminate()
        apoyo('quitar', {'ids': [u['id'] for u in CUENTAS]})
        shutil.rmtree(fotos, ignore_errors=True)
    print('\n'.join(resultados))
    fallas = [r for r in resultados if r.startswith('FALLA')]
    print('\n%d comprobaciones, %d fallas' % (len(resultados), len(fallas)))
    sys.exit(1 if fallas else 0)


if __name__ == '__main__':
    main()
