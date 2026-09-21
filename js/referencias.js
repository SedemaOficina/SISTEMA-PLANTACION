/* REFERENCIAS EN MEMORIA: catálogos y usuarios leídos del almacén.
   Los registros guardan sólo identificadores; los nombres se leen de aquí (fuente única). */
window.SRP = window.SRP || {};

SRP.ref = {
  catalogos: [], usuarios: [], catalogoPorId: {}, usuarioPorId: {},

  async recargar() {
    this.catalogos = await SRP.almacen.todos('catalogos');
    this.usuarios = await SRP.almacen.todos('usuarios');
    this.catalogoPorId = Object.fromEntries(this.catalogos.map(c => [c.id, c]));
    this.usuarioPorId = Object.fromEntries(this.usuarios.map(u => [u.id, u]));
  },

  deTipo(tipo, soloActivos) {
    return this.catalogos
      .filter(c => c.tipo === tipo && (!soloActivos || c.activo))
      .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
  },

  nombreCatalogo(id) { const c = this.catalogoPorId[id]; return c ? c.nombre : ''; },

  // Una especie se nombra igual en todas partes: común y científico, como viene en el catálogo
  textoEspecie(id) {
    const e = this.catalogoPorId[id];
    if (!e) return '';
    return e.nombre_cientifico ? e.nombre + ' (' + e.nombre_cientifico + ')' : e.nombre;
  },

  nombreUsuario(id) { return SRP.util.nombreCompleto(this.usuarioPorId[id]) || 'Usuario no identificado'; },

  // Nombre de especie para mostrar: catálogo o texto libre de "Otra especie"
  especieDe(registro) {
    if (registro.especie_id) {
      const e = this.catalogoPorId[registro.especie_id];
      return { comun: e ? e.nombre : '', cientifico: e ? e.nombre_cientifico : '' };
    }
    return { comun: registro.especie_otra || '', cientifico: 'Otra especie, fuera del catálogo' };
  },

  territorio(valor) { return valor || 'Fuera de las capas'; }
};
