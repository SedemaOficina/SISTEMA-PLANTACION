"""MANUAL DE LA ADMINISTRACIÓN GLOBAL: toma las capturas de la aplicación con datos reales, contra el servicio
local, y arma el PDF a partir de docs/manual/manual-administracion.html.

Hace lo mismo que la prueba de conexión (pruebas/prueba_conexion.py): arranca el servicio y el servidor de la
aplicación en puertos propios, da de alta sus cuentas de ejemplo en la base local y al terminar las quita, con
todo lo que hicieron. Las capturas son de teléfono; una, de computadora.

Las toma con Edge, si está instalado, para que los controles del navegador digan su texto en español
(«Elegir archivo»); si no, con el Chromium de Playwright.

Dos cuidados, porque el manual se publica:
  · la contraseña temporal que se ve es de ejemplo: la que da el servicio se reemplaza antes de la captura;
  · ninguna captura enseña el catálogo de vehículos, que en la base local tiene las placas reales.

Uso, desde la carpeta del proyecto (con la base local cargada):
  python herramientas/manual_administracion.py              las capturas y el PDF
  python herramientas/manual_administracion.py --solo-pdf   sólo el PDF, con las capturas que ya hay
"""
import datetime
import os
import random
import subprocess
import sys
import tempfile
import uuid

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(RAIZ, 'pruebas'))
import prueba_conexion as pc  # noqa: E402  (el arranque del servicio, la aplicación con datos reales y el apoyo de la base)
from PIL import Image  # noqa: E402
from playwright.sync_api import sync_playwright  # noqa: E402

MANUAL = os.path.join(RAIZ, 'docs', 'manual')
CAPTURAS = os.path.join(MANUAL, 'capturas')
HTML = os.path.join(MANUAL, 'manual-administracion.html')
PDF = os.path.join(MANUAL, 'Manual-Administracion-SRP.pdf')
PUERTO_API, PUERTO_APP = 3112, 8096
BASE = 'http://127.0.0.1:%d/' % PUERTO_APP
TELEFONO = {'width': 390, 'height': 844}
TEMPORAL_DE_EJEMPLO = 'kq7m-x3ft-9wbn'


def cuenta(nombre, correo, perfil, cargo, **x):
    return dict(id=str(uuid.uuid4()), correo=correo, nombre=nombre, perfil=perfil, organizacion_id='o-sedema', clave=pc.CLAVE, cargo=cargo, **x)


ADMIN = cuenta('Laura Méndez Ejemplo', 'laura.mendez@ejemplo.local', 'ADMIN', 'Administración del sistema')
NUEVA = cuenta('Pedro Ramírez Ejemplo', 'pedro.ramirez@ejemplo.local', 'CABO', 'Técnico de campo', temporal=True)


def foto(pg, nombre, alto=None, aviso=False, entera=False):
    """La pantalla como se ve, sin el puntero ni el foco encima de nada; `alto`, para lo que no cabe. El aviso
    de abajo de la pantalla sólo sale si es de lo que trata la captura. Sin la franja de arriba ni las pestañas
    de abajo, que son iguales en todas, salvo con `entera`: así caben dos por página en el manual."""
    if not aviso:
        pg.evaluate("() => { document.getElementById('aviso').hidden = true; }")
    if alto:
        pg.set_viewport_size({'width': TELEFONO['width'], 'height': alto})
    pg.mouse.move(1, 1)
    pg.evaluate("() => document.activeElement && document.activeElement.blur()")
    pg.wait_for_timeout(400)
    ruta = os.path.join(CAPTURAS, nombre + '.png')
    if entera:
        pg.screenshot(path=ruta)
    else:
        arriba, abajo, alto_vista = pg.evaluate("""() => { const n = document.getElementById('navegacion');
          return [Math.max(document.querySelector('header.encabezado').getBoundingClientRect().bottom, document.getElementById('version-sia').getBoundingClientRect().bottom),
            n && !n.hidden ? n.getBoundingClientRect().top : innerHeight, innerHeight]; }""")
        arriba = max(0, min(arriba, 160))
        pg.screenshot(path=ruta, clip={'x': 0, 'y': arriba, 'width': TELEFONO['width'], 'height': min(abajo, alto_vista) - arriba})
    if alto:
        pg.set_viewport_size(TELEFONO)
    # Menos colores pesa la mitad y se ve igual
    Image.open(ruta).convert('RGB').quantize(colors=256).save(ruta, optimize=True)


def vista(pg, nombre, espera=2500):
    pg.evaluate("v => SRP.app.mostrarVista(v)", nombre)
    pg.wait_for_timeout(espera)


def temporal_de_ejemplo(pg):
    pg.wait_for_selector('#dlg-clave-temporal[open]', timeout=30000)
    pg.evaluate("t => { document.getElementById('clave-temporal-valor').textContent = t; }", TEMPORAL_DE_EJEMPLO)


def menu(pg, correo, accion):
    uid = pg.evaluate("c => SRP.ref.usuarios.find(u => u.correo === c).id", correo)
    pg.click('#tabla-usuarios tr[data-id="%s"] .btn-tuerca' % uid)
    if accion:
        pg.click('#tabla-usuarios .menu-acciones:not([hidden]) button[data-accion="%s"]' % accion)


def alta(pg, nombre, correo, cargo, captura=None):
    pg.click('#btn-usr-agregar'); pg.wait_for_selector('#dlg-usuario[open]')
    pg.select_option('#usr-tipo-org', 'Alcaldía')
    pg.select_option('#usr-organizacion', label='Iztapalapa')
    pg.fill('#usr-nombre-completo', nombre); pg.fill('#usr-correo', correo); pg.fill('#usr-cargo', cargo)
    pg.select_option('#usr-perfil', 'CABO')
    if captura:
        foto(pg, captura, alto=1240)
    pg.click('#btn-usr-guardar')
    temporal_de_ejemplo(pg)


def capturas(b):
    os.makedirs(CAPTURAS, exist_ok=True)
    ctx = b.new_context(viewport=TELEFONO, device_scale_factor=2, service_workers='block', locale='es-MX')
    ctx.route('**/js/config.js*', pc.config_real)
    pg = ctx.new_page()
    errores = []
    pg.on('pageerror', lambda e: errores.append(str(e)))

    # Entrar
    pc.abrir(pg)
    pg.fill('#acceso-correo', ADMIN['correo']); pg.fill('#acceso-clave', ADMIN['clave'])
    foto(pg, '01-entrada')
    pc.entrar(pg, ADMIN['correo'], ADMIN['clave'])
    pg.wait_for_timeout(4000)

    # «Cambie su contraseña», en el teléfono de quien recibió una temporal
    otro = b.new_context(viewport=TELEFONO, device_scale_factor=2, service_workers='block', locale='es-MX')
    otro.route('**/js/config.js*', pc.config_real)
    p2 = otro.new_page()
    pc.abrir(p2)
    pc.entrar(p2, NUEVA['correo'], NUEVA['clave'])
    p2.fill('#temporal-nueva', 'Arbolito 2026'); p2.fill('#temporal-otra', 'Arbolito 2026')
    foto(p2, '02-cambie-contrasena')
    otro.close()

    # Configuración, en teléfono y en computadora
    vista(pg, 'configuracion')
    foto(pg, '03-configuracion', entera=True)
    compu = b.new_context(viewport={'width': 1180, 'height': 760}, device_scale_factor=1.5, service_workers='block', locale='es-MX')
    compu.route('**/js/config.js*', pc.config_real)
    p3 = compu.new_page()
    pc.abrir(p3)
    pc.entrar(p3, ADMIN['correo'], ADMIN['clave']); p3.wait_for_timeout(4000)
    vista(p3, 'configuracion')
    p3.mouse.move(1, 1)
    p3.screenshot(path=os.path.join(CAPTURAS, '03b-configuracion-computadora.png'))
    Image.open(os.path.join(CAPTURAS, '03b-configuracion-computadora.png')).convert('RGB').quantize(colors=256).save(
        os.path.join(CAPTURAS, '03b-configuracion-computadora.png'), optimize=True)
    compu.close()

    # Usuarios: la lista, el alta y la temporal
    vista(pg, 'usuarios')
    foto(pg, '04-usuarios')
    alta(pg, 'Irma Palmera Ejemplo', 'irma.palmera@ejemplo.local', 'Técnica de campo', captura='05-alta')
    foto(pg, '06-cuenta-creada')
    pg.click('#btn-clave-temporal-listo'); pg.wait_for_timeout(800)
    # La tuerca de una cuenta y «Restablecer contraseña»
    menu(pg, 'irma.palmera@ejemplo.local', None)
    pg.evaluate("() => document.querySelector('#tabla-usuarios .menu-acciones:not([hidden])').closest('tr').scrollIntoView({ block: 'center' })")
    foto(pg, '07-menu-cuenta')
    pg.click('#tabla-usuarios .menu-acciones:not([hidden]) button[data-accion="restablecer"]')
    pg.wait_for_selector('#dlg-confirmar[open]')
    foto(pg, '08-restablecer')
    pg.click('#btn-confirmar-si')
    temporal_de_ejemplo(pg)
    foto(pg, '09-contrasena-restablecida')
    pg.click('#btn-clave-temporal-listo'); pg.wait_for_timeout(800)
    # Desactivar, con su «Deshacer»
    menu(pg, 'irma.palmera@ejemplo.local', 'estado'); pg.wait_for_timeout(1500)
    foto(pg, '10-desactivada', aviso=True)
    pg.click('#aviso .aviso-accion'); pg.wait_for_timeout(1500)
    # Eliminar una cuenta sin uso: se da de alta otra y se elimina
    alta(pg, 'José López Ejemplo', 'jose.lopez@ejemplo.local', 'Técnico de campo')
    pg.click('#btn-clave-temporal-listo'); pg.wait_for_timeout(800)
    vista(pg, 'usuarios', 1500)
    menu(pg, 'jose.lopez@ejemplo.local', 'eliminar')
    pg.wait_for_selector('#dlg-confirmar[open]')
    pg.fill('#confirmar-palabra', 'jose.lopez@ejemplo.local')
    foto(pg, '11-eliminar')
    pg.click('#btn-confirmar-si'); pg.wait_for_timeout(1500)

    # Catálogos: programas, un programa e instituciones (los vehículos no: tienen las placas reales)
    vista(pg, 'catalogos')
    foto(pg, '12-catalogos')
    pg.click('#tabla-catalogo tr[data-id="p-refor"] .c-titulo'); pg.wait_for_selector('#dlg-catalogo[open]')
    foto(pg, '13-programa', alto=1000)
    pg.keyboard.press('Escape'); pg.wait_for_timeout(500)
    pg.click('#cat-tipos [data-tipo="organizacion"]'); pg.wait_for_timeout(1200)
    pg.evaluate("() => document.getElementById('tabla-catalogo').scrollIntoView({ block: 'start' })")
    foto(pg, '14-instituciones')

    # Parámetros y uno abierto para editarlo, sin guardar
    vista(pg, 'parametros')
    foto(pg, '15-parametros')
    pg.click('button[data-parametro]'); pg.wait_for_selector('#dlg-parametro[open]')
    foto(pg, '16-parametro')
    pg.keyboard.press('Escape'); pg.wait_for_timeout(500)

    # Posibles duplicados: una pareja de la base local, que se quita al terminar
    par = pc.apoyo('cercanos', {})
    pareja = pc.apoyo('pareja', {'llego': par['llego'], 'cercano': par['cercano'], 'distancia': par['distancia']})['id']
    try:
        vista(pg, 'duplicados', 5000)
        pg.evaluate("() => document.querySelector('.dup-pareja').scrollIntoView({ block: 'start' })")
        foto(pg, '17-duplicados')
        pg.evaluate("() => document.querySelector('.dup-pareja [data-resolver]').scrollIntoView({ block: 'center' })")
        foto(pg, '17b-duplicados-decidir')
    finally:
        pc.apoyo('sin_pareja', {'id': pareja})

    # Carga masiva: un archivo de cuatro árboles, su revisión, la carga y deshacerla
    carpeta = tempfile.mkdtemp(prefix='srp-manual-')
    archivo = os.path.join(carpeta, 'arboles-2024.csv')
    base_lat = 19.35 + random.randint(0, 900) / 100000
    with open(archivo, 'w', encoding='utf-8', newline='') as f:
        f.write('Latitud,Longitud,Nombre científico,Fecha de plantación,Programa,Tipo de institución,Institución\n')
        for i in range(4):
            f.write('%.6f,%.6f,Taxodium mucronatum,2024-05-10,Reforestación Urbana,Alcaldía,Iztapalapa\n' % (base_lat + i * 0.0001, -99.07 - i * 0.0001))
    vista(pg, 'carga', 1500)
    pg.set_input_files('#carga-archivo', archivo); pg.wait_for_timeout(2500)
    pg.evaluate("() => document.getElementById('carga-revision').scrollIntoView({ block: 'start' })")
    foto(pg, '18-carga-revision')
    pg.click('#btn-carga-cargar'); pg.wait_for_selector('#dlg-confirmar[open]')
    foto(pg, '19-carga-confirmar')
    pg.click('#btn-confirmar-si')
    pg.wait_for_function("() => (document.getElementById('carga-hecha').textContent || '').startsWith('Última carga')", timeout=60000)
    pg.wait_for_timeout(1500)
    pg.evaluate("() => document.getElementById('carga-lotes').scrollIntoView({ block: 'center' })")
    foto(pg, '20-cargas-hechas')
    pg.click('#carga-lotes button[data-lote]'); pg.wait_for_selector('#dlg-confirmar[open]')
    pg.fill('#confirmar-palabra', 'DESHACER')
    foto(pg, '21-deshacer')
    pg.click('#btn-confirmar-si'); pg.wait_for_timeout(5000)
    os.remove(archivo); os.rmdir(carpeta)

    # Registro de cambios y Registros
    vista(pg, 'cambios')
    foto(pg, '22-cambios', alto=1200)
    vista(pg, 'registros', 4000)
    foto(pg, '23-registros')
    ctx.close()
    if errores:
        raise RuntimeError('errores en la página: %s' % errores)


def armar_pdf(b):
    pg = b.new_page()
    pg.goto('file:///' + HTML.replace('\\', '/'))
    pg.wait_for_load_state('load')
    # La versión del sistema y la fecha del manual, en la portada
    version = open(os.path.join(RAIZ, 'VERSION'), encoding='utf-8').read().strip()
    meses = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']
    hoy = datetime.date.today()
    pg.evaluate("""([v, f]) => { document.querySelectorAll('[data-version]').forEach(e => { e.textContent = v; });
      document.querySelectorAll('[data-fecha]').forEach(e => { e.textContent = f; }); }""", [version, '%d de %s de %d' % (hoy.day, meses[hoy.month - 1], hoy.year)])
    pie =('<div style="font: 8px sans-serif; color: #666; width: 100%; padding: 0 14mm; display: flex; justify-content: space-between;">'
           '<span>Sistema de Registro de Plantaciones · Manual de la Administración global</span>'
           '<span>Página <span class="pageNumber"></span> de <span class="totalPages"></span></span></div>')
    pg.pdf(path=PDF, format='A4', print_background=True, display_header_footer=True, header_template='<span></span>', footer_template=pie,
           margin={'top': '16mm', 'bottom': '18mm', 'left': '16mm', 'right': '16mm'})
    pg.close()


def main():
    solo_pdf = '--solo-pdf' in sys.argv
    if solo_pdf:
        with sync_playwright() as p:
            b = p.chromium.launch()
            armar_pdf(b)
            b.close()
        print(PDF)
        return
    subprocess.run('npm run build', cwd=pc.SERVIDOR, shell=True, check=True, capture_output=True)
    pc.apoyo('preparar', {'cuentas': [ADMIN, NUEVA]})
    entorno = dict(os.environ, SRP_PUERTO=str(PUERTO_API), SRP_COOKIE_SEGURA='no', SRP_ROL='srp_api', SRP_PROXY='1')
    servicio = subprocess.Popen(['node', os.path.join('dist', 'iniciar.js')], cwd=pc.SERVIDOR, env=entorno, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    app = subprocess.Popen([sys.executable, os.path.join('pruebas', 'servir.py'), str(PUERTO_APP), '--api', 'http://127.0.0.1:%d' % PUERTO_API],
                           cwd=RAIZ, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    try:
        if not (pc.esperar_puerto(PUERTO_API) and pc.esperar_puerto(PUERTO_APP)):
            raise RuntimeError('el servicio o el servidor de la aplicación no arrancaron')
        with sync_playwright() as p:
            try:
                b = p.chromium.launch(channel='msedge')
            except Exception:
                b = p.chromium.launch(args=['--lang=es-MX'])
            pc.BASE = BASE   # abrir() de la prueba de conexión abre esta dirección
            capturas(b)
            armar_pdf(b)
            b.close()
    finally:
        servicio.terminate()
        app.terminate()
        pc.apoyo('quitar', {'ids': [ADMIN['id'], NUEVA['id']]})
    print(PDF)


if __name__ == '__main__':
    main()
