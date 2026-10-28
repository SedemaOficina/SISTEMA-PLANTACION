/* LA CALLE DE CADA ÁRBOL. La pone el servidor al recibir el árbol y cada vez que se corrige su punto, con la capa
   de calles de la Ciudad de México (territorio.calles, paquete calles-cdmx): el tramo más cercano, a 40 m o menos,
   entre qué calles va, su red vial y quién la atiende (servidor/db/srp/09-srp-calles.sql). La capa de toda la
   Ciudad no cabe en el teléfono: el teléfono la enseña y la cuenta en los informes. La jornada no lleva calle.

   Con datos de prueba no hay servidor: el servidor simulado la calcula al enviar, con las mismas reglas, sobre la
   copia ligera de assets/calles/ (herramientas/generar_calles.py), que se baja por celdas de unos 4 km. */
window.SRP = window.SRP || {};

SRP.calles = {
  ESTADOS: ['ok', 'lejos'],
  REDES: ['primaria', 'secundaria', 'carretera o camino'],
  TITULO: { primaria: 'Vialidades primarias', secundaria: 'Calles secundarias', 'carretera o camino': 'Carreteras y caminos' },
  RADIO_M: 40,
  ESQUINA_M: 4,
  SIN_NOMBRE: 'calle sin nombre',
  // Los campos que pone el servidor; nulos mientras no se calcula
  CAMPOS: ['calle_estado', 'calle_clave', 'calle_version', 'calle', 'calle_entre_1', 'calle_entre_2', 'calle_esquina', 'vialidad_red', 'vialidad_tipo',
    'calle_atiende', 'calle_llave', 'calle_distancia_m'],

  // Los campos de la calle vacíos: al corregir el punto, hasta que el servidor la vuelva a calcular
  vacia() { return Object.fromEntries(this.CAMPOS.map(k => [k, null])); },

  // «entre A y B»; con una sola esquina, o con la misma calle en las dos, «a la altura de A»
  entre(r) {
    const a = r.calle_entre_1, b = r.calle_entre_2;
    return a && b && a !== b ? 'entre ' + a + ' y ' + b : a || b ? 'a la altura de ' + (a || b) : '';
  },

  // «Calle secundaria · Alcaldía Benito Juárez», «Vía de acceso controlado · Gobierno de CDMX»
  textoRed(r) {
    const red = r.vialidad_red === 'primaria' ? (r.vialidad_tipo === 'Vía de acceso controlado' ? 'Vía de acceso controlado' : 'Vialidad primaria')
      : r.vialidad_red === 'carretera o camino' ? 'Carretera o camino' : 'Calle secundaria';
    return red + ' · ' + (r.calle_atiende || 'quién la atiende, por confirmar');
  },

  // El renglón «Calle» del detalle del árbol
  htmlFicha(r) {
    const esc = SRP.util.escapar;
    if (r.calle_estado === 'lejos') return 'Sin calle a menos de ' + this.RADIO_M + ' m<span class="revision-sub">Parque, camellón ancho o interior de un predio</span>';
    if (r.calle_estado !== 'ok') return '<span class="folio-provisional">Se asigna al enviar</span>';
    return esc(r.calle) +
      (this.entre(r) ? '<span class="revision-sub">' + esc(this.entre(r)) + '</span>' : '') +
      (r.calle_esquina ? '<span class="revision-sub">Junto a la esquina con ' + esc(r.calle_esquina) + '</span>' : '') +
      '<span class="revision-sub calle-red" data-red="' + esc(r.vialidad_red) + '">' + esc(this.textoRed(r)) + '</span>';
  },

  // La celda «Calle» de la tabla de ejemplares del reporte
  textoCelda(r) {
    if (r.calle_estado === 'lejos') return 'Sin calle a menos de ' + this.RADIO_M + ' m';
    if (r.calle_estado !== 'ok') return 'Se asigna al enviar';
    return r.calle + (this.entre(r) ? ', ' + this.entre(r) : '') + (r.vialidad_red === 'primaria' ? ' (vialidad primaria)' : '');
  },

  // La red vial como se escribe en el CSV: «Vialidad primaria», «Calle secundaria» o «Carretera o camino»
  textoRedCorta(r) {
    return r.calle_estado !== 'ok' ? '' : r.vialidad_red === 'primaria' ? 'Vialidad primaria' : r.vialidad_red === 'carretera o camino' ? 'Carretera o camino' : 'Calle secundaria';
  },

  /* LAS CUADRAS DE UNA CALLE, JUNTAS. Cada árbol dice entre qué dos calles está su cuadra; las cuadras que se tocan
     (comparten la calle que las cruza) se juntan en un tramo: «entre Nicolás San Juan y Aniceto Ortega» y «entre
     Aniceto Ortega y Gabriel Mancera» son «entre Nicolás San Juan y Gabriel Mancera». Si no forman una línea, se dice
     cada cuadra. El tramo con más árboles va primero. */
  tramos(regs) {
    const cuadras = new Map(), altura = new Map();
    regs.forEach(r => {
      const a = r.calle_entre_1, b = r.calle_entre_2;
      if (a && b && a !== b) { const k = [a, b].sort().join('|'); cuadras.set(k, (cuadras.get(k) || 0) + 1); }
      else if (a || b) altura.set(a || b, (altura.get(a || b) || 0) + 1);
    });
    const vecinos = new Map(), une = (x, y) => (vecinos.get(x) || vecinos.set(x, new Set()).get(x)).add(y);
    [...cuadras.keys()].forEach(k => { const [a, b] = k.split('|'); une(a, b); une(b, a); });
    const vistos = new Set(), salida = [];
    for (const inicio of vecinos.keys()) {
      if (vistos.has(inicio)) continue;
      const grupo = [inicio]; vistos.add(inicio);
      for (let i = 0; i < grupo.length; i++) vecinos.get(grupo[i]).forEach(y => { if (!vistos.has(y)) { vistos.add(y); grupo.push(y); } });
      const suyas = [...cuadras].filter(([k]) => grupo.includes(k.split('|')[0]));
      const puntas = grupo.filter(x => vecinos.get(x).size === 1);
      if (puntas.length === 2 && grupo.every(x => vecinos.get(x).size <= 2)) salida.push({ texto: 'entre ' + puntas[0] + ' y ' + puntas[1], n: suyas.reduce((s, [, c]) => s + c, 0) });
      else suyas.forEach(([k, c]) => salida.push({ texto: 'entre ' + k.replace('|', ' y '), n: c }));
      grupo.forEach(x => altura.delete(x));   // «a la altura de» una calle que ya cierra una cuadra no se repite
    }
    altura.forEach((c, x) => salida.push({ texto: 'a la altura de ' + x, n: c }));
    return salida.sort((p, q) => q.n - p.n || p.texto.localeCompare(q.texto, 'es')).map(x => x.texto);
  },

  // Las colonias de una calle, hasta tres: «Del Valle V, Del Valle IV y 2 más»
  colonias(lista) {
    return lista.slice(0, 3).join(', ') + (lista.length > 3 ? ' y ' + (lista.length - 3) + ' más' : '');
  },

  // Quién atiende un grupo de calles, en pocas palabras: «Gobierno de CDMX», «Alcaldía Benito Juárez y 2 más»
  quienes(lista) {
    return lista.length ? lista[0] + (lista.length === 2 ? ' y ' + lista[1] : lista.length > 2 ? ' y ' + (lista.length - 1) + ' más' : '') : '—';
  },

  // De dónde sale la calle, para el pie del informe y de Supervisión
  nota(versiones) {
    const v = (versiones || []).filter(Boolean);
    return 'La calle la pone el sistema con la capa de calles de la Ciudad de México' + (v.length ? ' (versión ' + v.join(', ') + ')' : '') +
      ': el tramo más cercano al árbol, a ' + this.RADIO_M + ' m o menos, con su red vial y quién lo atiende. Elaborada por SEDEMA con información del INEGI ' +
      '(Marco Geoestadístico, Encuesta Intercensal 2025; Red Nacional de Caminos 2025) y de SEMOVI (Vialidades primarias, CC BY 4.0, y el acuerdo de ' +
      'clasificación de vialidades de 2024).';
  },

  /* ---------- SERVIDOR SIMULADO: sólo con datos de prueba ---------- */
  simulado() { return !!SRP.CONFIG.ES_FICTICIO; },
  _indice: null,
  _celdas: new Map(),

  async indice() {
    if (!this._indice) {
      const r = await fetch('assets/calles/indice.json?v=' + encodeURIComponent(SRP.CONFIG.VERSION));
      if (!r.ok) throw new Error('No se pudo leer el índice de la capa de calles (' + r.status + ')');
      const x = await r.json();
      this._indice = Object.assign(x, { hay: new Set(x.celdas) });
    }
    return this._indice;
  },

  // Los tramos de una celda, con su trazo en grados y su recuadro; null si la celda no tiene tramos
  async celda(i, j) {
    const k = i + '_' + j;
    if (this._celdas.has(k)) return this._celdas.get(k);
    const ind = await this.indice();
    let tramos = null;
    if (ind.hay.has(k)) {
      const r = await fetch('assets/calles/c' + k + '.json?v=' + encodeURIComponent(ind.version));
      if (!r.ok) throw new Error('No se pudo leer la celda ' + k + ' de la capa de calles (' + r.status + ')');
      const c = await r.json(), t = c.textos, e = ind.escala;
      tramos = c.tramos.map(([clave, n, a, b, red, tipo, at, ll, trazos]) => {
        const lineas = trazos.map(p => {
          const xy = [p[0], p[1]];
          for (let q = 2; q < p.length; q += 2) xy.push(xy[q - 2] + p[q], xy[q - 1] + p[q + 1]);
          return xy.map(v => v / e);
        });
        let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
        lineas.forEach(l => { for (let q = 0; q < l.length; q += 2) { x0 = Math.min(x0, l[q]); x1 = Math.max(x1, l[q]); y0 = Math.min(y0, l[q + 1]); y1 = Math.max(y1, l[q + 1]); } });
        return { clave, nombre: t[n], entre_1: t[a], entre_2: t[b], red_vial: ind.redes[red], tipo_via: t[tipo], atiende: t[at], llave: t[ll], lineas, caja: [x0, y0, x1, y1] };
      });
    }
    this._celdas.set(k, tramos);
    return tramos;
  },

  /* Metros del punto a un tramo, sobre el elipsoide en la latitud del punto (como ST_Distance sobre geography,
     con diferencias de centímetros a 40 m) */
  distancia(lat, lng, t) {
    const f = lat * Math.PI / 180, a = 6378137, e2 = 0.00669437999014;
    const kx = (Math.PI / 180) * a * Math.cos(f) / Math.sqrt(1 - e2 * Math.sin(f) ** 2);
    const ky = 111132.954 - 559.822 * Math.cos(2 * f) + 1.175 * Math.cos(4 * f);
    let m = Infinity;
    for (const l of t.lineas) {
      for (let q = 0; q + 3 < l.length; q += 2) {
        const ax = (l[q] - lng) * kx, ay = (l[q + 1] - lat) * ky, bx = (l[q + 2] - lng) * kx, by = (l[q + 3] - lat) * ky;
        const dx = bx - ax, dy = by - ay, d2 = dx * dx + dy * dy;
        const s = d2 ? Math.max(0, Math.min(1, -(ax * dx + ay * dy) / d2)) : 0;
        m = Math.min(m, Math.hypot(ax + s * dx, ay + s * dy));
      }
    }
    return m;
  },

  /* La calle de un punto, con las reglas de srp.calle: el tramo más cercano a 40 m o menos (si empatan, la clave
     menor); esquina, otro tramo de otra calle a menos de 4 m más; sin nombre, «calle sin nombre» */
  async calcular(lat, lng) {
    const ind = await this.indice();
    const tramos = await this.celda(Math.floor(lng / ind.celda_grados), Math.floor(lat / ind.celda_grados));
    const g = (this.RADIO_M + this.ESQUINA_M + 5) / 100000;   // un recuadro holgado, en grados
    const cerca = (tramos || []).filter(t => t.caja[0] - g <= lng && lng <= t.caja[2] + g && t.caja[1] - g <= lat && lat <= t.caja[3] + g)
      .map(t => ({ t, m: this.distancia(lat, lng, t) })).sort((p, q) => p.m - q.m || (p.t.clave < q.t.clave ? -1 : 1));
    const base = Object.assign(this.vacia(), { calle_version: ind.version });
    const el = cerca[0] && cerca[0].m <= this.RADIO_M ? cerca[0] : null;
    if (!el) return Object.assign(base, { calle_estado: 'lejos' });
    const t = el.t, esq = cerca.find(x => x.t.clave !== t.clave && (x.t.llave || null) !== (t.llave || null) && x.m - el.m < this.ESQUINA_M);
    return Object.assign(base, {
      calle_estado: 'ok', calle_clave: t.clave, calle: t.nombre || this.SIN_NOMBRE, calle_entre_1: t.entre_1, calle_entre_2: t.entre_2,
      calle_esquina: esq ? esq.t.nombre || this.SIN_NOMBRE : null, vialidad_red: t.red_vial, vialidad_tipo: t.tipo_via, calle_atiende: t.atiende,
      calle_llave: t.llave, calle_distancia_m: Math.round(el.m)
    });
  },

  // Le pone su calle a cada árbol de la lista que no la tiene o la tiene de otra versión. Devuelve los que cambiaron
  async conCalle(regs, avance) {
    const ind = await this.indice();
    const faltan = regs.filter(r => r.lat != null && r.lng != null && (!r.calle_estado || r.calle_version !== ind.version));
    // Las celdas que hacen falta se bajan de ocho en ocho, no una tras otra
    const g = ind.celda_grados, claves = [...new Set(faltan.map(r => Math.floor(r.lng / g) + '_' + Math.floor(r.lat / g)))].filter(k => !this._celdas.has(k));
    for (let i = 0; i < claves.length; i += 8) await Promise.all(claves.slice(i, i + 8).map(k => this.celda(...k.split('_').map(Number))));
    const salida = [];
    for (let i = 0; i < faltan.length; i++) {
      salida.push(Object.assign({}, faltan[i], await this.calcular(faltan[i].lat, faltan[i].lng)));
      if (avance && i % 500 === 0) avance(i, faltan.length);
    }
    return salida;
  },

  /* Como el servidor al recibir: al enviar, cada árbol de prueba sin calle recibe la suya. Es un dato del servidor:
     no cambia la fecha de edición ni va a la bitácora. Con ES_FICTICIO en false nada de esto corre. */
  async asignarPendientes() {
    if (!this.simulado() || !SRP.conexion.enLinea() || !SRP.sesion.usuario || !SRP.almacen.db) return 0;
    const nuevos = await this.conCalle(await SRP.almacen.todosLocales('plantaciones'));
    for (let i = 0; i < nuevos.length; i += 2000) await SRP.almacen.ponerLocales('plantaciones', nuevos.slice(i, i + 2000));
    return nuevos.length;
  },

  /* Lo ya recibido que se quedó sin calle porque sus celdas no bajaron —señal mala a medio envío— la recibe al volver
     la red y al entrar, sin esperar otro envío. Lo que no se ha enviado sigue esperando el suyo. Si las celdas tampoco
     bajan ahora, se intenta la próxima vez, sin aviso */
  async asignarRecibidas() {
    try {
      if (!this.simulado() || !SRP.conexion.enLinea() || !SRP.sesion.usuario || !SRP.almacen.db) return 0;
      const recibidos = SRP.envio.leer().recibidos;
      const nuevos = await this.conCalle((await SRP.almacen.todosLocales('plantaciones')).filter(r => recibidos[r.id]));
      for (let i = 0; i < nuevos.length; i += 2000) await SRP.almacen.ponerLocales('plantaciones', nuevos.slice(i, i + 2000));
      return nuevos.length;
    } catch (e) { return 0; }
  }
};

// Acciones que escriben en el teléfono: si fallan, se dice qué no se pudo hacer
SRP.util.proteger(SRP.calles, { asignarPendientes: 'asignar las calles' });
