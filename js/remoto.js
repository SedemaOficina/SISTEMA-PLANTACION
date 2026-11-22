/* LO QUE VIENE DEL SERVIDOR. Sólo con datos reales; con datos de prueba nada de esto corre.

   QUÉ SE QUEDA EN EL TELÉFONO Y QUÉ NO (S-11). En el teléfono: los catálogos, las cuentas que ve cada quien
   (sin correo, salvo la Administración global) y los parámetros, para trabajar sin señal, además de lo que aún
   no se envía. Lo ya enviado —jornadas y árboles del alcance de cada quien— vive en el servidor: se trae al
   entrar o al abrir con señal y se tiene sólo en memoria mientras la aplicación está abierta. Al cerrarla o al
   cerrar sesión no queda nada, y un teléfono perdido no expone el historial.

   CÓMO SE VE. El almacén (js/almacen.js) entrega lo enviado junto con lo del teléfono; si un registro está en
   los dos lados, manda el del teléfono, que lleva lo que aún no se envía. Mientras no se tiene lo enviado:
     · Registros y Jornadas enseñan sólo lo del teléfono, con una franja que dice por qué, y el total dice
       «en este teléfono», o «Trayendo lo enviado del servidor…» mientras llega;
     · Supervisión (Mi avance, para el cabo) y Fotografías, que se arman con lo enviado, enseñan sólo un aviso. */
window.SRP = window.SRP || {};

SRP.remoto = {
  // sin-cargar · cargando · listo · sin-senal (no hubo respuesta) · error (el servidor no lo dio)
  estado: 'sin-cargar',
  jornadas: new Map(),
  plantaciones: new Map(),
  PAGINA: 2000,
  CLAVE_PARAMETROS: 'srp_parametros',

  activo() { return !!SRP.sesion && SRP.sesion.delServidor(); },
  listo() { return !this.activo() || this.estado === 'listo'; },

  /* ---------- Lo que se queda en el teléfono ---------- */

  // Los seis catálogos, completos: lo que manda el servidor reemplaza lo que había
  async bajarCatalogos() {
    const r = await SRP.servidor.pedir('GET', '/catalogos');
    if (!r.ok) return { ok: false, mensaje: r.sinRed ? 'No se pudieron bajar los catálogos: falta conexión con el servidor. Intente de nuevo.' : r.mensaje };
    /* Sólo se reemplazan si cada catálogo llega como lista, con especies, programas e instituciones: una respuesta
       vacía o dañada no borra lo que el teléfono tiene. Sin catálogos de antes, no se puede entrar */
    const tablas = SRP.almacen.TABLAS_CATALOGO, d = r.datos;
    const bien = !!d && typeof d === 'object' && tablas.every(t => Array.isArray(d[t])) && ['especies', 'programas', 'instituciones'].every(t => d[t].length);
    if (!bien) {
      if (!(await SRP.almacen.todos('instituciones')).length) {
        return { ok: false, general: true, mensaje: 'El servidor respondió algo que no se entiende al bajar las listas de especies, programas y vehículos. Intente de nuevo en unos minutos.' };
      }
      setTimeout(() => SRP.util.anunciar('No se pudieron poner al día las listas de especies, programas y vehículos. Se conservan las que ya tenía; se intentará otra vez al volver a entrar.', 'aviso'), 600);
      return { ok: true, conservados: true };
    }
    await SRP.almacen.reemplazar(Object.fromEntries(tablas.map(t => [t, d[t]])));
    return { ok: true };
  },

  // Las cuentas que ve quien entró, para decir quién registró qué; la suya siempre viene
  async bajarCuentas() {
    const r = await SRP.servidor.pedir('GET', '/cuentas');
    if (!r.ok) return { ok: false };
    await SRP.almacen.reemplazar({ usuarios: r.datos.filas || [] });
    return { ok: true };
  },

  // Los parámetros valen para todos los teléfonos: se guardan para abrir sin señal con los últimos
  async bajarParametros() {
    const r = await SRP.servidor.pedir('GET', '/parametros');
    if (!r.ok) return { ok: false };
    const valores = Object.fromEntries((r.datos || []).map(p => [p.clave, p.valor]));
    try { localStorage.setItem(this.CLAVE_PARAMETROS, JSON.stringify(valores)); } catch (e) { /* valen mientras la página siga abierta */ }
    this.aplicarParametros(valores);
    return { ok: true };
  },

  // «JORNADA.DUPLICADO_M» es SRP.CONFIG.JORNADA.DUPLICADO_M. Sólo números, y sólo los que ya existen
  aplicarParametros(valores) {
    Object.entries(valores || {}).forEach(([clave, valor]) => {
      const partes = clave.split('.'), ultimo = partes.pop();
      const o = partes.reduce((x, k) => (x && typeof x[k] === 'object' ? x[k] : null), SRP.CONFIG);
      if (o && typeof o[ultimo] === 'number' && typeof valor === 'number' && Number.isFinite(valor)) o[ultimo] = valor;
    });
  },

  aplicarParametrosGuardados() {
    if (!this.activo()) return;
    try { this.aplicarParametros(JSON.parse(localStorage.getItem(this.CLAVE_PARAMETROS) || '{}')); } catch (e) { /* sin guardados: los de arranque */ }
  },

  /* ---------- Lo enviado, en memoria ---------- */

  /* Todas las páginas de una consulta del servidor. `cambios`: la marca de la vez anterior, para traer sólo lo que
     cambió desde entonces. De la primera página se toman la marca para la vez siguiente y, con `cambios`, las
     jornadas eliminadas y si hay que traer todo (servidor/src/modulos/srp/consultas.ts) */
  async todo(ruta, cambios) {
    const filas = [], extra = cambios ? '&cambios=' + encodeURIComponent(cambios) : '';
    let despues = null, primera = null;
    do {
      const r = await SRP.servidor.pedir('GET', ruta + '?limite=' + this.PAGINA + extra + (despues ? '&despues=' + encodeURIComponent(despues) : ''));
      if (!r.ok) return r;
      primera = primera || r.datos;
      filas.push(...r.datos.filas);
      despues = r.datos.siguiente;
    } while (despues);
    return { ok: true, filas, marca: primera.marca || null, eliminadas: primera.eliminadas || [], completo: !!primera.completo };
  },

  /* Trae las jornadas y los árboles del alcance de quien entró; dos llamadas seguidas no traen dos veces. `silencioso`,
     con lo enviado ya a la vista: lo de antes se sigue viendo mientras llega y, si no llega, se queda */
  async cargar(o = {}) {
    if (!this.activo() || !SRP.sesion.usuario || this.estado === 'cargando' || this.buscando) return;
    const silencioso = !!o.silencioso && this.estado === 'listo';
    if (silencioso) { this.buscando = true; this.pintarAlDia(); } else this.cambiar('cargando');
    const j = await this.todo('/jornadas');
    const p = j.ok ? await this.todo('/plantaciones') : j;
    this.buscando = false;
    if (!SRP.sesion.usuario) { this.vaciar(); return; }   // cerró sesión mientras llegaba
    if (!j.ok || !p.ok) {
      if (silencioso) { this.fallo = true; this.pintarAlDia(); return; }
      this.cambiar((j.ok ? p : j).sinRed ? 'sin-senal' : 'error'); return;
    }
    this.jornadas = new Map(j.filas.map(f => [f.id, f]));
    this.plantaciones = new Map(p.filas.map(f => [f.id, f]));
    this.puestoAlDia(j.marca);
    await this.tomarLocales();
    if (silencioso) await this.llegoLoNuevo(); else this.cambiar('listo');
  },

  /* ---------- Lo enviado, al día ----------
     Mientras la aplicación está abierta, lo que hacen los demás llega solo: cada ACTUALIZAR_MS para quien registra o
     coordina, al volver a la aplicación para todos y al tocar «Actualizar». Se pide sólo lo que cambió desde la vez
     anterior, con la marca que dio el servidor: unos cuantos bytes si no hay nada nuevo. La Administración y la
     Dirección ven todo, y para ellas no corre el reloj: al volver y con el botón. */
  marca: null,        // la del servidor, para la siguiente vez (null: el servidor no la da, o todavía no se trae nada)
  alDiaEn: null,      // cuándo se trajo lo nuevo por última vez, para decirlo
  buscando: false,
  fallo: false,       // la última vez no hubo respuesta: lo de los demás se ve hasta alDiaEn
  repintarPendiente: false,
  MARCA_VIEJA_MS: 6 * 3600000,   // una marca de hace más se deja: se trae todo
  VOLVER_MS: 30000,              // al volver a la aplicación se busca lo nuevo si pasó al menos esto

  puestoAlDia(marca) {
    this.marca = marca || null;
    this.alDiaEn = SRP.util.ahoraISO();
    this.fallo = false;
  },

  // El reloj corre para quien ve lo suyo o lo de su institución; quien ve todo, al volver y con el botón
  automatico() {
    const u = SRP.sesion.usuario;
    return !!u && ['propios', 'institucion'].includes(SRP.permisos.de(u).alcance);
  },

  /* Lo que cambió desde la última vez. `motivo`: 'reloj', 'volver', 'senal' o 'boton'. Sin marca —un servidor que no
     la da— sólo el botón y la vuelta traen todo; con una marca muy vieja, también se trae todo */
  async novedades(motivo) {
    if (!this.activo() || !SRP.sesion.usuario || this.estado !== 'listo' || this.buscando) return;
    if (!this.marca || Date.now() - Date.parse(this.marca) > this.MARCA_VIEJA_MS) {
      if (motivo === 'reloj' && !this.marca) return;
      await this.cargar({ silencioso: true });
      if (motivo === 'boton') this.decirResultado(true);
      return;
    }
    this.buscando = true; this.pintarAlDia();
    const j = await this.todo('/jornadas', this.marca);
    const p = j.ok ? await this.todo('/plantaciones', this.marca) : j;
    this.buscando = false;
    if (!SRP.sesion.usuario) return;
    if (!j.ok || !p.ok) {
      this.fallo = true; this.pintarAlDia();
      if (motivo === 'boton') SRP.util.anunciar(j.sinRed || p.sinRed ? 'Sin señal: no se pudo buscar lo nuevo. Se intentará otra vez.' : 'El servidor no respondió. Intente en unos minutos.', 'aviso');
      return;
    }
    // Una carga masiva que se completó o se deshizo no anota cada árbol: se trae todo
    if (j.completo) { this.buscando = false; this.marca = null; await this.cargar({ silencioso: true }); if (motivo === 'boton') this.decirResultado(true); return; }
    // Lo del último minuto llega dos veces (la marca se adelanta un minuto): cuenta como nuevo sólo lo que es distinto
    const distinta = (mapa, f) => { const a = mapa.get(f.id); return !a || JSON.stringify(a) !== JSON.stringify(f); };
    const jornadas = j.filas.filter(f => distinta(this.jornadas, f)), arboles = p.filas.filter(f => distinta(this.plantaciones, f));
    const eliminadas = j.eliminadas.filter(id => this.jornadas.has(id));
    const nuevas = jornadas.length + arboles.length + eliminadas.length;
    jornadas.forEach(f => this.jornadas.set(f.id, f));
    eliminadas.forEach(id => this.jornadas.delete(id));
    arboles.forEach(f => this.plantaciones.set(f.id, f));
    this.puestoAlDia(j.marca || this.marca);
    if (nuevas) {
      await this.tomarLocales(jornadas.map(f => f.id));
      await this.llegoLoNuevo();
    } else {
      this.pintarAlDia();
      if (this.repintarPendiente) await this.repintar();
    }
    if (motivo === 'boton') this.decirResultado(nuevas > 0);
  },

  decirResultado(hubo) { SRP.util.anunciar(hubo ? 'Al día: ya se ve lo nuevo.' : 'Al día: no hay nada nuevo.', 'exito'); },

  // Con lo que llegó: los avisos de relevo y de jornada compartida, y lo que se ve vuelve a pintarse
  async llegoLoNuevo() {
    this.pintarAlDia();
    if (SRP.sesion.usuario && SRP.activa) await SRP.activa.alLlegarLoEnviado();
    await this.repintar();
  },

  /* Jornadas y Registros vuelven a pintarse sin mover a quien los usa: en la misma página, con la ficha abierta si lo
     estaba. Con una ventana abierta, esperan a la siguiente vez. Supervisión y Fotografías se arman al abrirlas */
  async repintar() {
    const v = SRP.app && SRP.app.vista;
    if (!['jornadas', 'registros'].includes(v)) { this.repintarPendiente = false; return; }
    if (document.querySelector('dialog[open]')) { this.repintarPendiente = true; return; }
    this.repintarPendiente = false;
    if (v === 'jornadas') await SRP.jornadas.conLoNuevo();
    else await SRP.registros.preparar();
  },

  vigilar() {
    setInterval(() => { if (!document.hidden && this.automatico()) this.novedades('reloj'); }, SRP.CONFIG.ACTUALIZAR_MS);
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden && this.alDiaEn && Date.now() - Date.parse(this.alDiaEn) > this.VOLVER_MS) this.novedades('volver');
    });
    window.addEventListener('online', () => { if (this.fallo) this.novedades('senal'); });
    document.querySelectorAll('.al-dia-boton').forEach(b => b.addEventListener('click', () => this.novedades('boton')));
  },

  // La franja de Registros y Jornadas: a qué hora se trajo lo de los demás, y «Actualizar»
  pintarAlDia() {
    const ver = this.activo() && !!SRP.sesion.usuario && this.estado === 'listo' && !!this.alDiaEn;
    const estado = this.buscando ? 'buscando' : this.fallo ? 'sin-senal' : 'al-dia';
    const hora = this.alDiaEn ? SRP.envio.hora(this.alDiaEn) : '';
    const icono = { buscando: 'regenerar', 'sin-senal': 'sinSenal', 'al-dia': 'reloj' }[estado];
    const texto = { buscando: 'Buscando lo nuevo…', 'sin-senal': 'Sin señal: lo de los demás, hasta las ' + hora, 'al-dia': 'Al día a las ' + hora }[estado];
    document.querySelectorAll('.al-dia').forEach(caja => {
      caja.hidden = !ver;
      if (!ver) return;
      caja.dataset.estado = estado;
      caja.querySelector('.al-dia-texto').innerHTML = SRP.ICONOS.svg(icono, 'chico') + '<span>' + SRP.util.escapar(texto) + '</span>';
      const b = caja.querySelector('.al-dia-boton');
      b.innerHTML = SRP.ICONOS.svg('regenerar', 'chico') + '<span>Actualizar</span>';
      b.disabled = this.buscando;
    });
  },

  /* Una jornada que el teléfono guarda y que nada suyo espera envío toma la del servidor: otros pudieron cambiarla
     —un relevo, los cabos de apoyo que terminaron su parte— y la del teléfono no lo sabría. */
  async tomarLocales(ids) {
    for (const local of await SRP.almacen.todosLocales('jornadas')) {
      const f = this.jornadas.get(local.id);
      if (f && (!ids || ids.includes(local.id)) && !SRP.cola.de(local.id).length) await SRP.almacen.ponerLocal('jornadas', f);
    }
    /* La jornada abierta donde registra sin ser su titular —cabo de apoyo vigente o cabo del relevo— se guarda en el
       teléfono: si la aplicación se cierra sin señal, sigue en Nuevo registro. Sólo la jornada, sin los árboles de los
       demás; js/cola.js limpiar() la suelta cuando ya no registra en ella */
    const u = SRP.sesion.usuario;
    if (!u) return;
    for (const f of this.jornadas.values()) {
      if (ids && !ids.includes(f.id)) continue;
      if (f.estatus !== 'abierta' || f.cabo_id === u.id || !(f.relevo_id === u.id || SRP.permisos.apoyoVigente(f, u.id))) continue;
      if (!(await SRP.almacen.unoLocal('jornadas', f.id))) await SRP.almacen.ponerLocal('jornadas', f);
    }
  },

  /* Una jornada al día, sin traer todo: ella y los árboles que se ven de ella (GET /jornadas/:id). La Coordinación la
     pide al abrir la ficha de una jornada compartida y al cerrarla. Devuelve la jornada como queda, o null si no se
     pudo. */
  async alDia(id) {
    if (!this.activo() || !SRP.conexion.enLinea()) return null;
    const r = await SRP.servidor.pedir('GET', '/jornadas/' + encodeURIComponent(id));
    if (!r.ok || !r.datos || !r.datos.jornada) return null;
    this.jornadas.set(id, r.datos.jornada);
    (r.datos.plantaciones || []).forEach(f => this.plantaciones.set(f.id, f));
    await this.tomarLocales([id]);
    return SRP.almacen.uno('jornadas', id);
  },

  // Al cerrar sesión no queda nada de lo enviado
  vaciar() {
    this.jornadas = new Map();
    this.plantaciones = new Map();
    this.estado = 'sin-cargar';
    Object.assign(this, { marca: null, alDiaEn: null, buscando: false, fallo: false, repintarPendiente: false });
    this.pintar();
  },

  // Lo enviado debajo de lo del teléfono, que manda; `filtro` dice cuáles del servidor van
  mezclar(almacen, locales, filtro) {
    const m = this[almacen];
    if (!(m instanceof Map) || !m.size) return locales;
    const ids = new Set(locales.map(x => x.id));
    return locales.concat([...m.values()].filter(f => !ids.has(f.id) && (!filtro || filtro(f))));
  },

  uno(almacen, id) {
    const m = this[almacen];
    return m instanceof Map ? m.get(id) : undefined;
  },

  /* ---------- Lo que se ve ---------- */

  cambiar(estado) {
    this.estado = estado;
    this.pintar();
    // Una jornada que vive en el servidor —compartida o recibida en relevo— se toma y se avisa al llegar
    if (estado === 'listo' && SRP.sesion.usuario && SRP.activa) SRP.activa.alLlegarLoEnviado();
    // Lo que se ve se vuelve a pintar con lo que llegó o con lo que falta
    const v = SRP.app && SRP.app.vista;
    if (SRP.sesion.usuario && ['registros', 'jornadas', 'supervision', 'galeria'].includes(v)) SRP.app.mostrarVista(v, true);
  },

  // El total de una lista, según lo que se tiene de lo enviado
  total(texto) {
    if (!this.activo() || this.estado === 'listo') return texto;
    if (this.estado === 'cargando' || this.estado === 'sin-cargar') return 'Trayendo lo enviado del servidor…';
    return texto ? texto + ' en este teléfono' : '';
  },

  // Las franjas de Registros y Jornadas, y el aviso de Supervisión y Fotografías
  pintar() {
    const falta = this.activo() && !!SRP.sesion.usuario && (this.estado === 'sin-senal' || this.estado === 'error');
    const cargando = this.activo() && !!SRP.sesion.usuario && (this.estado === 'cargando' || this.estado === 'sin-cargar');
    const sinSenal = this.estado === 'sin-senal';
    document.querySelectorAll('.franja-remoto').forEach(f => {
      f.hidden = !falta;
      if (!falta) return;
      f.querySelector('.franja-remoto-rotulo').textContent = sinSenal ? 'Sin señal' : 'No se pudo traer lo enviado';
      f.querySelector('.franja-remoto-texto').textContent = sinSenal
        ? 'Sólo puede ver y corregir lo que aún no se envía. Lo ya enviado aparece cuando vuelve la señal.'
        : 'No se pudo traer lo enviado del servidor; inténtelo más tarde. Mientras, sólo puede ver y corregir lo que aún no se envía.';
    });
    const cabo = SRP.sesion.usuario && SRP.permisos.de(SRP.sesion.usuario).alcance === 'propios';
    [['supervision', cabo ? 'Mi avance se arma con lo que ya envió, y eso vive en el servidor. Vuelva a abrirlo cuando tenga señal. Lo de hoy que aún no se envía está en Mis registros.'
      : 'Supervisión se arma con lo enviado, y eso vive en el servidor. Vuelva a abrirla cuando tenga señal.'],
     ['galeria', 'Las fotografías de lo enviado viven en el servidor. Vuelva a abrir Fotografías cuando tenga señal.']].forEach(([vista, texto]) => {
      const v = document.getElementById('vista-' + vista), aviso = document.getElementById(vista + '-remoto');
      if (!v || !aviso) return;
      v.classList.toggle('vista-sin-remoto', falta || cargando);
      aviso.hidden = !(falta || cargando);
      if (aviso.hidden) return;
      aviso.querySelector('.vacio-icono').innerHTML = SRP.ICONOS.svg(cargando ? 'reloj' : sinSenal ? 'sinSenal' : 'info', 'grande');
      aviso.querySelector('.vacio-titulo').textContent = cargando ? 'Trayendo lo enviado del servidor…' : sinSenal ? 'Sin señal' : 'No se pudo traer lo enviado';
      aviso.querySelector('.vacio-texto').textContent = cargando ? '' : sinSenal ? texto : 'El servidor no respondió. Inténtelo más tarde.';
    });
    this.pintarAlDia();
  }
};
