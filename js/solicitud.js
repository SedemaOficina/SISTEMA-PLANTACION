/* SOLICITUD. Una jornada puede atender una solicitud de otra instancia (SOBSE, una alcaldía, otra
   dependencia) en lugar de un programa de trabajo. Se dice en el propio programa: «Solicitud» es una
   opción de la lista Programa, y al elegirla se piden quién lo solicita y de qué se trata.
   Quien solicita no es quien planta: sale de su propio catálogo (Catálogos › Solicitantes), no del de
   instituciones.

   Es un dato de la jornada. Se captura al iniciarla y se corrige en «Editar jornada»:
     programa_id            el programa «Solicitud» (SRP.CONFIG.PROGRAMA_SOLICITUD)
     solicitante_id         quién lo solicita, del catálogo de solicitantes; nulo si es otra instancia
     solicitante_otro       el nombre, cuando la instancia no está en el catálogo
     solicitud_descripcion  de qué se trata; obligatoria, en varios renglones

   El mismo bloque sirve en las dos pantallas: `montar(caja, p)` lo arma con el prefijo `p` y lo
   muestra según lo elegido en la lista `p-programa`. */
window.SRP = window.SRP || {};

SRP.solicitud = {
  OTRA: '__otra',
  CAMPOS: ['solicitante_id', 'solicitante_otro', 'solicitud_descripcion'],
  LARGO_DESCRIPCION: 500,

  el(p, s) { return document.getElementById(p + '-' + s); },
  programa() { return SRP.CONFIG.PROGRAMA_SOLICITUD; },
  vacio() { return { solicitante_id: null, solicitante_otro: '', solicitud_descripcion: '' }; },

  montar(caja, p) {
    caja.innerHTML =
      '<div class="solicitud-datos" id="' + p + '-solicitud" hidden>' +
      '<div class="campo"><label for="' + p + '-solicitante">Quién lo solicita <span class="obligatorio" aria-hidden="true">*</span></label><select id="' + p + '-solicitante"></select></div>' +
      '<div class="campo" id="caja-' + p + '-solicitante-otro" hidden><label for="' + p + '-solicitante-otro">Nombre de la instancia <span class="obligatorio" aria-hidden="true">*</span></label>' +
      '<input id="' + p + '-solicitante-otro" maxlength="120" autocomplete="off"></div>' +
      '<div class="campo"><label for="' + p + '-solicitud-descripcion">Descripción de la solicitud <span class="obligatorio" aria-hidden="true">*</span></label>' +
      '<textarea id="' + p + '-solicitud-descripcion" rows="3" maxlength="' + this.LARGO_DESCRIPCION + '" autocomplete="off" placeholder="p. ej. compensación por obra en el camellón; oficio de la alcaldía"></textarea></div></div>';
    this.el(p, 'programa').addEventListener('change', () => this.ajustar(p));
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

  /* Deja el bloque mostrando lo de la jornada `j` (o vacío, en una jornada nueva). Se llama con la
     lista de programas ya puesta: de ella depende que el bloque se vea. */
  poner(p, j) {
    const d = Object.assign(this.vacio(), j ? { solicitante_id: j.solicitante_id || null, solicitante_otro: j.solicitante_otro || '', solicitud_descripcion: j.solicitud_descripcion || '' } : {});
    this.el(p, 'solicitante').innerHTML = this.opciones(d.solicitante_id);
    this.el(p, 'solicitante').value = d.solicitante_id || (d.solicitante_otro ? this.OTRA : '');
    this.el(p, 'solicitante-otro').value = d.solicitante_otro;
    this.el(p, 'solicitud-descripcion').value = d.solicitud_descripcion;
    this.ajustar(p);
  },

  elegida(p) { return this.el(p, 'programa').value === this.programa(); },
  ajustar(p) {
    const es = this.elegida(p);
    this.el(p, 'solicitud').hidden = !es;
    document.getElementById('caja-' + p + '-solicitante-otro').hidden = !(es && this.el(p, 'solicitante').value === this.OTRA);
  },

  // Lo que se guarda: con otro programa, los datos de la solicitud quedan vacíos
  leer(p) {
    if (!this.elegida(p)) return this.vacio();
    const s = this.el(p, 'solicitante').value, otra = s === this.OTRA;
    return { solicitante_id: otra || !s ? null : s, solicitante_otro: otra ? this.el(p, 'solicitante-otro').value.trim() : '',
      solicitud_descripcion: this.el(p, 'solicitud-descripcion').value.trim() };
  },

  // Los errores del bloque: [id del campo, mensaje]
  errores(p) {
    if (!this.elegida(p)) return [];
    const s = this.el(p, 'solicitante').value;
    if (!s) return [[p + '-solicitante', 'Elija quién lo solicita.']];
    if (s === this.OTRA && !this.el(p, 'solicitante-otro').value.trim()) return [[p + '-solicitante-otro', 'Escriba el nombre de la instancia que lo solicita.']];
    if (!this.el(p, 'solicitud-descripcion').value.trim()) return [[p + '-solicitud-descripcion', 'Escriba de qué se trata la solicitud.']];
    return [];
  },
  ids(p) { return [p + '-solicitante', p + '-solicitante-otro', p + '-solicitud-descripcion']; },

  /* ---------- Leerlo ---------- */

  es(j) { return !!j && j.programa_id === this.programa(); },
  solicitante(j) { return !this.es(j) ? '' : j.solicitante_id ? SRP.ref.nombreSolicitante(j.solicitante_id) : (j.solicitante_otro || 'Sin dato'); },
  // La clave del solicitante para contar: su id del catálogo o «otra:Nombre»
  clave(j) { return !this.es(j) ? '' : j.solicitante_id || 'otra:' + (j.solicitante_otro || ''); },
  nombreClave(k) { return k.startsWith('otra:') ? (k.slice(5) || 'Sin dato') : SRP.ref.nombreSolicitante(k); },
  // Una alcaldía se nombra con su tipo: «Iztapalapa» sola se lee como el lugar de la jornada
  solicitanteCompleto(j) {
    const s = j && j.solicitante_id ? SRP.ref.catalogoPorId[j.solicitante_id] : null;
    return (s && s.tipo_solicitante === 'Alcaldía' ? 'Alcaldía ' : '') + this.solicitante(j);
  },
  // «Solicita: SOBSE», o vacío si la jornada es de otro programa. El programa ya dice que es una solicitud
  texto(j) { return this.es(j) ? 'Solicita: ' + this.solicitanteCompleto(j) : ''; },

  // La marca de una tarjeta
  insignia(j) { return this.es(j) ? '<span class="solicitud-insignia">' + SRP.ICONOS.svg('correo', 'chico') + '<span>' + SRP.util.escapar(this.texto(j)) + '</span></span>' : ''; }
};
