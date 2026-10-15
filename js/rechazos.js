/* LO QUE EL SERVIDOR NO ACEPTÓ, con datos reales. Cada cambio rechazado se queda en el teléfono con su motivo
   (js/cola.js) y no se vuelve a enviar solo. La franja de arriba lo dice y «Revisar» abre esta ventana: de qué
   registro es cada cambio, qué se cambió, por qué no lo aceptó el servidor y qué se puede hacer con él.
     · Alguien más cambió el registro antes: enviar el cambio otra vez, sobre lo que hay ahora, o quedarse con
       lo del servidor.
     · Los datos no pasan: corregirlos —al guardar se vuelve a enviar— o, si nunca llegó, eliminarlo.
     · Falló el servidor: enviarlo otra vez.
     · Lo demás —sin permiso, el registro ya no está o ya cambió de estado— no se puede hacer: se descarta y el
       registro del teléfono vuelve a como está en el servidor.
   Eliminar y descartar borran lo que hizo la persona: piden confirmación y van con el borde rojo. */
window.SRP = window.SRP || {};

SRP.rechazos = {
  el(id) { return document.getElementById(id); },

  // Qué se quiso hacer, en palabras
  QUE: {
    'jornada.crear': 'Inicio de la jornada',
    'jornada.cerrar': 'Cierre de la jornada',
    'jornada.reabrir': 'Reapertura de la jornada',
    'jornada.revisar': 'Puntos revisados en el mapa',
    'jornada.cierre': 'Datos del cierre: encargado, personal y vehículo',
    'jornada.reporte': 'Entrega del reporte',
    'jornada.eliminar': 'Eliminar la jornada',
    'registro.eliminar': 'Eliminar el árbol',
    'registro.restaurar': 'Restaurar el árbol',
    foto: 'Fotografía nueva del árbol'
  },
  // Los campos de una corrección, como los dice el formulario
  CAMPOS: {
    lat: 'ubicación', lng: 'ubicación', punto_origen: 'ubicación', gps_precision_m: 'ubicación', especie_id: 'especie', especie_otra: 'especie',
    fecha_plantacion: 'fecha de plantación', comentarios: 'comentarios', foto_id: 'fotografía', nombre: 'nombre', ubicacion: 'dirección',
    programa_id: 'programa', arboles_previstos: 'árboles previstos', fecha: 'fecha', solicitante_id: 'solicitud', solicitante_otro: 'solicitud',
    solicitud_descripcion: 'solicitud'
  },
  // Lo que puede volver a intentarse tal cual: el servidor falló, no los datos
  DEL_SERVIDOR: ['ERROR_INTERNO', 'SIN_RESPUESTA', 'ERROR'],

  iniciar() {
    this.el('lista-rechazos').addEventListener('click', (e) => {
      const b = e.target.closest('button[data-accion]');
      const o = b && SRP.cola.ops.find(x => String(x.n) === b.closest('[data-n]').dataset.n);
      if (o) this.hacer(b.dataset.accion, o, b);
    });
  },

  async abrir() {
    await this.pintar();
    const d = this.el('dlg-rechazos');
    if (!d.open) d.showModal();
  },

  /* ---------- Cada cambio ---------- */

  async registroDe(o) { return (await SRP.almacen.unoLocal(o.tabla, o.registro_id)) || SRP.remoto.uno(o.tabla, o.registro_id) || null; },

  titulo(o, r) {
    if (o.tabla === 'jornadas') return 'Jornada «' + (r && r.nombre || 'sin nombre') + '»';
    if (!r) return 'Árbol';
    return SRP.ref.especieDe(r).comun + ' · ' + (SRP.folio.valido(r.folio) ? r.folio : 'nuevo, sin folio');
  },

  async que(o, r) {
    const jornada = async id => { const j = id ? await SRP.almacen.uno('jornadas', id) : null; return j ? '«' + (j.nombre || 'sin nombre') + '»' : ''; };
    if (o.tipo === 'registro.crear') { const j = await jornada(r && r.jornada_id); return 'Alta del árbol' + (j ? ', en la jornada ' + j : ''); }
    if (o.tipo === 'registro.sustituir') {
      const x = r && r.sustituye_id ? await SRP.almacen.uno('plantaciones', r.sustituye_id) : null;
      return 'Alta del sustituto' + (x ? ' de ' + SRP.ref.especieDe(x).comun + ' (' + SRP.folio.texto(x) + ')' : '');
    }
    if (o.tipo === 'registro.mover') { const j = await jornada(r && r.jornada_id); return 'Pasarlo a otra jornada' + (j ? ': ' + j : ''); }
    if (o.tipo === 'jornada.relevo') return 'Relevo: pasarla a otro cabo' + (r && r.relevo_id ? ': ' + SRP.ref.nombreUsuario(r.relevo_id) : '');
    if (SRP.cola.EDICIONES.includes(o.tipo)) {
      const antes = o.antes || {};
      const campos = r ? [...new Set(SRP.cola.CAMPOS[o.tabla].filter(k => !SRP.cola.igual(r[k], antes[k])).map(k => this.CAMPOS[k] || k))] : [];
      return 'Corrección' + (campos.length ? ': ' + campos.join(', ') : '');
    }
    return this.QUE[o.tipo] || o.tipo;
  },

  // Por qué: el motivo de cada campo, si el servidor lo dio; si otra persona lo cambió, quién y cuándo
  porque(o) {
    const x = o.rechazo;
    if (x.codigo === 'VERSION_VIEJA') {
      const f = x.fila || {}, quien = f.editado_por_id && SRP.ref.usuarioPorId[f.editado_por_id];
      const cuando = f.fecha_ultima_edicion ? ', ' + SRP.envio.cuando(f.fecha_ultima_edicion) : '';
      // Con la misma cuenta, desde otro teléfono
      if (f.editado_por_id && f.editado_por_id === o.usuario_id) return 'Este registro se cambió antes desde otro teléfono, con su cuenta' + cuando + '.';
      return 'Alguien más cambió este registro antes' + (quien ? ': ' + SRP.util.nombreCompleto(quien) : '') + cuando + '.';
    }
    const errores = (x.errores || []).map(e => e[1]).filter(Boolean);
    return errores.length ? errores.join(' ') : x.mensaje || 'El servidor no dijo por qué.';
  },

  // Los botones que tocan a cada caso: [acción, texto, clase, icono]
  botones(o, r, conArboles) {
    const alta = SRP.cola.ALTAS.includes(o.tipo), codigo = o.rechazo.codigo, jornada = o.tabla === 'jornadas';
    const quitar = alta
      ? (conArboles ? null : ['eliminar', jornada ? 'Eliminar esta jornada' : 'Eliminar este registro', 'btn-peligro-linea', 'basura'])
      : ['descartar', 'Descartar mi cambio', 'btn-peligro-linea', 'cerrar'];
    if (codigo === 'VERSION_VIEJA') return [['reenviar', 'Enviar mi cambio otra vez', 'btn-primario', 'senal'], ['servidor', 'Quedarme con lo del servidor', 'btn-secundario', 'palomita']];
    const corregible = r && o.tipo !== 'foto' && (alta || SRP.cola.EDICIONES.includes(o.tipo)) && (codigo === 'DATOS_INVALIDOS' || (alta && jornada));
    return [
      this.DEL_SERVIDOR.includes(codigo) ? ['reenviar', 'Enviar otra vez', 'btn-primario', 'senal'] : null,
      corregible ? ['corregir', 'Corregir', this.DEL_SERVIDOR.includes(codigo) ? 'btn-secundario' : 'btn-primario', 'lapiz'] : null,
      quitar
    ].filter(Boolean);
  },

  async pintar() {
    const esc = SRP.util.escapar, lista = this.el('lista-rechazos');
    const items = [];
    for (const o of SRP.cola.rechazadas()) {
      const r = await this.registroDe(o);
      // Una jornada que nunca llegó no se elimina con árboles en el teléfono
      const conArboles = o.tipo === 'jornada.crear' && (await SRP.almacen.porIndiceLocal('plantaciones', 'jornada_id', o.registro_id)).length > 0;
      const botones = this.botones(o, r, conArboles);
      items.push('<li class="rechazo" data-n="' + esc(String(o.n)) + '"><h3>' + esc(this.titulo(o, r)) + '</h3>' +
        '<p class="rechazo-que">' + esc(await this.que(o, r)) + '</p>' +
        '<p class="rechazo-porque"><b>Por qué:</b> ' + esc(this.porque(o)) + '</p>' +
        (o.rechazo.codigo === 'VERSION_VIEJA' ? '<p class="nota">«Enviar mi cambio otra vez» lo aplica sobre lo que hay ahora; «Quedarme con lo del servidor» lo deja como lo cambió la otra persona.</p>' : '') +
        (conArboles ? '<p class="nota">Tiene árboles en este teléfono: corríjala para que se envíe con ellos.</p>' : '') +
        '<div class="fila-botones">' + botones.map(([a, t, c, i]) => '<button type="button" class="btn ' + c + '" data-accion="' + a + '">' + SRP.ICONOS.svg(i, 'medio') + '<span>' + esc(t) + '</span></button>').join('') + '</div></li>');
    }
    lista.innerHTML = items.join('');
  },

  /* ---------- Lo que decide la persona ---------- */

  async hacer(accion, o, b) {
    const r = await this.registroDe(o);
    if (accion === 'corregir') return this.corregir(o);
    if (accion === 'eliminar' && !(await this.confirmarEliminar(o, r))) return;
    if (accion === 'descartar' && !(await this.confirmarDescartar(o))) return;
    const libre = SRP.util.ocupado(b, accion === 'reenviar' ? 'Enviando…' : 'Un momento…');
    try {
      if (accion === 'reenviar') await this.reenviar(o);
      if (accion === 'servidor') {
        await SRP.cola.descartar(o);
        SRP.util.anunciar('Listo: el registro queda como lo tiene el servidor.', 'exito');
      }
      if (accion === 'descartar') {
        await SRP.cola.descartar(o);
        SRP.util.anunciar('Cambio descartado: el registro queda como lo tiene el servidor.', 'exito');
      }
      if (accion === 'eliminar') {
        if (o.tabla === 'jornadas' && SRP.activa.jornada && SRP.activa.jornada.id === o.registro_id) SRP.activa.jornada = null;
        await SRP.cola.eliminarAlta(o);
        SRP.util.anunciar(o.tabla === 'jornadas' ? 'Jornada eliminada de este teléfono.' : 'Registro eliminado de este teléfono.', 'exito');
      }
    } finally { libre(); }
    await this.despues();
  },

  async reenviar(o) {
    await SRP.cola.reenviar(o);
    if (!SRP.conexion.enLinea()) { SRP.util.anunciar('Sin conexión: su cambio se enviará solo cuando haya señal.', 'aviso'); return; }
    // Si ya había un envío en curso, éste sale en el siguiente
    for (let i = 0; i < 2 && SRP.cola.ops.includes(o) && !o.rechazo; i++) await SRP.envio.enviar({ silencioso: true });
    // Si el servidor tampoco lo acepta esta vez, el envío ya lo dijo
    if (!SRP.cola.ops.includes(o)) SRP.util.anunciar('Su cambio llegó al servidor. Recepción confirmada.', 'exito');
  },

  // Al formulario del árbol o a la edición de la jornada; al guardar, se vuelve a enviar
  async corregir(o) {
    const r = await SRP.almacen.unoLocal(o.tabla, o.registro_id);
    if (!r) return;
    this.el('dlg-rechazos').close();
    if (o.tabla === 'plantaciones') SRP.formulario.editar(r);
    else SRP.jornadas.abrirEditar(r, SRP.app.vista === 'registrar');
  },

  confirmarEliminar(o, r) {
    const sust = o.tipo === 'registro.sustituir';
    return SRP.app.confirmar({
      titulo: o.tabla === 'jornadas' ? 'Eliminar la jornada' : 'Eliminar el registro',
      pregunta: '¿Eliminar ' + (o.tabla === 'jornadas' ? 'la jornada «' + (r && r.nombre || 'sin nombre') + '»' : 'el ' + (r ? SRP.ref.especieDe(r).comun : 'árbol')) + ' de este teléfono?',
      puntos: ['Nunca llegó al servidor: se borra del teléfono' + (o.tabla === 'plantaciones' ? ', con su fotografía.' : '.'),
        sust ? 'El árbol que sustituía vuelve a contar como plantado.' : ''],
      irreversible: true, boton: 'Eliminar', icono: 'basura'
    });
  },

  confirmarDescartar(o) {
    return SRP.app.confirmar({
      titulo: 'Descartar el cambio', pregunta: '¿Descartar su cambio?',
      puntos: [o.tipo === 'foto' ? 'La fotografía no llega al servidor: el árbol sigue sin ella.' : 'El registro queda como lo tiene el servidor.'],
      irreversible: true, boton: 'Descartar', icono: 'basura'
    });
  },

  // Todo lo que enseña el envío se pone al día; sin nada más que revisar, la ventana se cierra
  async despues() {
    await SRP.envio.alCambiar();
    const v = SRP.app.vista;
    if (['registros', 'jornadas', 'supervision'].includes(v)) SRP.app.mostrarVista(v, true);
    else if (v === 'registrar' && !SRP.formulario.estado.editando) await SRP.activa.preparar();
    if (!SRP.cola.rechazadas().length) { if (this.el('dlg-rechazos').open) this.el('dlg-rechazos').close(); return; }
    await this.pintar();
  }
};
