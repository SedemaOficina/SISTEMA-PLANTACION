/* INFORMES POR PERIODO (D159): semanal, mensual, anual o de un rango, de toda la cuadrilla o de una
   alcaldía, en PDF con membrete y en CSV para Excel. Los pidió el área de plantación. Salen del
   mismo modelo que la pestaña Supervisión (SRP.indicadores, D157): lo que se imprime es lo que se
   ve. El reporte de cada jornada (reportes.js) sigue igual: ése es el documento de campo; éste, el
   de seguimiento. */
window.SRP = window.SRP || {};

SRP.informes = {
  // Qué informe es, dicho por su periodo y su alcaldía
  titulo(m) {
    const t = { semana: 'Informe semanal de plantación', mes: 'Informe mensual de plantación', anio: 'Informe anual de plantación' }[m.periodo.tipo] || 'Informe de plantación';
    // Con institución elegida, también se dice: «Informe anual de plantación · Alcaldía Iztapalapa»
    return t + (m.filtros.organizacion ? ' · ' + SRP.ref.nombreOrganizacion(m.filtros.organizacion) : '') + (m.filtros.alcaldia ? ' · Alcaldía ' + m.filtros.alcaldia : '');
  },

  // «Informe_semanal_2026-09-21_al_2026-09-27_Coyoacan.pdf»: sin acentos ni espacios
  nombreArchivo(m, prefijo, ext) {
    const p = m.periodo;
    const limpio = t => String(t).normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^A-Za-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
    const cuando = p.tipo === 'mes' ? p.desde.slice(0, 7) : p.tipo === 'anio' ? p.desde.slice(0, 4) : p.tipo === 'todo' ? 'todo' : p.desde + '_al_' + p.hasta;
    const tipo = { semana: '_semanal', mes: '_mensual', anio: '_anual' }[p.tipo] || '';
    const f = m.filtros;
    const org = f.organizacion ? SRP.ref.catalogoPorId[f.organizacion] : null;
    return [prefijo + tipo, cuando, org ? limpio(org.clave || org.nombre) : '', f.alcaldia ? limpio(f.alcaldia) : '', f.programa ? limpio(SRP.ref.nombreCatalogo(f.programa)) : '',
      f.cabo ? limpio(SRP.ref.nombreUsuario(f.cabo)) : ''].filter(Boolean).join('_') + '.' + ext;
  },

  // De quién es lo que se informa
  alcance() {
    const u = SRP.sesion.usuario, a = SRP.permisos.de(u).alcance;
    if (a === 'propios') return 'Cabo: ' + SRP.util.nombreCompleto(u);
    if (a === 'equipo') return 'Cuadrilla de ' + SRP.util.nombreCompleto(u) + ' (coordinación)';
    if (a === 'institucion') return ((SRP.ref.organizacionDe(u) || {}).nombre || 'Su institución') + ' (dirección)';
    return 'Toda la Ciudad (' + (u.perfil === 'DIRECTIVO' ? 'dirección' : 'administración') + ')';
  },

  /* ---------- PDF ---------- */

  async pdf(m) {
    if (!m) return;
    if (!window.jspdf) { SRP.util.anunciar('No se pudo cargar el generador de PDF.', 'alerta'); return; }
    const R = SRP.reportes, C = R.colores();
    const logo = await R.cargarLogo();
    const doc = new window.jspdf.jsPDF({ unit: 'mm', format: 'letter', compress: true });
    const F = await R.ponerFuentes(doc);
    const ancho = doc.internal.pageSize.getWidth(), alto = doc.internal.pageSize.getHeight(), M = 20, util = ancho - 2 * M;
    const num = n => n == null ? '—' : Number(n).toLocaleString('es-MX');
    const cabo = SRP.permisos.de(SRP.sesion.usuario).alcance === 'propios';
    let y;
    const salto = (necesario) => { if (y + necesario > alto - 19) { doc.addPage(); y = 25; } };
    const titulo = (t) => {
      // Un título no se queda solo al pie de la página: va con el encabezado y el primer renglón de su tabla
      salto(28);
      doc.setFont(F, 'bold'); doc.setFontSize(9); doc.setTextColor(...C.guinda);
      doc.text(t.toUpperCase(), M, y);
      doc.setDrawColor(...C.dorado); doc.setLineWidth(0.2); doc.line(M, y + 1.5, ancho - M, y + 1.5);
      y += 3;
    };
    /* Tabla con los estilos del reporte de la jornada. `op.derecha`: columnas de cifras, alineadas a
       la derecha también en el encabezado y el total; `op.pie`: el renglón de total; `op.columnas`:
       estilos por columna (anchos, cursiva). */
    const tabla = (cab, filas, op) => {
      op = op || {};
      const der = op.derecha || [];
      const celda = (v, k) => der.includes(k) ? { content: v, styles: { halign: 'right' } } : v;
      doc.autoTable({
        head: [cab.map(celda)], body: filas.map(f => f.map(celda)), foot: op.pie ? [op.pie.map(celda)] : undefined,
        startY: y, margin: { left: M, right: M, bottom: 22 }, showFoot: 'lastPage',
        styles: { font: F, fontSize: 8.5, cellPadding: 1.6, textColor: C.tinta },
        headStyles: { fillColor: C.guinda, textColor: 255, fontStyle: 'bold' },
        alternateRowStyles: { fillColor: C.fila },
        footStyles: { fillColor: C.total, textColor: C.tinta, fontStyle: 'bold' },
        columnStyles: op.columnas || {}
      });
      y = doc.lastAutoTable.finalY + 7;
    };
    const nota = (t) => {
      doc.setFont(F, 'italic'); doc.setFontSize(8); doc.setTextColor(...C.gris);
      const l = doc.splitTextToSize(t, util); salto(l.length * 3.6 + 2); doc.text(l, M, y); y += l.length * 3.6 + 2;
      doc.setFont(F, 'normal');
    };

    // Membrete, como el reporte de la jornada (D90, D137)
    if (logo) { const h = 9.3; doc.addImage(R.logoJPEG(logo), 'JPEG', M, 14, h * logo.naturalWidth / logo.naturalHeight, h); }
    doc.setDrawColor(...C.guinda); doc.setLineWidth(0.4); doc.line(M, 30, ancho - M, 30);
    doc.setFont(F, 'bold'); doc.setFontSize(14); doc.setTextColor(...C.guinda);
    doc.text(doc.splitTextToSize(this.titulo(m).toUpperCase(), util), ancho / 2, 40, { align: 'center' });
    doc.setFont(F, 'normal'); doc.setFontSize(10); doc.setTextColor(...C.gris);
    const lineas = [m.periodo.etiqueta, this.alcance(),
      [m.filtros.programa ? 'Programa: ' + SRP.ref.nombreCatalogo(m.filtros.programa) : '', m.filtros.cabo ? 'Registró: ' + SRP.ref.nombreUsuario(m.filtros.cabo) : ''].filter(Boolean).join(' · ')].filter(Boolean);
    lineas.forEach((t, i) => doc.text(t, ancho / 2, 47 + i * 5, { align: 'center' }));
    y = 47 + lineas.length * 5 + 5;

    const c = m.cifras, q = m.calidad;
    titulo('Resumen');
    tabla(['Indicador', 'Valor'], [
      ['Árboles plantados (jornadas cerradas)', num(c.arboles)],
      ['Jornadas cerradas', num(c.jornadas)],
      ['Jornadas en curso (no se cuentan hasta cerrarse)', num(c.enCurso)],
      ['Avance contra lo previsto en las jornadas', c.avance == null ? 'Sin cantidad prevista' : c.avance + ' % (' + num(c.arbolesConMeta) + ' de ' + num(c.meta) + ')'],
      cabo ? null : ['Cabos que trabajaron', num(c.cabosActivos) + ' de ' + num(c.cabosAsignados)],
      ['Árboles por jornada', c.promedio == null ? '—' : String(c.promedio)],
      q.sustitutos ? ['Sustitutos plantados (incluidos arriba)', num(q.sustitutos) + ': ' + q.sustitutosMotivo.map(([t, n]) => t + ' ' + num(n)).join(', ')] : null,
      ['Especies distintas', num(c.especies) + (c.nativasPct == null ? '' : ' (' + c.nativasPct + ' % de los árboles son nativos)')],
      ['Alcaldías y colonias', num(c.alcaldias) + (c.alcaldias === 1 ? ' alcaldía · ' : ' alcaldías · ') + num(c.colonias) + (c.colonias === 1 ? ' colonia' : ' colonias')],
      ['Con fotografía', num(q.conFoto) + (q.conFotoPct == null ? '' : ' (' + q.conFotoPct + ' %)')],
      ['Ubicados con GPS', num(q.gps) + (q.gpsPct == null ? '' : ' (' + q.gpsPct + ' %)') + (q.precisionMediana == null ? '' : ', precisión típica ±' + Math.round(q.precisionMediana) + ' m')]
    ].filter(Boolean), { columnas: { 0: { cellWidth: 95 } } });

    if (m.atender.length) {
      titulo('Qué atender');
      tabla(['Pendiente', 'Jornadas'], m.atender.map(a => [a.texto, String(a.n)]), { derecha: [1] });
    }
    const unidad = { dia: 'Día', semana: 'Semana (desde el lunes)', mes: 'Mes', anio: 'Año' }[m.serie.unidad];
    titulo('Árboles plantados ' + { dia: 'por día', semana: 'por semana', mes: 'por mes', anio: 'por año' }[m.serie.unidad]);
    tabla([unidad, 'Jornadas cerradas', 'Árboles'], m.serie.casillas.map(x => [x.etiqueta, num(x.jornadas), num(x.arboles)]), { derecha: [1, 2], pie: ['Total', num(c.jornadas), num(c.arboles)] });
    // Lo de las alcaldías, PAOT, SOBSE y empresas suma al total; aquí se dice quién lo plantó
    if (!cabo && !m.filtros.organizacion && m.porOrganizacion.length > 1) {
      titulo('Por institución');
      tabla(['Institución', 'Tipo', 'Árboles', '% del total', 'Jornadas'], SRP.supervision.conPct(m.porOrganizacion, c.arboles).map(x => [x.organizacion, x.tipo, num(x.arboles), x.pct + ' %', num(x.jornadas)]),
        { derecha: [2, 3, 4], pie: ['Total', '', num(c.arboles), '100 %', ''] });
    }
    if (!cabo && !m.filtros.cabo) {
      titulo('Por cabo');
      tabla(['Cabo', 'Jornadas', 'Árboles', 'De lo previsto', 'Última', 'Pendientes'], m.porCabo.map(x => [x.nombre, num(x.jornadas), num(x.arboles),
        x.avance == null ? '—' : x.avance + ' %', x.ultima ? SRP.util.formatearFecha(x.ultima) : '—',
        [x.abiertasViejas ? x.abiertasViejas + ' abiertas de antes' : '', x.sinRevisar ? x.sinRevisar + ' sin revisar' : '', x.sinReporte ? x.sinReporte + ' sin reporte' : '',
          x.eliminados ? x.eliminados + ' eliminados' : '', x.editados ? x.editados + ' editados' : ''].filter(Boolean).join(', ') || '—']), { derecha: [1, 2, 3] });
    }
    if (m.filtros.alcaldia) {
      titulo('Por colonia');
      tabla(['Colonia', 'Árboles', '% del total', 'Jornadas'], SRP.supervision.conPct(m.porColonia, c.arboles).map(x => [x.colonia, num(x.arboles), x.pct + ' %', num(x.jornadas)]), { derecha: [1, 2, 3] });
    } else {
      titulo('Por alcaldía');
      tabla(['Alcaldía', 'Árboles', '% del total', 'Jornadas', 'Colonias'], SRP.supervision.conPct(m.porAlcaldia, c.arboles).map(x => [x.clave, num(x.arboles), x.pct + ' %', num(x.jornadas), num(x.colonias)]), { derecha: [1, 2, 3, 4] });
    }
    if (m.prioridad && m.prioridad.total) {
      const p = m.prioridad, P = SRP.indicadores.pct;
      titulo('Por prioridad de la colonia');
      tabla(['Prioridad de reforestación', 'Árboles', '% del total'], p.niveles.map(x => [x.texto, num(x.n), (P(x.n, p.total) || 0) + ' %'])
        .concat(p.sin ? [['Sin dato en la capa', num(p.sin), (P(p.sin, p.total) || 0) + ' %']] : []), { derecha: [1, 2], pie: ['Alta y muy alta', num(p.altas), (P(p.altas, p.total) || 0) + ' %'] });
    }
    titulo('Por especie');
    tabla(['Especie', 'Nombre científico', 'Distribución', 'Árboles', '% del total'], SRP.supervision.conPct(m.porEspecie, c.arboles).map(x => [x.comun, x.cientifico, x.distribucion || '—', num(x.arboles), x.pct + ' %']),
      { derecha: [3, 4], pie: ['Total', '', '', num(c.arboles), '100 %'], columnas: { 1: { fontStyle: 'italic' } } });
    titulo('Por programa');
    tabla(['Programa', 'Árboles', '% del total', 'Jornadas'], SRP.supervision.conPct(m.porPrograma, c.arboles).map(x => [x.clave, num(x.arboles), x.pct + ' %', num(x.jornadas)]), { derecha: [1, 2, 3] });
    if (m.solicitudes.jornadas) {
      const pe = m.solicitudes, P = SRP.indicadores.pct;
      titulo('Solicitudes');
      tabla(['Quién lo solicitó', 'Jornadas', 'Árboles', '% del total'], pe.solicitantes.map(x => [x.solicitante, num(x.jornadas), num(x.arboles), (P(x.arboles, c.arboles) || 0) + ' %']),
        { derecha: [1, 2, 3], pie: ['Total a solicitud de otra instancia', num(pe.jornadas), num(pe.arboles), (P(pe.arboles, c.arboles) || 0) + ' %'] });
    }
    titulo('Jornadas cerradas del periodo');
    const conPri = SRP.prioritarias.hay();
    tabla(['Fecha', 'Jornada', cabo ? 'Lugar' : 'Cabo'].concat(conPri ? ['Prioridad'] : [], ['Árboles', 'Reporte']), m.jornadas.map(j => [SRP.util.formatearFecha(j.fecha), j.nombre + (j.solicitante ? ' (solicita ' + j.solicitante + ')' : ''), cabo ? j.lugar : j.cabo]
      .concat(conPri ? [j.prioridad] : [], [num(j.arboles) + (j.meta ? ' de ' + num(j.meta) : ''), j.reporte ? 'Generado' : 'Pendiente'])), { derecha: [conPri ? 4 : 3] });
    titulo('Trazabilidad');
    tabla(['Movimiento en el periodo', 'Árboles'], [['Eliminados', num(m.trazabilidad.eliminados)], ['Ediciones', num(m.trazabilidad.editados)]], { derecha: [1] });

    nota('Cuentan sólo las jornadas cerradas: una jornada abierta todavía puede cambiar. La semana va de lunes a domingo. Los árboles eliminados y editados se cuentan aparte, como constancia, y no cambian la cifra de árboles.');
    nota('Cifra de ejemplares registrados en el sistema. No equivale necesariamente al total plantado. En esta etapa, el informe reúne lo capturado en este dispositivo.');
    if (SRP.CONFIG.ES_FICTICIO) { doc.setTextColor(...C.ficticio); doc.setFontSize(8); salto(6); doc.text('Documento de prueba con datos ficticios. Sin validez oficial.', M, y); y += 5; }
    doc.setFontSize(8); doc.setTextColor(...C.gris); salto(5);
    doc.text('Generado por ' + SRP.util.nombreCompleto(SRP.sesion.usuario) + ' (' + SRP.permisos.de(SRP.sesion.usuario).etiqueta + ').', M, y);

    const paginas = doc.getNumberOfPages();
    const sello = 'SEDEMA, Sistema de Registro de Plantaciones. Generado el ' + SRP.util.formatearFechaHora(new Date().toISOString());
    for (let p = 1; p <= paginas; p++) {
      doc.setPage(p);
      doc.setDrawColor(...C.dorado); doc.setLineWidth(0.4); doc.line(M, alto - 16, ancho - M, alto - 16);
      doc.setFontSize(8); doc.setTextColor(...C.gris);
      doc.text(sello, M, alto - 11);
      doc.text('Página ' + p + ' de ' + paginas, ancho / 2, alto - 6, { align: 'center' });
    }
    const nombre = this.nombreArchivo(m, 'Informe', 'pdf');
    this.ultimo = { nombre, paginas };
    const r = await R.entregarArchivo(doc.output('blob'), nombre, this.titulo(m));
    if (r !== 'cancelado') SRP.util.anunciar(r === 'descarga' ? 'Informe generado y descargado: ' + nombre + '.' : 'Informe generado y compartido.', 'exito');
  },

  /* ---------- CSV ---------- */

  /* Un renglón por árbol de las jornadas cerradas del periodo, con los filtros puestos: lo que
     cuenta el informe, para abrirlo en Excel. Separado por comas, con BOM para que Excel lea los
     acentos, y cada campo entre comillas. Un texto que empieza como fórmula («=», «+», «-», «@»,
     tabulador o retorno) lleva un apóstrofo delante: Excel lo muestra como texto y no lo calcula.
     Las cifras —la longitud es negativa— quedan como están. */
  COLUMNAS: [['folio', 'Folio'], ['fecha', 'Fecha de plantación'], ['jornada', 'Jornada'], ['organizacion', 'Institución que ejecuta'], ['cabo', 'Cabo'], ['programa', 'Programa'], ['especie', 'Especie'],
    ['cientifico', 'Nombre científico'], ['distribucion', 'Distribución'], ['alcaldia', 'Alcaldía'], ['colonia', 'Colonia'], ['uga', 'Celda UGA'],
    ['lat', 'Latitud'], ['lng', 'Longitud'], ['origen', 'Origen del punto'], ['precision', 'Precisión GPS (m)'], ['foto', 'Con fotografía'], ['reporte', 'Reporte de la jornada'], ['sustituto', 'Sustituto'], ['motivo', 'Motivo de la sustitución'],
    ['prioridad', 'Prioridad de reforestación de la colonia'], ['solicitante', 'Quién lo solicita'], ['solicitudDescripcion', 'Descripción de la solicitud']],

  texto(m) {
    const campo = v => {
      let t = String(v == null ? '' : v);
      if (/^[=+\-@\t\r]/.test(t) && !/^-?\d+(\.\d+)?$/.test(t)) t = "'" + t;
      return '"' + t.replace(/"/g, '""') + '"';
    };
    return '﻿' + [this.COLUMNAS.map(c => campo(c[1])).join(',')].concat(m.detalle.map(d => this.COLUMNAS.map(c => campo(d[c[0]])).join(','))).join('\r\n') + '\r\n';
  },

  async csv(m) {
    if (!m) return;
    const nombre = this.nombreArchivo(m, 'Arboles', 'csv');
    const r = await SRP.reportes.entregarArchivo(new Blob([this.texto(m)], { type: 'text/csv;charset=utf-8' }), nombre, 'Árboles del periodo');
    if (r !== 'cancelado') SRP.util.anunciar((m.detalle.length === 1 ? '1 árbol' : m.detalle.length + ' árboles') + ' en ' + nombre + '.', 'exito');
  }
};

// Si algo falla al armar un informe, se dice qué no se pudo hacer (D149)
SRP.util.proteger(SRP.informes, { pdf: 'generar el informe', csv: 'descargar la tabla' });
