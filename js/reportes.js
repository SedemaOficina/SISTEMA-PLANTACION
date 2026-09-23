/* REPORTE DIARIO DE PLANTACIÓN.
   Dos piezas: el formulario de cierre —lo que no está en los registros y sólo va al documento— y
   el PDF que lo arma.

   POR QUÉ UN SOLO DÍA. El reporte es el parte de la jornada: así se escribe hoy en campo, un
   parte por día y por cuadrilla. Un reporte que abarcara un mes no tendría chófer ni hora de
   finalización ni observaciones que valieran para todo el periodo, y esos campos son la mitad del
   documento. Los filtros de mes, año y rango siguen sirviendo para mirar la lista; para generar
   el parte hay que estar parado en un día.

   POR QUÉ UN FORMULARIO APARTE Y NO UN ENCABEZADO DE JORNADA. Lo pidió Liber así: el chófer, la
   hora de finalización y las observaciones se saben al cerrar el día, no al llegar al frente.
   Pedirlos antes obliga a volver a abrirlos después. Se capturan al generar el reporte, que es
   cuando la persona ya tiene esos datos enfrente.

   QUÉ NO ENTRA AQUÍ. Todo lo que ya vive en los registros: especies, conteos y territorio se
   calculan, nunca se teclean. Un total escrito a mano es un total que se puede equivocar. */
window.SRP = window.SRP || {};

SRP.reportes = {
  COLOR: { guinda: [157, 33, 72], dorado: [178, 142, 92], gris: [85, 88, 90], fila: [247, 241, 243], tinta: [35, 37, 38] },

  /* Campos del cierre. Todos opcionales y de texto libre: los partes varían de una cuadrilla a
     otra y de un día a otro, y encajonarlos obligaría a escribir de una forma que no es la suya.
     El encargado no está en esta lista porque no se escribe: sale de la sesión. */
  CAMPOS: ['sitio', 'actividades', 'personal', 'apoyo', 'observaciones', 'chofer', 'vehiculo_modelo', 'vehiculo_placa', 'hora'],

  contexto: null,   // { registros, fecha, cabo_id } de lo que se va a reportar

  el(id) { return document.getElementById(id); },

  iniciar() {
    this.el('form-cierre').addEventListener('submit', (e) => { e.preventDefault(); this.aceptar(); });
    this.el('pdf-dia').addEventListener('change', () => this.refrescarVista());
    this.el('pdf-cabo').addEventListener('change', () => this.refrescarVista());
    this.el('btn-pdf').addEventListener('click', () => this.generarDesdeVista());
    this.el('btn-previa-generar').innerHTML = SRP.ICONOS.svg('palomita') + '<span>Generar PDF</span>';
    this.el('btn-previa-generar').addEventListener('click', () => {
      const v = this.vistaPrevia; if (!v) return;
      this.el('dlg-previa').close();
      this.generar(v.registros, v.cierre, v.fecha);
    });
    // Corregir vuelve al formulario de cierre con lo ya escrito (se guardó al pedir la vista previa)
    this.el('btn-previa-corregir').addEventListener('click', () => {
      const v = this.vistaPrevia; if (!v) return;
      this.el('dlg-previa').close();
      this.abrir(v.registros, v.fecha, v.cabo_id);
    });
  },

  /* ---------- La vista Reportes (D81) ---------- */

  /* EL PARTE ES DE UN DÍA. Lo decidió Liber: el reporte es el parte de la jornada, y los datos
     que lo acompañan —chófer, hora de finalización, observaciones— no valen para un mes. Aquí se
     elige el día (hoy por omisión, nunca futuro) y, quien ve a varias personas, el cabo. La vista
     no depende de cómo esté filtrada la lista de Registros: hace su propia consulta. */
  async preparar() {
    const u = SRP.sesion.usuario;
    const alcance = SRP.permisos.de(u).alcance;
    const dia = this.el('pdf-dia');
    dia.max = SRP.util.fechaHoy();
    if (!dia.value) dia.value = SRP.util.fechaHoy();
    const caja = this.el('caja-pdf-cabo');
    caja.hidden = alcance === 'propios';
    if (!caja.hidden) {
      const previo = this.el('pdf-cabo').value;
      const todos = await this.registrosAlcance();
      const ids = [...new Set(todos.map(r => r.cabo_id))];
      this.el('pdf-cabo').innerHTML = '<option value="">Todos los cabos</option>' + ids
        .map(id => [id, SRP.ref.nombreUsuario(id)]).sort((a, b) => a[1].localeCompare(b[1], 'es'))
        .map(([id, n]) => '<option value="' + id + '">' + SRP.util.escapar(n) + '</option>').join('');
      this.el('pdf-cabo').value = ids.includes(previo) ? previo : '';
    }
    await this.refrescarVista();
    if (SRP.conexion) SRP.conexion.refrescarAvisoEnvio();
  },

  // Todo lo activo que quien entró puede ver
  async registrosAlcance() {
    const u = SRP.sesion.usuario;
    const todos = await SRP.almacen.porIndice('plantaciones', 'estatus', 'activo');
    return todos.filter(r => SRP.permisos.alcanza(u, r, SRP.ref.usuarioPorId));
  },

  // Los del día elegido (y del cabo elegido), en el orden en que se capturaron
  async registrosDelDia(dia, caboId) {
    return (await this.registrosAlcance())
      .filter(r => r.fecha_plantacion === dia && (!caboId || r.cabo_id === caboId))
      .sort((a, b) => a.fecha_registro.localeCompare(b.fecha_registro));
  },

  /* Un botón apagado sin explicación se lee como una falla del sistema (Norma 7.6): la nota dice
     qué se va a reportar, o qué falta para poder hacerlo. */
  async refrescarVista() {
    const dia = this.el('pdf-dia').value;
    const cabo = this.el('caja-pdf-cabo').hidden ? '' : this.el('pdf-cabo').value;
    const n = dia ? (await this.registrosDelDia(dia, cabo)).length : 0;
    this.el('btn-pdf').disabled = !dia || n === 0;
    this.el('pdf-nota').textContent = !dia
      ? 'El reporte es el parte de un día. Elija el día del parte.'
      : n === 0 ? 'No hay registros del ' + SRP.util.formatearFecha(dia) + (cabo ? ' de ' + SRP.ref.nombreUsuario(cabo) : '') + '.'
      : (n === 1 ? 'Se reportará el registro del ' : 'Se reportarán los ' + n + ' registros del ') + SRP.util.formatearFecha(dia) +
        (cabo ? ' de ' + SRP.ref.nombreUsuario(cabo) : '') + '. Si ya se generó, se vuelve a abrir con sus datos de cierre para corregirlos.';
  },

  async generarDesdeVista() {
    const dia = this.el('pdf-dia').value;
    const cabo = this.el('caja-pdf-cabo').hidden ? '' : this.el('pdf-cabo').value;
    const registros = await this.registrosDelDia(dia, cabo);
    if (!dia || !registros.length) return;
    this.abrir(registros, dia, cabo);
  },

  /* La clave junta el día con el cabo filtrado: un coordinador puede sacar el parte de cada una
     de sus cuadrillas el mismo día, y cada uno conserva sus propios datos de cierre. Sin cabo
     elegido, el parte es del día completo dentro de su alcance. */
  claveCierre(fecha, caboId) { return fecha + '|' + (caboId || 'TODOS'); },

  /* ---------- Formulario de cierre ---------- */

  async abrir(registros, fecha, caboId) {
    if (!registros.length) return;
    this.contexto = { registros, fecha, cabo_id: caboId || '' };

    this.el('dlg-cierre-dia').textContent = SRP.util.formatearFecha(fecha);
    this.el('dlg-cierre-cuenta').textContent = registros.length +
      (registros.length === 1 ? ' ejemplar registrado' : ' ejemplares registrados');

    // Lo capturado antes para este mismo día no se vuelve a escribir (Norma 7.6)
    const previo = await SRP.almacen.uno('cierres', this.claveCierre(fecha, this.contexto.cabo_id));
    this.contexto.previo = previo || null;
    this.CAMPOS.forEach(c => { this.el('cie-' + c).value = previo ? (previo[c] || '') : ''; });
    // Un cierre guardado antes del bloque 20 traía «vehiculo» en un solo campo: se muestra como modelo
    if (previo && previo.vehiculo && !previo.vehiculo_modelo) this.el('cie-vehiculo_modelo').value = previo.vehiculo;
    this.prepararEncargado(registros, previo);
    if (SRP.espejo) SRP.espejo.refrescarCierre();

    this.el('dlg-cierre').showModal();
  },

  /* ENCARGADO. Quien captura en campo es responsable de su propio parte, así que a un cabo no se
     le pregunta: es él, y el campo se muestra como respuesta, no como pregunta. Quien ve a varias
     personas —coordinador o administración— sí elige, y sólo entre los cabos que tienen registros
     ese día: ofrecer el padrón completo sería ofrecer a gente que no estuvo. */
  prepararEncargado(registros, previo) {
    const u = SRP.sesion.usuario;
    const propios = SRP.permisos.de(u).alcance === 'propios';
    const lectura = this.el('cie-encargado-lectura');
    const caja = this.el('cie-encargado-caja');

    lectura.hidden = !propios;
    caja.hidden = propios;

    if (propios) {
      this.contexto.encargado_id = u.id;
      lectura.textContent = SRP.util.nombreCompleto(u);
      return;
    }

    const ids = [...new Set(registros.map(r => r.cabo_id))]
      .map(id => [id, SRP.ref.nombreUsuario(id)])
      .sort((a, b) => a[1].localeCompare(b[1], 'es'));
    const sel = this.el('cie-encargado');
    sel.innerHTML = '<option value="">Sin especificar</option>' +
      ids.map(([id, n]) => '<option value="' + id + '">' + SRP.util.escapar(n) + '</option>').join('');
    // Con un solo cabo en el día no hay nada que elegir: se propone y se puede cambiar
    sel.value = (previo && previo.encargado_id) || (ids.length === 1 ? ids[0][0] : '');
  },

  encargadoElegido() {
    const propios = SRP.permisos.de(SRP.sesion.usuario).alcance === 'propios';
    return propios ? this.contexto.encargado_id : this.el('cie-encargado').value;
  },

  /* EL CIERRE TAL COMO QUEDARÍA EN LA BASE, en un solo lugar: lo escribe aceptar() y lo lee
     el espejo del cierre, para que lo que el espejo enseña no pueda desfasarse de lo que se
     guarda (la misma regla que registroPrevisto() en el formulario). */
  cierrePrevisto(ahora) {
    const c = this.contexto;
    const previo = c.previo;
    ahora = ahora || SRP.util.ahoraISO();
    const cierre = {
      id: this.claveCierre(c.fecha, c.cabo_id),
      es_ficticio: SRP.CONFIG.ES_FICTICIO,
      fecha: c.fecha,
      cabo_id: c.cabo_id,
      encargado_id: this.encargadoElegido(),
      creado_por_id: previo ? previo.creado_por_id : SRP.sesion.usuario.id,
      fecha_creacion: previo ? previo.fecha_creacion : ahora,
      editado_por_id: SRP.sesion.usuario.id,
      fecha_ultima_edicion: ahora
    };
    this.CAMPOS.forEach(k => { cierre[k] = this.el('cie-' + k).value.trim(); });
    return cierre;
  },

  async aceptar() {
    const c = this.contexto;
    const previo = c.previo;
    const cierre = this.cierrePrevisto();

    await SRP.almacen.guardarConBitacora('cierres', cierre,
      SRP.bitacora.entrada(previo ? 'EDITADO' : 'CREADO', 'cierre', cierre.id,
        'Cierre del parte del ' + SRP.util.formatearFecha(c.fecha)));

    this.el('dlg-cierre').close();
    this.mostrarPrevia(c.registros, cierre, c.fecha, c.cabo_id);
  },

  /* VISTA PREVIA DEL PARTE (D101). Lo mismo que dirá el PDF, en el mismo orden y con las mismas
     reglas (un apartado vacío no aparece), en pantalla y antes de generarlo: así se corrige un
     dato de cierre sin haber compartido todavía un documento equivocado. No es una imagen del
     PDF —en iPhone un PDF incrustado sólo enseña la primera página—, sino el mismo contenido. */
  mostrarPrevia(registros, cierre, fecha, caboId) {
    this.vistaPrevia = { registros, cierre, fecha, cabo_id: caboId || '' };
    this.el('previa-hoja').innerHTML = this.htmlPrevia(registros, cierre, fecha);
    this.el('dlg-previa').showModal();
  },

  htmlPrevia(registros, cierre, fecha) {
    const esc = t => SRP.util.escapar(t);
    const u = SRP.sesion.usuario;
    const variosAutores = SRP.permisos.de(u).alcance !== 'propios';
    const hay = (k) => !!(cierre[k] && cierre[k].trim());
    const parrafo = t => esc(t).replace(/\n/g, '<br>');
    const apartado = (titulo, cuerpo) => '<section class="previa-apartado"><h3>' + titulo + '</h3>' + cuerpo + '</section>';
    let h = '<p class="previa-titulo">Reporte diario de plantación</p><p class="previa-fecha">' + esc(SRP.util.formatearFecha(fecha)) + '</p>';

    const alcaldias = this.alcaldiasDe(registros);
    if (hay('sitio') || alcaldias.length) {
      const terr = alcaldias.length ? (alcaldias.length === 1 ? 'Alcaldía ' + alcaldias[0] : 'Alcaldías: ' + alcaldias.join(', ')) : '';
      h += '<div class="previa-sitio">' + (hay('sitio') ? '<p><strong>Sitio:</strong> ' + parrafo(cierre.sitio) + '</p>' : '') +
        (terr ? '<p class="previa-tenue">' + esc(terr) + '</p>' : '') + '</div>';
    }
    if (hay('actividades')) h += apartado('Actividades realizadas', '<p>' + parrafo(cierre.actividades) + '</p>');
    const personal = [];
    if (hay('personal')) personal.push(parrafo(cierre.personal));
    if (hay('apoyo')) personal.push('Personal de apoyo: ' + parrafo(cierre.apoyo));
    if (cierre.encargado_id) personal.push('Encargado: ' + esc(SRP.ref.nombreUsuario(cierre.encargado_id)));
    if (personal.length) h += apartado('Personal participante', '<p>' + personal.join('<br>') + '</p>');

    h += apartado('Ejemplares registrados', '<div class="previa-tabla-caja"><table class="previa-tabla"><thead><tr><th>N.º</th><th>Folio</th><th>Especie</th><th>Nombre científico</th>' +
      (variosAutores ? '<th>Cabo</th>' : '') + '</tr></thead><tbody>' + registros.map((r, i) => {
        const e = SRP.ref.especieDe(r);
        return '<tr><td>' + (i + 1) + '</td><td>' + esc(SRP.folio.texto(r)) + '</td><td>' + esc(e.comun) + '</td><td><i>' + esc(e.cientifico) + '</i></td>' +
          (variosAutores ? '<td>' + esc(SRP.ref.nombreUsuario(r.cabo_id)) + '</td>' : '') + '</tr>';
      }).join('') + '</tbody></table></div>' +
      (registros.some(r => !SRP.folio.valido(r.folio)) ? '<p class="previa-nota">Registros PROVISIONALES: el folio se asigna al sincronizar con el servidor. Este parte no sustituye al definitivo.</p>' : ''));

    h += apartado('Totales por especie', '<div class="previa-tabla-caja"><table class="previa-tabla"><thead><tr><th>Especie</th><th>Nombre científico</th><th>Ejemplares</th></tr></thead><tbody>' +
      this.totalesPorEspecie(registros).map(t => '<tr><td>' + esc(t.comun) + '</td><td><i>' + esc(t.cientifico) + '</i></td><td>' + t.n + '</td></tr>').join('') +
      '</tbody><tfoot><tr><td>Total</td><td></td><td>' + registros.length + '</td></tr></tfoot></table></div>');

    const porPrograma = {};
    registros.forEach(r => { const n = SRP.ref.nombreCatalogo(r.programa_id) || 'Sin programa'; porPrograma[n] = (porPrograma[n] || 0) + 1; });
    h += apartado('Por programa', '<p>' + Object.keys(porPrograma).sort().map(n => esc(n) + ': ' + porPrograma[n]).join('<br>') + '</p>');

    if (hay('observaciones')) h += apartado('Observaciones', '<p>' + parrafo(cierre.observaciones) + '</p>');
    const log = [];
    if (hay('chofer')) log.push('Chófer: ' + esc(cierre.chofer));
    if (hay('vehiculo_modelo') || hay('vehiculo_placa')) log.push('Vehículo: ' + esc([cierre.vehiculo_modelo, hay('vehiculo_placa') ? 'placa ' + cierre.vehiculo_placa : ''].filter(Boolean).join(', ')));
    if (hay('hora')) log.push('Hora de finalización: ' + esc(cierre.hora) + ' h');
    if (log.length) h += apartado('Logística', '<p>' + log.join('<br>') + '</p>');

    const conGps = registros.filter(r => r.punto_origen === 'gps').length;
    h += '<p class="previa-pie">Ubicados con GPS del dispositivo: ' + conGps + ' de ' + registros.length + ' (' + Math.round(conGps * 100 / registros.length) + '%)<br>' +
      'Generado por ' + esc(SRP.util.nombreCompleto(u)) + ' (' + esc(SRP.permisos.de(u).etiqueta) + ').</p>';
    return h;
  },

  /* ---------- El documento ---------- */

  // Conteo por especie, de mayor a menor. Se calcula siempre: nunca se captura (Norma 10.2)
  totalesPorEspecie(registros) {
    const m = new Map();
    registros.forEach(r => {
      const e = SRP.ref.especieDe(r);
      const clave = e.comun + '|' + e.cientifico;
      m.set(clave, (m.get(clave) || 0) + 1);
    });
    return [...m.entries()]
      .map(([clave, n]) => ({ comun: clave.split('|')[0], cientifico: clave.split('|')[1], n }))
      .sort((a, b) => b.n - a.n || a.comun.localeCompare(b.comun, 'es'));
  },

  // Alcaldías de los registros del día: el sistema ya las derivó del punto, no se preguntan
  alcaldiasDe(registros) {
    return [...new Set(registros.map(r => r.alcaldia).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'es'));
  },

  /* El logotipo del PDF es el mismo archivo del encabezado (D90), siempre la versión completa
     aunque el teléfono muestre el recorte; el service worker lo tiene, así que también sale sin señal. */
  cargarLogo() {
    return new Promise((resolver) => {
      const img = new Image();
      img.onload = () => resolver(img);
      img.onerror = () => resolver(null);
      img.src = 'assets/encabezado-ru.png?v=' + encodeURIComponent(SRP.CONFIG.VERSION);
    });
  },

  async generar(registros, cierre, fecha) {
    if (!window.jspdf) { SRP.util.anunciar('No se pudo cargar el generador de PDF.', 'alerta'); return; }
    const logo = await this.cargarLogo();
    const u = SRP.sesion.usuario;
    const variosAutores = SRP.permisos.de(u).alcance !== 'propios';
    const doc = new window.jspdf.jsPDF({ unit: 'mm', format: 'letter' });
    const ancho = doc.internal.pageSize.getWidth();
    const alto = doc.internal.pageSize.getHeight();
    const C = this.COLOR;
    const M = 20;                       // margen izquierdo y derecho
    const util = ancho - M * 2;
    const hoy = new Date();

    /* Cada apartado se dibuja sólo si tiene qué decir. Un documento con renglones en blanco
       —«Chófer: ______»— parece una plantilla a medio llenar, y lo firma alguien. */
    const hay = (k) => !!(cierre[k] && cierre[k].trim());

    if (logo) doc.addImage(logo, 'PNG', M, 14, 90, 90 * logo.naturalHeight / logo.naturalWidth);
    doc.setDrawColor(...C.guinda); doc.setLineWidth(0.4); doc.line(M, 30, ancho - M, 30);

    doc.setFont('helvetica', 'bold'); doc.setFontSize(14); doc.setTextColor(...C.guinda);
    doc.text('REPORTE DIARIO DE PLANTACIÓN', ancho / 2, 40, { align: 'center' });
    doc.setFont('helvetica', 'normal'); doc.setFontSize(10); doc.setTextColor(...C.gris);
    doc.text(SRP.util.formatearFecha(fecha), ancho / 2, 46, { align: 'center' });

    let y = 56;
    const salto = (necesario) => { if (y + necesario > alto - 24) { doc.addPage(); y = 25; } };

    // Sitio: tal como lo escribió quien cerró el parte, con el territorio que el sistema derivó
    const alcaldias = this.alcaldiasDe(registros);
    if (hay('sitio') || alcaldias.length) {
      const lineas = hay('sitio') ? doc.splitTextToSize(cierre.sitio, util - 8) : [];
      const territorio = alcaldias.length
        ? (alcaldias.length === 1 ? 'Alcaldía ' + alcaldias[0] : 'Alcaldías: ' + alcaldias.join(', ')) : '';
      const altoCaja = 6 + lineas.length * 4.6 + (territorio ? 5 : 0);
      salto(altoCaja + 4);
      doc.setDrawColor(...C.tinta); doc.setLineWidth(0.2);
      doc.rect(M, y, util, altoCaja);
      let yy = y + 5.5;
      if (lineas.length) {
        doc.setFont('helvetica', 'bold'); doc.setFontSize(9.5); doc.setTextColor(...C.guinda);
        doc.text('Sitio:', M + 3, yy);
        doc.setFont('helvetica', 'normal'); doc.setTextColor(...C.tinta);
        doc.text(lineas, M + 15, yy);
        yy += lineas.length * 4.6;
      }
      if (territorio) {
        doc.setFontSize(9); doc.setTextColor(...C.gris);
        doc.text(territorio, M + 3, lineas.length ? yy + 0.5 : yy);
      }
      y += altoCaja + 7;
    }

    // Apartado de texto libre: título guinda y párrafo, sólo si hay contenido
    const apartado = (titulo, texto) => {
      const lineas = doc.splitTextToSize(texto, util);
      salto(10 + lineas.length * 4.6);
      doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.setTextColor(...C.guinda);
      doc.text(titulo.toUpperCase(), M, y);
      doc.setDrawColor(...C.dorado); doc.setLineWidth(0.2); doc.line(M, y + 1.5, ancho - M, y + 1.5);
      doc.setFont('helvetica', 'normal'); doc.setFontSize(9.5); doc.setTextColor(...C.tinta);
      doc.text(lineas, M, y + 7);
      y += 7 + lineas.length * 4.6 + 4;
    };

    if (hay('actividades')) apartado('Actividades realizadas', cierre.actividades);

    const personal = [];
    if (hay('personal')) personal.push(cierre.personal);
    if (hay('apoyo')) personal.push('Personal de apoyo: ' + cierre.apoyo);
    if (cierre.encargado_id) personal.push('Encargado: ' + SRP.ref.nombreUsuario(cierre.encargado_id));
    if (personal.length) apartado('Personal participante', personal.join('\n'));

    // Ejemplares: uno por renglón, en el orden en que se capturaron
    const cabecera = ['N.º', 'Folio', 'Especie', 'Nombre científico'].concat(variosAutores ? ['Cabo'] : []);
    const cuerpo = registros.map((r, i) => {
      const e = SRP.ref.especieDe(r);
      return [String(i + 1), SRP.folio.texto(r), e.comun, e.cientifico].concat(variosAutores ? [SRP.ref.nombreUsuario(r.cabo_id)] : []);
    });
    salto(30);
    doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.setTextColor(...C.guinda);
    doc.text('EJEMPLARES REGISTRADOS', M, y);
    doc.autoTable({
      head: [cabecera], body: cuerpo, startY: y + 3, margin: { left: M, right: M, bottom: 22 },
      styles: { font: 'helvetica', fontSize: 8.5, cellPadding: 1.6, textColor: C.tinta },
      headStyles: { fillColor: C.guinda, textColor: 255, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: C.fila },
      columnStyles: { 0: { cellWidth: 12, halign: 'right' }, 1: { cellWidth: 30 }, 3: { fontStyle: 'italic' } }
    });
    y = doc.lastAutoTable.finalY + 4;
    // R2: un parte con registros provisionales no es un documento definitivo, y lo dice
    if (registros.some(r => !SRP.folio.valido(r.folio))) {
      doc.setFont('helvetica', 'italic'); doc.setFontSize(8); doc.setTextColor(...C.gris);
      doc.text('Registros PROVISIONALES: el folio se asigna al sincronizar con el servidor. Este parte no sustituye al definitivo.', M, y);
      doc.setFont('helvetica', 'normal');
      y += 4;
    }
    y += 4;

    // Totales por especie: calculados
    const totales = this.totalesPorEspecie(registros);
    salto(30);
    doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.setTextColor(...C.guinda);
    doc.text('TOTALES POR ESPECIE', M, y);
    doc.autoTable({
      head: [['Especie', 'Nombre científico', 'Ejemplares']],
      body: totales.map(t => [t.comun, t.cientifico, String(t.n)]),
      foot: [['Total', '', String(registros.length)]],
      startY: y + 3, margin: { left: M, right: M, bottom: 22 },
      styles: { font: 'helvetica', fontSize: 8.5, cellPadding: 1.6, textColor: C.tinta },
      headStyles: { fillColor: C.guinda, textColor: 255, fontStyle: 'bold' },
      footStyles: { fillColor: [255, 250, 233], textColor: C.tinta, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: C.fila },
      columnStyles: { 1: { fontStyle: 'italic' }, 2: { halign: 'right', cellWidth: 26 } }
    });
    y = doc.lastAutoTable.finalY + 4;
    doc.setFont('helvetica', 'italic'); doc.setFontSize(7.5); doc.setTextColor(...C.gris);
    doc.text('El conteo se calcula a partir de los registros del sistema; no se captura a mano.', M, y);
    doc.setFont('helvetica', 'normal');
    y += 8;

    // Resumen por programa: qué programa pagó cada árbol de la jornada
    const porPrograma = {};
    registros.forEach(r => {
      const n = SRP.ref.nombreCatalogo(r.programa_id) || 'Sin programa';
      porPrograma[n] = (porPrograma[n] || 0) + 1;
    });
    const programas = Object.keys(porPrograma).sort();
    salto(10 + programas.length * 5);
    doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.setTextColor(...C.guinda);
    doc.text('POR PROGRAMA', M, y);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(9.5); doc.setTextColor(...C.tinta);
    programas.forEach((n, i) => doc.text(n + ': ' + porPrograma[n], M, y + 6 + i * 5));
    y += 6 + programas.length * 5 + 4;

    if (hay('observaciones')) apartado('Observaciones', cierre.observaciones);

    // Logística: sólo los datos que se capturaron
    const log = [];
    if (hay('chofer')) log.push('Chófer: ' + cierre.chofer);
    if (hay('vehiculo_modelo') || hay('vehiculo_placa')) {
      log.push('Vehículo: ' + [cierre.vehiculo_modelo, hay('vehiculo_placa') ? 'placa ' + cierre.vehiculo_placa : ''].filter(Boolean).join(', '));
    }
    if (hay('hora')) log.push('Hora de finalización: ' + cierre.hora + ' h');
    if (log.length) apartado('Logística', log.join('\n'));

    /* CALIDAD DE LA UBICACIÓN. Cuando la fotografía es opcional, la coordenada es la prueba, y
       quien lea el reporte merece saber de qué clase de coordenada se trata. Una fila por punto
       abultaría la tabla; una cifra al pie dice lo mismo y se compara de un año a otro. */
    const conGps = registros.filter(r => r.punto_origen === 'gps').length;
    salto(24);
    doc.setFontSize(9.5); doc.setTextColor(...C.tinta);
    doc.text('Ubicados con GPS del dispositivo: ' + conGps + ' de ' + registros.length +
             ' (' + Math.round(conGps * 100 / registros.length) + '%)', M, y);
    y += 7;

    doc.setFontSize(8); doc.setTextColor(...C.gris);
    doc.text('Generado por ' + SRP.util.nombreCompleto(u) + ' (' + SRP.permisos.de(u).etiqueta + ').', M, y);
    /* La cifra del sistema no es la cifra del programa: se registra lo que alcanza a
       registrarse. Decirlo en el documento protege a quien lo firma. */
    doc.text('Cifra de ejemplares registrados en el sistema para esta fecha. No equivale', M, y + 4);
    doc.text('necesariamente al total plantado ese día.', M, y + 8);
    if (SRP.CONFIG.ES_FICTICIO) {
      doc.setTextColor(163, 58, 0);
      doc.text('Documento de prueba con datos ficticios. Sin validez oficial.', M, y + 14);
    }

    // Pie en todas las páginas
    const paginas = doc.getNumberOfPages();
    const sello = 'SEDEMA, Sistema de Registro de Plantaciones. Generado el ' + SRP.util.formatearFechaHora(hoy.toISOString());
    for (let p = 1; p <= paginas; p++) {
      doc.setPage(p);
      doc.setDrawColor(...C.dorado); doc.setLineWidth(0.4); doc.line(M, alto - 16, ancho - M, alto - 16);
      doc.setFontSize(8); doc.setTextColor(...C.gris);
      doc.text(sello, M, alto - 11);
      doc.text('Página ' + p + ' de ' + paginas, ancho / 2, alto - 6, { align: 'center' });
    }

    this.entregar(doc, this.nombreArchivo(cierre, fecha));
  },

  /* Nombre del PDF (D102): «Reporte», quién responde del parte y la fecha del parte, p. ej.
     Reporte_Perengano_Gomez_Ejemplo_2026-09-22.pdf. La persona es el encargado del cierre; si no
     lo hay, el cabo elegido en Reportes; si tampoco, quien genera (el coordinador que saca el de
     toda su cuadrilla). Sin acentos ni espacios, para que ningún sistema de archivos lo altere. */
  nombreArchivo(cierre, fecha) {
    const cabo = this.contexto ? this.contexto.cabo_id : '';
    const id = (cierre && cierre.encargado_id) || cabo || SRP.sesion.usuario.id;
    const nombre = (SRP.ref.nombreUsuario(id) || 'SRP').normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^A-Za-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
    return 'Reporte_' + nombre + '_' + fecha + '.pdf';
  },

  /* En teléfono o tableta, compartir con las apps del dispositivo; en escritorio, descargar.
     Windows también ofrece «compartir archivos» desde Chrome y Edge, y abría su panel de
     Compartir en vez de guardar el PDF; el destino de Acrobat de ese panel recibía el archivo
     vacío (D61). Táctil sin ratón es el criterio, no el tamaño de la pantalla. */
  esDispositivoTactil() {
    return window.matchMedia && window.matchMedia('(hover: none) and (pointer: coarse)').matches;
  },

  async entregar(doc, nombre) {
    const entregado = await this.entregarArchivo(doc.output('blob'), nombre, 'Reporte diario de plantación');
    if (entregado === 'descarga') SRP.util.anunciar('Reporte descargado: ' + nombre);
  },

  /* Cualquier archivo —el PDF del parte o el respaldo— se entrega igual: compartir en táctil,
     descargar en escritorio. Devuelve 'compartido', 'cancelado' o 'descarga'. */
  async entregarArchivo(blob, nombre, titulo) {
    const archivo = new File([blob], nombre, { type: blob.type });
    if (this.esDispositivoTactil() && navigator.canShare && navigator.canShare({ files: [archivo] })) {
      try {
        await navigator.share({ files: [archivo], title: titulo });
        return 'compartido';
      } catch (err) {
        if (err.name === 'AbortError') return 'cancelado';   // la persona canceló
      }
    }
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = nombre; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
    return 'descarga';
  }
};
