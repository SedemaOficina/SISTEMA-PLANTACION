/* REPORTE PDF: tabla de los registros filtrados, con logotipo y resumen por programa. */
window.SRP = window.SRP || {};

SRP.reportes = {
  COLOR: { guinda: [157, 33, 72], dorado: [178, 142, 92], gris: [85, 88, 90], fila: [247, 241, 243] },

  generar(registros, descripcion) {
    if (!window.jspdf) { SRP.util.anunciar('No se pudo cargar el generador de PDF.', 'alerta'); return; }
    const u = SRP.sesion.usuario;
    const variosAutores = SRP.permisos.de(u).alcance !== 'propios';
    const doc = new window.jspdf.jsPDF({ unit: 'mm', format: 'letter' });
    const ancho = doc.internal.pageSize.getWidth();
    const alto = doc.internal.pageSize.getHeight();
    const C = this.COLOR;
    const hoy = new Date();

    doc.addImage(SRP.LOGO_BASE64, 'PNG', 20, 12, 70, 14);
    doc.setDrawColor(...C.guinda); doc.setLineWidth(0.4); doc.line(20, 30, ancho - 20, 30);
    doc.setFont('helvetica', 'bold'); doc.setFontSize(14); doc.setTextColor(...C.guinda);
    doc.text('REPORTE DE ÁRBOLES REGISTRADOS', ancho / 2, 40, { align: 'center' });
    doc.setFont('helvetica', 'normal'); doc.setFontSize(9.5); doc.setTextColor(...C.gris);
    doc.text(hoy.toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' }), ancho / 2, 46, { align: 'center' });
    doc.setTextColor(35, 37, 38);
    doc.text('Generado por: ' + SRP.util.nombreCompleto(u) + ' (' + SRP.permisos.de(u).etiqueta + ')', 20, 55);
    doc.text('Periodo o filtro: ' + descripcion, 20, 60);
    if (SRP.CONFIG.ES_FICTICIO) {
      doc.setTextColor(163, 58, 0); doc.text('Documento de prueba con datos ficticios. Sin validez oficial.', 20, 65);
    }

    const cabecera = ['Fecha plantación', 'Especie', 'Alcaldía', 'Colonia'].concat(variosAutores ? ['Cabo'] : []);
    const cuerpo = registros.map(r => [
      SRP.util.formatearFecha(r.fecha_plantacion), SRP.ref.especieDe(r).comun,
      SRP.ref.territorio(r.alcaldia), SRP.ref.territorio(r.colonia)
    ].concat(variosAutores ? [SRP.ref.nombreUsuario(r.cabo_id)] : []));

    doc.autoTable({
      head: [cabecera], body: cuerpo, startY: 70, margin: { left: 20, right: 20, bottom: 22 },
      styles: { font: 'helvetica', fontSize: 8.5, cellPadding: 1.8, textColor: [35, 37, 38] },
      headStyles: { fillColor: C.guinda, textColor: 255, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: C.fila }
    });

    // Resumen por programa
    const porPrograma = {};
    registros.forEach(r => { const n = SRP.ref.nombreCatalogo(r.programa_id) || 'Sin programa'; porPrograma[n] = (porPrograma[n] || 0) + 1; });
    let y = doc.lastAutoTable.finalY + 8;
    if (y > alto - 40) { doc.addPage(); y = 25; }
    doc.setFont('helvetica', 'bold'); doc.setFontSize(10); doc.setTextColor(...C.guinda);
    doc.text('Total: ' + registros.length + (registros.length === 1 ? ' árbol registrado' : ' árboles registrados'), 20, y);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(9.5); doc.setTextColor(35, 37, 38);
    Object.keys(porPrograma).sort().forEach((n, i) => doc.text(n + ': ' + porPrograma[n], 20, y + 6 + i * 5));
    let yy = y + 6 + Object.keys(porPrograma).length * 5;

    /* CALIDAD DE LA UBICACIÓN.
       Cuando la fotografía es opcional, la coordenada es la prueba, y quien lea el reporte
       merece saber de qué clase de coordenada se trata. Una fila por punto abultaría la tabla;
       una cifra al pie dice lo mismo y se compara de un año a otro. */
    const conGps = registros.filter(r => r.punto_origen === 'gps').length;
    if (registros.length) {
      doc.text('Ubicados con GPS del dispositivo: ' + conGps + ' de ' + registros.length +
               ' (' + Math.round(conGps * 100 / registros.length) + '%)', 20, yy + 5);
      yy += 5;
    }

    /* La cifra del sistema no es la cifra del programa: se registra lo que alcanza a
       registrarse. Decirlo en el documento protege a quien lo firma. */
    doc.setFontSize(8); doc.setTextColor(...C.gris);
    doc.text('Cifra de árboles registrados en el sistema dentro del filtro indicado. No equivale', 20, yy + 7);
    doc.text('necesariamente al total plantado en el periodo.', 20, yy + 11);

    // Pie en todas las páginas
    const paginas = doc.getNumberOfPages();
    const sello = 'SEDEMA, Sistema de Registro de Plantaciones. Generado el ' + SRP.util.formatearFechaHora(hoy.toISOString());
    for (let p = 1; p <= paginas; p++) {
      doc.setPage(p);
      doc.setDrawColor(...C.dorado); doc.setLineWidth(0.4); doc.line(20, alto - 16, ancho - 20, alto - 16);
      doc.setFontSize(8); doc.setTextColor(...C.gris);
      doc.text(sello, 20, alto - 11);
      doc.text('Página ' + p + ' de ' + paginas, ancho / 2, alto - 6, { align: 'center' });
    }

    const nombre = 'Reporte_Plantaciones_' + SRP.util.fechaHoy() + '.pdf';
    this.entregar(doc, nombre);
  },

  // Compartir con las apps del teléfono si el navegador lo permite; si no, descargar
  async entregar(doc, nombre) {
    const blob = doc.output('blob');
    const archivo = new File([blob], nombre, { type: 'application/pdf' });
    if (navigator.canShare && navigator.canShare({ files: [archivo] })) {
      try {
        await navigator.share({ files: [archivo], title: 'Reporte de plantaciones' });
        return;
      } catch (err) {
        if (err.name === 'AbortError') return;   // la persona canceló
      }
    }
    doc.save(nombre);
    SRP.util.anunciar('Reporte descargado: ' + nombre);
  }
};
