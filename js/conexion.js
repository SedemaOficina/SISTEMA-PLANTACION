/* CONEXIÓN Y TRABAJO SIN SEÑAL (D71). El respaldo del teléfono se retiró (D175): proteger lo
   capturado es tarea del servidor y de su cola de envío en la Fase 2.

   QUÉ SE LE DICE A QUIEN REGISTRA, Y POR QUÉ. La aplicación funciona sin señal: el GPS, la
   captura, el guardado y el reporte en PDF viven en el teléfono. Lo que no se decía en pantalla es
   qué pasa con esos registros: en la Etapa 1 no hay servidor, así que no hay nada que enviar
   cuando vuelve la señal, y borrar los datos del navegador los pierde. Este módulo pone las tres
   cosas a la vista: el estado de la conexión, cuántos registros guarda este dispositivo y qué
   hacer con ellos. Cuando exista el servidor (Fase 2), el mismo aviso dirá «N pendientes de
   enviar» y aquí vivirá el botón de sincronizar.

   LA CUENTA VA EN LA PASTILLA (D83). El bloque «Registros en este dispositivo» vive en Reportes,
   a donde el cabo no va en campo; la pastilla del encabezado se ve en todas las pantallas, así
   que lleva la cuenta («Con conexión · 4 guardados») y al tocarla abre la guía. Es lo que hace
   la cola de envío de KoboToolbox, sin su barra lateral. La franja «Guardado» del formulario dice
   además si el árbol ya salió o cuántos esperan, sin pedir otro clic. */
window.SRP = window.SRP || {};

SRP.conexion = {
  el(id) { return document.getElementById(id); },

  iniciar() {
    this.registrarWorker();
    // Al volver la señal se envía la cola (D111); con ella, el servidor simulado emite los folios (D110)
    window.addEventListener('online', async () => {
      await this.refrescar();
      await SRP.envio.pintarFranja();
      SRP.envio.enviar();
    });
    window.addEventListener('offline', async () => { await this.refrescar(); await SRP.envio.pintarFranja(); });
    this.el('conexion').addEventListener('click', async () => { await this.pintarEstado(); this.el('dlg-senal').showModal(); });
    // La fecha del último respaldo quedó sin uso al retirarse el respaldo (D175)
    try { localStorage.removeItem('srp_ultimo_respaldo'); } catch (e) { /* sin persistencia */ }
    this.refrescar();
  },

  /* El worker se registra con la misma marca de versión de index.html: una versión nueva es un
     worker nuevo. Con file:// (doble clic) no hay worker y no pasa nada: la app abre igual. */
  worker: 'no aplica',
  registrarWorker() {
    if (!('serviceWorker' in navigator) || location.protocol === 'file:') return;
    this.worker = 'registrando';
    const habia = !!navigator.serviceWorker.controller;
    navigator.serviceWorker.register('sw.js?v=' + encodeURIComponent(SRP.CONFIG.VERSION))
      .then(() => { this.worker = 'registrado'; this.buscarVersionNueva(); }, () => { this.worker = 'error'; });
    // Otro worker tomó el control: la versión nueva ya está completa en el teléfono
    navigator.serviceWorker.addEventListener('controllerchange', () => { if (habia && this.versionNueva) this.aplicarVersionNueva(); });
    // Al volver a la app o recuperar la señal se vuelve a mirar si hay versión nueva
    window.addEventListener('online', () => this.buscarVersionNueva());
    document.addEventListener('visibilitychange', () => { if (!document.hidden) this.buscarVersionNueva(); });
  },

  /* VERSIÓN NUEVA SIN QUEDARSE A MEDIAS. Mientras el teléfono trabaja con su versión guardada, se
     pregunta a la red qué versión está publicada. Si es otra, se pide instalar su worker: éste baja
     todos los archivos y sólo entonces toma el control. Si la descarga se corta, no cambia nada y se
     reintenta la próxima vez. */
  versionNueva: null,
  async buscarVersionNueva() {
    if (this._buscando || this.versionNueva || navigator.onLine === false) return;
    this._buscando = true;
    try {
      const r = await fetch('index.html?comprobar=' + Date.now(), { cache: 'no-store' });
      if (!r.ok) return;
      const m = (await r.text()).match(/js\/config\.js\?v=([^"&]+)/);
      const publicada = m ? decodeURIComponent(m[1]) : null;
      if (!publicada || publicada === SRP.CONFIG.VERSION) return;
      this.versionNueva = publicada;
      try { await navigator.serviceWorker.register('sw.js?v=' + encodeURIComponent(publicada)); }
      catch (e) { this.versionNueva = null; }   // no se pudo instalar: se reintenta después
    } catch (e) { /* sin señal: se reintenta después */ }
    finally { this._buscando = false; }
  },

  /* La versión nueva se aplica recargando, cuando no interrumpe nada. */
  aplicarVersionNueva() {
    if (this._aplicando) return;
    this._aplicando = true;
    const recargar = () => {
      const f = SRP.formulario;
      // Con una ventana abierta, un árbol a medias o una edición en curso se espera a que termine
      if (document.querySelector('dialog[open]') || (f && (f.aMedias() || f.estado.editando || f.estado.sustitucion))) { setTimeout(recargar, 1500); return; }
      location.reload();
    };
    recargar();
  },

  esIphoneEnNavegador() {
    const ios = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    const instalada = navigator.standalone === true || (window.matchMedia && matchMedia('(display-mode: standalone)').matches);
    return ios && !instalada;
  },

  // Una vez por sesión, al guardar el primer árbol en un iPhone desde Safari (D149)
  sugerirInstalar() {
    if (this._sugerido || !this.esIphoneEnNavegador()) return;
    this._sugerido = true;
    setTimeout(() => SRP.util.anunciar('En iPhone, agregue el SRP a la pantalla de inicio (Compartir › Agregar a inicio) para que Safari no borre lo capturado.', 'aviso'), 600);
  },

  /* La guía sólo advierte lo que pone en riesgo lo capturado: en un iPhone, abrir el SRP desde
     Safari sin agregarlo a la pantalla de inicio (Safari borra lo guardado a los 7 días sin uso). */
  async pintarEstado() {
    const caja = this.el('senal-estado'); if (!caja) return;
    const iphone = this.esIphoneEnNavegador();
    caja.hidden = !iphone;
    caja.innerHTML = iphone ? '<dt>En iPhone</dt><dd data-tono="aviso">' + SRP.util.escapar('Agregue el SRP a la pantalla de inicio (Compartir › Agregar a inicio): Safari borra lo guardado de los sitios que no se abren en 7 días.') + '</dd>' : '';
  },

  // «Simular sin señal» (pruebas, D111) manda sobre lo que diga el teléfono
  enLinea() { return navigator.onLine !== false && !SRP.envio.sinSenalForzada(); },

  async refrescar() {
    const con = this.enLinea();
    const ind = this.el('conexion');
    if (SRP.envio.simulado()) return this.refrescarSimulado(ind, con);
    const n = await this.contarGuardados();
    // En teléfono chico la palabra «guardados» se oculta por CSS (queda «Con conexión · 4»); la etiqueta accesible la dice completa (D93)
    const cuenta = n === null ? '' : ' · ' + n + '<span class="cx-palabra"> ' + (n === 1 ? 'guardado' : 'guardados') + '</span>';
    ind.innerHTML = SRP.ICONOS.svg(con ? 'senal' : 'sinSenal', 'medio') +
      '<span>' + (con ? 'Con conexión' : 'Sin conexión') + cuenta + '</span>';
    ind.dataset.estado = con ? 'con' : 'sin';
    ind.setAttribute('aria-label', (con ? 'Con conexión' : 'Sin conexión, puede seguir registrando') +
      (n === null ? '' : ', ' + n + ' registros guardados en este dispositivo') + '. Abrir la guía de qué hacer sin internet');
  },

  /* La pastilla con el envío simulado (D111): en lugar de cuántos guarda el teléfono, cuántos
     esperan envío. «Al día» cuando no queda nada; rojo cuando hay atraso (días anteriores o
     pasada la hora de cierre); «Enviando 3…» mientras dura el envío. */
  async refrescarSimulado(ind, con) {
    const pend = await SRP.envio.pendientesPropios();
    const n = pend === null ? null : pend.length;
    const enviando = SRP.envio.enCurso;
    const atraso = SRP.envio.atraso(pend);
    let texto, etiqueta;
    if (enviando) {
      texto = 'Enviando ' + enviando + '…';
      etiqueta = 'Enviando ' + enviando + (enviando === 1 ? ' registro' : ' registros') + ' al servidor';
    } else {
      // «Al día» con un servidor simulado no es «enviado» (D150): en pantallas anchas lo dice; en el
      // teléfono lo dicen la banda de datos ficticios, la etiqueta accesible y la guía
      const cuenta = n === null ? '' : n === 0 ? ' · Al día<span class="cx-palabra"> (simulado)</span>' : ' · ' + n + '<span class="cx-palabra"> por enviar</span>';
      texto = (con ? 'Con conexión' : 'Sin conexión') + cuenta;
      etiqueta = (con ? 'Con conexión' : 'Sin conexión, puede seguir registrando') +
        (n === null ? '' : n === 0 ? ', todo enviado al servidor simulado' : ', ' + n + (n === 1 ? ' registro por enviar' : ' registros por enviar')) +
        (atraso ? ', con atraso' : '');
    }
    ind.innerHTML = SRP.ICONOS.svg(con ? 'senal' : 'sinSenal', 'medio') + '<span>' + texto + '</span>';
    ind.dataset.estado = enviando ? 'enviando' : atraso ? 'atraso' : con ? 'con' : 'sin';
    ind.setAttribute('aria-label', etiqueta + '. Abrir la guía de qué hacer sin internet');
  },

  /* Cuántos registros guarda este dispositivo, en el alcance de quien entró: un cabo cuenta los
     suyos. null cuando todavía no hay sesión o almacén. */
  async contarGuardados() {
    const mios = await this.registrosPropios();
    return mios === null ? null : mios.length;
  },

  // Los registros activos que alcanza quien entró
  async registrosPropios() {
    if (!SRP.sesion.usuario || !SRP.almacen.db) return null;
    const u = SRP.sesion.usuario;
    const todos = await SRP.almacen.porIndice('plantaciones', 'estatus', 'activo');
    return todos.filter(r => SRP.permisos.alcanza(u, r, SRP.ref.usuarioPorId));
  }
};

