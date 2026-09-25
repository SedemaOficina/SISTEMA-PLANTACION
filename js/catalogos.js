/* EDITOR DE CATÁLOGOS (sólo Administración global).
   Regla: un valor con uso no se elimina, se desactiva. Todo cambio va a la bitácora.

   ESPECIES (D84). El catálogo es el real del SIA (assets/catalogo-especies.js): la clave es el
   id_especie ESP-0000, se asigna en consecutivo y no se edita; nombre común y científico son
   obligatorios; tipo de distribución con los cuatro valores del SNIB; otros nombres comunes,
   forma de crecimiento, id SNIB e id EncicloVida son opcionales y viajan con la especie. Género y
   epíteto se derivan del nombre científico al guardar. */
window.SRP = window.SRP || {};

SRP.catalogos = {
  tipo: 'programa', editando: null, usos: {},
  claveTocada: false,   // deja de sugerir en cuanto la persona escribe su propia clave
  ETIQUETA: { programa: 'programa', area: 'área', especie: 'especie' },
  CAMPOS_ESPECIE: ['cat-cientifico', 'cat-distribucion', 'cat-otros-nombres', 'cat-forma', 'cat-snib', 'cat-enciclovida'],

  el(id) { return document.getElementById(id); },

  iniciar() {
    this.el('cat-tipos').addEventListener('click', (e) => {
      const b = e.target.closest('.chip'); if (!b) return;
      this.tipo = b.dataset.tipo;
      this.el('cat-tipos').querySelectorAll('.chip').forEach(c => c.setAttribute('aria-pressed', String(c === b)));
      this.el('cat-buscar').value = '';
      this.preparar();
    });
    this.el('cat-buscar').addEventListener('input', () => this.pintar());
    // La clave se propone a partir del nombre mientras nadie la edite a mano (no en especies: consecutivo fijo)
    this.el('cat-nombre').addEventListener('input', () => {
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
    this.el('cat-forma-botones').addEventListener('click', (e) => {
      const b = e.target.closest('.chip'); if (b) this.alternarForma(b.dataset.forma);
    });
    this.el('form-catalogo').addEventListener('submit', (e) => { e.preventDefault(); this.guardar(); });
    this.el('tabla-catalogo').addEventListener('click', (e) => {
      // Tocar la tarjeta (fuera de la tuerca) abre la edición (D105)
      if (!e.target.closest('.c-acciones, thead')) {
        const tr = e.target.closest('tr[data-id]');
        if (tr) { this.abrirFormulario(SRP.ref.catalogoPorId[tr.dataset.id]); return; }
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
    this.el('caja-cat-buscar').hidden = this.tipo !== 'especie';
    this.el('btn-cat-agregar').innerHTML = SRP.ICONOS.svg('mas', 'medio') + '<span>Agregar ' + this.ETIQUETA[this.tipo] + '</span>';
    this.pintar();
  },

  pintar() {
    const esc = SRP.util.escapar;
    const q = SRP.util.normalizar(this.el('cat-buscar').value);
    const esEspecie = this.tipo === 'especie';
    // «12 árboles y 3 jornadas», «2 cuentas», «Sin uso» (D151)
    const textoUso = (id) => SRP.ref.textoUsos(this.usos[id]) || 'Sin uso';
    const items = SRP.ref.deTipo(this.tipo, false).filter(c => !q || SRP.ref.especieCoincide(c, q));
    const cab = '<thead><tr><th scope="col">' + (esEspecie ? 'Nombre común' : 'Nombre') + '</th>' +
      (esEspecie ? '<th scope="col">Nombre científico</th><th scope="col">Distribución</th>' : '') +
      '<th scope="col">Clave</th><th scope="col">Estado</th><th scope="col">Uso</th><th scope="col">Acciones</th></tr></thead>';
    const filas = items.map(c => {
      const uso = SRP.ref.totalUsos(this.usos[c.id]);
      // Acciones en el menú de la tuerca (D94); Eliminar sólo si no tiene uso
      const items = [{ accion: 'editar', texto: 'Editar', icono: 'lapiz' },
                     { accion: 'estado', texto: c.activo ? 'Desactivar' : 'Activar', icono: c.activo ? 'cerrar' : 'palomita' }];
      if (uso === 0) items.push({ accion: 'eliminar', texto: 'Eliminar', icono: 'basura', peligro: true });
      // data-etiqueta: en teléfono cada renglón se muestra como ficha con su etiqueta
      const estado = '<span class="estado-texto" data-activo="' + c.activo + '">' + (c.activo ? 'Activo' : 'Inactivo') + '</span>';
      // Clases c-*: en teléfono la fila es una tarjeta compacta (D105): título, científico, un
      // renglón de resumen y la tuerca arriba a la derecha; el resto de celdas se oculta ahí
      return '<tr data-id="' + SRP.util.escapar(c.id) + '"><td class="c-titulo" data-etiqueta="Nombre">' + esc(c.nombre) + '</td>' +
        (esEspecie ? '<td class="c-sub" data-etiqueta="Científico"><i>' + esc(c.nombre_cientifico) + '</i>' +
          (c.otros_nombres_comunes ? '<small class="tabla-detalle">También: ' + esc(c.otros_nombres_comunes) + '</small>' : '') +
          '</td><td class="c-movil-oculta" data-etiqueta="Distribución">' + esc(c.tipo_distribucion || '') + '</td>' : '') +
        '<td class="c-movil-oculta" data-etiqueta="Clave">' + esc(c.clave) + '</td>' +
        '<td class="c-movil-oculta" data-etiqueta="Estado">' + estado + '</td>' +
        '<td class="c-movil-oculta" data-etiqueta="Uso">' + textoUso(c.id) + '</td>' +
        '<td class="c-acciones" data-etiqueta="Acciones">' + SRP.ICONOS.menuAcciones(c.id, c.nombre, items) + '</td>' +
        '<td class="c-resumen">' + estado + '<span>' + [esc(c.clave), esEspecie ? esc(c.tipo_distribucion || '') : '', textoUso(c.id)].filter(Boolean).join(' · ') + '</span></td></tr>';
    }).join('');
    this.el('tabla-catalogo').innerHTML = cab + '<tbody>' + (filas || '<tr><td colspan="7">Sin resultados.</td></tr>') + '</tbody>';
    SRP.util.ordenable(this.el('tabla-catalogo'));
    // Cuántos hay y cuántos coinciden (D105)
    const nombres = { programa: ['programa', 'programas'], area: ['área', 'áreas'], especie: ['especie', 'especies'] }[this.tipo];
    const total = SRP.ref.deTipo(this.tipo, false).length;
    const pal = (n) => n === 1 ? nombres[0] : nombres[1];
    // Y cuántos están inactivos (D142): «76 especies · 3 inactivas»
    const inactivos = SRP.ref.deTipo(this.tipo, false).filter(c => !c.activo).length;
    const femenino = this.tipo !== 'programa';
    this.el('cat-cuenta').textContent = (q ? items.length + ' de ' + total + ' ' + pal(total) : total + ' ' + pal(total)) +
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

  // Si la clave propuesta ya existe, agrega _2, _3… hasta encontrar una libre
  claveLibre(base) {
    if (!base) return '';
    const usadas = SRP.ref.catalogos.filter(c => c.tipo === this.tipo).map(c => c.clave);
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
    const esEspecie = this.tipo === 'especie';
    this.el('dlg-catalogo-titulo').textContent = (item ? 'Editar ' : 'Agregar ') + this.ETIQUETA[this.tipo];
    this.el('etq-cat-nombre-texto').textContent = esEspecie ? 'Nombre común' : 'Nombre';
    document.querySelectorAll('.solo-especie').forEach(n => { n.hidden = !esEspecie; });
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
    SRP.util.erroresEnCampos([], ['cat-nombre', 'cat-clave'].concat(this.CAMPOS_ESPECIE));
    this.el('dlg-catalogo').showModal();
  },

  validar(datos) {
    const errores = [];
    const mismos = SRP.ref.deTipo(this.tipo, false).filter(c => !this.editando || c.id !== this.editando.id);
    const norm = SRP.util.normalizar;
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
      id_enciclovida: enciclovida === '' ? null : (/^\d+$/.test(enciclovida) ? parseInt(enciclovida, 10) : NaN)
    };
    const errores = this.validar(datos);
    const caja = this.el('cat-errores');
    SRP.util.erroresEnCampos(errores, ['cat-nombre', 'cat-clave'].concat(this.CAMPOS_ESPECIE));   // D140
    if (errores.length) {
      caja.innerHTML = '<ul>' + errores.map(([id, t]) => '<li><a href="#' + id + '">' + t + '</a></li>').join('') + '</ul>';
      caja.hidden = false; caja.focus();
      return;
    }
    const u = SRP.sesion.usuario;
    const ahora = SRP.util.ahoraISO();
    // Género y epíteto salen del nombre científico: una sola fuente, sin pedirlos aparte
    const extra = this.tipo === 'especie' ? {
      nombre_cientifico: datos.nombre_cientifico,
      genero: datos.nombre_cientifico.split(' ')[0],
      especie: datos.nombre_cientifico.split(' ').slice(1).join(' '),
      tipo_distribucion: datos.tipo_distribucion, otros_nombres_comunes: datos.otros_nombres_comunes,
      formadecrecimiento: datos.formadecrecimiento, id_snib: datos.id_snib, id_enciclovida: datos.id_enciclovida
    } : {};
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
        es_ficticio: SRP.CONFIG.ES_FICTICIO, creado_por_id: u.id, fecha_creacion: ahora, editado_por_id: null, fecha_ultima_edicion: null
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
    const activar = !item.activo;
    const nuevo = Object.assign({}, item, { activo: activar, editado_por_id: SRP.sesion.usuario.id, fecha_ultima_edicion: SRP.util.ahoraISO() });
    await SRP.almacen.guardarConBitacora('catalogos', nuevo, SRP.bitacora.entrada(activar ? 'ACTIVADO' : 'DESACTIVADO', 'catalogo', item.id));
    await SRP.ref.recargar();
    SRP.util.anunciar(activar ? '«' + item.nombre + '» activado.' : '«' + item.nombre + '» desactivado: ya no se ofrece en los formularios; los registros que lo usan no cambian.',
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
