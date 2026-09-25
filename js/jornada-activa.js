/* LA JORNADA ACTIVA: SE DECLARA ANTES DE REGISTRAR (D119).

   La gente trabaja por jornada de plantación. Antes de registrar el primer árbol, el cabo (o el
   coordinador que registra) declara la jornada una sola vez: nombre, fecha y comentarios. Sin
   una jornada abierta, «Nuevo registro» enseña la pantalla «Iniciar jornada» en lugar del
   formulario; con una, el formulario lleva arriba la franja de la jornada (nombre, fecha, cuántos
   árboles) con «Cambiar de jornada» y «Cerrar jornada». Cada árbol nace con `jornada_id` y hereda la fecha
   de plantación de su jornada: la fecha deja de pedirse por árbol.

   SALVAGUARDA. Un árbol a más de CONFIG.JORNADA.SEPARAR_M de los demás de la jornada abierta se
   pregunta antes de guardar: «¿Es de esta jornada?». Así un olvido de cerrar la jornada anterior
   no mezcla dos sitios sin que nadie lo note (lo que en D117 hacía el reparto automático, aquí es
   un aviso).

   VARIAS ABIERTAS. Se puede tener más de una jornada abierta (un cabo vuelve a la mañana al
   parque de la tarde); «Cambiar de jornada» elige entre las abiertas o inicia otra. Al entrar con una
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
      if (j) { this.jornada = j; this.el('dlg-cambiar-jornada').close(); await this.preparar(); SRP.util.anunciar('Jornada activa: ' + j.nombre + '.', 'aviso'); }
    });
    this.el('btn-iniciar-cancelar').addEventListener('click', () => { this.mostrarInicio(false); this.preparar(); });
    this.el('ini-fecha').max = SRP.util.fechaHoy();
    this.el('btn-ini-hoy').addEventListener('click', () => {
      this.el('ini-fecha').value = SRP.util.fechaHoy();
      SRP.util.quitarErrorCampo(this.el('ini-fecha'));
      this.el('ini-fecha').dispatchEvent(new Event('change', { bubbles: true }));
    });
    this.el('btn-ini-detectar').addEventListener('click', () => this.detectarUbicacion());
    this.el('btn-ini-coord-aplicar').addEventListener('click', () => this.aplicarCoordenadas());
    this.pintarDetectar();
    this.pintarBotonIniciar();
    // Con una fecha que no es hoy, el botón lo dice: «Iniciar jornada del 22-SEP» (D138)
    this.el('ini-fecha').addEventListener('change', () => this.pintarBotonIniciar());
    this.el('ini-fecha').addEventListener('input', () => this.pintarBotonIniciar());
    this.el('btn-iniciar-cancelar').innerHTML = SRP.ICONOS.svg('cerrar', 'medio') + '<span>Cancelar</span>';
    this.el('btn-jornada-cerrar').innerHTML = SRP.ICONOS.svg('candado', 'medio') + '<span>Cerrar jornada</span>';
    // «Cambiar», con su icono de intercambio: «Cambiar de jornada» se partía en dos renglones (D141)
    this.el('btn-jornada-cambiar').innerHTML = SRP.ICONOS.svg('intercambio', 'medio') + '<span>Cambiar</span>';
    this.el('btn-jornada-cambiar').setAttribute('aria-label', 'Cambiar de jornada');
  },

  pintarBotonIniciar() {
    const f = this.el('ini-fecha').value;
    const otroDia = f && f !== SRP.util.fechaHoy();
    const corta = otroDia ? f.slice(8, 10) + '-' + SRP.util.MESES_CORTOS[Number(f.slice(5, 7)) - 1] : '';
    this.el('btn-iniciar-jornada').innerHTML = SRP.ICONOS.svg('palomita', 'medio') + '<span>' + (otroDia ? 'Iniciar jornada del ' + corta : 'Iniciar jornada') + '</span>';
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
    this.confirmadaOtroDia = null;
    if (this.jornada.fecha !== SRP.util.fechaHoy()) {
      // Con acción a la mano (D133): cerrar la de ayer desde el aviso; iniciar la de hoy queda en «Cambiar de jornada»
      const j = this.jornada;
      SRP.util.anunciar('Tiene abierta la jornada «' + j.nombre + '» del ' + SRP.util.formatearFecha(j.fecha) + '. Ciérrela o inicie la de hoy antes de registrar.', 'alerta',
        { deshacer: () => this.cerrarJornada(), textoAccion: 'Cerrar «' + j.nombre + '»' });
    }
  },

  /* Registrar en una jornada que no es de hoy se confirma una vez por sesión (D133): el árbol
     tomará la fecha de esa jornada. Devuelve true si se puede seguir. */
  async confirmarOtroDia() {
    const j = this.jornada;
    if (!j || j.fecha === SRP.util.fechaHoy() || this.confirmadaOtroDia === j.id) return true;
    const f = SRP.util.formatearFecha(j.fecha);
    const ok = await SRP.app.confirmar({ titulo: 'Jornada de otro día', pregunta: '¿Guardar el árbol en «' + j.nombre + '», del ' + f + '?',
      puntos: ['La jornada activa no es de hoy: el árbol quedará con fecha ' + f + '.',
        'Si el árbol es de hoy, cancele y toque «Cambiar» para iniciar la de hoy.'],
      nota: 'Se pregunta una vez por sesión.', boton: 'Sí, es de esa jornada', icono: 'palomita' });
    if (ok) this.confirmadaOtroDia = j.id;
    return ok;
  },

  /* ---------- Pantalla ---------- */

  mostrarInicio(ver) {
    this.el('panel-iniciar-jornada').hidden = !ver;
    this.el('registrar-columnas').hidden = ver;
    this.el('titulo-arbol').hidden = ver;
    this.el('franja-jornada').hidden = ver;
    this.el('btn-iniciar-cancelar').hidden = !this.jornada;   // sin jornada no hay a dónde volver
    if (ver) {
      this.el('ini-nombre').value = ''; this.el('ini-ubicacion').value = ''; this.el('ini-comentarios').value = ''; this.el('ini-meta').value = '';
      this.punto = null; this.pintarDetectar();
      this.el('ini-coord-lat').value = ''; this.el('ini-coord-lng').value = ''; this.el('ini-detalles-coord').open = false;
      this.llenarProgramas();
      // La fecha se elige a propósito (D29): vacía, con «Hoy» a un toque
      this.el('ini-fecha').value = '';
      this.el('ini-fecha').dispatchEvent(new Event('change', { bubbles: true }));
      this.el('ini-errores').hidden = true;
      SRP.util.erroresEnCampos([], ['ini-nombre', 'ini-programa', 'ini-meta', 'ini-fecha']);
      SRP.util.refrescarContadores(this.el('panel-iniciar-jornada'));
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
      this.el('titulo-arbol').hidden = false; this.el('titulo-arbol').textContent = 'Editar árbol';
      this.pintarFranja(j, await (j ? this.registrosDe(j) : []), true);
      SRP.formulario.el('campo-fecha').value = editando.fecha_plantacion;
      await SRP.formulario.pintarEspeciesRecientes();
      return;
    }
    if (!this.jornada || this.jornada.estatus !== 'abierta') this.jornada = (await this.abiertas())[0] || null;
    if (!this.jornada) { this.mostrarInicio(true); return; }
    this.el('panel-iniciar-jornada').hidden = true;
    this.el('registrar-columnas').hidden = false;
    this.el('titulo-arbol').hidden = false; this.el('titulo-arbol').textContent = 'Nuevo árbol';
    this.pintarFranja(this.jornada, await this.registrosDe(this.jornada), false);
    // La fecha de plantación y el programa son los de la jornada (D119, D151); las especies recientes, a un toque (D130)
    SRP.formulario.el('campo-fecha').value = this.jornada.fecha;
    await SRP.formulario.pintarEspeciesRecientes();
  },

  pintarFranja(j, registros, editando) {
    const f = this.el('franja-jornada');
    f.hidden = !j;
    if (!j) return;
    const esc = SRP.util.escapar;
    const n = registros.length;
    const atrasada = !editando && j.fecha !== SRP.util.fechaHoy();
    f.dataset.tono = atrasada ? 'alerta' : '';
    this.el('franja-jornada-rotulo').textContent = editando ? 'Jornada del registro' : 'Jornada activa';
    if (editando) this.el('franja-guardado').hidden = true;
    const meta = SRP.jornadas.metaDe(j);
    this.el('franja-jornada-texto').innerHTML =
      '<span class="franja-jornada-titulo"><strong>' + esc(j.nombre) + '</strong></span>' +
      '<span class="franja-jornada-datos">' + esc(SRP.util.formatearFecha(j.fecha)) + (j.ubicacion ? ' · ' + esc(j.ubicacion) : '') + (this.lugarDe(j) ? ' · ' + esc(this.lugarDe(j)) : '') + (j.programa_id ? ' · ' + esc(SRP.ref.nombreCatalogo(j.programa_id)) : '') + ' · <b>' + n + (meta !== null ? ' de ' + meta : '') + (n === 1 && meta === null ? ' árbol' : ' árboles') + '</b>' +
      (j.estatus === 'cerrada' ? ' · cerrada' : '') + (atrasada ? ' · <b>no es de hoy</b>' : '') + '</span>';
    this.el('franja-jornada-acciones').hidden = !!editando;
    // En qué paso va (D138). Al editar un registro se enseña la jornada del registro, no el flujo.
    const pasos = this.el('franja-pasos'), sig = this.el('franja-siguiente');
    pasos.hidden = !!editando;
    sig.hidden = true;
    if (editando) return;
    const p = SRP.jornadas.pasos({ registros }, j);
    pasos.innerHTML = SRP.jornadas.htmlPasos(p);
    // Con la meta alcanzada, lo que sigue es cerrar: el botón ya está al lado, aquí sólo se dice
    if (p.actual === 'cerrar') {
      sig.hidden = false;
      sig.textContent = (p.meta !== null ? 'Meta cumplida: ' + n + ' de ' + p.meta + '. ' : '') + 'Siguiente: cerrar la jornada cuando termine.';
    }
  },

  /* El programa se elige al iniciar la jornada (D130): mismas opciones que el formulario, sin preselección */
  llenarProgramas() {
    const sel = this.el('ini-programa');
    const opciones = SRP.ref.deTipo('programa', true).sort((a, b) => (b.clave === 'REFOR_URBANA') - (a.clave === 'REFOR_URBANA'));
    sel.innerHTML = '<option value="">Seleccione un programa</option>' + opciones.map(o => '<option value="' + SRP.util.escapar(o.id) + '">' + SRP.util.escapar(o.nombre) + '</option>').join('');
    sel.value = '';
    SRP.util.quitarErrorCampo(sel);
  },

  /* ---------- Ubicación de la jornada (D122) ---------- */

  punto: null,   // { lat, lng, precision, t } de la última detección en el panel; null si no se detectó

  /* El botón y los dos datos de lectura reflejan lo detectado. Sin punto es la acción principal
     (guinda); con punto es corregir (dorado, «Detectar de nuevo»), como el botón del árbol (D48). */
  pintarDetectar(buscando) {
    const b = this.el('btn-ini-detectar');
    b.disabled = !!buscando;
    b.setAttribute('aria-busy', String(!!buscando));
    const p = this.punto;
    b.className = 'btn btn-ancho ' + (p ? 'btn-editar' : 'btn-primario');
    b.innerHTML = SRP.ICONOS.svg('ubicacion', 'medio') + '<span>' +
      (buscando ? 'Buscando señal…' : p ? 'Detectar de nuevo la ubicación' : 'Detectar ubicación de la jornada') + '</span>';
    this.el('ini-alcaldia').textContent = p ? SRP.ref.alcaldia(p.t.alcaldia) : '—';
    this.el('ini-colonia').textContent = p ? SRP.ref.colonia(p.t.colonia) : '—';
    if (!p && !buscando) this.el('ini-detectado').hidden = true;
  },

  avisoDetectar(texto, tono) {
    const n = this.el('ini-detectado');
    n.hidden = false; n.textContent = texto; n.dataset.tono = tono || '';
  },

  // Sólo la jornada: alcaldía y colonia de donde está quien la inicia. No toca el mapa del árbol.
  detectarUbicacion() {
    if (!navigator.geolocation) { this.el('ini-detalles-coord').open = true; this.avisoDetectar('Este dispositivo no ofrece ubicación. Capture las coordenadas a mano o escriba la dirección abajo.', 'alerta'); return; }
    this.pintarDetectar(true);
    this.avisoDetectar('Obteniendo su ubicación…');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude, lng = pos.coords.longitude, precision = pos.coords.accuracy;
        const t = SRP.derivacion.derivar(lat, lng);
        this.punto = { lat, lng, precision, t, origen: 'gps' };
        this.pintarDetectar(false);
        const m = precision != null ? Math.round(precision) : null;
        if (!t.alcaldia) this.avisoDetectar('Ubicación obtenida' + (m != null ? ' (±' + m + ' m)' : '') + ', pero el punto no cae en ninguna alcaldía de la capa. Escriba la dirección abajo.', 'alerta');
        else this.avisoDetectar('Ubicación detectada' + (m != null ? ' (±' + m + ' m)' : '') + '. Complete abajo la dirección o referencia si hace falta.', m != null && m > SRP.CONFIG.MAPA.PRECISION_ACEPTABLE_M ? 'alerta' : 'bien');
      },
      (err) => {
        this.pintarDetectar(false);
        const motivo = err.code === 1 ? 'no se concedió el permiso de ubicación' : err.code === 3 ? 'la señal tardó demasiado' : 'no hay señal de ubicación';
        // Sin señal, la salida queda a la vista: las coordenadas a mano (D143)
        this.el('ini-detalles-coord').open = true;
        this.avisoDetectar('No se obtuvo la ubicación: ' + motivo + '. Capture las coordenadas a mano o escriba la dirección abajo.', 'alerta');
      },
      { enableHighAccuracy: true, timeout: SRP.CONFIG.MAPA.GPS_ESPERA_MS, maximumAge: 0 }
    );
  },

  /* COORDENADAS A MANO (D143). Cuando el registro de la jornada no se hace en el sitio o no hay
     señal, quien la registra escribe latitud y longitud, como en «Registrar árbol». Se validan y se
     derivan alcaldía y colonia igual que con el GPS; el punto queda con origen «manual» y sin
     precisión, porque no la hay. */
  aplicarCoordenadas() {
    const lat = parseFloat(this.el('ini-coord-lat').value.replace(',', '.'));
    const lng = parseFloat(this.el('ini-coord-lng').value.replace(',', '.'));
    if (Number.isNaN(lat) || Number.isNaN(lng)) { this.avisoDetectar('Escriba latitud y longitud en grados decimales, por ejemplo 19.4326 y -99.1332.', 'alerta'); return; }
    if (!SRP.derivacion.dentroDelAmbito(lat, lng)) { this.avisoDetectar('El punto está fuera de la Ciudad de México. Revise las coordenadas.', 'alerta'); return; }
    const t = SRP.derivacion.derivar(lat, lng);
    this.punto = { lat: Number(lat.toFixed(6)), lng: Number(lng.toFixed(6)), precision: null, t, origen: 'manual' };
    this.pintarDetectar(false);
    this.avisoDetectar(t.alcaldia ? 'Punto capturado a mano. Complete abajo la dirección si hace falta.' : 'Coordenadas capturadas, pero el punto no cae en ninguna alcaldía de la capa. Escriba la dirección abajo.', t.alcaldia ? 'bien' : 'alerta');
  },

  // «Colonia, Alcaldía» de una jornada, para la franja, Jornadas y el reporte; '' si no se detectó
  lugarDe(j) {
    if (!j || (!j.alcaldia && !j.colonia)) return '';
    return [j.colonia, j.alcaldia ? 'Alcaldía ' + j.alcaldia : ''].filter(Boolean).join(', ');
  },

  /* ---------- Acciones ---------- */

  async iniciarJornada() {
    if (!SRP.permisos.exigir('jornada.crear')) return;
    const nombre = this.el('ini-nombre').value.trim();
    const ubicacion = this.el('ini-ubicacion').value.trim();
    const fecha = this.el('ini-fecha').value;
    const comentarios = this.el('ini-comentarios').value.trim();
    const programa_id = this.el('ini-programa').value;
    const metaTexto = this.el('ini-meta').value.trim();
    const meta_arboles = metaTexto === '' ? null : Number(metaTexto);
    const errores = [];
    if (!nombre) errores.push(['ini-nombre', 'Escriba el nombre de la jornada: el parque, la calle o el sitio.']);
    if (!programa_id) errores.push(['ini-programa', 'Elija el programa de la jornada.']);
    if (meta_arboles === null || !Number.isInteger(meta_arboles) || meta_arboles < 1 || meta_arboles > 9999) errores.push(['ini-meta', 'Escriba cuántos árboles se van a plantar: un número entero mayor que cero.']);
    if (!fecha) errores.push(['ini-fecha', 'Indique la fecha de la jornada.']);
    else if (fecha > SRP.util.fechaHoy()) errores.push(['ini-fecha', 'La fecha no puede ser posterior a hoy.']);
    const caja = this.el('ini-errores');
    SRP.util.erroresEnCampos(errores, ['ini-nombre', 'ini-programa', 'ini-meta', 'ini-fecha']);   // cada campo dice su error (D140)
    if (errores.length) {
      caja.hidden = false;
      caja.innerHTML = '<ul>' + errores.map(([id, t]) => '<li><a href="#' + id + '">' + SRP.util.escapar(t) + '</a></li>').join('') + '</ul>';
      this.el(errores[0][0]).focus();
      return;
    }
    caja.hidden = true;
    const u = SRP.sesion.usuario;
    const ahora = SRP.util.ahoraISO();
    const p = this.punto, t = p ? p.t : {};
    const j = Object.assign({
      id: SRP.util.generarId(), es_ficticio: SRP.CONFIG.ES_FICTICIO,
      nombre, ubicacion, fecha, comentarios, programa_id, cabo_id: u.id, estatus: 'abierta',
      // Ubicación detectada (D122): nula si no se tocó el botón
      lat: p ? p.lat : null, lng: p ? p.lng : null, punto_origen: p ? (p.origen || 'gps') : null,   // cómo se obtuvo (D143)
      gps_precision_m: p && p.precision != null ? Math.round(p.precision) : null,
      alcaldia_cve: t.alcaldia_cve || null, alcaldia: t.alcaldia || null, colonia_cve: t.colonia_cve || null, colonia: t.colonia || null,
      fecha_inicio: ahora, fecha_cierre: null,
      creado_por_id: u.id, fecha_creacion: ahora, editado_por_id: u.id, fecha_ultima_edicion: ahora,
      meta_arboles, puntos_revisados: [], reporte_en: null, encargado_id: u.id
    }, Object.fromEntries(SRP.reportes.CAMPOS.map(k => [k, ''])));
    await SRP.almacen.guardarConBitacora('jornadas', j, SRP.bitacora.entrada('CREADO', 'jornada', j.id, 'Jornada «' + nombre + '» del ' + SRP.util.formatearFecha(fecha)));
    SRP.almacen.cuidarAlmacenamiento();   // ya hay algo que perder: se pide al navegador que no lo borre (D149)
    this.jornada = j;
    this.mostrarInicio(false);
    await this.preparar();
    SRP.util.anunciar('Jornada «' + nombre + '» iniciada. Ya puede registrar árboles.');
    SRP.formulario.el('btn-ubicacion').focus({ preventScroll: true });
  },

  /* Lo que queda pendiente al cerrar (D133): puntos por revisar y distancia a la meta. Es aviso, no
     impedimento: la jornada se puede cerrar así y reabrir después. Devuelve la confirmación
     estructurada (D139): lo pendiente en viñetas, para que no se pierda en un párrafo. */
  async confirmacionCierre(j) {
    const regs = await this.registrosDe(j);
    const vista = SRP.jornadas.jornadasAlcance ? (await SRP.jornadas.jornadasAlcance()).find(x => x.id === j.id) : null;
    const pend = vista ? SRP.jornadas.pendientes(vista, SRP.jornadas.avisos(vista), j).length : 0;
    const meta = SRP.jornadas.metaDe(j);
    const n = regs.length;
    const avisos = [];
    if (pend) avisos.push(pend === 1 ? '1 punto por revisar' : pend + ' puntos por revisar');
    if (meta !== null && n < meta) avisos.push((meta - n) + (meta - n === 1 ? ' árbol' : ' árboles') + ' por debajo de la meta (' + n + ' de ' + meta + ')');
    if (meta !== null && n > meta) avisos.push((n - meta) + (n - meta === 1 ? ' árbol' : ' árboles') + ' por encima de la meta (' + n + ' de ' + meta + ')');
    return { titulo: 'Cerrar jornada', pregunta: '¿Cerrar la jornada «' + j.nombre + '» con ' + n + (n === 1 ? ' árbol' : ' árboles') + '?',
      puntosTitulo: 'Queda pendiente:', puntos: avisos.map(a => a.charAt(0).toUpperCase() + a.slice(1) + '.'),
      nota: (avisos.length ? 'Se puede cerrar de todos modos y reabrir después.' : 'Se puede reabrir después.') + this.recordatorioRespaldo(), boton: 'Cerrar jornada', icono: 'candado' };
  },

  // Al cerrar una jornada se recuerda el respaldo si el último no es de hoy (D149): en la Etapa 1
  // lo capturado sólo vive en el teléfono
  recordatorioRespaldo() {
    const u = SRP.conexion.textoUltimoRespaldo();
    if (!u.atrasado) return '';
    return ' Último respaldo de este teléfono: ' + u.texto.charAt(0).toLowerCase() + u.texto.slice(1) + ' Guárdelo al terminar, desde el menú de la cuenta.';
  },

  async cerrarJornada() {
    const j = this.jornada; if (!j) return;
    if (!SRP.permisos.exigir('jornada.editar', j)) return;
    const ok = await SRP.app.confirmar(await this.confirmacionCierre(j));
    if (!ok) return;
    if (!await this.cambiarEstatus(j, 'cerrada')) return;
    this.jornada = null;
    SRP.jornadas.actual = j.id;
    SRP.jornadas.volverAlDetalle = true;
    SRP.jornadas.trasCierre = j;   // la ficha abre diciendo qué sigue (D138)
    SRP.app.mostrarVista('jornadas');
  },

  async reabrir(j) {
    if (!await this.cambiarEstatus(j, 'abierta')) return false;
    // Sólo pasa a ser la activa de quien la reabre si es suya (D133): un coordinador la reabre para su cabo
    if (j.cabo_id === SRP.sesion.usuario.id) {
      this.jornada = await SRP.almacen.uno('jornadas', j.id);
      SRP.util.anunciar('Jornada «' + j.nombre + '» reabierta. Es la activa en Nuevo registro.');
    } else SRP.util.anunciar('Jornada «' + j.nombre + '» reabierta para ' + SRP.ref.nombreUsuario(j.cabo_id) + '.', 'aviso');
    return true;
  },

  // Devuelve si se hizo: sin permiso se detiene con aviso (D151)
  async cambiarEstatus(j, estatus) {
    if (!SRP.permisos.exigir('jornada.editar', j)) return false;
    const u = SRP.sesion.usuario;
    const ahora = SRP.util.ahoraISO();
    const nuevo = Object.assign({}, j, { estatus, fecha_cierre: estatus === 'cerrada' ? ahora : null, editado_por_id: u.id, fecha_ultima_edicion: ahora });
    await SRP.almacen.guardarConBitacora('jornadas', nuevo, SRP.bitacora.entrada('EDITADO', 'jornada', j.id, estatus === 'cerrada' ? 'Jornada cerrada' : 'Jornada reabierta'));
    if (SRP.envio.simulado()) SRP.envio.enviar({ silencioso: true });
    return true;
  },

  async abrirCambiar() {
    const ab = await this.abiertas();
    const esc = SRP.util.escapar;
    const conteos = await Promise.all(ab.map(j => this.registrosDe(j)));
    this.el('lista-jornadas-abiertas').innerHTML = ab.length ? ab.map((j, i) =>
      '<li><button type="button" class="jornada-boton" data-id="' + SRP.util.escapar(j.id) + '" aria-pressed="' + String(this.jornada && this.jornada.id === j.id) + '">' +
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

  /* La pregunta por distancia de D119 pasó a ser un aviso de la ficha de revisión (D130): ver
     SRP.formulario.avisos(). */
};

// Acciones que escriben en el teléfono: si fallan, se dice qué no se pudo hacer (D149)
SRP.util.proteger(SRP.activa, { iniciarJornada: 'iniciar la jornada', cambiarEstatus: 'cambiar el estado de la jornada' });
