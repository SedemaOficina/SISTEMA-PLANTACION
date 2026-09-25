/* SESIÓN (capa de autenticación aparte, Norma 1.5).
   Fase 1: acceso simulado; el usuario queda fijo en el dispositivo (localStorage).
   Fase 2: se sustituye sólo autenticar() por el proveedor institucional, sin tocar el resto. */
window.SRP = window.SRP || {};

SRP.sesion = {
  usuario: null,

  async leer() {
    let id = null;
    try { id = localStorage.getItem(SRP.CONFIG.CLAVE_SESION); } catch (e) { /* almacenamiento bloqueado */ }
    if (!id) return null;
    const u = await SRP.almacen.uno('usuarios', id);
    this.usuario = u && u.activo ? u : null;
    return this.usuario;
  },

  iniciar(usuario) {
    this.usuario = usuario;
    try { localStorage.setItem(SRP.CONFIG.CLAVE_SESION, usuario.id); } catch (e) { /* sin persistencia */ }
  },

  // «Cerrar sesión» para todos; «Cambiar de perfil» (sólo pruebas) también pasa por aquí
  cerrar() {
    this.usuario = null;
    try { localStorage.removeItem(SRP.CONFIG.CLAVE_SESION); } catch (e) { /* nada que borrar */ }
  },

  /* ACCESO SIMULADO (Fase 1).
     La contraseña NO se verifica: comprobarla en el navegador es seguridad aparente, porque
     cualquiera puede leer el código de la página. Lo único que se comprueba es que el correo
     corresponda a una cuenta dada de alta y activa, que es lo que permite probar el flujo y los
     perfiles. La verificación real la hace el proveedor institucional en Fase 2, y entonces se
     sustituye sólo esta función. Ver AUTENTICACION en config.js. */
  autenticar(correo) {
    // Con datos reales el acceso simulado no abre (D150): hasta conectar el proveedor institucional,
    // cualquier contraseña serviría. Apagar ES_FICTICIO sin cambiar el proveedor deja el acceso cerrado.
    if (SRP.CONFIG.AUTENTICACION.PROVEEDOR === 'simulado' && !SRP.CONFIG.ES_FICTICIO) {
      return { ok: false, motivo: 'El acceso institucional todavía no está conectado: esta versión no se puede usar con datos reales.' };
    }
    const buscado = SRP.util.normalizar(correo);
    const u = SRP.ref.usuarios.find(x => SRP.util.normalizar(x.correo) === buscado);
    if (!u) return { ok: false, motivo: 'Ese correo no está dado de alta. Solicite su cuenta a la Administración del sistema.' };
    if (!u.activo) return { ok: false, motivo: 'Esa cuenta está desactivada. Consulte con la Administración del sistema.' };
    this.iniciar(u);
    return { ok: true, usuario: u };
  }
};
