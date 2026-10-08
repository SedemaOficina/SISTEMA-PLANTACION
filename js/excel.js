/* EXCEL SIN BIBLIOTECA. Escribe y lee libros .xlsx con lo que ya trae el navegador, para que
   funcione sin señal y sin cargar un paquete de cientos de kilobytes.
   - Escribir: un .xlsx es un ZIP de archivos XML. Se arma con SRP.zip (galeria.js), sin comprimir:
     Excel lo abre igual. Textos en línea (sin tabla compartida), encabezado en negritas, fijo y con
     filtro, ancho de columna y, si se piden, listas para elegir en una columna.
   - Leer: se abre el ZIP leyendo su directorio central; lo comprimido se descomprime con
     DecompressionStream('deflate-raw'). Se leen la primera hoja, los textos compartidos y en línea,
     números y fechas (las fechas de Excel llegan como número de días desde 1899-12-30).
   - CSV: también se acepta, separado por comas o por punto y coma, con o sin BOM. */
window.SRP = window.SRP || {};

SRP.excel = {
  TIPO: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',

  /* ---------- Escribir ---------- */

  esc(t) { return String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, ''); },

  // 0 → A, 25 → Z, 26 → AA
  columna(i) { let s = ''; i++; while (i > 0) { const r = (i - 1) % 26; s = String.fromCharCode(65 + r) + s; i = Math.floor((i - 1) / 26); } return s; },

  hojaXml(h) {
    const cols = h.columnas.map((c, i) => '<col min="' + (i + 1) + '" max="' + (i + 1) + '" width="' + (c.ancho || 16) + '" customWidth="1"/>').join('');
    const celda = (v, ref, estilo) => {
      if (v === null || v === undefined || v === '') return '';
      if (typeof v === 'number' && isFinite(v)) return '<c r="' + ref + '"' + (estilo ? ' s="' + estilo + '"' : '') + '><v>' + v + '</v></c>';
      return '<c r="' + ref + '" t="inlineStr"' + (estilo ? ' s="' + estilo + '"' : '') + '><is><t xml:space="preserve">' + this.esc(v) + '</t></is></c>';
    };
    const filas = [h.columnas.map(c => c.titulo)].concat(h.filas || []);
    const ultima = this.columna(h.columnas.length - 1);
    const datos = filas.map((f, r) => '<row r="' + (r + 1) + '">' + f.map((v, c) => celda(v, this.columna(c) + (r + 1), r === 0 ? 1 : 0)).join('') + '</row>').join('');
    return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">' +
      '<sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>' +
      '<cols>' + cols + '</cols><sheetData>' + datos + '</sheetData>' +
      ((filas.length > 1 || h.filtro === true) && h.filtro !== false ? '<autoFilter ref="A1:' + ultima + filas.length + '"/>' : '') +
      this.validacionesXml(h.validaciones) + '</worksheet>';
  },

  /* Listas para elegir: `[{ rango: 'E2:E20001', lista: "'Programas'!$A$2:$A$6" }]`, o con `valores` fijos.
     Avisan sin impedir: un valor escrito fuera de la lista (un alias que la carga reconoce) se puede
     dejar, y la revisión de la carga dice si no sirve. */
  validacionesXml(lista) {
    if (!lista || !lista.length) return '';
    return '<dataValidations count="' + lista.length + '">' + lista.map(v => '<dataValidation type="list" allowBlank="1" showErrorMessage="1" errorStyle="warning" sqref="' + v.rango + '">' +
      '<formula1>' + this.esc(v.valores ? '"' + v.valores.join(',') + '"' : v.lista) + '</formula1></dataValidation>').join('') + '</dataValidations>';
  },

  /* hojas: [{ nombre, columnas: [{ titulo, ancho }], filas: [[valor…]] }] → Blob .xlsx */
  armar(hojas) {
    const enc = new TextEncoder(), ahora = new Date();
    const nombreHoja = n => this.esc(String(n).replace(/[\\/?*[\]:]/g, ' ').slice(0, 31));
    const archivos = [
      ['[Content_Types].xml', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
        '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/>' +
        '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>' +
        '<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>' +
        hojas.map((_, i) => '<Override PartName="/xl/worksheets/sheet' + (i + 1) + '.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>').join('') + '</Types>'],
      ['_rels/.rels', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
        '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>'],
      ['xl/workbook.xml', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>' +
        hojas.map((h, i) => '<sheet name="' + nombreHoja(h.nombre) + '" sheetId="' + (i + 1) + '" r:id="rId' + (i + 1) + '"/>').join('') + '</sheets></workbook>'],
      ['xl/_rels/workbook.xml.rels', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
        hojas.map((_, i) => '<Relationship Id="rId' + (i + 1) + '" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet' + (i + 1) + '.xml"/>').join('') +
        '<Relationship Id="rId' + (hojas.length + 1) + '" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>'],
      // Estilo 0: normal; estilo 1: encabezado en negritas sobre gris claro
      ['xl/styles.xml', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
        '<fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts>' +
        '<fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FFE9EDF0"/><bgColor indexed="64"/></patternFill></fill></fills>' +
        '<borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>' +
        '<cellXfs count="2"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1"/></cellXfs>' +
        '<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>']
    ].concat(hojas.map((h, i) => ['xl/worksheets/sheet' + (i + 1) + '.xml', this.hojaXml(h)]));
    const zip = SRP.zip.armar(archivos.map(([nombre, xml]) => ({ nombre, datos: enc.encode(xml), fecha: ahora })));
    return new Blob([zip], { type: this.TIPO });
  },

  /* ---------- Leer ---------- */

  /* Un archivo .xlsx o .csv → { filas: [[texto|número…]] } de su primera hoja. Lanza un Error con
     un mensaje para la persona si el archivo no se puede leer. */
  async leer(archivo) {
    const nombre = String(archivo.name || '').toLowerCase();
    const bytes = new Uint8Array(await archivo.arrayBuffer());
    if (nombre.endsWith('.csv') || nombre.endsWith('.txt')) return { filas: this.leerCsv(new TextDecoder('utf-8').decode(bytes)) };
    if (bytes[0] !== 0x50 || bytes[1] !== 0x4B) throw new Error('El archivo no es un libro de Excel (.xlsx) ni un CSV. Si es un .xls antiguo, guárdelo como .xlsx.');
    const zip = await this.abrirZip(bytes);
    const texto = async (ruta) => zip[ruta] ? new TextDecoder('utf-8').decode(await zip[ruta]()) : null;
    const dom = t => new DOMParser().parseFromString(t, 'application/xml');
    // La primera hoja del libro, por su relación
    const libro = dom(await texto('xl/workbook.xml') || '');
    const hoja = libro.getElementsByTagName('sheet')[0];
    if (!hoja) throw new Error('El libro no tiene hojas.');
    const rid = hoja.getAttribute('r:id') || hoja.getAttributeNS('http://schemas.openxmlformats.org/officeDocument/2006/relationships', 'id');
    const rels = dom(await texto('xl/_rels/workbook.xml.rels') || '');
    let ruta = 'xl/worksheets/sheet1.xml';
    [...rels.getElementsByTagName('Relationship')].forEach(r => { if (r.getAttribute('Id') === rid) ruta = 'xl/' + r.getAttribute('Target').replace(/^\/?xl\//, '').replace(/^\//, ''); });
    const compartidos = [];
    const sst = await texto('xl/sharedStrings.xml');
    if (sst) [...dom(sst).getElementsByTagName('si')].forEach(si => compartidos.push([...si.getElementsByTagName('t')].map(t => t.textContent).join('')));
    const xml = await texto(ruta);
    if (!xml) throw new Error('No se encontró la primera hoja del libro.');
    const filas = [];
    [...dom(xml).getElementsByTagName('row')].forEach(row => {
      const n = Number(row.getAttribute('r')) - 1;
      const fila = [];
      [...row.getElementsByTagName('c')].forEach((c, i) => {
        const ref = c.getAttribute('r');
        const col = ref ? this.indiceColumna(ref) : i;
        const t = c.getAttribute('t');
        const v = c.getElementsByTagName('v')[0];
        let valor = '';
        if (t === 's') valor = compartidos[Number(v && v.textContent)] || '';
        else if (t === 'inlineStr') valor = [...c.getElementsByTagName('t')].map(x => x.textContent).join('');
        else if (t === 'str' || t === 'e') valor = v ? v.textContent : '';
        else if (t === 'b') valor = v && v.textContent === '1' ? 'VERDADERO' : 'FALSO';
        else if (v) valor = Number(v.textContent);
        fila[col] = valor;
      });
      filas[n >= 0 ? n : filas.length] = Array.from(fila, x => x === undefined ? '' : x);
    });
    return { filas: Array.from(filas, f => f || []) };
  },

  // «AB12» → 27
  indiceColumna(ref) {
    const letras = ref.replace(/[0-9]/g, '');
    let n = 0; for (const ch of letras) n = n * 26 + (ch.charCodeAt(0) - 64);
    return n - 1;
  },

  // Directorio central del ZIP → { ruta: () => Promise<Uint8Array> }
  async abrirZip(b) {
    const u16 = i => b[i] | (b[i + 1] << 8), u32 = i => (b[i] | (b[i + 1] << 8) | (b[i + 2] << 16) | (b[i + 3] << 24)) >>> 0;
    let fin = -1;
    for (let i = b.length - 22; i >= Math.max(0, b.length - 65557); i--) if (u32(i) === 0x06054B50) { fin = i; break; }
    if (fin < 0) throw new Error('El archivo de Excel está dañado o incompleto.');
    const total = u16(fin + 10);
    let p = u32(fin + 16);
    const salida = {};
    for (let k = 0; k < total; k++) {
      if (u32(p) !== 0x02014B50) throw new Error('El archivo de Excel está dañado o incompleto.');
      const metodo = u16(p + 10), comprimido = u32(p + 20), largoNombre = u16(p + 28), extra = u16(p + 30), comentario = u16(p + 32), local = u32(p + 42);
      const nombre = new TextDecoder('utf-8').decode(b.subarray(p + 46, p + 46 + largoNombre));
      const inicio = local + 30 + u16(local + 26) + u16(local + 28);
      const datos = b.subarray(inicio, inicio + comprimido);
      salida[nombre] = async () => {
        if (metodo === 0) return datos;
        if (metodo !== 8) throw new Error('El archivo usa una compresión que no se puede leer aquí.');
        if (typeof DecompressionStream === 'undefined') throw new Error('Este navegador no puede leer archivos de Excel. Guárdelo como CSV y súbalo de nuevo.');
        const flujo = new Blob([datos]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
        return new Uint8Array(await new Response(flujo).arrayBuffer());
      };
      p += 46 + largoNombre + extra + comentario;
    }
    return salida;
  },

  // CSV con comillas, separado por coma o punto y coma (el que más aparezca en el encabezado)
  leerCsv(texto) {
    texto = texto.replace(/^﻿/, '');
    const primera = texto.split(/\r?\n/)[0] || '';
    const sep = (primera.match(/;/g) || []).length > (primera.match(/,/g) || []).length ? ';' : ',';
    const filas = []; let fila = [], campo = '', comillas = false;
    for (let i = 0; i < texto.length; i++) {
      const ch = texto[i];
      if (comillas) {
        if (ch === '"') { if (texto[i + 1] === '"') { campo += '"'; i++; } else comillas = false; } else campo += ch;
      } else if (ch === '"') comillas = true;
      else if (ch === sep) { fila.push(campo); campo = ''; }
      else if (ch === '\n' || ch === '\r') { if (ch === '\r' && texto[i + 1] === '\n') i++; fila.push(campo); filas.push(fila); fila = []; campo = ''; }
      else campo += ch;
    }
    if (campo !== '' || fila.length) { fila.push(campo); filas.push(fila); }
    return filas;
  }
};
