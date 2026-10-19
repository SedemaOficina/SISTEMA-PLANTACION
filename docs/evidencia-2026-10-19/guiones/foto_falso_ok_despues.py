"""F2, después de la corrección: ¿se pierde una fotografía si algo entre el teléfono y el servicio responde 200 sin ser el servicio?
Modo real (aplicación en 8090, servicio en 3130). Dos vueltas desde un estado limpio (contexto nuevo, jornada nueva)."""
import json, os, subprocess, sys, tempfile, time, datetime
from PIL import Image
from playwright.sync_api import sync_playwright
BASE = 'http://127.0.0.1:8090/'
C = json.load(open(r'C:\sia-rev\tmp\herr\cuentas-real.json', encoding='utf-8'))
CABO = [c for c in C if c['perfil'] == 'CABO'][0]
HOY = time.strftime('%Y-%m-%d')
foto = os.path.join(tempfile.gettempdir(), 'aud-foto.jpg'); Image.new('RGB', (64, 48), (40, 120, 60)).save(foto, 'JPEG')

def leer_bd(sql, args):
    r = subprocess.run(['node', '-e', "import('./bd.js').then(async m => { const c = await m.conectar(); const r = await c.query(process.argv[1], JSON.parse(process.argv[2])); console.log(JSON.stringify(r.rows)); await c.end(); })", sql, json.dumps(args)],
                       capture_output=True, text=True, encoding='utf-8', cwd=r'C:\sia-rev\tmp\aud\servidor')
    return json.loads(r.stdout or '[]')

with sync_playwright() as p:
    b = p.chromium.launch()
    for vuelta in (1, 2):
        ctx = b.new_context(viewport={'width': 390, 'height': 844}, geolocation={'latitude': 19.357, 'longitude': -99.06, 'accuracy': 5}, permissions=['geolocation'], service_workers='block')
        pg = ctx.new_page()
        pg.goto(BASE); pg.wait_for_selector('html[data-listo]')
        pg.fill('#acceso-correo', CABO['correo']); pg.fill('#acceso-clave', CABO['clave']); pg.click('#form-acceso button[type="submit"]')
        pg.wait_for_function("() => !document.getElementById('navegacion').hidden", timeout=60000); pg.wait_for_timeout(1500)
        # Una jornada y un árbol con su fotografía
        pg.evaluate("SRP.app.mostrarVista('registrar')"); pg.wait_for_timeout(500)
        if pg.is_hidden('#panel-iniciar-jornada'):
            pg.click('#btn-jornada-cambiar'); pg.wait_for_timeout(200); pg.click('#btn-cambiar-nueva'); pg.wait_for_timeout(300)
        pg.fill('#ini-nombre', 'Auditoria foto %d' % vuelta); pg.fill('#ini-fecha', HOY); pg.select_option('#ini-programa', 'p-refor'); pg.fill('#ini-meta', '3')
        pg.click('#btn-ini-detectar'); pg.wait_for_timeout(1200); pg.click('#btn-iniciar-jornada'); pg.wait_for_timeout(800)
        jid = pg.evaluate("SRP.activa.jornada && SRP.activa.jornada.id")
        # Algo en medio contesta 200 con una página, no el servicio, sólo a la subida de la fotografía
        pg.route('**/api/srp/fotos/**', lambda r: r.fulfill(status=200, content_type='text/html', body='<html><body>Portal de acceso</body></html>') if r.request.method == 'PUT' else r.continue_())
        pg.click('#btn-ubicacion'); pg.wait_for_timeout(900)
        pg.fill('#campo-especie', 'ahuehu'); pg.wait_for_timeout(250); pg.dispatch_event('.combo-opcion[data-id="ESP-0070"]', 'mousedown'); pg.wait_for_timeout(200)
        pg.set_input_files('#foto-archivo', foto); pg.wait_for_timeout(1000)
        pg.click('#form-plantacion button[type=submit]'); pg.wait_for_timeout(900)
        if pg.is_visible('#dlg-confirmar'): pg.click('#btn-confirmar-si'); pg.wait_for_timeout(800)
        if pg.is_visible('#dlg-resumen'): pg.click('#btn-resumen-guardar'); pg.wait_for_timeout(800)
        aid = pg.evaluate("SRP.formulario.estado.ultimoGuardado")
        # Con el «200» ajeno, la fotografía se queda en la cola; sin él, llega
        pg.wait_for_function("id => SRP.cola.de(id).every(o => o.tipo === 'foto') && !SRP.envio.enviando", arg=aid, timeout=60000); pg.wait_for_timeout(800)
        foto_id = pg.evaluate("async id => (await SRP.almacen.unoLocal('plantaciones', id) || {}).foto_id", aid)
        queda = pg.evaluate("id => SRP.cola.de(id).map(o => o.tipo)", aid)
        antes = leer_bd("SELECT count(*)::int AS n FROM srp.fotografias WHERE id = $1", [foto_id])
        pg.unroute('**/api/srp/fotos/**')
        pg.evaluate("() => SRP.envio.enviar({ manual: true })")
        pg.wait_for_function("() => SRP.cola.ops.length === 0 && !SRP.envio.enviando", timeout=60000)
        print('vuelta %d: con el 200 ajeno la cola tiene %s y el servidor %s fotografías' % (vuelta, queda, antes[0]['n']))
        en_servidor = leer_bd("SELECT count(*)::int AS n FROM srp.fotografias WHERE id = $1", [foto_id])
        # Se cierra la jornada y se entrega su reporte: lo recibido sale del teléfono
        pg.evaluate("async id => { const j = await SRP.almacen.uno('jornadas', id); await SRP.activa.cambiarEstatus(j, 'cerrada'); }", jid)
        pg.wait_for_function("() => SRP.cola.ops.length === 0 && !SRP.envio.enviando", timeout=60000)
        pg.evaluate("async id => { const j = await SRP.almacen.uno('jornadas', id); await SRP.reportes.marcarGenerado(j, null); }", jid)
        pg.wait_for_function("() => SRP.cola.ops.length === 0 && !SRP.envio.enviando", timeout=60000); pg.wait_for_timeout(1000)
        local = pg.evaluate("async id => { const r = await SRP.almacen.unoLocal('plantaciones', id); return r ? { conFoto: !!r.foto_base64 } : null; }", aid)
        arbol_srv = leer_bd("SELECT foto_id IS NOT NULL AS tiene_foto_id FROM srp.plantaciones WHERE id = $1", [aid])
        print('vuelta %d: árbol %s · foto %s · cola vacía · la fotografía está en el servidor: %s · el árbol del servidor la espera: %s · en el teléfono: %s'
              % (vuelta, aid, foto_id, bool(en_servidor and en_servidor[0]['n']), arbol_srv, local))
        ctx.close()
    b.close()
