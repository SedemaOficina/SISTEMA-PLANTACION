/* REGLAS DE PERFIL: fuente única de qué puede hacer cada perfil.
   En Fase 2 estas reglas se imponen en el servidor (Norma 7.1); la pantalla sólo las refleja.
   Aquí viven una sola vez para que la pantalla no las repita. */
window.SRP = window.SRP || {};

SRP.PERFILES = {
  REGISTRADOR: { etiqueta: 'Registrador',            alcance: 'propios', registrar: true,  editar: true,  eliminar: true,  catalogos: false, usuarios: false,
                 descripcion: 'Registra plantaciones y ve, edita y elimina únicamente las suyas.' },
  JEFE:        { etiqueta: 'Jefe de registradores',  alcance: 'equipo',  registrar: true,  editar: true,  eliminar: false, catalogos: false, usuarios: false, // [pendiente] confirmar si registra y si elimina
                 descripcion: 'Ve y edita los registros de quienes lo tienen asignado como jefe. No elimina.' },
  ADMIN:       { etiqueta: 'Administración global',  alcance: 'todos',   registrar: true,  editar: true,  eliminar: true,  catalogos: true,  usuarios: true,
                 descripcion: 'Ve y modifica todo, y administra los catálogos y las cuentas de usuario.' },
  VIEWER:      { etiqueta: 'Consulta',               alcance: 'todos',   registrar: false, editar: false, eliminar: false, catalogos: false, usuarios: false,
                 descripcion: 'Ve todos los registros y genera reportes. No captura ni modifica nada.' }
};

SRP.permisos = {
  de(usuario) { return SRP.PERFILES[usuario.perfil] || SRP.PERFILES.VIEWER; },

  // ¿El registro está dentro del alcance del usuario?
  alcanza(usuario, registro, usuariosPorId) {
    const alcance = this.de(usuario).alcance;
    if (alcance === 'todos') return true;
    if (registro.registrador_id === usuario.id) return true;
    if (alcance === 'equipo') {
      const autor = usuariosPorId[registro.registrador_id];
      return !!autor && autor.jefe_id === usuario.id;
    }
    return false;
  },

  puedeEditar(usuario, registro, usuariosPorId) {
    return this.de(usuario).editar && this.alcanza(usuario, registro, usuariosPorId);
  },

  puedeEliminar(usuario, registro, usuariosPorId) {
    return this.de(usuario).eliminar && this.alcanza(usuario, registro, usuariosPorId);
  }
};
