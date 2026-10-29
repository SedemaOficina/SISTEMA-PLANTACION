/* EL SERVIDOR: cómo habla la aplicación con el servicio del SRP, en CONFIG.API del mismo sitio. Sólo con
   datos reales; con datos de prueba nada sale del teléfono.

   Cada pedido devuelve, sin lanzar nunca:
     { ok: true, datos }                          lo que respondió el servicio, siempre en JSON
     { ok: false, sinRed: true, mensaje }         no hubo respuesta del servicio: sin señal, el servicio caído,
                                                  tardó más de ESPERA_SERVIDOR_MS, o contestó otro (una página
                                                  de mantenimiento, el portal de una red wifi). Lo capturado
                                                  sigue aquí
     { ok: false, estado, codigo, mensaje, errores }   el servicio no aceptó el pedido; el mensaje es para
                                                  la persona y el código, para la aplicación

   La sesión es una cookie sólo HTTP que guarda el navegador: la aplicación no la ve ni la toca. Si el
   servicio ya no la reconoce (SIN_SESION o SESION_…), se avisa a SRP.sesion, que pide volver a entrar sin
   perder lo capturado.

   Lo que se envía lleva el sello de los datos que conoce el teléfono (X-SRP-Sello). Si el servidor se vació
   después de la prueba, responde SELLO_DISTINTO: no es un rechazo de lo enviado sino que ya no va, y
   SRP.sesion borra lo que guardaba el teléfono. */
window.SRP = window.SRP || {};

SRP.servidor = {
  pedir(metodo, ruta, cuerpo) {
    return this.mandar(metodo, ruta, cuerpo === undefined ? undefined : JSON.stringify(cuerpo), cuerpo === undefined ? null : 'application/json');
  },

  // Una fotografía, tal cual: sus bytes y su tipo
  subir(ruta, datos, tipo) { return this.mandar('PUT', ruta, datos, tipo); },

  async mandar(metodo, ruta, cuerpo, tipo) {
    const C = SRP.CONFIG, ctrl = new AbortController(), sello = metodo === 'GET' ? null : SRP.sesion.selloServidor();
    const reloj = setTimeout(() => ctrl.abort(), C.ESPERA_SERVIDOR_MS);
    let r;
    try {
      r = await fetch(C.API + ruta, {
        method: metodo, credentials: 'same-origin', cache: 'no-store', signal: ctrl.signal,
        headers: Object.assign(tipo ? { 'content-type': tipo } : {}, sello ? { 'x-srp-sello': sello } : {}), body: cuerpo
      });
    } catch (e) {
      return { ok: false, sinRed: true, mensaje: 'No hay conexión con el servidor. Lo capturado se guarda en este equipo.' };
    } finally {
      clearTimeout(reloj);
    }
    let datos = null;
    try { datos = await r.json(); } catch (e) { /* sin cuerpo, o no es del servicio */ }
    // La hora del servicio, para avisar si la del teléfono está mal (js/reloj.js); la de otro no cuenta
    if (datos && typeof datos === 'object') SRP.reloj.anotar(r.headers.get('date'));
    // El servicio siempre contesta en JSON: un «correcto» sin él lo dio otro, y no confirma nada
    if (r.ok && (datos === null || typeof datos !== 'object')) return { ok: false, sinRed: true, mensaje: 'El servidor no respondió. Lo capturado se guarda en este equipo.' };
    if (r.ok) return { ok: true, estado: r.status, datos };
    // El servidor web contesta por el servicio cuando éste no responde: es como no tener conexión
    if (r.status >= 502 && r.status <= 504) return { ok: false, sinRed: true, mensaje: 'El servidor no responde por ahora. Lo capturado se guarda en este equipo.' };
    const codigo = (datos && datos.codigo) || 'ERROR';
    const mensaje = (datos && datos.mensaje) || 'El servidor no pudo atender el pedido (error ' + r.status + ').';
    if (r.status === 401 && ruta !== '/acceso/entrar' && (codigo === 'SIN_SESION' || codigo.startsWith('SESION_'))) SRP.sesion.perdida(mensaje);
    // Como sin conexión: lo enviado no pasa a «Revisar»; se borra con lo demás del teléfono
    if (r.status === 409 && codigo === 'SELLO_DISTINTO') { SRP.sesion.servidorVaciado(datos.sello, true); return { ok: false, sinRed: true, mensaje }; }
    return { ok: false, estado: r.status, codigo, mensaje, errores: (datos && datos.errores) || [] };
  }
};
