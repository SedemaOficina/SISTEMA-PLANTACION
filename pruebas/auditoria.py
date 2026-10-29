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

# --- 1b. La hoja de estilos cumple su norma ---
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
# Lo que se ve dice «teléfono» a quien registra y «este equipo» en Configuración: nunca «dispositivo»
dispositivo = []
for f in glob.glob(APP + '/js/*.js') + [APP + '/index.html']:
    t = open(f, encoding='utf-8').read()
    t = re.sub(r'<!--.*?-->', '', t, flags=re.S) if f.endswith('.html') else re.sub(r'/\*.*?\*/|(?<!:)//[^\n]*', '', t, flags=re.S)
    dispositivo += [os.path.basename(f) + ': ' + m.group(0)[:60] for m in re.finditer(r'''['">][^'"<>]*\bdispositivo[^'"<>]*''', t, flags=re.I)]
mirar(not dispositivo, 'los textos dicen «teléfono» o «este equipo», no «dispositivo»', '; '.join(dispositivo[:4]))
# Un nombre por papel: «Coordinación» y «Dirección» en todo, nunca «Coordinador», «Directivo» ni «(coordinación)», en la
# aplicación y en el servidor, que da los mismos nombres. Los datos de prueba quedan fuera: su «Coordinador de cuadrilla»
# es el cargo de una persona, no el nombre del perfil
papeles = []
for f in [x for x in glob.glob(APP + '/js/*.js') if not x.endswith(('datos-ficticios.js', 'demostracion.js'))] + [APP + '/index.html'] + glob.glob(APP + '/servidor/src/modulos/srp/*.ts'):
    t = open(f, encoding='utf-8').read()
    t = re.sub(r'<!--.*?-->', '', t, flags=re.S) if f.endswith('.html') else re.sub(r'/\*.*?\*/|(?<!:)//[^\n]*', '', t, flags=re.S)
    papeles += [os.path.basename(f) + ': ' + m.group(0)[:60] for m in re.finditer(r'''['"`>][^'"`<>\n]*(\bCoordinador\b|\bDirectivo\b|\(coordinación\))[^'"`<>\n]*''', t)]
mirar(not papeles, 'cada perfil tiene un solo nombre: «Coordinación» y «Dirección», no «Coordinador», «Directivo» ni «(coordinación)»', '; '.join(papeles[:4]))
# La política de seguridad del servidor web es la de index.html más frame-ancestors, y srp-cabeceras.conf trae también las
# globales del sitio (la protección contra marcos) y no trae HSTS; srp.conf la incluye en cada ubicación
_cab = open(APP + '/servidor/servidor-web/srp-cabeceras.conf', encoding='utf-8').read()
_frag = open(APP + '/servidor/servidor-web/srp.conf', encoding='utf-8').read()
_meta = re.search(r'http-equiv="Content-Security-Policy" content="([^"]+)"', open(APP + '/index.html', encoding='utf-8').read())
_csp = re.search(r'add_header Content-Security-Policy "([^"]+)"', _cab)
_sin_com = re.sub(r'#[^\n]*', '', _frag)
mirar(_meta and _csp and _csp.group(1) == _meta.group(1) + "; frame-ancestors 'self'"
      and all(h in _cab for h in ('X-Frame-Options "SAMEORIGIN"', 'X-Content-Type-Options "nosniff"', 'Referrer-Policy', 'Permissions-Policy "geolocation=(self)'))
      and 'Strict-Transport-Security' not in re.sub(r'#[^\n]*', '', _cab) and 'add_header' not in _sin_com
      and _sin_com.count('location') == _sin_com.count('include /RUTA/DE/LOS/FRAGMENTOS/srp-cabeceras.conf;'),
      'el servidor web manda la política de seguridad de index.html con frame-ancestors y las cabeceras globales, en cada ubicación y sin HSTS')
# El instalador por la entrada estándar, la vía con que el SIA aplica el SQL de cada módulo, trae los mismos guiones que
# instalar.sql, en su orden: no se edita a mano
import sys as _sys0
_sys0.path.insert(0, APP + '/herramientas')
import instalar_por_stdin as _stdin
mirar(_stdin.al_dia(), 'servidor/db/srp/srp-instalar-por-stdin.sql trae, en su orden, los guiones de instalar.sql (lo arma herramientas/instalar_por_stdin.py)')
# El pie de «Por calle» y del informe lleva la cita de la capa de calles tal como la trae su índice: las fuentes, su
# licencia y lo que hizo SEDEMA (condición de uso de la capa)
import json as _json
_cita = _json.load(open(APP + '/assets/calles/indice.json', encoding='utf-8'))['cita']
_cita_js = re.search(r"\n  CITA: '([^'\n]+)',", open(APP + '/js/calles.js', encoding='utf-8').read())
mirar(_cita_js and _cita_js.group(1) == _cita and all(x in _cita for x in ('(INEGI, SICT, IMT)', 'Portal de Datos Abiertos de la Ciudad de México', 'esas transformaciones no son del INEGI ni de SEMOVI')),
      'la cita de la capa de calles en la aplicación es la del índice de la capa, completa', (_cita_js.group(1)[:80] if _cita_js else 'sin CITA en js/calles.js'))
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
    mirar(etiquetas[:3] == ['Cabo', 'Coordinación', 'Dirección'],
          'las etiquetas dicen Cabo, Coordinación y Dirección', str(etiquetas))

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
        adminFuera: us.filter(u=>u.perfil === 'ADMIN' && u.organizacion_id !== SRP.CONFIG.ORGANIZACION_SEDEMA).map(u=>u.correo),
        // Las cuentas no llevan jefe ni coordinadores: la Coordinación trabaja con toda su institución
        campoViejoUsuarios: us.filter(u=>'jefe_id' in u || 'coordinador_id' in u || 'coordinadores_ids' in u).map(u=>u.correo)
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
    mirar(not d['adminFuera'], 'la Administración global es sólo de la Secretaría', str(d['adminFuera']))
    mirar(not d['campoViejoUsuarios'], 'ninguna cuenta conserva jefe ni coordinadores', str(d['campoViejoUsuarios']))

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
    # Los originales del SIA no se publican: viven en originales/, fuera de git, en la raíz
    raiz_app = '.' if os.path.exists('index.html') else '..'
    mirar(not os.path.exists(os.path.join(raiz_app, 'assets', 'fuentes')), 'los archivos originales no están dentro del sitio publicado')
    gi_ruta = os.path.join(raiz_app, '.gitignore')
    if os.path.exists(gi_ruta):
        mirar('originales/' in open(gi_ruta, encoding='utf-8').read().split(), '.gitignore deja fuera la carpeta originales/')
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
        print('AVISO: esta copia no tiene originales/; se omite la comparación de las capas contra los originales')
    mirar(capas['prefijos'] == capas['claves'], 'cada prefijo de UGA es una alcaldía y cada alcaldía tiene UGAs', str(capas['prefijos']))
    mirar(all(v and 'fictic' not in v for v in capas['versiones']), 'ninguna capa cargada es ficticia', str(capas['versiones']))
    mirar(not r.get('capaVieja'), 'ninguna plantación se derivó con la capa ficticia', str(r.get('capaVieja')))
    # Si esta regla se rompe, un punto señalado con el dedo puede leerse como medido con GPS
    mirar(not r['precisionHuerfana'], 'la precisión aparece si y sólo si el punto vino del GPS', str(r['precisionHuerfana']))

    # --- 4. Lo que ve la persona ---
    opciones = pg.eval_on_selector_all('#sel-usuario-prueba option', 'os=>os.map(o=>o.textContent)')
    mirar(len(opciones) == 7, 'el selector ofrece siete cuentas de prueba, una por rol distinto', str(opciones))
    mirar(not [o for o in opciones if 'no reconocido' in o or o.endswith('— Consulta')],
          'ninguna cuenta aparece con perfil no reconocido', str(opciones))
    mirar(any('— Cabo' in o for o in opciones), 'aparecen cuentas de Cabo', str(opciones))
    mirar(any('— Coordinación' in o for o in opciones), 'aparece la cuenta de Coordinación')
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
          valor('ini-nombre', 'Auditoría'); valor('ini-meta', '1'); valor('ini-fecha', SRP.util.fechaHoy());
          // La jornada se ubica siempre: el punto del Zócalo, capturado a mano
          valor('ini-coord-lat', '19.432600'); valor('ini-coord-lng', '99.133200'); SRP.activa.aplicarCoordenadas();
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

    # --- 5. datos/esquema.json: la fuente única del modelo de datos ---
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
    # Cada cambio de campos sube la versión del esquema: la huella guardada es la de los campos de hoy
    mirar(esquema.get('huella_campos') == generar_diccionario.huella(esquema), 'la versión del esquema (%s) es la de sus campos' % esquema['version_esquema'],
          'los campos cambiaron y la versión no: corra herramientas/generar_diccionario.py --version AAAA-MM-DD')
    # Y el esquema que lee el navegador
    js_actual = open(os.path.join(APP, 'js', 'esquema.js'), encoding='utf-8').read()
    mirar(generar_diccionario.generar_js(esquema) == js_actual, 'js/esquema.js está regenerado a partir de esquema.json (lo lee js/referencias.js)', 'corra herramientas/generar_diccionario.py')
    # Y las tablas del servidor, que son las mismas
    import subprocess as _sp, sys as _sys
    sql_al_dia = _sp.run([_sys.executable, os.path.join(APP, 'herramientas', 'generar_sql.py'), '--revisar'], capture_output=True).returncode == 0
    mirar(sql_al_dia, 'servidor/db/srp/02-srp-tablas.sql está generado a partir de esquema.json: las tablas del servidor son las del teléfono', 'corra herramientas/generar_sql.py')
    # Capas: toda geometría válida después de redondear, o el cruce falla sin avisar
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
    # Créditos del mapa: ningún mapa sin crédito
    sin_credito = [os.path.basename(f) for f in glob.glob(APP + '/js/*.js') if 'attributionControl: false' in open(f, encoding='utf-8').read()]
    mirar(not sin_credito, 'todos los mapas muestran el crédito del proveedor (ninguno con attributionControl: false)', ', '.join(sin_credito))
    # Un nombre por acción: las etiquetas retiradas no vuelven a aparecer en pantalla
    retiradas = ['Reiniciar filtros', 'Registrar un árbol', 'Ver registro', 'Registrar faltante', 'Datos de cierre del día']
    visibles = [open(os.path.join(APP, 'index.html'), encoding='utf-8').read()] + [re.sub(r'/\*.*?\*/|//[^\n]*', '', open(x, encoding='utf-8').read(), flags=re.S) for x in glob.glob(APP + '/js/*.js')]
    quedan = [t for t in retiradas if any(t in v for v in visibles)]
    mirar(not quedan, 'una etiqueta por acción: no quedan «Reiniciar filtros», «Ver registro», «Registrar faltante» ni «Datos de cierre del día»', ', '.join(quedan))
    # Política de seguridad: nada en línea que la política vaya a bloquear en el teléfono
    en_linea = []
    html = re.sub(r'<!--.*?-->', '', open(os.path.join(APP, 'index.html'), encoding='utf-8').read(), flags=re.S)
    if re.search(r'<script(?![^>]*\bsrc=)[^>]*>', html): en_linea.append('index.html: <script> sin src')
    for f in ['index.html'] + sorted(os.path.relpath(x, APP) for x in glob.glob(APP + '/js/*.js')):
        txt = html if f == 'index.html' else open(os.path.join(APP, f), encoding='utf-8').read()
        if f != 'index.html': txt = re.sub(r'/\*.*?\*/', '', txt, flags=re.S)
        for m in re.finditer(r'''\s(style|on[a-z]+)=["'\\]''', txt):
            en_linea.append('%s: %s=' % (f, m.group(1)))
    mirar(not en_linea, 'ningún estilo ni manejador en línea en la página ni en el HTML que arma el código (la política de seguridad los bloquearía)', ', '.join(en_linea[:6]))
    # Folio: 13 caracteres, sin prefijo de sistema ni año. No debe quedar rastro
    # del formato de 22 caracteres fuera de la historia (BITACORA y DECISIONES)
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
    # Los árboles se plantan; «sembrar» es de agricultura. Se revisa lo que ve la persona: pantalla,
    # reportes y esquema. Cargar los datos de arranque se sigue llamando sembrar en almacen.js: no habla de árboles
    prohibidos = []
    for f in ['index.html', 'datos/esquema.json', 'datos/MAPEO-CAMPOS.md', 'docs/MEJORAS.md', 'js/jornadas.js', 'js/reportes.js', 'js/registros.js', 'js/formulario.js', 'js/espejo.js', 'js/conexion.js', 'js/envio.js']:
        t = open(os.path.join(APP, f), encoding='utf-8').read()
        if re.search(r'\b(sembrad[oa]s?|sembr[oó]|sembraron|siembras?)\b', t.replace('sello con el que se sembró', '').replace('se siembran desde assets', '').replace('Siembra: al abrir con sello', '')): prohibidos.append(f)
    mirar(not prohibidos, 'ningún texto de pantalla, reporte ni esquema dice «sembrar» de un árbol: se dice plantar', ', '.join(prohibidos))
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

# --- La copia para el SIA sale igual de un clon con LF que de uno de Windows con CRLF, y un error no deja nada ---
import shutil, subprocess, sys, tempfile
_tmp = tempfile.mkdtemp(prefix='srp-auditoria-prod-')
def _raiz(nombre, crlf):
    """Lo que lee herramientas/preparar_produccion.py, en una carpeta aparte; con crlf, sus textos con fin de renglón de Windows."""
    r = os.path.join(_tmp, nombre)
    os.makedirs(os.path.join(r, 'herramientas'))
    shutil.copy2(os.path.join(APP, 'herramientas', 'preparar_produccion.py'), os.path.join(r, 'herramientas'))
    for a in ['index.html', 'sw.js', 'manifest.webmanifest', 'VERSION']: shutil.copy2(os.path.join(APP, a), r)
    for c in ['css', 'js', 'vendor', 'assets']:
        shutil.copytree(os.path.join(APP, c), os.path.join(r, c), ignore=shutil.ignore_patterns('calles', '__pycache__'))
    if crlf:
        for a in [os.path.join(r, 'index.html'), os.path.join(r, 'js', 'config.js')]:
            t = open(a, 'rb').read().replace(b'\r\n', b'\n').replace(b'\n', b'\r\n')
            open(a, 'wb').write(t)
    return r
def _armar(raiz, destino):
    return subprocess.run([sys.executable, os.path.join(raiz, 'herramientas', 'preparar_produccion.py'), destino],
                          capture_output=True, text=True, encoding='utf-8', env=dict(os.environ, PYTHONUTF8='1'))
def _lista(r):
    return {os.path.relpath(os.path.join(d, f), r): open(os.path.join(d, f), 'rb').read().replace(b'\r\n', b'\n') for d, _, fs in os.walk(r) for f in fs}
try:
    _lf, _crlf = _raiz('lf', False), _raiz('crlf', True)
    _a, _b = _armar(_lf, os.path.join(_tmp, 'copia-lf')), _armar(_crlf, os.path.join(_tmp, 'copia-crlf'))
    _iguales = _a.returncode == 0 and _b.returncode == 0 and _lista(os.path.join(_tmp, 'copia-lf')) == _lista(os.path.join(_tmp, 'copia-crlf'))
    mirar(_iguales, 'la copia para el SIA sale igual de un clon con LF que de uno de Windows con CRLF', (_a.stderr + _b.stderr).strip()[-300:])
    # Sin la marca de prueba en index.html, la herramienta se detiene y el destino no se crea
    _p = os.path.join(_crlf, 'index.html')
    open(_p, 'w', encoding='utf-8', newline='').write(open(_p, encoding='utf-8', newline='').read().replace('Sólo en la versión de prueba', 'Otro texto'))
    _c = _armar(_crlf, os.path.join(_tmp, 'copia-error'))
    mirar(_c.returncode != 0 and not os.path.exists(os.path.join(_tmp, 'copia-error')) and 'No se creó' in _c.stderr,
          'si la copia para el SIA no se puede armar, lo dice y no deja una copia a medias en el destino', _c.stderr.strip()[-300:])
finally:
    shutil.rmtree(_tmp, ignore_errors=True)

# --- El paquete para el SIA no lleva secretos, respaldos ni lo de prueba: empaquetar.py se detiene con cada uno ---
_tmp = tempfile.mkdtemp(prefix='srp-auditoria-paquete-')
PLANTADOS = {
    '.env': 'SRP_DB_USER=srp_api\nSRP_DB_PASS=Secreta2026\nSRP_DB_HOST=db.sia.local\n',
    'datos/respaldo-srp.dump': 'PGDMP',
    'datos/cuentas.csv': 'correo,clave\nalguien@sedema.cdmx.gob.mx,Secreta2026\n',
    '.vscode/settings.json': '{}',
    'Captura de pantalla 2026-10-27.png': 'PNG',
    'app/js/datos-ficticios.js': '// las cuentas de prueba',
}
def _paquete(nombre, extra=None):
    r = os.path.join(_tmp, nombre)
    os.makedirs(os.path.join(r, 'app', 'js'))
    open(os.path.join(r, 'VERSION'), 'w', encoding='utf-8').write('1.0.0\n')
    open(os.path.join(r, 'LEEME.md'), 'w', encoding='utf-8').write('# SRP\n\nVersión 1.0.0\n')
    open(os.path.join(r, 'app', 'js', 'config.js'), 'w', encoding='utf-8').write('  ES_FICTICIO: false,\n')
    if extra:
        os.makedirs(os.path.dirname(os.path.join(r, extra)), exist_ok=True)
        open(os.path.join(r, extra), 'w', encoding='utf-8').write(PLANTADOS[extra])
    return r
def _empaquetar(r):
    return subprocess.run([sys.executable, os.path.join(APP, 'herramientas', 'empaquetar.py'), r],
                          capture_output=True, text=True, encoding='utf-8', env=dict(os.environ, PYTHONUTF8='1'))
try:
    _limpio = _empaquetar(_paquete('limpio'))
    mirar(_limpio.returncode == 0, 'un paquete sin nada sospechoso se arma', _limpio.stderr.strip()[-300:])
    _pasaron = []
    for _i, _rel in enumerate(PLANTADOS):
        _r = _paquete('plantado-%d' % _i, _rel)
        if _empaquetar(_r).returncode == 0 or os.path.exists(_r + '.zip'):
            _pasaron.append(_rel)
    mirar(not _pasaron, 'el paquete no se arma con un .env, un respaldo de la base, una lista con claves, una carpeta de editor, una captura ni un archivo de prueba',
          'pasaron: %s' % _pasaron)
    # Con la base de hoy, el instructivo nombra sus guiones reales, el de la verificación, el instalador por la entrada
    # estándar (que debe traer los guiones de hoy) y lo de la calle
    _guiones = sorted(n for n in os.listdir(os.path.join(APP, 'servidor', 'db', 'srp')) if n.endswith('.sql'))
    _bien = ('# SRP\n\nVersión 1.0.0\n\nLa capa territorio.calles va antes; si llega después, CALL srp.recalcular_calles();. '
             'La verificación está al final de 10-srp-rol-y-grants.sql. Se instala con srp-instalar-por-stdin.sql.\n')
    _resultados = {}
    for _nombre, _leeme in [('bien', _bien), ('guion-viejo', _bien + 'Verifique con 09-srp-rol-y-grants.sql.\n'),
                            ('sin-recalculo', _bien.replace('CALL srp.recalcular_calles();', 'el recálculo')),
                            ('sin-stdin', _bien.replace(' Se instala con srp-instalar-por-stdin.sql.', '')), ('stdin-viejo', _bien)]:
        _r = _paquete('instructivo-' + _nombre)
        os.makedirs(os.path.join(_r, 'db', 'srp'))
        for _g in _guiones:
            shutil.copy2(os.path.join(APP, 'servidor', 'db', 'srp', _g), os.path.join(_r, 'db', 'srp'))
        open(os.path.join(_r, 'LEEME.md'), 'w', encoding='utf-8').write(_leeme)
        if _nombre == 'stdin-viejo':
            open(os.path.join(_r, 'db', 'srp', 'srp-instalar-por-stdin.sql'), 'a', encoding='utf-8').write('-- un cambio a mano\n')
        _resultados[_nombre] = _empaquetar(_r).returncode
    mirar(_resultados == {'bien': 0, 'guion-viejo': 1, 'sin-recalculo': 1, 'sin-stdin': 1, 'stdin-viejo': 1},
          'el paquete no se arma si el instructivo nombra un guion que no trae, no dice cómo recalcular la calle o no nombra el '
          'instalador por la entrada estándar, ni si ese instalador no trae los guiones de hoy', str(_resultados))
finally:
    shutil.rmtree(_tmp, ignore_errors=True)

malos = [h for h in hallazgos if not h[0]]
for ok_, desc, det in hallazgos:
    print(('OK    ' if ok_ else 'FALLA ') + desc + (('  -> ' + det) if (det and not ok_) else ''))
print('\n%d comprobaciones, %d hallazgos' % (len(hallazgos), len(malos)))
# Con algún hallazgo sale con 1: la verificación automática lo marca
raise SystemExit(1 if malos else 0)
