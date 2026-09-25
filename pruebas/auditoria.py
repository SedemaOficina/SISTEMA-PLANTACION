# AUDITORÍA DE CONSISTENCIA
# Revisa que lo guardado se corresponda entre sí y con los catálogos: perfiles válidos, autores
# existentes, referencias que apuntan a algo, y que no quede rastro de la nomenclatura anterior.
from playwright.sync_api import sync_playwright
import glob, re, os
BASE = 'http://127.0.0.1:8099/'
hallazgos = []

def mirar(cond, descripcion, detalle=''):
    hallazgos.append((bool(cond), descripcion, detalle))

# --- 1. Lo que hay en el código y en los textos ---
APP = '/home/claude/srp/app'
archivos = glob.glob(APP+'/js/*.js') + [APP+'/index.html', APP+'/css/estilos.css']
viejos = ['registrador', 'Registrador', 'REGISTRADOR', 'jefe_id', "'JEFE'", 'Jefe de registradores']
for termino in viejos:
    donde = [os.path.basename(f) for f in archivos if termino in open(f).read()]
    mirar(not donde, 'sin rastro de «%s» en el código' % termino, ', '.join(donde))
# Los documentos vigentes tampoco (DECISIONES y BITACORA son historia y conservan lo viejo con nota)
docs = [APP+'/README.md', APP+'/MAPEO-CAMPOS.md', APP+'/DICCIONARIO-DATOS.md', APP+'/esquema.json']
for termino in ['Jefe de registradores', 'registrador', '`grupo`', 'cuatro almacenes', 'e-001']:
    donde = [os.path.basename(f) for f in docs if os.path.exists(f) and termino in open(f, encoding='utf-8').read()]
    mirar(not donde, 'sin rastro de «%s» en la documentación vigente' % termino, ', '.join(donde))

with sync_playwright() as p:
    b = p.chromium.launch(); pg = b.new_page(); errores = []
    pg.on('pageerror', lambda e: errores.append(str(e)))
    pg.goto(BASE); pg.wait_for_timeout(1500)

    # --- 2. Perfiles ---
    perfiles = pg.evaluate("Object.keys(SRP.PERFILES)")
    mirar(sorted(perfiles) == ['ADMIN','CABO','COORDINADOR'],
          'el catálogo de perfiles es el acordado', str(perfiles))
    etiquetas = pg.evaluate("Object.values(SRP.PERFILES).map(p=>p.etiqueta)")
    mirar('Cabo' in etiquetas and 'Coordinador' in etiquetas,
          'las etiquetas dicen Cabo y Coordinador', str(etiquetas))

    # --- 3. Lo guardado en el dispositivo ---
    d = pg.evaluate("""() => {
      const perfiles = Object.keys(SRP.PERFILES);
      const us = SRP.ref.usuarios, cat = SRP.ref.catalogoPorId, porId = SRP.ref.usuarioPorId;
      return {
        total: us.length,
        perfilesUsados: [...new Set(us.map(u=>u.perfil))],
        perfilDesconocido: us.filter(u=>!perfiles.includes(u.perfil)).map(u=>u.correo+':'+u.perfil),
        sinCorreo: us.filter(u=>!u.correo).map(u=>u.id),
        correosRepetidos: us.map(u=>(u.correo||'').toLowerCase()).filter((c,i,a)=>a.indexOf(c)!==i),
        areaInexistente: us.filter(u=>!cat[u.area_id]).map(u=>u.correo),
        coordinadorInexistente: us.filter(u=>u.coordinador_id && !porId[u.coordinador_id]).map(u=>u.correo),
        coordinadorSinPerfil: us.filter(u=>u.coordinador_id && porId[u.coordinador_id] &&
            !['COORDINADOR','ADMIN'].includes(porId[u.coordinador_id].perfil)).map(u=>u.correo),
        campoViejoUsuarios: us.filter(u=>'jefe_id' in u).map(u=>u.correo)
      };
    }""")
    mirar(d['total'] == 3, 'hay exactamente las tres cuentas de arranque (%d)' % d['total'])
    mirar(sorted(d['perfilesUsados']) == ['ADMIN','CABO','COORDINADOR'],
          'una cuenta por perfil operativo', str(d['perfilesUsados']))
    mirar(not d['perfilDesconocido'], 'toda cuenta tiene un perfil del catálogo', str(d['perfilDesconocido']))
    mirar(set(d['perfilesUsados']) <= {'CABO','COORDINADOR','ADMIN'},
          'los perfiles guardados son los de ahora', str(d['perfilesUsados']))
    mirar(not d['sinCorreo'], 'toda cuenta tiene correo', str(d['sinCorreo']))
    mirar(not d['correosRepetidos'], 'ningún correo repetido', str(d['correosRepetidos']))
    mirar(not d['areaInexistente'], 'el área de cada cuenta existe en el catálogo', str(d['areaInexistente']))
    mirar(not d['coordinadorInexistente'], 'el coordinador asignado existe', str(d['coordinadorInexistente']))
    mirar(not d['coordinadorSinPerfil'], 'quien figura como coordinador tiene ese perfil', str(d['coordinadorSinPerfil']))
    mirar(not d['campoViejoUsuarios'], 'ninguna cuenta conserva el campo anterior', str(d['campoViejoUsuarios']))

    r = pg.evaluate("""() => new Promise(res=>{
      SRP.almacen.todos('plantaciones').then(ps=>{
        const cat = SRP.ref.catalogoPorId, porId = SRP.ref.usuarioPorId;
        res({
          total: ps.length,
          sinAutor: ps.filter(p=>!p.cabo_id).map(p=>p.id),
          autorInexistente: ps.filter(p=>p.cabo_id && !porId[p.cabo_id]).map(p=>p.id),
          campoViejo: ps.filter(p=>'registrador_id' in p).map(p=>p.id),
          especieInexistente: ps.filter(p=>p.especie_id && !cat[p.especie_id]).map(p=>p.id),
          sinEspecie: ps.filter(p=>!p.especie_id && !p.especie_otra).map(p=>p.id),
          programaInexistente: ps.filter(p=>!cat[p.programa_id]).map(p=>p.id),
          estatusRaro: [...new Set(ps.map(p=>p.estatus))].filter(e=>!['activo','eliminado'].includes(e)),
          fechaMalFormada: ps.filter(p=>!/^\\d{4}-\\d{2}-\\d{2}$/.test(p.fecha_plantacion)).map(p=>p.id),
          fueraDeAmbito: ps.filter(p=>!SRP.derivacion.dentroDelAmbito(p.lat,p.lng)).map(p=>p.id),
          sinOrigen: ps.filter(p=>!SRP.mapa.ORIGENES[p.punto_origen]).map(p=>p.id),
          capaVieja: ps.filter(p=>String(p.capa_version||'').includes('fictic')).map(p=>p.id),
          precisionHuerfana: ps.filter(p=>(p.gps_precision_m!=null)!==(p.punto_origen==='gps')).map(p=>p.id)
        });
      });
    })""")
    mirar(r['total'] == 0, 'el sistema arranca sin ninguna plantación (%d)' % r['total'])
    mirar(not r['sinAutor'], 'toda plantación tiene autor', str(r['sinAutor']))
    mirar(not r['autorInexistente'], 'el autor de cada plantación existe', str(r['autorInexistente']))
    mirar(not r['campoViejo'], 'ninguna plantación conserva el campo anterior', str(r['campoViejo']))
    mirar(not r['especieInexistente'], 'la especie de cada plantación existe', str(r['especieInexistente']))
    mirar(not r['sinEspecie'], 'toda plantación dice qué especie es', str(r['sinEspecie']))
    mirar(not r['programaInexistente'], 'el programa de cada plantación existe', str(r['programaInexistente']))
    mirar(not r['estatusRaro'], 'los estados son los previstos', str(r['estatusRaro']))
    mirar(not r['fechaMalFormada'], 'las fechas guardadas tienen el formato de siempre', str(r['fechaMalFormada']))
    mirar(not r['fueraDeAmbito'], 'ninguna plantación cae fuera de la ciudad', str(r['fueraDeAmbito']))
    mirar(not r['sinOrigen'], 'toda plantación dice de dónde salió su coordenada', str(r['sinOrigen']))

    # --- Capas territoriales: lo cargado coincide con lo recibido del SIA ---
    import json as _json
    capas = pg.evaluate("""() => ({
      alc: SRP.CAPAS.alcaldias.geojson.features.map(f=>f.properties.cvegeo).sort(),
      uga: SRP.CAPAS.uga.geojson.features.map(f=>f.properties.clave).sort(),
      col: SRP.CAPAS.colonias.geojson.features.map(f=>f.properties.clave).sort(),
      prefijos: [...new Set(SRP.CAPAS.uga.geojson.features.map(f=>f.properties.clave.split('-')[0]))].sort(),
      claves: SRP.CAPAS.alcaldias.geojson.features.map(f=>f.properties.clave).sort(),
      versiones: [SRP.CAPAS.alcaldias.meta.version, SRP.CAPAS.uga.meta.version, SRP.CAPAS.colonias.meta.version]
    })""")
    ruta_f = 'assets/fuentes' if os.path.exists('assets/fuentes') else os.path.join('..', 'assets', 'fuentes')
    # La capa de alcaldías viene como GeoJSON por renglones (un Feature por línea)
    texto_a = open(os.path.join(ruta_f, 'alcaldias_cdmx.json'), encoding='utf-8').read()
    try: feats_a = _json.loads(texto_a)['features']
    except ValueError: feats_a = [_json.loads(l) for l in texto_a.splitlines() if l.strip()]
    orig_a = sorted(f['properties']['cvegeo'] for f in feats_a)
    orig_u = sorted(f['properties']['clave'] for f in _json.load(open(os.path.join(ruta_f, 'UGA_CDMX.geojson'), encoding='utf-8'))['features'])
    mirar(capas['alc'] == orig_a, 'la capa de alcaldías cargada trae las mismas 16 claves que el original del SIA')
    mirar(capas['uga'] == orig_u, 'la capa UGA cargada trae las mismas 1,624 claves que el original del SIA')
    orig_c = sorted(f['properties']['CVEUT'] for f in _json.load(open(os.path.join(ruta_f, 'colonias_iecm2022.geojson'), encoding='utf-8'))['features'])
    mirar(capas['col'] == orig_c, 'la capa de colonias cargada trae las mismas 1,837 claves que el original del IECM')
    mirar(capas['prefijos'] == capas['claves'], 'cada prefijo de UGA es una alcaldía y cada alcaldía tiene UGAs', str(capas['prefijos']))
    mirar(all(v and 'fictic' not in v for v in capas['versiones']), 'ninguna capa cargada es ficticia', str(capas['versiones']))
    mirar(not r.get('capaVieja'), 'ninguna plantación se derivó con la capa ficticia', str(r.get('capaVieja')))
    # Si esta regla se rompe, un punto señalado con el dedo puede leerse como medido con GPS
    mirar(not r['precisionHuerfana'], 'la precisión aparece si y sólo si el punto vino del GPS', str(r['precisionHuerfana']))

    # --- 4. Lo que ve la persona ---
    opciones = pg.eval_on_selector_all('#sel-usuario-prueba option', 'os=>os.map(o=>o.textContent)')
    mirar(len(opciones) == 3, 'el selector ofrece las tres cuentas', str(opciones))
    mirar(not [o for o in opciones if 'no reconocido' in o or o.endswith('— Consulta')],
          'ninguna cuenta aparece con perfil no reconocido', str(opciones))
    mirar(any('— Cabo' in o for o in opciones), 'aparecen cuentas de Cabo', str(opciones))
    mirar(any('— Coordinador' in o for o in opciones), 'aparece la cuenta de Coordinador')
    mirar(any('— Administración global' in o for o in opciones), 'aparece la cuenta de Administración')
    desconocidos = pg.evaluate("[...SRP.permisos.perfilesDesconocidos]")
    mirar(not desconocidos, 'ningún perfil desconocido apareció al pintar', str(desconocidos))
    mirar(not errores, 'sin errores en consola', str(errores))

    # --- 5. El mapeo de campos contra la realidad ---
    # Un documento de campos que nadie comprueba envejece en silencio y acaba mintiendo. Aquí se
    # compara en los dos sentidos: lo que el sistema guarda tiene que estar escrito, y lo escrito
    # tiene que existir. La bitácora arranca vacía, así que sus campos se le piden a quien los
    # produce, sin guardar nada, en vez de copiarlos a mano.
    reales = pg.evaluate("""async () => {
      const campos = async (almacen, muestra) => {
        const filas = await SRP.almacen.todos(almacen);
        const s = new Set(muestra || []);
        filas.forEach(f => Object.keys(f).forEach(k => s.add(k)));
        return [...s];
      };
      // La bitácora se firma con quien tiene la sesión: se presta una y se devuelve
      const bitacora = () => {
        const previo = SRP.sesion.usuario;
        SRP.sesion.usuario = previo || SRP.ref.usuarios[0];
        const campos = Object.keys(SRP.bitacora.entrada('CREADO', 'plantacion', 'x', 'y'));
        SRP.sesion.usuario = previo;
        return campos;
      };
      const plant = Object.keys(Object.assign(
        { id:1, estatus:1, es_ficticio:1, cabo_id:1, lat_original:1, lng_original:1,
          fecha_registro:1, fecha_ultima_edicion:1, editado_por_id:1,
          folio:1, folio_uga:1, folio_capa_version:1, folio_lat:1, folio_lng:1, jornada_id:1 },
        SRP.formulario.valores.call({
          estado: { especieId: 'x', foto: null, fotoId: null, fotoNombre: '', fotoBytes: 0,
                    territorio: { alcaldia:'a', colonia:'c', uga:'u', capa_version:'v' } },
          OTRA: '__otra__', el: (i) => document.getElementById(i), programaDeJornada: () => 'p'
        })));
      return {
        plantaciones: plant,
        usuarios: await campos('usuarios'),
        catalogos: await campos('catalogos'),
        /* Igual que las plantaciones: los campos se leen del código, no de lo guardado. Un
           almacén vacío haría pasar por inventado todo lo que el mapeo documenta. */
        jornadas: ['id','es_ficticio','nombre','ubicacion','programa_id','lat','lng','punto_origen','gps_precision_m','alcaldia_cve','alcaldia','colonia_cve','colonia','fecha','comentarios','cabo_id','estatus','fecha_inicio','fecha_cierre','encargado_id','creado_por_id','fecha_creacion',
                  'editado_por_id','fecha_ultima_edicion','meta_arboles','puntos_revisados','reporte_en'].concat(SRP.reportes.CAMPOS),
        bitacora: bitacora()
      };
    }""")
    import re, os
    ruta = 'MAPEO-CAMPOS.md' if os.path.exists('MAPEO-CAMPOS.md') else os.path.join('..', 'MAPEO-CAMPOS.md')
    texto = open(ruta, encoding='utf-8').read()
    documentados = set(re.findall(r'`([a-z_][a-z0-9_]*)`', texto))
    guardados = set()
    for lista in reales.values():
        guardados.update(lista)
    sin_documentar = sorted(guardados - documentados)
    mirar(not sin_documentar, 'todo campo que se guarda está en el mapeo', str(sin_documentar))
    # Al revés sólo se revisan los nombres con guion bajo: los de una palabra (`id`, `clave`,
    # `tipo`) aparecen en el texto por otras razones y darían falsos positivos.
    inventados = sorted(c for c in documentados if '_' in c and c not in guardados
                        and not c.startswith('nombre_cientifico'))
    mirar(not inventados, 'y el mapeo no inventa campos que no existen', str(inventados))

    # --- 5. esquema.json: la fuente única del modelo de datos (D86) ---
    import json, sys
    esquema = json.load(open(os.path.join(APP, 'esquema.json'), encoding='utf-8'))
    almacenes = pg.evaluate("SRP.almacen.ALMACENES")
    mirar(sorted(esquema['tablas']) == sorted(almacenes) == sorted(esquema['almacenamiento']['tablas']),
          'el esquema describe exactamente los almacenes que existen', '%s vs %s' % (sorted(esquema['tablas']), sorted(almacenes)))
    for tabla, def_ in esquema['tablas'].items():
        en_esquema = set(c['campo'] for c in def_['campos'])
        en_codigo = set(reales.get(tabla, []))
        faltan = sorted(en_codigo - en_esquema); sobran = sorted(en_esquema - en_codigo)
        mirar(not faltan and not sobran, 'esquema.json y el sistema guardan los mismos campos en `%s`' % tabla,
              ('faltan en el esquema: %s; ' % faltan if faltan else '') + ('sobran en el esquema: %s' % sobran if sobran else ''))
        for c in def_['campos']:
            if c['dominio'] in esquema['dominios'] or c['dominio'].startswith('→') or 'dominio' not in c: continue
    indices = pg.evaluate("(() => { const r = {}; for (const n of SRP.almacen.db.objectStoreNames) { const s = SRP.almacen.db.transaction(n).objectStore(n); r[n] = { llave: s.keyPath, indices: [...s.indexNames] }; } return r; })()")
    for tabla, def_ in esquema['tablas'].items():
        mirar(indices[tabla]['llave'] == def_['llave'] and sorted(indices[tabla]['indices']) == sorted(def_['indices']),
              'llave e índices de `%s` son los del esquema' % tabla, str(indices[tabla]))
    for nombre, dom in esquema['dominios'].items():
        if 'codigo' in dom:
            en_codigo = pg.evaluate(dom['codigo'])
            mirar(sorted(en_codigo) == sorted(dom['valores']), 'el dominio `%s` coincide con el código' % nombre, '%s vs %s' % (sorted(en_codigo), sorted(dom['valores'])))
    acciones = set(re.findall(r"bitacora\.entrada\('([A-Z_]+)'", ''.join(open(f, encoding='utf-8').read() for f in glob.glob(APP+'/js/*.js'))))
    acciones |= set(re.findall(r"'(ACTIVADO|DESACTIVADO)'", ''.join(open(f, encoding='utf-8').read() for f in glob.glob(APP+'/js/*.js'))))
    mirar(acciones == set(esquema['dominios']['accion_bitacora']['valores']), 'las acciones de bitácora del código son las del esquema', str(sorted(acciones)))
    entidades = set(re.findall(r"bitacora\.entrada\([^,]+, '([a-z]+)'", ''.join(open(f, encoding='utf-8').read() for f in glob.glob(APP+'/js/*.js'))))
    mirar(entidades == set(esquema['dominios']['entidad_bitacora']['valores']), 'las entidades de bitácora del código son las del esquema', str(sorted(entidades)))
    # Toda relación apunta a una tabla que existe y todo campo «→» tiene su relación
    for r in esquema['relaciones']:
        destino = r['a'].split('.')[0].split(' ')[0]
        mirar(destino in esquema['tablas'] or destino.startswith('capas'), 'la relación %s → %s apunta a una tabla del esquema' % (r['de'], r['a']))
    # El diccionario está regenerado
    sys.path.insert(0, os.path.join(APP, 'pruebas'))
    import generar_diccionario
    generado = generar_diccionario.generar(esquema)
    actual = open(os.path.join(APP, 'DICCIONARIO-DATOS.md'), encoding='utf-8').read()
    mirar(generado == actual, 'DICCIONARIO-DATOS.md está regenerado a partir de esquema.json', 'corra pruebas/generar_diccionario.py')
    # Y el esquema con que el navegador valida los respaldos (D150)
    js_actual = open(os.path.join(APP, 'js', 'esquema.js'), encoding='utf-8').read()
    mirar(generar_diccionario.generar_js(esquema) == js_actual, 'js/esquema.js está regenerado a partir de esquema.json (lo usa la validación de respaldos)', 'corra pruebas/generar_diccionario.py')
    # Capas (D152): toda geometría válida después de redondear, o el cruce falla sin avisar
    try:
        from shapely.geometry import shape as _forma
        invalidas = []
        for nombre in ('alcaldias', 'uga', 'colonias'):
            txt = open(os.path.join(APP, 'assets', 'capa-%s.js' % nombre), encoding='utf-8').read()
            ini = txt.index('SRP.CAPAS.%s = ' % nombre) + len('SRP.CAPAS.%s = ' % nombre)
            capa = json.loads(txt[ini:txt.rindex(';')])
            invalidas += ['%s %s' % (nombre, f['properties'].get('clave')) for f in capa['geojson']['features'] if not _forma(f['geometry']).is_valid]
        mirar(not invalidas, 'las tres capas tienen todas sus geometrías válidas tras el redondeo', ', '.join(invalidas[:6]))
    except ImportError:
        mirar(False, 'shapely instalado para revisar las geometrías de las capas', 'pip install shapely')
    # Créditos del mapa (D152): ningún mapa sin crédito
    sin_credito = [os.path.basename(f) for f in glob.glob(APP + '/js/*.js') if 'attributionControl: false' in open(f, encoding='utf-8').read()]
    mirar(not sin_credito, 'todos los mapas muestran el crédito del proveedor (ninguno con attributionControl: false)', ', '.join(sin_credito))
    # Política de seguridad (D150): nada en línea que la política vaya a bloquear en el teléfono
    en_linea = []
    html = re.sub(r'<!--.*?-->', '', open(os.path.join(APP, 'index.html'), encoding='utf-8').read(), flags=re.S)
    if re.search(r'<script(?![^>]*\bsrc=)[^>]*>', html): en_linea.append('index.html: <script> sin src')
    for f in ['index.html'] + sorted(os.path.relpath(x, APP) for x in glob.glob(APP + '/js/*.js')):
        txt = html if f == 'index.html' else open(os.path.join(APP, f), encoding='utf-8').read()
        if f != 'index.html': txt = re.sub(r'/\*.*?\*/', '', txt, flags=re.S)
        for m in re.finditer(r'''\s(style|on[a-z]+)=["'\\]''', txt):
            en_linea.append('%s: %s=' % (f, m.group(1)))
    mirar(not en_linea, 'ningún estilo ni manejador en línea en la página ni en el HTML que arma el código (la política de seguridad los bloquearía)', ', '.join(en_linea[:6]))
    # Folio (D67, 23-09-2026): 13 caracteres, sin prefijo de sistema ni año. No debe quedar rastro
    # del formato de 22 caracteres fuera de la historia (BITACORA y la nota de sustitución de D67)
    campo_folio = next(c for c in esquema['tablas']['plantaciones']['campos'] if c['campo'] == 'folio')
    mirar(campo_folio['tipo'] == 'char(13)' and 'UNIQUE' in campo_folio['dominio'], 'el folio mide 13 caracteres y es único en el esquema', campo_folio['tipo'])
    patron = pg.evaluate("[SRP.folio.PATRON.source, SRP.folio.LARGO, SRP.folio.armar('TLP-318', 1).length]")
    mirar(patron == ['^[A-Z]{3}-\\d{3}-\\d{5}$', 13, 13], 'el patrón del folio en el código es AAA-000-00000', str(patron))
    viejos = []
    for f in ['js/folio.js', 'esquema.json', 'DICCIONARIO-DATOS.md', 'MAPEO-CAMPOS.md', 'README.md', 'DECISIONES.md', 'index.html'] + [os.path.relpath(x, APP) for x in glob.glob(APP + '/js/*.js')]:
        t = open(os.path.join(APP, f), encoding='utf-8').read()
        for marca in ('SRP-AAA-000-AAAA-00000', 'char(22)', 'SRP-TLP-', "'SRP-' +"):
            if marca in t: viejos.append(f + ': ' + marca)
    mirar(not viejos, 'no queda rastro del folio de 22 caracteres fuera de la bitácora', '; '.join(sorted(set(viejos))))
    # Los árboles se plantan; «sembrar» es de agricultura (D114). Se revisa lo que ve la persona: pantalla,
    # reportes y esquema. Cargar los datos de arranque se sigue llamando sembrar en almacen.js: no habla de árboles
    prohibidos = []
    for f in ['index.html', 'esquema.json', 'MAPEO-CAMPOS.md', 'MEJORAS.md', 'js/jornadas.js', 'js/reportes.js', 'js/registros.js', 'js/formulario.js', 'js/espejo.js', 'js/conexion.js', 'js/envio.js']:
        t = open(os.path.join(APP, f), encoding='utf-8').read()
        if re.search(r'\b(sembrad[oa]s?|sembr[oó]|sembraron|siembras?)\b', t.replace('sello con el que se sembró', '').replace('se siembran desde assets', '').replace('Siembra: al abrir con sello', '')): prohibidos.append(f)
    mirar(not prohibidos, 'ningún texto de pantalla, reporte ni esquema dice «sembrar» de un árbol: se dice plantar (D114)', ', '.join(prohibidos))
    b.close()

malos = [h for h in hallazgos if not h[0]]
for ok_, desc, det in hallazgos:
    print(('OK    ' if ok_ else 'FALLA ') + desc + (('  -> ' + det) if (det and not ok_) else ''))
print('\n%d comprobaciones, %d hallazgos' % (len(hallazgos), len(malos)))
