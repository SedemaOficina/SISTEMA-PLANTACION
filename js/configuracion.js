/* CONFIGURACIÓN (sólo Administración global). Una pantalla con una tarjeta por apartado: Usuarios
   y Catálogos, que son sus propias vistas; Parámetros, sólo para consulta; Registro de cambios,
   lo que la bitácora dice de cuentas y catálogos; y Acerca del sistema. Cada apartado vuelve aquí
   con «Configuración», arriba a la izquierda. */
window.SRP = window.SRP || {};

SRP.configuracion = {
  VISTAS: ['configuracion', 'usuarios', 'catalogos', 'parametros', 'cambios', 'carga', 'acerca'],
  pagina: 1,

  el(id) { return document.getElementById(id); },

  iniciar() {
    document.querySelectorAll('#cfg-tarjetas .cfg-icono').forEach(i => SRP.ICONOS.poner(i, i.dataset.icono, 'grande'));
    this.el('cfg-tarjetas').addEventListener('click', (e) => {
      const t = e.target.closest('.cfg-tarjeta'); if (t) SRP.app.mostrarVista(t.dataset.ir);
    });
    document.querySelectorAll('[data-volver-configuracion]').forEach(b => b.addEventListener('click', () => SRP.app.mostrarVista('configuracion')));
    ['cmb-sobre', 'cmb-quien'].forEach(id => this.el(id).addEventListener('change', () => { this.pagina = 1; this.pintarCambios(); }));
  },

  /* ---------- Tarjetas ---------- */

  async preparar() {
    const num = n => n.toLocaleString('es-MX');
    const pl = (n, uno, varios) => num(n) + ' ' + (n === 1 ? uno : varios);
    const us = SRP.ref.usuarios, inactivas = us.filter(u => !u.activo).length;
    const activos = t => SRP.ref.deTipo(t, true).length;
    const todos = await this.cambios();
    const cambios = todos.length, cargas = todos.filter(b => b.entidad === 'carga' && b.accion === 'CREADO').length;
    const resumen = {
      usuarios: pl(us.length, 'cuenta', 'cuentas') + (inactivas ? ' · ' + pl(inactivas, 'inactiva', 'inactivas') : ''),
      catalogos: pl(activos('programa'), 'programa', 'programas') + ' · ' + pl(activos('organizacion'), 'institución', 'instituciones') + ' · ' + pl(activos('especie'), 'especie', 'especies'),
      parametros: pl(this.parametros().reduce((s, g) => s + g.filas.length, 0), 'valor', 'valores') + ' · sólo consulta',
      cambios: cambios ? pl(cambios, 'cambio registrado', 'cambios registrados') : 'Sin cambios todavía',
      carga: cargas ? pl(cargas, 'carga hecha', 'cargas hechas') : 'Plantilla, revisión y carga',
      acerca: 'Versión ' + SRP.CONFIG.VERSION
    };
    document.querySelectorAll('#cfg-tarjetas [data-resumen]').forEach(s => { s.textContent = resumen[s.dataset.resumen] || ''; });
  },

  /* ---------- Parámetros ---------- */

  /* Los valores salen de SRP.CONFIG, no se copian: lo que se lee aquí es lo que el sistema usa */
  parametros() {
    const C = SRP.CONFIG, M = C.MAPA;
    const m = n => n.toLocaleString('es-MX') + ' m';
    return [
      { titulo: 'Revisión de jornadas', filas: [
        ['Puntos duplicados', m(C.JORNADA.DUPLICADO_M), 'Dos árboles de la misma jornada a menos de esta distancia se marcan para revisar: puede ser el mismo árbol registrado dos veces.'],
        ['Punto lejos de la jornada', m(C.JORNADA.FUERA_M), 'Un árbol más lejos que esto del árbol más cercano de su jornada se marca para revisar.'],
        ['Sitios separados', m(C.JORNADA.SEPARAR_M), 'Árboles de una jornada a más de esta distancia entre sí se muestran como sitios distintos.']
      ] },
      { titulo: 'Ubicación y GPS', filas: [
        ['Precisión buena', 'Hasta ±' + m(M.PRECISION_BUENA_M), 'El punto cae en la misma banqueta. Se muestra en verde.'],
        ['Precisión aceptable', 'Hasta ±' + m(M.PRECISION_ACEPTABLE_M), 'Sirve si se revisa en el mapa. Se muestra en ámbar; más allá, en rojo. No impide guardar.'],
        ['Margen del límite de la Ciudad', m(M.MARGEN_AMBITO_M), 'Un punto plantado junto al límite puede caer unos metros afuera: toma la alcaldía más cercana y se avisa.'],
        ['Espera del GPS', (M.GPS_ESPERA_MS / 1000) + ' s', 'Tiempo máximo que se espera una lectura antes de ofrecer ubicar en el mapa o a mano.']
      ] },
      { titulo: 'Envío', filas: [
        ['Hora de atraso', C.HORA_CIERRE_JORNADA + ':00 h', 'Desde esta hora, lo registrado hoy y no enviado se avisa como atraso.'],
        ['Reintento de envío', (C.REINTENTO_ENVIO_MS / 1000) + ' s', 'Mientras haya pendientes, el envío se vuelve a intentar con esta frecuencia.']
      ] },
      { titulo: 'Fotografías y listas', filas: [
        ['Tamaño de la fotografía', C.FOTO.ANCHO_MAX + ' × ' + C.FOTO.ALTO_MAX + ' px', 'Las fotografías se reducen a este tamaño máximo al guardarse, para no llenar el teléfono.'],
        ['Renglones por página', String(C.LISTA_PAGINA), 'Jornadas, Registros y el registro de cambios empiezan con este número; cada lista ofrece ' + SRP.util.enumerar(C.TAMANOS_PAGINA.map(String)) + ' en «Resultados por página», y el teléfono recuerda lo elegido.']
      ] }
    ];
  },

  prepararParametros() {
    const esc = SRP.util.escapar;
    this.el('cfg-parametros').innerHTML = this.parametros().map(g =>
      '<section class="bloque" aria-label="' + esc(g.titulo) + '"><h2>' + esc(g.titulo) + '</h2><dl class="cfg-valores">' +
      g.filas.map(([nombre, valor, que]) => '<div class="cfg-valor"><dt>' + esc(nombre) + '</dt><dd class="cfg-cifra">' + esc(valor) + '</dd><dd class="cfg-que">' + esc(que) + '</dd></div>').join('') +
      '</dl></section>').join('');
  },

  /* ---------- Registro de cambios ---------- */

  // Lo que la bitácora dice de cuentas, catálogos y cargas masivas, lo más reciente primero
  async cambios() {
    return (await SRP.almacen.todos('bitacora')).filter(b => b.entidad === 'usuario' || b.entidad === 'catalogo' || b.entidad === 'carga')
      .sort((a, b) => String(b.fecha).localeCompare(String(a.fecha)));
  },

  async prepararCambios() {
    this.lista = await this.cambios();
    const quien = this.el('cmb-quien'), antes = quien.value;
    const personas = {}; this.lista.forEach(b => { personas[b.usuario_id] = b.usuario_nombre || SRP.ref.nombreUsuario(b.usuario_id); });
    quien.innerHTML = SRP.util.opciones('Todas las personas', Object.keys(personas).sort((a, b) => personas[a].localeCompare(personas[b], 'es')).map(id => [id, personas[id]]));
    quien.value = personas[antes] ? antes : '';
    this.pagina = 1;
    this.pintarCambios();
  },

  ACCION: { CREADO: 'Alta', EDITADO: 'Edición', ACTIVADO: 'Activación', DESACTIVADO: 'Desactivación', ELIMINADO: 'Eliminación' },
  TIPO: { programa: 'del programa', area: 'del área', especie: 'de la especie', vehiculo: 'del vehículo', organizacion: 'de la institución', solicitante: 'del solicitante' },
  // Los campos como se llaman en pantalla
  CAMPO: { nombre_completo: 'nombre completo', organizacion_id: 'institución', area_id: 'área', cargo_rol: 'cargo', perfil: 'perfil de captura',
    coordinadores_ids: 'coordinadores', coordinador_id: 'coordinador', nombre: 'nombre', nombre_cientifico: 'nombre científico', tipo_distribucion: 'distribución',
    otros_nombres_comunes: 'otros nombres comunes', formadecrecimiento: 'forma de crecimiento', id_snib: 'id SNIB', id_enciclovida: 'id EncicloVida',
    modelo: 'modelo', tipo_vehiculo: 'tipo de vehículo', tipo_organizacion: 'tipo de institución', tipo_solicitante: 'tipo de solicitante', tipos_organizacion: 'quién puede usarlo' },

  // «Alta de la cuenta Irma Palmera Ejemplo (Green Cover)», «Edición del programa Palmeras»
  describir(b) {
    const esc = SRP.util.escapar;
    // Una carga masiva: el detalle ya dice archivo, árboles, jornadas e instituciones
    if (b.entidad === 'carga') return '<span class="cmb-que"><b>' + (b.accion === 'ELIMINADO' ? 'Carga masiva deshecha' : 'Carga masiva') + '</b></span><span class="cmb-campos">' + esc(b.detalle || '') + '</span>';
    const accion = this.ACCION[b.accion] || b.accion;
    let sobre, nombre, extra = '';
    if (b.entidad === 'usuario') {
      const u = SRP.ref.usuarioPorId[b.entidad_id];
      sobre = 'de la cuenta';
      nombre = u ? SRP.util.nombreCompleto(u) : (b.accion === 'ELIMINADO' ? b.detalle : 'cuenta eliminada');
      if (u) extra = SRP.ref.esSedema(u.organizacion_id) ? (SRP.ref.nombreCatalogo(u.area_id) || 'SEDEMA') : SRP.ref.nombreOrganizacion(u.organizacion_id);
    } else {
      const c = SRP.ref.catalogoPorId[b.entidad_id];
      const tipo = c ? c.tipo : String(b.detalle || '').split(' ')[0];
      sobre = this.TIPO[tipo] || 'del catálogo';
      nombre = c ? (c.tipo === 'organizacion' ? SRP.ref.nombreOrganizacion(c.id) : c.nombre) : (String(b.detalle || '').split(': ').slice(1).join(': ') || 'elemento eliminado');
    }
    // El detalle que sirve: los campos cambiados en una edición
    const campos = b.accion === 'EDITADO' && /^Campos: /.test(b.detalle || '') ? b.detalle.slice(8).split(', ').filter(k => k && k !== 'ninguno').map(k => this.CAMPO[k] || k) : [];
    return '<span class="cmb-que"><b>' + esc(accion) + '</b> ' + esc(sobre) + ' <b>' + esc(nombre) + '</b>' + (extra ? ' (' + esc(extra) + ')' : '') + '</span>' +
      (campos.length ? '<span class="cmb-campos">Cambió: ' + esc(campos.join(', ')) + '</span>' : '');
  },

  // Día y hora del cambio, los dos en la hora del dispositivo: «30-SEP-2026 · 09:21 p.m.»
  cuando(iso) {
    const d = new Date(iso), dos = n => String(n).padStart(2, '0');
    if (isNaN(d)) return '';
    return SRP.util.formatearFecha(d.getFullYear() + '-' + dos(d.getMonth() + 1) + '-' + dos(d.getDate())) + ' · ' + d.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
  },

  pintarCambios() {
    const esc = SRP.util.escapar;
    const sobre = this.el('cmb-sobre').value, quien = this.el('cmb-quien').value;
    const filtrada = (this.lista || []).filter(b => (!sobre || b.entidad === sobre) && (!quien || b.usuario_id === quien));
    const info = SRP.util.paginar(filtrada, this.pagina, 'cmb-paginas');
    this.pagina = info.pagina;
    const total = (this.lista || []).length;
    this.el('cmb-cuenta').textContent = (filtrada.length !== total ? filtrada.length.toLocaleString('es-MX') + ' de ' : '') + total.toLocaleString('es-MX') + (total === 1 ? ' cambio' : ' cambios');
    this.el('cmb-lista').innerHTML = info.items.map(b => {
      const perfil = SRP.PERFILES[b.perfil] ? SRP.PERFILES[b.perfil].etiqueta : b.perfil;
      return '<li class="cmb-item"><span class="cmb-fecha">' + esc(this.cuando(b.fecha)) + '</span>' +
        this.describir(b) + '<span class="cmb-quien">Por ' + esc(b.usuario_nombre || SRP.ref.nombreUsuario(b.usuario_id)) + (perfil ? ' (' + esc(perfil) + ')' : '') + '</span></li>';
    }).join('');
    const vacio = this.el('cmb-vacio');
    vacio.hidden = filtrada.length > 0;
    if (!vacio.hidden) vacio.innerHTML = '<p class="vacio-titulo">' + (total ? 'Ningún cambio con estos filtros' : 'Todavía no hay cambios') + '</p>' +
      '<p class="vacio-texto">' + (total ? 'Pruebe con otra persona o con «Todo».' : 'Aquí aparecerá cada alta, edición, desactivación o eliminación de cuentas y catálogos, y cada carga masiva.') + '</p>';
    SRP.util.pintarPaginador(this.el('cmb-paginas'), info, 'cambio', 'cambios', (p) => { this.pagina = p; this.pintarCambios(); SRP.util.subirA(this.el('cmb-cuenta')); });
  },

  /* ---------- Acerca del sistema ---------- */

  async prepararAcerca() {
    const esc = SRP.util.escapar, C = SRP.CONFIG;
    const capa = k => { const m = SRP.CAPAS && SRP.CAPAS[k] && SRP.CAPAS[k].meta; return m ? m.version + (m.fecha_corte ? ' (corte ' + (m.fecha_corte.length === 10 ? SRP.util.formatearFecha(m.fecha_corte) : m.fecha_corte) + ')' : '') : 'No cargada'; };
    const pendientes = await SRP.envio.pendientesPropios().catch(() => null);
    let espacio = 'No disponible en este navegador';
    try {
      if (navigator.storage && navigator.storage.estimate) {
        const e = await navigator.storage.estimate();
        const mb = b => (b / 1048576).toLocaleString('es-MX', { maximumFractionDigits: 1 }) + ' MB';
        espacio = mb(e.usage || 0) + (e.quota ? ' de ' + mb(e.quota) + ' disponibles' : '');
      }
    } catch (e) { /* sin estimación */ }
    const grupos = [
      ['Sistema', [
        ['Versión', C.VERSION + ' (' + C.ETAPA + ')'],
        ['Datos', C.ES_FICTICIO ? 'De prueba: no usar para reportes oficiales' : 'Reales'],
        ['Base del dispositivo', C.DB_NOMBRE + ', versión ' + C.DB_VERSION],
        ['Acceso', C.AUTENTICACION.PROVEEDOR === 'simulado' ? 'Simulado (Etapa 1): en la Fase 2, proveedor institucional de identidad' : C.AUTENTICACION.PROVEEDOR]
      ]],
      ['Capas geográficas', [
        ['Alcaldías', capa('alcaldias')],
        ['Celdas UGA', capa('uga')],
        ['Colonias', capa('colonias')],
        ['Mapa base', C.MAPA.CREDITO_PROVEEDOR + ' (licencia para producción por confirmar)']
      ]],
      ['Este dispositivo', [
        ['Pendientes de envío', pendientes === null ? 'No se pudo leer' : pendientes.length === 0 ? 'Ninguno' : pendientes.length.toLocaleString('es-MX') + (pendientes.length === 1 ? ' registro' : ' registros')],
        ['Espacio usado', espacio]
      ]]
    ];
    this.el('cfg-acerca').innerHTML = grupos.map(([titulo, filas]) =>
      '<section class="bloque" aria-label="' + esc(titulo) + '"><h2>' + esc(titulo) + '</h2><dl class="cfg-datos">' +
      filas.map(([k, v]) => '<div class="cfg-dato"><dt>' + esc(k) + '</dt><dd>' + esc(v) + '</dd></div>').join('') + '</dl></section>').join('');
  }
};
