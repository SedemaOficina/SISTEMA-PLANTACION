/* EL SERVIDOR: cómo habla la aplicación con el servicio del SRP, en CONFIG.API del mismo sitio. Sólo con
   datos reales; con datos de prueba nada sale del teléfono.

   Cada pedido devuelve, sin lanzar nunca:
     { ok: true, datos }                          lo que respondió el servicio
     { ok: false, sinRed: true, mensaje }         no hubo respuesta: sin señal, el servicio caído o tardó
                                                  más de ESPERA_SERVIDOR_MS. Lo capturado sigue aquí
     { ok: false, estado, codigo, mensaje, errores }   el servicio no aceptó el pedido; el mensaje es para
                                                  la persona y el código, para la aplicación

   La sesión es una cookie sólo HTTP que guarda el navegador: la aplicación no la ve ni la toca. Si el
   servicio ya no la reconoce (SIN_SESION o SESION_…), se avisa a SRP.sesion, que pide volver a entrar sin
   perder lo capturado. */
window.SRP = window.SRP || {};

SRP.servidor = {
  async pedir(metodo, ruta, cuerpo) {
    const C = SRP.CONFIG, ctrl = new AbortController();
    const reloj = setTimeout(() => ctrl.abort(), C.ESPERA_SERVIDOR_MS);
    let r;
    try {
      r = await fetch(C.API + ruta, {
        method: metodo, credentials: 'same-origin', cache: 'no-store', signal: ctrl.signal,
        headers: cuerpo === undefined ? {} : { 'content-type': 'application/json' },
        body: cuerpo === undefined ? undefined : JSON.stringify(cuerpo)
      });
    } catch (e) {
      return { ok: false, sinRed: true, mensaje: 'No hay conexión con el servidor. Lo capturado se guarda en este equipo.' };
    } finally {
      clearTimeout(reloj);
    }
    let datos = null;
    try { datos = await r.json(); } catch (e) { /* sin cuerpo, o no es del servicio */ }
    if (r.ok) return { ok: true, estado: r.status, datos };
    // El servidor web contesta por el servicio cuando éste no responde: es como no tener conexión
    if (r.status >= 502 && r.status <= 504) return { ok: false, sinRed: true, mensaje: 'El servidor no responde por ahora. Lo capturado se guarda en este equipo.' };
    const codigo = (datos && datos.codigo) || 'ERROR';
    const mensaje = (datos && datos.mensaje) || 'El servidor no pudo atender el pedido (error ' + r.status + ').';
    if (r.status === 401 && ruta !== '/acceso/entrar' && (codigo === 'SIN_SESION' || codigo.startsWith('SESION_'))) SRP.sesion.perdida(mensaje);
    return { ok: false, estado: r.status, codigo, mensaje, errores: (datos && datos.errores) || [] };
  }
};
