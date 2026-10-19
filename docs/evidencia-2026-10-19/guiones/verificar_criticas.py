"""Fase 3: el auditor reproduce las Críticas del revisor 1, en su entorno (servicio 3130, app 8090).
V4 (E3-R1-01) una corrección sin cambios sin señal deja atorada la eliminación siguiente.
V5 (E3-R1-02) dos pestañas de la misma cuenta: un árbol registrado sin señal en una se pierde al cerrar y reportar en la otra."""
import json, subprocess, time
from playwright.sync_api import sync_playwright
C = {c['perfil']: c for c in json.load(open(r'C:\sia-rev\tmp\herr\cuentas-real.json', encoding='utf-8'))}
HOY = time.strftime('%Y-%m-%d')
def sql(q, a=()):
    r = subprocess.run(['node', '-e', "import('./bd.js').then(async m => { const c = await m.conectar(); const r = await c.query(process.argv[1], JSON.parse(process.argv[2])); console.log(JSON.stringify(r.rows)); await c.end(); })", q, json.dumps(list(a))], capture_output=True, text=True, encoding='utf-8', cwd=r'C:\sia-rev\tmp\aud\servidor')
    return json.loads(r.stdout or '[]')
def entrar(pg):
    pg.goto('http://127.0.0.1:8090/'); pg.wait_for_selector('html[data-listo]')
    if pg.is_visible('#form-acceso'):
        pg.fill('#acceso-correo', C['CABO']['correo']); pg.fill('#acceso-clave', C['CABO']['clave']); pg.click('#form-acceso button[type="submit"]')
    pg.wait_for_function("() => !document.getElementById('navegacion').hidden", timeout=60000); pg.wait_for_timeout(1200)
def jornada(pg, nombre):
    pg.evaluate("SRP.app.mostrarVista('registrar')"); pg.wait_for_timeout(500)
    if pg.is_hidden('#panel-iniciar-jornada'):
        pg.click('#btn-jornada-cambiar'); pg.wait_for_timeout(200); pg.click('#btn-cambiar-nueva'); pg.wait_for_timeout(300)
    pg.fill('#ini-nombre', nombre); pg.fill('#ini-fecha', HOY); pg.select_option('#ini-programa', 'p-refor'); pg.fill('#ini-meta', '3')
    pg.click('#btn-ini-detectar'); pg.wait_for_timeout(1200); pg.click('#btn-iniciar-jornada'); pg.wait_for_timeout(900)
    return pg.evaluate("SRP.activa.jornada && SRP.activa.jornada.id")
def arbol(pg):
    pg.evaluate("SRP.app.mostrarVista('registrar')"); pg.wait_for_timeout(400)
    pg.click('#btn-ubicacion'); pg.wait_for_timeout(900)
    pg.fill('#campo-especie', 'ahuehu'); pg.wait_for_timeout(250); pg.dispatch_event('.combo-opcion[data-id="ESP-0070"]', 'mousedown'); pg.wait_for_timeout(200)
    pg.click('#form-plantacion button[type=submit]'); pg.wait_for_timeout(900)
    if pg.is_visible('#dlg-confirmar'): pg.click('#btn-confirmar-si'); pg.wait_for_timeout(800)
    if pg.is_visible('#dlg-resumen'): pg.click('#btn-resumen-guardar'); pg.wait_for_timeout(800)
    return pg.evaluate("SRP.formulario.estado.ultimoGuardado")
def vacia(pg, t=60000):
    pg.wait_for_function("() => SRP.cola.ops.length === 0 && !SRP.envio.enviando", timeout=t)
COLA = "() => SRP.cola.ops.map(o => o.tipo + (o.version === null ? ' (sin versión)' : ''))"
PASTILLA = "() => (document.getElementById('conexion') || {}).textContent.trim().replace(/\\s+/g, ' ')"

with sync_playwright() as p:
    b = p.chromium.launch()
    geo = dict(geolocation={'latitude': 19.357, 'longitude': -99.06, 'accuracy': 5}, permissions=['geolocation'], service_workers='block', viewport={'width': 390, 'height': 844})
    for vuelta in (1, 2):
        ctx = b.new_context(**geo); pg = ctx.new_page(); entrar(pg)
        jornada(pg, 'Auditoria V4 %d' % vuelta); aid = arbol(pg); vacia(pg)
        ctx.set_offline(True)
        # Corregir y guardar sin cambiar nada; luego eliminar el árbol
        pg.evaluate("async id => SRP.formulario.editar(await SRP.almacen.uno('plantaciones', id))", aid); pg.wait_for_timeout(700)
        pg.click('#form-plantacion button[type=submit]'); pg.wait_for_timeout(900)
        if pg.is_visible('#dlg-resumen'): pg.click('#btn-resumen-guardar'); pg.wait_for_timeout(700)
        pg.evaluate("async id => { const r = await SRP.almacen.uno('plantaciones', id); await SRP.registros.eliminar(r); }", aid); pg.wait_for_timeout(500)
        if pg.is_visible('#dlg-confirmar'): pg.click('#btn-confirmar-si'); pg.wait_for_timeout(800)
        cola_sin = pg.evaluate(COLA)
        ctx.set_offline(False); pg.wait_for_timeout(1000)
        for k in range(3): pg.evaluate("() => SRP.envio.enviar({ manual: true })"); pg.wait_for_timeout(2500)
        srv = sql("SELECT estatus FROM srp.plantaciones WHERE id = $1", [aid])
        print('V4 vuelta %d: cola sin señal %s · cola con señal %s · pastilla %r · en el servidor el árbol está %s'
              % (vuelta, cola_sin, pg.evaluate(COLA), pg.evaluate(PASTILLA), srv))
        ctx.close()
    for vuelta in (1, 2):
        ctx = b.new_context(**geo); a = ctx.new_page(); entrar(a)
        jid = jornada(a, 'Auditoria V5 %d' % vuelta); arbol(a); vacia(a)
        bp = ctx.new_page(); entrar(bp)
        ctx.set_offline(True)
        nuevo = arbol(bp)                       # pestaña B registra sin señal
        a.evaluate("async id => { const j = await SRP.almacen.uno('jornadas', id); await SRP.activa.cambiarEstatus(j, 'cerrada'); }", jid); a.wait_for_timeout(800)
        a.evaluate("async id => { const j = await SRP.almacen.uno('jornadas', id); await SRP.reportes.marcarGenerado(j, null); }", jid); a.wait_for_timeout(800)
        ctx.set_offline(False); a.wait_for_timeout(1000)
        for k in range(3):
            for pg in (a, bp): pg.evaluate("() => SRP.envio.enviar({ manual: true })"); pg.wait_for_timeout(2000)
        srv_arbol = sql("SELECT estatus FROM srp.plantaciones WHERE id = $1", [nuevo])
        srv_j = sql("SELECT estatus, reporte_en IS NOT NULL AS reporte FROM srp.jornadas WHERE id = $1", [jid])
        en_tel = a.evaluate("async id => !!(await SRP.almacen.unoLocal('plantaciones', id))", nuevo)
        cola_b = bp.evaluate("() => SRP.cola.ops.filter(o => o.tabla === 'plantaciones').map(o => o.tipo + ' ' + o.registro_id.slice(0, 8))")
        print('V5 vuelta %d: árbol de la pestaña B en el servidor %s · en el teléfono %s · en la cola de B %s · jornada en el servidor %s · cola A %s'
              % (vuelta, srv_arbol, en_tel, cola_b, srv_j, a.evaluate(COLA)))
        ctx.close()
    b.close()
