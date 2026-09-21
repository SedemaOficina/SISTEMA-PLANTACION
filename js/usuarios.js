/* ADMINISTRACIÓN DE CUENTAS (sólo Administración global).
   Una sola puerta de alta: aquí se crea la cuenta, se le asigna perfil, área y jefe.
   Nadie se da de alta solo. Todo cambio queda en la bitácora. */
window.SRP = window.SRP || {};

SRP.usuarios = {
  editando: null, uso: {},

  el(id) { return document.getElementById(id); },

  iniciar() {
    this.el('usr-buscar').addEventListener('input', () => this.pintar());
    this.el('btn-usr-agregar').addEventListener('click', () => this.abrirFormulario(null));
    this.el('btn-usr-cancelar').addEventListener('click', () => this.el('dlg-usuario').close());
    this.el('form-usuario').addEventListener('submit', (e) => { e.preventDefault(); this.guardar(); });
    // El campo Jefe sólo tiene sentido para quien es registrador
    this.el('usr-perfil').addEventListener('change', () => this.ajustarPorPerfil());
    this.el('tabla-usuarios').addEventListener('click', (e) => {
      const b = e.target.closest('button[data-accion]'); if (!b) return;
      const u = SRP.ref.usuarioPorId[b.dataset.id];
      if (b.dataset.accion === 'editar') this.abrirFormulario(u);
      if (b.dataset.accion === 'estado') this.cambiarEstado(u);
      if (b.dataset.accion === 'eliminar') this.eliminar(u);
    });
  },

  async preparar() {
    const plantaciones = await SRP.almacen.todos('plantaciones');
    this.uso = {};
    plantaciones.forEach(p => { this.uso[p.registrador_id] = (this.uso[p.registrador_id] || 0) + 1; });
    this.pintar();
  },

  pintar() {
    const esc = SRP.util.escapar;
    const q = SRP.util.normalizar(this.el('usr-buscar').value);
    const yo = SRP.sesion.usuario.id;
    const lista = SRP.ref.usuarios
      .filter(u => !q || [SRP.util.nombreCompleto(u), u.correo, SRP.ref.nombreCatalogo(u.area_id)]
        .some(t => SRP.util.normalizar(t).includes(q)))
      .sort((a, b) => SRP.util.nombreCompleto(a).localeCompare(SRP.util.nombreCompleto(b), 'es'));

    const cab = '<thead><tr><th scope="col">Nombre</th><th scope="col">Correo</th><th scope="col">Área</th>' +
      '<th scope="col">Cargo y rol</th><th scope="col">Perfil</th><th scope="col">Jefe</th>' +
      '<th scope="col">Estado</th><th scope="col">Registros</th><th scope="col">Acciones</th></tr></thead>';

    const filas = lista.map(u => {
      const n = this.uso[u.id] || 0;
      const soyYo = u.id === yo;
      const acciones = ['<button type="button" class="btn btn-editar btn-chico" data-accion="editar" data-id="' + u.id + '">' +
        SRP.ICONOS.svg('lapiz', 16) + '<span>Editar</span></button>'];
      // Nadie se desactiva ni se elimina a sí mismo: dejaría el sistema sin quien administre
      if (!soyYo) {
        acciones.push('<button type="button" class="btn btn-secundario btn-chico" data-accion="estado" data-id="' + u.id + '">' + (u.activo ? 'Desactivar' : 'Activar') + '</button>');
        if (n === 0) acciones.push('<button type="button" class="btn btn-peligro btn-chico" data-accion="eliminar" data-id="' + u.id + '">' +
          SRP.ICONOS.svg('basura', 16) + '<span>Eliminar</span></button>');
      }
      return '<tr><td data-etiqueta="Nombre">' + esc(SRP.util.nombreCompleto(u)) + (soyYo ? ' <span class="insignia">usted</span>' : '') + '</td>' +
        '<td data-etiqueta="Correo">' + esc(u.correo) + '</td>' +
        '<td data-etiqueta="Área">' + esc(SRP.ref.nombreCatalogo(u.area_id)) + '</td>' +
        '<td data-etiqueta="Cargo y rol">' + esc(u.cargo_rol) + '</td>' +
        '<td data-etiqueta="Perfil">' + esc(SRP.permisos.de(u).etiqueta) + '</td>' +
        '<td data-etiqueta="Jefe">' + esc(u.jefe_id ? SRP.ref.nombreUsuario(u.jefe_id) : '—') + '</td>' +
        '<td data-etiqueta="Estado"><span class="estado-texto" data-activo="' + u.activo + '">' + (u.activo ? 'Activo' : 'Inactivo') + '</span></td>' +
        '<td data-etiqueta="Registros">' + n + '</td>' +
        '<td data-etiqueta="Acciones"><div class="tabla-acciones">' + acciones.join('') + '</div></td></tr>';
    }).join('');

    this.el('tabla-usuarios').innerHTML = cab + '<tbody>' + (filas || '<tr><td colspan="9">Sin resultados.</td></tr>') + '</tbody>';
  },

  llenarListas(usuario) {
    const esc = SRP.util.escapar;
    const areaActual = usuario ? usuario.area_id : '';
    const areas = SRP.ref.deTipo('area', true).slice();
    if (areaActual && !areas.find(a => a.id === areaActual) && SRP.ref.catalogoPorId[areaActual]) areas.push(SRP.ref.catalogoPorId[areaActual]);
    this.el('usr-area').innerHTML = '<option value="">Seleccione el área</option>' +
      areas.map(a => '<option value="' + a.id + '">' + esc(a.nombre) + (a.activo ? '' : ' (inactiva)') + '</option>').join('');

    this.el('usr-perfil').innerHTML = '<option value="">Seleccione el perfil</option>' +
      Object.keys(SRP.PERFILES).map(k => '<option value="' + k + '">' + esc(SRP.PERFILES[k].etiqueta) + '</option>').join('');

    // Jefe posible: cuentas activas con perfil de jefe o de administración, nunca la persona misma
    const jefes = SRP.ref.usuarios
      .filter(u => u.activo && (u.perfil === 'JEFE' || u.perfil === 'ADMIN') && (!usuario || u.id !== usuario.id))
      .sort((a, b) => SRP.util.nombreCompleto(a).localeCompare(SRP.util.nombreCompleto(b), 'es'));
    this.el('usr-jefe').innerHTML = '<option value="">Sin jefe asignado</option>' +
      jefes.map(u => '<option value="' + u.id + '">' + esc(SRP.util.nombreCompleto(u)) + '</option>').join('');
  },

  ajustarPorPerfil() {
    const perfil = this.el('usr-perfil').value;
    const p = SRP.PERFILES[perfil];
    this.el('usr-perfil-ayuda').textContent = p ? p.descripcion : '';
    // Sólo un registrador tiene jefe: los demás perfiles no dependen de nadie
    const conJefe = perfil === 'REGISTRADOR';
    this.el('caja-usr-jefe').hidden = !conJefe;
    if (!conJefe) this.el('usr-jefe').value = '';
  },

  abrirFormulario(usuario) {
    this.editando = usuario;
    this.llenarListas(usuario);
    this.el('dlg-usuario-titulo').textContent = usuario ? 'Editar cuenta' : 'Dar de alta';
    this.el('usr-nombre').value = usuario ? usuario.nombre : '';
    this.el('usr-ap').value = usuario ? usuario.apellido_paterno : '';
    this.el('usr-am').value = usuario ? usuario.apellido_materno || '' : '';
    this.el('usr-correo').value = usuario ? usuario.correo : '';
    this.el('usr-correo').readOnly = !!usuario;   // el correo identifica la cuenta: no cambia
    this.el('usr-area').value = usuario ? usuario.area_id : '';
    this.el('usr-cargo').value = usuario ? usuario.cargo_rol : '';
    this.el('usr-perfil').value = usuario ? usuario.perfil : 'REGISTRADOR';
    this.ajustarPorPerfil();
    this.el('usr-jefe').value = usuario && usuario.jefe_id ? usuario.jefe_id : '';
    this.el('usr-errores').hidden = true;
    ['usr-nombre', 'usr-ap', 'usr-correo', 'usr-area', 'usr-cargo', 'usr-perfil'].forEach(id => this.el(id).removeAttribute('aria-invalid'));
    this.el('dlg-usuario').showModal();
  },

  validar(d) {
    const errores = [];
    if (!d.nombre) errores.push(['usr-nombre', 'Escriba el nombre.']);
    if (!d.apellido_paterno) errores.push(['usr-ap', 'Escriba el apellido paterno.']);
    if (!this.editando) {
      // Comprobación deliberadamente amplia: hay correos válidos con formas poco comunes
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(d.correo)) errores.push(['usr-correo', 'Escriba un correo válido.']);
      else if (SRP.ref.usuarios.some(u => SRP.util.normalizar(u.correo) === SRP.util.normalizar(d.correo)))
        errores.push(['usr-correo', 'Ese correo ya tiene cuenta.']);
    }
    if (!d.area_id) errores.push(['usr-area', 'Elija el área.']);
    if (!d.cargo_rol) errores.push(['usr-cargo', 'Escriba el cargo y rol.']);
    if (!SRP.PERFILES[d.perfil]) errores.push(['usr-perfil', 'Elija el perfil.']);
    // Quien administra no puede quitarse a sí mismo ese perfil: dejaría el sistema sin administración
    if (this.editando && this.editando.id === SRP.sesion.usuario.id && d.perfil !== 'ADMIN')
      errores.push(['usr-perfil', 'No puede cambiar su propio perfil de administración. Pida a otra cuenta de administración que lo haga.']);
    return errores;
  },

  async guardar() {
    const limpio = (id) => this.el(id).value.trim().replace(/\s+/g, ' ');
    const d = {
      nombre: limpio('usr-nombre'), apellido_paterno: limpio('usr-ap'), apellido_materno: limpio('usr-am'),
      correo: limpio('usr-correo').toLowerCase(), area_id: this.el('usr-area').value,
      cargo_rol: limpio('usr-cargo'), perfil: this.el('usr-perfil').value,
      jefe_id: this.el('usr-perfil').value === 'REGISTRADOR' ? (this.el('usr-jefe').value || null) : null
    };
    const errores = this.validar(d);
    const caja = this.el('usr-errores');
    ['usr-nombre', 'usr-ap', 'usr-correo', 'usr-area', 'usr-cargo', 'usr-perfil'].forEach(id => this.el(id).removeAttribute('aria-invalid'));
    if (errores.length) {
      errores.forEach(([id]) => this.el(id).setAttribute('aria-invalid', 'true'));
      caja.innerHTML = '<ul>' + errores.map(([id, t]) => '<li><a href="#' + id + '">' + t + '</a></li>').join('') + '</ul>';
      caja.hidden = false; caja.focus();
      return;
    }

    const yo = SRP.sesion.usuario;
    const ahora = SRP.util.ahoraISO();
    let u, entrada;
    if (this.editando) {
      const previo = this.editando;
      const campos = ['nombre', 'apellido_paterno', 'apellido_materno', 'area_id', 'cargo_rol', 'perfil', 'jefe_id'];
      const cambiados = campos.filter(k => (previo[k] || '') !== (d[k] || ''));
      u = Object.assign({}, previo, d, { correo: previo.correo, editado_por_id: yo.id, fecha_ultima_edicion: ahora });
      entrada = SRP.bitacora.entrada('EDITADO', 'usuario', u.id, 'Campos: ' + (cambiados.join(', ') || 'ninguno'));
    } else {
      u = Object.assign({ id: SRP.util.generarId(), activo: true, es_ficticio: SRP.CONFIG.ES_FICTICIO,
        fecha_alta: ahora, alta_por_id: yo.id, editado_por_id: null, fecha_ultima_edicion: null }, d);
      entrada = SRP.bitacora.entrada('CREADO', 'usuario', u.id, 'Alta de ' + d.correo + ' con perfil ' + d.perfil);
    }
    await SRP.almacen.guardarConBitacora('usuarios', u, entrada);
    this.el('dlg-usuario').close();
    await SRP.ref.recargar();
    SRP.util.anunciar(this.editando ? 'Cuenta actualizada.' : 'Cuenta dada de alta.');
    this.preparar();
  },

  async cambiarEstado(u) {
    const activar = !u.activo;
    if (!activar) {
      const ok = await SRP.app.confirmar('¿Desactivar la cuenta de ' + SRP.util.nombreCompleto(u) +
        '? Dejará de poder entrar; sus registros se conservan y siguen a su nombre.', 'Desactivar', 'palomita');
      if (!ok) return;
    }
    const nuevo = Object.assign({}, u, { activo: activar, editado_por_id: SRP.sesion.usuario.id, fecha_ultima_edicion: SRP.util.ahoraISO() });
    await SRP.almacen.guardarConBitacora('usuarios', nuevo, SRP.bitacora.entrada(activar ? 'ACTIVADO' : 'DESACTIVADO', 'usuario', u.id));
    await SRP.ref.recargar();
    SRP.util.anunciar(activar ? 'Cuenta activada.' : 'Cuenta desactivada.');
    this.preparar();
  },

  async eliminar(u) {
    await this.preparar();                 // recuenta justo antes de decidir
    if (this.uso[u.id]) {
      SRP.util.anunciar('No se puede eliminar: tiene ' + this.uso[u.id] + ' registros a su nombre. Desactive la cuenta.', 'alerta');
      return;
    }
    const ok = await SRP.app.confirmar('¿Eliminar la cuenta de ' + SRP.util.nombreCompleto(u) +
      '? No tiene registros a su nombre. La bitácora conserva la constancia.', 'Eliminar');
    if (!ok) return;
    await SRP.almacen.borrarConBitacora('usuarios', u.id,
      SRP.bitacora.entrada('ELIMINADO', 'usuario', u.id, u.correo));
    await SRP.ref.recargar();
    SRP.util.anunciar('Cuenta eliminada.');
    this.preparar();
  }
};
