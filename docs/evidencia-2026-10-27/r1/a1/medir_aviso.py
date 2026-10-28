"""A1 · Cuánto tarda, con la demostración cargada, (1) el aviso «Jornada compartida» de un cabo de apoyo después de
entrar y (2) la jornada nueva de la Coordinación en quedar activa después de tocar «Iniciar jornada».
Uso: SRP_BASE=http://127.0.0.1:8131/ python evidencia/a1/medir_aviso.py [veces]"""
import os, sys, time, datetime
from playwright.sync_api import sync_playwright
BASE = os.environ.get('SRP_BASE', 'http://127.0.0.1:8131/')
VECES = int(sys.argv[1]) if len(sys.argv) > 1 else 2
HOY = datetime.date.today().isoformat()
with sync_playwright() as p:
    b = p.chromium.launch()
    for k in range(VECES):
        ctx = b.new_context(viewport={'width': 390, 'height': 844}, geolocation={'latitude': 19.4326, 'longitude': -99.1332, 'accuracy': 5},
                            permissions=['geolocation'], timezone_id='America/Mexico_City')
        pg = ctx.new_page(); pg.goto(BASE, timeout=90000); pg.wait_for_selector('html[data-listo]')
        pg.select_option('#sel-usuario-prueba', 'u-admin-1'); pg.click('#btn-entrar-prueba')
        pg.wait_for_function("() => SRP.sesion && SRP.sesion.usuario")
        t = time.time(); pg.evaluate("async () => { await SRP.demo.cargar(); }"); carga = time.time() - t
        # (1) el aviso del cabo de apoyo
        pg.evaluate("id => SRP.sesion.iniciar(SRP.ref.usuarioPorId[id])", 'u-demo-c5'); t = time.time(); pg.reload(); pg.wait_for_selector('html[data-listo]')
        listo = time.time() - t
        pg.wait_for_function("() => document.getElementById('dlg-confirmar').open && document.getElementById('dlg-confirmar-titulo').textContent === 'Jornada compartida'", timeout=60000)
        aviso = time.time() - t
        pg.evaluate("() => document.querySelectorAll('dialog[open]').forEach(d => d.close())")
        # ¿vuelve a salir si se cerró sin «Entendido» (Esc)? Se espera 20 s
        try:
            pg.wait_for_function("() => document.getElementById('dlg-confirmar').open", timeout=20000); vuelve = 'sí, %.1f s después' % (time.time() - t - aviso)
        except Exception: vuelve = 'no en 20 s'
        pg.evaluate("() => document.querySelectorAll('dialog[open]').forEach(d => d.close())")
        # (2) la jornada nueva de la Coordinación
        pg.evaluate("id => SRP.sesion.iniciar(SRP.ref.usuarioPorId[id])", 'u-coord-1'); pg.reload(); pg.wait_for_selector('html[data-listo]'); pg.wait_for_timeout(1200)
        pg.evaluate("() => document.querySelectorAll('dialog[open]').forEach(d => d.close())")
        pg.evaluate("SRP.app.mostrarVista('registrar')")
        pg.wait_for_function("() => !document.getElementById('panel-iniciar-jornada').hidden || !document.getElementById('franja-jornada').hidden", timeout=20000)
        if pg.is_hidden('#panel-iniciar-jornada'):
            pg.click('#btn-jornada-cambiar'); pg.wait_for_timeout(200); pg.click('#btn-cambiar-nueva'); pg.wait_for_timeout(300)
        pg.fill('#ini-nombre', 'Medición %d' % k); pg.fill('#ini-fecha', HOY); pg.select_option('#ini-programa', 'p-refor'); pg.fill('#ini-meta', '10')
        pg.click('#btn-ini-detectar'); pg.wait_for_function("() => !!SRP.activa.punto", timeout=20000)
        print('  aviso %.1f s · vuelve: %s' % (aviso, vuelve), flush=True)
        t = time.time(); pg.click('#btn-iniciar-jornada')
        try:
            pg.wait_for_function("n => SRP.activa.jornada && SRP.activa.jornada.nombre === n", arg='Medición %d' % k, timeout=30000)
        except Exception:
            print('  la jornada no quedó activa en 30 s; errores del formulario:', pg.inner_text('#ini-errores'), '| diálogos:', pg.evaluate("[...document.querySelectorAll('dialog[open]')].map(d => d.id)"), flush=True)
            ctx.close(); continue
        jornada = time.time() - t
        print('corrida %d: demostración %.1f s · página lista %.1f s · aviso «Jornada compartida» %.1f s después de recargar · ¿vuelve tras cerrarlo sin «Entendido»? %s · jornada activa %.2f s después de «Iniciar jornada»'
              % (k + 1, carga, listo, aviso, vuelve, jornada), flush=True)
        ctx.close()
    b.close()
