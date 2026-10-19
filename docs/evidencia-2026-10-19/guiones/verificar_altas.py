import os
"""Fase 3: el auditor reproduce los hallazgos Altos de los revisores, en su propio entorno (servicio 3130, app 8090).
V1 (E3-R4-03) árbol en una jornada eliminada en el servidor · V2 (E3-R4-02) dos Administraciones se desactivan a la vez
· V3 (E3-R4-01) dos cargas masivas del mismo archivo a la vez."""
import json, subprocess, threading, time, uuid, urllib.request, http.cookiejar
from playwright.sync_api import sync_playwright
API = 'http://127.0.0.1:3130/api/srp'
CLAVE = os.environ['SRP_AUD_CLAVE']   # la contraseña de las cuentas de prueba locales
C = {c['perfil']: c for c in json.load(open(r'C:\sia-rev\tmp\herr\cuentas-real.json', encoding='utf-8'))}

def apoyo(orden, datos):
    r = subprocess.run(['node', 'pruebas/apoyo_servidor.mjs', orden], input=json.dumps(datos), capture_output=True, text=True, encoding='utf-8', cwd=r'C:\sia-rev\tmp\aud')
    return json.loads(r.stdout or '{}')

def sql(q, a=()):
    r = subprocess.run(['node', '-e', "import('./bd.js').then(async m => { const c = await m.conectar(); const r = await c.query(process.argv[1], JSON.parse(process.argv[2])); console.log(JSON.stringify(r.rows)); await c.end(); })", q, json.dumps(list(a))], capture_output=True, text=True, encoding='utf-8', cwd=r'C:\sia-rev\tmp\aud\servidor')
    return json.loads(r.stdout or '[]')

class Sesion:
    def __init__(self, correo):
        self.cj = http.cookiejar.CookieJar(); self.op = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(self.cj))
        self.pedir('POST', '/acceso/entrar', {'correo': correo, 'contrasena': CLAVE})
    def pedir(self, metodo, ruta, cuerpo=None):
        req = urllib.request.Request(API + ruta, method=metodo, data=json.dumps(cuerpo).encode() if cuerpo is not None else None, headers={'content-type': 'application/json'})
        try:
            with self.op.open(req, timeout=60) as r: return r.status, json.loads(r.read() or b'null')
        except urllib.error.HTTPError as e: return e.code, json.loads(e.read() or b'null')

# ---------- V1 ----------
def v1():
    salida = []
    with sync_playwright() as p:
        b = p.chromium.launch()
        for vuelta in (1, 2):
            ctx = b.new_context(viewport={'width': 390, 'height': 844}, geolocation={'latitude': 19.357, 'longitude': -99.06, 'accuracy': 5}, permissions=['geolocation'], service_workers='block')
            pg = ctx.new_page(); respuestas = []
            pg.on('response', lambda r: '/envios' in r.url and respuestas.append(r))
            pg.goto('http://127.0.0.1:8090/'); pg.wait_for_selector('html[data-listo]')
            pg.fill('#acceso-correo', C['CABO']['correo']); pg.fill('#acceso-clave', CLAVE); pg.click('#form-acceso button[type="submit"]')
            pg.wait_for_function("() => !document.getElementById('navegacion').hidden", timeout=60000); pg.wait_for_timeout(1000)
            pg.evaluate("SRP.app.mostrarVista('registrar')"); pg.wait_for_timeout(500)
            if pg.is_hidden('#panel-iniciar-jornada'):
                pg.click('#btn-jornada-cambiar'); pg.wait_for_timeout(200); pg.click('#btn-cambiar-nueva'); pg.wait_for_timeout(300)
            pg.fill('#ini-nombre', 'Auditoria jornada borrada %d' % vuelta); pg.fill('#ini-fecha', time.strftime('%Y-%m-%d')); pg.select_option('#ini-programa', 'p-refor'); pg.fill('#ini-meta', '2')
            pg.click('#btn-ini-detectar'); pg.wait_for_timeout(1200); pg.click('#btn-iniciar-jornada'); pg.wait_for_timeout(800)
            jid = pg.evaluate("SRP.activa.jornada && SRP.activa.jornada.id")
            pg.wait_for_function("() => SRP.cola.ops.length === 0 && !SRP.envio.enviando", timeout=60000)
            j = sql("SELECT coalesce(fecha_ultima_edicion, fecha_inicio) AS v FROM srp.jornadas WHERE id = $1", [jid])[0]
            adm = Sesion(C['ADMIN']['correo'])
            est, r = adm.pedir('POST', '/envios', {'operaciones': [{'tipo': 'jornada.eliminar', 'datos': {'id': jid, 'version': j['v']}}]})
            borrada = not sql("SELECT 1 FROM srp.jornadas WHERE id = $1", [jid])
            pg.click('#btn-ubicacion'); pg.wait_for_timeout(900)
            pg.fill('#campo-especie', 'ahuehu'); pg.wait_for_timeout(250); pg.dispatch_event('.combo-opcion[data-id="ESP-0070"]', 'mousedown'); pg.wait_for_timeout(200)
            pg.click('#form-plantacion button[type=submit]'); pg.wait_for_timeout(900)
            if pg.is_visible('#dlg-confirmar'): pg.click('#btn-confirmar-si'); pg.wait_for_timeout(800)
            if pg.is_visible('#dlg-resumen'): pg.click('#btn-resumen-guardar'); pg.wait_for_timeout(800)
            aid = pg.evaluate("SRP.formulario.estado.ultimoGuardado")
            for k in range(3): pg.evaluate("() => SRP.envio.enviar({ manual: true })"); pg.wait_for_timeout(2000)
            codigos = []
            for r in respuestas[-3:]:
                try: codigos += [x.get('codigo') or x.get('estado') for x in r.json().get('resultados', [])]
                except Exception: pass
            estado = pg.evaluate("""id => ({ cola: SRP.cola.ops.filter(o => o.registro_id === id).length, rechazadas: SRP.cola.rechazadas().length,
                franja: (document.getElementById('franja-envio') || {}).hidden === false ? document.getElementById('franja-envio').textContent.trim().slice(0, 80) : '' })""", aid)
            en_srv = bool(sql("SELECT 1 FROM srp.plantaciones WHERE id = $1", [aid]))
            salida.append('V1 vuelta %d: jornada borrada en el servidor: %s · el árbol sigue en la cola: %s · respuestas: %s · rechazos a la vista: %s · franja: %r · el árbol llegó: %s'
                          % (vuelta, borrada, estado['cola'], sorted(set(codigos)), estado['rechazadas'], estado['franja'], en_srv))
            ctx.close()
        b.close()
    return salida

# ---------- V2 ----------
def v2():
    salida = []
    A2 = {'id': 'a0d10000-0000-4000-8000-0000000000a2', 'correo': 'aud.adm2@ejemplo.local', 'nombre': 'Auditoria Adm Dos', 'perfil': 'ADMIN', 'organizacion_id': 'o-sedema', 'clave': CLAVE}
    A3 = {'id': 'a0d10000-0000-4000-8000-0000000000a3', 'correo': 'aud.adm3@ejemplo.local', 'nombre': 'Auditoria Adm Tres', 'perfil': 'ADMIN', 'organizacion_id': 'o-sedema', 'clave': CLAVE}
    apoyo('preparar', {'cuentas': [A2, A3]})
    jefe = Sesion(C['ADMIN']['correo']); ambas = 0; intentos = 8
    for k in range(intentos):
        for x in (A2, A3): jefe.pedir('POST', '/cuentas/%s/estado' % x['id'], {'activo': True})
        s2, s3 = Sesion(A2['correo']), Sesion(A3['correo'])
        barrera = threading.Barrier(2); res = {}
        def golpe(s, otra, nombre):
            barrera.wait(); res[nombre] = s.pedir('POST', '/cuentas/%s/estado' % otra, {'activo': False})[0]
        t = [threading.Thread(target=golpe, args=(s2, A3['id'], 'a2')), threading.Thread(target=golpe, args=(s3, A2['id'], 'a3'))]
        [x.start() for x in t]; [x.join() for x in t]
        act = {r['id']: r['activo'] for r in sql("SELECT id, activo FROM srp.usuarios WHERE id = ANY($1)", [[A2['id'], A3['id']]])}
        if not any(act.values()): ambas += 1
    salida.append('V2: dos Administraciones que se desactivan una a la otra al mismo tiempo quedaron las dos inactivas %d de %d veces' % (ambas, intentos))
    for x in (A2, A3): jefe.pedir('POST', '/cuentas/%s/estado' % x['id'], {'activo': True})
    return salida, [A2['id'], A3['id']]

# ---------- V3 ----------
def v3():
    salida = []
    for vuelta in (1, 2):
        base_lat, base_lng = 19.3601 + vuelta * 0.001, -99.0703
        arboles = lambda jid: [{'id': str(uuid.uuid4()), 'jornada_id': jid, 'renglon': i + 2, 'lat': round(base_lat + i * 0.0001, 6), 'lng': round(base_lng, 6),
                                'especie_id': 'ESP-0070', 'fecha_plantacion': '2025-05-05', 'revisado': True} for i in range(3)]
        s1, s2 = Sesion(C['ADMIN']['correo']), Sesion(C['ADMIN']['correo'])
        lotes = []
        for s in (s1, s2):
            jid = str(uuid.uuid4()); lote = str(uuid.uuid4())
            lotes.append((s, lote, {'archivo': 'auditoria-doble.xlsx', 'jornadas': [{'id': jid, 'organizacion_id': 'o-alc-09007', 'programa_id': 'p-refor', 'fecha': '2025-05-05'}], 'arboles': arboles(jid)}))
        r1 = lotes[0][0].pedir('PUT', '/cargas/%s/tandas/1' % lotes[0][1], lotes[0][2])
        r2 = lotes[1][0].pedir('PUT', '/cargas/%s/tandas/1' % lotes[1][1], lotes[1][2])
        c1 = lotes[0][0].pedir('POST', '/cargas/%s/completa' % lotes[0][1], {'arboles': 3})
        c2 = lotes[1][0].pedir('POST', '/cargas/%s/completa' % lotes[1][1], {'arboles': 3})
        n = sql("SELECT count(*)::int AS n FROM srp.plantaciones WHERE estatus = 'activo' AND lat BETWEEN $1 AND $2 AND lng BETWEEN $3 AND $4 AND fecha_plantacion = '2025-05-05'",
                [base_lat - 0.00005, base_lat + 0.00035, base_lng - 0.00005, base_lng + 0.00005])[0]['n']
        salida.append('V3 vuelta %d: tandas %s/%s · completar %s/%s · árboles en la base: %d (esperado 3)' % (vuelta, r1[0], r2[0], c1[0], c2[0], n))
        for s, lote, _ in lotes: s.pedir('DELETE', '/cargas/%s' % lote)
    return salida

if __name__ == '__main__':
    for linea in v1(): print(linea)
    s2, ids = v2(); [print(l) for l in s2]
    for linea in v3(): print(linea)
    print('cuentas extra:', ids)
