/* ADMINISTRACIÓN DE CUENTAS (sólo Administración global).
   Una sola puerta de alta: aquí se crea la cuenta, se le asigna institución, perfil, área y
   coordinador. Nadie se da de alta solo: la Secretaría da de alta también a las alcaldías, PAOT,
   SOBSE, empresas y organizaciones civiles, cuando lo solicitan. Todo cambio queda en la bitácora.
   EL ALTA VA DE LO GENERAL A LO PARTICULAR. Primero el tipo de institución (cuatro, fijos); luego la
   institución de ese tipo: las 16 alcaldías, fijas, o las de los otros tres tipos, que la
   Administración agrega a solicitud en Catálogos › Instituciones. Sólo la Secretaría lleva área y
   Administración global. Fuera, cada institución tiene cabos y coordinadores; el cabo depende de un
   coordinador de su misma institución, así que nadie ve lo de otra. El nombre va completo, en un
   solo campo. */
window.SRP = window.SRP || {};

SRP.usuarios = {
  editando: null, uso: {}, usos: {}, estado: 'todos', filtroOrg: '', filtroPerfil: '',

  el(id) { return document.getElementById(id); },

  iniciar() {
    this.el('usr-buscar').addEventListener('input', () => this.pintar());
    // La institución, en una sola lista agrupada por tipo; el perfil la acota
    this.el('usr-filtro-org').addEventListener('change', (e) => { this.filtroOrg = e.target.value; this.llenarFiltros(); this.pintar(); });
    this.el('usr-filtro-perfil').addEventListener('change', (e) => { this.filtroPerfil = e.target.value; this.llenarFiltros(); this.pintar(); });
    // El tipo decide la lista de instituciones; la institución, el área, los perfiles y los coordinadores
    this.el('usr-tipo-org').addEventListener('change', () => { this.llenarInstituciones(''); this.ajustarPorOrganizacion(); });
    this.el('usr-organizacion').addEventListener('change', () => this.ajustarPorOrganizacion());
    // Atajos de estado de la cuenta (D107)
    this.el('usr-estado').addEventListener('click', (e) => {
      const b = e.target.closest('.chip'); if (!b) return;
      this.estado = b.dataset.estado;
      this.el('usr-estado').querySelectorAll('.chip').forEach(c => c.setAttribute('aria-pressed', String(c === b)));
      this.pintar();
    });
    this.el('btn-usr-agregar').addEventListener('click', () => this.abrirFormulario(null));
    this.el('form-usuario').addEventListener('submit', (e) => { e.preventDefault(); this.guardar(); });
    // El campo Coordinador sólo tiene sentido para un cabo. Sin saltos de foco automáticos (D82)
    this.el('usr-perfil').addEventListener('change', () => this.ajustarPorPerfil());
    this.el('usr-coordinadores').addEventListener('click', (e) => {
      const b = e.target.closest('.chip'); if (!b) return;
      b.setAttribute('aria-pressed', String(b.getAttribute('aria-pressed') !== 'true'));
      SRP.util.quitarErrorCampo(this.el('usr-coordinadores'));
      this.pintarNotaCoordinadores();
    });
    this.el('tabla-usuarios').addEventListener('click', (e) => {
      // Tocar la tarjeta (fuera de la tuerca) abre la edición (D105)
      if (!e.target.closest('.c-acciones, thead')) {
        const tr = e.target.closest('tr[data-id]');
        if (tr) { this.abrirFormulario(SRP.ref.usuarioPorId[tr.dataset.id]); return; }
      }
      const b = e.target.closest('button[data-accion]'); if (!b) return;
      const u = SRP.ref.usuarioPorId[b.dataset.id];
      if (b.dataset.accion === 'editar') this.abrirFormulario(u);
      if (b.dataset.accion === 'estado') this.cambiarEstado(u);
      if (b.dataset.accion === 'eliminar') this.eliminar(u);
    });
  },

  async preparar() {
    const plantaciones = await SRP.almacen.todos('plantaciones');
    this.uso = {};   // árboles a nombre de cada cuenta: la columna «Registros»
    plantaciones.forEach(p => { this.uso[p.cabo_id] = (this.uso[p.cabo_id] || 0) + 1; });
    this.usos = await SRP.ref.usosDe('usuarios');   // todo lo que la nombra: decide si se puede eliminar (D151)
    this.llenarFiltros();
    this.pintar();
  },

  // ¿La cuenta pasa los filtros de lista (perfil e institución), salvo los de `excluir`?
  cumpleListas(u, excluir) {
    const x = k => !excluir || !excluir.has(k), org = u.organizacion_id || '';
    return (!this.filtroPerfil || !x('perfil') || u.perfil === this.filtroPerfil) &&
      (!this.filtroOrg || !x('organizacion') || org === this.filtroOrg);
  },

  /* Cada lista ofrece sólo lo que hay entre las cuentas que pasan las otras: los perfiles de la
     institución elegida, las instituciones con cuentas de ese perfil. Lo elegido se queda. */
  llenarFiltros() {
    const fac = SRP.util.facetas(SRP.ref.usuarios, (u, ex) => this.cumpleListas(u, ex),
      { perfil: u => u.perfil, organizacion: u => u.organizacion_id });
    SRP.util.llenarInstituciones(this.el('usr-filtro-org'), fac.organizacion, { organizacion: this.filtroOrg });
    const perfiles = Object.keys(SRP.PERFILES).filter(k => fac.perfil.has(k) || k === this.filtroPerfil);
    this.el('usr-filtro-perfil').innerHTML = SRP.util.opciones('Todos', perfiles.map(k => [k, SRP.PERFILES[k].etiqueta]));
    this.el('usr-filtro-perfil').value = this.filtroPerfil;
  },

  pintar() {
    const esc = SRP.util.escapar;
    const q = SRP.util.normalizar(this.el('usr-buscar').value);
    const yo = SRP.sesion.usuario.id;
    const lista = SRP.ref.usuarios
      .filter(u => this.estado === 'todos' || (this.estado === 'activos') === !!u.activo)
      .filter(u => this.cumpleListas(u))
      .filter(u => !q || [SRP.util.nombreCompleto(u), u.correo, SRP.ref.nombreCatalogo(u.area_id), SRP.ref.nombreCatalogo(u.organizacion_id)]
        .some(t => SRP.util.normalizar(t).includes(q)))
      .sort((a, b) => SRP.util.nombreCompleto(a).localeCompare(SRP.util.nombreCompleto(b), 'es'));

    const cab = '<thead><tr><th scope="col">Nombre</th><th scope="col">Correo</th><th scope="col">Institución</th><th scope="col">Área</th>' +
      '<th scope="col">Cargo</th><th scope="col">Perfil de captura</th><th scope="col">Coordinadores</th>' +
      '<th scope="col">Estado</th><th scope="col">Registros</th><th scope="col">Acciones</th></tr></thead>';

    const cabos = {};
    SRP.ref.usuarios.forEach(x => (x.coordinadores_ids || []).forEach(c => { cabos[c] = (cabos[c] || 0) + 1; }));
    const coordinadoresDe = (x) => (x.coordinadores_ids || []).map(c => SRP.ref.nombreUsuario(c)).join(', ');
    const filas = lista.map(u => {
      const n = this.uso[u.id] || 0;
      const soyYo = u.id === yo;
      // Acciones en el menú de la tuerca (D94). Nadie se desactiva ni se elimina a sí mismo:
      // dejaría el sistema sin quien administre
      const items = [{ accion: 'editar', texto: 'Editar', icono: 'lapiz' }];
      if (!soyYo) {
        items.push({ accion: 'estado', texto: u.activo ? 'Desactivar' : 'Activar', icono: u.activo ? 'cerrar' : 'palomita' });
        if (!SRP.ref.totalUsos(this.usos[u.id])) items.push({ accion: 'eliminar', texto: 'Eliminar', icono: 'basura', peligro: true });
      }
      const estado = '<span class="estado-texto" data-activo="' + u.activo + '">' + (u.activo ? 'Activo' : 'Inactivo') + '</span>';
      // En teléfono, tarjeta compacta (D105): nombre, correo, un renglón de resumen y la tuerca
      return '<tr data-id="' + SRP.util.escapar(u.id) + '"><td class="c-titulo" data-etiqueta="Nombre">' + esc(SRP.util.nombreCompleto(u)) + (soyYo ? ' <span class="insignia">usted</span>' : '') + '</td>' +
        '<td class="c-sub" data-etiqueta="Correo">' + esc(u.correo) + '</td>' +
        '<td class="c-movil-oculta" data-etiqueta="Institución">' + esc(SRP.ref.nombreOrganizacion(u.organizacion_id)) + '</td>' +
        '<td class="c-movil-oculta" data-etiqueta="Área">' + esc(SRP.ref.nombreCatalogo(u.area_id) || '—') + '</td>' +
        '<td class="c-movil-oculta" data-etiqueta="Cargo">' + esc(u.cargo_rol) + '</td>' +
        '<td class="c-movil-oculta" data-etiqueta="Perfil de captura">' + esc(SRP.permisos.de(u).etiqueta) + '</td>' +
        '<td class="c-movil-oculta" data-etiqueta="Coordinadores">' + esc(coordinadoresDe(u) || '—') + '</td>' +
        '<td class="c-movil-oculta" data-etiqueta="Estado">' + estado + '</td>' +
        '<td class="c-movil-oculta" data-etiqueta="Registros">' + n + '</td>' +
        '<td class="c-acciones" data-etiqueta="Acciones">' + SRP.ICONOS.menuAcciones(u.id, SRP.util.nombreCompleto(u), items) + '</td>' +
        '<td class="c-resumen">' + estado + '<span>' + [esc(SRP.permisos.de(u).etiqueta),
          // De la Secretaría se dice el área; de fuera, la institución
          esc(SRP.ref.esSedema(u.organizacion_id) ? SRP.ref.nombreCatalogo(u.area_id) : SRP.ref.nombreOrganizacion(u.organizacion_id)),
          // «coordinador: …» en el cabo; «coordina a 2 cabos» en quien coordina (antes el cabo decía «coordina» a su coordinador)
          (u.coordinadores_ids || []).length ? ((u.coordinadores_ids.length === 1 ? 'coordinador: ' : 'coordinadores: ') + esc(coordinadoresDe(u))) : '',
          cabos[u.id] ? 'coordina a ' + cabos[u.id] + (cabos[u.id] === 1 ? ' cabo' : ' cabos') : '',
          n + (n === 1 ? ' registro' : ' registros')].filter(Boolean).join(' · ') + '</span></td></tr>';
    }).join('');

    this.el('tabla-usuarios').innerHTML = cab + '<tbody>' + (filas || '<tr><td colspan="10">Sin resultados.</td></tr>') + '</tbody>';
    SRP.util.ordenable(this.el('tabla-usuarios'));
    const total = SRP.ref.usuarios.length;
    const filtrado = q || this.estado !== 'todos' || this.filtroOrg || this.filtroPerfil;
    const inactivos = SRP.ref.usuarios.filter(x => !x.activo).length;   // «3 usuarios · 1 inactivo» (D142)
    this.el('usr-cuenta').textContent = (filtrado ? lista.length + ' de ' : '') + total + (total === 1 ? ' usuario' : ' usuarios') +
      (inactivos ? ' · ' + inactivos + (inactivos === 1 ? ' inactivo' : ' inactivos') : '');
  },

  llenarListas(usuario) {
    const areaActual = usuario ? usuario.area_id : '';
    const areas = SRP.ref.deTipo('area', true).slice();
    if (areaActual && !areas.find(a => a.id === areaActual) && SRP.ref.catalogoPorId[areaActual]) areas.push(SRP.ref.catalogoPorId[areaActual]);
    this.el('usr-area').innerHTML = SRP.util.opciones('Seleccione el área', areas.map(a => [a.id, a.nombre + (a.activo ? '' : ' (inactiva)')]));   // M15

  },

  /* Las instituciones del tipo elegido: activas, más la de la cuenta aunque ya esté inactiva. En
     alcaldías la lista dice sólo el nombre («Iztapalapa»): el tipo ya dice «Alcaldía», y la
     etiqueta del campo también. Las que falten se agregan en Catálogos, no aquí. */
  llenarInstituciones(actual) {
    const tipo = this.el('usr-tipo-org').value;
    const alcaldia = tipo === 'Alcaldía';
    this.el('caja-usr-organizacion').hidden = !tipo;
    this.el('etq-usr-organizacion').firstChild.textContent = alcaldia ? 'Alcaldía ' : 'Institución ';
    const orgs = SRP.ref.deTipo('organizacion', false).filter(o => o.tipo_organizacion === tipo && (o.activo || o.id === actual))
      .sort((a, b) => (SRP.ref.esSedema(b.id) - SRP.ref.esSedema(a.id)) || a.nombre.localeCompare(b.nombre, 'es'));
    const pares = orgs.map(o => [o.id, o.nombre + (o.activo ? '' : ' (inactiva)')]);
    this.el('usr-organizacion-ayuda').hidden = !tipo || alcaldia;
    this.el('usr-organizacion').innerHTML = SRP.util.opciones(alcaldia ? 'Seleccione la alcaldía' : 'Seleccione la institución', pares);
    this.el('usr-organizacion').value = actual && orgs.some(o => o.id === actual) ? actual : '';
  },

  /* Lo que depende de la institución. Área: sólo la Secretaría. Perfiles: Administración global sólo
     en la Secretaría; de fuera, cabo o coordinador. Coordinador del cabo: entre las cuentas activas
     de coordinación (o administración, en la Secretaría) de su misma institución, nunca la persona
     misma. Lo elegido se conserva si sigue siendo posible. */
  ajustarPorOrganizacion() {
    const orgId = this.el('usr-organizacion').value;
    const sedema = SRP.ref.esSedema(orgId);
    this.el('caja-usr-area').hidden = !sedema;
    if (!sedema) this.el('usr-area').value = '';

    const perfil = this.el('usr-perfil').value;
    const perfiles = Object.keys(SRP.PERFILES).filter(k => sedema || k !== 'ADMIN');
    this.el('usr-perfil').innerHTML = SRP.util.opciones('Seleccione el perfil', perfiles.map(k => [k, SRP.PERFILES[k].etiqueta]));
    this.el('usr-perfil').value = perfiles.includes(perfil) ? perfil : '';

    const elegidos = this.coordinadoresElegidos();
    const yo = this.editando;
    const coordinadores = !orgId ? [] : SRP.ref.usuarios
      .filter(u => u.activo && u.organizacion_id === orgId && (u.perfil === 'COORDINADOR' || u.perfil === 'ADMIN') && (!yo || u.id !== yo.id))
      .sort((a, b) => SRP.util.nombreCompleto(a).localeCompare(SRP.util.nombreCompleto(b), 'es'));
    this.pintarCoordinadores(coordinadores, elegidos);
    this.ajustarPorPerfil();
  },

  ajustarPorPerfil() {
    const perfil = this.el('usr-perfil').value;
    const p = SRP.PERFILES[perfil];
    this.el('usr-perfil-ayuda').textContent = p ? p.descripcion : '';
    // Sólo el cabo tiene coordinador, de su misma institución: los demás perfiles no dependen de nadie
    const conCoordinador = perfil === 'CABO' && !!this.el('usr-organizacion').value;
    this.el('caja-usr-coordinador').hidden = !conCoordinador;
    if (!conCoordinador) this.el('usr-coordinadores').querySelectorAll('.chip').forEach(b => b.setAttribute('aria-pressed', 'false'));
    this.pintarNotaCoordinadores();
  },

  /* LOS COORDINADORES DEL CABO. Un cabo puede tener más de uno: se marcan en una lista de botones con
     las cuentas de coordinación de su institución; sin ninguno marcado, queda sin coordinador. */
  coordinadoresElegidos() {
    return [...this.el('usr-coordinadores').querySelectorAll('.chip[aria-pressed="true"]')].map(b => b.dataset.id);
  },
  pintarCoordinadores(coordinadores, elegidos) {
    const esc = SRP.util.escapar;
    this.el('usr-coordinadores').innerHTML = coordinadores.map(u =>
      '<button type="button" class="chip" data-id="' + esc(u.id) + '" aria-pressed="' + elegidos.includes(u.id) + '">' + esc(SRP.util.nombreCompleto(u)) + '</button>').join('');
    this.el('usr-coordinadores').dataset.vacio = String(!coordinadores.length);
    this.pintarNotaCoordinadores();
  },
  pintarNotaCoordinadores() {
    const hay = this.el('usr-coordinadores').querySelectorAll('.chip').length, n = this.coordinadoresElegidos().length;
    this.el('usr-coordinadores-nota').textContent = !hay ? 'Esta institución no tiene cuentas de coordinación activas: el cabo queda sin coordinador.'
      : n === 0 ? 'Sin coordinador asignado. Puede marcar uno o varios: cada uno verá y editará los registros de este cabo.'
      : n === 1 ? '1 coordinador asignado. Puede marcar más de uno.' : n + ' coordinadores asignados.';
  },

  abrirFormulario(usuario) {
    this.editando = usuario;
    this.llenarListas(usuario);
    this.el('dlg-usuario-titulo').textContent = usuario ? 'Editar cuenta' : 'Dar de alta';
    this.el('usr-nombre-completo').value = usuario ? SRP.util.nombreCompleto(usuario) : '';
    this.el('usr-correo').value = usuario ? usuario.correo : '';
    this.el('usr-correo').readOnly = !!usuario;   // el correo identifica la cuenta: no cambia
    // Un alta nueva empieza sin tipo, o con la institución del filtro si hay una elegida
    const orgId = usuario ? usuario.organizacion_id || '' : this.filtroOrg;
    const org = SRP.ref.catalogoPorId[orgId];
    this.el('usr-tipo-org').value = org ? org.tipo_organizacion : '';
    this.llenarInstituciones(orgId);
    this.el('usr-area').value = usuario ? usuario.area_id || '' : '';
    this.el('usr-cargo').value = usuario ? usuario.cargo_rol : '';
    this.el('usr-perfil').innerHTML = SRP.util.opciones('Seleccione el perfil', Object.keys(SRP.PERFILES).map(k => [k, SRP.PERFILES[k].etiqueta]));
    this.el('usr-perfil').value = usuario ? usuario.perfil : 'CABO';
    // Los que ya tiene se marcan al armar la lista de su institución
    this.el('usr-coordinadores').innerHTML = (usuario ? usuario.coordinadores_ids || [] : []).map(id =>
      '<button type="button" class="chip" data-id="' + SRP.util.escapar(id) + '" aria-pressed="true"></button>').join('');
    this.ajustarPorOrganizacion();
    this.el('usr-errores').hidden = true;
    SRP.util.erroresEnCampos([], this.CAMPOS);
    this.el('dlg-usuario').showModal();
  },

  CAMPOS: ['usr-tipo-org', 'usr-organizacion', 'usr-area', 'usr-nombre-completo', 'usr-correo', 'usr-cargo', 'usr-perfil', 'usr-coordinadores'],

  validar(d) {
    const errores = [];
    const sedema = SRP.ref.esSedema(d.organizacion_id);
    if (!d.tipo_organizacion) errores.push(['usr-tipo-org', 'Elija el tipo de institución.']);
    else if (!d.organizacion_id) errores.push(['usr-organizacion', d.tipo_organizacion === 'Alcaldía' ? 'Elija la alcaldía.' : 'Elija la institución.']);
    if (sedema && !d.area_id) errores.push(['usr-area', 'Elija el área.']);
    if (!d.nombre_completo) errores.push(['usr-nombre-completo', 'Escriba el nombre completo.']);
    else if (d.nombre_completo.split(' ').length < 2) errores.push(['usr-nombre-completo', 'Escriba nombre y al menos un apellido.']);
    if (!this.editando) {
      // Comprobación deliberadamente amplia: hay correos válidos con formas poco comunes
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(d.correo)) errores.push(['usr-correo', 'Escriba un correo válido.']);
      else if (SRP.ref.usuarios.some(u => SRP.util.normalizar(u.correo) === SRP.util.normalizar(d.correo)))
        errores.push(['usr-correo', 'Ese correo ya tiene cuenta.']);
    }
    if (!d.cargo_rol) errores.push(['usr-cargo', 'Escriba el cargo.']);
    if (!SRP.PERFILES[d.perfil]) errores.push(['usr-perfil', 'Elija el perfil de captura.']);
    else if (d.perfil === 'ADMIN' && d.organizacion_id && !sedema) errores.push(['usr-perfil', 'La Administración global es sólo de la Secretaría: fuera de ella, la cuenta es de cabo, de coordinación o directiva.']);
    if ((d.coordinadores_ids || []).some(id => { const c = SRP.ref.usuarioPorId[id]; return !c || c.organizacion_id !== d.organizacion_id; }))
      errores.push(['usr-coordinadores', 'Los coordinadores del cabo son de su misma institución.']);
    // Quien coordina no cambia de institución con cabos asignados: la cuadrilla quedaría sin coordinación
    if (this.editando && d.organizacion_id && this.editando.organizacion_id !== d.organizacion_id) {
      const cabos = SRP.ref.usuarios.filter(x => (x.coordinadores_ids || []).includes(this.editando.id)).length;
      if (cabos) errores.push(['usr-organizacion', 'Coordina a ' + cabos + (cabos === 1 ? ' cabo' : ' cabos') + ': asígnelos a otra persona antes de cambiarla de institución.']);
    }
    // Quien administra no puede quitarse a sí mismo ese perfil: dejaría el sistema sin administración
    if (this.editando && this.editando.id === SRP.sesion.usuario.id && d.perfil !== 'ADMIN')
      errores.push(['usr-perfil', 'No puede cambiar su propio perfil de administración. Pida a otra cuenta de administración que lo haga.']);
    return errores;
  },

  async guardar() {
    if (!SRP.permisos.exigir('usuario.administrar')) return;
    const limpio = (id) => this.el(id).value.trim().replace(/\s+/g, ' ');
    const orgId = this.el('usr-organizacion').value;
    const sedema = SRP.ref.esSedema(orgId);
    const d = {
      tipo_organizacion: this.el('usr-tipo-org').value,
      nombre_completo: limpio('usr-nombre-completo'),
      correo: limpio('usr-correo').toLowerCase(), organizacion_id: orgId,
      // Sin área fuera de la Secretaría; coordinador, sólo el cabo
      area_id: sedema ? this.el('usr-area').value : null,
      cargo_rol: limpio('usr-cargo'), perfil: this.el('usr-perfil').value,
      coordinadores_ids: this.el('usr-perfil').value === 'CABO' ? this.coordinadoresElegidos() : []
    };
    const errores = this.validar(d);
    if (SRP.util.resumenErrores(this.el('usr-errores'), errores, this.CAMPOS)) return;   // D140, M15

    const yo = SRP.sesion.usuario;
    const ahora = SRP.util.ahoraISO();
    const datos = { nombre_completo: d.nombre_completo, correo: d.correo, organizacion_id: d.organizacion_id, area_id: d.area_id,
      cargo_rol: d.cargo_rol, perfil: d.perfil, coordinadores_ids: d.coordinadores_ids };
    let u, entrada;
    if (this.editando) {
      const previo = this.editando;
      const campos = ['nombre_completo', 'organizacion_id', 'area_id', 'cargo_rol', 'perfil', 'coordinadores_ids'];
      const valor = (o, k) => k === 'coordinadores_ids' ? (o[k] || []).slice().sort().join(',') : (o[k] || '');
      const cambiados = campos.filter(k => (k === 'nombre_completo' ? SRP.util.nombreCompleto(previo) : valor(previo, k)) !== valor(datos, k));
      u = Object.assign({}, previo, datos, { correo: previo.correo, editado_por_id: yo.id, fecha_ultima_edicion: ahora });
      delete u.nombre; delete u.apellido_paterno; delete u.apellido_materno;
      entrada = SRP.bitacora.entrada('EDITADO', 'usuario', u.id, 'Campos: ' + (cambiados.join(', ') || 'ninguno'));
    } else {
      u = Object.assign({ id: SRP.util.generarId(), activo: true,
        fecha_creacion: ahora, creado_por_id: yo.id, editado_por_id: null, fecha_ultima_edicion: null }, datos);
      entrada = SRP.bitacora.entrada('CREADO', 'usuario', u.id, 'Alta de ' + d.correo + ' con perfil ' + d.perfil + ' en ' + SRP.ref.nombreOrganizacion(d.organizacion_id));
    }
    await SRP.almacen.guardarConBitacora('usuarios', u, entrada);
    this.el('dlg-usuario').close();
    await SRP.ref.recargar();
    SRP.util.anunciar(this.editando ? 'Cuenta actualizada.' : 'Cuenta dada de alta.');
    this.preparar();
  },

  /* Desactivar se deshace: no pregunta, lo dice el aviso y ofrece «Deshacer» (D139).
     `deshaciendo`: viene de «Deshacer» del aviso; no se vuelve a ofrecer deshacer (D101) */
  async cambiarEstado(u, deshaciendo) {
    if (!SRP.permisos.exigir('usuario.administrar')) return;
    if (u.id === SRP.sesion.usuario.id) { SRP.util.anunciar('No puede desactivar su propia cuenta: el sistema se quedaría sin quien lo administre.', 'alerta'); return; }
    const activar = !u.activo;
    const nuevo = Object.assign({}, u, { activo: activar, editado_por_id: SRP.sesion.usuario.id, fecha_ultima_edicion: SRP.util.ahoraISO() });
    await SRP.almacen.guardarConBitacora('usuarios', nuevo, SRP.bitacora.entrada(activar ? 'ACTIVADO' : 'DESACTIVADO', 'usuario', u.id));
    await SRP.ref.recargar();
    const nombre = SRP.util.nombreCompleto(u);
    SRP.util.anunciar(activar ? 'Cuenta de ' + nombre + ' activada.' : 'Cuenta de ' + nombre + ' desactivada: ya no puede entrar; sus registros siguen a su nombre.',
      'exito', deshaciendo ? null : { deshacer: () => this.cambiarEstado(nuevo, true) });
    this.preparar();
  },

  async eliminar(u) {
    if (!SRP.permisos.exigir('usuario.administrar')) return;
    if (u.id === SRP.sesion.usuario.id) { SRP.util.anunciar('No puede eliminar su propia cuenta.', 'alerta'); return; }
    await this.preparar();                 // recuenta justo antes de decidir
    // Cuenta en todas las tablas (D151): árboles, jornadas de las que es cabo o encargado, cabos
    // que coordina, cuentas y catálogos que dio de alta o editó
    const usos = this.usos[u.id];
    if (SRP.ref.totalUsos(usos)) {
      // Los cabos que coordina se dicen por su nombre: «aparece en 1 cuenta» no explicaba nada
      const cabos = SRP.ref.usuarios.filter(x => (x.coordinadores_ids || []).includes(u.id)).length;
      const resto = Object.assign({}, usos, { usuarios: (usos.usuarios || 0) - cabos });
      const motivo = [cabos ? 'coordina a ' + cabos + (cabos === 1 ? ' cabo' : ' cabos') : '',
        SRP.ref.totalUsos(resto) ? 'aparece en ' + SRP.ref.textoUsos(resto) : ''].filter(Boolean).join(' y ');
      SRP.util.anunciar('No se puede eliminar: ' + motivo + '. Desactive la cuenta: eso sí se deshace.', 'alerta');
      return;
    }
    const ok = await SRP.app.confirmar({ titulo: 'Eliminar cuenta', pregunta: '¿Eliminar la cuenta de ' + SRP.util.nombreCompleto(u) + '?',
      puntos: ['No aparece en ningún árbol, jornada, cuenta ni catálogo.', 'La bitácora conserva la constancia.', 'Si sólo no debe entrar, desactívela: eso sí se deshace.'],
      irreversible: true, boton: 'Eliminar cuenta', icono: 'basura' });
    if (!ok) return;
    await SRP.almacen.borrarConBitacora('usuarios', u.id,
      SRP.bitacora.entrada('ELIMINADO', 'usuario', u.id, u.correo));
    await SRP.ref.recargar();
    SRP.util.anunciar('Cuenta eliminada.');
    this.preparar();
  }
};

// Acciones que escriben en el teléfono: si fallan, se dice qué no se pudo hacer (D149)
SRP.util.proteger(SRP.usuarios, { guardar: 'guardar la cuenta', cambiarEstado: 'cambiar el estado de la cuenta', eliminar: 'eliminar la cuenta' });
