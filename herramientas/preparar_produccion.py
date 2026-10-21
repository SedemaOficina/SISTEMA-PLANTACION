"""Arma la copia de la aplicación que se publica en el SIA: la versión real, sin nada de prueba.

Uso:  python herramientas/preparar_produccion.py <carpeta-destino>

Copia la aplicación (index.html, sw.js, el manifiesto, css/, js/, vendor/ y assets/) y en la copia:
  - pone ES_FICTICIO en false (js/config.js): la base del teléfono es la real, se entra con las cuentas
    del servicio y desaparecen la banda de datos ficticios y las herramientas de prueba;
  - quita los archivos que sólo usa la versión de prueba, con su <script> en index.html: las cuentas de
    prueba (js/datos-ficticios.js), los vehículos con placas ficticias (assets/catalogos/catalogo-vehiculos.js),
    la demostración (js/demostracion.js) y el espejo de campos (js/espejo.js). Sus botones y bloques se
    quedan en index.html, ocultos: con ES_FICTICIO en false nunca se muestran.
El repositorio no cambia. La carpeta destino debe no existir o estar vacía. Al terminar revisa que todo lo
que index.html pide exista en la copia y que nada de lo quitado se pida. Sólo usa la biblioteca estándar."""
import os, re, shutil, sys

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ARCHIVOS = ['index.html', 'sw.js', 'manifest.webmanifest', 'VERSION']
CARPETAS = ['css', 'js', 'vendor', 'assets']
DE_PRUEBA = ['js/datos-ficticios.js', 'assets/catalogos/catalogo-vehiculos.js', 'js/demostracion.js', 'js/espejo.js']
AVISO_DE_PRUEBA = '<!-- Sólo en la versión de prueba: la versión real no carga estos dos -->\n'


def larga(ruta):
    """En Windows, una ruta que admite más de 260 caracteres: la copia anida carpetas."""
    prefijo = '\\\\?\\'
    return prefijo + ruta if os.name == 'nt' and not ruta.startswith(prefijo) else ruta


def cambiar(ruta, viejo, nuevo):
    with open(ruta, encoding='utf-8', newline='') as f:
        texto = f.read()
    if texto.count(viejo) != 1:
        sys.exit('No se encontró una sola vez en %s: %s' % (os.path.relpath(ruta), viejo.strip()))
    with open(ruta, 'w', encoding='utf-8', newline='') as f:
        f.write(texto.replace(viejo, nuevo))


def main():
    if len(sys.argv) != 2:
        sys.exit(__doc__.split('\n\n')[1])
    visible = os.path.abspath(sys.argv[1])
    destino = larga(visible)
    if os.path.isdir(destino) and os.listdir(destino):
        sys.exit('La carpeta destino ya tiene archivos: %s' % visible)
    os.makedirs(destino, exist_ok=True)
    for a in ARCHIVOS:
        shutil.copy2(os.path.join(RAIZ, a), os.path.join(destino, a))
    for c in CARPETAS:
        shutil.copytree(os.path.join(RAIZ, c), os.path.join(destino, c), ignore=shutil.ignore_patterns('__pycache__', '*.map'))

    cambiar(os.path.join(destino, 'js', 'config.js'), '  ES_FICTICIO: true,', '  ES_FICTICIO: false,')
    pagina = os.path.join(destino, 'index.html')
    cambiar(pagina, AVISO_DE_PRUEBA, '')
    with open(pagina, encoding='utf-8') as f:
        html = f.read()
    for rel in DE_PRUEBA:
        etiqueta = re.search(r'<script src="%s\?v=[^"]+"></script>\n' % re.escape(rel), html)
        if not etiqueta:
            sys.exit('index.html no carga %s: revisar la lista DE_PRUEBA' % rel)
        cambiar(pagina, etiqueta.group(0), '')
        os.remove(os.path.join(destino, rel.replace('/', os.sep)))

    # Lo que index.html pide existe en la copia, y nada de lo quitado se pide
    with open(pagina, encoding='utf-8') as f:
        html = f.read()
    pedidos = [m.split('?')[0] for m in re.findall(r'(?:src|href)="((?!https?:|#|data:)[^"]+)"', html)]
    faltan = [p for p in pedidos if not os.path.isfile(os.path.join(destino, p.replace('/', os.sep)))]
    quedan = [rel for rel in DE_PRUEBA if 'src="%s' % rel in html]
    if faltan or quedan:
        sys.exit('La copia quedó incompleta. Faltan: %s. Se siguen pidiendo: %s' % (faltan, quedan))
    with open(os.path.join(destino, 'js', 'config.js'), encoding='utf-8') as f:
        version = re.search(r'js/config\.js\?v=([^"]+)"', html).group(1)
        if 'ES_FICTICIO: false,' not in f.read():
            sys.exit('js/config.js no quedó con ES_FICTICIO en false')
    total = sum(len(n) for _, _, n in os.walk(destino))
    print('Versión %s, con datos reales: %d archivos en %s' % (version, total, visible))
    print('Sin: ' + ', '.join(DE_PRUEBA))


if __name__ == '__main__':
    main()
