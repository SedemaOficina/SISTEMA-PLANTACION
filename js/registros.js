/* LISTADO DE REGISTROS: lo que cada perfil puede ver, con filtros por fecha. */
window.SRP = window.SRP || {};

SRP.registros = {
  filtro: { mes: null, desde: '', hasta: '', registrador: '' },
  visibles: [], filtrados: [], mostrados: 0,

  el(id) { return document.getElementById(id); },

  iniciar() {
    this.el('filtro-meses').addEventListener('click', (e) => {
      const b = e.target.closest('.chip'); if (!b) return;
      this.filtro.mes = b.dataset.mes || null;
      this.el('filtro-desde').value = ''; this.el('filtro-hasta').value = '';
      this.filtro.desde = ''; this.filtro.hasta = '';
      this.aplicar();
    });
    this.el('btn-filtrar').addEventListener('click', () => {
      this.filtro.desde = this.el('filtro-desde').value;
      this.filtro.hasta = this.el('filtro-hasta').value;
      this.filtro.registrador = this.el('filtro-registrador').value;
      if (this.filtro.desde || this.filtro.hasta) this.filtro.mes = null;
      if (this.filtro.desde && this.filtro.hasta && this.filtro.desde > this.filtro.hasta) {
        SRP.util.anunciar('La fecha «Desde» es posterior a «Hasta». Corrija el rango.', 'alerta');
        return;
      }
      this.aplicar();
    });
    this.el('btn-mas').addEventListener('click', () => this.pintar(true));
    this.el('lista-registros').addEventListener('click', (e) => {
      const b = e.target.closest('button[data-accion]'); if (!b) return;
      const r = this.visibles.find(x => x.id === b.dataset.id); if (!r) return;
      if (b.dataset.accion === 'ver') this.verDetalle(r);
      if (b.dataset.accion === 'editar') SRP.formulario.editar(r);
      if (b.dataset.accion === 'eliminar') this.eliminar(r);
    });
    this.el('btn-pdf').addEventListener('click', () => SRP.reportes.generar(this.filtrados, this.descripcionFiltro()));
    this.el('btn-detalle-cerrar').addEventListener('click', () => this.el('dlg-detalle').close());
  },

  async preparar() {
    const u = SRP.sesion.usuario;
    const alcance = SRP.permisos.de(u).alcance;
    this.el('titulo-registros').textContent =
      alcance === 'propios' ? 'Mis registros' : alcance === 'equipo' ? 'Registros de mi equipo' : 'Todos los registros';
    const todos = await SRP.almacen.porIndice('plantaciones', 'estatus', 'activo');
    this.visibles = todos.filter(r => SRP.permisos.alcanza(u, r, SRP.ref.usuarioPorId))
      .sort((a, b) => b.fecha_plantacion.localeCompare(a.fecha_plantacion) || b.fecha_registro.localeCompare(a.fecha_registro));

    // Filtro por registrador sólo para perfiles que ven a más de una persona
    const caja = this.el('caja-filtro-registrador');
    caja.hidden = alcance === 'propios';
    if (!caja.hidden) {
      const ids = [...new Set(this.visibles.map(r => r.registrador_id))];
      const sel = this.el('filtro-registrador');
      sel.innerHTML = '<option value="">Todos</option>' + ids
        .map(id => [id, SRP.ref.nombreUsuario(id)]).sort((a, b) => a[1].localeCompare(b[1], 'es'))
        .map(([id, n]) => '<option value="' + id + '">' + SRP.util.escapar(n) + '</option>').join('');
      sel.value = this.filtro.registrador;
    }
    this.pintarMeses();
    this.aplicar();
  },

  pintarMeses() {
    const meses = [...new Set(this.visibles.map(r => r.fecha_plantacion.slice(0, 7)))].sort().reverse().slice(0, 6);
    const chip = (valor, texto) => '<button type="button" class="chip" data-mes="' + valor + '" aria-pressed="' +
      String((this.filtro.mes || '') === valor) + '">' + texto + '</button>';
    this.el('filtro-meses').innerHTML = chip('', 'Todos') + meses.map(m => chip(m, SRP.util.nombreMes(m))).join('');
  },

  aplicar() {
    const f = this.filtro;
    this.filtrados = this.visibles.filter(r =>
      (!f.mes || r.fecha_plantacion.startsWith(f.mes)) &&
      (!f.desde || r.fecha_plantacion >= f.desde) &&
      (!f.hasta || r.fecha_plantacion <= f.hasta) &&
      (!f.registrador || r.registrador_id === f.registrador));
    this.el('filtro-meses').querySelectorAll('.chip').forEach(c =>
      c.setAttribute('aria-pressed', String((f.mes || '') === c.dataset.mes && !f.desde && !f.hasta)));
    this.pintar(false);
  },

  descripcionFiltro() {
    const f = this.filtro;
    const partes = [];
    if (f.mes) partes.push(SRP.util.nombreMes(f.mes));
    if (f.desde || f.hasta) partes.push('Del ' + (f.desde ? SRP.util.formatearFecha(f.desde) : 'inicio') + ' al ' + (f.hasta ? SRP.util.formatearFecha(f.hasta) : 'hoy'));
    if (f.registrador) partes.push('Registrador: ' + SRP.ref.nombreUsuario(f.registrador));
    return partes.length ? partes.join('. ') : 'Todos los registros';
  },

  pintar(agregar) {
    const u = SRP.sesion.usuario;
    const variosAutores = SRP.permisos.de(u).alcance !== 'propios';
    this.mostrados = agregar ? this.mostrados + SRP.CONFIG.LISTA_PAGINA : SRP.CONFIG.LISTA_PAGINA;
    const pagina = this.filtrados.slice(0, this.mostrados);
    const esc = SRP.util.escapar;
    this.el('lista-registros').innerHTML = pagina.map(r => {
      const esp = SRP.ref.especieDe(r);
      const botones = ['<button type="button" class="btn btn-secundario btn-chico" data-accion="ver" data-id="' + r.id + '">Ver</button>'];
      if (SRP.permisos.puedeEditar(u, r, SRP.ref.usuarioPorId))
        botones.push('<button type="button" class="btn btn-secundario btn-chico" data-accion="editar" data-id="' + r.id + '">Editar</button>');
      if (SRP.permisos.puedeEliminar(u, r, SRP.ref.usuarioPorId))
        botones.push('<button type="button" class="btn btn-texto btn-chico" data-accion="eliminar" data-id="' + r.id + '">Eliminar</button>');
      return '<li class="registro"><div class="registro-datos">' +
        '<span class="registro-fecha">' + SRP.util.formatearFecha(r.fecha_plantacion) + '</span>' +
        '<span class="registro-especie">' + esc(esp.comun) + '</span>' +
        '<span class="registro-lugar">' + esc(SRP.ref.territorio(r.alcaldia)) + ', ' + esc(SRP.ref.territorio(r.colonia)) + '</span>' +
        (variosAutores ? '<span class="registro-autor">' + esc(SRP.ref.nombreUsuario(r.registrador_id)) + '</span>' : '') +
        '</div><div class="registro-acciones">' + botones.join('') + '</div></li>';
    }).join('');
    const n = this.filtrados.length;
    this.el('registros-total').textContent = n === 0 ? 'No hay registros con este filtro.'
      : 'Total: ' + n + (n === 1 ? ' registro' : ' registros') + (n > pagina.length ? ' (se muestran ' + pagina.length + ')' : '');
    this.el('btn-mas').hidden = n <= pagina.length;
    this.el('btn-pdf').disabled = n === 0;
  },

  async verDetalle(r) {
    const esc = SRP.util.escapar;
    const esp = SRP.ref.especieDe(r);
    const filas = [
      ['Fecha de plantación', SRP.util.formatearFecha(r.fecha_plantacion)],
      ['Especie', esp.comun + (esp.cientifico ? ' (' + esp.cientifico + ')' : '')],
      ['Programa', SRP.ref.nombreCatalogo(r.programa_id)],
      ['Alcaldía', SRP.ref.territorio(r.alcaldia)],
      ['Colonia', SRP.ref.territorio(r.colonia)],
      ['Coordenadas', r.lat.toFixed(6) + ', ' + r.lng.toFixed(6)],
      ['Registrador', SRP.ref.nombreUsuario(r.registrador_id)]
    ];
    const historial = await SRP.bitacora.deEntidad(r.id);
    const lineas = historial.length ? historial.map(h =>
      '<li>' + SRP.util.formatearFechaHora(h.fecha) + ': ' + esc(h.accion.toLowerCase()) + ' por ' + esc(h.usuario_nombre) +
      ' (' + esc(SRP.PERFILES[h.perfil] ? SRP.PERFILES[h.perfil].etiqueta : h.perfil) + ')' + (h.detalle ? '. ' + esc(h.detalle) : '') + '</li>').join('')
      : '<li>Registro de la carga inicial de datos de prueba; sin cambios posteriores.</li>';
    this.el('dlg-detalle-cuerpo').innerHTML =
      (r.foto_base64 ? '<img class="foto-vista" src="' + r.foto_base64 + '" alt="Fotografía del árbol registrado">' : '<p class="nota">Registro sin fotografía.</p>') +
      '<dl class="detalle">' + filas.map(([k, x]) => '<div><dt>' + k + '</dt><dd>' + esc(x) + '</dd></div>').join('') + '</dl>' +
      '<h3>Historial</h3><ul class="historial">' + lineas + '</ul>';
    this.el('dlg-detalle').showModal();
  },

  async eliminar(r) {
    const ok = await SRP.app.confirmar('¿Eliminar el registro de ' + SRP.ref.especieDe(r).comun + ' del ' +
      SRP.util.formatearFecha(r.fecha_plantacion) + '? Dejará de aparecer en listados y reportes; el historial lo conserva.', 'Eliminar');
    if (!ok) return;
    // Retiro con constancia: se marca, no se borra (Norma 7.4)
    const nuevo = Object.assign({}, r, { estatus: 'eliminado', fecha_ultima_edicion: SRP.util.ahoraISO(), editado_por_id: SRP.sesion.usuario.id });
    await SRP.almacen.guardarConBitacora('plantaciones', nuevo, SRP.bitacora.entrada('ELIMINADO', 'plantacion', r.id));
    SRP.util.anunciar('Registro eliminado.');
    this.preparar();
  }
};
