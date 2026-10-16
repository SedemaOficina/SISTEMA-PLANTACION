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
sesión» cierra también la del servicio y suelta lo enviado; cuánto tarda la Administración en traer todo; y el
envío real: una jornada y sus árboles capturados en la pantalla llegan al servidor y vuelven con su folio, con su
fotografía; lo capturado sin señal sale al volver; una corrección viaja como cambio; lo que el servidor no acepta
se queda con su motivo; al cerrar la jornada y entregar su reporte, sale del teléfono; la sesión que vence a
medio árbol no saca a nadie del formulario; y lo que el servidor no aceptó se resuelve desde la pantalla: la
franja y la marca lo dicen, y en «Revisar» se envía otra vez, se queda lo del servidor, se corrige, se elimina
o se descarta; y los catálogos de la Administración: dar de alta, renombrar, desactivar y eliminar van al
servidor, que cuenta el uso de cada valor y dice lo que no acepta, y sin conexión nada cambia; y lo que dice la
bitácora del servidor: el historial de un árbol que ya salió del teléfono y el Registro de cambios.

Uso, desde la carpeta del proyecto (con la base local cargada):  python pruebas/prueba_conexion.py
"""
import json
import os
import re
import shutil
import socket
import subprocess
import sys
import tempfile
import time
import uuid
from PIL import Image
from playwright.sync_api import sync_playwright

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SERVIDOR = os.path.join(RAIZ, 'servidor')
PUERTO_API, PUERTO_APP = 3109, 8098
BASE = 'http://127.0.0.1:%d/' % PUERTO_APP
CLAVE = 'Conexion de prueba 2026'
HOY = time.strftime('%Y-%m-%d')
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


def iniciar_jornada(pg, nombre):
    """Declara una jornada desde Nuevo registro, como la persona."""
    pg.evaluate("SRP.app.mostrarVista('registrar')")
    pg.wait_for_timeout(500)
    if pg.is_hidden('#panel-iniciar-jornada'):
        pg.click('#btn-jornada-cambiar'); pg.wait_for_timeout(200); pg.click('#btn-cambiar-nueva'); pg.wait_for_timeout(300)
    pg.fill('#ini-nombre', nombre)
    pg.fill('#ini-fecha', HOY)
    pg.select_option('#ini-programa', 'p-refor')
    pg.fill('#ini-meta', '10')
    pg.click('#btn-ini-detectar'); pg.wait_for_timeout(900)   # la jornada se ubica antes de iniciarla
    pg.click('#btn-iniciar-jornada')
    pg.wait_for_timeout(600)
    return pg.evaluate("SRP.activa.jornada && SRP.activa.jornada.id")


def registrar(pg, foto=None):
    """Captura un ahuehuete de principio a fin en la jornada activa y devuelve su identificador."""
    pg.evaluate("SRP.app.mostrarVista('registrar')")
    pg.wait_for_timeout(400)
    pg.click('#btn-ubicacion'); pg.wait_for_timeout(800)
    pg.fill('#campo-especie', 'ahuehu'); pg.wait_for_timeout(200)
    pg.dispatch_event('.combo-opcion[data-id="ESP-0070"]', 'mousedown'); pg.wait_for_timeout(150)
    if foto: pg.set_input_files('#foto-archivo', foto); pg.wait_for_timeout(900)
    pg.click('#form-plantacion button[type=submit]'); pg.wait_for_timeout(800)
    if pg.is_visible('#dlg-confirmar'): pg.click('#btn-confirmar-si'); pg.wait_for_timeout(800)
    if pg.is_visible('#dlg-resumen'): pg.click('#btn-resumen-guardar'); pg.wait_for_timeout(700)
    return pg.evaluate("SRP.formulario.estado.ultimoGuardado")


def corregir(pg, id, comentarios):
    """Corrige los comentarios de un árbol desde su edición, como la persona."""
    pg.evaluate("async id => SRP.formulario.editar(await SRP.almacen.uno('plantaciones', id))", id)
    pg.wait_for_timeout(600)
    pg.fill('#campo-comentarios', comentarios)
    pg.click('#form-plantacion button[type=submit]'); pg.wait_for_timeout(800)
    if pg.is_visible('#dlg-resumen'): pg.click('#btn-resumen-guardar'); pg.wait_for_timeout(700)


# Lo que tiene el teléfono de un registro, sin lo enviado en memoria
LOCAL = """async id => ({ jornada: await SRP.almacen.unoLocal('jornadas', id) || null, arbol: await SRP.almacen.unoLocal('plantaciones', id) || null })"""


def esperar_cola(pg, quedan=0, espera=30000):
    """Espera a que la cola baje a `quedan` operaciones y a que no haya envío en curso."""
    pg.wait_for_function("n => SRP.cola.ops.length <= n && !SRP.envio.enviando", arg=quedan, timeout=espera)
    pg.wait_for_timeout(300)


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

# La franja de arriba, la marca de la tarjeta de un árbol y la ventana de lo que el servidor no aceptó
FRANJA = """() => { const f = document.getElementById('franja-envio');
  return { ver: !f.hidden, texto: f.textContent.trim().replace(/\\s+/g, ' '), boton: document.getElementById('btn-franja-enviar').textContent.trim() }; }"""
MARCA = """async id => { SRP.app.mostrarVista('registros'); await new Promise(r => setTimeout(r, 900)); SRP.registros.aplicarAtajo('todos'); await new Promise(r => setTimeout(r, 900));
  const li = document.querySelector('#lista-registros li[data-id="' + id + '"]'); return li ? li.querySelector('.registro-estado').textContent : null; }"""
RECHAZOS = """() => [...document.querySelectorAll('#lista-rechazos > li')].map(li => ({ n: li.dataset.n, titulo: li.querySelector('h3').textContent,
  que: li.querySelector('.rechazo-que').textContent, porque: li.querySelector('.rechazo-porque').textContent,
  botones: [...li.querySelectorAll('button')].map(b => b.textContent.trim()), id: SRP.cola.ops.find(o => String(o.n) === li.dataset.n).registro_id }))"""


def revisar(pg):
    """Abre «Revisar» desde la franja, como la persona, y devuelve lo que dice la ventana."""
    pg.click('#btn-franja-enviar')
    pg.wait_for_selector('#dlg-rechazos[open]')
    pg.wait_for_timeout(300)
    return pg.evaluate(RECHAZOS)


def rechazados(pg, n, espera=30000):
    pg.wait_for_function("n => SRP.cola.rechazadas().length === n && !SRP.envio.enviando", arg=n, timeout=espera)
    pg.wait_for_timeout(300)


# El historial que enseña el detalle de un árbol, renglón por renglón
HISTORIAL = """async id => { await SRP.registros.verDetalle(await SRP.almacen.uno('plantaciones', id)); await new Promise(r => setTimeout(r, 800));
  const t = [...document.querySelectorAll('#dlg-detalle-cuerpo .historial li')].map(li => li.textContent); document.getElementById('dlg-detalle').close(); return t; }"""

# El Registro de cambios de Configuración: cuántos dice y sus primeros renglones
CAMBIOS = """async () => { SRP.app.mostrarVista('cambios'); await new Promise(r => setTimeout(r, 1500));
  return { cuenta: document.getElementById('cmb-cuenta').textContent, renglones: [...document.querySelectorAll('#cmb-lista > li')].slice(0, 4).map(li => li.textContent) }; }"""


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
            ctx = b.new_context(service_workers='block', geolocation={'latitude': 19.357, 'longitude': -99.06, 'accuracy': 5}, permissions=['geolocation'])
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

            # ---------- El envío real, capturando en la pantalla ----------
            foto = os.path.join(fotos, 'prueba-arbol.jpg')   # se va con la carpeta de la prueba
            Image.new('RGB', (64, 48), (40, 120, 60)).save(foto, 'JPEG')
            abrir(pg)
            esperar_remoto(pg)
            jid = iniciar_jornada(pg, 'Jornada del envío real')
            esperar_cola(pg)
            ok(apoyo('leer', {'id': jid})['jornada'] == {'estatus': 'abierta', 'reporte': False, 'nombre': 'Jornada del envío real'} and pg.evaluate(LOCAL, jid)['jornada'],
               'la jornada iniciada en la pantalla llega al servidor y se queda en el teléfono, porque está abierta')
            a1 = registrar(pg, foto)
            esperar_cola(pg)
            srv = apoyo('leer', {'id': a1})
            loc = pg.evaluate(LOCAL, a1)
            ok(srv['arbol'] and re.match(r'^[A-Z]{3}-\d{3}-\d{5}$', srv['arbol']['folio'] or '') and loc['arbol'] and loc['arbol']['folio'] == srv['arbol']['folio'] and srv['fotos'] == 1,
               'el árbol registrado llega al servidor con su fotografía, y el folio que asignó el servidor vuelve al teléfono: %s' % srv['arbol'])
            franja = pg.evaluate("() => document.getElementById('franja-guardado-envio') && document.getElementById('franja-guardado-envio').textContent")
            ok(franja and franja.startswith('enviado '), 'la franja «Guardado» dice que se envió: %s' % franja)

            # Sin señal se queda en la cola, y sale al volver
            ctx.route('**/api/srp/**', lambda r: r.abort())
            a2 = registrar(pg)
            pg.wait_for_timeout(800)
            c = pg.evaluate("""() => ({ estado: SRP.cola.estado('%s'), cola: SRP.cola.ops.length, pastilla: document.getElementById('conexion').textContent.trim() })""" % a2)
            ok(c['estado'] == 'por_enviar' and c['cola'] == 1 and 'por enviar' in c['pastilla'], 'sin conexión, el árbol queda por enviar y la pastilla lo cuenta: %s' % c)
            ctx.unroute('**/api/srp/**')
            pg.evaluate("() => SRP.envio.enviar({ manual: true })")
            esperar_cola(pg)
            ok(apoyo('leer', {'id': a2})['arbol'] is not None and pg.evaluate("() => SRP.cola.ops.length") == 0, 'al volver la conexión sale solo lo que esperaba')

            # Una corrección viaja como cambio de ese árbol
            corregir(pg, a1, 'Corregido en el teléfono')
            esperar_cola(pg)
            ok(apoyo('leer', {'id': a1})['arbol']['comentarios'] == 'Corregido en el teléfono', 'la corrección de un árbol enviado llega al servidor')

            # Lo que el servidor no acepta se queda con su motivo: otra persona cambió el árbol antes
            apoyo('tocar', {'id': a2, 'comentarios': 'Cambiado por otra persona', 'por': ADMIN['id']})
            corregir(pg, a2, 'Cambiado en el teléfono')
            rechazados(pg, 1)
            x = pg.evaluate("() => { const o = SRP.cola.ops.find(o => o.rechazo); return { codigo: o.rechazo.codigo, aviso: document.getElementById('aviso').textContent, estado: SRP.cola.estado(o.registro_id) }; }")
            ok(x['codigo'] == 'VERSION_VIEJA' and 'Alguien más cambió este registro' in x['aviso'] and 'Revisar' in x['aviso'] and x['estado'] == 'rechazado' and apoyo('leer', {'id': a2})['arbol']['comentarios'] == 'Cambiado por otra persona',
               'si alguien cambió el árbol antes, el servidor no escribe encima: el cambio se queda en el teléfono con su motivo, y se dice: %s' % x)

            # ---------- Lo que el servidor no aceptó, resuelto desde la pantalla ----------
            # La franja roja y la marca de la tarjeta lo dicen; «Revisar» abre la ventana
            marca = pg.evaluate(MARCA, a2)
            f = pg.evaluate(FRANJA)
            ok(f['ver'] and f['texto'].startswith('El servidor no aceptó 1 cambio. Siguen guardados en el teléfono') and f['boton'] == 'Revisar' and marca and 'No se pudo enviar' in marca,
               'la franja de arriba dice que el servidor no aceptó un cambio, con «Revisar», y la tarjeta del árbol dice «No se pudo enviar»: %s · %s' % (f, marca))
            folio2 = pg.evaluate(LOCAL, a2)['arbol']['folio']
            v = revisar(pg)
            ok(len(v) == 1 and v[0]['titulo'] == 'Ahuehuete · ' + folio2 and v[0]['que'] == 'Corrección: comentarios' and v[0]['porque'].startswith('Por qué: Alguien más cambió este registro antes')
               and v[0]['botones'] == ['Enviar mi cambio otra vez', 'Quedarme con lo del servidor'],
               'la ventana dice de qué árbol es el cambio, qué se cambió y por qué no se aceptó, con «Enviar mi cambio otra vez» y «Quedarme con lo del servidor»: %s' % v)
            pg.click('#lista-rechazos button[data-accion="reenviar"]')
            esperar_cola(pg)
            loc = pg.evaluate(LOCAL, a2)['arbol']
            ok(apoyo('leer', {'id': a2})['arbol']['comentarios'] == 'Cambiado en el teléfono' and loc['comentarios'] == 'Cambiado en el teléfono'
               and pg.evaluate("() => !document.getElementById('dlg-rechazos').open") and not pg.evaluate(FRANJA)['ver'],
               '«Enviar mi cambio otra vez» lo aplica sobre lo que hay ahora en el servidor; la ventana se cierra y la franja se va')

            # «Quedarme con lo del servidor»: el teléfono toma lo que dejó la otra persona
            apoyo('tocar', {'id': a2, 'comentarios': 'Lo dejó otra persona', 'por': ADMIN['id']})
            corregir(pg, a2, 'Otro cambio en el teléfono')
            rechazados(pg, 1)
            revisar(pg)
            pg.click('#lista-rechazos button[data-accion="servidor"]')
            esperar_cola(pg)
            loc = pg.evaluate(LOCAL, a2)['arbol']
            ok(apoyo('leer', {'id': a2})['arbol']['comentarios'] == 'Lo dejó otra persona' and loc['comentarios'] == 'Lo dejó otra persona' and pg.evaluate("() => SRP.cola.ops.length") == 0,
               '«Quedarme con lo del servidor» deja el árbol como lo cambió la otra persona, también en el teléfono, y su cambio sale de la cola: %s' % loc['comentarios'])

            # Uno más, que se queda sin resolver para lo que sigue
            apoyo('tocar', {'id': a2, 'comentarios': 'Otra vez otra persona', 'por': ADMIN['id']})
            corregir(pg, a2, 'Cambio que se queda')
            rechazados(pg, 1)

            # Al cerrar la jornada y entregar su reporte, lo recibido sale del teléfono; lo rechazado se queda
            pg.evaluate("async id => { const j = await SRP.almacen.uno('jornadas', id); await SRP.activa.cambiarEstatus(j, 'cerrada'); }", jid)
            esperar_cola(pg, 1)
            pg.evaluate("async id => { const j = await SRP.almacen.uno('jornadas', id); await SRP.reportes.marcarGenerado(j, null); }", jid)
            esperar_cola(pg, 1)
            srv = apoyo('leer', {'id': jid})['jornada']
            loc = pg.evaluate("""async ([j, a1, a2]) => ({ jornada: !!(await SRP.almacen.unoLocal('jornadas', j)), a1: !!(await SRP.almacen.unoLocal('plantaciones', a1)),
              a2: !!(await SRP.almacen.unoLocal('plantaciones', a2)), seVe: !!(await SRP.almacen.uno('plantaciones', a1)) })""", [jid, a1, a2])
            ok(srv == {'estatus': 'cerrada', 'reporte': True, 'nombre': 'Jornada del envío real'} and loc == {'jornada': False, 'a1': False, 'a2': True, 'seVe': True},
               'cerrada y con su reporte, la jornada sale del teléfono con lo recibido, y se sigue viendo como enviado; el árbol con un cambio rechazado se queda: %s' % loc)

            # El historial de un árbol que ya salió del teléfono lo cuenta el servidor
            h = pg.evaluate(HISTORIAL, a1)
            ok(len(h) >= 3 and ': creado por' in h[0] and ': folio asignado por el servidor' in h[1] and any(': editado por' in x and 'comentarios' in x for x in h[2:]),
               'el historial de un árbol que ya salió del teléfono lo trae el servidor: alta, folio y corrección, en orden: %s' % h)

            # Dos altas con datos que el servidor no acepta: el punto quedó fuera de la Ciudad
            j2 = iniciar_jornada(pg, 'Jornada de los rechazos')
            esperar_cola(pg, 1)
            ctx.route('**/api/srp/**', lambda r: r.abort())
            b1, b2 = registrar(pg), registrar(pg)
            pg.evaluate("""async ids => { for (const id of ids) { const r = await SRP.almacen.unoLocal('plantaciones', id);
              await SRP.almacen.ponerLocal('plantaciones', Object.assign({}, r, { lat: 20.6, lng: -98.9 })); } }""", [b1, b2])
            ctx.unroute('**/api/srp/**')
            pg.evaluate("() => SRP.envio.enviar({ manual: true })")
            rechazados(pg, 3)
            f = pg.evaluate(FRANJA)
            v = {x['id']: x for x in revisar(pg)}
            ok(f['texto'].startswith('El servidor no aceptó 3 cambios.') and len(v) == 3 and all(v[b]['titulo'] == 'Ahuehuete · nuevo, sin folio' and v[b]['que'] == 'Alta del árbol, en la jornada «Jornada de los rechazos»'
               and v[b]['porque'] == 'Por qué: El punto está fuera de la Ciudad de México. Revise las coordenadas.' and v[b]['botones'] == ['Corregir', 'Eliminar este registro'] for b in (b1, b2)),
               'un alta con datos que no pasan dice el motivo del servidor, con «Corregir» y «Eliminar este registro»: %s' % ([f['texto']] + [v.get(b) for b in (b1, b2)],))

            # «Corregir» abre el árbol en el formulario; al guardarlo, se vuelve a enviar
            pg.click('#lista-rechazos li[data-n="%s"] button[data-accion="corregir"]' % v[b1]['n'])
            pg.wait_for_timeout(700)
            editando = pg.evaluate("() => [SRP.app.vista, SRP.formulario.estado.editando && SRP.formulario.estado.editando.id, document.getElementById('dlg-rechazos').open]")
            pg.click('#btn-ubicacion'); pg.wait_for_timeout(900)
            pg.click('#form-plantacion button[type=submit]'); pg.wait_for_timeout(800)
            if pg.is_visible('#dlg-confirmar'): pg.click('#btn-confirmar-si'); pg.wait_for_timeout(800)
            if pg.is_visible('#dlg-resumen'): pg.click('#btn-resumen-guardar'); pg.wait_for_timeout(700)
            pg.wait_for_function("id => !SRP.cola.de(id).length && !SRP.envio.enviando", arg=b1, timeout=30000)
            srv = apoyo('leer', {'id': b1})['arbol']
            ok(editando == ['registrar', b1, False] and srv and re.match(r'^[A-Z]{3}-\d{3}-\d{5}$', srv['folio'] or '') and pg.evaluate("() => SRP.cola.rechazadas().length") == 2,
               '«Corregir» abre el árbol en el formulario y, corregido, se envía solo y vuelve con su folio: %s · %s' % (editando, srv))

            # «Eliminar este registro» lo quita del teléfono con su historial, después de confirmar
            revisar(pg)
            pg.click('#lista-rechazos li[data-n="%s"] button[data-accion="eliminar"]' % v[b2]['n'])
            pg.wait_for_selector('#dlg-confirmar[open]')
            confirma = pg.evaluate("() => [document.getElementById('dlg-confirmar-texto').textContent, document.getElementById('dlg-confirmar-nota').textContent]")
            pg.click('#btn-confirmar-si')
            pg.wait_for_function("id => !SRP.cola.de(id).length", arg=b2, timeout=10000)
            pg.wait_for_timeout(500)
            quedo = pg.evaluate("""async id => ({ arbol: !!(await SRP.almacen.uno('plantaciones', id)), historial: (await SRP.almacen.porIndiceLocal('bitacora', 'entidad_id', id)).length,
              ventana: document.getElementById('dlg-rechazos').open, items: document.querySelectorAll('#lista-rechazos > li').length })""", b2)
            ok(confirma[0] == '¿Eliminar el Ahuehuete de este teléfono?' and 'No se puede deshacer' in confirma[1] and quedo == {'arbol': False, 'historial': 0, 'ventana': True, 'items': 1}
               and apoyo('leer', {'id': b2})['arbol'] is None,
               '«Eliminar este registro» pide confirmación y lo quita del teléfono con su historial; nunca llegó al servidor, y la ventana sigue con lo que falta: %s · %s' % (confirma, quedo))
            pg.click('#dlg-rechazos .dialogo-cerrar')

            # Una corrección de la jornada que el servidor no acepta: la tarjeta lo dice, y «Descartar mi cambio»
            pg.evaluate("""async id => { const j = await SRP.almacen.unoLocal('jornadas', id);
              await SRP.almacen.guardarConBitacora('jornadas', Object.assign({}, j, { nombre: '' }), SRP.bitacora.entrada('EDITADO', 'jornada', id, 'Campos: nombre'), 'jornada.editar'); }""", j2)
            rechazados(pg, 2)
            pg.evaluate("SRP.app.mostrarVista('jornadas')"); pg.wait_for_timeout(1200)
            tarjeta = pg.evaluate("id => { const li = document.querySelector('#lista-jornadas li[data-clave=\"' + id + '\"]'); return li ? li.querySelector('.jornada-marcas').textContent : null; }", j2)
            v = {x['id']: x for x in revisar(pg)}
            ok(tarjeta and 'No se pudo enviar' in tarjeta and v[j2]['titulo'] == 'Jornada «sin nombre»' and v[j2]['que'] == 'Corrección: nombre' and v[j2]['botones'] == ['Corregir', 'Descartar mi cambio'],
               'la tarjeta de la jornada dice «No se pudo enviar», y la ventana ofrece «Corregir» y «Descartar mi cambio»: %s · %s' % (tarjeta, v.get(j2)))
            pg.click('#lista-rechazos li[data-n="%s"] button[data-accion="descartar"]' % v[j2]['n'])
            pg.wait_for_selector('#dlg-confirmar[open]')
            pg.click('#btn-confirmar-si')
            pg.wait_for_function("id => !SRP.cola.de(id).length", arg=j2, timeout=10000)
            pg.wait_for_timeout(500)
            loc = pg.evaluate(LOCAL, j2)['jornada']
            f = pg.evaluate(FRANJA)
            ok(loc and loc['nombre'] == 'Jornada de los rechazos' and apoyo('leer', {'id': j2})['jornada']['nombre'] == 'Jornada de los rechazos' and f['texto'].startswith('El servidor no aceptó 1 cambio.'),
               '«Descartar mi cambio» deja la jornada en el teléfono como la tiene el servidor, y la franja cuenta lo que falta: %s · %s' % (loc and loc['nombre'], f['texto']))
            pg.click('#dlg-rechazos .dialogo-cerrar')
            # Cerrada y con su reporte, sale del teléfono con su árbol
            pg.evaluate("async id => { const j = await SRP.almacen.uno('jornadas', id); await SRP.activa.cambiarEstatus(j, 'cerrada'); }", j2)
            esperar_cola(pg, 1)
            pg.evaluate("async id => { const j = await SRP.almacen.uno('jornadas', id); await SRP.reportes.marcarGenerado(j, null); }", j2)
            esperar_cola(pg, 1)

            # La sesión que vence a medio árbol no saca a nadie del formulario
            pg.evaluate("SRP.app.mostrarVista('registrar')")
            pg.wait_for_timeout(500)
            pg.fill('#campo-comentarios', 'A medias')
            pg.evaluate("() => SRP.sesion.perdida('Su sesión venció.')")
            sigue = pg.evaluate("() => [SRP.app.vista, !!SRP.sesion.usuario, document.getElementById('aviso').textContent]")
            ok(sigue[0] == 'registrar' and sigue[1] and 'Termine el árbol' in sigue[2], 'si la sesión vence con un árbol a medias, se avisa y no se pierde lo capturado: %s' % sigue)
            pg.evaluate("() => { SRP.formulario.limpiar(); SRP.sesion.perdida('Su sesión venció.'); }")
            ok(not dentro(pg), 'y sin árbol a medias, se pide entrar de nuevo')
            entrar(pg, CABO['correo'], CLAVE)

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
            # La sesión de antes de la prueba de la sesión vencida sigue abierta en el servidor: se cuenta una menos
            ok(not dentro(pg) and antes['abiertas'] >= 1 and despues['abiertas'] == antes['abiertas'] - 1, '«Cerrar sesión» cierra también la sesión en el servidor: %s → %s' % (antes, despues))
            ok(pg.evaluate("() => [SRP.remoto.plantaciones.size, SRP.remoto.jornadas.size, SRP.remoto.estado]") == [0, 0, 'sin-cargar'], 'y suelta lo enviado que tenía en memoria')
            abrir(pg)
            ok(not dentro(pg), 'y al volver a abrir se pide entrar')

            # La Administración: todas las cuentas, con correo, y todo lo enviado; cuánto tarda en llegar
            entrar(pg, ADMIN['correo'], CLAVE)
            t0 = time.time()
            esperar_remoto(pg)
            segundos = time.time() - t0
            a = pg.evaluate("""async () => ({ cuentas: (await SRP.almacen.todosLocales('usuarios')).filter(u => typeof u.correo === 'string').length,
                arboles: SRP.remoto.plantaciones.size, jornadas: SRP.remoto.jornadas.size,
                locales: (await SRP.almacen.todosLocales('plantaciones')).filter(r => !SRP.cola.de(r.id).length).length })""")
            ok(a['cuentas'] > 20 and a['arboles'] > 17000 and a['jornadas'] > 1000 and a['locales'] == 0,
               'la Administración baja todas las cuentas con su correo y trae todo lo enviado en %.1f s, sin guardarlo (en el teléfono sólo queda lo que espera envío): %s' % (segundos, a))

            # ---------- Los catálogos de la Administración, en el servidor ----------
            AREA = 'Área de la prueba de conexión ' + CORRIDA
            pg.evaluate("SRP.app.mostrarVista('catalogos')"); pg.wait_for_timeout(600)
            pg.click('#cat-tipos .chip[data-tipo="area"]'); pg.wait_for_timeout(1200)
            uso_sia = pg.evaluate("() => { const tr = document.querySelector('#tabla-catalogo tr[data-id=\"a-sia\"]'); return tr && tr.querySelector('td[data-etiqueta=\"Uso\"]').textContent; }")
            pg.click('#btn-cat-agregar'); pg.wait_for_timeout(300)
            pg.fill('#cat-nombre', AREA)
            clave = pg.input_value('#cat-clave')
            pg.click('#btn-cat-guardar')
            pg.wait_for_function("() => !document.getElementById('dlg-catalogo').open", timeout=15000)
            pg.wait_for_timeout(800)
            srv = apoyo('catalogo', {'tabla': 'areas', 'clave': clave})['fila']
            CATALOGO = """id => { const c = SRP.ref.catalogoPorId[id], tr = document.querySelector('#tabla-catalogo tr[data-id="' + id + '"]');
              return { local: c ? { nombre: c.nombre, activo: c.activo } : null, uso: tr ? tr.querySelector('td[data-etiqueta="Uso"]').textContent : null }; }"""
            loc = pg.evaluate(CATALOGO, srv and srv['id'])
            ok(srv and srv['nombre'] == AREA and srv['creado_por_id'] == ADMIN['id'] and loc == {'local': {'nombre': AREA, 'activo': True}, 'uso': 'Sin uso'} and uso_sia and 'cuenta' in uso_sia,
               'un área dada de alta en Catálogos llega al servidor y queda en el teléfono; el uso lo cuenta el servidor: %s · %s · %s' % (srv and srv['nombre'], loc, uso_sia))

            # Renombrar
            pg.click('#tabla-catalogo tr[data-id="%s"] .c-titulo' % srv['id']); pg.wait_for_timeout(300)
            pg.fill('#cat-nombre', AREA + ' renombrada')
            pg.click('#btn-cat-guardar')
            pg.wait_for_function("() => !document.getElementById('dlg-catalogo').open", timeout=15000)
            pg.wait_for_timeout(600)
            ok(apoyo('catalogo', {'tabla': 'areas', 'clave': clave})['fila']['nombre'] == AREA + ' renombrada' and pg.evaluate(CATALOGO, srv['id'])['local']['nombre'] == AREA + ' renombrada',
               'renombrarla también llega al servidor')

            # Lo que el servidor no acepta se dice en el formulario: otra persona ya dio de alta ese nombre
            OTRA = 'Otra área de la prueba ' + CORRIDA
            apoyo('otro_valor', {'tabla': 'areas', 'id': str(uuid.uuid4()), 'clave': 'OTRA_PRUEBA_' + CORRIDA, 'nombre': OTRA, 'por': ADMIN['id']})
            pg.click('#btn-cat-agregar'); pg.wait_for_timeout(300)
            pg.fill('#cat-nombre', OTRA)
            pg.click('#btn-cat-guardar'); pg.wait_for_timeout(1500)
            e = pg.evaluate("() => [document.getElementById('dlg-catalogo').open, (document.getElementById('cat-nombre-error') || {}).textContent || '']")
            ok(e[0] and 'Ya existe un valor con ese nombre' in e[1], 'si otra persona ya dio de alta ese nombre, el servidor no lo acepta y el formulario lo dice en su campo: %s' % e)
            pg.click('#dlg-catalogo .dialogo-cerrar')

            # Sin conexión nada cambia, y se dice
            ctx.route('**/api/srp/**', lambda r: r.abort())
            pg.evaluate("id => { SRP.catalogos.cambiarEstado(SRP.ref.catalogoPorId[id]); }", srv['id']); pg.wait_for_timeout(1200)
            aviso = pg.evaluate("() => document.getElementById('aviso').textContent")
            ok('Sin conexión con el servidor: el catálogo no cambió' in aviso and pg.evaluate(CATALOGO, srv['id'])['local']['activo'] and apoyo('catalogo', {'tabla': 'areas', 'clave': clave})['fila']['activo'],
               'sin conexión, desactivar no cambia nada y se dice: %s' % aviso)
            ctx.unroute('**/api/srp/**')

            # Desactivar y eliminar
            pg.evaluate("id => { SRP.catalogos.cambiarEstado(SRP.ref.catalogoPorId[id]); }", srv['id']); pg.wait_for_timeout(1500)
            ok(apoyo('catalogo', {'tabla': 'areas', 'clave': clave})['fila']['activo'] is False and pg.evaluate(CATALOGO, srv['id'])['local']['activo'] is False,
               'desactivarla llega al servidor')
            pg.evaluate("id => { SRP.catalogos.eliminar(SRP.ref.catalogoPorId[id]); }", srv['id'])
            pg.wait_for_selector('#dlg-confirmar[open]', timeout=15000)
            pg.fill('#confirmar-palabra', 'ELIMINAR'); pg.click('#btn-confirmar-si')
            pg.wait_for_timeout(1500)
            ok(apoyo('catalogo', {'tabla': 'areas', 'clave': clave})['fila'] is None and pg.evaluate(CATALOGO, srv['id'])['local'] is None,
               'y eliminarla, sin uso, la quita del servidor y del teléfono')

            # El Registro de cambios lo trae la bitácora del servidor: el teléfono no anota los de catálogos
            c = pg.evaluate(CAMBIOS)
            ok(c['renglones'] and 'Eliminación del área' in c['renglones'][0] and AREA + ' renombrada' in c['renglones'][0] and 'Desactivación' in c['renglones'][1]
               and 'Edición' in c['renglones'][2] and 'Por ' + ADMIN['nombre'] in c['renglones'][0],
               'el Registro de cambios trae de la bitácora del servidor lo que se hizo con el área, lo más reciente primero: %s · %s' % (c['cuenta'], c['renglones'][:3]))
            ctx.route('**/api/srp/**', lambda r: r.abort())
            pg.evaluate(CAMBIOS)
            aviso = pg.evaluate("() => document.getElementById('aviso').textContent")
            ok('se ven sólo los cambios hechos en este equipo' in aviso, 'sin conexión, el Registro de cambios dice que sólo ve lo de este equipo: %s' % aviso)
            ctx.unroute('**/api/srp/**')

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
