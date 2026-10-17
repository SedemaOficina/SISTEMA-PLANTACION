/* CONFIGURACIÓN (sólo Administración global). Una pantalla con una tarjeta por apartado: Usuarios
   y Catálogos, que son sus propias vistas; Parámetros, para consulta y, con datos reales, para
   cambiarlos en el servidor; Registro de cambios, lo que la bitácora dice de cuentas y catálogos; con
   datos reales, Posibles duplicados (js/duplicados.js); y Acerca del sistema. Cada apartado vuelve aquí con «Configuración», arriba a la izquierda. */
window.SRP = window.SRP || {};

SRP.configuracion = {
  pagina: 1,

  el(id) { return document.getElementById(id); },

  iniciar() {
    document.querySelectorAll('#cfg-tarjetas .cfg-icono').forEach(i => SRP.ICONOS.poner(i, i.dataset.icono, 'grande'));
    this.el('cfg-tarjetas').addEventListener('click', (e) => {
      const t = e.target.closest('.cfg-tarjeta'); if (t) SRP.app.mostrarVista(t.dataset.ir);
    });
    document.querySelectorAll('[data-volver-configuracion]').forEach(b => b.addEventListener('click', () => SRP.app.mostrarVista('configuracion')));
    ['cmb-sobre', 'cmb-quien'].forEach(id => this.el(id).addEventListener('change', () => { this.pagina = 1; this.pintarCambios(); }));
    this.el('cfg-parametros').addEventListener('click', (e) => {
      const b = e.target.closest('button[data-parametro]'); if (b) this.abrirParametro(b.dataset.parametro);
    });
    this.el('form-parametro').addEventListener('submit', (e) => { e.preventDefault(); this.guardarParametro(); });
  },

  /* ---------- Tarjetas ---------- */

  async preparar() {
    const num = n => n.toLocaleString('es-MX');
    const pl = (n, uno, varios) => num(n) + ' ' + (n === 1 ? uno : varios);
    const us = SRP.ref.usuarios, inactivas = us.filter(u => !u.activo).length;
    const activos = t => SRP.ref.deTipo(t, true).length;
    const [todos, delServidor, porRevisar] = await Promise.all([this.cambios(), this.leerParametros(), SRP.duplicados.pendientes()]);
    const cambios = todos.length, cargas = todos.filter(b => b.entidad === 'carga' && b.accion === 'CREADO').length;
    const resumen = {
      usuarios: pl(us.length, 'cuenta', 'cuentas') + (inactivas ? ' · ' + pl(inactivas, 'inactiva', 'inactivas') : ''),
      catalogos: pl(activos('programa'), 'programa', 'programas') + ' · ' + pl(activos('organizacion'), 'institución', 'instituciones') + ' · ' + pl(activos('especie'), 'especie', 'especies'),
      parametros: this.resumenParametros(delServidor),
      duplicados: porRevisar === null ? '' : porRevisar ? SRP.duplicados.textoParejas(porRevisar, 'por revisar') : 'Ninguna pareja por revisar',
      cambios: cambios ? pl(cambios, 'cambio registrado', 'cambios registrados') : 'Sin cambios todavía',
      carga: cargas ? pl(cargas, 'carga hecha', 'cargas hechas') : 'Plantilla, revisión y carga',
      acerca: 'Versión ' + SRP.CONFIG.VERSION
    };
    document.querySelectorAll('#cfg-tarjetas [data-resumen]').forEach(s => { s.textContent = resumen[s.dataset.resumen] || ''; });
    // La bandeja de posibles duplicados vive en el servidor: con datos de prueba no hay tarjeta
    this.el('cfg-tarjetas').querySelector('[data-ir="duplicados"]').hidden = !SRP.duplicados.disponible();
  },

  /* ---------- Parámetros ---------- */

  /* Los valores salen de SRP.CONFIG, no se copian: lo que se lee aquí es lo que el sistema usa. `C`, otra
     configuración con la misma forma: la de arranque, para decir cuál era */
  parametros(C = SRP.CONFIG) {
    const M = C.MAPA;
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
        ['Renglones por página', C.LISTA_PAGINA + ' en teléfono · ' + C.LISTA_PAGINA_ANCHA + ' en computadora', 'Jornadas, Registros y el registro de cambios empiezan con este número; cada lista ofrece ' + SRP.util.enumerar(C.TAMANOS_PAGINA.map(String)) + ' en «Resultados por página», y cada equipo recuerda lo elegido.']
      ] }
    ];
  },

  /* CON DATOS REALES los parámetros son del servidor, iguales para todos los teléfonos, y sólo la
     Administración global los cambia: cada valor lleva «Editar», y el que no es el de arranque dice cuándo y
     quién lo cambió. Cada teléfono recibe el cambio la próxima vez que se conecta. Con datos de prueba, o si
     el servidor no responde, sólo se consultan. */
  NOTA_REAL: 'Valores con que el sistema revisa y avisa, iguales para todos los teléfonos. Sólo la Administración global los cambia: cada teléfono recibe el cambio la próxima vez que se conecte, y el cambio queda en el Registro de cambios.',
  NOTA_PRUEBA: '',

  // Cómo se cambia cada renglón: sus parámetros del servidor, cómo se llama su campo y, si se escribe en otra unidad, la escala
  EDICION: {
    'Puntos duplicados': [{ clave: 'JORNADA.DUPLICADO_M', etiqueta: 'Distancia en metros' }],
    'Punto lejos de la jornada': [{ clave: 'JORNADA.FUERA_M', etiqueta: 'Distancia en metros' }],
    'Sitios separados': [{ clave: 'JORNADA.SEPARAR_M', etiqueta: 'Distancia en metros' }],
    'Precisión buena': [{ clave: 'MAPA.PRECISION_BUENA_M', etiqueta: 'Hasta cuántos metros' }],
    'Precisión aceptable': [{ clave: 'MAPA.PRECISION_ACEPTABLE_M', etiqueta: 'Hasta cuántos metros' }],
    'Margen del límite de la Ciudad': [{ clave: 'MAPA.MARGEN_AMBITO_M', etiqueta: 'Margen en metros' }],
    'Espera del GPS': [{ clave: 'MAPA.GPS_ESPERA_MS', etiqueta: 'Espera en segundos', escala: 1000, unidad: 's' }],
    'Hora de atraso': [{ clave: 'HORA_CIERRE_JORNADA', etiqueta: 'Hora del día, de 0 a 23' }],
    'Reintento de envío': [{ clave: 'REINTENTO_ENVIO_MS', etiqueta: 'Cada cuántos segundos', escala: 1000, unidad: 's' }],
    'Tamaño de la fotografía': [{ clave: 'FOTO.ANCHO_MAX', etiqueta: 'Ancho en píxeles' }, { clave: 'FOTO.ALTO_MAX', etiqueta: 'Alto en píxeles' }],
    'Renglones por página': [{ clave: 'LISTA_PAGINA', etiqueta: 'En teléfono' }, { clave: 'LISTA_PAGINA_ANCHA', etiqueta: 'En computadora' }]
  },
  // Lo que el servidor hace además con un valor
  TAMBIEN: { 'Puntos duplicados': 'El servidor la usa también como la distancia mínima para avisar de árboles de otras jornadas.' },

  delServidor: null,   // clave → el parámetro como lo da el servidor, con su arranque, su rango y quién lo cambió

  // Los parámetros del servidor, al día; null con datos de prueba o si no responde
  async leerParametros() {
    if (!SRP.remoto.activo()) return (this.delServidor = null);
    const r = await SRP.servidor.pedir('GET', '/parametros');
    this.delServidor = r.ok ? new Map((r.datos || []).map(x => [x.clave, x])) : null;
    return this.delServidor;
  },

  // La configuración de arranque, con la forma de SRP.CONFIG
  arranque(servidor) {
    const A = JSON.parse(JSON.stringify(SRP.CONFIG));
    servidor.forEach(x => {
      const partes = x.clave.split('.'), ultimo = partes.pop();
      const o = partes.reduce((y, k) => (y && typeof y[k] === 'object' ? y[k] : null), A);
      if (o && ultimo in o) o[ultimo] = x.porOmision;
    });
    return A;
  },

  // Un renglón cuenta como cambiado si alguno de sus valores no es el de arranque
  cambiadoDe(nombre, servidor) {
    const ps = (this.EDICION[nombre] || []).map(e => servidor.get(e.clave)).filter(Boolean);
    return ps.some(x => x.valor !== x.porOmision) ? ps.filter(x => x.fecha_ultima_edicion).sort((a, b) => String(b.fecha_ultima_edicion).localeCompare(String(a.fecha_ultima_edicion)))[0] || ps[0] : null;
  },

  // «11 valores · 1 cambiado»; con datos de prueba, «… · sólo consulta»
  resumenParametros(servidor) {
    const filas = this.parametros().reduce((s, g) => s.concat(g.filas), []);
    const n = filas.length.toLocaleString('es-MX') + (filas.length === 1 ? ' valor' : ' valores');
    if (!SRP.remoto.activo()) return n + ' · sólo consulta';
    if (!servidor) return n;
    const c = filas.filter(([nombre]) => this.cambiadoDe(nombre, servidor)).length;
    return n + (c ? ' · ' + c + (c === 1 ? ' cambiado' : ' cambiados') : '');
  },

  async prepararParametros() {
    const esc = SRP.util.escapar, nota = this.el('cfg-parametros-nota');
    if (!this.NOTA_PRUEBA) this.NOTA_PRUEBA = nota.textContent;
    const servidor = await this.leerParametros();
    const editable = !!servidor && SRP.permisos.puede('catalogo.administrar');
    if (SRP.remoto.activo() && !servidor) SRP.util.anunciar('Sin conexión con el servidor: los parámetros se consultan, pero no se pueden cambiar.', 'aviso', { secundario: true });
    nota.textContent = SRP.remoto.activo() ? this.NOTA_REAL : this.NOTA_PRUEBA;
    const A = servidor ? this.parametros(this.arranque([...servidor.values()])) : null;
    const deArranque = nombre => A && A.reduce((v, g) => v || (g.filas.find(f => f[0] === nombre) || [])[1], '');
    this.el('cfg-parametros').innerHTML = this.parametros().map(g =>
      '<section class="bloque" aria-label="' + esc(g.titulo) + '"><h2>' + esc(g.titulo) + '</h2><dl class="cfg-valores">' +
      g.filas.map(([nombre, valor, que]) => {
        const c = editable && this.cambiadoDe(nombre, servidor);
        return '<div class="cfg-valor' + (editable ? ' editable' : '') + '"><dt>' + esc(nombre) + '</dt><dd class="cfg-cifra">' + esc(valor) + '</dd>' +
          (editable ? '<dd class="cfg-editar"><button type="button" class="btn btn-texto-editar btn-chico" data-parametro="' + esc(nombre) + '" aria-label="Editar ' + esc(nombre.toLowerCase()) + '">' +
            SRP.ICONOS.svg('lapiz', 'chico') + '<span>Editar</span></button></dd>' : '') +
          '<dd class="cfg-que">' + esc(que + (SRP.remoto.activo() && this.TAMBIEN[nombre] ? ' ' + this.TAMBIEN[nombre] : '')) + '</dd>' +
          (c ? '<dd class="cfg-que"><span class="insignia">Cambiado</span> ' + (c.fecha_ultima_edicion ? 'el ' + esc(SRP.util.formatearFecha(SRP.envio.diaLocal(c.fecha_ultima_edicion))) + ' ' : '') +
            (c.editado_por_id ? 'por ' + esc(SRP.ref.nombreUsuario(c.editado_por_id)) : '') + '. El de arranque es ' + esc(deArranque(nombre)) + '.</dd>' : '') +
          '</div>';
      }).join('') + '</dl></section>').join('');
  },

  /* ---------- Cambiar un parámetro ---------- */

  editando: null,   // el nombre del renglón que se cambia

  // El valor como se escribe en el campo: los milisegundos, en segundos
  enCampo(e, valor) { return valor / (e.escala || 1); },

  abrirParametro(nombre) {
    if (!this.delServidor || !SRP.permisos.exigir('catalogo.administrar')) return;
    const esc = SRP.util.escapar, campos = this.EDICION[nombre];
    const fila = this.parametros().reduce((v, g) => v || g.filas.find(f => f[0] === nombre), null);
    if (!campos || !fila) return;
    this.editando = nombre;
    this.el('dlg-parametro-titulo').textContent = nombre;
    this.el('par-que').textContent = fila[2] + (this.TAMBIEN[nombre] ? ' ' + this.TAMBIEN[nombre] : '');
    this.el('par-campos').innerHTML = campos.map((e, i) => {
      const x = this.delServidor.get(e.clave), u = e.unidad || x.unidad, id = 'par-valor-' + i;
      const con = v => this.enCampo(e, v).toLocaleString('es-MX') + (u ? ' ' + u : '');
      const ayuda = x.opciones ? 'El de arranque es ' + con(x.porOmision) + '.' : 'De ' + this.enCampo(e, x.minimo).toLocaleString('es-MX') + ' a ' + con(x.maximo) + '. El de arranque es ' + con(x.porOmision) + '.';
      const control = x.opciones
        ? '<select id="' + id + '" aria-describedby="' + id + '-ayuda">' + x.opciones.map(o => '<option value="' + o + '"' + (o === x.valor ? ' selected' : '') + '>' + o + '</option>').join('') + '</select>'
        : '<input id="' + id + '" type="number" inputmode="numeric" step="1" value="' + this.enCampo(e, x.valor) + '" aria-describedby="' + id + '-ayuda">';
      return '<div class="campo"><label for="' + id + '">' + esc(e.etiqueta) + ' <span class="obligatorio" aria-hidden="true">*</span></label>' + control +
        '<p id="' + id + '-ayuda" class="nota">' + esc(ayuda) + '</p></div>';
    }).join('');
    this.el('par-errores').hidden = true;
    this.el('dlg-parametro').showModal();
  },

  // Lo que tiene que cumplir un valor, como lo revisa el servidor; '' si está bien
  revisarParametro(x, v, nuevos) {
    const u = x.unidad ? ' ' + x.unidad : '';
    if (!Number.isFinite(v)) return 'Escriba un número.';
    if (!Number.isInteger(v)) return 'Escriba un número entero.';
    if (x.opciones) return x.opciones.includes(v) ? '' : 'Elija uno de la lista.';
    if (v < x.minimo || v > x.maximo) return 'Va de ' + x.minimo.toLocaleString('es-MX') + u + ' a ' + x.maximo.toLocaleString('es-MX') + u + '.';
    const valor = k => (k in nuevos ? nuevos[k] : this.delServidor.get(k).valor);
    if (/^MAPA\.PRECISION_/.test(x.clave) && valor('MAPA.PRECISION_BUENA_M') >= valor('MAPA.PRECISION_ACEPTABLE_M')) return 'La precisión buena tiene que ser menor que la aceptable.';
    return '';
  },

  async guardarParametro() {
    if (!SRP.permisos.exigir('catalogo.administrar')) return;
    const campos = this.EDICION[this.editando] || [], ids = campos.map((e, i) => 'par-valor-' + i);
    const nuevos = {};
    campos.forEach((e, i) => {
      const t = this.el(ids[i]).value.trim();
      nuevos[e.clave] = t === '' ? NaN : Number(t) * (e.escala || 1);
    });
    const errores = campos.map((e, i) => [ids[i], this.revisarParametro(this.delServidor.get(e.clave), nuevos[e.clave], nuevos)]).filter(x => x[1]);
    if (SRP.util.resumenErrores(this.el('par-errores'), errores, ids)) return;
    const cambian = campos.map((e, i) => [e, ids[i]]).filter(([e]) => nuevos[e.clave] !== this.delServidor.get(e.clave).valor);
    if (!cambian.length) { this.el('dlg-parametro').close(); return; }
    const libre = SRP.util.ocupado(this.el('btn-par-guardar'), 'Guardando…', 'disco');
    try {
      for (const [e, id] of cambian) {
        const r = await SRP.servidor.pedir('PUT', '/parametros/' + encodeURIComponent(e.clave), { valor: nuevos[e.clave] });
        if (r.ok) continue;
        if (r.sinRed) SRP.util.anunciar('Sin conexión con el servidor: el parámetro no cambió. Intente de nuevo cuando haya señal.', 'aviso');
        else SRP.util.resumenErrores(this.el('par-errores'), (r.errores && r.errores.length ? r.errores : [['', r.mensaje]]).map(x => [id, x[1]]), ids);
        await this.alCambiarParametros();
        return;
      }
    } finally { libre(); }
    this.el('dlg-parametro').close();
    await this.alCambiarParametros();
    SRP.util.anunciar('Guardado. Cada teléfono lo recibe la próxima vez que se conecte.', 'exito');
  },

  // Este teléfono toma los valores nuevos al momento, y la pantalla dice quién los cambió
  async alCambiarParametros() {
    await SRP.remoto.bajarParametros();
    if (SRP.app.vista === 'parametros') await this.prepararParametros();
  },

  /* ---------- Registro de cambios ---------- */

  /* Lo que la bitácora dice de cuentas, catálogos y cargas masivas, lo más reciente primero. Con datos reales
     la bitácora es la del servidor; si no responde, queda lo de este equipo, y en el Registro de cambios se dice */
  async cambios(avisar) {
    if (SRP.remoto.activo()) {
      const r = await SRP.remoto.todo('/cambios');
      if (r.ok) return r.filas;
      if (avisar) SRP.util.anunciar('Sin conexión con el servidor: se ven sólo los cambios hechos en este equipo.', 'aviso', { secundario: true });
    }
    const ms = b => new Date(b.fecha).getTime();
    return (await SRP.almacen.todos('bitacora')).filter(b => b.entidad === 'usuario' || b.entidad === 'catalogo' || b.entidad === 'carga')
      .sort((a, b) => ms(b) - ms(a));
  },

  async prepararCambios() {
    this.lista = await this.cambios(true);
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
    otros_nombres_comunes: 'otros nombres comunes', formadecrecimiento: 'forma de crecimiento', paleta_vegetal: 'paleta vegetal', fruto_comestible: 'fruto comestible', id_snib: 'id SNIB', id_enciclovida: 'id EncicloVida',
    modelo: 'modelo', tipo_vehiculo: 'tipo de vehículo', tipo_organizacion: 'tipo de institución', tipo_solicitante: 'tipo de solicitante', tipos_organizacion: 'quién puede usarlo' },

  // «Alta de la cuenta Irma Palmera Ejemplo (Green Cover)», «Edición del programa Palmeras»
  describir(b) {
    const esc = SRP.util.escapar;
    // Una carga masiva: el detalle ya dice archivo, árboles, jornadas e instituciones
    if (b.entidad === 'carga') return '<span class="cmb-que"><b>' + (b.accion === 'ELIMINADO' ? 'Carga masiva deshecha' : 'Carga masiva') + '</b></span><span class="cmb-campos">' + esc(b.detalle || '') + '</span>';
    const accion = this.ACCION[b.accion] || b.accion;
    // Un parámetro: «Parámetro «Puntos duplicados»: 4 → 6 m», como lo anota el servidor
    const parametro = /^parametro:/.test(b.entidad_id || '') && /^Parámetro «(.+)»: (.+)$/.exec(b.detalle || '');
    if (parametro) return '<span class="cmb-que"><b>' + esc(accion) + '</b> del parámetro <b>' + esc(parametro[1]) + '</b></span><span class="cmb-campos">' + esc(parametro[2]) + '</span>';
    let sobre, nombre, extra = '';
    if (b.entidad === 'usuario') {
      const u = SRP.ref.usuarioPorId[b.entidad_id];
      sobre = 'de la cuenta';
      // De una cuenta que ya no está, su correo: lo guardan su alta y su eliminación
      const correoDe = x => x.accion === 'ELIMINADO' ? x.detalle : (/^Alta de (\S+@\S+) con perfil /.exec(x.detalle || '') || [])[1];
      nombre = u ? SRP.util.nombreCompleto(u)
        : correoDe(b) || (this.lista || []).filter(x => x.entidad === 'usuario' && x.entidad_id === b.entidad_id).map(correoDe).find(Boolean) || 'que ya se eliminó';
      if (u) extra = SRP.ref.esSedema(u.organizacion_id) ? (SRP.ref.nombreCatalogo(u.area_id) || 'SEDEMA') : SRP.ref.nombreOrganizacion(u.organizacion_id);
    } else {
      const c = SRP.ref.catalogoPorId[b.entidad_id];
      const tipo = c ? c.tipo : String(b.detalle || '').split(' ')[0];
      sobre = this.TIPO[tipo] || 'del catálogo';
      // De un valor que ya no está, sólo su eliminación dice cómo se llamaba: «area CLAVE: Nombre»
      nombre = c ? (c.tipo === 'organizacion' ? SRP.ref.nombreOrganizacion(c.id) : c.nombre)
        : (b.accion === 'ELIMINADO' && String(b.detalle || '').split(': ').slice(1).join(': ')) || 'elemento eliminado';
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
        ['Versión', SRP.util.textoVersion()],
        ['Datos', C.ES_FICTICIO ? 'De prueba: no usar para reportes oficiales' : 'Reales'],
        ['Base de este equipo', C.DB_NOMBRE + ', versión ' + C.DB_VERSION],
        ['Acceso', 'Cuentas del sistema' + (C.AUTENTICACION.PROVEEDOR === 'simulado' ? ' (de prueba: no se verifica la contraseña)' : '')]
      ]],
      ['Capas geográficas', [
        ['Alcaldías', capa('alcaldias')],
        ['Celdas UGA', capa('uga')],
        ['Colonias', capa('colonias')],
        // En producción, CARTO para calles y Esri para satélite; mientras no se conecte CARTO, todo es Esri
        ['Mapa base', 'Esri (provisional)']
      ]],
      ['Este equipo', [
        ['Pendientes de envío', pendientes === null ? 'No se pudo leer' : pendientes.length === 0 ? 'Ninguno' : pendientes.length.toLocaleString('es-MX') + (pendientes.length === 1 ? ' registro' : ' registros')],
        ['Espacio usado', espacio]
      ]]
    ];
    this.el('cfg-acerca').innerHTML = grupos.map(([titulo, filas]) =>
      '<section class="bloque" aria-label="' + esc(titulo) + '"><h2>' + esc(titulo) + '</h2><dl class="cfg-datos">' +
      filas.map(([k, v]) => '<div class="cfg-dato"><dt>' + esc(k) + '</dt><dd>' + esc(v) + '</dd></div>').join('') + '</dl></section>').join('');
  }
};
