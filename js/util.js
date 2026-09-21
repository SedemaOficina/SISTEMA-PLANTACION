/* Utilidades compartidas. Sin dependencias. */
window.SRP = window.SRP || {};

SRP.util = {
  generarId() {
    if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
    // Respaldo para navegadores o contextos sin randomUUID
    return 'id-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10);
  },

  ahoraISO() { return new Date().toISOString(); },

  // Fecha local AAAA-MM-DD. No usar toISOString: en la tarde de CDMX ya daría el día siguiente.
  fechaHoy() {
    const d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  },

  // AAAA-MM-DD -> DD-MM-AAAA
  formatearFecha(iso) {
    if (!iso) return '';
    const [a, m, d] = iso.slice(0, 10).split('-');
    return d + '-' + m + '-' + a;
  },

  formatearFechaHora(iso) {
    if (!iso) return '';
    const d = new Date(iso);
    return d.toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' });
  },

  nombreMes(aaaamm) {
    const [a, m] = aaaamm.split('-').map(Number);
    const t = new Date(a, m - 1, 1).toLocaleDateString('es-MX', { month: 'long', year: 'numeric' });
    return t.charAt(0).toUpperCase() + t.slice(1);
  },

  escapar(texto) {
    return String(texto == null ? '' : texto)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  },

  // Quita acentos y pasa a minúsculas para búsquedas tolerantes
  normalizar(texto) {
    return String(texto || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
  },

  nombreCompleto(u) {
    if (!u) return '';
    return [u.nombre, u.apellido_paterno, u.apellido_materno].filter(Boolean).join(' ');
  },

  // Aviso para lector de pantalla y mensaje visible breve
  anunciar(mensaje, tipo) {
    const zona = document.getElementById('aviso');
    zona.textContent = mensaje;
    zona.dataset.tipo = tipo || 'exito';
    zona.hidden = false;
    clearTimeout(SRP.util._temporizadorAviso);
    SRP.util._temporizadorAviso = setTimeout(() => { zona.hidden = true; }, 4500);
  }
};
