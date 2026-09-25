# RECORRIDO COMPLETO. El sistema arranca vacío: lo que hace falta para probar se captura aquí.
from playwright.sync_api import sync_playwright
import re, os, json
BASE='http://127.0.0.1:8099/'
# La fecha de hoy se calcula: escrita a mano, la prueba caducaba al día siguiente (los
# registros «de hoy» dejaban de serlo y el filtro Hoy quedaba vacío)
import datetime
HOY=datetime.date.today().isoformat()
MESES=['ENE','FEB','MAR','ABR','MAY','JUN','JUL','AGO','SEP','OCT','NOV','DIC']
HOY_TXT=HOY[8:10]+'-'+MESES[int(HOY[5:7])-1]+'-'+HOY[0:4]   # como lo pinta SRP.util.formatearFecha
HOY_CHIP=HOY[8:10]+'-'+MESES[int(HOY[5:7])-1]+'-'+HOY[2:4]  # el atajo «Hoy», con el año en dos cifras (D147)
SRP_GPS='GPS del dispositivo'
errores=[]; res=[]
def ok(c,m): res.append(('OK ' if c else 'FALLA ')+m)

def esperar(pg, expr, ms):
    """Espera a que la expresión sea verdadera, preguntando desde aquí. No se usa wait_for_function:
    Playwright la compila con eval dentro de la página, y la política de seguridad (D150) lo impide."""
    for _ in range(max(1, ms // 200)):
        if pg.evaluate(expr): return True
        pg.wait_for_timeout(200)
    return bool(pg.evaluate(expr))

def accion(pg, cont, cual, n=0):
    """Elige una acción de renglón: abre la tuerca del renglón y pulsa la opción (D94).
    `cont` es un selector o un locator que contiene el renglón."""
    loc = (pg.locator(cont) if isinstance(cont, str) else cont).locator('button[data-accion=%s]' % cual).nth(n)
    loc.locator('xpath=ancestor::div[contains(@class,"acciones-menu")]').locator('.btn-tuerca').click()
    pg.wait_for_timeout(120)
    loc.click()

def abrir_filtros(pg):
    """En teléfono los filtros de Registros van plegados (D100): se abren antes de usarlos."""
    if pg.is_visible('#btn-filtros') and pg.get_attribute('#btn-filtros','aria-expanded')!='true':
        pg.click('#btn-filtros'); pg.wait_for_timeout(150)

def iniciar_jornada(pg, nombre, fecha=None, comentarios='', programa='p-refor'):
    """Declara una jornada desde Nuevo registro (D119). Si ya hay una activa, abre otra con «Cambiar de jornada»."""
    if not pg.is_visible('#vista-registrar'): pg.evaluate("SRP.app.mostrarVista('registrar')"); pg.wait_for_timeout(400)
    if pg.is_hidden('#panel-iniciar-jornada'):
        pg.click('#btn-jornada-cambiar'); pg.wait_for_timeout(200); pg.click('#btn-cambiar-nueva'); pg.wait_for_timeout(300)
    pg.fill('#ini-nombre', nombre); pg.fill('#ini-fecha', fecha or HOY)
    pg.select_option('#ini-programa', programa)   # el programa es de la jornada (D130)
    pg.fill('#ini-meta', '10')                      # y la meta de árboles también (D131)
    if comentarios: pg.fill('#ini-comentarios', comentarios)
    pg.click('#btn-iniciar-jornada'); pg.wait_for_timeout(500)
    return pg.evaluate("SRP.activa.jornada && SRP.activa.jornada.id")

def reporte_de(pg, nombre=None):
    """Abre el cierre del reporte de una jornada cerrada desde Reportes (D134): la primera de la lista,
    o la que contenga `nombre`. Devuelve cuántas fichas había."""
    if not pg.is_visible('#vista-reportes'): pg.evaluate("SRP.app.mostrarVista('reportes')"); pg.wait_for_timeout(500)
    pg.evaluate("SRP.reportes.aplicarAtajo('todas')"); pg.wait_for_timeout(300)
    fichas = pg.locator('#pdf-lista .jornada')
    n = fichas.count()
    (pg.locator('#pdf-lista .jornada', has_text=nombre) if nombre else fichas.nth(0)).locator('button[data-id]').click(); pg.wait_for_timeout(500)
    return n

def registrar(pg, busqueda, especie_id, programa='p-refor', fecha=None, foto=None):
    """Captura un árbol de principio a fin y devuelve el identificador con que se guardó.
    `busqueda` es lo que se teclea para que la especie salga en la lista. Con `fecha` distinta de
    la jornada activa, inicia una jornada de ese día (la fecha se hereda de la jornada, D119)."""
    activa=pg.evaluate("SRP.activa.jornada && SRP.activa.jornada.fecha")
    if activa != (fecha or HOY) or pg.is_visible('#panel-iniciar-jornada'):
        iniciar_jornada(pg, 'Jornada de prueba ' + (fecha or HOY), fecha or HOY)
    pg.click('#btn-ubicacion'); pg.wait_for_timeout(700)
    pg.fill('#campo-especie', busqueda); pg.wait_for_timeout(200)
    pg.dispatch_event('.combo-opcion[data-id="%s"]' % especie_id, 'mousedown'); pg.wait_for_timeout(150)
    # El programa se hereda de la jornada y el campo va oculto (D132); la prueba lo fija en el dato para poder variarlo
    pg.evaluate("document.getElementById('campo-programa').value = '%s'" % programa); pg.wait_for_timeout(100)
    if foto: pg.set_input_files('#foto-archivo', foto); pg.wait_for_timeout(800)
    editando = pg.evaluate("SRP.formulario.estado.editando ? SRP.formulario.estado.editando.id : null")
    pg.click('#form-plantacion button[type=submit]'); pg.wait_for_timeout(800)
    # Una jornada que no es de hoy se confirma una vez (D133)
    if pg.is_visible('#dlg-confirmar'): pg.click('#btn-confirmar-si'); pg.wait_for_timeout(800)
    # Con precisión buena y sin avisos se guarda de una vez (D130); si algo hay que revisar, la ficha pide confirmar
    if pg.is_visible('#dlg-resumen'): pg.click('#btn-resumen-guardar'); pg.wait_for_timeout(600)
    pg.wait_for_timeout(300)
    return editando or pg.evaluate("SRP.formulario.estado.ultimoGuardado")

with sync_playwright() as p:
    b=p.chromium.launch()
    ctx=b.new_context(viewport={'width':390,'height':844},geolocation={'latitude':19.432,'longitude':-99.133},
                      permissions=['geolocation'],accept_downloads=True,device_scale_factor=2)
    pg=ctx.new_page()
    pg.on('console', lambda m: m.type=='error' and 'net::' not in m.text and 'Failed to load' not in m.text and errores.append(m.text))
    pg.on('pageerror', lambda e: errores.append(str(e)))
    pg.goto(BASE); pg.wait_for_timeout(1200)

    # ---------- ACCESO ----------
    ok(pg.is_visible('#vista-acceso'),'la pantalla de acceso abre primero')
    # La marca se lee de index.html, no se escribe aquí: así la prueba no caduca en cada bloque
    MARCA=re.search(r'js/config\.js\?v=([\w.]+)', open(os.path.join(os.path.dirname(__file__), '..', 'index.html'), encoding='utf-8').read()).group(1)
    ok(MARCA in pg.inner_text('#version'),'la versión sale de la marca del archivo: '+pg.inner_text('#version'))
    sinmarca=pg.evaluate("""() => [...document.querySelectorAll('script[src],link[rel=stylesheet][href]')]
        .map(e=>e.src||e.href).filter(u=>u.includes('127.0.0.1')&&!u.includes('?v=')).length""")
    ok(sinmarca==0,'todos los archivos propios llevan marca de versión')
    ok(pg.locator('#form-acceso .obligatorio').count()==3,'el acceso marca sus campos obligatorios y lo explica')
    faltan=pg.evaluate("""() => [...document.querySelectorAll('input[required],select[required]')]
        .filter(e=>{const l=document.querySelector('label[for='+CSS.escape(e.id)+']'); return !l||!l.querySelector('.obligatorio');})
        .map(e=>e.id)""")
    ok(faltan==[],'todo campo obligatorio lleva asterisco: faltan '+str(faltan))
    ok(pg.locator('#sel-usuario-prueba option').count()==3,'sólo hay tres cuentas de arranque')

    pg.click('#form-acceso button[type=submit]'); pg.wait_for_timeout(150)
    ok(pg.locator('#acceso-errores li').count()==2,'el acceso vacío pide correo y contraseña')
    pg.fill('#acceso-correo','nadie@ejemplo.local'); pg.fill('#acceso-clave','x')
    pg.click('#form-acceso button[type=submit]'); pg.wait_for_timeout(150)
    ok('no está dado de alta' in pg.inner_text('#acceso-errores'),'un correo desconocido se rechaza')
    pg.fill('#acceso-correo','CABO@Ejemplo.Local'); pg.fill('#acceso-clave','loquesea')
    pg.click('#form-acceso button[type=submit]'); pg.wait_for_timeout(700)
    ok(pg.is_visible('#vista-registrar') and 'Fulana' in pg.inner_text('#usuario-nombre'),'se entra con el correo, sin importar mayúsculas')
    ok('Cabo' in pg.inner_text('#usuario-perfil'),'y el perfil dice Cabo: '+pg.inner_text('#usuario-perfil'))
    ok(pg.is_hidden('#menu-cuenta') and pg.is_visible('#btn-cuenta') and pg.locator('#btn-cuenta svg').count()==1,'la cuenta es un botón con icono; nombre y salidas van plegados (D93)')
    pg.click('#btn-cuenta'); pg.wait_for_timeout(150)
    ok(pg.get_attribute('#btn-cuenta','aria-expanded')=='true' and pg.is_visible('#usuario-nombre') and pg.is_visible('#btn-cerrar-sesion'),'al tocarlo muestra nombre, perfil y cerrar sesión')
    ok(pg.is_visible('#btn-cambiar-perfil'),'y cambiar de usuario, mientras haya datos de prueba')
    # Modo sol (D106): interruptor en el menú; sube el contraste y se recuerda en el dispositivo
    ok(pg.get_attribute('#btn-contraste','role')=='switch' and pg.get_attribute('#btn-contraste','aria-checked')=='false','el menú ofrece «Modo sol», apagado de inicio (D106)')
    pg.click('#btn-contraste'); pg.wait_for_timeout(150)
    sol=pg.evaluate("(() => ({ modo: document.documentElement.dataset.contraste, marcado: document.getElementById('btn-contraste').getAttribute('aria-checked'), texto: getComputedStyle(document.body).color, guardado: localStorage.getItem(SRP.CONFIG.CLAVE_CONTRASTE) }))()")
    ok(sol=={'modo':'alto','marcado':'true','texto':'rgb(0, 0, 0)','guardado':'alto'},'al activarlo el texto pasa a negro y la preferencia se guarda (D106): %s' % sol)
    pg.click('#btn-contraste'); pg.wait_for_timeout(150)
    ok(pg.evaluate("document.documentElement.dataset.contraste") is None and pg.evaluate("localStorage.getItem(SRP.CONFIG.CLAVE_CONTRASTE)")=='normal','y se apaga igual')
    pg.mouse.move(1,1)   # el puntero quedaba sobre el botón de ubicación y pintaba su estado hover
    pg.keyboard.press('Escape'); pg.wait_for_timeout(100)
    ok(pg.is_hidden('#menu-cuenta'),'Escape cierra el menú de la cuenta')
    ok(pg.locator('#herramientas-prueba #btn-cambiar-perfil').count()==0,'ya no está duplicado al pie')

    # ---------- INICIAR JORNADA (D119) ----------
    ok(pg.is_visible('#panel-iniciar-jornada') and pg.is_hidden('#registrar-columnas'),'sin jornada abierta, Nuevo registro pide iniciar una antes del formulario (D119)')
    ok(pg.is_hidden('#btn-iniciar-cancelar'),'y sin jornada no hay «Cancelar»: no hay a dónde volver')
    ok(pg.input_value('#ini-fecha')=='' and pg.get_attribute('#ini-fecha','max')==HOY,'la fecha de la jornada arranca vacía y no admite futuro (D29, D120)')
    pg.click('#btn-iniciar-jornada'); pg.wait_for_timeout(300)
    ok(pg.is_visible('#ini-errores') and 'nombre' in pg.inner_text('#ini-errores').lower() and 'fecha' in pg.inner_text('#ini-errores').lower(),'sin nombre ni fecha no se inicia: '+pg.inner_text('#ini-errores').replace('\n',' | '))
    pg.fill('#ini-nombre','Parque Hundido'); pg.fill('#ini-fecha','2030-01-01'); pg.click('#btn-iniciar-jornada'); pg.wait_for_timeout(300)
    ok('posterior a hoy' in pg.inner_text('#ini-errores'),'ni con fecha futura')
    pg.click('#btn-ini-hoy'); pg.wait_for_timeout(200)
    ok(pg.input_value('#ini-fecha')==HOY,'«Hoy» pone la fecha de un toque (D120)')
    # Detectar la ubicación de la jornada (D122): el botón va antes del campo de ubicación, llena alcaldía y colonia y no toca lo escrito
    orden=pg.evaluate("[...document.querySelectorAll('#form-iniciar-jornada button, #form-iniciar-jornada input, #form-iniciar-jornada output')].map(e => e.id)")
    ok(orden.index('btn-ini-detectar') < orden.index('ini-ubicacion') and orden.index('ini-nombre') < orden.index('btn-ini-detectar'),'el botón «Detectar ubicación» está entre el nombre y el campo de ubicación (D122): %s' % orden[:5])
    ok(pg.inner_text('#ini-alcaldia')=='—' and pg.inner_text('#ini-colonia')=='—' and 'btn-primario' in pg.get_attribute('#btn-ini-detectar','class') and 'Detectar ubicación' in pg.inner_text('#btn-ini-detectar'),'antes de detectar: guiones, botón guinda con su icono')
    pg.fill('#ini-ubicacion','Av. Insurgentes Sur 1500, Benito Juárez')
    pg.click('#btn-ini-detectar'); pg.wait_for_timeout(700)
    det=[pg.inner_text('#ini-alcaldia'), pg.inner_text('#ini-colonia'), pg.inner_text('#ini-detectado'), pg.get_attribute('#btn-ini-detectar','class'), pg.input_value('#ini-ubicacion')]
    ok(det[0]=='Cuauhtémoc' and det[1] and det[1]!='—' and 'detectada' in det[2] and 'btn-editar' in det[3] and det[4]=='Av. Insurgentes Sur 1500, Benito Juárez','al tocarlo se llenan alcaldía y colonia, el botón pasa a dorado y lo escrito en Ubicación se conserva: %s' % det)
    pg.fill('#ini-comentarios','Jornada de prueba con la comunidad'); pg.click('#btn-iniciar-jornada'); pg.wait_for_timeout(400)
    ok('programa' in pg.inner_text('#ini-errores').lower() and 'plantar' in pg.inner_text('#ini-errores').lower(),'sin programa ni meta no se inicia la jornada (D130, D131)')
    pg.select_option('#ini-programa','p-refor'); pg.fill('#ini-meta','25'); pg.click('#btn-iniciar-jornada'); pg.wait_for_timeout(600)
    ok(pg.is_hidden('#panel-iniciar-jornada') and pg.is_visible('#registrar-columnas') and pg.is_visible('#franja-jornada'),'con la jornada iniciada aparece el formulario con su franja')
    ok(pg.input_value('#campo-programa')=='p-refor' and pg.evaluate("SRP.activa.jornada.programa_id")=='p-refor' and 'Reforestación' in pg.inner_text('#franja-jornada'),'el programa de la jornada queda guardado, se hereda en el formulario y se lee en la franja (D130)')
    ok(pg.evaluate("SRP.activa.jornada.meta_arboles")==25 and '0 de 25' in pg.inner_text('#franja-jornada') and 'JORNADA ACTIVA' in pg.inner_text('#franja-jornada').upper() and pg.is_visible('#titulo-arbol') and pg.inner_text('#titulo-arbol')=='Nuevo árbol',
       'la meta queda en la jornada; el panel dice «Jornada activa» y «0 de 25», y el formulario empieza con su título «Nuevo árbol» (D131): '+pg.inner_text('#franja-jornada').replace('\n',' '))
    ok('Parque Hundido' in pg.inner_text('#franja-jornada') and HOY_TXT in pg.inner_text('#franja-jornada') and '0 de 25 árboles' in pg.inner_text('#franja-jornada'),'la franja dice la jornada, su fecha y cuántos árboles lleva: '+pg.inner_text('#franja-jornada').replace('\n',' '))
    jor=pg.evaluate("async () => { const j = (await SRP.almacen.todos('jornadas'))[0]; return [j.nombre, j.ubicacion, j.fecha, j.comentarios, j.estatus, j.cabo_id]; }")
    ok(jor==['Parque Hundido', 'Av. Insurgentes Sur 1500, Benito Juárez', HOY, 'Jornada de prueba con la comunidad', 'abierta', 'u-cabo-1'],'la jornada queda guardada con su ubicación, abierta y a nombre del cabo: %s' % jor)
    ok('Insurgentes' in pg.inner_text('#franja-jornada') and 'Alcaldía Cuauhtémoc' in pg.inner_text('#franja-jornada'),'y la franja muestra la ubicación escrita y la colonia y alcaldía detectadas: '+pg.inner_text('#franja-jornada').replace('\n',' '))
    geo=pg.evaluate("async () => { const j = (await SRP.almacen.todos('jornadas'))[0]; return [j.alcaldia, j.alcaldia_cve, !!j.colonia, !!j.colonia_cve, typeof j.lat, typeof j.gps_precision_m, j.punto_origen]; }")
    ok(geo[0]=='Cuauhtémoc' and geo[1] and geo[2] and geo[3] and geo[4]=='number' and geo[5]=='number' and geo[6]=='gps','la jornada guarda punto, precisión, alcaldía y colonia con sus claves, y que el punto vino del GPS (D122, D143): %s' % geo)
    # Sin tocar el botón, la jornada se guarda sin punto: nada se inventa
    sin=pg.evaluate("""async () => { SRP.activa.mostrarInicio(true); const antes = [document.getElementById('ini-alcaldia').textContent, document.getElementById('btn-ini-detectar').className.includes('btn-primario')];
      document.getElementById('ini-nombre').value = 'Sin detectar'; document.getElementById('ini-programa').value = 'p-refor'; document.getElementById('ini-meta').value = '5'; document.getElementById('btn-ini-hoy').click(); await SRP.activa.iniciarJornada();
      const j = SRP.activa.jornada; return [antes, j.lat, j.alcaldia, j.colonia_cve]; }""")
    ok(sin==[['—',True],None,None,None],'al abrir otra vez el panel vuelve a los guiones, y sin detectar la jornada queda con punto y alcaldía nulos: %s' % sin)
    # La jornada de prueba se retira para no alterar el resto de las pruebas; la primera vuelve a ser la activa
    pg.evaluate("async () => { const j = SRP.activa.jornada; await SRP.almacen.borrarConBitacora('jornadas', j.id, SRP.bitacora.entrada('ELIMINADO', 'jornada', j.id, 'Prueba')); SRP.activa.jornada = null; await SRP.activa.preparar(); }")
    pg.wait_for_timeout(300)
    ok('Parque Hundido' in pg.inner_text('#franja-jornada'),'y «Parque Hundido» sigue siendo la jornada activa')
    # Sin jornada no hay forma de registrar (D120): el formulario no se ve, ni en computadora, y sus botones devuelven al inicio
    bloqueo=pg.evaluate("""async () => { const j = SRP.activa.jornada; SRP.activa.jornada = null; SRP.activa.mostrarInicio(true);
      const oculto = getComputedStyle(document.getElementById('registrar-columnas')).display === 'none';
      document.getElementById('btn-ubicacion').click(); const sigue = !document.getElementById('panel-iniciar-jornada').hidden;
      SRP.activa.jornada = j; await SRP.activa.preparar(); return [oculto, sigue]; }""")
    ok(bloqueo==[True,True],'sin jornada el formulario no se muestra ni responde: %s' % bloqueo)
    ok(pg.is_hidden('#campo-fecha'),'la fecha de plantación ya no se pide por árbol: se hereda de la jornada')

    # ---------- REGISTRAR ----------
    # A nombre de quién se registra lo dice el encabezado; no se repite como campo
    ok(pg.locator('#campo-cabo').count()==0,'la pantalla no repite el nombre de quien captura')
    ok(pg.locator('#form-plantacion .nota-obligatorio').count()==0,'ni la nota del asterisco en el formulario del árbol')
    ok(pg.evaluate("['campo-especie','campo-otra-especie'].every(i=>{const e=document.getElementById(i); return e.spellcheck===false && e.getAttribute('autocorrect')==='off' && e.getAttribute('autocapitalize')==='off';})"),
       'los nombres de especie no pasan por corrector ni mayúsculas automáticas (D99)')
    ok(pg.evaluate("['campo-especie','campo-programa'].every(i=>document.getElementById(i).required)"),
       'lo obligatorio lo anuncia el atributo required, no sólo el asterisco')
    orden=pg.evaluate("""()=>{const t=document.getElementById('vista-registrar').innerHTML;
        return [t.indexOf('btn-ubicacion'), t.indexOf('id="detalles-coord"'), t.indexOf('id="mapa"')];}""")
    ok(orden[0]<orden[1]<orden[2],'orden: botón de ubicación, captura a mano y luego el mapa')
    rev=pg.evaluate("(() => { const b=document.getElementById('btn-revisar'); const r=b.getBoundingClientRect(); const m=document.getElementById('form-plantacion').getBoundingClientRect(); return { verde: getComputedStyle(b).backgroundColor, icono: !!b.querySelector('svg'), alto: Math.round(r.height), ancho: Math.round(r.width), formulario: Math.round(m.width) }; })()")
    ok(rev['verde']=='rgb(30, 122, 70)' and rev['icono'] and rev['alto']>=56 and rev['ancho']>=rev['formulario']-2,
       '«Guardar» es verde, con disco, alto y de margen a margen en teléfono (D130): %s' % rev)
    ok(pg.locator('.leaflet-marker-icon').count()==0,'la ubicación no se pide sola')
    # Aquí las teselas no cargan (la red de la sesión bloquea al proveedor) y ese aviso pisa al
    # inicial. Lo que se comprueba es lo que importa: el mapa nunca queda mudo sobre qué hacer.
    msj=pg.inner_text('#mapa-estado')
    ok(any(t in msj for t in ['botón de ubicación','tocar el mapa','capturar coordenadas']),
       'el mapa siempre dice cómo colocar el punto: '+msj[:60]+'…')
    capas=pg.evaluate("SRP.CONFIG.MAPA.CAPAS.map(c=>c.url)")
    ok('World_Imagery' in capas[0] and len(capas)==3,'la capa de abajo es satélite, con nombres encima')
    ok('Esri' in pg.text_content('.leaflet-control-attribution'),'se muestra la atribución del proveedor')
    cred=pg.evaluate("(() => { const a=document.querySelector('.leaflet-control-attribution'); const h1=a.getBoundingClientRect().height; a.click(); const h2=a.getBoundingClientRect().height; a.click(); return { un_renglon: h1 < 22, se_abre: h2 > h1, bandera: !!a.querySelector('svg') }; })()")
    ok(cred=={'un_renglon':True,'se_abre':True,'bandera':False},'en teléfono el crédito del mapa ocupa un renglón y al tocarlo se ve completo (D108): %s' % cred)
    ok(pg.locator('#acceso-clave').count()==0 and pg.get_attribute('#campo-comentarios','autocomplete')=='off' and pg.get_attribute('#form-plantacion','autocomplete')=='off',
       'con sesión abierta no hay campo de contraseña en la página y los campos piden no autollenar (D108)')

    # ESCALA DE ÉNFASIS: una acción de apoyo nunca se pinta como la principal de la pantalla.
    # Eran las dos guindas y no se distinguía cuál era el camino normal.
    enfasis=pg.evaluate("""() => {
      const c = e => getComputedStyle(e).color;
      const principal = document.getElementById('btn-ubicacion');
      return {
        principal_relleno: getComputedStyle(principal).backgroundColor,
        apoyo: c(document.querySelector('#detalles-coord summary')),
        gris: c(document.querySelector('.nota')),
        cerrar_caja: getComputedStyle(document.getElementById('btn-cerrar-sesion')).backgroundColor,
        cerrar_borde: getComputedStyle(document.getElementById('btn-cerrar-sesion')).borderTopWidth,
        cerrar_subrayado: getComputedStyle(document.getElementById('btn-cerrar-sesion')).textDecorationLine
      };
    }""")
    ok(enfasis['principal_relleno']=='rgb(47, 72, 88)','la acción principal es el acento pizarra relleno (D124): '+enfasis['principal_relleno'])
    ok(enfasis['apoyo']==enfasis['gris'],'y la de apoyo va en gris, no en guinda: '+enfasis['apoyo'])
    ok(enfasis['cerrar_borde']=='0px' and enfasis['cerrar_caja'] in ('rgba(0, 0, 0, 0)','transparent') and 'underline' not in enfasis['cerrar_subrayado'],
       'cerrar sesión es un renglón de texto del menú de la cuenta, sin caja ni subrayado (D97): %s' % enfasis)

    # Los datos del punto son campos del formulario, no un recuadro bajo el mapa
    ok(pg.locator('.ficha-datos').count()==0,'bajo el mapa ya no cuelga el recuadro de datos')
    ok(pg.inner_text('#dato-coordenadas')=='—' and pg.inner_text('#dato-alcaldia')=='—',
       'sin punto, los campos del punto están en blanco')
    ok(pg.locator('.campo-punto .campo-lectura').count()==4,
       'coordenadas, origen, alcaldía y colonia son cuatro campos de sólo lectura')
    ok(pg.evaluate("['dato-coordenadas','dato-origen','dato-alcaldia','dato-colonia'].every(i=>document.querySelector('label[for='+i+']'))"),
       'y cada uno lleva su etiqueta, como cualquier campo')

    # ESPEJO DE CAMPOS (sólo en la versión de prueba; se elimina al cerrar la Etapa 1).
    # Lo que importa no es que pinte una tabla, sino que no pueda mentir: lo que enseña sale
    # del mismo objeto que escribe Guardar, y entre lo visible y el espejo no puede faltar
    # ningún campo del registro. Si alguien agrega uno nuevo y lo olvida, esto falla.
    ok(pg.is_visible('#espejo-campos'),'el espejo de campos aparece con datos de prueba')
    ok(pg.evaluate("!document.querySelector('#espejo-campos details').open && !document.getElementById('espejo-cierre').open"),'y sale plegado: «Campos que viajan a la base…» se abre sólo cuando se quiere revisar')
    cobertura=pg.evaluate("""() => {
      const registro = SRP.formulario.registroPrevisto();
      const enEspejo = [...document.querySelectorAll('#espejo-cuerpo .espejo-campo')].map(e=>e.textContent);
      const cubiertos = new Set([...SRP.espejo.VISIBLES, ...enEspejo]);
      return { faltan: Object.keys(registro).filter(k=>!cubiertos.has(k)),
               sobran: enEspejo.filter(k=>!(k in registro)),
               cuantos: enEspejo.length };
    }""")
    ok(cobertura['faltan']==[] and cobertura['sobran']==[],
       'ningun campo del registro queda sin enseñarse: faltan %s, sobran %s' % (cobertura['faltan'], cobertura['sobran']))
    ok(cobertura['cuantos']>=12,'el espejo lista los campos ocultos (%d)' % cobertura['cuantos'])
    ok(pg.locator('#espejo-bitacora tr').count()>=8,'y los de la bitácora, que se escribe sola al guardar')
    filaCabo=pg.locator('#espejo-cuerpo tr', has_text='cabo_id').text_content()   # plegado: se lee el contenido, no lo pintado
    ok('u-cabo-1' in filaCabo,'enseña el valor de verdad, no un ejemplo: '+filaCabo.replace(chr(9),' ')[:60])
    antes=pg.locator('#espejo-cuerpo tr', has_text='lat_original').text_content()   # plegado: se lee el contenido, no lo pintado
    ok('—' in antes,'sin punto, lat_original está vacío')

    pg.click('#btn-ubicacion'); pg.wait_for_timeout(800)
    despues=pg.locator('#espejo-cuerpo tr', has_text='lat_original').text_content()   # plegado: se lee el contenido, no lo pintado
    ok('19.' in despues,'y se llena en cuanto hay punto, sin recargar: '+despues.replace(chr(9),' ')[:50])
    ok(pg.inner_text('#dato-alcaldia')=='Cuauhtémoc','el botón ubica y deriva la alcaldía real: '+pg.inner_text('#dato-alcaldia'))
    fic=pg.evaluate("(() => { const c=document.querySelector('.campo-punto .campo-triple .campo'); const r=document.querySelector('.campo-punto .campo-triple').getBoundingClientRect(); return { filas: getComputedStyle(c).display, sin_caja: getComputedStyle(document.getElementById('dato-alcaldia')).borderTopStyle, alto: Math.round(r.height) }; })()")
    ok(fic['filas']=='grid' and fic['sin_caja']=='none' and fic['alto']<170,'en teléfono los datos del punto van en una ficha compacta de renglones etiqueta-valor (D98): %s' % fic)
    pg.focus('#campo-especie'); pg.wait_for_timeout(150)
    ok(pg.is_visible('#lista-especies') and pg.locator('#lista-especies .combo-opcion[aria-selected=true]').count()==0,'al abrir la lista de especies ninguna aparece elegida')
    pg.evaluate("document.getElementById('campo-especie').blur()"); pg.wait_for_timeout(250)
    ok(pg.inner_text('#dato-colonia')=='CENTRO IV','y la colonia real, como viene en la capa: '+pg.inner_text('#dato-colonia'))

    # CAPAS DEL SIA. Puntos conocidos, y los dos defectos de la capa anterior que la definitiva corrige (bloque 38).
    capas=pg.evaluate("""() => {
      const d=(la,lo)=>SRP.derivacion.derivar(la,lo);
      const t0=performance.now(); for (let i=0;i<100;i++) d(19.3+i*0.002,-99.2+i*0.002); const ms=(performance.now()-t0)/100;
      return {
        n:[SRP.CAPAS.alcaldias.geojson.features.length, SRP.CAPAS.uga.geojson.features.length],
        // Colonias (D62): solape U HAB dentro de pueblo, suelo de conservación, colonia cuyo interior cae en otra alcaldía
        solapeCol:d(19.332484,-99.217506), conservacion:d(19.1867,-99.2422), cruzaAlc:d(19.31297,-99.046812),
        nCol:SRP.CAPAS.colonias.geojson.features.length,
        zocalo:d(19.4326,-99.1332), ajusco:d(19.2000,-99.2500), milpa:d(19.1000,-99.0200),
        hueco:d(19.483808,-99.149920),
        solape:[d(19.4406,-99.0895).alcaldia, d(19.4406,-99.0895).alcaldia],
        fuera:d(19.60,-99.37).alcaldia, ms:ms.toFixed(2),
        origen:SRP.CAPAS.alcaldias.meta.origen.includes('SIA') && SRP.CAPAS.uga.meta.origen.includes('SIA')
      };
    }""")
    ok(capas['n']==[16,1624],'cargan las 16 alcaldías y las 1,624 UGA del SIA: '+str(capas['n']))
    ok(capas['origen'],'y las capas dicen de dónde vienen')
    ok(capas['zocalo']['alcaldia']=='Cuauhtémoc' and capas['zocalo']['alcaldia_cve']=='09015','el Zócalo deriva Cuauhtémoc con su clave INEGI')
    ok(capas['zocalo']['uga'].startswith('CUH-'),'y una UGA de Cuauhtémoc: '+capas['zocalo']['uga'])
    ok(capas['ajusco']['alcaldia']=='Tlalpan' and capas['milpa']['alcaldia']=='Milpa Alta','el Ajusco es Tlalpan y el sur es Milpa Alta')
    ok(capas['hueco']['alcaldia']=='Gustavo A. Madero' and 'alcaldias=sia-2026-01-01' in capas['hueco']['capa_version'],
       'el punto que caía en el hueco de 1.2 ha ya deriva alcaldía con la capa definitiva: %s (%s)' % (capas['hueco']['alcaldia'], capas['hueco']['capa_version']))
    ok(capas['solape'][0]==capas['solape'][1]=='Venustiano Carranza','el antiguo solape GAM–VCA deriva una sola alcaldía')
    ok(capas['fuera'] is None,'fuera de la ciudad no deriva nada')
    ok(float(capas['ms'])<5,'derivar cuesta menos de 5 ms por punto (%s ms)' % capas['ms'])
    ok('alcaldias=' in capas['zocalo']['capa_version'] and 'uga=' in capas['zocalo']['capa_version'] and 'colonias=' in capas['zocalo']['capa_version'],
       'la versión guarda la de cada capa: '+capas['zocalo']['capa_version'])
    # Capa de colonias (D62)
    ok(capas['nCol']==1837,'la capa de colonias trae las 1,837 unidades territoriales del IECM')
    ok(capas['zocalo']['colonia']=='CENTRO IV' and capas['zocalo']['colonia_cve']=='15-040','el Zócalo deriva CENTRO IV con su clave CVEUT')
    ok(capas['solapeCol']['colonia_cve']=='08-017','en un solape gana la colonia más pequeña (U HAB dentro del pueblo): '+str(capas['solapeCol']['colonia']))
    ok(capas['conservacion']['colonia'] is None and capas['conservacion']['alcaldia']=='Tlalpan','en suelo de conservación hay alcaldía pero no colonia')
    ok(capas['cruzaAlc']['colonia_cve']=='07-010' and capas['cruzaAlc']['alcaldia']=='Tláhuac',
       'la alcaldía sale de su capa aunque la colonia diga otra demarcación: '+capas['cruzaAlc']['alcaldia'])
    ok(pg.inner_text('#dato-coordenadas').count('.')==2,'la coordenada se escribe en su campo: '+pg.inner_text('#dato-coordenadas'))
    ok(',' not in pg.inner_text('#mapa-estado'),'y ya no se repite bajo el mapa: '+pg.inner_text('#mapa-estado'))
    ok('Actualizar ubicación' in pg.inner_text('#btn-ubicacion'),'con punto puesto, el botón pasa a actualizar')
    # Con punto puesto ya no se captura: se corrige, y se ve como todo lo que se corrige
    corr=pg.evaluate("""() => {
      const b = document.getElementById('btn-ubicacion');
      return { clase: b.className, color: getComputedStyle(b).color,
               editar: getComputedStyle(document.documentElement).getPropertyValue('--editar').trim(),
               icono: b.innerHTML.includes(SRP.ICONOS.ubicacion.match(/d="([^"]+)"/)[1]),
               texto: b.textContent.trim() };
    }""")
    ok('btn-editar' in corr['clase'] and corr['color']=='rgb(138, 75, 0)' and corr['editar'].upper()=='#8A4B00',
       'y toma el ámbar de corregir (D124): '+corr['color'])
    ok(corr['icono'] and corr['texto'].startswith('Actualizar'),
       'conserva el icono de ubicación y cambia el texto, porque el color nunca va solo (D48)')

    # DE DÓNDE SALIÓ EL PUNTO. Sin fotografía obligatoria, la coordenada es la prueba, y no
    # todas valen lo mismo. Se comprueba en los cuatro caminos por los que se puede colocar.
    ok(SRP_GPS in pg.inner_text('#dato-origen') and '±' in pg.inner_text('#dato-origen'),
       'el punto del GPS se guarda como tal, con su precisión: '+pg.inner_text('#dato-origen'))
    ok(pg.evaluate("SRP.mapa.origen")=='gps' and isinstance(pg.evaluate("SRP.mapa.precision"), int),
       'y la precisión queda en número, no sólo en el mensaje de pantalla')

    # Al capturar a mano, el margen del aparato deja de describir el punto y se borra
    pg.click('#detalles-coord summary'); pg.wait_for_timeout(200)
    ok(pg.is_visible('#coord-lat'),'el desplegable de captura manual abre al pulsarlo')
    pg.fill('#coord-lat','19.4400'); pg.fill('#coord-lng','-99.1400')
    pg.click('#btn-coord-aplicar'); pg.wait_for_timeout(500)
    ok(pg.evaluate("SRP.mapa.origen")=='manual' and pg.evaluate("SRP.mapa.precision") is None,
       'un punto capturado a mano no hereda la precisión del GPS')
    ok('mano' in pg.inner_text('#dato-origen'),'y lo dice en pantalla: '+pg.inner_text('#dato-origen'))

    # La regla que sostiene el dato: sólo el GPS tiene precisión, pase lo que pase
    invariante=pg.evaluate("""() => {
      const casos = [['gps', 12], ['mapa', 12], ['manual', 12], ['ajustado', 12]];
      const antes = { lat: SRP.mapa.lat, lng: SRP.mapa.lng, origen: SRP.mapa.origen, precision: SRP.mapa.precision };
      const malos = casos.filter(([origen, precision]) => {
        SRP.mapa.colocar(19.4326, -99.1332, 'prueba', { origen, precision });
        return (SRP.mapa.precision !== null) !== (origen === 'gps');
      }).map(c => c[0]);
      SRP.mapa.colocar(antes.lat, antes.lng, 'prueba', { origen: antes.origen, precision: antes.precision });
      return malos;
    }""")
    ok(invariante==[],'la precisión existe si y sólo si el punto vino del GPS; falla en '+str(invariante))

    # Precisión a la vista (D96): insignia con palabra y margen, y círculo sobre el mapa
    prec=pg.evaluate("""() => {
      const antes = { lat: SRP.mapa.lat, lng: SRP.mapa.lng, origen: SRP.mapa.origen, precision: SRP.mapa.precision };
      const ver = (origen, precision) => {
        SRP.mapa.colocar(19.4326, -99.1332, 'Punto colocado.', { origen, precision });
        const i = document.querySelector('#mapa-estado .precision');
        return [i ? i.dataset.nivel : null, i ? i.textContent : '', !!SRP.mapa.margen,
                !!document.querySelector('#mapa-estado .precision-consejo')];
      };
      const r = { buena: ver('gps', 8), aceptable: ver('gps', 25), baja: ver('gps', 60), manual: ver('manual', null) };
      SRP.mapa.colocar(antes.lat, antes.lng, 'prueba', { origen: antes.origen, precision: antes.precision });
      return r;
    }""")
    ok(prec['buena'][:3]==['buena','Precisión buena · ±8 m',True] and not prec['buena'][3],'con ±8 m la precisión es buena, se escribe y se dibuja su círculo: %s' % prec['buena'])
    ok(prec['aceptable'][0]=='aceptable' and prec['aceptable'][3],'con ±25 m es aceptable y aconseja revisar el punto')
    ok(prec['baja'][0]=='baja' and prec['baja'][3],'con ±60 m es baja y dice qué hacer')
    ok(prec['manual'][0] is None and not prec['manual'][2],'un punto a mano no muestra insignia ni círculo')
    ok(pg.evaluate("getComputedStyle(document.querySelector('.barra-guardar')).position")=='sticky','Revisar y guardar va en una barra fija al pie (D96)')
    pg.set_viewport_size({'width':1280,'height':900}); pg.wait_for_timeout(300)
    col=pg.evaluate("(() => { const m=document.getElementById('mapa').getBoundingClientRect(), f=document.getElementById('form-plantacion').getBoundingClientRect(); return { lado_a_lado: f.left >= m.right, arriba_igual: Math.abs(f.top - document.querySelector('.registrar-ubicacion').getBoundingClientRect().top) < 40 }; })()")
    ok(col=={'lado_a_lado':True,'arriba_igual':True},'en computadora el mapa va a la izquierda y el formulario a la derecha (D109): %s' % col)
    pg.set_viewport_size({'width':390,'height':844}); pg.wait_for_timeout(300)

    # Con la captura a mano desplegada no conviven dos formas de fijar el punto: el botón de
    # ubicación se oculta, y vuelve al cerrar el desplegable (D49)
    ok(not pg.is_visible('#btn-ubicacion'),'con la captura a mano abierta, el botón de ubicación se oculta')
    pg.click('#detalles-coord summary'); pg.wait_for_timeout(200)
    ok(pg.is_visible('#btn-ubicacion'),'y reaparece al cerrar el desplegable')
    pg.click('#btn-ubicacion'); pg.wait_for_timeout(800)   # se deja en GPS para lo que sigue

    # La fecha viene de la jornada (D119)
    ok(pg.input_value('#campo-fecha')==HOY,'la fecha de plantación ya viene puesta por la jornada')

    pg.fill('#campo-especie','fraxinus'); pg.wait_for_timeout(120)
    ok(pg.locator('.combo-opcion').count()==2 and 'Fresno' in pg.inner_text('#lista-especies'),'el autocompletado busca por nombre científico')
    # Catálogo real (D84): 76 especies con clave ESP-0000, y se busca también por los otros nombres comunes
    ok(pg.evaluate("SRP.ref.deTipo('especie', true).length")==76 and pg.evaluate("SRP.CATALOGO_ESPECIES.meta.total")==76,'el catálogo es el real del SIA: 76 especies (D84)')
    pg.fill('#campo-especie','acecintle'); pg.wait_for_timeout(120)
    ok(pg.locator('.combo-opcion[data-id="ESP-0001"]').count()==1 and 'también: Acecintle' in pg.inner_text('#lista-especies'),'busca por otro nombre común y dice por cuál coincidió: '+pg.inner_text('.combo-opcion[data-id="ESP-0001"]').replace('\n',' '))
    pg.fill('#campo-especie','fresno'); pg.wait_for_timeout(120)
    ok(pg.locator('.combo-opcion[data-id^=ESP]').count()>=2,'un nombre que señala a varias especies las ofrece todas, no resuelve solo (%d)' % pg.locator('.combo-opcion[data-id^=ESP]').count())
    pg.fill('#campo-especie','fres'); pg.wait_for_timeout(120)
    pg.dispatch_event('.combo-opcion[data-id="ESP-0029"]','mousedown'); pg.wait_for_timeout(200)
    ok(pg.input_value('#campo-especie')=='Fresno (Fraxinus uhdei)','al elegir, el campo queda como en el catálogo')
    ok(pg.evaluate("document.activeElement.id")!='campo-programa','elegir especie no mueve el foco al programa (D82)')
    # Programa en lista desplegable (D120): los programas crecen; sin preselección (D29)
    prog=pg.evaluate('''() => ({ botones: document.getElementById('programa-botones').hidden, lista_visible: !document.getElementById('campo-programa').classList.contains('oculto-visual'),
      opciones: [...document.getElementById('campo-programa').options].filter(o => o.value).length, valor: document.getElementById('campo-programa').value })''')
    ok(prog=={'botones':True,'lista_visible':True,'opciones':2,'valor':'p-refor'} and pg.is_hidden('#caja-programa'),'el programa viene de la jornada y ya no se pregunta por árbol: el campo queda oculto con el valor puesto (D120, D130, D132): %s' % prog)
    # El texto guía de los campos de fecha vacíos (D104) se comprueba en la fecha de la jornada
    vac=pg.evaluate("(() => { const e=document.getElementById('ini-fecha').closest('.envoltura-vacio'); return e ? e.querySelector('.texto-vacio').textContent : null; })()")
    ok(vac=='Seleccione la fecha','la fecha de la jornada lleva el texto guía «Seleccione la fecha» (D104, D120): %s' % vac)
    foco=pg.evaluate("(() => { const e=document.getElementById('campo-comentarios'); e.focus(); const c=getComputedStyle(e); const r=[c.outlineStyle, c.borderTopColor]; e.blur(); return r; })()")
    ok(foco==['none','rgb(157, 33, 72)'],'el foco de un campo de texto es borde guinda, no contorno azul (D98): %s' % foco)

    from PIL import Image; Image.new('RGB',(2400,1800),(70,110,60)).save('/tmp/arbol.jpg',quality=90)
    ok(pg.locator('input[type=file][accept^=image]').count()==1,'hay un solo selector de fotografía')
    alin=pg.evaluate("(() => { const l=document.querySelector('fieldset.campo legend').getBoundingClientRect().left, e=document.querySelector('label[for=campo-especie]').getBoundingClientRect().left; return Math.round(l-e); })()")
    ok(alin==0,'la etiqueta «Fotografía» se alinea con las demás (D107): %s px' % alin)
    nav=pg.evaluate("(() => { const n=document.getElementById('navegacion'); const r=n.getBoundingClientRect(); const b=document.querySelector('.barra-guardar').getBoundingClientRect(); return { fija: getComputedStyle(n).position, abajo: Math.round(innerHeight - r.bottom) <= 1, barra_encima: b.bottom <= r.top + 1 }; })()")
    ok(nav=={'fija':'fixed','abajo':True,'barra_encima':True},'en teléfono las secciones van abajo y la barra de guardar queda encima (D107): %s' % nav)
    ok(pg.get_attribute('#foto-archivo','capture') is None,'sin «capture»: el teléfono ofrece su propio menú')
    ok(pg.is_hidden('#ficha-foto'),'sin foto no hay ficha de archivo')
    pg.set_input_files('#foto-archivo','/tmp/arbol.jpg'); pg.wait_for_timeout(900)
    ok(pg.is_visible('#ficha-foto') and pg.inner_text('#foto-nombre')=='arbol.jpg','la ficha dice el nombre del archivo')
    ok(pg.evaluate("(() => { const z=document.getElementById('etq-foto'); return z.classList.contains('con-foto') && getComputedStyle(z).flexDirection==='row' && z.getBoundingClientRect().height < 70; })()"),
       'con foto cargada la zona de carga se reduce a un renglón «Cambiar fotografía» (D98)')
    ok(any(u in pg.inner_text('#foto-peso') for u in ['KB','MB','B']),'y cuánto pesa ya comprimida: '+pg.inner_text('#foto-peso'))
    dims=pg.evaluate("new Promise(r=>{const i=new Image();i.onload=()=>r([i.width,i.height]);i.src=document.getElementById('foto-vista').src})")
    ok(dims[0]<=800 and dims[1]<=800,'la foto se comprime a %sx%s'%tuple(dims))
    pg.click('#btn-foto-quitar'); pg.wait_for_timeout(300)
    ok(pg.is_hidden('#ficha-foto'),'la papelera quita la foto')
    pg.set_input_files('#foto-archivo','/tmp/arbol.jpg'); pg.wait_for_timeout(900)

    # Ficha de revisión: sólo se abre cuando hay algo que revisar (D130). Con ±40 m la precisión es aceptable, no buena
    ctx.set_geolocation({'latitude':19.432,'longitude':-99.133,'accuracy':40}); pg.click('#btn-ubicacion'); pg.wait_for_timeout(700)
    pg.click('#form-plantacion button[type=submit]'); pg.wait_for_timeout(900)
    ok(pg.is_visible('#dlg-resumen') and pg.is_visible('#revision-avisos') and pg.locator('#revision-avisos li[data-tipo=precision]').count()==1,'con precisión aceptable la ficha de revisión se abre y dice por qué (D130): '+pg.inner_text('#revision-avisos').replace('\n',' '))
    ok(pg.locator('#revision-mapa .leaflet-marker-icon').count()==1,'la ficha muestra el mapa con el punto')
    ok(pg.locator('.revision-fila', has_text='Fotografía').locator('img.revision-foto').count()==1,
       'y la fotografía, en su propio renglón al final')
    ok(pg.locator('#revision-lista').bounding_box()['y'] < pg.locator('img.revision-foto').bounding_box()['y'],
       'la fotografía va debajo de los datos, no encima')
    ok(pg.evaluate("getComputedStyle(document.querySelector('.revision-fila dt')).fontWeight")=='700',
       'las etiquetas de la ficha van en negritas')
    ok(pg.evaluate("SRP.mapa.icono.options.iconSize[0]")<=24,
       'el pin es discreto (%s px de ancho)' % pg.evaluate("SRP.mapa.icono.options.iconSize[0]"))
    id1=pg.evaluate("SRP.formulario.estado.idPrevisto")
    ok(len(id1)>20 and pg.locator('#revision-lista .revision-id').count()==0 and 'Identificador' not in pg.inner_text('#revision-lista'),'el identificador queda fijado pero ya no se muestra en la ficha (D126)')
    ok(pg.locator('button[data-campo=punto]').count()==1,'sólo las coordenadas remiten al mapa')
    ok(pg.locator('.revision-fila', has_text='Alcaldía').locator('button').count()==0,'la alcaldía no se edita: sale del punto')
    ok(pg.inner_text('button[data-campo=especie]').strip()=='Editar','la ficha usa la palabra Editar')
    ok(HOY_TXT in pg.inner_text('#revision-lista'),'las fechas se leen con el mes en letras: '+HOY_TXT)
    fol=pg.inner_text('#revision-lista .folio-provisional')
    sec=pg.evaluate("SRP.folio.leerSecuencias()")
    ok(re.match(r'^[A-Z]{3}-\d{3}-\d{5} \(simulado\)$', fol) is not None and int(fol[8:13])>sec.get(fol[:7],0),'con datos de prueba la ficha enseña el folio que tocará, sin gastar la secuencia (D126): %s (secuencia %s)' % (fol, sec.get(fol[:7],0)))
    # Editar especie desde la ficha: el texto queda seleccionado y la lista ofrece todo, no sólo «Otra especie» (D76)
    pg.click('#revision-lista button[data-campo=especie]'); pg.wait_for_timeout(300)
    opc=pg.locator('#lista-especies .combo-opcion').count()
    ok(pg.evaluate("document.activeElement.id")=='campo-especie' and opc>=5 and pg.input_value('#campo-especie')!='',
       'Editar especie vuelve al campo con su texto y la lista completa (%d opciones)' % opc)
    pg.fill('#campo-especie','fres'); pg.wait_for_timeout(200)
    n_fres=pg.evaluate("SRP.ref.deTipo('especie', true).filter(e => SRP.ref.especieCoincide(e, 'fres')).length")+1
    ok(pg.locator('#lista-especies .combo-opcion').count()==n_fres,'y al teclear vuelve a filtrar (%d)' % pg.locator('#lista-especies .combo-opcion').count())
    pg.dispatch_event('.combo-opcion[data-id="ESP-0029"]','mousedown'); pg.wait_for_timeout(200)
    pg.click('#form-plantacion button[type=submit]'); pg.wait_for_timeout(800)
    pg.click('#btn-resumen-cerrar'); pg.wait_for_timeout(200)
    ok(not pg.is_visible('#dlg-resumen') and pg.locator('#btn-resumen-corregir').count()==0,'la ficha cierra con la × y ya no hay botón Corregir (D77)')
    pg.click('#form-plantacion button[type=submit]'); pg.wait_for_timeout(800)
    fijo=pg.evaluate("(() => { const d=document.getElementById('dlg-resumen'); d.scrollTop=600; const c=d.querySelector('.dialogo-cabecera').getBoundingClientRect(); const b=document.getElementById('btn-resumen-guardar').getBoundingClientRect(); const dr=d.getBoundingClientRect(); d.scrollTop=0; return { arriba: Math.round(c.top-dr.top), botonVisible: b.top>=dr.top && b.bottom<=dr.bottom, sticky: getComputedStyle(d.querySelector('.dialogo-cabecera')).position }; })()")
    ok(fijo['sticky']=='sticky' and fijo['botonVisible'] and fijo['arriba']<=8,'la cabecera queda fija arriba y Guardar a la vista aunque se desplace la ficha (D74, D99): %s' % fijo)
    pie=pg.evaluate('''() => { const d=document.getElementById('dlg-resumen'); const b=document.getElementById('btn-resumen-guardar');
      const p=b.closest('.dialogo-pie'); const br=b.getBoundingClientRect(), dr=d.getBoundingClientRect();
      return { pie: !!p && getComputedStyle(p).position==='sticky', ancho: br.width >= dr.width*0.8, abajo: br.top > dr.top + dr.height/2 }; }''')
    ok(all(pie.values()),'Guardar va al pie de la ficha, fijo y a todo el ancho (D99): %s' % pie)
    orden=pg.evaluate("[...document.querySelectorAll('#revision-lista > .revision-fila dt')].map(x=>x.textContent)")
    ok(orden[0]=='Especie' and orden[-1]=='Cabo' and orden[-2]=='Folio' and orden[-3]=='Fotografía' and pg.locator('.revision-sistema').count()==0,
       'la ficha empieza por Especie y termina Fotografía, Folio, Cabo, sin «Datos del sistema» (D99, D123, D126): %s' % orden[-3:])
    dist=pg.inner_text('#revision-lista .revision-fila:first-child dd')
    ok('revision-distribucion' in pg.inner_html('#revision-lista .revision-fila:first-child dd') and any(t in dist for t in ['Nativa','Introducida','Endémica','Exótica']),'la fila de Especie dice también el tipo de distribución del catálogo (D123): '+dist.replace('\n',' · '))
    ok(pg.locator('.revision-fila', has_text='Cómo se obtuvo').locator('.precision').count()==1,'«Cómo se obtuvo» muestra la insignia de precisión del GPS (D99)')
    apil=pg.evaluate("(() => { const d=document.getElementById('dlg-resumen'); const m=d.querySelector('.revision-mapa'); const cs=getComputedStyle(m); return { aislado: cs.isolation==='isolate' && cs.zIndex==='0', cab: parseInt(getComputedStyle(d.querySelector('.dialogo-cabecera')).zIndex), foco: document.activeElement.id, contiene: getComputedStyle(d).overscrollBehavior }; })()")
    ok(apil['aislado'] and apil['cab']>=2 and apil['foco']=='dlg-resumen-titulo' and apil['contiene']=='contain',
       'el mapa va aislado bajo la cabecera, el foco abre en el título y el desplazamiento no se encadena (D78): %s' % apil)
    ok(pg.evaluate("SRP.formulario.registroPrevisto().especie_estatus")=='VALIDADA' and
       pg.evaluate("SRP.formulario.valores.call(Object.assign({}, SRP.formulario, {estado: Object.assign({}, SRP.formulario.estado, {especieId: SRP.formulario.OTRA})})).especie_estatus")=='PENDIENTE_VALIDACION',
       '«Otra especie» deja el registro PENDIENTE_VALIDACION; una de catálogo, VALIDADA (D68)')
    pg.click('button[data-campo=especie]'); pg.wait_for_timeout(400)
    ok(pg.is_hidden('#dlg-resumen') and pg.evaluate("document.activeElement.id")=='campo-especie','Editar cierra la ficha y lleva al campo')

    pg.click('#form-plantacion button[type=submit]'); pg.wait_for_timeout(900)
    pg.click('#btn-resumen-guardar'); pg.wait_for_timeout(700)
    ok(pg.is_hidden('#dlg-resumen') and pg.is_visible('#franja-guardado') and pg.locator('#dlg-guardado').count()==0 and pg.locator('#franja-jornada #franja-guardado').count()==1,'al guardar se cierra la ficha y aparece «Guardado» dentro del panel de la jornada, sin modal (D130, D131)')
    ok('Guardado: Fresno' in pg.inner_text('#franja-guardado') and 'Cuauhtémoc' in pg.inner_text('#franja-guardado'),'la franja dice qué se guardó y dónde: '+pg.inner_text('#franja-guardado').replace('\n',' '))
    ok(pg.evaluate("SRP.formulario.estado.ultimoGuardado")==id1 and pg.evaluate("(async () => !!(await SRP.almacen.uno('plantaciones', '%s')))()" % id1),'se guardó con el identificador que fijó la ficha, y no se enseña (D127)')
    ok('enviando' in pg.inner_text('#franja-guardado-envio') and pg.text_content('#conexion').strip()=='Enviando 1…' and pg.get_attribute('#conexion','data-estado')=='enviando',
       'con señal el registro sale en seguida: la franja y la pastilla dicen «Enviando…» (D111): '+pg.text_content('#conexion').strip())
    pg.wait_for_timeout(1600)
    ok('enviado hoy a las' in pg.inner_text('#franja-guardado-envio') and pg.get_attribute('#franja-guardado','data-envio')=='recibido',
       'y luego que el servidor confirmó la recepción, con la hora (D111): '+pg.inner_text('#franja-guardado-envio'))
    ok(re.search(r'^[A-Z]{3}-\d{3}-\d{5} \(simulado\)$', pg.inner_text('#franja-guardado-folio')) is not None,'con su folio (D110): '+pg.inner_text('#franja-guardado-folio'))
    ok(pg.text_content('#conexion').strip()=='Con conexión · Al día (simulado)' and pg.get_attribute('#conexion','data-estado')=='con','la pastilla queda «Al día» y dice que el servidor es simulado (D111, D150)')
    ok(pg.evaluate("document.activeElement.id")=='btn-ubicacion' and pg.is_visible('#btn-guardado-corregir') and pg.is_visible('#btn-guardado-ver'),'el formulario queda listo con el foco en ubicación, y la franja ofrece «Corregir» y «Ver»')
    ok(pg.locator('#especies-recientes .chip').count()==1 and 'Fresno' in pg.inner_text('#especies-recientes'),'la especie recién usada aparece como atajo encima del buscador (D130)')
    ctx.set_geolocation({'latitude':19.432,'longitude':-99.133,'accuracy':0})
    # Nada del árbol anterior sobrevive: un dato heredado se guarda sin que nadie lo note,
    # y la coordenada del árbol de antes se ve bien estando mal.
    restos=pg.evaluate("""() => ({
      especie: document.getElementById('campo-especie').value,
      otra: document.getElementById('caja-otra-especie').hidden ? '' : 'visible',
      programa: document.getElementById('campo-programa').value,
      fecha: document.getElementById('campo-fecha').value,
      lat_mano: document.getElementById('coord-lat').value,
      lng_mano: document.getElementById('coord-lng').value,
      coordenadas: document.getElementById('dato-coordenadas').textContent,
      alcaldia: document.getElementById('dato-alcaldia').textContent,
      colonia: document.getElementById('dato-colonia').textContent,
      foto: document.getElementById('ficha-foto').hidden ? '' : 'visible',
      errores: document.getElementById('resumen-errores').hidden ? '' : 'visible',
      marcadores: document.querySelectorAll('.leaflet-marker-icon').length,
      punto: SRP.mapa.lat, territorio: SRP.formulario.estado.territorio,
      identificador: SRP.formulario.estado.idPrevisto
    })""")
    heredados={k: restos.pop(k) for k in ('programa','fecha')}
    sucios=[k for k,v in restos.items() if v not in ('', 0, None, '—')]
    ok(sucios==[] and heredados=={'programa':'p-refor','fecha':HOY},'el registro nuevo arranca en blanco salvo lo que hereda de la jornada (programa y fecha, D130); con resto en: %s %s' % (sucios, heredados))

    # Validación
    pg.evaluate("document.getElementById('campo-fecha').value=''; document.getElementById('campo-programa').value=''"); pg.click('#form-plantacion button[type=submit]'); pg.wait_for_timeout(300)
    ok(pg.locator('#resumen-errores li').count()==4 and 'jornada' in pg.inner_text('#resumen-errores').lower(),'valida ubicación, especie, programa y que haya jornada activa')
    pg.evaluate("document.getElementById('campo-fecha').value=SRP.activa.jornada.fecha")

    # Se capturan más árboles para poder probar listados y filtros
    ids=[id1]
    ids.append(registrar(pg,'ahuehu','ESP-0070'))                              # hoy
    ids.append(registrar(pg,'aile','ESP-0002',fecha='2026-08-10'))             # mes pasado
    ids.append(registrar(pg,'quiebra','ESP-0062',programa='p-centro',fecha='2026-07-05'))
    ok(len(set(ids))==4,'cada árbol recibe su propio identificador')
    # FOLIO (B23): estructura sin emisión
    f=pg.evaluate("""() => ({
      v1: SRP.folio.valido('TLP-318-00001'), v2: SRP.folio.valido('TLP-318-1'), v3: SRP.folio.valido('tlp-318-00001'),
      v4: SRP.folio.valido('SRP-TLP-318-2026-00001'),
      a1: SRP.folio.armar('TLP-318', 7), a2: SRP.folio.armar(null, 12),
      texto: SRP.folio.texto({ folio: null }), largo: SRP.folio.armar('CUH-021', 99999).length,
      tope: (() => { try { SRP.folio.armar('CUH-021', 100000); return 'aceptado'; } catch (e) { return 'rechazado'; } })(),
      cero: (() => { try { SRP.folio.armar('CUH-021', 0); return 'aceptado'; } catch (e) { return 'rechazado'; } })() })""")
    ok(f['v1'] and not f['v2'] and not f['v3'],'el patrón del folio acepta la forma adoptada y rechaza las demás')
    ok(f['a1']=='TLP-318-00007' and f['a2']=='EXT-000-00012' and f['largo']==13,'armar rellena el consecutivo y usa EXT-000 fuera de la malla, en 13 caracteres (D67): '+f['a1'])
    ok(not f['v4'],'el formato anterior de 22 caracteres ya no es válido (D67)')
    ok(f['tope']=='rechazado' and f['cero']=='rechazado','un consecutivo fuera de 1–99 999 se rechaza en vez de recortarse o reiniciarse (R6)')
    ok(f['texto']=='PROVISIONAL','sin folio, la pantalla dice PROVISIONAL')
    guardado=pg.evaluate("id => SRP.almacen.uno('plantaciones', id)", ids[0])
    nace=pg.evaluate("(() => { const r = SRP.formulario.registroPrevisto(); return SRP.folio.CAMPOS.every(k => k in r && r[k] === null); })()")
    ok(nace,'el registro nace con los cinco campos del folio en nulo (R8)')
    # Servidor simulado con datos de prueba (D110): al guardar con conexión recibe folio, una vez, y se congela lo de R8
    ok(re.fullmatch(r'[A-Z]{3}-\d{3}-\d{5}', guardado['folio'] or '') is not None and guardado['folio_uga']==guardado['folio'][:7]
       and guardado['folio_lat']==guardado['lat'] and guardado['folio_lng']==guardado['lng'],'con datos de prueba el servidor simulado asigna el folio y congela celda y coordenada (D110): %s' % guardado['folio'])
    seq=pg.evaluate("(async () => { const b = await SRP.almacen.todos('bitacora'); const s = SRP.folio.leerSecuencias(); const todos = await SRP.almacen.todos('plantaciones'); return { bitacora: b.some(x => x.accion === 'FOLIO_ASIGNADO'), unicos: new Set(todos.filter(t=>t.folio).map(t=>t.folio)).size === todos.filter(t=>t.folio).length, secuencia: Object.values(s).reduce((a,n)=>a+n,0) >= todos.filter(t=>t.folio).length }; })()")
    ok(seq=={'bitacora':True,'unicos':True,'secuencia':True},'la asignación deja constancia, no repite folios y sale de la secuencia, no de contar registros (R5–R6): %s' % seq)
    ok(pg.evaluate("SRP.folio.textoLargo({folio:'TLP-318-00001', es_ficticio:true})")=='TLP-318-00001 (simulado)','el folio simulado se escribe con su aviso')
    ok(guardado['especie_estatus']=='VALIDADA','una especie de catálogo queda VALIDADA')

    # ---------- REGISTROS ----------
    pg.click('.pestana[data-vista=registros]'); pg.wait_for_timeout(600)
    # Al entrar se ven todos y los filtros abiertos; «Filtros» los pliega en teléfono (D104)
    ok(pg.is_visible('#panel-filtros') and pg.get_attribute('#btn-filtros','aria-expanded')=='true' and pg.is_hidden('#filtros-cuenta')
       and pg.inner_text('#filtros-activos').strip()=='' and pg.get_attribute('.chip[data-atajo=todos]','aria-pressed')=='true'
       and 'Total: 4 ' in pg.inner_text('#registros-total'),'al entrar se ven todos los registros, sin filtro, y el panel de filtros abierto (D104): '+pg.inner_text('#registros-total'))
    pg.click('#btn-filtros'); pg.wait_for_timeout(150)
    ok(pg.is_hidden('#panel-filtros') and pg.get_attribute('#btn-filtros','aria-expanded')=='false','«Filtros» pliega el panel en teléfono')
    pg.click('#btn-filtros'); pg.wait_for_timeout(150)
    tarj=pg.evaluate('''() => { const li=document.querySelector('#lista-registros .registro'); const t=li.querySelector('.btn-tuerca').getBoundingClientRect(); const r=li.getBoundingClientRect();
      return { arriba: t.top - r.top < 20, derecha: r.right - t.right < 20, alto: Math.round(r.height), mini: !!li.querySelector('.registro-miniatura'),
               provisional: document.getElementById('lista-registros').textContent.includes('PROVISIONAL') }; }''')
    ok(tarj['arriba'] and tarj['derecha'] and tarj['alto']<150 and tarj['mini'] and not tarj['provisional'],
       'cada registro es una tarjeta con miniatura y la tuerca arriba a la derecha, sin «PROVISIONAL» repetido (D100): %s' % tarj)
    pg.click('#lista-registros .registro >> nth=0 >> .registro-especie'); pg.wait_for_timeout(500)
    det=pg.evaluate('''() => ({ abierto: document.getElementById('dlg-detalle').open,
      primero: document.querySelector('#dlg-detalle-cuerpo .revision-lista dt').textContent,
      sistema: !!document.querySelector('#dlg-detalle-cuerpo .revision-sistema .folio-provisional'),
      pie: !document.getElementById('detalle-pie').hidden && !!document.querySelector('#detalle-pie #btn-detalle-editar') })''')
    ok(det=={'abierto':True,'primero':'Especie','sistema':True,'pie':True},'tocar la tarjeta abre el detalle, que empieza por Especie, deja Folio al final y Editar al pie (D100): %s' % det)
    pg.click('#btn-detalle-cerrar'); pg.wait_for_timeout(200)
    pg.click('.chip[data-atajo=hoy]'); pg.wait_for_timeout(300)
    ok(pg.is_hidden('#filtros-activos') and pg.inner_text('#filtros-cuenta')=='1','con el panel abierto no se repite la ficha «Hoy»; «Filtros» sí cuenta 1 (D105)')
    pg.click('#btn-filtros'); pg.wait_for_timeout(150)
    ok(('Hoy, '+HOY_TXT) in pg.inner_text('#filtros-activos'),'con el panel plegado, «Hoy» aparece como ficha (D100, D105)')
    pg.click('#filtros-activos button[data-quitar=periodo]'); pg.wait_for_timeout(300)
    ok('Total: 4 ' in pg.inner_text('#registros-total') and pg.inner_text('#filtros-activos').strip()=='' and pg.is_hidden('#filtros-cuenta'),
       'la × de la ficha quita el periodo y muestra todos: '+pg.inner_text('#registros-total'))
    abrir_filtros(pg)
    pg.click('.chip[data-atajo=hoy]'); pg.wait_for_timeout(300)
    hoy_txt=pg.text_content('#chip-hoy')
    ok(hoy_txt=='Hoy, '+HOY_CHIP,'el chip de hoy lleva la fecha con el mes en letras y el año en dos cifras (se lee con la coma oculta): '+hoy_txt)
    ok(pg.evaluate("getComputedStyle(document.querySelector('#chip-hoy .chip-sub')).display")=='block','y la fecha va en un segundo renglón para caber en un tercio del teléfono (D95)')
    ok(pg.locator('#filtro-atajos .chip[aria-pressed=true]').count()==1 and pg.locator('#filtro-atajos .chip[data-atajo=hoy][aria-pressed=true]').count()==1,'«Hoy» queda como único atajo marcado')
    ok('Total: 2 ' in pg.inner_text('#registros-total'),'sólo los de hoy: '+pg.inner_text('#registros-total'))
    # Acciones del renglón en el menú de la tuerca (D94)
    ok(pg.locator('#lista-registros .registro >> nth=0').locator('.btn-tuerca').count()==1 and pg.is_hidden('#lista-registros .menu-acciones >> nth=0'),'cada renglón lleva una tuerca y el menú arranca cerrado (D94)')
    pg.click('#lista-registros .btn-tuerca >> nth=0'); pg.wait_for_timeout(150)
    opc=pg.evaluate("""[...document.querySelectorAll('#lista-registros .menu-acciones:not([hidden]) .menu-opcion')].map(b=>b.dataset.accion+'/'+(b.querySelector('svg')?'icono':'-'))""")
    ok(opc==['ver/icono','editar/icono','eliminar/icono'],'al tocarla ofrece ver, editar y eliminar con icono: %s' % opc)
    ok(pg.evaluate("document.activeElement.classList.contains('menu-opcion')"),'y el foco pasa a la primera opción')
    pg.keyboard.press('Escape'); pg.wait_for_timeout(100)
    ok(pg.is_hidden('#lista-registros .menu-acciones >> nth=0'),'Escape cierra el menú de acciones')
    fila=pg.inner_text('#lista-registros .registro >> nth=0')
    ok('(' in fila and 'CENTRO IV' in fila,'cada renglón trae común (científico) y alcaldía, colonia: '+fila.replace(chr(10),' | ')[:90])
    # Espejo en el detalle (B22): los campos guardados que la ficha no enseña
    accion(pg,'#lista-registros','ver'); pg.wait_for_timeout(500)
    campos=pg.evaluate("[...document.querySelectorAll('#dlg-detalle .espejo .espejo-campo')].map(e=>e.textContent)")
    ok('colonia_cve' in campos and 'capa_version' in campos and 'uga' in campos and 'id' not in campos,
       'el detalle lleva su espejo con lo que no se ve (%d campos)' % len(campos))
    # Todas las ventanas con cabecera fija: título, × y acción arriba (D91)
    cab=pg.evaluate("""() => ['dlg-detalle','dlg-cierre','dlg-catalogo','dlg-usuario','dlg-senal'].map(id => {
      const d=document.getElementById(id); const c=d.querySelector('.dialogo-cabecera');
      return id+':'+(!!c && getComputedStyle(c).position==='sticky' && !!c.querySelector('.dialogo-cerrar svg') && !d.querySelector('.acciones:not(.acciones-cabecera) .btn-secundario'));
    })""")
    ok(all(x.endswith('true') for x in cab),'las cinco ventanas llevan cabecera fija con × y sin Cancelar al pie (D91): %s' % cab)
    ok(pg.is_visible('#btn-detalle-editar'),'el detalle ofrece Editar en la cabecera a quien puede editar')
    pg.click('#btn-detalle-cerrar'); pg.wait_for_timeout(200)
    col=pg.evaluate("getComputedStyle(document.querySelector('#lista-registros button[data-accion=eliminar]')).color")
    ok(col=='rgb(198, 40, 40)','la opción Eliminar va en rojo')
    pg.click('.chip[data-atajo=todos]'); pg.wait_for_timeout(300)
    ok('Total: 4 ' in pg.inner_text('#registros-total'),'«Todos» muestra los cuatro: '+pg.inner_text('#registros-total'))
    ok(pg.is_hidden('#registros-vacio'),'con registros no hay aviso de vacío')
    # Estado vacío con salida (D96)
    pg.click('.chip[data-atajo=periodo]'); pg.fill('#filtro-desde','2020-01-01'); pg.fill('#filtro-hasta','2020-01-31'); pg.click('#btn-filtrar'); pg.wait_for_timeout(300)
    ok(pg.is_visible('#registros-vacio') and pg.locator('#registros-vacio button[data-vacio=quitar]').count()==1 and pg.inner_text('#registros-total')=='',
       'un filtro sin resultados muestra el aviso con «Quitar filtros»: '+pg.inner_text('#registros-vacio').replace('\n',' '))
    pg.click('#registros-vacio button[data-vacio=quitar]'); pg.wait_for_timeout(300)
    ok('Total: 4 ' in pg.inner_text('#registros-total') and pg.is_hidden('#registros-vacio'),'«Quitar filtros» devuelve los cuatro')
    ok(pg.is_hidden('#caja-filtro-cabo'),'el cabo no tiene filtro por cabo')
    ok(pg.locator('#filtro-anio option').count()==2,'el año lista Todos y 2026')
    pg.evaluate("document.getElementById('filtro-mas-filtros').open = true")   # año y mes viven plegados (D129)
    pg.select_option('#filtro-anio','2026'); pg.wait_for_timeout(300)
    ok(pg.locator('#filtro-mes option').count()==4,'el mes lista sólo los tres con registros')
    pg.select_option('#filtro-mes','07'); pg.wait_for_timeout(300)
    ok('Total: 1 ' in pg.inner_text('#registros-total'),'julio tiene uno: '+pg.inner_text('#registros-total'))
    ok(pg.locator('#filtro-atajos .chip[aria-pressed=true]').count()==0,'ningún atajo queda marcado al elegir mes suelto')
    ok(pg.is_hidden('#filtro-desde'),'el rango viene plegado')
    pg.click('.chip[data-atajo=periodo]'); pg.wait_for_timeout(200)
    ok(pg.is_visible('#filtro-desde') and pg.get_attribute('.chip[data-atajo=periodo]','aria-expanded')=='true','«Un periodo» abre Desde/Hasta (D64)')
    ok(pg.is_hidden('#filtro-anio') and pg.is_hidden('#filtro-mes'),'con «Un periodo» abierto no se ven Año y Mes: nunca dos maneras del periodo a la vez (D100)')
    ok(pg.is_visible('#filtro-mas-filtros') if not pg.evaluate("document.getElementById('caja-filtro-cabo').hidden") else pg.is_hidden('#filtro-mas-filtros'),'y el acordeón «Más filtros» se esconde si dentro no queda nada que elegir (D129)')
    ok(pg.evaluate("document.activeElement.id")!='filtro-desde','y no mueve el foco a Desde (D82)')
    pg.fill('#filtro-desde','2026-07-01'); pg.wait_for_timeout(200)
    ok(pg.evaluate("document.activeElement.id")!='filtro-hasta','al elegir Desde, el foco no pasa a Hasta (D82)')
    pg.fill('#filtro-hasta','2026-07-31'); pg.wait_for_timeout(300)
    ok(pg.evaluate("SRP.registros.filtro.desde")=='','y al elegir Hasta no se aplica solo (D82)')
    ok(pg.locator('#filtro-atajos .chip[aria-pressed=true]').count()==1 and pg.get_attribute('.chip[data-atajo=periodo]','aria-pressed')=='true',
       'con «Un periodo» abierto sólo él queda marcado; ya no parecen elegidos dos atajos (D104)')
    pg.click('#btn-filtrar'); pg.wait_for_timeout(300)
    ok('Total: 1 ' in pg.inner_text('#registros-total') and pg.get_attribute('.chip[data-atajo=periodo]','aria-pressed')=='true','el rango entra con «Aplicar»: '+pg.inner_text('#registros-total'))
    pg.fill('#filtro-desde','2026-09-30'); pg.fill('#filtro-hasta','2026-09-01'); pg.click('#btn-filtrar'); pg.wait_for_timeout(300)
    ok('posterior' in pg.inner_text('#aviso'),'un rango invertido se rechaza')
    pg.fill('#filtro-desde','2026-08-01'); pg.fill('#filtro-hasta','2026-08-31'); pg.click('#btn-filtrar'); pg.wait_for_timeout(300)
    ok('Total: 1 ' in pg.inner_text('#registros-total'),'el rango de agosto trae uno')
    ok(pg.input_value('#filtro-anio')=='','el rango limpia Año y Mes')
    ok(pg.get_attribute('.chip[data-atajo=periodo]','aria-pressed')=='true','y «Un periodo» queda marcado mientras haya rango')
    # Reiniciar vuelve al estado de entrada: Hoy, sin rango (D53)
    pg.click('#btn-reiniciar-filtros'); pg.wait_for_timeout(300)
    ok(pg.locator('#filtro-atajos .chip[data-atajo=todos][aria-pressed=true]').count()==1 and pg.input_value('#filtro-desde')=='',
       'Reiniciar filtros vuelve a Todos y limpia el rango (D104)')
    ok('Total: 4 ' in pg.inner_text('#registros-total'),'y lista todos: '+pg.inner_text('#registros-total'))
    ok(pg.is_hidden('#filtro-desde'),'y Reiniciar pliega Desde/Hasta')
    ok([c for c in pg.eval_on_selector_all('#filtro-atajos .chip','b=>b.map(x=>x.dataset.atajo)')]==['todos','hoy','dia','periodo'],'los atajos son Todos, Hoy, Un día y Un periodo, en ese orden, como en Jornadas (D64, D113, D129)')
    # «Un día» (D113): una sola fecha, sin repetirla en Desde y Hasta
    abrir_filtros(pg)
    pg.click('#filtro-atajos [data-atajo=dia]'); pg.wait_for_timeout(300)
    ok(pg.is_visible('#filtro-un-dia') and pg.is_hidden('#filtro-periodo') and pg.is_hidden('#caja-filtro-anio') and pg.get_attribute('#filtro-atajos [data-atajo=dia]','aria-pressed')=='true',
       '«Un día» muestra una sola fecha y esconde año, mes y el rango (D113)')
    pg.fill('#filtro-dia','2026-08-10'); pg.dispatch_event('#filtro-dia','change'); pg.wait_for_timeout(400)
    ok(pg.inner_text('#registros-total').startswith('Total: 1 registro') and 'ago' in pg.inner_text('#lista-registros').lower() or '10-AGO-2026' in pg.inner_text('#lista-registros'),
       'al elegir la fecha se filtra en el acto, sin «Aplicar» (D113): '+pg.inner_text('#registros-total'))
    pg.click('#btn-filtros'); pg.wait_for_timeout(200)
    ok('10-AGO-2026' in pg.inner_text('#filtros-activos'),'y la ficha del filtro dice la fecha elegida')
    abrir_filtros(pg)
    pg.click('#filtro-atajos [data-atajo=todos]'); pg.wait_for_timeout(300)
    ok(pg.is_hidden('#filtro-un-dia') and pg.input_value('#filtro-dia')=='','«Todos» cierra «Un día» y lo limpia')
    pg.mouse.move(1,1); pg.wait_for_timeout(300)   # el fondo del atajo tiene transición de .15 s
    est=pg.evaluate('''() => {
      const g = e => getComputedStyle(e);
      const act = document.querySelector('#filtro-atajos .chip[aria-pressed=true]');
      const chips = [...document.querySelectorAll('#filtro-atajos .chip')].map(c => Math.round(c.getBoundingClientRect().width));
      const sel = document.getElementById('filtro-anio'), fec = document.getElementById('filtro-desde');
      return {
        suave: g(act).backgroundColor === 'rgb(47, 72, 88)' && g(act).color === 'rgb(255, 255, 255)',
        iguales: Math.max(...chips) - Math.min(...chips) <= 1,
        lista: g(sel).appearance === 'none' && g(sel).backgroundImage.includes('svg'),
        fecha: g(fec).backgroundImage.includes('svg'),
        reiniciar: !!document.querySelector('.grupo-cab #btn-reiniciar-filtros'),
        aplicar: document.getElementById('btn-filtrar').classList.contains('btn-primario')
      };
    }''')
    ok(all(est.values()),'estilo de filtros (D95, D124): atajo activo relleno con el acento, atajos de ancho igual, lista y fecha con su cuadrito, «Reiniciar» en el encabezado y «Aplicar» como acción principal: '+str(est))
    pg.click('.chip[data-atajo=periodo]'); pg.wait_for_timeout(200)
    pg.fill('#filtro-desde','2026-08-01'); pg.fill('#filtro-hasta','2026-08-31'); pg.click('#btn-filtrar'); pg.wait_for_timeout(300)
    pg.click('.chip[data-atajo=todos]'); pg.wait_for_timeout(300)
    ok(pg.input_value('#filtro-desde')=='','y un atajo limpia el rango')

    # ---------- REPORTES (B19, B31, D134) ----------
    # El reporte es de una jornada cerrada (D131): Reportes lista las cerradas; con todo abierto lo dice
    pg.click('.pestana[data-vista=reportes]'); pg.wait_for_timeout(600)
    ok(pg.locator('#pdf-lista .jornada').count()==0 and 'Todavía no hay jornadas cerradas' in pg.inner_text('#pdf-vacio') and 'ciérrela en Jornadas' in pg.inner_text('#pdf-vacio') and pg.locator('#pdf-vacio .vacio-icono svg').count()==1 and pg.locator('#pdf-vacio button[data-vacio=jornadas]').count()==1,
       'sin jornadas cerradas, el estado vacío lo dice con icono y botón «Ir a Jornadas» (D131, D134, D141): '+pg.inner_text('#pdf-vacio').replace(chr(10),' '))
    pg.evaluate("async () => { for (const j of await SRP.activa.abiertas()) await SRP.activa.cambiarEstatus(j, 'cerrada'); SRP.activa.jornada = null; }"); pg.wait_for_timeout(300)
    pg.evaluate("SRP.app.mostrarVista('registros')"); pg.wait_for_timeout(300)
    ok(pg.locator('#vista-registros #btn-pdf').count()==0 and pg.locator('#vista-registros #aviso-envio').count()==0,'Registros ya no lleva el reporte ni el bloque del dispositivo (D81)')
    ok(pg.locator('#lista-registros .registro-jornada').count()==pg.locator('#lista-registros .registro').count() and any('Jornada de prueba' in t for t in pg.eval_on_selector_all('#lista-registros .registro-jornada','l=>l.map(x=>x.textContent)')),'cada tarjeta de Registros dice a qué jornada pertenece el árbol (D134)')
    pg.click('.pestana[data-vista=reportes]'); pg.wait_for_timeout(600)
    ok(pg.is_visible('#vista-reportes') and pg.locator('#vista-reportes .bloque .titulo-bloque').count()==1 and pg.locator('#aviso-envio').count()==0,'la pestaña Reportes abre con la lista y ya no lleva el bloque del dispositivo (D104)')
    ok([c for c in pg.eval_on_selector_all('#pdf-atajos .chip','b=>b.map(x=>x.dataset.atajo)')]==['todas','hoy','dia'] and pg.get_attribute('#pdf-atajos [data-atajo=todas]','aria-pressed')=='true','los atajos son Todas, Hoy y Un día, y arranca en Todas (D134)')
    n_cerradas=pg.locator('#pdf-lista .jornada').count()
    ok(n_cerradas>=3 and 'jornadas cerradas' in pg.inner_text('#pdf-nota') and pg.locator('#pdf-lista button[data-id]').count()==n_cerradas,'lista las jornadas cerradas, cada una con su botón «Generar reporte»: %d' % n_cerradas)
    fechas=pg.eval_on_selector_all('#pdf-lista .jornada-fecha:first-of-type','l=>l.map(x=>x.textContent)')
    ok('Hoy' in pg.inner_text('#pdf-lista .jornada >> nth=0'),'la más reciente arriba: '+pg.inner_text('#pdf-lista .jornada >> nth=0').split('\n')[0])
    ok(pg.is_hidden('#caja-pdf-cabo'),'el cabo no elige cabo')
    ok(pg.is_hidden('.pestana[data-vista=galeria]') and pg.evaluate("(() => { SRP.app.mostrarVista('galeria'); return SRP.app.vista; })()")=='registros','el cabo no tiene galería de fotografías ni la abre llamándola directamente (D118)')
    pg.evaluate("SRP.app.mostrarVista('reportes')"); pg.wait_for_timeout(300)
    # Cualquier día, no sólo hoy (D70): «Un día»
    pg.click('#pdf-atajos [data-atajo=dia]'); pg.fill('#pdf-dia','2026-08-10'); pg.dispatch_event('#pdf-dia','change'); pg.wait_for_timeout(400)
    ok(pg.locator('#pdf-lista .jornada').count()==1 and '10-AGO-2026' in pg.inner_text('#pdf-lista'),'«Un día» deja la jornada cerrada de esa fecha')
    pg.click('#pdf-lista button[data-id]'); pg.wait_for_timeout(400)
    ok('10-AGO-2026' in pg.inner_text('#dlg-cierre-dia'),'su botón abre el cierre de esa jornada: '+pg.inner_text('#dlg-cierre-dia'))
    pg.click('#btn-cierre-cerrar'); pg.wait_for_timeout(200)
    pg.fill('#pdf-dia','2026-01-05'); pg.dispatch_event('#pdf-dia','change'); pg.wait_for_timeout(400)
    ok(pg.locator('#pdf-lista .jornada').count()==0 and 'No hay jornadas cerradas del 05-ENE-2026' in pg.inner_text('#pdf-vacio') and pg.locator('#pdf-vacio button[data-vacio=todas]').count()==1,'un día sin jornadas lo dice y ofrece «Ver todas»: '+pg.inner_text('#pdf-vacio').replace(chr(10),' '))
    pg.click('#pdf-atajos [data-atajo=hoy]'); pg.wait_for_timeout(400)
    ok(pg.locator('#pdf-lista .jornada').count()>=1 and all('Hoy' in t for t in pg.eval_on_selector_all('#pdf-lista .jornada','l=>l.map(x=>x.textContent)')),'«Hoy» deja las cerradas de hoy')

    pg.click('#pdf-lista button[data-id]'); pg.wait_for_timeout(400)
    ok(pg.is_visible('#dlg-cierre'),'el botón abre el cierre del reporte antes de generar')
    espejoC=pg.evaluate("[...document.querySelectorAll('#espejo-cierre-cuerpo .espejo-campo')].map(e=>e.textContent)")
    ok(espejoC==['id','es_ficticio','nombre','ubicacion','fecha','comentarios','programa_id','cabo_id','estatus','lat','lng','punto_origen','gps_precision_m','alcaldia_cve','alcaldia','colonia_cve','colonia','fecha_inicio','fecha_cierre','creado_por_id','fecha_creacion','editado_por_id','fecha_ultima_edicion','meta_arboles','puntos_revisados','reporte_en'],
       'el cierre lleva su espejo con los veintiséis campos de la jornada que no se capturan aquí (D112, D119, D120, D122, D130, D131, D143): '+', '.join(espejoC))
    pg.fill('#cie-chofer','Mengano'); pg.wait_for_timeout(200)
    ok(pg.evaluate("SRP.reportes.cierrePrevisto().chofer")=='Mengano','y lo que se escribe entra al mismo objeto que se guarda')
    ok(pg.is_visible('#cie-encargado-lectura') and pg.is_hidden('#cie-encargado-caja'),
       'a un cabo no se le pregunta el encargado: es él')
    ok(pg.inner_text('#cie-encargado-lectura').strip()!='','y sale su nombre: '+pg.inner_text('#cie-encargado-lectura'))
    ok('Parque Hundido' in pg.inner_text('#dlg-cierre-dia') and pg.locator('#cie-sitio').count()==0,'el cierre es de la jornada y ya no pregunta el sitio: lo da el nombre de la jornada (D119): '+pg.inner_text('#dlg-cierre-dia'))
    pg.fill('#cie-chofer','Fulano de Tal')
    pg.fill('#cie-hora','14:30')
    pg.fill('#cie-vehiculo_modelo','Camioneta de prueba'); pg.fill('#cie-vehiculo_placa','ABC-123')
    ok(pg.inner_text('#btn-cierre-generar').strip()=='Ver vista previa' and pg.evaluate("!!document.getElementById('btn-cierre-generar').closest('.dialogo-pie')"),
       'el cierre lleva «Ver vista previa» al pie (D101)')
    pg.click('#btn-cierre-generar'); pg.wait_for_timeout(500)
    prev=pg.inner_text('#previa-hoja')
    ok(pg.is_visible('#dlg-previa') and 'REPORTE DIARIO DE PLANTACIÓN' in prev.upper() and 'Jornada: Parque Hundido' in prev and 'COMENTARIOS DE LA JORNADA' in prev.upper() and 'Jornada de prueba con la comunidad' in prev and 'Fulano de Tal' in prev
       and 'TOTALES POR ESPECIE' in prev.upper() and ('PROVISIONALES' in prev or 'SIMULADOS' in prev),'antes del PDF se ve la vista previa con la jornada, sus comentarios, la logística, los totales y la advertencia de provisional (D101, D119): '+prev[:300].replace('\n',' | '))
    ok('Personal de apoyo' not in prev,'y como el PDF, un apartado vacío no aparece')
    pg.click('#btn-previa-corregir'); pg.wait_for_timeout(400)
    ok(pg.is_visible('#dlg-cierre') and pg.input_value('#cie-chofer')=='Fulano de Tal','«Corregir datos de cierre» vuelve al formulario con lo escrito')
    # Logística (D103): Modelo y Placa en una fila también en teléfono; «Ahora» pone la hora
    fila=pg.evaluate("(() => { const a=document.getElementById('cie-vehiculo_modelo').getBoundingClientRect(), b=document.getElementById('cie-vehiculo_placa').getBoundingClientRect(); return Math.abs(a.top-b.top)<2; })()")
    ok(fila,'Modelo y Placa van en una fila en teléfono (D103)')
    ok(pg.evaluate("getComputedStyle(document.getElementById('cie-personal')).backgroundColor")=='rgb(242, 242, 244)','los campos del cierre son cajas grises como los filtros (D107)')
    pg.fill('#cie-hora',''); pg.click('#btn-hora-ahora'); pg.wait_for_timeout(100)
    ok(re.fullmatch(r'\d\d:\d\d', pg.input_value('#cie-hora')) is not None,'«Ahora» pone la hora actual en la hora de finalización (D103): '+pg.input_value('#cie-hora'))
    pg.fill('#cie-hora','14:30')
    pg.fill('#cie-personal','Ana Uno\nBeto Dos'); pg.fill('#cie-apoyo','Carla Tres')
    pg.click('#btn-cierre-generar'); pg.wait_for_timeout(500)
    pers=pg.evaluate('''() => { const s=[...document.querySelectorAll('#previa-hoja .previa-apartado')].find(x=>x.querySelector('h3').textContent==='Personal participante');
      return { primero: s.querySelector('p').textContent.startsWith('Encargado'), subt: [...s.querySelectorAll('.previa-subtitulo')].map(x=>x.textContent),
               apoyo: [...s.querySelectorAll('.previa-lista')].map(u=>u.children.length) }; }''')
    ok(pers=={'primero':True,'subt':['Participantes','Personal de apoyo'],'apoyo':[2,1]},'en el reporte el Encargado va primero y cada grupo lleva su subtítulo y sus nombres aparte (D103): %s' % pers)
    ok(pg.evaluate("[...document.querySelectorAll('#previa-hoja tfoot td')].pop().classList.contains('cifra')"),'el Total se alinea a la derecha como las cifras (D103)')
    with pg.expect_download() as d: pg.click('#btn-previa-generar')
    d.value.save_as('/home/claude/srp/reporte_prueba.pdf')
    peso=os.path.getsize('/home/claude/srp/reporte_prueba.pdf')
    ok(peso>20000,'el reporte PDF se genera: '+d.value.suggested_filename)
    ok(peso<150000,'y pesa poco para compartirlo por mensajería (D103): %d KB' % (peso//1024))
    ok(re.fullmatch(r'Reporte_[A-Za-z0-9_]+_'+HOY+r'\.pdf', d.value.suggested_filename) is not None and '_Ejemplo_' in d.value.suggested_filename,
       'el archivo se llama «Reporte», el nombre de quien responde y la fecha del reporte, sin acentos ni espacios (D102): '+d.value.suggested_filename)

    # ---------- JORNADAS (D112) ----------
    # Una jornada de prueba de hace 3 días: 5 puntos, dos de la misma especie casi encimados y uno lejos
    J=pg.evaluate("""async () => { const u = SRP.sesion.usuario; const dia = new Date(Date.now()-3*86400000); const f = dia.getFullYear()+'-'+String(dia.getMonth()+1).padStart(2,'0')+'-'+String(dia.getDate()).padStart(2,'0');
      const pts = [[19.4326,-99.1332,'ESP-0070'],[19.4327,-99.1331,'ESP-0002'],[19.4328,-99.1330,'ESP-0070'],[19.432802,-99.133001,'ESP-0070'],[19.4360,-99.1300,'ESP-0002']];
      const ids = [];
      const jid = SRP.util.generarId();
      const ahora = SRP.util.ahoraISO();
      await SRP.almacen.guardarConBitacora('jornadas', Object.assign({ id: jid, es_ficticio: true, nombre: 'Jardín de prueba', fecha: f, comentarios: '', cabo_id: u.id, estatus: 'cerrada', fecha_inicio: new Date(dia.getTime()+9*3600000).toISOString(), fecha_cierre: ahora,
        encargado_id: u.id, creado_por_id: u.id, fecha_creacion: ahora, editado_por_id: u.id, fecha_ultima_edicion: ahora, meta_arboles: null, puntos_revisados: [] }, Object.fromEntries(SRP.reportes.CAMPOS.map(k => [k, '']))), null);
      for (let i=0;i<pts.length;i++) { const id = SRP.util.generarId(); ids.push(id);
        const r = { id, jornada_id: jid, es_ficticio: true, estatus: 'activo', cabo_id: u.id, lat: pts[i][0], lng: pts[i][1], lat_original: pts[i][0], lng_original: pts[i][1], punto_origen: 'gps', gps_precision_m: i===4 ? 45 : 6,
          alcaldia: 'Cuauhtémoc', alcaldia_cve: '09015', colonia: null, colonia_cve: null, uga: 'CUH-021', capa_version: null, especie_id: pts[i][2], especie_otra: '', especie_estatus: 'VALIDADA', programa_id: 'p-refor', fecha_plantacion: f, comentarios: '', foto_id: null, foto_base64: null,
          fecha_registro: new Date(dia.getTime()+ (9*60+i*15)*60000).toISOString(), fecha_ultima_edicion: null, editado_por_id: null, folio: null, folio_uga: null, folio_capa_version: null, folio_lat: null, folio_lng: null };
        await SRP.almacen.guardarConBitacora('plantaciones', r, SRP.bitacora.entrada('CREADO','plantacion',id)); }
      return { f, ids, jid }; }""")
    pg.click('#navegacion [data-vista=jornadas]'); pg.wait_for_timeout(700)
    ok(pg.is_visible('#vista-jornadas') and pg.get_attribute('#navegacion [data-vista=jornadas]','aria-current')=='page' and pg.locator('#navegacion .pestana:visible').count()==4,
       '«Jornadas» es una sección del menú y abre su vista (D112)')
    ok(pg.eval_on_selector_all('#navegacion .pestana','b=>b.filter(x=>!x.hidden).map(x=>x.dataset.vista)')==['registrar','jornadas','registros','reportes'],'el orden es Nuevo registro, Jornadas, Registros, Reportes (D114)')
    pg.click('#btn-cuenta'); pg.wait_for_timeout(150)
    ok(pg.locator('#btn-contraste svg').count()==1 and pg.locator('#btn-cerrar-sesion svg').count()==1 and pg.locator('#menu-cuenta .menu-opcion:visible').count()==pg.locator('#menu-cuenta .menu-opcion:visible svg').count(),
       'cada opción del menú de la cuenta lleva icono: sol en Modo sol y puerta en Cerrar sesión (D114)')
    pg.keyboard.press('Escape'); pg.evaluate("SRP.app.menuCuenta(false)"); pg.wait_for_timeout(150)
    ok(pg.evaluate("(() => { const b=document.querySelector('#navegacion [data-vista=jornadas]'); const r=b.getBoundingClientRect(); return r.top > 700 && r.bottom <= 844; })()"),'y en teléfono va en la barra de abajo')
    ok([c for c in pg.eval_on_selector_all('#jornada-atajos .chip','b=>b.map(x=>x.dataset.atajo)')]==['todas','hoy','dia','periodo'],'con los atajos Todas, Hoy, Un día y Un periodo (D128)')
    ok(pg.is_visible('#jornada-mas-filtros') and not pg.evaluate("document.getElementById('jornada-mas-filtros').open") and pg.locator('#jornada-mas-filtros select').count()==3 and 'Más filtros' in pg.inner_text('#jornada-mas-filtros summary'),'año, mes y cabo van plegados en «Más filtros» (D128)')
    tarj=pg.locator('#lista-jornadas .jornada')
    ok(tarj.count()>=2 and re.match(r'^\d+ jornadas · \d+ árboles$', pg.inner_text('#jornadas-total')) is not None,'cada jornada es una ficha y el total dice jornadas y árboles: '+pg.inner_text('#jornadas-total'))
    t=[x for x in pg.eval_on_selector_all('#lista-jornadas .jornada','l=>l.map(x=>x.textContent)') if 'Jardín de prueba' in x]
    ok(len(t)==1 and '5 registrados' in t[0] and 'por revisar' in t[0] and 'Cuauhtémoc' in t[0] and 'Cerrada' in t[0] and 'meta' in t[0],'la ficha dice nombre, estado, dónde y cuántos árboles y puntos por revisar (D128): '+(t[0].replace('\n',' ') if t else '—'))
    orden=pg.evaluate("(() => { const b=document.querySelector('#lista-jornadas .jornada button'); return [...b.querySelectorAll('.jornada-sitio, .jornada-dia, .jornada-estatus, .jornada-lugar, .jornada-cifras')].map(e => e.className.split(' ')[0]); })()")
    ok(orden==['jornada-sitio','jornada-dia','jornada-estatus','jornada-lugar','jornada-cifras'],'orden de la ficha: nombre, cuándo, estado, dónde, cuánto (D128): %s' % orden)
    etq=pg.evaluate("[...document.querySelectorAll('#lista-jornadas .jornada button .jornada-cifra')].slice(0,5).map(e => e.textContent.trim().split(' ').slice(1).join(' '))")
    ok(etq==['meta','registrados','por revisar','bien','especies'] or etq==['meta','registrados','por revisar','bien','especie'],'las cifras van en el orden meta, registrados, por revisar, bien, especies (D131): %s' % etq)
    ok(pg.locator('#lista-jornadas .jornada-estatus svg').count()==pg.locator('#lista-jornadas .jornada-estatus').count() and pg.evaluate("(() => { const de = n => { const t=document.createElement('div'); t.innerHTML=SRP.ICONOS.svg(n, 14); return t.querySelector('svg').innerHTML; }; const c=document.querySelector('#lista-jornadas .jornada-estatus[data-estatus=cerrada] svg'); const a=document.querySelector('#lista-jornadas .jornada-estatus[data-estatus=abierta] svg'); return c.innerHTML===de('candado') && (!a || a.innerHTML===de('candadoAbierto')); })()"),'toda etiqueta de estado lleva candado: abierto en Abierta, cerrado en Cerrada (D131)')
    hoyf=pg.evaluate("(() => { const c=[...document.querySelectorAll('#lista-jornadas .jornada')].find(l => l.textContent.includes('Jardín de prueba')); const h=[...document.querySelectorAll('#lista-jornadas .jornada')].find(l => l.querySelector('.jornada-dia b') && l.querySelector('.jornada-dia b').textContent==='Hoy'); return [getComputedStyle(c.querySelector('.jornada-estatus')).backgroundColor, [...c.querySelectorAll('.jornada-cifra b')].map(x=>x.textContent), h ? h.querySelector('.jornada-estatus').textContent.trim() : null, h ? getComputedStyle(h.querySelector('.jornada-estatus')).backgroundColor : null]; })()")
    ok(hoyf[0]=='rgb(47, 72, 88)' and len(hoyf[1])==5 and hoyf[1][1]=='5' and int(hoyf[1][2])+int(hoyf[1][3])==5 and hoyf[2] in ('Abierta','Cerrada') and hoyf[3] in ('rgb(30, 122, 70)','rgb(47, 72, 88)'),'«Cerrada» en pizarra con candado, las cifras cuadran, y la jornada de hoy lleva su etiqueta de estado (D128, D131): %s' % hoyf)
    verde=pg.evaluate("(() => { const s=document.createElement('span'); s.className='jornada-estatus'; s.dataset.estatus='abierta'; document.getElementById('lista-jornadas').appendChild(s); const c=getComputedStyle(s).backgroundColor; s.remove(); return c; })()")
    ok(verde=='rgb(30, 122, 70)','«Abierta» va en verde relleno (D128)')
    pg.click('#lista-jornadas .jornada:has-text("Jardín de prueba") button'); pg.wait_for_timeout(900)
    ok(pg.is_visible('#jornada-detalle') and pg.is_hidden('#jornadas-lista-caja') and pg.evaluate("document.activeElement.id")=='jornada-titulo','tocar la tarjeta abre la revisión de la jornada y el foco va al título')
    ok(pg.locator('#jornada-mapa .pin-num').count()==5 and pg.locator('#jornada-lista .punto-jornada').count()==5,'el mapa tiene 5 puntos numerados y la lista los mismos 5')
    nums=pg.eval_on_selector_all('#jornada-mapa .pin-num span','s=>s.map(x=>x.textContent)')
    ok(sorted(nums,key=int)==['1','2','3','4','5'] and pg.eval_on_selector_all('#jornada-lista .punto-num','s=>s.map(x=>x.textContent)')==['1','2','3','4','5'],'numerados en el orden en que se registraron')
    lista=pg.inner_text('#jornada-lista')
    ok('Posible duplicado del 4' in lista and 'Posible duplicado del 3' in lista,'los dos ahuehuetes encimados se avisan como posible duplicado, uno del otro')
    ok(pg.locator('#jornada-lista [data-accion=bien].btn-exito-linea svg').count()==3 and pg.locator('#jornada-lista [data-accion=eliminar].btn-peligro-linea svg').count()==2 and pg.locator('#jornada-lista [data-accion=ver] svg').count()==5,
       'cada acción del punto lleva icono y color por significado: palomita verde, bote rojo, ojo (D116, D121)')
    ok('Lejos del resto' in lista and 'Precisión baja' in lista,'el punto lejano se avisa como lejos del resto y con precisión baja: '+lista.replace('\n',' | ')[:400])
    tonos=pg.eval_on_selector_all('#jornada-lista .punto-num','s=>s.map(x=>x.dataset.tono)')
    ok(tonos==['','','rev','rev','err'],'los números llevan el color del aviso: %s' % tonos)
    ok(pg.get_attribute('#jornada-conciliacion','data-tono')=='neutro' and 'no tiene meta' in pg.inner_text('#jornada-resultado') and 'Quedan 3 puntos por revisar' in pg.inner_text('#jornada-resultado') and pg.locator('#jornada-plantados').count()==0,
       'sin meta la conciliación lo dice, ya no pide el conteo de la cuadrilla, y dice cuántos puntos quedan por revisar (D131)')
    # La meta se escribe al iniciar la jornada (D131); aquí se fija en el dato para probar la comparación
    pg.evaluate("async () => { const j = await SRP.almacen.uno('jornadas', '%s'); j.meta_arboles = 4; await SRP.almacen.guardarConBitacora('jornadas', j, SRP.bitacora.entrada('EDITADO','jornada',j.id,'Meta 4')); await SRP.jornadas.abrir('%s'); }" % (J['jid'], J['jid'])); pg.wait_for_timeout(600)
    ok(pg.get_attribute('#jornada-conciliacion','data-tono')=='err' and 'Sobra 1 registro' in pg.inner_text('#jornada-resultado') and pg.inner_text('#jornada-meta')=='4','con meta 4 y 5 registrados avisa que sobra 1: '+pg.inner_text('#jornada-resultado'))
    # Tocar un punto lo marca en mapa y lista
    pg.click('#jornada-lista .punto-jornada[data-id="%s"] .punto-datos' % J['ids'][1]); pg.wait_for_timeout(300)
    ok(pg.locator('#jornada-lista .punto-jornada.elegido').count()==1 and pg.locator('#jornada-mapa .pin-num.elegido').count()==1 and pg.inner_text('#jornada-mapa .pin-num.elegido')=='2','tocar el punto 2 en la lista lo marca en la lista y en el mapa')
    # Eliminar el duplicado desde la jornada
    pg.click('#jornada-lista .punto-jornada[data-id="%s"] [data-accion=eliminar]' % J['ids'][3]); pg.wait_for_timeout(700)
    ok(pg.is_hidden('#dlg-confirmar') and 'eliminado' in pg.inner_text('#aviso') and pg.locator('#aviso .aviso-accion').count()==1,
       'eliminar un registro no pide confirmar: se deshace, así que el aviso dice cuál se eliminó y ofrece «Deshacer» (D139): '+pg.inner_text('#aviso'))
    ok(pg.is_visible('#jornada-detalle') and pg.locator('#jornada-lista .punto-jornada').count()==4 and pg.locator('#jornada-mapa .pin-num').count()==4,'eliminar el duplicado deja la jornada en 4 puntos y sigue en la misma pantalla')
    ok(pg.get_attribute('#jornada-conciliacion','data-tono')=='rev' and pg.inner_text('#jornada-resultado').startswith('Cuadra: meta de 4 y 4 registrados'),'y ahora cuadra: '+pg.inner_text('#jornada-resultado'))
    ok('Posible duplicado' not in pg.inner_text('#jornada-lista'),'ya no hay aviso de duplicado')
    # «Está bien» sobre el lejano
    pg.click('#jornada-lista .punto-jornada[data-id="%s"] [data-accion=bien]' % J['ids'][4]); pg.wait_for_timeout(500)
    ok(pg.get_attribute('#jornada-conciliacion','data-tono')=='ok' and 'por revisar' not in pg.inner_text('#jornada-resultado') and 'Revisado' in pg.inner_text('#jornada-lista'),'«Está bien» deja el punto como revisado y la jornada en verde')
    # Ver el detalle y editar desde la jornada regresa a la jornada
    pg.click('#jornada-lista .punto-jornada[data-id="%s"] [data-accion=ver]' % J['ids'][0]); pg.wait_for_timeout(400)
    ok(pg.is_visible('#dlg-detalle'),'«Ver» abre el detalle del registro')
    pg.click('#btn-detalle-editar'); pg.wait_for_timeout(500)
    ok(pg.is_visible('#vista-registrar') and pg.get_attribute('#navegacion [data-vista=jornadas]','aria-current')=='page','Editar desde la jornada abre el formulario con Jornadas marcada')
    pg.click('#btn-cancelar-edicion'); pg.wait_for_timeout(600)
    ok(pg.is_visible('#vista-jornadas') and pg.is_visible('#jornada-detalle') and pg.locator('#jornada-lista .punto-jornada').count()==4,'y al cancelar se vuelve a la misma jornada')
    # Reporte de la jornada y regreso a la lista
    pg.click('#btn-jornada-reporte'); pg.wait_for_timeout(700)
    ok(pg.is_visible('#vista-reportes') and pg.is_visible('#dlg-cierre') and 'Jardín de prueba' in pg.inner_text('#dlg-cierre-dia'),'«Reporte de la jornada» abre Reportes ya en el cierre de esa jornada (D134)')
    pg.click('#btn-cierre-generar'); pg.wait_for_timeout(500)
    ok('Meta de la jornada: 4 árboles · registrados: 4 (cuadra)' in pg.inner_text('#previa-hoja') and 'Jornada: Jardín de prueba' in pg.inner_text('#previa-hoja'),'y el reporte lleva la conciliación y el nombre de la jornada')
    # Croquis de la jornada (D115): en la vista previa y en el PDF, con los mismos números que la tabla.
    # Espera a que aparezca: con mosaicos lentos el croquis tarda hasta ESPERA_MS (8 s) antes de ir sin imagen
    esperar(pg, "!!document.querySelector('#previa-croquis img')", 10000)
    cro=pg.evaluate("(() => { const i=document.querySelector('#previa-croquis img'); return i ? { src: i.src.slice(0,22), alt: i.alt, nota: document.querySelector('#previa-croquis .previa-nota').textContent } : null; })()")
    ok(cro and cro['src'].startswith('data:image/') and '4 puntos' in cro['alt'] and 'orden de la tabla' in cro['nota'],'la vista previa trae el croquis de la jornada con los puntos numerados (D115): %s' % (cro and cro['nota'][:80]))
    ok(cro and ('sin conexión' in cro['nota'] or 'Esri' in cro['nota']),'y el pie dice si lleva imagen de satélite o si se generó sin conexión')
    enc=pg.evaluate("(() => { const e = SRP.croquis.encuadre([{lat:19.4326,lng:-99.1332},{lat:19.4336,lng:-99.1322}]); const p = SRP.croquis.aPixel(19.4326,-99.1332,e.z); return { z: e.z, dentro: p.x-e.origenX > 0 && p.x-e.origenX < 1000 && p.y-e.origenY > 0 && p.y-e.origenY < 620 }; })()")
    ok(enc['dentro'] and 15 <= enc['z'] <= 19,'el encuadre deja todos los puntos dentro del lienzo: %s' % enc)
    with pg.expect_download() as dj: pg.click('#btn-previa-generar')
    dj.value.save_as('/home/claude/srp/reporte_jornada.pdf')
    pj=os.path.getsize('/home/claude/srp/reporte_jornada.pdf')
    ok(20000 < pj < 400000,'el PDF con croquis se genera y pesa poco: %d KB' % (pj//1024))
    reporte_de(pg, 'Jardín de prueba'); pg.click('#btn-cierre-generar'); pg.wait_for_timeout(500)
    pg.click('#btn-previa-cerrar') if pg.locator('#btn-previa-cerrar').count() else pg.keyboard.press('Escape'); pg.wait_for_timeout(300)
    pg.click('#navegacion [data-vista=jornadas]'); pg.wait_for_timeout(600)
    ok(pg.is_visible('#jornadas-lista-caja') and pg.is_hidden('#jornada-detalle'),'volver a Jornadas abre la lista')
    pg.click('#jornada-atajos [data-atajo=dia]'); pg.fill('#jornada-dia', J['f']); pg.dispatch_event('#jornada-dia','change'); pg.wait_for_timeout(400)
    ok(pg.locator('#lista-jornadas .jornada').count()==1 and 'Completa: 4 de 4' in pg.inner_text('#lista-jornadas'),'«Un día» deja sólo esa jornada, ya revisada: '+pg.inner_text('#lista-jornadas .insignia-jornada'))
    pg.click('#jornada-atajos [data-atajo=todas]'); pg.wait_for_timeout(300)
    # ---------- VARIAS JORNADAS EN UN DÍA (D117, D119) ----------
    # El mismo cabo, hace 5 días: tres jornadas declaradas con 3, 2 y 1 árboles
    M=pg.evaluate("""async () => { const u = SRP.sesion.usuario; const dia = new Date(Date.now()-5*86400000); const f = dia.getFullYear()+'-'+String(dia.getMonth()+1).padStart(2,'0')+'-'+String(dia.getDate()).padStart(2,'0');
      const sitios = [['Parque de los Pericos', [[19.3600,-99.1790],[19.3601,-99.1789],[19.3602,-99.1788]]], ['Parque Hundido', [[19.3900,-99.1500],[19.3901,-99.1501]]], ['Parque Aeropuerto', [[19.4400,-99.1200]]]];
      const ids = [], jids = []; let k = 0; const ahora = SRP.util.ahoraISO();
      for (let s = 0; s < sitios.length; s++) {
        const jid = SRP.util.generarId(); jids.push(jid);
        await SRP.almacen.guardarConBitacora('jornadas', Object.assign({ id: jid, es_ficticio: true, nombre: sitios[s][0], fecha: f, comentarios: '', cabo_id: u.id, estatus: 'cerrada', fecha_inicio: new Date(dia.getTime()+(9+s*3)*3600000).toISOString(), fecha_cierre: ahora,
          encargado_id: u.id, creado_por_id: u.id, fecha_creacion: ahora, editado_por_id: u.id, fecha_ultima_edicion: ahora, meta_arboles: null, puntos_revisados: [] }, Object.fromEntries(SRP.reportes.CAMPOS.map(x => [x, '']))), null);
        for (const [la, ln] of sitios[s][1]) { const id = SRP.util.generarId(); ids.push(id); k++;
          const r = { id, jornada_id: jid, es_ficticio: true, estatus: 'activo', cabo_id: u.id, lat: la, lng: ln, lat_original: la, lng_original: ln, punto_origen: 'gps', gps_precision_m: 6,
            alcaldia: 'Benito Juárez', alcaldia_cve: '09014', colonia: null, colonia_cve: null, uga: 'BJU-011', capa_version: null, especie_id: 'ESP-0070', especie_otra: '', especie_estatus: 'VALIDADA', programa_id: 'p-refor', fecha_plantacion: f, comentarios: '', foto_id: null, foto_base64: null,
            fecha_registro: new Date(dia.getTime()+(9*60+k*40)*60000).toISOString(), fecha_ultima_edicion: null, editado_por_id: null, folio: null, folio_uga: null, folio_capa_version: null, folio_lat: null, folio_lng: null };
          await SRP.almacen.guardarConBitacora('plantaciones', r, SRP.bitacora.entrada('CREADO','plantacion',id)); } }
      return { f, ids, jids }; }""")
    pg.click('#navegacion [data-vista=jornadas]'); pg.wait_for_timeout(600)
    pg.click('#jornada-atajos [data-atajo=dia]'); pg.fill('#jornada-dia', M['f']); pg.dispatch_event('#jornada-dia','change'); pg.wait_for_timeout(500)
    tarjetas=pg.eval_on_selector_all('#lista-jornadas .jornada','l=>l.map(x=>x.textContent)')
    ok(len(tarjetas)==3 and 'Jornada 1 de 3' in tarjetas[0] and 'Parque de los Pericos' in tarjetas[0] and '3 registrados' in tarjetas[0] and 'Jornada 3 de 3' in tarjetas[2] and 'Parque Aeropuerto' in tarjetas[2],
       'tres jornadas declaradas el mismo día son tres tarjetas con su nombre, numeradas por hora de inicio (D119): %d tarjetas' % len(tarjetas))
    # Filtros nuevos (D128): «Un periodo» con Desde/Hasta + Aplicar; año y mes dentro de «Más filtros»
    pg.click('#jornada-atajos [data-atajo=periodo]'); pg.wait_for_timeout(200)
    ok(pg.is_visible('#jornada-periodo') and pg.is_hidden('#jornada-un-dia') and pg.get_attribute('#jornada-atajos [data-atajo=periodo]','aria-pressed')=='true','«Un periodo» abre Desde y Hasta y cierra «Un día»')
    pg.fill('#jornada-desde', M['f']); pg.fill('#jornada-hasta', M['f']); pg.click('#btn-jornada-filtrar'); pg.wait_for_timeout(400)
    ok(pg.locator('#lista-jornadas .jornada').count()==3 and pg.evaluate("SRP.jornadas.filtro.dia")=='' and pg.evaluate("SRP.jornadas.filtro.desde")==M['f'],'el rango Desde/Hasta deja las 3 jornadas de ese día y el filtro por día queda vacío: %d' % pg.locator('#lista-jornadas .jornada').count())
    pg.evaluate("document.getElementById('jornada-mas-filtros').open = true")
    pg.select_option('#jornada-anio', M['f'][:4]); pg.wait_for_timeout(300)
    ok(pg.is_hidden('#jornada-periodo') and pg.get_attribute('#jornada-atajos [data-atajo=todas]','aria-pressed')=='false' and pg.locator('#jornada-mes option').count()>=2 and not pg.is_disabled('#jornada-mes') and M['f'][:4] in pg.inner_text('#jornada-mas-filtros summary'),
       'elegir un año cierra el rango, habilita los meses con jornadas y el resumen del acordeón dice el año: '+pg.inner_text('#jornada-mas-filtros summary'))
    pg.select_option('#jornada-mes', M['f'][5:7]); pg.wait_for_timeout(300)
    ok(pg.locator('#lista-jornadas .jornada').count()>=3 and all(t.count(M['f'][:4]) for t in pg.eval_on_selector_all('#lista-jornadas .jornada-fecha','l=>l.map(x=>x.textContent)')),'el mes filtra las jornadas de ese mes')
    pg.click('#jornada-atajos [data-atajo=todas]'); pg.wait_for_timeout(300)
    ok(pg.input_value('#jornada-anio')=='' and pg.input_value('#jornada-mes')=='' and 'año, mes' in pg.inner_text('#jornada-mas-filtros summary'),'«Todas» limpia año y mes y el acordeón vuelve a su texto')
    pg.click('#jornada-atajos [data-atajo=dia]'); pg.fill('#jornada-dia', M['f']); pg.dispatch_event('#jornada-dia','change'); pg.wait_for_timeout(500)
    pg.click('#lista-jornadas .jornada:nth-child(2) button'); pg.wait_for_timeout(800)
    ok(pg.inner_text('#jornada-titulo')=='Parque Hundido' and 'Jornada 2 de 3' in pg.inner_text('#jornada-sub') and pg.inner_text('#jornada-registrados')=='2','la jornada 2 se revisa sola con su nombre: 2 registrados en esta jornada')
    pg.evaluate("async () => { const j = await SRP.almacen.uno('jornadas', '%s'); j.meta_arboles = 2; await SRP.almacen.guardarConBitacora('jornadas', j, SRP.bitacora.entrada('EDITADO','jornada',j.id,'Meta 2')); await SRP.jornadas.abrir('%s'); }" % (M['jids'][1], M['jids'][1])); pg.wait_for_timeout(600)
    ok(pg.get_attribute('#jornada-conciliacion','data-tono')=='ok' and pg.inner_text('#jornada-meta')=='2','y su conciliación es la suya: cuadra 2 de 2 (D131)')
    # Editar la jornada (D132): nombre, meta y fecha; los árboles heredan la fecha nueva
    ok(pg.is_visible('#btn-jornada-editar') and pg.is_hidden('#btn-jornada-eliminar'),'la ficha ofrece «Editar jornada» y, con árboles, no ofrece eliminarla (D132)')
    pg.click('#btn-jornada-editar'); pg.wait_for_timeout(300)
    ok(pg.is_visible('#dlg-editar-jornada') and pg.input_value('#ej-nombre')=='Parque Hundido' and pg.input_value('#ej-meta')=='2' and pg.locator('#ej-programa option').count()>=2 and pg.input_value('#ej-fecha')==M['f'],'el diálogo trae los datos de la jornada: nombre, meta, programa y fecha')
    pg.fill('#ej-nombre',''); pg.click('#btn-ej-guardar'); pg.wait_for_timeout(300)
    ok(pg.is_visible('#ej-errores') and 'nombre' in pg.inner_text('#ej-errores').lower(),'sin nombre no guarda')
    otro_dia=(datetime.date.fromisoformat(M['f'])-datetime.timedelta(days=1)).isoformat()
    pg.fill('#ej-nombre','Parque Hundido, sección norte'); pg.select_option('#ej-programa','p-refor'); pg.fill('#ej-meta','3'); pg.fill('#ej-fecha',otro_dia); pg.dispatch_event('#ej-fecha','change'); pg.wait_for_timeout(200)
    ok(pg.is_visible('#ej-nota-fecha'),'al cambiar la fecha avisa que los árboles la heredan')
    pg.click('#btn-ej-guardar'); pg.wait_for_timeout(900)
    ed=pg.evaluate("async () => { const j = await SRP.almacen.uno('jornadas', '%s'); const r = (await SRP.almacen.todos('plantaciones')).filter(x => x.jornada_id === j.id); return [j.nombre, j.meta_arboles, j.fecha, r.map(x => x.fecha_plantacion), (await SRP.bitacora.deEntidad(j.id)).some(h => h.detalle && h.detalle.includes('Campos: nombre, programa_id, meta_arboles, fecha'))]; }" % M['jids'][1])
    ok(ed[0]=='Parque Hundido, sección norte' and ed[1]==3 and ed[2]==otro_dia and all(f==otro_dia for f in ed[3]) and ed[4] and pg.inner_text('#jornada-titulo')=='Parque Hundido, sección norte' and pg.inner_text('#jornada-meta')=='3',
       'la jornada guarda nombre, meta y fecha, sus árboles toman la fecha, queda en el historial y la ficha se repinta (D132): %s' % ed[:3])
    pg.click('#btn-jornada-editar'); pg.wait_for_timeout(300); pg.fill('#ej-nombre','Parque Hundido'); pg.fill('#ej-meta','2'); pg.fill('#ej-fecha',M['f']); pg.click('#btn-ej-guardar'); pg.wait_for_timeout(900)
    ok(pg.inner_text('#jornada-titulo')=='Parque Hundido' and pg.evaluate("async () => (await SRP.almacen.uno('jornadas', '%s')).fecha" % M['jids'][1])==M['f'],'y se deja como estaba')
    # Eliminar una jornada vacía (D132)
    vacia=iniciar_jornada(pg, 'Jornada por error', M['f'])
    pg.evaluate("SRP.app.mostrarVista('jornadas')"); pg.wait_for_timeout(500)
    pg.evaluate("SRP.jornadas.aplicarAtajo('todas')"); pg.wait_for_timeout(300); pg.evaluate("SRP.jornadas.abrir('%s')" % vacia); pg.wait_for_timeout(600)
    ok(pg.is_visible('#btn-jornada-eliminar') and 'btn-peligro-linea' in pg.get_attribute('#btn-jornada-eliminar','class'),'una jornada sin árboles ofrece «Eliminar jornada» en rojo de contorno (D132)')
    pg.click('#btn-jornada-eliminar'); pg.wait_for_timeout(300)
    ok(pg.is_visible('#dlg-confirmar') and 'Eliminar jornada' in pg.inner_text('#btn-confirmar-si') and 'btn-peligro' in pg.get_attribute('#btn-confirmar-si','class'),'pide confirmar en rojo')
    ok(pg.get_attribute('#btn-confirmar-no','class').split().count('btn-cancelar')==1 and pg.locator('#btn-confirmar-no svg').count()==1,'«Cancelar» va en rojo de contorno con tache (D116)')
    conf=pg.evaluate("""() => ({ titulo: document.getElementById('dlg-confirmar-titulo').hidden ? null : document.getElementById('dlg-confirmar-titulo').textContent,
      puntos: document.querySelectorAll('#dlg-confirmar-puntos li').length, nota: document.getElementById('dlg-confirmar-nota').textContent,
      tono: document.getElementById('dlg-confirmar-nota').dataset.tono, icono: !!document.querySelector('#dlg-confirmar-nota svg'),
      etiqueta: document.getElementById('dlg-confirmar').getAttribute('aria-labelledby'), foco: document.activeElement.id })""")
    ok(conf=={'titulo':'Eliminar jornada','puntos':2,'nota':'No se puede deshacer.','tono':'alerta','icono':True,'etiqueta':'dlg-confirmar-titulo dlg-confirmar-texto','foco':'btn-confirmar-no'},
       'la confirmación es estructurada: título, pregunta, viñetas y «No se puede deshacer» en rojo con icono; el foco empieza en «Cancelar» (D139): %s' % conf)
    pg.click('#btn-confirmar-si'); pg.wait_for_timeout(700)
    ok(pg.is_hidden('#jornada-detalle') and pg.evaluate("async () => !(await SRP.almacen.uno('jornadas', '%s'))" % vacia) and pg.evaluate("SRP.activa.jornada === null || SRP.activa.jornada.id !== '%s'" % vacia),'la jornada desaparece, vuelve a la lista y deja de ser la activa')
    pg.click('#jornada-atajos [data-atajo=dia]'); pg.fill('#jornada-dia', M['f']); pg.dispatch_event('#jornada-dia','change'); pg.wait_for_timeout(500)
    pg.click('#lista-jornadas .jornada:nth-child(2) button'); pg.wait_for_timeout(800)
    # Mover un árbol de la jornada 2 a la 1
    pg.click('#jornada-lista .punto-jornada[data-id="%s"] .btn-tuerca' % M['ids'][3]); pg.wait_for_timeout(200)
    pg.click('#jornada-lista .punto-jornada[data-id="%s"] [data-accion=mover]' % M['ids'][3]); pg.wait_for_timeout(400)
    ok(pg.is_visible('#dlg-mover-jornada') and pg.locator('#lista-mover-jornadas button[data-id]').count()>=2 and 'Parque de los Pericos' in pg.inner_text('#lista-mover-jornadas'),'«Mover a otra jornada» ofrece las demás jornadas del cabo (D119)')
    pg.click('#lista-mover-jornadas button[data-id="%s"]' % M['jids'][0]); pg.wait_for_timeout(800)
    ok(pg.inner_text('#jornada-registrados')=='1' and pg.evaluate("async () => (await SRP.almacen.uno('plantaciones','%s')).jornada_id" % M['ids'][3])==M['jids'][0],'el árbol pasa a la jornada 1 y la 2 queda con 1')
    ok(pg.evaluate("async () => (await SRP.bitacora.deEntidad('%s')).some(h => h.detalle && h.detalle.includes('Movido a la jornada'))" % M['ids'][3]),'y el movimiento queda en el historial del registro')
    pg.click('#jornada-lista .punto-jornada[data-id="%s"] .btn-tuerca' % M['ids'][4]); pg.wait_for_timeout(200)
    pg.click('#jornada-lista .punto-jornada[data-id="%s"] [data-accion=mover]' % M['ids'][4]); pg.wait_for_timeout(300)
    pg.click('#btn-mover-cerrar'); pg.wait_for_timeout(200)
    # Reabrir y cerrar desde la revisión
    ok(pg.is_visible('#btn-jornada-estado') and 'Reabrir' in pg.inner_text('#btn-jornada-estado') and 'btn-editar' in pg.get_attribute('#btn-jornada-estado','class'),'una jornada cerrada ofrece «Reabrir jornada» en dorado (D121)')
    pg.click('#btn-jornada-estado'); pg.wait_for_timeout(600)
    ok('Cerrar jornada' in pg.inner_text('#btn-jornada-estado') and 'btn-primario' in pg.get_attribute('#btn-jornada-estado','class') and pg.locator('#btn-jornada-estado svg').count()==1 and 'abierta' in pg.inner_text('#jornada-sub') and pg.evaluate("SRP.activa.jornada && SRP.activa.jornada.id")==M['jids'][1],'reabrir la deja abierta y activa; «Cerrar jornada» va en guinda con candado, no en verde (D121)')
    pg.click('#btn-jornada-estado'); pg.wait_for_timeout(300)
    ok('Queda pendiente' in pg.inner_text('#dlg-confirmar') and pg.locator('#dlg-confirmar-puntos li', has_text='por debajo de la meta').count()==1 and 'reabrir después' in pg.inner_text('#dlg-confirmar-nota'),'al cerrar, el diálogo dice lo que queda pendiente frente a la meta (D133): '+pg.inner_text('#dlg-confirmar-texto'))
    pg.click('#btn-confirmar-si'); pg.wait_for_timeout(600)
    ok('Reabrir' in pg.inner_text('#btn-jornada-estado') and pg.evaluate("SRP.activa.jornada")is None,'y cerrarla la quita de activa')
    # D125: «Cerrar jornada» desde la franja siempre llega a la ficha de esa jornada en Jornadas, aunque sea de otro día y el filtro esté en «Hoy»
    pg.evaluate("SRP.jornadas.aplicarAtajo('hoy')"); pg.wait_for_timeout(200)
    iniciar_jornada(pg, 'Jornada de ayer', '2026-09-22')
    pg.click('#btn-jornada-cerrar'); pg.wait_for_timeout(300); pg.click('#btn-confirmar-si'); pg.wait_for_timeout(800)
    d125=[pg.is_visible('#vista-jornadas'), pg.is_visible('#jornada-detalle'), pg.inner_text('#jornada-titulo'), pg.get_attribute('#jornada-atajos [data-atajo=dia]','aria-pressed'), pg.input_value('#jornada-dia')]
    ok(d125==[True, True, 'Jornada de ayer', 'true', '2026-09-22'],'cerrar una jornada de otro día desde la franja abre su ficha en Jornadas y ajusta el filtro a ese día (D125): %s' % d125)
    # D133: registrar en una jornada que no es de hoy se confirma; un árbol a medias no se pierde al cambiar de sección
    iniciar_jornada(pg, 'Jornada de anteayer', '2026-09-21')
    pg.click('#btn-ubicacion'); pg.wait_for_timeout(700); pg.fill('#campo-especie','ahuehu'); pg.wait_for_timeout(200); pg.dispatch_event('.combo-opcion[data-id="ESP-0070"]','mousedown'); pg.wait_for_timeout(150)
    pg.click('#form-plantacion button[type=submit]'); pg.wait_for_timeout(500)
    ok(pg.is_visible('#dlg-confirmar') and pg.inner_text('#dlg-confirmar-titulo')=='Jornada de otro día' and 'no es de hoy' in pg.inner_text('#dlg-confirmar-puntos') and '«Cambiar»' in pg.inner_text('#dlg-confirmar-puntos'),'guardar en una jornada de otro día pide confirmar y dice cómo iniciar la de hoy (D133)')
    pg.click('#btn-confirmar-no'); pg.wait_for_timeout(300)
    ok(pg.evaluate("SRP.formulario.aMedias()") and pg.evaluate("(async () => (await SRP.almacen.porIndice('plantaciones','estatus','activo')).filter(r => r.jornada_id === SRP.activa.jornada.id).length)()")==0,'cancelar no guarda y el árbol sigue a medias en pantalla')
    pg.click('.pestana[data-vista=jornadas]'); pg.wait_for_timeout(300)
    ok(pg.is_visible('#dlg-confirmar') and 'no se ha guardado' in pg.inner_text('#dlg-confirmar-texto') and 'btn-peligro' in pg.get_attribute('#btn-confirmar-si','class'),'salir con un árbol a medias pide confirmar en rojo (D133)')
    ok('La ubicación registrada.' in pg.inner_text('#dlg-confirmar-puntos') and 'La especie: ' in pg.inner_text('#dlg-confirmar-puntos') and pg.inner_text('#dlg-confirmar-nota')=='No se puede deshacer.',
       'y enumera lo que se perdería —ubicación, especie— y que no se deshace (D139): '+pg.inner_text('#dlg-confirmar-puntos').replace(chr(10),' | '))
    pg.click('#btn-confirmar-no'); pg.wait_for_timeout(300)
    ok(pg.is_visible('#vista-registrar') and pg.input_value('#campo-especie')!='','«Cancelar» se queda en el formulario con lo capturado')
    pg.click('.pestana[data-vista=jornadas]'); pg.wait_for_timeout(300); pg.click('#btn-confirmar-si'); pg.wait_for_timeout(500)
    ok(pg.is_visible('#vista-jornadas') and not pg.evaluate("SRP.formulario.aMedias()"),'«Descartar» sale y limpia el formulario')
    pg.evaluate("async () => { const j = SRP.activa.jornada; await SRP.activa.cambiarEstatus(j, 'cerrada'); SRP.activa.jornada = null; }"); pg.wait_for_timeout(300)
    pg.evaluate("SRP.jornadas.aplicarAtajo('todas')"); pg.wait_for_timeout(300)
    pg.evaluate("SRP.jornadas.abrir('%s')" % M['jids'][1]); pg.wait_for_timeout(400)   # se vuelve a la jornada 2 para lo que sigue
    # D124: sistema de botones. El acento es pizarra; verde, rojo y ámbar significan; los filtros son píldoras
    d124=pg.evaluate('''() => { const g = e => getComputedStyle(e); const r = document.documentElement.style; const v = n => getComputedStyle(document.documentElement).getPropertyValue(n).trim().toUpperCase();
      return { acento: v('--acento'), radio: g(document.getElementById('btn-jornada-reporte')).borderRadius, chip: g(document.querySelector('#jornada-atajos .chip')).borderRadius,
        apoyo: g(document.getElementById('btn-jornada-faltante')).borderColor, texto_sub: g(document.getElementById('btn-jornada-volver')).textDecorationLine,
        volver: getComputedStyle(document.getElementById('btn-jornada-volver'), '::before').borderLeftWidth }; }''')
    ok(d124['acento']=='#2F4858' and d124['radio']=='8px' and d124['chip']=='999px' and d124['apoyo']=='rgb(154, 163, 171)' and d124['texto_sub']=='none' and d124['volver']=='2px',
       'sistema de botones (D124): acento pizarra, radio 8, filtros en píldora, apoyo con contorno gris, volver con chevron y sin subrayado: %s' % d124)
    # Reportes: una ficha por jornada cerrada y un PDF por jornada (D134)
    pg.click('#btn-jornada-reporte'); pg.wait_for_timeout(700)
    ok(pg.is_visible('#vista-reportes') and pg.is_visible('#dlg-cierre'),'«Reporte de la jornada» llega al cierre de la jornada 2')
    pg.click('#btn-cierre-cerrar'); pg.wait_for_timeout(200)
    pg.click('#pdf-atajos [data-atajo=dia]'); pg.fill('#pdf-dia', M['f']); pg.dispatch_event('#pdf-dia','change'); pg.wait_for_timeout(400)
    fichas=pg.eval_on_selector_all('#pdf-lista .jornada','l=>l.map(x=>x.textContent)')
    f2=[f for f in fichas if 'Parque Hundido' in f]
    ok(len(fichas)==3 and len(f2)==1 and 'Jornada 2 de 3' in f2[0] and 'Regenerar reporte' not in f2[0],'las tres jornadas cerradas de ese día tienen ficha; la 2 dice «Jornada 2 de 3» y aún no tiene reporte (D134)')
    pg.locator('#pdf-lista .jornada', has_text='Parque Hundido').locator('button[data-id]').click(); pg.wait_for_timeout(400)
    ok('Parque Hundido' in pg.inner_text('#dlg-cierre-dia') and 'Jornada 2 de 3' in pg.inner_text('#dlg-cierre-dia') and '1 ejemplar' in pg.inner_text('#dlg-cierre-cuenta'),'el cierre es de la jornada 2: '+pg.inner_text('#dlg-cierre-dia'))
    pg.click('#btn-cierre-generar'); pg.wait_for_timeout(600)
    ok('Jornada 2 de 3' in pg.inner_text('#previa-hoja') and pg.locator('#previa-hoja tbody tr').count()>=1 and 'Jornada: Parque Hundido' in pg.inner_text('#previa-hoja'),'la vista previa dice «Jornada 2 de 3» y su nombre, y sólo trae sus ejemplares')
    with pg.expect_download() as dm: pg.click('#btn-previa-generar')
    ok(dm.value.suggested_filename.endswith('_'+M['f']+'_J2.pdf'),'el archivo lleva el número de jornada: '+dm.value.suggested_filename)
    pg.evaluate("async () => { const tx = SRP.almacen.db.transaction(['plantaciones','jornadas'],'readwrite'); %s.forEach(id => tx.objectStore('plantaciones').delete(id)); %s.forEach(id => tx.objectStore('jornadas').delete(id)); await new Promise(r => tx.oncomplete = r); }" % (json.dumps(M['ids']), json.dumps(M['jids'])))

    # Los cuatro puntos de prueba se retiran para no alterar las cuentas que siguen
    pg.evaluate("async () => { const tx = SRP.almacen.db.transaction(['plantaciones','jornadas'],'readwrite'); %s.forEach(id => tx.objectStore('plantaciones').delete(id)); tx.objectStore('jornadas').delete('%s'); await new Promise(r => tx.oncomplete = r); }" % (json.dumps(J['ids']), J['jid']))
    pg.evaluate("SRP.app.mostrarVista('reportes')"); pg.wait_for_timeout(300)

    # ---------- SIN SEÑAL Y RESPALDO (B25) ----------
    pg.evaluate("SRP.envio.alCambiar()"); pg.wait_for_timeout(400)   # lo cargado para Jornadas se retiró a mano: la pastilla se pone al día
    ok(pg.text_content('#conexion').strip().startswith('Con conexión · ') and pg.locator('#conexion svg').count()==1 and pg.get_attribute('#conexion','data-estado')=='con','el encabezado dice el estado de la conexión y del envío, con icono y color (D83, D111): '+pg.text_content('#conexion').strip())
    pg.click('#conexion'); pg.wait_for_timeout(200)
    ok(pg.is_visible('#dlg-senal'),'y tocar la pastilla abre la guía de qué hacer sin internet (D80)')
    pg.click('#btn-senal-cerrar'); pg.wait_for_timeout(200)
    ok(pg.locator('#aviso-envio').count()==0 and pg.locator('#btn-ayuda-senal').count()==0,'el bloque «Registros en este dispositivo» ya no existe (D104)')
    pg.click('#conexion'); pg.wait_for_timeout(200)
    ok(pg.is_visible('#dlg-senal') and pg.locator('#dlg-senal li').count()==5,'la ayuda «¿Qué hacer sin internet?» tiene cinco pasos')
    ok(pg.is_visible('#senal-cola') and 'Todo enviado' in pg.inner_text('#senal-cola-texto') and 'Último envío: hoy a las' in pg.inner_text('#senal-cola-texto') and 'se envían solos' in pg.inner_text('#senal-destino'),
       'con el envío simulado la guía dice cómo va la cola y cuándo fue el último envío (D111): '+pg.inner_text('#senal-cola-texto'))
    pg.click('#btn-senal-cerrar'); pg.wait_for_timeout(200)
    # El worker guarda la app: sin red, la página vuelve a abrir
    listo=pg.evaluate("""async () => { const r = await navigator.serviceWorker.ready; for (let i=0;i<50;i++){ const ks = await caches.keys(); if (ks.length) { const c = await caches.open(ks[0]); const k = await c.keys(); if (k.length > 20) return { nombre: ks[0], n: k.length }; } await new Promise(r => setTimeout(r, 200)); } return null; }""")
    ok(listo and listo['nombre']=='srp-'+MARCA and listo['n']>20,'el service worker guardó la app con la marca de versión: %s' % listo)
    ctx.set_offline(True)
    ok(pg.evaluate("SRP.folio.emitirPendientes()")==0,'sin conexión el servidor simulado no emite: lo capturado queda PROVISIONAL hasta que vuelva la señal (D110)')
    pg.reload(); pg.wait_for_timeout(1500)
    ok(pg.is_visible('#vista-registros') or pg.is_visible('#vista-registrar') or pg.is_visible('#form-acceso'),'sin red, la app vuelve a abrir desde el teléfono')
    ok(pg.evaluate("SRP.CONFIG.VERSION")==MARCA,'y es la misma versión')
    ok(pg.text_content('#conexion').strip().startswith('Sin conexión · ') and pg.get_attribute('#conexion','data-estado')=='sin','el encabezado avisa que no hay señal, en dorado y con icono tachado: '+pg.text_content('#conexion').strip())
    # ---------- ENVÍO SIMULADO (D111) ----------
    # Un registro de ayer que nunca salió del teléfono
    rid=pg.evaluate("""async () => { const u = SRP.sesion.usuario; const base = (await SRP.almacen.porIndice('plantaciones','estatus','activo')).find(r => r.cabo_id === u.id);
      const ayer = new Date(Date.now() - 86400000).toISOString(); const id = SRP.util.generarId();
      const r = Object.assign({}, base, { id, folio: null, folio_uga: null, folio_capa_version: null, folio_lat: null, folio_lng: null, fecha_registro: ayer, es_ficticio: true });
      await SRP.almacen.guardarConBitacora('plantaciones', r, SRP.bitacora.entrada('CREADO','plantacion',id)); await SRP.envio.alCambiar(); return id; }""")
    pg.wait_for_timeout(300)
    ok(pg.text_content('#conexion').strip()=='Sin conexión · 1 por enviar' and pg.get_attribute('#conexion','data-estado')=='atraso',
       'sin señal la pastilla cuenta lo que espera envío y se pone en rojo si hay atraso (D111): '+pg.text_content('#conexion').strip())
    fr=pg.inner_text('#franja-envio-texto')
    ok(pg.is_visible('#franja-envio') and fr.startswith('Hoy es ') and 'Tiene 1 registro sin enviar desde el ' in fr and 'Busque señal' in fr,'y la franja dice qué día es y desde cuándo no se envía (D111): '+fr)
    est=pg.evaluate("() => { const b = document.getElementById('btn-franja-enviar'); b.click(); return [b.getAttribute('aria-busy'), b.textContent, b.disabled]; }")
    ok(est[0]=='true' and 'Enviando' in est[1] and est[2],'«Enviar ahora» dice «Enviando…», queda aria-busy y no admite otro toque mientras intenta (D136): '+str(est))
    pg.wait_for_timeout(300)
    ok(pg.get_attribute('#btn-franja-enviar','aria-busy') is None and pg.inner_text('#btn-franja-enviar')=='Enviar ahora','y vuelve a su texto al terminar')
    ok('Sin conexión' in pg.inner_text('#aviso') and pg.get_attribute('#aviso','data-tipo')=='alerta','«Enviar ahora» sin señal explica que se enviará solo (D111): '+pg.inner_text('#aviso'))
    pg.evaluate("SRP.app.mostrarVista('registros')"); pg.wait_for_timeout(500)
    ok(pg.locator('#lista-registros li[data-id="%s"] .marca-envio' % rid).count()==1,'la tarjeta lleva la marca «Por enviar» (D111)')
    ctx.set_offline(False); pg.wait_for_timeout(300)
    ok(pg.text_content('#conexion').strip()=='Enviando 1…','al volver la señal sale solo, sin que nadie toque nada (D111)')
    pg.wait_for_timeout(1700)
    ok(pg.text_content('#conexion').strip()=='Con conexión · Al día (simulado)' and pg.is_hidden('#franja-envio'),'y la pastilla queda «Al día» y la franja se va (D111)')
    ok('1 registro enviado al servidor (simulado)' in pg.inner_text('#aviso'),'con aviso de recepción: '+pg.inner_text('#aviso'))
    li='#lista-registros li[data-id="%s"]' % rid
    ok(pg.locator(li+' .marca-envio').count()==0 and re.search(r'[A-Z]{3}-\d{3}-\d{5}', pg.inner_text(li+' .registro-estado .registro-folio')) is not None,'la tarjeta pierde la marca y muestra su folio, sin repintar la lista (D111)')
    pg.click(li); pg.wait_for_timeout(500)
    ok('Recibido por el servidor hoy a las' in pg.inner_text('#dlg-detalle-cuerpo'),'el detalle dice cuándo lo recibió el servidor (D111)')
    pg.keyboard.press('Escape'); pg.wait_for_timeout(300)
    est=pg.evaluate("""async () => { SRP.envio.marcarCambios('%s'); const r = await SRP.almacen.uno('plantaciones','%s'); const a = SRP.envio.estado(r);
      const f = r.folio; await SRP.envio.enviar({ silencioso: true }); const r2 = await SRP.almacen.uno('plantaciones','%s'); return [a, SRP.envio.estado(r2), r2.folio === f]; }""" % (rid,rid,rid))
    ok(est==['cambios','recibido',True],'una edición posterior vuelve a la cola y se reenvía sin cambiar el folio (D111, R7): %s' % est)
    # «Simular sin señal»: se comporta como sin conexión sin modo avión, y un corte a medio envío no da nada por recibido
    pg.click('#btn-cuenta'); pg.wait_for_timeout(150)
    ok(pg.is_visible('#btn-sin-senal') and pg.get_attribute('#btn-sin-senal','role')=='switch','el menú de cuenta trae «Simular sin señal (pruebas)» (D111)')
    pg.click('#btn-sin-senal'); pg.wait_for_timeout(300)
    ok(pg.text_content('#conexion').strip().startswith('Sin conexión') and pg.get_attribute('#btn-sin-senal','aria-checked')=='true','y al activarlo la app se comporta como sin señal (D111)')
    pg.click('#btn-cuenta'); pg.wait_for_timeout(150); pg.click('#btn-sin-senal'); pg.wait_for_timeout(300)
    cort=pg.evaluate("""async () => { SRP.envio.marcarCambios('%s'); const p = SRP.envio.enviar({ silencioso: true }); await new Promise(r => setTimeout(r, 200));
      localStorage.setItem(SRP.CONFIG.CLAVE_SIN_SENAL_PRUEBA, '1'); const res = await p; const r = await SRP.almacen.uno('plantaciones','%s');
      const est = SRP.envio.estado(r); SRP.envio.forzarSinSenal(false); await SRP.envio.esperar(1600); return [!!res.cortado, est]; }""" % (rid,rid))
    ok(cort==[True,'cambios'],'si la señal se va a medio envío, nada se da por recibido y el registro sigue en la cola (D111): %s' % cort)
    # El registro de ayer era sólo para esta prueba: se retira para no alterar las cuentas que siguen
    pg.evaluate("async () => { const tx = SRP.almacen.db.transaction('plantaciones','readwrite'); tx.objectStore('plantaciones').delete('%s'); await new Promise(r => tx.oncomplete = r); }" % rid)
    pg.evaluate("SRP.app.mostrarVista('registrar')"); pg.wait_for_timeout(300)
    ctx.set_offline(True); pg.wait_for_timeout(200)
    pg.evaluate("SRP.app.mostrarVista('reportes')"); pg.wait_for_timeout(500)
    ctx.set_offline(False); pg.wait_for_timeout(300)
    pg.evaluate("SRP.conexion.refrescar()"); pg.wait_for_timeout(300)
    # Respaldo: se descarga y se restaura en un dispositivo limpio
    pg.click('#btn-cuenta'); pg.wait_for_timeout(150)
    ok(pg.is_visible('#menu-cuenta #btn-respaldo'),'«Guardar respaldo» está en el menú de la cuenta (D104)')
    with pg.expect_download() as d2: pg.click('#btn-respaldo')
    ruta='/home/claude/srp/respaldo_prueba.json'; d2.value.save_as(ruta)
    import json
    resp=json.load(open(ruta,encoding='utf-8'))
    idsR=set(p_['id'] for p_ in resp['plantaciones']+resp['jornadas'])
    ok(resp['sistema']=='SRP' and len(resp['plantaciones'])>=4 and all(k in resp for k in ('jornadas','bitacora','cuentas')) and 'usuarios' not in resp and 'catalogos' not in resp
       and all(b_['entidad_id'] in idsR for b_ in resp['bitacora']) and all(set(c_.keys())=={'id','nombre'} for c_ in resp['cuentas']),
       'el respaldo lleva sólo el alcance de quien respalda: árboles, jornadas, su bitácora y de las cuentas sólo id y nombre (D150): %d registros, %d jornadas, %d cuentas' % (len(resp['plantaciones']), len(resp['jornadas']), len(resp['cuentas'])))
    ok(resp['resumen']['con_foto']>=1 and resp['resumen']['foto_bytes']>0,'y el resumen de fotografías: %s' % resp['resumen'])
    ok(all('es_ficticio' in c for c in resp['jornadas']) and all('es_ficticio' in b for b in resp['bitacora']),'jornadas y bitácora llevan es_ficticio (D87)')
    ctx2=b.new_context(viewport={'width':390,'height':844}); pg2=ctx2.new_page(); pg2.goto(BASE); pg2.wait_for_timeout(1200)
    pg2.select_option('#sel-usuario-prueba','u-cabo-1'); pg2.click('#btn-entrar-prueba'); pg2.wait_for_timeout(500)
    antes=pg2.evaluate("SRP.almacen.todos('plantaciones').then(r=>r.length)")
    pg2.set_input_files('#archivo-restaurar', ruta); pg2.wait_for_timeout(1200)
    ok(pg2.is_visible('#dlg-confirmar') and 'Restaurar respaldo' in pg2.inner_text('#dlg-confirmar'),'restaurar enseña primero el resumen y pide confirmación (D150)')
    pg2.click('#btn-confirmar-si'); pg2.wait_for_timeout(1000)
    despues=pg2.evaluate("SRP.almacen.todos('plantaciones').then(r=>r.length)")
    propios=len([p_ for p_ in resp['plantaciones'] if p_['cabo_id']=='u-cabo-1'])
    ok(antes==0 and despues==propios and propios>0,'y se restaura en un dispositivo limpio lo que alcanza quien restaura: %d → %d registros (de %d en el archivo)' % (antes, despues, len(resp['plantaciones'])))
    pg2.set_input_files('#archivo-restaurar', ruta); pg2.wait_for_timeout(800)
    ok(pg2.evaluate("SRP.almacen.todos('plantaciones').then(r=>r.length)")==despues and pg2.is_hidden('#dlg-confirmar'),'restaurar dos veces no duplica nada: dice que no hay nada nuevo')
    ctx2.close()
    # Lo escrito no se vuelve a pedir al regenerar el reporte de la misma jornada
    reporte_de(pg)
    ok('Regenerar reporte' in pg.inner_text('#pdf-lista .jornada >> nth=0') and 'reporte generado' in pg.inner_text('#pdf-lista .jornada >> nth=0').lower(),'una jornada con reporte dice cuándo se generó y ofrece «Volver a generar» en ámbar (D134)')
    # «Regenerar reporte» (D148): dice qué se vuelve a generar y usa la flecha en círculo, no el lápiz
    reg=pg.evaluate("""() => { const b=[...document.querySelectorAll('#pdf-lista button[data-id]')].find(x => x.textContent.includes('Regenerar'));
        return b ? { texto: b.textContent.trim(), flecha: b.innerHTML.includes('M17.65 6.35'), lapiz: b.innerHTML.includes('M3 17.25'), ambar: b.classList.contains('btn-editar') } : null; }""")
    ok(reg is not None and reg['texto']=='Regenerar reporte' and reg['flecha'] and not reg['lapiz'] and reg['ambar'],
       'una jornada con reporte ofrece «Regenerar reporte», en ámbar y con la flecha en círculo en lugar del lápiz (D148): %s' % reg)
    ok(pg.input_value('#cie-chofer')=='Fulano de Tal','al regenerar, el cierre ya viene escrito')
    ok(pg.input_value('#cie-hora')=='14:30' and pg.input_value('#cie-vehiculo_placa')=='ABC-123','con todos sus campos')
    ok(pg.evaluate("document.getElementById('cie-apoyo').tagName")=='TEXTAREA','personal de apoyo admite varias líneas')
    ok(pg.evaluate("[...document.querySelectorAll('#form-cierre .campo')][0].contains(document.getElementById('cie-encargado'))"),'el encargado es el primer campo del cierre')
    pg.click('#btn-cierre-cerrar'); pg.wait_for_timeout(300)
    # Los campos vacíos no se inventan: el cierre guardado no trae lo que no se escribió
    vacios=pg.evaluate("async () => { const c = (await SRP.almacen.todos('jornadas')).find(j => j.nombre === 'Parque Hundido' && j.fecha === SRP.util.fechaHoy()); return [c.observaciones, 'actividades' in c ? 'sobra' : '', document.getElementById('cie-actividades') ? 'campo' : '', c.chofer === 'Fulano de Tal' ? '' : 'sin cierre']; }")
    ok(all(v=='' for v in vacios),'y lo que no se escribió queda vacío, no inventado; y «Actividades» ya no existe (D118): %s' % vacios)

    pg.click('.pestana[data-vista=registros]'); pg.wait_for_timeout(500)
    abrir_filtros(pg)
    accion(pg,'#lista-registros','ver'); pg.wait_for_timeout(900)
    ok(pg.locator('#detalle-mapa .leaflet-marker-icon').count()==1,'el detalle trae el mapa con el punto')
    ok(pg.evaluate("getComputedStyle(document.querySelector('#dlg-detalle-cuerpo dt')).fontWeight")=='700',
       'con las etiquetas en negritas')
    fila_foto=pg.locator('#dlg-detalle-cuerpo .revision-fila', has_text='Fotografía')
    ok(fila_foto.count()==1,'la fotografía tiene su propio renglón')
    y_foto=fila_foto.bounding_box()['y']
    y_hist=pg.locator('#dlg-detalle .historial').bounding_box()['y']
    y_esp=pg.locator('#dlg-detalle-cuerpo .revision-fila', has_text='Especie').bounding_box()['y']
    ok(y_esp < y_foto < y_hist,'orden: datos, fotografía y al final el historial')
    ok('Historial' in pg.inner_text('#dlg-detalle'),'el detalle trae el historial')
    ok('Identificador' in pg.inner_text('#dlg-detalle'),'y el identificador del registro')
    pg.click('#btn-detalle-cerrar'); pg.wait_for_timeout(300)
    ok(pg.evaluate("SRP.registros.mapaDetalle")is None,'al cerrar, su mapa se destruye')
    accion(pg,'#lista-registros','editar'); pg.wait_for_timeout(600)
    ok(pg.is_visible('#edicion-aviso'),'editar abre el formulario precargado')
    ok(pg.get_attribute('.pestana[data-vista=registros]','aria-current')=='page' and pg.get_attribute('.pestana[data-vista=registrar]','aria-current') is None,
       'al editar queda marcada la pestaña Registros, no «Nuevo registro» (D100)')
    # En edición el espejo cambia de cara: conserva al cabo original, anuncia EDITADO y
    # deja claro que la marca de edición se fija al guardar, no al abrir
    espejoEd=pg.evaluate("""() => ({
      cabo: [...document.querySelectorAll('#espejo-cuerpo tr')].find(t=>t.textContent.includes('cabo_id')).children[1].textContent,
      quien: SRP.sesion.usuario.id,
      accion: [...document.querySelectorAll('#espejo-bitacora tr')].find(t=>t.textContent.includes('accion')).children[1].textContent,
      edicion: [...document.querySelectorAll('#espejo-cuerpo tr')].find(t=>t.textContent.includes('fecha_ultima_edicion')).children[1].textContent
    })""")
    ok(pg.is_visible('#caja-programa'),'al editar un registro el programa sí se ve: es dato del árbol (D132)')
    ok(espejoEd['accion']=='EDITADO' and 'al guardar' in espejoEd['edicion'],
       'en edición el espejo anuncia EDITADO, con la marca pendiente de fijar')
    pg.fill('#campo-especie','ahuehu'); pg.wait_for_timeout(150)
    pg.dispatch_event('.combo-opcion[data-id="ESP-0070"]','mousedown'); pg.wait_for_timeout(200)
    pg.click('#form-plantacion button[type=submit]'); pg.wait_for_timeout(800)
    pg.click('#btn-resumen-guardar'); pg.wait_for_timeout(700)
    pg.click('.chip[data-atajo=todos]'); pg.wait_for_timeout(300)
    accion(pg,'#lista-registros','ver'); pg.wait_for_timeout(400)
    ok('editado' in pg.inner_text('#dlg-detalle'),'el historial registra la edición')
    pg.click('#btn-detalle-cerrar'); pg.wait_for_timeout(200)
    # Se elimina un registro sin fotografía, para que la galería de más adelante conserve la suya
    accion(pg,pg.locator('#lista-registros .registro:has(.registro-sin-foto)'),'eliminar'); pg.wait_for_timeout(500)
    ok('Total: 3 ' in pg.inner_text('#registros-total'),'eliminar retira del listado: '+pg.inner_text('#registros-total'))
    av=pg.evaluate("(() => { const a=document.getElementById('aviso'); const r=a.getBoundingClientRect(); return { texto: a.querySelector('.aviso-texto').textContent, deshacer: !!a.querySelector('.aviso-accion'), cerrar: !!a.querySelector('.aviso-cerrar'), arriba: r.top < innerHeight/3 }; })()")
    ok(av['texto'].startswith('Registro de ') and 'eliminado' in av['texto'] and av['deshacer'] and av['cerrar'] and av['arriba'] and pg.is_hidden('#dlg-confirmar'),
       'sin confirmación, el aviso flotante dice qué registro se eliminó, va arriba, con × y «Deshacer» (D101, D139): %s' % av)
    pg.click('#aviso .aviso-accion'); pg.wait_for_timeout(500)
    ok('Total: 4 ' in pg.inner_text('#registros-total') and 'restaurado' in pg.inner_text('#aviso'),'«Deshacer» devuelve el registro eliminado: '+pg.inner_text('#registros-total'))
    ok(pg.evaluate("(async () => (await SRP.bitacora.deEntidad(SRP.registros.filtrados[0].id)).length >= 0)()") is True and
       pg.evaluate("(async () => { const b = await SRP.almacen.todos('bitacora'); return b.some(x => x.accion === 'RESTAURADO'); })()"),'y la bitácora deja constancia con RESTAURADO')
    accion(pg,pg.locator('#lista-registros .registro:has(.registro-sin-foto)'),'eliminar'); pg.wait_for_timeout(500)
    ok('Total: 3 ' in pg.inner_text('#registros-total'),'se vuelve a eliminar para seguir la prueba')
    abrir_filtros(pg); pg.click('#btn-reiniciar-filtros'); pg.wait_for_timeout(300)
    pg.click('#aviso .aviso-accion'); pg.wait_for_timeout(300)
    ok('Total: 3 ' in pg.inner_text('#registros-total') and pg.get_attribute('.chip[data-atajo=todos]','aria-pressed')=='true','«Deshacer» de Reiniciar filtros devuelve el filtro anterior (D101)')

    # ---------- COORDINADOR ----------
    pg.click('#btn-cuenta'); pg.click('#btn-cambiar-perfil'); pg.select_option('#sel-usuario-prueba','u-coord-1'); pg.click('#btn-entrar-prueba'); pg.wait_for_timeout(600)
    pg.click('.pestana[data-vista=registros]'); pg.wait_for_timeout(500)
    abrir_filtros(pg)
    pg.click('.chip[data-atajo=todos]'); pg.wait_for_timeout(300)
    ok('Total: 3 ' in pg.inner_text('#registros-total'),'el coordinador ve los de su cuadrilla: '+pg.inner_text('#registros-total'))
    ok('Fulana' in pg.inner_text('#lista-registros'),'con el nombre del cabo')
    ok(pg.locator('button[data-accion=editar]').count()>0 and pg.locator('button[data-accion=eliminar]').count()==0,'edita pero no elimina')
    ok(pg.is_hidden('.pestana[data-vista=catalogos]') and pg.is_hidden('.pestana[data-vista=usuarios]'),'no ve Catálogos ni Usuarios')
    ok(not pg.evaluate("document.getElementById('caja-filtro-cabo').hidden") and 'cabo' in pg.inner_text('#filtro-mas-filtros summary'),'sí tiene filtro por cabo, dentro de «Más filtros» (D129): '+pg.inner_text('#filtro-mas-filtros summary'))
    # Galería de fotografías (D118): coordinación y administración la ven; el cabo no
    # El coordinador cierra y reabre las jornadas de sus cabos (D133)
    pg.click('.pestana[data-vista=jornadas]'); pg.wait_for_timeout(600); pg.evaluate("SRP.jornadas.aplicarAtajo('todas')"); pg.wait_for_timeout(300)
    pg.click('#lista-jornadas .jornada button >> nth=0'); pg.wait_for_timeout(800)
    ok(pg.is_visible('#btn-jornada-estado') and pg.is_visible('#btn-jornada-editar') and pg.inner_text('#jornada-sub').find('Fulana')>=0,'en la jornada de un cabo, el coordinador ve Cerrar/Reabrir y Editar (D133): '+pg.inner_text('#btn-jornada-estado'))
    era=pg.inner_text('#btn-jornada-estado')
    pg.click('#btn-jornada-estado'); pg.wait_for_timeout(300)
    if pg.is_visible('#dlg-confirmar'): pg.click('#btn-confirmar-si')
    pg.wait_for_timeout(700)
    ok(pg.inner_text('#btn-jornada-estado')!=era and pg.evaluate("SRP.activa.jornada === null || SRP.activa.jornada.cabo_id === SRP.sesion.usuario.id"),'cambia el estado de la jornada del cabo sin volverse la activa del coordinador')
    pg.click('#btn-jornada-estado'); pg.wait_for_timeout(300)
    if pg.is_visible('#dlg-confirmar'): pg.click('#btn-confirmar-si')
    pg.wait_for_timeout(700)
    ok(pg.inner_text('#btn-jornada-estado')==era,'y la deja como estaba')
    ok(pg.is_visible('.pestana[data-vista=galeria]'),'el coordinador ve la sección Fotografías (D118)')
    pg.click('.pestana[data-vista=galeria]'); pg.wait_for_timeout(600)
    ok(pg.is_visible('#vista-galeria') and pg.locator('#galeria-rejilla .galeria-foto').count()>=1,'la galería muestra las fotografías de su cuadrilla: %d' % pg.locator('#galeria-rejilla .galeria-foto').count())
    ok(pg.inner_text('#galeria-cuenta').startswith('1 fotograf') or pg.inner_text('#galeria-cuenta')[0].isdigit(),'con la cuenta y el peso: '+pg.inner_text('#galeria-cuenta'))
    pg.click('#galeria-rejilla .galeria-foto >> nth=0'); pg.wait_for_timeout(400)
    ok(pg.is_visible('#dlg-foto') and pg.get_attribute('#dlg-foto-img','src').startswith('data:image/') and 'Cabo' in pg.inner_text('#dlg-foto-datos') and 'Foto_' in pg.inner_text('#dlg-foto-datos'),'tocar una la abre grande con los datos del árbol y el nombre del archivo')
    with pg.expect_download() as df: pg.click('#btn-foto-descargar')
    ok(re.fullmatch(r'Foto_[A-Za-z0-9-]+_\d{4}-\d{2}-\d{2}_[A-Za-z0-9_]+\.jpg', df.value.suggested_filename) is not None,'«Descargar» entrega la foto con nombre legible: '+df.value.suggested_filename)
    pg.click('#btn-foto-registro'); pg.wait_for_timeout(400)
    ok(pg.is_hidden('#dlg-foto') and pg.is_visible('#dlg-detalle'),'«Ver registro» abre el detalle')
    pg.click('#btn-detalle-cerrar'); pg.wait_for_timeout(300)
    with pg.expect_download() as dz: pg.click('#btn-galeria-zip')
    dz.value.save_as('/home/claude/srp/fotos_prueba.zip')
    import zipfile
    with zipfile.ZipFile('/home/claude/srp/fotos_prueba.zip') as z:
        nombres=z.namelist(); okzip=z.testzip() is None; primero=z.read(nombres[0])[:3]
    ok(dz.value.suggested_filename.startswith('Fotografias_SRP') and okzip and len(nombres)>=1 and primero==b'\xff\xd8\xff','«Descargar todas» arma un ZIP válido con las fotos en JPEG: %s' % nombres)
    # Por jornada (D135): la lista trae las jornadas con fotos; elegir una filtra y nombra el ZIP con ella
    ok([c for c in pg.eval_on_selector_all('#galeria-atajos .chip','b=>b.map(x=>x.dataset.atajo)')]==['todas','hoy','dia'],'los atajos de Fotografías van en el orden Todas, Hoy, Un día (D135)')
    pg.click('#galeria-atajos [data-atajo=todas]'); pg.wait_for_timeout(300)
    opciones=pg.eval_on_selector('#galeria-jornada',"s=>[...s.options].map(o=>o.value)")
    ok(len(opciones)>=2 and opciones[0]=='' and not pg.is_disabled('#galeria-jornada'),'la lista de jornadas ofrece «Todas» y las jornadas con fotografías: %d' % (len(opciones)-1))
    pg.select_option('#galeria-jornada', opciones[1]); pg.wait_for_timeout(400)
    nom=pg.evaluate("(async () => (await SRP.almacen.uno('jornadas','%s')).nombre)()" % opciones[1])
    ok(pg.locator('#galeria-rejilla .galeria-foto').count()>=1 and all(nom in t for t in pg.eval_on_selector_all('#galeria-rejilla .galeria-pie','l=>l.map(x=>x.textContent)')),'elegir una jornada deja sólo sus fotografías, y cada pie dice la jornada')
    with pg.expect_download() as dzj: pg.click('#btn-galeria-zip')
    ok(re.match(r'^Fotografias_SRP_[A-Za-z0-9_]+_\d{4}-\d{2}-\d{2}', dzj.value.suggested_filename) is not None,'el ZIP de una jornada lleva su nombre y su fecha: '+dzj.value.suggested_filename)
    pg.click('#galeria-atajos [data-atajo=hoy]'); pg.wait_for_timeout(300)
    ok(pg.evaluate("SRP.galeria.filtro.jornada")=='' and pg.input_value('#galeria-jornada')=='','cambiar de día limpia la jornada elegida')
    pg.click('.pestana[data-vista=registros]'); pg.wait_for_timeout(400)
    # Quien ve a varias personas elige el encargado del reporte, y sólo entre quienes registraron (B19)
    pg.click('.pestana[data-vista=reportes]'); pg.wait_for_timeout(600)
    ok(pg.is_visible('#caja-pdf-cabo') and pg.locator('#pdf-cabo option').count()>=2 and pg.locator('#pdf-cabo option[value=""]').count()==1 and pg.locator('#pdf-lista .jornada').count()>=1,'el coordinador filtra por cabo y ve las jornadas cerradas de su cuadrilla (D134)')
    reporte_de(pg)
    ok(pg.is_visible('#cie-encargado-caja') and pg.is_hidden('#cie-encargado-lectura'),
       'al coordinador se le ofrece la lista de cabos responsables')
    opciones=pg.eval_on_selector('#cie-encargado',"s=>[...s.options].map(o=>o.textContent.trim()).filter(Boolean)")
    ok(any('Fulana' in o for o in opciones),'con los cabos que registraron ese día: '+', '.join(opciones))
    pg.click('#btn-cierre-cerrar'); pg.wait_for_timeout(200)
    pg.click('.pestana[data-vista=registros]'); pg.wait_for_timeout(500)
    abrir_filtros(pg)
    pg.click('.chip[data-atajo=todos]'); pg.wait_for_timeout(300)
    # Al abrir para editar un registro ajeno, el espejo enseña que el autor no cambia de manos
    accion(pg,'#lista-registros','editar'); pg.wait_for_timeout(600)
    ajeno=pg.evaluate("""() => ({
      cabo: [...document.querySelectorAll('#espejo-cuerpo tr')].find(t=>t.textContent.includes('cabo_id')).children[1].textContent,
      editor: [...document.querySelectorAll('#espejo-cuerpo tr')].find(t=>t.textContent.includes('editado_por_id')).children[1].textContent,
      quien: SRP.sesion.usuario.id })""")
    ok(ajeno['cabo']=='u-cabo-1' and ajeno['quien']=='u-coord-1',
       'el coordinador edita y el registro sigue siendo del cabo: cabo_id='+ajeno['cabo'])
    ok(ajeno['editor'].startswith('u-coord-1'),'y quien edita queda en editado_por_id: '+ajeno['editor'])
    pg.click('#btn-cancelar-edicion'); pg.wait_for_timeout(400)

    # ---------- ADMINISTRACIÓN: catálogos ----------
    pg.click('#btn-cuenta'); pg.click('#btn-cambiar-perfil'); pg.select_option('#sel-usuario-prueba','u-admin-1'); pg.click('#btn-entrar-prueba'); pg.wait_for_timeout(600)
    ok(pg.is_hidden('.pestana[data-vista=registrar]'),'la administración no tiene pestaña Registrar')
    ok(pg.is_visible('#vista-registros'),'y entra directamente a Registros')
    pg.evaluate("SRP.app.mostrarVista('registrar')"); pg.wait_for_timeout(300)
    ok(pg.is_visible('#vista-registros'),'ni la abre llamándola directamente')
    pg.click('.pestana[data-vista=catalogos]'); pg.wait_for_timeout(500)
    ok(pg.locator('#tabla-catalogo button[data-accion=eliminar]').count()==0,'un programa en uso no ofrece Eliminar')
    pg.click('#btn-cat-agregar'); pg.wait_for_timeout(300)
    pg.fill('#cat-nombre','Restauración Ecológica'); pg.wait_for_timeout(150)
    ok(pg.input_value('#cat-clave')=='RESTAURACION_ECOLOGICA','la clave se sugiere sin acentos: '+pg.input_value('#cat-clave'))
    pg.fill('#cat-nombre','Refor Urbana'); pg.wait_for_timeout(150)
    ok(pg.input_value('#cat-clave')=='REFOR_URBANA_2','una clave que chocaría recibe sufijo')
    pg.fill('#cat-clave','mi clave-propia'); pg.wait_for_timeout(150)
    ok(pg.input_value('#cat-clave')=='MI_CLAVE_PROPIA','la clave se fuerza a mayúsculas')
    pg.fill('#cat-nombre','Otro Programa'); pg.wait_for_timeout(150)
    ok(pg.input_value('#cat-clave')=='MI_CLAVE_PROPIA','y deja de sugerirse si se editó a mano')
    pg.click('#form-catalogo button[type=submit]'); pg.wait_for_timeout(500)
    ok('Otro Programa' in pg.inner_text('#tabla-catalogo'),'se agrega el programa nuevo')
    accion(pg,'#tabla-catalogo','eliminar'); pg.click('#btn-confirmar-si'); pg.wait_for_timeout(400)
    ok('Otro Programa' not in pg.inner_text('#tabla-catalogo'),'y se elimina, porque no tiene uso')
    pg.click('#btn-cat-agregar'); pg.fill('#cat-nombre','Reforestación Urbana'); pg.fill('#cat-clave','REFOR_URBANA')
    pg.click('#form-catalogo button[type=submit]'); pg.wait_for_timeout(300)
    ok(pg.locator('#cat-errores li').count()==2,'se bloquean nombre y clave repetidos')
    pg.click('#btn-cat-cerrar'); pg.wait_for_timeout(200)
    pg.click('#cat-tipos .chip[data-tipo=especie]'); pg.wait_for_timeout(400)
    ok(pg.locator('#tabla-catalogo tbody tr').count()==76 and 'Distribución' in pg.inner_text('#tabla-catalogo thead'),'la tabla lista las 76 especies con su distribución (D84)')
    # Forma de crecimiento con botones de opción múltiple (D107)
    pg.click('#btn-cat-agregar'); pg.wait_for_timeout(300)
    ok(pg.locator('#cat-forma-botones .chip').count()==6 and pg.locator('#cat-forma-botones .chip[aria-pressed=true]').count()==0,'la forma de crecimiento se elige con seis botones, ninguno marcado al dar de alta (D107)')
    pg.click('#cat-forma-botones .chip[data-forma="Arbusto"]'); pg.click('#cat-forma-botones .chip[data-forma="Árbol"]'); pg.wait_for_timeout(100)
    ok(pg.input_value('#cat-forma')=='Árbol, Arbusto','se pueden marcar varias y se guardan en el orden de la lista: '+pg.input_value('#cat-forma'))
    pg.click('#btn-cat-cerrar'); pg.wait_for_timeout(200)
    pg.evaluate("document.querySelector('#tabla-catalogo th .th-orden').click()"); pg.wait_for_timeout(150)
    pg.evaluate("document.querySelector('#tabla-catalogo th .th-orden').click()"); pg.wait_for_timeout(150)
    ordn=pg.evaluate('''() => { const t=document.getElementById('tabla-catalogo'); const v=[...t.tBodies[0].rows].map(r=>r.cells[0].textContent.trim());
      const z=[...v].sort((a,b)=>b.localeCompare(a,'es',{sensitivity:'base'})); return { sort: t.querySelector('th').getAttribute('aria-sort'), bien: v.join('|')===z.join('|'),
      acciones: !document.querySelector('#tabla-catalogo th:last-child .th-orden'), fijo: getComputedStyle(t.querySelector('th')).position,
      punto: getComputedStyle(t.querySelector('.estado-texto'),'::before').width }; }''')
    ok(ordn=={'sort':'descending','bien':True,'acciones':True,'fijo':'sticky','punto':'8px'},'la tabla se ordena por columna (dos toques: Z a A), el encabezado es fijo y el estado lleva su punto (D100): %s' % ordn)
    ok(pg.evaluate("getComputedStyle(document.getElementById('vista-reportes')).maxWidth===getComputedStyle(document.getElementById('vista-catalogos')).maxWidth"),'todas las vistas miden lo mismo (D100)')
    pg.set_viewport_size({'width':1280,'height':900}); pg.wait_for_timeout(300)
    pg.evaluate("SRP.app.mostrarVista('reportes')"); pg.wait_for_timeout(300)
    rep=pg.evaluate("(() => { const b=document.querySelector('#vista-reportes .bloque').getBoundingClientRect(), h=document.getElementById('titulo-reportes').getBoundingClientRect(), v=document.getElementById('vista-reportes').getBoundingClientRect(); return Math.abs(b.left - v.left) < 2 && Math.abs(h.left - v.left) < 2 && getComputedStyle(document.getElementById('titulo-reportes')).textAlign !== 'center'; })()")
    ok(rep,'en computadora Reportes ya no se centra: título y bloque arrancan en el borde de la vista, como las demás (D145, antes D109)')
    pg.set_viewport_size({'width':390,'height':844}); pg.wait_for_timeout(300)
    pg.evaluate("SRP.app.mostrarVista('catalogos')"); pg.wait_for_timeout(300)
    pg.fill('#cat-buscar','quercus'); pg.wait_for_timeout(200)
    ok(pg.locator('#tabla-catalogo tbody tr').count()==4,'el buscador de especies encuentra los cuatro Quercus')
    ok(pg.inner_text('#cat-cuenta').strip()=='4 de 76 especies','y el contador dice cuántos coinciden (D105): '+pg.inner_text('#cat-cuenta'))
    pg.click('#tabla-catalogo tbody tr >> nth=0 >> .c-titulo'); pg.wait_for_timeout(300)
    ok(pg.is_visible('#dlg-catalogo') and pg.evaluate("!!document.getElementById('btn-cat-guardar').closest('.dialogo-pie')"),'tocar la tarjeta abre la edición, con Guardar al pie (D105)')
    pg.click('#btn-cat-cerrar'); pg.wait_for_timeout(200)
    pg.fill('#cat-buscar','yoyote'); pg.wait_for_timeout(200)
    n_yoyote=pg.evaluate("SRP.ref.deTipo('especie', false).filter(e => SRP.ref.especieCoincide(e, 'yoyote')).length")
    ok(pg.locator('#tabla-catalogo tbody tr').count()==n_yoyote and n_yoyote>=1 and 'Codo de fraile' in pg.inner_text('#tabla-catalogo tbody'),'y busca por los otros nombres comunes (%d con «Yoyote»)' % n_yoyote)
    pg.fill('#cat-buscar',''); pg.wait_for_timeout(200)
    # Alta de especie: clave consecutiva fija, campos del SNIB opcionales, género y epíteto derivados
    pg.click('#btn-cat-agregar'); pg.wait_for_timeout(200)
    ok(pg.input_value('#cat-clave')=='ESP-0077' and pg.evaluate("document.getElementById('cat-clave').readOnly"),'la clave de una especie nueva es el consecutivo ESP-0077 y no se escribe')
    pg.fill('#cat-nombre','Especie de prueba'); pg.fill('#cat-cientifico','quercus mala')
    pg.fill('#cat-snib','12345'); pg.fill('#cat-enciclovida','abc')
    pg.click('#form-catalogo button[type=submit]'); pg.wait_for_timeout(300)
    ok(pg.locator('#cat-errores li').count()==3,'rechaza científico sin mayúscula, id SNIB sin sufijo e id EncicloVida no numérico (%d)' % pg.locator('#cat-errores li').count())
    pg.fill('#cat-cientifico','Genus prueba'); pg.fill('#cat-snib','99999angio'); pg.fill('#cat-enciclovida','123456')
    pg.select_option('#cat-distribucion','Exótica'); pg.fill('#cat-otros-nombres','Nombre uno,  Nombre dos ,'); pg.fill('#cat-forma','Árbol, Arbusto')
    pg.click('#form-catalogo button[type=submit]'); pg.wait_for_timeout(400)
    nueva=pg.evaluate("SRP.ref.catalogoPorId['ESP-0077']")
    ok(nueva and nueva['id']=='ESP-0077' and nueva['clave']=='ESP-0077' and nueva['genero']=='Genus' and nueva['especie']=='prueba' and nueva['tipo_distribucion']=='Exótica'
       and nueva['otros_nombres_comunes']=='Nombre uno, Nombre dos' and nueva['id_snib']=='99999ANGIO' and nueva['id_enciclovida']==123456 and nueva['formadecrecimiento']=='Árbol, Arbusto',
       'la especie nueva se guarda con id = clave, género y epíteto derivados y los campos del SNIB limpios: %s' % (nueva and {k:nueva[k] for k in ('id','genero','especie','id_snib','id_enciclovida','otros_nombres_comunes')}))
    pg.fill('#cat-buscar','prueba'); pg.wait_for_timeout(200)
    accion(pg,'#tabla-catalogo','estado'); pg.wait_for_timeout(400)
    ok(pg.is_hidden('#dlg-confirmar') and 'desactivado' in pg.inner_text('#aviso') and pg.locator('#aviso .aviso-accion').count()==1,'desactivar un valor no pide confirmar: el aviso lo explica y ofrece «Deshacer» (D139)')
    ok(pg.locator('.estado-texto[data-activo=false]').count()>=1,'una especie se puede desactivar')
    ok(pg.evaluate("(() => { const f=SRP.formulario; f.el('campo-especie').value='Genus prueba'; f.estado.especieId=null; f.filtrarEspecies(); const t=f.el('lista-especies').innerText; f.cerrarCombo(); f.el('campo-especie').value=''; return !t.includes('Genus prueba'); })()"),'y una especie inactiva no se ofrece en el formulario')
    pg.fill('#cat-buscar',''); pg.wait_for_timeout(200)

    # ---------- ADMINISTRACIÓN: usuarios ----------
    pg.click('.pestana[data-vista=usuarios]'); pg.wait_for_timeout(500)
    ok(pg.locator('#tabla-usuarios tbody tr').count()==3,'la lista trae las tres cuentas')
    fila_yo=pg.locator('#tabla-usuarios tbody tr', has_text='Administración SIA')
    ok('usted' in fila_yo.inner_text(),'marca cuál es la cuenta propia')
    ok(fila_yo.locator('button[data-accion=estado]').count()==0,'que no puede desactivarse a sí misma')
    fila_cabo=pg.locator('#tabla-usuarios tbody tr', has_text='Fulana')
    ok(fila_cabo.locator('button[data-accion=eliminar]').count()==0,'una cuenta con registros no ofrece Eliminar')
    ok('Perengano' in fila_cabo.inner_text(),'y muestra quién es su coordinador')
    tarj=pg.evaluate('''() => { const t=document.getElementById('tabla-usuarios'); const tr=t.querySelector('tbody tr[data-id]'); const r=tr.getBoundingClientRect();
      const g=tr.querySelector('.btn-tuerca').getBoundingClientRect(); const pie=document.getElementById('btn-usr-guardar').closest('.dialogo-pie');
      return { alto: Math.round(r.height), tuerca_arriba: g.top - r.top < 24, cuenta: document.getElementById('usr-cuenta').textContent, pie: !!pie }; }''')
    ok(tarj['alto']<150 and tarj['tuerca_arriba'] and tarj['cuenta'].endswith('usuarios') and tarj['pie'],
       'en teléfono cada usuario es una tarjeta compacta con la tuerca arriba, hay contador y Guardar va al pie (D105): %s' % tarj)
    # Atajos de estado en Usuarios (D107)
    n_act=pg.evaluate("SRP.ref.usuarios.filter(u=>u.activo).length"); n_tot=pg.evaluate("SRP.ref.usuarios.length")
    pg.click('#usr-estado .chip[data-estado=activos]'); pg.wait_for_timeout(200)
    ok(pg.locator('#tabla-usuarios tbody tr[data-id]').count()==n_act and pg.inner_text('#usr-cuenta').startswith('%d de %d' % (n_act, n_tot)),'«Activos» deja sólo las cuentas activas y el contador lo dice (D107): '+pg.inner_text('#usr-cuenta'))
    pg.click('#usr-estado .chip[data-estado=inactivos]'); pg.wait_for_timeout(200)
    ok(pg.locator('#tabla-usuarios tbody tr[data-id]').count()==n_tot-n_act,'«Inactivos» deja sólo las desactivadas')
    pg.click('#usr-estado .chip[data-estado=todos]'); pg.wait_for_timeout(200)
    pg.click('#btn-usr-agregar'); pg.wait_for_timeout(300)
    pg.click('#form-usuario button[type=submit]'); pg.wait_for_timeout(200)
    ok(pg.locator('#usr-errores li').count()==5,'el alta vacía señala los cinco campos obligatorios')
    ok(pg.is_visible('#caja-usr-coordinador'),'el campo Coordinador aparece para perfil Cabo')
    pg.select_option('#usr-perfil','ADMIN'); pg.wait_for_timeout(200)
    ok(pg.is_hidden('#caja-usr-coordinador'),'y desaparece para Administración')
    ok(pg.locator('#usr-perfil option').count()==4 and pg.locator('#usr-perfil option[value=VIEWER]').count()==0,'el perfil ofrece tres opciones: ya no existe Consulta (D87)')
    ok('No captura' in pg.inner_text('#usr-perfil-ayuda'),'se explica qué puede hacer cada perfil')
    pg.select_option('#usr-perfil','CABO'); pg.wait_for_timeout(200)
    pg.fill('#usr-nombre','Sutana'); pg.fill('#usr-ap','Nueva'); pg.fill('#usr-am','Ejemplo')
    pg.select_option('#usr-area','a-div'); pg.wait_for_timeout(150)
    pg.fill('#usr-cargo','Cabo de cuadrilla')
    pg.fill('#usr-correo','correo-sin-arroba'); pg.click('#form-usuario button[type=submit]'); pg.wait_for_timeout(200)
    ok('correo válido' in pg.inner_text('#usr-errores'),'se rechaza un correo mal formado')
    pg.fill('#usr-correo','CABO@ejemplo.local'); pg.click('#form-usuario button[type=submit]'); pg.wait_for_timeout(200)
    ok('ya tiene cuenta' in pg.inner_text('#usr-errores'),'y un correo repetido')
    pg.fill('#usr-correo','sutana@ejemplo.local'); pg.select_option('#usr-coordinador','u-coord-1')
    pg.click('#form-usuario button[type=submit]'); pg.wait_for_timeout(500)
    ok('Sutana Nueva Ejemplo' in pg.inner_text('#tabla-usuarios'),'se da de alta la cuenta nueva')
    pg.click('#btn-cuenta'); pg.click('#btn-cambiar-perfil'); pg.fill('#acceso-correo','sutana@ejemplo.local'); pg.fill('#acceso-clave','x')
    pg.click('#form-acceso button[type=submit]'); pg.wait_for_timeout(700)
    ok('Sutana' in pg.inner_text('#usuario-nombre') and pg.is_hidden('.pestana[data-vista=usuarios]'),'la cuenta nueva entra y no ve Usuarios')
    pg.evaluate("SRP.app.mostrarVista('usuarios')"); pg.wait_for_timeout(300)
    ok(pg.is_visible('#vista-registros'),'ni la abre llamándola directamente')
    pg.click('#btn-cuenta'); pg.click('#btn-cambiar-perfil'); pg.select_option('#sel-usuario-prueba','u-admin-1'); pg.click('#btn-entrar-prueba'); pg.wait_for_timeout(500)
    pg.click('.pestana[data-vista=usuarios]'); pg.wait_for_timeout(500)
    f=pg.locator('#tabla-usuarios tbody tr', has_text='Sutana')
    accion(pg,f,'eliminar'); pg.wait_for_timeout(300)
    ok(pg.inner_text('#dlg-confirmar-titulo')=='Eliminar cuenta' and 'desactívela' in pg.inner_text('#dlg-confirmar-puntos') and pg.get_attribute('#dlg-confirmar-nota','data-tono')=='alerta',
       'eliminar una cuenta confirma, y ofrece la salida reversible: desactivarla (D139)')
    pg.click('#btn-confirmar-si'); pg.wait_for_timeout(500)
    ok('Sutana' not in pg.inner_text('#tabla-usuarios'),'se elimina una cuenta sin registros')
    f2=pg.locator('#tabla-usuarios tbody tr', has_text='Fulana')
    accion(pg,f2,'estado'); pg.wait_for_timeout(500)
    ok(pg.is_hidden('#dlg-confirmar') and 'ya no puede entrar' in pg.inner_text('#aviso') and pg.locator('#aviso .aviso-accion').count()==1,'desactivar una cuenta no pide confirmar: el aviso dice qué implica y ofrece «Deshacer» (D139)')
    ok('Inactivo' in pg.locator('#tabla-usuarios tbody tr', has_text='Fulana').inner_text(),'se desactiva una cuenta')
    pg.click('#btn-cuenta'); pg.click('#btn-cerrar-sesion'); pg.wait_for_timeout(400)
    ok(pg.is_visible('#vista-acceso') and pg.is_hidden('#encabezado-usuario'),'cerrar sesión devuelve al acceso')
    ok(pg.is_visible('#acceso-clave') and pg.get_attribute('#acceso-clave','autocomplete')=='current-password','y el campo de contraseña vuelve, con su autollenado de contraseña (D108)')
    pg.fill('#acceso-correo','cabo@ejemplo.local'); pg.fill('#acceso-clave','x')
    pg.click('#form-acceso button[type=submit]'); pg.wait_for_timeout(400)
    ok('desactivada' in pg.inner_text('#acceso-errores'),'y la cuenta desactivada ya no entra')

    # ---------- BLOQUE 77: NOTIFICACIONES Y ESPERA (D136) ----------
    # La pantalla de acceso quedó rechazando una cuenta desactivada (la del cabo), sin sesión: se
    # entra con la del coordinador, que también registra y cierra jornadas.
    pg.select_option('#sel-usuario-prueba','u-coord-1'); pg.click('#btn-entrar-prueba'); pg.wait_for_timeout(500)
    iniciar_jornada(pg,'Jornada del tono aviso',HOY)
    ok(pg.get_attribute('#aviso','data-tipo')=='exito','iniciar una jornada es una confirmación: tono de éxito (D136)')
    pg.evaluate("SRP.util.anunciar('Jornada activa: prueba.','aviso')"); pg.wait_for_timeout(50)
    ok(pg.get_attribute('#aviso','data-tipo')=='aviso' and pg.locator('#aviso .aviso-icono svg').count()==1,'hay un tercer tono neutro «aviso», con su icono, distinto de éxito y alerta (D136)')
    borde=pg.evaluate("[getComputedStyle(document.getElementById('aviso')).borderLeftColor]")[0]
    pg.evaluate("SRP.util.anunciar('x')"); pg.wait_for_timeout(50)
    ok(borde!=pg.evaluate("getComputedStyle(document.getElementById('aviso')).borderLeftColor"),'y su filete es de otro color que el de éxito: '+borde)
    # La duración crece con el largo del mensaje (D136): 'Ok.' dura 4.5 s; uno de ~150 caracteres, 7.5 s
    largo = 'Este es un mensaje de aviso bastante más largo para comprobar que la duración crece con el número de caracteres del texto mostrado, como pide D136.'
    pg.mouse.move(5,800)
    pg.evaluate("SRP.util.anunciar('Ok.','aviso')"); pg.wait_for_timeout(4800)
    ok(pg.is_hidden('#aviso'),'un aviso corto se cierra solo a los 4.5 s')
    pg.evaluate("SRP.util.anunciar('%s','aviso')" % largo); pg.wait_for_timeout(4800)
    ok(pg.is_visible('#aviso'),'uno largo sigue en pantalla a los 4.8 s: dura más porque tarda más en leerse')
    pg.wait_for_timeout(3000)
    ok(pg.is_hidden('#aviso'),'y se cierra solo poco después')
    # Con el puntero encima el tiempo se detiene; al quitarlo, corre lo que faltaba
    pg.evaluate("SRP.util.anunciar('Ok.','aviso')"); pg.wait_for_timeout(100)
    pg.hover('#aviso .aviso-texto'); pg.wait_for_timeout(5500)
    ok(pg.is_visible('#aviso'),'con el puntero encima no se cierra aunque pase su tiempo (D136)')
    pg.mouse.move(5,800); pg.wait_for_timeout(4800)
    ok(pg.is_hidden('#aviso'),'y al quitar el puntero se cierra cuando corre lo que le faltaba')

    # Doble toque en Guardar: dos toques seguidos, antes de que el primero termine, no deben
    # crear dos árboles (D136). Se dispara el submit dos veces sin esperar entre uno y otro.
    pg.click('#btn-ubicacion'); pg.wait_for_timeout(700)
    pg.fill('#campo-especie','aile'); pg.wait_for_timeout(200)
    pg.dispatch_event('.combo-opcion[data-id="ESP-0002"]','mousedown'); pg.wait_for_timeout(150)
    n0 = pg.evaluate("async () => (await SRP.almacen.todos('plantaciones')).length")
    ok(pg.get_attribute('#btn-revisar','disabled') is None,'el botón Guardar empieza habilitado')
    # Se lee en el mismo instante del envío: el guardado local es tan rápido que un segundo paso ya lo ve de vuelta
    desh=pg.evaluate("() => { document.getElementById('form-plantacion').requestSubmit(); const b = document.getElementById('btn-revisar'); return [b.disabled, b.getAttribute('aria-busy')]; }")
    ok(desh==[True,'true'],'al enviar, el botón Guardar queda deshabilitado de inmediato y con aria-busy: %s' % desh)
    pg.click('#form-plantacion button[type=submit]', force=True)   # segundo toque «a la fuerza» mientras el primero sigue en curso
    pg.wait_for_timeout(900)
    if pg.is_visible('#dlg-resumen'): pg.click('#btn-resumen-guardar'); pg.wait_for_timeout(600)
    n1 = pg.evaluate("async () => (await SRP.almacen.todos('plantaciones')).length")
    ok(n1==n0+1,'el doble toque crea un solo árbol, no dos: '+str(n0)+' -> '+str(n1))

    # aria-busy en la generación de reportes y el ZIP de fotografías (D136)
    pg.evaluate("SRP.app.mostrarVista('jornadas')"); pg.wait_for_timeout(400)
    j = pg.locator('#lista-jornadas .jornada', has_text='Jornada del tono aviso')
    (j if j.count() else pg.locator('#lista-jornadas .jornada').first).locator('.jornada-boton').click()
    pg.wait_for_timeout(400)
    if pg.is_visible('#btn-jornada-estado') and pg.get_attribute('#btn-jornada-estado','hidden') is None:
        pg.click('#btn-jornada-estado'); pg.wait_for_timeout(300)
        if pg.is_visible('#dlg-confirmar'): pg.click('#btn-confirmar-si')
        pg.wait_for_timeout(500)   # cerrar la jornada para poder generar su reporte
    reporte_de(pg,'Jornada del tono aviso') if pg.locator('#pdf-lista .jornada', has_text='Jornada del tono aviso').count() else reporte_de(pg)
    pg.wait_for_timeout(400)
    if pg.is_visible('#dlg-cierre'):
        pg.fill('#cie-personal','Prueba'); pg.click('#form-cierre button[type=submit]'); pg.wait_for_timeout(600)
    ok(pg.is_visible('#dlg-previa'),'la vista previa del reporte se abre antes de generar el PDF')
    pg.click('#btn-previa-generar')
    ok(pg.evaluate("document.getElementById('principal').getAttribute('aria-busy')")=='true','#principal queda aria-busy mientras se arma el PDF (D136)')
    esperar(pg, "!document.getElementById('principal').hasAttribute('aria-busy')", 8000)
    ok(pg.evaluate("document.getElementById('principal').hasAttribute('aria-busy')") is False,'y aria-busy se quita al terminar')
    # Cierre del ciclo (D138): con puntos sin revisar, el aviso no dice «completa» sino qué falta
    ok('Reporte generado' in pg.inner_text('#aviso') and ('quedó completa' in pg.inner_text('#aviso') or 'Siguiente: revisar' in pg.inner_text('#aviso')),'al terminar el PDF el aviso cierra el ciclo: dice si la jornada quedó completa o qué falta (D138): '+pg.inner_text('#aviso'))
    ok('reporte generado hoy' in pg.inner_text('#pdf-lista').lower(),'y la ficha de Reportes pasa a «reporte generado hoy» sin salir y volver (D138)')

    pg.evaluate("SRP.app.mostrarVista('galeria')"); pg.wait_for_timeout(500)
    if pg.locator('#galeria-rejilla li').count() > 0:
        estado=pg.evaluate("() => { const b = document.getElementById('btn-galeria-zip'); b.click(); return [b.getAttribute('aria-busy'), b.textContent, b.disabled]; }")
        ok(estado[0]=='true' and 'Armando' in estado[1] and estado[2],'el botón de ZIP dice «Armando…» y queda aria-busy mientras arma el archivo (D136)')
        pg.wait_for_timeout(1500)
        ok(pg.get_attribute('#btn-galeria-zip','aria-busy') is None and 'Descargar todas' in pg.inner_text('#btn-galeria-zip'),'y vuelve a su texto normal al terminar')

    # ---------- BLOQUE 78: PASOS DE LA JORNADA (D138) ----------
    pg.evaluate("SRP.app.mostrarVista('registrar')"); pg.wait_for_timeout(500)
    if pg.is_hidden('#panel-iniciar-jornada'):
        pg.click('#btn-jornada-cambiar'); pg.wait_for_timeout(200); pg.click('#btn-cambiar-nueva'); pg.wait_for_timeout(300)
    AYER=(datetime.date.today()-datetime.timedelta(days=1)).isoformat()
    pg.fill('#ini-fecha',AYER); pg.dispatch_event('#ini-fecha','change'); pg.wait_for_timeout(100)
    corta=AYER[8:10]+'-'+['ENE','FEB','MAR','ABR','MAY','JUN','JUL','AGO','SEP','OCT','NOV','DIC'][int(AYER[5:7])-1]
    ok(pg.inner_text('#btn-iniciar-jornada').strip()=='Iniciar jornada del '+corta,'con una fecha que no es hoy, el botón lo dice: '+pg.inner_text('#btn-iniciar-jornada').strip())
    pg.click('#btn-ini-hoy'); pg.wait_for_timeout(100)
    ok(pg.inner_text('#btn-iniciar-jornada').strip()=='Iniciar jornada','y con hoy vuelve a «Iniciar jornada»')
    pg.fill('#ini-nombre','Jornada de los pasos'); pg.select_option('#ini-programa','p-refor'); pg.fill('#ini-meta','2')
    pg.click('#btn-iniciar-jornada'); pg.wait_for_timeout(700)
    est=lambda sel: pg.evaluate("[...document.querySelectorAll('%s .paso')].map(p => p.dataset.estado)" % sel)
    ok(est('#franja-pasos')==['actual','pendiente','pendiente','pendiente'] and pg.locator('#franja-pasos [aria-current=step]').inner_text().startswith('Registrar'),
       'el panel de la jornada activa enseña los cuatro pasos, con «Registrar» como actual (D138): '+str(est('#franja-pasos')))
    ok(pg.is_hidden('#franja-siguiente'),'mientras se registra no hay línea de «Siguiente»: el formulario está debajo')
    # Dos árboles en sitios distintos: ninguno queda marcado para revisar
    for k,(la,ln) in enumerate([(19.4321,-99.1331),(19.4324,-99.1335)]):
        ctx.set_geolocation({'latitude':la,'longitude':ln})
        pg.click('#btn-ubicacion'); pg.wait_for_timeout(700)
        pg.fill('#campo-especie',['aile','ahuehu'][k]); pg.wait_for_timeout(200)
        pg.dispatch_event('.combo-opcion[data-id="%s"]' % ['ESP-0002','ESP-0070'][k],'mousedown'); pg.wait_for_timeout(150)
        pg.click('#form-plantacion button[type=submit]'); pg.wait_for_timeout(900)
        if pg.is_visible('#dlg-resumen'): pg.click('#btn-resumen-guardar'); pg.wait_for_timeout(700)
    ctx.set_geolocation({'latitude':19.432,'longitude':-99.133})
    ok(est('#franja-pasos')==['hecho','actual','pendiente','pendiente'] and pg.locator('#franja-pasos .paso[data-estado=hecho] svg').count()==1,
       'con la meta alcanzada «Registrar» queda hecho, con palomita, y el actual es «Cerrar»: '+str(est('#franja-pasos')))
    ok(pg.is_visible('#franja-siguiente') and 'Meta cumplida: 2 de 2' in pg.inner_text('#franja-siguiente') and 'cerrar la jornada' in pg.inner_text('#franja-siguiente'),
       'y el panel dice «Meta cumplida… Siguiente: cerrar la jornada»: '+pg.inner_text('#franja-siguiente'))
    pg.click('#btn-jornada-cerrar'); pg.wait_for_timeout(300); pg.click('#btn-confirmar-si'); pg.wait_for_timeout(1500)
    ok(pg.is_visible('#jornada-detalle') and 'cerrada' in pg.inner_text('#aviso') and 'Siguiente: generar el reporte' in pg.inner_text('#aviso'),
       'al cerrar, la ficha abre y el aviso dice qué sigue (D138): '+pg.inner_text('#aviso'))
    ok(est('#jornada-pasos')==['hecho','hecho','hecho','actual'],'en la ficha, sin puntos por revisar, «Revisar» queda hecho y el actual es «Reporte»: '+str(est('#jornada-pasos')))
    ok('Siguiente: generar el reporte' in pg.inner_text('#jornada-siguiente') and pg.is_visible('#btn-jornada-reporte') and 'Generar PDF' in pg.inner_text('#btn-jornada-reporte')
       and 'btn-primario' in pg.get_attribute('#btn-jornada-reporte','class'),'la barra del pie dice lo que sigue y su botón principal lo hace: «Generar PDF»')
    ok(pg.evaluate("document.activeElement.id")=='btn-jornada-reporte','y el foco queda en ese botón, listo para el siguiente paso')
    ok(pg.is_hidden('#btn-jornada-siguiente') and 'Registrar árbol' in pg.inner_text('#btn-jornada-faltante') and 'btn-secundario' in pg.get_attribute('#btn-jornada-faltante','class'),
       'cerrada, «Registrar faltante» queda como secundario')
    # Reabierta con la meta cumplida: «Cerrar jornada» pasa a la barra y el encabezado no la repite
    pg.click('#btn-jornada-estado'); pg.wait_for_timeout(700)
    ok(est('#jornada-pasos')==['hecho','actual','pendiente','pendiente'] and pg.is_visible('#btn-jornada-siguiente') and 'Cerrar jornada' in pg.inner_text('#btn-jornada-siguiente')
       and pg.is_hidden('#btn-jornada-estado'),'reabierta con la meta cumplida, «Cerrar jornada» es el botón principal del pie y no se repite arriba (D138)')
    ok(pg.is_hidden('#btn-jornada-reporte') and 'Registrar árbol' in pg.inner_text('#btn-jornada-faltante'),'abierta no hay reporte, y registrar dice «Registrar árboles»')
    pg.click('#btn-jornada-siguiente'); pg.wait_for_timeout(300)
    ok(pg.is_visible('#dlg-confirmar') and '¿Cerrar la jornada' in pg.inner_text('#dlg-confirmar-texto'),'el botón del pie pide la misma confirmación que el del encabezado')
    pg.click('#btn-confirmar-si'); pg.wait_for_timeout(1000)
    ok(est('#jornada-pasos')==['hecho','hecho','hecho','actual'],'y la cierra')
    # «Revisar»: se reabre con «Registrar faltante» y se registra un duplicado a propósito (misma
    # especie en el mismo punto que el segundo árbol)
    pg.click('#btn-jornada-faltante'); pg.wait_for_timeout(700)
    ok(pg.is_visible('#vista-registrar') and 'Jornada de los pasos' in pg.inner_text('#franja-jornada-texto'),'«Registrar faltante» reabre la jornada y lleva a Nuevo registro')
    ctx.set_geolocation({'latitude':19.4324,'longitude':-99.1335})
    pg.click('#btn-ubicacion'); pg.wait_for_timeout(700)
    pg.fill('#campo-especie','ahuehu'); pg.wait_for_timeout(200)
    pg.dispatch_event('.combo-opcion[data-id="ESP-0070"]','mousedown'); pg.wait_for_timeout(150)
    pg.click('#form-plantacion button[type=submit]'); pg.wait_for_timeout(900)
    if pg.is_visible('#dlg-resumen'): pg.click('#btn-resumen-guardar'); pg.wait_for_timeout(700)
    ctx.set_geolocation({'latitude':19.432,'longitude':-99.133})
    pg.click('#btn-jornada-cerrar'); pg.wait_for_timeout(300); pg.click('#btn-confirmar-si'); pg.wait_for_timeout(1500)
    ok(est('#jornada-pasos')==['hecho','hecho','actual','pendiente'] and 'Siguiente: revisar 2 puntos marcados' in pg.inner_text('#aviso'),
       'cerrada con un posible duplicado, el actual es «Revisar» y el aviso lo dice: '+pg.inner_text('#aviso'))
    ok('Siguiente: revisar' in pg.inner_text('#jornada-siguiente') and pg.is_visible('#btn-jornada-siguiente') and 'Revisar puntos' in pg.inner_text('#btn-jornada-siguiente')
       and pg.is_hidden('#btn-jornada-reporte'),'con puntos marcados el botón del pie es «Revisar puntos» y el reporte espera (D138)')
    ok(pg.evaluate("document.activeElement.id")=='btn-jornada-siguiente','al llegar desde «Cerrar jornada», el foco está en «Revisar puntos»')
    pg.click('#btn-jornada-siguiente'); pg.wait_for_timeout(700)
    ok(pg.evaluate("document.activeElement.dataset.accion")=='bien' and pg.locator('#jornada-lista .punto-jornada.elegido').count()==1,
       '«Revisar puntos» lleva al primer punto pendiente, lo marca en el mapa y deja el foco en «Está bien»')
    pg.keyboard.press('Enter'); pg.wait_for_timeout(800)
    ok(est('#jornada-pasos')[2]=='actual' and pg.evaluate("document.activeElement.id")=='btn-jornada-siguiente','tras el primero sigue en «Revisar» y el foco vuelve a «Revisar puntos»')
    pg.click('#btn-jornada-siguiente'); pg.wait_for_timeout(600); pg.keyboard.press('Enter'); pg.wait_for_timeout(800)
    ok(est('#jornada-pasos')==['hecho','hecho','hecho','actual'] and 'Siguiente: generar el reporte' in pg.inner_text('#aviso'),
       'al revisar el último, «Revisar» queda hecho y el aviso dice qué sigue: '+pg.inner_text('#aviso'))
    ok(pg.evaluate("document.activeElement.id")=='btn-jornada-reporte','y el foco pasa a «Generar reporte», no se pierde')
    # El reporte cierra el ciclo
    pg.click('#btn-jornada-reporte'); pg.wait_for_timeout(900)
    if pg.is_visible('#dlg-cierre'): pg.fill('#cie-personal','Cuadrilla de prueba'); pg.click('#form-cierre button[type=submit]'); pg.wait_for_timeout(700)
    pg.click('#btn-previa-generar')
    esperar(pg, "!document.getElementById('principal').hasAttribute('aria-busy')", 8000)
    ok('quedó completa' in pg.inner_text('#aviso'),'al generar el PDF el aviso cierra el ciclo: «La jornada … quedó completa» (D138): '+pg.inner_text('#aviso'))
    pg.evaluate("SRP.app.mostrarVista('jornadas')"); pg.wait_for_timeout(500)
    pg.evaluate("SRP.jornadas.aplicarAtajo('todas')"); pg.wait_for_timeout(400)
    pg.locator('#lista-jornadas .jornada', has_text='Jornada de los pasos').first.locator('.jornada-boton').click(); pg.wait_for_timeout(700)
    ok(est('#jornada-pasos')==['hecho']*4 and 'Jornada completa' in pg.inner_text('#jornada-siguiente'),'en la ficha, los cuatro pasos hechos y «Jornada completa: reporte generado hoy…»')
    ok('Regenerar PDF' in pg.inner_text('#btn-jornada-reporte') and 'btn-editar' in pg.get_attribute('#btn-jornada-reporte','class') and 'M17.65 6.35' in pg.inner_html('#btn-jornada-reporte'),'y el reporte se ofrece como «Regenerar PDF», en ámbar y con la flecha en círculo (D148), como en Reportes')
    pg.set_viewport_size({'width':390,'height':844})
    tapa=pg.evaluate("""() => { const b = document.querySelector('.barra-jornada').getBoundingClientRect();
      const x = b.left + 20, y = b.bottom - 20; const e = document.elementFromPoint(x, y); return e ? !!e.closest('.barra-jornada') : true; }""")
    ok(tapa,'el mapa no se dibuja encima de la barra del pie (Leaflet aislado, D138)')

    # ---------- BLOQUE 80: CONFIRMACIONES (D139) ----------
    # Restablecer dice cuánto se pierde, con números; «Cancelar» no toca nada
    n_regs=pg.evaluate("(async () => (await SRP.almacen.todos('plantaciones')).filter(r => r.estatus !== 'eliminado').length)()")
    n_jor=pg.evaluate("(async () => (await SRP.almacen.todos('jornadas')).length)()")
    pg.evaluate("document.getElementById('btn-restablecer').click()"); pg.wait_for_timeout(500)
    pts=pg.inner_text('#dlg-confirmar-puntos') if pg.is_visible('#dlg-confirmar') else ''
    ok(pg.inner_text('#dlg-confirmar-titulo')=='Restablecer los datos de prueba' and ('Se borran %d registros y %d jornadas.' % (n_regs, n_jor)) in pts and 'Se cierra la sesión.' in pts
       and pg.get_attribute('#dlg-confirmar-nota','data-tono')=='alerta','restablecer confirma con números: cuántos registros y jornadas se borran (D139): '+pts.replace(chr(10),' | '))
    pg.click('#btn-confirmar-no'); pg.wait_for_timeout(300)
    ok(pg.evaluate("(async () => (await SRP.almacen.todos('jornadas')).length)()")==n_jor and pg.is_visible('#encabezado-usuario'),'y «Cancelar» no borra nada ni cierra la sesión')
    # Un diálogo de pregunta simple (forma corta) no enseña título, viñetas ni nota
    pg.evaluate("() => { SRP.app.confirmar('¿Seguir?', 'Seguir', 'palomita'); }"); pg.wait_for_timeout(200)   # sin esperar la promesa: se resuelve al cerrar
    ok(pg.is_hidden('#dlg-confirmar-titulo') and pg.is_hidden('#dlg-confirmar-puntos') and pg.is_hidden('#dlg-confirmar-nota') and pg.get_attribute('#dlg-confirmar','aria-labelledby')=='dlg-confirmar-texto'
       and 'btn-exito' in pg.get_attribute('#btn-confirmar-si','class'),'la forma corta sigue sirviendo: sólo la pregunta y el botón (D139)')
    pg.click('#btn-confirmar-no'); pg.wait_for_timeout(200)
    # Quedan cinco tipos de confirmación que no se deshacen, más cerrar y otro día; ninguna para lo reversible
    usos=pg.evaluate("""async () => { const r = await fetch('js/registros.js?x=' + Date.now()).then(x => x.text());
      const c = await fetch('js/catalogos.js?x=' + Date.now()).then(x => x.text()); const u = await fetch('js/usuarios.js?x=' + Date.now()).then(x => x.text());
      return [(r.match(/confirmar\\(/g) || []).length, (c.match(/confirmar\\(/g) || []).length, (u.match(/confirmar\\(/g) || []).length]; }""")
    ok(usos==[0,1,1],'lo reversible ya no confirma: registros 0; catálogo y cuentas sólo al eliminar (D139): %s' % usos)

    # ---------- BLOQUE 81: CAMPOS (D140) ----------
    pg.evaluate("SRP.app.mostrarVista('registrar')"); pg.wait_for_timeout(500)
    if pg.is_hidden('#panel-iniciar-jornada'):
        pg.click('#btn-jornada-cambiar'); pg.wait_for_timeout(200); pg.click('#btn-cambiar-nueva'); pg.wait_for_timeout(300)
    pg.click('#btn-iniciar-jornada'); pg.wait_for_timeout(300)
    err=pg.evaluate("""() => ['ini-nombre','ini-programa','ini-meta','ini-fecha'].map(id => { const c = document.getElementById(id), m = document.getElementById(id + '-error');
      return [!!m && !m.hidden && !!m.querySelector('svg'), (c.getAttribute('aria-describedby') || '').split(' ').includes(id + '-error'), c.getAttribute('aria-invalid')]; })""")
    ok(all(e==[True,True,'true'] for e in err) and pg.locator('#ini-errores li').count()==4,'cada campo con error lo dice debajo, con icono, enlazado con aria-describedby; el resumen de arriba se queda (D140): %s' % err)
    ok(pg.inner_text('#ini-meta-error')==pg.locator('#ini-errores li').nth(2).inner_text(),'el mensaje del campo es el mismo del resumen')
    pg.fill('#ini-nombre','J'); pg.wait_for_timeout(100)
    ok(pg.locator('#ini-nombre-error').count()==0 and pg.get_attribute('#ini-nombre','aria-invalid') is None and 'ini-nombre-error' not in (pg.get_attribute('#ini-nombre','aria-describedby') or ''),
       'al corregir el campo, su error se va en seguida, sin esperar a volver a enviar')
    pg.click('#btn-ini-hoy'); pg.wait_for_timeout(100)
    ok(pg.locator('#ini-fecha-error').count()==0,'«Hoy» también quita el error de la fecha')
    ok(pg.get_attribute('#ini-meta','aria-describedby').split()[0]=='ini-meta-ayuda' and 'Cuántos árboles' in pg.inner_text('#ini-meta-ayuda')
       and 'escrito a mano' in pg.inner_text('#ini-ubicacion-ayuda') and pg.get_attribute('#ini-ubicacion','aria-describedby')=='ini-ubicacion-ayuda',
       'la meta y la ubicación llevan una línea de ayuda debajo, enlazada al campo (D140)')
    # Contador: aparece al pasar del 80 %, dice el límite al llegar
    pg.fill('#ini-comentarios','x'*390); pg.wait_for_timeout(100)
    c1=pg.is_hidden('#ini-comentarios-contador')
    pg.fill('#ini-comentarios','x'*420); pg.wait_for_timeout(100)
    c2=pg.inner_text('#ini-comentarios-contador') if pg.is_visible('#ini-comentarios-contador') else ''
    pg.fill('#ini-comentarios','x'*600); pg.wait_for_timeout(100)
    c3=pg.inner_text('#ini-comentarios-contador'); lleno=pg.get_attribute('#ini-comentarios-contador','data-lleno')
    ok(c1 and c2=='420 / 500' and c3=='500 / 500 · llegó al límite' and lleno=='true','el contador aparece al pasar del 80 por ciento («420 / 500») y avisa al llegar al límite (D140): '+str([c1,c2,c3]))
    ok(pg.locator('input[maxlength], textarea[maxlength]').count()==pg.locator('.contador').count(),'todos los campos con límite tienen su contador')
    # Formulario del árbol: el error de ubicación va bajo el botón y se va al tomarla
    pg.fill('#ini-comentarios',''); pg.fill('#ini-nombre','Jornada de los campos'); pg.select_option('#ini-programa','p-refor'); pg.fill('#ini-meta','5')
    pg.click('#btn-iniciar-jornada'); pg.wait_for_timeout(700)
    ok(pg.is_hidden('#ini-errores') and pg.locator('#panel-iniciar-jornada .campo-error').count()==0,'al iniciar bien, no queda ningún error pintado en el panel')
    pg.click('#form-plantacion button[type=submit]'); pg.wait_for_timeout(300)
    ok(pg.is_visible('#btn-ubicacion-error') and pg.evaluate("document.getElementById('btn-ubicacion').nextElementSibling.id")=='btn-ubicacion-error'
       and pg.get_attribute('#btn-ubicacion','aria-invalid') is None and pg.is_visible('#campo-especie-error'),'sin ubicación ni especie, cada error va bajo su control; el botón no se marca como campo inválido')
    pg.click('#btn-ubicacion'); pg.wait_for_timeout(700)
    ok(pg.locator('#btn-ubicacion-error').count()==0 and pg.is_visible('#campo-especie-error'),'al tomar la ubicación su error se va; el de la especie sigue')
    pg.fill('#campo-especie','aile'); pg.wait_for_timeout(200); pg.dispatch_event('.combo-opcion[data-id="ESP-0002"]','mousedown'); pg.wait_for_timeout(200)
    ok(pg.locator('#campo-especie-error').count()==0,'y al elegir la especie se va el suyo')
    pg.evaluate("SRP.formulario.limpiar()"); pg.wait_for_timeout(200)
    # «Hoy» en Editar jornada
    iniciar_jornada(pg,'Jornada de fecha equivocada',(datetime.date.today()-datetime.timedelta(days=1)).isoformat())
    pg.evaluate("SRP.app.mostrarVista('jornadas')"); pg.wait_for_timeout(500); pg.evaluate("SRP.jornadas.aplicarAtajo('todas')"); pg.wait_for_timeout(400)
    pg.locator('#lista-jornadas .jornada', has_text='Jornada de fecha equivocada').first.locator('.jornada-boton').click(); pg.wait_for_timeout(700)
    pg.click('#btn-jornada-editar'); pg.wait_for_timeout(300)
    ok(pg.is_visible('#btn-ej-hoy') and pg.is_hidden('#ej-nota-fecha'),'«Editar jornada» trae «Hoy» junto a la fecha (D140)')
    pg.click('#btn-ej-hoy'); pg.wait_for_timeout(150)
    ok(pg.input_value('#ej-fecha')==HOY and pg.is_visible('#ej-nota-fecha'),'«Hoy» corrige la fecha de un toque y avisa que los árboles la toman')
    pg.fill('#ej-nombre',''); pg.fill('#ej-meta',''); pg.click('#btn-ej-guardar'); pg.wait_for_timeout(300)
    ok(pg.is_visible('#ej-nombre-error') and pg.is_visible('#ej-meta-error') and 'ej-meta-ayuda' in pg.get_attribute('#ej-meta','aria-describedby'),'en Editar jornada también: error bajo el campo, sin perder la ayuda')
    pg.keyboard.press('Escape'); pg.wait_for_timeout(200)
    pg.click('#btn-jornada-editar'); pg.wait_for_timeout(300)
    ok(pg.locator('#dlg-editar-jornada .campo-error').count()==0,'al volver a abrir el diálogo, los errores de antes ya no están')
    pg.keyboard.press('Escape'); pg.wait_for_timeout(200)

    # ---------- BLOQUE 82: TARJETAS, SECCIONES E ICONOS (D141) ----------
    tam=lambda: set(pg.evaluate("[...document.querySelectorAll('svg[width]')].filter(s => !s.closest('.leaflet-container')).map(s => s.getAttribute('width'))"))
    vistos=set()
    for v in ('registrar','jornadas','registros','reportes','galeria'):
        pg.evaluate("SRP.app.mostrarVista('%s')" % v); pg.wait_for_timeout(500); vistos|=tam()
    ok(vistos<={'16','20','24'},'los iconos usan sólo tres tamaños —16, 20 y 24— en todas las vistas (D141): %s' % sorted(vistos))
    ok(pg.evaluate("SRP.ICONOS.tamano(18)")==20 and pg.evaluate("SRP.ICONOS.tamano(34)")==24 and pg.evaluate("SRP.ICONOS.tamano('chico')")==16,'un número suelto se lleva al escalón más cercano')
    # Ficha de jornada: subtítulos, cuenta de puntos y la barra de saltos en teléfono
    pg.evaluate("SRP.app.mostrarVista('jornadas')"); pg.wait_for_timeout(500); pg.evaluate("SRP.jornadas.aplicarAtajo('todas')"); pg.wait_for_timeout(400)
    tarjeta=pg.locator('#lista-jornadas .jornada', has_text='Jornada de los pasos').first
    ok(tarjeta.locator('.insignia-jornada svg').count()==1,'la etiqueta de resultado de la tarjeta lleva su icono: el color no va solo (D141)')
    tarjeta.locator('.jornada-boton').click(); pg.wait_for_timeout(700)
    n_pts=pg.locator('#jornada-lista .punto-jornada').count()
    ok([pg.inner_text(h) for h in ('#sec-jornada-mapa','#sec-jornada-conciliacion')]==['Mapa','Conciliación'] and pg.inner_text('#sec-jornada-puntos')=='Puntos (%d)' % n_pts,
       'la ficha tiene subtítulos: Mapa, Conciliación y Puntos (%d) (D141)' % n_pts)
    ok(pg.is_visible('#jornada-saltos') and pg.evaluate("getComputedStyle(document.getElementById('jornada-saltos')).position")=='sticky','en teléfono, una barra fija arriba salta a cada sección')
    pg.click('#jornada-saltos [data-salto=sec-jornada-puntos]'); pg.wait_for_timeout(700)
    ok(pg.evaluate("document.activeElement.id")=='sec-jornada-puntos' and pg.evaluate("document.getElementById('sec-jornada-puntos').getBoundingClientRect().top < 200"),'«Puntos» lleva a la lista y deja el foco en su subtítulo')
    ok(pg.locator('#jornada-resultado svg').count()==1,'el resultado de la conciliación también lleva el icono de su tono')
    pg.set_viewport_size({'width':1280,'height':900}); pg.wait_for_timeout(200)
    ok(pg.is_hidden('#jornada-saltos'),'en computadora la barra de saltos no hace falta y no aparece')
    pg.set_viewport_size({'width':360,'height':740}); pg.wait_for_timeout(300)
    altos=pg.evaluate("[...document.querySelectorAll('.barra-jornada .btn')].filter(b => !b.hidden).map(b => [b.textContent.trim(), Math.round(b.getBoundingClientRect().height)])")
    ok(altos and all(h<=48 for _,h in altos),'a 360 px los botones de la barra del pie caben en un renglón (D141): %s' % altos)
    pg.set_viewport_size({'width':390,'height':844}); pg.wait_for_timeout(200)
    # Registros: anatomía común —qué, cuándo, estado, dónde—
    pg.evaluate("SRP.app.mostrarVista('registros')"); pg.wait_for_timeout(600)
    orden=pg.evaluate("(() => { const d = document.querySelector('#lista-registros .registro .registro-datos'); return [...d.children].filter(x => !x.hidden).map(x => x.className.split(' ')[0]); })()")
    ok(orden==['registro-especie','registro-meta','registro-lugar'] and pg.locator('#lista-registros .registro-lugar svg').count()>=1,
       'la tarjeta de Registros sigue la anatomía común: especie, cuándo, estado (folio y envío), dónde con su icono (D141): %s' % orden)
    # Reportes: estado y dónde en la tarjeta
    pg.evaluate("SRP.app.mostrarVista('reportes')"); pg.wait_for_timeout(600); pg.evaluate("SRP.reportes.aplicarAtajo('todas')"); pg.wait_for_timeout(400)
    f0=pg.locator('#pdf-lista .jornada').first
    ok(f0.locator('.insignia-jornada svg').count()==1 and f0.locator('.jornada-cifras .jornada-cifra').count()==2,'la tarjeta de Reportes suma su fila de estado con icono y las cifras en el formato de Jornadas (D141)')
    # Cambiar de jornada: icono de intercambio, no el mapa
    pg.evaluate("SRP.app.mostrarVista('registrar')"); pg.wait_for_timeout(500)
    if pg.is_visible('#btn-jornada-cambiar'):
        ok(pg.inner_text('#btn-jornada-cambiar').strip()=='Cambiar' and pg.get_attribute('#btn-jornada-cambiar','aria-label')=='Cambiar de jornada'
           and 'M6.99 11L3 15' in pg.inner_html('#btn-jornada-cambiar'),'«Cambiar» lleva el icono de intercambio; el mapa se queda para la sección Jornadas (D141)')
    # Estados vacíos: icono, frase y acción en los cuatro listados
    pg.evaluate("SRP.app.mostrarVista('jornadas')"); pg.wait_for_timeout(400)
    pg.evaluate("SRP.jornadas.filtro.dia='2020-01-01'; SRP.jornadas.diaAbierto=true; SRP.jornadas.pintarLista()"); pg.wait_for_timeout(400)
    ok(pg.locator('#jornadas-vacio .vacio-icono svg').count()==1 and pg.locator('#jornadas-vacio button[data-vacio=todas]').count()==1,'Jornadas vacío: icono, frase y «Ver todas»')
    pg.click('#jornadas-vacio button[data-vacio=todas]'); pg.wait_for_timeout(500)
    ok(pg.is_hidden('#jornadas-vacio') and pg.locator('#lista-jornadas .jornada').count()>=1,'y «Ver todas» saca del vacío')
    pg.evaluate("SRP.app.mostrarVista('galeria')"); pg.wait_for_timeout(500)
    pg.evaluate("SRP.galeria.filtro.dia='2020-01-01'; SRP.galeria.diaAbierto=true; SRP.galeria.pintar()"); pg.wait_for_timeout(500)
    ok(pg.locator('#galeria-vacio .vacio-icono svg').count()==1 and pg.locator('#galeria-vacio button[data-vacio]').count()==1,'Fotografías vacío: el mismo patrón, con su acción')
    pg.click('#galeria-vacio button[data-vacio]'); pg.wait_for_timeout(600)
    ok(pg.is_hidden('#galeria-vacio'),'y la acción lo resuelve')

    # ---------- BLOQUE 83: TABLAS Y ACCESIBILIDAD (D142) ----------
    # Atajos de teclado en la captura
    iniciar_jornada(pg,'Jornada de los atajos',HOY)
    registrar(pg,'aile','ESP-0002')
    ok(pg.locator('.atajo-pista').count()==0 and pg.get_attribute('#especies-recientes .chip','data-n') is None and 'Control+Enter' in pg.get_attribute('#btn-revisar','aria-keyshortcuts'),
       'sin pista de atajos en pantalla ni números en las recientes; Ctrl+Enter sólo queda en aria-keyshortcuts (D145, pedido por Liber)')
    n0=pg.evaluate("async () => (await SRP.almacen.todos('plantaciones')).length")
    pg.click('#btn-ubicacion'); pg.wait_for_timeout(700)
    pg.focus('#campo-especie'); pg.keyboard.press('1'); pg.wait_for_timeout(200)
    ok(pg.evaluate("SRP.formulario.estado.especieId")!='ESP-0002' or pg.input_value('#campo-especie')=='1','ya no hay atajos numéricos: «1» con el buscador vacío no elige especie (D145)')
    pg.fill('#campo-especie',''); pg.click('#especies-recientes .chip'); pg.wait_for_timeout(200)
    pg.keyboard.press('Control+Enter'); pg.wait_for_timeout(900)
    ok(pg.is_visible('#dlg-resumen'),'Ctrl+Enter guarda; aquí el árbol cae en el mismo punto y abre la ficha de revisión por posible duplicado')
    pg.keyboard.press('Control+Enter'); pg.wait_for_timeout(900)
    n1=pg.evaluate("async () => (await SRP.almacen.todos('plantaciones')).length")
    ok(pg.is_hidden('#dlg-resumen') and n1==n0+1,'y con la ficha abierta, Ctrl+Enter la confirma: un árbol más (%d → %d)' % (n0,n1))
    # Guardar no espera al envío: en cuanto el árbol queda en el teléfono, el botón vuelve (D142)
    ctx.set_geolocation({'latitude':19.4335,'longitude':-99.1345})
    pg.click('#btn-ubicacion'); pg.wait_for_timeout(700); pg.click('#especies-recientes .chip'); pg.wait_for_timeout(150)
    pg.focus('#campo-comentarios'); pg.keyboard.press('Control+Enter'); pg.wait_for_timeout(500)
    if pg.is_visible('#dlg-resumen'): pg.keyboard.press('Control+Enter'); pg.wait_for_timeout(400)
    ok(pg.get_attribute('#btn-revisar','disabled') is None and pg.inner_text('#btn-revisar').strip()=='Guardar' and pg.get_attribute('#franja-guardado','data-envio')=='enviando',
       'al guardar, «Guardar» vuelve en seguida aunque el envío siga en curso: la franja dice «enviando…» (D142): '+str(pg.get_attribute('#franja-guardado','data-envio')))
    pg.wait_for_timeout(1500); ctx.set_geolocation({'latitude':19.432,'longitude':-99.133})
    pg.fill('#campo-especie','a1'); pg.wait_for_timeout(100)
    ok(pg.input_value('#campo-especie')=='a1','con texto en el buscador, los números se escriben normal')
    pg.evaluate("SRP.formulario.limpiar()")
    # Tablas: encabezado fijo en computadora, columna ordenada visible, cuenta con inactivos
    pg.click('#btn-cuenta'); pg.click('#btn-cambiar-perfil'); pg.select_option('#sel-usuario-prueba','u-admin-1'); pg.click('#btn-entrar-prueba'); pg.wait_for_timeout(700)
    pg.set_viewport_size({'width':1280,'height':800}); pg.wait_for_timeout(200)
    pg.evaluate("SRP.app.mostrarVista('catalogos')"); pg.wait_for_timeout(600); pg.click('[data-tipo=especie]'); pg.wait_for_timeout(600)
    fijo=pg.evaluate("""() => { const c = document.querySelector('#tabla-catalogo').closest('.tabla-caja'); const th = document.querySelector('#tabla-catalogo thead th');
      c.scrollTop = 600; return Math.abs(th.getBoundingClientRect().top - c.getBoundingClientRect().top) < 2 && c.scrollTop > 0; }""")
    ok(fijo,'en computadora el encabezado de la tabla se queda arriba al desplazarse (D142)')
    pg.click('#tabla-catalogo thead th .th-orden >> nth=0'); pg.wait_for_timeout(300)
    th=pg.evaluate("(() => { const t = document.querySelector('#tabla-catalogo thead th'); return [t.getAttribute('aria-sort'), getComputedStyle(t).backgroundColor, getComputedStyle(document.querySelector('#tabla-catalogo thead th:nth-child(2)')).backgroundColor]; })()")
    ok(th[0]=='ascending' and th[1]=='rgb(47, 72, 88)' and th[2]!=th[1],'la columna ordenada se distingue: fondo de acento, las demás no (D142): %s' % th)
    ok(re.search(r'^\d+ especies · \d+ inactivas?$', pg.inner_text('#cat-cuenta').strip()) is not None,'la cuenta dice cuántas hay y cuántas están inactivas: '+pg.inner_text('#cat-cuenta'))
    pg.evaluate("SRP.app.mostrarVista('usuarios')"); pg.wait_for_timeout(500)
    ok(re.search(r'usuarios · \d+ inactivos?$', pg.inner_text('#usr-cuenta').strip()) is not None,'y en Usuarios también: '+pg.inner_text('#usr-cuenta'))
    pg.set_viewport_size({'width':390,'height':844}); pg.wait_for_timeout(200)
    # Modo sol en etiquetas y cifras
    pg.evaluate("SRP.app.mostrarVista('jornadas')"); pg.wait_for_timeout(500); pg.evaluate("SRP.jornadas.aplicarAtajo('todas')"); pg.wait_for_timeout(400)
    pg.click('#btn-cuenta'); pg.click('#btn-contraste'); pg.wait_for_timeout(300)
    sol=pg.evaluate("(() => { const i = document.querySelector('#lista-jornadas .insignia-jornada'), c = document.querySelector('#lista-jornadas .jornada-cifra'); const gi = getComputedStyle(i), gc = getComputedStyle(c); return [gi.borderTopWidth, gi.fontWeight, gc.borderTopWidth]; })()")
    ok(sol==['2px','700','2px'],'el modo sol también marca etiquetas y cifras: borde de 2 px y negritas (D142): %s' % sol)
    if pg.is_hidden('#btn-contraste'): pg.click('#btn-cuenta')   # el menú sigue abierto tras el interruptor
    pg.click('#btn-contraste'); pg.wait_for_timeout(300); pg.keyboard.press('Escape')

    # ---------- BLOQUE 84: REGISTRAR JORNADA (D143) ----------
    pg.click('#btn-cuenta'); pg.click('#btn-cambiar-perfil'); pg.select_option('#sel-usuario-prueba','u-coord-1'); pg.click('#btn-entrar-prueba'); pg.wait_for_timeout(700)
    pg.evaluate("SRP.app.mostrarVista('registrar')"); pg.wait_for_timeout(500)
    if pg.is_hidden('#panel-iniciar-jornada'):
        pg.click('#btn-jornada-cambiar'); pg.wait_for_timeout(200); pg.click('#btn-cambiar-nueva'); pg.wait_for_timeout(300)
    panel=pg.inner_text('#panel-iniciar-jornada')
    ok(pg.inner_text('#titulo-iniciar-jornada')=='Registrar jornada' and 'Registre la jornada del día' in panel and 'son obligatorios' not in panel and 'La gente trabaja' not in panel,
       'el panel se llama «Registrar jornada», con la introducción nueva y sin la línea de obligatorios (D143)')
    ok('Parque Los Pericos' in pg.inner_text('#ini-nombre-ayuda') and 'Calzada de Tlalpan' in pg.inner_text('#ini-nombre-ayuda') and pg.get_attribute('#ini-nombre','aria-describedby')=='ini-nombre-ayuda',
       'el nombre lleva su ayuda con ejemplos')
    ok(pg.inner_text('label[for=ini-ubicacion]')=='Dirección de la jornada' and pg.inner_text('label[for=ej-ubicacion]')=='Dirección de la jornada','«Ubicación de la jornada» pasa a «Dirección de la jornada», también al editarla')
    # Coordenadas a mano, como en «Registrar árbol»
    ok(pg.locator('#ini-detalles-coord').count()==1 and not pg.evaluate("document.getElementById('ini-detalles-coord').open"),'bajo «Detectar ubicación» está «Capturar coordenadas a mano», plegado')
    pg.click('#ini-detalles-coord summary'); pg.wait_for_timeout(150)
    pg.fill('#ini-coord-lat','hola'); pg.fill('#ini-coord-lng','-99.13'); pg.click('#btn-ini-coord-aplicar'); pg.wait_for_timeout(150)
    ok('grados decimales' in pg.inner_text('#ini-detectado') and pg.inner_text('#ini-alcaldia')=='—','sin números válidos lo dice y no coloca nada')
    pg.fill('#ini-coord-lat','20.6'); pg.fill('#ini-coord-lng','-100.4'); pg.click('#btn-ini-coord-aplicar'); pg.wait_for_timeout(150)
    ok('fuera de la Ciudad de México' in pg.inner_text('#ini-detectado') and pg.inner_text('#ini-alcaldia')=='—','fuera de la CDMX lo rechaza')
    pg.fill('#ini-coord-lat','19,4326'); pg.fill('#ini-coord-lng','-99.1332'); pg.click('#btn-ini-coord-aplicar'); pg.wait_for_timeout(200)
    ok(pg.inner_text('#ini-alcaldia')=='Cuauhtémoc' and 'a mano' in pg.inner_text('#ini-detectado') and 'Detectar de nuevo' in pg.inner_text('#btn-ini-detectar'),
       'con coordenadas válidas (también con coma decimal) deriva alcaldía y colonia como el GPS')
    pg.fill('#ini-nombre','Jornada sin señal'); pg.select_option('#ini-programa','p-refor'); pg.fill('#ini-meta','4'); pg.click('#btn-ini-hoy')
    pg.click('#btn-iniciar-jornada'); pg.wait_for_timeout(700)
    man=pg.evaluate("async () => { const j = (await SRP.almacen.todos('jornadas')).find(x => x.nombre === 'Jornada sin señal'); return j && [j.lat, j.lng, j.punto_origen, j.gps_precision_m, j.alcaldia]; }")
    ok(man==[19.4326,-99.1332,'manual',None,'Cuauhtémoc'],'la jornada guarda el punto escrito con origen «manual» y sin precisión (D143): %s' % man)
    # Sin señal, el desplegable de coordenadas se abre solo
    pg.click('#btn-jornada-cambiar'); pg.wait_for_timeout(200); pg.click('#btn-cambiar-nueva'); pg.wait_for_timeout(300)
    ok(not pg.evaluate("document.getElementById('ini-detalles-coord').open") and pg.input_value('#ini-coord-lat')=='','al volver al panel, las coordenadas escritas se limpian')
    ctx.clear_permissions(); pg.click('#btn-ini-detectar'); pg.wait_for_timeout(700)
    ok(pg.evaluate("document.getElementById('ini-detalles-coord').open") and 'coordenadas a mano' in pg.inner_text('#ini-detectado'),'sin permiso o sin señal, «Capturar coordenadas a mano» se abre solo y el aviso lo sugiere')
    ctx.grant_permissions(['geolocation'])
    pg.click('#btn-iniciar-cancelar'); pg.wait_for_timeout(300)

    # ---------- BLOQUE 85: REVISIÓN DE LA FICHA (D144) ----------
    # Jornada cerrada con un solo punto, de precisión baja: la captura que mandó Liber
    iniciar_jornada(pg,'Jornada de un punto',HOY)
    ctx.set_geolocation({'latitude':19.4331,'longitude':-99.1341,'accuracy':139})
    pg.click('#btn-ubicacion'); pg.wait_for_timeout(800); pg.fill('#campo-especie','ahuehu'); pg.wait_for_timeout(200)
    pg.dispatch_event('.combo-opcion[data-id="ESP-0070"]','mousedown'); pg.wait_for_timeout(150)
    pg.click('#form-plantacion button[type=submit]'); pg.wait_for_timeout(900)
    if pg.is_visible('#dlg-resumen'): pg.click('#btn-resumen-guardar'); pg.wait_for_timeout(800)
    ctx.set_geolocation({'latitude':19.432,'longitude':-99.133})
    pg.click('#btn-jornada-cerrar'); pg.wait_for_timeout(300); pg.click('#btn-confirmar-si'); pg.wait_for_timeout(1500)
    txt=pg.inner_text('#jornada-resultado')
    ok('hay 1 punto.' in txt and 'Queda 1 punto por revisar.' in txt and '1 puntos' not in txt and 'Quedan 1' not in txt,'la conciliación concuerda en número: «hay 1 punto», «Queda 1 punto por revisar» (D144): '+txt)
    alt=pg.evaluate("['btn-jornada-estado','btn-jornada-editar'].map(id => Math.round(document.getElementById(id).getBoundingClientRect().height))")
    ok(alt[0]==alt[1]==40,'«Reabrir jornada» y «Editar jornada» tienen la misma altura (antes 40 y 52 px) (D144): %s' % alt)
    ok('L 15 8 L 15 6' in pg.inner_html('#btn-jornada-estado') and 'M3 17.25' not in pg.inner_html('#btn-jornada-estado'),
       '«Reabrir jornada» lleva el candado abierto; el lápiz queda sólo para «Editar jornada»')
    ok(pg.evaluate("SRP.reportes.textoConteo({ meta_arboles: 1 }, [{}])")=='Meta de la jornada: 1 árbol · registrados: 1 (cuadra)','en el reporte, «Meta de la jornada: 1 árbol», no «1 árboles»')

    # ---------- BLOQUE 86: SISTEMA DE ANCHO EN TABLETA Y COMPUTADORA (D145) ----------
    # Teléfono: la ficha sigue en una columna (el uso principal no cambia)
    pg.set_viewport_size({'width':390,'height':844}); pg.wait_for_timeout(300)
    tel=pg.evaluate("""() => ({ cuerpo: getComputedStyle(document.getElementById('ficha-cuerpo')).display, fija: getComputedStyle(document.getElementById('ficha-col-mapa')).position,
        detalle: getComputedStyle(document.getElementById('jornada-detalle')).display })""")
    ok(tel=={'cuerpo':'block','fija':'static','detalle':'block'},'en teléfono la ficha sigue en una columna: mapa, conciliación y puntos uno bajo otro (D145): %s' % tel)
    # Computadora: ficha en dos columnas, mapa fijo, pasos y botones en un renglón, barra en un renglón
    pg.set_viewport_size({'width':1280,'height':800}); pg.wait_for_timeout(500)
    fic=pg.evaluate("""() => { const m=document.getElementById('jornada-mapa').getBoundingClientRect(), l=document.getElementById('ficha-col-lista').getBoundingClientRect(),
        c=document.getElementById('ficha-col-mapa').getBoundingClientRect(), p=document.getElementById('jornada-pasos').getBoundingClientRect(), a=document.querySelector('.jornada-acciones-cab').getBoundingClientRect();
        return { lado: l.left >= m.right, arriba: Math.abs(l.top - c.top) < 4, fija: getComputedStyle(document.getElementById('ficha-col-mapa')).position,
                 renglon: Math.abs((p.top + p.bottom) / 2 - (a.top + a.bottom) / 2) < 14 && a.left > p.left }; }""")
    ok(fic=={'lado':True,'arriba':True,'fija':'sticky','renglon':True},'en computadora la ficha va en dos columnas: mapa fijo a la izquierda, conciliación y puntos a la derecha; pasos y botones en un renglón (D145): %s' % fic)
    bar=pg.evaluate("""() => { const bs=[...document.querySelectorAll('.barra-jornada .btn')].filter(b => !b.hidden && b.offsetParent).map(b => b.getBoundingClientRect());
        const s=document.getElementById('jornada-siguiente').getBoundingClientRect();
        return { un_renglon: bs.every(b => Math.abs(b.top - bs[0].top) < 2) && Math.abs(s.top + s.height / 2 - (bs[0].top + bs[0].height / 2)) < 16, texto_izq: s.right <= bs[0].left + 1, n: bs.length }; }""")
    ok(bar['un_renglon'] and bar['texto_izq'] and bar['n']>=1,'la barra del pie de la ficha: qué sigue a la izquierda y los botones a la derecha, en un renglón (D145): %s' % bar)
    # Todas las vistas arrancan en el mismo borde y ninguna se centra
    bordes={}
    for v, h in (('jornadas','titulo-jornadas'),('registros','titulo-registros'),('reportes','titulo-reportes')):
        pg.evaluate("SRP.app.mostrarVista('%s')" % v); pg.wait_for_timeout(400)
        if v == 'jornadas' and pg.is_visible('#jornada-detalle'): pg.click('#btn-jornada-volver'); pg.wait_for_timeout(400)
        bordes[v]=pg.evaluate("Math.round(document.getElementById('%s').getBoundingClientRect().left)" % h)
    ok(len(set(bordes.values()))==1,'Jornadas, Registros y Reportes arrancan en el mismo borde izquierdo (D145): %s' % bordes)
    # Listas en rejilla de dos columnas en computadora, una en teléfono
    pg.evaluate("SRP.app.mostrarVista('jornadas')"); pg.wait_for_timeout(300); pg.evaluate("SRP.jornadas.aplicarAtajo('todas')"); pg.wait_for_timeout(500)
    col=lambda sel: pg.evaluate("getComputedStyle(document.querySelector('%s')).gridTemplateColumns.split(' ').length" % sel)
    cj=col('#lista-jornadas'); ancho_lista=pg.evaluate("Math.round(document.getElementById('lista-jornadas').getBoundingClientRect().width)")
    pg.evaluate("SRP.app.mostrarVista('registros')"); pg.wait_for_timeout(400); cr=col('#lista-registros')
    pg.evaluate("SRP.app.mostrarVista('reportes')"); pg.wait_for_timeout(400); cp=col('#pdf-lista')
    ok((cj,cr,cp)==(2,2,2) and ancho_lista > 1000,'en computadora jornadas, registros y reportes van en tarjetas de dos en dos, a todo lo ancho (D145): %s, %d px' % ((cj,cr,cp),ancho_lista))
    pg.set_viewport_size({'width':390,'height':844}); pg.wait_for_timeout(300)
    ok(col('#pdf-lista')==1,'en teléfono, una tarjeta por renglón')
    # Nuevo registro: panel de la jornada activa ordenado en tableta y computadora
    for ancho in (820, 1280):
        pg.set_viewport_size({'width':ancho,'height':900}); pg.wait_for_timeout(300)
        if ancho == 820: iniciar_jornada(pg,'Jornada de escritorio',HOY)
        else: pg.evaluate("SRP.app.mostrarVista('registrar')"); pg.wait_for_timeout(400)
        fr=pg.evaluate("""() => { const r=id => document.getElementById(id).getBoundingClientRect();
            const rot=r('franja-jornada-rotulo'), tx=r('franja-jornada-texto'), ce=r('btn-jornada-cerrar'), fr=r('franja-jornada'), ti=r('titulo-arbol'), co=r('registrar-columnas');
            return { rotulo_solo: rot.bottom <= tx.top + 1, cerrar_un_renglon: ce.height <= 44, botones_der: ce.right > fr.right - 40,
                     mismo_borde: Math.abs(fr.left - ti.left) < 2 && Math.abs(fr.left - co.left) < 2 }; }""")
        ok(fr=={'rotulo_solo':True,'cerrar_un_renglon':True,'botones_der':True,'mismo_borde':True},
           'a %d px el panel de la jornada lleva «Jornada activa» solo en su renglón, «Cerrar jornada» en una línea a la derecha, y panel, título y formulario en el mismo borde (D145): %s' % (ancho, fr))
    gu=pg.evaluate("(() => { const b=document.getElementById('btn-revisar').getBoundingClientRect(), f=document.getElementById('form-plantacion').getBoundingClientRect(); return b.width >= f.width - 2; })()")
    ok(gu,'en computadora «Guardar» ocupa su columna de orilla a orilla')
    # Registrar jornada: el lugar a la izquierda y el plan a la derecha
    pg.click('#btn-jornada-cambiar'); pg.wait_for_timeout(200); pg.click('#btn-cambiar-nueva'); pg.wait_for_timeout(300)
    ini=pg.evaluate("""() => { const a=document.querySelector('.ini-col-lugar').getBoundingClientRect(), b=document.querySelector('.ini-col-plan').getBoundingClientRect(), p=document.getElementById('panel-iniciar-jornada').getBoundingClientRect();
        return { dos: b.left >= a.right && Math.abs(a.top - b.top) < 4, ancho: Math.round(p.width), boton_der: document.getElementById('btn-iniciar-jornada').getBoundingClientRect().left >= b.left - 1 }; }""")
    ok(ini['dos'] and ini['ancho'] > 1000 and ini['boton_der'],'en computadora «Registrar jornada» va en dos columnas: lugar a la izquierda, programa, meta, fecha y botón a la derecha (D145): %s' % ini)
    pg.set_viewport_size({'width':390,'height':844}); pg.wait_for_timeout(300)
    ini=pg.evaluate("""() => { const a=document.querySelector('.ini-col-lugar').getBoundingClientRect(), b=document.querySelector('.ini-col-plan').getBoundingClientRect(); return b.top >= a.bottom - 1; }""")
    ok(ini,'en teléfono los mismos campos siguen uno bajo otro')
    pg.click('#btn-iniciar-cancelar'); pg.wait_for_timeout(300)
    # El mapa de la ficha no esconde puntos bajo los botones de acercar
    pg.click('#btn-ubicacion'); pg.wait_for_timeout(700); pg.fill('#campo-especie','aile'); pg.wait_for_timeout(200)
    pg.dispatch_event('.combo-opcion[data-id="ESP-0002"]','mousedown'); pg.wait_for_timeout(150); pg.click('#form-plantacion button[type=submit]'); pg.wait_for_timeout(900)
    if pg.is_visible('#dlg-resumen'): pg.click('#btn-resumen-guardar'); pg.wait_for_timeout(700)
    ctx.set_geolocation({'latitude':19.4345,'longitude':-99.1362}); pg.click('#btn-ubicacion'); pg.wait_for_timeout(700); pg.fill('#campo-especie','ahuehu'); pg.wait_for_timeout(200)
    pg.dispatch_event('.combo-opcion[data-id="ESP-0070"]','mousedown'); pg.wait_for_timeout(150); pg.click('#form-plantacion button[type=submit]'); pg.wait_for_timeout(900)
    if pg.is_visible('#dlg-resumen'): pg.click('#btn-resumen-guardar'); pg.wait_for_timeout(700)
    ctx.set_geolocation({'latitude':19.432,'longitude':-99.133})
    pg.evaluate("SRP.app.mostrarVista('jornadas')"); pg.wait_for_timeout(400); pg.evaluate("SRP.jornadas.aplicarAtajo('todas')"); pg.wait_for_timeout(400)
    pg.locator('#lista-jornadas .jornada', has_text='Jornada de escritorio').locator('.jornada-boton').click(); pg.wait_for_timeout(1200)
    tapa=pg.evaluate("""() => { const z=document.querySelector('#jornada-mapa .leaflet-control-zoom').getBoundingClientRect();
        return [...document.querySelectorAll('#jornada-mapa .leaflet-marker-icon')].filter(m => { const r=m.getBoundingClientRect(); return r.left < z.right && r.top < z.bottom && r.right > z.left && r.bottom > z.top; }).length; }""")
    ok(tapa==0,'en la ficha ningún punto queda bajo los botones de acercar: el encuadre deja margen arriba a la izquierda (D145)')

    # ---------- BLOQUE 87: LOS PASOS COMO INDICADOR DE AVANCE (D146) ----------
    # Se arma una tira aparte con un estado fijo (dos hechos, «Revisar» actual) para medirla
    pas=pg.evaluate("""() => { const ol=document.createElement('ol'); ol.className='pasos'; document.getElementById('jornada-detalle').prepend(ol);
        ol.innerHTML=SRP.jornadas.htmlPasos({ hecho: { registrar: true, cerrar: true, revisar: false, reporte: false }, actual: 'revisar' });
        const li=[...ol.children], m=li.map(l => l.querySelector('.paso-marca')), g=(x, q) => getComputedStyle(x, q);
        const r=li.map(l => l.getBoundingClientRect()), mr=m.map(x => x.getBoundingClientRect()), t=li.map(l => l.querySelector('.paso-texto').getBoundingClientRect());
        const out={ circulos: m.every(x => g(x).borderRadius === '50%' && Math.abs(x.offsetWidth - x.offsetHeight) < 1),
          sin_pildora: li.every(l => g(l).borderTopStyle === 'none' && g(l).backgroundColor === 'rgba(0, 0, 0, 0)'),
          un_renglon: r.every(x => Math.abs(x.top - r[0].top) < 1), nombre_abajo: t.every((x, i) => x.top >= mr[i].bottom - 1),
          actual: g(m[2]).backgroundColor, palomita: !!m[0].querySelector('svg') && !!m[1].querySelector('svg') && !m[2].querySelector('svg'),
          numero: g(m[3], '::before').content, tramos: [1, 2, 3].map(i => g(li[i], '::before').backgroundColor),
          lector: ol.innerText.replace(/\s+/g, ' ').trim() };
        ol.remove(); return out; }""")
    ok(pas['circulos'] and pas['sin_pildora'] and pas['un_renglon'] and pas['nombre_abajo'],
       'los pasos ya no parecen fichas de filtro: un círculo por paso en un renglón y el nombre debajo, sin borde de píldora (D146): %s' % {k: pas[k] for k in ('circulos','sin_pildora','un_renglon','nombre_abajo')})
    ok(pas['actual']=='rgb(47, 72, 88)' and pas['palomita'] and 'counter(paso)' in pas['numero'],
       'el actual va relleno en acento, los hechos con palomita y el que falta con su número (D146): %s, %s' % (pas['actual'], pas['numero']))
    ok(pas['tramos'][0]=='rgb(30, 122, 70)' and pas['tramos'][1]=='rgb(30, 122, 70)' and pas['tramos'][2]!='rgb(30, 122, 70)',
       'el tramo que sale de un paso hecho va en verde; después del actual, en gris (D146): %s' % pas['tramos'])
    ok(not any(c.isdigit() for c in pas['lector']) and 'Revisar (paso actual)' in pas['lector'],
       'el lector de pantalla oye los nombres y su estado, sin los números de los círculos: «%s»' % pas['lector'])

    # ---------- BLOQUE 88: «HOY» CON EL AÑO EN DOS CIFRAS (D147) ----------
    pg.set_viewport_size({'width':390,'height':844}); pg.wait_for_timeout(300)
    chips={}
    for v, c in (('registros','chip-hoy'),('jornadas','jornada-chip-hoy'),('reportes','pdf-chip-hoy')):
        pg.evaluate("SRP.app.mostrarVista('%s')" % v); pg.wait_for_timeout(400)
        if v == 'jornadas' and pg.is_visible('#jornada-detalle'): pg.click('#btn-jornada-volver'); pg.wait_for_timeout(300)
        abrir_filtros(pg)
        chips[v]=pg.evaluate("""(() => { const s=document.querySelector('#%s .chip-sub'); const lh=parseFloat(getComputedStyle(s).lineHeight) || 16;
            return [s.textContent, s.getBoundingClientRect().height <= lh * 1.5]; })()""" % c)
    ok(all(t==HOY_CHIP and un for t, un in chips.values()),'en Registros, Jornadas y Reportes «Hoy» dice %s en un solo renglón, sin partir el año (D147): %s' % (HOY_CHIP, chips))
    ok(pg.evaluate("SRP.util.formatearFecha('2026-09-24')")=='24-SEP-2026','el resto de las fechas conserva el año completo')

    # ---------- BLOQUE 89: BLINDAJE DE LOS DATOS EN EL TELÉFONO (D149) ----------
    pg.set_viewport_size({'width':390,'height':844}); pg.wait_for_timeout(200)
    cuenta=lambda: pg.evaluate("async () => { const n = async a => (await SRP.almacen.todos(a)).length; return [await n('plantaciones'), await n('jornadas'), await n('usuarios')]; }")
    antes=cuenta()
    # Un sello de datos nuevo (versión nueva) o perdido ya no vacía el teléfono si hay capturas
    pg.evaluate("() => { localStorage.setItem(SRP.CONFIG.CLAVE_SELLO, 'sello-viejo'); }"); pg.reload(); pg.wait_for_timeout(1500)
    d1=cuenta(); a1=pg.evaluate("SRP.almacen.arranque")
    pg.evaluate("() => { localStorage.removeItem(SRP.CONFIG.CLAVE_SELLO); }"); pg.reload(); pg.wait_for_timeout(1500)
    d2=cuenta(); a2=pg.evaluate("SRP.almacen.arranque")
    ok(antes[0]>0 and d1==antes and d2==antes and a1=='conservado' and a2=='conservado',
       'un sello de datos nuevo o perdido ya no borra lo capturado: árboles, jornadas y cuentas se conservan (D149): %s → %s → %s' % (antes,d1,d2))
    # Una base de una versión posterior se rehace conservando lo que tenía
    pg.evaluate("""async () => { SRP.almacen.db.close(); await new Promise((ok, no) => { const r = indexedDB.open(SRP.CONFIG.DB_NOMBRE, SRP.CONFIG.DB_VERSION + 1);
        r.onupgradeneeded = () => {}; r.onsuccess = () => { r.result.close(); ok(); }; r.onerror = () => no(r.error); }); }""")
    pg.reload(); pg.wait_for_timeout(1800)
    d3=cuenta(); c3=pg.evaluate("SRP.almacen.conservados")
    ok(d3==antes and pg.evaluate("SRP.almacen.db.version")==pg.evaluate("SRP.CONFIG.DB_VERSION") and c3 and c3['arboles']==antes[0],
       'una base de versión posterior se rehace conservando todo y lo avisa: %s, %s' % (d3, c3))
    # Sin nada capturado, el sello nuevo sí vuelve a cargar los datos de ejemplo (teléfono nuevo)
    ctx9=b.new_context(viewport={'width':390,'height':844}); pg9=ctx9.new_page(); pg9.goto(BASE); pg9.wait_for_timeout(1200)
    a9=pg9.evaluate("SRP.almacen.arranque")
    pg9.evaluate("() => { localStorage.setItem(SRP.CONFIG.CLAVE_SELLO, 'sello-viejo'); }"); pg9.reload(); pg9.wait_for_timeout(1500)
    ok(a9=='sembrado' and pg9.evaluate("SRP.almacen.arranque")=='resembrado' and 'cuentas y los catálogos' in pg9.inner_text('#aviso'),
       'en un teléfono sin capturas, el sello nuevo recarga cuentas y catálogos y lo dice')
    ctx9.close()
    # Almacenamiento protegido: se pide al guardar un árbol, y la guía dice el estado
    pg.evaluate("() => { window.__persist = 0; navigator.storage.persist = async () => { window.__persist++; return true; }; navigator.storage.persisted = async () => window.__persist > 0; }")
    registrar(pg,'aile','ESP-0002')
    ok(pg.evaluate("window.__persist")>=1,'al guardar un árbol se pide al navegador que no borre lo guardado (storage.persist, D149)')
    pg.evaluate("() => { localStorage.setItem(SRP.CONFIG.CLAVE_ULTIMO_RESPALDO, new Date(Date.now() - 3 * 86400000).toISOString()); }")
    pg.click('#conexion'); pg.wait_for_timeout(400)
    est=pg.inner_text('#senal-estado')
    ok('Protegido' in est and 'Abre sin señal' in est and 'Hace 3 días.' in est and 'Espacio usado' in est,
       'la guía «¿Qué hacer sin internet?» dice si lo guardado está protegido, el espacio, si abre sin señal y el último respaldo (D149): '+est.replace('\n',' | '))
    ok(pg.get_attribute('#senal-estado dd:last-of-type','data-tono')=='aviso','un respaldo de otro día se marca en ámbar')
    pg.click('#btn-senal-cerrar'); pg.wait_for_timeout(200)
    # Al cerrar la jornada se recuerda el respaldo
    pg.evaluate("SRP.app.mostrarVista('registrar')"); pg.wait_for_timeout(300)
    pg.click('#btn-jornada-cerrar'); pg.wait_for_timeout(400)
    nota=pg.inner_text('#dlg-confirmar-nota')
    ok('Último respaldo de este teléfono: hace 3 días.' in nota,'al cerrar la jornada, la confirmación recuerda el respaldo si el último no es de hoy: '+nota)
    pg.click('#btn-confirmar-no'); pg.wait_for_timeout(200)
    # Cancelar el respaldo no dice «guardado» ni cambia la fecha
    pg.evaluate("() => { window.__entregar = SRP.reportes.entregarArchivo; SRP.reportes.entregarArchivo = async () => 'cancelado'; }")
    antes_r=pg.evaluate("localStorage.getItem(SRP.CONFIG.CLAVE_ULTIMO_RESPALDO)")
    pg.evaluate("SRP.conexion.respaldar()"); pg.wait_for_timeout(300)
    ok('No se guardó el respaldo' in pg.inner_text('#aviso') and pg.evaluate("localStorage.getItem(SRP.CONFIG.CLAVE_ULTIMO_RESPALDO)")==antes_r,
       'cancelar el respaldo avisa que no se guardó y no cambia la fecha del último (antes decía «Respaldo guardado»)')
    pg.evaluate("() => { SRP.reportes.entregarArchivo = window.__entregar; }")
    with pg.expect_download(): pg.evaluate("SRP.conexion.respaldar()")
    pg.wait_for_timeout(300)
    ok(pg.evaluate("SRP.conexion.textoUltimoRespaldo().texto")=='Hoy.','un respaldo guardado deja la fecha de hoy')
    # Espacio lleno: las acciones que escriben lo dicen con palabras
    pg.evaluate("() => { window.__guardar = SRP.almacen.guardarConBitacora; SRP.almacen.guardarConBitacora = () => Promise.reject(new DOMException('lleno', 'QuotaExceededError')); }")
    pg.evaluate("() => { SRP.catalogos.cambiarEstado({ id: 'p-centro', tipo: 'programa', nombre: 'Centro Histórico', activo: true }).catch(() => {}); }"); pg.wait_for_timeout(300)
    ok('No se pudo cambiar el estado del catálogo: el teléfono se quedó sin espacio' in pg.inner_text('#aviso'),'una acción que falla por espacio lo dice: '+pg.inner_text('#aviso'))
    pg.click('#btn-ubicacion'); pg.wait_for_timeout(700); pg.fill('#campo-especie','aile'); pg.wait_for_timeout(200)
    pg.dispatch_event('.combo-opcion[data-id="ESP-0002"]','mousedown'); pg.wait_for_timeout(150)
    pg.click('#form-plantacion button[type=submit]'); pg.wait_for_timeout(700)
    if pg.is_visible('#dlg-resumen'): pg.click('#btn-resumen-guardar'); pg.wait_for_timeout(500)
    av=pg.inner_text('#aviso')
    ok('No se pudo guardar el árbol: el teléfono se quedó sin espacio' in av and 'Sus datos siguen en pantalla' in av and ': .' not in av and pg.evaluate("SRP.formulario.estado.especieId")=='ESP-0002',
       'guardar un árbol con el espacio lleno lo dice y conserva lo capturado (antes: «No se pudo guardar: .»): '+av)
    pg.evaluate("() => { SRP.almacen.guardarConBitacora = window.__guardar; }")
    if pg.is_visible('#dlg-resumen'): pg.click('#btn-resumen-cerrar'); pg.wait_for_timeout(200)
    pg.evaluate("SRP.formulario.limpiar()")
    prot=pg.evaluate("""() => [['catalogos','guardar'],['catalogos','cambiarEstado'],['catalogos','eliminar'],['usuarios','guardar'],['usuarios','cambiarEstado'],['usuarios','eliminar'],
        ['activa','iniciarJornada'],['activa','cambiarEstatus'],['jornadas','mover'],['jornadas','guardarEnCierre'],['jornadas','guardarEdicion'],['jornadas','eliminarJornada'],
        ['jornadas','marcarRevisado'],['registros','eliminar'],['registros','restaurar'],['reportes','aceptar'],['conexion','respaldar'],['conexion','restaurar'],['folio','emitirPendientes']]
        .filter(([m, f]) => !(SRP[m][f] && SRP[m][f].protegido)).map(x => x.join('.'))""")
    ok(prot==[],'las 19 acciones que escriben en el teléfono avisan si fallan: sin protección %s' % prot)
    # El PDF que falla ya no se queda en «Generando reporte…»
    pg.evaluate("() => { window.__generar = SRP.reportes.generar; SRP.reportes.generar = async () => { throw new Error('falla simulada del PDF'); }; SRP.reportes.vistaPrevia = { registros: [], cierre: {}, fecha: '', jornada: {} }; document.getElementById('btn-previa-generar').click(); }")
    pg.wait_for_timeout(400)
    ok('No se pudo generar el reporte' in pg.inner_text('#aviso') and pg.get_attribute('#principal','aria-busy') is None,'si el PDF falla, se dice y la pantalla deja de estar ocupada: '+pg.inner_text('#aviso'))
    pg.evaluate("() => { SRP.reportes.generar = window.__generar; SRP.reportes.vistaPrevia = null; }")
    # Red de seguridad: un fallo fuera de las acciones también se dice
    pg.evaluate("() => { setTimeout(() => Promise.reject(new Error('red de seguridad (prueba)')), 0); }"); pg.wait_for_timeout(400)
    ok('No se pudo completar la última acción' in pg.inner_text('#aviso'),'un fallo inesperado se avisa en pantalla y sigue en la consola para diagnosticarlo')
    errores[:]=[e for e in errores if 'red de seguridad (prueba)' not in e and 'falla simulada del PDF' not in e and 'lleno' not in e]
    # La × de la franja «Guardado» ya no lanza un error
    registrar(pg,'aile','ESP-0002')
    n0=len(errores)
    pg.click('#btn-guardado-cerrar'); pg.wait_for_timeout(300)
    ok(pg.is_hidden('#franja-guardado') and len(errores)==n0,'la × de la franja «Guardado» la oculta sin lanzar un error (antes: TypeError en cada toque)')

    # ---------- BLOQUE 90: RESPALDO SEGURO (D150) ----------
    csp=pg.evaluate("(document.querySelector('meta[http-equiv=\"Content-Security-Policy\"]') || {}).content || ''")
    ok("script-src 'self'" in csp and 'unsafe-inline' not in csp and "object-src 'none'" in csp and pg.evaluate("(document.querySelector('meta[name=referrer]') || {}).content")=='no-referrer',
       'la página declara su política de seguridad: sólo código propio, sin scripts en línea, y no dice desde dónde pide el mapa (D150)')
    # Un respaldo alterado: se arma con un árbol y una jornada reales y se le meten variantes
    base_p, base_j = pg.evaluate("async () => { const p = (await SRP.almacen.todos('plantaciones')).find(x => x.estatus === 'activo' && x.especie_id); return [p, await SRP.almacen.uno('jornadas', p.jornada_id)]; }")
    import copy
    def arbol_b90(i, **k):
        o=copy.deepcopy(base_p); o.update({'id':i,'cabo_id':'u-cabo-1','editado_por_id':None,'jornada_id':'jr-b90','foto_base64':None,'foto_id':None,'foto_nombre':'','foto_bytes':0,
                  'especie_id':'ESP-0002','especie_otra':'','especie_estatus':'VALIDADA','programa_id':'p-refor','folio':'RESP%09d' % (len(i) * 7 + ord(i[-1]))}); o.update(k); return o
    jor=copy.deepcopy(base_j); jor.update({'id':'jr-b90','cabo_id':'u-cabo-1','creado_por_id':'u-cabo-1','editado_por_id':'u-cabo-1','encargado_id':None,'puntos_revisados':[],'nombre':'Jornada del respaldo','programa_id':'p-refor'})
    rara=copy.deepcopy(jor); rara.update({'id':'jr-b90-rara','estatus':'rara','nombre':'Jornada rara'})
    malo={'sistema':'SRP','version':'x','generado':'2026-09-24T12:00:00Z','usuario_id':'u-cabo-1','es_ficticio':True,
          'jornadas':[jor, rara],
          'plantaciones':[arbol_b90('pl-b90-ok'), arbol_b90('pl-b90-fuera', lat=25.0, lng=-80.0), arbol_b90('pl-b90-especie', especie_id='ESP-9999'),
                          arbol_b90('pl-b90-otra', cabo_id='u-coord-1'), arbol_b90('x"><img src=x onerror=window.__xss=1>'),
                          arbol_b90('pl-b90-foto', foto_base64='data:image/jpeg;base64,AAAA" onerror="window.__xss=2', foto_id='f1', foto_bytes=3)],
          'usuarios':[{'id':'u-intruso','nombre':'Intruso','perfil':'ADMIN','activo':True,'correo':'intruso@ejemplo.local'}],
          'bitacora':[{'id':'b-falsa','accion':'CREADO','entidad':'plantacion','entidad_id':'pl-b90-ok','usuario_nombre':'Nadie'}]}
    ruta_mala='/home/claude/srp/respaldo_alterado.json'; json.dump(malo, open(ruta_mala,'w',encoding='utf-8'))
    ctx10=b.new_context(viewport={'width':390,'height':844}); pg10=ctx10.new_page(); err10=[]
    pg10.on('pageerror', lambda e: err10.append(str(e))); pg10.on('console', lambda m: m.type=='error' and 'net::' not in m.text and 'Failed to load' not in m.text and err10.append(m.text))
    pg10.goto(BASE); pg10.wait_for_timeout(1200)
    pg10.select_option('#sel-usuario-prueba','u-cabo-1'); pg10.click('#btn-entrar-prueba'); pg10.wait_for_timeout(600)
    pg10.set_input_files('#archivo-restaurar', ruta_mala); pg10.wait_for_timeout(900)
    txt=pg10.inner_text('#dlg-confirmar') if pg10.is_visible('#dlg-confirmar') else ''
    ok('¿Agregar 1 árbol y 1 jornada de este respaldo?' in txt and 'No se restauran (6)' in txt and 'fuera de la Ciudad de México' in txt and 'es de otra cuadrilla' in txt
       and 'la especie no existe en este teléfono' in txt and 'Árbol RESP' in txt and 'la fotografía no es una imagen válida' in txt and 'no tiene el formato esperado' in txt and 'trae un valor que no existe' in txt,
       'un respaldo alterado se revisa renglón por renglón: fuera de la CDMX, otra cuadrilla, especie inexistente, foto que no es imagen, id con código y estatus inventado (D150): '+txt.replace('\n',' | ')[:400])
    pg10.click('#btn-confirmar-si'); pg10.wait_for_timeout(900)
    r10=pg10.evaluate("""async () => ({ p: (await SRP.almacen.todos('plantaciones')).map(x => x.id), j: (await SRP.almacen.todos('jornadas')).map(x => x.id),
        u: (await SRP.almacen.todos('usuarios')).length, b: (await SRP.almacen.todos('bitacora')).map(x => x.accion + ':' + x.entidad_id), xss: window.__xss === undefined ? null : window.__xss })""")
    ok(r10['p']==['pl-b90-ok'] and r10['j']==['jr-b90'] and r10['u']==3 and sorted(r10['b'])==['RESTAURADO:jr-b90','RESTAURADO:pl-b90-ok'] and r10['xss'] is None,
       'sólo entra lo válido, en una transacción y con su renglón RESTAURADO; no entran cuentas (la de administración intrusa) ni la bitácora del archivo, y no se ejecutó nada: %s' % r10)
    # Defensa en profundidad: aunque un registro con id y foto maliciosos llegara a la base (p. ej. por sincronización en Fase 2), no se ejecuta
    pg10.evaluate("""async () => { const p = Object.assign({}, (await SRP.almacen.todos('plantaciones'))[0], { id: 'x"><img src=x onerror=window.__xss=3>', foto_base64: 'data:image/jpeg;base64,AAAA" onerror="window.__xss=4' });
        const tx = SRP.almacen.db.transaction('plantaciones', 'readwrite'); tx.objectStore('plantaciones').put(p); await new Promise(r => tx.oncomplete = r); }""")
    pg10.evaluate("SRP.app.mostrarVista('registros')"); pg10.wait_for_timeout(700)
    dx=pg10.evaluate("""() => ({ xss: window.__xss === undefined ? null : window.__xss, ids: [...document.querySelectorAll('#lista-registros .registro')].map(li => li.dataset.id),
        imgs: document.querySelectorAll('#lista-registros img[onerror]').length })""")
    ok(dx['xss'] is None and 'x"><img src=x onerror=window.__xss=3>' in dx['ids'] and dx['imgs']==0,'un id o una foto con código ya guardados se pintan como texto: el id queda entero en su atributo y la foto no se usa (D150): %s' % dx)
    ok(not [e for e in err10 if 'Content Security Policy' in e or 'Refused' in e],'y la política de seguridad no tuvo nada que bloquear: el escapado ya lo resolvió')
    # Datos reales y de prueba no se mezclan
    malo2=dict(malo); malo2['es_ficticio']=False; json.dump(malo2, open(ruta_mala,'w',encoding='utf-8'))
    pg10.set_input_files('#archivo-restaurar', ruta_mala); pg10.wait_for_timeout(600)
    ok('es de datos reales y este sistema es de prueba' in pg10.inner_text('#aviso') and pg10.is_hidden('#dlg-confirmar'),'un respaldo de datos reales no se mezcla con los de prueba')
    ctx10.close()
    # Modo de prueba apagado: el acceso simulado no abre con cualquier contraseña
    fuera=pg.evaluate("() => { SRP.CONFIG.ES_FICTICIO = false; const r = SRP.sesion.autenticar('cabo@ejemplo.local'); SRP.CONFIG.ES_FICTICIO = true; return r; }")
    ok(fuera['ok'] is False and 'acceso institucional todavía no está conectado' in fuera['motivo'],'con ES_FICTICIO apagado y el proveedor aún simulado, el acceso queda cerrado (D150): '+fuera['motivo'])

    b.close()
print('\n'.join(res)); print('ERRORES CONSOLA:',errores or 'ninguno')
print('fallas:',sum(r.startswith('FALLA') for r in res),'de',len(res))
