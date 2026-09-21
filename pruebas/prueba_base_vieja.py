# Mientras los datos son ficticios: un dispositivo con una estructura anterior debe poder abrir
# el sistema. La base se rehace desde cero; no se conserva nada, y así está decidido.
from playwright.sync_api import sync_playwright
BASE='http://127.0.0.1:8099/'
res=[]
def ok(c,m): res.append(('OK ' if c else 'FALLA ')+m)
CREAR_VIEJA = """() => new Promise(res => {
  const pet = indexedDB.open('srp_db', 7);   // estructura muy posterior: el peor caso
  pet.onupgradeneeded = () => {
    const db = pet.result;
    const pl = db.createObjectStore('plantaciones',{keyPath:'id'});
    pl.createIndex('registrador_id','registrador_id');
    db.createObjectStore('usuarios',{keyPath:'id'});
    db.createObjectStore('catalogos',{keyPath:'id'});
    db.createObjectStore('bitacora',{keyPath:'id'});
  };
  pet.onsuccess = () => { pet.result.close(); res('ok'); };
})"""
with sync_playwright() as p:
  b=p.chromium.launch(); pg=b.new_page(); errores=[]
  pg.on('pageerror', lambda e: errores.append(str(e)))
  pg.goto(BASE+'no-existe-a-proposito'); pg.wait_for_timeout(200)
  pg.evaluate(CREAR_VIEJA)
  pg.goto(BASE); pg.wait_for_timeout(1800)
  ok(pg.is_visible('#vista-acceso'), 'el sistema abre pese a la estructura anterior')
  r = pg.evaluate("""() => new Promise(res=>{
    const pet=indexedDB.open('srp_db');
    pet.onsuccess=()=>{const db=pet.result;
      const out={version:db.version, indices:[...db.transaction('plantaciones').objectStore('plantaciones').indexNames]};
      db.close(); res(out);};
  })""")
  ok(r['version']==1, 'la base queda en la estructura actual (versión %s)' % r['version'])
  ok('cabo_id' in r['indices'] and 'registrador_id' not in r['indices'], 'con los índices de ahora: %s' % r['indices'])
  ok(pg.locator('#sel-usuario-prueba option').count()==3, 'las tres cuentas de arranque se siembran de nuevo')
  pg.select_option('#sel-usuario-prueba','u-cabo-1'); pg.click('#btn-entrar-prueba'); pg.wait_for_timeout(600)
  pg.click('.pestana[data-vista=registros]'); pg.wait_for_timeout(400)
  pg.click('.chip[data-atajo=todos]'); pg.wait_for_timeout(300)
  ok('No hay registros' in pg.inner_text('#registros-total'), 'y el sistema queda sin plantaciones, como debe: '+pg.inner_text('#registros-total'))
  b.close()
print('\n'.join(res)); print('errores:', errores or 'ninguno'); print('fallas:', sum(x.startswith('FALLA') for x in res))
