/* SUPERVISIÓN Y «MI AVANCE» (D158). Lo que se ha plantado en un periodo, dicho con los indicadores de
   SRP.indicadores (D157): la coordinación ve su cuadrilla, la administración todo y el cabo lo suyo,
   con la misma pantalla. Para la coordinación y la administración es la primera sección al entrar
   y trae dentro las Fotografías; el cabo la encuentra al final de su barra como «Mi avance».
   Todo se calcula; nada se teclea. Los informes en PDF y CSV (D159) salen de este mismo modelo. */
window.SRP = window.SRP || {};

SRP.supervision = {
  periodo: null,
  filtros: { alcaldia: '', programa: '', cabo: '' },
  datos: null,
  modelo: null,
  mapa: null,
  usuarioId: null,

  el(id) { return document.getElementById(id); },
  esCabo() { return SRP.permisos.de(SRP.sesion.usuario).alcance === 'propios'; },
  titulo() { return this.esCabo() ? 'Mi avance' : 'Supervisión'; },

  iniciar() {
    const I = SRP.ICONOS;
    I.poner(this.el('sup-anterior'), 'anterior', 'medio');
    I.poner(this.el('sup-siguiente'), 'siguiente', 'medio');
    I.poner(this.el('btn-sup-fotos'), 'camara', 'medio');
    I.poner(this.el('btn-sup-pdf'), 'descargar', 'medio');
    I.poner(this.el('btn-sup-csv'), 'tabla', 'medio');
    this.el('sup-tipos').addEventListener('click', (e) => {
      const b = e.target.closest('.chip[data-tipo]'); if (!b) return;
      const t = b.dataset.tipo;
      if (t === 'rango') {
        const p = this.periodo;
        this.el('sup-desde').value = p.desde || SRP.util.fechaHoy();
        this.el('sup-hasta').value = p.hasta || SRP.util.fechaHoy();
        this.periodo = SRP.indicadores.periodo('rango', this.el('sup-desde').value, this.el('sup-hasta').value);
      } else {
        // Al cambiar de tipo, el periodo que contiene al que se estaba viendo (o hoy)
        const ref = this.periodo && this.periodo.desde && this.periodo.hasta < SRP.util.fechaHoy() ? this.periodo.hasta : SRP.util.fechaHoy();
        this.periodo = SRP.indicadores.periodo(t, ref);
      }
      this.pintar();
    });
    this.el('sup-anterior').addEventListener('click', () => { this.periodo = SRP.indicadores.mover(this.periodo, -1); this.pintar(); });
    this.el('sup-siguiente').addEventListener('click', () => { this.periodo = SRP.indicadores.mover(this.periodo, 1); this.pintar(); });
    this.el('form-sup-rango').addEventListener('submit', (e) => {
      e.preventDefault();
      const d = this.el('sup-desde').value, h = this.el('sup-hasta').value;
      if (!d || !h) { SRP.util.anunciar('Elija las dos fechas del rango.', 'alerta'); return; }
      this.periodo = SRP.indicadores.periodo('rango', d, h);
      this.pintar();
    });
    ['alcaldia', 'programa', 'cabo'].forEach(k => this.el('sup-' + k).addEventListener('change', () => { this.filtros[k] = this.el('sup-' + k).value; this.pintar(); }));
    this.el('btn-sup-quitar').addEventListener('click', () => {
      this.filtros = { alcaldia: '', programa: '', cabo: '' };
      ['alcaldia', 'programa', 'cabo'].forEach(k => { this.el('sup-' + k).value = ''; });
      this.pintar();
    });
    this.el('sup-cuerpo').addEventListener('click', (e) => this.alTocar(e));
    this.el('btn-sup-fotos').addEventListener('click', () => SRP.app.mostrarVista('galeria'));
    // Informes por periodo (D159): del mismo modelo que se ve
    this.el('btn-sup-pdf').addEventListener('click', () => SRP.informes.pdf(this.modelo));
    this.el('btn-sup-csv').addEventListener('click', () => SRP.informes.csv(this.modelo));

  },

  async preparar() {
    const u = SRP.sesion.usuario, cabo = this.esCabo();
    this.el('titulo-supervision').textContent = this.titulo();
    this.el('sup-nota').textContent = cabo
      ? 'Lo que usted ha plantado, por semana, mes o año. Cuentan sólo las jornadas cerradas; las abiertas se dicen aparte.'
      : 'Lo que se ha plantado en su ' + (SRP.permisos.de(u).alcance === 'todos' ? 'ciudad' : 'cuadrilla') + ', por semana, mes o año. Cuentan sólo las jornadas cerradas; las abiertas se dicen aparte.';
    this.el('btn-sup-fotos').hidden = !SRP.permisos.de(u).galeria;
    this.el('caja-sup-cabo').hidden = cabo;
    // Quien entra con otra cuenta empieza en la semana en curso y sin filtros: no hereda el año
    // ni la alcaldía que dejó la cuenta anterior en este mismo dispositivo (D160)
    if (this.usuarioId !== u.id) { this.usuarioId = u.id; this.periodo = null; this.filtros = { alcaldia: '', programa: '', cabo: '' }; }
    if (!this.periodo) this.periodo = SRP.indicadores.periodo('semana');
    this.datos = await SRP.indicadores.cargar();
    this.llenarFiltros();
    this.pintar();
  },

  llenarFiltros() {
    const alcaldias = (SRP.CAPAS && SRP.CAPAS.alcaldias ? SRP.CAPAS.alcaldias.geojson.features.map(f => f.properties.nombre) : []).sort((a, b) => a.localeCompare(b, 'es'));
    this.el('sup-alcaldia').innerHTML = SRP.util.opciones('Todas', alcaldias.map(a => [a, a]));
    this.el('sup-programa').innerHTML = SRP.util.opciones('Todos', SRP.ref.deTipo('programa').map(p => [p.id, p.nombre]));
    const cabos = SRP.util.paresPersonas(this.datos.cabos.concat(this.datos.jornadas.map(j => j.cabo_id)));
    this.el('sup-cabo').innerHTML = SRP.util.opciones('Todos', cabos);
    Object.keys(this.filtros).forEach(k => {
      const sel = this.el('sup-' + k);
      if (![...sel.options].some(o => o.value === this.filtros[k])) this.filtros[k] = '';
      sel.value = this.filtros[k];
    });
  },

  // El periodo y los filtros en pantalla; luego, el cuerpo con el modelo recién calculado
  pintar() {
    const p = this.periodo, I = SRP.indicadores;
    this.el('sup-tipos').querySelectorAll('.chip').forEach(c => c.setAttribute('aria-pressed', String(c.dataset.tipo === p.tipo)));
    this.el('sup-etiqueta').textContent = p.etiqueta;
    this.el('sup-anterior').hidden = p.tipo === 'todo';
    this.el('sup-siguiente').hidden = p.tipo === 'todo';
    this.el('sup-siguiente').disabled = !I.hayPosterior(p);
    this.el('form-sup-rango').hidden = p.tipo !== 'rango';
    const f = this.filtros;
    const dichos = [f.alcaldia, f.programa ? SRP.ref.nombreCatalogo(f.programa) : '', f.cabo ? SRP.ref.nombreUsuario(f.cabo) : ''].filter(Boolean);
    this.el('sup-filtros-texto').textContent = dichos.length ? 'Filtros: ' + dichos.join(' · ') : 'Filtros: alcaldía, programa' + (this.esCabo() ? '' : ' y cabo');
    this.el('btn-sup-quitar').hidden = !dichos.length;
    this.modelo = I.calcular(this.datos, p, f);
    this.el('sup-cuerpo').innerHTML = this.html(this.modelo);
    // Sin jornadas cerradas no hay informe que dar; sin árboles, no hay tabla
    this.el('btn-sup-pdf').disabled = !this.modelo.cifras.jornadas;
    this.el('btn-sup-csv').disabled = !this.modelo.cifras.arboles;
    this.pintarMapa();
  },

  /* ---------- El cuerpo ---------- */

  html(m) {
    const esc = SRP.util.escapar, c = m.cifras, cabo = this.esCabo();
    const num = n => n == null ? '—' : Number(n).toLocaleString('es-MX');
    const cifra = (valor, texto, sub) => '<div class="sup-cifra"><b>' + valor + '</b><span>' + texto + '</span>' + (sub ? '<small>' + sub + '</small>' : '') + '</div>';
    const apartado = (id, titulo, cuerpo) => '<section class="bloque sup-apartado" aria-labelledby="' + id + '"><h2 id="' + id + '" class="titulo-bloque">' + titulo + '</h2>' + cuerpo + '</section>';
    if (!c.arboles && !c.jornadas && !c.enCurso && !m.atender.length) {
      return '<div class="vacio">' + SRP.util.htmlVacio('avance', 'Sin jornadas cerradas en este periodo',
        cabo ? 'Cuando cierre una jornada, aquí verá cuántos árboles plantó.' : 'Cuando se cierren jornadas, aquí se verá cuánto se plantó.', []) + '</div>' + this.htmlAtender(m);
    }
    let h = '<div class="sup-cifras">' +
      cifra(num(c.arboles), c.arboles === 1 ? 'árbol plantado' : 'árboles plantados', 'en ' + num(c.jornadas) + (c.jornadas === 1 ? ' jornada cerrada' : ' jornadas cerradas')) +
      cifra(c.avance == null ? '—' : c.avance + ' %', 'de la meta', c.meta ? num(c.arbolesConMeta) + ' de ' + num(c.meta) : 'sin meta') +
      (cabo ? cifra(c.promedio == null ? '—' : String(c.promedio).replace('.', ','), 'árboles por jornada', '')
        : cifra(num(c.cabosActivos) + ' de ' + num(c.cabosAsignados), 'cabos trabajaron', c.promedio == null ? '' : String(c.promedio).replace('.', ',') + ' árboles por jornada')) +
      cifra(num(c.especies), c.especies === 1 ? 'especie' : 'especies', c.nativasPct == null ? '' : c.nativasPct + ' % nativas') +
      cifra(num(c.alcaldias), c.alcaldias === 1 ? 'alcaldía' : 'alcaldías', num(c.colonias) + (c.colonias === 1 ? ' colonia' : ' colonias')) +
      (c.enCurso ? cifra(num(c.enCurso), c.enCurso === 1 ? 'jornada en curso' : 'jornadas en curso', 'no se cuentan hasta cerrarse') : '') +
      '</div>';
    h += this.htmlAtender(m);
    h += apartado('sup-t-avance', 'Avance ' + { dia: 'por día', semana: 'por semana', mes: 'por mes', anio: 'por año' }[m.serie.unidad], this.htmlSerie(m.serie));
    if (!cabo && !m.filtros.cabo) {
      h += apartado('sup-t-cabos', 'Por cabo', '<div class="tabla-caja"><table class="tabla sup-tabla-cabos"><thead><tr><th>Cabo</th><th class="cifra">Jornadas</th><th class="cifra">Árboles</th><th class="cifra">Meta</th><th>Última</th><th>Pendientes</th></tr></thead><tbody>' +
        m.porCabo.map(x => {
          const pend = [x.abiertasViejas ? x.abiertasViejas + ' abierta' + (x.abiertasViejas === 1 ? '' : 's') + ' de antes' : '', x.sinRevisar ? x.sinRevisar + ' sin revisar' : '', x.sinReporte ? x.sinReporte + ' sin reporte' : '',
            x.eliminados ? x.eliminados + ' eliminado' + (x.eliminados === 1 ? '' : 's') : '', x.editados ? x.editados + ' editado' + (x.editados === 1 ? '' : 's') : ''].filter(Boolean).join(' · ');
          return '<tr><td data-etiqueta="Cabo"><button type="button" class="enlace-fila" data-cabo="' + esc(x.cabo_id) + '">' + esc(x.nombre) + '</button></td>' +
            '<td class="cifra" data-etiqueta="Jornadas">' + num(x.jornadas) + '</td><td class="cifra" data-etiqueta="Árboles">' + num(x.arboles) + '</td>' +
            '<td class="cifra" data-etiqueta="Meta">' + (x.avance == null ? '—' : x.avance + ' %') + '</td>' +
            '<td data-etiqueta="Última">' + (x.ultima ? esc(SRP.util.formatearFecha(x.ultima)) : 'Sin jornadas') + '</td>' +
            '<td data-etiqueta="Pendientes">' + (pend ? esc(pend) : 'Nada pendiente') + '</td></tr>';
        }).join('') + '</tbody></table></div>');
    }
    h += apartado('sup-t-alcaldias', m.filtros.alcaldia ? 'Colonias de ' + esc(m.filtros.alcaldia) : 'Por alcaldía',
      '<div class="sup-dos"><div><div id="sup-mapa" class="sup-mapa" role="img" aria-label="Mapa de la Ciudad de México con las alcaldías según los árboles plantados"></div>' +
      '<p class="nota sup-leyenda">Más intenso, más árboles. Toque una alcaldía para ver su cifra.</p></div><div>' +
      (m.filtros.alcaldia
        ? this.tabla(['Colonia', 'Árboles', 'Jornadas'], m.porColonia.map(x => [x.colonia, num(x.arboles), num(x.jornadas)]), [1, 2], 'colonias')
        : this.tabla(['Alcaldía', 'Árboles', 'Jornadas', 'Colonias'], m.porAlcaldia.map(x => [x.clave, num(x.arboles), num(x.jornadas), num(x.colonias)]), [1, 2, 3])) + '</div></div>');
    // En computadora, en dos columnas (D158)
    h += '<div class="sup-columnas">';
    h += apartado('sup-t-especies', 'Por especie', this.tabla(['Especie', 'Árboles', 'Distribución'],
      m.porEspecie.slice(0, 10).map(x => [{ html: esc(x.comun) + (x.cientifico ? '<small><i>' + esc(x.cientifico) + '</i></small>' : '') }, num(x.arboles), x.distribucion || '—']), [1]) +
      (m.porEspecie.length > 10 ? '<p class="nota">Las 10 más plantadas de ' + m.porEspecie.length + '. El informe las trae todas.</p>' : ''));
    h += apartado('sup-t-programas', 'Por programa', this.tabla(['Programa', 'Árboles', 'Jornadas'], m.porPrograma.map(x => [x.clave, num(x.arboles), num(x.jornadas)]), [1, 2]));
    const q = m.calidad;
    h += apartado('sup-t-calidad', 'Calidad del dato', '<dl class="sup-calidad">' +
      '<div><dt>Con fotografía</dt><dd>' + num(q.conFoto) + ' de ' + num(c.arboles) + (q.conFotoPct == null ? '' : ' (' + q.conFotoPct + ' %)') + '</dd></div>' +
      '<div><dt>Ubicados con GPS</dt><dd>' + num(q.gps) + ' de ' + num(c.arboles) + (q.gpsPct == null ? '' : ' (' + q.gpsPct + ' %)') + (q.precisionMediana == null ? '' : ' · precisión típica ±' + Math.round(q.precisionMediana) + ' m') + '</dd></div>' +
      '<div><dt>Señalados en el mapa o a mano</dt><dd>' + num(q.mapa) + ' en el mapa · ' + num(q.aMano) + ' a mano</dd></div>' +
      '<div><dt>Eliminados en el periodo</dt><dd>' + num(m.trazabilidad.eliminados) + '</dd></div>' +
      '<div><dt>Ediciones en el periodo</dt><dd>' + num(m.trazabilidad.editados) + '</dd></div></dl>' +
      '<p class="nota">Eliminados y editados no cambian la cifra de árboles: se cuentan aparte, como constancia.</p>');
    h += apartado('sup-t-jornadas', 'Jornadas cerradas del periodo', '<ul class="sup-jornadas">' + m.jornadas.map((j, i) =>
      '<li' + this.extra('jornadas', i, m.jornadas.length) + '><button type="button" class="enlace-fila" data-jornada="' + esc(j.id) + '"><span class="sup-j-nombre">' + esc(j.nombre) + '</span>' +
      '<span class="sup-j-datos">' + esc(SRP.util.formatearFecha(j.fecha)) + (cabo ? '' : ' · ' + esc(j.cabo)) + ' · ' + num(j.arboles) + (j.meta ? ' de ' + num(j.meta) : '') + (j.arboles === 1 ? ' árbol' : ' árboles') +
      (j.reporte ? '' : ' · sin reporte') + (j.pendientes ? ' · ' + j.pendientes + ' por revisar' : '') + '</span></button></li>').join('') + '</ul>' +
      this.botonMas('jornadas', m.jornadas.length));
    h += '</div>';
    return h;
  },

  // Lo que alguien tiene que hacer, con las jornadas a las que lleva
  htmlAtender(m) {
    if (!m.atender.length) return '';
    const esc = SRP.util.escapar;
    const porId = {}; this.datos.jornadas.forEach(j => { porId[j.id] = j; });
    return '<section class="bloque sup-atender" aria-labelledby="sup-t-atender"><h2 id="sup-t-atender" class="titulo-bloque">' + SRP.ICONOS.svg('info', 'medio') + '<span>Qué atender</span></h2><ul>' +
      m.atender.map(a => '<li><details class="desplegable"><summary>' + esc(a.texto) + '</summary><ul class="sup-jornadas">' +
        a.ids.map(id => porId[id]).filter(Boolean).map(j => '<li><button type="button" class="enlace-fila" data-jornada="' + esc(j.id) + '"><span class="sup-j-nombre">' + esc(j.nombre) + '</span>' +
          '<span class="sup-j-datos">' + esc(SRP.util.formatearFecha(j.fecha)) + (this.esCabo() ? '' : ' · ' + esc(SRP.ref.nombreUsuario(j.cabo_id))) + '</span></button></li>').join('') +
        '</ul></details></li>').join('') + '</ul></section>';
  },

  /* Tabla corta, la misma en teléfono y computadora (no se vuelve tarjetas: caben tres o cuatro
     columnas). `cifras`: columnas alineadas a la derecha. Una celda { html } ya viene escapada. */
  tabla(cab, filas, cifras, clave) {
    const esc = SRP.util.escapar;
    if (!filas.length) return '<p class="nota">Sin datos en este periodo.</p>';
    const cl = k => (cifras || []).includes(k) ? ' class="cifra"' : '';
    return '<div class="sup-tabla-caja"><table class="sup-tabla"><thead><tr>' + cab.map((t, k) => '<th' + cl(k) + ' scope="col">' + esc(t) + '</th>').join('') + '</tr></thead><tbody>' +
      filas.map((f, i) => '<tr' + (clave ? this.extra(clave, i, filas.length) : '') + '>' + f.map((v, k) => '<td' + cl(k) + '>' + (v && v.html !== undefined ? v.html : esc(v)) + '</td>').join('') + '</tr>').join('') +
      '</tbody></table></div>' + (clave ? this.botonMas(clave, filas.length) : '');
  },

  /* LISTAS LARGAS (D160). Con un año de trabajo, las jornadas del periodo son cientos y las colonias
     de una alcaldía, decenas: la página medía 18,000 px. Se ven las primeras 15 (las jornadas más
     recientes, las colonias con más árboles) y un botón muestra las demás sin recalcular. Menos de
     21 se ven todas: esconder cinco no ahorra nada. */
  CORTE: 15,
  corta(n) { return n > this.CORTE + 5; },
  extra(clave, i, n) { return this.corta(n) && i >= this.CORTE ? ' data-extra="' + clave + '" hidden' : ''; },
  botonMas(clave, n) {
    if (!this.corta(n)) return '';
    return '<button type="button" class="btn btn-texto sup-mas" data-mas="' + clave + '" data-total="' + n + '" aria-expanded="false">' + this.textoMas(clave, n, false) + '</button>';
  },
  textoMas(clave, n, abierto) {
    const cuantas = Number(n).toLocaleString('es-MX');
    if (clave === 'jornadas') return abierto ? 'Ver sólo las ' + this.CORTE + ' más recientes' : 'Ver las ' + cuantas + ' jornadas';
    return abierto ? 'Ver sólo las ' + this.CORTE + ' con más árboles' : 'Ver las ' + cuantas + ' colonias';
  },
  alternarMas(b) {
    const abrir = b.getAttribute('aria-expanded') !== 'true';
    this.el('sup-cuerpo').querySelectorAll('[data-extra="' + b.dataset.mas + '"]').forEach(x => { x.hidden = !abrir; });
    b.setAttribute('aria-expanded', String(abrir));
    b.textContent = this.textoMas(b.dataset.mas, b.dataset.total, abrir);
  },

  /* La gráfica de barras: dibujo SVG con sus colores en la hoja (.sup-barra) y, para el lector de
     pantalla, la misma serie como tabla. Sin librerías: cabe en unas líneas y funciona sin señal. */
  htmlSerie(s) {
    const esc = SRP.util.escapar;
    if (!s.casillas.length) return '<p class="nota">Sin datos en este periodo.</p>';
    const max = Math.max(1, ...s.casillas.map(c => c.arboles));
    const n = s.casillas.length, W = 100 / n;
    const etiquetas = n <= 14 ? 1 : Math.ceil(n / 7);
    const barras = s.casillas.map((c, i) => {
      const alto = Math.round(c.arboles * 100 / max);
      return '<g><rect class="sup-barra" x="' + (i * W + W * 0.15).toFixed(2) + '%" y="' + (100 - alto) + '%" width="' + (W * 0.7).toFixed(2) + '%" height="' + alto + '%"></rect></g>';
    }).join('');
    return '<figure class="sup-grafica"><div class="sup-grafica-lienzo"><svg aria-hidden="true" focusable="false" preserveAspectRatio="none">' + barras + '</svg></div>' +
      '<div class="sup-grafica-cifras" aria-hidden="true">' + s.casillas.map(c => '<span>' + (c.arboles || '') + '</span>').join('') + '</div>' +
      '<div class="sup-grafica-ejes">' + s.casillas.map((c, i) => '<span>' + (i % etiquetas === 0 ? esc(c.etiqueta) : '') + '</span>').join('') + '</div>' +
      '<table class="oculto-visual"><caption>Árboles plantados</caption><thead><tr><th>Periodo</th><th>Árboles</th><th>Jornadas</th></tr></thead><tbody>' +
      s.casillas.map(c => '<tr><td>' + esc(c.etiqueta) + '</td><td>' + c.arboles + '</td><td>' + c.jornadas + '</td></tr>').join('') + '</tbody></table></figure>';
  },

  /* El mapa por alcaldía: las 16 demarcaciones de la capa, más intensas cuantos más árboles. Sin
     mosaicos: se ve igual sin señal. El color lo pone la hoja según el nivel (.sup-nivel-0 a 4). */
  pintarMapa() {
    const caja = this.el('sup-mapa');
    if (this.mapa) { this.mapa.remove(); this.mapa = null; }
    if (!caja || !window.L || !SRP.CAPAS || !SRP.CAPAS.alcaldias) return;
    const cuenta = {}; this.modelo.porAlcaldia.forEach(a => { cuenta[a.clave] = a.arboles; });
    const max = Math.max(0, ...Object.values(cuenta));
    const nivel = n => !n ? 0 : Math.min(4, 1 + Math.floor(3 * n / Math.max(1, max)));
    this.mapa = L.map(caja, { zoomControl: false, dragging: false, scrollWheelZoom: false, doubleClickZoom: false, touchZoom: false, boxZoom: false, keyboard: false, zoomSnap: 0.1 });
    const elegida = this.filtros.alcaldia;
    // Sin mapa base: el único crédito es el de la capa de alcaldías
    const capa = L.geoJSON(SRP.CAPAS.alcaldias.geojson, {
      attribution: 'Alcaldías: SIA con base en INEGI',
      style: f => ({ className: 'sup-alcaldia sup-nivel-' + nivel(cuenta[f.properties.nombre]) + (elegida && f.properties.nombre === elegida ? ' sup-elegida' : ''), weight: 1 }),
      onEachFeature: (f, l) => {
        const n = cuenta[f.properties.nombre] || 0;
        l.bindTooltip(f.properties.nombre + ': ' + n + (n === 1 ? ' árbol' : ' árboles'), { sticky: false, direction: 'center' });
      }
    }).addTo(this.mapa);
    setTimeout(() => { if (this.mapa) { this.mapa.invalidateSize(); this.mapa.fitBounds(capa.getBounds(), { padding: [6, 6] }); } }, 30);
  },

  alTocar(e) {
    const mas = e.target.closest('button[data-mas]');
    if (mas) { this.alternarMas(mas); return; }
    const b = e.target.closest('button[data-jornada], button[data-cabo]'); if (!b) return;
    if (b.dataset.jornada) {
      // Jornadas abre esa ficha al prepararse, y ajusta su filtro si la dejaba fuera (D125)
      SRP.jornadas.actual = b.dataset.jornada;
      SRP.jornadas.volverAlDetalle = true;
      SRP.app.mostrarVista('jornadas');
      return;
    }
    // Las jornadas de ese cabo, en Jornadas
    SRP.jornadas.filtro.cabo = b.dataset.cabo;
    SRP.app.mostrarVista('jornadas');
  }
};
