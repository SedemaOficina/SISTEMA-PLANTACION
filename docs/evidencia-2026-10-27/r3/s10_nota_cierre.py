"""r3 · S10: la nota del cierre de una compartida con un cabo de apoyo pendiente, con y sin puntos por revisar (modo de
prueba, Estela u-demo-k1, la compartida abierta de la demostración). Uso: python s10_nota_cierre.py"""
from comun import *
R = {}; err = []
with sync_playwright() as p:
    b = p.chromium.launch(); ctx = contexto(b, ESC); pg = pagina(ctx, err); arrancar(pg); entrar(pg, 'u-admin-1'); cargar_demo(pg)
    como(pg, 'u-demo-k1')
    R['con_puntos'] = pg.evaluate("""async () => { const j = (await SRP.almacen.todos('jornadas')).find(x => SRP.demo.es(x.id) && x.estatus === 'abierta' && x.cabos_apoyo.length);
      const c = await SRP.activa.confirmacionCierre(j); return { vigentes: SRP.permisos.vigentes(j), puntos: c.puntos, nota: c.nota, otro: c.otro && c.otro.texto }; }""")
    # Un árbol de Rocío lejos de los demás (como el que quedó a 14 km en s1): queda un punto por revisar
    R['con_un_punto_lejos'] = pg.evaluate("""async () => { const j = (await SRP.almacen.todos('jornadas')).find(x => SRP.demo.es(x.id) && x.estatus === 'abierta' && x.cabos_apoyo.length);
      const r = (await SRP.almacen.todos('plantaciones')).find(x => x.jornada_id === j.id && x.cabo_id === 'u-demo-c3');
      await SRP.almacen.ponerLocal('plantaciones', Object.assign({}, r, { id: 'r3-lejos', folio: null, lat: r.lat + 0.12, lng: r.lng + 0.05 }));
      const c = await SRP.activa.confirmacionCierre(j); return { vigentes: SRP.permisos.vigentes(j), puntos: c.puntos, nota: c.nota, otro: c.otro && c.otro.texto }; }""")
    R['sin_puntos'] = pg.evaluate("""async () => { const j = (await SRP.almacen.todos('jornadas')).find(x => SRP.demo.es(x.id) && x.estatus === 'abierta' && x.cabos_apoyo.length);
      const regs = (await SRP.almacen.todos('plantaciones')).filter(r => r.jornada_id === j.id);
      for (const r of regs) { await SRP.almacen.ponerLocal('plantaciones', Object.assign({}, r, { revisado: true, revision_ok: true })); }
      const j2 = Object.assign({}, j, { puntos_revisados: regs.map(r => r.id), revisados: regs.map(r => r.id) });
      const c = await SRP.activa.confirmacionCierre(j2); return { vigentes: SRP.permisos.vigentes(j2), puntos: c.puntos, nota: c.nota, otro: c.otro && c.otro.texto }; }""")
    R['errores'] = err; guardar('s10.json', R); b.close()
print(json.dumps(R, ensure_ascii=False, indent=1))
