"""A6 · Contraste medido de lo nuevo desde la 1.1 (datos de prueba, con la demostración cargada).

Parte 1, en la página: para cada elemento nuevo toma su color calculado y su fondo real (componiendo las
transparencias de los contenedores hasta el primero opaco) y calcula la razón de contraste (WCAG 2.x), con modo sol
encendido (como arranca desde la 1.2) y apagado: «Sustituir» en morado, la calle en el detalle y en «Por calle», las
marcas de jornada compartida (franja, tarjeta, chip «Varios cabos»), y la precisión del GPS (insignia).
Parte 2, sobre el mapa: el círculo del margen del GPS (buena, aceptable, baja) sobre «Satélite» y «Calles»: compara
el color del trazo con los píxeles del mapa que lo rodean, en una captura, en dos lugares (Centro y Chapultepec).
Uso: python a6_contraste.py <url> <salida>"""
import json, os, sys, statistics
from playwright.sync_api import sync_playwright
from PIL import Image

BASE, SALIDA = sys.argv[1].rstrip('/') + '/', sys.argv[2]
os.makedirs(SALIDA, exist_ok=True)

MEDIR = r"""(sels) => {
  const rgba = s => { const m = s.match(/rgba?\(([^)]+)\)/); if (!m) return null; const p = m[1].split(',').map(x => parseFloat(x)); return [p[0], p[1], p[2], p.length > 3 ? p[3] : 1]; };
  const sobre = (a, b) => [0, 1, 2].map(i => a[i] * a[3] + b[i] * (1 - a[3])).concat(1);
  const fondo = e => { const capas = []; for (let x = e; x; x = x.parentElement) { const c = rgba(getComputedStyle(x).backgroundColor); if (c && c[3] > 0) { capas.push(c); if (c[3] >= 1) break; } }
    let f = [255, 255, 255, 1]; for (let i = capas.length - 1; i >= 0; i--) f = sobre(capas[i], f); return f; };
  const lum = c => { const v = c.slice(0, 3).map(x => { x /= 255; return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4); }); return 0.2126 * v[0] + 0.7152 * v[1] + 0.0722 * v[2]; };
  const razon = (a, b) => { const l1 = lum(a), l2 = lum(b); return Math.round(((Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05)) * 100) / 100; };
  const hex = c => '#' + c.slice(0, 3).map(x => Math.round(x).toString(16).padStart(2, '0')).join('');
  const out = [];
  for (const [nombre, sel, tipo] of sels) {
    const e = [...document.querySelectorAll(sel)].find(x => x.getBoundingClientRect().width > 0 && !x.closest('[hidden]'));
    if (!e) { out.push([nombre, sel, 'no está en pantalla']); continue; }
    const s = getComputedStyle(e), f = fondo(e);
    let c = rgba(tipo === 'borde' ? s.borderTopColor : tipo === 'relleno' ? s.backgroundColor : s.color);
    c = sobre(c, f);
    const ff = tipo === 'relleno' ? fondo(e.parentElement) : f;
    out.push([nombre, sel, tipo || 'texto', hex(c), hex(ff), razon(c, ff), s.fontSize, s.fontWeight, (e.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 40)]);
  }
  return out; }"""

with sync_playwright() as p:
    b = p.chromium.launch()
    res = {'pagina': {}, 'mapa': []}
    for modo in (('sol', 'normal') if os.environ.get('A6_PARTE', '12') != '2' else ()):
        ctx = b.new_context(viewport={'width': 390, 'height': 844}, timezone_id='America/Mexico_City', service_workers='block',
                            geolocation={'latitude': 19.4326, 'longitude': -99.1332, 'accuracy': 5}, permissions=['geolocation'])
        if modo == 'normal': ctx.add_init_script("try { localStorage.setItem('srp_contraste', 'normal'); } catch (e) {}")
        pg = ctx.new_page()
        pg.goto(BASE); pg.wait_for_selector('html[data-listo]', state='attached', timeout=60000)
        pg.select_option('#sel-usuario-prueba', 'u-admin-1'); pg.click('#btn-entrar-prueba'); pg.wait_for_function("() => SRP.sesion && SRP.sesion.usuario")
        pg.evaluate("async () => { await SRP.demo.cargar(); }")
        def como(uid):
            pg.evaluate("id => SRP.sesion.iniciar(SRP.ref.usuarioPorId[id])", uid); pg.reload(); pg.wait_for_selector('html[data-listo]', state='attached')
            pg.wait_for_function("id => SRP.sesion && SRP.sesion.usuario && SRP.sesion.usuario.id === id", arg=uid); pg.wait_for_timeout(3000)
            pg.evaluate("() => document.querySelectorAll('dialog[open]').forEach(d => d.close())")
        medidas = []
        como('u-coord-1')
        pg.evaluate("SRP.app.mostrarVista('registrar')"); pg.wait_for_timeout(1500)
        pg.evaluate("() => document.querySelectorAll('dialog[open]').forEach(d => d.close())")
        if pg.is_hidden('#panel-iniciar-jornada'):
            pg.click('#btn-jornada-cambiar'); pg.wait_for_timeout(250); pg.click('#btn-cambiar-nueva'); pg.wait_for_timeout(400)
        pg.click('#ini-quien .chip[data-quien="varios"]'); pg.wait_for_timeout(200)
        pg.click('#ini-apoyos .chip[data-id="u-cabo-1"]'); pg.mouse.move(0, 0); pg.wait_for_timeout(800)   # sin el puntero encima y pasada la transición
        medidas += pg.evaluate(MEDIR, [['chip «Varios cabos» marcado: texto', '#ini-quien .chip[aria-pressed=true]', ''], ['chip «Varios cabos» marcado: subtítulo «jornada compartida»', '#ini-quien .chip[aria-pressed=true] .chip-sub', ''],
                                       ['chip «Sólo yo» sin marcar: borde', '#ini-quien .chip[aria-pressed=false]', 'borde'], ['cabo marcado en la lista', '#ini-apoyos .chip[aria-pressed=true]', ''],
                                       ['cabo sin marcar en la lista: borde', '#ini-apoyos .chip[aria-pressed=false]', 'borde'], ['ayuda bajo la lista', '#ini-caja-apoyos .nota', '']])
        jid = pg.evaluate("""async () => { await SRP.activa.guardarJornadaNueva({ nombre: 'Contraste r2', ubicacion: { lat: 19.4326, lng: -99.1332 }, fecha: SRP.util.fechaHoy(), comentarios: '', programa_id: 'p-refor', previstos: 10, apoyos: ['u-cabo-1'] }); return SRP.activa.jornada.id; }""")
        pg.evaluate("async () => { SRP.app.mostrarVista('registrar'); await SRP.activa.preparar(); }"); pg.wait_for_timeout(1200)
        pg.evaluate("() => document.querySelectorAll('dialog[open]').forEach(d => d.close())")
        medidas += pg.evaluate(MEDIR, [['franja: datos de la jornada («· compartida»)', '.franja-jornada-datos', ''], ['franja: «Cabos de apoyo»', '#btn-franja-apoyos', ''], ['franja: «Cabos de apoyo» borde', '#btn-franja-apoyos', 'borde']])
        pg.click('#btn-ubicacion'); pg.wait_for_timeout(1500)
        medidas += pg.evaluate(MEDIR, [['insignia de precisión (buena)', '#mapa-estado .precision', ''], ['consejo bajo la precisión', '#mapa-estado .precision-consejo', '']])
        # El cabo de apoyo: su franja
        como('u-cabo-1')
        pg.evaluate("async id => { SRP.activa.jornada = await SRP.almacen.uno('jornadas', id); SRP.app.mostrarVista('registrar'); await SRP.activa.preparar(); }", jid); pg.wait_for_timeout(1200)
        medidas += pg.evaluate(MEDIR, [['franja del cabo de apoyo: «Jornada compartida · coordina…»', '.franja-jornada-coordina', ''], ['franja del cabo de apoyo: avance «· N suyos»', '.franja-jornada-avance', '']])
        # Jornadas: la tarjeta «compartida con N cabos»
        como('u-coord-1')
        pg.evaluate("SRP.app.mostrarVista('jornadas')"); pg.wait_for_timeout(2000)
        medidas += pg.evaluate(MEDIR, [['tarjeta de jornada: renglón con «compartida con N cabos»', '#lista-jornadas .jornada-cabo', '']])
        # El detalle de un árbol: la calle y «Sustituir»
        pg.evaluate("SRP.app.mostrarVista('registros')"); pg.wait_for_timeout(1500)
        pg.evaluate("""async () => { const t = (await SRP.almacen.todos('plantaciones')).filter(r => r.estatus === 'activo' && r.calle && SRP.permisos.puede('registro.sustituir', r)); await SRP.registros.verDetalle(t[0]); }"""); pg.wait_for_timeout(1500)
        medidas += pg.evaluate(MEDIR, [['detalle: renglón de la red vial de la calle', '#dlg-detalle .calle-red', ''], ['«Sustituir árbol»: texto', '#btn-detalle-sustituir', ''],
                                       ['«Sustituir árbol»: contorno', '#btn-detalle-sustituir', 'borde'], ['«Editar»: contorno (al lado)', '#btn-detalle-editar', 'borde']])
        pg.screenshot(path=os.path.join(SALIDA, 'a6-detalle-sustituir-%s.png' % modo))
        pg.evaluate("() => document.querySelectorAll('dialog[open]').forEach(d => d.close())")
        # Supervisión: «Por calle»
        pg.evaluate("SRP.app.mostrarVista('supervision')"); pg.wait_for_timeout(3000)
        medidas += pg.evaluate(MEDIR, [['Supervisión «Por calle»: «entre … y …»', '.sup-tramos', ''], ['Supervisión: subtítulo de cada red', '.sup-subtitulo', '']])
        # Marcas de sustituto en la ficha de una jornada con sustituto, si la demostración la trae
        medidas += pg.evaluate(MEDIR, [['marca «sustituto» (texto)', '.marca-sustituto', ''], ['insignia de jornada «sust»', '.insignia-jornada[data-tono=sust]', ''], ['número de punto sustituto', '.punto-num[data-tono=sust]', '']])
        res['pagina'][modo] = medidas
        for m in medidas: print(modo, m, flush=True)
        ctx.close()

    # ===== Parte 2: el círculo del margen del GPS sobre los dos mapas base =====
    LUGARES = [('centro', 19.4326, -99.1332), ('chapultepec', 19.4204, -99.1819)]
    NIVELES = [('buena', 8), ('aceptable', 25), ('baja', 60)]
    def lum(c):
        v = [x / 255 for x in c[:3]]; v = [x / 12.92 if x <= 0.03928 else ((x + 0.055) / 1.055) ** 2.4 for x in v]
        return 0.2126 * v[0] + 0.7152 * v[1] + 0.0722 * v[2]
    def razon(a, b):
        l1, l2 = lum(a), lum(b); return round((max(l1, l2) + 0.05) / (min(l1, l2) + 0.05), 2)
    for base in ('satelite', 'calles'):
        for (lugar, lat, lng) in LUGARES:
            for (nivel, acc) in NIVELES:
                ctx = b.new_context(viewport={'width': 390, 'height': 844}, device_scale_factor=1, timezone_id='America/Mexico_City', service_workers='block',
                                    geolocation={'latitude': lat, 'longitude': lng, 'accuracy': acc}, permissions=['geolocation'])
                ctx.add_init_script("try { localStorage.setItem('srp_mapa_base', '%s'); } catch (e) {}" % base)
                pg = ctx.new_page()
                pg.goto(BASE); pg.wait_for_selector('html[data-listo]', state='attached', timeout=60000)
                pg.select_option('#sel-usuario-prueba', 'u-cabo-1'); pg.click('#btn-entrar-prueba'); pg.wait_for_function("() => SRP.sesion && SRP.sesion.usuario"); pg.wait_for_timeout(1500)
                pg.evaluate("() => document.querySelectorAll('dialog[open]').forEach(d => d.close())")
                pg.evaluate("SRP.app.mostrarVista('registrar')"); pg.wait_for_timeout(800)
                if pg.is_visible('#panel-iniciar-jornada'):
                    pg.fill('#ini-nombre', 'Mapa r2'); pg.select_option('#ini-programa', 'p-refor'); pg.fill('#ini-meta', '5'); pg.click('#btn-ini-hoy')
                    pg.click('#btn-ini-detectar'); pg.wait_for_timeout(1200); pg.click('#btn-iniciar-jornada'); pg.wait_for_timeout(1500)
                pg.evaluate("() => document.querySelectorAll('dialog[open]').forEach(d => d.close())")
                pg.click('#btn-ubicacion'); pg.wait_for_timeout(1500)
                pg.evaluate("() => { document.getElementById('mapa').scrollIntoView({ block: 'center' }); }"); pg.wait_for_timeout(600)
                # El mapa se acerca al punto; se espera a que carguen los mosaicos
                try: pg.wait_for_function("() => { const m = SRP.mapa.mapa; let ok = true; m.eachLayer(l => { if (l._tiles && Object.values(l._tiles).some(t => !t.loaded)) ok = false; }); return ok; }", timeout=20000)
                except Exception: pass
                pg.wait_for_timeout(1200)
                info = pg.evaluate("""() => { const m = SRP.mapa.mapa, c = SRP.mapa.margen; if (!c) return null; const r = m.getContainer().getBoundingClientRect();
                  const centro = m.latLngToContainerPoint(c.getLatLng()); const borde = m.latLngToContainerPoint(L.latLng(c.getLatLng().lat, c.getLatLng().lng + c.getRadius() / (111320 * Math.cos(c.getLatLng().lat * Math.PI / 180))));
                  return { x: r.left + centro.x, y: r.top + centro.y, radio: Math.abs(borde.x - centro.x), color: c.options.color, zoom: m.getZoom(), nivel: (document.querySelector('#mapa-estado .precision') || {}).dataset }; }""")
                ruta = os.path.join(SALIDA, 'a6-mapa-%s-%s-%s.png' % (base, lugar, nivel))
                pg.screenshot(path=ruta)
                # El mismo mapa sin el círculo: el fondo real que el trazo tapa
                pg.evaluate("() => { if (SRP.mapa.margen) SRP.mapa.margen.setStyle({ opacity: 0, fillOpacity: 0 }); }"); pg.wait_for_timeout(300)
                ruta0 = ruta.replace('.png', '-sin.png'); pg.screenshot(path=ruta0)
                ctx.close()
                if not info:
                    res['mapa'].append([base, lugar, nivel, 'sin círculo']); print(base, lugar, nivel, 'sin círculo'); continue
                im0 = Image.open(ruta0).convert('RGB')
                import math
                trazo = tuple(int(info['color'][i:i + 2], 16) for i in (1, 3, 5))
                rs = []
                for k in range(6, 31):   # la mitad de abajo (de 30 a 150 grados): arriba del centro está el marcador
                    a = 2 * math.pi * k / 36
                    for dr in (-1, 0, 1):
                        x = int(round(info['x'] + (info['radio'] + dr) * math.cos(a))); y = int(round(info['y'] + (info['radio'] + dr) * math.sin(a)))
                        if 0 <= x < im0.width and 0 <= y < im0.height: rs.append(razon(trazo, im0.getpixel((x, y))))
                rs.sort()
                fila = [base, lugar, nivel, info['color'], round(info['radio'], 1), info['zoom'], 'mediana %.2f' % statistics.median(rs), 'p10 %.2f' % rs[len(rs) // 10],
                        'mínimo %.2f' % rs[0], 'bajo 3:1: %d de %d' % (sum(1 for r in rs if r < 3), len(rs))]
                res['mapa'].append(fila); print(*fila, flush=True)
    json.dump(res, open(os.path.join(SALIDA, 'a6-contraste.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    b.close()
