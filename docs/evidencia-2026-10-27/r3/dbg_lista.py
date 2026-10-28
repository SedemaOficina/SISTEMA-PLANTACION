"""r3 · Depura: ¿la compartida abierta de hoy sale en Jornadas para cada perfil? (modo de prueba)"""
from comun import *
err = []
with sync_playwright() as p:
    b = p.chromium.launch(); ctx = contexto(b, TEL); pg = pagina(ctx, err); arrancar(pg); entrar(pg, 'u-admin-1'); cargar_demo(pg)
    jid = pg.evaluate("async () => (await SRP.almacen.todos('jornadas')).find(x => SRP.demo.es(x.id) && x.estatus === 'abierta' && x.cabos_apoyo.length).id")
    for uid in ('u-admin-1', 'u-dir-1', 'u-demo-c5', 'u-demo-c3', 'u-demo-k1'):
        como(pg, uid); vista(pg, 'jornadas', 2500)
        r = pg.evaluate("""async id => { const t = document.querySelector('#jornada-atajos .chip[data-atajo="todas"]'); const antes = SRP.jornadas.lista.length;
          if (t) { t.click(); await new Promise(r => setTimeout(r, 2500)); }
          const ids = SRP.jornadas.lista.map(j => (j.dato || {}).id);
          const alc = (await SRP.jornadas.jornadasAlcance()).map(j => j.id);
          return { atajo: !!t, antes, despues: SRP.jornadas.lista.length, enLista: ids.includes(id), enAlcance: alc.includes(id), filtro: JSON.stringify(SRP.jornadas.filtro), primera: SRP.jornadas.lista[0] && SRP.jornadas.lista[0].dato && SRP.jornadas.lista[0].dato.nombre,
            claves: SRP.jornadas.lista.slice(0, 3).map(j => j.clave) }; }""", jid)
        print(uid, json.dumps(r, ensure_ascii=False))
    print(err)
    b.close()
