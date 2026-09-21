/* SESIÓN (capa de autenticación aparte, Norma 1.5).
   Fase 1: acceso simulado; el usuario queda fijo en el dispositivo (localStorage).
   Fase 2: sustituir iniciar()/leer() por el proveedor institucional sin tocar el resto. */
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

  // Sólo disponible mientras CONFIG.ES_FICTICIO sea true (herramienta de pruebas)
  cerrar() {
    this.usuario = null;
    try { localStorage.removeItem(SRP.CONFIG.CLAVE_SESION); } catch (e) { /* nada que borrar */ }
  },

  async registrarNuevo(datos) {
    const u = {
      id: SRP.util.generarId(),
      nombre: datos.nombre, apellido_paterno: datos.apellido_paterno, apellido_materno: datos.apellido_materno,
      area_id: datos.area_id, cargo_rol: datos.cargo_rol,
      perfil: 'REGISTRADOR', jefe_id: null,   // [pendiente] Fase 2: la administración asigna jefe
      activo: true, es_ficticio: SRP.CONFIG.ES_FICTICIO, fecha_alta: SRP.util.ahoraISO()
    };
    this.usuario = u;   // la bitácora necesita al autor
    await SRP.almacen.guardarConBitacora('usuarios', u, SRP.bitacora.entrada('CREADO', 'usuario', u.id, 'Alta de registrador desde el dispositivo'));
    this.iniciar(u);
    return u;
  }
};
