/* JORNADAS: MAPA Y LISTA DE LO REGISTRADO EN UNA JORNADA (D112).

   PARA QUÉ. Al cierre, la cuadrilla necesita comprobar que cada árbol sembrado tenga su punto
   («si sembraron 10, que haya 10») y corregir lo que salió mal. Esta vista junta los registros de
   una jornada en un mapa con puntos numerados en el orden en que se registraron y, debajo, la
   misma lista con el mismo número.

   QUÉ ES UNA JORNADA. Fecha de plantación más cabo: la misma llave del cierre del día
   (`fecha|cabo_id`), así que no hace falta un dato nuevo. Si ese día el cabo trabajó en dos sitios
   separados por más de CONFIG.JORNADA.SEPARAR_M, la jornada se parte en dos tarjetas, una por
   sitio. El nombre del sitio sale del cierre («Sitio», primer renglón) o, si no se ha escrito, de
   la colonia más frecuente de los puntos.

   CONCILIACIÓN. Se escribe cuántos árboles sembró la cuadrilla; el sistema lo compara con los
   registros y dice si cuadra, si faltan o si sobran. El número se guarda en el cierre del día
   (`arboles_sembrados`) y sale en el reporte.

   AVISOS (sin inventar errores: son para revisar, no se corrigen solos):
     duplicado   misma especie a menos de DUPLICADO_M de otro punto de la jornada
     lejos       a más de FUERA_M de la mediana de los demás puntos (con 3 o más puntos)
     precisión   GPS peor que PRECISION_ACEPTABLE_M al registrar
   «Está bien» marca el punto como revisado (`puntos_revisados` del cierre) y deja de contarse. */
window.SRP = window.SRP || {};

SRP.jornadas = {
  filtro: { dia: '', cabo: '' },
  diaAbierto: false,
  lista: [],            // jornadas de lo filtrado
  actual: null,         // clave de la jornada abierta
  volverAlDetalle: false,
  mapa: null,
  marcadores: {},

  el(id) { return document.getElementById(id); },

  iniciar() {
    this.el('jornada-atajos').addEventListener('click', (e) => {
      const b = e.target.closest('.chip'); if (!b) return;
      this.aplicarAtajo(b.dataset.atajo);
    });
    this.el('jornada-dia').addEventListener('change', () => {
      this.filtro.dia = this.el('jornada-dia').value;
      this.diaAbierto = true;
      this.pintarLista();
    });
    this.el('jornada-cabo').addEventListener('change', () => {
      this.filtro.cabo = this.el('jornada-cabo').value;
      this.pintarLista();
    });
    this.el('lista-jornadas').addEventListener('click', (e) => {
      const li = e.target.closest('[data-clave]'); if (li) this.abrir(li.dataset.clave);
    });
    this.el('btn-jornada-volver').addEventListener('click', () => this.cerrar());
    this.el('jornada-sembrados').addEventListener('change', () => this.guardarConteo());
    this.el('jornada-lista').addEventListener('click', (e) => this.alTocarLista(e));
    this.el('btn-jornada-faltante').addEventListener('click', () => this.registrarFaltante());
    this.el('btn-jornada-reporte').addEventListener('click', () => this.irAlReporte());
  },

  /* ---------- Datos ---------- */

  distancia(a, b) {
    const R = 6371000, rad = Math.PI / 180;
    const dLat = (b.lat - a.lat) * rad, dLng = (b.lng - a.lng) * rad;
    const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLng / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(h));
  },

  mediana(nums) {
    const v = [...nums].sort((a, b) => a - b), m = Math.floor(v.length / 2);
    return v.length % 2 ? v[m] : (v[m - 1] + v[m]) / 2;
  },

  async registrosAlcance() {
    const u = SRP.sesion.usuario;
    return (await SRP.almacen.porIndice('plantaciones', 'estatus', 'activo'))
      .filter(r => SRP.permisos.alcanza(u, r, SRP.ref.usuarioPorId));
  },

  /* Agrupa por fecha y cabo, y parte cada grupo por sitio: dos puntos quedan en el mismo sitio si
     hay una cadena de puntos entre ellos a menos de SEPARAR_M (enlace simple). */
  agrupar(registros) {
    const grupos = {};
    registros.forEach(r => { (grupos[r.fecha_plantacion + '|' + r.cabo_id] = grupos[r.fecha_plantacion + '|' + r.cabo_id] || []).push(r); });
    const salida = [];
    Object.keys(grupos).forEach(clave => {
      const regs = grupos[clave].sort((a, b) => a.fecha_registro.localeCompare(b.fecha_registro));
      const padre = regs.map((_, i) => i);
      const raiz = i => (padre[i] === i ? i : (padre[i] = raiz(padre[i])));
      for (let i = 0; i < regs.length; i++) {
        for (let j = i + 1; j < regs.length; j++) {
          if (this.distancia(regs[i], regs[j]) <= SRP.CONFIG.JORNADA.SEPARAR_M) padre[raiz(i)] = raiz(j);
        }
      }
      // Los sitios salen en el orden en que se empezaron a registrar
      const partes = [];
      const indice = {};
      regs.forEach((r, i) => {
        const k = raiz(i);
        if (!(k in indice)) { indice[k] = partes.length; partes.push([]); }
        partes[indice[k]].push(r);
      });
      const [fecha, cabo] = clave.split('|');
      partes.forEach((p, n) => salida.push({
        clave: clave + '|' + (n + 1), fecha, cabo_id: cabo, parte: n + 1, partes: partes.length,
        registros: p, totalDia: regs.length
      }));
    });
    return salida.sort((a, b) => b.fecha.localeCompare(a.fecha) ||
      SRP.ref.nombreUsuario(a.cabo_id).localeCompare(SRP.ref.nombreUsuario(b.cabo_id), 'es') || a.parte - b.parte);
  },

  claveCierre(j) { return SRP.reportes.claveCierre(j.fecha, j.cabo_id); },

  async cierreDe(j) { return (await SRP.almacen.uno('cierres', this.claveCierre(j))) || null; },

  // El sitio: lo que escribió la cuadrilla en el cierre o, si no, la colonia más frecuente
  nombreSitio(j, cierre) {
    const escrito = cierre && cierre.sitio ? cierre.sitio.split('\n')[0].trim() : '';
    if (escrito && j.partes === 1) return escrito.length > 60 ? escrito.slice(0, 57) + '…' : escrito;
    const cuenta = {};
    j.registros.forEach(r => { if (r.colonia) cuenta[r.colonia] = (cuenta[r.colonia] || 0) + 1; });
    const top = Object.keys(cuenta).sort((a, b) => cuenta[b] - cuenta[a])[0];
    return top ? 'Col. ' + SRP.ref.colonia(top) : SRP.ref.alcaldia(j.registros[0].alcaldia) || 'Sin colonia';
  },

  alcaldiasDe(j) { return [...new Set(j.registros.map(r => SRP.ref.alcaldia(r.alcaldia)).filter(Boolean))]; },

  claveEspecie(r) { return r.especie_id || 'otra:' + SRP.util.normalizar(r.especie_otra); },

  /* Los avisos de cada punto. Devuelve { id: [ { tipo, texto } ] } con el número de orden de la
     jornada en el texto, para que la lista y el mapa digan lo mismo. */
  avisos(j) {
    const cfg = SRP.CONFIG.JORNADA;
    const regs = j.registros;
    const num = {}; regs.forEach((r, i) => { num[r.id] = i + 1; });
    const salida = {};
    const poner = (r, tipo, texto) => { (salida[r.id] = salida[r.id] || []).push({ tipo, texto }); };
    regs.forEach((r, i) => {
      // Duplicado: la misma especie casi en el mismo lugar
      regs.forEach((o, k) => {
        if (k === i || this.claveEspecie(o) !== this.claveEspecie(r)) return;
        const d = this.distancia(r, o);
        if (d < cfg.DUPLICADO_M) poner(r, 'duplicado', 'Posible duplicado del ' + num[o.id] + ' · a ' + d.toFixed(1) + ' m');
      });
      // Lejos del resto: frente a la mediana de los demás puntos, que un punto errado no mueve
      if (regs.length >= 3) {
        const otros = regs.filter(o => o !== r);
        const centro = { lat: this.mediana(otros.map(o => o.lat)), lng: this.mediana(otros.map(o => o.lng)) };
        const d = this.distancia(r, centro);
        if (d > cfg.FUERA_M) poner(r, 'lejos', 'Lejos del resto · a ' + Math.round(d) + ' m');
      }
      if (r.punto_origen === 'gps' && r.gps_precision_m > SRP.CONFIG.MAPA.PRECISION_ACEPTABLE_M) {
        poner(r, 'precision', 'Precisión baja · ±' + Math.round(r.gps_precision_m) + ' m');
      }
    });
    return salida;
  },

  // Lo que queda por revisar: puntos con aviso que nadie marcó como «Está bien»
  pendientes(j, avisos, cierre) {
    const revisados = (cierre && cierre.puntos_revisados) || [];
    return j.registros.filter(r => avisos[r.id] && !revisados.includes(r.id));
  },

  /* El estado de la jornada en una frase y un tono: lo que se ve en la tarjeta y en la revisión */
  estado(j, avisos, cierre) {
    const pend = this.pendientes(j, avisos, cierre).length;
    const sembrados = cierre && Number.isInteger(cierre.arboles_sembrados) ? cierre.arboles_sembrados : null;
    const reg = j.totalDia;
    if (pend) return { tono: 'rev', texto: pend === 1 ? '1 punto por revisar' : pend + ' puntos por revisar' };
    if (sembrados === null) return { tono: 'neutro', texto: 'Sin conteo de la cuadrilla' };
    if (sembrados === reg) return { tono: 'ok', texto: 'Revisada: ' + reg + ' de ' + sembrados };
    return { tono: 'err', texto: 'Contados ' + sembrados + ' · registrados ' + reg };
  },

  /* ---------- Lista de jornadas ---------- */

  async preparar() {
    const u = SRP.sesion.usuario;
    const alcance = SRP.permisos.de(u).alcance;
    const hoy = SRP.util.formatearFecha(SRP.util.fechaHoy());
    this.el('jornada-chip-hoy').innerHTML = 'Hoy<span class="oculto-visual">, </span><span class="chip-sub">' + SRP.util.escapar(hoy) + '</span>';
    const caja = this.el('caja-jornada-cabo');
    caja.hidden = alcance === 'propios';
    if (!caja.hidden) {
      const ids = [...new Set((await this.registrosAlcance()).map(r => r.cabo_id))];
      const sel = this.el('jornada-cabo');
      sel.innerHTML = '<option value="">Todos</option>' + ids
        .map(id => [id, SRP.ref.nombreUsuario(id)]).sort((a, b) => a[1].localeCompare(b[1], 'es'))
        .map(([id, n]) => '<option value="' + id + '">' + SRP.util.escapar(n) + '</option>').join('');
      sel.value = ids.includes(this.filtro.cabo) ? this.filtro.cabo : '';
      this.filtro.cabo = sel.value;
    }
    // Al volver de editar un punto se regresa a la jornada que se estaba revisando
    if (this.volverAlDetalle && this.actual) {
      this.volverAlDetalle = false;
      await this.pintarLista(true);
      if (this.lista.some(j => j.clave === this.actual)) { await this.abrir(this.actual); return; }
    }
    this.actual = null;
    this.mostrarDetalle(false);
    await this.pintarLista();
  },

  aplicarAtajo(atajo) {
    const f = this.filtro;
    if (atajo === 'hoy') { f.dia = SRP.util.fechaHoy(); this.diaAbierto = false; this.el('jornada-dia').value = ''; }
    if (atajo === 'todas') { f.dia = ''; this.diaAbierto = false; this.el('jornada-dia').value = ''; }
    if (atajo === 'dia') { this.diaAbierto = true; f.dia = this.el('jornada-dia').value; }
    this.pintarLista();
  },

  sincronizarAtajos() {
    const f = this.filtro;
    const activo = { hoy: !this.diaAbierto && f.dia === SRP.util.fechaHoy(), dia: this.diaAbierto, todas: !this.diaAbierto && !f.dia };
    this.el('jornada-atajos').querySelectorAll('.chip').forEach(c => c.setAttribute('aria-pressed', String(!!activo[c.dataset.atajo])));
    this.el('jornada-un-dia').hidden = !this.diaAbierto;
    this.el('jornada-atajos').querySelector('[data-atajo="dia"]').setAttribute('aria-expanded', String(this.diaAbierto));
  },

  async pintarLista(soloDatos) {
    const f = this.filtro;
    this.sincronizarAtajos();
    const regs = (await this.registrosAlcance()).filter(r => (!f.dia || r.fecha_plantacion === f.dia) && (!f.cabo || r.cabo_id === f.cabo));
    this.lista = this.agrupar(regs);
    if (soloDatos) return;
    const u = SRP.sesion.usuario;
    const variosAutores = SRP.permisos.de(u).alcance !== 'propios';
    const esc = SRP.util.escapar;
    const hoy = SRP.util.fechaHoy();
    const html = [];
    for (const j of this.lista) {
      const cierre = await this.cierreDe(j);
      const est = this.estado(j, this.avisos(j), cierre);
      const n = j.registros.length;
      const especies = new Set(j.registros.map(r => this.claveEspecie(r))).size;
      const dia = (j.fecha === hoy ? 'Hoy · ' : '') + SRP.envio.diaEnLetra(j.fecha).split(' ')[0].slice(0, 3) + ' ' + SRP.util.formatearFecha(j.fecha);
      html.push('<li class="jornada" data-clave="' + esc(j.clave) + '"><button type="button" class="jornada-boton" aria-label="Revisar la jornada del ' +
        esc(SRP.util.formatearFecha(j.fecha)) + ' en ' + esc(this.nombreSitio(j, cierre)) + ', ' + n + (n === 1 ? ' árbol' : ' árboles') + ', ' + esc(est.texto) + '">' +
        this.miniatura(j) +
        '<span class="jornada-datos"><span class="jornada-dia">' + esc(dia) + '</span>' +
        '<span class="jornada-sitio">' + esc(this.nombreSitio(j, cierre)) + (j.partes > 1 ? ' (sitio ' + j.parte + ' de ' + j.partes + ')' : '') + '</span>' +
        '<span class="jornada-cifras">' + esc(this.alcaldiasDe(j).join(', ')) + ' · ' + n + (n === 1 ? ' árbol' : ' árboles') + ' · ' +
        especies + (especies === 1 ? ' especie' : ' especies') + (variosAutores ? ' · ' + esc(SRP.ref.nombreUsuario(j.cabo_id)) : '') + '</span>' +
        '<span class="insignia-jornada" data-tono="' + est.tono + '">' + esc(est.texto) + '</span></span></button></li>');
    }
    this.el('lista-jornadas').innerHTML = html.join('');
    const n = this.lista.length;
    this.el('jornadas-total').textContent = n ? 'Total: ' + n + (n === 1 ? ' jornada' : ' jornadas') : '';
    const vacio = this.el('jornadas-vacio');
    vacio.hidden = n > 0;
    if (!n) vacio.innerHTML = '<p><strong>' + (f.dia ? 'No hay registros del ' + esc(SRP.util.formatearFecha(f.dia)) + '.' : 'Todavía no hay jornadas.') + '</strong></p>' +
      '<p class="nota">Cada día de trabajo con árboles registrados aparece aquí con su mapa.</p>';
  },

  // Miniatura: los puntos de la jornada en un cuadro, sin mapa de fondo (no pide nada a la red)
  miniatura(j) {
    const lats = j.registros.map(r => r.lat), lngs = j.registros.map(r => r.lng);
    const [a, b, c, d] = [Math.min(...lats), Math.max(...lats), Math.min(...lngs), Math.max(...lngs)];
    const span = Math.max(b - a, d - c, 0.0002);
    const pts = j.registros.map(r => {
      const x = 10 + ((r.lng - c) + (span - (d - c)) / 2) / span * 60;
      const y = 70 - ((r.lat - a) + (span - (b - a)) / 2) / span * 60;
      return '<circle cx="' + x.toFixed(1) + '" cy="' + y.toFixed(1) + '" r="3.2"/>';
    }).join('');
    return '<svg class="jornada-mini" viewBox="0 0 80 80" aria-hidden="true"><rect width="80" height="80" rx="8"/>' + pts + '</svg>';
  },

  /* ---------- Revisión de una jornada ---------- */

  mostrarDetalle(ver) {
    this.el('jornadas-lista-caja').hidden = ver;
    this.el('jornada-detalle').hidden = !ver;
  },

  async abrir(clave) {
    await this.pintarLista(true);
    const j = this.lista.find(x => x.clave === clave);
    if (!j) { this.cerrar(); return; }
    this.actual = clave;
    this.jornada = j;
    this.mostrarDetalle(true);
    await this.pintarDetalle(true);
    this.el('jornada-titulo').focus({ preventScroll: true });
    window.scrollTo(0, 0);
  },

  async cerrar() {
    this.actual = null;
    this.jornada = null;
    this.mostrarDetalle(false);
    await this.pintarLista();
    this.el('titulo-jornadas').focus({ preventScroll: true });
  },

  async pintarDetalle(encuadrar) {
    const j = this.jornada;
    const esc = SRP.util.escapar;
    const u = SRP.sesion.usuario;
    const cierre = await this.cierreDe(j);
    this.cierre = cierre;
    const avisos = this.avisos(j);
    this.avisosActuales = avisos;
    const revisados = (cierre && cierre.puntos_revisados) || [];
    const regs = j.registros;
    const h = r => SRP.envio.hora(r.fecha_registro);

    this.el('jornada-titulo').textContent = this.nombreSitio(j, cierre) + (j.partes > 1 ? ' (sitio ' + j.parte + ' de ' + j.partes + ')' : '');
    this.el('jornada-sub').textContent = SRP.envio.diaEnLetra(j.fecha) + ' · ' + SRP.util.formatearFecha(j.fecha) + ' · ' +
      SRP.ref.nombreUsuario(j.cabo_id) + ' · ' + h(regs[0]) + (regs.length > 1 ? '–' + h(regs[regs.length - 1]) : '') +
      (this.alcaldiasDe(j).length ? ' · ' + this.alcaldiasDe(j).join(', ') : '');

    // Conciliación: se compara con todo lo del día del cabo, aunque se haya partido en sitios
    const inp = this.el('jornada-sembrados');
    if (document.activeElement !== inp) inp.value = cierre && Number.isInteger(cierre.arboles_sembrados) ? cierre.arboles_sembrados : '';
    this.el('jornada-registrados').textContent = j.totalDia;
    this.el('jornada-registrados-etiqueta').textContent = j.partes > 1 ? 'Registrados en el día (' + j.partes + ' sitios)' : 'Registrados en el sistema';
    this.pintarConciliacion();

    const puedeEditar = r => SRP.permisos.puedeEditar(u, r, SRP.ref.usuarioPorId);
    const puedeEliminar = r => SRP.permisos.puedeEliminar(u, r, SRP.ref.usuarioPorId);
    this.el('jornada-lista').innerHTML = regs.map((r, i) => {
      const esp = SRP.ref.especieDe(r);
      const av = avisos[r.id] || [];
      const revisado = av.length && revisados.includes(r.id);
      const tono = !av.length || revisado ? '' : av.some(a => a.tipo === 'lejos') ? 'err' : 'rev';
      const detalle = av.length
        ? av.map(a => '<span class="aviso-punto" data-tono="' + (revisado ? 'ok' : tono) + '">' + esc(a.texto) + '</span>').join('') +
          (revisado ? '<span class="aviso-punto" data-tono="ok">Revisado</span>' : '')
        : (r.punto_origen === 'gps' && r.gps_precision_m ? 'GPS ±' + Math.round(r.gps_precision_m) + ' m' : SRP.mapa.textoOrigen(r.punto_origen, r.gps_precision_m));
      const acciones = ['<button type="button" class="btn btn-texto" data-accion="ver" data-id="' + r.id + '">Ver</button>'];
      if (av.length && !revisado && puedeEditar(r)) acciones.push('<button type="button" class="btn btn-texto" data-accion="bien" data-id="' + r.id + '">Está bien</button>');
      if (av.some(a => a.tipo === 'duplicado') && !revisado && puedeEliminar(r)) acciones.push('<button type="button" class="btn btn-texto btn-texto-peligro" data-accion="eliminar" data-id="' + r.id + '">Eliminar</button>');
      return '<li class="punto-jornada" data-id="' + r.id + '"><span class="punto-num" data-tono="' + tono + '" aria-hidden="true">' + (i + 1) + '</span>' +
        '<div class="punto-datos"><span class="punto-especie"><span class="oculto-visual">Punto ' + (i + 1) + ': </span>' + esc(esp.comun) + '</span>' +
        '<span class="punto-detalle">' + esc(h(r)) + ' · ' + detalle + '</span></div>' +
        '<div class="punto-acciones">' + acciones.join('') + '</div></li>';
    }).join('');

    const p = SRP.permisos.de(u);
    // Registrar faltante sólo en la jornada propia: el registro nuevo queda a nombre de quien entra
    this.el('btn-jornada-faltante').hidden = !(p.registrar && j.cabo_id === u.id);
    this.pintarMapa(avisos, revisados, encuadrar);
  },

  pintarConciliacion() {
    const j = this.jornada;
    const v = this.el('jornada-sembrados').value;
    const sembrados = v === '' ? null : Number(v);
    const reg = j.totalDia;
    const pend = this.pendientes(j, this.avisosActuales || {}, this.cierre).length;
    const caja = this.el('jornada-conciliacion');
    const res = this.el('jornada-resultado');
    const cola = pend ? ' Quedan ' + (pend === 1 ? '1 punto' : pend + ' puntos') + ' por revisar.' : '';
    let tono, texto;
    if (sembrados === null || !Number.isInteger(sembrados)) {
      tono = 'neutro'; texto = 'Escriba cuántos árboles sembró la cuadrilla para comprobar que cada uno tenga su punto.' + cola;
    } else if (sembrados === reg) {
      tono = pend ? 'rev' : 'ok'; texto = 'Cuadra: ' + sembrados + ' sembrados y ' + reg + ' registrados.' + cola;
    } else if (sembrados > reg) {
      const n = sembrados - reg;
      tono = 'err'; texto = (n === 1 ? 'Falta 1 registro' : 'Faltan ' + n + ' registros') + ': se sembraron ' + sembrados + ' y hay ' + reg + ' puntos.' + cola;
    } else {
      const n = reg - sembrados;
      tono = 'err'; texto = (n === 1 ? 'Sobra 1 registro' : 'Sobran ' + n + ' registros') + ': se sembraron ' + sembrados + ' y hay ' + reg + ' puntos. Busque duplicados en el mapa.' + cola;
    }
    caja.dataset.tono = tono;
    res.textContent = texto;
  },

  /* Mapa de la jornada: Leaflet con los puntos numerados. Se crea una vez y se reutiliza. Sin
     señal no hay imagen de fondo, pero los puntos, su orden y la lista funcionan igual. */
  pintarMapa(avisos, revisados, encuadrar) {
    if (typeof L === 'undefined') return;
    const c = SRP.CONFIG.MAPA;
    if (!this.mapa) {
      this.mapa = L.map('jornada-mapa', { center: c.CENTRO, zoom: c.ZOOM_INICIAL, minZoom: c.ZOOM_MIN, maxZoom: c.ZOOM_MAX,
        maxBounds: c.LIMITES, maxBoundsViscosity: 1, gestureHandling: true });
      this.mapa.attributionControl.setPrefix('<a href="https://leafletjs.com" target="_blank" rel="noopener">Leaflet</a>');
      c.CAPAS.forEach(capa => L.tileLayer(capa.url, { attribution: capa.atribucion, maxZoom: c.ZOOM_MAX }).addTo(this.mapa));
      this.capaPuntos = L.layerGroup().addTo(this.mapa);
    }
    this.capaPuntos.clearLayers();
    this.marcadores = {};
    const regs = this.jornada.registros;
    regs.forEach((r, i) => {
      const av = avisos[r.id] || [];
      const tono = !av.length || revisados.includes(r.id) ? '' : av.some(a => a.tipo === 'lejos') ? 'err' : 'rev';
      const icono = L.divIcon({ className: 'pin-num', html: '<span data-tono="' + tono + '">' + (i + 1) + '</span>', iconSize: [26, 26], iconAnchor: [13, 13] });
      const m = L.marker([r.lat, r.lng], { icon: icono, title: 'Punto ' + (i + 1) + ': ' + SRP.ref.especieDe(r).comun, riseOnHover: true })
        .on('click', () => this.seleccionar(r.id, 'mapa'));
      m.addTo(this.capaPuntos);
      this.marcadores[r.id] = m;
    });
    setTimeout(() => {
      this.mapa.invalidateSize();
      if (encuadrar && regs.length) {
        if (regs.length === 1) this.mapa.setView([regs[0].lat, regs[0].lng], c.ZOOM_PUNTO);
        else this.mapa.fitBounds(L.latLngBounds(regs.map(r => [r.lat, r.lng])), { padding: [28, 28], maxZoom: c.ZOOM_MAX - 1 });
      }
    }, 60);
  },

  // Un punto elegido se marca en el mapa y en la lista, venga de donde venga el toque
  seleccionar(id, desde) {
    this.el('jornada-lista').querySelectorAll('.punto-jornada').forEach(li => li.classList.toggle('elegido', li.dataset.id === id));
    Object.entries(this.marcadores).forEach(([k, m]) => { const e = m.getElement(); if (e) e.classList.toggle('elegido', k === id); });
    const li = this.el('jornada-lista').querySelector('[data-id="' + id + '"]');
    if (desde === 'mapa' && li) li.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    if (desde === 'lista' && this.marcadores[id]) this.mapa.panTo(this.marcadores[id].getLatLng());
  },

  async alTocarLista(e) {
    const b = e.target.closest('button[data-accion]');
    const li = e.target.closest('.punto-jornada');
    if (!li) return;
    const r = this.jornada.registros.find(x => x.id === li.dataset.id);
    if (!b) { this.seleccionar(li.dataset.id, 'lista'); return; }
    if (b.dataset.accion === 'ver') { this.volverAlDetalle = true; SRP.registros.verDetalle(r); }
    if (b.dataset.accion === 'bien') await this.marcarRevisado(r);
    if (b.dataset.accion === 'eliminar') { this.volverAlDetalle = true; await SRP.registros.eliminar(r); }
  },

  /* ---------- Lo que se guarda en el cierre del día ---------- */

  async guardarEnCierre(cambios, detalle) {
    const j = this.jornada;
    const u = SRP.sesion.usuario;
    const previo = await this.cierreDe(j);
    const ahora = SRP.util.ahoraISO();
    const base = previo || Object.assign({
      id: this.claveCierre(j), es_ficticio: SRP.CONFIG.ES_FICTICIO, fecha: j.fecha, cabo_id: j.cabo_id,
      encargado_id: j.cabo_id, creado_por_id: u.id, fecha_creacion: ahora, arboles_sembrados: null, puntos_revisados: []
    }, Object.fromEntries(SRP.reportes.CAMPOS.map(k => [k, ''])));
    const cierre = Object.assign({}, base, cambios, { editado_por_id: u.id, fecha_ultima_edicion: ahora });
    await SRP.almacen.guardarConBitacora('cierres', cierre, SRP.bitacora.entrada(previo ? 'EDITADO' : 'CREADO', 'cierre', cierre.id, detalle));
    return cierre;
  },

  async guardarConteo() {
    const inp = this.el('jornada-sembrados');
    const v = inp.value.trim();
    const n = v === '' ? null : Number(v);
    if (n !== null && (!Number.isInteger(n) || n < 0 || n > 9999)) {
      SRP.util.anunciar('Escriba un número entero de árboles, sin decimales.', 'alerta');
      inp.value = this.cierre && Number.isInteger(this.cierre.arboles_sembrados) ? this.cierre.arboles_sembrados : '';
      return;
    }
    this.cierre = await this.guardarEnCierre({ arboles_sembrados: n },
      n === null ? 'Se borró el conteo de la jornada' : 'Conteo de la jornada: ' + n + (n === 1 ? ' árbol sembrado' : ' árboles sembrados'));
    this.pintarConciliacion();
    SRP.util.anunciarSilencioso('Conteo guardado.');
  },

  async marcarRevisado(r) {
    const prev = (this.cierre && this.cierre.puntos_revisados) || [];
    const num = this.jornada.registros.indexOf(r) + 1;
    await this.guardarEnCierre({ puntos_revisados: prev.concat(r.id) }, 'Punto ' + num + ' revisado: está bien');
    SRP.util.anunciar('Punto ' + num + ' marcado como revisado.', 'exito', { deshacer: async () => {
      await this.guardarEnCierre({ puntos_revisados: prev }, 'Se deshizo la revisión del punto ' + num);
      await this.refrescar();
    } });
    await this.pintarDetalle(false);
  },

  // Después de eliminar, restaurar o editar desde esta vista
  async refrescar() {
    if (SRP.app.vista !== 'jornadas') return;
    if (!this.actual) { await this.pintarLista(); return; }
    await this.pintarLista(true);
    const j = this.lista.find(x => x.clave === this.actual);
    if (!j) { await this.cerrar(); return; }
    this.jornada = j;
    await this.pintarDetalle(false);
  },

  /* ---------- Salidas ---------- */

  registrarFaltante() {
    const fecha = this.jornada.fecha;
    this.volverAlDetalle = false;
    SRP.formulario.limpiar();
    SRP.app.mostrarVista('registrar');
    this.el('campo-fecha').value = fecha;
    SRP.util.anunciar('Registre el árbol que falta. La fecha de la jornada ya está puesta.');
  },

  irAlReporte() {
    const j = this.jornada;
    this.el('pdf-dia').value = j.fecha;
    SRP.reportes.caboPedido = j.cabo_id;
    SRP.app.mostrarVista('reportes');
  }
};
