/* ARRANQUE Y NAVEGACIÓN */
window.SRP = window.SRP || {};

SRP.app = {
  vista: null,
  el(id) { return document.getElementById(id); },

  /* ICONOS DEL SET CDMX EN ACCESO, PESTAÑAS Y ACCIONES (D89). Se ponen aquí, una vez, para que
     el HTML no cargue con trazados y el icono viva en un solo lugar (js/iconos.js). */
  ponerIconos() {
    const I = SRP.ICONOS;
    I.poner(document.querySelector('label[for="acceso-correo"]'), 'correo', 18);
    I.poner(document.querySelector('label[for="acceso-clave"]'), 'candado', 18);
    I.poner(this.el('form-acceso').querySelector('button[type="submit"]'), 'entrar', 20);
    I.poner(this.el('btn-entrar-prueba'), 'entrar', 20);
    const pestana = { registrar: 'mas', registros: 'registros', reportes: 'reportes', catalogos: 'catalogos', usuarios: 'usuarios' };
    this.el('navegacion').querySelectorAll('.pestana').forEach(b => I.poner(b, pestana[b.dataset.vista], 22));
    I.poner(this.el('btn-usr-agregar'), 'usuarioMas', 20);
    // Los buscadores llevan la lupa dentro del campo, desde la hoja de estilos (D95)
    // Avisos informativos: el icono va al frente del texto
    document.querySelectorAll('.aviso-simulado').forEach(a => a.insertAdjacentHTML('afterbegin', I.svg('info', 18)));
  },

  async iniciar() {
    if (!this.comprobarVersionCompleta()) return;
    this.el('version').textContent = SRP.CONFIG.VERSION + ' (' + SRP.CONFIG.ETAPA + ')';
    this.el('banda-ficticio').hidden = !SRP.CONFIG.ES_FICTICIO;
    try {
      await SRP.almacen.abrir();
      let resembrado = false;
      if (SRP.CONFIG.ES_FICTICIO) resembrado = await SRP.almacen.sembrarSiVacio();
      await SRP.ref.recargar();
      if (resembrado) setTimeout(() => SRP.util.anunciar('Los datos de prueba se actualizaron a la versión nueva.'), 400);
    } catch (err) {
      this.el('principal').innerHTML = '<div class="errores"><h2>No se pudo abrir el almacenamiento del dispositivo</h2>' +
        '<p>' + SRP.util.escapar(err.message) + '. Revise que el navegador no esté en modo privado.</p></div>';
      return;
    }
    SRP.formulario.iniciar();
    SRP.espejo.iniciar();          // sólo en la versión de prueba; se elimina al cerrar la Etapa 1
    SRP.registros.iniciar();
    SRP.reportes.iniciar();
    SRP.catalogos.iniciar();
    SRP.usuarios.iniciar();
    SRP.conexion.iniciar();
    SRP.envio.iniciar();           // envío simulado: sólo con datos de prueba (D111)
    this.iniciarAcceso();
    this.iniciarDialogos();
    this.iniciarCamposFecha();
    this.iniciarVacios();
    this.iniciarContraste();
    this.sinAutollenado();
    this.iniciarMenusAcciones();
    this.ponerIconos();

    this.el('navegacion').addEventListener('click', (e) => {
      const b = e.target.closest('.pestana'); if (!b) return;
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
      ['dlg-guardado', 'el aviso de registro guardado'],
      ['revision-lista', 'la ficha de revisión'],
      ['espejo-campos', 'el espejo de campos de prueba']
    ].filter(([id]) => !document.getElementById(id)).map(([, que]) => que);
    const modulos = ['util', 'ICONOS', 'permisos', 'sesion', 'almacen', 'ref', 'formulario', 'espejo', 'registros', 'catalogos', 'usuarios']
      .filter(m => !SRP[m]);
    if (!faltan.length && !modulos.length) return true;
    document.body.innerHTML =
      '<main><div class="errores"><h2>El navegador guardó una versión incompleta</h2>' +
      '<p>Quedaron mezclados archivos de una versión anterior con los de la actual, y así el sistema no puede abrir.</p>' +
      '<p><strong>En la computadora:</strong> mantenga <kbd>Ctrl</kbd> y pulse <kbd>F5</kbd>.<br>' +
      '<strong>En el teléfono:</strong> cierre por completo la pestaña y vuelva a abrir la dirección; ' +
      'si sigue igual, borre los datos de este sitio en los ajustes del navegador.</p></div></main>';
    return false;
  },

  /* ---------- Acceso ---------- */
  iniciarAcceso() {
    this.el('form-acceso').addEventListener('submit', (e) => {
      e.preventDefault();
      const correo = this.el('acceso-correo').value.trim();
      const clave = this.el('acceso-clave').value;
      const errores = [];
      if (!correo) errores.push('<li><a href="#acceso-correo">Escriba su correo.</a></li>');
      if (!clave) errores.push('<li><a href="#acceso-clave">Escriba su contraseña.</a></li>');
      this.el('acceso-correo').toggleAttribute('aria-invalid', !correo);
      this.el('acceso-clave').toggleAttribute('aria-invalid', !clave);
      const caja = this.el('acceso-errores');
      if (errores.length) { caja.innerHTML = '<ul>' + errores.join('') + '</ul>'; caja.hidden = false; caja.focus(); return; }

      const r = SRP.sesion.autenticar(correo);
      if (!r.ok) {
        this.el('acceso-correo').setAttribute('aria-invalid', 'true');
        caja.innerHTML = '<ul><li>' + SRP.util.escapar(r.motivo) + '</li></ul>';
        caja.hidden = false; caja.focus();
        return;
      }
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
    this.el('btn-cuenta').innerHTML = SRP.ICONOS.svg('usuario', 22);
    this.el('btn-cuenta').addEventListener('click', () => this.menuCuenta(this.el('menu-cuenta').hidden));
    document.addEventListener('click', (e) => { if (!e.target.closest('.cuenta')) this.menuCuenta(false); });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !this.el('menu-cuenta').hidden) { this.menuCuenta(false); this.el('btn-cuenta').focus(); }
    });
    this.el('btn-restablecer').addEventListener('click', async () => {
      const ok = await this.confirmar('¿Restablecer los datos de prueba? Se pierde todo lo capturado en este dispositivo.', 'Restablecer');
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
    ['acceso-correo', 'acceso-clave'].forEach(id => this.el(id).removeAttribute('aria-invalid'));
    const prueba = this.el('acceso-prueba');
    prueba.hidden = !SRP.CONFIG.ES_FICTICIO;
    if (!prueba.hidden) {
      this.el('sel-usuario-prueba').innerHTML = SRP.ref.usuarios.filter(u => u.activo).map(u =>
        '<option value="' + u.id + '">' + SRP.util.escapar(SRP.util.nombreCompleto(u)) + ' — ' + SRP.permisos.de(u).etiqueta + '</option>').join('');
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
    this.el('navegacion').querySelector('[data-vista="catalogos"]').hidden = !p.catalogos;
    this.el('navegacion').querySelector('[data-vista="usuarios"]').hidden = !p.usuarios;
    SRP.formulario.limpiar();
    this.campoClave(false);
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
      if ((nombre === 'registrar' && !p.registrar) || (nombre === 'catalogos' && !p.catalogos) ||
          (nombre === 'usuarios' && !p.usuarios)) nombre = 'registros';
    }
    this.vista = nombre;
    document.querySelectorAll('.vista').forEach(v => { v.hidden = v.id !== 'vista-' + nombre; });
    // Al editar se está dentro de Registros, de donde se llegó: «Nuevo registro» no se marca (D100)
    const marcada = nombre === 'registrar' && SRP.formulario.estado.editando ? 'registros' : nombre;
    this.el('navegacion').querySelectorAll('.pestana').forEach(b => {
      if (b.dataset.vista === marcada) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current');
    });
    if (nombre === 'registrar') SRP.formulario.preparar();
    if (nombre === 'registros') SRP.registros.preparar();
    if (nombre === 'reportes') SRP.reportes.preparar();
    if (nombre === 'catalogos') SRP.catalogos.preparar();
    if (nombre === 'usuarios') SRP.usuarios.preparar();
    const titulo = this.el('vista-' + nombre).querySelector('h1');
    if (titulo) { titulo.setAttribute('tabindex', '-1'); titulo.focus({ preventScroll: true }); }
    window.scrollTo(0, 0);
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
    this.el('btn-cat-guardar').innerHTML = SRP.ICONOS.svg('palomita') + '<span>Guardar</span>';
    this.el('btn-usr-guardar').innerHTML = SRP.ICONOS.svg('palomita') + '<span>Guardar</span>';
    // Toda × de cabecera cierra su propio diálogo (D91); cada módulo reacciona al evento «close» si lo necesita
    document.querySelectorAll('.dialogo-cerrar').forEach(b => {
      b.innerHTML = SRP.ICONOS.svg('cerrar', 22);
      b.addEventListener('click', () => b.closest('dialog').close());
    });
    this.el('btn-confirmar-si').addEventListener('click', () => this.el('dlg-confirmar').close('si'));
    this.el('btn-confirmar-no').addEventListener('click', () => this.el('dlg-confirmar').close('no'));
  },

  // icono: 'basura' para lo que se elimina, 'palomita' para lo que sólo se confirma
  confirmar(texto, textoBoton, icono) {
    return new Promise((resolver) => {
      const dlg = this.el('dlg-confirmar');
      this.el('dlg-confirmar-texto').textContent = texto;
      const b = this.el('btn-confirmar-si');
      b.innerHTML = SRP.ICONOS.svg(icono || 'basura') + '<span>' + SRP.util.escapar(textoBoton) + '</span>';
      b.className = 'btn ' + (icono === 'palomita' ? 'btn-exito' : 'btn-peligro');
      dlg.returnValue = '';
      dlg.addEventListener('close', () => resolver(dlg.returnValue === 'si'), { once: true });
      dlg.showModal();
      this.el('btn-confirmar-no').focus();
    });
  }
};

document.addEventListener('DOMContentLoaded', () => SRP.app.iniciar());
