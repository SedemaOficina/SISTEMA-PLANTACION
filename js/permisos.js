/* REGLAS DE PERFIL: fuente única de qué puede hacer cada perfil.
   En Fase 2 estas reglas se imponen en el servidor (Norma 7.1); la pantalla sólo las refleja.
   Aquí viven una sola vez para que la pantalla no las repita. */
window.SRP = window.SRP || {};

SRP.PERFILES = {
  CABO:        { etiqueta: 'Cabo',                   alcance: 'propios', registrar: true,  editar: true,  eliminar: true,  catalogos: false, usuarios: false,
                 descripcion: 'Registra plantaciones y ve, edita y elimina únicamente las suyas.' },
  COORDINADOR: { etiqueta: 'Coordinador',            alcance: 'equipo',  registrar: true,  editar: true,  eliminar: false, catalogos: false, usuarios: false, // registra sí, elimina no (D87)
                 descripcion: 'Registra, y ve y edita los registros de los cabos que tiene asignados. No elimina.' },
  // No captura: administra. Quien registra en campo es el cabo, y el registro debe quedar
  // a nombre de quien plantó el árbol, no de quien administra el sistema.
  ADMIN:       { etiqueta: 'Administración global',  alcance: 'todos',   registrar: false, editar: true,  eliminar: true,  catalogos: true,  usuarios: true,
                 descripcion: 'Ve, edita y elimina todo, y administra los catálogos y las cuentas. No captura registros.' }
  // Hubo un cuarto perfil, Consulta (VIEWER): se retiró en D87 por no tener uso. Los tableros de
  // consulta los da el SIA sobre la copia publicada (D38), no esta aplicación.
};

// Lo que recibe una cuenta cuyo perfil no existe: nada. Nunca un perfil real por omisión.
SRP.SIN_PERMISOS = { etiqueta: 'Perfil no reconocido', alcance: 'ninguno', registrar: false, editar: false,
                     eliminar: false, catalogos: false, usuarios: false,
                     descripcion: 'La cuenta tiene un perfil que el sistema no reconoce. Pida a Administración que lo corrija.' };

SRP.permisos = {
  /* Un perfil que no está en el catálogo se queda sin permisos, y nunca en silencio: antes, una
     cuenta con un perfil viejo caía en «Consulta» sin que nada lo dijera, y costó ver por qué. */
  de(usuario) {
    const p = SRP.PERFILES[usuario.perfil];
    if (p) return p;
    SRP.permisos.perfilesDesconocidos.add(usuario.perfil);
    return SRP.SIN_PERMISOS;
  },

  perfilesDesconocidos: new Set(),

  // ¿El registro está dentro del alcance del usuario?
  alcanza(usuario, registro, usuariosPorId) {
    const alcance = this.de(usuario).alcance;
    if (alcance === 'ninguno') return false;
    if (alcance === 'todos') return true;
    if (registro.cabo_id === usuario.id) return true;
    if (alcance === 'equipo') {
      const autor = usuariosPorId[registro.cabo_id];
      return !!autor && autor.coordinador_id === usuario.id;
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
