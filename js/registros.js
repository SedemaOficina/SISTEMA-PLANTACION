/* LISTADO DE REGISTROS: lo que cada perfil puede ver, con filtros por fecha. */
window.SRP = window.SRP || {};

SRP.registros = {
  // anio y mes son el camino normal; desde/hasta es el rango fino. Los dos no conviven:
  // elegir uno limpia el otro, para que la pantalla nunca muestre dos criterios a la vez.
  // dia gana sobre anio/mes cuando está puesto; el rango los limpia a los tres.
  // Al entrar, el filtro es el día de hoy: en campo lo que interesa es la jornada en curso.
  filtro: { dia: '', anio: '', mes: '', desde: '', hasta: '', cabo: '' },
  primeraVez: true,
  visibles: [], filtrados: [], mostrados: 0,

  el(id) { return document.getElementById(id); },

  iniciar() {
    SRP.util.atajos.iniciar(this.el('filtro-atajos'), a => this.aplicarAtajo(a));   // M15
    this.el('filtro-anio').addEventListener('change', () => {
      this.filtro.dia = '';
      this.filtro.anio = this.el('filtro-anio').value;
      this.filtro.mes = '';                 // al cambiar de año, el mes elegido puede no existir ahí
      this.limpiarRango();
      this.llenarMeses();
      this.sincronizarControles();
      this.aplicar();
    });
    this.el('filtro-mes').addEventListener('change', () => {
      this.filtro.dia = '';
      this.filtro.mes = this.el('filtro-mes').value;
      if (this.filtro.mes && !this.filtro.anio) {   // un mes sin año no significa nada
        this.filtro.anio = this.aniosDisponibles()[0] || String(new Date().getFullYear());
        this.el('filtro-anio').value = this.filtro.anio;
      }
      this.limpiarRango();
      this.sincronizarControles();
      this.aplicar();
    });
    // El cabo se aplica al elegirlo; ya no pasa por «Aplicar», que es sólo del rango
    this.el('filtro-cabo').addEventListener('change', () => {
      this.filtro.cabo = this.el('filtro-cabo').value;
      this.aplicar();
    });
    // Desde y Hasta no se encadenan ni se aplican solos: el rango entra con «Aplicar» (D82, que supera D75)
    this.el('btn-filtrar').addEventListener('click', () => {
      const desde = this.el('filtro-desde').value;
      const hasta = this.el('filtro-hasta').value;
      if (desde && hasta && desde > hasta) {
        SRP.util.anunciar('La fecha «Desde» es posterior a «Hasta». Corrija el rango.', 'alerta');
        return;
      }
      this.filtro.desde = desde;
      this.filtro.hasta = hasta;
      if (desde || hasta) { this.filtro.dia = ''; this.filtro.anio = ''; this.filtro.mes = ''; }
      this.sincronizarControles();
      this.aplicar();
    });
    // «Un día» se aplica al elegir la fecha: es un solo dato, no hace falta «Aplicar» (D113)
    this.el('filtro-dia').addEventListener('change', () => {
      this.filtro.dia = this.el('filtro-dia').value;
      this.diaAbierto = true;
      this.sincronizarControles();
      this.aplicar();
    });
    this.el('btn-reiniciar-filtros').addEventListener('click', () => this.reiniciarFiltros());
    // En teléfono los filtros se pliegan tras «Filtros» (D100); en escritorio el botón no se ve
    this.el('btn-filtros').addEventListener('click', () => this.plegarFiltros(this.el('panel-filtros').dataset.abierto !== 'true'));
    // Cada ficha de filtro activo se quita con su × (D100)
    this.el('filtros-activos').addEventListener('click', (e) => {
      const b = e.target.closest('button[data-quitar]'); if (!b) return;
      if (b.dataset.quitar === 'periodo') this.aplicarAtajo('todos');
      if (b.dataset.quitar === 'cabo') { this.filtro.cabo = ''; this.el('filtro-cabo').value = ''; this.aplicar(); }
      SRP.util.anunciarSilencioso('Filtro quitado.');
    });
    this.el('btn-mas').addEventListener('click', () => this.pintar(true));
    this.el('registros-vacio').addEventListener('click', (e) => {
      const b = e.target.closest('button[data-vacio]'); if (!b) return;
      if (b.dataset.vacio === 'todos') this.aplicarAtajo('todos');
      if (b.dataset.vacio === 'quitar') this.quitarFiltros();
      if (b.dataset.vacio === 'registrar') SRP.app.mostrarVista('registrar');
    });
    this.el('lista-registros').addEventListener('click', (e) => {
      // Tocar la tarjeta fuera de la tuerca abre el detalle: el atajo del uso más común (D100).
      // Con teclado se llega por la tuerca, que ofrece «Ver detalle»
      if (!e.target.closest('.registro-acciones')) {
        const li = e.target.closest('.registro[data-id]');
        const rr = li && this.visibles.find(x => x.id === li.dataset.id);
        if (rr) this.verDetalle(rr);
        return;
      }
      const b = e.target.closest('button[data-accion]'); if (!b) return;
      const r = this.visibles.find(x => x.id === b.dataset.id); if (!r) return;
      if (b.dataset.accion === 'ver') this.verDetalle(r);
      if (b.dataset.accion === 'editar') SRP.formulario.editar(r);
      if (b.dataset.accion === 'eliminar') this.eliminar(r);
    });
    this.el('btn-detalle-editar').innerHTML = SRP.ICONOS.svg('lapiz') + '<span>Editar</span>';
    // Editar desde el detalle: cierra la ficha y abre el registro en el formulario (D91)
    this.el('btn-detalle-editar').addEventListener('click', () => {
      const r = this.detalleActual; if (!r) return;
      this.el('dlg-detalle').close();
      SRP.formulario.editar(r);
    });
    // Cerrar el detalle sin editar no deja marcado el regreso a Jornadas
    this.el('dlg-detalle').addEventListener('close', () => { if (SRP.app.vista === 'jornadas' && !SRP.formulario.estado.editando) SRP.jornadas.volverAlDetalle = false; });
    // Al cerrar, su mapa se destruye: uno vivo en un diálogo oculto sigue consumiendo y contando
    this.el('dlg-detalle').addEventListener('close', () => {
      if (this.mapaDetalle) { this.mapaDetalle.remove(); this.mapaDetalle = null; }
    });
  },

  async preparar() {
    const u = SRP.sesion.usuario;
    const alcance = SRP.permisos.de(u).alcance;
    this.el('titulo-registros').textContent =
      alcance === 'propios' ? 'Mis registros' : alcance === 'equipo' ? 'Registros de mi cuadrilla' : 'Todos los registros';
    // Nombre de la jornada de cada registro, para la tarjeta (D134)
    this.jornadasPorId = Object.fromEntries((await SRP.almacen.todos('jornadas')).map(j => [j.id, j.nombre]));
    const todos = await SRP.almacen.porIndice('plantaciones', 'estatus', 'activo');
    this.visibles = todos.filter(r => SRP.permisos.alcanza(u, r, SRP.ref.usuarioPorId))
      .sort((a, b) => b.fecha_plantacion.localeCompare(a.fecha_plantacion) || b.fecha_registro.localeCompare(a.fecha_registro));

    // Filtro por cabo sólo para perfiles que ven a más de una persona
    const caja = this.el('caja-filtro-cabo');
    caja.hidden = alcance === 'propios';
    if (!caja.hidden) {
      const ids = [...new Set(this.visibles.map(r => r.cabo_id))];
      const sel = this.el('filtro-cabo');
      sel.innerHTML = SRP.util.opciones('Todos', SRP.util.paresPersonas(ids));   // M15
      sel.value = this.filtro.cabo;
    }
    // El atajo lleva la fecha para que nadie dude de qué día habla; va en un segundo renglón
    // para que quepa en un tercio del teléfono. La coma oculta hace que se lea «Hoy, 22-SEP-26» (D95, D147)
    SRP.util.pintarChipHoy(this.el('chip-hoy'));
    // Al entrar se ven todos los registros (D104): «Hoy» queda como atajo, no como filtro de inicio
    if (this.primeraVez) { this.primeraVez = false; }
    this.llenarAnios();
    this.llenarMeses();
    this.sincronizarControles();
    this.aplicar();
  },

  /* Deja los filtros como al abrir la vista por primera vez: todos los registros, sin año ni mes,
     sin rango y todos los cabos (D104). Es distinto de «Todos», que sólo quita el periodo y respeta el cabo. */
  reiniciarFiltros() {
    const antes = Object.assign({}, this.filtro);
    this.filtro = { dia: '', anio: '', mes: '', desde: '', hasta: '', cabo: '' };
    this.el('filtro-cabo').value = '';
    this.periodoAbierto = false;
    this.diaAbierto = false;
    this.el('filtro-dia').value = '';
    this.limpiarRango();
    this.llenarMeses();
    this.sincronizarControles();
    this.aplicar();
    SRP.util.anunciar('Filtros quitados: todos los registros.', 'exito', { deshacer: () => this.volverAFiltro(antes) });
  },

  // Devuelve los filtros a como estaban antes de «Quitar filtros» (D101)
  volverAFiltro(f) {
    this.filtro = Object.assign({}, f);
    this.el('filtro-cabo').value = f.cabo || '';
    this.el('filtro-desde').value = f.desde || ''; this.el('filtro-hasta').value = f.hasta || '';
    this.periodoAbierto = !!(f.desde || f.hasta);
    this.diaAbierto = !!f.dia && f.dia !== SRP.util.fechaHoy();
    this.el('filtro-dia').value = this.diaAbierto ? f.dia : '';
    this.llenarMeses();
    this.sincronizarControles();
    this.aplicar();
  },

  /* ---------- Periodo ---------- */

  // Años con registros, del más reciente al más antiguo
  aniosDisponibles() {
    return [...new Set(this.visibles.map(r => r.fecha_plantacion.slice(0, 4)))].sort().reverse();
  },

  llenarAnios() {
    const anios = this.aniosDisponibles();
    const actual = String(new Date().getFullYear());
    if (!anios.includes(actual)) anios.unshift(actual);   // el año en curso siempre se puede elegir
    this.el('filtro-anio').innerHTML = SRP.util.opciones('Todos', anios.map(a => [a, a]));
  },

  // Sólo los meses que tienen registros en el año elegido: evita elegir un mes vacío
  llenarMeses() {
    const anio = this.filtro.anio;
    const meses = anio
      ? [...new Set(this.visibles.filter(r => r.fecha_plantacion.startsWith(anio)).map(r => r.fecha_plantacion.slice(5, 7)))].sort()
      : [];
    const sel = this.el('filtro-mes');
    sel.innerHTML = SRP.util.opciones('Todos', meses.map(m => [m, SRP.util.nombreMes('2000-' + m, true)]));
    sel.disabled = !anio;
    sel.value = meses.includes(this.filtro.mes) ? this.filtro.mes : '';
    if (sel.value !== this.filtro.mes) this.filtro.mes = sel.value;
  },

  aplicarAtajo(atajo) {
    const f = this.filtro;
    // «Un periodo» no filtra por sí mismo: muestra Desde/Hasta y el filtro entra con «Aplicar».
    // No abre el selector ni mueve el foco (D82)
    if (atajo === 'periodo') {
      this.periodoAbierto = true;
      this.diaAbierto = false;
      this.sincronizarControles();
      return;
    }
    /* «Un día» muestra una sola fecha; filtra en cuanto se elige (D113). Si ya había un día
       elegido, se conserva; si no, la lista sigue completa hasta elegirlo. */
    if (atajo === 'dia') {
      this.diaAbierto = true;
      this.periodoAbierto = false;
      f.anio = ''; f.mes = '';
      f.dia = this.el('filtro-dia').value;
      this.limpiarRango();
      this.llenarMeses();
      this.sincronizarControles();
      this.aplicar();
      return;
    }
    this.diaAbierto = false;
    this.el('filtro-dia').value = '';
    f.dia = '';
    if (atajo === 'hoy') { f.dia = SRP.util.fechaHoy(); f.anio = ''; f.mes = ''; }
    else { f.anio = ''; f.mes = ''; }   // 'todos'
    this.periodoAbierto = false;
    this.limpiarRango();
    this.llenarMeses();            // ajusta el mes si ese año no tiene registros de ese mes
    this.sincronizarControles();
    this.aplicar();
  },

  limpiarRango() {
    this.filtro.desde = ''; this.filtro.hasta = '';
    this.el('filtro-desde').value = ''; this.el('filtro-hasta').value = '';
  },

  // Deja los controles mostrando exactamente lo que dice this.filtro
  sincronizarControles() {
    const f = this.filtro;
    this.el('filtro-anio').value = f.anio;
    this.el('filtro-mes').value = f.mes;
    this.el('filtro-mes').disabled = !f.anio;
    const periodo = f.anio ? f.anio + (f.mes ? '-' + f.mes : '') : '';
    const sinRango = !f.desde && !f.hasta;
    // Un solo atajo marcado a la vez (D104): al abrir «Un periodo» se marca él y se desmarcan los
    // otros, aunque el rango entre hasta «Aplicar». Antes «Todos» seguía marcado y «Un periodo»
    // llevaba contorno guinda: parecían elegidos los dos.
    const pidePeriodo = !sinRango || !!this.periodoAbierto;
    const pideDia = !pidePeriodo && !!this.diaAbierto;
    const activo = {
      hoy: !pidePeriodo && !pideDia && f.dia === SRP.util.fechaHoy(),
      dia: pideDia,
      todos: !pidePeriodo && !pideDia && !f.dia && periodo === '',
      periodo: pidePeriodo
    };
    // Desde/Hasta se ven mientras haya rango o se haya pedido «Un periodo»
    const abierto = !sinRango || !!this.periodoAbierto;
    SRP.util.atajos.marcar(this.el('filtro-atajos'), activo, { periodo: [this.el('filtro-periodo'), abierto], dia: [this.el('filtro-un-dia'), pideDia] });   // M15
    // Año/Mes y Desde/Hasta son dos maneras de decir el periodo: nunca se ven a la vez (D100)
    this.el('caja-filtro-anio').hidden = abierto || pideDia;
    this.el('caja-filtro-mes').hidden = abierto || pideDia;
    // El acordeón «Más filtros» (D129): su resumen dice lo elegido dentro; si nada de lo suyo aplica, no se ve
    const conCabo = !this.el('caja-filtro-cabo').hidden;
    const dentro = [f.anio ? (f.mes ? SRP.util.nombreMes(f.anio + '-' + f.mes, true) + ' ' + f.anio : f.anio) : '', f.cabo ? SRP.ref.nombreUsuario(f.cabo) : ''].filter(Boolean);
    const disponibles = [(abierto || pideDia) ? '' : 'año, mes', conCabo ? 'cabo' : ''].filter(Boolean);
    this.el('filtro-mas-filtros').hidden = !disponibles.length;
    this.el('filtro-mas-filtros-texto').textContent = dentro.length ? 'Más filtros: ' + dentro.join(' · ') : 'Más filtros: ' + disponibles.join(' y ');
  },

  aplicar() {
    const f = this.filtro;
    const periodo = f.anio ? f.anio + (f.mes ? '-' + f.mes : '') : '';
    this.filtrados = this.visibles.filter(r =>
      (!f.dia || r.fecha_plantacion === f.dia) &&
      (!periodo || r.fecha_plantacion.startsWith(periodo)) &&
      (!f.desde || r.fecha_plantacion >= f.desde) &&
      (!f.hasta || r.fecha_plantacion <= f.hasta) &&
      (!f.cabo || r.cabo_id === f.cabo));
    this.pintarFichas();
    this.pintar(false);
  },

  /* Filtros activos como fichas con × (D100). Lo que ya está a la vista en la lista no se
     repite: sólo el periodo y el cabo, cuando los hay. El número va también en «Filtros». */
  pintarFichas() {
    const f = this.filtro, fmt = d => SRP.util.formatearFecha(d), esc = t => SRP.util.escapar(t);
    const fichas = [];
    let periodo = '';
    if (f.desde || f.hasta) periodo = f.desde && f.hasta ? fmt(f.desde) + ' al ' + fmt(f.hasta) : (f.desde ? 'Desde ' + fmt(f.desde) : 'Hasta ' + fmt(f.hasta));
    else if (f.dia) periodo = (f.dia === SRP.util.fechaHoy() ? 'Hoy, ' : '') + fmt(f.dia);
    else if (f.anio) periodo = f.mes ? SRP.util.nombreMes(f.anio + '-' + f.mes) : f.anio;
    if (periodo) fichas.push(['periodo', periodo]);
    if (f.cabo) fichas.push(['cabo', 'Cabo: ' + SRP.ref.nombreUsuario(f.cabo)]);
    this.el('filtros-activos').innerHTML = fichas.map(([q, t]) =>
      '<li class="ficha-filtro"><span>' + esc(t) + '</span><button type="button" data-quitar="' + q + '" aria-label="Quitar filtro ' + esc(t) + '">' +
      SRP.ICONOS.svg('cerrar', 'chico') + '</button></li>').join('');
    const cuenta = this.el('filtros-cuenta');
    cuenta.hidden = !fichas.length;
    cuenta.textContent = fichas.length;
    this.el('btn-filtros').setAttribute('aria-label', 'Filtros' + (fichas.length ? ', ' + fichas.length + (fichas.length === 1 ? ' activo' : ' activos') : ''));
  },

  plegarFiltros(abrir) {
    this.el('panel-filtros').dataset.abierto = String(abrir);
    this.el('btn-filtros').setAttribute('aria-expanded', String(abrir));
    // Las fichas sólo se ven con el panel plegado: abierto, los atajos ya dicen lo mismo (D105)
    this.el('filtros-activos').dataset.visible = String(!abrir);
  },

  pintar(agregar) {
    const u = SRP.sesion.usuario;
    const variosAutores = SRP.permisos.de(u).alcance !== 'propios';
    this.mostrados = agregar ? this.mostrados + SRP.CONFIG.LISTA_PAGINA : SRP.CONFIG.LISTA_PAGINA;
    const pagina = this.filtrados.slice(0, this.mostrados);
    const esc = SRP.util.escapar;
    // Envío simulado (D111): la tarjeta dice si el registro espera envío; enviado no lleva marca
    const envio = SRP.envio.simulado() ? SRP.envio.leer() : null;
    this.el('lista-registros').innerHTML = pagina.map(r => {
      const est = envio && r.es_ficticio ? SRP.envio.estado(r, envio) : null;
      const esp = SRP.ref.especieDe(r);
      // Acciones en el menú de la tuerca (D94): sólo las que el perfil permite
      const items = [{ accion: 'ver', texto: 'Ver detalle', icono: 'ver' }];
      if (SRP.permisos.puedeEditar(u, r, SRP.ref.usuarioPorId)) items.push({ accion: 'editar', texto: 'Editar', icono: 'lapiz' });
      if (SRP.permisos.puedeEliminar(u, r, SRP.ref.usuarioPorId)) items.push({ accion: 'eliminar', texto: 'Eliminar', icono: 'basura', peligro: true });
      const menu = SRP.ICONOS.menuAcciones(r.id, esp.comun + ' del ' + SRP.util.formatearFecha(r.fecha_plantacion), items);
      // Tarjeta (D100): miniatura, especie, lugar y fecha, con la tuerca arriba a la derecha.
      // «PROVISIONAL» ya no se repite en cada tarjeta: lo dicen el detalle, la ficha y el PDF (R1);
      // el folio sólo aparece cuando exista
      const foto = SRP.util.fotoSegura(r.foto_base64);
      const mini = foto
        ? '<img class="registro-miniatura" src="' + foto + '" alt="" loading="lazy">'
        : '<span class="registro-miniatura registro-sin-foto" aria-hidden="true">' + SRP.ICONOS.svg('registros', 'grande') + '</span>';
      /* Anatomía común de tarjeta (D141), la misma de Jornadas y Reportes: 1) qué —la especie—,
         2) cuándo y quién, 3) fila de estado —folio y envío—, 4) dónde —jornada y lugar—; la
         tuerca, arriba a la derecha (D100) */
      const estado = this.htmlEstado(r, est);
      return '<li class="registro" data-id="' + SRP.util.escapar(r.id) + '">' + mini + '<div class="registro-datos">' +
        '<span class="registro-especie">' + esc(esp.comun) + (esp.cientifico ? ' <i>(' + esc(esp.cientifico) + ')</i>' : '') + '</span>' +
        // Cuándo y estado en un mismo renglón: la tarjeta sigue compacta (D100) en una lista larga
        '<span class="registro-meta"><span class="registro-fecha">' + this.htmlFecha(r, variosAutores) + '</span>' +
        '<span class="registro-estado"' + (estado ? '' : ' hidden') + '>' + estado + '</span></span>' +
        '<span class="registro-lugar">' + SRP.ICONOS.svg('ubicacion', 'chico') + '<span>' +
        (r.jornada_id && this.jornadasPorId && this.jornadasPorId[r.jornada_id] ? '<b class="registro-jornada">' + esc(this.jornadasPorId[r.jornada_id]) + '</b> · ' : '') +
        esc(SRP.ref.alcaldia(r.alcaldia)) + (r.colonia ? ', ' + esc(r.colonia) : '') + '</span></span>' +
        '</div><div class="registro-acciones">' + menu + '</div></li>';
    }).join('');
    const n = this.filtrados.length;
    const propios = SRP.permisos.de(u).alcance === 'propios';
    this.el('registros-total').textContent = n === 0 ? ''
      : 'Total: ' + n + (n === 1 ? ' registro' : ' registros') + (n > pagina.length ? ' (se muestran ' + pagina.length + ')' : '');
    this.pintarVacio(n === 0, propios, u);
    this.el('btn-mas').hidden = n <= pagina.length;
  },

  htmlFecha(r, variosAutores) {
    const esc = SRP.util.escapar;
    return SRP.util.formatearFecha(r.fecha_plantacion) + (variosAutores ? ' · ' + esc(SRP.ref.nombreUsuario(r.cabo_id)) : '');
  },

  /* Fila de estado (D141): el folio cuando existe y, si espera envío, la marca (D111). Enviado y
     sin folio todavía no dice nada: «PROVISIONAL» no se repite en cada tarjeta (R1). */
  MARCAS: { por_enviar: 'Por enviar', cambios: 'Cambios por enviar' },
  htmlEstado(r, est) {
    const esc = SRP.util.escapar;
    return (SRP.folio.valido(r.folio) ? '<span class="etiqueta registro-folio">' + esc(r.folio) + '</span>' : '') +
      (this.MARCAS[est] ? '<span class="etiqueta marca-envio">' + SRP.ICONOS.svg('sinSenal', 'chico') + '<span>' + this.MARCAS[est] + '</span></span>' : '');
  },

  /* Después de un envío en segundo plano (D111) la lista se corrige en su lugar: folio nuevo y
     marca «Por enviar» fuera, sin repintar. Repintar cerraría el menú de la tuerca o movería la
     lista bajo el dedo de quien la está usando. */
  async refrescarEnvio() {
    if (!this.visibles) return;
    const u = SRP.sesion.usuario;
    const variosAutores = SRP.permisos.de(u).alcance !== 'propios';
    const e = SRP.envio.leer();
    const frescos = {};
    for (const r of await SRP.almacen.porIndice('plantaciones', 'estatus', 'activo')) frescos[r.id] = r;
    const cambiar = lista => (lista || []).forEach((r, i) => { if (frescos[r.id]) lista[i] = frescos[r.id]; });
    cambiar(this.visibles); cambiar(this.filtrados);
    this.el('lista-registros').querySelectorAll('li.registro').forEach(li => {
      const r = frescos[li.dataset.id];
      if (!r) return;
      li.querySelector('.registro-fecha').innerHTML = this.htmlFecha(r, variosAutores);
      const fila = li.querySelector('.registro-estado');
      const html = this.htmlEstado(r, r.es_ficticio ? SRP.envio.estado(r, e) : null);
      fila.innerHTML = html; fila.hidden = !html;
    });
  },

  // La fila «Envío» del detalle (D111)
  textoEnvio(r) {
    const e = SRP.envio.leer();
    const est = SRP.envio.estado(r, e);
    if (est === 'por_enviar') return 'Guardado en el teléfono, por enviar. Se envía solo cuando hay señal.';
    if (est === 'cambios') return 'Enviado; los cambios posteriores están por enviar.';
    const cuando = e.recibidos[r.id];
    return 'Recibido por el servidor' + (cuando ? ' ' + SRP.envio.cuando(cuando) : '') + ' (simulado).';
  },

  /* Estado vacío con salida (D96): en lugar de pedir «Toque Todos», el aviso trae el botón que
     resuelve. Tres casos: no hay ningún registro, no hay de hoy, o el filtro no encuentra nada.
     «Registrar árbol» sólo aparece a quien captura. */
  pintarVacio(vacio, propios, u) {
    const caja = this.el('registros-vacio');
    caja.hidden = !vacio;
    if (!vacio) { caja.innerHTML = ''; return; }
    const puedeRegistrar = !!SRP.permisos.de(u).registrar;
    const btnRegistrar = puedeRegistrar ? { accion: 'registrar', texto: 'Registrar árbol', clase: 'btn-primario', icono: 'mas' } : null;
    let icono = 'registros', titulo, texto, botones;
    if (this.visibles.length === 0) {
      titulo = propios ? 'Todavía no ha registrado ningún árbol.' : 'Todavía no hay registros.';
      texto = puedeRegistrar ? 'Cada árbol que registre aparecerá aquí.' : 'Aparecerán aquí en cuanto los cabos registren árboles.';
      botones = [btnRegistrar];
    } else if (this.filtro.dia === SRP.util.fechaHoy() && !this.filtro.desde && !this.filtro.hasta) {
      titulo = propios ? 'Todavía no ha registrado ningún árbol hoy.' : 'No hay registros de hoy.';
      texto = 'Los de días anteriores siguen guardados.';
      botones = [btnRegistrar, { accion: 'todos', texto: 'Ver todos', clase: 'btn-secundario' }];
    } else {
      icono = 'buscar';
      titulo = 'No hay registros con este filtro.';
      texto = 'Pruebe con otro periodo' + (this.filtro.cabo ? ' u otro cabo' : '') + ', o quite los filtros.';
      botones = [{ accion: 'quitar', texto: 'Quitar filtros', clase: 'btn-secundario' }];
    }
    caja.innerHTML = SRP.util.htmlVacio(icono, titulo, texto, botones);   // patrón común de los cuatro listados (D141)
  },

  // Quita todo filtro, cabo incluido: lo que pide el estado vacío cuando el filtro no encuentra nada
  quitarFiltros() {
    this.filtro = { dia: '', anio: '', mes: '', desde: '', hasta: '', cabo: '' };
    this.el('filtro-cabo').value = '';
    this.periodoAbierto = false;
    this.diaAbierto = false;
    this.el('filtro-dia').value = '';
    this.limpiarRango();
    this.llenarMeses();
    this.sincronizarControles();
    this.aplicar();
  },

  /* El detalle se lee igual que la ficha de revisión: el mapa arriba, los datos con su etiqueta
     en negritas, la fotografía al final donde se la nombra, y el historial cerrando. Así quien
     revisa un registro guardado ve lo mismo, en el mismo orden, que quien lo capturó. */
  async verDetalle(r) {
    const esc = SRP.util.escapar;
    this.detalleActual = r;
    this.el('detalle-pie').hidden = !SRP.permisos.puedeEditar(SRP.sesion.usuario, r, SRP.ref.usuarioPorId);
    const esp = SRP.ref.especieDe(r);
    // Mismo orden que el formulario y la ficha de revisión; lo que pone el sistema, al final (D100)
    const jornada = r.jornada_id ? await SRP.almacen.uno('jornadas', r.jornada_id) : null;
    const filas = [
      ['Especie', esc(esp.comun) + (esp.cientifico ? ' <i>(' + esc(esp.cientifico) + ')</i>' : '')],
      ['Programa', esc(SRP.ref.nombreCatalogo(r.programa_id))],
      ['Jornada', jornada ? esc(jornada.nombre) : 'Sin jornada'],
      ['Fecha de plantación', esc(SRP.util.formatearFecha(r.fecha_plantacion))],
      ['Alcaldía', esc(SRP.ref.alcaldia(r.alcaldia))],
      ['Colonia', esc(SRP.ref.colonia(r.colonia))],
      ['Coordenadas', r.lat.toFixed(5) + ', ' + r.lng.toFixed(5)],
      ['Cómo se obtuvo', SRP.formulario.textoOrigenRevision(r, false)],
      ['Cabo', esc(SRP.ref.nombreUsuario(r.cabo_id))],
      ['Comentarios', r.comentarios ? esc(r.comentarios) : 'Sin comentarios'],
      ['Fotografía', SRP.util.fotoSegura(r.foto_base64)
        ? '<img class="revision-foto" src="' + SRP.util.fotoSegura(r.foto_base64) + '" alt="Fotografía del árbol registrado">'
        : 'Sin fotografía']
    ];
    const incierta = SRP.folio.celdaIncierta(r);
    const sistema = [
      ['Folio', '<span class="folio-provisional">' + esc(SRP.folio.textoLargo(r)) + '</span>' +
        (incierta ? '<span class="revision-sub">' + esc(incierta) + '</span>' : '')],
      // La celda (su prefijo no es la alcaldía) y las capas con que se derivó el territorio (D152)
      ['Celda UGA', esc(r.uga || '—') + (r.uga_borde_m != null ? '<span class="revision-sub">A ' + r.uga_borde_m + ' m del borde de la celda</span>' : '')],
      ['Capas', esc(SRP.ref.textoCapas(r.capa_version))],
      ['Identificador', '<span class="revision-id">' + esc(r.id) + '</span>']
    ];
    if (SRP.envio.simulado() && r.es_ficticio) sistema.push(['Envío', esc(this.textoEnvio(r))]);

    const historial = await SRP.bitacora.deEntidad(r.id);
    const lineas = historial.length ? historial.map(h =>
      '<li>' + SRP.util.formatearFechaHora(h.fecha) + ': ' + esc(h.accion.toLowerCase().replace(/_/g, ' ')) + ' por ' + esc(h.usuario_nombre) +
      ' (' + esc(SRP.PERFILES[h.perfil] ? SRP.PERFILES[h.perfil].etiqueta : h.perfil) + ')' +
      (h.detalle ? '. ' + esc(h.detalle) : '') + '</li>').join('')
      : '<li>Sin movimientos registrados.</li>';

    this.el('dlg-detalle-cuerpo').innerHTML =
      '<dl class="revision-lista">' + filas.map(([etiqueta, valor]) =>
        '<div class="revision-fila revision-fila-sola"><dt>' + etiqueta + '</dt><dd>' + valor + '</dd></div>').join('') + '</dl>' +
      '<h3 class="titulo-bloque">Historial</h3><ul class="historial">' + lineas + '</ul>' +
      '<div class="revision-sistema"><p class="revision-sistema-titulo">Datos del sistema</p>' +
      sistema.map(([etiqueta, valor]) => '<div class="revision-fila revision-fila-sola"><dt>' + etiqueta + '</dt><dd>' + valor + '</dd></div>').join('') + '</div>' +
      (SRP.espejo ? SRP.espejo.htmlDetalle(r) : '');

    this.el('dlg-detalle').showModal();
    if (this.mapaDetalle) { this.mapaDetalle.remove(); this.mapaDetalle = null; }
    this.mapaDetalle = SRP.mapa.estatico('detalle-mapa', r.lat, r.lng);
  },

  /* Eliminar un registro se deshace (se marca, no se borra): no pregunta; el aviso dice cuál se
     eliminó y ofrece «Deshacer» (D139). La confirmación queda para lo que no tiene vuelta. */
  async eliminar(r) {
    if (!SRP.permisos.exigir('registro.eliminar', r)) return;
    // Retiro con constancia: se marca, no se borra (Norma 7.4)
    const nuevo = Object.assign({}, r, { estatus: 'eliminado', fecha_ultima_edicion: SRP.util.ahoraISO(), editado_por_id: SRP.sesion.usuario.id });
    await SRP.almacen.guardarConBitacora('plantaciones', nuevo, SRP.bitacora.entrada('ELIMINADO', 'plantacion', r.id));
    // «Deshacer» devuelve el registro tal como estaba y deja constancia (D101)
    const cual = SRP.folio.valido(r.folio) ? '(' + r.folio + ')' : 'del ' + SRP.util.formatearFecha(r.fecha_plantacion);
    SRP.util.anunciar('Registro de ' + SRP.ref.especieDe(r).comun + ' ' + cual + ' eliminado: ya no aparece en listados ni reportes.', 'exito', { deshacer: () => this.restaurar(r) });
    if (SRP.app.vista === 'jornadas') { SRP.jornadas.volverAlDetalle = false; SRP.jornadas.refrescar(); } else this.preparar();
    SRP.conexion.refrescar();   // la cuenta de la pastilla baja
  },

  /* Vuelve a activo el registro como está ahora en la base, no la copia de cuando se eliminó: si
     mientras tanto cambió la fecha o el programa de su jornada, vuelve con los de la jornada (D151).
     Sin su jornada no se restaura: quedaría en Registros y en ninguna jornada ni reporte. */
  async restaurar(r) {
    if (!SRP.permisos.exigir('registro.restaurar', r)) return;
    const actual = (await SRP.almacen.uno('plantaciones', r.id)) || r;
    const jornada = actual.jornada_id ? await SRP.almacen.uno('jornadas', actual.jornada_id) : null;
    if (!jornada) { SRP.util.anunciar('No se puede restaurar: su jornada ya no existe.', 'alerta'); return; }
    const vuelto = Object.assign({}, actual, { estatus: 'activo', fecha_plantacion: jornada.fecha, programa_id: jornada.programa_id,
      fecha_ultima_edicion: SRP.util.ahoraISO(), editado_por_id: SRP.sesion.usuario.id });
    await SRP.almacen.guardarConBitacora('plantaciones', vuelto, SRP.bitacora.entrada('RESTAURADO', 'plantacion', r.id, 'Se deshizo la eliminación'));
    SRP.util.anunciar('Registro restaurado.');
    if (SRP.app.vista === 'jornadas') SRP.jornadas.refrescar(); else this.preparar();
    SRP.conexion.refrescar();
  }
};

// Acciones que escriben en el teléfono: si fallan, se dice qué no se pudo hacer (D149)
SRP.util.proteger(SRP.registros, { eliminar: 'eliminar el registro', restaurar: 'restaurar el registro' });
