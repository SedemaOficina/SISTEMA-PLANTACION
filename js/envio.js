/* ENVÍO AL SERVIDOR, SIMULADO CON DATOS DE PRUEBA (D111).

   PARA QUÉ. En la Etapa 1 no hay servidor y los registros se quedan en el teléfono. Para ver en
   pruebas cómo funcionará la Fase 2, con datos ficticios se simula la cola de envío completa:
   cada registro nace «por enviar», se envía solo en cuanto hay señal y el servidor simulado
   confirma la recepción y le asigna el folio (D110). Nada sale del teléfono: la «recepción» se
   anota en este dispositivo. Con ES_FICTICIO en false nada de esto corre y la pantalla dice lo
   que dice hoy (D83).

   ESTADOS DE UN REGISTRO:
     por_enviar   guardado en el teléfono, nunca enviado (sin folio)
     cambios      enviado, pero editado después: los cambios esperan su envío
     recibido     el servidor confirmó la recepción (con folio)

   CUÁNDO SE ENVÍA, SIN QUE NADIE TOQUE NADA: al guardar, al entrar, al volver la señal, al
   volver a la app y cada minuto mientras haya pendientes. «Enviar ahora» lo fuerza.

   CÓMO SE AVISA:
     · la pastilla del encabezado: «Con conexión · Al día», «Sin conexión · 3 por enviar»,
       «Enviando 3…»; se pone en rojo si hay atraso
     · el diálogo «Registro guardado»: enviado con su hora de recepción, o por enviar
     · la franja de atraso: «Hoy es miércoles 23 de septiembre. Tiene 5 registros sin enviar
       desde el lunes 21…», o al final de la jornada, los de hoy sin enviar
     · la tarjeta («Por enviar») y el detalle (fila «Envío»)

   «SIMULAR SIN SEÑAL». Interruptor del menú de cuenta, sólo en pruebas: hace que la aplicación
   se comporte como sin conexión (pastilla, cola, franja) sin poner el teléfono en modo avión.
   No apaga el mapa: los mosaicos siguen llegando si hay red. */
window.SRP = window.SRP || {};

SRP.envio = {
  enviando: null,     // la promesa del envío en curso: dos disparos seguidos no envían dos veces
  enCurso: 0,         // cuántos registros van en el envío en curso (para la pastilla)

  el(id) { return document.getElementById(id); },
  simulado() { return !!SRP.CONFIG.ES_FICTICIO; },

  /* ---------- Lo que el servidor simulado «recibió» (vive en este dispositivo) ---------- */

  leer() {
    let e;
    try { e = JSON.parse(localStorage.getItem(SRP.CONFIG.CLAVE_ENVIOS_PRUEBA) || '{}'); } catch (err) { e = {}; }
    return { recibidos: e.recibidos || {}, cambios: e.cambios || [], ultimo: e.ultimo || null };
  },

  escribir(e) {
    try { localStorage.setItem(SRP.CONFIG.CLAVE_ENVIOS_PRUEBA, JSON.stringify(e)); } catch (err) { /* sin persistencia */ }
  },

  // `e` se pasa cuando se evalúan muchos registros seguidos, para leer una sola vez
  estado(r, e) {
    if (!SRP.folio.valido(r.folio)) return 'por_enviar';
    e = e || this.leer();
    return e.cambios.includes(r.id) ? 'cambios' : 'recibido';
  },

  // Una edición de un registro ya enviado vuelve a la cola
  marcarCambios(id) {
    if (!this.simulado()) return;
    const e = this.leer();
    if (!e.cambios.includes(id)) e.cambios.push(id);
    this.escribir(e);
  },

  // La cola del dispositivo: todos los registros de prueba activos que esperan envío
  async cola() {
    if (!SRP.almacen.db) return [];
    const e = this.leer();
    return (await SRP.almacen.porIndice('plantaciones', 'estatus', 'activo'))
      .filter(r => r.es_ficticio && this.estado(r, e) !== 'recibido')
      .sort((a, b) => String(a.fecha_registro).localeCompare(String(b.fecha_registro)));
  },

  // Los pendientes que alcanza quien entró: es la cifra que se le enseña (D83)
  async pendientesPropios() {
    const mios = await SRP.conexion.registrosPropios();
    if (mios === null) return null;
    const e = this.leer();
    return mios.filter(r => r.es_ficticio && this.estado(r, e) !== 'recibido');
  },

  /* ---------- Señal simulada ---------- */

  sinSenalForzada() {
    if (!this.simulado()) return false;
    try { return localStorage.getItem(SRP.CONFIG.CLAVE_SIN_SENAL_PRUEBA) === '1'; } catch (err) { return false; }
  },

  forzarSinSenal(sin) {
    try { localStorage.setItem(SRP.CONFIG.CLAVE_SIN_SENAL_PRUEBA, sin ? '1' : '0'); } catch (err) { /* sin persistencia */ }
    this.el('btn-sin-senal').setAttribute('aria-checked', String(sin));
    window.dispatchEvent(new Event(sin ? 'offline' : 'online'));
  },

  /* ---------- Enviar ---------- */

  esperar(ms) { return new Promise(res => setTimeout(res, ms)); },

  /* Envía la cola completa. `op.manual`: lo pidió la persona («Enviar ahora») y se le contesta
     aunque no haya nada que enviar. `op.silencioso`: quien llama dice el resultado en su pantalla
     (el diálogo de guardado), así que aquí no se pone aviso flotante. */
  async enviar(op) {
    op = op || {};
    if (!this.simulado() || !SRP.sesion.usuario || !SRP.almacen.db) return null;
    if (this.enviando) return this.enviando;
    const cola = await this.cola();
    const n = cola.length;
    if (!n) {
      if (op.manual) SRP.util.anunciar('No hay registros por enviar: todo está en el servidor.', 'aviso');
      return { enviados: 0, pendientes: 0 };
    }
    if (!SRP.conexion.enLinea()) {
      if (op.manual) SRP.util.anunciar('Sin conexión. ' + this.textoCuenta(n) + ' en el teléfono y ' + (n === 1 ? 'se enviará solo' : 'se enviarán solos') + ' cuando haya señal.', 'alerta');
      return { enviados: 0, pendientes: n };
    }
    this.enviando = (async () => {
      this.enCurso = n;
      await SRP.conexion.refrescar();
      await this.esperar(SRP.CONFIG.DEMORA_ENVIO_PRUEBA_MS);
      // La señal puede irse a medio envío: nada se da por recibido sin confirmación
      if (!SRP.conexion.enLinea()) return { enviados: 0, pendientes: n, cortado: true };
      await SRP.folio.emitirPendientes();
      const e = this.leer();
      const ahora = SRP.util.ahoraISO();
      const ids = cola.map(r => r.id);
      ids.forEach(id => { e.recibidos[id] = ahora; });
      e.cambios = e.cambios.filter(id => !ids.includes(id));
      e.ultimo = ahora;
      this.escribir(e);
      return { enviados: n, pendientes: 0, hora: ahora };
    })();
    let res;
    try { res = await this.enviando; } finally { this.enviando = null; this.enCurso = 0; }
    await this.alCambiar();
    if (res.cortado) SRP.util.anunciar('Se perdió la señal durante el envío. ' + this.textoCuenta(n) + ' en el teléfono; ' + (n === 1 ? 'se enviará' : 'se enviarán') + ' cuando vuelva.', 'alerta');
    else if (!op.silencioso) SRP.util.anunciar((n === 1 ? '1 registro enviado' : n + ' registros enviados') + ' al servidor (simulado). Recepción confirmada.');
    return res;
  },

  textoCuenta(n) { return n === 1 ? 'El registro sigue guardado' : 'Los ' + n + ' registros siguen guardados'; },

  // Todo lo que enseña el estado del envío se pone al día junto
  async alCambiar() {
    await SRP.conexion.refrescar();
    await this.pintarFranja();
    if (SRP.app.vista === 'registros') await SRP.registros.refrescarEnvio();
  },

  /* ---------- Fechas y horas para los avisos ---------- */

  diaLocal(iso) {
    const d = new Date(iso);
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  },

  // 'AAAA-MM-DD' -> 'miércoles 23 de septiembre'
  diaEnLetra(aaaammdd) {
    const [a, m, d] = aaaammdd.split('-').map(Number);
    return new Date(a, m - 1, d).toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' }).replace(',', '');
  },

  hora(iso) { return new Date(iso).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', hour12: false }); },

  // Cómo se dice cuándo: «hoy a las 11:42», «el lunes 21 de septiembre a las 18:05»
  cuando(iso) {
    const dia = this.diaLocal(iso);
    return (dia === SRP.util.fechaHoy() ? 'hoy' : 'el ' + this.diaEnLetra(dia)) + ' a las ' + this.hora(iso);
  },

  /* ---------- Atraso ---------- */

  /* Hay atraso cuando algo espera envío desde un día anterior, o cuando ya pasó la hora de cierre
     de la jornada y hay pendientes de hoy. */
  atraso(pendientes) {
    if (!pendientes || !pendientes.length) return null;
    const hoy = SRP.util.fechaHoy();
    const dias = pendientes.map(r => this.diaLocal(r.fecha_registro)).sort();
    const viejos = dias.filter(d => d < hoy);
    if (viejos.length) return { tipo: 'dias', n: pendientes.length, desde: viejos[0] };
    if (new Date().getHours() >= SRP.CONFIG.HORA_CIERRE_JORNADA) return { tipo: 'cierre', n: pendientes.length };
    return null;
  },

  async pintarFranja() {
    const franja = this.el('franja-envio');
    if (!franja) return;
    const pend = this.simulado() && SRP.sesion.usuario ? await this.pendientesPropios() : null;
    const a = this.atraso(pend);
    franja.hidden = !a;
    if (!a) return;
    const hoy = this.diaEnLetra(SRP.util.fechaHoy());
    const cuenta = a.n === 1 ? '1 registro sin enviar' : a.n + ' registros sin enviar';
    const texto = a.tipo === 'dias'
      ? 'Hoy es ' + hoy + '. Tiene ' + cuenta + ' desde el ' + this.diaEnLetra(a.desde) + '.'
      : 'Son las ' + this.hora(SRP.util.ahoraISO()) + ' y tiene ' + cuenta + ' de hoy.';
    const consejo = SRP.conexion.enLinea()
      ? ' Hay conexión: toque «Enviar ahora».'
      : ' Busque señal o una red wifi antes de terminar: ' + (a.n === 1 ? 'se enviará solo' : 'se enviarán solos') + '. No borre los datos del navegador.';
    this.el('franja-envio-texto').innerHTML = '<strong>' + SRP.util.escapar(texto) + '</strong>' + SRP.util.escapar(consejo);
  },

  /* ---------- Guía «¿Qué hacer sin internet?» ---------- */

  async pintarGuia() {
    const caja = this.el('senal-cola');
    if (!caja || !this.simulado()) return;
    const pend = await this.pendientesPropios();
    const e = this.leer();
    caja.hidden = false;
    this.el('senal-cola-texto').textContent = (pend && pend.length
      ? (pend.length === 1 ? '1 registro por enviar' : pend.length + ' registros por enviar')
      : 'Todo enviado al servidor simulado') + (e.ultimo ? '. Último envío: ' + this.cuando(e.ultimo) + '.' : '.');
    this.el('senal-destino').innerHTML = '<strong>Sus registros se guardan primero en este teléfono</strong> y se envían solos al servidor en cuanto hay señal; ' +
      'no tiene que hacer nada. En pruebas el servidor es simulado: nada sale del teléfono.';
  },

  /* ---------- Arranque ---------- */

  /* Botón con estado de espera (D136): texto a «Enviando…», aria-busy y deshabilitado mientras
     dura la operación, para que un envío con demora (o sin señal, que tarda en confirmar que no
     salió) no parezca un botón que no respondió. Vuelve a su texto e icono originales al terminar,
     pase lo que pase. */
  async conBoton(b, fn) {
    if (!b || b.disabled) return;
    const html0 = b.innerHTML;
    b.disabled = true;
    b.setAttribute('aria-busy', 'true');
    b.innerHTML = SRP.ICONOS.svg('info', 'medio') + '<span>Enviando…</span>';
    try { await fn(); }
    finally { b.disabled = false; b.removeAttribute('aria-busy'); b.innerHTML = html0; }
  },

  iniciar() {
    if (!this.simulado()) return;
    const b = this.el('btn-sin-senal');
    b.hidden = false;
    b.setAttribute('aria-checked', String(this.sinSenalForzada()));
    b.addEventListener('click', () => { SRP.app.menuCuenta(false); this.forzarSinSenal(!this.sinSenalForzada()); });
    this.el('btn-enviar-ahora').addEventListener('click', async () => {
      await this.conBoton(this.el('btn-enviar-ahora'), async () => {
        await this.enviar({ manual: true });
        await this.pintarGuia();
      });
    });
    this.el('btn-franja-enviar').addEventListener('click', () => this.conBoton(this.el('btn-franja-enviar'), () => this.enviar({ manual: true })));
    this.el('conexion').addEventListener('click', () => this.pintarGuia());
    // Al volver a la app (del fondo o de otra) y cada minuto: reintento y franja al día
    document.addEventListener('visibilitychange', () => { if (!document.hidden) this.enviar(); });
    setInterval(() => { this.enviar(); this.pintarFranja(); }, SRP.CONFIG.REINTENTO_ENVIO_MS);
  },

  // Al entrar: primero se intenta el envío de lo pendiente; lo que no salga queda en la franja
  async alEntrar() {
    if (!this.simulado()) return;
    await this.pintarFranja();
    const pend = await this.pendientesPropios();
    if (pend && pend.length && SRP.conexion.enLinea()) {
      const res = await this.enviar({ silencioso: true });
      if (res && res.enviados) SRP.util.anunciar('Se enviaron ' + (res.enviados === 1 ? '1 registro que estaba pendiente' : res.enviados + ' registros que estaban pendientes') + ' (simulado).');
    }
  }
};
