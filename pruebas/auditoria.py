# AUDITORÍA DE CONSISTENCIA
# Revisa que lo guardado se corresponda entre sí y con los catálogos: perfiles válidos, autores
# existentes, referencias que apuntan a algo, y que no quede rastro de la nomenclatura anterior.
from playwright.sync_api import sync_playwright
import glob, re, os
BASE = os.environ.get('SRP_BASE', 'http://127.0.0.1:8099/')
hallazgos = []

def mirar(cond, descripcion, detalle=''):
    hallazgos.append((bool(cond), descripcion, detalle))

# --- 1. Lo que hay en el código y en los textos ---
APP = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))   # la carpeta del proyecto, esté donde esté
archivos = glob.glob(APP+'/js/*.js') + [APP+'/index.html', APP+'/css/estilos.css']
viejos = ['registrador', 'Registrador', 'REGISTRADOR', 'jefe_id', "'JEFE'", 'Jefe de registradores']
for termino in viejos:
    donde = [os.path.basename(f) for f in archivos if termino in open(f).read()]
    mirar(not donde, 'sin rastro de «%s» en el código' % termino, ', '.join(donde))
# Los documentos vigentes tampoco (DECISIONES y BITACORA son historia y conservan lo viejo con nota)
docs = [APP+'/README.md', APP+'/datos/MAPEO-CAMPOS.md', APP+'/datos/DICCIONARIO-DATOS.md', APP+'/datos/esquema.json']
for termino in ['Jefe de registradores', 'registrador', '`grupo`', 'cuatro almacenes', 'e-001']:
    donde = [os.path.basename(f) for f in docs if os.path.exists(f) and termino in open(f, encoding='utf-8').read()]
    mirar(not donde, 'sin rastro de «%s» en la documentación vigente' % termino, ', '.join(donde))

# Un id repetido hace que getElementById tome el primero y el segundo control deje de responder
_ids = re.findall(r'\sid="([^"]+)"', open(APP+'/index.html', encoding='utf-8').read())
mirar(len(_ids) == len(set(_ids)), 'ningún id se repite en index.html', ', '.join(sorted({i for i in _ids if _ids.count(i) > 1})))

# --- 1b. La hoja de estilos cumple su norma (M13, bloque 94b) ---
css = open(APP + '/css/estilos.css', encoding='utf-8').read()
sin_com = re.sub(r'/\*.*?\*/', '', css, flags=re.S)
i7 = sin_com.index('@media')   # la primera consulta abre la sección 7
secc7 = css.index('/* ========== 7. @MEDIA')
antes7 = re.sub(r'/\*.*?\*/', '', css[:secc7], flags=re.S)
mirar('@media' not in antes7, 'ninguna consulta @media fuera de la sección 7 de la hoja')
# Tras la sección 7 sólo hay consultas: se quitan sus bloques y no debe quedar ninguna regla
resto = re.sub(r'/\*.*?\*/', '', css[secc7:], flags=re.S)
prof = 0; suelto = ''
for ch in resto:
    if ch == '{': prof += 1
    elif ch == '}': prof -= 1
    elif prof == 0: suelto += ch
suelto = re.sub(r'@media[^{]*', '', suelto).strip()
mirar(not suelto, 'ninguna regla escrita después de la sección 7 (cada regla en su bloque)', suelto[:80])
consultas = re.findall(r'@media\s*([^{]+?)\s*\{', sin_com)
mirar(len(consultas) == len(set(consultas)), 'una sola consulta por corte en la hoja', ', '.join(sorted(q for q in set(consultas) if consultas.count(q) > 1)))
cortes = sorted(set(int(x) for q in consultas for x in re.findall(r'width:\s*(\d+)px', q)))
mirar(cortes == [480, 700, 701, 1024], 'tres cortes de ancho: 480, 700 y 1024 px (701 es el complemento de 700)', str(cortes))
sin_root = re.sub(r':root(\[[^\]]*\])?\s*\{.*?\n\}', '', sin_com, flags=re.S)
selectores = ' '.join(re.findall(r'([^{}]+)\{', re.sub(r'url\([^)]*\)', '', sin_root)))
ids = sorted(set(re.findall(r'#[a-zA-Z][\w-]*', re.sub(r'#[0-9A-Fa-f]{3,8}\b', '', selectores))))
mirar(not ids, 'la hoja no usa selectores #id: una clase por caso', ', '.join(ids[:8]))
literales = re.findall(r'#[0-9A-Fa-f]{3,8}\b|rgba?\([^)]*\)', re.sub(r'url\([^)]*\)', '', sin_root))
mirar(not literales, 'colores, sombras y velos sólo como variables de :root', ', '.join(literales[:6]))
js_colores = []
for f in glob.glob(APP + '/js/*.js'):
    if f.endswith(('esquema.js', 'iconos.js')): continue
    t = re.sub(r'/\*.*?\*/|//[^\n]*', '', open(f, encoding='utf-8').read(), flags=re.S)
    # Hex entre comillas, rgb()/rgba() y los colores de jsPDF: arreglos de color o set…Color con números
    for m in re.finditer(r"""['"]#[0-9A-Fa-f]{3,8}['"]|rgba?\(\s*\d|(?:fill|text|line|draw)Color\s*:\s*\[\s*\d|set(?:Text|Draw|Fill)Color\(\s*\d""", t):
        js_colores.append(os.path.basename(f) + ': ' + m.group(0))
mirar(not js_colores, 'el código no escribe colores: los lee de :root (SRP.util.color, colorBase, rgb)', ', '.join(js_colores[:6]))
# La norma completa de la hoja (tokens, reglas repetidas, clases sin uso, estilos fuera de la hoja) la revisa su propia auditoría
import subprocess, sys as _sys
_css = subprocess.run([_sys.executable, APP + '/pruebas/auditoria_css.py'], capture_output=True, text=True)
mirar(_css.returncode == 0, 'la hoja de estilos cumple su norma: medidas con token, una regla por selector, sin clases ni variables sin uso (auditoria_css.py)',
      '; '.join(l.strip() for l in _css.stdout.split('\n') if l[:1] in 'ABCD' and l[1:2].isdigit() and not l.rstrip().endswith(': 0') and l.split()[0] not in ('B9', 'C3b', 'C4', 'D3'))[:300])

with sync_playwright() as p:
    b = p.chromium.launch(); pg = b.new_page(); errores = []
    pg.on('pageerror', lambda e: errores.append(str(e)))
    pg.goto(BASE); pg.wait_for_timeout(1500)

    # --- 2. Perfiles ---
    perfiles = pg.evaluate("Object.keys(SRP.PERFILES)")
    mirar(sorted(perfiles) == ['ADMIN','CABO','COORDINADOR','DIRECTIVO'],
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
        // Sólo las cuentas de la Secretaría llevan área; las de fuera, ninguna
        areaInexistente: us.filter(u=>u.organizacion_id === SRP.CONFIG.ORGANIZACION_SEDEMA && !cat[u.area_id]).map(u=>u.correo),
        areaFuera: us.filter(u=>u.organizacion_id !== SRP.CONFIG.ORGANIZACION_SEDEMA && u.area_id).map(u=>u.correo),
        institucionInexistente: us.filter(u=>!cat[u.organizacion_id]).map(u=>u.correo),
        coordinadorInexistente: us.filter(u=>(u.coordinadores_ids||[]).some(c=>!porId[c])).map(u=>u.correo),
        // El coordinador del cabo es de su misma institución: así nadie ve lo de otra
        coordinadorOtraInstitucion: us.filter(u=>(u.coordinadores_ids||[]).some(c=>porId[c] && porId[c].organizacion_id !== u.organizacion_id)).map(u=>u.correo),
        adminFuera: us.filter(u=>u.perfil === 'ADMIN' && u.organizacion_id !== SRP.CONFIG.ORGANIZACION_SEDEMA).map(u=>u.correo),
        coordinadorSinPerfil: us.filter(u=>(u.coordinadores_ids||[]).some(c=>porId[c] && !['COORDINADOR','ADMIN'].includes(porId[c].perfil))).map(u=>u.correo),
        coordinadoresSinLista: us.filter(u=>!Array.isArray(u.coordinadores_ids)).map(u=>u.correo),
        campoViejoUsuarios: us.filter(u=>'jefe_id' in u || 'coordinador_id' in u).map(u=>u.correo)
      };
    }""")
    mirar(d['total'] == 13, 'hay exactamente las trece cuentas de arranque: cuatro de la Secretaría, un coordinador y un cabo por tipo de institución y un directivo de alcaldía (%d)' % d['total'])
    mirar(sorted(d['perfilesUsados']) == ['ADMIN','CABO','COORDINADOR','DIRECTIVO'],
          'una cuenta por perfil operativo', str(d['perfilesUsados']))
    mirar(not d['perfilDesconocido'], 'toda cuenta tiene un perfil del catálogo', str(d['perfilDesconocido']))
    mirar(set(d['perfilesUsados']) <= {'CABO','COORDINADOR','DIRECTIVO','ADMIN'},
          'los perfiles guardados son los de ahora', str(d['perfilesUsados']))
    mirar(not d['sinCorreo'], 'toda cuenta tiene correo', str(d['sinCorreo']))
    mirar(not d['correosRepetidos'], 'ningún correo repetido', str(d['correosRepetidos']))
    mirar(not d['areaInexistente'], 'el área de cada cuenta de la Secretaría existe en el catálogo', str(d['areaInexistente']))
    mirar(not d['areaFuera'], 'las cuentas de fuera de la Secretaría no llevan área', str(d['areaFuera']))
    mirar(not d['institucionInexistente'], 'la institución de cada cuenta existe en el catálogo', str(d['institucionInexistente']))
    mirar(not d['coordinadorInexistente'], 'el coordinador asignado existe', str(d['coordinadorInexistente']))
    mirar(not d['coordinadorSinPerfil'], 'quien figura como coordinador tiene ese perfil', str(d['coordinadorSinPerfil']))
    mirar(not d['coordinadorOtraInstitucion'], 'el coordinador de cada cabo es de su misma institución', str(d['coordinadorOtraInstitucion']))
    mirar(not d['adminFuera'], 'la Administración global es sólo de la Secretaría', str(d['adminFuera']))
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
    # Los originales del SIA no se publican (D164): viven en originales/, fuera de git, en la raíz
    raiz_app = '.' if os.path.exists('index.html') else '..'
    mirar(not os.path.exists(os.path.join(raiz_app, 'assets', 'fuentes')), 'los archivos originales no están dentro del sitio publicado (D164)')
    gi_ruta = os.path.join(raiz_app, '.gitignore')
    if os.path.exists(gi_ruta):
        mirar('originales/' in open(gi_ruta, encoding='utf-8').read().split(), '.gitignore deja fuera la carpeta originales/ (D164)')
    ruta_f = os.path.join(raiz_app, 'originales')
    if os.path.isdir(ruta_f):
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
    else:
        print('AVISO: esta copia no tiene originales/; se omite la comparación de las capas contra los originales (D164)')
    mirar(capas['prefijos'] == capas['claves'], 'cada prefijo de UGA es una alcaldía y cada alcaldía tiene UGAs', str(capas['prefijos']))
    mirar(all(v and 'fictic' not in v for v in capas['versiones']), 'ninguna capa cargada es ficticia', str(capas['versiones']))
    mirar(not r.get('capaVieja'), 'ninguna plantación se derivó con la capa ficticia', str(r.get('capaVieja')))
    # Si esta regla se rompe, un punto señalado con el dedo puede leerse como medido con GPS
    mirar(not r['precisionHuerfana'], 'la precisión aparece si y sólo si el punto vino del GPS', str(r['precisionHuerfana']))

    # --- 4. Lo que ve la persona ---
    opciones = pg.eval_on_selector_all('#sel-usuario-prueba option', 'os=>os.map(o=>o.textContent)')
    mirar(len(opciones) == 13, 'el selector ofrece las trece cuentas de arranque', str(opciones))
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
      // Los campos del árbol salen del propio código: el registro que armaría «Guardar», sin guardarlo
      const ctxValores = {
          estado: { especieId: 'x', foto: null, fotoId: null, fotoNombre: '', fotoBytes: 0,
                    territorio: { alcaldia:'a', colonia:'c', uga:'u', capa_version:'v' } },
          OTRA: '__otra__', el: (i) => document.getElementById(i), programaDeJornada: () => 'p' };
      const previo = SRP.sesion.usuario;
      SRP.sesion.usuario = previo || SRP.ref.usuarios[0];
      const plant = Object.keys(SRP.formulario.registroPrevisto.call({
        valores: () => SRP.formulario.valores.call(ctxValores), estado: { editando: null, idPrevisto: 'x' }, jornadaId: () => 'j' }, '2026-01-01T00:00:00-06:00'));
      SRP.sesion.usuario = previo;
      return {
        plantaciones: plant,
        usuarios: await campos('usuarios'),
        programas: await campos('programas'), areas: await campos('areas'), especies: await campos('especies'),
        vehiculos: await campos('vehiculos'), instituciones: await campos('instituciones'), solicitantes: await campos('solicitantes'),
        /* Los campos de la jornada salen del propio código: se arma una jornada con el formulario de
           «Iniciar jornada», con una cuenta de cabo prestada, y se lee lo que se iba a guardar sin
           guardarlo. Así un campo nuevo o quitado se detecta solo contra el esquema. */
        jornadas: await (async () => {
          const previo = SRP.sesion.usuario, activa = SRP.activa.jornada, guardar = SRP.almacen.guardarConBitacora;
          SRP.sesion.usuario = SRP.ref.usuarios.find(u => u.perfil === 'CABO');
          const valor = (id, v) => { document.getElementById(id).value = v; };
          valor('ini-nombre', 'Auditoría'); valor('ini-origen', 'PROGRAMADA'); valor('ini-meta', '1'); valor('ini-fecha', SRP.util.fechaHoy());
          const prog = document.getElementById('ini-programa');
          if (!prog.querySelector('option[value="p-refor"]')) prog.add(new Option('Programa', 'p-refor'));
          prog.value = 'p-refor';
          let armada = null;
          SRP.almacen.guardarConBitacora = async (almacen, obj) => { if (almacen === 'jornadas') armada = obj; };
          try { await SRP.activa.iniciarJornada(); } finally {
            SRP.almacen.guardarConBitacora = guardar; SRP.sesion.usuario = previo; SRP.activa.jornada = activa;
          }
          return armada ? Object.keys(armada) : ['(no se pudo armar la jornada)'];
        })(),
        bitacora: bitacora()
      };
    }""")
    import re, os
    ruta = os.path.join(APP, 'datos', 'MAPEO-CAMPOS.md')
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

    # --- 5. datos/esquema.json: la fuente única del modelo de datos (D86) ---
    import json, sys
    esquema = json.load(open(os.path.join(APP, 'datos', 'esquema.json'), encoding='utf-8'))
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
    # El mapeo de campos (datos/MAPEO-CAMPOS.md) nombra todos los campos de cada tabla, y la etiqueta que
    # da a cada uno es la que la pantalla dice: un cambio de etiqueta que no llegó al mapeo se detecta aquí
    import html as _html
    mapeo = open(os.path.join(APP, 'datos', 'MAPEO-CAMPOS.md'), encoding='utf-8').read()
    en_mapeo = set(re.findall(r'`([a-z_0-9]+)`', mapeo))
    for tabla, def_ in esquema['tablas'].items():
        sin_fila = sorted(c['campo'] for c in def_['campos'] if c['campo'] not in en_mapeo)
        mirar(not sin_fila, 'el mapeo de campos nombra todos los campos de `%s`' % tabla, str(sin_fila))
    fuente = open(os.path.join(APP, 'index.html'), encoding='utf-8').read() + ''.join(open(x, encoding='utf-8').read() for x in glob.glob(APP+'/js/*.js') if not x.endswith('esquema.js'))
    pantalla = re.sub(r'\s+', ' ', _html.unescape(re.sub(r'<[^>]+>', ' ', fuente)))
    dice = lambda t: t in pantalla or t in fuente
    desfasadas, con_etiqueta, en_tabla = [], 0, False
    for linea in mapeo.split('\n'):
        if linea.startswith('| Etiqueta en pantalla'): en_tabla = True; continue
        if not linea.startswith('|'): en_tabla = False; continue
        celdas = [x.strip() for x in linea.strip('|').split('|')]
        if not en_tabla or linea.startswith('|---') or len(celdas) < 2 or not celdas[1].startswith('`'): continue
        etq = celdas[0]
        if etq == '' or etq.startswith(('No ', '—')): continue
        con_etiqueta += 1
        frases = re.findall(r'«([^»]+)»', etq)
        resto = re.sub(r'\(.*?\)', '', re.sub(r'«[^»]+»', '', etq))
        frases += [x.strip(' .:') for x in re.split(r';| y | e | o | / |,', resto) if len(x.strip(' .:')) > 2 and (x.strip()[0].isupper() or x.strip()[0] in '¿¡')]
        if not frases or not all(dice(x) for x in frases): desfasadas.append('%s → %s' % (etq, celdas[1]))
    mirar(con_etiqueta >= 60 and not desfasadas, 'cada etiqueta del mapeo de campos es la que dice la pantalla (%d etiquetas)' % con_etiqueta, '; '.join(desfasadas))
    # Toda relación apunta a una tabla que existe y todo campo «→» tiene su relación
    for r in esquema['relaciones']:
        destino = r['a'].split('.')[0].split(' ')[0]
        mirar(destino in esquema['tablas'] or destino.startswith('capas'), 'la relación %s → %s apunta a una tabla del esquema' % (r['de'], r['a']))
    # El diccionario está regenerado
    sys.path.insert(0, os.path.join(APP, 'herramientas'))
    import generar_diccionario
    generado = generar_diccionario.generar(esquema)
    actual = open(os.path.join(APP, 'datos', 'DICCIONARIO-DATOS.md'), encoding='utf-8').read()
    mirar(generado == actual, 'DICCIONARIO-DATOS.md está regenerado a partir de esquema.json', 'corra herramientas/generar_diccionario.py')
    # Y el esquema que lee el navegador (D150, D175)
    js_actual = open(os.path.join(APP, 'js', 'esquema.js'), encoding='utf-8').read()
    mirar(generar_diccionario.generar_js(esquema) == js_actual, 'js/esquema.js está regenerado a partir de esquema.json (lo lee js/referencias.js)', 'corra herramientas/generar_diccionario.py')
    # Capas (D152): toda geometría válida después de redondear, o el cruce falla sin avisar
    try:
        from shapely.geometry import shape as _forma
        invalidas = []
        for nombre in ('alcaldias', 'uga', 'colonias', 'prioritarias'):
            txt = open(os.path.join(APP, 'assets', 'capas', 'capa-%s.js' % nombre), encoding='utf-8').read()
            ini = txt.index('SRP.CAPAS.%s = ' % nombre) + len('SRP.CAPAS.%s = ' % nombre)
            capa = json.loads(txt[ini:txt.rindex(';')])
            invalidas += ['%s %s' % (nombre, f['properties'].get('clave')) for f in capa['geojson']['features'] if not _forma(f['geometry']).is_valid]
        mirar(not invalidas, 'las cuatro capas tienen todas sus geometrías válidas tras el redondeo', ', '.join(invalidas[:6]))
    except ImportError:
        mirar(False, 'shapely instalado para revisar las geometrías de las capas', 'pip install shapely')
    # Créditos del mapa (D152): ningún mapa sin crédito
    sin_credito = [os.path.basename(f) for f in glob.glob(APP + '/js/*.js') if 'attributionControl: false' in open(f, encoding='utf-8').read()]
    mirar(not sin_credito, 'todos los mapas muestran el crédito del proveedor (ninguno con attributionControl: false)', ', '.join(sin_credito))
    # Un nombre por acción (D153): las etiquetas retiradas no vuelven a aparecer en pantalla
    retiradas = ['Reiniciar filtros', 'Registrar un árbol', 'Ver registro', 'Registrar faltante', 'Datos de cierre del día']
    visibles = [open(os.path.join(APP, 'index.html'), encoding='utf-8').read()] + [re.sub(r'/\*.*?\*/|//[^\n]*', '', open(x, encoding='utf-8').read(), flags=re.S) for x in glob.glob(APP + '/js/*.js')]
    quedan = [t for t in retiradas if any(t in v for v in visibles)]
    mirar(not quedan, 'una etiqueta por acción: no quedan «Reiniciar filtros», «Ver registro», «Registrar faltante» ni «Datos de cierre del día»', ', '.join(quedan))
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
    for f in ['js/folio.js', 'datos/esquema.json', 'datos/DICCIONARIO-DATOS.md', 'datos/MAPEO-CAMPOS.md', 'README.md', 'docs/DECISIONES.md', 'index.html'] + [os.path.relpath(x, APP) for x in glob.glob(APP + '/js/*.js')]:
        t = open(os.path.join(APP, f), encoding='utf-8').read()
        for marca in ('SRP-AAA-000-AAAA-00000', 'char(22)', 'SRP-TLP-', "'SRP-' +"):
            if marca in t: viejos.append(f + ': ' + marca)
    mirar(not viejos, 'no queda rastro del folio de 22 caracteres fuera de la bitácora', '; '.join(sorted(set(viejos))))
    # Los árboles se plantan; «sembrar» es de agricultura (D114). Se revisa lo que ve la persona: pantalla,
    # reportes y esquema. Cargar los datos de arranque se sigue llamando sembrar en almacen.js: no habla de árboles
    prohibidos = []
    for f in ['index.html', 'datos/esquema.json', 'datos/MAPEO-CAMPOS.md', 'docs/MEJORAS.md', 'js/jornadas.js', 'js/reportes.js', 'js/registros.js', 'js/formulario.js', 'js/espejo.js', 'js/conexion.js', 'js/envio.js']:
        t = open(os.path.join(APP, f), encoding='utf-8').read()
        if re.search(r'\b(sembrad[oa]s?|sembr[oó]|sembraron|siembras?)\b', t.replace('sello con el que se sembró', '').replace('se siembran desde assets', '').replace('Siembra: al abrir con sello', '')): prohibidos.append(f)
    mirar(not prohibidos, 'ningún texto de pantalla, reporte ni esquema dice «sembrar» de un árbol: se dice plantar (D114)', ', '.join(prohibidos))
    # Placas reales fuera del repositorio y del sitio: el catálogo de prueba lleva placas ficticias y la
    # lista real vive en originales/ (fuera de git). Se buscan en todo lo que se publica.
    placas = pg.evaluate("SRP.CATALOGO_VEHICULOS.vehiculos.map(v => v.nombre)")
    mirar(len(placas) == 16 and all(re.fullmatch(r'PRU \d{3}', x) for x in placas), 'los 16 vehículos del catálogo de prueba llevan placas ficticias «PRU 000»', ', '.join(placas[:4]))
    lista_real = os.path.join(APP, 'originales', 'vehiculos_reales_2026-09-26.csv')
    if os.path.exists(lista_real):
        import csv
        reales = [r['placa'] for r in csv.DictReader(open(lista_real, encoding='utf-8'))]
        fuera = ('originales', 'historial', '.git', '__pycache__', '_to_delete', 'node_modules')
        vistas = []
        for raiz, dirs, archivos in os.walk(APP):
            dirs[:] = [d for d in dirs if d not in fuera]
            for a in archivos:
                if not a.endswith(('.js', '.html', '.md', '.json', '.py', '.css', '.txt', '.csv')): continue
                t = open(os.path.join(raiz, a), encoding='utf-8', errors='ignore').read()
                for r in reales:
                    if re.search(r'(?<![A-Z0-9])' + re.escape(r) + r'(?![A-Z0-9])', t, re.I) or re.search(r'(?<![A-Z0-9])' + re.escape(r.replace(' ', '')) + r'(?![A-Z0-9])', t, re.I):
                        vistas.append(os.path.relpath(os.path.join(raiz, a), APP) + ': ' + r[:2] + '…')
        mirar(len(reales) == 16 and not vistas, 'ninguna placa real aparece en lo que se publica (la lista real está sólo en originales/)', '; '.join(sorted(set(vistas))[:6]))
    else:
        mirar(True, 'placas reales: la copia no trae originales/, se omite la búsqueda', 'aviso')
    # Simplicidad: cada vista ofrece pocos filtros. Se cuentan las decisiones que se le piden a la
    # persona (cada lista, cada búsqueda y el grupo de atajos de periodo), fuera de formularios y diálogos;
    # el orden de la lista y el tamaño de página no filtran y no cuentan.
    TOPE_FILTROS, TOPE_A_LA_VISTA = 8, 4
    conteo = pg.evaluate("""() => [...document.querySelectorAll('section[id^=vista-]')].filter(s => s.id !== 'vista-acceso').map(s => {
      const c = [...s.querySelectorAll('select, input[type=search], .chips[role=group]')].filter(e => !e.closest('form, dialog') && e.id && !e.id.endsWith('-orden-lista'));
      return [s.id.replace('vista-', ''), c.length, c.filter(e => !e.closest('details')).length];
    })""")
    pasados = ['%s: %d' % (v, n) for v, n, _ in conteo if n > TOPE_FILTROS]
    a_la_vista = ['%s: %d' % (v, f) for v, n, f in conteo if f > TOPE_A_LA_VISTA]
    mirar(not pasados, 'ninguna vista pide más de %d filtros (%s)' % (TOPE_FILTROS, ', '.join('%s %d' % (v, n) for v, n, _ in conteo if n)), ', '.join(pasados))
    mirar(not a_la_vista, 'y a la vista quedan a lo más %d; el resto va plegado en «Más filtros»' % TOPE_A_LA_VISTA, ', '.join(a_la_vista))
    b.close()

malos = [h for h in hallazgos if not h[0]]
for ok_, desc, det in hallazgos:
    print(('OK    ' if ok_ else 'FALLA ') + desc + (('  -> ' + det) if (det and not ok_) else ''))
print('\n%d comprobaciones, %d hallazgos' % (len(hallazgos), len(malos)))
