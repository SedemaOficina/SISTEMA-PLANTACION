/* ESPEJO DE CAMPOS — SÓLO EN LA VERSIÓN DE PRUEBA.
   =================================================================================
   ESTE ARCHIVO SE ELIMINA AL CERRAR LA ETAPA 1. Para quitarlo bastan cuatro cosas:
     1. borrar este archivo,
     2. borrar su <script> y los tres bloques con clase `espejo` de index.html
        (formulario, detalle del registro y cierre del parte),
     3. borrar el bloque `.espejo` de css/estilos.css,
     4. borrar las tres llamadas a SRP.espejo (formulario.js, registros.js, reportes.js),
        que ya están protegidas con `if (SRP.espejo)`.
   Nada más depende de él: no escribe en ningún almacén, no altera el registro y
   no participa en la validación. Es una ventana, no una pieza.

   TRES ESPEJOS, UN MOTOR (bloque 22). El del formulario enseña el registro previsto; el
   del detalle, el registro tal como quedó guardado; el del cierre del parte, el cierre
   previsto. Los tres restan los campos visibles y pintan el resto con su nota.
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
             'foto_base64', 'foto_nombre', 'foto_bytes', 'folio'],

  // Una línea por campo: de dónde sale y cuándo se fija. Si falta, el campo igual se ve.
  NOTAS: {
    especie_id: 'Llave ESP-0000 del catálogo del SIA; con ella el SIA obtiene género, epíteto, distribución, forma de crecimiento, id SNIB e id EncicloVida sin copiarlos al registro (D84)',
    id: 'UUID. Se fija al abrir la ficha de revisión y es el que se guarda',
    estatus: 'Siempre «activo» al crear. Eliminar marca, no borra',
    es_ficticio: 'Verdadero mientras CONFIG.ES_FICTICIO lo esté',
    cabo_id: 'De la sesión abierta. En edición conserva al cabo que capturó',
    lat_original: 'Dónde quedó el punto la primera vez, antes de cualquier arrastre',
    lng_original: 'Ídem',
    alcaldia_cve: 'Clave INEGI (cvegeo) de la alcaldía; es la llave para unir con el SIA',
    uga: 'Del punto contra la malla hexagonal UGA (~1 km²). No se muestra en ninguna ficha',
    capa_version: 'Con qué versión de cada capa se derivó; permite rehacer el dato si cambian',
    foto_id: 'UUID de la fotografía; nulo si no hay',
    colonia_cve: 'Clave CVEUT de la unidad territorial (IECM); llave para unir con la capa de colonias',
    especie_estatus: 'VALIDADA si es del catálogo; PENDIENTE_VALIDACION con «Otra especie», hasta que el SIA la resuelva (D68)',
    folio_uga: 'La celda UGA que quedó dentro del folio; se congela al asignarlo y no cambia aunque el punto se corrija (R8)',
    folio_capa_version: 'Versión de las capas con que se derivó el folio; congelada (R8)',
    folio_lat: 'Coordenada empleada al asignar el folio; congelada (R8)',
    folio_lng: 'Ídem',
    foto_nombre: 'Nombre del archivo que se cargó; se conserva para la ficha',
    foto_bytes: 'Peso de la fotografía ya comprimida',
    fecha_registro: 'Momento de guardar. Se fija al pulsar Guardar, no antes',
    fecha_ultima_edicion: 'Nulo mientras no se edite',
    editado_por_id: 'Quién hizo la última edición'
  },

  // Lo que el detalle del registro sí enseña (registros.js, verDetalle): el resto va al espejo
  VISIBLES_DETALLE: ['id', 'folio', 'lat', 'lng', 'punto_origen', 'gps_precision_m', 'alcaldia', 'colonia',
                     'especie_id', 'especie_otra', 'programa_id', 'fecha_plantacion', 'cabo_id',
                     'comentarios', 'foto_base64'],

  // Cierre del parte: lo que se ve en el formulario son sus CAMPOS y el encargado
  NOTAS_CIERRE: {
    id: 'fecha|cabo, o fecha|TODOS sin cabo filtrado: un cierre por jornada y cuadrilla',
    es_ficticio: 'Verdadero mientras CONFIG.ES_FICTICIO lo esté (D87)',
    fecha: 'El día del parte; sale del filtro, no se captura',
    cabo_id: 'El cabo por el que se filtró; vacío si el parte es del día completo',
    creado_por_id: 'Quién cerró el parte la primera vez; no cambia al regenerar',
    fecha_creacion: 'Se fija al generar por primera vez',
    editado_por_id: 'Quién generó por última vez',
    fecha_ultima_edicion: 'Se fija en cada generación'
  },

  iniciar() {
    if (!SRP.CONFIG.ES_FICTICIO) return;
    document.getElementById('espejo-campos').hidden = false;
    // Cualquier cambio del formulario repinta: no hay que acordarse de llamarlo desde cada sitio
    const vista = document.getElementById('vista-registrar');
    ['input', 'change'].forEach(evento => vista.addEventListener(evento, () => this.refrescar()));
    const cierre = document.getElementById('form-cierre');
    ['input', 'change'].forEach(evento => cierre.addEventListener(evento, () => this.refrescarCierre()));
  },

  // Formato legible sin disfrazar el dato: se ve lo que se guarda, no una interpretación
  formatear(valor) {
    if (valor === null || valor === undefined || valor === '') return '—';
    if (valor === true) return 'true';
    if (valor === false) return 'false';
    return String(valor);
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

  // Filas de una tabla espejo: los campos del objeto que no están en `visibles`
  filas(objeto, visibles, notas, provisional) {
    const esc = SRP.util.escapar;
    const ocultos = Object.keys(objeto).filter(k => !visibles.includes(k));
    return { ocultos, html: ocultos.map(k =>
      '<tr><td class="espejo-campo">' + esc(k) + '</td>' +
      '<td class="espejo-valor">' + esc((provisional && provisional(k, objeto)) || this.formatear(objeto[k])) + '</td>' +
      '<td class="espejo-nota">' + esc(notas[k] || '') + '</td></tr>').join('') };
  },

  /* Detalle de un registro guardado (registros.js). Aquí no hay nada provisional: es lo que
     está en la base. Devuelve el HTML para que el diálogo lo coloque donde le toca. */
  htmlDetalle(registro) {
    if (!SRP.CONFIG.ES_FICTICIO) return '';
    const f = this.filas(registro, this.VISIBLES_DETALLE, this.NOTAS);
    return '<details class="desplegable espejo espejo-en-dialogo"><summary><span>Campos que viajan a la base y no se ven en pantalla</span></summary>' +
      '<p class="espejo-ayuda">Tal como están guardados. <span class="espejo-marca">sólo en la versión de prueba</span></p>' +
      '<table class="espejo-tabla"><caption>Almacén <code>plantaciones</code> · ' + f.ocultos.length + ' campos</caption>' +
      '<thead><tr><th>Campo</th><th>Valor guardado</th><th>De dónde sale</th></tr></thead><tbody>' + f.html + '</tbody></table></details>';
  },

  /* Cierre del parte (reportes.js): el objeto que escribiría «Generar reporte», con lo que la
     pantalla no enseña. Se repinta con cada tecla del formulario de cierre. */
  refrescarCierre() {
    const caja = document.getElementById('espejo-cierre');
    if (!caja || !SRP.CONFIG.ES_FICTICIO || !SRP.reportes.contexto) return;
    caja.hidden = false;
    const cierre = SRP.reportes.cierrePrevisto();
    const visibles = SRP.reportes.CAMPOS.concat(['encargado_id']);
    const nuevo = !SRP.reportes.contexto.previo;
    const prov = (k) => {
      if (k === 'fecha_creacion' && nuevo) return '(se fija al generar)';
      if (k === 'fecha_ultima_edicion') return '(se fija al generar)';
      return null;
    };
    const f = this.filas(cierre, visibles, this.NOTAS_CIERRE, prov);
    document.getElementById('espejo-cierre-cuerpo').innerHTML = f.html;
    const b = SRP.bitacora.entrada(nuevo ? 'CREADO' : 'EDITADO', 'cierre', cierre.id, 'Cierre del parte');
    const esc = SRP.util.escapar;
    document.getElementById('espejo-cierre-bitacora').innerHTML = Object.keys(b).map(k =>
      '<tr><td class="espejo-campo">' + esc(k) + '</td>' +
      '<td class="espejo-valor">' + esc((k === 'id' || k === 'fecha') ? '(se fija al generar)' : this.formatear(b[k])) + '</td></tr>').join('');
    document.getElementById('espejo-cierre-conteo').textContent =
      f.ocultos.length + ' campos en cierres + ' + Object.keys(b).length + ' en bitacora';
  },

  refrescar() {
    const caja = document.getElementById('espejo-campos');
    if (!caja || caja.hidden) return;
    let registro;
    try { registro = SRP.formulario.registroPrevisto(); } catch (err) { return; }

    const esc = SRP.util.escapar;
    const f = this.filas(registro, this.VISIBLES, this.NOTAS, (k, r) => this.provisional(k, r));
    const ocultos = f.ocultos;
    document.getElementById('espejo-cuerpo').innerHTML = f.html;

    // La bitácora es otro almacén y se escribe sola en el mismo acto de guardar:
    // también sale de esta pantalla, así que también se enseña.
    const accion = SRP.formulario.estado.editando ? 'EDITADO' : 'CREADO';
    const b = SRP.bitacora.entrada(accion, 'plantacion', registro.id || '(se fija al revisar)');
    // El identificador y la hora de la bitácora nacen en el acto de guardar; antes no son nada
    const alGuardar = { id: true, fecha: true };
    document.getElementById('espejo-bitacora').innerHTML = Object.keys(b).map(k =>
      '<tr><td class="espejo-campo">' + esc(k) + '</td>' +
      '<td class="espejo-valor">' + esc(alGuardar[k] ? '(se fija al guardar)' : this.formatear(b[k])) + '</td></tr>').join('');

    document.getElementById('espejo-conteo').textContent =
      ocultos.length + ' campos en plantaciones + ' + Object.keys(b).length + ' en bitacora';
  }
};
