/* SUPERVISIÓN Y «MI AVANCE» (D158). Lo que se ha plantado en un periodo, dicho con los indicadores de
   SRP.indicadores (D157): la coordinación ve su cuadrilla, la administración todo y el cabo lo suyo,
   con la misma pantalla. Para la coordinación y la administración es la primera sección al entrar
   y trae dentro las Fotografías; el cabo la encuentra al final de su barra como «Mi avance».
   Todo se calcula; nada se teclea. Los informes en PDF y CSV (D159) salen de este mismo modelo. */
window.SRP = window.SRP || {};

SRP.supervision = {
  periodo: null,
  filtros: { alcaldia: '', programa: '', cabo: '', organizacion: '' },
  FILTROS: ['alcaldia', 'programa', 'cabo', 'organizacion'],
  datos: null,
  modelo: null,
  mapa: null,
  usuarioId: null,

  el(id) { return document.getElementById(id); },
  esCabo() { return SRP.permisos.de(SRP.sesion.usuario).alcance === 'propios'; },
  // Sólo la Administración ve varias instituciones: el filtro y el desglose son suyos
  veOrganizaciones() { return SRP.permisos.de(SRP.sesion.usuario).alcance === 'todos'; },
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
    this.FILTROS.forEach(k => this.el('sup-' + k).addEventListener('change', () => {
      this.filtros[k] = this.el('sup-' + k).value;
      this.pintar();
    }));
    // «Quitar filtros» deja las listas como al entrar (el periodo no es un filtro: siempre hay uno); cada ficha quita lo suyo
    this.el('btn-sup-quitar').addEventListener('click', () => {
      const antes = Object.assign({}, this.filtros);
      this.filtros = { alcaldia: '', programa: '', cabo: '', organizacion: '' };
      this.FILTROS.forEach(k => { this.el('sup-' + k).value = ''; });
      this.pintar();
      SRP.util.anunciar('Filtros quitados.', 'exito', { deshacer: () => { this.filtros = antes; this.pintar(); } });
    });
    this.el('sup-fichas').addEventListener('click', (e) => {
      const b = e.target.closest('button[data-quitar]'); if (!b) return;
      if (b.dataset.quitar === 'institucion') this.filtros.organizacion = ''; else this.filtros[b.dataset.quitar] = '';
      this.pintar();
      SRP.util.anunciarSilencioso('Filtro quitado.');
    });
    this.el('sup-cuerpo').addEventListener('click', (e) => this.alTocar(e));
    // «toggle» no burbujea: se escucha en la captura
    this.el('sup-cuerpo').addEventListener('toggle', (e) => this.alPlegar(e), true);
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
      : 'Lo que se ha plantado en su ' + ({ todos: 'ciudad', institucion: 'institución' }[SRP.permisos.de(u).alcance] || 'cuadrilla') + ', por semana, mes o año. Cuentan sólo las jornadas cerradas; las abiertas se dicen aparte.';
    this.el('btn-sup-fotos').hidden = !SRP.permisos.de(u).galeria;
    // La tabla para Excel es de quien supervisa; el cabo se lleva su informe en PDF
    this.el('btn-sup-csv').hidden = cabo;
    this.el('caja-sup-cabo').hidden = cabo;
    this.el('caja-sup-organizacion').hidden = !this.veOrganizaciones();
    // Quien entra con otra cuenta empieza en la semana en curso y sin filtros: no hereda el año
    // ni la alcaldía que dejó la cuenta anterior en este mismo dispositivo (D160)
    if (this.usuarioId !== u.id) { this.usuarioId = u.id; this.periodo = null; this.abiertas = null; this.filtros = { alcaldia: '', programa: '', cabo: '', organizacion: '' }; }
    if (!this.periodo) this.periodo = SRP.indicadores.periodo('semana');
    const datos = await SRP.indicadores.cargar();
    /* Con mucho volumen la lectura tarda: si mientras tanto se salió o se cambió de cuenta, lo leído
       es de otra persona y no se pinta */
    if (!SRP.sesion.usuario || SRP.sesion.usuario.id !== u.id) return;
    this.datos = datos;
    this.pintar();
  },

  // Alcaldías de una jornada: las de sus árboles y, sin árboles, la suya
  alcaldiasDe(j) { return [...new Set(j.registros.map(r => r.alcaldia).concat(j.registros.length ? [] : [j.dato && j.dato.alcaldia]).filter(Boolean))]; },

  // ¿Pasa los filtros, salvo los de `excluir`? Los mismos criterios que SRP.indicadores.calcular
  cumple(j, excluir) {
    const f = this.filtros, x = k => !excluir || !excluir.has(k), org = SRP.indicadores.organizacionDe(j);
    return (!f.organizacion || !x('organizacion') || org === f.organizacion) &&
      (!f.cabo || !x('cabo') || (j.personas || [j.cabo_id]).includes(f.cabo)) && (!f.programa || !x('programa') || (j.dato && j.dato.programa_id) === f.programa) &&
      (!f.alcaldia || !x('alcaldia') || this.alcaldiasDe(j).includes(f.alcaldia));
  },

  /* Las listas traen sólo lo que hay en las jornadas de la cuenta, y cada una lo que queda con las
     demás elegidas (SRP.util.facetas). Lo elegido se queda en su lista aunque deje de tener resultados. */
  llenarFiltros() {
    const f = this.filtros, d = this.datos, ver = this.veOrganizaciones(), org = j => SRP.indicadores.organizacionDe(j);
    const valores = { alcaldia: j => this.alcaldiasDe(j), programa: j => j.dato && j.dato.programa_id, cabo: j => j.personas || [j.cabo_id], organizacion: org };
    if (!ver) { delete valores.organizacion; f.organizacion = ''; }
    const fac = SRP.util.facetas(d.jornadas, (j, ex) => this.cumple(j, ex), valores);
    SRP.util.llenarLista(this.el('sup-alcaldia'), 'Todas', [...fac.alcaldia].map(a => [a, a]), f, 'alcaldia');
    SRP.util.llenarLista(this.el('sup-programa'), 'Todos', [...fac.programa].map(id => [id, SRP.ref.nombreCatalogo(id)]), f, 'programa', id => SRP.ref.nombreCatalogo(id));
    // También los cabos que no trabajaron, si son de la institución elegida: así se ve quién falta
    const delaOrg = id => { const o = (SRP.ref.usuarioPorId[id] || {}).organizacion_id || SRP.CONFIG.ORGANIZACION_SEDEMA; return !f.organizacion || o === f.organizacion; };
    this.el('sup-cabo').innerHTML = SRP.util.opciones('Todos', SRP.util.paresPersonas([...fac.cabo].concat(d.cabos.filter(delaOrg), f.cabo || [])));
    this.el('sup-cabo').value = f.cabo;
    if (ver) SRP.util.llenarInstituciones(this.el('sup-organizacion'), fac.organizacion, f);
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
    this.llenarFiltros();
    const dichos = [f.organizacion ? SRP.ref.nombreOrganizacion(f.organizacion) : '', f.alcaldia, f.programa ? SRP.ref.nombreCatalogo(f.programa) : '', f.cabo ? SRP.ref.nombreUsuario(f.cabo) : ''].filter(Boolean);
    this.el('sup-filtros-texto').textContent = 'Más filtros: ' + (dichos.length ? dichos.join(' · ')
      : SRP.util.enumerar(['alcaldía', 'programa'].concat(this.esCabo() ? [] : ['quién registró'], this.veOrganizaciones() ? ['institución'] : [])));
    this.el('btn-sup-quitar').hidden = !dichos.length;
    SRP.util.pintarFichas(this.el('sup-fichas'), [f.alcaldia ? ['alcaldia', 'Alcaldía: ' + f.alcaldia] : null, f.programa ? ['programa', 'Programa: ' + SRP.ref.nombreCatalogo(f.programa)] : null,
      f.cabo ? ['cabo', 'Registró: ' + SRP.ref.nombreUsuario(f.cabo)] : null,
      f.organizacion ? ['institucion', 'Institución: ' + SRP.ref.nombreOrganizacion(f.organizacion)] : null].filter(Boolean));
    this.modelo = I.calcular(this.datos, p, f);
    // Las descargas salen del cuerpo antes de repintarlo y vuelven a su lugar, bajo las cifras
    const cuerpo = this.el('sup-cuerpo'), acciones = this.el('sup-acciones');
    cuerpo.after(acciones);
    // Los mapas se retiran antes de repintar: una sección plegada no vuelve a dibujar el suyo
    this.quitarMapas();
    cuerpo.innerHTML = this.html(this.modelo);
    const ancla = this.el('sup-ancla-acciones');
    if (ancla) ancla.replaceWith(acciones);
    // Sin jornadas cerradas no hay informe que dar; sin árboles, no hay tabla
    this.el('btn-sup-pdf').disabled = !this.modelo.cifras.jornadas;
    this.el('btn-sup-csv').disabled = !this.modelo.cifras.arboles;
    if (this.abierta('alcaldias')) this.pintarMapa();
    if (this.abierta('prioridad')) this.pintarMapaPrioridad();
  },

  /* ---------- El cuerpo ---------- */

  html(m) {
    const esc = SRP.util.escapar, c = m.cifras, cabo = this.esCabo(), P = SRP.indicadores.pct;
    const num = n => n == null ? '—' : Number(n).toLocaleString('es-MX');
    const cifra = (valor, texto, sub) => '<div class="sup-cifra"><b>' + valor + '</b><span>' + texto + '</span>' + (sub ? '<small>' + sub + '</small>' : '') + '</div>';
    const apartado = (id, titulo, cuerpo) => '<section class="bloque sup-apartado" aria-labelledby="' + id + '"><h2 id="' + id + '" class="titulo-bloque">' + titulo + '</h2>' + cuerpo + '</section>';
    /* Cada desglose va plegado y dice su dato principal en el renglón: se abre el que interesa.
       `clave` recuerda cuáles quedaron abiertos al cambiar de periodo o de filtro */
    const seccion = (clave, id, titulo, resumen, cuerpo) => '<details class="bloque sup-apartado sup-seccion" data-seccion="' + clave + '"' + (this.abierta(clave) ? ' open' : '') + '>' +
      '<summary><h2 id="' + id + '" class="titulo-bloque">' + titulo + '</h2><span class="sup-resumen">' + resumen + '</span></summary><div class="sup-seccion-cuerpo">' + cuerpo + '</div></details>';
    const barra = (n, max) => '<svg class="sup-esp-barra" viewBox="0 0 100 6" preserveAspectRatio="none" aria-hidden="true" focusable="false"><rect width="' + Math.max(1, n * 100 / Math.max(1, max)).toFixed(1) + '" height="6"></rect></svg>';
    const conBarra = (texto, n, lista) => ({ html: esc(texto) + barra(n, Math.max(1, ...lista.map(x => x.arboles))) });
    const primero = lista => lista.length ? esc(lista[0].organizacion || lista[0].colonia || lista[0].clave) + ' ' + lista[0].pct + ' %' : '';
    const plural = (n, uno, varios) => num(n) + ' ' + (n === 1 ? uno : varios);
    if (!c.arboles && !c.jornadas && !c.enCurso && !m.atender.length) {
      return '<div class="vacio">' + SRP.util.htmlVacio('avance', 'Sin jornadas cerradas en este periodo',
        cabo ? 'Cuando cierre una jornada, aquí verá cuántos árboles plantó.' : 'Cuando se cierren jornadas, aquí se verá cuánto se plantó.', []) + '</div>' + this.htmlAtender(m);
    }
    // «Previstos»: lo que se dijo al iniciar cada jornada; no es la meta del programa
    const previsto = cifra(c.avance == null ? '—' : c.avance + ' %', 'de lo previsto', c.meta ? num(c.arbolesConMeta) + ' de ' + num(c.meta) + ' previstos en las jornadas' : 'sin cantidad prevista');
    let h = '<div class="sup-cifras" data-cifras="' + (cabo ? 3 : 4) + '">' + (cabo
      ? cifra(num(c.arboles), c.arboles === 1 ? 'árbol plantado' : 'árboles plantados', c.promedio == null ? '' : String(c.promedio) + ' por jornada') + previsto +
        cifra(num(c.jornadas), c.jornadas === 1 ? 'jornada cerrada' : 'jornadas cerradas', c.enCurso ? num(c.enCurso) + ' en curso' : '')
      : cifra(num(c.arboles), c.arboles === 1 ? 'árbol plantado' : 'árboles plantados', 'en ' + plural(c.jornadas, 'jornada cerrada', 'jornadas cerradas')) + previsto +
        cifra(num(c.cabosActivos) + ' de ' + num(c.cabosAsignados), 'cabos trabajaron', c.promedio == null ? '' : String(c.promedio) + ' árboles por jornada') +
        cifra(num(c.enCurso), c.enCurso === 1 ? 'jornada en curso' : 'jornadas en curso', c.enCurso ? 'no se cuentan hasta cerrarse' : '')) +
      '</div>';
    h += this.htmlAtender(m);
    // Aquí se colocan las descargas: a la mano, sin recorrer los desgloses
    h += '<div id="sup-ancla-acciones"></div>';
    // La unidad va en el título: son árboles plantados
    h += apartado('sup-t-avance', 'Árboles plantados ' + { dia: 'por día', semana: 'por semana', mes: 'por mes', anio: 'por año' }[m.serie.unidad], this.htmlSerie(m.serie));
    if (!cabo && !m.filtros.cabo) {
      const pendientes = x => [x.abiertasViejas ? x.abiertasViejas + ' abierta' + (x.abiertasViejas === 1 ? '' : 's') + ' de antes' : '', x.sinRevisar ? x.sinRevisar + ' sin revisar' : '', x.sinReporte ? x.sinReporte + ' sin reporte' : '',
        x.eliminados ? x.eliminados + ' eliminado' + (x.eliminados === 1 ? '' : 's') : '', x.editados ? x.editados + ' editado' + (x.editados === 1 ? '' : 's') : ''].filter(Boolean).join(' · ');
      const enlace = x => ({ html: '<button type="button" class="enlace-fila" data-cabo="' + esc(x.cabo_id) + '">' + esc(x.nombre) + '</button>' });
      const marca = x => { const t = pendientes(x); return t ? { html: '<span class="sup-pendiente">' + esc(t) + '</span>' } : 'Nada pendiente'; };
      // Quien no tuvo jornadas en el periodo va aparte, en un renglón que se abre: así la lista dice quién trabajó
      const activos = m.porCabo.filter(x => x.jornadas || x.arboles), sin = m.porCabo.filter(x => !x.jornadas && !x.arboles);
      const conPend = m.porCabo.filter(x => pendientes(x)).length;
      h += seccion('cabos', 'sup-t-cabos', 'Por cabo', num(activos.length) + ' con jornadas en el periodo' + (conPend ? ' · ' + num(conPend) + ' con pendientes' : ''),
        (activos.length ? this.tabla(['Cabo', 'Árboles', 'De lo previsto', 'Jornadas', 'Última', 'Pendientes'],
          activos.map(x => [enlace(x), num(x.arboles), x.avance == null ? '—' : x.avance + ' %', num(x.jornadas), x.ultima ? SRP.util.formatearFecha(x.ultima) : 'Sin jornadas', marca(x)]), [1, 2, 3], 'cabos', 'sup-tabla-cabos')
          : '<p class="nota">Nadie cerró jornadas en este periodo.</p>') +
        (sin.length ? '<details class="desplegable sup-sin-jornadas"><summary><span>' + num(sin.length) + ' sin jornadas en el periodo</span></summary>' +
          this.tabla(['Cabo', 'Pendientes'], sin.map(x => [enlace(x), marca(x)]), [], null, 'sup-tabla-cabos') + '</details>' : ''));
    }
    /* Por institución: lo de fuera suma al total de la Ciudad y aquí se ve quién lo plantó. Sólo
       para la Administración, sin institución elegida y cuando plantó más de una */
    if (this.veOrganizaciones() && !m.filtros.organizacion && m.porOrganizacion.length > 1) {
      const orgs = this.conPct(m.porOrganizacion, c.arboles);
      h += seccion('instituciones', 'sup-t-instituciones', 'Por institución', plural(orgs.length, 'institución', 'instituciones') + ' · ' + primero(orgs),
        this.tabla(['Institución', 'Árboles', '% del total', 'Tipo', 'Jornadas'], orgs.map(x => [conBarra(x.organizacion, x.arboles, orgs), num(x.arboles), x.pct + ' %', x.tipo, num(x.jornadas)]), [1, 2, 4]));
    }
    const alcs = this.conPct(m.porAlcaldia, c.arboles), cols = this.conPct(m.porColonia, c.arboles);
    h += seccion('alcaldias', 'sup-t-alcaldias', m.filtros.alcaldia ? 'Colonias de ' + esc(m.filtros.alcaldia) : 'Por alcaldía',
      m.filtros.alcaldia ? plural(c.colonias, 'colonia', 'colonias') + (cols.length ? ' · ' + primero(cols) : '')
        : (c.alcaldias === 1 && alcs.length ? esc(alcs[0].clave) : plural(c.alcaldias, 'alcaldía', 'alcaldías')) + ' · ' + plural(c.colonias, 'colonia', 'colonias') + (c.alcaldias > 1 ? ' · ' + primero(alcs) : ''),
      '<div class="sup-dos"><div><div id="sup-mapa" class="sup-mapa" role="group" aria-label="Mapa de la Ciudad de México con las alcaldías según los árboles plantados. Las mismas cifras están en la tabla de al lado"></div>' +
      '<p class="nota sup-leyenda">Más intenso, más árboles. Toque una alcaldía para ver su cifra.</p></div><div>' +
      (m.filtros.alcaldia
        ? this.tabla(['Colonia', 'Árboles', '% del total', 'Jornadas'], cols.map(x => [conBarra(x.colonia, x.arboles, cols), num(x.arboles), x.pct + ' %', num(x.jornadas)]), [1, 2, 3], 'colonias')
        : this.tabla(['Alcaldía', 'Árboles', '% del total', 'Jornadas', 'Colonias'], alcs.map(x => [conBarra(x.clave, x.arboles, alcs), num(x.arboles), x.pct + ' %', num(x.jornadas), num(x.colonias)]), [1, 2, 3, 4])) + '</div></div>');
    /* Por prioridad de la colonia: cuántos árboles cayeron en cada nivel del modelo de priorización,
       con el mapa de las colonias (más intenso, más prioridad) */
    if (m.prioridad) {
      const p = m.prioridad, nCol = Object.keys(p.colonias || {}).length;
      const filas = p.niveles.map(x => [x.texto, num(x.n), (P(x.n, p.total) || 0) + ' %']).concat(p.sin ? [['Sin dato en la capa', num(p.sin), (P(p.sin, p.total) || 0) + ' %']] : []);
      h += seccion('prioridad', 'sup-t-prioridad', 'Por prioridad de la colonia', p.total ? (P(p.altas, p.total) || 0) + ' % en prioridad alta o muy alta' : 'Sin árboles en el periodo',
        '<p class="sup-prioridad-lema">' + (p.total ? '<b>' + num(p.altas) + ' de ' + num(p.total) + '</b> árboles (' + (P(p.altas, p.total) || 0) + ' %) en colonias de prioridad alta o muy alta.' : 'Sin árboles en el periodo.') + '</p>' +
        '<div class="sup-dos"><div><div id="sup-mapa-prioridad" class="sup-mapa" role="group" aria-label="Mapa de las colonias donde se plantó, con el color de su prioridad de reforestación. Las cifras por nivel están en la tabla de al lado"></div>' +
        '<p class="nota pri-leyenda">' + SRP.prioritarias.htmlLeyenda() + '</p>' +
        '<p id="sup-prioridad-colonias" class="nota">' + (nCol ? (nCol === 1 ? 'Se pinta la colonia' : 'Se pintan las ' + num(nCol) + ' colonias') + ' donde se plantó, con el color de su prioridad; pase el cursor sobre una colonia, o tóquela, para ver cuántos árboles.' : 'Ninguna colonia con árboles en lo filtrado.') + '</p></div><div>' +
        this.tabla(['Prioridad', 'Árboles', '% del total'], filas, [1, 2]) +
        '<p class="nota">Según el modelo de priorización de colonias (capa ' + esc(SRP.prioritarias.version()) + '). Se calcula del punto de cada árbol; los límites de la capa son aproximados.</p></div></div>');
    }
    // En computadora, en dos columnas
    h += '<div class="sup-columnas">';
    /* Por especie: tabla y gráfica juntas. La barra compara con la especie más plantada (sin
       carril de fondo, para que no se lea como «lleno»); la cantidad y el % del total van al lado. */
    const esps = this.conPct(m.porEspecie, c.arboles);
    h += seccion('especies', 'sup-t-especies', 'Por especie', plural(c.especies, 'especie', 'especies') + (c.nativasPct == null ? '' : ' · ' + c.nativasPct + ' % nativas'),
      this.tabla(['Especie', 'Árboles', '% del total', 'Distribución'],
        esps.map(x => [{ html: esc(x.comun) + (x.cientifico ? '<small><i>' + esc(x.cientifico) + '</i></small>' : '') + barra(x.arboles, Math.max(1, ...esps.map(y => y.arboles))) },
          num(x.arboles), x.pct + ' %', x.distribucion || '—']), [1, 2], 'especies'));
    const progs = this.conPct(m.porPrograma, c.arboles);
    h += seccion('programas', 'sup-t-programas', 'Por programa', progs.length === 1 ? esc(progs[0].clave) + ' · ' + plural(progs[0].arboles, 'árbol', 'árboles') : plural(progs.length, 'programa', 'programas') + (progs.length ? ' · ' + primero(progs) : ''),
      this.tabla(['Programa', 'Árboles', '% del total', 'Jornadas'], progs.map(x => [x.clave, num(x.arboles), x.pct + ' %', num(x.jornadas)]), [1, 2, 3]));
    /* Solicitudes: cuánto de lo plantado fue a solicitud de otra instancia y de quién. Es
       información de quien supervisa, y sólo aparece si hubo alguno en el periodo */
    if (!cabo && m.solicitudes.jornadas) {
      const pe = m.solicitudes;
      h += seccion('solicitudes', 'sup-t-solicitudes', 'Solicitudes', plural(pe.jornadas, 'jornada', 'jornadas') + ' · ' + (P(pe.arboles, c.arboles) || 0) + ' % de los árboles',
        '<p class="sup-solicitudes-lema"><b>' + num(pe.jornadas) + ' de ' + num(c.jornadas) + '</b> ' + (c.jornadas === 1 ? 'jornada' : 'jornadas') + ' y <b>' + num(pe.arboles) + ' de ' + num(c.arboles) + '</b> árboles (' + (P(pe.arboles, c.arboles) || 0) + ' %) fueron a solicitud de otra instancia.</p>' +
        this.tabla(['Quién lo solicitó', 'Árboles', '% del total', 'Jornadas'], pe.solicitantes.map(x => [x.solicitante, num(x.arboles), (P(x.arboles, c.arboles) || 0) + ' %', num(x.jornadas)]), [1, 2, 3]));
    }
    /* Calidad del dato. Al cabo le sirve lo que depende de su captura —ubicación y fotografía—;
       eliminados y ediciones son constancia para quien supervisa */
    const q = m.calidad;
    h += seccion('calidad', 'sup-t-calidad', cabo ? 'Mis registros' : 'Calidad del dato',
      (q.gpsPct == null ? '' : q.gpsPct + ' % con GPS · ') + (q.conFotoPct == null ? 'Sin árboles' : q.conFotoPct + ' % con fotografía') + (!cabo && m.trazabilidad.eliminados ? ' · ' + plural(m.trazabilidad.eliminados, 'eliminado', 'eliminados') : ''),
      '<dl class="sup-calidad">' +
      '<div><dt>Con fotografía</dt><dd>' + num(q.conFoto) + ' de ' + num(c.arboles) + (q.conFotoPct == null ? '' : ' (' + q.conFotoPct + ' %)') + '</dd></div>' +
      '<div><dt>Ubicados con GPS</dt><dd>' + num(q.gps) + ' de ' + num(c.arboles) + (q.gpsPct == null ? '' : ' (' + q.gpsPct + ' %)') + (q.precisionMediana == null ? '' : ' · precisión típica ±' + Math.round(q.precisionMediana) + ' m') + '</dd></div>' +
      '<div><dt>Señalados en el mapa o a mano</dt><dd>' + num(q.mapa) + ' en el mapa · ' + num(q.aMano) + ' a mano</dd></div>' +
      '<div><dt>Sustitutos plantados</dt><dd>' + (q.sustitutos ? num(q.sustitutos) + ' · ' + q.sustitutosMotivo.map(([t, n]) => esc(t) + ' ' + num(n)).join(' · ') : 'Ninguno') + '</dd></div>' +
      (cabo ? '</dl>' : '<div><dt>Eliminados en el periodo</dt><dd>' + num(m.trazabilidad.eliminados) + '</dd></div>' +
        '<div><dt>Ediciones en el periodo</dt><dd>' + num(m.trazabilidad.editados) + '</dd></div></dl>' +
        '<p class="nota">Eliminados y editados no cambian la cifra de árboles: se cuentan aparte, como constancia.</p>'));
    h += '</div>';
    // Las jornadas del periodo se revisan en su pestaña, con el mismo periodo y los mismos filtros
    if (c.jornadas) h += '<button type="button" class="btn btn-texto sup-ver-jornadas" data-ver-jornadas>' + (cabo ? 'Ver mis jornadas del periodo' : 'Ver las jornadas del periodo') + ' en Jornadas</button>';
    return h;
  },

  /* Qué desgloses están abiertos. Con ancho se ven todos; en el teléfono, plegados, salvo «Por cabo»
     para quien supervisa. Lo que la persona abre o cierra se respeta mientras siga en la cuenta. */
  SECCIONES: ['cabos', 'instituciones', 'alcaldias', 'prioridad', 'especies', 'programas', 'solicitudes', 'calidad'],
  abiertas: null,
  abierta(clave) {
    if (!this.abiertas) this.abiertas = new Set(window.matchMedia('(min-width: 701px)').matches ? this.SECCIONES : (this.esCabo() ? [] : ['cabos']));
    return this.abiertas.has(clave);
  },
  alPlegar(e) {
    const d = e.target; if (!d.matches || !d.matches('details[data-seccion]')) return;
    this.abierta(d.dataset.seccion);
    if (d.open) this.abiertas.add(d.dataset.seccion); else this.abiertas.delete(d.dataset.seccion);
    // Un mapa no se dibuja mientras su sección está plegada: no tiene tamaño
    if (d.dataset.seccion === 'alcaldias') { if (d.open) this.pintarMapa(); else this.quitarMapas('mapa'); }
    if (d.dataset.seccion === 'prioridad') { if (d.open) this.pintarMapaPrioridad(); else this.quitarMapas('mapaPrioridad'); }
  },
  // Retira un mapa (o los dos) y lo suelta de la capa de colonias prioritarias
  quitarMapas(cual) {
    (cual ? [cual] : ['mapa', 'mapaPrioridad']).forEach(k => {
      if (!this[k]) return;
      SRP.prioritarias.soltar(this[k]); this[k].remove(); this[k] = null;
    });
  },
  abrirTodo() { this.abiertas = new Set(this.SECCIONES); this.pintar(); },

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
  tabla(cab, filas, cifras, clave, clase) {
    const esc = SRP.util.escapar;
    if (!filas.length) return '<p class="nota">Sin datos en este periodo.</p>';
    const cl = k => (cifras || []).includes(k) ? ' class="cifra"' : '';
    return '<div class="sup-tabla-caja"><table class="sup-tabla' + (clase ? ' ' + clase : '') + '" data-columnas="' + cab.length + '"><thead><tr>' + cab.map((t, k) => '<th' + cl(k) + ' scope="col">' + esc(t) + '</th>').join('') + '</tr></thead><tbody>' +
      filas.map((f, i) => '<tr' + (clave ? this.extra(clave, i, filas.length) : '') + '>' + f.map((v, k) => '<td' + cl(k) + ' data-etiqueta="' + esc(cab[k]) + '">' + (v && v.html !== undefined ? v.html : esc(v)) + '</td>').join('') + '</tr>').join('') +
      '</tbody></table></div>' + (clave ? this.botonMas(clave, filas.length) : '');
  },

  // % del total de lo elegido (D168), con el mismo redondeo del reporte: cantidades iguales, mismo %
  conPct(lista, total) {
    const p = SRP.reportes.porcentajes(lista.map(x => x.arboles), total);
    return lista.map((x, i) => Object.assign({}, x, { pct: p[i] }));
  },

  /* LISTAS LARGAS (D160, D168). Con un año de trabajo, las jornadas del periodo son cientos y las
     colonias de una alcaldía, decenas. Se ven las primeras 10 (las jornadas más recientes, las
     colonias y especies con más árboles) y «Mostrar 10 más» va sumando de diez en diez sin
     recalcular; al final, el mismo botón vuelve a dejar sólo las primeras 10. */
  CORTE: 10,
  corta(n) { return n > this.CORTE; },
  extra(clave, i, n) { return this.corta(n) && i >= this.CORTE ? ' data-extra="' + clave + '" data-orden="' + i + '" hidden' : ''; },
  botonMas(clave, n) {
    if (!this.corta(n)) return '';
    return '<button type="button" class="btn btn-texto sup-mas" data-mas="' + clave + '" data-total="' + n + '" data-vistas="' + this.CORTE + '">' + this.textoMas(n, this.CORTE) + '</button>';
  },
  textoMas(n, vistas) {
    const quedan = n - vistas;
    return quedan > 0 ? 'Mostrar ' + Math.min(this.CORTE, quedan) + ' más (' + vistas + ' de ' + Number(n).toLocaleString('es-MX') + ')' : 'Mostrar sólo las primeras ' + this.CORTE;
  },
  alternarMas(b) {
    const n = Number(b.dataset.total), antes = Number(b.dataset.vistas);
    const vistas = antes >= n ? this.CORTE : Math.min(n, antes + this.CORTE);
    this.el('sup-cuerpo').querySelectorAll('[data-extra="' + b.dataset.mas + '"]').forEach(x => { x.hidden = Number(x.dataset.orden) >= vistas; });
    b.dataset.vistas = String(vistas);
    b.textContent = this.textoMas(n, vistas);
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
    this.quitarMapas('mapa');
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
    const m = this.mapa;
    setTimeout(() => { if (this.mapa === m) { m.invalidateSize(); m.fitBounds(capa.getBounds(), { padding: [6, 6] }); } }, 30);
  },

  /* El mapa de colonias por prioridad: sin mosaicos, como el de alcaldías, con el contorno de las
     alcaldías encima. Se pintan sólo las colonias donde se plantó en lo filtrado, con el color de su
     prioridad: una sola rampa de color; cuántos árboles, en la etiqueta de cada colonia y en la tabla. Con una alcaldía elegida, se acerca a ella. */
  pintarMapaPrioridad() {
    const caja = this.el('sup-mapa-prioridad');
    this.quitarMapas('mapaPrioridad');
    if (!caja || !window.L || !SRP.prioritarias.hay()) return;
    this.mapaPrioridad = L.map(caja, { zoomControl: false, dragging: false, scrollWheelZoom: false, doubleClickZoom: false, touchZoom: false, boxZoom: false, keyboard: false, zoomSnap: 0.1 });
    // Aquí la capa es el mapa mismo: no se apaga entera, pero sí cada nivel, y se regula su opacidad
    SRP.prioritarias.control(() => this.mapaPrioridad, { grupo: 'supervision', interruptor: false, interactiva: true,
      intervenidas: (this.modelo && this.modelo.prioridad && this.modelo.prioridad.colonias) || {} });
    const elegida = this.filtros.alcaldia;
    const alc = L.geoJSON(SRP.CAPAS.alcaldias.geojson, { interactive: false, style: () => ({ className: 'pri-contorno', weight: 1 }) }).addTo(this.mapaPrioridad);
    let caja2 = alc.getBounds();
    if (elegida) alc.eachLayer(l => { if (l.feature.properties.nombre === elegida) caja2 = l.getBounds(); });
    const m = this.mapaPrioridad;
    setTimeout(() => { if (this.mapaPrioridad === m) { m.invalidateSize(); m.fitBounds(caja2, { padding: [6, 6] }); } }, 30);
  },

  alTocar(e) {
    const mas = e.target.closest('button[data-mas]');
    if (mas) { this.alternarMas(mas); return; }
    if (e.target.closest('button[data-ver-jornadas]')) { this.verJornadas(); return; }
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
  },

  // Jornadas, con el periodo y los filtros que se están viendo aquí
  verJornadas() {
    const J = SRP.jornadas, p = this.periodo, f = this.filtros;
    Object.assign(J.filtro, { texto: '', revision: '', dia: '', anio: '', mes: '', desde: p.desde || '', hasta: p.hasta || '',
      cabo: f.cabo, programa: f.programa, alcaldia: f.alcaldia, organizacion: f.organizacion });
    J.diaAbierto = false; J.periodoAbierto = p.tipo !== 'todo';
    J.el('jornada-buscar').value = ''; J.el('jornada-revision').value = ''; J.el('jornada-dia').value = '';
    J.el('jornada-desde').value = p.desde || ''; J.el('jornada-hasta').value = p.hasta || '';
    SRP.app.mostrarVista('jornadas');
  }
};
