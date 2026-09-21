/* LISTADO DE REGISTROS: lo que cada perfil puede ver, con filtros por fecha. */
window.SRP = window.SRP || {};

SRP.registros = {
  // anio y mes son el camino normal; desde/hasta es el rango fino. Los dos no conviven:
  // elegir uno limpia el otro, para que la pantalla nunca muestre dos criterios a la vez.
  filtro: { anio: '', mes: '', desde: '', hasta: '', registrador: '' },
  visibles: [], filtrados: [], mostrados: 0,

  el(id) { return document.getElementById(id); },

  iniciar() {
    this.el('filtro-atajos').addEventListener('click', (e) => {
      const b = e.target.closest('.chip'); if (!b) return;
      this.aplicarAtajo(b.dataset.atajo);
    });
    this.el('filtro-anio').addEventListener('change', () => {
      this.filtro.anio = this.el('filtro-anio').value;
      this.filtro.mes = '';                 // al cambiar de año, el mes elegido puede no existir ahí
      this.limpiarRango();
      this.llenarMeses();
      this.sincronizarControles();
      this.aplicar();
    });
    this.el('filtro-mes').addEventListener('change', () => {
      this.filtro.mes = this.el('filtro-mes').value;
      if (this.filtro.mes && !this.filtro.anio) {   // un mes sin año no significa nada
        this.filtro.anio = this.aniosDisponibles()[0] || String(new Date().getFullYear());
        this.el('filtro-anio').value = this.filtro.anio;
      }
      this.limpiarRango();
      this.sincronizarControles();
      this.aplicar();
    });
    this.el('btn-filtrar').addEventListener('click', () => {
      const desde = this.el('filtro-desde').value;
      const hasta = this.el('filtro-hasta').value;
      if (desde && hasta && desde > hasta) {
        SRP.util.anunciar('La fecha «Desde» es posterior a «Hasta». Corrija el rango.', 'alerta');
        return;
      }
      this.filtro.desde = desde;
      this.filtro.hasta = hasta;
      this.filtro.registrador = this.el('filtro-registrador').value;
      if (desde || hasta) { this.filtro.anio = ''; this.filtro.mes = ''; }
      this.sincronizarControles();
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
    this.llenarAnios();
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
    this.el('filtro-anio').innerHTML = '<option value="">Todos</option>' +
      anios.map(a => '<option value="' + a + '">' + a + '</option>').join('');
  },

  // Sólo los meses que tienen registros en el año elegido: evita elegir un mes vacío
  llenarMeses() {
    const anio = this.filtro.anio;
    const meses = anio
      ? [...new Set(this.visibles.filter(r => r.fecha_plantacion.startsWith(anio)).map(r => r.fecha_plantacion.slice(5, 7)))].sort()
      : [];
    const sel = this.el('filtro-mes');
    sel.innerHTML = '<option value="">Todos</option>' +
      meses.map(m => '<option value="' + m + '">' + SRP.util.nombreMes('2000-' + m, true) + '</option>').join('');
    sel.disabled = !anio;
    sel.value = meses.includes(this.filtro.mes) ? this.filtro.mes : '';
    if (sel.value !== this.filtro.mes) this.filtro.mes = sel.value;
  },

  aplicarAtajo(atajo) {
    const hoy = new Date();
    const f = this.filtro;
    if (atajo === 'todos') { f.anio = ''; f.mes = ''; }
    else if (atajo === 'anio') { f.anio = String(hoy.getFullYear()); f.mes = ''; }
    else {
      const d = new Date(hoy.getFullYear(), hoy.getMonth() - (atajo === 'mes-pasado' ? 1 : 0), 1);
      f.anio = String(d.getFullYear());
      f.mes = String(d.getMonth() + 1).padStart(2, '0');
    }
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
    const hoy = new Date();
    const mesActual = String(hoy.getFullYear()) + '-' + String(hoy.getMonth() + 1).padStart(2, '0');
    const d = new Date(hoy.getFullYear(), hoy.getMonth() - 1, 1);
    const mesPasado = String(d.getFullYear()) + '-' + String(d.getMonth() + 1).padStart(2, '0');
    const periodo = f.anio ? f.anio + (f.mes ? '-' + f.mes : '') : '';
    const sinRango = !f.desde && !f.hasta;
    const activo = {
      mes: sinRango && periodo === mesActual,
      'mes-pasado': sinRango && periodo === mesPasado,
      anio: sinRango && periodo === String(hoy.getFullYear()),
      todos: sinRango && periodo === ''
    };
    this.el('filtro-atajos').querySelectorAll('.chip').forEach(c =>
      c.setAttribute('aria-pressed', String(!!activo[c.dataset.atajo])));
  },

  aplicar() {
    const f = this.filtro;
    const periodo = f.anio ? f.anio + (f.mes ? '-' + f.mes : '') : '';
    this.filtrados = this.visibles.filter(r =>
      (!periodo || r.fecha_plantacion.startsWith(periodo)) &&
      (!f.desde || r.fecha_plantacion >= f.desde) &&
      (!f.hasta || r.fecha_plantacion <= f.hasta) &&
      (!f.registrador || r.registrador_id === f.registrador));
    this.pintar(false);
  },

  descripcionFiltro() {
    const f = this.filtro;
    const partes = [];
    if (f.anio && f.mes) partes.push(SRP.util.nombreMes(f.anio + '-' + f.mes));
    else if (f.anio) partes.push('Año ' + f.anio);
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
      const boton = (accion, clase, icono, texto) =>
        '<button type="button" class="btn ' + clase + ' btn-chico" data-accion="' + accion + '" data-id="' + r.id + '">' +
        SRP.ICONOS.svg(icono, 16) + '<span>' + texto + '</span></button>';
      const botones = [boton('ver', 'btn-secundario', 'ojo', 'Ver')];
      if (SRP.permisos.puedeEditar(u, r, SRP.ref.usuarioPorId)) botones.push(boton('editar', 'btn-editar', 'lapiz', 'Editar'));
      if (SRP.permisos.puedeEliminar(u, r, SRP.ref.usuarioPorId)) botones.push(boton('eliminar', 'btn-peligro', 'basura', 'Eliminar'));
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
