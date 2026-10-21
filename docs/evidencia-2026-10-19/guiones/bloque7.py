"""Las propuestas de pantalla del bloque 7, cada una por separado: si una falla o se detiene, las demás se
revisan igual. Sirve para el antes y el después: se corre contra la versión de antes y contra la de ahora.

Uso:  python bloque7.py [dirección]   (por omisión http://127.0.0.1:8099/, la de pruebas/servir.py)
Dice «bien» o «mal» por cada punto y sale con 0 sólo si todos están bien."""
import os, sys, tempfile
from playwright.sync_api import sync_playwright

BASE = sys.argv[1] if len(sys.argv) > 1 else 'http://127.0.0.1:8099/'
ESPERA = 'new Promise(r => setTimeout(r, 300))'
SEMBRAR = """async () => { const u = SRP.ref.usuarioPorId['u-cabo-1'], hoy = SRP.util.fechaHoy(), ahora = SRP.util.ahoraISO();
  for (const [jid, estatus] of [['j7-a', 'abierta'], ['j7-b', 'abierta'], ['j7-c', 'cerrada']]) {
    await SRP.almacen.guardarConBitacora('jornadas', Object.assign({ id: jid, nombre: 'Jornada ' + jid, fecha: hoy, comentarios: '', cabo_id: u.id, estatus,
      fecha_inicio: ahora, fecha_cierre: estatus === 'cerrada' ? ahora : null, encargado_id: u.id, editado_por_id: u.id, fecha_ultima_edicion: ahora,
      arboles_previstos: null, puntos_revisados: [], organizacion_id: u.organizacion_id, programa_id: 'p-refor', lat: 19.36, lng: -99.17 },
      Object.fromEntries(SRP.reportes.CAMPOS.map(x => [x, '']))), null);
    const id = 'a7-' + jid;
    await SRP.almacen.guardarConBitacora('plantaciones', { id, jornada_id: jid, estatus: 'activo', cabo_id: u.id, lat: 19.36, lng: -99.17, punto_origen: 'gps',
      gps_precision_m: 6, alcaldia: 'Benito Juárez', alcaldia_cve: '09014', colonia: null, colonia_cve: null, uga: 'BJU-011',
      capa_version: SRP.derivacion.derivar(19.4326, -99.1332).capa_version, especie_id: 'ESP-0070', especie_otra: '', programa_id: 'p-refor', fecha_plantacion: hoy,
      comentarios: '', foto_id: null, foto_base64: null, fecha_registro: ahora, fecha_ultima_edicion: null, editado_por_id: null, folio: null, organizacion_id: u.organizacion_id },
      SRP.bitacora.entrada('CREADO', 'plantacion', id));
  } }"""
ABRIR_CIERRE = """async (id) => { const j = await SRP.almacen.uno('jornadas', id);
  const regs = (await SRP.almacen.todos('plantaciones')).filter(p => p.jornada_id === id && p.estatus === 'activo');
  await SRP.reportes.abrir(regs, j.fecha, j.cabo_id, { id, dato: j }); }"""


def entrar(pg, quien='u-admin-1'):
    pg.select_option('#sel-usuario-prueba', quien); pg.click('#btn-entrar-prueba'); pg.wait_for_function("() => SRP.sesion && SRP.sesion.usuario")


def p_entrar(pg):
    r = pg.evaluate("""async () => {
      SRP.sesion.autenticar = async () => { throw new DOMException('sin espacio', 'QuotaExceededError'); };
      document.getElementById('acceso-correo').value = 'cabo@ejemplo.local'; document.getElementById('acceso-clave').value = 'una contraseña';
      document.getElementById('form-acceso').requestSubmit(); await new Promise(r => setTimeout(r, 400));
      return [document.getElementById('acceso-errores').hidden, document.getElementById('form-acceso').querySelector('button[type="submit"]').disabled]; }""")
    return r == [False, False], 'recuadro oculto y botón apagado: %s' % r


def usuarios(pg):
    entrar(pg)
    pg.evaluate("""async () => { const base = SRP.ref.usuarios.find(u => u.perfil === 'CABO');
      for (let i = 0; i < 40; i++) { const u = Object.assign({}, base, { id: 'u-pag-' + i, nombre_completo: 'Zz Cuenta ' + String(i).padStart(2, '0') + ' Ejemplo', correo: 'pag' + i + '@ejemplo.local' });
        SRP.ref.usuarios.push(u); SRP.ref.usuarioPorId[u.id] = u; }
      SRP.app.mostrarVista('usuarios'); await """ + ESPERA + """; }""")


def p_paginas(pg):
    usuarios(pg)
    n = pg.evaluate("document.querySelectorAll('#tabla-usuarios tbody tr').length")
    return n == 10, '%d renglones en la primera vista' % n


def p_orden(pg):
    usuarios(pg)
    r = pg.evaluate("""async () => { const th = () => document.querySelector('#tabla-usuarios thead .th-orden[data-col="0"]');
      th().click(); await """ + ESPERA + """; th().click(); await """ + ESPERA + """;
      return document.querySelector('#tabla-usuarios tbody tr .c-titulo').firstChild.textContent.trim(); }""")
    return r == 'Zz Cuenta 39 Ejemplo', 'primero, de la Z a la A: %s' % r


def p_foco(pg):
    usuarios(pg)
    r = pg.evaluate("document.querySelector('#tabla-usuarios thead .th-orden').tabIndex")
    return r == -1, 'el botón de orden escondido, en el orden del teclado (tabindex): %s' % r


def p_estilos(pg):
    r = pg.evaluate("""() => { const caja = document.createElement('div');
      caja.innerHTML = '<div class="pin-num"><span data-tono="rev">1</span></div><table class="sup-tabla sup-tabla-cabos"><tbody><tr><td><button type="button" class="enlace-fila">Cabo</button></td></tr></tbody></table>';
      document.body.appendChild(caja);
      const r = [getComputedStyle(caja.querySelector('.pin-num span')).borderTopColor, getComputedStyle(document.body).color, caja.querySelector('.enlace-fila').getBoundingClientRect().height];
      caja.remove(); return r; }""")
    return r, None


def p_punto(pg):
    r, _ = p_estilos(pg)
    return r[0] == r[1], 'borde del punto por revisar: %s' % r[0]


def p_cabos(pg):
    r, _ = p_estilos(pg)
    return r[2] >= 24, 'alto de los nombres de cabos: %.1f px' % r[2]


def p_jornadas(pg):
    r = pg.evaluate("() => { const s = document.getElementById('lista-jornadas').closest('section'); return [s.getAttribute('aria-label'), s.getAttribute('aria-labelledby')]; }")
    return r[0] == 'Lista de jornadas' and r[1] is None, 'nombre de la sección: %s' % r


def p_demo(pg):
    entrar(pg)
    r = pg.evaluate("""async () => { const ya = SRP.app.confirmar; let q = ''; SRP.app.confirmar = async (o) => { q = o.pregunta; return false; };
      await SRP.demo.alCargar(); SRP.app.confirmar = ya; return q; }""")
    return 'de enero de 2024 a hoy' in r, r


def p_carga(pg):
    entrar(pg)
    carpeta = tempfile.mkdtemp(prefix='srp-b7-'); arch = os.path.join(carpeta, 'dos.csv')
    with open(arch, 'w', encoding='utf-8', newline='') as f:
        f.write('Latitud,Longitud,Nombre científico,Fecha de plantación,Programa,Tipo de institución,Institución\n')
        for i in range(2): f.write('%.6f,-99.070000,Taxodium mucronatum,2024-11-15,Reforestación Urbana,Alcaldía,Iztapalapa\n' % (19.35 + i * 0.0001))
    pg.evaluate("SRP.app.mostrarVista('carga')"); pg.set_input_files('#carga-archivo', arch)
    pg.wait_for_function("() => !document.getElementById('btn-carga-cargar').hidden", timeout=15000)
    r = pg.evaluate("""async () => { const ya = SRP.app.confirmar; let p = []; SRP.app.confirmar = async (o) => { p = o.puntos; return false; };
      await SRP.carga.cargar(); SRP.app.confirmar = ya; return p[0]; }""")
    return r.startswith('Se formará 1 jornada cerrada') and 'marcada como' in r, r


def p_cerrar(pg):
    entrar(pg); pg.evaluate(SEMBRAR)
    r = pg.evaluate("""async () => { const J = SRP.jornadas, ya = SRP.app.confirmar; SRP.app.confirmar = async () => true;
      const cuenta = async (id) => (await SRP.almacen.todos('bitacora')).filter(x => x.entidad_id === id).length;
      SRP.app.mostrarVista('jornadas');
      await J.abrir('j7-b'); let antes = await cuenta('j7-b'); await J.cambiarEstado(); const uno = (await cuenta('j7-b')) - antes;
      await J.abrir('j7-a'); antes = await cuenta('j7-a'); await Promise.all([J.cambiarEstado(), J.cambiarEstado()]); const dos = (await cuenta('j7-a')) - antes;
      SRP.app.confirmar = ya; return [uno, dos]; }""")
    return r[1] == r[0], 'bitácora con un toque y con dos: %s' % r


def p_previa(pg):
    entrar(pg); pg.evaluate(SEMBRAR); pg.evaluate(ABRIR_CIERRE, 'j7-c'); pg.wait_for_selector('#dlg-cierre[open]')
    r = pg.evaluate("""async () => { const cuenta = async () => (await SRP.almacen.todos('bitacora')).filter(x => x.entidad_id === 'j7-c' && /Datos de cierre/.test(x.detalle || '')).length;
      const antes = await cuenta(); await Promise.all([SRP.reportes.aceptar(), SRP.reportes.aceptar()]); return (await cuenta()) - antes; }""")
    return r == 1, 'veces que se guardó el cierre con dos toques: %s' % r


def p_borrador_cierre(pg):
    entrar(pg); pg.evaluate(SEMBRAR); pg.evaluate(ABRIR_CIERRE, 'j7-c'); pg.wait_for_selector('#dlg-cierre[open]')
    pg.fill('#cie-observaciones', 'Suelo compactado'); pg.keyboard.press('Escape'); pg.wait_for_timeout(300)
    pg.reload(); pg.wait_for_selector('html[data-listo]'); pg.wait_for_function("() => SRP.sesion && SRP.sesion.usuario")
    pg.evaluate(ABRIR_CIERRE, 'j7-c'); pg.wait_for_selector('#dlg-cierre[open]')
    r = pg.evaluate("document.getElementById('cie-observaciones').value")
    return r == 'Suelo compactado', 'observaciones al volver: «%s»' % r


def p_borrador_inicio(pg):
    entrar(pg, 'u-cabo-alc')
    pg.evaluate("SRP.app.mostrarVista('registrar')"); pg.wait_for_selector('#panel-iniciar-jornada:not([hidden])')
    pg.fill('#ini-nombre', 'Parque de los Venados'); pg.wait_for_timeout(200)
    pg.reload(); pg.wait_for_selector('html[data-listo]')
    pg.evaluate("SRP.app.mostrarVista('registrar')"); pg.wait_for_selector('#panel-iniciar-jornada:not([hidden])'); pg.wait_for_timeout(300)
    r = pg.evaluate("document.getElementById('ini-nombre').value")
    return r == 'Parque de los Venados', 'nombre al volver: «%s»' % r


PUNTOS = [('«Entrar» sin espacio en el teléfono', p_entrar), ('Usuarios de 10 en 10', p_paginas), ('Orden de toda la lista de Usuarios', p_orden),
          ('Encabezado escondido sin foco', p_foco), ('Borde del punto por revisar', p_punto), ('Nombres de cabos de al menos 24 px', p_cabos),
          ('Nombre fijo de la lista de Jornadas', p_jornadas), ('Datos de demostración «de enero de 2024 a hoy»', p_demo),
          ('Carga masiva con una jornada', p_carga), ('«Cerrar jornada» con doble toque', p_cerrar), ('«Ver vista previa» con doble toque', p_previa),
          ('Datos de cierre que vuelven', p_borrador_cierre), ('«Registrar jornada» que vuelve', p_borrador_inicio)]

malos = 0
with sync_playwright() as p:
    b = p.chromium.launch()
    for nombre, prueba in PUNTOS:
        ctx = b.new_context(viewport={'width': 390, 'height': 844}, timezone_id='America/Mexico_City', service_workers='block')
        pg = ctx.new_page(); pg.goto(BASE); pg.wait_for_selector('html[data-listo]')
        try:
            bien, detalle = prueba(pg)
        except Exception as e:
            bien, detalle = False, 'se detuvo: ' + str(e).split('\n')[0][:120]
        malos += not bien
        print('%-5s %s · %s' % ('bien' if bien else 'MAL', nombre, detalle))
        ctx.close()
    b.close()
print('bien %d de %d' % (len(PUNTOS) - malos, len(PUNTOS)))
sys.exit(1 if malos else 0)
