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
  MESES_LARGOS: ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'],
  DIAS_SEMANA: ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'],

  /* La fecha completa para un documento (D163): «Jueves 25 de septiembre de 2026». AAAA-MM-DD es
     una fecha del calendario, sin hora: se lee al mediodía para que ningún huso la corra de día. */
  fechaLarga(t) {
    const [a, m, d] = String(t || '').split('-').map(Number);
    if (!a || !m || !d) return '';
    const f = new Date(a, m - 1, d, 12);
    const texto = this.DIAS_SEMANA[f.getDay()] + ' ' + d + ' de ' + this.MESES_LARGOS[m - 1] + ' de ' + a;
    return texto.charAt(0).toUpperCase() + texto.slice(1);
  },

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

  /* Los días de una jornada: de su fecha de inicio al último árbol plantado. Cada árbol lleva la
     fecha en que se plantó, así que una jornada puede durar varios días. */
  diasJornada(j, registros) {
    const fechas = (registros || []).map(r => r.fecha_plantacion).filter(Boolean).concat(j && j.fecha ? [j.fecha] : []).sort();
    return { desde: fechas[0] || '', hasta: fechas[fechas.length - 1] || '' };
  },

  // «24-SEP-2026» o, si fueron varios días, «22-SEP-2026 al 24-SEP-2026»
  textoDias(d) { return d.desde === d.hasta ? this.formatearFecha(d.desde) : this.formatearFecha(d.desde) + ' al ' + this.formatearFecha(d.hasta); },

  // La fecha de un árbol dentro de su jornada: nunca antes de que la jornada empiece
  fechaEnJornada(fecha, j) { return !j || !j.fecha ? fecha : (fecha && fecha >= j.fecha ? fecha : j.fecha); },

  /* El atajo «Hoy» lleva la fecha con el año en dos cifras: 24-SEP-26 (D147). En el teléfono el
     chip mide un tercio de la pantalla y «24-SEP-2026» se partía en dos renglones. Un solo lugar
     para las tres vistas que lo usan (Registros, Jornadas y Fotografías). */
  pintarChipHoy(el) {
    const [a, m, d] = this.fechaHoy().split('-');
    const corta = d + '-' + (this.MESES_CORTOS[Number(m) - 1] || m) + '-' + a.slice(2);
    el.innerHTML = 'Hoy<span class="oculto-visual">, </span><span class="chip-sub">' + this.escapar(corta) + '</span>';
  },

  formatearFechaHora(iso) {
    if (!iso) return '';
    const d = new Date(iso);
    if (isNaN(d)) return '';
    const dos = n => String(n).padStart(2, '0');
    // La fecha como en todo el sistema (02-OCT-2026) y la hora local de 24 horas
    return this.formatearFecha(d.getFullYear() + '-' + dos(d.getMonth() + 1) + '-' + dos(d.getDate())) + ', ' + dos(d.getHours()) + ':' + dos(d.getMinutes()) + ' h';
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

  /* Una foto sólo se pinta si es una imagen en base64 (D150): un dato alterado no puede meter
     código por el atributo src. Lo que no pase, se trata como registro sin foto. */
  fotoSegura(dato) {
    return typeof dato === 'string' && /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/]+=*$/.test(dato) ? dato : '';
  },

  /* COLORES DESDE LA HOJA (M13). El mapa, el croquis y el PDF no escriben colores: los toman de
     :root. `color()` lee el valor vigente, con el modo sol si está puesto: para lo que se ve en
     pantalla. `colorBase()` lee la regla :root de la hoja, sin el modo sol: el croquis y el PDF
     salen iguales con el modo sol encendido o apagado. `rgb()` lo da como [r, g, b] para jsPDF. */
  color(nombre) { return getComputedStyle(document.documentElement).getPropertyValue('--' + nombre).trim(); },
  colorBase(nombre) {
    if (!this._paleta) {
      const p = {};
      for (const hoja of document.styleSheets) {
        let reglas; try { reglas = hoja.cssRules; } catch (e) { continue; }   // hoja de otro origen
        for (const r of reglas) {
          if (r.selectorText !== ':root') continue;
          for (let i = 0; i < r.style.length; i++) { const k = r.style[i]; if (k.startsWith('--')) p[k.slice(2)] = r.style.getPropertyValue(k).trim(); }
        }
      }
      if (Object.keys(p).length) this._paleta = p; else return '';
    }
    return this._paleta[nombre] || '';
  },
  rgb(nombre) {
    const h = this.colorBase(nombre).replace('#', '');
    return /^[0-9a-f]{6}$/i.test(h) ? h.match(/../g).map(x => parseInt(x, 16)) : Array(3).fill(0);   // sin hoja, negro
  },

  /* INSTITUCIÓN, EN UNA SOLA LISTA. Las instituciones van agrupadas por su tipo (alcaldías, gobierno,
     empresas, organizaciones), en el orden fijo de los tipos y por nombre dentro de cada uno: un
     control en lugar de dos. Sólo se ofrecen las de `orgIds`, las que tienen algo en la lista que se
     filtra. `f` lleva { organizacion }; lo elegido se queda aunque los demás filtros lo dejen sin
     resultados: nada cambia solo. */
  llenarInstituciones(selOrg, orgIds, f) {
    const orgs = [...new Set([...orgIds].concat(f.organizacion || []))].map(id => SRP.ref.catalogoPorId[id]).filter(Boolean);
    // Dentro de su grupo, una alcaldía va sólo con su nombre: el grupo ya dice «Alcaldía»
    const nombre = o => o.nombre, esc = this.escapar;
    const grupos = SRP.ref.TIPOS_INSTITUCION.map(t => [t, orgs.filter(o => o.tipo_organizacion === t).sort((a, b) => nombre(a).localeCompare(nombre(b), 'es'))]).filter(g => g[1].length);
    const sueltas = orgs.filter(o => !SRP.ref.TIPOS_INSTITUCION.includes(o.tipo_organizacion));
    const op = o => '<option value="' + esc(o.id) + '">' + esc(nombre(o)) + '</option>';
    selOrg.innerHTML = '<option value="">Todas</option>' + grupos.map(([t, l]) => '<optgroup label="' + esc(t) + '">' + l.map(op).join('') + '</optgroup>').join('') + sueltas.map(op).join('');
    selOrg.value = f.organizacion || '';
  },

  /* LISTAS QUE DEPENDEN DE LAS DEMÁS. Para cada filtro de lista, los valores que existen entre los
     elementos que pasan todos los otros filtros de lista (el periodo no cuenta: las listas no cambian
     al moverse de fecha). `cumple(elemento, excluir)` dice si el elemento pasa los filtros salvo los
     de `excluir`; `valores[k](elemento)` da su valor (o valores) para el filtro k. */
  facetas(items, cumple, valores) {
    const salida = {};
    Object.keys(valores).forEach(k => {
      const ex = new Set([k]), s = new Set();
      items.forEach(it => { if (cumple(it, ex)) [].concat(valores[k](it)).forEach(v => { if (v) s.add(v); }); });
      salida[k] = s;
    });
    return salida;
  },

  // El tipo de institución de una institución, o vacío
  tipoDe(orgId) { return (SRP.ref.catalogoPorId[orgId] || {}).tipo_organizacion || ''; },

  /* Una lista de opciones a partir de valores, en orden alfabético o en el de `comparar` (sobre los
     valores). El valor elegido se queda aunque ya no tenga resultados con los demás filtros (`etiqueta`
     le pone nombre): así nada cambia sin tocarlo. */
  llenarLista(sel, vacio, pares, f, campo, etiqueta, comparar) {
    const orden = pares.slice();
    if (f[campo] && !orden.some(p => p[0] === f[campo])) orden.push([f[campo], etiqueta ? etiqueta(f[campo]) : f[campo]]);
    orden.sort(comparar ? (a, b) => comparar(a[0], b[0]) : (a, b) => String(a[1]).localeCompare(String(b[1]), 'es'));
    sel.innerHTML = this.opciones(vacio, orden);
    sel.value = f[campo];
  },

  // «año, mes, cabo y especie»
  enumerar(lista) {
    return lista.length < 2 ? lista.join('') : lista.slice(0, -1).join(', ') + (/^[ií]/i.test(lista[lista.length - 1]) ? ' e ' : ' y ') + lista[lista.length - 1];
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

  // El nombre de una cuenta, en un solo campo; las de antes lo tenían en tres y se leen igual
  nombreCompleto(u) {
    if (!u) return '';
    return u.nombre_completo || [u.nombre, u.apellido_paterno, u.apellido_materno].filter(Boolean).join(' ');
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
    // Un aviso de fondo (el envío automático) no tapa uno que ofrece «Deshacer»: se perdería la
    // única salida de lo que se acaba de hacer (D151). Lo de fondo también se lee en la pastilla.
    if (op.secundario && !zona.hidden && zona.querySelector('.aviso-accion')) return;
    const tonos = { alerta: { icono: 'info', color: 'alerta' }, aviso: { icono: 'info', color: 'aviso' } };
    const t = tonos[tipo] || { icono: 'palomita', color: 'exito' };
    zona.innerHTML = '<span class="aviso-icono" aria-hidden="true">' + SRP.ICONOS.svg(t.icono, 'medio') + '</span>' +
      '<span class="aviso-texto"></span>' +
      (op.deshacer ? '<button type="button" class="aviso-accion"></button>' : '') +
      '<button type="button" class="aviso-cerrar" aria-label="Cerrar aviso">' + SRP.ICONOS.svg('cerrar', 'medio') + '</button>';
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
    // Ámbar («tome nota») dura más que la confirmación en verde: suele traer una regla que hay que leer
    const base = op.deshacer ? 8000 : (t.color === 'alerta' ? 7000 : t.color === 'aviso' ? 6000 : 4500);
    const duracion = base + Math.floor(mensaje.length / 40) * 1000;
    let restante = duracion, marca = Date.now();
    clearTimeout(SRP.util._temporizadorAviso);
    const programar = (ms) => { SRP.util._temporizadorAviso = setTimeout(() => { zona.hidden = true; }, ms); };
    // `op.fijo`: dice que algo está en curso y se queda hasta que otro aviso lo sustituya o se quite con quitarAviso()
    zona.dataset.fijo = op.fijo ? 'true' : 'false';
    if (op.fijo) { zona.onmouseenter = zona.onmouseleave = null; return; }
    programar(duracion);
    zona.onmouseenter = () => { clearTimeout(SRP.util._temporizadorAviso); restante -= (Date.now() - marca); };
    zona.onmouseleave = () => { marca = Date.now(); programar(Math.max(restante, 1500)); };
  },

  // Quita el aviso «en curso» si sigue a la vista: lo que se esperaba terminó sin otro aviso (por ejemplo, se canceló)
  quitarAviso() {
    const zona = document.getElementById('aviso');
    if (zona.dataset.fijo === 'true') { zona.hidden = true; zona.dataset.fijo = 'false'; }
  },

  /* ERRORES AL PIE DEL CAMPO (D140). El resumen de arriba se queda (con enlaces, sirve al lector de
     pantalla y en formularios largos), pero al llegar al campo, el campo mismo dice qué corregir:
     el mensaje va debajo, en rojo con su icono, y el control lo anuncia con aria-describedby.
     `errores`: [[id, texto]]; `ids`: los campos que el formulario valida, para limpiar los que ya
     quedaron bien. Un botón (la ubicación) recibe el mensaje pero no aria-invalid. */
  /* ERRORES QUE NO SE QUEDAN MUDOS (D149, Norma 7.6). Un fallo al escribir en el teléfono se dice
     con palabras: qué no se pudo hacer y, si fue el espacio, qué hacer. Antes 17 de 18 funciones que
     escriben fallaban en silencio y «Guardar» decía «No se pudo guardar: .» con el espacio lleno. */
  esFaltaDeEspacio(err) {
    const n = err && (err.name || (err.error && err.error.name));
    return n === 'QuotaExceededError' || n === 'NS_ERROR_DOM_QUOTA_REACHED' || (err && err.code === 22);
  },

  mensajeError(err, que) {
    if (this.esFaltaDeEspacio(err)) {
      return 'No se pudo ' + que + ': el teléfono se quedó sin espacio para el SRP. Libere espacio en el teléfono (fotos, videos o aplicaciones) sin borrar los datos del navegador.';
    }
    const detalle = err && err.message ? ' (' + String(err.message).slice(0, 120) + ')' : '';
    return 'No se pudo ' + que + detalle + '. Intente de nuevo; si se repite, recargue la página.';
  },

  // Avisa una sola vez por error: la marca evita que una acción que llama a otra lo repita
  avisarError(err, que) {
    const e = err instanceof Error || (err && typeof err === 'object') ? err : new Error(String(err));
    if (e.srpAvisado) return e;
    try { e.srpAvisado = true; } catch (x) { /* objeto congelado: se avisa igual */ }
    this.anunciar(this.mensajeError(e, que), 'alerta');
    return e;
  },

  /* Envuelve las acciones que escriben (se declara al final de cada módulo, en una lista): si fallan,
     se avisa qué no se pudo hacer y el error sigue su camino, para que quien la llamó no continúe
     como si hubiera salido bien (p. ej. no cierra el diálogo con lo escrito). */
  proteger(modulo, acciones) {
    Object.entries(acciones).forEach(([nombre, que]) => {
      const original = modulo[nombre];
      if (typeof original !== 'function' || original.protegido) return;
      const envuelta = async function (...args) {
        try { return await original.apply(this, args); } catch (err) { throw SRP.util.avisarError(err, que); }
      };
      envuelta.protegido = true;
      modulo[nombre] = envuelta;
    });
  },

  /* Red de seguridad: lo que falle fuera de una acción protegida también se dice, a lo más una vez
     cada 4 s. No se silencia la consola: el error sigue registrado para diagnosticarlo. */
  redDeSeguridad() {
    let ultimo = 0;
    const avisar = (err) => {
      if (!err || err.srpAvisado || Date.now() - ultimo < 4000) return;
      ultimo = Date.now();
      this.avisarError(err, 'completar la última acción');
    };
    window.addEventListener('unhandledrejection', (e) => avisar(e.reason));
    // Sólo errores de código (los de un recurso que no cargó no traen e.error)
    window.addEventListener('error', (e) => { if (e.error) avisar(e.error); });
  },

  /* RESUMEN DE ERRORES DE UN FORMULARIO (M15). Uno solo para los seis formularios: cada campo dice
     su error debajo (D140) y arriba queda la lista con el mismo texto, escapado y con un enlace a
     su campo; el foco va a la caja, para que el lector de pantalla la lea completa. Devuelve si
     hubo errores. `ids`: los campos del formulario, para limpiar los errores de la vez anterior. */
  resumenErrores(caja, errores, ids) {
    this.erroresEnCampos(errores, ids);
    if (!errores.length) { caja.hidden = true; caja.innerHTML = ''; return false; }
    const esc = t => this.escapar(t);
    caja.innerHTML = '<h2>Falta corregir ' + errores.length + (errores.length === 1 ? ' dato' : ' datos') + '</h2><ul>' +
      errores.map(([id, t]) => '<li><a href="#' + esc(id) + '">' + esc(t) + '</a></li>').join('') + '</ul>';
    caja.hidden = false;
    if (!caja.hasAttribute('tabindex')) caja.setAttribute('tabindex', '-1');
    caja.focus();
    return true;
  },

  /* BOTÓN OCUPADO (M15, D136). Mientras dura una operación el botón dice qué está haciendo, queda
     deshabilitado y con aria-busy, para que no parezca que no respondió ni se toque dos veces.
     Devuelve la función que lo deja como estaba; llamarla dos veces no hace daño. */
  ocupado(boton, texto, icono, tam) {
    const html0 = boton.innerHTML;
    boton.disabled = true;
    boton.setAttribute('aria-busy', 'true');
    boton.innerHTML = SRP.ICONOS.svg(icono || 'info', tam || 'medio') + '<span>' + this.escapar(texto) + '</span>';
    let libre = false;
    return () => {
      if (libre) return; libre = true;
      boton.disabled = false; boton.removeAttribute('aria-busy'); boton.innerHTML = html0;
    };
  },

  /* OPCIONES DE UNA LISTA (M15). `pares`: [[valor, texto], …], escapados; `vacio`: el texto de la
     opción sin valor («Todos», «Seleccione…»), o nada si no la lleva. */
  opciones(vacio, pares) {
    const esc = t => this.escapar(t);
    return (vacio == null ? '' : '<option value="">' + esc(vacio) + '</option>') +
      pares.map(([v, t]) => '<option value="' + esc(v) + '">' + esc(t) + '</option>').join('');
  },
  /* Fichas de los filtros activos: cada una dice qué filtra y se quita con su ×. `fichas`: [qué quitar, texto].
     La vista atiende el toque en `button[data-quitar]`. */
  pintarFichas(ul, fichas) {
    const esc = t => this.escapar(t);
    ul.innerHTML = fichas.map(([q, t]) =>
      '<li class="ficha-filtro"><span>' + esc(t) + '</span><button type="button" data-quitar="' + esc(q) + '" aria-label="Quitar filtro ' + esc(t) + '">' +
      SRP.ICONOS.svg('cerrar', 'chico') + '</button></li>').join('');
  },

  // Las personas de una lista, por nombre: el filtro de cabo de Registros, Jornadas y Fotografías
  // Las personas de una lista «Quién registró»: la coordinación y la Administración dicen su perfil
  paresPersonas(ids) {
    const perfil = id => ({ COORDINADOR: ' (coordinación)', ADMIN: ' (Administración)' })[(SRP.ref.usuarioPorId[id] || {}).perfil] || '';
    return [...new Set(ids)].filter(Boolean).map(id => [id, SRP.ref.nombreUsuario(id) + perfil(id)]).sort((a, b) => a[1].localeCompare(b[1], 'es'));
  },

  /* ATAJOS DE FECHA (M15). La misma barra —Todos · Hoy · Un día · Un periodo— en Registros,
     Jornadas y Fotografías. Cada vista decide qué filtra; aquí se atiende el toque, se
     marca un solo atajo y se abren o cierran los paneles de «Un día» y «Un periodo» con su
     aria-expanded. `paneles`: { dia: [elemento, abierto], periodo: [elemento, abierto] }. */
  atajos: {
    iniciar(caja, alTocar) {
      caja.addEventListener('click', (e) => { const b = e.target.closest('.chip[data-atajo]'); if (b) alTocar(b.dataset.atajo); });
    },
    marcar(caja, activo, paneles) {
      caja.querySelectorAll('.chip[data-atajo]').forEach(c => c.setAttribute('aria-pressed', String(!!activo[c.dataset.atajo])));
      Object.entries(paneles || {}).forEach(([atajo, [panel, abierto]]) => {
        if (panel) panel.hidden = !abierto;
        const c = caja.querySelector('[data-atajo="' + atajo + '"]');
        if (c) c.setAttribute('aria-expanded', String(!!abierto));
      });
    }
  },

  /* COORDENADAS A MANO (D170). El teclado numérico del iPhone (y de algunos Android) no trae el
     signo menos, y en la Ciudad de México toda longitud es negativa (oeste): el campo muestra un «−»
     fijo, se escribe sólo el número y la longitud se guarda negativa con o sin signo. Se acepta coma
     decimal y el signo tipográfico «−». Pegar el par completo que da Google Maps («19.4326, -99.1332»)
     en cualquiera de los dos campos llena los dos. */
  coordenadas: {
    limpio(t) { return String(t == null ? '' : t).replace(/[\u2212\u2012\u2013\u2014]/g, '-').replace(/[°\s]/g, ''); },
    numero(t) { const s = this.limpio(t).replace(',', '.'); return /^-?\d+(\.\d+)?\.?$/.test(s) ? Number(s) : NaN; },
    latitud(t) { return this.numero(t); },
    longitud(t) { const n = this.numero(t); return Number.isNaN(n) ? NaN : -Math.abs(n); },
    // Lo que se muestra en el campo de longitud: sin signo, porque el «−» ya está a la vista
    mostrarLongitud(n) { return Math.abs(n).toFixed(6); },
    // Un par «latitud, longitud» (también con punto y coma o espacio, y en orden inverso) → [lat, lng]; si no, null
    par(texto) {
      const s = String(texto == null ? '' : texto).replace(/[\u2212\u2012\u2013\u2014]/g, '-').replace(/°/g, '');
      const m = s.match(/^\s*(-?\d{1,3}(?:[.,]\d+)?)\s*[,;\s]\s*(-?\d{1,3}(?:[.,]\d+)?)\s*$/);
      if (!m) return null;
      let a = this.numero(m[1]), b = this.numero(m[2]);
      if (Number.isNaN(a) || Number.isNaN(b)) return null;
      if (Math.abs(a) > 90 && Math.abs(b) <= 90) [a, b] = [b, a];   // venía como longitud, latitud
      if (Math.abs(a) > 90 || Math.abs(b) > 180) return null;
      return [a, -Math.abs(b)];
    },
    // Si alguno de los dos campos trae el par completo, lo reparte; devuelve true si lo hizo
    repartir(latEl, lngEl, texto) {
      const p = this.par(texto !== undefined ? texto : latEl.value) || (texto === undefined ? this.par(lngEl.value) : null);
      if (!p) return false;
      latEl.value = p[0].toFixed(6); lngEl.value = this.mostrarLongitud(p[1]);
      SRP.util.anunciarSilencioso('Se llenaron latitud y longitud.');
      return true;
    },
    // Pegar o escribir el par en cualquiera de los dos campos llena los dos
    enlazar(latEl, lngEl) {
      [latEl, lngEl].forEach(el => {
        el.addEventListener('paste', (e) => {
          const t = (e.clipboardData || window.clipboardData) ? (e.clipboardData || window.clipboardData).getData('text') : '';
          if (this.par(t)) { e.preventDefault(); this.repartir(latEl, lngEl, t); }
        });
        el.addEventListener('change', () => { this.repartir(latEl, lngEl); });
      });
    }
  },

  erroresEnCampos(errores, ids) {
    ids.concat(errores.map(e => e[0])).forEach(id => this.quitarErrorCampo(document.getElementById(id)));
    errores.forEach(([id, texto]) => {
      const c = document.getElementById(id); if (!c) return;
      let m = document.getElementById(id + '-error');
      if (m) { m.querySelector('span').textContent += ' ' + texto; return; }
      if (c.tagName !== 'BUTTON') c.setAttribute('aria-invalid', 'true');
      m = document.createElement('p');
      m.id = id + '-error'; m.className = 'campo-error';
      m.innerHTML = SRP.ICONOS.svg('info', 'chico') + '<span></span>';
      m.querySelector('span').textContent = texto;
      // Al final de su caja de campo (debajo de «Hoy», de la lista de especies, del contador);
      // un control suelto, como el botón de ubicación, lo lleva justo debajo
      const caja = c.closest('.campo');
      if (caja) caja.appendChild(m); else c.insertAdjacentElement('afterend', m);
      c.setAttribute('aria-describedby', ((c.getAttribute('aria-describedby') || '') + ' ' + m.id).trim());
    });
  },

  quitarErrorCampo(c) {
    if (!c) return;
    c.removeAttribute('aria-invalid');
    const m = document.getElementById(c.id + '-error'); if (m) m.remove();
    const resto = (c.getAttribute('aria-describedby') || '').split(' ').filter(x => x && x !== c.id + '-error');
    if (resto.length) c.setAttribute('aria-describedby', resto.join(' ')); else c.removeAttribute('aria-describedby');
  },

  /* CONTADOR DE CARACTERES (D140). Los campos con límite (nombre 120, ubicación 200, comentarios
     500) se cortaban en silencio al llegar al tope. El contador aparece al pasar del 80 % y, al
     llegar al límite, lo dice en letras y al lector de pantalla, una vez. */
  iniciarContadores() {
    document.querySelectorAll('input[maxlength], textarea[maxlength]').forEach(c => {
      if (!c.id || document.getElementById(c.id + '-contador')) return;
      const s = document.createElement('span');
      s.id = c.id + '-contador'; s.className = 'contador'; s.hidden = true; s.setAttribute('aria-hidden', 'true');
      c.insertAdjacentElement('afterend', s);
      const pintar = () => this.pintarContador(c);
      c.addEventListener('input', pintar);
      c.addEventListener('focus', pintar);
    });
  },

  pintarContador(c) {
    const s = document.getElementById(c.id + '-contador'); if (!s) return;
    const max = Number(c.getAttribute('maxlength')), n = c.value.length;
    s.hidden = n < max * 0.8;
    const lleno = n >= max;
    s.dataset.lleno = String(lleno);
    s.textContent = n + ' / ' + max + (lleno ? ' · llegó al límite' : '');
    if (lleno && !c.dataset.avisoLimite) { c.dataset.avisoLimite = '1'; this.anunciarSilencioso('Llegó al límite de ' + max + ' caracteres.'); }
    if (!lleno) delete c.dataset.avisoLimite;
  },

  // Tras llenar o limpiar campos por código (abrir un diálogo, limpiar el formulario)
  refrescarContadores(raiz) {
    (raiz || document).querySelectorAll('input[maxlength], textarea[maxlength]').forEach(c => this.pintarContador(c));
  },

  /* ESTADO VACÍO (D141). El mismo patrón en los listados (Registros, Jornadas,
     Fotografías): icono, una frase en negritas, una explicación y la acción que saca del vacío.
     Un vacío sin icono ni acción parece error. Los botones llevan data-vacio con su acción; cada
     vista atiende el clic. `botones`: [{ accion, texto, clase, icono }] */
  htmlVacio(icono, titulo, texto, botones) {
    const esc = this.escapar;
    return '<span class="vacio-icono" aria-hidden="true">' + SRP.ICONOS.svg(icono, 'grande') + '</span>' +
      '<p class="vacio-titulo">' + esc(titulo) + '</p>' + (texto ? '<p class="vacio-texto">' + esc(texto) + '</p>' : '') +
      ((botones || []).filter(Boolean).length ? '<div class="vacio-acciones">' + botones.filter(Boolean).map(b =>
        '<button type="button" class="btn ' + (b.clase || 'btn-secundario') + '" data-vacio="' + b.accion + '">' +
        (b.icono ? SRP.ICONOS.svg(b.icono, 'medio') : '') + '<span>' + esc(b.texto) + '</span></button>').join('') + '</div>' : '');
  },

  /* PAGINACIÓN. Jornadas y Registros se muestran de LISTA_PAGINA en LISTA_PAGINA, con
     «Anterior» y «Siguiente» bajo la lista. `paginar` devuelve la rebanada de la página pedida,
     ajustada si la lista se acortó; `pintarPaginador` dibuja «Mostrando 11–20 de 85 jornadas» y
     los botones con la lista de páginas, y se oculta cuando todo cabe en una página. */
  // Resultados por página de cada lista (`clave` = id de su paginador); se recuerda en el dispositivo
  tamPagina(clave) {
    let t = null;
    try { t = Number(localStorage.getItem('srp_tam_pagina_' + clave)); } catch (e) { /* sin almacenamiento */ }
    return SRP.CONFIG.TAMANOS_PAGINA.includes(t) ? t : (SRP.CONFIG.PAGINA_POR_LISTA || {})[clave] || SRP.CONFIG.LISTA_PAGINA;
  },

  /* Las páginas que se ofrecen como botones: la primera, la última y las vecinas de la actual, con
     «…» donde se saltan. `lugares`: cuántos caben (7 en pantalla ancha, 5 en teléfono). */
  paginasVisibles(actual, total, lugares) {
    const rango = (a, b) => Array.from({ length: b - a + 1 }, (_, i) => a + i);
    if (total <= lugares) return rango(1, total);
    const lado = lugares - 2;   // lo que cabe junto a un extremo, contando su «…»
    if (actual <= lado - 1) return rango(1, lado).concat('…', total);
    if (actual >= total - lado + 2) return [1, '…'].concat(rango(total - lado + 1, total));
    const vecinas = (lugares - 4 - 1) / 2;
    return [1, '…'].concat(rango(actual - vecinas, actual + vecinas), '…', total);
  },

  /* ORDEN DE LAS LISTAS. Jornadas, Registros y Fotografías llegan con lo más reciente
     primero; cada una puede verse al revés. Lo elegido se recuerda por lista en el dispositivo. */
  ORDENES: [['reciente', 'Lo más reciente primero'], ['antiguo', 'Lo más antiguo primero']],
  ordenLista(clave) {
    let v = '';
    try { v = localStorage.getItem('srp_orden_' + clave) || ''; } catch (e) { /* sin almacenamiento */ }
    return v === 'antiguo' ? 'antiguo' : 'reciente';
  },
  // `lista` viene de lo más reciente a lo más antiguo; devuelve otra en el orden elegido
  ordenar(lista, clave) { return this.ordenLista(clave) === 'antiguo' ? lista.slice().reverse() : lista; },
  // El desplegable «Ordenar» de una lista; `alCambiar` la repinta desde su primera página
  pintarOrden(caja, clave, alCambiar) {
    if (!caja) return;
    if (!caja.firstChild) {
      const id = caja.id + '-lista';
      caja.innerHTML = '<label for="' + id + '">Ordenar</label><select id="' + id + '">' +
        this.ORDENES.map(([v, t]) => '<option value="' + v + '">' + t + '</option>').join('') + '</select>';
      caja.querySelector('select').addEventListener('change', (e) => {
        try { localStorage.setItem('srp_orden_' + clave, e.target.value); } catch (err) { /* sólo por esta vez */ }
        alCambiar();
      });
    }
    caja.querySelector('select').value = this.ordenLista(clave);
  },

  paginar(lista, pagina, clave) {
    const tam = clave ? this.tamPagina(clave) : SRP.CONFIG.LISTA_PAGINA;
    const paginas = Math.max(1, Math.ceil(lista.length / tam));
    const p = Math.min(Math.max(1, pagina || 1), paginas);
    const inicio = (p - 1) * tam;
    return { items: lista.slice(inicio, inicio + tam), pagina: p, paginas, total: lista.length,
             desde: lista.length ? inicio + 1 : 0, hasta: Math.min(inicio + tam, lista.length) };
  },

  /* «Mostrando 11–20 de 85 jornadas»; «‹ Atrás · 1 2 3 … 9 · Siguiente ›», con la última página
     siempre a la vista; y «Resultados por página». Sin más de una página de las más cortas, no se ve. */
  pintarPaginador(nav, info, singular, plural, irA) {
    const tamanos = SRP.CONFIG.TAMANOS_PAGINA;
    nav.hidden = info.total <= tamanos[0];
    if (nav.hidden) { nav.innerHTML = ''; return; }
    const num = (n) => n.toLocaleString('es-MX');
    const tam = this.tamPagina(nav.id);
    const paso = (p, icono, texto, apagado) => '<button type="button" class="btn btn-secundario btn-chico" data-paso="' + p + '" aria-label="Página ' + (p < 0 ? 'anterior' : 'siguiente') + '"' +
      (apagado ? ' disabled' : '') + '>' + (p < 0 ? SRP.ICONOS.svg(icono, 'medio') : '') + '<span>' + texto + '</span>' + (p > 0 ? SRP.ICONOS.svg(icono, 'medio') : '') + '</button>';
    const lugares = window.matchMedia('(max-width: 480px)').matches ? 5 : 7;
    const numeros = this.paginasVisibles(info.pagina, info.paginas, lugares).map(p => p === '…'
      ? '<span class="paginador-salto" aria-hidden="true">…</span>'
      : '<button type="button" class="btn btn-secundario btn-chico paginador-num" data-pagina="' + p + '"' + (p === info.pagina ? ' aria-current="page"' : '') +
        ' aria-label="Página ' + p + (p === info.paginas ? ', la última' : '') + '">' + p + '</button>').join('');
    nav.innerHTML = '<p class="paginador-texto">Mostrando ' + num(info.desde) + '–' + num(info.hasta) + ' de ' + num(info.total) + ' ' + (info.total === 1 ? singular : plural) + '</p>' +
      (info.paginas > 1 ? '<div class="paginador-botones">' + paso(-1, 'anterior', 'Atrás', info.pagina === 1) + numeros +
        paso(1, 'siguiente', 'Siguiente', info.pagina === info.paginas) + '</div>' : '') +
      '<label class="paginador-tamano">Resultados por página <select data-tam>' +
      tamanos.map(t => '<option value="' + t + '"' + (t === tam ? ' selected' : '') + '>' + t + '</option>').join('') + '</select></label>';
    nav.onclick = (e) => {
      const b = e.target.closest('button[data-paso], button[data-pagina]');
      if (!b || b.disabled) return;
      irA(b.dataset.pagina ? Number(b.dataset.pagina) : info.pagina + Number(b.dataset.paso));
    };
    // Otro tamaño vuelve a la primera página
    nav.onchange = (e) => {
      if (!e.target.matches('select[data-tam]')) return;
      try { localStorage.setItem('srp_tam_pagina_' + nav.id, e.target.value); } catch (err) { /* sólo por esta vez */ }
      irA(1);
    };
  },

  // Tras cambiar de página, la lista vuelve a verse desde arriba, bajo el encabezado fijo
  subirA(el) {
    if (!el) return;
    const alto = (document.querySelector('.encabezado') || {}).offsetHeight || 0;
    window.scrollTo({ top: Math.max(0, el.getBoundingClientRect().top + window.scrollY - alto - 12), behavior: 'instant' });
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
