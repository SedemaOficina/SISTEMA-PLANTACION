/* ESPEJO DE CAMPOS — SÓLO EN LA VERSIÓN DE PRUEBA.
   =================================================================================
   ESTE ARCHIVO SE ELIMINA AL CERRAR LA ETAPA 1. Para quitarlo bastan tres cosas:
     1. borrar este archivo,
     2. borrar su <script> y su bloque <section id="espejo-campos"> de index.html,
     3. borrar el bloque `.espejo` de css/estilos.css.
   Nada más depende de él: no escribe en ningún almacén, no altera el registro y
   no participa en la validación. Es una ventana, no una pieza.
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
             'foto_base64', 'foto_nombre', 'foto_bytes'],

  // Una línea por campo: de dónde sale y cuándo se fija. Si falta, el campo igual se ve.
  NOTAS: {
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
    fecha_registro: 'Momento de guardar. Se fija al pulsar Guardar, no antes',
    fecha_ultima_edicion: 'Nulo mientras no se edite',
    editado_por_id: 'Quién hizo la última edición'
  },

  iniciar() {
    if (!SRP.CONFIG.ES_FICTICIO) return;
    document.getElementById('espejo-campos').hidden = false;
    // Cualquier cambio del formulario repinta: no hay que acordarse de llamarlo desde cada sitio
    const vista = document.getElementById('vista-registrar');
    ['input', 'change'].forEach(evento => vista.addEventListener(evento, () => this.refrescar()));
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
    if (k === 'fecha_registro' && !editando) return '(se fija al guardar)';
    if (k === 'fecha_ultima_edicion' && editando) return '(se fija al guardar)';
    if (k === 'editado_por_id' && editando) return this.formatear(registro[k]) + ' (se fija al guardar)';
    return null;
  },

  refrescar() {
    const caja = document.getElementById('espejo-campos');
    if (!caja || caja.hidden) return;
    let registro;
    try { registro = SRP.formulario.registroPrevisto(); } catch (err) { return; }

    const esc = SRP.util.escapar;
    const ocultos = Object.keys(registro).filter(k => !this.VISIBLES.includes(k));
    document.getElementById('espejo-cuerpo').innerHTML = ocultos.map(k =>
      '<tr><td class="espejo-campo">' + esc(k) + '</td>' +
      '<td class="espejo-valor">' + esc(this.provisional(k, registro) || this.formatear(registro[k])) + '</td>' +
      '<td class="espejo-nota">' + esc(this.NOTAS[k] || '') + '</td></tr>').join('');

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
