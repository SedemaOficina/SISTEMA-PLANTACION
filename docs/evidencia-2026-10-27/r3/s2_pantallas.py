"""r3 · S2: las demás pantallas nuevas o cambiadas, modo de prueba, en teléfono (390×844) o escritorio (1440×900).
- «¿Quién registra en esta jornada?» de la Coordinación (u-coord-1): «Varios cabos», el error y el aviso al iniciar.
- El GPS que afina hasta 30 s (precisión aceptable ±25 m y baja ±45 m), a los 2 s y a los 32 s.
- El relevo: el aviso de Marisol (u-demo-c1) y su franja; la ventana «Relevo de cabo» de la Coordinación (u-demo-k1).
- El detalle de un árbol con calle y «Sustituir árbol»; «Por calle» de Supervisión (u-dir-1).
Uso: python s2_pantallas.py [tel|esc]"""
import sys
from comun import *

ANCHO = sys.argv[1] if len(sys.argv) > 1 else 'tel'
VP = TEL if ANCHO == 'tel' else ESC
P = 's2-' + ANCHO + '-'
R = {}; err = []
with sync_playwright() as p:
    b = p.chromium.launch()
    # ---------- GPS: precisión aceptable y baja ----------
    for acc in (25, 45):
        ctx = contexto(b, VP, acc=acc); pg = pagina(ctx, err); arrancar(pg); entrar(pg, 'u-cabo-1'); pg.wait_for_timeout(800); cerrar_dialogos(pg)
        vista(pg, 'registrar', 1500)
        if pg.is_visible('#panel-iniciar-jornada'):
            pg.fill('#ini-nombre', 'Prueba GPS r3'); pg.fill('#ini-fecha', HOY); pg.select_option('#ini-programa', 'p-refor'); pg.fill('#ini-meta', '5')
            pg.click('#btn-ini-detectar'); pg.wait_for_timeout(1000); pg.click('#btn-iniciar-jornada'); pg.wait_for_timeout(1500); cerrar_dialogos(pg)
        pg.click('#btn-ubicacion'); pg.wait_for_timeout(2000)
        R['gps_%d_2s' % acc] = texto(pg, '#mapa-estado'); R['gps_%d_boton' % acc] = texto(pg, '#btn-ubicacion')
        pg.locator('#mapa-estado').scroll_into_view_if_needed(); foto(pg, P + 'gps-%d-2s' % acc, completa=False)
        R['gps_%d_alto' % acc] = pg.evaluate("() => Math.round(document.getElementById('mapa-estado').getBoundingClientRect().height)")
        pg.wait_for_timeout(30500)
        R['gps_%d_32s' % acc] = texto(pg, '#mapa-estado'); foto(pg, P + 'gps-%d-32s' % acc, completa=False)
        ctx.close()
    # ---------- Datos de demostración en un contexto ----------
    ctx = contexto(b, VP); pg = pagina(ctx, err); arrancar(pg); entrar(pg, 'u-admin-1'); cargar_demo(pg)
    # ---------- «¿Quién registra en esta jornada?» ----------
    como(pg, 'u-coord-1'); vista(pg, 'registrar', 2500)
    if pg.is_hidden('#panel-iniciar-jornada'):
        pg.click('#btn-jornada-cambiar'); pg.wait_for_timeout(300); pg.click('#btn-cambiar-nueva'); pg.wait_for_timeout(500)
    R['quien_inicial'] = texto(pg, '#ini-caja-quien')
    pg.locator('#ini-caja-quien').scroll_into_view_if_needed(); foto(pg, P + 'quien-solo', completa=False)
    R['form_iniciar_carga_solo'] = carga(pg, '#panel-iniciar-jornada')
    pg.click('#ini-quien .chip[data-quien="varios"]'); pg.wait_for_timeout(300)
    R['quien_varios'] = texto(pg, '#ini-caja-quien'); R['form_iniciar_carga_varios'] = carga(pg, '#panel-iniciar-jornada')
    pg.locator('#ini-caja-quien').scroll_into_view_if_needed(); foto(pg, P + 'quien-varios', completa=False)
    R['boton_iniciar'] = texto(pg, '#btn-iniciar-jornada')
    pg.fill('#ini-nombre', 'Evento r3'); pg.fill('#ini-fecha', HOY); pg.select_option('#ini-programa', 'p-refor'); pg.fill('#ini-meta', '40')
    pg.click('#btn-ini-detectar'); pg.wait_for_timeout(1000)
    pg.click('#btn-iniciar-jornada'); pg.wait_for_timeout(700)
    R['quien_error'] = texto(pg, '#ini-errores'); R['quien_error_campo'] = pg.evaluate("() => [...document.querySelectorAll('#ini-caja-quien .error-campo, #ini-caja-quien [id$=error]')].map(e => e.innerText)")
    foto(pg, P + 'quien-error', completa=False)
    pg.click('#ini-apoyos .chip[data-id="u-cabo-1"]'); pg.click('#ini-apoyos .chip[data-id="u-demo-c4"]'); pg.wait_for_timeout(200)
    pg.click('#btn-iniciar-jornada'); pg.wait_for_timeout(1500)
    R['quien_aviso'] = texto(pg, '#aviso'); R['quien_dialogos'] = dialogo_abierto(pg)
    foto(pg, P + 'quien-iniciada', completa=False); cerrar_dialogos(pg)
    R['quien_franja'] = texto(pg, '#franja-jornada')
    # ---------- El relevo ----------
    como(pg, 'u-demo-c1', cerrar=False); pg.wait_for_timeout(1500)
    R['relevo_aviso'] = dialogo_abierto(pg); foto(pg, P + 'relevo-aviso', completa=False)
    if pg.is_visible('#btn-confirmar-si'): pg.click('#btn-confirmar-si'); pg.wait_for_timeout(400)
    cerrar_dialogos(pg); vista(pg, 'registrar', 2500)
    R['relevo_franja'] = texto(pg, '#franja-jornada'); foto(pg, P + 'relevo-franja', completa=False)
    rel = pg.evaluate("async () => { const j = (await SRP.almacen.todos('jornadas')).find(x => SRP.demo.es(x.id) && x.estatus === 'abierta' && (x.relevos || []).length); return j && { id: j.id, nombre: j.nombre, cabo: j.cabo_id, relevo: j.relevo_id }; }")
    R['relevo_jornada'] = rel
    como(pg, 'u-demo-k1'); vista(pg, 'jornadas', 2000)
    pg.evaluate("async id => { SRP.jornadas.actual = id; SRP.jornadas.volverAlDetalle = true; await SRP.jornadas.refrescar(); }", rel['id']); pg.wait_for_timeout(1500)
    R['relevo_ficha'] = texto(pg, '#vista-jornadas'); foto(pg, P + 'relevo-ficha', completa=False)
    R['relevo_botones_ficha'] = pg.evaluate("() => [...document.querySelectorAll('#vista-jornadas button')].filter(b => b.offsetParent && b.innerText.trim()).map(b => b.innerText.trim() + ' [' + b.className + ']')")
    pg.evaluate("async () => { const b = [...document.querySelectorAll('#vista-jornadas button')].find(b => /Relevo/.test(b.innerText) && b.offsetParent); if (b) b.click(); }"); pg.wait_for_timeout(800)
    R['relevo_dialogo'] = texto(pg, '#dlg-relevo') if pg.is_visible('#dlg-relevo') else None
    if R['relevo_dialogo']: foto(pg, P + 'relevo-dialogo', completa=False); R['relevo_dialogo_carga'] = carga(pg, '#dlg-relevo')
    cerrar_dialogos(pg)
    # ---------- Ficha de la compartida como Coordinación (botón «Cabos de apoyo» de la ficha) ----------
    comp = pg.evaluate("async () => { const j = (await SRP.almacen.todos('jornadas')).find(x => SRP.demo.es(x.id) && x.estatus === 'abierta' && x.cabos_apoyo.length); return j.id; }")
    pg.evaluate("async id => { SRP.jornadas.actual = id; SRP.jornadas.volverAlDetalle = true; await SRP.jornadas.refrescar(); }", comp); pg.wait_for_timeout(1500)
    R['compartida_ficha'] = texto(pg, '#vista-jornadas'); foto(pg, P + 'compartida-ficha', completa=True)
    R['compartida_botones_ficha'] = pg.evaluate("() => [...document.querySelectorAll('#vista-jornadas button')].filter(b => b.offsetParent && b.innerText.trim()).map(b => b.innerText.trim() + ' [' + b.className + ']')")
    # ---------- El detalle de un árbol con calle (Coordinación) ----------
    arbol = pg.evaluate("async () => { const a = (await SRP.almacen.todos('plantaciones')).filter(r => r.estatus === 'activo' && r.calle_estado === 'ok' && r.calle_entre_1 && SRP.permisos.puedeEditar(SRP.sesion.usuario, r, SRP.ref.usuarioPorId)); const e = a.find(r => r.calle_esquina) || a[0]; return e && e.id; }")
    R['arbol'] = arbol
    vista(pg, 'registros', 2000)
    pg.evaluate("async id => SRP.registros.verDetalle(await SRP.almacen.uno('plantaciones', id))", arbol); pg.wait_for_timeout(1200)
    if pg.is_visible('#dlg-detalle'):
        R['detalle'] = texto(pg, '#dlg-detalle'); R['detalle_carga'] = carga(pg, '#dlg-detalle')
        foto(pg, P + 'detalle', completa=False)
        pg.evaluate("() => { const d = document.getElementById('dlg-detalle'); d.scrollTop = d.scrollHeight; }"); pg.wait_for_timeout(200); foto(pg, P + 'detalle-abajo', completa=False)
        R['detalle_botones'] = pg.evaluate("() => [...document.querySelectorAll('#dlg-detalle button')].filter(b => b.offsetParent).map(b => { const s = getComputedStyle(b); return (b.innerText.trim() || b.getAttribute('aria-label')) + ' [' + b.className + '] fondo ' + s.backgroundColor + ' letra ' + s.color + ' borde ' + s.borderColor + ' ' + s.borderWidth; })")
    cerrar_dialogos(pg)
    # ---------- Supervisión «Por calle» (Directivo) ----------
    como(pg, 'u-dir-1'); vista(pg, 'supervision', 3000)
    pg.evaluate("document.querySelector('#sup-tipos .chip[data-tipo=todo]').click()"); pg.wait_for_timeout(2000)
    pg.evaluate("SRP.supervision.abrirTodo()"); pg.wait_for_timeout(600)
    R['sup_calles'] = pg.evaluate("() => { const t = document.getElementById('sup-t-calles'); const s = t && (t.closest('details, section') || t.parentElement); return s ? s.innerText.slice(0, 3000) : null; }")
    pg.evaluate("() => { const t = document.getElementById('sup-t-calles'); if (t) t.scrollIntoView(); }"); pg.wait_for_timeout(300)
    foto(pg, P + 'sup-calles', completa=False)
    R['sup_carga'] = carga(pg, '#vista-supervision')
    R['errores'] = err
    guardar('s2-' + ANCHO + '.json', R)
    b.close()
print(json.dumps(R, ensure_ascii=False, indent=1)[:15000])
