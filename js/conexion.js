/* CONEXIÓN, TRABAJO SIN SEÑAL Y RESPALDO (D71, D72).

   QUÉ SE LE DICE A QUIEN REGISTRA, Y POR QUÉ. La aplicación funciona sin señal: el GPS, la
   captura, el guardado y el reporte en PDF viven en el teléfono. Lo que no se decía en pantalla es
   qué pasa con esos registros: en la Etapa 1 no hay servidor, así que no hay nada que enviar
   cuando vuelve la señal, y borrar los datos del navegador los pierde. Este módulo pone las tres
   cosas a la vista: el estado de la conexión, cuántos registros guarda este dispositivo y qué
   hacer con ellos. Cuando exista el servidor (Fase 2), el mismo aviso dirá «N pendientes de
   enviar» y aquí vivirá el botón de sincronizar.

   LA CUENTA VA EN LA PASTILLA (D83). El bloque «Registros en este dispositivo» vive en Reportes,
   a donde el cabo no va en campo; la pastilla del encabezado se ve en todas las pantallas, así
   que lleva la cuenta («Con conexión · 4 guardados») y al tocarla abre la guía. Es lo que hace
   la cola de envío de KoboToolbox, sin su barra lateral. El aviso de «Registro guardado» dice
   además que quedó en este dispositivo y cuántos van, sin pedir otro clic.

   RESPALDO. Un archivo con todo lo que guarda el dispositivo —plantaciones, jornadas y bitácora,
   con el mismo esquema de la base— que se comparte igual que el PDF. Un respaldo que nunca se ha
   restaurado es una suposición (Norma 4.9): por eso «Restaurar respaldo» existe, en las
   herramientas de prueba, y la prueba automatizada hace el viaje completo. */
window.SRP = window.SRP || {};

SRP.conexion = {
  el(id) { return document.getElementById(id); },

  iniciar() {
    this.registrarWorker();
    // Al volver la señal se envía la cola (D111); con ella, el servidor simulado emite los folios (D110)
    window.addEventListener('online', async () => {
      await this.refrescar();
      await SRP.envio.pintarFranja();
      SRP.envio.enviar();
    });
    window.addEventListener('offline', async () => { await this.refrescar(); await SRP.envio.pintarFranja(); });
    this.el('conexion').addEventListener('click', async () => { await this.pintarEstado(); this.el('dlg-senal').showModal(); });
    this.el('btn-respaldo').addEventListener('click', () => { SRP.app.menuCuenta(false); this.respaldar(); });
    // Restaurar es herramienta de prueba (D150): con datos reales ni siquiera se conecta
    const restaurar = this.el('archivo-restaurar');
    if (restaurar && SRP.CONFIG.ES_FICTICIO) restaurar.addEventListener('change', (e) => this.restaurar(e.target));
    this.refrescar();
  },

  /* El worker se registra con la misma marca de versión de index.html: una versión nueva es un
     worker nuevo. Con file:// (doble clic) no hay worker y no pasa nada: la app abre igual. Si el
     navegador no lo permite, ya no se calla: la guía dice que no abrirá sin señal (D149). */
  worker: 'no aplica',
  registrarWorker() {
    if (!('serviceWorker' in navigator) || location.protocol === 'file:') return;
    this.worker = 'registrando';
    navigator.serviceWorker.register('sw.js?v=' + encodeURIComponent(SRP.CONFIG.VERSION))
      .then(() => { this.worker = 'registrado'; }, () => { this.worker = 'error'; });
  },

  // ¿Quedó esta versión guardada en el teléfono para abrir sin señal?
  async listaSinSenal() {
    if (this.worker === 'no aplica') return null;
    if (this.worker === 'error') return false;
    try { return 'caches' in window && await caches.has('srp-' + SRP.CONFIG.VERSION); } catch (e) { return false; }
  },

  /* ESTADO DEL TELÉFONO EN LA GUÍA (D149): lo que decide si lo capturado sobrevive. En la Etapa 1
     esa es la única copia, así que se dice con palabras si el navegador lo protege, cuánto ocupa,
     si la app abre sin señal y cuándo fue el último respaldo. */
  esIphoneEnNavegador() {
    const ios = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    const instalada = navigator.standalone === true || (window.matchMedia && matchMedia('(display-mode: standalone)').matches);
    return ios && !instalada;
  },

  // Una vez por sesión, al guardar el primer árbol en un iPhone desde Safari (D149)
  sugerirInstalar() {
    if (this._sugerido || !this.esIphoneEnNavegador()) return;
    this._sugerido = true;
    setTimeout(() => SRP.util.anunciar('En iPhone, agregue el SRP a la pantalla de inicio (Compartir › Agregar a inicio) para que Safari no borre lo capturado.', 'aviso'), 600);
  },

  async pintarEstado() {
    const caja = this.el('senal-estado'); if (!caja) return;
    const a = await SRP.almacen.estadoAlmacenamiento();
    const lista = await this.listaSinSenal();
    const renglones = [];
    const r = (etq, texto, aviso) => renglones.push('<dt>' + etq + '</dt><dd' + (aviso ? ' data-tono="aviso"' : '') + '>' + SRP.util.escapar(texto) + '</dd>');
    r('Lo guardado aquí', a.protegido === true ? 'Protegido: el navegador no lo borrará para liberar espacio.'
      : a.protegido === false ? 'Sin protección: el navegador podría borrarlo si le falta espacio. Guarde un respaldo al cerrar cada jornada.'
      : 'Este navegador no dice si lo protege. Guarde un respaldo al cerrar cada jornada.', a.protegido !== true);
    if (this.esIphoneEnNavegador()) r('En iPhone', 'Agregue el SRP a la pantalla de inicio (Compartir › Agregar a inicio): Safari borra lo guardado de los sitios que no se abren en 7 días.', true);
    if (a.usado !== null && a.cuota) r('Espacio usado', SRP.foto.formatearPeso(a.usado) + ' de ' + SRP.foto.formatearPeso(a.cuota) + ' (' + Math.round(100 * a.usado / a.cuota) + ' %).', a.usado / a.cuota >= 0.8);
    if (lista !== null) r('Abre sin señal', lista ? 'Sí: esta versión quedó guardada en el teléfono.' : this.worker === 'error' ? 'No: el navegador no lo permitió.' : 'Todavía no: ábrala una vez con señal.', !lista);
    const ult = this.textoUltimoRespaldo();
    r('Último respaldo', ult.texto, ult.atrasado);
    caja.innerHTML = renglones.join('');
  },

  // «nunca», «hoy», «ayer», «hace N días»; atrasado si nunca o de otro día
  textoUltimoRespaldo() {
    let iso = null;
    try { iso = localStorage.getItem(SRP.CONFIG.CLAVE_ULTIMO_RESPALDO); } catch (e) { /* sin dato */ }
    if (!iso) return { texto: 'Nunca.', atrasado: true, dias: null };
    const dia = (d) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; };
    const dias = Math.round((dia(Date.now()) - dia(iso)) / 86400000);
    const texto = dias <= 0 ? 'Hoy.' : dias === 1 ? 'Ayer.' : 'Hace ' + dias + ' días.';
    return { texto, atrasado: dias >= 1, dias };
  },

  // «Simular sin señal» (pruebas, D111) manda sobre lo que diga el teléfono
  enLinea() { return navigator.onLine !== false && !SRP.envio.sinSenalForzada(); },

  async refrescar() {
    const con = this.enLinea();
    const ind = this.el('conexion');
    if (SRP.envio.simulado()) return this.refrescarSimulado(ind, con);
    const n = await this.contarGuardados();
    // En teléfono chico la palabra «guardados» se oculta por CSS (queda «Con conexión · 4»); la etiqueta accesible la dice completa (D93)
    const cuenta = n === null ? '' : ' · ' + n + '<span class="cx-palabra"> ' + (n === 1 ? 'guardado' : 'guardados') + '</span>';
    ind.innerHTML = SRP.ICONOS.svg(con ? 'senal' : 'sinSenal', 'medio') +
      '<span>' + (con ? 'Con conexión' : 'Sin conexión') + cuenta + '</span>';
    ind.dataset.estado = con ? 'con' : 'sin';
    ind.setAttribute('aria-label', (con ? 'Con conexión' : 'Sin conexión, puede seguir registrando') +
      (n === null ? '' : ', ' + n + ' registros guardados en este dispositivo') + '. Abrir la guía de qué hacer sin internet');
    await this.refrescarAvisoEnvio();
  },

  /* La pastilla con el envío simulado (D111): en lugar de cuántos guarda el teléfono, cuántos
     esperan envío. «Al día» cuando no queda nada; rojo cuando hay atraso (días anteriores o
     pasada la hora de cierre); «Enviando 3…» mientras dura el envío. */
  async refrescarSimulado(ind, con) {
    const pend = await SRP.envio.pendientesPropios();
    const n = pend === null ? null : pend.length;
    const enviando = SRP.envio.enCurso;
    const atraso = SRP.envio.atraso(pend);
    let texto, etiqueta;
    if (enviando) {
      texto = 'Enviando ' + enviando + '…';
      etiqueta = 'Enviando ' + enviando + (enviando === 1 ? ' registro' : ' registros') + ' al servidor';
    } else {
      // «Al día» con un servidor simulado no es «enviado» (D150): en pantallas anchas lo dice; en el
      // teléfono lo dicen la banda de datos ficticios, la etiqueta accesible y la guía
      const cuenta = n === null ? '' : n === 0 ? ' · Al día<span class="cx-palabra"> (simulado)</span>' : ' · ' + n + '<span class="cx-palabra"> por enviar</span>';
      texto = (con ? 'Con conexión' : 'Sin conexión') + cuenta;
      etiqueta = (con ? 'Con conexión' : 'Sin conexión, puede seguir registrando') +
        (n === null ? '' : n === 0 ? ', todo enviado al servidor simulado' : ', ' + n + (n === 1 ? ' registro por enviar' : ' registros por enviar')) +
        (atraso ? ', con atraso' : '');
    }
    ind.innerHTML = SRP.ICONOS.svg(con ? 'senal' : 'sinSenal', 'medio') + '<span>' + texto + '</span>';
    ind.dataset.estado = enviando ? 'enviando' : atraso ? 'atraso' : con ? 'con' : 'sin';
    ind.setAttribute('aria-label', etiqueta + '. Abrir la guía de qué hacer sin internet');
  },

  /* Cuántos registros guarda este dispositivo, en el alcance de quien entró: un cabo cuenta los
     suyos. null cuando todavía no hay sesión o almacén. */
  async contarGuardados() {
    const mios = await this.registrosPropios();
    return mios === null ? null : mios.length;
  },

  // Los registros activos que alcanza quien entró
  async registrosPropios() {
    if (!SRP.sesion.usuario || !SRP.almacen.db) return null;
    const u = SRP.sesion.usuario;
    const todos = await SRP.almacen.porIndice('plantaciones', 'estatus', 'activo');
    return todos.filter(r => SRP.permisos.alcanza(u, r, SRP.ref.usuarioPorId));
  },

  // El bloque «Registros en este dispositivo» se retiró de Reportes (D104); sin su caja no hace nada
  async refrescarAvisoEnvio() {
    const caja = this.el('aviso-envio');
    if (!caja) return;
    const mios = await this.registrosPropios();
    if (mios === null) return;
    const n = mios.length;
    const f = this.resumenFotos(mios);
    const cuenta = n === 1 ? '1 registro guardado' : n + ' registros guardados';
    // Cuántos llevan fotografía y cuánto pesan: la cifra para pedir disco a ADIP (D87)
    const fotos = n ? ' ' + (f.con_foto === 1 ? '1 lleva fotografía' : f.con_foto + ' llevan fotografía') +
      (f.con_foto ? ' (' + SRP.foto.formatearPeso(f.foto_bytes) + ')' : '') + '.' : '';
    caja.innerHTML = SRP.ICONOS.svg('info', 'medio') + '<strong>' + cuenta + '.</strong>' + fotos + ' ' + (this.enLinea()
      ? 'Por ahora no hay envío al servidor: los registros se quedan aquí. Genere el reporte de la jornada y compártalo con su coordinador, o guarde un respaldo. <strong>No borre los datos del navegador.</strong>'
      : 'Siga registrando: no hace falta internet. Cuando tenga señal, genere el reporte de la jornada y compártalo.');
  },

  /* Cuántos registros llevan fotografía y cuánto pesan. Es la cifra con la que se pedirá disco a
     ADIP (D87): una proyección con uso medido, no una estimación. */
  resumenFotos(plantaciones) {
    const activos = plantaciones.filter(r => r.estatus === 'activo');
    const conFoto = activos.filter(r => r.foto_base64);
    return { registros: activos.length, con_foto: conFoto.length,
             foto_bytes: conFoto.reduce((s, r) => s + (r.foto_bytes || 0), 0) };
  },

  /* ---------- Respaldo ---------- */

  /* Sólo lo que alcanza quien respalda (D150): sus árboles y jornadas —también los eliminados, que
     son historia—, la bitácora de esos registros y, de las cuentas, id y nombre. Antes llevaba el
     padrón completo con correos, toda la bitácora y los registros de otras cuadrillas. */
  async respaldar() {
    const u = SRP.sesion.usuario;
    const alcanza = (x) => !!u && SRP.permisos.alcanza(u, x, SRP.ref.usuarioPorId);
    const plantaciones = (await SRP.almacen.todos('plantaciones')).filter(alcanza);
    const jornadas = (await SRP.almacen.todos('jornadas')).filter(alcanza);
    const ids = new Set(plantaciones.concat(jornadas).map(x => x.id));
    const bitacora = (await SRP.almacen.todos('bitacora')).filter(b => ids.has(b.entidad_id));
    const idsCuentas = new Set(plantaciones.concat(jornadas).flatMap(x => [x.cabo_id, x.encargado_id, x.creado_por_id, x.editado_por_id]).filter(Boolean));
    const datos = { sistema: 'SRP', version: SRP.CONFIG.VERSION, generado: SRP.util.ahoraISO(),
                    usuario_id: u ? u.id : null, es_ficticio: SRP.CONFIG.ES_FICTICIO, alcance: u ? SRP.permisos.de(u).alcance : null,
                    resumen: this.resumenFotos(plantaciones), plantaciones, jornadas, bitacora,
                    cuentas: [...idsCuentas].map(id => ({ id, nombre: SRP.ref.nombreUsuario(id) })) };
    const nombre = 'SRP_respaldo_' + SRP.util.fechaHoy() + (u ? '_' + u.id : '') + '.json';
    const blob = new Blob([JSON.stringify(datos)], { type: 'application/json' });
    const entrega = await SRP.reportes.entregarArchivo(blob, nombre, 'Respaldo del Sistema de Registro de Plantaciones');
    // Cancelar «Compartir» no es guardar: antes decía «Respaldo guardado» igual (D149)
    if (entrega === 'cancelado') { SRP.util.anunciar('No se guardó el respaldo: se canceló.', 'aviso'); return; }
    try { localStorage.setItem(SRP.CONFIG.CLAVE_ULTIMO_RESPALDO, SRP.util.ahoraISO()); } catch (e) { /* la guía dirá «nunca» */ }
    const n = datos.plantaciones.length, nj = datos.jornadas.length;
    SRP.util.anunciar('Respaldo guardado: ' + n + (n === 1 ? ' registro' : ' registros') + ' y ' + nj + (nj === 1 ? ' jornada' : ' jornadas') +
      '. Contiene nombres, ubicaciones y fotos: entréguelo sólo a su coordinación.');
  },

  /* RESTAURAR (D150). Un respaldo pasó por otras manos, así que nada entra sin revisarse:
       · Sólo árboles y jornadas; nunca cuentas, catálogos ni bitácora (la historia no se importa:
         cada registro restaurado deja su propio renglón RESTAURADO).
       · Cada renglón se valida contra el esquema (js/validar.js), debe estar en el alcance de quien
         restaura y sus referencias deben existir; lo que ya existe no se toca.
       · Antes de escribir se enseña el resumen y se pide confirmación; luego todo entra en una
         sola transacción, o nada.
     Está en las herramientas de prueba porque en Fase 2 lo hace el servidor con las mismas reglas. */
  async restaurar(entrada) {
    const archivo = entrada.files[0]; entrada.value = '';
    if (!archivo) return;
    const alerta = (t) => SRP.util.anunciar(t, 'alerta');
    if (!SRP.CONFIG.ES_FICTICIO) { alerta('Restaurar respaldos es de la versión de prueba; en producción lo hace el servidor.'); return; }
    if (archivo.size > SRP.CONFIG.RESPALDO_MAX_MB * 1024 * 1024) { alerta('El archivo es demasiado grande para ser un respaldo del SRP (más de ' + SRP.CONFIG.RESPALDO_MAX_MB + ' MB).'); return; }
    let datos;
    try { datos = JSON.parse(await archivo.text()); } catch (e) { alerta('El archivo no es un respaldo válido.'); return; }
    if (!datos || typeof datos !== 'object' || datos.sistema !== 'SRP') { alerta('El archivo no es un respaldo del SRP.'); return; }
    if (datos.es_ficticio !== SRP.CONFIG.ES_FICTICIO) {
      alerta(SRP.CONFIG.ES_FICTICIO ? 'El respaldo es de datos reales y este sistema es de prueba: no se mezclan.' : 'El respaldo es de datos de prueba: no se mezcla con datos reales.');
      return;
    }
    const u = SRP.sesion.usuario;
    const ids = async (a) => new Set((await SRP.almacen.todos(a)).map(x => x.id));
    const existentes = { usuarios: await ids('usuarios'), catalogos: await ids('catalogos'), jornadas: await ids('jornadas'), plantaciones: await ids('plantaciones') };
    const nuevos = { jornadas: [], plantaciones: [] };
    const rechazados = [];
    let yaEstaban = 0;
    // Primero las jornadas: los árboles apuntan a ellas
    for (const tabla of ['jornadas', 'plantaciones']) {
      for (const obj of (Array.isArray(datos[tabla]) ? datos[tabla] : [])) {
        const nombre = tabla === 'jornadas'
          ? 'Jornada «' + String((obj && obj.nombre) || 'sin nombre').slice(0, 40) + '»'
          : (obj && typeof obj.folio === 'string' && obj.folio ? 'Árbol ' + obj.folio.slice(0, 20) : 'Árbol sin folio');
        const v = SRP.validar.registro(tabla, obj);
        if (!v.ok) { rechazados.push(nombre + ': ' + v.motivo + '.'); continue; }
        const r = v.limpio;
        if (existentes[tabla].has(r.id)) { yaEstaban += 1; continue; }
        if (!u || !SRP.permisos.alcanza(u, r, SRP.ref.usuarioPorId)) { rechazados.push(nombre + ': es de otra cuadrilla.'); continue; }
        const extra = SRP.validar.reglasExtra(tabla, r);
        if (extra) { rechazados.push(nombre + ': ' + extra + '.'); continue; }
        const rotas = SRP.validar.referenciasRotas(tabla, r, existentes);
        if (rotas.length) { rechazados.push(nombre + ': ' + SRP.validar.textoReferencias(rotas) + '.'); continue; }
        // Un árbol entra con la fecha y el programa de su jornada, como todos (D151)
        if (tabla === 'plantaciones') {
          const j = nuevos.jornadas.find(x => x.id === r.jornada_id) || await SRP.almacen.uno('jornadas', r.jornada_id);
          if (j) { r.fecha_plantacion = j.fecha; r.programa_id = j.programa_id; }
        }
        nuevos[tabla].push(r);
        existentes[tabla].add(r.id);
      }
    }
    const nA = nuevos.plantaciones.length, nJ = nuevos.jornadas.length;
    const cuantos = (nA === 1 ? '1 árbol' : nA + ' árboles') + ' y ' + (nJ === 1 ? '1 jornada' : nJ + ' jornadas');
    if (!nA && !nJ) {
      SRP.util.anunciar('No hay nada nuevo que restaurar' + (yaEstaban ? ': ' + yaEstaban + ' ya estaban en este teléfono' : '') +
        (rechazados.length ? '. ' + rechazados.length + ' no se pueden restaurar: ' + rechazados[0] : '.'), rechazados.length ? 'alerta' : 'aviso');
      return;
    }
    const ok = await SRP.app.confirmar({ titulo: 'Restaurar respaldo', pregunta: '¿Agregar ' + cuantos + ' de este respaldo?',
      puntosTitulo: 'No se restauran (' + rechazados.length + '):', puntos: rechazados.slice(0, 6).concat(rechazados.length > 6 ? ['Y ' + (rechazados.length - 6) + ' más.'] : []),
      nota: (yaEstaban ? yaEstaban + ' ya estaban en este teléfono y no se tocan. ' : '') + 'Nada de lo que ya existe se sobreescribe.',
      boton: 'Restaurar', icono: 'palomita' });
    if (!ok) return;
    const origen = typeof datos.usuario_id === 'string' && SRP.validar.ID.test(datos.usuario_id) ? datos.usuario_id : 'cuenta desconocida';
    const fecha = typeof datos.generado === 'string' && !isNaN(Date.parse(datos.generado)) ? SRP.util.formatearFecha(datos.generado) : 'fecha desconocida';
    const detalle = 'Desde el respaldo del ' + fecha + ' (' + origen + ')';
    await SRP.almacen._tx(['jornadas', 'plantaciones', 'bitacora'], 'readwrite', (tx) => {
      nuevos.jornadas.forEach(j => { tx.objectStore('jornadas').put(j); tx.objectStore('bitacora').put(SRP.bitacora.entrada('RESTAURADO', 'jornada', j.id, detalle)); });
      nuevos.plantaciones.forEach(p => { tx.objectStore('plantaciones').put(p); tx.objectStore('bitacora').put(SRP.bitacora.entrada('RESTAURADO', 'plantacion', p.id, detalle)); });
    });
    await SRP.ref.recargar();
    if (SRP.registros.preparar && SRP.app.vista === 'registros') await SRP.registros.preparar();
    await this.refrescar();
    SRP.util.anunciar('Respaldo restaurado: ' + cuantos + (nA + nJ === 1 ? ' nuevo.' : ' nuevos.') +
      (rechazados.length ? ' ' + rechazados.length + (rechazados.length === 1 ? ' no se restauró.' : ' no se restauraron.') : ''));
  }
};

// Acciones que escriben en el teléfono: si fallan, se dice qué no se pudo hacer (D149)
SRP.util.proteger(SRP.conexion, { respaldar: 'guardar el respaldo', restaurar: 'restaurar el respaldo' });
