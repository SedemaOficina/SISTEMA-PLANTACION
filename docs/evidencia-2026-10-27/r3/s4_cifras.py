"""r3 · S4: dos cifras de Supervisión con lo nuevo, recalculadas aparte (modo de prueba, demostración, Directivo de la
Secretaría u-dir-1, «Todo»):
 (1) «N de M cabos trabajaron» con «Tipo de jornada» = Compartidas y sin filtro, contra los cabos que de verdad
     registraron árboles en jornadas cerradas (leído del almacén, sin usar el código de la app);
 (2) el «% del total» de cada calle en «Por calle», contra árboles × 100 / total redondeado, leído de la tabla.
Uso: python s4_cifras.py [corrida]  → s4-<corrida>.json"""
import sys
from comun import *
CORRIDA = sys.argv[1] if len(sys.argv) > 1 else '1'
R = {}; err = []
INDEP = """async (compartida) => {
  const js = (await SRP.almacen.todos('jornadas')).filter(j => j.estatus === 'cerrada');
  const us = Object.fromEntries((await SRP.almacen.todos('usuarios')).map(u => [u.id, u]));
  const sel = js.filter(j => compartida === '' ? true : compartida === 'si' ? (j.cabos_apoyo || []).length > 0 : !(j.cabos_apoyo || []).length);
  const ids = new Set(sel.map(j => j.id));
  const a = (await SRP.almacen.todos('plantaciones')).filter(r => r.estatus === 'activo' && ids.has(r.jornada_id));
  const cabosConArboles = new Set(a.map(r => r.cabo_id).filter(id => us[id] && us[id].perfil === 'CABO'));
  const cabosTitulares = new Set(sel.map(j => j.cabo_id).filter(id => us[id] && us[id].perfil === 'CABO'));
  const soloApoyo = [...cabosConArboles].filter(id => !cabosTitulares.has(id));
  const cabosActivosCuenta = Object.values(us).filter(u => u.perfil === 'CABO' && u.activo !== false).length;
  return { jornadas: sel.length, arboles: a.length, cabosConArboles: cabosConArboles.size, cabosTitulares: cabosTitulares.size, soloApoyo: soloApoyo.map(id => us[id].nombre + ' ' + (us[id].apellido_paterno || '')), cuentasCabo: cabosActivosCuenta }; }"""
PANTALLA = """() => { const t = [...document.querySelectorAll('#vista-supervision .sup-cifra, #vista-supervision .cifra-tarjeta, #vista-supervision [class*=cifra]')].map(e => e.innerText.replace(/\\s+/g, ' ')).find(x => /cabos? trabaj/.test(x));
  return t || null; }"""
POR_QUIEN = """() => { const h = document.getElementById('sup-t-cabos') || [...document.querySelectorAll('#vista-supervision h2, #vista-supervision h3, #vista-supervision summary')].find(e => /quién registró/i.test(e.textContent));
  const s = h && (h.closest('details, section') || h.parentElement); if (!s) return null; const t = s.querySelector('table'); if (!t) return null;
  const cab = [...t.querySelectorAll('thead th')].map(x => x.textContent); const filas = [...t.querySelectorAll('tbody tr')].map(tr => [...tr.querySelectorAll('td')].map(td => td.innerText.replace(/\\s+/g, ' ').trim()));
  return { cab, filas: filas.slice(0, 40) }; }"""
CALLES = """() => { const m = SRP.supervision.modelo, total = m.cifras.arboles, sec = document.getElementById('sup-t-calles'); const s = sec && (sec.closest('details, section') || sec.parentElement);
  const tablas = [...s.querySelectorAll('table')]; const subt = [...s.querySelectorAll('.sup-subtitulo')].map(x => x.textContent);
  const red = tablas[0] ? [...tablas[0].querySelectorAll('tbody tr')].map(tr => [...tr.querySelectorAll('td')].map(td => td.innerText.trim())) : [];
  const por = tablas.slice(1).map((t, i) => { const filas = [...t.querySelectorAll('tbody tr')].map(tr => { const td = [...tr.querySelectorAll('td')]; const n = Number(td[1].innerText.replace(/,/g, '')), p = Number(td[2].innerText.replace(/[^0-9]/g, ''));
      return { calle: td[0].innerText.split('\\n')[0], arboles: n, pantalla: p, exacto: Math.round(n * 10000 / total) / 100, redondeado: Math.round(n * 100 / total) }; });
    return { red: subt[i], calles: filas.length, sumaPantalla: filas.reduce((a, f) => a + f.pantalla, 0), arboles: filas.reduce((a, f) => a + f.arboles, 0),
      distintas: filas.filter(f => f.pantalla !== f.redondeado).length, ejemplos: filas.filter(f => f.pantalla !== f.redondeado).slice(-3) }; });
  return { total, red, por }; }"""
with sync_playwright() as p:
    b = getattr(p, os.environ.get('R3_MOTOR', 'chromium')).launch(); ctx = contexto(b, ESC if os.environ.get('R3_ANCHO') == 'esc' else TEL); pg = pagina(ctx, err); arrancar(pg); entrar(pg, 'u-admin-1'); cargar_demo(pg)
    como(pg, 'u-dir-1'); vista(pg, 'supervision', 3000)
    pg.evaluate("document.querySelector('#sup-tipos .chip[data-tipo=todo]').click()"); pg.wait_for_function("() => SRP.supervision.modelo && SRP.supervision.modelo.periodo && SRP.supervision.modelo.periodo.tipo === 'todo'", timeout=30000); pg.wait_for_timeout(1500)
    for v in ('', 'si'):
        pg.evaluate("v => { const e = document.getElementById('sup-compartida'); e.value = v; e.dispatchEvent(new Event('change', { bubbles: true })); }", v)
        pg.wait_for_function("v => SRP.supervision.modelo && (SRP.supervision.modelo.filtros.compartida || '') === v", arg=v, timeout=30000); pg.wait_for_timeout(2000)
        pg.evaluate("SRP.supervision.abrirTodo()"); pg.wait_for_timeout(800)
        c = pg.evaluate("() => SRP.supervision.modelo.cifras")
        R['tipo=' + (v or 'todas')] = {'pantalla': pg.evaluate(PANTALLA), 'modelo': {k: c[k] for k in ('jornadas', 'arboles', 'cabosActivos', 'cabosAsignados')},
                                       'independiente': pg.evaluate(INDEP, v), 'por_quien': pg.evaluate(POR_QUIEN)}
        if v == '': R['calles'] = pg.evaluate(CALLES)
        if v == 'si':
            pg.evaluate("() => { const e = [...document.querySelectorAll('#vista-supervision [class*=cifra]')].find(x => /trabaj/.test(x.innerText)); if (e) e.scrollIntoView({ block: 'center' }); }"); pg.wait_for_timeout(300)
            foto(pg, 's4-%s-sup-compartidas-cabos' % CORRIDA, completa=False)
    R['errores'] = err
    guardar('s4-%s.json' % CORRIDA, R)
    b.close()
print(json.dumps(R, ensure_ascii=False, indent=1)[:9000])
