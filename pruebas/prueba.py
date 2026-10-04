# RECORRIDO COMPLETO. El sistema arranca vacío: lo que hace falta para probar se captura aquí.
from playwright.sync_api import sync_playwright
import re, os, json, tempfile
# Dónde está la aplicación y dónde se dejan los archivos que la prueba descarga o fabrica. Se
# cambian con las variables SRP_BASE y SRP_SALIDA; sin ellas, el servidor local y una carpeta temporal
BASE=os.environ.get('SRP_BASE','http://127.0.0.1:8099/')
SALIDA=os.environ.get('SRP_SALIDA') or os.path.join(tempfile.gettempdir(),'srp_pruebas')
os.makedirs(SALIDA, exist_ok=True)
def sal(nombre): return os.path.join(SALIDA, nombre)
# La fecha de hoy se calcula: escrita a mano, la prueba caducaba al día siguiente (los
# registros «de hoy» dejaban de serlo y el filtro Hoy quedaba vacío)
import datetime
HOY=datetime.date.today().isoformat()
MESES=['ENE','FEB','MAR','ABR','MAY','JUN','JUL','AGO','SEP','OCT','NOV','DIC']
HOY_TXT=HOY[8:10]+'-'+MESES[int(HOY[5:7])-1]+'-'+HOY[0:4]   # como lo pinta SRP.util.formatearFecha
HOY_CHIP=HOY[8:10]+'-'+MESES[int(HOY[5:7])-1]+'-'+HOY[2:4]  # el atajo «Hoy», con el año en dos cifras (D147)
SRP_GPS='GPS del dispositivo'
errores=[]; res=[]
def ok(c,m):
    res.append(('OK ' if c else 'FALLA ')+m)
    # Las fallas se dicen en cuanto ocurren: una corrida que se interrumpe no las pierde
    if not c: print(res[-1], flush=True)

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

def abrir_sup(pg):
    # Los desgloses de Supervisión van plegados en el teléfono: las comprobaciones de su contenido los abren
    esperar(pg, "!!SRP.supervision.modelo", 8000)
    pg.evaluate("SRP.supervision.abrirTodo()"); pg.wait_for_timeout(400)

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
    pg.select_option('#ini-origen', 'PROGRAMADA')   # y el origen se elige a propósito
    pg.fill('#ini-meta', '10')                      # y la meta de árboles también (D131)
    if comentarios: pg.fill('#ini-comentarios', comentarios)
    pg.click('#btn-iniciar-jornada'); pg.wait_for_timeout(500)
    return pg.evaluate("SRP.activa.jornada && SRP.activa.jornada.id")

def reporte_de(pg, nombre=None):
    """Abre el cierre del reporte de una jornada cerrada, como lo hace «Generar reporte» en su ficha de
    Jornadas: la más reciente, o la que contenga `nombre`. Devuelve cuántas cerradas había."""
    n = pg.evaluate("""async nombre => { const c = (await SRP.jornadas.jornadasAlcance()).filter(j => j.estatus === 'cerrada')
        .sort((a, b) => b.fecha.localeCompare(a.fecha) || String(b.fecha_inicio).localeCompare(String(a.fecha_inicio)));
      const j = nombre ? c.find(x => x.nombre.includes(nombre)) : c[0];
      if (j) await SRP.reportes.abrir(j.registros, j.fecha, j.cabo_id, j); return c.length; }""", nombre)
    pg.wait_for_timeout(500)
    return n

def registrar(pg, busqueda, especie_id, programa='p-refor', fecha=None, foto=None):
    """Captura un árbol de principio a fin y devuelve el identificador con que se guardó.
    `busqueda` es lo que se teclea para que la especie salga en la lista. Con `fecha` distinta de
    la jornada activa, inicia una jornada de ese día (la fecha se hereda de la jornada, D119)."""
    if not pg.is_visible('#vista-registrar'): pg.evaluate("SRP.app.mostrarVista('registrar')"); pg.wait_for_timeout(400)
    activa=pg.evaluate("SRP.activa.jornada && [SRP.activa.jornada.fecha, SRP.activa.jornada.programa_id]")
    if activa != [fecha or HOY, programa] or pg.is_visible('#panel-iniciar-jornada'):
        iniciar_jornada(pg, 'Jornada de prueba ' + (fecha or HOY), fecha or HOY, programa=programa)
    pg.click('#btn-ubicacion'); pg.wait_for_timeout(700)
    pg.fill('#campo-especie', busqueda); pg.wait_for_timeout(200)
    pg.dispatch_event('.combo-opcion[data-id="%s"]' % especie_id, 'mousedown'); pg.wait_for_timeout(150)
    # El programa es el de la jornada (D151): para otro programa, otra jornada
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
    ok(pg.locator('#form-acceso .obligatorio').count()==2,'el acceso marca sus dos campos obligatorios con asterisco, sin leyenda aparte')
    faltan=pg.evaluate("""() => [...document.querySelectorAll('input[required],select[required]')]
        .filter(e=>{const l=document.querySelector('label[for='+CSS.escape(e.id)+']'); return !l||!l.querySelector('.obligatorio');})
        .map(e=>e.id)""")
    ok(faltan==[],'todo campo obligatorio lleva asterisco: faltan '+str(faltan))
    ok(pg.locator('#sel-usuario-prueba option').count()==13,'hay trece cuentas de arranque: una por perfil en la Secretaría, un coordinador y un cabo por tipo de institución y un directivo de alcaldía')

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
    ok(pg.inner_text('#ini-alcaldia')=='—' and pg.inner_text('#ini-colonia')=='—' and 'btn-primario' in pg.get_attribute('#btn-ini-detectar','class') and 'Detectar ubicación' in pg.inner_text('#btn-ini-detectar'),'antes de detectar: guiones, botón azul con su icono (D166)')
    pg.fill('#ini-ubicacion','Av. Insurgentes Sur 1500, Benito Juárez')
    pg.click('#btn-ini-detectar'); pg.wait_for_timeout(700)
    det=[pg.inner_text('#ini-alcaldia'), pg.inner_text('#ini-colonia'), pg.inner_text('#ini-detectado'), pg.get_attribute('#btn-ini-detectar','class'), pg.input_value('#ini-ubicacion')]
    ok(det[0]=='Cuauhtémoc' and det[1] and det[1]!='—' and 'detectada' in det[2] and 'btn-editar' in det[3] and det[4]=='Av. Insurgentes Sur 1500, Benito Juárez','al tocarlo se llenan alcaldía y colonia, el botón pasa a neutro con lápiz y lo escrito en Ubicación se conserva: %s' % det)
    pg.fill('#ini-comentarios','Jornada de prueba con la comunidad'); pg.click('#btn-iniciar-jornada'); pg.wait_for_timeout(400)
    ok('programa' in pg.inner_text('#ini-errores').lower() and 'plantar' in pg.inner_text('#ini-errores').lower(),'sin programa ni meta no se inicia la jornada (D130, D131)')
    pg.select_option('#ini-programa','p-refor'); pg.select_option('#ini-origen','PROGRAMADA'); pg.fill('#ini-meta','25'); pg.click('#btn-iniciar-jornada'); pg.wait_for_timeout(600)
    ok(pg.is_hidden('#panel-iniciar-jornada') and pg.is_visible('#registrar-columnas') and pg.is_visible('#franja-jornada'),'con la jornada iniciada aparece el formulario con su franja')
    ok(pg.evaluate("SRP.formulario.programaDeJornada()")=='p-refor' and pg.evaluate("SRP.activa.jornada.programa_id")=='p-refor' and 'Reforestación' in pg.text_content('#franja-jornada'),'el programa de la jornada queda guardado, es el de sus árboles y se lee en la franja (D130, D151)')
    ok(pg.evaluate("SRP.activa.jornada.arboles_previstos")==25 and '0 de 25' in pg.text_content('#franja-jornada') and 'JORNADA ACTIVA' in pg.text_content('#franja-jornada').upper() and pg.is_visible('#titulo-arbol') and pg.inner_text('#titulo-arbol')=='Nuevo árbol',
       'la meta queda en la jornada; el panel dice «Jornada activa» y «0 de 25», y el formulario empieza con su título «Nuevo árbol» (D131): '+pg.text_content('#franja-jornada').replace('\n',' '))
    ok('Parque Hundido' in pg.text_content('#franja-jornada') and HOY_TXT in pg.text_content('#franja-jornada') and '0 de 25 árboles' in pg.text_content('#franja-jornada'),'la franja dice la jornada, su fecha y cuántos árboles lleva: '+pg.text_content('#franja-jornada').replace('\n',' '))
    jor=pg.evaluate("async () => { const j = (await SRP.almacen.todos('jornadas'))[0]; return [j.nombre, j.ubicacion, j.fecha, j.comentarios, j.estatus, j.cabo_id]; }")
    ok(jor==['Parque Hundido', 'Av. Insurgentes Sur 1500, Benito Juárez', HOY, 'Jornada de prueba con la comunidad', 'abierta', 'u-cabo-1'],'la jornada queda guardada con su ubicación, abierta y a nombre del cabo: %s' % jor)
    ok('Insurgentes' in pg.text_content('#franja-jornada') and 'Alcaldía Cuauhtémoc' in pg.text_content('#franja-jornada'),'y la franja muestra la ubicación escrita y la colonia y alcaldía detectadas: '+pg.text_content('#franja-jornada').replace('\n',' '))
    geo=pg.evaluate("async () => { const j = (await SRP.almacen.todos('jornadas'))[0]; return [j.alcaldia, j.alcaldia_cve, !!j.colonia, !!j.colonia_cve, typeof j.lat, typeof j.gps_precision_m, j.punto_origen]; }")
    ok(geo[0]=='Cuauhtémoc' and geo[1] and geo[2] and geo[3] and geo[4]=='number' and geo[5]=='number' and geo[6]=='gps','la jornada guarda punto, precisión, alcaldía y colonia con sus claves, y que el punto vino del GPS (D122, D143): %s' % geo)
    # Sin tocar el botón, la jornada se guarda sin punto: nada se inventa
    sin=pg.evaluate("""async () => { SRP.activa.mostrarInicio(true); const antes = [document.getElementById('ini-alcaldia').textContent, document.getElementById('btn-ini-detectar').className.includes('btn-primario')];
      document.getElementById('ini-nombre').value = 'Sin detectar'; document.getElementById('ini-programa').value = 'p-refor'; document.getElementById('ini-origen').value = 'PROGRAMADA'; document.getElementById('ini-meta').value = '5'; document.getElementById('btn-ini-hoy').click(); await SRP.activa.iniciarJornada();
      const j = SRP.activa.jornada; return [antes, j.lat, j.alcaldia, j.colonia_cve]; }""")
    ok(sin==[['—',True],None,None,None],'al abrir otra vez el panel vuelve a los guiones, y sin detectar la jornada queda con punto y alcaldía nulos: %s' % sin)
    # La jornada de prueba se retira para no alterar el resto de las pruebas; la primera vuelve a ser la activa
    pg.evaluate("async () => { const j = SRP.activa.jornada; await SRP.almacen.borrarConBitacora('jornadas', j.id, SRP.bitacora.entrada('ELIMINADO', 'jornada', j.id, 'Prueba')); SRP.activa.jornada = null; await SRP.activa.preparar(); }")
    pg.wait_for_timeout(300)
    ok('Parque Hundido' in pg.text_content('#franja-jornada'),'y «Parque Hundido» sigue siendo la jornada activa')
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
    ok(pg.evaluate("document.getElementById('campo-especie').required"),
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
    ok(any(t in msj for t in ['Registrar ubicación del punto','Toque el mapa','capturar coordenadas']),
       'el mapa siempre dice cómo colocar el punto (D173): '+msj[:60]+'…')
    capas=pg.evaluate("SRP.CONFIG.MAPA.CAPAS.map(c=>c.url)")
    ok('World_Imagery' in capas[0] and len(capas)==3,'la capa de abajo es satélite, con nombres encima')
    ok('Esri' in pg.text_content('.leaflet-control-attribution'),'se muestra la atribución del proveedor')
    cred=pg.evaluate("(() => { const a=document.querySelector('.leaflet-control-attribution'); const h1=a.getBoundingClientRect().height; a.click(); const h2=a.getBoundingClientRect().height; a.click(); return { un_renglon: h1 < 22, se_abre: h2 > h1, bandera: !!a.querySelector('svg') }; })()")
    ok(cred=={'un_renglon':True,'se_abre':True,'bandera':False},'en teléfono el crédito del mapa ocupa un renglón y al tocarlo se ve completo (D108): %s' % cred)
    ok(pg.locator('#acceso-clave').count()==0 and pg.get_attribute('#campo-comentarios','autocomplete')=='off' and pg.get_attribute('#form-plantacion','autocomplete')=='off',
       'con sesión abierta no hay campo de contraseña en la página y los campos piden no autollenar (D108)')

    # ESCALA DE ÉNFASIS: una acción de apoyo nunca se pinta como la principal de la pantalla.
    # Eran las dos del mismo color y no se distinguía cuál era el camino normal.
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
    ok(enfasis['principal_relleno']=='rgb(27, 95, 170)','la acción principal es el acento azul relleno (D124, D166): '+enfasis['principal_relleno'])
    ok(enfasis['apoyo']==enfasis['gris'],'y la de apoyo va en gris, no en el acento: '+enfasis['apoyo'])
    ok(enfasis['cerrar_borde']=='0px' and enfasis['cerrar_caja'] in ('rgba(0, 0, 0, 0)','transparent') and 'underline' not in enfasis['cerrar_subrayado'],
       'cerrar sesión es un renglón de texto del menú de la cuenta, sin caja ni subrayado (D97): %s' % enfasis)

    # Los datos del punto son campos del formulario, no un recuadro bajo el mapa
    ok(pg.locator('.ficha-datos').count()==0,'bajo el mapa ya no cuelga el recuadro de datos')
    ok(pg.inner_text('#dato-coordenadas')=='—' and pg.inner_text('#dato-alcaldia')=='—',
       'sin punto, los campos del punto están en blanco')
    ok(pg.locator('.campo-punto .campo-lectura').count()==5,
       'coordenadas, origen, alcaldía, colonia y prioridad de la colonia son cinco campos de sólo lectura')
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
    antes=pg.locator('#espejo-cuerpo tr', has_text='alcaldia_cve').text_content()   # plegado: se lee el contenido, no lo pintado
    ok('—' in antes,'sin punto, alcaldia_cve está vacío')

    pg.click('#btn-ubicacion'); pg.wait_for_timeout(800)
    despues=pg.locator('#espejo-cuerpo tr', has_text='alcaldia_cve').text_content()   # plegado: se lee el contenido, no lo pintado
    ok('09' in despues,'y se llena en cuanto hay punto, sin recargar: '+despues.replace(chr(9),' ')[:50])
    ok(pg.inner_text('#dato-alcaldia')=='Cuauhtémoc','el botón ubica y deriva la alcaldía real: '+pg.inner_text('#dato-alcaldia'))
    fic=pg.evaluate("(() => { const c=document.querySelector('.campo-punto .campo-triple .campo'); const r=document.querySelector('.campo-punto .campo-triple').getBoundingClientRect(); return { filas: getComputedStyle(c).display, sin_caja: getComputedStyle(document.getElementById('dato-alcaldia')).borderTopStyle, alto: Math.round(r.height) }; })()")
    ok(fic['filas']=='block' and fic['sin_caja']=='none' and fic['alto']<120,'en teléfono los datos del punto van en una ficha compacta, sin rótulos a la vista: %s' % fic)
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
    ok('btn-editar' in corr['clase'] and corr['color']=='rgb(30, 35, 39)' and corr['editar'].upper()=='#8A4B00',
       'y pasa a corregir: neutro con lápiz; el ámbar queda para «atención» (D124, D166): '+corr['color'])
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
    ok(pg.evaluate("document.activeElement.id")=='campo-especie','elegir especie deja el foco en la especie: no salta a otro campo (D82)')
    # El programa es el de la jornada (D151): el formulario del árbol ya no lo tiene
    prog=pg.evaluate("({ campo: document.querySelectorAll('#campo-programa, #caja-programa, #programa-botones').length, valor: SRP.formulario.valores().programa_id })")
    ok(prog=={'campo':0,'valor':'p-refor'},'el programa es el de la jornada y el formulario del árbol ya no lo pregunta (D151): %s' % prog)
    # El texto guía de los campos de fecha vacíos (D104) se comprueba en la fecha de la jornada
    vac=pg.evaluate("(() => { const e=document.getElementById('ini-fecha').closest('.envoltura-vacio'); return e ? e.querySelector('.texto-vacio').textContent : null; })()")
    ok(vac=='Seleccione la fecha','la fecha de la jornada lleva el texto guía «Seleccione la fecha» (D104, D120): %s' % vac)
    foco=pg.evaluate("(() => { const e=document.getElementById('campo-comentarios'); e.focus(); const c=getComputedStyle(e); const r=[c.outlineStyle, c.borderTopColor]; e.blur(); return r; })()")
    ok(foco==['none','rgb(27, 95, 170)'],'el foco de un campo de texto es borde azul, el mismo color de foco de toda la app (D98, D166): %s' % foco)

    from PIL import Image; Image.new('RGB',(2400,1800),(70,110,60)).save(sal('arbol.jpg'),quality=90)
    ok(pg.locator('input[type=file][accept^=image]').count()==1,'hay un solo selector de fotografía')
    alin=pg.evaluate("(() => { const l=document.querySelector('fieldset.campo legend').getBoundingClientRect().left, e=document.querySelector('label[for=campo-especie]').getBoundingClientRect().left; return Math.round(l-e); })()")
    ok(alin==0,'la etiqueta «Fotografía» se alinea con las demás (D107): %s px' % alin)
    nav=pg.evaluate("(() => { const n=document.getElementById('navegacion'); const r=n.getBoundingClientRect(); const b=document.querySelector('.barra-guardar').getBoundingClientRect(); return { fija: getComputedStyle(n).position, abajo: Math.round(innerHeight - r.bottom) <= 1, barra_encima: b.bottom <= r.top + 1 }; })()")
    ok(nav=={'fija':'fixed','abajo':True,'barra_encima':True},'en teléfono las secciones van abajo y la barra de guardar queda encima (D107): %s' % nav)
    ok(pg.get_attribute('#foto-archivo','capture') is None,'sin «capture»: el teléfono ofrece su propio menú')
    ok(pg.is_hidden('#ficha-foto'),'sin foto no hay ficha de archivo')
    pg.set_input_files('#foto-archivo',sal('arbol.jpg')); pg.wait_for_timeout(900)
    ok(pg.is_visible('#ficha-foto') and pg.inner_text('#foto-nombre')=='arbol.jpg','la ficha dice el nombre del archivo')
    ok(pg.evaluate("(() => { const z=document.getElementById('etq-foto'); return z.classList.contains('con-foto') && getComputedStyle(z).flexDirection==='row' && z.getBoundingClientRect().height < 70; })()"),
       'con foto cargada la zona de carga se reduce a un renglón «Cambiar fotografía» (D98)')
    ok(any(u in pg.inner_text('#foto-peso') for u in ['KB','MB','B']),'y cuánto pesa ya comprimida: '+pg.inner_text('#foto-peso'))
    dims=pg.evaluate("new Promise(r=>{const i=new Image();i.onload=()=>r([i.width,i.height]);i.src=document.getElementById('foto-vista').src})")
    ok(dims[0]<=800 and dims[1]<=800,'la foto se comprime a %sx%s'%tuple(dims))
    pg.click('#btn-foto-quitar'); pg.wait_for_timeout(300)
    ok(pg.is_hidden('#ficha-foto'),'la papelera quita la foto')
    pg.set_input_files('#foto-archivo',sal('arbol.jpg')); pg.wait_for_timeout(900)

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
    ok(re.match(r'^[A-Z]{3}-\d{3}-\d{5}$', fol) is not None and int(fol[8:13])>sec.get(fol[:7],0),'con datos de prueba la ficha enseña el folio que tocará, sin gastar la secuencia (D126): %s (secuencia %s)' % (fol, sec.get(fol[:7],0)))
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
    esp=pg.evaluate("""(() => { const cat = SRP.formulario.registroPrevisto();
      const campo = document.getElementById('campo-otra-especie'), previo = campo.value; campo.value = 'Especie escrita';
      const otra = SRP.formulario.valores.call(Object.assign({}, SRP.formulario, {estado: Object.assign({}, SRP.formulario.estado, {especieId: SRP.formulario.OTRA})}));
      campo.value = previo;
      return { estatusCat: 'especie_estatus' in cat, catId: cat.especie_id, estatusOtra: 'especie_estatus' in otra, otraId: otra.especie_id, otraTexto: otra.especie_otra }; })()""")
    ok(not esp['estatusCat'] and not esp['estatusOtra'] and esp['catId'] and esp['otraId'] is None and esp['otraTexto'],
       '«Otra especie» se reconoce por especie_id vacío y especie_otra escrita, sin estatus de especie aparte: %s' % esp)
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
    ok(re.search(r'^[A-Z]{3}-\d{3}-\d{5}$', pg.inner_text('#franja-guardado-folio')) is not None,'con su folio (D110): '+pg.inner_text('#franja-guardado-folio'))
    ok(pg.text_content('#conexion').strip()=='Con conexión · Al día (simulado)' and pg.get_attribute('#conexion','data-estado')=='con','la pastilla queda «Al día» y dice que el servidor es simulado (D111, D150)')
    ok(pg.evaluate("document.activeElement.id")=='btn-ubicacion' and pg.is_visible('#btn-guardado-corregir') and pg.is_visible('#btn-guardado-ver'),'el formulario queda listo con el foco en ubicación, y la franja ofrece «Corregir» y «Ver»')
    ok(pg.locator('#especies-recientes .chip').count()==1 and 'Fresno' in pg.inner_text('#especies-recientes'),'la especie recién usada aparece como atajo encima del buscador (D130)')
    ctx.set_geolocation({'latitude':19.432,'longitude':-99.133,'accuracy':0})
    # Nada del árbol anterior sobrevive: un dato heredado se guarda sin que nadie lo note,
    # y la coordenada del árbol de antes se ve bien estando mal.
    restos=pg.evaluate("""() => ({
      especie: document.getElementById('campo-especie').value,
      otra: document.getElementById('caja-otra-especie').hidden ? '' : 'visible',
      programa: SRP.formulario.programaDeJornada(),
      fecha: document.getElementById('campo-fecha').value,
      lat_mano: document.getElementById('coord-lat').value,
      lng_mano: document.getElementById('coord-lng').value,
      coordenadas: document.getElementById('dato-coordenadas').textContent,
      alcaldia: document.getElementById('dato-alcaldia').textContent,
      colonia: document.getElementById('dato-colonia').textContent,
      foto: document.getElementById('ficha-foto').hidden ? '' : 'visible',
      errores: document.getElementById('resumen-errores').hidden ? '' : 'visible',
      marcadores: document.querySelectorAll('.leaflet-marker-icon:not(.punto-plantado)').length,
      punto: SRP.mapa.lat, territorio: SRP.formulario.estado.territorio,
      identificador: SRP.formulario.estado.idPrevisto
    })""")
    heredados={k: restos.pop(k) for k in ('programa','fecha')}
    sucios=[k for k,v in restos.items() if v not in ('', 0, None, '—')]
    ok(sucios==[] and heredados=={'programa':'p-refor','fecha':HOY},'el registro nuevo arranca en blanco salvo lo que hereda de la jornada (programa y fecha, D130); con resto en: %s %s' % (sucios, heredados))

    # Validación
    pg.evaluate("document.getElementById('campo-fecha').value=''"); pg.click('#form-plantacion button[type=submit]'); pg.wait_for_timeout(300)
    ok(pg.locator('#resumen-errores li').count()==3 and 'fecha de plantación' in pg.inner_text('#resumen-errores').lower() and pg.is_visible('#caja-fecha-arbol'),'valida ubicación, especie y fecha de plantación (sin fecha, el campo se enseña aunque la jornada sea de hoy); el programa lo pone la jornada (D151)')
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
    ok(nace and pg.evaluate("SRP.folio.CAMPOS")==['folio'],'el registro nace con el folio en nulo; lo que congela el servidor al asignarlo (R8) ya no se guarda en el teléfono')
    # Servidor simulado con datos de prueba (D110): al guardar con conexión recibe folio, una vez, y se congela lo de R8
    ok(re.fullmatch(r'[A-Z]{3}-\d{3}-\d{5}', guardado['folio'] or '') is not None and guardado['folio'][:7]==guardado['uga']
       and not any(k in guardado for k in ('folio_uga','folio_capa_version','folio_lat','folio_lng')),'con datos de prueba el servidor simulado asigna el folio con la celda del punto, sin copiar al teléfono lo que congela el servidor: %s' % guardado['folio'])
    seq=pg.evaluate("(async () => { const b = await SRP.almacen.todos('bitacora'); const s = SRP.folio.leerSecuencias(); const todos = await SRP.almacen.todos('plantaciones'); return { bitacora: b.some(x => x.accion === 'FOLIO_ASIGNADO'), unicos: new Set(todos.filter(t=>t.folio).map(t=>t.folio)).size === todos.filter(t=>t.folio).length, secuencia: Object.values(s).reduce((a,n)=>a+n,0) >= todos.filter(t=>t.folio).length }; })()")
    ok(seq=={'bitacora':True,'unicos':True,'secuencia':True},'la asignación deja constancia, no repite folios y sale de la secuencia, no de contar registros (R5–R6): %s' % seq)
    ok(pg.evaluate("SRP.folio.textoLargo({folio:'TLP-318-00001'})")=='TLP-318-00001','el folio se escribe solo, sin «(simulado)»: la banda de datos ficticios ya lo dice')
    ok(not any(k in guardado for k in ('es_ficticio','especie_estatus','lat_original','lng_original','foto_nombre','foto_bytes')),'el árbol guardado ya no lleva marca de prueba, estatus de especie, punto original, nombre ni peso de foto: %s' % sorted(guardado.keys()))

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
    ok(opc==['ver/icono','editar/icono','sustituir/icono','eliminar/icono'],'al tocarla ofrece ver, editar, sustituir (D203) y eliminar con icono: %s' % opc)
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
    ok(pg.locator('#filtro-anio').count()==0 and pg.locator('#filtro-mes').count()==0,'ya no hay listas de año ni de mes: los atajos «Este mes» y «Este año» las sustituyen')
    pg.click('#filtro-atajos [data-atajo=anio]'); pg.wait_for_timeout(300)
    ok('Total: 4 ' in pg.inner_text('#registros-total') and pg.get_attribute('#filtro-atajos [data-atajo=anio]','aria-pressed')=='true' and pg.locator('#filtro-atajos .chip[aria-pressed=true]').count()==1,'«Este año» deja los cuatro de 2026: '+pg.inner_text('#registros-total'))
    pg.click('#filtro-atajos [data-atajo=mes]'); pg.wait_for_timeout(300)
    ok(pg.evaluate("SRP.registros.filtrados.every(r => r.fecha_plantacion.startsWith(SRP.util.fechaHoy().slice(0, 7)))") and pg.get_attribute('#filtro-atajos [data-atajo=mes]','aria-pressed')=='true','«Este mes» deja sólo los del mes en curso')
    ok(pg.is_hidden('#filtro-desde'),'el rango viene plegado')
    pg.click('.chip[data-atajo=periodo]'); pg.wait_for_timeout(200)
    ok(pg.is_visible('#filtro-desde') and pg.get_attribute('.chip[data-atajo=periodo]','aria-expanded')=='true','«Un periodo» abre Desde/Hasta (D64)')
    ok(pg.is_visible('#filtro-mas-filtros') and pg.locator('#filtro-especie').count()==1,'y el acordeón «Más filtros» sigue con especie, programa y alcaldía (D129, D200)')
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
    ok(pg.evaluate("SRP.registros.filtro.anio + SRP.registros.filtro.mes")=='','el rango quita «Este mes» y «Este año»')
    ok(pg.get_attribute('.chip[data-atajo=periodo]','aria-pressed')=='true','y «Un periodo» queda marcado mientras haya rango')
    # Reiniciar vuelve al estado de entrada: Hoy, sin rango (D53)
    pg.click('#btn-reiniciar-filtros'); pg.wait_for_timeout(300)
    ok(pg.locator('#filtro-atajos .chip[data-atajo=todos][aria-pressed=true]').count()==1 and pg.input_value('#filtro-desde')=='',
       '«Quitar filtros» vuelve a Todos y limpia el rango (D104, D153)')
    ok('Total: 4 ' in pg.inner_text('#registros-total'),'y lista todos: '+pg.inner_text('#registros-total'))
    ok(pg.is_hidden('#filtro-desde'),'y Reiniciar pliega Desde/Hasta')
    ok([c for c in pg.eval_on_selector_all('#filtro-atajos .chip','b=>b.map(x=>x.dataset.atajo)')]==['todos','hoy','mes','anio','dia','periodo'],'los atajos son Todos, Hoy, Este mes, Este año, Un día y Un periodo, en ese orden, como en Jornadas (D64, D113, D129)')
    # «Un día» (D113): una sola fecha, sin repetirla en Desde y Hasta
    abrir_filtros(pg)
    pg.click('#filtro-atajos [data-atajo=dia]'); pg.wait_for_timeout(300)
    ok(pg.is_visible('#filtro-un-dia') and pg.is_hidden('#filtro-periodo') and pg.get_attribute('#filtro-atajos [data-atajo=dia]','aria-pressed')=='true',
       '«Un día» muestra una sola fecha y esconde el rango (D113)')
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
      const sel = document.getElementById('filtro-especie'), fec = document.getElementById('filtro-desde');
      return {
        suave: g(act).backgroundColor === 'rgb(27, 95, 170)' && g(act).color === 'rgb(255, 255, 255)',
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

    # ---------- EL REPORTE SE GENERA EN LA FICHA DE LA JORNADA ----------
    ok(pg.locator('.pestana[data-vista=reportes]').count()==0 and pg.locator('#vista-reportes').count()==0 and pg.evaluate("(() => { SRP.app.mostrarVista('reportes'); return SRP.app.vista; })()")=='jornadas',
       'ya no hay pestaña ni pantalla de Reportes; pedirla lleva a Jornadas')
    pg.evaluate("async () => { for (const j of await SRP.activa.abiertas()) await SRP.activa.cambiarEstatus(j, 'cerrada'); SRP.activa.jornada = null; }"); pg.wait_for_timeout(300)
    pg.evaluate("SRP.app.mostrarVista('registros')"); pg.wait_for_timeout(300)
    ok(pg.locator('#vista-registros #btn-pdf').count()==0 and pg.locator('#vista-registros #aviso-envio').count()==0,'Registros ya no lleva el reporte ni el bloque del dispositivo (D81)')
    ok(pg.locator('#lista-registros .registro-jornada').count()==pg.locator('#lista-registros .registro').count() and any('Jornada de prueba' in t for t in pg.eval_on_selector_all('#lista-registros .registro-jornada','l=>l.map(x=>x.textContent)')),'cada tarjeta de Registros dice a qué jornada pertenece el árbol (D134)')
    pg.click('.pestana[data-vista=jornadas]'); pg.wait_for_timeout(800)
    pg.evaluate("SRP.jornadas.aplicarAtajo('todas')"); pg.wait_for_timeout(600)
    n_sin=pg.evaluate("SRP.jornadas.lista.filter(j => j.estatus === 'cerrada' && j.registros.length && !j.dato.reporte_en).length")
    ok(n_sin>=1 and pg.locator('#jornada-reporte').count()==0 and 'Sin reporte todavía' in pg.eval_on_selector_all('#jornada-revision option','l=>l.map(o=>o.textContent)'),
       '«Sin reporte todavía» es una opción de «Pendientes», no un filtro aparte: %d cerradas sin reporte' % n_sin)
    pg.select_option('#jornada-revision','sinreporte'); pg.wait_for_timeout(700)
    fr=pg.evaluate("[SRP.jornadas.lista.length, SRP.jornadas.lista.every(j => j.estatus === 'cerrada' && !j.dato.reporte_en), document.getElementById('jornada-fichas').textContent, [...document.querySelectorAll('#lista-jornadas .insignia-reporte')].map(x => x.textContent.trim())]")
    ok(fr[0]==n_sin and fr[1] and 'sin reporte' in fr[2].lower() and fr[3] and set(fr[3])=={'Sin reporte todavía'},'deja las cerradas con árboles que aún no tienen reporte, con su ficha, y cada tarjeta lo dice: %s' % fr[:3])
    pg.select_option('#jornada-revision',''); pg.wait_for_timeout(700)
    ok(pg.evaluate("(() => { SRP.app.mostrarVista('galeria'); return SRP.app.vista; })()")=='galeria','el cabo abre sus fotografías')
    pg.evaluate("SRP.app.mostrarVista('jornadas')"); pg.wait_for_timeout(500)
    # Cualquier día, no sólo hoy (D70): la jornada de ese día genera su reporte desde su ficha
    j10=pg.evaluate("(() => { const j = SRP.jornadas._todas.find(x => x.fecha === '2026-08-10' && x.estatus === 'cerrada'); return j ? j.clave : null; })()")
    pg.evaluate("c => SRP.jornadas.abrir(c)", j10); pg.wait_for_timeout(900)
    pg.evaluate("SRP.jornadas.irAlReporte()"); pg.wait_for_timeout(500)
    ok(pg.is_visible('#vista-jornadas') and '10-AGO-2026' in pg.inner_text('#dlg-cierre-dia'),'desde la ficha de la jornada se abre el cierre de su reporte, sin salir de Jornadas: '+pg.inner_text('#dlg-cierre-dia'))
    pg.click('#btn-cierre-cerrar'); pg.wait_for_timeout(200)
    pg.evaluate("SRP.jornadas.cerrar()"); pg.wait_for_timeout(500)
    pg.evaluate("document.getElementById('jornada-mas-filtros').open = false")

    reporte_de(pg)
    ok(pg.is_visible('#dlg-cierre'),'«Generar reporte» abre el cierre del reporte antes de generar')
    espejoC=pg.evaluate("[...document.querySelectorAll('#espejo-cierre-cuerpo .espejo-campo')].map(e=>e.textContent)")
    ok(espejoC==['id','nombre','ubicacion','fecha','comentarios','programa_id','cabo_id','estatus','organizacion_id','lat','lng','punto_origen','gps_precision_m','alcaldia_cve','alcaldia','colonia_cve','colonia','fecha_inicio','fecha_cierre','editado_por_id','fecha_ultima_edicion','arboles_previstos','puntos_revisados','reporte_en','relevo_id','relevos','origen','solicitante_id','solicitante_otro','pedido_descripcion','carga_id','vehiculo_id','vehiculo_placa','vehiculo_modelo','vehiculo_tipo'],
       'el cierre lleva su espejo con los treinta y cinco campos de la jornada, con la institución que ejecuta, el relevo, el origen y la clave de carga masiva, que no se capturan aquí, con el vehículo y sus tres datos copiados del catálogo (D112, D119, D120, D122, D130, D131, D143, D162, D174): '+', '.join(espejoC))
    pg.fill('#cie-chofer','Mengano'); pg.wait_for_timeout(200)
    ok(pg.evaluate("SRP.reportes.cierrePrevisto().chofer")=='Mengano','y lo que se escribe entra al mismo objeto que se guarda')
    ok(pg.is_visible('#cie-encargado-lectura') and pg.is_hidden('#cie-encargado-caja'),
       'a un cabo no se le pregunta el encargado: es él')
    ok(pg.inner_text('#cie-encargado-lectura').strip()!='','y sale su nombre: '+pg.inner_text('#cie-encargado-lectura'))
    ok('Parque Hundido' in pg.inner_text('#dlg-cierre-dia') and pg.locator('#cie-sitio').count()==0,'el cierre es de la jornada y ya no pregunta el sitio: lo da el nombre de la jornada (D119): '+pg.inner_text('#dlg-cierre-dia'))
    pg.fill('#cie-chofer','Fulano de Tal')
    pg.fill('#cie-hora','14:30')
    # El vehículo sale sólo del catálogo (D162, D174)
    pg.select_option('#cie-vehiculo','v-PRU005'); pg.wait_for_timeout(100)
    ok(pg.inner_text('#btn-cierre-generar').strip()=='Ver vista previa' and pg.evaluate("!!document.getElementById('btn-cierre-generar').closest('.dialogo-pie')"),
       'el cierre lleva «Ver vista previa» al pie (D101)')
    pg.click('#btn-cierre-generar'); pg.wait_for_timeout(500)
    prev=pg.inner_text('#previa-hoja')
    ok(pg.is_visible('#dlg-previa') and 'REPORTE DE LA JORNADA DE PLANTACIÓN' in prev.upper() and 'Nombre del cabo:' in prev and 'Nombre de la jornada: Parque Hundido' in prev
       and 'Comentarios: Jornada de prueba con la comunidad' in prev and 'Chófer: Fulano de Tal' in prev and 'Hora de finalización: 14:30 h' in prev
       and 'TOTALES POR ESPECIE' in prev.upper() and 'Folio' not in prev and 'PROVISIONAL' not in prev,
       'antes del PDF se ve la vista previa con el cabo, los datos de la jornada, el personal, los totales, y sin folios (D101, D119, D163): '+prev[:300].replace('\n',' | '))
    ok('Personal de apoyo' not in prev and 'DATOS DEL VEHÍCULO' in prev.upper(),'y como el PDF, un dato vacío no aparece')
    pg.click('#btn-previa-corregir'); pg.wait_for_timeout(400)
    ok(pg.is_visible('#dlg-cierre') and pg.input_value('#cie-chofer')=='Fulano de Tal','«Corregir datos de cierre» vuelve al formulario con lo escrito')
    # Sin campos de vehículo a mano (D174): modelo, placa y tipo salen del catálogo
    ok(pg.locator('#cie-vehiculo_modelo, #cie-vehiculo_placa, #cie-vehiculo_tipo, #cie-vehiculo-otro').count()==0 and pg.locator('#cie-vehiculo option[value="__otro__"]').count()==0,
       'el cierre ya no trae «Otro vehículo» ni modelo, placa y tipo a mano (D174)')
    ok(pg.evaluate("getComputedStyle(document.getElementById('cie-personal')).backgroundColor")=='rgb(255, 255, 255)','los campos del cierre son cajas blancas con contorno, como los demás formularios: vacías ya no parecen desactivadas')
    pg.fill('#cie-hora',''); pg.click('#btn-hora-ahora'); pg.wait_for_timeout(100)
    ok(re.fullmatch(r'\d\d:\d\d', pg.input_value('#cie-hora')) is not None,'«Ahora» pone la hora actual en la hora de finalización (D103): '+pg.input_value('#cie-hora'))
    pg.fill('#cie-hora','14:30')
    pg.fill('#cie-personal','Ana Uno\nBeto Dos'); pg.fill('#cie-apoyo','Carla Tres')
    pg.click('#btn-cierre-generar'); pg.wait_for_timeout(500)
    pers=pg.evaluate('''() => { const s=[...document.querySelectorAll('#previa-hoja .previa-apartado')].find(x=>x.querySelector('h3').textContent.endsWith('Personal'));
      return { etiquetas: [...s.querySelectorAll('.previa-dato > b')].map(x=>x.textContent), listas: [...s.querySelectorAll('.previa-lista')].map(u=>u.children.length),
               negritas: getComputedStyle(s.querySelector('.previa-dato > b')).fontWeight }; }''')
    ok(pers['etiquetas']==['Personal participante:','Personal de apoyo:','Chófer:'] and pers['listas']==[2] and int(pers['negritas'])>=700,
       'el personal va en su sección: participantes, apoyo y chófer, cada etiqueta en negritas y una persona por renglón (D103, D163): %s' % pers)
    ok(pg.evaluate("[...document.querySelectorAll('#previa-hoja tfoot td')].pop().classList.contains('cifra')"),'el Total se alinea a la derecha como las cifras (D103)')
    with pg.expect_download() as d: pg.click('#btn-previa-generar')
    d.value.save_as(sal('reporte_prueba.pdf'))
    peso=os.path.getsize(sal('reporte_prueba.pdf'))
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
      await SRP.almacen.guardarConBitacora('jornadas', Object.assign({ id: jid, nombre: 'Jardín de prueba', fecha: f, comentarios: '', cabo_id: u.id, estatus: 'cerrada', fecha_inicio: new Date(dia.getTime()+9*3600000).toISOString(), fecha_cierre: ahora,
        encargado_id: u.id, editado_por_id: u.id, fecha_ultima_edicion: ahora, arboles_previstos: null, puntos_revisados: [] }, Object.fromEntries(SRP.reportes.CAMPOS.map(k => [k, '']))), null);
      for (let i=0;i<pts.length;i++) { const id = SRP.util.generarId(); ids.push(id);
        const r = { id, jornada_id: jid, estatus: 'activo', cabo_id: u.id, lat: pts[i][0], lng: pts[i][1], punto_origen: 'gps', gps_precision_m: i===4 ? 45 : 6,
          alcaldia: 'Cuauhtémoc', alcaldia_cve: '09015', colonia: null, colonia_cve: null, uga: 'CUH-021', capa_version: SRP.derivacion.derivar(19.4326, -99.1332).capa_version, especie_id: pts[i][2], especie_otra: '', programa_id: 'p-refor', fecha_plantacion: f, comentarios: '', foto_id: null, foto_base64: null,
          fecha_registro: new Date(dia.getTime()+ (9*60+i*15)*60000).toISOString(), fecha_ultima_edicion: null, editado_por_id: null, folio: null };
        await SRP.almacen.guardarConBitacora('plantaciones', r, SRP.bitacora.entrada('CREADO','plantacion',id)); }
      return { f, ids, jid }; }""")
    pg.evaluate("SRP.app.mostrarVista('registros')"); pg.wait_for_timeout(300)
    pg.click('#navegacion [data-vista=jornadas]'); pg.wait_for_timeout(700)
    ok(pg.is_visible('#vista-jornadas') and pg.get_attribute('#navegacion [data-vista=jornadas]','aria-current')=='page' and pg.locator('#navegacion .pestana:visible').count()==4,
       '«Jornadas» es una sección del menú y abre su vista (D112)')
    ok(pg.eval_on_selector_all('#navegacion .pestana','b=>b.filter(x=>!x.hidden).map(x=>x.dataset.vista)')==['registrar','jornadas','registros','supervision'],'el orden es Nuevo registro, Jornadas, Registros, y «Mi avance» al final (D114, D158)')
    pg.click('#btn-cuenta'); pg.wait_for_timeout(150)
    ok(pg.locator('#btn-contraste svg').count()==1 and pg.locator('#btn-cerrar-sesion svg').count()==1 and pg.locator('#menu-cuenta .menu-opcion:visible').count()==pg.locator('#menu-cuenta .menu-opcion:visible svg').count(),
       'cada opción del menú de la cuenta lleva icono: sol en Modo sol y puerta en Cerrar sesión (D114)')
    pg.keyboard.press('Escape'); pg.evaluate("SRP.app.menuCuenta(false)"); pg.wait_for_timeout(150)
    ok(pg.evaluate("(() => { const b=document.querySelector('#navegacion [data-vista=jornadas]'); const r=b.getBoundingClientRect(); return r.top > 700 && r.bottom <= 844; })()"),'y en teléfono va en la barra de abajo')
    ok([c for c in pg.eval_on_selector_all('#jornada-atajos .chip','b=>b.map(x=>x.dataset.atajo)')]==['todas','hoy','mes','anio','dia','periodo'],'con los atajos Todas, Hoy, Este mes, Este año, Un día y Un periodo')
    ok(pg.is_visible('#jornada-mas-filtros') and not pg.evaluate("document.getElementById('jornada-mas-filtros').open") and pg.locator('#jornada-mas-filtros select').count()==5 and 'Más filtros' in pg.inner_text('#jornada-mas-filtros summary'),'quién registró, programa, origen, alcaldía e institución van plegados en «Más filtros»')
    tarj=pg.locator('#lista-jornadas .jornada')
    ok(tarj.count()>=2 and re.match(r'^\d+ jornadas · \d+ árboles$', pg.inner_text('#jornadas-total')) is not None,'cada jornada es una ficha y el total dice jornadas y árboles: '+pg.inner_text('#jornadas-total'))
    t=[x for x in pg.eval_on_selector_all('#lista-jornadas .jornada','l=>l.map(x=>x.textContent)') if 'Jardín de prueba' in x]
    ok(len(t)==1 and '5 árboles' in t[0] and 'por revisar' in t[0] and 'Cuauhtémoc' in t[0] and 'Cerrada' in t[0] and 'sin cantidad prevista' in t[0],'la ficha dice nombre, estado, dónde y cuántos árboles y puntos por revisar (D128): '+(t[0].replace('\n',' ') if t else '—'))
    orden=pg.evaluate("(() => { const b=document.querySelector('#lista-jornadas .jornada button'); return [...b.querySelectorAll('.jornada-sitio, .jornada-dia, .jornada-avance, .jornada-estatus, .jornada-lugar')].map(e => e.className.split(' ')[0]); })()")
    ok(orden==['jornada-sitio','jornada-dia','jornada-avance','jornada-estatus','jornada-lugar'],'orden de la tarjeta: nombre, cuándo, cuánto, estado, dónde: %s' % orden)
    etq=pg.evaluate("(() => { const b = document.querySelector('#lista-jornadas .jornada button'); return [b.querySelector('.jornada-avance-cifra').textContent.trim(), b.querySelector('.jornada-avance-especies').textContent.trim(), b.querySelectorAll('.jornada-cifra').length, b.querySelectorAll('svg.jornada-barra rect').length]; })()")
    ok(re.match(r'^\d+ de \d+ árbol', etq[0]) and re.match(r'^\d+ especies?$', etq[1]) and etq[2]==0 and etq[3]==1,'la tarjeta resume registrados frente a previstos en una línea con su barra, y las especies al lado: %s' % etq)
    ok(pg.locator('#lista-jornadas .jornada-estatus svg').count()==pg.locator('#lista-jornadas .jornada-estatus').count() and pg.evaluate("(() => { const de = n => { const t=document.createElement('div'); t.innerHTML=SRP.ICONOS.svg(n, 14); return t.querySelector('svg').innerHTML; }; const c=document.querySelector('#lista-jornadas .jornada-estatus[data-estatus=cerrada] svg'); const a=document.querySelector('#lista-jornadas .jornada-estatus[data-estatus=abierta] svg'); return c.innerHTML===de('candado') && (!a || a.innerHTML===de('candadoAbierto')); })()"),'toda etiqueta de estado lleva candado: abierto en Abierta, cerrado en Cerrada (D131)')
    hoyf=pg.evaluate("(() => { const c=[...document.querySelectorAll('#lista-jornadas .jornada')].find(l => l.textContent.includes('Jardín de prueba')); const h=[...document.querySelectorAll('#lista-jornadas .jornada')].find(l => l.querySelector('.jornada-dia b') && l.querySelector('.jornada-dia b').textContent==='Hoy'); return [getComputedStyle(c.querySelector('.jornada-estatus')).backgroundColor, c.querySelector('.jornada-avance-cifra').textContent.trim(), h ? h.querySelector('.jornada-estatus').textContent.trim() : null, h ? getComputedStyle(h.querySelector('.jornada-estatus')).backgroundColor : null]; })()")
    ok(hoyf[0]=='rgb(90, 98, 105)' and hoyf[1].startswith('5 ') and (hoyf[2]=='Abierta' or hoyf[2].startswith('Cerrada')) and hoyf[3] in ('rgb(27, 95, 170)','rgb(90, 98, 105)'),'«Cerrada» en gris y «Abierta» en azul con candado (D166), las cifras cuadran, y la jornada de hoy lleva su etiqueta de estado (D128, D131): %s' % hoyf)
    verde=pg.evaluate("(() => { const s=document.createElement('span'); s.className='jornada-estatus'; s.dataset.estatus='abierta'; document.getElementById('lista-jornadas').appendChild(s); const c=getComputedStyle(s).backgroundColor; s.remove(); return c; })()")
    ok(verde=='rgb(27, 95, 170)','«Abierta» va en azul relleno: en curso, todavía no aprobada (D128, D166)')
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
    ok(pg.get_attribute('#jornada-conciliacion','data-tono')=='neutro' and 'no tiene cantidad prevista' in pg.inner_text('#jornada-resultado') and 'Quedan 3 puntos por revisar' in pg.inner_text('#jornada-resultado') and pg.locator('#jornada-plantados').count()==0,
       'sin meta la conciliación lo dice, ya no pide el conteo de la cuadrilla, y dice cuántos puntos quedan por revisar (D131)')
    # La meta se escribe al iniciar la jornada (D131); aquí se fija en el dato para probar la comparación
    pg.evaluate("async () => { const j = await SRP.almacen.uno('jornadas', '%s'); j.arboles_previstos = 4; await SRP.almacen.guardarConBitacora('jornadas', j, SRP.bitacora.entrada('EDITADO','jornada',j.id,'Meta 4')); await SRP.jornadas.abrir('%s'); }" % (J['jid'], J['jid'])); pg.wait_for_timeout(600)
    ok(pg.get_attribute('#jornada-conciliacion','data-tono')=='err' and 'Sobra 1 registro' in pg.inner_text('#jornada-resultado') and pg.inner_text('#jornada-meta')=='4','con meta 4 y 5 registrados avisa que sobra 1: '+pg.inner_text('#jornada-resultado'))
    # Tocar un punto lo marca en mapa y lista
    pg.click('#jornada-lista .punto-jornada[data-id="%s"] .punto-datos' % J['ids'][1]); pg.wait_for_timeout(300)
    ok(pg.locator('#jornada-lista .punto-jornada.elegido').count()==1 and pg.locator('#jornada-mapa .pin-num.elegido').count()==1 and pg.inner_text('#jornada-mapa .pin-num.elegido')=='2','tocar el punto 2 en la lista lo marca en la lista y en el mapa')
    # Eliminar el duplicado desde la jornada
    pg.click('#jornada-lista .punto-jornada[data-id="%s"] [data-accion=eliminar]' % J['ids'][3]); pg.wait_for_timeout(700)
    ok(pg.is_hidden('#dlg-confirmar') and 'eliminado' in pg.inner_text('#aviso') and pg.locator('#aviso .aviso-accion').count()==1,
       'eliminar un registro no pide confirmar: se deshace, así que el aviso dice cuál se eliminó y ofrece «Deshacer» (D139): '+pg.inner_text('#aviso'))
    ok(pg.is_visible('#jornada-detalle') and pg.locator('#jornada-lista .punto-jornada').count()==4 and pg.locator('#jornada-mapa .pin-num').count()==4,'eliminar el duplicado deja la jornada en 4 puntos y sigue en la misma pantalla')
    ok(pg.get_attribute('#jornada-conciliacion','data-tono')=='rev' and pg.inner_text('#jornada-resultado').startswith('Cuadra: 4 previstos y 4 registrados'),'y ahora cuadra: '+pg.inner_text('#jornada-resultado'))
    ok('Posible duplicado' not in pg.inner_text('#jornada-lista'),'ya no hay aviso de duplicado')
    # «Está bien» sobre el lejano
    pg.click('#jornada-lista .punto-jornada[data-id="%s"] [data-accion=bien]' % J['ids'][4]); pg.wait_for_timeout(500)
    ok(pg.get_attribute('#jornada-conciliacion','data-tono')=='ok' and 'por revisar' not in pg.inner_text('#jornada-resultado') and 'Revisado' in pg.inner_text('#jornada-lista'),'«Está bien» deja el punto como revisado y la jornada en verde')
    rv=pg.evaluate("(id => { const i = [...document.querySelectorAll('#jornada-lista .punto-jornada')].findIndex(li => li.dataset.id === id); const n = document.querySelectorAll('#jornada-lista .punto-num')[i]; const p = document.querySelectorAll('#jornada-mapa .pin-num span')[i]; return [n.dataset.tono, p.dataset.tono, getComputedStyle(p).backgroundColor, getComputedStyle(p).borderRadius]; })('%s')" % J['ids'][4])
    ok(rv==['ok','ok','rgb(30, 122, 70)','50%'],'el punto revisado queda en verde, en la lista y en el mapa, y sigue siendo círculo (D166): %s' % rv)
    # Ver el detalle y editar desde la jornada regresa a la jornada
    pg.click('#jornada-lista .punto-jornada[data-id="%s"] [data-accion=ver]' % J['ids'][0]); pg.wait_for_timeout(400)
    ok(pg.is_visible('#dlg-detalle'),'«Ver» abre el detalle del registro')
    pg.click('#btn-detalle-editar'); pg.wait_for_timeout(500)
    ok(pg.is_visible('#vista-registrar') and pg.get_attribute('#navegacion [data-vista=jornadas]','aria-current')=='page','Editar desde la jornada abre el formulario con Jornadas marcada')
    pg.click('#btn-cancelar-edicion'); pg.wait_for_timeout(600)
    ok(pg.is_visible('#vista-jornadas') and pg.is_visible('#jornada-detalle') and pg.locator('#jornada-lista .punto-jornada').count()==4,'y al cancelar se vuelve a la misma jornada')
    # Reporte de la jornada y regreso a la lista
    pg.click('#btn-jornada-reporte'); pg.wait_for_timeout(700)
    ok(pg.is_visible('#vista-jornadas') and pg.is_visible('#dlg-cierre') and 'Jardín de prueba' in pg.inner_text('#dlg-cierre-dia'),'«Generar reporte» abre el cierre de esa jornada sin salir de Jornadas')
    pg.click('#btn-cierre-generar'); pg.wait_for_timeout(500)
    cif=pg.eval_on_selector_all('#previa-hoja .previa-cifra','l=>l.map(x=>x.innerText.replace(/\\s+/g," "))')
    ok(cif[:3]==['4 árboles plantados','4 previstos en la jornada','100 % de lo previsto'] and 'Nombre de la jornada: Jardín de prueba' in pg.inner_text('#previa-hoja .previa-responsable'),
       'y el reporte lleva las cifras contra lo previsto y, en la franja del cabo, el nombre de la jornada (D169): %s' % cif)
    # Croquis de la jornada (D115): en la vista previa y en el PDF, con los mismos números que la tabla.
    # Espera a que aparezca: con mosaicos lentos el croquis tarda hasta ESPERA_MS (8 s) antes de ir sin imagen
    esperar(pg, "!!document.querySelector('#previa-croquis img')", 10000)
    cro=pg.evaluate("(() => { const i=document.querySelector('#previa-croquis img'); return i ? { src: i.src.slice(0,22), alt: i.alt, nota: document.querySelector('#previa-croquis .previa-nota').textContent } : null; })()")
    ok(cro and cro['src'].startswith('data:image/') and '4 puntos' in cro['alt'] and 'orden de la tabla' in cro['nota'],'la vista previa trae el croquis de la jornada con los puntos numerados (D115): %s' % (cro and cro['nota'][:80]))
    ok(cro and ('sin conexión' in cro['nota'] or 'Esri' in cro['nota']),'y el pie dice si lleva imagen de satélite o si se generó sin conexión')
    hoja=pg.inner_text('#previa-hoja')
    ok('Territorio derivado con las capas: Alcaldías sia-2026-01-01 · UGA sia-2026-09-22 · Colonias iecm-2022.' in hoja and 'capa de prueba' not in hoja,
       'el reporte dice con qué capas se derivó el territorio; las tres son definitivas y ninguna se dice de prueba')
    cab=pg.evaluate("[...document.querySelector('#previa-hoja table').querySelectorAll('thead th')].map(x => x.textContent)")
    fil=pg.evaluate("[...document.querySelector('#previa-hoja table tbody tr').children].map(x => x.textContent)")
    ok(cab==['N.º','Especie','Coordenada','Precisión','Prioridad'] and re.fullmatch(r'.+ \(.+\)', fil[1]) is not None and re.fullmatch(r'19\.\d{6}, -99\.\d{6}', fil[2]) is not None and re.fullmatch(r'±\d+ m|En el mapa|A mano', fil[3]) is not None,
       'la tabla de ejemplares trae número, especie con su nombre científico entre paréntesis, coordenada, precisión y prioridad de la colonia, sin folio (D163, D169, D207): %s' % fil)
    enc=pg.evaluate("(() => { const e = SRP.croquis.encuadre([{lat:19.4326,lng:-99.1332},{lat:19.4336,lng:-99.1322}]); const p = SRP.croquis.aPixel(19.4326,-99.1332,e.z); return { z: e.z, dentro: p.x-e.origenX > 0 && p.x-e.origenX < 1000 && p.y-e.origenY > 0 && p.y-e.origenY < 620 }; })()")
    ok(enc['dentro'] and 15 <= enc['z'] <= 20,'el encuadre deja todos los puntos dentro del lienzo: %s' % enc)
    with pg.expect_download() as dj: pg.click('#btn-previa-generar')
    dj.value.save_as(sal('reporte_jornada.pdf'))
    pj=os.path.getsize(sal('reporte_jornada.pdf'))
    ok(20000 < pj < 400000,'el PDF con croquis se genera y pesa poco: %d KB' % (pj//1024))
    reporte_de(pg, 'Jardín de prueba'); pg.click('#btn-cierre-generar'); pg.wait_for_timeout(500)
    pg.click('#btn-previa-cerrar') if pg.locator('#btn-previa-cerrar').count() else pg.keyboard.press('Escape'); pg.wait_for_timeout(300)
    pg.click('#btn-jornada-volver'); pg.wait_for_timeout(600)
    ok(pg.is_visible('#jornadas-lista-caja') and pg.is_hidden('#jornada-detalle'),'tras generar el reporte se sigue en la ficha; «volver» abre la lista')
    pg.click('#jornada-atajos [data-atajo=dia]'); pg.fill('#jornada-dia', J['f']); pg.dispatch_event('#jornada-dia','change'); pg.wait_for_timeout(400)
    ok(pg.locator('#lista-jornadas .jornada').count()==1 and '4 de 4 árboles · completa' in ' '.join(pg.inner_text('#lista-jornadas .jornada-avance-cifra').split()) and pg.locator('#lista-jornadas .jornada-marcas .insignia-jornada[data-tono=rev]:not(.insignia-reporte)').count()==0,'«Un día» deja sólo esa jornada, ya revisada: '+pg.inner_text('#lista-jornadas .jornada-avance-cifra'))
    pg.click('#jornada-atajos [data-atajo=todas]'); pg.wait_for_timeout(300)
    # ---------- VARIAS JORNADAS EN UN DÍA (D117, D119) ----------
    # El mismo cabo, hace 5 días: tres jornadas declaradas con 3, 2 y 1 árboles
    M=pg.evaluate("""async () => { const u = SRP.sesion.usuario; const dia = new Date(Date.now()-5*86400000); const f = dia.getFullYear()+'-'+String(dia.getMonth()+1).padStart(2,'0')+'-'+String(dia.getDate()).padStart(2,'0');
      const sitios = [['Parque de los Pericos', [[19.3600,-99.1790],[19.3601,-99.1789],[19.3602,-99.1788]]], ['Parque Hundido', [[19.3900,-99.1500],[19.3901,-99.1501]]], ['Parque Aeropuerto', [[19.4400,-99.1200]]]];
      const ids = [], jids = []; let k = 0; const ahora = SRP.util.ahoraISO();
      for (let s = 0; s < sitios.length; s++) {
        const jid = SRP.util.generarId(); jids.push(jid);
        await SRP.almacen.guardarConBitacora('jornadas', Object.assign({ id: jid, nombre: sitios[s][0], fecha: f, comentarios: '', cabo_id: u.id, estatus: 'cerrada', fecha_inicio: new Date(dia.getTime()+(9+s*3)*3600000).toISOString(), fecha_cierre: ahora,
          encargado_id: u.id, editado_por_id: u.id, fecha_ultima_edicion: ahora, arboles_previstos: null, puntos_revisados: [] }, Object.fromEntries(SRP.reportes.CAMPOS.map(x => [x, '']))), null);
        for (const [la, ln] of sitios[s][1]) { const id = SRP.util.generarId(); ids.push(id); k++;
          const r = { id, jornada_id: jid, estatus: 'activo', cabo_id: u.id, lat: la, lng: ln, punto_origen: 'gps', gps_precision_m: 6,
            alcaldia: 'Benito Juárez', alcaldia_cve: '09014', colonia: null, colonia_cve: null, uga: 'BJU-011', capa_version: SRP.derivacion.derivar(19.4326, -99.1332).capa_version, especie_id: 'ESP-0070', especie_otra: '', programa_id: 'p-refor', fecha_plantacion: f, comentarios: '', foto_id: null, foto_base64: null,
            fecha_registro: new Date(dia.getTime()+(9*60+k*40)*60000).toISOString(), fecha_ultima_edicion: null, editado_por_id: null, folio: null };
          await SRP.almacen.guardarConBitacora('plantaciones', r, SRP.bitacora.entrada('CREADO','plantacion',id)); } }
      return { f, ids, jids }; }""")
    pg.click('#navegacion [data-vista=jornadas]'); pg.wait_for_timeout(600)
    pg.click('#jornada-atajos [data-atajo=dia]'); pg.fill('#jornada-dia', M['f']); pg.dispatch_event('#jornada-dia','change'); pg.wait_for_timeout(500)
    esperar(pg, "document.querySelectorAll('#lista-jornadas .jornada').length === 3", 4000)   # la lista se repinta al filtrar
    tarjetas=pg.eval_on_selector_all('#lista-jornadas .jornada','l=>l.map(x=>x.textContent)')
    ok(len(tarjetas)==3 and 'Jornada 1 de 3' in tarjetas[0] and 'Parque de los Pericos' in tarjetas[0] and ('3 de ' in tarjetas[0] or '3 árboles' in tarjetas[0]) and 'Jornada 3 de 3' in tarjetas[2] and 'Parque Aeropuerto' in tarjetas[2],
       'tres jornadas declaradas el mismo día son tres tarjetas con su nombre, numeradas por hora de inicio (D119): %d tarjetas' % len(tarjetas))
    # Filtros nuevos (D128): «Un periodo» con Desde/Hasta + Aplicar; año y mes dentro de «Más filtros»
    pg.click('#jornada-atajos [data-atajo=periodo]'); pg.wait_for_timeout(200)
    ok(pg.is_visible('#jornada-periodo') and pg.is_hidden('#jornada-un-dia') and pg.get_attribute('#jornada-atajos [data-atajo=periodo]','aria-pressed')=='true','«Un periodo» abre Desde y Hasta y cierra «Un día»')
    pg.fill('#jornada-desde', M['f']); pg.fill('#jornada-hasta', M['f']); pg.click('#btn-jornada-filtrar'); pg.wait_for_timeout(400)
    ok(pg.locator('#lista-jornadas .jornada').count()==3 and pg.evaluate("SRP.jornadas.filtro.dia")=='' and pg.evaluate("SRP.jornadas.filtro.desde")==M['f'],'el rango Desde/Hasta deja las 3 jornadas de ese día y el filtro por día queda vacío: %d' % pg.locator('#lista-jornadas .jornada').count())
    # Año y mes ya no son listas: «Este año» y «Este mes» son atajos y cierran el rango
    ok(pg.locator('#caja-jornada-anio').count()==0 and pg.locator('#jornada-mes').count()==0,'Jornadas ya no lleva listas de año ni de mes')
    pg.click('#jornada-atajos [data-atajo=anio]'); pg.wait_for_timeout(300)
    ok(pg.is_hidden('#jornada-periodo') and pg.get_attribute('#jornada-atajos [data-atajo=anio]','aria-pressed')=='true' and pg.locator('#jornada-atajos .chip[aria-pressed=true]').count()==1 and pg.locator('#lista-jornadas .jornada').count()>=3 and pg.evaluate("SRP.jornadas.filtro.desde")=='',
       '«Este año» cierra el rango y deja las jornadas del año en curso: %d' % pg.locator('#lista-jornadas .jornada').count())
    pg.click('#jornada-atajos [data-atajo=mes]'); pg.wait_for_timeout(300)
    ok(pg.get_attribute('#jornada-atajos [data-atajo=mes]','aria-pressed')=='true' and pg.evaluate("SRP.jornadas.lista.every(j => j.fecha.startsWith(SRP.util.fechaHoy().slice(0, 7)))"),'«Este mes» deja sólo las jornadas del mes en curso')
    pg.click('#jornada-atajos [data-atajo=todas]'); pg.wait_for_timeout(300)
    ok(pg.evaluate("SRP.jornadas.filtro.anio + SRP.jornadas.filtro.mes")=='' and 'año' not in pg.inner_text('#jornada-mas-filtros summary'),'«Todas» quita el periodo, y «Más filtros» ya no menciona año ni mes: '+pg.inner_text('#jornada-mas-filtros summary'))
    pg.click('#jornada-atajos [data-atajo=dia]'); pg.fill('#jornada-dia', M['f']); pg.dispatch_event('#jornada-dia','change'); pg.wait_for_timeout(500)
    pg.click('#lista-jornadas .jornada:nth-child(2) button'); pg.wait_for_timeout(800)
    ok(pg.inner_text('#jornada-titulo')=='Parque Hundido' and 'Jornada 2 de 3' in pg.inner_text('#jornada-sub') and pg.inner_text('#jornada-registrados')=='2','la jornada 2 se revisa sola con su nombre: 2 registrados en esta jornada')
    pg.evaluate("async () => { const j = await SRP.almacen.uno('jornadas', '%s'); j.arboles_previstos = 2; await SRP.almacen.guardarConBitacora('jornadas', j, SRP.bitacora.entrada('EDITADO','jornada',j.id,'Meta 2')); await SRP.jornadas.abrir('%s'); }" % (M['jids'][1], M['jids'][1])); pg.wait_for_timeout(600)
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
    ed=pg.evaluate("async () => { const j = await SRP.almacen.uno('jornadas', '%s'); const r = (await SRP.almacen.todos('plantaciones')).filter(x => x.jornada_id === j.id); return [j.nombre, j.arboles_previstos, j.fecha, r.map(x => x.fecha_plantacion), (await SRP.bitacora.deEntidad(j.id)).some(h => h.detalle && h.detalle.includes('Campos: nombre, programa_id, arboles_previstos, fecha'))]; }" % M['jids'][1])
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
    ok(pg.is_visible('#btn-jornada-estado') and 'Reabrir' in pg.inner_text('#btn-jornada-estado') and 'btn-editar' in pg.get_attribute('#btn-jornada-estado','class'),'una jornada cerrada ofrece «Reabrir jornada», neutro con lápiz (D121, D166)')
    pg.click('#btn-jornada-estado'); pg.wait_for_timeout(600)
    ok('Cerrar jornada' in pg.inner_text('#btn-jornada-estado') and 'btn-primario' in pg.get_attribute('#btn-jornada-estado','class') and pg.locator('#btn-jornada-estado svg').count()==1 and 'abierta' in pg.inner_text('#jornada-sub') and pg.evaluate("SRP.activa.jornada && SRP.activa.jornada.id")==M['jids'][1],'reabrir la deja abierta y activa; «Cerrar jornada» es la acción principal con candado, no en verde (D121)')
    pg.click('#btn-jornada-estado'); pg.wait_for_timeout(300)
    ok('Queda pendiente' in pg.inner_text('#dlg-confirmar') and pg.locator('#dlg-confirmar-puntos li', has_text='por debajo de lo previsto').count()==1 and 'reabrir después' in pg.inner_text('#dlg-confirmar-nota'),'al cerrar, el diálogo dice lo que queda pendiente frente a la meta (D133): '+pg.inner_text('#dlg-confirmar-texto'))
    pg.click('#btn-confirmar-si'); pg.wait_for_timeout(600)
    ok('Reabrir' in pg.inner_text('#btn-jornada-estado') and pg.evaluate("SRP.activa.jornada")is None,'y cerrarla la quita de activa')
    # D125: «Cerrar jornada» desde la franja siempre llega a la ficha de esa jornada en Jornadas, aunque sea de otro día y el filtro esté en «Hoy»
    pg.evaluate("SRP.jornadas.aplicarAtajo('hoy')"); pg.wait_for_timeout(200)
    # Fechas relativas a hoy y distintas del día de «Parque Hundido» (hoy - 5): escritas a mano
    # (22 y 21 de septiembre) chocaban con ese día cuando la prueba corría el 26 o el 27
    OTRO1=(datetime.date.today()-datetime.timedelta(days=3)).isoformat(); OTRO2=(datetime.date.today()-datetime.timedelta(days=4)).isoformat()
    iniciar_jornada(pg, 'Jornada de ayer', OTRO1)
    pg.click('#btn-jornada-cerrar'); pg.wait_for_timeout(300); pg.click('#btn-confirmar-si'); pg.wait_for_timeout(800)
    d125=[pg.is_visible('#vista-jornadas'), pg.is_visible('#jornada-detalle'), pg.inner_text('#jornada-titulo'), pg.get_attribute('#jornada-atajos [data-atajo=dia]','aria-pressed'), pg.input_value('#jornada-dia')]
    ok(d125==[True, True, 'Jornada de ayer', 'true', OTRO1],'cerrar una jornada de otro día desde la franja abre su ficha en Jornadas y ajusta el filtro a ese día (D125): %s' % d125)
    # D133: registrar en una jornada que no es de hoy se confirma; un árbol a medias no se pierde al cambiar de sección
    iniciar_jornada(pg, 'Jornada de anteayer', OTRO2)
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
    # D124: sistema de botones. El acento es azul (D166); verde, rojo y ámbar significan; los filtros son píldoras
    d124=pg.evaluate('''() => { const g = e => getComputedStyle(e); const r = document.documentElement.style; const v = n => getComputedStyle(document.documentElement).getPropertyValue(n).trim().toUpperCase();
      return { acento: v('--acento'), radio: g(document.getElementById('btn-jornada-reporte')).borderRadius, chip: g(document.querySelector('#jornada-atajos .chip')).borderRadius,
        apoyo: g(document.getElementById('btn-jornada-faltante')).borderColor, texto_sub: g(document.getElementById('btn-jornada-volver')).textDecorationLine,
        volver: getComputedStyle(document.getElementById('btn-jornada-volver'), '::before').borderLeftWidth }; }''')
    ok(d124['acento']=='#1B5FAA' and d124['radio']=='8px' and d124['chip']=='999px' and d124['apoyo']=='rgb(154, 163, 171)' and d124['texto_sub']=='none' and d124['volver']=='2px',
       'sistema de botones (D124): acento azul (D166), radio 8, filtros en píldora, apoyo con contorno gris, volver con chevron y sin subrayado: %s' % d124)
    # Reportes: una ficha por jornada cerrada y un PDF por jornada (D134)
    pg.click('#btn-jornada-reporte'); pg.wait_for_timeout(700)
    ok(pg.is_visible('#vista-jornadas') and pg.is_visible('#dlg-cierre'),'«Generar reporte» abre el cierre de la jornada 2 sin salir de Jornadas')
    pg.click('#btn-cierre-cerrar'); pg.wait_for_timeout(200)
    pg.evaluate("SRP.jornadas.cerrar()"); pg.wait_for_timeout(500)
    pg.evaluate("document.querySelector('#jornada-atajos [data-atajo=dia]').click()"); pg.fill('#jornada-dia', M['f']); pg.dispatch_event('#jornada-dia','change'); pg.wait_for_timeout(600)
    fichas=pg.eval_on_selector_all('#lista-jornadas .jornada','l=>l.map(x=>x.textContent)')
    f2=[f for f in fichas if 'Parque Hundido' in f]
    ok(len(fichas)==3 and len(f2)==1 and 'Jornada 2 de 3' in f2[0] and 'Sin reporte todavía' in f2[0],'las tres jornadas cerradas de ese día tienen tarjeta; la 2 dice «Jornada 2 de 3» y aún no tiene reporte')
    pg.evaluate("SRP.jornadas.aplicarAtajo('todas')"); pg.wait_for_timeout(400)
    pg.evaluate("async f => { const j = (await SRP.jornadas.jornadasAlcance()).find(x => x.nombre === 'Parque Hundido' && x.fecha === f); await SRP.reportes.abrir(j.registros, j.fecha, j.cabo_id, j); }", M['f']); pg.wait_for_timeout(500)
    ok('Parque Hundido' in pg.inner_text('#dlg-cierre-dia') and 'Jornada 2 de 3' in pg.inner_text('#dlg-cierre-dia') and '1 ejemplar' in pg.inner_text('#dlg-cierre-cuenta'),'el cierre es de la jornada 2: '+pg.inner_text('#dlg-cierre-dia'))
    pg.click('#btn-cierre-generar'); pg.wait_for_timeout(600)
    ok('Jornada 2 de 3' in pg.inner_text('#previa-hoja') and pg.locator('#previa-hoja tbody tr').count()>=1 and 'Nombre de la jornada: Parque Hundido' in pg.inner_text('#previa-hoja'),'la vista previa dice «Jornada 2 de 3» y su nombre, y sólo trae sus ejemplares')
    with pg.expect_download() as dm: pg.click('#btn-previa-generar')
    ok(dm.value.suggested_filename.endswith('_'+M['f']+'_J2.pdf'),'el archivo lleva el número de jornada: '+dm.value.suggested_filename)
    pg.evaluate("async () => { const tx = SRP.almacen.db.transaction(['plantaciones','jornadas'],'readwrite'); %s.forEach(id => tx.objectStore('plantaciones').delete(id)); %s.forEach(id => tx.objectStore('jornadas').delete(id)); await new Promise(r => tx.oncomplete = r); }" % (json.dumps(M['ids']), json.dumps(M['jids'])))

    # Los cuatro puntos de prueba se retiran para no alterar las cuentas que siguen
    pg.evaluate("async () => { const tx = SRP.almacen.db.transaction(['plantaciones','jornadas'],'readwrite'); %s.forEach(id => tx.objectStore('plantaciones').delete(id)); tx.objectStore('jornadas').delete('%s'); await new Promise(r => tx.oncomplete = r); }" % (json.dumps(J['ids']), J['jid']))
    pg.evaluate("SRP.app.mostrarVista('jornadas')"); pg.wait_for_timeout(300)

    # ---------- SIN SEÑAL (B25) ----------
    pg.evaluate("SRP.envio.alCambiar()"); pg.wait_for_timeout(400)   # lo cargado para Jornadas se retiró a mano: la pastilla se pone al día
    ok(pg.text_content('#conexion').strip().startswith('Con conexión · ') and pg.locator('#conexion svg').count()==1 and pg.get_attribute('#conexion','data-estado')=='con','el encabezado dice el estado de la conexión y del envío, con icono y color (D83, D111): '+pg.text_content('#conexion').strip())
    pg.click('#conexion'); pg.wait_for_timeout(200)
    ok(pg.is_visible('#dlg-senal'),'y tocar la pastilla abre la guía de qué hacer sin internet (D80)')
    pg.click('#btn-senal-cerrar'); pg.wait_for_timeout(200)
    ok(pg.locator('#aviso-envio').count()==0 and pg.locator('#btn-ayuda-senal').count()==0,'el bloque «Registros en este dispositivo» ya no existe (D104)')
    pg.click('#conexion'); pg.wait_for_timeout(200)
    ok(pg.is_visible('#dlg-senal') and pg.locator('#dlg-senal li').count()==5,'la ayuda «¿Qué hacer sin internet?» tiene cinco pasos')
    ok(pg.is_hidden('#senal-cola') and pg.is_hidden('#senal-estado') and 'se envían solos' in pg.inner_text('#senal-destino'),
       'sin nada en cola, la guía no muestra la cola ni el estado del teléfono; sólo explica que se envía solo')
    pg.click('#btn-senal-cerrar'); pg.wait_for_timeout(200)
    # El worker guarda la app: sin red, la página vuelve a abrir
    listo=pg.evaluate("""async () => { const r = await navigator.serviceWorker.ready; for (let i=0;i<50;i++){ const ks = await caches.keys(); if (ks.length) { const c = await caches.open(ks[0]); const k = await c.keys(); if (k.length > 20) return { nombre: ks[0], n: k.length }; } await new Promise(r => setTimeout(r, 200)); } return null; }""")
    ok(listo and listo['nombre']=='srp-'+MARCA and listo['n']>20,'el service worker guardó la app con la marca de versión: %s' % listo)
    ctx.set_offline(True)
    ok(pg.evaluate("SRP.folio.emitirPendientes()")==0,'sin conexión el servidor simulado no emite: lo capturado queda PROVISIONAL hasta que vuelva la señal (D110)')
    pg.reload(); pg.wait_for_timeout(1500)
    ok(pg.is_visible('#vista-registros') or pg.is_visible('#vista-registrar') or pg.is_visible('#form-acceso'),'sin red, la app vuelve a abrir desde el teléfono')
    ok(pg.evaluate("SRP.CONFIG.VERSION")==MARCA,'y es la misma versión')
    ok(pg.text_content('#conexion').strip().startswith('Sin conexión · ') and pg.get_attribute('#conexion','data-estado')=='sin','el encabezado avisa que no hay señal, en ámbar y con icono tachado: '+pg.text_content('#conexion').strip())
    # ---------- ENVÍO SIMULADO (D111) ----------
    # Un registro de ayer que nunca salió del teléfono
    rid=pg.evaluate("""async () => { const u = SRP.sesion.usuario; const base = (await SRP.almacen.porIndice('plantaciones','estatus','activo')).find(r => r.cabo_id === u.id);
      const ayer = new Date(Date.now() - 86400000).toISOString(); const id = SRP.util.generarId();
      const r = Object.assign({}, base, { id, folio: null, fecha_registro: ayer });
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
    pg.evaluate("SRP.app.mostrarVista('jornadas')"); pg.wait_for_timeout(500)
    ctx.set_offline(False); pg.wait_for_timeout(300)
    pg.evaluate("SRP.conexion.refrescar()"); pg.wait_for_timeout(300)
    # Sin respaldo en el teléfono (D175): ni botón, ni restaurar, ni validador, ni fecha guardada
    import json
    pg.click('#btn-cuenta'); pg.wait_for_timeout(150)
    sin=pg.evaluate("""() => ({ boton: !!document.getElementById('btn-respaldo'), restaurar: !!document.getElementById('archivo-restaurar'),
        funciones: typeof SRP.conexion.respaldar + '/' + typeof SRP.conexion.restaurar + '/' + typeof SRP.conexion.textoUltimoRespaldo,
        validar: typeof SRP.validar, clave: 'CLAVE_ULTIMO_RESPALDO' in SRP.CONFIG, guardada: localStorage.getItem('srp_ultimo_respaldo'),
        menu: document.getElementById('menu-cuenta').innerText })""")
    ok(not sin['boton'] and not sin['restaurar'] and sin['funciones']=='undefined/undefined/undefined' and sin['validar']=='undefined'
       and not sin['clave'] and sin['guardada'] is None and 'respaldo' not in sin['menu'].lower(),
       'el respaldo del teléfono ya no existe: sin «Guardar respaldo», sin «Restaurar respaldo», sin validador ni fecha guardada (D175): %s' % {k: v for k, v in sin.items() if k != 'menu'})
    pg.keyboard.press('Escape'); pg.wait_for_timeout(150)
    fic=pg.evaluate("""async () => { const j = await SRP.almacen.todos('jornadas'), b = await SRP.almacen.todos('bitacora');
        return j.length > 0 && b.length > 0 && !j.some(x => 'es_ficticio' in x) && !b.some(x => 'es_ficticio' in x); }""")
    ok(fic,'jornadas y bitácora ya no llevan marca de prueba: la versión de prueba vive en su propia base')
    # Lo escrito no se vuelve a pedir al regenerar el reporte de la misma jornada
    reporte_de(pg)
    gen=pg.evaluate("""async () => { const c = (await SRP.jornadas.jornadasAlcance()).filter(j => j.estatus === 'cerrada' && j.dato.reporte_en); return c.length; }""")
    ok(gen>=1,'la jornada con reporte lo guarda en su dato: %s con reporte' % gen)
    ok(pg.input_value('#cie-chofer')=='Fulano de Tal','al regenerar, el cierre ya viene escrito')
    ok(pg.input_value('#cie-hora')=='14:30' and pg.input_value('#cie-vehiculo')=='v-PRU005','con todos sus campos, el vehículo elegido incluido')
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
    ok(pg.locator('#caja-programa').count()==0 and pg.evaluate("SRP.formulario.valores().programa_id")==pg.evaluate("SRP.formulario.estado.editando.programa_id"),'al editar tampoco se pide el programa: es el de su jornada (D151)')
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
    ok('Total: 3 ' in pg.inner_text('#registros-total') and pg.get_attribute('.chip[data-atajo=todos]','aria-pressed')=='true','«Deshacer» de «Quitar filtros» devuelve el filtro anterior (D101)')

    # ---------- COORDINADOR ----------
    pg.click('#btn-cuenta'); pg.click('#btn-cambiar-perfil'); pg.select_option('#sel-usuario-prueba','u-coord-1'); pg.click('#btn-entrar-prueba'); pg.wait_for_timeout(600)
    pg.click('.pestana[data-vista=registros]'); pg.wait_for_timeout(500)
    abrir_filtros(pg)
    pg.click('.chip[data-atajo=todos]'); pg.wait_for_timeout(300)
    ok('Total: 3 ' in pg.inner_text('#registros-total'),'el coordinador ve los de su cuadrilla: '+pg.inner_text('#registros-total'))
    ok('Fulana' in pg.inner_text('#lista-registros'),'con el nombre del cabo')
    ok(pg.locator('button[data-accion=editar]').count()>0 and pg.locator('button[data-accion=eliminar]').count()>0,'edita y elimina los de su cuadrilla (D155)')
    ok(pg.is_hidden('.pestana[data-vista=catalogos]') and pg.is_hidden('.pestana[data-vista=usuarios]'),'no ve Catálogos ni Usuarios')
    ok(not pg.evaluate("document.getElementById('caja-filtro-cabo').hidden") and 'quién registró' in pg.inner_text('#filtro-mas-filtros summary'),'sí tiene filtro por cabo, dentro de «Más filtros» (D129): '+pg.inner_text('#filtro-mas-filtros summary'))
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
    # Fotografías vive dentro de Supervisión (D158)
    pg.click('.pestana[data-vista=supervision]'); pg.wait_for_timeout(700)
    abrir_sup(pg)
    ok(pg.is_visible('#btn-sup-fotos'),'el coordinador ve las Fotografías, dentro de Supervisión (D118, D158)')
    pg.click('#btn-sup-fotos'); pg.wait_for_timeout(600)
    ok(pg.get_attribute('.pestana[data-vista=supervision]','aria-current')=='page','y Supervisión queda marcada mientras las ve')
    ok(pg.is_visible('#vista-galeria') and pg.locator('#galeria-rejilla .galeria-foto').count()>=1,'la galería muestra las fotografías de su cuadrilla: %d' % pg.locator('#galeria-rejilla .galeria-foto').count())
    ok(pg.inner_text('#galeria-cuenta').startswith('1 fotograf') or pg.inner_text('#galeria-cuenta')[0].isdigit(),'con la cuenta y el peso: '+pg.inner_text('#galeria-cuenta'))
    pg.click('#galeria-rejilla .galeria-foto >> nth=0'); pg.wait_for_timeout(400)
    ok(pg.is_visible('#dlg-foto') and pg.get_attribute('#dlg-foto-img','src').startswith('data:image/') and 'Cabo' in pg.inner_text('#dlg-foto-datos') and 'Foto_' in pg.inner_text('#dlg-foto-datos'),'tocar una la abre grande con los datos del árbol y el nombre del archivo')
    with pg.expect_download() as df: pg.click('#btn-foto-descargar')
    ok(re.fullmatch(r'Foto_[A-Za-z0-9-]+_\d{4}-\d{2}-\d{2}_[A-Za-z0-9_]+\.jpg', df.value.suggested_filename) is not None,'«Descargar» entrega la foto con nombre legible: '+df.value.suggested_filename)
    pg.click('#btn-foto-registro'); pg.wait_for_timeout(400)
    ok(pg.is_hidden('#dlg-foto') and pg.is_visible('#dlg-detalle'),'«Ver detalle» abre el detalle (D153)')
    pg.click('#btn-detalle-cerrar'); pg.wait_for_timeout(300)
    with pg.expect_download() as dz: pg.click('#btn-galeria-zip')
    dz.value.save_as(sal('fotos_prueba.zip'))
    import zipfile
    with zipfile.ZipFile(sal('fotos_prueba.zip')) as z:
        nombres=z.namelist(); okzip=z.testzip() is None; primero=z.read(nombres[0])[:3]
    ok(dz.value.suggested_filename.startswith('Fotografias_SRP') and okzip and len(nombres)>=1 and primero==b'\xff\xd8\xff','«Descargar todas» arma un ZIP válido con las fotos en JPEG: %s' % nombres)
    # Por jornada (D135): la lista trae las jornadas con fotos; elegir una filtra y nombra el ZIP con ella
    ok([c for c in pg.eval_on_selector_all('#galeria-atajos .chip','b=>b.map(x=>x.dataset.atajo)')]==['todas','hoy','mes','anio','dia','periodo'],'los atajos de Fotografías van en el orden Todas, Hoy, Este mes, Este año, Un día, Un periodo')
    pg.click('#galeria-atajos [data-atajo=todas]'); pg.wait_for_timeout(300)
    opciones=pg.eval_on_selector('#galeria-jornada',"s=>[...s.options].map(o=>o.value)")
    ok(len(opciones)>=2 and opciones[0]=='' and not pg.is_disabled('#galeria-jornada'),'la lista de jornadas ofrece «Todas» y las jornadas con fotografías: %d' % (len(opciones)-1))
    pg.evaluate("document.getElementById('galeria-mas').open = true"); pg.select_option('#galeria-jornada', opciones[1]); pg.wait_for_timeout(400)
    nom=pg.evaluate("(async () => (await SRP.almacen.uno('jornadas','%s')).nombre)()" % opciones[1])
    ok(pg.locator('#galeria-rejilla .galeria-foto').count()>=1 and all(nom in t for t in pg.eval_on_selector_all('#galeria-rejilla .galeria-pie','l=>l.map(x=>x.textContent)')),'elegir una jornada deja sólo sus fotografías, y cada pie dice la jornada')
    with pg.expect_download() as dzj: pg.click('#btn-galeria-zip')
    ok(re.match(r'^Fotografias_SRP_[A-Za-z0-9_]+_\d{4}-\d{2}-\d{2}', dzj.value.suggested_filename) is not None,'el ZIP de una jornada lleva su nombre y su fecha: '+dzj.value.suggested_filename)
    pg.click('#galeria-atajos [data-atajo=hoy]'); pg.wait_for_timeout(300)
    ok(pg.evaluate("SRP.galeria.filtro.jornada")=='' and pg.input_value('#galeria-jornada')=='','cambiar de día limpia la jornada elegida')
    pg.click('.pestana[data-vista=registros]'); pg.wait_for_timeout(400)
    # Quien ve a varias personas elige el encargado del reporte, y sólo entre quienes registraron (B19)
    pg.click('.pestana[data-vista=jornadas]'); pg.wait_for_timeout(700)
    pg.evaluate("document.getElementById('jornada-mas-filtros').open = true"); pg.wait_for_timeout(100)
    ok(pg.is_visible('#caja-jornada-cabo') and pg.locator('#jornada-cabo option').count()>=2 and pg.locator('#jornada-cabo option[value=""]').count()==1 and pg.evaluate("SRP.jornadas._todas.filter(j => j.estatus === 'cerrada').length")>=1,'el coordinador filtra por cabo y ve las jornadas cerradas de su cuadrilla (D134)')
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
    ok(pg.is_visible('#vista-supervision'),'y entra directamente a Supervisión (D158)')
    pg.evaluate("SRP.app.mostrarVista('registrar')"); pg.wait_for_timeout(300)
    ok(pg.is_visible('#vista-registros'),'ni la abre llamándola directamente')
    pg.click('#btn-cuenta'); pg.click('#btn-ir-configuracion'); pg.wait_for_timeout(300); pg.click('.cfg-tarjeta[data-ir=catalogos]'); pg.wait_for_timeout(500)   # Catálogos, desde el menú de la cuenta (D158)
    ok(all(pg.locator('#tabla-catalogo tbody tr', has_text=n).locator('button[data-accion=eliminar]').count()==0 for n in ('Reforestación Urbana','Centro Histórico')),'un programa en uso no ofrece Eliminar')
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
    accion(pg, pg.locator('#tabla-catalogo tbody tr', has_text='Otro Programa'),'eliminar'); pg.click('#btn-confirmar-si'); pg.wait_for_timeout(400)
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
    ok(pg.evaluate("getComputedStyle(document.getElementById('vista-jornadas')).maxWidth===getComputedStyle(document.getElementById('vista-registros')).maxWidth"),'las vistas de lista miden lo mismo (D100)')
    pg.set_viewport_size({'width':1280,'height':900}); pg.wait_for_timeout(300)
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
    ok(nueva and nueva['id']=='ESP-0077' and nueva['clave']=='ESP-0077' and nueva['nombre_cientifico']=='Genus prueba' and 'genero' not in nueva and 'especie' not in nueva and nueva['tipo_distribucion']=='Exótica'
       and nueva['otros_nombres_comunes']=='Nombre uno, Nombre dos' and nueva['id_snib']=='99999ANGIO' and nueva['id_enciclovida']==123456 and nueva['formadecrecimiento']=='Árbol, Arbusto',
       'la especie nueva se guarda con id = clave, su nombre científico (sin copiar género ni epíteto) y los campos del SNIB limpios: %s' % (nueva and {k:nueva.get(k) for k in ('id','nombre_cientifico','id_snib','id_enciclovida','otros_nombres_comunes')}))
    pg.fill('#cat-buscar','prueba'); pg.wait_for_timeout(200)
    accion(pg,'#tabla-catalogo','estado'); pg.wait_for_timeout(400)
    ok(pg.is_hidden('#dlg-confirmar') and 'desactivado' in pg.inner_text('#aviso') and pg.locator('#aviso .aviso-accion').count()==1,'desactivar un valor no pide confirmar: el aviso lo explica y ofrece «Deshacer» (D139)')
    ok(pg.locator('.estado-texto[data-activo=false]').count()>=1,'una especie se puede desactivar')
    ok(pg.evaluate("(() => { const f=SRP.formulario; f.el('campo-especie').value='Genus prueba'; f.estado.especieId=null; f.filtrarEspecies(); const t=f.el('lista-especies').innerText; f.cerrarCombo(); f.el('campo-especie').value=''; return !t.includes('Genus prueba'); })()"),'y una especie inactiva no se ofrece en el formulario')
    pg.fill('#cat-buscar',''); pg.wait_for_timeout(200)

    # ---------- ADMINISTRACIÓN: usuarios ----------
    pg.click('#btn-cuenta'); pg.click('#btn-ir-configuracion'); pg.wait_for_timeout(300); pg.click('.cfg-tarjeta[data-ir=usuarios]'); pg.wait_for_timeout(500)   # desde el menú de la cuenta (D158)
    ok(pg.locator('#tabla-usuarios tbody tr').count()==13,'la lista trae las trece cuentas')
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
    ok(pg.locator('#usr-errores li').count()==4,'el alta vacía señala los cuatro campos obligatorios: tipo de institución, nombre completo, correo y cargo')
    pg.select_option('#usr-tipo-org','Gobierno de la CDMX'); pg.wait_for_timeout(150); pg.select_option('#usr-organizacion','o-sedema'); pg.wait_for_timeout(150)
    ok(pg.is_visible('#caja-usr-coordinador') and pg.is_visible('#caja-usr-area'),'en la Secretaría aparecen el área y, para perfil Cabo, el coordinador')
    pg.select_option('#usr-perfil','ADMIN'); pg.wait_for_timeout(200)
    ok(pg.is_hidden('#caja-usr-coordinador'),'y desaparece para Administración')
    ok(pg.locator('#usr-perfil option').count()==5 and pg.locator('#usr-perfil option[value=VIEWER]').count()==0 and pg.locator('#usr-perfil option[value=DIRECTIVO]').count()==1,'el perfil ofrece cuatro opciones, con Directivo (D224); ya no existe Consulta (D87)')
    ok('No captura' in pg.inner_text('#usr-perfil-ayuda'),'se explica qué puede hacer cada perfil')
    pg.select_option('#usr-perfil','CABO'); pg.wait_for_timeout(200)
    pg.fill('#usr-nombre-completo','Sutana Nueva Ejemplo')
    pg.select_option('#usr-area','a-dgsanpava'); pg.wait_for_timeout(150)
    pg.fill('#usr-cargo','Cabo de cuadrilla')
    pg.fill('#usr-correo','correo-sin-arroba'); pg.click('#form-usuario button[type=submit]'); pg.wait_for_timeout(200)
    ok('correo válido' in pg.inner_text('#usr-errores'),'se rechaza un correo mal formado')
    pg.fill('#usr-correo','CABO@ejemplo.local'); pg.click('#form-usuario button[type=submit]'); pg.wait_for_timeout(200)
    ok('ya tiene cuenta' in pg.inner_text('#usr-errores'),'y un correo repetido')
    pg.fill('#usr-correo','sutana@ejemplo.local'); pg.click('#usr-coordinadores .chip[data-id="u-coord-1"]')
    pg.click('#form-usuario button[type=submit]'); pg.wait_for_timeout(500)
    ok('Sutana Nueva Ejemplo' in pg.inner_text('#tabla-usuarios'),'se da de alta la cuenta nueva')
    pg.click('#btn-cuenta'); pg.click('#btn-cambiar-perfil'); pg.fill('#acceso-correo','sutana@ejemplo.local'); pg.fill('#acceso-clave','x')
    pg.click('#form-acceso button[type=submit]'); pg.wait_for_timeout(700)
    ok('Sutana' in pg.inner_text('#usuario-nombre') and pg.is_hidden('.pestana[data-vista=usuarios]'),'la cuenta nueva entra y no ve Usuarios')
    pg.evaluate("SRP.app.mostrarVista('usuarios')"); pg.wait_for_timeout(300)
    ok(pg.is_visible('#vista-registros'),'ni la abre llamándola directamente')
    pg.click('#btn-cuenta'); pg.click('#btn-cambiar-perfil'); pg.select_option('#sel-usuario-prueba','u-admin-1'); pg.click('#btn-entrar-prueba'); pg.wait_for_timeout(500)
    pg.click('#btn-cuenta'); pg.click('#btn-ir-configuracion'); pg.wait_for_timeout(300); pg.click('.cfg-tarjeta[data-ir=usuarios]'); pg.wait_for_timeout(500)
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
    # El segundo toque va en el mismo instante, mientras el primero sigue en curso: después el formulario ya se movió de lugar
    desh=pg.evaluate("() => { const f = document.getElementById('form-plantacion'); f.requestSubmit(); const b = document.getElementById('btn-revisar'); const e = [b.disabled, b.getAttribute('aria-busy')]; b.click(); f.requestSubmit(); return e; }")
    ok(desh==[True,'true'],'al enviar, el botón Guardar queda deshabilitado de inmediato y con aria-busy: %s' % desh)
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
    pg.evaluate("SRP.app.mostrarVista('jornadas')"); pg.wait_for_timeout(700); pg.evaluate("SRP.jornadas.aplicarAtajo('todas')"); pg.wait_for_timeout(500)
    reporte_de(pg,'Jornada del tono aviso') if pg.evaluate("SRP.jornadas._todas.some(j => j.estatus === 'cerrada' && j.nombre.includes('Jornada del tono aviso'))") else reporte_de(pg)
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
    pg.wait_for_timeout(600)
    ok('reporte: hoy' in pg.inner_text('#lista-jornadas').lower(),'y la tarjeta de la jornada pasa a «Reporte: hoy» sin salir y volver (D138)')

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
    pg.fill('#ini-nombre','Jornada de los pasos'); pg.select_option('#ini-programa','p-refor'); pg.select_option('#ini-origen','PROGRAMADA'); pg.fill('#ini-meta','2')
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
    ok(pg.is_visible('#franja-siguiente') and 'Se plantó lo previsto: 2 de 2' in pg.inner_text('#franja-siguiente') and 'cerrar la jornada' in pg.inner_text('#franja-siguiente'),
       'y el panel dice «Se plantó lo previsto… Siguiente: cerrar la jornada»: '+pg.inner_text('#franja-siguiente'))
    pg.click('#btn-jornada-cerrar'); pg.wait_for_timeout(300); pg.click('#btn-confirmar-si'); pg.wait_for_timeout(1500)
    ok(pg.is_visible('#jornada-detalle') and 'cerrada' in pg.inner_text('#aviso') and 'Siguiente: generar el reporte' in pg.inner_text('#aviso'),
       'al cerrar, la ficha abre y el aviso dice qué sigue (D138): '+pg.inner_text('#aviso'))
    ok(est('#jornada-pasos')==['hecho','hecho','hecho','actual'],'en la ficha, sin puntos por revisar, «Revisar» queda hecho y el actual es «Reporte»: '+str(est('#jornada-pasos')))
    ok('Siguiente: generar el reporte' in pg.inner_text('#jornada-siguiente') and pg.is_visible('#btn-jornada-reporte') and 'Generar reporte' in pg.inner_text('#btn-jornada-reporte')
       and 'btn-primario' in pg.get_attribute('#btn-jornada-reporte','class'),'la barra del pie dice lo que sigue y su botón principal lo hace: «Generar reporte»')
    ok(pg.evaluate("document.activeElement.id")=='btn-jornada-reporte','y el foco queda en ese botón, listo para el siguiente paso')
    ok(pg.is_hidden('#btn-jornada-siguiente') and 'Registrar árbol' in pg.inner_text('#btn-jornada-faltante') and 'btn-secundario' in pg.get_attribute('#btn-jornada-faltante','class'),
       'cerrada, «Registrar árbol» queda como secundario')
    # Reabierta con la meta cumplida: «Cerrar jornada» pasa a la barra y el encabezado no la repite
    pg.click('#btn-jornada-estado'); pg.wait_for_timeout(700)
    ok(est('#jornada-pasos')==['hecho','actual','pendiente','pendiente'] and pg.is_visible('#btn-jornada-siguiente') and 'Cerrar jornada' in pg.inner_text('#btn-jornada-siguiente')
       and pg.is_hidden('#btn-jornada-estado'),'reabierta con la meta cumplida, «Cerrar jornada» es el botón principal del pie y no se repite arriba (D138)')
    ok(pg.is_hidden('#btn-jornada-reporte') and 'Registrar árbol' in pg.inner_text('#btn-jornada-faltante'),'abierta no hay reporte, y registrar dice «Registrar árboles»')
    pg.click('#btn-jornada-siguiente'); pg.wait_for_timeout(300)
    ok(pg.is_visible('#dlg-confirmar') and '¿Cerrar la jornada' in pg.inner_text('#dlg-confirmar-texto'),'el botón del pie pide la misma confirmación que el del encabezado')
    pg.click('#btn-confirmar-si'); pg.wait_for_timeout(1000)
    ok(est('#jornada-pasos')==['hecho','hecho','hecho','actual'],'y la cierra')
    # «Revisar»: se reabre con «Registrar árbol» y se registra un duplicado a propósito (misma
    # especie en el mismo punto que el segundo árbol)
    pg.click('#btn-jornada-faltante'); pg.wait_for_timeout(700)
    ok(pg.is_visible('#vista-registrar') and 'Jornada de los pasos' in pg.text_content('#franja-jornada-texto'),'«Registrar árbol» en una jornada cerrada la reabre y lleva a Nuevo registro')
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
    ok(pg.inner_text('#btn-jornada-reporte').strip()=='Generar reporte' and 'btn-primario' in pg.get_attribute('#btn-jornada-reporte','class') and 'M17.65 6.35' not in pg.inner_html('#btn-jornada-reporte'),'y el reporte se ofrece como «Generar reporte», igual que en Reportes, aunque ya se haya generado (D172)')
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
    err=pg.evaluate("""() => ['ini-nombre','ini-programa','ini-origen','ini-meta','ini-fecha'].map(id => { const c = document.getElementById(id), m = document.getElementById(id + '-error');
      return [!!m && !m.hidden && !!m.querySelector('svg'), (c.getAttribute('aria-describedby') || '').split(' ').includes(id + '-error'), c.getAttribute('aria-invalid')]; })""")
    ok(all(e==[True,True,'true'] for e in err) and pg.locator('#ini-errores li').count()==5,'cada campo con error lo dice debajo, con icono, enlazado con aria-describedby; el resumen de arriba se queda (D140): %s' % err)
    ok(pg.inner_text('#ini-meta-error')==pg.locator('#ini-errores li').nth(3).inner_text(),'el mensaje del campo es el mismo del resumen')
    pg.fill('#ini-nombre','J'); pg.wait_for_timeout(100)
    ok(pg.locator('#ini-nombre-error').count()==0 and pg.get_attribute('#ini-nombre','aria-invalid') is None and 'ini-nombre-error' not in (pg.get_attribute('#ini-nombre','aria-describedby') or ''),
       'al corregir el campo, su error se va en seguida, sin esperar a volver a enviar')
    pg.click('#btn-ini-hoy'); pg.wait_for_timeout(100)
    ok(pg.locator('#ini-fecha-error').count()==0,'«Hoy» también quita el error de la fecha')
    ok(pg.locator('#ini-meta-ayuda').count()==0 and 'ayuda' not in (pg.get_attribute('#ini-meta','aria-describedby') or '')
       and pg.inner_text('#ini-ubicacion-ayuda').strip()=='Calle y número, entre calles o tramo.' and pg.get_attribute('#ini-ubicacion','aria-describedby')=='ini-ubicacion-ayuda',
       'la meta ya no lleva línea de ayuda; la dirección pide calle y número, entre calles o tramo, enlazada al campo (D165)')
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
    pg.fill('#ini-comentarios',''); pg.fill('#ini-nombre','Jornada de los campos'); pg.select_option('#ini-programa','p-refor'); pg.select_option('#ini-origen','PROGRAMADA'); pg.fill('#ini-meta','5')
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
    ok(pg.is_visible('#ej-nombre-error') and pg.is_visible('#ej-meta-error') and pg.get_attribute('#ej-meta','aria-describedby')=='ej-meta-error' and pg.locator('#ej-meta-ayuda').count()==0,'en Editar jornada también: error bajo el campo; la meta sin línea de ayuda (D165)')
    pg.keyboard.press('Escape'); pg.wait_for_timeout(200)
    pg.click('#btn-jornada-editar'); pg.wait_for_timeout(300)
    ok(pg.locator('#dlg-editar-jornada .campo-error').count()==0,'al volver a abrir el diálogo, los errores de antes ya no están')
    pg.keyboard.press('Escape'); pg.wait_for_timeout(200)

    # ---------- BLOQUE 82: TARJETAS, SECCIONES E ICONOS (D141) ----------
    tam=lambda: set(pg.evaluate("[...document.querySelectorAll('svg[width]')].filter(s => !s.closest('.leaflet-container')).map(s => s.getAttribute('width'))"))
    vistos=set()
    for v in ('registrar','jornadas','registros','galeria'):
        pg.evaluate("SRP.app.mostrarVista('%s')" % v); pg.wait_for_timeout(500); vistos|=tam()
    ok(vistos<={'16','20','24'},'los iconos usan sólo tres tamaños —16, 20 y 24— en todas las vistas (D141): %s' % sorted(vistos))
    ok(pg.evaluate("SRP.ICONOS.tamano(18)")==20 and pg.evaluate("SRP.ICONOS.tamano(34)")==24 and pg.evaluate("SRP.ICONOS.tamano('chico')")==16,'un número suelto se lleva al escalón más cercano')
    # Ficha de jornada: subtítulos, cuenta de puntos y la barra de saltos en teléfono
    pg.evaluate("SRP.app.mostrarVista('jornadas')"); pg.wait_for_timeout(500); pg.evaluate("SRP.jornadas.aplicarAtajo('todas')"); pg.wait_for_timeout(400)
    tarjeta=pg.locator('#lista-jornadas .jornada', has_text='Jornada de los pasos').first
    ok(tarjeta.locator('.jornada-estatus svg').count()==1 and tarjeta.locator('.insignia-jornada').count()==tarjeta.locator('.insignia-jornada svg').count() and tarjeta.locator('.jornada-completa').count()==tarjeta.locator('.jornada-completa svg').count(),'el estado y cada marca de la tarjeta llevan su icono: el color no va solo (D141)')
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
    altos=pg.evaluate("[...document.querySelectorAll('.barra-jornada .btn')].filter(b => !b.hidden).map(b => { const r = document.createRange(); r.selectNodeContents(b.querySelector('span') || b); return [b.textContent.trim(), Math.round(b.getBoundingClientRect().height), r.getClientRects().length, b.scrollWidth <= b.clientWidth]; })")
    ok(altos and all(h<=50 and n==1 and cabe for _,h,n,cabe in altos),'a 360 px los botones de la barra del pie caben en un renglón, sin cortar la etiqueta (D141, D172): %s' % altos)
    pg.set_viewport_size({'width':390,'height':844}); pg.wait_for_timeout(200)
    # Registros: anatomía común —qué, cuándo, estado, dónde—
    pg.evaluate("SRP.app.mostrarVista('registros')"); pg.wait_for_timeout(600)
    orden=pg.evaluate("(() => { const d = document.querySelector('#lista-registros .registro .registro-datos'); return [...d.children].filter(x => !x.hidden).map(x => x.className.split(' ')[0]); })()")
    ok(orden==['registro-especie','registro-meta','registro-lugar'] and pg.locator('#lista-registros .registro-lugar svg').count()>=1,
       'la tarjeta de Registros sigue la anatomía común: especie, cuándo, estado (folio y envío), dónde con su icono (D141): %s' % orden)
    # Jornadas: la tarjeta de una cerrada dice el estado de su reporte, con icono
    pg.evaluate("SRP.app.mostrarVista('jornadas')"); pg.wait_for_timeout(600); pg.evaluate("SRP.jornadas.aplicarAtajo('todas')"); pg.wait_for_timeout(500)
    ir=pg.evaluate("[...document.querySelectorAll('#lista-jornadas .jornada')].filter(l => l.querySelector('.jornada-estatus[data-estatus=cerrada]')).map(l => [l.querySelectorAll('.insignia-reporte svg').length, l.querySelector('.jornada-avance-cifra').textContent.trim()])")
    ok(ir and all(x[0]<=1 for x in ir) and any(x[0]==1 for x in ir),'la tarjeta de una jornada cerrada con árboles dice el estado de su reporte, con icono: %s' % ir[:3])
    # Cambiar de jornada: icono de intercambio, no el mapa
    pg.evaluate("SRP.app.mostrarVista('registrar')"); pg.wait_for_timeout(500)
    if pg.is_visible('#btn-jornada-cambiar'):
        ok(pg.inner_text('#btn-jornada-cambiar').strip()=='Cambiar jornada' and pg.get_attribute('#btn-jornada-cambiar','aria-label') is None
           and 'M6.99 11L3 15' in pg.inner_html('#btn-jornada-cambiar'),'«Cambiar jornada» lleva el icono de intercambio y su nombre es el que se lee')
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
    ok(th[0]=='ascending' and th[1]=='rgb(27, 95, 170)' and th[2]!=th[1],'la columna ordenada se distingue: fondo de acento, las demás no (D142): %s' % th)
    ok(re.search(r'^\d+ especies · \d+ inactivas?$', pg.inner_text('#cat-cuenta').strip()) is not None,'la cuenta dice cuántas hay y cuántas están inactivas: '+pg.inner_text('#cat-cuenta'))
    pg.evaluate("SRP.app.mostrarVista('usuarios')"); pg.wait_for_timeout(500)
    ok(re.search(r'usuarios · \d+ inactivos?$', pg.inner_text('#usr-cuenta').strip()) is not None,'y en Usuarios también: '+pg.inner_text('#usr-cuenta'))
    pg.set_viewport_size({'width':390,'height':844}); pg.wait_for_timeout(200)
    # Modo sol en etiquetas y cifras
    pg.evaluate("SRP.app.mostrarVista('jornadas')"); pg.wait_for_timeout(500); pg.evaluate("SRP.jornadas.aplicarAtajo('todas')"); pg.wait_for_timeout(400)
    pg.click('#btn-cuenta'); pg.click('#btn-contraste'); pg.wait_for_timeout(300)
    sol=pg.evaluate("(() => { const gi = getComputedStyle(document.querySelector('#lista-jornadas .jornada-estatus')); return [gi.borderTopWidth, gi.fontWeight]; })()")
    ok(sol==['2px','700'],'el modo sol también marca las etiquetas: borde de 2 px y negritas (D142): %s' % sol)
    if pg.is_hidden('#btn-contraste'): pg.click('#btn-cuenta')   # el menú sigue abierto tras el interruptor
    pg.click('#btn-contraste'); pg.wait_for_timeout(300); pg.keyboard.press('Escape')

    # ---------- BLOQUE 84: REGISTRAR JORNADA (D143) ----------
    pg.click('#btn-cuenta'); pg.click('#btn-cambiar-perfil'); pg.select_option('#sel-usuario-prueba','u-coord-1'); pg.click('#btn-entrar-prueba'); pg.wait_for_timeout(700)
    pg.evaluate("SRP.app.mostrarVista('registrar')"); pg.wait_for_timeout(500)
    if pg.is_hidden('#panel-iniciar-jornada'):
        pg.click('#btn-jornada-cambiar'); pg.wait_for_timeout(200); pg.click('#btn-cambiar-nueva'); pg.wait_for_timeout(300)
    panel=pg.inner_text('#panel-iniciar-jornada')
    ok(pg.inner_text('#titulo-iniciar-jornada')=='Registrar jornada' and 'Registre los datos de la jornada (proyecto) del día.' in panel and 'son obligatorios' not in panel and 'La gente trabaja' not in panel,
       'el panel se llama «Registrar jornada», con la introducción nueva y sin la línea de obligatorios (D143)')
    ok('Parque Los Pericos' in pg.inner_text('#ini-nombre-ayuda') and 'Calzada de Tlalpan' in pg.inner_text('#ini-nombre-ayuda') and pg.get_attribute('#ini-nombre','aria-describedby')=='ini-nombre-ayuda',
       'el nombre lleva su ayuda con ejemplos')
    ok(pg.inner_text('label[for=ini-ubicacion]')=='Dirección de la jornada' and pg.inner_text('label[for=ej-ubicacion]')=='Dirección de la jornada','«Ubicación de la jornada» pasa a «Dirección de la jornada», también al editarla')
    # Coordenadas a mano, como en «Registrar árbol»
    ok(pg.locator('#ini-detalles-coord').count()==1 and not pg.evaluate("document.getElementById('ini-detalles-coord').open"),'bajo «Detectar ubicación» está «Capturar coordenadas a mano», plegado')
    pg.click('#ini-detalles-coord summary'); pg.wait_for_timeout(150)
    pg.fill('#ini-coord-lat','hola'); pg.fill('#ini-coord-lng','-99.13'); pg.click('#btn-ini-coord-aplicar'); pg.wait_for_timeout(150)
    ok('Escriba la latitud y la longitud' in pg.inner_text('#ini-detectado') and pg.inner_text('#ini-alcaldia')=='—','sin números válidos lo dice y no coloca nada')
    pg.fill('#ini-coord-lat','20.6'); pg.fill('#ini-coord-lng','-100.4'); pg.click('#btn-ini-coord-aplicar'); pg.wait_for_timeout(150)
    ok('fuera de la Ciudad de México' in pg.inner_text('#ini-detectado') and pg.inner_text('#ini-alcaldia')=='—','fuera de la CDMX lo rechaza')
    pg.fill('#ini-coord-lat','19,4326'); pg.fill('#ini-coord-lng','-99.1332'); pg.click('#btn-ini-coord-aplicar'); pg.wait_for_timeout(200)
    ok(pg.inner_text('#ini-alcaldia')=='Cuauhtémoc' and 'a mano' in pg.inner_text('#ini-detectado') and 'Detectar de nuevo' in pg.inner_text('#btn-ini-detectar'),
       'con coordenadas válidas (también con coma decimal) deriva alcaldía y colonia como el GPS')
    pg.fill('#ini-nombre','Jornada sin señal'); pg.select_option('#ini-programa','p-refor'); pg.select_option('#ini-origen','PROGRAMADA'); pg.fill('#ini-meta','4'); pg.click('#btn-ini-hoy')
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
    uno=pg.evaluate("(() => { const r = { id: 'x1', lat: 19.43, lng: -99.13, punto_origen: 'gps', gps_precision_m: 5, especie_id: 'ESP-0002', programa_id: 'p-refor', cabo_id: SRP.sesion.usuario.id }; const m = SRP.reportes.modelo([r], { arboles_previstos: 1, nombre: 'Uno' }, SRP.util.fechaHoy(), null); return [m.cifras[0].texto, m.cifras[3].texto, m.cifras[2].valor]; })()")
    ok(uno==['árbol plantado','especie','100 %'],'en el reporte, «1 árbol plantado» y «1 especie», no «1 árboles»: %s' % uno)

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
    for v, h in (('jornadas','titulo-jornadas'),('registros','titulo-registros')):
        pg.evaluate("SRP.app.mostrarVista('%s')" % v); pg.wait_for_timeout(400)
        if v == 'jornadas' and pg.is_visible('#jornada-detalle'): pg.click('#btn-jornada-volver'); pg.wait_for_timeout(400)
        bordes[v]=pg.evaluate("Math.round(document.getElementById('%s').getBoundingClientRect().left)" % h)
    ok(len(set(bordes.values()))==1,'Jornadas y Registros arrancan en el mismo borde izquierdo (D145): %s' % bordes)
    # Listas en rejilla de dos columnas en computadora, una en teléfono
    pg.evaluate("SRP.app.mostrarVista('jornadas')"); pg.wait_for_timeout(300); pg.evaluate("SRP.jornadas.aplicarAtajo('todas')"); pg.wait_for_timeout(500)
    col=lambda sel: pg.evaluate("getComputedStyle(document.querySelector('%s')).gridTemplateColumns.split(' ').length" % sel)
    cj=col('#lista-jornadas'); ancho_lista=pg.evaluate("Math.round(document.getElementById('lista-jornadas').getBoundingClientRect().width)")
    pg.evaluate("SRP.app.mostrarVista('registros')"); pg.wait_for_timeout(400); cr=col('#lista-registros')
    ok((cj,cr)==(2,2) and ancho_lista > 1000,'en computadora jornadas y registros van en tarjetas de dos en dos, a todo lo ancho (D145): %s, %d px' % ((cj,cr),ancho_lista))
    pg.set_viewport_size({'width':390,'height':844}); pg.wait_for_timeout(300)
    ok(col('#lista-registros')==1,'en teléfono, una tarjeta por renglón')
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
    ok(pas['actual']=='rgb(27, 95, 170)' and pas['palomita'] and 'counter(paso)' in pas['numero'],
       'el actual va relleno en acento, los hechos con palomita y el que falta con su número (D146): %s, %s' % (pas['actual'], pas['numero']))
    ok(pas['tramos'][0]=='rgb(30, 122, 70)' and pas['tramos'][1]=='rgb(30, 122, 70)' and pas['tramos'][2]!='rgb(30, 122, 70)',
       'el tramo que sale de un paso hecho va en verde; después del actual, en gris (D146): %s' % pas['tramos'])
    ok(not any(c.isdigit() for c in pas['lector']) and 'Revisar (paso actual)' in pas['lector'],
       'el lector de pantalla oye los nombres y su estado, sin los números de los círculos: «%s»' % pas['lector'])

    # ---------- BLOQUE 88: «HOY» CON EL AÑO EN DOS CIFRAS (D147) ----------
    pg.set_viewport_size({'width':390,'height':844}); pg.wait_for_timeout(300)
    chips={}
    for v, c in (('registros','chip-hoy'),('jornadas','jornada-chip-hoy')):
        pg.evaluate("SRP.app.mostrarVista('%s')" % v); pg.wait_for_timeout(400)
        if v == 'jornadas' and pg.is_visible('#jornada-detalle'): pg.click('#btn-jornada-volver'); pg.wait_for_timeout(300)
        abrir_filtros(pg)
        chips[v]=pg.evaluate("""(() => { const s=document.querySelector('#%s .chip-sub'); const lh=parseFloat(getComputedStyle(s).lineHeight) || 16;
            return [s.textContent, s.getBoundingClientRect().height <= lh * 1.5]; })()""" % c)
    ok(all(t==HOY_CHIP and un for t, un in chips.values()),'en Registros y Jornadas «Hoy» dice %s en un solo renglón, sin partir el año (D147): %s' % (HOY_CHIP, chips))
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
    # Almacenamiento protegido: se pide al guardar un árbol
    pg.evaluate("() => { window.__persist = 0; navigator.storage.persist = async () => { window.__persist++; return true; }; navigator.storage.persisted = async () => window.__persist > 0; }")
    registrar(pg,'aile','ESP-0002')
    ok(pg.evaluate("window.__persist")>=1,'al guardar un árbol se pide al navegador que no borre lo guardado (storage.persist, D149)')
    pg.click('#conexion'); pg.wait_for_timeout(400)
    est=pg.inner_text('#dlg-senal'); guia=est
    ok('Protegido' not in est and 'Abre sin señal' not in est and 'Espacio usado' not in est and 'respaldo' not in guia.lower() and 'No borre los datos del navegador' in guia,
       'la guía «¿Qué hacer sin internet?» ya no enseña protección, espacio ni si abre sin señal, ni habla de respaldos')
    pg.click('#btn-senal-cerrar'); pg.wait_for_timeout(200)
    # Al cerrar la jornada ya no se recuerda ningún respaldo (D175)
    pg.evaluate("SRP.app.mostrarVista('registrar')"); pg.wait_for_timeout(300)
    pg.click('#btn-jornada-cerrar'); pg.wait_for_timeout(400)
    nota=pg.inner_text('#dlg-confirmar-nota')
    ok('respaldo' not in nota.lower() and 'reabrir' in nota,'al cerrar la jornada, la confirmación ya no pide guardar un respaldo: '+nota)
    pg.click('#btn-confirmar-no'); pg.wait_for_timeout(200)
    # Espacio lleno: las acciones que escriben lo dicen con palabras
    pg.evaluate("() => { window.__guardar = SRP.almacen.guardarConBitacora; SRP.almacen.guardarConBitacora = () => Promise.reject(new DOMException('lleno', 'QuotaExceededError')); }")
    # (con la cuenta de coordinación: una acción que le está permitida, D151)
    pg.evaluate("() => { SRP.activa.cambiarEstatus(SRP.activa.jornada, SRP.activa.jornada.estatus).catch(() => {}); }"); pg.wait_for_timeout(300)
    ok('No se pudo cambiar el estado de la jornada: el teléfono se quedó sin espacio' in pg.inner_text('#aviso'),'una acción que falla por espacio lo dice: '+pg.inner_text('#aviso'))
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
        ['activa','iniciarJornada'],['activa','cambiarEstatus'],['jornadas','mover'],['jornadas','guardarEnJornada'],['jornadas','guardarEdicion'],['jornadas','eliminarJornada'],
        ['jornadas','marcarRevisado'],['registros','eliminar'],['registros','restaurar'],['reportes','aceptar'],['folio','emitirPendientes']]
        .filter(([m, f]) => !(SRP[m][f] && SRP[m][f].protegido)).map(x => x.join('.'))""")
    ok(prot==[],'las 17 acciones que escriben en el teléfono avisan si fallan: sin protección %s' % prot)
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

    # ---------- BLOQUE 90: SEGURIDAD (D150) ----------
    csp=pg.evaluate("(document.querySelector('meta[http-equiv=\"Content-Security-Policy\"]') || {}).content || ''")
    ok("script-src 'self'" in csp and 'unsafe-inline' not in csp and "object-src 'none'" in csp and pg.evaluate("(document.querySelector('meta[name=referrer]') || {}).content")=='no-referrer',
       'la página declara su política de seguridad: sólo código propio, sin scripts en línea, y no dice desde dónde pide el mapa (D150)')
    # Defensa en profundidad: aunque un registro con id y foto maliciosos llegara a la base (p. ej. por sincronización en Fase 2), no se ejecuta
    base_p, base_j = pg.evaluate("async () => { const p = (await SRP.almacen.todos('plantaciones')).find(x => x.estatus === 'activo' && x.especie_id); return [p, await SRP.almacen.uno('jornadas', p.jornada_id)]; }")
    ctx10=b.new_context(viewport={'width':390,'height':844}); pg10=ctx10.new_page(); err10=[]
    pg10.on('pageerror', lambda e: err10.append(str(e))); pg10.on('console', lambda m: m.type=='error' and 'net::' not in m.text and 'Failed to load' not in m.text and err10.append(m.text))
    pg10.goto(BASE); pg10.wait_for_timeout(1200)
    pg10.select_option('#sel-usuario-prueba','u-cabo-1'); pg10.click('#btn-entrar-prueba'); pg10.wait_for_timeout(600)
    pg10.evaluate("""async ([p, j]) => { j = Object.assign({}, j, { id: 'jr-b90', cabo_id: 'u-cabo-1', encargado_id: null, puntos_revisados: [] });
        p = Object.assign({}, p, { id: 'x"><img src=x onerror=window.__xss=3>', cabo_id: 'u-cabo-1', jornada_id: 'jr-b90', editado_por_id: null,
          foto_base64: 'data:image/jpeg;base64,AAAA" onerror="window.__xss=4', foto_id: 'f1' });
        const tx = SRP.almacen.db.transaction(['plantaciones', 'jornadas'], 'readwrite'); tx.objectStore('jornadas').put(j); tx.objectStore('plantaciones').put(p);
        await new Promise(r => tx.oncomplete = r); }""", [base_p, base_j])
    pg10.evaluate("SRP.app.mostrarVista('registros')"); pg10.wait_for_timeout(700)
    dx=pg10.evaluate("""() => ({ xss: window.__xss === undefined ? null : window.__xss, ids: [...document.querySelectorAll('#lista-registros .registro')].map(li => li.dataset.id),
        imgs: document.querySelectorAll('#lista-registros img[onerror]').length })""")
    ok(dx['xss'] is None and 'x"><img src=x onerror=window.__xss=3>' in dx['ids'] and dx['imgs']==0,'un id o una foto con código ya guardados se pintan como texto: el id queda entero en su atributo y la foto no se usa (D150): %s' % dx)
    ok(not [e for e in err10 if 'Content Security Policy' in e or 'Refused' in e],'y la política de seguridad no tuvo nada que bloquear: el escapado ya lo resolvió')
    ctx10.close()
    # Modo de prueba apagado: el acceso simulado no abre con cualquier contraseña
    fuera=pg.evaluate("() => { SRP.CONFIG.ES_FICTICIO = false; const r = SRP.sesion.autenticar('cabo@ejemplo.local'); SRP.CONFIG.ES_FICTICIO = true; return r; }")
    ok(fuera['ok'] is False and 'acceso institucional todavía no está conectado' in fuera['motivo'],'con ES_FICTICIO apagado y el proveedor aún simulado, el acceso queda cerrado (D150): '+fuera['motivo'])

    # ---------- BLOQUE 91: INTEGRIDAD (D151) ----------
    # Revisión de integridad sobre lo capturado en toda la prueba, no sobre la base recién sembrada:
    # toda referencia existe, cada árbol tiene la fecha y el programa de su jornada y cada marca de
    # revisado es de un árbol de esa jornada
    INTEGRIDAD="""async () => {
      const T = {}; for (const t of SRP.almacen.ALMACENES.filter(x => x !== 'bitacora')) T[t] = await SRP.almacen.todos(t);
      const existentes = Object.fromEntries(Object.entries(T).map(([t, f]) => [t, new Set(f.map(x => x.id))]));
      const fallas = [];
      for (const [t, filas] of Object.entries(T)) for (const f of filas) {
        const rotas = SRP.ESQUEMA.tablas[t].filter(([c, , , , ref]) => ref && f[c] != null && !Array.isArray(f[c]) && !(existentes[ref] && existentes[ref].has(f[c]))).map(x => x[0]);
        if (rotas.length) fallas.push(t + ':' + f.id + ':' + rotas.join(','));
      }
      const jor = Object.fromEntries(T.jornadas.map(j => [j.id, j]));
      for (const r of T.plantaciones) { const j = jor[r.jornada_id]; if (j && (r.programa_id !== j.programa_id || r.fecha_plantacion !== j.fecha)) fallas.push('hereda:' + r.id); }
      for (const j of T.jornadas) for (const id of (j.puntos_revisados || [])) { const r = T.plantaciones.find(x => x.id === id); if (!r || r.jornada_id !== j.id) fallas.push('revisado:' + j.nombre + ':' + id); }
      return { fallas, arboles: T.plantaciones.length, jornadas: T.jornadas.length };
    }"""
    integ=pg.evaluate(INTEGRIDAD)
    ok(not integ['fallas'],'lo capturado en toda la prueba está íntegro: referencias, fecha y programa de la jornada, marcas de revisado (D151): %s' % integ)

    ctx11=b.new_context(viewport={'width':390,'height':844},geolocation={'latitude':19.432,'longitude':-99.133},permissions=['geolocation'])
    pg11=ctx11.new_page(); err11=[]
    pg11.on('pageerror', lambda e: err11.append(str(e))); pg11.on('console', lambda m: m.type=='error' and 'net::' not in m.text and 'Failed to load' not in m.text and err11.append(m.text))
    pg11.goto(BASE); pg11.wait_for_timeout(1200)
    def entrar11(uid):
        if not pg11.is_visible('#sel-usuario-prueba'):
            pg11.click('#btn-cuenta'); pg11.click('#btn-cambiar-perfil'); pg11.wait_for_timeout(200)
        pg11.select_option('#sel-usuario-prueba', uid); pg11.click('#btn-entrar-prueba'); pg11.wait_for_timeout(700)
    def uno11(tabla, i): return pg11.evaluate("async () => await SRP.almacen.uno('%s', '%s')" % (tabla, i))
    def aviso11(): return pg11.inner_text('#aviso')
    entrar11('u-cabo-1')
    AYER=(datetime.date.fromisoformat(HOY)-datetime.timedelta(days=1)).isoformat()
    jA=iniciar_jornada(pg11,'Jornada B91 A',HOY)
    a1=registrar(pg11,'aile','ESP-0002'); a2=registrar(pg11,'aile','ESP-0002'); a3=registrar(pg11,'aile','ESP-0002')
    jB=iniciar_jornada(pg11,'Jornada B91 B',AYER)
    jC=iniciar_jornada(pg11,'Jornada B91 C',HOY); c1=registrar(pg11,'aile','ESP-0002')
    jD=iniciar_jornada(pg11,'Jornada B91 D',HOY)
    jE=iniciar_jornada(pg11,'Jornada B91 E',HOY)
    a3_viejo=uno11('plantaciones',a3)
    pg11.evaluate("async () => { for (const id of ['%s', '%s']) await SRP.registros.eliminar(await SRP.almacen.uno('plantaciones', id)); }" % (a3, c1)); pg11.wait_for_timeout(300)
    pg11.evaluate("SRP.util.anunciar('3 registros enviados al servidor (simulado). Recepción confirmada.', undefined, { secundario: true })")
    ok('eliminado' in aviso11() and pg11.locator('#aviso .aviso-accion').count()==1,'el aviso de un envío automático no tapa el «Deshacer» de lo que se acaba de eliminar (D151)')
    pg11.evaluate("async () => { const j = await SRP.almacen.uno('jornadas', '%s'); j.puntos_revisados = ['%s']; await SRP.almacen.guardarConBitacora('jornadas', j, null); }" % (jA, a1))
    # D2: cambiar el programa y la fecha de la jornada los cambia en todos sus árboles, también el eliminado
    pg11.evaluate("SRP.app.mostrarVista('jornadas')"); pg11.wait_for_timeout(500)
    pg11.evaluate("SRP.jornadas.aplicarAtajo('todas')"); pg11.wait_for_timeout(300); pg11.evaluate("SRP.jornadas.abrir('%s')" % jA); pg11.wait_for_timeout(600)
    pg11.click('#btn-jornada-editar'); pg11.wait_for_timeout(300)
    pg11.select_option('#ej-programa','p-centro'); pg11.wait_for_timeout(100)
    ok(pg11.is_visible('#ej-nota-programa'),'al cambiar el programa de la jornada avisa que sus árboles lo toman (D151)')
    pg11.fill('#ej-fecha',AYER); pg11.dispatch_event('#ej-fecha','change'); pg11.click('#btn-ej-guardar'); pg11.wait_for_timeout(900)
    prop=pg11.evaluate("""async () => (await SRP.almacen.todos('plantaciones')).filter(r => r.jornada_id === '%s').map(r => [r.id, r.estatus, r.programa_id, r.fecha_plantacion])""" % jA)
    ok(len(prop)==3 and all(x[2]=='p-centro' and x[3]==AYER for x in prop) and any(x[1]=='eliminado' for x in prop),
       'cambiar programa y fecha de la jornada los cambia en todos sus árboles, también en el eliminado (D151, decisión D2): %s' % prop)
    hist=pg11.evaluate("async () => (await SRP.bitacora.deEntidad('%s')).map(h => h.detalle || '')" % a3)
    ok(any('Por cambio de la jornada' in h and 'Centro Histórico' in h for h in hist),'y queda en el historial de cada árbol')
    # Restaurar vuelve con los datos de su jornada, no con la copia de cuando se eliminó
    pg11.evaluate("async (r) => { await SRP.registros.restaurar(r); }", a3_viejo); pg11.wait_for_timeout(300)
    r3=uno11('plantaciones',a3)
    ok(r3['estatus']=='activo' and r3['programa_id']=='p-centro' and r3['fecha_plantacion']==AYER,'un árbol restaurado vuelve con la fecha y el programa actuales de su jornada (M8): %s' % [r3['programa_id'], r3['fecha_plantacion']])
    # Mover: toma fecha y programa de la jornada nueva y su marca de revisado sale de la de origen
    pg11.evaluate("async () => { await SRP.jornadas.mover(await SRP.almacen.uno('plantaciones', '%s'), await SRP.almacen.uno('jornadas', '%s')); }" % (a1, jB)); pg11.wait_for_timeout(400)
    r1=uno11('plantaciones',a1); jA_d=uno11('jornadas',jA)
    ok(r1['jornada_id']==jB and r1['programa_id']=='p-refor' and r1['fecha_plantacion']==AYER and a1 not in jA_d['puntos_revisados'] and 'toma su fecha y su programa' in aviso11(),
       'mover un árbol le da la fecha y el programa de su jornada nueva y quita su marca de revisado de la de origen (M8): %s' % aviso11())
    pg11.evaluate("async () => { await SRP.jornadas.mover(await SRP.almacen.uno('plantaciones', '%s'), { id: 'jr-ajena', cabo_id: 'u-coord-1', nombre: 'Ajena', fecha: '%s', programa_id: 'p-refor' }); }" % (a2, HOY)); pg11.wait_for_timeout(200)
    ok(uno11('plantaciones',a2)['jornada_id']==jA and 'mismo cabo' in aviso11(),'y no se mueve a la jornada de otro cabo')
    # Una jornada con un árbol eliminado no se elimina: el árbol sigue apuntando a ella (A5)
    pg11.evaluate("SRP.jornadas.abrir('%s')" % jC); pg11.wait_for_timeout(600)
    ok(pg11.locator('#jornada-lista .punto-jornada').count()==0 and pg11.is_hidden('#btn-jornada-eliminar'),'una jornada sin árboles a la vista pero con uno eliminado no ofrece «Eliminar jornada» (A5)')
    pg11.evaluate("SRP.jornadas.eliminarJornada()"); pg11.wait_for_timeout(300)
    ok(uno11('jornadas',jC) is not None and 'guarda 1 árbol eliminado' in aviso11() and pg11.is_hidden('#dlg-confirmar'),'y aunque se llame a la función, no se borra y dice por qué: '+aviso11())
    # Los permisos se exigen en la función, no sólo en el botón (M9)
    pg11.evaluate("async () => { await SRP.catalogos.cambiarEstado(SRP.ref.catalogoPorId['p-centro']); }"); pg11.wait_for_timeout(200)
    ok(uno11('programas','p-centro')['activo'] is True and 'No tiene permiso para administrar los catálogos' in aviso11(),'un cabo no desactiva un programa llamando la función (M9): '+aviso11())
    pg11.evaluate("async () => { await SRP.usuarios.cambiarEstado(SRP.ref.usuarioPorId['u-admin-1']); }"); pg11.wait_for_timeout(200)
    ok(uno11('usuarios','u-admin-1')['activo'] is True and 'No tiene permiso para administrar las cuentas' in aviso11(),'ni la cuenta de administración')
    entrar11('u-coord-1')
    # La coordinación elimina lo de su cuadrilla (D155), pero no lo de un cabo ajeno aunque llame a la función
    pg11.evaluate("async () => { await SRP.registros.eliminar({ id: 'pl-ajeno', cabo_id: 'u-fuera', especie_id: 'ESP-0002', fecha_plantacion: '2026-09-01' }); }"); pg11.wait_for_timeout(200)
    ok(uno11('plantaciones','pl-ajeno') is None and 'No tiene permiso para eliminar este registro' in aviso11(),'un coordinador no elimina un registro fuera de su cuadrilla llamando la función (M9): '+aviso11())
    # D1: la coordinación elimina las jornadas vacías de su cuadrilla
    pg11.evaluate("SRP.app.mostrarVista('jornadas')"); pg11.wait_for_timeout(500)
    pg11.evaluate("SRP.jornadas.aplicarAtajo('todas')"); pg11.wait_for_timeout(300); pg11.evaluate("SRP.jornadas.abrir('%s')" % jD); pg11.wait_for_timeout(600)
    ok(pg11.is_visible('#btn-jornada-eliminar'),'la coordinación ve «Eliminar jornada» en una jornada vacía de su cuadrilla (D151, decisión D1)')
    pg11.click('#btn-jornada-eliminar'); pg11.wait_for_timeout(300); pg11.click('#btn-confirmar-si'); pg11.wait_for_timeout(600)
    ok(uno11('jornadas',jD) is None,'y la elimina')
    # A5: el uso se cuenta en todas las tablas
    entrar11('u-admin-1')
    pg11.evaluate("SRP.app.mostrarVista('catalogos')"); pg11.wait_for_timeout(500)
    pg11.click('#btn-cat-agregar'); pg11.wait_for_timeout(300); pg11.fill('#cat-nombre','Programa B91'); pg11.click('#form-catalogo button[type=submit]'); pg11.wait_for_timeout(500)
    pid=pg11.evaluate("SRP.ref.deTipo('programa').find(c => c.nombre === 'Programa B91').id")
    pg11.evaluate("async () => { const j = await SRP.almacen.uno('jornadas', '%s'); j.programa_id = '%s'; await SRP.almacen.guardarConBitacora('jornadas', j, null); await SRP.catalogos.preparar(); }" % (jE, pid)); pg11.wait_for_timeout(300)
    fila=pg11.locator('#tabla-catalogo tbody tr', has_text='Programa B91')
    ok('1 jornada' in fila.inner_text() and fila.locator('button[data-accion=eliminar]').count()==0,'un programa que sólo usa una jornada dice «1 jornada» y no ofrece Eliminar (A5): '+fila.inner_text().replace('\n',' | '))
    ok('2 árboles y 1 jornada' in pg11.locator('#tabla-catalogo tbody tr', has_text='Centro Histórico').inner_text(),'el uso cuenta árboles y jornadas: «2 árboles y 1 jornada»')
    pg11.evaluate("async () => { await SRP.catalogos.eliminar(SRP.ref.catalogoPorId['%s']); }" % pid); pg11.wait_for_timeout(300)
    ok(uno11('programas',pid) is not None and 'aparece en 1 jornada' in aviso11(),'y aunque se llame a la función, no se borra: '+aviso11())
    pg11.evaluate("SRP.app.mostrarVista('usuarios')"); pg11.wait_for_timeout(500)
    ok(pg11.locator('#tabla-usuarios tbody tr', has_text='Perengano').locator('button[data-accion=eliminar]').count()==0,'un coordinador con cabos asignados no ofrece Eliminar (A5)')
    ok('coordina a 1 cabo' in pg11.locator('#tabla-usuarios tbody tr', has_text='coordinador@').inner_text() and 'coordinador: Perengano' in pg11.locator('#tabla-usuarios tbody tr', has_text='Fulana').inner_text(),
       'la tarjeta del coordinador dice cuántos cabos coordina, y la del cabo quién es su coordinador (antes decía que el cabo «coordina» a su coordinador)')
    pg11.evaluate("async () => { await SRP.usuarios.eliminar(SRP.ref.usuarioPorId['u-coord-1']); }"); pg11.wait_for_timeout(300)
    ok(uno11('usuarios','u-coord-1') is not None and 'coordina a 1 cabo' in aviso11(),'y la función tampoco lo borra: '+aviso11())
    integ11=pg11.evaluate(INTEGRIDAD)
    ok(not integ11['fallas'],'tras mover, restaurar, cambiar la jornada y los intentos de borrar, todo sigue íntegro: %s' % integ11)
    ok(not err11,'y sin errores en consola: %s' % err11[:2])
    ctx11.close()

    # ---------- BLOQUE 92: TERRITORIO CONFIABLE (D152) ----------
    ctx12=b.new_context(viewport={'width':390,'height':844},geolocation={'latitude':19.4326,'longitude':-99.1332,'accuracy':60},permissions=['geolocation'])
    pg12=ctx12.new_page(); err12=[]
    pg12.on('pageerror', lambda e: err12.append(str(e))); pg12.on('console', lambda m: m.type=='error' and 'net::' not in m.text and 'Failed to load' not in m.text and err12.append(m.text))
    pg12.goto(BASE); pg12.wait_for_timeout(1200)
    pg12.select_option('#sel-usuario-prueba','u-cabo-1'); pg12.click('#btn-entrar-prueba'); pg12.wait_for_timeout(700)
    # A6: el ámbito es la unión de las alcaldías con 100 m de margen, no la caja
    amb=pg12.evaluate("""() => { const d = SRP.derivacion; const a = (la, lo) => d.dentroDelAmbito(la, lo);
      const borde = d.derivar(19.095827, -99.22707);
      return { neza: a(19.40, -99.015), huixquilucan: a(19.37, -99.30), naucalpan: a(19.478, -99.239), ecatepec: a(19.585, -99.060),
        zocalo: a(19.4326, -99.1332), margen: a(19.095827, -99.22707), lejos: a(19.094328, -99.228309), borde: [borde.alcaldia, borde.fuera_m],
        colocar: SRP.mapa.colocar(19.40, -99.015, 'x', { origen: 'manual' }), estado: document.getElementById('mapa-estado').textContent,
        completas: d.capasCompletas(), colonia: SRP.ref.colonia(d.derivar(19.502765, -99.157045).colonia), alcaldia: SRP.ref.alcaldia(null) }; }""")
    ok(not amb['neza'] and not amb['huixquilucan'] and not amb['naucalpan'] and not amb['ecatepec'] and amb['zocalo'],
       'Nezahualcóyotl, Huixquilucan, Naucalpan y Ecatepec ya no se aceptan; el Zócalo sí (A6): %s' % {k: amb[k] for k in ('neza','huixquilucan','naucalpan','ecatepec','zocalo')})
    ok(amb['margen'] and not amb['lejos'] and amb['borde'][0]=='Tlalpan' and 30 <= amb['borde'][1] <= 45,
       'a 39 m fuera del límite se acepta con la alcaldía más cercana; a 250 m ya no (A6): %s' % amb['borde'])
    ok(amb['colocar'] is False and 'fuera de la Ciudad de México' in amb['estado'],'colocar un punto en Nezahualcóyotl lo rechaza y lo dice')
    ok(amb['colonia']=='Sin colonia en la capa' and amb['alcaldia']=='Sin alcaldía (territorio pendiente)','los rótulos ya no afirman «fuera de zona urbana» ni «hueco entre polígonos» (M5)')
    ok(amb['completas'],'las tres capas y la biblioteca del cruce están cargadas (A7)')
    # Jornada y árbol junto al límite: el aviso va en su renglón, sin tapar la precisión (A6, B8)
    pg12.evaluate("SRP.app.mostrarVista('registrar')"); pg12.wait_for_timeout(300)
    pg12.click('#btn-ini-hoy'); pg12.fill('#ini-nombre','Jornada B92'); pg12.select_option('#ini-programa','p-refor'); pg12.select_option('#ini-origen','PROGRAMADA'); pg12.fill('#ini-meta','5')
    pg12.click('#ini-detalles-coord summary'); pg12.fill('#ini-coord-lat','19.095827'); pg12.fill('#ini-coord-lng','-99.22707'); pg12.click('#btn-ini-coord-aplicar'); pg12.wait_for_timeout(200)
    ok('fuera del límite' in pg12.inner_text('#ini-detectado') and pg12.inner_text('#ini-alcaldia')=='Tlalpan','la jornada junto al límite toma la alcaldía más cercana y lo dice')
    pg12.click('#btn-iniciar-jornada'); pg12.wait_for_timeout(600)
    # M6: el GPS se sigue escuchando y se queda con la mejor lectura
    pg12.click('#btn-ubicacion'); pg12.wait_for_timeout(700)
    g1=pg12.evaluate("[SRP.mapa.precision, SRP.mapa.vigilancia != null, document.getElementById('mapa-estado').textContent]")
    ok(g1[0]==60 and g1[1] and 'Afinando' in g1[2],'con ±60 m el punto aparece y el GPS se sigue escuchando unos segundos (M6): %s' % g1[2])
    ctx12.set_geolocation({'latitude':19.4330,'longitude':-99.1336,'accuracy':8}); pg12.wait_for_timeout(800)
    g2=pg12.evaluate("[SRP.mapa.lat, SRP.mapa.precision, SRP.mapa.vigilancia != null]")
    ok(g2==[19.433,8,False],'una lectura mejor mueve el punto y, al llegar a precisión buena, deja de escuchar: %s' % g2)
    ctx12.set_geolocation({'latitude':19.4340,'longitude':-99.1346,'accuracy':3}); pg12.wait_for_timeout(600)
    ok(pg12.evaluate("SRP.mapa.lat")==19.433,'y una lectura posterior ya no lo mueve')
    ok(pg12.inner_text('#dato-coordenadas')=='19.43300, -99.13360','la coordenada se lee con cinco decimales (~1 m) (M6): '+pg12.inner_text('#dato-coordenadas'))
    ctx12.set_geolocation({'latitude':19.4326,'longitude':-99.1332,'accuracy':60})
    pg12.click('#btn-ubicacion'); pg12.wait_for_timeout(600)
    pg12.evaluate("SRP.mapa.colocar(19.4328, -99.1334, 'Punto colocado en el mapa.', { origen: 'mapa' })")
    ctx12.set_geolocation({'latitude':19.4330,'longitude':-99.1336,'accuracy':5}); pg12.wait_for_timeout(800)
    ok(pg12.evaluate("[SRP.mapa.lat, SRP.mapa.origen, SRP.mapa.vigilancia]")==[19.4328,'mapa',None],'si la persona coloca el punto a mano, el GPS ya no lo mueve (M6)')
    # M6: tocar el mapa lejos acerca primero; con acercamiento suficiente coloca
    toque=pg12.evaluate("""() => { SRP.mapa.limpiar(); SRP.mapa.mapa.setZoom(12, { animate: false });
      SRP.mapa.alTocar({ lat: 19.4331, lng: -99.1337 }); const primero = [SRP.mapa.lat, SRP.mapa.mapa.getZoom(), document.getElementById('mapa-estado').textContent];
      SRP.mapa.alTocar({ lat: 19.4331, lng: -99.1337 }); return [primero, SRP.mapa.lat, SRP.mapa.origen]; }""")
    ok(toque[0][0] is None and toque[0][1]==17 and 'toque otra vez' in toque[0][2] and toque[1]==19.4331 and toque[2]=='mapa',
       'a zoom 12 el primer toque acerca el mapa y el segundo coloca el punto (M6): %s' % toque)
    # B8: el aviso de imagen caída ya no tapa la insignia de precisión
    pg12.evaluate("SRP.mapa.colocar(19.4326, -99.1332, 'x', { origen: 'gps', precision: 40 }); SRP.mapa.aviso('imagen', 'La imagen del mapa no cargó. Puede acercar el mapa y tocar donde está el árbol, o capturar coordenadas a mano.')")
    ok(pg12.locator('#mapa-estado .precision').count()==1 and pg12.is_visible('#mapa-aviso') and 'no cargó' in pg12.inner_text('#mapa-aviso'),'el aviso de la imagen y la precisión conviven, cada uno en su renglón (B8)')
    pg12.evaluate("SRP.mapa.aviso('imagen', null)")
    pg12.evaluate("SRP.mapa.colocar(19.095827, -99.22707, 'Punto capturado a mano.', { origen: 'manual' })"); pg12.wait_for_timeout(200)
    ok('fuera del límite' in pg12.inner_text('#mapa-aviso') and 'Tlalpan' in pg12.inner_text('#mapa-aviso') and pg12.inner_text('#dato-alcaldia')=='Tlalpan','un árbol junto al límite dice que toma la alcaldía más cercana')
    pg12.evaluate("SRP.mapa.colocar(19.4326, -99.1332, 'x', { origen: 'gps', precision: 6 })"); pg12.wait_for_timeout(150)
    ok('fuera del límite' not in pg12.inner_text('#mapa-aviso'),'y el aviso se va cuando el punto vuelve a la ciudad (el de la imagen, si la hay, se queda)')
    # M3: créditos completos en todos los mapas
    cred=pg12.inner_text('#mapa .leaflet-control-attribution')
    ok('Powered by Esri' in cred and 'Vantor' in cred and 'OpenStreetMap' in cred and 'Maxar' not in cred,'el mapa de captura acredita a Esri («Powered by Esri»), Vantor y OpenStreetMap (M3): '+cred)
    # Se guarda un árbol y se revisa su detalle: celda, capas y cinco decimales
    pg12.fill('#campo-especie','aile'); pg12.wait_for_timeout(200); pg12.dispatch_event('.combo-opcion[data-id="ESP-0002"]','mousedown'); pg12.wait_for_timeout(150)
    pg12.click('#form-plantacion button[type=submit]'); pg12.wait_for_timeout(900)
    if pg12.is_visible('#dlg-resumen'):
        ok('Powered by Esri' in pg12.inner_text('#revision-mapa .leaflet-control-attribution'),'la ficha de revisión también muestra el crédito (M3)')
        pg12.click('#btn-resumen-guardar'); pg12.wait_for_timeout(700)
    rid12=pg12.evaluate("SRP.formulario.estado.ultimoGuardado")
    r12=pg12.evaluate("async () => await SRP.almacen.uno('plantaciones', '%s')" % rid12)
    ok(r12['uga'] and isinstance(r12['uga_borde_m'], int) and r12['uga_borde_m'] >= 0,'el registro guarda a cuántos metros del borde de su celda cayó (M6): %s m' % r12['uga_borde_m'])
    pg12.evaluate("SRP.app.mostrarVista('registros')"); pg12.wait_for_timeout(600)
    pg12.evaluate("async () => SRP.registros.verDetalle(await SRP.almacen.uno('plantaciones', '%s'))" % rid12); pg12.wait_for_timeout(600)
    det=pg12.inner_text('#dlg-detalle-cuerpo')
    ok('Capas' in det and 'Alcaldías sia-2026-01-01 · UGA sia-2026-09-22 · Colonias iecm-2022' in det and 'capa de prueba' not in det and 'Celda UGA' in det and 'del borde de la celda' in det,
       'el detalle dice la celda, a cuánto del borde quedó y con qué capas se derivó (M5)')
    ok('Powered by Esri' in pg12.inner_text('#detalle-mapa .leaflet-control-attribution'),'y su mapa lleva el crédito (M3)')
    pg12.click('#btn-detalle-cerrar'); pg12.wait_for_timeout(200)
    # Celda incierta (M6) y folio sólo con territorio (A6, A7)
    fol=pg12.evaluate("""async () => { const f = SRP.folio;
      const incierta = f.celdaIncierta({ uga_borde_m: 4, punto_origen: 'gps', gps_precision_m: 12 });
      const segura = f.celdaIncierta({ uga_borde_m: 40, punto_origen: 'gps', gps_precision_m: 12 });
      const base = await SRP.almacen.uno('plantaciones', '%s');
      const sinAlc = Object.assign({}, base, { id: 'pl-b92-sin', alcaldia: null, alcaldia_cve: null, folio: null });
      const sinCapa = Object.assign({}, base, { id: 'pl-b92-capa', capa_version: 'alcaldias=sia-2026-01-01', uga: null, folio: null });
      for (const r of [sinAlc, sinCapa]) await SRP.almacen.guardarConBitacora('plantaciones', r, null);
      await f.emitirPendientes();
      const a = await SRP.almacen.uno('plantaciones', 'pl-b92-sin'), c = await SRP.almacen.uno('plantaciones', 'pl-b92-capa');
      const ext = (await SRP.almacen.todos('plantaciones')).filter(r => String(r.folio || '').startsWith('EXT-000')).length;
      for (const id of ['pl-b92-sin', 'pl-b92-capa']) { const tx = SRP.almacen.db.transaction('plantaciones', 'readwrite'); tx.objectStore('plantaciones').delete(id); await new Promise(r => tx.oncomplete = r); }
      return { incierta, segura, sinAlc: a.folio, sinCapa: c.folio, previsto: await f.previsto(sinAlc), ext, conFolio: f.valido((await SRP.almacen.uno('plantaciones', base.id)).folio) }; }""" % rid12)
    ok('Celda incierta' in fol['incierta'] and fol['segura']=='','si el punto está más cerca del borde de su celda que la precisión del GPS, se marca «celda incierta» (M6)')
    ok(fol['sinAlc'] is None and fol['sinCapa'] is None and fol['previsto'] is None and fol['ext']==0 and fol['conFolio'],
       'sin alcaldía o con capas incompletas no se emite folio, y nunca EXT-000 por una capa ausente; el registro completo sí lo tiene (A6, A7): %s' % fol)
    # M5: si al editar cambia el territorio, queda en el historial
    pg12.evaluate("async () => SRP.formulario.editar(await SRP.almacen.uno('plantaciones', '%s'))" % rid12); pg12.wait_for_timeout(700)
    pg12.evaluate("SRP.mapa.colocar(19.3600, -99.1600, 'Punto capturado a mano.', { origen: 'manual' })"); pg12.wait_for_timeout(200)
    pg12.click('#form-plantacion button[type=submit]'); pg12.wait_for_timeout(900)
    if pg12.is_visible('#dlg-resumen'): pg12.click('#btn-resumen-guardar'); pg12.wait_for_timeout(700)
    hist12=pg12.evaluate("async () => (await SRP.bitacora.deEntidad('%s')).map(h => h.detalle || '').join(' | ')" % rid12)
    ok('Territorio rederivado' in hist12 and 'alcaldia' in hist12,'al editar, si el territorio cambia, el historial lo registra (M5): '+hist12[-160:])
    ok(pg12.evaluate("SRP.CONFIG.JORNADA.DUPLICADO_M")==4,'el aviso de posible duplicado usa 4 m (Liber, D203): por debajo del ruido del GPS no significa nada (M6)')
    ok(not err12,'y sin errores en consola: %s' % err12[:2])
    ctx12.close()
    # A7: sin la capa de colonias la aplicación no abre, y no sugiere borrar los datos
    ctx13=b.new_context(viewport={'width':390,'height':844}); pg13=ctx13.new_page()
    pg13.route('**/capa-colonias.js*', lambda r: r.abort())
    pg13.goto(BASE); pg13.wait_for_timeout(1500)
    txt13=pg13.inner_text('body')
    ok('No se cargaron las capas del territorio' in txt13 and 'borre los datos' not in txt13 and 'antes de borrar nada' in txt13 and pg13.locator('#form-acceso').count()==0,
       'sin una capa la aplicación no abre, lo dice y no sugiere borrar los datos del sitio, donde viven los árboles (A7): '+txt13[:120])
    ctx13.close()

    # ---------- BLOQUE 94: ORDEN DEL CÓDIGO Y LOS TEXTOS (D153) ----------
    # M11: la app abre y funciona sin el espejo de campos, retirado como dicen sus instrucciones
    import re as _re
    ctx14=b.new_context(viewport={'width':390,'height':844},geolocation={'latitude':19.4326,'longitude':-99.1332},permissions=['geolocation'])
    pg14=ctx14.new_page(); err14=[]
    pg14.on('pageerror', lambda e: err14.append(str(e))); pg14.on('console', lambda m: m.type=='error' and 'net::' not in m.text and 'Failed to load' not in m.text and err14.append(m.text))
    def sin_espejo(route):
        r = route.fetch(); html = r.text()
        html = _re.sub(r'<section id="espejo-campos".*?</section>', '', html, flags=_re.S)
        html = _re.sub(r'<details id="espejo-cierre".*?</details>', '', html, flags=_re.S)
        html = _re.sub(r'<script src="js/espejo\.js[^"]*"></script>', '', html)
        route.fulfill(response=r, body=html)
    pg14.route(_re.compile(r'.*/(index\.html)?(\?.*)?$'), sin_espejo)
    pg14.route('**/js/espejo.js*', lambda r: r.abort())
    pg14.goto(BASE); pg14.wait_for_timeout(1500)
    ok(pg14.evaluate("!window.SRP.espejo && !document.getElementById('espejo-campos') && !document.getElementById('espejo-cierre')") and pg14.locator('#form-acceso').count()==1,
       'sin el espejo de campos (archivo, bloques y script) la app abre (M11)')
    pg14.select_option('#sel-usuario-prueba','u-cabo-1'); pg14.click('#btn-entrar-prueba'); pg14.wait_for_timeout(700)
    iniciar_jornada(pg14,'Jornada sin espejo',HOY)
    r14=registrar(pg14,'aile','ESP-0002')
    pg14.click('#btn-guardado-cerrar'); pg14.wait_for_timeout(200)
    ok(pg14.is_hidden('#franja-guardado'),'la × de la franja «Guardado» la oculta, sin error (M12)')
    pg14.evaluate("async () => SRP.registros.verDetalle(await SRP.almacen.uno('plantaciones', '%s'))" % r14); pg14.wait_for_timeout(500)
    ok(pg14.is_visible('#dlg-detalle') and 'Especie' in pg14.inner_text('#dlg-detalle-cuerpo'),'y registra un árbol y abre su detalle sin el espejo')
    pg14.click('#btn-detalle-cerrar'); pg14.wait_for_timeout(200)
    pg14.evaluate("SRP.app.mostrarVista('registrar')"); pg14.wait_for_timeout(300)
    pg14.click('#btn-jornada-cerrar'); pg14.wait_for_timeout(300); pg14.click('#btn-confirmar-si'); pg14.wait_for_timeout(1200)
    reporte_de(pg14,'Jornada sin espejo'); pg14.wait_for_timeout(300)
    ok(pg14.is_visible('#dlg-cierre') and pg14.inner_text('#dlg-cierre-titulo')=='Datos de cierre de la jornada','y abre los datos de cierre, que ahora son «de la jornada» (M16)')
    pg14.click('#btn-cierre-generar'); pg14.wait_for_timeout(800)
    ok(pg14.is_visible('#dlg-previa'),'y la vista previa del reporte')
    ok(not err14,'todo sin errores en consola: %s' % err14[:2])
    # B5 y M16: título legible en Nuevo registro, banda dentro del encabezado, etiquetas únicas
    acc=pg14.evaluate("""() => ({ h1: (() => { const h = document.getElementById('titulo-registrar'); return !h.hidden && h.classList.contains('oculto-visual') && h.textContent; })(),
      banda: !!document.querySelector('header #banda-ficticio'), quitar: document.getElementById('btn-reiniciar-filtros').textContent.trim(),
      faltante: document.getElementById('btn-jornada-faltante').textContent.trim() })""")
    ok(acc=={'h1':'Nuevo registro','banda':True,'quitar':'Quitar filtros','faltante':'Registrar árbol'},
       'Nuevo registro tiene título de primer nivel legible, la banda de prueba va dentro del encabezado y cada acción tiene un solo nombre (B5, M16): %s' % acc)
    ctx14.close()
    # B2: la base sube a la versión 3 con el índice de árboles por jornada, sin perder nada
    ind=pg.evaluate("""() => { const r = {}; for (const n of SRP.almacen.db.objectStoreNames) r[n] = [...SRP.almacen.db.transaction(n).objectStore(n).indexNames].sort(); return { v: SRP.almacen.db.version, r }; }""")
    ok(ind['v']==8 and ind['r']['plantaciones']==['estatus','jornada_id'] and ind['r']['jornadas']==['cabo_id'] and 'catalogos' not in ind['r'] and all(ind['r'][t]==[] for t in ['programas','areas','especies','vehiculos','instituciones','solicitantes']),
       'la base está en la versión 8, con cada catálogo en su tabla, con el índice de árboles por jornada y sin los cinco que nadie consultaba (B2): %s' % ind)
    # Y un teléfono con la base en la versión 2 sube a la 3 sin perder lo capturado
    ctx15=b.new_context(viewport={'width':390,'height':844}); pg15=ctx15.new_page()
    pg15.route('**/*.js*', lambda r: r.abort())
    pg15.goto(BASE); pg15.wait_for_timeout(500)
    pg15.evaluate("""() => new Promise((ok, no) => { const r = indexedDB.open('srp_db', 2);
      r.onupgradeneeded = () => { const db = r.result;
        const pl = db.createObjectStore('plantaciones', { keyPath: 'id' }); ['cabo_id', 'fecha_plantacion', 'estatus'].forEach(i => pl.createIndex(i, i));
        db.createObjectStore('usuarios', { keyPath: 'id' }); db.createObjectStore('catalogos', { keyPath: 'id' }).createIndex('tipo', 'tipo');
        db.createObjectStore('bitacora', { keyPath: 'id' }).createIndex('entidad_id', 'entidad_id');
        const jo = db.createObjectStore('jornadas', { keyPath: 'id' }); ['cabo_id', 'fecha', 'estatus'].forEach(i => jo.createIndex(i, i));
        pl.put({ id: 'pl-v2', jornada_id: 'jr-v2', estatus: 'activo', cabo_id: 'u-cabo-1' });
        jo.put({ id: 'jr-v2', cabo_id: 'u-cabo-1', fecha: '2026-09-20', estatus: 'cerrada' }); };
      r.onsuccess = () => { r.result.close(); ok(true); }; r.onerror = () => no(r.error); })""")
    pg15.unroute('**/*.js*'); pg15.reload(); pg15.wait_for_timeout(1500)
    v2=pg15.evaluate("async () => ({ v: SRP.almacen.db.version, arboles: (await SRP.almacen.porIndice('plantaciones', 'jornada_id', 'jr-v2')).map(r => r.id), jornadas: (await SRP.almacen.todos('jornadas')).map(j => j.id) })")
    ok(v2=={'v':8,'arboles':['pl-v2'],'jornadas':['jr-v2']},'una base en la versión 2 sube a la 8 conservando árboles y jornadas, y el índice nuevo los encuentra (B2): %s' % v2)
    ctx15.close()

    # ---------- BLOQUE 95: TUERCA, SUBIR AL INICIO Y ERRORES EN LA JORNADA (D154) ----------
    ctx16=b.new_context(viewport={'width':390,'height':844},geolocation={'latitude':19.4326,'longitude':-99.1332,'accuracy':5},permissions=['geolocation'])
    pg16=ctx16.new_page(); err16=[]
    pg16.on('pageerror', lambda e: err16.append(str(e))); pg16.on('console', lambda m: m.type=='error' and 'net::' not in m.text and 'Failed to load' not in m.text and err16.append(m.text))
    pg16.goto(BASE); pg16.wait_for_timeout(1200)
    pg16.select_option('#sel-usuario-prueba','u-cabo-1'); pg16.click('#btn-entrar-prueba'); pg16.wait_for_timeout(700)
    iniciar_jornada(pg16,'Parque Los Pericos',HOY)
    # El 2 lejos del resto (como en la captura de Liber) y el 6 encima del 1: un duplicado
    for la,lo in [(19.4326,-99.1332),(19.4376,-99.1332),(19.43265,-99.13325),(19.4327,-99.1331),(19.43275,-99.13305),(19.4326,-99.1332)]:
        pg16.evaluate("([la, lo]) => SRP.mapa.colocar(la, lo, 'x', { origen: 'gps', precision: 5 })", [la,lo]); pg16.wait_for_timeout(150)
        pg16.fill('#campo-especie','aile'); pg16.wait_for_timeout(150); pg16.dispatch_event('.combo-opcion[data-id="ESP-0002"]','mousedown'); pg16.wait_for_timeout(120)
        pg16.click('#form-plantacion button[type=submit]'); pg16.wait_for_timeout(700)
        if pg16.is_visible('#dlg-resumen'): pg16.click('#btn-resumen-guardar'); pg16.wait_for_timeout(600)
    pg16.wait_for_timeout(800)
    # El botón «Subir al inicio» sólo aparece abajo, y encima de la barra Guardar y de la navegación
    def subir16():
        return pg16.evaluate("""() => { const b = document.getElementById('btn-subir'), r = b.getBoundingClientRect();
          const barras = [...document.querySelectorAll('.vista:not([hidden]) .barra-guardar')].filter(x => x.offsetParent).map(x => x.getBoundingClientRect())
            .filter(x => x.bottom > innerHeight - 160).map(x => x.top);
          return { vis: b.dataset.visible, abajo: r.bottom, nav: document.getElementById('navegacion').getBoundingClientRect().top, barras, ancho: r.width, alto: r.height }; }""")
    pg16.evaluate("window.scrollTo(0, 0)"); pg16.wait_for_timeout(300)
    ok(subir16()['vis']=='no','arriba no se ve el botón «Subir al inicio» (D154)')
    pg16.evaluate("window.scrollTo(0, 1000)"); pg16.wait_for_timeout(400)
    s16=subir16()
    ok(s16['vis']=='si' and s16['ancho']==48 and s16['alto']==48 and s16['abajo']<=s16['nav'] and all(s16['abajo']<=t for t in s16['barras']),
       'al bajar aparece, redondo, encima de la navegación y de la barra Guardar sin tapar sus botones: %s' % s16)
    pg16.click('#btn-subir'); pg16.wait_for_timeout(1000)
    ok(pg16.evaluate("scrollY")==0 and pg16.evaluate("document.activeElement.id")=='titulo-registrar','y lo lleva al inicio con el foco en el título de la sección')
    # Cambiar de sección desde abajo deja la sección nueva en su inicio; la pestaña actual sube
    pg16.evaluate("window.scrollTo(0, 5000)"); pg16.wait_for_timeout(300)
    pg16.click('.pestana[data-vista=registros]'); pg16.wait_for_timeout(700)
    y16=pg16.evaluate("scrollY")
    pg16.evaluate("window.scrollTo(0, 5000)"); pg16.wait_for_timeout(300)
    y16b=pg16.evaluate("scrollY")
    pg16.click('.pestana[data-vista=registros]'); pg16.wait_for_timeout(900)
    ok(y16==0 and y16b>0 and pg16.evaluate("scrollY")==0,'al cambiar de sección estando abajo, la nueva empieza arriba; tocar la pestaña actual también sube (%s, %s)' % (y16, y16b))
    t16=pg16.evaluate("[...document.querySelectorAll('#lista-registros .btn-tuerca')].map(b => { const r = b.getBoundingClientRect(); return [Math.round(r.width), Math.round(r.height)]; })")
    ok(t16 and all(w==h==48 for w,h in t16),'la tuerca es un círculo en las tarjetas de Registros: %s' % t16[:2])
    # La ficha de la jornada: tuerca redonda y a la derecha, y el punto puesto por error se elimina desde ahí
    pg16.click('.pestana[data-vista=jornadas]'); pg16.wait_for_timeout(700)
    pg16.evaluate("window.scrollTo(0, 5000)"); pg16.wait_for_timeout(200)
    pg16.locator('#lista-jornadas .jornada-boton').first.click(); pg16.wait_for_timeout(1200)
    ok(pg16.evaluate("scrollY")==0,'la ficha de la jornada abre desde su inicio')
    t16=pg16.evaluate("[...document.querySelectorAll('#jornada-lista .btn-tuerca')].map(b => { const r = b.getBoundingClientRect(); return [Math.round(r.width), Math.round(r.height), Math.round(innerWidth - r.right)]; })")
    ok(len(t16)==6 and all(w==h==48 for w,h,_ in t16) and len(set(d for *_,d in t16))==1,
       'en la lista de puntos la tuerca es un círculo de 48 px, alineada a la derecha en todos (D154): %s' % t16[:2])
    li16=pg16.locator('#jornada-lista .punto-jornada').nth(1)
    ok('Lejos del resto' in li16.inner_text(),'el punto 2 quedó lejos del resto')
    li16.locator('.btn-tuerca').click(); pg16.wait_for_timeout(250)
    ok(li16.locator('.menu-opcion').all_inner_texts()==['Editar','Mover a otra jornada','Sustituir','Eliminar'],
       'su tuerca ofrece Editar, Mover a otra jornada, Sustituir (D203) y Eliminar, como en Registros: %s' % li16.locator('.menu-opcion').all_inner_texts())
    id16=li16.get_attribute('data-id')
    li16.locator('.menu-opcion[data-accion=eliminar]').click(); pg16.wait_for_timeout(900)
    est16=pg16.evaluate("async id => (await SRP.almacen.uno('plantaciones', id)).estatus", id16)
    ok(est16=='eliminado' and pg16.locator('#jornada-lista .punto-jornada').count()==5 and pg16.is_visible('#vista-jornadas') and 'Lejos' not in pg16.inner_text('#jornada-lista'),
       'y al eliminarlo sale de la jornada sin salir de la ficha, con su constancia (estatus %s)' % est16)
    pg16.click('#aviso .aviso-accion'); pg16.wait_for_timeout(900)
    ok(pg16.locator('#jornada-lista .punto-jornada').count()==6,'«Deshacer» lo devuelve a la jornada')
    # Un duplicado ya ofrece «Eliminar» en la fila: la tuerca no lo repite
    dup16=pg16.evaluate("""() => [...document.querySelectorAll('#jornada-lista .punto-jornada')].filter(li => li.querySelector('.punto-acciones > [data-accion=eliminar]'))
      .map(li => li.querySelectorAll('[data-accion=eliminar]').length)""")
    ok(dup16 and all(n==1 for n in dup16),'donde la fila ya trae «Eliminar» (duplicado), la tuerca no lo repite: %s' % dup16)
    # «Editar» desde la tuerca abre el árbol en el formulario y al cancelar vuelve a la jornada
    li16=pg16.locator('#jornada-lista .punto-jornada').nth(0); id16=li16.get_attribute('data-id')
    li16.locator('.btn-tuerca').click(); pg16.wait_for_timeout(250); li16.locator('.menu-opcion[data-accion=editar]').click(); pg16.wait_for_timeout(700)
    ok(pg16.is_visible('#vista-registrar') and pg16.evaluate("SRP.formulario.estado.editando && SRP.formulario.estado.editando.id")==id16,'«Editar» de la tuerca abre ese árbol en el formulario')
    pg16.click('#btn-cancelar-edicion'); pg16.wait_for_timeout(900)
    ok(pg16.is_visible('#jornada-detalle') and pg16.locator('#jornada-lista .punto-jornada').count()==6,'y al cancelar vuelve a la ficha de la jornada')
    pg16.evaluate("window.scrollTo(0, 800)"); pg16.wait_for_timeout(400)
    s16=subir16()
    ok(s16['vis']=='si' and s16['barras'] and all(s16['abajo']<=t for t in s16['barras']) and s16['abajo']<=s16['nav'],'en la ficha el botón queda encima de la barra «Siguiente»: %s' % s16)
    pg16.click('#btn-jornada-volver'); pg16.wait_for_timeout(900)
    ok(pg16.evaluate("scrollY")==0,'y al volver a la lista de jornadas, también empieza arriba')
    # D155: la coordinación elimina lo suyo y lo de sus cabos, no lo de fuera de su cuadrilla
    pg16.evaluate("SRP.app.menuCuenta(false)"); pg16.click('#btn-cuenta'); pg16.click('#btn-cambiar-perfil'); pg16.wait_for_timeout(200)
    pg16.select_option('#sel-usuario-prueba','u-coord-1'); pg16.click('#btn-entrar-prueba'); pg16.wait_for_timeout(700)
    iniciar_jornada(pg16,'Jornada de la coordinación',HOY)
    rc16=registrar(pg16,'aile','ESP-0002')
    pc16=pg16.evaluate("""async id => { const u = SRP.sesion.usuario; const todos = await SRP.almacen.todos('plantaciones');
      return { propio: SRP.permisos.puede('registro.eliminar', todos.find(r => r.id === id)), cabo: SRP.permisos.puede('registro.eliminar', todos.find(r => r.cabo_id === 'u-cabo-1')),
        fuera: SRP.permisos.puede('registro.eliminar', { cabo_id: 'u-fuera' }) }; }""", rc16)
    ok(pc16=={'propio':True,'cabo':True,'fuera':False},'la coordinación puede eliminar su árbol y el de su cabo, no uno de fuera de su cuadrilla (D155): %s' % pc16)
    pg16.evaluate("async id => SRP.registros.eliminar(await SRP.almacen.uno('plantaciones', id))", rc16); pg16.wait_for_timeout(500)
    ok(pg16.evaluate("async id => (await SRP.almacen.uno('plantaciones', id)).estatus", rc16)=='eliminado','y al pedirlo, lo elimina')
    ok(not err16,'todo sin errores en consola: %s' % err16[:2])
    ctx16.close()

    # ---------- BLOQUE 94b: ESTILOS Y CÓDIGO REPETIDO (M13, M15, D156) ----------
    ctx18=b.new_context(viewport={'width':390,'height':844},geolocation={'latitude':19.4326,'longitude':-99.1332,'accuracy':5},permissions=['geolocation'])
    pg18=ctx18.new_page(); err18=[]
    pg18.on('pageerror', lambda e: err18.append(str(e))); pg18.on('console', lambda m: m.type=='error' and 'net::' not in m.text and 'Failed to load' not in m.text and err18.append(m.text))
    pg18.goto(BASE); pg18.wait_for_timeout(1200)
    pg18.select_option('#sel-usuario-prueba','u-cabo-1'); pg18.click('#btn-entrar-prueba'); pg18.wait_for_timeout(700)
    pg18.evaluate("SRP.app.mostrarVista('registrar')"); pg18.wait_for_timeout(300)
    # Resumen de errores común: título, lista escapada con enlaces y el foco en la caja, en todos los formularios
    pg18.click('#btn-iniciar-jornada'); pg18.wait_for_timeout(300)
    re18=pg18.evaluate("(() => { const c = document.getElementById('ini-errores'); return { titulo: c.querySelector('h2') && c.querySelector('h2').textContent, enlaces: c.querySelectorAll('li a[href^=\"#ini-\"]').length, foco: document.activeElement.id }; })()")
    ok(re18['titulo']=='Falta corregir 5 datos' and re18['enlaces']==5 and re18['foco']=='ini-errores','el resumen de errores es el mismo en todos los formularios: título, enlaces a cada campo y el foco en la caja (M15): %s' % re18)
    esc18=pg18.evaluate("""() => { const c = document.createElement('div'); document.body.appendChild(c);
      SRP.util.resumenErrores(c, [['x', '<b>raro</b>']], ['x']); const h = c.innerHTML; c.remove();
      return { escapado: h.includes('&lt;b&gt;raro&lt;/b&gt;'), opciones: SRP.util.opciones('Todos', [['a"b', '<x>']]) }; }""")
    ok(esc18['escapado'] and esc18['opciones']=='<option value="">Todos</option><option value="a&quot;b">&lt;x&gt;</option>','el resumen y las listas de opciones escapan el texto (M15): %s' % esc18)
    oc18=pg18.evaluate("""() => { const b = document.getElementById('btn-iniciar-jornada'); const antes = b.innerHTML; const libre = SRP.util.ocupado(b, 'Guardando…', 'disco');
      const durante = [b.disabled, b.getAttribute('aria-busy'), b.textContent.trim()]; libre(); libre();
      return { durante, despues: [b.disabled, b.hasAttribute('aria-busy'), b.innerHTML === antes] }; }""")
    ok(oc18=={'durante':[True,'true','Guardando…'],'despues':[False,False,True]},'el botón ocupado es uno solo: dice qué hace, se deshabilita y vuelve como estaba (M15): %s' % oc18)
    lu18=pg18.evaluate("[SRP.ref.lugar('Coyoacán', 'DEL CARMEN'), SRP.ref.lugar(['Coyoacán', 'Tlalpan'], ''), SRP.ref.lugar('', ''), SRP.activa.lugarDe({ alcaldia: 'Tlalpan', colonia: 'CENTRO' })]")
    ok(lu18==['Alcaldía Coyoacán · Col. DEL CARMEN','Alcaldías Coyoacán, Tlalpan','','Alcaldía Tlalpan · Col. CENTRO'],'el lugar se dice igual en la franja, la lista de jornadas y el reporte (M15): %s' % lu18)
    # Colores: el código los lee de la hoja; el PDF y el croquis no cambian con el modo sol
    co18=pg18.evaluate("""() => { const antes = [SRP.util.rgb('pdf-guinda'), SRP.util.colorBase('gris'), SRP.util.color('gris')];
      document.getElementById('btn-contraste').click();
      const sol = [SRP.util.colorBase('gris'), SRP.util.color('gris')];
      document.getElementById('btn-contraste').click();
      return { antes, sol, pdf: SRP.reportes.colores().fila }; }""")
    ok(co18['antes']==[[157,33,72],'#5A6269','#5A6269'] and co18['sol']==['#5A6269','#2B2D2E'] and co18['pdf']==[247,241,243],
       'los colores salen de :root; el del PDF no cambia con el modo sol y el de pantalla sí (M13): %s' % co18)
    # Atajos de fecha: un solo componente; en Registros «Un día» abre su fecha y queda marcado solo
    pg18.evaluate("SRP.app.mostrarVista('registros')"); pg18.wait_for_timeout(500)
    abrir_filtros(pg18)
    pg18.click('#filtro-atajos .chip[data-atajo=dia]'); pg18.wait_for_timeout(200)
    at18=pg18.evaluate("(() => { const c = document.getElementById('filtro-atajos'); return { marcados: [...c.querySelectorAll('.chip[aria-pressed=\"true\"]')].map(x => x.dataset.atajo), expandido: c.querySelector('[data-atajo=dia]').getAttribute('aria-expanded'), panel: !document.getElementById('filtro-un-dia').hidden }; })()")
    ok(at18=={'marcados':['dia'],'expandido':'true','panel':True},'la barra de atajos marca uno solo y abre el panel de «Un día» (M15): %s' % at18)
    # El reporte tiene un solo modelo: la vista previa dice lo mismo que el PDF, advertencias incluidas
    iniciar_jornada(pg18,'Jornada del modelo',HOY)
    registrar(pg18,'aile','ESP-0002')
    pg18.evaluate("SRP.app.mostrarVista('registrar')"); pg18.wait_for_timeout(300)
    pg18.click('#btn-jornada-cerrar'); pg18.wait_for_timeout(300); pg18.click('#btn-confirmar-si'); pg18.wait_for_timeout(1200)
    reporte_de(pg18,'Jornada del modelo'); pg18.wait_for_timeout(300)
    pg18.click('#btn-cierre-generar'); pg18.wait_for_timeout(1000)
    mo18=pg18.evaluate("""() => { const v = SRP.reportes.vistaPrevia; const m = SRP.reportes.modelo(v.registros, v.cierre, v.fecha, v.jornada);
      const t = document.getElementById('previa-hoja').innerText;
      return { claves: Object.keys(m).length, advertencia: t.includes(m.advertencia), gps: t.includes(m.gps), nota: t.includes(m.notaTotales),
        datos: m.identificacion.every(([e, v]) => t.includes(e + ': ' + v.split('\\n')[0])), filas: m.ejemplares.filas.length }; }""")
    ok(mo18['advertencia'] and mo18['gps'] and mo18['nota'] and mo18['datos'] and mo18['filas']==1,'la vista previa pinta el mismo modelo que el PDF, con las advertencias del pie (M15): %s' % mo18)
    # El pin de Nuevo registro toma su color de la hoja: azul de acción (D166)
    pin18=pg18.evaluate("(() => { const d = document.createElement('div'); d.className = 'pin'; d.innerHTML = SRP.mapa.ICONO_SVG; document.body.appendChild(d); const g = getComputedStyle(d.querySelector('.pin-gota')).fill; d.remove(); return g; })()")
    ok(pin18=='rgb(27, 95, 170)','el marcador del mapa toma su color de la hoja, no del código (M13, D166): %s' % pin18)
    ok(not err18,'sin errores en consola: %s' % err18[:2])
    ctx18.close()

    # ---------- BLOQUE 96: INDICADORES CON UN SOLO CÁLCULO (D157) ----------
    ctx17=b.new_context(viewport={'width':390,'height':844}); pg17=ctx17.new_page(); err17=[]
    pg17.on('pageerror', lambda e: err17.append(str(e)))
    pg17.goto(BASE); pg17.wait_for_timeout(1200)
    pg17.select_option('#sel-usuario-prueba','u-coord-1'); pg17.click('#btn-entrar-prueba'); pg17.wait_for_timeout(700)
    per=pg17.evaluate("""() => { const I = SRP.indicadores;
      const s = I.periodo('semana', '2026-09-25'), s2 = I.periodo('semana', '2026-09-21'), s3 = I.periodo('semana', '2026-09-27');
      return { semana: [s.desde, s.hasta], lunes: [s2.desde, s2.hasta], domingo: [s3.desde, s3.hasta], etiqueta: s.etiqueta,
        feb: [I.periodo('mes', '2026-02-10').desde, I.periodo('mes', '2026-02-10').hasta], bisiesto: I.periodo('mes', '2028-02-03').hasta,
        anio: [I.periodo('anio', '2026-07-01').desde, I.periodo('anio', '2026-07-01').hasta],
        antes: [I.mover(s, -1).desde, I.mover(s, -1).hasta], enero: I.mover(I.periodo('mes', '2026-12-05'), 1).desde,
        rango: [I.mover(I.periodo('rango', '2026-09-01', '2026-09-10'), 1).desde, I.mover(I.periodo('rango', '2026-09-01', '2026-09-10'), 1).hasta],
        todo: [I.periodo('todo').desde, I.periodo('todo').hasta, I.periodo('todo').etiqueta] }; }""")
    ok(per=={'semana':['2026-09-21','2026-09-27'],'lunes':['2026-09-21','2026-09-27'],'domingo':['2026-09-21','2026-09-27'],'etiqueta':'Semana del 21-SEP-2026 al 27-SEP-2026',
             'feb':['2026-02-01','2026-02-28'],'bisiesto':'2028-02-29','anio':['2026-01-01','2026-12-31'],'antes':['2026-09-14','2026-09-20'],'enero':'2027-01-01',
             'rango':['2026-09-11','2026-09-20'],'todo':['','','Todo el registro']},
       'periodos: la semana va de lunes a domingo, el mes y el año son de calendario (con bisiesto), se avanza y retrocede de uno en uno (D157): %s' % per)
    # Datos sintéticos: el cálculo es puro, no lee la base
    ind=pg17.evaluate("""() => { const I = SRP.indicadores;
      const arbol = (id, j, alc, col, extra) => Object.assign({ id, jornada_id: j, cabo_id: '', lat: 19.35 + id.length * 1e-4, lng: -99.16, alcaldia: alc, colonia: col,
        especie_id: 'ESP-0002', programa_id: 'p-refor', punto_origen: 'gps', gps_precision_m: 6, fecha_registro: '2026-09-22T10:00:00Z' }, extra || {});
      const jor = (id, fecha, cabo, estatus, meta, regs, dato) => ({ id, clave: id, fecha, cabo_id: cabo, estatus, nombre: 'J ' + id, registros: regs.map(r => Object.assign(r, { cabo_id: cabo, fecha_plantacion: r.fecha_plantacion || fecha })),
        dato: Object.assign({ id, fecha, cabo_id: cabo, estatus, programa_id: 'p-refor', arboles_previstos: meta, puntos_revisados: [] }, dato || {}) });
      const hoy = SRP.util.fechaHoy();
      const datos = { cabos: ['u-cabo-1', 'u-cabo-9'], eliminados: [], ediciones: [], jornadas: [
        jor('J1', '2026-09-22', 'u-cabo-1', 'cerrada', 3, [arbol('a1', 'J1', 'Coyoacán', 'DEL CARMEN', { foto_id: 'f1' }), arbol('a2x', 'J1', 'Coyoacán', 'DEL CARMEN'), arbol('a3xx', 'J1', 'Tlalpan', 'CENTRO', { punto_origen: 'manual', gps_precision_m: null })], { reporte_en: '2026-09-22T20:00:00Z' }),
        jor('J2', '2026-09-24', 'u-cabo-9', 'cerrada', 5, [arbol('b1', 'J2', 'Coyoacán', 'SANTA CATARINA'), arbol('b2x', 'J2', 'Coyoacán', 'SANTA CATARINA', { gps_precision_m: 10 })]),
        jor('J3', '2026-09-25', 'u-cabo-1', 'abierta', 4, [arbol('c1', 'J3', 'Coyoacán', 'DEL CARMEN')]),
        jor('J4', '2026-09-15', 'u-cabo-1', 'cerrada', 4, [arbol('d1', 'J4', 'Coyoacán', ''), arbol('d2x', 'J4', 'Coyoacán', ''), arbol('d3xx', 'J4', 'Coyoacán', ''), arbol('d4xxx', 'J4', 'Coyoacán', '')], { reporte_en: 'x' }),
        jor('J5', '2020-01-01', 'u-cabo-9', 'abierta', 2, [])] };
      const s = I.periodo('semana', '2026-09-25');
      const H = '2026-09-25';   // «hoy» fijo: la prueba no depende del reloj
      const m = I.calcular(datos, s, {}, H);
      const tl = I.calcular(datos, s, { alcaldia: 'Tlalpan' }, H);
      const b9 = I.calcular(datos, s, { cabo: 'u-cabo-9' }, H);
      const r = I.calcular(datos, I.periodo('rango', '2026-09-14', '2026-09-27'), {}, H);
      return { arboles: m.cifras.arboles, jornadas: m.cifras.jornadas, enCurso: m.cifras.enCurso, meta: m.cifras.meta, avance: m.cifras.avance, promedio: m.cifras.promedio,
        cabos: [m.cifras.cabosActivos, m.cifras.cabosAsignados], alcaldias: m.porAlcaldia.map(a => [a.clave, a.arboles, a.jornadas, a.colonias]),
        foto: [m.calidad.conFoto, m.calidad.conFotoPct], gps: [m.calidad.gps, m.calidad.aMano, m.calidad.precisionMediana],
        atender: m.atender.map(a => [a.tipo, a.n]), tlalpan: [tl.cifras.arboles, tl.cifras.jornadas], cabo9: [b9.cifras.arboles, b9.porCabo.map(c => c.cabo_id)],
        porCabo: m.porCabo.map(c => [c.cabo_id, c.jornadas, c.arboles, c.avance, c.sinReporte, c.abiertasViejas]),
        serie: [m.serie.unidad, m.serie.casillas.length, m.serie.casillas.reduce((x, c) => x + c.arboles, 0), m.serie.casillas[1].arboles, m.serie.casillas[3].arboles],
        rango: [r.cifras.arboles, r.cifras.jornadas, r.serie.unidad, r.serie.casillas.length],
        mesSerie: [I.calcular(datos, I.periodo('mes', '2026-09-25'), {}, H).serie.unidad, I.calcular(datos, I.periodo('mes', '2026-09-25'), {}, H).serie.casillas.length],
        anioSerie: I.calcular(datos, I.periodo('anio', '2026-09-25'), {}, H).serie.casillas.length,
        detalle: [m.detalle.length, m.detalle[0].folio, m.detalle.filter(d => d.foto === 'Sí').length, m.detalle.map(d => d.alcaldia).sort().join()] }; }""")
    ok(ind['arboles']==5 and ind['jornadas']==2 and ind['enCurso']==1 and ind['meta']==8 and ind['avance']==63 and ind['promedio']==2.5,
       'en la semana cuentan sólo las jornadas cerradas: 5 árboles en 2 jornadas, 1 en curso aparte, 63 %% de la meta de 8 (D157): %s' % {k: ind[k] for k in ('arboles','jornadas','enCurso','meta','avance','promedio')})
    ok(ind['cabos']==[2,2] and ind['alcaldias']==[['Coyoacán',4,2,2],['Tlalpan',1,1,1]],'por cabo y por alcaldía, con sus colonias: %s %s' % (ind['cabos'], ind['alcaldias']))
    ok(ind['foto']==[1,20] and ind['gps']==[4,1,6],'calidad del dato: 1 de 5 con foto (20 %%), 4 con GPS, 1 a mano, precisión mediana 6 m: %s %s' % (ind['foto'], ind['gps']))
    ok(ind['atender']==[['abiertas',1],['reporte',1]],'«Qué atender»: la jornada abierta de un día anterior y la cerrada sin reporte: %s' % ind['atender'])
    ok(ind['tlalpan']==[1,1] and ind['cabo9'][0]==2 and ind['cabo9'][1]==['u-cabo-9'],'con alcaldía o cabo, sólo lo suyo: %s %s' % (ind['tlalpan'], ind['cabo9']))
    ok(ind['porCabo']==[['u-cabo-1',1,3,100,0,0],['u-cabo-9',1,2,40,1,1]],'por cabo: jornadas, árboles, avance contra su meta, sin reporte y abiertas de días anteriores: %s' % ind['porCabo'])
    ok(ind['serie']==['dia',7,5,3,2],'la semana se grafica por día, de lunes a domingo: %s' % ind['serie'])
    ok(ind['detalle']==[5,'PROVISIONAL',1,'Coyoacán,Coyoacán,Coyoacán,Coyoacán,Tlalpan'],'el detalle para la tabla trae un renglón por árbol contado: %s' % ind['detalle'])
    ok(ind['rango']==[9,3,'dia',14] and ind['mesSerie'][0]=='semana' and ind['mesSerie'][1] in (5,6) and ind['anioSerie']==12,'un rango de dos semanas suma las dos; el mes va por semanas y el año por meses: %s %s %s' % (ind['rango'], ind['mesSerie'], ind['anioSerie']))
    # Con la base real: lo que alcanza cada perfil
    alc=pg17.evaluate("async () => { const d = await SRP.indicadores.cargar(); return { cabos: d.cabos, jornadas: d.jornadas.length >= 0, ed: Array.isArray(d.ediciones) }; }")
    ok(alc['cabos']==['u-cabo-1'] and alc['ed'],'la coordinación supervisa a los cabos que tiene asignados: %s' % alc['cabos'])
    ok(not err17,'sin errores: %s' % err17[:2])
    ctx17.close()

    # ---------- BLOQUE 97: SUPERVISIÓN Y MI AVANCE (D158) ----------
    import datetime as _dt
    AYER=(_dt.date.fromisoformat(HOY)-_dt.timedelta(days=1)).isoformat()
    ctx19=b.new_context(viewport={'width':390,'height':844},geolocation={'latitude':19.4326,'longitude':-99.1332,'accuracy':5},permissions=['geolocation'])
    pg19=ctx19.new_page(); err19=[]
    pg19.on('pageerror', lambda e: err19.append(str(e))); pg19.on('console', lambda m: m.type=='error' and 'net::' not in m.text and 'Failed to load' not in m.text and err19.append(m.text))
    pg19.goto(BASE); pg19.wait_for_timeout(1200)
    def entrar19(uid):
        if not pg19.is_visible('#sel-usuario-prueba'):
            pg19.evaluate("SRP.app.menuCuenta(false)"); pg19.click('#btn-cuenta'); pg19.click('#btn-cambiar-perfil'); pg19.wait_for_timeout(200)
        pg19.select_option('#sel-usuario-prueba', uid); pg19.click('#btn-entrar-prueba'); pg19.wait_for_timeout(900)
    entrar19('u-cabo-1')
    nav19=pg19.evaluate("[...document.querySelectorAll('#navegacion .pestana')].filter(b => !b.hidden).map(b => b.textContent.trim())")
    ok(nav19==['Nuevo registro','Jornadas','Registros','Mi avance'] and pg19.evaluate("SRP.app.vista")=='registrar',
       'el cabo entra a Nuevo registro y encuentra «Mi avance» al final de su barra (D158): %s' % nav19)
    # Una jornada de hoy con dos árboles, cerrada; otra de ayer con uno, abierta
    iniciar_jornada(pg19,'Parque de hoy',HOY)
    registrar(pg19,'aile','ESP-0002'); pg19.evaluate("SRP.mapa.colocar(19.43275, -99.13305, 'x', { origen: 'gps', precision: 5 })")
    pg19.fill('#campo-especie','aile'); pg19.wait_for_timeout(150); pg19.dispatch_event('.combo-opcion[data-id="ESP-0002"]','mousedown'); pg19.wait_for_timeout(120)
    pg19.click('#form-plantacion button[type=submit]'); pg19.wait_for_timeout(800)
    if pg19.is_visible('#dlg-resumen'): pg19.click('#btn-resumen-guardar'); pg19.wait_for_timeout(600)
    pg19.click('#btn-jornada-cerrar'); pg19.wait_for_timeout(300); pg19.click('#btn-confirmar-si'); pg19.wait_for_timeout(1200)
    iniciar_jornada(pg19,'Camellón de ayer',AYER)
    registrar(pg19,'aile','ESP-0002',fecha=AYER)
    pg19.click('.pestana[data-vista=supervision]'); pg19.wait_for_timeout(900)
    abrir_sup(pg19)
    s19=pg19.evaluate("""() => ({ titulo: document.getElementById('titulo-supervision').textContent, semana: document.querySelector('#sup-tipos [aria-pressed=true]').dataset.tipo,
      etiqueta: document.getElementById('sup-etiqueta').textContent, cifras: [...document.querySelectorAll('.sup-cifra')].map(c => c.querySelector('b').textContent + ' ' + c.querySelector('span').textContent),
      siguiente: document.getElementById('sup-siguiente').disabled, atender: document.querySelector('.sup-atender') ? document.querySelector('.sup-atender').innerText : '',
      cabo: !document.getElementById('caja-sup-cabo').hidden, fotos: !document.getElementById('btn-sup-fotos').hidden, porCabo: !!document.querySelector('.sup-tabla-cabos') })""")
    ok(s19['titulo']=='Mi avance' and s19['semana']=='semana' and s19['etiqueta'].startswith('Semana del ') and s19['siguiente'],
       'Mi avance abre en la semana en curso, sin poder avanzar al futuro: %s' % {k: s19[k] for k in ('titulo','etiqueta','siguiente')})
    ok('2 árboles plantados' in s19['cifras'] and '100 % de lo previsto' not in s19['cifras'],'cuenta los 2 árboles de la jornada cerrada, no el de la abierta: %s' % s19['cifras'])
    ok('de días anteriores siguen abiertas' in s19['atender'] or '1 jornada de un día anterior sigue abierta' in s19['atender'],'«Qué atender» dice que la de ayer sigue abierta: %s' % s19['atender'][:120])
    ok(not s19['cabo'] and s19['fotos'] and not s19['porCabo'],'el cabo no filtra por cabo ni ve la tabla por cabo; sí tiene sus fotografías')
    # Periodos: anterior, mes, año, rango y todo
    pg19.click('#sup-anterior'); pg19.wait_for_timeout(300)
    ant=pg19.inner_text('#sup-etiqueta'); sig=pg19.is_disabled('#sup-siguiente')
    pg19.click('#sup-tipos .chip[data-tipo=mes]'); pg19.wait_for_timeout(300)
    mes=pg19.inner_text('#sup-etiqueta')
    pg19.click('#sup-tipos .chip[data-tipo=anio]'); pg19.wait_for_timeout(300)
    anio=pg19.inner_text('#sup-etiqueta'); barras=pg19.locator('.sup-grafica svg rect').count()
    pg19.click('#sup-tipos .chip[data-tipo=rango]'); pg19.wait_for_timeout(300)
    rango_visible=pg19.is_visible('#form-sup-rango')
    pg19.fill('#sup-desde', AYER); pg19.fill('#sup-hasta', HOY); pg19.click('#btn-sup-rango'); pg19.wait_for_timeout(300)
    rango=pg19.inner_text('#sup-etiqueta')
    pg19.click('#sup-tipos .chip[data-tipo=todo]'); pg19.wait_for_timeout(300)
    todo=[pg19.inner_text('#sup-etiqueta'), pg19.is_hidden('#sup-anterior')]
    ok(ant!=s19['etiqueta'] and not sig and mes.split()[0] in ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']
       and anio=='Año '+HOY[:4] and barras==12 and rango_visible and rango.startswith('Del ') and todo==['Todo el registro',True],
       'se cambia de semana, mes (%s), año (12 barras), rango y todo: %s' % (mes, [ant, anio, barras, rango, todo]))
    # Filtro por alcaldía: la de los árboles y otra sin nada
    pg19.click('#sup-filtros summary'); pg19.wait_for_timeout(150)
    # La lista ya sólo ofrece alcaldías con jornadas (D202); una sin nada se pone como la dejaría otro filtro
    ofrece19=pg19.evaluate("[...document.querySelectorAll('#sup-alcaldia option')].map(o => o.value).includes('Tlalpan')")
    pg19.evaluate("SRP.supervision.filtros.alcaldia = 'Tlalpan'; SRP.supervision.pintar()"); pg19.wait_for_timeout(300)
    vacio=pg19.inner_text('#sup-cuerpo'); filtros=pg19.inner_text('#sup-filtros-texto')
    ok(not ofrece19 and pg19.input_value('#sup-alcaldia')=='Tlalpan','la lista de alcaldías no ofrece las que no tienen jornadas, pero una ya elegida se conserva (D202)')
    pg19.click('#btn-sup-quitar'); pg19.wait_for_timeout(300)
    ok('Sin jornadas cerradas' in vacio and filtros=='Más filtros: Tlalpan' and pg19.inner_text('#sup-filtros-texto').startswith('Más filtros: alcaldía') and pg19.inner_text('.sup-cifra b >> nth=0')=='2',
       'con una alcaldía sin árboles lo dice; «Quitar filtros» vuelve a todo: %s' % filtros)
    mapa19=pg19.evaluate("[...document.querySelectorAll('#sup-mapa path.sup-alcaldia')].map(p => [...p.classList].find(c => c.startsWith('sup-nivel-'))).filter(c => c !== 'sup-nivel-0').length")
    ok(mapa19==1 and pg19.locator('#sup-mapa path.sup-alcaldia').count()==16,'el mapa pinta las 16 alcaldías y resalta la única con árboles: %d' % mapa19)
    ancho19=pg19.evaluate("[document.documentElement.scrollWidth, innerWidth]")
    ok(ancho19[0]<=ancho19[1],'Mi avance cabe en el teléfono sin desplazarse de lado: %s' % ancho19)
    # Desde «Qué atender» se llega a la jornada
    pg19.click('#sup-tipos .chip[data-tipo=semana]'); pg19.wait_for_timeout(300)
    pg19.click('.sup-atender summary'); pg19.wait_for_timeout(200)
    pg19.locator('.sup-atender button[data-jornada]').first.click(); pg19.wait_for_timeout(1200)
    ok(pg19.is_visible('#jornada-detalle') and 'Camellón de ayer' in pg19.inner_text('#jornada-titulo'),'desde «Qué atender» se abre la ficha de esa jornada: %s' % pg19.inner_text('#jornada-titulo'))
    # La coordinación entra a Supervisión, primera en su barra, con su cuadrilla
    entrar19('u-coord-1')
    nav19=pg19.evaluate("[...document.querySelectorAll('#navegacion .pestana')].filter(b => !b.hidden).map(b => b.textContent.trim())")
    ok(nav19[0]=='Supervisión' and 'Fotografías' not in nav19 and pg19.evaluate("SRP.app.vista")=='supervision' and pg19.is_visible('#btn-sup-fotos'),
       'la coordinación entra a Supervisión, primera en su barra; Fotografías va dentro (D158): %s' % nav19)
    c19=pg19.evaluate("[...document.querySelectorAll('.sup-tabla-cabos tbody tr')].map(t => t.innerText.replace(/\\s+/g, ' '))")
    ok(any('Fulana' in x for x in c19),'la tabla por cabo trae a su cabo: %s' % c19[:2])
    pg19.locator('.sup-tabla-cabos button[data-cabo]').first.click(); pg19.wait_for_timeout(900)
    ok(pg19.is_visible('#vista-jornadas') and pg19.evaluate("document.getElementById('jornada-cabo').value")=='u-cabo-1','tocar un cabo lleva a sus jornadas')
    pg19.click('.pestana[data-vista=supervision]'); pg19.wait_for_timeout(700)
    abrir_sup(pg19)
    pg19.click('#btn-sup-fotos'); pg19.wait_for_timeout(600)
    pg19.click('#btn-galeria-volver'); pg19.wait_for_timeout(600)
    ok(pg19.is_visible('#vista-supervision'),'de Fotografías se vuelve a Supervisión')
    # Administración: Catálogos y Usuarios, en el menú de la cuenta
    entrar19('u-admin-1')
    nav19=pg19.evaluate("[...document.querySelectorAll('#navegacion .pestana')].filter(b => !b.hidden).map(b => b.textContent.trim())")
    pg19.click('#btn-cuenta'); pg19.wait_for_timeout(200)
    menu19=[pg19.is_visible('#btn-ir-configuracion'), pg19.locator('#menu-cuenta [id^=btn-ir-]:visible').count()]
    pg19.click('#btn-ir-configuracion'); pg19.wait_for_timeout(500); pg19.click('.cfg-tarjeta[data-ir=usuarios]'); pg19.wait_for_timeout(500)
    ok(nav19==['Supervisión','Jornadas','Registros'] and menu19==[True,1] and pg19.is_visible('#vista-usuarios'),
       'la administración tiene cuatro secciones abajo y, en el menú de la cuenta, una sola entrada «Configuración» que lleva a Usuarios: %s %s' % (nav19, menu19))
    pg19.set_viewport_size({'width':1280,'height':900}); pg19.click('.pestana[data-vista=supervision]'); pg19.wait_for_timeout(800)
    abrir_sup(pg19)
    cols=pg19.evaluate("getComputedStyle(document.querySelector('.sup-cifras')).gridTemplateColumns.split(' ').length")
    ok(cols==4,'en computadora las cifras van en un renglón de cuatro: %s' % cols)
    ok(not err19,'sin errores en consola: %s' % err19[:2])
    ctx19.close()

    # ---------- BLOQUE 98: INFORMES POR PERIODO EN PDF Y CSV (D159) ----------
    import warnings as _w; _w.filterwarnings('ignore')
    from pypdf import PdfReader as _Pdf
    ctx20=b.new_context(viewport={'width':1280,'height':900},geolocation={'latitude':19.4326,'longitude':-99.1332,'accuracy':5},permissions=['geolocation'],accept_downloads=True)
    pg20=ctx20.new_page(); err20=[]
    pg20.on('pageerror', lambda e: err20.append(str(e))); pg20.on('console', lambda m: m.type=='error' and 'net::' not in m.text and 'Failed to load' not in m.text and err20.append(m.text))
    pg20.goto(BASE); pg20.wait_for_timeout(1200)
    def entrar20(uid):
        if not pg20.is_visible('#sel-usuario-prueba'):
            pg20.evaluate("SRP.app.menuCuenta(false)"); pg20.click('#btn-cuenta'); pg20.click('#btn-cambiar-perfil'); pg20.wait_for_timeout(200)
        pg20.select_option('#sel-usuario-prueba', uid); pg20.click('#btn-entrar-prueba'); pg20.wait_for_timeout(900)
    entrar20('u-cabo-1')
    iniciar_jornada(pg20,'Jardín del informe',HOY)
    registrar(pg20,'aile','ESP-0002'); pg20.evaluate("SRP.mapa.colocar(19.43275, -99.13305, 'x', { origen: 'gps', precision: 5 })")
    pg20.fill('#campo-especie','aile'); pg20.wait_for_timeout(150); pg20.dispatch_event('.combo-opcion[data-id="ESP-0002"]','mousedown'); pg20.wait_for_timeout(120)
    pg20.click('#form-plantacion button[type=submit]'); pg20.wait_for_timeout(800)
    if pg20.is_visible('#dlg-resumen'): pg20.click('#btn-resumen-guardar'); pg20.wait_for_timeout(600)
    pg20.click('#btn-jornada-cerrar'); pg20.wait_for_timeout(300); pg20.click('#btn-confirmar-si'); pg20.wait_for_timeout(1200)
    # Los informes por periodo viven en su propia pestaña (Mi avance para el cabo)
    pg20.click('.pestana[data-vista=supervision]'); pg20.wait_for_timeout(900)
    abrir_sup(pg20)
    ok(pg20.is_visible('#vista-supervision') and 'Mi avance' in pg20.inner_text('.pestana[data-vista=supervision]'),'los informes por periodo se generan en la pestaña Mi avance')
    def pdf20():
        with pg20.expect_download() as d: pg20.click('#btn-sup-pdf')
        ruta=sal('informe_prueba.pdf'); d.value.save_as(ruta)
        t=' '.join((p.extract_text() or '') for p in _Pdf(ruta).pages)
        return d.value.suggested_filename, ' '.join(t.split()), os.path.getsize(ruta)
    n1,t1,peso1=pdf20()
    ok(re.fullmatch(r'Informe_semanal_\d{4}-\d{2}-\d{2}_al_\d{4}-\d{2}-\d{2}\.pdf', n1) is not None and 'INFORME SEMANAL DE PLANTACIÓN' in t1 and 'Cabo: Fulana' in t1
       and 'POR CABO' not in t1 and 'Árboles plantados' in t1 and peso1 < 200000,
       'el cabo descarga su informe semanal en PDF, con membrete y sin la tabla por cabo: %s (%d KB)' % (n1, peso1//1024))
    # La coordinación: informe mensual de una alcaldía, con sus colonias, y la tabla en CSV
    entrar20('u-coord-1')
    pg20.click('#sup-tipos .chip[data-tipo=mes]'); pg20.wait_for_timeout(300)
    pg20.click('#sup-filtros summary'); pg20.wait_for_timeout(150)
    pg20.select_option('#sup-alcaldia','Cuauhtémoc'); pg20.wait_for_timeout(400)
    n2,t2,_=pdf20()
    ok(n2=='Informe_mensual_'+HOY[:7]+'_Cuauhtemoc.pdf' and 'ALCALDÍA CUAUHTÉMOC' in t2 and 'POR COLONIA' in t2 and 'POR CABO' in t2 and 'Fulana' in t2
       and 'Cuadrilla de' in t2 and 'Documento de prueba' in t2,
       'la coordinación descarga el informe mensual de una alcaldía, con sus colonias y la tabla por cabo: %s' % n2)
    with pg20.expect_download() as dc: pg20.click('#btn-sup-csv')
    dc.value.save_as(sal('arboles_prueba.csv'))
    csv20=open(sal('arboles_prueba.csv'), encoding='utf-8', newline='').read()
    lineas=csv20.lstrip('﻿').strip().split('\r\n')
    ok(dc.value.suggested_filename=='Arboles_mensual_'+HOY[:7]+'_Cuauhtemoc.csv' and csv20.startswith('﻿"Folio","Fecha de plantación"') and len(lineas)==3
       and all('"Cuauhtémoc"' in l and '"Jardín del informe"' in l for l in lineas[1:]),
       'y la tabla en CSV, un renglón por árbol, con acentos para Excel: %s, %d renglones' % (dc.value.suggested_filename, len(lineas)))
    esc20=pg20.evaluate("SRP.informes.texto({ detalle: [{ folio: 'a\"b', jornada: 'x, y' }] }).split('\\r\\n')[1]")
    ok(esc20.startswith('"a""b"') and '"x, y"' in esc20,'el CSV escapa comillas y comas: %s' % esc20[:30])
    pg20.evaluate("SRP.supervision.filtros.alcaldia = 'Tlalpan'; SRP.supervision.pintar()"); pg20.wait_for_timeout(400)   # sin jornadas: ya no se ofrece en la lista (D202)
    ok(pg20.is_disabled('#btn-sup-pdf') and pg20.is_disabled('#btn-sup-csv'),'sin jornadas cerradas no se ofrece informe ni tabla')
    ok(not err20,'sin errores en consola: %s' % err20[:2])
    ctx20.close()

    # ---------- Bloque 99: datos de demostración (D160) ----------
    import time as _t
    ctx21=b.new_context(viewport={'width':390,'height':844},accept_downloads=True)
    pg21=ctx21.new_page(); err21=[]
    pg21.on('pageerror', lambda e: err21.append(str(e))); pg21.on('console', lambda m: m.type=='error' and 'net::' not in m.text and 'Failed to load' not in m.text and err21.append(m.text))
    pg21.goto(BASE); pg21.wait_for_timeout(1200)
    def entrar21(uid):
        if not pg21.is_visible('#sel-usuario-prueba'):
            pg21.evaluate("SRP.app.menuCuenta(false)"); pg21.click('#btn-cuenta'); pg21.click('#btn-cambiar-perfil'); pg21.wait_for_timeout(200)
        pg21.select_option('#sel-usuario-prueba', uid); pg21.click('#btn-entrar-prueba'); pg21.wait_for_timeout(900)
    def estado21(): return pg21.inner_text('#demo-estado')
    ok(not pg21.is_visible('#caja-demo'),'en el acceso no se ofrecen los datos de demostración')
    entrar21('u-admin-1')
    # Algo propio antes de cargar: una jornada con un árbol, que la carga y el retiro no tocan
    pg21.evaluate("""async () => { const j = { id: 'propia-j1', nombre: 'Jornada propia', ubicacion: '', programa_id: 'p-refor', lat: 19.4326, lng: -99.1332, punto_origen: 'gps', gps_precision_m: 5,
      alcaldia_cve: '09015', alcaldia: 'Cuauhtémoc', colonia_cve: null, colonia: null, fecha: '%s', comentarios: '', cabo_id: 'u-cabo-1', estatus: 'abierta', fecha_inicio: new Date().toISOString(), fecha_cierre: null,
      encargado_id: 'u-cabo-1', editado_por_id: null, fecha_ultima_edicion: null, arboles_previstos: null, puntos_revisados: [], reporte_en: null,
      personal: '', apoyo: '', observaciones: '', chofer: '', vehiculo_modelo: '', vehiculo_placa: '', hora: '' };
      await SRP.almacen._tx(['jornadas'], 'readwrite', tx => tx.objectStore('jornadas').put(j)); }""" % HOY)
    pg21.locator('#caja-demo').scroll_into_view_if_needed()
    ok(pg21.is_visible('#caja-demo') and 'Casi tres años' in estado21() and pg21.inner_text('#btn-demo-cargar')=='Cargar datos de demostración' and pg21.is_disabled('#btn-demo-quitar'),
       'al pie, con sesión: «Datos de demostración», con «Cargar» y «Quitar» (apagado, no hay nada que quitar)')
    pg21.click('#btn-demo-cargar'); pg21.wait_for_timeout(300)
    dlg21=pg21.inner_text('#dlg-confirmar')
    ok('17,000 árboles' in dlg21 and 'otras instituciones' in dlg21 and 'no se toca' in dlg21,'antes de cargar se dice cuánto se agrega y que lo capturado no se toca')
    t0=_t.time(); pg21.click('#btn-confirmar-si'); pg21.wait_for_timeout(300)
    ok(pg21.get_attribute('#btn-demo-cargar','aria-busy')=='true' and pg21.is_disabled('#btn-demo-quitar'),'mientras carga, el botón dice «Cargando…» y no se puede quitar')
    esperar(pg21,"document.getElementById('demo-estado').textContent.startsWith('Cargados')",90000)
    seg21=_t.time()-t0
    c21=pg21.evaluate("""async () => { const j=await SRP.almacen.todos('jornadas'), a=await SRP.almacen.todos('plantaciones'), u=await SRP.almacen.todos('usuarios'), bi=await SRP.almacen.todos('bitacora');
      const hoy=SRP.util.fechaHoy(), dj=j.filter(x=>SRP.demo.es(x.id)), da=a.filter(x=>SRP.demo.es(x.id)), anios={}, cabos={};
      da.forEach(x=>{anios[x.fecha_plantacion.slice(0,4)]=1}); dj.forEach(x=>{cabos[x.cabo_id]=1});
      return { j: dj.length, a: da.filter(x=>x.estatus==='activo').length, u: u.filter(x=>SRP.demo.es(x.id)).length, anios: Object.keys(anios).sort(), cabos: Object.keys(cabos).length,
        viejas: dj.filter(x=>x.estatus==='abierta' && x.fecha<hoy).length, deHoy: dj.filter(x=>x.estatus==='abierta' && x.fecha===hoy).length,
        sinAlcaldia: da.filter(x=>!x.alcaldia).length, sinFolio: da.filter(x=>x.fecha_plantacion<hoy && x.estatus==='activo' && !SRP.folio.valido(x.folio)).length,
        conFolioHoy: da.filter(x=>x.fecha_plantacion===hoy && x.folio).length, fotos: da.filter(x=>x.foto_base64).length, elim: da.filter(x=>x.estatus==='eliminado').length,
        bit: bi.filter(x=>SRP.demo.es(x.id)).length, sinReporte: dj.filter(x=>x.estatus==='cerrada' && !x.reporte_en).length,
        propia: !!j.find(x=>x.id==='propia-j1'), sembr: JSON.stringify(dj).search(/sembr|siembr/i) }; }""")
    ok(c21['j']>=1200 and c21['a']>=15000 and c21['u']==16 and c21['anios']==['2024','2025','2026'] and c21['cabos']==26,
       'se cargan %d jornadas y %d árboles de 2024, 2025 y 2026, registrados por 26 cuentas (20 cabos y 6 coordinaciones, de SEDEMA y de fuera), con 16 cuentas de demostración, en %.1f s' % (c21['j'],c21['a'],seg21))
    ok(c21['viejas']==2 and c21['deHoy']==2 and c21['sinReporte']>0 and c21['elim']>0 and c21['fotos']>0,
       'con lo que la supervisión debe encontrar: 2 jornadas abiertas de días anteriores, 2 de hoy, %d sin reporte, %d eliminados, %d fotografías' % (c21['sinReporte'],c21['elim'],c21['fotos']))
    ok(c21['sinAlcaldia']==0 and c21['sinFolio']==0 and c21['bit']>c21['a'] and c21['propia'] and c21['sembr']==-1,
       'cada árbol con su territorio derivado, folio en lo anterior a hoy y su renglón de bitácora; lo propio sigue ahí')
    ok('Cargados: ' in estado21() and pg21.inner_text('#btn-demo-cargar')=='Volver a cargar' and not pg21.is_disabled('#btn-demo-quitar') and 'Cambiar usuario (pruebas)' in pg21.inner_text('#aviso'),
       'al terminar, el pie dice cuánto hay y ofrece «Volver a cargar» y «Quitar»: %s' % estado21()[:60])
    # Supervisión con volumen: la coordinación de prueba ve su cuadrilla; la de demostración, la suya
    pg21.evaluate("SRP.app.mostrarVista('supervision')"); pg21.wait_for_timeout(600)
    abrir_sup(pg21)
    pg21.click('#sup-tipos .chip[data-tipo=anio]'); pg21.wait_for_timeout(300); pg21.click('#sup-anterior'); pg21.wait_for_timeout(900)
    ok(pg21.inner_text('#sup-etiqueta')=='Año 2025' and pg21.locator('.sup-tabla-cabos tbody tr').count()==26,'la administración ve el año 2025 completo: sus 20 cabos activos —también los que no trabajaron ese año, como el de la empresa, que empezó en 2026: así se ve quién falta— y las 6 coordinaciones que registraron')
    LIS21="document.querySelectorAll('details[data-seccion=cabos] > .sup-seccion-cuerpo > .sup-tabla-caja tbody tr:not([hidden])').length"
    vis21=pg21.evaluate(LIS21)
    mas21=pg21.locator('button[data-mas=cabos]')
    ok(vis21==10 and mas21.count()==1 and re.fullmatch(r'Mostrar 10 más \(10 de [\d,]+\)', mas21.inner_text()) is not None,'de una lista larga —quienes tuvieron jornadas en el año— se ven los 10 primeros y «%s» (D168)' % (mas21.inner_text() if mas21.count() else '—'))
    mas21.click(); pg21.wait_for_timeout(200)
    ok(pg21.evaluate(LIS21)==20 and re.match(r'Mostrar \d+ más \(20 de ', mas21.inner_text()) is not None,'«Mostrar más» suma diez: %s' % mas21.inner_text())
    total21=int(mas21.get_attribute('data-total'))
    pg21.evaluate("(() => { const b = document.querySelector('button[data-mas=cabos]'); b.dataset.vistas = String(Number(b.dataset.total) - 1); b.click(); })()"); pg21.wait_for_timeout(200)
    todas21=pg21.evaluate(LIS21)
    ok(todas21==total21 and todas21>20 and mas21.inner_text()=='Mostrar sólo las primeras 10','al llegar al final se ven las %d y el botón ofrece «Mostrar sólo las primeras 10»' % todas21)
    mas21.click(); pg21.wait_for_timeout(200)
    ok(pg21.evaluate(LIS21)==10,'y las vuelve a ocultar')
    pg21.click('#sup-filtros summary'); pg21.wait_for_timeout(150); pg21.select_option('#sup-alcaldia','Gustavo A. Madero'); pg21.wait_for_timeout(700)
    col21=pg21.locator('button[data-mas=colonias]')
    ok(col21.count()==1 and pg21.evaluate("document.querySelectorAll('#sup-cuerpo .sup-tabla tbody tr[data-extra=colonias]').length")>5,'las colonias de una alcaldía también se cortan en 10: «%s»' % (col21.inner_text() if col21.count() else '—'))
    with pg21.expect_download() as d21: pg21.click('#btn-sup-pdf')
    d21.value.save_as(sal('demo_prueba.pdf'))
    from pypdf import PdfReader as _Pdf21
    txt21=' '.join(' '.join((p.extract_text() or '') for p in _Pdf21(sal('demo_prueba.pdf')).pages).split())
    ok(d21.value.suggested_filename=='Informe_anual_2025_Gustavo_A_Madero.pdf' and 'POR COLONIA' in txt21 and 'Marisol' in txt21,'el informe anual de una alcaldía sale con los datos de demostración: %s' % d21.value.suggested_filename)
    entrar21('u-coord-1'); esperar(pg21,"SRP.supervision.datos && SRP.sesion.usuario && SRP.supervision.datos.usuario.id === SRP.sesion.usuario.id",30000); pg21.wait_for_timeout(300)
    cab21=pg21.evaluate("SRP.supervision.datos.cabos.slice().sort()")
    ok(pg21.inner_text('#sup-etiqueta').startswith('Semana') and pg21.inner_text('#sup-filtros-texto')=='Más filtros: alcaldía, programa, origen y quién registró',
       'quien entra con otra cuenta empieza en la semana en curso y sin filtros: no hereda el año ni la alcaldía de la cuenta anterior')
    ok(cab21==['u-cabo-1','u-demo-c1','u-demo-c2','u-demo-c3'],'la coordinación de prueba tiene su cuadrilla de demostración: %s' % cab21)
    entrar21('u-demo-k1'); esperar(pg21,"SRP.supervision.datos && SRP.sesion.usuario && SRP.supervision.datos.usuario.id === SRP.sesion.usuario.id",30000); pg21.wait_for_timeout(300)
    cab21=pg21.evaluate("SRP.supervision.datos.cabos.slice().sort()")
    ok(cab21==['u-demo-c4','u-demo-c5','u-demo-c6'] and pg21.is_visible('#vista-supervision'),'la coordinación de demostración entra a Supervisión con sus tres cabos')
    entrar21('u-demo-c5')
    pg21.click('.pestana[data-vista=supervision]'); pg21.wait_for_timeout(500); pg21.click('#sup-tipos .chip[data-tipo=todo]'); pg21.wait_for_timeout(700)
    abrir_sup(pg21)
    ok(pg21.inner_text('#titulo-supervision')=='Mi avance' and int(pg21.inner_text('.sup-cifra b').replace(',',''))>500 and 'jornada de un día anterior sigue abierta' in pg21.inner_text('#sup-cuerpo'),
       'una cabo de demostración ve Mi avance de casi tres años y su jornada abierta de antes')
    # Quitar: lo de demostración se va; lo propio se queda, y también la jornada donde se registró un árbol propio
    pg21.evaluate("""async () => { const a = await SRP.almacen.uno('plantaciones','demo-a-000010'); await SRP.almacen._tx(['plantaciones'],'readwrite', tx => tx.objectStore('plantaciones').put(Object.assign({}, a, { id: 'propio-a1', folio: null }))); }""")
    ref21=pg21.evaluate("(async () => { const a=await SRP.almacen.uno('plantaciones','demo-a-000123'); return [a.lat,a.lng,a.especie_id,a.jornada_id,a.fecha_plantacion] })()")
    jc21=pg21.evaluate("(async () => (await SRP.almacen.uno('plantaciones','propio-a1')).jornada_id)()")
    pg21.locator('#caja-demo').scroll_into_view_if_needed(); pg21.click('#btn-demo-quitar'); pg21.wait_for_timeout(300)
    esperar(pg21, "document.getElementById('dlg-confirmar').open", 4000)   # con la base de demostración, contar lo que se va tarda
    ok('Lo que usted capturó se queda.' in pg21.inner_text('#dlg-confirmar') and 'cuentas de demostración' in pg21.inner_text('#dlg-confirmar'),'antes de quitar se dice qué se va y que lo capturado se queda')
    pg21.click('#btn-confirmar-si'); pg21.wait_for_timeout(300)
    esperar(pg21,"!document.getElementById('btn-demo-quitar').hasAttribute('aria-busy') && SRP.app.vista !== 'supervision'",20000)
    ok(pg21.is_visible('#vista-acceso') and not pg21.is_visible('#caja-demo'),'quien estaba dentro con una cuenta de demostración que se quitó vuelve al acceso')
    q21=pg21.evaluate("""async () => { const j=await SRP.almacen.todos('jornadas'), a=await SRP.almacen.todos('plantaciones'), u=await SRP.almacen.todos('usuarios'), bi=await SRP.almacen.todos('bitacora');
      return { j: j.filter(x=>SRP.demo.es(x.id)).map(x=>x.id), a: a.filter(x=>SRP.demo.es(x.id)).length, propio: !!a.find(x=>x.id==='propio-a1'), propia: !!j.find(x=>x.id==='propia-j1'),
        u: u.filter(x=>SRP.demo.es(x.id)).map(x=>x.id).sort(), bit: bi.filter(x=>SRP.demo.es(x.id) || SRP.demo.es(x.entidad_id)).length,
        rec: Object.keys(SRP.envio.leer().recibidos).filter(id=>SRP.demo.es(id)).length, sel: [...document.querySelectorAll('#sel-usuario-prueba option')].map(o=>o.value).filter(v=>SRP.demo.es(v)).sort() } }""")
    ok(q21['a']==0 and q21['bit']==0 and q21['rec']==0 and q21['propio'] and q21['propia'],'se quitan los árboles, la bitácora y los envíos de demostración; la jornada y el árbol propios siguen')
    ok(q21['j']==[jc21] and q21['u']==['u-demo-c6','u-demo-k1'] and q21['sel']==q21['u'],
       'se conserva la jornada de demostración donde se registró un árbol propio, con su cabo y su coordinación: %s, %s' % (q21['j'], q21['u']))
    entrar21('u-admin-1'); pg21.locator('#caja-demo').scroll_into_view_if_needed()
    ok(pg21.inner_text('#btn-demo-cargar')=='Recuperar datos de demostración' and pg21.is_disabled('#btn-demo-quitar') and 'Casi tres años' in estado21(),
       'después de quitarlos, el pie ofrece «Recuperar datos de demostración»')
    pg21.click('#btn-demo-cargar'); pg21.wait_for_timeout(300); pg21.click('#btn-confirmar-si'); pg21.wait_for_timeout(500)
    esperar(pg21,"document.getElementById('demo-estado').textContent.startsWith('Cargados')",90000)
    ref21b=pg21.evaluate("(async () => { const a=await SRP.almacen.uno('plantaciones','demo-a-000123'); return [a.lat,a.lng,a.especie_id,a.jornada_id,a.fecha_plantacion] })()")
    n21=pg21.evaluate("SRP.demo.contar()")
    ok(ref21b==ref21 and n21['jornadas']==c21['j'] and n21['arboles']==c21['a'] and n21['cuentas']==16,'al recuperarlos vuelven iguales: mismas jornadas, mismos árboles en el mismo lugar (%d y %d)' % (n21['jornadas'],n21['arboles']))
    # Con datos reales no se carga nada
    ok(pg21.evaluate("(async () => { SRP.CONFIG.ES_FICTICIO = false; const r = await SRP.demo.cargar(); SRP.CONFIG.ES_FICTICIO = true; return r === null })()"),'con datos reales (ES_FICTICIO apagado) no se carga nada')
    ok(not err21,'sin errores en consola: %s' % err21[:2])
    ctx21.close()

    # ---------- Bloque 99b: la versión nueva llega con una recarga (D161) ----------
    # GitHub Pages manda la página con «Cache-Control: max-age=600»: el navegador podía servir la
    # copia vieja hasta 10 minutos aunque ya estuviera publicada la nueva. Se reproduce con un
    # servidor propio que manda esa cabecera y una copia de la app cuya página se cambia.
    import http.server as _hs, threading as _th, shutil as _sh, tempfile as _tf, functools as _ft
    _app = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
    raiz22 = _tf.mkdtemp()
    for _n in ['index.html', 'sw.js', 'manifest.webmanifest']: _sh.copy(os.path.join(_app, _n), raiz22)
    for _d in ['js', 'css', 'vendor', 'assets']: os.symlink(os.path.join(_app, _d), os.path.join(raiz22, _d))
    class _H22(_hs.SimpleHTTPRequestHandler):
        def end_headers(self):
            if self.path.split('?')[0] in ('/', '/index.html'): self.send_header('Cache-Control', 'max-age=600')
            super().end_headers()
        def log_message(self, *a): pass
    srv22 = _hs.ThreadingHTTPServer(('127.0.0.1', 8095), _ft.partial(_H22, directory=raiz22))
    _th.Thread(target=srv22.serve_forever, daemon=True).start()
    ctx22 = b.new_context(viewport={'width': 390, 'height': 844})
    pg22 = ctx22.new_page(); err22 = []
    pg22.on('pageerror', lambda e: err22.append(str(e)))
    B22 = 'http://127.0.0.1:8095/'
    pg22.goto(B22); pg22.wait_for_timeout(1500)
    ok(esperar(pg22, "!!(navigator.serviceWorker && navigator.serviceWorker.controller)", 20000), 'la copia con caché de 10 minutos queda con su service worker')
    pg22.goto(B22); pg22.wait_for_timeout(1200)
    antes22 = pg22.inner_text('.pie p')
    _idx = os.path.join(raiz22, 'index.html')
    _t = open(_idx, encoding='utf-8').read().replace('Sistema de Registro de Plantaciones. Versión', 'Sistema de Registro de Plantaciones (publicación nueva). Versión', 1)
    open(_idx, 'w', encoding='utf-8').write(_t)
    pg22.goto(B22); pg22.wait_for_timeout(1500)
    despues22 = pg22.inner_text('.pie p')
    ok('publicación nueva' not in antes22 and 'publicación nueva' in despues22,
       'publicada una versión nueva, basta abrir la app una vez para verla aunque el servidor diga que la página dura 10 minutos: «%s»' % despues22[:70])
    pg22.context.set_offline(True)
    pg22.goto(B22); pg22.wait_for_timeout(1500)
    ok('Sistema de Registro de Plantaciones' in pg22.inner_text('.pie p') and pg22.is_visible('#vista-registrar, #vista-acceso'), 'y sin señal sigue abriendo')
    pg22.context.set_offline(False)
    ok(not err22, 'sin errores en consola: %s' % err22[:2])
    ctx22.close(); srv22.shutdown(); _sh.rmtree(raiz22, ignore_errors=True)

    # ---------- Bloque 100: catálogo de vehículos en el reporte (D162) ----------
    from pypdf import PdfReader as _Pdf23
    ctx23=b.new_context(viewport={'width':390,'height':844},geolocation={'latitude':19.4326,'longitude':-99.1332,'accuracy':5},permissions=['geolocation'],accept_downloads=True)
    pg23=ctx23.new_page(); err23=[]
    pg23.on('pageerror', lambda e: err23.append(str(e))); pg23.on('console', lambda m: m.type=='error' and 'net::' not in m.text and 'Failed to load' not in m.text and err23.append(m.text))
    pg23.goto(BASE); pg23.wait_for_timeout(1200)
    def entrar23(uid):
        pg23.evaluate("document.getElementById('aviso').hidden = true")   # un aviso no tapa el menú de la cuenta
        if not pg23.is_visible('#sel-usuario-prueba'):
            pg23.evaluate("SRP.app.menuCuenta(false)"); pg23.click('#btn-cuenta'); pg23.click('#btn-cambiar-perfil'); pg23.wait_for_timeout(200)
        pg23.select_option('#sel-usuario-prueba', uid); pg23.click('#btn-entrar-prueba'); pg23.wait_for_timeout(900)
    def catalogo23(tipo):
        pg23.evaluate("document.getElementById('aviso').hidden = true")
        pg23.evaluate("SRP.app.menuCuenta(false)"); pg23.click('#btn-cuenta'); pg23.click('#btn-ir-configuracion'); pg23.wait_for_timeout(300); pg23.click('.cfg-tarjeta[data-ir=catalogos]'); pg23.wait_for_timeout(400)
        pg23.click('#cat-tipos .chip[data-tipo=%s]' % tipo); pg23.wait_for_timeout(400)
    entrar23('u-admin-1')
    catalogo23('vehiculo')
    ths23=[t.strip() for t in pg23.eval_on_selector_all('#tabla-catalogo thead th','l=>l.map(x=>x.textContent)')]
    ok(pg23.locator('#tabla-catalogo tbody tr[data-id]').count()==16 and ths23[:3]==['Placa','Modelo','Tipo'] and 'Clave' not in ths23 and pg23.inner_text('#cat-cuenta').startswith('16 vehículos'),
       'Catálogos › Vehículos trae los 16 de las cuadrillas, con placa, modelo y tipo: %s · %s' % (ths23[:3], pg23.inner_text('#cat-cuenta')))
    v23=pg23.evaluate("[SRP.ref.catalogoPorId['v-PRU006'], SRP.ref.catalogoPorId['v-PRU011'], SRP.ref.catalogoPorId['v-PRU003']]")
    ok(v23[0]['nombre']=='PRU 006' and v23[0]['modelo']=='Dodge' and v23[0]['tipo_vehiculo']=='Estacas' and 'es_ficticio' not in v23[0] and v23[1]['tipo_vehiculo']=='Grúa' and v23[2]['tipo_vehiculo']=='Pick up',
       'escritos como el resto de los catálogos: «PRU 006», «Dodge», «Estacas», «Grúa», «Pick up», con placas ficticias de prueba')
    pg23.click('#btn-cat-agregar'); pg23.wait_for_timeout(300)
    ok(pg23.inner_text('#dlg-catalogo-titulo')=='Agregar vehículo' and pg23.inner_text('#etq-cat-nombre-texto')=='Placa' and pg23.is_visible('#cat-modelo') and pg23.is_visible('#cat-tipo-vehiculo')
       and not pg23.is_visible('#cat-clave') and not pg23.is_visible('#cat-cientifico'), 'el alta pide placa, modelo y tipo; la clave no se escribe')
    tipos23=pg23.eval_on_selector_all('#cat-tipos-vehiculo option','l=>l.map(o=>o.value)')
    ok(tipos23==['Doble cabina','Estacas','Grúa','Pick up','Pipa','Redilas'],'al escribir el tipo se proponen los que ya hay: %s' % tipos23)
    pg23.click('#btn-cat-guardar'); pg23.wait_for_timeout(300)
    e23=pg23.inner_text('#cat-errores')
    ok('Escriba la placa' in e23 and 'Escriba el modelo' in e23 and 'Escriba el tipo' in e23,'sin datos, dice qué falta: placa, modelo y tipo')
    pg23.fill('#cat-nombre','pru005'); pg23.fill('#cat-modelo','Dodge'); pg23.fill('#cat-tipo-vehiculo','estacas'); pg23.click('#btn-cat-guardar'); pg23.wait_for_timeout(300)
    ok(pg23.input_value('#cat-nombre')=='PRU005' and 'Ya existe un vehículo con esa placa' in pg23.inner_text('#cat-errores'),
       'la placa se escribe en mayúsculas, y una que ya está no se repite aunque falte el espacio')
    pg23.fill('#cat-nombre','abc 1234'); pg23.fill('#cat-modelo','Toyota'); pg23.fill('#cat-tipo-vehiculo','pick up'); pg23.click('#btn-cat-guardar'); pg23.wait_for_timeout(600)
    n23=pg23.evaluate("SRP.ref.deTipo('vehiculo').find(v => v.nombre === 'ABC 1234') || null")
    ok(n23 is not None and n23['clave']=='ABC1234' and n23['modelo']=='Toyota' and n23['tipo_vehiculo']=='Pick up' and not pg23.is_visible('#dlg-catalogo') and pg23.inner_text('#cat-cuenta').startswith('17 vehículos'),
       'uno nuevo queda con su placa en mayúsculas, la clave sin espacios y el tipo con inicial mayúscula')
    # La cabo: sus jornadas anteriores con vehículo dan los frecuentes
    entrar23('u-cabo-1')
    pg23.evaluate("""async () => { const base = { ubicacion: '', programa_id: 'p-refor', lat: 19.43, lng: -99.13, punto_origen: 'gps', gps_precision_m: 5, alcaldia_cve: '09015', alcaldia: 'Cuauhtémoc', colonia_cve: null, colonia: null,
        comentarios: '', cabo_id: 'u-cabo-1', estatus: 'cerrada', fecha_cierre: '2026-09-01T14:00:00Z', encargado_id: 'u-cabo-1', editado_por_id: null, fecha_ultima_edicion: null,
        arboles_previstos: 5, puntos_revisados: [], reporte_en: '2026-09-01T15:00:00Z', personal: '', apoyo: '', observaciones: '', chofer: '', hora: '' };
      const v = id => { const c = SRP.ref.catalogoPorId[id]; return { vehiculo_id: id, vehiculo_placa: c.nombre, vehiculo_modelo: c.modelo, vehiculo_tipo: c.tipo_vehiculo }; };
      const js = [['jv1', '2026-09-01', 'v-PRU012'], ['jv2', '2026-09-02', 'v-PRU012'], ['jv3', '2026-09-03', 'v-PRU010']].map(([id, fecha, veh]) => Object.assign({}, base, { id, nombre: 'Anterior ' + id, fecha, fecha_inicio: fecha + 'T08:00:00Z' }, v(veh)));
      await SRP.almacen._tx(['jornadas'], 'readwrite', tx => js.forEach(j => tx.objectStore('jornadas').put(j))); }""")
    iniciar_jornada(pg23,'Jornada con camioneta',HOY)
    pg23.click('#btn-ubicacion'); pg23.wait_for_timeout(700)
    pg23.fill('#campo-especie','aile'); pg23.wait_for_timeout(200); pg23.dispatch_event('.combo-opcion[data-id="ESP-0002"]','mousedown'); pg23.wait_for_timeout(150)
    pg23.click('#form-plantacion button[type=submit]'); pg23.wait_for_timeout(800)
    if pg23.is_visible('#dlg-resumen'): pg23.click('#btn-resumen-guardar'); pg23.wait_for_timeout(600)
    pg23.click('#btn-jornada-cerrar'); pg23.wait_for_timeout(300); pg23.click('#btn-confirmar-si'); pg23.wait_for_timeout(1000)
    reporte_de(pg23,'Jornada con camioneta')
    grupos23=pg23.evaluate("[...document.querySelectorAll('#cie-vehiculo optgroup')].map(g => g.label)")
    ultimo23=pg23.evaluate("[...document.querySelectorAll('#cie-vehiculo option')].slice(-1)[0].textContent")
    ok(grupos23==['Doble cabina','Estacas','Grúa','Pick up','Pipa','Redilas'] and ultimo23!='Otro vehículo' and pg23.locator('#cie-vehiculo option[value="__otro__"]').count()==0 and pg23.input_value('#cie-vehiculo')=='',
       'en el cierre, las placas van agrupadas por tipo, sin «Otro vehículo» (D174); empieza sin vehículo: %s' % grupos23)
    chips23=pg23.eval_on_selector_all('#cie-vehiculo-frecuentes .chip','l=>l.map(x=>x.dataset.id)')
    ok(chips23==['v-PRU012','v-PRU010'] and 'Estacas' in pg23.inner_text('#cie-vehiculo-frecuentes .chip[data-id="v-PRU012"]'),
       'arriba, a un toque, los que más ha usado la cabo, el más usado primero: %s' % chips23)
    pg23.click('#cie-vehiculo-frecuentes .chip[data-id="v-PRU012"]'); pg23.wait_for_timeout(200)
    ok(pg23.input_value('#cie-vehiculo')=='v-PRU012' and pg23.inner_text('#cie-vehiculo-ficha')=='Ford · Estacas'
       and pg23.get_attribute('#cie-vehiculo-frecuentes .chip[data-id="v-PRU012"]','aria-pressed')=='true','un toque elige la placa, y el modelo y el tipo se ponen solos: Ford · Estacas')
    pg23.select_option('#cie-vehiculo','v-PRU005'); pg23.wait_for_timeout(200)
    c23=pg23.evaluate("SRP.reportes.cierrePrevisto()")
    ok(pg23.inner_text('#cie-vehiculo-ficha')=='Dodge · Estacas' and [c23['vehiculo_id'],c23['vehiculo_placa'],c23['vehiculo_modelo'],c23['vehiculo_tipo']]==['v-PRU005','PRU 005','Dodge','Estacas'],
       'eligiendo en la lista pasa igual, y la jornada guarda el vehículo y la copia de sus tres datos')
    pg23.click('#btn-cierre-generar'); pg23.wait_for_timeout(600)
    ok(all(t in pg23.inner_text('#previa-hoja') for t in ['Tipo: Estacas','Modelo: Dodge','Placas: PRU 005']),'la vista previa trae los datos del vehículo: tipo, modelo y placas (D163)')
    with pg23.expect_download() as d23: pg23.click('#btn-previa-generar')
    d23.value.save_as(sal('reporte_vehiculo.pdf'))
    t23=' '.join(' '.join((p.extract_text() or '') for p in _Pdf23(sal('reporte_vehiculo.pdf')).pages).split())
    ok(all(t in t23 for t in ['Tipo:','Modelo:','Placas:','Estacas','Dodge','PRU 005']),'y el PDF también')
    g23=pg23.evaluate("(async () => { const j = (await SRP.almacen.todos('jornadas')).find(x => x.nombre === 'Jornada con camioneta'); return [j.vehiculo_id, j.vehiculo_placa, j.vehiculo_modelo, j.vehiculo_tipo]; })()")
    ok(g23==['v-PRU005','PRU 005','Dodge','Estacas'],'guardado en la jornada: %s' % g23)
    # Sin vehículo: los tres datos quedan vacíos (D174)
    reporte_de(pg23,'Jornada con camioneta')
    ok(pg23.input_value('#cie-vehiculo')=='v-PRU005' and pg23.inner_text('#cie-vehiculo-ficha')=='Dodge · Estacas','al regenerar, el vehículo ya viene elegido')
    pg23.select_option('#cie-vehiculo',''); pg23.wait_for_timeout(200)
    c23=pg23.evaluate("SRP.reportes.cierrePrevisto()")
    ok(c23['vehiculo_id'] is None and c23['vehiculo_placa']=='' and c23['vehiculo_modelo']=='' and c23['vehiculo_tipo']=='' and pg23.is_hidden('#cie-vehiculo-ficha'),'«Sin vehículo» guarda los tres datos vacíos')
    # Una jornada de antes del catálogo con la placa escrita a mano se reconoce si la placa está
    pg23.evaluate("SRP.reportes.prepararVehiculo({ vehiculo_placa: 'pru009', vehiculo_modelo: 'Camión' })"); pg23.wait_for_timeout(200)
    ok(pg23.input_value('#cie-vehiculo')=='v-PRU009' and pg23.inner_text('#cie-vehiculo-ficha')=='Internacional · Redilas','una placa escrita a mano antes del catálogo se reconoce: PRU009 → PRU 009, Internacional · Redilas')
    pg23.evaluate("SRP.reportes.prepararVehiculo({ vehiculo_placa: 'DEM-123', vehiculo_modelo: 'Camioneta de redilas' })"); pg23.wait_for_timeout(200)
    ok(pg23.input_value('#cie-vehiculo')=='' and 'DEM-123' not in pg23.inner_text('#dlg-cierre'),'y una que no está abre sin vehículo: lo escrito a mano ya no se ofrece (D174)')
    pg23.click('#btn-cierre-cerrar'); pg23.wait_for_timeout(200)
    # La coordinación ve los frecuentes del encargado de esa jornada
    entrar23('u-coord-1')
    reporte_de(pg23,'Jornada con camioneta')
    ok(pg23.input_value('#cie-encargado')=='u-cabo-1' and pg23.eval_on_selector_all('#cie-vehiculo-frecuentes .chip','l=>l.map(x=>x.dataset.id)')==['v-PRU012','v-PRU010'],
       'la coordinación ve los frecuentes del encargado de la jornada (la cabo)')
    pg23.click('#btn-cierre-cerrar'); pg23.wait_for_timeout(200)
    # Uso en el catálogo: un vehículo con jornadas no se elimina
    entrar23('u-admin-1'); catalogo23('vehiculo')
    uso23=pg23.inner_text('#tabla-catalogo tr[data-id="v-PRU012"]')
    acc23=pg23.eval_on_selector_all('#tabla-catalogo tr[data-id="v-PRU012"] button[data-accion]','l=>l.map(x=>x.dataset.accion)')
    ok('2 jornadas' in uso23 and 'eliminar' not in acc23 and 'estado' in acc23,'en Catálogos, el vehículo dice en cuántas jornadas se usó y no se elimina: se desactiva')
    # Un teléfono con capturas de la versión anterior recibe los vehículos sin perder nada
    antes23=pg23.evaluate("(async () => (await SRP.almacen.todos('jornadas')).length)()")
    pg23.evaluate("""async () => { localStorage.setItem(SRP.CONFIG.CLAVE_SELLO, 'sello-viejo');
      await SRP.almacen._tx(['vehiculos'], 'readwrite', tx => SRP.ref.deTipo('vehiculo').forEach(v => tx.objectStore('vehiculos').delete(v.id))); }""")
    pg23.reload(); pg23.wait_for_timeout(1800)
    m23=pg23.evaluate("(async () => ({ arranque: SRP.almacen.arranque, n: SRP.ref.deTipo('vehiculo').length, abc: !!SRP.ref.deTipo('vehiculo').find(v => v.nombre === 'ABC 1234'), jornadas: (await SRP.almacen.todos('jornadas')).length }))()")
    ok(m23['arranque']=='conservado' and m23['n']==16 and not m23['abc'] and m23['jornadas']==antes23,
       'un teléfono con capturas de la versión anterior recibe los 16 vehículos y conserva sus %d jornadas: %s' % (antes23, m23))
    # Los datos de demostración usan los vehículos del catálogo
    d23=pg23.evaluate("""(async () => { await SRP.demo.cargar(); const j = (await SRP.almacen.todos('jornadas')).filter(x => SRP.demo.es(x.id) && x.reporte_en && x.organizacion_id === 'o-sedema');
      const bien = j.filter(x => x.vehiculo_id && SRP.ref.catalogoPorId[x.vehiculo_id] && x.vehiculo_placa === SRP.ref.catalogoPorId[x.vehiculo_id].nombre && x.vehiculo_tipo === SRP.ref.catalogoPorId[x.vehiculo_id].tipo_vehiculo).length;
      const r = await SRP.demo.quitar(); return { total: j.length, bien }; })()""")
    ok(d23['total']>300 and d23['bien']==d23['total'],'los datos de demostración usan los vehículos del catálogo en cada reporte de la Secretaría: %d de %d' % (d23['bien'], d23['total']))
    ok(not err23,'sin errores en consola: %s' % err23[:2])
    ctx23.close()

    # ---------- Bloque 101: el reporte de la jornada por secciones (D163) ----------
    from pypdf import PdfReader as _Pdf24
    ctx24=b.new_context(viewport={'width':390,'height':844},accept_downloads=True)
    pg24=ctx24.new_page(); err24=[]
    pg24.on('pageerror', lambda e: err24.append(str(e))); pg24.on('console', lambda m: m.type=='error' and 'net::' not in m.text and 'Failed to load' not in m.text and err24.append(m.text))
    pg24.goto(BASE); pg24.wait_for_timeout(1200)
    pg24.select_option('#sel-usuario-prueba','u-admin-1'); pg24.click('#btn-entrar-prueba'); pg24.wait_for_timeout(900)
    ok(pg24.evaluate("[SRP.util.fechaLarga('2026-09-24'), SRP.util.fechaLarga('2026-01-04')]")==['Jueves 24 de septiembre de 2026','Domingo 4 de enero de 2026'],
       'la fecha del reporte sale completa: «Jueves 24 de septiembre de 2026»')
    # Una jornada de demostración con reporte, muchos árboles y observaciones
    pg24.evaluate("SRP.demo.cargar()"); pg24.evaluate("SRP.app.mostrarVista('jornadas')"); pg24.wait_for_timeout(1200)
    pg24.evaluate("SRP.jornadas.aplicarAtajo('todas')"); pg24.wait_for_timeout(800)
    jid24=pg24.evaluate("(() => { const l = SRP.jornadas._todas.filter(j => j.estatus === 'cerrada').filter(j => j.registros.length >= 12 && j.dato && j.dato.vehiculo_id && j.dato.observaciones && j.dato.apoyo); return (l[0] || SRP.jornadas._todas.filter(j => j.estatus === 'cerrada').find(j => j.registros.length >= 12 && ((j.dato && j.dato.organizacion_id) || 'o-sedema') === 'o-sedema')).id; })()")
    pg24.evaluate("(id => { const j = SRP.jornadas._todas.filter(j => j.estatus === 'cerrada').find(x => x.id === id); SRP.reportes.abrir(j.registros, j.fecha, j.cabo_id, j); })('%s')" % jid24); pg24.wait_for_timeout(800)
    pg24.fill('#cie-hora','13:40'); pg24.click('#btn-cierre-generar'); pg24.wait_for_timeout(800)
    m24=pg24.evaluate("""(() => { const v = SRP.reportes.vistaPrevia; const m = SRP.reportes.modelo(v.registros, v.cierre, v.fecha, v.jornada);
      return { cabo: m.cabo, cifras: m.cifras.map(c => c.texto), ident: m.identificacion.map(x => x[0]), personal: m.personal.map(x => x[0]), vehiculo: m.vehiculo.map(x => x[0]),
        dia: m.identificacion.find(x => x[0] === 'Día de la jornada')[1], sumaPct: m.totales.reduce((s, t) => s + t.n, 0) === m.total && (m.totales.reduce((s, t) => s + t.pct, 0) === 100 || (m.totales.reduce((s, t) => s + t.pct, 0) >= 97 && m.notaTotales.includes('redondeados'))),
        sumaDist: m.graficas.distribucion.reduce((s, d) => s + d.pct, 0), dist: m.graficas.distribucion.map(d => d.clave),
        h3: [...document.querySelectorAll('#previa-hoja .previa-apartado h3')].map(h => h.textContent) }; })()""")
    ok(m24['cabo'] and m24['cifras']==['árboles plantados','previstos en la jornada','de lo previsto','especies','nativas'],'arriba, el nombre del cabo y cinco cifras: plantados, previstos, avance, especies y nativas (D168)')
    ok(m24['ident'][:3]==['Nombre de la jornada','Día de la jornada','Alcaldía'] and 'Programa' in m24['ident'] and 'Árboles previstos' not in m24['ident'] and 'Hora de finalización' in m24['ident'] and 'Observaciones' in m24['ident']
       and re.fullmatch(r'(Lunes|Martes|Miércoles|Jueves|Viernes|Sábado|Domingo) \d{1,2} de [a-z]+ de 20\d\d', m24['dia']) is not None,
       'bajo el nombre del cabo, los datos de la jornada con el día completo; lo previsto va en las cifras (D169): %s · %s' % (m24['dia'], m24['ident']))
    ok(m24['personal'][:2]==['Personal participante','Personal de apoyo'] and m24['vehiculo']==['Tipo','Modelo','Placas'],'la sección 2 es el personal (con chófer) y la 3 el vehículo: tipo, modelo y placas')
    # Sin sección de identificación ni de comentarios: seis secciones (D169)
    ok(m24['h3']==['1. Personal','2. Datos del vehículo','3. Croquis de la jornada','4. Ejemplares plantados','5. Totales por especie','6. Distribución de las especies'],
       'las secciones van en el orden pedido y numeradas: %s' % m24['h3'])
    tot24=pg24.eval_on_selector_all('#previa-hoja .previa-apartado:nth-of-type(5) thead th','l=>l.map(x=>x.textContent)')
    pie24=pg24.eval_on_selector_all('#previa-hoja .previa-apartado:nth-of-type(5) tfoot td','l=>l.map(x=>x.textContent)')
    ok(tot24==['Especie','Distribución','Ejemplares','% del total'] and pie24[-1]=='100 %' and m24['sumaPct'] and 97<=m24['sumaDist']<=100,
       'los totales por especie traen su distribución y el porcentaje del total; suman 100 o el reporte advierte el redondeo (D168)')
    gr24=pg24.evaluate("({ barras: document.querySelectorAll('#previa-hoja .previa-barra-fila').length, apilada: document.querySelectorAll('#previa-hoja .previa-apilada rect').length, meta: !!document.querySelector('#previa-hoja .previa-meta'), titulos: [...document.querySelectorAll('#previa-hoja .previa-grafica .previa-subtitulo')].map(e => e.textContent), leyenda: document.querySelector('#previa-hoja .previa-leyenda').textContent })")
    ok(gr24['barras']==0 and gr24['apilada']==len(m24['dist']) and not gr24['meta'] and gr24['titulos']==[] and 'Nativa:' in gr24['leyenda'] and 'Ejemplares por especie' not in pg24.inner_text('#previa-hoja'),'una sola gráfica, la distribución de las especies: el conteo por especie lo da la tabla de totales y el avance, la franja de cifras: %s' % gr24)
    ok(pg24.evaluate("getComputedStyle(document.querySelector('#previa-hoja .previa-dato b')).fontWeight")=='700','cada dato dice su nombre en negritas')
    ok(pg24.evaluate("document.querySelector('#previa-hoja').scrollWidth <= document.querySelector('#previa-hoja').clientWidth + 1"),'la vista previa no se sale de lado en el teléfono')
    with pg24.expect_download() as d24: pg24.click('#btn-previa-generar')
    d24.value.save_as(sal('reporte_secciones.pdf'))
    t24=' '.join(' '.join((p.extract_text() or '') for p in _Pdf24(sal('reporte_secciones.pdf')).pages).split())
    ok(all(x in t24 for x in ['REPORTE DE LA JORNADA DE PLANTACIÓN','Nombre del cabo:','Nombre de la jornada:','1. PERSONAL','2. DATOS DEL VEHÍCULO','3. CROQUIS DE LA JORNADA',
       '4. EJEMPLARES PLANTADOS','5. TOTALES POR ESPECIE','6. DISTRIBUCIÓN DE LAS ESPECIES','Día de la jornada:','Placas:']) and 'Ejemplares por especie' not in t24 and 'Avance contra lo previsto' not in t24 and 'Folio' not in t24,
       'el PDF trae la franja del cabo con los datos de la jornada y las seis secciones, con la distribución como única gráfica, sin folios')
    ok(os.path.getsize(sal('reporte_secciones.pdf')) < 250000,'y sigue pesando poco: %d KB' % (os.path.getsize(sal('reporte_secciones.pdf'))//1024))
    # El croquis encuadra todos los puntos llenando el lienzo, y aparta los que se enciman
    cr24=pg24.evaluate("""(() => { const C = SRP.croquis; const pts = [[19.4326,-99.1332],[19.43262,-99.13318],[19.43265,-99.13316],[19.43261,-99.13321],[19.4326,-99.1332]].map(([lat,lng]) => ({ lat, lng }));
      const e = C.encuadre(pts); const reales = pts.map(p => { const q = C.aPixel(p.lat, p.lng, e.z); return { x: q.x - e.origenX, y: q.y - e.origenY }; });
      const r = C.radio(pts.length); const pos = C.acomodar(reales, r); let min = 1e9;
      for (let i = 0; i < pos.length; i++) for (let k = i + 1; k < pos.length; k++) min = Math.min(min, Math.hypot(pos[i].x - pos[k].x, pos[i].y - pos[k].y));
      const lejos = [{ lat: 19.4326, lng: -99.1332 }, { lat: 19.4376, lng: -99.1282 }]; const e2 = C.encuadre(lejos);
      const a = C.aPixel(19.4376, -99.1332, e2.z), b2 = C.aPixel(19.4326, -99.1282, e2.z);
      return { z: e.z, min, r, dentro: pos.every(p => p.x > 0 && p.x < C.ANCHO && p.y > 0 && p.y < C.ALTO), llena: Math.round((b2.y - a.y) / (C.ALTO * (1 - 2 * C.MARGEN)) * 100), z2: e2.z }; })()""")
    ok(cr24['z']==20 and cr24['min'] >= 2*cr24['r'] and cr24['dentro'],'cinco árboles a un par de metros (dos en el mismo punto): ningún número se encima con otro (%d px entre centros, radio %d)' % (cr24['min'], cr24['r']))
    ok(cr24['llena']==100 and cr24['z2']!=int(cr24['z2']),'el encuadre usa el acercamiento exacto para que los puntos llenen el croquis: %s %%, nivel %.2f' % (cr24['llena'], cr24['z2']))
    pg24.evaluate("SRP.demo.quitar()")
    ok(not err24,'sin errores en consola: %s' % err24[:2])
    ctx24.close()

    # ---------- Bloque 102: comentarios por ejemplar, originales fuera del sitio y jsPDF al día (D164) ----------
    ctx25=b.new_context(viewport={'width':390,'height':844},accept_downloads=True)
    pg25=ctx25.new_page(); err25=[]
    pg25.on('pageerror', lambda e: err25.append(str(e))); pg25.on('console', lambda m: m.type=='error' and 'net::' not in m.text and 'Failed to load' not in m.text and err25.append(m.text))
    pg25.goto(BASE); pg25.wait_for_timeout(1200)
    pg25.select_option('#sel-usuario-prueba','u-admin-1'); pg25.click('#btn-entrar-prueba'); pg25.wait_for_timeout(900)
    v25=pg25.evaluate("(() => { const J = window.jspdf.jsPDF; const d = new J(); return { v: J.version, tabla: typeof d.autoTable }; })()")
    ok(v25['v']=='4.2.1' and v25['tabla']=='function','jsPDF al día (%s) y la tabla del reporte sigue disponible' % v25['v'])
    st25=pg25.evaluate("fetch('assets/fuentes/UGA_CDMX.geojson', { cache: 'no-store' }).then(r => r.status)")
    ok(st25==404,'los archivos originales ya no están dentro del sitio (assets/fuentes da %s)' % st25)
    pg25.evaluate("SRP.demo.cargar()"); pg25.evaluate("SRP.app.mostrarVista('jornadas')"); pg25.wait_for_timeout(1200)
    pg25.evaluate("SRP.jornadas.aplicarAtajo('todas')"); pg25.wait_for_timeout(800)
    # Una jornada con varios árboles: sin comentarios, y luego con dos (uno de dos renglones y espacios de sobra)
    abrir25 = """(conComentarios => { const j = SRP.jornadas._todas.filter(j => j.estatus === 'cerrada').find(x => x.registros.length >= 6 && ((x.dato && x.dato.organizacion_id) || 'o-sedema') === 'o-sedema');
      const regs = j.registros.map(r => Object.assign({}, r, { comentarios: '' }));
      if (conComentarios) { regs[1].comentarios = '  Junto a la banqueta.\\n\\n Cepa   profunda. '; regs[4].comentarios = 'Tutor colocado.'; }
      SRP.reportes.abrir(regs, j.fecha, j.cabo_id, j); })"""
    pg25.evaluate(abrir25 + '(false)'); pg25.wait_for_timeout(700)
    pg25.fill('#cie-hora','12:10'); pg25.click('#btn-cierre-generar'); pg25.wait_for_timeout(800)
    sin25=pg25.evaluate("[...document.querySelector('#previa-hoja table').querySelectorAll('thead th')].map(x => x.textContent)")
    ok(sin25==['N.º','Especie','Coordenada','Precisión','Prioridad'],'sin comentarios en los árboles, la tabla de ejemplares no lleva la columna (D169): %s' % sin25)
    pg25.evaluate("SRP.app.mostrarVista('jornadas')"); pg25.wait_for_timeout(600)
    pg25.evaluate(abrir25 + '(true)'); pg25.wait_for_timeout(700)
    pg25.fill('#cie-hora','12:10'); pg25.click('#btn-cierre-generar'); pg25.wait_for_timeout(800)
    con25=pg25.evaluate("""(() => { const t = document.querySelector('#previa-hoja table');
      return { cab: [...t.querySelectorAll('thead th')].map(x => x.textContent), filas: [...t.querySelectorAll('tbody tr')].map(tr => [...tr.children].map(td => td.innerText)),
        h3: [...document.querySelectorAll('#previa-hoja .previa-apartado h3')].map(h => h.textContent),
        ancho: document.querySelector('#previa-hoja').scrollWidth <= document.querySelector('#previa-hoja').clientWidth + 1 }; })()""")
    ok(con25['cab'][-1]=='Comentario' and not any('Comentarios por ejemplar' in h for h in con25['h3']),'los comentarios van en la tabla de ejemplares, en su columna, sin sección aparte (D169): %s' % con25['cab'])
    ok(con25['filas'][1][-1]=='Junto a la banqueta.\nCepa profunda.' and con25['filas'][4][-1]=='Tutor colocado.' and con25['filas'][0][-1]=='',
       'cada árbol con su comentario en su renglón y el texto limpio: %s' % [f[-1] for f in con25['filas'][:5]])
    ok(con25['ancho'],'y la vista previa no se sale de lado en el teléfono')
    with pg25.expect_download() as d25: pg25.click('#btn-previa-generar')
    d25.value.save_as(sal('reporte_comentarios.pdf'))
    t25=' '.join(' '.join((p.extract_text() or '') for p in _Pdf24(sal('reporte_comentarios.pdf')).pages).split())
    ok('COMENTARIOS POR EJEMPLAR' not in t25 and 'Tutor colocado.' in t25 and 'Cepa profunda.' in t25 and t25.index('Tutor colocado.') < t25.index('TOTALES POR ESPECIE'),
       'el PDF, hecho con jsPDF 4.2.1, trae los comentarios en la tabla de ejemplares (D169)')
    pg25.evaluate("SRP.demo.quitar()")
    ok(not err25,'sin errores en consola: %s' % err25[:2])
    ctx25.close()

    # ---------- Bloque 104: colores por significado; lo institucional, sólo en el PDF (D166) ----------
    ctx26=b.new_context(viewport={'width':390,'height':844},accept_downloads=True)
    pg26=ctx26.new_page(); err26=[]
    pg26.on('pageerror', lambda e: err26.append(str(e))); pg26.on('console', lambda m: m.type=='error' and 'net::' not in m.text and 'Failed to load' not in m.text and err26.append(m.text))
    pg26.goto(BASE); pg26.wait_for_timeout(1200)
    pg26.select_option('#sel-usuario-prueba','u-admin-1'); pg26.click('#btn-entrar-prueba'); pg26.wait_for_timeout(900)
    pg26.evaluate("SRP.demo.cargar()"); pg26.wait_for_timeout(800)
    # Ningún elemento de pantalla (fuera de la vista previa del reporte) se pinta con guinda o dorado
    barrer26 = """() => { const inst = ['rgb(157, 33, 72)', 'rgb(178, 142, 92)', 'rgb(122, 24, 56)']; const hallados = [];
      for (const e of document.querySelectorAll('body *')) {
        if (e.closest('#previa-hoja, .previa-hoja, #croquis, canvas')) continue;
        const r = e.getBoundingClientRect(); if (!r.width || !r.height) continue;
        const c = getComputedStyle(e);
        for (const k of ['color', 'backgroundColor', 'borderTopColor', 'borderLeftColor', 'borderBottomColor', 'fill', 'stroke', 'outlineColor'])
          if (inst.includes(c[k]) && !(k.startsWith('border') && c[k.replace('Color', 'Width')] === '0px') && !(k === 'outlineColor' && c.outlineStyle === 'none'))
            hallados.push((e.id || e.className.baseVal || e.className || e.tagName) + ':' + k);
      } return hallados; }"""
    hall26=[]
    for vista in ['registrar','jornadas','registros','catalogos','usuarios','supervision']:
        pg26.evaluate("SRP.app.mostrarVista('%s')" % vista); pg26.wait_for_timeout(700)
        hall26 += [vista+' › '+h for h in pg26.evaluate(barrer26)]
    pg26.evaluate("SRP.app.mostrarVista('jornadas')"); pg26.wait_for_timeout(600)
    pg26.locator('#lista-jornadas .jornada .jornada-boton').first.click(); pg26.wait_for_timeout(900)
    hall26 += ['detalle › '+h for h in pg26.evaluate(barrer26)]
    ok(not hall26,'en pantalla no queda guinda ni dorado: la identidad la da el logotipo (D166): %s' % hall26[:6])
    # El semáforo de los puntos: siempre círculos; azul sólo para el elegido
    pin26=pg26.evaluate("""() => { const d = document.createElement('div'); d.innerHTML = ['', 'rev', 'err', 'ok'].map(t => '<div class="pin-num"><span data-tono="' + t + '">1</span></div><span class="punto-num" data-tono="' + t + '">1</span>').join('');
      document.body.appendChild(d); const g = e => getComputedStyle(e);
      const r = [...d.querySelectorAll('.pin-num span')].map((s, i) => [g(s).backgroundColor, g(s).color, g(s).borderRadius, g(d.querySelectorAll('.punto-num')[i]).backgroundColor]);
      d.querySelector('.pin-num').classList.add('elegido'); const sel = g(d.querySelector('.pin-num span')).outlineColor; d.remove(); return { r, sel }; }""")
    ok([x[0] for x in pin26['r']]==['rgb(255, 255, 255)','rgb(244, 166, 42)','rgb(198, 40, 40)','rgb(30, 122, 70)'] and all(x[2]=='50%' for x in pin26['r'])
       and [x[3] for x in pin26['r']]==[x[0] for x in pin26['r']] and pin26['sel']=='rgb(27, 95, 170)',
       'puntos del mapa y de la lista, siempre círculos: sin aviso blanco, por revisar ámbar, lejos rojo, revisado verde; el elegido con anillo azul: %s' % pin26)
    ley26=pg26.eval_on_selector_all('.leyenda-jornada > span','l=>l.map(x=>x.textContent.trim())')
    ok(ley26==['Correcto','Por revisar','Lejos del resto','Revisado','Sustituto'],'la leyenda del mapa dice los cuatro estados y el sustituto (D203); el blanco es «Correcto» (D167): %s' % ley26)
    mini26=pg26.evaluate("""(() => { const j = { registros: [{ id: 'a', lat: 19.40, lng: -99.10 }, { id: 'b', lat: 19.41, lng: -99.11 }, { id: 'c', lat: 19.42, lng: -99.12 }, { id: 'd', lat: 19.43, lng: -99.13 }] };
      const av = { b: [{ tipo: 'precision' }], c: [{ tipo: 'lejos' }], d: [{ tipo: 'lejos' }] };
      const t = document.createElement('div'); t.innerHTML = SRP.jornadas.miniatura(j, av, ['d']); return [...t.querySelectorAll('circle')].map(c => c.dataset.tono); })()""")
    ok(mini26==['','rev','err','ok'],'la miniatura de la tarjeta usa el mismo semáforo y refleja los revisados: %s' % mini26)
    # Contrastes de los colores de significado
    con26=pg26.evaluate("""() => { const v = n => getComputedStyle(document.documentElement).getPropertyValue('--' + n).trim();
      const L = h => { const c = h.replace('#', '').match(/../g).map(x => parseInt(x, 16) / 255).map(x => x <= .03928 ? x / 12.92 : ((x + .055) / 1.055) ** 2.4); return .2126 * c[0] + .7152 * c[1] + .0722 * c[2]; };
      const cr = (a, b) => { const x = L(v(a)), y = L(v(b)); return Math.round((Math.max(x, y) + .05) / (Math.min(x, y) + .05) * 100) / 100; };
      return { acento: cr('acento', 'fondo'), exito: cr('exito', 'fondo'), error: cr('error', 'fondo'), editar: cr('editar', 'editar-fondo'), gris: cr('gris', 'fondo'), ambar: cr('texto', 'atencion-relleno') }; }""")
    ok(all(x >= 4.5 for x in con26.values()),'cada color de significado pasa 4.5:1 con su fondo: %s' % con26)
    # Editar es neutro con lápiz; el ámbar queda para «atención»
    ed26=pg26.evaluate("(() => { const b = document.createElement('button'); b.className = 'btn btn-editar'; document.body.appendChild(b); const c = getComputedStyle(b); const r = [c.backgroundColor, c.color]; b.remove(); return r; })()")
    ok(ed26==['rgb(255, 255, 255)','rgb(30, 35, 39)'],'el botón de corregir es neutro: fondo blanco y texto oscuro (D166): %s' % ed26)
    # El PDF conserva la paleta institucional; la gráfica de origen, colores lógicos
    col26=pg26.evaluate("(() => { const C = SRP.reportes.colores(); return { guinda: C.guinda, dorado: C.dorado, gris: C.gris, fila: C.fila, dist: C.dist }; })()")
    ok(col26['guinda']==[157,33,72] and col26['dorado']==[178,142,92] and col26['gris']==[85,88,90] and col26['fila']==[247,241,243]
       and col26['dist']=={'nativa':[30,122,70],'endemica':[20,83,45],'exotica':[178,142,92],'invasora':[198,40,40],'otra':[196,201,206]},
       'el PDF sigue en guinda, dorado y gris; la gráfica de origen va en verde, verde oscuro, dorado, rojo y gris claro (D166): %s' % col26['dist'])
    pg26.evaluate("SRP.app.mostrarVista('jornadas')"); pg26.wait_for_timeout(800)
    pg26.evaluate("SRP.jornadas.aplicarAtajo('todas')"); pg26.wait_for_timeout(800)
    pg26.evaluate("(() => { const j = SRP.jornadas._todas.filter(j => j.estatus === 'cerrada').find(x => x.registros.length >= 6 && ((x.dato && x.dato.organizacion_id) || 'o-sedema') === 'o-sedema'); SRP.reportes.abrir(j.registros, j.fecha, j.cabo_id, j); })()"); pg26.wait_for_timeout(700)
    pg26.fill('#cie-hora','12:10'); pg26.click('#btn-cierre-generar'); pg26.wait_for_timeout(800)
    pv26=pg26.evaluate("[getComputedStyle(document.querySelector('#previa-hoja .previa-titulo')).color, getComputedStyle(document.querySelector('#previa-hoja .previa-apartado h3')).backgroundColor]")
    ok(pv26==['rgb(157, 33, 72)','rgb(157, 33, 72)'],'la vista previa del reporte, que reproduce el PDF, sigue en guinda: %s' % pv26)
    pg26.evaluate("SRP.demo.quitar()")
    ok(not err26,'sin errores en consola: %s' % err26[:2])
    ctx26.close()

    # ---------- Bloque 105: «Correcto», tuerca sin círculo y «Hoy» sin año ni mes (D167) ----------
    ctx27=b.new_context(viewport={'width':390,'height':844})
    pg27=ctx27.new_page(); err27=[]
    pg27.on('pageerror', lambda e: err27.append(str(e))); pg27.on('console', lambda m: m.type=='error' and 'net::' not in m.text and 'Failed to load' not in m.text and err27.append(m.text))
    pg27.goto(BASE); pg27.wait_for_timeout(1200)
    pg27.select_option('#sel-usuario-prueba','u-admin-1'); pg27.click('#btn-entrar-prueba'); pg27.wait_for_timeout(900)
    pg27.evaluate("SRP.demo.cargar()"); pg27.wait_for_timeout(800)
    # Año y mes ya no son listas: los atajos «Este mes» y «Este año» los sustituyen
    pg27.evaluate("SRP.app.mostrarVista('registros')"); pg27.wait_for_timeout(700)
    pg27.evaluate("SRP.registros.aplicarAtajo('mes')"); pg27.wait_for_timeout(400)
    rm27=pg27.evaluate("(() => { const h = SRP.util.fechaHoy().slice(0, 7); return [document.querySelector('#filtro-atajos [data-atajo=mes]').getAttribute('aria-pressed'), SRP.registros.filtrados.every(r => r.fecha_plantacion.startsWith(h)), document.getElementById('caja-filtro-anio') === null]; })()")
    pg27.evaluate("SRP.registros.aplicarAtajo('anio')"); pg27.wait_for_timeout(400)
    ra27=pg27.evaluate("(() => { const h = SRP.util.fechaHoy().slice(0, 4); return [document.querySelector('#filtro-atajos [data-atajo=anio]').getAttribute('aria-pressed'), SRP.registros.filtrados.length > 0 && SRP.registros.filtrados.every(r => r.fecha_plantacion.startsWith(h)), document.getElementById('filtro-mas-filtros-texto').textContent]; })()")
    pg27.evaluate("SRP.registros.aplicarAtajo('todos')"); pg27.wait_for_timeout(400)
    ok(rm27==['true',True,True] and ra27[0]=='true' and ra27[1] and 'año' not in ra27[2],'en Registros, «Este mes» y «Este año» filtran el periodo en curso; «Más filtros» ya no lleva año ni mes: %s · %s' % (rm27, ra27))
    pg27.evaluate("SRP.app.mostrarVista('jornadas')"); pg27.wait_for_timeout(700)
    pg27.evaluate("SRP.jornadas.aplicarAtajo('mes')"); pg27.wait_for_timeout(500)
    jm27=pg27.evaluate("(() => { const h = SRP.util.fechaHoy().slice(0, 7); return [document.querySelector('#jornada-atajos [data-atajo=mes]').getAttribute('aria-pressed'), SRP.jornadas.lista.every(j => j.fecha.startsWith(h)), document.getElementById('caja-jornada-anio') === null]; })()")
    pg27.evaluate("SRP.jornadas.aplicarAtajo('anio')"); pg27.wait_for_timeout(500)
    ja27=pg27.evaluate("(() => { const h = SRP.util.fechaHoy().slice(0, 4); return [document.querySelector('#jornada-atajos [data-atajo=anio]').getAttribute('aria-pressed'), SRP.jornadas.lista.length > 0 && SRP.jornadas.lista.every(j => j.fecha.startsWith(h)), document.getElementById('jornada-mas-filtros-texto').textContent]; })()")
    pg27.evaluate("SRP.jornadas.aplicarAtajo('todas')"); pg27.wait_for_timeout(500)
    ok(jm27==['true',True,True] and ja27[0]=='true' and ja27[1] and 'año' not in ja27[2],'en Jornadas, igual: %s · %s' % (jm27, ja27))
    # La tuerca es sólo su icono: sin círculo ni contorno, con su área de toque
    pg27.locator('#lista-jornadas .jornada .jornada-boton').first.click(); pg27.wait_for_timeout(900)
    tu27=pg27.evaluate("(() => { const b = document.querySelector('#jornada-lista .btn-tuerca'); const c = getComputedStyle(b); const r = b.getBoundingClientRect(); return [c.borderRadius, c.backgroundColor, c.borderTopColor, Math.round(r.width), Math.round(r.height)]; })()")
    ok(tu27[0]!='50%' and tu27[1]=='rgba(0, 0, 0, 0)' and tu27[2]=='rgba(0, 0, 0, 0)' and tu27[3]>=48 and tu27[4]>=48,'la tuerca es sólo su icono, sin círculo ni contorno, y se toca igual de fácil: %s' % tu27)
    pg27.evaluate("SRP.demo.quitar()")
    ok(not err27,'sin errores en consola: %s' % err27[:2])
    ctx27.close()

    # ---------- Bloque 106: «previstos», Supervisión con % y de diez en diez, barras contra el total (D168) ----------
    ctx28=b.new_context(viewport={'width':390,'height':844})
    pg28=ctx28.new_page(); err28=[]
    pg28.on('pageerror', lambda e: err28.append(str(e))); pg28.on('console', lambda m: m.type=='error' and 'net::' not in m.text and 'Failed to load' not in m.text and err28.append(m.text))
    pg28.goto(BASE); pg28.wait_for_timeout(1200)
    pg28.select_option('#sel-usuario-prueba','u-admin-1'); pg28.click('#btn-entrar-prueba'); pg28.wait_for_timeout(900)
    # Cantidades iguales, mismo porcentaje: 3 de 19 es 16 % siempre
    pc28=pg28.evaluate("SRP.reportes.porcentajes([3, 2, 2, 2, 2, 1, 1, 1, 1, 1, 1, 1, 1], 19)")
    ok(pc28[0]==16 and len(set(pc28[1:5]))==1 and len(set(pc28[5:]))==1 and 97<=sum(pc28)<=100,'cantidades iguales llevan el mismo porcentaje y 3 de 19 es 16 %%: %s' % pc28)
    pg28.evaluate("SRP.demo.cargar()")
    # El reporte: «Otras N especies» con su propio porcentaje y la barra medida contra el total
    pg28.evaluate("SRP.app.mostrarVista('jornadas')"); pg28.wait_for_timeout(2500)
    pg28.evaluate("SRP.jornadas.aplicarAtajo('todas')"); pg28.wait_for_timeout(1500)
    pg28.evaluate("(() => { const j = SRP.jornadas._todas.filter(j => j.estatus === 'cerrada').find(x => new Set(x.registros.map(r => r.especie_id)).size > 10 && ((x.dato && x.dato.organizacion_id) || 'o-sedema') === 'o-sedema') || SRP.jornadas._todas.filter(j => j.estatus === 'cerrada').find(x => x.registros.length >= 6 && ((x.dato && x.dato.organizacion_id) || 'o-sedema') === 'o-sedema'); SRP.reportes.abrir(j.registros, j.fecha, j.cabo_id, j); })()")
    pg28.wait_for_timeout(700); pg28.fill('#cie-hora','12:10'); pg28.click('#btn-cierre-generar'); pg28.wait_for_timeout(900)
    ot28=pg28.evaluate("""(() => { const v = SRP.reportes.vistaPrevia; const m = SRP.reportes.modelo(v.registros, v.cierre, v.fecha, v.jornada);
      return { sinBarras: !m.graficas.especies && !m.notaEspecies, especies: m.totales.length, suma: m.totales.reduce((s, t) => s + t.n, 0), total: m.total }; })()""")
    ok(ot28['sinBarras'] and ot28['suma']==ot28['total'] and 'La barra completa equivale' not in pg28.inner_text('#previa-hoja') and pg28.locator('#previa-hoja .previa-barra-fila').count()==0,
       'el reporte no trae la gráfica de ejemplares por especie: la tabla de totales lista todas las especies y suma el total: %s' % ot28)
    # Supervisión: «de lo previsto», unidad en la gráfica, % en las tablas y especies de diez en diez
    pg28.keyboard.press('Escape'); pg28.wait_for_timeout(300)
    pg28.evaluate("SRP.app.mostrarVista('supervision')"); pg28.wait_for_timeout(700)
    abrir_sup(pg28)
    pg28.click('#sup-tipos .chip[data-tipo=todo]'); pg28.wait_for_timeout(1200)
    su28=pg28.evaluate("""(() => { const q = s => document.querySelector(s); const cab = id => [...document.querySelectorAll('details[data-seccion=' + id.replace('sup-t-', '') + '] thead th')].map(t => t.textContent);
      return { cifras: q('.sup-cifras').textContent, avance: q('#sup-t-avance').textContent, alc: cab('sup-t-alcaldias'), esp: cab('sup-t-especies'), prog: cab('sup-t-programas'),
        barras: document.querySelectorAll('details[data-seccion=especies] tbody tr:not([hidden]) .sup-esp-barra').length,
        filas: document.querySelectorAll('details[data-seccion=especies] tbody tr:not([hidden])').length,
        mas: (q('button[data-mas=especies]') || {}).textContent || '', nesp: SRP.supervision.modelo.porEspecie.length }; })()""")
    ok('de lo previsto' in su28['cifras'] and 'previstos en las jornadas' in su28['cifras'] and 'meta' not in su28['cifras'],'la cifra de avance dice «de lo previsto», no «meta» (D168)')
    ok(su28['avance'].startswith('Árboles plantados por'),'la gráfica de avance dice su unidad: %s' % su28['avance'][:40])
    ok('% del total' in su28['alc'] and '% del total' in su28['esp'] and '% del total' in su28['prog'],'las tablas por alcaldía, especie y programa dicen el %% del total: %s' % su28['esp'])
    ok(su28['barras']==su28['filas'] and (su28['nesp']<=10 or (su28['filas']==10 and su28['mas'].startswith('Mostrar '))),'por especie, tabla y gráfica juntas, de diez en diez: %d filas, «%s»' % (su28['filas'], su28['mas']))
    pg28.evaluate("SRP.demo.quitar()")
    ok(not err28,'sin errores en consola: %s' % err28[:2])
    ctx28.close()

    # ---------- Bloque 107: el reporte con la franja del cabo, especie con nombre científico y precisión en color (D169) ----------
    ctx29=b.new_context(viewport={'width':390,'height':844})
    pg29=ctx29.new_page(); err29=[]
    pg29.on('pageerror', lambda e: err29.append(str(e))); pg29.on('console', lambda m: m.type=='error' and 'net::' not in m.text and 'Failed to load' not in m.text and err29.append(m.text))
    pg29.goto(BASE); pg29.wait_for_timeout(1200)
    pg29.select_option('#sel-usuario-prueba','u-admin-1'); pg29.click('#btn-entrar-prueba'); pg29.wait_for_timeout(900)
    pg29.evaluate("SRP.demo.cargar()"); pg29.evaluate("SRP.app.mostrarVista('jornadas')"); pg29.wait_for_timeout(2500)
    pg29.evaluate("SRP.jornadas.aplicarAtajo('todas')"); pg29.wait_for_timeout(1500)
    pg29.evaluate("""(() => { const j = SRP.jornadas._todas.filter(j => j.estatus === 'cerrada').find(x => x.registros.length >= 6 && ((x.dato && x.dato.organizacion_id) || 'o-sedema') === 'o-sedema');
      const regs = j.registros.map((r, i) => Object.assign({}, r, i === 0 ? { punto_origen: 'gps', gps_precision_m: 5 } : i === 1 ? { punto_origen: 'gps', gps_precision_m: 22 } : i === 2 ? { punto_origen: 'gps', gps_precision_m: 80 } : {}));
      SRP.reportes.abrir(regs, j.fecha, j.cabo_id, j); })()"""); pg29.wait_for_timeout(700)
    pg29.fill('#cie-hora','12:10'); pg29.click('#btn-cierre-generar'); pg29.wait_for_timeout(900)
    fr29=pg29.evaluate("(() => { const f = document.querySelector('#previa-hoja .previa-responsable'); return { texto: f.innerText, antesCifras: !!f.nextElementSibling && f.nextElementSibling.classList.contains('previa-cifras') }; })()")
    ok('Nombre del cabo:' in fr29['texto'] and 'Nombre de la jornada:' in fr29['texto'] and 'Día de la jornada:' in fr29['texto'] and 'Programa:' in fr29['texto'] and fr29['antesCifras'],
       'bajo el nombre del cabo, en la misma franja, los datos de la jornada; luego las cifras (D169)')
    pr29=pg29.evaluate("[...document.querySelectorAll('#previa-hoja table tbody tr')].slice(0, 3).map(tr => { const c = tr.querySelector('.previa-precision'); return [c.dataset.nivel, getComputedStyle(c).color]; })")
    ok([x[0] for x in pr29]==['buena','aceptable','baja'] and [x[1] for x in pr29]==['rgb(30, 122, 70)','rgb(138, 75, 0)','rgb(198, 40, 40)'],
       'la precisión va en color: verde buena, ámbar aceptable, rojo baja (D169): %s' % pr29)
    ok('en rojo, más de' in pg29.inner_text('#previa-hoja'),'y una nota explica los colores')
    pg29.evaluate("SRP.demo.quitar()")
    ok(not err29,'sin errores en consola: %s' % err29[:2])
    ctx29.close()

    # ---------- Bloque 108: longitud con «−» fijo y pegar el par completo (D170) ----------
    ctx30=b.new_context(viewport={'width':390,'height':844})
    pg30=ctx30.new_page(); err30=[]
    pg30.on('pageerror', lambda e: err30.append(str(e))); pg30.on('console', lambda m: m.type=='error' and 'net::' not in m.text and 'Failed to load' not in m.text and err30.append(m.text))
    pg30.goto(BASE); pg30.wait_for_timeout(1200)
    pg30.select_option('#sel-usuario-prueba','u-cabo-1'); pg30.click('#btn-entrar-prueba'); pg30.wait_for_timeout(900)
    u30=pg30.evaluate("""(() => { const C = SRP.util.coordenadas; return {
      num: [C.numero('19,4326'), C.numero(' 19.4326 '), Number.isNaN(C.numero('hola')), Number.isNaN(C.numero(''))],
      lng: [C.longitud('99.1332'), C.longitud('-99.1332'), C.longitud('\\u221299.1332'), C.longitud('99,1332')],
      par: [C.par('19.4326, -99.1332'), C.par('19.4326,-99.1332'), C.par('19,4326 -99,1332'), C.par('-99.1332, 19.4326'), C.par('19.4326; 99.1332'), C.par('19,4326'), C.par('19.4326'), C.par('hola')] }; })()""")
    ok(u30['num']==[19.4326,19.4326,True,True],'la latitud acepta coma decimal y espacios; lo que no es número no pasa: %s' % u30['num'])
    ok(u30['lng']==[-99.1332,-99.1332,-99.1332,-99.1332],'la longitud se guarda negativa con o sin signo, con «−» tipográfico o coma decimal (D170): %s' % u30['lng'])
    ok(u30['par'][:5]==[[19.4326,-99.1332]]*5 and u30['par'][5:]==[None,None,None],'el par de Google Maps se reconoce con coma, punto y coma, espacio o al revés; un solo número no es par: %s' % u30['par'])
    # Registrar jornada: el «−» está a la vista y basta escribir el número
    pg30.evaluate("SRP.app.mostrarVista('registrar')"); pg30.wait_for_timeout(600)
    pg30.click('#ini-detalles-coord summary'); pg30.wait_for_timeout(150)
    sg30=pg30.evaluate("(() => { const i = document.getElementById('ini-coord-lng'); const s = i.parentElement.querySelector('.signo-fijo'); const r = s.getBoundingClientRect(), q = i.getBoundingClientRect(); return [s.textContent, i.placeholder, Math.abs(r.right - q.left) < 2 && Math.abs(r.top - q.top) < 2, i.getAttribute('inputmode')]; })()")
    ok(sg30==['−','99.133200',True,'decimal'],'«Longitud» lleva el «−» fijo pegado al campo y pide sólo el número: %s' % sg30)
    pg30.fill('#ini-coord-lat','19.4326'); pg30.fill('#ini-coord-lng','99.1332'); pg30.click('#btn-ini-coord-aplicar'); pg30.wait_for_timeout(250)
    ok(pg30.inner_text('#ini-alcaldia')=='Cuauhtémoc' and pg30.evaluate("SRP.activa.punto && SRP.activa.punto.lng")==-99.1332,'escribir 99.1332 sin signo coloca el punto en la ciudad (-99.1332): %s' % pg30.inner_text('#ini-alcaldia'))
    # Pegar el par en la latitud llena los dos campos
    pg30.fill('#ini-coord-lat',''); pg30.fill('#ini-coord-lng','')
    pg30.evaluate("(() => { const dt = new DataTransfer(); dt.setData('text/plain', '19.3500, -99.1620'); document.getElementById('ini-coord-lat').dispatchEvent(new ClipboardEvent('paste', { clipboardData: dt, bubbles: true, cancelable: true })); })()")
    pe30=[pg30.input_value('#ini-coord-lat'), pg30.input_value('#ini-coord-lng')]
    ok(pe30==['19.350000','99.162000'],'pegar «19.3500, -99.1620» en Latitud llena latitud y longitud: %s' % pe30)
    # Escribir el par en un solo campo y tocar «Colocar punto» también lo reparte
    pg30.fill('#ini-coord-lat','19.4326 -99.1332'); pg30.fill('#ini-coord-lng',''); pg30.click('#btn-ini-coord-aplicar'); pg30.wait_for_timeout(250)
    ok(pg30.input_value('#ini-coord-lng')=='99.133200' and pg30.inner_text('#ini-alcaldia')=='Cuauhtémoc','el par escrito en un solo campo se reparte al colocar el punto')
    # La ayuda dice que se puede pegar el par y de dónde sale; el ejemplo mismo se pega bien
    ay30=[pg30.inner_text('#ini-coord-ayuda'), pg30.get_attribute('#ini-coord-lat','aria-describedby'), pg30.inner_text('#coord-ayuda')]
    ok('19.423212, -99.141426' in ay30[0] and 'Google Maps' in ay30[0] and ay30[1]=='ini-coord-ayuda' and ay30[2]==ay30[0],'bajo las coordenadas se dice que se puede pegar el par y cómo copiarlo de Google Maps, en los dos formularios')
    pg30.fill('#ini-coord-lat',''); pg30.fill('#ini-coord-lng','')
    pg30.evaluate("(() => { const dt = new DataTransfer(); dt.setData('text/plain', '19.42321270549791, -99.14142643765936'); document.getElementById('ini-coord-lng').dispatchEvent(new ClipboardEvent('paste', { clipboardData: dt, bubbles: true, cancelable: true })); })()")
    ok([pg30.input_value('#ini-coord-lat'), pg30.input_value('#ini-coord-lng')]==['19.423213','99.141426'],'el ejemplo de la ayuda, pegado en Longitud, llena los dos campos')
    ar30=pg30.evaluate("(() => { const i = document.getElementById('coord-lng'); return [i.parentElement.querySelector('.signo-fijo').textContent, i.placeholder]; })()")
    ok(ar30==['−','99.133200'],'«Nuevo árbol» lleva el mismo campo de longitud con «−» fijo: %s' % ar30)
    ok(not err30,'sin errores en consola: %s' % err30[:2])
    ctx30.close()

    # ---------- Bloque 109: confirmación «Registro exitoso» que se cierra sola (D171) ----------
    ctx31=b.new_context(viewport={'width':375,'height':667},geolocation={'latitude':19.432,'longitude':-99.133},permissions=['geolocation'])
    pg31=ctx31.new_page(); err31=[]
    pg31.on('pageerror', lambda e: err31.append(str(e))); pg31.on('console', lambda m: m.type=='error' and 'net::' not in m.text and 'Failed to load' not in m.text and err31.append(m.text))
    pg31.goto(BASE); pg31.wait_for_timeout(1200)
    pg31.select_option('#sel-usuario-prueba','u-cabo-1'); pg31.click('#btn-entrar-prueba'); pg31.wait_for_timeout(900)
    iniciar_jornada(pg31,'Jornada de la confirmación',HOY)
    pg31.click('#btn-ubicacion'); pg31.wait_for_timeout(700)
    pg31.fill('#campo-especie','aile'); pg31.wait_for_timeout(200)
    pg31.dispatch_event('.combo-opcion[data-id="ESP-0002"]','mousedown'); pg31.wait_for_timeout(150)
    pg31.click('#form-plantacion button[type=submit]'); pg31.wait_for_timeout(350)
    # Cerca de la medianoche el reloj de la prueba y el de la app pueden estar en días distintos (D133)
    if pg31.is_visible('#dlg-confirmar'): pg31.click('#btn-confirmar-si'); pg31.wait_for_timeout(350)
    if pg31.is_visible('#dlg-resumen'): pg31.click('#btn-resumen-guardar'); pg31.wait_for_timeout(350)
    cf31=pg31.evaluate("""(() => { const c = document.getElementById('confirmacion-guardado'); const f = document.getElementById('franja-guardado').getBoundingClientRect();
      return { visible: !c.hidden, texto: c.innerText.replace(/\\s+/g, ' ').trim(), icono: !!c.querySelector('svg'), toques: getComputedStyle(c).pointerEvents,
        franja: f.top >= 0 && f.bottom <= innerHeight, foco: document.activeElement && document.activeElement.id }; })()""")
    ok(cf31['visible'] and cf31['texto']=='Registro exitoso Aile' and cf31['icono'] and cf31['toques']=='none','al guardar, al centro «Registro exitoso» con la especie y la palomita, sin atrapar los toques (D171): %s' % cf31)
    ok(cf31['franja'] and cf31['foco']=='btn-ubicacion','la franja «Guardado» queda a la vista en un teléfono chico y el foco, listo para el siguiente árbol: %s' % cf31)
    pg31.wait_for_timeout(1500)
    ok(pg31.is_hidden('#confirmacion-guardado'),'la confirmación se cierra sola, sin tocar nada')
    ok(not err31,'sin errores en consola: %s' % err31[:2])
    ctx31.close()

    # ---------- Bloque 110: del mapa a la lista, «Generar reporte» único y la × del aviso (D172) ----------
    ctx32=b.new_context(viewport={'width':375,'height':667})
    pg32=ctx32.new_page(); err32=[]
    pg32.on('pageerror', lambda e: err32.append(str(e))); pg32.on('console', lambda m: m.type=='error' and 'net::' not in m.text and 'Failed to load' not in m.text and err32.append(m.text))
    pg32.goto(BASE); pg32.wait_for_timeout(1200)
    pg32.select_option('#sel-usuario-prueba','u-admin-1'); pg32.click('#btn-entrar-prueba'); pg32.wait_for_timeout(900)
    pg32.evaluate("SRP.demo.cargar()"); pg32.wait_for_timeout(800)
    pg32.evaluate("SRP.app.mostrarVista('jornadas')"); pg32.wait_for_timeout(800)
    pg32.evaluate("(() => { const l = [...document.querySelectorAll('#lista-jornadas .jornada')].find(x => { const c = x.querySelector('.jornada-cifra b'); return x.querySelectorAll('.jornada-mini circle').length >= 8; }); (l || document.querySelector('#lista-jornadas .jornada')).querySelector('.jornada-boton').click(); })()")
    pg32.wait_for_timeout(1200)
    esperar(pg32, "!!document.getElementById('jornada-mapa').offsetParent", 6000)   # la ficha tarda con los datos de demostración recién cargados
    # Tocar en el mapa el último punto lleva la lista a ese árbol, a la vista y fuera de las barras fijas
    n32=pg32.locator('#jornada-mapa .pin-num').count()
    pg32.locator('#jornada-mapa').scroll_into_view_if_needed(); pg32.wait_for_timeout(300)
    pg32.evaluate("(() => { const ids = Object.keys(SRP.jornadas.marcadores); const m = SRP.jornadas.marcadores[ids[ids.length - 1]]; m.fire('click'); })()")
    pg32.wait_for_timeout(1200)
    li32=pg32.evaluate("""(() => { const li = document.querySelector('#jornada-lista .punto-jornada.elegido'); const r = li.getBoundingClientRect();
      const arriba = [...document.querySelectorAll('.saltos')].filter(x => x.offsetParent).reduce((m, x) => Math.max(m, x.getBoundingClientRect().bottom), 0);
      const pie = [...document.querySelectorAll('#vista-jornadas [class*=barra], #vista-jornadas .jornada-acciones-fijas')].filter(x => x.offsetParent && getComputedStyle(x).position === 'sticky').reduce((m, x) => Math.min(m, x.getBoundingClientRect().top), innerHeight);
      const nav = document.querySelector('.pestanas'); const abajo = Math.min(pie, nav && nav.offsetParent ? nav.getBoundingClientRect().top : innerHeight);
      return { num: li.querySelector('.punto-num').textContent, top: Math.round(r.top), bottom: Math.round(r.bottom), arriba: Math.round(arriba), abajo: Math.round(abajo) }; })()""")
    ok(li32['num']==str(n32) and li32['top']>=li32['arriba'] and li32['bottom']<=li32['abajo'],'tocar el último punto en el mapa deja ese árbol a la vista en la lista, sin barras encima: %s' % li32)
    # «Generar reporte» siempre, aunque la jornada ya tenga reporte
    pg32.evaluate("SRP.app.mostrarVista('jornadas')"); pg32.wait_for_timeout(800)
    pg32.evaluate("SRP.jornadas.aplicarAtajo('todas')"); pg32.wait_for_timeout(800)
    bt32=pg32.evaluate("""async () => { const j = SRP.jornadas._todas.find(x => x.estatus === 'cerrada' && x.dato.reporte_en && x.registros.length); if (!j) return null;
      await SRP.jornadas.abrir(j.clave); await new Promise(r => setTimeout(r, 900)); const b = document.getElementById('btn-jornada-reporte');
      const r = { texto: b.textContent.trim(), oculto: b.hidden, editar: b.classList.contains('btn-editar'), generados: SRP.jornadas._todas.filter(x => x.dato.reporte_en).length }; await SRP.jornadas.cerrar(); return r; }""")
    ok(bt32 and bt32['texto']=='Generar reporte' and not bt32['editar'] and bt32['generados']>0,'en la ficha de una jornada que ya tiene reporte el botón dice «Generar reporte», no «Regenerar»: %s' % bt32)
    ok(pg32.evaluate("document.body.innerText.includes('Regenerar')")==False,'la palabra «Regenerar» ya no aparece')
    # El aviso con «Deshacer» y texto largo: la × arriba a la derecha, «Deshacer» bajo el texto
    pg32.evaluate("SRP.util.anunciar('Punto 3 marcado como revisado. Siguiente: generar el reporte.', 'exito', { deshacer: () => {} })"); pg32.wait_for_timeout(200)
    av32=pg32.evaluate("""(() => { const a = document.getElementById('aviso').getBoundingClientRect(), x = document.querySelector('#aviso .aviso-cerrar').getBoundingClientRect(),
      t = document.querySelector('#aviso .aviso-texto').getBoundingClientRect(), d = document.querySelector('#aviso .aviso-accion').getBoundingClientRect();
      return { xArriba: x.top - a.top < 20, xDerecha: a.right - x.right < 16, deshacerAbajo: d.top >= t.bottom - 2 }; })()""")
    ok(all(av32.values()),'el aviso con «Deshacer» deja la × arriba a la derecha y «Deshacer» bajo el texto en un teléfono chico: %s' % av32)
    pg32.set_viewport_size({'width':1280,'height':800}); pg32.wait_for_timeout(200)
    av32b=pg32.evaluate("(() => { const a = document.getElementById('aviso').getBoundingClientRect(), x = document.querySelector('#aviso .aviso-cerrar').getBoundingClientRect(), d = document.querySelector('#aviso .aviso-accion').getBoundingClientRect(); return { fila: Math.abs(d.top + d.height / 2 - (x.top + x.height / 2)) < 4, xDerecha: a.right - x.right < 16 }; })()")
    ok(all(av32b.values()),'en computadora «Deshacer» y la × van en el mismo renglón, la × al final: %s' % av32b)
    pg32.evaluate("SRP.demo.quitar()")
    ok(not err32,'sin errores en consola: %s' % err32[:2])
    ctx32.close()

    # ---------- Bloque 111: guía del mapa según el momento (D173) ----------
    ctx33=b.new_context(viewport={'width':375,'height':667},geolocation={'latitude':19.432,'longitude':-99.133},permissions=['geolocation'])
    pg33=ctx33.new_page(); err33=[]
    pg33.on('pageerror', lambda e: err33.append(str(e))); pg33.on('console', lambda m: m.type=='error' and 'net::' not in m.text and 'Failed to load' not in m.text and err33.append(m.text))
    pg33.goto(BASE); pg33.wait_for_timeout(1200)
    pg33.select_option('#sel-usuario-prueba','u-cabo-1'); pg33.click('#btn-entrar-prueba'); pg33.wait_for_timeout(900)
    iniciar_jornada(pg33,'Jornada de la guía',HOY)
    g0=[pg33.inner_text('#mapa-estado'), pg33.is_hidden('#mapa-guia')]
    ok(g0==['Toque el mapa donde está el árbol o use «Registrar ubicación del punto».',True],'sin punto, bajo el mapa se dice cómo ponerlo (D173): %s' % g0)
    pg33.click('#btn-ubicacion'); pg33.wait_for_timeout(700)
    g1=[pg33.is_visible('#mapa-guia'), pg33.inner_text('#mapa-guia')]
    ok(g1[0] and g1[1].startswith('Arrastre el marcador') and 'se actualizan solas' in g1[1],'con el punto puesto, la guía dice que se puede arrastrar y que las coordenadas se actualizan solas: %s' % g1)
    pg33.evaluate("SRP.formulario.limpiar()"); pg33.wait_for_timeout(200)
    ok(pg33.is_hidden('#mapa-guia') and pg33.inner_text('#mapa-estado').startswith('Toque el mapa'),'al limpiar el formulario vuelve la guía para poner el punto')
    # Bloque 112 (D174): «Colocar punto» separado de la ayuda y el aviso de error sin «par completo»
    pg33.click('#detalles-coord summary'); pg33.wait_for_timeout(200)
    sep33=pg33.evaluate("(() => { const a = document.getElementById('coord-ayuda').getBoundingClientRect(), b = document.getElementById('btn-coord-aplicar').getBoundingClientRect(); return Math.round(b.top - a.bottom); })()")
    ok(sep33>=16,'«Colocar punto» queda separado del texto de ayuda: %s px' % sep33)
    esp33=pg33.evaluate("(() => { const t = document.querySelector('.campo-punto .campo-triple').getBoundingClientRect(), e = document.getElementById('etq-especie').getBoundingClientRect(); return Math.round(e.top - t.bottom); })()")
    ok(esp33>=24,'«Especie» queda separada de la tabla de coordenadas, alcaldía y colonia: %s px' % esp33)
    pg33.fill('#coord-lat','hola'); pg33.fill('#coord-lng','99.13'); pg33.click('#btn-coord-aplicar'); pg33.wait_for_timeout(200)
    # La ficha «Revise antes de guardar» sin comentarios no enseña ese renglón; con comentario, sí
    pg33.fill('#coord-lat','19.4326'); pg33.fill('#coord-lng','99.1332'); pg33.click('#btn-coord-aplicar'); pg33.wait_for_timeout(300)
    pg33.fill('#campo-especie','aile'); pg33.wait_for_timeout(200); pg33.dispatch_event('.combo-opcion[data-id="ESP-0002"]','mousedown'); pg33.wait_for_timeout(900)
    pg33.fill('#campo-comentarios','')
    pg33.evaluate("SRP.formulario.revisar([])"); pg33.wait_for_timeout(600)
    rv33=pg33.is_visible('#dlg-resumen') and pg33.eval_on_selector_all('#revision-lista dt','l=>l.map(x=>x.textContent)')
    ok(rv33 and 'Comentarios' not in rv33 and 'Sin comentarios' not in pg33.inner_text('#revision-lista'),'sin comentarios, la ficha «Revise antes de guardar» no enseña ese renglón (D174): %s' % rv33)
    if pg33.is_visible('#dlg-resumen'): pg33.keyboard.press('Escape'); pg33.wait_for_timeout(300)
    pg33.fill('#campo-comentarios','Junto a la banqueta.')
    pg33.evaluate("SRP.formulario.revisar([])"); pg33.wait_for_timeout(600)
    ok(pg33.is_visible('#dlg-resumen') and 'Junto a la banqueta.' in pg33.inner_text('#revision-lista'),'con comentario, el renglón sí aparece')
    if pg33.is_visible('#dlg-resumen'): pg33.keyboard.press('Escape'); pg33.wait_for_timeout(300)
    pg33.fill('#coord-lat','hola'); pg33.fill('#coord-lng','99.13'); pg33.click('#btn-coord-aplicar'); pg33.wait_for_timeout(200)
    ok(pg33.inner_text('#mapa-estado')=='Escriba la latitud y la longitud, por ejemplo 19.4326 y 99.1332, o pegue las dos juntas.','el aviso de error dice «pegue las dos juntas», no «el par completo»: %s' % pg33.inner_text('#mapa-estado'))
    ok(not err33,'sin errores en consola: %s' % err33[:2])
    ctx33.close()

    # ---------- Bloque 112: vehículo sólo del catálogo y la migración 4 (D174) ----------
    ctx34=b.new_context(viewport={'width':390,'height':844}); pg34=ctx34.new_page(); err34=[]
    pg34.on('pageerror', lambda e: err34.append(str(e)))
    pg34.route('**/*.js*', lambda r: r.abort())
    pg34.goto(BASE); pg34.wait_for_timeout(500)
    pg34.evaluate("""() => new Promise((ok, no) => { const r = indexedDB.open('srp_db', 3);
      r.onupgradeneeded = () => { const db = r.result;
        const pl = db.createObjectStore('plantaciones', { keyPath: 'id' }); ['estatus', 'jornada_id'].forEach(i => pl.createIndex(i, i));
        db.createObjectStore('usuarios', { keyPath: 'id' }); const ca = db.createObjectStore('catalogos', { keyPath: 'id' });
        db.createObjectStore('bitacora', { keyPath: 'id' }).createIndex('entidad_id', 'entidad_id');
        const jo = db.createObjectStore('jornadas', { keyPath: 'id' }); jo.createIndex('cabo_id', 'cabo_id');
        ca.put({ id: 'v-PRU009', tipo: 'vehiculo', nombre: 'PRU 009', modelo: 'Internacional', tipo_vehiculo: 'Redilas', activo: true });
        jo.put({ id: 'jr-a', cabo_id: 'u-cabo-1', fecha: '2026-09-20', estatus: 'cerrada', vehiculo_id: null, vehiculo_placa: 'pru009', vehiculo_modelo: 'Camión', vehiculo_tipo: '' });
        jo.put({ id: 'jr-b', cabo_id: 'u-cabo-1', fecha: '2026-09-21', estatus: 'cerrada', vehiculo_id: null, vehiculo_placa: 'DEM-715', vehiculo_modelo: 'Camioneta de red', vehiculo_tipo: '' });
        jo.put({ id: 'jr-c', cabo_id: 'u-cabo-1', fecha: '2026-09-22', estatus: 'cerrada', vehiculo: 'Pick up vieja' });
        jo.put({ id: 'jr-d', cabo_id: 'u-cabo-1', fecha: '2026-09-23', estatus: 'cerrada', vehiculo_id: 'v-PRU009', vehiculo_placa: 'PRU 009', vehiculo_modelo: 'Internacional', vehiculo_tipo: 'Redilas', chofer: 'Fulano' }); };
      r.onsuccess = () => { r.result.close(); ok(true); }; r.onerror = () => no(r.error); })""")
    pg34.unroute('**/*.js*'); pg34.reload(); pg34.wait_for_timeout(1500)
    m34=pg34.evaluate("""async () => { const j = {}; (await SRP.almacen.todos('jornadas')).forEach(x => { j[x.id] = [x.vehiculo_id || null, x.vehiculo_placa || '', x.vehiculo_modelo || '', x.vehiculo_tipo || '', 'vehiculo' in x]; });
      return { v: SRP.almacen.db.version, j, chofer: (await SRP.almacen.uno('jornadas', 'jr-d')).chofer }; }""")
    ok(m34['v']==8 and m34['j']['jr-a']==['v-PRU009','PRU 009','Internacional','Redilas',False],'la migración 4 enlaza con el catálogo la placa escrita a mano que sí está en él: %s' % m34['j']['jr-a'])
    ok(m34['j']['jr-b']==[None,'','','',False] and m34['j']['jr-c'][4]==False,'y quita lo escrito a mano que no está en el catálogo, y el `vehiculo` de antes del bloque 20: %s · %s' % (m34['j']['jr-b'], m34['j']['jr-c']))
    ok(m34['j']['jr-d']==['v-PRU009','PRU 009','Internacional','Redilas',False] and m34['chofer']=='Fulano' and len(m34['j'])==4,'sin tocar las jornadas que ya tenían su vehículo del catálogo ni ningún otro dato')
    ok(not err34,'sin errores en consola: %s' % err34[:2])
    ctx34.close()

    # ---------- BLOQUE 113: SIN RESPALDO EN EL TELÉFONO (D175) ----------
    ctx35=b.new_context(viewport={'width':390,'height':844}); pg35=ctx35.new_page(); err35=[]
    pg35.on('pageerror', lambda e: err35.append(str(e))); pg35.on('console', lambda m: m.type=='error' and 'net::' not in m.text and 'Failed to load' not in m.text and err35.append(m.text))
    # Un teléfono que ya tenía la fecha del último respaldo guardada
    pg35.goto(BASE); pg35.wait_for_timeout(1000)
    pg35.evaluate("localStorage.setItem('srp_ultimo_respaldo', '2026-09-20T10:00:00-06:00')"); pg35.reload(); pg35.wait_for_timeout(1500)
    ok(pg35.evaluate("localStorage.getItem('srp_ultimo_respaldo')") is None,'al abrir, la fecha del último respaldo que quedó en el teléfono se limpia (D175)')
    pg35.select_option('#sel-usuario-prueba','u-cabo-1'); pg35.click('#btn-entrar-prueba'); pg35.wait_for_timeout(600)
    html35=pg35.content().lower()
    ok('respald' not in html35 and 'validar.js' not in html35 and pg35.is_hidden('#archivo-restaurar') ,
       'ni la pantalla ni el código cargado mencionan respaldos: sin botón, sin «Restaurar respaldo» y sin js/validar.js (D175)')
    ok(pg35.evaluate("typeof SRP.ESQUEMA.tablas.plantaciones")=='object' and pg35.evaluate("SRP.ref.usosDe ? 'si' : 'no'")=='si',
       'el esquema en el navegador sigue cargado: lo usa el conteo de uso de cuentas y catálogos')
    ok(not err35,'sin errores en consola: %s' % err35[:2])
    ctx35.close()

    # ---------- BLOQUE 114: CAMPOS DEPURADOS Y RENOMBRADOS (migración 5) ----------
    ctx36=b.new_context(viewport={'width':390,'height':844}); pg36=ctx36.new_page(); err36=[]
    pg36.on('pageerror', lambda e: err36.append(str(e))); pg36.on('console', lambda m: m.type=='error' and 'net::' not in m.text and 'Failed to load' not in m.text and err36.append(m.text))
    pg36.route('**/*.js*', lambda r: r.abort())
    pg36.goto(BASE); pg36.wait_for_timeout(500)
    pg36.evaluate("""() => new Promise((ok, no) => { const r = indexedDB.open('srp_db', 4);
      r.onupgradeneeded = () => { const db = r.result;
        const pl = db.createObjectStore('plantaciones', { keyPath: 'id' }); ['estatus', 'jornada_id'].forEach(i => pl.createIndex(i, i));
        const us = db.createObjectStore('usuarios', { keyPath: 'id' }); const ca = db.createObjectStore('catalogos', { keyPath: 'id' });
        db.createObjectStore('bitacora', { keyPath: 'id' }).createIndex('entidad_id', 'entidad_id');
        const jo = db.createObjectStore('jornadas', { keyPath: 'id' }); jo.createIndex('cabo_id', 'cabo_id');
        ca.put({ id: 'ESP-0001', tipo: 'especie', clave: 'ESP-0001', nombre: 'Negundo', nombre_cientifico: 'Acer negundo', genero: 'Acer', especie: 'negundo', nota_discrepancia: 'CORREGIDO.', activo: true });
        ca.put({ id: 'p-refor', tipo: 'programa', clave: 'REFOR', nombre: 'Reforestación', activo: true });
        us.put({ id: 'u-cabo-1', correo: 'cabo@ejemplo.local', nombre: 'Cabo', perfil: 'CABO', activo: true, fecha_alta: '2026-09-01T08:00:00-06:00', alta_por_id: 'u-admin-1' });
        jo.put({ id: 'jr-5a', cabo_id: 'u-cabo-1', fecha: '2026-09-20', estatus: 'cerrada', meta_arboles: 7, creado_por_id: 'u-cabo-1',
          fecha_inicio: '2026-09-20T09:00:00-06:00', fecha_creacion: '2026-09-20T09:00:00-06:00', editado_por_id: 'u-cabo-1', fecha_ultima_edicion: '2026-09-20T09:00:00-06:00',
          lat: 19.4326789123, lng: -99.1332123456, vehiculo_tipo: null, vehiculo_placa: '', vehiculo_modelo: '', chofer: 'Fulano' });
        jo.put({ id: 'jr-5b', cabo_id: 'u-cabo-1', fecha: '2026-09-21', estatus: 'cerrada', arboles_plantados: 3,
          fecha_inicio: '2026-09-21T09:00:00-06:00', editado_por_id: 'u-cabo-1', fecha_ultima_edicion: '2026-09-21T12:00:00-06:00' }); };
      r.onsuccess = () => { r.result.close(); ok(true); }; r.onerror = () => no(r.error); })""")
    pg36.unroute('**/*.js*'); pg36.reload(); pg36.wait_for_timeout(1500)
    m36=pg36.evaluate("""async () => { const e = await SRP.almacen.catalogo('ESP-0001'), a = await SRP.almacen.uno('jornadas', 'jr-5a'),
        b = await SRP.almacen.uno('jornadas', 'jr-5b'), u = await SRP.almacen.uno('usuarios', 'u-cabo-1');
      return { v: SRP.almacen.db.version, esp: Object.keys(e).filter(k => ['genero', 'especie', 'nota_discrepancia'].includes(k)), cientifico: e.nombre_cientifico,
        a: [a.arboles_previstos, 'meta_arboles' in a, 'creado_por_id' in a, 'fecha_creacion' in a, a.editado_por_id, a.fecha_ultima_edicion, a.vehiculo_tipo, a.lat, a.lng, a.chofer],
        b: [b.arboles_previstos, 'arboles_plantados' in b, b.editado_por_id, b.fecha_ultima_edicion],
        u: [u.fecha_creacion, u.creado_por_id, 'fecha_alta' in u, 'alta_por_id' in u] }; }""")
    ok(m36['v']==8 and m36['esp']==[] and m36['cientifico']=='Acer negundo','la migración 5 quita género, epíteto y nota de discrepancia de las especies y deja el nombre científico: %s' % m36)
    ok(m36['a']==[7,False,False,False,None,None,'',19.432679,-99.133212,'Fulano'],
       'en la jornada: la meta pasa a arboles_previstos, se quitan quién la creó y cuándo, una jornada sin editar queda sin datos de edición, el vehículo sin nulos y el punto con seis decimales: %s' % m36['a'])
    ok(m36['b']==[3,False,'u-cabo-1','2026-09-21T12:00:00-06:00'],'una jornada editada conserva quién y cuándo, y el conteo viejo pasa a arboles_previstos: %s' % m36['b'])
    ok(m36['u']==['2026-09-01T08:00:00-06:00','u-admin-1',False,False],'en las cuentas, fecha_alta y alta_por_id pasan a fecha_creacion y creado_por_id: %s' % m36['u'])
    ok(pg36.evaluate("typeof SRP.conexion.refrescarAvisoEnvio + '/' + typeof SRP.conexion.resumenFotos")=='undefined/undefined' and not pg36.query_selector('#cie-vehiculo_id'),
       'el código muerto y el campo oculto del vehículo ya no existen')
    ok(not err36,'sin errores en consola: %s' % err36[:2])
    ctx36.close()
    # Una jornada nueva nace con arboles_previstos y sin datos de edición
    pg.evaluate("SRP.app.mostrarVista('registrar')"); pg.wait_for_timeout(300)
    nueva_j=pg.evaluate("""async () => { const js = (await SRP.almacen.todos('jornadas')).filter(j => j.cabo_id === SRP.sesion.usuario.id).sort((a, b) => b.fecha_inicio.localeCompare(a.fecha_inicio));
      const j = js[0]; return j ? { previstos: 'arboles_previstos' in j, meta: 'meta_arboles' in j, creado: 'creado_por_id' in j, fc: 'fecha_creacion' in j } : null; }""")
    ok(nueva_j is not None and nueva_j['previstos'] and not nueva_j['meta'] and not nueva_j['creado'] and not nueva_j['fc'],'las jornadas guardan arboles_previstos y ya no llevan meta_arboles, creado_por_id ni fecha_creacion: %s' % nueva_j)


    # ---------- BLOQUE 115: PAGINACIÓN, CIERRE Y FECHA ----------
    ctx37=b.new_context(viewport={'width':390,'height':844}); pg37=ctx37.new_page(); err37=[]
    pg37.on('pageerror', lambda e: err37.append(str(e))); pg37.on('console', lambda m: m.type=='error' and 'net::' not in m.text and 'Failed to load' not in m.text and err37.append(m.text))
    pg37.goto(BASE); pg37.wait_for_timeout(1200)
    pg37.select_option('#sel-usuario-prueba','u-cabo-1'); pg37.click('#btn-entrar-prueba'); pg37.wait_for_timeout(600)
    # 23 jornadas cerradas de días pasados, con un árbol cada una
    pg37.evaluate("""async () => { const u = SRP.sesion.usuario, cv = SRP.derivacion.derivar(19.4326, -99.1332).capa_version;
      for (let i = 0; i < 23; i++) {
        const d = new Date(Date.now() - (i + 2) * 86400000), f = d.toISOString().slice(0, 10), jid = 'jr-p' + i, rid = 'pl-p' + i;
        const j = Object.assign({ id: jid, nombre: 'Página ' + i, ubicacion: '', programa_id: 'p-refor', lat: null, lng: null, punto_origen: null, gps_precision_m: null,
          alcaldia_cve: null, alcaldia: null, colonia_cve: null, colonia: null, fecha: f, comentarios: '', cabo_id: u.id, estatus: 'cerrada', fecha_inicio: d.toISOString(), fecha_cierre: d.toISOString(),
          encargado_id: u.id, editado_por_id: null, fecha_ultima_edicion: null, arboles_previstos: 1, puntos_revisados: [], reporte_en: null,
          vehiculo_id: null, vehiculo_placa: '', vehiculo_modelo: '', vehiculo_tipo: '' }, Object.fromEntries(SRP.reportes.CAMPOS.map(k => [k, ''])));
        const r = { id: rid, jornada_id: jid, estatus: 'activo', cabo_id: u.id, lat: 19.4326, lng: -99.1332, punto_origen: 'gps', gps_precision_m: 6,
          alcaldia: 'Cuauhtémoc', alcaldia_cve: '09015', colonia: null, colonia_cve: null, uga: 'CUH-021', uga_borde_m: 50, capa_version: cv, especie_id: 'ESP-0002', especie_otra: '', programa_id: 'p-refor', fecha_plantacion: f, comentarios: '', foto_id: null, foto_base64: null, fecha_registro: d.toISOString(), fecha_ultima_edicion: null, editado_por_id: null,
          folio: null };
        await SRP.almacen.guardarJuntos([{ almacen: 'jornadas', objeto: j, bitacora: SRP.bitacora.entrada('CREADO', 'jornada', jid, 'prueba') },
                                        { almacen: 'plantaciones', objeto: r, bitacora: SRP.bitacora.entrada('CREADO', 'plantacion', rid, 'prueba') }]);
      } }""")
    pg37.click('.pestana[data-vista=jornadas]'); pg37.wait_for_timeout(900)
    pg37.evaluate("document.querySelector('#jornada-atajos [data-atajo=todas]').click()"); pg37.wait_for_timeout(700)
    pj=lambda: [pg37.locator('#lista-jornadas > li').count(), pg37.inner_text('#jornadas-total'), pg37.inner_text('#jornadas-paginas .paginador-texto') if pg37.is_visible('#jornadas-paginas') else '']
    j1=pj()
    ok(j1[0]==10 and j1[1].startswith('23 jornadas · 23 árboles') and j1[2]=='Mostrando 1–10 de 23 jornadas',
       'Jornadas muestra 10 por página, con el total de todas arriba y «Mostrando 1–10 de 23 jornadas» abajo: %s' % j1)
    ok(pg37.is_disabled('#jornadas-paginas button[data-paso="-1"]') and pg37.eval_on_selector_all('#jornadas-paginas button[data-pagina]','l=>l.map(b=>b.textContent)')==['1','2','3'] and pg37.inner_text('#jornadas-paginas button[aria-current=page]')=='1'
       and 'Atrás' in pg37.inner_text('#jornadas-paginas button[data-paso="-1"]') and 'Siguiente' in pg37.inner_text('#jornadas-paginas button[data-paso="1"]'),
       'en la primera página «Atrás» está apagado, las páginas 1, 2 y 3 son botones y la actual va marcada (D200)')
    pg37.click('#jornadas-paginas button[data-paso="1"]'); pg37.wait_for_timeout(700)
    j2=pj()
    ok(j2[0]==10 and j2[2]=='Mostrando 11–20 de 23 jornadas' and pg37.inner_text('#jornadas-paginas button[aria-current=page]')=='2','«Siguiente» pasa a la página 2: %s' % j2)
    pg37.click('#jornadas-paginas button[data-pagina="3"]'); pg37.wait_for_timeout(700)
    j3=pj()
    ok(j3[0]==3 and j3[2]=='Mostrando 21–23 de 23 jornadas' and pg37.is_disabled('#jornadas-paginas button[data-paso="1"]'),'el botón de la última página lleva directo a la 3, con «Siguiente» apagado: %s' % j3)
    pg37.click('#lista-jornadas > li >> nth=0'); pg37.wait_for_timeout(700)
    pg37.click('#btn-jornada-volver'); pg37.wait_for_timeout(700)
    ok(pj()[2]=='Mostrando 21–23 de 23 jornadas','al volver del detalle de una jornada se conserva la página')
    pg37.select_option('#jornadas-paginas select[data-tam]','25'); pg37.wait_for_timeout(800)
    j4=pj()
    pg37.reload(); pg37.wait_for_timeout(1500); pg37.click('.pestana[data-vista=jornadas]'); pg37.wait_for_timeout(900)
    pg37.evaluate("document.querySelector('#jornada-atajos [data-atajo=todas]').click()"); pg37.wait_for_timeout(700)
    j5=pj()
    ok(j4[0]==23 and j4[2]=='Mostrando 1–23 de 23 jornadas' and j5[0]==23 and pg37.locator('#jornadas-paginas button[data-pagina]').count()==0 and pg37.is_visible('#jornadas-paginas select[data-tam]'),
       '«Resultados por página» cambia a 25 y vuelve a la primera; el teléfono lo recuerda y, con una sola página, sólo queda el selector: %s · %s' % (j4, j5))
    pg37.select_option('#jornadas-paginas select[data-tam]','10'); pg37.wait_for_timeout(800)
    # Registros y Reportes, con la misma paginación
    pg37.click('.pestana[data-vista=registros]'); pg37.wait_for_timeout(800)
    pg37.evaluate("document.querySelector('#filtro-atajos [data-atajo=todos]').click()"); pg37.wait_for_timeout(600)
    r1=[pg37.locator('#lista-registros > li').count(), pg37.inner_text('#registros-total'), pg37.inner_text('#registros-paginas .paginador-texto') if pg37.is_visible('#registros-paginas') else '']
    ok(r1[0]==10 and r1[1]=='Total: 23 registros' and r1[2]=='Mostrando 1–10 de 23 registros' and pg37.locator('#btn-mas').count()==0,'Registros también pagina de 10 en 10, sin «Mostrar más»: %s' % r1)
    pg37.click('.pestana[data-vista=jornadas]'); pg37.wait_for_timeout(900)
    pg37.evaluate("document.querySelector('#jornada-atajos [data-atajo=todas]').click()"); pg37.wait_for_timeout(600)
    pg37.click('#jornadas-paginas button[data-paso="1"]'); pg37.wait_for_timeout(600)
    t37=pg37.inner_text('#jornadas-paginas .paginador-texto')
    pg37.evaluate("document.querySelector('#jornada-atajos [data-atajo=todas]').click()"); pg37.wait_for_timeout(600)
    ok(t37.startswith('Mostrando 11–20 de ') and pg37.inner_text('#jornadas-paginas .paginador-texto')==t37,'volver a elegir el mismo filtro no regresa a la primera página: %s' % t37)
    pg37.evaluate("document.querySelector('#jornada-atajos [data-atajo=hoy]').click()"); pg37.wait_for_timeout(600)
    pg37.evaluate("document.querySelector('#jornada-atajos [data-atajo=todas]').click()"); pg37.wait_for_timeout(600)
    ok(pg37.inner_text('#jornadas-paginas .paginador-texto').startswith('Mostrando 1–10 de '),'un filtro distinto sí regresa a la primera página')
    # Datos de cierre: campos blancos, sin «Una por renglón», cajas que crecen con lo escrito
    reporte_de(pg37); pg37.wait_for_timeout(300)
    pg37.fill('#cie-personal', 'Uno\nDos\nTres\nCuatro\nCinco\nSeis'); pg37.wait_for_timeout(200)
    c37=pg37.evaluate("""() => { const t = document.getElementById('cie-personal'), a = document.getElementById('cie-apoyo');
      return { grises: document.querySelectorAll('.campos-grises').length, renglon: document.getElementById('dlg-cierre').innerText.includes('Una por renglón'),
        fondo: getComputedStyle(a).backgroundColor, sinBarra: t.scrollHeight <= t.clientHeight + 1, alta: t.clientHeight > a.clientHeight }; }""")
    ok(c37['grises']==0 and not c37['renglon'] and c37['fondo']=='rgb(255, 255, 255)' and c37['sinBarra'] and c37['alta'],
       'Datos de cierre: cajas blancas aunque estén vacías, sin «Una por renglón», y la caja crece con lo escrito en lugar de tener su propia barra: %s' % c37)
    pg37.keyboard.press('Escape'); pg37.wait_for_timeout(300)
    # Fecha de la jornada: al enfocarla, la guía propia se quita y no se encima con la del navegador
    pg37.evaluate("SRP.app.mostrarVista('registrar')"); pg37.wait_for_timeout(500)
    pg37.evaluate("document.getElementById('ini-fecha').value=''; document.getElementById('ini-fecha').dispatchEvent(new Event('input'))"); pg37.wait_for_timeout(200)
    antes37=pg37.evaluate("getComputedStyle(document.querySelector('#ini-fecha ~ .texto-vacio')).display")
    pg37.focus('#ini-fecha'); pg37.wait_for_timeout(200)
    foco37=pg37.evaluate("getComputedStyle(document.querySelector('#ini-fecha ~ .texto-vacio')).display")
    ok(antes37=='block' and foco37=='none','la fecha vacía dice «Elija la fecha» y, al enfocarla, esa guía se quita para no encimarse con dd/mm/aaaa: %s → %s' % (antes37, foco37))
    ok(not err37,'sin errores en consola: %s' % err37[:2])
    ctx37.close()


    # ---------- BLOQUE 116: SIN MARCA DE PRUEBA, BASES SEPARADAS Y CAMPOS SIN USO ----------
    FOTO38='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='
    ctx38=b.new_context(viewport={'width':390,'height':844}); pg38=ctx38.new_page(); err38=[]
    pg38.on('pageerror', lambda e: err38.append(str(e))); pg38.on('console', lambda m: m.type=='error' and 'net::' not in m.text and 'Failed to load' not in m.text and err38.append(m.text))
    pg38.route('**/*.js*', lambda r: r.abort())
    pg38.goto(BASE); pg38.wait_for_timeout(500)
    pg38.evaluate("""(foto) => new Promise((ok, no) => { const r = indexedDB.open('srp_db', 5);
      r.onupgradeneeded = () => { const db = r.result;
        const pl = db.createObjectStore('plantaciones', { keyPath: 'id' }); ['estatus', 'jornada_id'].forEach(i => pl.createIndex(i, i));
        const us = db.createObjectStore('usuarios', { keyPath: 'id' }); const ca = db.createObjectStore('catalogos', { keyPath: 'id' });
        const bi = db.createObjectStore('bitacora', { keyPath: 'id' }); bi.createIndex('entidad_id', 'entidad_id');
        const jo = db.createObjectStore('jornadas', { keyPath: 'id' }); jo.createIndex('cabo_id', 'cabo_id');
        ca.put({ id: 'ESP-0002', tipo: 'especie', clave: 'ESP-0002', nombre: 'Fresno', nombre_cientifico: 'Fraxinus uhdei', activo: true, es_ficticio: true });
        us.put({ id: 'u-cabo-1', correo: 'cabo@ejemplo.local', nombre: 'Cabo', perfil: 'CABO', activo: true, fecha_creacion: '2026-09-01T08:00:00-06:00', creado_por_id: 'u-admin-1', es_ficticio: true });
        jo.put({ id: 'jr-6', cabo_id: 'u-cabo-1', nombre: 'Seis', fecha: '2026-09-22', estatus: 'cerrada', arboles_previstos: 1, fecha_inicio: '2026-09-22T09:00:00-06:00', reporte_en: '2026-09-22T15:00:00-06:00', es_ficticio: true });
        pl.put({ id: 'pl-6', jornada_id: 'jr-6', estatus: 'activo', cabo_id: 'u-cabo-1', lat: 19.4326, lng: -99.1332, especie_id: 'ESP-0002', especie_otra: '', uga: 'CUH-021', folio: null,
          fecha_plantacion: '2026-09-22', foto_id: 'f-6', foto_base64: foto, es_ficticio: true, lat_original: 19.4326, lng_original: -99.1332,
          folio_uga: null, folio_capa_version: null, folio_lat: null, folio_lng: null, foto_nombre: 'IMG_0001.jpg', foto_bytes: 1234, especie_estatus: 'VALIDADA' });
        bi.put({ id: 'b-6', accion: 'CREADO', entidad: 'plantacion', entidad_id: 'pl-6', fecha: '2026-09-22T10:00:00-06:00', es_ficticio: true }); };
      r.onsuccess = () => { r.result.close(); ok(true); }; r.onerror = () => no(r.error); })""", FOTO38)
    pg38.unroute('**/*.js*'); pg38.reload(); pg38.wait_for_timeout(1500)
    m38=pg38.evaluate("""async () => { const fuera = ['es_ficticio','lat_original','lng_original','folio_uga','folio_capa_version','folio_lat','folio_lng','foto_nombre','foto_bytes','especie_estatus'];
      const p = await SRP.almacen.uno('plantaciones', 'pl-6'), j = await SRP.almacen.uno('jornadas', 'jr-6'), u = await SRP.almacen.uno('usuarios', 'u-cabo-1'),
        c = await SRP.almacen.catalogo('ESP-0002'), b = await SRP.almacen.uno('bitacora', 'b-6');
      return { v: SRP.almacen.db.version, quedan: [p, j, u, c, b].map(o => fuera.filter(k => k in o)).flat(),
        p: [p.lat, p.lng, p.especie_id, p.foto_id, p.foto_base64 ? 'foto' : ''], j: [j.nombre, j.reporte_en], u: u.nombre_completo, c: c.nombre_cientifico, b: b.accion,
        nombre: SRP.CONFIG.DB_NOMBRE, prueba: SRP.CONFIG.DB_NOMBRE_PRUEBA, real: SRP.CONFIG.DB_NOMBRE_REAL, ficticio: SRP.CONFIG.ES_FICTICIO,
        bases: indexedDB.databases ? (await indexedDB.databases()).map(d => d.name) : null }; }""")
    ok(m38['v']==8 and m38['quedan']==[],'la migración 6 quita la marca de prueba de todas las tablas y del árbol el punto original, los folio_*, el nombre y peso de la foto y el estatus de especie: %s' % m38['quedan'])
    ok(m38['p']==[19.4326,-99.1332,'ESP-0002','f-6','foto'] and m38['j']==['Seis','2026-09-22T15:00:00-06:00'] and m38['u']=='Cabo' and m38['c']=='Fraxinus uhdei' and m38['b']=='CREADO',
       'sin perder nada más: el árbol conserva punto, especie y foto; la jornada su reporte_en; la cuenta (con su nombre ya en un solo campo), la especie y la bitácora sus datos: %s' % {k: m38[k] for k in 'pjucb'})
    ok(m38['nombre']=='srp_db' and m38['prueba']=='srp_db' and m38['real']=='srp_sia' and m38['ficticio'] is True and (m38['bases'] is None or 'srp_sia' not in m38['bases']),
       'la versión de prueba guarda en srp_db y la real guardará en srp_sia: nunca conviven en un teléfono: %s' % {k: m38[k] for k in ('nombre','real','bases')})
    ok(pg38.evaluate("""(() => { const c = Object.assign({}, SRP.CONFIG, { ES_FICTICIO: false }); return c.ES_FICTICIO ? c.DB_NOMBRE_PRUEBA : c.DB_NOMBRE_REAL; })()""")=='srp_sia'
       and 'SRP.CONFIG.DB_NOMBRE = SRP.CONFIG.ES_FICTICIO ? SRP.CONFIG.DB_NOMBRE_PRUEBA : SRP.CONFIG.DB_NOMBRE_REAL' in open('js/config.js', encoding='utf-8').read(),
       'con ES_FICTICIO en false la base es srp_sia')
    ctx38.close()
    # Mover el punto al editar deja en la bitácora de dónde a dónde; Fotografías sigue diciendo el peso
    ctx38=b.new_context(viewport={'width':390,'height':844}); pg38=ctx38.new_page()
    pg38.on('pageerror', lambda e: err38.append(str(e))); pg38.on('console', lambda m: m.type=='error' and 'net::' not in m.text and 'Failed to load' not in m.text and err38.append(m.text))
    pg38.goto(BASE); pg38.wait_for_timeout(1200)
    pg38.select_option('#sel-usuario-prueba','u-admin-1'); pg38.click('#btn-entrar-prueba'); pg38.wait_for_timeout(600)
    pg38.evaluate("""async (foto) => { const d = new Date(), f = SRP.util.ahoraISO().slice(0, 10), cv = SRP.derivacion.derivar(19.4326, -99.1332).capa_version;
      const j = Object.assign({ id: 'jr-m6', nombre: 'Mover punto', ubicacion: '', programa_id: 'p-refor', lat: null, lng: null, punto_origen: null, gps_precision_m: null,
          alcaldia_cve: null, alcaldia: null, colonia_cve: null, colonia: null, fecha: f, comentarios: '', cabo_id: 'u-cabo-1', estatus: 'cerrada', fecha_inicio: d.toISOString(), fecha_cierre: d.toISOString(),
          encargado_id: 'u-cabo-1', editado_por_id: null, fecha_ultima_edicion: null, arboles_previstos: 1, puntos_revisados: [], reporte_en: null,
          vehiculo_id: null, vehiculo_placa: '', vehiculo_modelo: '', vehiculo_tipo: '' }, Object.fromEntries(SRP.reportes.CAMPOS.map(k => [k, ''])));
      const r = { id: 'pl-m6', jornada_id: 'jr-m6', estatus: 'activo', cabo_id: 'u-cabo-1', lat: 19.4326, lng: -99.1332, punto_origen: 'gps', gps_precision_m: 6,
          alcaldia: 'Cuauhtémoc', alcaldia_cve: '09015', colonia: null, colonia_cve: null, uga: 'CUH-021', uga_borde_m: 50, capa_version: cv, especie_id: 'ESP-0002', especie_otra: '', programa_id: 'p-refor',
          fecha_plantacion: f, comentarios: '', foto_id: 'f-m6', foto_base64: foto, fecha_registro: d.toISOString(), fecha_ultima_edicion: null, editado_por_id: null, folio: null };
      await SRP.almacen.guardarJuntos([{ almacen: 'jornadas', objeto: j, bitacora: SRP.bitacora.entrada('CREADO', 'jornada', 'jr-m6', 'prueba') },
                                      { almacen: 'plantaciones', objeto: r, bitacora: SRP.bitacora.entrada('CREADO', 'plantacion', 'pl-m6', 'prueba') }]); }""", FOTO38)
    pg38.evaluate("SRP.app.mostrarVista('galeria')"); pg38.wait_for_timeout(700)
    pg38.evaluate("document.querySelector('#galeria-atajos [data-atajo=todas]').click()"); pg38.wait_for_timeout(600)
    cuenta38=pg38.inner_text('#galeria-cuenta')
    ok(' · ' in cuenta38 and (cuenta38.endswith(' B') or cuenta38.endswith('KB') or cuenta38.endswith('MB')),'Fotografías sigue diciendo cuánto pesan las fotos, calculado de la foto misma: '+cuenta38)
    pg38.evaluate("async () => SRP.formulario.editar(await SRP.almacen.uno('plantaciones', 'pl-m6'))"); pg38.wait_for_timeout(900)
    pg38.evaluate("SRP.mapa.colocar(19.4350, -99.1400, 'Punto colocado en el mapa.', { origen: 'mapa' })"); pg38.wait_for_timeout(500)
    pg38.evaluate("SRP.formulario.guardar()"); pg38.wait_for_timeout(1200)
    e38=pg38.evaluate("""async () => { const b = (await SRP.almacen.todos('bitacora')).filter(x => x.entidad_id === 'pl-m6' && x.accion === 'EDITADO'), p = await SRP.almacen.uno('plantaciones', 'pl-m6');
      return { detalle: b.length ? b[b.length - 1].detalle : '', lat: p.lat, lng: p.lng, sobran: ['lat_original', 'lng_original', 'es_ficticio', 'foto_nombre', 'foto_bytes', 'especie_estatus', 'folio_uga'].filter(k => k in p) }; }""")
    ok('Punto: 19.432600, -99.133200 → 19.435000, -99.140000' in e38['detalle'] and e38['lat']==19.435 and e38['sobran']==[],
       'al mover el punto de un árbol, la bitácora guarda de dónde a dónde y el árbol no vuelve a llevar punto original: %s' % e38)
    ok(not err38,'sin errores en consola: %s' % err38[:2])
    ctx38.close()


    # ---------- BLOQUE 117: FECHA DE CIERRE A LA VISTA Y COLONIAS DEFINITIVAS ----------
    ctx39=b.new_context(viewport={'width':390,'height':844}, timezone_id='America/Mexico_City'); pg39=ctx39.new_page(); err39=[]
    pg39.on('pageerror', lambda e: err39.append(str(e))); pg39.on('console', lambda m: m.type=='error' and 'net::' not in m.text and 'Failed to load' not in m.text and err39.append(m.text))
    pg39.route('**/*.js*', lambda r: r.abort())
    pg39.goto(BASE); pg39.wait_for_timeout(500)
    pg39.evaluate("""() => new Promise((ok, no) => { const r = indexedDB.open('srp_db', 6);
      r.onupgradeneeded = () => { const db = r.result;
        const pl = db.createObjectStore('plantaciones', { keyPath: 'id' }); ['estatus', 'jornada_id'].forEach(i => pl.createIndex(i, i));
        db.createObjectStore('usuarios', { keyPath: 'id' }); db.createObjectStore('catalogos', { keyPath: 'id' });
        db.createObjectStore('bitacora', { keyPath: 'id' }).createIndex('entidad_id', 'entidad_id');
        db.createObjectStore('jornadas', { keyPath: 'id' }).createIndex('cabo_id', 'cabo_id');
        pl.put({ id: 'pl-7a', jornada_id: 'jr-7', estatus: 'activo', cabo_id: 'u-cabo-1', lat: 19.4326, lng: -99.1332, colonia: 'CENTRO I', colonia_cve: '15-040',
          capa_version: 'alcaldias=sia-2026-01-01;uga=sia-2026-09-22;colonias=iecm-2022-prueba' });
        pl.put({ id: 'pl-7b', jornada_id: 'jr-7', estatus: 'activo', cabo_id: 'u-cabo-1', lat: 19.30, lng: -99.10, capa_version: null }); };
      r.onsuccess = () => { r.result.close(); ok(true); }; r.onerror = () => no(r.error); })""")
    pg39.unroute('**/*.js*'); pg39.reload(); pg39.wait_for_timeout(1500)
    m39=pg39.evaluate("""async () => { const a = await SRP.almacen.uno('plantaciones', 'pl-7a'), b = await SRP.almacen.uno('plantaciones', 'pl-7b');
      return { v: SRP.almacen.db.version, a: a.capa_version, colonia: a.colonia, b: b.capa_version, capa: SRP.CAPAS.colonias.meta.version,
        vigente: SRP.derivacion.derivar(19.4326, -99.1332).capa_version, texto: SRP.ref.textoCapas(a.capa_version) }; }""")
    ok(m39['v']==8 and m39['a']=='alcaldias=sia-2026-01-01;uga=sia-2026-09-22;colonias=iecm-2022' and m39['colonia']=='CENTRO I' and m39['b'] is None,
       'la migración 7 cambia sólo el nombre de la versión de colonias en lo ya derivado, sin tocar la colonia ni lo que no tenía capas: %s' % m39)
    ok(m39['capa']=='iecm-2022' and m39['vigente'].endswith('colonias=iecm-2022') and m39['texto']=='Alcaldías sia-2026-01-01 · UGA sia-2026-09-22 · Colonias iecm-2022',
       'la capa de colonias del IECM es la definitiva: su versión ya no dice «prueba» ni el detalle «capa de prueba»: %s' % m39['texto'])
    ctx39.close()
    ctx39=b.new_context(viewport={'width':360,'height':780}, timezone_id='America/Mexico_City'); pg39=ctx39.new_page()
    pg39.on('pageerror', lambda e: err39.append(str(e))); pg39.on('console', lambda m: m.type=='error' and 'net::' not in m.text and 'Failed to load' not in m.text and err39.append(m.text))
    pg39.goto(BASE); pg39.wait_for_timeout(1200)
    pg39.select_option('#sel-usuario-prueba','u-cabo-1'); pg39.click('#btn-entrar-prueba'); pg39.wait_for_timeout(600)
    pg39.evaluate("""async () => { const u = SRP.sesion.usuario, cv = SRP.derivacion.derivar(19.4326, -99.1332).capa_version;
      const casos = [['jr-c1', 'Cierre mismo día', 'cerrada', '2026-09-22T15:40:00-06:00'], ['jr-c2', 'Cierre otro día', 'cerrada', '2026-09-23T10:05:00-06:00'],
                     ['jr-c3', 'Cierre sin hora', 'cerrada', null], ['jr-c4', 'Sigue abierta', 'abierta', null]];
      for (const [jid, nombre, estatus, cierre] of casos) {
        const j = Object.assign({ id: jid, nombre, ubicacion: '', programa_id: 'p-refor', lat: null, lng: null, punto_origen: null, gps_precision_m: null,
          alcaldia_cve: null, alcaldia: null, colonia_cve: null, colonia: null, fecha: '2026-09-22', comentarios: '', cabo_id: u.id, estatus, fecha_inicio: '2026-09-22T09:00:00-06:00', fecha_cierre: cierre,
          encargado_id: u.id, editado_por_id: null, fecha_ultima_edicion: null, arboles_previstos: 1, puntos_revisados: [], reporte_en: null,
          vehiculo_id: null, vehiculo_placa: '', vehiculo_modelo: '', vehiculo_tipo: '' }, Object.fromEntries(SRP.reportes.CAMPOS.map(k => [k, ''])));
        const r = { id: 'pl-' + jid, jornada_id: jid, estatus: 'activo', cabo_id: u.id, lat: 19.4326, lng: -99.1332, punto_origen: 'gps', gps_precision_m: 6,
          alcaldia: 'Cuauhtémoc', alcaldia_cve: '09015', colonia: null, colonia_cve: null, uga: 'CUH-021', uga_borde_m: 50, capa_version: cv, especie_id: 'ESP-0002', especie_otra: '', programa_id: 'p-refor',
          fecha_plantacion: '2026-09-22', comentarios: '', foto_id: null, foto_base64: null, fecha_registro: '2026-09-22T10:00:00-06:00', fecha_ultima_edicion: null, editado_por_id: null, folio: null };
        await SRP.almacen.guardarJuntos([{ almacen: 'jornadas', objeto: j, bitacora: SRP.bitacora.entrada('CREADO', 'jornada', jid, 'prueba') },
                                        { almacen: 'plantaciones', objeto: r, bitacora: SRP.bitacora.entrada('CREADO', 'plantacion', r.id, 'prueba') }]);
      } }""")
    pg39.click('.pestana[data-vista=jornadas]'); pg39.wait_for_timeout(900)
    pg39.evaluate("document.querySelector('#jornada-atajos [data-atajo=todas]').click()"); pg39.wait_for_timeout(700)
    pill=lambda nombre: pg39.locator('#lista-jornadas > li', has_text=nombre).locator('.jornada-estatus').inner_text().strip()
    c39=[pill('Cierre mismo día'), pill('Cierre otro día'), pill('Cierre sin hora'), pill('Sigue abierta')]
    ok(c39==['Cerrada a las 15:40','Cerrada el 23/09 a las 10:05','Cerrada','Abierta'],
       'la ficha de la jornada dice a qué hora se cerró, y el día si fue otro; sin hora guardada sólo «Cerrada»: %s' % c39)
    aria39=pg39.locator('#lista-jornadas > li', has_text='Cierre otro día').locator('.jornada-boton').get_attribute('aria-label')
    ok('cerrada el miércoles 23 de septiembre a las 10:05' in aria39,'el lector de pantalla también lo dice: '+aria39)
    pg39.locator('#lista-jornadas > li', has_text='Cierre mismo día').locator('.jornada-boton').click(); pg39.wait_for_timeout(800)
    sub39=pg39.inner_text('#jornada-sub')
    ok('cerrada el martes 22 de septiembre a las 15:40' in sub39,'el detalle dice «cerrada el martes 22 de septiembre a las 15:40»: '+sub39)
    pg39.click('#btn-jornada-volver'); pg39.wait_for_timeout(600)
    anchos=pg39.evaluate("""() => { const d = document.documentElement; return [d.scrollWidth <= d.clientWidth,
      [...document.querySelectorAll('#lista-jornadas .jornada-estado')].every(e => e.scrollWidth <= e.clientWidth + 1)]; }""")
    ok(anchos==[True, True],'a 360 px la ficha con la fecha de cierre no se desborda: %s' % anchos)
    ok(not err39,'sin errores en consola: %s' % err39[:2])
    ctx39.close()


    # ---------- BLOQUE 118: VEHÍCULOS DE PRUEBA CON PLACAS FICTICIAS ----------
    ctx40=b.new_context(viewport={'width':390,'height':844}); pg40=ctx40.new_page(); err40=[]
    pg40.on('pageerror', lambda e: err40.append(str(e))); pg40.on('console', lambda m: m.type=='error' and 'net::' not in m.text and 'Failed to load' not in m.text and err40.append(m.text))
    pg40.goto(BASE); pg40.wait_for_timeout(1200)
    cat40=pg40.evaluate("""async () => (await SRP.almacen.catalogos()).filter(c => c.tipo === 'vehiculo').map(c => c.nombre).sort()""")
    ok(len(cat40)==16 and all(re.fullmatch(r'PRU \d{3}', x) for x in cat40),'un teléfono nuevo recibe 16 vehículos de prueba con placas ficticias «PRU 001» a «PRU 016»: %s' % cat40[:3])
    pg40.select_option('#sel-usuario-prueba','u-cabo-1'); pg40.click('#btn-entrar-prueba'); pg40.wait_for_timeout(600)
    # Un teléfono con capturas y vehículos de arranque de antes: al cambiar el sello se retiran
    pg40.evaluate("""async () => { const u = SRP.sesion.usuario, v = (id, placa, por) => ({ id, tipo: 'vehiculo', clave: placa.replace(/ /g, ''), nombre: placa, activo: true,
        creado_por_id: por, fecha_creacion: '2026-09-26T12:00:00-06:00', editado_por_id: null, fecha_ultima_edicion: null, modelo: 'Dodge', tipo_vehiculo: 'Estacas' });
      const j = Object.assign({ id: 'jr-v40', nombre: 'Con vehículo viejo', ubicacion: '', programa_id: 'p-refor', lat: null, lng: null, punto_origen: null, gps_precision_m: null,
          alcaldia_cve: null, alcaldia: null, colonia_cve: null, colonia: null, fecha: '2026-09-25', comentarios: '', cabo_id: u.id, estatus: 'cerrada', fecha_inicio: '2026-09-25T09:00:00-06:00', fecha_cierre: '2026-09-25T14:00:00-06:00',
          encargado_id: u.id, editado_por_id: null, fecha_ultima_edicion: null, arboles_previstos: 1, puntos_revisados: [], reporte_en: null,
          vehiculo_id: 'v-VIEJO2', vehiculo_placa: 'VIEJO 2', vehiculo_modelo: 'Dodge', vehiculo_tipo: 'Estacas' }, Object.fromEntries(SRP.reportes.CAMPOS.map(k => [k, ''])));
      const r = { id: 'pl-v40', jornada_id: 'jr-v40', estatus: 'activo', cabo_id: u.id, lat: 19.4326, lng: -99.1332, punto_origen: 'gps', gps_precision_m: 6, alcaldia: 'Cuauhtémoc', alcaldia_cve: '09015',
          colonia: null, colonia_cve: null, uga: 'CUH-021', uga_borde_m: 50, capa_version: SRP.derivacion.derivar(19.4326, -99.1332).capa_version, especie_id: 'ESP-0002', especie_otra: '', programa_id: 'p-refor',
          fecha_plantacion: '2026-09-25', comentarios: '', foto_id: null, foto_base64: null, fecha_registro: '2026-09-25T10:00:00-06:00', fecha_ultima_edicion: null, editado_por_id: null, folio: null };
      await SRP.almacen.guardarJuntos([{ almacen: 'jornadas', objeto: j, bitacora: SRP.bitacora.entrada('CREADO', 'jornada', 'jr-v40', 'prueba') },
                                      { almacen: 'plantaciones', objeto: r, bitacora: SRP.bitacora.entrada('CREADO', 'plantacion', 'pl-v40', 'prueba') }]);
      await SRP.almacen._tx(['vehiculos'], 'readwrite', (tx) => { const st = tx.objectStore('vehiculos');
        st.put(v('v-VIEJO1', 'VIEJO 1', null)); st.put(v('v-VIEJO2', 'VIEJO 2', null)); st.put(v('v-ALTA1', 'ALTA 1', 'u-admin-1')); st.delete('v-PRU003'); });
      localStorage.setItem(SRP.CONFIG.CLAVE_SELLO, 'sello-viejo'); }""")
    pg40.reload(); pg40.wait_for_timeout(1800)
    v40=pg40.evaluate("""async () => { const c = await SRP.almacen.catalogos(), por = id => c.find(x => x.id === id), j = await SRP.almacen.uno('jornadas', 'jr-v40');
      return { arranque: SRP.almacen.arranque, viejo1: !!por('v-VIEJO1'), viejo2: por('v-VIEJO2') ? por('v-VIEJO2').activo : 'sin', alta: por('v-ALTA1') ? por('v-ALTA1').activo : 'sin',
        pru: c.filter(x => x.tipo === 'vehiculo' && /^PRU \d{3}$/.test(x.nombre)).length, jornada: [j.vehiculo_id, j.vehiculo_placa], arbol: !!(await SRP.almacen.uno('plantaciones', 'pl-v40')) }; }""")
    ok(v40['arranque']=='conservado' and v40['viejo1'] is False and v40['viejo2'] is False and v40['alta'] is True and v40['pru']==16 and v40['jornada']==['v-VIEJO2','VIEJO 2'] and v40['arbol'],
       'con capturas, el sello nuevo agrega los vehículos de prueba que falten, quita los de arranque viejos sin uso, desactiva el que usa una jornada (que conserva su copia) y no toca los dados de alta: %s' % v40)
    ok(not err40,'sin errores en consola: %s' % err40[:2])
    ctx40.close()


    # ---------- BLOQUE 120: CORRECCIONES DE LA REVISIÓN DE PANTALLAS ----------
    ctx41=b.new_context(viewport={'width':390,'height':844}, timezone_id='America/Mexico_City'); pg41=ctx41.new_page(); err41=[]
    pg41.on('pageerror', lambda e: err41.append(str(e))); pg41.on('console', lambda m: m.type=='error' and 'net::' not in m.text and 'Failed to load' not in m.text and err41.append(m.text))
    pg41.goto(BASE); pg41.wait_for_timeout(1200)
    acc41=pg41.evaluate("""(() => { const f = document.getElementById('form-acceso'), b = f.querySelector('button[type=submit]'), n = b.nextElementSibling;
      return { leyenda: document.body.innerHTML.includes('son obligatorios'), sep: Math.round(n.getBoundingClientRect().top - b.getBoundingClientRect().bottom) }; })()""")
    ok(not acc41['leyenda'] and acc41['sep']>=8,'sin la leyenda «Los campos marcados con * son obligatorios» en ninguna pantalla, y la nota bajo «Entrar» ya no va pegada al botón: %s' % acc41)
    pg41.select_option('#sel-usuario-prueba','u-cabo-1'); pg41.click('#btn-entrar-prueba'); pg41.wait_for_timeout(700)
    pg41.evaluate("SRP.app.mostrarVista('registrar')"); pg41.wait_for_timeout(500)
    ok(pg41.inner_text('#panel-iniciar-jornada .nota').strip()=='Registre los datos de la jornada (proyecto) del día.','Registrar jornada dice «Registre los datos de la jornada (proyecto) del día.»')
    pg41.fill('#ini-nombre','Jardín de revisión'); o41=pg41.eval_on_selector_all('#ini-programa option','l=>l.map(o=>o.value).filter(Boolean)'); pg41.select_option('#ini-programa',o41[0]); pg41.select_option('#ini-origen','PROGRAMADA'); pg41.fill('#ini-meta','3')
    pg41.evaluate("(f) => { const e = document.getElementById('ini-fecha'); e.value = f; e.dispatchEvent(new Event('input', {bubbles: true})); e.dispatchEvent(new Event('change', {bubbles: true})); }", HOY)
    pg41.click('#btn-iniciar-jornada'); pg41.wait_for_timeout(1200)
    ok(pg41.inner_text('#btn-jornada-cambiar').strip()=='Cambiar jornada','el botón de la franja dice «Cambiar jornada»')
    # Una especie tecleada sin elegirla de la lista también cuenta como árbol a medias
    pg41.fill('#campo-especie','Fres'); pg41.keyboard.press('Escape'); pg41.wait_for_timeout(300)
    pg41.evaluate("document.querySelector('.pestana[data-vista=registros]').click()"); pg41.wait_for_timeout(600)
    d41=[pg41.is_visible('#dlg-confirmar'), pg41.inner_text('#dlg-confirmar') if pg41.is_visible('#dlg-confirmar') else '']
    ok(d41[0] and 'La especie: Fres.' in d41[1],'con sólo la especie tecleada, salir de «Nuevo registro» pregunta antes de descartar el árbol: %s' % d41[1].replace('\n',' | ')[:160])
    pg41.click('#btn-confirmar-no'); pg41.wait_for_timeout(300)
    ok(pg41.evaluate("SRP.app.vista")=='registrar' and pg41.input_value('#campo-especie')=='Fres','al cancelar se queda en el árbol con lo escrito')
    pg41.evaluate("SRP.formulario.limpiar()"); pg41.wait_for_timeout(200)
    pg41.evaluate("document.getElementById('coord-lat').value = '19.43'"); 
    ok(pg41.evaluate("SRP.formulario.aMedias() && SRP.formulario.resumenAMedias().includes('Las coordenadas escritas.')"),'unas coordenadas escritas sin aplicar también cuentan')
    pg41.evaluate("SRP.formulario.limpiar()"); pg41.wait_for_timeout(200)
    ok(not pg41.evaluate("SRP.formulario.aMedias()"),'un formulario vacío no pregunta nada al salir')
    pg41.evaluate("SRP.app.mostrarVista('registros')"); pg41.wait_for_timeout(300); pg41.evaluate("SRP.app.mostrarVista('registrar')"); pg41.wait_for_timeout(700)
    # El folio del árbol guardado sin «(simulado)»
    pg41.evaluate("SRP.mapa.colocar(19.4326, -99.1332, 'Punto.', { origen: 'gps', precision: 5, centrar: true })"); pg41.wait_for_timeout(500)
    pg41.evaluate("SRP.formulario.elegirEspecie('ESP-0002')"); pg41.wait_for_timeout(200)
    pg41.click('#btn-revisar'); pg41.wait_for_timeout(1500)
    if pg41.is_visible('#dlg-resumen'): pg41.click('#btn-resumen-guardar'); pg41.wait_for_timeout(1500)
    g41=pg41.evaluate("document.getElementById('franja-guardado').hidden ? '' : document.getElementById('franja-guardado').textContent.replace(/\\s+/g, ' ')")
    ok('(simulado)' not in g41 and 'Guardado' in g41,'la franja «Guardado» ya no dice «(simulado)» junto al folio: %s' % g41.replace('\n',' | ')[:120])
    # La guía «¿Qué hacer sin internet?»: sólo la cola, con cuántos y de qué días
    pg41.evaluate("SRP.envio.forzarSinSenal(true)"); pg41.wait_for_timeout(300)
    pg41.evaluate("""async () => { const u = SRP.sesion.usuario, cv = SRP.derivacion.derivar(19.4326, -99.1332).capa_version, j = (await SRP.almacen.todos('jornadas'))[0];
      for (const [id, f] of [['pl-c1', '2026-09-27'], ['pl-c2', '2026-09-28'], ['pl-c3', '2026-09-28']]) {
        const r = { id, jornada_id: j.id, estatus: 'activo', cabo_id: u.id, lat: 19.4326, lng: -99.1332, punto_origen: 'gps', gps_precision_m: 6, alcaldia: 'Cuauhtémoc', alcaldia_cve: '09015',
          colonia: null, colonia_cve: null, uga: 'CUH-021', uga_borde_m: 50, capa_version: cv, especie_id: 'ESP-0002', especie_otra: '', programa_id: j.programa_id,
          fecha_plantacion: f, comentarios: '', foto_id: null, foto_base64: null, fecha_registro: f + 'T10:00:00-06:00', fecha_ultima_edicion: null, editado_por_id: null, folio: null };
        await SRP.almacen.guardarConBitacora('plantaciones', r, SRP.bitacora.entrada('CREADO', 'plantacion', id, 'prueba')); } }""")
    pg41.click('#conexion'); pg41.wait_for_timeout(700)
    s41=[pg41.is_visible('#senal-cola'), pg41.inner_text('#senal-cola-texto') if pg41.is_visible('#senal-cola') else '', pg41.is_hidden('#senal-estado'), pg41.inner_text('#dlg-senal')]
    hoy41=pg41.evaluate("SRP.util.formatearFecha(SRP.util.fechaHoy())")
    ok(s41[0] and (s41[1]=='3 registros por enviar: 28-SEP-2026 (2) y 27-SEP-2026 (1).' or s41[1]=='4 registros por enviar: %s (1), 28-SEP-2026 (2) y 27-SEP-2026 (1).' % hoy41) and s41[2] and 'Protegido' not in s41[3] and 'Espacio usado' not in s41[3] and 'Abre sin señal' not in s41[3],
       'con registros en cola, la guía dice cuántos y de qué días, del más reciente al más antiguo, sin el estado del teléfono: %s' % s41[1])
    pg41.click('#btn-senal-cerrar'); pg41.wait_for_timeout(200)
    pg41.evaluate("SRP.envio.forzarSinSenal(false)"); pg41.wait_for_timeout(300)
    ok(not err41,'sin errores en consola: %s' % err41[:2])
    ctx41.close()


    # ---------- BLOQUE 122: PROGRAMAS NUEVOS ----------
    ctx42=b.new_context(viewport={'width':390,'height':844}); pg42=ctx42.new_page(); err42=[]
    pg42.on('pageerror', lambda e: err42.append(str(e)))
    pg42.goto(BASE); pg42.wait_for_timeout(1200)
    pg42.select_option('#sel-usuario-prueba','u-cabo-1'); pg42.click('#btn-entrar-prueba'); pg42.wait_for_timeout(700)
    pg42.evaluate("SRP.app.mostrarVista('registrar')"); pg42.wait_for_timeout(500)
    p42=pg42.eval_on_selector_all('#ini-programa option','l=>l.map(o=>o.textContent.trim()).filter(t => t && !t.startsWith("Seleccione"))')
    ok(p42==['Reforestación Urbana','Centro Histórico','Compensaciones','Palmeras'],'Iniciar jornada ofrece a SEDEMA los cuatro programas, con «Palmeras» y «Compensaciones» por separado y sin «Jornadas de voluntariado»: %s' % p42)
    # Un teléfono con capturas y el sello anterior los recibe sin perder lo capturado
    pg42.evaluate("""async () => { await SRP.almacen._tx(['programas'], 'readwrite', tx => { tx.objectStore('programas').delete('p-palmeras'); tx.objectStore('programas').delete('p-compensaciones'); });
      const u = SRP.sesion.usuario;
      await SRP.almacen.guardarConBitacora('plantaciones', { id: 'pl-p42', jornada_id: null, estatus: 'activo', cabo_id: u.id, lat: 19.4326, lng: -99.1332, especie_id: 'ESP-0002', programa_id: 'p-refor', fecha_plantacion: '2026-09-20', fecha_registro: '2026-09-20T10:00:00-06:00', folio: null }, SRP.bitacora.entrada('CREADO', 'plantacion', 'pl-p42', 'prueba'));
      localStorage.setItem(SRP.CONFIG.CLAVE_SELLO, 'sello-viejo'); }""")
    pg42.reload(); pg42.wait_for_timeout(1800)
    q42=pg42.evaluate("""async () => { const c = await SRP.almacen.catalogos(); return { arr: SRP.almacen.arranque, pal: c.some(x => x.id === 'p-palmeras'), vol: c.some(x => x.id === 'p-compensaciones'), arbol: !!(await SRP.almacen.uno('plantaciones', 'pl-p42')) }; }""")
    ok(q42=={'arr':'conservado','pal':True,'vol':True,'arbol':True},'un teléfono con capturas recibe los dos programas nuevos con el sello nuevo y conserva lo capturado: %s' % q42)
    ok(not err42,'sin errores en consola: %s' % err42[:2])
    ctx42.close()


    # ---------- BLOQUES 123 A 125: INSTITUCIONES (ALCALDÍAS, GOBIERNO DE LA CDMX, EMPRESAS, ORGANIZACIONES CIVILES) ----------
    ctx43=b.new_context(viewport={'width':390,'height':844}, timezone_id='America/Mexico_City', geolocation={'latitude':19.357,'longitude':-99.06}, permissions=['geolocation'])
    pg43=ctx43.new_page(); err43=[]
    pg43.on('pageerror', lambda e: err43.append(str(e))); pg43.on('console', lambda m: m.type=='error' and 'net::' not in m.text and 'Failed to load' not in m.text and err43.append(m.text))
    pg43.goto(BASE); pg43.wait_for_timeout(1200)
    pg43.select_option('#sel-usuario-prueba','u-admin-1'); pg43.click('#btn-entrar-prueba'); pg43.wait_for_timeout(700)
    o43=pg43.evaluate("""(() => { const o = SRP.ref.deTipo('organizacion', false), por = {}; o.forEach(x => { por[x.tipo_organizacion] = (por[x.tipo_organizacion] || 0) + 1; });
      return { n: o.length, por, green: SRP.ref.catalogoPorId['o-green-cover'].nombre, refo: SRP.ref.catalogoPorId['o-reforestamos'].nombre,
        izp: [SRP.ref.catalogoPorId['o-alc-09007'].nombre, SRP.ref.nombreOrganizacion('o-alc-09007')], cuentas: SRP.ref.usuarios.length === 13 && SRP.ref.usuarios.every(u => u.nombre_completo && !('apellido_paterno' in u)),
        sobra: o.some(x => 'instrumento' in x || 'vigente_hasta' in x) }; })()""")
    ok(o43=={'n':21,'por':{'Gobierno de la CDMX':3,'Empresa privada':1,'Organización civil':1,'Alcaldía':16},'green':'Green Cover','refo':'Reforestamos México, A.C.','izp':['Iztapalapa','Alcaldía Iztapalapa'],'cuentas':True,'sobra':False},
       'de arranque vienen 21 instituciones en cuatro tipos —SEDEMA, PAOT, SOBSE, Green Cover, Reforestamos México y las 16 alcaldías, guardadas sin la palabra «Alcaldía»—; las trece cuentas con nombre completo: %s' % o43)
    # Catálogos › Instituciones: sólo renombrar y desactivar; alcaldías fijas; SEDEMA no se desactiva
    pg43.evaluate("SRP.app.mostrarVista('catalogos')"); pg43.wait_for_timeout(400)
    pg43.click('#cat-tipos .chip[data-tipo=organizacion]'); pg43.wait_for_timeout(500)
    fila=lambda t: pg43.locator('#tabla-catalogo tbody tr', has_text=t)
    t43=[pg43.inner_text('#cat-cuenta'), pg43.inner_text('#btn-cat-agregar').strip(), pg43.is_visible('#cat-nota-org'), pg43.inner_text('#cat-tipos .chip[data-tipo=organizacion]'),
         fila('Secretaría del Medio Ambiente').locator('button[data-accion=estado]').count(), fila('Alcaldía Iztapalapa').locator('button[data-accion]').count(),
         fila('Green Cover').locator('button[data-accion=editar]').count(), fila('Green Cover').locator('button[data-accion=estado]').count(), fila('Green Cover').locator('button[data-accion=eliminar]').count()]
    ok(t43==['21 instituciones','Agregar institución',True,'Instituciones',0,0,1,1,0],'la pestaña Instituciones agrega, renombra y desactiva; las alcaldías son fijas, SEDEMA no se desactiva y ninguna se elimina: %s' % t43)
    fila('Alcaldía Iztapalapa').click(); pg43.wait_for_timeout(300)
    ok(pg43.is_hidden('#dlg-catalogo'),'tocar una alcaldía no abre la edición')
    fila('Green Cover').click(); pg43.wait_for_timeout(300)
    r43=[pg43.inner_text('#dlg-catalogo-titulo'), pg43.is_hidden('#cat-clave'), pg43.is_disabled('#cat-tipo-org'), pg43.input_value('#cat-tipo-org')]
    pg43.fill('#cat-nombre','Reforestamos México, A.C.'); pg43.click('#form-catalogo button[type=submit]'); pg43.wait_for_timeout(300)
    dup43='Ya existe una institución con ese nombre' in pg43.inner_text('#cat-errores')
    pg43.fill('#cat-nombre','Green Cover México'); pg43.click('#form-catalogo button[type=submit]'); pg43.wait_for_timeout(500)
    ok(r43==['Renombrar institución',True,True,'Empresa privada'] and dup43 and pg43.evaluate("SRP.ref.catalogoPorId['o-green-cover'].nombre")=='Green Cover México',
       'renombrar una institución: sin clave a la vista, el tipo fijo, sin nombres repetidos: %s' % r43)
    pg43.evaluate("(async () => { const o = Object.assign({}, SRP.ref.catalogoPorId['o-green-cover'], { nombre: 'Green Cover' }); await SRP.almacen.guardarCatalogo(o, null); await SRP.ref.recargar(); SRP.catalogos.preparar(); })()"); pg43.wait_for_timeout(300)
    # Agregar una institución: sólo aquí, con su tipo (nunca Alcaldía) y la clave puesta por el sistema
    pg43.click('#btn-cat-agregar'); pg43.wait_for_timeout(300)
    ag43=[pg43.inner_text('#dlg-catalogo-titulo'), pg43.is_enabled('#cat-tipo-org'), pg43.eval_on_selector_all('#cat-tipo-org option:not([hidden])','l=>l.map(o=>o.value).filter(Boolean)'), pg43.is_hidden('#cat-clave')]
    pg43.fill('#cat-nombre','Viveros Ejemplo, S.A. de C.V.'); pg43.click('#form-catalogo button[type=submit]'); pg43.wait_for_timeout(300)
    sinTipo43='Elija el tipo de institución' in pg43.inner_text('#cat-errores')
    pg43.select_option('#cat-tipo-org','Empresa privada'); pg43.click('#form-catalogo button[type=submit]'); pg43.wait_for_timeout(500)
    n43=pg43.evaluate("(() => { const o = SRP.ref.deTipo('organizacion', false).find(x => x.nombre === 'Viveros Ejemplo, S.A. de C.V.'); return o ? [o.tipo_organizacion, o.clave, o.activo] : null; })()")
    ok(ag43==['Agregar institución',True,['Gobierno de la CDMX','Empresa privada','Organización civil'],True] and sinTipo43 and n43==['Empresa privada','VIVEROS_EJEMPLO_S_A_DE_C_V',True],
       'agregar una institución pide el tipo —sin Alcaldía— y el nombre; la clave la pone el sistema: %s %s' % (ag43, n43))
    # Dar de alta: tipo primero; la institución según el tipo; alcaldías sin repetir «Alcaldía»
    pg43.evaluate("SRP.app.mostrarVista('usuarios')"); pg43.wait_for_timeout(500)
    pg43.click('#btn-usr-agregar'); pg43.wait_for_timeout(300)
    orden43=pg43.evaluate("[...document.querySelectorAll('#form-usuario .campo > :is(input,select)')].map(e => e.id)")
    a43=[orden43[:6], pg43.is_hidden('#caja-usr-organizacion'), pg43.is_hidden('#caja-usr-area')]
    ok(a43[0]==['usr-tipo-org','usr-organizacion','usr-area','usr-nombre-completo','usr-correo','usr-cargo'] and a43[1] and a43[2],
       'el alta empieza por el tipo de institución; la institución y el área aparecen después, y el nombre va completo en un solo campo: %s' % a43)
    pg43.select_option('#usr-tipo-org','Alcaldía'); pg43.wait_for_timeout(200)
    al43=pg43.eval_on_selector_all('#usr-organizacion option','l=>l.map(o=>o.textContent)')
    ok(len(al43)==17 and 'Iztapalapa' in al43 and not any(x.startswith('Alcaldía ') for x in al43) and pg43.inner_text('#etq-usr-organizacion').startswith('Alcaldía'),
       'con «Alcaldía» salen las 16 sin repetir la palabra: %s…' % al43[:4])
    pg43.select_option('#usr-organizacion','o-alc-09007'); pg43.wait_for_timeout(200)
    b43=[pg43.is_hidden('#caja-usr-area'), pg43.eval_on_selector_all('#usr-perfil option','l=>l.map(o=>o.value).filter(Boolean)'), pg43.is_hidden('#caja-usr-coordinador')]
    ok(b43==[True,['CABO','COORDINADOR','DIRECTIVO'],False],'una cuenta de alcaldía es de cabo, de coordinación o directiva, sin área; el cabo lleva coordinador: %s' % b43)
    pg43.fill('#usr-nombre-completo','Ramiro Iztapalapa Ejemplo'); pg43.fill('#usr-correo','cabo.izp@ejemplo.local'); pg43.fill('#usr-cargo','Cabo de cuadrilla')
    pg43.click('#form-usuario button[type=submit]'); pg43.wait_for_timeout(600)
    cizp=pg43.evaluate("SRP.ref.usuarios.find(u => u.correo === 'cabo.izp@ejemplo.local')")
    ok(pg43.is_hidden('#dlg-usuario') and cizp and [cizp['organizacion_id'], cizp['area_id'], cizp['perfil'], cizp['coordinadores_ids'], cizp['nombre_completo']]==['o-alc-09007',None,'CABO',[],'Ramiro Iztapalapa Ejemplo'],
       'se da de alta el cabo de la alcaldía: %s' % (cizp and [cizp['organizacion_id'], cizp['perfil'], cizp['nombre_completo']]))
    # En el alta sólo se elige: las instituciones nuevas se agregan en Catálogos
    pg43.click('#btn-usr-agregar'); pg43.wait_for_timeout(300)
    pg43.select_option('#usr-tipo-org','Empresa privada'); pg43.wait_for_timeout(200)
    em43=pg43.eval_on_selector_all('#usr-organizacion option','l=>l.map(o=>o.textContent).filter(t => !t.startsWith("Seleccione"))')
    ay43=pg43.is_visible('#usr-organizacion-ayuda') and 'Catálogos' in pg43.inner_text('#usr-organizacion-ayuda')
    pg43.select_option('#usr-organizacion', label='Viveros Ejemplo, S.A. de C.V.'); pg43.wait_for_timeout(200)
    pg43.fill('#usr-nombre-completo','Nadia Contratista Ejemplo'); pg43.fill('#usr-correo','nadia.viveros@ejemplo.local'); pg43.fill('#usr-cargo','Cabo de cuadrilla')
    pg43.click('#form-usuario button[type=submit]'); pg43.wait_for_timeout(600)
    ok(em43==['Green Cover','Viveros Ejemplo, S.A. de C.V.'] and ay43 and pg43.is_hidden('#dlg-usuario'),
       'en el alta la empresa se elige de la lista —sin «Agregar otra…»— y se avisa que las nuevas se agregan en Catálogos: %s' % em43)
    emp43=pg43.evaluate("SRP.ref.usuarios.find(x => x.correo === 'nadia.viveros@ejemplo.local').organizacion_id")
    r43=pg43.evaluate("""(() => { SRP.usuarios.editando = null;
      const v = (d) => SRP.usuarios.validar(Object.assign({ nombre_completo: 'Ana Prueba', correo: 'nuevo' + Math.random() + '@ejemplo.local', cargo_rol: 'X', area_id: null, institucion_nueva: '' }, d)).map(e => e[1]);
      return { admin: v({ tipo_organizacion: 'Gobierno de la CDMX', organizacion_id: 'o-paot', perfil: 'ADMIN' }), coordP: v({ tipo_organizacion: 'Gobierno de la CDMX', organizacion_id: 'o-paot', perfil: 'COORDINADOR' }),
               coord: v({ tipo_organizacion: 'Gobierno de la CDMX', organizacion_id: 'o-paot', perfil: 'CABO', coordinadores_ids: ['u-coord-1'] }),
               area: v({ tipo_organizacion: 'Gobierno de la CDMX', organizacion_id: 'o-sedema', perfil: 'CABO' }), sinTipo: v({ tipo_organizacion: '', organizacion_id: '', perfil: 'CABO' }),
               sinAlc: v({ tipo_organizacion: 'Alcaldía', organizacion_id: '', perfil: 'CABO' }), unNombre: v({ tipo_organizacion: 'Alcaldía', organizacion_id: 'o-alc-09003', perfil: 'CABO', nombre_completo: 'Ana' }) }; })()""")
    FUERA='La Administración global es sólo de la Secretaría: fuera de ella, la cuenta es de cabo, de coordinación o directiva.'
    ok(r43=={'admin':[FUERA],'coordP':[],'coord':['Los coordinadores del cabo son de su misma institución.'],'area':['Elija el área.'],'sinTipo':['Elija el tipo de institución.'],
             'sinAlc':['Elija la alcaldía.'],'unNombre':['Escriba nombre y al menos un apellido.']},'las reglas de la cuenta: Administración sólo en SEDEMA, coordinación también fuera, el coordinador del cabo de su misma institución, área sólo en SEDEMA, tipo e institución obligatorios, nombre con apellido: %s' % r43)
    pg43.select_option('#usr-filtro-org','o-alc-09007'); pg43.wait_for_timeout(300)
    ok(pg43.inner_text('#usr-cuenta').startswith('4 de 15') and 'Alcaldía Iztapalapa' in pg43.inner_text('#tabla-usuarios tbody'),'Usuarios filtra por institución: %s' % pg43.inner_text('#usr-cuenta'))
    # El cabo de la alcaldía inicia una jornada: queda a nombre de la alcaldía, sin chófer ni vehículo
    pg43.click('#btn-cuenta'); pg43.click('#btn-cambiar-perfil'); pg43.wait_for_timeout(300)
    ok('Alcaldía Iztapalapa' in pg43.inner_text('#sel-usuario-prueba'),'la lista de prueba dice la institución de las cuentas de fuera')
    pg43.select_option('#sel-usuario-prueba',cizp['id']); pg43.click('#btn-entrar-prueba'); pg43.wait_for_timeout(700)
    jz=iniciar_jornada(pg43,'Camellón de la alcaldía')
    ok(pg43.evaluate("SRP.activa.jornada.organizacion_id")=='o-alc-09007','la jornada queda a nombre de la institución de quien la inicia')
    registrar(pg43,'aile','ESP-0002'); pg43.wait_for_timeout(300)
    pg43.evaluate("""async () => { const j = await SRP.almacen.uno('jornadas', '%s'); j.estatus = 'cerrada'; j.fecha_cierre = SRP.util.ahoraISO(); await SRP.almacen.guardarConBitacora('jornadas', j, null); }""" % jz); pg43.wait_for_timeout(300)
    reporte_de(pg43,'Camellón de la alcaldía')
    ok(pg43.is_visible('#dlg-cierre') and pg43.is_hidden('#caja-cie-chofer') and pg43.is_hidden('#caja-cie-vehiculo'),'el cierre de una jornada de la alcaldía no pide chófer ni vehículo')
    m43=pg43.evaluate("""async () => { const j = await SRP.almacen.uno('jornadas', '%s'); const regs = (await SRP.almacen.todos('plantaciones')).filter(r => r.jornada_id === j.id && r.estatus === 'activo');
      return SRP.reportes.modelo(regs, j, j.fecha, null).identificacion.map(x => x[0] + ': ' + x[1]); }""" % jz)
    ok('Institución que ejecuta: Alcaldía Iztapalapa' in m43 and not any('Contrato' in x for x in m43),'el reporte dice la institución que ejecuta: %s' % [x for x in m43 if 'Instit' in x])
    pg43.click('#btn-cierre-cerrar'); pg43.wait_for_timeout(200)
    # Institución desactivada: sus cuentas no entran, ni con la sesión abierta
    pg43.evaluate("""async () => { const o = Object.assign({}, SRP.catalogos ? SRP.ref.catalogoPorId['%s'] : null, { activo: false });
      await SRP.almacen.guardarCatalogo(o, null); await SRP.ref.recargar(); }""" % emp43)
    pg43.evaluate("""async () => { const u = Object.assign({}, SRP.sesion.usuario, { organizacion_id: '%s' }); await SRP.almacen.guardarConBitacora('usuarios', u, null); }""" % emp43)
    pg43.reload(); pg43.wait_for_timeout(1500)
    pg43.fill('#acceso-correo','nadia.viveros@ejemplo.local'); pg43.fill('#acceso-clave','x'); pg43.click('#form-acceso button[type=submit]'); pg43.wait_for_timeout(500)
    ok(pg43.is_visible('#form-acceso') and 'está desactivada' in pg43.inner_text('#acceso-errores') and 'Viveros' not in pg43.inner_text('#sel-usuario-prueba'),
       'con la institución desactivada sus cuentas no entran —tampoco con la sesión abierta— y se dice por qué: %s' % pg43.inner_text('#acceso-errores').replace('\n',' | ')[:140])
    # Al abrir: cuentas de antes con tres campos de nombre y sin institución; instituciones con tipos, contrato o vigencia de antes
    pg43.evaluate("""() => SRP.almacen._tx(['usuarios', 'jornadas', 'instituciones'], 'readwrite', tx => {
      tx.objectStore('usuarios').put({ id: 'u-viejo', correo: 'v@ejemplo.local', nombre: 'Vieja', apellido_paterno: 'Cuenta', apellido_materno: '', perfil: 'CABO', activo: true });
      tx.objectStore('jornadas').put({ id: 'j-vieja', cabo_id: 'u-viejo', fecha: '2026-09-01', estatus: 'cerrada', nombre: 'Jornada de antes' });
      tx.objectStore('instituciones').put({ id: 'o-vieja', clave: 'VIEJA', nombre: 'Institución de antes', activo: true, tipo_organizacion: 'Organismo público', instrumento: 'X', vigente_hasta: '2030-01-01' });
      SRP.almacen.ponerCatalogo(tx, Object.assign({}, SRP.ref.catalogoPorId['o-alc-09003'], { nombre: 'Alcaldía Coyoacán' })); })""")
    pg43.reload(); pg43.wait_for_timeout(1500)
    mg43=pg43.evaluate("""async () => { const u = await SRP.almacen.uno('usuarios', 'u-viejo'), j = await SRP.almacen.uno('jornadas', 'j-vieja'), o = await SRP.almacen.catalogo('o-vieja'), c = await SRP.almacen.catalogo('o-alc-09003');
      return { u: [u.organizacion_id, u.nombre_completo, 'nombre' in u, 'apellido_paterno' in u], j: j.organizacion_id, o: [o.tipo_organizacion, 'instrumento' in o, 'vigente_hasta' in o], c: c.nombre }; }""")
    ok(mg43=={'u':['o-sedema','Vieja Cuenta',False,False],'j':'o-sedema','o':['Gobierno de la CDMX',False,False],'c':'Coyoacán'},
       'al abrir se ponen al día las cuentas (institución y nombre completo), las jornadas y las instituciones de antes, sin borrar nada: %s' % mg43)
    # Áreas de la Secretaría: las cuatro; un teléfono con capturas y el catálogo anterior pasa sus cuentas a la nueva
    ar43=pg43.evaluate("SRP.ref.deTipo('area', false).map(a => a.nombre)")
    pg43.evaluate("""async () => { await SRP.almacen._tx(['areas', 'usuarios'], 'readwrite', tx => {
        SRP.almacen.ponerCatalogo(tx, { id: 'a-div', tipo: 'area', clave: 'DIV', nombre: 'Dirección de Infraestructura Verde', activo: true, creado_por_id: 'u-admin-1', fecha_creacion: '2026-09-01T09:00:00-06:00', editado_por_id: null, fecha_ultima_edicion: null });
        SRP.almacen.ponerCatalogo(tx, Object.assign({}, SRP.ref.catalogoPorId['a-sia'], { nombre: 'Coordinación del SIA' }));
        tx.objectStore('usuarios').put(Object.assign({}, SRP.ref.usuarioPorId['u-coord-1'], { area_id: 'a-div' })); });
      localStorage.setItem(SRP.CONFIG.CLAVE_SELLO, 'sello-viejo'); }""")
    pg43.reload(); pg43.wait_for_timeout(1500)
    rt43=pg43.evaluate("""async () => ({ arr: SRP.almacen.arranque, div: !!(await SRP.almacen.catalogo('a-div')), sia: (await SRP.almacen.catalogo('a-sia')).nombre,
      coord: (await SRP.almacen.uno('usuarios', 'u-coord-1')).area_id })""")
    ok(sorted(ar43)==['DGEIRA','DGSANPAVA','Oficina de la Secretaría','Sistema de Información Ambiental'] and rt43=={'arr':'conservado','div':False,'sia':'Sistema de Información Ambiental','coord':'a-dgsanpava'},
       'las áreas son DGSANPAVA, Oficina de la Secretaría, Sistema de Información Ambiental y DGEIRA; un teléfono con capturas pasa sus cuentas del área retirada a DGSANPAVA y renombra la del SIA: %s %s' % (ar43, rt43))
    ok(not err43,'sin errores en consola: %s' % err43[:2])
    ctx43.close()


    # ---------- BLOQUE 124: SUPERVISIÓN E INFORMES POR INSTITUCIÓN ----------
    ctx44=b.new_context(viewport={'width':1280,'height':900}, timezone_id='America/Mexico_City', accept_downloads=True); pg44=ctx44.new_page(); err44=[]
    pg44.on('pageerror', lambda e: err44.append(str(e))); pg44.on('console', lambda m: m.type=='error' and 'net::' not in m.text and 'Failed to load' not in m.text and err44.append(m.text))
    pg44.goto(BASE); pg44.wait_for_timeout(1200)
    def entrar44(uid):
        if not pg44.is_visible('#sel-usuario-prueba'):
            pg44.evaluate("SRP.app.menuCuenta(false)"); pg44.click('#btn-cuenta'); pg44.click('#btn-cambiar-perfil'); pg44.wait_for_timeout(200)
        pg44.select_option('#sel-usuario-prueba', uid); pg44.click('#btn-entrar-prueba'); pg44.wait_for_timeout(900)
    entrar44('u-admin-1')
    d44=pg44.evaluate("""async () => { await SRP.demo.cargar(); const j = (await SRP.almacen.todos('jornadas')).filter(x => SRP.demo.es(x.id)), porOrg = {};
      j.forEach(x => { porOrg[x.organizacion_id] = (porOrg[x.organizacion_id] || 0) + 1; });
      const ext = j.filter(x => x.organizacion_id !== 'o-sedema');
      return { orgs: Object.keys(porOrg).sort(), sinVeh: ext.every(x => !x.vehiculo_id && !x.chofer && !x.personal && !x.apoyo), emp: SRP.ref.catalogoPorId['demo-org-empresa'].tipo_organizacion,
               cuentas: SRP.ref.usuarios.filter(u => SRP.demo.es(u.id) && u.organizacion_id !== 'o-sedema').map(u => [u.perfil, u.area_id, (u.coordinadores_ids || [])[0] || null]) }; }""")
    CU44=[['CABO',None,None]]*3+[['CABO',None,'u-coord-alc']]*2+[['CABO',None,'u-coord-gob'],['CABO',None,'u-coord-emp'],['CABO',None,'u-coord-osc'],['CABO',None,'u-coord-osc']]
    ok(d44['orgs']==sorted(['demo-org-empresa','o-alc-09003','o-alc-09007','o-green-cover','o-paot','o-reforestamos','o-sedema','o-sobse']) and d44['sinVeh'] and d44['emp']=='Empresa privada' and sorted(map(str,d44['cuentas']))==sorted(map(str,CU44)),
       'los datos de demostración traen instituciones de fuera: sus jornadas sin personal, chófer ni vehículo; sus cabos, sin área, con el coordinador de su institución o sin coordinación: %s' % d44)
    pg44.evaluate("SRP.app.mostrarVista('supervision')"); pg44.wait_for_timeout(600)
    abrir_sup(pg44)
    pg44.click('#sup-tipos .chip[data-tipo=todo]'); pg44.wait_for_timeout(900)
    t44=pg44.evaluate("""(() => { const s = document.querySelector('details[data-seccion=instituciones]'); if (!s) return null;
      const filas = [...s.querySelectorAll('tbody tr')].map(tr => [...tr.cells].map(td => td.textContent.trim()));
      return { titulo: s.querySelector('h2').textContent, filas, total: Number(document.querySelector('.sup-cifra b').textContent.replace(/,/g, '')) }; })()""")
    suma44=sum(int(f[1].replace(',','')) for f in t44['filas']) if t44 else -1
    ok(t44 and t44['titulo']=='Por institución' and [f[0] for f in t44['filas']][0]=='Secretaría del Medio Ambiente (SEDEMA)' and len(t44['filas'])==8 and suma44==t44['total'] and pg44.get_attribute('#caja-sup-organizacion','hidden') is None,
       'Supervisión de la Administración desglosa por institución —SEDEMA y las siete de fuera— y suman el total de la Ciudad: %s = %s' % (t44 and [(f[0],f[1]) for f in t44['filas']], t44 and t44['total']))
    izp44=next(f for f in t44['filas'] if f[0]=='Alcaldía Iztapalapa')
    pg44.click('#sup-filtros summary'); pg44.wait_for_timeout(150); pg44.select_option('#sup-organizacion','o-alc-09007'); pg44.wait_for_timeout(900)
    f44=[pg44.inner_text('.sup-cifra b >> nth=0'), pg44.locator('.sup-tabla-cabos tbody tr').count(), pg44.inner_text('#sup-filtros-texto'),
         pg44.locator('details[data-seccion=instituciones]').count(), pg44.inner_text('.sup-cifra >> nth=2')]
    ok(f44[0]==izp44[1] and f44[1]==4 and f44[2]=='Más filtros: Alcaldía Iztapalapa' and f44[3]==0 and '3 de 3' in f44[4],
       'con la institución elegida quedan sólo sus árboles, sus 3 cabos (2 de demostración y el de arranque) y su coordinador, que también registra; «3 de 3 cabos» no cuenta al coordinador; y ya no se desglosa: %s' % f44)
    with pg44.expect_download() as dc44: pg44.click('#btn-sup-csv')
    csv44=open(dc44.value.path(), encoding='utf-8').read()
    ok(dc44.value.suggested_filename=='Arboles_todo_ALC_IZP.csv' and csv44.split('\r\n')[0].startswith('﻿"Folio","Fecha de plantación","Jornada","Institución que ejecuta","Cabo"') and '"Alcaldía Iztapalapa"' in csv44 and 'SEDEMA' not in csv44,
       'la tabla para Excel dice la institución que ejecuta y se nombra por ella: %s' % dc44.value.suggested_filename)
    pg44.select_option('#sup-organizacion',''); pg44.wait_for_timeout(900)
    pg44.click('#sup-tipos .chip[data-tipo=anio]'); pg44.wait_for_timeout(900)
    with pg44.expect_download() as dp44: pg44.click('#btn-sup-pdf')
    dp44.value.save_as(sal('informe_org.pdf'))
    from pypdf import PdfReader as _Pdf44
    txt44=' '.join(' '.join((p.extract_text() or '') for p in _Pdf44(sal('informe_org.pdf')).pages).split())
    ok('POR INSTITUCIÓN' in txt44 and 'Viveros y Paisaje Ejemplo' in txt44 and 'Alcaldía Iztapalapa' in txt44,'el informe anual de la Ciudad trae el desglose por institución')
    # Un cabo de la alcaldía ve sólo lo suyo, sin filtro ni desglose de institución
    entrar44('u-demo-z2'); pg44.evaluate("SRP.app.mostrarVista('supervision')"); pg44.wait_for_timeout(700)
    abrir_sup(pg44)
    # Con la base de demostración el cálculo tarda: se espera a que los datos sean ya los de esta cuenta
    esperar(pg44, "!!(SRP.supervision.datos && SRP.supervision.datos.usuario && SRP.supervision.datos.usuario.id === 'u-demo-z2')", 6000); pg44.wait_for_timeout(300)
    z44=pg44.evaluate("""({ orgs: [...new Set(SRP.supervision.datos.jornadas.map(j => SRP.indicadores.organizacionDe(j)))], cabos: [...new Set(SRP.supervision.datos.jornadas.map(j => j.cabo_id))],
      titulo: document.getElementById('titulo-supervision').textContent, filtro: !document.getElementById('caja-sup-organizacion').hidden, desglose: !!document.querySelector('details[data-seccion=instituciones]') })""")
    ok(z44=={'orgs':['o-alc-09007'],'cabos':['u-demo-z2'],'titulo':'Mi avance','filtro':False,'desglose':False},'un cabo de la alcaldía ve sólo lo suyo en «Mi avance», sin filtro ni desglose de instituciones: %s' % z44)
    entrar44('u-admin-1')
    q44=pg44.evaluate("async () => { await SRP.demo.quitar(); return [!!(await SRP.almacen.catalogo('demo-org-empresa')), !!(await SRP.almacen.catalogo('o-alc-09007'))]; }")
    ok(q44==[False,True],'al quitar la demostración se va también la empresa de demostración; la alcaldía, que es de arranque, se queda')
    ok(not err44,'sin errores en consola: %s' % err44[:2])
    ctx44.close()


    # ---------- BLOQUE 127: UNA CUENTA DE PRUEBA POR TIPO Y REINICIO DE LOS DATOS DE PRUEBA ----------
    ctx45=b.new_context(viewport={'width':390,'height':844}); pg45=ctx45.new_page(); err45=[]
    pg45.on('pageerror', lambda e: err45.append(str(e))); pg45.on('console', lambda m: m.type=='error' and 'net::' not in m.text and 'Failed to load' not in m.text and err45.append(m.text))
    pg45.goto(BASE); pg45.wait_for_timeout(1300)
    op45=pg45.eval_on_selector_all('#sel-usuario-prueba option','l=>l.map(o=>o.textContent)')
    PAOT='Procuraduría Ambiental y del Ordenamiento Territorial (PAOT)'
    ok(op45==['Administración SIA Ejemplo — Administración global','Zutana Ríos Ejemplo — Directivo','Perengano Gómez Ejemplo — Coordinador','Fulana de Tal Ejemplo — Cabo',
              'Mengano Paz Ejemplo — Directivo, Alcaldía Iztapalapa','Sergio Navarro Ejemplo — Coordinador, Alcaldía Iztapalapa','Ramiro Torres Ejemplo — Cabo, Alcaldía Iztapalapa',
              'Mariana Vega Ejemplo — Coordinador, '+PAOT,'Lucía Méndez Ejemplo — Cabo, '+PAOT,
              'Héctor Salinas Ejemplo — Coordinador, Green Cover','Óscar Rivas Ejemplo — Cabo, Green Cover',
              'Carmen Ibarra Ejemplo — Coordinador, Reforestamos México, A.C.','Andrea Solís Ejemplo — Cabo, Reforestamos México, A.C.'],
       'la entrada de prueba ofrece en SEDEMA una cuenta por perfil y, por tipo de institución, su coordinador y su cabo (y el directivo de la alcaldía): %s' % op45)
    c45=pg45.evaluate("SRP.ref.usuarios.filter(u => !SRP.ref.esSedema(u.organizacion_id)).map(u => [u.perfil, u.area_id, (u.coordinadores_ids || []).length ? u.coordinadores_ids.every(c => SRP.ref.usuarioPorId[c].organizacion_id === u.organizacion_id) : null])")
    ok(sorted(map(str,c45))==sorted(map(str,[['COORDINADOR',None,None]]*4+[['CABO',None,True]]*4+[['DIRECTIVO',None,None]])),'las cuentas de fuera no llevan área; cada cabo tiene un coordinador de su misma institución: %s' % c45)
    # Con demostración, sus cuentas van aparte, en su grupo
    pg45.select_option('#sel-usuario-prueba','u-admin-1'); pg45.click('#btn-entrar-prueba'); pg45.wait_for_timeout(700)
    pg45.evaluate("SRP.demo.cargar()"); pg45.wait_for_timeout(200)
    esperar(pg45,"SRP.ref.usuarios.some(u => SRP.demo.es(u.id))",90000)
    pg45.evaluate("SRP.sesion.cerrar(); SRP.app.mostrarAcceso()"); pg45.wait_for_timeout(400)
    g45=pg45.evaluate("""(() => { const s = document.getElementById('sel-usuario-prueba'); const g = s.querySelector('optgroup');
      return { fuera: [...s.children].filter(x => x.tagName === 'OPTION').length, grupo: g ? g.label : null, demo: g ? g.children.length : 0 }; })()""")
    ok(g45=={'fuera':13,'grupo':'Datos de demostración','demo':16},'con los datos de demostración, sus 16 cuentas van aparte en «Datos de demostración»: %s' % g45)
    # Un teléfono con un sello anterior al de reinicio vuelve a empezar aunque tenga capturas
    pg45.evaluate("""async () => { await SRP.almacen.guardarConBitacora('plantaciones', { id: 'pl-45', jornada_id: null, estatus: 'activo', cabo_id: 'u-cabo-1', lat: 19.43, lng: -99.13, especie_id: 'ESP-0002', fecha_plantacion: '2026-09-20' }, null);
      localStorage.setItem(SRP.CONFIG.CLAVE_SELLO, '2026-09-29-instituciones'); }""")
    pg45.reload(); pg45.wait_for_timeout(1800)
    # El aviso sale poco después de arrancar: se espera a verlo, no un tiempo fijo
    esperar(pg45, "(() => { const a = document.getElementById('aviso'); return !!a && !a.hidden && /Se reiniciaron/.test(a.textContent); })()", 8000)
    r45=pg45.evaluate("""async () => ({ arr: SRP.almacen.arranque, arbol: !!(await SRP.almacen.uno('plantaciones', 'pl-45')), demo: (await SRP.almacen.todos('jornadas')).filter(j => SRP.demo.es(j.id)).length,
      cuentas: (await SRP.almacen.todos('usuarios')).length, sello: localStorage.getItem(SRP.CONFIG.CLAVE_SELLO) === SRP.CONFIG.SELLO_DATOS })""")
    aviso45=pg45.inner_text('#aviso') if pg45.is_visible('#aviso') else ''
    ok(r45=={'arr':'reiniciado','arbol':False,'demo':0,'cuentas':13,'sello':True} and 'Se reiniciaron los datos de prueba' in aviso45,
       'un teléfono con un sello anterior al de reinicio vuelve a empezar —sin capturas ni demostración, con las 13 cuentas— y lo avisa: %s' % r45)
    ok(not err45,'sin errores en consola: %s' % err45[:2])
    ctx45.close()


    # ---------- BLOQUE 128: PROGRAMAS POR INSTITUCIÓN Y CIERRE DE EMPRESAS PRIVADAS ----------
    ctx46=b.new_context(viewport={'width':390,'height':844}, geolocation={'latitude':19.432,'longitude':-99.133}, permissions=['geolocation']); pg46=ctx46.new_page(); err46=[]
    pg46.on('pageerror', lambda e: err46.append(str(e))); pg46.on('console', lambda m: m.type=='error' and 'net::' not in m.text and 'Failed to load' not in m.text and err46.append(m.text))
    pg46.goto(BASE); pg46.wait_for_timeout(1300)
    def programas46(uid):
        pg46.evaluate("SRP.sesion.cerrar(); SRP.app.mostrarAcceso()"); pg46.wait_for_timeout(300)
        pg46.select_option('#sel-usuario-prueba', uid); pg46.click('#btn-entrar-prueba'); pg46.wait_for_timeout(700)
        pg46.evaluate("SRP.app.mostrarVista('registrar')"); pg46.wait_for_timeout(500)
        return pg46.eval_on_selector_all('#ini-programa option','l=>l.map(o=>o.textContent.trim()).filter(t => t && !t.startsWith("Seleccione"))')
    pr46={u: programas46(u) for u in ['u-cabo-alc','u-cabo-gob','u-cabo-osc','u-cabo-emp']}
    RU=['Reforestación Urbana']
    ok(pr46=={'u-cabo-alc':RU,'u-cabo-gob':RU,'u-cabo-osc':RU,'u-cabo-emp':['Palmeras']},'una empresa privada sólo puede elegir «Palmeras»; alcaldías, Gobierno de la CDMX y organizaciones civiles, sólo «Reforestación Urbana»: %s' % pr46)
    v46=pg46.evaluate("(() => { document.getElementById('ini-programa').innerHTML += '<option value=\"p-refor\">x</option>'; document.getElementById('ini-programa').value = 'p-refor'; document.getElementById('ini-origen').value = 'PROGRAMADA'; document.getElementById('ini-nombre').value = 'Prueba'; document.getElementById('ini-meta').value = '3'; SRP.activa.iniciarJornada(); return document.getElementById('ini-errores').textContent; })()")
    ok('no está disponible para su institución' in v46,'aunque se fuerce otro programa, una empresa no puede iniciar la jornada con él')
    jz46=iniciar_jornada(pg46,'Palmeras del camellón', programa='p-palmeras')
    registrar(pg46,'aile','ESP-0002', programa='p-palmeras'); pg46.wait_for_timeout(300)
    pg46.evaluate("""async () => { const j = await SRP.almacen.uno('jornadas', '%s'); j.estatus = 'cerrada'; j.fecha_cierre = SRP.util.ahoraISO(); await SRP.almacen.guardarConBitacora('jornadas', j, null); }""" % jz46); pg46.wait_for_timeout(300)
    reporte_de(pg46,'Palmeras del camellón')
    c46=[pg46.is_hidden('#caja-cie-personal'), pg46.is_hidden('#caja-cie-apoyo'), pg46.is_hidden('#caja-cie-chofer'), pg46.is_hidden('#caja-cie-vehiculo'), pg46.is_visible('#cie-observaciones')]
    ok(c46==[True,True,True,True,True],'el cierre de una jornada de empresa privada no pide personal participante, personal de apoyo, chófer ni vehículo; sí observaciones: %s' % c46)
    pg46.click('#btn-cierre-cerrar'); pg46.wait_for_timeout(200)
    programas46('u-cabo-gob')
    jg46=iniciar_jornada(pg46,'Jornada PAOT')
    registrar(pg46,'aile','ESP-0002'); pg46.wait_for_timeout(300)
    pg46.evaluate("""async () => { const j = await SRP.almacen.uno('jornadas', '%s'); j.estatus = 'cerrada'; j.fecha_cierre = SRP.util.ahoraISO(); await SRP.almacen.guardarConBitacora('jornadas', j, null); }""" % jg46); pg46.wait_for_timeout(300)
    reporte_de(pg46,'Jornada PAOT')
    g46=[pg46.is_hidden('#caja-cie-personal'), pg46.is_hidden('#caja-cie-apoyo'), pg46.is_hidden('#caja-cie-chofer'), pg46.is_hidden('#caja-cie-vehiculo')]
    ok(g46==[True,True,True,True],'en otra institución de fuera tampoco se piden personal ni vehículo: %s' % g46)
    pg46.click('#btn-cierre-cerrar'); pg46.wait_for_timeout(200)
    # Un teléfono con capturas y el programa de antes: «Palmeras y compensaciones» pasa a «Palmeras» y llega «Compensaciones»
    pg46.evaluate("""async () => { await SRP.almacen._tx(['programas'], 'readwrite', tx => { SRP.almacen.ponerCatalogo(tx, Object.assign({}, SRP.ref.catalogoPorId['p-palmeras'], { nombre: 'Palmeras y compensaciones', clave: 'PALMERAS_COMPENSACIONES' })); tx.objectStore('programas').delete('p-compensaciones'); });
      localStorage.setItem(SRP.CONFIG.CLAVE_SELLO, SRP.CONFIG.SELLO_REINICIO + '-previo'); }""")
    pg46.reload(); pg46.wait_for_timeout(1800)
    m46=pg46.evaluate("""async () => ({ arr: SRP.almacen.arranque, pal: [(await SRP.almacen.catalogo('p-palmeras')).nombre, (await SRP.almacen.catalogo('p-palmeras')).clave], comp: !!(await SRP.almacen.catalogo('p-compensaciones')), jornada: !!(await SRP.almacen.uno('jornadas', '%s')) })""" % jz46)
    ok(m46=={'arr':'conservado','pal':['Palmeras','PALMERAS'],'comp':True,'jornada':True},'un teléfono con capturas conserva lo capturado, renombra «Palmeras y compensaciones» a «Palmeras» y recibe «Compensaciones»: %s' % m46)
    ok(not err46,'sin errores en consola: %s' % err46[:2])
    ctx46.close()


    # ---------- BLOQUE 129: COORDINACIÓN EN CADA INSTITUCIÓN, PROGRAMAS POR TIPO Y CIERRE SÓLO SEDEMA CON PERSONAL ----------
    ctx47=b.new_context(viewport={'width':390,'height':844}, timezone_id='America/Mexico_City', geolocation={'latitude':19.357,'longitude':-99.06}, permissions=['geolocation']); pg47=ctx47.new_page(); err47=[]
    pg47.on('pageerror', lambda e: err47.append(str(e))); pg47.on('console', lambda m: m.type=='error' and 'net::' not in m.text and 'Failed to load' not in m.text and err47.append(m.text))
    pg47.goto(BASE); pg47.wait_for_timeout(1300)
    def entrar47(uid):
        pg47.evaluate("SRP.sesion.cerrar(); SRP.app.mostrarAcceso()"); pg47.wait_for_timeout(300)
        pg47.select_option('#sel-usuario-prueba', uid); pg47.click('#btn-entrar-prueba'); pg47.wait_for_timeout(700)
    def programas47(uid):
        entrar47(uid); pg47.evaluate("SRP.app.mostrarVista('registrar')"); pg47.wait_for_timeout(500)
        return [pg47.eval_on_selector_all('#ini-programa option','l=>l.map(o=>o.textContent.trim()).filter(t => t && !t.startsWith("Seleccione"))'), pg47.input_value('#ini-programa')]
    pr47={u: programas47(u) for u in ['u-cabo-1','u-coord-alc','u-coord-gob','u-coord-emp','u-coord-osc']}
    ok(pr47=={'u-cabo-1':[['Reforestación Urbana','Centro Histórico','Compensaciones','Palmeras'],''],'u-coord-alc':[['Reforestación Urbana'],'p-refor'],'u-coord-gob':[['Reforestación Urbana'],'p-refor'],
              'u-coord-emp':[['Palmeras'],'p-palmeras'],'u-coord-osc':[['Reforestación Urbana'],'p-refor']},
       'SEDEMA elige entre todos los programas, sin preselección; alcaldías, Gobierno de la CDMX y organizaciones civiles tienen sólo «Reforestación Urbana», y las empresas sólo «Palmeras», ya puesto: %s' % pr47)
    # Alta: fuera de la Secretaría hay cabo y coordinador; el cabo elige coordinador de su institución
    entrar47('u-admin-1'); pg47.evaluate("SRP.app.mostrarVista('usuarios')"); pg47.wait_for_timeout(500)
    pg47.click('#btn-usr-agregar'); pg47.wait_for_timeout(300)
    pg47.select_option('#usr-tipo-org','Empresa privada'); pg47.wait_for_timeout(150); pg47.select_option('#usr-organizacion','o-green-cover'); pg47.wait_for_timeout(150)
    pf47=pg47.eval_on_selector_all('#usr-perfil option','l=>l.map(o=>o.textContent).filter(t=>!t.startsWith("Seleccione"))')
    pg47.select_option('#usr-perfil','CABO'); pg47.wait_for_timeout(150)
    co47=[pg47.is_visible('#caja-usr-coordinador'), pg47.eval_on_selector_all('#usr-coordinadores .chip','l=>l.map(o=>o.textContent)')]
    pg47.select_option('#usr-tipo-org','Alcaldía'); pg47.wait_for_timeout(150); pg47.select_option('#usr-organizacion','o-alc-09007'); pg47.wait_for_timeout(150)
    ca47=pg47.eval_on_selector_all('#usr-coordinadores .chip','l=>l.map(o=>o.textContent)')
    pg47.select_option('#usr-perfil','COORDINADOR'); pg47.wait_for_timeout(150)
    cc47=pg47.is_hidden('#caja-usr-coordinador')
    ok(pf47==['Cabo','Coordinador','Directivo'] and co47==[True,['Héctor Salinas Ejemplo']] and ca47==['Sergio Navarro Ejemplo'] and cc47,
       'en el alta de una institución de fuera se elige cabo, coordinador o directivo; el cabo, un coordinador de su misma institución; el coordinador no depende de nadie: %s %s %s' % (pf47, co47, ca47))
    pg47.select_option('#usr-tipo-org','Empresa privada'); pg47.wait_for_timeout(150); pg47.select_option('#usr-organizacion','o-green-cover'); pg47.wait_for_timeout(150)
    pg47.select_option('#usr-perfil','CABO'); pg47.wait_for_timeout(150); pg47.click('#usr-coordinadores .chip[data-id="u-coord-emp"]')
    pg47.fill('#usr-nombre-completo','Irma Palmera Ejemplo'); pg47.fill('#usr-correo','irma.palmera@ejemplo.local'); pg47.fill('#usr-cargo','Cabo de cuadrilla')
    pg47.click('#form-usuario button[type=submit]'); pg47.wait_for_timeout(600)
    n47=pg47.evaluate("(() => { const u = SRP.ref.usuarios.find(x => x.correo === 'irma.palmera@ejemplo.local'); return u ? [u.organizacion_id, u.perfil, u.coordinadores_ids, u.area_id] : null; })()")
    ok(n47==['o-green-cover','CABO',['u-coord-emp'],None],'se da de alta un cabo de Green Cover con su coordinador de Green Cover: %s' % n47)
    # Alcance del coordinador de fuera: sólo sus cabos
    a47=pg47.evaluate("""(() => { const u = SRP.ref.usuarioPorId['u-coord-alc'], p = SRP.ref.usuarioPorId;
      return { cabos: SRP.indicadores.cabosAsignados(u), suyo: SRP.permisos.alcanza(u, { cabo_id: 'u-cabo-alc' }, p), sedema: SRP.permisos.alcanza(u, { cabo_id: 'u-cabo-1' }, p),
               paot: SRP.permisos.alcanza(u, { cabo_id: 'u-cabo-gob' }, p), emp: SRP.indicadores.cabosAsignados(p['u-coord-emp']).sort() }; })()""")
    ok(a47=={'cabos':['u-cabo-alc'],'suyo':True,'sedema':False,'paot':False,'emp':sorted([n47 and pg47.evaluate("SRP.ref.usuarios.find(x => x.correo === 'irma.palmera@ejemplo.local').id"),'u-cabo-emp'])},
       'el coordinador de la alcaldía ve y corrige lo de sus cabos, nunca lo de SEDEMA ni lo de otra institución: %s' % a47)
    # El cabo de la alcaldía cierra su jornada: sin personal ni vehículo; su coordinador la ve en Supervisión
    entrar47('u-cabo-alc')
    jz47=iniciar_jornada(pg47,'Camellón coordinado')
    registrar(pg47,'aile','ESP-0002'); pg47.wait_for_timeout(300)
    pg47.evaluate("""async () => { const j = await SRP.almacen.uno('jornadas', '%s'); j.estatus = 'cerrada'; j.fecha_cierre = SRP.util.ahoraISO(); await SRP.almacen.guardarConBitacora('jornadas', j, null); }""" % jz47); pg47.wait_for_timeout(300)
    reporte_de(pg47,'Camellón coordinado')
    z47=[pg47.is_hidden('#caja-cie-'+c) for c in ['personal','apoyo','chofer','vehiculo']]+[pg47.is_visible('label[for=cie-encargado]'), pg47.is_visible('#cie-observaciones'), pg47.is_visible('#cie-hora')]
    ok(z47==[True]*7,'el cierre de una alcaldía pide sólo encargado, observaciones y hora: %s' % z47)
    pg47.click('#btn-cierre-cerrar'); pg47.wait_for_timeout(200)
    mz47=pg47.evaluate("""async () => { const j = await SRP.almacen.uno('jornadas', '%s'); const regs = (await SRP.almacen.todos('plantaciones')).filter(r => r.jornada_id === j.id && r.estatus === 'activo');
      const m = SRP.reportes.modelo(regs, Object.assign({}, j, { personal: 'Persona Ejemplo', apoyo: 'Otra Ejemplo', chofer: 'Chofer Ejemplo', vehiculo_tipo: 'Pipa', vehiculo_placa: 'PRU 001', vehiculo_modelo: 'X' }), j.fecha, null);
      return [m.identificacion.filter(x => x[0] === 'Institución que ejecuta').map(x => x[1]), m.personal.length, m.vehiculo.length]; }""" % jz47)
    ok(mz47==[['Alcaldía Iztapalapa'],0,0],'el reporte de fuera dice la institución y no imprime personal ni vehículo, aunque la jornada los traiga de antes: %s' % mz47)
    entrar47('u-coord-alc'); pg47.evaluate("SRP.app.mostrarVista('supervision')"); pg47.wait_for_timeout(800)
    abrir_sup(pg47)
    s47=[pg47.inner_text('#titulo-supervision'), pg47.eval_on_selector_all('#sup-cabo option','l=>l.map(o=>o.textContent).filter(t=>!t.startsWith("Todos"))'), pg47.is_hidden('#caja-sup-organizacion')]
    ok(s47[0]=='Supervisión' and s47[1]==['Ramiro Torres Ejemplo'] and s47[2],'el coordinador de la alcaldía tiene Supervisión con sus cabos y sin filtro de institución: %s' % s47)
    # SEDEMA: cierre completo y la institución también en su reporte
    entrar47('u-cabo-1')
    js47=iniciar_jornada(pg47,'Glorieta SEDEMA')
    registrar(pg47,'aile','ESP-0002'); pg47.wait_for_timeout(300)
    pg47.evaluate("""async () => { const j = await SRP.almacen.uno('jornadas', '%s'); j.estatus = 'cerrada'; j.fecha_cierre = SRP.util.ahoraISO(); await SRP.almacen.guardarConBitacora('jornadas', j, null); }""" % js47); pg47.wait_for_timeout(300)
    reporte_de(pg47,'Glorieta SEDEMA')
    v47=[pg47.is_visible('#caja-cie-'+c) for c in ['personal','apoyo','chofer','vehiculo']]
    ok(v47==[True]*4,'el cierre de SEDEMA pide personal participante, personal de apoyo, chófer y vehículo: %s' % v47)
    pg47.click('#btn-cierre-cerrar'); pg47.wait_for_timeout(200)
    ms47=pg47.evaluate("""async () => { const j = await SRP.almacen.uno('jornadas', '%s'); const regs = (await SRP.almacen.todos('plantaciones')).filter(r => r.jornada_id === j.id && r.estatus === 'activo');
      return SRP.reportes.modelo(regs, j, j.fecha, null).identificacion.filter(x => x[0] === 'Institución que ejecuta').map(x => x[1]); }""" % js47)
    ok(ms47==['Secretaría del Medio Ambiente (SEDEMA)'],'el reporte de SEDEMA también dice la institución que ejecuta: %s' % ms47)
    # «Jornadas de voluntariado» se retira: con uso se desactiva; sin uso se quita
    PREVIO="SRP.CONFIG.SELLO_REINICIO + '-previo'"
    pg47.evaluate("""async () => { await SRP.almacen._tx(['programas'], 'readwrite', tx => SRP.almacen.ponerCatalogo(tx, { id: 'p-voluntariado', tipo: 'programa', clave: 'JORNADAS_VOLUNTARIADO', nombre: 'Jornadas de voluntariado', activo: true,
        creado_por_id: 'u-admin-1', fecha_creacion: '2026-09-01T09:00:00-06:00', editado_por_id: null, fecha_ultima_edicion: null }));
      const j = await SRP.almacen.uno('jornadas', '%s'); j.programa_id = 'p-voluntariado'; await SRP.almacen.guardarConBitacora('jornadas', j, null);
      localStorage.setItem(SRP.CONFIG.CLAVE_SELLO, %s); }""" % (js47, PREVIO))
    pg47.reload(); pg47.wait_for_timeout(1800)
    u47=pg47.evaluate("""async () => { const p = await SRP.almacen.catalogo('p-voluntariado'); return { arr: SRP.almacen.arranque, existe: !!p, activo: p ? p.activo : null,
      ofrece: SRP.ref.programasPara('o-sedema').some(x => x.id === 'p-voluntariado') }; }""")
    ok(u47=={'arr':'conservado','existe':True,'activo':False,'ofrece':False},'un teléfono con una jornada de «Jornadas de voluntariado» conserva la referencia, pero el programa queda inactivo y ya no se ofrece: %s' % u47)
    pg47.evaluate("""async () => { const j = await SRP.almacen.uno('jornadas', '%s'); j.programa_id = 'p-refor'; await SRP.almacen.guardarConBitacora('jornadas', j, null);
      localStorage.setItem(SRP.CONFIG.CLAVE_SELLO, %s); }""" % (js47, PREVIO))
    pg47.evaluate("""async () => { const ps = (await SRP.almacen.todos('plantaciones')).filter(r => r.programa_id === 'p-voluntariado');
      await SRP.almacen._tx(['plantaciones'], 'readwrite', tx => ps.forEach(r => tx.objectStore('plantaciones').put(Object.assign({}, r, { programa_id: 'p-refor' })))); }""")
    pg47.reload(); pg47.wait_for_timeout(1800)
    d47=pg47.evaluate("async () => !!(await SRP.almacen.catalogo('p-voluntariado'))")
    ok(d47 is False,'sin nada que lo use, «Jornadas de voluntariado» se quita del catálogo')
    # El sello de reinicio de este bloque vuelve a empezar los teléfonos del anterior
    pg47.evaluate("localStorage.setItem(SRP.CONFIG.CLAVE_SELLO, '2026-09-30-usuarios')")
    pg47.reload(); pg47.wait_for_timeout(1800)
    ok(pg47.evaluate("SRP.almacen.arranque")=='reiniciado','un teléfono con el sello del bloque anterior vuelve a empezar con las cuentas nuevas')
    ok(not err47,'sin errores en consola: %s' % err47[:2])
    ctx47.close()


    # ---------- BLOQUE 130: QUIÉN USA CADA PROGRAMA, EN CATÁLOGOS ----------
    ctx48=b.new_context(viewport={'width':1280,'height':900}); pg48=ctx48.new_page(); err48=[]
    pg48.on('pageerror', lambda e: err48.append(str(e))); pg48.on('console', lambda m: m.type=='error' and 'net::' not in m.text and 'Failed to load' not in m.text and err48.append(m.text))
    pg48.goto(BASE); pg48.wait_for_timeout(1300)
    def entrar48(uid):
        pg48.evaluate("SRP.sesion.cerrar(); SRP.app.mostrarAcceso()"); pg48.wait_for_timeout(300)
        pg48.select_option('#sel-usuario-prueba', uid); pg48.click('#btn-entrar-prueba'); pg48.wait_for_timeout(700)
    def programas48(uid):
        entrar48(uid); pg48.evaluate("SRP.app.mostrarVista('registrar')"); pg48.wait_for_timeout(500)
        return [pg48.eval_on_selector_all('#ini-programa option','l=>l.map(o=>o.textContent.trim()).filter(t => t && !t.startsWith("Seleccione"))'), pg48.input_value('#ini-programa')]
    ok(pg48.evaluate("typeof SRP.CONFIG.PROGRAMAS_POR_TIPO_INSTITUCION")=='undefined','la regla de programas por institución ya no vive en la configuración')
    entrar48('u-admin-1')
    pg48.click('#btn-cuenta'); pg48.click('#btn-ir-configuracion'); pg48.wait_for_timeout(300); pg48.click('.cfg-tarjeta[data-ir=catalogos]'); pg48.wait_for_timeout(500)
    q48=pg48.evaluate("""(() => { const r = {}; document.querySelectorAll('#tabla-catalogo tbody tr').forEach(tr => { const c = tr.querySelector('[data-etiqueta="Quién lo usa"]'); r[tr.querySelector('.c-titulo').textContent] = c ? c.textContent : null; }); return r; })()""")
    ok(q48=={'Reforestación Urbana':'SEDEMA · Alcaldía · Gobierno de la CDMX · Organización civil','Centro Histórico':'Sólo SEDEMA','Palmeras':'SEDEMA · Empresa privada','Compensaciones':'Sólo SEDEMA'},
       'Catálogos › Programas dice quién usa cada programa: %s' % q48)
    pg48.click('#btn-cat-agregar'); pg48.wait_for_timeout(300)
    t48=[pg48.is_visible('#cat-tipos-org-botones'), pg48.eval_on_selector_all('#cat-tipos-org-botones .chip','l=>l.map(b=>[b.textContent, b.getAttribute("aria-pressed")])')]
    ok(t48==[True,[['Alcaldía','false'],['Gobierno de la CDMX','false'],['Empresa privada','false'],['Organización civil','false']]],'un programa nuevo ofrece los cuatro tipos de institución, sin marcar: sólo SEDEMA mientras no se marque otro: %s' % t48)
    pg48.fill('#cat-nombre','Arbolado escolar'); pg48.click('#cat-tipos-org-botones .chip[data-tipo="Alcaldía"]')
    pg48.click('#form-catalogo button[type=submit]'); pg48.wait_for_timeout(600)
    n48=pg48.evaluate("(() => { const p = SRP.ref.catalogos.find(c => c.tipo === 'programa' && c.nombre === 'Arbolado escolar'); return p ? p.tipos_organizacion : null; })()")
    ok(n48==['Alcaldía'],'se agrega «Arbolado escolar» para SEDEMA y las alcaldías: %s' % n48)
    accion(pg48, pg48.locator('#tabla-catalogo tbody tr', has_text='Palmeras'),'editar'); pg48.wait_for_timeout(300)
    e48=pg48.eval_on_selector_all('#cat-tipos-org-botones .chip[aria-pressed="true"]','l=>l.map(b=>b.textContent)')
    pg48.click('#cat-tipos-org-botones .chip[data-tipo="Organización civil"]')
    pg48.click('#form-catalogo button[type=submit]'); pg48.wait_for_timeout(600)
    p48=pg48.evaluate("""async () => [SRP.ref.catalogoPorId['p-palmeras'].tipos_organizacion, (await SRP.almacen.todos('bitacora')).filter(b => b.entidad_id === 'p-palmeras' && b.accion === 'EDITADO').map(b => b.detalle).pop()]""")
    ok(e48==['Empresa privada'] and p48[0]==['Empresa privada','Organización civil'] and 'tipos_organizacion' in (p48[1] or ''),'al editar «Palmeras» se ve lo marcado; se suma Organización civil y queda en la bitácora: %s %s' % (e48, p48))
    ok(pg48.locator('#tabla-catalogo tbody tr', has_text='Palmeras').locator('[data-etiqueta="Quién lo usa"]').inner_text()=='SEDEMA · Empresa privada · Organización civil','y la lista lo refleja')
    pr48={u: programas48(u) for u in ['u-cabo-1','u-cabo-alc','u-cabo-gob','u-cabo-emp','u-cabo-osc']}
    ok(pr48=={'u-cabo-1':[['Reforestación Urbana','Arbolado escolar','Centro Histórico','Compensaciones','Palmeras'],''],'u-cabo-alc':[['Reforestación Urbana','Arbolado escolar'],''],
              'u-cabo-gob':[['Reforestación Urbana'],'p-refor'],'u-cabo-emp':[['Palmeras'],'p-palmeras'],'u-cabo-osc':[['Reforestación Urbana','Palmeras'],'']},
       'Iniciar jornada ofrece a cada institución lo marcado en el catálogo, sin tocar la configuración; SEDEMA, todos: %s' % pr48)
    # Un teléfono con programas sin el dato: los de arranque toman los suyos; los agregados, sólo SEDEMA
    pg48.evaluate("""async () => { const c = await SRP.almacen.catalogos(); await SRP.almacen._tx(['programas'], 'readwrite', tx => c.filter(x => x.tipo === 'programa').forEach(x => { const n = Object.assign({}, x); delete n.tipos_organizacion; SRP.almacen.ponerCatalogo(tx, n); })); }""")
    pg48.reload(); pg48.wait_for_timeout(1800)
    z48=pg48.evaluate("""async () => { const c = (await SRP.almacen.catalogos()).filter(x => x.tipo === 'programa'), r = {}; c.forEach(x => { r[x.nombre] = x.tipos_organizacion; }); return r; }""")
    ok(z48=={'Reforestación Urbana':['Alcaldía','Gobierno de la CDMX','Organización civil'],'Centro Histórico':[],'Palmeras':['Empresa privada'],'Compensaciones':[],'Arbolado escolar':[]},
       'al abrir, un programa sin el dato lo recibe: el de arranque, el suyo; el agregado, sólo SEDEMA: %s' % z48)
    ok(not err48,'sin errores en consola: %s' % err48[:2])
    ctx48.close()


    # ---------- BLOQUE 131: DEMOSTRACIÓN CON TODAS LAS INSTITUCIONES, PERFILES Y PROGRAMAS ----------
    ctx49=b.new_context(viewport={'width':1280,'height':900}); pg49=ctx49.new_page(); err49=[]
    pg49.on('pageerror', lambda e: err49.append(str(e))); pg49.on('console', lambda m: m.type=='error' and 'net::' not in m.text and 'Failed to load' not in m.text and err49.append(m.text))
    pg49.goto(BASE); pg49.wait_for_timeout(1300)
    pg49.select_option('#sel-usuario-prueba','u-admin-1'); pg49.click('#btn-entrar-prueba'); pg49.wait_for_timeout(700)
    pg49.evaluate("SRP.demo.cargar()"); pg49.wait_for_timeout(200)
    esperar(pg49,"SRP.ref.usuarios.some(u => u.id === 'u-demo-v1')",120000)
    pg49.wait_for_timeout(500)
    d49=pg49.evaluate("""async () => { const j = (await SRP.almacen.todos('jornadas')).filter(x => SRP.demo.es(x.id)), P = SRP.ref.usuarioPorId;
      const org = new Set(j.map(x => x.organizacion_id)), prog = new Set(j.map(x => x.programa_id)), quien = new Set(j.map(x => x.cabo_id));
      const prueba = SRP.ref.usuarios.filter(u => !SRP.demo.es(u.id) && SRP.permisos.de(u).registrar).map(u => u.id);
      const cuentas = SRP.ref.usuarios.filter(u => SRP.demo.es(u.id));
      return { orgs: [...org].sort(), progs: [...prog].sort(), sinDatos: prueba.filter(id => !quien.has(id)),
        perfiles: [...new Set([...quien].map(id => P[id].perfil))].sort(),
        fueraDePrograma: j.filter(x => !SRP.ref.programasPara(x.organizacion_id).some(p => p.id === x.programa_id)).length,
        fueraConPersonal: j.filter(x => x.organizacion_id !== 'o-sedema' && (x.personal || x.apoyo || x.chofer || x.vehiculo_id)).length,
        coordAjeno: cuentas.filter(u => (u.coordinadores_ids || []).some(c => P[c].organizacion_id !== u.organizacion_id)).map(u => u.id),
        orgDeLaCuenta: j.filter(x => x.organizacion_id !== (P[x.cabo_id].organizacion_id)).length,
        emp: SRP.indicadores.cabosAsignados(P['u-coord-emp']).sort() }; }""")
    ok(d49['orgs']==sorted(['o-sedema','o-alc-09007','o-alc-09003','o-paot','o-sobse','o-green-cover','o-reforestamos','demo-org-empresa']),
       'la demostración trae jornadas de la Secretaría y de una institución de cada tipo (dos alcaldías, PAOT, SOBSE, Green Cover, Reforestamos México y la empresa de demostración): %s' % d49['orgs'])
    ok(d49['progs']==['p-centro','p-compensaciones','p-palmeras','p-refor'],'con los cuatro programas: %s' % d49['progs'])
    ok(d49['sinDatos']==[] and d49['perfiles']==['CABO','COORDINADOR'],'cada cuenta de prueba que registra —cabos y coordinadores, de SEDEMA y de fuera— tiene jornadas: faltan %s' % d49['sinDatos'])
    ok(d49['fueraDePrograma']==0 and d49['fueraConPersonal']==0 and d49['orgDeLaCuenta']==0,
       'cada jornada usa un programa de su institución, va a nombre de la institución de quien la registró y, fuera de SEDEMA, sin personal, chófer ni vehículo: %s' % [d49['fueraDePrograma'], d49['fueraConPersonal'], d49['orgDeLaCuenta']])
    ok(d49['coordAjeno']==[] and d49['emp']==['u-cabo-emp','u-demo-v1'],'cada cabo de demostración depende de un coordinador de su institución; el de Green Cover coordina a sus dos cabos: %s' % d49['emp'])
    # Cada coordinador de fuera ve en Supervisión a sus cabos con datos
    pg49.evaluate("SRP.sesion.cerrar(); SRP.app.mostrarAcceso()"); pg49.wait_for_timeout(300)
    pg49.select_option('#sel-usuario-prueba','u-coord-osc'); pg49.click('#btn-entrar-prueba'); pg49.wait_for_timeout(800)
    pg49.evaluate("SRP.app.mostrarVista('supervision')"); pg49.wait_for_timeout(800)
    abrir_sup(pg49)
    pg49.click('#sup-tipos .chip[data-tipo=todo]'); pg49.wait_for_timeout(900)
    s49=pg49.eval_on_selector_all('#sup-cabo option','l=>l.map(o=>o.textContent).filter(t=>!t.startsWith("Todos"))')
    ok(sorted(s49)==sorted(['Andrea Solís Ejemplo','Carmen Ibarra Ejemplo (coordinación)','Olivia Reyes Demo','Omar Fuentes Demo']) and 'árboles' in pg49.inner_text('#sup-cuerpo'),
       'la coordinadora de Reforestamos ve en Supervisión a sus tres cabos y lo suyo, con cifras: %s' % s49)
    # Al quitarla, las cuentas de prueba se quedan sin sus jornadas de demostración
    q49=pg49.evaluate("async () => { await SRP.demo.quitar(); const j = await SRP.almacen.todos('jornadas'); return [j.filter(x => SRP.demo.es(x.id)).length, !!SRP.ref.usuarioPorId['u-coord-osc'], !!(await SRP.almacen.uno('usuarios', 'u-demo-o1'))]; }")
    ok(q49==[0,True,False],'al quitar la demostración no queda ninguna de sus jornadas; las cuentas de prueba siguen y las de demostración se van: %s' % q49)
    ok(not err49,'sin errores en consola: %s' % err49[:2])
    ctx49.close()


    # ---------- BLOQUE 132: CONFIGURACIÓN DE LA ADMINISTRACIÓN GLOBAL ----------
    ctx50=b.new_context(viewport={'width':390,'height':844}, timezone_id='America/Mexico_City'); pg50=ctx50.new_page(); err50=[]
    pg50.on('pageerror', lambda e: err50.append(str(e))); pg50.on('console', lambda m: m.type=='error' and 'net::' not in m.text and 'Failed to load' not in m.text and err50.append(m.text))
    pg50.goto(BASE); pg50.wait_for_timeout(1300)
    def entrar50(uid):
        pg50.evaluate("SRP.sesion.cerrar(); SRP.app.mostrarAcceso()"); pg50.wait_for_timeout(300)
        pg50.select_option('#sel-usuario-prueba', uid); pg50.click('#btn-entrar-prueba'); pg50.wait_for_timeout(700)
    # Sólo la Administración global la tiene, y no se abre llamándola directamente
    sin50=[]
    for uid in ['u-coord-1','u-cabo-1','u-coord-alc']:
        entrar50(uid); pg50.evaluate("SRP.app.mostrarVista('configuracion')"); pg50.wait_for_timeout(300)
        sin50.append([pg50.get_attribute('#btn-ir-configuracion','hidden') is not None, pg50.is_hidden('#vista-configuracion')])
    ok(sin50==[[True,True]]*3,'coordinación y cabos no tienen «Configuración» en el menú ni la abren llamándola directamente: %s' % sin50)
    entrar50('u-admin-1')
    pg50.click('#btn-cuenta'); pg50.wait_for_timeout(200)
    m50=pg50.eval_on_selector_all('#menu-cuenta .menu-opcion:not([hidden])','l=>l.map(b=>b.textContent.trim())')
    pg50.click('#btn-ir-configuracion'); pg50.wait_for_timeout(600)
    t50=pg50.eval_on_selector_all('.cfg-tarjeta','l=>l.map(t=>[t.dataset.ir, t.querySelector(".cfg-titulo").textContent, t.querySelector(".cfg-resumen").textContent])')
    ok(m50[0]=='Configuración' and 'Catálogos' not in m50 and 'Usuarios' not in m50,'el menú de la cuenta tiene «Configuración» en lugar de Catálogos y Usuarios: %s' % m50)
    ok([x[:2] for x in t50]==[['usuarios','Usuarios'],['catalogos','Catálogos'],['parametros','Parámetros'],['cambios','Registro de cambios'],['carga','Carga masiva'],['acerca','Acerca del sistema']]
       and t50[0][2]=='13 cuentas' and t50[1][2]=='4 programas · 21 instituciones · 76 especies' and t50[2][2]=='11 valores · sólo consulta' and t50[3][2]=='Sin cambios todavía' and t50[4][2]=='Plantilla, revisión y carga' and t50[5][2].startswith('Versión '),
       'Configuración muestra seis tarjetas con su resumen al día: %s' % t50)
    # Cada tarjeta lleva a su apartado y éste vuelve a Configuración
    ida50=[]
    for dest in ['usuarios','catalogos','parametros','cambios','carga','acerca']:
        pg50.click('.cfg-tarjeta[data-ir=%s]' % dest); pg50.wait_for_timeout(500)
        abierta=pg50.is_visible('#vista-%s' % dest)
        pg50.locator('#vista-%s [data-volver-configuracion]' % dest).click(); pg50.wait_for_timeout(400)
        ida50.append(abierta and pg50.is_visible('#vista-configuracion'))
    ok(ida50==[True]*6,'cada tarjeta abre su apartado y «Configuración», arriba, regresa: %s' % ida50)
    # Parámetros: los valores que usa el sistema, sólo para consulta
    pg50.click('.cfg-tarjeta[data-ir=parametros]'); pg50.wait_for_timeout(500)
    p50=pg50.eval_on_selector_all('#cfg-parametros .cfg-cifra','l=>l.map(d=>d.textContent)')
    ok(p50==['4 m','150 m','500 m','Hasta ±10 m','Hasta ±30 m','100 m','15 s','17:00 h','60 s','800 × 600 px','10'] and pg50.locator('#vista-parametros input, #vista-parametros select, #vista-parametros textarea').count()==0,
       'Parámetros muestra los valores que usa el sistema, sin campos para cambiarlos: %s' % p50)
    # Registro de cambios: una edición de catálogo y una desactivación de cuenta
    pg50.evaluate("""async () => { SRP.app.mostrarVista('catalogos'); await new Promise(r => setTimeout(r, 300));
      SRP.catalogos.abrirFormulario(SRP.ref.catalogoPorId['p-palmeras']); document.querySelector('#cat-tipos-org-botones .chip[data-tipo="Organización civil"]').click(); await SRP.catalogos.guardar();
      await new Promise(r => setTimeout(r, 1100)); await SRP.usuarios.cambiarEstado(SRP.ref.usuarioPorId['u-cabo-gob']); }""")
    pg50.wait_for_timeout(500)
    pg50.evaluate("SRP.app.mostrarVista('cambios')"); pg50.wait_for_timeout(700)
    c50=[pg50.inner_text('#cmb-cuenta'), [x.replace('\n',' | ') for x in pg50.eval_on_selector_all('#cmb-lista .cmb-item','l=>l.map(li=>li.innerText)')]]
    hoy50=pg50.evaluate("SRP.util.formatearFecha(SRP.util.fechaHoy())")
    ok(c50[0]=='2 cambios' and c50[1][0].startswith(hoy50 + ' · ') and 'Desactivación de la cuenta Lucía Méndez Ejemplo (Procuraduría Ambiental y del Ordenamiento Territorial (PAOT))' in c50[1][0] and 'Por Administración SIA Ejemplo (Administración global)' in c50[1][0]
       and 'Edición del programa Palmeras' in c50[1][1] and 'Cambió: quién puede usarlo' in c50[1][1],
       'el registro de cambios dice qué cambió, sobre qué, quién y cuándo —día y hora del teléfono—, lo más reciente primero: %s' % c50)
    pg50.select_option('#cmb-sobre','usuario'); pg50.wait_for_timeout(300)
    f50=[pg50.inner_text('#cmb-cuenta'), pg50.locator('#cmb-lista .cmb-item').count(), pg50.eval_on_selector_all('#cmb-quien option','l=>l.map(o=>o.textContent)')]
    ok(f50[0]=='1 de 2 cambios' and f50[1]==1 and f50[2]==['Todas las personas','Administración SIA Ejemplo'],'se filtra por cuentas o catálogos y por quién hizo el cambio: %s' % f50)
    # Acerca del sistema
    pg50.evaluate("SRP.app.mostrarVista('acerca')"); pg50.wait_for_timeout(800)
    a50=pg50.inner_text('#cfg-acerca')
    ok(pg50.evaluate("SRP.CONFIG.VERSION + ' (' + SRP.CONFIG.ETAPA + ')'") in a50 and 'srp_db, versión 8' in a50 and 'sia-2026-09-22' in a50 and 'iecm-2022' in a50 and 'Pendientes de envío' in a50,
       'Acerca del sistema dice versión, base, capas y pendientes de este dispositivo')
    anchos50=[]
    for v in ['configuracion','parametros','cambios','acerca']:
        pg50.evaluate("SRP.app.mostrarVista('%s')" % v); pg50.wait_for_timeout(400); anchos50.append(pg50.evaluate("document.documentElement.scrollWidth"))
    ok(all(a<=390 for a in anchos50),'en el teléfono ninguna de las cuatro pantallas se sale de lado: %s' % anchos50)
    ok(not err50,'sin errores en consola: %s' % err50[:2])
    ctx50.close()


    # ---------- BLOQUE 133: CATÁLOGO DE ESPECIES EN EXCEL Y CARGA MASIVA ----------
    import openpyxl as _xl51, datetime as _dt51
    CAR51=sal('carga_prueba.xlsx')
    _wb=_xl51.Workbook(); _ws=_wb.active; _ws.title='Árboles'
    _ws.append(['Latitud','Longitud','Nombre científico','Fecha de plantación','Programa','Tipo de institución','Institución'])
    for _r in [[19.3571,-99.0601,'Fraxinus uhdei',_dt51.datetime(2025,3,10),'Reforestación Urbana','Alcaldía','Iztapalapa'],
               [19.3573,99.0603,'fraxinus  UHDEI','2025-03-10','Reforestación Urbana','Alcaldía','Alcaldía Iztapalapa'],
               ['19,3575','-99,0605','Fraxinus uhdei','10/03/2025','REFOR_URBANA','alcaldia','iztapalapa'],
               [19.29,-99.17,'Fraxinus uhdei',_dt51.datetime(2024,7,1),'Palmeras','Gobierno de la CDMX','PAOT'],
               [19.43,-99.13,'Arbolus inventadus','2025-01-01','Reforestación Urbana','Gobierno de la CDMX','SEDEMA'],
               [20.5,-99.13,'Fraxinus uhdei','2025-01-01','Reforestación Urbana','Gobierno de la CDMX','SEDEMA'],
               [19.43,-99.13,'Fraxinus uhdei','2099-01-01','Reforestación Urbana','Gobierno de la CDMX','SEDEMA'],
               [19.43,-99.13,'Fraxinus uhdei','2025-02-02','Programa X','Empresa','Green Cover'],
               [19.43,-99.13,'Fraxinus uhdei','2025-02-02','Palmeras','Empresa privada','Otra Empresa SA'],
               [19.3571,-99.0601,'Fraxinus uhdei',_dt51.datetime(2025,3,10),'Reforestación Urbana','Alcaldía','Iztapalapa'],
               [None]*7]:
        _ws.append(_r)
    _wb.save(CAR51)
    ctx51=b.new_context(viewport={'width':390,'height':844}, accept_downloads=True, timezone_id='America/Mexico_City'); pg51=ctx51.new_page(); err51=[]
    pg51.on('pageerror', lambda e: err51.append(str(e))); pg51.on('console', lambda m: m.type=='error' and 'net::' not in m.text and 'Failed to load' not in m.text and err51.append(m.text))
    pg51.goto(BASE); pg51.wait_for_timeout(1300)
    pg51.select_option('#sel-usuario-prueba','u-coord-1'); pg51.click('#btn-entrar-prueba'); pg51.wait_for_timeout(700)
    pg51.evaluate("SRP.app.mostrarVista('carga')"); pg51.wait_for_timeout(300)
    ok(pg51.is_hidden('#vista-carga') and not pg51.evaluate("SRP.permisos.puede('carga.masiva')"),'la carga masiva es sólo de la Administración global')
    pg51.evaluate("SRP.sesion.cerrar(); SRP.app.mostrarAcceso()"); pg51.wait_for_timeout(300)
    pg51.select_option('#sel-usuario-prueba','u-admin-1'); pg51.click('#btn-entrar-prueba'); pg51.wait_for_timeout(700)
    # El catálogo de especies en Excel, con todos sus campos
    pg51.evaluate("SRP.app.mostrarVista('catalogos')"); pg51.wait_for_timeout(500)
    ex51=pg51.is_hidden('#btn-cat-excel')
    pg51.click('#cat-tipos .chip[data-tipo=especie]'); pg51.wait_for_timeout(500)
    with pg51.expect_download() as d51: pg51.click('#btn-cat-excel')
    d51.value.save_as(sal('especies51.xlsx')); w51=_xl51.load_workbook(sal('especies51.xlsx')); h51=w51.active
    ok(ex51 and d51.value.suggested_filename.startswith('Catalogo_especies_SRP_') and w51.sheetnames==['Especies'] and h51.max_row==77
       and [c.value for c in h51[1]]==['Clave','Nombre común','Nombre científico','Distribución','Otros nombres comunes','Forma de crecimiento','Id SNIB','Id EncicloVida','Estado','Usos']
       and [c.value for c in h51[2]][:4]==['ESP-0001','Negundo','Acer negundo','Nativa'],
       'Catálogos › Especies descarga el catálogo en Excel con sus 76 especies y todos sus campos; en otros catálogos no aparece el botón: %s' % [c.value for c in h51[2]])
    # Plantilla
    pg51.evaluate("SRP.app.mostrarVista('configuracion')"); pg51.wait_for_timeout(400); pg51.click('.cfg-tarjeta[data-ir=carga]'); pg51.wait_for_timeout(500)
    with pg51.expect_download() as d51: pg51.click('#btn-carga-plantilla')
    d51.value.save_as(sal('plantilla51.xlsx')); w51=_xl51.load_workbook(sal('plantilla51.xlsx'))
    ok(w51.sheetnames==['Árboles','Instrucciones','Especies','Programas','Instituciones'] and [c.value for c in w51['Árboles'][1]]==['Latitud','Longitud','Nombre científico','Fecha de plantación','Programa','Tipo de institución','Institución']
       and w51['Árboles'].max_row==1 and w51['Especies'].max_row==77 and w51['Programas'].max_row==5 and w51['Instituciones'].max_row==22,
       'la plantilla trae la hoja para llenar, las instrucciones y las listas válidas de especies, programas e instituciones: %s' % w51.sheetnames)
    # Revisión de un Excel con renglones buenos y malos
    pg51.set_input_files('#carga-archivo', CAR51); pg51.wait_for_timeout(1500)
    r51=pg51.inner_text('#carga-resumen')
    pr51=pg51.eval_on_selector_all('.carga-problemas .cmb-item','l=>l.map(li=>[li.dataset.tipo, li.innerText.replace(/\\n/g," | ")])')
    ok('4 árboles listos para cargar, 1 con aviso' in r51 and '6 renglones con error' in r51 and '2 jornadas cerradas de 2 instituciones' in r51 and 'del 01-JUL-2024 al 10-MAR-2025' in r51,
       'la revisión dice cuántos árboles están listos, cuántos renglones tienen error y qué jornadas se formarán: %s' % r51.replace('\n',' | '))
    ok([x[0] for x in pr51]==['aviso','error','error','error','error','error','error'] and 'no está marcado hoy para Gobierno de la CDMX' in pr51[0][1] and 'Arbolus inventadus' in pr51[1][1]
       and 'fuera de la Ciudad' in pr51[2][1] and 'posterior a hoy' in pr51[3][1] and 'Programa X' in pr51[4][1] and 'Otra Empresa SA' in pr51[5][1] and 'Repite el renglón 2' in pr51[6][1],
       'cada problema dice su renglón, su columna y qué corregir; la especie que no está en el catálogo, el punto fuera, la fecha futura, lo que no existe y el renglón repetido no entran; el programa no marcado entra con aviso: %s' % [x[1][:40] for x in pr51])
    ok(pg51.evaluate("SRP.carga.revision.listos.length")==4 and pg51.evaluate("(async () => (await SRP.almacen.todos('jornadas')).filter(j => j.carga_id).length)()")==0,'revisar no guarda nada')
    with pg51.expect_download() as d51: pg51.click('#btn-carga-errores')
    d51.value.save_as(sal('problemas51.xlsx')); w51=_xl51.load_workbook(sal('problemas51.xlsx')).active
    ok(d51.value.suggested_filename=='Problemas_carga_prueba.xlsx' and w51.max_row==8 and [c.value for c in w51[1]][:5]==['Renglón','Tipo','Columna','Problema','Latitud'] and w51.cell(3,7).value=='Arbolus inventadus',
       'los renglones con problemas se descargan en Excel, con sus datos y el problema, para corregirlos')
    # Carga
    pg51.click('#btn-carga-cargar'); pg51.wait_for_timeout(400)
    cf51=pg51.inner_text('#dlg-confirmar')
    pg51.click('#btn-confirmar-si'); pg51.wait_for_timeout(1500)
    c51=pg51.evaluate("""async () => { const j = (await SRP.almacen.todos('jornadas')).filter(x => x.carga_id); const ids = new Set(j.map(x => x.id));
      const a = (await SRP.almacen.todos('plantaciones')).filter(x => ids.has(x.jornada_id)); const b = (await SRP.almacen.todos('bitacora')).filter(x => x.entidad === 'carga');
      return { lotes: [...new Set(j.map(x => x.carga_id))].length, j: j.map(x => [x.nombre, x.fecha, x.organizacion_id, x.programa_id, x.estatus, x.cabo_id, x.arboles_previstos]).sort(),
        a: a.length, folios: a.every(x => SRP.folio.valido(x.folio)), origen: [...new Set(a.map(x => x.punto_origen))], cabo: [...new Set(a.map(x => x.cabo_id))],
        bit: b.map(x => [x.entidad_id === j[0].carga_id, x.detalle]) }; }""")
    ok('Se formarán 2 jornadas cerradas' in cf51 and c51['lotes']==1 and c51['j']==[['Carga histórica · Iztapalapa','2025-03-10','o-alc-09007','p-refor','cerrada','u-admin-1',3],['Carga histórica · Tlalpan','2024-07-01','o-paot','p-palmeras','cerrada','u-admin-1',1]]
       and c51['a']==4 and c51['folios'] and c51['origen']==['manual'] and c51['cabo']==['u-admin-1'] and c51['bit']==[[True,'Archivo «carga_prueba.xlsx»: 4 árboles en 2 jornadas de 2 instituciones']],
       'al confirmar se cargan los 4 árboles en 2 jornadas cerradas de carga histórica, una por institución, fecha, programa y alcaldía, a nombre de quien carga, con folio y un renglón del lote en la bitácora: %s' % c51['j'])
    ok('Última carga: 4 árboles en 2 jornadas' in pg51.inner_text('#carga-hecha') and pg51.is_hidden('#carga-revision'),'al terminar se dice qué se cargó y la pantalla queda lista para otro archivo')
    at51=pg51.evaluate("""async () => { const d = await SRP.indicadores.cargar(); const m = SRP.indicadores.calcular(d, SRP.indicadores.periodo('todo'), {}); const j = (await SRP.almacen.todos('jornadas')).filter(x => x.carga_id).map(x => x.id);
      return m.atender.filter(x => x.ids.some(id => j.includes(id))).map(x => x.tipo); }""")
    ok(at51==[],'las jornadas de carga histórica no aparecen en «Qué atender» como sin reporte ni con puntos por revisar: %s' % at51)
    pg51.evaluate("SRP.app.mostrarVista('cambios')"); pg51.wait_for_timeout(600)
    ok(pg51.inner_text('#cmb-lista .cmb-item >> nth=0').split('\n')[1]=='Carga masiva','el Registro de cambios muestra la carga masiva')
    # CSV con punto y coma, y un archivo sin las columnas
    open(sal('carga51.csv'),'w',encoding='utf-8-sig').write('Latitud;Longitud;Nombre científico;Fecha de plantación;Programa;Tipo de institución;Institución\n19.3,-99.2;Fraxinus uhdei;2025-05-05;Reforestación Urbana;Organización civil;Reforestamos México, A.C.\n'.replace('19.3,-99.2','19.3;-99.2'))
    pg51.evaluate("SRP.app.mostrarVista('carga')"); pg51.wait_for_timeout(400)
    pg51.set_input_files('#carga-archivo',sal('carga51.csv')); pg51.wait_for_timeout(1000)
    csv51=pg51.inner_text('#carga-resumen')
    open(sal('mala51.csv'),'w').write('lat,lon,especie\n19.3,-99.2,Fraxinus uhdei\n')
    pg51.set_input_files('#carga-archivo',sal('mala51.csv')); pg51.wait_for_timeout(800)
    ok('1 árbol listo para cargar' in csv51 and pg51.is_visible('#carga-error-archivo') and 'faltan columnas: Fecha de plantación, Programa, Tipo de institución, Institución' in pg51.inner_text('#carga-error-archivo') and pg51.is_hidden('#carga-revision'),
       'también se acepta CSV separado por punto y coma; un archivo sin las columnas se rechaza diciendo cuáles faltan')
    ok(pg51.evaluate("document.documentElement.scrollWidth")<=390,'la carga masiva no se sale de lado en el teléfono')
    ok(not err51,'sin errores en consola: %s' % err51[:2])
    ctx51.close()


    # ---------- BLOQUE 134: «LEJOS DEL RESTO» FRENTE AL MÁS CERCANO Y APROBAR TODOS LOS PUNTOS ----------
    ctx52=b.new_context(viewport={'width':390,'height':844}, geolocation={'latitude':19.357,'longitude':-99.06}, permissions=['geolocation'], timezone_id='America/Mexico_City'); pg52=ctx52.new_page(); err52=[]
    pg52.on('pageerror', lambda e: err52.append(str(e))); pg52.on('console', lambda m: m.type=='error' and 'net::' not in m.text and 'Failed to load' not in m.text and err52.append(m.text))
    pg52.goto(BASE); pg52.wait_for_timeout(1300)
    # Dos grupos a 200 m (una banqueta y el parque de enfrente) y un árbol solo a 400 m
    l52=pg52.evaluate("""(() => { const m = 1 / 111320, a = (id, n, e, esp) => ({ id, lat: 19.36 + n * m, lng: -99.06 + e * m / Math.cos(19.36 * Math.PI / 180), especie_id: esp, punto_origen: 'mapa' });
      const regs = [a('a1', 0, 0, 'ESP-0001'), a('a2', 0, 8, 'ESP-0002'), a('a3', 0, 16, 'ESP-0003'),
        a('b1', 200, 0, 'ESP-0004'), a('b2', 200, 8, 'ESP-0005'), a('b3', 200, 16, 'ESP-0006'), a('b4', 200, 24, 'ESP-0007'), a('b5', 200, 32, 'ESP-0008'), a('solo', -400, 0, 'ESP-0009')];
      const av = SRP.jornadas.avisos({ registros: regs }); return Object.keys(av).map(k => [k, av[k].map(x => x.tipo + ': ' + x.texto)]); })()""")
    ok(l52==[['solo',['lejos: Lejos del resto · a 400 m del más cercano']]],
       'con dos grupos de árboles juntos, «Lejos del resto» ya no marca un grupo entero: sólo el árbol que no tiene a nadie a menos de 150 m, y dice a cuánto está del más cercano: %s' % l52)
    # Tres árboles de la misma especie en el mismo punto: tres posibles duplicados por revisar
    pg52.select_option('#sel-usuario-prueba','u-cabo-1'); pg52.click('#btn-entrar-prueba'); pg52.wait_for_timeout(700)
    iniciar_jornada(pg52,'Alineación de palos verdes')
    for _ in range(3): registrar(pg52,'aile','ESP-0002')
    pg52.evaluate("SRP.app.mostrarVista('jornadas')"); pg52.wait_for_timeout(700)
    pg52.locator('#lista-jornadas .jornada-boton', has_text='Alineación de palos verdes').first.click(); pg52.wait_for_timeout(1200)
    b52=[pg52.is_visible('#btn-jornada-todos-bien'), pg52.inner_text('#btn-jornada-todos-bien')]
    pg52.click('#btn-jornada-todos-bien'); pg52.wait_for_timeout(400)
    cf52=pg52.inner_text('#dlg-confirmar')
    pg52.click('#btn-confirmar-si'); pg52.wait_for_timeout(900)
    r52=pg52.evaluate("""async () => { const j = (await SRP.almacen.todos('jornadas')).find(x => x.nombre === 'Alineación de palos verdes');
      const b = (await SRP.almacen.todos('bitacora')).filter(x => x.entidad_id === j.id && x.accion === 'EDITADO').map(x => x.detalle);
      return { rev: j.puntos_revisados.length, bit: b.pop(), boton: document.getElementById('btn-jornada-todos-bien').hidden,
        marcas: [...document.querySelectorAll('#jornada-lista .punto-jornada')].filter(li => /Revisado/.test(li.textContent)).length }; }""")
    ok(b52==[True,'Marcar los 3 como revisados'] and '¿Marcar los 3 puntos con aviso como revisados?' in cf52 and '3 posibles duplicados' in cf52,
       'con dos o más puntos por revisar, la ficha ofrece aprobarlos todos; antes pregunta y dice cuántos de cada aviso: %s' % b52)
    ok(r52=={'rev':3,'bit':'3 puntos revisados de una vez: están bien (1, 2, 3)','boton':True,'marcas':3},'al confirmar quedan los tres revisados, lo dice la bitácora con sus números y el botón se va: %s' % r52)
    pg52.click('#aviso .aviso-accion'); pg52.wait_for_timeout(900)
    ok(pg52.evaluate("(async () => (await SRP.almacen.todos('jornadas')).find(x => x.nombre === 'Alineación de palos verdes').puntos_revisados.length)()")==0 and pg52.is_visible('#btn-jornada-todos-bien'),
       '«Deshacer» los vuelve a dejar por revisar')
    # Con un solo punto pendiente no se ofrece: basta su «Está bien»
    pg52.locator('#jornada-lista button[data-accion="bien"]').first.click(); pg52.wait_for_timeout(700)
    pg52.locator('#jornada-lista button[data-accion="bien"]').first.click(); pg52.wait_for_timeout(700)
    ok(pg52.is_hidden('#btn-jornada-todos-bien') and pg52.locator('#jornada-lista button[data-accion="bien"]').count()==1,'con un solo punto por revisar el botón de todos no aparece: basta su «Está bien»')
    ok(not err52,'sin errores en consola: %s' % err52[:2])
    ctx52.close()


    # ---------- BLOQUE 135: BUSCAR JORNADAS POR NOMBRE ----------
    ctx53=b.new_context(viewport={'width':390,'height':844}, geolocation={'latitude':19.357,'longitude':-99.06}, permissions=['geolocation'], timezone_id='America/Mexico_City'); pg53=ctx53.new_page(); err53=[]
    pg53.on('pageerror', lambda e: err53.append(str(e))); pg53.on('console', lambda m: m.type=='error' and 'net::' not in m.text and 'Failed to load' not in m.text and err53.append(m.text))
    pg53.goto(BASE); pg53.wait_for_timeout(1300)
    pg53.select_option('#sel-usuario-prueba','u-cabo-1'); pg53.click('#btn-entrar-prueba'); pg53.wait_for_timeout(700)
    for nom in ['Parque Hundido, sección norte','Camellón Insurgentes','Parque de los Venados']:
        iniciar_jornada(pg53, nom); registrar(pg53,'aile','ESP-0002')
    # Venados: tres árboles iguales en el mismo punto (por revisar); Camellón: cerrada con 1 de 10 (no cuadra); Parque Hundido: cerrada y completa
    registrar(pg53,'aile','ESP-0002'); registrar(pg53,'aile','ESP-0002')
    pg53.evaluate("""async () => { for (const j of await SRP.almacen.todos('jornadas')) {
        if (j.nombre === 'Camellón Insurgentes') await SRP.almacen.guardarConBitacora('jornadas', Object.assign({}, j, { estatus: 'cerrada', fecha_cierre: SRP.util.ahoraISO() }), null);
        if (j.nombre === 'Parque Hundido, sección norte') await SRP.almacen.guardarConBitacora('jornadas', Object.assign({}, j, { estatus: 'cerrada', fecha_cierre: SRP.util.ahoraISO(), arboles_previstos: 1 }), null); } }""")
    pg53.evaluate("SRP.app.mostrarVista('jornadas')"); pg53.wait_for_timeout(700)
    pg53.click('#jornada-atajos .chip[data-atajo=todas]'); pg53.wait_for_timeout(400)
    def busca53(t):
        pg53.fill('#jornada-buscar', t); pg53.wait_for_timeout(500)
        return sorted(x.split('\n')[0] for x in pg53.eval_on_selector_all('#lista-jornadas .jornada','l=>l.map(x=>x.innerText)'))
    b53={t: busca53(t) for t in ['parque','PARQUE NORTE','camellon','hundido sección','']}
    ok(b53['parque']==['Parque Hundido, sección norte','Parque de los Venados'] and b53['PARQUE NORTE']==['Parque Hundido, sección norte'] and b53['camellon']==['Camellón Insurgentes']
       and b53['hundido sección']==['Parque Hundido, sección norte'] and len(b53[''])==3,
       'Jornadas busca por nombre mientras se escribe, sin distinguir mayúsculas ni acentos y con las palabras en cualquier orden: %s' % b53)
    busca53('vivero')
    v53=pg53.inner_text('#jornadas-vacio')
    pg53.click('#jornadas-vacio button[data-vacio=todas]'); pg53.wait_for_timeout(500)
    ok('Ninguna jornada coincide con «vivero».' in v53 and pg53.input_value('#jornada-buscar')=='' and pg53.locator('#lista-jornadas .jornada').count()==3,
       'sin coincidencias lo dice con lo buscado y «Ver todas» limpia la búsqueda: %s' % v53.replace('\n',' | '))
    def revision53(v):
        pg53.select_option('#jornada-revision', v); pg53.wait_for_timeout(500)
        return sorted(x.split('\n')[0] for x in pg53.eval_on_selector_all('#lista-jornadas .jornada','l=>l.map(x=>x.innerText)'))
    r53={v: revision53(v) for v in ['revisar','cuadra','sinreporte','pendiente','lista']}
    ok(r53['revisar']==['Parque de los Venados'] and r53['cuadra']==['Camellón Insurgentes'] and 'Parque Hundido, sección norte' in r53['sinreporte']
       and r53['pendiente']==sorted(set(r53['revisar']+r53['cuadra']+r53['sinreporte'])) and not set(r53['lista']) & set(r53['pendiente']) and len(r53['lista'])+len(r53['pendiente'])==3,
       '«Pendientes» deja las jornadas con puntos por revisar, las que no cuadran, las cerradas sin reporte, cualquiera de las tres o las que no tienen pendientes: %s' % r53)
    pg53.fill('#jornada-buscar','camellón'); pg53.wait_for_timeout(500)
    vr53=pg53.inner_text('#jornadas-vacio')
    pg53.click('#jornadas-vacio button[data-vacio=todas]'); pg53.wait_for_timeout(500)
    ok('Ninguna jornada coincide con «camellón» con estos filtros.' in vr53 and pg53.input_value('#jornada-revision')=='' and pg53.locator('#lista-jornadas .jornada').count()==3,
       'búsqueda y revisión se combinan; «Ver todas» quita las dos: %s' % vr53.replace('\n',' | '))
    ok(pg53.evaluate("document.documentElement.scrollWidth")<=390,'el buscador no saca la pantalla de lado en el teléfono')
    ok(not err53,'sin errores en consola: %s' % err53[:2])
    ctx53.close()

    # ---------- BLOQUE 136: LA CARGA MASIVA RECONOCE LO YA CARGADO Y SE PUEDE DESHACER ----------
    CAR54=sal('carga54.csv')
    ENC54='Latitud,Longitud,Nombre científico,Fecha de plantación,Programa,Tipo de institución,Institución\n'
    REN54=['19.3571,-99.0601,Fraxinus uhdei,2025-03-10,Reforestación Urbana,Alcaldía,Iztapalapa',
           '19.3573,-99.0603,Fraxinus uhdei,2025-03-10,Reforestación Urbana,Alcaldía,Iztapalapa',
           '19.3575,-99.0605,Fraxinus uhdei,2025-03-10,Reforestación Urbana,Alcaldía,Iztapalapa',
           '19.29,-99.17,Fraxinus uhdei,2024-07-01,Reforestación Urbana,Gobierno de la CDMX,PAOT']
    open(CAR54,'w',encoding='utf-8').write(ENC54+'\n'.join(REN54)+'\n')
    ctx54=b.new_context(viewport={'width':390,'height':844}, timezone_id='America/Mexico_City'); pg54=ctx54.new_page(); err54=[]
    pg54.on('pageerror', lambda e: err54.append(str(e))); pg54.on('console', lambda m: m.type=='error' and 'net::' not in m.text and 'Failed to load' not in m.text and err54.append(m.text))
    pg54.goto(BASE); pg54.wait_for_timeout(1300)
    pg54.select_option('#sel-usuario-prueba','u-admin-1'); pg54.click('#btn-entrar-prueba'); pg54.wait_for_timeout(700)
    # Un árbol registrado en campo con el mismo punto, especie, fecha e institución que el primer renglón
    pg54.evaluate("""async () => { const e = SRP.ref.deTipo('especie').find(x => x.nombre_cientifico === 'Fraxinus uhdei');
      const j = { id: 'jr-campo54', nombre: 'Camellón de campo', organizacion_id: 'o-alc-09007', estatus: 'cerrada', fecha: '2025-03-10', cabo_id: 'u-cabo-alc', programa_id: 'p-refor', carga_id: null };
      const a = { id: 'ar-campo54', estatus: 'activo', lat: 19.3571, lng: -99.0601, especie_id: e.id, fecha_plantacion: '2025-03-10', jornada_id: j.id, cabo_id: 'u-cabo-alc', programa_id: 'p-refor' };
      const tx = SRP.almacen.db.transaction(['jornadas','plantaciones'], 'readwrite'); tx.objectStore('jornadas').put(j); tx.objectStore('plantaciones').put(a);
      await new Promise(r => tx.oncomplete = r); }""")
    pg54.evaluate("SRP.app.mostrarVista('carga')"); pg54.wait_for_timeout(500)
    ok(pg54.is_visible('#titulo-carga-lotes') and pg54.is_visible('#carga-lotes-vacio') and pg54.locator('#carga-lotes li').count()==0,'la carga masiva tiene el apartado «Cargas hechas», vacío al principio')
    pg54.set_input_files('#carga-archivo', CAR54); pg54.wait_for_timeout(1200)
    r54=pg54.inner_text('#carga-resumen'); p54=pg54.inner_text('#carga-problemas')
    ok('3 árboles listos' in r54 and '1 renglón con error, que no se carga; de ellos, 1 ya estaba en el sistema' in r54 and 'ya se había cargado' not in r54
       and 'Ya está en el sistema: un árbol registrado en campo tiene el mismo punto, especie, fecha e institución' in p54,
       'un renglón igual a un árbol registrado en campo (punto, especie, fecha e institución) no entra, y se dice por qué: %s' % r54.replace('\n',' | '))
    pg54.click('#btn-carga-cargar'); pg54.wait_for_timeout(400); pg54.click('#btn-confirmar-si'); pg54.wait_for_timeout(1500)
    lote54=pg54.evaluate("(async () => (await SRP.almacen.todos('jornadas')).filter(j => j.carga_id).map(j => j.carga_id))()")
    ok(len(lote54)==2 and len(set(lote54))==1 and 'se deshace abajo, en «Cargas hechas»' in pg54.inner_text('#carga-hecha')
       and pg54.locator('#carga-lotes li').count()==1 and pg54.locator('#carga-lotes li button[data-lote]').count()==1 and 'Archivo «carga54.csv»: 3 árboles en 2 jornadas' in pg54.inner_text('#carga-lotes'),
       'cargado el archivo, «Cargas hechas» muestra el lote con su archivo y el botón «Deshacer carga»')
    # El mismo archivo otra vez: nada entra
    pg54.set_input_files('#carga-archivo', CAR54); pg54.wait_for_timeout(1200)
    r54=pg54.inner_text('#carga-resumen'); p54=pg54.inner_text('#carga-problemas')
    ok('0 árboles listos' in r54 and '4 renglones con error' in r54 and 'de ellos, 4 ya estaban en el sistema: este archivo ya se había cargado' in r54
       and p54.count('se cargó antes un árbol con el mismo punto')==3 and pg54.is_hidden('#btn-carga-cargar'),
       'subir otra vez el mismo archivo no carga nada: cada renglón dice que ya está en el sistema y el resumen, que el archivo ya se había cargado: %s' % r54.replace('\n',' | '))
    # El archivo con un renglón nuevo: sólo entra el nuevo
    open(CAR54,'w',encoding='utf-8').write(ENC54+'\n'.join(REN54+['19.2900,-99.1710,Fraxinus uhdei,2024-07-01,Reforestación Urbana,Gobierno de la CDMX,PAOT'])+'\n')
    pg54.set_input_files('#carga-archivo', CAR54); pg54.wait_for_timeout(1200)
    r54=pg54.inner_text('#carga-resumen')
    ok('1 árbol listo' in r54 and 'de ellos, 4 ya estaban en el sistema' in r54 and 'ya se había cargado' not in r54,
       'el mismo archivo, corregido y elegido otra vez con su mismo nombre, se vuelve a revisar; si trae renglones nuevos, sólo entran ésos: %s' % r54.replace('\n',' | '))
    # Deshacer: avisa de lo editado después y, al confirmar, quita el lote completo sin tocar lo de campo
    pg54.evaluate("""async () => { const ids = new Set((await SRP.almacen.todos('jornadas')).filter(j => j.carga_id).map(j => j.id));
      const a = (await SRP.almacen.todos('plantaciones')).find(x => ids.has(x.jornada_id)); a.fecha_ultima_edicion = SRP.util.ahoraISO(); a.editado_por_id = 'u-admin-1';
      const tx = SRP.almacen.db.transaction(['plantaciones'], 'readwrite'); tx.objectStore('plantaciones').put(a); await new Promise(r => tx.oncomplete = r); }""")
    pg54.click('#carga-lotes button[data-lote]'); pg54.wait_for_timeout(500)
    cf54=pg54.inner_text('#dlg-confirmar')
    ok('¿Quitar 3 árboles y 2 jornadas del archivo «carga54.csv»?' in cf54 and '1 árbol o jornada se editó después de cargarlos; también se quitan' in cf54 and 'conserva la carga' in cf54,
       'deshacer pide confirmar, dice cuántos árboles y jornadas quita, de qué archivo, y avisa lo editado después: %s' % cf54.replace('\n',' | ')[:200])
    pg54.click('#btn-confirmar-no'); pg54.wait_for_timeout(400)
    ok(pg54.evaluate("(async () => (await SRP.almacen.todos('jornadas')).filter(j => j.carga_id).length)()")==2,'si no se confirma, no se quita nada')
    pg54.click('#carga-lotes button[data-lote]'); pg54.wait_for_timeout(500); pg54.click('#btn-confirmar-si'); pg54.wait_for_timeout(1200)
    d54=pg54.evaluate("""async () => { const j = await SRP.almacen.todos('jornadas'), a = await SRP.almacen.todos('plantaciones'), b = await SRP.almacen.todos('bitacora');
      return { lote: j.filter(x => x.carga_id).length, j: j.map(x => x.id), a: a.map(x => x.id),
        bit: b.filter(x => x.entidad === 'carga').map(x => [x.accion, x.detalle]).sort() }; }""")
    ok(d54['lote']==0 and d54['j']==['jr-campo54'] and d54['a']==['ar-campo54']
       and d54['bit']==[['CREADO','Archivo «carga54.csv»: 3 árboles en 2 jornadas de 2 instituciones'],['ELIMINADO','Carga deshecha del archivo «carga54.csv»: 3 árboles y 2 jornadas quitados']],
       'al confirmar se quitan las 2 jornadas y los 3 árboles del lote, lo de campo se queda y la bitácora guarda la carga y que se deshizo: %s' % d54['bit'])
    ok(pg54.locator('#carga-lotes li[data-estado=deshecha]').count()==1 and pg54.locator('#carga-lotes button[data-lote]').count()==0 and 'Deshecha el' in pg54.inner_text('#carga-lotes')
       and 'Carga deshecha del archivo' in pg54.inner_text('#carga-hecha'),
       'el lote queda tachado como «Deshecha el…» y sin botón')
    pg54.evaluate("SRP.app.mostrarVista('carga')"); pg54.wait_for_timeout(500)
    pg54.set_input_files('#carga-archivo', CAR54); pg54.wait_for_timeout(1200)
    ok('4 árboles listos' in pg54.inner_text('#carga-resumen'),'deshecha la carga, el archivo se puede volver a cargar: '+pg54.inner_text('#carga-resumen').replace('\n',' | '))
    pg54.evaluate("SRP.app.mostrarVista('cambios')"); pg54.wait_for_timeout(600)
    pg54.evaluate("SRP.app.mostrarVista('configuracion')"); pg54.wait_for_timeout(600)
    res54=pg54.inner_text('.cfg-tarjeta[data-ir=carga] [data-resumen]')
    pg54.evaluate("SRP.app.mostrarVista('cambios')"); pg54.wait_for_timeout(600)
    ok(pg54.inner_text('#cmb-lista .cmb-item >> nth=0').split('\n')[1]=='Carga masiva deshecha' and res54=='1 carga hecha',
       'el Registro de cambios dice «Carga masiva deshecha» y la tarjeta cuenta sólo las cargas: %s' % res54)
    ok(pg54.evaluate("document.documentElement.scrollWidth")<=390,'«Cargas hechas» no se sale de lado en el teléfono')
    ok(not err54,'sin errores en consola: %s' % err54[:2])
    ctx54.close()

    # ---------- BLOQUE 137: FILTROS POR ESPECIE, PROGRAMA, ALCALDÍA E INSTITUCIÓN ----------
    ctx55=b.new_context(viewport={'width':390,'height':844}, timezone_id='America/Mexico_City'); pg55=ctx55.new_page(); err55=[]
    pg55.on('pageerror', lambda e: err55.append(str(e))); pg55.on('console', lambda m: m.type=='error' and 'net::' not in m.text and 'Failed to load' not in m.text and err55.append(m.text))
    pg55.goto(BASE); pg55.wait_for_timeout(1300)
    pg55.select_option('#sel-usuario-prueba','u-admin-1'); pg55.click('#btn-entrar-prueba'); pg55.wait_for_timeout(700)
    pg55.evaluate("async () => { await SRP.demo.cargar(); }"); pg55.wait_for_timeout(500)
    # Registros
    pg55.evaluate("SRP.app.mostrarVista('registros')"); pg55.wait_for_timeout(1500)
    pg55.evaluate("document.getElementById('filtro-mas-filtros').open = true"); pg55.wait_for_timeout(150)
    vis55=pg55.evaluate("['filtro-especie','filtro-programa','filtro-alcaldia','filtro-org'].map(id => !document.getElementById(id).closest('[hidden]'))")
    ok(vis55==[True]*4 and 'especie, programa, alcaldía e institución' in pg55.inner_text('#filtro-mas-filtros summary'),
       'en Registros la Administración global filtra por especie, programa, alcaldía e institución: %s' % pg55.inner_text('#filtro-mas-filtros summary'))
    esp55=pg55.evaluate("document.querySelector('#filtro-especie option:nth-child(2)').value")
    pg55.select_option('#filtro-especie', esp55); pg55.wait_for_timeout(500)
    r55=pg55.evaluate("(e) => ({ n: SRP.registros.filtrados.length, todos: SRP.registros.filtrados.every(r => (r.especie_id || '__otra') === e), total: SRP.registros.visibles.length })", esp55)
    fich55=pg55.inner_text('#filtros-activos')
    ok(r55['n']>0 and r55['todos'] and r55['n']<r55['total'] and 'Especie: ' in fich55,'elegir una especie deja sólo sus árboles y aparece su ficha: %s de %s' % (r55['n'], r55['total']))
    pg55.select_option('#filtro-especie',''); pg55.wait_for_timeout(300)
    pg55.select_option('#filtro-programa', pg55.evaluate("document.querySelector('#filtro-programa option:nth-child(2)').value")); pg55.wait_for_timeout(400)
    pg55.select_option('#filtro-alcaldia', pg55.evaluate("document.querySelector('#filtro-alcaldia option:nth-child(2)').value")); pg55.wait_for_timeout(400)
    r55=pg55.evaluate("() => { const f = SRP.registros.filtro; return SRP.registros.filtrados.every(r => r.programa_id === f.programa && SRP.ref.alcaldia(r.alcaldia) === f.alcaldia) }")
    ok(r55 and pg55.locator('#filtros-activos .ficha-filtro').count()==2,'programa y alcaldía se combinan, cada uno con su ficha')
    pg55.click('#btn-reiniciar-filtros'); pg55.wait_for_timeout(500)
    pg55.evaluate("document.getElementById('filtro-mas-filtros').open = true"); pg55.wait_for_timeout(150)
    d55=pg55.evaluate("""() => ({ grupos: [...document.querySelectorAll('#filtro-org optgroup')].map(g => g.label), tipo: document.getElementById('filtro-tipo-org') === null, bien: [...document.querySelectorAll('#filtro-org optgroup')].every(g => [...g.children].every(o => SRP.ref.catalogoPorId[o.value].tipo_organizacion === g.label)) })""")
    pg55.select_option('#filtro-org','o-green-cover'); pg55.wait_for_timeout(500)
    g55=pg55.evaluate("[SRP.registros.filtrados.length, SRP.registros.filtrados.every(r => SRP.registros.orgDe(r) === 'o-green-cover')]")
    ok(d55['tipo'] and len(d55['grupos'])>=2 and d55['bien'] and g55[0]>0 and g55[1],'la institución es una sola lista agrupada por tipo, y elegir una deja sólo sus árboles: %s, %s árboles' % (d55['grupos'], g55[0]))
    pg55.evaluate("SRP.registros.plegarFiltros(false)"); pg55.wait_for_timeout(200)
    pg55.click('#filtros-activos button[data-quitar=institucion]'); pg55.wait_for_timeout(500)
    ok(pg55.input_value('#filtro-org')=='' and pg55.evaluate("SRP.registros.filtrados.length==SRP.registros.visibles.length"),'la ficha de la institución la quita')
    # Paginador con muchas páginas en el teléfono: 1 2 3 … última, y la última lleva al final
    n55=pg55.eval_on_selector_all('#registros-paginas .paginador-botones > *','l=>l.map(x=>x.textContent.trim())')
    ult55=str(-(-pg55.evaluate("SRP.registros.visibles.length") // 10))
    pg55.click('#registros-paginas button[data-pagina="%s"]' % ult55); pg55.wait_for_timeout(600)
    m55=pg55.eval_on_selector_all('#registros-paginas .paginador-botones > *','l=>l.map(x=>x.textContent.trim())')
    ok(n55==['Atrás','1','2','3','…',ult55,'Siguiente'] and m55==['Atrás','1','…',str(int(ult55)-2),str(int(ult55)-1),ult55,'Siguiente'] and pg55.inner_text('#registros-paginas button[aria-current=page]')==ult55
       and pg55.evaluate("document.querySelector('#registros-paginas').scrollWidth <= document.querySelector('#registros-paginas').clientWidth"),
       'con muchas páginas, el teléfono ofrece Atrás, 1 2 3 … la última y Siguiente; la última lleva al final sin salirse de lado: %s → %s' % (n55, m55))
    # Jornadas
    pg55.evaluate("SRP.app.mostrarVista('jornadas')"); pg55.wait_for_timeout(2500)
    pg55.evaluate("document.getElementById('jornada-mas-filtros').open = true"); pg55.wait_for_timeout(150)
    alc55=pg55.evaluate("document.querySelector('#jornada-alcaldia option:nth-child(2)').value")
    pg55.select_option('#jornada-alcaldia', alc55); pg55.wait_for_timeout(1500)
    j55=pg55.evaluate("(a) => ({ n: SRP.jornadas.lista.length, todos: SRP.jornadas.lista.every(j => SRP.jornadas.alcaldiasFiltro(j).includes(a)), total: SRP.jornadas._todas.length })", alc55)
    ok(j55['n']>0 and j55['todos'] and j55['n']<j55['total'] and alc55 in pg55.inner_text('#jornada-mas-filtros summary'),'en Jornadas se filtra por alcaldía y el acordeón lo dice: %s de %s' % (j55['n'], j55['total']))
    pg55.select_option('#jornada-alcaldia',''); pg55.wait_for_timeout(1200)
    j55=pg55.evaluate("""() => ({ orgs: [...document.querySelectorAll('#jornada-org option')].slice(1).map(o => o.value), grupos: [...document.querySelectorAll('#jornada-org optgroup')].map(g => g.label), tipo: document.getElementById('jornada-tipo-org') === null })""")
    pg55.select_option('#jornada-org','o-paot'); pg55.wait_for_timeout(1500)
    jp55=pg55.evaluate("SRP.jornadas.lista.length>0 && SRP.jornadas.lista.every(j => SRP.jornadas.orgDe(j) === 'o-paot')")
    ok(j55['tipo'] and 'o-sedema' in j55['orgs'] and 'o-paot' in j55['orgs'] and 'Gobierno de la CDMX' in j55['grupos'] and jp55,'en Jornadas la institución es una sola lista agrupada por tipo: Gobierno de la CDMX reúne SEDEMA y PAOT, y PAOT deja sólo sus jornadas')
    pg55.select_option('#jornada-org','o-green-cover') if pg55.locator('#jornada-org option[value=o-green-cover]').count() else None
    pg55.evaluate("Object.assign(SRP.jornadas.filtro, { texto: 'zzzz-no-existe' }); SRP.jornadas.pintarLista()"); pg55.wait_for_timeout(1200)
    pg55.click('#jornadas-vacio button[data-vacio]'); pg55.wait_for_timeout(1500)
    ok(pg55.evaluate("['alcaldia','organizacion'].every(k => SRP.jornadas.filtro[k] === '')") and pg55.input_value('#jornada-org')=='','«Ver todas» también quita alcaldía e institución')
    ok(pg55.evaluate("document.documentElement.scrollWidth")<=390,'los filtros nuevos no se salen de lado en el teléfono')
    # Catálogos › Instituciones: buscar y filtrar por tipo, agrupadas por tipo
    pg55.evaluate("SRP.app.mostrarVista('catalogos')"); pg55.wait_for_timeout(500)
    pg55.click('#cat-tipos .chip[data-tipo=organizacion]'); pg55.wait_for_timeout(500)
    orden55=pg55.evaluate("[...document.querySelectorAll('#tabla-catalogo tbody tr')].map(tr => SRP.ref.catalogoPorId[tr.dataset.id].tipo_organizacion)")
    idx55=[['Alcaldía','Gobierno de la CDMX','Empresa privada','Organización civil'].index(t) for t in orden55]
    ok(pg55.is_visible('#cat-buscar') and pg55.inner_text('#cat-buscar-etiqueta')=='Buscar institución' and pg55.is_visible('#cat-filtro-tipo') and idx55==sorted(idx55) and len(idx55)==pg55.evaluate("SRP.ref.deTipo('organizacion', false).length"),
       'Catálogos › Instituciones trae buscador y tipo, y la lista va agrupada por tipo de institución')
    pg55.fill('#cat-buscar','izta'); pg55.wait_for_timeout(300)
    b55=pg55.eval_on_selector_all('#tabla-catalogo tbody tr .c-titulo','l=>l.map(x=>x.innerText)')
    pg55.fill('#cat-buscar',''); pg55.select_option('#cat-filtro-tipo','Empresa privada'); pg55.wait_for_timeout(300)
    e55=pg55.evaluate("[...document.querySelectorAll('#tabla-catalogo tbody tr')].map(tr => SRP.ref.catalogoPorId[tr.dataset.id].tipo_organizacion)")
    ok(b55==['Alcaldía Iztacalco','Alcaldía Iztapalapa'] and e55 and set(e55)=={'Empresa privada'} and pg55.inner_text('#cat-cuenta').startswith(str(len(e55))+' de '+str(len(idx55))),
       'se busca por nombre sin acentos y se filtra por tipo: %s · %s' % (b55, pg55.inner_text('#cat-cuenta')))
    pg55.click('#cat-tipos .chip[data-tipo=especie]'); pg55.wait_for_timeout(400)
    # El catálogo de especies tarda en pintarse: se espera a verlo, no un tiempo fijo
    esperar(pg55, "document.getElementById('cat-buscar-etiqueta').textContent === 'Buscar especie'", 8000)
    ok(pg55.inner_text('#cat-buscar-etiqueta')=='Buscar especie' and pg55.is_hidden('#cat-filtro-tipo'),'en Especies el buscador vuelve a ser de especies y el tipo de institución no se ve')
    # Usuarios en escritorio: buscador, institución y «Dar de alta» alineados por abajo
    pg55.set_viewport_size({'width':1280,'height':800}); pg55.evaluate("SRP.app.mostrarVista('usuarios')"); pg55.wait_for_timeout(600)
    al55=pg55.evaluate("['usr-buscar','usr-filtro-org','btn-usr-agregar'].map(id => Math.round(document.getElementById(id).getBoundingClientRect().bottom))")
    ok(len(set(al55))==1,'en Usuarios el buscador, la institución y «Dar de alta» quedan alineados: %s' % al55)
    ctx55.close()
    # Un cabo: especie, programa y alcaldía sí; institución no (sólo ve la suya)
    ctx55=b.new_context(viewport={'width':390,'height':844}, timezone_id='America/Mexico_City'); pg55=ctx55.new_page()
    pg55.goto(BASE); pg55.wait_for_timeout(1300)
    pg55.select_option('#sel-usuario-prueba','u-cabo-1'); pg55.click('#btn-entrar-prueba'); pg55.wait_for_timeout(700)
    pg55.evaluate("SRP.app.mostrarVista('registros')"); pg55.wait_for_timeout(800)
    c55=pg55.evaluate("['filtro-especie','filtro-programa','filtro-alcaldia','filtro-org'].map(id => !document.getElementById(id).closest('[hidden]'))")
    pg55.evaluate("SRP.app.mostrarVista('jornadas')"); pg55.wait_for_timeout(800)
    cj55=pg55.evaluate("['jornada-alcaldia','jornada-org'].map(id => !document.getElementById(id).closest('[hidden]'))")
    ok(c55==[True,True,True,False] and cj55==[True,False],'el cabo filtra por especie, programa y alcaldía; la institución es de la Administración global: %s %s' % (c55, cj55))
    ok(not err55,'sin errores en consola: %s' % err55[:2])
    ctx55.close()

    # ---------- BLOQUE 138: LISTAS QUE DEPENDEN DE LAS DEMÁS, SUPERVISIÓN CON SU ALCANCE, «QUIÉN REGISTRÓ» ----------
    ctx56=b.new_context(viewport={'width':390,'height':844}, timezone_id='America/Mexico_City'); pg56=ctx56.new_page(); err56=[]
    pg56.on('pageerror', lambda e: err56.append(str(e))); pg56.on('console', lambda m: m.type=='error' and 'net::' not in m.text and 'Failed to load' not in m.text and err56.append(m.text))
    pg56.goto(BASE); pg56.wait_for_timeout(1300)
    pg56.select_option('#sel-usuario-prueba','u-admin-1'); pg56.click('#btn-entrar-prueba'); pg56.wait_for_timeout(700)
    pg56.evaluate("async () => { await SRP.demo.cargar(); }"); pg56.wait_for_timeout(500)
    org56 = "o => (SRP.ref.usuarioPorId[o.value] || {}).organizacion_id"
    pg56.evaluate("SRP.app.mostrarVista('registros')"); pg56.wait_for_timeout(1500)
    pg56.evaluate("document.getElementById('filtro-mas-filtros').open = true")
    et56=pg56.evaluate("[...document.querySelectorAll('label')].filter(l => /cabo$/.test(l.htmlFor) && !/caja/.test(l.htmlFor)).map(l => l.textContent)")
    co56=pg56.evaluate("[...document.querySelectorAll('#filtro-cabo option')].slice(1).filter(o => SRP.ref.usuarioPorId[o.value].perfil === 'COORDINADOR').every(o => o.textContent.endsWith('(coordinación)'))")
    ok(set(et56)=={'Quién registró'} and len(et56)==4 and co56,'«Cabo» pasa a «Quién registró» en las cuatro pantallas que lo filtran, y la coordinación lleva su perfil en la lista: %s' % et56)
    antes56=pg56.evaluate("[document.querySelectorAll('#filtro-cabo option').length, document.querySelectorAll('#filtro-alcaldia option').length]")
    pg56.select_option('#filtro-org','o-paot'); pg56.wait_for_timeout(600)
    r56=pg56.evaluate("() => ({ cabos: [...document.querySelectorAll('#filtro-cabo option')].slice(1).map(o => (SRP.ref.usuarioPorId[o.value] || {}).organizacion_id), alc: document.querySelectorAll('#filtro-alcaldia option').length - 1, alcReal: new Set(SRP.registros.filtrados.map(r => SRP.ref.alcaldia(r.alcaldia))).size })")
    ok(r56['cabos'] and set(r56['cabos'])=={'o-paot'} and r56['alc']==r56['alcReal'] and len(r56['cabos'])<antes56[0]-1,
       'con una institución elegida, «Quién registró» y Alcaldía ofrecen sólo lo de esa institución: %s personas, %s alcaldías' % (len(r56['cabos']), r56['alc']))
    # Lo elegido se queda en su lista aunque otro filtro lo deje sin resultados
    pg56.select_option('#filtro-org',''); pg56.wait_for_timeout(500)
    otra56=pg56.evaluate("() => { const de = new Set(SRP.registros.visibles.filter(r => SRP.registros.orgDe(r) === 'o-paot').map(r => SRP.ref.alcaldia(r.alcaldia))); return [...document.querySelectorAll('#filtro-alcaldia option')].map(o => o.value).find(v => v && !de.has(v)); }")
    pg56.select_option('#filtro-alcaldia', otra56); pg56.wait_for_timeout(500)
    sin56=pg56.locator('#filtro-org option[value=o-paot]').count()
    # Una combinación sin árboles (como la que deja otro periodo): los dos valores se quedan elegidos
    pg56.evaluate("SRP.registros.filtro.organizacion = 'o-paot'; SRP.registros.filtro.tipo = 'Gobierno de la CDMX'; SRP.registros.aplicar()"); pg56.wait_for_timeout(500)
    k56=[pg56.input_value('#filtro-alcaldia'), pg56.input_value('#filtro-org'), pg56.evaluate("SRP.registros.filtrados.length")]
    ok(sin56==0 and k56==[otra56,'o-paot',0] and pg56.is_visible('#registros-vacio'),
       'con la alcaldía %s elegida, PAOT ya no se ofrece; y si una combinación queda sin árboles, lo elegido no se quita solo y el aviso ofrece quitar filtros: %s' % (otra56, k56))
    pg56.click('#btn-reiniciar-filtros'); pg56.wait_for_timeout(500)
    # Supervisión de la Administración: tipo e institución dependientes, y quién registró según la institución
    pg56.evaluate("SRP.app.mostrarVista('supervision')"); pg56.wait_for_timeout(2500)
    abrir_sup(pg56)
    pg56.evaluate("document.getElementById('sup-filtros').open = true")
    pg56.click('#sup-tipos .chip[data-tipo=todo]'); pg56.wait_for_timeout(1500)
    s56=pg56.evaluate("() => ({ grupos: [...document.querySelectorAll('#sup-organizacion optgroup')].map(g => g.label), tipo: document.getElementById('sup-tipo') === null })")
    alc56=pg56.evaluate("document.querySelector('#sup-organizacion optgroup[label=Alcaldía] option').value")
    pg56.select_option('#sup-organizacion', alc56); pg56.wait_for_timeout(1500)
    c56=pg56.evaluate("() => ({ cabos: [...document.querySelectorAll('#sup-cabo option')].slice(1).map(o => (SRP.ref.usuarioPorId[o.value] || {}).organizacion_id), n: SRP.supervision.modelo.cifras.arboles })")
    ok(s56['tipo'] and 'Alcaldía' in s56['grupos'] and len(s56['grupos'])>=2 and all(o==alc56 for o in c56['cabos']) and c56['n']>0,
       'Supervisión filtra por institución en una sola lista agrupada por tipo, que acota personas y cifras: %s' % s56['grupos'])
    pg56.select_option('#sup-organizacion','o-paot'); pg56.wait_for_timeout(1500)
    ok(pg56.input_value('#sup-organizacion')=='o-paot','y se cambia de institución sin pasar antes por el tipo')
    pg56.evaluate("SRP.app.mostrarVista('cambios')"); pg56.wait_for_timeout(500)
    ok(pg56.evaluate("document.querySelector('#cmb-sobre option').textContent")=='Todo','en el Registro de cambios la primera opción de «Sobre» es «Todo»')
    # Coordinación de alcaldía: Supervisión ofrece sólo lo suyo
    pg56.evaluate("SRP.sesion.iniciar(SRP.ref.usuarioPorId['u-coord-alc'])"); pg56.reload(); pg56.wait_for_timeout(1800)
    pg56.evaluate("SRP.app.mostrarVista('registros')"); pg56.wait_for_timeout(1500)
    ra56=pg56.evaluate("[document.querySelectorAll('#filtro-alcaldia option').length, document.querySelectorAll('#filtro-programa option').length]")
    pg56.evaluate("SRP.app.mostrarVista('supervision')"); pg56.wait_for_timeout(2500)
    abrir_sup(pg56)
    sa56=pg56.evaluate("[document.querySelectorAll('#sup-alcaldia option').length, document.querySelectorAll('#sup-programa option').length, !!document.getElementById('caja-sup-tipo')]")
    ok(sa56[0]<=ra56[0] and sa56[1]<=ra56[1] and sa56[0]<17 and not sa56[2],'la coordinación de una alcaldía ve en Supervisión sólo sus alcaldías y programas (%s), no las 16 ni los 4, y sin tipo de institución' % sa56)
    pg56.evaluate("SRP.sesion.iniciar(SRP.ref.usuarioPorId['u-cabo-alc'])"); pg56.reload(); pg56.wait_for_timeout(1800)
    pg56.evaluate("SRP.app.mostrarVista('supervision')"); pg56.wait_for_timeout(2500)
    abrir_sup(pg56)
    ok(pg56.inner_text('#sup-filtros-texto')=='Más filtros: alcaldía, programa y origen' and pg56.evaluate("document.querySelectorAll('#sup-programa option').length")<=2,
       'el cabo ve en «Mi avance» sólo sus programas y el resumen dice «alcaldía, programa y origen»: %s' % pg56.inner_text('#sup-filtros-texto'))
    ok(not err56,'sin errores en consola: %s' % err56[:2])
    ctx56.close()

    # ---------- BLOQUE 139: SUSTITUIR UN ÁRBOL PERDIDO; DUPLICADOS A 4 M ----------
    ctx57=b.new_context(viewport={'width':390,'height':844}, geolocation={'latitude':19.357,'longitude':-99.06,'accuracy':5}, permissions=['geolocation'], timezone_id='America/Mexico_City', accept_downloads=True)
    pg57=ctx57.new_page(); err57=[]
    pg57.on('pageerror', lambda e: err57.append(str(e))); pg57.on('console', lambda m: m.type=='error' and 'net::' not in m.text and 'Failed to load' not in m.text and err57.append(m.text))
    pg57.goto(BASE); pg57.wait_for_timeout(1300)
    pg57.select_option('#sel-usuario-prueba','u-cabo-1'); pg57.click('#btn-entrar-prueba'); pg57.wait_for_timeout(800)
    iniciar_jornada(pg57, 'Camellón Tlalpan, tramo sur')
    orig57=registrar(pg57,'ahuehu','ESP-0070')
    jor57=pg57.evaluate("SRP.activa.jornada.id")
    # La jornada se cierra: la sustitución llega después
    pg57.evaluate("async (id) => { const j = await SRP.almacen.uno('jornadas', id); await SRP.activa.cambiarEstatus(j, 'cerrada'); }", jor57); pg57.wait_for_timeout(500)
    pg57.evaluate("SRP.app.mostrarVista('registros')"); pg57.wait_for_timeout(800)
    accion(pg57, '#lista-registros li[data-id="%s"]' % orig57, 'sustituir'); pg57.wait_for_timeout(400)
    ok(pg57.is_visible('#dlg-sustituir') and pg57.eval_on_selector_all('#sustituir-motivos .chip','l=>l.map(c=>c.textContent)')==['Vandalismo','Impacto vehicular','Robo','Muerte','Otro'],
       '«Sustituir» abre la ventana con los cinco motivos: vandalismo, impacto vehicular, robo, muerte y otro')
    pg57.click('#btn-sustituir-seguir'); pg57.wait_for_timeout(200)
    e1=pg57.inner_text('#sustituir-error')
    pg57.click('#sustituir-motivos .chip[data-motivo=OTRO]'); pg57.wait_for_timeout(150)
    vis_otro=pg57.is_visible('#sustituir-otro')
    pg57.click('#btn-sustituir-seguir'); pg57.wait_for_timeout(200)
    e2=pg57.inner_text('#sustituir-error')
    ok(e1=='Elija por qué se sustituye.' and vis_otro and e2=='Escriba el motivo.','el motivo es obligatorio y «Otro» pide escribirlo')
    pg57.fill('#sustituir-otro','Lo atropelló una grúa'); pg57.click('#btn-sustituir-seguir'); pg57.wait_for_timeout(400)
    if pg57.is_visible('#dlg-confirmar'): pg57.click('#btn-confirmar-si'); pg57.wait_for_timeout(600)   # la jornada estaba cerrada: se pregunta antes de reabrirla
    if pg57.is_visible('#dlg-confirmar'): pg57.click('#btn-confirmar-si'); pg57.wait_for_timeout(800)
    reabre57=pg57.evaluate("async (id) => (await SRP.almacen.uno('jornadas', id)).estatus", jor57)=='abierta'
    f57=pg57.evaluate("[SRP.app.vista, document.getElementById('titulo-registrar').textContent, document.getElementById('edicion-aviso').textContent, SRP.formulario.estado.especieId, SRP.activa.jornada && SRP.activa.jornada.id]")
    ok(reabre57 and f57[0]=='registrar' and f57[1]=='Sustituir árbol' and 'Sustituto del Ahuehuete' in f57[2] and 'otro: lo atropelló una grúa' in f57[2] and f57[3]=='ESP-0070' and f57[4]==jor57,
       'la jornada cerrada se reabre y el formulario queda listo para el sustituto, en esa jornada y con la misma especie: %s' % f57[2])
    pg57.click('#btn-ubicacion'); pg57.wait_for_timeout(700)
    dup57=pg57.evaluate("async () => (await SRP.formulario.avisos(SRP.formulario.valores())).filter(a => a.tipo === 'duplicado').length")
    ok(dup57==0,'el árbol perdido no cuenta como «posible duplicado» del sustituto, aunque esté en el mismo punto')
    pg57.click('#form-plantacion button[type=submit]'); pg57.wait_for_timeout(800)
    if pg57.is_visible('#dlg-confirmar'): pg57.click('#btn-confirmar-si'); pg57.wait_for_timeout(800)
    if pg57.is_visible('#dlg-resumen'): pg57.click('#btn-resumen-guardar'); pg57.wait_for_timeout(800)
    s57=pg57.evaluate("""async (o) => { const t = await SRP.almacen.todos('plantaciones'); const org = t.find(x => x.id === o); const n = t.find(x => x.sustituye_id === o);
      const b = await SRP.almacen.todos('bitacora');
      return { vista: SRP.app.vista, org: [org.estatus, org.sustituido_por_id === (n && n.id)], n: n && [n.jornada_id, n.motivo_sustitucion, n.motivo_sustitucion_otro, n.estatus, n.cabo_id],
        bit: b.filter(x => x.entidad_id === o || (n && x.entidad_id === n.id)).map(x => x.accion + ':' + x.detalle).sort(), id: n && n.id }; }""", orig57)
    ok(s57['vista']=='registros' and s57['org']==['sustituido',True] and s57['n']==[jor57,'OTRO','Lo atropelló una grúa','activo','u-cabo-1']
       and any(x.startswith('SUSTITUIDO:Sustituido por Ahuehuete: Otro: Lo atropelló una grúa') for x in s57['bit']) and any(x.startswith('CREADO:Sustituye a Ahuehuete') for x in s57['bit']),
       'al guardar, el sustituto queda en la jornada del perdido con su motivo; el perdido pasa a «sustituido» y cada uno lleva su renglón de historial: %s' % s57['bit'])
    sus57=s57['id']
    lista57=pg57.evaluate("[...document.querySelectorAll('#lista-registros li[data-id]')].map(li => [li.dataset.id, li.querySelector('.marca-sustituto') ? li.querySelector('.marca-sustituto').textContent : ''])")
    ok([x for x in lista57 if x[0]==orig57]==[] and [sus57,'Sustituto · Otro: Lo atropelló una grúa'] in lista57,'en Registros el perdido ya no aparece y el nuevo lleva la marca «Sustituto» con su motivo')
    # Detalle y ficha de la jornada
    pg57.evaluate("async (id) => SRP.registros.verDetalle(await SRP.almacen.uno('plantaciones', id))", sus57); pg57.wait_for_timeout(600)
    det57=pg57.inner_text('#dlg-detalle-cuerpo')
    pg57.click('#btn-detalle-cerrar'); pg57.wait_for_timeout(200)
    ok('Sustituye a' in det57 and 'Motivo de la sustitución' in det57 and 'Lo atropelló una grúa' in det57,'el detalle dice a qué árbol sustituye y por qué')
    pg57.evaluate("async (id) => { SRP.app.mostrarVista('jornadas'); await SRP.jornadas.abrir(id); }", jor57); pg57.wait_for_timeout(1500)
    j57=pg57.evaluate("[document.querySelectorAll('#jornada-lista .punto-jornada').length, document.querySelector('#jornada-lista .punto-num').dataset.tono, document.querySelector('.pin-num span') ? document.querySelector('.pin-num span').dataset.tono : 'sin mapa', getComputedStyle(document.querySelector('#jornada-lista .punto-num')).backgroundColor, document.querySelector('.leyenda-jornada').textContent]")
    ok(j57[0]==1 and j57[1]=='sust' and j57[2] in ('sust','sin mapa') and j57[3]=='rgb(107, 63, 160)' and 'Sustituto' in j57[4],
       'en la ficha de la jornada queda sólo el sustituto, con su punto morado en la lista y en el mapa, y la leyenda lo explica: %s' % j57[:4])
    # Supervisión: cuenta como plantado y se dice aparte, por motivo; el CSV lo trae
    pg57.evaluate("async (id) => { const j = await SRP.almacen.uno('jornadas', id); await SRP.activa.cambiarEstatus(j, 'cerrada'); }", jor57); pg57.wait_for_timeout(500)
    pg57.evaluate("SRP.app.mostrarVista('supervision')"); pg57.wait_for_timeout(1500)
    abrir_sup(pg57)
    pg57.click('#sup-tipos .chip[data-tipo=todo]'); pg57.wait_for_timeout(1000)
    m57=pg57.evaluate("[SRP.supervision.modelo.cifras.arboles, SRP.supervision.modelo.calidad.sustitutos, JSON.stringify(SRP.supervision.modelo.calidad.sustitutosMotivo), document.getElementById('sup-cuerpo').innerText.includes('Sustitutos plantados'), SRP.informes.texto(SRP.supervision.modelo).split('\\r\\n')[0]]")
    ok(m57[0]==1 and m57[1]==1 and m57[2]=='[["Otro",1]]' and m57[3] and '"Sustituto","Motivo de la sustitución"' in m57[4],
       'Supervisión cuenta el sustituto como plantado (el perdido ya no) y lo dice aparte por motivo; la tabla para Excel trae sus dos columnas: %s' % m57[:3])
    # Eliminar el sustituto devuelve el perdido; deshacer lo vuelve a sustituir
    pg57.evaluate("async (id) => { SRP.app.mostrarVista('registros'); await SRP.registros.eliminar(await SRP.almacen.uno('plantaciones', id)); }", sus57); pg57.wait_for_timeout(800)
    e57=pg57.evaluate("async (o) => { const x = await SRP.almacen.uno('plantaciones', o); return [x.estatus, x.sustituido_por_id]; }", orig57)
    pg57.evaluate("async (id) => SRP.registros.restaurar(await SRP.almacen.uno('plantaciones', id))", sus57); pg57.wait_for_timeout(800)
    r57=pg57.evaluate("async (o) => { const x = await SRP.almacen.uno('plantaciones', o); return [x.estatus, x.sustituido_por_id]; }", orig57)
    ok(e57==['activo',None] and r57==['sustituido',sus57],'si se elimina el sustituto, el árbol perdido vuelve a contar; al deshacer, vuelve a quedar sustituido: %s → %s' % (e57, r57))
    # La Administración no captura: no sustituye
    pg57.evaluate("SRP.sesion.iniciar(SRP.ref.usuarioPorId['u-admin-1'])"); pg57.reload(); pg57.wait_for_timeout(1500)
    ok(not pg57.evaluate("async (id) => SRP.permisos.puede('registro.sustituir', await SRP.almacen.uno('plantaciones', id))", sus57),'la Administración global no sustituye: no captura árboles')
    ok(not err57,'sin errores en consola: %s' % err57[:2])
    ctx57.close()

    # ---------- BLOQUES 140 Y 141: CADA ÁRBOL CON SU FECHA; JORNADA DE VARIOS DÍAS; RELEVO DE CABO Y SU AVISO ----------
    D = lambda n: (datetime.date.today()-datetime.timedelta(days=n)).isoformat()
    TXT = lambda f: f[8:10]+'-'+MESES[int(f[5:7])-1]+'-'+f[0:4]
    ctx58=b.new_context(viewport={'width':390,'height':844}, geolocation={'latitude':19.357,'longitude':-99.06,'accuracy':5}, permissions=['geolocation'], timezone_id='America/Mexico_City')
    pg58=ctx58.new_page(); err58=[]
    pg58.on('pageerror', lambda e: err58.append(str(e))); pg58.on('console', lambda m: m.type=='error' and 'net::' not in m.text and 'Failed to load' not in m.text and err58.append(m.text))
    pg58.goto(BASE); pg58.wait_for_timeout(1300)
    pg58.select_option('#sel-usuario-prueba','u-admin-1'); pg58.click('#btn-entrar-prueba'); pg58.wait_for_timeout(700)
    pg58.evaluate("async () => { await SRP.demo.cargar(); }"); pg58.wait_for_timeout(500)
    pg58.evaluate("SRP.sesion.iniciar(SRP.ref.usuarioPorId['u-cabo-1'])"); pg58.reload(); pg58.wait_for_timeout(1500)
    pg58.evaluate("async () => { for (const j of await SRP.activa.abiertas()) await SRP.activa.cambiarEstatus(j, 'cerrada'); SRP.activa.jornada = null; }"); pg58.wait_for_timeout(300)
    def arbol58(busq='ahuehu', esp='ESP-0070'):
        pg58.click('#btn-ubicacion'); pg58.wait_for_timeout(700)
        pg58.fill('#campo-especie', busq); pg58.wait_for_timeout(200); pg58.dispatch_event('.combo-opcion[data-id="%s"]' % esp, 'mousedown'); pg58.wait_for_timeout(150)
        previo = pg58.evaluate("SRP.formulario.estado.ultimoGuardado")
        pg58.click('#form-plantacion button[type=submit]')
        return guardado58(previo)
    def guardado58(previo):
        """Espera a que el árbol quede guardado y el formulario listo para el siguiente, aceptando las
        ventanas que salgan en el camino. Con los datos de demostración el guardado no tarda siempre lo mismo."""
        for _ in range(80):
            pg58.wait_for_timeout(150)
            # Cada ventana se acepta una vez y se espera a que cierre
            if pg58.is_visible('#dlg-confirmar'): pg58.click('#btn-confirmar-si'); esperar(pg58, "!document.getElementById('dlg-confirmar').open", 4000); continue
            if pg58.is_visible('#dlg-resumen'): pg58.click('#btn-resumen-guardar'); esperar(pg58, "!document.getElementById('dlg-resumen').open", 6000); continue
            if pg58.evaluate("p => SRP.formulario.estado.ultimoGuardado !== p && !!document.getElementById('campo-fecha').value && !document.querySelector('dialog[open]') && !document.getElementById('btn-revisar').disabled", previo): break
        pg58.wait_for_timeout(200)
        return pg58.evaluate("SRP.formulario.estado.ultimoGuardado")
    fecha58 = lambda id: pg58.evaluate("async (id) => (await SRP.almacen.uno('plantaciones', id)).fecha_plantacion", id)
    # Una jornada de hoy no pide fecha: no hay de dónde elegir
    iniciar_jornada(pg58, 'Hoy B140')
    ok(pg58.is_hidden('#caja-fecha-arbol') and pg58.input_value('#campo-fecha')==HOY,'en una jornada de hoy la fecha de plantación no se pide: es hoy')
    pg58.evaluate("async () => { await SRP.activa.cambiarEstatus(SRP.activa.jornada, 'cerrada'); SRP.activa.jornada = null; }"); pg58.wait_for_timeout(300)
    # Se inicia hoy con fecha de hace tres días (captura atrasada): los árboles llevan esa fecha
    jv=iniciar_jornada(pg58, 'Varios días B140', D(3))
    v1=[pg58.is_visible('#caja-fecha-arbol'), pg58.input_value('#campo-fecha'), pg58.get_attribute('#campo-fecha','min'), pg58.get_attribute('#campo-fecha','max'), pg58.inner_text('#fecha-arbol-ayuda')]
    ok(v1[:4]==[True, D(3), D(3), HOY] and TXT(D(3)) in v1[4],'en una jornada que empezó otro día se ve «Fecha de plantación», de su inicio a hoy; el día que se inicia arranca con la fecha de la jornada: %s' % v1[:4])
    a1=arbol58()
    # Al día siguiente de iniciarla: los árboles nuevos arrancan con hoy
    pg58.evaluate("async (id) => { const j = await SRP.almacen.uno('jornadas', id); j.fecha_inicio = new Date(Date.now() - 2 * 864e5).toISOString(); await SRP.almacen.guardarConBitacora('jornadas', j, null); SRP.activa.jornada = j; SRP.activa.fechaElegida = null; SRP.activa.confirmadaOtroDia = null; await SRP.activa.preparar(); }", jv); pg58.wait_for_timeout(400)
    ok(pg58.input_value('#campo-fecha')==HOY,'los días siguientes, el árbol nuevo arranca con la fecha de hoy')
    pg58.click('#btn-ubicacion'); pg58.wait_for_timeout(700)
    pg58.fill('#campo-especie','aile'); pg58.wait_for_timeout(200); pg58.dispatch_event('.combo-opcion[data-id="ESP-0002"]','mousedown'); pg58.wait_for_timeout(150)
    pg58.click('#form-plantacion button[type=submit]'); pg58.wait_for_timeout(600)
    c58=[pg58.is_visible('#dlg-confirmar') and pg58.inner_text('#dlg-confirmar-titulo'), pg58.inner_text('#dlg-confirmar-puntos') if pg58.is_visible('#dlg-confirmar') else '']
    ok(c58[0]=='Jornada de otro día' and 'queda con fecha de plantación ' + HOY_TXT in c58[1] and '«Fecha de plantación»' in c58[1],'guardar en la jornada de otro día confirma y dice con qué fecha queda el árbol: %s' % c58[1].replace(chr(10),' | '))
    a2=guardado58(a1)
    # Elegir otro día: se conserva para el árbol siguiente de la jornada
    pg58.fill('#campo-fecha', D(1)); pg58.dispatch_event('#campo-fecha','change'); pg58.wait_for_timeout(150)
    a3=arbol58('aile','ESP-0002')
    sigue58=pg58.input_value('#campo-fecha')
    ok([fecha58(a1), fecha58(a2), fecha58(a3)]==[D(3), HOY, D(1)] and sigue58==D(1),'cada árbol lleva el día en que se plantó (%s) y el día elegido se queda para el siguiente: %s' % ([fecha58(a1), fecha58(a2), fecha58(a3)], sigue58))
    # No antes del inicio de la jornada ni después de hoy
    pg58.fill('#campo-fecha', D(5)); pg58.dispatch_event('#campo-fecha','change'); pg58.click('#form-plantacion button[type=submit]'); pg58.wait_for_timeout(400)
    e58=pg58.inner_text('#resumen-errores')
    ok('anterior al inicio de la jornada (' + TXT(D(3)) + ')' in e58,'una fecha antes del inicio de la jornada no se acepta: %s' % e58.replace(chr(10),' | '))
    pg58.fill('#campo-fecha', HOY); pg58.dispatch_event('#campo-fecha','change'); pg58.wait_for_timeout(150)
    fr58=pg58.text_content('#franja-jornada-texto')
    ok(TXT(D(3)) + ' al ' + HOY_TXT in fr58,'la franja dice los días de la jornada: %s' % fr58)
    pg58.evaluate("SRP.formulario.limpiar()")
    # Ficha de la jornada: días, y cada punto de otro día con su fecha
    pg58.evaluate("async (id) => { SRP.app.mostrarVista('jornadas'); await SRP.jornadas.abrir(id); }", jv); pg58.wait_for_timeout(1500)
    sub58=pg58.inner_text('#jornada-sub'); det58=pg58.eval_on_selector_all('#jornada-lista .punto-detalle','l=>l.map(x=>x.textContent)')
    ok(TXT(D(3)) + ' al ' + HOY_TXT in sub58 and not det58[0].startswith(TXT(D(3))) and det58[1].startswith(HOY_TXT) and det58[2].startswith(TXT(D(1))),
       'la ficha de la jornada dice sus días y los puntos de otro día llevan su fecha: %s' % [sub58, [d[:12] for d in det58]])
    # Editar la fecha de la jornada: la toman los árboles del día de inicio; los de otros días conservan la suya
    pg58.click('#btn-jornada-editar'); pg58.wait_for_timeout(300)
    pg58.fill('#ej-fecha', HOY); pg58.dispatch_event('#ej-fecha','change'); pg58.click('#btn-ej-guardar'); pg58.wait_for_timeout(600)
    ej58=pg58.inner_text('#ej-errores') if pg58.is_visible('#ej-errores') else ''
    ok(pg58.is_visible('#dlg-editar-jornada') and 'no puede empezar después de ese día' in ej58 and TXT(D(1)) in ej58,
       'la jornada no puede empezar después de un árbol plantado otro día: %s' % ej58.replace(chr(10),' | '))
    pg58.fill('#ej-fecha', D(4)); pg58.dispatch_event('#ej-fecha','change'); pg58.click('#btn-ej-guardar'); pg58.wait_for_timeout(900)
    ok([fecha58(a1), fecha58(a2), fecha58(a3)]==[D(4), HOY, D(1)],'al cambiar la fecha de la jornada, sus árboles del día de inicio la toman y los de otros días conservan la suya: %s' % [fecha58(a1), fecha58(a2), fecha58(a3)])
    # Supervisión: cada árbol cuenta en el día en que se plantó
    pg58.evaluate("async (id) => { const j = await SRP.almacen.uno('jornadas', id); await SRP.activa.cambiarEstatus(j, 'cerrada'); }", jv); pg58.wait_for_timeout(400)
    s58=pg58.evaluate("""async (id) => { const I = SRP.indicadores, d = await I.cargar();
      const c = (a, b) => { const m = I.calcular(d, I.periodo('rango', a, b), {}); return [m.detalle.filter(x => x.jornada === 'Varios días B140').length, m.jornadas.some(j => j.id === id)]; };
      return [c('%s', '%s'), c('%s', '%s'), c('%s', '%s'), c('%s', '%s')]; }""" % (HOY, HOY, D(1), D(1), D(4), D(4), D(2), D(2)), jv)
    ok(s58==[[1, True], [1, True], [1, True], [0, False]],'en Supervisión cada árbol cuenta en el periodo de su fecha de plantación, y la jornada aparece en cada periodo en que plantó: %s' % s58)
    # Mover un árbol de otro día conserva su fecha
    j2=pg58.evaluate("async () => { const u = SRP.sesion.usuario; const j = { id: 'jr-b140-destino', nombre: 'Destino B140', fecha: '%s', cabo_id: u.id, estatus: 'cerrada', programa_id: 'p-refor', organizacion_id: u.organizacion_id, fecha_inicio: new Date().toISOString(), puntos_revisados: [], relevo_id: null, relevos: [] }; await SRP.almacen.guardarConBitacora('jornadas', j, null); return j.id; }" % D(6))
    pg58.evaluate("async (a) => { await SRP.jornadas.mover(await SRP.almacen.uno('plantaciones', a[0]), await SRP.almacen.uno('jornadas', a[1])); }", [a3, j2]); pg58.wait_for_timeout(500)
    mv58=pg58.inner_text('#aviso')
    ok(fecha58(a3)==D(1) and 'conserva su fecha, ' + TXT(D(1)) in mv58,'mover a otra jornada un árbol plantado otro día conserva su fecha: %s' % mv58)

    # --- Sustituir con fecha ---
    pg58.evaluate("SRP.app.mostrarVista('registros')"); pg58.wait_for_timeout(800)
    pg58.evaluate("async (id) => SRP.registros.sustituir(await SRP.almacen.uno('plantaciones', id))", a1); pg58.wait_for_timeout(400)
    sf=[pg58.input_value('#sustituir-fecha'), pg58.get_attribute('#sustituir-fecha','min'), pg58.get_attribute('#sustituir-fecha','max')]
    ok(sf==[HOY, D(4), HOY],'«Sustituir» pide la fecha de la sustitución: hoy de inicio, desde la plantación del árbol perdido hasta hoy: %s' % sf)
    pg58.click('#sustituir-motivos .chip[data-motivo=ROBO]'); pg58.fill('#sustituir-fecha', D(5)); pg58.click('#btn-sustituir-seguir'); pg58.wait_for_timeout(200)
    es58=pg58.inner_text('#sustituir-error')
    ok('anterior a la plantación del árbol perdido (' + TXT(D(4)) + ')' in es58,'la sustitución no puede ser de antes de que se plantara el perdido: %s' % es58)
    pg58.fill('#sustituir-fecha', D(2)); pg58.click('#btn-sustituir-seguir'); pg58.wait_for_timeout(1200)
    if pg58.is_visible('#dlg-confirmar'): pg58.click('#btn-confirmar-si'); pg58.wait_for_timeout(900)   # la jornada estaba cerrada: se pregunta antes de reabrirla
    f58=pg58.evaluate("[document.getElementById('campo-fecha').value, !document.getElementById('caja-fecha-arbol').hidden, document.getElementById('edicion-aviso').textContent]")
    ok(f58[0]==D(2) and f58[1] and 'plantado el ' + TXT(D(2)) in f58[2],'el formulario del sustituto llega con esa fecha, a la vista: %s' % f58)
    pg58.click('#btn-ubicacion'); pg58.wait_for_timeout(700)
    pg58.click('#form-plantacion button[type=submit]'); pg58.wait_for_timeout(800)
    ok(not pg58.is_visible('#dlg-confirmar'),'la sustitución no vuelve a preguntar por la jornada de otro día: su fecha ya se eligió')
    if pg58.is_visible('#dlg-confirmar'): pg58.click('#btn-confirmar-si'); pg58.wait_for_timeout(700)
    if pg58.is_visible('#dlg-resumen'): pg58.click('#btn-resumen-guardar'); pg58.wait_for_timeout(800)
    su58=pg58.evaluate("async (o) => { const n = (await SRP.almacen.todos('plantaciones')).find(x => x.sustituye_id === o); return n && [n.fecha_plantacion, n.jornada_id]; }", a1)
    ok(su58==[D(2), jv],'el sustituto queda en la jornada del perdido con la fecha de la sustitución: %s' % su58)
    pg58.evaluate("async (id) => { const j = await SRP.almacen.uno('jornadas', id); if (j.estatus === 'abierta') await SRP.activa.cambiarEstatus(j, 'cerrada'); }", jv); pg58.wait_for_timeout(300)
    s58b=pg58.evaluate("""async () => { const I = SRP.indicadores, d = await I.cargar(); const m = I.calcular(d, I.periodo('rango', '%s', '%s'), {}); return [m.detalle.filter(x => x.jornada === 'Varios días B140').map(x => x.sustituto)]; }""" % (D(2), D(2)))
    ok(s58b==[['Sí']],'Supervisión cuenta el sustituto en el periodo en que se plantó: %s' % s58b)

    # --- Relevo de cabo ---
    pg58.evaluate("SRP.app.mostrarVista('registrar')"); pg58.wait_for_timeout(500)
    jr=iniciar_jornada(pg58, 'Relevo B140')
    r1=arbol58()
    ok(not pg58.evaluate("async (id) => SRP.permisos.puede('jornada.relevo', await SRP.almacen.uno('jornadas', id))", jr),'el cabo no hace relevos')
    pg58.evaluate("SRP.sesion.iniciar(SRP.ref.usuarioPorId['u-coord-1'])"); pg58.reload(); pg58.wait_for_timeout(1500)
    pg58.evaluate("async (id) => { SRP.app.mostrarVista('jornadas'); await SRP.jornadas.abrir(id); }", jr); pg58.wait_for_timeout(1500)
    vis58=pg58.is_visible('#btn-jornada-relevo')
    pg58.click('#btn-jornada-relevo'); pg58.wait_for_timeout(300)
    op58=pg58.eval_on_selector_all('#relevo-quien option','l=>l.map(o=>o.value).filter(Boolean)')
    ok(vis58 and pg58.is_visible('#dlg-relevo') and 'u-cabo-1' not in op58 and 'u-demo-c1' in op58 and all(pg58.evaluate("id => SRP.ref.usuarioPorId[id].coordinadores_ids", x)==['u-coord-1'] for x in op58),
       'la coordinación ve «Relevo de cabo» en una jornada abierta de su cuadrilla y elige entre los demás cabos de su cuadrilla: %s' % op58)
    pg58.click('#btn-relevo-hacer'); esperar(pg58, "!!document.getElementById('relevo-error').innerText.trim()", 4000)
    ok(pg58.inner_text('#relevo-error')=='Elija el cabo que sigue registrando.','sin elegir cabo no se hace el relevo')
    pg58.select_option('#relevo-quien','u-demo-c1'); pg58.click('#btn-relevo-hacer'); pg58.wait_for_timeout(900)
    rl58=pg58.evaluate("async (id) => { const j = await SRP.almacen.uno('jornadas', id); const b = (await SRP.bitacora.deEntidad(id)).filter(x => x.accion === 'RELEVO').map(x => x.detalle); return [j.cabo_id, j.relevo_id, j.relevos.map(x => [x.cabo_id, x.por_id]), b]; }", jr)
    ok(rl58[0]=='u-cabo-1' and rl58[1]=='u-demo-c1' and rl58[2]==[['u-demo-c1','u-coord-1']] and len(rl58[3])==1 and rl58[3][0].startswith('Registra ') and 'titular' in rl58[3][0],
       'el relevo pasa la jornada al cabo elegido; el titular no cambia y queda en el historial: %s' % rl58)
    ok('relevo: ' in pg58.inner_text('#jornada-sub') and 'Relevo hecho' in pg58.inner_text('#aviso'),'la ficha dice quién registra ahora: %s' % pg58.inner_text('#jornada-sub'))
    # El titular ya no registra en ella
    pg58.evaluate("SRP.sesion.iniciar(SRP.ref.usuarioPorId['u-cabo-1'])"); pg58.reload(); pg58.wait_for_timeout(1800)
    av58a=[pg58.is_visible('#dlg-confirmar'), pg58.inner_text('#dlg-confirmar-titulo') if pg58.is_visible('#dlg-confirmar') else '', pg58.inner_text('#dlg-confirmar-texto') if pg58.is_visible('#dlg-confirmar') else '', pg58.is_hidden('#btn-confirmar-no')]
    ok(av58a[0] and av58a[1]=='Relevo de cabo' and 'pasó a' in av58a[2] and 'ya no registra en ella' in av58a[2] and 'Lo hizo' in av58a[2] and av58a[3],'al entrar, el cabo que deja la jornada lee un aviso con «Entendido»: a quién pasó y quién hizo el relevo: %s' % av58a[2])
    if pg58.is_visible('#dlg-confirmar'): pg58.click('#btn-confirmar-si'); pg58.wait_for_timeout(300)
    pg58.reload(); pg58.wait_for_timeout(1500)
    ok(not pg58.is_visible('#dlg-confirmar'),'el aviso del relevo sale una sola vez')
    t58=pg58.evaluate("async (id) => [ (await SRP.activa.abiertas()).some(j => j.id === id), SRP.permisos.puede('jornada.registrar', await SRP.almacen.uno('jornadas', id)) ]", jr)
    pg58.evaluate("async (id) => { SRP.app.mostrarVista('jornadas'); await SRP.jornadas.abrir(id); }", jr); pg58.wait_for_timeout(1500)
    ok(t58==[False, False] and pg58.is_hidden('#btn-jornada-faltante') and pg58.is_visible('#jornada-detalle'),'el titular sigue viendo su jornada, pero ya no registra en ella: %s' % t58)
    # El cabo del relevo la tiene activa, ve lo ya plantado y registra a su nombre
    pg58.evaluate("SRP.sesion.iniciar(SRP.ref.usuarioPorId['u-demo-c1'])"); pg58.reload(); pg58.wait_for_timeout(1800)
    av58b=[pg58.is_visible('#dlg-confirmar'), pg58.inner_text('#dlg-confirmar-titulo') if pg58.is_visible('#dlg-confirmar') else '', pg58.inner_text('#dlg-confirmar-texto') if pg58.is_visible('#dlg-confirmar') else '', pg58.is_hidden('#btn-confirmar-no')]
    ok(av58b[0] and av58b[1]=='Relevo de cabo' and 'Recibió la jornada «Relevo B140» en relevo de' in av58b[2] and 'ya puede registrar en ella' in av58b[2] and av58b[3],'el cabo que recibe la jornada lee que la recibió y de quién: %s' % av58b[2])
    if pg58.is_visible('#dlg-confirmar'): pg58.click('#btn-confirmar-si'); pg58.wait_for_timeout(300)
    pg58.evaluate("SRP.app.mostrarVista('registrar')"); pg58.wait_for_timeout(600)
    pg58.evaluate("async (id) => { SRP.activa.jornada = await SRP.almacen.uno('jornadas', id); await SRP.activa.preparar(); }", jr); pg58.wait_for_timeout(400)
    fz58=pg58.text_content('#franja-jornada-texto')
    r2=arbol58('aile','ESP-0002')
    a58=pg58.evaluate("async (a) => { const x = await SRP.almacen.uno('plantaciones', a[0]); return [x.jornada_id === a[1], x.cabo_id]; }", [r2, jr])
    ok('relevo de ' in fz58 and a58==[True, 'u-demo-c1'],'el cabo del relevo registra en esa jornada y cada árbol queda a su nombre: %s · %s' % (fz58, a58))
    pg58.evaluate("async (id) => { SRP.app.mostrarVista('jornadas'); await SRP.jornadas.abrir(id); }", jr); pg58.wait_for_timeout(1500)
    vr58=pg58.evaluate("[document.querySelectorAll('#jornada-lista .punto-jornada').length, document.querySelector('#jornada-lista .punto-jornada .btn-tuerca') ? [...document.querySelectorAll('#jornada-lista .punto-jornada')][0].querySelector('[data-accion=editar]') !== null : false]")
    ok(vr58==[2, False],'en la ficha ve también lo que plantó el titular, sin poder editarlo: %s' % vr58)
    # La coordinación la devuelve al titular
    pg58.evaluate("SRP.sesion.iniciar(SRP.ref.usuarioPorId['u-coord-1'])"); pg58.reload(); pg58.wait_for_timeout(1500)
    pg58.evaluate("async (id) => { SRP.app.mostrarVista('jornadas'); await SRP.jornadas.abrir(id); }", jr); pg58.wait_for_timeout(1500)
    pg58.click('#btn-jornada-relevo'); pg58.wait_for_timeout(300)
    t1=pg58.eval_on_selector_all('#relevo-quien option','l=>l.map(o=>[o.value,o.textContent])')[1]
    pg58.select_option('#relevo-quien','u-cabo-1'); pg58.click('#btn-relevo-hacer'); pg58.wait_for_timeout(900)
    dv58=pg58.evaluate("async (id) => { const j = await SRP.almacen.uno('jornadas', id); return [j.relevo_id, j.relevos.length]; }", jr)
    ok(t1[0]=='u-cabo-1' and 'titular' in t1[1] and dv58==[None, 2],'la coordinación puede devolverla al titular, que aparece primero: %s %s' % (t1, dv58))
    # Supervisión: cada quien con sus árboles; filtrar por el cabo del relevo encuentra la jornada
    pg58.evaluate("async (id) => { const j = await SRP.almacen.uno('jornadas', id); await SRP.activa.cambiarEstatus(j, 'cerrada'); }", jr); pg58.wait_for_timeout(300)
    sv58=pg58.evaluate("""async (id) => { const I = SRP.indicadores, d = await I.cargar(), p = I.periodo('rango', '%s', '%s');
      const m = I.calcular(d, p, {}), c = I.calcular(d, p, { cabo: 'u-demo-c1' });
      const de = x => (m.porCabo.find(k => k.cabo_id === x) || {}).arboles;
      return [de('u-cabo-1'), de('u-demo-c1'), c.cifras.arboles, c.jornadas.some(j => j.id === id)]; }""" % (HOY, HOY), jr)
    ok(sv58[1]==1 and sv58[2]==1 and sv58[3],'Supervisión cuenta a cada cabo sus árboles y el filtro «Quién registró» encuentra la jornada del relevo: %s' % sv58)
    rep58=pg58.evaluate("async (id) => { const j = await SRP.almacen.uno('jornadas', id); const regs = await SRP.activa.registrosDe(j); return SRP.reportes.modelo(regs, j, j.fecha, j).identificacion.find(x => x[0] === 'Relevo de cabo'); }", jr)
    ok(rep58 is not None and 'desde el ' + HOY_TXT in rep58[1],'el reporte de la jornada dice el relevo: %s' % rep58)
    pg58.evaluate("SRP.sesion.iniciar(SRP.ref.usuarioPorId['u-cabo-1'])"); pg58.reload(); pg58.wait_for_timeout(1800)
    av58c=[pg58.is_visible('#dlg-confirmar'), pg58.inner_text('#dlg-confirmar-titulo') if pg58.is_visible('#dlg-confirmar') else '', pg58.inner_text('#dlg-confirmar-texto') if pg58.is_visible('#dlg-confirmar') else '', pg58.is_hidden('#btn-confirmar-no')]
    ok(av58c[0] and av58c[1]=='Relevo de cabo' and 'volvió a usted' in av58c[2] and av58c[3],'cuando la coordinación se la devuelve, el titular lee que volvió a él: %s' % av58c[2])
    if pg58.is_visible('#dlg-confirmar'): pg58.click('#btn-confirmar-si'); pg58.wait_for_timeout(300)
    pg58.evaluate("SRP.sesion.iniciar(SRP.ref.usuarioPorId['u-admin-1'])"); pg58.reload(); pg58.wait_for_timeout(1300)
    ok(not pg58.evaluate("SRP.permisos.puede('jornada.relevo', { cabo_id: 'u-cabo-1', estatus: 'abierta' })"),'la Administración global no hace relevos: lo decide la coordinación')
    ok(not err58,'sin errores en consola: %s' % err58[:2])
    ctx58.close()

    # ---------- BLOQUE 141: LA MISMA ZONA DE FILTROS EN TODOS LOS MÓDULOS ----------
    ctx59=b.new_context(viewport={'width':390,'height':844}, timezone_id='America/Mexico_City'); pg59=ctx59.new_page(); err59=[]
    pg59.on('pageerror', lambda e: err59.append(str(e))); pg59.on('console', lambda m: m.type=='error' and 'net::' not in m.text and 'Failed to load' not in m.text and err59.append(m.text))
    pg59.goto(BASE); pg59.wait_for_timeout(1300)
    pg59.select_option('#sel-usuario-prueba','u-admin-1'); pg59.click('#btn-entrar-prueba'); pg59.wait_for_timeout(700)
    pg59.evaluate("async () => { await SRP.demo.cargar(); }"); pg59.wait_for_timeout(500)
    # Jornadas: «Más filtros» trae «Reporte» (generado o sin generar), con su ficha y «Quitar filtros»
    pg59.evaluate("SRP.app.mostrarVista('jornadas')"); pg59.wait_for_timeout(2500)
    pg59.evaluate("SRP.jornadas.aplicarAtajo('todas')"); pg59.wait_for_timeout(2000)
    pg59.evaluate("document.getElementById('jornada-mas-filtros').open = true")
    z59=pg59.evaluate("""() => ({ listas: [...document.querySelectorAll('#jornada-mas-filtros select')].filter(s => !s.closest('[hidden]')).map(s => document.querySelector('label[for=' + s.id + ']').textContent),
      resumen: document.getElementById('jornada-mas-filtros-texto').textContent, total: SRP.jornadas.lista.length, cerradas: SRP.jornadas.lista.filter(j => j.estatus === 'cerrada').length })""")
    ok('Reporte' not in z59['listas'] and 'Origen' in z59['listas'] and 'reporte' not in z59['resumen'] and len(z59['listas'])<=5,'«Más filtros» de Jornadas lleva sólo listas: quién registró, programa, origen, alcaldía e institución: %s' % z59['listas'])
    pg59.select_option('#jornada-revision','sinreporte'); pg59.wait_for_timeout(2000)
    r59=pg59.evaluate("[SRP.jornadas.lista.length, SRP.jornadas.lista.every(j => j.estatus === 'cerrada' && !j.dato.reporte_en), document.getElementById('jornada-fichas').textContent, document.getElementById('jornada-quitar').hidden]")
    ok(0<r59[0]<z59['cerradas'] and r59[1] and 'sin reporte' in r59[2].lower() and not r59[3],'«Pendientes: sin reporte todavía» deja las jornadas cerradas que aún no tienen reporte, con su ficha y «Quitar filtros»: %s de %s' % (r59[0], z59['cerradas']))
    pg59.click('#jornada-fichas button[data-quitar=revision]'); pg59.wait_for_timeout(2000)
    ok(pg59.input_value('#jornada-revision')=='' and pg59.evaluate("SRP.jornadas.lista.length")==z59['total'],'la ficha quita el filtro con la ×')
    # Fotografías: la misma zona, con jornada, especie, programa y alcaldía
    pg59.evaluate("SRP.app.mostrarVista('galeria')"); pg59.wait_for_timeout(2500)
    pg59.evaluate("document.getElementById('galeria-mas').open = true")
    g59=pg59.evaluate("""() => ({ listas: [...document.querySelectorAll('#galeria-mas select')].map(s => document.querySelector('label[for=' + s.id + ']').textContent), n: SRP.galeria.fotos.length,
      esp: [...document.querySelectorAll('#galeria-especie option')].map(o => o.value).filter(Boolean) })""")
    pg59.select_option('#galeria-especie', g59['esp'][0]); pg59.wait_for_timeout(2000)
    ge59=pg59.evaluate("[SRP.galeria.fotos.length, SRP.galeria.fotos.every(r => (r.especie_id || '__otra') === SRP.galeria.filtro.especie), document.getElementById('galeria-fichas').textContent, [...document.querySelectorAll('#galeria-jornada option')].length]")
    ok(g59['listas']==['Jornada','Quién registró','Especie','Programa','Alcaldía','Institución'] and 0<ge59[0]<g59['n'] and ge59[1] and ge59[2].startswith('Especie: '),
       'Fotografías tiene la misma zona, con jornada, especie, programa, alcaldía e institución; elegir una especie deja sus fotografías y su ficha: %s de %s' % (ge59[0], g59['n']))
    pg59.click('#galeria-quitar'); pg59.wait_for_timeout(1500)
    # Jornadas: programa, fichas y «Quitar filtros»
    pg59.evaluate("SRP.app.mostrarVista('jornadas')"); pg59.wait_for_timeout(2500)
    pg59.evaluate("document.getElementById('jornada-mas-filtros').open = true")
    tj59=pg59.evaluate("SRP.jornadas.lista.length")
    pr59=pg59.evaluate("[...document.querySelectorAll('#jornada-programa option')].map(o => o.value).filter(Boolean)")
    pg59.select_option('#jornada-programa', pr59[-1]); pg59.wait_for_timeout(2500)
    j59=pg59.evaluate("[SRP.jornadas.lista.length, SRP.jornadas.lista.every(j => j.dato.programa_id === SRP.jornadas.filtro.programa), document.getElementById('jornada-fichas').textContent, document.getElementById('jornada-quitar').hidden]")
    ok(len(pr59)>=2 and 0<j59[0]<tj59 and j59[1] and j59[2].startswith('Programa: ') and not j59[3],'Jornadas filtra por programa, con su ficha y «Quitar filtros»: %s de %s' % (j59[0], tj59))
    pg59.select_option('#jornada-revision','lista'); pg59.wait_for_timeout(2500)
    ok(pg59.locator('#jornada-fichas .ficha-filtro').count()==2 and 'Sin pendientes' in pg59.inner_text('#jornada-fichas'),'la revisión también tiene su ficha: %s' % pg59.inner_text('#jornada-fichas').replace(chr(10),' · '))
    pg59.click('#jornada-quitar'); pg59.wait_for_timeout(2500)
    ok(pg59.evaluate("SRP.jornadas.lista.length")==tj59 and pg59.input_value('#jornada-programa')=='' and pg59.input_value('#jornada-revision')=='' and pg59.is_hidden('#jornada-quitar'),'«Quitar filtros» de Jornadas vuelve a todas')
    # Supervisión: «Un periodo», «Más filtros:» y fichas
    pg59.evaluate("SRP.app.mostrarVista('supervision')"); pg59.wait_for_timeout(2500)
    abrir_sup(pg59)
    pg59.click('#sup-tipos .chip[data-tipo=todo]'); pg59.wait_for_timeout(1500)
    pg59.evaluate("document.getElementById('sup-filtros').open = true")
    al59=pg59.evaluate("[...document.querySelectorAll('#sup-alcaldia option')].map(o => o.value).filter(Boolean)[0]")
    pg59.select_option('#sup-alcaldia', al59); pg59.wait_for_timeout(1800)
    s59=pg59.evaluate("[document.querySelector('#sup-tipos .chip[data-tipo=rango]').textContent.trim(), document.getElementById('sup-filtros-texto').textContent, document.getElementById('sup-fichas').textContent, document.getElementById('btn-sup-quitar').hidden]")
    ok(s59[0]=='Un periodo' and s59[1]=='Más filtros: ' + al59 and s59[2]=='Alcaldía: ' + al59 and not s59[3],'Supervisión dice «Un periodo» y «Más filtros:», y lleva la ficha de lo elegido: %s' % s59)
    pg59.click('#sup-fichas button[data-quitar=alcaldia]'); pg59.wait_for_timeout(1500)
    ok(pg59.input_value('#sup-alcaldia')=='' and pg59.is_hidden('#btn-sup-quitar'),'la ficha de Supervisión quita su filtro')
    # Usuarios: perfil y tipo de institución, dependientes
    pg59.evaluate("SRP.app.mostrarVista('usuarios')"); pg59.wait_for_timeout(1200)
    esperar(pg59, "document.querySelectorAll('#vista-usuarios tbody tr').length > 0", 6000)   # la tabla se pinta cuando termina de leer
    tu59=pg59.locator('#vista-usuarios tbody tr').count()
    pg59.select_option('#usr-filtro-perfil','COORDINADOR'); pg59.wait_for_timeout(500)
    u1=pg59.evaluate("[document.querySelectorAll('#vista-usuarios tbody tr').length, [...document.querySelectorAll('#vista-usuarios tbody tr')].every(tr => tr.textContent.includes('Coordinador'))]")
    u2=pg59.evaluate("[[...document.querySelectorAll('#usr-filtro-org optgroup')].map(g => g.label), document.getElementById('usr-filtro-tipo') === null, [...document.querySelectorAll('#usr-filtro-org optgroup')].every(g => [...g.children].every(o => SRP.ref.catalogoPorId[o.value].tipo_organizacion === g.label))]")
    alc59=pg59.evaluate("(document.querySelector('#usr-filtro-org optgroup[label=Alcaldía] option') || {}).value || ''")
    pg59.select_option('#usr-filtro-org', alc59); pg59.wait_for_timeout(500)
    u3=pg59.locator('#vista-usuarios tbody tr').count()
    ok(0<u1[0]<tu59 and u1[1] and len(u2[0])>=2 and u2[1] and u2[2] and alc59 and u3<=u1[0],'Usuarios filtra por perfil y por institución; la lista de instituciones va agrupada por tipo, en un solo control: %s de %s, %s · %s' % (u1[0], tu59, u3, u2[0]))
    pg59.select_option('#usr-filtro-perfil',''); pg59.select_option('#usr-filtro-org',''); pg59.wait_for_timeout(300)
    # Sustituir un árbol plantado hoy: no hay otro día que elegir, y se dice
    pg59.evaluate("SRP.sesion.iniciar(SRP.ref.usuarioPorId['u-cabo-1'])"); pg59.reload(); pg59.wait_for_timeout(1800)
    if pg59.is_visible('#dlg-confirmar'): pg59.click('#btn-confirmar-si'); pg59.wait_for_timeout(300)
    pg59.evaluate("SRP.app.mostrarVista('registros')"); pg59.wait_for_timeout(1500)
    h59=pg59.evaluate("""async () => { const r = Object.assign({}, SRP.registros.visibles.find(x => x.estatus === 'activo' && !x.sustituido_por_id), { fecha_plantacion: SRP.util.fechaHoy() });
      await SRP.registros.sustituir(r); const f = document.getElementById('sustituir-fecha');
      return [f.disabled, f.value === SRP.util.fechaHoy(), document.getElementById('btn-sustituir-hoy').hidden, document.getElementById('sustituir-fecha-ayuda').textContent]; }""")
    ok(h59[:3]==[False, True, False] and 'sólo puede ser de hoy' in h59[3],'al sustituir un árbol plantado hoy, la fecha es hoy, el campo y «Hoy» siguen a la mano y se dice por qué no hay otro día: %s' % h59[3])
    pg59.click('#btn-sustituir-cerrar')
    ok(not err59,'sin errores en consola: %s' % err59[:2])
    ctx59.close()

    # ---------- BLOQUE 142: COLONIAS PRIORITARIAS PARA REFORESTAR ----------
    ctx60=b.new_context(viewport={'width':390,'height':844}, geolocation={'latitude':19.357,'longitude':-99.06,'accuracy':5}, permissions=['geolocation'], timezone_id='America/Mexico_City', accept_downloads=True)
    pg60=ctx60.new_page(); err60=[]
    pg60.on('pageerror', lambda e: err60.append(str(e))); pg60.on('console', lambda m: m.type=='error' and 'net::' not in m.text and 'Failed to load' not in m.text and err60.append(m.text))
    pg60.goto(BASE); pg60.wait_for_timeout(1300)
    pg60.select_option('#sel-usuario-prueba','u-cabo-1'); pg60.click('#btn-entrar-prueba'); pg60.wait_for_timeout(800)
    c60=pg60.evaluate("""() => { const c = SRP.CAPAS.prioritarias, P = SRP.prioritarias; const f = c.geojson.features;
      return { n: f.length, props: [...new Set(f.flatMap(x => Object.keys(x.properties)))].sort(), niveles: [...new Set(f.map(x => x.properties.prioridad))].sort(), version: c.meta.version,
        dentro: P.de(19.4728, -99.1560), fuera: P.de(19.10, -99.30), textos: P.NIVELES.map(x => x[1]) }; }""")
    ok(c60['n']==2243 and c60['props']==['alcaldia','colonia','id','prioridad'] and c60['niveles']==[0,1,2,3,4] and c60['version']=='priorizacion-2026-10-01',
       'la capa de colonias prioritarias trae 2,243 colonias y sólo colonia, alcaldía y prioridad (sin marginación, población ni pobreza): %s' % c60['props'])
    ok(c60['dentro'] and c60['dentro']['colonia']=='Aguilera' and c60['dentro']['texto']=='Media' and c60['fuera'] is None and c60['textos']==['Muy alta','Alta','Media','Baja','Muy baja'],
       'un punto dice la prioridad de su colonia, y fuera de la capa queda sin dato: %s' % c60['dentro'])
    iniciar_jornada(pg60, 'Prioritarias B142')
    pg60.click('#btn-ubicacion'); pg60.wait_for_timeout(1500)
    # En campo la capa arranca apagada; encendida, pinta sólo la colonia de la jornada
    ap60=pg60.evaluate("[document.querySelectorAll('#mapa path.pri-colonia').length, document.getElementById('mapa-prioritarias').hidden, document.querySelector('#mapa .pri-capas-boton').dataset.activa, document.getElementById('dato-prioridad').textContent]")
    ok(ap60==[0, True, 'false', 'Alta · Vicente Guerrero'],'en Nuevo registro la capa de prioridad arranca apagada, sin colonias ni leyenda; la prioridad del punto se sigue diciendo: %s' % ap60)
    pg60.evaluate("SRP.prioritarias.alternar()"); pg60.wait_for_timeout(500)
    f60=pg60.evaluate("""() => { const c = document.querySelector('#mapa .pri-capas'); const b = c.querySelector('.pri-capas-boton'); const r = b.getBoundingClientRect(), m = document.getElementById('mapa').getBoundingClientRect();
      return { sobre: r.top >= m.top && r.bottom <= m.bottom && r.right <= m.right && r.left >= m.left, tam: [Math.round(r.width), Math.round(r.height)], cerrado: c.querySelector('.pri-capas-panel').hidden && b.getAttribute('aria-expanded') === 'false',
      leyenda: [...document.querySelectorAll('#mapa-prioritarias .pri-leyenda span:not(.pri-leyenda-titulo)')].map(s => s.textContent), sinBoton: !document.querySelector('#mapa-prioritarias button'),
      trazos: document.querySelectorAll('#mapa path.pri-colonia').length, dato: document.getElementById('dato-prioridad').textContent,
      debajo: Number(getComputedStyle(document.querySelector('#mapa .pane-prioritarias')).zIndex) < Number(getComputedStyle(document.querySelector('#mapa .leaflet-marker-pane')).zIndex),
      color: [0, 1, 2, 3, 4].map(n => { const i = document.createElement('i'); i.className = 'pri-muestra pri-nivel-' + n; document.body.appendChild(i); const c = getComputedStyle(i).backgroundColor; i.remove(); return c; }) }; }""")
    ok(f60['leyenda']==['Alta'] and f60['trazos']==1 and f60['debajo'] and f60['color']==['rgb(249, 231, 191)','rgb(244, 197, 110)','rgb(232, 138, 46)','rgb(194, 66, 27)','rgb(127, 29, 18)'],
       'al encenderla, el mapa pinta sólo la colonia de la jornada, debajo del marcador, la leyenda dice sólo su nivel y la paleta es la del modelo (crema a rojo oscuro): %s' % f60['leyenda'])
    ok(f60['sobre'] and f60['tam'][0]>=44 and f60['tam'][1]>=44 and f60['cerrado'] and f60['sinBoton'],'el control de la capa va sobre el mapa, en un botón de buen tamaño que arranca cerrado; bajo el mapa queda sólo la leyenda (D209): %s' % f60['tam'])
    ok(f60['dato']=='Alta · Vicente Guerrero','al colocar el punto se dice la prioridad de reforestación de su colonia: %s' % f60['dato'])
    # El panel: interruptor, cinco niveles y opacidad; usarlo no mueve el punto del árbol
    p60=pg60.evaluate("[SRP.mapa.lat, SRP.mapa.lng]")
    pg60.click('#mapa .pri-capas-boton'); pg60.wait_for_timeout(250)
    # El panel cabe entero dentro del mapa, también en el teléfono más chico: la opacidad queda a la vista sin desplazar
    def cabe60():
        return pg60.evaluate("""() => { const m = document.getElementById('mapa').getBoundingClientRect(), p = document.querySelector('#mapa .pri-capas-panel'), q = p.getBoundingClientRect(), o = p.querySelector('[data-pri=opacidad]').getBoundingClientRect();
          return q.top >= m.top && q.bottom <= m.bottom && q.left >= m.left && q.right <= m.right && p.scrollHeight <= p.clientHeight + 1 && o.bottom <= m.bottom; }""")
    c60a=cabe60()
    pg60.set_viewport_size({'width':320,'height':568}); pg60.wait_for_timeout(500)
    pg60.click('#mapa .pri-capas-boton'); pg60.wait_for_timeout(150); pg60.click('#mapa .pri-capas-boton'); pg60.wait_for_timeout(250)
    c60b=cabe60()
    pg60.set_viewport_size({'width':390,'height':844}); pg60.wait_for_timeout(400)
    ok(c60a and c60b,'el panel de la capa cabe entero dentro del mapa en teléfono (390 y 320 de ancho): niveles y opacidad a la vista: %s' % [c60a, c60b])
    pn60=pg60.evaluate("""() => { const c = document.querySelector('#mapa .pri-capas'); return { abierto: !c.querySelector('.pri-capas-panel').hidden, ver: c.querySelector('[data-pri=ver]').checked,
      niveles: [...c.querySelectorAll('[data-pri=nivel]')].map(x => [x.closest('label').textContent.trim(), x.checked]), opacidad: c.querySelector('[data-pri=opacidad]').value, texto: c.querySelector('output').textContent,
      real: getComputedStyle(document.querySelector('#mapa .pane-prioritarias')).opacity }; }""")
    ok(pn60['abierto'] and pn60['ver'] and pn60['niveles']==[['Muy alta',True],['Alta',True],['Media',True],['Baja',True],['Muy baja',True]] and pn60['opacidad']=='45' and pn60['texto']=='45 %' and pn60['real']=='0.45',
       'el panel trae el interruptor de la capa, los cinco niveles con su muestra y la opacidad (45 %% de inicio): %s' % pn60['niveles'])
    pg60.click('#mapa .pri-capas-panel input[data-pri=nivel][value="3"]'); pg60.wait_for_timeout(250)
    n60=pg60.evaluate("[[...document.querySelectorAll('#mapa path.pri-nivel-3')].filter(p => getComputedStyle(p).display !== 'none').length, [...document.querySelectorAll('#mapa path.pri-nivel-4')].filter(p => getComputedStyle(p).display !== 'none').length > 0, [...document.querySelectorAll('#mapa-prioritarias .pri-leyenda span:not(.pri-leyenda-titulo)')].map(s => s.textContent)]")
    ok([n60[0], n60[2]]==[0, []],'apagar el nivel de la colonia lo quita del mapa y de la leyenda: %s' % n60[2])
    pg60.evaluate("(() => { const r = document.querySelector('#mapa input[data-pri=opacidad]'); r.value = 80; r.dispatchEvent(new Event('input', { bubbles: true })); })()"); pg60.wait_for_timeout(250)
    o60=pg60.evaluate("[getComputedStyle(document.querySelector('#mapa .pane-prioritarias')).opacity, document.querySelector('#mapa .pri-capas output').textContent, JSON.parse(localStorage.getItem('srp_capa_prioritarias_2')).campo.opacidad, JSON.parse(localStorage.getItem('srp_capa_prioritarias_2')).campo.niveles['3']]")
    ok(o60==['0.8','80 %',0.8,False] and pg60.evaluate("[SRP.mapa.lat, SRP.mapa.lng]")==p60,'la opacidad se regula con su barra y lo elegido se recuerda; usar el control no mueve el punto del árbol: %s' % o60)
    pg60.click('#mapa .pri-capas-panel input[data-pri=ver]'); pg60.wait_for_timeout(300)
    a60=pg60.evaluate("[document.querySelectorAll('#mapa path.pri-colonia').length, document.getElementById('mapa-prioritarias').hidden, document.querySelector('#mapa [data-pri=nivel]').disabled, JSON.parse(localStorage.getItem('srp_capa_prioritarias_2')).campo.ver]")
    ok(a60==[0, True, True, False],'el interruptor apaga la capa entera, con su leyenda: %s' % a60)
    pg60.click('#mapa .pri-capas-panel input[data-pri=ver]'); pg60.click('#mapa .pri-capas-panel input[data-pri=nivel][value="3"]'); pg60.wait_for_timeout(200)
    pg60.keyboard.press('Escape'); pg60.wait_for_timeout(150)
    ok(pg60.evaluate("document.querySelector('#mapa .pri-capas-panel').hidden"),'Escape cierra el panel')
    pg60.fill('#campo-especie','ahuehu'); pg60.wait_for_timeout(200); pg60.dispatch_event('.combo-opcion[data-id="ESP-0070"]','mousedown'); pg60.wait_for_timeout(150)
    pg60.click('#form-plantacion button[type=submit]'); pg60.wait_for_timeout(800)
    if pg60.is_visible('#dlg-resumen'): pg60.click('#btn-resumen-guardar'); pg60.wait_for_timeout(700)
    g60=pg60.evaluate("async () => { const r = await SRP.almacen.uno('plantaciones', SRP.formulario.estado.ultimoGuardado); return [!!r, Object.keys(r).filter(k => /priorid/.test(k))]; }")
    ok(g60==[True, []],'la prioridad es referencia: el registro guardado no lleva ningún campo de prioridad')
    j60=pg60.evaluate("SRP.activa.jornada.id")
    pg60.evaluate("async (id) => { SRP.app.mostrarVista('jornadas'); await SRP.jornadas.abrir(id); }", j60); pg60.wait_for_timeout(1800)
    jf60=pg60.evaluate("[document.getElementById('jornada-prioridad').textContent, !!document.querySelector('#jornada-mapa .pri-capas-boton') && getComputedStyle(document.querySelector('#jornada-mapa .pane-prioritarias')).opacity === '0.8', document.querySelectorAll('#jornada-mapa path.pri-colonia').length]")
    ok(jf60[0]=='Colonias prioritarias: 1 en prioridad alta.' and jf60[1] and jf60[2]==1,'la ficha de la jornada dice en qué prioridad cayeron sus árboles y su mapa pinta sólo su colonia, con el mismo control y la opacidad elegida: %s' % jf60[0])
    # Supervisión: árboles por nivel de prioridad, en pantalla, en el informe y en la tabla
    pg60.evaluate("SRP.sesion.iniciar(SRP.ref.usuarioPorId['u-admin-1'])"); pg60.reload(); pg60.wait_for_timeout(1500)
    pg60.evaluate("async () => { await SRP.demo.cargar(); }"); pg60.wait_for_timeout(500)
    pg60.evaluate("SRP.app.mostrarVista('supervision')"); pg60.wait_for_timeout(2500)
    abrir_sup(pg60)
    pg60.click('#sup-tipos .chip[data-tipo=anio]'); pg60.wait_for_timeout(2500)
    s60=pg60.evaluate("""() => { const m = SRP.supervision.modelo, p = m.prioridad; const sec = document.querySelector('details[data-seccion=prioridad]');
      return { suma: p.niveles.reduce((s, x) => s + x.n, 0) + p.sin, arboles: m.cifras.arboles, altas: p.altas === p.niveles.filter(x => x.prioridad >= 3).reduce((s, x) => s + x.n, 0), filas: [...sec.querySelectorAll('tbody tr td:first-child')].map(td => td.textContent.trim()),
        lema: sec.querySelector('.sup-prioridad-lema').textContent, mapa: sec.querySelectorAll('#sup-mapa-prioridad path.pri-colonia').length, col: Object.keys(p.colonias).length, nota: sec.querySelector('#sup-prioridad-colonias').textContent,
        ctl: [!!sec.querySelector('#sup-mapa-prioridad .pri-capas-boton'), !sec.querySelector('#sup-mapa-prioridad [data-pri=ver]'), sec.querySelectorAll('#sup-mapa-prioridad [data-pri=nivel]').length, getComputedStyle(sec.querySelector('#sup-mapa-prioridad .pane-prioritarias')).opacity], csv: SRP.informes.texto(m).split('\\r\\n')[0].includes('"Prioridad de reforestación de la colonia"'),
        det: ['Muy alta','Alta','Media','Baja','Muy baja','Sin dato'].includes(m.detalle[0].prioridad) }; }""")
    ok(s60['suma']==s60['arboles']>0 and s60['altas'] and s60['filas'][:5]==['Muy alta','Alta','Media','Baja','Muy baja'] and 'en colonias de prioridad alta o muy alta' in s60['lema'] and 0 < s60['mapa'] == s60['col'] < 2243 and 'donde se plantó' in s60['nota'],
       'Supervisión cuenta los árboles por prioridad de su colonia (suman el total) y pinta sólo las colonias donde se plantó: %s · %s de 2243 colonias' % (s60['lema'], s60['mapa']))
    ok(s60['csv'] and s60['det'],'la tabla para Excel trae la prioridad de la colonia de cada árbol')
    ok(s60['ctl']==[True, True, 5, '0.9'],'el mapa de Supervisión lleva el control de niveles y opacidad, sin interruptor (ahí la capa es el mapa) y con su propia opacidad: %s' % s60['ctl'])
    with pg60.expect_download() as d60: pg60.click('#btn-sup-pdf')
    d60.value.save_as(sal('informe_prioridad.pdf'))
    from pypdf import PdfReader as _Pdf60
    t60=' '.join(' '.join((p.extract_text() or '') for p in _Pdf60(sal('informe_prioridad.pdf')).pages).split())
    ok('POR PRIORIDAD DE LA COLONIA' in t60 and 'Alta y muy alta' in t60,'el informe en PDF trae el apartado «Por prioridad de la colonia»')
    ok(not err60,'sin errores en consola: %s' % err60[:2])
    ctx60.close()

    # ---------- BLOQUE 143: LA PRIORIDAD EN LA JORNADA Y EN TODOS LOS INFORMES ----------
    ctx61=b.new_context(viewport={'width':390,'height':844}, geolocation={'latitude':19.357,'longitude':-99.06,'accuracy':5}, permissions=['geolocation'], timezone_id='America/Mexico_City', accept_downloads=True)
    pg61=ctx61.new_page(); err61=[]
    pg61.on('pageerror', lambda e: err61.append(str(e))); pg61.on('console', lambda m: m.type=='error' and 'net::' not in m.text and 'Failed to load' not in m.text and err61.append(m.text))
    pg61.goto(BASE); pg61.wait_for_timeout(1300)
    pg61.select_option('#sel-usuario-prueba','u-cabo-1'); pg61.click('#btn-entrar-prueba'); pg61.wait_for_timeout(800)
    # Al iniciar la jornada: detectar la ubicación dice la prioridad de la colonia
    pg61.evaluate("SRP.app.mostrarVista('registrar')"); pg61.wait_for_timeout(500)
    i0=pg61.inner_text('#ini-prioridad')
    pg61.click('#btn-ini-detectar'); pg61.wait_for_timeout(1200)
    i1=pg61.inner_text('#ini-prioridad')
    ok(i0=='—' and i1=='Alta · Vicente Guerrero','al iniciar la jornada, detectar la ubicación dice la prioridad de reforestación de la colonia: %s' % i1)
    pg61.fill('#ini-nombre','Prioridad B143'); pg61.fill('#ini-fecha', HOY); pg61.select_option('#ini-programa','p-refor'); pg61.select_option('#ini-origen','PROGRAMADA'); pg61.fill('#ini-meta','10'); pg61.click('#btn-iniciar-jornada'); pg61.wait_for_timeout(700)
    j61=pg61.evaluate("SRP.activa.jornada.id")
    fr0=pg61.text_content('#franja-jornada-texto')
    ok('prioridad alta' in fr0,'la franja de la jornada activa dice su prioridad desde antes del primer árbol (la de su ubicación): %s' % fr0.replace(chr(10),' · '))
    registrar(pg61,'ahuehu','ESP-0070'); registrar(pg61,'aile','ESP-0002')
    # Un árbol en otra colonia, de prioridad distinta: la jornada toma la de la mayoría
    otro61=pg61.evaluate("""async () => { const f = SRP.CAPAS.prioritarias.geojson.features.find(x => x.properties.prioridad === 1); const a = f.geometry.coordinates[0][0]; const lng = (a[0][0] + a[1][0] + a[2][0]) / 3, lat = (a[0][1] + a[1][1] + a[2][1]) / 3;
      const base = await SRP.almacen.uno('plantaciones', SRP.formulario.estado.ultimoGuardado); const p = SRP.prioritarias.de(lat, lng);
      await SRP.almacen.guardarConBitacora('plantaciones', Object.assign({}, base, { id: 'b143-otro', lat, lng, folio: null }), null); return p && p.texto; }""")
    pg61.evaluate("async () => { await SRP.activa.cambiarEstatus(SRP.activa.jornada, 'cerrada'); SRP.activa.jornada = null; }"); pg61.wait_for_timeout(400)
    pg61.evaluate("SRP.app.mostrarVista('jornadas')"); pg61.wait_for_timeout(1500)
    t61=pg61.evaluate("id => { const li = document.querySelector('#lista-jornadas li[data-clave=\"' + id + '\"]'); const p = li.querySelector('.jornada-prioridad'); return [p.textContent.trim(), !!p.querySelector('.pri-muestra.pri-nivel-3')]; }", j61)
    ok(otro61 and t61==['Colonia de prioridad alta (2 de 3 árboles)', True],'la tarjeta de la jornada marca su prioridad —la de la mayoría de sus árboles— con su muestra de color: %s' % t61[0])
    ok(pg61.locator('#jornada-filtro-prioridad').count()==0,'la prioridad se lee en la tarjeta; ya no es un filtro de Jornadas')
    pg61.evaluate("async (id) => { await SRP.jornadas.abrir(id); }", j61); pg61.wait_for_timeout(1500)
    esperar(pg61, "document.querySelectorAll('#jornada-lista .punto-prioridad').length === 3 && /prioridad/.test(document.getElementById('jornada-sub').textContent)", 6000)   # la lista se pinta por partes
    fi61=pg61.evaluate("[document.getElementById('jornada-sub').textContent, document.getElementById('jornada-prioridad').textContent, [...document.querySelectorAll('#jornada-lista .punto-prioridad')].map(x => x.textContent.trim())]")
    ok('prioridad alta (2 de 3 árboles)' in fi61[0] and fi61[1]=='Colonias prioritarias: 2 en prioridad alta y 1 en baja.' and sorted(fi61[2])==['Colonia de prioridad alta','Colonia de prioridad alta','Colonia de prioridad baja'],
       'la ficha dice la prioridad de la jornada, el desglose y la de cada punto: %s' % fi61[1])
    # El reporte de la jornada: prioridad, desglose y columna por árbol
    rep61=pg61.evaluate("""async (id) => { const j = await SRP.almacen.uno('jornadas', id); const regs = await SRP.activa.registrosDe(j); const m = SRP.reportes.modelo(regs, j, j.fecha, j);
      const de = k => (m.identificacion.find(x => x[0] === k) || [])[1]; const c = m.ejemplares.cabecera.indexOf('Prioridad');
      return [de('Prioridad de reforestación'), de('Árboles por prioridad de la colonia'), c, m.ejemplares.filas.map(f => f[c]), m.notaPrecision.includes('modelo de priorización')]; }""", j61)
    ok(rep61[0]=='Alta (2 de 3 árboles)' and rep61[1]=='2 en prioridad alta y 1 en baja' and rep61[2]==4 and sorted(rep61[3])==['Alta','Alta','Baja'] and rep61[4],
       'el reporte de la jornada lleva su prioridad, el desglose por nivel y la prioridad de cada árbol: %s' % rep61[:2])
    reporte_de(pg61, 'Prioridad B143')
    pg61.click('#btn-cierre-previa') if pg61.locator('#btn-cierre-previa').count() else pg61.click('#form-cierre button[type=submit]')
    pg61.wait_for_timeout(1500)
    pv61=pg61.inner_text('#previa-hoja') if pg61.is_visible('#previa-hoja') else ''
    ok('Prioridad de reforestación' in pv61 and 'Alta (2 de 3 árboles)' in pv61 and 'Árboles por prioridad de la colonia' in pv61,'la vista previa del reporte lo muestra')
    if pg61.is_visible('#dlg-previa'):
        with pg61.expect_download() as d61: pg61.click('#btn-previa-generar')
        d61.value.save_as(sal('reporte_prioridad.pdf'))
        from pypdf import PdfReader as _Pdf61
        tx61=' '.join(' '.join((p.extract_text() or '') for p in _Pdf61(sal('reporte_prioridad.pdf')).pages).split())
        ok('Prioridad de reforestación' in tx61 and 'Alta (2 de 3 árboles)' in tx61 and 'Prioridad' in tx61.split('Ejemplares plantados'.upper())[-1],'y el PDF del reporte también: prioridad de la jornada y columna «Prioridad»')
    pg61.wait_for_timeout(800)
    pg61.evaluate("SRP.app.mostrarVista('jornadas')"); pg61.wait_for_timeout(1500)
    # Informe de Supervisión: la tabla de jornadas trae su prioridad
    sp61=pg61.evaluate("""async (id) => { const I = SRP.indicadores, d = await I.cargar(); const m = I.calcular(d, I.periodo('todo'), {}); const j = m.jornadas.find(x => x.id === id); return j && j.prioridad; }""", j61)
    ok(sp61=='Alta','el informe de Supervisión lleva la prioridad de cada jornada: %s' % sp61)
    ok(not err61,'sin errores en consola: %s' % err61[:2])
    ctx61.close()

    # ---------- ctx62: origen de la jornada: programada o pedido especial de otra instancia ----------
    ctx62=b.new_context(viewport={'width':390,'height':844}, geolocation={'latitude':19.357,'longitude':-99.06,'accuracy':5}, permissions=['geolocation'], timezone_id='America/Mexico_City', accept_downloads=True)
    pg62=ctx62.new_page(); err62=[]
    pg62.on('pageerror', lambda e: err62.append(str(e))); pg62.on('console', lambda m: m.type=='error' and 'net::' not in m.text and 'Failed to load' not in m.text and err62.append(m.text))
    pg62.goto(BASE); pg62.wait_for_timeout(1300)
    pg62.select_option('#sel-usuario-prueba','u-cabo-1'); pg62.click('#btn-entrar-prueba'); pg62.wait_for_timeout(800)
    # El origen se elige a propósito: sin él la jornada no inicia
    pg62.evaluate("SRP.app.mostrarVista('registrar')"); pg62.wait_for_timeout(500)
    a62=pg62.evaluate("[document.getElementById('ini-origen').value, document.getElementById('ini-pedido').hidden, [...document.getElementById('ini-origen').options].map(o => o.textContent)]")
    ok(a62==['', True, ['Seleccione el origen','Programada','Pedido especial']],'al iniciar una jornada el origen está sin elegir y los datos del pedido no se piden: %s' % a62)
    pg62.fill('#ini-nombre','Sin origen B157'); pg62.fill('#ini-fecha', HOY); pg62.fill('#ini-meta','10')
    pg62.evaluate("document.getElementById('ini-programa').value = 'p-refor'"); pg62.click('#btn-iniciar-jornada'); pg62.wait_for_timeout(400)
    so62=pg62.evaluate("[!!SRP.activa.jornada, document.getElementById('ini-errores').textContent, (document.getElementById('ini-origen-error') || {}).textContent || '', document.getElementById('ini-origen').getAttribute('aria-invalid'), !!document.querySelector('label[for=ini-origen] .obligatorio')]")
    ok(so62[0] is False and 'Falta corregir 1 dato' in so62[1] and 'Elija el origen de la jornada' in so62[2] and so62[3]=='true' and so62[4],'sin origen la jornada no inicia: el campo lo dice, con asterisco de obligatorio: %s' % so62)
    jp62=iniciar_jornada(pg62,'Programada B146')
    g62=pg62.evaluate("async id => { const j = await SRP.almacen.uno('jornadas', id); return [j.origen, j.solicitante_id, j.solicitante_otro, j.pedido_descripcion]; }", jp62)
    ok(g62==['PROGRAMADA', None, '', ''] and 'Pedido' not in pg62.text_content('#franja-jornada-texto'),'la jornada programada se guarda con origen PROGRAMADA y sin datos de pedido: %s' % g62)
    registrar(pg62,'ahuehu','ESP-0070')
    pg62.evaluate("async () => { await SRP.activa.cambiarEstatus(SRP.activa.jornada, 'cerrada'); SRP.activa.jornada = null; await SRP.activa.preparar(); }"); pg62.wait_for_timeout(500)
    # Un pedido especial: pide quién lo solicita
    pg62.evaluate("SRP.app.mostrarVista('registrar')"); pg62.wait_for_timeout(500)
    pg62.fill('#ini-nombre','Pedido B146'); pg62.fill('#ini-fecha', HOY); pg62.select_option('#ini-programa','p-refor'); pg62.select_option('#ini-origen','PROGRAMADA'); pg62.fill('#ini-meta','10')
    pg62.select_option('#ini-origen','PEDIDO'); pg62.wait_for_timeout(150)
    b62=pg62.evaluate("[document.getElementById('ini-pedido').hidden, document.getElementById('caja-ini-solicitante-otro').hidden, [...document.getElementById('ini-solicitante').options].some(o => o.value === 's-sobse'), [...document.getElementById('ini-solicitante').options].pop().textContent, !!document.getElementById('ini-oficio'), [...document.querySelectorAll('#ini-solicitante optgroup')].map(g => g.label), [...document.getElementById('ini-solicitante').options].some(o => /^o-/.test(o.value))]")
    ok(b62==[False, True, True, 'Otra instancia', False, ['Dependencia de gobierno','Alcaldía','Congreso'], False] and pg62.evaluate("document.querySelector('#ini-solicitante optgroup option').textContent") == 'Oficina de la Secretaría','con «Pedido especial» aparecen quién lo solicita (los solicitantes del catálogo, agrupados por tipo, y «Otra instancia») y la descripción; no se pide oficio ni folio: %s' % b62)
    pg62.click('#btn-iniciar-jornada'); pg62.wait_for_timeout(400)
    e62=pg62.inner_text('#ini-errores') if pg62.is_visible('#ini-errores') else ''
    ok('Elija quién solicita el pedido especial' in e62 and pg62.is_visible('#panel-iniciar-jornada'),'sin solicitante el pedido especial no se inicia: %s' % e62.replace(chr(10),' · '))
    pg62.select_option('#ini-solicitante','__otra'); pg62.wait_for_timeout(150)
    pg62.click('#btn-iniciar-jornada'); pg62.wait_for_timeout(400)
    e62b=pg62.inner_text('#ini-errores') if pg62.is_visible('#ini-errores') else ''
    ok('Escriba el nombre de la instancia' in e62b and pg62.is_visible('#caja-ini-solicitante-otro'),'«Otra instancia» pide su nombre: %s' % e62b.replace(chr(10),' · '))
    pg62.select_option('#ini-solicitante','s-sobse'); pg62.click('#btn-iniciar-jornada'); pg62.wait_for_timeout(400)
    e62c=pg62.inner_text('#ini-errores') if pg62.is_visible('#ini-errores') else ''
    ok('Escriba de qué se trata el pedido especial' in e62c and pg62.is_visible('#panel-iniciar-jornada') and 'opcional' not in pg62.inner_text('label[for=ini-pedido-descripcion]'),'la descripción del pedido especial es obligatoria: %s' % e62c.replace(chr(10),' · '))
    pg62.fill('#ini-pedido-descripcion','Compensación por obra'); pg62.click('#btn-iniciar-jornada'); pg62.wait_for_timeout(700)
    j62=pg62.evaluate("SRP.activa.jornada && SRP.activa.jornada.id")
    h62=pg62.evaluate("async id => { const j = await SRP.almacen.uno('jornadas', id); return [j.origen, j.solicitante_id, j.solicitante_otro, j.pedido_descripcion, j.organizacion_id]; }", j62)
    fr62=pg62.text_content('#franja-jornada-texto')
    ok(h62==['PEDIDO','s-sobse','','Compensación por obra','o-sedema'] and 'Pedido especial · Solicita: Secretaría de Obras y Servicios (SOBSE)' in fr62,'el pedido especial se guarda con su solicitante, que no es quien ejecuta, y la franja lo dice: %s' % h62)
    registrar(pg62,'ahuehu','ESP-0070'); registrar(pg62,'aile','ESP-0002')
    pg62.evaluate("async () => { await SRP.activa.cambiarEstatus(SRP.activa.jornada, 'cerrada'); SRP.activa.jornada = null; }"); pg62.wait_for_timeout(400)
    # Jornadas: la marca en la tarjeta y el filtro «Origen»
    pg62.evaluate("SRP.app.mostrarVista('jornadas')"); pg62.wait_for_timeout(1500)
    c62=pg62.evaluate("""([p, n]) => { const t = id => { const m = document.querySelector('#lista-jornadas li[data-clave="' + id + '"] .jornada-pedido'); return m ? m.textContent.trim() : ''; };
      return [t(p), t(n), [...document.getElementById('jornada-origen').options].map(o => o.textContent)]; }""", [j62, jp62])
    ok(c62[0]=='Pedido especial · Solicita: Secretaría de Obras y Servicios (SOBSE)' and c62[1]=='' and c62[2]==['Todos','Programada','Pedido especial (todos)','Pedido especial · Secretaría de Obras y Servicios (SOBSE)'],
       'la tarjeta de la jornada marca el pedido especial y la lista «Origen» trae programada, todos los pedidos y cada solicitante: %s' % c62[2])
    pg62.evaluate("document.getElementById('jornada-mas-filtros').open = true")
    pg62.select_option('#jornada-origen','PEDIDO:s-sobse'); pg62.wait_for_timeout(900)
    d62=pg62.evaluate("([p, n]) => [SRP.jornadas.lista.some(j => j.id === p), SRP.jornadas.lista.some(j => j.id === n), document.getElementById('jornada-fichas').textContent]", [j62, jp62])
    pg62.select_option('#jornada-origen','PROGRAMADA'); pg62.wait_for_timeout(900)
    d62b=pg62.evaluate("([p, n]) => [SRP.jornadas.lista.some(j => j.id === p), SRP.jornadas.lista.some(j => j.id === n)]", [j62, jp62])
    ok(d62[0] and not d62[1] and 'Origen: Pedido especial · Secretaría de Obras' in d62[2] and d62b==[False, True],'Jornadas se filtra por origen y por solicitante, con su ficha: %s' % d62[2])
    pg62.click('#jornada-quitar'); pg62.wait_for_timeout(800)
    # La ficha lo dice y «Editar jornada» lo corrige
    pg62.evaluate("async (id) => { await SRP.jornadas.abrir(id); }", j62); pg62.wait_for_timeout(1200)
    s62=pg62.inner_text('#jornada-sub')
    ok('pedido especial de Secretaría de Obras y Servicios (SOBSE) (Compensación por obra)' in s62,'la ficha de la jornada dice de quién es el pedido y de qué se trata')
    pg62.click('#btn-jornada-editar'); pg62.wait_for_timeout(400)
    f62=pg62.evaluate("[document.getElementById('ej-origen').value, document.getElementById('ej-solicitante').value, document.getElementById('ej-pedido-descripcion').value]")
    pg62.select_option('#ej-solicitante','__otra'); pg62.fill('#ej-solicitante-otro','Metro'); pg62.click('#btn-ej-guardar'); pg62.wait_for_timeout(900)
    k62=pg62.evaluate("""async id => { const j = await SRP.almacen.uno('jornadas', id); const b = (await SRP.almacen.todos('bitacora')).filter(x => x.entidad_id === id && x.accion === 'EDITADO' && /^Campos/.test(x.detalle || '')).pop();
      return [j.origen, j.solicitante_id, j.solicitante_otro, b && b.detalle, SRP.pedido.texto(j)]; }""", j62)
    ok(f62==['PEDIDO','s-sobse','Compensación por obra'] and k62[:3]==['PEDIDO', None, 'Metro'] and 'solicitante_id' in (k62[3] or '') and k62[4]=='Pedido especial · Solicita: Metro','«Editar jornada» trae el pedido y lo corrige a una instancia fuera del catálogo; queda en la bitácora: %s' % k62[3])
    # El reporte de la jornada
    r62=pg62.evaluate("""async ([p, n]) => { const de = async id => { const j = await SRP.almacen.uno('jornadas', id); const regs = await SRP.activa.registrosDe(j); const m = SRP.reportes.modelo(regs, j, j.fecha, j);
      const v = k => (m.identificacion.find(x => x[0] === k) || [])[1]; return [v('Pedido especial solicitado por'), v('Descripción del pedido')]; }; return [await de(p), await de(n)]; }""", [j62, jp62])
    ok(r62==[['Metro','Compensación por obra'],[None,None]],'el reporte de la jornada dice quién solicitó el pedido y su descripción; en una programada no aparece: %s' % r62)
    # Indicadores: pedidos especiales del periodo, filtro por origen y columnas del CSV
    i62=pg62.evaluate("""async id => { const I = SRP.indicadores, d = await I.cargar(); const m = I.calcular(d, I.periodo('todo'), {}); const f = I.calcular(d, I.periodo('todo'), { origen: 'PEDIDO' }); const g = I.calcular(d, I.periodo('todo'), { origen: 'PROGRAMADA' });
      const csv = SRP.informes.texto(f).split('\\r\\n'); const j = m.jornadas.find(x => x.id === id);
      return [m.cifras.jornadas, m.cifras.arboles, m.pedidos.jornadas, m.pedidos.arboles, m.pedidos.solicitantes.map(x => [x.solicitante, x.jornadas, x.arboles]), f.cifras.jornadas, f.cifras.arboles, g.cifras.jornadas, g.cifras.arboles, g.pedidos.jornadas,
        csv[0].includes('"Origen de la jornada","Solicitante del pedido especial","Descripción del pedido"'), csv[1].endsWith('"Pedido especial","Metro","Compensación por obra"'), j && j.solicitante]; }""", j62)
    ok(i62[:4]==[2,3,1,2] and i62[4]==[['Metro',1,2]] and i62[5:10]==[1,2,1,1,0] and i62[10] and i62[11] and i62[12]=='Metro','los indicadores cuentan los pedidos especiales por solicitante, se filtran por origen y el CSV lleva origen, solicitante y descripción: %s' % i62[:10])
    pg62.evaluate("SRP.app.mostrarVista('supervision')"); pg62.wait_for_timeout(1500)
    abrir_sup(pg62)
    pg62.evaluate("() => { SRP.supervision.periodo = SRP.indicadores.periodo('todo'); SRP.supervision.pintar(); }"); pg62.wait_for_timeout(900)
    u62=pg62.evaluate("[(document.getElementById('sup-t-pedidos') || {}).textContent || '', (document.querySelector('.sup-pedidos-lema') || {}).textContent || '', [...document.getElementById('sup-origen').options].map(o => o.value)]")
    ok(u62[0]=='' and u62[2]==['','PROGRAMADA','PEDIDO','PEDIDO:otra:Metro'],'«Mi avance» del cabo no trae el apartado «Pedidos especiales», pero sí el filtro «Origen»: %s' % u62[2])
    # Quien supervisa sí lo ve
    def como62(uid):
        pg62.evaluate("id => SRP.sesion.iniciar(SRP.ref.usuarioPorId[id])", uid); pg62.reload(); pg62.wait_for_timeout(1800)
        pg62.evaluate("SRP.app.mostrarVista('supervision')"); pg62.wait_for_timeout(1500)
        abrir_sup(pg62)
        pg62.evaluate("() => { SRP.supervision.periodo = SRP.indicadores.periodo('todo'); SRP.supervision.pintar(); }"); pg62.wait_for_timeout(900)
    como62('u-coord-1')
    u62=pg62.evaluate("[(document.getElementById('sup-t-pedidos') || {}).textContent || '', (document.querySelector('.sup-pedidos-lema') || {}).textContent || '', [...document.getElementById('sup-origen').options].map(o => o.value)]")
    ok('Pedidos especiales' in u62[0] and '1 de 2 jornadas y 2 de 3 árboles (67 %)' in u62[1],'Supervisión muestra el apartado «Pedidos especiales»: %s' % u62[1])
    como62('u-cabo-1')
    pg62.evaluate("document.getElementById('sup-filtros').open = true")
    pg62.select_option('#sup-origen','PROGRAMADA'); pg62.wait_for_timeout(900)
    w62=pg62.evaluate("[!!document.querySelector('.sup-pedidos-lema'), document.getElementById('sup-fichas').textContent, SRP.supervision.modelo.cifras.arboles]")
    ok(w62[0]==False and 'Origen: Programada' in w62[1] and w62[2]==1,'con el filtro «Programada» sólo cuentan las programadas y el apartado de pedidos no aparece: %s' % w62)
    # Un solicitante que aparece en una jornada cuenta como usado; volver a «Programada» vacía los datos del pedido
    y62=pg62.evaluate("""async id => { const j = await SRP.almacen.uno('jornadas', id); await SRP.almacen.guardarConBitacora('jornadas', Object.assign({}, j, { solicitante_id: 's-sobse', solicitante_otro: '' }), null);
      const u = (await SRP.ref.usosDe('catalogos'))['s-sobse']; return u && u.jornadas; }""", j62)
    pg62.evaluate("SRP.app.mostrarVista('jornadas')"); pg62.wait_for_timeout(1200)
    pg62.evaluate("async (id) => { await SRP.jornadas.abrir(id); }", j62); pg62.wait_for_timeout(1200)
    pg62.click('#btn-jornada-editar'); pg62.wait_for_timeout(400)
    pg62.select_option('#ej-origen','PROGRAMADA'); pg62.click('#btn-ej-guardar'); pg62.wait_for_timeout(900)
    z62=pg62.evaluate("async id => { const j = await SRP.almacen.uno('jornadas', id); return [j.origen, j.solicitante_id, j.solicitante_otro, j.pedido_descripcion]; }", j62)
    ok(y62==1 and z62==['PROGRAMADA', None, '', ''],'el solicitante de una jornada cuenta como usado (no se elimina del catálogo) y al volver a «Programada» los datos del pedido se vacían: %s' % z62)
    ok(not err62,'sin errores en consola: %s' % err62[:2])
    ctx62.close()

    # ---------- ctx63: sin conexión: versión nueva sin quedarse a medias, indicador de pendientes, borrador del árbol y botón «atrás» ----------
    raiz63 = _tf.mkdtemp()
    for _n in ['index.html', 'sw.js', 'manifest.webmanifest']: _sh.copy(os.path.join(_app, _n), raiz63)
    for _d in ['js', 'css', 'vendor', 'assets']: os.symlink(os.path.join(_app, _d), os.path.join(raiz63, _d))
    estado63 = {'cortar': False}
    class _H63(_hs.SimpleHTTPRequestHandler):
        def do_GET(self):
            # La versión nueva «no termina de bajar»: su capa de colonias responde con error
            if estado63['cortar'] and 'capa-colonias.js' in self.path and 'v=9.9.9' in self.path: self.send_error(503); return
            super().do_GET()
        def log_message(self, *a): pass
    srv63 = _hs.ThreadingHTTPServer(('127.0.0.1', 8094), _ft.partial(_H63, directory=raiz63))
    _th.Thread(target=srv63.serve_forever, daemon=True).start()
    B63 = 'http://127.0.0.1:8094/'
    ctx63 = b.new_context(viewport={'width':390,'height':844}, geolocation={'latitude':19.432,'longitude':-99.133,'accuracy':5}, permissions=['geolocation'])
    pg63 = ctx63.new_page(); err63 = []
    pg63.on('pageerror', lambda e: err63.append(str(e))); pg63.on('console', lambda m: m.type=='error' and 'net::' not in m.text and 'Failed to load' not in m.text and '503' not in m.text and err63.append(m.text))
    pg63.goto(B63); pg63.wait_for_timeout(1500)
    ok(esperar(pg63, "!!(navigator.serviceWorker && navigator.serviceWorker.controller)", 20000), 'la copia queda con su service worker')
    c63 = pg63.evaluate("(async () => { const ks = await caches.keys(); const c = await (await caches.open(ks[0])).keys(); return c.map(x => x.url); })()")
    ok(all(any(i in u for u in c63) for i in ['icono-192.png', 'icono-512.png', 'icono-512-maskable.png']), 'los iconos de instalación quedan guardados para abrir sin señal')
    pg63.fill('#acceso-correo', 'cabo@ejemplo.local'); pg63.fill('#acceso-clave', 'x'); pg63.click('#form-acceso button[type=submit]'); pg63.wait_for_timeout(900)
    iniciar_jornada(pg63, 'Jornada sin señal 63')
    def arbol63(lat):
        ctx63.set_geolocation({'latitude': lat, 'longitude': -99.133, 'accuracy': 5})
        pg63.click('#btn-ubicacion'); pg63.wait_for_timeout(900)
        pg63.fill('#campo-especie', 'fres'); pg63.wait_for_timeout(200); pg63.dispatch_event('.combo-opcion[data-id="ESP-0029"]', 'mousedown'); pg63.wait_for_timeout(150)
        pg63.click('#form-plantacion button[type=submit]'); pg63.wait_for_timeout(1200)
        if pg63.is_visible('#dlg-resumen'): pg63.click('#btn-resumen-guardar'); pg63.wait_for_timeout(700)
    # El indicador cuenta lo pendiente también sin señal
    ctx63.set_offline(True); pg63.wait_for_timeout(400)
    arbol63(19.4320); arbol63(19.4323)
    ind63 = pg63.inner_text('#conexion').replace('\n', ' ')
    ok('Sin conexión' in ind63 and '2' in ind63 and 'Al día' not in ind63 and '2 registros por enviar' in pg63.get_attribute('#conexion', 'aria-label'),
       'sin señal, el indicador dice cuántos registros esperan envío: «%s»' % ind63)
    # El árbol a medias vuelve tras recargar
    ctx63.set_geolocation({'latitude': 19.4326, 'longitude': -99.1334, 'accuracy': 5})
    pg63.click('#btn-ubicacion'); pg63.wait_for_timeout(900)
    pg63.fill('#campo-especie', 'fres'); pg63.wait_for_timeout(200); pg63.dispatch_event('.combo-opcion[data-id="ESP-0029"]', 'mousedown'); pg63.wait_for_timeout(150)
    pg63.fill('#campo-comentarios', 'árbol a medias'); pg63.set_input_files('#foto-archivo', sal('arbol.jpg')); pg63.wait_for_timeout(900)
    pg63.reload(); pg63.wait_for_timeout(2500)
    m63 = pg63.evaluate("[SRP.mapa.lat, SRP.formulario.estado.especieId, document.getElementById('campo-comentarios').value, !!SRP.formulario.estado.foto, document.getElementById('aviso').innerText.slice(0, 40)]")
    ok(m63[:4] == [19.4326, 'ESP-0029', 'árbol a medias', True] and 'recuperó' in m63[4], 'tras recargar sin señal, el árbol a medias vuelve con punto, especie, comentario y fotografía, y se avisa: %s' % m63)
    n63 = pg63.evaluate("(async () => (await SRP.almacen.todos('plantaciones')).length)()")
    pg63.click('#form-plantacion button[type=submit]'); pg63.wait_for_timeout(1200)
    if pg63.is_visible('#dlg-resumen'): pg63.click('#btn-resumen-guardar'); pg63.wait_for_timeout(700)
    ok(pg63.evaluate("(async () => (await SRP.almacen.todos('plantaciones')).length)()") == n63 + 1 and pg63.evaluate("localStorage.getItem(SRP.formulario.CLAVE_BORRADOR)") is None, 'al guardarlo se borra el borrador')
    pg63.click('#btn-ubicacion'); pg63.wait_for_timeout(900); pg63.fill('#campo-comentarios', 'se descarta')
    pg63.click('.pestana[data-vista=jornadas]'); pg63.wait_for_timeout(300); pg63.click('#btn-confirmar-si'); pg63.wait_for_timeout(400)
    ok(pg63.evaluate("localStorage.getItem(SRP.formulario.CLAVE_BORRADOR)") is None, 'descartar el árbol al cambiar de sección borra el borrador')
    # El botón «atrás» del navegador
    pg63.evaluate("SRP.app.mostrarVista('registros')"); pg63.wait_for_timeout(400)
    pg63.go_back(); pg63.wait_for_timeout(500); v63a = pg63.evaluate("SRP.app.vista")
    pg63.go_forward(); pg63.wait_for_timeout(500); v63b = pg63.evaluate("SRP.app.vista")
    ok([v63a, v63b] == ['jornadas', 'registros'] and pg63.url.startswith(B63), '«atrás» y «adelante» del navegador cambian de sección sin salir de la aplicación: %s' % [v63a, v63b])
    pg63.evaluate("SRP.app.mostrarVista('registrar')"); pg63.wait_for_timeout(500); pg63.click('#btn-ubicacion'); pg63.wait_for_timeout(900)
    pg63.go_back(); pg63.wait_for_timeout(500)
    ok(pg63.evaluate("SRP.app.vista") == 'registrar' and pg63.evaluate("SRP.mapa.lat") is not None and 'Guarde el árbol' in pg63.inner_text('#aviso'), 'con un árbol a medias, «atrás» no saca de «Nuevo registro» y lo dice')
    pg63.evaluate("SRP.formulario.limpiar()")
    pg63.click('#conexion'); pg63.wait_for_timeout(300); pg63.go_back(); pg63.wait_for_timeout(400)
    ok(pg63.evaluate("!document.querySelector('dialog[open]')") and pg63.evaluate("SRP.app.vista") == 'registrar', 'con una ventana abierta, «atrás» la cierra')
    # Dos avisos seguidos de que volvió la señal no envían dos veces
    ctx63.set_offline(False); pg63.evaluate("window.dispatchEvent(new Event('online'))"); pg63.wait_for_timeout(3500)
    f63 = pg63.evaluate("(async () => (await SRP.almacen.todos('plantaciones')).map(r => r.folio))()")
    ok(all(f63) and sorted(int(x[-5:]) for x in f63) == list(range(1, len(f63) + 1)), 'al volver la señal cada árbol recibe un solo folio, consecutivo: %s' % sorted(f63))
    # Una versión nueva que no termina de bajar no deja el teléfono sin aplicación
    v63 = pg63.evaluate("SRP.CONFIG.VERSION")
    _i63 = os.path.join(raiz63, 'index.html'); _t63 = open(_i63, encoding='utf-8').read()
    open(_i63, 'w', encoding='utf-8').write(_t63.replace('?v=' + v63, '?v=9.9.9'))
    estado63['cortar'] = True
    pg63.reload(); pg63.wait_for_timeout(5000)
    a63 = pg63.evaluate("[typeof SRP !== 'undefined' && SRP.CONFIG.VERSION, typeof SRP !== 'undefined' && !!SRP.almacen.db]")
    ok(a63 == [v63, True], 'si la versión nueva no termina de bajar, se sigue abriendo la anterior completa: %s' % a63)
    pg63.reload(); pg63.wait_for_timeout(4000)
    ok(pg63.evaluate("SRP.CONFIG.VERSION") == v63 and pg63.is_visible('#vista-registrar'), 'y así en cada recarga')
    estado63['cortar'] = False
    pg63.reload(); pg63.wait_for_timeout(9000)
    d63 = pg63.evaluate("(async () => [SRP.CONFIG.VERSION, await caches.keys(), (await SRP.almacen.todos('plantaciones')).length, [...document.querySelectorAll('script[src]')].filter(e => !e.src.includes('v=9.9.9')).length])()")
    ok(d63 == ['9.9.9', ['srp-9.9.9'], len(f63), 0], 'cuando la versión nueva queda completa se aplica sola, sin mezclar archivos y con los registros intactos: %s' % d63)
    ok(not err63, 'sin errores en consola: %s' % err63[:2])
    ctx63.close(); srv63.shutdown(); _sh.rmtree(raiz63, ignore_errors=True)

    # ---------- ctx64: lo que se descarga: tabla sin fórmulas, letra del sistema en el PDF, totales que suman y eliminados por día local ----------
    from pypdf import PdfReader as _Pdf64
    ctx64 = b.new_context(viewport={'width':1280,'height':900}, timezone_id='America/Mexico_City', geolocation={'latitude':19.4326,'longitude':-99.1332,'accuracy':5}, permissions=['geolocation'], accept_downloads=True)
    pg64 = ctx64.new_page(); err64 = []
    pg64.on('pageerror', lambda e: err64.append(str(e))); pg64.on('console', lambda m: m.type=='error' and 'net::' not in m.text and 'Failed to load' not in m.text and err64.append(m.text))
    pg64.goto(BASE); pg64.wait_for_timeout(1200)
    pg64.select_option('#sel-usuario-prueba', 'u-cabo-1'); pg64.click('#btn-entrar-prueba'); pg64.wait_for_timeout(900)
    hoy64 = pg64.evaluate("SRP.util.fechaHoy()")
    antes64 = pg64.evaluate("SRP.indicadores.sumarDias(SRP.util.fechaHoy(), -40)")
    # Una jornada que empezó hace cuarenta días y hoy planta otro árbol; su nombre empieza como una fórmula
    iniciar_jornada(pg64, '=1+1 Jacarandā', antes64)
    def arbol64(lat, hoy):
        ctx64.set_geolocation({'latitude': lat, 'longitude': -99.1332, 'accuracy': 5})
        pg64.click('#btn-ubicacion'); pg64.wait_for_timeout(900)
        pg64.fill('#campo-especie', 'fres'); pg64.wait_for_timeout(200); pg64.dispatch_event('.combo-opcion[data-id="ESP-0029"]', 'mousedown'); pg64.wait_for_timeout(150)
        if hoy: pg64.evaluate("document.getElementById('btn-fecha-hoy').click()"); pg64.wait_for_timeout(150)
        pg64.click('#form-plantacion button[type=submit]'); pg64.wait_for_timeout(800)
        if pg64.is_visible('#dlg-confirmar'): pg64.click('#btn-confirmar-si'); pg64.wait_for_timeout(800)
        if pg64.is_visible('#dlg-resumen'): pg64.click('#btn-resumen-guardar'); pg64.wait_for_timeout(600)
    arbol64(19.4326, False); arbol64(19.4329, True)
    pg64.click('#btn-jornada-cerrar'); pg64.wait_for_timeout(300); pg64.click('#btn-confirmar-si'); pg64.wait_for_timeout(1200)
    f64 = pg64.evaluate("(async () => (await SRP.almacen.todos('plantaciones')).map(r => r.fecha_plantacion).sort())()")
    pg64.click('.pestana[data-vista=supervision]'); pg64.wait_for_timeout(900)
    abrir_sup(pg64)
    pg64.evaluate("(h) => { SRP.supervision.periodo = SRP.indicadores.periodo('rango', h, h); SRP.supervision.pintar(); }", hoy64); pg64.wait_for_timeout(600)
    m64 = pg64.evaluate("(() => { const m = SRP.supervision.modelo; return [m.cifras.jornadas, m.cifras.arboles, m.serie.casillas.reduce((s, c) => s + c.jornadas, 0), m.serie.casillas.reduce((s, c) => s + c.arboles, 0)]; })()")
    ok(f64 == [antes64, hoy64] and m64 == [1, 1, 1, 1], 'una jornada de varios días cuenta en la casilla del día en que plantó: la columna de jornadas suma el total: %s' % m64)
    c64 = pg64.evaluate("SRP.informes.texto(SRP.supervision.modelo).split('\\r\\n')[1]")
    ok('"\'=1+1 Jacarandā"' in c64 and ',"-99.' in c64, 'en la tabla CSV un nombre que empieza con «=» lleva apóstrofo y no se calcula; la longitud sigue siendo una cifra: %s' % c64[25:60])
    k64 = pg64.evaluate("['=A1', '+1', '-x', '@s', '\\tq', '-99.13', '-5', 'x=1', ''].map(v => SRP.informes.texto({ detalle: [{ folio: v }] }).split('\\r\\n')[1].split(',')[0])")
    ok(k64 == ['"\'=A1"', '"\'+1"', '"\'-x"', '"\'@s"', '"\'\tq"', '"-99.13"', '"-5"', '"x=1"', '""'], 'y lo mismo con «+», «-», «@» y tabulador, sin tocar las cifras negativas: %s' % k64)
    def pdf64(ruta, clic):
        with pg64.expect_download() as d: clic()
        d.value.save_as(ruta); rd = _Pdf64(ruta)
        emb = sorted({(x.idnum, str(x.get_object().get('/BaseFont'))) for pag in rd.pages for x in (pag['/Resources'].get('/Font') or {}).values() if '/DescendantFonts' in x.get_object()})
        return ' '.join(' '.join((pag.extract_text() or '') for pag in rd.pages).split()), emb, os.path.getsize(ruta)
    t64, e64, p64 = pdf64(sal('informe_b150.pdf'), lambda: pg64.click('#btn-sup-pdf'))
    ok(len(e64) == 3 and all('Roboto' in x[1] for x in e64) and '=1+1 Jacarandā' in t64 and p64 < 200000,
       'el informe en PDF lleva Roboto incrustada y escribe bien una letra con macrón: %s, %d KB' % ([x[1] for x in e64], p64 // 1024))
    ok(re.search(r'Generado el \d{2}-[A-Z]{3}-\d{4}, \d{2}:\d{2} h', t64) is not None and 'Árboles por jornada 1 ' in t64, 'el sello lleva la fecha como en todo el sistema y la hora de 24 horas: %s' % re.findall(r'Generado el [^P]{0,24}', t64)[:1])
    reporte_de(pg64, 'Jacarandā')
    pg64.click('#btn-cierre-previa') if pg64.locator('#btn-cierre-previa').count() else pg64.click('#form-cierre button[type=submit]')
    pg64.wait_for_timeout(1500)
    r64, er64, pr64 = pdf64(sal('reporte_b150.pdf'), lambda: pg64.click('#btn-previa-generar'))
    ok(len(er64) == 3 and '=1+1 Jacarandā' in r64 and pr64 < 250000, 'y el reporte de la jornada también: %d KB' % (pr64 // 1024))
    pg64.wait_for_timeout(600)
    # Lo eliminado a las once y media de la noche es del día en que se eliminó, no del siguiente
    d64 = pg64.evaluate("""(() => { const I = SRP.indicadores, hoy = SRP.util.fechaHoy(), yo = SRP.sesion.usuario.id;
      const tarde = I.aFecha(hoy); tarde.setHours(23, 30);
      const j = { id: 'j64', fecha: hoy, estatus: 'cerrada', nombre: 'J', cabo_id: yo, dato: {}, registros: [] };
      const e = { id: 'a64', jornada_id: 'j64', cabo_id: yo, fecha_plantacion: hoy, fecha_ultima_edicion: tarde.toISOString() };
      const de = p => I.calcular({ jornadas: [j], eliminados: [e], ediciones: [], cabos: [] }, p, {}).trazabilidad.eliminados;
      return [tarde.toISOString().slice(0, 10) !== hoy, de(I.periodo('rango', hoy, hoy)), de(I.periodo('rango', I.sumarDias(hoy, 1), I.sumarDias(hoy, 1)))]; })()""")
    ok(d64 == [True, 1, 0], 'un árbol eliminado de noche cuenta en su día local, igual que las ediciones: %s' % d64)
    ok(not err64, 'sin errores en consola: %s' % err64[:2])
    ctx64.close()

    # ---------- ctx65: una sola jornada con dos toques, el reporte cuenta al entregarse y caduca si la jornada cambia, sustituir pregunta antes de reabrir ----------
    ctx65 = b.new_context(viewport={'width':1280,'height':900}, timezone_id='America/Mexico_City', geolocation={'latitude':19.4326,'longitude':-99.1332,'accuracy':5}, permissions=['geolocation'], accept_downloads=True)
    pg65 = ctx65.new_page(); err65 = []
    pg65.on('pageerror', lambda e: err65.append(str(e))); pg65.on('console', lambda m: m.type=='error' and 'net::' not in m.text and 'Failed to load' not in m.text and err65.append(m.text))
    pg65.goto(BASE); pg65.wait_for_timeout(1200)
    pg65.select_option('#sel-usuario-prueba', 'u-cabo-1'); pg65.click('#btn-entrar-prueba'); pg65.wait_for_timeout(900)
    J65 = "(async () => (await SRP.almacen.todos('jornadas')).map(j => [j.nombre, j.estatus, !!j.reporte_en]))()"
    pg65.fill('#ini-nombre', 'Doble toque B151'); pg65.fill('#ini-fecha', HOY); pg65.select_option('#ini-programa', 'p-refor'); pg65.select_option('#ini-origen','PROGRAMADA'); pg65.fill('#ini-meta', '10')
    pg65.evaluate("(() => { const f = document.getElementById('form-iniciar-jornada'); f.requestSubmit(); f.requestSubmit(); })()")
    esperar(pg65, "!!SRP.activa.jornada && !document.getElementById('btn-ubicacion').disabled", 5000); pg65.wait_for_timeout(500)
    ok(pg65.evaluate(J65) == [['Doble toque B151', 'abierta', False]], 'dos toques seguidos en «Iniciar jornada» inician una sola jornada: %s' % pg65.evaluate(J65))
    def arbol65(lat):
        ctx65.set_geolocation({'latitude': lat, 'longitude': -99.1332, 'accuracy': 5})
        previo = pg65.evaluate("SRP.formulario.estado.ultimoGuardado")
        pg65.click('#btn-ubicacion'); pg65.wait_for_timeout(900)
        if not pg65.evaluate("!!SRP.formulario.estado.especieId"):
            pg65.fill('#campo-especie', 'fres'); pg65.wait_for_timeout(200); pg65.dispatch_event('.combo-opcion[data-id="ESP-0029"]', 'mousedown'); pg65.wait_for_timeout(150)
        pg65.click('#form-plantacion button[type=submit]')
        for _ in range(60):
            pg65.wait_for_timeout(150)
            if pg65.is_visible('#dlg-resumen'): pg65.click('#btn-resumen-guardar'); esperar(pg65, "!document.getElementById('dlg-resumen').open", 6000); continue
            if pg65.evaluate("p => SRP.formulario.estado.ultimoGuardado !== p && !document.querySelector('dialog[open]')", previo): break
        pg65.wait_for_timeout(300)
        return pg65.evaluate("SRP.formulario.estado.ultimoGuardado")
    a65 = arbol65(19.4326); b65 = arbol65(19.4329)
    pg65.click('#btn-jornada-cerrar'); pg65.wait_for_timeout(300); pg65.click('#btn-confirmar-si'); pg65.wait_for_timeout(1200)
    # La vista previa no es el reporte: cuenta cuando el PDF se entrega
    reporte_de(pg65, 'Doble toque B151')
    pg65.click('#btn-cierre-previa') if pg65.locator('#btn-cierre-previa').count() else pg65.click('#form-cierre button[type=submit]')
    esperar(pg65, "document.getElementById('dlg-previa').open", 6000); pg65.wait_for_timeout(600)
    ok(pg65.evaluate(J65) == [['Doble toque B151', 'cerrada', False]], 'abrir la vista previa no da el reporte por generado')
    with pg65.expect_download() as d65: pg65.click('#btn-previa-generar')
    esperar(pg65, "(async () => !!(await SRP.almacen.todos('jornadas'))[0].reporte_en)()", 6000); pg65.wait_for_timeout(500)
    ok(pg65.evaluate(J65) == [['Doble toque B151', 'cerrada', True]], 'al entregar el PDF el reporte queda generado')
    # Si la jornada cambia después, el reporte deja de estar vigente
    pg65.evaluate("async id => { await SRP.registros.eliminar(await SRP.almacen.uno('plantaciones', id)); }", b65); pg65.wait_for_timeout(600)
    bit65 = pg65.evaluate("(async () => (await SRP.almacen.todos('bitacora')).map(x => x.detalle || '').filter(t => /reporte/i.test(t)))()")
    ok(pg65.evaluate(J65) == [['Doble toque B151', 'cerrada', False]] and 'Reporte generado' in bit65 and any('deja de estar vigente: se eliminó un árbol' in t for t in bit65),
       'eliminar un árbol de una jornada con reporte lo deja sin vigencia, con constancia en la bitácora: %s' % bit65)
    pg65.evaluate("async () => { const j = (await SRP.almacen.todos('jornadas'))[0]; j.reporte_en = new Date().toISOString(); await SRP.almacen.guardarConBitacora('jornadas', j, null); }"); pg65.wait_for_timeout(200)
    # Sustituir un árbol de una jornada cerrada: se pregunta antes de reabrirla y vuelve a cerrarse
    def sustituir65():
        pg65.evaluate("async id => { await SRP.registros.sustituir(await SRP.almacen.uno('plantaciones', id)); }", a65); pg65.wait_for_timeout(500)
        pg65.locator('#sustituir-motivos .chip').first.click(); pg65.wait_for_timeout(150)
        pg65.evaluate("(() => { SRP.registros.seguirSustitucion(); })()"); esperar(pg65, "document.getElementById('dlg-confirmar').open", 5000); pg65.wait_for_timeout(200)
    sustituir65()
    t65 = pg65.inner_text('#dlg-confirmar')
    ok('Jornada cerrada' in t65 and '¿Reabrir «Doble toque B151» para registrar el sustituto?' in t65 and 'reporte deja de estar vigente' in t65 and pg65.evaluate(J65) == [['Doble toque B151', 'cerrada', True]],
       'sustituir un árbol de una jornada cerrada pregunta antes de reabrirla y avisa del reporte')
    pg65.click('#btn-confirmar-no'); pg65.wait_for_timeout(500)
    ok(pg65.evaluate(J65) == [['Doble toque B151', 'cerrada', True]] and pg65.evaluate("SRP.app.vista") != 'registrar', 'si se cancela la pregunta, la jornada sigue cerrada y con su reporte')
    sustituir65(); pg65.click('#btn-confirmar-si'); esperar(pg65, "SRP.app.vista === 'registrar'", 5000); pg65.wait_for_timeout(500)
    ok(pg65.evaluate(J65) == [['Doble toque B151', 'abierta', False]], 'al aceptar se reabre para registrar el sustituto y el reporte deja de contar')
    pg65.click('#btn-cancelar-edicion'); pg65.wait_for_timeout(900)
    ok(pg65.evaluate(J65) == [['Doble toque B151', 'cerrada', False]] and 'volvió a cerrarse' in pg65.inner_text('#aviso'), 'al cancelar la sustitución la jornada vuelve a cerrarse: %s' % pg65.inner_text('#aviso')[:60])
    sustituir65(); pg65.click('#btn-confirmar-si'); esperar(pg65, "SRP.app.vista === 'registrar'", 5000); pg65.wait_for_timeout(500)
    ctx65.set_geolocation({'latitude': 19.4321, 'longitude': -99.1331, 'accuracy': 5})
    pg65.click('#btn-ubicacion'); pg65.wait_for_timeout(1000); pg65.click('#form-plantacion button[type=submit]')
    for _ in range(40):
        pg65.wait_for_timeout(150)
        if pg65.is_visible('#dlg-resumen'): pg65.click('#btn-resumen-guardar'); esperar(pg65, "!document.getElementById('dlg-resumen').open", 6000); continue
        if pg65.evaluate("SRP.app.vista") != 'registrar': break
    pg65.wait_for_timeout(600)
    e65 = pg65.evaluate("(async () => (await SRP.almacen.todos('plantaciones')).map(r => r.estatus).sort())()")
    ok(pg65.evaluate(J65) == [['Doble toque B151', 'cerrada', False]] and e65 == ['activo', 'eliminado', 'sustituido'] and 'volvió a cerrarse' in pg65.inner_text('#aviso'),
       'al guardar el sustituto la jornada vuelve a cerrarse y pide generar de nuevo el reporte: %s' % e65)
    ok(not err65, 'sin errores en consola: %s' % err65[:2])
    ctx65.close()

    # ---------- ctx66: fecha máxima al día, mapas de Supervisión con sus controles al alcance, indicador fácil de tocar ----------
    ctx66 = b.new_context(viewport={'width':390,'height':844}, timezone_id='America/Mexico_City', geolocation={'latitude':19.4326,'longitude':-99.1332,'accuracy':5}, permissions=['geolocation'])
    pg66 = ctx66.new_page(); err66 = []
    pg66.on('pageerror', lambda e: err66.append(str(e))); pg66.on('console', lambda m: m.type=='error' and 'net::' not in m.text and 'Failed to load' not in m.text and err66.append(m.text))
    pg66.goto(BASE); pg66.wait_for_timeout(1200)
    pg66.select_option('#sel-usuario-prueba', 'u-cabo-1'); pg66.click('#btn-entrar-prueba'); pg66.wait_for_timeout(900)
    # La aplicación quedó abierta desde ayer: el calendario de la jornada deja elegir hoy
    m66 = pg66.evaluate("(() => { const c = document.getElementById('ini-fecha'); c.max = SRP.indicadores.sumarDias(SRP.util.fechaHoy(), -1); SRP.activa.mostrarInicio(true); return [c.max, SRP.util.fechaHoy()]; })()")
    ok(m66[0] == m66[1], 'al mostrar «Iniciar jornada» la fecha máxima es la de hoy, aunque la aplicación lleve abierta desde ayer: %s' % m66)
    t66 = pg66.evaluate("(() => { const c = document.getElementById('conexion'), r = c.getBoundingClientRect(), d = getComputedStyle(c, '::after'); return [Math.round(r.height), Math.round(parseFloat(d.height)), d.position]; })()")
    ok(t66[0] <= 36 and t66[1] >= 44 and t66[2] == 'absolute', 'el indicador de conexión se ve igual y se toca en 44 px o más de alto: %s' % t66)
    iniciar_jornada(pg66, 'Mapas B152'); registrar(pg66, 'fres', 'ESP-0029')
    pg66.click('#btn-jornada-cerrar'); pg66.wait_for_timeout(300); pg66.click('#btn-confirmar-si'); pg66.wait_for_timeout(1200)
    pg66.click('.pestana[data-vista=supervision]'); abrir_sup(pg66); esperar(pg66, "!!document.querySelector('#sup-mapa .leaflet-container, #sup-mapa.leaflet-container')", 8000); pg66.wait_for_timeout(600)
    a66 = pg66.evaluate("[...document.querySelectorAll('.sup-mapa')].map(m => [m.getAttribute('role'), /tabla de al lado/.test(m.getAttribute('aria-label') || ''), m.querySelectorAll('a[href], button, [tabindex]').length > 0])")
    ok(len(a66) >= 1 and all(x == ['group', True, True] for x in a66), 'los mapas de Supervisión ya no se declaran imagen: sus controles se alcanzan y la etiqueta remite a la tabla: %s' % a66)
    ok(not err66, 'sin errores en consola: %s' % err66[:2])
    ctx66.close()

    # ---------- ctx67: catálogo de solicitantes de pedidos especiales, aparte del de instituciones ----------
    ctx67 = b.new_context(viewport={'width':390,'height':844}, timezone_id='America/Mexico_City', geolocation={'latitude':19.357,'longitude':-99.06,'accuracy':5}, permissions=['geolocation'])
    pg67 = ctx67.new_page(); err67 = []
    pg67.on('pageerror', lambda e: err67.append(str(e))); pg67.on('console', lambda m: m.type=='error' and 'net::' not in m.text and 'Failed to load' not in m.text and err67.append(m.text))
    pg67.goto(BASE); pg67.wait_for_timeout(1300)
    pg67.select_option('#sel-usuario-prueba','u-admin-1'); pg67.click('#btn-entrar-prueba'); pg67.wait_for_timeout(800)
    # De arranque: las 16 alcaldías sin la palabra, tres dependencias y diputadas y diputados
    s67 = pg67.evaluate("""() => { const l = SRP.ref.deTipo('solicitante', false), de = t => l.filter(s => s.tipo_solicitante === t).map(s => s.nombre);
      return { n: l.length, alc: de('Alcaldía').length, sinPalabra: l.every(s => !/^Alcald/i.test(s.nombre)), dep: de('Dependencia de gobierno'), con: de('Congreso'),
        ids: ['s-alc-09003', 's-sobse', 's-segiagua', 's-jefatura', 's-diputados'].every(id => (SRP.ref.catalogoPorId[id] || {}).tipo === 'solicitante'), orgs: SRP.ref.deTipo('organizacion', false).length,
        dominio: SRP.ESQUEMA.dominios.tipo_solicitante.join('|') === SRP.ref.TIPOS_SOLICITANTE.join('|') }; }""")
    ok(s67 == {'n':21,'alc':16,'sinPalabra':True,'dep':['Jefatura de Gobierno','Oficina de la Secretaría','Secretaría de Gestión Integral del Agua (SEGIAGUA)','Secretaría de Obras y Servicios (SOBSE)'],'con':['Diputadas y diputados'],'ids':True,'orgs':21,'dominio':True},
       'los solicitantes de arranque son las 16 alcaldías sin la palabra «Alcaldía», la Oficina de la Secretaría, SOBSE, SEGIAGUA, Jefatura de Gobierno y Diputadas y diputados; las instituciones no cambian: %s' % s67)
    # Catálogos › Solicitantes: su pestaña, buscador, tipo y lista agrupada
    pg67.evaluate("SRP.app.mostrarVista('catalogos')"); pg67.wait_for_timeout(500)
    pg67.click('#cat-tipos .chip[data-tipo=solicitante]'); pg67.wait_for_timeout(500)
    t67 = pg67.evaluate("""() => { const T = SRP.ref.TIPOS_SOLICITANTE, filas = [...document.querySelectorAll('#tabla-catalogo tbody tr')], idx = filas.map(tr => T.indexOf(SRP.ref.catalogoPorId[tr.dataset.id].tipo_solicitante));
      const t = id => document.getElementById(id).textContent.trim();
      return [t('cat-cuenta'), t('btn-cat-agregar'), !document.getElementById('cat-nota-sol').hidden, document.getElementById('cat-nota-org').hidden, t('cat-buscar-etiqueta'), t('cat-filtro-tipo-etiqueta'),
        idx.join() === idx.slice().sort((a, b) => a - b).join(), filas[0].querySelector('.c-titulo').textContent, [...document.querySelectorAll('#tabla-catalogo thead th')].map(th => th.textContent).includes('Clave'),
        [...document.getElementById('cat-filtro-tipo').options].map(o => o.value).filter(Boolean).join('|') === T.join('|')]; }""")
    ok(t67 == ['21 solicitantes','Agregar solicitante',True,True,'Buscar solicitante','Tipo de solicitante',True,'Jefatura de Gobierno',False,True],
       'Catálogos › Solicitantes trae su nota, buscador y tipo, la lista agrupada por tipo y en orden alfabético, sin clave a la vista: %s' % t67)
    pg67.fill('#cat-buscar','izta'); pg67.wait_for_timeout(300)
    b67 = pg67.eval_on_selector_all('#tabla-catalogo tbody tr .c-titulo','l=>l.map(x=>x.innerText)')
    pg67.fill('#cat-buscar',''); pg67.select_option('#cat-filtro-tipo','Congreso'); pg67.wait_for_timeout(300)
    f67 = [pg67.eval_on_selector_all('#tabla-catalogo tbody tr .c-titulo','l=>l.map(x=>x.innerText)'), pg67.inner_text('#cat-cuenta')]
    pg67.select_option('#cat-filtro-tipo',''); pg67.wait_for_timeout(300)
    ok(b67 == ['Iztacalco','Iztapalapa'] and f67 == [['Diputadas y diputados'],'1 de 21 solicitantes'],'los solicitantes se buscan por nombre y se filtran por tipo: %s · %s' % (b67, f67))
    # Agregar: tipo de la lista y nombre único; la clave la pone el sistema
    pg67.click('#btn-cat-agregar'); pg67.wait_for_timeout(400)
    g67 = [pg67.inner_text('#dlg-catalogo-titulo'), pg67.is_hidden('#cat-clave'), pg67.is_hidden('#cat-tipo-org'), pg67.is_visible('#cat-tipo-sol'),
           pg67.eval_on_selector_all('#cat-tipo-sol option','l=>l.map(o=>o.value).filter(Boolean)')]
    pg67.fill('#cat-nombre','jefatura de gobierno'); pg67.click('#form-catalogo button[type=submit]'); pg67.wait_for_timeout(400)
    e67 = pg67.inner_text('#cat-errores') if pg67.is_visible('#cat-errores') else ''
    ok(g67 == ['Agregar solicitante', True, True, True, ['Dependencia de gobierno','Alcaldía','Congreso','Empresa','Organización civil','Escuela','Vecinos']] and 'Ya existe un solicitante con ese nombre' in e67 and 'Elija el tipo de solicitante' in e67 and pg67.is_visible('#dlg-catalogo'),
       'al agregar un solicitante se piden nombre único y tipo, de siete; la clave no se muestra: %s' % e67.replace(chr(10),' · '))
    pg67.fill('#cat-nombre','Escuela Primaria Ejemplo'); pg67.select_option('#cat-tipo-sol','Escuela'); pg67.click('#form-catalogo button[type=submit]'); pg67.wait_for_timeout(600)
    n67 = pg67.evaluate("""async () => { const s = SRP.ref.deTipo('solicitante', false).find(x => x.nombre === 'Escuela Primaria Ejemplo'); if (!s) return null;
      const bt = (await SRP.almacen.todos('bitacora')).filter(x => x.entidad_id === s.id).map(x => x.accion + ' ' + x.entidad + ' ' + (x.detalle || ''));
      return { id: s.id, d: [s.tipo, s.clave, s.tipo_solicitante, s.activo, s.creado_por_id], bt, cuenta: document.getElementById('cat-cuenta').textContent }; }""")
    ok(pg67.is_hidden('#dlg-catalogo') and n67 and n67['d'] == ['solicitante','ESCUELA_PRIMARIA_EJEMPLO','Escuela',True,'u-admin-1'] and n67['bt'] == ['CREADO catalogo solicitante ESCUELA_PRIMARIA_EJEMPLO'] and n67['cuenta'] == '22 solicitantes',
       'el solicitante nuevo se guarda con su tipo, la clave que pone el sistema y su renglón de bitácora: %s' % (n67 and n67['d']))
    id67 = n67['id']
    # «Quién lo solicita» lo ofrece en su grupo; las instituciones ya no salen ahí
    q67 = pg67.evaluate("""id => { const s = document.createElement('select'); s.innerHTML = SRP.pedido.opciones(null); const g = [...s.querySelectorAll('optgroup')];
      const alc = [...g[1].children].map(o => o.textContent);
      return [g.map(x => x.label), alc.length, alc.join() === alc.slice().sort((a, b) => a.localeCompare(b, 'es')).join(), alc[0], [...s.options].some(o => o.value === id), [...s.options].some(o => /^o-/.test(o.value)), s.options[0].value, [...s.options].pop().textContent]; }""", id67)
    ok(q67 == [['Dependencia de gobierno','Alcaldía','Congreso','Escuela'], 16, True, 'Álvaro Obregón', True, False, '', 'Otra instancia'],
       '«Quién lo solicita» agrupa por tipo, con las alcaldías en orden alfabético y sin la palabra, trae el solicitante nuevo y termina en «Otra instancia»; ninguna institución: %s' % q67[0])
    # Editar: se corrigen nombre y tipo
    pg67.locator('#tabla-catalogo tbody tr', has_text='Escuela Primaria Ejemplo').locator('.c-titulo').click(); pg67.wait_for_timeout(400)
    h67 = [pg67.inner_text('#dlg-catalogo-titulo'), pg67.input_value('#cat-tipo-sol'), pg67.is_enabled('#cat-tipo-sol')]
    pg67.fill('#cat-nombre','Comité vecinal Ejemplo'); pg67.select_option('#cat-tipo-sol','Vecinos'); pg67.click('#form-catalogo button[type=submit]'); pg67.wait_for_timeout(600)
    k67 = pg67.evaluate("""async id => { const s = SRP.ref.catalogoPorId[id]; const b = (await SRP.almacen.todos('bitacora')).filter(x => x.entidad_id === id && x.accion === 'EDITADO').pop();
      return [s.nombre, s.tipo_solicitante, s.clave, b && b.detalle]; }""", id67)
    ok(h67 == ['Editar solicitante','Escuela',True] and k67 == ['Comité vecinal Ejemplo','Vecinos','ESCUELA_PRIMARIA_EJEMPLO','Campos: nombre, tipo_solicitante'],
       'un solicitante se edita: cambian nombre y tipo, la clave no, y la bitácora dice qué campos: %s' % k67)
    # Con uso no se elimina; desactivado deja de ofrecerse, pero la jornada que lo tiene lo conserva
    u67 = pg67.evaluate("""async id => { await SRP.almacen._tx(['jornadas'], 'readwrite', tx => tx.objectStore('jornadas').put({ id: 'j-sol-67', nombre: 'Pedido de vecinos', cabo_id: 'u-cabo-1', organizacion_id: 'o-sedema',
        programa_id: 'p-refor', fecha: '2026-09-01', estatus: 'cerrada', origen: 'PEDIDO', solicitante_id: id, solicitante_otro: '', pedido_descripcion: '' }));
      const j = await SRP.almacen.uno('jornadas', 'j-sol-67'); return [SRP.pedido.texto(j), SRP.pedido.clavesFiltro(j)[1] === 'PEDIDO:' + id]; }""", id67)
    pg67.click('#cat-tipos .chip[data-tipo=solicitante]'); pg67.wait_for_timeout(500)
    fila67 = pg67.locator('#tabla-catalogo tbody tr', has_text='Comité vecinal Ejemplo')
    ac67 = fila67.locator('button[data-accion]').evaluate_all('l=>l.map(b=>b.dataset.accion)')
    accion(pg67, fila67, 'estado'); pg67.wait_for_timeout(600)
    d67 = pg67.evaluate("""id => { const s = document.createElement('select'); s.innerHTML = SRP.pedido.opciones(null); const t = document.createElement('select'); t.innerHTML = SRP.pedido.opciones(id);
      return [SRP.ref.catalogoPorId[id].activo, [...s.options].some(o => o.value === id), [...t.options].some(o => o.value === id), document.getElementById('cat-cuenta').textContent]; }""", id67)
    ok(u67 == ['Pedido especial · Solicita: Comité vecinal Ejemplo', True] and ac67 == ['editar','estado'] and '1 jornada' in fila67.inner_text() and d67 == [False, False, True, '22 solicitantes · 1 inactivo'],
       'un solicitante con jornadas no ofrece «Eliminar»; desactivado ya no sale en «Quién lo solicita», salvo en la jornada que ya lo tiene: %s' % d67)
    # Sin uso sí se elimina
    pg67.evaluate("SRP.almacen._tx(['jornadas'], 'readwrite', tx => tx.objectStore('jornadas').delete('j-sol-67'))"); pg67.wait_for_timeout(200)
    pg67.click('#cat-tipos .chip[data-tipo=solicitante]'); pg67.wait_for_timeout(500)
    accion(pg67, pg67.locator('#tabla-catalogo tbody tr', has_text='Comité vecinal Ejemplo'), 'eliminar'); pg67.wait_for_timeout(500)
    pg67.click('#btn-confirmar-si'); pg67.wait_for_timeout(700)
    ok(pg67.evaluate("id => !SRP.ref.catalogoPorId[id]", id67) and pg67.inner_text('#cat-cuenta') == '21 solicitantes','un solicitante sin uso se elimina del catálogo')
    # Al abrir: una jornada cuyo solicitante era una institución pasa a su solicitante o queda escrita
    pg67.evaluate("""() => SRP.almacen._tx(['jornadas'], 'readwrite', tx => { const j = (id, s) => tx.objectStore('jornadas').put({ id, nombre: 'Pedido de antes', cabo_id: 'u-cabo-1', organizacion_id: 'o-sedema', programa_id: 'p-refor',
        fecha: '2026-09-01', estatus: 'cerrada', origen: 'PEDIDO', solicitante_id: s, solicitante_otro: '', pedido_descripcion: 'x' });
      j('j-a67', 'o-sobse'); j('j-b67', 'o-alc-09007'); j('j-c67', 'o-paot'); j('j-d67', 's-jefatura'); })""")
    pg67.reload(); pg67.wait_for_timeout(1600)
    m67 = pg67.evaluate("""async () => { await SRP.ref.recargar(); const r = []; for (const id of ['j-a67', 'j-b67', 'j-c67', 'j-d67']) { const j = await SRP.almacen.uno('jornadas', id); r.push([j.solicitante_id, j.solicitante_otro, SRP.pedido.solicitante(j), j.pedido_descripcion]); } return r; }""")
    ok(m67 == [['s-sobse','','Secretaría de Obras y Servicios (SOBSE)','x'],['s-alc-09007','','Iztapalapa','x'],[None,'Procuraduría Ambiental y del Ordenamiento Territorial (PAOT)','Procuraduría Ambiental y del Ordenamiento Territorial (PAOT)','x'],['s-jefatura','','Jefatura de Gobierno','x']],
       'al abrir, la jornada que tenía una institución como solicitante pasa al solicitante que le corresponde o queda escrita como otra instancia: %s' % m67)
    # Un teléfono con capturas y el sello anterior recibe el catálogo de solicitantes sin perder nada
    pg67.evaluate("""async () => { const sol = SRP.ref.deTipo('solicitante', false).map(s => s.id);
      await SRP.almacen._tx(['solicitantes'], 'readwrite', tx => sol.forEach(id => tx.objectStore('solicitantes').delete(id))); localStorage.setItem(SRP.CONFIG.CLAVE_SELLO, '2026-09-30c-programas'); }""")
    pg67.reload(); pg67.wait_for_timeout(1800)
    c67 = pg67.evaluate("""async () => { await SRP.ref.recargar(); return [SRP.ref.deTipo('solicitante', true).length, (await SRP.almacen.todos('jornadas')).filter(j => /67$/.test(j.id)).length, localStorage.getItem(SRP.CONFIG.CLAVE_SELLO) === SRP.CONFIG.SELLO_DATOS]; }""")
    ok(c67 == [21, 4, True],'un teléfono con capturas y el sello anterior recibe los solicitantes de arranque y conserva sus jornadas: %s' % c67)
    ok(not err67, 'sin errores en consola: %s' % err67[:2])
    ctx67.close()

    # ---------- ctx68: editar la jornada desde «Nuevo registro», árboles de la jornada en el mapa y aviso de jornada completa
    ctx68 = b.new_context(viewport={'width':390,'height':844}, timezone_id='America/Mexico_City', geolocation={'latitude':19.4326,'longitude':-99.1332,'accuracy':5}, permissions=['geolocation'])
    pg68 = ctx68.new_page(); err68 = []
    pg68.on('pageerror', lambda e: err68.append(str(e))); pg68.on('console', lambda m: m.type=='error' and 'net::' not in m.text and 'Failed to load' not in m.text and err68.append(m.text))
    pg68.goto(BASE); pg68.wait_for_timeout(1200)
    pg68.select_option('#sel-usuario-prueba', 'u-cabo-1'); pg68.click('#btn-entrar-prueba'); pg68.wait_for_timeout(900)
    pg68.fill('#ini-nombre', 'Mapa B154'); pg68.fill('#ini-fecha', HOY); pg68.select_option('#ini-programa', 'p-refor'); pg68.select_option('#ini-origen','PROGRAMADA'); pg68.fill('#ini-meta', '3')
    pg68.evaluate("document.getElementById('form-iniciar-jornada').requestSubmit()")
    esperar(pg68, "!!SRP.activa.jornada && !document.getElementById('btn-ubicacion').disabled", 5000); pg68.wait_for_timeout(500)
    PUNTOS68 = "document.querySelectorAll('#mapa .punto-plantado').length"
    ok(pg68.is_visible('#btn-franja-editar') and 'Editar jornada' in pg68.inner_text('#btn-franja-editar') and 'btn-editar' in pg68.get_attribute('#btn-franja-editar', 'class'),
       'la franja de la jornada activa trae «Editar jornada», con el color de editar')
    ok(pg68.evaluate(PUNTOS68) == 0 and not pg68.is_visible('#mapa-plantados'), 'sin árboles en la jornada, el mapa de registro no trae puntos ni su renglón')
    def arbol68(lat):
        ctx68.set_geolocation({'latitude': lat, 'longitude': -99.1332, 'accuracy': 5})
        previo = pg68.evaluate("SRP.formulario.estado.ultimoGuardado")
        pg68.click('#btn-ubicacion'); pg68.wait_for_timeout(900)
        if not pg68.evaluate("!!SRP.formulario.estado.especieId"):
            pg68.fill('#campo-especie', 'fres'); pg68.wait_for_timeout(200); pg68.dispatch_event('.combo-opcion[data-id="ESP-0029"]', 'mousedown'); pg68.wait_for_timeout(150)
        pg68.click('#form-plantacion button[type=submit]')
        visto = {'completa': None}
        for _ in range(60):
            pg68.wait_for_timeout(150)
            if pg68.is_visible('#dlg-resumen'): pg68.click('#btn-resumen-guardar'); esperar(pg68, "!document.getElementById('dlg-resumen').open", 6000); continue
            if pg68.evaluate("p => SRP.formulario.estado.ultimoGuardado !== p && !document.querySelector('dialog[open]')", previo): break
        visto['confirmacion'] = pg68.is_visible('#confirmacion-guardado')
        visto['completa'] = pg68.inner_text('#confirmacion-completa') if pg68.is_visible('#confirmacion-completa') else ''
        pg68.wait_for_timeout(300)
        return pg68.evaluate("SRP.formulario.estado.ultimoGuardado"), visto
    a68, v1 = arbol68(19.43260)
    ok(pg68.evaluate(PUNTOS68) == 1 and pg68.evaluate("SRP.mapa.marcador === null") and '1 árbol ya registrado' in pg68.inner_text('#mapa-plantados-texto') and not pg68.is_visible('#btn-plantado-ver'),
       'al guardar, el árbol queda en el mapa como punto, sin marcador, y el renglón dice cuántos hay: %s' % pg68.inner_text('#mapa-plantados-texto'))
    ok(v1['confirmacion'] and v1['completa'] == '', 'con 1 de 3 la confirmación de guardado no habla de la jornada completa')
    b68, v2 = arbol68(19.43267)
    ok(pg68.evaluate(PUNTOS68) == 2 and v2['completa'] == '', 'el segundo árbol suma su punto: %s' % pg68.evaluate(PUNTOS68))
    # Tocar un punto dice qué árbol es y no mueve ni pone el marcador
    pg68.evaluate("id => SRP.mapa.plantados[id].marcador.getElement().click()", a68); pg68.wait_for_timeout(300)
    r68 = pg68.inner_text('#mapa-plantados-texto')
    ok('Fresno' in r68 and 'plantado el' in r68 and pg68.is_visible('#btn-plantado-ver') and pg68.evaluate("SRP.mapa.lat === null && SRP.mapa.marcador === null"),
       'tocar un punto dice qué árbol es y no coloca el marcador: %s' % r68)
    ok(pg68.evaluate("(() => { const t = document.querySelector('#mapa .etiqueta-plantado'); return !!t && /Fresno/.test(t.textContent); })()"), 'el punto elegido enseña su etiqueta sobre el mapa')
    pg68.click('#btn-plantado-ver'); esperar(pg68, "document.getElementById('dlg-detalle').open", 4000); pg68.wait_for_timeout(400)
    ok(pg68.evaluate("document.getElementById('dlg-detalle').open") and 'Fresno' in pg68.inner_text('#dlg-detalle'), '«Ver» abre la ficha de ese árbol sin salir de «Nuevo registro»')
    pg68.evaluate("document.getElementById('dlg-detalle').close()"); pg68.wait_for_timeout(200)
    ok(pg68.evaluate("SRP.app.vista") == 'registrar', 'al cerrar la ficha se sigue en «Nuevo registro»')
    # Editar la jornada desde la franja: mismo formulario, y se queda donde estaba
    pg68.click('#btn-franja-editar'); esperar(pg68, "document.getElementById('dlg-editar-jornada').open", 4000)
    ok(pg68.input_value('#ej-nombre') == 'Mapa B154' and pg68.input_value('#ej-meta') == '3', 'el botón abre «Editar jornada» con los datos de la jornada activa')
    pg68.fill('#ej-nombre', 'Mapa B154 corregida'); pg68.click('#btn-ej-guardar')
    esperar(pg68, "!document.getElementById('dlg-editar-jornada').open", 5000); pg68.wait_for_timeout(500)
    ok(pg68.evaluate("SRP.app.vista") == 'registrar' and 'Mapa B154 corregida' in pg68.text_content('#franja-jornada-texto') and pg68.evaluate("SRP.activa.jornada.nombre") == 'Mapa B154 corregida' and pg68.evaluate(PUNTOS68) == 2,
       'al guardar se sigue en «Nuevo registro», con la franja y los puntos al día: %s' % pg68.text_content('#franja-jornada-texto')[:60])
    bit68 = pg68.evaluate("(async () => (await SRP.almacen.todos('bitacora')).filter(x => x.entidad === 'jornada' && x.accion === 'EDITADO').map(x => x.detalle))()")
    ok(any('nombre' in t for t in bit68), 'la edición desde la franja deja su renglón de bitácora: %s' % bit68)
    # El tercer árbol completa lo previsto: lo dice la misma confirmación y queda escrito en la franja
    c68, v3 = arbol68(19.43272)
    ok(v3['confirmacion'] and '3 árboles previstos' in v3['completa'], 'al llegar a lo previsto, la confirmación de guardado lo dice en su segundo renglón: «%s»' % v3['completa'])
    ok(pg68.is_visible('#franja-siguiente') and 'Se plantó lo previsto: 3 de 3' in pg68.inner_text('#franja-siguiente') and pg68.is_visible('#franja-guardado'),
       'la franja deja escrito que se plantó lo previsto, junto a la franja «Guardado»')
    pg68.wait_for_timeout(4200)
    ok(not pg68.is_visible('#confirmacion-guardado'), 'la confirmación de jornada completa también se cierra sola')
    d68, v4 = arbol68(19.43278)
    ok(v4['completa'] == '' and 'Van 4 árboles: 1 más de los 3 previstos' in pg68.inner_text('#franja-siguiente'), 'pasado lo previsto no se repite el aviso; la franja dice cuántos van de más: %s' % pg68.inner_text('#franja-siguiente'))
    # Al corregir un árbol, el mapa enseña los demás de su jornada; al eliminar uno, su punto se va
    pg68.evaluate("async id => SRP.formulario.editar(await SRP.almacen.uno('plantaciones', id))", b68); pg68.wait_for_timeout(900)
    ok(pg68.evaluate(PUNTOS68) == 3 and pg68.evaluate("id => !SRP.mapa.plantados[id]", b68) and pg68.evaluate("SRP.mapa.marcador !== null") and not pg68.is_visible('#btn-franja-editar'),
       'al corregir un árbol se ven los otros tres como puntos y el suyo con marcador')
    pg68.click('#btn-cancelar-edicion'); pg68.wait_for_timeout(600)
    pg68.evaluate("SRP.app.mostrarVista('registrar')"); pg68.wait_for_timeout(700)
    pg68.evaluate("async id => { await SRP.registros.eliminar(await SRP.almacen.uno('plantaciones', id)); }", d68); pg68.wait_for_timeout(800)
    ok(pg68.evaluate(PUNTOS68) == 3 and 'Se plantó lo previsto: 3 de 3' in pg68.inner_text('#franja-siguiente'), 'al eliminar un árbol desde «Nuevo registro» su punto sale del mapa y la franja vuelve a contar: %s' % pg68.evaluate(PUNTOS68))
    ok(pg68.evaluate("document.documentElement.scrollWidth <= window.innerWidth + 1"), 'con los tres botones de la franja, la pantalla del teléfono no se desborda')
    ok(pg68.evaluate("""(() => { const b = [...document.querySelectorAll('#franja-jornada-acciones .btn')].map(x => x.getBoundingClientRect()); return b.length === 3 && Math.abs(b[0].top - b[1].top) < 2 && b[0].height < 60 && b[1].height < 60 && b[2].top > b[0].bottom; })()"""),
       'en teléfono, «Editar jornada» y «Cambiar jornada» van en un renglón sin partirse y «Cerrar jornada» debajo')
    # Ficha del registro en computadora: «Editar» y «Sustituir árbol» uno junto al otro; sustitución con calendario al tocar el campo y «Hoy»
    pg68.set_viewport_size({'width': 1280, 'height': 900}); pg68.wait_for_timeout(300)
    pg68.evaluate("async id => SRP.registros.verDetalle(await SRP.almacen.uno('plantaciones', id))", a68); esperar(pg68, "document.getElementById('dlg-detalle').open", 4000); pg68.wait_for_timeout(500)
    pie68 = pg68.evaluate("(() => { const e = document.getElementById('btn-detalle-editar').getBoundingClientRect(), s = document.getElementById('btn-detalle-sustituir').getBoundingClientRect(); return [Math.abs(e.top - s.top) < 2, s.left - e.right]; })()")
    ok(pie68[0] and pie68[1] >= 6, 'en la ficha del registro, «Editar» y «Sustituir árbol» van uno junto al otro, separados: %s' % pie68)
    pg68.click('#btn-detalle-sustituir'); esperar(pg68, "document.getElementById('dlg-sustituir').open", 4000)
    sf68 = pg68.evaluate("(() => { const f = document.getElementById('sustituir-fecha'); return [f.disabled, document.getElementById('btn-sustituir-hoy').hidden, getComputedStyle(f).cursor, [...document.styleSheets].some(h => [...h.cssRules].some(r => /fecha-con-hoy.*calendar-picker-indicator/.test(r.selectorText || '') && r.style.display === 'none')) ? 'none' : 'visible', f.min, f.max]; })()")
    ok(sf68 == [False, False, 'pointer', 'none', HOY, HOY], 'la fecha de la sustitución se elige tocando el campo, sin botón de calendario, con «Hoy» al lado y sólo los días válidos: %s' % sf68)
    pg68.fill('#sustituir-fecha', ''); pg68.click('#btn-sustituir-hoy')
    ok(pg68.input_value('#sustituir-fecha') == HOY, '«Hoy» pone la fecha de hoy en la sustitución')
    pg68.click('#btn-sustituir-cerrar'); pg68.wait_for_timeout(200)
    ok(not err68, 'sin errores en consola: %s' % err68[:2])
    ctx68.close()

    # ---------- ctx69: orden de las listas, sustituciones en la tarjeta, varios coordinadores por cabo y mapa de colonias intervenidas
    ctx69 = b.new_context(viewport={'width':1280,'height':900}, timezone_id='America/Mexico_City', geolocation={'latitude':19.4326,'longitude':-99.1332,'accuracy':5}, permissions=['geolocation'])
    pg69 = ctx69.new_page(); err69 = []
    pg69.on('pageerror', lambda e: err69.append(str(e))); pg69.on('console', lambda m: m.type=='error' and 'net::' not in m.text and 'Failed to load' not in m.text and err69.append(m.text))
    pg69.goto(BASE); pg69.wait_for_timeout(1200)
    def entrar69(uid):
        pg69.evaluate("SRP.sesion.cerrar(); SRP.app.mostrarAcceso()"); pg69.wait_for_timeout(300)
        pg69.select_option('#sel-usuario-prueba', uid); pg69.click('#btn-entrar-prueba'); pg69.wait_for_timeout(800)
    pg69.select_option('#sel-usuario-prueba', 'u-cabo-1'); pg69.click('#btn-entrar-prueba'); pg69.wait_for_timeout(900)
    AYER69 = (datetime.date.today() - datetime.timedelta(days=1)).isoformat()
    # Dos jornadas de días distintos, con dos árboles la primera y uno la segunda, guardados con el propio almacén
    pg69.evaluate("""async ([hoy, ayer]) => {
      const base = { cabo_id: 'u-cabo-1', organizacion_id: 'o-sedema', programa_id: 'p-refor', estatus: 'cerrada', arboles_previstos: 2, comentarios: '', ubicacion: '', puntos_revisados: [], alcaldia: 'Cuauhtémoc' };
      await SRP.almacen.guardarConBitacora('jornadas', Object.assign({}, base, { id: 'j69-a', nombre: 'Orden ayer', fecha: ayer, fecha_inicio: ayer + 'T15:00:00.000Z', fecha_cierre: ayer + 'T17:00:00.000Z' }), null);
      await SRP.almacen.guardarConBitacora('jornadas', Object.assign({}, base, { id: 'j69-b', nombre: 'Orden hoy', fecha: hoy, fecha_inicio: hoy + 'T15:00:00.000Z', fecha_cierre: hoy + 'T17:00:00.000Z' }), null);
      const arbol = (id, j, f, lat, extra) => SRP.almacen.guardarConBitacora('plantaciones', Object.assign({ id, jornada_id: j, estatus: 'activo', cabo_id: 'u-cabo-1', lat, lng: -99.1332, especie_id: 'ESP-0029', especie_otra: '',
        fecha_plantacion: f, fecha_registro: f + 'T16:0' + id.slice(-1) + ':00.000Z', programa_id: 'p-refor', alcaldia: 'Cuauhtémoc', colonia: '', punto_origen: 'gps', precision_gps: 5, comentarios: '', foto_base64: '' }, extra || {}), null);
      await arbol('a69-1', 'j69-a', ayer, 19.43260); await arbol('a69-2', 'j69-a', ayer, 19.43270, { sustituye_id: 'a69-0', motivo_sustitucion: 'ROBO' });
      await arbol('a69-3', 'j69-b', hoy, 19.43280);
    }""", [HOY, AYER69])
    pg69.evaluate("localStorage.removeItem('srp_orden_jornadas'); localStorage.removeItem('srp_orden_registros'); SRP.app.mostrarVista('jornadas')"); pg69.wait_for_timeout(1200)
    NOM69 = "[...document.querySelectorAll('#lista-jornadas .jornada-sitio')].map(e => e.textContent)"
    ok(pg69.evaluate(NOM69) == ['Orden hoy', 'Orden ayer'] and pg69.input_value('#jornadas-orden select') == 'reciente' and pg69.inner_text('#jornadas-orden label') == 'Ordenar',
       'Jornadas llega con lo más reciente primero y trae su lista «Ordenar»: %s' % pg69.evaluate(NOM69))
    pg69.select_option('#jornadas-orden select', 'antiguo'); pg69.wait_for_timeout(900)
    ok(pg69.evaluate(NOM69) == ['Orden ayer', 'Orden hoy'], 'con «Lo más antiguo primero» la lista se invierte: %s' % pg69.evaluate(NOM69))
    pg69.evaluate("SRP.app.mostrarVista('registros')"); pg69.wait_for_timeout(900)
    pg69.evaluate("SRP.app.mostrarVista('jornadas')"); pg69.wait_for_timeout(900)
    ok(pg69.evaluate(NOM69) == ['Orden ayer', 'Orden hoy'] and pg69.input_value('#jornadas-orden select') == 'antiguo' and not pg69.is_visible('#jornada-quitar'),
       'el orden elegido se conserva al volver y no cuenta como filtro')
    pg69.select_option('#jornadas-orden select', 'reciente'); pg69.wait_for_timeout(700)
    # La tarjeta cuenta las sustituciones
    c69 = pg69.evaluate("[...document.querySelectorAll('#lista-jornadas .jornada')].map(l => [l.querySelector('.jornada-sitio').textContent, [...l.querySelectorAll('.jornada-marcas .insignia-jornada')].map(c => c.textContent.trim())])")
    ok(not any('sustituci' in x for x in c69[0][1]) and '1 sustitución' in c69[1][1], 'la tarjeta de la jornada marca las sustituciones sólo cuando las hubo: %s' % [x[1] for x in c69])
    ok(pg69.evaluate("(() => { const l = [...document.querySelectorAll('#lista-jornadas .jornada')][0]; const a = l.querySelector('.jornada-avance-cifra').getBoundingClientRect(), e = l.querySelector('.jornada-avance-especies').getBoundingClientRect(), b = l.querySelector('.jornada-barra').getBoundingClientRect(); return Math.abs(a.bottom - e.bottom) < 8 && e.left > a.left && b.top >= a.bottom - 1 && b.width > 200; })()"),
       'en computadora el avance va en un renglón, con las especies a la derecha y la barra debajo')
    # Registros también se ordena
    pg69.evaluate("SRP.app.mostrarVista('registros')"); pg69.wait_for_timeout(900)
    R69 = "SRP.util.paginar(SRP.util.ordenar(SRP.registros.filtrados, 'registros'), 1, 'registros-paginas').items.map(r => r.id)"
    r1 = pg69.evaluate(R69); pg69.select_option('#registros-orden select', 'antiguo'); pg69.wait_for_timeout(600); r2 = pg69.evaluate(R69)
    ok(r1 == ['a69-3', 'a69-2', 'a69-1'] and r2 == ['a69-1', 'a69-2', 'a69-3'], 'Registros se ordena de lo más reciente a lo más antiguo y a la inversa: %s → %s' % (r1, r2))
    pg69.select_option('#registros-orden select', 'reciente'); pg69.wait_for_timeout(300)
    # Reportes y Fotografías traen la misma lista
    # Usuarios: etiquetas y un cabo con más de un coordinador
    entrar69('u-admin-1'); pg69.evaluate("SRP.app.mostrarVista('usuarios')"); pg69.wait_for_timeout(700)
    cab69 = pg69.eval_on_selector_all('#tabla-usuarios thead th', 'l => l.map(x => x.textContent.trim())')
    ok('Cargo' in cab69 and 'Perfil de captura' in cab69 and 'Coordinadores' in cab69 and 'Cargo y rol' not in cab69 and pg69.inner_text('label[for=usr-filtro-perfil]') == 'Perfil de captura',
       'Usuarios dice «Cargo», «Perfil de captura» y «Coordinadores»: %s' % cab69)
    def alta69(nombre, correo, perfil, coords=()):
        pg69.click('#btn-usr-agregar'); pg69.wait_for_timeout(300)
        pg69.select_option('#usr-tipo-org', 'Gobierno de la CDMX'); pg69.wait_for_timeout(150); pg69.select_option('#usr-organizacion', 'o-sedema'); pg69.wait_for_timeout(150)
        pg69.select_option('#usr-area', 'a-dgsanpava'); pg69.fill('#usr-nombre-completo', nombre); pg69.fill('#usr-correo', correo); pg69.fill('#usr-cargo', 'Cuadrilla')
        pg69.select_option('#usr-perfil', perfil); pg69.wait_for_timeout(200)
        for c in coords: pg69.click('#usr-coordinadores .chip[data-id="%s"]' % c)
    alta69('Segunda Coordinación Ejemplo', 'coordinacion.dos@ejemplo.local', 'COORDINADOR')
    et69 = [pg69.inner_text('label[for=usr-cargo]'), pg69.inner_text('label[for=usr-perfil]')]
    pg69.click('#form-usuario button[type=submit]'); pg69.wait_for_timeout(700)
    c2 = pg69.evaluate("SRP.ref.usuarios.find(u => u.correo === 'coordinacion.dos@ejemplo.local').id")
    ok(et69[0].startswith('Cargo') and 'rol' not in et69[0] and et69[1].startswith('Perfil de captura'), 'el alta dice «Cargo» y «Perfil de captura»: %s' % et69)
    alta69('Cabo Compartido Ejemplo', 'cabo.compartido@ejemplo.local', 'CABO')
    n0 = pg69.inner_text('#usr-coordinadores-nota')
    pg69.click('#usr-coordinadores .chip[data-id="u-coord-1"]'); n1 = pg69.inner_text('#usr-coordinadores-nota')
    pg69.click('#usr-coordinadores .chip[data-id="%s"]' % c2); n2 = pg69.inner_text('#usr-coordinadores-nota')
    pg69.click('#form-usuario button[type=submit]'); pg69.wait_for_timeout(700)
    cc69 = pg69.evaluate("(() => { const u = SRP.ref.usuarios.find(x => x.correo === 'cabo.compartido@ejemplo.local'); return u ? [u.id, u.coordinadores_ids.slice().sort(), 'coordinador_id' in u] : null; })()")
    ok(n0.startswith('Sin coordinador asignado') and n1.startswith('1 coordinador asignado') and n2.startswith('2 coordinadores asignados') and cc69 and cc69[1] == sorted(['u-coord-1', c2]) and cc69[2] is False,
       'un cabo puede tener más de un coordinador: se marcan en la lista y se guardan todos: %s' % (cc69 and cc69[1]))
    fila69 = pg69.evaluate("id => [...document.querySelector('#tabla-usuarios tr[data-id=\"' + id + '\"]').querySelectorAll('td')].find(td => td.dataset.etiqueta === 'Coordinadores').textContent", cc69[0])
    ok('Segunda Coordinación Ejemplo' in fila69 and ',' in fila69, 'la tabla de Usuarios enumera a sus coordinadores: %s' % fila69)
    # Los dos coordinadores alcanzan lo del cabo y lo tienen en su cuadrilla
    al69 = pg69.evaluate("""([cabo, c2]) => { const P = SRP.ref.usuarioPorId, r = { cabo_id: cabo };
      return [SRP.permisos.alcanza(P['u-coord-1'], r, P), SRP.permisos.alcanza(P[c2], r, P), SRP.permisos.alcanza(P['u-coord-alc'], r, P),
        SRP.indicadores.cabosAsignados(P['u-coord-1']).includes(cabo), SRP.indicadores.cabosAsignados(P[c2]).includes(cabo), SRP.indicadores.cabosAsignados(P[c2]).length]; }""", [cc69[0], c2])
    ok(al69 == [True, True, False, True, True, 1], 'cada coordinador del cabo ve sus registros y lo cuenta en su cuadrilla; uno de otra institución, no: %s' % al69)
    # Editar: quitar un coordinador deja el otro, con su renglón de bitácora
    pg69.evaluate("id => SRP.usuarios.abrirFormulario(SRP.ref.usuarioPorId[id])", cc69[0]); pg69.wait_for_timeout(400)
    ed69 = pg69.eval_on_selector_all('#usr-coordinadores .chip[aria-pressed="true"]', 'l => l.map(x => x.dataset.id).sort()')
    pg69.click('#usr-coordinadores .chip[data-id="u-coord-1"]'); pg69.click('#form-usuario button[type=submit]'); pg69.wait_for_timeout(700)
    q69 = pg69.evaluate("""async id => [SRP.ref.usuarioPorId[id].coordinadores_ids, (await SRP.almacen.todos('bitacora')).filter(x => x.entidad === 'usuario' && x.entidad_id === id && x.accion === 'EDITADO').map(x => x.detalle)]""", cc69[0])
    ok(ed69 == sorted(['u-coord-1', c2]) and q69[0] == [c2] and any('coordinadores_ids' in t for t in q69[1]), 'al editar aparecen marcados sus coordinadores; quitar uno deja al otro y queda en la bitácora: %s' % q69)
    # Una cuenta guardada con un solo coordinador pasa a la lista al abrir
    v69 = pg69.evaluate("""async () => { const u = Object.assign({}, SRP.ref.usuarioPorId['u-cabo-1']); delete u.coordinadores_ids; u.coordinador_id = 'u-coord-1';
      await SRP.almacen.guardarConBitacora('usuarios', u, null); await SRP.almacen.normalizar(); const d = await SRP.almacen.uno('usuarios', 'u-cabo-1'); return [d.coordinadores_ids, 'coordinador_id' in d]; }""")
    ok(v69 == [['u-coord-1'], False], 'una cuenta con el campo anterior de un solo coordinador pasa a la lista al abrir la base: %s' % v69)
    pg69.evaluate("SRP.ref.recargar()"); pg69.wait_for_timeout(300)
    # Supervisión: el mapa de prioridad pinta sólo las colonias donde se plantó
    entrar69('u-coord-1'); pg69.evaluate("SRP.app.mostrarVista('supervision')"); pg69.wait_for_timeout(1500)
    abrir_sup(pg69)
    pg69.click('#sup-tipos .chip[data-tipo=anio]'); pg69.wait_for_timeout(1500)
    m69 = pg69.evaluate("""() => { const p = SRP.supervision.modelo.prioridad; const tr = document.querySelectorAll('#sup-mapa-prioridad path.pri-colonia');
      const capa = SRP.prioritarias.capas.get(SRP.supervision.mapaPrioridad); const eti = []; capa.eachLayer(l => eti.push(l.getTooltip().getContent()));
      return { col: Object.keys(p.colonias).length, suma: Object.values(p.colonias).reduce((a, b) => a + b, 0), conDato: p.niveles.reduce((a, x) => a + x.n, 0), trazos: tr.length, eti, nota: document.getElementById('sup-prioridad-colonias').textContent,
        contorno: document.querySelectorAll('#sup-mapa-prioridad path.pri-contorno').length }; }""")
    ok(m69['col'] == m69['trazos'] == 1 and m69['suma'] == m69['conDato'] == 3 and '3 árboles' in m69['eti'][0] and 'prioridad' in m69['eti'][0] and m69['contorno'] >= 16 and 'Se pinta la colonia donde se plantó' in m69['nota'],
       'el mapa de prioridad pinta sólo la colonia intervenida, con su color, y su etiqueta dice cuántos árboles: %s' % m69['eti'])
    ok(not err69, 'sin errores en consola: %s' % err69[:2])
    ctx69.close()

    # ---------- ctx70: el reporte en la ficha de la jornada y las fotografías del cabo
    ctx70 = b.new_context(viewport={'width':390,'height':844}, timezone_id='America/Mexico_City', geolocation={'latitude':19.4326,'longitude':-99.1332,'accuracy':5}, permissions=['geolocation'], accept_downloads=True)
    pg70 = ctx70.new_page(); err70 = []
    pg70.on('pageerror', lambda e: err70.append(str(e))); pg70.on('console', lambda m: m.type=='error' and 'net::' not in m.text and 'Failed to load' not in m.text and err70.append(m.text))
    pg70.goto(BASE); pg70.wait_for_timeout(1200)
    pg70.select_option('#sel-usuario-prueba', 'u-cabo-1'); pg70.click('#btn-entrar-prueba'); pg70.wait_for_timeout(900)
    FOTO70 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=='
    pg70.evaluate("""async ([hoy, foto]) => {
      const base = { organizacion_id: 'o-sedema', programa_id: 'p-refor', estatus: 'cerrada', arboles_previstos: 1, comentarios: '', ubicacion: '', puntos_revisados: [], alcaldia: 'Cuauhtémoc', fecha: hoy, fecha_inicio: hoy + 'T15:00:00.000Z', fecha_cierre: hoy + 'T17:00:00.000Z' };
      await SRP.almacen.guardarConBitacora('jornadas', Object.assign({}, base, { id: 'j70-a', nombre: 'Reporte en ficha', cabo_id: 'u-cabo-1' }), null);
      await SRP.almacen.guardarConBitacora('jornadas', Object.assign({}, base, { id: 'j70-b', nombre: 'De otro cabo', cabo_id: 'u-cabo-alc', organizacion_id: 'o-alc-09007' }), null);
      const arbol = (id, j, cabo, f) => SRP.almacen.guardarConBitacora('plantaciones', { id, jornada_id: j, estatus: 'activo', cabo_id: cabo, lat: 19.4326, lng: -99.1332, especie_id: 'ESP-0029', especie_otra: '',
        fecha_plantacion: hoy, fecha_registro: hoy + 'T16:00:00.000Z', programa_id: 'p-refor', alcaldia: 'Cuauhtémoc', colonia: '', punto_origen: 'gps', gps_precision_m: 5, comentarios: '', foto_base64: f }, null);
      await arbol('a70-1', 'j70-a', 'u-cabo-1', foto); await arbol('a70-2', 'j70-b', 'u-cabo-alc', foto);
    }""", [HOY, FOTO70])
    # Sin pestaña Reportes: la ficha de la jornada genera el reporte
    nav70 = pg70.evaluate("[...document.querySelectorAll('#navegacion .pestana')].filter(b => !b.hidden).map(b => b.textContent.trim())")
    ok(nav70 == ['Nuevo registro', 'Jornadas', 'Registros', 'Mi avance'], 'el cabo tiene cuatro secciones; Reportes ya no es una de ellas: %s' % nav70)
    pg70.evaluate("SRP.app.mostrarVista('jornadas')"); pg70.wait_for_timeout(1000)
    t70 = pg70.evaluate("[...document.querySelectorAll('#lista-jornadas .jornada')].map(l => [l.querySelector('.jornada-sitio').textContent, (l.querySelector('.insignia-reporte') || {}).textContent || ''])")
    ok(t70 == [['Reporte en ficha', 'Sin reporte todavía']], 'la tarjeta de la jornada cerrada dice que aún no tiene reporte: %s' % t70)
    pg70.click('#lista-jornadas .jornada button'); pg70.wait_for_timeout(1200)
    b70 = pg70.evaluate("(() => { const b = document.getElementById('btn-jornada-reporte'); return [b.hidden, b.textContent.trim()]; })()")
    pg70.click('#btn-jornada-reporte'); pg70.wait_for_timeout(600)
    ok(b70 == [False, 'Generar reporte'] and pg70.is_visible('#dlg-cierre') and pg70.is_visible('#vista-jornadas') and 'Reporte en ficha' in pg70.inner_text('#dlg-cierre-dia'),
       'la ficha de la jornada trae «Generar reporte», que abre los datos del cierre sin salir de Jornadas')
    pg70.fill('#cie-hora', '12:00'); pg70.click('#btn-cierre-generar'); esperar(pg70, "document.getElementById('dlg-previa').open", 8000); pg70.wait_for_timeout(600)
    with pg70.expect_download() as d70: pg70.click('#btn-previa-generar')
    esperar(pg70, "(async () => !!(await SRP.almacen.uno('jornadas', 'j70-a')).reporte_en)()", 8000); pg70.wait_for_timeout(900)
    ok(d70.value.suggested_filename.endswith('.pdf') and pg70.is_visible('#vista-jornadas') and pg70.is_visible('#jornada-detalle'), 'el PDF se entrega y se sigue en la ficha de la jornada: %s' % d70.value.suggested_filename)
    pg70.click('#btn-jornada-volver'); pg70.wait_for_timeout(900)
    ok('Reporte: hoy' in pg70.inner_text('#lista-jornadas .insignia-reporte'), 'al volver a la lista, la tarjeta dice «Reporte: hoy» y la hora: %s' % pg70.inner_text('#lista-jornadas .insignia-reporte'))
    pg70.select_option('#jornada-revision', 'sinreporte'); pg70.wait_for_timeout(800)
    sg70 = pg70.evaluate("SRP.jornadas.lista.length"); pg70.select_option('#jornada-revision', ''); pg70.wait_for_timeout(800)
    ok(sg70 == 0 and pg70.evaluate("SRP.jornadas.lista.map(j => j.id)") == ['j70-a'], 'con el reporte generado, la jornada sale de «Sin reporte todavía»')
    # Las fotografías del cabo: desde «Mi avance», sólo las suyas, con descarga
    pg70.evaluate("SRP.app.mostrarVista('supervision')"); pg70.wait_for_timeout(1200)
    abrir_sup(pg70)
    ok(pg70.is_visible('#btn-sup-fotos') and pg70.evaluate("SRP.permisos.puede('galeria.descargar')"), '«Mi avance» del cabo trae «Fotografías»')
    pg70.click('#btn-sup-fotos'); pg70.wait_for_timeout(1200)
    g70 = pg70.evaluate("[SRP.app.vista, SRP.galeria.fotos.map(r => r.id), document.getElementById('btn-galeria-volver').textContent.trim(), document.getElementById('galeria-nota').textContent, document.getElementById('btn-galeria-zip').disabled, document.getElementById('galeria-cuenta').textContent]")
    ok(g70[0] == 'galeria' and g70[1] == ['a70-1'] and g70[2] == 'Mi avance' and 'que usted registró' in g70[3] and g70[4] is False and g70[5].startswith('1 fotografía'),
       'el cabo ve sólo sus fotografías, con «Descargar todas», y el regreso dice «Mi avance»: %s' % g70[:3])
    with pg70.expect_download() as z70: pg70.click('#btn-galeria-zip')
    ok(z70.value.suggested_filename.endswith('.zip'), 'descarga sus fotografías en un ZIP: %s' % z70.value.suggested_filename)
    pg70.click('#galeria-rejilla .galeria-foto'); pg70.wait_for_timeout(600)
    ok(pg70.evaluate("!!document.querySelector('dialog[open]')"), 'y abre cada una en grande para descargarla')
    pg70.keyboard.press('Escape'); pg70.wait_for_timeout(300)
    pg70.click('#btn-galeria-volver'); pg70.wait_for_timeout(700)
    ok(pg70.evaluate("SRP.app.vista") == 'supervision', 'el regreso lleva a «Mi avance»')
    ok(pg70.evaluate("document.documentElement.scrollWidth <= window.innerWidth + 1"), 'sin desbordes en el teléfono')
    ok(not err70, 'sin errores en consola: %s' % err70[:2])
    ctx70.close()

    # ---------- ctx71: Nuevo registro compacto y tarjeta de jornada con avance ----------
    ctx71 = b.new_context(viewport={'width':390,'height':844}, geolocation={'latitude':19.357,'longitude':-99.06,'accuracy':5}, permissions=['geolocation'], timezone_id='America/Mexico_City')
    pg71 = ctx71.new_page(); pg71.on('pageerror', lambda e: errores.append('ctx71: ' + str(e)))
    pg71.goto(BASE); pg71.wait_for_timeout(1200)
    pg71.select_option('#sel-usuario-prueba', 'u-cabo-1'); pg71.click('#btn-entrar-prueba'); pg71.wait_for_timeout(700)
    iniciar_jornada(pg71, 'Compacta B157')
    # La franja: nombre, avance y acciones a la vista; el detalle, a pedido
    f71 = pg71.evaluate("(() => { const v = s => { const e = document.querySelector('#franja-jornada ' + s); return !!e && getComputedStyle(e).display !== 'none'; }; return [v('.franja-jornada-avance'), v('.franja-jornada-datos'), v('.pasos'), v('#btn-jornada-cerrar'), document.getElementById('btn-franja-detalle').textContent, document.querySelector('#franja-jornada .franja-jornada-avance').textContent.trim(), document.querySelectorAll('#franja-jornada svg.jornada-barra rect').length]; })()")
    ok(f71 == [True, False, False, True, 'Ver detalle', '0 de 10 árboles', 1], 'en teléfono la jornada activa enseña nombre, avance con su barra y acciones; fecha, lugar y pasos quedan en «Ver detalle»: %s' % f71)
    pg71.click('#btn-franja-detalle'); pg71.wait_for_timeout(150)
    g71 = pg71.evaluate("(() => { const v = s => getComputedStyle(document.querySelector('#franja-jornada ' + s)).display !== 'none'; const b = document.getElementById('btn-franja-detalle'); return [v('.franja-jornada-datos'), v('.pasos'), b.textContent, b.getAttribute('aria-expanded')]; })()")
    ok(g71 == [True, True, 'Ocultar detalle', 'true'], '«Ver detalle» despliega los datos y los pasos de la jornada: %s' % g71)
    pg71.click('#btn-franja-detalle'); pg71.wait_for_timeout(150)
    # Los datos del punto aparecen cuando hay punto
    ok(pg71.is_hidden('#campo-punto'), 'sin punto no se enseñan coordenadas, alcaldía ni colonia en blanco')
    r71 = registrar(pg71, 'ahuehu', 'ESP-0070')
    ok(bool(r71) and pg71.is_hidden('#dlg-resumen') and pg71.is_hidden('#campo-punto') and pg71.evaluate("document.querySelector('#franja-jornada .franja-jornada-avance').textContent.trim()") == '1 de 10 árboles', 'sin avisos el árbol se guarda de una vez, la franja cuenta 1 de 10 y el formulario vuelve a quedar sin punto')
    pg71.click('#btn-ubicacion'); pg71.wait_for_timeout(800)
    p71 = pg71.evaluate("(() => { const c = document.getElementById('campo-punto'), a = document.getElementById('dato-alcaldia').getBoundingClientRect(), k = document.getElementById('dato-colonia').getBoundingClientRect(); return [!c.hidden, document.getElementById('dato-alcaldia').textContent, getComputedStyle(document.querySelector('label[for=dato-alcaldia]')).position === 'absolute', c.getBoundingClientRect().height < 150]; })()")
    ok(p71[0] and p71[1] == 'Iztapalapa' and p71[2] and p71[3], 'con punto, alcaldía, colonia y coordenadas van en una ficha baja, sin rótulos a la vista: %s' % p71)
    # Un árbol lejos del resto: la revisión enseña los demás, ofrece cambiar de jornada y guardar es una decisión
    ctx71.set_geolocation({'latitude':19.29,'longitude':-99.13,'accuracy':5})
    pg71.click('#btn-ubicacion'); pg71.wait_for_timeout(800)
    pg71.fill('#campo-especie', 'aile'); pg71.wait_for_timeout(200); pg71.dispatch_event('.combo-opcion[data-id="ESP-0002"]', 'mousedown'); pg71.wait_for_timeout(150)
    pg71.click('#form-plantacion button[type=submit]'); pg71.wait_for_timeout(1200)
    l71 = [pg71.is_visible('#dlg-resumen'), pg71.inner_text('#btn-resumen-guardar').strip(), pg71.is_visible('#btn-resumen-cambiar'), pg71.inner_text('#btn-resumen-cambiar').strip(), pg71.locator('#revision-mapa .revision-otro').count(), 'cambie de jornada' in pg71.inner_text('#revision-avisos')]
    ok(l71 == [True, 'Guardar de todos modos', True, 'Cambiar jornada', 1, True], 'lejos de los demás, la revisión pinta el otro árbol en el mapa, ofrece «Cambiar jornada» y el botón dice «Guardar de todos modos»: %s' % l71)
    pg71.click('#btn-resumen-cambiar'); pg71.wait_for_timeout(500)
    ok(pg71.is_hidden('#dlg-resumen') and pg71.is_visible('#dlg-cambiar-jornada') and pg71.evaluate("SRP.formulario.estado.especieId") == 'ESP-0002', '«Cambiar jornada» cierra la revisión y abre el cambio, con el árbol todavía en el formulario')
    pg71.click('#btn-cambiar-cerrar'); pg71.wait_for_timeout(300)
    # Al editar, la revisión conserva «Guardar» y no ofrece cambiar de jornada
    pg71.evaluate("SRP.formulario.limpiar()"); pg71.wait_for_timeout(200)
    pg71.click('#btn-guardado-corregir'); pg71.wait_for_timeout(700)
    pg71.click('#form-plantacion button[type=submit]'); pg71.wait_for_timeout(1000)
    ok(pg71.is_visible('#dlg-resumen') and pg71.inner_text('#btn-resumen-guardar').strip() == 'Guardar' and pg71.is_hidden('#btn-resumen-cambiar'), 'al corregir un árbol la revisión dice «Guardar» y no ofrece cambiar de jornada')
    pg71.click('#btn-resumen-cerrar'); pg71.wait_for_timeout(200)
    ctx71.close()

    # ---------- ctx72: perfil Directivo: ve y descarga, no registra ni modifica; fuera de la Secretaría, sólo su institución ----------
    ctx72 = b.new_context(viewport={'width':1280,'height':900}, geolocation={'latitude':19.357,'longitude':-99.06,'accuracy':5}, permissions=['geolocation'], timezone_id='America/Mexico_City', accept_downloads=True)
    pg72 = ctx72.new_page(); pg72.on('pageerror', lambda e: errores.append('ctx72: ' + str(e)))
    pg72.goto(BASE); pg72.wait_for_timeout(1200)
    def entrar72(uid):
        if pg72.is_visible('#btn-cuenta'): pg72.click('#btn-cuenta'); pg72.click('#btn-cambiar-perfil'); pg72.wait_for_timeout(300)
        pg72.select_option('#sel-usuario-prueba', uid); pg72.click('#btn-entrar-prueba'); pg72.wait_for_timeout(700)
    def jornada72(uid, nombre):
        entrar72(uid); iniciar_jornada(pg72, nombre); registrar(pg72, 'ahuehu', 'ESP-0070')
        return pg72.evaluate("async () => { const j = SRP.activa.jornada; await SRP.activa.cambiarEstatus(j, 'cerrada'); SRP.activa.jornada = null; return j.id; }")
    js72 = jornada72('u-cabo-1', 'Directivo Secretaría B158'); ja72 = jornada72('u-cabo-alc', 'Directivo alcaldía B158')
    # La jornada de la Secretaría ya tiene reporte; la de la alcaldía, no
    pg72.evaluate("async id => { const j = await SRP.almacen.uno('jornadas', id); await SRP.almacen.guardarConBitacora('jornadas', Object.assign({}, j, { reporte_en: '2026-10-01T18:00:00.000Z' }), SRP.bitacora.entrada('EDITADO', 'jornada', id, 'Reporte generado')); }", js72)
    entrar72('u-dir-1')
    d72 = pg72.evaluate("""(() => { const p = SRP.permisos, u = SRP.sesion.usuario, nav = document.getElementById('navegacion');
      return { etiqueta: p.de(u).etiqueta, alcance: p.de(u).alcance, vista: SRP.app.vista, registrar: nav.querySelector('[data-vista=registrar]').hidden,
        puede: ['registro.crear', 'jornada.crear', 'catalogo.administrar', 'usuario.administrar', 'carga.masiva'].map(a => p.puede(a)), fotos: p.puede('galeria.descargar'), config: document.getElementById('btn-ir-configuracion').hidden }; })()""")
    ok(d72 == {'etiqueta':'Directivo','alcance':'todos','vista':'supervision','registrar':True,'puede':[False]*5,'fotos':True,'config':True},
       'el directivo de la Secretaría entra a Supervisión, ve toda la Ciudad, no tiene «Nuevo registro» ni Configuración y sí Fotografías: %s' % d72)
    pg72.evaluate("SRP.app.mostrarVista('jornadas')"); pg72.wait_for_timeout(700); pg72.evaluate("SRP.jornadas.aplicarAtajo('todas')"); pg72.wait_for_timeout(500)
    n72 = pg72.evaluate("[SRP.jornadas._todas.map(j => j.nombre).sort(), SRP.jornadas._todas.every(j => !SRP.permisos.puede('jornada.editar', j.dato) && !SRP.permisos.puede('jornada.eliminar', j.dato)), !document.getElementById('caja-jornada-org') || true]")
    ok(n72[0] == ['Directivo Secretaría B158', 'Directivo alcaldía B158'] and n72[1], 've las jornadas de todas las instituciones y no puede modificar ninguna: %s' % n72[0])
    pg72.click('#lista-jornadas .jornada:has-text("Directivo alcaldía B158") button'); pg72.wait_for_timeout(900)
    s72 = pg72.evaluate("['btn-jornada-reporte', 'btn-jornada-editar', 'btn-jornada-estado', 'btn-jornada-faltante', 'btn-jornada-siguiente'].map(id => { const e = document.getElementById(id); return !e || e.hidden || !e.offsetParent; })")
    ok(all(s72), 'en una jornada sin reporte el directivo no tiene nada que generar, editar, cerrar ni registrar: %s' % s72)
    pg72.evaluate("SRP.app.mostrarVista('jornadas')"); pg72.wait_for_timeout(600)
    pg72.click('#lista-jornadas .jornada:has-text("Directivo Secretaría B158") button'); pg72.wait_for_timeout(900)
    ok(pg72.is_visible('#btn-jornada-reporte') and pg72.inner_text('#btn-jornada-reporte').strip() == 'Descargar reporte' and pg72.is_hidden('#btn-jornada-editar'), 'en una jornada con reporte el botón dice «Descargar reporte»')
    pg72.click('#btn-jornada-reporte'); pg72.wait_for_timeout(900)
    ok(pg72.is_visible('#dlg-previa') and pg72.is_hidden('#dlg-cierre') and pg72.is_hidden('#btn-previa-corregir') and pg72.inner_text('#btn-previa-generar').strip() == 'Descargar PDF', 'abre la vista previa sin pasar por el cierre, sin «Corregir datos de cierre» y con «Descargar PDF»')
    antes72 = pg72.evaluate("async id => [(await SRP.almacen.uno('jornadas', id)).reporte_en, (await SRP.almacen.todos('bitacora')).length]", js72)
    with pg72.expect_download(timeout=60000) as dl72: pg72.click('#btn-previa-generar')
    pg72.wait_for_timeout(800)
    despues72 = pg72.evaluate("async id => [(await SRP.almacen.uno('jornadas', id)).reporte_en, (await SRP.almacen.todos('bitacora')).length]", js72)
    ok(dl72.value.suggested_filename.endswith('.pdf') and antes72 == despues72 and 'Reporte descargado' in pg72.inner_text('#aviso'), 'descarga el PDF y la jornada no cambia: ni la fecha del reporte ni el historial: %s' % despues72)
    # Registros: ve todo, sin editar ni eliminar
    pg72.evaluate("SRP.app.mostrarVista('registros')"); pg72.wait_for_timeout(800)
    r72 = pg72.evaluate("[document.getElementById('titulo-registros') ? document.getElementById('titulo-registros').textContent : '', SRP.registros.visibles.length, SRP.registros.visibles.some(r => SRP.permisos.puede('registro.editar', r) || SRP.permisos.puede('registro.eliminar', r) || SRP.permisos.puede('registro.sustituir', r))]")
    ok(r72[1] == 2 and r72[2] is False, 've los dos árboles y no puede editar, eliminar ni sustituir ninguno: %s' % r72)
    # El directivo de una alcaldía: sólo lo de su institución
    entrar72('u-dir-alc')
    pg72.evaluate("SRP.app.mostrarVista('jornadas')"); pg72.wait_for_timeout(700); pg72.evaluate("SRP.jornadas.aplicarAtajo('todas')"); pg72.wait_for_timeout(500)
    a72 = pg72.evaluate("[SRP.permisos.de(SRP.sesion.usuario).alcance, SRP.jornadas._todas.map(j => j.nombre), SRP.indicadores.cabosAsignados(SRP.sesion.usuario)]")
    pg72.evaluate("SRP.app.mostrarVista('registros')"); pg72.wait_for_timeout(800)
    ra72 = pg72.evaluate("[SRP.registros.visibles.length, SRP.registros.visibles.every(r => SRP.ref.usuarioPorId[r.cabo_id].organizacion_id === 'o-alc-09007')]")
    ok(a72 == ['institucion', ['Directivo alcaldía B158'], ['u-cabo-alc']] and ra72 == [1, True], 'el directivo de una alcaldía ve sólo las jornadas, los árboles y los cabos de su institución: %s %s' % (a72, ra72))
    # En Usuarios, el perfil se ofrece dentro y fuera de la Secretaría
    entrar72('u-admin-1'); pg72.evaluate("SRP.app.mostrarVista('usuarios')"); pg72.wait_for_timeout(700)
    u72 = pg72.evaluate("[Object.keys(SRP.PERFILES), SRP.PERFILES.DIRECTIVO.etiqueta, SRP.ref.usuarios.filter(u => u.perfil === 'DIRECTIVO').map(u => u.id).sort()]")
    ok(u72 == [['CABO','COORDINADOR','DIRECTIVO','ADMIN'], 'Directivo', ['u-dir-1','u-dir-alc']], 'el catálogo de perfiles tiene cuatro, con «Directivo», y hay una cuenta de prueba en la Secretaría y otra en una alcaldía: %s' % u72)
    ctx72.close()

    # ---------- ctx73: cada catálogo en su tabla: la migración reparte la tabla única sin perder nada ----------
    ctx73 = b.new_context(viewport={'width':1280,'height':900}, timezone_id='America/Mexico_City')
    pg73 = ctx73.new_page(); err73 = []
    pg73.on('pageerror', lambda e: err73.append(str(e))); pg73.on('console', lambda m: m.type=='error' and 'net::' not in m.text and 'Failed to load' not in m.text and err73.append(m.text))
    pg73.route('**/*.js*', lambda r: r.abort())
    pg73.goto(BASE); pg73.wait_for_timeout(500)
    pg73.evaluate("""() => new Promise((ok, no) => { const r = indexedDB.open('srp_db', 7);
      r.onupgradeneeded = () => { const db = r.result;
        const pl = db.createObjectStore('plantaciones', { keyPath: 'id' }); ['estatus', 'jornada_id'].forEach(i => pl.createIndex(i, i));
        const us = db.createObjectStore('usuarios', { keyPath: 'id' }); const ca = db.createObjectStore('catalogos', { keyPath: 'id' });
        db.createObjectStore('bitacora', { keyPath: 'id' }).createIndex('entidad_id', 'entidad_id');
        const jo = db.createObjectStore('jornadas', { keyPath: 'id' }); jo.createIndex('cabo_id', 'cabo_id');
        const base = { activo: true, creado_por_id: 'u-admin-1', fecha_creacion: '2026-09-01T09:00:00-06:00', editado_por_id: null, fecha_ultima_edicion: null };
        us.put({ id: 'u-admin-1', correo: 'administracion@ejemplo.local', nombre_completo: 'Administración SIA Ejemplo', organizacion_id: 'o-sedema', area_id: 'a-b160', cargo_rol: 'Administración global', perfil: 'ADMIN', coordinadores_ids: [], activo: true, fecha_creacion: '2026-09-01T09:00:00-06:00', creado_por_id: null, fecha_ultima_edicion: null, editado_por_id: null });
        ca.put(Object.assign({ id: 'p-b160', tipo: 'programa', clave: 'B160', nombre: 'Programa B160', tipos_organizacion: ['Alcaldía'] }, base));
        ca.put(Object.assign({ id: 'a-b160', tipo: 'area', clave: 'AREA_B160', nombre: 'Área B160' }, base));
        ca.put(Object.assign({ id: 'ESP-9001', tipo: 'especie', clave: 'ESP-9001', nombre: 'Árbol B160', nombre_cientifico: 'Arbor centum', otros_nombres_comunes: '', tipo_distribucion: 'Nativa', formadecrecimiento: 'Árbol', id_snib: null, id_enciclovida: null }, base));
        ca.put(Object.assign({ id: 'v-B160', tipo: 'vehiculo', clave: 'B160', nombre: 'B 160', modelo: 'Dodge', tipo_vehiculo: 'Pipa' }, base));
        ca.put(Object.assign({ id: 'o-b160', tipo: 'organizacion', clave: 'ORG_B160', nombre: 'Institución B160', tipo_organizacion: 'Empresa privada' }, base));
        ca.put(Object.assign({ id: 's-b160', tipo: 'solicitante', clave: 'SOL_B160', nombre: 'Solicitante B160', tipo_solicitante: 'Vecinos' }, base));
        jo.put({ id: 'jr-b160', nombre: 'Jornada B160', cabo_id: 'u-admin-1', fecha: '2026-09-20', estatus: 'cerrada', programa_id: 'p-b160', vehiculo_id: 'v-B160', organizacion_id: 'o-b160', solicitante_id: 's-b160', origen: 'PEDIDO' }); };
      r.onsuccess = () => { r.result.close(); ok(true); }; r.onerror = () => no(r.error); })""")
    pg73.unroute('**/*.js*'); pg73.reload(); pg73.wait_for_timeout(1800)
    m73 = pg73.evaluate("""async () => { const A = SRP.almacen, fila = async (t, id) => await A.uno(t, id);
      const filas = { programas: await fila('programas', 'p-b160'), areas: await fila('areas', 'a-b160'), especies: await fila('especies', 'ESP-9001'), vehiculos: await fila('vehiculos', 'v-B160'), instituciones: await fila('instituciones', 'o-b160'), solicitantes: await fila('solicitantes', 's-b160') };
      const usos = await SRP.ref.usosDe('catalogos');
      return { v: A.db.version, tablas: [...A.db.objectStoreNames].sort(), todas: Object.values(filas).every(Boolean), sinTipo: Object.values(filas).every(f => f && !('tipo' in f)),
        propios: [filas.programas.tipos_organizacion, filas.vehiculos.modelo, filas.instituciones.tipo_organizacion, filas.solicitantes.tipo_solicitante, filas.especies.nombre_cientifico],
        ajenos: ['modelo', 'nombre_cientifico', 'tipo_organizacion'].some(k => k in filas.areas),
        memoria: ['p-b160', 'a-b160', 'ESP-9001', 'v-B160', 'o-b160', 's-b160'].map(id => (SRP.ref.catalogoPorId[id] || {}).tipo),
        usos: ['p-b160', 'v-B160', 'o-b160', 's-b160', 'a-b160'].map(id => usos[id] || null), uno: (await A.catalogo('v-B160')).tipo }; }""")
    ok(m73['v'] == 8 and 'catalogos' not in m73['tablas'] and m73['tablas'] == sorted(['plantaciones','usuarios','bitacora','jornadas','programas','areas','especies','vehiculos','instituciones','solicitantes']),
       'la base queda en la versión 8, con diez tablas y sin la tabla única de catálogos: %s' % m73['tablas'])
    ok(m73['todas'] and m73['sinTipo'] and m73['propios'] == [['Alcaldía'], 'Dodge', 'Empresa privada', 'Vecinos', 'Arbor centum'] and m73['ajenos'] is False,
       'cada catálogo pasó a su tabla con sus campos, sin `tipo` y sin campos de otro catálogo: %s' % m73['propios'])
    ok(m73['memoria'] == ['programa', 'area', 'especie', 'vehiculo', 'organizacion', 'solicitante'] and m73['uno'] == 'vehiculo',
       'en memoria cada renglón sigue diciendo de qué catálogo es: %s' % m73['memoria'])
    ok(m73['usos'] == [{'jornadas': 1}, {'jornadas': 1}, {'jornadas': 1}, {'jornadas': 1}, {'usuarios': 1}],
       'el uso de cada valor se cuenta igual que antes, contra su tabla: %s' % m73['usos'])
    # La pantalla de Catálogos sigue igual: guardar, desactivar y eliminar escriben en la tabla del catálogo
    pg73.select_option('#sel-usuario-prueba', 'u-admin-1'); pg73.click('#btn-entrar-prueba'); pg73.wait_for_timeout(700)
    g73 = pg73.evaluate("""async () => { const A = SRP.almacen;
      await A.guardarCatalogo({ id: 'a-nueva-b160', tipo: 'area', clave: 'NUEVA_B160', nombre: 'Área nueva B160', activo: true, creado_por_id: 'u-admin-1', fecha_creacion: SRP.util.ahoraISO(), editado_por_id: null, fecha_ultima_edicion: null, modelo: 'no debe guardarse' }, SRP.bitacora.entrada('CREADO', 'catalogo', 'a-nueva-b160', 'prueba'));
      const f = await A.uno('areas', 'a-nueva-b160'), enOtra = await A.uno('programas', 'a-nueva-b160');
      await A.borrarCatalogo({ id: 'a-nueva-b160', tipo: 'area' }, SRP.bitacora.entrada('ELIMINADO', 'catalogo', 'a-nueva-b160', 'prueba'));
      return [!!f, 'tipo' in f, 'modelo' in f, !!enOtra, !!(await A.uno('areas', 'a-nueva-b160')), (await A.catalogos()).length === SRP.ref.catalogos.length]; }""")
    ok(g73 == [True, False, False, False, False, True], 'guardar y eliminar un valor escriben en su tabla, sin `tipo` ni campos ajenos: %s' % g73)
    ok(err73 == [], 'la migración y la pantalla corren sin errores de consola: %s' % err73[:2])
    ctx73.close()

    # ---------- ctx74: menos filtros: seis atajos de periodo y una sola lista de instituciones ----------
    ctx74 = b.new_context(viewport={'width':390,'height':844}, timezone_id='America/Mexico_City')
    pg74 = ctx74.new_page(); err74 = []
    pg74.on('pageerror', lambda e: err74.append(str(e)))
    pg74.goto(BASE); pg74.wait_for_timeout(1200)
    pg74.select_option('#sel-usuario-prueba', 'u-admin-1'); pg74.click('#btn-entrar-prueba'); pg74.wait_for_timeout(900)
    pg74.evaluate("async () => { await SRP.demo.cargar(); }"); pg74.wait_for_timeout(600)
    medir74 = """(id) => { const cs = [...document.querySelectorAll('#' + id + ' .chip')]; const r = cs.map(c => c.getBoundingClientRect());
      return { textos: cs.map(c => c.firstChild.textContent.trim()), renglones: new Set(r.map(x => Math.round(x.top))).size, alto: Math.min(...r.map(x => Math.round(x.height))), ancho: document.documentElement.scrollWidth }; }"""
    for vista, caja, primero in (('jornadas', 'jornada-atajos', 'Todas'), ('registros', 'filtro-atajos', 'Todos')):
        pg74.evaluate("v => SRP.app.mostrarVista(v)", vista); pg74.wait_for_timeout(900)
        if vista == 'registros': abrir_filtros(pg74)
        t74 = pg74.evaluate(medir74, caja)
        ok(t74['textos'] == [primero, 'Hoy', 'Este mes', 'Este año', 'Un día', 'Un periodo'] and t74['renglones'] == 2 and t74['alto'] >= 44 and t74['ancho'] <= 390,
           'en el teléfono, %s lleva seis atajos en dos renglones de tres, con área de toque y sin salirse de lado: %s' % (vista, t74))
    n74 = pg74.evaluate("""() => [...document.querySelectorAll('section[id^=vista-]')].map(s => [s.id.replace('vista-', ''), [...s.querySelectorAll('select, input[type=search], .chips[role=group]')].filter(e => !e.closest('form, dialog') && e.id && !e.id.endsWith('-orden-lista')).length]).filter(x => x[1] && x[0] !== 'acceso')""")
    ok(all(n <= 8 for _, n in n74) and not pg74.evaluate("['jornada-anio', 'jornada-mes', 'jornada-reporte', 'jornada-filtro-prioridad', 'jornada-tipo-org', 'filtro-anio', 'filtro-mes', 'filtro-tipo-org', 'sup-tipo', 'usr-filtro-tipo'].some(id => document.getElementById(id))"),
       'ninguna vista pasa de ocho filtros y los que se quitaron ya no existen: %s' % n74)
    pg74.evaluate("SRP.app.mostrarVista('jornadas')"); pg74.wait_for_timeout(700)
    pg74.click('#jornada-atajos [data-atajo=anio]'); pg74.wait_for_timeout(600)
    f74 = pg74.evaluate("[document.getElementById('jornada-fichas').textContent, SRP.jornadas.lista.length]")
    pg74.click('#jornada-fichas button[data-quitar=periodo]'); pg74.wait_for_timeout(600)
    ok(pg74.evaluate("SRP.util.fechaHoy().slice(0, 4)") in f74[0] and f74[1] > 0 and pg74.get_attribute('#jornada-atajos [data-atajo=todas]', 'aria-pressed') == 'true',
       '«Este año» deja su ficha con el año, y quitarla vuelve a «Todas»: %s' % f74[0])
    pg74.set_viewport_size({'width': 1280, 'height': 900}); pg74.wait_for_timeout(400)
    ok(pg74.evaluate(medir74, 'jornada-atajos')['renglones'] == 1, 'con ancho, los seis atajos caben en un renglón')
    ok(err74 == [], 'sin errores de consola: %s' % err74[:2])
    ctx74.close()

    # ---------- ctx75: Supervisión y «Mi avance» en resumen, con los desgloses plegados ----------
    ctx75 = b.new_context(viewport={'width':390,'height':844}, timezone_id='America/Mexico_City')
    pg75 = ctx75.new_page(); err75 = []
    pg75.on('pageerror', lambda e: err75.append(str(e)))
    pg75.goto(BASE); pg75.wait_for_timeout(1200)
    pg75.select_option('#sel-usuario-prueba', 'u-admin-1'); pg75.click('#btn-entrar-prueba'); pg75.wait_for_timeout(900)
    pg75.evaluate("async () => { await SRP.demo.cargar(); }"); pg75.wait_for_timeout(600)
    pg75.evaluate("SRP.app.mostrarVista('supervision')"); esperar(pg75, "!!SRP.supervision.modelo && !!document.querySelector('.sup-seccion')", 8000)
    pg75.click('#sup-tipos .chip[data-tipo=anio]'); pg75.wait_for_timeout(1500)
    s75 = pg75.evaluate("""() => { const v = document.getElementById('vista-supervision'), q = x => [...v.querySelectorAll(x)];
      const acc = document.getElementById('sup-acciones'), cif = v.querySelector('.sup-cifras'), ava = document.getElementById('sup-t-avance');
      return { alto: v.scrollHeight, ancho: document.documentElement.scrollWidth, cifras: q('.sup-cifra').length,
        secciones: q('details[data-seccion]').map(d => d.dataset.seccion), abiertas: q('details[data-seccion][open]').map(d => d.dataset.seccion),
        resumenes: q('details[data-seccion] > summary .sup-resumen').every(x => x.textContent.trim().length > 3),
        acciones: !!(cif.compareDocumentPosition(acc) & 4) && !!(acc.compareDocumentPosition(ava) & 4),
        activos: q('.sup-seccion-cuerpo > .sup-tabla-caja .sup-tabla-cabos tbody tr').length, sin: q('.sup-sin-jornadas tbody tr').length, cabos: SRP.supervision.modelo.porCabo.length,
        listaJornadas: !!document.getElementById('sup-t-jornadas'), enlace: !!v.querySelector('button[data-ver-jornadas]') }; }""")
    ok(s75['alto'] <= 5 * 844 and s75['ancho'] <= 390 and s75['cifras'] == 4 and s75['abiertas'] == ['cabos'] and len(s75['secciones']) >= 6 and s75['resumenes'],
       'en el teléfono, Supervisión cabe en pocas pantallas: cuatro cifras y los desgloses plegados, cada uno con su dato principal; sólo «Por cabo» abierto: %s px, %s' % (s75['alto'], s75['secciones']))
    ok(s75['acciones'], 'las descargas van bajo las cifras, antes de la gráfica y de los desgloses')
    ok(s75['activos'] + s75['sin'] == s75['cabos'] and s75['activos'] > 0 and not s75['listaJornadas'] and s75['enlace'],
       '«Por cabo» lista a quienes tuvieron jornadas y junta aparte a los %s que no; la lista de jornadas da paso a un enlace' % s75['sin'])
    pg75.click('details[data-seccion=alcaldias] > summary'); pg75.wait_for_timeout(900)
    m75 = pg75.evaluate("""() => { const c = document.getElementById('sup-mapa').getBoundingClientRect(); const t = document.querySelector('details[data-seccion=alcaldias] .sup-tabla');
      const r = [...t.querySelectorAll('tbody tr')].map(x => x.getBoundingClientRect()); const td = t.querySelector('tbody td').getBoundingClientRect();
      return [c.width > 200 && c.height > 200, !!document.querySelector('#sup-mapa path.sup-alcaldia'), r.every(x => x.right <= 390), td.width > 150, document.documentElement.scrollWidth]; }""")
    ok(m75[:4] == [True, True, True, True] and m75[4] <= 390, 'al abrir «Por alcaldía» se dibuja su mapa y la tabla se lee en renglones, sin partir nombres ni salirse de lado: %s' % m75)
    pg75.click('#sup-tipos .chip[data-tipo=mes]'); pg75.wait_for_timeout(1500)
    ok(sorted(pg75.evaluate("[...document.querySelectorAll('details[data-seccion][open]')].map(d => d.dataset.seccion)")) == ['alcaldias', 'cabos'], 'lo que se abrió sigue abierto al cambiar de periodo')
    p75 = pg75.evaluate("[SRP.supervision.periodo.desde, SRP.supervision.periodo.hasta]")
    pg75.click('button[data-ver-jornadas]'); pg75.wait_for_timeout(1500)
    j75 = pg75.evaluate("[SRP.app.vista, SRP.jornadas.filtro.desde, SRP.jornadas.filtro.hasta, document.querySelector('#jornada-atajos [data-atajo=periodo]').getAttribute('aria-pressed'), SRP.jornadas.lista.every(j => j.fecha >= SRP.jornadas.filtro.desde && j.fecha <= SRP.jornadas.filtro.hasta)]")
    ok(j75 == ['jornadas', p75[0], p75[1], 'true', True], '«Ver las jornadas del periodo» abre Jornadas con ese mismo periodo: %s' % j75)
    pg75.evaluate("SRP.jornadas.quitarFiltros(false)")
    # El cabo: tres cifras, sin pedidos ni constancia de cambios ni tabla CSV; conserva sus mapas
    pg75.evaluate("SRP.sesion.iniciar(SRP.ref.usuarioPorId['u-cabo-1'])"); pg75.reload(); pg75.wait_for_timeout(1800)
    pg75.evaluate("SRP.app.mostrarVista('supervision')"); esperar(pg75, "!!SRP.supervision.modelo && !!document.querySelector('.sup-cifras')", 8000)
    pg75.click('#sup-tipos .chip[data-tipo=todo]'); pg75.wait_for_timeout(1500)
    c75 = pg75.evaluate("""() => { const v = document.getElementById('vista-supervision'), q = x => [...v.querySelectorAll(x)];
      return { titulo: document.getElementById('titulo-supervision').textContent, cifras: q('.sup-cifra').length, abiertas: q('details[data-seccion][open]').length,
        secciones: q('details[data-seccion]').map(d => d.dataset.seccion), csv: document.getElementById('btn-sup-csv').hidden,
        calidad: document.getElementById('sup-t-calidad').textContent, texto: v.querySelector('details[data-seccion=calidad]').textContent, alto: v.scrollHeight }; }""")
    ok(c75['titulo'] == 'Mi avance' and c75['cifras'] == 3 and c75['abiertas'] == 0 and 'pedidos' not in c75['secciones'] and 'cabos' not in c75['secciones'] and c75['csv']
       and c75['calidad'] == 'Mis registros' and 'Eliminados' not in c75['texto'] and 'Ediciones' not in c75['texto'] and c75['alto'] <= 3 * 844,
       '«Mi avance» del cabo: tres cifras, todo plegado, sin pedidos, eliminados, ediciones ni CSV: %s px, %s' % (c75['alto'], c75['secciones']))
    pg75.click('details[data-seccion=alcaldias] > summary'); pg75.click('details[data-seccion=prioridad] > summary'); pg75.wait_for_timeout(1200)
    ok(pg75.evaluate("!!document.querySelector('#sup-mapa .leaflet-pane, #sup-mapa.leaflet-container') && !!document.querySelector('#sup-mapa-prioridad .leaflet-pane, #sup-mapa-prioridad.leaflet-container')"),
       'el cabo conserva los dos mapas, dentro de sus secciones')
    pg75.set_viewport_size({'width': 1280, 'height': 900})
    pg75.evaluate("SRP.sesion.iniciar(SRP.ref.usuarioPorId['u-admin-1'])"); pg75.reload(); pg75.wait_for_timeout(1800)
    pg75.evaluate("SRP.app.mostrarVista('supervision')"); esperar(pg75, "!!SRP.supervision.modelo && !!document.querySelector('.sup-seccion')", 8000); pg75.wait_for_timeout(600)
    ok(pg75.evaluate("[...document.querySelectorAll('details[data-seccion]')].every(d => d.open) && getComputedStyle(document.querySelector('.sup-tabla thead')).position !== 'absolute'"),
       'con ancho, los desgloses se muestran abiertos y las tablas conservan sus columnas')
    ok(err75 == [], 'sin errores de consola: %s' % err75[:2])
    ctx75.close()




    b.close()




print('\n'.join(res)); print('ERRORES CONSOLA:',errores or 'ninguno')
print('fallas:',sum(r.startswith('FALLA') for r in res),'de',len(res))
