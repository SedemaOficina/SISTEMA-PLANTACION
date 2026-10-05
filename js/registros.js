/* LISTADO DE REGISTROS: lo que cada perfil puede ver, con filtros por fecha. */
window.SRP = window.SRP || {};

SRP.registros = {
  // anio y mes son el camino normal; desde/hasta es el rango fino. Los dos no conviven:
  // elegir uno limpia el otro, para que la pantalla nunca muestre dos criterios a la vez.
  // dia gana sobre anio/mes cuando está puesto; el rango los limpia a los tres.
  // Al entrar, el filtro es el día de hoy: en campo lo que interesa es la jornada en curso.
  filtro: { dia: '', anio: '', mes: '', desde: '', hasta: '', cabo: '', especie: '', programa: '', alcaldia: '', organizacion: '' },
  filtroVacio() { return { dia: '', anio: '', mes: '', desde: '', hasta: '', cabo: '', especie: '', programa: '', alcaldia: '', organizacion: '' }; },
  OTRA: '__otra',   // valor del filtro para «Otra especie» (sin especie del catálogo)
  primeraVez: true,
  visibles: [], filtrados: [], pagina: 1,

  el(id) { return document.getElementById(id); },

  iniciar() {
    SRP.util.atajos.iniciar(this.el('filtro-atajos'), a => this.aplicarAtajo(a));   // M15
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
    // Especie, programa, alcaldía e institución
    ['especie', 'programa', 'alcaldia'].forEach(k => this.el('filtro-' + k).addEventListener('change', (e) => { this.filtro[k] = e.target.value; this.sincronizarControles(); this.aplicar(); }));
    this.el('filtro-org').addEventListener('change', (e) => { this.filtro.organizacion = e.target.value; this.sincronizarControles(); this.aplicar(); });
    // En teléfono los filtros se pliegan tras «Filtros» (D100); en escritorio el botón no se ve
    this.el('btn-filtros').addEventListener('click', () => this.plegarFiltros(this.el('panel-filtros').dataset.abierto !== 'true'));
    // Cada ficha de filtro activo se quita con su × (D100)
    this.el('filtros-activos').addEventListener('click', (e) => {
      const b = e.target.closest('button[data-quitar]'); if (!b) return;
      if (b.dataset.quitar === 'periodo') this.aplicarAtajo('todos');
      if (b.dataset.quitar === 'cabo') { this.filtro.cabo = ''; this.el('filtro-cabo').value = ''; this.sincronizarControles(); this.aplicar(); }
      if (['especie', 'programa', 'alcaldia'].includes(b.dataset.quitar)) { this.filtro[b.dataset.quitar] = ''; this.el('filtro-' + b.dataset.quitar).value = ''; this.sincronizarControles(); this.aplicar(); }
      if (b.dataset.quitar === 'institucion') { this.filtro.organizacion = ''; this.llenarInstituciones(); this.sincronizarControles(); this.aplicar(); }
      SRP.util.anunciarSilencioso('Filtro quitado.');
    });
    this.el('registros-vacio').addEventListener('click', (e) => {
      const b = e.target.closest('button[data-vacio]'); if (!b) return;
      if (b.dataset.vacio === 'todos') this.aplicarAtajo('todos');
      if (b.dataset.vacio === 'quitar') this.quitarFiltros();
      if (b.dataset.vacio === 'registrar') SRP.app.mostrarVista('registrar');
    });
    SRP.ICONOS.poner(this.el('btn-detalle-sustituir'), 'intercambio', 'medio');
    this.el('btn-detalle-sustituir').insertAdjacentHTML('beforeend', '<span>Sustituir árbol</span>');
    this.el('btn-detalle-sustituir').addEventListener('click', () => { if (this.detalleActual) this.sustituir(this.detalleActual); });
    this.el('btn-sustituir-cerrar').addEventListener('click', () => this.el('dlg-sustituir').close());
    this.el('sustituir-motivos').addEventListener('click', (e) => { const c = e.target.closest('.chip[data-motivo]'); if (c) this.elegirMotivo(c.dataset.motivo); });
    this.el('btn-sustituir-seguir').addEventListener('click', () => this.seguirSustitucion());
    this.el('btn-sustituir-hoy').addEventListener('click', () => { this.el('sustituir-fecha').value = SRP.util.fechaHoy(); this.el('sustituir-error').hidden = true; });
    this.el('sustituir-fecha').addEventListener('change', () => { this.el('sustituir-error').hidden = true; });
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
      if (b.dataset.accion === 'sustituir') this.sustituir(r);
    });
    this.el('btn-detalle-editar').innerHTML = SRP.ICONOS.svg('lapiz', 'medio') + '<span>Editar</span>';
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
      alcance === 'propios' ? 'Mis registros' : alcance === 'equipo' ? 'Registros de mi cuadrilla' : alcance === 'institucion' ? 'Registros de mi institución' : 'Todos los registros';
    // Nombre de la jornada de cada registro, para la tarjeta (D134)
    const jornadas = await SRP.almacen.todos('jornadas');
    this.jornadasPorId = Object.fromEntries(jornadas.map(j => [j.id, j.nombre]));
    // La institución de un árbol es la de su jornada (o, sin jornada, la de quien lo registró)
    this.orgPorJornada = Object.fromEntries(jornadas.map(j => [j.id, j.organizacion_id]));
    const todos = await SRP.almacen.porIndice('plantaciones', 'estatus', 'activo');
    this.visibles = todos.filter(r => SRP.permisos.alcanza(u, r, SRP.ref.usuarioPorId))
      .sort((a, b) => b.fecha_plantacion.localeCompare(a.fecha_plantacion) || b.fecha_registro.localeCompare(a.fecha_registro));

    // «Quién registró» sólo para perfiles que ven a más de una persona
    this.el('caja-filtro-cabo').hidden = alcance === 'propios';
    this.llenarListas();
    // El atajo lleva la fecha para que nadie dude de qué día habla; va en un segundo renglón
    // para que quepa en un tercio del teléfono. La coma oculta hace que se lea «Hoy, 22-SEP-26» (D95, D147)
    SRP.util.pintarChipHoy(this.el('chip-hoy'));
    // Al entrar se ven todos los registros (D104): «Hoy» queda como atajo, no como filtro de inicio
    if (this.primeraVez) { this.primeraVez = false; }
    this.sincronizarControles();
    this.aplicar();
  },

  orgDe(r) { return this.orgPorJornada[r.jornada_id] || (SRP.ref.usuarioPorId[r.cabo_id] || {}).organizacion_id || ''; },
  especieDe(r) { return r.especie_id || this.OTRA; },

  /* Especie, programa y alcaldía: sólo los que hay en lo que la cuenta ve. Tipo de institución e
     institución, sólo para la Administración global, que ve más de una institución. */
  /* Cada lista ofrece sólo lo que queda con los demás filtros de lista (SRP.util.facetas): con una
     institución elegida, «Quién registró» trae sólo a su gente, y así con todas. */
  VALORES: {
    cabo: r => r.cabo_id, especie: r => SRP.registros.especieDe(r), programa: r => r.programa_id,
    alcaldia: r => SRP.ref.alcaldia(r.alcaldia), organizacion: r => SRP.registros.orgDe(r)
  },

  // ¿Pasa los filtros de lista, salvo los de `excluir`? El periodo va aparte
  cumpleListas(r, excluir) {
    const f = this.filtro, x = k => !excluir || !excluir.has(k);
    return (!f.cabo || !x('cabo') || r.cabo_id === f.cabo) &&
      (!f.especie || !x('especie') || this.especieDe(r) === f.especie) &&
      (!f.programa || !x('programa') || r.programa_id === f.programa) &&
      (!f.alcaldia || !x('alcaldia') || SRP.ref.alcaldia(r.alcaldia) === f.alcaldia) &&
      (!f.organizacion || !x('organizacion') || this.orgDe(r) === f.organizacion);
  },

  llenarListas() {
    const f = this.filtro, ver = SRP.permisos.de(SRP.sesion.usuario).alcance === 'todos';
    const valores = Object.assign({}, this.VALORES);
    if (!ver) { delete valores.organizacion; f.organizacion = ''; }
    const fac = SRP.util.facetas(this.visibles, (r, ex) => this.cumpleListas(r, ex), valores);
    const pares = (k, nombre) => [...fac[k]].map(v => [v, nombre(v)]);
    const especie = id => id === this.OTRA ? 'Otra especie' : SRP.ref.nombreCatalogo(id);
    if (!this.el('caja-filtro-cabo').hidden) {
      const personas = SRP.util.paresPersonas([...fac.cabo].concat(f.cabo || []));
      this.el('filtro-cabo').innerHTML = SRP.util.opciones('Todos', personas);
      this.el('filtro-cabo').value = f.cabo;
    }
    SRP.util.llenarLista(this.el('filtro-especie'), 'Todas', pares('especie', especie), f, 'especie', especie);
    SRP.util.llenarLista(this.el('filtro-programa'), 'Todos', pares('programa', id => SRP.ref.nombreCatalogo(id)), f, 'programa', id => SRP.ref.nombreCatalogo(id));
    SRP.util.llenarLista(this.el('filtro-alcaldia'), 'Todas', pares('alcaldia', a => a), f, 'alcaldia');
    this.el('caja-filtro-org').hidden = !ver;
    if (ver) SRP.util.llenarInstituciones(this.el('filtro-org'), fac.organizacion, f);
  },

  llenarInstituciones() { this.llenarListas(); },

  // Los filtros de «Más filtros» que no son de fecha: lo elegido, para el resumen y las fichas
  elegidos() {
    const f = this.filtro;
    return [f.cabo ? ['cabo', 'Registró: ' + SRP.ref.nombreUsuario(f.cabo)] : null,
      f.especie ? ['especie', 'Especie: ' + (f.especie === this.OTRA ? 'Otra especie' : SRP.ref.nombreCatalogo(f.especie))] : null,
      f.programa ? ['programa', 'Programa: ' + SRP.ref.nombreCatalogo(f.programa)] : null,
      f.alcaldia ? ['alcaldia', 'Alcaldía: ' + f.alcaldia] : null,
      f.organizacion ? ['institucion', 'Institución: ' + SRP.ref.nombreOrganizacion(f.organizacion)] : null].filter(Boolean);
  },

  /* Deja los filtros como al abrir la vista por primera vez: todos los registros, sin año ni mes,
     sin rango y todos los cabos (D104). Es distinto de «Todos», que sólo quita el periodo y respeta el cabo. */
  reiniciarFiltros() {
    const antes = Object.assign({}, this.filtro);
    this.filtro = this.filtroVacio();
    this.el('filtro-cabo').value = '';
    this.llenarListas();
    this.periodoAbierto = false;
    this.diaAbierto = false;
    this.el('filtro-dia').value = '';
    this.limpiarRango();
    this.sincronizarControles();
    this.aplicar();
    SRP.util.anunciar('Filtros quitados: todos los registros.', 'exito', { deshacer: () => this.volverAFiltro(antes) });
  },

  // Devuelve los filtros a como estaban antes de «Quitar filtros» (D101)
  volverAFiltro(f) {
    this.filtro = Object.assign({}, f);
    this.el('filtro-cabo').value = f.cabo || '';
    this.llenarListas();
    this.el('filtro-desde').value = f.desde || ''; this.el('filtro-hasta').value = f.hasta || '';
    this.periodoAbierto = !!(f.desde || f.hasta);
    this.diaAbierto = !!f.dia && f.dia !== SRP.util.fechaHoy();
    this.el('filtro-dia').value = this.diaAbierto ? f.dia : '';
    this.sincronizarControles();
    this.aplicar();
  },

  /* ---------- Periodo ---------- */

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
        this.sincronizarControles();
      this.aplicar();
      return;
    }
    this.diaAbierto = false;
    this.el('filtro-dia').value = '';
    f.dia = '';
    const hoy = SRP.util.fechaHoy();
    if (atajo === 'hoy') { f.dia = hoy; f.anio = ''; f.mes = ''; }
    // «Este mes» y «Este año»: el mes y el año en curso, sin abrir ningún campo
    else if (atajo === 'mes' || atajo === 'anio') { f.anio = hoy.slice(0, 4); f.mes = atajo === 'mes' ? hoy.slice(5, 7) : ''; }
    else { f.anio = ''; f.mes = ''; }   // 'todos'
    this.periodoAbierto = false;
    this.limpiarRango();
    this.sincronizarControles();
    this.aplicar();
  },

  limpiarRango() {
    this.filtro.desde = ''; this.filtro.hasta = '';
    this.el('filtro-desde').value = ''; this.el('filtro-hasta').value = '';
  },

  // Deja los controles mostrando exactamente lo que dice this.filtro
  sincronizarControles() {
    const f = this.filtro, hoy = SRP.util.fechaHoy();
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
      mes: !pidePeriodo && !pideDia && !f.dia && f.anio === hoy.slice(0, 4) && f.mes === hoy.slice(5, 7),
      anio: !pidePeriodo && !pideDia && !f.dia && f.anio === hoy.slice(0, 4) && !f.mes,
      periodo: pidePeriodo
    };
    // Desde/Hasta se ven mientras haya rango o se haya pedido «Un periodo»
    const abierto = !sinRango || !!this.periodoAbierto;
    SRP.util.atajos.marcar(this.el('filtro-atajos'), activo, { periodo: [this.el('filtro-periodo'), abierto], dia: [this.el('filtro-un-dia'), pideDia] });   // M15
    // El acordeón «Más filtros» (D129): su resumen dice lo elegido dentro; si nada de lo suyo aplica, no se ve
    const conCabo = !this.el('caja-filtro-cabo').hidden, conOrg = !this.el('caja-filtro-org').hidden;
    const dentro = this.elegidos().map(e => e[1].replace(/^[^:]+: /, '')).filter(Boolean);
    const disponibles = [conCabo ? 'quién registró' : '', 'especie', 'programa', 'alcaldía', conOrg ? 'institución' : ''].filter(Boolean);
    this.el('filtro-mas-filtros').hidden = false;
    this.el('filtro-mas-filtros-texto').textContent = 'Más filtros: ' + (dentro.length ? dentro.join(' · ') : SRP.util.enumerar(disponibles));
  },

  aplicar() {
    const f = this.filtro;
    const periodo = f.anio ? f.anio + (f.mes ? '-' + f.mes : '') : '';
    this.filtrados = this.visibles.filter(r =>
      (!f.dia || r.fecha_plantacion === f.dia) &&
      (!periodo || r.fecha_plantacion.startsWith(periodo)) &&
      (!f.desde || r.fecha_plantacion >= f.desde) &&
      (!f.hasta || r.fecha_plantacion <= f.hasta) &&
      this.cumpleListas(r));
    this.llenarListas();
    this.pintarFichas();
    this.pintar();
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
    fichas.push(...this.elegidos());
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

  pintar() {
    const u = SRP.sesion.usuario;
    const variosAutores = SRP.permisos.de(u).alcance !== 'propios';
    // Un filtro nuevo vuelve a la primera página; guardar o eliminar conserva la página en que se está
    const clave = JSON.stringify(this.filtro);
    if (clave !== this._claveFiltro) { this._claveFiltro = clave; this.pagina = 1; }
    SRP.util.pintarOrden(this.el('registros-orden'), 'registros', () => { this.pagina = 1; this.pintar(); });
    const info = SRP.util.paginar(SRP.util.ordenar(this.filtrados, 'registros'), this.pagina, 'registros-paginas');
    this.pagina = info.pagina;
    const pagina = info.items;
    const esc = SRP.util.escapar;
    // Envío simulado (D111): la tarjeta dice si el registro espera envío; enviado no lleva marca
    const envio = SRP.envio.simulado() ? SRP.envio.leer() : null;
    this.el('lista-registros').innerHTML = pagina.map(r => {
      const est = envio ? SRP.envio.estado(r, envio) : null;
      const esp = SRP.ref.especieDe(r);
      // Acciones en el menú de la tuerca (D94): sólo las que el perfil permite
      const items = [{ accion: 'ver', texto: 'Ver detalle', icono: 'ver' }];
      if (SRP.permisos.puedeEditar(u, r, SRP.ref.usuarioPorId)) items.push({ accion: 'editar', texto: 'Editar', icono: 'lapiz' });
      if (SRP.permisos.puede('registro.sustituir', r)) items.push({ accion: 'sustituir', texto: 'Sustituir', icono: 'intercambio' });
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
        '<span class="registro-especie">' + esc(esp.comun) + (esp.cientifico ? ' <i>(' + esc(esp.cientifico) + ')</i>' : '') +
          (r.sustituye_id ? ' <span class="marca-sustituto">Sustituto · ' + esc(SRP.ref.motivoSustitucion(r)) + '</span>' : '') + '</span>' +
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
      : 'Total: ' + n.toLocaleString('es-MX') + (n === 1 ? ' registro' : ' registros');
    this.pintarVacio(n === 0, propios, u);
    SRP.util.pintarPaginador(this.el('registros-paginas'), info, 'registro', 'registros', (p) => {
      this.pagina = p; this.pintar(); SRP.util.subirA(this.el('registros-total'));
    });
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
      const html = this.htmlEstado(r, SRP.envio.simulado() ? SRP.envio.estado(r, e) : null);
      fila.innerHTML = html; fila.hidden = !html;
    });
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
      texto = 'Pruebe con otro periodo' + (this.elegidos().length ? ' u otros filtros' : '') + ', o quite los filtros.';
      botones = [{ accion: 'quitar', texto: 'Quitar filtros', clase: 'btn-secundario' }];
    }
    caja.innerHTML = SRP.util.htmlVacio(icono, titulo, texto, botones);   // patrón común de los cuatro listados (D141)
  },

  // Quita todo filtro, cabo incluido: lo que pide el estado vacío cuando el filtro no encuentra nada
  quitarFiltros() {
    this.filtro = this.filtroVacio();
    this.el('filtro-cabo').value = '';
    this.llenarListas();
    this.periodoAbierto = false;
    this.diaAbierto = false;
    this.el('filtro-dia').value = '';
    this.limpiarRango();
    this.sincronizarControles();
    this.aplicar();
  },

  /* El detalle se lee igual que la ficha de revisión: el mapa arriba, los datos con su etiqueta
     en negritas, la fotografía al final donde se la nombra, y el historial cerrando. Así quien
     revisa un registro guardado ve lo mismo, en el mismo orden, que quien lo capturó. */
  async verDetalle(r) {
    const esc = SRP.util.escapar;
    this.detalleActual = r;
    const sustituible = SRP.permisos.puede('registro.sustituir', r);
    this.el('btn-detalle-sustituir').hidden = !sustituible;
    this.el('detalle-pie').hidden = !SRP.permisos.puedeEditar(SRP.sesion.usuario, r, SRP.ref.usuarioPorId) && !sustituible;
    const esp = SRP.ref.especieDe(r);
    /* Mismo orden que el formulario y la ficha de revisión, con el folio al frente: es como se nombra
       al árbol. Celda, capas, identificador y envío son de la base de datos y no se muestran aquí. */
    const jornada = r.jornada_id ? await SRP.almacen.uno('jornadas', r.jornada_id) : null;
    const filas = [
      ['Folio', '<span class="folio-provisional">' + esc(SRP.folio.textoLargo(r)) + '</span>'],
      ['Especie', esc(esp.comun) + (esp.cientifico ? ' <i>(' + esc(esp.cientifico) + ')</i>' : '')],
      ['Programa', esc(SRP.ref.nombreCatalogo(r.programa_id))],
      ['Jornada', jornada ? esc(jornada.nombre) : 'Sin jornada'],
      ['Fecha de plantación', esc(SRP.util.formatearFecha(r.fecha_plantacion))],
      ['Alcaldía', esc(SRP.ref.alcaldia(r.alcaldia))],
      ['Colonia', esc(SRP.ref.colonia(r.colonia))],
      ['Coordenadas', r.lat.toFixed(5) + ', ' + r.lng.toFixed(5)],
      ['Cómo se obtuvo', SRP.formulario.textoOrigenRevision(r, false)],
      ['Cabo', esc(SRP.ref.nombreUsuario(r.cabo_id))],
      ...(await this.filasSustitucion(r)),
      ['Comentarios', r.comentarios ? esc(r.comentarios) : 'Sin comentarios'],
      ['Fotografía', SRP.util.fotoSegura(r.foto_base64)
        ? '<img class="revision-foto" src="' + SRP.util.fotoSegura(r.foto_base64) + '" alt="Fotografía del árbol registrado">'
        : 'Sin fotografía']
    ];
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
      (SRP.espejo ? SRP.espejo.htmlDetalle(r) : '');

    this.el('dlg-detalle').showModal();
    if (this.mapaDetalle) { this.mapaDetalle.remove(); this.mapaDetalle = null; }
    this.mapaDetalle = SRP.mapa.estatico('detalle-mapa', r.lat, r.lng);
  },

  /* ---------- Sustituir un árbol perdido ---------- */

  // Las filas del detalle que cuentan la sustitución, de ida (sustituto) o de vuelta (sustituido)
  async filasSustitucion(r) {
    const esc = SRP.util.escapar, filas = [];
    const describe = x => x ? esc(SRP.ref.especieDe(x).comun) + ' · ' + esc(SRP.folio.texto(x)) + ' · ' + esc(SRP.util.formatearFecha(x.fecha_plantacion)) : 'Ya no está en el sistema';
    if (r.sustituye_id) {
      filas.push(['Sustituye a', describe(await SRP.almacen.uno('plantaciones', r.sustituye_id))]);
      filas.push(['Motivo de la sustitución', '<span class="marca-sustituto">' + esc(SRP.ref.motivoSustitucion(r)) + '</span>']);
    }
    if (r.sustituido_por_id) filas.push(['Sustituido por', describe(await SRP.almacen.uno('plantaciones', r.sustituido_por_id))]);
    return filas;
  },

  /* Pide el motivo y la fecha de la sustitución, y lleva a registrar el sustituto en la jornada del
     árbol perdido: la reabre si estaba cerrada. El sustituto lleva la fecha en que se planta, no la
     de la jornada, y cuenta en ese periodo. El original deja de contar como plantado al guardar el sustituto. */
  async sustituir(r) {
    if (!SRP.permisos.exigir('registro.sustituir', r)) return;
    this.porSustituir = r;
    this.motivo = '';
    const esc = SRP.util.escapar;
    this.el('dlg-sustituir-texto').textContent = 'El ' + SRP.ref.especieDe(r).comun + ' (' + SRP.folio.texto(r) + ', ' + SRP.util.formatearFecha(r.fecha_plantacion) +
      ') se perdió. El nuevo se registra en la misma jornada y queda en el mapa en morado.';
    this.el('sustituir-motivos').innerHTML = SRP.CONFIG.MOTIVOS_SUSTITUCION.map(([k, t]) =>
      '<button type="button" class="chip" data-motivo="' + esc(k) + '" aria-pressed="false">' + esc(t) + '</button>').join('');
    this.el('sustituir-otro').value = '';
    this.el('caja-sustituir-otro').hidden = true;
    // La fecha: hoy de inicio; entre la plantación del árbol perdido y hoy
    const fecha = this.el('sustituir-fecha');
    fecha.min = r.fecha_plantacion; fecha.max = SRP.util.fechaHoy(); fecha.value = SRP.util.fechaHoy();
    // La fecha se elige en el calendario del campo o con «Hoy». Si el perdido se plantó hoy, el calendario sólo ofrece hoy, y se dice
    const soloHoy = r.fecha_plantacion >= SRP.util.fechaHoy();
    this.el('sustituir-fecha-ayuda').textContent = soloHoy ? 'El árbol perdido se plantó hoy: la sustitución sólo puede ser de hoy.'
      : 'El día en que se planta el árbol nuevo: desde el ' + SRP.util.formatearFecha(r.fecha_plantacion) + ', cuando se plantó el perdido, hasta hoy.';
    this.el('sustituir-error').hidden = true;
    if (this.el('dlg-detalle').open) this.el('dlg-detalle').close();
    this.el('dlg-sustituir').showModal();
  },

  elegirMotivo(k) {
    this.motivo = k;
    this.el('sustituir-motivos').querySelectorAll('.chip').forEach(c => c.setAttribute('aria-pressed', String(c.dataset.motivo === k)));
    this.el('caja-sustituir-otro').hidden = k !== 'OTRO';
    if (k === 'OTRO') this.el('sustituir-otro').focus();
    this.el('sustituir-error').hidden = true;
  },

  async seguirSustitucion() {
    const r = this.porSustituir; if (!r) return;
    const otro = this.el('sustituir-otro').value.trim();
    const fecha = this.el('sustituir-fecha').value;
    const falta = !this.motivo ? 'Elija por qué se sustituye.' : this.motivo === 'OTRO' && !otro ? 'Escriba el motivo.'
      : !fecha ? 'Indique la fecha de la sustitución.' : fecha > SRP.util.fechaHoy() ? 'La fecha de la sustitución no puede ser posterior a hoy.'
      : fecha < r.fecha_plantacion ? 'La fecha de la sustitución no puede ser anterior a la plantación del árbol perdido (' + SRP.util.formatearFecha(r.fecha_plantacion) + ').' : '';
    if (falta) { const e = this.el('sustituir-error'); e.textContent = falta; e.hidden = false; return; }
    const j = r.jornada_id ? await SRP.almacen.uno('jornadas', r.jornada_id) : null;
    if (!j) { SRP.util.anunciar('No se puede sustituir: la jornada de ese árbol ya no existe.', 'aviso'); return; }
    this.el('dlg-sustituir').close();
    // El sustituto se guarda en la jornada del árbol perdido. Si está cerrada se pregunta antes de
    // reabrirla, y vuelve a cerrarse al guardar el sustituto o al cancelar
    let reabierta = null;
    if (j.estatus !== 'abierta') {
      if (!await SRP.activa.reabrirParaSustituto(j)) return;
      reabierta = j.id;
    }
    SRP.activa.jornada = await SRP.almacen.uno('jornadas', j.id);
    SRP.formulario.sustituir(r, this.motivo, this.motivo === 'OTRO' ? otro : '', fecha, reabierta);
  },

  /* Eliminar un registro se deshace (se marca, no se borra): no pregunta; el aviso dice cuál se
     eliminó y ofrece «Deshacer» (D139). La confirmación queda para lo que no tiene vuelta. */
  async eliminar(r) {
    if (!SRP.permisos.exigir('registro.eliminar', r)) return;
    // Retiro con constancia: se marca, no se borra (Norma 7.4)
    const ahora = SRP.util.ahoraISO(), quien = SRP.sesion.usuario.id;
    const nuevo = Object.assign({}, r, { estatus: 'eliminado', fecha_ultima_edicion: ahora, editado_por_id: quien });
    const cambios = [{ almacen: 'plantaciones', objeto: nuevo, bitacora: SRP.bitacora.entrada('ELIMINADO', 'plantacion', r.id) }];
    // Sin su sustituto, el árbol que había sustituido vuelve a contar como plantado
    const original = r.sustituye_id ? await SRP.almacen.uno('plantaciones', r.sustituye_id) : null;
    if (original && original.estatus === 'sustituido' && original.sustituido_por_id === r.id) cambios.push({ almacen: 'plantaciones',
      objeto: Object.assign({}, original, { estatus: 'activo', sustituido_por_id: null, fecha_ultima_edicion: ahora, editado_por_id: quien }),
      bitacora: SRP.bitacora.entrada('RESTAURADO', 'plantacion', original.id, 'Se eliminó su sustituto: vuelve a contar como plantado') });
    (await SRP.reportes.caducar([r.jornada_id], 'se eliminó un árbol')).forEach(c => cambios.push(c));
    await SRP.almacen.guardarJuntos(cambios);
    // «Deshacer» devuelve el registro tal como estaba y deja constancia (D101)
    const cual = SRP.folio.valido(r.folio) ? '(' + r.folio + ')' : 'del ' + SRP.util.formatearFecha(r.fecha_plantacion);
    SRP.util.anunciar('Registro de ' + SRP.ref.especieDe(r).comun + ' ' + cual + ' eliminado: ya no aparece en listados ni reportes.', 'exito', { deshacer: () => this.restaurar(r) });
    if (SRP.app.vista === 'jornadas') { SRP.jornadas.volverAlDetalle = false; SRP.jornadas.refrescar(); } else if (SRP.app.vista === 'registrar') await SRP.activa.preparar(); else this.preparar();
    SRP.conexion.refrescar();   // la cuenta de la pastilla baja
  },

  /* Vuelve a activo el registro como está ahora en la base, no la copia de cuando se eliminó: si
     mientras tanto cambió el programa de su jornada, vuelve con el de la jornada; conserva su fecha
     de plantación, salvo que la jornada ahora empiece después: entonces toma la de la jornada.
     Sin su jornada no se restaura: quedaría en Registros y en ninguna jornada ni reporte. */
  async restaurar(r) {
    if (!SRP.permisos.exigir('registro.restaurar', r)) return;
    const actual = (await SRP.almacen.uno('plantaciones', r.id)) || r;
    const jornada = actual.jornada_id ? await SRP.almacen.uno('jornadas', actual.jornada_id) : null;
    if (!jornada) { SRP.util.anunciar('No se puede restaurar: su jornada ya no existe.', 'aviso'); return; }
    const vuelto = Object.assign({}, actual, { estatus: 'activo', fecha_plantacion: SRP.util.fechaEnJornada(actual.fecha_plantacion, jornada), programa_id: jornada.programa_id,
      fecha_ultima_edicion: SRP.util.ahoraISO(), editado_por_id: SRP.sesion.usuario.id });
    const cambios = [{ almacen: 'plantaciones', objeto: vuelto, bitacora: SRP.bitacora.entrada('RESTAURADO', 'plantacion', r.id, 'Se deshizo la eliminación') }];
    // Un sustituto que vuelve deja otra vez sustituido a su original, si nadie lo sustituyó entre tanto
    const original = actual.sustituye_id ? await SRP.almacen.uno('plantaciones', actual.sustituye_id) : null;
    if (original && original.estatus === 'activo' && !original.sustituido_por_id) cambios.push({ almacen: 'plantaciones',
      objeto: Object.assign({}, original, { estatus: 'sustituido', sustituido_por_id: actual.id, fecha_ultima_edicion: vuelto.fecha_ultima_edicion, editado_por_id: vuelto.editado_por_id }),
      bitacora: SRP.bitacora.entrada('SUSTITUIDO', 'plantacion', original.id, 'Vuelve su sustituto: ' + SRP.ref.motivoSustitucion(actual)) });
    (await SRP.reportes.caducar([actual.jornada_id], 'se restauró un árbol')).forEach(c => cambios.push(c));
    await SRP.almacen.guardarJuntos(cambios);
    SRP.util.anunciar('Registro restaurado.');
    if (SRP.app.vista === 'jornadas') SRP.jornadas.refrescar(); else if (SRP.app.vista === 'registrar') await SRP.activa.preparar(); else this.preparar();
    SRP.conexion.refrescar();
  }
};

// Acciones que escriben en el teléfono: si fallan, se dice qué no se pudo hacer (D149)
SRP.util.proteger(SRP.registros, { eliminar: 'eliminar el registro', restaurar: 'restaurar el registro', seguirSustitucion: 'preparar la sustitución' });
