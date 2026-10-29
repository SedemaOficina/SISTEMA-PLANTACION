"""Arma el paquete para el SIA a partir de una carpeta: escribe MANIFIESTO.sha256 con la suma de cada
archivo de todas sus carpetas, la comprime en <carpeta>.zip junto a ella y escribe <carpeta>.zip.sha256.

Uso:  python empaquetar.py <carpeta-del-paquete> [--revision]

El manifiesto tiene el formato de sha256sum, así que en el SIA se comprueba con
`sha256sum -c MANIFIESTO.sha256` desde la carpeta del paquete. Sólo usa la biblioteca estándar.

Antes de escribir nada se detiene si encuentra archivos de trabajo (respaldos de archivos y de la base,
temporales, bitácoras, archivos de entorno, carpetas de editor, capturas de pantalla, los de Windows y Mac), los
archivos de la versión de prueba (la lista de herramientas/preparar_produccion.py), una aplicación con los datos de
prueba encendidos, una lista con una columna de claves, o algo que parezca una dirección interna, el nombre de un
equipo de la red interna, una cuenta de prueba, una llave o una contraseña. Un aviso que ya se revisó
y no lleva secreto se anota en AVISOS-REVISADOS.txt, en la raíz del paquete, un renglón por archivo:
`<sha256>  <ruta>  <por qué no es un secreto>`. La suma ata la revisión a ese contenido: si el archivo cambia,
el aviso vuelve a detener el paquete. La lista viaja en el paquete, para que el SIA vea qué se revisó.

La versión: el paquete lleva `VERSION` en su raíz y su LEEME.md dice ese mismo número. Un paquete para
instalar va en 1 o más; si dice 0.N, una versión de prueba, se detiene. La excepción es un paquete que el
SIA sólo revisa: con --revision acepta 0.N, siempre que el LEEME diga que es «para revisión»."""
import hashlib, os, re, sys, zipfile

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from preparar_produccion import DE_PRUEBA

MANIFIESTO = 'MANIFIESTO.sha256'
REVISADOS = 'AVISOS-REVISADOS.txt'
SOSPECHOSO = re.compile(rb'\b(?:10|172|192)\.\d{1,3}\.\d{1,3}\.\d{1,3}\b|-----BEGIN [A-Z ]*PRIVATE KEY-----|(?i:password|contrase\xc3\xb1a)\s*[:=]\s*\S{6,}'
                        # una variable de entorno con su valor (SRP_DB_PASS=…), y un equipo de la red interna en una dirección,
                        # un correo o una asignación (db.sia.local, una cuenta de prueba @ejemplo.local)
                        rb'|\b[A-Z][A-Z0-9_]*(?:PASS|PASSWORD|SECRET|TOKEN|CLAVE)[A-Z0-9_]*\s*=\s*[^\s<>"\'$]{4,}'
                        rb'|(?://|@|=)[\w.-]+\.(?:local|lan|intranet)\b')
# Respaldos de archivos y de la base, temporales, bitácoras, archivos de entorno, capturas, archivos abiertos de
# Office y los que dejan Windows y Mac
DE_TRABAJO = re.compile(r'(?i)(\.(bak|tmp|temp|orig|rej|swp|log|dump|backup|pgdump|sqlite3?)|\.sql\.(gz|bz2|xz|zip)|~)$|^~\$|'
                        r'^(\.DS_Store|Thumbs\.db|desktop\.ini)$|^\.env(\..+)?$|^(captura|screenshot|rev_)')
# Carpetas de editores: su configuración no viaja
EDITORES = {'.vscode', '.idea', '.vs'}
# El primer renglón de una lista con una columna de claves o contraseñas
COLUMNA_CLAVE = re.compile(r'(?i)(^|[,;\t])\s*"?(clave|contraseña|password|pass)"?\s*([,;\t]|$)')
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
    revisar_instructivo(raiz, texto)
    return version


# Con la base en el paquete (db/srp/), el instructivo corresponde a sus guiones: instalar.sql corre todos los que hay, el
# LEEME no nombra uno que no esté, nombra el de la verificación de la cuenta del servicio y, con la calle, dice que su
# capa va antes y cómo se recalcula si llega después
def revisar_instructivo(raiz, leeme):
    carpeta = os.path.join(raiz, 'db', 'srp')
    if not os.path.isdir(carpeta):
        return
    guiones = sorted(n for n in os.listdir(carpeta) if re.fullmatch(r'\d\d-srp-[\w-]+\.sql', n))
    instalar = os.path.join(carpeta, 'instalar.sql')
    corre = re.findall(r'(?m)^\\ir\s+(\S+)', open(instalar, encoding='utf-8').read()) if os.path.isfile(instalar) else []
    faltas = []
    if sorted(corre) != guiones:
        faltas.append('db/srp/instalar.sql corre %s y la carpeta trae %s' % (corre, guiones))
    # El SIA aplica el SQL por la entrada estándar: el instalador de esa vía va, y trae los mismos guiones
    import instalar_por_stdin
    if not os.path.isfile(os.path.join(carpeta, instalar_por_stdin.NOMBRE)):
        faltas.append('falta db/srp/%s, el instalador por la entrada estándar' % instalar_por_stdin.NOMBRE)
    elif not instalar_por_stdin.al_dia(carpeta):
        faltas.append('db/srp/%s no trae los guiones de instalar.sql: vuelva a armarlo' % instalar_por_stdin.NOMBRE)
    elif instalar_por_stdin.NOMBRE not in leeme:
        faltas.append('no nombra %s, con el que el SIA instala la base' % instalar_por_stdin.NOMBRE)
    nombrados = set(re.findall(r'\b\d\d-srp-[\w-]+\.sql\b', leeme))
    if nombrados - set(guiones):
        faltas.append('nombra guiones que el paquete no trae: %s' % sorted(nombrados - set(guiones)))
    for n in guiones:
        if 'VERIFICACIÓN' in open(os.path.join(carpeta, n), encoding='utf-8').read() and n not in nombrados:
            faltas.append('no nombra %s, donde está la verificación de la cuenta del servicio' % n)
    if any('calles' in n for n in guiones):
        faltas += ['no dice «%s»: la capa de calles va antes, y si llega después se recalcula' % p
                   for p in ('territorio.calles', 'recalcular_calles') if p not in leeme]
    if faltas:
        sys.exit('El LEEME.md no corresponde a la base del paquete:\n  ' + '\n  '.join(faltas))


# AVISOS-REVISADOS.txt → { ruta: (sha256, motivo) }
def leer_revisados(raiz):
    ruta = os.path.join(raiz, REVISADOS)
    revisados = {}
    if not os.path.isfile(ruta):
        return revisados
    for n, renglon in enumerate(open(ruta, encoding='utf-8').read().splitlines(), 1):
        if not renglon.strip() or renglon.startswith('#'):
            continue
        partes = re.split(r'\s{2,}', renglon.strip(), maxsplit=2)
        if len(partes) < 3 or not re.fullmatch(r'[0-9a-f]{64}', partes[0]):
            sys.exit('%s, renglón %d: va «<sha256>  <ruta>  <motivo>», separados por dos espacios.' % (REVISADOS, n))
        revisados[partes[1]] = (partes[0], partes[2])
    return revisados


# Se detiene ante archivos de trabajo o de prueba y ante avisos sin revisar; devuelve los revisados que encontró
def revisar_contenido(raiz, archivos):
    trabajo = [rel for rel, _ in archivos if DE_TRABAJO.search(rel.rsplit('/', 1)[-1]) or EDITORES & set(rel.split('/')[:-1])]
    if trabajo:
        sys.exit('El paquete trae archivos de trabajo; quítelos y vuelva a empaquetar:\n' + '\n'.join('  ' + r for r in trabajo))
    de_prueba = [rel for rel, _ in archivos if any(rel == p or rel.endswith('/' + p) for p in DE_PRUEBA)]
    de_prueba += [rel + ' (con ES_FICTICIO en true)' for rel, ruta in archivos
                  if rel.endswith('js/config.js') and 'ES_FICTICIO: true' in open(ruta, encoding='utf-8', errors='replace').read()]
    if de_prueba:
        sys.exit('El paquete trae lo de la versión de prueba; arme la aplicación con herramientas/preparar_produccion.py:\n' +
                 '\n'.join('  ' + r for r in de_prueba))
    listas = [rel for rel, ruta in archivos if rel.lower().endswith(('.csv', '.tsv'))
              and COLUMNA_CLAVE.search(open(ruta, encoding='utf-8', errors='replace').readline())]
    if listas:
        sys.exit('Parecen listas con claves o contraseñas; no se armó el paquete:\n' + '\n'.join('  ' + r for r in listas))
    revisados, aceptados, pendientes = leer_revisados(raiz), [], []
    for rel, ruta in archivos:
        with open(ruta, 'rb') as f:
            if not SOSPECHOSO.search(f.read()):
                continue
        s = suma(ruta)
        if rel in revisados and revisados[rel][0] == s:
            aceptados.append((rel, revisados[rel][1]))
        else:
            pendientes.append((rel, s, rel in revisados))
    if pendientes:
        sys.exit('Parecen tener una dirección interna, una llave o una contraseña; no se armó el paquete:\n' +
                 '\n'.join('  %s%s' % (rel, ' (cambió desde que se revisó)' if cambio else '') for rel, _, cambio in pendientes) +
                 '\n\nRevise cada uno. Si no lleva un secreto, anótelo en %s con el motivo:\n' % REVISADOS +
                 '\n'.join('%s  %s  <por qué no es un secreto>' % (s, rel) for rel, s, _ in pendientes))
    return aceptados


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
    aceptados = revisar_contenido(raiz, archivos)
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
    for rel, motivo in aceptados:
        print('Aviso revisado: %s (%s)' % (rel, motivo))


if __name__ == '__main__':
    main()
