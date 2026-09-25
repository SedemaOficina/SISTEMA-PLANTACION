/* FOTOGRAFÍAS: GALERÍA PARA COORDINACIÓN Y ADMINISTRACIÓN (D118).

   PARA QUÉ. Quien coordina o administra necesita ver las fotografías de los árboles registrados
   y llevárselas: para un informe, para revisar un sitio o para responder una solicitud. La
   galería enseña las fotografías de los registros activos que alcanza quien entró (las de su
   cuadrilla o todas), con los mismos atajos de fecha que Registros y el filtro por cabo.

   QUÉ SE PUEDE HACER. Tocar una fotografía la abre grande con los datos del árbol (especie,
   fecha, cabo, folio, lugar) y dos salidas: «Descargar» esa foto y «Ver registro». Arriba,
   «Descargar todas» arma un ZIP con las fotografías filtradas, cada una con nombre legible:
   Foto_<folio o identificador>_<fecha>_<especie>.jpg. El ZIP se arma aquí, sin biblioteca:
   las fotografías ya son JPEG y no se comprimen más (modo «almacenar»). En teléfono se
   comparte con las apps del dispositivo; en computadora se descarga (D61).

   El cabo no tiene galería: sus fotografías las ve en cada registro. */
window.SRP = window.SRP || {};

SRP.galeria = {
  filtro: { dia: '', cabo: '', jornada: '' },
  diaAbierto: false,
  fotos: [],
  actual: null,

  el(id) { return document.getElementById(id); },

  iniciar() {
    this.el('galeria-atajos').addEventListener('click', (e) => {
      const b = e.target.closest('.chip'); if (!b) return;
      this.aplicarAtajo(b.dataset.atajo);
    });
    this.el('galeria-dia').addEventListener('change', () => { this.filtro.dia = this.el('galeria-dia').value; this.diaAbierto = true; this.pintar(); });
    this.el('galeria-cabo').addEventListener('change', () => { this.filtro.cabo = this.el('galeria-cabo').value; this.filtro.jornada = ''; this.pintar(); });
    this.el('galeria-jornada').addEventListener('change', () => { this.filtro.jornada = this.el('galeria-jornada').value; this.pintar(); });
    this.el('galeria-vacio').addEventListener('click', (e) => {
      const b = e.target.closest('button[data-vacio]'); if (!b) return;
      if (b.dataset.vacio === 'registrar') { SRP.app.mostrarVista('registrar'); return; }
      this.filtro.cabo = ''; this.filtro.jornada = ''; if (this.el('galeria-cabo')) this.el('galeria-cabo').value = '';
      this.aplicarAtajo('todas');
    });
    this.el('galeria-rejilla').addEventListener('click', (e) => {
      const b = e.target.closest('button[data-id]'); if (!b) return;
      const r = this.fotos.find(x => x.id === b.dataset.id); if (r) this.abrir(r);
    });
    this.el('btn-galeria-zip').addEventListener('click', () => this.descargarTodas());
    this.el('btn-foto-descargar').addEventListener('click', () => { if (this.actual) this.descargar(this.actual); });
    this.el('btn-foto-registro').addEventListener('click', () => {
      if (!this.actual) return;
      this.el('dlg-foto').close();
      SRP.registros.verDetalle(this.actual);
    });
    this.el('btn-foto-cerrar').addEventListener('click', () => this.el('dlg-foto').close());
    this.el('btn-galeria-zip').innerHTML = SRP.ICONOS.svg('descargar', 'medio') + '<span>Descargar todas</span>';
    this.el('btn-foto-descargar').innerHTML = SRP.ICONOS.svg('descargar', 'medio') + '<span>Descargar</span>';
    this.el('btn-foto-registro').innerHTML = SRP.ICONOS.svg('ver', 'medio') + '<span>Ver detalle</span>';
  },

  /* ---------- Datos ---------- */

  async conFoto() {
    const u = SRP.sesion.usuario;
    return (await SRP.almacen.porIndice('plantaciones', 'estatus', 'activo'))
      .filter(r => SRP.util.fotoSegura(r.foto_base64) && SRP.permisos.alcanza(u, r, SRP.ref.usuarioPorId))   // sólo imágenes válidas (D150)
      .sort((a, b) => b.fecha_plantacion.localeCompare(a.fecha_plantacion) || b.fecha_registro.localeCompare(a.fecha_registro));
  },

  async preparar() {
    SRP.util.pintarChipHoy(this.el('galeria-chip-hoy'));
    const todas = await this.conFoto();
    const ids = [...new Set(todas.map(r => r.cabo_id))];
    const sel = this.el('galeria-cabo');
    sel.innerHTML = '<option value="">Todos</option>' + ids
      .map(id => [id, SRP.ref.nombreUsuario(id)]).sort((a, b) => a[1].localeCompare(b[1], 'es'))
      .map(([id, n]) => '<option value="' + SRP.util.escapar(id) + '">' + SRP.util.escapar(n) + '</option>').join('');
    sel.value = ids.includes(this.filtro.cabo) ? this.filtro.cabo : '';
    this.filtro.cabo = sel.value;
    await this.pintar();
  },

  aplicarAtajo(atajo) {
    const f = this.filtro;
    f.jornada = '';   // al cambiar de día, la jornada elegida ya no aplica
    if (atajo === 'hoy') { f.dia = SRP.util.fechaHoy(); this.diaAbierto = false; this.el('galeria-dia').value = ''; }
    if (atajo === 'todas') { f.dia = ''; this.diaAbierto = false; this.el('galeria-dia').value = ''; }
    if (atajo === 'dia') { this.diaAbierto = true; f.dia = this.el('galeria-dia').value; }
    this.pintar();
  },

  sincronizarAtajos() {
    const f = this.filtro;
    const activo = { hoy: !this.diaAbierto && f.dia === SRP.util.fechaHoy(), dia: this.diaAbierto, todas: !this.diaAbierto && !f.dia };
    this.el('galeria-atajos').querySelectorAll('.chip').forEach(c => c.setAttribute('aria-pressed', String(!!activo[c.dataset.atajo])));
    this.el('galeria-un-dia').hidden = !this.diaAbierto;
    this.el('galeria-atajos').querySelector('[data-atajo="dia"]').setAttribute('aria-expanded', String(this.diaAbierto));
  },

  // Las jornadas con fotografías dentro del día y cabo elegidos, la más reciente arriba (D135)
  llenarJornadas(fotosDiaCabo) {
    const ids = [...new Set(fotosDiaCabo.map(r => r.jornada_id).filter(Boolean))];
    const js = ids.map(id => this.jornadasPorId[id]).filter(Boolean).sort((a, b) => b.fecha.localeCompare(a.fecha) || b.fecha_inicio.localeCompare(a.fecha_inicio));
    const sel = this.el('galeria-jornada');
    sel.innerHTML = '<option value="">Todas</option>' + js.map(j => '<option value="' + SRP.util.escapar(j.id) + '">' + SRP.util.escapar(j.nombre) + ' · ' + SRP.util.escapar(SRP.util.formatearFecha(j.fecha)) + '</option>').join('');
    if (!ids.includes(this.filtro.jornada)) this.filtro.jornada = '';
    sel.value = this.filtro.jornada;
    sel.disabled = !js.length;
  },

  async pintar() {
    const f = this.filtro;
    this.sincronizarAtajos();
    this.jornadasPorId = Object.fromEntries((await SRP.almacen.todos('jornadas')).map(j => [j.id, j]));
    const diaCabo = (await this.conFoto()).filter(r => (!f.dia || r.fecha_plantacion === f.dia) && (!f.cabo || r.cabo_id === f.cabo));
    this.llenarJornadas(diaCabo);
    this.fotos = diaCabo.filter(r => !f.jornada || r.jornada_id === f.jornada);
    const esc = SRP.util.escapar;
    this.el('galeria-rejilla').innerHTML = this.fotos.map(r => {
      const e = SRP.ref.especieDe(r);
      const j = r.jornada_id && this.jornadasPorId[r.jornada_id];
      return '<li><button type="button" class="galeria-foto" data-id="' + SRP.util.escapar(r.id) + '" aria-label="' + esc(e.comun) + ', ' + esc(SRP.util.formatearFecha(r.fecha_plantacion)) + (j ? ', ' + esc(j.nombre) : '') + ', ' + esc(SRP.ref.nombreUsuario(r.cabo_id)) + '">' +
        '<img src="' + SRP.util.fotoSegura(r.foto_base64) + '" alt="" loading="lazy">' +
        '<span class="galeria-pie">' + esc(e.comun) + '<br>' + (j ? '<span class="galeria-jornada">' + esc(j.nombre) + '</span> · ' : '') + esc(SRP.util.formatearFecha(r.fecha_plantacion)) + '</span></button></li>';
    }).join('');
    const n = this.fotos.length;
    const peso = this.fotos.reduce((s, r) => s + (r.foto_bytes || 0), 0);
    this.el('galeria-cuenta').textContent = n ? (n === 1 ? '1 fotografía' : n + ' fotografías') + (peso ? ' · ' + SRP.foto.formatearPeso(peso) : '') : '';
    this.el('btn-galeria-zip').disabled = !n;
    const vacio = this.el('galeria-vacio');
    vacio.hidden = n > 0;
    // Estado vacío con salida (D141): con filtros, quitarlos; sin fotografías, ir a registrar
    const filtrado = f.dia || f.cabo || f.jornada;
    if (!n) vacio.innerHTML = filtrado
      ? SRP.util.htmlVacio('camara', 'No hay fotografías con estos filtros.', 'Pruebe con otra jornada, otro día u otro cabo.', [{ accion: 'todas', texto: 'Ver todas' }])
      : SRP.util.htmlVacio('camara', 'Todavía no hay fotografías.', 'Aparecen aquí las que se agregan a los registros; la fotografía es opcional.',
          [SRP.permisos.de(SRP.sesion.usuario).registrar ? { accion: 'registrar', texto: 'Registrar árbol', clase: 'btn-primario', icono: 'mas' } : null]);
  },

  /* ---------- Una fotografía ---------- */

  async abrir(r) {
    this.actual = r;
    const esc = SRP.util.escapar;
    const e = SRP.ref.especieDe(r);
    const jornada = r.jornada_id ? await SRP.almacen.uno('jornadas', r.jornada_id) : null;
    this.el('dlg-foto-titulo').textContent = e.comun;
    this.el('dlg-foto-img').src = r.foto_base64;
    this.el('dlg-foto-img').alt = 'Fotografía del ' + e.comun + ' registrado el ' + SRP.util.formatearFecha(r.fecha_plantacion);
    this.el('dlg-foto-datos').innerHTML = [
      ['Jornada', jornada ? jornada.nombre : 'Sin jornada'],
      ['Fecha de plantación', SRP.util.formatearFecha(r.fecha_plantacion)],
      ['Cabo', SRP.ref.nombreUsuario(r.cabo_id)],
      ['Lugar', [SRP.ref.alcaldia(r.alcaldia), r.colonia ? SRP.ref.colonia(r.colonia) : ''].filter(Boolean).join(', ')],
      ['Folio', SRP.folio.textoLargo(r)],
      ['Archivo', this.nombreFoto(r) + (r.foto_bytes ? ' · ' + SRP.foto.formatearPeso(r.foto_bytes) : '')]
    ].map(([k, v]) => '<div class="revision-fila revision-fila-sola"><dt>' + k + '</dt><dd>' + esc(v) + '</dd></div>').join('');
    this.el('dlg-foto').showModal();
  },

  // Nombre legible y seguro para cualquier sistema de archivos: Foto_CUH-021-00001_2026-09-23_Fresno.jpg
  nombreFoto(r) {
    const e = SRP.ref.especieDe(r);
    const limpio = t => String(t || '').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^A-Za-z0-9-]+/g, '_').replace(/^_+|_+$/g, '');
    const clave = SRP.folio.valido(r.folio) ? r.folio : r.id.slice(0, 8);
    return 'Foto_' + limpio(clave) + '_' + r.fecha_plantacion + '_' + limpio(e.comun).slice(0, 30) + '.jpg';
  },

  bytesDe(r) {
    const coma = r.foto_base64.indexOf(',');
    const bin = atob(r.foto_base64.slice(coma + 1));
    const out = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  },

  async descargar(r) {
    const blob = new Blob([this.bytesDe(r)], { type: 'image/jpeg' });
    const res = await SRP.reportes.entregarArchivo(blob, this.nombreFoto(r), 'Fotografía del registro');
    if (res !== 'cancelado') SRP.util.anunciarSilencioso('Fotografía descargada.');
  },

  async descargarTodas() {
    if (!SRP.permisos.exigir('galeria.descargar')) return;
    if (!this.fotos.length) return;
    const b = this.el('btn-galeria-zip');
    // Armar el ZIP puede tardar con muchas fotografías: el botón cambia de texto y queda con
    // aria-busy mientras dura, para que no parezca colgado (D136).
    const html0 = b.innerHTML;
    b.disabled = true;
    b.setAttribute('aria-busy', 'true');
    b.innerHTML = SRP.ICONOS.svg('info', 'medio') + '<span>Armando…</span>';
    try {
      // El armado es síncrono y ocupa el hilo: se cede un cuadro para que «Armando…» se pinte antes
      await new Promise(r => requestAnimationFrame(() => setTimeout(r, 0)));
      const nombres = new Set();
      const entradas = this.fotos.map(r => {
        let n = this.nombreFoto(r);
        if (nombres.has(n)) n = n.replace(/\.jpg$/, '_' + r.id.slice(0, 6) + '.jpg');   // dos árboles de la misma especie sin folio
        nombres.add(n);
        return { nombre: n, datos: this.bytesDe(r), fecha: new Date(r.fecha_registro || Date.now()) };
      });
      const blob = SRP.zip.armar(entradas);
      const f = this.filtro;
      const limpio = t => t.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^A-Za-z0-9]+/g, '_').replace(/^_|_$/g, '');
      const j = f.jornada && this.jornadasPorId[f.jornada];
      // Con una jornada elegida, el ZIP lleva su nombre y su fecha (D135)
      const nombre = 'Fotografias_SRP' + (j ? '_' + limpio(j.nombre).slice(0, 40) + '_' + j.fecha : (f.dia ? '_' + f.dia : '')) + (f.cabo ? '_' + limpio(SRP.ref.nombreUsuario(f.cabo)) : '') + '.zip';
      const res = await SRP.reportes.entregarArchivo(blob, nombre, 'Fotografías de los registros');
      if (res !== 'cancelado') SRP.util.anunciar((entradas.length === 1 ? '1 fotografía' : entradas.length + ' fotografías') + ' en ' + nombre + ' (' + SRP.foto.formatearPeso(blob.size) + ').');
    } catch (err) {
      SRP.util.anunciar('No se pudo armar el archivo: ' + err.message, 'alerta');
    } finally {
      b.disabled = false;
      b.removeAttribute('aria-busy');
      b.innerHTML = html0;
    }
  }
};

/* ZIP SIN COMPRIMIR (método «almacenar»), suficiente para fotografías JPEG que ya vienen
   comprimidas. Formato PKZIP: encabezado local + datos por archivo, directorio central y fin de
   directorio. CRC-32 con tabla. Fechas en formato DOS. */
SRP.zip = {
  _tabla: null,

  tabla() {
    if (this._tabla) return this._tabla;
    const t = new Uint32Array(256);
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1;
      t[n] = c >>> 0;
    }
    return (this._tabla = t);
  },

  crc32(bytes) {
    const t = this.tabla();
    let c = 0xFFFFFFFF;
    for (let i = 0; i < bytes.length; i++) c = t[(c ^ bytes[i]) & 0xFF] ^ (c >>> 8);
    return (c ^ 0xFFFFFFFF) >>> 0;
  },

  fechaDos(d) {
    const hora = (d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() >> 1);
    const fecha = ((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate();
    return { hora, fecha };
  },

  // entradas: [{ nombre, datos: Uint8Array, fecha: Date }] → Blob
  armar(entradas) {
    const enc = new TextEncoder();
    const partes = [];
    const central = [];
    let desplazamiento = 0;
    const u16 = (v) => [v & 0xFF, (v >>> 8) & 0xFF];
    const u32 = (v) => [v & 0xFF, (v >>> 8) & 0xFF, (v >>> 16) & 0xFF, (v >>> 24) & 0xFF];
    entradas.forEach(e => {
      const nombre = enc.encode(e.nombre);
      const crc = this.crc32(e.datos);
      const { hora, fecha } = this.fechaDos(e.fecha || new Date());
      const local = new Uint8Array([
        0x50, 0x4B, 0x03, 0x04, ...u16(20), ...u16(0x0800), ...u16(0), ...u16(hora), ...u16(fecha),
        ...u32(crc), ...u32(e.datos.length), ...u32(e.datos.length), ...u16(nombre.length), ...u16(0)
      ]);
      partes.push(local, nombre, e.datos);
      central.push(new Uint8Array([
        0x50, 0x4B, 0x01, 0x02, ...u16(20), ...u16(20), ...u16(0x0800), ...u16(0), ...u16(hora), ...u16(fecha),
        ...u32(crc), ...u32(e.datos.length), ...u32(e.datos.length), ...u16(nombre.length), ...u16(0), ...u16(0),
        ...u16(0), ...u16(0), ...u32(0), ...u32(desplazamiento)
      ]), nombre);
      desplazamiento += local.length + nombre.length + e.datos.length;
    });
    const tamCentral = central.reduce((s, p) => s + p.length, 0);
    const fin = new Uint8Array([
      0x50, 0x4B, 0x05, 0x06, ...u16(0), ...u16(0), ...u16(entradas.length), ...u16(entradas.length),
      ...u32(tamCentral), ...u32(desplazamiento), ...u16(0)
    ]);
    return new Blob([...partes, ...central, fin], { type: 'application/zip' });
  }
};
