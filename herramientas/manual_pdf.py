"""EL PDF DE UN MANUAL, igual para los dos (herramientas/manual_administracion.py y herramientas/manual_personal.py):
la versión y la fecha en la portada, el membrete de la aplicación arriba de cada página menos la portada, que ya
trae el grande, y las capturas en JPEG para que el archivo se pueda mandar por WhatsApp.

Con `--version X`, los dos programas hacen el manual de la versión X antes de que el proyecto la lleve: la portada
la dice y la aplicación de las capturas la enseña, con la marca X en lugar de la de VERSION. Es la misma
aplicación; sólo cambia el número."""
import base64
import datetime
import hashlib
import io
import os

from PIL import Image
from pypdf import PdfReader, PdfWriter
from pypdf.generic import Fit, NameObject, TextStringObject

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MEMBRETE = os.path.join(RAIZ, 'assets', 'encabezado-ru-sia.png')
MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']


def datos_uri(im, calidad=85):
    b = io.BytesIO()
    im.save(b, 'JPEG', quality=calidad, optimize=True)
    return 'data:image/jpeg;base64,' + base64.b64encode(b.getvalue()).decode('ascii')


def version_pedida(argv):
    """El número que sigue a --version, o None."""
    return argv[argv.index('--version') + 1] if '--version' in argv else None


def version_actual():
    return open(os.path.join(RAIZ, 'VERSION'), encoding='utf-8').read().strip()


def marcar_version(ctx, base, version):
    """La aplicación que abre `ctx` en `base` dice `version`: index.html llega con esa marca en cada archivo."""
    if not version:
        return
    actual = version_actual()

    def pagina(route):
        r = route.fetch()
        route.fulfill(response=r, body=r.text().replace('?v=' + actual, '?v=' + version))
    ctx.route(lambda url: url.split('?')[0] in (base, base + 'index.html'), pagina)


def imprimir(b, html, pdf, titulo, carpeta_capturas, version=None):
    """Imprime `html` en `pdf` con el navegador `b` de Playwright. `titulo` va en el pie y en las propiedades del
    archivo; las imágenes cuyo src empieza con `carpeta_capturas` van en JPEG."""
    pg = b.new_page()
    pg.goto('file:///' + html.replace('\\', '/'))
    pg.wait_for_load_state('load')
    carpeta = os.path.dirname(html)
    # En PNG, Chrome vuelve a guardar las capturas sin pérdida y el manual pesa varias veces más. A 58 mm de ancho
    # bastan tres cuartos de la captura: unos 250 puntos por pulgada
    fuentes = pg.evaluate("p => [...document.images].map(i => i.getAttribute('src')).filter(s => s.startsWith(p))", carpeta_capturas)
    jpeg = {}
    for src in fuentes:
        im = Image.open(os.path.join(carpeta, src)).convert('RGB')
        jpeg[src] = datos_uri(im.resize((im.width * 3 // 4, im.height * 3 // 4), Image.LANCZOS))
    pg.evaluate("m => Promise.all([...document.images].filter(i => m[i.getAttribute('src')]).map(i => { i.src = m[i.getAttribute('src')]; return i.decode(); }))", jpeg)
    version = version or version_actual()
    hoy = datetime.date.today()
    pg.evaluate("""([v, f]) => { document.querySelectorAll('[data-version]').forEach(e => { e.textContent = v; });
      document.querySelectorAll('[data-fecha]').forEach(e => { e.textContent = f; }); }""", [version, '%d de %s de %d' % (hoy.day, MESES[hoy.month - 1], hoy.year)])
    # El membrete de arriba, a su tamaño impreso y sobre blanco: Chrome lo guarda una vez por página
    chico = Image.open(MEMBRETE).convert('RGBA')
    chico = chico.resize((chico.width * 72 // chico.height, 72), Image.LANCZOS)
    blanco = Image.new('RGB', chico.size, 'white')
    blanco.paste(chico, mask=chico.split()[3])
    cabeza = '<div style="width: 100%; padding: 0 16mm; margin-top: 5mm;"><img src="' + datos_uri(blanco, 90) + '" style="height: 5.2mm;"></div>'
    pie = ('<div style="font: 8px sans-serif; color: #666; width: 100%; padding: 0 14mm; display: flex; justify-content: space-between;">'
           '<span>Sistema de Registro de Plantaciones · ' + titulo + '</span>'
           '<span>Página <span class="pageNumber"></span> de <span class="totalPages"></span></span></div>')
    # La portada sale de una segunda impresión sin el membrete de arriba. Con los mismos márgenes, las dos paginan igual.
    # Etiquetado y con marcadores: el idioma sale del lang de la página (es-MX) y cada título es un marcador
    margen = {'top': '20mm', 'bottom': '18mm', 'left': '16mm', 'right': '16mm'}
    con = pg.pdf(format='A4', print_background=True, display_header_footer=True, header_template=cabeza, footer_template=pie, margin=margen,
                 tagged=True, outline=True)
    sin = pg.pdf(format='A4', print_background=True, display_header_footer=True, header_template='<span></span>', footer_template=pie, margin=margen,
                 tagged=True)
    pg.close()
    # Se parte de la impresión con membrete, que trae la estructura y los marcadores; de la otra sólo se toma lo que
    # se dibuja en la portada. El cuerpo de las dos portadas es el mismo, con las mismas marcas de su estructura
    salida = PdfWriter(clone_from=PdfReader(io.BytesIO(con)))
    portada = PdfReader(io.BytesIO(sin)).pages[0]
    for clave in ('/Contents', '/Resources'):
        salida.pages[0][NameObject(clave)] = portada.raw_get(clave).clone(salida)
    salida._root_object[NameObject('/Lang')] = TextStringObject('es-MX')
    marcadores(salida)
    una_sola_copia(salida)
    salida.compress_identical_objects(remove_identicals=False, remove_orphans=True)
    salida.add_metadata({'/Title': titulo + ' · Sistema de Registro de Plantaciones', '/Author': 'Secretaría del Medio Ambiente de la Ciudad de México'})
    with open(pdf, 'wb') as f:
        salida.write(f)


def una_sola_copia(salida):
    """Chrome guarda el membrete chico una vez por página: todas las páginas usan la primera copia."""
    primera = {}
    for pagina in salida.pages:
        imagenes = pagina['/Resources'].get('/XObject') or {}
        for nombre in list(imagenes.keys()):
            ref = imagenes.raw_get(nombre)
            o = ref.get_object()
            if o.get('/Subtype') != '/Image':
                continue
            clave = (o.get('/Width'), o.get('/Height'), hashlib.sha256(o.get_data()).hexdigest())
            imagenes[NameObject(nombre)] = primera.setdefault(clave, ref)


def marcadores(salida):
    """Chrome cuelga todos los marcadores del título de la portada; aquí cada sección queda arriba, con sus apartados
    dentro."""
    viejos = salida.outline
    raiz = viejos[1] if len(viejos) > 1 and isinstance(viejos[1], list) else viejos
    del salida._root_object['/Outlines']

    def poner(items, padre=None):
        ultimo = None
        for it in items:
            if isinstance(it, list):
                poner(it, ultimo)
                continue
            fit = Fit.xyz(it.left, it.top, None) if it.typ == '/XYZ' else Fit.fit()
            ultimo = salida.add_outline_item(it.title, salida.get_destination_page_number(it), parent=padre, fit=fit, is_open=False)
    poner(raiz)
