"""ENSAYO DE INSTALACIÓN del paquete del SRP para el SIA, siguiendo SOLAMENTE su LEEME.md y sus archivos. Se corre con
cada entrega, antes de subirla. Viene de la auditoría del 27-10-2026 y sigue lo que hace el SIA: la base se instala por
la entrada estándar (srp-instalar-por-stdin.sql); sia-backend, en el commit sobre el que se armó el paquete; la prueba
de humo pasa por /srp/api, como la traduce el servidor web, y revisa además el sello de los datos, el vaciado tras la
prueba y que un cuerpo roto o de más responda { codigo, mensaje } detrás del lector global de JSON del SIA.

!! BORRA EL ESQUEMA srp DE srp_local (y lo restaura al final). Sólo se corre con --ejecutar cuando nadie más usa la
!! base: ni las pruebas del servidor, ni la de conexión, ni los programas de los manuales.

Uso (PYTHONUTF8=1, desde cualquier carpeta):
  python pruebas/ensayo_instalacion.py --paquete <carpeta del paquete> --sia <repo sia-backend, sólo lectura>
         --trabajo <carpeta desechable, nueva en cada corrida> --commit <el de sia-backend que dice el LEEME>
         --modulos <node_modules ya instalado de una copia de sia-backend con el mismo package-lock>
         [--seco | --ejecutar --confirmo-base-libre] [--solo-restaurar]

  --seco       (por omisión) no escribe en la base: comprueba el paquete y su manifiesto, toma la huella del esquema srp
               (sólo lectura), prueba que el respaldo se puede hacer (pg_dump del esquema sin datos, a la carpeta de
               trabajo) e integra el módulo en una copia desechable de sia-backend: git apply, typecheck, build y
               «Revertir» del backend (git apply -R). Dice qué haría con la base.
  --ejecutar   todo: respaldo con pg_dump, quitar srp, instalar en limpio, verificar como srp_api, datos de arranque
               (dos veces), capa de calles, primera cuenta, backend del SIA con el módulo y prueba de humo por HTTP y en
               el navegador, «Revertir» y, SIEMPRE al final (también si algo falla), restaurar el respaldo y comprobar
               que el esquema srp quedó idéntico: conteo y huella de cada tabla, funciones, disparadores y permisos.
  --solo-restaurar  si una corrida anterior se cortó: restaura el respaldo que dejó en --trabajo y compara.

Idempotente: anota cada paso en <trabajo>/estado.json. Si encuentra un ensayo a medias (srp quitado o instalado de
prueba sin restaurar), restaura primero. La instalación de prueba nunca se encima a la original: antes de quitar
srp exige que el respaldo exista, que pg_restore lo lea y que traiga las tablas de la huella.

Puertos: el backend del SIA en 3124 y la aplicación en 8124.
No guarda contraseñas en archivos: la de srp_api y la temporal de la primera cuenta viven sólo en memoria; la de
srp_api se pone al empezar y se quita (PASSWORD NULL) al terminar.
"""
import argparse, hashlib, json, os, re, secrets, shutil, socket, subprocess, sys, tempfile, time

BIN = r'C:\Program Files\PostgreSQL\17\bin'
PSQL, PG_DUMP, PG_RESTORE = (os.path.join(BIN, x + '.exe') for x in ('psql', 'pg_dump', 'pg_restore'))
BASE = dict(PGHOST='127.0.0.1', PGPORT='5432', PGDATABASE='srp_local', PGUSER='srp_local_admin')
PUERTO_SIA, PUERTO_APP = 3124, 8124

a = argparse.ArgumentParser()
a.add_argument('--paquete', required=True); a.add_argument('--sia', required=True); a.add_argument('--trabajo', required=True)
a.add_argument('--modulos', required=True)
a.add_argument('--seco', action='store_true'); a.add_argument('--ejecutar', action='store_true'); a.add_argument('--confirmo-base-libre', action='store_true')
a.add_argument('--solo-restaurar', action='store_true')
a.add_argument('--commit', required=True, help='el commit de sia-backend sobre el que se armó el paquete, el que dice su LEEME')
A = a.parse_args()
SECO = not A.ejecutar and not A.solo_restaurar
if (A.ejecutar or A.solo_restaurar) and not A.confirmo_base_libre:
    sys.exit('Con --ejecutar o --solo-restaurar hace falta --confirmo-base-libre: el ensayo borra el esquema srp de la base compartida.')
PKG, TRAB = os.path.abspath(A.paquete), os.path.abspath(A.trabajo)
os.makedirs(TRAB, exist_ok=True)
ESTADO = os.path.join(TRAB, 'estado.json')
RESPALDO = os.path.join(TRAB, 'srp_antes.dump')
BITACORA = os.path.join(TRAB, 'bitacora-%s.txt' % time.strftime('%Y%m%d-%H%M%S'))
ENV = dict(os.environ, PGCLIENTENCODING='UTF8', **BASE)
res = []


def anotar(linea):
    res.append(linea); print(linea, flush=True)
    with open(BITACORA, 'a', encoding='utf-8') as f: f.write(linea + '\n')


def ok(c, t):
    anotar(('OK     ' if c else 'FALLA  ') + t); return c


def info(t): anotar('·      ' + t)


def estado(**k):
    e = json.load(open(ESTADO, encoding='utf-8')) if os.path.isfile(ESTADO) else {}
    e.update(k); json.dump(e, open(ESTADO, 'w', encoding='utf-8'), indent=1); return e


def leer_estado():
    return json.load(open(ESTADO, encoding='utf-8')) if os.path.isfile(ESTADO) else {}


def correr(cmd, entrada=None, env=ENV, cwd=None, t=900):
    r = subprocess.run(cmd, input=entrada, capture_output=True, text=True, encoding='utf-8', errors='replace', env=env, cwd=cwd, timeout=t)
    return r.returncode, r.stdout, r.stderr


def psql(sql=None, archivo=None, env=ENV, cwd=None):
    cmd = [PSQL, '-w', '-X', '-v', 'ON_ERROR_STOP=on', '-At', '-F', '|'] + (['-f', archivo] if archivo else [])
    return correr(cmd, entrada=sql, env=env, cwd=cwd)


def uno(sql):
    c, s, e = psql(sql)
    if c: raise RuntimeError(e.strip()[-300:])
    return s.strip()


def suma(ruta):
    h = hashlib.sha256()
    with open(ruta, 'rb') as f:
        for b in iter(lambda: f.read(1 << 20), b''): h.update(b)
    return h.hexdigest()


def huella():
    """Conteo y huella de cada tabla de srp (orden independiente), y el catálogo: funciones con su configuración,
    disparadores y permisos. Sólo lectura."""
    tablas = uno("SELECT string_agg(tablename, ',' ORDER BY tablename) FROM pg_tables WHERE schemaname = 'srp'").split(',')
    h = {'tablas': {}}
    for t in [x for x in tablas if x]:
        n, m = uno('SELECT count(*), coalesce(md5(string_agg(md5(x::text), \'\' ORDER BY md5(x::text))), \'-\') FROM srp."%s" x' % t).split('|')
        h['tablas'][t] = [int(n), m]
    h['funciones'] = uno("""SELECT string_agg(p.proname || '(' || pg_get_function_identity_arguments(p.oid) || ') def=' || p.prosecdef || ' cfg=' || coalesce(array_to_string(p.proconfig, ';'), '')
        || ' acl=' || coalesce(p.proacl::text, '') || ' md5=' || md5(p.prosrc), E'\\n' ORDER BY 1) FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace WHERE n.nspname = 'srp'""")
    h['disparadores'] = uno("SELECT string_agg(tgrelid::regclass::text || '.' || tgname::text || ' ' || tgenabled::text, ',' ORDER BY 1) FROM pg_trigger WHERE NOT tgisinternal AND tgrelid::regclass::text LIKE 'srp.%'")
    h['permisos'] = uno("SELECT string_agg(table_name::text || ':' || grantee::text || ':' || privilege_type::text, ',' ORDER BY 1) FROM information_schema.role_table_grants WHERE table_schema = 'srp'")
    h['identidades'] = uno("SELECT string_agg(sequencename || '=' || coalesce(last_value::text, 'nulo'), ',' ORDER BY 1) FROM pg_sequences WHERE schemaname = 'srp'")
    h['rol_srp_api'] = uno("SELECT rolconfig::text || ' ' || rolconnlimit FROM pg_roles WHERE rolname = 'srp_api'")
    return h


def comparar(antes, despues):
    # string_agg(… ORDER BY 1) ordena por una constante: el orden cambia al restaurar. Se comparan como conjuntos
    conjunto = lambda k, h: sorted(h[k].split(chr(10) if k == 'funciones' else ','))
    antes = dict(antes, **{k: conjunto(k, antes) for k in ('funciones', 'disparadores', 'permisos', 'identidades', 'rol_srp_api')})
    despues = dict(despues, **{k: conjunto(k, despues) for k in ('funciones', 'disparadores', 'permisos', 'identidades', 'rol_srp_api')})
    dif = []
    for t, v in antes['tablas'].items():
        if despues['tablas'].get(t) != v: dif.append('tabla %s: %s → %s' % (t, v, despues['tablas'].get(t)))
    dif += ['tabla nueva %s' % t for t in despues['tablas'] if t not in antes['tablas']]
    dif += [k for k in ('funciones', 'disparadores', 'permisos', 'identidades', 'rol_srp_api') if antes[k] != despues[k]]
    return dif


def esperar(puerto, s=60):
    fin = time.time() + s
    while time.time() < fin:
        with socket.socket() as k:
            if k.connect_ex(('127.0.0.1', puerto)) == 0: return True
        time.sleep(0.4)
    return False


def libre(puerto):
    with socket.socket() as k: return k.connect_ex(('127.0.0.1', puerto)) != 0


# ---------------------------------------------------------------- 0. El paquete
def paquete():
    info('Paquete: %s' % PKG)
    leeme = os.path.join(PKG, 'LEEME.md')
    ok(os.path.isfile(leeme), 'el paquete trae LEEME.md')
    version = open(os.path.join(PKG, 'VERSION'), encoding='utf-8').read().strip()
    texto = open(leeme, encoding='utf-8').read()
    ok(re.search(r'(?i)versión ' + re.escape(version) + r'(?!\.?\d)', texto) is not None, 'el LEEME dice la versión del paquete (%s)' % version)
    malas, n = [], 0
    for renglon in open(os.path.join(PKG, 'MANIFIESTO.sha256'), encoding='utf-8').read().splitlines():
        s, rel = renglon.split('  ', 1); n += 1
        if not os.path.isfile(os.path.join(PKG, rel)) or suma(os.path.join(PKG, rel)) != s: malas.append(rel)
    ok(not malas, 'MANIFIESTO.sha256: %d archivos, %d con otra suma o ausentes %s' % (n, len(malas), malas[:5]))
    # Lo que el LEEME manda correr, y que exista en el paquete
    for rel in ['db/srp/instalar.sql', 'db/srp/srp-instalar-por-stdin.sql', 'db/srp/vaciar-tras-prueba.sql', 'datos/srp-datos-arranque.sql', 'backend/srp.diff',
                'deploy/srp-cuenta-inicial.mjs', 'servidor-web/srp.conf', 'servidor-web/srp-cabeceras.conf', 'app/index.html', 'manual/Manual-Personal-SRP.pdf',
                'manual/Manual-Administracion-SRP.pdf']:
        ok(os.path.isfile(os.path.join(PKG, rel)), 'existe %s' % rel)
    # El LEEME debe nombrar el guion de permisos que trae el paquete
    grants = sorted(f for f in os.listdir(os.path.join(PKG, 'db', 'srp')) if 'rol-y-grants' in f)
    ok(grants and grants[0] in texto, 'el LEEME nombra el guion de la cuenta srp_api que trae el paquete (%s)' % grants)
    ok('CALL srp.recalcular_calles();' in texto, 'el LEEME dice que se corre CALL srp.recalcular_calles(); después de la capa de calles')
    for orden in ('< db/srp/srp-instalar-por-stdin.sql', '< datos/srp-datos-arranque.sql', '-v confirmar=VACIAR-SRP < db/srp/vaciar-tras-prueba.sql', 'git apply <paquete>/backend/srp.diff',
                  'node deploy/srp-cuenta-inicial.mjs', 'entrega-2026-10-29'):
        ok(orden in texto, 'el LEEME trae la orden «%s»' % orden)
    ok('{VERIFICADO}' not in texto and '[POR LLENAR' not in texto and '[POR CONFIRMAR' not in texto, 'el LEEME no tiene nada por llenar')
    ok('calles' in texto and 'territorio.calles' in texto, 'el LEEME dice que la capa territorio.calles va primero')
    return version, texto, grants[0] if grants else None


def consultas_verificacion(archivo):
    """«Debe funcionar» y «Debe fallar» del comentario del final del guion de la cuenta srp_api."""
    t = open(archivo, encoding='utf-8').read()
    bloque = t[t.index('VERIFICACIÓN'):]
    debe = re.findall(r'^\s{6}(SELECT .*?;|SHOW .*?;)', bloque.split('Debe fallar')[0], re.M)
    falla = re.findall(r'^\s{6}(?:BEGIN; )?((?:UPDATE|DELETE|TRUNCATE|CREATE|INSERT|CALL srp\.recalcular)[^;]*;)', bloque.split('Debe fallar')[1].split('Y el control global')[0], re.M)
    control = re.search(r'(SELECT count\(\*\) FROM information_schema\.role_table_grants.*?;)', bloque, re.S).group(1)
    return debe, falla, ' '.join(control.split())


# ---------------------------------------------------------------- Backend (no toca la base)
def backend(con_build=True):
    sia = os.path.join(TRAB, 'sia-backend')
    if os.path.isdir(sia):
        # Primero el enlace a las dependencias, que no son de esta carpeta: borrar el árbol entero podría seguirlo
        enlace = os.path.join(sia, 'node_modules')
        if os.path.lexists(enlace): os.rmdir(enlace)
        shutil.rmtree(sia, onexc=lambda f, ruta, e: (os.chmod(ruta, 0o700), f(ruta)))
    c, _, e = correr(['git', '-c', 'core.autocrlf=false', 'clone', '-q', '--no-hardlinks', os.path.abspath(A.sia), sia])
    ok(c == 0, 'copia desechable de sia-backend en la carpeta de trabajo %s' % e.strip()[-120:])
    correr(['git', 'config', 'core.autocrlf', 'false'], cwd=sia)
    # El clon trae las ramas locales de la copia del SIA; el commit del paquete está en su rama remota
    correr(['git', 'fetch', '-q', 'origin', '+refs/remotes/origin/*:refs/remotes/fuente/*'], cwd=sia)
    c, _, e = correr(['git', 'checkout', '-q', A.commit], cwd=sia)
    ok(c == 0, 'sia-backend en el commit del paquete (%s) %s' % (A.commit, e.strip()[-120:]))
    base = correr(['git', 'log', '-1', '--format=%h %ad', '--date=short'], cwd=sia)[1].strip()
    info('sia-backend en %s' % base)
    diff = os.path.join(PKG, 'backend', 'srp.diff')
    c, _, e = correr(['git', 'apply', '--check', diff], cwd=sia)
    if not ok(c == 0, 'backend/srp.diff aplica limpio (paso 3.3 del LEEME) %s' % e.strip()[-200:]): return sia, False
    correr(['git', 'apply', diff], cwd=sia)
    # Los archivos completos del paquete son esa misma base con el diff aplicado
    comp = os.path.join(PKG, 'backend', 'completos')
    distintos = []
    for d, _, fs in os.walk(comp):
        for f in fs:
            rel = os.path.relpath(os.path.join(d, f), comp)
            if not os.path.isfile(os.path.join(sia, rel)) or suma(os.path.join(sia, rel)) != suma(os.path.join(d, f)): distintos.append(rel)
    ok(not distintos, 'backend/completos/ es idéntico, byte por byte, a sia-backend con el diff aplicado %s' % distintos[:5])
    # Las dependencias: las de una copia ya instalada con el mismo package-lock (no se instala nada)
    mods = os.path.abspath(A.modulos)
    # Mismo contenido aunque una copia tenga saltos de Windows
    texto_lock = lambda r: open(r, 'rb').read().replace(bytes([13, 10]), bytes([10]))
    lock_igual = texto_lock(os.path.join(sia, 'package-lock.json')) == texto_lock(os.path.join(os.path.dirname(mods), 'package-lock.json'))
    ok(lock_igual, 'el package-lock de sia-backend es el mismo de la copia con dependencias (%s)' % os.path.dirname(mods))
    correr(['cmd', '/c', 'mklink', '/J', os.path.join(sia, 'node_modules'), mods])
    c, s, e = correr(['npm', 'run', 'typecheck'], cwd=sia, t=600) if os.name != 'nt' else correr(['cmd', '/c', 'npm', 'run', 'typecheck'], cwd=sia, t=600)
    ok(c == 0, 'npm run typecheck sin errores (paso 3.4) %s' % (s + e).strip()[-300:])
    if con_build:
        c, s, e = correr(['cmd', '/c', 'npm', 'run', 'build'], cwd=sia, t=600)
        ok(c == 0 and os.path.isfile(os.path.join(sia, 'dist', 'index.mjs')) and '[SRP]' in open(os.path.join(sia, 'dist', 'index.mjs'), encoding='utf-8', errors='replace').read(),
           'npm run build incluye el módulo en dist/index.mjs')
    return sia, True


def revertir_backend(sia):
    diff = os.path.join(PKG, 'backend', 'srp.diff')
    c, _, e = correr(['git', 'apply', '-R', '--check', diff], cwd=sia)
    ok(c == 0, '«Revertir», paso 2: git apply -R backend/srp.diff aplica limpio %s' % e.strip()[-200:])
    correr(['git', 'apply', '-R', diff], cwd=sia)
    estado_git = correr(['git', 'status', '--porcelain', '--untracked-files=all'], cwd=sia)[1]
    quedan = [x for x in estado_git.splitlines() if 'node_modules' not in x and 'dist/' not in x]
    ok(not quedan, '… y sia-backend queda como estaba, sin rastro del módulo %s' % quedan[:5])
    c, s, e = correr(['cmd', '/c', 'npm', 'run', 'typecheck'], cwd=sia, t=600)
    ok(c == 0, '… y compila sin el módulo')


# ---------------------------------------------------------------- Restaurar (siempre al final)
def restaurar(antes):
    if not os.path.isfile(RESPALDO):
        return ok(False, 'no hay respaldo en %s: NO se restaura nada; revisar a mano' % RESPALDO)
    c, _, e = psql('DROP SCHEMA IF EXISTS srp CASCADE;')
    ok(c == 0, 'se quita el srp de ensayo %s' % e.strip()[-200:])
    c, s, e = correr([PG_RESTORE, '-w', '-d', BASE['PGDATABASE'], '-h', BASE['PGHOST'], '-U', BASE['PGUSER'], '--exit-on-error', '--single-transaction', RESPALDO])
    ok(c == 0, 'pg_restore del respaldo de srp %s' % e.strip()[-300:])
    estado(restaurado=True)
    despues = huella()
    json.dump(despues, open(os.path.join(TRAB, 'huella_despues.json'), 'w', encoding='utf-8'), indent=1)
    dif = comparar(antes, despues)
    return ok(not dif, 'el esquema srp de srp_local quedó IDÉNTICO al de antes: %d tablas con el mismo conteo y huella, funciones, disparadores, permisos e identidades %s'
              % (len(antes['tablas']), dif[:6]))


# ---------------------------------------------------------------- El ensayo
def main():
    info('Ensayo de instalación · %s · %s' % ('EN SECO' if SECO else ('SOLO RESTAURAR' if A.solo_restaurar else 'EJECUTANDO'), time.strftime('%Y-%m-%d %H:%M')))
    version, leeme, grants = paquete()
    previo = leer_estado()
    # Un ensayo anterior a medias: se restaura antes que nada
    if not SECO and previo.get('quitado') and not previo.get('restaurado'):
        info('Un ensayo anterior quitó srp y no restauró: se restaura primero')
        antes = json.load(open(os.path.join(TRAB, 'huella_antes.json'), encoding='utf-8'))
        restaurar(antes); return
    if A.solo_restaurar:
        antes = json.load(open(os.path.join(TRAB, 'huella_antes.json'), encoding='utf-8'))
        restaurar(antes); return

    # 1. La huella y el respaldo (paso 1.1 del LEEME)
    ok(uno("SELECT to_regclass('srp.migraciones') IS NOT NULL") == 't', 'srp_local tiene el esquema srp original (versión %s)' % uno("SELECT coalesce(max(version)::text, '-') FROM srp.migraciones"))
    otras = uno("SELECT count(*) FROM pg_stat_activity WHERE datname = current_database() AND pid <> pg_backend_pid()")
    info('otras conexiones abiertas a srp_local: %s' % otras)
    antes = huella()
    json.dump(antes, open(os.path.join(TRAB, 'huella_antes.json'), 'w', encoding='utf-8'), indent=1)
    info('huella de srp: %d tablas, %s renglones' % (len(antes['tablas']), sum(v[0] for v in antes['tablas'].values())))
    destino = RESPALDO if not SECO else os.path.join(TRAB, 'srp_esquema_seco.dump')
    cmd = [PG_DUMP, '-w', '-h', BASE['PGHOST'], '-U', BASE['PGUSER'], '-d', BASE['PGDATABASE'], '-n', 'srp', '-Fc', '-f', destino] + (['--schema-only'] if SECO else [])
    c, _, e = correr(cmd)
    ok(c == 0, 'pg_dump del esquema srp%s → %s %s' % (' (sólo estructura, en seco)' if SECO else '', destino, e.strip()[-200:]))
    c, lista, e = correr([PG_RESTORE, '-l', destino])
    tablas_resp = set(re.findall(r'TABLE srp (\w+) ', lista))
    ok(c == 0 and set(antes['tablas']) <= tablas_resp, 'pg_restore lee el respaldo y trae las %d tablas de la huella' % len(antes['tablas']))
    if not SECO:
        ok(huella() == antes, 'nadie escribió en srp mientras se respaldaba (la huella no cambió)') or sys.exit('La base no está libre: se detiene sin quitar nada.')
        estado(respaldo=RESPALDO, sha256_respaldo=suma(RESPALDO))

    # La verificación del paquete, leída del propio guion
    debe, falla, control = consultas_verificacion(os.path.join(PKG, 'db', 'srp', grants))
    info('verificación del paquete (%s): %d consultas que deben funcionar, %d que deben fallar y el control global' % (grants, len(debe), len(falla)))

    if SECO:
        sia, bien = backend()
        if bien: revertir_backend(sia)
        info('EN SECO: no se tocó la base. Con --ejecutar --confirmo-base-libre haría: DROP SCHEMA srp CASCADE; instalar.sql (dos veces: la segunda debe '
             'negarse); la verificación como srp_api; los datos de arranque dos veces; recalcular_calles; la primera cuenta (y que no se dé otra); '
             'el backend del SIA con el módulo en %d y la aplicación en %d; la prueba de humo; «Revertir»; y restauraría el respaldo y compararía.' % (PUERTO_SIA, PUERTO_APP))
        ok(libre(PUERTO_SIA) and libre(PUERTO_APP), 'los puertos %d y %d están libres (en el ensayo de verdad se necesitan)' % (PUERTO_SIA, PUERTO_APP))
        return

    procesos, clave_api = [], None
    try:
        # 1.2 Instalar en limpio
        c, _, e = psql('DROP SCHEMA srp CASCADE;'); estado(quitado=True)
        ok(c == 0, 'se quita el esquema srp (queda territorio)')
        por_stdin = open(os.path.join(PKG, 'db', 'srp', 'srp-instalar-por-stdin.sql'), encoding='utf-8').read()
        c, _, e = psql(por_stdin)
        ok(c == 0, 'srp-instalar-por-stdin.sql del paquete corre completo por la entrada estándar, en una transacción %s' % e.strip()[-300:]); estado(instalado=True)
        c, _, e = psql(por_stdin)
        ok(c != 0 and 'ya está instalado' in e, 'una segunda instalación se detiene sin tocar nada')
        c, _, e = psql(archivo='instalar.sql', cwd=os.path.join(PKG, 'db', 'srp'))
        ok(c != 0 and 'ya está instalado' in e, 'e instalar.sql (con \\ir) también lo reconoce')
        # 1.3 a 1.5 La cuenta srp_api: contraseña sólo en memoria y la verificación conectado como srp_api
        clave_api = secrets.token_urlsafe(24)
        c, _, e = psql("ALTER ROLE srp_api PASSWORD '%s';" % clave_api)
        ok(c == 0, 'srp_api recibe una contraseña de ensayo (en el SIA: \\password, interactiva)')
        api = dict(ENV, PGUSER='srp_api', PGPASSWORD=clave_api)
        vistos = [psql(q, env=api) for q in debe]
        ok(all(v[0] == 0 for v in vistos), 'conectado como srp_api, lo que debe funcionar funciona: %s' % [v[1].strip()[:40] for v in vistos])
        # Un procedimiento que confirma por tandas no corre dentro de BEGIN: se prueba solo, y debe fallar por permiso
        negados = [(psql(q, env=api)[2].lower().find('permis') >= 0) if q.startswith('CALL') else psql('BEGIN; %s ROLLBACK;' % q, env=api)[0] != 0 for q in falla]
        ok(all(negados), 'lo que debe fallar falla (%d de %d)' % (sum(negados), len(negados)))
        ok(psql(control, env=api)[1].strip() == '0', 'el control global da 0')
        # 2. Datos de arranque, dos veces
        arranque = os.path.join(PKG, 'datos', 'srp-datos-arranque.sql')
        texto_arranque = open(arranque, encoding='utf-8').read()
        c1, s1, e1 = psql(texto_arranque); c2, s2, _ = psql(texto_arranque)
        ok(c1 == 0 and c2 == 0 and s1.strip().splitlines()[-1] == s2.strip().splitlines()[-1], 'datos de arranque: %s; otra vez no cambian nada %s' % (s1.strip().splitlines()[-1] if s1.strip() else '', e1.strip()[-200:]))
        # La capa de calles: va antes; después de instalarla, recalcular (como quien administra; srp_api no puede)
        hay = uno("SELECT to_regclass('territorio.calles') IS NOT NULL AND to_regclass('territorio.calles_version') IS NOT NULL")
        ok(hay == 't', 'territorio.calles y territorio.calles_version están instaladas antes del SRP')
        c, s, e = psql('CALL srp.recalcular_calles();')
        ok(c == 0, 'CALL srp.recalcular_calles(); como quien administra %s' % e.strip()[-120:])
        ok(psql('CALL srp.recalcular_calles();', env=api)[0] != 0, '… y srp_api no puede')
        # 5.1 La primera cuenta (y no otra)
        correo = 'primera.administracion.ensayo@ejemplo.local'
        c, sql, err = correr(['node', os.path.join(PKG, 'deploy', 'srp-cuenta-inicial.mjs'), correo, 'Primera Administración Ensayo', 'Administración global'])
        temporal = (re.search(r'([a-z2-9]{4}-[a-z2-9]{4}-[a-z2-9]{4})', err) or [None, None])[1]
        cc, _, e = psql(sql)
        ok(c == 0 and temporal and cc == 0, 'la primera cuenta se da con deploy/srp-cuenta-inicial.mjs %s' % e.strip()[-200:])
        cc, _, e = psql(correr(['node', os.path.join(PKG, 'deploy', 'srp-cuenta-inicial.mjs'), 'segunda@ejemplo.local', 'Segunda Persona', 'X'])[1])
        ok(cc != 0, 'y el guion no da otra Administración global (la segunda se da desde Usuarios)')
        # 3. El backend del SIA con el módulo
        sia, bien = backend()
        if not bien: raise RuntimeError('el diff no aplica')
        if not (libre(PUERTO_SIA) and libre(PUERTO_APP)): raise RuntimeError('los puertos %d u %d están ocupados' % (PUERTO_SIA, PUERTO_APP))
        prefijos = sorted(set(re.findall(r'prefijo: "([A-Z_]+)"', open(os.path.join(sia, 'src', 'db.ts'), encoding='utf-8').read())) - {'SRP'})
        relleno = {p + s: 'sin_uso' for p in prefijos for s in ('_DB_USER', '_DB_PASS')}
        fotos = tempfile.mkdtemp(prefix='srp-ensayo-fotos-', dir=TRAB)
        env_sia = dict(os.environ, **relleno, PORT=str(PUERTO_SIA), DB_HOST='127.0.0.1', DB_PORT='5432', DB_NAME='srp_local', DB_SSL_MODE='disable',
                       SRP_DB_USER='srp_api', SRP_DB_PASS=clave_api, SRP_FOTOS_DIR=fotos, SRP_COOKIE_SEGURA='no')
        registro = open(os.path.join(TRAB, 'backend-sia.log'), 'w', encoding='utf-8')
        procesos.append(subprocess.Popen(['node', os.path.join(sia, 'dist', 'index.mjs')], env=env_sia, stdout=registro, stderr=subprocess.STDOUT))
        app_dir = os.path.join(PKG, 'app')
        procesos.append(subprocess.Popen([sys.executable, os.path.join(os.path.dirname(os.path.abspath(__file__)), 'servir.py'), str(PUERTO_APP),
                                          '--api', 'http://127.0.0.1:%d' % PUERTO_SIA, '--raiz', app_dir], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL))
        ok(esperar(PUERTO_SIA) and esperar(PUERTO_APP), 'arrancan el backend del SIA (%d) y la aplicación del paquete (%d)' % (PUERTO_SIA, PUERTO_APP))
        time.sleep(3)
        texto_log = open(registro.name, encoding='utf-8').read()
        ok(re.search(r'\[SRP\] conectado como srp_api(?!.*SUPERUSUARIO)', texto_log) is not None, 'el journal dice «[SRP] conectado como srp_api», sin SUPERUSUARIO (paso 3.5)')
        # La prueba de humo, por HTTP
        humo(correo, temporal)
        # En el navegador: la versión del paquete y nada de prueba
        navegador(version)
        # «Revertir», backend
        for p in procesos: p.terminate()
        procesos.clear()
        revertir_backend(sia)
    except Exception as e:
        ok(False, 'el ensayo se detuvo: %s' % str(e)[:300])
    finally:
        for p in procesos: p.terminate()
        # «Revertir», base: restaurar el respaldo del paso 1, y comprobar que quedó idéntico
        restaurar(antes)
        if clave_api:
            c, _, e = psql('ALTER ROLE srp_api PASSWORD NULL;')
            ok(c == 0, 'srp_api se queda otra vez sin contraseña')


def humo(correo, temporal):
    import http.cookiejar, urllib.request
    jar = http.cookiejar.CookieJar(); op = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(jar))
    base = 'http://127.0.0.1:%d' % PUERTO_APP

    def pedir(metodo, ruta, cuerpo=None, sello=None, crudo=None):
        h = {'content-type': 'application/json'}
        if sello: h['x-srp-sello'] = sello
        datos = crudo if crudo is not None else (json.dumps(cuerpo).encode() if cuerpo is not None else None)
        q = urllib.request.Request(base + ruta, method=metodo, data=datos, headers=h)
        try:
            with op.open(q, timeout=30) as r: return r.status, json.loads(r.read() or b'null')
        except urllib.error.HTTPError as e:
            cuerpo = e.read() or b'null'
            try: return e.code, json.loads(cuerpo)
            except ValueError: return e.code, {'no_es_json': cuerpo[:80].decode('utf-8', 'replace')}
    with urllib.request.urlopen('http://127.0.0.1:%d/api/health' % PUERTO_SIA, timeout=30) as r:
        ok(r.status == 200, '/api/health del backend del SIA sigue respondiendo')
    ok(pedir('GET', '/srp/api/jornadas')[0] == 401, 'sin sesión, 401')
    ok(pedir('POST', '/srp/api/acceso/entrar', {'correo': correo, 'contrasena': 'mala-' + secrets.token_hex(4)})[0] == 401, 'contraseña mala, 401')
    # Detrás del lector global de JSON del SIA, lo que no se puede leer o pasa de 100 KB responde { codigo, mensaje }
    s, j = pedir('POST', '/srp/api/acceso/entrar', crudo=b'{"correo": ')
    ok(s == 400 and (j or {}).get('codigo') == 'JSON_INVALIDO', 'un JSON roto responde 400 JSON_INVALIDO, con código y mensaje: %s %s' % (s, j))
    s, j = pedir('POST', '/srp/api/acceso/entrar', {'correo': correo, 'relleno': 'x' * (120 * 1024)})
    ok(s == 413 and (j or {}).get('codigo') == 'DEMASIADO_GRANDE', 'un cuerpo de 120 KB responde 413 DEMASIADO_GRANDE, con código y mensaje: %s %s' % (s, j))
    s, j = pedir('POST', '/srp/api/acceso/entrar', {'correo': correo, 'contrasena': temporal})
    ok(s == 200 and re.fullmatch(r'\d{8}T\d{6}\.\d{6}-[0-9a-f]{8}', str((j or {}).get('sello'))), 'la primera cuenta entra con la temporal, y la respuesta trae el sello de los datos')
    nueva = 'Ensayo ' + secrets.token_urlsafe(12)
    s, _ = pedir('POST', '/srp/api/acceso/contrasena', {'actual': temporal, 'nueva': nueva})
    ok(s == 200, 'y cambia su contraseña')
    s, j = pedir('GET', '/srp/api/acceso/yo'); ok(s == 200 and j and j.get('usuario', j).get('perfil', '') in ('ADMIN', ''), 'acceso/yo: %s' % s)
    for ruta in ('/srp/api/catalogos', '/srp/api/cuentas', '/srp/api/parametros', '/srp/api/jornadas', '/srp/api/plantaciones', '/srp/api/fotos/uso', '/srp/api/duplicados', '/srp/api/cambios'):
        s, _ = pedir('GET', ruta); ok(s == 200, 'GET %s → %s' % (ruta, s))
    # Una cuenta de Coordinación de la Secretaría, una jornada y un árbol con su folio y su calle
    s, j = pedir('POST', '/srp/api/cuentas', {'correo': 'coordinacion.ensayo@ejemplo.local', 'nombre_completo': 'Coordinación Ensayo Prueba', 'organizacion_id': 'o-sedema',
                                             'area_id': uno("SELECT id FROM srp.areas WHERE activo ORDER BY id LIMIT 1"), 'cargo_rol': 'Coordinación', 'perfil': 'COORDINADOR'})
    temporal2 = (j or {}).get('temporal') or (j or {}).get('contrasena_temporal')
    ok(s in (200, 201) and temporal2, 'la Administración da de alta una Coordinación desde la API de Usuarios: %s' % s)
    jar.clear()
    s, _ = pedir('POST', '/srp/api/acceso/entrar', {'correo': 'coordinacion.ensayo@ejemplo.local', 'contrasena': temporal2})
    pedir('POST', '/srp/api/acceso/contrasena', {'actual': temporal2, 'nueva': nueva})
    hoy = uno("SELECT (now() AT TIME ZONE 'America/Mexico_City')::date")
    import uuid
    jid, aid = str(uuid.uuid4()), str(uuid.uuid4())
    s, j = pedir('GET', '/srp/api/acceso/yo')
    sello = (j or {}).get('sello') or ''
    s, r = pedir('POST', '/srp/api/envios', sello=sello, cuerpo={'operaciones': [
        {'tipo': 'jornada.crear', 'datos': {'id': jid, 'nombre': 'Ensayo de instalación', 'programa_id': 'p-refor', 'lat': 19.4205, 'lng': -99.164, 'punto_origen': 'manual',
                                            'gps_precision_m': 5, 'arboles_previstos': 3, 'fecha': hoy, 'fecha_inicio': time.strftime('%Y-%m-%dT%H:%M:%S.000Z', time.gmtime())}},
        {'tipo': 'registro.crear', 'datos': {'id': aid, 'jornada_id': jid, 'lat': 19.4206, 'lng': -99.1641, 'punto_origen': 'gps', 'gps_precision_m': 5,
                                             'especie_id': uno("SELECT id FROM srp.especies WHERE activo ORDER BY id LIMIT 1"), 'fecha_plantacion': hoy, 'sitio_plantacion': 'suelo',
                                             'fecha_registro': time.strftime('%Y-%m-%dT%H:%M:%S.000Z', time.gmtime())}}]})
    est = [x.get('estado') for x in (r or {}).get('resultados', [])]
    fila = ((r or {}).get('resultados') or [{}, {}])[1].get('fila') or {}
    ok(est == ['recibido', 'recibido'] and fila.get('folio') and fila.get('calle_estado') in ('ok', 'lejos') and fila.get('calle_version'),
       'recibe una jornada y su árbol, con folio y con su calle (estado %s, versión de la capa %s)' % (fila.get('calle_estado'), fila.get('calle_version')))
    s, _ = pedir('GET', '/srp/api/jornadas/' + jid); ok(s == 200, 'GET /jornadas/:id de la jornada recién recibida')
    # El vaciado tras la prueba, como lo dice el LEEME
    vaciar = open(os.path.join(PKG, 'db', 'srp', 'vaciar-tras-prueba.sql'), encoding='utf-8').read()
    c, _, e = psql(vaciar)
    ok(c != 0 and uno('SELECT count(*) FROM srp.plantaciones') == '1', 'sin -v confirmar=VACIAR-SRP, el vaciado se detiene sin tocar nada %s' % e.strip()[-120:])
    c, sal, e = correr([PSQL, '-w', '-X', '-v', 'ON_ERROR_STOP=on', '-v', 'confirmar=VACIAR-SRP'], entrada=vaciar)
    quedan = uno("SELECT (SELECT count(*) FROM srp.plantaciones) || '|' || (SELECT count(*) FROM srp.jornadas) || '|' || (SELECT count(*) FROM srp.folios) || '|' || (SELECT count(*) FROM srp.usuarios)")
    disparadores = uno("SELECT string_agg(tgname || '=' || tgenabled::text, ',' ORDER BY tgname) FROM pg_trigger WHERE tgname IN ('bitacora_inmutable', 'folios_inmutables') AND tgrelid::regclass::text IN ('srp.bitacora', 'srp.folios')")
    ok(c == 0 and quedan.split('|')[:3] == ['0', '0', '0'] and int(quedan.split('|')[3]) >= 2 and 'D' not in disparadores,
       'con -v confirmar=VACIAR-SRP borra jornadas, árboles y folios, conserva las cuentas (%s) y deja encendidos sus disparadores (%s) %s' % (quedan, disparadores, e.strip()[-160:]))
    info('constancia: %s' % uno('SELECT nota FROM srp.sello'))
    s, j = pedir('POST', '/srp/api/envios', sello=sello, cuerpo={'operaciones': []})
    ok(s == 409 and (j or {}).get('codigo') == 'SELLO_DISTINTO' and (j or {}).get('sello', '') > sello, 'lo que se envía con el sello de antes del vaciado no entra: 409 SELLO_DISTINTO, con el sello nuevo')
    s, j = pedir('GET', '/srp/api/acceso/yo')
    ok(s == 200 and (j or {}).get('sello', '') > sello, 'y la sesión sigue: acceso/yo da el sello nuevo')


def navegador(version):
    from playwright.sync_api import sync_playwright
    with sync_playwright() as p:
        b = p.chromium.launch(); pg = b.new_page()
        pg.goto('http://127.0.0.1:%d/' % PUERTO_APP); pg.wait_for_selector('html[data-listo]', state='attached', timeout=40000)
        v = pg.evaluate("""() => ({ version: (document.getElementById('version-sia') || {}).textContent, banda: !!document.getElementById('banda-ficticio'),
            prueba: !!document.getElementById('acceso-prueba'), ficticios: typeof SRP.DATOS_FICTICIOS, demo: typeof SRP.demo })""")
        ok(v['version'] == 'Versión ' + version and not v['banda'] and not v['prueba'] and v['ficticios'] == 'undefined' and v['demo'] == 'undefined',
           'la aplicación del paquete abre en la versión del paquete, con datos reales y sin nada de prueba a la vista: %s' % v)
        b.close()


if __name__ == '__main__':
    try:
        main()
    finally:
        f = sum(1 for x in res if x.startswith('FALLA'))
        anotar('\n%d comprobaciones, %d fallas · bitácora en %s' % (sum(1 for x in res if x[:2] in ('OK', 'FA')), f, BITACORA))
