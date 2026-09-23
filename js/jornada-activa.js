/* LA JORNADA ACTIVA: SE DECLARA ANTES DE REGISTRAR (D119).

   La gente trabaja por jornada de plantación. Antes de registrar el primer árbol, el cabo (o el
   coordinador que registra) declara la jornada una sola vez: nombre, fecha y comentarios. Sin
   una jornada abierta, «Nuevo registro» enseña la pantalla «Iniciar jornada» en lugar del
   formulario; con una, el formulario lleva arriba la franja de la jornada (nombre, fecha, cuántos
   árboles) con «Cambiar» y «Cerrar jornada». Cada árbol nace con `jornada_id` y hereda la fecha
   de plantación de su jornada: la fecha deja de pedirse por árbol.

   SALVAGUARDA. Un árbol a más de CONFIG.JORNADA.SEPARAR_M de los demás de la jornada abierta se
   pregunta antes de guardar: «¿Es de esta jornada?». Así un olvido de cerrar la jornada anterior
   no mezcla dos sitios sin que nadie lo note (lo que en D117 hacía el reparto automático, aquí es
   un aviso).

   VARIAS ABIERTAS. Se puede tener más de una jornada abierta (un cabo vuelve a la mañana al
   parque de la tarde); «Cambiar» elige entre las abiertas o inicia otra. Al entrar con una
   jornada abierta de un día anterior se avisa. Cerrar una jornada lleva a su revisión; una
   cerrada se puede reabrir para agregar un faltante.

   La tabla `jornadas` guarda además lo que antes vivía en «cierres»: conteo de plantados, puntos
   revisados y datos de cierre del reporte. */
window.SRP = window.SRP || {};

SRP.activa = {
  jornada: null,      // la jornada abierta con la que se registra

  el(id) { return document.getElementById(id); },

  iniciar() {
    this.el('form-iniciar-jornada').addEventListener('submit', (e) => { e.preventDefault(); this.iniciarJornada(); });
    this.el('btn-jornada-cambiar').addEventListener('click', () => this.abrirCambiar());
    this.el('btn-jornada-cerrar').addEventListener('click', () => this.cerrarJornada());
    this.el('btn-cambiar-nueva').addEventListener('click', () => { this.el('dlg-cambiar-jornada').close(); this.mostrarInicio(true); });
    this.el('btn-cambiar-cerrar').addEventListener('click', () => this.el('dlg-cambiar-jornada').close());
    this.el('lista-jornadas-abiertas').addEventListener('click', async (e) => {
      const b = e.target.closest('button[data-id]'); if (!b) return;
      const j = await SRP.almacen.uno('jornadas', b.dataset.id);
      if (j) { this.jornada = j; this.el('dlg-cambiar-jornada').close(); await this.preparar(); SRP.util.anunciar('Jornada activa: ' + j.nombre + '.'); }
    });
    this.el('btn-iniciar-cancelar').addEventListener('click', () => { this.mostrarInicio(false); this.preparar(); });
    this.el('ini-fecha').max = SRP.util.fechaHoy();
    this.el('btn-ini-hoy').addEventListener('click', () => {
      this.el('ini-fecha').value = SRP.util.fechaHoy();
      this.el('ini-fecha').removeAttribute('aria-invalid');
      this.el('ini-fecha').dispatchEvent(new Event('change', { bubbles: true }));
    });
    this.el('btn-iniciar-jornada').innerHTML = SRP.ICONOS.svg('palomita', 20) + '<span>Iniciar jornada</span>';
    this.el('btn-iniciar-cancelar').innerHTML = SRP.ICONOS.svg('cerrar', 18) + '<span>Cancelar</span>';
    this.el('btn-jornada-cerrar').innerHTML = SRP.ICONOS.svg('palomita', 18) + '<span>Cerrar jornada</span>';
    this.el('btn-jornada-cambiar').innerHTML = SRP.ICONOS.svg('jornadas', 18) + '<span>Cambiar</span>';
  },

  /* ---------- Datos ---------- */

  // Las jornadas abiertas de quien entró, la más reciente primero
  async abiertas() {
    const u = SRP.sesion.usuario;
    if (!u || !SRP.almacen.db) return [];
    return (await SRP.almacen.porIndice('jornadas', 'cabo_id', u.id))
      .filter(j => j.estatus === 'abierta')
      .sort((a, b) => b.fecha_inicio.localeCompare(a.fecha_inicio));
  },

  async registrosDe(j) {
    return (await SRP.almacen.porIndice('plantaciones', 'estatus', 'activo')).filter(r => r.jornada_id === j.id);
  },

  // Al entrar: la jornada abierta más reciente queda activa; si es de otro día, se avisa
  async alEntrar() {
    this.jornada = null;
    const ab = await this.abiertas();
    if (!ab.length) return;
    this.jornada = ab[0];
    if (this.jornada.fecha !== SRP.util.fechaHoy()) {
      SRP.util.anunciar('Tiene abierta la jornada «' + this.jornada.nombre + '» del ' + SRP.util.formatearFecha(this.jornada.fecha) +
        '. Ciérrela o inicie otra antes de registrar.', 'alerta');
    }
  },

  /* ---------- Pantalla ---------- */

  mostrarInicio(ver) {
    this.el('panel-iniciar-jornada').hidden = !ver;
    this.el('registrar-columnas').hidden = ver;
    this.el('franja-jornada').hidden = ver;
    this.el('btn-iniciar-cancelar').hidden = !this.jornada;   // sin jornada no hay a dónde volver
    if (ver) {
      this.el('ini-nombre').value = ''; this.el('ini-ubicacion').value = ''; this.el('ini-comentarios').value = '';
      // La fecha se elige a propósito (D29): vacía, con «Hoy» a un toque
      this.el('ini-fecha').value = '';
      this.el('ini-fecha').dispatchEvent(new Event('change', { bubbles: true }));
      this.el('ini-errores').hidden = true;
      this.el('ini-nombre').focus({ preventScroll: true });
    }
  },

  /* Deja «Nuevo registro» como corresponde: sin jornada, la pantalla de inicio; con jornada, el
     formulario con su franja. Al editar un registro se enseña la jornada de ese registro. */
  async preparar() {
    const editando = SRP.formulario.estado.editando;
    if (editando) {
      const j = editando.jornada_id ? await SRP.almacen.uno('jornadas', editando.jornada_id) : null;
      this.el('panel-iniciar-jornada').hidden = true;
      this.el('registrar-columnas').hidden = false;
      this.pintarFranja(j, await (j ? this.registrosDe(j) : []), true);
      SRP.formulario.el('campo-fecha').value = editando.fecha_plantacion;
      return;
    }
    if (!this.jornada || this.jornada.estatus !== 'abierta') this.jornada = (await this.abiertas())[0] || null;
    if (!this.jornada) { this.mostrarInicio(true); return; }
    this.el('panel-iniciar-jornada').hidden = true;
    this.el('registrar-columnas').hidden = false;
    this.pintarFranja(this.jornada, await this.registrosDe(this.jornada), false);
    // La fecha de plantación se hereda (D119)
    SRP.formulario.el('campo-fecha').value = this.jornada.fecha;
  },

  pintarFranja(j, registros, editando) {
    const f = this.el('franja-jornada');
    f.hidden = !j;
    if (!j) return;
    const esc = SRP.util.escapar;
    const n = registros.length;
    const atrasada = !editando && j.fecha !== SRP.util.fechaHoy();
    f.dataset.tono = atrasada ? 'alerta' : '';
    this.el('franja-jornada-texto').innerHTML =
      '<span class="franja-jornada-titulo">' + (editando ? 'Registro de la jornada ' : 'Jornada: ') + '<strong>' + esc(j.nombre) + '</strong></span>' +
      '<span class="franja-jornada-datos">' + esc(SRP.util.formatearFecha(j.fecha)) + (j.ubicacion ? ' · ' + esc(j.ubicacion) : '') + ' · ' + n + (n === 1 ? ' árbol' : ' árboles') +
      (j.estatus === 'cerrada' ? ' · cerrada' : '') + (atrasada ? ' · <b>no es de hoy</b>' : '') + '</span>';
    this.el('franja-jornada-acciones').hidden = !!editando;
  },

  /* ---------- Acciones ---------- */

  async iniciarJornada() {
    const nombre = this.el('ini-nombre').value.trim();
    const ubicacion = this.el('ini-ubicacion').value.trim();
    const fecha = this.el('ini-fecha').value;
    const comentarios = this.el('ini-comentarios').value.trim();
    const errores = [];
    if (!nombre) errores.push(['ini-nombre', 'Escriba el nombre de la jornada: el parque, la calle o el sitio.']);
    if (!fecha) errores.push(['ini-fecha', 'Indique la fecha de la jornada.']);
    else if (fecha > SRP.util.fechaHoy()) errores.push(['ini-fecha', 'La fecha no puede ser posterior a hoy.']);
    const caja = this.el('ini-errores');
    ['ini-nombre', 'ini-fecha'].forEach(id => this.el(id).removeAttribute('aria-invalid'));
    if (errores.length) {
      caja.hidden = false;
      caja.innerHTML = '<ul>' + errores.map(([id, t]) => '<li><a href="#' + id + '">' + SRP.util.escapar(t) + '</a></li>').join('') + '</ul>';
      errores.forEach(([id]) => this.el(id).setAttribute('aria-invalid', 'true'));
      this.el(errores[0][0]).focus();
      return;
    }
    caja.hidden = true;
    const u = SRP.sesion.usuario;
    const ahora = SRP.util.ahoraISO();
    const j = Object.assign({
      id: SRP.util.generarId(), es_ficticio: SRP.CONFIG.ES_FICTICIO,
      nombre, ubicacion, fecha, comentarios, cabo_id: u.id, estatus: 'abierta',
      fecha_inicio: ahora, fecha_cierre: null,
      creado_por_id: u.id, fecha_creacion: ahora, editado_por_id: u.id, fecha_ultima_edicion: ahora,
      arboles_plantados: null, puntos_revisados: [], encargado_id: u.id
    }, Object.fromEntries(SRP.reportes.CAMPOS.map(k => [k, ''])));
    await SRP.almacen.guardarConBitacora('jornadas', j, SRP.bitacora.entrada('CREADO', 'jornada', j.id, 'Jornada «' + nombre + '» del ' + SRP.util.formatearFecha(fecha)));
    this.jornada = j;
    this.mostrarInicio(false);
    await this.preparar();
    SRP.util.anunciar('Jornada «' + nombre + '» iniciada. Ya puede registrar árboles.');
    SRP.formulario.el('btn-ubicacion').focus({ preventScroll: true });
  },

  async cerrarJornada() {
    const j = this.jornada; if (!j) return;
    const regs = await this.registrosDe(j);
    const ok = await SRP.app.confirmar('¿Cerrar la jornada «' + j.nombre + '» con ' + regs.length + (regs.length === 1 ? ' árbol' : ' árboles') +
      '? Pasará a su revisión; se puede reabrir después.', 'Cerrar jornada', 'palomita');
    if (!ok) return;
    await this.cambiarEstatus(j, 'cerrada');
    this.jornada = null;
    SRP.jornadas.actual = j.id;
    SRP.jornadas.volverAlDetalle = true;
    SRP.app.mostrarVista('jornadas');
  },

  async reabrir(j) {
    await this.cambiarEstatus(j, 'abierta');
    this.jornada = await SRP.almacen.uno('jornadas', j.id);
    SRP.util.anunciar('Jornada «' + j.nombre + '» reabierta. Es la activa en Nuevo registro.');
  },

  async cambiarEstatus(j, estatus) {
    const u = SRP.sesion.usuario;
    const ahora = SRP.util.ahoraISO();
    const nuevo = Object.assign({}, j, { estatus, fecha_cierre: estatus === 'cerrada' ? ahora : null, editado_por_id: u.id, fecha_ultima_edicion: ahora });
    await SRP.almacen.guardarConBitacora('jornadas', nuevo, SRP.bitacora.entrada('EDITADO', 'jornada', j.id, estatus === 'cerrada' ? 'Jornada cerrada' : 'Jornada reabierta'));
    if (SRP.envio.simulado()) SRP.envio.enviar({ silencioso: true });
  },

  async abrirCambiar() {
    const ab = await this.abiertas();
    const esc = SRP.util.escapar;
    const conteos = await Promise.all(ab.map(j => this.registrosDe(j)));
    this.el('lista-jornadas-abiertas').innerHTML = ab.length ? ab.map((j, i) =>
      '<li><button type="button" class="jornada-boton" data-id="' + j.id + '" aria-pressed="' + String(this.jornada && this.jornada.id === j.id) + '">' +
      '<span class="jornada-datos"><span class="jornada-dia">' + esc(j.nombre) + '</span>' +
      '<span class="jornada-cifras">' + esc(SRP.util.formatearFecha(j.fecha)) + ' · ' + conteos[i].length + (conteos[i].length === 1 ? ' árbol' : ' árboles') +
      (this.jornada && this.jornada.id === j.id ? ' · activa' : '') + '</span></span></button></li>').join('')
      : '<li class="nota">No hay jornadas abiertas.</li>';
    this.el('dlg-cambiar-jornada').showModal();
  },

  // Sin jornada abierta no hay formulario: cualquier intento vuelve al panel de inicio (D120)
  exigir() {
    if (this.jornada && this.jornada.estatus === 'abierta') return true;
    if (SRP.formulario.estado.editando) return true;
    this.mostrarInicio(true);
    SRP.util.anunciar('Inicie una jornada antes de registrar árboles.', 'alerta');
    return false;
  },

  /* Antes de guardar: si el punto queda lejos de los demás de la jornada, se pregunta (D119).
     Devuelve true si se puede guardar. */
  async confirmarDistancia(lat, lng) {
    const j = this.jornada; if (!j) return true;
    const regs = await this.registrosDe(j);
    if (!regs.length) return true;
    const d = Math.min(...regs.map(r => SRP.jornadas.distancia({ lat, lng }, r)));
    if (d <= SRP.CONFIG.JORNADA.SEPARAR_M) return true;
    const km = d >= 1000 ? (d / 1000).toFixed(1) + ' km' : Math.round(d) + ' m';
    return SRP.app.confirmar('Este árbol queda a ' + km + ' de los demás de la jornada «' + j.nombre + '». ¿Es de esta jornada? ' +
      'Si es de otro sitio, cancele, toque «Cambiar» arriba e inicie otra jornada.', 'Sí, es de esta jornada', 'palomita');
  }
};
