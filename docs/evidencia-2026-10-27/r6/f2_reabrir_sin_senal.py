"""FRENTE 2 · El cabo que vuelve a abrir la aplicación sin señal (revisor r6).

Modo real, contra el servicio local, con la aplicación como irá al SIA y su service worker. Tres cabos, cada uno en
su propio «teléfono» con almacenamiento persistente (launch_persistent_context con su carpeta):

  · APOYO: la Coordinación abre una jornada compartida y lo marca como cabo de apoyo.
  · TITULAR: inicia su propia jornada.
  · RELEVO: la Coordinación le pasa en relevo la jornada abierta de otro cabo.

Cada uno: 1) entra con señal y recibe su jornada; 2) registra un árbol con señal y otro sin señal; 3) cierra la
aplicación (se cierra el contexto, la carpeta se conserva); 4) la vuelve a abrir SIN señal (offline=True desde el
arranque). Se anota qué jornada queda activa, qué dice la pantalla y si puede registrar otro árbol en su jornada.

Uso:  set PYTHONUTF8=1 && python evidencia/f2_reabrir_sin_senal.py [--pestana]
  --pestana  en lugar de cerrar el navegador (el contexto), se cierra sólo la pestaña, se corta la señal y se abre otra.
"""
import os
import shutil
import sys
import time

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from comun import *  # noqa
from playwright.sync_api import sync_playwright

CORRIDA = time.strftime('%H%M%S')
PESTANA = '--pestana' in sys.argv
COORD = cuenta('coord', 'COORDINADOR', CORRIDA)
AP, TI, RE, T2 = cuenta('apoyo', 'CABO', CORRIDA), cuenta('titular', 'CABO', CORRIDA), cuenta('relevo', 'CABO', CORRIDA), cuenta('origen', 'CABO', CORRIDA)
CUENTAS = [COORD, AP, TI, RE, T2]
PERFILES = os.path.join(R6, 'tmp', 'perfiles-' + CORRIDA)
obs = {'corrida': CORRIDA, 'modo': 'pestana' if PESTANA else 'contexto'}
checks = []


def ok(cond, texto):
    checks.append(('OK    ' if cond else 'FALLA ') + texto)
    print(checks[-1], flush=True)


def foto(pg, nombre):
    pg.screenshot(path=os.path.join(EVID, 'f2_%s_%s.png' % (CORRIDA, nombre)))


PANTALLA = """() => { const v = document.getElementById('vista-registrar'); const vis = e => e && !e.hidden && e.offsetParent !== null;
  return { activa: SRP.activa.jornada ? SRP.activa.jornada.nombre : null, enLinea: navigator.onLine, remoto: SRP.remoto.estado,
    panelIniciar: vis(document.getElementById('panel-iniciar-jornada')), franjaJornada: vis(document.getElementById('franja-jornada')),
    formulario: vis(document.getElementById('form-plantacion')),
    titulo: (v.querySelector('h2:not([hidden])') || {}).textContent || null,
    texto: v.innerText.replace(/\\s+/g, ' ').slice(0, 400),
    franjaRemoto: [...document.querySelectorAll('.franja-remoto')].filter(f => !f.hidden).map(f => f.textContent.trim().replace(/\\s+/g, ' ')).slice(0, 1),
    jornadasLocales: null, cola: SRP.cola.ops.length }; }"""


def main():
    apoyo('preparar', {'cuentas': CUENTAS})
    servicio, app = arrancar()
    os.makedirs(PERFILES, exist_ok=True)
    errores = []
    try:
        with sync_playwright() as p:
            b = p.chromium.launch()

            def normal(c):
                ctx = b.new_context(service_workers='block', geolocation=GEO, permissions=['geolocation'])
                pg = ctx.new_page()
                abrir(pg); entrar(pg, c['correo']); esperar_remoto(pg); pg.wait_for_timeout(1200); aceptar_avisos(pg)
                return ctx, pg

            def persistente(nombre, offline=False):
                ctx = p.chromium.launch_persistent_context(os.path.join(PERFILES, nombre), geolocation=GEO, permissions=['geolocation'],
                                                           viewport={'width': 412, 'height': 900}, offline=offline)
                pg = ctx.pages[0] if ctx.pages else ctx.new_page()
                pg.on('pageerror', lambda e: errores.append(nombre + ': ' + str(e)))
                return ctx, pg

            # La Coordinación: la compartida con APOYO; el relevo de la jornada de ORIGEN a RELEVO
            ctxC, pgC = normal(COORD)
            JAP = iniciar_jornada(pgC, 'R6 F2 compartida ' + CORRIDA, [AP['id']])
            esperar_cola(pgC)
            ctxO, pgO = normal(T2)
            JRE = iniciar_jornada(pgO, 'R6 F2 de origen ' + CORRIDA)
            esperar_cola(pgO); ctxO.close()
            pgC.evaluate("() => SRP.remoto.cargar()"); esperar_remoto(pgC); pgC.wait_for_timeout(800)
            abrir_ficha(pgC, JRE)
            pgC.click('#btn-jornada-relevo'); pgC.wait_for_selector('#dlg-relevo[open]')
            pgC.select_option('#relevo-quien', RE['id']); pgC.click('#btn-relevo-hacer'); pgC.wait_for_timeout(1200)
            if dialogo(pgC): pgC.click('#btn-confirmar-si'); pgC.wait_for_timeout(800)
            esperar_cola(pgC)
            obs['JAP'], obs['JRE'] = JAP, JRE
            ok(apoyo('apoyos', {'id': JAP})['apoyos'] == [[AP['id'], None]], 'la Coordinación abre la compartida con el cabo de apoyo')

            casos = {}
            for nombre, c in (('apoyo', AP), ('titular', TI), ('relevo', RE)):
                ctx, pg = persistente(nombre)
                abrir(pg); entrar(pg, c['correo']); esperar_remoto(pg); pg.wait_for_timeout(1500)
                avisos = aceptar_avisos(pg)
                if nombre == 'titular':
                    iniciar_jornada(pg, 'R6 F2 propia ' + CORRIDA); esperar_cola(pg)
                jornada = pg.evaluate("SRP.activa.jornada && SRP.activa.jornada.id")
                con = registrar(pg); esperar_cola(pg)
                # El service worker guardó la aplicación
                pg.evaluate("() => navigator.serviceWorker.ready"); pg.wait_for_timeout(1500)
                cache = pg.evaluate("async () => { const k = await caches.keys(); let n = 0; for (const x of k) n += (await (await caches.open(x)).keys()).length; return [k, n]; }")
                ctx.set_offline(True); pg.wait_for_timeout(600)
                sin = registrar(pg)
                antes = {'avisos': [a['titulo'] for a in avisos], 'jornada': jornada, 'con_senal': con, 'sin_senal': sin, 'cache': cache,
                         'local_jornada': pg.evaluate("id => SRP.almacen.unoLocal('jornadas', id).then(j => !!j)", jornada),
                         'pantalla': pg.evaluate(PANTALLA)}
                foto(pg, nombre + '_antes_de_cerrar')
                if PESTANA:
                    # Sólo se cierra la pestaña: el navegador sigue abierto y sin señal; se abre otra
                    pg.close(); ctx.set_offline(True)
                    pg = ctx.new_page(); pg.on('pageerror', lambda e: errores.append(nombre + ': ' + str(e)))
                else:
                    ctx.close()
                    # La vuelve a abrir sin señal
                    ctx, pg = persistente(nombre, offline=True)
                try:
                    abrir(pg)
                except Exception as e:  # noqa
                    antes['error_al_abrir'] = str(e)[:300]
                pg.wait_for_timeout(3000)
                aceptar_avisos(pg)
                pg.evaluate("() => SRP.app.mostrarVista('registrar')"); pg.wait_for_timeout(1200)
                despues = pg.evaluate(PANTALLA)
                despues['local_jornada'] = pg.evaluate("id => SRP.almacen.unoLocal('jornadas', id).then(j => !!j)", jornada)
                despues['arbol_sin_senal_sigue'] = pg.evaluate("id => SRP.almacen.unoLocal('plantaciones', id).then(r => !!r)", sin) if sin else None
                despues['cambiar_jornada'] = None
                if pg.is_visible('#btn-jornada-cambiar'):
                    pg.click('#btn-jornada-cambiar'); pg.wait_for_timeout(600)
                    despues['cambiar_jornada'] = pg.inner_text('#dlg-cambiar-jornada') if pg.is_visible('#dlg-cambiar-jornada') else None
                    pg.keyboard.press('Escape'); pg.wait_for_timeout(300)
                foto(pg, nombre + '_reabierta_sin_senal')
                otro = registrar(pg) if despues['formulario'] or despues['franjaJornada'] else None
                despues['registra_otro'] = bool(otro)
                despues['otro_en_su_jornada'] = pg.evaluate("id => SRP.almacen.unoLocal('plantaciones', id).then(r => r ? r.jornada_id : null)", otro) == jornada if otro else False
                casos[nombre] = {'antes': antes, 'despues': despues}
                ok(despues['activa'] is not None and despues['otro_en_su_jornada'],
                   '%s: reabierta sin señal, su jornada sigue activa y registra otro árbol en ella: activa=%s, formulario=%s, panel «Registrar jornada»=%s, registró=%s'
                   % (nombre, despues['activa'], despues['formulario'], despues['panelIniciar'], despues['registra_otro']))
                ctx.close()
            obs['casos'] = casos
            obs['errores_pagina'] = errores[:10]
            ctxC.close()
            b.close()
    finally:
        guardar_json('f2_%s.json' % CORRIDA, {'obs': obs, 'checks': checks})
        servicio.terminate(); app.terminate()
        quitar_cuentas([u['id'] for u in CUENTAS])
        shutil.rmtree(PERFILES, ignore_errors=True)
    print('\n'.join(checks))


if __name__ == '__main__':
    main()
