/* ORIGEN DE LA JORNADA: PROGRAMADA O PEDIDO ESPECIAL. Una jornada puede venir del programa de
   trabajo o de un pedido especial de otra instancia (SOBSE, una alcaldía, otra dependencia). Es un
   dato de la jornada, no del árbol, y no es la institución que ejecuta: quien pide no es quien planta.
   Por eso quien solicita sale de su propio catálogo (Catálogos › Solicitantes), no del de instituciones.

   Se captura al iniciar la jornada y se corrige en «Editar jornada»:
     origen                PROGRAMADA o PEDIDO; se elige a propósito, sin valor por omisión
     solicitante_id        quién lo pide, del catálogo de solicitantes; nulo si es otra o si es programada
     solicitante_otro      el nombre, cuando la instancia no está en el catálogo
     pedido_descripcion    de qué se trata, obligatoria en un pedido especial

   El mismo bloque de campos sirve en las dos pantallas: `montar(caja, p)` lo arma con el prefijo `p`. */
window.SRP = window.SRP || {};

SRP.pedido = {
  ORIGENES: [['PROGRAMADA', 'Programada'], ['PEDIDO', 'Pedido especial']],
  OTRA: '__otra',
  CAMPOS: ['origen', 'solicitante_id', 'solicitante_otro', 'pedido_descripcion'],

  el(p, s) { return document.getElementById(p + '-' + s); },
  vacio() { return { origen: 'PROGRAMADA', solicitante_id: null, solicitante_otro: '', pedido_descripcion: '' }; },

  montar(caja, p) {
    const esc = SRP.util.escapar;
    caja.innerHTML =
      '<div class="campo"><label for="' + p + '-origen">Origen de la jornada <span class="obligatorio" aria-hidden="true">*</span></label><select id="' + p + '-origen" aria-required="true">' +
      '<option value="">Seleccione el origen</option>' + this.ORIGENES.map(([v, t]) => '<option value="' + v + '">' + esc(t) + '</option>').join('') + '</select>' +
      '<p class="nota ayuda-campo">«Pedido especial» si la jornada la pidió otra instancia (SOBSE, una alcaldía, otra dependencia).</p></div>' +
      '<div class="pedido-datos" id="' + p + '-pedido" hidden>' +
      '<div class="campo"><label for="' + p + '-solicitante">Quién lo solicita <span class="obligatorio" aria-hidden="true">*</span></label><select id="' + p + '-solicitante"></select></div>' +
      '<div class="campo" id="caja-' + p + '-solicitante-otro" hidden><label for="' + p + '-solicitante-otro">Nombre de la instancia <span class="obligatorio" aria-hidden="true">*</span></label>' +
      '<input id="' + p + '-solicitante-otro" maxlength="120" autocomplete="off"></div>' +
      '<div class="campo"><label for="' + p + '-pedido-descripcion">Descripción del pedido <span class="obligatorio" aria-hidden="true">*</span></label>' +
      '<input id="' + p + '-pedido-descripcion" maxlength="200" autocomplete="off" placeholder="p. ej. compensación por obra"></div></div>';
    this.el(p, 'origen').addEventListener('change', () => this.ajustar(p));
    this.el(p, 'solicitante').addEventListener('change', () => this.ajustar(p));
  },

  /* Las opciones de «Quién lo solicita»: los solicitantes activos del catálogo, agrupados por tipo y
     por nombre dentro de cada uno, y «Otra instancia» al final. `incluir`: el que ya tiene la
     jornada, aunque esté inactivo, para no perderlo al editar. */
  opciones(incluir) {
    const esc = SRP.util.escapar;
    const lista = SRP.ref.deTipo('solicitante', true);
    const ya = incluir && incluir !== this.OTRA ? SRP.ref.catalogoPorId[incluir] : null;
    if (ya && ya.tipo === 'solicitante' && !lista.includes(ya)) lista.push(ya);
    lista.sort(SRP.ref.ordenSolicitantes);
    const op = (v, t) => '<option value="' + esc(v) + '">' + esc(t) + '</option>';
    const tipos = [...new Set(lista.map(s => s.tipo_solicitante || ''))];
    return op('', 'Seleccione quién lo solicita') +
      tipos.map(t => '<optgroup label="' + esc(t || 'Sin tipo') + '">' + lista.filter(s => (s.tipo_solicitante || '') === t).map(s => op(s.id, s.nombre)).join('') + '</optgroup>').join('') +
      op(this.OTRA, 'Otra instancia');
  },

  /* Deja el bloque mostrando lo de la jornada `j`. En una jornada nueva el origen queda sin
     elegir: quien la inicia lo marca a propósito. */
  poner(p, j) {
    const d = Object.assign(this.vacio(), j ? { origen: j.origen || 'PROGRAMADA', solicitante_id: j.solicitante_id || null, solicitante_otro: j.solicitante_otro || '', pedido_descripcion: j.pedido_descripcion || '' } : {});
    const sel = d.solicitante_id || (d.origen === 'PEDIDO' && d.solicitante_otro ? this.OTRA : '');
    this.el(p, 'origen').value = j ? d.origen : '';
    this.el(p, 'solicitante').innerHTML = this.opciones(d.solicitante_id);
    this.el(p, 'solicitante').value = sel;
    this.el(p, 'solicitante-otro').value = d.solicitante_otro;
    this.el(p, 'pedido-descripcion').value = d.pedido_descripcion;
    this.ajustar(p);
  },

  ajustar(p) {
    const pedido = this.el(p, 'origen').value === 'PEDIDO';
    this.el(p, 'pedido').hidden = !pedido;
    document.getElementById('caja-' + p + '-solicitante-otro').hidden = !(pedido && this.el(p, 'solicitante').value === this.OTRA);
  },

  // Lo que se guarda: programada deja los datos del pedido vacíos
  leer(p) {
    if (this.el(p, 'origen').value !== 'PEDIDO') return this.vacio();
    const s = this.el(p, 'solicitante').value, otra = s === this.OTRA;
    return { origen: 'PEDIDO', solicitante_id: otra || !s ? null : s, solicitante_otro: otra ? this.el(p, 'solicitante-otro').value.trim() : '',
      pedido_descripcion: this.el(p, 'pedido-descripcion').value.trim() };
  },

  // Los errores del bloque: [id del campo, mensaje]
  errores(p) {
    const origen = this.el(p, 'origen').value;
    if (!origen) return [[p + '-origen', 'Elija el origen de la jornada: programada o pedido especial.']];
    if (origen !== 'PEDIDO') return [];
    const s = this.el(p, 'solicitante').value;
    if (!s) return [[p + '-solicitante', 'Elija quién solicita el pedido especial.']];
    if (s === this.OTRA && !this.el(p, 'solicitante-otro').value.trim()) return [[p + '-solicitante-otro', 'Escriba el nombre de la instancia que lo solicita.']];
    if (!this.el(p, 'pedido-descripcion').value.trim()) return [[p + '-pedido-descripcion', 'Escriba de qué se trata el pedido especial.']];
    return [];
  },
  ids(p) { return [p + '-origen', p + '-solicitante', p + '-solicitante-otro', p + '-pedido-descripcion']; },

  /* ---------- Leerlo ---------- */

  esPedido(j) { return !!j && j.origen === 'PEDIDO'; },
  solicitante(j) { return !this.esPedido(j) ? '' : j.solicitante_id ? SRP.ref.nombreSolicitante(j.solicitante_id) : (j.solicitante_otro || 'Sin dato'); },
  // La clave del solicitante para filtrar y contar: su id del catálogo o «otra:Nombre»
  clave(j) { return !this.esPedido(j) ? '' : j.solicitante_id || 'otra:' + (j.solicitante_otro || ''); },
  nombreClave(k) { return k.startsWith('otra:') ? (k.slice(5) || 'Sin dato') : SRP.ref.nombreSolicitante(k); },
  // Una alcaldía se nombra con su tipo: «Iztapalapa» sola se lee como el lugar de la jornada
  solicitanteCompleto(j) {
    const s = j && j.solicitante_id ? SRP.ref.catalogoPorId[j.solicitante_id] : null;
    return (s && s.tipo_solicitante === 'Alcaldía' ? 'Alcaldía ' : '') + this.solicitante(j);
  },
  // «Pedido especial · Solicita: SOBSE», o vacío si es programada
  texto(j) { return this.esPedido(j) ? 'Pedido especial · Solicita: ' + this.solicitanteCompleto(j) : ''; },
  textoOrigen(j) { return this.esPedido(j) ? 'Pedido especial' : 'Programada'; },
  /* El filtro «Origen»: una sola lista con «Programada», «Pedido especial (todos)» y cada solicitante.
     Una jornada de pedido responde a dos valores: el de todos los pedidos y el de su solicitante. */
  clavesFiltro(j) { return this.esPedido(j) ? ['PEDIDO', 'PEDIDO:' + this.clave(j)] : ['PROGRAMADA']; },
  textoFiltro(v) { return v === 'PROGRAMADA' ? 'Programada' : v === 'PEDIDO' ? 'Pedido especial (todos)' : 'Pedido especial · ' + this.nombreClave(String(v).slice(7)); },
  ordenFiltro(a, b) { const n = v => v === 'PROGRAMADA' ? 0 : v === 'PEDIDO' ? 1 : 2; return n(a) - n(b) || SRP.pedido.textoFiltro(a).localeCompare(SRP.pedido.textoFiltro(b), 'es'); },
  paresFiltro(valores) { return [...valores].sort(this.ordenFiltro).map(v => [v, this.textoFiltro(v)]); },
  cumpleFiltro(j, v) { return !v || this.clavesFiltro(j).includes(v); },

  // La marca de una tarjeta
  insignia(j) { return this.esPedido(j) ? '<span class="pedido-insignia">' + SRP.ICONOS.svg('correo', 'chico') + '<span>' + SRP.util.escapar(this.texto(j)) + '</span></span>' : ''; }
};
