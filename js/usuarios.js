/* ADMINISTRACIÓN DE CUENTAS (sólo Administración global).
   Una sola puerta de alta: aquí se crea la cuenta, se le asigna institución, perfil y área.
   Nadie se da de alta solo: la Secretaría da de alta también a las alcaldías, PAOT,
   SOBSE, empresas y organizaciones civiles, cuando lo solicitan. Todo cambio queda en la bitácora.
   CON DATOS REALES cada cambio va al servidor, que lo vuelve a revisar, y sólo entonces cambia en el teléfono.
   El alta y «Restablecer contraseña» dan una contraseña temporal, que se ve una sola vez para dársela a la
   persona.
   EL ALTA VA DE LO GENERAL A LO PARTICULAR. Primero el tipo de institución (cuatro, fijos); luego la
   institución de ese tipo: las 16 alcaldías, fijas, o las de los otros tres tipos, que la
   Administración agrega a solicitud en Catálogos › Instituciones. Sólo la Secretaría lleva área y
   Administración global. Fuera, cada institución tiene cabos y coordinadores; la coordinación trabaja con
   todos los cabos de su institución, y nadie ve lo de otra. El nombre va completo, en un solo campo. */
window.SRP = window.SRP || {};

SRP.usuarios = {
  editando: null, uso: {}, usos: {}, estado: 'todos', filtroOrg: '', filtroPerfil: '', pagina: 1,

  el(id) { return document.getElementById(id); },
  real() { return SRP.remoto.activo(); },

  iniciar() {
    this.el('usr-buscar').addEventListener('input', () => this.filtrar());
    // La institución, en una sola lista agrupada por tipo; el perfil la acota
    this.el('usr-filtro-org').addEventListener('change', (e) => { this.filtroOrg = e.target.value; this.llenarFiltros(); this.filtrar(); });
    this.el('usr-filtro-perfil').addEventListener('change', (e) => { this.filtroPerfil = e.target.value; this.llenarFiltros(); this.filtrar(); });
    // El tipo decide la lista de instituciones; la institución, el área y los perfiles
    this.el('usr-tipo-org').addEventListener('change', () => { this.llenarInstituciones(''); this.ajustarPorOrganizacion(); });
    this.el('usr-organizacion').addEventListener('change', () => this.ajustarPorOrganizacion());
    // Atajos de estado de la cuenta
    this.el('usr-estado').addEventListener('click', (e) => {
      const b = e.target.closest('.chip'); if (!b) return;
      this.estado = b.dataset.estado;
      this.el('usr-estado').querySelectorAll('.chip').forEach(c => c.setAttribute('aria-pressed', String(c === b)));
      this.filtrar();
    });
    this.el('btn-usr-agregar').addEventListener('click', () => this.abrirFormulario(null));
    this.el('form-usuario').addEventListener('submit', (e) => { e.preventDefault(); this.guardar(); });
    // La ayuda del perfil cambia con el perfil. Sin saltos de foco automáticos
    this.el('usr-perfil').addEventListener('change', () => this.ajustarPorPerfil());
    this.el('tabla-usuarios').addEventListener('click', (e) => {
      // Tocar la tarjeta (fuera de la tuerca) abre la edición
      if (!e.target.closest('.c-acciones, thead')) {
        const tr = e.target.closest('tr[data-id]');
        if (tr) { this.abrirFormulario(SRP.ref.usuarioPorId[tr.dataset.id]); return; }
      }
      const b = e.target.closest('button[data-accion]'); if (!b) return;
      const u = SRP.ref.usuarioPorId[b.dataset.id];
      if (b.dataset.accion === 'editar') this.abrirFormulario(u);
      if (b.dataset.accion === 'estado') this.cambiarEstado(u);
      if (b.dataset.accion === 'eliminar') this.eliminar(u);
      if (b.dataset.accion === 'restablecer') this.restablecer(u);
    });
    this.el('btn-clave-temporal-copiar').addEventListener('click', () => this.copiarTemporal());
    this.el('btn-clave-temporal-listo').addEventListener('click', () => this.el('dlg-clave-temporal').close());
  },

  async preparar() {
    const plantaciones = await SRP.almacen.todos('plantaciones');
    this.uso = {};   // árboles a nombre de cada cuenta: la columna «Registros»
    plantaciones.forEach(p => { this.uso[p.cabo_id] = (this.uso[p.cabo_id] || 0) + 1; });
    // Todo lo que la nombra: decide si se puede eliminar. Con datos reales lo cuenta el servidor; null si no respondió
    this.usos = this.real() ? await this.usosDelServidor() : await SRP.ref.usosDe('usuarios');
    // Con datos reales tampoco se elimina una cuenta que ya entró: el registro de entradas la nombra
    if (this.real()) this.el('usr-nota-eliminar').textContent = 'Una cuenta con árboles, jornadas o cabos a su cargo, o que ya entró al sistema, no se elimina: se desactiva.';
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

  // Otro filtro u otra búsqueda: la lista vuelve a su primera página
  filtrar() {
    this.pagina = 1;
    this.pintar();
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
      '<th scope="col">Cargo</th><th scope="col">Perfil de captura</th>' +
      '<th scope="col">Estado</th><th scope="col">Registros</th><th scope="col">Acciones</th></tr></thead>';

    // Lo que dice cada celda, para ordenar toda la lista y no sólo la página (en el orden de las columnas)
    const texto = (u, col) => [SRP.util.nombreCompleto(u), u.correo, SRP.ref.nombreOrganizacion(u.organizacion_id), SRP.ref.nombreCatalogo(u.area_id) || '—',
      u.cargo_rol, SRP.permisos.de(u).etiqueta, u.activo ? '' : 'Inactivo', this.uso[u.id] || 0][col];
    const info = SRP.util.paginar(SRP.util.ordenarLista(lista, 'tabla-usuarios', texto), this.pagina, 'usr-paginas');
    this.pagina = info.pagina;
    const filas = info.items.map(u => {
      const n = this.uso[u.id] || 0;
      const soyYo = u.id === yo;
      // Acciones en el menú de la tuerca. Nadie se desactiva ni se elimina a sí mismo:
      // dejaría el sistema sin quien administre
      const items = [{ accion: 'editar', texto: 'Editar', icono: 'lapiz' }];
      if (!soyYo) {
        // Con datos reales hay contraseñas: la de una cuenta activa se puede cambiar por otra temporal
        if (this.real() && u.activo) items.push({ accion: 'restablecer', texto: 'Restablecer contraseña', icono: 'candado' });
        items.push({ accion: 'estado', texto: u.activo ? 'Desactivar' : 'Activar', icono: u.activo ? 'cerrar' : 'palomita' });
        if (this.usos && !SRP.ref.totalUsos(this.usos[u.id])) items.push({ accion: 'eliminar', texto: 'Eliminar', icono: 'basura', peligro: true });
      }
      // Sólo se marca lo inactivo: casi todo está activo y marcarlo en cada tarjeta no distingue nada
      const estado = u.activo ? '' : '<span class="estado-texto" data-activo="false">Inactivo</span>';
      // En teléfono, tarjeta compacta: nombre, correo, un renglón de resumen y la tuerca
      return '<tr data-id="' + SRP.util.escapar(u.id) + '"><td class="c-titulo" data-etiqueta="Nombre">' + esc(SRP.util.nombreCompleto(u)) + (soyYo ? ' <span class="insignia">usted</span>' : '') + '</td>' +
        '<td class="c-sub" data-etiqueta="Correo">' + esc(u.correo) + '</td>' +
        '<td class="c-movil-oculta" data-etiqueta="Institución">' + esc(SRP.ref.nombreOrganizacion(u.organizacion_id)) + '</td>' +
        '<td class="c-movil-oculta" data-etiqueta="Área">' + esc(SRP.ref.nombreCatalogo(u.area_id) || '—') + '</td>' +
        '<td class="c-movil-oculta" data-etiqueta="Cargo">' + esc(u.cargo_rol) + '</td>' +
        '<td class="c-movil-oculta" data-etiqueta="Perfil de captura">' + esc(SRP.permisos.de(u).etiqueta) + '</td>' +
        '<td class="c-movil-oculta" data-etiqueta="Estado">' + estado + '</td>' +
        '<td class="c-movil-oculta" data-etiqueta="Registros">' + n + '</td>' +
        '<td class="c-acciones" data-etiqueta="Acciones">' + SRP.ICONOS.menuAcciones(u.id, SRP.util.nombreCompleto(u), items) + '</td>' +
        '<td class="c-resumen">' + estado + '<span>' + [esc(SRP.permisos.de(u).etiqueta),
          // De la Secretaría se dice el área; de fuera, la institución
          esc(SRP.ref.esSedema(u.organizacion_id) ? SRP.ref.nombreCatalogo(u.area_id) : SRP.ref.nombreOrganizacion(u.organizacion_id)),
          n + (n === 1 ? ' registro' : ' registros')].filter(Boolean).join(' · ') + '</span></td></tr>';
    }).join('');

    this.el('tabla-usuarios').innerHTML = cab + '<tbody>' + (filas || '<tr><td colspan="9">Sin resultados.</td></tr>') + '</tbody>';
    SRP.util.ordenable(this.el('tabla-usuarios'), () => this.pintar());
    SRP.util.pintarPaginador(this.el('usr-paginas'), info, 'cuenta', 'cuentas', (n) => { this.pagina = n; this.pintar(); SRP.util.subirA(this.el('usr-cuenta')); });
    const total = SRP.ref.usuarios.length;
    const filtrado = q || this.estado !== 'todos' || this.filtroOrg || this.filtroPerfil;
    const inactivos = SRP.ref.usuarios.filter(x => !x.activo).length;   // «3 usuarios · 1 inactivo»
    this.el('usr-cuenta').textContent = (filtrado ? lista.length + ' de ' : '') + total + (total === 1 ? ' usuario' : ' usuarios') +
      (inactivos ? ' · ' + inactivos + (inactivos === 1 ? ' inactivo' : ' inactivos') : '');
  },

  llenarListas(usuario) {
    const areaActual = usuario ? usuario.area_id : '';
    const areas = SRP.ref.deTipo('area', true).slice();
    if (areaActual && !areas.find(a => a.id === areaActual) && SRP.ref.catalogoPorId[areaActual]) areas.push(SRP.ref.catalogoPorId[areaActual]);
    this.el('usr-area').innerHTML = SRP.util.opciones('Seleccione el área', areas.map(a => [a.id, a.nombre + (a.activo ? '' : ' (inactiva)')]));

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
    // Sólo se ofrecen las activas: lo que falta se agrega o, si es una alcaldía, se activa en Catálogos
    this.el('usr-organizacion-ayuda').hidden = !tipo;
    this.el('usr-organizacion-ayuda').textContent = alcaldia ? '¿No aparece? Las alcaldías se activan en Catálogos › Instituciones.'
      : '¿No está en la lista? Una institución nueva se agrega en Catálogos › Instituciones.';
    this.el('usr-organizacion').innerHTML = SRP.util.opciones(alcaldia ? 'Seleccione la alcaldía' : 'Seleccione la institución', pares);
    this.el('usr-organizacion').value = actual && orgs.some(o => o.id === actual) ? actual : '';
  },

  /* Lo que depende de la institución. Área: sólo la Secretaría. Perfiles: Administración global sólo
     en la Secretaría; de fuera, cabo o coordinador. Lo elegido se conserva si sigue siendo posible. Los
     cabos no se asignan a nadie: la Coordinación trabaja con todos los de su institución. */
  ajustarPorOrganizacion() {
    const orgId = this.el('usr-organizacion').value;
    const sedema = SRP.ref.esSedema(orgId);
    this.el('caja-usr-area').hidden = !sedema;
    if (!sedema) this.el('usr-area').value = '';

    const perfil = this.el('usr-perfil').value;
    const perfiles = Object.keys(SRP.PERFILES).filter(k => sedema || k !== 'ADMIN');
    this.el('usr-perfil').innerHTML = SRP.util.opciones('Seleccione el perfil', perfiles.map(k => [k, SRP.PERFILES[k].etiqueta]));
    this.el('usr-perfil').value = perfiles.includes(perfil) ? perfil : '';
    this.ajustarPorPerfil();
  },

  ajustarPorPerfil() {
    const perfil = this.el('usr-perfil').value;
    const p = SRP.PERFILES[perfil];
    this.el('usr-perfil-ayuda').textContent = p ? p.descripcion : '';
  },

  abrirFormulario(usuario, cambiadaPorOtra) {
    this.editando = usuario;
    SRP.util.avisoEn(this.el('usr-version'), cambiadaPorOtra ? 'Alguien más cambió esta cuenta mientras usted la editaba. El formulario ya tiene lo que guardó la otra persona: revíselo y vuelva a hacer su cambio.' : '');
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
    this.ajustarPorOrganizacion();
    this.el('usr-errores').hidden = true;
    SRP.util.erroresEnCampos([], this.CAMPOS);
    if (SRP.espejo) SRP.espejo.enFormulario(this.el('form-usuario'), 'usuarios', usuario || null);
    this.el('dlg-usuario').showModal();
  },

  CAMPOS: ['usr-tipo-org', 'usr-organizacion', 'usr-area', 'usr-nombre-completo', 'usr-correo', 'usr-cargo', 'usr-perfil'],

  validar(d) {
    const errores = [];
    const sedema = SRP.ref.esSedema(d.organizacion_id);
    if (!d.tipo_organizacion) errores.push(['usr-tipo-org', 'Elija el tipo de institución.']);
    else if (!d.organizacion_id) errores.push(['usr-organizacion', d.tipo_organizacion === 'Alcaldía' ? 'Elija la alcaldía.' : 'Elija la institución.']);
    if (sedema && !d.area_id) errores.push(['usr-area', 'Elija el área.']);
    if (!d.nombre_completo) errores.push(['usr-nombre-completo', 'Escriba el nombre completo.']);
    else if (d.nombre_completo.split(' ').length < 2) errores.push(['usr-nombre-completo', 'Escriba nombre y al menos un apellido.']);
    if (!this.editando) {
      // Comprobación deliberadamente amplia: hay correos válidos con formas poco comunes. El acceso no lee más de 254
      if (d.correo.length > 254) errores.push(['usr-correo', 'El correo lleva hasta 254 caracteres.']);
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(d.correo)) errores.push(['usr-correo', 'Escriba un correo válido.']);
      else if (SRP.ref.usuarios.some(u => SRP.util.normalizar(u.correo) === SRP.util.normalizar(d.correo)))
        errores.push(['usr-correo', 'Ese correo ya tiene cuenta.']);
    }
    if (!d.cargo_rol) errores.push(['usr-cargo', 'Escriba el cargo.']);
    if (!SRP.PERFILES[d.perfil]) errores.push(['usr-perfil', 'Elija el perfil de captura.']);
    else if (d.perfil === 'ADMIN' && d.organizacion_id && !sedema) errores.push(['usr-perfil', 'La Administración global es sólo de la Secretaría: fuera de ella, la cuenta es de cabo, de coordinación o directiva.']);
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
      // Sin área fuera de la Secretaría
      area_id: sedema ? this.el('usr-area').value : null,
      cargo_rol: limpio('usr-cargo'), perfil: this.el('usr-perfil').value
    };
    const errores = this.validar(d);
    if (SRP.util.resumenErrores(this.el('usr-errores'), errores, this.CAMPOS)) return;

    const yo = SRP.sesion.usuario;
    const ahora = SRP.util.ahoraISO();
    const datos = { nombre_completo: d.nombre_completo, correo: d.correo, organizacion_id: d.organizacion_id, area_id: d.area_id,
      cargo_rol: d.cargo_rol, perfil: d.perfil };
    if (this.real()) { await this.guardarEnServidor(datos); return; }
    let u, entrada;
    if (this.editando) {
      const previo = this.editando;
      const campos = ['nombre_completo', 'organizacion_id', 'area_id', 'cargo_rol', 'perfil'];
      const valor = (o, k) => o[k] || '';
      const cambiados = campos.filter(k => (k === 'nombre_completo' ? SRP.util.nombreCompleto(previo) : valor(previo, k)) !== valor(datos, k));
      u = Object.assign({}, previo, datos, { correo: previo.correo, editado_por_id: yo.id, fecha_ultima_edicion: ahora });
      delete u.nombre; delete u.apellido_paterno; delete u.apellido_materno;
      entrada = SRP.bitacora.entrada('EDITADO', 'usuario', u.id, 'Campos: ' + (cambiados.join(', ') || 'ninguno'));
    } else {
      // Sin coordinadores: el campo sigue en la tabla, sin uso desde la 1.4
      u = Object.assign({ id: SRP.util.generarId(), activo: true, coordinadores_ids: [],
        fecha_creacion: ahora, creado_por_id: yo.id, editado_por_id: null, fecha_ultima_edicion: null }, datos);
      entrada = SRP.bitacora.entrada('CREADO', 'usuario', u.id, 'Alta de ' + d.correo + ' con perfil ' + d.perfil + ' en ' + SRP.ref.nombreOrganizacion(d.organizacion_id));
    }
    await SRP.almacen.guardarConBitacora('usuarios', u, entrada);
    this.el('dlg-usuario').close();
    await SRP.ref.recargar();
    SRP.util.anunciar(this.editando ? 'Cuenta actualizada.' : 'Cuenta dada de alta.');
    this.preparar();
  },

  /* Desactivar se deshace: no pregunta, lo dice el aviso y ofrece «Deshacer».
     `deshaciendo`: viene de «Deshacer» del aviso; no se vuelve a ofrecer deshacer */
  async cambiarEstado(u, deshaciendo) {
    if (!SRP.permisos.exigir('usuario.administrar')) return;
    if (u.id === SRP.sesion.usuario.id) { SRP.util.anunciar('No puede desactivar su propia cuenta: el sistema se quedaría sin quien lo administre.', 'aviso'); return; }
    const activar = !u.activo;
    let nuevo = Object.assign({}, u, { activo: activar, editado_por_id: SRP.sesion.usuario.id, fecha_ultima_edicion: SRP.util.ahoraISO() });
    let cerradas = 0;   // con datos reales, desactivar cierra sus sesiones abiertas
    if (this.real()) {
      const r = await SRP.servidor.pedir('POST', '/cuentas/' + encodeURIComponent(u.id) + '/estado', { activo: activar });
      if (!r.ok) { this.noSePudo(r, 'la cuenta no cambió'); return; }
      nuevo = await this.ponerDelServidor(r.datos.usuario, u);
      cerradas = r.datos.sesionesCerradas || 0;
    } else {
      await SRP.almacen.guardarConBitacora('usuarios', nuevo, SRP.bitacora.entrada(activar ? 'ACTIVADO' : 'DESACTIVADO', 'usuario', u.id));
    }
    await SRP.ref.recargar();
    const nombre = SRP.util.nombreCompleto(u);
    SRP.util.anunciar(activar ? 'Cuenta de ' + nombre + ' activada.'
      : 'Cuenta de ' + nombre + ' desactivada: ' + (cerradas ? 'se cerró su sesión y ' : '') + 'ya no puede entrar; sus registros siguen a su nombre.',
      'exito', deshaciendo ? null : { deshacer: () => this.cambiarEstado(nuevo, true) });
    this.preparar();
  },

  async eliminar(u) {
    if (!SRP.permisos.exigir('usuario.administrar')) return;
    if (u.id === SRP.sesion.usuario.id) { SRP.util.anunciar('No puede eliminar su propia cuenta.', 'aviso'); return; }
    await this.preparar();                 // recuenta justo antes de decidir
    if (!this.usos) { this.noSePudo({ sinRed: true }, 'la cuenta no se eliminó'); return; }
    // Cuenta en todas las tablas: árboles, jornadas de las que es cabo o encargado, cuentas y
    // catálogos que dio de alta o editó; con datos reales, también si ya entró
    const usos = this.usos[u.id];
    if (SRP.ref.totalUsos(usos)) {
      const resto = SRP.ref.textoUsos(usos);
      const partes = [resto ? 'aparece en ' + resto : '', usos.entradas ? 'ya entró al sistema' : ''].filter(Boolean);
      const motivo = partes.length > 1 ? partes.slice(0, -1).join(', ') + ' y ' + partes[partes.length - 1] : partes[0];
      SRP.util.anunciar('No se puede eliminar: ' + motivo + '. Desactive la cuenta: eso sí se deshace.', 'aviso');
      return;
    }
    const ok = await SRP.app.confirmar({ titulo: 'Eliminar cuenta', pregunta: '¿Eliminar la cuenta de ' + SRP.util.nombreCompleto(u) + '?',
      puntos: [this.real() ? 'No aparece en ningún árbol, jornada, cuenta ni catálogo, y nunca entró al sistema.' : 'No aparece en ningún árbol, jornada, cuenta ni catálogo.',
        'La bitácora conserva la constancia.', 'Si sólo no debe entrar, desactívela: eso sí se deshace.'],
      irreversible: true, boton: 'Eliminar cuenta', icono: 'basura', escribir: u.correo, escribirEtiqueta: 'Para confirmar, escriba el correo de la cuenta:' });
    if (!ok) return;
    if (this.real()) {
      const r = await SRP.servidor.pedir('DELETE', '/cuentas/' + encodeURIComponent(u.id));
      if (!r.ok) { this.noSePudo(r, 'la cuenta no se eliminó'); return; }
      await SRP.almacen.quitarLocal('usuarios', u.id);
    } else {
      await SRP.almacen.borrarConBitacora('usuarios', u.id,
        SRP.bitacora.entrada('ELIMINADO', 'usuario', u.id, u.correo));
    }
    await SRP.ref.recargar();
    SRP.util.anunciar('Cuenta eliminada.');
    this.preparar();
  },

  /* ---------- Con datos reales: el servidor ---------- */

  // En qué aparece cada cuenta, contado en el servidor; null si no respondió
  async usosDelServidor() {
    const r = await SRP.servidor.pedir('GET', '/cuentas/usos');
    return r.ok ? r.datos || {} : null;
  },

  // Los campos del servidor y los del formulario donde se dice su error
  CAMPO_DEL_SERVIDOR: {
    organizacion_id: 'usr-organizacion', area_id: 'usr-area', nombre_completo: 'usr-nombre-completo', correo: 'usr-correo',
    cargo_rol: 'usr-cargo', perfil: 'usr-perfil'
  },

  // El alta o la edición va al servidor; si no la acepta, sus motivos van en el formulario, que sigue abierto
  async guardarEnServidor(datos) {
    const previo = this.editando;
    const libre = SRP.util.ocupado(this.el('btn-usr-guardar'), 'Guardando…', 'disco');
    let r;
    // La edición lleva la versión de la cuenta: si otra Administración la cambió mientras tanto, no escribe encima
    const version = previo ? previo.fecha_ultima_edicion || previo.fecha_creacion || null : null;
    try { r = previo ? await SRP.servidor.pedir('PUT', '/cuentas/' + encodeURIComponent(previo.id), Object.assign({ version }, datos)) : await SRP.servidor.pedir('POST', '/cuentas', datos); }
    finally { libre(); }
    if (!r.ok && r.codigo === 'VERSION_VIEJA') { await this.recargarCambiada(previo); return; }
    if (!r.ok) {
      const errores = (r.errores || []).map(([campo, texto]) => [this.CAMPO_DEL_SERVIDOR[campo] || 'usr-nombre-completo', texto]);
      if (errores.length) SRP.util.resumenErrores(this.el('usr-errores'), errores, this.CAMPOS);
      else this.noSePudo(r, 'la cuenta no se guardó');
      return;
    }
    const u = await this.ponerDelServidor(r.datos.usuario, previo);
    this.el('dlg-usuario').close();
    await SRP.ref.recargar();
    this.preparar();
    if (previo) SRP.util.anunciar('Cuenta actualizada.');
    else this.mostrarTemporal(u, r.datos, true);
  },

  // Otra Administración cambió la cuenta mientras ésta la editaba: el formulario se vuelve a llenar con lo que guardó
  async recargarCambiada(previo) {
    await SRP.remoto.bajarCuentas();
    await SRP.ref.recargar();
    const u = await SRP.almacen.uno('usuarios', previo.id);
    if (u) this.abrirFormulario(u, true);
  },

  /* La cuenta que devolvió el servidor, en el teléfono con lo que ya se sabía de ella. Su alta y su último cambio,
     los del servidor: son su versión */
  async ponerDelServidor(fila, previo) {
    const yo = SRP.sesion.usuario.id, ahora = SRP.util.ahoraISO();
    const u = previo ? Object.assign({}, previo, { editado_por_id: yo, fecha_ultima_edicion: ahora }, fila)
      : Object.assign({ fecha_creacion: ahora, creado_por_id: yo, editado_por_id: null, fecha_ultima_edicion: null }, fila);
    await SRP.almacen.ponerLocal('usuarios', u);
    return u;
  },

  /* RESTABLECER CONTRASEÑA: el servidor le pone otra temporal y cierra sus sesiones; lo que no haya enviado
     se queda en cada teléfono. La propia no se restablece aquí: cada quien cambia la suya. */
  async restablecer(u) {
    if (!SRP.permisos.exigir('usuario.administrar') || u.id === SRP.sesion.usuario.id) return;
    const ok = await SRP.app.confirmar({ titulo: 'Restablecer contraseña', pregunta: '¿Darle una contraseña temporal nueva a ' + SRP.util.nombreCompleto(u) + '?',
      puntosTitulo: 'Qué pasa:', puntos: ['Su contraseña de ahora deja de servir.',
        'Se cierra su sesión en todos sus teléfonos; lo que no haya enviado se queda guardado en cada uno.', 'Usted verá la temporal nueva para dársela.'],
      boton: 'Restablecer', icono: 'candado' });
    if (!ok) return;
    const r = await SRP.servidor.pedir('POST', '/cuentas/' + encodeURIComponent(u.id) + '/restablecer');
    if (!r.ok) { this.noSePudo(r, 'la contraseña no cambió'); return; }
    this.mostrarTemporal(u, r.datos, false);
  },

  /* LA CONTRASEÑA TEMPORAL se ve una sola vez: el servidor no la guarda legible y no la vuelve a dar.
     `alta`: la cuenta es nueva; si no, se restableció. */
  mostrarTemporal(u, datos, alta) {
    const esc = SRP.util.escapar, nombre = '<b>' + esc(SRP.util.nombreCompleto(u)) + '</b>';
    this.el('clave-temporal-titulo').textContent = alta ? 'Cuenta creada' : 'Contraseña restablecida';
    this.el('clave-temporal-intro').innerHTML = alta
      ? 'La cuenta de ' + nombre + ' (' + esc(u.correo) + ') ya está dada de alta. Para que pueda entrar, dele esta contraseña temporal:'
      : 'La contraseña de ' + nombre + ' se cambió por esta temporal. Désela para que vuelva a entrar:';
    this.el('clave-temporal-valor').textContent = datos.temporal;
    this.el('clave-temporal-vence').textContent = datos.temporalVence;
    this.el('btn-clave-temporal-copiar').innerHTML = '<span>Copiar</span>';
    this.el('dlg-clave-temporal').showModal();
  },

  // El botón dice si se copió: un aviso quedaría detrás de la ventana
  async copiarTemporal() {
    const b = this.el('btn-clave-temporal-copiar'), valor = this.el('clave-temporal-valor');
    try {
      await navigator.clipboard.writeText(valor.textContent);
      b.innerHTML = SRP.ICONOS.svg('palomita', 'medio') + '<span>Copiada</span>';
    } catch (e) {
      // Sin permiso para copiar: queda seleccionada, para copiarla a mano
      const rango = document.createRange(); rango.selectNodeContents(valor);
      const sel = window.getSelection(); sel.removeAllRanges(); sel.addRange(rango);
      b.innerHTML = '<span>Selecciónela y cópiela</span>';
    }
  },

  noSePudo(r, que) {
    SRP.util.anunciar(r.sinRed ? 'Sin conexión con el servidor: ' + que + '. Intente de nuevo cuando haya señal.' : r.mensaje, 'aviso');
  }
};

// Acciones que escriben en el teléfono: si fallan, se dice qué no se pudo hacer
SRP.util.proteger(SRP.usuarios, { guardar: 'guardar la cuenta', cambiarEstado: 'cambiar el estado de la cuenta', eliminar: 'eliminar la cuenta', restablecer: 'restablecer la contraseña' });
