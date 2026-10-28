"""A1 · Depura el tramo 84: arma un guion con la cabecera de pruebas/prueba.py y los renglones del tramo hasta la
comprobación que falla (7705), y escribe el estado de la jornada que abrió la Coordinación.
Uso: SRP_BASE=http://127.0.0.1:8131/ python evidencia/a1/depurar_84.py"""
import os, subprocess, sys, tempfile
RAIZ = r'C:\sia-rev\tmp\aud1027\r1'
L = open(os.path.join(RAIZ, 'pruebas', 'prueba.py'), encoding='utf-8').read().split('\n')
cab = [k for k, l in enumerate(L) if l.strip() == 'b.new_context = _contexto'][0] + 1
ini = [k for k, l in enumerate(L) if l.startswith('    # ---------- ctx101:')][0]
fin = [k for k, l in enumerate(L) if "«Cabos de apoyo» ocupa el lugar de «Relevo de cabo»')" in l][0]
extra = '''
    import time as _tt; _t0 = _tt.time()
    pg101.wait_for_function("() => SRP.activa.jornada && SRP.activa.jornada.nombre === 'Evento masivo de prueba'", timeout=60000)
    print('ESPERA_JORNADA_S (después de iniciar_jornada)', round(_tt.time() - _t0, 2))
    jid101 = pg101.evaluate("SRP.activa.jornada.id")
    pg101.evaluate("async id => { SRP.app.mostrarVista('jornadas'); await SRP.jornadas.abrir(id); }", jid101); pg101.wait_for_timeout(1500)
    print('CON_ESPERA apoyos visible:', pg101.is_visible('#btn-jornada-apoyos'), 'relevo oculto:', pg101.is_hidden('#btn-jornada-relevo'))
    est = pg101.evaluate("""async id => { const j = id ? await SRP.almacen.uno('jornadas', id) : null; const u = SRP.sesion.usuario;
      return { jid: id, jornada: j && { cabo_id: j.cabo_id, estatus: j.estatus, organizacion_id: j.organizacion_id, cabos_apoyo: j.cabos_apoyo },
        usuario: u.id, perfil: u.perfil, permisos: SRP.permisos.de(u), compartir: j && SRP.permisos.puede('jornada.compartir', j), relevo: j && SRP.permisos.puede('jornada.relevo', j),
        guardada: SRP.jornadas.guardada && SRP.jornadas.guardada.id, vista: SRP.app.vista, activa: SRP.activa.jornada && SRP.activa.jornada.id,
        errores: document.getElementById('ini-errores') && document.getElementById('ini-errores').innerText, panel: !document.getElementById('panel-iniciar-jornada').hidden,
        apoyosOculto: document.getElementById('btn-jornada-apoyos').hidden, relevoOculto: document.getElementById('btn-jornada-relevo').hidden,
        dialogos: [...document.querySelectorAll('dialog[open]')].map(d => d.id) }; }""", jid101)
    import json as _j; print('ESTADO', _j.dumps(est, ensure_ascii=False, indent=1))
    b.close()
'''
texto = '__file__ = ' + repr(os.path.join(RAIZ, 'pruebas', 'prueba.py')) + '\n' + '\n'.join(L[:cab]) + '\n' + '\n'.join(L[ini:fin + 1]) + extra
g = os.path.join(tempfile.gettempdir(), 'depurar_84.py'); open(g, 'w', encoding='utf-8').write(texto)
p = subprocess.run([sys.executable, g], capture_output=True, text=True, encoding='utf-8', errors='replace', cwd=RAIZ)
print(p.stdout[-6000:]); print(p.stderr[-3000:])
