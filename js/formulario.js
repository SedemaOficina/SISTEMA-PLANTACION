/* FORMULARIO DE PLANTACIÓN: alta y edición comparten la misma pantalla y las mismas reglas. */
window.SRP = window.SRP || {};

SRP.formulario = {
  OTRA: '__otra__',
  estado: { especieId: null, foto: null, fotoId: null, fotoNombre: '', fotoBytes: 0,
            territorio: null, editando: null, idPrevisto: null, ultimoGuardado: null, sustitucion: null },

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
    SRP.util.coordenadas.enlazar(this.el('coord-lat'), this.el('coord-lng'));   // D170
    this.iniciarCombo();
    // Los enlaces del resumen de errores llevan al control que se ve, aunque el dato viva en otro
    this.el('resumen-errores').addEventListener('click', (e) => {
      const a = e.target.closest('a[href^="#"]'); if (!a) return;
      e.preventDefault();
      this.enfocar(a.getAttribute('href').slice(1));
    });
    this.el('foto-archivo').addEventListener('change', (e) => this.cargarFoto(e.target));
    this.el('btn-foto-quitar').innerHTML = SRP.ICONOS.svg('basura', 'medio');
    this.el('icono-foto').innerHTML = SRP.ICONOS.svg('camara', 'grande');
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
    this.el('btn-revisar').innerHTML = SRP.ICONOS.svg('disco', 'grande') + '<span>Guardar</span>';
    this.el('btn-guardado-corregir').innerHTML = SRP.ICONOS.svg('lapiz', 'chico') + '<span>Corregir</span>';
    this.el('btn-guardado-ver').innerHTML = SRP.ICONOS.svg('ver', 'chico') + '<span>Ver</span>';
    this.el('btn-guardado-cerrar').innerHTML = SRP.ICONOS.svg('cerrar', 'medio');
    this.el('btn-guardado-cerrar').addEventListener('click', () => { this.el('franja-guardado').hidden = true; });
    this.el('btn-guardado-corregir').addEventListener('click', async () => {
      const r = this.estado.ultimoGuardado && await SRP.almacen.uno('plantaciones', this.estado.ultimoGuardado);
      if (r) { this.el('franja-guardado').hidden = true; this.editar(r); }
    });
    this.el('btn-guardado-ver').addEventListener('click', async () => {
      const r = this.estado.ultimoGuardado && await SRP.almacen.uno('plantaciones', this.estado.ultimoGuardado);
      if (r) SRP.registros.verDetalle(r);
    });
    /* ATAJO DE TECLADO (D142): Ctrl+Enter (⌘+Enter en Mac) guarda, o confirma la ficha de revisión si
       está abierta. No se anuncia en pantalla ni hay atajos numéricos (D145): queda
       sólo en aria-keyshortcuts del botón. Enter solo no guarda: se evitó a propósito en la ficha. */
    document.addEventListener('keydown', (e) => {
      if (e.key !== 'Enter' || !(e.ctrlKey || e.metaKey) || SRP.app.vista !== 'registrar') return;
      if (this.el('dlg-resumen').open) { e.preventDefault(); this.el('btn-resumen-guardar').click(); return; }
      if (document.querySelector('dialog[open]') || this.el('registrar-columnas').hidden) return;
      e.preventDefault();
      this.el('form-plantacion').requestSubmit();
    });
    this.el('especies-recientes').addEventListener('click', (e) => {
      const b = e.target.closest('.chip'); if (!b) return;
      if (b.dataset.otra) this.elegirEspecie(this.OTRA, b.dataset.otra); else this.elegirEspecie(b.dataset.id);
      SRP.util.quitarErrorCampo(this.el('campo-especie'));
      this.pintarEspeciesRecientes();
      if (SRP.espejo) SRP.espejo.refrescar();
    });
    /* La fecha de plantación elegida en una jornada de varios días se conserva para el árbol siguiente
       de esa jornada: se suelen capturar varios del mismo día. Está a la vista, sobre el botón Guardar. */
    const fecha = this.el('campo-fecha');
    fecha.addEventListener('change', () => {
      SRP.util.quitarErrorCampo(fecha);
      if (!this.estado.editando && !this.estado.sustitucion && SRP.activa.jornada && fecha.value) SRP.activa.fechaElegida = { id: SRP.activa.jornada.id, fecha: fecha.value };
      if (SRP.espejo) SRP.espejo.refrescar();
    });
    this.el('btn-fecha-hoy').addEventListener('click', () => { fecha.value = SRP.util.fechaHoy(); fecha.dispatchEvent(new Event('change', { bubbles: true })); });
    this.el('btn-resumen-guardar').innerHTML = SRP.ICONOS.svg('disco') + '<span>Guardar</span>';
    this.el('btn-resumen-cerrar').innerHTML = SRP.ICONOS.svg('cerrar', 'grande');
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
    // El árbol queda en el formulario: tras cambiar de jornada se guarda en la que corresponde
    this.el('btn-resumen-cambiar').innerHTML = SRP.ICONOS.svg('intercambio', 'medio') + '<span>Cambiar jornada</span>';
    this.el('btn-resumen-cambiar').addEventListener('click', () => { this.el('dlg-resumen').close(); this.el('btn-jornada-cambiar').click(); });
    this.el('btn-cancelar-edicion').addEventListener('click', async () => {
      const cerrada = await this.cerrarReabierta();
      this.limpiar();
      SRP.app.mostrarVista(SRP.jornadas.volverAlDetalle ? 'jornadas' : 'registros');
      if (cerrada) SRP.util.anunciar('Sustitución cancelada. La jornada volvió a cerrarse.', 'aviso');
    });
    // Lo que se escribe en el árbol a medias se guarda como borrador
    ['campo-comentarios', 'campo-otra-especie', 'campo-fecha'].forEach(id => {
      this.el(id).addEventListener('input', () => this.guardarBorrador());
      this.el(id).addEventListener('change', () => this.guardarBorrador());
    });
  },

  /* ---------- Borrador del árbol a medias ---------- */

  /* EL ÁRBOL A MEDIAS NO SE PIERDE. Lo capturado y aún no guardado —punto, especie, comentarios,
     fecha y fotografía— se copia en este teléfono cada vez que cambia. Si la página se recarga, se
     cierra o el teléfono la descarga de la memoria al abrir la cámara, al volver a «Nuevo registro»
     con la misma cuenta y la misma jornada el árbol reaparece como estaba. Se borra al guardar el
     árbol o al descartarlo. No aplica a ediciones ni a sustituciones. */
  CLAVE_BORRADOR: 'srp_borrador_arbol',

  guardarBorrador() {
    const u = SRP.sesion.usuario, j = SRP.activa && SRP.activa.jornada;
    if (this.estado.pausaBorrador || this.estado.editando || this.estado.sustitucion || !u || !j) return;
    try {
      if (!this.aMedias()) { localStorage.removeItem(this.CLAVE_BORRADOR); return; }
      const otra = this.estado.especieId === this.OTRA;
      const b = { usuario: u.id, jornada: j.id, cuando: SRP.util.ahoraISO(),
        lat: SRP.mapa.lat, lng: SRP.mapa.lng, origen: SRP.mapa.origen, precision: SRP.mapa.precision,
        especie: this.estado.especieId, otra: otra ? this.el('campo-otra-especie').value : '',
        comentarios: this.el('campo-comentarios').value, fecha: this.el('campo-fecha').value,
        foto: this.estado.foto, fotoId: this.estado.fotoId, fotoNombre: this.estado.fotoNombre };
      try { localStorage.setItem(this.CLAVE_BORRADOR, JSON.stringify(b)); }
      catch (e) {
        // Sin espacio para la fotografía: se guarda lo demás
        localStorage.setItem(this.CLAVE_BORRADOR, JSON.stringify(Object.assign(b, { foto: null, fotoId: null, fotoNombre: '' })));
      }
    } catch (e) { /* almacenamiento bloqueado: se sigue sin borrador */ }
  },

  quitarBorrador() {
    try { localStorage.removeItem(this.CLAVE_BORRADOR); } catch (e) { /* nada que borrar */ }
  },

  // Devuelve si se recuperó algo. Sólo con el formulario en blanco, la misma cuenta y la misma jornada
  recuperarBorrador() {
    const u = SRP.sesion.usuario, j = SRP.activa && SRP.activa.jornada;
    if (this.estado.editando || this.estado.sustitucion || !u || !j || this.aMedias()) return false;
    let b = null;
    try { b = JSON.parse(localStorage.getItem(this.CLAVE_BORRADOR) || 'null'); } catch (e) { b = null; }
    if (!b || b.usuario !== u.id || b.jornada !== j.id) return false;
    this.estado.pausaBorrador = true;
    try {
      if (typeof b.lat === 'number' && typeof b.lng === 'number') SRP.mapa.colocar(b.lat, b.lng, 'Punto recuperado.', { origen: b.origen || 'manual', precision: b.precision, centrar: true });
      const esOtra = b.especie === this.OTRA;
      if (b.especie && (esOtra || SRP.ref.catalogoPorId[b.especie])) this.elegirEspecie(b.especie, esOtra ? (b.otra || ' ') : undefined);
      if (esOtra) this.el('campo-otra-especie').value = b.otra || '';
      this.el('campo-comentarios').value = b.comentarios || '';
      const campo = this.el('campo-fecha');
      if (b.fecha && !this.el('caja-fecha-arbol').hidden && (!campo.min || b.fecha >= campo.min) && b.fecha <= SRP.util.fechaHoy()) campo.value = b.fecha;
      if (b.foto && SRP.util.fotoSegura(b.foto)) this.ponerFoto(b.foto, b.fotoId || SRP.util.generarId(), b.fotoNombre);
      SRP.util.refrescarContadores(this.el('form-plantacion'));
    } finally { this.estado.pausaBorrador = false; }
    if (!this.aMedias()) { this.quitarBorrador(); return false; }
    SRP.util.anunciar('Se recuperó el árbol que estaba a medias. Revíselo y guárdelo, o descártelo al cambiar de sección.', 'aviso');
    return true;
  },

  // Se llama cada vez que se entra a la vista Registrar
  preparar() {
    if (!this.estado.editando && SRP.mapa.lat === null) {
      SRP.mapa.estado(SRP.mapa.GUIA_SIN_PUNTO);
    }
    this.el('campo-fecha').max = SRP.util.fechaHoy();
    // Sin jornada abierta, en lugar del formulario se pide iniciarla (D119)
    SRP.activa.preparar().then(() => { if (SRP.espejo) SRP.espejo.refrescar(); });
    SRP.mapa.refrescar();
    if (SRP.espejo) SRP.espejo.refrescar();
  },

  /* Las últimas especies de la jornada activa, a un toque (D130): hasta tres, la más reciente
     primero; «Otra especie» no se ofrece porque cada una es distinta. Al sustituir, el primero es «La
     misma»: la especie del árbol perdido, también si era una especie escrita. */
  async pintarEspeciesRecientes() {
    const caja = this.el('especies-recientes');
    const j = this.estado.editando ? null : SRP.activa.jornada;
    const regs = j ? (await SRP.activa.registrosDe(j)).filter(r => r.especie_id).sort((a, b) => String(b.fecha_registro).localeCompare(String(a.fecha_registro))) : [];
    const s = this.estado.sustitucion, esc = SRP.util.escapar;
    const misma = s ? (s.original.especie_id || this.OTRA) : null;
    const ids = [...new Set(regs.map(r => r.especie_id))].filter(id => id !== misma).slice(0, misma ? 2 : 3);
    const otra = s && !s.original.especie_id ? s.original.especie_otra : '';
    const elegida = misma && this.estado.especieId === misma && (misma !== this.OTRA || this.el('campo-otra-especie').value === otra);
    caja.hidden = !ids.length && !misma;
    caja.innerHTML = (misma ? '<button type="button" class="chip chip-misma" data-id="' + esc(misma) + '"' + (otra ? ' data-otra="' + esc(otra) + '"' : '') +
      ' aria-pressed="' + elegida + '">La misma: ' + esc(otra || (SRP.ref.catalogoPorId[misma] || {}).nombre || misma) + '</button>' : '') +
      ids.map(id => '<button type="button" class="chip" data-id="' + esc(id) + '" aria-pressed="' + (this.estado.especieId === id) + '">' +
      esc((SRP.ref.catalogoPorId[id] || {}).nombre || id) + '</button>').join('');
  },

  /* EL PROGRAMA ES DE LA JORNADA (D151, supera a D130 y D132). Se elige al iniciarla y sus árboles lo
     toman siempre, como la fecha: si cambia el de la jornada, cambia el de todos, y un árbol movido
     toma el de su jornada nueva. Un árbol de otro programa va en otra jornada. Por eso el formulario
     ya no tiene campo de programa. */
  programaDeJornada() {
    const j = this.estado.editando ? this.estado.jornadaEditando : SRP.activa.jornada;
    return (j && j.programa_id) || (this.estado.editando ? this.estado.editando.programa_id : '') || '';
  },

  // Lleva el foco al control que la persona ve para ese dato
  enfocar(id) {
    let el = this.el(id); if (!el) return;
    el.scrollIntoView({ block: 'center' });
    el.focus();
  },

  alMoverPunto(lat, lng) {
    const t = SRP.derivacion.derivar(lat, lng);
    this.estado.territorio = t;
    this.mostrarPunto(lat, lng, t);
    // Junto al límite de la ciudad (D152): el punto cayó fuera, dentro del margen, y toma la
    // alcaldía más cercana. Se dice en su renglón, sin tapar la precisión
    SRP.mapa.aviso('territorio', t.fuera_m ? 'El punto cae a ' + t.fuera_m + ' m fuera del límite de la Ciudad de México; se registra en ' +
      t.alcaldia + ', la alcaldía más cercana. Revise que el árbol esté dentro de la ciudad.' : null);
    // La captura a mano refleja el punto vigente: quien la abra corrige sobre lo que ya hay
    this.el('coord-lat').value = lat.toFixed(6);
    this.el('coord-lng').value = SRP.util.coordenadas.mostrarLongitud(lng);   // el «−» ya está a la vista (D170)
    this.guardarBorrador();
  },

  /* Los tres campos de sólo lectura del punto, en un solo lugar: sin territorio, los tres
     vuelven al guion, porque un dato viejo junto a un punto nuevo es peor que ninguno. */
  mostrarPunto(lat, lng, t) {
    // Sin punto no hay datos que enseñar: la ficha aparece cuando el punto existe
    this.el('campo-punto').hidden = !(t && lat !== null);
    this.el('dato-coordenadas').textContent = (t && lat !== null) ? lat.toFixed(5) + ', ' + lng.toFixed(5) : '—';   // cinco decimales (~1 m) se leen; se guardan seis (D152)
    this.el('dato-origen').textContent = t ? SRP.mapa.textoOrigen(SRP.mapa.origen, SRP.mapa.precision) : '—';
    this.el('dato-alcaldia').textContent = t ? SRP.ref.alcaldia(t.alcaldia) : '—';
    this.el('dato-colonia').textContent = t ? SRP.ref.colonia(t.colonia) : '—';
    if (SRP.espejo) SRP.espejo.refrescar();
  },

  aplicarCoordenadasManuales() {
    const C = SRP.util.coordenadas;
    C.repartir(this.el('coord-lat'), this.el('coord-lng'));
    const lat = C.latitud(this.el('coord-lat').value);
    const lng = C.longitud(this.el('coord-lng').value);   // negativa con o sin signo (D170)
    if (Number.isNaN(lat) || Number.isNaN(lng)) {
      SRP.mapa.estado('Escriba la latitud y la longitud, por ejemplo 19.4326 y 99.1332, o pegue las dos juntas.', 'alerta');
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
    clearTimeout(this._tEspacio);
    this._tEspacio = setTimeout(() => {
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
    // Sin tope: con el catálogo real (79) la lista completa se recorre con desplazamiento (D87)
    const coinciden = SRP.ref.deTipo('especie', true)
      .map(e => ({ e, por: q ? SRP.ref.especieCoincide(e, q) : true }))
      .filter(x => x.por);
    const lista = this.el('lista-especies');
    lista.innerHTML = coinciden.map(({ e, por }) =>
      '<li class="combo-opcion" role="option" id="op-' + e.id + '" data-id="' + SRP.util.escapar(e.id) + '" aria-selected="false">' +
      SRP.util.escapar(e.nombre) + '<small>' + SRP.util.escapar(e.nombre_cientifico) +
      (typeof por === 'string' ? ' · también: ' + SRP.util.escapar(por) : '') +
      // Sólo informa: una especie fuera de la paleta vegetal se registra igual
      (e.paleta_vegetal === 'No' ? ' · Fuera de la paleta vegetal' : '') + '</small></li>').join('') +
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
    this.guardarBorrador();
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
    this.guardarBorrador();
  },

  /* ---------- Validación y resumen ---------- */
  validar() {
    const errores = [];
    if (SRP.mapa.lat === null) errores.push(['btn-ubicacion', 'Falta la ubicación: use el botón de ubicación, toque el mapa o capture coordenadas.']);
    if (!this.estado.especieId) errores.push(['campo-especie', 'Elija una especie de la lista o la opción «Otra especie».']);
    if (this.estado.especieId === this.OTRA && !this.el('campo-otra-especie').value.trim())
      errores.push(['campo-otra-especie', 'Escriba qué especie es.']);
    if (this.el('campo-fecha').value && !this.programaDeJornada()) errores.push(['campo-fecha', 'La jornada no tiene programa: elíjalo en Jornadas › Editar jornada.']);
    // La fecha de plantación: entre el inicio de la jornada (el mínimo del campo) y hoy
    const campo = this.el('campo-fecha'), f = campo.value;
    if (!f) errores.push(['campo-fecha', SRP.activa.jornada || this.estado.editando ? 'Indique la fecha de plantación.' : 'No hay jornada activa: inicie una antes de registrar.']);
    else if (f > SRP.util.fechaHoy()) errores.push(['campo-fecha', 'La fecha de plantación no puede ser posterior a hoy.']);
    else if (campo.min && f < campo.min) errores.push(['campo-fecha', 'La fecha de plantación no puede ser anterior al inicio de la jornada (' + SRP.util.formatearFecha(campo.min) + ').']);
    return errores;
  },

  mostrarErrores(errores) {
    // Cada campo dice su error debajo (D140); el resumen de arriba se conserva (M15)
    SRP.util.resumenErrores(this.el('resumen-errores'), errores, ['btn-ubicacion', 'campo-especie', 'campo-otra-especie', 'campo-fecha']);
    // Un error en la fecha se ve aunque el campo estuviera escondido
    if (errores.some(e => e[0] === 'campo-fecha')) this.el('caja-fecha-arbol').hidden = false;
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
      uga: t.uga || null, uga_borde_m: t.uga_borde_m == null ? null : t.uga_borde_m, capa_version: t.capa_version || null,
      especie_id: otra ? null : this.estado.especieId,
      especie_otra: otra ? this.el('campo-otra-especie').value.trim() : '',
      programa_id: this.programaDeJornada(),   // el de la jornada (D151)
      fecha_plantacion: this.el('campo-fecha').value,
      comentarios: this.el('campo-comentarios').value.trim(),
      foto_base64: this.estado.foto, foto_id: this.estado.fotoId
    };
  },

  // Lo que se perdería al descartar un árbol a medias, en palabras. Cuenta también lo escrito sin
  // terminar: una especie tecleada sin elegirla de la lista o coordenadas sin aplicar.
  resumenAMedias() {
    const t = (id) => this.el(id).value.trim();
    const especie = t('campo-especie') || t('campo-otra-especie');
    return [SRP.mapa.lat !== null ? 'La ubicación registrada.' : (t('coord-lat') || t('coord-lng') ? 'Las coordenadas escritas.' : ''),
      especie ? 'La especie: ' + especie + '.' : '',
      this.estado.foto ? 'La fotografía.' : '', t('campo-comentarios') ? 'Los comentarios.' : ''].filter(Boolean);
  },

  // Hay un árbol a medias si hay algo capturado o escrito y no es una edición
  aMedias() {
    if (this.estado.editando) return false;
    return this.resumenAMedias().length > 0;
  },

  /* Al tocar «Guardar» (D130): con errores se señalan; con algo que revisar (precisión que no es
     buena, especie fuera del catálogo, posible duplicado, árbol lejos de la jornada) o en edición,
     se abre la ficha con esos avisos arriba; si no, se guarda de una vez. */
  async enviarFormulario() {
    SRP.mapa.detenerAfinado();   // lo que se revisa y se guarda es el punto de este momento (D152)
    const errores = this.validar();
    this.mostrarErrores(errores);
    if (errores.length) return;
    // Doble toque en Guardar (D136): un guardado con GPS de por medio tarda un instante, y un
    // segundo toque antes de que el primero termine no debe crear dos árboles ni dos avisos.
    const boton = this.el('btn-revisar');
    if (boton.disabled) return;
    const libre = SRP.util.ocupado(boton, 'Guardando…', 'disco', 'grande');   // M15
    try {
      // Una jornada que no es de hoy se confirma antes de guardar en ella (D133)
      if (!this.estado.editando && !(await SRP.activa.confirmarOtroDia())) return;
      // Con los árboles previstos ya registrados, uno más se confirma, una vez por jornada
      if (!this.estado.editando && !(await SRP.activa.confirmarExceso())) return;
      // El identificador se fija aquí y es el que se guarda, pase o no por la ficha
      if (!this.estado.editando && !this.estado.idPrevisto) this.estado.idPrevisto = SRP.util.generarId();
      const avisos = await this.avisos(this.valores());
      // Con avisos (o al editar) se abre la ficha de revisión: ahí manda su propio botón
      // «btn-resumen-guardar», así que éste vuelve a su estado normal antes de esperar la ficha.
      if (avisos.length || this.estado.editando) {
        libre();
        await this.revisar(avisos);
        return;
      }
      await this.guardar();
    } finally {
      libre();
    }
  },

  /* Lo que amerita mirar la ficha antes de guardar. Devuelve [{ tipo, texto }]. La fotografía es
     opcional y nunca avisa (D130). */
  async avisos(v) {
    const salida = [];
    if (v.punto_origen === 'gps' && v.gps_precision_m != null) {
      const n = SRP.mapa.nivelPrecision(v.gps_precision_m);
      if (n.nivel !== 'buena') salida.push({ tipo: 'precision', texto: n.texto + ' (±' + Math.round(v.gps_precision_m) + ' m): revise en el mapa que el punto esté en el árbol.' });
    }
    if (this.estado.especieId === this.OTRA) salida.push({ tipo: 'especie', texto: 'Especie fuera del catálogo: «' + v.especie_otra + '». Confirme que no esté en la lista con otro nombre.' });
    const j = this.estado.editando ? (this.estado.jornadaEditando || null) : SRP.activa.jornada;
    if (j) {
      const id = this.estado.editando ? this.estado.editando.id : null, orig = this.estado.sustitucion ? this.estado.sustitucion.original.id : null;
      const regs = (await SRP.activa.registrosDe(j)).filter(r => r.id !== id && r.id !== orig);
      if (regs.length) {
        const cfg = SRP.CONFIG.JORNADA;
        const dist = regs.map(r => ({ r, d: SRP.jornadas.distancia({ lat: v.lat, lng: v.lng }, r) }));
        const cerca = dist.filter(x => x.d < cfg.DUPLICADO_M).sort((a, b) => a.d - b.d)[0];
        if (cerca) salida.push({ tipo: 'duplicado', texto: 'Posible duplicado: a ' + cerca.d.toFixed(1) + ' m de ' + SRP.ref.especieDe(cerca.r).comun + ' (' + SRP.folio.texto(cerca.r) + '). Si es otro árbol, guarde; si es el mismo, cancele.' });
        const min = Math.min(...dist.map(x => x.d));
        if (min > cfg.SEPARAR_M) salida.push({ tipo: 'lejos', texto: 'Queda a ' + (min >= 1000 ? (min / 1000).toFixed(1) + ' km' : Math.round(min) + ' m') + ' de los demás árboles de la jornada «' + j.nombre + '». Si es de otro sitio, cambie de jornada.', otros: regs.filter(r => r.lat != null && r.lng != null).map(r => [r.lat, r.lng]) });
      }
    }
    return salida;
  },

  async revisar(avisos) {
    avisos = avisos || [];
    const cajaAvisos = this.el('revision-avisos');
    cajaAvisos.hidden = !avisos.length;
    // Con avisos en un árbol nuevo, guardar es una decisión: el botón lo dice
    this.el('btn-resumen-guardar').innerHTML = SRP.ICONOS.svg('disco') + '<span>' + (this.estado.editando ? 'Guardar cambios' : avisos.length ? 'Guardar de todos modos' : 'Guardar') + '</span>';
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
      : await (async () => { const f = await SRP.folio.previsto(Object.assign({ id }, v)); return f || SRP.folio.PROVISIONAL; })();

    // Orden del formulario: primero lo que el cabo revisa; los datos que pone el sistema, al final
    // y en chico (D99). La ubicación no se teclea: se corrige volviendo a colocar el punto.
    const filas = [
      // Nombre común, científico y tipo de distribución del catálogo (D123)
      ['Especie', esc(esp.comun) + (esp.cientifico ? ' <i>(' + esc(esp.cientifico) + ')</i>' : '') +
        (esp.distribucion ? '<span class="revision-distribucion">' + esc(esp.distribucion) + '</span>' : ''), 'especie'],
      ['Programa', esc(SRP.ref.nombreCatalogo(v.programa_id)), null],
      ['Jornada', esc(this.nombreJornada()), null],
      ['Fecha de plantación', esc(SRP.util.formatearFecha(v.fecha_plantacion)), this.el('caja-fecha-arbol').hidden ? null : 'fecha'],
      ['Alcaldía', esc(SRP.ref.alcaldia(v.alcaldia)), null],
      ['Colonia', esc(SRP.ref.colonia(v.colonia)), null],
      ['Coordenadas', v.lat.toFixed(5) + ', ' + v.lng.toFixed(5), 'punto'],
      ['Cómo se obtuvo', this.textoOrigenRevision(v), null],
      // Sin comentarios, el renglón no sale (D174): «Sin comentarios» sólo alargaba la ficha
      v.comentarios ? ['Comentarios', esc(v.comentarios), 'comentarios'] : null,
      ['Fotografía', SRP.util.fotoSegura(v.foto_base64)
        ? '<img class="revision-foto" src="' + SRP.util.fotoSegura(v.foto_base64) + '" alt="Fotografía del árbol que se va a registrar">'
        : 'Sin fotografía', 'foto'],
      // El folio va a la vista, bajo la fotografía (D123), y con datos de prueba se enseña el que
      // tocará (D126); el identificador interno ya no se muestra
      ['Folio', '<span class="folio-provisional">' + esc(folio) + '</span>' +
        (SRP.folio.celdaIncierta(v) ? '<span class="revision-sub">' + esc(SRP.folio.celdaIncierta(v)) + '</span>' : ''), null],
      ['Cabo', esc(this.nombreCabo()), null]
    ];

    this.el('revision-lista').innerHTML = filas.filter(Boolean).map(([etiqueta, valor, campo]) => {
      const boton = campo
        ? '<button type="button" class="btn btn-texto-editar btn-chico" data-campo="' + campo + '" ' +
          'aria-label="Editar ' + etiqueta.toLowerCase() + '">' + SRP.ICONOS.svg('lapiz', 'chico') + '<span>Editar</span></button>'
        : '<span></span>';
      return '<div class="revision-fila"><dt>' + etiqueta + '</dt><dd>' + valor + '</dd>' + boton + '</div>';
    }).join('');

    this.el('dlg-resumen').showModal();
    this.dibujarMapaRevision(v.lat, v.lng);
    // Un árbol lejos del resto: el mapa enseña también los demás, para ver la distancia, y se ofrece cambiar de jornada
    const lejos = !this.estado.editando ? avisos.find(a => a.tipo === 'lejos') : null;
    this.el('btn-resumen-cambiar').hidden = !lejos;
    if (lejos && this.mapaRevision && lejos.otros.length) {
      lejos.otros.forEach(p => L.circleMarker(p, { radius: 6, className: 'revision-otro', interactive: false }).addTo(this.mapaRevision));
      setTimeout(() => { if (this.mapaRevision) this.mapaRevision.fitBounds(L.latLngBounds(lejos.otros.concat([[v.lat, v.lng]])), { padding: [28, 28], animate: false, maxZoom: SRP.CONFIG.MAPA.ZOOM_PUNTO }); }, 90);
    }
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
    const destino = { especie: 'campo-especie', fecha: 'campo-fecha', comentarios: 'campo-comentarios' }[campo];
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
    const v = this.valores(), s = this.estado.sustitucion;
    const u = SRP.sesion.usuario;
    ahora = ahora || SRP.util.ahoraISO();
    if (this.estado.editando) {
      return Object.assign({}, this.estado.editando, v,
        { fecha_ultima_edicion: ahora, editado_por_id: u ? u.id : null });
    }
    return Object.assign({
      id: this.estado.idPrevisto, estatus: 'activo',
      cabo_id: u ? u.id : null,
      fecha_registro: ahora, fecha_ultima_edicion: null, editado_por_id: null,
      // El folio y lo que se congela con él los pone el servidor al sincronizar (R3, R8); aquí nacen nulos
      folio: null,
      jornada_id: this.jornadaId(),   // la jornada declarada antes de registrar (D119)
      // Sustitución: el sustituto apunta al árbol que reemplaza y guarda por qué; el original, a su sustituto
      sustituye_id: s ? s.original.id : null, motivo_sustitucion: s ? s.motivo : null, motivo_sustitucion_otro: s ? s.otro : '',
      sustituido_por_id: null
    }, v);
  },

  async guardar() {
    // Lo mismo que esconde los botones, exigido aquí (D151)
    if (!(this.estado.editando ? SRP.permisos.exigir('registro.editar', this.estado.editando) : SRP.permisos.exigir('registro.crear'))) return;
    const v = this.valores();
    const u = SRP.sesion.usuario;
    const ahora = SRP.util.ahoraISO();
    const libre = SRP.util.ocupado(this.el('btn-resumen-guardar'), 'Guardando…', 'disco');   // M15
    try {
      if (this.estado.editando) {
        const previo = this.estado.editando;
        const cambiados = ['lat', 'lng', 'punto_origen', 'especie_id', 'especie_otra', 'programa_id', 'fecha_plantacion', 'comentarios', 'foto_id']
          .filter(k => (previo[k] || null) !== (v[k] || null));
        // Al editar se vuelve a derivar el territorio con las capas vigentes: si cambió —porque el
        // punto se movió o porque la capa es otra—, queda en el historial (D152)
        const territorio = ['alcaldia', 'colonia', 'uga', 'capa_version'].filter(k => (previo[k] || null) !== (v[k] || null));
        // Si el punto se movió, el historial guarda de dónde a dónde
        const punto = previo.lat !== v.lat || previo.lng !== v.lng
          ? 'Punto: ' + Number(previo.lat).toFixed(6) + ', ' + Number(previo.lng).toFixed(6) + ' → ' + Number(v.lat).toFixed(6) + ', ' + Number(v.lng).toFixed(6) : '';
        const detalle = [cambiados.length ? 'Campos: ' + cambiados.join(', ') : '', punto,
          territorio.length ? 'Territorio rederivado: ' + territorio.map(k => k === 'capa_version' ? 'capas ' + (v[k] || '—')
            : k + ' ' + (previo[k] || '—') + ' → ' + (v[k] || '—')).join('; ') : ''].filter(Boolean).join('. ');
        const nuevo = this.registroPrevisto(ahora);
        await SRP.almacen.guardarJuntos([{ almacen: 'plantaciones', objeto: nuevo, bitacora: SRP.bitacora.entrada('EDITADO', 'plantacion', nuevo.id, detalle || 'Sin cambios en los datos') }]
          .concat(detalle ? await SRP.reportes.caducar([nuevo.jornada_id], 'se editó un árbol') : []));
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
      } else if (this.estado.sustitucion) {
        await this.guardarSustituto(ahora);
      } else {
        const nuevo = this.registroPrevisto(ahora);
        if (!nuevo.jornada_id) { SRP.util.anunciar('No hay jornada activa. Inicie una antes de guardar.', 'aviso'); return; }
        // Sólo quien tiene la jornada a su cargo registra en ella: si pasó a otro cabo en relevo, ya no
        if (!SRP.permisos.exigir('jornada.registrar', await SRP.almacen.uno('jornadas', nuevo.jornada_id) || {})) { await SRP.activa.preparar(); return; }
        // La distancia a los demás de la jornada ya se avisó en la ficha (D130, supera la pregunta de D119)
        await SRP.almacen.guardarConBitacora('plantaciones', nuevo, SRP.bitacora.entrada('CREADO', 'plantacion', nuevo.id));
        if (this.el('dlg-resumen').open) this.el('dlg-resumen').close();
        // Con este árbol se llega a lo previsto: lo dice la misma confirmación de guardado, no un aviso aparte
        const jornada = SRP.activa.jornada, previstos = jornada ? SRP.jornadas.previstosDe(jornada) : null;
        const llevados = jornada && previstos !== null ? (await SRP.activa.registrosDe(jornada)).length : 0;
        this.mostrarGuardado(nuevo, previstos !== null && llevados === previstos ? previstos : null);
        await SRP.activa.preparar();   // la franja cuenta el árbol nuevo (D119) y repinta programa y especies recientes
        // La franja «Guardado» a la vista, arriba, y el formulario nuevo debajo (D171): antes se centraba
        // el botón de ubicación y en un teléfono chico la franja quedaba fuera. Va después de repintar
        // la franja de la jornada, que cambia de alto
        // Antes se cancela el desplazamiento suave que la lista de especies pudo dejar en curso
        // (darEspacioALista): si no, al terminar se llevaba la franja fuera de la pantalla
        // y se espera a que la página se acomode (la lista de especies se cierra en el mismo instante)
        clearTimeout(this._tEspacio);
        window.scrollTo({ top: window.scrollY, behavior: 'instant' });
        requestAnimationFrame(() => requestAnimationFrame(() => this.el('franja-guardado').scrollIntoView({ block: 'start', behavior: 'instant' })));
        // Con datos de prueba, el registro sale en seguida si hay señal (D111) y recibe folio (D110)
        // El envío corre aparte (D142): el árbol ya quedó en el teléfono y la franja dice «enviando…»;
        // esperarlo dejaba «Guardar» en «Guardando…» hasta que el servidor contestara, frenando el siguiente
        if (SRP.envio.simulado()) this.enviarTrasGuardar(nuevo.id).catch(() => this.pintarEnvio(nuevo.id, 'por_enviar', 'no se pudo enviar: se reintentará solo'));
        // Lo capturado vive sólo en el teléfono: se pide al navegador que no lo borre y se vigila el espacio (D149)
        SRP.almacen.cuidarAlmacenamiento();
      }
    } catch (err) {
      // Lo capturado sigue en pantalla; se dice qué pasó y, si fue el espacio, qué hacer (D149)
      const e = err || new Error('');
      try { e.srpAvisado = true; } catch (x) { /* se avisa igual */ }
      SRP.util.anunciar(SRP.util.mensajeError(e, 'guardar el árbol') + ' Sus datos siguen en pantalla.', 'alerta');
    } finally {
      libre();
    }
  },

  /* ---------- Sustitución ---------- */

  /* El formulario listo para el árbol que reemplaza a `original`, en morado, el color del sustituto: franja
     fija con el árbol que se reemplaza, marco y «Guardar sustituto». Nada del árbol perdido llega
     precargado, ni la especie: el primer botón rápido ofrece «La misma», que hay que tocar a propósito. */
  // `reabierta`: la jornada cerrada que se reabrió para este sustituto; vuelve a cerrarse al terminar
  sustituir(original, motivo, otro, fecha, reabierta) {
    this.limpiar();
    this.estado.sustitucion = { original, motivo, otro, fecha: fecha || SRP.util.fechaHoy(), reabierta: reabierta || null };
    this.el('titulo-registrar').textContent = 'Sustituir árbol';
    this.el('titulo-registrar').classList.remove('oculto-visual');
    const aviso = this.el('edicion-aviso');
    aviso.textContent = 'Sustituto del ' + SRP.ref.especieDe(original).comun + ' (' + SRP.folio.texto(original) + ') por ' +
      SRP.ref.motivoSustitucion({ motivo_sustitucion: motivo, motivo_sustitucion_otro: otro }).toLowerCase() + ', plantado el ' + SRP.util.formatearFecha(this.estado.sustitucion.fecha) + '. Ubique el árbol nuevo; se guarda en la jornada «' +
      (SRP.activa.jornada ? SRP.activa.jornada.nombre : '') + '» y el anterior deja de contar.';
    aviso.hidden = false;
    this.el('edicion-franja-titulo').textContent = 'Sustituyendo árbol';
    this.el('edicion-franja-folio').textContent = [SRP.ref.especieDe(original).comun, SRP.folio.valido(original.folio) ? SRP.folio.texto(original) : '',
      SRP.ref.motivoSustitucion({ motivo_sustitucion: motivo, motivo_sustitucion_otro: otro })].filter(Boolean).join(' · ');
    this.el('edicion-franja').hidden = false;
    this.el('vista-registrar').dataset.sustituyendo = 'true';
    this.el('btn-revisar').innerHTML = SRP.ICONOS.svg('disco', 'grande') + '<span>Guardar sustituto</span>';
    this.el('btn-cancelar-edicion-texto').textContent = 'Cancelar sustitución';
    this.el('btn-cancelar-edicion').hidden = false;
    SRP.app.mostrarVista('registrar');
    this.pintarEspeciesRecientes();
  },

  // Cierra de nuevo la jornada que se reabrió para la sustitución en curso. Devuelve si la cerró
  async cerrarReabierta() {
    const s = this.estado.sustitucion;
    if (!s || !s.reabierta) return false;
    const id = s.reabierta; s.reabierta = null;
    return SRP.activa.volverACerrar(id);
  },

  /* El sustituto y su original en una sola operación: entra el nuevo y el original pasa a
     «sustituido», cada uno con su renglón de bitácora. Si mientras tanto alguien ya lo sustituyó
     o lo eliminó, no se guarda nada y se dice. */
  async guardarSustituto(ahora) {
    if (!SRP.permisos.exigir('registro.crear')) return;
    const s = this.estado.sustitucion;
    const original = await SRP.almacen.uno('plantaciones', s.original.id);
    if (!original || original.estatus !== 'activo' || original.sustituido_por_id) {
      SRP.util.anunciar('Ese árbol ya no se puede sustituir: se eliminó o ya tiene sustituto.', 'aviso'); return;
    }
    const nuevo = this.registroPrevisto(ahora);
    const motivo = SRP.ref.motivoSustitucion(nuevo);
    const especie = x => SRP.ref.especieDe(x).comun + ' (' + SRP.folio.texto(x) + ')';
    await SRP.almacen.guardarJuntos([
      { almacen: 'plantaciones', objeto: nuevo, bitacora: SRP.bitacora.entrada('CREADO', 'plantacion', nuevo.id, 'Sustituye a ' + especie(original) + ': ' + motivo) },
      { almacen: 'plantaciones', objeto: Object.assign({}, original, { estatus: 'sustituido', sustituido_por_id: nuevo.id, fecha_ultima_edicion: ahora, editado_por_id: SRP.sesion.usuario.id }),
        bitacora: SRP.bitacora.entrada('SUSTITUIDO', 'plantacion', original.id, 'Sustituido por ' + SRP.ref.especieDe(nuevo).comun + ': ' + motivo) }
    ]);
    if (this.el('dlg-resumen').open) this.el('dlg-resumen').close();
    if (SRP.envio.simulado()) SRP.envio.marcarCambios(original.id);
    const cerrada = await this.cerrarReabierta();
    this.limpiar();
    SRP.util.anunciar('Sustituto registrado (' + motivo + '). El ' + SRP.ref.especieDe(original).comun + ' anterior ya no cuenta como plantado.' +
      (cerrada ? ' La jornada volvió a cerrarse; genere de nuevo su reporte.' : ''), 'exito');
    SRP.app.mostrarVista(SRP.jornadas.volverAlDetalle ? 'jornadas' : 'registros');
    if (SRP.envio.simulado()) SRP.envio.enviar({ silencioso: true }).catch(() => {});
    SRP.almacen.cuidarAlmacenamiento();
  },

  /* ---------- Después de guardar ---------- */

  /* En campo se registran muchos árboles seguidos (D130): al guardar, el formulario queda en
     blanco y listo, y arriba una franja dice qué acaba de quedar registrado —especie, folio,
     lugar y envío— con «Corregir» (abre ese registro en edición) y «Ver». Sin modal. */
  mostrarGuardado(registro, previstosCompletos) {
    const esp = SRP.ref.especieDe(registro);
    const esc = SRP.util.escapar;
    this.estado.ultimoGuardado = registro.id;
    const lugar = SRP.ref.lugar(registro.alcaldia, registro.colonia);   // M15
    this.el('franja-guardado-texto').innerHTML = SRP.ICONOS.svg('palomita', 'medio') +
      '<span class="franja-guardado-cuerpo"><strong>Guardado: ' + esc(esp.comun) + '</strong>' +
      '<span class="franja-guardado-datos"><span id="franja-guardado-folio" class="folio-provisional">' + esc(SRP.folio.textoLargo(registro)) + '</span>' +
      (lugar ? ' · ' + esc(lugar) : '') + ' · <span id="franja-guardado-envio" class="franja-guardado-envio">' + (SRP.envio.simulado() ? 'guardado en el teléfono' : 'guardado en este dispositivo') + '</span></span></span>';
    const f = this.el('franja-guardado');
    f.dataset.envio = ''; f.hidden = false;
    this.limpiar();
    SRP.mapa.refrescar();
    this.el('btn-ubicacion').focus({ preventScroll: true });
    // El último árbol previsto no lleva la tarjeta de cada árbol: lleva su propio aviso, que espera respuesta
    if (previstosCompletos) this.avisarCompleta(previstosCompletos); else this.confirmarGuardado(esp.comun);
    SRP.util.anunciarSilencioso('Registro exitoso: ' + esp.comun + '. ' + (previstosCompletos ? this.textoCompleta(previstosCompletos) + ' Puede cerrar la jornada o seguir registrando.' : 'Listo para el siguiente árbol.'));
  },

  /* CONFIRMACIÓN AL GUARDAR (D171). La prueba de campo pidió certeza inmediata de que el árbol quedó
     guardado, sin desplazarse. Una ventana que hubiera que cerrar sumaría un toque por árbol (D130
     los quitó): ésta aparece al centro, dice «Registro exitoso» y la especie, vibra un instante y se
     cierra sola; no tapa los toques (pointer-events: none). */
  /* JORNADA COMPLETA. Cuando el árbol guardado es el último de los previstos se dice en una ventana
     propia, distinta de la tarjeta de cada árbol: no se cierra sola, nombra la jornada y ofrece
     cerrarla o seguir registrando. Vibra dos veces. La franja de la jornada lo deja escrito después. */
  DURACION_CONFIRMACION: 1000,
  textoCompleta(previstos) {
    return previstos === 1 ? 'Se registró el árbol previsto para la jornada.' : 'Se registraron los ' + previstos + ' árboles previstos para la jornada.';
  },
  avisarCompleta(previstos) {
    const j = SRP.activa.jornada, d = this.el('dlg-completa');
    this.el('dlg-completa-icono').innerHTML = SRP.ICONOS.svg('palomita', 'grande');
    this.el('dlg-completa-texto').textContent = (previstos === 1 ? 'Registró el árbol previsto' : 'Registró los ' + previstos + ' árboles previstos') + (j ? ' en la jornada «' + j.nombre + '».' : '.');
    this.el('btn-completa-cerrar').innerHTML = SRP.ICONOS.svg('candado', 'medio') + '<span>Cerrar jornada</span>';
    this.el('btn-completa-seguir').innerHTML = SRP.ICONOS.svg('mas', 'medio') + '<span>Seguir registrando</span>';
    if (!this._completaLista) {
      this._completaLista = true;
      this.el('btn-completa-seguir').addEventListener('click', () => d.close());
      // La jornada acaba de cuadrar: si no queda nada pendiente, se cierra sin volver a preguntar
      this.el('btn-completa-cerrar').addEventListener('click', () => { d.close(); SRP.activa.cerrarJornada({ directo: true }); });
    }
    if (!d.open) d.showModal();
    try { if (navigator.vibrate) navigator.vibrate([60, 90, 60]); } catch (e) { /* sin vibración: basta lo visible */ }
  },
  confirmarGuardado(especie) {
    const c = this.el('confirmacion-guardado');
    const ic = this.el('confirmacion-icono');
    if (!ic.firstChild) ic.innerHTML = SRP.ICONOS.svg('palomita', 'grande');
    this.el('confirmacion-especie').textContent = especie;
    c.hidden = false;
    clearTimeout(this._tConfirmacion);
    this._tConfirmacion = setTimeout(() => { c.hidden = true; }, this.DURACION_CONFIRMACION);
    try { if (navigator.vibrate) navigator.vibrate(60); } catch (e) { /* sin vibración: basta lo visible */ }
  },

  /* Lo que dice la franja «Guardado» con el envío simulado (D111): «Enviando…» mientras sale, y
     luego enviado con su hora de recepción, o guardado en el teléfono y cuántos esperan. */
  async enviarTrasGuardar(id) {
    const envio = SRP.envio;
    const pinta = (estado, texto) => this.pintarEnvio(id, estado, texto);
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

  // Estado del envío en la franja «Guardado», sólo si sigue siendo el último árbol guardado
  pintarEnvio(id, estado, texto) {
    if (this.estado.ultimoGuardado !== id) return;
    this.el('franja-guardado').dataset.envio = estado;
    const e = this.el('franja-guardado-envio'); if (e) e.textContent = texto;
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
    this.el('titulo-registrar').classList.remove('oculto-visual');
    // La edición se distingue de la captura: franja fija con el folio, marco del formulario y «Guardar cambios».
    // La franja basta: no hace falta otro aviso que diga que se está editando
    this.el('edicion-franja-folio').textContent = SRP.folio.valido(registro.folio) ? SRP.folio.textoLargo(registro) : '';
    this.el('edicion-franja').hidden = false;
    this.el('vista-registrar').dataset.editando = 'true';
    this.el('btn-revisar').innerHTML = SRP.ICONOS.svg('disco', 'grande') + '<span>Guardar cambios</span>';
    this.el('btn-cancelar-edicion').hidden = false;
    this.el('campo-fecha').value = registro.fecha_plantacion;
    this.el('campo-comentarios').value = registro.comentarios || '';
    SRP.util.pintarContador(this.el('campo-comentarios'));
    if (registro.especie_id) this.elegirEspecie(registro.especie_id);
    else this.elegirEspecie(this.OTRA, registro.especie_otra);
    this.ponerFoto(SRP.util.fotoSegura(registro.foto_base64) || null, registro.foto_id);
    SRP.app.mostrarVista('registrar');
    // Al editar se restituye el origen que quedó guardado: abrir un registro no lo convierte
    // en un punto señalado a mano.
    SRP.mapa.colocar(registro.lat, registro.lng, 'Ubicación registrada.',
      { origen: registro.punto_origen, precision: registro.gps_precision_m, centrar: true });
  },

  /* Deja la pantalla como recién abierta. Ni un campo del árbol conserva el valor anterior: ni la
     especie, ni las coordenadas escritas a mano, ni la derivación territorial. La fecha de plantación
     y el programa los vuelve a poner SRP.activa según la jornada. Lo único que sobrevive es el encuadre del mapa, que
     no es un dato: ayuda a situarse y no se guarda en ningún lado. */
  // `conservarBorrador`: al entrar o salir de la cuenta el borrador del árbol a medias se queda
  limpiar(conservarBorrador) {
    // Si se sale de una sustitución por otro camino, la jornada que se reabrió para ella se cierra igual
    this.cerrarReabierta().catch(() => {});
    this.estado.pausaBorrador = true;
    this.estado.editando = null;
    this.estado.sustitucion = null;
    this.estado.idPrevisto = null;
    this.estado.territorio = null;
    this.el('titulo-registrar').textContent = 'Nuevo registro';
    this.el('titulo-registrar').classList.add('oculto-visual');   // se lee, no se ve (D153)
    const ta = this.el('titulo-arbol'); if (ta) ta.textContent = 'Nuevo árbol';
    this.el('edicion-aviso').hidden = true;
    this.el('edicion-franja').hidden = true;
    this.el('edicion-franja-titulo').textContent = 'Editando registro';
    delete this.el('vista-registrar').dataset.editando;
    delete this.el('vista-registrar').dataset.sustituyendo;
    this.el('btn-revisar').innerHTML = SRP.ICONOS.svg('disco', 'grande') + '<span>Guardar</span>';
    this.el('btn-cancelar-edicion').hidden = true;
    this.el('btn-cancelar-edicion-texto').textContent = 'Cancelar edición';
    this.el('campo-especie').value = ''; this.estado.especieId = null; this.mostrarOtra(false);
    this.el('campo-fecha').value = '';
    this.el('caja-fecha-arbol').hidden = true;
    this.el('campo-comentarios').value = '';
    this.el('coord-lat').value = '';
    this.el('coord-lng').value = '';
    this.ponerFoto(null, null);
    this.mostrarErrores([]);
    SRP.util.refrescarContadores(this.el('form-plantacion'));
    SRP.mapa.limpiar();
    this.mostrarPunto(null, null, null);
    SRP.mapa.estado(SRP.mapa.GUIA_SIN_PUNTO);
    this.estado.pausaBorrador = false;
    if (!conservarBorrador) this.quitarBorrador();
  }
};
