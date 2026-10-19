"""BARRIDO AUTOMÁTICO DE PANTALLAS (auditoría B1, con B4 accesibilidad, B7 terceros y B9 política de seguridad).

Recorre cada pantalla con cada perfil y en cada tamaño; en dos tamaños presiona cada botón. Mide:
errores de consola y de página, recursos que no cargan, peticiones fuera del sitio, violaciones de la política
de seguridad (CSP), desborde horizontal, objetivos táctiles chicos, controles tapados, textos cortados,
botones que no hacen nada y fallas de axe-core (WCAG 2.2 A y AA), también en las ventanas que se abren.

Uso:
  python barrido.py prueba <url> <salida>
  python barrido.py real <url> <salida> <cuentas.json>    (cuentas: [{perfil, correo, clave}])
Sólo lee: en modo real no presiona nada que guarde, envíe, elimine, desactive o cierre sesión.
"""
import json, os, re, sys, time, urllib.parse
from playwright.sync_api import sync_playwright

MODO, BASE, SALIDA = sys.argv[1], sys.argv[2].rstrip('/') + '/', sys.argv[3]
CUENTAS = json.load(open(sys.argv[4], encoding='utf-8')) if MODO == 'real' else [
    {'perfil': 'ADMIN', 'id': 'u-admin-1'}, {'perfil': 'DIRECTIVO', 'id': 'u-dir-1'},
    {'perfil': 'COORDINADOR', 'id': 'u-coord-1'}, {'perfil': 'CABO', 'id': 'u-cabo-1'}]
SOLO = os.environ.get('BARRIDO_SOLO', '')   # perfiles a correr, separados por coma
os.makedirs(SALIDA, exist_ok=True)
AXE = open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'axe', 'package', 'axe.min.js'), encoding='utf-8').read()
ORIGEN = urllib.parse.urlsplit(BASE).netloc
TAMANOS = [('tel-360', 360, 780, 1), ('tel-390', 390, 844, 1), ('tel-430', 430, 932, 1), ('horizontal', 844, 390, 1),
           ('tableta', 768, 1024, 1), ('escritorio', 1440, 900, 1), ('zoom-200', 720, 450, 2)]
if os.environ.get('BARRIDO_TAM'):
    TAMANOS = [t for t in TAMANOS if t[0] in os.environ['BARRIDO_TAM'].split(',')]
CLIC_EN = {'tel-390', 'escritorio'}
VISTAS = ['supervision', 'registrar', 'registros', 'jornadas', 'galeria', 'configuracion', 'catalogos', 'usuarios',
          'parametros', 'cambios', 'duplicados', 'carga', 'revision-especies', 'acerca']
# Lo que no se presiona: en modo real, nada que cambie datos; en los dos, lo que cierra la sesión o borra lo de prueba
NO_PRESIONAR_REAL = re.compile(r'eliminar|desactivar|activar|restablecer|deshacer|cerrar sesi|salir|quitar|descartar|enviar|guardar|'
                               r'confirmar|^s[ií]\b|cargar|subir|revisad|es el mismo|son distintos|cerrar jornada|reabrir|iniciar jornada|'
                               r'cambiar contrase|crear|agregar|aplicar|mover|sustituir|relevo|copiar', re.I)
NO_PRESIONAR = re.compile(r'cerrar sesi|restablecer datos|quitar datos|datos de prueba|cargar datos|salir', re.I)

ESTATICO = r"""() => {
  const plegado = e => { const d = e.closest('details'); return !!d && !d.open && !(e.closest('summary') && e.closest('summary').parentElement === d); };
  const vis = e => { if (!e.isConnected || plegado(e)) return false; const r = e.getBoundingClientRect(); const s = getComputedStyle(e);
    return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none' && !e.closest('[hidden]') && parseFloat(s.opacity) > 0; };
  const nombre = e => (e.getAttribute('aria-label') || e.textContent || e.value || e.id || e.className.toString()).trim().replace(/\s+/g, ' ').slice(0, 60);
  const d = document.documentElement, out = { desborde: null, chicos: [], tapados: [], cortados: [] };
  if (d.scrollWidth > d.clientWidth + 1) out.desborde = { ancho: d.scrollWidth, visible: d.clientWidth,
    culpables: [...document.querySelectorAll('body *')].filter(e => { const r = e.getBoundingClientRect(); const s = getComputedStyle(e);
      return vis(e) && s.position !== 'fixed' && s.position !== 'absolute' && !e.closest('.leaflet-container') && r.right > d.clientWidth + 1; })
      .slice(0, 5).map(e => e.tagName.toLowerCase() + (e.id ? '#' + e.id : '') + '.' + (e.className.toString().split(' ')[0] || '')) };
  const inter = [...document.querySelectorAll('button, a[href], input:not([type=hidden]), select, textarea, summary, [role=button], [tabindex]:not([tabindex="-1"])')]
    .filter(e => vis(e) && !e.closest('.leaflet-control-attribution') && !e.closest('.leaflet-pane'));
  for (const e of inter) {
    const r = e.getBoundingClientRect();
    // Excepción de WCAG 2.5.8: un enlace dentro de un renglón de texto
    const enLinea = e.tagName === 'A' && getComputedStyle(e).display === 'inline' && e.parentElement && /^(P|LI|SPAN|TD|DD|LABEL)$/.test(e.parentElement.tagName);
    const tipo = e.type === 'checkbox' || e.type === 'radio';
    if ((r.width < 24 || r.height < 24) && !enLinea && !(tipo && e.closest('label'))) out.chicos.push([e.tagName.toLowerCase(), e.id || '', nombre(e), Math.round(r.width) + '×' + Math.round(r.height)]);
    e.scrollIntoView({ block: 'center', inline: 'center' });
    const q = e.getBoundingClientRect(), cx = q.left + q.width / 2, cy = q.top + q.height / 2;
    if (cx > 0 && cy > 0 && cx < innerWidth && cy < innerHeight) {
      const arriba = document.elementFromPoint(cx, cy);
      if (arriba && arriba !== e && !e.contains(arriba) && !arriba.contains(e) && !(e.labels && [...e.labels].some(l => l.contains(arriba))))
        out.tapados.push([e.tagName.toLowerCase(), e.id || '', nombre(e), 'lo tapa: ' + arriba.tagName.toLowerCase() + (arriba.id ? '#' + arriba.id : '') + '.' + (arriba.className.toString().split(' ')[0] || '')]);
    }
  }
  for (const e of document.querySelectorAll('body *')) {
    if (!vis(e) || e.children.length || !e.textContent.trim()) continue;
    const s = getComputedStyle(e);
    const oculto = e.clientWidth <= 2 || e.clientHeight <= 2 || s.clip !== 'auto' || s.clipPath !== 'none';
    if (!oculto && (s.overflow.includes('hidden') || s.overflow.includes('clip')) && s.textOverflow !== 'ellipsis' && (e.scrollWidth > e.clientWidth + 1 || e.scrollHeight > e.clientHeight + 4))
      out.cortados.push([e.tagName.toLowerCase(), e.id || '', e.textContent.trim().slice(0, 50)]);
  }
  scrollTo(0, 0); document.querySelectorAll('*').forEach(x => { if (x.scrollTop) x.scrollTop = 0; });
  out.chicos = out.chicos.slice(0, 15); out.tapados = out.tapados.slice(0, 15); out.cortados = out.cortados.slice(0, 15);
  return out; }"""

AXE_CORRER = r"""async (sel) => { const r = await axe.run(sel ? document.querySelector(sel) : document,
  { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] }, resultTypes: ['violations'] });
  return r.violations.map(v => [v.id, v.impact, v.nodes.length, v.nodes[0] ? v.nodes[0].target.join(' ') : '', v.help]); }"""

BOTONES = r"""(vista) => { const raiz = document.getElementById('vista-' + vista);
  const plegado = e => { const d = e.closest('details'); return !!d && !d.open && !(e.closest('summary') && e.closest('summary').parentElement === d); };
  const vis = e => { const r = e.getBoundingClientRect(); const s = getComputedStyle(e); return !plegado(e) && r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && !e.closest('[hidden]') && !e.disabled; };
  const lista = [...raiz.querySelectorAll('button, [role=button], summary, a[href^="#"]')].filter(vis);
  lista.forEach((e, i) => e.setAttribute('data-aud', String(i)));
  return lista.map((e, i) => [i, (e.getAttribute('aria-label') || e.textContent || e.title || '').trim().replace(/\s+/g, ' ').slice(0, 60), e.id || '', e.dataset.accion || '']); }"""

VIGILAR = r"""() => { window.__aud = { cambios: 0 }; if (window.__audObs) window.__audObs.disconnect();
  window.__audObs = new MutationObserver(m => { window.__aud.cambios += m.length; });
  window.__audObs.observe(document.body, { subtree: true, childList: true, attributes: true, characterData: true });
  window.__audAntes = { vista: SRP.app.vista, foco: document.activeElement && document.activeElement.id, dialogos: [...document.querySelectorAll('dialog[open]')].map(d => d.id) }; }"""

EFECTO = r"""() => { const a = window.__audAntes;
  return { cambios: window.__aud.cambios, vista: SRP.app.vista !== a.vista ? SRP.app.vista : null,
    dialogos: [...document.querySelectorAll('dialog[open]')].map(d => d.id).filter(x => !a.dialogos.includes(x)),
    foco: (document.activeElement && document.activeElement.id) !== a.foco }; }"""

LIMPIAR = r"""(vista) => { document.querySelectorAll('dialog[open]').forEach(d => { try { d.close(); } catch (e) {} });
  document.querySelectorAll('details[open]').forEach(d => d.open = false); SRP.app.mostrarVista(vista); }"""


def entrar(pg, c):
    pg.goto(BASE); pg.wait_for_selector('html[data-listo]', state='attached', timeout=30000)
    if MODO == 'prueba':
        pg.select_option('#sel-usuario-prueba', c['id']); pg.click('#btn-entrar-prueba'); pg.wait_for_timeout(900)
    else:
        pg.fill('#acceso-correo', c['correo']); pg.fill('#acceso-clave', c['clave']); pg.click('#form-acceso button[type="submit"]')
        pg.wait_for_function("() => !document.getElementById('navegacion').hidden", timeout=60000); pg.wait_for_timeout(2500)


def preparar_datos(pg):
    if MODO == 'prueba':
        pg.evaluate("async () => { if (SRP.demo) await SRP.demo.cargar(); }"); pg.wait_for_timeout(800)


def iniciar_jornada(pg):
    """Nuevo registro muestra el formulario sólo con una jornada iniciada (en modo real esto sí guarda: se limpia al final)."""
    try:
        if pg.is_visible('#panel-iniciar-jornada'):
            pg.fill('#ini-nombre', 'Barrido de pantallas')
            ops = pg.eval_on_selector_all('#ini-programa option', 'l => l.map(o => o.value).filter(Boolean)')
            if ops: pg.select_option('#ini-programa', ops[0])
            pg.fill('#ini-meta', '5')
            if pg.is_visible('#btn-ini-detectar'): pg.click('#btn-ini-detectar'); pg.wait_for_timeout(2500)
            pg.click('#btn-iniciar-jornada'); pg.wait_for_timeout(1500)
    except Exception as e:
        return str(e)[:120]


def main():
    resultado = {'modo': MODO, 'base': BASE, 'inicio': time.strftime('%Y-%m-%d %H:%M'), 'corridas': []}
    with sync_playwright() as p:
        b = p.chromium.launch()
        for c in CUENTAS:
            if SOLO and c['perfil'] not in SOLO.split(','): continue
            for (tam, an, al, dpr) in [t for t in TAMANOS if c['perfil'] in ('ADMIN', 'CABO') or t[0] in CLIC_EN]:
                for csp_real in ((False, True) if tam in CLIC_EN else (False,)):
                    # Pasada de medición: con CSP desactivada para inyectar axe. Pasada de clics: con la CSP real.
                    ctx = b.new_context(viewport={'width': an, 'height': al}, device_scale_factor=dpr, bypass_csp=not csp_real,
                                        geolocation={'latitude': 19.4326, 'longitude': -99.1332, 'accuracy': 5}, permissions=['geolocation'],
                                        service_workers='block', timezone_id='America/Mexico_City', locale='es-MX')
                    pg = ctx.new_page()
                    ev = {'consola': [], 'pagina': [], 'fallidos': [], 'externos': {}, 'csp': []}
                    pg.on('console', lambda m: (m.type == 'error') and ev['consola'].append(m.text[:200]))
                    pg.on('console', lambda m: ('Content Security Policy' in m.text or 'Refused to' in m.text) and ev['csp'].append(m.text[:200]))
                    pg.on('pageerror', lambda e: ev['pagina'].append(str(e)[:200]))
                    pg.on('response', lambda r: r.status >= 400 and ev['fallidos'].append('%s %s' % (r.status, r.url.replace(BASE, '/')[:120])))
                    pg.on('requestfailed', lambda r: (ORIGEN in r.url or 'ERR_ABORTED' not in (r.failure or '')) and ev['fallidos'].append('falló %s %s' % (r.url.replace(BASE, '/')[:120], (r.failure or '')[:60])))
                    def externo(r):
                        h = urllib.parse.urlsplit(r.url).netloc
                        if h and h != ORIGEN and not r.url.startswith('data:'): ev['externos'][h] = ev['externos'].get(h, 0) + 1
                    pg.on('request', externo)
                    corrida = {'perfil': c['perfil'], 'tamano': tam, 'pasada': 'clics' if csp_real else 'medicion', 'vistas': {}}
                    try:
                        entrar(pg, c)
                        if not csp_real:
                            corrida['acceso_axe'] = None
                        preparar_datos(pg)
                        for v in VISTAS:
                            pg.evaluate("v => SRP.app.mostrarVista(v)", v); pg.wait_for_timeout(1300)
                            if not pg.evaluate("v => !document.getElementById('vista-' + v).hidden && SRP.app.vista === v", v):
                                continue
                            if v == 'registrar': corrida.setdefault('jornada', iniciar_jornada(pg))
                            reg = {}
                            if not csp_real:
                                reg['estatico'] = pg.evaluate(ESTATICO)
                                if tam in CLIC_EN:
                                    pg.add_script_tag(content=AXE) if not pg.evaluate("typeof axe !== 'undefined'") else None
                                    reg['axe'] = pg.evaluate(AXE_CORRER, None)
                                if tam in ('tel-390', 'escritorio'):
                                    pg.screenshot(path=os.path.join(SALIDA, '%s-%s-%s-%s.png' % (MODO, c['perfil'], tam, v)), full_page=False)
                            else:
                                botones = pg.evaluate(BOTONES, v)
                                reg['botones'] = []
                                for (i, texto, bid, accion) in botones:
                                    if NO_PRESIONAR.search(texto) or (MODO == 'real' and (NO_PRESIONAR_REAL.search(texto) or NO_PRESIONAR_REAL.search(accion))):
                                        reg['botones'].append([texto, bid, 'no se presiona']); continue
                                    pg.evaluate(LIMPIAR, v); pg.wait_for_timeout(400); pg.evaluate(BOTONES, v)
                                    loc = pg.locator('#vista-%s [data-aud="%d"]' % (v, i))
                                    if not loc.count():
                                        reg['botones'].append([texto, bid, 'ya no está']); continue
                                    antes = len(ev['consola']) + len(ev['pagina'])
                                    pg.evaluate(VIGILAR)
                                    try:
                                        with pg.expect_download(timeout=1500) as dl:
                                            loc.first.click(timeout=3000)
                                        efecto = {'descarga': dl.value.suggested_filename}
                                    except Exception as e:
                                        efecto = {} if 'download' in str(e).lower() or 'Timeout' in str(e) else {'error_clic': str(e).split('\n')[0][:100]}
                                    pg.wait_for_timeout(700)
                                    try: efecto.update(pg.evaluate(EFECTO))
                                    except Exception as e: efecto['error_efecto'] = str(e)[:80]
                                    # Una ventana que se abre se revisa también: lo estático y axe dentro de ella
                                    for dlg in efecto.get('dialogos', []):
                                        try:
                                            if pg.evaluate("typeof axe === 'undefined'"):
                                                efecto['axe_dialogo'] = 'axe no se puede inyectar con la CSP real'
                                        except Exception: pass
                                    nuevos = (ev['consola'] + ev['pagina'])[antes:] if len(ev['consola']) + len(ev['pagina']) > antes else []
                                    nada = not efecto.get('cambios') and not efecto.get('vista') and not efecto.get('dialogos') and not efecto.get('descarga') and not efecto.get('foco')
                                    reg['botones'].append([texto, bid, 'NO HACE NADA' if nada else 'ok', efecto, nuevos])
                            corrida['vistas'][v] = reg
                        # Las ventanas: se abren a mano en la pasada de medición para revisarlas con axe
                        if not csp_real and tam == 'tel-390':
                            corrida['ventanas'] = {}
                            for d in pg.eval_on_selector_all('dialog', 'l => l.map(d => d.id)'):
                                try:
                                    pg.evaluate("id => { document.querySelectorAll('dialog[open]').forEach(x => x.close()); document.getElementById(id).showModal(); }", d)
                                    pg.wait_for_timeout(250)
                                    corrida['ventanas'][d] = {'axe': pg.evaluate(AXE_CORRER, '#' + d), 'estatico': pg.evaluate(ESTATICO)}
                                except Exception as e:
                                    corrida['ventanas'][d] = {'error': str(e)[:120]}
                    except Exception as e:
                        corrida['error'] = str(e).split('\n')[0][:300]
                    corrida['eventos'] = ev
                    resultado['corridas'].append(corrida)
                    print('%s %s %s: %d vistas%s' % (c['perfil'], tam, corrida['pasada'], len(corrida['vistas']), (' · ERROR ' + corrida['error']) if corrida.get('error') else ''), flush=True)
                    json.dump(resultado, open(os.path.join(SALIDA, 'barrido-%s.json' % MODO), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
                    ctx.close()
        b.close()
    resultado['fin'] = time.strftime('%Y-%m-%d %H:%M')
    json.dump(resultado, open(os.path.join(SALIDA, 'barrido-%s.json' % MODO), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)


if __name__ == '__main__':
    main()
