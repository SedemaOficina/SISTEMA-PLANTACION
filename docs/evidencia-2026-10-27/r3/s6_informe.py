"""r3 · S6: el informe en PDF y la tabla CSV de Supervisión con «Tipo de jornada» = Compartidas (Directivo u-dir-1,
«Todo»), y los mismos del cabo de apoyo (u-demo-c3) en «Mi avance». Guarda los archivos en pdf/ y su texto.
Uso: python s6_informe.py"""
from comun import *
import subprocess
R = {}; err = []
D = os.path.join(EVID, 'pdf'); os.makedirs(D, exist_ok=True)

def bajar(pg, sel, nombre):
    R.setdefault('dialogos_antes', []).append([nombre, [d['texto'][:200] for d in dialogo_abierto(pg)]])
    for _ in range(3):
        if pg.is_visible('#btn-confirmar-si'): pg.click('#btn-confirmar-si'); pg.wait_for_timeout(600)
    with pg.expect_download(timeout=120000) as dl:
        pg.click(sel)
    d = dl.value; ruta = os.path.join(D, nombre + os.path.splitext(d.suggested_filename)[1]); d.save_as(ruta)
    return {'sugerido': d.suggested_filename, 'ruta': ruta}

with sync_playwright() as p:
    b = p.chromium.launch(); ctx = contexto(b, ESC); pg = pagina(ctx, err); arrancar(pg); entrar(pg, 'u-admin-1'); cargar_demo(pg)
    como(pg, 'u-dir-1'); vista(pg, 'supervision', 3000)
    pg.evaluate("document.querySelector('#sup-tipos .chip[data-tipo=todo]').click()")
    pg.wait_for_function("() => SRP.supervision.modelo && SRP.supervision.modelo.periodo.tipo === 'todo'", timeout=30000); pg.wait_for_timeout(1500)
    pg.evaluate("() => { const e = document.getElementById('sup-compartida'); e.value = 'si'; e.dispatchEvent(new Event('change', { bubbles: true })); }")
    pg.wait_for_function("() => SRP.supervision.modelo.filtros.compartida === 'si'", timeout=30000); pg.wait_for_timeout(2000)
    R['pdf_dir'] = bajar(pg, '#btn-sup-pdf', 's6-informe-compartidas')
    R['csv_dir'] = bajar(pg, '#btn-sup-csv', 's6-tabla-compartidas')
    # Mi avance del cabo de apoyo, con Compartidas
    como(pg, 'u-demo-c3'); vista(pg, 'supervision', 3000)
    R['cabo_vista'] = pg.evaluate("SRP.app.vista")
    pg.evaluate("document.querySelector('#sup-tipos .chip[data-tipo=todo]').click()")
    pg.wait_for_function("() => SRP.supervision.modelo && SRP.supervision.modelo.periodo.tipo === 'todo'", timeout=30000); pg.wait_for_timeout(1500)
    R['cabo_tiene_filtro'] = pg.is_visible('#sup-compartida') or pg.evaluate("!!document.getElementById('sup-compartida') && !document.getElementById('sup-compartida').closest('[hidden]')")
    pg.evaluate("() => { const e = document.getElementById('sup-compartida'); e.value = 'si'; e.dispatchEvent(new Event('change', { bubbles: true })); }")
    pg.wait_for_function("() => SRP.supervision.modelo.filtros.compartida === 'si'", timeout=30000); pg.wait_for_timeout(2000)
    R['cabo_cifras'] = pg.evaluate("() => document.getElementById('vista-supervision').innerText.slice(0, 900)")
    foto(pg, 's6-cabo-mi-avance-compartidas', completa=False)
    R['pdf_cabo'] = bajar(pg, '#btn-sup-pdf', 's6-mi-avance-compartidas-cabo')
    R['errores'] = err
    guardar('s6.json', R)
    b.close()
for k in ('pdf_dir', 'pdf_cabo'):
    subprocess.run(['python', '-I', os.path.join(EVID, 'pdf_texto.py'), R[k]['ruta']])
print(json.dumps(R, ensure_ascii=False, indent=1))
