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

  /* AVISO FLOTANTE (D101, tres tonos desde D136). Uno solo para toda la plataforma: icono, texto,
     × para cerrarlo y, cuando la acción se puede revertir, «Deshacer». Va arriba de la pantalla
     para no tapar las barras fijas del pie (Revisar y guardar, Guardar, Editar).
     Tonos: 'exito' (por omisión) confirma que algo se guardó o completó; 'aviso' informa un estado
     que no es error ni confirmación («Jornada activa: X», «reabierta para...»); 'alerta' señala un
     bloqueo o que algo salió mal. El color nunca va solo: también cambian el icono y el texto.
     La duración crece con el largo del mensaje (D136): mínimo 4s + 1s por cada ~40 caracteres, y
     el temporizador se pausa mientras el puntero está encima para no cerrarlo a medio leer.
     `op`: { deshacer: función, textoAccion: 'Deshacer' } */
  anunciar(mensaje, tipo, op) {
    op = op || {};
    const zona = document.getElementById('aviso');
    const tonos = { alerta: { icono: 'info', color: 'alerta' }, aviso: { icono: 'info', color: 'aviso' } };
    const t = tonos[tipo] || { icono: 'palomita', color: 'exito' };
    zona.innerHTML = '<span class="aviso-icono" aria-hidden="true">' + SRP.ICONOS.svg(t.icono, 20) + '</span>' +
      '<span class="aviso-texto"></span>' +
      (op.deshacer ? '<button type="button" class="aviso-accion"></button>' : '') +
      '<button type="button" class="aviso-cerrar" aria-label="Cerrar aviso">' + SRP.ICONOS.svg('cerrar', 18) + '</button>';
    zona.querySelector('.aviso-texto').textContent = mensaje;
    zona.dataset.tipo = t.color;
    zona.hidden = false;
    const cerrar = () => { zona.hidden = true; clearTimeout(SRP.util._temporizadorAviso); zona.onmouseenter = zona.onmouseleave = null; };
    zona.querySelector('.aviso-cerrar').onclick = cerrar;
    if (op.deshacer) {
      const b = zona.querySelector('.aviso-accion');
      b.textContent = op.textoAccion || 'Deshacer';
      b.onclick = () => { cerrar(); op.deshacer(); };
    }
    // Duración: base según el tono (con «Deshacer» o alerta, más tiempo para decidir) más 1s por
    // cada ~40 caracteres del mensaje, para que un texto largo no se cierre antes de terminar de leerlo.
    const base = op.deshacer ? 8000 : (t.color === 'alerta' ? 7000 : 4500);
    const duracion = base + Math.floor(mensaje.length / 40) * 1000;
    let restante = duracion, marca = Date.now();
    clearTimeout(SRP.util._temporizadorAviso);
    const programar = (ms) => { SRP.util._temporizadorAviso = setTimeout(() => { zona.hidden = true; }, ms); };
    programar(duracion);
    zona.onmouseenter = () => { clearTimeout(SRP.util._temporizadorAviso); restante -= (Date.now() - marca); };
    zona.onmouseleave = () => { marca = Date.now(); programar(Math.max(restante, 1500)); };
  },

  /* Sólo para el lector de pantalla, sin letrero. Para cambios que en pantalla ya se ven solos
     —la fotografía aparece o desaparece— y donde el letrero encima estorbaba (bloque 21). */
  anunciarSilencioso(mensaje) {
    const zona = document.getElementById('aviso-lector');
    zona.textContent = '';
    setTimeout(() => { zona.textContent = mensaje; }, 50);   // el mismo texto dos veces seguidas no se anuncia
  },

  /* TABLAS QUE SE ORDENAN (D100). Cada encabezado, salvo «Acciones», se vuelve un botón: un toque
     ordena de A a Z, otro de Z a A. aria-sort dice al lector de pantalla cómo está ordenada. El
     orden elegido se recuerda por tabla y se vuelve a aplicar cuando la tabla se repinta. */
  _orden: {},

  ordenable(tabla) {
    const ths = [...tabla.querySelectorAll('thead th')];
    const est = this._orden[tabla.id];
    ths.forEach((th, i) => {
      const txt = th.textContent.trim();
      if (txt === 'Acciones') return;
      th.innerHTML = '<button type="button" class="th-orden" data-col="' + i + '">' + this.escapar(txt) +
        '<span class="th-flecha" aria-hidden="true"></span></button>';
      th.setAttribute('aria-sort', est && est.col === i ? (est.dir > 0 ? 'ascending' : 'descending') : 'none');
    });
    if (est) this.ordenarFilas(tabla, est.col, est.dir);
    tabla.querySelector('thead').onclick = (e) => {
      const b = e.target.closest('.th-orden'); if (!b) return;
      const col = Number(b.dataset.col);
      const prev = this._orden[tabla.id];
      const dir = prev && prev.col === col ? -prev.dir : 1;
      this._orden[tabla.id] = { col, dir };
      ths.forEach(t => { if (t.hasAttribute('aria-sort')) t.setAttribute('aria-sort', 'none'); });
      ths[col].setAttribute('aria-sort', dir > 0 ? 'ascending' : 'descending');
      this.ordenarFilas(tabla, col, dir);
      this.anunciarSilencioso('Ordenado por ' + b.textContent + (dir > 0 ? ', de la A a la Z.' : ', de la Z a la A.'));
    };
  },

  ordenarFilas(tabla, col, dir) {
    const cuerpo = tabla.tBodies[0]; if (!cuerpo) return;
    const filas = [...cuerpo.rows].filter(f => f.cells.length > col);
    const valor = f => (f.cells[col].dataset.orden || f.cells[col].textContent).trim();
    filas.sort((a, b) => dir * valor(a).localeCompare(valor(b), 'es', { numeric: true, sensitivity: 'base' }));
    filas.forEach(f => cuerpo.appendChild(f));
  }
};
