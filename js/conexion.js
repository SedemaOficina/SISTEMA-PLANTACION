/* CONEXIÓN, TRABAJO SIN SEÑAL Y RESPALDO (D71, D72).

   QUÉ SE LE DICE A QUIEN REGISTRA, Y POR QUÉ. La aplicación funciona sin señal: el GPS, la
   captura, el guardado y el parte en PDF viven en el teléfono. Lo que no se decía en pantalla es
   qué pasa con esos registros: en la Etapa 1 no hay servidor, así que no hay nada que enviar
   cuando vuelve la señal, y borrar los datos del navegador los pierde. Este módulo pone las tres
   cosas a la vista: el estado de la conexión, cuántos registros guarda este dispositivo y qué
   hacer con ellos. Cuando exista el servidor (Fase 2), el mismo aviso dirá «N pendientes de
   enviar» y aquí vivirá el botón de sincronizar.

   LA CUENTA VA EN LA PASTILLA (D83). El bloque «Registros en este dispositivo» vive en Reportes,
   a donde el cabo no va en campo; la pastilla del encabezado se ve en todas las pantallas, así
   que lleva la cuenta («Con conexión · 4 guardados») y al tocarla abre la guía. Es lo que hace
   la cola de envío de KoboToolbox, sin su barra lateral. El aviso de «Registro guardado» dice
   además que quedó en este dispositivo y cuántos van, sin pedir otro clic.

   RESPALDO. Un archivo con todo lo que guarda el dispositivo —plantaciones, cierres y bitácora,
   con el mismo esquema de la base— que se comparte igual que el PDF. Un respaldo que nunca se ha
   restaurado es una suposición (Norma 4.9): por eso «Restaurar respaldo» existe, en las
   herramientas de prueba, y la prueba automatizada hace el viaje completo. */
window.SRP = window.SRP || {};

SRP.conexion = {
  el(id) { return document.getElementById(id); },

  iniciar() {
    this.registrarWorker();
    window.addEventListener('online', () => this.refrescar());
    window.addEventListener('offline', () => this.refrescar());
    this.el('btn-ayuda-senal').addEventListener('click', () => this.el('dlg-senal').showModal());
    this.el('conexion').addEventListener('click', () => this.el('dlg-senal').showModal());
    this.el('btn-senal-cerrar').addEventListener('click', () => this.el('dlg-senal').close());
    this.el('btn-respaldo').addEventListener('click', () => this.respaldar());
    const restaurar = this.el('archivo-restaurar');
    if (restaurar) restaurar.addEventListener('change', (e) => this.restaurar(e.target));
    this.refrescar();
  },

  /* El worker se registra con la misma marca de versión de index.html: una versión nueva es un
     worker nuevo. Con file:// (doble clic) no hay worker y no pasa nada: la app abre igual. */
  registrarWorker() {
    if (!('serviceWorker' in navigator) || location.protocol === 'file:') return;
    navigator.serviceWorker.register('sw.js?v=' + encodeURIComponent(SRP.CONFIG.VERSION)).catch(() => {});
  },

  enLinea() { return navigator.onLine !== false; },

  async refrescar() {
    const con = this.enLinea();
    const ind = this.el('conexion');
    const n = await this.contarGuardados();
    const cuenta = n === null ? '' : ' · ' + (n === 1 ? '1 guardado' : n + ' guardados');
    ind.innerHTML = SRP.ICONOS.svg(con ? 'senal' : 'sinSenal', 18) +
      '<span>' + (con ? 'Con conexión' : 'Sin conexión') + cuenta + '</span>';
    ind.dataset.estado = con ? 'con' : 'sin';
    ind.setAttribute('aria-label', (con ? 'Con conexión' : 'Sin conexión, puede seguir registrando') +
      (n === null ? '' : ', ' + n + ' registros guardados en este dispositivo') + '. Abrir la guía de qué hacer sin internet');
    await this.refrescarAvisoEnvio();
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
  },

  // Qué hacer con los registros guardados: bloque «Registros en este dispositivo» de Reportes
  async refrescarAvisoEnvio() {
    const caja = this.el('aviso-envio');
    if (!caja) return;
    const mios = await this.registrosPropios();
    if (mios === null) return;
    const n = mios.length;
    const f = this.resumenFotos(mios);
    const cuenta = n === 1 ? '1 registro guardado' : n + ' registros guardados';
    // Cuántos llevan fotografía y cuánto pesan: la cifra para pedir disco a ADIP (D87)
    const fotos = n ? ' ' + (f.con_foto === 1 ? '1 lleva fotografía' : f.con_foto + ' llevan fotografía') +
      (f.con_foto ? ' (' + SRP.foto.formatearPeso(f.foto_bytes) + ')' : '') + '.' : '';
    caja.innerHTML = SRP.ICONOS.svg('info', 18) + '<strong>' + cuenta + '.</strong>' + fotos + ' ' + (this.enLinea()
      ? 'Por ahora no hay envío al servidor: los registros se quedan aquí. Genere el parte del día y compártalo con su coordinador, o guarde un respaldo. <strong>No borre los datos del navegador.</strong>'
      : 'Siga registrando: no hace falta internet. Cuando tenga señal, genere el parte del día y compártalo.');
  },

  /* Cuántos registros llevan fotografía y cuánto pesan. Es la cifra con la que se pedirá disco a
     ADIP (D87): una proyección con uso medido, no una estimación. */
  resumenFotos(plantaciones) {
    const activos = plantaciones.filter(r => r.estatus === 'activo');
    const conFoto = activos.filter(r => r.foto_base64);
    return { registros: activos.length, con_foto: conFoto.length,
             foto_bytes: conFoto.reduce((s, r) => s + (r.foto_bytes || 0), 0) };
  },

  /* ---------- Respaldo ---------- */

  async respaldar() {
    const u = SRP.sesion.usuario;
    const datos = { sistema: 'SRP', version: SRP.CONFIG.VERSION, generado: SRP.util.ahoraISO(),
                    usuario_id: u ? u.id : null, es_ficticio: SRP.CONFIG.ES_FICTICIO };
    // Las cinco tablas (D87): restaurar en otro dispositivo debe dejar el sistema igual
    for (const a of SRP.almacen.ALMACENES) datos[a] = await SRP.almacen.todos(a);
    datos.resumen = this.resumenFotos(datos.plantaciones);
    const nombre = 'SRP_respaldo_' + SRP.util.fechaHoy() + (u ? '_' + u.id : '') + '.json';
    const blob = new Blob([JSON.stringify(datos)], { type: 'application/json' });
    await SRP.reportes.entregarArchivo(blob, nombre, 'Respaldo del Sistema de Registro de Plantaciones');
    SRP.util.anunciar('Respaldo guardado: ' + datos.plantaciones.length + ' registros.');
  },

  /* Restaurar: sólo agrega lo que no existe, nunca sobreescribe. Está en las herramientas de
     prueba porque en Fase 2 la restauración la hace el servidor a partir del mismo archivo. */
  async restaurar(entrada) {
    const archivo = entrada.files[0]; entrada.value = '';
    if (!archivo) return;
    let datos;
    try { datos = JSON.parse(await archivo.text()); } catch (e) { SRP.util.anunciar('El archivo no es un respaldo válido.', 'alerta'); return; }
    if (!datos || datos.sistema !== 'SRP') { SRP.util.anunciar('El archivo no es un respaldo del SRP.', 'alerta'); return; }
    let nuevos = 0;
    for (const a of SRP.almacen.ALMACENES) {
      for (const obj of (datos[a] || [])) {
        if (await SRP.almacen.uno(a, obj.id)) continue;
        await SRP.almacen.guardarConBitacora(a, obj, null);
        nuevos += 1;
      }
    }
    await SRP.ref.recargar();
    if (SRP.registros.preparar && SRP.app.vista === 'registros') await SRP.registros.preparar();
    await this.refrescarAvisoEnvio();
    SRP.util.anunciar('Respaldo restaurado: ' + nuevos + (nuevos === 1 ? ' elemento nuevo.' : ' elementos nuevos.'));
  }
};
