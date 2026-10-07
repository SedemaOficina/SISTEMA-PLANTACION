/* ESPEJO DE CAMPOS — SÓLO EN LA VERSIÓN DE PRUEBA.
   =================================================================================
   ESTE ARCHIVO SE ELIMINA AL CERRAR LA ETAPA 1. Para quitarlo (revisado en D153):
     1. borrar este archivo y su <script> en index.html;
     2. borrar los dos bloques con clase `espejo` de index.html: la sección #espejo-campos del
        formulario y el desplegable #espejo-cierre del cierre del reporte (los demás no están en
        el HTML: los arman htmlGuardado() y colocar());
     3. borrar los estilos `.espejo*` de css/estilos.css (el bloque general y el de teléfono);
     4. si se quiere, borrar las llamadas a SRP.espejo (app.js, formulario.js, registros.js,
        reportes.js, jornada-activa.js, jornadas.js, usuarios.js y catalogos.js): todas van protegidas con
        `if (SRP.espejo)`, así que la app funciona igual con ellas o sin ellas.
   La revisión de arranque ya no lo exige, y las pruebas abren la app sin este archivo ni sus
   bloques, registran un árbol, ven su detalle y abren el cierre del reporte. No escribe en ningún
   almacén, no altera el registro y no participa en la validación. Es una ventana, no una pieza.

   UN MOTOR, UN ESPEJO EN CADA PANTALLA QUE ESCRIBE. El del formulario enseña el árbol previsto; el
   del detalle, el árbol guardado; el de «Iniciar jornada», la jornada prevista; el de la ficha de
   la jornada, la jornada guardada; el del cierre del reporte, el cierre previsto; y los de
   Usuarios y Catálogos, la cuenta o el valor que se edita. Todos restan los campos visibles y
   pintan el resto con su nota.
   =================================================================================

   PARA QUÉ. El formulario muestra doce datos, pero el registro que llega a la base
   lleva más de veinte: identificadores, marcas de tiempo, el punto original antes de
   cualquier arrastre, la UGA, la versión de la capa con que se derivó. Mientras se
   afina la interfaz conviene ver los dos lados a la vez, para cachar a tiempo un
   campo que se queda nulo cuando no debía.

   CÓMO NO MIENTE. No reconstruye el registro: pide el mismo objeto que guardar()
   escribiría, a SRP.formulario.registroPrevisto(), y enseña de él lo que la pantalla
   no enseña. La lista de campos ocultos no está escrita a mano: es lo que queda al
   restar los visibles. Un campo nuevo aparece aquí solo, sin que nadie se acuerde. */
window.SRP = window.SRP || {};

SRP.espejo = {
  // Los que sí tienen su lugar en la pantalla. Todo lo demás cae en el espejo.
  VISIBLES: ['lat', 'lng', 'punto_origen', 'gps_precision_m', 'alcaldia', 'colonia',
             'especie_id', 'especie_otra', 'programa_id', 'fecha_plantacion', 'comentarios',
             'foto_base64', 'folio'],

  // Una línea por campo: de dónde sale y cuándo se fija. Si falta, el campo igual se ve.
  NOTAS: {
    especie_id: 'Llave ESP-0000 del catálogo del SIA; con ella el SIA obtiene género, epíteto, distribución, forma de crecimiento, id SNIB e id EncicloVida sin copiarlos al registro (D84)',
    id: 'UUID. Se fija al abrir la ficha de revisión y es el que se guarda',
    estatus: 'Siempre «activo» al crear. Eliminar marca, no borra',
    cabo_id: 'De la sesión abierta. En edición conserva al cabo que capturó',
    alcaldia_cve: 'Clave INEGI (cvegeo) de la alcaldía; es la llave para unir con el SIA',
    uga: 'Del punto contra la malla hexagonal UGA (~1 km²). Con ella se arma el folio',
    uga_borde_m: 'Metros del punto al borde de su celda UGA; si es menor que la precisión del GPS, la celda es incierta',
    capa_version: 'Con qué versión de cada capa se derivó; permite rehacer el dato si cambian',
    foto_id: 'UUID de la fotografía; nulo si no hay',
    colonia_cve: 'Clave CVEUT de la unidad territorial (IECM); llave para unir con la capa de colonias',
    jornada_id: 'La jornada activa al registrar (D119); se cambia con «Mover a otra jornada»',
    fecha_registro: 'Momento de guardar. Se fija al pulsar Guardar, no antes',
    fecha_ultima_edicion: 'Nulo mientras no se edite',
    editado_por_id: 'Quién hizo la última edición',
    sustituye_id: 'Sólo en un sustituto: el árbol perdido que reemplaza',
    motivo_sustitucion: 'Sólo en un sustituto: vandalismo, impacto vehicular, robo, muerte u otro',
    motivo_sustitucion_otro: 'Lo escrito cuando el motivo es «Otro»',
    sustituido_por_id: 'Sólo en un árbol perdido: su sustituto. Ese árbol pasa a estatus «sustituido»'
  },

  // Lo que el detalle del registro sí enseña (registros.js, verDetalle): el resto va al espejo
  VISIBLES_DETALLE: ['folio', 'lat', 'lng', 'punto_origen', 'gps_precision_m', 'alcaldia', 'colonia',
                     'especie_id', 'especie_otra', 'programa_id', 'fecha_plantacion', 'cabo_id',
                     'comentarios', 'foto_base64'],

  // Cierre del reporte: lo que se ve en el formulario son sus CAMPOS y el encargado
  NOTAS_CIERRE: {
    id: 'UUID de la jornada (D119)',
    nombre: 'Se escribió al iniciar la jornada; aquí no se cambia',
    ubicacion: 'Calle y número, entre calles o tramo, escrita al iniciar (D120, D165); va al reporte',
    programa_id: 'Programa elegido al iniciar la jornada (D130); los árboles lo heredan en el formulario',
    lat: 'Latitud del punto de la jornada: detectado (D122) o escrito a mano (D143); nula si no se ubicó',
    lng: 'Longitud de donde se detectó la jornada (D122)',
    punto_origen: 'Cómo se obtuvo el punto de la jornada: gps (Detectar ubicación) o manual (coordenadas escritas) (D143); nulo sin ubicación',
    gps_precision_m: 'Margen del GPS al detectar, en metros enteros (D122)',
    alcaldia_cve: 'Clave INEGI de la alcaldía detectada; nula sin detección (D122)',
    alcaldia: 'Alcaldía detectada al iniciar; va a la franja, a Jornadas y al reporte (D122)',
    colonia_cve: 'Clave CVEUT de la colonia detectada (D122)',
    colonia: 'Colonia detectada al iniciar (D122)',
    fecha: 'El día en que empieza la jornada, escrito al iniciarla; cada árbol lleva su propia fecha de plantación, desde este día',
    comentarios: 'Se escribieron al iniciar la jornada; van al reporte',
    cabo_id: 'Quien inició la jornada: su titular; no cambia con un relevo',
    relevo_id: 'El cabo que registra en lugar del titular, si la coordinación hizo un relevo; nulo: registra el titular',
    relevos: 'Los relevos hechos: a quién se pasó, cuándo y quién lo hizo',
    solicitante_id: 'Quién lo solicita, del catálogo de solicitantes; sólo con el programa «Solicitud». Nulo si es otra instancia o si la jornada es de otro programa',
    solicitante_otro: 'El nombre de la instancia que solicita, cuando no está en el catálogo',
    solicitud_descripcion: 'De qué se trata la solicitud; obligatoria con el programa «Solicitud», vacía con otro',
    organizacion_id: 'La institución que ejecuta: la de quien inició la jornada; no cambia después. En las de otras instituciones no se piden chófer ni vehículo',
    estatus: 'abierta o cerrada',
    fecha_inicio: 'Cuándo se inició',
    fecha_cierre: 'Cuándo se cerró; nulo si sigue abierta',
    editado_por_id: 'Quién la modificó por última vez',
    fecha_ultima_edicion: 'Se fija en cada cambio',
    arboles_previstos: 'Cuántos árboles se van a plantar, escrito al iniciar la jornada; Jornadas y el reporte comparan contra lo registrado',
    puntos_revisados: 'Puntos con aviso marcados «Está bien» en Jornadas (D112)',
    reporte_en: 'Cuándo se entregó el PDF del reporte de la jornada; nulo si no se ha generado o si la jornada cambió después',
    carga_id: 'Clave del lote de carga masiva que creó la jornada; nula en las que se inician en campo',
    vehiculo_id: 'El vehículo elegido del catálogo (vehiculos.id); placa, modelo y tipo se copian de él al guardar. Nulo sin vehículo (D162, D174)',
    encargado_id: 'Quien responde del reporte; al iniciar, quien inicia la jornada',
    vehiculo_placa: 'Copia de la placa del vehículo elegido al cerrar', vehiculo_modelo: 'Copia del modelo del vehículo elegido al cerrar', vehiculo_tipo: 'Copia del tipo del vehículo elegido al cerrar',
    personal: 'Del cierre del reporte; vacío hasta entonces', apoyo: 'Del cierre del reporte; vacío hasta entonces', observaciones: 'Del cierre del reporte; vacío hasta entonces',
    chofer: 'Del cierre del reporte; vacío hasta entonces', hora: 'Del cierre del reporte; vacía hasta entonces'
  },

  // «Iniciar jornada» enseña lo que se escribe y el lugar detectado; el resto de la jornada va al espejo
  VISIBLES_INICIAR: ['nombre', 'ubicacion', 'programa_id', 'fecha', 'comentarios', 'arboles_previstos', 'lat', 'lng', 'alcaldia', 'colonia',
                     'solicitante_id', 'solicitante_otro', 'solicitud_descripcion'],
  // La ficha de la jornada enseña además su estado, quién la lleva y lo del cierre del reporte
  VISIBLES_JORNADA: ['nombre', 'ubicacion', 'programa_id', 'fecha', 'comentarios', 'arboles_previstos', 'alcaldia', 'colonia', 'estatus', 'cabo_id',
                     'solicitante_id', 'solicitante_otro', 'solicitud_descripcion'],
  // Lo que pone el sistema en una cuenta o en un valor de catálogo: lo demás se ve en su formulario
  DEL_SISTEMA: ['id', 'activo', 'creado_por_id', 'fecha_creacion', 'editado_por_id', 'fecha_ultima_edicion'],
  NOTAS_SISTEMA: {
    id: 'Identificador; se fija al dar de alta y no cambia',
    activo: 'Desactivar no borra: deja de ofrecerse y lo capturado conserva su referencia',
    creado_por_id: 'La cuenta que lo dio de alta', fecha_creacion: 'Cuándo se dio de alta',
    editado_por_id: 'Quién hizo el último cambio; nulo si no se ha editado', fecha_ultima_edicion: 'Cuándo fue el último cambio; nulo si no se ha editado'
  },


  // De dónde sale cada campo del renglón de bitácora que se escribe con el dato
  NOTAS_BITACORA: {
    id: 'UUID del renglón', fecha: 'El momento en que se guarda', usuario_id: 'La cuenta con sesión abierta',
    usuario_nombre: 'Su nombre, por si la cuenta desaparece después', perfil: 'Su perfil al hacerlo',
    accion: 'Qué se hizo', entidad: 'Sobre qué se hizo', entidad_id: 'El identificador de lo que se guarda', detalle: 'Qué cambió'
  },

  iniciar() {
    if (!SRP.CONFIG.ES_FICTICIO) return;
    document.getElementById('espejo-campos').hidden = false;
    /* Cualquier cambio del formulario repinta: no hay que acordarse de llamarlo desde cada sitio. Lo que
       pasa dentro del propio espejo no lo repinta: abrirlo es un toque, y repintarlo en ese momento lo
       volvía a cerrar. */
    const fuera = (fn) => (e) => { if (!(e.target.closest && e.target.closest('.espejo'))) fn(); };
    const vista = document.getElementById('vista-registrar');
    ['input', 'change'].forEach(evento => vista.addEventListener(evento, fuera(() => this.refrescar())));
    const cierre = document.getElementById('form-cierre');
    ['input', 'change'].forEach(evento => cierre.addEventListener(evento, fuera(() => this.refrescarCierre())));
    const iniciar = document.getElementById('panel-iniciar-jornada');
    ['input', 'change', 'click'].forEach(evento => iniciar.addEventListener(evento, fuera(() => this.refrescarIniciar())));
  },

  // Formato legible sin disfrazar el dato: se ve lo que se guarda, no una interpretación. Un texto muy
  // largo (la fotografía) se recorta y dice cuánto mide
  formatear(valor) {
    if (valor === null || valor === undefined || valor === '') return '—';
    if (valor === true) return 'true';
    if (valor === false) return 'false';
    const t = typeof valor === 'object' ? JSON.stringify(valor) : String(valor);
    return t.length > 120 ? t.slice(0, 60) + '… (' + t.length.toLocaleString('es-MX') + ' caracteres)' : t;
  },

  /* Lo que todavía no existe se dice, no se inventa. registroPrevisto() pone la hora actual
     en las marcas de tiempo para tener el objeto completo, pero enseñar esa hora cambiando
     con cada tecla haría creer que ya está fijada. Aquí se nombra el momento en que se fija. */
  provisional(k, registro) {
    const editando = !!SRP.formulario.estado.editando;
    if (k === 'id' && !registro.id) return '(se fija al revisar)';
    if (SRP.folio.CAMPOS.includes(k) && registro[k] === null) return '(lo asigna el servidor al sincronizar)';
    if (k === 'fecha_registro' && !editando) return '(se fija al guardar)';
    if (k === 'fecha_ultima_edicion' && editando) return '(se fija al guardar)';
    if (k === 'editado_por_id' && editando) return this.formatear(registro[k]) + ' (se fija al guardar)';
    return null;
  },

  // Dónde se ve un campo en pantalla, según el diccionario de datos
  pantallaDe(tabla, campo) {
    const c = ((SRP.ESQUEMA && SRP.ESQUEMA.tablas[tabla]) || []).find(x => x[0] === campo);
    return (c && c[5]) || '';
  },

  /* EL ESPEJO, IGUAL EN TODAS LAS PANTALLAS QUE GUARDAN ALGO. Dice dónde se guarda —la base del
     teléfono y la del servidor, con su tabla—, lo que se ve en pantalla con la etiqueta donde se
     captura, lo que no se ve con de dónde sale, y el renglón de bitácora que se escribe en el mismo
     acto, si se escribe. `o`: { tabla, objeto, visibles, notas, previsto, provisional, bitacora:
     { accion, entidad, detalle, alGuardar } o null, prefijo (ids de sus tablas) }. */
  htmlCuerpo(o) {
    const esc = SRP.util.escapar, obj = o.objeto, notas = o.notas || {};
    const id = sufijo => o.prefijo ? ' id="' + o.prefijo + '-' + sufijo + '"' : '';
    const valor = k => (o.provisional && o.provisional(k, obj)) || this.formatear(obj[k]);
    const fila = (k, v, nota) => '<tr><td class="espejo-campo">' + esc(k) + '</td><td class="espejo-valor">' + esc(v) + '</td><td class="espejo-nota">' + esc(nota || '') + '</td></tr>';
    const tabla = (clase, titulo, sufijo, filas) => '<table class="espejo-tabla ' + clase + '"><caption>' + titulo + '</caption><thead><tr><th>Campo</th><th>' +
      (o.previsto ? 'Valor previsto' : 'Valor guardado') + '</th><th>De dónde sale</th></tr></thead><tbody' + id(sufijo) + '>' + filas + '</tbody></table>';
    const campos = Object.keys(obj), vis = campos.filter(k => o.visibles.includes(k)), ocu = campos.filter(k => !o.visibles.includes(k));
    const n = x => x + (x === 1 ? ' campo' : ' campos');
    let html = '<p class="espejo-ayuda">' + (o.previsto ? 'Tal como quedaría guardado en este momento.' : 'Tal como está guardado.') +
      ' <span class="espejo-marca">sólo en la versión de prueba</span></p>' +
      '<dl class="espejo-destino"><dt>En el teléfono</dt><dd><code>' + esc(SRP.CONFIG.DB_NOMBRE) + '</code> › tabla <code>' + esc(o.tabla) + '</code></dd>' +
      '<dt>En el servidor</dt><dd>PostgreSQL › esquema <code>srp</code> › tabla <code>' + esc(o.tabla) + '</code></dd>' +
      (o.bitacora ? '<dt>Además</dt><dd>un renglón en <code>bitacora</code>, en el mismo acto</dd>' : '') + '</dl>' +
      tabla('espejo-visibles', 'Se ve en pantalla · ' + n(vis.length), 'visibles', vis.map(k => fila(k, valor(k), this.pantallaDe(o.tabla, k))).join('')) +
      tabla('espejo-ocultos', 'No se ve en pantalla · ' + n(ocu.length), 'cuerpo', ocu.map(k => fila(k, valor(k), notas[k])).join(''));
    if (o.bitacora) {
      // El renglón apunta al mismo identificador que se enseña arriba: si aún no se fija, lo dice igual
      const b = SRP.bitacora.entrada(o.bitacora.accion, o.bitacora.entidad, (o.provisional && o.provisional('id', obj)) || obj.id || o.bitacora.alGuardar, o.bitacora.detalle || '');
      html += tabla('espejo-bitacora-tabla', 'También se escribe en <code>bitacora</code> · ' + n(Object.keys(b).length), 'bitacora',
        Object.keys(b).map(k => fila(k, (k === 'id' || k === 'fecha') ? o.bitacora.alGuardar : this.formatear(b[k]), this.NOTAS_BITACORA[k])).join(''));
    }
    return html;
  },

  // El desplegable de un espejo, plegado de inicio: se abre sólo cuando se quiere revisar
  htmlGuardado(o) {
    if (!SRP.CONFIG.ES_FICTICIO || !o.objeto) return '';
    return '<details class="desplegable espejo espejo-en-dialogo"><summary><span>Lo que viaja a la base de datos</span></summary><div class="espejo-contenido">' + this.htmlCuerpo(o) + '</div></details>';
  },

  /* Pone un espejo al final de `contenedor`, en su propia caja: la crea la primera vez y después sólo
     cambia lo de adentro. El desplegable no se reemplaza: si alguien escribe en un campo y toca el título
     del espejo, el campo avisa su cambio en ese mismo toque, y un desplegable nuevo se tragaría el toque. */
  colocar(contenedor, clave, html) {
    if (!contenedor) return;
    let caja = contenedor.querySelector(':scope > [data-espejo="' + clave + '"]');
    if (!caja) { caja = document.createElement('div'); caja.dataset.espejo = clave; contenedor.appendChild(caja); }
    const actual = caja.querySelector(':scope > details > .espejo-contenido');
    const nuevo = document.createElement('template'); nuevo.innerHTML = html;
    const contenido = nuevo.content.querySelector('.espejo-contenido');
    if (actual && contenido) actual.innerHTML = contenido.innerHTML;
    else caja.innerHTML = html;
  },

  // Detalle de un árbol guardado (registros.js): lo que está en la base
  htmlDetalle(registro) { return this.htmlGuardado({ tabla: 'plantaciones', objeto: registro, visibles: this.VISIBLES_DETALLE, notas: this.NOTAS }); },

  // «Iniciar jornada»: la jornada que se guardaría con lo escrito hasta ahora
  refrescarIniciar() {
    const panel = document.getElementById('panel-iniciar-jornada');
    if (!SRP.CONFIG.ES_FICTICIO || !panel || panel.hidden || !SRP.sesion.usuario) return;
    let j; try { j = SRP.activa.jornadaPrevista(); } catch (err) { return; }
    const alIniciar = k => (k === 'id' || k === 'fecha_inicio') ? '(se fija al iniciar)' : null;
    this.colocar(panel, 'iniciar', this.htmlGuardado({ tabla: 'jornadas', objeto: j, visibles: this.VISIBLES_INICIAR, notas: this.NOTAS_CIERRE, previsto: true, provisional: alIniciar,
      bitacora: { accion: 'CREADO', entidad: 'jornada', detalle: 'Jornada «' + (j.nombre || '') + '»', alGuardar: '(se fija al iniciar)' } }));
  },

  // Ficha de la jornada (jornadas.js): la jornada tal como está guardada
  enFicha(contenedor, jornada) {
    this.colocar(contenedor, 'jornada', this.htmlGuardado({ tabla: 'jornadas', objeto: jornada, visibles: this.VISIBLES_JORNADA.concat(SRP.reportes.CAMPOS), notas: this.NOTAS_CIERRE }));
  },

  /* Alta o edición de una cuenta o de un valor de catálogo: lo que se escribe en su formulario y lo que
     pone el sistema. En un alta todavía no existe: se dice cuándo se fija. */
  enFormulario(contenedor, almacen, objeto) {
    const nuevo = !objeto, u = SRP.sesion.usuario;
    const o = objeto || { id: null, activo: true, creado_por_id: u ? u.id : null, fecha_creacion: null, editado_por_id: null, fecha_ultima_edicion: null };
    const visibles = Object.keys(o).filter(k => !this.DEL_SISTEMA.includes(k));
    const alGuardar = k => nuevo && (k === 'id' || k === 'fecha_creacion') ? '(se fija al guardar)' : null;
    this.colocar(contenedor, 'formulario', this.htmlGuardado({ tabla: almacen, objeto: o, visibles, notas: this.NOTAS_SISTEMA, previsto: nuevo, provisional: alGuardar,
      bitacora: { accion: nuevo ? 'CREADO' : 'EDITADO', entidad: almacen === 'usuarios' ? 'usuario' : 'catalogo', alGuardar: '(se fija al guardar)' } }));
  },

  /* Cierre del reporte (reportes.js): el objeto que escribiría «Generar reporte». Se repinta con cada
     tecla del formulario de cierre. */
  refrescarCierre() {
    const caja = document.getElementById('espejo-cierre');
    if (!caja || !SRP.CONFIG.ES_FICTICIO || !SRP.reportes.contexto) return;
    caja.hidden = false;
    const cierre = SRP.reportes.cierrePrevisto();
    document.getElementById('espejo-cierre-contenido').innerHTML = this.htmlCuerpo({ tabla: 'jornadas', objeto: cierre, visibles: SRP.reportes.CAMPOS.concat(['encargado_id']),
      notas: this.NOTAS_CIERRE, previsto: true, provisional: k => k === 'fecha_ultima_edicion' ? '(se fija al generar)' : null, prefijo: 'espejo-cierre',
      bitacora: { accion: 'EDITADO', entidad: 'jornada', detalle: 'Datos de cierre del reporte', alGuardar: '(se fija al generar)' } });
  },

  // El formulario del árbol: el registro que escribiría el botón Guardar
  refrescar() {
    const caja = document.getElementById('espejo-campos');
    if (!caja || caja.hidden) return;
    let registro;
    try { registro = SRP.formulario.registroPrevisto(); } catch (err) { return; }
    const editando = !!SRP.formulario.estado.editando;
    document.getElementById('espejo-contenido').innerHTML = this.htmlCuerpo({ tabla: 'plantaciones', objeto: registro, visibles: this.VISIBLES, notas: this.NOTAS, previsto: true,
      provisional: (k, r) => this.provisional(k, r), prefijo: 'espejo',
      bitacora: { accion: editando ? 'EDITADO' : 'CREADO', entidad: 'plantacion', alGuardar: '(se fija al guardar)' } });
  }
};
