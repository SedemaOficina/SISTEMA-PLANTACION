# RECORRIDO COMPLETO. El sistema arranca vacío: lo que hace falta para probar se captura aquí.
from playwright.sync_api import sync_playwright
import os
BASE='http://127.0.0.1:8099/'
HOY='2026-09-21'
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
    ok('0.5.5' in pg.inner_text('#version'),'la versión sale de la marca del archivo: '+pg.inner_text('#version'))
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

    pg.click('#btn-ubicacion'); pg.wait_for_timeout(800)
    ok('Ficticia' in pg.inner_text('#dato-alcaldia'),'el botón ubica y deriva alcaldía: '+pg.inner_text('#dato-alcaldia'))
    ok(pg.inner_text('#dato-coordenadas').count('.')==2,'la coordenada se escribe en su campo: '+pg.inner_text('#dato-coordenadas'))
    ok(',' not in pg.inner_text('#mapa-estado'),'y ya no se repite bajo el mapa: '+pg.inner_text('#mapa-estado'))
    ok('Actualizar ubicación' in pg.inner_text('#btn-ubicacion'),'con punto puesto, el botón pasa a actualizar')
    # Con punto puesto ya no se captura: se corrige, y se ve como todo lo que se corrige
    corr=pg.evaluate("""() => {
      const b = document.getElementById('btn-ubicacion');
      return { clase: b.className, color: getComputedStyle(b).color,
               editar: getComputedStyle(document.getElementById('btn-resumen-corregir')).color,
               icono: b.innerHTML.includes(SRP.ICONOS.lapiz.match(/d="([^"]+)"/)[1]) };
    }""")
    ok('btn-editar' in corr['clase'] and corr['color']==corr['editar'],
       'y toma el dorado de corregir: '+corr['color'])
    ok(corr['icono'],'con el lápiz, porque el color nunca va solo')

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
    ok('SEP-2026' in pg.inner_text('#revision-lista'),'las fechas se leen con el mes en letras')
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

    # ---------- REGISTROS ----------
    pg.click('.pestana[data-vista=registros]'); pg.wait_for_timeout(600)
    hoy_txt=pg.inner_text('#chip-hoy')
    ok(hoy_txt.startswith('Hoy, ') and 'SEP-2026' in hoy_txt,'el chip de hoy lleva la fecha con el mes en letras: '+hoy_txt)
    ok(pg.locator('#filtro-atajos .chip[data-atajo=hoy][aria-pressed=true]').count()==1,'al entrar, el filtro es Hoy')
    ok('Total: 2 ' in pg.inner_text('#registros-total'),'sólo los de hoy: '+pg.inner_text('#registros-total'))
    clases=pg.evaluate("""[...document.querySelectorAll('#lista-registros button')].slice(0,3)
        .map(b=>b.className.split(' ')[1]+'/'+(b.querySelector('svg')?'con icono':'SIN ICONO'))""")
    ok(clases==['btn-secundario/con icono','btn-editar/con icono','btn-peligro/con icono'],'ver, editar y eliminar con su color e icono')
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
    pg.click('.filtros-mas summary'); pg.wait_for_timeout(200)
    pg.fill('#filtro-desde','2026-09-30'); pg.fill('#filtro-hasta','2026-09-01'); pg.click('#btn-filtrar'); pg.wait_for_timeout(300)
    ok('posterior' in pg.inner_text('#aviso'),'un rango invertido se rechaza')
    pg.fill('#filtro-desde','2026-08-01'); pg.fill('#filtro-hasta','2026-08-31'); pg.click('#btn-filtrar'); pg.wait_for_timeout(300)
    ok('Total: 1 ' in pg.inner_text('#registros-total'),'el rango de agosto trae uno')
    ok(pg.input_value('#filtro-anio')=='','el rango limpia Año y Mes')
    pg.click('.chip[data-atajo=todos]'); pg.wait_for_timeout(300)
    ok(pg.input_value('#filtro-desde')=='','y un atajo limpia el rango')

    with pg.expect_download() as d: pg.click('#btn-pdf')
    d.value.save_as('/home/claude/srp/reporte_prueba.pdf')
    ok(os.path.getsize('/home/claude/srp/reporte_prueba.pdf')>20000,'el reporte PDF se genera: '+d.value.suggested_filename)

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
