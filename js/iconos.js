/* ICONOS. Un icono por significado, siempre acompañado de su palabra: entre el verde, el rojo
   y el dorado hay 1.0-1.3:1 de contraste, así que quien no distingue el color necesita la forma
   y el texto para saber qué hace el botón (Norma 8.4). */
window.SRP = window.SRP || {};

SRP.ICONOS = {
  // Guardar y confirmar
  palomita: '<path fill="currentColor" d="M9 16.2L4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4z"/>',
  // Eliminar
  basura: '<path fill="currentColor" d="M6 19a2 2 0 002 2h8a2 2 0 002-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>',
  // Disco de guardar: el signo que todo el mundo lee como «guardar», aunque ya nadie use disquetes
  cerrar: '<path fill="currentColor" d="M19 6.4L17.6 5 12 10.6 6.4 5 5 6.4l5.6 5.6L5 17.6 6.4 19l5.6-5.6 5.6 5.6 1.4-1.4-5.6-5.6z"/>',
  // Señal: ondas de red; sin señal: las mismas ondas tachadas
  senal: '<path fill="currentColor" d="M12 18a2 2 0 100 4 2 2 0 000-4zm-4.9-3.1l1.4 1.4a5 5 0 017 0l1.4-1.4a7 7 0 00-9.8 0zm-3.5-3.5l1.4 1.4a10 10 0 0114 0l1.4-1.4a12 12 0 00-16.8 0zM.1 7.9l1.4 1.4a15 15 0 0121 0l1.4-1.4a17 17 0 00-23.8 0z"/>',
  sinSenal: '<path fill="currentColor" d="M2.3 2.3L.9 3.7l3.6 3.6A17 17 0 00.1 7.9l1.4 1.4a15 15 0 014.5-3.2l2.2 2.2a10 10 0 00-4.6 2.8l1.4 1.4a7.9 7.9 0 015.3-2.4l2.5 2.5a5 5 0 00-5.7 1.7l1.4 1.4a3 3 0 014.2 0l6.1 6.1 1.4-1.4L2.3 2.3zM12 18a2 2 0 100 4 2 2 0 000-4zm11.9-10.1a17 17 0 00-14.6-4.7l1.8 1.8a15 15 0 0111.4 4.3l1.4-1.4zm-3.5 3.5a12 12 0 00-6.9-3.3l2.6 2.6a10 10 0 012.9 2.1l1.4-1.4z"/>',
  disco: '<path fill="currentColor" d="M17 3H5a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2V7l-4-4zm-5 16a3 3 0 110-6 3 3 0 010 6zm3-10H5V5h10v4z"/>',
  // Corregir y editar
  lapiz: '<path fill="currentColor" d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1 1 0 000-1.41l-2.34-2.34a1 1 0 00-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>',
  // Ubicación
  ubicacion: '<path fill="currentColor" d="M12 8a4 4 0 100 8 4 4 0 000-8zm8.94 3a9 9 0 00-7.94-7.94V1h-2v2.06A9 9 0 003.06 11H1v2h2.06A9 9 0 0011 20.94V23h2v-2.06A9 9 0 0020.94 13H23v-2h-2.06zM12 19a7 7 0 110-14 7 7 0 010 14z"/>',
  // Ver el detalle
  ojo: '<path fill="currentColor" d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zm0 12.5a5 5 0 110-10 5 5 0 010 10zm0-8a3 3 0 100 6 3 3 0 000-6z"/>',

  // Devuelve el SVG listo para insertar. aria-hidden: la palabra del botón ya lo nombra.
  svg(nombre, tam) {
    const t = tam || 18;
    return '<svg viewBox="0 0 24 24" width="' + t + '" height="' + t + '" aria-hidden="true" focusable="false">' +
      (this[nombre] || '') + '</svg>';
  }
};
