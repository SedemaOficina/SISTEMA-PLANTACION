from playwright.sync_api import sync_playwright
JS = """async () => { const r = {};
  const carga = src => new Promise(ok => { const i = new Image(); i.onload = () => ok('carga'); i.onerror = () => ok('error'); i.src = src; });
  const c = document.createElement('canvas'); c.width = 4; c.height = 4; const durl = c.toDataURL('image/png');
  r.dataurl = await carga(durl);
  const blob = await (await fetch(durl).catch(e => null) || { blob: async () => null }).blob().catch(() => null);
  r.fetch_dataurl = blob ? 'ok' : 'falla';
  const b2 = await new Promise(ok => c.toBlob(ok, 'image/png'));
  r.bloburl = await carga(URL.createObjectURL(b2));
  try { await createImageBitmap(b2); r.bitmap = 'ok'; } catch (e) { r.bitmap = 'falla ' + e.message; }
  return r; }"""
with sync_playwright() as p:
    for m in ('webkit', 'chromium'):
        b = getattr(p, m).launch(); ctx = b.new_context(); pg = ctx.new_page(); pg.goto('http://127.0.0.1:8132/manifest.webmanifest')
        print(m, 'con red', pg.evaluate(JS)); ctx.set_offline(True); print(m, 'sin red', pg.evaluate(JS)); b.close()
