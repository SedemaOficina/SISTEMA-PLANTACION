/* JORNADAS: MAPA Y LISTA DE LO REGISTRADO EN UNA JORNADA (D112).

   PARA QUÉ. Al cierre, la cuadrilla necesita comprobar que cada árbol plantado tenga su punto
   («si plantaron 10, que haya 10») y corregir lo que salió mal. Esta vista junta los registros de
   una jornada en un mapa con puntos numerados en el orden en que se registraron y, debajo, la
   misma lista con el mismo número.

   QUÉ ES UNA JORNADA (D119). Se declara antes de registrar (js/jornada-activa.js): nombre, fecha
   y comentarios, de un cabo. Cada árbol nace con su `jornada_id`. Aquí las jornadas se leen de
   la tabla `jornadas` y se les cuelgan sus registros; una jornada abierta sin árboles también se
   ve. El número «Jornada 2 de 3» es el orden del día del cabo por hora de inicio. Un árbol que
   quedó en la jornada equivocada se mueve desde la tuerca del punto («Mover a otra jornada»).
   La conciliación, los puntos revisados y los datos de cierre del reporte viven en la jornada.

   CONCILIACIÓN. Al iniciar la jornada se escriben los árboles previstos (`arboles_previstos`); el
   sistema los compara con los registrados y dice si cuadra, si faltan o si sobran, y el reporte los
   imprime.

   AVISOS (sin inventar errores: son para revisar, no se corrigen solos):
     duplicado   misma especie a menos de DUPLICADO_M de otro punto de la jornada
     lejos       a más de FUERA_M del árbol más cercano de la jornada (con 3 o más puntos)
     precisión   GPS peor que PRECISION_ACEPTABLE_M al registrar
   «Está bien» marca el punto como revisado (`puntos_revisados` de la jornada) y deja de contarse.
   Hasta D119 estos datos vivían en una tabla «cierres»; ya no existe, y en el código la jornada tal
   como está guardada se llama `guardada` (D153). */
window.SRP = window.SRP || {};

SRP.jornadas = {
  /* Filtros. La fecha se elige con los atajos (Todas, Hoy, Este mes, Este año, Un día, Un periodo); «Este
     mes» y «Este año» guardan `anio` y `mes`. Las listas viven plegadas en «Más filtros». Al entrar se
     ven todas. */
  filtro: { texto: '', revision: '', dia: '', desde: '', hasta: '', anio: '', mes: '', cabo: '', programa: '', alcaldia: '', organizacion: '' },
  // «Pendientes»: lo que le falta a cada jornada. El reporte es de una jornada cerrada con árboles
  REVISION: { pendiente: 'Con algo por atender', revisar: 'Con puntos por revisar', cuadra: 'No cuadran con lo previsto', sinreporte: 'Sin reporte todavía', lista: 'Sin pendientes' },
  diaAbierto: false,
  periodoAbierto: false,
  lista: [],            // jornadas de lo filtrado
  actual: null,         // clave de la jornada abierta
  volverAlDetalle: false,
  mapa: null,
  marcadores: {},

  el(id) { return document.getElementById(id); },

  iniciar() {
    SRP.util.atajos.iniciar(this.el('jornada-atajos'), a => this.aplicarAtajo(a));   // M15
    this.el('jornada-dia').addEventListener('change', () => {
      const f = this.filtro;
      f.dia = this.el('jornada-dia').value; f.anio = ''; f.mes = ''; f.desde = ''; f.hasta = '';
      this.diaAbierto = true; this.periodoAbierto = false;
      this.pintarLista();
    });
    // Desde y Hasta entran con «Aplicar», como en Registros (D82)
    this.el('btn-jornada-filtrar').innerHTML = SRP.ICONOS.svg('buscar') + '<span>Aplicar</span>';
    this.el('btn-jornada-filtrar').addEventListener('click', () => {
      const desde = this.el('jornada-desde').value, hasta = this.el('jornada-hasta').value;
      if (desde && hasta && desde > hasta) { SRP.util.anunciar('La fecha «Desde» es posterior a «Hasta». Corrija el rango.', 'alerta'); return; }
      const f = this.filtro;
      f.desde = desde; f.hasta = hasta;
      if (desde || hasta) { f.dia = ''; f.anio = ''; f.mes = ''; }
      this.pintarLista();
    });
    // Buscar por nombre: se filtra mientras se escribe, sin distinguir acentos ni mayúsculas
    let espera = null;
    this.el('jornada-buscar').addEventListener('input', () => {
      clearTimeout(espera);
      espera = setTimeout(() => { this.filtro.texto = this.el('jornada-buscar').value.trim(); this.pintarLista(); }, 150);
    });
    this.el('jornada-revision').addEventListener('change', () => { this.filtro.revision = this.el('jornada-revision').value; this.pintarLista(); });
    this.el('jornada-cabo').addEventListener('change', () => {
      this.filtro.cabo = this.el('jornada-cabo').value;
      this.pintarLista();
    });
    this.el('jornada-alcaldia').addEventListener('change', (e) => { this.filtro.alcaldia = e.target.value; this.pintarLista(); });
    this.el('jornada-programa').addEventListener('change', (e) => { this.filtro.programa = e.target.value; this.pintarLista(); });
    // «Quitar filtros» deja la lista como al entrar; cada ficha quita lo suyo
    this.el('jornada-quitar').addEventListener('click', () => this.quitarFiltros(true));
    this.el('jornada-fichas').addEventListener('click', (e) => {
      const b = e.target.closest('button[data-quitar]'); if (!b) return;
      const f = this.filtro, q = b.dataset.quitar;
      if (q === 'periodo') { this.aplicarAtajo('todas'); return; }
      if (q === 'texto') { f.texto = ''; this.el('jornada-buscar').value = ''; }
      else if (q === 'revision') { f.revision = ''; this.el('jornada-revision').value = ''; }
      else if (q === 'institucion') f.organizacion = '';
      else f[q] = '';
      this.pintarLista();
      SRP.util.anunciarSilencioso('Filtro quitado.');
    });
    this.el('jornada-org').addEventListener('change', (e) => { this.filtro.organizacion = e.target.value; this.pintarLista(); });
    this.el('jornadas-vacio').addEventListener('click', (e) => {
      const b = e.target.closest('button[data-vacio]'); if (!b) return;
      if (b.dataset.vacio === 'iniciar') { SRP.app.mostrarVista('registrar'); return; }
      this.quitarFiltros(false);
    });
    this.el('lista-jornadas').addEventListener('click', (e) => {
      const li = e.target.closest('[data-clave]'); if (li) this.abrir(li.dataset.clave);
    });
    this.el('btn-jornada-volver').addEventListener('click', () => this.cerrar());
    this.el('jornada-lista').addEventListener('click', (e) => this.alTocarLista(e));
    this.el('btn-jornada-faltante').addEventListener('click', () => this.registrarFaltante());
    // Editar y eliminar la jornada (D132)
    this.el('btn-jornada-editar').innerHTML = SRP.ICONOS.svg('lapiz', 'medio') + '<span>Editar jornada</span>';
    this.el('btn-jornada-eliminar').innerHTML = SRP.ICONOS.svg('basura', 'medio') + '<span>Eliminar jornada</span>';
    this.el('btn-jornada-editar').addEventListener('click', () => this.abrirEditar(this.guardada));
    this.el('btn-jornada-eliminar').addEventListener('click', () => this.eliminarJornada());
    // Relevo de cabo: la coordinación pasa la jornada abierta a otro cabo de su cuadrilla
    this.el('btn-jornada-relevo').innerHTML = SRP.ICONOS.svg('usuarios', 'medio') + '<span>Relevo de cabo</span>';
    this.el('btn-jornada-relevo').addEventListener('click', () => this.abrirRelevo());
    this.el('btn-relevo-cerrar').innerHTML = SRP.ICONOS.svg('cerrar', 'grande');
    this.el('btn-relevo-cerrar').addEventListener('click', () => this.el('dlg-relevo').close());
    this.el('btn-relevo-hacer').innerHTML = SRP.ICONOS.svg('palomita', 'medio') + '<span>Hacer el relevo</span>';
    this.el('btn-relevo-hacer').addEventListener('click', () => this.relevar(this.el('relevo-quien').value));
    this.el('relevo-quien').addEventListener('change', () => { this.el('relevo-error').hidden = true; });
    this.el('btn-ej-guardar').innerHTML = SRP.ICONOS.svg('disco') + '<span>Guardar cambios</span>';
    SRP.solicitud.montar(this.el('ej-caja-solicitud'), 'ej');
    this.el('form-editar-jornada').addEventListener('submit', (e) => { e.preventDefault(); this.guardarEdicion(); });
    this.el('ej-fecha').addEventListener('change', () => { this.el('ej-nota-fecha').hidden = this.el('ej-fecha').value === (this.enEdicion && this.enEdicion.fecha); });
    // El programa también es de la jornada (D151): sus árboles lo toman
    this.el('ej-programa').addEventListener('change', () => { this.el('ej-nota-programa').hidden = this.el('ej-programa').value === (this.enEdicion && this.enEdicion.programa_id); });
    this.el('btn-ej-hoy').addEventListener('click', () => {
      this.el('ej-fecha').value = SRP.util.fechaHoy();
      this.el('ej-fecha').dispatchEvent(new Event('change', { bubbles: true }));
    });
    this.el('btn-jornada-reporte').addEventListener('click', () => this.irAlReporte());
    this.el('btn-jornada-faltante').innerHTML = SRP.ICONOS.svg('mas', 'medio') + '<span>Registrar árbol</span>';
    this.el('btn-jornada-reporte').innerHTML = SRP.ICONOS.svg('reportes', 'medio') + '<span>Generar PDF</span>';
    this.el('btn-mover-cerrar').addEventListener('click', () => this.el('dlg-mover-jornada').close());
    ['mover-buscar', 'mover-fecha'].forEach(id => this.el(id).addEventListener('input', () => this.pintarMover()));
    this.el('lista-mover-jornadas').addEventListener('click', async (e) => {
      const b = e.target.closest('button[data-id]'); if (!b || !this.moviendo) return;
      const destino = await SRP.almacen.uno('jornadas', b.dataset.id);
      this.el('dlg-mover-jornada').close();
      if (destino) await this.mover(this.moviendo, destino);
    });
    this.el('btn-jornada-estado').addEventListener('click', () => this.cambiarEstado());
    // Saltos a las secciones de la ficha (D141): desplaza y deja el foco en el subtítulo
    this.el('jornada-saltos').addEventListener('click', (e) => {
      const b = e.target.closest('button[data-salto]'); if (!b) return;
      const h = this.el(b.dataset.salto);
      h.scrollIntoView({ behavior: 'smooth', block: 'start' });
      h.focus({ preventScroll: true });
    });
    SRP.ICONOS.poner(this.el('btn-jornada-todos-bien'), 'palomita', 'medio');
    this.el('btn-jornada-todos-bien').addEventListener('click', () => this.marcarTodosRevisados());
    // El botón de «Siguiente» (D138): cerrar la jornada o ir al primer punto por revisar
    this.el('btn-jornada-siguiente').addEventListener('click', () =>
      this.el('btn-jornada-siguiente').dataset.accion === 'revisar' ? this.irAPendiente() : this.cambiarEstado());
  },

  async cambiarEstado() {
    const j = await this.jornadaGuardada(this.jornada); if (!j) return;
    if (!SRP.permisos.exigir('jornada.editar', j)) return;
    if (j.estatus === 'abierta') {
      const ok = await SRP.app.confirmar(await SRP.activa.confirmacionCierre(j));
      if (!ok) return;
      await SRP.activa.cambiarEstatus(await SRP.activa.ofrecerActualizarPrevistos(j), 'cerrada');
      if (SRP.activa.jornada && SRP.activa.jornada.id === j.id) SRP.activa.jornada = null;
      await this.refrescar();
      // Terminar un paso anuncia el siguiente (D138)
      await this.avisarCierre(j);
      this.enfocarSiguiente();
      return;
    }
    await SRP.activa.reabrir(j);
    await this.refrescar();
  },

  /* ---------- Datos ---------- */

  distancia(a, b) {
    const R = 6371000, rad = Math.PI / 180;
    const dLat = (b.lat - a.lat) * rad, dLng = (b.lng - a.lng) * rad;
    const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLng / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(h));
  },

  async registrosAlcance() {
    const u = SRP.sesion.usuario;
    return (await SRP.almacen.porIndice('plantaciones', 'estatus', 'activo'))
      .filter(r => SRP.permisos.alcanza(u, r, SRP.ref.usuarioPorId));
  },

  /* Las jornadas que alcanza quien entró, con sus registros (D119). Se devuelven en orden: fecha
     más reciente primero, luego cabo, luego hora de inicio. `n` y `total` numeran las del mismo
     día y cabo. */
  async jornadasAlcance() {
    const u = SRP.sesion.usuario;
    const todas = (await SRP.almacen.todos('jornadas')).filter(j => SRP.permisos.alcanza(u, j, SRP.ref.usuarioPorId));
    const activos = await SRP.almacen.porIndice('plantaciones', 'estatus', 'activo');
    /* Los árboles del alcance y, en las jornadas en que quien entró está en un relevo, todos los de la
       jornada: quien sigue la jornada de otro cabo necesita ver lo que ya se plantó (no por eso los edita) */
    const deRelevo = new Set(todas.filter(j => j.cabo_id !== u.id && SRP.permisos.personasDe(j).includes(u.id)).map(j => j.id));
    const regs = activos.filter(r => SRP.permisos.alcanza(u, r, SRP.ref.usuarioPorId) || deRelevo.has(r.jornada_id));
    const porJornada = {};
    regs.forEach(r => { (porJornada[r.jornada_id] = porJornada[r.jornada_id] || []).push(r); });
    const salida = todas.map(d => ({
      clave: d.id, id: d.id, fecha: d.fecha, cabo_id: d.cabo_id, nombre: d.nombre, comentarios: d.comentarios || '',
      estatus: d.estatus, fecha_inicio: d.fecha_inicio, dato: d,
      registros: (porJornada[d.id] || []).sort((a, b) => a.fecha_registro.localeCompare(b.fecha_registro)),
      // Quiénes trabajaron en ella: el titular, los cabos de los relevos y quien capturó cada árbol
      personas: [...new Set(SRP.permisos.personasDe(d).concat((porJornada[d.id] || []).map(r => r.cabo_id)))]
    }));
    /* La prioridad de reforestación de la jornada: no se guarda, se dice con la capa vigente. Se
       calcula sólo cuando se pide (la tarjeta que se pinta, el filtro por prioridad): cruzar de una vez
       los árboles de todas las jornadas frenaría la lista */
    salida.forEach(j => Object.defineProperty(j, 'prioridad', { configurable: true, enumerable: false,
      get() { const p = SRP.prioritarias.deJornada(j.registros, j.dato); Object.defineProperty(j, 'prioridad', { value: p, enumerable: false }); return p; } }));
    // Numeración dentro del día y cabo, por hora de inicio
    const grupos = {};
    salida.forEach(j => { const k = j.fecha + '|' + j.cabo_id; (grupos[k] = grupos[k] || []).push(j); });
    Object.values(grupos).forEach(g => {
      g.sort((a, b) => String(a.fecha_inicio).localeCompare(String(b.fecha_inicio)));
      g.forEach((j, i) => { j.n = i + 1; j.total = g.length; });
    });
    return salida.sort((a, b) => b.fecha.localeCompare(a.fecha) ||
      SRP.ref.nombreUsuario(a.cabo_id).localeCompare(SRP.ref.nombreUsuario(b.cabo_id), 'es') || a.n - b.n);
  },

  // La jornada tal como está guardada, fresca: meta, puntos revisados y datos de cierre del reporte
  async jornadaGuardada(j) { return (await SRP.almacen.uno('jornadas', j.id)) || j.dato || null; },

  nombreSitio(j) { return j.nombre || 'Sin nombre'; },

  // Cuándo, en corto, para la tarjeta: «hoy 11:36» o «28-SEP 11:36» (con el año si es otro)
  cuandoCorto(iso) {
    const dia = SRP.envio.diaLocal(iso), hoy = SRP.util.fechaHoy();
    const f = SRP.util.formatearFecha(dia);
    return (dia === hoy ? 'hoy' : dia.slice(0, 4) === hoy.slice(0, 4) ? f.slice(0, f.lastIndexOf('-')) : f) + ' ' + SRP.envio.hora(iso);
  },

  // Cuándo se cerró. En la ficha, corto: «Cerrada a las 15:40» si fue el mismo día de la jornada y
  // «Cerrada el 23/09 a las 10:05» si fue otro; en el detalle, con el día en letra. Sin fecha
  // guardada (o abierta) sólo dice el estado.
  textoCierre(g, largo) {
    if (!g || g.estatus !== 'cerrada' || !g.fecha_cierre) return largo ? 'cerrada' : 'Cerrada';
    if (largo) return 'cerrada ' + SRP.envio.cuando(g.fecha_cierre);
    const dia = SRP.envio.diaLocal(g.fecha_cierre);
    return 'Cerrada ' + (dia === g.fecha ? '' : 'el ' + dia.slice(8, 10) + '/' + dia.slice(5, 7) + ' ') + 'a las ' + SRP.envio.hora(g.fecha_cierre);
  },

  // Árboles previstos de la jornada, escritos al iniciarla
  previstosDe(j) {
    const d = j && (j.dato || j);
    return d && Number.isInteger(d.arboles_previstos) ? d.arboles_previstos : null;
  },

  alcaldiasDe(j) { return [...new Set(j.registros.map(r => SRP.ref.alcaldia(r.alcaldia)).filter(Boolean))]; },

  /* El color del punto: sin aviso, blanco; por revisar, ámbar; lejos, rojo; revisado, verde. Un
     sustituto va en morado salvo que tenga un aviso por atender, que manda. */
  tonoPunto(r, av, revisado) {
    const t = !av.length ? '' : revisado ? 'ok' : av.some(a => a.tipo === 'lejos') ? 'err' : 'rev';
    return r.sustituye_id && (t === '' || t === 'ok') ? 'sust' : t;
  },

  claveEspecie(r) { return r.especie_id || 'otra:' + SRP.util.normalizar(r.especie_otra); },

  /* Los avisos de cada punto. Devuelve { id: [ { tipo, texto } ] } con el número de orden de la
     jornada en el texto, para que la lista y el mapa digan lo mismo. */
  avisos(j) {
    const cfg = SRP.CONFIG.JORNADA;
    const regs = j.registros;
    const num = {}; regs.forEach((r, i) => { num[r.id] = i + 1; });
    const salida = {};
    const poner = (r, tipo, texto) => { (salida[r.id] = salida[r.id] || []).push({ tipo, texto }); };
    regs.forEach((r, i) => {
      // Duplicado: la misma especie casi en el mismo lugar
      regs.forEach((o, k) => {
        if (k === i || this.claveEspecie(o) !== this.claveEspecie(r)) return;
        const d = this.distancia(r, o);
        if (d < cfg.DUPLICADO_M) poner(r, 'duplicado', 'Posible duplicado del ' + num[o.id] + ' · a ' + d.toFixed(1) + ' m');
      });
      /* Lejos del resto: frente al árbol más cercano de la jornada, no al centro de todos. Una
         jornada con dos grupos —una banqueta y el parque de enfrente— no marca un grupo entero
         sólo porque el centro cae en el otro; se marca el árbol que no tiene a nadie cerca */
      if (regs.length >= 3) {
        const d = Math.min(...regs.filter(o => o !== r).map(o => this.distancia(r, o)));
        if (d > cfg.FUERA_M) poner(r, 'lejos', 'Lejos del resto · a ' + Math.round(d) + ' m del más cercano');
      }
      if (r.punto_origen === 'gps' && r.gps_precision_m > SRP.CONFIG.MAPA.PRECISION_ACEPTABLE_M) {
        poner(r, 'precision', 'Precisión baja · ±' + Math.round(r.gps_precision_m) + ' m');
      }
    });
    return salida;
  },

  // Lo que queda por revisar: puntos con aviso que nadie marcó como «Está bien»
  pendientes(j, avisos, guardada) {
    const revisados = (guardada && guardada.puntos_revisados) || [];
    return j.registros.filter(r => avisos[r.id] && !revisados.includes(r.id));
  },

  /* El estado de la jornada en una frase y un tono: lo que se ve en la tarjeta y en la revisión */
  estado(j, avisos, guardada) {
    const e = this.estadoTexto(j, avisos, guardada);
    e.icono = this.iconoTono(e.tono, j.estatus === 'abierta');
    return e;
  },

  /* Cada tono lleva su icono (D141), para que el color no vaya solo (Norma 8.4): por revisar, «i»;
     completa o cuadra, palomita; falta o sobra, tache; en curso (abierta), reloj. */
  iconoTono(tono, abierta) {
    return { rev: 'info', ok: 'palomita', err: 'cerrar' }[tono] || (abierta ? 'reloj' : 'info');
  },

  estadoTexto(j, avisos, guardada) {
    const pend = this.pendientes(j, avisos, guardada).length;
    const meta = this.previstosDe(guardada || j);
    const reg = j.registros.length;
    if (pend) return { tono: 'rev', texto: pend === 1 ? '1 punto por revisar' : pend + ' puntos por revisar' };
    if (j.estatus === 'abierta') {
      if (meta === null) return { tono: 'neutro', texto: reg ? 'En curso' : 'Sin árboles' };
      return reg >= meta ? { tono: 'ok', texto: 'Completa: ' + reg + ' de ' + meta + ' previstos' } : { tono: 'neutro', texto: 'En curso: ' + reg + ' de ' + meta };
    }
    if (meta === null) return { tono: 'neutro', texto: 'Sin cantidad prevista' };
    if (reg === meta) return { tono: 'ok', texto: 'Completa: ' + reg + ' de ' + meta };
    return { tono: 'err', texto: (reg < meta ? 'Faltan ' + (meta - reg) : 'Sobran ' + (reg - meta)) + ' · ' + reg + ' de ' + meta };
  },

  /* PASOS DE LA JORNADA (D138). El flujo es lineal —registrar, cerrar, revisar, reporte— y aquí se
     calcula en qué paso va una jornada y qué sigue. Lo usan la tira del panel de Nuevo registro y
     la de la ficha, para que ambas digan lo mismo. `j` trae sus registros (la vista de la lista o
     { registros }); `guardada` es la jornada tal como está en la base. Un paso está hecho cuando:
       registrar: hay árboles y, abierta, ya se alcanzó la meta (cerrada, se dejó de registrar);
       cerrar: la jornada está cerrada;
       revisar: cerrada y sin puntos por revisar;
       reporte: cerrada y con reporte generado.
     El paso actual es el primero que falta; sin ninguno, la jornada está completa. */
  PASOS: [['registrar', 'Registrar'], ['cerrar', 'Cerrar'], ['revisar', 'Revisar'], ['reporte', 'Reporte']],

  pasos(j, guardada) {
    const c = guardada || j.dato || j;
    const n = j.registros.length;
    const meta = this.previstosDe(c);
    const abierta = c.estatus === 'abierta';
    const pend = this.pendientes(j, this.avisos(j), c).length;
    const hecho = {
      registrar: n > 0 && (!abierta || meta === null || n >= meta),
      cerrar: !abierta,
      revisar: !abierta && pend === 0,
      reporte: !abierta && !!c.reporte_en
    };
    const actual = (this.PASOS.find(([k]) => !hecho[k]) || ['completa'])[0];
    return { hecho, actual, n, meta, pend, abierta, reporte_en: c.reporte_en || null };
  },

  /* El indicador de avance (D146): un círculo por paso unido al anterior por un tramo, y el nombre
     debajo. El actual va relleno en acento y su nombre en negritas; el hecho, en verde con palomita;
     el que falta, en blanco con su número. El número lo pone la hoja de estilos (contador), así el
     lector de pantalla oye sólo «Registrar (hecho)» y no «1 Registrar». El color no va solo
     (Norma 8.4): palomita, relleno y peso distinguen los tres estados. */
  htmlPasos(p) {
    return this.PASOS.map(([k, t]) => {
      const est = p.hecho[k] ? 'hecho' : k === p.actual ? 'actual' : 'pendiente';
      return '<li class="paso" data-estado="' + est + '"' + (est === 'actual' ? ' aria-current="step"' : '') + '>' +
        '<span class="paso-marca" aria-hidden="true">' + (est === 'hecho' ? SRP.ICONOS.svg('palomita', 'chico') : '') + '</span>' +
        '<span class="paso-texto">' + t + '</span>' +
        (est === 'hecho' ? '<span class="oculto-visual"> (hecho)</span>' : est === 'actual' ? '<span class="oculto-visual"> (paso actual)</span>' : '') + '</li>';
    }).join('');
  },

  /* «Siguiente:» en una frase. `propia`: quien mira es quien registra en ella (si no, lo que sigue
     lo hace el cabo). Devuelve { html, texto, tono } — texto plano para el aviso flotante. */
  siguiente(p, propia) {
    const arboles = n => n + (n === 1 ? ' árbol' : ' árboles');
    const cuenta = p.meta !== null ? ' (' + p.n + ' de ' + p.meta + ')' : '';
    let que, cola = '', tono = 'neutro';
    if (p.actual === 'registrar') {
      if (!p.abierta) { que = 'reabrirla para registrar árboles, o eliminarla'; cola = ' (está cerrada y sin árboles)'; }
      else {
        que = (p.n ? 'registrar los árboles que faltan' : 'registrar el primer árbol') + (propia ? '' : ' (lo hace el cabo)');
        cola = cuenta;
      }
    } else if (p.actual === 'cerrar') { que = 'cerrar la jornada'; cola = ' (' + (p.meta !== null ? p.n + ' de ' + p.meta + ' árboles' : arboles(p.n)) + ')'; }
    else if (p.actual === 'revisar') { que = 'revisar ' + (p.pend === 1 ? '1 punto marcado' : p.pend + ' puntos marcados'); tono = 'rev'; }
    else if (p.actual === 'reporte') que = 'generar el reporte';
    else {
      // «Todo listo», no «Jornada completa»: eso es la ventana de cuando se llega a lo previsto, y aquí
      // puede faltar algún árbol (4 de 5) con todos los pasos hechos
      const t = 'Todo listo: reporte generado ' + SRP.envio.cuando(p.reporte_en) + '.';
      return { html: SRP.ICONOS.svg('palomita', 'chico') + '<span>' + SRP.util.escapar(t) + '</span>', texto: t, tono: 'ok' };
    }
    const texto = 'Siguiente: ' + que + cola + '.';
    return { html: '<span>Siguiente: <b>' + SRP.util.escapar(que) + '</b>' + SRP.util.escapar(cola) + '.</span>', texto, tono };
  },

  // Tras cerrar (desde el panel o desde la ficha), el aviso dice qué sigue (D138)
  async avisarCierre(j) {
    const vista = (await this.jornadasAlcance()).find(x => x.id === j.id);
    const guardada = await SRP.almacen.uno('jornadas', j.id);
    const s = vista && guardada ? this.siguiente(this.pasos(vista, guardada), SRP.activa.capturista(guardada) === SRP.sesion.usuario.id) : null;
    SRP.util.anunciar('Jornada «' + j.nombre + '» cerrada.' + (s ? ' ' + s.texto : ''), 'exito');
  },

  /* ---------- Lista de jornadas ---------- */

  async preparar() {
    const u = SRP.sesion.usuario;
    const alcance = SRP.permisos.de(u).alcance;
    SRP.util.pintarChipHoy(this.el('jornada-chip-hoy'));
    // «Quién registró» sólo para perfiles que ven a más de una persona; la lista se llena con las demás
    this.el('caja-jornada-cabo').hidden = alcance === 'propios';
    if (alcance === 'propios') this.filtro.cabo = '';
    // Al volver de editar un punto se regresa a la jornada que se estaba revisando
    if (this.volverAlDetalle && this.actual) {
      this.volverAlDetalle = false;
      await this.pintarLista(true);
      // Si el filtro la deja fuera (es de otro día o de otro cabo), el filtro se ajusta a ella:
      // «Cerrar jornada» siempre debe llegar a la ficha de esa jornada (D125)
      if (!this.lista.some(j => j.clave === this.actual)) {
        const j = await SRP.almacen.uno('jornadas', this.actual);
        if (j) {
          Object.assign(this.filtro, { dia: j.fecha, desde: '', hasta: '', anio: '', mes: '' }); this.periodoAbierto = false;
          if (j.fecha === SRP.util.fechaHoy()) { this.diaAbierto = false; this.el('jornada-dia').value = ''; }
          else { this.diaAbierto = true; this.el('jornada-dia').value = j.fecha; }
          if (this.filtro.cabo && !SRP.permisos.personasDe(j).includes(this.filtro.cabo)) { this.filtro.cabo = ''; if (this.el('jornada-cabo')) this.el('jornada-cabo').value = ''; }
          await this.pintarLista(true);
        }
      }
      if (this.lista.some(j => j.clave === this.actual)) {
        await this.abrir(this.actual);
        if (this.trasCierre) { const j = this.trasCierre; this.trasCierre = null; await this.avisarCierre(j); this.enfocarSiguiente(); }
        return;
      }
    }
    this.actual = null;
    this.mostrarDetalle(false);
    await this.pintarLista();
  },

  aplicarAtajo(atajo) {
    const f = this.filtro;
    const limpiarFechas = () => { f.dia = ''; f.desde = ''; f.hasta = ''; f.anio = ''; f.mes = ''; this.el('jornada-dia').value = ''; this.el('jornada-desde').value = ''; this.el('jornada-hasta').value = ''; };
    if (atajo === 'hoy') { limpiarFechas(); f.dia = SRP.util.fechaHoy(); this.diaAbierto = false; this.periodoAbierto = false; }
    if (atajo === 'todas') { limpiarFechas(); this.diaAbierto = false; this.periodoAbierto = false; }
    // «Este mes» y «Este año»: el mes y el año en curso, sin abrir ningún campo
    if (atajo === 'mes' || atajo === 'anio') {
      limpiarFechas(); this.diaAbierto = false; this.periodoAbierto = false;
      const hoy = SRP.util.fechaHoy(); f.anio = hoy.slice(0, 4); f.mes = atajo === 'mes' ? hoy.slice(5, 7) : '';
    }
    // «Un día» y «Un periodo» sólo abren su fecha; filtran al elegirla (D113) o con «Aplicar» (D82)
    if (atajo === 'dia') { this.diaAbierto = true; this.periodoAbierto = false; f.desde = ''; f.hasta = ''; f.dia = this.el('jornada-dia').value; if (f.dia) { f.anio = ''; f.mes = ''; } }
    if (atajo === 'periodo') { this.periodoAbierto = true; this.diaAbierto = false; }
    this.pintarLista();
  },

  /* Deja la lista como al entrar: todas, sin búsqueda, sin revisión y sin listas. Con `avisar`, lo dice y ofrece deshacer. */
  quitarFiltros(avisar) {
    const antes = Object.assign({}, this.filtro), dia = this.diaAbierto, per = this.periodoAbierto;
    Object.assign(this.filtro, { texto: '', revision: '', cabo: '', programa: '', alcaldia: '', organizacion: '' });
    this.el('jornada-buscar').value = ''; this.el('jornada-revision').value = '';
    this.aplicarAtajo('todas');
    if (avisar) SRP.util.anunciar('Filtros quitados: todas las jornadas.', 'exito', { deshacer: () => {
      Object.assign(this.filtro, antes); this.diaAbierto = dia; this.periodoAbierto = per;
      this.el('jornada-buscar').value = antes.texto; this.el('jornada-revision').value = antes.revision;
      this.el('jornada-dia').value = dia ? antes.dia : ''; this.el('jornada-desde').value = antes.desde; this.el('jornada-hasta').value = antes.hasta;
      this.pintarLista();
    } });
  },

  // Lo que está filtrando: [qué quitar, texto]
  fichas() {
    const f = this.filtro, fmt = d => SRP.util.formatearFecha(d), salida = [];
    if (f.texto) salida.push(['texto', 'Buscar: ' + f.texto]);
    if (f.revision) salida.push(['revision', f.revision === 'lista' ? this.REVISION.lista : 'Pendientes: ' + this.REVISION[f.revision].toLowerCase()]);
    let periodo = '';
    if (f.desde || f.hasta) periodo = f.desde && f.hasta ? fmt(f.desde) + ' al ' + fmt(f.hasta) : (f.desde ? 'Desde ' + fmt(f.desde) : 'Hasta ' + fmt(f.hasta));
    else if (f.dia) periodo = (f.dia === SRP.util.fechaHoy() ? 'Hoy, ' : '') + fmt(f.dia);
    else if (f.anio) periodo = f.mes ? SRP.util.nombreMes(f.anio + '-' + f.mes) : f.anio;
    if (periodo) salida.push(['periodo', periodo]);
    if (f.cabo) salida.push(['cabo', 'Registró: ' + SRP.ref.nombreUsuario(f.cabo)]);
    if (f.programa) salida.push(['programa', 'Programa: ' + SRP.ref.nombreCatalogo(f.programa)]);
    if (f.alcaldia) salida.push(['alcaldia', 'Alcaldía: ' + f.alcaldia]);
    if (f.organizacion) salida.push(['institucion', 'Institución: ' + SRP.ref.nombreOrganizacion(f.organizacion)]);
    return salida;
  },

  sincronizarAtajos() {
    const f = this.filtro, hoy = SRP.util.fechaHoy();
    const libre = !this.diaAbierto && !this.periodoAbierto;
    const esteAnio = libre && !f.dia && !f.desde && !f.hasta && f.anio === hoy.slice(0, 4);
    const activo = { hoy: libre && f.dia === hoy, dia: this.diaAbierto, periodo: this.periodoAbierto,
      mes: esteAnio && f.mes === hoy.slice(5, 7), anio: esteAnio && !f.mes,
      todas: libre && !f.dia && !f.desde && !f.hasta && !f.anio && !f.mes };
    SRP.util.atajos.marcar(this.el('jornada-atajos'), activo, { dia: [this.el('jornada-un-dia'), this.diaAbierto], periodo: [this.el('jornada-periodo'), this.periodoAbierto] });   // M15
    // El resumen del acordeón dice qué hay elegido dentro, aunque esté plegado
    const conCabo = !this.el('caja-jornada-cabo').hidden, conOrg = !this.el('caja-jornada-org').hidden;
    this.el('jornada-mas-filtros').hidden = false;
    const dentro = [f.cabo ? SRP.ref.nombreUsuario(f.cabo) : '', f.programa ? SRP.ref.nombreCatalogo(f.programa) : '',
      f.alcaldia, f.organizacion ? SRP.ref.nombreOrganizacion(f.organizacion) : ''].filter(Boolean);
    const disponibles = [conCabo ? 'quién registró' : '', 'programa', 'alcaldía', conOrg ? 'institución' : ''].filter(Boolean);
    this.el('jornada-mas-filtros-texto').textContent = 'Más filtros: ' + (dentro.length ? dentro.join(' · ') : SRP.util.enumerar(disponibles));
    const fichas = this.fichas();
    SRP.util.pintarFichas(this.el('jornada-fichas'), fichas);
    this.el('jornada-quitar').hidden = !fichas.length;
  },

  /* REVISIÓN DE UNA JORNADA, para el filtro: qué tiene pendiente.
     revisar: puntos con aviso que nadie marcó «Está bien»;
     cuadra:  cerrada y lo registrado no es lo previsto (faltan o sobran). */
  pendientesDe(j) {
    const g = j.dato || null;
    const revisar = this.pendientes(j, this.avisos(j), g).length > 0;
    const meta = this.previstosDe(g || j);
    const cerrada = (g || j).estatus === 'cerrada';
    const cuadra = cerrada && meta !== null && Number.isInteger(meta) && j.registros.length !== meta;
    // Sin reporte: cerrada, con árboles y sin su reporte generado
    const sinreporte = cerrada && j.registros.length > 0 && !(g || {}).reporte_en;
    return { revisar, cuadra, sinreporte };
  },

  cumpleRevision(j, r) {
    if (!r) return true;
    const p = this.pendientesDe(j);
    if (r === 'revisar') return p.revisar;
    if (r === 'cuadra') return p.cuadra;
    if (r === 'sinreporte') return p.sinreporte;
    if (r === 'pendiente') return p.revisar || p.cuadra || p.sinreporte;
    if (r === 'lista') return !p.revisar && !p.cuadra && !p.sinreporte;
    return true;
  },

  // La institución de la jornada (o, sin ella, la de quien la inició) y sus alcaldías: la suya y las de sus árboles
  orgDe(j) { return (j.dato && j.dato.organizacion_id) || (SRP.ref.usuarioPorId[j.cabo_id] || {}).organizacion_id || ''; },
  alcaldiasFiltro(j) { return [...new Set([j.dato && j.dato.alcaldia ? SRP.ref.alcaldia(j.dato.alcaldia) : ''].concat(this.alcaldiasDe(j)).filter(Boolean))]; },

  /* Alcaldía, para todos; institución, sólo para quien ve más de una. Las listas traen sólo lo que hay en las jornadas que se ven. */
  llenarListas() {
    const f = this.filtro, ver = SRP.permisos.de(SRP.sesion.usuario).alcance === 'todos';
    const valores = { cabo: j => j.personas || [j.cabo_id], programa: j => j.dato && j.dato.programa_id, alcaldia: j => this.alcaldiasFiltro(j), organizacion: j => this.orgDe(j) };
    if (!ver) { delete valores.organizacion; f.organizacion = ''; }
    const fac = SRP.util.facetas(this._todas, (j, ex) => this.cumpleListas(j, ex), valores);
    if (!this.el('caja-jornada-cabo').hidden) {
      this.el('jornada-cabo').innerHTML = SRP.util.opciones('Todos', SRP.util.paresPersonas([...fac.cabo].concat(f.cabo || [])));
      this.el('jornada-cabo').value = f.cabo;
    }
    SRP.util.llenarLista(this.el('jornada-programa'), 'Todos', [...fac.programa].map(id => [id, SRP.ref.nombreCatalogo(id)]), f, 'programa', id => SRP.ref.nombreCatalogo(id));
    SRP.util.llenarLista(this.el('jornada-alcaldia'), 'Todas', [...fac.alcaldia].map(a => [a, a]), f, 'alcaldia');
    this.el('caja-jornada-org').hidden = !ver;
    if (ver) SRP.util.llenarInstituciones(this.el('jornada-org'), fac.organizacion, f);
  },

  // ¿Pasa los filtros de lista (quién, programa, alcaldía, institución), salvo los de `excluir`?
  cumpleListas(j, excluir) {
    const f = this.filtro, x = k => !excluir || !excluir.has(k);
    return (!f.cabo || !x('cabo') || (j.personas || [j.cabo_id]).includes(f.cabo)) &&
      (!f.programa || !x('programa') || (j.dato && j.dato.programa_id) === f.programa) &&
      (!f.alcaldia || !x('alcaldia') || this.alcaldiasFiltro(j).includes(f.alcaldia)) &&
      (!f.organizacion || !x('organizacion') || this.orgDe(j) === f.organizacion);
  },

  cumpleFiltro(j) {
    const f = this.filtro;
    if (!this.cumpleListas(j)) return false;
    if (f.revision && !this.cumpleRevision(j, f.revision)) return false;
    // Cada palabra buscada tiene que estar en el nombre, en cualquier orden: «parque norte» encuentra «Parque Hundido, sección norte»
    if (f.texto) {
      const nombre = SRP.util.normalizar(j.nombre);
      if (!SRP.util.normalizar(f.texto).split(/\s+/).every(p => nombre.includes(p))) return false;
    }
    if (f.dia) return j.fecha === f.dia;
    if (f.desde && j.fecha < f.desde) return false;
    if (f.hasta && j.fecha > f.hasta) return false;
    if (f.anio && !j.fecha.startsWith(f.anio)) return false;
    if (f.mes && j.fecha.slice(5, 7) !== f.mes) return false;
    return true;
  },

  // «Hoy» / «Ayer» delante de la fecha, cuando aplica
  cuando(fecha) {
    const hoy = SRP.util.fechaHoy();
    if (fecha === hoy) return 'Hoy';
    const ayer = new Date(hoy + 'T12:00:00'); ayer.setDate(ayer.getDate() - 1);
    const a = ayer.getFullYear() + '-' + String(ayer.getMonth() + 1).padStart(2, '0') + '-' + String(ayer.getDate()).padStart(2, '0');
    return fecha === a ? 'Ayer' : '';
  },

  // Dónde: alcaldía y colonia de la jornada si se detectaron al iniciarla; si no, las de sus árboles
  // La de la jornada, o la que dicen sus árboles; en el mismo formato que la franja (M15)
  lugarDe(j) {
    const d = j.dato || {};
    if (d.alcaldia || d.colonia) return SRP.ref.lugar(d.alcaldia, d.colonia);
    const cols = [...new Set(j.registros.map(r => r.colonia).filter(Boolean))];
    return SRP.ref.lugar(this.alcaldiasDe(j), cols.length === 1 ? cols[0] : '');
  },

  async pintarLista(soloDatos) {
    const f = this.filtro;
    this._todas = await this.jornadasAlcance();
    this.llenarListas();
    this.sincronizarAtajos();
    this.lista = SRP.util.ordenar(this._todas.filter(j => this.cumpleFiltro(j)), 'jornadas');
    if (soloDatos) return;
    SRP.util.pintarOrden(this.el('jornadas-orden'), 'jornadas', async () => { this.pagina = 1; await this.pintarLista(); });
    const u = SRP.sesion.usuario;
    const variosAutores = SRP.permisos.de(u).alcance !== 'propios';
    const esc = SRP.util.escapar;
    const html = [];
    const arbolesTotal = this.lista.reduce((s, j) => s + j.registros.length, 0);
    // Un filtro nuevo vuelve a la primera página; editar o cerrar una jornada conserva la página
    const clave = JSON.stringify(f);
    if (clave !== this._claveFiltro) { this._claveFiltro = clave; this.pagina = 1; }
    const info = SRP.util.paginar(this.lista, this.pagina, 'jornadas-paginas');
    this.pagina = info.pagina;
    for (const j of info.items) {
      const guardada = await this.jornadaGuardada(j);
      const avisos = this.avisos(j);
      const est = this.estado(j, avisos, guardada);
      const n = j.registros.length;
      const especies = new Set(j.registros.map(r => this.claveEspecie(r))).size;
      // Cuántos de sus árboles reemplazan a uno que se perdió
      const sustituciones = j.registros.filter(r => r.sustituye_id).length;
      const porRevisar = this.pendientes(j, avisos, guardada).length;
      const cuando = this.cuando(j.fecha);
      const meta = this.previstosDe(guardada || j);
      const fecha = SRP.envio.diaEnLetra(j.fecha).split(' ')[0].slice(0, 3) + ' ' + SRP.util.textoDias(SRP.util.diasJornada(j, j.registros));
      const abierta = j.estatus === 'abierta';
      const generado = (guardada || j.dato || {}).reporte_en;
      const relevo = guardada && guardada.relevo_id && guardada.relevo_id !== j.cabo_id ? guardada.relevo_id : '';
      const lugar = this.lugarDe(j);
      const ubic = (j.dato && j.dato.ubicacion) || '';
      const programa = (guardada || j.dato || {}).programa_id;
      // Lo previsto se compara con lo registrado: cumplido, a medias o, ya cerrada, sin cuadrar
      const completa = meta !== null && (abierta ? n >= meta : n === meta);
      const tonoAvance = abierta ? 'curso' : completa ? 'ok' : 'falta';
      const ancho = meta ? Math.min(100, Math.round(n / meta * 100)) : 0;
      // Lo normal se resume en una línea; sólo lo que pide atención lleva su marca
      const marca = (tono, icono, texto, clase) => '<span class="insignia-jornada' + (clase ? ' ' + clase : '') + '" data-tono="' + tono + '">' + SRP.ICONOS.svg(icono, 'chico') + '<span>' + esc(texto) + '</span></span>';
      const marcas = [];
      if (porRevisar) marcas.push(marca('rev', 'info', porRevisar + ' por revisar'));
      if (!abierta && meta !== null && n !== meta) marcas.push(marca('err', 'cerrar', n < meta ? (meta - n === 1 ? 'Faltó 1' : 'Faltaron ' + (meta - n)) + ' de lo previsto' : (n - meta) + ' más de lo previsto'));
      if (sustituciones) marcas.push(marca('sust', 'intercambio', sustituciones + (sustituciones === 1 ? ' sustitución' : ' sustituciones')));
      if (!abierta && n && !generado) marcas.push(marca('rev', 'reportes', 'Sin reporte todavía', 'insignia-reporte'));
      // Orden de la tarjeta: nombre → cuándo → cuánto → estado → dónde → programa y quién → lo que falta atender
      html.push('<li class="jornada" data-clave="' + esc(j.clave) + '"><button type="button" class="jornada-boton" aria-label="Revisar la jornada ' +
        esc(this.nombreSitio(j)) + ' del ' + esc(SRP.util.formatearFecha(j.fecha)) + ', ' + (abierta ? 'abierta' : esc(this.textoCierre(guardada, true))) + ', ' + n + (n === 1 ? ' árbol' : ' árboles') + (sustituciones ? ', ' + sustituciones + (sustituciones === 1 ? ' sustitución' : ' sustituciones') : '') + ', ' + esc(est.texto) + '">' +
        '<span class="jornada-cab"><span class="jornada-titulo-caja"><span class="jornada-sitio">' + esc(this.nombreSitio(j)) + '</span>' +
        '<span class="jornada-dia">' + (cuando ? '<b>' + cuando + '</b> · ' : '') + '<span class="jornada-fecha">' + esc(fecha) + '</span>' +
        (j.total > 1 ? ' <span class="jornada-ndn">Jornada ' + j.n + ' de ' + j.total + '</span>' : '') + '</span></span>' + this.miniatura(j, avisos, (guardada && guardada.puntos_revisados) || []) + '</span>' +
        '<span class="jornada-avance"><span class="jornada-avance-cifra"><b>' + n + '</b>' + (meta === null ? (n === 1 ? ' árbol' : ' árboles') + ' · sin cantidad prevista' : ' de ' + meta + (meta === 1 ? ' árbol' : ' árboles')) +
          (completa ? ' · <span class="jornada-completa">' + SRP.ICONOS.svg('palomita', 'chico') + 'completa</span>' : '') + '</span>' +
          '<span class="jornada-avance-especies">' + especies + (especies === 1 ? ' especie' : ' especies') + '</span></span>' +
        (meta ? '<svg class="jornada-barra" data-tono="' + tonoAvance + '" viewBox="0 0 100 8" preserveAspectRatio="none" aria-hidden="true"><rect width="' + ancho + '" height="8"/></svg>' : '') +
        '<span class="jornada-estado"><span class="jornada-estatus" data-estatus="' + (abierta ? 'abierta' : 'cerrada') + '">' + SRP.ICONOS.svg(abierta ? 'candadoAbierto' : 'candado', 'chico') +
        '<span>' + (abierta ? 'Abierta' : esc(this.textoCierre(guardada))) + '</span></span>' +
        (!abierta && n && generado ? '<span class="jornada-reporte insignia-reporte">' + SRP.ICONOS.svg('reportes', 'chico') + '<span>Reporte: ' + esc(this.cuandoCorto(generado)) + '</span></span>' : '') + '</span>' +
        (lugar || ubic ? '<span class="jornada-lugar">' + SRP.ICONOS.svg('ubicacion', 'chico') + '<span>' + [esc(lugar), SRP.prioritarias.marca(j.prioridad),
          ubic ? '<span class="jornada-ubic">' + esc(ubic) + '</span>' : ''].filter(Boolean).join(' · ') + '</span></span>' : '') +
        (programa || variosAutores || relevo ? '<span class="jornada-cabo">' + (programa ? '<span class="jornada-programa">' + esc(SRP.ref.nombreCatalogo(programa)) + '</span>' : '') +
          (variosAutores || relevo ? (programa ? ' · ' : '') + '<b>' + esc(SRP.ref.nombreUsuario(j.cabo_id)) + '</b>' + (relevo ? ' · relevo: ' + esc(SRP.ref.nombreUsuario(relevo)) : '') : '') + '</span>' : '') +
        (SRP.solicitud.es(guardada) ? '<span class="jornada-solicitud">' + SRP.solicitud.insignia(guardada) + '</span>' : '') +
        (marcas.length ? '<span class="jornada-marcas">' + marcas.join('') + '</span>' : '') +
        '</button></li>');
    }
    this.el('lista-jornadas').innerHTML = html.join('');
    const n = this.lista.length;
    this.el('jornadas-total').textContent = n ? n.toLocaleString('es-MX') + (n === 1 ? ' jornada' : ' jornadas') + ' · ' + arbolesTotal.toLocaleString('es-MX') + (arbolesTotal === 1 ? ' árbol' : ' árboles') : '';
    SRP.util.pintarPaginador(this.el('jornadas-paginas'), info, 'jornada', 'jornadas', async (p) => {
      this.pagina = p; await this.pintarLista(); SRP.util.subirA(this.el('jornadas-total'));
    });
    const vacio = this.el('jornadas-vacio');
    vacio.hidden = n > 0;
    // Estado vacío con salida (D141)
    const filtrado = f.texto || f.revision || f.dia || f.desde || f.hasta || f.anio || f.cabo || f.programa || f.alcaldia || f.organizacion;
    const REVISION = { pendiente: 'con algo por atender', revisar: 'con puntos por revisar', cuadra: 'que no cuadren con lo previsto', sinreporte: 'sin reporte', lista: 'sin pendientes' };
    const puedeRegistrar = SRP.permisos.de(u).registrar;
    if (!n) vacio.innerHTML = filtrado
      ? SRP.util.htmlVacio('jornadas', f.texto ? 'Ninguna jornada coincide con «' + f.texto + '»' + (f.dia || f.desde || f.anio || f.cabo || f.revision ? ' con estos filtros.' : '.')
          : f.revision ? 'No hay jornadas ' + REVISION[f.revision] + (f.dia || f.desde || f.anio || f.cabo ? ' con estos filtros.' : '.') : f.dia ? 'No hay jornadas del ' + SRP.util.formatearFecha(f.dia) + '.' : 'No hay jornadas con este filtro.',
          f.texto ? 'Pruebe con otra parte del nombre o vea todas.' : 'Pruebe con otro periodo o vea todas.', [{ accion: 'todas', texto: 'Ver todas' }])
      : SRP.util.htmlVacio('jornadas', 'Todavía no hay jornadas.', 'Cada jornada que se inicie en Nuevo registro aparece aquí con su mapa.',
          [puedeRegistrar ? { accion: 'iniciar', texto: 'Iniciar una jornada', clase: 'btn-primario', icono: 'mas' } : null]);
  },

  // Miniatura: los puntos de la jornada en un cuadro, sin mapa de fondo (no pide nada a la red)
  miniatura(j, avisos, revisados) {
    avisos = avisos || {}; revisados = revisados || [];
    if (!j.registros.length) return '<svg class="jornada-mini" viewBox="0 0 80 80" aria-hidden="true"><rect width="80" height="80" rx="8"/></svg>';
    const lats = j.registros.map(r => r.lat), lngs = j.registros.map(r => r.lng);
    const [a, b, c, d] = [Math.min(...lats), Math.max(...lats), Math.min(...lngs), Math.max(...lngs)];
    const span = Math.max(b - a, d - c, 0.0002);
    const pts = j.registros.map(r => {
      const x = 10 + ((r.lng - c) + (span - (d - c)) / 2) / span * 60;
      const y = 70 - ((r.lat - a) + (span - (b - a)) / 2) / span * 60;
      // Mismo semáforo que el detalle (D166): el revisado, en verde
      const tono = this.tonoPunto(r, avisos[r.id] || [], revisados.includes(r.id));
      return '<circle cx="' + x.toFixed(1) + '" cy="' + y.toFixed(1) + '" r="3.2" data-tono="' + tono + '"/>';
    }).join('');
    return '<svg class="jornada-mini" viewBox="0 0 80 80" aria-hidden="true"><rect width="80" height="80" rx="8"/>' + pts + '</svg>';
  },

  /* ---------- Revisión de una jornada ---------- */

  mostrarDetalle(ver) {
    this.el('jornadas-lista-caja').hidden = ver;
    this.el('jornada-detalle').hidden = !ver;
  },

  async abrir(clave) {
    await this.pintarLista(true);
    const j = this.lista.find(x => x.clave === clave);
    if (!j) { this.cerrar(); return; }
    this.actual = clave;
    this.jornada = j;
    this.mostrarDetalle(true);
    await this.pintarDetalle(true);
    this.el('jornada-titulo').focus({ preventScroll: true });
    SRP.app.alInicio();   // la ficha empieza arriba (D154)
  },

  async cerrar() {
    this.actual = null;
    this.jornada = null;
    this.mostrarDetalle(false);
    await this.pintarLista();
    this.el('titulo-jornadas').focus({ preventScroll: true });
    SRP.app.alInicio();   // y la lista también (D154)
  },

  async pintarDetalle(encuadrar) {
    const j = this.jornada;
    const esc = SRP.util.escapar;
    const u = SRP.sesion.usuario;
    const guardada = await this.jornadaGuardada(j);
    this.guardada = guardada;
    if (SRP.espejo) SRP.espejo.enFicha(this.el('ficha-col-lista'), guardada);
    const avisos = this.avisos(j);
    this.avisosActuales = avisos;
    const revisados = (guardada && guardada.puntos_revisados) || [];
    const regs = j.registros;
    const h = r => SRP.envio.hora(r.fecha_registro);

    this.el('jornada-titulo').textContent = this.nombreSitio(j);
    // Varios días: del primero al último. Las horas y el momento del cierre van en Conciliación, en «Horario»
    const dias = SRP.util.diasJornada(j, regs);
    const relevo = guardada.relevo_id && guardada.relevo_id !== guardada.cabo_id ? guardada.relevo_id : '';
    const lugarFicha = this.alcaldiasDe(j).length ? SRP.ref.lugar(this.alcaldiasDe(j)) : SRP.activa.lugarDe(guardada);
    this.el('jornada-sub').innerHTML = esc(SRP.envio.diaEnLetra(j.fecha).split(' ')[0] + ' ' + SRP.util.textoDias(dias) +
      (j.total > 1 ? ' · Jornada ' + j.n + ' de ' + j.total : '') + ' · ' +
      SRP.ref.nombreUsuario(j.cabo_id) + (relevo ? ' (titular) · relevo: ' + SRP.ref.nombreUsuario(relevo) : '')) +
      (lugarFicha ? ' · ' + esc(lugarFicha) : '') + (SRP.prioritarias.marca(j.prioridad) ? ' · ' + SRP.prioritarias.marca(j.prioridad) : '') +
      esc(' · ' + (guardada.estatus === 'abierta' ? 'abierta' : 'cerrada') +
      (SRP.prioritarias.textoOtras(j.registros, j.dato) ? ' · ' + SRP.prioritarias.textoOtras(j.registros, j.dato) : '') +
      (SRP.solicitud.es(guardada) ? ' · solicita ' + SRP.solicitud.solicitanteCompleto(guardada) : ''));
    this.el('jornada-comentarios').hidden = !guardada.comentarios;
    this.el('jornada-comentarios').textContent = guardada.comentarios || '';
    // Cerrar o reabrir la jornada desde su revisión (D119): quien registra en ella (el titular o el cabo del relevo)
    const propia = SRP.activa.capturista(guardada) === u.id;
    // Cerrar/reabrir, editar: quien registra en ella o quien la alcanza (coordinador de ese cabo, administrador) (D132, D133).
    // Eliminar, sólo vacía —sin árboles, ni eliminados— y también para el coordinador (D151)
    const puedeJornada = SRP.permisos.puede('jornada.editar', guardada);
    const btnEstado = this.el('btn-jornada-estado');
    btnEstado.hidden = !puedeJornada;
    this.el('btn-jornada-editar').hidden = !puedeJornada;
    this.el('btn-jornada-relevo').hidden = !SRP.permisos.puede('jornada.relevo', guardada);
    const vacia = regs.length === 0 && !(await SRP.almacen.porIndice('plantaciones', 'jornada_id', j.id)).length;
    this.el('btn-jornada-eliminar').hidden = !(SRP.permisos.puede('jornada.eliminar', guardada) && vacia);
    // Cerrar no es aprobar: acción principal con candado; reabrir es corregir: neutro con lápiz (D121, D166)
    btnEstado.className = 'btn btn-chico ' + (guardada.estatus === 'abierta' ? 'btn-primario' : 'btn-editar');
    // Reabrir lleva el candado abierto: con el lápiz se confundía con «Editar jornada», al lado y del mismo color (D144)
    btnEstado.innerHTML = SRP.ICONOS.svg(guardada.estatus === 'abierta' ? 'candado' : 'candadoAbierto', 'medio') + '<span>' + (guardada.estatus === 'abierta' ? 'Cerrar jornada' : 'Reabrir jornada') + '</span>';

    // Conciliación: la meta de la jornada contra sus árboles registrados (D131)
    const meta = this.previstosDe(guardada);
    this.el('jornada-meta').textContent = meta === null ? '—' : meta;
    this.el('jornada-registrados').textContent = j.registros.length;
    this.pintarConciliacion();

    const puedeEditar = r => SRP.permisos.puedeEditar(u, r, SRP.ref.usuarioPorId);
    const puedeEliminar = r => SRP.permisos.puedeEliminar(u, r, SRP.ref.usuarioPorId);
    this.el('jornada-lista').innerHTML = regs.map((r, i) => {
      const esp = SRP.ref.especieDe(r);
      const av = avisos[r.id] || [];
      const revisado = av.length && revisados.includes(r.id);
      const tono = this.tonoPunto(r, av, revisado);
      const detalle = (r.sustituye_id ? '<span class="marca-sustituto">Sustituto · ' + esc(SRP.ref.motivoSustitucion(r)) + '</span> ' : '') + (av.length
        ? av.map(a => '<span class="aviso-punto" data-tono="' + (revisado ? 'ok' : tono) + '">' + esc(a.texto) + '</span>').join('') +
          (revisado ? '<span class="aviso-punto" data-tono="ok">Revisado</span>' : '')
        : (r.punto_origen === 'gps' && r.gps_precision_m ? 'GPS ±' + Math.round(r.gps_precision_m) + ' m' : SRP.mapa.textoOrigen(r.punto_origen, r.gps_precision_m)));
      // Color por significado con icono (Norma 8.4, D116): ver neutro, confirmar verde, eliminar rojo
      const I = (n, t) => SRP.ICONOS.svg(n, t);   // no se pasa suelto: svg() usa this
      const acciones = ['<button type="button" class="btn btn-texto" data-accion="ver" data-id="' + SRP.util.escapar(r.id) + '">' + I('ver', 'medio') + '<span>Ver</span></button>'];
      if (av.length && !revisado && puedeEditar(r)) acciones.push('<button type="button" class="btn btn-exito-linea" data-accion="bien" data-id="' + SRP.util.escapar(r.id) + '">' + I('palomita', 'chico') + '<span>Está bien</span></button>');
      // Un duplicado se ofrece eliminar en la fila; el resto, desde la tuerca
      const eliminarEnFila = av.some(a => a.tipo === 'duplicado') && !revisado && puedeEliminar(r);
      if (eliminarEnFila) acciones.push('<button type="button" class="btn btn-peligro-linea" data-accion="eliminar" data-id="' + SRP.util.escapar(r.id) + '">' + I('basura', 'chico') + '<span>Eliminar</span></button>');
      /* La tuerca del punto (D117, D154), con las mismas opciones que la tarjeta en Registros: un
         punto capturado por error se corrige o se elimina desde aquí, sin salir de la jornada. Cada
         acción aparece una sola vez: si «Eliminar» ya está en la fila, no se repite. */
      const items = [];
      if (puedeEditar(r)) items.push({ accion: 'editar', texto: 'Editar', icono: 'lapiz' }, { accion: 'mover', texto: 'Mover a otra jornada', icono: 'jornadas' });
      if (SRP.permisos.puede('registro.sustituir', r)) items.push({ accion: 'sustituir', texto: 'Sustituir', icono: 'intercambio' });
      if (puedeEliminar(r) && !eliminarEnFila) items.push({ accion: 'eliminar', texto: 'Eliminar', icono: 'basura', peligro: true });
      const tuerca = items.length ? SRP.ICONOS.menuAcciones(r.id, 'punto ' + (i + 1), items) : '';
      return '<li class="punto-jornada" data-id="' + SRP.util.escapar(r.id) + '"><span class="punto-num" data-tono="' + tono + '" aria-hidden="true">' + (i + 1) + '</span>' +
        '<div class="punto-datos"><span class="punto-especie"><span class="oculto-visual">Punto ' + (i + 1) + ': </span>' + esc(esp.comun) + '</span>' +
        '<span class="punto-detalle">' + (r.fecha_plantacion !== j.fecha ? esc(SRP.util.formatearFecha(r.fecha_plantacion)) + ' ' : '') + esc(h(r)) +
          (r.cabo_id !== j.cabo_id ? ' · ' + esc(SRP.ref.nombreUsuario(r.cabo_id)) : '') + ' · ' + detalle + '</span>' +
        '</div>' +
        '<div class="punto-acciones">' + acciones.join('') + tuerca + '</div></li>';
    }).join('');

    this.pintarPasos(j, guardada, propia, puedeJornada);
    this.el('jornada-puntos-n').textContent = regs.length;
    this.el('jornada-saltos-n').textContent = regs.length;
    this.pintarMapa(avisos, revisados, encuadrar);
  },

  /* LA TIRA Y LA BARRA DEL PIE (D138). La barra dice qué sigue y trae el botón para hacerlo. Una
     acción aparece una sola vez: si es el siguiente paso, es el botón principal de la barra, y
     «Cerrar jornada» deja el encabezado cuando ya es lo que sigue. */
  pintarPasos(j, guardada, propia, puedeJornada) {
    const p = this.pasos(j, guardada);
    this.pasosActuales = p;
    this.el('jornada-pasos').innerHTML = this.htmlPasos(p);
    const s = this.siguiente(p, propia);
    const linea = this.el('jornada-siguiente');
    linea.innerHTML = s.html;
    linea.dataset.tono = s.tono;
    const I = n => SRP.ICONOS.svg(n, 'medio');
    // Registrar sólo en la jornada propia (el árbol queda a nombre de quien entra). «Registrar árbol»
    // abierta o cerrada: cerrada, la reabre (un nombre por acción, D153)
    const falt = this.el('btn-jornada-faltante');
    falt.hidden = !(SRP.permisos.de(SRP.sesion.usuario).registrar && propia);
    falt.className = 'btn ' + (p.actual === 'registrar' ? 'btn-primario' : 'btn-secundario');
    // Etiquetas cortas (D141): la barra lleva dos botones y no debe partirlos en dos renglones desde 360 px
    falt.innerHTML = I('mas') + '<span>Registrar árbol</span>';
    // El reporte es de una jornada cerrada con árboles (D131); mientras haya puntos por revisar, cede
    // su lugar a «Revisar puntos». Un solo estado (D172): siempre «Generar reporte», aunque ya se haya
    // generado antes; si ya hay reporte, lo dice el paso «Reporte» con su palomita (antes «Regenerar PDF», D148)
    const rep = this.el('btn-jornada-reporte');
    // Quien no puede modificar la jornada no genera el reporte: descarga el que ya existe
    const generado = !!(guardada || j.dato || {}).reporte_en;
    rep.hidden = p.abierta || !p.n || (puedeJornada ? p.actual === 'revisar' : !generado);
    rep.className = 'btn btn-primario';
    rep.innerHTML = puedeJornada ? I('reportes') + '<span>Generar reporte</span>' : I('descargar') + '<span>Descargar reporte</span>';
    const sig = this.el('btn-jornada-siguiente');
    const cerrar = p.actual === 'cerrar' && puedeJornada;
    // Revisar los puntos es de quien puede modificar la jornada
    sig.hidden = !(cerrar || (p.actual === 'revisar' && puedeJornada));
    sig.dataset.accion = p.actual;
    sig.innerHTML = p.actual === 'revisar' ? I('ver') + '<span>Revisar puntos</span>' : I('candado') + '<span>Cerrar jornada</span>';
    if (cerrar) this.el('btn-jornada-estado').hidden = true;
  },

  // El botón principal visible de la barra; sin botón, la línea de «Siguiente»
  enfocarSiguiente() {
    const b = [...document.querySelectorAll('.barra-jornada .btn-primario, .barra-jornada .btn-editar')].find(x => !x.hidden);
    const destino = b || this.el('jornada-siguiente');
    if (!b) destino.setAttribute('tabindex', '-1');
    destino.focus({ preventScroll: true });
  },

  // «Revisar puntos»: al primer punto pendiente, en la lista y en el mapa, con el foco en «Está bien»
  irAPendiente() {
    const pend = this.pendientes(this.jornada, this.avisosActuales || {}, this.guardada);
    if (!pend.length) return;
    const id = pend[0].id;
    this.seleccionar(id, 'lista');
    const li = this.el('jornada-lista').querySelector('[data-id="' + CSS.escape(id) + '"]');
    if (!li) return;
    li.scrollIntoView({ block: 'center', behavior: 'smooth' });
    const b = li.querySelector('button[data-accion="bien"]') || li.querySelector('button[data-accion="ver"]');
    if (b) b.focus({ preventScroll: true });
  },

  pintarConciliacion() {
    const j = this.jornada;
    const plantados = this.previstosDe(this.guardada || j);
    const reg = j.registros.length;
    const pend = this.pendientes(j, this.avisosActuales || {}, this.guardada).length;
    const caja = this.el('jornada-conciliacion');
    const res = this.el('jornada-resultado');
    // Concordancia en número (D144): «Queda 1 punto», «hay 1 punto»; antes decía «Quedan 1 punto» y «hay 1 puntos»
    const cola = pend ? (pend === 1 ? ' Queda 1 punto por revisar.' : ' Quedan ' + pend + ' puntos por revisar.') : '';
    const puntos = n => n + (n === 1 ? ' punto' : ' puntos');
    let tono, texto;
    if (plantados === null || !Number.isInteger(plantados)) {
      tono = 'neutro'; texto = 'La jornada no tiene cantidad prevista de árboles (se escribe al iniciarla).' + cola;
    } else if (plantados === reg) {
      tono = pend ? 'rev' : 'ok'; texto = 'Cuadra: ' + plantados + ' previstos y ' + reg + ' registrados.' + cola;
    } else if (plantados > reg) {
      const n = plantados - reg;
      // Con la jornada abierta, faltar no es error: se sigue registrando (D131)
      const abierta = (this.guardada || j).estatus === 'abierta';
      tono = abierta ? 'neutro' : 'err';
      texto = (abierta ? 'En curso: ' + reg + ' de ' + plantados + ' (faltan ' + n + ').' : (n === 1 ? 'Falta 1 registro' : 'Faltan ' + n + ' registros') + ': se previeron ' + plantados + ' y hay ' + puntos(reg) + '.') + cola;
    } else {
      const n = reg - plantados;
      tono = 'err'; texto = (n === 1 ? 'Sobra 1 registro' : 'Sobran ' + n + ' registros') + ': se previeron ' + plantados + ' y hay ' + puntos(reg) + '. Busque duplicados en el mapa.' + cola;
    }
    caja.dataset.tono = tono;
    this.pintarHorario(this.guardada || j, j.registros);
    // El resultado lleva el icono de su tono (D141)
    res.innerHTML = SRP.ICONOS.svg(this.iconoTono(tono, (this.guardada || j).estatus === 'abierta'), 'medio') + '<span>' + SRP.util.escapar(texto) + '</span>';
    // Con dos o más puntos por revisar, se pueden aprobar todos de una vez
    const todos = this.el('btn-jornada-todos-bien');
    todos.hidden = pend < 2 || !this.guardada || !SRP.permisos.puede('jornada.editar', this.guardada);
    if (!todos.hidden) todos.querySelector('span').textContent = 'Marcar los ' + pend + ' como revisados';
  },

  /* HORARIO. Cuándo se trabajó, con lo que ya guarda la base: la hora en que se guardó el primer y el
     último árbol (`fecha_registro`), lo que hay entre ellos, el cierre (`fecha_cierre`) y el tiempo
     promedio entre un árbol y el siguiente. Es la hora de captura, no la de plantación. En una jornada
     de varios días las noches deformarían la duración y el promedio: se dice sólo el cierre. Todo en el
     mismo minuto no tiene duración ni promedio que decir: sólo la hora. */
  pintarHorario(g, regs) {
    const p = this.el('jornada-horario');
    const horas = regs.map(r => r.fecha_registro).filter(Boolean).sort();
    const dia = iso => SRP.envio.diaLocal(iso), hora = iso => SRP.envio.hora(iso);
    const unDia = horas.length && dia(horas[0]) === dia(horas[horas.length - 1]);
    const lapso = min => min < 60 ? min + ' min' : Math.floor(min / 60) + ' h' + (min % 60 ? ' ' + (min % 60) + ' min' : '');
    const partes = [];
    const min = unDia ? Math.round((new Date(horas[horas.length - 1]) - new Date(horas[0])) / 60000) : 0;
    const prom = horas.length > 1 ? Math.round(min / (horas.length - 1)) : 0;
    const mismoMinuto = horas.length > 1 && hora(horas[0]) === hora(horas[horas.length - 1]);
    if (horas.length === 1) partes.push('un árbol, a las ' + hora(horas[0]));
    else if (unDia && mismoMinuto) partes.push(horas.length + ' árboles, a las ' + hora(horas[0]));
    else if (unDia) partes.push(hora(horas[0]) + ' a ' + hora(horas[horas.length - 1]) + ' (' + lapso(Math.max(min, 1)) + ')');
    if (g.estatus === 'cerrada' && g.fecha_cierre) partes.push(this.textoCierre(g, true));
    if (unDia && !mismoMinuto && prom >= 1) partes.push(lapso(prom) + ' entre árbol y árbol en promedio');
    p.hidden = !partes.length;
    p.textContent = partes.length ? 'Horario: ' + partes.join(' · ') : '';
  },

  /* Mapa de la jornada: Leaflet con los puntos numerados. Se crea una vez y se reutiliza. Sin
     señal no hay imagen de fondo, pero los puntos, su orden y la lista funcionan igual. */
  pintarMapa(avisos, revisados, encuadrar) {
    if (typeof L === 'undefined') return;
    const c = SRP.CONFIG.MAPA;
    if (!this.mapa) {
      /* Los árboles de una jornada están a pocos metros y al zoom máximo del proveedor (19) los
         pines se enciman. El mapa deja acercar hasta ZOOM_JORNADA escalando la imagen (D116). */
      this.mapa = L.map('jornada-mapa', { center: c.CENTRO, zoom: c.ZOOM_INICIAL, minZoom: c.ZOOM_MIN, maxZoom: c.ZOOM_JORNADA,
        maxBounds: c.LIMITES, maxBoundsViscosity: 1, gestureHandling: true });
      SRP.mapa.ponerCredito(this.mapa);   // el mismo crédito en todos los mapas (D152)
      SRP.mapa.ponerBase(this.mapa, { capa: { maxZoom: c.ZOOM_JORNADA, maxNativeZoom: c.ZOOM_MAX } });
      this.capaPuntos = L.layerGroup().addTo(this.mapa);
      // Los polígonos de la colonia de la jornada y de las colonias donde cayeron sus árboles, cada uno con el color de su prioridad; un botón sobre el mapa los apaga
      SRP.prioritarias.control(() => this.mapa, { grupo: 'campo', simple: true, leyenda: this.el('jornada-simbologia'),
        intervenidas: () => { const j = this.jornada || {}; return SRP.prioritarias.coloniaDeJornada(j.registros, j.dato); } });
    }
    SRP.prioritarias.refrescar();
    this.capaPuntos.clearLayers();
    this.marcadores = {};
    const regs = this.jornada.registros;
    const tonos = new Set();
    regs.forEach((r, i) => {
      const av = avisos[r.id] || [];
      const tono = this.tonoPunto(r, av, revisados.includes(r.id));
      tonos.add(tono);
      const icono = L.divIcon({ className: 'pin-num', html: '<span data-tono="' + tono + '">' + (i + 1) + '</span>', iconSize: [26, 26], iconAnchor: [13, 13] });
      const m = L.marker([r.lat, r.lng], { icon: icono, title: 'Punto ' + (i + 1) + ': ' + SRP.ref.especieDe(r).comun, riseOnHover: true })
        .on('click', () => this.seleccionar(r.id, 'mapa'));
      m.addTo(this.capaPuntos);
      this.marcadores[r.id] = m;
    });
    // La simbología dice sólo los tipos de punto que hay en esta jornada
    const leyenda = this.el('jornada-leyenda');
    leyenda.hidden = !regs.length;
    leyenda.querySelectorAll('i[data-tono]').forEach(i => { i.parentElement.hidden = !tonos.has(i.dataset.tono); });
    setTimeout(() => {
      this.mapa.invalidateSize();
      if (encuadrar && regs.length) {
        if (regs.length === 1) this.mapa.setView([regs[0].lat, regs[0].lng], c.ZOOM_PUNTO);
        // Más margen arriba a la izquierda: ahí van los botones de acercar y tapaban el punto de la orilla (D145)
        else this.mapa.fitBounds(L.latLngBounds(regs.map(r => [r.lat, r.lng])), { paddingTopLeft: [56, 44], paddingBottomRight: [32, 32], maxZoom: c.ZOOM_JORNADA - 1 });
      }
    }, 60);
  },

  // Un punto elegido se marca en el mapa y en la lista, venga de donde venga el toque
  seleccionar(id, desde) {
    this.el('jornada-lista').querySelectorAll('.punto-jornada').forEach(li => li.classList.toggle('elegido', li.dataset.id === id));
    Object.entries(this.marcadores).forEach(([k, m]) => { const e = m.getElement(); if (e) e.classList.toggle('elegido', k === id); });
    const li = this.el('jornada-lista').querySelector('[data-id="' + CSS.escape(id) + '"]');
    // Del mapa a la lista (D172): el árbol queda al centro de lo que se ve libre, entre la barra de saltos
    // de arriba y la barra fija de «Siguiente» (y la navegación) de abajo. Con 'nearest' quedaba en la
    // orilla de abajo, tapado por esa barra
    if (desde === 'mapa' && li) this.centrarEnLista(li);
    if (desde === 'lista' && this.marcadores[id]) this.mapa.panTo(this.marcadores[id].getLatLng());
  },

  centrarEnLista(li) {
    const vis = x => x.offsetParent !== null;
    const detalle = this.el('jornada-detalle');
    const arriba = Math.max(0, ...[...detalle.querySelectorAll('.saltos')].filter(vis).map(x => x.getBoundingClientRect().bottom));
    const nav = document.querySelector('.pestanas');
    const abajo = Math.min(innerHeight, ...[...detalle.querySelectorAll('.barra-guardar')].filter(vis).map(x => x.getBoundingClientRect().top),
      ...(nav && vis(nav) && getComputedStyle(nav).position === 'fixed' ? [nav.getBoundingClientRect().top] : []));
    const r = li.getBoundingClientRect();
    window.scrollBy({ top: (r.top + r.height / 2) - (arriba + abajo) / 2, behavior: 'smooth' });
  },

  async alTocarLista(e) {
    const b = e.target.closest('button[data-accion]');
    const li = e.target.closest('.punto-jornada');
    if (!li) return;
    const r = this.jornada.registros.find(x => x.id === li.dataset.id);
    if (!b) { this.seleccionar(li.dataset.id, 'lista'); return; }
    if (b.dataset.accion === 'ver') { this.volverAlDetalle = true; SRP.registros.verDetalle(r); }
    if (b.dataset.accion === 'editar') { this.volverAlDetalle = true; SRP.formulario.editar(r); }
    if (b.dataset.accion === 'bien') await this.marcarRevisado(r);
    if (b.dataset.accion === 'eliminar') { this.volverAlDetalle = true; await SRP.registros.eliminar(r); }
    if (b.dataset.accion === 'mover') await this.abrirMover(r);
    if (b.dataset.accion === 'sustituir') { this.volverAlDetalle = true; await SRP.registros.sustituir(r); }
  },

  /* Mover un registro a otra jornada del mismo cabo: el árbol toma el programa de la jornada destino
     y el cambio queda en su historial. La fecha: si el árbol era del día de inicio de su jornada,
     toma la de la jornada destino; si era de otro día, conserva la suya (nunca antes de que la
     jornada destino empiece). */
  async abrirMover(r) {
    const jornadas = (await SRP.almacen.porIndice('jornadas', 'cabo_id', r.cabo_id))
      .filter(j => j.id !== r.jornada_id)
      .sort((a, b) => b.fecha.localeCompare(a.fecha) || String(b.fecha_inicio).localeCompare(String(a.fecha_inicio)));
    this.moviendo = r;
    this.destinos = jornadas;
    this.el('dlg-mover-texto').textContent = 'Elija la jornada a la que pertenece el ' + SRP.ref.especieDe(r).comun + ' (punto ' + (this.jornada.registros.indexOf(r) + 1) + ').';
    this.el('mover-buscar').value = ''; this.el('mover-fecha').value = '';
    // Con pocas jornadas se ven todas de un vistazo: buscar no hace falta
    this.el('mover-filtros').hidden = jornadas.length <= 5;
    this.pintarMover();
    this.el('dlg-mover-jornada').showModal();
  },

  // Las jornadas destino que pasan el nombre escrito (sin acentos ni mayúsculas) y el día elegido
  pintarMover() {
    const esc = SRP.util.escapar, n = SRP.util.normalizar, todas = this.destinos || [];
    const q = n(this.el('mover-buscar').value), dia = this.el('mover-fecha').value;
    const lista = todas.filter(j => (!q || n(j.nombre).includes(q)) && (!dia || j.fecha === dia));
    this.el('mover-cuenta').textContent = !todas.length || (!q && !dia) ? '' : lista.length + ' de ' + todas.length + (todas.length === 1 ? ' jornada' : ' jornadas');
    this.el('lista-mover-jornadas').innerHTML = lista.length ? lista.map(j =>
      '<li><button type="button" class="jornada-boton" data-id="' + esc(j.id) + '"><span class="jornada-datos"><span class="jornada-dia">' + esc(j.nombre) + '</span>' +
      '<span class="jornada-cifras">' + esc(SRP.util.formatearFecha(j.fecha)) + ' · ' + (j.estatus === 'abierta' ? 'abierta' : 'cerrada') + '</span></span></button></li>').join('')
      : '<li class="nota">' + (todas.length ? 'Ninguna jornada con ese nombre' + (dia ? ' en esa fecha' : '') + '. Cambie la búsqueda o quite la fecha.' : 'No hay otra jornada de este cabo. Inicie una en Nuevo registro.') + '</li>';
  },

  /* Todo en una transacción (D151): el árbol con la fecha y el programa de su jornada nueva, y la
     jornada de origen sin su marca de «revisado», que era de ese punto en ese sitio. */
  async mover(r, destino) {
    if (!SRP.permisos.exigir('registro.mover', r)) return;
    if (destino.cabo_id !== r.cabo_id) { SRP.util.anunciar('Sólo se mueve a otra jornada del mismo cabo.', 'aviso'); return; }
    const u = SRP.sesion.usuario;
    const ahora = SRP.util.ahoraISO();
    const actual = (await SRP.almacen.uno('plantaciones', r.id)) || r;
    const origen = actual.jornada_id ? await SRP.almacen.uno('jornadas', actual.jornada_id) : null;
    const cambiaPrograma = actual.programa_id !== destino.programa_id;
    const sigue = !origen || actual.fecha_plantacion === origen.fecha;   // era del día de inicio: sigue la fecha de la jornada
    const fecha = sigue ? destino.fecha : SRP.util.fechaEnJornada(actual.fecha_plantacion, destino);
    const tomaFecha = sigue || fecha !== actual.fecha_plantacion;
    const nuevo = Object.assign({}, actual, { jornada_id: destino.id, fecha_plantacion: fecha, programa_id: destino.programa_id, fecha_ultima_edicion: ahora, editado_por_id: u.id });
    const que = [tomaFecha ? 'su fecha' : '', cambiaPrograma ? 'su programa' : ''].filter(Boolean).join(' y ');
    const cambios = [{ almacen: 'plantaciones', objeto: nuevo, bitacora: SRP.bitacora.entrada('EDITADO', 'plantacion', r.id,
      'Movido a la jornada «' + destino.nombre + '»' + (que ? '; toma ' + que : '; conserva su fecha, ' + SRP.util.formatearFecha(fecha))) }];
    // Las dos jornadas cambian de contenido: el reporte de cada una deja de estar vigente
    const revisado = origen && (origen.puntos_revisados || []).includes(r.id);
    if (origen && (revisado || origen.reporte_en)) {
      cambios.push({ almacen: 'jornadas', objeto: Object.assign({}, origen, { puntos_revisados: (origen.puntos_revisados || []).filter(x => x !== r.id), reporte_en: null, editado_por_id: u.id, fecha_ultima_edicion: ahora }),
        bitacora: SRP.bitacora.entrada('EDITADO', 'jornada', origen.id, [revisado ? 'Sale un punto revisado: se movió a «' + destino.nombre + '»' : 'Sale un árbol: se movió a «' + destino.nombre + '»',
          origen.reporte_en ? 'su reporte deja de estar vigente' : ''].filter(Boolean).join('; ')) });
    }
    if (!origen || destino.id !== origen.id) (await SRP.reportes.caducar([destino.id], 'recibió un árbol de otra jornada')).forEach(c => cambios.push(c));
    await SRP.almacen.guardarJuntos(cambios);
    if (SRP.envio.simulado()) { SRP.envio.marcarCambios(r.id); SRP.envio.enviar({ silencioso: true }); }
    SRP.util.anunciar('Movido a la jornada «' + destino.nombre + '»: ' + (tomaFecha ? 'toma su fecha' : 'conserva su fecha, ' + SRP.util.formatearFecha(fecha)) +
      (cambiaPrograma ? (tomaFecha ? ' y su programa, ' : ', y toma su programa, ') + SRP.ref.nombreCatalogo(destino.programa_id) : '') + '.');
    await this.refrescar();
  },

  async guardarEnJornada(cambios, detalle) {
    const j = this.jornada;
    const u = SRP.sesion.usuario;
    const previo = await this.jornadaGuardada(j);
    if (!SRP.permisos.exigir('jornada.editar', previo)) return null;
    const ahora = SRP.util.ahoraISO();
    const dato = Object.assign({}, previo, cambios, { editado_por_id: u.id, fecha_ultima_edicion: ahora });
    await SRP.almacen.guardarConBitacora('jornadas', dato, SRP.bitacora.entrada('EDITADO', 'jornada', dato.id, detalle));
    j.dato = dato;
    return dato;
  },

  /* ---------- Editar y eliminar la jornada (D132) ---------- */

  /* La jornada se edita desde su ficha o desde la franja de «Nuevo registro». `desdeRegistro` deja a
     quien registra donde estaba: al guardar se repinta la franja, sin salir del formulario. */
  enEdicion: null, editaDesdeRegistro: false,
  abrirEditar(jornada, desdeRegistro) {
    const c = jornada; if (!c) return;
    this.enEdicion = c; this.editaDesdeRegistro = !!desdeRegistro;
    const sel = this.el('ej-programa');
    // Los programas de la institución que ejecuta la jornada, más el que ya tiene
    const opciones = SRP.ref.programasPara(c.organizacion_id, c.programa_id);
    sel.innerHTML = SRP.util.opciones('Seleccione un programa', opciones.map(o => [o.id, o.nombre]));
    sel.value = c.programa_id || '';
    this.el('ej-nombre').value = c.nombre || '';
    this.el('ej-ubicacion').value = c.ubicacion || '';
    this.el('ej-meta').value = this.previstosDe(c) === null ? '' : this.previstosDe(c);
    this.el('ej-fecha').value = c.fecha; this.el('ej-fecha').max = SRP.util.fechaHoy();
    this.el('ej-comentarios').value = c.comentarios || '';
    SRP.solicitud.poner('ej', c);
    this.el('ej-nota-fecha').hidden = true;
    this.el('ej-nota-programa').hidden = true;
    this.el('ej-errores').hidden = true;
    SRP.util.erroresEnCampos([], ['ej-nombre', 'ej-programa', 'ej-meta', 'ej-fecha'].concat(SRP.solicitud.ids('ej')));
    SRP.util.refrescarContadores(this.el('dlg-editar-jornada'));
    this.el('dlg-editar-jornada').showModal();
  },

  async guardarEdicion() {
    const c = this.enEdicion; if (!c) return;
    if (!SRP.permisos.exigir('jornada.editar', c)) return;
    const nombre = this.el('ej-nombre').value.trim();
    const ubicacion = this.el('ej-ubicacion').value.trim();
    const programa_id = this.el('ej-programa').value;
    const metaTexto = this.el('ej-meta').value.trim();
    const previstos = metaTexto === '' ? null : Number(metaTexto);
    const fecha = this.el('ej-fecha').value;
    const comentarios = this.el('ej-comentarios').value.trim();
    const errores = [];
    if (!nombre) errores.push(['ej-nombre', 'Escriba el nombre de la jornada.']);
    if (!programa_id) errores.push(['ej-programa', 'Elija el programa.']);
    SRP.solicitud.errores('ej').forEach(e => errores.push(e));
    if (previstos === null || !Number.isInteger(previstos) || previstos < 1 || previstos > 9999) errores.push(['ej-meta', 'Escriba cuántos árboles se van a plantar: un entero mayor que cero.']);
    if (!fecha) errores.push(['ej-fecha', 'Indique la fecha.']);
    else if (fecha > SRP.util.fechaHoy()) errores.push(['ej-fecha', 'La fecha no puede ser posterior a hoy.']);
    // Cada campo dice su error (D140) y arriba el resumen, igual que en todos los formularios (M15)
    if (SRP.util.resumenErrores(this.el('ej-errores'), errores, ['ej-nombre', 'ej-programa', 'ej-meta', 'ej-fecha'].concat(SRP.solicitud.ids('ej')))) return;
    const cambios = Object.assign({ nombre, ubicacion, programa_id, arboles_previstos: previstos, fecha, comentarios }, SRP.solicitud.leer('ej'));
    const v = x => (x === undefined || x === null) ? '' : x;
    const campos = Object.keys(cambios).filter(k => v(c[k]) !== v(cambios[k]) && !(k === 'arboles_previstos' && this.previstosDe(c) === previstos));
    if (!campos.length) { this.el('dlg-editar-jornada').close(); return; }
    const u = SRP.sesion.usuario;
    const ahora = SRP.util.ahoraISO();
    const dato = Object.assign({}, c, cambios, { editado_por_id: u.id, fecha_ultima_edicion: ahora });
    const escrituras = [{ almacen: 'jornadas', objeto: dato, bitacora: SRP.bitacora.entrada('EDITADO', 'jornada', c.id, 'Campos: ' + campos.join(', ')) }];
    /* Los árboles toman el programa de su jornada y, los plantados el día de inicio, también su fecha
       nueva; los de otros días conservan la suya. Todos, también los eliminados —si se restauran,
       vuelven con los datos de su jornada—, y en la misma transacción que la jornada: o cambian todos
       o ninguno. La jornada no puede empezar después de un árbol plantado otro día. */
    const cambiaFecha = campos.includes('fecha'), cambiaPrograma = campos.includes('programa_id');
    const arboles = cambiaFecha || cambiaPrograma ? await SRP.almacen.porIndice('plantaciones', 'jornada_id', c.id) : [];
    const antes = arboles.filter(r => r.fecha_plantacion !== c.fecha && r.fecha_plantacion < fecha).map(r => r.fecha_plantacion).sort();
    if (cambiaFecha && antes.length) {
      SRP.util.resumenErrores(this.el('ej-errores'), [['ej-fecha', 'Hay árboles de esta jornada plantados el ' + SRP.util.formatearFecha(antes[0]) + ': la jornada no puede empezar después de ese día.']], ['ej-nombre', 'ej-programa', 'ej-meta', 'ej-fecha'].concat(SRP.solicitud.ids('ej')));
      return;
    }
    const tocados = [];
    for (const r of arboles) {
      const nuevaFecha = cambiaFecha && r.fecha_plantacion === c.fecha;
      const detalle = [nuevaFecha ? 'fecha ' + SRP.util.formatearFecha(fecha) : '', cambiaPrograma ? 'programa ' + SRP.ref.nombreCatalogo(programa_id) : ''].filter(Boolean).join(' y ');
      if (!detalle) continue;
      tocados.push(r);
      escrituras.push({ almacen: 'plantaciones', objeto: Object.assign({}, r, { fecha_plantacion: nuevaFecha ? fecha : r.fecha_plantacion, programa_id, editado_por_id: u.id, fecha_ultima_edicion: ahora }),
        bitacora: SRP.bitacora.entrada('EDITADO', 'plantacion', r.id, 'Por cambio de la jornada: ' + detalle) });
    }
    await SRP.almacen.guardarJuntos(escrituras);
    if (SRP.envio.simulado()) tocados.forEach(r => SRP.envio.marcarCambios(r.id));
    if (SRP.activa.jornada && SRP.activa.jornada.id === c.id) SRP.activa.jornada = dato;
    if (SRP.envio.simulado()) SRP.envio.enviar({ silencioso: true });
    this.el('dlg-editar-jornada').close();
    this.enEdicion = null;
    if (this.editaDesdeRegistro && SRP.app.vista === 'registrar') await SRP.activa.preparar();
    else { this.volverAlDetalle = true; this.actual = c.id; await this.preparar(); }
    SRP.util.anunciar('Jornada actualizada: ' + campos.map(k => ({ nombre: 'nombre', ubicacion: 'dirección', programa_id: 'programa', arboles_previstos: 'árboles previstos', fecha: 'fecha', comentarios: 'comentarios', solicitante_id: 'quién lo solicita', solicitante_otro: 'quién lo solicita', solicitud_descripcion: 'descripción de la solicitud' })[k]).filter((t, i, a) => a.indexOf(t) === i).join(', ') + '.', 'exito');
  },

  /* Sólo una jornada sin árboles se elimina; con árboles, primero se mueven o se eliminan ellos. Los
     eliminados también cuentan (D151): se conservan como constancia y siguen apuntando a su jornada.
     Antes se borraba, y al deshacer la eliminación de un árbol éste quedaba visible en Registros y
     en ninguna jornada ni reporte. */
  async eliminarJornada() {
    const c = this.guardada; if (!c) return;
    if (!SRP.permisos.exigir('jornada.eliminar', c)) return;
    const usos = (await SRP.ref.usosDe('jornadas'))[c.id];
    const activos = this.jornada.registros.length;
    if (SRP.ref.totalUsos(usos)) {
      const n = SRP.ref.totalUsos(usos) - activos;
      SRP.util.anunciar(activos ? 'No se puede eliminar: tiene árboles registrados. Muévalos o elimínelos primero.'
        : 'No se puede eliminar: guarda ' + (n === 1 ? '1 árbol eliminado, que se conserva' : n + ' árboles eliminados, que se conservan') + ' como constancia. Si ya no se usará, ciérrela.', 'aviso');
      return;
    }
    const ok = await SRP.app.confirmar({ titulo: 'Eliminar jornada', pregunta: '¿Eliminar la jornada «' + c.nombre + '» del ' + SRP.util.formatearFecha(c.fecha) + '?',
      puntos: ['No tiene árboles registrados.', 'La bitácora conserva la constancia.'], irreversible: true, boton: 'Eliminar jornada', icono: 'basura' });
    if (!ok) return;
    await SRP.almacen.borrarConBitacora('jornadas', c.id, SRP.bitacora.entrada('ELIMINADO', 'jornada', c.id, 'Jornada «' + c.nombre + '» eliminada (sin árboles)'));
    if (SRP.activa.jornada && SRP.activa.jornada.id === c.id) SRP.activa.jornada = null;
    await this.cerrar();
    SRP.util.anunciar('Jornada «' + c.nombre + '» eliminada.', 'exito');
  },

  /* El conteo de la cuadrilla (D112) dejó de capturarse aquí: la meta se escribe al iniciar la
     jornada (D131) y esta pantalla sólo la compara con lo registrado. */

  async marcarRevisado(r) {
    if (!SRP.permisos.exigir('jornada.editar', this.guardada)) return;
    const prev = (this.guardada && this.guardada.puntos_revisados) || [];
    const num = this.jornada.registros.indexOf(r) + 1;
    await this.guardarEnJornada({ puntos_revisados: prev.concat(r.id) }, 'Punto ' + num + ' revisado: está bien');
    await this.pintarDetalle(false);
    // El botón tocado desaparece al repintar: el foco pasa a lo que sigue (D138), y si ya no quedan
    // puntos por revisar el aviso lo dice
    const p = this.pasosActuales;
    const cola = p && p.actual !== 'revisar' ? ' ' + this.siguiente(p, this.guardada.cabo_id === SRP.sesion.usuario.id).texto : '';
    SRP.util.anunciar('Punto ' + num + ' marcado como revisado.' + cola, 'exito', { deshacer: async () => {
      await this.guardarEnJornada({ puntos_revisados: prev }, 'Se deshizo la revisión del punto ' + num);
      await this.refrescar();
    } });
    this.enfocarSiguiente();
  },

  /* TODOS LOS PUNTOS DE UNA VEZ. Cuando quien revisa ya vio en el mapa que los avisos no son
     errores —una alineación de la misma especie, un segundo grupo de árboles—, los aprueba juntos.
     Pregunta antes, dice cuántos de cada aviso, queda en la bitácora con sus números y se deshace. */
  async marcarTodosRevisados() {
    if (!SRP.permisos.exigir('jornada.editar', this.guardada)) return;
    const avisos = this.avisosActuales || {};
    const pend = this.pendientes(this.jornada, avisos, this.guardada);
    if (!pend.length) return;
    const cuenta = t => pend.filter(r => avisos[r.id].some(a => a.tipo === t)).length;
    const frase = (n, uno, varios) => n ? n + ' ' + (n === 1 ? uno : varios) : '';
    const ok = await SRP.app.confirmar({ titulo: 'Marcar puntos como revisados', pregunta: '¿Marcar los ' + pend.length + ' puntos con aviso como revisados?',
      puntos: [frase(cuenta('duplicado'), 'posible duplicado', 'posibles duplicados'), frase(cuenta('lejos'), 'lejos del resto', 'lejos del resto'),
        frase(cuenta('precision'), 'con precisión baja', 'con precisión baja'), 'Hágalo después de revisarlos en el mapa. Se puede deshacer.'].filter(Boolean),
      boton: 'Marcar como revisados', icono: 'palomita' });
    if (!ok) return;
    const prev = (this.guardada && this.guardada.puntos_revisados) || [];
    const nums = pend.map(r => this.jornada.registros.indexOf(r) + 1);
    await this.guardarEnJornada({ puntos_revisados: prev.concat(pend.map(r => r.id).filter(id => !prev.includes(id))) },
      pend.length + ' puntos revisados de una vez: están bien (' + nums.join(', ') + ')');
    await this.pintarDetalle(false);
    const p = this.pasosActuales;
    const cola = p && p.actual !== 'revisar' ? ' ' + this.siguiente(p, this.guardada.cabo_id === SRP.sesion.usuario.id).texto : '';
    SRP.util.anunciar(pend.length + ' puntos marcados como revisados.' + cola, 'exito', { deshacer: async () => {
      await this.guardarEnJornada({ puntos_revisados: prev }, 'Se deshizo la revisión de ' + pend.length + ' puntos');
      await this.refrescar();
    } });
    this.enfocarSiguiente();
  },

  // Después de eliminar, restaurar o editar desde esta vista
  async refrescar() {
    if (SRP.app.vista !== 'jornadas') return;
    if (!this.actual) { await this.pintarLista(); return; }
    await this.pintarLista(true);
    const j = this.lista.find(x => x.clave === this.actual);
    if (!j) { await this.cerrar(); return; }
    this.jornada = j;
    await this.pintarDetalle(false);
  },

  /* ---------- Salidas ---------- */

  async registrarFaltante() {
    const j = await this.jornadaGuardada(this.jornada); if (!j) return;
    if (SRP.activa.capturista(j) !== SRP.sesion.usuario.id) { SRP.util.anunciar('En esta jornada registra ' + SRP.ref.nombreUsuario(SRP.activa.capturista(j)) + '.', 'aviso'); return; }
    this.volverAlDetalle = false;
    if (j.estatus !== 'abierta') { if (!await SRP.activa.reabrir(j)) return; } else SRP.activa.jornada = j;
    SRP.formulario.limpiar();
    SRP.app.mostrarVista('registrar');
    SRP.util.anunciar('Registre el árbol que falta en la jornada «' + j.nombre + '».', 'aviso');
  },

  /* ---------- Relevo de cabo ---------- */

  /* Los cabos que pueden recibir la jornada: los activos de la cuadrilla de quien coordina y de la
     institución de la jornada, menos el que ya registra en ella. Si hay relevo, el titular se ofrece
     primero, para devolvérsela. */
  candidatosRelevo(c) {
    const u = SRP.sesion.usuario, actual = SRP.activa.capturista(c);
    const org = c.organizacion_id || SRP.CONFIG.ORGANIZACION_SEDEMA;
    const cabos = SRP.ref.usuarios.filter(x => x.activo && x.perfil === 'CABO' && (x.coordinadores_ids || []).includes(u.id) && x.id !== actual && x.id !== c.cabo_id &&
      (x.organizacion_id || SRP.CONFIG.ORGANIZACION_SEDEMA) === org)
      .sort((a, b) => SRP.util.nombreCompleto(a).localeCompare(SRP.util.nombreCompleto(b), 'es'));
    const titular = actual !== c.cabo_id && SRP.ref.usuarioPorId[c.cabo_id] ? [[c.cabo_id, SRP.ref.nombreUsuario(c.cabo_id) + ' (titular: se la devuelve)']] : [];
    return titular.concat(cabos.map(x => [x.id, SRP.util.nombreCompleto(x)]));
  },

  abrirRelevo() {
    const c = this.guardada; if (!c || !SRP.permisos.exigir('jornada.relevo', c)) return;
    const actual = SRP.activa.capturista(c);
    const opciones = this.candidatosRelevo(c);
    this.el('dlg-relevo-texto').textContent = 'Hoy registra en «' + c.nombre + '» ' + SRP.ref.nombreUsuario(actual) +
      (actual === c.cabo_id ? ', su titular.' : ', en relevo de ' + SRP.ref.nombreUsuario(c.cabo_id) + '.') + ' Elija quién sigue registrando en ella.';
    this.el('relevo-quien').innerHTML = SRP.util.opciones(opciones.length ? 'Seleccione un cabo' : 'No hay otro cabo en su cuadrilla', opciones);
    this.el('relevo-quien').disabled = !opciones.length;
    this.el('btn-relevo-hacer').disabled = !opciones.length;
    this.el('relevo-error').hidden = true;
    this.el('dlg-relevo').showModal();
  },

  /* Pasa la jornada al cabo elegido: queda en `relevo_id` (nulo si vuelve al titular) y en la lista de
     relevos, con quién y cuándo, y en el historial. La jornada y sus árboles no cambian de dueño. */
  async relevar(caboId) {
    const c = await this.jornadaGuardada(this.jornada); if (!c) return;
    if (!SRP.permisos.exigir('jornada.relevo', c)) return;
    const antes = SRP.activa.capturista(c);
    if (!caboId || caboId === antes || !this.candidatosRelevo(c).some(([id]) => id === caboId)) {
      const e = this.el('relevo-error'); e.textContent = 'Elija el cabo que sigue registrando.'; e.hidden = false; return;
    }
    const u = SRP.sesion.usuario, ahora = SRP.util.ahoraISO();
    const vuelve = caboId === c.cabo_id;
    const dato = Object.assign({}, c, { relevo_id: vuelve ? null : caboId, relevos: (c.relevos || []).concat([{ cabo_id: caboId, fecha: ahora, por_id: u.id }]),
      editado_por_id: u.id, fecha_ultima_edicion: ahora });
    await SRP.almacen.guardarConBitacora('jornadas', dato, SRP.bitacora.entrada('RELEVO', 'jornada', c.id,
      'Registra ' + SRP.ref.nombreUsuario(caboId) + ' en lugar de ' + SRP.ref.nombreUsuario(antes) + (vuelve ? ': vuelve el titular' : '; titular: ' + SRP.ref.nombreUsuario(c.cabo_id))));
    if (SRP.activa.jornada && SRP.activa.jornada.id === c.id) SRP.activa.jornada = SRP.activa.capturista(dato) === u.id ? dato : null;
    if (SRP.envio.simulado()) SRP.envio.enviar({ silencioso: true });
    this.el('dlg-relevo').close();
    this.volverAlDetalle = true; this.actual = c.id;
    await this.refrescar();
    SRP.util.anunciar(vuelve ? 'La jornada «' + c.nombre + '» vuelve a ' + SRP.ref.nombreUsuario(caboId) + ', su titular.'
      : 'Relevo hecho: ' + SRP.ref.nombreUsuario(caboId) + ' registra ahora en «' + c.nombre + '». La jornada sigue a nombre de ' + SRP.ref.nombreUsuario(c.cabo_id) + '.', 'exito');
  },

  // El reporte se genera desde la ficha de su jornada: datos del cierre, vista previa y PDF, sin salir de Jornadas
  irAlReporte() {
    const j = this.jornada;
    if (!j || j.estatus !== 'cerrada') return;
    if (SRP.permisos.puede('jornada.editar', j.dato || j)) SRP.reportes.abrir(j.registros, j.fecha, j.cabo_id, j);
    else SRP.reportes.descargar(j.registros, j.fecha, j.cabo_id, j);
  }
};

// Acciones que escriben en el teléfono: si fallan, se dice qué no se pudo hacer (D149)
SRP.util.proteger(SRP.jornadas, { mover: 'mover el árbol de jornada', guardarEnJornada: 'guardar la jornada', guardarEdicion: 'guardar los cambios de la jornada',
  eliminarJornada: 'eliminar la jornada', relevar: 'hacer el relevo', marcarRevisado: 'marcar el punto como revisado', marcarTodosRevisados: 'marcar los puntos como revisados' });
