/* HERRAMIENTAS DE LA VERSIÓN DE PRUEBA: entrar con una cuenta de ejemplo sin escribir credenciales, cambiar de usuario,
   la ventana con los datos de demostración y «Restablecer», y la franja de datos ficticios. La copia para el SIA no
   carga este archivo ni lleva sus bloques de index.html (herramientas/preparar_produccion.py): js/app.js lo llama
   sólo si existe. */
window.SRP = window.SRP || {};

SRP.prueba = {
  el(id) { return document.getElementById(id); },

  // Las cuentas de prueba que se ofrecen al entrar: una por rol distinto
  CUENTAS_POR_ROL: ['u-admin-1', 'u-dir-1', 'u-coord-1', 'u-cabo-1', 'u-dir-alc', 'u-coord-alc', 'u-cabo-alc'],

  ponerIconos() {
    const I = SRP.ICONOS;
    I.poner(this.el('btn-entrar-prueba'), 'entrar', 'medio');
    I.poner(this.el('btn-demo-cargar'), 'regenerar', 'medio');
    I.poner(this.el('btn-demo-quitar'), 'basura', 'medio');
    [['btn-sin-senal', 'sinSenal'], ['btn-datos-prueba', 'regenerar'], ['btn-cambiar-perfil', 'usuario']]
      .forEach(([id, icono]) => I.poner(this.el(id), icono, 'medio'));
  },

  // La franja de datos ficticios, al arrancar
  mostrarBanda() { this.el('banda-ficticio').hidden = !SRP.CONFIG.ES_FICTICIO; },

  // Los botones. `salir` es el mismo cierre de sesión del menú de la cuenta (js/app.js)
  iniciar(salir) {
    this.el('btn-entrar-prueba').addEventListener('click', () => {
      const u = SRP.ref.usuarioPorId[this.el('sel-usuario-prueba').value];
      if (!u) return;
      SRP.sesion.iniciar(u);
      SRP.app.entrar();
    });
    this.el('btn-cambiar-perfil').addEventListener('click', () => { SRP.app.menuCuenta(false); salir(); });
    this.el('btn-datos-prueba').addEventListener('click', async () => { SRP.app.menuCuenta(false); await SRP.demo.pintar(); this.el('dlg-prueba').showModal(); });
    // Restablecer es herramienta de prueba: con datos reales no se conecta
    if (SRP.CONFIG.ES_FICTICIO) this.el('btn-restablecer').addEventListener('click', async () => {
      // Lo que se pierde, con números: «todo lo capturado» no dice cuánto
      const regs = (await SRP.almacen.todos('plantaciones')).filter(r => r.estatus !== 'eliminado').length;
      const jors = (await SRP.almacen.todos('jornadas')).length;
      const cola = SRP.envio.simulado() && SRP.sesion.usuario ? (await SRP.envio.cola()).length : 0;
      const ok = await SRP.app.confirmar({ titulo: 'Restablecer los datos de prueba', pregunta: '¿Borrar lo capturado en este equipo y volver a los datos de ejemplo?',
        puntosTitulo: 'Qué pasa:', puntos: [
          'Se borran ' + regs + (regs === 1 ? ' registro' : ' registros') + ' y ' + jors + (jors === 1 ? ' jornada' : ' jornadas') + '.',
          cola ? (cola === 1 ? '1 registro no se ha enviado y se perderá.' : cola + ' registros no se han enviado y se perderán.') : '',
          'Se cierra la sesión.'], irreversible: true, boton: 'Restablecer', icono: 'basura' });
      if (!ok) return;
      this.cerrarDatosPrueba();
      await SRP.almacen.restablecer();
      await SRP.ref.recargar();
      SRP.formulario.limpiar();
      SRP.sesion.cerrar();
      SRP.app.mostrarAcceso();
      SRP.util.anunciar('Datos de prueba restablecidos.');
    });
  },

  // La ventana se cierra al terminar lo que hizo, para que se lea el aviso
  cerrarDatosPrueba() { const d = this.el('dlg-prueba'); if (d.open) d.close(); },

  // Al volver a la entrada: nada de la sesión que terminó
  alSalir() {
    this.el('herramientas-prueba').hidden = true;
    this.el('caja-demo').hidden = true;
    this.el('btn-datos-prueba').hidden = true;
    this.cerrarDatosPrueba();
  },

  /* UNA CUENTA POR ROL DISTINTO en la entrada: los cuatro perfiles de la Secretaría y los tres de una institución de
     fuera, que dicen cuál («Cabo, Alcaldía Iztapalapa»). Las demás cuentas de arranque y las de los datos de
     demostración existen —son dueñas de sus jornadas— pero no se listan: no enseñan nada distinto. Las que se dan de
     alta en Usuarios sí aparecen, en su grupo, para probarlas. */
  ofrecerCuentas() {
    const prueba = this.el('acceso-prueba');
    prueba.hidden = !SRP.CONFIG.ES_FICTICIO;
    if (prueba.hidden) return;
    const esc = SRP.util.escapar, rango = { ADMIN: 0, DIRECTIVO: 1, COORDINADOR: 2, CABO: 3 };
    const orden = u => [SRP.ref.esSedema(u.organizacion_id) ? 0 : 1, rango[u.perfil] ?? 4, SRP.util.nombreCompleto(u)];
    const comparar = (a, b) => { const x = orden(a), y = orden(b); for (let i = 0; i < x.length; i++) { if (x[i] < y[i]) return -1; if (x[i] > y[i]) return 1; } return 0; };
    const opcion = u => '<option value="' + esc(u.id) + '">' + esc(SRP.util.nombreCompleto(u) + ' — ' + SRP.permisos.de(u).etiqueta +
      (SRP.ref.esSedema(u.organizacion_id) ? '' : ', ' + SRP.ref.nombreOrganizacion(u.organizacion_id))) + '</option>';
    const pueden = SRP.ref.usuarios.filter(u => u.activo && SRP.ref.accesoOrganizacion(SRP.ref.organizacionDe(u)).ok).sort(comparar);
    const deArranque = new Set(((SRP.DATOS_FICTICIOS || {}).usuarios || []).map(u => u.id));
    const porRol = pueden.filter(u => this.CUENTAS_POR_ROL.includes(u.id));
    const propias = pueden.filter(u => !deArranque.has(u.id) && !(SRP.demo && SRP.demo.es(u.id)));
    this.el('sel-usuario-prueba').innerHTML = porRol.map(opcion).join('') +
      (propias.length ? '<optgroup label="Cuentas dadas de alta en Usuarios">' + propias.map(opcion).join('') + '</optgroup>' : '');
  },

  // Al entrar: cambiar de usuario y la ventana de los datos de prueba, sólo con datos de prueba
  alEntrar() {
    this.el('btn-cambiar-perfil').hidden = !SRP.CONFIG.ES_FICTICIO;
    this.el('herramientas-prueba').hidden = !SRP.CONFIG.ES_FICTICIO;
    this.el('btn-datos-prueba').hidden = !SRP.CONFIG.ES_FICTICIO;
  },
};
