"""Por qué el clic en «Informe en PDF» de Supervisión no responde con el Directivo de prueba (modo de prueba, 8134)."""
import json
from playwright.sync_api import sync_playwright
with sync_playwright() as p:
    b = p.chromium.launch(); ctx = b.new_context(viewport={'width': 1280, 'height': 900}, service_workers='block', accept_downloads=True); pg = ctx.new_page()
    pg.goto('http://127.0.0.1:8134/'); pg.wait_for_selector('html[data-listo]', state='attached')
    pg.select_option('#sel-usuario-prueba', 'u-admin-1'); pg.click('#btn-entrar-prueba'); pg.wait_for_function("() => SRP.sesion && SRP.sesion.usuario")
    pg.evaluate("async () => { await SRP.demo.cargar(); }")
    pg.evaluate("id => SRP.sesion.iniciar(SRP.ref.usuarioPorId[id])", 'u-dir-1'); pg.reload(); pg.wait_for_selector('html[data-listo]', state='attached')
    pg.wait_for_function("() => SRP.sesion && SRP.sesion.usuario && SRP.sesion.usuario.id === 'u-dir-1'"); pg.wait_for_timeout(1500)
    pg.evaluate("() => document.querySelectorAll('dialog[open]').forEach(d => d.close())")
    pg.evaluate("SRP.app.mostrarVista('supervision')"); pg.wait_for_timeout(2500)
    d = pg.evaluate("""() => { const b = document.getElementById('btn-sup-pdf'); const r = b.getBoundingClientRect(); b.scrollIntoView({block: 'center'});
      const q = b.getBoundingClientRect(); const arriba = document.elementFromPoint(q.left + q.width / 2, q.top + q.height / 2);
      return { disabled: b.disabled, ariaDisabled: b.getAttribute('aria-disabled'), hidden: b.hidden, visible: q.width > 0, encima: arriba ? arriba.tagName + '#' + arriba.id + '.' + arriba.className : null,
        dialogos: [...document.querySelectorAll('dialog[open]')].map(x => x.id), titulo: (document.querySelector('#vista-supervision h2') || {}).textContent }; }""")
    print(json.dumps(d, ensure_ascii=False))
    try:
        pg.click('#btn-sup-pdf', timeout=8000); print('clic bien')
    except Exception as e:
        print('clic:', str(e).split('\n')[0][:200]); print([l for l in str(e).split('\n') if 'intercepts' in l or 'not enabled' in l or 'waiting' in l][:4])
    b.close()
