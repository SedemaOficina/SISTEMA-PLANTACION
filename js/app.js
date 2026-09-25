/* ARRANQUE Y NAVEGACIÓN */
window.SRP = window.SRP || {};

SRP.app = {
  vista: null,
  el(id) { return document.getElementById(id); },

  /* ICONOS DEL SET CDMX EN ACCESO, PESTAÑAS Y ACCIONES (D89). Se ponen aquí, una vez, para que
     el HTML no cargue con trazados y el icono viva en un solo lugar (js/iconos.js). */
  ponerIconos() {
    const I = SRP.ICONOS;
    I.poner(document.querySelector('label[for="acceso-correo"]'), 'correo', 'medio');
    I.poner(document.querySelector('label[for="acceso-clave"]'), 'candado', 'medio');
    I.poner(this.el('form-acceso').querySelector('button[type="submit"]'), 'entrar', 'medio');
    I.poner(this.el('btn-entrar-prueba'), 'entrar', 'medio');
    const pestana = { registrar: 'mas', registros: 'registros', jornadas: 'jornadas', reportes: 'reportes', galeria: 'camara', catalogos: 'catalogos', usuarios: 'usuarios' };
    this.el('navegacion').querySelectorAll('.pestana').forEach(b => I.poner(b, pestana[b.dataset.vista], 'grande'));
    I.poner(this.el('btn-usr-agregar'), 'usuarioMas', 'medio');
    I.poner(this.el('btn-subir'), 'subir', 'grande');
    // Menú de la cuenta con icono en cada opción (D114): el sol y la puerta pedidos por Liber, y el resto por consistencia
    // Cancelar lleva tache y va en rojo de contorno (D116)
    I.poner(this.el('btn-cancelar-edicion'), 'cerrar', 'medio');
    I.poner(this.el('btn-confirmar-no'), 'cerrar', 'medio');
    [['btn-contraste', 'sol'], ['btn-respaldo', 'disco'], ['btn-sin-senal', 'sinSenal'], ['btn-cambiar-perfil', 'usuario'], ['btn-cerrar-sesion', 'salir']]
      .forEach(([id, icono]) => I.poner(this.el(id), icono, 'medio'));
    // Los buscadores llevan la lupa dentro del campo, desde la hoja de estilos (D95)
    // Avisos informativos: el icono va al frente del texto
    document.querySelectorAll('.aviso-simulado').forEach(a => a.insertAdjacentHTML('afterbegin', I.svg('info', 'medio')));
  },

  async iniciar() {
    if (!this.comprobarVersionCompleta()) return;
    SRP.util.redDeSeguridad();     // ningún fallo se queda mudo (D149)
    this.el('version').textContent = SRP.CONFIG.VERSION + ' (' + SRP.CONFIG.ETAPA + ')';
    this.el('banda-ficticio').hidden = !SRP.CONFIG.ES_FICTICIO;
    try {
      await SRP.almacen.abrir();
      let arranque = null;
      if (SRP.CONFIG.ES_FICTICIO) arranque = await SRP.almacen.sembrarSiVacio();
      SRP.almacen.arranque = arranque;   // queda a la vista para diagnosticar y para las pruebas
      await SRP.ref.recargar();
      // Sólo se rehacen los datos de ejemplo cuando no hay nada capturado; si lo hay, se conserva (D149)
      if (arranque === 'resembrado') setTimeout(() => SRP.util.anunciar('Se actualizaron las cuentas y los catálogos de prueba a la versión nueva.', 'aviso'), 400);
      const c = SRP.almacen.conservados;
      if (c && (c.arboles || c.jornadas)) {
        const txt = (c.arboles === 1 ? '1 árbol' : c.arboles + ' árboles') + ' y ' + (c.jornadas === 1 ? '1 jornada' : c.jornadas + ' jornadas');
        setTimeout(() => SRP.util.anunciar('La base del teléfono se actualizó y se conservó todo lo guardado: ' + txt + '.', 'aviso'), 600);
      }
    } catch (err) {
      this.el('principal').innerHTML = '<div class="errores"><h2>No se pudo abrir el almacenamiento del dispositivo</h2>' +
        '<p>' + SRP.util.escapar(err.message) + '. Revise que el navegador no esté en modo privado.</p></div>';
      return;
    }
    SRP.formulario.iniciar();
    if (SRP.espejo) SRP.espejo.iniciar();   // sólo en la versión de prueba; se retira al cerrar la Etapa 1 (D153)
    SRP.registros.iniciar();
    SRP.reportes.iniciar();
    SRP.catalogos.iniciar();
    SRP.usuarios.iniciar();
    SRP.conexion.iniciar();
    SRP.jornadas.iniciar();
    SRP.galeria.iniciar();
    SRP.activa.iniciar();          // la jornada se declara antes de registrar (D119)
    // Contadores de caracteres, y el error de un campo se va en cuanto se corrige (D140)
    SRP.util.iniciarContadores();
    const alCorregir = (e) => { const c = e.target; if (c && c.id && document.getElementById(c.id + '-error')) SRP.util.quitarErrorCampo(c); };
    document.addEventListener('input', alCorregir);
    document.addEventListener('change', alCorregir);
    SRP.envio.iniciar();           // envío simulado: sólo con datos de prueba (D111)
    this.iniciarAcceso();
    this.iniciarDialogos();
    this.iniciarCamposFecha();
    this.iniciarVacios();
    this.iniciarContraste();
    this.sinAutollenado();
    this.iniciarMenusAcciones();
    this.iniciarSubir();
    this.ponerIconos();

    this.el('navegacion').addEventListener('click', async (e) => {
      const b = e.target.closest('.pestana'); if (!b) return;
      // Tocar la pestaña de la sección en que se está sube a su inicio, como en las apps del teléfono (D154)
      if (b.dataset.vista === this.vista) { this.alInicio(true); return; }
      // Un árbol a medias no se pierde en silencio (D133)
      if (this.vista === 'registrar' && b.dataset.vista !== 'registrar' && SRP.formulario.aMedias()) {
        const ok = await this.confirmar({ titulo: 'Descartar el árbol', pregunta: 'El árbol que está capturando no se ha guardado. ¿Descartarlo y salir?',
          puntosTitulo: 'Se pierde lo capturado:', puntos: SRP.formulario.resumenAMedias(), irreversible: true, boton: 'Descartar el árbol', icono: 'basura' });
        if (!ok) return;
        SRP.formulario.limpiar();
      }
      if (SRP.formulario.estado.editando && b.dataset.vista !== 'registrar') SRP.formulario.limpiar();
      this.mostrarVista(b.dataset.vista);
    });

    const u = await SRP.sesion.leer();
    if (u) this.entrar(); else this.mostrarAcceso();
  },

  /* Un navegador que ya abrió una versión anterior puede servir unos archivos de su memoria y
     otros de la red, y esa mezcla no arranca: antes quedaba la pantalla en blanco, sin explicación.
     Se comprueba que las piezas que deben existir estén, y si no, se dice qué hacer. */
  comprobarVersionCompleta() {
    const faltan = [
      ['form-acceso', 'la pantalla de acceso'],
      ['vista-usuarios', 'la pantalla de usuarios'],
      ['vista-reportes', 'la pantalla de reportes'],
      ['franja-guardado', 'la franja de registro guardado'],
      ['revision-lista', 'la ficha de revisión']
      // El espejo de campos no se exige: se retira al cerrar la Etapa 1 y la app debe abrir sin él (D153)
    ].filter(([id]) => !document.getElementById(id)).map(([, que]) => que);
    const modulos = ['util', 'ICONOS', 'permisos', 'sesion', 'almacen', 'ref', 'formulario', 'registros', 'catalogos', 'usuarios', 'ESQUEMA', 'validar', 'derivacion', 'indicadores']
      .filter(m => !SRP[m]);
    /* Las tres capas y la biblioteca del cruce también se exigen (D152): sin ellas la app abría y
       los árboles se guardaban sin alcaldía ni colonia, y con folio EXT-000. La de colonias pesa
       3 MB y es la que más se corta en una primera carga con mala señal. */
    const sinCapas = !modulos.length && !SRP.derivacion.capasCompletas();
    if (!faltan.length && !modulos.length && !sinCapas) return true;
    const mezcla = faltan.length || modulos.length;
    // Nunca se sugiere borrar los datos del sitio: ahí viven los árboles capturados (D149, D152)
    document.body.innerHTML =
      '<main><div class="errores"><h2>' + (mezcla ? 'El navegador guardó una versión incompleta' : 'No se cargaron las capas del territorio') + '</h2>' +
      (mezcla ? '<p>Quedaron mezclados archivos de una versión anterior con los de la actual, y así el sistema no puede abrir.</p>'
        : '<p>Faltan las capas de alcaldías, UGA o colonias. Sin ellas los árboles se guardarían sin alcaldía ni colonia, así que el sistema no abre. Suele pasar cuando la primera descarga se corta por mala señal.</p>') +
      '<p><strong>En la computadora:</strong> mantenga <kbd>Ctrl</kbd> y pulse <kbd>F5</kbd>.<br>' +
      '<strong>En el teléfono:</strong> cierre por completo la pestaña y vuelva a abrir la dirección con buena señal. ' +
      'Si sigue igual, avise a su coordinación antes de borrar nada: los árboles capturados se guardan en este teléfono.</p></div></main>';
    return false;
  },

  /* ---------- Acceso ---------- */
  iniciarAcceso() {
    this.el('form-acceso').addEventListener('submit', (e) => {
      e.preventDefault();
      const correo = this.el('acceso-correo').value.trim();
      const clave = this.el('acceso-clave').value;
      const errores = [];
      if (!correo) errores.push(['acceso-correo', 'Escriba su correo.']);
      if (!clave) errores.push(['acceso-clave', 'Escriba su contraseña.']);
      const caja = this.el('acceso-errores'), campos = ['acceso-correo', 'acceso-clave'];
      if (SRP.util.resumenErrores(caja, errores, campos)) return;   // M15
      const r = SRP.sesion.autenticar(correo);
      if (!r.ok) { SRP.util.resumenErrores(caja, [['acceso-correo', r.motivo]], campos); return; }
      caja.hidden = true;
      this.el('acceso-clave').value = '';
      this.entrar();
    });

    this.el('btn-entrar-prueba').addEventListener('click', () => {
      const u = SRP.ref.usuarioPorId[this.el('sel-usuario-prueba').value];
      if (!u) return;
      SRP.sesion.iniciar(u);
      this.entrar();
    });
    // Cerrar sesión y cambiar de usuario hacen lo mismo por dentro; se separan porque una es
    // del sistema y la otra sólo existe mientras haya datos de prueba.
    const salir = () => {
      SRP.formulario.limpiar();
      SRP.sesion.cerrar();
      this.mostrarAcceso();
    };
    this.el('btn-cerrar-sesion').addEventListener('click', () => { this.menuCuenta(false); salir(); });
    this.el('btn-cambiar-perfil').addEventListener('click', () => { this.menuCuenta(false); salir(); });
    // Menú de la cuenta (D93): abre y cierra con el botón; se cierra al tocar fuera o con Escape
    this.el('btn-cuenta').innerHTML = SRP.ICONOS.svg('usuario', 'grande');
    this.el('btn-cuenta').addEventListener('click', () => this.menuCuenta(this.el('menu-cuenta').hidden));
    document.addEventListener('click', (e) => { if (!e.target.closest('.cuenta')) this.menuCuenta(false); });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !this.el('menu-cuenta').hidden) { this.menuCuenta(false); this.el('btn-cuenta').focus(); }
    });
    // Restablecer es herramienta de prueba (D150): con datos reales no se conecta
    if (SRP.CONFIG.ES_FICTICIO) this.el('btn-restablecer').addEventListener('click', async () => {
      // Lo que se pierde, con números: «todo lo capturado» no dice cuánto (D139)
      const regs = (await SRP.almacen.todos('plantaciones')).filter(r => r.estatus !== 'eliminado').length;
      const jors = (await SRP.almacen.todos('jornadas')).length;
      const cola = SRP.envio.simulado() && SRP.sesion.usuario ? (await SRP.envio.cola()).length : 0;
      const ok = await this.confirmar({ titulo: 'Restablecer los datos de prueba', pregunta: '¿Borrar lo capturado en este dispositivo y volver a los datos de ejemplo?',
        puntosTitulo: 'Qué pasa:', puntos: [
          'Se borran ' + regs + (regs === 1 ? ' registro' : ' registros') + ' y ' + jors + (jors === 1 ? ' jornada' : ' jornadas') + '.',
          cola ? (cola === 1 ? '1 registro no se ha enviado y se perderá.' : cola + ' registros no se han enviado y se perderán.') : '',
          'Se cierra la sesión.'], irreversible: true, boton: 'Restablecer', icono: 'basura' });
      if (!ok) return;
      await SRP.almacen.restablecer();
      await SRP.ref.recargar();
      SRP.formulario.limpiar();
      SRP.sesion.cerrar();
      this.mostrarAcceso();
      SRP.util.anunciar('Datos de prueba restablecidos.');
    });
  },

  /* Menús de acciones de los renglones (D94). Un solo manejador para las tres tablas: la tuerca
     abre su menú (y cierra cualquier otro); el menú se coloca con position:fixed junto a la
     tuerca para que ninguna tabla con desplazamiento lo recorte; elegir una opción, tocar fuera o
     Escape lo cierran; al desplazar, el menú sigue a su tuerca. El clic de la opción lo atiende cada módulo. */
  iniciarMenusAcciones() {
    const cerrar = () => document.querySelectorAll('.menu-acciones:not([hidden])').forEach(m => {
      m.hidden = true; m.previousElementSibling.setAttribute('aria-expanded', 'false');
    });
    // Junto a la tuerca, abajo si cabe y si no arriba, sin salirse de la pantalla
    const colocar = (t, menu) => {
      const r = t.getBoundingClientRect(), m = menu.getBoundingClientRect();
      const abajo = r.bottom + m.height + 8 <= window.innerHeight;
      menu.style.top = (abajo ? r.bottom + 4 : Math.max(8, r.top - m.height - 4)) + 'px';
      menu.style.left = Math.max(8, Math.min(r.right - m.width, window.innerWidth - m.width - 8)) + 'px';
    };
    document.addEventListener('click', (e) => {
      const t = e.target.closest('.btn-tuerca');
      if (t) {
        const menu = t.nextElementSibling; const abrir = menu.hidden;
        cerrar();
        if (abrir) {
          menu.hidden = false; t.setAttribute('aria-expanded', 'true');
          colocar(t, menu);
          const primero = menu.querySelector('.menu-opcion'); if (primero) primero.focus({ preventScroll: true });
        }
        return;
      }
      // Una opción elegida o un clic fuera: el menú se cierra (la opción ya la atendió su módulo)
      cerrar();
    });
    // Al desplazar, el menú sigue a su tuerca en vez de cerrarse: un desplazamiento pequeño del
    // dedo no debe obligar a abrirlo otra vez
    window.addEventListener('scroll', () => {
      const m = document.querySelector('.menu-acciones:not([hidden])');
      if (m) colocar(m.previousElementSibling, m);
    }, true);
    window.addEventListener('resize', cerrar);
    document.addEventListener('keydown', (e) => {
      const abierto = document.querySelector('.menu-acciones:not([hidden])'); if (!abierto) return;
      const ops = [...abierto.querySelectorAll('.menu-opcion')]; const i = ops.indexOf(document.activeElement);
      if (e.key === 'Escape') { const t = abierto.previousElementSibling; cerrar(); t.focus(); }
      else if (e.key === 'ArrowDown') { e.preventDefault(); ops[(i + 1) % ops.length].focus(); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); ops[(i - 1 + ops.length) % ops.length].focus(); }
    });
  },

  menuCuenta(abrir) {
    this.el('menu-cuenta').hidden = !abrir;
    this.el('btn-cuenta').setAttribute('aria-expanded', String(!!abrir));
  },

  mostrarAcceso() {
    this.campoClave(true);
    this.menuCuenta(false);
    this.el('navegacion').hidden = true;
    this.el('encabezado-usuario').hidden = true;
    this.el('herramientas-prueba').hidden = true;
    this.el('franja-envio').hidden = true;
    this.el('form-acceso').reset();
    this.el('acceso-errores').hidden = true;
    SRP.util.erroresEnCampos([], ['acceso-correo', 'acceso-clave']);
    const prueba = this.el('acceso-prueba');
    prueba.hidden = !SRP.CONFIG.ES_FICTICIO;
    if (!prueba.hidden) {
      this.el('sel-usuario-prueba').innerHTML = SRP.util.opciones(null, SRP.ref.usuarios.filter(u => u.activo)
        .map(u => [u.id, SRP.util.nombreCompleto(u) + ' — ' + SRP.permisos.de(u).etiqueta]));   // M15
    }
    this.mostrarVista('acceso');
  },

  entrar() {
    const u = SRP.sesion.usuario;
    const p = SRP.permisos.de(u);
    this.el('usuario-nombre').textContent = SRP.util.nombreCompleto(u);
    this.el('btn-cuenta').setAttribute('aria-label', 'Cuenta: ' + SRP.util.nombreCompleto(u) + ', ' + p.etiqueta + '. Abrir menú');
    this.el('usuario-perfil').textContent = p.etiqueta;
    this.el('encabezado-usuario').hidden = false;
    this.el('btn-cambiar-perfil').hidden = !SRP.CONFIG.ES_FICTICIO;
    this.el('navegacion').hidden = false;
    this.el('herramientas-prueba').hidden = !SRP.CONFIG.ES_FICTICIO;
    this.el('navegacion').querySelector('[data-vista="registrar"]').hidden = !p.registrar;
    this.el('navegacion').querySelector('[data-vista="galeria"]').hidden = !p.galeria;
    this.el('navegacion').querySelector('[data-vista="catalogos"]').hidden = !p.catalogos;
    this.el('navegacion').querySelector('[data-vista="usuarios"]').hidden = !p.usuarios;
    SRP.formulario.limpiar();
    this.campoClave(false);
    // La jornada abierta de quien entra queda activa; se avisa si es de otro día (D119)
    SRP.activa.alEntrar().then(() => { if (this.vista === 'registrar') SRP.activa.preparar(); });
    this.mostrarVista(p.registrar ? 'registrar' : 'registros');
    SRP.conexion.refrescar();
    // Datos de prueba: al entrar se envía lo pendiente y, si no sale, lo dice la franja (D110, D111)
    SRP.envio.alEntrar();   // la pastilla cuenta los registros del alcance de quien entró (D83)
  },

  /* MENOS AUTOLLENADO DE SAFARI (D108). Con un campo de contraseña en la página, Safari trata
     cualquier campo de texto como posible inicio de sesión y pone sobre el teclado la llave, la
     tarjeta y la ubicación. Mientras hay sesión, el campo de contraseña sale de la página y se
     devuelve al volver al acceso. Safari decide al final; esto sólo le quita motivos. */
  campoClave(poner) {
    if (!poner && !this._campoClave) {
      const c = this.el('acceso-clave').closest('.campo');
      this._marcaClave = document.createComment('campo de contraseña fuera mientras hay sesión (D108)');
      c.replaceWith(this._marcaClave);
      this._campoClave = c;
    } else if (poner && this._campoClave) {
      this._marcaClave.replaceWith(this._campoClave);
      this._campoClave = null;
    }
  },

  // Fuera del acceso ningún campo pide autollenado: especies, comentarios y datos de cierre no son de contacto (D108)
  sinAutollenado() {
    document.querySelectorAll('input, textarea, form').forEach(e => {
      if (e.closest('#form-acceso') || e.type === 'file' || e.type === 'hidden') return;
      e.setAttribute('autocomplete', 'off');
    });
  },

  /* ---------- Vistas ---------- */
  mostrarVista(nombre) {
    // Doble candado: una vista sin permiso no se abre aunque se llame directamente
    const u = SRP.sesion.usuario;
    if (u) {
      const p = SRP.permisos.de(u);
      if ((nombre === 'registrar' && !p.registrar) || (nombre === 'catalogos' && !p.catalogos) || (nombre === 'galeria' && !p.galeria) ||
          (nombre === 'usuarios' && !p.usuarios)) nombre = 'registros';
    }
    this.vista = nombre;
    document.querySelectorAll('.vista').forEach(v => { v.hidden = v.id !== 'vista-' + nombre; });
    // Al editar se está dentro de Registros, de donde se llegó: «Nuevo registro» no se marca (D100)
    const marcada = nombre === 'registrar' && SRP.formulario.estado.editando ? (SRP.jornadas.volverAlDetalle ? 'jornadas' : 'registros') : nombre;
    this.el('navegacion').querySelectorAll('.pestana').forEach(b => {
      if (b.dataset.vista === marcada) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current');
    });
    if (nombre === 'registrar') SRP.formulario.preparar();
    if (nombre === 'registros') SRP.registros.preparar();
    if (nombre === 'jornadas') SRP.jornadas.preparar();
    if (nombre === 'galeria') SRP.galeria.preparar();
    if (nombre === 'reportes') SRP.reportes.preparar();
    if (nombre === 'catalogos') SRP.catalogos.preparar();
    if (nombre === 'usuarios') SRP.usuarios.preparar();
    const titulo = this.el('vista-' + nombre).querySelector('h1');
    if (titulo) { titulo.setAttribute('tabindex', '-1'); titulo.focus({ preventScroll: true }); }
    this.alInicio();
  },

  /* CADA PÁGINA EMPIEZA ARRIBA (D154). Al cambiar de sección, o de la lista de jornadas a una ficha
     y de vuelta, la página nueva se ve desde su inicio. En iPhone, si la anterior seguía
     deslizándose por inercia cuando se tocó la pestaña, el salto se perdía y la sección nueva
     aparecía abajo: se corta la inercia un cuadro y el salto se repite cuando ya pintó.
     `suave`: para el botón «Subir al inicio» y la pestaña actual, que suben a la vista. */
  alInicio(suave) {
    const quieto = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (suave) { window.scrollTo({ top: 0, left: 0, behavior: quieto ? 'auto' : 'smooth' }); return; }
    const ir = () => window.scrollTo(0, 0);
    const raiz = document.documentElement;
    raiz.classList.add('sin-inercia');
    ir();
    requestAnimationFrame(() => { raiz.classList.remove('sin-inercia'); ir(); setTimeout(ir, 120); });
  },

  /* BOTÓN «SUBIR AL INICIO» (D154). Aparece al bajar más de tres cuartos de pantalla y se queda en
     la esquina, por encima de la navegación inferior del teléfono y de la barra fija de la sección
     (Guardar en Nuevo registro, «Siguiente» en la jornada), para no tapar sus botones. Al subir, el
     foco va al título de la sección: quien usa teclado o lector queda también al inicio. */
  iniciarSubir() {
    const b = this.el('btn-subir');
    let pendiente = false;
    const colocar = () => {
      pendiente = false;
      const alto = window.innerHeight;
      b.dataset.visible = this.vista && window.scrollY > alto * 0.75 ? 'si' : 'no';
      if (b.dataset.visible === 'no') return;
      // Lo que ya ocupa el pie de la pantalla: la navegación fija del teléfono y, encima, la barra de la sección
      const nav = this.el('navegacion');
      const limite = nav && !nav.hidden && getComputedStyle(nav).position === 'fixed' ? nav.getBoundingClientRect().top : alto;
      let tope = limite;
      document.querySelectorAll('.vista:not([hidden]) .barra-guardar').forEach(barra => {
        if (!barra.offsetParent) return;
        const r = barra.getBoundingClientRect();
        // Toca la franja donde iría el botón (su alto y su margen sobre el límite): el botón sube encima
        if (r.top < tope && r.bottom > limite - 72) tope = r.top;
      });
      b.style.setProperty('--subir-sobre', Math.max(0, alto - tope) + 'px');
    };
    const pedir = () => { if (!pendiente) { pendiente = true; requestAnimationFrame(colocar); } };
    window.addEventListener('scroll', pedir, { passive: true });
    window.addEventListener('resize', pedir);
    // La página también cambia de alto sin desplazarse (un punto eliminado, una lista que se pinta):
    // la barra de la sección se mueve y el botón la sigue
    if ('ResizeObserver' in window) new ResizeObserver(pedir).observe(document.body);
    b.addEventListener('click', () => {
      this.alInicio(true);
      // El primer título visible: en Jornadas puede ser el de la lista o el de la ficha abierta
      const vista = this.vista && this.el('vista-' + this.vista);
      const titulo = vista && [...vista.querySelectorAll('h1, h2')].find(h => h.offsetParent);
      if (titulo) { if (!titulo.hasAttribute('tabindex')) titulo.setAttribute('tabindex', '-1'); titulo.focus({ preventScroll: true }); }
    });
  },

  /* ---------- Diálogos ---------- */
  // En escritorio, tocar cualquier parte de una fecha de filtro abre el calendario, no sólo el
  // cuadrito de la derecha (D95). En teléfono el navegador ya lo hace solo.
  /* TEXTO GUÍA EN FECHAS Y HORAS VACÍAS (D104). Cada <input data-vacio="…"> se envuelve con su
     texto guía, que se ve sólo mientras el campo está vacío. Hay valores que el código pone o
     quita sin evento (limpiar, editar, restaurar filtros): una revisión ligera cada medio segundo
     los alcanza sin tener que avisar desde cada módulo. */
  /* MODO SOL (D106). Sube el contraste para leer a pleno sol: texto negro, contornos oscuros y
     campos blancos con borde. Se recuerda en el dispositivo. Si el teléfono ya pide más contraste
     (ajuste de accesibilidad) y la persona no ha elegido, arranca activado. */
  iniciarContraste() {
    const clave = SRP.CONFIG.CLAVE_CONTRASTE;
    let guardado = null;
    try { guardado = localStorage.getItem(clave); } catch (e) { /* almacenamiento bloqueado */ }
    const pide = window.matchMedia && window.matchMedia('(prefers-contrast: more)').matches;
    const poner = (alto) => {
      if (alto) document.documentElement.dataset.contraste = 'alto';
      else delete document.documentElement.dataset.contraste;
      this.el('btn-contraste').setAttribute('aria-checked', String(alto));
    };
    poner(guardado ? guardado === 'alto' : pide);
    this.el('btn-contraste').addEventListener('click', () => {
      const alto = document.documentElement.dataset.contraste !== 'alto';
      poner(alto);
      try { localStorage.setItem(clave, alto ? 'alto' : 'normal'); } catch (e) { /* sin persistencia */ }
      SRP.util.anunciarSilencioso(alto ? 'Modo sol activado.' : 'Modo sol desactivado.');
    });
  },

  iniciarVacios() {
    const campos = [...document.querySelectorAll('input[data-vacio]')].map(inp => {
      const env = document.createElement('span');
      env.className = 'envoltura-vacio';
      inp.parentNode.insertBefore(env, inp);
      env.appendChild(inp);
      const t = document.createElement('span');
      t.className = 'texto-vacio'; t.setAttribute('aria-hidden', 'true'); t.textContent = inp.dataset.vacio;
      env.appendChild(t);
      const ver = () => { env.dataset.vacio = String(!inp.value); };
      ['input', 'change', 'blur', 'focus'].forEach(ev => inp.addEventListener(ev, ver));
      ver();
      return ver;
    });
    setInterval(() => campos.forEach(ver => ver()), 500);
  },

  iniciarCamposFecha() {
    document.addEventListener('click', (e) => {
      const f = e.target.closest('.zona-filtros input[type="date"]');
      if (f && typeof f.showPicker === 'function') { try { f.showPicker(); } catch (_) { /* sin gesto válido: se queda con el foco */ } }
    });
  },

  iniciarDialogos() {
    // Los botones fijos del HTML reciben aquí su icono, para no repetir el SVG en la página
    // Iconos fijos por significado (D124): disco = guardar, palomita = confirmar/aprobar
    this.el('btn-cat-guardar').innerHTML = SRP.ICONOS.svg('disco') + '<span>Guardar</span>';
    this.el('btn-usr-guardar').innerHTML = SRP.ICONOS.svg('disco') + '<span>Guardar</span>';
    const I = (id, icono, texto, tam) => { const b = this.el(id); if (b) b.innerHTML = SRP.ICONOS.svg(icono, tam || 'medio') + '<span>' + texto + '</span>'; };
    I('btn-cierre-generar', 'ver', 'Ver vista previa', 'medio');
    I('btn-previa-corregir', 'lapiz', 'Corregir datos de cierre');
    I('btn-enviar-ahora', 'senal', 'Enviar ahora');
    I('btn-franja-enviar', 'senal', 'Enviar ahora');
    I('btn-filtrar', 'buscar', 'Aplicar');
    I('btn-reiniciar-filtros', 'cerrar', 'Quitar filtros', 'chico');   // un nombre por acción (D153)
    I('btn-coord-aplicar', 'ubicacion', 'Colocar punto');
    I('btn-cambiar-nueva', 'mas', 'Iniciar otra jornada');
    // Toda × de cabecera cierra su propio diálogo (D91); cada módulo reacciona al evento «close» si lo necesita
    document.querySelectorAll('.dialogo-cerrar').forEach(b => {
      b.innerHTML = SRP.ICONOS.svg('cerrar', 'grande');
      b.addEventListener('click', () => { const d = b.closest('dialog'); if (d) d.close(); });
    });
    this.el('btn-confirmar-si').addEventListener('click', () => this.el('dlg-confirmar').close('si'));
    this.el('btn-confirmar-no').addEventListener('click', () => this.el('dlg-confirmar').close('no'));
  },

  /* CONFIRMAR (D139). La confirmación queda para lo que no se deshace —eliminar una jornada, una
     cuenta o un valor del catálogo, restablecer los datos, descartar un árbol sin guardar— y para
     decisiones con consecuencias que conviene ver antes (cerrar con pendientes, guardar en una
     jornada de otro día). Lo reversible se hace de una vez y ofrece «Deshacer» (D101): así, que
     aparezca este diálogo vuelve a significar algo.
     Forma estructurada: { titulo, pregunta, puntosTitulo, puntos: [], nota, irreversible, boton,
     icono }. La corta (texto, textoBoton, icono) sirve para una pregunta simple.
     icono: 'basura' elimina (rojo), 'palomita' confirma (verde), 'candado' cierra (acento). */
  confirmar(texto, textoBoton, icono) {
    const o = typeof texto === 'object' ? texto : { pregunta: texto, boton: textoBoton, icono };
    const poner = (id, t) => { const e = this.el(id); e.textContent = t || ''; e.hidden = !t; };
    return new Promise((resolver) => {
      const dlg = this.el('dlg-confirmar');
      poner('dlg-confirmar-titulo', o.titulo);
      dlg.setAttribute('aria-labelledby', o.titulo ? 'dlg-confirmar-titulo dlg-confirmar-texto' : 'dlg-confirmar-texto');
      this.el('dlg-confirmar-texto').textContent = o.pregunta || '';
      const puntos = (o.puntos || []).filter(Boolean);
      const ul = this.el('dlg-confirmar-puntos');
      ul.hidden = !puntos.length;
      ul.innerHTML = puntos.map(t => '<li>' + SRP.util.escapar(t) + '</li>').join('');
      poner('dlg-confirmar-puntos-titulo', puntos.length ? o.puntosTitulo : '');
      // Lo irreversible lo dice al final, en rojo y con su icono; si no, la nota va en gris
      const nota = this.el('dlg-confirmar-nota');
      const textoNota = o.nota || (o.irreversible ? 'No se puede deshacer.' : '');
      nota.hidden = !textoNota;
      nota.dataset.tono = o.irreversible ? 'alerta' : '';
      nota.innerHTML = textoNota ? (o.irreversible ? SRP.ICONOS.svg('info', 'medio') : '') + '<span>' + SRP.util.escapar(textoNota) + '</span>' : '';
      const b = this.el('btn-confirmar-si');
      b.innerHTML = SRP.ICONOS.svg(o.icono || 'basura') + '<span>' + SRP.util.escapar(o.boton) + '</span>';
      // Color por significado (Norma 8.4): confirmar verde, cerrar en acento, eliminar rojo
      b.className = 'btn ' + (o.icono === 'palomita' ? 'btn-exito' : o.icono === 'candado' ? 'btn-primario' : 'btn-peligro');
      dlg.returnValue = '';
      dlg.addEventListener('close', () => resolver(dlg.returnValue === 'si'), { once: true });
      dlg.showModal();
      this.el('btn-confirmar-no').focus();
    });
  }
};

document.addEventListener('DOMContentLoaded', () => SRP.app.iniciar());
