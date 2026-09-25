/* REGLAS DE PERFIL: fuente única de qué puede hacer cada perfil.
   En Fase 2 estas reglas se imponen en el servidor (Norma 7.1); la pantalla sólo las refleja.
   Aquí viven una sola vez para que la pantalla no las repita. */
window.SRP = window.SRP || {};

SRP.PERFILES = {
  // eliminarJornadaVacia: una jornada sin ningún árbol, ni eliminado, se puede borrar (D132, D151)
  CABO:        { etiqueta: 'Cabo',                   alcance: 'propios', registrar: true,  editar: true,  eliminar: true,  eliminarJornadaVacia: true, catalogos: false, usuarios: false, galeria: false,
                 descripcion: 'Registra plantaciones y ve, edita y elimina únicamente las suyas.' },
  // Registra sí, elimina registros no (D87); ve la galería (D118); elimina jornadas vacías de su cuadrilla (D151)
  COORDINADOR: { etiqueta: 'Coordinador',            alcance: 'equipo',  registrar: true,  editar: true,  eliminar: false, eliminarJornadaVacia: true, catalogos: false, usuarios: false, galeria: true,
                 descripcion: 'Registra, y ve y edita los registros de los cabos que tiene asignados. No elimina registros; sí las jornadas vacías.' },
  // No captura: administra. Quien registra en campo es el cabo, y el registro debe quedar
  // a nombre de quien plantó el árbol, no de quien administra el sistema.
  ADMIN:       { etiqueta: 'Administración global',  alcance: 'todos',   registrar: false, editar: true,  eliminar: true,  eliminarJornadaVacia: true, catalogos: true,  usuarios: true,  galeria: true,
                 descripcion: 'Ve, edita y elimina todo, y administra los catálogos y las cuentas. No captura registros.' }
  // Hubo un cuarto perfil, Consulta (VIEWER): se retiró en D87 por no tener uso. Los tableros de
  // consulta los da el SIA sobre la copia publicada (D38), no esta aplicación.
};

// Lo que recibe una cuenta cuyo perfil no existe: nada. Nunca un perfil real por omisión.
SRP.SIN_PERMISOS = { etiqueta: 'Perfil no reconocido', alcance: 'ninguno', registrar: false, editar: false, galeria: false,
                     eliminar: false, eliminarJornadaVacia: false, catalogos: false, usuarios: false,
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
  },

  /* LO QUE EXIGE CADA ACCIÓN (D151), en un solo lugar. Las funciones que escriben lo consultan al
     empezar con exigir(), y se detienen con aviso si no alcanza: esconder el botón no basta, porque
     la función se puede llamar igual. En la Etapa 1 no es una frontera real —cada quien controla su
     teléfono—, pero es la lista exacta de lo que el servidor impondrá en la Fase 2 (esquema.json,
     reglas de Fase 2). `objeto` es el registro, la jornada o nada. */
  ACCIONES: {
    'registro.crear':       { texto: 'registrar árboles',                 regla: (p) => p.registrar },
    'registro.editar':      { texto: 'editar este registro',              regla: (p, u, r) => p.editar && SRP.permisos.alcanza(u, r, SRP.ref.usuarioPorId) },
    'registro.eliminar':    { texto: 'eliminar este registro',            regla: (p, u, r) => p.eliminar && SRP.permisos.alcanza(u, r, SRP.ref.usuarioPorId) },
    'registro.restaurar':   { texto: 'restaurar este registro',           regla: (p, u, r) => p.eliminar && SRP.permisos.alcanza(u, r, SRP.ref.usuarioPorId) },
    'registro.mover':       { texto: 'mover este registro de jornada',    regla: (p, u, r) => p.editar && SRP.permisos.alcanza(u, r, SRP.ref.usuarioPorId) },
    'jornada.crear':        { texto: 'iniciar jornadas',                  regla: (p) => p.registrar },
    // Editar, cerrar, reabrir, revisar sus puntos y llenar el cierre del reporte (D132, D133)
    'jornada.editar':       { texto: 'modificar esta jornada',            regla: (p, u, j) => p.editar && SRP.permisos.alcanza(u, j, SRP.ref.usuarioPorId) },
    'jornada.eliminar':     { texto: 'eliminar esta jornada',             regla: (p, u, j) => p.eliminarJornadaVacia && SRP.permisos.alcanza(u, j, SRP.ref.usuarioPorId) },
    'catalogo.administrar': { texto: 'administrar los catálogos',         regla: (p) => p.catalogos },
    'usuario.administrar':  { texto: 'administrar las cuentas',           regla: (p) => p.usuarios },
    'galeria.descargar':    { texto: 'descargar las fotografías',         regla: (p) => p.galeria }
  },

  // ¿Puede quien tiene la sesión hacer la acción? Sin aviso: para decidir qué botones se enseñan
  puede(accion, objeto) {
    const u = SRP.sesion.usuario, a = this.ACCIONES[accion];
    if (!u || !a) return false;
    return !!a.regla(this.de(u), u, objeto || {});
  },

  // Igual, pero si no puede lo dice y la acción se detiene
  exigir(accion, objeto) {
    if (this.puede(accion, objeto)) return true;
    const a = this.ACCIONES[accion];
    SRP.util.anunciar('No tiene permiso para ' + (a ? a.texto : 'hacer esto') + '.', 'alerta');
    return false;
  }
};
