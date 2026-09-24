/* FORMULARIO DE PLANTACIÓN: alta y edición comparten la misma pantalla y las mismas reglas. */
window.SRP = window.SRP || {};

SRP.formulario = {
  OTRA: '__otra__',
  estado: { especieId: null, foto: null, fotoId: null, fotoNombre: '', fotoBytes: 0,
            territorio: null, editando: null, idPrevisto: null, ultimoGuardado: null },

  el(id) { return document.getElementById(id); },

  /* SIN AVANCE AUTOMÁTICO DEL FOCO (D82).
     Hasta el bloque 30 el formulario saltaba solo al campo siguiente al cerrar una respuesta
     (ubicación → especie → programa → fecha). En uso real desorientaba: la pantalla se desplazaba
     sin que el usuario lo pidiera y en móvil abría selectores por su cuenta. Ningún campo mueve
     el foco por sí mismo; el usuario decide a dónde ir. */

  iniciar() {
    SRP.mapa.iniciar((lat, lng) => this.alMoverPunto(lat, lng));
    this.el('btn-ubicacion').addEventListener('click', () => { if (SRP.activa.exigir()) SRP.mapa.ubicar(); });
    SRP.mapa.refrescarBotonUbicacion();
    // Con la captura a mano desplegada se oculta el botón de ubicación: una sola forma de fijar el punto a la vista
    this.el('detalles-coord').addEventListener('toggle', (e) => {
      this.el('btn-ubicacion').hidden = e.target.open;
    });
    this.el('btn-coord-aplicar').addEventListener('click', () => this.aplicarCoordenadasManuales());
    this.iniciarCombo();
    this.iniciarProgramas();
    // «Hoy» pone la fecha de un toque; sigue siendo una elección de quien captura (D29, D98)
    this.el('btn-fecha-hoy').addEventListener('click', () => {
      this.el('campo-fecha').value = SRP.util.fechaHoy();
      this.el('campo-fecha').removeAttribute('aria-invalid');
      this.el('campo-fecha').dispatchEvent(new Event('change', { bubbles: true }));
      if (SRP.espejo) SRP.espejo.refrescar();
    });
    // Los enlaces del resumen de errores llevan al control que se ve, aunque el dato viva en otro
    this.el('resumen-errores').addEventListener('click', (e) => {
      const a = e.target.closest('a[href^="#"]'); if (!a) return;
      e.preventDefault();
      this.enfocar(a.getAttribute('href').slice(1));
    });
    this.el('foto-archivo').addEventListener('change', (e) => this.cargarFoto(e.target));
    this.el('btn-foto-quitar').innerHTML = SRP.ICONOS.svg('basura', 20);
    this.el('icono-foto').innerHTML = SRP.ICONOS.svg('camara', 34);
    this.el('btn-foto-quitar').addEventListener('click', () => {
      const f = { datos: this.estado.foto, id: this.estado.fotoId, nombre: this.estado.fotoNombre, bytes: this.estado.fotoBytes };
      this.ponerFoto(null, null);
      // Quitar la foto por error obligaba a tomarla otra vez; ahora se deshace (D101)
      SRP.util.anunciar('Fotografía quitada.', 'exito', { deshacer: () => this.ponerFoto(f.datos, f.id, f.nombre, f.bytes) });
      this.el('etq-foto').focus();
    });
    this.el('form-plantacion').addEventListener('submit', (e) => {
      if (!SRP.activa.exigir()) { e.preventDefault(); return; } e.preventDefault(); this.enviarFormulario(); });
    // Un solo «Guardar» (D130): la ficha de revisión sólo se abre cuando hay algo que revisar
    this.el('btn-revisar').innerHTML = SRP.ICONOS.svg('disco', 22) + '<span>Guardar</span>';
    this.el('btn-guardado-corregir').innerHTML = SRP.ICONOS.svg('lapiz', 16) + '<span>Corregir</span>';
    this.el('btn-guardado-ver').innerHTML = SRP.ICONOS.svg('ver', 16) + '<span>Ver</span>';
    this.el('btn-guardado-cerrar').innerHTML = SRP.ICONOS.svg('cerrar', 18);
    this.el('btn-guardado-cerrar').addEventListener('click', () => { this.el('franja-guardado').hidden = true; });
    this.el('btn-guardado-corregir').addEventListener('click', async () => {
      const r = this.estado.ultimoGuardado && await SRP.almacen.uno('plantaciones', this.estado.ultimoGuardado);
      if (r) { this.el('franja-guardado').hidden = true; this.editar(r); }
    });
    this.el('btn-guardado-ver').addEventListener('click', async () => {
      const r = this.estado.ultimoGuardado && await SRP.almacen.uno('plantaciones', this.estado.ultimoGuardado);
      if (r) SRP.registros.verDetalle(r);
    });
    this.el('especies-recientes').addEventListener('click', (e) => {
      const b = e.target.closest('.chip'); if (!b) return;
      this.elegirEspecie(b.dataset.id);
      this.el('campo-especie').removeAttribute('aria-invalid');
      this.pintarEspeciesRecientes();
      if (SRP.espejo) SRP.espejo.refrescar();
    });
    this.el('btn-resumen-guardar').innerHTML = SRP.ICONOS.svg('disco') + '<span>Guardar</span>';
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
    this.el('btn-cancelar-edicion').addEventListener('click', () => { this.limpiar(); SRP.app.mostrarVista(SRP.jornadas.volverAlDetalle ? 'jornadas' : 'registros'); });
  },

  // Se llama cada vez que se entra a la vista Registrar
  preparar() {
    this.llenarProgramas();
    if (!this.estado.editando && SRP.mapa.lat === null) {
      SRP.mapa.estado('Use el botón de ubicación para tomar su posición, o toque el mapa para colocar el punto.');
    }
    this.el('campo-fecha').max = SRP.util.fechaHoy();
    // Sin jornada abierta, en lugar del formulario se pide iniciarla (D119)
    SRP.activa.preparar().then(() => { if (SRP.espejo) SRP.espejo.refrescar(); });
    SRP.mapa.refrescar();
    if (SRP.espejo) SRP.espejo.refrescar();
  },

  /* Las últimas especies de la jornada activa, a un toque (D130): hasta tres, la más reciente
     primero; «Otra especie» no se ofrece porque cada una es distinta. */
  async pintarEspeciesRecientes() {
    const caja = this.el('especies-recientes');
    const j = this.estado.editando ? null : SRP.activa.jornada;
    const regs = j ? (await SRP.activa.registrosDe(j)).filter(r => r.especie_id).sort((a, b) => String(b.fecha_registro).localeCompare(String(a.fecha_registro))) : [];
    const ids = [...new Set(regs.map(r => r.especie_id))].slice(0, 3);
    caja.hidden = !ids.length;
    caja.innerHTML = ids.map(id => '<button type="button" class="chip" data-id="' + id + '" aria-pressed="' + (this.estado.especieId === id) + '">' +
      SRP.util.escapar((SRP.ref.catalogoPorId[id] || {}).nombre || id) + '</button>').join('');
  },

  // El programa de la jornada se hereda en el formulario (D130); se puede cambiar por árbol
  heredarPrograma() {
    const j = this.estado.editando ? null : SRP.activa.jornada;
    const sel = this.el('campo-programa');
    if (j && j.programa_id && !sel.value) { sel.value = j.programa_id; if (sel.value !== j.programa_id) sel.value = ''; this.pintarProgramas(); }
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
    this.pintarProgramas();
  },

  /* PROGRAMA EN LISTA DESPLEGABLE (D120, supera a D98). Los programas crecen con el tiempo, y
     Liber pidió la lista siempre, no botones. El código de los botones se conserva por si algún día
     se quiere volver a ellos: con MAX_BOTONES_PROGRAMA en 0 nunca se pintan. */
  MAX_BOTONES_PROGRAMA: 0,

  iniciarProgramas() {
    this.el('programa-botones').addEventListener('click', (e) => {
      const b = e.target.closest('.chip'); if (!b) return;
      const sel = this.el('campo-programa');
      sel.value = b.dataset.id;
      sel.removeAttribute('aria-invalid');
      sel.dispatchEvent(new Event('change', { bubbles: true }));
    });
    this.el('campo-programa').addEventListener('change', () => { this.pintarProgramas(); if (SRP.espejo) SRP.espejo.refrescar(); });
  },

  pintarProgramas() {
    const sel = this.el('campo-programa');
    const ops = [...sel.options].filter(o => o.value);
    const caja = this.el('programa-botones');
    const botones = ops.length > 0 && ops.length <= this.MAX_BOTONES_PROGRAMA;
    caja.hidden = !botones;
    sel.classList.toggle('oculto-visual', botones);
    if (botones) { sel.setAttribute('tabindex', '-1'); sel.setAttribute('aria-hidden', 'true'); }
    else { sel.removeAttribute('tabindex'); sel.removeAttribute('aria-hidden'); }
    caja.dataset.invalido = sel.getAttribute('aria-invalid') === 'true' ? 'true' : 'false';
    // Si el foco estaba en un botón, se conserva en el mismo programa tras repintar
    const enfocado = caja.contains(document.activeElement) ? document.activeElement.dataset.id : null;
    caja.innerHTML = botones ? ops.map(o =>
      '<button type="button" class="chip" data-id="' + o.value + '" aria-pressed="' + (o.value === sel.value) + '">' +
      SRP.util.escapar(o.textContent) + '</button>').join('') : '';
    if (enfocado) { const b = caja.querySelector('[data-id="' + enfocado + '"]'); if (b) b.focus(); }
  },

  // Lleva el foco al control que la persona ve para ese dato
  enfocar(id) {
    let el = this.el(id); if (!el) return;
    if (id === 'campo-programa' && !this.el('programa-botones').hidden) el = this.el('programa-botones').querySelector('.chip') || el;
    el.scrollIntoView({ block: 'center' });
    el.focus();
  },

  alMoverPunto(lat, lng) {
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
    entrada.addEventListener('focus', () => { this.filtrarEspecies(); this.darEspacioALista(); });
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
    });
  },

  /* En teléfono el teclado tapaba la lista y sólo se veían dos especies. Al tocar el campo, éste
     sube al tope de la pantalla para que la lista use el espacio que queda (D98). No mueve el foco:
     sólo desplaza la página hasta lo que la persona acaba de tocar (D82 sigue en pie). */
  darEspacioALista() {
    if (!window.matchMedia('(max-width: 700px)').matches) return;
    setTimeout(() => {
      const e = this.el('campo-especie');
      const y = e.getBoundingClientRect().top + window.scrollY - 12;
      window.scrollTo({ top: y, behavior: 'smooth' });
    }, 250);
  },

  filtrarEspecies() {
    // Con una especie ya elegida, el texto del campo es «Común (Científico)», que no coincide con
    // ningún nombre por separado y dejaba la lista en sólo «Otra especie». Mientras la elección
    // siga vigente se ofrece la lista completa; en cuanto se teclea, especieId se anula y se filtra (D76)
    const q = this.estado.especieId ? '' : SRP.util.normalizar(this.el('campo-especie').value);
    // También se busca por los otros nombres comunes del catálogo; si coincidió por uno de ellos
    // se dice («también: Fresno»), porque un mismo nombre puede señalar a varias especies (D84)
    // Sin tope: con el catálogo real (76) la lista completa se recorre con desplazamiento (D87)
    const coinciden = SRP.ref.deTipo('especie', true)
      .map(e => ({ e, por: q ? SRP.ref.especieCoincide(e, q) : true }))
      .filter(x => x.por);
    const lista = this.el('lista-especies');
    lista.innerHTML = coinciden.map(({ e, por }) =>
      '<li class="combo-opcion" role="option" id="op-' + e.id + '" data-id="' + e.id + '" aria-selected="false">' +
      SRP.util.escapar(e.nombre) + '<small>' + SRP.util.escapar(e.nombre_cientifico) +
      (typeof por === 'string' ? ' · también: ' + SRP.util.escapar(por) : '') + '</small></li>').join('') +
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
    // La zona de carga dice si va a poner la primera foto o a reemplazar la que hay; con foto
    // se reduce a un renglón, porque lo importante ya es la ficha de la foto (D98)
    this.el('texto-foto').textContent = datos ? 'Cambiar fotografía' : 'Agregar fotografía';
    this.el('etq-foto').classList.toggle('con-foto', !!datos);
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
    // La fecha viene de la jornada (D119); sólo se comprueba que exista
    const f = this.el('campo-fecha').value;
    if (!f) errores.push(['campo-fecha', 'No hay jornada activa: inicie una antes de registrar.']);
    else if (f > SRP.util.fechaHoy()) errores.push(['campo-fecha', 'La fecha de la jornada no puede ser posterior a hoy.']);
    return errores;
  },

  mostrarErrores(errores) {
    ['campo-especie', 'campo-otra-especie', 'campo-programa', 'campo-fecha'].forEach(id => this.el(id).removeAttribute('aria-invalid'));
    const caja = this.el('resumen-errores');
    if (!errores.length) { caja.hidden = true; this.pintarProgramas(); return; }
    errores.forEach(([id]) => { if (id !== 'btn-ubicacion') this.el(id).setAttribute('aria-invalid', 'true'); });
    this.pintarProgramas();
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

  /* Al tocar «Guardar» (D130): con errores se señalan; con algo que revisar (precisión que no es
     buena, especie fuera del catálogo, posible duplicado, árbol lejos de la jornada) o en edición,
     se abre la ficha con esos avisos arriba; si no, se guarda de una vez. */
  async enviarFormulario() {
    const errores = this.validar();
    this.mostrarErrores(errores);
    if (errores.length) return;
    // El identificador se fija aquí y es el que se guarda, pase o no por la ficha
    if (!this.estado.editando && !this.estado.idPrevisto) this.estado.idPrevisto = SRP.util.generarId();
    const avisos = await this.avisos(this.valores());
    if (avisos.length || this.estado.editando) { await this.revisar(avisos); return; }
    await this.guardar();
  },

  /* Lo que amerita mirar la ficha antes de guardar. Devuelve [{ tipo, texto }]. La fotografía es
     opcional y nunca avisa (decisión de Liber, D130). */
  async avisos(v) {
    const salida = [];
    if (v.punto_origen === 'gps' && v.gps_precision_m != null) {
      const n = SRP.mapa.nivelPrecision(v.gps_precision_m);
      if (n.nivel !== 'buena') salida.push({ tipo: 'precision', texto: n.texto + ' (±' + Math.round(v.gps_precision_m) + ' m): revise en el mapa que el punto esté en el árbol.' });
    }
    if (this.estado.especieId === this.OTRA) salida.push({ tipo: 'especie', texto: 'Especie fuera del catálogo: «' + v.especie_otra + '». Confirme que no esté en la lista con otro nombre.' });
    const j = this.estado.editando ? (this.estado.jornadaEditando || null) : SRP.activa.jornada;
    if (j) {
      const id = this.estado.editando ? this.estado.editando.id : null;
      const regs = (await SRP.activa.registrosDe(j)).filter(r => r.id !== id);
      if (regs.length) {
        const cfg = SRP.CONFIG.JORNADA;
        const dist = regs.map(r => ({ r, d: SRP.jornadas.distancia({ lat: v.lat, lng: v.lng }, r) }));
        const cerca = dist.filter(x => x.d < cfg.DUPLICADO_M).sort((a, b) => a.d - b.d)[0];
        if (cerca) salida.push({ tipo: 'duplicado', texto: 'Posible duplicado: a ' + cerca.d.toFixed(1) + ' m de ' + SRP.ref.especieDe(cerca.r).comun + ' (' + SRP.folio.texto(cerca.r) + '). Si es otro árbol, guarde; si es el mismo, cancele.' });
        const min = Math.min(...dist.map(x => x.d));
        if (min > cfg.SEPARAR_M) salida.push({ tipo: 'lejos', texto: 'Queda a ' + (min >= 1000 ? (min / 1000).toFixed(1) + ' km' : Math.round(min) + ' m') + ' de los demás árboles de la jornada «' + j.nombre + '». Si es de otro sitio, cancele y cambie de jornada.' });
      }
    }
    return salida;
  },

  async revisar(avisos) {
    avisos = avisos || [];
    const cajaAvisos = this.el('revision-avisos');
    cajaAvisos.hidden = !avisos.length;
    cajaAvisos.innerHTML = avisos.length ? '<p class="revision-avisos-titulo">' + (avisos.length === 1 ? 'Hay algo que revisar' : 'Hay ' + avisos.length + ' cosas que revisar') + '</p><ul>' +
      avisos.map(a => '<li data-tipo="' + a.tipo + '">' + SRP.util.escapar(a.texto) + '</li>').join('') + '</ul>' : '';

    // El identificador se fija aquí y es el que se guarda: así la ficha muestra el real.
    if (!this.estado.idPrevisto) this.estado.idPrevisto = SRP.util.generarId();
    const id = this.estado.editando ? this.estado.editando.id : this.estado.idPrevisto;

    const v = this.valores();
    const esp = SRP.ref.especieDe(v);
    const esc = SRP.util.escapar;
    const editando = this.estado.editando;
    const folio = editando && SRP.folio.valido(editando.folio) ? SRP.folio.textoLargo(editando)
      : await (async () => { const f = await SRP.folio.previsto(Object.assign({ id }, v)); return f ? f + ' (simulado)' : SRP.folio.PROVISIONAL; })();

    // Orden del formulario: primero lo que el cabo revisa; los datos que pone el sistema, al final
    // y en chico (D99). La ubicación no se teclea: se corrige volviendo a colocar el punto.
    const filas = [
      // Nombre común, científico y tipo de distribución del catálogo (D123)
      ['Especie', esc(esp.comun) + (esp.cientifico ? ' <i>(' + esc(esp.cientifico) + ')</i>' : '') +
        (esp.distribucion ? '<span class="revision-distribucion">' + esc(esp.distribucion) + '</span>' : ''), 'especie'],
      ['Programa', esc(SRP.ref.nombreCatalogo(v.programa_id)), 'programa'],
      ['Jornada', esc(this.nombreJornada()) + ' · ' + esc(SRP.util.formatearFecha(v.fecha_plantacion)), null],
      ['Alcaldía', esc(SRP.ref.alcaldia(v.alcaldia)), null],
      ['Colonia', esc(SRP.ref.colonia(v.colonia)), null],
      ['Coordenadas', v.lat.toFixed(6) + ', ' + v.lng.toFixed(6), 'punto'],
      ['Cómo se obtuvo', this.textoOrigenRevision(v), null],
      ['Comentarios', v.comentarios ? esc(v.comentarios) : 'Sin comentarios', 'comentarios'],
      ['Fotografía', v.foto_base64
        ? '<img class="revision-foto" src="' + v.foto_base64 + '" alt="Fotografía del árbol que se va a registrar">'
        : 'Sin fotografía', 'foto'],
      // El folio va a la vista, bajo la fotografía (D123), y con datos de prueba se enseña el que
      // tocará (D126); el identificador interno ya no se muestra
      ['Folio', '<span class="folio-provisional">' + esc(folio) + '</span>', null],
      ['Cabo', esc(this.nombreCabo()), null]
    ];

    this.el('revision-lista').innerHTML = filas.map(([etiqueta, valor, campo]) => {
      const boton = campo
        ? '<button type="button" class="btn btn-texto-editar btn-chico" data-campo="' + campo + '" ' +
          'aria-label="Editar ' + etiqueta.toLowerCase() + '">' + SRP.ICONOS.svg('lapiz', 16) + '<span>Editar</span></button>'
        : '<span></span>';
      return '<div class="revision-fila"><dt>' + etiqueta + '</dt><dd>' + valor + '</dd>' + boton + '</div>';
    }).join('');

    this.el('dlg-resumen').showModal();
    this.dibujarMapaRevision(v.lat, v.lng);
  },

  /* «Cómo se obtuvo» con la misma insignia de precisión que bajo el mapa (D99): la ficha es el
     último momento para notar un punto impreciso. Con precisión baja o aceptable se dice qué
     hacer; es aviso, no impide guardar. */
  textoOrigenRevision(v, conConsejo = true) {
    const esc = SRP.util.escapar;
    if (v.punto_origen !== 'gps' || v.gps_precision_m == null) return esc(SRP.mapa.textoOrigen(v.punto_origen, v.gps_precision_m));
    const n = SRP.mapa.nivelPrecision(v.gps_precision_m);
    return 'GPS del dispositivo<br><span class="precision" data-nivel="' + n.nivel + '"><span class="precision-punto" aria-hidden="true"></span>' +
      n.texto + ' · ±' + Math.round(v.gps_precision_m) + ' m</span>' +
      (n.nivel === 'buena' || !conConsejo ? '' : '<span class="precision-consejo">Revise el punto; puede corregirlo con «Editar» en Coordenadas.</span>');
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
    this.enfocar(destino);
    if (destino === 'campo-especie') this.el(destino).select();
  },

  /* ---------- Guardar ---------- */

  /* EL REGISTRO TAL COMO QUEDARÍA EN LA BASE, en un solo lugar. Lo arma guardar() y lo lee el
     espejo de campos: así lo que el espejo enseña no puede desfasarse de lo que de verdad se
     escribe, que es justo el error que un panel de control visual haría fácil cometer. */
  // La jornada del registro: la activa al crear, la propia al editar (D119)
  jornadaId() {
    return this.estado.editando ? (this.estado.editando.jornada_id || null) : (SRP.activa.jornada ? SRP.activa.jornada.id : null);
  },

  nombreJornada() {
    const j = this.estado.editando ? this.estado.jornadaEditando : SRP.activa.jornada;
    return j ? j.nombre : 'Sin jornada';
  },

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
      folio: null, folio_uga: null, folio_capa_version: null, folio_lat: null, folio_lng: null,
      jornada_id: this.jornadaId()   // la jornada declarada antes de registrar (D119)
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
        // Si se llegó desde la revisión de una jornada, se vuelve a ella (D112)
        SRP.app.mostrarVista(SRP.jornadas.volverAlDetalle ? 'jornadas' : 'registros');
        if (SRP.envio.simulado()) {
          // Un registro enviado y luego editado vuelve a la cola (D111)
          SRP.envio.marcarCambios(nuevo.id);
          const res = await SRP.envio.enviar({ silencioso: true });
          SRP.util.anunciar(res && res.enviados ? 'Cambios guardados y enviados al servidor (simulado).'
            : 'Cambios guardados en el teléfono. Se enviarán solos cuando haya señal.');
        } else {
          SRP.util.anunciar('Cambios guardados.');
        }
      } else {
        const nuevo = this.registroPrevisto(ahora);
        if (!nuevo.jornada_id) { SRP.util.anunciar('No hay jornada activa. Inicie una antes de guardar.', 'alerta'); return; }
        // La distancia a los demás de la jornada ya se avisó en la ficha (D130, supera la pregunta de D119)
        await SRP.almacen.guardarConBitacora('plantaciones', nuevo, SRP.bitacora.entrada('CREADO', 'plantacion', nuevo.id));
        if (this.el('dlg-resumen').open) this.el('dlg-resumen').close();
        this.mostrarGuardado(nuevo);
        await SRP.activa.preparar();   // la franja cuenta el árbol nuevo (D119) y repinta programa y especies recientes
        // Con datos de prueba, el registro sale en seguida si hay señal (D111) y recibe folio (D110)
        if (SRP.envio.simulado()) await this.enviarTrasGuardar(nuevo.id);
      }
    } catch (err) {
      SRP.util.anunciar('No se pudo guardar: ' + err.message + '. Sus datos siguen en pantalla; intente de nuevo.', 'alerta');
    } finally {
      boton.disabled = false;
    }
  },

  /* ---------- Después de guardar ---------- */

  /* En campo se registran muchos árboles seguidos (D130): al guardar, el formulario queda en
     blanco y listo, y arriba una franja dice qué acaba de quedar registrado —especie, folio,
     lugar y envío— con «Corregir» (abre ese registro en edición) y «Ver». Sin modal. */
  mostrarGuardado(registro) {
    const esp = SRP.ref.especieDe(registro);
    const esc = SRP.util.escapar;
    this.estado.ultimoGuardado = registro.id;
    const lugar = [registro.alcaldia || '', registro.colonia ? 'Col. ' + registro.colonia : ''].filter(Boolean).join(' · ');
    this.el('franja-guardado-texto').innerHTML = SRP.ICONOS.svg('palomita', 18) +
      '<span class="franja-guardado-cuerpo"><strong>Guardado: ' + esc(esp.comun) + '</strong>' +
      '<span class="franja-guardado-datos"><span id="franja-guardado-folio" class="folio-provisional">' + esc(SRP.folio.textoLargo(registro)) + '</span>' +
      (lugar ? ' · ' + esc(lugar) : '') + ' · <span id="franja-guardado-envio">' + (SRP.envio.simulado() ? 'guardado en el teléfono' : 'guardado en este dispositivo') + '</span></span></span>';
    const f = this.el('franja-guardado');
    f.dataset.envio = ''; f.hidden = false;
    this.limpiar();
    SRP.mapa.refrescar();
    this.el('btn-ubicacion').scrollIntoView({ block: 'center' });
    this.el('btn-ubicacion').focus({ preventScroll: true });
    SRP.util.anunciarSilencioso('Guardado: ' + esp.comun + '. Listo para el siguiente árbol.');
  },

  /* Lo que dice «Registro guardado» con el envío simulado (D111): «Enviando…» mientras sale, y
     luego enviado con su hora de recepción, o guardado en el teléfono y cuántos esperan. */
  async enviarTrasGuardar(id) {
    const franja = this.el('franja-guardado');
    const envio = SRP.envio;
    const pinta = (estado, texto) => { if (this.estado.ultimoGuardado !== id) return; franja.dataset.envio = estado; const e = this.el('franja-guardado-envio'); if (e) e.textContent = texto; };
    if (SRP.conexion.enLinea()) pinta('enviando', 'enviando…');
    await envio.enviar({ silencioso: true });
    const r = await SRP.almacen.uno('plantaciones', id);
    if (!r) return;
    const e = envio.leer();
    if (envio.estado(r, e) === 'recibido') {
      if (this.estado.ultimoGuardado === id) { const f = this.el('franja-guardado-folio'); if (f) f.textContent = SRP.folio.textoLargo(r); }
      pinta('recibido', 'enviado ' + envio.cuando(e.recibidos[r.id]));
    } else {
      const pend = await envio.pendientesPropios();
      const n = pend ? pend.length : 1;
      pinta('por_enviar', 'sin señal: se enviará solo' + (n > 1 ? ' (' + n + ' por enviar)' : ''));
    }
  },

  /* El formulario arranca en blanco en cada registro. Antes conservaba programa, fecha y
     ubicación porque los árboles de una jornada suelen compartirlos; en campo eso se convierte
     en el dato del árbol anterior guardado sin que nadie lo note, y la coordenada heredada es
     el peor de los casos: se ve bien y está mal. Se prefiere volver a capturar. */
  /* ---------- Edición ---------- */
  editar(registro) {
    this.limpiar();
    this.estado.editando = registro;
    this.estado.jornadaEditando = null;
    if (registro.jornada_id) SRP.almacen.uno('jornadas', registro.jornada_id).then(j => { this.estado.jornadaEditando = j || null; });
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
    this.pintarProgramas();
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
