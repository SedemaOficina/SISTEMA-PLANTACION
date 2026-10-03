/* EDITOR DE CATÁLOGOS (sólo Administración global).
   Regla: un valor con uso no se elimina, se desactiva. Todo cambio va a la bitácora.

   ESPECIES (D84). El catálogo es el real del SIA (assets/catalogos/catalogo-especies.js): la clave es el
   id_especie ESP-0000, se asigna en consecutivo y no se edita; nombre común y científico son
   obligatorios; tipo de distribución con los cuatro valores del SNIB; otros nombres comunes,
   forma de crecimiento, id SNIB e id EncicloVida son opcionales y viajan con la especie. Género y
   epíteto se derivan del nombre científico al guardar.

   VEHÍCULOS (D162). La placa es el nombre y lo que se elige en el cierre del reporte; modelo y tipo
   son obligatorios y se ponen solos al elegirla. La clave es la placa sin espacios, se fija al
   darla de alta y no se muestra: dos placas que sólo difieren en espacios son la misma.

   INSTITUCIONES (tipo `organizacion`). A cuál pertenece cada cuenta y cuál ejecutó cada jornada.
   Aquí, y sólo aquí, la Administración agrega a solicitud dependencias de gobierno, empresas y
   organizaciones civiles, las renombra y las desactiva (desactivar corta el acceso de sus cuentas);
   no se eliminan. El tipo se elige al agregarla y no cambia; la clave la pone el sistema. Las 16
   alcaldías son fijas y la Secretaría no se desactiva.

   SOLICITANTES (tipo `solicitante`). Quién pide un pedido especial; se eligen al iniciar o editar
   una jornada. Llevan nombre y tipo (los de SRP.ref.TIPOS_SOLICITANTE), que agrupa la lista; la
   clave la pone el sistema. Se agregan, se editan y se desactivan; sin uso, se eliminan. No son
   instituciones: no tienen cuentas ni ejecutan jornadas. */
window.SRP = window.SRP || {};

SRP.catalogos = {
  tipo: 'programa', editando: null, usos: {},
  claveTocada: false,   // deja de sugerir en cuanto la persona escribe su propia clave
  ETIQUETA: { programa: 'programa', area: 'área', especie: 'especie', vehiculo: 'vehículo', organizacion: 'institución', solicitante: 'solicitante' },
  CAMPOS_ESPECIE: ['cat-cientifico', 'cat-distribucion', 'cat-otros-nombres', 'cat-forma', 'cat-snib', 'cat-enciclovida'],
  CAMPOS_VEHICULO: ['cat-modelo', 'cat-tipo-vehiculo'],
  CAMPOS_TIPO: ['cat-tipo-org', 'cat-tipo-sol'],
  // El tipo de una institución o de un solicitante, y el orden de sus tipos
  tipoDe(c) { return c.tipo === 'solicitante' ? c.tipo_solicitante || '' : c.tipo_organizacion || ''; },
  tiposDe(tipo) { return tipo === 'solicitante' ? SRP.ref.TIPOS_SOLICITANTE : SRP.ref.TIPOS_INSTITUCION; },
  nombreDe(c) { return c.tipo === 'organizacion' ? SRP.ref.nombreOrganizacion(c.id) : c.nombre; },
  // Una alcaldía no se renombra ni se desactiva: son las 16 de la Ciudad
  esFija(c) { return c.tipo === 'organizacion' && c.tipo_organizacion === 'Alcaldía'; },
  // La placa sin espacios ni guiones: así se comparan «1234AB» y «1234 AB»
  clavePlaca(placa) { return String(placa || '').toUpperCase().replace(/[^A-Z0-9]/g, ''); },

  el(id) { return document.getElementById(id); },

  iniciar() {
    this.el('cat-tipos').addEventListener('click', (e) => {
      const b = e.target.closest('.chip'); if (!b) return;
      this.tipo = b.dataset.tipo;
      this.el('cat-tipos').querySelectorAll('.chip').forEach(c => c.setAttribute('aria-pressed', String(c === b)));
      this.el('cat-buscar').value = '';
      this.el('cat-filtro-tipo').value = '';
      this.preparar();
    });
    this.el('cat-buscar').addEventListener('input', () => this.pintar());
    this.el('cat-filtro-tipo').addEventListener('change', () => this.pintar());
    // La clave se propone a partir del nombre mientras nadie la edite a mano (no en especies: consecutivo fijo)
    this.el('cat-nombre').addEventListener('input', (e) => {
      // La placa se escribe y se ve en mayúsculas
      if (this.tipo === 'vehiculo') { const pos = e.target.selectionStart; e.target.value = e.target.value.toUpperCase(); e.target.setSelectionRange(pos, pos); return; }
      if (this.editando || this.claveTocada || this.tipo === 'especie') return;
      this.el('cat-clave').value = this.claveLibre(SRP.util.claveDesdeNombre(this.el('cat-nombre').value));
    });
    // La clave siempre se guarda y se ve en mayúsculas, se escriba como se escriba
    this.el('cat-clave').addEventListener('input', (e) => {
      this.claveTocada = true;
      const pos = e.target.selectionStart;
      e.target.value = e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, '_');
      e.target.setSelectionRange(pos, pos);
    });
    this.el('btn-cat-agregar').addEventListener('click', () => this.abrirFormulario(null));
    SRP.ICONOS.poner(this.el('btn-cat-excel'), 'descargar', 'medio');
    this.el('btn-cat-excel').addEventListener('click', () => this.descargarEspecies());
    this.el('cat-forma-botones').addEventListener('click', (e) => {
      const b = e.target.closest('.chip'); if (b) this.alternarForma(b.dataset.forma);
    });
    this.el('cat-tipos-org-botones').addEventListener('click', (e) => {
      const b = e.target.closest('.chip'); if (b) b.setAttribute('aria-pressed', String(b.getAttribute('aria-pressed') !== 'true'));
    });
    this.el('form-catalogo').addEventListener('submit', (e) => { e.preventDefault(); this.guardar(); });
    this.el('tabla-catalogo').addEventListener('click', (e) => {
      // Tocar la tarjeta (fuera de la tuerca) abre la edición (D105)
      if (!e.target.closest('.c-acciones, thead')) {
        const tr = e.target.closest('tr[data-id]');
        if (tr && !this.esFija(SRP.ref.catalogoPorId[tr.dataset.id])) { this.abrirFormulario(SRP.ref.catalogoPorId[tr.dataset.id]); return; }
      }
      const b = e.target.closest('button[data-accion]'); if (!b) return;
      const item = SRP.ref.catalogoPorId[b.dataset.id];
      if (b.dataset.accion === 'editar') this.abrirFormulario(item);
      if (b.dataset.accion === 'estado') this.cambiarEstado(item);
      if (b.dataset.accion === 'eliminar') this.eliminar(item);
    });
  },

  async preparar() {
    // Árboles (también los eliminados: siguen en el historial), jornadas y cuentas que lo usan (D151)
    this.usos = await SRP.ref.usosDe('catalogos');
    // Buscar en especies, instituciones y solicitantes; estos dos también por tipo
    const esOrg = this.tipo === 'organizacion', esSol = this.tipo === 'solicitante', conTipo = esOrg || esSol;
    this.el('caja-cat-buscar').hidden = this.tipo !== 'especie' && !conTipo;
    this.el('cat-buscar-etiqueta').textContent = esOrg ? 'Buscar institución' : esSol ? 'Buscar solicitante' : 'Buscar especie';
    this.el('cat-buscar').placeholder = esOrg ? 'Nombre o clave' : esSol ? 'Nombre' : 'Nombre o clave ESP';
    this.el('caja-cat-filtro-tipo').hidden = !conTipo;
    this.el('cat-filtro-tipo-etiqueta').textContent = esSol ? 'Tipo de solicitante' : 'Tipo de institución';
    if (conTipo) { const sel = this.el('cat-filtro-tipo'), antes = sel.value; sel.innerHTML = SRP.util.opciones('Todos', this.tiposDe(this.tipo).map(t => [t, t])); sel.value = antes; }
    this.el('btn-cat-excel').hidden = this.tipo !== 'especie';
    this.el('btn-cat-agregar').innerHTML = SRP.ICONOS.svg('mas', 'medio') + '<span>Agregar ' + this.ETIQUETA[this.tipo] + '</span>';
    this.el('cat-nota-org').hidden = this.tipo !== 'organizacion';
    this.el('cat-nota-sol').hidden = !esSol;
    this.pintar();
  },

  pintar() {
    const esc = SRP.util.escapar;
    const q = SRP.util.normalizar(this.el('cat-buscar').value);
    const esEspecie = this.tipo === 'especie', esVehiculo = this.tipo === 'vehiculo', esOrg = this.tipo === 'organizacion', esPrograma = this.tipo === 'programa';
    // Instituciones y solicitantes llevan tipo y no muestran clave
    const esSol = this.tipo === 'solicitante', conTipo = esOrg || esSol, tipos = this.tiposDe(this.tipo);
    const textoOrg = (c) => this.tipoDe(c);
    // «12 árboles y 3 jornadas», «2 cuentas», «Sin uso» (D151)
    const textoUso = (id) => SRP.ref.textoUsos(this.usos[id]) || 'Sin uso';
    const tipoOrg = conTipo ? this.el('cat-filtro-tipo').value : '';
    const coincide = c => !q || (conTipo ? [this.nombreDe(c), c.clave].some(t => SRP.util.normalizar(t).includes(q)) : SRP.ref.especieCoincide(c, q));
    // Instituciones y solicitantes, agrupados por tipo (en el orden de los tipos) y por nombre dentro de cada uno
    const items = SRP.ref.deTipo(this.tipo, false).filter(c => coincide(c) && (!tipoOrg || this.tipoDe(c) === tipoOrg));
    if (conTipo) items.sort((a, b) => tipos.indexOf(this.tipoDe(a)) - tipos.indexOf(this.tipoDe(b)) ||
      this.nombreDe(a).localeCompare(this.nombreDe(b), 'es'));
    const cab = '<thead><tr><th scope="col">' + (esEspecie ? 'Nombre común' : esVehiculo ? 'Placa' : 'Nombre') + '</th>' +
      (esEspecie ? '<th scope="col">Nombre científico</th><th scope="col">Distribución</th>' : '') +
      (conTipo ? '<th scope="col">Tipo</th>' : '') +
      (esVehiculo ? '<th scope="col">Modelo</th><th scope="col">Tipo</th>' : conTipo ? '' : '<th scope="col">Clave</th>') +
      (esPrograma ? '<th scope="col">Quién lo usa</th>' : '') +
      '<th scope="col">Estado</th><th scope="col">Uso</th><th scope="col">Acciones</th></tr></thead>';
    const filas = items.map(c => {
      const uso = SRP.ref.totalUsos(this.usos[c.id]);
      // Acciones en el menú de la tuerca (D94); Eliminar sólo si no tiene uso
      // Instituciones: se renombran y se desactivan, no se eliminan; las alcaldías, ni eso. La
      // Secretaría no se desactiva: sus cuentas administran el sistema
      const fija = this.esFija(c);
      const items = fija ? [] : [{ accion: 'editar', texto: esOrg ? 'Renombrar' : 'Editar', icono: 'lapiz' }];
      if (!fija && !SRP.ref.esSedema(c.id)) items.push({ accion: 'estado', texto: c.activo ? 'Desactivar' : 'Activar', icono: c.activo ? 'cerrar' : 'palomita' });
      if (uso === 0 && !esOrg) items.push({ accion: 'eliminar', texto: 'Eliminar', icono: 'basura', peligro: true });
      // data-etiqueta: en teléfono cada renglón se muestra como ficha con su etiqueta
      const estado = '<span class="estado-texto" data-activo="' + c.activo + '">' + (c.activo ? 'Activo' : 'Inactivo') + '</span>';
      // Clases c-*: en teléfono la fila es una tarjeta compacta (D105): título, científico, un
      // renglón de resumen y la tuerca arriba a la derecha; el resto de celdas se oculta ahí
      return '<tr data-id="' + SRP.util.escapar(c.id) + '"' + (fija ? ' data-fija="true"' : '') + '><td class="c-titulo" data-etiqueta="Nombre">' + esc(this.nombreDe(c)) + '</td>' +
        (esEspecie ? '<td class="c-sub" data-etiqueta="Científico"><i>' + esc(c.nombre_cientifico) + '</i>' +
          (c.otros_nombres_comunes ? '<small class="tabla-detalle">También: ' + esc(c.otros_nombres_comunes) + '</small>' : '') +
          '</td><td class="c-movil-oculta" data-etiqueta="Distribución">' + esc(c.tipo_distribucion || '') + '</td>' : '') +
        (conTipo ? '<td class="c-movil-oculta" data-etiqueta="Tipo">' + esc(textoOrg(c)) + '</td>' : '') +
        (esVehiculo ? '<td class="c-movil-oculta" data-etiqueta="Modelo">' + esc(c.modelo || '') + '</td><td class="c-movil-oculta" data-etiqueta="Tipo">' + esc(c.tipo_vehiculo || '') + '</td>'
          : conTipo ? '' : '<td class="c-movil-oculta" data-etiqueta="Clave">' + esc(c.clave) + '</td>') +
        (esPrograma ? '<td class="c-movil-oculta" data-etiqueta="Quién lo usa">' + esc(SRP.ref.textoUsoPrograma(c)) + '</td>' : '') +
        '<td class="c-movil-oculta" data-etiqueta="Estado">' + estado + '</td>' +
        '<td class="c-movil-oculta" data-etiqueta="Uso">' + textoUso(c.id) + '</td>' +
        '<td class="c-acciones" data-etiqueta="Acciones">' + (items.length ? SRP.ICONOS.menuAcciones(c.id, c.nombre, items) : '<span class="nota">Fija</span>') + '</td>' +
        '<td class="c-resumen">' + estado + '<span>' + (esVehiculo ? [esc(c.modelo || ''), esc(c.tipo_vehiculo || ''), textoUso(c.id)]
          : [conTipo ? '' : esc(c.clave), esEspecie ? esc(c.tipo_distribucion || '') : '', conTipo ? esc(textoOrg(c)) : '', esPrograma ? esc(SRP.ref.textoUsoPrograma(c)) : '', textoUso(c.id)]).filter(Boolean).join(' · ') + '</span></td></tr>';
    }).join('');
    this.el('tabla-catalogo').innerHTML = cab + '<tbody>' + (filas || '<tr><td colspan="8">Sin resultados.</td></tr>') + '</tbody>';
    SRP.util.ordenable(this.el('tabla-catalogo'));
    // Cuántos hay y cuántos coinciden (D105)
    const nombres = { programa: ['programa', 'programas'], area: ['área', 'áreas'], especie: ['especie', 'especies'], vehiculo: ['vehículo', 'vehículos'], organizacion: ['institución', 'instituciones'], solicitante: ['solicitante', 'solicitantes'] }[this.tipo];
    const total = SRP.ref.deTipo(this.tipo, false).length;
    const pal = (n) => n === 1 ? nombres[0] : nombres[1];
    // Y cuántos están inactivos (D142): «76 especies · 3 inactivas»
    const inactivos = SRP.ref.deTipo(this.tipo, false).filter(c => !c.activo).length;
    const femenino = this.tipo === 'area' || this.tipo === 'especie' || this.tipo === 'organizacion';
    this.el('cat-cuenta').textContent = (q || tipoOrg ? items.length + ' de ' + total + ' ' + pal(total) : total + ' ' + pal(total)) +
      (inactivos ? ' · ' + inactivos + ' ' + (femenino ? (inactivos === 1 ? 'inactiva' : 'inactivas') : (inactivos === 1 ? 'inactivo' : 'inactivos')) : '');
  },

  /* FORMA DE CRECIMIENTO CON BOTONES (D107). Una especie puede tener varias (Árbol, Arbusto), así
     que cada botón se marca o desmarca por su cuenta. El texto se guarda igual que antes, separado
     por comas, en el orden de la lista; una forma que ya traiga el catálogo y no esté en la lista
     se conserva como botón. */
  FORMAS: ['Árbol', 'Arbusto', 'Palma', 'Sufrútice', 'Liana', 'Hierba'],

  pintarFormas() {
    const actuales = this.el('cat-forma').value.split(',').map(t => t.trim()).filter(Boolean);
    const todas = this.FORMAS.concat(actuales.filter(f => !this.FORMAS.includes(f)));
    this.el('cat-forma-botones').innerHTML = todas.map(f =>
      '<button type="button" class="chip" data-forma="' + SRP.util.escapar(f) + '" aria-pressed="' + actuales.includes(f) + '">' + SRP.util.escapar(f) + '</button>').join('');
  },

  alternarForma(forma) {
    const orden = [...this.el('cat-forma-botones').querySelectorAll('.chip')].map(b => b.dataset.forma);
    const actuales = new Set(this.el('cat-forma').value.split(',').map(t => t.trim()).filter(Boolean));
    if (actuales.has(forma)) actuales.delete(forma); else actuales.add(forma);
    this.el('cat-forma').value = orden.filter(f => actuales.has(f)).join(', ');
    this.el('cat-forma-botones').querySelectorAll('.chip').forEach(b => b.setAttribute('aria-pressed', String(actuales.has(b.dataset.forma))));
  },

  /* EL CATÁLOGO DE ESPECIES EN EXCEL: todas, activas e inactivas, con todos sus campos y cuántos
     árboles o jornadas las usan. Es la misma lista con que se valida la carga masiva. */
  async descargarEspecies() {
    const usos = this.usos || {};
    const filas = SRP.ref.deTipo('especie', false).slice().sort((a, b) => String(a.clave).localeCompare(String(b.clave)))
      .map(e => [e.clave, e.nombre, e.nombre_cientifico || '', e.tipo_distribucion || '', e.otros_nombres_comunes || '', e.formadecrecimiento || '',
        e.id_snib || '', e.id_enciclovida == null ? '' : e.id_enciclovida, e.activo ? 'Activa' : 'Inactiva', SRP.ref.totalUsos(usos[e.id])]);
    const hoja = { nombre: 'Especies', columnas: [
      { titulo: 'Clave', ancho: 11 }, { titulo: 'Nombre común', ancho: 28 }, { titulo: 'Nombre científico', ancho: 32 }, { titulo: 'Distribución', ancho: 16 },
      { titulo: 'Otros nombres comunes', ancho: 36 }, { titulo: 'Forma de crecimiento', ancho: 20 }, { titulo: 'Id SNIB', ancho: 14 }, { titulo: 'Id EncicloVida', ancho: 14 },
      { titulo: 'Estado', ancho: 10 }, { titulo: 'Usos', ancho: 8 }], filas };
    await SRP.reportes.entregarArchivo(SRP.excel.armar([hoja]), 'Catalogo_especies_SRP_' + SRP.util.fechaHoy() + '.xlsx', 'Catálogo de especies');
  },

  // Los tipos de institución marcados en el formulario de programa, en el orden fijo de los tipos
  tiposMarcados() {
    return [...this.el('cat-tipos-org-botones').querySelectorAll('.chip[aria-pressed="true"]')].map(b => b.dataset.tipo);
  },

  // Si la clave propuesta ya existe, agrega _2, _3… hasta encontrar una libre
  claveLibre(base) { return this.claveLibreDe(this.tipo, base); },
  claveLibreDe(tipo, base) {
    if (!base) return '';
    const usadas = SRP.ref.catalogos.filter(c => c.tipo === tipo).map(c => c.clave);
    if (!usadas.includes(base)) return base;
    for (let n = 2; n < 100; n++) {
      const tope = base.slice(0, 30 - String(n).length - 1);
      if (!usadas.includes(tope + '_' + n)) return tope + '_' + n;
    }
    return base;
  },

  // Siguiente id_especie: consecutivo después del mayor en uso, sin importar el orden alfabético
  siguienteClaveEspecie() {
    const n = SRP.ref.catalogos.filter(c => c.tipo === 'especie' && /^ESP-\d{4}$/.test(c.clave))
      .reduce((m, c) => Math.max(m, parseInt(c.clave.slice(4), 10)), 0);
    return 'ESP-' + String(n + 1).padStart(4, '0');
  },

  abrirFormulario(item) {
    this.editando = item;
    this.claveTocada = false;
    const esEspecie = this.tipo === 'especie', esVehiculo = this.tipo === 'vehiculo';
    this.el('dlg-catalogo-titulo').textContent = this.tipo === 'organizacion' && item ? 'Renombrar institución' : (item ? 'Editar ' : 'Agregar ') + this.ETIQUETA[this.tipo];
    this.el('etq-cat-nombre-texto').textContent = esEspecie ? 'Nombre común' : esVehiculo ? 'Placa' : 'Nombre';
    document.querySelectorAll('.solo-especie').forEach(n => { n.hidden = !esEspecie; });
    document.querySelectorAll('.solo-vehiculo').forEach(n => { n.hidden = !esVehiculo; });
    document.querySelectorAll('.solo-organizacion').forEach(n => { n.hidden = this.tipo !== 'organizacion'; });
    document.querySelectorAll('.solo-solicitante').forEach(n => { n.hidden = this.tipo !== 'solicitante'; });
    // Solicitantes: el tipo se elige de la lista y se puede corregir después
    this.el('cat-tipo-sol').innerHTML = SRP.util.opciones('Seleccione el tipo', SRP.ref.TIPOS_SOLICITANTE.map(t => [t, t]));
    this.el('cat-tipo-sol').value = item ? item.tipo_solicitante || '' : '';
    document.querySelectorAll('.solo-programa').forEach(n => { n.hidden = this.tipo !== 'programa'; });
    // Un programa nuevo empieza sólo para la Secretaría; la Administración marca quién más lo usa
    const tiposPrograma = item ? item.tipos_organizacion || [] : [];
    this.el('cat-tipos-org-botones').innerHTML = SRP.ref.TIPOS_INSTITUCION.map(t =>
      '<button type="button" class="chip" data-tipo="' + SRP.util.escapar(t) + '" aria-pressed="' + tiposPrograma.includes(t) + '">' + SRP.util.escapar(t) + '</button>').join('');
    // Al agregar se elige el tipo, nunca Alcaldía (son fijas); al renombrar se ve y no se cambia
    this.el('cat-tipo-org').value = item ? item.tipo_organizacion || '' : '';
    this.el('cat-tipo-org').disabled = !!item;
    this.el('cat-tipo-org').querySelector('option[value="Alcaldía"]').hidden = !item;
    // La clave de vehículos, instituciones y solicitantes la pone el sistema y no se muestra
    document.querySelectorAll('.no-vehiculo').forEach(n => { n.hidden = esVehiculo || this.tipo === 'organizacion' || this.tipo === 'solicitante'; });
    this.el('cat-nombre').setAttribute('autocapitalize', esVehiculo ? 'characters' : 'sentences');
    this.el('cat-modelo').value = item ? item.modelo || '' : '';
    this.el('cat-tipo-vehiculo').value = item ? item.tipo_vehiculo || '' : '';
    // Los tipos que ya hay se proponen al escribir (Pipa, Estacas, Redilas…)
    const tipos = [...new Set(SRP.ref.deTipo('vehiculo', false).map(v => v.tipo_vehiculo).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'es'));
    this.el('cat-tipos-vehiculo').innerHTML = tipos.map(t => '<option value="' + SRP.util.escapar(t) + '"></option>').join('');
    this.el('cat-nombre').value = item ? item.nombre : '';
    // La clave es estable: los registros se unen por ella. En especies es el consecutivo ESP-0000 y nunca se escribe
    this.el('cat-clave').value = item ? item.clave : (esEspecie ? this.siguienteClaveEspecie() : '');
    this.el('cat-clave').readOnly = !!item || esEspecie;
    this.el('cat-clave-ayuda').textContent = esEspecie
      ? 'Consecutivo del catálogo de especies; la asigna el sistema.'
      : 'Se sugiere a partir del nombre. Puede cambiarla ahora; después ya no.';
    this.el('cat-cientifico').value = item ? item.nombre_cientifico || '' : '';
    this.el('cat-distribucion').value = item ? item.tipo_distribucion || 'Nativa' : 'Nativa';
    this.el('cat-otros-nombres').value = item ? item.otros_nombres_comunes || '' : '';
    this.el('cat-forma').value = item ? item.formadecrecimiento || '' : '';
    this.pintarFormas();
    this.el('cat-snib').value = item ? item.id_snib || '' : '';
    this.el('cat-enciclovida').value = item && item.id_enciclovida !== null && item.id_enciclovida !== undefined ? String(item.id_enciclovida) : '';
    this.el('cat-errores').hidden = true;
    SRP.util.erroresEnCampos([], ['cat-nombre', 'cat-clave'].concat(this.CAMPOS_TIPO, this.CAMPOS_ESPECIE, this.CAMPOS_VEHICULO));
    this.el('dlg-catalogo').showModal();
  },

  validar(datos) {
    const errores = [];
    const mismos = SRP.ref.deTipo(this.tipo, false).filter(c => !this.editando || c.id !== this.editando.id);
    const norm = SRP.util.normalizar;
    if (this.tipo === 'vehiculo') {
      const clave = this.clavePlaca(datos.nombre);
      if (!datos.nombre) errores.push(['cat-nombre', 'Escriba la placa.']);
      else if (!/^[A-Z0-9][A-Z0-9 -]{2,10}[A-Z0-9]$/.test(datos.nombre) || !/\d/.test(datos.nombre)) errores.push(['cat-nombre', 'La placa lleva de 4 a 12 letras y números, con espacios o guiones: «1234 AB».']);
      else if (mismos.some(c => this.clavePlaca(c.nombre) === clave)) errores.push(['cat-nombre', 'Ya existe un vehículo con esa placa.']);
      if (!datos.modelo) errores.push(['cat-modelo', 'Escriba el modelo.']);
      if (!datos.tipo_vehiculo) errores.push(['cat-tipo-vehiculo', 'Escriba el tipo de vehículo.']);
      return errores;
    }
    // Institución: tipo al agregarla (nunca Alcaldía), nombre único entre todas; una alcaldía no se renombra
    if (this.tipo === 'organizacion') {
      if (!this.editando && !datos.tipo_organizacion) errores.push(['cat-tipo-org', 'Elija el tipo de institución.']);
      else if (!this.editando && datos.tipo_organizacion === 'Alcaldía') errores.push(['cat-tipo-org', 'Las alcaldías son fijas: no se agregan.']);
      if (!datos.nombre) errores.push(['cat-nombre', 'Escriba el nombre.']);
      else if (mismos.some(c => norm(c.nombre) === norm(datos.nombre))) errores.push(['cat-nombre', 'Ya existe una institución con ese nombre.']);
      if (this.editando && this.esFija(this.editando)) errores.push(['cat-nombre', 'Las alcaldías no se renombran.']);
      return errores;
    }
    // Solicitante: nombre único y tipo de la lista; la clave la pone el sistema
    if (this.tipo === 'solicitante') {
      if (!datos.nombre) errores.push(['cat-nombre', 'Escriba el nombre.']);
      else if (mismos.some(c => norm(c.nombre) === norm(datos.nombre))) errores.push(['cat-nombre', 'Ya existe un solicitante con ese nombre.']);
      if (!SRP.ref.TIPOS_SOLICITANTE.includes(datos.tipo_solicitante)) errores.push(['cat-tipo-sol', 'Elija el tipo de solicitante.']);
      return errores;
    }
    if (!datos.nombre) errores.push(['cat-nombre', 'Escriba el nombre.']);
    else if (mismos.some(c => norm(c.nombre) === norm(datos.nombre))) errores.push(['cat-nombre', 'Ya existe un valor con ese nombre.']);
    if (!this.editando) {
      if (this.tipo === 'especie') { if (!/^ESP-\d{4}$/.test(datos.clave)) errores.push(['cat-clave', 'La clave de especie es ESP-0000.']); }
      else if (!/^[A-Z0-9_]{2,30}$/.test(datos.clave)) errores.push(['cat-clave', 'La clave debe tener de 2 a 30 caracteres: mayúsculas, números o guion bajo.']);
      else if (mismos.some(c => c.clave === datos.clave)) errores.push(['cat-clave', 'Esa clave ya está en uso.']);
    }
    if (this.tipo === 'especie') {
      if (!datos.nombre_cientifico) errores.push(['cat-cientifico', 'Escriba el nombre científico.']);
      else if (!/^[A-ZÁÉÍÓÚ][a-záéíóú-]+ \S+/.test(datos.nombre_cientifico)) errores.push(['cat-cientifico', 'El nombre científico lleva género con inicial mayúscula y epíteto: «Quercus rugosa».']);
      else if (mismos.some(c => norm(c.nombre_cientifico) === norm(datos.nombre_cientifico))) errores.push(['cat-cientifico', 'Ya existe una especie con ese nombre científico.']);
      if (datos.id_enciclovida !== null && !Number.isInteger(datos.id_enciclovida)) errores.push(['cat-enciclovida', 'El id de EncicloVida es un número entero.']);
      if (datos.id_snib && !/^\d+(ANGIO|GIMNO)$/.test(datos.id_snib)) errores.push(['cat-snib', 'El id SNIB es un número seguido de ANGIO o GIMNO: «26796ANGIO».']);
    }
    return errores;
  },

  async guardar() {
    if (!SRP.permisos.exigir('catalogo.administrar')) return;
    const limpio = (id) => this.el(id).value.trim().replace(/\s+/g, ' ');
    const enciclovida = limpio('cat-enciclovida');
    const datos = {
      nombre: limpio('cat-nombre'),
      clave: this.el('cat-clave').value.trim().toUpperCase(),
      nombre_cientifico: limpio('cat-cientifico'),
      tipo_distribucion: this.el('cat-distribucion').value,
      otros_nombres_comunes: limpio('cat-otros-nombres').split(',').map(t => t.trim()).filter(Boolean).join(', '),
      formadecrecimiento: limpio('cat-forma').split(',').map(t => t.trim()).filter(Boolean).join(', '),
      id_snib: limpio('cat-snib').toUpperCase() || null,
      id_enciclovida: enciclovida === '' ? null : (/^\d+$/.test(enciclovida) ? parseInt(enciclovida, 10) : NaN),
      // Vehículos: la placa en mayúsculas; el tipo con inicial mayúscula, como los demás
      modelo: limpio('cat-modelo'),
      tipo_vehiculo: (t => t ? t.charAt(0).toUpperCase() + t.slice(1) : '')(limpio('cat-tipo-vehiculo')),
      tipo_organizacion: this.el('cat-tipo-org').value,
      tipo_solicitante: this.el('cat-tipo-sol').value
    };
    // La clave de una institución nueva la pone el sistema a partir del nombre; no se muestra
    if (this.tipo === 'organizacion') datos.clave = this.editando ? this.editando.clave : this.claveLibre(SRP.util.claveDesdeNombre(datos.nombre) || 'INSTITUCION');
    if (this.tipo === 'solicitante') datos.clave = this.editando ? this.editando.clave : this.claveLibre(SRP.util.claveDesdeNombre(datos.nombre) || 'SOLICITANTE');
    if (this.tipo === 'vehiculo') { datos.nombre = datos.nombre.toUpperCase(); datos.clave = this.editando ? this.editando.clave : this.clavePlaca(datos.nombre); }
    const errores = this.validar(datos);
    if (SRP.util.resumenErrores(this.el('cat-errores'), errores, ['cat-nombre', 'cat-clave'].concat(this.CAMPOS_TIPO, this.CAMPOS_ESPECIE, this.CAMPOS_VEHICULO))) return;   // D140, M15
    const u = SRP.sesion.usuario;
    const ahora = SRP.util.ahoraISO();
    const extra = this.tipo === 'especie' ? {
      nombre_cientifico: datos.nombre_cientifico,
      tipo_distribucion: datos.tipo_distribucion, otros_nombres_comunes: datos.otros_nombres_comunes,
      formadecrecimiento: datos.formadecrecimiento, id_snib: datos.id_snib, id_enciclovida: datos.id_enciclovida
    } : this.tipo === 'vehiculo' ? { modelo: datos.modelo, tipo_vehiculo: datos.tipo_vehiculo }
      : this.tipo === 'organizacion' ? { tipo_organizacion: this.editando ? this.editando.tipo_organizacion : datos.tipo_organizacion }
      : this.tipo === 'solicitante' ? { tipo_solicitante: datos.tipo_solicitante }
      : this.tipo === 'programa' ? { tipos_organizacion: this.tiposMarcados() } : {};
    let item, entrada;
    if (this.editando) {
      const previo = this.editando;
      const valores = Object.assign({ nombre: datos.nombre }, extra);
      const cambiados = Object.keys(valores).filter(k => String(previo[k] ?? '') !== String(valores[k] ?? ''));
      item = Object.assign({}, previo, valores, { editado_por_id: u.id, fecha_ultima_edicion: ahora });
      entrada = SRP.bitacora.entrada('EDITADO', 'catalogo', item.id, 'Campos: ' + (cambiados.join(', ') || 'ninguno'));
    } else {
      // En especies el id es la propia clave ESP-0000: es la llave del catálogo del SIA (D84)
      const id = this.tipo === 'especie' ? datos.clave : SRP.util.generarId();
      item = Object.assign({
        id, tipo: this.tipo, clave: datos.clave, nombre: datos.nombre, activo: true,
        creado_por_id: u.id, fecha_creacion: ahora, editado_por_id: null, fecha_ultima_edicion: null
      }, extra);
      entrada = SRP.bitacora.entrada('CREADO', 'catalogo', item.id, this.tipo + ' ' + item.clave);
    }
    await SRP.almacen.guardarConBitacora('catalogos', item, entrada);
    this.el('dlg-catalogo').close();
    await SRP.ref.recargar();
    SRP.util.anunciar('Catálogo actualizado.');
    this.preparar();
  },

  /* Desactivar se deshace: no pregunta, lo dice el aviso y ofrece «Deshacer» (D139).
     `deshaciendo`: viene de «Deshacer» del aviso; no se vuelve a ofrecer deshacer (D101) */
  async cambiarEstado(item, deshaciendo) {
    if (!SRP.permisos.exigir('catalogo.administrar')) return;
    if (SRP.ref.esSedema(item.id) && item.activo) { SRP.util.anunciar('La Secretaría no se desactiva: sus cuentas administran el sistema.', 'alerta'); return; }
    if (this.esFija(item)) { SRP.util.anunciar('Las alcaldías son fijas: no se desactivan. Para cortar el acceso, desactive sus cuentas.', 'alerta'); return; }
    const activar = !item.activo;
    const nuevo = Object.assign({}, item, { activo: activar, editado_por_id: SRP.sesion.usuario.id, fecha_ultima_edicion: SRP.util.ahoraISO() });
    await SRP.almacen.guardarConBitacora('catalogos', nuevo, SRP.bitacora.entrada(activar ? 'ACTIVADO' : 'DESACTIVADO', 'catalogo', item.id));
    await SRP.ref.recargar();
    const org = item.tipo === 'organizacion';
    const nombre = org ? SRP.ref.nombreOrganizacion(item.id) : item.nombre;
    SRP.util.anunciar(activar ? '«' + nombre + '» ' + (org ? 'activada: sus cuentas vuelven a entrar.' : 'activado.')
      : '«' + nombre + '» ' + (org ? 'desactivada: sus cuentas ya no entran; sus registros se conservan.' : 'desactivado: ya no se ofrece en los formularios; los registros que lo usan no cambian.'),
      'exito', deshaciendo ? null : { deshacer: () => this.cambiarEstado(nuevo, true) });
    this.preparar();
  },

  async eliminar(item) {
    if (!SRP.permisos.exigir('catalogo.administrar')) return;
    await this.preparar();                        // recuenta el uso justo antes de decidir
    const usos = this.usos[item.id];
    if (SRP.ref.totalUsos(usos)) {
      SRP.util.anunciar('No se puede eliminar: aparece en ' + SRP.ref.textoUsos(usos) + '. Desactívelo: eso sí se deshace.', 'alerta');
      return;
    }
    const ok = await SRP.app.confirmar({ titulo: 'Eliminar del catálogo', pregunta: '¿Eliminar «' + item.nombre + '»?',
      puntos: ['No aparece en ningún árbol, jornada ni cuenta.', 'La bitácora conserva la constancia.', 'Si sólo debe dejar de ofrecerse, desactívelo: eso sí se deshace.'],
      irreversible: true, boton: 'Eliminar', icono: 'basura' });
    if (!ok) return;
    await SRP.almacen.borrarConBitacora('catalogos', item.id,
      SRP.bitacora.entrada('ELIMINADO', 'catalogo', item.id, item.tipo + ' ' + item.clave + ': ' + item.nombre));
    await SRP.ref.recargar();
    SRP.util.anunciar('Valor eliminado.');
    this.preparar();
  }
};

// Acciones que escriben en el teléfono: si fallan, se dice qué no se pudo hacer (D149)
SRP.util.proteger(SRP.catalogos, { guardar: 'guardar el catálogo', cambiarEstado: 'cambiar el estado del catálogo', eliminar: 'eliminar del catálogo' });
