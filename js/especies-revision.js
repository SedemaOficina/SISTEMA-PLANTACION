/* ESPECIES ESCRITAS (sólo Administración global; se abre desde Catálogos › Especies). Lo que las personas escriben en «Otra especie»
   se lista aquí, agrupado por lo escrito sin distinguir mayúsculas, acentos ni espacios. Es sólo
   consulta: la revisión —si es un error de escritura, si la especie existe— se hace fuera, con la
   lista descargada; el alta de una especie sigue en Catálogos. */
window.SRP = window.SRP || {};

SRP.especiesRevision = {
  grupos: [],

  el(id) { return document.getElementById(id); },

  iniciar() {
    SRP.ICONOS.poner(this.el('btn-rev-excel'), 'descargar', 'medio');
    this.el('btn-rev-excel').addEventListener('click', () => this.descargar());
    this.el('btn-rev-volver').addEventListener('click', () => SRP.app.mostrarVista('catalogos'));
  },

  clave(texto) { return SRP.util.normalizar(String(texto || '').replace(/\s+/g, ' ').trim()); },

  /* Los grupos: un renglón por cada cosa distinta que se escribió. Cuentan los árboles vigentes y
     los sustituidos; los eliminados, no. Cuando el árbol se edita y toma una especie del catálogo,
     deja de aparecer. */
  async leer() {
    const arboles = (await SRP.almacen.todos('plantaciones')).filter(r => r.estatus !== 'eliminado' && !r.especie_id && String(r.especie_otra || '').trim());
    const mapa = new Map();
    arboles.forEach(r => {
      const k = this.clave(r.especie_otra);
      if (!mapa.has(k)) mapa.set(k, { clave: k, arboles: [], escritos: new Map() });
      const g = mapa.get(k), t = String(r.especie_otra).replace(/\s+/g, ' ').trim();
      g.arboles.push(r);
      g.escritos.set(t, (g.escritos.get(t) || 0) + 1);
    });
    const especies = SRP.ref.deTipo('especie', true);
    return [...mapa.values()].map(g => {
      const formas = [...g.escritos.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'es')).map(x => x[0]);
      const fechas = g.arboles.map(r => r.fecha_plantacion).filter(Boolean).sort();
      return Object.assign(g, {
        texto: formas[0], variantes: formas.slice(1),
        personas: [...new Set(g.arboles.map(r => r.cabo_id).filter(Boolean))],
        jornadas: [...new Set(g.arboles.map(r => r.jornada_id).filter(Boolean))],
        desde: fechas[0] || '', hasta: fechas[fechas.length - 1] || '',
        parecida: this.parecida(g.clave, especies)
      });
    }).sort((a, b) => b.arboles.length - a.arboles.length || a.texto.localeCompare(b.texto, 'es'));
  },

  /* La especie del catálogo que más se parece a lo escrito. Por orden: la que se llama igual
     (nombre común o científico), la que lo tiene entre sus otros nombres, la que lo contiene. En
     cada paso, sólo si es una: con varias no se propone ninguna, para no invitar a equivocarse. */
  parecida(clave, especies) {
    if (clave.length < 3) return null;
    const n = SRP.util.normalizar;
    const otros = e => String(e.otros_nombres_comunes || '').split(',').map(t => n(t)).filter(Boolean);
    const pasos = [e => n(e.nombre) === clave || n(e.nombre_cientifico || '') === clave, e => otros(e).includes(clave), e => !!SRP.ref.especieCoincide(e, clave)];
    for (const paso of pasos) {
      const hay = especies.filter(paso);
      if (hay.length) return hay.length === 1 ? hay[0] : null;
    }
    return null;
  },

  async cuantas() { return (await this.leer()).length; },

  quienes(g) {
    const n = g.personas.length;
    return g.personas.slice(0, 2).map(id => SRP.ref.nombreUsuario(id)).join(', ') + (n > 2 ? ' y ' + (n - 2) + (n === 3 ? ' persona más' : ' personas más') : '');
  },

  async preparar() {
    this.grupos = await this.leer();
    const num = n => n.toLocaleString('es-MX'), pl = (n, uno, varios) => num(n) + ' ' + (n === 1 ? uno : varios);
    const g = this.grupos, arboles = g.reduce((s, x) => s + x.arboles.length, 0);
    this.el('rev-cuenta').textContent = g.length ? pl(g.length, 'especie escrita', 'especies escritas') + ' · ' + pl(arboles, 'árbol', 'árboles') : '';
    this.el('rev-lista').innerHTML = g.length ? '<thead><tr><th scope="col">Especie escrita</th><th scope="col">También escrita como</th><th scope="col" class="c-num">Árboles</th><th scope="col" class="c-num">Jornadas</th>' +
      '<th scope="col">Quién la escribió</th><th scope="col">Fechas</th><th scope="col">Parecida en el catálogo</th></tr></thead><tbody>' + g.map(x => this.htmlGrupo(x)).join('') + '</tbody>' : '';
    this.el('rev-caja').hidden = !g.length;
    this.el('btn-rev-excel').hidden = !g.length;
    const vacio = this.el('rev-vacio');
    vacio.hidden = g.length > 0;
    if (!vacio.hidden) vacio.innerHTML = '<p class="vacio-titulo">Ninguna especie escrita</p><p class="vacio-texto">Nadie ha registrado árboles con «Otra especie». Cuando alguien escriba una, aparecerá aquí.</p>';
  },

  /* Un renglón de la tabla. En teléfono cada renglón se muestra como ficha: lo escrito, la cuenta y,
     si la hay, la parecida del catálogo. */
  htmlGrupo(g) {
    const esc = SRP.util.escapar, num = n => n.toLocaleString('es-MX'), f = d => SRP.util.formatearFecha(d);
    const pl = (n, uno, varios) => num(n) + ' ' + (n === 1 ? uno : varios);
    const cuando = g.desde ? (g.desde === g.hasta ? f(g.desde) : f(g.desde) + ' al ' + f(g.hasta)) : '';
    return '<tr data-clave="' + esc(g.clave) + '"><td class="c-titulo rev-escrito" data-etiqueta="Especie escrita">«' + esc(g.texto) + '»</td>' +
      '<td class="c-sub" data-etiqueta="También escrita como">' + g.variantes.map(v => '«' + esc(v) + '»').join(', ') + '</td>' +
      '<td class="c-num c-movil-oculta" data-etiqueta="Árboles">' + num(g.arboles.length) + '</td><td class="c-num c-movil-oculta" data-etiqueta="Jornadas">' + num(g.jornadas.length) + '</td>' +
      '<td class="c-movil-oculta" data-etiqueta="Quién la escribió">' + esc(this.quienes(g)) + '</td><td class="c-movil-oculta" data-etiqueta="Fechas">' + esc(cuando) + '</td>' +
      '<td class="c-sub rev-parecida" data-etiqueta="Parecida en el catálogo">' + (g.parecida ? esc(g.parecida.nombre) + ' · <i>' + esc(g.parecida.nombre_cientifico || '') + '</i>' : '') + '</td>' +
      '<td class="c-resumen">' + esc([pl(g.arboles.length, 'árbol', 'árboles'), pl(g.jornadas.length, 'jornada', 'jornadas'), this.quienes(g), cuando].filter(Boolean).join(' · ')) + '</td></tr>';
  },

  /* LA LISTA EN EXCEL, para revisarla fuera: un renglón por especie escrita, con todas las formas
     en que se escribió y, si la hay, la parecida del catálogo con su clave. */
  async descargar() {
    if (!SRP.permisos.exigir('catalogo.administrar')) return;
    const grupos = await this.leer();
    const filas = grupos.map(g => [g.texto, g.variantes.join('; '), g.arboles.length, g.jornadas.length, g.personas.map(id => SRP.ref.nombreUsuario(id)).join('; '), g.desde, g.hasta,
      g.parecida ? g.parecida.clave : '', g.parecida ? g.parecida.nombre : '', g.parecida ? g.parecida.nombre_cientifico || '' : '']);
    const hoja = { nombre: 'Especies escritas', columnas: [
      { titulo: 'Especie escrita', ancho: 30 }, { titulo: 'También escrita como', ancho: 34 }, { titulo: 'Árboles', ancho: 9 }, { titulo: 'Jornadas', ancho: 9 },
      { titulo: 'Quién la escribió', ancho: 36 }, { titulo: 'Primera fecha', ancho: 13 }, { titulo: 'Última fecha', ancho: 13 },
      { titulo: 'Parecida: clave', ancho: 14 }, { titulo: 'Parecida: nombre común', ancho: 26 }, { titulo: 'Parecida: nombre científico', ancho: 30 }], filas };
    await SRP.reportes.entregarArchivo(SRP.excel.armar([hoja]), 'Especies_escritas_SRP_' + SRP.util.fechaHoy() + '.xlsx', 'Especies escritas');
  }
};
SRP.util.proteger(SRP.especiesRevision, { descargar: 'descargar la lista' });
