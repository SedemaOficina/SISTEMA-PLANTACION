"""FRENTE 1 · La jornada compartida en campo, con señal intermitente (revisor r6).

Modo real, contra el servicio local, con la aplicación como irá al SIA. Una Coordinación y tres cabos de la misma
institución, cuentas nuevas en cada corrida.

  1. La Coordinación abre, desde «Registrar jornada» con «Varios cabos», la jornada compartida A con los cabos 1 y 2,
     y la B con el cabo 3.
  2. Los tres entran con señal: les llega su jornada. Los cabos 1 y 2 registran un árbol con señal.
  3. Se corta la señal a los tres (context.set_offline). Cada uno registra dos árboles SIN SEÑAL, todavía como cabo
     de apoyo vigente.
  4. La Coordinación, con señal: quita al cabo 1 de A, cierra A y elimina B (B no tiene árboles en el servidor).
  5. Vuelve la señal al cabo 2 (A cerrada) y al cabo 3 (B eliminada).
  6. La Coordinación reabre A. Se vuelve a intentar el envío del cabo 2.
  7. Vuelve la señal al cabo 1 (A abierta, él quitado). La Coordinación lo vuelve a marcar. Se vuelve a intentar.

Al final cuenta, de los árboles capturados cuando el cabo SÍ estaba en la jornada, cuántos llegaron al servidor.

Uso:  set PYTHONUTF8=1 && python evidencia/f1_compartida_sin_senal.py [--auto]
  --auto  al volver la señal no se toca nada: se espera el envío automático (evento «online»). Sin él, se envía
          como la persona, con la función del botón de la pastilla.
"""
import json
import os
import sys
import time

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from comun import *  # noqa
from playwright.sync_api import sync_playwright

AUTO = '--auto' in sys.argv
CORRIDA = time.strftime('%H%M%S')
COORD = cuenta('coord', 'COORDINADOR', CORRIDA)
C1, C2, C3 = (cuenta('cabo%d' % i, 'CABO', CORRIDA) for i in (1, 2, 3))
CUENTAS = [COORD, C1, C2, C3]
obs = {'corrida': CORRIDA, 'modo': 'auto' if AUTO else 'manual'}
checks = []


def ok(cond, texto):
    checks.append(('OK    ' if cond else 'FALLA ') + texto)
    print(checks[-1], flush=True)


def foto(pg, nombre):
    pg.screenshot(path=os.path.join(EVID, 'f1_%s_%s.png' % (CORRIDA, nombre)), full_page=False)


def reconectar(ctx, pg):
    ctx.set_offline(False)
    pg.wait_for_timeout(1500)
    if not AUTO:
        pg.evaluate("() => SRP.envio.enviar({ manual: true })")
    envio_quieto(pg)
    pg.wait_for_timeout(2500)
    envio_quieto(pg)


def reintentar(pg):
    """Lo que haría la persona: tocar la pastilla para enviar otra vez."""
    pg.evaluate("() => SRP.envio.enviar({ manual: true })")
    envio_quieto(pg)


def en_servidor(jornada):
    return apoyo('apoyos', {'id': jornada})


def estado_cabo(pg, nombre):
    d = {'activa': pg.evaluate(ACTIVA), 'cola': pg.evaluate(COLA), 'franja': pg.evaluate(FRANJA), 'aviso': pg.evaluate(AVISO)}
    if d['franja']['ver'] and pg.is_visible('#btn-franja-enviar'):
        try:
            pg.click('#btn-franja-enviar'); pg.wait_for_timeout(1200)
            if pg.evaluate("() => document.getElementById('dlg-rechazos').open"):
                d['revisar'] = pg.evaluate(RECHAZOS)
                foto(pg, nombre + '_revisar')
                pg.evaluate("() => document.getElementById('dlg-rechazos').close()")
        except Exception as e:  # noqa
            d['revisar_error'] = str(e)
    obs[nombre] = d
    return d


def main():
    apoyo('preparar', {'cuentas': CUENTAS})
    servicio, app = arrancar()
    errores = []
    try:
        with sync_playwright() as p:
            b = p.chromium.launch()

            def telefono(c):
                ctx = b.new_context(service_workers='block', geolocation=GEO, permissions=['geolocation'], viewport={'width': 412, 'height': 900})
                pg = ctx.new_page()
                pg.on('pageerror', lambda e: errores.append(c['correo'] + ': ' + str(e)))
                abrir(pg); entrar(pg, c['correo']); esperar_remoto(pg); pg.wait_for_timeout(1500)
                return ctx, pg

            t0 = time.time()
            ctxC, pgC = telefono(COORD)
            obs['coord_entra_s'] = round(time.time() - t0, 1)
            aceptar_avisos(pgC)
            JA = iniciar_jornada(pgC, 'R6 compartida A ' + CORRIDA, [C1['id'], C2['id']])
            esperar_cola(pgC)
            JB = iniciar_jornada(pgC, 'R6 compartida B ' + CORRIDA, [C3['id']])
            esperar_cola(pgC)
            obs['JA'], obs['JB'] = JA, JB
            sA, sB = en_servidor(JA), en_servidor(JB)
            ok(sA['apoyos'] == [[C1['id'], None], [C2['id'], None]] and sB['apoyos'] == [[C3['id'], None]],
               'paso 1: la Coordinación abre A (cabos 1 y 2) y B (cabo 3) desde el formulario y llegan al servidor: %s %s' % (sA, sB))

            # 2. Los cabos entran con señal
            tel = {}
            for nombre, c in (('c1', C1), ('c2', C2), ('c3', C3)):
                ctx, pg = telefono(c)
                avisos = aceptar_avisos(pg)
                tel[nombre] = (ctx, pg)
                obs[nombre + '_al_entrar'] = {'avisos': avisos, 'activa': pg.evaluate(ACTIVA)}
            ok(tel['c1'][1].evaluate("SRP.activa.jornada && SRP.activa.jornada.id") == JA and tel['c3'][1].evaluate("SRP.activa.jornada && SRP.activa.jornada.id") == JB,
               'paso 2: a cada cabo le llega su jornada compartida, activa en Nuevo registro')
            en_linea = {}
            for nombre in ('c1', 'c2'):
                pg = tel[nombre][1]
                en_linea[nombre] = registrar(pg)
                esperar_cola(pg)
            obs['en_linea'] = en_linea
            ok(len(en_servidor(JA)['arboles']) == 2, 'paso 2: los dos árboles con señal llegan a A')
            obs['local_jornada_en_tel_cabo'] = {n: tel[n][1].evaluate("id => SRP.almacen.unoLocal('jornadas', id).then(j => !!j)", j)
                                               for n, j in (('c1', JA), ('c2', JA), ('c3', JB))}

            # 3. Sin señal, dos árboles cada uno, como cabo de apoyo vigente
            sin_senal = {}
            for nombre in ('c1', 'c2', 'c3'):
                ctx, pg = tel[nombre]
                ctx.set_offline(True)
                pg.wait_for_timeout(800)
                sin_senal[nombre] = [registrar(pg), registrar(pg)]
                obs[nombre + '_sin_senal_cola'] = pg.evaluate(COLA)
            obs['sin_senal'] = sin_senal
            ok(all(len([x for x in v if x]) == 2 for v in sin_senal.values()), 'paso 3: cada cabo registra dos árboles sin señal: %s' % sin_senal)
            foto(tel['c2'][1], 'c2_sin_senal')

            # 4. La Coordinación: quita al cabo 1, cierra A, elimina B
            abrir_ficha(pgC, JA)
            pgC.click('#btn-jornada-apoyos'); pgC.wait_for_selector('#dlg-apoyos[open]')
            obs['ventana_apoyos'] = pgC.inner_text('#dlg-apoyos')
            pgC.click('#apoyos-cabos .chip[data-id="%s"]' % C1['id']); pgC.click('#btn-apoyos-guardar')
            esperar_cola(pgC)
            ok(en_servidor(JA)['apoyos'][0] == [C1['id'], 'quitado'], 'paso 4a: la Coordinación quita al cabo 1 de A')
            abrir_ficha(pgC, JA)
            pgC.click('#btn-jornada-estado'); pgC.wait_for_selector('#dlg-confirmar[open]'); pgC.wait_for_timeout(500)
            obs['dialogo_cierre_A'] = dialogo(pgC)
            foto(pgC, 'coord_cierre_A')
            pgC.click('#btn-confirmar-si'); pgC.wait_for_timeout(1500)
            if dialogo(pgC): pgC.click('#btn-confirmar-no'); pgC.wait_for_timeout(800)
            esperar_cola(pgC)
            ok(en_servidor(JA)['estatus'] == 'cerrada', 'paso 4b: la Coordinación cierra A. La ventana decía: %s' % obs['dialogo_cierre_A'])
            abrir_ficha(pgC, JB)
            obs['B_boton_eliminar_visible'] = pgC.is_visible('#btn-jornada-eliminar')
            if obs['B_boton_eliminar_visible']:
                pgC.click('#btn-jornada-eliminar'); pgC.wait_for_selector('#dlg-confirmar[open]'); pgC.wait_for_timeout(400)
                obs['dialogo_eliminar_B'] = dialogo(pgC)
                foto(pgC, 'coord_eliminar_B')
                pgC.click('#btn-confirmar-si'); pgC.wait_for_timeout(1200)
                esperar_cola(pgC)
            ok(en_servidor(JB)['estatus'] is None, 'paso 4c: la Coordinación elimina B, con su cabo de apoyo vigente y dos árboles suyos sin enviar. Botón visible: %s; ventana: %s'
               % (obs['B_boton_eliminar_visible'], obs.get('dialogo_eliminar_B')))

            # 5. Vuelve la señal a los cabos 2 (A cerrada) y 3 (B eliminada)
            ctx2, pg2 = tel['c2']
            reconectar(ctx2, pg2)
            s = en_servidor(JA)
            obs['A_tras_c2_cerrada'] = s
            llegaron_c2 = s['arboles'].count(C2['id'])
            estado_cabo(pg2, 'c2_con_A_cerrada')
            foto(pg2, 'c2_con_A_cerrada')
            ok(llegaron_c2 == 3, 'paso 5: con A cerrada, los dos árboles del cabo 2 capturados sin señal llegan (D334: «se quedan en su teléfono hasta que se reabra»): en el servidor %d de 3; cola: %s'
               % (llegaron_c2, obs['c2_con_A_cerrada']['cola']))
            ctx3, pg3 = tel['c3']
            reconectar(ctx3, pg3)
            estado_cabo(pg3, 'c3_con_B_eliminada')
            foto(pg3, 'c3_con_B_eliminada')
            # «Pasar a otra jornada» desde Revisar: qué le ofrece
            mover = None
            if obs['c3_con_B_eliminada'].get('revisar'):
                pg3.click('#btn-franja-enviar'); pg3.wait_for_timeout(1000)
                b_ = pg3.query_selector('#lista-rechazos button[data-accion="mover"]')
                if b_:
                    b_.click(); pg3.wait_for_timeout(1200)
                    mover = pg3.inner_text('#dlg-mover-jornada') if pg3.is_visible('#dlg-mover-jornada') else None
                    foto(pg3, 'c3_mover')
                    pg3.evaluate("() => document.getElementById('dlg-mover-jornada').close()")
            obs['c3_mover'] = mover
            ok(False, 'paso 5 (informativo): el cabo 3, con B eliminada, ve: %s · al «Pasar a otra jornada»: %s'
               % ([x['porque'] + ' ' + str(x['botones']) for x in obs['c3_con_B_eliminada'].get('revisar', [])], mover))

            # 6. La Coordinación reabre A; el cabo 2 vuelve a intentar
            abrir_ficha(pgC, JA)
            pgC.click('#btn-jornada-estado'); pgC.wait_for_timeout(1500)
            if dialogo(pgC): pgC.click('#btn-confirmar-si'); pgC.wait_for_timeout(800)
            esperar_cola(pgC)
            ok(en_servidor(JA)['estatus'] == 'abierta', 'paso 6: la Coordinación reabre A')
            reintentar(pg2); pg2.wait_for_timeout(2000); reintentar(pg2)
            s = en_servidor(JA)
            llegaron_c2 = s['arboles'].count(C2['id'])
            estado_cabo(pg2, 'c2_tras_reabrir')
            ok(llegaron_c2 == 3, 'paso 6: reabierta A, los árboles del cabo 2 que esperaban llegan: en el servidor %d de 3; cola: %s'
               % (llegaron_c2, obs['c2_tras_reabrir']['cola']))

            # 7. Vuelve la señal al cabo 1, quitado de A (abierta); la Coordinación lo vuelve a marcar
            ctx1, pg1 = tel['c1']
            reconectar(ctx1, pg1)
            s = en_servidor(JA)
            llegaron_c1 = s['arboles'].count(C1['id'])
            estado_cabo(pg1, 'c1_quitado')
            foto(pg1, 'c1_quitado')
            ok(llegaron_c1 == 3, 'paso 7: los dos árboles del cabo 1 capturados sin señal ANTES de que lo quitaran llegan: en el servidor %d de 3; cola: %s'
               % (llegaron_c1, obs['c1_quitado']['cola']))
            # Ya con señal y quitado: ¿su teléfono lo sabe? Intenta registrar otro árbol en A
            otro = registrar(pg1)
            envio_quieto(pg1)
            obs['c1_quitado_con_senal_registra'] = {'guardado': bool(otro), 'activa': pg1.evaluate(ACTIVA)['activa'],
                                                    'cola': [x for x in pg1.evaluate(COLA) if x['registro'] == otro]}
            ok(False, 'paso 7 (informativo): con señal y ya quitado, el teléfono del cabo 1 sigue con A activa y le deja registrar: %s' % obs['c1_quitado_con_senal_registra'])
            abrir_ficha(pgC, JA)
            pgC.click('#btn-jornada-apoyos'); pgC.wait_for_selector('#dlg-apoyos[open]')
            pgC.click('#apoyos-cabos .chip[data-id="%s"]' % C1['id']); pgC.click('#btn-apoyos-guardar')
            esperar_cola(pgC)
            ok(en_servidor(JA)['apoyos'][0] == [C1['id'], None], 'paso 7: la Coordinación vuelve a marcar al cabo 1')
            reintentar(pg1); pg1.wait_for_timeout(2000); reintentar(pg1)
            s = en_servidor(JA)
            llegaron_c1 = s['arboles'].count(C1['id'])
            estado_cabo(pg1, 'c1_vuelto_a_marcar')
            ok(llegaron_c1 == 3, 'paso 7: vuelto a marcar, sus árboles que esperaban llegan: en el servidor %d de 3; cola: %s'
               % (llegaron_c1, obs['c1_vuelto_a_marcar']['cola']))

            # Resumen: de los seis árboles capturados sin señal siendo cabo de apoyo vigente, cuántos llegaron
            final = en_servidor(JA)
            capturados = sum(len(v) for v in sin_senal.values())
            llegados = final['arboles'].count(C1['id']) - 1 + final['arboles'].count(C2['id']) - 1   # menos el de con señal
            obs['final_A'] = final
            obs['resumen'] = {'capturados_sin_senal_vigente': capturados, 'llegados_a_su_jornada': llegados}
            ok(llegados == capturados, 'RESUMEN: de %d árboles capturados sin señal siendo cabo de apoyo vigente, llegaron a su jornada %d' % (capturados, llegados))
            obs['errores_pagina'] = errores[:10]
            for c, pg_ in [(ctxC, pgC)] + list(tel.values()):
                c.close()
            b.close()
    finally:
        guardar_json('f1_%s_%s.json' % (CORRIDA, obs['modo']), {'obs': obs, 'checks': checks})
        servicio.terminate(); app.terminate()
        quitar_cuentas([u['id'] for u in CUENTAS])
    print('\n'.join(checks))


if __name__ == '__main__':
    main()
