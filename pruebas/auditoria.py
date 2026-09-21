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

with sync_playwright() as p:
    b = p.chromium.launch(); pg = b.new_page(); errores = []
    pg.on('pageerror', lambda e: errores.append(str(e)))
    pg.goto(BASE); pg.wait_for_timeout(1500)

    # --- 2. Perfiles ---
    perfiles = pg.evaluate("Object.keys(SRP.PERFILES)")
    mirar(sorted(perfiles) == ['ADMIN','CABO','COORDINADOR','VIEWER'],
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
    mirar(set(d['perfilesUsados']) <= {'CABO','COORDINADOR','ADMIN','VIEWER'},
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
    # Si esta regla se rompe, un punto señalado con el dedo puede leerse como medido con GPS
    mirar(not r['precisionHuerfana'], 'la precisión aparece si y sólo si el punto vino del GPS', str(r['precisionHuerfana']))

    # --- 4. Lo que ve la persona ---
    opciones = pg.eval_on_selector_all('#sel-usuario-prueba option', 'os=>os.map(o=>o.textContent)')
    mirar(len(opciones) == 3, 'el selector ofrece las tres cuentas', str(opciones))
    mirar(not [o for o in opciones if o.endswith('— Consulta')],
          'ninguna cuenta aparece como Consulta', str(opciones))
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
          fecha_registro:1, fecha_ultima_edicion:1, editado_por_id:1 },
        SRP.formulario.valores.call({
          estado: { especieId: 'x', foto: null, fotoId: null, fotoNombre: '', fotoBytes: 0,
                    territorio: { alcaldia:'a', colonia:'c', uga:'u', capa_version:'v' } },
          OTRA: '__otra__', el: (i) => document.getElementById(i)
        })));
      return {
        plantaciones: plant,
        usuarios: await campos('usuarios'),
        catalogos: await campos('catalogos'),
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
                        and not c.startswith(('alcaldias_', 'nombre_cientifico')))
    mirar(not inventados, 'y el mapeo no inventa campos que no existen', str(inventados))
    b.close()

malos = [h for h in hallazgos if not h[0]]
for ok_, desc, det in hallazgos:
    print(('OK    ' if ok_ else 'FALLA ') + desc + (('  -> ' + det) if (det and not ok_) else ''))
print('\n%d comprobaciones, %d hallazgos' % (len(hallazgos), len(malos)))
