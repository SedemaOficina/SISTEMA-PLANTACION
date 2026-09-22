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

  MESES_CORTOS: ['ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN', 'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC'],

  /* AAAA-MM-DD -> DD-MMM-AAAA, con el mes en letras: 21-SEP-2026.
     Dos números seguidos se confunden entre sí y con el formato de otros países; el mes escrito
     no deja lugar a duda. Es sólo para mostrar: lo que se guarda y se compara sigue siendo
     AAAA-MM-DD, que ordena bien por sí solo. */
  formatearFecha(iso) {
    if (!iso) return '';
    const [a, m, d] = iso.slice(0, 10).split('-');
    const mes = this.MESES_CORTOS[Number(m) - 1];
    return mes ? d + '-' + mes + '-' + a : d + '-' + m + '-' + a;
  },

  formatearFechaHora(iso) {
    if (!iso) return '';
    const d = new Date(iso);
    return d.toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' });
  },

  // 'AAAA-MM' -> 'Septiembre de 2026'; con soloMes, -> 'Septiembre'
  nombreMes(aaaamm, soloMes) {
    const [a, m] = aaaamm.split('-').map(Number);
    const t = new Date(a, m - 1, 1).toLocaleDateString('es-MX', soloMes ? { month: 'long' } : { month: 'long', year: 'numeric' });
    return t.charAt(0).toUpperCase() + t.slice(1);
  },

  // Clave sugerida a partir de un nombre: sin acentos, mayúsculas, guion bajo.
  // 'Reforestación Urbana' -> 'REFORESTACION_URBANA'. Editable antes de guardar.
  claveDesdeNombre(nombre) {
    return this.normalizar(nombre).toUpperCase()
      .replace(/[^A-Z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 30).replace(/_+$/, '');
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
  },

  /* Sólo para el lector de pantalla, sin letrero. Para cambios que en pantalla ya se ven solos
     —la fotografía aparece o desaparece— y donde el letrero encima estorbaba (bloque 21). */
  anunciarSilencioso(mensaje) {
    const zona = document.getElementById('aviso-lector');
    zona.textContent = '';
    setTimeout(() => { zona.textContent = mensaje; }, 50);   // el mismo texto dos veces seguidas no se anuncia
  }
};
