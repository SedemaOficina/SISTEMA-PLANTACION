"""r3 · S8: la jornada compartida en MODO REAL (servicio local 3123, app 8123, cuenta del servicio srp_api), en teléfono.
Coordinación r3.coord abre con «Varios cabos» a r3.cabo1 y r3.cabo2. Cabo 1 recibe el aviso, registra y termina su
parte. Cabo 2 recibe la jornada, se queda SIN SEÑAL, recarga (¿sigue la jornada?), registra un árbol sin señal; la
Coordinación cierra; Cabo 2 recupera la señal: ¿qué pasa con su árbol? Antes: python real_cuentas.py preparar.
Uso: python s8_real.py [corrida]"""
import sys, tempfile
from comun import *
from real_cuentas import CUENTAS, CLAVES
BASE_R = 'http://127.0.0.1:8123/'
CORRIDA = sys.argv[1] if len(sys.argv) > 1 else '1'
P = 's8-%s-' % CORRIDA
CLAVE = json.load(open(CLAVES))['clave']
CO, C1, C2 = CUENTAS
R = {}; err = []

def config_real(route):
    r = route.fetch(); t = r.text(); route.fulfill(response=r, body=t.replace('ES_FICTICIO: true,', 'ES_FICTICIO: false,'))

def nuevo(b, lat=19.3570, lng=-99.0600):
    ctx = b.new_context(viewport=TEL, service_workers='allow', timezone_id='America/Mexico_City', geolocation={'latitude': lat, 'longitude': lng, 'accuracy': 6},
                        permissions=['geolocation'], locale='es-MX')
    pg = pagina(ctx, err); pg.goto(BASE_R); pg.wait_for_selector('html[data-listo]', state='attached', timeout=30000)
    pg.evaluate("async () => { await navigator.serviceWorker.ready; }"); pg.reload(); pg.wait_for_selector('html[data-listo]', state='attached', timeout=30000)
    R.setdefault('sw', []).append(pg.evaluate("() => !!navigator.serviceWorker.controller && SRP.CONFIG.ES_FICTICIO"))
    return ctx, pg

def entrar_real(pg, c):
    pg.fill('#acceso-correo', c['correo']); pg.fill('#acceso-clave', CLAVE); pg.click('#form-acceso button[type="submit"]')
    pg.wait_for_function("() => SRP.sesion && SRP.sesion.usuario && SRP.remoto && SRP.remoto.estado === 'listo'", timeout=180000); pg.wait_for_timeout(2500)

def aceptar(pg, clave):
    R[clave] = [d['texto'] for d in dialogo_abierto(pg)]
    for _ in range(3):
        if pg.is_visible('#btn-confirmar-si'): pg.click('#btn-confirmar-si'); pg.wait_for_timeout(700)

def registrar_arbol(pg, maceton=False):
    pg.click('#btn-ubicacion'); pg.wait_for_timeout(1500)
    if maceton: pg.click('#sitio-botones .chip:nth-child(2)')
    pg.fill('#campo-especie', 'fresno'); pg.wait_for_timeout(500)
    pg.locator('.combo-opcion').first.dispatch_event('mousedown'); pg.wait_for_timeout(300)
    pg.click('#form-plantacion button[type=submit]'); pg.wait_for_timeout(1500)
    if pg.is_visible('#dlg-resumen'): pg.click('#btn-resumen-guardar'); pg.wait_for_timeout(1200)
    return pg.evaluate("SRP.formulario.estado.ultimoGuardado")

if __name__ == '__main__':
    with sync_playwright() as p:
        b = p.chromium.launch()
        # ---------- Coordinación abre la compartida desde el formulario ----------
        cC, pC = nuevo(b); entrar_real(pC, CO); aceptar(pC, 'coord_al_entrar')
        vista(pC, 'registrar', 2500)
        if pC.is_hidden('#panel-iniciar-jornada'):
            pC.click('#btn-jornada-cambiar'); pC.wait_for_timeout(400); pC.click('#btn-cambiar-nueva'); pC.wait_for_timeout(600)
        pC.click('#ini-quien .chip[data-quien="varios"]'); pC.wait_for_timeout(400)
        R['coord_cabos_en_lista'] = pC.evaluate("() => document.querySelectorAll('#ini-apoyos .chip').length")
        R['coord_alto_formulario'] = carga(pC, '#panel-iniciar-jornada')
        foto(pC, P + 'coord-varios', completa=True)
        pC.fill('#ini-nombre', 'Evento real r3 ' + CORRIDA); pC.fill('#ini-fecha', HOY)
        pC.select_option('#ini-programa', index=1); pC.fill('#ini-meta', '20')
        pC.click('#btn-ini-detectar'); pC.wait_for_timeout(2500)
        pC.click('#ini-apoyos .chip[data-id="%s"]' % C1['id']); pC.click('#ini-apoyos .chip[data-id="%s"]' % C2['id'])
        pC.click('#btn-iniciar-jornada'); pC.wait_for_timeout(4000)
        R['coord_aviso_inicio'] = texto(pC, '#aviso'); aceptar(pC, 'coord_tras_iniciar')
        jid = pC.evaluate("SRP.activa.jornada && SRP.activa.jornada.id"); R['jornada'] = jid
        pC.wait_for_function("() => SRP.cola && SRP.cola.ops.length === 0", timeout=60000)
        # ---------- Cabo 1: aviso, registra en macetón y termina ----------
        c1, p1 = nuevo(b); entrar_real(p1, C1); p1.wait_for_timeout(3000)
        aceptar(p1, 'cabo1_al_entrar'); vista(p1, 'registrar', 3000)
        R['cabo1_franja'] = texto(p1, '#franja-jornada-texto'); R['cabo1_activa'] = p1.evaluate("SRP.activa.jornada && SRP.activa.jornada.id")
        foto(p1, P + 'cabo1-franja', completa=False)
        R['cabo1_arbol'] = registrar_arbol(p1, maceton=True)
        p1.wait_for_function("() => SRP.cola.ops.length === 0", timeout=60000); p1.wait_for_timeout(1500)
        R['cabo1_detalle_calle'] = p1.evaluate("async id => { const r = await SRP.almacen.uno('plantaciones', id); return r && [r.calle_estado, r.calle, r.sitio_plantacion, r.folio]; }", R['cabo1_arbol'])
        p1.click('#btn-jornada-cerrar'); p1.wait_for_timeout(800); R['cabo1_terminar'] = [d['texto'] for d in dialogo_abierto(p1)]
        p1.click('#btn-confirmar-si'); p1.wait_for_timeout(2500); R['cabo1_aviso_terminar'] = texto(p1, '#aviso')
        p1.wait_for_function("() => SRP.cola.ops.length === 0", timeout=60000)
        # ---------- Cabo 2: recibe, registra con señal; sin señal recarga; con señal vuelve; sin señal registra ----------
        c2, p2 = nuevo(b, 19.3572, -99.0601); entrar_real(p2, C2); p2.wait_for_timeout(3000)
        aceptar(p2, 'cabo2_al_entrar'); vista(p2, 'registrar', 3000)
        if p2.evaluate("SRP.activa.jornada && SRP.activa.jornada.id") != jid:
            p2.click('#btn-jornada-cambiar'); p2.wait_for_timeout(500); p2.click('#lista-jornadas-abiertas button[data-id="%s"]' % jid); p2.wait_for_timeout(1500)
        R['cabo2_activa_con_senal'] = p2.evaluate("SRP.activa.jornada && SRP.activa.jornada.id")
        R['cabo2_arbol_con_senal'] = registrar_arbol(p2)
        p2.wait_for_function("() => SRP.cola.ops.length === 0", timeout=60000); p2.wait_for_timeout(1500)
        R['cabo2_jornada_local_antes'] = p2.evaluate("async id => !!(await SRP.almacen.unoLocal('jornadas', id))", jid)
        c2.set_offline(True)
        p2.reload(); p2.wait_for_selector('html[data-listo]', state='attached', timeout=30000); p2.wait_for_timeout(4000)
        aceptar(p2, 'cabo2_sin_senal_al_recargar'); vista(p2, 'registrar', 3000)
        R['cabo2_sin_senal_tras_recargar'] = {'activa': p2.evaluate("SRP.activa.jornada && SRP.activa.jornada.id"), 'franja': texto(p2, '#franja-jornada-texto'),
                                             'panel_iniciar': p2.is_visible('#panel-iniciar-jornada'), 'abiertas': p2.evaluate("async () => (await SRP.activa.abiertas()).map(j => j.nombre)")}
        foto(p2, P + 'cabo2-sin-senal-recargado', completa=False)
        c2.set_offline(False); p2.reload(); p2.wait_for_selector('html[data-listo]', state='attached', timeout=30000)
        p2.wait_for_function("() => SRP.remoto.estado === 'listo'", timeout=60000); p2.wait_for_timeout(3000); aceptar(p2, 'cabo2_con_senal_otra_vez')
        vista(p2, 'registrar', 3000)
        if p2.evaluate("SRP.activa.jornada && SRP.activa.jornada.id") != jid and p2.is_visible('#btn-jornada-cambiar'):
            p2.click('#btn-jornada-cambiar'); p2.wait_for_timeout(500); p2.click('#lista-jornadas-abiertas button[data-id="%s"]' % jid); p2.wait_for_timeout(1500)
        R['cabo2_activa_con_senal_otra_vez'] = p2.evaluate("SRP.activa.jornada && SRP.activa.jornada.id")
        c2.set_offline(True); p2.wait_for_timeout(800)
        if R['cabo2_activa_con_senal_otra_vez'] == jid:
            R['cabo2_arbol_sin_senal'] = registrar_arbol(p2)
            R['cabo2_cola'] = p2.evaluate("() => SRP.cola.ops.length")
        # ---------- Coordinación cierra con pendientes ----------
        vista(pC, 'registrar', 2500)
        pC.click('#btn-jornada-cerrar'); pC.wait_for_timeout(4000)
        R['coord_cerrar'] = [d['texto'] for d in dialogo_abierto(pC)]; foto(pC, P + 'coord-cerrar', completa=False)
        pC.click('#btn-confirmar-si'); pC.wait_for_timeout(3000); aceptar(pC, 'coord_tras_cerrar')
        pC.wait_for_function("() => SRP.cola.ops.length === 0", timeout=60000)
        R['srv_tras_cerrar'] = pC.evaluate("async id => { const r = await fetch('api/srp/jornadas/' + id, { credentials: 'include' }); return [r.status, (await r.text()).slice(0, 300)]; }", jid)
        # ---------- Cabo 2 recupera la señal ----------
        if R.get('cabo2_arbol_sin_senal'):
            c2.set_offline(False); p2.wait_for_timeout(1000)
            p2.evaluate("() => window.dispatchEvent(new Event('online'))"); p2.wait_for_timeout(8000)
            R['cabo2_tras_senal'] = {'cola': p2.evaluate("() => SRP.cola.ops.length"), 'aviso': texto(p2, '#aviso'), 'dialogos': [d['texto'][:400] for d in dialogo_abierto(p2)],
                                     'arbol': p2.evaluate("async id => { const r = await SRP.almacen.uno('plantaciones', id); return r && { folio: r.folio, estado: r._envio || r.envio || null }; }", R['cabo2_arbol_sin_senal']),
                                     'rechazos': p2.evaluate("() => (SRP.rechazos && SRP.rechazos.lista) ? SRP.rechazos.lista.length : null"),
                                     'conexion': p2.evaluate("() => { const e = document.querySelector('.estado-conexion, #estado-conexion, #btn-conexion'); return e && e.innerText; }")}
            foto(p2, P + 'cabo2-tras-senal', completa=False)
        R['errores'] = err
        guardar('s8-%s.json' % CORRIDA, R)
        b.close()
    print(json.dumps(R, ensure_ascii=False, indent=1))
