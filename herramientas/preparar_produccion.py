"""Arma la copia de la aplicación que se publica en el SIA: la versión real, sin nada de prueba.

Uso:  python herramientas/preparar_produccion.py <carpeta-destino>

Copia la aplicación (index.html, sw.js, el manifiesto, css/, js/, vendor/ y assets/) y en la copia:
  - pone ES_FICTICIO en false (js/config.js): la base del teléfono es la real, se entra con las cuentas
    del servicio y desaparecen la banda de datos ficticios y las herramientas de prueba;
  - quita los archivos que sólo usa la versión de prueba, con su <script> en index.html: las cuentas de
    prueba (js/datos-ficticios.js), los vehículos con placas ficticias (assets/catalogos/catalogo-vehiculos.js),
    las herramientas de prueba (js/herramientas-prueba.js), la demostración (js/demostracion.js) y el espejo de
    campos (js/espejo.js);
  - quita de index.html los bloques que van entre «Sólo con datos de prueba: desde aquí» y «hasta aquí»: la
    franja de datos ficticios, la entrada con una cuenta de prueba, sus opciones del menú de la cuenta, la ventana
    de los datos de prueba y el espejo de campos. Al final revisa que ningún archivo de la copia diga sus frases;
  - no copia la copia ligera de la capa de calles (assets/calles/): en el SIA la calle la pone el servidor.
El repositorio no cambia. La carpeta destino debe no existir o estar vacía. La copia se arma en una carpeta temporal
y sólo pasa al destino si termina bien: un error no deja una copia a medias. Funciona con el fin de renglón que
traiga el clon (LF o CRLF). Al terminar revisa que todo lo que index.html pide exista en la copia y que nada de lo
quitado se pida. Sólo usa la biblioteca estándar."""
import os, re, shutil, sys, tempfile

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ARCHIVOS = ['index.html', 'sw.js', 'manifest.webmanifest', 'VERSION']
CARPETAS = ['css', 'js', 'vendor', 'assets']
DE_PRUEBA = ['js/datos-ficticios.js', 'assets/catalogos/catalogo-vehiculos.js', 'js/herramientas-prueba.js', 'js/demostracion.js', 'js/espejo.js']
AVISO_DE_PRUEBA = '<!-- Sólo en la versión de prueba: la versión real no carga estos tres -->\n'
# Los bloques de index.html que sólo existen con datos de prueba, y las frases que no deben quedar en la copia
DESDE, HASTA = '<!-- Sólo con datos de prueba: desde aquí -->', '<!-- Sólo con datos de prueba: hasta aquí -->'
FRASES_DE_PRUEBA = ['Entrar como usuario de prueba', 'Datos de prueba', 'Cambiar usuario (pruebas)', 'Simular sin señal (pruebas)',
                    'Lo que viaja a la base de datos', 'Datos ficticios de prueba', DESDE, HASTA]
PREFIJO = '\\\\?\\'


def larga(ruta):
    """En Windows, una ruta que admite más de 260 caracteres: la copia anida carpetas."""
    return PREFIJO + ruta if os.name == 'nt' and not ruta.startswith(PREFIJO) else ruta


def visible(ruta):
    """La ruta como la escribe la persona, sin el prefijo de ruta larga."""
    return ruta[len(PREFIJO):] if ruta.startswith(PREFIJO) else ruta


def cambiar(ruta, viejo, nuevo):
    """Cambia un texto que debe estar una sola vez, con el fin de renglón que traiga el archivo."""
    with open(ruta, encoding='utf-8', newline='') as f:
        texto = f.read()
    if '\r\n' in texto:
        viejo, nuevo = viejo.replace('\n', '\r\n'), nuevo.replace('\n', '\r\n')
    if texto.count(viejo) != 1:
        sys.exit('No se encontró una sola vez en %s: %s' % (visible(ruta), viejo.strip()))
    with open(ruta, 'w', encoding='utf-8', newline='') as f:
        f.write(texto.replace(viejo, nuevo))


def armar(destino):
    for a in ARCHIVOS:
        shutil.copy2(os.path.join(RAIZ, a), os.path.join(destino, a))
    for c in CARPETAS:
        # La copia ligera de la capa de calles es del servidor simulado: en el SIA la calle la pone el servidor
        shutil.copytree(os.path.join(RAIZ, c), os.path.join(destino, c), ignore=shutil.ignore_patterns('__pycache__', '*.map', *(['calles'] if c == 'assets' else [])))

    cambiar(os.path.join(destino, 'js', 'config.js'), '  ES_FICTICIO: true,', '  ES_FICTICIO: false,')
    pagina = os.path.join(destino, 'index.html')
    cambiar(pagina, AVISO_DE_PRUEBA, '')
    with open(pagina, encoding='utf-8', newline='') as f:
        html = f.read()
    for rel in DE_PRUEBA:
        etiqueta = re.search(r'<script src="%s\?v=[^"]+"></script>\r?\n' % re.escape(rel), html)
        if not etiqueta:
            sys.exit('index.html no carga %s: revisar la lista DE_PRUEBA' % rel)
        cambiar(pagina, etiqueta.group(0).replace('\r\n', '\n'), '')
        os.remove(os.path.join(destino, rel.replace('/', os.sep)))

    # Los bloques que sólo existen con datos de prueba, con sus marcas
    with open(pagina, encoding='utf-8', newline='') as f:
        html = f.read()
    bloques = re.findall(r'[ \t]*%s.*?%s[ \t]*\r?\n' % (re.escape(DESDE), re.escape(HASTA)), html, flags=re.S)
    if not bloques or html.count(DESDE) != len(bloques) or html.count(HASTA) != len(bloques):
        sys.exit('index.html no trae sus bloques de prueba bien marcados: «%s» … «%s»' % (DESDE, HASTA))
    for b in bloques:
        html = html.replace(b, '', 1)
    with open(pagina, 'w', encoding='utf-8', newline='') as f:
        f.write(html)

    # Lo que index.html pide existe en la copia, y nada de lo quitado se pide
    with open(pagina, encoding='utf-8') as f:
        html = f.read()
    pedidos = [m.split('?')[0] for m in re.findall(r'(?:src|href)="((?!https?:|#|data:)[^"]+)"', html)]
    faltan = [p for p in pedidos if not os.path.isfile(os.path.join(destino, p.replace('/', os.sep)))]
    quedan = [rel for rel in DE_PRUEBA if 'src="%s' % rel in html]
    if faltan or quedan:
        sys.exit('La copia quedó incompleta. Faltan: %s. Se siguen pidiendo: %s' % (faltan, quedan))
    with open(os.path.join(destino, 'js', 'config.js'), encoding='utf-8') as f:
        if 'ES_FICTICIO: false,' not in f.read():
            sys.exit('js/config.js no quedó con ES_FICTICIO en false')
    # Ningún archivo de texto de la copia dice lo que sólo existe en la versión de prueba
    con_frases = []
    for carpeta, _, nombres in os.walk(destino):
        for n in nombres:
            if n.rsplit('.', 1)[-1] in ('html', 'js', 'css', 'json', 'webmanifest', 'txt', 'md'):
                with open(os.path.join(carpeta, n), encoding='utf-8', errors='replace') as f:
                    texto = f.read()
                dichas = [x for x in FRASES_DE_PRUEBA if x in texto]
                if dichas:
                    con_frases.append('%s: %s' % (os.path.relpath(visible(os.path.join(carpeta, n)), visible(destino)), ', '.join(dichas)))
    if con_frases:
        sys.exit('La copia todavía dice lo de la versión de prueba:\n  ' + '\n  '.join(con_frases))
    return re.search(r'js/config\.js\?v=([^"]+)"', html).group(1)


def main():
    if len(sys.argv) != 2:
        sys.exit(__doc__.split('\n\n')[1])
    ruta = os.path.abspath(sys.argv[1])
    final = larga(ruta)
    if os.path.isdir(final) and os.listdir(final):
        sys.exit('La carpeta destino ya tiene archivos: %s' % ruta)
    temporal = larga(tempfile.mkdtemp(prefix='srp-produccion-'))
    try:
        version = armar(temporal)
    except SystemExit as e:
        sys.exit('%s\nNo se creó %s. Lo armado a medias quedó en %s' % (e.code, ruta, visible(temporal)))
    if os.path.isdir(final):
        os.rmdir(final)   # vacía: se comprobó arriba
    shutil.move(temporal, final)
    total = sum(len(n) for _, _, n in os.walk(final))
    print('Versión %s, con datos reales: %d archivos en %s' % (version, total, ruta))
    print('Sin: ' + ', '.join(DE_PRUEBA + ['assets/calles/']))


if __name__ == '__main__':
    main()
