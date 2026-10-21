"""Jornadas: dos atajos tocados seguidos («Todas» y luego «Hoy»). La lista que tarda más en pintarse no debe quedar
encima de la última: lo que se ve tiene que ser lo del atajo marcado.

Para que pase siempre, y no sólo en un teléfono lento, la primera lista se frena: cada jornada que pinta espera
100 ms. La segunda se pinta sin freno y termina antes. Se repite dos veces, cada una en una ventana nueva.

Uso:  python lista_atrasada.py [dirección]   (por omisión http://127.0.0.1:8099/, la de pruebas/servir.py)
Sale con 0 si la lista quedó como el atajo marcado las dos veces."""
import sys
from playwright.sync_api import sync_playwright

BASE = sys.argv[1] if len(sys.argv) > 1 else 'http://127.0.0.1:8099/'
PRUEBA = """async () => {
  const J = SRP.jornadas, original = J.jornadaGuardada.bind(J);
  let freno = true;
  J.jornadaGuardada = async (j) => { if (freno) await new Promise(r => setTimeout(r, 100)); return original(j); };
  J.aplicarAtajo('todas');
  await new Promise(r => setTimeout(r, 60));
  freno = false;
  J.aplicarAtajo('hoy');
  await new Promise(r => setTimeout(r, 3000));
  J.jornadaGuardada = original;
  const hoy = SRP.util.fechaHoy();
  const tarjetas = document.querySelectorAll('#lista-jornadas .jornada').length;
  const pagina = SRP.util.paginar(J.lista, J.pagina, 'jornadas-paginas').items.length;
  return { pagina, marcado: document.querySelector('#jornada-atajos .chip[aria-pressed=true]').dataset.atajo,
           tarjetas, deHoy: J.lista.length, todas: J._todas.length, todasDeHoy: J._todas.every(j => j.fecha === hoy) };
}"""

# Tres jornadas de hace cinco días, con un árbol cada una, como en pruebas/prueba.py
SEMBRAR = """async () => { const u = SRP.sesion.usuario, dia = new Date(Date.now() - 5 * 86400000), ahora = SRP.util.ahoraISO();
  const f = dia.getFullYear() + '-' + String(dia.getMonth() + 1).padStart(2, '0') + '-' + String(dia.getDate()).padStart(2, '0');
  for (let s = 0; s < 3; s++) {
    const jid = SRP.util.generarId(), id = SRP.util.generarId();
    await SRP.almacen.guardarConBitacora('jornadas', Object.assign({ id: jid, nombre: 'Jornada ' + (s + 1), fecha: f, comentarios: '', cabo_id: u.id, estatus: 'cerrada',
      fecha_inicio: new Date(dia.getTime() + (9 + s * 3) * 3600000).toISOString(), fecha_cierre: ahora, encargado_id: u.id, editado_por_id: u.id,
      fecha_ultima_edicion: ahora, arboles_previstos: null, puntos_revisados: [] }, Object.fromEntries(SRP.reportes.CAMPOS.map(x => [x, '']))), null);
    await SRP.almacen.guardarConBitacora('plantaciones', { id, jornada_id: jid, estatus: 'activo', cabo_id: u.id, lat: 19.36 + s / 100, lng: -99.17, punto_origen: 'gps',
      gps_precision_m: 6, alcaldia: 'Benito Juárez', alcaldia_cve: '09014', colonia: null, colonia_cve: null, uga: 'BJU-011',
      capa_version: SRP.derivacion.derivar(19.4326, -99.1332).capa_version, especie_id: 'ESP-0070', especie_otra: '', programa_id: 'p-refor', fecha_plantacion: f,
      comentarios: '', foto_id: null, foto_base64: null, fecha_registro: new Date(dia.getTime() + (9 + s * 3) * 3600000).toISOString(), fecha_ultima_edicion: null,
      editado_por_id: null, folio: null }, SRP.bitacora.entrada('CREADO', 'plantacion', id));
  } }"""

malas = 0
with sync_playwright() as p:
    b = p.chromium.launch()
    for vez in (1, 2):
        ctx = b.new_context(viewport={'width': 1280, 'height': 900}); pg = ctx.new_page()
        pg.goto(BASE); pg.wait_for_selector('html[data-listo]')
        pg.select_option('#sel-usuario-prueba', 'u-admin-1'); pg.click('#btn-entrar-prueba')
        pg.wait_for_function("() => SRP.sesion && SRP.sesion.usuario")
        pg.evaluate(SEMBRAR)
        pg.evaluate("SRP.app.mostrarVista('jornadas')"); pg.wait_for_timeout(1500)
        r = pg.evaluate(PRUEBA)
        if r['todasDeHoy']: print('vez %d: no sirve para la prueba: todas las jornadas son de hoy' % vez); malas += 1; ctx.close(); continue
        bien = r['marcado'] == 'hoy' and r['tarjetas'] == r['pagina']
        malas += not bien
        print('vez %d: %s · atajo marcado «%s» · %d tarjetas a la vista · %d jornadas de hoy · %d en total'
              % (vez, 'bien' if bien else 'MAL: la lista no es la del atajo', r['marcado'], r['tarjetas'], r['deHoy'], r['todas']))
        ctx.close()
    b.close()
print('la lista quedó como el atajo marcado %d de 2 veces' % (2 - malas))
sys.exit(1 if malas else 0)
