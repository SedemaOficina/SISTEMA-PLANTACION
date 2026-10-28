"""Escribe servidor/db/srp/02-srp-tablas.sql a partir de datos/esquema.json.

El esquema es la fuente única del modelo de datos: las diez tablas del servidor son las mismas del
teléfono, con los mismos nombres de tabla y de campo, y este script sólo las traduce a PostgreSQL. Lo
que es propio del servidor (contraseñas, sesiones, control de versiones del esquema) va escrito a mano
en los demás guiones de servidor/db/srp/.

Qué sale del esquema:
  · Cada tabla con sus campos en el orden del esquema, su tipo y si admite nulos.
  · La llave primaria (`llave`) y los índices (`indices`).
  · Las llaves foráneas: los campos cuyo dominio empieza con «→ tabla.id». Se agregan al final, cuando
    ya existen todas las tablas, porque hay ciclos (las cuentas se crean dentro de una institución y las
    instituciones guardan quién las creó). Son diferibles: una transacción puede escribir un árbol y su
    sustituto, que se señalan entre sí, y comprobarlas al confirmar. No se crea la de un campo cuya
    relación dice «Sin restricción» ni la de una lista (uuid[]), que comprueba el servicio.
  · Una restricción CHECK por cada campo cuyo dominio es una lista de valores del esquema.
  · UNIQUE en los campos cuyo dominio dice que el valor es único.
  · El valor de arranque de los campos que lo tienen (PREDETERMINADOS, abajo).
  · Las reglas que el esquema escribe en prosa y no se deducen solas van en REGLAS, abajo.
  · Un comentario por tabla y por campo, para quien administre la base.

Uso:  python herramientas/generar_sql.py            escribe el guion
      python herramientas/generar_sql.py --revisar  sólo dice si el guion está al día (sale con 1 si no)
"""
import json, os, re, sys

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ESQUEMA = os.path.join(RAIZ, 'datos', 'esquema.json')
SALIDA = os.path.join(RAIZ, 'servidor', 'db', 'srp', '02-srp-tablas.sql')
ESQ = 'srp'

# Tipos del esquema que en PostgreSQL se escriben de otra forma
TIPOS = {'objeto[]': 'jsonb'}

# Reglas en prosa del esquema que se imponen en la base: (tabla, nombre, expresión)
REGLAS = [
    ('plantaciones', 'folio_patron', r"folio ~ '^[A-Z]{3}-\d{3}-\d{5}$'"),
    ('plantaciones', 'especie_id_patron', r"especie_id ~ '^ESP-\d{4}$'"),
    ('plantaciones', 'especie_o_escrita', "especie_id IS NOT NULL OR especie_otra <> ''"),
    ('plantaciones', 'motivo_otro', "motivo_sustitucion IS DISTINCT FROM 'OTRO' OR motivo_sustitucion_otro <> ''"),
    ('plantaciones', 'gps_precision', 'gps_precision_m IS NULL OR gps_precision_m >= 0'),
    ('plantaciones', 'uga_borde', 'uga_borde_m IS NULL OR uga_borde_m >= 0'),
    ('especies', 'id_patron', r"id ~ '^ESP-\d{4}$' AND clave = id"),
    ('usuarios', 'correo_minusculas', "correo = lower(correo) AND correo LIKE '%_@_%'"),
    ('programas', 'tipos_organizacion_validos', "tipos_organizacion <@ ARRAY[{tipo_organizacion}]::varchar(30)[]"),
    ('jornadas', 'arboles_previstos_rango', 'arboles_previstos BETWEEN 1 AND 9999'),
    ('jornadas', 'hora_formato', r"hora = '' OR hora ~ '^([01]\d|2[0-3]):[0-5]\d$'"),
    ('jornadas', 'relevos_lista', "jsonb_typeof(relevos) = 'array'"),
    ('jornadas', 'cabos_apoyo_lista', "jsonb_typeof(cabos_apoyo) = 'array'"),
    # Cada cabo de apoyo: un objeto con su cuenta, desde cuándo y quién lo puso; si terminó, cómo
    ('jornadas', 'cabos_apoyo_forma', 'NOT (cabos_apoyo @? \'$[*] ? (@.type() != "object" || !exists(@.cabo_id) || @.cabo_id.type() != "string" || !(@.cabo_id like_regex "^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$") || !exists(@.desde) || !exists(@.por_id) || (exists(@.fin) && @.fin != null && @.fin != "terminado" && @.fin != "quitado"))\')'),
    # La calle: «ok» trae su tramo, a 40 m o menos; «lejos» no trae ninguno; sin calcular, todo vacío
    ('plantaciones', 'calle_distancia', 'calle_distancia_m IS NULL OR calle_distancia_m BETWEEN 0 AND 40'),
    ('plantaciones', 'calle_ok', "calle_estado IS DISTINCT FROM 'ok' OR (calle_clave IS NOT NULL AND calle IS NOT NULL AND calle_distancia_m IS NOT NULL)"),
    ('plantaciones', 'calle_lejos', "calle_estado IS DISTINCT FROM 'lejos' OR num_nonnulls(calle_clave, calle, calle_entre_1, calle_entre_2, calle_esquina, vialidad_red, vialidad_tipo, calle_atiende, calle_llave, calle_distancia_m) = 0"),
    ('plantaciones', 'calle_por_calcular', "calle_estado IS NOT NULL OR num_nonnulls(calle_version, calle_clave, calle, calle_entre_1, calle_entre_2, calle_esquina, vialidad_red, vialidad_tipo, calle_atiende, calle_llave, calle_distancia_m) = 0"),
]
# Valores que no pueden repetirse aunque el esquema no lo diga con la palabra «único»
UNICOS = [('plantaciones', 'folio')]
# Valor de un campo cuando quien escribe no lo dice: un árbol de una versión anterior de la aplicación
PREDETERMINADOS = {('plantaciones', 'sitio_plantacion'): "'suelo'", ('jornadas', 'cabos_apoyo'): "'[]'::jsonb"}


def literal(t):
    return "'" + str(t).replace("'", "''") + "'"


def main():
    d = json.load(open(ESQUEMA, encoding='utf-8'))
    dominios = {k: v['valores'] for k, v in d['dominios'].items() if isinstance(v, dict) and isinstance(v.get('valores'), list)}
    sin_restriccion = {r['de'] for r in d['relaciones'] if str(r.get('regla', '')).startswith('Sin restricción')}
    tablas = d['tablas']
    L = []
    p = L.append
    p('-- TABLAS DEL SRP. Generado por herramientas/generar_sql.py a partir de datos/esquema.json')
    p('-- (versión del esquema %s): no se edita a mano. Lo corre quien administra la base, dentro de' % d['version_esquema'])
    p('-- instalar.sql, después de 01-srp-esquema.sql.')
    p('')
    foraneas, comentarios = [], []
    for nombre, t in tablas.items():
        campos = t['campos']
        p('CREATE TABLE %s.%s (' % (ESQ, nombre))
        filas = []
        for c in campos:
            tipo = TIPOS.get(c['tipo'], c['tipo'])
            pre = PREDETERMINADOS.get((nombre, c['campo']))
            filas.append('  %-26s %-14s %s' % (c['campo'], tipo, 'NULL' if c['nulo'] else 'NOT NULL') + (' DEFAULT ' + pre if pre else ''))
        filas.append('  CONSTRAINT %s_pk PRIMARY KEY (%s)' % (nombre, t['llave']))
        for c in campos:
            dom = str(c.get('dominio', ''))
            if dom in dominios:
                filas.append('  CONSTRAINT %s_%s_valido CHECK (%s IN (%s))' % (nombre, c['campo'], c['campo'], ', '.join(literal(v) for v in dominios[dom])))
            if re.search(r'\búnic[oa]\b', dom) and c['campo'] != t['llave']:
                filas.append('  CONSTRAINT %s_%s_unico UNIQUE (%s)' % (nombre, c['campo'], c['campo']))
        for tabla, campo in UNICOS:
            if tabla == nombre:
                filas.append('  CONSTRAINT %s_%s_unico UNIQUE (%s)' % (nombre, campo, campo))
        for tabla, regla, expr in REGLAS:
            if tabla == nombre:
                expr = expr.replace('{tipo_organizacion}', ', '.join(literal(v) for v in dominios['tipo_organizacion']))
                filas.append('  CONSTRAINT %s_%s CHECK (%s)' % (nombre, regla, expr))
        p(',\n'.join(filas))
        p(');')
        for i in t.get('indices', []):
            p('CREATE INDEX %s_%s ON %s.%s (%s);' % (nombre, i, ESQ, nombre, i))
        p('')
        comentarios.append('COMMENT ON TABLE %s.%s IS %s;' % (ESQ, nombre, literal(t['que_es'])))
        for c in campos:
            texto = '; '.join(x for x in (str(c.get('dominio', '')), str(c.get('regla', ''))) if x)
            if texto:
                comentarios.append('COMMENT ON COLUMN %s.%s.%s IS %s;' % (ESQ, nombre, c['campo'], literal(texto)))
            m = re.match(r'^→ (\w+)\.(\w+)', str(c.get('dominio', '')))
            if m and not c['tipo'].endswith('[]') and '%s.%s' % (nombre, c['campo']) not in sin_restriccion:
                if m.group(1) not in tablas:
                    sys.exit('%s.%s apunta a una tabla que no existe: %s' % (nombre, c['campo'], m.group(1)))
                foraneas.append((nombre, c['campo'], m.group(1), m.group(2)))
    p('-- Llaves foráneas, cuando ya existen todas las tablas. Lo que está en uso no se elimina (se')
    p('-- desactiva), así que ninguna borra en cascada.')
    for tabla, campo, destino, col in foraneas:
        p('ALTER TABLE %s.%s ADD CONSTRAINT %s_%s_fk FOREIGN KEY (%s) REFERENCES %s.%s (%s) DEFERRABLE INITIALLY IMMEDIATE;'
          % (ESQ, tabla, tabla, campo, campo, ESQ, destino, col))
    p('')
    p('-- Para quien administre la base: qué es cada tabla y cada campo, tomado del diccionario de datos')
    L.extend(comentarios)
    texto = '\n'.join(L) + '\n'

    if '--revisar' in sys.argv:
        actual = open(SALIDA, encoding='utf-8').read() if os.path.exists(SALIDA) else ''
        if actual != texto:
            print('servidor/db/srp/02-srp-tablas.sql no está al día con datos/esquema.json: correr herramientas/generar_sql.py')
            sys.exit(1)
        print('servidor/db/srp/02-srp-tablas.sql al día')
        return
    os.makedirs(os.path.dirname(SALIDA), exist_ok=True)
    with open(SALIDA, 'w', encoding='utf-8', newline='\n') as s:
        s.write(texto)
    print('%d tablas, %d campos, %d llaves foráneas → %s' % (len(tablas), sum(len(t['campos']) for t in tablas.values()), len(foraneas), os.path.relpath(SALIDA, RAIZ)))


if __name__ == '__main__':
    main()
