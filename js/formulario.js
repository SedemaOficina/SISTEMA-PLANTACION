/* FORMULARIO DE PLANTACIÓN: alta y edición comparten la misma pantalla y las mismas reglas. */
window.SRP = window.SRP || {};

SRP.formulario = {
  OTRA: '__otra__',
  estado: { especieId: null, foto: null, fotoId: null, fotoNombre: '', fotoBytes: 0,
            territorio: null, editando: null, idPrevisto: null },

  el(id) { return document.getElementById(id); },

  /* AVANCE AUTOMÁTICO DEL FOCO.
     En campo se captura con una mano y sin mirar la pantalla entre dato y dato: al resolver un
     campo, el siguiente debe estar listo. Sólo se avanza cuando la respuesta quedó cerrada
     —una especie elegida de la lista, un programa seleccionado— nunca mientras se escribe, para
     no arrebatar el foco a media palabra. El orden es el mismo que se ve en la pantalla. */
  ORDEN_FOCO: ['btn-ubicacion', 'campo-especie', 'campo-programa', 'campo-fecha'],

  avanzarFoco(desde) {
    const i = this.ORDEN_FOCO.indexOf(desde);
    if (i < 0 || i + 1 >= this.ORDEN_FOCO.length) return;
    const siguiente = this.el(this.ORDEN_FOCO[i + 1]);
    if (!siguiente || siguiente.disabled) return;
    siguiente.focus({ preventScroll: true });
    siguiente.scrollIntoView({ block: 'center' });
  },

  iniciar() {
    SRP.mapa.iniciar((lat, lng) => this.alMoverPunto(lat, lng));
    this.el('btn-ubicacion').addEventListener('click', () => SRP.mapa.ubicar());
    SRP.mapa.refrescarBotonUbicacion();
    // Con la captura a mano desplegada se oculta el botón de ubicación: una sola forma de fijar el punto a la vista
    this.el('detalles-coord').addEventListener('toggle', (e) => {
      this.el('btn-ubicacion').hidden = e.target.open;
    });
    this.el('btn-coord-aplicar').addEventListener('click', () => this.aplicarCoordenadasManuales());
    this.iniciarCombo();
    this.el('campo-programa').addEventListener('change', () => {
      if (this.el('campo-programa').value) this.avanzarFoco('campo-programa');
    });
    this.el('foto-archivo').addEventListener('change', (e) => this.cargarFoto(e.target));
    this.el('btn-foto-quitar').innerHTML = SRP.ICONOS.svg('basura', 20);
    this.el('btn-foto-quitar').addEventListener('click', () => {
      this.ponerFoto(null, null);
      SRP.util.anunciarSilencioso('Fotografía quitada.');
      this.el('etq-foto').focus();
    });
    this.el('form-plantacion').addEventListener('submit', (e) => { e.preventDefault(); this.revisar(); });
    this.el('btn-revisar').innerHTML = SRP.ICONOS.svg('disco', 22) + '<span>Revisar y guardar</span>';
    this.el('btn-resumen-guardar').innerHTML = SRP.ICONOS.svg('palomita') + '<span>Guardar</span>';
    this.el('btn-resumen-cerrar').innerHTML = SRP.ICONOS.svg('cerrar', 22);
    this.el('btn-resumen-cerrar').addEventListener('click', () => this.el('dlg-resumen').close());
    // Al cerrar la ficha se destruye su mapa: si no, queda un mapa vivo en un diálogo oculto
    // y su marcador se confunde con el del mapa principal.
    this.el('dlg-resumen').addEventListener('close', () => {
      if (this.mapaRevision) { this.mapaRevision.remove(); this.mapaRevision = null; }
    });
    // Cada dato de la ficha lleva su botón de corregir; la ubicación lleva al mapa
    this.el('revision-lista').addEventListener('click', (e) => {
      const b = e.target.closest('button[data-campo]'); if (!b) return;
      this.corregirCampo(b.dataset.campo);
    });
    this.el('btn-resumen-guardar').addEventListener('click', () => this.guardar());
    this.el('btn-cancelar-edicion').addEventListener('click', () => { this.limpiar(); SRP.app.mostrarVista('registros'); });
    this.el('btn-registro-nuevo').addEventListener('click', () => this.nuevoRegistro());
    this.el('btn-ir-registros').addEventListener('click', () => {
      this.el('dlg-guardado').close();
      this.estado.idPrevisto = null;
      SRP.app.mostrarVista('registros');
    });
  },

  // Se llama cada vez que se entra a la vista Registrar
  preparar() {
    this.llenarProgramas();
    if (!this.estado.editando && SRP.mapa.lat === null) {
      SRP.mapa.estado('Use el botón de ubicación para tomar su posición, o toque el mapa para colocar el punto.');
    }
    this.el('campo-fecha').max = SRP.util.fechaHoy();
    SRP.mapa.refrescar();
    if (SRP.espejo) SRP.espejo.refrescar();
  },

  llenarProgramas(actualId) {
    const sel = this.el('campo-programa');
    const previo = actualId || sel.value;
    // Reforestación Urbana encabeza la lista: es el programa de casi toda la captura en campo
    const opciones = SRP.ref.deTipo('programa', true)
      .sort((a, b) => (b.clave === 'REFOR_URBANA') - (a.clave === 'REFOR_URBANA'));
    if (previo && !opciones.find(o => o.id === previo) && SRP.ref.catalogoPorId[previo]) opciones.push(SRP.ref.catalogoPorId[previo]);
    sel.innerHTML = '<option value="">Seleccione un programa</option>' + opciones.map(o =>
      '<option value="' + o.id + '">' + SRP.util.escapar(o.nombre) + (o.activo ? '' : ' (inactivo)') + '</option>').join('');
    // Sin preselección: el formulario arranca en blanco aunque el catálogo tenga un solo
    // programa, para que la elección siempre sea de quien captura.
    sel.value = previo || '';
  },

  alMoverPunto(lat, lng) {
    // Sólo cuando el punto lo puso el botón: si se está arrastrando el marcador, quitar el
    // foco a media maniobra sería peor que dejarlo donde está.
    if (document.activeElement === this.el('btn-ubicacion')) this.avanzarFoco('btn-ubicacion');
    const t = SRP.derivacion.derivar(lat, lng);
    this.estado.territorio = t;
    this.mostrarPunto(lat, lng, t);
    // Un punto dentro de la ciudad sin alcaldía cayó en un hueco de la capa: se avisa, pero no
    // se impide guardar, porque el árbol es real y el defecto es de la capa.
    if (!t.alcaldia && SRP.derivacion.dentroDelAmbito(lat, lng)) {
      SRP.mapa.estado('El punto cae entre los polígonos de la capa de alcaldías; se guarda sin alcaldía y se podrá rederivar.', 'alerta');
    }
    // La captura a mano refleja el punto vigente: quien la abra corrige sobre lo que ya hay
    this.el('coord-lat').value = lat.toFixed(6);
    this.el('coord-lng').value = lng.toFixed(6);
  },

  /* Los tres campos de sólo lectura del punto, en un solo lugar: sin territorio, los tres
     vuelven al guion, porque un dato viejo junto a un punto nuevo es peor que ninguno. */
  mostrarPunto(lat, lng, t) {
    this.el('dato-coordenadas').textContent = (t && lat !== null) ? lat.toFixed(6) + ', ' + lng.toFixed(6) : '—';
    this.el('dato-origen').textContent = t ? SRP.mapa.textoOrigen(SRP.mapa.origen, SRP.mapa.precision) : '—';
    this.el('dato-alcaldia').textContent = t ? SRP.ref.alcaldia(t.alcaldia) : '—';
    this.el('dato-colonia').textContent = t ? SRP.ref.colonia(t.colonia) : '—';
    if (SRP.espejo) SRP.espejo.refrescar();
  },

  aplicarCoordenadasManuales() {
    const lat = parseFloat(this.el('coord-lat').value.replace(',', '.'));
    const lng = parseFloat(this.el('coord-lng').value.replace(',', '.'));
    if (Number.isNaN(lat) || Number.isNaN(lng)) {
      SRP.mapa.estado('Escriba latitud y longitud en grados decimales, por ejemplo 19.4326 y -99.1332.', 'alerta');
      return;
    }
    SRP.mapa.colocar(lat, lng, 'Punto capturado a mano.', { origen: 'manual', centrar: true });
  },

  /* ---------- Autocompletado de especie ---------- */
  iniciarCombo() {
    const entrada = this.el('campo-especie');
    const lista = this.el('lista-especies');
    this.comboActivo = -1;
    entrada.addEventListener('input', () => { this.estado.especieId = null; this.mostrarOtra(false); this.filtrarEspecies(); });
    entrada.addEventListener('focus', () => this.filtrarEspecies());
    entrada.addEventListener('blur', () => setTimeout(() => this.cerrarCombo(), 150));
    entrada.addEventListener('keydown', (e) => {
      const opciones = lista.querySelectorAll('.combo-opcion');
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        if (lista.hidden) this.filtrarEspecies();
        const n = opciones.length; if (!n) return;
        this.comboActivo = e.key === 'ArrowDown' ? (this.comboActivo + 1) % n : (this.comboActivo - 1 + n) % n;
        this.resaltar(opciones);
      } else if (e.key === 'Enter' && !lista.hidden && this.comboActivo >= 0) {
        e.preventDefault(); opciones[this.comboActivo].dispatchEvent(new Event('mousedown'));
      } else if (e.key === 'Escape') { this.cerrarCombo(); }
    });
    lista.addEventListener('mousedown', (e) => {
      const li = e.target.closest('.combo-opcion'); if (!li) return;
      e.preventDefault();
      this.elegirEspecie(li.dataset.id);
      if (li.dataset.id !== this.OTRA) this.avanzarFoco('campo-especie');
    });
  },

  filtrarEspecies() {
    // Con una especie ya elegida, el texto del campo es «Común (Científico)», que no coincide con
    // ningún nombre por separado y dejaba la lista en sólo «Otra especie». Mientras la elección
    // siga vigente se ofrece la lista completa; en cuanto se teclea, especieId se anula y se filtra (D76)
    const q = this.estado.especieId ? '' : SRP.util.normalizar(this.el('campo-especie').value);
    const coinciden = SRP.ref.deTipo('especie', true)
      .filter(e => !q || SRP.util.normalizar(e.nombre).includes(q) || SRP.util.normalizar(e.nombre_cientifico).includes(q))
      .slice(0, 8);
    const lista = this.el('lista-especies');
    lista.innerHTML = coinciden.map(e =>
      '<li class="combo-opcion" role="option" id="op-' + e.id + '" data-id="' + e.id + '" aria-selected="false">' +
      SRP.util.escapar(e.nombre) + '<small>' + SRP.util.escapar(e.nombre_cientifico) + '</small></li>').join('') +
      '<li class="combo-opcion" role="option" id="op-otra" data-id="' + this.OTRA + '" aria-selected="false">Otra especie<small>No está en el catálogo</small></li>';
    lista.hidden = false;
    this.el('campo-especie').setAttribute('aria-expanded', 'true');
    this.comboActivo = -1;
  },

  resaltar(opciones) {
    opciones.forEach((o, i) => o.setAttribute('aria-selected', String(i === this.comboActivo)));
    const act = opciones[this.comboActivo];
    this.el('campo-especie').setAttribute('aria-activedescendant', act.id);
    act.scrollIntoView({ block: 'nearest' });
  },

  cerrarCombo() {
    this.el('lista-especies').hidden = true;
    this.el('campo-especie').setAttribute('aria-expanded', 'false');
    this.el('campo-especie').removeAttribute('aria-activedescendant');
  },

  elegirEspecie(id, textoOtra) {
    this.estado.especieId = id;
    if (id === this.OTRA) {
      this.el('campo-especie').value = 'Otra especie';
      this.mostrarOtra(true, textoOtra);
    } else {
      this.el('campo-especie').value = SRP.ref.textoEspecie(id);
      this.mostrarOtra(false);
    }
    this.cerrarCombo();
  },

  mostrarOtra(ver, texto) {
    this.el('caja-otra-especie').hidden = !ver;
    if (!ver) this.el('campo-otra-especie').value = '';
    else { this.el('campo-otra-especie').value = texto || ''; if (!texto) this.el('campo-otra-especie').focus(); }
  },

  /* ---------- Foto ---------- */
  async cargarFoto(entrada) {
    const archivo = entrada.files[0];
    entrada.value = '';   // permite volver a elegir el mismo archivo
    if (!archivo) return;
    try {
      const f = await SRP.foto.comprimir(archivo);
      this.ponerFoto(f.datos, SRP.util.generarId(), f.nombre, f.bytes);
      SRP.util.anunciarSilencioso('Fotografía agregada.');
    } catch (err) {
      SRP.util.anunciar(err.message + ' Intente con otra fotografía.', 'alerta');
    }
  },

  ponerFoto(datos, id, nombre, bytes) {
    this.estado.foto = datos;
    this.estado.fotoId = id;
    this.estado.fotoNombre = nombre || '';
    this.estado.fotoBytes = bytes || (datos ? SRP.foto.pesoDe(datos) : 0);
    this.el('ficha-foto').hidden = !datos;
    if (datos) {
      this.el('foto-vista').src = datos;
      // Sin nombre de archivo —una foto ya guardada que se vuelve a abrir— se nombra por lo que es
      this.el('foto-nombre').textContent = this.estado.fotoNombre || 'Fotografía del registro';
      this.el('foto-peso').textContent = SRP.foto.formatearPeso(this.estado.fotoBytes);
    } else {
      this.el('foto-vista').removeAttribute('src');
    }
    // La zona de carga dice si va a poner la primera foto o a reemplazar la que hay
    this.el('texto-foto').textContent = datos ? 'Cambiar fotografía' : 'Agregar fotografía';
    if (SRP.espejo) SRP.espejo.refrescar();
  },

  /* ---------- Validación y resumen ---------- */
  validar() {
    const errores = [];
    if (SRP.mapa.lat === null) errores.push(['btn-ubicacion', 'Falta la ubicación: use el botón de ubicación, toque el mapa o capture coordenadas.']);
    if (!this.estado.especieId) errores.push(['campo-especie', 'Elija una especie de la lista o la opción «Otra especie».']);
    if (this.estado.especieId === this.OTRA && !this.el('campo-otra-especie').value.trim())
      errores.push(['campo-otra-especie', 'Escriba qué especie es.']);
    if (!this.el('campo-programa').value) errores.push(['campo-programa', 'Elija el programa.']);
    const f = this.el('campo-fecha').value;
    if (!f) errores.push(['campo-fecha', 'Indique la fecha de plantación.']);
    else if (f > SRP.util.fechaHoy()) errores.push(['campo-fecha', 'La fecha de plantación no puede ser posterior a hoy.']);
    return errores;
  },

  mostrarErrores(errores) {
    ['campo-especie', 'campo-otra-especie', 'campo-programa', 'campo-fecha'].forEach(id => this.el(id).removeAttribute('aria-invalid'));
    const caja = this.el('resumen-errores');
    if (!errores.length) { caja.hidden = true; return; }
    errores.forEach(([id]) => { if (id !== 'btn-ubicacion') this.el(id).setAttribute('aria-invalid', 'true'); });
    caja.innerHTML = '<h2>Falta corregir ' + errores.length + (errores.length === 1 ? ' dato' : ' datos') + '</h2><ul>' +
      errores.map(([id, t]) => '<li><a href="#' + id + '">' + t + '</a></li>').join('') + '</ul>';
    caja.hidden = false;
    caja.focus();
  },

  valores() {
    const otra = this.estado.especieId === this.OTRA;
    // Sin punto todavía no hay derivación territorial; se devuelven nulos en vez de reventar,
    // porque el espejo de campos pinta el registro desde antes de que exista la coordenada.
    const t = this.estado.territorio || {};
    return {
      lat: SRP.mapa.lat, lng: SRP.mapa.lng,
      punto_origen: SRP.mapa.origen, gps_precision_m: SRP.mapa.precision,
      alcaldia_cve: t.alcaldia_cve || null, alcaldia: t.alcaldia || null,
      colonia_cve: t.colonia_cve || null, colonia: t.colonia || null,
      uga: t.uga || null, capa_version: t.capa_version || null,
      especie_id: otra ? null : this.estado.especieId,
      especie_otra: otra ? this.el('campo-otra-especie').value.trim() : '',
      // «Otra especie» ya no es un problema del identificador: es un pendiente de catálogo (D68)
      especie_estatus: otra ? 'PENDIENTE_VALIDACION' : 'VALIDADA',
      programa_id: this.el('campo-programa').value,
      fecha_plantacion: this.el('campo-fecha').value,
      comentarios: this.el('campo-comentarios').value.trim(),
      foto_base64: this.estado.foto, foto_id: this.estado.fotoId,
      foto_nombre: this.estado.fotoNombre, foto_bytes: this.estado.fotoBytes
    };
  },

  revisar() {
    const errores = this.validar();
    this.mostrarErrores(errores);
    if (errores.length) return;

    // El identificador se fija aquí y es el que se guarda: así la ficha muestra el real.
    if (!this.estado.idPrevisto) this.estado.idPrevisto = SRP.util.generarId();
    const id = this.estado.editando ? this.estado.editando.id : this.estado.idPrevisto;

    const v = this.valores();
    const esp = SRP.ref.especieDe(v);
    const esc = SRP.util.escapar;

    // La ubicación no se teclea: se corrige volviendo a colocar el punto en el mapa.
    const filas = [
      ['Folio', '<span class="folio-provisional">' + esc(SRP.folio.PROVISIONAL) + '</span>', null],
      ['Identificador', '<span class="revision-id">' + esc(id) + '</span>', null],
      ['Especie', esc(esp.comun) + (esp.cientifico ? ' <i>(' + esc(esp.cientifico) + ')</i>' : ''), 'especie'],
      ['Programa', esc(SRP.ref.nombreCatalogo(v.programa_id)), 'programa'],
      ['Fecha de plantación', esc(SRP.util.formatearFecha(v.fecha_plantacion)), 'fecha'],
      ['Alcaldía', esc(SRP.ref.alcaldia(v.alcaldia)), null],
      ['Colonia', esc(SRP.ref.colonia(v.colonia)), null],
      ['Coordenadas', v.lat.toFixed(6) + ', ' + v.lng.toFixed(6), 'punto'],
      ['Cómo se obtuvo', esc(SRP.mapa.textoOrigen(v.punto_origen, v.gps_precision_m)), null],
      ['Cabo', esc(this.nombreCabo()), null],
      ['Comentarios', v.comentarios ? esc(v.comentarios) : 'Sin comentarios', 'comentarios'],
      ['Fotografía', v.foto_base64
        ? '<img class="revision-foto" src="' + v.foto_base64 + '" alt="Fotografía del árbol que se va a registrar">'
        : 'Sin fotografía', 'foto']
    ];

    this.el('revision-lista').innerHTML = filas.map(([etiqueta, valor, campo]) => {
      const boton = campo
        ? '<button type="button" class="btn btn-texto-editar btn-chico" data-campo="' + campo + '" ' +
          'aria-label="Editar ' + etiqueta.toLowerCase() + '">Editar</button>'
        : '<span></span>';
      return '<div class="revision-fila"><dt>' + etiqueta + '</dt><dd>' + valor + '</dd>' + boton + '</div>';
    }).join('') +
      '<p class="revision-nota">El folio lo asignará el servidor al sincronizar; hasta entonces el registro es provisional. ' +
      'El identificador lo asigna el sistema y no se modifica. ' +
      'La alcaldía sale del punto: para cambiarla hay que mover la coordenada.</p>';

    this.el('dlg-resumen').showModal();
    this.dibujarMapaRevision(v.lat, v.lng);
  },

  /* Quién queda como autor. En alta es quien tiene la sesión abierta —el encabezado lo dice
     arriba, por eso ya no hay campo—; en edición sigue siendo el cabo que lo capturó, que no
     tiene por qué ser quien corrige. */
  nombreCabo() {
    return this.estado.editando
      ? SRP.ref.nombreUsuario(this.estado.editando.cabo_id)
      : SRP.util.nombreCompleto(SRP.sesion.usuario);
  },

  dibujarMapaRevision(lat, lng) {
    this.mapaRevision = SRP.mapa.estatico('revision-mapa', lat, lng);
  },

  // Cierra la ficha y lleva a donde se corrige ese dato
  corregirCampo(campo) {
    this.el('dlg-resumen').close();
    if (campo === 'punto') {
      SRP.mapa.estado('Vuelva a colocar el punto: use el botón de ubicación, toque el mapa o arrastre el marcador.');
      this.el('btn-ubicacion').scrollIntoView({ block: 'center' });
      this.el('btn-ubicacion').focus();
      return;
    }
    if (campo === 'foto') { this.el('etq-foto').scrollIntoView({ block: 'center' }); this.el('foto-archivo').click(); return; }
    const destino = { especie: 'campo-especie', programa: 'campo-programa', fecha: 'campo-fecha', comentarios: 'campo-comentarios' }[campo];
    if (!destino) return;
    const el = this.el(destino);
    el.scrollIntoView({ block: 'center' });
    el.focus();
    if (destino === 'campo-especie') el.select();
  },

  /* ---------- Guardar ---------- */

  /* EL REGISTRO TAL COMO QUEDARÍA EN LA BASE, en un solo lugar. Lo arma guardar() y lo lee el
     espejo de campos: así lo que el espejo enseña no puede desfasarse de lo que de verdad se
     escribe, que es justo el error que un panel de control visual haría fácil cometer. */
  registroPrevisto(ahora) {
    const v = this.valores();
    const u = SRP.sesion.usuario;
    ahora = ahora || SRP.util.ahoraISO();
    if (this.estado.editando) {
      return Object.assign({}, this.estado.editando, v,
        { fecha_ultima_edicion: ahora, editado_por_id: u ? u.id : null });
    }
    return Object.assign({
      id: this.estado.idPrevisto, es_ficticio: SRP.CONFIG.ES_FICTICIO, estatus: 'activo',
      cabo_id: u ? u.id : null, lat_original: v.lat, lng_original: v.lng,
      fecha_registro: ahora, fecha_ultima_edicion: null, editado_por_id: null,
      // El folio y lo que se congela con él los pone el servidor al sincronizar (R3, R8); aquí nacen nulos
      folio: null, folio_uga: null, folio_capa_version: null, folio_lat: null, folio_lng: null
    }, v);
  },

  async guardar() {
    const v = this.valores();
    const u = SRP.sesion.usuario;
    const ahora = SRP.util.ahoraISO();
    const boton = this.el('btn-resumen-guardar');
    boton.disabled = true;
    try {
      if (this.estado.editando) {
        const previo = this.estado.editando;
        const cambiados = ['lat', 'lng', 'punto_origen', 'especie_id', 'especie_otra', 'programa_id', 'fecha_plantacion', 'comentarios', 'foto_id']
          .filter(k => (previo[k] || null) !== (v[k] || null));
        const nuevo = this.registroPrevisto(ahora);
        await SRP.almacen.guardarConBitacora('plantaciones', nuevo,
          SRP.bitacora.entrada('EDITADO', 'plantacion', nuevo.id, cambiados.length ? 'Campos: ' + cambiados.join(', ') : 'Sin cambios en los datos'));
        this.el('dlg-resumen').close();
        this.limpiar();
        SRP.util.anunciar('Cambios guardados.');
        SRP.app.mostrarVista('registros');
      } else {
        const nuevo = this.registroPrevisto(ahora);
        await SRP.almacen.guardarConBitacora('plantaciones', nuevo, SRP.bitacora.entrada('CREADO', 'plantacion', nuevo.id));
        this.el('dlg-resumen').close();
        this.mostrarGuardado(nuevo);
      }
    } catch (err) {
      SRP.util.anunciar('No se pudo guardar: ' + err.message + '. Sus datos siguen en pantalla; intente de nuevo.', 'alerta');
    } finally {
      boton.disabled = false;
    }
  },

  /* ---------- Después de guardar ---------- */

  // En campo se registran varios árboles seguidos, así que el paso siguiente se ofrece
  // explícitamente en vez de dejar el formulario a medio limpiar sin decir nada.
  mostrarGuardado(registro) {
    const esp = SRP.ref.especieDe(registro);
    this.el('dlg-guardado-titulo').innerHTML = SRP.ICONOS.svg('palomita', 22) + '<span>Registro guardado</span>';
    this.el('dlg-guardado-detalle').textContent = esp.comun + ', ' +
      SRP.ref.alcaldia(registro.alcaldia) + ', ' + SRP.util.formatearFecha(registro.fecha_plantacion) + '.';
    this.el('dlg-guardado-id').textContent = 'Identificador: ' + registro.id;
    this.el('dlg-guardado').showModal();
    this.el('btn-registro-nuevo').focus();
  },

  /* El formulario arranca en blanco en cada registro. Antes conservaba programa, fecha y
     ubicación porque los árboles de una jornada suelen compartirlos; en campo eso se convierte
     en el dato del árbol anterior guardado sin que nadie lo note, y la coordenada heredada es
     el peor de los casos: se ve bien y está mal. Se prefiere volver a capturar. */
  nuevoRegistro() {
    this.el('dlg-guardado').close();
    this.limpiar();
    SRP.mapa.refrescar();
    this.el('btn-ubicacion').scrollIntoView({ block: 'center' });
    this.el('btn-ubicacion').focus();
  },

  /* ---------- Edición ---------- */
  editar(registro) {
    this.limpiar();
    this.estado.editando = registro;
    this.el('titulo-registrar').textContent = 'Editar registro';
    this.el('titulo-registrar').hidden = false;
    const aviso = this.el('edicion-aviso');
    aviso.textContent = 'Está editando el registro del ' + SRP.util.formatearFecha(registro.fecha_plantacion) +
      ' capturado por ' + SRP.ref.nombreUsuario(registro.cabo_id) + '. Los cambios quedan en el historial.';
    aviso.hidden = false;
    this.el('btn-cancelar-edicion').hidden = false;
    this.el('campo-fecha').value = registro.fecha_plantacion;
    this.el('campo-comentarios').value = registro.comentarios || '';
    this.llenarProgramas(registro.programa_id);
    if (registro.especie_id) this.elegirEspecie(registro.especie_id);
    else this.elegirEspecie(this.OTRA, registro.especie_otra);
    this.ponerFoto(registro.foto_base64, registro.foto_id, registro.foto_nombre, registro.foto_bytes);
    SRP.app.mostrarVista('registrar');
    // Al editar se restituye el origen que quedó guardado: abrir un registro no lo convierte
    // en un punto señalado a mano.
    SRP.mapa.colocar(registro.lat, registro.lng, 'Ubicación registrada.',
      { origen: registro.punto_origen, precision: registro.gps_precision_m, centrar: true });
  },

  /* Deja la pantalla como recién abierta. Ni un campo conserva el valor anterior: ni la fecha
     —que se elige a propósito, no se hereda—, ni el programa, ni las coordenadas escritas a
     mano, ni la derivación territorial. Lo único que sobrevive es el encuadre del mapa, que
     no es un dato: ayuda a situarse y no se guarda en ningún lado. */
  limpiar() {
    this.estado.editando = null;
    this.estado.idPrevisto = null;
    this.estado.territorio = null;
    this.el('titulo-registrar').textContent = 'Nuevo registro';
    this.el('titulo-registrar').hidden = true;
    this.el('edicion-aviso').hidden = true;
    this.el('btn-cancelar-edicion').hidden = true;
    this.el('campo-especie').value = ''; this.estado.especieId = null; this.mostrarOtra(false);
    this.el('campo-programa').value = '';
    this.el('campo-fecha').value = '';
    this.el('campo-comentarios').value = '';
    this.el('coord-lat').value = '';
    this.el('coord-lng').value = '';
    this.ponerFoto(null, null);
    this.mostrarErrores([]);
    SRP.mapa.limpiar();
    this.mostrarPunto(null, null, null);
    SRP.mapa.estado('Use el botón de ubicación para tomar su posición, o toque el mapa para colocar el punto.');
  }
};
