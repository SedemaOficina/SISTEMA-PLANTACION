"""r3 · S9 (modo real): el árbol que un cabo de apoyo registra sin señal en una compartida que la Coordinación cierra
mientras tanto. ¿Qué le dice la app, qué botones le da y qué pasa cuando la Coordinación la reabre?
Antes: python real_cuentas.py preparar; servicio en 3123 y la copia del SIA en 8123. Uso: python s9_real_cerrada.py [corrida]"""
import sys, subprocess
from comun import *
from real_cuentas import CUENTAS, CLAVES, RAIZ
import s8_real as S   # sólo sus funciones (el guion s8 corre únicamente como principal)
CORRIDA = sys.argv[1] if len(sys.argv) > 1 else '1'
P = 's9-%s-' % CORRIDA
CO, C1, C2 = CUENTAS
R = S.R

def leer_srv(id_):
    r = subprocess.run(['node', 'pruebas/apoyo_servidor.mjs', 'leer'], cwd=RAIZ, input=json.dumps({'id': id_}), capture_output=True, text=True, encoding='utf-8')
    return r.stdout.strip()[:300]

with sync_playwright() as p:
    b = p.chromium.launch()
    cC, pC = S.nuevo(b); S.entrar_real(pC, CO); S.aceptar(pC, 'coord_al_entrar'); vista(pC, 'registrar', 2500)
    if pC.is_hidden('#panel-iniciar-jornada'):
        pC.click('#btn-jornada-cambiar'); pC.wait_for_timeout(400); pC.click('#btn-cambiar-nueva'); pC.wait_for_timeout(600)
    pC.click('#ini-quien .chip[data-quien="varios"]'); pC.wait_for_timeout(300)
    pC.fill('#ini-nombre', 'Cierre con pendiente r3 ' + CORRIDA); pC.fill('#ini-fecha', HOY); pC.select_option('#ini-programa', index=1); pC.fill('#ini-meta', '5')
    pC.click('#btn-ini-detectar'); pC.wait_for_timeout(2500); pC.click('#ini-apoyos .chip[data-id="%s"]' % C2['id'])
    pC.click('#btn-iniciar-jornada'); pC.wait_for_timeout(4000); S.aceptar(pC, 'x'); jid = pC.evaluate("SRP.activa.jornada.id"); R['jornada'] = jid
    pC.wait_for_function("() => SRP.cola.ops.length === 0", timeout=60000)
    c2, p2 = S.nuevo(b, 19.3572, -99.0601); S.entrar_real(p2, C2); p2.wait_for_timeout(3000); S.aceptar(p2, 'cabo2_al_entrar'); vista(p2, 'registrar', 3000)
    if p2.evaluate("SRP.activa.jornada && SRP.activa.jornada.id") != jid:
        p2.click('#btn-jornada-cambiar'); p2.wait_for_timeout(500); p2.click('#lista-jornadas-abiertas button[data-id="%s"]' % jid); p2.wait_for_timeout(1500)
    c2.set_offline(True); p2.wait_for_timeout(500)
    arbol = S.registrar_arbol(p2); R['arbol'] = arbol; R['cola_sin_senal'] = p2.evaluate("() => SRP.cola.ops.length")
    # La Coordinación cierra (con el cabo de apoyo pendiente)
    vista(pC, 'registrar', 2500); pC.click('#btn-jornada-cerrar'); pC.wait_for_timeout(4000); pC.click('#btn-confirmar-si'); pC.wait_for_timeout(3000)
    pC.wait_for_function("() => SRP.cola.ops.length === 0", timeout=60000); cerrar_dialogos(pC)
    # El cabo de apoyo recupera la señal
    c2.set_offline(False); p2.evaluate("() => window.dispatchEvent(new Event('online'))"); p2.wait_for_timeout(8000)
    R['aviso_al_volver'] = texto(p2, '#aviso')
    p2.evaluate("async () => { await SRP.rechazos.abrir(); }"); p2.wait_for_timeout(1200)
    R['revisar'] = texto(p2, '#dlg-rechazos'); R['revisar_botones'] = p2.evaluate("() => [...document.querySelectorAll('#dlg-rechazos button')].filter(b => b.offsetParent).map(b => (b.innerText.trim() || b.getAttribute('aria-label')) + ' [' + b.className + ']')")
    foto(p2, P + 'cabo2-revisar', completa=False); cerrar_dialogos(p2)
    R['srv_arbol_antes_de_reabrir'] = leer_srv(arbol)
    # La Coordinación la reabre desde la ficha de Jornadas
    pC.evaluate("""async id => { SRP.app.mostrarVista('jornadas'); for (let i = 0; i < 75; i++) { const x = SRP.jornadas.lista.find(j => (j.dato || {}).id === id); if (x) { await SRP.jornadas.abrir(x.clave); return; } await new Promise(r => setTimeout(r, 200)); } }""", jid)
    pC.wait_for_timeout(1500)
    btn = pC.locator('#vista-jornadas button', has_text='Reabrir jornada').first
    if btn.count(): btn.click(); pC.wait_for_timeout(1500); S.aceptar(pC, 'coord_reabrir_dialogo')
    pC.wait_for_function("() => SRP.cola.ops.length === 0", timeout=60000); pC.wait_for_timeout(1500)
    R['srv_jornada_tras_reabrir'] = leer_srv(jid)
    # El cabo de apoyo, con señal: recarga y espera
    p2.reload(); p2.wait_for_selector('html[data-listo]', state='attached', timeout=30000); p2.wait_for_function("() => SRP.remoto.estado === 'listo'", timeout=60000); p2.wait_for_timeout(6000)
    S.aceptar(p2, 'cabo2_tras_reabrir_dialogos')
    R['cabo2_tras_reabrir'] = {'aviso': texto(p2, '#aviso'), 'cola': p2.evaluate("() => SRP.cola.ops.length"), 'rechazadas': p2.evaluate("() => SRP.cola.rechazadas().length")}
    p2.evaluate("async () => { await SRP.rechazos.abrir(); }"); p2.wait_for_timeout(1200)
    R['revisar_tras_reabrir_botones'] = p2.evaluate("() => [...document.querySelectorAll('#dlg-rechazos button')].filter(b => b.offsetParent).map(b => (b.innerText.trim() || b.getAttribute('aria-label')) + ' [' + b.className + ']')")
    foto(p2, P + 'cabo2-revisar-tras-reabrir', completa=False)
    R['srv_arbol_final'] = leer_srv(arbol)
    R['errores'] = S.err
    guardar('s9-%s.json' % CORRIDA, R)
    b.close()
print(json.dumps(R, ensure_ascii=False, indent=1))
