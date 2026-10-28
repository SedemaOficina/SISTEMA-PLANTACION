"""r3 · S5 (C4): «Atrás», recarga y dos pestañas a mitad de la jornada compartida. Modo de prueba, teléfono, demostración.
 A. Rocío (cabo de apoyo) recibe el aviso y pulsa «Atrás» del navegador en vez de «Entendido»: ¿se vuelve a avisar?
 B. Estela (Coordinación): pestaña 1 con «Cabos de apoyo» abierta y un cabo marcado; pestaña 2 cierra la jornada;
    la pestaña 1 «Usar aquí» y guarda.
 C. Rocío: pestaña 1 en Nuevo registro; pestaña 2 «Terminar mi parte»; la pestaña 1 «Usar aquí»: ¿qué ve?
 D. Recarga con la ventana «Terminar mi parte» abierta.
Uso: python s5_estados.py [corrida]"""
import sys
from comun import *
CORRIDA = sys.argv[1] if len(sys.argv) > 1 else '1'
P = 's5-%s-' % CORRIDA
R = {}; err = []
with sync_playwright() as p:
    b = p.chromium.launch(); ctx = contexto(b, TEL); pg = pagina(ctx, err); arrancar(pg); entrar(pg, 'u-admin-1'); cargar_demo(pg)
    jid = pg.evaluate("async () => (await SRP.almacen.todos('jornadas')).find(x => SRP.demo.es(x.id) && x.estatus === 'abierta' && x.cabos_apoyo.length).id")
    # ---------- A ----------
    vista(pg, 'jornadas', 800)   # deja una entrada en el historial
    como(pg, 'u-demo-c3', cerrar=False); pg.wait_for_timeout(1000)
    R['A_aviso_abierto'] = [d['id'] for d in dialogo_abierto(pg)]
    pg.go_back(); pg.wait_for_timeout(800)
    R['A_tras_atras'] = [d['id'] for d in dialogo_abierto(pg)]; R['A_vista'] = pg.evaluate("SRP.app.vista")
    R['A_visto_guardado'] = pg.evaluate("() => localStorage.getItem('srp_apoyos_vistos_u-demo-c3')")
    vista(pg, 'registros', 1500); vista(pg, 'registrar', 2000)
    R['A_tras_cambiar_vista'] = [d['id'] for d in dialogo_abierto(pg)]
    pg.reload(); pg.wait_for_selector('html[data-listo]', state='attached'); pg.wait_for_timeout(2500)
    R['A_tras_recargar'] = [d['texto'][:80] for d in dialogo_abierto(pg)]
    if pg.is_visible('#btn-confirmar-si'): pg.click('#btn-confirmar-si'); pg.wait_for_timeout(600)
    R['A_visto_tras_entendido'] = pg.evaluate("() => localStorage.getItem('srp_apoyos_vistos_u-demo-c3')"); guardar('s5-%s.json' % CORRIDA, R)
    # ---------- C: dos pestañas de Rocío ----------
    vista(pg, 'registrar', 2500)
    R['C_t1_franja'] = texto(pg, '#franja-jornada-texto')
    R['C_visto_antes_t2'] = pg.evaluate("() => localStorage.getItem('srp_apoyos_vistos_u-demo-c3')")
    pg2 = pagina(ctx, err); pg2.goto(BASE); pg2.wait_for_selector('html[data-listo]', state='attached'); pg2.wait_for_timeout(2500)
    R['C_t2_al_abrir'] = [d['texto'][:90] for d in dialogo_abierto(pg2)]; guardar('s5-%s.json' % CORRIDA, R)
    vista(pg2, 'registrar', 2500)
    R['C_t2_en_registrar'] = [d['texto'][:90] for d in dialogo_abierto(pg2)]
    for _ in range(3):
        if pg2.is_visible('#btn-confirmar-si'): pg2.click('#btn-confirmar-si'); pg2.wait_for_timeout(600)
    R['C_t1_turno'] = pg.is_visible('#dlg-turno'); R['C_t1_turno_texto'] = texto(pg, '#dlg-turno') if R['C_t1_turno'] else None
    foto(pg, P + 'C-pestana1-turno', completa=False)
    pg2.click('#btn-jornada-cerrar'); pg2.wait_for_timeout(600); pg2.click('#btn-confirmar-si'); pg2.wait_for_timeout(1500)
    R['C_t2_aviso'] = texto(pg2, '#aviso')
    pg.bring_to_front()
    if pg.is_visible('#btn-turno-usar'): pg.click('#btn-turno-usar')
    pg.wait_for_selector('html[data-listo]', state='attached'); pg.wait_for_timeout(2500); cerrar_dialogos(pg)
    vista(pg, 'registrar', 2500)
    R['C_t1_tras_usar'] = {'activa': pg.evaluate("SRP.activa.jornada && SRP.activa.jornada.id"), 'franja_visible': pg.is_visible('#franja-jornada'),
                           'panel_iniciar': pg.is_visible('#panel-iniciar-jornada'), 'franja': texto(pg, '#franja-jornada-texto')}
    pg2.close()
    # ---------- B: dos pestañas de Estela ----------
    como(pg, 'u-demo-k1'); vista(pg, 'registrar', 2500)
    pg.click('#btn-franja-apoyos'); pg.wait_for_selector('#dlg-apoyos[open]')
    pg.click('#apoyos-cabos .chip[data-id="u-demo-c4"]'); pg.wait_for_timeout(200)
    R['B_t1_boton'] = texto(pg, '#btn-apoyos-guardar')
    pg2 = pagina(ctx, err); pg2.goto(BASE); pg2.wait_for_selector('html[data-listo]', state='attached'); pg2.wait_for_timeout(2500); cerrar_dialogos(pg2)
    vista(pg2, 'registrar', 2500)
    pg2.click('#btn-jornada-cerrar'); pg2.wait_for_timeout(1500)
    R['B_t2_cerrar'] = [d['texto'] for d in dialogo_abierto(pg2)]
    pg2.click('#btn-confirmar-si'); pg2.wait_for_timeout(2500)
    R['B_t2_estatus'] = pg2.evaluate("async id => (await SRP.almacen.uno('jornadas', id)).estatus", jid)
    pg.bring_to_front()
    R['B_t1_turno'] = pg.is_visible('#dlg-turno'); R['B_t1_apoyos_abierta'] = pg.is_visible('#dlg-apoyos')
    foto(pg, P + 'B-pestana1', completa=False)
    # Sin «Usar aquí», ¿se puede pulsar «Guardar» de la ventana que quedó debajo?
    try:
        pg.click('#btn-apoyos-guardar', timeout=3000); R['B_t1_guardar_sin_turno'] = 'pulsado'
    except Exception as e:
        R['B_t1_guardar_sin_turno'] = 'no se puede pulsar: ' + str(e).split('\n')[0][:120]
    if pg.is_visible('#btn-turno-usar'): pg.click('#btn-turno-usar')
    pg.wait_for_selector('html[data-listo]', state='attached'); pg.wait_for_timeout(2500)
    R['B_t1_tras_usar'] = {'dialogos': [d['id'] for d in dialogo_abierto(pg)], 'vista': pg.evaluate("SRP.app.vista")}
    pg2.close()
    # ---------- D: recarga con «Terminar mi parte» abierta (Yolanda, cabo de apoyo que no ha terminado) ----------
    pg.evaluate("async id => { const j = await SRP.almacen.uno('jornadas', id); j.estatus = 'abierta'; await SRP.almacen.ponerLocal('jornadas', j); }", jid)
    como(pg, 'u-demo-c5', cerrar=False)
    if pg.is_visible('#btn-confirmar-si'): pg.click('#btn-confirmar-si'); pg.wait_for_timeout(400)
    vista(pg, 'registrar', 2500)
    R['D_franja'] = texto(pg, '#franja-jornada-texto')
    if pg.is_visible('#btn-jornada-cerrar'):
        pg.click('#btn-jornada-cerrar'); pg.wait_for_timeout(600)
        R['D_dialogo'] = [d['texto'][:100] for d in dialogo_abierto(pg)]
        pg.reload(); pg.wait_for_selector('html[data-listo]', state='attached'); pg.wait_for_timeout(2500)
        R['D_tras_recargar'] = {'dialogos': [d['texto'][:100] for d in dialogo_abierto(pg)], 'apoyo_vigente': pg.evaluate("async id => SRP.permisos.vigentes(await SRP.almacen.uno('jornadas', id))", jid)}
    R['errores'] = err
    guardar('s5-%s.json' % CORRIDA, R)
    b.close()
print(json.dumps(R, ensure_ascii=False, indent=1))
