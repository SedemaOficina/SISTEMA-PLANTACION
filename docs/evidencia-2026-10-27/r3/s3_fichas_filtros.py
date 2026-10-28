"""r3 · S3: las fichas de Jornadas (compartida y con relevo) con cada perfil, la ventana «Relevo de cabo», y el filtro
«Tipo de jornada» combinado con los demás en Registros, Jornadas y Supervisión (C4). Modo de prueba, con demostración.
Uso: python s3_fichas_filtros.py [tel|esc]"""
import sys
from comun import *

ANCHO = sys.argv[1] if len(sys.argv) > 1 else 'tel'
VP = TEL if ANCHO == 'tel' else ESC
P = 's3-' + ANCHO + '-'
R = {}; err = []

ABRIR = """async id => { SRP.app.mostrarVista('jornadas'); await new Promise(r => setTimeout(r, 1200));
  const t = document.querySelector('#jornada-atajos .chip[data-atajo="todas"]'); if (t) { t.click(); await new Promise(r => setTimeout(r, 1200)); }
  let x = null; for (let i = 0; i < 75 && !x; i++) { x = SRP.jornadas.lista.find(j => (j.dato || {}).id === id); if (!x) await new Promise(r => setTimeout(r, 200)); }
  if (!x) return 'no está en la lista';
  await SRP.jornadas.abrir(x.clave); return x.clave; }"""
BOTONES = "() => [...document.querySelectorAll('#vista-jornadas button')].filter(b => b.offsetParent && b.innerText.trim() && !b.closest('#lista-jornadas')).map(b => b.innerText.trim().replace(/\\s+/g, ' ') + ' [' + b.className.replace('btn ', '') + ']')"

with sync_playwright() as p:
    b = p.chromium.launch(); ctx = contexto(b, VP); pg = pagina(ctx, err); arrancar(pg); entrar(pg, 'u-admin-1'); cargar_demo(pg)
    ids = pg.evaluate("""async () => { const js = (await SRP.almacen.todos('jornadas')).filter(x => SRP.demo.es(x.id));
      const c = js.find(x => x.estatus === 'abierta' && x.cabos_apoyo.length), r = js.find(x => x.estatus === 'abierta' && (x.relevos || []).length);
      const cc = js.filter(x => x.estatus === 'cerrada' && x.cabos_apoyo.some(a => a.fin === 'quitado') && x.cabos_apoyo.some(a => !a.hasta));
      return { comp: c.id, rel: r.id, cerradaQuitado: cc.length ? cc[0].id : null, apoyosCerrada: cc.length ? cc[0].cabos_apoyo : null }; }""")
    R['ids'] = ids
    for uid, nombre in (('u-demo-k1', 'coord'), ('u-demo-c5', 'apoyo'), ('u-dir-1', 'dir'), ('u-admin-1', 'admin')):
        como(pg, uid)
        for cual in ('comp', 'rel'):
            R[nombre + '_' + cual + '_abrir'] = pg.evaluate(ABRIR, ids[cual]); pg.wait_for_timeout(1500)
            R[nombre + '_' + cual + '_ficha'] = pg.evaluate("() => { const e = document.getElementById('jornada-detalle') || document.querySelector('#vista-jornadas .jornada-ficha'); return (e || document.getElementById('vista-jornadas')).innerText.slice(0, 1800); }")
            R[nombre + '_' + cual + '_botones'] = pg.evaluate(BOTONES)
            foto(pg, P + nombre + '-' + cual, completa=False)
    # La ventana «Relevo de cabo» (Coordinación, en la jornada con relevo)
    como(pg, 'u-demo-k1'); pg.evaluate(ABRIR, ids['rel']); pg.wait_for_timeout(1200)
    if pg.is_visible('#btn-jornada-relevo'):
        pg.click('#btn-jornada-relevo'); pg.wait_for_timeout(600)
        R['relevo_dialogo'] = texto(pg, '#dlg-relevo'); R['relevo_carga'] = carga(pg, '#dlg-relevo')
        R['relevo_opciones'] = pg.evaluate("() => [...document.getElementById('relevo-quien').options].map(o => o.textContent)")
        R['relevo_boton'] = texto(pg, '#btn-relevo-hacer')
        foto(pg, P + 'relevo-dialogo', completa=False); cerrar_dialogos(pg)
    # Una cerrada con un cabo quitado y uno que no terminó: la ficha y el texto de cabos de apoyo
    if ids['cerradaQuitado']:
        pg.evaluate(ABRIR, ids['cerradaQuitado']); pg.wait_for_timeout(1200)
        R['cerrada_quitado_ficha'] = pg.evaluate("() => document.getElementById('vista-jornadas').innerText.slice(0, 900)")
        foto(pg, P + 'cerrada-quitado', completa=False)
    # ---------- C4: el filtro «Tipo de jornada» con los demás ----------
    def elegir(sel, valor):
        pg.evaluate("([s, v]) => { const e = document.querySelector(s); e.value = v; e.dispatchEvent(new Event('change', { bubbles: true })); }", [sel, valor]); pg.wait_for_timeout(1500)
    combos = {}
    # Jornadas, como Coordinación: Todas/Compartidas/No compartidas × (sin otro filtro, Quién registró = un cabo de apoyo, Programa)
    como(pg, 'u-demo-k1'); vista(pg, 'jornadas', 2000)
    pg.click('#jornada-atajos .chip[data-atajo="todas"]') if pg.is_visible('#jornada-atajos .chip[data-atajo="todas"]') else None; pg.wait_for_timeout(1200)
    R['jornadas_selects'] = pg.evaluate("() => [...document.querySelectorAll('#vista-jornadas select')].map(s => s.id + ': ' + [...s.options].map(o => o.textContent).slice(0, 6).join(' | '))")
    for quien in ('', 'u-demo-c3'):
        if pg.locator('#jornada-cabo').count(): elegir('#jornada-cabo', quien)
        for v in ('', 'si', 'no'):
            elegir('#jornada-compartida', v)
            combos['jornadas quien=%s tipo=%s' % (quien or 'todos', v or 'todas')] = pg.evaluate("() => [SRP.jornadas.lista.length, document.getElementById('jornada-mas-filtros-texto').textContent, [...document.querySelectorAll('#jornada-fichas .ficha-filtro span')].map(x => x.textContent).join(' + ')]")
    foto(pg, P + 'jornadas-filtro-compartidas-quien', completa=False)
    pg.click('#jornada-quitar') if pg.is_visible('#jornada-quitar') else None; pg.wait_for_timeout(800)
    # Registros, como Coordinación y como cabo de apoyo
    for uid in ('u-demo-k1', 'u-demo-c3'):
        como(pg, uid); vista(pg, 'registros', 2500)
        for v in ('', 'si', 'no'):
            elegir('#filtro-compartida', v)
            combos['registros %s tipo=%s' % (uid, v or 'todas')] = pg.evaluate("() => [SRP.registros.filtrados.length, [...document.querySelectorAll('#filtros-activos .ficha-filtro span')].map(x => x.textContent).join(' + '), (document.getElementById('registros-resumen') || document.querySelector('#vista-registros .resumen') || {}).textContent || '']")
        R['registros_selects_' + uid] = pg.evaluate("() => [...document.querySelectorAll('#vista-registros select')].map(s => s.id + ': ' + [...s.options].map(o => o.textContent).slice(0, 5).join(' | '))")
        foto(pg, P + 'registros-filtro-' + uid, completa=False)
    # Supervisión, como Directivo: Todo × Tipo × Alcaldía
    como(pg, 'u-dir-1'); vista(pg, 'supervision', 3000)
    pg.evaluate("document.querySelector('#sup-tipos .chip[data-tipo=todo]').click()"); pg.wait_for_timeout(2500)
    for v in ('', 'si', 'no'):
        elegir('#sup-compartida', v); pg.wait_for_timeout(1500)
        combos['supervision tipo=%s' % (v or 'todas')] = pg.evaluate("() => { const m = SRP.supervision.modelo; return [m.cifras.jornadas, m.cifras.arboles, [...document.querySelectorAll('#sup-fichas .ficha-filtro span')].map(x => x.textContent).join(' + '), SRP.informes.nombreArchivo(m, 'Informe', 'pdf')]; }")
    foto(pg, P + 'sup-filtro-no', completa=False)
    elegir('#sup-compartida', 'si')
    R['sup_titulo_con_filtro'] = pg.evaluate("() => (document.querySelector('#vista-supervision h2, #vista-supervision .sup-titulo') || {}).textContent")
    R['sup_alcance'] = pg.evaluate("() => document.getElementById('vista-supervision').innerText.slice(0, 700)")
    foto(pg, P + 'sup-filtro-si', completa=False)
    R['combos'] = combos; R['errores'] = err
    guardar('s3-' + ANCHO + '.json', R)
    b.close()
print(json.dumps(R, ensure_ascii=False, indent=1)[:20000])
