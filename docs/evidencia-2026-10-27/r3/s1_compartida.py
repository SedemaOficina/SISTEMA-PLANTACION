"""r3 · S1: el flujo de la jornada compartida de la demostración, en teléfono (390×844), modo de prueba.
Rocío (cabo de apoyo) lee el aviso, ve su franja, registra y termina su parte; Estela (Coordinación) abre
«Cabos de apoyo», cierra con pendientes y llega al reporte. Deja capturas en capturas/s1-* y el texto en s1.json."""
import sys
from comun import *

ANCHO = sys.argv[1] if len(sys.argv) > 1 else 'tel'
VP = TEL if ANCHO == 'tel' else ESC
P = 's1-' + ANCHO + '-'
R = {}; err = []
with sync_playwright() as p:
    b = p.chromium.launch(); ctx = contexto(b, VP, acc=5); pg = pagina(ctx, err)
    arrancar(pg); entrar(pg, 'u-admin-1'); cargar_demo(pg)
    # Datos de prueba: su ventana, desde el menú de la cuenta
    pg.evaluate("() => { const d = document.getElementById('dlg-prueba'); if (d && !d.open) d.showModal(); }"); pg.wait_for_timeout(400)
    R['datos_prueba'] = texto(pg, '#dlg-prueba'); foto(pg, P + '00-datos-prueba', completa=False); cerrar_dialogos(pg)
    # La jornada compartida abierta hoy
    R['compartida_hoy'] = pg.evaluate("""async () => { const j = (await SRP.almacen.todos('jornadas')).find(x => SRP.demo.es(x.id) && x.estatus === 'abierta' && x.cabos_apoyo.length);
      return { id: j.id, nombre: j.nombre, fecha: j.fecha, titular: j.cabo_id, apoyos: j.cabos_apoyo }; }""")
    jid = R['compartida_hoy']['id']
    # --- Rocío, cabo de apoyo: el aviso al entrar ---
    como(pg, 'u-demo-c3', cerrar=False); pg.wait_for_timeout(1500)
    R['rocio_aviso'] = dialogo_abierto(pg); foto(pg, P + '01-rocio-aviso', completa=False)
    R['rocio_aviso_carga'] = carga(pg, '#dlg-confirmar')
    if pg.is_visible('#btn-confirmar-si'): pg.click('#btn-confirmar-si'); pg.wait_for_timeout(500)
    R['rocio_tras_entendido'] = dialogo_abierto(pg)
    vista(pg, 'registrar', 2500)
    R['rocio_franja'] = texto(pg, '#franja-jornada'); R['rocio_franja_carga'] = carga(pg, '#franja-jornada')
    R['rocio_activa'] = pg.evaluate("SRP.activa.jornada && SRP.activa.jornada.id")
    foto(pg, P + '02-rocio-registro', completa=True)
    R['rocio_registro_carga'] = carga(pg, '#vista-registrar')
    # Ubicar el árbol: la franja del GPS mientras afina
    pg.click('#btn-ubicacion'); pg.wait_for_timeout(1200)
    R['rocio_gps'] = pg.evaluate("() => [...document.querySelectorAll('#vista-registrar .gps-estado, #vista-registrar [id*=precision], #vista-registrar [id*=gps], #vista-registrar .aviso-gps')].map(e => e.id + ': ' + e.innerText).filter(x => x.trim().length > 3)")
    foto(pg, P + '03-rocio-gps', completa=False)
    # Sitio de plantación
    R['sitio'] = pg.evaluate("() => ({ chips: [...document.querySelectorAll('#sitio-botones .chip')].map(c => c.innerText + '=' + c.getAttribute('aria-pressed')), valor: document.getElementById('campo-sitio').value })")
    pg.click('#sitio-botones .chip:nth-child(2)'); pg.wait_for_timeout(200)
    R['sitio_despues'] = pg.evaluate("() => document.getElementById('campo-sitio').value")
    pg.locator('#sitio-botones').scroll_into_view_if_needed(); foto(pg, P + '04-rocio-sitio', completa=False)
    # Registrar un árbol (especie cualquiera del catálogo)
    esp = pg.evaluate("() => { const e = SRP.ref.especies || (SRP.catalogos && SRP.catalogos.especies) || []; return null; }")
    pg.fill('#campo-especie', 'fresno'); pg.wait_for_timeout(400)
    op = pg.locator('.combo-opcion').first
    if op.count(): op.dispatch_event('mousedown'); pg.wait_for_timeout(200)
    pg.click('#form-plantacion button[type=submit]'); pg.wait_for_timeout(1200)
    R['rocio_al_guardar'] = dialogo_abierto(pg)
    if pg.is_visible('#dlg-resumen'):
        foto(pg, P + '05-rocio-ficha', completa=False); R['rocio_ficha'] = texto(pg, '#dlg-resumen')
        pg.click('#btn-resumen-guardar'); pg.wait_for_timeout(1000)
    R['rocio_aviso_guardado'] = texto(pg, '#aviso')
    R['rocio_franja_2'] = texto(pg, '#franja-jornada')
    # «Terminar mi parte»
    pg.click('#btn-jornada-cerrar'); pg.wait_for_timeout(600)
    R['terminar_dialogo'] = dialogo_abierto(pg); foto(pg, P + '06-terminar', completa=False)
    R['terminar_carga'] = carga(pg, '#dlg-confirmar')
    pg.click('#btn-confirmar-si'); pg.wait_for_timeout(1500)
    R['terminar_aviso'] = texto(pg, '#aviso')
    R['tras_terminar_activa'] = pg.evaluate("SRP.activa.jornada && SRP.activa.jornada.id")
    foto(pg, P + '07-tras-terminar', completa=False)
    # ¿La sigue viendo en Jornadas y en Registros?
    vista(pg, 'jornadas', 2500)
    R['rocio_jornadas'] = pg.evaluate("id => [...document.querySelectorAll('#lista-jornadas .jornada')].filter(x => x.dataset.clave && x.innerText.includes('Evento') || x.dataset.clave === id).map(x => x.innerText).slice(0, 3)", jid)
    # --- Estela, Coordinación: su franja, «Cabos de apoyo», el cierre con pendientes ---
    como(pg, 'u-demo-k1', cerrar=False); R['estela_al_entrar'] = dialogo_abierto(pg); cerrar_dialogos(pg)
    vista(pg, 'registrar', 2500)
    R['estela_franja'] = texto(pg, '#franja-jornada'); R['estela_franja_carga'] = carga(pg, '#franja-jornada')
    foto(pg, P + '08-estela-franja', completa=False)
    pg.click('#btn-franja-apoyos'); pg.wait_for_selector('#dlg-apoyos[open]'); pg.wait_for_timeout(400)
    R['apoyos_dialogo'] = texto(pg, '#dlg-apoyos'); R['apoyos_carga'] = carga(pg, '#dlg-apoyos')
    R['apoyos_alto_visible'] = pg.evaluate("() => { const d = document.getElementById('dlg-apoyos'); const r = d.getBoundingClientRect(); return { alto: Math.round(r.height), scroll: d.scrollHeight, top: Math.round(r.top), guardar_top: Math.round(document.getElementById('btn-apoyos-guardar').getBoundingClientRect().top) }; }")
    foto(pg, P + '09-apoyos', completa=False)
    pg.evaluate("() => { const d = document.getElementById('dlg-apoyos'); d.scrollTop = d.scrollHeight; }"); pg.wait_for_timeout(200)
    foto(pg, P + '09b-apoyos-abajo', completa=False)
    pg.click('#btn-apoyos-cerrar'); pg.wait_for_timeout(300)
    # Cerrar la jornada: pendientes
    pg.click('#btn-jornada-cerrar'); pg.wait_for_timeout(1500)
    R['cerrar_dialogo'] = dialogo_abierto(pg); R['cerrar_carga'] = carga(pg, '#dlg-confirmar')
    foto(pg, P + '10-cerrar-pendientes', completa=False)
    R['cerrar_botones'] = pg.evaluate("() => [...document.querySelectorAll('#dlg-confirmar button')].filter(b => b.offsetParent).map(b => b.innerText + ' [' + b.className + ']')")
    pg.click('#btn-confirmar-si'); pg.wait_for_timeout(2000)
    R['tras_cerrar'] = dialogo_abierto(pg); R['tras_cerrar_aviso'] = texto(pg, '#aviso')
    foto(pg, P + '11-tras-cerrar', completa=False)
    if pg.is_visible('#dlg-cierre'):
        R['cierre_carga'] = carga(pg, '#dlg-cierre')
        pg.fill('#cie-hora', '13:30')
    guardar('s1-' + ANCHO + '.json', R)
    # El reporte: desde la ficha de la jornada, «Generar reporte»
    if not pg.is_visible('#dlg-cierre'):
        cerrar_dialogos(pg)
        pg.evaluate("async id => { const j = await SRP.almacen.uno('jornadas', id); const regs = (await SRP.almacen.todos('plantaciones')).filter(r => r.jornada_id === id && r.estatus === 'activo'); await SRP.reportes.abrir(regs, j.fecha, j.cabo_id, j); }", jid)
        pg.wait_for_timeout(1200)
    R['cierre'] = texto(pg, '#dlg-cierre'); foto(pg, P + '12-cierre', completa=False)
    pg.evaluate("() => { const e = document.getElementById('cie-hora'); if (e && !e.value) e.value = '13:30'; }")
    btn = pg.locator('#dlg-cierre button.btn-primario').last
    R['cierre_boton'] = btn.inner_text() if btn.count() else None
    if btn.count(): btn.click(); pg.wait_for_timeout(2500)
    R['previa'] = texto(pg, '#dlg-previa'); foto(pg, P + '13-previa', completa=False)
    R['previa_html_encabezado'] = pg.evaluate("() => { const d = document.getElementById('dlg-previa'); return d ? d.innerText.slice(0, 1500) : null; }")
    # La descarga del PDF
    try:
        with pg.expect_download(timeout=30000) as dl:
            pg.locator('#dlg-previa button.btn-primario').last.click()
        d = dl.value; ruta = os.path.join(EVID, 'pdf', P + 'reporte.pdf'); os.makedirs(os.path.dirname(ruta), exist_ok=True); d.save_as(ruta)
        R['pdf'] = {'nombre': d.suggested_filename, 'ruta': ruta}
    except Exception as e:
        R['pdf'] = 'sin descarga: ' + str(e)[:200]
    R['errores'] = err
    guardar('s1-' + ANCHO + '.json', R)
    b.close()
print(json.dumps(R, ensure_ascii=False, indent=1)[:12000])
