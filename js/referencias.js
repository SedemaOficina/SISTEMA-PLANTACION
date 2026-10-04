/* REFERENCIAS EN MEMORIA: catálogos y usuarios leídos del almacén.
   Los registros guardan sólo identificadores; los nombres se leen de aquí (fuente única). */
window.SRP = window.SRP || {};

SRP.ref = {
  catalogos: [], usuarios: [], catalogoPorId: {}, usuarioPorId: {},

  async recargar() {
    this.catalogos = await SRP.almacen.catalogos();   // los seis, cada renglón con su `tipo`
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
    // «catalogos» son las seis tablas de catálogo: se cuentan como una familia, igual que en pantalla
    const C = SRP.almacen.TABLAS_CATALOGO, destinos = tabla === 'catalogos' ? C : [tabla];
    for (const [tablaOrigen, campos] of Object.entries(SRP.ESQUEMA.tablas)) {
      if (tablaOrigen === 'bitacora') continue;
      const origen = C.includes(tablaOrigen) ? 'catalogos' : tablaOrigen;
      const refs = campos.filter(c => destinos.includes(c[4])).map(c => c[0]);
      if (!refs.length) continue;
      for (const fila of await SRP.almacen.todos(tablaOrigen)) {
        const ids = new Set();
        refs.forEach(k => [].concat(fila[k] == null ? [] : fila[k]).forEach(v => ids.add(v)));
        if (tablaOrigen === tabla) ids.delete(fila.id);   // quien se nombra a sí mismo (editó su cuenta) no se usa
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

  /* INSTITUCIONES (catálogo `organizacion`). Cada cuenta pertenece a una; la de la Secretaría es
     SRP.CONFIG.ORGANIZACION_SEDEMA. Las demás —alcaldías, PAOT, SOBSE, empresas, organizaciones
     civiles— son «de fuera»: sus cuentas son cabos o coordinadores de la misma institución, sin
     área, sin Administración global y sin vehículo. */
  TIPOS_INSTITUCION: ['Alcaldía', 'Gobierno de la CDMX', 'Empresa privada', 'Organización civil'],
  organizacionDe(usuario) { return usuario ? this.catalogoPorId[usuario.organizacion_id] || null : null; },
  esSedema(organizacionId) { return organizacionId === SRP.CONFIG.ORGANIZACION_SEDEMA; },
  // Las alcaldías se guardan sin la palabra, que la da su tipo: «Alcaldía Iztapalapa» en todo lo demás
  nombreOrganizacion(id) {
    const o = this.catalogoPorId[id];
    if (!o) return 'Sin institución';
    return o.tipo_organizacion === 'Alcaldía' ? 'Alcaldía ' + o.nombre : o.nombre;
  },

  /* SOLICITANTES (catálogo `solicitante`). Quién solicita una jornada: alcaldías, dependencias,
     diputadas y diputados, empresas, vecinos. No es la institución que ejecuta ni da acceso a nada:
     sólo se elige al iniciar o editar una jornada. Los tipos agrupan la lista y los informes. */
  TIPOS_SOLICITANTE: ['Dependencia de gobierno', 'Alcaldía', 'Congreso', 'Empresa', 'Organización civil', 'Escuela', 'Vecinos'],
  nombreSolicitante(id) { const s = this.catalogoPorId[id]; return s ? s.nombre : 'Sin dato'; },
  // Por tipo, en el orden de los tipos, y por nombre dentro de cada uno; la Oficina de la Secretaría, la primera
  SOLICITANTE_PRIMERO: 's-oficina-secretaria',
  ordenSolicitantes(a, b) {
    const n = s => { const i = SRP.ref.TIPOS_SOLICITANTE.indexOf(s.tipo_solicitante); return i < 0 ? 99 : i; };
    const primero = s => s.id === SRP.ref.SOLICITANTE_PRIMERO ? 0 : 1;
    return n(a) - n(b) || primero(a) - primero(b) || a.nombre.localeCompare(b.nombre, 'es');
  },

  /* Los programas activos que puede elegir una institución al iniciar o editar una jornada, Reforestación
     Urbana primero: la Secretaría, todos; las demás, los que tienen marcado su tipo en el catálogo
     (`tipos_organizacion`). `incluir`: el que ya tiene la jornada, aunque esté inactivo o fuera de la
     lista, para no perderlo al editar. */
  programasPara(organizacionId, incluir) {
    const o = this.catalogoPorId[organizacionId || SRP.CONFIG.ORGANIZACION_SEDEMA];
    const tipo = o && !this.esSedema(o.id) ? o.tipo_organizacion : null;
    const lista = this.deTipo('programa', true).filter(p => !tipo || (p.tipos_organizacion || []).includes(tipo))
      // Reforestación Urbana primero, por ser el más usado; «Solicitud» al final, por ser la excepción
      .sort((a, b) => (b.clave === 'REFOR_URBANA') - (a.clave === 'REFOR_URBANA') || (a.id === SRP.CONFIG.PROGRAMA_SOLICITUD) - (b.id === SRP.CONFIG.PROGRAMA_SOLICITUD));
    if (incluir && !lista.find(p => p.id === incluir) && this.catalogoPorId[incluir]) lista.push(this.catalogoPorId[incluir]);
    return lista;
  },

  // Quién puede usar un programa, para leerlo: «SEDEMA · Alcaldía · Organización civil» o «Sólo SEDEMA»
  textoUsoPrograma(p) {
    const tipos = this.TIPOS_INSTITUCION.filter(t => (p.tipos_organizacion || []).includes(t));
    return tipos.length ? ['SEDEMA'].concat(tipos).join(' · ') : 'Sólo SEDEMA';
  },

  // ¿Pueden entrar las cuentas de la institución? No si está desactivada: así se corta su acceso
  accesoOrganizacion(o) {
    if (!o) return { ok: false, motivo: 'La cuenta no tiene institución asignada. Pida a la Administración del sistema que la corrija.' };
    if (!o.activo) return { ok: false, motivo: 'La institución «' + this.nombreOrganizacion(o.id) + '» está desactivada: sus cuentas no pueden entrar. Consulte con la Administración del sistema.' };
    return { ok: true };
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
  // «Robo», «Otro: lo atropelló una grúa»; vacío si el árbol no es sustituto
  motivoSustitucion(r) {
    if (!r || !r.motivo_sustitucion) return '';
    const m = (SRP.CONFIG.MOTIVOS_SUSTITUCION.find(x => x[0] === r.motivo_sustitucion) || [null, r.motivo_sustitucion])[1];
    return r.motivo_sustitucion === 'OTRO' && r.motivo_sustitucion_otro ? m + ': ' + r.motivo_sustitucion_otro : m;
  },
  /* DÓNDE, EN UN SOLO FORMATO (M15): «Alcaldía Coyoacán · Col. Del Carmen». Antes la franja decía
     «colonia, Alcaldía X» y la lista de jornadas «X · Col. colonia». `alcaldias`: una o varias. */
  lugar(alcaldias, colonia) {
    const a = [].concat(alcaldias || []).filter(Boolean);
    return [a.length ? (a.length === 1 ? 'Alcaldía ' : 'Alcaldías ') + a.join(', ') : '', colonia ? 'Col. ' + colonia : ''].filter(Boolean).join(' · ');
  },
  colonia(valor) { return valor || 'Sin colonia en la capa'; },

  /* Con qué capas se derivó el territorio, para el detalle y el PDF (D152): «Alcaldías
     sia-2026-01-01 · UGA sia-2026-09-22 · Colonias iecm-2022». La versión lleva la fecha de corte;
     si alguna capa es de prueba (su versión lo dice), se aclara. */
  textoCapas(capaVersion) {
    if (!capaVersion) return 'Sin derivar (territorio pendiente)';
    const nombres = { alcaldias: 'Alcaldías', uga: 'UGA', colonias: 'Colonias' };
    return capaVersion.split(';').map(par => {
      const [k, v] = par.split('=');
      return (nombres[k] || k) + ' ' + (v || '') + (/prueba/.test(v || '') ? ' (capa de prueba)' : '');
    }).join(' · ');
  },
};
