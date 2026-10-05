/* COLONIAS PRIORITARIAS PARA REFORESTAR. Capa de referencia del modelo de priorización (SIA/SEDEMA):
   2,243 colonias con prioridad de Muy baja (0) a Muy alta (4). No deriva ningún dato que se guarde:
   dice la prioridad de la colonia donde se ubica una jornada, la dibuja en los mapas de campo para
   que quien planta vea la zona que interviene, y deja contar en Supervisión cuántos árboles van en
   jornadas de cada nivel. La prioridad es de la jornada, no de cada árbol.

   LO QUE SE SABE DE LA CAPA (medido al recibirla). Sus colonias no son las unidades territoriales
   del IECM con que se reporta: son otra división, con su propio nombre. Sus polígonos son
   simplificados (15 vértices en promedio), así que cerca de un límite la prioridad es aproximada, y
   se enciman en 6.5 km²: en un solape gana el polígono más pequeño, como en las colonias. Un punto
   fuera de toda colonia de la capa queda «Sin dato».

   La paleta es la del modelo de priorización, del crema (muy baja) al rojo oscuro (muy alta); la pone
   la hoja (--p0 a --p4, .pri-nivel-0 a 4). La leyenda y el texto del punto dicen el nivel, para que
   no dependa del color. */
window.SRP = window.SRP || {};

SRP.prioritarias = {
  // De mayor a menor: así se leen en la leyenda y en las tablas
  NIVELES: [[4, 'Muy alta'], [3, 'Alta'], [2, 'Media'], [1, 'Baja'], [0, 'Muy baja']],
  CLAVE: 'srp_capa_prioritarias_3',
  memoria: new Map(),
  capas: new Map(),   // mapa de Leaflet → su capa

  hay() { return !!(SRP.CAPAS && SRP.CAPAS.prioritarias && typeof window.turfPIP === 'function'); },
  version() { return this.hay() ? SRP.CAPAS.prioritarias.meta.version : ''; },
  texto(n) { const x = this.NIVELES.find(v => v[0] === n); return x ? x[1] : 'Sin dato'; },

  /* La colonia de la capa donde cae el punto: { id, prioridad, texto, colonia, alcaldia }, o null si no
     cae en ninguna. Se recuerda por coordenada: Supervisión cruza miles de árboles. */
  de(lat, lng) {
    if (!this.hay() || typeof lat !== 'number' || typeof lng !== 'number') return null;
    const k = lat + ',' + lng;
    if (this.memoria.has(k)) return this.memoria.get(k);
    const punto = { type: 'Feature', properties: {}, geometry: { type: 'Point', coordinates: [lng, lat] } };
    const fs = SRP.derivacion.buscarTodos('prioritarias', punto, lng, lat, false);
    let r = null;
    if (fs.length) {
      const f = fs.reduce((m, x) => SRP.derivacion.areaDe(x) < SRP.derivacion.areaDe(m) ? x : m, fs[0]);
      r = { id: f.properties.id, prioridad: f.properties.prioridad, texto: this.texto(f.properties.prioridad), colonia: f.properties.colonia, alcaldia: f.properties.alcaldia };
    }
    this.memoria.set(k, r);
    return r;
  },

  // «Alta · Aguilera», o «Sin dato en la capa de prioridad»
  textoPunto(lat, lng) {
    const p = this.de(lat, lng);
    return p ? p.texto + ' · ' + p.colonia : 'Sin dato en la capa de prioridad';
  },

  // Las colonias de la capa donde caen unos puntos: { id de colonia: cuántos }
  coloniasDe(puntos) {
    const c = {};
    (puntos || []).forEach(r => { const p = r && this.de(r.lat, r.lng); if (p && p.id != null) c[p.id] = (c[p.id] || 0) + 1; });
    return c;
  },

  // Cuántos puntos caen en cada nivel: [{ prioridad, texto, n }] de mayor a menor, y los que quedan sin dato
  contar(puntos) {
    const cuenta = {}; let sin = 0;
    puntos.forEach(r => { const p = this.de(r.lat, r.lng); if (p) cuenta[p.prioridad] = (cuenta[p.prioridad] || 0) + 1; else sin++; });
    return { niveles: this.NIVELES.map(([prioridad, texto]) => ({ prioridad, texto, n: cuenta[prioridad] || 0 })), sin, total: puntos.length };
  },

  // «5 en prioridad alta, 2 en media y 1 sin dato»
  resumen(puntos) {
    const c = this.contar(puntos);
    const partes = c.niveles.filter(x => x.n).map((x, i) => x.n + (i === 0 ? ' en prioridad ' : ' en ') + x.texto.toLowerCase());
    if (c.sin) partes.push(c.sin + ' sin dato');
    return SRP.util.enumerar(partes);
  },

  /* La prioridad de una jornada: la de la colonia donde se ubicó. Una jornada sin ubicación toma
     la de la colonia donde cayó la mayoría de sus árboles; en empate, la de mayor prioridad.
     { id, prioridad, texto, colonia }, o null si no hay de dónde decirla. */
  deJornada(registros, dato) {
    if (!this.hay()) return null;
    if (dato && typeof dato.lat === 'number' && typeof dato.lng === 'number') {
      const p = this.de(dato.lat, dato.lng);
      return p ? { id: p.id, prioridad: p.prioridad, texto: p.texto, colonia: p.colonia } : null;
    }
    const porColonia = new Map();
    (registros || []).forEach(r => { const p = this.de(r.lat, r.lng); if (!p) return; const c = porColonia.get(p.id) || { p, n: 0 }; c.n++; porColonia.set(p.id, c); });
    const mejor = [...porColonia.values()].sort((a, b) => b.n - a.n || b.p.prioridad - a.p.prioridad)[0];
    return mejor ? { id: mejor.p.id, prioridad: mejor.p.prioridad, texto: mejor.p.texto, colonia: mejor.p.colonia } : null;
  },

  /* Lo que se pinta en el mapa para una jornada: la colonia donde se ubicó, { id: 1 }. Una jornada
     sin ubicación pinta las colonias de sus árboles. */
  coloniaDeJornada(registros, dato) {
    if (dato && typeof dato.lat === 'number' && typeof dato.lng === 'number') {
      const p = this.de(dato.lat, dato.lng);
      return p && p.id != null ? { [p.id]: 1 } : {};
    }
    return this.coloniasDe(registros || []);
  },

  // «Prioridad alta», o «Sin dato de prioridad»
  textoJornada(p) { return p ? 'Prioridad ' + p.texto.toLowerCase() : 'Sin dato de prioridad'; },

  /* LA ESCALA COMPLETA, CON EL NIVEL DE LA COLONIA RESALTADO. Los cinco niveles en orden, de menor a
     mayor, cada uno con su color y su nombre; el de la colonia crece, lleva marca y se dice con
     palabras debajo, para que no dependa del color. `p`: lo que devuelve `de()`, o null. */
  htmlEscala(p) {
    const esc = SRP.util.escapar, niveles = this.NIVELES.slice().reverse();
    return '<span class="pri-escala" role="img" aria-label="' + esc(p ? 'Prioridad ' + p.texto.toLowerCase() + ', nivel ' + (p.prioridad + 1) + ' de 5' : 'Sin dato de prioridad') + '">' +
      niveles.map(([n, t]) => '<span class="pri-tramo"' + (p && p.prioridad === n ? ' data-es="true"' : '') + '><i class="pri-nivel-' + n + '"></i><span>' + esc(t) + '</span></span>').join('') + '</span>' +
      '<span class="pri-escala-dicho">' + (p ? '<b>' + esc(p.texto) + '</b>' + (p.colonia ? ' · ' + esc(p.colonia) : '') : 'Sin dato en la capa de prioridad') + '</span>';
  },

  /* La marca de prioridad de una tarjeta: muestra del color y texto. La prioridad es de la colonia,
     no de la jornada, y así se dice. */
  insignia(p) {
    if (!this.hay()) return '';
    return '<span class="pri-insignia">' + (p ? '<i class="pri-muestra pri-nivel-' + p.prioridad + '"></i>' : '') + SRP.util.escapar(this.textoJornada(p).replace(/^Prioridad /, 'Colonia de prioridad ')) + '</span>';
  },

  // Las opciones del filtro por prioridad, de mayor a menor, y «Sin dato»
  opcionesFiltro() { return this.NIVELES.map(([n, t]) => [String(n), t]).concat([['sin', 'Sin dato']]); },
  claveFiltro(p) { return p ? String(p.prioridad) : 'sin'; },
  textoFiltro(v) { return v === 'sin' ? 'Sin dato' : this.texto(Number(v)); },

  /* ---------- En el mapa ---------- */

  /* LO QUE SE VE DE LA CAPA. Por grupo de mapas —«campo»: Nuevo registro y la ficha de la jornada;
     «supervision»: el mapa de colonias de Supervisión—: si la capa está encendida y, en Supervisión,
     qué niveles se ven y con cuánta opacidad. Se recuerda en el dispositivo. */
  estados: null,
  // En campo se ve el polígono de la colonia de la jornada; quien no lo quiere lo apaga con su botón
  inicial(grupo) { return { ver: true, niveles: { 0: true, 1: true, 2: true, 3: true, 4: true }, opacidad: grupo === 'supervision' ? 0.9 : 0.45 }; },
  estado(grupo) {
    if (!this.estados) {
      this.estados = {};
      let g = null;
      try { g = localStorage.getItem(this.CLAVE); } catch (e) { /* sin almacenamiento: vale para esta sesión */ }
      if (g) { try { this.estados = JSON.parse(g) || {}; } catch (e) { this.estados = {}; } }
    }
    const e = this.estados[grupo] = Object.assign(this.inicial(grupo), this.estados[grupo] || {});
    e.niveles = Object.assign(this.inicial(grupo).niveles, e.niveles || {});
    e.opacidad = Math.min(1, Math.max(0.1, Number(e.opacidad) || this.inicial(grupo).opacidad));
    return e;
  },
  guardar() { try { localStorage.setItem(this.CLAVE, JSON.stringify(this.estados)); } catch (e) { /* vale para esta sesión */ } },
  encendida() { return this.estado('campo').ver; },

  /* Pone o quita la capa de un mapa. Va debajo de los puntos y no atiende toques: no estorba al colocar el árbol.
     `intervenidas` ({ id de colonia: árboles }, o una función que lo devuelve): se dibujan sólo esas
     colonias, con el color de su prioridad; el color dice dónde se plantó y con qué prioridad, y la
     etiqueta, cuántos árboles. Si las colonias cambian, la capa se vuelve a armar. */
  pintar(mapa, ver, interactiva, intervenidas) {
    if (!mapa || !window.L || !this.hay()) return;
    if (typeof intervenidas === 'function') intervenidas = intervenidas() || {};
    const clave = intervenidas ? Object.keys(intervenidas).sort().join() : '';
    let capa = this.capas.get(mapa);
    if (capa && capa.claveColonias !== clave) { if (mapa.hasLayer(capa)) mapa.removeLayer(capa); this.capas.delete(mapa); capa = null; }
    if (ver && !capa) {
      if (!mapa.getPane('prioritarias')) { mapa.createPane('prioritarias'); mapa.getPane('prioritarias').classList.add('pane-prioritarias'); }
      capa = L.geoJSON(SRP.CAPAS.prioritarias.geojson, {
        pane: 'prioritarias', interactive: !!interactiva, attribution: 'Colonias prioritarias: modelo de priorización, SIA/SEDEMA',
        filter: intervenidas ? (f => !!intervenidas[f.properties.id]) : undefined,
        style: f => ({ className: 'pri-colonia pri-nivel-' + f.properties.prioridad, weight: 1 }),
        onEachFeature: interactiva ? (f, l) => {
          const n = intervenidas ? intervenidas[f.properties.id] : null;
          l.bindTooltip(f.properties.colonia + ': prioridad ' + this.texto(f.properties.prioridad).toLowerCase() + (n ? ' · ' + n + (n === 1 ? ' árbol' : ' árboles') : ''), { sticky: true });
        } : undefined
      });
      capa.claveColonias = clave;
      // Los niveles que de verdad se pintan: con colonias elegidas, sólo los suyos
      capa.nivelesPintados = intervenidas ? new Set(SRP.CAPAS.prioritarias.geojson.features.filter(f => intervenidas[f.properties.id]).map(f => String(f.properties.prioridad))) : null;
      this.capas.set(mapa, capa);
    }
    if (!capa) return;
    if (ver && !mapa.hasLayer(capa)) capa.addTo(mapa);
    if (!ver && mapa.hasLayer(capa)) mapa.removeLayer(capa);
  },

  htmlLeyenda() {
    return '<span class="pri-leyenda-titulo">Prioridad:</span>' + this.NIVELES.map(([n, t]) => '<span><i class="pri-muestra pri-nivel-' + n + '"></i>' + SRP.util.escapar(t) + '</span>').join('');
  },

  /* EL CONTROL SOBRE EL MAPA. Un botón en la esquina del mapa abre el panel de la capa: encenderla o
     apagarla, elegir qué niveles se ven (cada uno con su muestra de color, que hace de leyenda) y su
     opacidad. `mapa()` devuelve el mapa de Leaflet; `o`: { grupo, simple (un solo botón que enciende y apaga),
     leyenda (elemento bajo el mapa, opcional), interruptor (false donde la capa es el mapa mismo),
     interactiva, intervenidas (sólo esas colonias) }. Lo elegido vale para los mapas
     del mismo grupo. */
  controles: [],
  control(mapa, o) {
    o = Object.assign({ grupo: 'campo', interruptor: true }, o || {});
    const m = mapa();
    if (!m || !window.L || !this.hay()) { if (o.leyenda) o.leyenda.hidden = true; return; }
    if (this.controles.some(c => c.m === m)) { this.refrescar(); return; }
    const id = 'pri-panel-' + (this.controles.length + 1), esc = SRP.util.escapar;
    const caja = L.DomUtil.create('div', 'leaflet-control pri-capas');
    /* En campo el control es un solo botón que enciende o apaga el polígono de la colonia de la
       jornada: no hay niveles ni opacidad que elegir */
    if (o.simple) {
      caja.innerHTML = '<button type="button" class="pri-capas-boton" aria-pressed="false" aria-label="Colonia de la jornada, con el color de su prioridad" title="Colonia de la jornada">' + SRP.ICONOS.svg('capas', 'medio') + '</button>';
      L.DomEvent.disableClickPropagation(caja); L.DomEvent.disableScrollPropagation(caja);
      caja.querySelector('button').addEventListener('click', () => {
        this.alternar();
        SRP.util.anunciarSilencioso(this.encendida() ? 'Colonia de la jornada a la vista.' : 'Colonia de la jornada oculta.');
      });
      const S = L.Control.extend({ onAdd: () => caja });
      new S({ position: 'topright' }).addTo(m);
      this.controles.push({ m, mapa, caja, o });
      this.refrescar();
      return;
    }
    caja.innerHTML = '<button type="button" class="pri-capas-boton" aria-expanded="false" aria-controls="' + id + '" aria-label="Capa de colonias prioritarias: niveles y opacidad" title="Colonias prioritarias">' + SRP.ICONOS.svg('capas', 'medio') + '</button>' +
      '<div id="' + id + '" class="pri-capas-panel" hidden>' +
      (o.interruptor ? '<label class="pri-capas-fila pri-capas-todo"><input type="checkbox" data-pri="ver"><span>Colonias prioritarias</span></label>' : '<p class="pri-capas-titulo">Colonias prioritarias</p>') +
      '<fieldset class="pri-capas-niveles"><legend>Niveles</legend>' + this.NIVELES.map(([n, t]) =>
        '<label class="pri-capas-fila"><input type="checkbox" data-pri="nivel" value="' + n + '"><i class="pri-muestra pri-nivel-' + n + '"></i><span>' + esc(t) + '</span></label>').join('') + '</fieldset>' +
      '<label class="pri-capas-opacidad"><span>Opacidad <output></output></span><input type="range" data-pri="opacidad" min="10" max="100" step="5"></label></div>';
    // Lo que pasa dentro del control no llega al mapa: ni coloca el punto ni lo mueve
    L.DomEvent.disableClickPropagation(caja); L.DomEvent.disableScrollPropagation(caja);
    const boton = caja.querySelector('.pri-capas-boton'), panel = caja.querySelector('.pri-capas-panel');
    /* El panel cabe siempre dentro del mapa: se abre al lado del botón y su alto y su ancho se ajustan
       a los del mapa; si aun así no cabe (mapa muy bajo), se desplaza por dentro */
    const ajustar = () => { const t = m.getSize(); panel.style.maxHeight = Math.max(120, t.y - 20) + 'px'; panel.style.maxWidth = Math.max(160, t.x - 74) + 'px'; };
    boton.addEventListener('click', () => { panel.hidden = !panel.hidden; boton.setAttribute('aria-expanded', String(!panel.hidden)); if (!panel.hidden) ajustar(); });
    m.on('resize', () => { if (!panel.hidden) ajustar(); });
    caja.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !panel.hidden) { panel.hidden = true; boton.setAttribute('aria-expanded', 'false'); boton.focus(); } });
    caja.addEventListener('change', (e) => this.alCambiar(o.grupo, e.target));
    caja.addEventListener('input', (e) => { if (e.target.dataset.pri === 'opacidad') this.alCambiar(o.grupo, e.target); });
    const C = L.Control.extend({ onAdd: () => caja });
    new C({ position: 'topright' }).addTo(m);
    this.controles.push({ m, mapa, caja, o });
    this.refrescar();
  },

  alCambiar(grupo, el) {
    const e = this.estado(grupo), que = el.dataset.pri;
    if (que === 'ver') { e.ver = el.checked; SRP.util.anunciarSilencioso(e.ver ? 'Colonias prioritarias a la vista.' : 'Colonias prioritarias ocultas.'); }
    else if (que === 'nivel') e.niveles[el.value] = el.checked;
    else if (que === 'opacidad') e.opacidad = Number(el.value) / 100;
    else return;
    this.guardar();
    this.refrescar();
  },

  // Enciende o apaga la capa del grupo «campo» (lo mismo que su interruptor)
  alternar() { const e = this.estado('campo'); e.ver = !e.ver; this.guardar(); this.refrescar(); },

  // Deja cada mapa y cada panel como dice su estado
  /* Antes de retirar un mapa hay que soltarlo: si no, la próxima vez se intentaría pintar la capa
     en un mapa que ya no existe */
  soltar(m) {
    if (!m) return;
    this.controles = this.controles.filter(c => c.m !== m);
    this.capas.delete(m);
  },

  refrescar() {
    this.controles = this.controles.filter(c => c.m._container && document.body.contains(c.m._container));
    this.controles.forEach(({ m, caja, o }) => {
      const e = this.estado(o.grupo), ver = e.ver || !o.interruptor;
      this.pintar(m, ver, o.interactiva, o.intervenidas);
      const pane = m.getPane('prioritarias');
      if (o.simple) {
        if (pane) pane.style.opacity = String(this.inicial(o.grupo).opacidad);
        const b = caja.querySelector('.pri-capas-boton');
        b.dataset.activa = String(ver); b.setAttribute('aria-pressed', String(ver));
        // Sin colonia que pintar, el botón no tiene qué encender
        const capaS = this.capas.get(m);
        caja.hidden = !!(capaS && capaS.nivelesPintados && !capaS.nivelesPintados.size) || (!capaS && ver);
        return;
      }
      if (pane) {
        pane.style.opacity = String(e.opacidad);
        this.NIVELES.forEach(([n]) => pane.classList.toggle('pri-sin-' + n, !e.niveles[n]));
      }
      caja.querySelectorAll('[data-pri]').forEach(el => {
        if (el.dataset.pri === 'ver') el.checked = e.ver;
        // Con la capa apagada, sus niveles se ven apagados; lo elegido vuelve al encenderla
        if (el.dataset.pri === 'nivel') { el.checked = ver && !!e.niveles[el.value]; el.disabled = !ver; }
        if (el.dataset.pri === 'opacidad') { el.value = Math.round(e.opacidad * 100); el.disabled = !ver; }
      });
      caja.querySelector('output').textContent = Math.round(e.opacidad * 100) + ' %';
      caja.querySelector('.pri-capas-boton').dataset.activa = String(ver);
      if (o.leyenda) {
        // Bajo el mapa, la leyenda de los niveles que se ven: explica los colores con el panel cerrado
        o.leyenda.hidden = !ver;
        const capaM = this.capas.get(m), pintados = capaM ? capaM.nivelesPintados : null;
        o.leyenda.innerHTML = '<p class="pri-leyenda"><span class="pri-leyenda-titulo">Prioridad:</span>' + this.NIVELES.filter(([n]) => e.niveles[n] && (!pintados || pintados.has(String(n)))).map(([n, t]) => '<span><i class="pri-muestra pri-nivel-' + n + '"></i>' + SRP.util.escapar(t) + '</span>').join('') + '</p>';
        // Sin colonia que pintar no hay colores que explicar
        if (pintados && !pintados.size) o.leyenda.hidden = true;
      }
    });
  }
};
