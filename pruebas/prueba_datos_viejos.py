# Un dispositivo que ya sembró los datos de prueba anteriores debe corregirse solo al abrir.
from playwright.sync_api import sync_playwright
BASE='http://127.0.0.1:8099/'
res=[]
def ok(c,m): res.append(('OK ' if c else 'FALLA ')+m)
CREAR = """() => new Promise(r => {
  const pet = indexedDB.open('srp_db', 1);
  pet.onupgradeneeded = () => {
    const db = pet.result;
    const pl = db.createObjectStore('plantaciones',{keyPath:'id'});
    pl.createIndex('registrador_id','registrador_id');
    pl.createIndex('fecha_plantacion','fecha_plantacion');
    pl.createIndex('estatus','estatus');
    db.createObjectStore('usuarios',{keyPath:'id'});
    const ca=db.createObjectStore('catalogos',{keyPath:'id'}); ca.createIndex('tipo','tipo');
    const bi=db.createObjectStore('bitacora',{keyPath:'id'}); bi.createIndex('entidad_id','entidad_id');
  };
  pet.onsuccess = () => {
    const db=pet.result; const tx=db.transaction(['usuarios','plantaciones'],'readwrite');
    tx.objectStore('usuarios').put({id:'u-reg-1',correo:'fulana@ejemplo.local',nombre:'Fulana',apellido_paterno:'de Tal',
      apellido_materno:'Ejemplo',area_id:'a-div',cargo_rol:'Técnica',perfil:'REGISTRADOR',jefe_id:'u-jefe-1',activo:true});
    tx.objectStore('usuarios').put({id:'u-jefe-1',correo:'perengano@ejemplo.local',nombre:'Perengano',apellido_paterno:'Gómez',
      apellido_materno:'Ejemplo',area_id:'a-div',cargo_rol:'Jefe',perfil:'JEFE',jefe_id:null,activo:true});
    tx.objectStore('plantaciones').put({id:'vieja-1',registrador_id:'u-reg-1',fecha_plantacion:'2026-09-01',estatus:'activo'});
    tx.oncomplete=()=>{db.close(); r('ok');};
  };
})"""
with sync_playwright() as p:
  b=p.chromium.launch(); pg=b.new_page(); errores=[]
  pg.on('pageerror', lambda e: errores.append(str(e)))
  pg.goto(BASE+'no-existe'); pg.wait_for_timeout(200)
  pg.evaluate(CREAR)
  pg.evaluate("localStorage.setItem('srp_sello_datos','sello-anterior')")   # como lo dejó la versión previa
  pg.goto(BASE); pg.wait_for_timeout(2000)
  opciones = pg.eval_on_selector_all('#sel-usuario-prueba option','os=>os.map(o=>o.textContent)')
  ok(any('— Cabo' in o for o in opciones), 'las cuentas aparecen como Cabo: '+str([o.split('— ')[-1] for o in opciones]))
  ok(not [o for o in opciones if o.endswith('— Consulta')], 'ninguna queda como Consulta: '+str(opciones))
  ok(len(opciones)==3, 'quedan las tres cuentas de arranque (%d)' % len(opciones))
  ok(pg.evaluate("[...SRP.permisos.perfilesDesconocidos].length")==0, 'ningún perfil desconocido')
  ok(pg.evaluate("localStorage.getItem('srp_sello_datos')")==pg.evaluate("SRP.CONFIG.SELLO_DATOS"), 'queda anotado el sello nuevo')
  quedan = pg.evaluate("""() => new Promise(r=>SRP.almacen.todos('plantaciones').then(ps=>
      r(ps.filter(p=>'registrador_id' in p).length)))""")
  ok(quedan==0, 'no queda ninguna plantación con el campo anterior (%d)' % quedan)
  # Y al volver a abrir no se resiembra otra vez
  pg.goto(BASE); pg.wait_for_timeout(1200)
  ok('actualizaron' not in pg.inner_text('body'), 'al abrir de nuevo ya no vuelve a resembrar')
  ok(not errores, 'sin errores en consola: '+str(errores))
  b.close()
print('\n'.join(res)); print('fallas:', sum(x.startswith('FALLA') for x in res))
