/* CARGA MASIVA (sólo Administración global, en Configuración). Para subir de una vez los árboles
   plantados antes de usar el sistema, de los que sólo se tiene: latitud, longitud, nombre
   científico, fecha de plantación, programa, tipo de institución e institución.
   1. Plantilla: un Excel con esas columnas, las instrucciones y las listas válidas (especies,
      programas, instituciones), sacadas de los catálogos.
   2. Revisión: se lee el archivo (Excel o CSV) en el teléfono y se revisa renglón por renglón,
      sin guardar nada. Un renglón con error no entra y se dice por qué; uno con aviso entra.
      - Error: coordenadas que no son número o fuera de la Ciudad; especie que no está en el
        catálogo (se da de alta primero en Catálogos); fecha no válida o posterior a hoy; programa,
        tipo de institución o institución que no existen; renglón repetido en el archivo; árbol que
        ya está en el sistema (mismo punto, especie, fecha e institución), como pasa al subir dos
        veces el mismo archivo.
      - Aviso: programa que hoy no tiene marcado ese tipo de institución (el histórico es anterior a
        las reglas); institución o programa desactivados.
   3. Carga: los renglones válidos se agrupan en jornadas cerradas —una por institución, fecha,
      programa y alcaldía—, a nombre de quien carga y con `carga_id`, la clave del lote. El
      territorio de cada árbol se deriva con las capas, como al registrar. Con datos de prueba el
      folio se emite al cargar, como lo hará el servidor; con datos reales queda pendiente. Todo va
      en una sola transacción: entra completo o no entra nada. La bitácora guarda cada jornada, cada
      árbol y un renglón del lote, que se ve en el Registro de cambios.
   4. Cargas hechas: cada lote se puede deshacer completo. Se quitan sus jornadas y sus árboles, y
      la bitácora conserva el lote y que se deshizo. */
window.SRP = window.SRP || {};

SRP.carga = {
  COLUMNAS: [
    { clave: 'lat', titulo: 'Latitud', ancho: 12, alias: ['latitud', 'lat', 'y'] },
    { clave: 'lng', titulo: 'Longitud', ancho: 12, alias: ['longitud', 'lng', 'lon', 'long', 'x'] },
    { clave: 'cientifico', titulo: 'Nombre científico', ancho: 32, alias: ['nombre cientifico', 'especie', 'nombre cientifico de la especie', 'nombre cientifico de la especie plantada'] },
    { clave: 'fecha', titulo: 'Fecha de plantación', ancho: 18, alias: ['fecha de plantacion', 'fecha'] },
    { clave: 'programa', titulo: 'Programa', ancho: 24, alias: ['programa'] },
    { clave: 'tipo', titulo: 'Tipo de institución', ancho: 22, alias: ['tipo de institucion', 'tipo'] },
    { clave: 'institucion', titulo: 'Institución', ancho: 44, alias: ['institucion', 'alcaldia o institucion', 'institucion o alcaldia'] }
  ],
  MAX_RENGLONES: 20000,
  MAX_A_LA_VISTA: 20,
  revision: null,
  archivo: null,

  el(id) { return document.getElementById(id); },

  iniciar() {
    SRP.ICONOS.poner(this.el('btn-carga-plantilla'), 'descargar', 'medio');
    SRP.ICONOS.poner(this.el('btn-carga-errores'), 'descargar', 'medio');
    SRP.ICONOS.poner(this.el('btn-carga-cargar'), 'subir', 'medio');
    this.el('btn-carga-plantilla').addEventListener('click', () => this.descargarPlantilla());
    this.el('carga-archivo').addEventListener('change', (e) => { const f = e.target.files && e.target.files[0]; if (f) this.revisarArchivo(f); });
    this.el('btn-carga-errores').addEventListener('click', () => this.descargarProblemas());
    this.el('btn-carga-cargar').addEventListener('click', () => this.cargar());
    this.el('carga-lotes').addEventListener('click', (e) => { const b = e.target.closest('button[data-lote]'); if (b) this.deshacer(b.dataset.lote); });
  },

  // Cada vez que se entra, desde cero: ningún archivo a medio revisar de la vez anterior
  preparar() {
    this.revision = null; this.archivo = null;
    this.el('carga-archivo').value = '';
    this.el('carga-revision').hidden = true;
    this.el('carga-error-archivo').hidden = true;
    return this.pintarLotes();
  },

  /* ---------- Plantilla ---------- */

  plantilla() {
    const especies = SRP.ref.deTipo('especie', true).slice().sort((a, b) => String(a.nombre_cientifico).localeCompare(String(b.nombre_cientifico), 'es'));
    const programas = SRP.ref.deTipo('programa', true).filter(p => p.id !== SRP.CONFIG.PROGRAMA_SOLICITUD);
    const orgs = SRP.ref.deTipo('organizacion', true).slice()
      .sort((a, b) => SRP.ref.TIPOS_INSTITUCION.indexOf(a.tipo_organizacion) - SRP.ref.TIPOS_INSTITUCION.indexOf(b.tipo_organizacion) || a.nombre.localeCompare(b.nombre, 'es'));
    const hoy = SRP.util.fechaHoy();
    return [
      // Listas para elegir en nombre científico, programa, tipo de institución e institución (las de las otras hojas)
      { nombre: 'Árboles', columnas: this.COLUMNAS.map(c => ({ titulo: c.titulo, ancho: c.ancho })), filas: [], filtro: true, validaciones: [
        { rango: 'C2:C' + (this.MAX_RENGLONES + 1), lista: "'Especies'!$A$2:$A$" + (especies.length + 1) },
        { rango: 'E2:E' + (this.MAX_RENGLONES + 1), lista: "'Programas'!$A$2:$A$" + (programas.length + 1) },
        { rango: 'F2:F' + (this.MAX_RENGLONES + 1), valores: SRP.ref.TIPOS_INSTITUCION },
        { rango: 'G2:G' + (this.MAX_RENGLONES + 1), lista: "'Instituciones'!$B$2:$B$" + (orgs.length + 1) }] },
      { nombre: 'Instrucciones', filtro: false, columnas: [{ titulo: 'Columna', ancho: 22 }, { titulo: 'Qué escribir', ancho: 80 }, { titulo: 'Ejemplo', ancho: 34 }], filas: [
        ['Latitud', 'Grados decimales, con punto. En la Ciudad va de 19.0 a 19.6.', 19.432608],
        ['Longitud', 'Grados decimales, con punto. Es negativa; si se escribe sin el signo, se toma como negativa.', -99.133209],
        ['Nombre científico', 'Como está en la hoja «Especies» (sin autor). Si no está, dé de alta la especie en Catálogos antes de cargar.', 'Fraxinus uhdei'],
        ['Fecha de plantación', 'Fecha de Excel, o escrita como AAAA-MM-DD o DD/MM/AAAA. No puede ser posterior a hoy.', hoy],
        ['Programa', 'Como está en la hoja «Programas».', 'Reforestación Urbana'],
        ['Tipo de institución', 'Alcaldía, Gobierno de la CDMX, Empresa privada u Organización civil.', 'Alcaldía'],
        ['Institución', 'Como está en la hoja «Instituciones», del tipo elegido. En alcaldías, sólo el nombre.', 'Iztapalapa'],
        ['', 'Un renglón por árbol, en la hoja «Árboles». No cambie los encabezados.', ''],
        ['', 'Hasta ' + this.MAX_RENGLONES.toLocaleString('es-MX') + ' renglones por archivo; si son más, divídalos en varios archivos.', ''],
        ['', 'Nombre científico, programa, tipo de institución e institución se eligen de una lista; también se pueden escribir o pegar.', ''],
        ['', 'Los árboles quedan a nombre de quien los carga, en jornadas cerradas marcadas como carga histórica.', ''],
        ['', 'Antes de cargar, el sistema revisa todo y dice qué renglones tienen problemas; nada se guarda hasta que usted confirma.', '']
      ] },
      { nombre: 'Especies', columnas: [{ titulo: 'Nombre científico', ancho: 36 }, { titulo: 'Nombre común', ancho: 30 }, { titulo: 'Clave', ancho: 12 }],
        filas: especies.map(e => [e.nombre_cientifico || '', e.nombre, e.clave]) },
      { nombre: 'Programas', columnas: [{ titulo: 'Programa', ancho: 30 }, { titulo: 'Quién puede usarlo', ancho: 60 }],
        filas: programas.map(p => [p.nombre, SRP.ref.textoUsoPrograma(p)]) },
      { nombre: 'Instituciones', columnas: [{ titulo: 'Tipo de institución', ancho: 24 }, { titulo: 'Institución', ancho: 60 }],
        filas: orgs.map(o => [o.tipo_organizacion, o.nombre]) }
    ];
  },

  async descargarPlantilla() {
    await SRP.reportes.entregarArchivo(SRP.excel.armar(this.plantilla()), 'Plantilla_carga_masiva_SRP.xlsx', 'Plantilla de carga masiva');
  },

  /* ---------- Revisión ---------- */

  norm(t) { return SRP.util.normalizar(t).replace(/\s+/g, ' ').replace(/[«»"]/g, ''); },

  // Índices de búsqueda por texto normalizado
  indices() {
    const n = t => this.norm(t);
    const especies = {}, programas = {}, tipos = {}, orgs = {};
    SRP.ref.deTipo('especie', false).forEach(e => { if (e.nombre_cientifico) especies[n(e.nombre_cientifico)] = e; });
    SRP.ref.deTipo('programa', false).forEach(p => { programas[n(p.nombre)] = p; programas[n(p.clave)] = p; });
    SRP.ref.TIPOS_INSTITUCION.forEach(t => { tipos[n(t)] = t; orgs[t] = {}; });
    Object.assign(tipos, { 'gobierno cdmx': 'Gobierno de la CDMX', 'gobierno de la ciudad de mexico': 'Gobierno de la CDMX', 'empresa': 'Empresa privada',
      'organizacion de la sociedad civil': 'Organización civil', 'osc': 'Organización civil', 'sociedad civil': 'Organización civil' });
    SRP.ref.deTipo('organizacion', false).forEach(o => {
      const m = orgs[o.tipo_organizacion]; if (!m) return;
      [o.nombre, o.clave, SRP.ref.nombreOrganizacion(o.id)].forEach(t => { if (t) m[n(t)] = o; });
      // «Secretaría del Medio Ambiente (SEDEMA)» también se encuentra como «SEDEMA» o sin el paréntesis
      const par = /^(.*?)\s*\(([^)]+)\)\s*$/.exec(o.nombre);
      if (par) { m[n(par[1])] = o; m[n(par[2])] = o; }
    });
    return { especies, programas, tipos, orgs };
  },

  numero(v) {
    if (typeof v === 'number') return v;
    const t = String(v == null ? '' : v).trim().replace(/\s/g, '').replace(',', '.');
    return t === '' || !/^[-+]?\d*\.?\d+$/.test(t) ? NaN : Number(t);
  },

  // Fecha de Excel (número de días), AAAA-MM-DD, DD/MM/AAAA o DD-MMM-AAAA → AAAA-MM-DD, o null
  fecha(v) {
    const dos = n => String(n).padStart(2, '0');
    let a, m, d;
    if (typeof v === 'number' && isFinite(v)) {
      const f = new Date(Date.UTC(1899, 11, 30) + Math.floor(v) * 864e5);
      a = f.getUTCFullYear(); m = f.getUTCMonth() + 1; d = f.getUTCDate();
    } else {
      const t = String(v == null ? '' : v).trim().toUpperCase();
      let x;
      if ((x = /^(\d{4})-(\d{1,2})-(\d{1,2})(?:[T ].*)?$/.exec(t))) { a = +x[1]; m = +x[2]; d = +x[3]; }
      else if ((x = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/.exec(t))) { d = +x[1]; m = +x[2]; a = +x[3]; }
      else if ((x = /^(\d{1,2})[-/ ]([A-Z]{3})[-/ ](\d{4})$/.exec(SRP.util.normalizar(t).toUpperCase()))) { d = +x[1]; m = SRP.util.MESES_CORTOS.indexOf(x[2]) + 1; a = +x[3]; }
      else return null;
    }
    const f = new Date(Date.UTC(a, m - 1, d));
    if (!m || f.getUTCFullYear() !== a || f.getUTCMonth() !== m - 1 || f.getUTCDate() !== d) return null;
    return a + '-' + dos(m) + '-' + dos(d);
  },

  // Lo que identifica a un árbol al volver a subirlo: punto con seis decimales, especie, fecha e institución
  huella(lat, lng, especieId, fecha, orgId) {
    return [Number(lat).toFixed(6), Number(lng).toFixed(6), especieId, fecha, orgId].join('|');
  },

  /* Los árboles que ya están en el sistema, por huella: cuántos hay y si alguno llegó por carga masiva.
     Los eliminados no cuentan: se pueden volver a cargar. */
  async existentes() {
    const [arboles, jornadas] = await Promise.all([SRP.almacen.todos('plantaciones'), SRP.almacen.todos('jornadas')]);
    const porId = {}; jornadas.forEach(j => { porId[j.id] = j; });
    const cuenta = {};
    arboles.forEach(a => {
      const j = porId[a.jornada_id];
      if (a.estatus === 'eliminado' || !a.especie_id || !j) return;
      const k = this.huella(a.lat, a.lng, a.especie_id, a.fecha_plantacion, j.organizacion_id);
      const c = cuenta[k] || (cuenta[k] = { n: 0, cargado: false });
      c.n++;
      if (j.carga_id) c.cargado = true;
    });
    return cuenta;
  },

  /* filas (la primera, encabezados) y lo que ya está en el sistema → { listos, problemas, renglones,
     jornadas, yaEstaban } sin guardar nada. Cada árbol del sistema empata con un solo renglón: si hay
     tres iguales guardados y el archivo trae cinco, los dos que sobran son nuevos. */
  revisar(filas, existentes) {
    const n = t => this.norm(t);
    const enc = (filas[0] || []).map(t => n(t));
    const pos = {};
    this.COLUMNAS.forEach(c => { const i = enc.findIndex(t => c.alias.includes(t)); if (i >= 0) pos[c.clave] = i; });
    const faltan = this.COLUMNAS.filter(c => pos[c.clave] === undefined).map(c => c.titulo);
    if (faltan.length) throw new Error('Al archivo le faltan columnas: ' + faltan.join(', ') + '. Use la plantilla y no cambie los encabezados.');
    const ix = this.indices();
    const hoy = SRP.util.fechaHoy();
    const listos = [], problemas = [], vistos = {}, usados = {};
    let renglones = 0, yaEstaban = 0;
    for (let r = 1; r < filas.length; r++) {
      const f = filas[r] || [];
      const val = k => f[pos[k]] === undefined ? '' : f[pos[k]];
      const original = this.COLUMNAS.map(c => val(c.clave));
      if (original.every(v => String(v).trim() === '')) continue;
      renglones++;
      if (renglones > this.MAX_RENGLONES) throw new Error('El archivo tiene más de ' + this.MAX_RENGLONES.toLocaleString('es-MX') + ' renglones. Divídalo en varios archivos.');
      const errores = [], avisos = [];
      const lat = this.numero(val('lat'));
      let lng = this.numero(val('lng'));
      if (isFinite(lng) && lng > 0) lng = -lng;
      let t = null;
      if (!isFinite(lat) || !isFinite(lng)) errores.push(['Latitud y longitud', 'Escriba latitud y longitud en grados decimales, con punto.']);
      else {
        t = SRP.derivacion.derivar(lat, lng);
        if (!t.alcaldia) errores.push(['Latitud y longitud', 'El punto (' + lat + ', ' + lng + ') queda fuera de la Ciudad de México.']);
      }
      const esp = ix.especies[n(val('cientifico'))];
      if (!String(val('cientifico')).trim()) errores.push(['Nombre científico', 'Falta el nombre científico.']);
      else if (!esp) errores.push(['Nombre científico', '«' + String(val('cientifico')).trim() + '» no está en el catálogo de especies. Dé de alta la especie en Catálogos o corrija el nombre.']);
      else if (!esp.activo) avisos.push(['Nombre científico', 'La especie está desactivada en el catálogo.']);
      const fecha = this.fecha(val('fecha'));
      if (!fecha) errores.push(['Fecha de plantación', 'Fecha no válida: «' + String(val('fecha')).trim() + '». Use una fecha de Excel, AAAA-MM-DD o DD/MM/AAAA.']);
      else if (fecha > hoy) errores.push(['Fecha de plantación', 'La fecha ' + SRP.util.formatearFecha(fecha) + ' es posterior a hoy.']);
      const prog = ix.programas[n(val('programa'))];
      if (!prog) errores.push(['Programa', '«' + String(val('programa')).trim() + '» no está en el catálogo de programas.']);
      // Una solicitud lleva quién lo solicita y su descripción, que el archivo no trae
      else if (prog.id === SRP.CONFIG.PROGRAMA_SOLICITUD) errores.push(['Programa', '«' + prog.nombre + '» no se carga por archivo: pide quién lo solicita y la descripción. Capture esa jornada en el sistema.']);
      const tipo = ix.tipos[n(val('tipo'))];
      let org = null;
      if (!tipo) errores.push(['Tipo de institución', '«' + String(val('tipo')).trim() + '» no es un tipo de institución: Alcaldía, Gobierno de la CDMX, Empresa privada u Organización civil.']);
      else {
        org = ix.orgs[tipo][n(val('institucion'))];
        if (!org) errores.push(['Institución', '«' + String(val('institucion')).trim() + '» no está en Catálogos › Instituciones como ' + tipo + '.']);
        else if (!org.activo) avisos.push(['Institución', 'La institución está desactivada.']);
      }
      if (prog && org) {
        if (!prog.activo) avisos.push(['Programa', 'El programa está desactivado.']);
        else if (!SRP.ref.programasPara(org.id).some(p => p.id === prog.id)) avisos.push(['Programa', '«' + prog.nombre + '» no está marcado hoy para ' + org.tipo_organizacion + '; entra como histórico.']);
      }
      if (!errores.length) {
        const h = this.huella(lat, lng, esp.id, fecha, org.id), previo = existentes && existentes[h];
        const clave = [lat.toFixed(6), lng.toFixed(6), esp.id, fecha].join('|');
        if (previo && (usados[h] || 0) < previo.n) {
          usados[h] = (usados[h] || 0) + 1; yaEstaban++;
          if (!vistos[clave]) vistos[clave] = r + 1;   // la regla de repetidos dentro del archivo sigue igual
          errores.push(['Renglón', previo.cargado
            ? 'Ya está en el sistema: se cargó antes un árbol con el mismo punto, especie, fecha e institución.'
            : 'Ya está en el sistema: un árbol registrado en campo tiene el mismo punto, especie, fecha e institución.']);
        } else if (vistos[clave]) errores.push(['Renglón', 'Repite el renglón ' + vistos[clave] + ': mismo punto, especie y fecha.']);
        else vistos[clave] = r + 1;
      }
      const renglon = r + 1;   // como lo numera Excel
      errores.forEach(([columna, problema]) => problemas.push({ renglon, tipo: 'error', columna, problema, original }));
      avisos.forEach(([columna, problema]) => problemas.push({ renglon, tipo: 'aviso', columna, problema, original }));
      if (!errores.length) listos.push({ renglon, lat: +lat.toFixed(6), lng: +lng.toFixed(6), t, especie: esp, fecha, programa: prog, org, conAviso: avisos.length > 0 });
    }
    // Las jornadas que se formarán: institución, fecha, programa y alcaldía
    const jornadas = {};
    listos.forEach(a => { const k = [a.org.id, a.fecha, a.programa.id, a.t.alcaldia_cve].join('|'); (jornadas[k] = jornadas[k] || []).push(a); });
    return { listos, problemas, renglones, jornadas, yaEstaban };
  },

  async revisarArchivo(archivo) {
    this.archivo = archivo;
    this.revision = null;
    this.el('carga-revision').hidden = true;
    const aviso = this.el('carga-error-archivo');
    aviso.hidden = true;
    try {
      // El campo se vacía en cuanto se lee: así, el mismo archivo corregido y elegido otra vez se vuelve a revisar
      this.el('carga-archivo').value = '';
      const { filas } = await SRP.excel.leer(archivo);
      if (!filas.length || filas.length < 2) throw new Error('El archivo no tiene renglones debajo de los encabezados.');
      this.revision = this.revisar(filas, await this.existentes());
      this.pintarRevision();
    } catch (e) {
      aviso.hidden = false;
      aviso.textContent = e.message || 'No se pudo leer el archivo.';
      aviso.focus({ preventScroll: false });
    }
  },

  pintarRevision() {
    const esc = SRP.util.escapar, num = x => x.toLocaleString('es-MX');
    const v = this.revision;
    const errores = new Set(v.problemas.filter(p => p.tipo === 'error').map(p => p.renglon)).size;
    const conAviso = v.listos.filter(a => a.conAviso).length;
    const nj = Object.keys(v.jornadas).length;
    const insts = new Set(v.listos.map(a => a.org.id)).size;
    const fechas = v.listos.map(a => a.fecha).sort();
    this.el('carga-resumen').innerHTML =
      '<p><b>' + esc(this.archivo.name) + '</b>: ' + num(v.renglones) + (v.renglones === 1 ? ' renglón.' : ' renglones.') + '</p>' +
      '<ul class="carga-cifras">' +
      '<li class="carga-ok"><b>' + num(v.listos.length) + '</b> ' + (v.listos.length === 1 ? 'árbol listo' : 'árboles listos') + ' para cargar' + (conAviso ? ', ' + num(conAviso) + ' con aviso' : '') + '</li>' +
      '<li class="carga-mal"><b>' + num(errores) + '</b> ' + (errores === 1 ? 'renglón con error, que no se carga' : 'renglones con error, que no se cargan') +
        (v.yaEstaban ? '; ' + (v.yaEstaban === 1 ? 'de ellos, 1 ya estaba en el sistema' : 'de ellos, ' + num(v.yaEstaban) + ' ya estaban en el sistema') +
          (v.yaEstaban === v.renglones ? ': este archivo ya se había cargado' : '') : '') + '</li>' +
      (v.listos.length ? '<li>Se formarán <b>' + num(nj) + '</b> ' + (nj === 1 ? 'jornada cerrada' : 'jornadas cerradas') + ' de ' + num(insts) + (insts === 1 ? ' institución' : ' instituciones') +
        ', del ' + esc(SRP.util.formatearFecha(fechas[0])) + ' al ' + esc(SRP.util.formatearFecha(fechas[fechas.length - 1])) + '</li>' : '') +
      '</ul>';
    const lista = v.problemas.slice(0, this.MAX_A_LA_VISTA);
    this.el('carga-problemas').innerHTML = v.problemas.length
      ? '<h3>Renglones con problemas</h3><ol class="cmb-lista carga-problemas">' +
        lista.map(p => '<li class="cmb-item" data-tipo="' + p.tipo + '"><span class="cmb-fecha">Renglón ' + p.renglon + ' · ' + esc(p.columna) + '</span>' +
          '<span class="cmb-que"><b>' + (p.tipo === 'error' ? 'Error' : 'Aviso') + ':</b> ' + esc(p.problema) + '</span></li>').join('') +
        '</ol>' + (v.problemas.length > lista.length ? '<p class="nota">Y ' + num(v.problemas.length - lista.length) + ' más: descárguelos todos en Excel.</p>' : '')
      : '<p class="nota">Ningún renglón tiene problemas.</p>';
    this.el('btn-carga-errores').hidden = !v.problemas.length;
    const cargar = this.el('btn-carga-cargar');
    cargar.hidden = !v.listos.length;
    cargar.querySelector('span').textContent = 'Cargar ' + num(v.listos.length) + (v.listos.length === 1 ? ' árbol' : ' árboles');
    this.el('carga-revision').hidden = false;
    this.el('titulo-carga-revision').focus({ preventScroll: false });
  },

  // Los renglones con error o aviso, con sus datos tal como venían y el problema, para corregirlos en Excel
  async descargarProblemas() {
    const v = this.revision; if (!v) return;
    const hoja = { nombre: 'Problemas', columnas: [{ titulo: 'Renglón', ancho: 10 }, { titulo: 'Tipo', ancho: 8 }, { titulo: 'Columna', ancho: 20 }, { titulo: 'Problema', ancho: 70 }]
      .concat(this.COLUMNAS.map(c => ({ titulo: c.titulo, ancho: c.ancho }))),
      filas: v.problemas.map(p => [p.renglon, p.tipo === 'error' ? 'Error' : 'Aviso', p.columna, p.problema].concat(p.original)) };
    const base = String(this.archivo.name).replace(/\.[^.]+$/, '').replace(/[^\w.-]+/g, '_');
    await SRP.reportes.entregarArchivo(SRP.excel.armar([hoja]), 'Problemas_' + base + '.xlsx', 'Renglones con problemas');
  },

  /* ---------- Carga ---------- */

  async cargar() {
    if (!SRP.permisos.exigir('carga.masiva')) return;
    const v = this.revision; if (!v || !v.listos.length) return;
    const num = x => x.toLocaleString('es-MX');
    const nj = Object.keys(v.jornadas).length;
    const ok = await SRP.app.confirmar({ titulo: 'Carga masiva', pregunta: '¿Cargar ' + num(v.listos.length) + (v.listos.length === 1 ? ' árbol?' : ' árboles?'),
      puntos: ['Se formarán ' + num(nj) + (nj === 1 ? ' jornada cerrada' : ' jornadas cerradas') + ' a su nombre, marcadas como carga histórica.',
        'Los renglones con error no se cargan.', 'Cada árbol queda en la bitácora y el lote en el Registro de cambios.'],
      boton: 'Cargar', icono: 'palomita' });
    if (!ok) return;
    const libre = SRP.util.ocupado(this.el('btn-carga-cargar'), 'Cargando…', 'subir');
    try {
      const r = await this.guardar(v, this.archivo.name);
      SRP.util.anunciar('Carga terminada: ' + num(r.arboles) + (r.arboles === 1 ? ' árbol' : ' árboles') + ' en ' + num(r.jornadas) + (r.jornadas === 1 ? ' jornada.' : ' jornadas.'), 'exito');
      this.preparar();
      this.el('carga-hecha').hidden = false;
      this.el('carga-hecha').textContent = 'Última carga: ' + num(r.arboles) + (r.arboles === 1 ? ' árbol' : ' árboles') + ' en ' + num(r.jornadas) + (r.jornadas === 1 ? ' jornada' : ' jornadas') +
        ' del archivo «' + r.archivo + '». Se ven en Jornadas, Registros y Supervisión. Si fue el archivo equivocado, se deshace abajo, en «Cargas hechas».';
    } finally { libre(); }
  },

  // Arma y guarda todo en una sola transacción. Devuelve cuántos árboles y jornadas quedaron
  async guardar(v, archivo) {
    const u = SRP.sesion.usuario, ahora = SRP.util.ahoraISO();
    const lote = SRP.util.generarId();
    const jornadas = [], arboles = [], bitacora = [];
    const bit = (accion, entidad, id, detalle) => bitacora.push(SRP.bitacora.entrada(accion, entidad, id, detalle));
    Object.values(v.jornadas).forEach(grupo => {
      const a0 = grupo[0];
      const lat = +(grupo.reduce((s, a) => s + a.lat, 0) / grupo.length).toFixed(6), lng = +(grupo.reduce((s, a) => s + a.lng, 0) / grupo.length).toFixed(6);
      const tc = SRP.derivacion.derivar(lat, lng);
      const t = tc.alcaldia_cve === a0.t.alcaldia_cve ? tc : a0.t;
      const id = SRP.util.generarId();
      const regs = grupo.map(a => ({
        id: SRP.util.generarId(), estatus: 'activo', cabo_id: u.id, lat: a.lat, lng: a.lng, punto_origen: 'manual', gps_precision_m: null, folio: null,
        especie_id: a.especie.id, especie_otra: '',
        alcaldia_cve: a.t.alcaldia_cve, alcaldia: a.t.alcaldia, colonia_cve: a.t.colonia_cve, colonia: a.t.colonia, uga: a.t.uga, uga_borde_m: a.t.uga_borde_m, capa_version: a.t.capa_version,
        programa_id: a.programa.id, fecha_plantacion: a.fecha, jornada_id: id, comentarios: '',
        foto_base64: null, foto_id: null, fecha_registro: ahora, fecha_ultima_edicion: null, editado_por_id: null,
        sustituye_id: null, motivo_sustitucion: null, motivo_sustitucion_otro: '', sustituido_por_id: null }));
      // Los avisos de una carga histórica no los revisa nadie en campo: quedan como revisados
      const revisados = Object.keys(SRP.jornadas.avisos({ registros: regs }));
      jornadas.push(Object.assign({
        id, nombre: 'Carga histórica · ' + (t.alcaldia || a0.t.alcaldia), ubicacion: '', programa_id: a0.programa.id,
        lat, lng, punto_origen: 'manual', gps_precision_m: null,
        alcaldia_cve: t.alcaldia_cve, alcaldia: t.alcaldia, colonia_cve: t.colonia_cve, colonia: t.colonia,
        fecha: a0.fecha, comentarios: 'Carga masiva del archivo «' + archivo + '».', cabo_id: u.id, organizacion_id: a0.org.id,
        estatus: 'cerrada', fecha_inicio: ahora, fecha_cierre: ahora, encargado_id: u.id, relevo_id: null, relevos: [], ...SRP.solicitud.vacio(), editado_por_id: null, fecha_ultima_edicion: null,
        arboles_previstos: regs.length, puntos_revisados: revisados, reporte_en: null, carga_id: lote,
        vehiculo_id: null, vehiculo_placa: '', vehiculo_modelo: '', vehiculo_tipo: ''
      }, Object.fromEntries(SRP.reportes.CAMPOS.map(k => [k, '']))));
      bit('CREADO', 'jornada', id, 'Carga masiva: ' + regs.length + (regs.length === 1 ? ' árbol' : ' árboles'));
      regs.forEach(a => bit('CREADO', 'plantacion', a.id, 'Carga masiva'));
      arboles.push(...regs);
    });
    // Folio: con datos de prueba se emite al cargar, como lo hará el servidor; con datos reales, pendiente
    const recibidos = {};
    let secuencias = null;
    if (SRP.folio.simulado()) {
      secuencias = SRP.folio.leerSecuencias();
      arboles.filter(a => SRP.folio.puedeEmitir(a)).forEach(a => {
        const celda = a.uga && /^[A-Z]{3}-\d{3}$/.test(a.uga) ? a.uga : 'EXT-000';
        secuencias[celda] = (secuencias[celda] || 0) + 1;
        a.folio = SRP.folio.armar(celda, secuencias[celda]);
        recibidos[a.id] = ahora;
      });
    }
    const insts = new Set(jornadas.map(j => j.organizacion_id)).size;
    bitacora.push(SRP.bitacora.entrada('CREADO', 'carga', lote, 'Archivo «' + archivo + '»: ' + arboles.length + (arboles.length === 1 ? ' árbol' : ' árboles') + ' en ' + jornadas.length +
      (jornadas.length === 1 ? ' jornada' : ' jornadas') + ' de ' + insts + (insts === 1 ? ' institución' : ' instituciones')));
    await SRP.almacen._tx(['jornadas', 'plantaciones', 'bitacora'], 'readwrite', (tx) => {
      jornadas.forEach(j => tx.objectStore('jornadas').put(j));
      arboles.forEach(a => tx.objectStore('plantaciones').put(a));
      bitacora.forEach(b => tx.objectStore('bitacora').put(b));
    });
    if (secuencias) {
      try { localStorage.setItem(SRP.CONFIG.CLAVE_SECUENCIAS_PRUEBA, JSON.stringify(secuencias)); } catch (e) { /* sin persistencia */ }
      const e = SRP.envio.leer(); Object.assign(e.recibidos, recibidos); SRP.envio.escribir(e);
    }
    SRP.almacen.cuidarAlmacenamiento();
    return { arboles: arboles.length, jornadas: jornadas.length, archivo, lote };
  },

  /* ---------- Cargas hechas ---------- */

  // El archivo de un lote, tal como lo anotó la bitácora al cargarlo
  archivoDe(entrada) {
    const m = /«(.+?)»/.exec((entrada && entrada.detalle) || '');
    return m ? m[1] : '';
  },

  // Cada lote, lo más reciente primero: cuándo, quién, qué dice la bitácora y si ya se deshizo
  async lotes() {
    const bit = (await SRP.almacen.todos('bitacora')).filter(b => b.entidad === 'carga');
    const deshechos = {};
    bit.filter(b => b.accion === 'ELIMINADO').forEach(b => { deshechos[b.entidad_id] = b; });
    const quedan = {};
    (await SRP.almacen.todos('jornadas')).forEach(j => { if (j.carga_id) quedan[j.carga_id] = (quedan[j.carga_id] || 0) + 1; });
    return bit.filter(b => b.accion === 'CREADO').sort((a, b) => String(b.fecha).localeCompare(String(a.fecha)))
      .map(b => ({ id: b.entidad_id, entrada: b, deshecho: deshechos[b.entidad_id] || null, jornadas: quedan[b.entidad_id] || 0 }));
  },

  async pintarLotes() {
    const esc = SRP.util.escapar, cuando = iso => SRP.configuracion.cuando(iso);
    const lotes = await this.lotes();
    this.el('carga-lotes-vacio').hidden = lotes.length > 0;
    this.el('carga-lotes').innerHTML = lotes.map(l => {
      const b = l.entrada, quien = b.usuario_nombre || SRP.ref.nombreUsuario(b.usuario_id);
      const estado = l.deshecho
        ? '<span class="cmb-campos">Deshecha el ' + esc(cuando(l.deshecho.fecha)) + ' por ' + esc(l.deshecho.usuario_nombre || SRP.ref.nombreUsuario(l.deshecho.usuario_id)) + '</span>'
        : l.jornadas ? '<button type="button" class="btn btn-secundario" data-lote="' + esc(l.id) + '">' + SRP.ICONOS.svg('basura', 'medio') + '<span>Deshacer carga</span></button>'
          : '<span class="cmb-campos">Sus jornadas ya no están en el sistema</span>';
      return '<li class="cmb-item" data-estado="' + (l.deshecho ? 'deshecha' : 'vigente') + '"><span class="cmb-fecha">' + esc(cuando(b.fecha)) + '</span>' +
        '<span class="cmb-que">' + esc(b.detalle || '') + '</span><span class="cmb-quien">Por ' + esc(quien) + '</span>' + estado + '</li>';
    }).join('');
  },

  /* Deshace un lote completo: quita sus jornadas y todos los árboles que tienen hoy, en una sola
     transacción. Antes dice cuántos son y si alguno se editó o se agregó después de cargarlo. */
  async deshacer(lote) {
    if (!SRP.permisos.exigir('carga.masiva')) return;
    const num = x => x.toLocaleString('es-MX'), pl = (n, uno, varios) => num(n) + ' ' + (n === 1 ? uno : varios);
    const jornadas = (await SRP.almacen.todos('jornadas')).filter(j => j.carga_id === lote);
    if (!jornadas.length) { SRP.util.anunciar('Esa carga ya no tiene jornadas en el sistema.', 'aviso'); return this.pintarLotes(); }
    const porId = {}; jornadas.forEach(j => { porId[j.id] = j; });
    const arboles = (await SRP.almacen.todos('plantaciones')).filter(a => porId[a.jornada_id]);
    const agregados = arboles.filter(a => a.fecha_registro !== porId[a.jornada_id].fecha_inicio).length;
    const editados = arboles.filter(a => a.fecha_ultima_edicion && a.fecha_registro === porId[a.jornada_id].fecha_inicio).length + jornadas.filter(j => j.fecha_ultima_edicion).length;
    const entrada = (await SRP.almacen.todos('bitacora')).find(b => b.entidad === 'carga' && b.accion === 'CREADO' && b.entidad_id === lote);
    const archivo = this.archivoDe(entrada);
    const ok = await SRP.app.confirmar({ titulo: 'Deshacer carga masiva',
      pregunta: '¿Quitar ' + pl(arboles.length, 'árbol', 'árboles') + ' y ' + pl(jornadas.length, 'jornada', 'jornadas') + (archivo ? ' del archivo «' + archivo + '»' : '') + '?',
      puntosTitulo: 'Qué pasa:', puntos: [
        'Se quitan del sistema y los informes dejan de contarlos.',
        editados ? pl(editados, 'árbol o jornada se editó', 'árboles o jornadas se editaron') + ' después de cargarlos; también se quitan.' : '',
        agregados ? pl(agregados, 'árbol se agregó', 'árboles se agregaron') + ' después a esas jornadas; también se quitan.' : '',
        'El Registro de cambios conserva la carga y que se deshizo.'],
      irreversible: true, boton: 'Deshacer carga', icono: 'basura', escribir: 'DESHACER' });
    if (!ok) return;
    const ids = new Set(arboles.map(a => a.id));
    const detalle = 'Carga deshecha' + (archivo ? ' del archivo «' + archivo + '»' : '') + ': ' + pl(arboles.length, 'árbol', 'árboles') + ' y ' + pl(jornadas.length, 'jornada', 'jornadas') + ' quitados';
    const salida = SRP.bitacora.entrada('ELIMINADO', 'carga', lote, detalle);
    await SRP.almacen._tx(['jornadas', 'plantaciones', 'bitacora'], 'readwrite', (tx) => {
      arboles.forEach(a => tx.objectStore('plantaciones').delete(a.id));
      jornadas.forEach(j => tx.objectStore('jornadas').delete(j.id));
      tx.objectStore('bitacora').put(salida);
    });
    // Lo que el servidor simulado tenía por recibido de esos árboles deja de contar
    if (SRP.envio.simulado()) {
      const e = SRP.envio.leer();
      ids.forEach(id => { delete e.recibidos[id]; });
      e.cambios = e.cambios.filter(id => !ids.has(id));
      SRP.envio.escribir(e);
    }
    this.el('carga-hecha').hidden = false;
    this.el('carga-hecha').textContent = detalle + '.';
    SRP.util.anunciar(detalle + '.', 'exito');
    await this.pintarLotes();
  }
};

SRP.util.proteger(SRP.carga, { cargar: 'cargar los árboles', deshacer: 'deshacer la carga' });
