from playwright.sync_api import sync_playwright
URL='http://127.0.0.1:8099/'
# ancho, escala (zoom del navegador: escala<1 = alejado), nombre
CASOS=[(360,1,'telefono-chico'),(390,1,'telefono'),(768,1,'tableta'),(1280,1,'escritorio'),(1920,1,'pantalla-grande'),
       (1280,0.5,'escritorio-zoom-50'),(1280,0.67,'escritorio-zoom-67'),(1280,2,'escritorio-zoom-200')]
problemas=[]
with sync_playwright() as p:
  b=p.chromium.launch()
  for ancho, escala, nombre in CASOS:
    ctx=b.new_context(viewport={'width':int(ancho/escala),'height':int(900/escala)},
                      geolocation={'latitude':19.4326,'longitude':-99.1332},permissions=['geolocation'])
    pg=ctx.new_page(); pg.goto(URL); pg.wait_for_timeout(700)
    # Cada vista se revisa con el perfil que la tiene: la administración no captura, y el cabo
    # no ve catálogos ni cuentas.
    for vista, quien in [('registrar','u-cabo-1'), ('registros','u-admin-1'), ('jornadas','u-admin-1'), ('galeria','u-admin-1'), ('reportes','u-cabo-1'),
                         ('catalogos','u-admin-1'), ('usuarios','u-admin-1')]:
      if pg.is_visible('#btn-cuenta'): pg.click('#btn-cuenta'); pg.click('#btn-cambiar-perfil'); pg.wait_for_timeout(300)
      pg.select_option('#sel-usuario-prueba', quien); pg.click('#btn-entrar-prueba'); pg.wait_for_timeout(500)
      pg.evaluate(f"SRP.app.mostrarVista('{vista}')"); pg.wait_for_timeout(500)
      # Nuevo registro pide iniciar una jornada (D119): se inicia para revisar el formulario con su mapa
      if vista=='registrar' and pg.is_visible('#panel-iniciar-jornada'):
        pg.fill('#ini-nombre','Jornada de revisión'); pg.click('#btn-ini-hoy'); pg.click('#btn-iniciar-jornada'); pg.wait_for_timeout(600)
      # Jornadas se revisa con una jornada abierta: es la pantalla con mapa, conciliación y lista
      if vista=='jornadas' and pg.locator('#lista-jornadas .jornada button').count():
        pg.click('#lista-jornadas .jornada button >> nth=0'); pg.wait_for_timeout(700)
      if not pg.is_visible('#vista-'+vista):
        problemas.append(f"{nombre}/{vista}: la vista no abrio con {quien}")
        continue
      # desbordamiento horizontal
      # Lo que la persona nota: que la página entera se pueda arrastrar de lado
      desb=pg.evaluate("""() => {
        const d=document.documentElement;
        if (d.scrollWidth <= d.clientWidth + 1) return null;
        const culpables=[...document.querySelectorAll('body *')].filter(e=>{
          const r=e.getBoundingClientRect(); const est=getComputedStyle(e);
          if (est.visibility==='hidden' || est.position==='absolute' || est.position==='fixed') return false;
          if (e.closest('.leaflet-container') || e.closest('.tabla-caja')) return false;
          return r.width>0 && r.right > d.clientWidth + 1;
        }).slice(0,4).map(e=>e.tagName.toLowerCase()+'.'+(e.className.toString().split(' ')[0]||''));
        return {ancho:d.scrollWidth, visible:d.clientWidth, culpables};
      }""")
      if desb:
        problemas.append(f"{nombre}/{vista}: la pagina se arrastra de lado ({desb['ancho']}>{desb['visible']}px) -> {desb['culpables'] or 'sin culpable claro'}")
      # alto del mapa
      if vista=='registrar':
        h=pg.evaluate("document.getElementById('mapa').getBoundingClientRect().height")
        # En computadora el mapa va en su propia columna y puede crecer hasta 520 px (D109)
        tope = 530 if int(ancho/escala) >= 1024 else 430
        if h>tope or h<255: problemas.append(f"{nombre}: mapa mide {h:.0f}px")
      # Reglas que otra más específica puede estar anulando sin avisar
      anuladas=pg.evaluate("""() => {
        const esperado = [
          ['.zona-foto', 'flexDirection', 'column'],
          ['.ficha-foto', 'display', 'flex'],
          ['.revision-fila', 'display', 'grid'],
          ['.encabezado-interior', 'display', 'flex']
        ];
        return esperado.filter(([sel, prop, val]) => {
          const e = document.querySelector(sel);
          // Un elemento oculto no tiene estilo que comprobar: lo que importa es cuando se ve
          if (!e || e.hidden || e.offsetParent === null) return false;
          return getComputedStyle(e)[prop] !== val;
        }).map(([sel, prop, val]) => sel + ' deberia tener ' + prop + ':' + val);
      }""")
      if anuladas: problemas.append(f"{nombre}/{vista}: estilo anulado -> {anuladas}")

      # controles por debajo del tamaño tocable
      # Los controles propios; los de la atribución de Leaflet no son nuestros
      chicos=pg.evaluate("""() => [...document.querySelectorAll('main button:not([hidden]), main a, main select, main input:not([type=file])')]
        .filter(e=>{const r=e.getBoundingClientRect();
          return !e.closest('.leaflet-container') && !e.closest('[aria-hidden=true]') && !e.classList.contains('oculto-visual') && r.width>0 && r.height>0 && r.height<24;})
        .slice(0,3).map(e=>e.tagName.toLowerCase()+'.'+(e.className.toString().split(' ')[0]||'')+' h='+Math.round(e.getBoundingClientRect().height))""")
      if chicos: problemas.append(f"{nombre}/{vista}: controles menores de 24px -> {chicos}")
    pg.screenshot(path=f'rev_{nombre}.png', full_page=(escala==1 and ancho<800))
    ctx.close()
  b.close()
print('\n'.join(problemas) if problemas else 'sin problemas de desbordamiento, alto de mapa ni tamaño de controles')
