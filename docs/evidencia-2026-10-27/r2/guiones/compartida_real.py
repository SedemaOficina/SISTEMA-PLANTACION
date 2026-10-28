"""B6 y B8 · La jornada compartida CON DATOS REALES (copia de producción y servicio con la cuenta srp_api).

Una vuelta:
  1. La Coordinación (computadora) abre una jornada compartida con «Varios cabos»: cabo 2 y cabo 3.
  2. Los dos cabos (teléfono 390×844) entran con señal: les llega la jornada y el aviso.
  3. Los dos SE QUEDAN SIN SEÑAL y registran un árbol cada uno, con fotografía.
  4. Mientras, la Coordinación QUITA al cabo 3 de la jornada.
  5. Vuelve la señal: ¿llega el árbol del cabo 2? ¿y el del cabo 3, ya quitado? ¿qué le dice la pantalla?
  6. El cabo 2 toca «Terminar mi parte». El servidor lo anota.
  7. RELEVO hacia un cabo sin señal: el cabo 3, sin señal, recibe en relevo una jornada del cabo 2; al volver la señal
     le llega con su aviso.
Cada paso compara con el servidor (node pruebas/apoyo_servidor.mjs apoyos/leer, con la cuenta local de la base).
Uso: python compartida_real.py <chromium|webkit> <vuelta>     (cuentas: SRP_CUENTAS, con r2.coord, r2.cabo2, r2.cabo3)"""
import json, os, subprocess, sys, tempfile, time
from PIL import Image
from playwright.sync_api import sync_playwright

MOTOR, VUELTA = sys.argv[1], sys.argv[2]
BASE = 'http://127.0.0.1:8122/'
RAIZ = os.path.join('C:' + os.sep, 'sia-rev', 'tmp', 'aud1027', 'r2')
SALIDA = os.path.join(RAIZ, 'evidencia', 'b6-b8'); os.makedirs(SALIDA, exist_ok=True)
C = {c['correo'].split('@')[0].split('.')[1]: c for c in json.load(open(os.environ.get('SRP_CUENTAS', os.path.join(RAIZ, 'cuentas-r2.json')), encoding='utf-8'))}
COORD, CABO2, CABO3 = C['coord'], C['cabo2'], C['cabo3']
foto = os.path.join(tempfile.gettempdir(), 'r2-compartida.jpg'); Image.new('RGB', (64, 48), (40, 120, 60)).save(foto, 'JPEG')
res = []
def ok(cond, texto, dato=None):
    linea = ('OK    ' if cond else 'FALLA ') + texto + (' · ' + json.dumps(dato, ensure_ascii=False)[:400] if dato is not None else '')
    res.append(linea); print(MOTOR, VUELTA, linea, flush=True)

def apoyo(orden, d):
    r = subprocess.run(['node', 'pruebas/apoyo_servidor.mjs', orden], input=json.dumps(d), capture_output=True, text=True, cwd=RAIZ, encoding='utf-8')
    return json.loads(r.stdout or '{}')

def contexto(b, ancho, alto):
    op = dict(viewport={'width': ancho, 'height': alto}, service_workers='block', timezone_id='America/Mexico_City', locale='es-MX')
    if MOTOR == 'chromium': op.update(geolocation={'latitude': 19.4204, 'longitude': -99.1819, 'accuracy': 6}, permissions=['geolocation'])
    ctx = b.new_context(**op); pg = ctx.new_page(); pg._err = []
    pg.on('pageerror', lambda e: pg._err.append(str(e)[:200]))
    return ctx, pg

def entrar(pg, c):
    pg.goto(BASE); pg.wait_for_selector('html[data-listo]', state='attached', timeout=60000)
    pg.fill('#acceso-correo', c['correo']); pg.fill('#acceso-clave', c['clave']); pg.click('#form-acceso button[type="submit"]')
    pg.wait_for_function("() => !document.getElementById('navegacion').hidden", timeout=90000)
    pg.wait_for_function("() => SRP.remoto.listo()", timeout=240000); pg.wait_for_timeout(1500)

def cerrar_dialogos(pg):
    pg.evaluate("() => document.querySelectorAll('dialog[open]').forEach(d => d.close())")

def punto(pg, inicio=False):
    pre = 'ini-' if inicio else ''
    if MOTOR == 'chromium':
        pg.click('#btn-ini-detectar' if inicio else '#btn-ubicacion'); pg.wait_for_timeout(1500)
    else:
        pg.evaluate("p => document.getElementById(p + 'detalles-coord').open = true", pre)
        pg.fill('#%scoord-lat' % pre, '19.4204'); pg.fill('#%scoord-lng' % pre, '99.1819'); pg.click('#btn-%scoord-aplicar' % pre); pg.wait_for_timeout(900)

def registrar(pg, especie='ahuehu', esp_id='ESP-0070'):
    pg.evaluate("SRP.app.mostrarVista('registrar')"); pg.wait_for_timeout(800); cerrar_dialogos(pg)
    punto(pg)
    pg.fill('#campo-especie', especie); pg.wait_for_timeout(300); pg.dispatch_event('.combo-opcion[data-id="%s"]' % esp_id, 'mousedown'); pg.wait_for_timeout(200)
    pg.set_input_files('#foto-archivo', foto); pg.wait_for_timeout(1500)
    pg.click('#form-plantacion button[type=submit]'); pg.wait_for_timeout(1000)
    for _ in range(3):
        if pg.is_visible('#dlg-confirmar'): pg.click('#btn-confirmar-si'); pg.wait_for_timeout(800)
        if pg.is_visible('#dlg-resumen'): pg.click('#btn-resumen-guardar'); pg.wait_for_timeout(1000)
    return pg.evaluate("SRP.formulario.estado.ultimoGuardado")

def cola(pg):
    return pg.evaluate("() => SRP.cola.ops.length")

with sync_playwright() as p:
    b = getattr(p, MOTOR).launch()
    # ===== 1. La Coordinación abre la jornada compartida =====
    cc, pc = contexto(b, 1440, 900)
    entrar(pc, COORD); cerrar_dialogos(pc)
    pc.evaluate("SRP.app.mostrarVista('registrar')")
    pc.wait_for_function("() => !document.getElementById('panel-iniciar-jornada').hidden || !document.getElementById('franja-jornada').hidden", timeout=30000)
    if pc.is_hidden('#panel-iniciar-jornada'):
        pc.click('#btn-jornada-cambiar'); pc.wait_for_timeout(300); pc.click('#btn-cambiar-nueva'); pc.wait_for_timeout(500)
    nombre = 'Compartida r2 %s %s' % (MOTOR, VUELTA)
    pc.fill('#ini-nombre', nombre); pc.select_option('#ini-programa', 'p-refor'); pc.fill('#ini-meta', '10'); pc.click('#btn-ini-hoy')
    punto(pc, inicio=True)
    pc.click('#ini-quien .chip[data-quien="varios"]'); pc.wait_for_timeout(300)
    cabos = pc.eval_on_selector_all('#ini-apoyos .chip', 'l => l.map(b => b.dataset.id)')
    ok(CABO2['id'] in cabos and CABO3['id'] in cabos, 'la lista de «Varios cabos» trae a los cabos de su institución', len(cabos))
    pc.click('#ini-apoyos .chip[data-id="%s"]' % CABO2['id']); pc.click('#ini-apoyos .chip[data-id="%s"]' % CABO3['id'])
    pc.click('#btn-iniciar-jornada'); pc.wait_for_selector('#franja-jornada', state='visible', timeout=30000); pc.wait_for_timeout(1500)
    jid = pc.evaluate("SRP.activa.jornada && SRP.activa.jornada.id")
    try: pc.wait_for_function("() => SRP.cola.ops.filter(o => !o.rechazo).length === 0 && !SRP.envio.enviando", timeout=60000)
    except Exception: pass
    s = apoyo('apoyos', {'id': jid})
    ok(s.get('estatus') == 'abierta' and sorted(x[0] for x in s.get('apoyos') or []) == sorted([CABO2['id'], CABO3['id']]), 'la jornada nace compartida en el servidor con los dos cabos', s)
    pc.screenshot(path=os.path.join(SALIDA, '%s-%s-1-coordinacion.png' % (MOTOR, VUELTA)))

    # ===== 2. Los cabos entran con señal =====
    c2, p2 = contexto(b, 390, 844); c3, p3 = contexto(b, 390, 844)
    avisos = {}
    for (pg, c, k) in ((p2, CABO2, 'cabo2'), (p3, CABO3, 'cabo3')):
        t0 = time.time(); entrar(pg, c)
        try: pg.wait_for_selector('#dlg-confirmar[open]', timeout=20000); avisos[k] = [round(time.time() - t0, 1), pg.inner_text('#dlg-confirmar-texto')[:160]]
        except Exception: avisos[k] = None
        cerrar_dialogos(pg)
        pg.evaluate("SRP.app.mostrarVista('registrar')"); pg.wait_for_timeout(1000)
    ok(all(avisos.values()), 'a los dos cabos les llega el aviso «Jornada compartida» al entrar con señal (segundos desde entrar)', avisos)
    ok(p2.evaluate("SRP.activa.jornada && SRP.activa.jornada.id") == jid and p3.evaluate("SRP.activa.jornada && SRP.activa.jornada.id") == jid, 'los dos quedan en la jornada compartida')
    ok('Terminar mi parte' in p2.inner_text('#btn-jornada-cerrar'), 'el cabo de apoyo ve «Terminar mi parte»')

    # ===== 3. Sin señal, cada uno registra un árbol =====
    c2.set_offline(True); c3.set_offline(True); p2.wait_for_timeout(1500)
    a2 = registrar(p2); a3 = registrar(p3)
    ok(bool(a2) and bool(a3), 'sin señal, los dos guardan su árbol en el teléfono', [a2, a3])
    ok(cola(p2) >= 1 and cola(p3) >= 1, 'quedan en su cola por enviar', [cola(p2), cola(p3)])
    franja2 = p2.inner_text('#franja-jornada')
    ok('1 suyo' in franja2, 'la franja del cabo 2 dice «1 suyo»', franja2[-120:])
    p2.screenshot(path=os.path.join(SALIDA, '%s-%s-3-cabo2-sin-senal.png' % (MOTOR, VUELTA)))

    # ===== 4. La Coordinación quita al cabo 3 =====
    pc.click('#btn-franja-apoyos'); pc.wait_for_selector('#dlg-apoyos[open]'); pc.wait_for_timeout(400)
    pc.click('#apoyos-cabos .chip[data-id="%s"]' % CABO3['id']); pc.click('#btn-apoyos-guardar'); pc.wait_for_timeout(2000)
    try: pc.wait_for_function("() => SRP.cola.ops.filter(o => !o.rechazo).length === 0 && !SRP.envio.enviando", timeout=60000)
    except Exception: pass
    s = apoyo('apoyos', {'id': jid})
    ok([x for x in s.get('apoyos') or [] if x[0] == CABO3['id']][0][1] == 'quitado', 'en el servidor el cabo 3 queda «quitado»', s)

    # ===== 5. Vuelve la señal =====
    c2.set_offline(False); c3.set_offline(False)
    for pg in (p2, p3):
        pg.evaluate("() => { window.dispatchEvent(new Event('online')); if (SRP.envio && SRP.envio.enviar) SRP.envio.enviar(); }")
    t0 = time.time()
    for pg in (p2, p3):
        try: pg.wait_for_function("() => SRP.cola.ops.filter(o => !o.rechazo).length === 0 && !SRP.envio.enviando", timeout=90000)
        except Exception: pass
    s = apoyo('apoyos', {'id': jid})
    ok(CABO2['id'] in s.get('arboles', []), 'con señal llega al servidor el árbol del cabo 2 (segundos: %.1f)' % (time.time() - t0), s)
    llego3 = CABO3['id'] in s.get('arboles', [])
    rechazos3 = p3.evaluate("() => SRP.cola.ops.filter(o => o.rechazo).map(o => [o.tipo, o.rechazo.codigo, (o.rechazo.mensaje || '').slice(0, 200)])")
    pantalla3 = p3.evaluate("() => [document.getElementById('aviso') && !document.getElementById('aviso').hidden ? document.getElementById('aviso').innerText.slice(0, 200) : null, [...document.querySelectorAll('dialog[open]')].map(d => d.innerText.slice(0, 200)), document.getElementById('conexion') ? document.getElementById('conexion').innerText : null]")
    local3 = p3.evaluate("async id => { const a = await SRP.almacen.uno('plantaciones', id); return a ? [a.estatus, a.jornada_id] : null; }", a3)
    ok(True, 'el árbol del cabo 3 (ya quitado, registrado sin señal antes de que lo quitaran): ' + ('LLEGÓ al servidor' if llego3 else 'NO llegó al servidor'),
       {'cola3': cola(p3), 'rechazos': rechazos3, 'pantalla': pantalla3, 'en_el_telefono': local3, 'activa': p3.evaluate("SRP.activa.jornada && SRP.activa.jornada.id")})
    p3.screenshot(path=os.path.join(SALIDA, '%s-%s-5-cabo3-quitado-con-senal.png' % (MOTOR, VUELTA)))
    # Qué le ofrece la ventana de lo que el servidor no aceptó; y si, al volver a entrar, sabe que lo quitaron
    p3.evaluate("async () => { await SRP.rechazos.abrir(); }"); p3.wait_for_timeout(800)
    vr = p3.evaluate("() => { const d = document.getElementById('dlg-rechazos'); return d && d.open ? [d.innerText.replace(/\s+/g, ' ').slice(0, 500), [...d.querySelectorAll('button')].filter(b => b.offsetParent).map(b => (b.getAttribute('aria-label') || b.textContent).trim())] : null; }")
    p3.screenshot(path=os.path.join(SALIDA, '%s-%s-5-cabo3-rechazos.png' % (MOTOR, VUELTA)))
    ok(True, 'la ventana «lo que el servidor no aceptó» del cabo 3', vr)
    cerrar_dialogos(p3)
    p3.reload(); p3.wait_for_selector('html[data-listo]', state='attached'); p3.wait_for_function("() => SRP.remoto.listo()", timeout=240000); p3.wait_for_timeout(4000)
    ok(True, 'el cabo 3, al volver a entrar con señal: su jornada activa, ventanas y franja',
       {'activa': p3.evaluate("SRP.activa.jornada && SRP.activa.jornada.id") == jid, 'dialogos': p3.evaluate("() => [...document.querySelectorAll('dialog[open]')].map(d => d.innerText.slice(0, 160))"),
        'arbol_en_telefono': p3.evaluate("async id => { const a = await SRP.almacen.uno('plantaciones', id); return a ? a.estatus : null; }", a3),
        'franja_rechazos': p3.evaluate("() => [...document.querySelectorAll('[id*=rechazo]')].filter(e => e.offsetParent && !e.closest('dialog')).map(e => e.id + ': ' + e.innerText.slice(0, 160))")})
    cerrar_dialogos(p3)

    # ===== 6. «Terminar mi parte» del cabo 2, ya con señal =====
    p2.evaluate("SRP.app.mostrarVista('registrar')"); p2.wait_for_timeout(800); cerrar_dialogos(p2)
    p2.click('#btn-jornada-cerrar'); p2.wait_for_selector('#dlg-confirmar[open]'); pregunta = p2.inner_text('#dlg-confirmar-texto')
    p2.click('#btn-confirmar-si'); p2.wait_for_timeout(1500)
    try: p2.wait_for_function("() => SRP.cola.ops.filter(o => !o.rechazo).length === 0 && !SRP.envio.enviando", timeout=60000)
    except Exception: pass
    s = apoyo('apoyos', {'id': jid})
    ok([x for x in s.get('apoyos') or [] if x[0] == CABO2['id']][0][1] == 'terminado' and '1 árbol suyo' in pregunta, '«Terminar mi parte» pregunta con «1 árbol suyo» y el servidor lo anota', [pregunta[:120], s])
    ok(p2.evaluate("SRP.activa.jornada && SRP.activa.jornada.id") != jid, 'la jornada sale de la lista del cabo 2')

    # ===== 7. Relevo hacia un cabo sin señal =====
    # El cabo 2 abre una jornada suya; el cabo 3 se queda sin señal; la Coordinación pasa la del cabo 2 al cabo 3
    cerrar_dialogos(p2); p2.evaluate("SRP.app.mostrarVista('registrar')"); p2.wait_for_timeout(800)
    if p2.is_hidden('#panel-iniciar-jornada'):
        p2.click('#btn-jornada-cambiar'); p2.wait_for_timeout(300); p2.click('#btn-cambiar-nueva'); p2.wait_for_timeout(500)
    p2.fill('#ini-nombre', 'Relevo r2 %s %s' % (MOTOR, VUELTA)); p2.select_option('#ini-programa', 'p-refor'); p2.fill('#ini-meta', '5'); p2.click('#btn-ini-hoy')
    punto(p2, inicio=True); p2.click('#btn-iniciar-jornada'); p2.wait_for_selector('#franja-jornada', state='visible', timeout=30000); p2.wait_for_timeout(1000)
    rid = p2.evaluate("SRP.activa.jornada && SRP.activa.jornada.id")
    try: p2.wait_for_function("() => SRP.cola.ops.filter(o => !o.rechazo).length === 0 && !SRP.envio.enviando", timeout=60000)
    except Exception: pass
    c3.set_offline(True); p3.wait_for_timeout(500)
    # la Coordinación: trae lo enviado y abre la ficha de la jornada del cabo 2
    pc.reload(); pc.wait_for_selector('html[data-listo]', state='attached'); pc.wait_for_function("() => SRP.remoto.listo()", timeout=240000); pc.wait_for_timeout(1500); cerrar_dialogos(pc)
    pc.evaluate("SRP.app.mostrarVista('jornadas')"); pc.wait_for_timeout(2000)
    pc.evaluate("async id => { await SRP.jornadas.abrir(id); }", rid); pc.wait_for_timeout(1500)
    relevo_visible = pc.is_visible('#btn-jornada-relevo')
    ok(relevo_visible, 'la ficha de la jornada del cabo 2 ofrece «Relevo de cabo» a la Coordinación')
    if relevo_visible:
        pc.click('#btn-jornada-relevo'); pc.wait_for_selector('#dlg-relevo[open]'); pc.wait_for_timeout(500)
        opciones = pc.evaluate("() => [...document.querySelectorAll('#dlg-relevo select option, #dlg-relevo [data-id]')].map(o => o.value || o.dataset.id)")
        if pc.locator('#dlg-relevo select').count():
            pc.select_option('#dlg-relevo select', CABO3['id'])
        else:
            pc.click('#dlg-relevo [data-id="%s"]' % CABO3['id'])
        pc.screenshot(path=os.path.join(SALIDA, '%s-%s-7-relevo.png' % (MOTOR, VUELTA)))
        pc.evaluate("() => { const b = [...document.querySelectorAll('#dlg-relevo button')].find(x => /relevo|pasar|guardar/i.test(x.textContent) && !/cerrar|cancelar/i.test(x.getAttribute('aria-label') || x.textContent)); if (b) b.click(); }")
        pc.wait_for_timeout(1500)
        if pc.is_visible('#dlg-confirmar'): pc.click('#btn-confirmar-si'); pc.wait_for_timeout(1500)
        try: pc.wait_for_function("() => SRP.cola.ops.filter(o => !o.rechazo).length === 0 && !SRP.envio.enviando", timeout=60000)
        except Exception: pass
        srv = apoyo('leer', {'id': rid})
        ok(srv.get('jornada') is not None, 'el relevo queda en el servidor', srv)
        # el cabo 3 sigue sin señal: no lo sabe
        ok(p3.evaluate("async id => { const j = await SRP.almacen.uno('jornadas', id); return !j || j.relevo_id === null || j.relevo_id === undefined; }", rid), 'sin señal, el teléfono del cabo 3 todavía no tiene el relevo')
        c3.set_offline(False); t0 = time.time()
        p3.evaluate("() => { window.dispatchEvent(new Event('online')); }")
        p3.reload(); p3.wait_for_selector('html[data-listo]', state='attached'); p3.wait_for_function("() => SRP.remoto.listo()", timeout=240000)
        try: p3.wait_for_selector('#dlg-confirmar[open]', timeout=30000); aviso3 = [round(time.time() - t0, 1), p3.inner_text('#dlg-confirmar-texto')[:200]]
        except Exception: aviso3 = None
        ok(bool(aviso3) and p3.evaluate("async id => { const j = await SRP.almacen.uno('jornadas', id); return !!j && j.estatus === 'abierta'; }", rid),
           'al volver la señal el cabo 3 recibe la jornada en relevo, con su aviso', {'aviso': aviso3, 'opciones_relevo': len(opciones)})
        p3.screenshot(path=os.path.join(SALIDA, '%s-%s-7-cabo3-aviso-relevo.png' % (MOTOR, VUELTA)))
    ok(not (pc._err + p2._err + p3._err), 'sin errores de página', (pc._err + p2._err + p3._err)[:4])
    json.dump({'motor': MOTOR, 'vuelta': VUELTA, 'jornada': jid, 'resultado': res}, open(os.path.join(SALIDA, 'compartida-%s-%s.json' % (MOTOR, VUELTA)), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    b.close()
