"""Arma el paquete para el SIA a partir de una carpeta: escribe MANIFIESTO.sha256 con la suma de cada
archivo de todas sus carpetas, la comprime en <carpeta>.zip junto a ella y escribe <carpeta>.zip.sha256.

Uso:  python empaquetar.py <carpeta-del-paquete> [--revision]

El manifiesto tiene el formato de sha256sum, así que en el SIA se comprueba con
`sha256sum -c MANIFIESTO.sha256` desde la carpeta del paquete. Sólo usa la biblioteca estándar.
Avisa si encuentra algo que parezca una dirección IP o una llave, para revisarlo antes de entregar.

La versión: el paquete lleva `VERSION` en su raíz y su LEEME.md dice ese mismo número. Un paquete para
instalar va en 1 o más; si dice 0.N, una versión de prueba, se detiene. La excepción es un paquete que el
SIA sólo revisa: con --revision acepta 0.N, siempre que el LEEME diga que es «para revisión»."""
import hashlib, os, re, sys, zipfile

MANIFIESTO = 'MANIFIESTO.sha256'
SOSPECHOSO = re.compile(rb'\b(?:10|172|192)\.\d{1,3}\.\d{1,3}\.\d{1,3}\b|-----BEGIN [A-Z ]*PRIVATE KEY-----|(?i:password|contrase\xc3\xb1a)\s*[:=]\s*\S{6,}')
USO = 'Uso: python empaquetar.py <carpeta-del-paquete> [--revision]'


def suma(ruta):
    h = hashlib.sha256()
    with open(ruta, 'rb') as f:
        for bloque in iter(lambda: f.read(1 << 20), b''):
            h.update(bloque)
    return h.hexdigest()


def revisar_version(raiz, para_revision):
    ruta = os.path.join(raiz, 'VERSION')
    if not os.path.isfile(ruta):
        sys.exit('Falta VERSION en la raíz del paquete: un renglón con el número (1, 1.2…; 0.N sólo para revisión).')
    version = open(ruta, encoding='utf-8').read().strip()
    if not re.fullmatch(r'\d+(\.\d+)*', version):
        sys.exit('VERSION debe ser un número como 1, 1.2 o 0.9.64; dice «%s».' % version)
    leeme = os.path.join(raiz, 'LEEME.md')
    texto = open(leeme, encoding='utf-8').read() if os.path.isfile(leeme) else ''
    # «Versión 1» o «Versión de prueba 0.9.64»: el número solo podría aparecer por cualquier otra razón
    if not re.search(r'(?i)versión(?: de prueba)? ' + re.escape(version) + r'(?!\.?\d)', texto):
        sys.exit('El LEEME.md del paquete debe decir su versión: «Versión %s».' % version)
    de_prueba = int(version.split('.')[0]) == 0
    if de_prueba and not para_revision:
        sys.exit('VERSION dice %s, una versión de prueba: un paquete para instalar va en 1 o más. '
                 'Si el SIA sólo lo revisa, use --revision.' % version)
    if para_revision and 'para revisión' not in texto.lower():
        sys.exit('Con --revision, el LEEME.md debe decir que el paquete es «para revisión».')
    return version


def main():
    argumentos = [a for a in sys.argv[1:] if a != '--revision']
    if len(argumentos) != 1 or not os.path.isdir(argumentos[0]):
        sys.exit(USO)
    raiz = os.path.abspath(argumentos[0])
    para_revision = '--revision' in sys.argv[1:]
    version = revisar_version(raiz, para_revision)
    archivos = []
    for carpeta, subcarpetas, nombres in os.walk(raiz):
        subcarpetas[:] = sorted(d for d in subcarpetas if d not in ('.git', 'node_modules', '__pycache__'))
        for n in sorted(nombres):
            ruta = os.path.join(carpeta, n)
            rel = os.path.relpath(ruta, raiz).replace(os.sep, '/')
            if rel != MANIFIESTO:
                archivos.append((rel, ruta))
    avisos = []
    for rel, ruta in archivos:
        with open(ruta, 'rb') as f:
            if SOSPECHOSO.search(f.read()):
                avisos.append(rel)
    with open(os.path.join(raiz, MANIFIESTO), 'w', encoding='utf-8', newline='\n') as m:
        for rel, ruta in archivos:
            m.write('%s  %s\n' % (suma(ruta), rel))
    destino = raiz.rstrip(os.sep) + '.zip'
    with zipfile.ZipFile(destino, 'w', zipfile.ZIP_DEFLATED) as z:
        base = os.path.basename(raiz)
        for rel, ruta in archivos + [(MANIFIESTO, os.path.join(raiz, MANIFIESTO))]:
            z.write(ruta, base + '/' + rel)
    with open(destino + '.sha256', 'w', encoding='utf-8', newline='\n') as s:
        s.write('%s  %s\n' % (suma(destino), os.path.basename(destino)))
    print('Versión %s%s' % (version, ', para revisión: no se instala' if para_revision else ''))
    print('%d archivos en el manifiesto' % len(archivos))
    print('Paquete: %s' % destino)
    print('Suma:    %s.sha256' % destino)
    if avisos:
        print('\nREVISAR antes de entregar: parecen tener una dirección interna, una llave o una contraseña:')
        for a in avisos:
            print('  ' + a)


if __name__ == '__main__':
    main()
