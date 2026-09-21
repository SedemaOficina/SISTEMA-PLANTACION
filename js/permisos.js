/* REGLAS DE PERFIL: fuente única de qué puede hacer cada perfil.
   En Fase 2 estas reglas se imponen en el servidor (Norma 7.1); la pantalla sólo las refleja.
   Aquí viven una sola vez para que la pantalla no las repita. */
window.SRP = window.SRP || {};

SRP.PERFILES = {
  REGISTRADOR: { etiqueta: 'Registrador',            alcance: 'propios', registrar: true,  editar: true,  eliminar: true,  catalogos: false },
  JEFE:        { etiqueta: 'Jefe de registradores',  alcance: 'equipo',  registrar: true,  editar: true,  eliminar: false, catalogos: false }, // [pendiente] confirmar si registra y si elimina
  ADMIN:       { etiqueta: 'Administración global',  alcance: 'todos',   registrar: true,  editar: true,  eliminar: true,  catalogos: true  },
  VIEWER:      { etiqueta: 'Consulta',               alcance: 'todos',   registrar: false, editar: false, eliminar: false, catalogos: false }
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
