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

  /* Búsqueda de especie con un solo criterio en toda la app: nombre común, científico, género y
     otros nombres comunes del catálogo (D84). `q` ya viene normalizado. Devuelve el otro nombre
     por el que coincidió, para decirlo en la lista, o '' si coincidió por nombre o científico. */
  especieCoincide(e, q) {
    const n = SRP.util.normalizar;
    if (n(e.nombre).includes(q) || n(e.nombre_cientifico || '').includes(q)) return true;
    const otro = (e.otros_nombres_comunes || '').split(',').map(t => t.trim()).find(t => t && n(t).includes(q));
    return otro || false;
  },

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

  /* Dos ausencias que no son la misma. Sin alcaldía, el punto cayó en un hueco entre los
     polígonos de la capa (la definitiva no tiene; la regla queda por si una entrega los trae) y se dice. Sin colonia, el punto está
     fuera de la zona urbana que la capa cubre —suelo de conservación, casi siempre—: no es un
     defecto del punto ni de la capa, y no debe leerse como tal (D62). */
  alcaldia(valor) { return valor || 'Sin alcaldía: el punto cae entre los polígonos de la capa'; },
  colonia(valor) { return valor || 'Sin colonia (fuera de zona urbana)'; },
};
