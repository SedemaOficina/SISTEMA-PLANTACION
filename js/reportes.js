/* REPORTE DIARIO DE PLANTACIÓN.
   Dos piezas: el formulario de cierre —lo que no está en los registros y sólo va al documento— y
   el PDF que lo arma.

   POR QUÉ UN SOLO DÍA. El reporte es de la jornada: así se escribe hoy en campo, un
   reporte por día y por cuadrilla. Un reporte que abarcara un mes no tendría chófer ni hora de
   finalización ni observaciones que valieran para todo el periodo, y esos campos son la mitad del
   documento. Los filtros de mes, año y rango siguen sirviendo para mirar la lista; para generar
   el reporte hay que estar parado en un día.

   POR QUÉ UN FORMULARIO APARTE Y NO UN ENCABEZADO DE JORNADA. Lo pidió Liber así: el chófer, la
   hora de finalización y las observaciones se saben al cerrar el día, no al llegar al frente.
   Pedirlos antes obliga a volver a abrirlos después. Se capturan al generar el reporte, que es
   cuando la persona ya tiene esos datos enfrente.

   QUÉ NO ENTRA AQUÍ. Todo lo que ya vive en los registros: especies, conteos y territorio se
   calculan, nunca se teclean. Un total escrito a mano es un total que se puede equivocar. */
window.SRP = window.SRP || {};

SRP.reportes = {
  // Los colores del PDF son los de la hoja, sin el modo sol (M13)
  colores() {
    const c = n => SRP.util.rgb(n);
    return { guinda: c('guinda'), dorado: c('dorado'), gris: c('gris'), fila: c('fondo-suave'), tinta: c('texto'), total: c('total-fondo'), ficticio: c('aviso-ficticio') };
  },

  /* Campos del cierre. Todos opcionales y de texto libre: los reportes varían de una cuadrilla a
     otra y de un día a otro, y encajonarlos obligaría a escribir de una forma que no es la suya.
     El encargado no está en esta lista porque no se escribe: sale de la sesión. */
  CAMPOS: ['personal', 'apoyo', 'observaciones', 'chofer', 'vehiculo_modelo', 'vehiculo_placa', 'hora'],

  contexto: null,   // { registros, fecha, cabo_id } de lo que se va a reportar

  el(id) { return document.getElementById(id); },

  iniciar() {
    this.el('form-cierre').addEventListener('submit', (e) => { e.preventDefault(); this.aceptar(); });
    // Lista de jornadas cerradas con su reporte (D134)
    SRP.util.atajos.iniciar(this.el('pdf-atajos'), a => this.aplicarAtajo(a));   // M15
    // Los informes por periodo se generan en Supervisión o Mi avance (D159)
    this.el('btn-ir-informes').addEventListener('click', () => SRP.app.mostrarVista('supervision'));
    this.el('pdf-dia').addEventListener('change', () => { this.filtro.dia = this.el('pdf-dia').value; this.diaAbierto = true; this.pintarLista(); });
    this.el('pdf-cabo').addEventListener('change', () => { this.filtro.cabo = this.el('pdf-cabo').value; this.pintarLista(); });
    this.el('pdf-vacio').addEventListener('click', (e) => {
      const b = e.target.closest('button[data-vacio]'); if (!b) return;
      if (b.dataset.vacio === 'jornadas') SRP.app.mostrarVista('jornadas'); else this.aplicarAtajo('todas');
    });
    this.el('pdf-lista').addEventListener('click', (e) => {
      const b = e.target.closest('button[data-id]'); if (!b) return;
      const j = this.lista.find(x => x.id === b.dataset.id);
      if (j) this.abrir(j.registros, j.fecha, j.cabo_id, j);
    });
    // «Ahora» pone la hora actual en la hora de finalización (D103)
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
      // con aria-busy y un aviso flotante «Generando…» para que no parezca que no pasó nada (D136).
      const zona = this.el('principal');
      zona.setAttribute('aria-busy', 'true');
      SRP.util.anunciar('Generando reporte…', 'aviso');
      try { await this.generar(v.registros, v.cierre, v.fecha, v.jornada); }
      catch (err) { SRP.util.avisarError(err, 'generar el reporte'); }   // antes se quedaba «Generando reporte…» (D149)
      finally { zona.removeAttribute('aria-busy'); }
    });
    // Corregir vuelve al formulario de cierre con lo ya escrito (se guardó al pedir la vista previa)
    this.el('btn-previa-corregir').addEventListener('click', () => {
      const v = this.vistaPrevia; if (!v) return;
      this.el('dlg-previa').close();
      this.abrir(v.registros, v.fecha, v.cabo_id, v.jornada);
    });
  },

  /* ---------- La vista Reportes (D81) ---------- */

  /* EL REPORTE ES DE UN DÍA. Lo decidió Liber: el reporte es de la jornada, y los datos
     que lo acompañan —chófer, hora de finalización, observaciones— no valen para un mes. Aquí se
     elige el día (hoy por omisión, nunca futuro) y, quien ve a varias personas, el cabo. La vista
     no depende de cómo esté filtrada la lista de Registros: hace su propia consulta. */
  filtro: { dia: '', cabo: '' },
  diaAbierto: false,
  lista: [],

  async preparar() {
    const u = SRP.sesion.usuario;
    this.el('reportes-informes-donde').textContent = SRP.permisos.de(u).alcance === 'propios' ? 'Mi avance' : 'Supervisión';
    const alcance = SRP.permisos.de(u).alcance;
    this.el('pdf-dia').max = SRP.util.fechaHoy();
    SRP.util.pintarChipHoy(this.el('pdf-chip-hoy'));
    const caja = this.el('caja-pdf-cabo');
    caja.hidden = alcance === 'propios';
    if (!caja.hidden) {
      const previo = (this.pedido && this.pedido.cabo_id) || this.filtro.cabo;
      const ids = [...new Set((await SRP.jornadas.jornadasAlcance()).map(j => j.cabo_id))];
      this.el('pdf-cabo').innerHTML = SRP.util.opciones('Todos', SRP.util.paresPersonas(ids));   // M15
      this.el('pdf-cabo').value = ids.includes(previo) ? previo : '';
      this.filtro.cabo = this.el('pdf-cabo').value;
    }
    // Desde «Reporte de la jornada» (Jornadas) se llega directo al cierre de esa jornada
    if (this.pedido && this.pedido.id) {
      const id = this.pedido.id; this.pedido = null;
      const j = (await SRP.jornadas.jornadasAlcance()).find(x => x.id === id);
      await this.pintarLista();
      if (j && j.estatus === 'cerrada') this.abrir(j.registros, j.fecha, j.cabo_id, j);
      return;
    }
    this.pedido = null;
    await this.pintarLista();
    if (SRP.conexion) SRP.conexion.refrescarAvisoEnvio();
  },

  aplicarAtajo(atajo) {
    const f = this.filtro;
    if (atajo === 'todas') { f.dia = ''; this.diaAbierto = false; this.el('pdf-dia').value = ''; }
    if (atajo === 'hoy') { f.dia = SRP.util.fechaHoy(); this.diaAbierto = false; this.el('pdf-dia').value = ''; }
    if (atajo === 'dia') { this.diaAbierto = true; f.dia = this.el('pdf-dia').value; }
    this.pintarLista();
  },

  /* Las jornadas cerradas al alcance, la más reciente arriba, con su botón de reporte (D134) */
  async pintarLista() {
    const f = this.filtro;
    const activo = { hoy: !this.diaAbierto && f.dia === SRP.util.fechaHoy(), dia: this.diaAbierto, todas: !this.diaAbierto && !f.dia };
    SRP.util.atajos.marcar(this.el('pdf-atajos'), activo, { dia: [this.el('pdf-un-dia'), this.diaAbierto] });   // M15
    const todas = await SRP.jornadas.jornadasAlcance();
    const abiertas = todas.filter(j => j.estatus === 'abierta' && (!f.dia || j.fecha === f.dia) && (!f.cabo || j.cabo_id === f.cabo)).length;
    this.lista = todas.filter(j => j.estatus === 'cerrada' && (!f.dia || j.fecha === f.dia) && (!f.cabo || j.cabo_id === f.cabo))
      .sort((a, b) => b.fecha.localeCompare(a.fecha) || b.fecha_inicio.localeCompare(a.fecha_inicio));
    const esc = SRP.util.escapar;
    const u = SRP.sesion.usuario;
    const variosAutores = SRP.permisos.de(u).alcance !== 'propios';
    this.el('pdf-lista').innerHTML = this.lista.map(j => {
      const n = j.registros.length;
      const especies = new Set(j.registros.map(r => SRP.jornadas.claveEspecie(r))).size;
      const cuando = SRP.jornadas.cuando(j.fecha);
      const fecha = SRP.envio.diaEnLetra(j.fecha).split(' ')[0].slice(0, 3) + ' ' + SRP.util.formatearFecha(j.fecha);
      const generado = j.dato && j.dato.reporte_en;
      const lugar = SRP.jornadas.lugarDe(j), ubic = (j.dato && j.dato.ubicacion) || '';
      const cifra = (v, t) => '<span class="jornada-cifra" data-cero="' + (v === 0) + '"><b>' + v + '</b> ' + t + '</span>';
      // Anatomía común de tarjeta (D141): qué → cuándo → estado → dónde → cuánto → quién → acción
      return '<li class="jornada"><div class="jornada-boton reporte-ficha">' +
        '<span class="jornada-titulo-caja"><span class="jornada-sitio">' + esc(j.nombre) + '</span>' +
        '<span class="jornada-dia">' + (cuando ? '<b>' + cuando + '</b> · ' : '') + '<span class="jornada-fecha">' + esc(fecha) + '</span>' +
        (j.total > 1 ? ' <span class="jornada-ndn">Jornada ' + j.n + ' de ' + j.total + '</span>' : '') + '</span></span>' +
        '<span class="jornada-estado"><span class="insignia-jornada" data-tono="' + (generado ? 'ok' : 'neutro') + '">' +
        SRP.ICONOS.svg(generado ? 'palomita' : 'reportes', 'chico') + '<span>' + (generado ? 'Reporte generado ' + esc(SRP.envio.cuando(generado)) : 'Sin reporte todavía') + '</span></span></span>' +
        (lugar || ubic ? '<span class="jornada-lugar">' + SRP.ICONOS.svg('ubicacion', 'chico') + '<span>' + esc(lugar) + (ubic ? (lugar ? ' · ' : '') + '<span class="jornada-ubic">' + esc(ubic) + '</span>' : '') + '</span></span>' : '') +
        '<span class="jornada-cifras">' + cifra(n, n === 1 ? 'árbol' : 'árboles') + cifra(especies, especies === 1 ? 'especie' : 'especies') + '</span>' +
        (variosAutores ? '<span class="jornada-cabo">' + SRP.ICONOS.svg('usuario', 'chico') + '<span>' + esc(SRP.ref.nombreUsuario(j.cabo_id)) + '</span></span>' : '') +
        '<button type="button" class="btn ' + (generado ? 'btn-editar' : 'btn-primario') + ' btn-chico" data-id="' + SRP.util.escapar(j.id) + '"' + (n ? '' : ' disabled') + '>' +
        // Ya generado dice qué se vuelve a hacer y con qué icono (D148): «Regenerar reporte», no «Volver a generar»
        SRP.ICONOS.svg(generado ? 'regenerar' : 'reportes', 'medio') + '<span>' + (generado ? 'Regenerar reporte' : 'Generar reporte') + '</span></button>' +
        (n ? '' : '<span class="nota reporte-sin">Sin árboles: no hay qué reportar.</span>') + '</div></li>';
    }).join('');
    const nota = this.el('pdf-nota');
    nota.textContent = this.lista.length ? this.lista.length + (this.lista.length === 1 ? ' jornada cerrada' : ' jornadas cerradas') + (abiertas ? ' · ' + abiertas + (abiertas === 1 ? ' abierta que aún no se puede reportar' : ' abiertas que aún no se pueden reportar') : '') + '.' : '';
    // Estado vacío con salida (D141): la acción lleva a donde se cierran las jornadas
    const vacio = this.el('pdf-vacio');
    vacio.hidden = this.lista.length > 0;
    if (!this.lista.length) vacio.innerHTML = SRP.util.htmlVacio('reportes',
      f.dia ? 'No hay jornadas cerradas del ' + SRP.util.formatearFecha(f.dia) + '.' : 'Todavía no hay jornadas cerradas.',
      abiertas ? 'Hay ' + abiertas + (abiertas === 1 ? ' abierta' : ' abiertas') + ': ciérrela en Jornadas para generar su reporte.' : 'El reporte se genera al cerrar una jornada.',
      [f.dia ? { accion: 'todas', texto: 'Ver todas' } : null, { accion: 'jornadas', texto: 'Ir a Jornadas', clase: 'btn-primario', icono: 'jornadas' }]);
  },

  // El cierre del reporte vive en la jornada (D119): es el mismo registro
  async cierreDeJornada(j) { return (await SRP.almacen.uno('jornadas', j.id)) || j.dato || null; },

  /* ---------- Formulario de cierre ---------- */

  async abrir(registros, fecha, caboId, jornada) {
    if (!registros.length || !jornada) return;
    this.contexto = { registros, fecha, cabo_id: caboId || '', jornada };

    this.el('dlg-cierre-dia').textContent = jornada.nombre + ' · ' + SRP.util.formatearFecha(fecha) + (jornada.total > 1 ? ' · Jornada ' + jornada.n + ' de ' + jornada.total : '');
    this.el('dlg-cierre-cuenta').textContent = registros.length +
      (registros.length === 1 ? ' ejemplar registrado' : ' ejemplares registrados');

    // Lo capturado antes para esta misma jornada no se vuelve a escribir (Norma 7.6)
    const previo = await this.cierreDeJornada(jornada);
    this.contexto.previo = previo || null;
    this.CAMPOS.forEach(c => { this.el('cie-' + c).value = previo ? (previo[c] || '') : ''; });
    // Un cierre guardado antes del bloque 20 traía «vehiculo» en un solo campo: se muestra como modelo
    if (previo && previo.vehiculo && !previo.vehiculo_modelo) this.el('cie-vehiculo_modelo').value = previo.vehiculo;
    this.prepararEncargado(registros, previo);
    if (SRP.espejo) SRP.espejo.refrescarCierre();

    this.el('dlg-cierre').showModal();
  },

  /* ENCARGADO. Quien captura en campo es responsable de su propio reporte, así que a un cabo no se
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

    const ids = SRP.util.paresPersonas(registros.map(r => r.cabo_id));
    const sel = this.el('cie-encargado');
    sel.innerHTML = SRP.util.opciones('Sin especificar', ids);
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
    // La jornada tal cual está guardada, con los datos de cierre encima (D119)
    const cierre = Object.assign({}, previo || c.jornada.dato || {}, {
      encargado_id: this.encargadoElegido(),
      editado_por_id: SRP.sesion.usuario.id,
      fecha_ultima_edicion: ahora
    });
    this.CAMPOS.forEach(k => { cierre[k] = this.el('cie-' + k).value.trim(); });
    return cierre;
  },

  async aceptar() {
    const c = this.contexto;
    const previo = c.previo;
    if (!SRP.permisos.exigir('jornada.editar', previo || c.jornada.dato)) return;   // el cierre se guarda en la jornada (D151)
    const cierre = this.cierrePrevisto();
    cierre.reporte_en = SRP.util.ahoraISO();   // cuándo se generó (o regeneró) el reporte (D134)

    await SRP.almacen.guardarConBitacora('jornadas', cierre,
      SRP.bitacora.entrada('EDITADO', 'jornada', cierre.id, 'Datos de cierre del reporte'));
    c.jornada.dato = cierre;

    this.el('dlg-cierre').close();
    this.mostrarPrevia(c.registros, cierre, c.fecha, c.cabo_id, c.jornada);
  },

  /* VISTA PREVIA DEL REPORTE (D101). Lo mismo que dirá el PDF, en el mismo orden y con las mismas
     reglas (un apartado vacío no aparece), en pantalla y antes de generarlo: así se corrige un
     dato de cierre sin haber compartido todavía un documento equivocado. No es una imagen del
     PDF —en iPhone un PDF incrustado sólo enseña la primera página—, sino el mismo contenido. */
  mostrarPrevia(registros, cierre, fecha, caboId, jornada) {
    this.vistaPrevia = { registros, cierre, fecha, cabo_id: caboId || '', jornada };
    this.el('previa-hoja').innerHTML = this.htmlPrevia(registros, cierre, fecha, jornada);
    this.el('dlg-previa').showModal();
    // El croquis (D115) se arma aparte para no detener la vista previa mientras llegan los mosaicos
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

  // La conciliación de Jornadas en el reporte (D112): sólo si la cuadrilla anotó cuántos plantó
  textoConteo(cierre, registros) {
    const s = SRP.jornadas.metaDe(cierre);
    if (s === null) return '';
    const n = registros.length;
    return 'Meta de la jornada: ' + s + (s === 1 ? ' árbol' : ' árboles') + ' · registrados: ' + n + (s === n ? ' (cuadra)' : ' (no cuadra)');
  },

  // «Jornada 2 de 3» bajo la fecha, sólo cuando el día tuvo más de una (D117)
  // «Territorio derivado con las capas: Alcaldías … · UGA … · Colonias … (capa de prueba).», y los
  // registros que aún no lo tienen (D152)
  textoCapas(registros) {
    const versiones = [...new Set(registros.map(r => r.capa_version).filter(Boolean))];
    const sin = registros.filter(r => !r.capa_version).length;
    return [versiones.length ? 'Territorio derivado con las capas: ' + versiones.map(v => SRP.ref.textoCapas(v)).join(' / ') + '.' : '',
      sin ? (sin === 1 ? '1 registro' : sin + ' registros') + ' con el territorio pendiente de derivar.' : ''].filter(Boolean).join(' ');
  },

  textoJornada(jornada) { return jornada && jornada.total > 1 ? 'Jornada ' + jornada.n + ' de ' + jornada.total : ''; },

  /* UN SOLO MODELO DEL REPORTE (M15). Lo que dice el reporte se decide aquí una vez; la vista
     previa y el PDF sólo lo pintan, cada uno a su manera. Antes cada uno lo calculaba por su lado y
     podían llegar a diferir (la vista previa no traía las advertencias del pie del PDF). */
  modelo(registros, cierre, fecha, jornada) {
    const u = SRP.sesion.usuario;
    const variosAutores = SRP.permisos.de(u).alcance !== 'propios';
    const hay = (k) => !!(cierre[k] && String(cierre[k]).trim());
    const alcaldias = this.alcaldiasDe(registros);
    const porPrograma = {};
    registros.forEach(r => { const n = SRP.ref.nombreCatalogo(r.programa_id) || 'Sin programa'; porPrograma[n] = (porPrograma[n] || 0) + 1; });
    const logistica = [];
    if (hay('chofer')) logistica.push('Chófer: ' + cierre.chofer);
    if (hay('vehiculo_modelo') || hay('vehiculo_placa')) logistica.push('Vehículo: ' + [cierre.vehiculo_modelo, hay('vehiculo_placa') ? 'placa ' + cierre.vehiculo_placa : ''].filter(Boolean).join(', '));
    if (hay('hora')) logistica.push('Hora de finalización: ' + cierre.hora + ' h');
    const notas = [];
    // R2: un reporte con registros provisionales no es un documento definitivo, y lo dice
    if (registros.some(r => !SRP.folio.valido(r.folio))) notas.push('Registros PROVISIONALES: el folio se asigna al sincronizar con el servidor. Este reporte no sustituye al definitivo.');
    // D110: un folio simulado se ve igual que uno real; el reporte lo dice
    if (registros.some(r => SRP.folio.valido(r.folio) && r.es_ficticio)) notas.push('Folios SIMULADOS con datos de prueba: no valen para placas, rótulos ni oficios.');
    // Con qué capas se derivaron alcaldía, colonia y celda (D152)
    if (this.textoCapas(registros)) notas.push(this.textoCapas(registros));
    const conGps = registros.filter(r => r.punto_origen === 'gps').length;
    return {
      titulo: 'Reporte diario de plantación',
      fecha: SRP.util.formatearFecha(fecha) + (this.textoJornada(jornada) ? ' · ' + this.textoJornada(jornada) : ''),
      // Sitio: tal como se escribió al iniciar la jornada, con el territorio que el sistema derivó
      sitio: jornada ? [jornada.nombre, jornada.ubicacion, SRP.activa.lugarDe(jornada)].filter(Boolean).join(' · ') : '',
      territorio: alcaldias.length ? (alcaldias.length === 1 ? 'Alcaldía ' + alcaldias[0] : 'Alcaldías: ' + alcaldias.join(', ')) : '',
      conteo: this.textoConteo(cierre, registros),
      comentarios: hay('comentarios') ? cierre.comentarios : '',   // lo que se escribió al iniciarla (D119)
      personal: this.gruposPersonal(cierre),                       // encargado primero y cada grupo (D103)
      ejemplares: {
        cabecera: ['N.º', 'Folio', 'Especie', 'Nombre científico'].concat(variosAutores ? ['Cabo'] : []),
        // Uno por renglón, en el orden en que se capturaron; «(simulado)» en cada folio de prueba (D152)
        filas: registros.map((r, i) => { const e = SRP.ref.especieDe(r); return [String(i + 1), SRP.folio.textoLargo(r), e.comun, e.cientifico].concat(variosAutores ? [SRP.ref.nombreUsuario(r.cabo_id)] : []); }),
        notas
      },
      totales: this.totalesPorEspecie(registros),
      total: registros.length,
      notaTotales: 'El conteo se calcula a partir de los registros del sistema; no se captura a mano.',
      programas: Object.keys(porPrograma).sort().map(n => [n, porPrograma[n]]),   // qué programa pagó cada árbol
      observaciones: hay('observaciones') ? cierre.observaciones : '',
      logistica,
      /* CALIDAD DE LA UBICACIÓN. Con la fotografía opcional, la coordenada es la prueba: quien lea el
         reporte merece saber de qué clase de coordenada se trata. Una cifra al pie dice lo mismo que
         una columna y se compara de un año a otro. */
      gps: 'Ubicados con GPS del dispositivo: ' + conGps + ' de ' + registros.length + ' (' + Math.round(conGps * 100 / registros.length) + '%)',
      generado: 'Generado por ' + SRP.util.nombreCompleto(u) + ' (' + SRP.permisos.de(u).etiqueta + ').',
      /* La cifra del sistema no es la cifra del programa: se registra lo que alcanza a registrarse.
         Decirlo en el documento protege a quien lo firma. */
      advertencia: 'Cifra de ejemplares registrados en el sistema para esta jornada. No equivale necesariamente al total plantado en ella.',
      ficticio: SRP.CONFIG.ES_FICTICIO ? 'Documento de prueba con datos ficticios. Sin validez oficial.' : ''
    };
  },

  // La vista previa pinta el modelo en HTML, en el mismo orden que el PDF
  htmlPrevia(registros, cierre, fecha, jornada) {
    const m = this.modelo(registros, cierre, fecha, jornada);
    const esc = t => SRP.util.escapar(t);
    const parrafo = t => esc(t).replace(/\n/g, '<br>');
    const apartado = (titulo, cuerpo) => '<section class="previa-apartado"><h3>' + titulo + '</h3>' + cuerpo + '</section>';
    const nota = t => '<p class="previa-nota">' + esc(t) + '</p>';
    let h = '<p class="previa-titulo">' + esc(m.titulo) + '</p><p class="previa-fecha">' + esc(m.fecha) + '</p>';
    if (m.sitio || m.territorio) {
      h += '<div class="previa-sitio">' + (m.sitio ? '<p><strong>Jornada:</strong> ' + esc(m.sitio) + '</p>' : '') +
        (m.territorio ? '<p class="previa-tenue">' + esc(m.territorio) + '</p>' : '') +
        (m.conteo ? '<p><strong>' + esc(m.conteo) + '</strong></p>' : '') + '</div>';
    }
    if (m.comentarios) h += apartado('Comentarios de la jornada', '<p>' + parrafo(m.comentarios) + '</p>');
    const g = m.personal;
    if (g.encargado || g.listas.length) {
      h += apartado('Personal participante',
        (g.encargado ? '<p><strong>Encargado:</strong> ' + esc(g.encargado) + '</p>' : '') +
        g.listas.map(([t, nombres]) => '<p class="previa-subtitulo">' + t + '</p><ul class="previa-lista">' +
          nombres.map(n => '<li>' + esc(n) + '</li>').join('') + '</ul>').join(''));
    }
    const ej = m.ejemplares;
    h += apartado('Ejemplares registrados', '<div class="previa-tabla-caja"><table class="previa-tabla"><thead><tr>' + ej.cabecera.map(c => '<th>' + esc(c) + '</th>').join('') + '</tr></thead><tbody>' +
      ej.filas.map(f => '<tr>' + f.map((c, k) => '<td>' + (k === 3 ? '<i>' + esc(c) + '</i>' : esc(c)) + '</td>').join('') + '</tr>').join('') + '</tbody></table></div>' +
      ej.notas.map(nota).join(''));
    // Croquis de la jornada (D115): mismo orden que la tabla; se llena cuando la imagen está lista
    h += apartado('Croquis de la jornada', '<div id="previa-croquis" class="previa-croquis" aria-live="polite"><p class="previa-nota">Preparando el croquis…</p></div>');
    h += apartado('Totales por especie', '<div class="previa-tabla-caja"><table class="previa-tabla"><thead><tr><th>Especie</th><th>Nombre científico</th><th class="cifra">Ejemplares</th></tr></thead><tbody>' +
      m.totales.map(t => '<tr><td>' + esc(t.comun) + '</td><td><i>' + esc(t.cientifico) + '</i></td><td class="cifra">' + t.n + '</td></tr>').join('') +
      '</tbody><tfoot><tr><td>Total</td><td></td><td class="cifra">' + m.total + '</td></tr></tfoot></table></div>' + nota(m.notaTotales));
    h += apartado('Por programa', '<p>' + m.programas.map(([n, c]) => esc(n) + ': ' + c).join('<br>') + '</p>');
    if (m.observaciones) h += apartado('Observaciones', '<p>' + parrafo(m.observaciones) + '</p>');
    if (m.logistica.length) h += apartado('Logística', '<p>' + m.logistica.map(esc).join('<br>') + '</p>');
    h += '<p class="previa-pie">' + esc(m.gps) + '<br>' + esc(m.generado) + '<br>' + esc(m.advertencia) + (m.ficticio ? '<br>' + esc(m.ficticio) : '') + '</p>';
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

  // Alcaldías de los árboles de la jornada: el sistema ya las derivó del punto, no se preguntan
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
      img.src = 'assets/encabezado-ru-sia.png?v=' + encodeURIComponent(SRP.CONFIG.VERSION);
    });
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

  // Encargado y listas de personal del cierre, una persona por renglón, sin renglones vacíos
  gruposPersonal(cierre) {
    const lista = t => String(t || '').split('\n').map(x => x.trim()).filter(Boolean);
    const listas = [['Participantes', lista(cierre.personal)], ['Personal de apoyo', lista(cierre.apoyo)]].filter(([, l]) => l.length);
    return { encargado: cierre.encargado_id ? SRP.ref.nombreUsuario(cierre.encargado_id) : '', listas };
  },

  async generar(registros, cierre, fecha, jornada) {
    if (!window.jspdf) { SRP.util.anunciar('No se pudo cargar el generador de PDF.', 'alerta'); return; }
    const logo = await this.cargarLogo();
    const m = this.modelo(registros, cierre, fecha, jornada);   // lo mismo que la vista previa (M15)
    // compress: los flujos del PDF van comprimidos; con el logotipo en JPEG el archivo baja de
    // ~800 KB a menos de 100 KB y se comparte sin problema por mensajería (D103)
    const doc = new window.jspdf.jsPDF({ unit: 'mm', format: 'letter', compress: true });
    const ancho = doc.internal.pageSize.getWidth();
    const alto = doc.internal.pageSize.getHeight();
    const C = this.colores();
    const M = 20;                       // margen izquierdo y derecho
    const util = ancho - M * 2;
    const hoy = new Date();

    /* Cada apartado se dibuja sólo si tiene qué decir. Un documento con renglones en blanco
       —«Chófer: ______»— parece una plantilla a medio llenar, y lo firma alguien. */

    // El logotipo se fija por su alto (D137): al sumar el SIA crece a lo ancho, y fijarlo por el
    // ancho lo habría encogido. 9.3 mm es el alto que tenía con 90 mm de ancho sin el SIA.
    if (logo) { const hLogo = 9.3; doc.addImage(this.logoJPEG(logo), 'JPEG', M, 14, hLogo * logo.naturalWidth / logo.naturalHeight, hLogo); }
    doc.setDrawColor(...C.guinda); doc.setLineWidth(0.4); doc.line(M, 30, ancho - M, 30);

    doc.setFont('helvetica', 'bold'); doc.setFontSize(14); doc.setTextColor(...C.guinda);
    doc.text(m.titulo.toUpperCase(), ancho / 2, 40, { align: 'center' });
    doc.setFont('helvetica', 'normal'); doc.setFontSize(10); doc.setTextColor(...C.gris);
    doc.text(m.fecha, ancho / 2, 46, { align: 'center' });

    let y = 56;
    // El pie va en alto − 16: un bloque cabe si termina antes de alto − 19 (M44: antes se reservaban
    // 24 mm más el aire del propio bloque, y un apartado corto saltaba de página cuando sí cabía)
    const salto = (necesario) => { if (y + necesario > alto - 19) { doc.addPage(); y = 25; } };

    // Sitio: tal como se escribió al iniciar la jornada, con el territorio que el sistema derivó
    if (m.sitio || m.territorio) {
      const lineas = m.sitio ? doc.splitTextToSize(m.sitio, util - 22) : [];
      const territorio = m.territorio, conteo = m.conteo;
      const altoCaja = 6 + lineas.length * 4.6 + (territorio ? 5 : 0) + (conteo ? 5 : 0);
      salto(altoCaja + 4);
      doc.setDrawColor(...C.tinta); doc.setLineWidth(0.2);
      doc.rect(M, y, util, altoCaja);
      let yy = y + 5.5;
      if (lineas.length) {
        doc.setFont('helvetica', 'bold'); doc.setFontSize(9.5); doc.setTextColor(...C.guinda);
        doc.text('Jornada:', M + 3, yy);
        doc.setFont('helvetica', 'normal'); doc.setTextColor(...C.tinta);
        doc.text(lineas, M + 19, yy);
        yy += lineas.length * 4.6;
      }
      if (territorio) {
        doc.setFontSize(9); doc.setTextColor(...C.gris);
        doc.text(territorio, M + 3, lineas.length ? yy + 0.5 : yy);
        yy += 5;
      }
      if (conteo) {
        doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.setTextColor(...C.tinta);
        doc.text(conteo, M + 3, lineas.length || territorio ? yy + 0.5 : yy);
        doc.setFont('helvetica', 'normal');
      }
      y += altoCaja + 7;
    }

    // Apartado de texto libre: título guinda y párrafo, sólo si hay contenido
    const apartado = (titulo, texto) => {
      const lineas = doc.splitTextToSize(texto, util);
      salto(7 + lineas.length * 4.6);   // lo que ocupa hasta su última línea, sin el aire de abajo
      doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.setTextColor(...C.guinda);
      doc.text(titulo.toUpperCase(), M, y);
      doc.setDrawColor(...C.dorado); doc.setLineWidth(0.2); doc.line(M, y + 1.5, ancho - M, y + 1.5);
      doc.setFont('helvetica', 'normal'); doc.setFontSize(9.5); doc.setTextColor(...C.tinta);
      doc.text(lineas, M, y + 7);
      y += 7 + lineas.length * 4.6 + 4;
    };


    if (m.comentarios) apartado('Comentarios de la jornada', m.comentarios);

    // Personal (D103): Encargado primero; cada grupo con su subtítulo y los nombres sangrados con
    // viñeta, para que los de apoyo no se lean como participantes
    const grupos = m.personal;
    if (grupos.encargado || grupos.listas.length) {
      const lineas = [];
      if (grupos.encargado) lineas.push('Encargado: ' + grupos.encargado);
      grupos.listas.forEach(([t, nombres]) => { lineas.push(t + ':'); nombres.forEach(n => lineas.push('     •  ' + n)); });
      apartado('Personal participante', lineas.join('\n'));
    }

    // Ejemplares: uno por renglón, en el orden en que se capturaron
    salto(30);
    doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.setTextColor(...C.guinda);
    doc.text('EJEMPLARES REGISTRADOS', M, y);
    doc.autoTable({
      head: [m.ejemplares.cabecera], body: m.ejemplares.filas, startY: y + 3, margin: { left: M, right: M, bottom: 22 },
      styles: { font: 'helvetica', fontSize: 8.5, cellPadding: 1.6, textColor: C.tinta },
      headStyles: { fillColor: C.guinda, textColor: 255, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: C.fila },
      columnStyles: { 0: { cellWidth: 12, halign: 'right' }, 1: { cellWidth: 30 }, 3: { fontStyle: 'italic' } }
    });
    y = doc.lastAutoTable.finalY + 4;
    // Las notas de la tabla: provisionales, simulados y con qué capas se derivó el territorio
    doc.setFont('helvetica', 'italic'); doc.setFontSize(8); doc.setTextColor(...C.gris);
    m.ejemplares.notas.forEach(t => { const l = doc.splitTextToSize(t, ancho - 2 * M); doc.text(l, M, y); y += 4 * l.length; });
    doc.setFont('helvetica', 'normal');
    y += 4;

    // Croquis de la jornada (D115): a todo el ancho útil, con su pie; si no cabe en la página, pasa a la siguiente
    const croquis = SRP.croquis ? await SRP.croquis.generar(registros) : null;
    if (croquis) {
      const altoImg = util * SRP.croquis.ALTO / SRP.croquis.ANCHO;
      salto(altoImg + 16);
      doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.setTextColor(...C.guinda);
      doc.text('CROQUIS DE LA JORNADA', M, y);
      doc.setDrawColor(...C.dorado); doc.setLineWidth(0.2); doc.line(M, y + 1.5, ancho - M, y + 1.5);
      doc.addImage(croquis.datos, croquis.formato, M, y + 4, util, altoImg, undefined, 'FAST');
      doc.setDrawColor(...C.gris); doc.setLineWidth(0.2); doc.rect(M, y + 4, util, altoImg);
      doc.setFont('helvetica', 'italic'); doc.setFontSize(8); doc.setTextColor(...C.gris);
      const pie = doc.splitTextToSize(croquis.nota, util);
      doc.text(pie, M, y + 4 + altoImg + 4);
      doc.setFont('helvetica', 'normal');
      y += 4 + altoImg + 4 + pie.length * 3.6 + 4;
    }

    // Totales por especie: calculados
    const totales = m.totales;
    salto(30);
    doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.setTextColor(...C.guinda);
    doc.text('TOTALES POR ESPECIE', M, y);
    doc.autoTable({
      head: [['Especie', 'Nombre científico', { content: 'Ejemplares', styles: { halign: 'right' } }]],
      body: totales.map(t => [t.comun, t.cientifico, String(t.n)]),
      // La cifra del total se alinea como las de arriba (D103): el pie no hereda columnStyles
      foot: [['Total', '', { content: String(m.total), styles: { halign: 'right' } }]],
      startY: y + 3, margin: { left: M, right: M, bottom: 22 },
      styles: { font: 'helvetica', fontSize: 8.5, cellPadding: 1.6, textColor: C.tinta },
      headStyles: { fillColor: C.guinda, textColor: 255, fontStyle: 'bold' },
      footStyles: { fillColor: C.total, textColor: C.tinta, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: C.fila },
      columnStyles: { 1: { fontStyle: 'italic' }, 2: { halign: 'right', cellWidth: 26 } }
    });
    y = doc.lastAutoTable.finalY + 4;
    doc.setFont('helvetica', 'italic'); doc.setFontSize(7.5); doc.setTextColor(...C.gris);
    doc.text(m.notaTotales, M, y);
    doc.setFont('helvetica', 'normal');
    y += 8;

    // Resumen por programa: qué programa pagó cada árbol de la jornada
    const programas = m.programas;
    salto(6 + programas.length * 5);
    doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.setTextColor(...C.guinda);
    doc.text('POR PROGRAMA', M, y);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(9.5); doc.setTextColor(...C.tinta);
    programas.forEach(([n, c], i) => doc.text(n + ': ' + c, M, y + 6 + i * 5));
    y += 6 + programas.length * 5 + 4;

    if (m.observaciones) apartado('Observaciones', m.observaciones);
    // Logística: sólo los datos que se capturaron
    if (m.logistica.length) apartado('Logística', m.logistica.join('\n'));

    // Calidad de la ubicación, quién lo generó y lo que la cifra no dice (el modelo explica por qué)
    salto(24);
    doc.setFontSize(9.5); doc.setTextColor(...C.tinta);
    doc.text(m.gps, M, y);
    y += 7;
    doc.setFontSize(8); doc.setTextColor(...C.gris);
    doc.text(m.generado, M, y);
    doc.text(doc.splitTextToSize(m.advertencia, util), M, y + 4);
    if (m.ficticio) {
      doc.setTextColor(...C.ficticio);
      doc.text(m.ficticio, M, y + 14);
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

    await this.entregar(doc, this.nombreArchivo(cierre, fecha, jornada), cierre, jornada);
  },

  /* Nombre del PDF (D102): «Reporte», quién responde del reporte y la fecha del reporte, p. ej.
     Reporte_Perengano_Gomez_Ejemplo_2026-09-22.pdf. La persona es el encargado del cierre; si no
     lo hay, el cabo elegido en Reportes; si tampoco, quien genera (el coordinador que saca el de
     toda su cuadrilla). Sin acentos ni espacios, para que ningún sistema de archivos lo altere. */
  nombreArchivo(cierre, fecha, jornada) {
    const cabo = this.contexto ? this.contexto.cabo_id : '';
    const id = (cierre && cierre.encargado_id) || cabo || SRP.sesion.usuario.id;
    const nombre = (SRP.ref.nombreUsuario(id) || 'SRP').normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^A-Za-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
    // Con más de una jornada en el día, el número va en el nombre: Reporte_Fulana_2026-09-23_J2.pdf (D117)
    return 'Reporte_' + nombre + '_' + fecha + (jornada && jornada.total > 1 ? '_J' + jornada.n : '') + '.pdf';
  },

  /* En teléfono o tableta, compartir con las apps del dispositivo; en escritorio, descargar.
     Windows también ofrece «compartir archivos» desde Chrome y Edge, y abría su panel de
     Compartir en vez de guardar el PDF; el destino de Acrobat de ese panel recibía el archivo
     vacío (D61). Táctil sin ratón es el criterio, no el tamaño de la pantalla. */
  esDispositivoTactil() {
    return window.matchMedia && window.matchMedia('(hover: none) and (pointer: coarse)').matches;
  },

  async entregar(doc, nombre, cierre, jornada) {
    const entregado = await this.entregarArchivo(doc.output('blob'), nombre, 'Reporte diario de plantación');
    if (entregado === 'cancelado') return;
    /* Cierre del ciclo (D138): el reporte es el último paso de la jornada, así que el aviso dice si
       quedó completa o, si todavía hay puntos por revisar, qué falta. */
    let cola = '', completa = true;
    if (jornada && jornada.registros && cierre) {
      const p = SRP.jornadas.pasos(jornada, cierre);
      completa = p.actual === 'completa';
      cola = completa ? ' La jornada «' + jornada.nombre + '» quedó completa.' : ' ' + SRP.jornadas.siguiente(p, true).texto;
    }
    SRP.util.anunciar((entregado === 'descarga' ? 'Reporte generado y descargado: ' + nombre + '.' : 'Reporte generado y compartido.') + cola, completa ? 'exito' : 'aviso');
    // La ficha de la lista pasa a «reporte generado hoy a las …» sin salir y volver
    if (SRP.app.vista === 'reportes') await this.pintarLista();
  },

  /* Cualquier archivo —el PDF del reporte o el respaldo— se entrega igual: compartir en táctil,
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

// Acciones que escriben en el teléfono: si fallan, se dice qué no se pudo hacer (D149)
SRP.util.proteger(SRP.reportes, { aceptar: 'guardar los datos del cierre' });
