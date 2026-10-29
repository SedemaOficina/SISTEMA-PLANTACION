"""MANUAL DEL PERSONAL (cabos, coordinación y dirección): toma las capturas de la aplicación con datos reales, contra
el servicio local, y arma el PDF a partir de docs/manual/manual-personal.html.

Hace lo mismo que la prueba de conexión (pruebas/prueba_conexion.py): arranca el servicio y el servidor de la
aplicación en puertos propios, da de alta sus cuentas de ejemplo en la base local y al terminar las quita, con todo
lo que registraron. Las capturas son de teléfono, con el GPS del navegador puesto en un camellón de la Condesa.

Tres cuidados, porque el manual se publica:
  · todas las cuentas son inventadas, con apellido «Ejemplo»;
  · ninguna captura enseña la lista de vehículos, que en la base local tiene las placas reales;
  · la fotografía del árbol es un dibujo hecho aquí.

Uso, desde la carpeta del proyecto (con la base local cargada):
  python herramientas/manual_personal.py              las capturas y el PDF
  python herramientas/manual_personal.py --solo-pdf   sólo el PDF, con las capturas que ya hay
  --version 1.0.0                                     el manual de esa versión (herramientas/manual_pdf.py)
"""
import datetime
import os
import subprocess
import sys
import tempfile
import uuid

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(RAIZ, 'pruebas'))
import prueba_conexion as pc  # noqa: E402  (el arranque del servicio, la aplicación con datos reales y el apoyo de la base)
import manual_pdf  # noqa: E402  (el PDF, igual que el del manual de la Administración)
from PIL import Image, ImageDraw, ImageFont  # noqa: E402
from playwright.sync_api import sync_playwright  # noqa: E402

MANUAL = os.path.join(RAIZ, 'docs', 'manual')
CAPTURAS = os.path.join(MANUAL, 'capturas-personal')
HTML = os.path.join(MANUAL, 'manual-personal.html')
PDF = os.path.join(MANUAL, 'Manual-Personal-SRP.pdf')
PUERTO_API, PUERTO_APP = 3113, 8095
BASE = 'http://127.0.0.1:%d/' % PUERTO_APP
TELEFONO = {'width': 390, 'height': 844}
SITIO = (19.411548, -99.169452)   # camellón de Amsterdam, Hipódromo
HOY = datetime.date.today().isoformat()
VERSION = manual_pdf.version_pedida(sys.argv)


def cuenta(nombre, correo, perfil, cargo, **x):
    return dict(id=str(uuid.uuid4()), correo=correo, nombre=nombre, perfil=perfil, organizacion_id='o-sedema', clave=pc.CLAVE, cargo=cargo, **x)


CABO = cuenta('Mariana Torres Ejemplo', 'mariana.torres@ejemplo.local', 'CABO', 'Técnica de campo')
APOYO = cuenta('Julio Méndez Ejemplo', 'julio.mendez@ejemplo.local', 'CABO', 'Técnico de campo')
COORD = cuenta('Laura Ríos Ejemplo', 'laura.rios@ejemplo.local', 'COORDINADOR', 'Coordinadora de cuadrilla')
DIRECCION = cuenta('Ana Beltrán Ejemplo', 'ana.beltran@ejemplo.local', 'DIRECTIVO', 'Directora de área')
NUEVA = cuenta('Pedro Ramírez Ejemplo', 'pedro.ramirez@ejemplo.local', 'CABO', 'Técnico de campo', temporal=True)
CUENTAS = [CABO, APOYO, COORD, DIRECCION, NUEVA]


def guardar(ruta):
    """Menos colores pesa la mitad y se ve igual."""
    Image.open(ruta).convert('RGB').quantize(colors=256).save(ruta, optimize=True)


def limpiar(pg):
    """Sin el aviso de abajo, el puntero ni el foco encima de nada."""
    pg.evaluate("() => { const a = document.getElementById('aviso'); if (a) a.hidden = true; }")
    pg.mouse.move(1, 1)
    pg.evaluate("() => document.activeElement && document.activeElement.blur()")
    pg.wait_for_timeout(500)


def foto(pg, nombre, alto=None, entera=False):
    """La pantalla como se ve; sin la franja de arriba ni las pestañas de abajo, salvo con `entera`."""
    limpiar(pg)
    if alto:
        pg.set_viewport_size({'width': TELEFONO['width'], 'height': alto}); pg.wait_for_timeout(600)
    ruta = os.path.join(CAPTURAS, nombre + '.png')
    if entera:
        pg.screenshot(path=ruta)
    else:
        arriba, abajo = pg.evaluate("""() => { const n = document.getElementById('navegacion');
          return [Math.max(document.querySelector('header.encabezado').getBoundingClientRect().bottom, document.getElementById('version-sia').getBoundingClientRect().bottom),
            n && !n.hidden ? n.getBoundingClientRect().top : innerHeight]; }""")
        pg.screenshot(path=ruta, clip={'x': 0, 'y': arriba, 'width': TELEFONO['width'], 'height': abajo - arriba})
    if alto:
        pg.set_viewport_size(TELEFONO)
    guardar(ruta)


def tramo(pg, nombre, desde, hasta, margen=10):
    """Un pedazo de la página, del principio de `desde` al final de `hasta`, con la vista alta para que quepa."""
    pg.set_viewport_size({'width': TELEFONO['width'], 'height': 2600})
    pg.evaluate("() => window.scrollTo(0, 0)")
    limpiar(pg); pg.wait_for_timeout(800)
    y0, y1 = pg.evaluate("""s => { const a = document.querySelector(s[0]).getBoundingClientRect(), b = document.querySelector(s[1]).getBoundingClientRect();
      return [a.top + scrollY, b.bottom + scrollY]; }""", [desde, hasta])
    ruta = os.path.join(CAPTURAS, nombre + '.png')
    pg.screenshot(path=ruta, full_page=True, clip={'x': 0, 'y': max(0, y0 - margen), 'width': TELEFONO['width'], 'height': y1 - y0 + 2 * margen})
    pg.set_viewport_size(TELEFONO)
    guardar(ruta)


def ventana(pg, nombre, selector, arriba=None, abajo=None):
    """Una ventana abierta, entera; con `arriba`, sólo esos píxeles de arriba (y `abajo`, los de abajo, unidos por
    una banda gris con tres puntos)."""
    pg.set_viewport_size({'width': TELEFONO['width'], 'height': 1800}); pg.wait_for_timeout(700)
    limpiar(pg)
    ruta = os.path.join(CAPTURAS, nombre + '.png')
    pg.locator(selector).screenshot(path=ruta)
    pg.set_viewport_size(TELEFONO)
    if arriba:
        im = Image.open(ruta).convert('RGB')
        w, h = im.size
        partes = [im.crop((0, 0, w, min(h, arriba)))]
        if abajo and h > arriba + abajo:
            banda = Image.new('RGB', (w, 44), (236, 238, 240)); d = ImageDraw.Draw(banda)
            for x in (w // 2 - 24, w // 2, w // 2 + 24):
                d.ellipse((x - 5, 17, x + 5, 27), fill=(120, 124, 130))
            partes += [banda, im.crop((0, h - abajo, w, h))]
        out = Image.new('RGB', (w, sum(p.height for p in partes)), 'white')
        y = 0
        for p in partes:
            out.paste(p, (0, y)); y += p.height
        out.save(ruta)
    guardar(ruta)


def unir(nombre, tramos):
    """Deja de una captura larga sólo esos tramos de píxeles, de arriba abajo, unidos por una banda gris con tres
    puntos. Cada tramo es (desde, hasta); un número negativo cuenta desde abajo y None es el final."""
    ruta = os.path.join(CAPTURAS, nombre + '.png')
    im = Image.open(ruta).convert('RGB')
    w, h = im.size
    partes = []
    for a, z in tramos:
        a = h + a if a < 0 else a
        z = h if z is None else (h + z if z < 0 else min(z, h))
        if partes:
            banda = Image.new('RGB', (w, 44), (236, 238, 240)); d = ImageDraw.Draw(banda)
            for x in (w // 2 - 24, w // 2, w // 2 + 24):
                d.ellipse((x - 5, 17, x + 5, 27), fill=(120, 124, 130))
            partes.append(banda)
        partes.append(im.crop((0, a, w, z)))
    out = Image.new('RGB', (w, sum(p.height for p in partes)), 'white')
    y = 0
    for p in partes:
        out.paste(p, (0, y)); y += p.height
    out.save(ruta)
    guardar(ruta)


def cerrar_ventanas(pg):
    pg.evaluate("() => document.querySelectorAll('dialog[open]').forEach(d => d.close())")
    pg.wait_for_timeout(300)


def foto_de_ejemplo(carpeta):
    ruta = os.path.join(carpeta, 'arbol-ejemplo.jpg')
    im = Image.new('RGB', (800, 600), (214, 228, 238))
    d = ImageDraw.Draw(im)
    d.rectangle([0, 430, 800, 600], fill=(120, 150, 90))
    d.rectangle([388, 250, 412, 470], fill=(96, 70, 48))
    d.ellipse([290, 90, 510, 300], fill=(48, 110, 60))
    try:
        f = ImageFont.truetype('segoeui.ttf', 30)
    except OSError:
        f = ImageFont.load_default()
    d.text((400, 540), 'Fotografía de ejemplo', fill=(255, 255, 255), font=f, anchor='mm')
    im.save(ruta, quality=85)
    return ruta


def contexto(b, precision=6):
    ctx = b.new_context(viewport=TELEFONO, device_scale_factor=2, service_workers='block', locale='es-MX',
                        geolocation={'latitude': SITIO[0], 'longitude': SITIO[1], 'accuracy': precision}, permissions=['geolocation'])
    ctx.route('**/js/config.js*', pc.config_real)
    manual_pdf.marcar_version(ctx, BASE, VERSION)
    return ctx


def entrar(b, quien, espera=5000):
    ctx = contexto(b)
    pg = ctx.new_page()
    pc.abrir(pg)
    pc.entrar(pg, quien['correo'], quien['clave'])
    pg.wait_for_timeout(espera)
    return ctx, pg


def vista(pg, nombre, espera=2500):
    pg.evaluate("v => SRP.app.mostrarVista(v)", nombre)
    pg.wait_for_timeout(espera)


def ubicar(ctx, pg, lat, lng, precision):
    """«Registrar ubicación del punto» con el GPS en ese lugar; la lectura se da por afinada."""
    ctx.set_geolocation({'latitude': lat, 'longitude': lng, 'accuracy': precision})
    pg.click('#btn-ubicacion'); pg.wait_for_timeout(2500)
    pg.evaluate("p => { SRP.mapa.detenerAfinado(); SRP.mapa.mostrarPrecision(p); }", precision)


def especie(pg, texto, id_especie=None):
    pg.fill('#campo-especie', texto); pg.wait_for_timeout(300)
    pg.dispatch_event('.combo-opcion[data-id="%s"]' % id_especie if id_especie else '.combo-opcion', 'mousedown'); pg.wait_for_timeout(300)


def guardar_arbol(pg):
    pg.click('#form-plantacion button[type=submit]'); pg.wait_for_timeout(1500)
    if pg.is_visible('#dlg-confirmar'): pg.click('#btn-confirmar-si'); pg.wait_for_timeout(800)
    if pg.is_visible('#dlg-resumen'): pg.click('#btn-resumen-guardar'); pg.wait_for_timeout(800)
    pg.wait_for_timeout(1500)


def iniciar_jornada(pg, nombre, meta, direccion=''):
    vista(pg, 'registrar', 1000)
    if pg.is_hidden('#panel-iniciar-jornada'):
        pg.click('#btn-jornada-cambiar'); pg.wait_for_timeout(300); pg.click('#btn-cambiar-nueva'); pg.wait_for_timeout(500)
    pg.fill('#ini-nombre', nombre)
    pg.select_option('#ini-programa', 'p-refor')
    pg.fill('#ini-meta', str(meta))
    pg.fill('#ini-fecha', HOY)
    if direccion:
        pg.fill('#ini-ubicacion', direccion)
    pg.click('#btn-ini-detectar'); pg.wait_for_timeout(1500)


def ficha(pg, nombre):
    vista(pg, 'jornadas', 3500)
    pg.evaluate("""n => { const li = [...document.querySelectorAll('#lista-jornadas li.jornada')].find(l => l.innerText.includes(n));
      li.querySelector('button').click(); }""", nombre)
    pg.wait_for_timeout(2500)


def capturas(b):
    os.makedirs(CAPTURAS, exist_ok=True)
    errores = []
    carpeta = tempfile.mkdtemp(prefix='srp-manual-')
    imagen = foto_de_ejemplo(carpeta)
    lat, lng = SITIO

    # Entrar y la contraseña temporal
    ctx = contexto(b); pg = ctx.new_page()
    pc.abrir(pg)
    pg.fill('#acceso-correo', CABO['correo']); pg.fill('#acceso-clave', CABO['clave'])
    foto(pg, 'p01-entrada')
    ctx.close()
    ctx, pg = entrar(b, NUEVA, 3000)
    pg.fill('#temporal-nueva', 'Arbolito 2026'); pg.fill('#temporal-otra', 'Arbolito 2026')
    foto(pg, 'p02-cambie-contrasena')
    ctx.close()

    # El cabo: la jornada, los árboles, sin señal, corregir, cerrar y el reporte
    ctx, pg = entrar(b, CABO)
    pg.on('pageerror', lambda e: errores.append(str(e)))
    cerrar_ventanas(pg)
    iniciar_jornada(pg, 'Camellón de Amsterdam', 40, 'Av. Amsterdam, entre Michoacán y Parque México')
    tramo(pg, 'p07-registrar-jornada', '#panel-iniciar-jornada', '#panel-iniciar-jornada')
    pg.click('#btn-iniciar-jornada'); pg.wait_for_timeout(1500)
    cerrar_ventanas(pg)

    ubicar(ctx, pg, lat, lng, 6)
    especie(pg, 'ahuehu', 'ESP-0070')
    pg.set_input_files('#foto-archivo', imagen); pg.wait_for_timeout(1500)
    tramo(pg, 'p08-arbol-arriba', '#franja-jornada', '#mapa-estado')
    tramo(pg, 'p09-arbol-abajo', 'label[for="campo-especie"]', '#form-plantacion button[type=submit]')
    guardar_arbol(pg)
    pg.wait_for_timeout(1500)
    tramo(pg, 'p10-guardado', '#franja-jornada', '#franja-jornada')

    ubicar(ctx, pg, lat + 0.00012, lng + 0.0001, 24)
    tramo(pg, 'p11-ambar', '#btn-ubicacion', '#mapa-estado')
    especie(pg, 'fresno')
    pg.click('#form-plantacion button[type=submit]'); pg.wait_for_timeout(1500)
    if pg.is_visible('#dlg-confirmar'): pg.click('#btn-confirmar-si'); pg.wait_for_timeout(800)
    pg.wait_for_selector('#dlg-resumen[open]')
    ventana(pg, 'p12-revision', '#dlg-resumen', arriba=1045, abajo=215)
    pg.click('#btn-resumen-guardar'); pg.wait_for_timeout(2000)

    ubicar(ctx, pg, lat + 0.0003, lng - 0.0001, 5)
    especie(pg, 'jacaranda')
    guardar_arbol(pg)

    # La pantalla del cabo y el menú de su cuenta
    vista(pg, 'registrar', 1000)
    pg.evaluate("() => window.scrollTo(0, 0)")
    foto(pg, 'p03-pantalla', entera=True)
    pg.click('#btn-cuenta'); pg.wait_for_timeout(600)
    foto(pg, 'p04-menu-cuenta', entera=True)
    pg.keyboard.press('Escape'); pg.wait_for_timeout(300)

    # Registros: la lista, la tuerca, el detalle y sustituir
    vista(pg, 'registros', 3500)
    foto(pg, 'p13-registros')
    pg.click('#lista-registros .btn-tuerca'); pg.wait_for_timeout(600)
    foto(pg, 'p14-tuerca')
    pg.keyboard.press('Escape'); pg.wait_for_timeout(300)
    pg.evaluate("async () => SRP.registros.verDetalle((await SRP.almacen.todos('plantaciones')).find(r => r.foto_id || r.foto_base64) || (await SRP.almacen.todos('plantaciones'))[0])")
    pg.wait_for_selector('#dlg-detalle[open]'); pg.wait_for_timeout(2500)
    ventana(pg, 'p15-detalle', '#dlg-detalle', arriba=1500)
    cerrar_ventanas(pg)
    pg.evaluate("async () => SRP.registros.sustituir((await SRP.almacen.todos('plantaciones'))[0])")
    pg.wait_for_selector('#dlg-sustituir[open]'); pg.wait_for_timeout(600)
    ventana(pg, 'p16-sustituir', '#dlg-sustituir')
    cerrar_ventanas(pg)
    pg.evaluate("() => SRP.formulario.cancelarEdicion && SRP.formulario.cancelarEdicion()"); pg.wait_for_timeout(600)
    cerrar_ventanas(pg)

    # Sin señal: un árbol que espera y la guía de la pastilla
    ctx.set_offline(True); pg.wait_for_timeout(2000)
    vista(pg, 'registrar', 1000)
    ubicar(ctx, pg, lat + 0.0005, lng, 7)
    especie(pg, 'ahuehu', 'ESP-0070')
    guardar_arbol(pg)
    pg.evaluate("() => window.scrollTo(0, 0)")
    foto(pg, 'p05-sin-senal', entera=True)
    pg.click('#conexion'); pg.wait_for_selector('#dlg-senal[open]'); pg.wait_for_timeout(600)
    ventana(pg, 'p06-guia-sin-senal', '#dlg-senal')
    cerrar_ventanas(pg)
    ctx.set_offline(False)
    pg.wait_for_function("() => SRP.cola.ops.length === 0 && !SRP.envio.enviando", timeout=60000); pg.wait_for_timeout(1500)

    # Cerrar la jornada, su ficha y el reporte
    vista(pg, 'registrar', 1000)
    pg.click('#btn-jornada-cerrar'); pg.wait_for_selector('#dlg-confirmar[open]'); pg.wait_for_timeout(500)
    ventana(pg, 'p17-cerrar', '#dlg-confirmar')
    pg.click('#btn-confirmar-si'); pg.wait_for_timeout(3000)
    cerrar_ventanas(pg)
    ficha(pg, 'Camellón de Amsterdam')
    tramo(pg, 'p18-ficha', '#jornada-detalle', '#jornada-detalle')
    unir('p18-ficha', [(0, 700), (1640, 2090), (-210, None)])
    pg.click('#btn-jornada-reporte'); pg.wait_for_selector('#dlg-cierre[open]'); pg.wait_for_timeout(600)
    pg.fill('#cie-personal', 'Pedro Ruiz Ejemplo, Sara Gómez Ejemplo')
    pg.fill('#cie-observaciones', 'Se regaron los cuatro árboles al terminar.')
    pg.fill('#cie-hora', '13:30')
    ventana(pg, 'p19-cierre', '#dlg-cierre')
    pg.click('#btn-cierre-generar'); pg.wait_for_selector('#dlg-previa[open]'); pg.wait_for_timeout(4000)
    ventana(pg, 'p20-previa', '#dlg-previa', arriba=1700)
    with pg.expect_download(timeout=60000):
        pg.click('#btn-previa-generar')
    pg.wait_for_timeout(2000)
    cerrar_ventanas(pg)

    # Mi avance
    vista(pg, 'supervision', 4000)
    foto(pg, 'p23-mi-avance', alto=1300)
    unir('p23-mi-avance', [(0, 1500)])

    # Otra jornada suya, abierta, para el relevo
    iniciar_jornada(pg, 'Parque México, lado norte', 20)
    pg.click('#btn-iniciar-jornada'); pg.wait_for_timeout(1500)
    cerrar_ventanas(pg)
    ubicar(ctx, pg, lat + 0.0012, lng + 0.0004, 6)
    especie(pg, 'fresno')
    guardar_arbol(pg)
    pg.wait_for_function("() => SRP.cola.ops.length === 0 && !SRP.envio.enviando", timeout=60000)
    ctx.close()

    # Coordinación: la jornada compartida, los cabos de apoyo, el relevo, Jornadas, Supervisión y Fotografías
    ctx, pg = entrar(b, COORD, 7000)
    pg.on('pageerror', lambda e: errores.append(str(e)))
    cerrar_ventanas(pg)
    vista(pg, 'jornadas', 4000)
    foto(pg, 'p27-jornadas')
    iniciar_jornada(pg, 'Evento en Parque España', 80)
    pg.click('#ini-quien .chip[data-quien="varios"]'); pg.wait_for_timeout(500)
    for c in (APOYO, CABO):
        pg.click('#ini-apoyos .chip[data-id="%s"]' % c['id']); pg.wait_for_timeout(200)
    tramo(pg, 'p24-quien-registra', '#ini-caja-quien', '#btn-iniciar-jornada')
    pg.click('#btn-iniciar-jornada'); pg.wait_for_timeout(2500)
    cerrar_ventanas(pg)
    tramo(pg, 'p25a-franja-coordinacion', '#franja-jornada', '#franja-jornada')
    # Las instrucciones, plegadas, como se ven después de la primera vez: así cabe la lista de cabos con «Guardar»
    pg.evaluate("() => localStorage.setItem(SRP.CONFIG.CLAVE_APOYOS_VISTO, '1')")
    pg.click('#btn-franja-apoyos'); pg.wait_for_selector('#dlg-apoyos[open]'); pg.wait_for_timeout(600)
    ventana(pg, 'p25-cabos-apoyo', '#dlg-apoyos')
    # Hasta el renglón del segundo cabo marcado, entero, y «Guardar» (la captura va al doble de tamaño)
    hasta = pg.evaluate("""id => { const d = document.getElementById('dlg-apoyos').getBoundingClientRect();
      return Math.round((document.querySelector('#apoyos-cabos [data-id="' + id + '"]').getBoundingClientRect().bottom - d.top + 12) * 2); }""", CABO['id'])
    unir('p25-cabos-apoyo', [(0, hasta), (-150, None)])
    cerrar_ventanas(pg)
    pg.wait_for_function("() => SRP.cola.ops.length === 0 && !SRP.envio.enviando", timeout=60000)
    ficha(pg, 'Parque México, lado norte')
    pg.click('#btn-jornada-relevo'); pg.wait_for_selector('#dlg-relevo[open]'); pg.wait_for_timeout(500)
    pg.select_option('#relevo-quien', APOYO['id'])
    ventana(pg, 'p26-relevo', '#dlg-relevo')
    cerrar_ventanas(pg)
    vista(pg, 'supervision', 9000)
    pg.click('#sup-tipos [data-tipo="anio"]'); pg.wait_for_timeout(9000)
    foto(pg, 'p29-supervision', alto=1500)
    unir('p29-supervision', [(0, 1700)])
    vista(pg, 'galeria', 6000)
    foto(pg, 'p30-fotografias', alto=1200)
    unir('p30-fotografias', [(0, 1600)])
    ctx.close()

    # El cabo de apoyo: el aviso al entrar y su franja
    ctx, pg = entrar(b, APOYO, 7000)
    pg.on('pageerror', lambda e: errores.append(str(e)))
    pg.wait_for_selector('#dlg-confirmar[open]', timeout=30000); pg.wait_for_timeout(500)
    ventana(pg, 'p21-aviso-apoyo', '#dlg-confirmar')
    pg.click('#btn-confirmar-si'); pg.wait_for_timeout(800)
    cerrar_ventanas(pg)
    vista(pg, 'registrar', 1500)
    tramo(pg, 'p22-franja-apoyo', '#franja-jornada', '#franja-jornada')
    ctx.close()

    # La dirección: la ficha de una jornada con su reporte, para descargarlo
    ctx, pg = entrar(b, DIRECCION, 7000)
    pg.on('pageerror', lambda e: errores.append(str(e)))
    cerrar_ventanas(pg)
    ficha(pg, 'Camellón de Amsterdam')
    ventana(pg, 'p31-descargar-reporte', '#jornada-detalle')
    unir('p31-descargar-reporte', [(0, 560), (-270, None)])
    ctx.close()

    os.remove(imagen); os.rmdir(carpeta)
    if errores:
        raise RuntimeError('errores en la página: %s' % errores)


def armar_pdf(b):
    manual_pdf.imprimir(b, HTML, PDF, 'Manual del personal', 'capturas-personal/', VERSION)


def main():
    if '--solo-pdf' in sys.argv:
        with sync_playwright() as p:
            b = p.chromium.launch()
            armar_pdf(b)
            b.close()
        print(PDF)
        return
    subprocess.run('npm run build', cwd=pc.SERVIDOR, shell=True, check=True, capture_output=True)
    pc.apoyo('preparar', {'cuentas': CUENTAS})
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
        pc.apoyo('quitar', {'ids': [c['id'] for c in CUENTAS]})
    print(PDF)


if __name__ == '__main__':
    main()
