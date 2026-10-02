/* ORIGEN DE LA JORNADA: PROGRAMADA O PEDIDO ESPECIAL. Una jornada puede venir del programa de
   trabajo o de un pedido especial de otra instancia (SOBSE, una alcaldía, otra dependencia). Es un
   dato de la jornada, no del árbol, y no es la institución que ejecuta: quien pide no es quien planta.

   Se captura al iniciar la jornada y se corrige en «Editar jornada»:
     origen                PROGRAMADA (por omisión) o PEDIDO
     solicitante_id        quién lo pide, del catálogo de instituciones; nulo si es otra o si es programada
     solicitante_otro      el nombre, cuando la instancia no está en el catálogo
     pedido_descripcion    de qué se trata, opcional

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
      '<div class="campo"><label for="' + p + '-origen">Origen de la jornada</label><select id="' + p + '-origen">' +
      this.ORIGENES.map(([v, t]) => '<option value="' + v + '">' + esc(t) + '</option>').join('') + '</select>' +
      '<p class="nota ayuda-campo">«Pedido especial» si la jornada la pidió otra instancia (SOBSE, una alcaldía, otra dependencia).</p></div>' +
      '<div class="pedido-datos" id="' + p + '-pedido" hidden>' +
      '<div class="campo"><label for="' + p + '-solicitante">Quién lo solicita <span class="obligatorio" aria-hidden="true">*</span></label><select id="' + p + '-solicitante"></select></div>' +
      '<div class="campo" id="caja-' + p + '-solicitante-otro" hidden><label for="' + p + '-solicitante-otro">Nombre de la instancia <span class="obligatorio" aria-hidden="true">*</span></label>' +
      '<input id="' + p + '-solicitante-otro" maxlength="120" autocomplete="off"></div>' +
      '<div class="campo"><label for="' + p + '-pedido-descripcion">Descripción del pedido <span class="opcional">(opcional)</span></label>' +
      '<input id="' + p + '-pedido-descripcion" maxlength="200" autocomplete="off" placeholder="p. ej. compensación por obra"></div></div>';
    this.el(p, 'origen').addEventListener('change', () => this.ajustar(p));
    this.el(p, 'solicitante').addEventListener('change', () => this.ajustar(p));
  },

  // Las instituciones activas del catálogo, por nombre, y «Otra instancia» al final; `incluir`: la que ya tiene la jornada
  opciones(incluir) {
    const N = id => SRP.ref.nombreOrganizacion(id);
    const lista = SRP.ref.deTipo('organizacion', true).map(o => o.id);
    if (incluir && incluir !== this.OTRA && !lista.includes(incluir) && SRP.ref.catalogoPorId[incluir]) lista.push(incluir);
    return lista.map(id => [id, N(id)]).sort((a, b) => a[1].localeCompare(b[1], 'es')).concat([[this.OTRA, 'Otra instancia']]);
  },

  // Deja el bloque mostrando lo de la jornada `j` (o lo de una jornada nueva)
  poner(p, j) {
    const d = Object.assign(this.vacio(), j ? { origen: j.origen || 'PROGRAMADA', solicitante_id: j.solicitante_id || null, solicitante_otro: j.solicitante_otro || '', pedido_descripcion: j.pedido_descripcion || '' } : {});
    const sel = d.solicitante_id || (d.origen === 'PEDIDO' && d.solicitante_otro ? this.OTRA : '');
    this.el(p, 'origen').value = d.origen;
    this.el(p, 'solicitante').innerHTML = SRP.util.opciones('Seleccione quién lo solicita', this.opciones(d.solicitante_id));
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
    if (this.el(p, 'origen').value !== 'PEDIDO') return [];
    const s = this.el(p, 'solicitante').value;
    if (!s) return [[p + '-solicitante', 'Elija quién solicita el pedido especial.']];
    if (s === this.OTRA && !this.el(p, 'solicitante-otro').value.trim()) return [[p + '-solicitante-otro', 'Escriba el nombre de la instancia que lo solicita.']];
    return [];
  },
  ids(p) { return [p + '-solicitante', p + '-solicitante-otro']; },

  /* ---------- Leerlo ---------- */

  esPedido(j) { return !!j && j.origen === 'PEDIDO'; },
  solicitante(j) { return !this.esPedido(j) ? '' : j.solicitante_id ? SRP.ref.nombreOrganizacion(j.solicitante_id) : (j.solicitante_otro || 'Sin dato'); },
  // La clave del solicitante para filtrar y contar: su id del catálogo o «otra:Nombre»
  clave(j) { return !this.esPedido(j) ? '' : j.solicitante_id || 'otra:' + (j.solicitante_otro || ''); },
  nombreClave(k) { return k.startsWith('otra:') ? (k.slice(5) || 'Sin dato') : SRP.ref.nombreOrganizacion(k); },
  // «Pedido especial · SOBSE», o vacío si es programada
  texto(j) { return this.esPedido(j) ? 'Pedido especial · ' + this.solicitante(j) : ''; },
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
