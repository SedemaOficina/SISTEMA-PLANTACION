"""A1 · Arma evidencia/a1/ajustada/pruebas/prueba.py: la prueba de la 1.4.2 con sólo tres esperas cambiadas, para ver si
los tramos 8, 84 y 85 pasan al esperar lo que tarda la aplicación en vez de un tiempo fijo. No cambia ninguna
comprobación.
  1. iniciar_jornada espera a que la jornada nueva quede activa (antes: 0.8 s fijos).
  2. como102 (tramo 85) espera hasta 8 s el aviso «Jornada compartida» o «Relevo de cabo» y lo acepta con «Entendido»
     (antes: cerraba las ventanas a los 1.2 s, y el aviso llega a los 4 s).
  3. entrar21 (tramo 8) igual: espera hasta 8 s el aviso (antes: 3 vueltas de 0.4 s tras 0.9 s).
Uso: python evidencia/a1/ajustar_prueba.py; luego python evidencia/a1/ajustada/pruebas/por_tramos.py --solo 8,84,85"""
import os, shutil
R = r'C:\sia-rev\tmp\aud1027\r1'
D = os.path.join(R, 'evidencia', 'a1', 'ajustada', 'pruebas')
shutil.copy(os.path.join(R, 'pruebas', 'por_tramos.py'), D)
s = open(os.path.join(R, 'pruebas', 'prueba.py'), encoding='utf-8').read()
def cambiar(viejo, nuevo):
    global s
    assert s.count(viejo) == 1, viejo[:80]
    s = s.replace(viejo, nuevo)
cambiar("""    pg.click('#btn-iniciar-jornada'); fecha_correcta(pg); pg.wait_for_timeout(500)
    return pg.evaluate("SRP.activa.jornada && SRP.activa.jornada.id")""",
"""    pg.click('#btn-iniciar-jornada'); fecha_correcta(pg)
    try: pg.wait_for_function("n => SRP.activa.jornada && SRP.activa.jornada.nombre === n", arg=nombre, timeout=20000)   # AJUSTE 1
    except Exception: pass
    return pg.evaluate("SRP.activa.jornada && SRP.activa.jornada.id")""")
AVISO = """
    def _aceptar_aviso(pagina, ms=8000):   # AJUSTE 2 y 3: el aviso del cabo de apoyo o del relevo llega unos 4 s después de entrar
        try: pagina.wait_for_function("() => document.getElementById('dlg-confirmar').open && ['Jornada compartida', 'Relevo de cabo'].includes(document.getElementById('dlg-confirmar-titulo').textContent)", timeout=ms)
        except Exception: return
        pagina.click('#btn-confirmar-si'); pagina.wait_for_timeout(400)
"""
cambiar("""        pg102.wait_for_function("id => SRP.sesion && SRP.sesion.usuario && SRP.sesion.usuario.id === id", arg=uid); pg102.wait_for_timeout(1200)
        pg102.evaluate("() => document.querySelectorAll('dialog[open]').forEach(d => d.close())")""",
"""        pg102.wait_for_function("id => SRP.sesion && SRP.sesion.usuario && SRP.sesion.usuario.id === id", arg=uid); pg102.wait_for_timeout(1200)
        _aceptar_aviso(pg102)
        pg102.evaluate("() => document.querySelectorAll('dialog[open]').forEach(d => d.close())")""")
cambiar("""        for _ in range(3):
            if pg21.evaluate("document.getElementById('dlg-confirmar').open && ['Jornada compartida', 'Relevo de cabo'].includes(document.getElementById('dlg-confirmar-titulo').textContent)"):
                pg21.click('#btn-confirmar-si'); pg21.wait_for_timeout(400)""",
"""        _aceptar_aviso(pg21); _aceptar_aviso(pg21, 1500)""")
# La función va en la cabecera (antes de «b.new_context = _contexto»), que por_tramos.py copia a cada tramo
cambiar("    b.new_context = _contexto\n", AVISO + "    b.new_context = _contexto\n")
# 4. Tramo 84: tras «Guardar» en «Cabos de apoyo», la ficha se repinta con toda la lista (refrescar): se espera a que diga «compartida»
cambiar("""    pg101.click('#btn-apoyos-guardar'); pg101.wait_for_timeout(1200)""",
"""    pg101.click('#btn-apoyos-guardar'); pg101.wait_for_timeout(1200)
    try: pg101.wait_for_function("() => document.getElementById('jornada-sub').innerText.includes('compartida')", timeout=20000)   # AJUSTE 4
    except Exception: pass""")
# 5. Tramo 84: Usuarios se pinta después de leer la lista: se espera a la tabla
cambiar("""    pg101.evaluate("SRP.app.mostrarVista('usuarios')"); pg101.wait_for_timeout(1500)""",
"""    pg101.evaluate("SRP.app.mostrarVista('usuarios')"); pg101.wait_for_timeout(1500)
    try: pg101.wait_for_selector('#tabla-usuarios .c-resumen', timeout=20000)   # AJUSTE 5
    except Exception: pass""")
open(os.path.join(D, 'prueba.py'), 'w', encoding='utf-8').write(s)
print('listo:', os.path.join(D, 'prueba.py'))
