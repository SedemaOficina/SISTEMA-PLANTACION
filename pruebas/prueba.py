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
SRP_GPS='GPS del dispositivo'
errores=[]; res=[]
def ok(c,m): res.append(('OK ' if c else 'FALLA ')+m)

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

def registrar(pg, busqueda, especie_id, programa='p-refor', fecha=None, foto=None):
    """Captura un árbol de principio a fin y devuelve el identificador con que se guardó.
    `busqueda` es lo que se teclea para que la especie salga en la lista."""
    pg.click('#btn-ubicacion'); pg.wait_for_timeout(700)
    pg.fill('#campo-especie', busqueda); pg.wait_for_timeout(200)
    pg.dispatch_event('.combo-opcion[data-id="%s"]' % especie_id, 'mousedown'); pg.wait_for_timeout(150)
    pg.select_option('#campo-programa', programa); pg.wait_for_timeout(150)
    pg.fill('#campo-fecha', fecha or HOY)
    if foto: pg.set_input_files('#foto-archivo', foto); pg.wait_for_timeout(800)
    pg.click('#form-plantacion button[type=submit]'); pg.wait_for_timeout(800)
    ident = pg.inner_text('#revision-lista .revision-id')
    pg.click('#btn-resumen-guardar'); pg.wait_for_timeout(600)
    pg.click('#btn-registro-nuevo'); pg.wait_for_timeout(400)
    return ident

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

    # ---------- REGISTRAR ----------
    # A nombre de quién se registra lo dice el encabezado; no se repite como campo
    ok(pg.locator('#campo-cabo').count()==0,'la pantalla no repite el nombre de quien captura')
    ok(pg.locator('#vista-registrar .nota-obligatorio').count()==0,'ni la nota del asterisco')
    ok(pg.evaluate("['campo-especie','campo-otra-especie'].every(i=>{const e=document.getElementById(i); return e.spellcheck===false && e.getAttribute('autocorrect')==='off' && e.getAttribute('autocapitalize')==='off';})"),
       'los nombres de especie no pasan por corrector ni mayúsculas automáticas (D99)')
    ok(pg.evaluate("['campo-especie','campo-programa','campo-fecha'].every(i=>document.getElementById(i).required)"),
       'lo obligatorio lo anuncia el atributo required, no sólo el asterisco')
    orden=pg.evaluate("""()=>{const t=document.getElementById('vista-registrar').innerHTML;
        return [t.indexOf('btn-ubicacion'), t.indexOf('coord-manual'), t.indexOf('id="mapa"')];}""")
    ok(orden[0]<orden[1]<orden[2],'orden: botón de ubicación, captura a mano y luego el mapa')
    rev=pg.evaluate("(() => { const b=document.getElementById('btn-revisar'); const r=b.getBoundingClientRect(); const m=document.getElementById('form-plantacion').getBoundingClientRect(); return { verde: getComputedStyle(b).backgroundColor, icono: !!b.querySelector('svg'), alto: Math.round(r.height), ancho: Math.round(r.width), formulario: Math.round(m.width) }; })()")
    ok(rev['verde']=='rgb(31, 107, 62)' and rev['icono'] and rev['alto']>=56 and rev['ancho']>=rev['formulario']-2,
       'Revisar y guardar es verde, con disco, alto y de margen a margen en teléfono: %s' % rev)
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
        apoyo: c(document.querySelector('.coord-manual summary')),
        gris: c(document.querySelector('.nota')),
        cerrar_caja: getComputedStyle(document.getElementById('btn-cerrar-sesion')).backgroundColor,
        cerrar_borde: getComputedStyle(document.getElementById('btn-cerrar-sesion')).borderTopWidth,
        cerrar_subrayado: getComputedStyle(document.getElementById('btn-cerrar-sesion')).textDecorationLine
      };
    }""")
    ok(enfasis['principal_relleno']=='rgb(157, 33, 72)','la acción principal es el guinda relleno: '+enfasis['principal_relleno'])
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
    filaCabo=pg.locator('#espejo-cuerpo tr', has_text='cabo_id').inner_text()
    ok('u-cabo-1' in filaCabo,'enseña el valor de verdad, no un ejemplo: '+filaCabo.replace(chr(9),' ')[:60])
    antes=pg.locator('#espejo-cuerpo tr', has_text='lat_original').inner_text()
    ok('—' in antes,'sin punto, lat_original está vacío')

    pg.click('#btn-ubicacion'); pg.wait_for_timeout(800)
    despues=pg.locator('#espejo-cuerpo tr', has_text='lat_original').inner_text()
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
    ok('btn-editar' in corr['clase'] and corr['color']=='rgb(126, 95, 48)' and corr['editar'].upper()=='#7E5F30',
       'y toma el dorado de corregir: '+corr['color'])
    ok(corr['icono'] and corr['texto'].startswith('Actualizar'),
       'conserva el icono de ubicación y cambia el texto, porque el color nunca va solo (D48)')

    # DE DÓNDE SALIÓ EL PUNTO. Sin fotografía obligatoria, la coordenada es la prueba, y no
    # todas valen lo mismo. Se comprueba en los cuatro caminos por los que se puede colocar.
    ok(SRP_GPS in pg.inner_text('#dato-origen') and '±' in pg.inner_text('#dato-origen'),
       'el punto del GPS se guarda como tal, con su precisión: '+pg.inner_text('#dato-origen'))
    ok(pg.evaluate("SRP.mapa.origen")=='gps' and isinstance(pg.evaluate("SRP.mapa.precision"), int),
       'y la precisión queda en número, no sólo en el mensaje de pantalla')

    # Al capturar a mano, el margen del aparato deja de describir el punto y se borra
    pg.click('.coord-manual summary'); pg.wait_for_timeout(200)
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
    pg.click('.coord-manual summary'); pg.wait_for_timeout(200)
    ok(pg.is_visible('#btn-ubicacion'),'y reaparece al cerrar el desplegable')
    pg.click('#btn-ubicacion'); pg.wait_for_timeout(800)   # se deja en GPS para lo que sigue

    # La fecha no se hereda ni se supone: se elige a propósito
    ok(pg.input_value('#campo-fecha')=='','la fecha de plantación arranca sin valor')
    pg.click('#form-plantacion button[type=submit]'); pg.wait_for_timeout(300)
    ok('fecha' in pg.inner_text('#resumen-errores').lower(),'y sin ella no se puede revisar ni guardar')
    pg.fill('#campo-fecha', HOY)

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
    # Programa con botones (D98): sin preselección (D29), un toque elige y el dato sigue en la lista
    prog=pg.evaluate('''() => ({ n: document.querySelectorAll('#programa-botones .chip').length,
      marcados: document.querySelectorAll('#programa-botones .chip[aria-pressed=true]').length,
      lista_oculta: document.getElementById('campo-programa').classList.contains('oculto-visual') })''')
    ok(prog=={'n':2,'marcados':0,'lista_oculta':True},'con dos programas se eligen con botones, ninguno marcado de inicio: %s' % prog)
    pg.click('#programa-botones .chip[data-id=p-refor]'); pg.wait_for_timeout(200)
    ok(pg.input_value('#campo-programa')=='p-refor' and pg.get_attribute('#programa-botones .chip[data-id=p-refor]','aria-pressed')=='true',
       'un toque elige el programa y el dato queda en la lista del formulario')
    ok(pg.evaluate("document.activeElement.dataset.id")=='p-refor','elegir programa no mueve el foco a la fecha (D82)')
    pg.fill('#campo-fecha',''); pg.evaluate("document.getElementById('campo-fecha').blur()"); pg.wait_for_timeout(600)
    vac=pg.evaluate("(() => { const e=document.getElementById('campo-fecha').closest('.envoltura-vacio'); const t=e.querySelector('.texto-vacio'); return [e.dataset.vacio, getComputedStyle(t).display, t.textContent]; })()")
    ok(vac==['true','block','Seleccione en el calendario'],'la fecha vacía muestra «Seleccione en el calendario» (D104): %s' % vac)
    pg.click('#btn-fecha-hoy'); pg.wait_for_timeout(600)
    ok(pg.evaluate("document.getElementById('campo-fecha').closest('.envoltura-vacio').dataset.vacio")=='false','y el texto guía se quita al poner la fecha')
    ok(pg.input_value('#campo-fecha')==HOY,'«Hoy» pone la fecha de hoy de un toque (D98)')
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

    # Ficha de revisión
    pg.click('#form-plantacion button[type=submit]'); pg.wait_for_timeout(900)
    ok(pg.is_visible('#dlg-resumen'),'la ficha de revisión aparece antes de guardar')
    ok(pg.locator('#revision-mapa .leaflet-marker-icon').count()==1,'la ficha muestra el mapa con el punto')
    ok(pg.locator('.revision-fila', has_text='Fotografía').locator('img.revision-foto').count()==1,
       'y la fotografía, en su propio renglón al final')
    ok(pg.locator('#revision-lista').bounding_box()['y'] < pg.locator('img.revision-foto').bounding_box()['y'],
       'la fotografía va debajo de los datos, no encima')
    ok(pg.evaluate("getComputedStyle(document.querySelector('.revision-fila dt')).fontWeight")=='700',
       'las etiquetas de la ficha van en negritas')
    ok(float(pg.evaluate("parseFloat(getComputedStyle(document.querySelector('.revision-nota')).marginTop)"))>=12,
       'la nota del final tiene aire arriba')
    ok(pg.evaluate("SRP.mapa.icono.options.iconSize[0]")<=24,
       'el pin es discreto (%s px de ancho)' % pg.evaluate("SRP.mapa.icono.options.iconSize[0]"))
    id1=pg.inner_text('#revision-lista .revision-id')
    ok(len(id1)>20,'la ficha muestra el identificador')
    ok(pg.locator('.revision-fila', has_text='Identificador').locator('button').count()==0,'el identificador no se edita')
    ok(pg.locator('button[data-campo=punto]').count()==1,'sólo las coordenadas remiten al mapa')
    ok(pg.locator('.revision-fila', has_text='Alcaldía').locator('button').count()==0,'la alcaldía no se edita: sale del punto')
    ok(pg.inner_text('button[data-campo=especie]').strip()=='Editar','la ficha usa la palabra Editar')
    ok(HOY_TXT in pg.inner_text('#revision-lista'),'las fechas se leen con el mes en letras: '+HOY_TXT)
    ok('PROVISIONAL' in pg.inner_text('#revision-lista .folio-provisional'),'la ficha muestra el folio como PROVISIONAL (R1)')
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
    ok(orden[0]=='Especie' and 'Folio' not in orden and pg.locator('.revision-sistema .folio-provisional').count()==1 and pg.locator('.revision-sistema .revision-id').count()==1,
       'la ficha empieza por Especie y deja Folio e Identificador en «Datos del sistema» (D99): %s' % orden[:3])
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
    ok(pg.is_hidden('#dlg-resumen') and pg.is_visible('#dlg-guardado'),'al guardar se cierra la ficha y se abre el aviso')
    ok('Fresno' in pg.inner_text('#dlg-guardado-detalle'),'el aviso dice qué se guardó')
    ok(id1 in pg.inner_text('#dlg-guardado-id'),'se guardó con el identificador que mostró la ficha')
    ok('Enviando al servidor' in pg.inner_text('#dlg-guardado-dispositivo') and pg.text_content('#conexion').strip()=='Enviando 1…' and pg.get_attribute('#conexion','data-estado')=='enviando',
       'con señal el registro sale en seguida: el aviso y la pastilla dicen «Enviando…» (D111): '+pg.text_content('#conexion').strip())
    pg.wait_for_timeout(1600)
    ok('Enviado al servidor (simulado)' in pg.inner_text('#dlg-guardado-dispositivo') and 'Recepción confirmada hoy a las' in pg.inner_text('#dlg-guardado-dispositivo'),
       'y luego que el servidor confirmó la recepción, con la hora (D111): '+pg.inner_text('#dlg-guardado-dispositivo'))
    ok(re.search(r'Folio: [A-Z]{3}-\d{3}-\d{5} \(simulado\)', pg.inner_text('#dlg-guardado-id')) is not None,'con su folio (D110): '+pg.inner_text('#dlg-guardado-id'))
    ok(pg.text_content('#conexion').strip()=='Con conexión · Al día' and pg.get_attribute('#conexion','data-estado')=='con','la pastilla queda «Al día» (D111)')
    pg.click('#btn-registro-nuevo'); pg.wait_for_timeout(500)
    ok(pg.is_hidden('#dlg-guardado'),'«Agregar registro nuevo» cierra el aviso')
    ok(pg.evaluate("document.activeElement.id")=='btn-ubicacion','y deja el foco en el botón de ubicación')
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
    sucios=[k for k,v in restos.items() if v not in ('', 0, None, '—')]
    ok(sucios==[],'el registro nuevo arranca en blanco; con resto en: '+str(sucios))

    # Validación
    pg.fill('#campo-fecha','2030-01-01'); pg.click('#form-plantacion button[type=submit]'); pg.wait_for_timeout(300)
    ok(pg.locator('#resumen-errores li').count()==4,'valida ubicación, especie, programa y fecha futura')
    pg.fill('#campo-fecha', HOY)

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
    ok(tarj['arriba'] and tarj['derecha'] and tarj['alto']<130 and tarj['mini'] and not tarj['provisional'],
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
    ok(hoy_txt=='Hoy, '+HOY_TXT,'el chip de hoy lleva la fecha con el mes en letras (se lee con la coma oculta): '+hoy_txt)
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
    ok(col=='rgb(179, 38, 30)','la opción Eliminar va en rojo')
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
    pg.select_option('#filtro-anio','2026'); pg.wait_for_timeout(300)
    ok(pg.locator('#filtro-mes option').count()==4,'el mes lista sólo los tres con registros')
    pg.select_option('#filtro-mes','07'); pg.wait_for_timeout(300)
    ok('Total: 1 ' in pg.inner_text('#registros-total'),'julio tiene uno: '+pg.inner_text('#registros-total'))
    ok(pg.locator('#filtro-atajos .chip[aria-pressed=true]').count()==0,'ningún atajo queda marcado al elegir mes suelto')
    ok(pg.is_hidden('#filtro-desde'),'el rango viene plegado')
    pg.click('.chip[data-atajo=periodo]'); pg.wait_for_timeout(200)
    ok(pg.is_visible('#filtro-desde') and pg.get_attribute('.chip[data-atajo=periodo]','aria-expanded')=='true','«Un periodo» abre Desde/Hasta (D64)')
    ok(pg.is_hidden('#filtro-anio') and pg.is_hidden('#filtro-mes'),'con «Un periodo» abierto no se ven Año y Mes: nunca dos maneras del periodo a la vez (D100)')
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
    ok([c for c in pg.eval_on_selector_all('#filtro-atajos .chip','b=>b.map(x=>x.dataset.atajo)')]==['hoy','dia','todos','periodo'],'los atajos son Hoy, Un día, Todos y Un periodo, en ese orden (D64, D113)')
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
    pg.mouse.move(1,1); pg.wait_for_timeout(100)
    est=pg.evaluate('''() => {
      const g = e => getComputedStyle(e);
      const act = document.querySelector('#filtro-atajos .chip[aria-pressed=true]');
      const chips = [...document.querySelectorAll('#filtro-atajos .chip')].map(c => Math.round(c.getBoundingClientRect().width));
      const sel = document.getElementById('filtro-anio'), fec = document.getElementById('filtro-desde');
      return {
        suave: g(act).backgroundColor === 'rgb(247, 241, 243)' && g(act).color === 'rgb(157, 33, 72)',
        iguales: Math.max(...chips) - Math.min(...chips) <= 1,
        lista: g(sel).appearance === 'none' && g(sel).backgroundImage.includes('svg'),
        fecha: g(fec).backgroundImage.includes('svg'),
        reiniciar: !!document.querySelector('.grupo-cab #btn-reiniciar-filtros'),
        aplicar: document.getElementById('btn-filtrar').classList.contains('btn-primario')
      };
    }''')
    ok(all(est.values()),'estilo de filtros (D95): atajo activo en guinda suave, atajos de ancho igual, lista y fecha con su cuadrito, «Reiniciar» en el encabezado y «Aplicar» como acción principal: '+str(est))
    pg.click('.chip[data-atajo=periodo]'); pg.wait_for_timeout(200)
    pg.fill('#filtro-desde','2026-08-01'); pg.fill('#filtro-hasta','2026-08-31'); pg.click('#btn-filtrar'); pg.wait_for_timeout(300)
    pg.click('.chip[data-atajo=todos]'); pg.wait_for_timeout(300)
    ok(pg.input_value('#filtro-desde')=='','y un atajo limpia el rango')

    # ---------- REPORTES (B19, B31) ----------
    ok(pg.locator('#vista-registros #btn-pdf').count()==0 and pg.locator('#vista-registros #aviso-envio').count()==0,'Registros ya no lleva el reporte ni el bloque del dispositivo (D81)')
    pg.click('.pestana[data-vista=reportes]'); pg.wait_for_timeout(600)
    ok(pg.is_visible('#vista-reportes') and pg.locator('#vista-reportes .bloque .titulo-bloque').count()==1 and pg.locator('#aviso-envio').count()==0,'la pestaña Reportes abre con el reporte del día y ya no lleva el bloque del dispositivo (D104)')
    ok(pg.input_value('#pdf-dia')==HOY and pg.get_attribute('#pdf-dia','max')==HOY,'el día del reporte arranca en hoy y no admite futuro')
    ok(not pg.is_disabled('#btn-pdf') and HOY_TXT in pg.inner_text('#pdf-nota'),'con registros de hoy, el botón se habilita y la nota dice qué se reporta: '+pg.inner_text('#pdf-nota'))
    ok(pg.is_hidden('#caja-pdf-cabo'),'el cabo no elige cabo')
    # Cualquier día, no sólo hoy (D70)
    pg.fill('#pdf-dia','2026-08-10'); pg.dispatch_event('#pdf-dia','change'); pg.wait_for_timeout(400)
    ok(not pg.is_disabled('#btn-pdf') and '10-AGO-2026' in pg.inner_text('#pdf-nota'),'una fecha pasada con registros habilita el reporte: '+pg.inner_text('#pdf-nota'))
    pg.click('#btn-pdf'); pg.wait_for_timeout(400)
    ok('10-AGO-2026' in pg.inner_text('#dlg-cierre-dia'),'el cierre es del día elegido: '+pg.inner_text('#dlg-cierre-dia'))
    pg.click('#btn-cierre-cerrar'); pg.wait_for_timeout(200)
    pg.fill('#pdf-dia','2026-01-05'); pg.dispatch_event('#pdf-dia','change'); pg.wait_for_timeout(400)
    ok(pg.is_disabled('#btn-pdf') and 'No hay registros' in pg.inner_text('#pdf-nota'),'un día sin registros apaga el botón y lo dice: '+pg.inner_text('#pdf-nota'))
    pg.fill('#pdf-dia',HOY); pg.dispatch_event('#pdf-dia','change'); pg.wait_for_timeout(400)

    pg.click('#btn-pdf'); pg.wait_for_timeout(400)
    ok(pg.is_visible('#dlg-cierre'),'el botón abre el cierre del reporte antes de generar')
    espejoC=pg.evaluate("[...document.querySelectorAll('#espejo-cierre-cuerpo .espejo-campo')].map(e=>e.textContent)")
    ok(espejoC==['id','es_ficticio','fecha','cabo_id','creado_por_id','fecha_creacion','editado_por_id','fecha_ultima_edicion','arboles_plantados','puntos_revisados'],
       'el cierre lleva su espejo con los diez campos que no se capturan aquí (D112): '+', '.join(espejoC))
    pg.fill('#cie-chofer','Mengano'); pg.wait_for_timeout(200)
    ok(pg.evaluate("SRP.reportes.cierrePrevisto().chofer")=='Mengano','y lo que se escribe entra al mismo objeto que se guarda')
    ok(pg.is_visible('#cie-encargado-lectura') and pg.is_hidden('#cie-encargado-caja'),
       'a un cabo no se le pregunta el encargado: es él')
    ok(pg.inner_text('#cie-encargado-lectura').strip()!='','y sale su nombre: '+pg.inner_text('#cie-encargado-lectura'))
    pg.fill('#cie-sitio','Calzada de prueba entre calle Uno y calle Dos')
    pg.fill('#cie-chofer','Fulano de Tal')
    pg.fill('#cie-hora','14:30')
    pg.fill('#cie-vehiculo_modelo','Camioneta de prueba'); pg.fill('#cie-vehiculo_placa','ABC-123')
    ok(pg.inner_text('#btn-cierre-generar').strip()=='Ver vista previa' and pg.evaluate("!!document.getElementById('btn-cierre-generar').closest('.dialogo-pie')"),
       'el cierre lleva «Ver vista previa» al pie (D101)')
    pg.click('#btn-cierre-generar'); pg.wait_for_timeout(500)
    prev=pg.inner_text('#previa-hoja')
    ok(pg.is_visible('#dlg-previa') and 'REPORTE DIARIO DE PLANTACIÓN' in prev.upper() and 'Calzada de prueba' in prev and 'Fulano de Tal' in prev
       and 'TOTALES POR ESPECIE' in prev.upper() and ('PROVISIONALES' in prev or 'SIMULADOS' in prev),'antes del PDF se ve la vista previa con el sitio, la logística, los totales y la advertencia de provisional (D101)')
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
      for (let i=0;i<pts.length;i++) { const id = SRP.util.generarId(); ids.push(id);
        const r = { id, es_ficticio: true, estatus: 'activo', cabo_id: u.id, lat: pts[i][0], lng: pts[i][1], lat_original: pts[i][0], lng_original: pts[i][1], punto_origen: 'gps', gps_precision_m: i===4 ? 45 : 6,
          alcaldia: 'Cuauhtémoc', alcaldia_cve: '09015', colonia: null, colonia_cve: null, uga: 'CUH-021', capa_version: null, especie_id: pts[i][2], especie_otra: '', especie_estatus: 'VALIDADA', programa_id: 'p-refor', fecha_plantacion: f, comentarios: '', foto_id: null, foto_base64: null,
          fecha_registro: new Date(dia.getTime()+ (9*60+i*15)*60000).toISOString(), fecha_ultima_edicion: null, editado_por_id: null, folio: null, folio_uga: null, folio_capa_version: null, folio_lat: null, folio_lng: null };
        await SRP.almacen.guardarConBitacora('plantaciones', r, SRP.bitacora.entrada('CREADO','plantacion',id)); }
      return { f, ids }; }""")
    pg.click('#navegacion [data-vista=jornadas]'); pg.wait_for_timeout(700)
    ok(pg.is_visible('#vista-jornadas') and pg.get_attribute('#navegacion [data-vista=jornadas]','aria-current')=='page' and pg.locator('#navegacion .pestana:visible').count()==4,
       '«Jornadas» es una sección del menú y abre su vista (D112)')
    ok(pg.eval_on_selector_all('#navegacion .pestana','b=>b.filter(x=>!x.hidden).map(x=>x.dataset.vista)')==['registrar','jornadas','registros','reportes'],'el orden es Nuevo registro, Jornadas, Registros, Reportes (D114)')
    pg.click('#btn-cuenta'); pg.wait_for_timeout(150)
    ok(pg.locator('#btn-contraste svg').count()==1 and pg.locator('#btn-cerrar-sesion svg').count()==1 and pg.locator('#menu-cuenta .menu-opcion:visible').count()==pg.locator('#menu-cuenta .menu-opcion:visible svg').count(),
       'cada opción del menú de la cuenta lleva icono: sol en Modo sol y puerta en Cerrar sesión (D114)')
    pg.keyboard.press('Escape'); pg.evaluate("SRP.app.menuCuenta(false)"); pg.wait_for_timeout(150)
    ok(pg.evaluate("(() => { const b=document.querySelector('#navegacion [data-vista=jornadas]'); const r=b.getBoundingClientRect(); return r.top > 700 && r.bottom <= 844; })()"),'y en teléfono va en la barra de abajo')
    ok([c for c in pg.eval_on_selector_all('#jornada-atajos .chip','b=>b.map(x=>x.dataset.atajo)')]==['hoy','dia','todas'],'con los atajos Hoy, Un día y Todas')
    tarj=pg.locator('#lista-jornadas .jornada')
    ok(tarj.count()>=2 and pg.inner_text('#jornadas-total').startswith('Total: '),'cada día de trabajo es una tarjeta: '+pg.inner_text('#jornadas-total'))
    t=[x for x in pg.eval_on_selector_all('#lista-jornadas .jornada','l=>l.map(x=>x.textContent)') if '5 árboles' in x]
    ok(len(t)==1 and 'por revisar' in t[0] and 'Cuauhtémoc' in t[0],'la tarjeta dice sitio, cuántos árboles y cuántos puntos hay por revisar: '+(t[0] if t else '—'))
    pg.click('#lista-jornadas .jornada:has-text("5 árboles") button'); pg.wait_for_timeout(900)
    ok(pg.is_visible('#jornada-detalle') and pg.is_hidden('#jornadas-lista-caja') and pg.evaluate("document.activeElement.id")=='jornada-titulo','tocar la tarjeta abre la revisión de la jornada y el foco va al título')
    ok(pg.locator('#jornada-mapa .pin-num').count()==5 and pg.locator('#jornada-lista .punto-jornada').count()==5,'el mapa tiene 5 puntos numerados y la lista los mismos 5')
    nums=pg.eval_on_selector_all('#jornada-mapa .pin-num span','s=>s.map(x=>x.textContent)')
    ok(sorted(nums,key=int)==['1','2','3','4','5'] and pg.eval_on_selector_all('#jornada-lista .punto-num','s=>s.map(x=>x.textContent)')==['1','2','3','4','5'],'numerados en el orden en que se registraron')
    lista=pg.inner_text('#jornada-lista')
    ok('Posible duplicado del 4' in lista and 'Posible duplicado del 3' in lista,'los dos ahuehuetes encimados se avisan como posible duplicado, uno del otro')
    ok('Lejos del resto' in lista and 'Precisión baja' in lista,'el punto lejano se avisa como lejos del resto y con precisión baja: '+lista.replace('\n',' | ')[:400])
    tonos=pg.eval_on_selector_all('#jornada-lista .punto-num','s=>s.map(x=>x.dataset.tono)')
    ok(tonos==['','','rev','rev','err'],'los números llevan el color del aviso: %s' % tonos)
    ok(pg.get_attribute('#jornada-conciliacion','data-tono')=='neutro' and 'Escriba cuántos' in pg.inner_text('#jornada-resultado') and 'Quedan 3 puntos por revisar' in pg.inner_text('#jornada-resultado'),
       'sin conteo, la conciliación pide el número y dice cuántos puntos quedan por revisar')
    pg.fill('#jornada-plantados','4'); pg.dispatch_event('#jornada-plantados','change'); pg.wait_for_timeout(400)
    ok(pg.get_attribute('#jornada-conciliacion','data-tono')=='err' and 'Sobra 1 registro' in pg.inner_text('#jornada-resultado'),'con 4 plantados y 5 registrados avisa que sobra 1: '+pg.inner_text('#jornada-resultado'))
    guardado=pg.evaluate("async () => (await SRP.almacen.uno('cierres', SRP.reportes.claveCierre('%s', SRP.sesion.usuario.id))).arboles_plantados" % J['f'])
    ok(guardado==4,'y el conteo queda en el cierre del día de esa jornada')
    # Tocar un punto lo marca en mapa y lista
    pg.click('#jornada-lista .punto-jornada[data-id="%s"] .punto-datos' % J['ids'][1]); pg.wait_for_timeout(300)
    ok(pg.locator('#jornada-lista .punto-jornada.elegido').count()==1 and pg.locator('#jornada-mapa .pin-num.elegido').count()==1 and pg.inner_text('#jornada-mapa .pin-num.elegido')=='2','tocar el punto 2 en la lista lo marca en la lista y en el mapa')
    # Eliminar el duplicado desde la jornada
    pg.click('#jornada-lista .punto-jornada[data-id="%s"] [data-accion=eliminar]' % J['ids'][3]); pg.wait_for_timeout(300)
    pg.click('#btn-confirmar-si'); pg.wait_for_timeout(700)
    ok(pg.is_visible('#jornada-detalle') and pg.locator('#jornada-lista .punto-jornada').count()==4 and pg.locator('#jornada-mapa .pin-num').count()==4,'eliminar el duplicado deja la jornada en 4 puntos y sigue en la misma pantalla')
    ok(pg.get_attribute('#jornada-conciliacion','data-tono')=='rev' and pg.inner_text('#jornada-resultado').startswith('Cuadra: 4 plantados y 4 registrados'),'y ahora cuadra: '+pg.inner_text('#jornada-resultado'))
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
    pg.click('#btn-jornada-reporte'); pg.wait_for_timeout(500)
    ok(pg.is_visible('#vista-reportes') and pg.input_value('#pdf-dia')==J['f'],'«Reporte de la jornada» abre Reportes con la fecha de la jornada')
    pg.click('#btn-pdf'); pg.wait_for_timeout(400); pg.click('#btn-cierre-generar'); pg.wait_for_timeout(500)
    ok('plantados según la cuadrilla: 4 · registrados: 4 (cuadra)' in pg.inner_text('#previa-hoja'),'y el reporte lleva la conciliación')
    pg.click('#btn-previa-cerrar') if pg.locator('#btn-previa-cerrar').count() else pg.keyboard.press('Escape'); pg.wait_for_timeout(300)
    pg.click('#navegacion [data-vista=jornadas]'); pg.wait_for_timeout(600)
    ok(pg.is_visible('#jornadas-lista-caja') and pg.is_hidden('#jornada-detalle'),'volver a Jornadas abre la lista')
    pg.click('#jornada-atajos [data-atajo=dia]'); pg.fill('#jornada-dia', J['f']); pg.dispatch_event('#jornada-dia','change'); pg.wait_for_timeout(400)
    ok(pg.locator('#lista-jornadas .jornada').count()==1 and 'Revisada: 4 de 4' in pg.inner_text('#lista-jornadas'),'«Un día» deja sólo esa jornada, ya revisada: '+pg.inner_text('#lista-jornadas .insignia-jornada'))
    pg.click('#jornada-atajos [data-atajo=todas]'); pg.wait_for_timeout(300)
    # Los cuatro puntos de prueba se retiran para no alterar las cuentas que siguen
    pg.evaluate("async () => { const tx = SRP.almacen.db.transaction(['plantaciones','cierres'],'readwrite'); %s.forEach(id => tx.objectStore('plantaciones').delete(id)); tx.objectStore('cierres').delete(SRP.reportes.claveCierre('%s', SRP.sesion.usuario.id)); await new Promise(r => tx.oncomplete = r); }" % (json.dumps(J['ids']), J['f']))
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
    pg.click('#btn-franja-enviar'); pg.wait_for_timeout(300)
    ok('Sin conexión' in pg.inner_text('#aviso') and pg.get_attribute('#aviso','data-tipo')=='alerta','«Enviar ahora» sin señal explica que se enviará solo (D111): '+pg.inner_text('#aviso'))
    pg.evaluate("SRP.app.mostrarVista('registros')"); pg.wait_for_timeout(500)
    ok(pg.locator('#lista-registros li[data-id="%s"] .marca-envio' % rid).count()==1,'la tarjeta lleva la marca «Por enviar» (D111)')
    ctx.set_offline(False); pg.wait_for_timeout(300)
    ok(pg.text_content('#conexion').strip()=='Enviando 1…','al volver la señal sale solo, sin que nadie toque nada (D111)')
    pg.wait_for_timeout(1700)
    ok(pg.text_content('#conexion').strip()=='Con conexión · Al día' and pg.is_hidden('#franja-envio'),'y la pastilla queda «Al día» y la franja se va (D111)')
    ok('1 registro enviado al servidor (simulado)' in pg.inner_text('#aviso'),'con aviso de recepción: '+pg.inner_text('#aviso'))
    li='#lista-registros li[data-id="%s"]' % rid
    ok(pg.locator(li+' .marca-envio').count()==0 and re.search(r'[A-Z]{3}-\d{3}-\d{5}', pg.inner_text(li+' .registro-fecha')) is not None,'la tarjeta pierde la marca y muestra su folio, sin repintar la lista (D111)')
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
    ok(resp['sistema']=='SRP' and len(resp['plantaciones'])>=4 and all(k in resp for k in ('cierres','bitacora','usuarios','catalogos')) and len(resp['catalogos'])>=76,
       'el respaldo lleva las cinco tablas (D87): %d registros, %d catálogos' % (len(resp['plantaciones']), len(resp['catalogos'])))
    ok(resp['resumen']['con_foto']>=1 and resp['resumen']['foto_bytes']>0,'y el resumen de fotografías: %s' % resp['resumen'])
    ok(all('es_ficticio' in c for c in resp['cierres']) and all('es_ficticio' in b for b in resp['bitacora']),'cierres y bitácora llevan es_ficticio (D87)')
    ctx2=b.new_context(viewport={'width':390,'height':844}); pg2=ctx2.new_page(); pg2.goto(BASE); pg2.wait_for_timeout(1200)
    pg2.select_option('#sel-usuario-prueba','u-cabo-1'); pg2.click('#btn-entrar-prueba'); pg2.wait_for_timeout(500)
    antes=pg2.evaluate("SRP.almacen.todos('plantaciones').then(r=>r.length)")
    pg2.set_input_files('#archivo-restaurar', ruta); pg2.wait_for_timeout(1200)
    despues=pg2.evaluate("SRP.almacen.todos('plantaciones').then(r=>r.length)")
    ok(antes==0 and despues==len(resp['plantaciones']),'y se restaura en un dispositivo limpio: %d → %d registros' % (antes, despues))
    pg2.set_input_files('#archivo-restaurar', ruta); pg2.wait_for_timeout(800)
    ok(pg2.evaluate("SRP.almacen.todos('plantaciones').then(r=>r.length)")==despues,'restaurar dos veces no duplica nada')
    ctx2.close()
    # Lo escrito no se vuelve a pedir al regenerar el reporte del mismo día
    pg.click('#btn-pdf'); pg.wait_for_timeout(400)
    ok(pg.input_value('#cie-sitio').startswith('Calzada de prueba'),'al regenerar, el cierre ya viene escrito')
    ok(pg.input_value('#cie-hora')=='14:30' and pg.input_value('#cie-vehiculo_placa')=='ABC-123','con todos sus campos')
    ok(pg.evaluate("document.getElementById('cie-apoyo').tagName")=='TEXTAREA','personal de apoyo admite varias líneas')
    ok(pg.evaluate("[...document.querySelectorAll('#form-cierre .campo')][0].contains(document.getElementById('cie-encargado'))"),'el encargado es el primer campo del cierre')
    pg.click('#btn-cierre-cerrar'); pg.wait_for_timeout(300)
    # Los campos vacíos no se inventan: el cierre guardado no trae lo que no se escribió
    vacios=pg.evaluate("async () => { const c = await SRP.almacen.uno('cierres', SRP.reportes.claveCierre(SRP.util.fechaHoy(), SRP.sesion.usuario.id)); return [c.actividades, c.observaciones]; }")
    ok(pg.evaluate("async () => !(await SRP.almacen.uno('cierres', SRP.reportes.claveCierre(SRP.util.fechaHoy(), '')))"),'el cierre de un cabo se guarda con su propio id, la llave de su jornada (D112)')
    ok(all(v=='' for v in vacios),'y lo que no se escribió queda vacío, no inventado')

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
    accion(pg,'#lista-registros','eliminar'); pg.click('#btn-confirmar-si'); pg.wait_for_timeout(500)
    ok('Total: 3 ' in pg.inner_text('#registros-total'),'eliminar retira del listado: '+pg.inner_text('#registros-total'))
    av=pg.evaluate("(() => { const a=document.getElementById('aviso'); const r=a.getBoundingClientRect(); return { texto: a.querySelector('.aviso-texto').textContent, deshacer: !!a.querySelector('.aviso-accion'), cerrar: !!a.querySelector('.aviso-cerrar'), arriba: r.top < innerHeight/3 }; })()")
    ok(av=={'texto':'Registro eliminado.','deshacer':True,'cerrar':True,'arriba':True},'el aviso flotante va arriba, con × y «Deshacer» (D101): %s' % av)
    pg.click('#aviso .aviso-accion'); pg.wait_for_timeout(500)
    ok('Total: 4 ' in pg.inner_text('#registros-total') and 'restaurado' in pg.inner_text('#aviso'),'«Deshacer» devuelve el registro eliminado: '+pg.inner_text('#registros-total'))
    ok(pg.evaluate("(async () => (await SRP.bitacora.deEntidad(SRP.registros.filtrados[0].id)).length >= 0)()") is True and
       pg.evaluate("(async () => { const b = await SRP.almacen.todos('bitacora'); return b.some(x => x.accion === 'RESTAURADO'); })()"),'y la bitácora deja constancia con RESTAURADO')
    accion(pg,'#lista-registros','eliminar'); pg.click('#btn-confirmar-si'); pg.wait_for_timeout(500)
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
    ok(pg.is_visible('#caja-filtro-cabo'),'sí tiene filtro por cabo')
    # Quien ve a varias personas elige el encargado del reporte, y sólo entre quienes registraron (B19)
    pg.click('.pestana[data-vista=reportes]'); pg.wait_for_timeout(600)
    ok(pg.is_visible('#caja-pdf-cabo') and pg.locator('#pdf-cabo option').count()>=2,'el coordinador elige el cabo del reporte en Reportes')
    pg.click('#btn-pdf'); pg.wait_for_timeout(400)
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
    rep=pg.evaluate("(() => { const b=document.querySelector('#vista-reportes .bloque').getBoundingClientRect(); return Math.abs((b.left + b.right)/2 - innerWidth/2) < 40; })()")
    ok(rep,'en computadora el reporte del día va centrado (D109)')
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
    accion(pg,'#tabla-catalogo','estado'); pg.click('#btn-confirmar-si'); pg.wait_for_timeout(400)
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
    accion(pg,f,'eliminar'); pg.click('#btn-confirmar-si'); pg.wait_for_timeout(500)
    ok('Sutana' not in pg.inner_text('#tabla-usuarios'),'se elimina una cuenta sin registros')
    f2=pg.locator('#tabla-usuarios tbody tr', has_text='Fulana')
    accion(pg,f2,'estado'); pg.click('#btn-confirmar-si'); pg.wait_for_timeout(500)
    ok('Inactivo' in pg.locator('#tabla-usuarios tbody tr', has_text='Fulana').inner_text(),'se desactiva una cuenta')
    pg.click('#btn-cuenta'); pg.click('#btn-cerrar-sesion'); pg.wait_for_timeout(400)
    ok(pg.is_visible('#vista-acceso') and pg.is_hidden('#encabezado-usuario'),'cerrar sesión devuelve al acceso')
    ok(pg.is_visible('#acceso-clave') and pg.get_attribute('#acceso-clave','autocomplete')=='current-password','y el campo de contraseña vuelve, con su autollenado de contraseña (D108)')
    pg.fill('#acceso-correo','cabo@ejemplo.local'); pg.fill('#acceso-clave','x')
    pg.click('#form-acceso button[type=submit]'); pg.wait_for_timeout(400)
    ok('desactivada' in pg.inner_text('#acceso-errores'),'y la cuenta desactivada ya no entra')

    b.close()
print('\n'.join(res)); print('ERRORES CONSOLA:',errores or 'ninguno')
print('fallas:',sum(r.startswith('FALLA') for r in res),'de',len(res))
