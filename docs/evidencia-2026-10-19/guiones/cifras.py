"""B2 · COHERENCIA DE CIFRAS: lo que dice Supervisión (Administración global, modo real) contra un recálculo propio en SQL
sobre la base, escrito desde las reglas documentadas en js/indicadores.js y datos/esquema.json, sin usar el código
de la aplicación. Varios periodos y un filtro de institución."""
import json, subprocess, re
from playwright.sync_api import sync_playwright
C = json.load(open(r'C:\sia-rev\tmp\herr\cuentas-real.json', encoding='utf-8')); A = [c for c in C if c['perfil'] == 'ADMIN'][0]

def sql(q, args=()):
    r = subprocess.run(['node', '-e', "import('./bd.js').then(async m => { const c = await m.conectar(); const r = await c.query(process.argv[1], JSON.parse(process.argv[2])); console.log(JSON.stringify(r.rows)); await c.end(); })", q, json.dumps(list(args))],
                       capture_output=True, text=True, encoding='utf-8', cwd=r'C:\sia-rev\tmp\aud\servidor')
    if r.returncode: raise RuntimeError(r.stderr[:300])
    return json.loads(r.stdout)

# Reglas: árboles activos, de jornadas cerradas que no son de una carga oculta, contados en el periodo de su fecha de plantación
BASE = """FROM srp.plantaciones p JOIN srp.jornadas j ON j.id = p.jornada_id
  WHERE j.estatus = 'cerrada' AND p.estatus = 'activo' AND NOT srp.de_carga_oculta(j.id)
    AND p.fecha_plantacion BETWEEN $1 AND $2 {extra}"""

def recalculo(desde, hasta, org=None):
    extra = 'AND j.organizacion_id = $3' if org else ''
    a = list((desde, hasta) + ((org,) if org else ()))
    total = sql('SELECT count(*)::int AS n ' + BASE.format(extra=extra), a)[0]['n']
    jornadas = sql('SELECT count(DISTINCT j.id)::int AS n ' + BASE.format(extra=extra), a)[0]['n']
    por_org = {r['nombre']: r['n'] for r in sql('SELECT i.nombre, count(*)::int AS n ' + BASE.format(extra=extra).replace('FROM srp.plantaciones p', 'FROM srp.plantaciones p JOIN srp.jornadas j2 ON true').replace('JOIN srp.jornadas j2 ON true', '') .replace('WHERE', 'JOIN srp.instituciones i ON i.id = j.organizacion_id WHERE') + ' GROUP BY i.nombre', a)}
    por_alc = {r['a']: r['n'] for r in sql("SELECT coalesce(p.alcaldia, '(sin alcaldía)') AS a, count(*)::int AS n " + BASE.format(extra=extra) + ' GROUP BY 1', a)}
    return {'arboles': total, 'jornadas_con_arboles': jornadas, 'por_institucion': por_org, 'por_alcaldia': por_alc}

LEER = r"""() => { const t = x => (x || '').replace(/\s+/g, ' ').trim();
  const num = s => { const m = t(s).match(/^([\d,]+)/); return m ? Number(m[1].replace(/,/g, '')) : null; };
  const cifras = [...document.querySelectorAll('#vista-supervision .sup-cifra')].map(e => t(e.textContent));
  const tablas = {};
  document.querySelectorAll('#vista-supervision table').forEach((tb, i) => {
    const titulo = t((tb.closest('section, details, figure') || tb).querySelector('h2, h3, summary, caption') ? (tb.closest('section, details, figure') || tb).querySelector('h2, h3, summary, caption').textContent : 'tabla ' + i);
    const filas = [...tb.querySelectorAll('tbody tr')].map(tr => [...tr.cells].map(c => t(c.textContent)));
    tablas[titulo + ' #' + i] = { encabezado: [...tb.querySelectorAll('thead th')].map(th => t(th.textContent)), filas };
  });
  return { etiqueta: t(document.getElementById('sup-etiqueta').textContent), cifras, arboles: num(cifras[0]), tablas }; }"""

with sync_playwright() as p:
    b = p.chromium.launch(); ctx = b.new_context(viewport={'width': 1440, 'height': 900}, service_workers='block', timezone_id='America/Mexico_City'); pg = ctx.new_page()
    pg.goto('http://127.0.0.1:8090/'); pg.wait_for_selector('html[data-listo]')
    pg.fill('#acceso-correo', A['correo']); pg.fill('#acceso-clave', A['clave']); pg.click('#form-acceso button[type="submit"]')
    pg.wait_for_function("() => !document.getElementById('navegacion').hidden", timeout=60000)
    pg.wait_for_function("() => SRP.remoto.estado === 'listo'", timeout=120000)
    pg.evaluate("SRP.app.mostrarVista('supervision')"); pg.wait_for_timeout(2000)
    casos = [('2024-01-01', '2026-10-19', None), ('2026-09-01', '2026-09-30', None), ('2025-01-01', '2025-12-31', None),
             ('2024-01-01', '2026-10-19', 'o-paot'), ('2026-10-13', '2026-10-19', None), ('2026-10-19', '2026-10-19', None), ('2024-01-01', '2026-10-19', 'o-alc-09007')]
    salida = []
    for (d, h, org) in casos:
        pg.evaluate("([d, h, o]) => { SRP.supervision.periodo = SRP.indicadores.periodo('rango', d, h); SRP.supervision.filtros.organizacion = o || ''; SRP.supervision.pintar(); }", [d, h, org])
        pg.wait_for_timeout(3000)
        pant = pg.evaluate(LEER)
        rec = recalculo(d, h, org)
        salida.append({'periodo': [d, h, org], 'pantalla': pant, 'recalculo': rec})
        tab_org = next((v for k, v in pant['tablas'].items() if 'nstituci' in k or (v['encabezado'] and 'nstituci' in v['encabezado'][0])), None)
        print('%s a %s %s · pantalla %s · recálculo %s · %s' % (d, h, org or '', pant['arboles'], rec['arboles'], 'IGUAL' if pant['arboles'] == rec['arboles'] else 'DISTINTO'))
        if tab_org:
            for f in tab_org['filas']:
                n = int(re.sub(r'[^\d]', '', f[1]) or 0) if len(f) > 1 else None
                r = rec['por_institucion'].get(f[0])
                if r is not None and n != r: print('   institución %s: pantalla %s · recálculo %s' % (f[0], n, r))
    json.dump(salida, open(r'C:\sia-rev\tmp\herr\cifras.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    b.close()
