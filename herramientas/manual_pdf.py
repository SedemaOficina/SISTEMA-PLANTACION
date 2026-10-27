"""EL PDF DE UN MANUAL, igual para los dos (herramientas/manual_administracion.py y herramientas/manual_personal.py):
la versión y la fecha en la portada, el membrete de la aplicación arriba de cada página menos la portada, que ya
trae el grande, y las capturas en JPEG para que el archivo se pueda mandar por WhatsApp."""
import base64
import datetime
import io
import os

from PIL import Image
from pypdf import PdfReader, PdfWriter

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MEMBRETE = os.path.join(RAIZ, 'assets', 'encabezado-ru-sia.png')
MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']


def datos_uri(im, calidad=85):
    b = io.BytesIO()
    im.save(b, 'JPEG', quality=calidad, optimize=True)
    return 'data:image/jpeg;base64,' + base64.b64encode(b.getvalue()).decode('ascii')


def imprimir(b, html, pdf, titulo, carpeta_capturas):
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
    version = open(os.path.join(RAIZ, 'VERSION'), encoding='utf-8').read().strip()
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
    # La portada sale de una segunda impresión sin el membrete de arriba. Con los mismos márgenes, las dos paginan igual
    margen = {'top': '20mm', 'bottom': '18mm', 'left': '16mm', 'right': '16mm'}
    con = pg.pdf(format='A4', print_background=True, display_header_footer=True, header_template=cabeza, footer_template=pie, margin=margen)
    sin = pg.pdf(format='A4', print_background=True, display_header_footer=True, header_template='<span></span>', footer_template=pie, margin=margen)
    pg.close()
    salida = PdfWriter()
    salida.add_page(PdfReader(io.BytesIO(sin)).pages[0])
    for pagina in PdfReader(io.BytesIO(con)).pages[1:]:
        salida.add_page(pagina)
    salida.add_metadata({'/Title': titulo + ' · Sistema de Registro de Plantaciones', '/Author': 'Secretaría del Medio Ambiente de la Ciudad de México'})
    with open(pdf, 'wb') as f:
        salida.write(f)
