/* ZONA DE FILTROS COMPARTIDA. La zona de las vistas que listan cosas con fecha (hoy,
   Fotografías), con el orden y las palabras de Registros y Jornadas:

     Filtrar                                             Quitar filtros
     [fichas de lo que está filtrando, cada una con su ×]
     Buscar (si la vista lo pide)
     Todas · Hoy · Un día · Un periodo
     Más filtros: año, mes y las listas de la vista

   Cada vista dice qué busca, cuál es la fecha de cada elemento y qué listas ofrece; la zona arma los
   controles, guarda lo elegido en `filtro` y devuelve lo que pasa. Las listas dependen unas de otras
   (SRP.util.facetas): cada una ofrece sólo lo que queda con las demás; el periodo no las cambia, salvo
   en las que se piden `conPeriodo`. Lo elegido se queda en su lista aunque ya no tenga resultados.

   `o`: { raiz, p, todas, plural, buscar: { etiqueta, marcador, texto(e) }, fecha(e),
          listas: [{ clave, etiqueta, vacio, valor(e), nombre(v), ficha, personas, opciones, ver(), conPeriodo, orden(a, b) }],
          org(e), alCambiar() }
   Los controles llevan el prefijo `p`: `p-atajos`, `p-dia`, `p-desde`, `p-hasta`, `p-anio`, `p-mes`,
   `p-<clave>`, `p-tipo-org`, `p-org`, `p-buscar`, `p-fichas`, `p-quitar`. */
window.SRP = window.SRP || {};

SRP.zonaFiltros = {
  crear(o) {
    const z = Object.create(this.Zona);
    z.o = o; z.p = o.p; z.items = []; z.diaAbierto = false; z.periodoAbierto = false;
    z.filtro = z.vacio();
    z.montar();
    return z;
  },

  Zona: {
    el(s) { return document.getElementById(this.p + '-' + s); },
    caja(s) { return document.getElementById('caja-' + this.p + '-' + s); },

    vacio() {
      const f = { texto: '', dia: '', desde: '', hasta: '', anio: '', mes: '', tipo: '', organizacion: '' };
      this.o.listas.forEach(l => { f[l.clave] = ''; });
      return f;
    },

    // ¿Ve más de una institución quien entró? Sólo entonces hay tipo de institución e institución
    conInstituciones() { return !!this.o.org && SRP.permisos.de(SRP.sesion.usuario).alcance === 'todos'; },
    visible(l) { return !l.ver || l.ver(); },

    montar() {
      const o = this.o, p = this.p, esc = SRP.util.escapar;
      const campo = (id, etiqueta, control) => '<div id="caja-' + p + '-' + id + '" class="campo campo-corto"><label for="' + p + '-' + id + '">' + esc(etiqueta) + '</label>' + control + '</div>';
      const lista = id => '<select id="' + p + '-' + id + '"></select>';
      const fecha = id => '<input type="date" id="' + p + '-' + id + '" data-vacio="Elija la fecha">';
      document.getElementById(o.raiz).innerHTML =
        '<div class="grupo-cab"><h2 id="' + p + '-titulo-filtros" class="titulo-bloque">Filtrar</h2>' +
        '<button type="button" id="' + p + '-quitar" class="btn btn-reiniciar">Quitar filtros</button></div>' +
        '<ul id="' + p + '-fichas" class="filtros-activos" data-visible="true" aria-label="Filtros activos"></ul>' +
        '<div class="filtros zona-filtros">' +
        (o.buscar ? '<div class="campo"><label for="' + p + '-buscar">' + esc(o.buscar.etiqueta) + '</label><input id="' + p + '-buscar" type="search" placeholder="' + esc(o.buscar.marcador) + '" autocomplete="off"></div>' : '') +
        '<div id="' + p + '-atajos" class="chips chips-cuatro" role="group" aria-label="Periodo">' +
        '<button type="button" class="chip" data-atajo="todas">' + esc(o.todas || 'Todas') + '</button>' +
        '<button type="button" class="chip" data-atajo="hoy" id="' + p + '-chip-hoy">Hoy</button>' +
        '<button type="button" class="chip" data-atajo="dia" aria-controls="' + p + '-un-dia" aria-expanded="false">Un día</button>' +
        '<button type="button" class="chip" data-atajo="periodo" aria-controls="' + p + '-periodo" aria-expanded="false">Un periodo</button></div>' +
        '<div id="' + p + '-un-dia" class="filtros-periodo filtros-un-dia" hidden><div class="campo campo-corto"><label for="' + p + '-dia">Día</label>' + fecha('dia') + '</div></div>' +
        '<div id="' + p + '-periodo" class="filtros-periodo" hidden><div class="campo campo-corto"><label for="' + p + '-desde">Desde</label>' + fecha('desde') + '</div>' +
        '<div class="campo campo-corto"><label for="' + p + '-hasta">Hasta</label>' + fecha('hasta') + '</div>' +
        '<button type="button" id="' + p + '-aplicar" class="btn btn-primario btn-chico">Aplicar</button></div>' +
        '<details id="' + p + '-mas" class="acordeon-filtros"><summary><span id="' + p + '-mas-texto">Más filtros</span></summary>' +
        '<div class="filtros-listas acordeon-cuerpo">' + campo('anio', 'Año', lista('anio')) + campo('mes', 'Mes', lista('mes')) +
        o.listas.map(l => campo(l.clave, l.etiqueta, lista(l.clave))).join('') +
        (o.org ? campo('tipo-org', 'Tipo de institución', lista('tipo-org')) + campo('org', 'Institución', lista('org')) : '') +
        '</div></details></div>';

      SRP.util.atajos.iniciar(this.el('atajos'), a => this.aplicarAtajo(a));
      this.el('dia').addEventListener('change', () => { this.filtro.dia = this.el('dia').value; this.diaAbierto = true; this.cambioDePeriodo(); });
      // Desde y Hasta entran con «Aplicar», como en Registros
      this.el('aplicar').addEventListener('click', () => {
        const desde = this.el('desde').value, hasta = this.el('hasta').value, f = this.filtro;
        if (desde && hasta && desde > hasta) { SRP.util.anunciar('La fecha «Desde» es posterior a «Hasta». Corrija el rango.', 'alerta'); return; }
        f.desde = desde; f.hasta = hasta;
        if (desde || hasta) { f.dia = ''; f.anio = ''; f.mes = ''; }
        this.cambioDePeriodo();
      });
      this.el('anio').addEventListener('change', () => {
        const f = this.filtro;
        f.dia = ''; f.anio = this.el('anio').value; f.mes = ''; this.limpiarRango();
        this.cambioDePeriodo();
      });
      this.el('mes').addEventListener('change', () => {
        const f = this.filtro;
        f.dia = ''; f.mes = this.el('mes').value;
        if (f.mes && !f.anio) f.anio = this.anios()[0] || String(new Date().getFullYear());   // un mes sin año no significa nada
        this.limpiarRango();
        this.cambioDePeriodo();
      });
      o.listas.forEach(l => this.el(l.clave).addEventListener('change', (e) => { this.filtro[l.clave] = e.target.value; this.cambio(); }));
      if (o.org) [['tipo-org', 'tipo'], ['org', 'organizacion']].forEach(([id, cual]) => this.el(id).addEventListener('change', (e) => {
        SRP.util.elegirInstitucion(cual, e.target.value, this.filtro); this.cambio();
      }));
      if (o.buscar) {
        let espera = null;
        this.el('buscar').addEventListener('input', () => {
          clearTimeout(espera);
          espera = setTimeout(() => { this.filtro.texto = this.el('buscar').value.trim(); this.cambio(); }, 150);
        });
      }
      this.el('quitar').addEventListener('click', () => this.reiniciar(true));
      this.el('fichas').addEventListener('click', (e) => {
        const b = e.target.closest('button[data-quitar]'); if (!b) return;
        this.quitar(b.dataset.quitar);
        SRP.util.anunciarSilencioso('Filtro quitado.');
      });
    },

    cambio() { if (this.o.alCambiar) this.o.alCambiar(); },

    // Al moverse de fecha, lo elegido en una lista que depende del periodo (la jornada de ese día) ya no aplica
    cambioDePeriodo() {
      this.o.listas.filter(l => l.conPeriodo).forEach(l => { this.filtro[l.clave] = ''; });
      this.cambio();
    },

    limpiarRango() {
      this.filtro.desde = ''; this.filtro.hasta = '';
      this.el('desde').value = ''; this.el('hasta').value = '';
    },

    aplicarAtajo(atajo) {
      const f = this.filtro;
      // «Un periodo» no filtra por sí mismo: enseña Desde y Hasta, y el rango entra con «Aplicar»
      if (atajo === 'periodo') { this.periodoAbierto = true; this.diaAbierto = false; this.sincronizar(); return; }
      if (atajo === 'dia') {
        this.diaAbierto = true; this.periodoAbierto = false;
        f.anio = ''; f.mes = ''; f.dia = this.el('dia').value;
        this.limpiarRango();
        this.cambioDePeriodo();
        return;
      }
      this.diaAbierto = false; this.periodoAbierto = false;
      this.el('dia').value = '';
      f.dia = atajo === 'hoy' ? SRP.util.fechaHoy() : '';
      f.anio = ''; f.mes = '';
      this.limpiarRango();
      this.cambioDePeriodo();
    },

    // Fija un día desde fuera (una vista que llega pidiendo «la jornada de tal fecha»)
    fijarDia(dia) {
      const f = this.filtro;
      f.dia = dia || ''; f.anio = ''; f.mes = ''; this.limpiarRango();
      this.periodoAbierto = false;
      this.diaAbierto = !!dia && dia !== SRP.util.fechaHoy();
      this.el('dia').value = this.diaAbierto ? dia : '';
    },

    /* Deja la zona como al abrir la vista: todo, sin búsqueda ni listas. Con `avisar`, lo dice y ofrece deshacer. */
    reiniciar(avisar) {
      const antes = Object.assign({}, this.filtro), dia = this.diaAbierto, per = this.periodoAbierto;
      Object.assign(this.filtro, this.vacio());
      this.diaAbierto = false; this.periodoAbierto = false;
      this.el('dia').value = ''; this.el('desde').value = ''; this.el('hasta').value = '';
      if (this.o.buscar) this.el('buscar').value = '';
      this.cambio();
      if (avisar) SRP.util.anunciar('Filtros quitados.', 'exito', { deshacer: () => {
        Object.assign(this.filtro, antes); this.diaAbierto = dia; this.periodoAbierto = per;
        this.el('dia').value = dia ? antes.dia : ''; this.el('desde').value = antes.desde; this.el('hasta').value = antes.hasta;
        if (this.o.buscar) this.el('buscar').value = antes.texto;
        this.cambio();
      } });
    },

    quitar(cual) {
      const f = this.filtro;
      if (cual === 'periodo') { this.aplicarAtajo('todas'); return; }
      if (cual === 'texto') { f.texto = ''; this.el('buscar').value = ''; }
      else if (cual === 'institucion') { f.tipo = ''; f.organizacion = ''; }
      else f[cual] = '';
      this.cambio();
    },

    /* ---------- Qué pasa ---------- */

    cumplePeriodo(e) {
      const f = this.filtro, d = this.o.fecha(e) || '';
      const periodo = f.anio ? f.anio + (f.mes ? '-' + f.mes : '') : '';
      return (!f.dia || d === f.dia) && (!periodo || d.startsWith(periodo)) && (!f.desde || d >= f.desde) && (!f.hasta || d <= f.hasta);
    },

    // Todas las palabras, en cualquier orden, sin acentos ni mayúsculas
    cumpleTexto(e) {
      const f = this.filtro;
      if (!f.texto || !this.o.buscar) return true;
      const t = SRP.util.normalizar(this.o.buscar.texto(e));
      return SRP.util.normalizar(f.texto).split(/\s+/).every(p => t.includes(p));
    },

    // ¿Pasa los filtros de lista, salvo los de `excluir`?
    cumpleListas(e, excluir) {
      const f = this.filtro, x = k => !excluir || !excluir.has(k);
      const tiene = (v, elegido) => [].concat(v).includes(elegido);
      for (const l of this.o.listas) { if (f[l.clave] && x(l.clave) && this.visible(l) && !tiene(l.valor(e), f[l.clave])) return false; }
      if (this.conInstituciones()) {
        const org = this.o.org(e);
        if (f.organizacion && x('organizacion') && org !== f.organizacion) return false;
        if (f.tipo && x('tipo') && SRP.util.tipoDe(org) !== f.tipo) return false;
      }
      return true;
    },

    cumple(e) { return this.cumpleTexto(e) && this.cumplePeriodo(e) && this.cumpleListas(e); },

    // ¿Hay algo filtrando?
    activo() { return this.fichas().length > 0; },

    /* Recibe los elementos de la vista, pone los controles al día y devuelve los que pasan. */
    usar(items) {
      this.items = items;
      const hoy = SRP.util.fechaHoy();
      ['dia', 'desde', 'hasta'].forEach(k => { this.el(k).max = hoy; });
      SRP.util.pintarChipHoy(this.el('chip-hoy'));
      if (!this.conInstituciones()) { this.filtro.tipo = ''; this.filtro.organizacion = ''; }
      this.o.listas.forEach(l => { if (!this.visible(l)) this.filtro[l.clave] = ''; });
      this.llenarAnios();
      this.llenarListas();
      this.sincronizar();
      this.pintarFichas();
      return items.filter(e => this.cumple(e));
    },

    /* ---------- Controles ---------- */

    anios() { return [...new Set(this.items.map(e => String(this.o.fecha(e) || '').slice(0, 4)).filter(Boolean))].sort().reverse(); },

    llenarAnios() {
      const f = this.filtro, anios = this.anios(), actual = String(new Date().getFullYear());
      if (!anios.includes(actual)) anios.unshift(actual);   // el año en curso siempre se puede elegir
      if (f.anio && !anios.includes(f.anio)) anios.push(f.anio);
      this.el('anio').innerHTML = SRP.util.opciones('Todos', anios.map(a => [a, a]));
      // Sólo los meses con algo en el año elegido
      const meses = f.anio ? [...new Set(this.items.map(e => this.o.fecha(e) || '').filter(d => d.startsWith(f.anio)).map(d => d.slice(5, 7)))].sort() : [];
      if (f.mes && !meses.includes(f.mes)) meses.push(f.mes);
      this.el('mes').innerHTML = SRP.util.opciones('Todos', meses.sort().map(m => [m, SRP.util.nombreMes('2000-' + m, true)]));
    },

    llenarListas() {
      const f = this.filtro, o = this.o, ver = this.conInstituciones();
      const valores = {};
      o.listas.forEach(l => { if (!l.opciones) valores[l.clave] = l.valor; });
      if (ver) { valores.organizacion = e => o.org(e); valores.tipo = e => SRP.util.tipoDe(o.org(e)); }
      const cumple = (e, ex) => this.cumpleListas(e, ex);
      const fac = SRP.util.facetas(this.items, cumple, valores);
      // Las listas que dependen del periodo se llenan con lo que hay en las fechas elegidas
      const enPeriodo = o.listas.some(l => l.conPeriodo) ? SRP.util.facetas(this.items.filter(e => this.cumplePeriodo(e) && this.cumpleTexto(e)), cumple, valores) : fac;
      o.listas.forEach(l => {
        const sel = this.el(l.clave), caja = this.caja(l.clave);
        caja.hidden = !this.visible(l);
        if (caja.hidden) return;
        if (l.opciones) { sel.innerHTML = SRP.util.opciones(l.vacio, l.opciones); sel.value = f[l.clave]; return; }
        const hay = [...(l.conPeriodo ? enPeriodo : fac)[l.clave]];
        if (l.personas) {
          sel.innerHTML = SRP.util.opciones(l.vacio, SRP.util.paresPersonas(hay.concat(f[l.clave] || [])));
          sel.value = f[l.clave];
        } else if (l.orden) {
          // Con orden propio (las jornadas, de la más reciente a la más antigua); lo elegido se queda
          const ids = [...new Set(hay.concat(f[l.clave] || []))].sort(l.orden);
          sel.innerHTML = SRP.util.opciones(l.vacio, ids.map(v => [v, l.nombre(v)]));
          sel.value = f[l.clave];
        } else SRP.util.llenarLista(sel, l.vacio, hay.map(v => [v, l.nombre ? l.nombre(v) : v]), f, l.clave, l.nombre);
        sel.disabled = sel.options.length < 2;
      });
      if (o.org) {
        this.caja('tipo-org').hidden = !ver; this.caja('org').hidden = !ver;
        if (ver) SRP.util.llenarInstituciones(this.el('tipo-org'), this.el('org'), fac.organizacion, f, fac.tipo);
      }
    },

    // Deja los controles mostrando exactamente lo que dice `filtro`
    sincronizar() {
      const f = this.filtro, o = this.o;
      this.el('anio').value = f.anio;
      this.el('mes').value = f.mes;
      this.el('mes').disabled = !f.anio;
      if (o.buscar && this.el('buscar').value.trim() !== f.texto) this.el('buscar').value = f.texto;
      const periodo = f.anio ? f.anio + (f.mes ? '-' + f.mes : '') : '';
      const conRango = !!(f.desde || f.hasta);
      // Un solo atajo marcado a la vez
      const pidePeriodo = conRango || this.periodoAbierto;
      const pideDia = !pidePeriodo && this.diaAbierto;
      const activo = { hoy: !pidePeriodo && !pideDia && f.dia === SRP.util.fechaHoy(), dia: pideDia, todas: !pidePeriodo && !pideDia && !f.dia && periodo === '', periodo: pidePeriodo };
      SRP.util.atajos.marcar(this.el('atajos'), activo, { periodo: [this.el('periodo'), pidePeriodo], dia: [this.el('un-dia'), pideDia] });
      // Año y mes son otra manera de decir el periodo: sólo acompañan a «Todas»
      const sinAnioMes = pidePeriodo || pideDia || activo.hoy;
      this.caja('anio').hidden = sinAnioMes; this.caja('mes').hidden = sinAnioMes;
      // El resumen de «Más filtros» dice lo elegido dentro; si no hay nada, lo que ofrece
      const dentro = [f.anio ? (f.mes ? SRP.util.nombreMes(f.anio + '-' + f.mes, true) + ' ' + f.anio : f.anio) : '']
        .concat(this.fichas().filter(x => !['periodo', 'texto'].includes(x[0])).map(x => x[1].replace(/^[^:]+: /, ''))).filter(Boolean);
      const disponibles = [sinAnioMes ? '' : 'año', sinAnioMes ? '' : 'mes'].concat(o.listas.filter(l => this.visible(l)).map(l => l.etiqueta.toLowerCase()), this.conInstituciones() ? ['institución'] : []).filter(Boolean);
      this.el('mas-texto').textContent = 'Más filtros: ' + (dentro.length ? dentro.join(' · ') : SRP.util.enumerar(disponibles));
    },

    // Lo que está filtrando: [qué quitar, texto]
    fichas() {
      const f = this.filtro, o = this.o, fmt = d => SRP.util.formatearFecha(d), salida = [];
      if (f.texto && o.buscar) salida.push(['texto', 'Buscar: ' + f.texto]);
      let periodo = '';
      if (f.desde || f.hasta) periodo = f.desde && f.hasta ? fmt(f.desde) + ' al ' + fmt(f.hasta) : (f.desde ? 'Desde ' + fmt(f.desde) : 'Hasta ' + fmt(f.hasta));
      else if (f.dia) periodo = (f.dia === SRP.util.fechaHoy() ? 'Hoy, ' : '') + fmt(f.dia);
      else if (f.anio) periodo = f.mes ? SRP.util.nombreMes(f.anio + '-' + f.mes) : f.anio;
      if (periodo) salida.push(['periodo', periodo]);
      o.listas.forEach(l => {
        const v = f[l.clave]; if (!v || !this.visible(l)) return;
        const texto = l.opciones ? (l.opciones.find(x => x[0] === v) || [v, v])[1] : l.personas ? SRP.ref.nombreUsuario(v) : l.nombre ? l.nombre(v) : v;
        salida.push([l.clave, (l.ficha || l.etiqueta) + ': ' + texto]);
      });
      if (this.conInstituciones()) {
        if (f.organizacion) salida.push(['institucion', 'Institución: ' + SRP.ref.nombreOrganizacion(f.organizacion)]);
        else if (f.tipo) salida.push(['institucion', 'Tipo: ' + f.tipo]);
      }
      return salida;
    },

    pintarFichas() {
      const fichas = this.fichas();
      SRP.util.pintarFichas(this.el('fichas'), fichas);
      this.el('quitar').hidden = !fichas.length;
    }
  }
};
