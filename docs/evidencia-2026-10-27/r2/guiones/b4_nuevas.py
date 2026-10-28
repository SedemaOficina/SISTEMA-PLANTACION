"""B4 (y parte de A6) · Las pantallas y ventanas NUEVAS desde la 1.1, con datos de prueba (servidor simulado).

Recorre, con la Coordinación, el cabo de apoyo y la Administración:
  - el formulario «Registrar jornada» con «¿Quién registra en esta jornada?» y su lista de cabos, A TECLADO;
  - la franja con «Cabos de apoyo» y su ventana (abrir con Intro, marcar con Espacio, cerrar con Escape y con «Cerrar»;
    a dónde vuelve el foco);
  - el aviso al cabo de apoyo y «Terminar mi parte»;
  - la ficha de una jornada compartida: «Cabos de apoyo» y «Relevo de cabo»;
  - el filtro «Tipo de jornada» en Registros, Jornadas y Supervisión; la tarjeta «compartida con N cabos»;
  - el detalle del árbol con su calle y «Sustituir»; «Por calle» en Supervisión; la nota de Usuarios.
En cada estado corre axe-core 4.10 (WCAG 2.2 A y AA) y anota el foco, los anuncios y los colores calculados.
Uso: python b4_nuevas.py <url> <salida> <ancho> <alto> <sol|normal> [chromium|webkit]
"""
import json, os, sys, time
from playwright.sync_api import sync_playwright

BASE, SALIDA = sys.argv[1].rstrip('/') + '/', sys.argv[2]
AN, AL, SOL = int(sys.argv[3]), int(sys.argv[4]), sys.argv[5]
MOTOR = sys.argv[6] if len(sys.argv) > 6 else 'chromium'
os.makedirs(SALIDA, exist_ok=True)
ETQ = '%s-%dx%d-%s' % (MOTOR, AN, AL, SOL)
AXE = open(os.path.join('C:' + os.sep, 'sia-rev', 'tmp', 'herr', 'axe', 'package', 'axe.min.js'), encoding='utf-8').read()
AXE_CORRER = """async (sel) => { const r = await axe.run(sel ? document.querySelector(sel) : document,
  { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] }, resultTypes: ['violations'] });
  return r.violations.map(v => [v.id, v.impact, v.nodes.length, v.nodes.slice(0, 3).map(n => n.target.join(' ')).join(' | '), (v.nodes[0] && v.nodes[0].failureSummary || '').slice(0, 220)]); }"""
FOCO = """() => { const e = document.activeElement; if (!e) return null; const s = getComputedStyle(e);
  return { tag: e.tagName.toLowerCase(), id: e.id, texto: (e.getAttribute('aria-label') || e.textContent || '').trim().replace(/\\s+/g, ' ').slice(0, 60),
    pressed: e.getAttribute('aria-pressed'), contorno: s.outlineStyle + ' ' + s.outlineWidth + ' ' + s.outlineColor, sombra: s.boxShadow.slice(0, 60),
    dialogo: e.closest('dialog') ? e.closest('dialog').id : null }; }"""
ANUNCIOS = """() => { window.__anuncios = []; const obs = new MutationObserver(() => {
    document.querySelectorAll('[aria-live], [role=status], [role=alert]').forEach(r => { const t = (r.textContent || '').trim(); if (t && !r.closest('[hidden]') && !window.__anuncios.includes(t.slice(0, 160))) window.__anuncios.push(t.slice(0, 160)); }); });
  obs.observe(document.body, { subtree: true, childList: true, characterData: true }); }"""

res = {'etiqueta': ETQ, 'inicio': time.strftime('%Y-%m-%d %H:%M:%S'), 'pasos': []}
def anota(paso, **k):
    k['paso'] = paso; res['pasos'].append(k); print(paso, json.dumps({x: y for x, y in k.items() if x != 'paso'}, ensure_ascii=False)[:600], flush=True)

with sync_playwright() as p:
    b = getattr(p, MOTOR).launch()
    op = dict(viewport={'width': AN, 'height': AL}, timezone_id='America/Mexico_City', locale='es-MX', bypass_csp=True, service_workers='block')
    if MOTOR == 'chromium':
        op.update(geolocation={'latitude': 19.4326, 'longitude': -99.1332, 'accuracy': 5}, permissions=['geolocation'])
    ctx = b.new_context(**op)
    if SOL == 'normal':
        ctx.add_init_script("try { localStorage.setItem('srp_contraste', 'normal'); } catch (e) {}")
    pg = ctx.new_page(); err = []
    pg.on('pageerror', lambda e: err.append(str(e)[:200]))
    pg.on('console', lambda m: m.type == 'error' and 'net::' not in m.text and 'Failed to load' not in m.text and err.append(m.text[:200]))
    pg.goto(BASE); pg.wait_for_selector('html[data-listo]', state='attached', timeout=60000)
    pg.select_option('#sel-usuario-prueba', 'u-admin-1'); pg.click('#btn-entrar-prueba'); pg.wait_for_function("() => SRP.sesion && SRP.sesion.usuario")
    pg.evaluate("async () => { await SRP.demo.cargar(); }")
    anota('modo sol', atributo=pg.evaluate("document.documentElement.dataset.contraste || null"))

    def axe(sel, nombre):
        if pg.evaluate("typeof axe === 'undefined'"): pg.add_script_tag(content=AXE)
        v = pg.evaluate(AXE_CORRER, sel)
        anota('axe ' + nombre, sel=sel, violaciones=v)
        return v

    def captura(nombre):
        pg.screenshot(path=os.path.join(SALIDA, '%s-%s.png' % (ETQ, nombre)), full_page=False)

    def como(uid):
        pg.evaluate("id => SRP.sesion.iniciar(SRP.ref.usuarioPorId[id])", uid); pg.reload(); pg.wait_for_selector('html[data-listo]', state='attached')
        pg.wait_for_function("id => SRP.sesion && SRP.sesion.usuario && SRP.sesion.usuario.id === id", arg=uid); pg.wait_for_timeout(1500)

    def cerrar_dialogos():
        pg.evaluate("() => document.querySelectorAll('dialog[open]').forEach(d => d.close())")

    def formulario():
        pg.evaluate("SRP.app.mostrarVista('registrar')")
        pg.wait_for_function("() => !document.getElementById('panel-iniciar-jornada').hidden || !document.getElementById('franja-jornada').hidden", timeout=20000)
        if pg.is_hidden('#panel-iniciar-jornada'):
            pg.click('#btn-jornada-cambiar'); pg.wait_for_timeout(250); pg.click('#btn-cambiar-nueva'); pg.wait_for_timeout(400)

    def abrir_filtros(vista):
        pg.evaluate("""v => { const r = document.getElementById('vista-' + v); const b = [...r.querySelectorAll('.btn-filtros')].find(x => x.offsetParent);
          if (b && b.getAttribute('aria-expanded') !== 'true') b.click(); r.querySelectorAll('details.acordeon-filtros').forEach(d => d.open = true); }""", vista)
        pg.wait_for_timeout(400)

    def tab_hasta(pred_js, maximo=60, atras=False):
        """Tabula hasta que el foco cumpla la condición; devuelve cuántas teclas hicieron falta o None."""
        for i in range(maximo):
            pg.keyboard.press('Shift+Tab' if atras else 'Tab')
            if pg.evaluate("() => { const e = document.activeElement; return !!e && (" + pred_js + "); }"): return i + 1
        return None

    # ===== 1. La Coordinación: «¿Quién registra en esta jornada?», a teclado =====
    como('u-coord-1'); cerrar_dialogos()
    # Si quedó un aviso del arranque (p. ej. «tiene una jornada abierta de días anteriores»), se cierra
    formulario(); pg.wait_for_timeout(500)
    anota('formulario: la pregunta se ve', visible=pg.is_visible('#ini-caja-quien'), pressed=pg.eval_on_selector_all('#ini-quien .chip', 'l => l.map(b => [b.textContent.trim(), b.getAttribute("aria-pressed")])'))
    pg.fill('#ini-nombre', 'Prueba de teclado r2'); pg.select_option('#ini-programa', 'p-refor'); pg.fill('#ini-meta', '30')
    if MOTOR == 'chromium':
        pg.click('#btn-ini-detectar'); pg.wait_for_timeout(1200)
    else:
        pg.evaluate("document.getElementById('ini-detalles-coord').open = true")
        pg.fill('#ini-coord-lat', '19.4326'); pg.fill('#ini-coord-lng', '99.1332'); pg.click('#btn-ini-coord-aplicar'); pg.wait_for_timeout(800)
    pg.focus('#btn-ini-hoy'); pg.keyboard.press('Enter'); pg.wait_for_timeout(200)   # «Hoy» con Intro
    anota('teclado: «Hoy» con Intro', foco=pg.evaluate(FOCO), fecha=pg.input_value('#ini-fecha'))
    n = tab_hasta("e.dataset && e.dataset.quien === 'solo'", 10)
    anota('teclado: Tab hasta «Sólo yo»', teclas=n, foco=pg.evaluate(FOCO))
    n2 = tab_hasta("e.dataset && e.dataset.quien === 'varios'", 3)
    anota('teclado: Tab hasta «Varios cabos»', teclas=n2, foco=pg.evaluate(FOCO))
    pg.keyboard.press('Space'); pg.wait_for_timeout(300)
    anota('teclado: Espacio en «Varios cabos»', foco=pg.evaluate(FOCO), lista_visible=pg.is_visible('#ini-caja-apoyos'),
          boton=pg.inner_text('#btn-iniciar-jornada').strip(), chips=pg.eval_on_selector_all('#ini-apoyos .chip', 'l => l.length'))
    captura('01-formulario-varios')
    axe('#panel-iniciar-jornada', 'formulario con «Varios cabos»')
    # Sin marcar a nadie: Intro en «Iniciar jornada compartida» → error, ¿a dónde va el foco?
    n3 = tab_hasta("e.id === 'btn-iniciar-jornada'", 40)
    pg.keyboard.press('Enter'); pg.wait_for_timeout(700)
    anota('teclado: iniciar sin marcar cabos', teclas=n3, foco=pg.evaluate(FOCO),
          error=pg.evaluate("() => { const e = document.getElementById('ini-apoyos-error'); return e ? [!e.hidden, e.textContent.trim().slice(0, 120), e.getAttribute('role'), e.id] : null; }"),
          grupo=pg.evaluate("() => { const g = document.getElementById('ini-apoyos'); return { invalid: g.getAttribute('aria-invalid'), describedby: g.getAttribute('aria-describedby'), errorDescribe: (g.getAttribute('aria-describedby') || '').split(' ').some(id => id && document.getElementById(id) && /Marque/.test(document.getElementById(id).textContent)) }; }"),
          resumen=pg.evaluate("() => { const e = document.getElementById('ini-errores'); return e && !e.hidden ? e.innerText.slice(0, 200) : null; }"))
    captura('02-formulario-error-apoyos')
    axe('#panel-iniciar-jornada', 'formulario con el error de cabos')
    # Marcar dos cabos con el teclado
    pg.focus('#ini-apoyos .chip'); pg.keyboard.press('Space'); pg.wait_for_timeout(150)
    pg.keyboard.press('Tab'); pg.keyboard.press('Space'); pg.wait_for_timeout(150)
    anota('teclado: dos cabos marcados con Espacio', foco=pg.evaluate(FOCO),
          marcados=pg.eval_on_selector_all('#ini-apoyos .chip[aria-pressed="true"]', 'l => l.map(b => b.textContent.trim().slice(0, 40))'),
          error_sigue=pg.evaluate("() => { const e = document.getElementById('ini-apoyos-error'); return e ? !e.hidden : null; }"),
          nombres=pg.eval_on_selector_all('#ini-apoyos .chip', 'l => l.slice(0, 3).map(b => [b.textContent.trim().slice(0, 50), b.getAttribute("aria-label")])'))
    pg.evaluate(ANUNCIOS)
    n4 = tab_hasta("e.id === 'btn-iniciar-jornada'", 40)
    t0 = time.time(); pg.keyboard.press('Enter')
    try: pg.wait_for_selector('#btn-franja-apoyos', state='visible', timeout=45000)
    except Exception: pass
    anota('segundos hasta la franja', segundos=round(time.time() - t0, 1))
    anota('teclado: Intro en «Iniciar jornada compartida»', teclas=n4, foco=pg.evaluate(FOCO), anuncios=pg.evaluate("window.__anuncios"),
          franja=pg.is_visible('#franja-jornada'), dialogos=pg.eval_on_selector_all('dialog[open]', 'l => l.map(d => d.id)'),
          jornada=pg.evaluate("SRP.activa.jornada && [SRP.activa.jornada.id, SRP.permisos.vigentes(SRP.activa.jornada)]"))
    jid = pg.evaluate("SRP.activa.jornada && SRP.activa.jornada.id")
    cerrar_dialogos()
    captura('03-franja-coordinacion')
    axe('#franja-jornada', 'franja de la Coordinación con «Cabos de apoyo»')
    anota('franja: textos', texto=pg.inner_text('#franja-jornada')[:400],
          botones=pg.eval_on_selector_all('#franja-jornada-acciones .btn', 'l => l.filter(b => !b.hidden).map(b => { const r = b.getBoundingClientRect(); return [b.id, b.textContent.trim(), Math.round(r.width) + "x" + Math.round(r.height)]; })'))

    # ===== 2. La ventana «Cabos de apoyo» desde la franja =====
    pg.focus('#btn-franja-apoyos'); pg.keyboard.press('Enter'); pg.wait_for_selector('#dlg-apoyos[open]'); pg.wait_for_timeout(400)
    anota('ventana apoyos: al abrir', foco=pg.evaluate(FOCO), texto=pg.inner_text('#dlg-apoyos-texto')[:200], guardar=pg.inner_text('#btn-apoyos-guardar').strip(),
          chips=pg.eval_on_selector_all('#apoyos-cabos .chip', 'l => l.slice(0, 4).map(b => [b.textContent.trim().slice(0, 60), b.getAttribute("aria-pressed")])'))
    captura('04-ventana-apoyos')
    axe('#dlg-apoyos', 'ventana «Cabos de apoyo» (franja)')
    n5 = tab_hasta("e.closest('#apoyos-cabos') && e.getAttribute('aria-pressed') === 'false'", 30)
    pg.keyboard.press('Space'); pg.wait_for_timeout(200)
    anota('ventana apoyos: Espacio en un cabo', teclas=n5, foco=pg.evaluate(FOCO), guardar=pg.inner_text('#btn-apoyos-guardar').strip())
    pg.keyboard.press('Escape'); pg.wait_for_timeout(400)
    anota('ventana apoyos: Escape', abierta=pg.is_visible('#dlg-apoyos'), foco=pg.evaluate(FOCO),
          dialogos=pg.eval_on_selector_all('dialog[open]', 'l => l.map(d => d.id)'),
          vigentes=pg.evaluate("async id => SRP.permisos.vigentes(await SRP.almacen.uno('jornadas', id))", jid))
    if pg.is_visible('#dlg-confirmar'):
        anota('ventana apoyos: Escape pidió confirmar', texto=pg.inner_text('#dlg-confirmar')[:300], foco=pg.evaluate(FOCO))
        captura('05-apoyos-escape-confirmar')
        pg.keyboard.press('Escape'); pg.wait_for_timeout(300)
        anota('ventana apoyos: segundo Escape', foco=pg.evaluate(FOCO), dialogos=pg.eval_on_selector_all('dialog[open]', 'l => l.map(d => d.id)'))
    cerrar_dialogos(); pg.wait_for_timeout(200)
    pg.focus('#btn-franja-apoyos'); pg.keyboard.press('Enter'); pg.wait_for_selector('#dlg-apoyos[open]'); pg.wait_for_timeout(300)
    pg.focus('#btn-apoyos-cerrar'); pg.keyboard.press('Enter'); pg.wait_for_timeout(400)
    anota('ventana apoyos: «Cerrar» con Intro', abierta=pg.is_visible('#dlg-apoyos'), foco=pg.evaluate(FOCO))
    cerrar_dialogos()

    # ===== 3. El GPS que afina hasta 30 s: la franja del mapa y su anuncio =====
    pg.evaluate("SRP.app.mostrarVista('registrar')"); pg.wait_for_timeout(500)
    if MOTOR == 'chromium' and pg.is_visible('#btn-ubicacion'):
        pg.evaluate(ANUNCIOS)
        pg.click('#btn-ubicacion'); pg.wait_for_timeout(1500)
        anota('GPS: al ubicar', estado=pg.inner_text('#mapa-estado')[:200], vivo=pg.get_attribute('#mapa-estado', 'aria-live'),
              anuncios=pg.evaluate("window.__anuncios"))
        captura('06-gps-afinando')
        axe('#vista-registrar', 'Nuevo registro con el GPS afinando')

    # ===== 4. El cabo de apoyo: el aviso y «Terminar mi parte» =====
    como('u-cabo-1'); t0 = time.time()
    try:
        pg.wait_for_selector('#dlg-confirmar[open]', timeout=20000); aviso = True
    except Exception:
        aviso = False
    anota('cabo de apoyo: segundos hasta el aviso', segundos=round(time.time() - t0, 1))
    anota('cabo de apoyo: el aviso al entrar', visible=aviso, texto=pg.inner_text('#dlg-confirmar')[:500] if aviso else None, foco=pg.evaluate(FOCO),
          rol=pg.get_attribute('#dlg-confirmar', 'role'), etiqueta=pg.get_attribute('#dlg-confirmar', 'aria-labelledby'), describe=pg.get_attribute('#dlg-confirmar', 'aria-describedby'))
    if aviso:
        captura('07-aviso-cabo-apoyo')
        axe('#dlg-confirmar', 'aviso «Jornada compartida» al cabo de apoyo')
        pg.keyboard.press('Enter'); pg.wait_for_timeout(500)
        anota('cabo de apoyo: Intro en «Entendido»', abierto=pg.is_visible('#dlg-confirmar'), foco=pg.evaluate(FOCO))
    cerrar_dialogos()
    pg.evaluate("async id => { SRP.activa.jornada = await SRP.almacen.uno('jornadas', id); SRP.app.mostrarVista('registrar'); await SRP.activa.preparar(); }", jid); pg.wait_for_timeout(1000)
    captura('08-franja-cabo-apoyo')
    axe('#franja-jornada', 'franja del cabo de apoyo')
    anota('cabo de apoyo: franja', texto=pg.inner_text('#franja-jornada')[:400], cerrar=pg.inner_text('#btn-jornada-cerrar').strip())
    pg.focus('#btn-jornada-cerrar'); pg.keyboard.press('Enter'); pg.wait_for_timeout(600)
    abierto = pg.eval_on_selector_all('dialog[open]', 'l => l.map(d => d.id)')
    anota('«Terminar mi parte»: la pregunta', dialogos=abierto, foco=pg.evaluate(FOCO), texto=pg.inner_text('#dlg-confirmar')[:300] if pg.is_visible('#dlg-confirmar') else None)
    if pg.is_visible('#dlg-confirmar'):
        captura('09-terminar-mi-parte')
        axe('#dlg-confirmar', 'pregunta «Terminar mi parte»')
        pg.keyboard.press('Escape'); pg.wait_for_timeout(400)
        anota('«Terminar mi parte»: Escape', foco=pg.evaluate(FOCO), dialogos=pg.eval_on_selector_all('dialog[open]', 'l => l.map(d => d.id)'))

    # ===== 5. Jornadas: la ficha de una compartida, «Cabos de apoyo» y «Relevo de cabo»; el filtro y la tarjeta =====
    como('u-coord-1'); cerrar_dialogos()
    pg.evaluate("SRP.app.mostrarVista('jornadas')"); pg.wait_for_timeout(1500)
    pg.evaluate("() => { const c = document.querySelector('#jornada-atajos .chip[data-atajo=todas]'); if (c) c.click(); }"); pg.wait_for_timeout(800)
    abrir_filtros('jornadas')
    pg.evaluate(ANUNCIOS)
    pg.select_option('#jornada-compartida', 'si'); pg.wait_for_timeout(1200)
    anota('Jornadas: «Tipo de jornada» = compartidas', anuncios=pg.evaluate("window.__anuncios"),
          etiqueta=pg.evaluate("document.querySelector('label[for=jornada-compartida]').textContent"),
          tarjetas=pg.eval_on_selector_all('#lista-jornadas li.jornada', 'l => l.slice(0, 3).map(li => li.innerText.replace(/\\s+/g, " ").slice(0, 160))'))
    captura('10-jornadas-compartidas')
    axe('#vista-jornadas', 'Jornadas con el filtro «Tipo de jornada»')
    # la ficha de la compartida recién abierta
    pg.evaluate("async id => { await SRP.jornadas.abrir(id); }", jid); pg.wait_for_timeout(1500)
    ficha = []
    anota('ficha: el foco al abrir', foco=pg.evaluate(FOCO))
    anota('ficha de la jornada compartida', dialogos=ficha, botones=pg.eval_on_selector_all('.jornada-acciones .btn, #jornada-acciones .btn, [id^=btn-jornada-]', 'l => l.filter(b => !b.hidden && b.offsetParent).map(b => [b.id, b.textContent.trim()])'))
    if pg.is_visible('#btn-jornada-apoyos'):
        captura('11-ficha-compartida')
        axe('#vista-jornadas', 'ficha de la jornada compartida')
        pg.focus('#btn-jornada-apoyos'); pg.keyboard.press('Enter'); pg.wait_for_timeout(600)
        anota('ficha: «Cabos de apoyo» abre', dialogos=pg.eval_on_selector_all('dialog[open]', 'l => l.map(d => d.id)'), foco=pg.evaluate(FOCO))
        axe('#dlg-apoyos', 'ventana «Cabos de apoyo» (ficha)')
        pg.keyboard.press('Escape'); pg.wait_for_timeout(400)
        anota('ficha: Escape en «Cabos de apoyo»', foco=pg.evaluate(FOCO), dialogos=pg.eval_on_selector_all('dialog[open]', 'l => l.map(d => d.id)'))
        if pg.is_visible('#dlg-confirmar'): pg.keyboard.press('Escape'); pg.wait_for_timeout(300)
    if pg.is_visible('#btn-jornada-relevo'):
        pg.focus('#btn-jornada-relevo'); pg.keyboard.press('Enter'); pg.wait_for_timeout(600)
        anota('ficha: «Relevo de cabo» abre', dialogos=pg.eval_on_selector_all('dialog[open]', 'l => l.map(d => d.id)'), foco=pg.evaluate(FOCO),
              texto=pg.inner_text('#dlg-relevo')[:400] if pg.is_visible('#dlg-relevo') else None)
        if pg.is_visible('#dlg-relevo'):
            captura('12-relevo')
            axe('#dlg-relevo', 'ventana «Relevo de cabo»')
            pg.keyboard.press('Escape'); pg.wait_for_timeout(400)
            anota('ficha: Escape en «Relevo»', foco=pg.evaluate(FOCO), dialogos=pg.eval_on_selector_all('dialog[open]', 'l => l.map(d => d.id)'))
    else:
        anota('ficha: «Relevo de cabo» no se ve en la compartida', visible=False)
    cerrar_dialogos()

    # ===== 6. Registros: el filtro; el detalle del árbol con su calle y «Sustituir» =====
    pg.evaluate("SRP.app.mostrarVista('registros')"); pg.wait_for_timeout(1500)
    abrir_filtros('registros')
    pg.select_option('#filtro-compartida', 'si'); pg.wait_for_timeout(1200)
    anota('Registros: «Tipo de jornada»', opciones=pg.eval_on_selector_all('#filtro-compartida option', 'l => l.map(o => o.textContent)'),
          conteo=pg.inner_text('#vista-registros .conteo-lista') if pg.locator('#vista-registros .conteo-lista').count() else None)
    captura('13-registros-compartidas')
    axe('#vista-registros', 'Registros con «Tipo de jornada»')
    # el detalle de un árbol con calle
    aid = pg.evaluate("async () => { const t = (await SRP.almacen.todos('plantaciones')).filter(r => r.estatus === 'activo' && SRP.permisos.puede('registro.sustituir', r)); const a = t.find(r => Object.keys(r).some(k => /calle/.test(k) && r[k])) || t[0]; return a ? [a.id, Object.keys(a).filter(k => /calle/.test(k))] : null; }")
    anota('detalle: árbol elegido', aid=aid)
    pg.evaluate("async id => { const r = await SRP.almacen.uno('plantaciones', id); await SRP.registros.verDetalle(r); }", aid[0] if aid else None); pg.wait_for_timeout(1500)
    if not pg.is_visible('#dlg-detalle'):
        # por la tabla: el primer renglón
        pg.evaluate("() => { const b = document.querySelector('#vista-registros [data-accion=detalle], #vista-registros .tabla tbody tr button, #vista-registros .tabla tbody tr'); if (b) b.click(); }"); pg.wait_for_timeout(1200)
    if pg.is_visible('#dlg-detalle'):
        anota('detalle del árbol', calle=pg.evaluate("() => { const e = document.querySelector('#dlg-detalle .calle-red'); return e ? [e.closest('dd,td,li,div') ? e.closest('dd,td,li,div').innerText.slice(0, 160) : e.textContent, e.dataset.red, getComputedStyle(e).color] : null; }"),
              sustituir=pg.evaluate("() => { const b = document.getElementById('btn-detalle-sustituir'); if (!b || b.hidden) return null; const s = getComputedStyle(b); return [b.textContent.trim(), s.color, s.backgroundColor, s.borderTopColor, s.borderTopWidth]; }"),
              editar=pg.evaluate("() => { const b = document.getElementById('btn-detalle-editar'); if (!b || b.hidden) return null; const s = getComputedStyle(b); return [b.textContent.trim(), s.color, s.backgroundColor, s.borderTopColor]; }"))
        captura('14-detalle-arbol')
        axe('#dlg-detalle', 'detalle del árbol con su calle')
        pg.keyboard.press('Escape'); pg.wait_for_timeout(300)
        anota('detalle: Escape', foco=pg.evaluate(FOCO))
    else:
        anota('detalle del árbol: no abrió', aid=aid)
    cerrar_dialogos()
    # El detalle abierto desde su botón «Ver» en la lista, a teclado: ¿vuelve el foco al botón al cerrar?
    pg.select_option('#filtro-compartida', ''); pg.wait_for_timeout(800)
    hay = pg.evaluate("() => { const b = [...document.querySelectorAll('#vista-registros [data-accion=ver]')].find(x => x.offsetParent); if (!b) return null; b.id = b.id || 'aud-ver-1'; b.focus(); return b.id; }")
    if hay:
        pg.keyboard.press('Enter'); pg.wait_for_timeout(1200)
        anota('detalle desde «Ver»: abre', abierto=pg.is_visible('#dlg-detalle'), foco=pg.evaluate(FOCO))
        pg.keyboard.press('Escape'); pg.wait_for_timeout(400)
        anota('detalle desde «Ver»: Escape', foco=pg.evaluate(FOCO), vuelve=pg.evaluate("id => document.activeElement && document.activeElement.id === id", hay))
        if pg.is_visible('#dlg-detalle') is False:
            pg.focus('#' + hay); pg.keyboard.press('Enter'); pg.wait_for_timeout(1200)
            pg.evaluate("() => { const b = document.querySelector('#dlg-detalle .dialogo-cerrar, #dlg-detalle [aria-label=Cerrar]'); if (b) b.focus(); }"); pg.keyboard.press('Enter'); pg.wait_for_timeout(400)
            anota('detalle desde «Ver»: «Cerrar» con Intro', foco=pg.evaluate(FOCO), vuelve=pg.evaluate("id => document.activeElement && document.activeElement.id === id", hay))
    else:
        anota('detalle desde «Ver»: no hay botón Ver visible', hay=hay)
    cerrar_dialogos()

    # ===== 7. Supervisión: el filtro y «Por calle» =====
    pg.evaluate("SRP.app.mostrarVista('supervision')"); pg.wait_for_timeout(2500)
    abrir_filtros('supervision')
    pg.select_option('#sup-compartida', 'si'); pg.wait_for_timeout(1500)
    anota('Supervisión: «Tipo de jornada»', opciones=pg.eval_on_selector_all('#sup-compartida option', 'l => l.map(o => o.textContent)'))
    axe('#vista-supervision', 'Supervisión con «Tipo de jornada»')
    pg.select_option('#sup-compartida', ''); pg.wait_for_timeout(1500)
    pc = pg.evaluate("() => { const t = document.getElementById('sup-t-calles'); if (!t) return null; const s = t.closest('details, section'); if (s && s.tagName === 'DETAILS') s.open = true; return s ? s.id || s.className : 'sin contenedor'; }")
    pg.wait_for_timeout(500)
    anota('Supervisión: «Por calle»', contenedor=pc, texto=pg.evaluate("() => { const t = document.getElementById('sup-t-calles'); const s = t && (t.closest('details, section')); return s ? s.innerText.slice(0, 600) : null; }"))
    if pc:
        pg.evaluate("() => document.getElementById('sup-t-calles').scrollIntoView()"); pg.wait_for_timeout(300)
        captura('15-supervision-por-calle')
    axe('#vista-supervision', 'Supervisión con «Por calle» abierto')

    # ===== 8. Usuarios: la nota =====
    como('u-admin-1'); cerrar_dialogos()
    pg.evaluate("SRP.app.mostrarVista('usuarios')"); pg.wait_for_timeout(1500)
    anota('Usuarios: la nota', nota=pg.inner_text('#usr-nota-eliminar'), ayuda=pg.evaluate("() => { SRP.usuarios.abrirFormulario(SRP.ref.usuarioPorId['u-coord-1']); return document.getElementById('usr-perfil-ayuda').textContent; }"))
    axe('#dlg-usuario', 'ventana de la cuenta (Coordinación)')
    cerrar_dialogos()
    axe('#vista-usuarios', 'Usuarios')
    res['errores'] = err
    res['fin'] = time.strftime('%Y-%m-%d %H:%M:%S')
    json.dump(res, open(os.path.join(SALIDA, 'b4-%s.json' % ETQ), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    b.close()
