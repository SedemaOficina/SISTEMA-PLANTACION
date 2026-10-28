/* REGLAS DE PERFIL: fuente única de qué puede hacer cada perfil.
   El servidor impone estas mismas reglas (Norma 7.1); la pantalla sólo las refleja.
   Aquí viven una sola vez para que la pantalla no las repita. */
window.SRP = window.SRP || {};

SRP.PERFILES = {
  // eliminarJornadaVacia: una jornada sin ningún árbol, ni eliminado, se puede borrar
  CABO:        { etiqueta: 'Cabo',                   alcance: 'propios', registrar: true,  editar: true,  eliminar: true,  eliminarJornadaVacia: true, relevar: false, catalogos: false, usuarios: false, galeria: true,
                 descripcion: 'Registra plantaciones y ve, edita y elimina únicamente las suyas; descarga sus fotografías.' },
  // Registra, edita y elimina lo de su institución: un árbol capturado por error se corrige sin
  // esperar a Administración; ve la galería y abre jornadas compartidas
  COORDINADOR: { etiqueta: 'Coordinador',            alcance: 'institucion',  registrar: true,  editar: true,  eliminar: true,  eliminarJornadaVacia: true, relevar: true,  catalogos: false, usuarios: false, galeria: true,
                 descripcion: 'Registra, y ve, edita y elimina los registros de todos los cabos de su institución y los suyos. Elimina también las jornadas vacías, pasa una jornada abierta a otro cabo (relevo) y abre jornadas compartidas.' },
  /* Sólo ve: subdirecciones, direcciones de área y direcciones generales. El de la Secretaría ve toda
     la Ciudad; el de otra institución, sólo la suya (alcance «institucion», lo pone `de()`). No
     registra, no corrige y no genera reportes: descarga los que ya se generaron. */
  DIRECTIVO:   { etiqueta: 'Directivo',              alcance: 'todos',   registrar: false, editar: false, eliminar: false, eliminarJornadaVacia: false, relevar: false, catalogos: false, usuarios: false, galeria: true,
                 descripcion: 'Ve las jornadas, los registros, las fotografías y el avance, y descarga los reportes ya generados. No registra ni modifica. En la Secretaría ve toda la Ciudad; en otra institución, sólo la suya.' },
  // No captura: administra. Quien registra en campo es el cabo, y el registro debe quedar
  // a nombre de quien plantó el árbol, no de quien administra el sistema.
  ADMIN:       { etiqueta: 'Administración global',  alcance: 'todos',   registrar: false, editar: true,  eliminar: true,  eliminarJornadaVacia: true, relevar: false, catalogos: true,  usuarios: true,  galeria: true,
                 descripcion: 'Ve, edita y elimina todo, y administra los catálogos y las cuentas. No captura registros.' }
  // No hay perfil de sólo consulta: los tableros de consulta los da el SIA sobre la copia
  // publicada, no esta aplicación.
};

// Lo que recibe una cuenta cuyo perfil no existe: nada. Nunca un perfil real por omisión.
SRP.SIN_PERMISOS = { etiqueta: 'Perfil no reconocido', alcance: 'ninguno', registrar: false, editar: false, galeria: false,
                     eliminar: false, eliminarJornadaVacia: false, relevar: false, catalogos: false, usuarios: false,
                     descripcion: 'La cuenta tiene un perfil que el sistema no reconoce. Pida a Administración que lo corrija.' };

SRP.permisos = {
  /* Un perfil que no está en el catálogo se queda sin permisos, y nunca en silencio: una cuenta
     con un perfil que no existe no debe caer en otro perfil sin que nada lo diga. */
  de(usuario) {
    const p = SRP.PERFILES[usuario.perfil];
    // El directivo de una institución que no es la Secretaría ve sólo lo de la suya
    if (p && usuario.perfil === 'DIRECTIVO' && !SRP.ref.esSedema(usuario.organizacion_id)) {
      return SRP.permisos._directivoExterno || (SRP.permisos._directivoExterno = Object.assign({}, p, { alcance: 'institucion' }));
    }
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
    const personas = this.personasDe(registro);
    /* De la institución: la jornada dice la suya; el árbol, la de quien lo capturó */
    if (alcance === 'institucion') {
      if (registro.organizacion_id) return registro.organizacion_id === usuario.organizacion_id;
      return personas.some(id => { const autor = usuariosPorId[id]; return !!autor && autor.organizacion_id === usuario.organizacion_id; });
    }
    return personas.includes(usuario.id);
  },

  /* Quién responde de un registro: el cabo que capturó el árbol. En una jornada, su titular, los cabos
     que la recibieron en relevo, aunque después la hayan devuelto, y sus cabos de apoyo, también los que ya
     terminaron o se quitaron. */
  personasDe(x) {
    return [x.cabo_id, x.relevo_id].concat((x.relevos || []).map(r => r.cabo_id), (x.cabos_apoyo || []).map(a => a.cabo_id)).filter(Boolean);
  },

  // Un cabo de apoyo vigente de la jornada: no ha terminado su parte ni lo quitaron
  apoyoVigente(j, id) { return (j.cabos_apoyo || []).some(a => a.cabo_id === id && !a.hasta); },

  // Los cabos de apoyo vigentes de la jornada, en el orden en que entraron
  vigentes(j) { return (j.cabos_apoyo || []).filter(a => !a.hasta).map(a => a.cabo_id); },

  /* Estuvo en la jornada como cabo de apoyo sin ser su titular: la ve con todos sus árboles, pero no cambia sus datos,
     no la cierra ni la elimina, aunque también haya estado en un relevo */
  soloDeApoyo(j, id) { return (j.cabos_apoyo || []).some(a => a.cabo_id === id) && j.cabo_id !== id; },

  // Es compartida: tiene o tuvo cabos de apoyo
  compartida(j) { return (j.cabos_apoyo || []).length > 0; },

  puedeEditar(usuario, registro, usuariosPorId) {
    return this.de(usuario).editar && this.alcanza(usuario, registro, usuariosPorId);
  },

  puedeEliminar(usuario, registro, usuariosPorId) {
    return this.de(usuario).eliminar && this.alcanza(usuario, registro, usuariosPorId);
  },

  /* LO QUE EXIGE CADA ACCIÓN, en un solo lugar. Las funciones que escriben lo consultan al
     empezar con exigir(), y se detienen con aviso si no alcanza: esconder el botón no basta, porque
     la función se puede llamar igual. En el teléfono no es una frontera real —cada quien controla su
     teléfono—, pero es la lista exacta de lo que impone el servidor (datos/esquema.json, reglas del
     servidor). `objeto` es el registro, la jornada o nada. */
  ACCIONES: {
    'registro.crear':       { texto: 'registrar árboles',                 regla: (p) => p.registrar },
    'registro.editar':      { texto: 'editar este registro',              regla: (p, u, r) => p.editar && SRP.permisos.alcanza(u, r, SRP.ref.usuarioPorId) },
    'registro.eliminar':    { texto: 'eliminar este registro',            regla: (p, u, r) => SRP.permisos.puedeEliminar(u, r, SRP.ref.usuarioPorId) },
    'registro.restaurar':   { texto: 'restaurar este registro',           regla: (p, u, r) => SRP.permisos.puedeEliminar(u, r, SRP.ref.usuarioPorId) },
    // Sustituir un árbol perdido: quien registra, sobre un árbol activo de su alcance que no tenga ya sustituto
    'registro.sustituir':   { texto: 'sustituir este árbol',              regla: (p, u, r) => p.registrar && r.estatus === 'activo' && !r.sustituido_por_id && SRP.permisos.alcanza(u, r, SRP.ref.usuarioPorId) },
    'registro.mover':       { texto: 'mover este registro de jornada',    regla: (p, u, r) => p.editar && SRP.permisos.alcanza(u, r, SRP.ref.usuarioPorId) },
    'jornada.crear':        { texto: 'iniciar jornadas',                  regla: (p) => p.registrar },
    // Editar, cerrar, reabrir, revisar sus puntos y llenar el cierre del reporte
    'jornada.editar':       { texto: 'modificar esta jornada',            regla: (p, u, j) => p.editar && SRP.permisos.alcanza(u, j, SRP.ref.usuarioPorId) && !SRP.permisos.soloDeApoyo(j, u.id) },
    // Eliminar, sólo vacía; una compartida, además, sin cabos de apoyo vigentes: pueden tener árboles sin enviar
    'jornada.eliminar':     { texto: 'eliminar esta jornada',             regla: (p, u, j) => p.eliminarJornadaVacia && SRP.permisos.alcanza(u, j, SRP.ref.usuarioPorId) && !SRP.permisos.soloDeApoyo(j, u.id) && !SRP.permisos.vigentes(j).length },
    // Registrar árboles en una jornada abierta: quien la tiene a su cargo, el titular o el cabo del relevo, y sus cabos de apoyo vigentes
    'jornada.registrar':    { texto: 'registrar en esta jornada',         regla: (p, u, j) => p.registrar && j.estatus === 'abierta' && ((j.relevo_id || j.cabo_id) === u.id || SRP.permisos.apoyoVigente(j, u.id)) },
    // Relevo: la coordinación pasa una jornada abierta a otro cabo de la institución de la jornada; el titular no
    // cambia. Una compartida no tiene relevo: la Coordinación agrega o quita cabos de apoyo
    'jornada.relevo':       { texto: 'pasar esta jornada a otro cabo',    regla: (p, u, j) => !!p.relevar && j.estatus === 'abierta' && !SRP.permisos.compartida(j) && SRP.permisos.alcanza(u, j, SRP.ref.usuarioPorId) },
    // Jornada compartida: la Coordinación que la abrió marca a sus cabos de apoyo
    'jornada.compartir':    { texto: 'elegir los cabos de apoyo de esta jornada', regla: (p, u, j) => !!p.relevar && j.estatus === 'abierta' && j.cabo_id === u.id },
    // «Terminar mi parte»: el cabo de apoyo vigente. También con la jornada ya cerrada: si el cierre llegó primero, el
    // cabo no se queda vigente en una jornada cerrada
    'jornada.terminar':     { texto: 'terminar su parte en esta jornada', regla: (p, u, j) => p.registrar && SRP.permisos.apoyoVigente(j, u.id) },
    'catalogo.administrar': { texto: 'administrar los catálogos',         regla: (p) => p.catalogos },
    'usuario.administrar':  { texto: 'administrar las cuentas',           regla: (p) => p.usuarios },
    'carga.masiva':         { texto: 'cargar árboles en bloque',          regla: (p) => p.usuarios && p.catalogos },
    'galeria.descargar':    { texto: 'descargar las fotografías',         regla: (p) => p.galeria },
    // La bandeja de posibles duplicados entre instituciones la atiende la Administración global
    'duplicado.revisar':    { texto: 'revisar los posibles duplicados',   regla: (p) => p.usuarios && p.catalogos }
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
