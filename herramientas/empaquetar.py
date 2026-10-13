"""Arma el paquete para el SIA a partir de una carpeta: escribe MANIFIESTO.sha256 con la suma de cada
archivo de todas sus carpetas, la comprime en <carpeta>.zip junto a ella y escribe <carpeta>.zip.sha256.

Uso:  python empaquetar.py <carpeta-del-paquete>

El manifiesto tiene el formato de sha256sum, así que en el SIA se comprueba con
`sha256sum -c MANIFIESTO.sha256` desde la carpeta del paquete. Sólo usa la biblioteca estándar.
Avisa si encuentra algo que parezca una dirección IP o una llave, para revisarlo antes de entregar."""
import hashlib, os, re, sys, zipfile

MANIFIESTO = 'MANIFIESTO.sha256'
SOSPECHOSO = re.compile(rb'\b(?:10|172|192)\.\d{1,3}\.\d{1,3}\.\d{1,3}\b|-----BEGIN [A-Z ]*PRIVATE KEY-----|(?i:password|contrase\xc3\xb1a)\s*[:=]\s*\S{6,}')


def suma(ruta):
    h = hashlib.sha256()
    with open(ruta, 'rb') as f:
        for bloque in iter(lambda: f.read(1 << 20), b''):
            h.update(bloque)
    return h.hexdigest()


def main():
    if len(sys.argv) != 2 or not os.path.isdir(sys.argv[1]):
        sys.exit('Uso: python empaquetar.py <carpeta-del-paquete>')
    raiz = os.path.abspath(sys.argv[1])
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
    print('%d archivos en el manifiesto' % len(archivos))
    print('Paquete: %s' % destino)
    print('Suma:    %s.sha256' % destino)
    if avisos:
        print('\nREVISAR antes de entregar: parecen tener una dirección interna, una llave o una contraseña:')
        for a in avisos:
            print('  ' + a)


if __name__ == '__main__':
    main()
