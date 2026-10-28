"""Apoyo común de los guiones del revisor r6 (auditoría del 27-10-2026). Sólo lectura sobre el proyecto: corre la
aplicación como irá al SIA (copia de herramientas/preparar_produccion.py, con ES_FICTICIO en false) contra el
servicio local, con la cuenta del servicio (SRP_ROL=srp_api), en los puertos del revisor r6.

  Servicio 3126 · aplicación con datos reales 8126 · fotografías en r6/fotos.

Las cuentas de prueba se crean con pruebas/apoyo_servidor.mjs preparar y se quitan con quitar y, justo después,
preparar con una lista vacía, que vuelve a prestar el rol srp_api que quitar revoca.
"""
import json
import os
import socket
import subprocess
import sys
import time
import uuid

R6 = r'C:\sia-rev\tmp\aud1027\r6'
SERVIDOR = os.path.join(R6, 'servidor')
APP = os.path.join(R6, 'tmp', 'app-sia')
FOTOS = os.path.join(R6, 'fotos')
EVID = os.path.join(R6, 'evidencia')
PUERTO_API, PUERTO_APP = 3126, 8126
BASE = 'http://127.0.0.1:%d/' % PUERTO_APP
CLAVE = os.environ['R6_CLAVE']   # contraseña de las cuentas de prueba: se pasa por la variable R6_CLAVE (se quitó del archivo)
HOY = time.strftime('%Y-%m-%d')
GEO = {'latitude': 19.357, 'longitude': -99.06, 'accuracy': 5}


def cuenta(nombre, perfil, corrida):
    return dict(id=str(uuid.uuid4()), correo='r6.%s.%s@ejemplo.local' % (nombre, corrida), nombre='R6 %s %s' % (nombre.capitalize(), corrida[-4:]),
                perfil=perfil, organizacion_id='o-sedema', clave=CLAVE)


def apoyo(orden, datos):
    r = subprocess.run(['node', os.path.join('pruebas', 'apoyo_servidor.mjs'), orden], input=json.dumps(datos), capture_output=True,
                       text=True, encoding='utf-8', cwd=R6, timeout=180)
    salida = json.loads(r.stdout or '{}')
    if salida.get('ok') is False:
        raise RuntimeError('apoyo_servidor %s: %s %s' % (orden, salida.get('error'), r.stderr))
    return salida


def quitar_cuentas(ids):
    apoyo('quitar', {'ids': ids})
    apoyo('preparar', {'cuentas': []})


def esperar_puerto(puerto, segundos=40):
    fin = time.time() + segundos
    while time.time() < fin:
        with socket.socket() as s:
            if s.connect_ex(('127.0.0.1', puerto)) == 0:
                return True
        time.sleep(0.3)
    return False


def arrancar():
    """El servicio y la aplicación; devuelve los dos procesos."""
    os.makedirs(FOTOS, exist_ok=True)
    entorno = dict(os.environ, SRP_PUERTO=str(PUERTO_API), SRP_COOKIE_SEGURA='no', SRP_ROL='srp_api', SRP_PROXY='1', SRP_FOTOS_DIR=FOTOS)
    servicio = subprocess.Popen(['node', os.path.join('dist', 'iniciar.js')], cwd=SERVIDOR, env=entorno,
                                stdout=open(os.path.join(EVID, 'servicio.log'), 'a'), stderr=subprocess.STDOUT)
    app = subprocess.Popen([sys.executable, os.path.join('pruebas', 'servir.py'), str(PUERTO_APP), '--api', 'http://127.0.0.1:%d' % PUERTO_API,
                            '--raiz', APP], cwd=R6, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    if not (esperar_puerto(PUERTO_API) and esperar_puerto(PUERTO_APP)):
        servicio.terminate(); app.terminate()
        raise RuntimeError('el servicio o la aplicación no arrancaron')
    return servicio, app


# ---------- En el navegador ----------

def abrir(pg):
    pg.goto(BASE)
    pg.wait_for_selector('html[data-listo]', timeout=60000)


def entrar(pg, correo, clave=CLAVE):
    pg.fill('#acceso-correo', correo)
    pg.fill('#acceso-clave', clave)
    pg.click('#form-acceso button[type="submit"]')
    pg.wait_for_function("() => !document.getElementById('navegacion').hidden || !document.getElementById('acceso-errores').hidden", timeout=60000)


def esperar_remoto(pg, estados=('listo',), espera=180000):
    pg.wait_for_function("e => e.includes(SRP.remoto.estado)", arg=list(estados), timeout=espera)


def esperar_cola(pg, quedan=0, espera=60000):
    pg.wait_for_function("n => SRP.cola.ops.filter(o => !o.rechazo).length <= n && !SRP.envio.enviando", arg=quedan, timeout=espera)
    pg.wait_for_timeout(300)


def envio_quieto(pg, espera=60000):
    """Sin envío en curso, después de que la cola se movió."""
    pg.wait_for_timeout(1500)
    pg.wait_for_function("() => !SRP.envio.enviando", timeout=espera)
    pg.wait_for_timeout(500)


DIALOGO = """() => { const d = document.getElementById('dlg-confirmar'); if (!d.open) return null;
  const t = id => { const e = document.getElementById(id); return e && !e.hidden ? e.textContent.trim().replace(/\\s+/g, ' ') : ''; };
  return { titulo: t('dlg-confirmar-titulo'), pregunta: (d.querySelector('.confirmar-pregunta') || {}).textContent || '', puntos: t('dlg-confirmar-puntos'), nota: t('dlg-confirmar-nota'),
    si: t('btn-confirmar-si'), no: t('btn-confirmar-no') }; }"""


def dialogo(pg):
    return pg.evaluate(DIALOGO)


def aceptar_avisos(pg, veces=3):
    """Toca «Entendido» en los avisos al entrar (jornada compartida, relevo); devuelve lo que decían."""
    vistos = []
    for _ in range(veces):
        pg.wait_for_timeout(700)
        d = dialogo(pg)
        if not d:
            break
        vistos.append(d)
        pg.click('#btn-confirmar-si')
    return vistos


def ir(pg, vista):
    pg.evaluate("v => SRP.app.mostrarVista(v)", vista)
    pg.wait_for_timeout(700)


def iniciar_jornada(pg, nombre, apoyos=None):
    """Declara una jornada desde Nuevo registro, como la persona; con `apoyos`, «Varios cabos · jornada compartida»."""
    ir(pg, 'registrar')
    if pg.is_hidden('#panel-iniciar-jornada'):
        pg.click('#btn-jornada-cambiar'); pg.wait_for_timeout(300); pg.click('#btn-cambiar-nueva'); pg.wait_for_timeout(400)
    pg.fill('#ini-nombre', nombre)
    pg.fill('#ini-fecha', HOY)
    pg.select_option('#ini-programa', 'p-refor')
    pg.fill('#ini-meta', '10')
    pg.click('#btn-ini-detectar'); pg.wait_for_timeout(1200)
    if apoyos:
        pg.click('#ini-quien .chip[data-quien="varios"]'); pg.wait_for_timeout(200)
        for a in apoyos:
            pg.click('#ini-apoyos .chip[data-id="%s"]' % a)
    pg.click('#btn-iniciar-jornada')
    pg.wait_for_timeout(1000)
    return pg.evaluate("SRP.activa.jornada && SRP.activa.jornada.id")


def registrar(pg):
    """Captura un ahuehuete de principio a fin en la jornada activa y devuelve su identificador (o None)."""
    ir(pg, 'registrar')
    antes = pg.evaluate("SRP.formulario.estado.ultimoGuardado")
    pg.click('#btn-ubicacion'); pg.wait_for_timeout(1200)
    pg.fill('#campo-especie', 'ahuehu'); pg.wait_for_timeout(300)
    pg.dispatch_event('.combo-opcion[data-id="ESP-0070"]', 'mousedown'); pg.wait_for_timeout(200)
    pg.click('#form-plantacion button[type=submit]'); pg.wait_for_timeout(900)
    for _ in range(3):
        if pg.is_visible('#dlg-confirmar'):
            pg.click('#btn-confirmar-si'); pg.wait_for_timeout(800)
        if pg.is_visible('#dlg-resumen'):
            pg.click('#btn-resumen-guardar'); pg.wait_for_timeout(800)
    despues = pg.evaluate("SRP.formulario.estado.ultimoGuardado")
    return despues if despues != antes else None


def abrir_ficha(pg, id):
    pg.evaluate("async id => { SRP.app.mostrarVista('jornadas'); await new Promise(r => setTimeout(r, 600)); await SRP.jornadas.abrir(id); }", id)
    pg.wait_for_timeout(2000)


RECHAZOS = """() => [...document.querySelectorAll('#lista-rechazos > li')].map(li => ({ titulo: li.querySelector('h3').textContent,
  que: li.querySelector('.rechazo-que').textContent, porque: li.querySelector('.rechazo-porque').textContent,
  botones: [...li.querySelectorAll('button')].map(b => b.textContent.trim()), id: SRP.cola.ops.find(o => String(o.n) === li.dataset.n).registro_id }))"""

FRANJA = """() => { const f = document.getElementById('franja-envio');
  return { ver: !f.hidden, texto: f.textContent.trim().replace(/\\s+/g, ' ') }; }"""

COLA = """() => SRP.cola.ops.map(o => ({ tipo: o.tipo, registro: o.registro_id, rechazo: o.rechazo ? o.rechazo.codigo + ': ' + o.rechazo.mensaje : null }))"""

ACTIVA = """() => ({ activa: SRP.activa.jornada ? SRP.activa.jornada.nombre : null, activa_id: SRP.activa.jornada ? SRP.activa.jornada.id : null,
  panelIniciar: !document.getElementById('panel-iniciar-jornada').hidden, remoto: SRP.remoto.estado, enLinea: navigator.onLine,
  franja: (document.getElementById('franja-jornada') || {}).textContent ? document.getElementById('franja-jornada').textContent.trim().replace(/\\s+/g, ' ').slice(0, 300) : null })"""

AVISO = "() => { const a = document.getElementById('aviso'); return a && !a.hidden ? a.textContent.trim().replace(/\\s+/g, ' ') : ''; }"


def guardar_json(nombre, datos):
    with open(os.path.join(EVID, nombre), 'w', encoding='utf-8') as f:
        json.dump(datos, f, ensure_ascii=False, indent=1)
