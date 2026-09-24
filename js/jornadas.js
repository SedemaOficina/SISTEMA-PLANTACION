/* JORNADAS: MAPA Y LISTA DE LO REGISTRADO EN UNA JORNADA (D112).

   PARA QUÉ. Al cierre, la cuadrilla necesita comprobar que cada árbol plantado tenga su punto
   («si plantaron 10, que haya 10») y corregir lo que salió mal. Esta vista junta los registros de
   una jornada en un mapa con puntos numerados en el orden en que se registraron y, debajo, la
   misma lista con el mismo número.

   QUÉ ES UNA JORNADA (D119). Se declara antes de registrar (js/jornada-activa.js): nombre, fecha
   y comentarios, de un cabo. Cada árbol nace con su `jornada_id`. Aquí las jornadas se leen de
   la tabla `jornadas` y se les cuelgan sus registros; una jornada abierta sin árboles también se
   ve. El número «Jornada 2 de 3» es el orden del día del cabo por hora de inicio. Un árbol que
   quedó en la jornada equivocada se mueve desde la tuerca del punto («Mover a otra jornada»).
   La conciliación, los puntos revisados y los datos de cierre del reporte viven en la jornada.

   CONCILIACIÓN. Se escribe cuántos árboles plantó la cuadrilla; el sistema lo compara con los
   registros y dice si cuadra, si faltan o si sobran. El número se guarda en el cierre del día
   (`arboles_plantados`) y sale en el reporte.

   AVISOS (sin inventar errores: son para revisar, no se corrigen solos):
     duplicado   misma especie a menos de DUPLICADO_M de otro punto de la jornada
     lejos       a más de FUERA_M de la mediana de los demás puntos (con 3 o más puntos)
     precisión   GPS peor que PRECISION_ACEPTABLE_M al registrar
   «Está bien» marca el punto como revisado (`puntos_revisados` del cierre) y deja de contarse. */
window.SRP = window.SRP || {};

SRP.jornadas = {
  /* Filtros (D128): «Un día» gana sobre año/mes; el rango Desde/Hasta limpia a los tres.
     Año, mes y cabo viven plegados en «Más filtros». Al entrar se ven todas. */
  filtro: { dia: '', desde: '', hasta: '', anio: '', mes: '', cabo: '' },
  diaAbierto: false,
  periodoAbierto: false,
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
      const f = this.filtro;
      f.dia = this.el('jornada-dia').value; f.anio = ''; f.mes = ''; f.desde = ''; f.hasta = '';
      this.diaAbierto = true; this.periodoAbierto = false;
      this.pintarLista();
    });
    // Desde y Hasta entran con «Aplicar», como en Registros (D82)
    this.el('btn-jornada-filtrar').innerHTML = SRP.ICONOS.svg('buscar') + '<span>Aplicar</span>';
    this.el('btn-jornada-filtrar').addEventListener('click', () => {
      const desde = this.el('jornada-desde').value, hasta = this.el('jornada-hasta').value;
      if (desde && hasta && desde > hasta) { SRP.util.anunciar('La fecha «Desde» es posterior a «Hasta». Corrija el rango.', 'alerta'); return; }
      const f = this.filtro;
      f.desde = desde; f.hasta = hasta;
      if (desde || hasta) { f.dia = ''; f.anio = ''; f.mes = ''; }
      this.pintarLista();
    });
    this.el('jornada-anio').addEventListener('change', () => {
      const f = this.filtro;
      f.anio = this.el('jornada-anio').value; f.mes = ''; f.dia = ''; f.desde = ''; f.hasta = '';
      this.diaAbierto = false; this.periodoAbierto = false;
      this.llenarMeses();
      this.pintarLista();
    });
    this.el('jornada-mes').addEventListener('change', () => {
      const f = this.filtro;
      f.mes = this.el('jornada-mes').value; f.dia = ''; f.desde = ''; f.hasta = '';
      if (f.mes && !f.anio) { f.anio = this.aniosDisponibles()[0] || String(new Date().getFullYear()); this.el('jornada-anio').value = f.anio; }
      this.diaAbierto = false; this.periodoAbierto = false;
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
    this.el('jornada-plantados').addEventListener('change', () => this.guardarConteo());
    this.el('jornada-lista').addEventListener('click', (e) => this.alTocarLista(e));
    this.el('btn-jornada-faltante').addEventListener('click', () => this.registrarFaltante());
    this.el('btn-jornada-reporte').addEventListener('click', () => this.irAlReporte());
    this.el('btn-jornada-faltante').innerHTML = SRP.ICONOS.svg('mas', 20) + '<span>Registrar faltante</span>';
    this.el('btn-jornada-reporte').innerHTML = SRP.ICONOS.svg('reportes', 20) + '<span>Reporte de la jornada</span>';
    this.el('btn-mover-cerrar').addEventListener('click', () => this.el('dlg-mover-jornada').close());
    this.el('lista-mover-jornadas').addEventListener('click', async (e) => {
      const b = e.target.closest('button[data-id]'); if (!b || !this.moviendo) return;
      const destino = await SRP.almacen.uno('jornadas', b.dataset.id);
      this.el('dlg-mover-jornada').close();
      if (destino) await this.mover(this.moviendo, destino);
    });
    this.el('btn-jornada-estado').addEventListener('click', async () => {
      const j = await this.cierreDe(this.jornada); if (!j) return;
      if (j.estatus === 'abierta') {
        const ok = await SRP.app.confirmar('¿Cerrar la jornada «' + j.nombre + '»? Se puede reabrir después.', 'Cerrar jornada', 'candado');
        if (!ok) return;
        await SRP.activa.cambiarEstatus(j, 'cerrada');
        if (SRP.activa.jornada && SRP.activa.jornada.id === j.id) SRP.activa.jornada = null;
      } else await SRP.activa.reabrir(j);
      await this.refrescar();
    });
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

  /* Las jornadas que alcanza quien entró, con sus registros (D119). Se devuelven en orden: fecha
     más reciente primero, luego cabo, luego hora de inicio. `n` y `total` numeran las del mismo
     día y cabo. */
  async jornadasAlcance() {
    const u = SRP.sesion.usuario;
    const todas = (await SRP.almacen.todos('jornadas')).filter(j => SRP.permisos.alcanza(u, j, SRP.ref.usuarioPorId));
    const regs = await this.registrosAlcance();
    const porJornada = {};
    regs.forEach(r => { (porJornada[r.jornada_id] = porJornada[r.jornada_id] || []).push(r); });
    const salida = todas.map(d => ({
      clave: d.id, id: d.id, fecha: d.fecha, cabo_id: d.cabo_id, nombre: d.nombre, comentarios: d.comentarios || '',
      estatus: d.estatus, fecha_inicio: d.fecha_inicio, dato: d,
      registros: (porJornada[d.id] || []).sort((a, b) => a.fecha_registro.localeCompare(b.fecha_registro))
    }));
    // Numeración dentro del día y cabo, por hora de inicio
    const grupos = {};
    salida.forEach(j => { const k = j.fecha + '|' + j.cabo_id; (grupos[k] = grupos[k] || []).push(j); });
    Object.values(grupos).forEach(g => {
      g.sort((a, b) => String(a.fecha_inicio).localeCompare(String(b.fecha_inicio)));
      g.forEach((j, i) => { j.n = i + 1; j.total = g.length; });
    });
    return salida.sort((a, b) => b.fecha.localeCompare(a.fecha) ||
      SRP.ref.nombreUsuario(a.cabo_id).localeCompare(SRP.ref.nombreUsuario(b.cabo_id), 'es') || a.n - b.n);
  },

  // Las jornadas de un día y un cabo, en orden (para Reportes)
  async jornadasDe(fecha, caboId) {
    return (await this.jornadasAlcance()).filter(j => j.fecha === fecha && j.cabo_id === caboId).sort((a, b) => a.n - b.n);
  },

  // El registro de la jornada, fresco (guarda conteo, revisados y cierre)
  async cierreDe(j) { return (await SRP.almacen.uno('jornadas', j.id)) || j.dato || null; },

  nombreSitio(j) { return j.nombre || 'Sin nombre'; },

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
    const plantados = cierre && Number.isInteger(cierre.arboles_plantados) ? cierre.arboles_plantados : null;
    const reg = j.registros.length;
    if (pend) return { tono: 'rev', texto: pend === 1 ? '1 punto por revisar' : pend + ' puntos por revisar' };
    if (j.estatus === 'abierta' && plantados === null) return { tono: 'neutro', texto: reg ? 'Abierta' : 'Abierta, sin árboles' };
    if (plantados === null) return { tono: 'neutro', texto: 'Sin conteo de la cuadrilla' };
    if (plantados === reg) return { tono: 'ok', texto: 'Revisada: ' + reg + ' de ' + plantados };
    return { tono: 'err', texto: 'Contados ' + plantados + ' · registrados ' + reg };
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
      // Si el filtro la deja fuera (es de otro día o de otro cabo), el filtro se ajusta a ella:
      // «Cerrar jornada» siempre debe llegar a la ficha de esa jornada (D125)
      if (!this.lista.some(j => j.clave === this.actual)) {
        const j = await SRP.almacen.uno('jornadas', this.actual);
        if (j) {
          Object.assign(this.filtro, { dia: j.fecha, desde: '', hasta: '', anio: '', mes: '' }); this.periodoAbierto = false;
          if (j.fecha === SRP.util.fechaHoy()) { this.diaAbierto = false; this.el('jornada-dia').value = ''; }
          else { this.diaAbierto = true; this.el('jornada-dia').value = j.fecha; }
          if (this.filtro.cabo && this.filtro.cabo !== j.cabo_id) { this.filtro.cabo = ''; if (this.el('jornada-cabo')) this.el('jornada-cabo').value = ''; }
          await this.pintarLista(true);
        }
      }
      if (this.lista.some(j => j.clave === this.actual)) { await this.abrir(this.actual); return; }
    }
    this.actual = null;
    this.mostrarDetalle(false);
    await this.pintarLista();
  },

  aplicarAtajo(atajo) {
    const f = this.filtro;
    const limpiarFechas = () => { f.dia = ''; f.desde = ''; f.hasta = ''; f.anio = ''; f.mes = ''; this.el('jornada-dia').value = ''; this.el('jornada-desde').value = ''; this.el('jornada-hasta').value = ''; };
    if (atajo === 'hoy') { limpiarFechas(); f.dia = SRP.util.fechaHoy(); this.diaAbierto = false; this.periodoAbierto = false; }
    if (atajo === 'todas') { limpiarFechas(); this.diaAbierto = false; this.periodoAbierto = false; }
    // «Un día» y «Un periodo» sólo abren su fecha; filtran al elegirla (D113) o con «Aplicar» (D82)
    if (atajo === 'dia') { this.diaAbierto = true; this.periodoAbierto = false; f.desde = ''; f.hasta = ''; f.dia = this.el('jornada-dia').value; if (f.dia) { f.anio = ''; f.mes = ''; } }
    if (atajo === 'periodo') { this.periodoAbierto = true; this.diaAbierto = false; }
    this.pintarLista();
  },

  sincronizarAtajos() {
    const f = this.filtro;
    const activo = { hoy: !this.diaAbierto && !this.periodoAbierto && f.dia === SRP.util.fechaHoy(), dia: this.diaAbierto, periodo: this.periodoAbierto,
      todas: !this.diaAbierto && !this.periodoAbierto && !f.dia && !f.desde && !f.hasta && !f.anio && !f.mes };
    this.el('jornada-atajos').querySelectorAll('.chip').forEach(c => c.setAttribute('aria-pressed', String(!!activo[c.dataset.atajo])));
    this.el('jornada-un-dia').hidden = !this.diaAbierto;
    this.el('jornada-periodo').hidden = !this.periodoAbierto;
    this.el('jornada-atajos').querySelector('[data-atajo="dia"]').setAttribute('aria-expanded', String(this.diaAbierto));
    this.el('jornada-atajos').querySelector('[data-atajo="periodo"]').setAttribute('aria-expanded', String(this.periodoAbierto));
    this.el('jornada-anio').value = f.anio; this.el('jornada-mes').value = f.mes;
    // El resumen del acordeón dice qué hay elegido dentro, aunque esté plegado
    const dentro = [f.anio ? (f.mes ? SRP.util.nombreMes(f.anio + '-' + f.mes, true) + ' ' + f.anio : f.anio) : '', f.cabo ? SRP.ref.nombreUsuario(f.cabo) : ''].filter(Boolean);
    this.el('jornada-mas-filtros-texto').textContent = dentro.length ? 'Más filtros: ' + dentro.join(' · ') : 'Más filtros: año, mes' + (this.el('caja-jornada-cabo').hidden ? '' : ' y cabo');
  },

  aniosDisponibles() { return [...new Set(this._todas.map(j => j.fecha.slice(0, 4)))].sort().reverse(); },

  llenarAnios() {
    const anios = this.aniosDisponibles();
    const actual = String(new Date().getFullYear());
    if (!anios.includes(actual)) anios.unshift(actual);
    this.el('jornada-anio').innerHTML = '<option value="">Todos</option>' + anios.map(a => '<option value="' + a + '">' + a + '</option>').join('');
    this.el('jornada-anio').value = this.filtro.anio;
  },

  llenarMeses() {
    const anio = this.filtro.anio;
    const meses = anio ? [...new Set(this._todas.filter(j => j.fecha.startsWith(anio)).map(j => j.fecha.slice(5, 7)))].sort() : [];
    const sel = this.el('jornada-mes');
    sel.innerHTML = '<option value="">Todos</option>' + meses.map(m => '<option value="' + m + '">' + SRP.util.nombreMes('2000-' + m, true) + '</option>').join('');
    sel.disabled = !anio;
    if (!meses.includes(this.filtro.mes)) this.filtro.mes = '';
    sel.value = this.filtro.mes;
  },

  cumpleFiltro(j) {
    const f = this.filtro;
    if (f.cabo && j.cabo_id !== f.cabo) return false;
    if (f.dia) return j.fecha === f.dia;
    if (f.desde && j.fecha < f.desde) return false;
    if (f.hasta && j.fecha > f.hasta) return false;
    if (f.anio && !j.fecha.startsWith(f.anio)) return false;
    if (f.mes && j.fecha.slice(5, 7) !== f.mes) return false;
    return true;
  },

  // «Hoy» / «Ayer» delante de la fecha, cuando aplica
  cuando(fecha) {
    const hoy = SRP.util.fechaHoy();
    if (fecha === hoy) return 'Hoy';
    const ayer = new Date(hoy + 'T12:00:00'); ayer.setDate(ayer.getDate() - 1);
    const a = ayer.getFullYear() + '-' + String(ayer.getMonth() + 1).padStart(2, '0') + '-' + String(ayer.getDate()).padStart(2, '0');
    return fecha === a ? 'Ayer' : '';
  },

  // Dónde: alcaldía y colonia de la jornada si se detectaron al iniciarla; si no, las de sus árboles
  lugarDe(j) {
    const d = j.dato || {};
    if (d.alcaldia || d.colonia) return [d.alcaldia || '', d.colonia ? 'Col. ' + d.colonia : ''].filter(Boolean).join(' · ');
    const alc = this.alcaldiasDe(j);
    const cols = [...new Set(j.registros.map(r => r.colonia).filter(Boolean))];
    return [alc.join(', '), cols.length === 1 ? 'Col. ' + cols[0] : ''].filter(Boolean).join(' · ');
  },

  async pintarLista(soloDatos) {
    const f = this.filtro;
    this._todas = await this.jornadasAlcance();
    this.llenarAnios(); this.llenarMeses();
    this.sincronizarAtajos();
    this.lista = this._todas.filter(j => this.cumpleFiltro(j));
    if (soloDatos) return;
    const u = SRP.sesion.usuario;
    const variosAutores = SRP.permisos.de(u).alcance !== 'propios';
    const esc = SRP.util.escapar;
    const html = [];
    let arbolesTotal = 0;
    for (const j of this.lista) {
      const cierre = await this.cierreDe(j);
      const avisos = this.avisos(j);
      const est = this.estado(j, avisos, cierre);
      const n = j.registros.length; arbolesTotal += n;
      const especies = new Set(j.registros.map(r => this.claveEspecie(r))).size;
      const porRevisar = this.pendientes(j, avisos, cierre).length;
      const bien = n - porRevisar;
      const cuando = this.cuando(j.fecha);
      const fecha = SRP.envio.diaEnLetra(j.fecha).split(' ')[0].slice(0, 3) + ' ' + SRP.util.formatearFecha(j.fecha);
      const abierta = j.estatus === 'abierta';
      const lugar = this.lugarDe(j);
      const ubic = (j.dato && j.dato.ubicacion) || '';
      const cifra = (v, t) => '<span class="jornada-cifra" data-cero="' + (v === 0) + '"><b>' + v + '</b> ' + t + '</span>';
      // Orden de la ficha (D128): nombre → cuándo → estado → dónde → cuánto → quién
      html.push('<li class="jornada" data-clave="' + esc(j.clave) + '"><button type="button" class="jornada-boton" aria-label="Revisar la jornada ' +
        esc(this.nombreSitio(j)) + ' del ' + esc(SRP.util.formatearFecha(j.fecha)) + ', ' + (abierta ? 'abierta' : 'cerrada') + ', ' + n + (n === 1 ? ' árbol' : ' árboles') + ', ' + esc(est.texto) + '">' +
        '<span class="jornada-cab"><span class="jornada-titulo-caja"><span class="jornada-sitio">' + esc(this.nombreSitio(j)) + '</span>' +
        '<span class="jornada-dia">' + (cuando ? '<b>' + cuando + '</b> · ' : '') + '<span class="jornada-fecha">' + esc(fecha) + '</span>' +
        (j.total > 1 ? ' <span class="jornada-ndn">Jornada ' + j.n + ' de ' + j.total + '</span>' : '') + '</span></span>' + this.miniatura(j, avisos) + '</span>' +
        '<span class="jornada-estado"><span class="jornada-estatus" data-estatus="' + (abierta ? 'abierta' : 'cerrada') + '">' + SRP.ICONOS.svg(abierta ? 'jornadas' : 'candado', 14) +
        '<span>' + (abierta ? 'Abierta' : 'Cerrada') + '</span></span>' +
        '<span class="insignia-jornada" data-tono="' + est.tono + '">' + esc(est.texto) + '</span></span>' +
        (lugar || ubic ? '<span class="jornada-lugar">' + SRP.ICONOS.svg('ubicacion', 16) + '<span>' + esc(lugar) + (ubic ? (lugar ? ' · ' : '') + '<span class="jornada-ubic">' + esc(ubic) + '</span>' : '') + '</span></span>' : '') +
        '<span class="jornada-cifras">' + cifra(n, n === 1 ? 'árbol' : 'árboles') + cifra(especies, especies === 1 ? 'especie' : 'especies') + cifra(porRevisar, 'por revisar') + cifra(bien, 'bien') + '</span>' +
        (variosAutores ? '<span class="jornada-cabo">' + SRP.ICONOS.svg('usuario', 14) + '<span>' + esc(SRP.ref.nombreUsuario(j.cabo_id)) + '</span></span>' : '') +
        '</button></li>');
    }
    this.el('lista-jornadas').innerHTML = html.join('');
    const n = this.lista.length;
    this.el('jornadas-total').textContent = n ? n + (n === 1 ? ' jornada' : ' jornadas') + ' · ' + arbolesTotal + (arbolesTotal === 1 ? ' árbol' : ' árboles') : '';
    const vacio = this.el('jornadas-vacio');
    vacio.hidden = n > 0;
    if (!n) vacio.innerHTML = '<p><strong>' + (f.dia ? 'No hay jornadas del ' + esc(SRP.util.formatearFecha(f.dia)) + '.' : 'Todavía no hay jornadas.') + '</strong></p>' +
      '<p class="nota">Cada jornada que se inicie en Nuevo registro aparece aquí con su mapa.</p>';
  },

  // Miniatura: los puntos de la jornada en un cuadro, sin mapa de fondo (no pide nada a la red)
  miniatura(j, avisos) {
    avisos = avisos || {};
    if (!j.registros.length) return '<svg class="jornada-mini" viewBox="0 0 80 80" aria-hidden="true"><rect width="80" height="80" rx="8"/></svg>';
    const lats = j.registros.map(r => r.lat), lngs = j.registros.map(r => r.lng);
    const [a, b, c, d] = [Math.min(...lats), Math.max(...lats), Math.min(...lngs), Math.max(...lngs)];
    const span = Math.max(b - a, d - c, 0.0002);
    const pts = j.registros.map(r => {
      const x = 10 + ((r.lng - c) + (span - (d - c)) / 2) / span * 60;
      const y = 70 - ((r.lat - a) + (span - (b - a)) / 2) / span * 60;
      const tono = avisos[r.id] ? (avisos[r.id].some(a => a.tipo === 'lejos') ? 'err' : 'rev') : '';
      return '<circle cx="' + x.toFixed(1) + '" cy="' + y.toFixed(1) + '" r="3.2" data-tono="' + tono + '"/>';
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

    this.el('jornada-titulo').textContent = this.nombreSitio(j);
    this.el('jornada-sub').textContent = SRP.envio.diaEnLetra(j.fecha).split(' ')[0] + ' ' + SRP.util.formatearFecha(j.fecha) +
      (j.total > 1 ? ' · Jornada ' + j.n + ' de ' + j.total : '') + ' · ' +
      SRP.ref.nombreUsuario(j.cabo_id) + (regs.length ? ' · ' + h(regs[0]) + (regs.length > 1 ? '–' + h(regs[regs.length - 1]) : '') : '') +
      (this.alcaldiasDe(j).length ? ' · ' + this.alcaldiasDe(j).join(', ') : SRP.activa.lugarDe(cierre) ? ' · ' + SRP.activa.lugarDe(cierre) : '') +
      ' · ' + (cierre.estatus === 'abierta' ? 'abierta' : 'cerrada');
    this.el('jornada-comentarios').hidden = !cierre.comentarios;
    this.el('jornada-comentarios').textContent = cierre.comentarios || '';
    // Cerrar o reabrir la jornada desde su revisión (D119): quien registra en ella
    const propia = cierre.cabo_id === u.id;
    const btnEstado = this.el('btn-jornada-estado');
    btnEstado.hidden = !propia;
    // Cerrar no es aprobar: guinda con candado; reabrir es corregir: dorado con lápiz (D121)
    btnEstado.className = 'btn btn-chico ' + (cierre.estatus === 'abierta' ? 'btn-primario' : 'btn-editar');
    btnEstado.innerHTML = SRP.ICONOS.svg(cierre.estatus === 'abierta' ? 'candado' : 'lapiz', 18) + '<span>' + (cierre.estatus === 'abierta' ? 'Cerrar jornada' : 'Reabrir jornada') + '</span>';

    // Conciliación: se compara con todo lo del día del cabo, aunque se haya partido en sitios
    const inp = this.el('jornada-plantados');
    if (document.activeElement !== inp) inp.value = cierre && Number.isInteger(cierre.arboles_plantados) ? cierre.arboles_plantados : '';
    this.el('jornada-registrados').textContent = j.registros.length;
    this.el('jornada-registrados-etiqueta').textContent = 'Registrados en esta jornada';
    this.pintarConciliacion();

    const puedeEditar = r => SRP.permisos.puedeEditar(u, r, SRP.ref.usuarioPorId);
    const puedeEliminar = r => SRP.permisos.puedeEliminar(u, r, SRP.ref.usuarioPorId);
    this.el('jornada-lista').innerHTML = regs.map((r, i) => {
      const esp = SRP.ref.especieDe(r);
      const av = avisos[r.id] || [];
      const revisado = av.length && revisados.includes(r.id);
      const tono = !av.length || revisado ? '' : av.some(a => a.tipo === 'lejos') ? 'err' : 'rev';
      const detalle = (av.length
        ? av.map(a => '<span class="aviso-punto" data-tono="' + (revisado ? 'ok' : tono) + '">' + esc(a.texto) + '</span>').join('') +
          (revisado ? '<span class="aviso-punto" data-tono="ok">Revisado</span>' : '')
        : (r.punto_origen === 'gps' && r.gps_precision_m ? 'GPS ±' + Math.round(r.gps_precision_m) + ' m' : SRP.mapa.textoOrigen(r.punto_origen, r.gps_precision_m)));
      // Color por significado con icono (Norma 8.4, D116): ver neutro, confirmar verde, eliminar rojo
      const I = (n, t) => SRP.ICONOS.svg(n, t);   // no se pasa suelto: svg() usa this
      const acciones = ['<button type="button" class="btn btn-texto" data-accion="ver" data-id="' + r.id + '">' + I('ver', 18) + '<span>Ver</span></button>'];
      // Corregir el reparto en jornadas (D117): desde la tuerca, para no cargar la fila
      const items = [];
      if (puedeEditar(r)) items.push({ accion: 'mover', texto: 'Mover a otra jornada', icono: 'jornadas' });
      const tuerca = items.length ? SRP.ICONOS.menuAcciones(r.id, 'punto ' + (i + 1), items) : '';
      if (av.length && !revisado && puedeEditar(r)) acciones.push('<button type="button" class="btn btn-exito-linea" data-accion="bien" data-id="' + r.id + '">' + I('palomita', 16) + '<span>Está bien</span></button>');
      if (av.some(a => a.tipo === 'duplicado') && !revisado && puedeEliminar(r)) acciones.push('<button type="button" class="btn btn-peligro-linea" data-accion="eliminar" data-id="' + r.id + '">' + I('basura', 16) + '<span>Eliminar</span></button>');
      return '<li class="punto-jornada" data-id="' + r.id + '"><span class="punto-num" data-tono="' + tono + '" aria-hidden="true">' + (i + 1) + '</span>' +
        '<div class="punto-datos"><span class="punto-especie"><span class="oculto-visual">Punto ' + (i + 1) + ': </span>' + esc(esp.comun) + '</span>' +
        '<span class="punto-detalle">' + esc(h(r)) + ' · ' + detalle + '</span></div>' +
        '<div class="punto-acciones">' + acciones.join('') + tuerca + '</div></li>';
    }).join('');

    const p = SRP.permisos.de(u);
    // Registrar faltante sólo en la jornada propia: el registro nuevo queda a nombre de quien entra
    this.el('btn-jornada-faltante').hidden = !(p.registrar && cierre.cabo_id === u.id);
    this.pintarMapa(avisos, revisados, encuadrar);
  },

  pintarConciliacion() {
    const j = this.jornada;
    const v = this.el('jornada-plantados').value;
    const plantados = v === '' ? null : Number(v);
    const reg = j.registros.length;
    const pend = this.pendientes(j, this.avisosActuales || {}, this.cierre).length;
    const caja = this.el('jornada-conciliacion');
    const res = this.el('jornada-resultado');
    const cola = pend ? ' Quedan ' + (pend === 1 ? '1 punto' : pend + ' puntos') + ' por revisar.' : '';
    let tono, texto;
    if (plantados === null || !Number.isInteger(plantados)) {
      tono = 'neutro'; texto = 'Escriba cuántos árboles plantó la cuadrilla para comprobar que cada uno tenga su punto.' + cola;
    } else if (plantados === reg) {
      tono = pend ? 'rev' : 'ok'; texto = 'Cuadra: ' + plantados + ' plantados y ' + reg + ' registrados.' + cola;
    } else if (plantados > reg) {
      const n = plantados - reg;
      tono = 'err'; texto = (n === 1 ? 'Falta 1 registro' : 'Faltan ' + n + ' registros') + ': se plantaron ' + plantados + ' y hay ' + reg + ' puntos.' + cola;
    } else {
      const n = reg - plantados;
      tono = 'err'; texto = (n === 1 ? 'Sobra 1 registro' : 'Sobran ' + n + ' registros') + ': se plantaron ' + plantados + ' y hay ' + reg + ' puntos. Busque duplicados en el mapa.' + cola;
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
      /* Los árboles de una jornada están a pocos metros y al zoom máximo del proveedor (19) los
         pines se enciman. El mapa deja acercar hasta ZOOM_JORNADA escalando la imagen (D116). */
      this.mapa = L.map('jornada-mapa', { center: c.CENTRO, zoom: c.ZOOM_INICIAL, minZoom: c.ZOOM_MIN, maxZoom: c.ZOOM_JORNADA,
        maxBounds: c.LIMITES, maxBoundsViscosity: 1, gestureHandling: true });
      this.mapa.attributionControl.setPrefix('<a href="https://leafletjs.com" target="_blank" rel="noopener">Leaflet</a>');
      c.CAPAS.forEach(capa => L.tileLayer(capa.url, { attribution: capa.atribucion, maxZoom: c.ZOOM_JORNADA, maxNativeZoom: c.ZOOM_MAX }).addTo(this.mapa));
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
        else this.mapa.fitBounds(L.latLngBounds(regs.map(r => [r.lat, r.lng])), { padding: [28, 28], maxZoom: c.ZOOM_JORNADA - 1 });
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
    if (b.dataset.accion === 'mover') await this.abrirMover(r);
  },

  /* Mover un registro a otra jornada del mismo cabo (D119): el árbol hereda la fecha de la
     jornada destino y el cambio queda en su historial. */
  async abrirMover(r) {
    const jornadas = (await SRP.almacen.porIndice('jornadas', 'cabo_id', r.cabo_id))
      .filter(j => j.id !== r.jornada_id)
      .sort((a, b) => b.fecha.localeCompare(a.fecha) || String(b.fecha_inicio).localeCompare(String(a.fecha_inicio)));
    const esc = SRP.util.escapar;
    this.moviendo = r;
    this.el('dlg-mover-texto').textContent = 'Elija la jornada a la que pertenece el ' + SRP.ref.especieDe(r).comun + ' (punto ' + (this.jornada.registros.indexOf(r) + 1) + ').';
    this.el('lista-mover-jornadas').innerHTML = jornadas.length ? jornadas.map(j =>
      '<li><button type="button" class="jornada-boton" data-id="' + j.id + '"><span class="jornada-datos"><span class="jornada-dia">' + esc(j.nombre) + '</span>' +
      '<span class="jornada-cifras">' + esc(SRP.util.formatearFecha(j.fecha)) + ' · ' + (j.estatus === 'abierta' ? 'abierta' : 'cerrada') + '</span></span></button></li>').join('')
      : '<li class="nota">No hay otra jornada de este cabo. Inicie una en Nuevo registro.</li>';
    this.el('dlg-mover-jornada').showModal();
  },

  async mover(r, destino) {
    const u = SRP.sesion.usuario;
    const nuevo = Object.assign({}, r, { jornada_id: destino.id, fecha_plantacion: destino.fecha, fecha_ultima_edicion: SRP.util.ahoraISO(), editado_por_id: u.id });
    await SRP.almacen.guardarConBitacora('plantaciones', nuevo, SRP.bitacora.entrada('EDITADO', 'plantacion', r.id, 'Movido a la jornada «' + destino.nombre + '»'));
    if (SRP.envio.simulado()) { SRP.envio.marcarCambios(r.id); SRP.envio.enviar({ silencioso: true }); }
    SRP.util.anunciar('Movido a la jornada «' + destino.nombre + '».');
    await this.refrescar();
  },

  async guardarEnCierre(cambios, detalle) {
    const j = this.jornada;
    const u = SRP.sesion.usuario;
    const previo = await this.cierreDe(j);
    const ahora = SRP.util.ahoraISO();
    const dato = Object.assign({}, previo, cambios, { editado_por_id: u.id, fecha_ultima_edicion: ahora });
    await SRP.almacen.guardarConBitacora('jornadas', dato, SRP.bitacora.entrada('EDITADO', 'jornada', dato.id, detalle));
    j.dato = dato;
    return dato;
  },

  async guardarConteo() {
    const inp = this.el('jornada-plantados');
    const v = inp.value.trim();
    const n = v === '' ? null : Number(v);
    if (n !== null && (!Number.isInteger(n) || n < 0 || n > 9999)) {
      SRP.util.anunciar('Escriba un número entero de árboles, sin decimales.', 'alerta');
      inp.value = this.cierre && Number.isInteger(this.cierre.arboles_plantados) ? this.cierre.arboles_plantados : '';
      return;
    }
    this.cierre = await this.guardarEnCierre({ arboles_plantados: n },
      n === null ? 'Se borró el conteo de la jornada' : 'Conteo de la jornada: ' + n + (n === 1 ? ' árbol plantado' : ' árboles plantados'));
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

  async registrarFaltante() {
    const j = await this.cierreDe(this.jornada); if (!j) return;
    this.volverAlDetalle = false;
    if (j.estatus !== 'abierta') await SRP.activa.reabrir(j); else SRP.activa.jornada = j;
    SRP.formulario.limpiar();
    SRP.app.mostrarVista('registrar');
    SRP.util.anunciar('Registre el árbol que falta en la jornada «' + j.nombre + '».');
  },

  irAlReporte() {
    const j = this.jornada;
    this.el('pdf-dia').value = j.fecha;
    SRP.reportes.pedido = { cabo_id: j.cabo_id, id: j.id };
    SRP.app.mostrarVista('reportes');
  }
};
