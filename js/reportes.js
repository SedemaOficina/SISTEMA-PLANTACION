/* REPORTE DIARIO DE PLANTACIÓN.
   Dos piezas: el formulario de cierre —lo que no está en los registros y sólo va al documento— y
   el PDF que lo arma.

   POR QUÉ UN SOLO DÍA. El reporte es de la jornada: así se escribe en campo, un reporte por día
   y por cuadrilla. Un reporte que abarcara un mes no tendría chófer ni hora de finalización ni
   observaciones que valieran para todo el periodo, y esos campos son la mitad del documento.

   POR QUÉ UN FORMULARIO APARTE Y NO UN ENCABEZADO DE JORNADA. El chófer, la hora de finalización y
   las observaciones se saben al cerrar el día, no al llegar al frente. Pedirlos antes obliga a
   volver a abrirlos después. Se capturan al generar el reporte, que es cuando la persona ya tiene
   esos datos enfrente.

   QUÉ NO ENTRA AQUÍ. Todo lo que ya vive en los registros: especies, conteos y territorio se
   calculan, nunca se teclean. Un total escrito a mano es un total que se puede equivocar. */
window.SRP = window.SRP || {};

SRP.reportes = {
  // Los colores del PDF son los de la hoja, sin el modo sol, y los institucionales (--pdf-*)
  colores() {
    const c = n => SRP.util.rgb(n);
    return { guinda: c('pdf-guinda'), dorado: c('pdf-dorado'), gris: c('pdf-gris'), fila: c('pdf-fila'), tinta: c('texto'), total: c('total-fondo'), ficticio: c('aviso-ficticio'),
      suave: c('pdf-fila'), linea: c('pdf-borde'), blanco: c('fondo'), exito: c('exito'), atencion: c('editar'), error: c('error'),
      // Los colores de la gráfica de distribución, los mismos de la vista previa
      dist: Object.fromEntries(this.DISTRIBUCION.map(d => [d.clave, c(d.color)])) };
  },

  /* Campos del cierre. Todos opcionales y de texto libre: los reportes varían de una cuadrilla a
     otra y de un día a otro, y encajonarlos obligaría a escribir de una forma que no es la suya.
     El encargado no está en esta lista porque no se escribe: sale de la sesión. */
  // Placa, modelo y tipo no se escriben: se copian del catálogo al guardar
  CAMPOS: ['personal', 'apoyo', 'observaciones', 'chofer', 'hora'],
  jornadasTodas: [],   // para contar los vehículos que más usa cada encargado

  contexto: null,   // { registros, fecha, cabo_id } de lo que se va a reportar

  el(id) { return document.getElementById(id); },

  iniciar() {
    this.el('form-cierre').addEventListener('submit', (e) => { e.preventDefault(); this.aceptar(); });
    this.el('form-cierre').addEventListener('input', (e) => { if (e.target.tagName === 'TEXTAREA') this.ajustarAlto(e.target); });
    // Vehículo del catálogo: la placa elige; modelo y tipo se ponen solos
    this.el('cie-vehiculo').addEventListener('change', () => this.elegirVehiculo(this.el('cie-vehiculo').value, true));
    this.el('cie-vehiculo-frecuentes').addEventListener('click', (e) => {
      const b = e.target.closest('.chip'); if (!b) return;
      this.el('cie-vehiculo').value = b.dataset.id;
      this.elegirVehiculo(b.dataset.id, true);
      if (SRP.espejo) SRP.espejo.refrescarCierre();
    });
    // Los frecuentes son los del encargado: si la coordinación elige otro, cambian
    this.el('cie-encargado').addEventListener('change', () => this.pintarFrecuentes());
    // «Ahora» pone la hora actual en la hora de finalización
    this.el('btn-hora-ahora').addEventListener('click', () => {
      const d = new Date();
      this.el('cie-hora').value = String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
      this.el('cie-hora').dispatchEvent(new Event('input', { bubbles: true }));
    });
    this.el('btn-previa-generar').innerHTML = SRP.ICONOS.svg('palomita') + '<span>Generar PDF</span>';
    this.el('btn-previa-generar').addEventListener('click', async () => {
      const v = this.vistaPrevia; if (!v) return;
      this.el('dlg-previa').close();
      // El armado del PDF (croquis con mosaicos incluido) puede tardar unos segundos: se avisa
      // con aria-busy y un aviso flotante «Generando…» para que no parezca que no pasó nada.
      const zona = this.el('principal');
      zona.setAttribute('aria-busy', 'true');
      SRP.util.anunciar(v.soloLectura ? 'Preparando el reporte…' : 'Generando reporte…', 'aviso', { fijo: true });
      try { await this.generar(v.registros, v.cierre, v.fecha, v.jornada); }
      catch (err) { SRP.util.avisarError(err, 'generar el reporte'); }   // sin esto se quedaría «Generando reporte…»
      finally { zona.removeAttribute('aria-busy'); SRP.util.quitarAviso(); }
    });
    // Corregir vuelve al formulario de cierre con lo ya escrito (se guardó al pedir la vista previa)
    this.el('btn-previa-corregir').addEventListener('click', () => {
      const v = this.vistaPrevia; if (!v) return;
      this.el('dlg-previa').close();
      this.abrir(v.registros, v.fecha, v.cabo_id, v.jornada);
    });
  },

  /* EL REPORTE ES DE UNA JORNADA, y se genera desde su ficha en Jornadas: datos del cierre, vista
     previa y PDF. Las jornadas cerradas se buscan y se filtran en Jornadas («Reporte»: generado o sin
     generar). */

  // Las cajas de texto del cierre crecen con lo escrito: el diálogo se desplaza solo, sin una
  // segunda barra dentro de cada caja
  ajustarAlto(t) {
    t.style.height = 'auto';
    t.style.height = (t.scrollHeight + t.offsetHeight - t.clientHeight) + 'px';
  },

  // El cierre del reporte vive en la jornada: es el mismo registro
  async cierreDeJornada(j) { return (await SRP.almacen.uno('jornadas', j.id)) || j.dato || null; },

  /* ---------- Formulario de cierre ---------- */

  async abrir(registros, fecha, caboId, jornada) {
    if (!registros.length || !jornada) return;
    this.contexto = { registros, fecha, cabo_id: caboId || '', jornada };

    // Lo capturado antes para esta misma jornada no se vuelve a escribir (Norma 7.6)
    const previo = await this.cierreDeJornada(jornada);
    this.contexto.previo = previo || null;
    this.CAMPOS.forEach(c => { this.el('cie-' + c).value = previo ? (previo[c] || '') : ''; });
    // El vehículo lo pone prepararVehiculo(), sólo del catálogo
    this.prepararEncargado(registros, previo);
    await this.prepararVehiculo(previo);
    /* Personal participante, personal de apoyo, chófer y vehículo sólo se piden a la Secretaría; de
       otras instituciones, el cierre es encargado, observaciones y hora. Lo que no se pide se oculta y
       queda vacío. */
    const orgId = (previo || jornada.dato || {}).organizacion_id || SRP.CONFIG.ORGANIZACION_SEDEMA;
    const externa = !SRP.ref.esSedema(orgId);
    ['personal', 'apoyo', 'chofer', 'vehiculo'].forEach(c => { this.el('caja-cie-' + c).hidden = externa; });
    if (externa) { ['personal', 'apoyo', 'chofer', 'vehiculo'].forEach(c => { this.el('cie-' + c).value = ''; }); this.elegirVehiculo(''); }
    if (SRP.espejo) SRP.espejo.refrescarCierre();

    this.el('dlg-cierre').showModal();
    this.el('form-cierre').querySelectorAll('textarea').forEach(t => this.ajustarAlto(t));
  },

  /* ENCARGADO. Quien captura en campo es responsable de su propio reporte, así que a un cabo no se
     le pregunta ni se le muestra: es él, se guarda y el reporte lo imprime. Quien ve a varias
     personas —coordinador o administración— sí elige, y sólo entre los cabos que tienen registros
     ese día: ofrecer el padrón completo sería ofrecer a gente que no estuvo. */
  prepararEncargado(registros, previo) {
    const u = SRP.sesion.usuario;
    const propios = SRP.permisos.de(u).alcance === 'propios';
    this.el('caja-cie-encargado').hidden = propios;
    if (propios) { this.contexto.encargado_id = u.id; return; }

    const ids = SRP.util.paresPersonas(registros.map(r => r.cabo_id));
    const sel = this.el('cie-encargado');
    sel.innerHTML = SRP.util.opciones('Sin especificar', ids);
    // Con un solo cabo en el día no hay nada que elegir: se propone y se puede cambiar
    sel.value = (previo && previo.encargado_id) || (ids.length === 1 ? ids[0][0] : '');
  },

  /* VEHÍCULO DEL CATÁLOGO. Se elige la placa y el modelo y el tipo se ponen solos; se guardan
     el id del vehículo y una copia de sus tres datos, porque el reporte es un documento y no debe
     cambiar si después se corrige el catálogo. La lista va agrupada por tipo. Arriba, a un toque,
     los tres que más ha usado el encargado. Sólo vehículos del catálogo; una jornada de antes del
     catálogo cuya placa esté en él se reconoce, y si no, abre sin vehículo. */
  opcionesVehiculo(actualId) {
    const esc = SRP.util.escapar;
    const grupos = {};
    SRP.ref.deTipo('vehiculo', false).filter(v => v.activo || v.id === actualId)
      .forEach(v => { const t = v.tipo_vehiculo || 'Sin tipo'; (grupos[t] = grupos[t] || []).push(v); });
    return '<option value="">Sin vehículo</option>' +
      Object.keys(grupos).sort((a, b) => a.localeCompare(b, 'es')).map(t => '<optgroup label="' + esc(t) + '">' +
        grupos[t].sort((a, b) => a.nombre.localeCompare(b.nombre, 'es', { numeric: true }))
          .map(v => '<option value="' + esc(v.id) + '">' + esc(v.nombre + ' — ' + v.modelo) + '</option>').join('') + '</optgroup>').join('');
  },

  async prepararVehiculo(previo) {
    const vehiculos = SRP.ref.deTipo('vehiculo', false);
    let v = previo && previo.vehiculo_id ? SRP.ref.catalogoPorId[previo.vehiculo_id] : null;
    if (!v && previo && previo.vehiculo_placa) {
      const clave = SRP.catalogos.clavePlaca(previo.vehiculo_placa);
      v = vehiculos.find(x => SRP.catalogos.clavePlaca(x.nombre) === clave) || null;
    }
    const valor = v ? v.id : '';
    this.el('cie-vehiculo').innerHTML = this.opcionesVehiculo(v ? v.id : null);
    this.el('cie-vehiculo').value = valor;
    this.elegirVehiculo(valor, false);
    this.jornadasTodas = await SRP.almacen.todos('jornadas');
    this.pintarFrecuentes();
  },

  elegirVehiculo(valor) {
    const v = valor ? SRP.ref.catalogoPorId[valor] : null;
    const ficha = this.el('cie-vehiculo-ficha');
    ficha.textContent = v ? [v.modelo, v.tipo_vehiculo].filter(Boolean).join(' · ') : '';
    ficha.hidden = !ficha.textContent;
    this.el('cie-vehiculo-frecuentes').querySelectorAll('.chip').forEach(c => c.setAttribute('aria-pressed', String(c.dataset.id === valor)));
  },

  pintarFrecuentes() {
    const caja = this.el('cie-vehiculo-frecuentes');
    if (!this.contexto) return;
    const persona = this.encargadoElegido() || this.contexto.cabo_id;
    const actual = this.contexto.jornada && this.contexto.jornada.id;
    const cuenta = {};
    this.jornadasTodas.forEach(j => {
      if (j.id === actual || !j.vehiculo_id || (j.encargado_id || j.cabo_id) !== persona) return;
      const c = cuenta[j.vehiculo_id] = cuenta[j.vehiculo_id] || { n: 0, ultima: '' };
      c.n += 1;
      if (String(j.fecha) > c.ultima) c.ultima = String(j.fecha);
    });
    const ids = Object.keys(cuenta).filter(id => (SRP.ref.catalogoPorId[id] || {}).activo)
      .sort((a, b) => cuenta[b].n - cuenta[a].n || cuenta[b].ultima.localeCompare(cuenta[a].ultima)).slice(0, 3);
    const esc = SRP.util.escapar, elegido = this.el('cie-vehiculo').value;
    caja.hidden = !ids.length;
    caja.innerHTML = ids.map(id => {
      const v = SRP.ref.catalogoPorId[id], n = cuenta[id].n;
      return '<button type="button" class="chip" data-id="' + esc(id) + '" aria-pressed="' + (elegido === id) + '" aria-label="' +
        esc(v.nombre + ', ' + v.modelo + ' ' + v.tipo_vehiculo + ', en ' + n + (n === 1 ? ' jornada' : ' jornadas')) + '">' +
        esc(v.nombre) + '<span class="chip-sub">' + esc(v.tipo_vehiculo || '') + '</span></button>';
    }).join('');
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
    // La jornada tal cual está guardada, con los datos de cierre encima
    const cierre = Object.assign({}, previo || c.jornada.dato || {}, {
      encargado_id: this.encargadoElegido(),
      editado_por_id: SRP.sesion.usuario.id,
      fecha_ultima_edicion: ahora
    });
    this.CAMPOS.forEach(k => { cierre[k] = this.el('cie-' + k).value.trim(); });
    // El vehículo, del catálogo; su placa, modelo y tipo se copian en la jornada para que el reporte
    // no cambie si después se corrige el catálogo. Sin vehículo, los tres quedan vacíos
    const v = SRP.ref.catalogoPorId[this.el('cie-vehiculo').value] || null;
    cierre.vehiculo_id = v ? v.id : null;
    cierre.vehiculo_placa = v ? v.nombre : '';
    cierre.vehiculo_modelo = v ? v.modelo || '' : '';
    cierre.vehiculo_tipo = v ? v.tipo_vehiculo || '' : '';
    delete cierre.vehiculo;   // el campo único de vehículo de versiones anteriores
    return cierre;
  },

  async aceptar() {
    const c = this.contexto;
    const previo = c.previo;
    if (!SRP.permisos.exigir('jornada.editar', previo || c.jornada.dato)) return;   // el cierre se guarda en la jornada
    // Aquí se guardan los datos del cierre; el reporte cuenta como generado al entregar el PDF
    const cierre = this.cierrePrevisto();

    await SRP.almacen.guardarConBitacora('jornadas', cierre,
      SRP.bitacora.entrada('EDITADO', 'jornada', cierre.id, 'Datos de cierre del reporte'));
    c.jornada.dato = cierre;

    this.el('dlg-cierre').close();
    this.mostrarPrevia(c.registros, cierre, c.fecha, c.cabo_id, c.jornada);
  },

  /* VISTA PREVIA DEL REPORTE. Lo mismo que dirá el PDF, en el mismo orden y con las mismas
     reglas (un apartado vacío no aparece), en pantalla y antes de generarlo: así se corrige un
     dato de cierre sin haber compartido todavía un documento equivocado. No es una imagen del
     PDF —en iPhone un PDF incrustado sólo enseña la primera página—, sino el mismo contenido. */
  /* DESCARGA SIN ESCRIBIR. Quien no puede modificar la jornada (el perfil Directivo) no llena el cierre
     ni genera el reporte: ve y descarga el que ya se generó, tal como quedó, y nada cambia en la jornada. */
  async descargar(registros, fecha, caboId, jornada) {
    if (!registros.length || !jornada) return;
    const cierre = await this.cierreDeJornada(jornada);
    if (!cierre || !cierre.reporte_en) { SRP.util.anunciar('Esta jornada todavía no tiene reporte generado.', 'aviso'); return; }
    this.mostrarPrevia(registros, cierre, fecha, caboId, jornada, true);
  },

  mostrarPrevia(registros, cierre, fecha, caboId, jornada, soloLectura) {
    this.vistaPrevia = { registros, cierre, fecha, cabo_id: caboId || '', jornada, soloLectura: !!soloLectura };
    this.el('btn-previa-corregir').hidden = !!soloLectura;
    this.el('btn-previa-generar').innerHTML = SRP.ICONOS.svg(soloLectura ? 'descargar' : 'palomita') + '<span>' + (soloLectura ? 'Descargar PDF' : 'Generar PDF') + '</span>';
    this.el('previa-hoja').innerHTML = this.htmlPrevia(registros, cierre, fecha, jornada);
    this.el('dlg-previa').showModal();
    // El croquis se arma aparte para no detener la vista previa mientras llegan los mosaicos
    this.ponerCroquisEnPrevia(registros);
  },

  async ponerCroquisEnPrevia(registros) {
    const caja = this.el('previa-croquis');
    if (!caja || !SRP.croquis) return;
    const c = await SRP.croquis.generar(registros);
    if (!caja.isConnected) return;   // la vista previa ya se cerró o se repintó
    if (!c) { caja.innerHTML = '<p class="previa-nota">No se pudo armar el croquis en este dispositivo.</p>'; return; }
    caja.innerHTML = '<img src="' + c.datos + '" alt="' + (registros.length === 1 ? 'Croquis de la jornada con su punto' : 'Croquis de la jornada con los ' + registros.length + ' puntos numerados') + '">' +
      '<p class="previa-nota">' + SRP.util.escapar(c.nota) + '</p>';
  },

  // «Jornada 2 de 3» bajo la fecha, sólo cuando el día tuvo más de una
  textoJornada(jornada) { return jornada && jornada.total > 1 ? 'Jornada ' + jornada.n + ' de ' + jornada.total : ''; },

  /* UN SOLO MODELO DEL REPORTE. Lo que dice el reporte se decide aquí una vez; la vista
     previa y el PDF sólo lo pintan, cada uno a su manera.

     ORDEN DEL REPORTE: el nombre del cabo y, en la misma franja, los datos que distinguen a la
     jornada (nombre, día, lugar, programa, hora, comentarios y observaciones); cinco cifras;
     1 croquis; 2 ejemplares plantados, con el comentario de cada árbol si alguno lo tiene;
     3 totales por especie, con la barra de su distribución; 4 personal; 5 vehículo; y al pie las
     notas. El croquis va primero para que quepa en la primera página. Cada dato dice su nombre en
     negritas («Chófer: …») y lo que está vacío no se imprime. El folio no va en el reporte. */
  modelo(registros, cierre, fecha, jornada) {
    const u = SRP.sesion.usuario;
    const hay = (k) => !!(cierre[k] && String(cierre[k]).trim());
    const lista = t => String(t || '').split('\n').map(x => x.trim()).filter(Boolean);
    const n = registros.length;
    const pct = (a, b) => b ? Math.round(a * 100 / b) : 0;
    const alcaldias = this.alcaldiasDe(registros);
    const alcaldia = cierre.alcaldia || alcaldias.join(', ');
    const programa = SRP.ref.nombreCatalogo(cierre.programa_id) ||
      [...new Set(registros.map(r => SRP.ref.nombreCatalogo(r.programa_id)).filter(Boolean))].join(', ');
    const meta = SRP.jornadas.previstosDe(cierre);
    const totales = this.totalesPorEspecie(registros);
    // Nativas: nativa o endémica en el catálogo, como en Supervisión
    const distribucion = this.DISTRIBUCION.map(d => ({ clave: d.clave, etiqueta: d.etiqueta,
      n: registros.filter(r => this.claseDistribucion(SRP.ref.especieDe(r).distribucion) === d.clave).length })).filter(d => d.n);
    this.porcentajes(distribucion.map(d => d.n), n).forEach((p, i) => { distribucion[i].pct = p; });
    // El de nativas es la suma de los de la gráfica, para que las dos cifras coincidan
    const nativasPct = distribucion.filter(d => d.clave === 'nativa' || d.clave === 'endemica').reduce((s, d) => s + d.pct, 0);
    const encargado = cierre.encargado_id || cierre.cabo_id || (registros[0] && registros[0].cabo_id) || '';
    // Institución que ejecutó: sin ella, la jornada es de antes de las instituciones, de la Secretaría
    const orgId = cierre.organizacion_id || SRP.CONFIG.ORGANIZACION_SEDEMA;
    const externa = !SRP.ref.esSedema(orgId);
    // Las diez especies con más ejemplares; si hay más, el resto junto
    // Hasta 11 especies se ven todas: agrupar una sola en «Otras» no ahorra nada
    const conGps = registros.filter(r => r.punto_origen === 'gps').length;
    /* COMENTARIOS: van en la tabla de ejemplares, en su
       propia columna, sólo si algún árbol tiene comentario */
    const conComentario = registros.some(r => this.textoComentario(r));
    const especieCon = e => e.comun + (e.cientifico ? ' (' + e.cientifico + ')' : '');
    // Una jornada de varios días dice sus días y cada árbol, el suyo
    const dias = SRP.util.diasJornada({ fecha }, registros), variosDias = dias.desde !== dias.hasta;
    // Relevo: quién más registró en la jornada y desde cuándo (el titular firma el reporte)
    // Prioridad de reforestación (modelo de priorización de colonias): la de la jornada, que es la de la colonia donde se ubicó
    const hayPri = SRP.prioritarias.hay();
    const priJornada = hayPri ? SRP.prioritarias.deJornada(registros, cierre) : null;
    const relevos = (cierre.relevos || []).filter(x => x.cabo_id !== cierre.cabo_id)
      .map(x => SRP.ref.nombreUsuario(x.cabo_id) + ', desde el ' + SRP.util.formatearFecha(SRP.indicadores.dia(x.fecha)));
    return {
      titulo: 'Reporte de la jornada de plantación',
      cabo: SRP.ref.nombreUsuario(encargado) || '',
      cifras: [
        { valor: String(n), texto: n === 1 ? 'árbol plantado' : 'árboles plantados' },
        { valor: meta === null ? '—' : String(meta), texto: 'previstos en la jornada' },
        { valor: meta ? pct(n, meta) + ' %' : '—', texto: 'de lo previsto' },
        { valor: String(totales.length), texto: totales.length === 1 ? 'especie' : 'especies' },
        // Toda endémica es nativa: la cifra lo dice, para no contradecir la distribución de abajo
        { valor: nativasPct + ' %', texto: 'nativas o endémicas' }
      ],
      // Datos de la jornada, bajo el nombre del cabo: [etiqueta, valor, ancho completo]
      identificacion: [
        ['Nombre de la jornada', cierre.nombre || (jornada && jornada.nombre) || ''],
        variosDias ? ['Días de la jornada', 'Del ' + SRP.util.fechaLarga(dias.desde).replace(/^./, c => c.toLowerCase()) + ' al ' + SRP.util.fechaLarga(dias.hasta).replace(/^./, c => c.toLowerCase())]
          : ['Día de la jornada', SRP.util.fechaLarga(fecha) + (this.textoJornada(jornada) ? ' · ' + this.textoJornada(jornada) : '')],
        ['Relevo de cabo', relevos.join('; ')],
        ['Alcaldía', alcaldia],
        ['Colonia', cierre.colonia || ''],
        ['Dirección de la jornada', cierre.ubicacion || ''],
        ['Programa', programa],
        // Sólo en una solicitud: quién lo solicitó y de qué se trata
        ['Solicitado por', SRP.solicitud.solicitante(cierre)],
        ['Descripción de la solicitud', SRP.solicitud.es(cierre) ? cierre.solicitud_descripcion || '' : ''],
        ['Prioridad de reforestación', hayPri ? SRP.prioritarias.textoJornada(priJornada).replace(/^Prioridad /, '').replace(/^./, c => c.toUpperCase()) : ''],
        // Los árboles que cayeron fuera de la colonia de la jornada, con la prioridad de la suya
        ['Árboles en otra colonia', hayPri ? SRP.prioritarias.textoOtras(registros, cierre, true) : ''],
        // La institución que ejecutó, también la Secretaría
        ['Institución que ejecuta', SRP.ref.nombreOrganizacion(orgId)],
        ['Hora de finalización', hay('hora') ? cierre.hora + ' h' : ''],
        // Dos textos libres de dos momentos: el nombre dice cuál es cuál
        ['Comentarios al iniciar', hay('comentarios') ? cierre.comentarios : '', true],
        ['Observaciones del cierre', hay('observaciones') ? lista(cierre.observaciones).join('\n') : '', true]
      ].filter(([, v]) => v && String(v).trim()),
      // Personal y vehículo, sólo de la Secretaría: de otra institución no se piden ni se imprimen
      personal: externa ? [] : [
        ['Personal participante', lista(cierre.personal).join('\n'), true],
        ['Personal de apoyo', lista(cierre.apoyo).join('\n'), true],
        ['Chófer', hay('chofer') ? cierre.chofer : '']
      ].filter(([, v]) => v),
      vehiculo: externa ? [] : [['Tipo', cierre.vehiculo_tipo], ['Modelo', cierre.vehiculo_modelo], ['Placas', cierre.vehiculo_placa]]
        .filter(([, v]) => v && String(v).trim()),
      /* Uno por renglón, en el orden en que se capturaron: el mismo número que en el croquis. La
         especie lleva el nombre científico entre paréntesis; la precisión, su nivel para el
         color (verde buena, ámbar aceptable, rojo baja). */
      ejemplares: {
        cabecera: ['N.º', 'Especie', 'Coordenada', 'Precisión'].concat(variosDias ? ['Fecha'] : [], conComentario ? ['Comentario'] : []),
        filas: registros.map((r, i) => [String(i + 1), especieCon(SRP.ref.especieDe(r)), this.textoCoordenada(r), this.textoPrecision(r)]
          .concat(variosDias ? [SRP.util.formatearFecha(r.fecha_plantacion)] : [], conComentario ? [this.textoComentario(r)] : [])),
        niveles: registros.map(r => this.nivelPrecision(r)),
        especies: registros.map(r => { const e = SRP.ref.especieDe(r); return [e.comun, e.cientifico || '']; })
      },
      notaPrecision: 'Precisión del GPS: en verde, ±' + SRP.CONFIG.MAPA.PRECISION_BUENA_M + ' m o menos; en ámbar, hasta ±' + SRP.CONFIG.MAPA.PRECISION_ACEPTABLE_M +
        ' m; en rojo, más de ±' + SRP.CONFIG.MAPA.PRECISION_ACEPTABLE_M + ' m (conviene revisar el punto). «En el mapa» y «A mano» no tienen medida del GPS.',
      totales,
      total: n,
      graficas: { distribucion },
      notaTotales: 'El conteo se calcula a partir de los registros del sistema; no se captura a mano.' +
        (totales.reduce((x, t) => x + t.pct, 0) === 100 ? '' : ' Los porcentajes están redondeados: especies con la misma cantidad llevan el mismo porcentaje.'),
      /* CALIDAD DE LA UBICACIÓN. Con la fotografía opcional, la coordenada es la prueba: quien lea el
         reporte merece saber de qué clase de coordenada se trata. */
      gps: 'Ubicados con GPS del dispositivo: ' + conGps + ' de ' + n + ' (' + pct(conGps, n) + ' %).',
      generado: 'Generado por ' + SRP.util.nombreCompleto(u) + ' (' + SRP.permisos.de(u).etiqueta + ').',
      /* La cifra del sistema no es la cifra del programa: se registra lo que alcanza a registrarse.
         Decirlo en el documento protege a quien lo firma. */
      advertencia: 'Cifra de ejemplares registrados en el sistema para esta jornada. No equivale necesariamente al total plantado en ella.',
      ficticio: SRP.CONFIG.ES_FICTICIO ? 'Documento de prueba con datos ficticios. Sin validez oficial.' : ''
    };
  },

  /* Tipos de distribución del catálogo (SNIB), en el orden de las gráficas; su color lo da la hoja.
     Colores lógicos: lo propio del lugar en verde, lo que amenaza en rojo; `oscuro` pide texto
     oscuro encima (el blanco sobre el dorado daba 3.0:1). */
  DISTRIBUCION: [
    { clave: 'nativa', etiqueta: 'Nativa', color: 'exito' },
    { clave: 'endemica', etiqueta: 'Endémica', color: 'dist-endemica' },
    { clave: 'exotica', etiqueta: 'Exótica', color: 'pdf-dorado', oscuro: true },
    { clave: 'invasora', etiqueta: 'Exótica-Invasora', color: 'error' },
    { clave: 'otra', etiqueta: 'Sin dato (otra especie)', color: 'dist-sin-dato', oscuro: true }
  ],
  claseDistribucion(d) {
    const t = SRP.util.normalizar(d || '');
    return t.startsWith('nativa') ? 'nativa' : t.startsWith('endemica') ? 'endemica' : t.includes('invasora') ? 'invasora' : t.startsWith('exotica') ? 'exotica' : 'otra';
  },
  // El comentario en un solo párrafo por renglón: sin espacios de sobra ni renglones vacíos
  textoComentario(r) { return String(r.comentarios || '').split('\n').map(t => t.replace(/\s+/g, ' ').trim()).filter(Boolean).join('\n'); },
  textoCoordenada(r) { return typeof r.lat === 'number' && typeof r.lng === 'number' ? r.lat.toFixed(6) + ', ' + r.lng.toFixed(6) : ''; },
  // «±6 m» con GPS; con el mapa o a mano no hay margen que decir
  // Nivel de la precisión para el color del reporte: el mismo corte que el resto de la app
  nivelPrecision(r) {
    if (r.punto_origen !== 'gps' || r.gps_precision_m == null) return 'sin';
    return SRP.mapa.nivelPrecision(r.gps_precision_m).nivel;
  },

  textoPrecision(r) {
    if (r.punto_origen === 'gps') return r.gps_precision_m != null ? '±' + Math.round(r.gps_precision_m) + ' m' : 'GPS';
    return r.punto_origen === 'mapa' ? 'En el mapa' : 'A mano';
  },

  // La vista previa pinta el modelo en HTML, en el mismo orden que el PDF
  htmlPrevia(registros, cierre, fecha, jornada) {
    const m = this.modelo(registros, cierre, fecha, jornada);
    const esc = t => SRP.util.escapar(t);
    let num = 0;
    const apartado = (titulo, cuerpo) => '<section class="previa-apartado"><h3>' + (++num) + '. ' + esc(titulo) + '</h3>' + cuerpo + '</section>';
    // «Etiqueta:» en negritas; un valor de varios renglones va como lista debajo
    const dato = ([et, val, completo]) => {
      const renglones = String(val).split('\n');
      return '<div class="previa-dato' + (completo ? ' previa-dato-completo' : '') + '"><b>' + esc(et) + ':</b>' +
        (renglones.length > 1 ? '<ul class="previa-lista">' + renglones.map(r => '<li>' + esc(r) + '</li>').join('') + '</ul>' : ' ' + esc(val)) + '</div>';
    };
    const datos = (lista, clase) => '<div class="previa-datos' + (clase ? ' ' + clase : '') + '">' + lista.map(dato).join('') + '</div>';
    const nota = t => '<p class="previa-nota">' + esc(t) + '</p>';
    let h = '<p class="previa-titulo">' + esc(m.titulo) + '</p>';
    // El cabo y, en la misma franja, los datos que distinguen a la jornada
    h += '<div class="previa-responsable">' + (m.cabo ? '<p class="previa-cabo"><b>Nombre del cabo:</b> ' + esc(m.cabo) + '</p>' : '') + datos(m.identificacion) + '</div>';
    h += '<div class="previa-cifras">' + m.cifras.map(c => '<div class="previa-cifra"><b>' + esc(c.valor) + '</b><span>' + esc(c.texto) + '</span></div>').join('') + '</div>';
    // Croquis de la jornada: se llena cuando la imagen está lista
    h += apartado('Croquis de la jornada', '<div id="previa-croquis" class="previa-croquis" aria-live="polite"><p class="previa-nota">Preparando el croquis…</p></div>');
    const ej = m.ejemplares;
    h += apartado('Ejemplares plantados', '<div class="previa-tabla-caja"><table class="previa-tabla"><thead><tr>' + ej.cabecera.map((c, k) => '<th' + (k === 0 ? ' class="cifra"' : '') + '>' + esc(c) + '</th>').join('') + '</tr></thead><tbody>' +
      ej.filas.map((f, i) => '<tr>' + f.map((c, k) => k === 0 ? '<td class="cifra">' + esc(c) + '</td>'
        : k === 1 ? '<td>' + esc(ej.especies[i][0]) + (ej.especies[i][1] ? ' (<i>' + esc(ej.especies[i][1]) + '</i>)' : '') + '</td>'
        : k === 3 ? '<td class="previa-precision" data-nivel="' + ej.niveles[i] + '">' + esc(c) + '</td>'
        : ej.cabecera[k] === 'Comentario' ? '<td class="previa-comentario">' + esc(c) + '</td>' : '<td>' + esc(c) + '</td>').join('') + '</tr>').join('') + '</tbody></table></div>' +
      nota(m.notaPrecision));
    h += apartado('Totales por especie', '<div class="previa-tabla-caja"><table class="previa-tabla"><thead><tr><th>Especie</th><th>Distribución</th><th class="cifra">Ejemplares</th><th class="cifra">% del total</th></tr></thead><tbody>' +
      m.totales.map(t => '<tr><td>' + esc(t.comun) + (t.cientifico ? ' (<i>' + esc(t.cientifico) + '</i>)' : '') + '</td><td>' + esc(t.distribucion || '—') + '</td><td class="cifra">' + t.n + '</td><td class="cifra">' + t.pct + ' %</td></tr>').join('') +
      '</tbody><tfoot><tr><td>Total</td><td></td><td class="cifra">' + m.total + '</td><td class="cifra">100 %</td></tr></tfoot></table></div>' + nota(m.notaTotales) + this.htmlDistribucion(m));
    // Personal y vehículo al final: así el croquis cabe en la primera página, como en las demás instituciones
    if (m.personal.length) h += apartado('Personal', datos(m.personal));
    if (m.vehiculo.length) h += apartado('Datos del vehículo', datos(m.vehiculo, 'previa-datos-tres'));
    h += '<div class="previa-pie"><p>' + [m.gps, m.advertencia, m.generado].filter(Boolean).map(esc).join('</p><p>') + '</p>' +
      (m.ficticio ? '<p class="previa-ficticio">' + esc(m.ficticio) + '</p>' : '') + '</div>';
    return h;
  },

  /* La distribución de las especies, en una barra apilada bajo los totales, sin sección propia: la
     columna «Distribución» ya la dice por especie; la barra la resume. */
  htmlDistribucion(m) {
    const esc = SRP.util.escapar, g = m.graficas;
    let x = 0;
    const gr = '<div class="previa-grafica">' +
      '<svg class="previa-apilada" viewBox="0 0 100 10" preserveAspectRatio="none" aria-hidden="true" focusable="false">' +
      g.distribucion.map(d => { const w = d.n * 100 / m.total; const r = '<rect class="dist-' + d.clave + '" x="' + x.toFixed(2) + '" width="' + w.toFixed(2) + '" height="10"></rect>'; x += w; return r; }).join('') + '</svg>' +
      '<ul class="previa-leyenda">' + g.distribucion.map(d => '<li><span class="previa-muestra dist-' + d.clave + '"></span>' + esc(d.etiqueta) + ': <b>' + d.pct + ' %</b> (' + d.n + ')</li>').join('') + '</ul></div>';
    return gr;
  },

  /* ---------- El documento ---------- */

  // Conteo por especie, de mayor a menor. Se calcula siempre: nunca se captura (Norma 10.2)
  totalesPorEspecie(registros) {
    const m = new Map();
    registros.forEach(r => {
      const e = SRP.ref.especieDe(r);
      const clave = e.comun + '|' + e.cientifico;
      const t = m.get(clave) || { comun: e.comun, cientifico: e.cientifico, distribucion: e.distribucion || '', n: 0 };
      t.n += 1; m.set(clave, t);
    });
    const lista = [...m.values()].sort((a, b) => b.n - a.n || a.comun.localeCompare(b.comun, 'es'));
    // El porcentaje del total, entero, y que sumen 100
    this.porcentajes(lista.map(t => t.n), registros.length).forEach((p, i) => { lista[i].pct = p; });
    return lista;
  },

  /* Porcentajes enteros por el método del resto mayor: redondeados uno por uno, 69 + 13 + 19 daban
     101 % en el mismo papel que dice «Total 100 %». Cantidades iguales llevan siempre el mismo
     porcentaje: el punto que sobra se reparte a un grupo de iguales completo o a ninguno;
     si no alcanza para el grupo, la suma queda uno o dos puntos abajo y el reporte lo advierte. */
  porcentajes(ns, total) {
    if (!total) return ns.map(() => 0);
    const exactos = ns.map(n => n * 100 / total), base = exactos.map(Math.floor);
    let falta = 100 - base.reduce((a, b) => a + b, 0);
    const grupos = {};
    ns.forEach((n, i) => { (grupos[n] = grupos[n] || []).push(i); });
    Object.values(grupos).sort((a, b) => (exactos[b[0]] - base[b[0]]) - (exactos[a[0]] - base[a[0]]) || ns[a[0]] - ns[b[0]]).forEach(g => {
      if (exactos[g[0]] - base[g[0]] > 0 && falta >= g.length) { g.forEach(i => { base[i] += 1; }); falta -= g.length; }
    });
    return base;
  },

  // Alcaldías de los árboles de la jornada: el sistema ya las derivó del punto, no se preguntan
  alcaldiasDe(registros) {
    return [...new Set(registros.map(r => r.alcaldia).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'es'));
  },

  /* El logotipo del PDF es el mismo archivo del encabezado, siempre la versión completa
     aunque el teléfono muestre el recorte; el service worker lo tiene, así que también sale sin señal. */
  cargarLogo() {
    return new Promise((resolver) => {
      const img = new Image();
      img.onload = () => resolver(img);
      img.onerror = () => resolver(null);
      img.src = 'assets/encabezado-ru-sia.png?v=' + encodeURIComponent(SRP.CONFIG.VERSION);
    });
  },

  /* La letra del PDF es Roboto, la misma de la pantalla, incrustada en el archivo: así una letra
     fuera del alfabeto básico (una «ā» en un nombre científico) se escribe bien y el documento se
     ve igual en cualquier lector. Los tres archivos se leen una vez y el service worker los
     tiene, así que también hay sin señal. Si no se pudieran leer, el PDF sale con Helvetica. */
  FUENTES_PDF: [['normal', 'roboto-regular'], ['bold', 'roboto-bold'], ['italic', 'roboto-italic']],
  leerFuentes() {
    if (!this._fuentes) {
      this._fuentes = Promise.all(this.FUENTES_PDF.map(async ([estilo, archivo]) => {
        const r = await fetch('vendor/fuentes/' + archivo + '.ttf');
        if (!r.ok) throw new Error('sin tipografía');
        const b = new Uint8Array(await r.arrayBuffer());
        let t = '';
        for (let i = 0; i < b.length; i += 8192) t += String.fromCharCode.apply(null, b.subarray(i, i + 8192));
        return { estilo, archivo: archivo + '.ttf', datos: btoa(t) };
      })).catch(() => { this._fuentes = null; return null; });
    }
    return this._fuentes;
  },
  // Deja Roboto puesta en el documento y devuelve el nombre de la letra con que se escribe
  async ponerFuentes(doc) {
    const fuentes = await this.leerFuentes();
    if (!fuentes) return 'helvetica';
    fuentes.forEach(f => { doc.addFileToVFS(f.archivo, f.datos); doc.addFont(f.archivo, 'Roboto', f.estilo); });
    doc.setFont('Roboto', 'normal');
    return 'Roboto';
  },

  /* El PNG con transparencia se incrustaba sin comprimir y era casi todo el peso del PDF. Se pasa
     a JPEG sobre blanco (el fondo del papel), a la misma resolución: no se nota la diferencia. */
  logoJPEG(img) {
    const c = document.createElement('canvas');
    c.width = img.naturalWidth; c.height = img.naturalHeight;
    const g = c.getContext('2d');
    g.fillStyle = SRP.util.colorBase('fondo'); g.fillRect(0, 0, c.width, c.height);
    g.drawImage(img, 0, 0);
    return c.toDataURL('image/jpeg', 0.9);
  },

  async generar(registros, cierre, fecha, jornada) {
    if (!window.jspdf) { SRP.util.anunciar('No se pudo cargar el generador de PDF.', 'alerta'); return; }
    const logo = await this.cargarLogo();
    const m = this.modelo(registros, cierre, fecha, jornada);   // lo mismo que la vista previa
    // compress: con el logotipo en JPEG el archivo queda en menos de 150 KB y se comparte por mensajería
    const doc = new window.jspdf.jsPDF({ unit: 'mm', format: 'letter', compress: true });
    const ancho = doc.internal.pageSize.getWidth();
    const alto = doc.internal.pageSize.getHeight();
    const C = this.colores();
    const M = 18;                       // margen izquierdo y derecho
    const util = ancho - M * 2;
    const hoy = new Date();
    const F = await this.ponerFuentes(doc);
    const letra = (estilo, tam, color) => { doc.setFont(F, estilo); doc.setFontSize(tam); doc.setTextColor(...color); };
    let y = 0;
    // El pie va en alto − 16: un bloque cabe si termina antes de alto − 20
    const salto = (necesario) => { if (y + necesario > alto - 20) { doc.addPage(); y = 20; } };

    /* ENCABEZADO. El logotipo se fija por su alto. Debajo, el título y el nombre del cabo en
       una franja: es lo primero que se lee del papel. */
    if (logo) { const hLogo = 9.3; doc.addImage(this.logoJPEG(logo), 'JPEG', M, 12, hLogo * logo.naturalWidth / logo.naturalHeight, hLogo); }
    doc.setDrawColor(...C.guinda); doc.setLineWidth(0.5); doc.line(M, 26, ancho - M, 26);
    letra('bold', 14, C.guinda);
    doc.text(m.titulo.toUpperCase(), ancho / 2, 34.5, { align: 'center' });
    y = 39;

    // Encabezado de cada sección: franja guinda con su número (el mismo de la vista previa)
    let num = 0;
    const seccion = (titulo, minimo) => {
      salto(11 + (minimo || 14));
      doc.setFillColor(...C.guinda); doc.roundedRect(M, y, util, 7.2, 1.2, 1.2, 'F');
      letra('bold', 9.5, C.blanco); doc.text((++num) + '.  ' + titulo.toUpperCase(), M + 3.5, y + 4.9);
      y += 10.5;
    };
    /* DATOS «Etiqueta: valor» con la etiqueta en negritas, en columnas; lo largo (comentarios,
       observaciones, listas de personal) ocupa el renglón entero y sus renglones van debajo */
    /* `caja`: dentro de la franja del cabo, con sangría y sin filetes; `medir` sólo devuelve
       el alto, para dibujar primero el fondo de la franja */
    const datos = (items, columnas, caja, medir) => {
      const san = caja ? 4 : 0, X0 = M + san, anchoU = util - 2 * san;
      const sep = 6, colW = (anchoU - sep * (columnas - 1)) / columnas;
      let alto0 = 0;
      const filas = [];
      let fila = [];
      items.forEach(it => {
        if (it[2]) { if (fila.length) filas.push(fila); filas.push([it]); fila = []; return; }
        fila.push(it);
        if (fila.length === columnas) { filas.push(fila); fila = []; }
      });
      if (fila.length) filas.push(fila);
      filas.forEach(f => {
        const completo = f.length === 1 && f[0][2];
        const bloques = f.map(([et, val]) => {
          letra('bold', 9, C.tinta);
          const lw = doc.getTextWidth(et + ':') + 1.8;
          letra('normal', 9.5, C.tinta);
          const varios = String(val).includes('\n');
          const lineas = varios ? [].concat(...String(val).split('\n').map(t => doc.splitTextToSize('•  ' + t, (completo ? anchoU : colW) - 6)))
            : doc.splitTextToSize(String(val), (completo ? anchoU : colW) - lw);
          return { et, lw, lineas, varios };
        });
        const h = Math.max(...bloques.map(b => (b.varios ? b.lineas.length + 1 : b.lineas.length))) * 4.4 + (caja ? 1.2 : 2.4);
        if (medir) { alto0 += h + (caja ? 0.6 : 1.8); return; }
        if (!caja) salto(h + 1);
        bloques.forEach((b, i) => {
          const x = X0 + i * (colW + sep);
          letra('bold', 9, C.tinta); doc.text(b.et + ':', x, y + 3.9);
          letra('normal', 9.5, C.tinta);
          if (b.varios) b.lineas.forEach((l, k) => doc.text(l, x + 4, y + 3.9 + (k + 1) * 4.4));
          else doc.text(b.lineas, x + b.lw, y + 3.9, { lineHeightFactor: 1.3 });
        });
        if (!caja) { doc.setDrawColor(...C.linea); doc.setLineWidth(0.2); doc.line(M, y + h, M + util, y + h); }
        y += h + (caja ? 0.6 : 1.8);
      });
      if (medir) return alto0;
      if (!caja) y += 3;
    };
    const tabla = (opciones) => {
      doc.autoTable(Object.assign({
        startY: y, margin: { left: M, right: M, bottom: 22, top: 20 },
        styles: { font: F, fontSize: 8.5, cellPadding: 1.6, textColor: C.tinta, lineColor: C.linea },
        headStyles: { fillColor: C.guinda, textColor: 255, fontStyle: 'bold' },
        footStyles: { fillColor: C.total, textColor: C.tinta, fontStyle: 'bold' },
        alternateRowStyles: { fillColor: C.fila }
      }, opciones));
      y = doc.lastAutoTable.finalY + 4;
    };

    /* LA FRANJA DEL CABO: el nombre del cabo y, en el mismo estilo, los datos que distinguen a
       la jornada. Primero se mide para pintar el fondo, luego se escribe. */
    const altoDatos = m.identificacion.length ? datos(m.identificacion, 2, true, true) : 0;
    const altoCab = (m.cabo ? 9 : 2) + altoDatos + 2;
    doc.setFillColor(...C.suave); doc.roundedRect(M, y, util, altoCab, 1.5, 1.5, 'F');
    const yCaja = y;
    if (m.cabo) {
      letra('bold', 10, C.guinda); doc.text('Nombre del cabo:', M + 4, y + 6.6);
      const lw = doc.getTextWidth('Nombre del cabo:') + 2;
      letra('bold', 11, C.tinta); doc.text(doc.splitTextToSize(m.cabo, util - lw - 8)[0], M + 4 + lw, y + 6.6);
      y += 9;
    } else y += 2;
    if (m.identificacion.length) datos(m.identificacion, 2, true);
    y = yCaja + altoCab + 4;
    // Cinco cifras de un vistazo
    const nc = m.cifras.length, hueco = 3, wc = (util - hueco * (nc - 1)) / nc;
    m.cifras.forEach((c, i) => {
      const x = M + i * (wc + hueco);
      doc.setDrawColor(...C.linea); doc.setLineWidth(0.3); doc.roundedRect(x, y, wc, 16, 1.5, 1.5, 'S');
      letra('bold', 15, C.guinda); doc.text(c.valor, x + wc / 2, y + 7.8, { align: 'center' });
      letra('normal', 7.5, C.gris); doc.text(c.texto, x + wc / 2, y + 12.8, { align: 'center' });
    });
    y += 22;

    // Croquis de la jornada: encuadra todos los puntos solo; si no cabe, pasa a la siguiente página
    const croquis = SRP.croquis ? await SRP.croquis.generar(registros) : null;
    if (croquis) {
      /* A todo el ancho; si en lo que queda de la página cabe al menos a dos tercios, se reduce y
         se centra en vez de dejar media hoja en blanco */
      let anchoImg = util, altoImg = util * SRP.croquis.ALTO / SRP.croquis.ANCHO;
      const queda = alto - 20 - y - 10.5 - 10;
      if (queda < altoImg && queda >= altoImg * 0.66) { altoImg = queda; anchoImg = altoImg * SRP.croquis.ANCHO / SRP.croquis.ALTO; }
      seccion('Croquis de la jornada', altoImg + 8);
      const xImg = M + (util - anchoImg) / 2;
      doc.addImage(croquis.datos, croquis.formato, xImg, y, anchoImg, altoImg, undefined, 'FAST');
      doc.setDrawColor(...C.linea); doc.setLineWidth(0.3); doc.rect(xImg, y, anchoImg, altoImg);
      letra('italic', 7.5, C.gris);
      const pie = doc.splitTextToSize(croquis.nota, util);
      doc.text(pie, M, y + altoImg + 4);
      y += altoImg + 4 + pie.length * 3.4 + 4;
    }

    // Ejemplares: uno por renglón, en el orden en que se capturaron (el número del croquis)
    seccion('Ejemplares plantados', 20);
    // La precisión en color por su nivel: verde buena, ámbar aceptable, rojo baja
    const colorNivel = { buena: C.exito, aceptable: C.atencion, baja: C.error };
    tabla({ head: [m.ejemplares.cabecera.map((c, k) => k === 0 ? { content: c, styles: { halign: 'right' } } : c)], body: m.ejemplares.filas,
      columnStyles: { 0: { cellWidth: 11, halign: 'right' }, 2: { cellWidth: 38 }, 3: { cellWidth: 20 } },
      didParseCell: d => { if (d.section === 'body' && d.column.index === 3 && colorNivel[m.ejemplares.niveles[d.row.index]]) { d.cell.styles.textColor = colorNivel[m.ejemplares.niveles[d.row.index]]; d.cell.styles.fontStyle = 'bold'; } } });
    letra('italic', 7.5, C.gris); { const l = doc.splitTextToSize(m.notaPrecision, util); salto(l.length * 3.4 + 2); doc.text(l, M, y); y += l.length * 3.4 + 4; }

    // Totales por especie, con su distribución y el porcentaje del total: calculados
    seccion('Totales por especie', 20);
    tabla({ head: [['Especie', 'Distribución', { content: 'Ejemplares', styles: { halign: 'right' } }, { content: '% del total', styles: { halign: 'right' } }]],
      body: m.totales.map(t => [t.comun + (t.cientifico ? ' (' + t.cientifico + ')' : ''), t.distribucion || '—', String(t.n), t.pct + ' %']),
      // Las cifras del total se alinean como las de arriba: el pie no hereda columnStyles
      foot: [['Total', '', { content: String(m.total), styles: { halign: 'right' } }, { content: '100 %', styles: { halign: 'right' } }]],
      columnStyles: { 1: { cellWidth: 34 }, 2: { halign: 'right', cellWidth: 22 }, 3: { halign: 'right', cellWidth: 22 } } });
    letra('italic', 7.5, C.gris); doc.text(m.notaTotales, M, y); y += 6;

    /* La distribución de las especies, bajo los totales y sin sección propia (la columna «Distribución» ya
       la dice por especie): una barra dibujada con trazos, que pesa casi nada y se lee igual en gris */
    const g = m.graficas;
    salto(24);
    letra('bold', 9, C.tinta); doc.text('Distribución de las especies', M, y + 3); y += 5.5;
    let x = M;
    g.distribucion.forEach(d => {
      const w = util * d.n / m.total;
      doc.setFillColor(...C.dist[d.clave]); doc.rect(x, y, w, 7, 'F');
      const oscuro = (this.DISTRIBUCION.find(t => t.clave === d.clave) || {}).oscuro;
      if (w > 12) { letra('bold', 8, oscuro ? C.tinta : C.blanco); doc.text(d.pct + ' %', x + w / 2, y + 4.7, { align: 'center' }); }
      x += w;
    });
    y += 10;
    x = M;
    g.distribucion.forEach(d => {
      const t = d.etiqueta + ': ' + d.pct + ' % (' + d.n + ')';
      letra('normal', 8.5, C.tinta);
      const w = doc.getTextWidth(t) + 9;
      if (x + w > M + util) { x = M; y += 5.2; salto(6); }
      doc.setFillColor(...C.dist[d.clave]); doc.rect(x, y + 0.6, 3.4, 3.4, 'F');
      doc.text(t, x + 5, y + 3.6);
      x += w;
    });
    y += 9;

    // Personal y vehículo, al final: así el croquis cabe en la primera página
    if (m.personal.length) { seccion('Personal'); datos(m.personal, 2); }
    if (m.vehiculo.length) { seccion('Datos del vehículo'); datos(m.vehiculo, 3); }

    // Notas al pie del contenido: calidad de la ubicación, capas, lo que la cifra no dice y quién lo generó
    // Con qué capas se derivó el territorio no se imprime: se guarda en cada árbol (capa_version)
    const notas = [m.gps, m.advertencia, m.generado].filter(Boolean);
    letra('normal', 8, C.gris);
    const lineasNotas = [].concat(...notas.map(t => doc.splitTextToSize(t, util)));
    salto(6 + lineasNotas.length * 3.8 + (m.ficticio ? 6 : 0));
    y += 2;
    doc.setDrawColor(...C.linea); doc.setLineWidth(0.2); doc.line(M, y, M + util, y); y += 4.5;
    lineasNotas.forEach(l => { doc.text(l, M, y); y += 3.8; });
    if (m.ficticio) { letra('bold', 8, C.ficticio); doc.text(m.ficticio, M, y + 2); }

    // Pie en todas las páginas
    const paginas = doc.getNumberOfPages();
    const sello = 'SEDEMA, Sistema de Registro de Plantaciones. Generado el ' + SRP.util.formatearFechaHora(hoy.toISOString());
    for (let p = 1; p <= paginas; p++) {
      doc.setPage(p);
      doc.setDrawColor(...C.dorado); doc.setLineWidth(0.4); doc.line(M, alto - 16, ancho - M, alto - 16);
      letra('normal', 8, C.gris);
      doc.text(sello, M, alto - 11);
      doc.text('Página ' + p + ' de ' + paginas, ancho / 2, alto - 6, { align: 'center' });
    }

    await this.entregar(doc, this.nombreArchivo(cierre, fecha, jornada), cierre, jornada);
  },

  /* Nombre del PDF: «Reporte», quién responde del reporte y la fecha del reporte, p. ej.
     Reporte_Perengano_Gomez_Ejemplo_2026-09-22.pdf. La persona es el encargado del cierre; si no
     lo hay, el cabo de la jornada; si tampoco, quien genera (el coordinador que saca el de
     toda su cuadrilla). Sin acentos ni espacios, para que ningún sistema de archivos lo altere. */
  nombreArchivo(cierre, fecha, jornada) {
    const cabo = this.contexto ? this.contexto.cabo_id : '';
    const id = (cierre && cierre.encargado_id) || cabo || SRP.sesion.usuario.id;
    const nombre = (SRP.ref.nombreUsuario(id) || 'SRP').normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^A-Za-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
    // Con más de una jornada en el día, el número va en el nombre: Reporte_Fulana_2026-09-23_J2.pdf
    return 'Reporte_' + nombre + '_' + fecha + (jornada && jornada.total > 1 ? '_J' + jornada.n : '') + '.pdf';
  },

  /* En teléfono o tableta, compartir con las apps del dispositivo; en escritorio, descargar.
     Windows también ofrece «compartir archivos» desde Chrome y Edge, y abre su panel de Compartir
     en vez de guardar el PDF (el destino de Acrobat de ese panel recibe el archivo vacío). Táctil
     sin ratón es el criterio, no el tamaño de la pantalla. */
  esDispositivoTactil() {
    return window.matchMedia && window.matchMedia('(hover: none) and (pointer: coarse)').matches;
  },

  /* El reporte cuenta como generado cuando el PDF se entregó (se descargó o se compartió), no al
     abrir la vista previa: así Supervisión no da por reportada una jornada sin documento. */
  async marcarGenerado(cierre, jornada) {
    const guardada = cierre && cierre.id ? await SRP.almacen.uno('jornadas', cierre.id) : null;
    if (!guardada) return;
    const ahora = SRP.util.ahoraISO();
    await SRP.almacen.guardarConBitacora('jornadas', Object.assign({}, guardada, { reporte_en: ahora }),
      SRP.bitacora.entrada('EDITADO', 'jornada', guardada.id, guardada.reporte_en ? 'Reporte generado de nuevo' : 'Reporte generado'));
    cierre.reporte_en = ahora;
    if (jornada && jornada.dato) jornada.dato.reporte_en = ahora;
  },

  /* El reporte vale para lo que la jornada tenía al generarlo. Si después se elimina, restaura,
     edita, mueve o sustituye uno de sus árboles, deja de contar como generado y hay que generarlo
     de nuevo. Devuelve las escrituras, para guardarlas junto con el cambio que lo causa. */
  async caducar(ids, motivo) {
    const u = SRP.sesion.usuario, ahora = SRP.util.ahoraISO(), cambios = [];
    for (const id of [...new Set((ids || []).filter(Boolean))]) {
      const j = await SRP.almacen.uno('jornadas', id);
      if (j && j.reporte_en) cambios.push({ almacen: 'jornadas', objeto: Object.assign({}, j, { reporte_en: null, editado_por_id: u.id, fecha_ultima_edicion: ahora }),
        bitacora: SRP.bitacora.entrada('EDITADO', 'jornada', id, 'Su reporte deja de estar vigente: ' + motivo) });
    }
    return cambios;
  },

  async entregar(doc, nombre, cierre, jornada) {
    const entregado = await this.entregarArchivo(doc.output('blob'), nombre, 'Reporte diario de plantación');
    if (entregado === 'cancelado') return;
    // Una descarga de sólo lectura entrega el documento y no toca la jornada
    if (this.vistaPrevia && this.vistaPrevia.soloLectura) { SRP.util.anunciar(entregado === 'descarga' ? 'Reporte descargado: ' + nombre + '.' : 'Reporte compartido.', 'exito'); return; }
    await this.marcarGenerado(cierre, jornada);
    /* Cierre del ciclo: el reporte es el último paso de la jornada, así que el aviso dice si
       quedó completa o, si todavía hay puntos por revisar, qué falta. */
    let cola = '', completa = true;
    if (jornada && jornada.registros && cierre) {
      const p = SRP.jornadas.pasos(jornada, cierre);
      completa = p.actual === 'completa';
      cola = completa ? ' La jornada «' + jornada.nombre + '» quedó completa.' : ' ' + SRP.jornadas.siguiente(p, true).texto;
    }
    SRP.util.anunciar((entregado === 'descarga' ? 'Reporte generado y descargado: ' + nombre + '.' : 'Reporte generado y compartido.') + cola, completa ? 'exito' : 'aviso');
    // La ficha de la lista pasa a «reporte generado hoy a las …» sin salir y volver
    // La ficha y la lista de Jornadas dicen en seguida que el reporte ya se generó
    if (SRP.app.vista === 'jornadas') await SRP.jornadas.refrescar();
  },

  /* Cualquier archivo —el PDF del reporte o un informe— se entrega igual: compartir en táctil,
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

// Acciones que escriben en el teléfono: si fallan, se dice qué no se pudo hacer
SRP.util.proteger(SRP.reportes, { aceptar: 'guardar los datos del cierre' });
