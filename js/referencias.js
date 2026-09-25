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

  /* QUIÉN USA CADA VALOR (D151). Por id de la tabla pedida, cuántos renglones de cada tabla lo
     nombran, leído de las relaciones del esquema (SRP.ESQUEMA): cuentas, catálogos y jornadas se
     cuentan igual en todas las pantallas. Entran los árboles eliminados, que siguen en el historial
     y se pueden restaurar. La bitácora no cuenta: es la constancia, y guarda el nombre de quien
     actuó. Antes cada pantalla contaba sólo árboles, y se eliminaron un programa que usaban tres
     jornadas y un coordinador con cabos asignados. Devuelve { id: { tabla: n } }. */
  async usosDe(tabla) {
    const usos = {};
    for (const [origen, campos] of Object.entries(SRP.ESQUEMA.tablas)) {
      if (origen === 'bitacora') continue;
      const refs = campos.filter(c => c[4] === tabla).map(c => c[0]);
      if (!refs.length) continue;
      for (const fila of await SRP.almacen.todos(origen)) {
        const ids = new Set();
        refs.forEach(k => [].concat(fila[k] == null ? [] : fila[k]).forEach(v => ids.add(v)));
        if (origen === tabla) ids.delete(fila.id);   // quien se nombra a sí mismo (editó su cuenta) no se usa
        ids.forEach(v => { const u = usos[v] = usos[v] || {}; u[origen] = (u[origen] || 0) + 1; });
      }
    }
    return usos;
  },

  NOMBRES_TABLA: { plantaciones: ['árbol', 'árboles'], jornadas: ['jornada', 'jornadas'], usuarios: ['cuenta', 'cuentas'], catalogos: ['catálogo', 'catálogos'] },

  totalUsos(u) { return u ? Object.values(u).reduce((a, b) => a + b, 0) : 0; },

  // «12 árboles, 3 jornadas y 1 cuenta»; '' si nada lo usa
  textoUsos(u) {
    const partes = Object.keys(this.NOMBRES_TABLA).filter(t => u && u[t]).map(t => u[t] + ' ' + this.NOMBRES_TABLA[t][u[t] === 1 ? 0 : 1]);
    return partes.length > 1 ? partes.slice(0, -1).join(', ') + ' y ' + partes[partes.length - 1] : (partes[0] || '');
  },

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
      return { comun: e ? e.nombre : '', cientifico: e ? e.nombre_cientifico : '', distribucion: e ? e.tipo_distribucion || '' : '' };
    }
    return { comun: registro.especie_otra || '', cientifico: 'Otra especie, fuera del catálogo', distribucion: '' };
  },

  /* Dos ausencias que no son la misma (D62, D152). Sin alcaldía, el territorio no se pudo derivar
     —con las capas completas no pasa: el arranque las exige y un punto junto al límite toma la
     alcaldía más cercana—; queda pendiente de volver a derivar y no recibe folio. Sin colonia, el
     punto cae donde la capa de colonias no tiene polígono: casi siempre suelo de conservación, pero
     también 31 km² urbanos, así que no se afirma que sea zona no urbana. */
  alcaldia(valor) { return valor || 'Sin alcaldía (territorio pendiente)'; },
  /* DÓNDE, EN UN SOLO FORMATO (M15): «Alcaldía Coyoacán · Col. Del Carmen». Antes la franja decía
     «colonia, Alcaldía X» y la lista de jornadas «X · Col. colonia». `alcaldias`: una o varias. */
  lugar(alcaldias, colonia) {
    const a = [].concat(alcaldias || []).filter(Boolean);
    return [a.length ? (a.length === 1 ? 'Alcaldía ' : 'Alcaldías ') + a.join(', ') : '', colonia ? 'Col. ' + colonia : ''].filter(Boolean).join(' · ');
  },
  colonia(valor) { return valor || 'Sin colonia en la capa'; },

  /* Con qué capas se derivó el territorio, para el detalle y el PDF (D152): «Alcaldías
     sia-2026-01-01 · UGA sia-2026-09-22 · Colonias iecm-2022-prueba (capa de prueba)». La versión
     lleva la fecha de corte; la capa de prueba se dice. */
  textoCapas(capaVersion) {
    if (!capaVersion) return 'Sin derivar (territorio pendiente)';
    const nombres = { alcaldias: 'Alcaldías', uga: 'UGA', colonias: 'Colonias' };
    return capaVersion.split(';').map(par => {
      const [k, v] = par.split('=');
      return (nombres[k] || k) + ' ' + (v || '') + (/prueba/.test(v || '') ? ' (capa de prueba)' : '');
    }).join(' · ');
  },
};
