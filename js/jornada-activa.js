/* LA JORNADA ACTIVA: SE DECLARA ANTES DE REGISTRAR (D119).

   La gente trabaja por jornada de plantación. Antes de registrar el primer árbol, el cabo (o el
   coordinador que registra) declara la jornada una sola vez: nombre, fecha y comentarios. Sin
   una jornada abierta, «Nuevo registro» enseña la pantalla «Iniciar jornada» en lugar del
   formulario; con una, el formulario lleva arriba la franja de la jornada (nombre, fecha, cuántos
   árboles) con «Cambiar de jornada» y «Cerrar jornada». Cada árbol nace con `jornada_id`.

   VARIOS DÍAS. Cada árbol lleva la fecha en que se plantó. Una jornada puede seguir abierta varios
   días: el día que se inicia, sus árboles llevan la fecha de la jornada (también si se inicia con
   una fecha pasada, para capturar lo de ese día); los días siguientes, la de hoy. Cuando la jornada
   empezó otro día, el formulario enseña «Fecha de plantación» para elegirla, nunca antes del inicio
   de la jornada ni después de hoy.

   RELEVO. Quien registra en una jornada es su titular o, si la coordinación la pasó a otro cabo, ese
   cabo (`relevo_id`). El titular no cambia y cada árbol queda a nombre de quien lo capturó.

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
    SRP.solicitud.montar(this.el('ini-caja-solicitud'), 'ini');
    this.el('form-iniciar-jornada').addEventListener('submit', (e) => { e.preventDefault(); this.iniciarJornada(); });
    this.el('btn-jornada-cambiar').addEventListener('click', () => this.abrirCambiar());
    this.el('btn-jornada-cerrar').addEventListener('click', () => this.cerrarJornada());
    // La jornada se corrige sin salir de «Nuevo registro»: el mismo formulario de su ficha
    this.el('btn-franja-editar').innerHTML = SRP.ICONOS.svg('lapiz', 'medio') + '<span>Editar jornada</span>';
    this.el('btn-franja-editar').addEventListener('click', () => { if (this.jornada) SRP.jornadas.abrirEditar(this.jornada, true); });
    // En teléfono el detalle de la jornada (fecha, lugar, programa, solicitante, prioridad y pasos) se despliega al pedirlo
    this.el('btn-franja-detalle').addEventListener('click', () => { this.detalleAbierto = !this.detalleAbierto; this.pintarDetalle(); });
    this.pintarDetalle();
    this.el('btn-cambiar-nueva').addEventListener('click', () => { this.el('dlg-cambiar-jornada').close(); this.mostrarInicio(true); });
    this.el('btn-cambiar-cerrar').addEventListener('click', () => this.el('dlg-cambiar-jornada').close());
    this.el('lista-jornadas-abiertas').addEventListener('click', async (e) => {
      const b = e.target.closest('button[data-id]'); if (!b) return;
      const j = await SRP.almacen.uno('jornadas', b.dataset.id);
      if (j) { this.jornada = j; this.el('dlg-cambiar-jornada').close(); await this.preparar(); SRP.util.anunciarSilencioso('Jornada activa: ' + j.nombre + '.'); }   // la franja ya lo dice a la vista
    });
    this.el('btn-iniciar-cancelar').addEventListener('click', () => { this.mostrarInicio(false); this.preparar(); });
    this.el('ini-fecha').max = SRP.util.fechaHoy();
    this.el('btn-ini-hoy').addEventListener('click', () => {
      this.el('ini-fecha').value = SRP.util.fechaHoy();
      SRP.util.quitarErrorCampo(this.el('ini-fecha'));
      this.el('ini-fecha').dispatchEvent(new Event('change', { bubbles: true }));
    });
    this.el('btn-ini-detectar').addEventListener('click', () => this.detectarUbicacion());
    // Un chip de programa elige en la lista, y la lista avisa su cambio como si se hubiera elegido en ella
    this.el('ini-programa-chips').addEventListener('click', (e) => {
      const b = e.target.closest('.chip'); if (!b) return;
      const sel = this.el('ini-programa');
      sel.value = b.dataset.id;
      sel.dispatchEvent(new Event('change', { bubbles: true }));
    });
    this.el('ini-programa').addEventListener('change', () => {
      this.marcarChipPrograma();
      SRP.util.quitarErrorCampo(this.el('ini-programa'));
    });
    this.el('btn-ini-coord-aplicar').addEventListener('click', () => this.aplicarCoordenadas());
    SRP.util.coordenadas.enlazar(this.el('ini-coord-lat'), this.el('ini-coord-lng'));   // D170
    this.pintarDetectar();
    this.pintarBotonIniciar();
    // Con una fecha que no es hoy, el botón lo dice: «Iniciar jornada del 22-SEP» (D138)
    this.el('ini-fecha').addEventListener('change', () => this.pintarBotonIniciar());
    this.el('ini-fecha').addEventListener('input', () => this.pintarBotonIniciar());
    this.el('btn-iniciar-cancelar').innerHTML = SRP.ICONOS.svg('cerrar', 'medio') + '<span>Cancelar</span>';
    this.el('btn-jornada-cerrar').innerHTML = SRP.ICONOS.svg('candado', 'medio') + '<span>Cerrar jornada</span>';
    // «Cambiar», con su icono de intercambio: «Cambiar de jornada» se partía en dos renglones (D141)
    this.el('btn-jornada-cambiar').innerHTML = SRP.ICONOS.svg('intercambio', 'medio') + '<span>Cambiar jornada</span>';
  },

  pintarBotonIniciar() {
    const f = this.el('ini-fecha').value;
    const otroDia = f && f !== SRP.util.fechaHoy();
    const corta = otroDia ? f.slice(8, 10) + '-' + SRP.util.MESES_CORTOS[Number(f.slice(5, 7)) - 1] : '';
    this.el('btn-iniciar-jornada').innerHTML = SRP.ICONOS.svg('palomita', 'medio') + '<span>' + (otroDia ? 'Iniciar jornada del ' + corta : 'Iniciar jornada') + '</span>';
  },

  /* ---------- Datos ---------- */

  // Quién registra en la jornada: el cabo del relevo, si lo hay; si no, el titular
  capturista(j) { return j ? (j.relevo_id || j.cabo_id) : null; },

  // Las jornadas abiertas en que registra quien entró (las suyas y las que recibió en relevo), la más reciente primero
  async abiertas() {
    const u = SRP.sesion.usuario;
    if (!u || !SRP.almacen.db) return [];
    return (await SRP.almacen.todos('jornadas'))
      .filter(j => j.estatus === 'abierta' && this.capturista(j) === u.id)
      .sort((a, b) => b.fecha_inicio.localeCompare(a.fecha_inicio));
  },

  /* La fecha con que arranca cada árbol nuevo: la que se eligió antes en esta jornada; si no, el día
     en que se inicia la jornada, su fecha, y los días siguientes, hoy. */
  fechaElegida: null,   // { id de la jornada, fecha }
  fechaInicial(j) {
    if (this.fechaElegida && this.fechaElegida.id === j.id) return SRP.util.fechaEnJornada(this.fechaElegida.fecha, j);
    const inicio = j.fecha_inicio ? SRP.indicadores.dia(j.fecha_inicio) : j.fecha;
    return inicio === SRP.util.fechaHoy() ? j.fecha : SRP.util.fechaHoy();
  },

  /* «Fecha de plantación» se enseña cuando hay de dónde elegir: la jornada empezó antes de hoy. Va de
     la fecha de la jornada a hoy. */
  pintarCampoFecha(j) {
    const campo = SRP.formulario.el('campo-fecha'), hoy = SRP.util.fechaHoy();
    campo.min = j && j.fecha ? j.fecha : '';
    campo.max = hoy;
    const ver = !!(j && j.fecha && j.fecha < hoy);
    this.el('caja-fecha-arbol').hidden = !ver;
    campo.tabIndex = ver ? 0 : -1;
    if (ver) this.el('fecha-arbol-ayuda').textContent = 'La jornada empezó el ' + SRP.util.formatearFecha(j.fecha) + '. Elija el día en que se plantó este árbol; no puede ser antes de ese día ni después de hoy.';
  },

  async registrosDe(j) {
    return (await SRP.almacen.porIndice('plantaciones', 'jornada_id', j.id)).filter(r => r.estatus === 'activo');   // por su índice (D153)
  },

  // Al entrar: la jornada abierta más reciente queda activa; si es de otro día, se avisa
  async alEntrar() {
    this.jornada = null;
    const ab = await this.abiertas();
    if (!ab.length) return;
    this.jornada = ab[0];
    this.confirmadaOtroDia = null;
    if (this.jornada.fecha !== SRP.util.fechaHoy()) {
      /* Con acción a la mano: cerrarla desde el aviso. Seguir en ella también vale (una jornada
         puede durar varios días); iniciar la de hoy queda en «Cambiar de jornada». */
      const j = this.jornada;
      const relevo = j.relevo_id === SRP.sesion.usuario.id && j.cabo_id !== j.relevo_id ? ', que recibió en relevo de ' + SRP.ref.nombreUsuario(j.cabo_id) + ',' : '';
      SRP.util.anunciar('Sigue abierta la jornada «' + j.nombre + '»' + relevo + ' iniciada el ' + SRP.util.formatearFecha(j.fecha) + '. Puede seguir registrando en ella: cada árbol lleva la fecha en que se planta. Si ya terminó, ciérrela.', 'aviso',
        { deshacer: () => this.cerrarJornada(), textoAccion: 'Cerrar «' + j.nombre + '»' });
    }
  },

  /* AVISO DE RELEVO. Al entrar, quien recibió una jornada en relevo o dejó de registrar en una lo lee
     una vez, en una ventana con «Entendido»: qué jornada, quién la tiene ahora, quién hizo el relevo y
     cuándo. Lo ya leído se recuerda por cuenta en este dispositivo. */
  async avisarRelevos() {
    const u = SRP.sesion.usuario;
    if (!u || !SRP.almacen.db) return;
    const clave = 'srp_relevos_vistos_' + u.id;
    let visto = ''; try { visto = localStorage.getItem(clave) || ''; } catch (e) { /* sin almacenamiento, se avisa cada vez */ }
    const lineas = []; let ultimo = visto;
    const N = id => SRP.ref.nombreUsuario(id);
    (await SRP.almacen.todos('jornadas')).forEach(j => (j.relevos || []).forEach((x, i) => {
      if (String(x.fecha) <= visto || x.por_id === u.id) return;
      const antes = i ? j.relevos[i - 1].cabo_id : j.cabo_id;
      const cola = ' Lo hizo ' + N(x.por_id) + ' el ' + SRP.util.formatearFecha(SRP.indicadores.dia(x.fecha)) + ' a las ' + SRP.envio.hora(x.fecha) + '.';
      if (x.cabo_id === u.id) lineas.push(x.cabo_id === j.cabo_id ? 'La jornada «' + j.nombre + '» volvió a usted: ya puede registrar en ella otra vez.' + cola
        : 'Recibió la jornada «' + j.nombre + '» en relevo de ' + N(j.cabo_id) + ': ya puede registrar en ella.' + cola);
      else if (antes === u.id) lineas.push('La jornada «' + j.nombre + '» pasó a ' + N(x.cabo_id) + ': usted ya no registra en ella; la sigue viendo en Jornadas.' + cola);
      else return;
      if (String(x.fecha) > ultimo) ultimo = String(x.fecha);
    }));
    if (!lineas.length) return;
    const ok = await SRP.app.confirmar({ titulo: 'Relevo de cabo', pregunta: lineas.length === 1 ? lineas[0] : 'Hubo cambios en las jornadas en que registra:',
      puntos: lineas.length > 1 ? lineas : [], boton: 'Entendido', icono: 'palomita', soloAceptar: true });
    if (ok) { try { localStorage.setItem(clave, ultimo); } catch (e) { /* se volverá a avisar */ } }
  },

  /* Registrar en una jornada que no es de hoy se confirma una vez por sesión: que no sea un olvido
     de cerrar la anterior. Dice con qué fecha queda el árbol. La sustitución no pregunta: su fecha
     ya se eligió. Devuelve true si se puede seguir. */
  async confirmarOtroDia() {
    const j = this.jornada;
    if (!j || j.fecha === SRP.util.fechaHoy() || this.confirmadaOtroDia === j.id || SRP.formulario.estado.sustitucion) return true;
    const f = SRP.util.formatearFecha(j.fecha), fa = SRP.util.formatearFecha(SRP.formulario.el('campo-fecha').value);
    const ok = await SRP.app.confirmar({ titulo: 'Jornada de otro día', pregunta: '¿Guardar el árbol en «' + j.nombre + '», iniciada el ' + f + '?',
      puntos: ['La jornada activa no es de hoy: el árbol queda con fecha de plantación ' + fa + '. Si se plantó otro día, cámbiela en «Fecha de plantación».',
        'Si el árbol es de otra jornada, cancele y toque «Cambiar» para iniciar la de hoy.'],
      nota: 'Se pregunta una vez por sesión.', boton: 'Sí, es de esa jornada', icono: 'palomita' });
    if (ok) this.confirmadaOtroDia = j.id;
    return ok;
  },

  /* MÁS ÁRBOLES QUE LOS PREVISTOS. Con los previstos ya registrados, el siguiente árbol se confirma:
     puede ser un toque de más o un árbol de otra jornada. Se pregunta una vez por jornada —plantar de
     más es normal y preguntar en cada árbol sumaría un toque por árbol—; se recuerda en el dispositivo.
     La sustitución no pregunta: el árbol que reemplaza deja de contar. Tocar «Seguir registrando» en
     «Jornada completa» ya es la respuesta: tampoco se pregunta. Devuelve true si se puede seguir. */
  CLAVE_EXCESO: 'srp_jornadas_exceso',
  excesoConfirmado() { try { return JSON.parse(localStorage.getItem(this.CLAVE_EXCESO) || '[]'); } catch (e) { return this._exceso || []; } },
  async confirmarExceso() {
    const j = this.jornada;
    if (!j || SRP.formulario.estado.sustitucion) return true;
    const meta = SRP.jornadas.previstosDe(j);
    if (meta === null) return true;
    const n = (await this.registrosDe(j)).length;
    if (n < meta || this.excesoConfirmado().includes(j.id)) return true;
    const ok = await SRP.app.confirmar({ titulo: meta === 1 ? 'Ya registró el árbol previsto' : 'Ya registró los ' + meta + ' árboles previstos',
      pregunta: 'Este sería el árbol ' + (n + 1) + ' de la jornada «' + j.nombre + '». ¿Lo registra de todos modos?',
      nota: 'Se pregunta una vez por jornada. Al cerrarla podrá actualizar los árboles previstos.', boton: 'Registrar el árbol', icono: 'palomita' });
    if (ok) this.aceptarExceso(j.id);
    return ok;
  },
  aceptarExceso(id) {
    if (!id || this.excesoConfirmado().includes(id)) return;
    const lista = this.excesoConfirmado().concat(id).slice(-50);
    this._exceso = lista;
    try { localStorage.setItem(this.CLAVE_EXCESO, JSON.stringify(lista)); } catch (e) { /* vale para esta sesión */ }
  },

  /* Al cerrar con más árboles que los previstos se ofrece actualizar la cantidad prevista a lo
     registrado, para que la conciliación cuadre. Si no se acepta, la jornada se cierra igual y la
     conciliación dice cuántos sobran. Devuelve la jornada, actualizada o no. */
  async ofrecerActualizarPrevistos(j) {
    const meta = SRP.jornadas.previstosDe(j);
    if (meta === null) return j;
    const n = (await this.registrosDe(j)).length;
    if (n <= meta) return j;
    const ok = await SRP.app.confirmar({ titulo: 'Árboles previstos',
      pregunta: (meta === 1 ? 'Se previó 1 árbol' : 'Se previeron ' + meta + ' árboles') + ' y se registraron ' + n + '. ¿Actualizar los árboles previstos a ' + n + '?',
      nota: 'Si no los actualiza, la conciliación dirá que ' + (n - meta === 1 ? 'sobra 1 registro.' : 'sobran ' + (n - meta) + ' registros.'),
      boton: 'Actualizar a ' + n, icono: 'palomita', cancelar: 'Dejar en ' + meta });
    if (!ok) return j;
    const u = SRP.sesion.usuario, nuevo = Object.assign({}, j, { arboles_previstos: n, editado_por_id: u.id, fecha_ultima_edicion: SRP.util.ahoraISO() });
    await SRP.almacen.guardarConBitacora('jornadas', nuevo, SRP.bitacora.entrada('EDITADO', 'jornada', j.id, 'Árboles previstos: ' + meta + ' → ' + n + ', al cerrar la jornada'));
    return nuevo;
  },

  /* ---------- Pantalla ---------- */

  mostrarInicio(ver) {
    this.el('panel-iniciar-jornada').hidden = !ver;
    this.el('registrar-columnas').hidden = ver;
    this.el('titulo-arbol').hidden = ver;
    this.el('franja-jornada').hidden = ver;
    this.el('btn-iniciar-cancelar').hidden = !this.jornada;   // sin jornada no hay a dónde volver
    if (ver) {
      // El máximo de la fecha se pone cada vez: con la aplicación abierta de un día para otro, hoy ya es otro día
      this.el('ini-fecha').max = SRP.util.fechaHoy();
      this.el('ini-nombre').value = ''; this.el('ini-ubicacion').value = ''; this.el('ini-comentarios').value = ''; this.el('ini-meta').value = '';
      this.punto = null; this.pintarDetectar();
      this.el('ini-coord-lat').value = ''; this.el('ini-coord-lng').value = ''; this.el('ini-detalles-coord').open = false;
      this.llenarProgramas();
      SRP.solicitud.poner('ini', null);
      // La fecha se elige a propósito (D29): vacía, con «Hoy» a un toque
      this.el('ini-fecha').value = '';
      this.el('ini-fecha').dispatchEvent(new Event('change', { bubbles: true }));
      this.el('ini-errores').hidden = true;
      SRP.util.erroresEnCampos([], ['ini-nombre', 'ini-programa', 'ini-meta', 'ini-fecha'].concat(SRP.solicitud.ids('ini')));
      SRP.util.refrescarContadores(this.el('panel-iniciar-jornada'));
      if (SRP.espejo) SRP.espejo.refrescarIniciar();
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
      const deLaJornada = await (j ? this.registrosDe(j) : []);
      this.pintarFranja(j, deLaJornada, true);
      // En el mapa, los demás árboles de la jornada; el que se edita lleva el marcador
      SRP.mapa.pintarPlantados(deLaJornada.filter(r => r.id !== editando.id), j ? j.id : null);
      SRP.formulario.el('campo-fecha').value = editando.fecha_plantacion;
      this.pintarCampoFecha(j);
      await SRP.formulario.pintarEspeciesRecientes();
      return;
    }
    // La sustitución registra en la jornada del árbol perdido aunque la tenga otro; lo demás, sólo en las propias
    const sust = SRP.formulario.estado.sustitucion;
    if (!this.jornada || this.jornada.estatus !== 'abierta' || (!sust && this.capturista(this.jornada) !== (SRP.sesion.usuario || {}).id)) this.jornada = (await this.abiertas())[0] || null;
    if (!this.jornada) { SRP.mapa.pintarPlantados([], null); this.mostrarInicio(true); return; }
    this.el('panel-iniciar-jornada').hidden = true;
    this.el('registrar-columnas').hidden = false;
    this.el('titulo-arbol').hidden = false; this.el('titulo-arbol').textContent = 'Nuevo árbol';
    const deLaJornada = await this.registrosDe(this.jornada);
    this.pintarFranja(this.jornada, deLaJornada, false);
    // La fecha de plantación arranca como corresponde (la de la sustitución, si es una); el programa es el de la jornada; las especies recientes, a un toque
    SRP.formulario.el('campo-fecha').value = sust && sust.fecha ? sust.fecha : this.fechaInicial(this.jornada);
    this.pintarCampoFecha(this.jornada);
    // El mapa estaba escondido tras «Iniciar jornada»: vuelve a medir su caja, o se queda sin tamaño
    SRP.mapa.refrescar();
    // Lo ya registrado en la jornada, a la vista mientras se ubica el siguiente árbol
    SRP.mapa.pintarPlantados(deLaJornada, this.jornada.id);
    await SRP.formulario.pintarEspeciesRecientes();
    // El árbol que quedó a medias antes de recargar o cerrar vuelve al formulario
    if (!sust) SRP.formulario.recuperarBorrador();
  },

  detalleAbierto: false,
  pintarDetalle() {
    const b = this.el('btn-franja-detalle');
    this.el('franja-jornada').dataset.detalle = this.detalleAbierto ? 'abierto' : 'cerrado';
    b.setAttribute('aria-expanded', String(this.detalleAbierto));
    b.textContent = this.detalleAbierto ? 'Ocultar detalle' : 'Ver detalle';
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
    const meta = SRP.jornadas.previstosDe(j);
    this.el('franja-jornada-texto').innerHTML =
      '<span class="franja-jornada-titulo"><strong>' + esc(j.nombre) + '</strong></span>' +
      // Lo que cambia con cada árbol va siempre a la vista: cuántos van, y su barra frente a lo previsto
      '<span class="franja-jornada-avance"><b>' + n + (meta !== null ? ' de ' + meta : '') + (n === 1 && meta === null ? ' árbol' : ' árboles') + '</b>' +
        (meta ? '<svg class="jornada-barra" data-tono="' + (n >= meta ? 'ok' : 'curso') + '" viewBox="0 0 100 8" preserveAspectRatio="none" aria-hidden="true"><rect width="' + Math.min(100, Math.round(n / meta * 100)) + '" height="8"/></svg>' : '') + '</span>' +
      '<span class="franja-jornada-datos">' + esc(SRP.util.textoDias(SRP.util.diasJornada(j, registros))) + (this.lugarDe(j) ? ' · ' + esc(this.lugarDe(j)) : '') +
        // La prioridad de la jornada, la de la colonia donde se ubicó, junto a ella; después la dirección
        (SRP.prioritarias.marca(SRP.prioritarias.deJornada(registros, j)) ? ' · ' + SRP.prioritarias.marca(SRP.prioritarias.deJornada(registros, j)) : '') +
        (j.ubicacion ? ' · ' + esc(j.ubicacion) : '') + (j.programa_id ? ' · ' + esc(SRP.ref.nombreCatalogo(j.programa_id)) : '') + '' +
      (j.estatus === 'cerrada' ? ' · cerrada' : '') + (atrasada ? ' · <b>no es de hoy</b>' : '') +
      (j.relevo_id && j.relevo_id !== j.cabo_id ? ' · relevo de ' + esc(SRP.ref.nombreUsuario(j.cabo_id)) : '') + '</span>' +
      (SRP.solicitud.es(j) ? '<span class="franja-jornada-solicitud">' + SRP.solicitud.insignia(j) + '</span>' : '');
    this.el('franja-jornada-acciones').hidden = !!editando;
    this.el('btn-franja-editar').hidden = !!editando || !SRP.permisos.puede('jornada.editar', j);
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
      const avance = p.meta === null ? '' : n > p.meta ? 'Van ' + n + ' árboles: ' + (n - p.meta) + ' más de los ' + p.meta + ' previstos. ' : 'Se plantó lo previsto: ' + n + ' de ' + p.meta + '. ';
      sig.innerHTML = SRP.ICONOS.svg('palomita', 'medio') + '<span>' + esc(avance + 'Siguiente: cerrar la jornada cuando termine.') + '</span>';
    }
  },

  /* El programa se elige al iniciar la jornada, entre los que puede elegir la institución de quien la
     inicia (la Secretaría, todos; una alcaldía, Reforestación Urbana; una empresa privada, Palmeras).
     Sin preselección cuando hay de dónde elegir; si hay uno solo, ya viene puesto. */
  llenarProgramas() {
    const sel = this.el('ini-programa');
    const opciones = SRP.ref.programasPara(SRP.sesion.usuario && SRP.sesion.usuario.organizacion_id);
    sel.innerHTML = SRP.util.opciones('Seleccione un programa', opciones.map(o => [o.id, o.nombre]));
    sel.value = opciones.length === 1 ? opciones[0].id : '';
    SRP.util.quitarErrorCampo(sel);
    this.pintarProgramasFrecuentes(opciones);
  },

  /* Programas a un toque, sobre la lista: Reforestación Urbana siempre primero, por ser el más común, y
     después los que más ha usado quien inicia la jornada; si ha usado pocos, completan los del catálogo
     en su orden. Con un solo programa ya viene puesto: no hay chips. */
  async pintarProgramasFrecuentes(opciones) {
    const caja = this.el('ini-programa-chips');
    if (opciones.length < 2) { caja.hidden = true; caja.innerHTML = ''; return; }
    const u = SRP.sesion.usuario, cuenta = {};
    (await SRP.almacen.todos('jornadas')).forEach(j => { if (u && j.cabo_id === u.id && j.programa_id) cuenta[j.programa_id] = (cuenta[j.programa_id] || 0) + 1; });
    const fijo = opciones.find(p => p.clave === 'REFOR_URBANA');
    const resto = opciones.filter(p => p !== fijo);
    const usados = resto.filter(p => cuenta[p.id]).sort((a, b) => cuenta[b.id] - cuenta[a.id]);
    const lista = (fijo ? [fijo] : []).concat(usados, resto.filter(p => !cuenta[p.id])).slice(0, 3);
    const esc = SRP.util.escapar;
    caja.innerHTML = lista.map(p => '<button type="button" class="chip" data-id="' + esc(p.id) + '" aria-pressed="false">' + esc(p.nombre) + '</button>').join('');
    caja.hidden = false;
    this.marcarChipPrograma();
  },

  marcarChipPrograma() {
    const v = this.el('ini-programa').value;
    this.el('ini-programa-chips').querySelectorAll('.chip').forEach(c => c.setAttribute('aria-pressed', String(c.dataset.id === v)));
  },

  /* ---------- Ubicación de la jornada (D122) ---------- */

  punto: null,   // { lat, lng, precision, t } de la última detección en el panel; null si no se detectó

  /* El botón y los dos datos de lectura reflejan lo detectado. Sin punto es la acción principal
     (azul); con punto es corregir (neutro con lápiz, «Detectar de nuevo»), como el botón del árbol (D48, D166). */
  pintarDetectar(buscando) {
    const b = this.el('btn-ini-detectar');
    b.disabled = !!buscando;
    b.setAttribute('aria-busy', String(!!buscando));
    const p = this.punto;
    if (p) SRP.util.quitarErrorCampo(b);   // ya ubicada: el aviso de que faltaba la ubicación se va
    b.className = 'btn btn-ancho ' + (p ? 'btn-editar' : 'btn-primario');
    b.innerHTML = SRP.ICONOS.svg('ubicacion', 'medio') + '<span>' +
      (buscando ? 'Buscando señal…' : p ? 'Detectar de nuevo la ubicación' : 'Detectar ubicación de la jornada') + '</span>';
    this.el('ini-alcaldia').textContent = p ? SRP.ref.alcaldia(p.t.alcaldia) : '—';
    this.el('ini-colonia').textContent = p ? SRP.ref.colonia(p.t.colonia) : '—';
    this.el('caja-ini-prioridad').hidden = !SRP.prioritarias.hay();
    // Sin ubicación todavía, la escala se ve completa y sin nivel resaltado
    this.el('ini-prioridad').innerHTML = SRP.prioritarias.hay() ? SRP.prioritarias.htmlEscala(p ? SRP.prioritarias.de(p.lat, p.lng) : null).replace('Sin dato en la capa de prioridad', p ? 'Sin dato en la capa de prioridad' : 'Detecte la ubicación para ver la prioridad de la colonia') : '';
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
        // Seis decimales, como el árbol: la coordenada del GPS llegaba con quince (D152)
        const lat = Number(pos.coords.latitude.toFixed(6)), lng = Number(pos.coords.longitude.toFixed(6)), precision = pos.coords.accuracy;
        const m = precision != null ? Math.round(precision) : null;
        if (!SRP.derivacion.dentroDelAmbito(lat, lng)) {
          this.punto = null;
          this.pintarDetectar(false);
          this.avisoDetectar('Ubicación obtenida' + (m != null ? ' (±' + m + ' m)' : '') + ', pero cae fuera de la Ciudad de México. Escriba la dirección abajo.', 'alerta');
          return;
        }
        const t = SRP.derivacion.derivar(lat, lng);
        this.punto = { lat, lng, precision, t, origen: 'gps' };
        this.pintarDetectar(false);
        const borde = t.fuera_m ? ' El punto cae a ' + t.fuera_m + ' m fuera del límite: se toma ' + t.alcaldia + ', la alcaldía más cercana.' : '';
        this.avisoDetectar('Ubicación detectada' + (m != null ? ' (±' + m + ' m)' : '') + '.' + borde + ' Complete abajo la dirección o referencia si hace falta.',
          (m != null && m > SRP.CONFIG.MAPA.PRECISION_ACEPTABLE_M) || t.fuera_m ? 'alerta' : 'bien');
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
    const C = SRP.util.coordenadas;
    C.repartir(this.el('ini-coord-lat'), this.el('ini-coord-lng'));
    const lat = C.latitud(this.el('ini-coord-lat').value);
    const lng = C.longitud(this.el('ini-coord-lng').value);   // negativa con o sin signo (D170)
    if (Number.isNaN(lat) || Number.isNaN(lng)) { this.avisoDetectar('Escriba la latitud y la longitud, por ejemplo 19.4326 y 99.1332, o pegue las dos juntas.', 'alerta'); return; }
    if (!SRP.derivacion.dentroDelAmbito(lat, lng)) { this.avisoDetectar('El punto está fuera de la Ciudad de México. Revise las coordenadas.', 'alerta'); return; }
    const t = SRP.derivacion.derivar(lat, lng);
    this.punto = { lat: Number(lat.toFixed(6)), lng: Number(lng.toFixed(6)), precision: null, t, origen: 'manual' };
    this.pintarDetectar(false);
    this.avisoDetectar(t.fuera_m ? 'Punto capturado a mano, a ' + t.fuera_m + ' m fuera del límite: se toma ' + t.alcaldia + ', la alcaldía más cercana. Revise las coordenadas.'
      : 'Punto capturado a mano. Complete abajo la dirección si hace falta.', t.fuera_m ? 'alerta' : 'bien');
  },

  // «Colonia, Alcaldía» de una jornada, para la franja, Jornadas y el reporte; '' si no se detectó
  lugarDe(j) { return j ? SRP.ref.lugar(j.alcaldia, j.colonia) : ''; },   // M15

  /* ---------- Acciones ---------- */

  async iniciarJornada() {
    if (!SRP.permisos.exigir('jornada.crear')) return;
    const nombre = this.el('ini-nombre').value.trim();
    const ubicacion = this.el('ini-ubicacion').value.trim();
    const fecha = this.el('ini-fecha').value;
    const comentarios = this.el('ini-comentarios').value.trim();
    const programa_id = this.el('ini-programa').value;
    const metaTexto = this.el('ini-meta').value.trim();
    const previstos = metaTexto === '' ? null : Number(metaTexto);
    const errores = [];
    if (!nombre) errores.push(['ini-nombre', 'Escriba el nombre de la jornada: el parque, la calle o el sitio.']);
    // La jornada se ubica siempre: con el GPS o con las coordenadas a mano
    if (!this.punto) errores.push(['btn-ini-detectar', 'Ubique la jornada: use «Detectar ubicación de la jornada» o capture las coordenadas a mano.']);
    if (!programa_id) errores.push(['ini-programa', 'Elija el programa de la jornada.']);
    else if (!SRP.ref.programasPara(SRP.sesion.usuario.organizacion_id).some(p => p.id === programa_id)) errores.push(['ini-programa', 'Ese programa no está disponible para su institución.']);
    SRP.solicitud.errores('ini').forEach(e => errores.push(e));
    if (previstos === null || !Number.isInteger(previstos) || previstos < 1 || previstos > 9999) errores.push(['ini-meta', 'Escriba cuántos árboles se van a plantar: un número entero mayor que cero.']);
    if (!fecha) errores.push(['ini-fecha', 'Indique la fecha de la jornada.']);
    else if (fecha > SRP.util.fechaHoy()) errores.push(['ini-fecha', 'La fecha no puede ser posterior a hoy.']);
    // Cada campo dice su error (D140) y arriba el resumen, igual que en todos los formularios (M15)
    if (SRP.util.resumenErrores(this.el('ini-errores'), errores, ['ini-nombre', 'btn-ini-detectar', 'ini-programa', 'ini-meta', 'ini-fecha'].concat(SRP.solicitud.ids('ini')))) return;
    // Un segundo toque mientras se guarda no inicia otra jornada igual
    if (this._iniciando) return;
    this._iniciando = true;
    const libre = SRP.util.ocupado(this.el('btn-iniciar-jornada'), 'Iniciando…', 'disco');
    try { await this.guardarJornadaNueva({ nombre, ubicacion, fecha, comentarios, programa_id, previstos }); }
    finally { this._iniciando = false; libre(); }
  },

  /* La jornada nueva, completa: lo escrito en «Iniciar jornada» más lo que pone el sistema. La usa
     «Iniciar jornada» para guardar y el espejo de campos para enseñar lo que no se ve. */
  armarJornada({ nombre, ubicacion, fecha, comentarios, programa_id, previstos }) {
    const u = SRP.sesion.usuario;
    const ahora = SRP.util.ahoraISO();
    const p = this.punto, t = p ? p.t : {};
    return Object.assign({
      id: SRP.util.generarId(),
      nombre, ubicacion, fecha, comentarios, programa_id, cabo_id: u.id, estatus: 'abierta',
      // Quién ejecuta: la institución de quien inicia; se fija aquí y no cambia aunque la cuenta cambie después
      organizacion_id: u.organizacion_id || SRP.CONFIG.ORGANIZACION_SEDEMA,
      // Ubicación detectada (D122): nula si no se tocó el botón
      lat: p ? Number(p.lat.toFixed(6)) : null, lng: p ? Number(p.lng.toFixed(6)) : null, punto_origen: p ? (p.origen || 'gps') : null,   // cómo se obtuvo (D143)
      gps_precision_m: p && p.precision != null ? Math.round(p.precision) : null,
      alcaldia_cve: t.alcaldia_cve || null, alcaldia: t.alcaldia || null, colonia_cve: t.colonia_cve || null, colonia: t.colonia || null,
      fecha_inicio: ahora, fecha_cierre: null,
      editado_por_id: null, fecha_ultima_edicion: null,
      arboles_previstos: previstos, puntos_revisados: [], reporte_en: null, encargado_id: u.id,
      // Relevo: el cabo que registra en lugar del titular (nulo: el titular) y la lista de los relevos hechos
      relevo_id: null, relevos: [],
      // Con el programa «Solicitud»: quién lo solicita y de qué se trata
      ...SRP.solicitud.leer('ini'),
      carga_id: null,   // sólo las jornadas de una carga masiva llevan la clave de su lote
      // El vehículo se elige al cerrar, del catálogo; sus tres datos se copian entonces (D162, D174)
      vehiculo_id: null, vehiculo_placa: '', vehiculo_modelo: '', vehiculo_tipo: ''
    }, Object.fromEntries(SRP.reportes.CAMPOS.map(k => [k, ''])));
  },

  // La jornada tal como se guardaría con lo escrito hasta ahora en «Iniciar jornada»
  jornadaPrevista() {
    const texto = id => this.el(id).value.trim(), meta = texto('ini-meta');
    return this.armarJornada({ nombre: texto('ini-nombre'), ubicacion: texto('ini-ubicacion'), fecha: this.el('ini-fecha').value, comentarios: texto('ini-comentarios'),
      programa_id: this.el('ini-programa').value, previstos: meta === '' ? null : Number(meta) });
  },

  async guardarJornadaNueva({ nombre, ubicacion, fecha, comentarios, programa_id, previstos }) {
    const j = this.armarJornada({ nombre, ubicacion, fecha, comentarios, programa_id, previstos });
    await SRP.almacen.guardarConBitacora('jornadas', j, SRP.bitacora.entrada('CREADO', 'jornada', j.id, 'Jornada «' + nombre + '» del ' + SRP.util.formatearFecha(fecha)));
    SRP.almacen.cuidarAlmacenamiento();   // ya hay algo que perder: se pide al navegador que no lo borre (D149)
    this.jornada = j;
    this.mostrarInicio(false);
    await this.preparar();
    SRP.util.anunciar('Jornada «' + nombre + '» iniciada. Ya puede registrar árboles.');
    // La captura empieza arriba, con la jornada a la vista: «Iniciar jornada» quedaba al fondo del formulario
    window.scrollTo(0, 0);
    SRP.formulario.el('btn-ubicacion').focus({ preventScroll: true });
  },

  /* Lo que queda pendiente al cerrar (D133): puntos por revisar y distancia a la meta. Es aviso, no
     impedimento: la jornada se puede cerrar así y reabrir después. Devuelve la confirmación
     estructurada (D139): lo pendiente en viñetas, para que no se pierda en un párrafo. */
  async confirmacionCierre(j) {
    const regs = await this.registrosDe(j);
    const vista = SRP.jornadas.jornadasAlcance ? (await SRP.jornadas.jornadasAlcance()).find(x => x.id === j.id) : null;
    const pend = vista ? SRP.jornadas.pendientes(vista, SRP.jornadas.avisos(vista), j).length : 0;
    const meta = SRP.jornadas.previstosDe(j);
    const n = regs.length;
    const avisos = [];
    if (pend) avisos.push(pend === 1 ? '1 punto por revisar' : pend + ' puntos por revisar');
    if (meta !== null && n < meta) avisos.push((meta - n) + (meta - n === 1 ? ' árbol' : ' árboles') + ' por debajo de lo previsto (' + n + ' de ' + meta + ')');
    if (meta !== null && n > meta) avisos.push((n - meta) + (n - meta === 1 ? ' árbol' : ' árboles') + ' por encima de lo previsto (' + n + ' de ' + meta + ')');
    return { titulo: 'Cerrar jornada', pregunta: '¿Cerrar la jornada «' + j.nombre + '» con ' + n + (n === 1 ? ' árbol' : ' árboles') + '?',
      puntosTitulo: 'Queda pendiente:', puntos: avisos.map(a => a.charAt(0).toUpperCase() + a.slice(1) + '.'),
      nota: (avisos.length ? 'Se puede cerrar de todos modos y reabrir después.' : 'Se puede reabrir después.'), boton: 'Cerrar jornada', icono: 'candado' };
  },

  // `op.sinPreguntarSiCuadra`: viene de «Jornada completa»; si no queda nada pendiente, no se vuelve a preguntar
  async cerrarJornada(op) {
    let j = this.jornada; if (!j) return;
    if (!SRP.permisos.exigir('jornada.editar', j)) return;
    /* Desde «Jornada completa» ya se eligió cerrar: no se vuelve a preguntar. Lo que quede pendiente
       —puntos por revisar, datos de cierre— lo dice la ficha de la jornada, que es a donde se llega. */
    if (!(op && op.directo)) {
      const c = await this.confirmacionCierre(j);
      if (!(await SRP.app.confirmar(c))) return;
      j = await this.ofrecerActualizarPrevistos(j);
    }
    if (!await this.cambiarEstatus(j, 'cerrada')) return;
    this.jornada = null;
    SRP.jornadas.actual = j.id;
    SRP.jornadas.volverAlDetalle = true;
    SRP.jornadas.trasCierre = j;   // la ficha abre diciendo qué sigue (D138)
    SRP.app.mostrarVista('jornadas');
  },

  async reabrir(j) {
    if (!await this.cambiarEstatus(j, 'abierta')) return false;
    // Sólo pasa a ser la activa de quien la reabre si registra en ella: un coordinador la reabre para su cabo
    if (this.capturista(j) === SRP.sesion.usuario.id) {
      this.jornada = await SRP.almacen.uno('jornadas', j.id);
      SRP.util.anunciar('Jornada «' + j.nombre + '» reabierta. Es la activa en Nuevo registro.');
    } else SRP.util.anunciar('Jornada «' + j.nombre + '» reabierta para ' + SRP.ref.nombreUsuario(this.capturista(j)) + '.', 'aviso');
    return true;
  },

  /* Sustituir un árbol de una jornada cerrada la reabre y deja sin vigencia su reporte: eso no se
     deshace solo, así que se pregunta antes. Devuelve si se reabrió. */
  async reabrirParaSustituto(j) {
    const ok = await SRP.app.confirmar({ titulo: 'Jornada cerrada', pregunta: '¿Reabrir «' + j.nombre + '» para registrar el sustituto?',
      puntos: ['La jornada se reabre mientras registra el sustituto y vuelve a cerrarse al guardarlo o al cancelar.']
        .concat(j.reporte_en ? ['Su reporte deja de estar vigente: habrá que generarlo de nuevo, ya con el sustituto.'] : []),
      boton: 'Sí, registrar el sustituto', icono: 'palomita' });
    return ok ? this.reabrir(j) : false;
  },

  /* Una jornada cerrada que se reabrió sólo para registrar un sustituto vuelve a cerrarse al
     guardarlo o al cancelar: no se queda abierta fuera de las cifras. */
  async volverACerrar(id) {
    const j = await SRP.almacen.uno('jornadas', id);
    if (!j || j.estatus !== 'abierta') return false;
    if (!await this.cambiarEstatus(j, 'cerrada')) return false;
    if (this.jornada && this.jornada.id === id) this.jornada = null;
    return true;
  },

  // Devuelve si se hizo: sin permiso se detiene con aviso (D151)
  async cambiarEstatus(j, estatus) {
    if (!SRP.permisos.exigir('jornada.editar', j)) return false;
    const u = SRP.sesion.usuario;
    const ahora = SRP.util.ahoraISO();
    const nuevo = Object.assign({}, j, { estatus, fecha_cierre: estatus === 'cerrada' ? ahora : null, editado_por_id: u.id, fecha_ultima_edicion: ahora });
    // Una jornada reabierta va a cambiar: su reporte deja de contar como generado
    const caduca = estatus !== 'cerrada' && !!j.reporte_en;
    if (caduca) nuevo.reporte_en = null;
    await SRP.almacen.guardarConBitacora('jornadas', nuevo, SRP.bitacora.entrada('EDITADO', 'jornada', j.id,
      estatus === 'cerrada' ? 'Jornada cerrada' : 'Jornada reabierta' + (caduca ? '; su reporte deja de estar vigente' : '')));
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
      '<span class="jornada-cifras">' + esc(SRP.util.textoDias(SRP.util.diasJornada(j, conteos[i]))) + ' · ' + conteos[i].length + (conteos[i].length === 1 ? ' árbol' : ' árboles') +
      (j.cabo_id !== SRP.sesion.usuario.id ? ' · relevo de ' + esc(SRP.ref.nombreUsuario(j.cabo_id)) : '') +
      (this.jornada && this.jornada.id === j.id ? ' · activa' : '') + '</span></span></button></li>').join('')
      : '<li class="nota">No hay jornadas abiertas.</li>';
    this.el('dlg-cambiar-jornada').showModal();
  },

  // Sin jornada abierta no hay formulario: cualquier intento vuelve al panel de inicio (D120)
  exigir() {
    if (this.jornada && this.jornada.estatus === 'abierta') return true;
    if (SRP.formulario.estado.editando) return true;
    this.mostrarInicio(true);
    SRP.util.anunciar('Inicie una jornada antes de registrar árboles.', 'aviso');
    return false;
  },

  /* La pregunta por distancia de D119 pasó a ser un aviso de la ficha de revisión (D130): ver
     SRP.formulario.avisos(). */
};

// Acciones que escriben en el teléfono: si fallan, se dice qué no se pudo hacer (D149)
SRP.util.proteger(SRP.activa, { iniciarJornada: 'iniciar la jornada', cambiarEstatus: 'cambiar el estado de la jornada' });
