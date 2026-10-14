/* SESIÓN (capa de autenticación aparte, Norma 1.5).
   Quién está dentro queda anotado en el dispositivo (localStorage) y su cuenta en el almacén: así el
   teléfono abre sin señal con la última sesión. Hay dos formas de entrar, según AUTENTICACION en config.js:

     simulado   con datos de prueba: basta un correo dado de alta; la contraseña no se verifica
     servidor   con datos reales: el servicio verifica correo y contraseña y abre la sesión con una cookie
                que la aplicación no ve. Al entrar bajan los catálogos y la cuenta, lo mínimo para abrir, y
                las cuentas que se ven y los parámetros; lo enviado se trae aparte (js/remoto.js).
                Al abrir con una sesión anotada se entra sin esperar y, si hay señal, se confirma con el
                servicio: si ya no la reconoce, se vuelve a pedir la contraseña sin perder lo capturado. */
window.SRP = window.SRP || {};

SRP.sesion = {
  usuario: null,

  delServidor() { return SRP.CONFIG.AUTENTICACION.PROVEEDOR === 'servidor'; },

  async leer() {
    let id = null;
    try { id = localStorage.getItem(SRP.CONFIG.CLAVE_SESION); } catch (e) { /* almacenamiento bloqueado */ }
    if (!id) return null;
    const u = await SRP.almacen.uno('usuarios', id);
    // Una cuenta cuya institución se desactivó deja de entrar también con la sesión abierta
    this.usuario = u && u.activo && SRP.ref.accesoOrganizacion(SRP.ref.organizacionDe(u)).ok ? u : null;
    return this.usuario;
  },

  iniciar(usuario) {
    this.usuario = usuario;
    try { localStorage.setItem(SRP.CONFIG.CLAVE_SESION, usuario.id); } catch (e) { /* sin persistencia */ }
  },

  // Sale de la sesión en este dispositivo; lo capturado se queda en el almacén y lo enviado se suelta
  olvidar() {
    this.usuario = null;
    SRP.remoto.vaciar();
    try { localStorage.removeItem(SRP.CONFIG.CLAVE_SESION); } catch (e) { /* nada que borrar */ }
  },

  // «Cerrar sesión» para todos; «Cambiar de perfil» (sólo pruebas) también pasa por aquí
  cerrar() {
    // El servicio cierra la suya; sin señal, vence sola
    if (this.delServidor() && this.usuario) SRP.servidor.pedir('POST', '/acceso/salir');
    this.olvidar();
  },

  async autenticar(correo, clave) {
    return this.delServidor() ? this.autenticarEnServidor(correo, clave) : this.autenticarSimulado(correo);
  },

  /* ACCESO SIMULADO (versión de prueba).
     La contraseña NO se verifica: comprobarla en el navegador es seguridad aparente, porque
     cualquiera puede leer el código de la página. Lo único que se comprueba es que el correo
     corresponda a una cuenta dada de alta y activa, que es lo que permite probar el flujo y los
     perfiles. La verificación real la hace el servidor. */
  autenticarSimulado(correo) {
    // Con datos reales el acceso simulado no abre: cualquier contraseña serviría
    if (!SRP.CONFIG.ES_FICTICIO) {
      return { ok: false, motivo: 'El acceso simulado no abre con datos reales: se entra con las cuentas del servidor.' };
    }
    const buscado = SRP.util.normalizar(correo);
    const u = SRP.ref.usuarios.find(x => SRP.util.normalizar(x.correo) === buscado);
    if (!u) return { ok: false, motivo: 'Ese correo no está dado de alta. Solicite su cuenta a la Administración del sistema.' };
    if (!u.activo) return { ok: false, motivo: 'Esa cuenta está desactivada. Consulte con la Administración del sistema.' };
    const acceso = SRP.ref.accesoOrganizacion(SRP.ref.organizacionDe(u));
    if (!acceso.ok) return acceso;
    this.iniciar(u);
    return { ok: true, usuario: u };
  },

  /* ACCESO CON EL SERVIDOR. El mensaje de un rechazo es el del servicio: no dice si el correo existe. */
  async autenticarEnServidor(correo, clave) {
    const r = await SRP.servidor.pedir('POST', '/acceso/entrar', { correo, contrasena: clave });
    if (!r.ok) return { ok: false, motivo: r.sinRed ? 'Para entrar hace falta conexión con el servidor. Intente de nuevo cuando tenga señal.' : r.mensaje };
    if (r.datos.debeCambiar) return this.temporal();
    // Lo mínimo para abrir: los catálogos y la propia cuenta. Si no bajan y no hay unos de antes, no se entra
    const catalogos = await SRP.remoto.bajarCatalogos();
    if (!catalogos.ok && !(await SRP.almacen.todos('instituciones')).length) {
      SRP.servidor.pedir('POST', '/acceso/salir');
      return { ok: false, motivo: catalogos.mensaje };
    }
    const u = await this.ponerAlDia(r.datos.usuario);
    this.iniciar(u);
    // Lo enviado llega mientras tanto, sin detener la entrada
    SRP.remoto.cargar();
    return { ok: true, usuario: u };
  },

  // Una contraseña temporal se cambia antes de seguir; la pantalla para cambiarla todavía no está
  async temporal() {
    await SRP.servidor.pedir('POST', '/acceso/salir');
    return { ok: false, motivo: 'Su contraseña es temporal y hay que cambiarla antes de seguir, pero esta versión todavía no permite cambiarla. Avise a la Administración global.' };
  },

  /* Las cuentas que se ven y los parámetros, y la propia cuenta como la tiene el servicio, que siempre queda
     aunque la lista no baje */
  async ponerAlDia(cuenta) {
    await SRP.remoto.bajarCuentas();
    await SRP.remoto.bajarParametros();
    const u = Object.assign({}, await SRP.almacen.unoLocal('usuarios', cuenta.id), cuenta);
    await SRP.almacen.guardarConBitacora('usuarios', u);
    await SRP.ref.recargar();
    return u;
  },

  /* Al abrir con una sesión anotada: si hay señal, el servicio dice si la sigue reconociendo y cómo está la
     cuenta, se pone al día lo que se queda en el teléfono y se trae lo enviado. Sin señal se sigue con lo del
     almacén, y lo enviado se avisa que falta. */
  async confirmar() {
    if (!this.delServidor() || !this.usuario) return;
    const r = await SRP.servidor.pedir('GET', '/acceso/yo');
    if (!r.ok) {
      // Si la sesión ya no vale, SRP.servidor ya avisó
      if (this.usuario) SRP.remoto.cambiar(r.sinRed ? 'sin-senal' : 'error');
      return;
    }
    if (r.datos.debeCambiar) { this.perdida((await this.temporal()).motivo); return; }
    const antes = this.usuario;
    await SRP.remoto.bajarCatalogos();
    const u = await this.ponerAlDia(r.datos.usuario);
    this.usuario = u;
    // Si la Administración le cambió el perfil, la institución, el nombre o la coordinación, se vuelve a entrar con lo nuevo
    if (['perfil', 'organizacion_id', 'nombre_completo', 'activo'].some(k => antes[k] !== u[k]) ||
        String(antes.coordinadores_ids) !== String(u.coordinadores_ids)) SRP.app.entrar();
    SRP.remoto.cargar();
  },

  /* El servicio ya no reconoce la sesión: se vuelve a pedir la contraseña; lo capturado se queda. Con un árbol
     a medias no se saca a nadie del formulario: se avisa, y al guardarlo, el envío que sigue vuelve aquí */
  perdida(mensaje) {
    if (!this.usuario) return;
    if (SRP.app.vista === 'registrar' && SRP.formulario.aMedias()) {
      SRP.util.anunciar(mensaje + ' Termine el árbol: al guardarlo se le pedirá entrar.', 'aviso');
      return;
    }
    SRP.formulario.limpiar(true);
    this.olvidar();
    SRP.app.mostrarAcceso();
    SRP.util.anunciar(mensaje, 'aviso');
  }
};
