# RECORRIDO COMPLETO. El sistema arranca vacío: lo que hace falta para probar se captura aquí.
from playwright.sync_api import sync_playwright
import re, os
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

def registrar(pg, busqueda, especie_id, programa='p-refor', fecha=None, foto=None):
    """Captura un árbol de principio a fin y devuelve el identificador con que se guardó.
    `busqueda` es lo que se teclea para que la especie salga en la lista, que muestra ocho."""
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
    ok(pg.is_visible('#btn-cerrar-sesion'),'cerrar sesión está junto al nombre, en el encabezado')
    ok(pg.is_visible('#btn-cambiar-perfil'),'y cambiar de usuario, mientras haya datos de prueba')
    ok(pg.locator('#herramientas-prueba #btn-cambiar-perfil').count()==0,'ya no está duplicado al pie')

    # ---------- REGISTRAR ----------
    # A nombre de quién se registra lo dice el encabezado; no se repite como campo
    ok(pg.locator('#campo-cabo').count()==0,'la pantalla no repite el nombre de quien captura')
    ok(pg.locator('#vista-registrar .nota-obligatorio').count()==0,'ni la nota del asterisco')
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
    ok('Esri' in pg.inner_text('.leaflet-control-attribution'),'se muestra la atribución del proveedor')

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
    ok(enfasis['principal_relleno']=='rgb(157, 33, 72)','la acción principal es el guinda relleno')
    ok(enfasis['apoyo']==enfasis['gris'],'y la de apoyo va en gris, no en guinda: '+enfasis['apoyo'])
    ok(enfasis['cerrar_caja']=='rgba(0, 0, 0, 0)' and enfasis['cerrar_borde']=='0px','cerrar sesión es texto, sin caja')
    ok(enfasis['cerrar_subrayado']=='underline','y va subrayado para que se vea que se pulsa')

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
    ok(pg.inner_text('#dato-colonia')=='CENTRO IV','y la colonia real, como viene en la capa: '+pg.inner_text('#dato-colonia'))

    # CAPAS REALES DEL SIA. Puntos conocidos, el hueco medido en la capa y el solape mayor.
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
    ok(capas['hueco']['alcaldia'] is None and capas['hueco']['uga'] is not None and capas['hueco']['capa_version'],
       'en el hueco de la capa no hay alcaldía pero sí UGA y versión, para rederivar después')
    ok(capas['solape'][0]==capas['solape'][1]=='Venustiano Carranza','en el solape GAM–VCA siempre gana el mismo polígono')
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
               editar: getComputedStyle(document.getElementById('btn-resumen-corregir')).color,
               icono: b.innerHTML.includes(SRP.ICONOS.ubicacion.match(/d="([^"]+)"/)[1]),
               texto: b.textContent.trim() };
    }""")
    ok('btn-editar' in corr['clase'] and corr['color']==corr['editar'],
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

    pg.fill('#campo-especie','frax'); pg.wait_for_timeout(120)
    ok(pg.locator('.combo-opcion').count()==2,'el autocompletado busca por nombre científico')
    pg.fill('#campo-especie','trueno'); pg.wait_for_timeout(120)
    ok('Trueno' not in pg.inner_text('#lista-especies'),'una especie inactiva no se ofrece')
    pg.fill('#campo-especie','fres'); pg.wait_for_timeout(120)
    pg.dispatch_event('.combo-opcion[data-id="e-001"]','mousedown'); pg.wait_for_timeout(200)
    ok(pg.input_value('#campo-especie')=='Fresno (Fraxinus uhdei)','al elegir, el campo queda como en el catálogo')
    ok(pg.evaluate("document.activeElement.id")=='campo-programa','elegir especie pasa el foco al programa')
    pg.select_option('#campo-programa','p-refor'); pg.wait_for_timeout(200)
    ok(pg.evaluate("document.activeElement.id")=='campo-fecha','elegir programa pasa el foco a la fecha')

    from PIL import Image; Image.new('RGB',(2400,1800),(70,110,60)).save('/tmp/arbol.jpg',quality=90)
    ok(pg.locator('input[type=file][accept^=image]').count()==1,'hay un solo selector de fotografía')
    ok(pg.get_attribute('#foto-archivo','capture') is None,'sin «capture»: el teléfono ofrece su propio menú')
    ok(pg.is_hidden('#ficha-foto'),'sin foto no hay ficha de archivo')
    pg.set_input_files('#foto-archivo','/tmp/arbol.jpg'); pg.wait_for_timeout(900)
    ok(pg.is_visible('#ficha-foto') and pg.inner_text('#foto-nombre')=='arbol.jpg','la ficha dice el nombre del archivo')
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
    fijo=pg.evaluate("(() => { const d=document.getElementById('dlg-resumen'); d.scrollTop=600; const c=d.querySelector('.dialogo-cabecera').getBoundingClientRect(); const b=document.getElementById('btn-resumen-guardar').getBoundingClientRect(); const dr=d.getBoundingClientRect(); d.scrollTop=0; return { arriba: Math.round(c.top-dr.top), botonVisible: b.top>=dr.top && b.bottom<=dr.bottom, sticky: getComputedStyle(d.querySelector('.dialogo-cabecera')).position }; })()")
    ok(fijo['sticky']=='sticky' and fijo['botonVisible'] and fijo['arriba']<=8,'Guardar y Corregir quedan fijos arriba aunque se desplace la ficha (D74): %s' % fijo)
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
    ids.append(registrar(pg,'ahuehu','e-005'))                              # hoy
    ids.append(registrar(pg,'aile','e-012',fecha='2026-08-10'))             # mes pasado
    ids.append(registrar(pg,'quiebra','e-002',programa='p-centro',fecha='2026-07-05'))
    ok(len(set(ids))==4,'cada árbol recibe su propio identificador')
    # FOLIO (B23): estructura sin emisión
    f=pg.evaluate("""() => ({
      v1: SRP.folio.valido('SRP-TLP-318-2026-00001'), v2: SRP.folio.valido('SRP-TLP-318-2026-1'), v3: SRP.folio.valido('srp-TLP-318-2026-00001'),
      a1: SRP.folio.armar('TLP-318', 2026, 7), a2: SRP.folio.armar(null, 2026, 12),
      texto: SRP.folio.texto({ folio: null }), largo: SRP.folio.armar('CUH-021', 2026, 99999).length })""")
    ok(f['v1'] and not f['v2'] and not f['v3'],'el patrón del folio acepta la forma adoptada y rechaza las demás')
    ok(f['a1']=='SRP-TLP-318-2026-00007' and f['a2']=='SRP-EXT-000-2026-00012' and f['largo']==22,'armar rellena el consecutivo y usa EXT-000 fuera de la malla: '+f['a1'])
    ok(f['texto']=='PROVISIONAL','sin folio, la pantalla dice PROVISIONAL')
    guardado=pg.evaluate("id => SRP.almacen.uno('plantaciones', id)", ids[0])
    ok(guardado['folio'] is None and guardado['folio_uga'] is None and 'folio_lat' in guardado,'el registro nace con los cinco campos del folio en nulo (R8)')
    ok(guardado['especie_estatus']=='VALIDADA','una especie de catálogo queda VALIDADA')

    # ---------- REGISTROS ----------
    pg.click('.pestana[data-vista=registros]'); pg.wait_for_timeout(600)
    hoy_txt=pg.inner_text('#chip-hoy')
    ok(hoy_txt=='Hoy, '+HOY_TXT,'el chip de hoy lleva la fecha con el mes en letras: '+hoy_txt)
    ok(pg.locator('#filtro-atajos .chip[data-atajo=hoy][aria-pressed=true]').count()==1,'al entrar, el filtro es Hoy')
    ok('Total: 2 ' in pg.inner_text('#registros-total'),'sólo los de hoy: '+pg.inner_text('#registros-total'))
    clases=pg.evaluate("""[...document.querySelectorAll('#lista-registros button')].slice(0,3)
        .map(b=>b.className.split(' ')[1]+'/'+(b.querySelector('svg')?'con icono':'SIN ICONO'))""")
    ok(clases==['btn-secundario/con icono','btn-editar/con icono','btn-peligro/con icono'],'ver, editar y eliminar con su color e icono')
    fila=pg.inner_text('#lista-registros .registro >> nth=0')
    ok('(' in fila and 'CENTRO IV' in fila,'cada renglón trae común (científico) y alcaldía, colonia: '+fila.replace(chr(10),' | ')[:90])
    # Espejo en el detalle (B22): los campos guardados que la ficha no enseña
    pg.click('#lista-registros button[data-accion=ver] >> nth=0'); pg.wait_for_timeout(500)
    campos=pg.evaluate("[...document.querySelectorAll('#dlg-detalle .espejo .espejo-campo')].map(e=>e.textContent)")
    ok('colonia_cve' in campos and 'capa_version' in campos and 'uga' in campos and 'id' not in campos,
       'el detalle lleva su espejo con lo que no se ve (%d campos)' % len(campos))
    pg.click('#btn-detalle-cerrar'); pg.wait_for_timeout(200)
    col=pg.evaluate("getComputedStyle(document.querySelector('#lista-registros button[data-accion=eliminar]')).backgroundColor")
    ok(col=='rgb(179, 38, 30)','el botón de eliminar es rojo')
    pg.click('.chip[data-atajo=todos]'); pg.wait_for_timeout(300)
    ok('Total: 4 ' in pg.inner_text('#registros-total'),'«Todos» muestra los cuatro: '+pg.inner_text('#registros-total'))
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
    ok(pg.evaluate("document.activeElement.id")=='filtro-desde','y deja el foco en Desde para elegir de inmediato (D75)')
    pg.fill('#filtro-desde','2026-07-01'); pg.wait_for_timeout(200)
    ok(pg.evaluate("document.activeElement.id")=='filtro-hasta','al elegir Desde, el foco pasa a Hasta')
    pg.fill('#filtro-hasta','2026-07-31'); pg.wait_for_timeout(300)
    ok('Total: 1 ' in pg.inner_text('#registros-total') and pg.get_attribute('.chip[data-atajo=periodo]','aria-pressed')=='true','y al elegir Hasta el periodo se aplica solo: '+pg.inner_text('#registros-total'))
    pg.fill('#filtro-desde','2026-09-30'); pg.fill('#filtro-hasta','2026-09-01'); pg.click('#btn-filtrar'); pg.wait_for_timeout(300)
    ok('posterior' in pg.inner_text('#aviso'),'un rango invertido se rechaza')
    pg.fill('#filtro-desde','2026-08-01'); pg.fill('#filtro-hasta','2026-08-31'); pg.click('#btn-filtrar'); pg.wait_for_timeout(300)
    ok('Total: 1 ' in pg.inner_text('#registros-total'),'el rango de agosto trae uno')
    ok(pg.input_value('#filtro-anio')=='','el rango limpia Año y Mes')
    ok(pg.get_attribute('.chip[data-atajo=periodo]','aria-pressed')=='true','y «Un periodo» queda marcado mientras haya rango')
    # Reiniciar vuelve al estado de entrada: Hoy, sin rango (D53)
    pg.click('#btn-reiniciar-filtros'); pg.wait_for_timeout(300)
    ok(pg.locator('#filtro-atajos .chip[data-atajo=hoy][aria-pressed=true]').count()==1 and pg.input_value('#filtro-desde')=='',
       'Reiniciar filtros vuelve a Hoy y limpia el rango')
    ok('Total: 2 ' in pg.inner_text('#registros-total'),'y lista los de hoy: '+pg.inner_text('#registros-total'))
    ok(pg.is_hidden('#filtro-desde'),'y Reiniciar pliega Desde/Hasta')
    ok([c for c in pg.eval_on_selector_all('#filtro-atajos .chip','b=>b.map(x=>x.dataset.atajo)')]==['hoy','todos','periodo'],'los atajos son Hoy, Todos y Un periodo, en ese orden (D64)')
    pg.click('.chip[data-atajo=periodo]'); pg.wait_for_timeout(200)
    pg.fill('#filtro-desde','2026-08-01'); pg.fill('#filtro-hasta','2026-08-31'); pg.click('#btn-filtrar'); pg.wait_for_timeout(300)
    pg.click('.chip[data-atajo=todos]'); pg.wait_for_timeout(300)
    ok(pg.input_value('#filtro-desde')=='','y un atajo limpia el rango')

    # ---------- REPORTE DEL DÍA (B19) ----------
    # El parte es de un día: con «Todos» elegido el botón no genera, y lo dice
    ok(pg.is_disabled('#btn-pdf'),'con «Todos» el botón de reporte no genera')
    ok('parte de un día' in pg.inner_text('#pdf-nota'),'y la nota explica por qué: '+pg.inner_text('#pdf-nota'))
    pg.click('.chip[data-atajo=hoy]'); pg.wait_for_timeout(300)
    ok(not pg.is_disabled('#btn-pdf'),'con un día elegido, el botón se habilita')
    ok(HOY_TXT in pg.inner_text('#pdf-nota'),'y la nota dice qué se va a reportar: '+pg.inner_text('#pdf-nota'))
    # Un rango con la misma fecha en los dos extremos también es un día
    pg.click('.chip[data-atajo=periodo]'); pg.wait_for_timeout(200)
    pg.fill('#filtro-desde',HOY); pg.fill('#filtro-hasta',HOY); pg.click('#btn-filtrar'); pg.wait_for_timeout(300)
    ok(not pg.is_disabled('#btn-pdf'),'un rango de un solo día también deja generar')
    # Cualquier día, no sólo hoy (D70): el selector «Día del parte» filtra a ese día
    pg.fill('#pdf-dia','2026-08-10'); pg.dispatch_event('#pdf-dia','change'); pg.wait_for_timeout(300)
    ok('Total: 1 ' in pg.inner_text('#registros-total') and not pg.is_disabled('#btn-pdf'),'«Día del parte» con una fecha pasada filtra la lista y habilita el reporte: '+pg.inner_text('#pdf-nota'))
    ok(pg.locator('#filtro-atajos .chip[aria-pressed=true]').count()==0,'y ningún atajo queda marcado, porque no es hoy')
    pg.click('#btn-pdf'); pg.wait_for_timeout(400)
    ok('10-AGO-2026' in pg.inner_text('#dlg-cierre-dia'),'el cierre es del día elegido: '+pg.inner_text('#dlg-cierre-dia'))
    pg.click('#btn-cierre-cancelar'); pg.wait_for_timeout(200)
    pg.click('.chip[data-atajo=hoy]'); pg.wait_for_timeout(300)

    pg.click('#btn-pdf'); pg.wait_for_timeout(400)
    ok(pg.is_visible('#dlg-cierre'),'el botón abre el cierre del parte antes de generar')
    espejoC=pg.evaluate("[...document.querySelectorAll('#espejo-cierre-cuerpo .espejo-campo')].map(e=>e.textContent)")
    ok(espejoC==['id','fecha','cabo_id','creado_por_id','fecha_creacion','editado_por_id','fecha_ultima_edicion'],
       'el cierre lleva su espejo con los siete campos que no se capturan: '+', '.join(espejoC))
    pg.fill('#cie-chofer','Mengano'); pg.wait_for_timeout(200)
    ok(pg.evaluate("SRP.reportes.cierrePrevisto().chofer")=='Mengano','y lo que se escribe entra al mismo objeto que se guarda')
    ok(pg.is_visible('#cie-encargado-lectura') and pg.is_hidden('#cie-encargado-caja'),
       'a un cabo no se le pregunta el encargado: es él')
    ok(pg.inner_text('#cie-encargado-lectura').strip()!='','y sale su nombre: '+pg.inner_text('#cie-encargado-lectura'))
    pg.fill('#cie-sitio','Calzada de prueba entre calle Uno y calle Dos')
    pg.fill('#cie-chofer','Fulano de Tal')
    pg.fill('#cie-hora','14:30')
    pg.fill('#cie-vehiculo_modelo','Camioneta de prueba'); pg.fill('#cie-vehiculo_placa','ABC-123')
    with pg.expect_download() as d: pg.click('#btn-cierre-generar')
    d.value.save_as('/home/claude/srp/reporte_prueba.pdf')
    ok(os.path.getsize('/home/claude/srp/reporte_prueba.pdf')>20000,'el reporte PDF se genera: '+d.value.suggested_filename)
    ok(HOY in d.value.suggested_filename,'y el archivo lleva el día del parte: '+d.value.suggested_filename)

    # ---------- SIN SEÑAL Y RESPALDO (B25) ----------
    ok(pg.inner_text('#conexion')=='Con conexión','el encabezado dice el estado de la conexión con palabras')
    ok('guardados en este dispositivo' in pg.inner_text('#aviso-envio') and 'No borre' in pg.inner_text('#aviso-envio'),
       'Registros dice cuántos registros guarda el dispositivo y qué hacer: '+pg.inner_text('#aviso-envio')[:60])
    pg.click('#btn-ayuda-senal'); pg.wait_for_timeout(200)
    ok(pg.is_visible('#dlg-senal') and pg.locator('#dlg-senal li').count()==5,'la ayuda «¿Qué hacer sin internet?» tiene cinco pasos')
    pg.click('#btn-senal-cerrar'); pg.wait_for_timeout(200)
    # El worker guarda la app: sin red, la página vuelve a abrir
    listo=pg.evaluate("""async () => { const r = await navigator.serviceWorker.ready; for (let i=0;i<50;i++){ const ks = await caches.keys(); if (ks.length) { const c = await caches.open(ks[0]); const k = await c.keys(); if (k.length > 20) return { nombre: ks[0], n: k.length }; } await new Promise(r => setTimeout(r, 200)); } return null; }""")
    ok(listo and listo['nombre']=='srp-'+MARCA and listo['n']>20,'el service worker guardó la app con la marca de versión: %s' % listo)
    ctx.set_offline(True)
    pg.reload(); pg.wait_for_timeout(1500)
    ok(pg.is_visible('#vista-registros') or pg.is_visible('#vista-registrar') or pg.is_visible('#form-acceso'),'sin red, la app vuelve a abrir desde el teléfono')
    ok(pg.evaluate("SRP.CONFIG.VERSION")==MARCA,'y es la misma versión')
    ok(pg.inner_text('#conexion').startswith('Sin conexión'),'el encabezado avisa que no hay señal: '+pg.inner_text('#conexion'))
    pg.evaluate("SRP.app.mostrarVista('registros')"); pg.wait_for_timeout(500)
    ok('Siga registrando' in pg.inner_text('#aviso-envio'),'y Registros dice que se puede seguir: '+pg.inner_text('#aviso-envio')[:70])
    ctx.set_offline(False); pg.wait_for_timeout(300)
    pg.evaluate("SRP.conexion.refrescar()"); pg.wait_for_timeout(300)
    # Respaldo: se descarga y se restaura en un dispositivo limpio
    with pg.expect_download() as d2: pg.click('#btn-respaldo')
    ruta='/home/claude/srp/respaldo_prueba.json'; d2.value.save_as(ruta)
    import json
    resp=json.load(open(ruta,encoding='utf-8'))
    ok(resp['sistema']=='SRP' and len(resp['plantaciones'])>=4 and 'cierres' in resp and 'bitacora' in resp,'el respaldo lleva plantaciones, cierres y bitácora: %d registros' % len(resp['plantaciones']))
    ctx2=b.new_context(viewport={'width':390,'height':844}); pg2=ctx2.new_page(); pg2.goto(BASE); pg2.wait_for_timeout(1200)
    pg2.select_option('#sel-usuario-prueba','u-cabo-1'); pg2.click('#btn-entrar-prueba'); pg2.wait_for_timeout(500)
    antes=pg2.evaluate("SRP.almacen.todos('plantaciones').then(r=>r.length)")
    pg2.set_input_files('#archivo-restaurar', ruta); pg2.wait_for_timeout(1200)
    despues=pg2.evaluate("SRP.almacen.todos('plantaciones').then(r=>r.length)")
    ok(antes==0 and despues==len(resp['plantaciones']),'y se restaura en un dispositivo limpio: %d → %d registros' % (antes, despues))
    pg2.set_input_files('#archivo-restaurar', ruta); pg2.wait_for_timeout(800)
    ok(pg2.evaluate("SRP.almacen.todos('plantaciones').then(r=>r.length)")==despues,'restaurar dos veces no duplica nada')
    ctx2.close()
    # Lo escrito no se vuelve a pedir al regenerar el parte del mismo día
    pg.click('#btn-pdf'); pg.wait_for_timeout(400)
    ok(pg.input_value('#cie-sitio').startswith('Calzada de prueba'),'al regenerar, el cierre ya viene escrito')
    ok(pg.input_value('#cie-hora')=='14:30' and pg.input_value('#cie-vehiculo_placa')=='ABC-123','con todos sus campos')
    ok(pg.evaluate("document.getElementById('cie-apoyo').tagName")=='TEXTAREA','personal de apoyo admite varias líneas')
    ok(pg.evaluate("[...document.querySelectorAll('#form-cierre .campo')][0].contains(document.getElementById('cie-encargado'))"),'el encargado es el primer campo del cierre')
    pg.click('#btn-cierre-cancelar'); pg.wait_for_timeout(300)
    # Los campos vacíos no se inventan: el cierre guardado no trae lo que no se escribió
    vacios=pg.evaluate("async () => { const c = await SRP.almacen.uno('cierres', SRP.reportes.claveCierre(SRP.util.fechaHoy(), '')); return [c.actividades, c.personal, c.observaciones]; }")
    ok(all(v=='' for v in vacios),'y lo que no se escribió queda vacío, no inventado')

    pg.click('#lista-registros button[data-accion=ver] >> nth=0'); pg.wait_for_timeout(900)
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
    pg.click('#lista-registros button[data-accion=editar] >> nth=0'); pg.wait_for_timeout(600)
    ok(pg.is_visible('#edicion-aviso'),'editar abre el formulario precargado')
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
    pg.dispatch_event('.combo-opcion[data-id="e-005"]','mousedown'); pg.wait_for_timeout(200)
    pg.click('#form-plantacion button[type=submit]'); pg.wait_for_timeout(800)
    pg.click('#btn-resumen-guardar'); pg.wait_for_timeout(700)
    pg.click('.chip[data-atajo=todos]'); pg.wait_for_timeout(300)
    pg.click('#lista-registros button[data-accion=ver] >> nth=0'); pg.wait_for_timeout(400)
    ok('editado' in pg.inner_text('#dlg-detalle'),'el historial registra la edición')
    pg.click('#btn-detalle-cerrar'); pg.wait_for_timeout(200)
    pg.click('#lista-registros button[data-accion=eliminar] >> nth=0'); pg.click('#btn-confirmar-si'); pg.wait_for_timeout(500)
    ok('Total: 3 ' in pg.inner_text('#registros-total'),'eliminar retira del listado: '+pg.inner_text('#registros-total'))

    # ---------- COORDINADOR ----------
    pg.click('#btn-cambiar-perfil'); pg.select_option('#sel-usuario-prueba','u-coord-1'); pg.click('#btn-entrar-prueba'); pg.wait_for_timeout(600)
    pg.click('.pestana[data-vista=registros]'); pg.wait_for_timeout(500)
    pg.click('.chip[data-atajo=todos]'); pg.wait_for_timeout(300)
    ok('Total: 3 ' in pg.inner_text('#registros-total'),'el coordinador ve los de su cuadrilla: '+pg.inner_text('#registros-total'))
    ok('Fulana' in pg.inner_text('#lista-registros'),'con el nombre del cabo')
    ok(pg.locator('button[data-accion=editar]').count()>0 and pg.locator('button[data-accion=eliminar]').count()==0,'edita pero no elimina')
    ok(pg.is_hidden('.pestana[data-vista=catalogos]') and pg.is_hidden('.pestana[data-vista=usuarios]'),'no ve Catálogos ni Usuarios')
    ok(pg.is_visible('#caja-filtro-cabo'),'sí tiene filtro por cabo')
    # Quien ve a varias personas elige el encargado del parte, y sólo entre quienes registraron (B19)
    pg.click('.chip[data-atajo=hoy]'); pg.wait_for_timeout(300)
    pg.click('#btn-pdf'); pg.wait_for_timeout(400)
    ok(pg.is_visible('#cie-encargado-caja') and pg.is_hidden('#cie-encargado-lectura'),
       'al coordinador se le ofrece la lista de cabos responsables')
    opciones=pg.eval_on_selector('#cie-encargado',"s=>[...s.options].map(o=>o.textContent.trim()).filter(Boolean)")
    ok(any('Fulana' in o for o in opciones),'con los cabos que registraron ese día: '+', '.join(opciones))
    pg.click('#btn-cierre-cancelar'); pg.wait_for_timeout(200)
    pg.click('.chip[data-atajo=todos]'); pg.wait_for_timeout(300)
    # Al abrir para editar un registro ajeno, el espejo enseña que el autor no cambia de manos
    pg.click('#lista-registros button[data-accion=editar] >> nth=0'); pg.wait_for_timeout(600)
    ajeno=pg.evaluate("""() => ({
      cabo: [...document.querySelectorAll('#espejo-cuerpo tr')].find(t=>t.textContent.includes('cabo_id')).children[1].textContent,
      editor: [...document.querySelectorAll('#espejo-cuerpo tr')].find(t=>t.textContent.includes('editado_por_id')).children[1].textContent,
      quien: SRP.sesion.usuario.id })""")
    ok(ajeno['cabo']=='u-cabo-1' and ajeno['quien']=='u-coord-1',
       'el coordinador edita y el registro sigue siendo del cabo: cabo_id='+ajeno['cabo'])
    ok(ajeno['editor'].startswith('u-coord-1'),'y quien edita queda en editado_por_id: '+ajeno['editor'])
    pg.click('#btn-cancelar-edicion'); pg.wait_for_timeout(400)

    # ---------- ADMINISTRACIÓN: catálogos ----------
    pg.click('#btn-cambiar-perfil'); pg.select_option('#sel-usuario-prueba','u-admin-1'); pg.click('#btn-entrar-prueba'); pg.wait_for_timeout(600)
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
    pg.click('#tabla-catalogo button[data-accion=eliminar]'); pg.click('#btn-confirmar-si'); pg.wait_for_timeout(400)
    ok('Otro Programa' not in pg.inner_text('#tabla-catalogo'),'y se elimina, porque no tiene uso')
    pg.click('#btn-cat-agregar'); pg.fill('#cat-nombre','Reforestación Urbana'); pg.fill('#cat-clave','REFOR_URBANA')
    pg.click('#form-catalogo button[type=submit]'); pg.wait_for_timeout(300)
    ok(pg.locator('#cat-errores li').count()==2,'se bloquean nombre y clave repetidos')
    pg.click('#btn-cat-cancelar'); pg.wait_for_timeout(200)
    pg.click('#cat-tipos .chip[data-tipo=especie]'); pg.wait_for_timeout(400)
    pg.fill('#cat-buscar','quercus'); pg.wait_for_timeout(200)
    ok(pg.locator('#tabla-catalogo tbody tr').count()==3,'el buscador de especies encuentra los tres Quercus')
    pg.fill('#cat-buscar',''); pg.wait_for_timeout(200)
    pg.click('#tabla-catalogo button[data-accion=estado] >> nth=0'); pg.click('#btn-confirmar-si'); pg.wait_for_timeout(400)
    ok(pg.locator('.estado-texto[data-activo=false]').count()>=1,'una especie se puede desactivar')

    # ---------- ADMINISTRACIÓN: usuarios ----------
    pg.click('.pestana[data-vista=usuarios]'); pg.wait_for_timeout(500)
    ok(pg.locator('#tabla-usuarios tbody tr').count()==3,'la lista trae las tres cuentas')
    fila_yo=pg.locator('#tabla-usuarios tbody tr', has_text='Administración SIA')
    ok('usted' in fila_yo.inner_text(),'marca cuál es la cuenta propia')
    ok(fila_yo.locator('button[data-accion=estado]').count()==0,'que no puede desactivarse a sí misma')
    fila_cabo=pg.locator('#tabla-usuarios tbody tr', has_text='Fulana')
    ok(fila_cabo.locator('button[data-accion=eliminar]').count()==0,'una cuenta con registros no ofrece Eliminar')
    ok('Perengano' in fila_cabo.inner_text(),'y muestra quién es su coordinador')
    pg.click('#btn-usr-agregar'); pg.wait_for_timeout(300)
    pg.click('#form-usuario button[type=submit]'); pg.wait_for_timeout(200)
    ok(pg.locator('#usr-errores li').count()==5,'el alta vacía señala los cinco campos obligatorios')
    ok(pg.is_visible('#caja-usr-coordinador'),'el campo Coordinador aparece para perfil Cabo')
    pg.select_option('#usr-perfil','VIEWER'); pg.wait_for_timeout(200)
    ok(pg.is_hidden('#caja-usr-coordinador'),'y desaparece para Consulta')
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
    pg.click('#btn-cambiar-perfil'); pg.fill('#acceso-correo','sutana@ejemplo.local'); pg.fill('#acceso-clave','x')
    pg.click('#form-acceso button[type=submit]'); pg.wait_for_timeout(700)
    ok('Sutana' in pg.inner_text('#usuario-nombre') and pg.is_hidden('.pestana[data-vista=usuarios]'),'la cuenta nueva entra y no ve Usuarios')
    pg.evaluate("SRP.app.mostrarVista('usuarios')"); pg.wait_for_timeout(300)
    ok(pg.is_visible('#vista-registros'),'ni la abre llamándola directamente')
    pg.click('#btn-cambiar-perfil'); pg.select_option('#sel-usuario-prueba','u-admin-1'); pg.click('#btn-entrar-prueba'); pg.wait_for_timeout(500)
    pg.click('.pestana[data-vista=usuarios]'); pg.wait_for_timeout(500)
    f=pg.locator('#tabla-usuarios tbody tr', has_text='Sutana')
    f.locator('button[data-accion=eliminar]').click(); pg.click('#btn-confirmar-si'); pg.wait_for_timeout(500)
    ok('Sutana' not in pg.inner_text('#tabla-usuarios'),'se elimina una cuenta sin registros')
    f2=pg.locator('#tabla-usuarios tbody tr', has_text='Fulana')
    f2.locator('button[data-accion=estado]').click(); pg.click('#btn-confirmar-si'); pg.wait_for_timeout(500)
    ok('Inactivo' in pg.locator('#tabla-usuarios tbody tr', has_text='Fulana').inner_text(),'se desactiva una cuenta')
    pg.click('#btn-cerrar-sesion'); pg.wait_for_timeout(400)
    ok(pg.is_visible('#vista-acceso') and pg.is_hidden('#encabezado-usuario'),'cerrar sesión devuelve al acceso')
    pg.fill('#acceso-correo','cabo@ejemplo.local'); pg.fill('#acceso-clave','x')
    pg.click('#form-acceso button[type=submit]'); pg.wait_for_timeout(400)
    ok('desactivada' in pg.inner_text('#acceso-errores'),'y la cuenta desactivada ya no entra')

    b.close()
print('\n'.join(res)); print('ERRORES CONSOLA:',errores or 'ninguno')
print('fallas:',sum(r.startswith('FALLA') for r in res),'de',len(res))
