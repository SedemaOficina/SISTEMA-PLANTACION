/* ICONOS. Un icono por significado, siempre acompañado de su palabra: entre el verde, el rojo
   y el dorado hay 1.0-1.3:1 de contraste, así que quien no distingue el color necesita la forma
   y el texto para saber qué hace el botón (Norma 8.4). */
window.SRP = window.SRP || {};

SRP.ICONOS = {
  // Guardar y confirmar
  palomita: '<path fill="currentColor" d="M9 16.2L4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4z"/>',
  // Eliminar
  basura: '<path fill="currentColor" d="M6 19a2 2 0 002 2h8a2 2 0 002-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>',
  // Corregir y editar
  lapiz: '<path fill="currentColor" d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1 1 0 000-1.41l-2.34-2.34a1 1 0 00-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>',
  // Ver el detalle
  ojo: '<path fill="currentColor" d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zm0 12.5a5 5 0 110-10 5 5 0 010 10zm0-8a3 3 0 100 6 3 3 0 000-6z"/>',

  // Devuelve el SVG listo para insertar. aria-hidden: la palabra del botón ya lo nombra.
  svg(nombre, tam) {
    const t = tam || 18;
    return '<svg viewBox="0 0 24 24" width="' + t + '" height="' + t + '" aria-hidden="true" focusable="false">' +
      (this[nombre] || '') + '</svg>';
  }
};
