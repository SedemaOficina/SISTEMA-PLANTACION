/* POSIBLES DUPLICADOS (sólo Administración global, con datos reales). Al recibir un árbol, el servidor busca
   otro de la misma especie, de otra institución y de otra jornada, más cerca que la suma de la precisión de los
   dos GPS —nunca menos que «Puntos duplicados»—, y anota la pareja aquí sin decirle nada a ninguna de las dos
   instituciones (servidor/src/modulos/srp/duplicados.ts).

   Cada pareja trae la distancia, la precisión sumada, el día en que se detectó y un mapa con los dos puntos:
   ámbar el que llegó después y azul el que ya estaba. Abajo, los dos árboles uno junto al otro, cada uno con
   «Abrir en Registros», y la decisión: «Es el mismo árbol» o «Son distintos». Una pareja revisada no se vuelve
   a revisar. Si son el mismo árbol, uno de los dos se elimina desde su ficha, como cualquier otro registro. */
window.SRP = window.SRP || {};

SRP.duplicados = {
  lista: [],
  pagina: 1,
  turno: 0,   // cada consulta lleva el suyo: si llega tarde una anterior, no pinta encima de la última
  mapas: [],
  RESOLUCION: { mismo: 'es el mismo árbol', distintos: 'son árboles distintos' },

  el(id) { return document.getElementById(id); },

  // La bandeja vive en el servidor: sólo con datos reales, y sólo para quien la revisa
  disponible() { return SRP.remoto.activo() && SRP.permisos.puede('duplicado.revisar'); },

  iniciar() {
    this.el('dup-mostrar').addEventListener('change', () => { this.pagina = 1; this.preparar(); });
    this.el('dup-lista').addEventListener('click', (e) => {
      const b = e.target.closest('button'); if (!b) return;
      if (b.dataset.abrir) this.abrir(b.dataset.abrir);
      if (b.dataset.resolver) this.revisar(Number(b.closest('[data-pareja]').dataset.pareja), b.dataset.resolver, b);
    });
  },

  // Todas las parejas del estado elegido, página por página del servidor; null si no respondió
  async traer(estado) {
    const filas = [];
    let despues = null, pendientes = 0;
    do {
      const r = await SRP.servidor.pedir('GET', '/duplicados?estado=' + estado + '&limite=500' + (despues ? '&despues=' + encodeURIComponent(despues) : ''));
      if (!r.ok) return null;
      filas.push(...r.datos.filas);
      pendientes = r.datos.pendientes;
      despues = r.datos.siguiente;
    } while (despues);
    return { filas, pendientes };
  },

  // Cuántas faltan por revisar, para la tarjeta de Configuración; null si no se sabe
  async pendientes() {
    if (!this.disponible()) return null;
    const r = await SRP.servidor.pedir('GET', '/duplicados?limite=1');
    return r.ok ? r.datos.pendientes : null;
  },

  textoParejas(n, que) { return n.toLocaleString('es-MX') + (n === 1 ? ' pareja' : ' parejas') + (que ? ' ' + que : ''); },

  async preparar() {
    this.el('dup-nota').textContent = 'Árboles de la misma especie, de dos instituciones distintas, que quedaron más cerca que la suma de la precisión de sus GPS ' +
      '(nunca menos de ' + SRP.CONFIG.JORNADA.DUPLICADO_M.toLocaleString('es-MX') + ' m): puede ser el mismo árbol contado dos veces. ' +
      'Ninguna de las dos instituciones ve esta lista. Revise cada pareja y diga si es el mismo árbol o si son distintos.';
    const estado = this.el('dup-mostrar').value, turno = ++this.turno;
    const r = await this.traer(estado);
    if (turno !== this.turno) return;
    if (!r) {
      this.lista = [];
      this.el('dup-cuenta').textContent = '';
      SRP.util.anunciar('Sin conexión con el servidor: la bandeja no se pudo traer. Intente de nuevo cuando haya señal.', 'aviso');
    } else {
      // Lo más reciente primero
      this.lista = r.filas.sort((a, b) => b.id - a.id);
      this.el('dup-cuenta').textContent = estado === 'pendientes' ? this.textoParejas(r.pendientes, 'por revisar')
        : this.textoParejas(this.lista.length, estado === 'revisados' ? (this.lista.length === 1 ? 'revisada' : 'revisadas') : '');
    }
    this.pintar(!r);
  },

  /* ---------- Cada pareja ---------- */

  // Lo que la Administración necesita ver de un árbol para decidir
  ficha(a) {
    const ubicacion = SRP.mapa.textoOrigen(a.punto_origen, a.gps_precision_m);
    return [['Especie', (a.especie || 'Sin especie') + (a.estatus && a.estatus !== 'activo' ? ' (' + a.estatus + ')' : '')], ['Folio', SRP.folio.texto(a)],
      ['Institución', a.institucion || ''], ['Registró', a.cabo || ''], ['Jornada', a.jornada || ''],
      ['Plantado', a.fecha_plantacion ? SRP.util.formatearFecha(a.fecha_plantacion) : ''], ['Ubicación', ubicacion],
      ['Colonia', [a.colonia, a.alcaldia ? SRP.ref.alcaldia(a.alcaldia) : ''].filter(Boolean).join(', ')]];
  },

  dia(iso) { return iso ? SRP.util.formatearFecha(SRP.envio.diaLocal(iso)) : ''; },

  htmlPareja(p) {
    const esc = SRP.util.escapar, a = p.llego, b = p.cercano;
    const distancia = Number(p.distancia_actual_m != null ? p.distancia_actual_m : p.distancia_m);
    // La precisión sumada sólo si los dos puntos vienen del GPS: un punto señalado a mano no tiene margen
    const suma = a.punto_origen === 'gps' && b.punto_origen === 'gps' && a.gps_precision_m != null && b.gps_precision_m != null
      ? ' · la precisión de los dos suma ±' + Math.round(Number(a.gps_precision_m) + Number(b.gps_precision_m)) + ' m' : '';
    const arbol = (x, cual, titulo) => '<section><h3><span class="dup-punto" data-cual="' + cual + '"></span>' + titulo + '</h3><dl class="cfg-datos">' +
      this.ficha(x).map(([k, v]) => '<div class="cfg-dato"><dt>' + esc(k) + '</dt><dd>' + esc(v) + '</dd></div>').join('') + '</dl>' +
      '<button type="button" class="btn btn-texto-editar btn-chico" data-abrir="' + esc(x.id) + '" aria-label="Abrir en Registros el árbol que ' + titulo.toLowerCase() + '">' +
      SRP.ICONOS.svg('ver', 'chico') + '<span>Abrir en Registros</span></button></section>';
    const decision = p.resolucion
      ? '<p class="dup-revisada nota"><span class="insignia">Revisada</span> ' + esc(this.dia(p.revisado_en)) + (p.revisado_por ? ' por ' + esc(p.revisado_por) : '') + ': ' + esc(this.RESOLUCION[p.resolucion] || p.resolucion) + '.</p>'
      : '<div class="fila-botones"><button type="button" class="btn btn-secundario" data-resolver="mismo"><span>Es el mismo árbol</span></button>' +
        '<button type="button" class="btn btn-secundario" data-resolver="distintos"><span>Son distintos</span></button></div>';
    return '<li class="dup-pareja" data-pareja="' + p.id + '"><p class="dup-cabeza"><b>A ' + distancia.toLocaleString('es-MX', { maximumFractionDigits: 1 }) + ' m</b> uno del otro' + suma +
      ' · se detectó el ' + esc(this.dia(p.detectado_en)) + '</p>' +
      '<div class="dup-mapa" id="dup-mapa-' + p.id + '" role="img" aria-label="Mapa con los dos árboles: en ámbar el que llegó después, en azul el que ya estaba"></div>' +
      '<div class="dup-arboles">' + arbol(a, 'llego', 'Llegó después') + arbol(b, 'estaba', 'Ya estaba') + '</div>' + decision + '</li>';
  },

  pintar(sinRespuesta) {
    this.mapas.forEach(m => m.remove());
    this.mapas = [];
    const info = SRP.util.paginar(this.lista, this.pagina, 'dup-paginas');
    this.pagina = info.pagina;
    this.el('dup-lista').innerHTML = info.items.map(p => this.htmlPareja(p)).join('');
    const vacio = this.el('dup-vacio'), estado = this.el('dup-mostrar').value;
    vacio.hidden = this.lista.length > 0;
    if (!vacio.hidden) vacio.innerHTML = '<p class="vacio-titulo">' + (sinRespuesta ? 'No se pudo traer la bandeja' : estado === 'pendientes' ? 'No hay parejas por revisar' : 'No hay parejas') + '</p>' +
      '<p class="vacio-texto">' + (sinRespuesta ? 'Hace falta conexión con el servidor.' : 'Aquí aparecerá cada pareja de árboles de instituciones distintas que quede casi en el mismo lugar.') + '</p>';
    SRP.util.pintarPaginador(this.el('dup-paginas'), info, 'pareja', 'parejas', (n) => { this.pagina = n; this.pintar(); SRP.util.subirA(this.el('dup-cuenta')); });
    info.items.forEach(p => this.mapa(p));
  },

  // Un mapa de sólo lectura con los dos puntos
  mapa(p) {
    if (typeof L === 'undefined') return;
    const a = [Number(p.llego.lat), Number(p.llego.lng)], b = [Number(p.cercano.lat), Number(p.cercano.lng)];
    const m = L.map('dup-mapa-' + p.id, { zoomControl: false, dragging: false, scrollWheelZoom: false, doubleClickZoom: false, touchZoom: false, keyboard: false });
    SRP.mapa.ponerCredito(m);
    SRP.mapa.ponerBase(m);
    L.circleMarker(b, { radius: 8, className: 'dup-marca-estaba', interactive: false }).addTo(m);
    L.circleMarker(a, { radius: 8, className: 'dup-marca-llego', interactive: false }).addTo(m);
    m.fitBounds(L.latLngBounds([a, b]), { padding: [60, 60], maxZoom: 19, animate: false });
    setTimeout(() => m.invalidateSize(), 60);
    this.mapas.push(m);
  },

  /* ---------- Lo que decide la Administración ---------- */

  async abrir(id) {
    const r = await SRP.almacen.uno('plantaciones', id);
    if (r) SRP.registros.verDetalle(r);
    else SRP.util.anunciar('Ese árbol no está entre lo que se trajo del servidor: búsquelo en Registros.', 'aviso');
  },

  async revisar(id, resolucion, boton) {
    if (!SRP.permisos.exigir('duplicado.revisar')) return;
    const libre = SRP.util.ocupado(boton, 'Guardando…', 'disco');
    let r;
    try { r = await SRP.servidor.pedir('POST', '/duplicados/revision', { ids: [id], resolucion, nota: '' }); }
    finally { libre(); }
    if (!r.ok) { SRP.util.anunciar(r.sinRed ? 'Sin conexión con el servidor: la pareja no se marcó. Intente de nuevo cuando haya señal.' : r.mensaje, 'aviso'); return; }
    if ((r.datos.ya_revisados || []).includes(id)) SRP.util.anunciar('Esa pareja ya la había revisado otra persona.', 'aviso');
    else SRP.util.anunciar(resolucion === 'mismo'
      ? 'Marcada como el mismo árbol. Para que no cuente dos veces, elimine uno de los dos desde su ficha en Registros.'
      : 'Marcada: son árboles distintos.', 'exito');
    await this.preparar();
  }
};
