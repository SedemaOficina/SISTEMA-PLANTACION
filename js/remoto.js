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

  // Todas las páginas de una consulta del servidor
  async todo(ruta) {
    const filas = [];
    let despues = null;
    do {
      const r = await SRP.servidor.pedir('GET', ruta + '?limite=' + this.PAGINA + (despues ? '&despues=' + encodeURIComponent(despues) : ''));
      if (!r.ok) return r;
      filas.push(...r.datos.filas);
      despues = r.datos.siguiente;
    } while (despues);
    return { ok: true, filas };
  },

  // Trae las jornadas y los árboles del alcance de quien entró; dos llamadas seguidas no traen dos veces
  async cargar() {
    if (!this.activo() || !SRP.sesion.usuario || this.estado === 'cargando') return;
    this.cambiar('cargando');
    const j = await this.todo('/jornadas');
    const p = j.ok ? await this.todo('/plantaciones') : j;
    if (!SRP.sesion.usuario) { this.vaciar(); return; }   // cerró sesión mientras llegaba
    if (!j.ok || !p.ok) { this.cambiar((j.ok ? p : j).sinRed ? 'sin-senal' : 'error'); return; }
    this.jornadas = new Map(j.filas.map(f => [f.id, f]));
    this.plantaciones = new Map(p.filas.map(f => [f.id, f]));
    await this.tomarLocales();
    this.cambiar('listo');
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
  }
};
