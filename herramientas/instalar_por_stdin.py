"""INSTALADOR POR LA ENTRADA ESTÁNDAR: arma servidor/db/srp/srp-instalar-por-stdin.sql con los guiones que corre
instalar.sql, en su orden y dentro de una sola transacción. El SIA aplica el SQL de cada módulo con psql por la
entrada estándar, y por esa vía `\\ir` no encuentra los archivos. Lleva las siglas en el nombre porque el SIA busca el
archivo por su nombre en todas las carpetas de su base, y otro módulo ya tiene un instalar-por-stdin.sql.

Uso:  python herramientas/instalar_por_stdin.py            lo escribe
      python herramientas/instalar_por_stdin.py --revisar  sólo dice si está al día (sale con 1 si no)

El archivo no se edita a mano: pruebas/auditoria.py y herramientas/empaquetar.py comprueban que sea lo que arma este
programa con los guiones de su carpeta. Sólo usa la biblioteca estándar."""
import os, re, sys

CARPETA = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'servidor', 'db', 'srp')
NOMBRE = 'srp-instalar-por-stdin.sql'
CABECERA = """-- INSTALACIÓN COMPLETA DEL ESQUEMA srp POR LA ENTRADA ESTÁNDAR, en una sola transacción: o queda todo o no queda
-- nada. Trae juntos, en el orden de instalar.sql, los guiones %s a %s: por la entrada estándar, `\\ir` no encuentra los
-- archivos. Lo corre quien administra la base, desde cualquier carpeta. Requiere PostGIS y el esquema territorio con
-- su rol territorio_lectura.
--
--   psql -d <base> -v ON_ERROR_STOP=on < srp-instalar-por-stdin.sql
--
-- NO SE EDITA: lo arma el SRP a partir de los guiones (herramientas/instalar_por_stdin.py), y la entrega se detiene si
-- no coinciden. Después siguen los pasos de la cuenta srp_api, al principio de 10-srp-rol-y-grants.sql."""


def armar(carpeta=CARPETA):
    guiones = re.findall(r'(?m)^\\ir\s+(\S+)', open(os.path.join(carpeta, 'instalar.sql'), encoding='utf-8').read())
    if not guiones:
        raise ValueError('instalar.sql no corre ningún guion con \\ir')
    partes = [CABECERA % (guiones[0][:2], guiones[-1][:2]), '', '\\set ON_ERROR_STOP on', 'BEGIN;', '']
    for g in guiones:
        texto = open(os.path.join(carpeta, g), encoding='utf-8', newline='').read().replace('\r\n', '\n')
        # Una orden de psql dentro de un guion cambiaría lo que hace esta vía; ninguno la lleva
        if re.search(r'(?m)^\s*\\', texto):
            raise ValueError('%s lleva una orden de psql (un renglón que empieza con «\\»)' % g)
        partes += ['-- ═══ %s ═══' % g, texto.rstrip('\n'), '']
    return '\n'.join(partes + ['COMMIT;', ''])


def al_dia(carpeta=CARPETA):
    ruta = os.path.join(carpeta, NOMBRE)
    return os.path.isfile(ruta) and open(ruta, encoding='utf-8', newline='').read() == armar(carpeta)


if __name__ == '__main__':
    if '--revisar' in sys.argv[1:]:
        bien = al_dia()
        print('%s está al día' % NOMBRE if bien else '%s no corresponde a los guiones: vuelva a armarlo' % NOMBRE)
        sys.exit(0 if bien else 1)
    with open(os.path.join(CARPETA, NOMBRE), 'w', encoding='utf-8', newline='\n') as f:
        f.write(armar())
    print('Escrito %s' % os.path.join(CARPETA, NOMBRE))
