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
    I.poner(this.el('btn-ayuda-senal'), 'ayuda', 20);
    I.poner(this.el('btn-usr-agregar'), 'usuarioMas', 20);
    I.poner(document.querySelector('label[for="cat-buscar"]'), 'buscar', 18);
    I.poner(document.querySelector('label[for="usr-buscar"]'), 'buscar', 18);
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
    this.iniciarAcceso();
    this.iniciarDialogos();
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
    this.el('btn-cerrar-sesion').addEventListener('click', salir);
    this.el('btn-cambiar-perfil').addEventListener('click', salir);
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

  mostrarAcceso() {
    this.el('navegacion').hidden = true;
    this.el('encabezado-usuario').hidden = true;
    this.el('herramientas-prueba').hidden = true;
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
    this.el('usuario-nombre').innerHTML = SRP.ICONOS.svg('usuario', 18) + '<span>' + SRP.util.escapar(SRP.util.nombreCompleto(u)) + '</span>';
    this.el('usuario-perfil').textContent = p.etiqueta;
    this.el('encabezado-usuario').hidden = false;
    this.el('btn-cambiar-perfil').hidden = !SRP.CONFIG.ES_FICTICIO;
    this.el('navegacion').hidden = false;
    this.el('herramientas-prueba').hidden = !SRP.CONFIG.ES_FICTICIO;
    this.el('navegacion').querySelector('[data-vista="registrar"]').hidden = !p.registrar;
    this.el('navegacion').querySelector('[data-vista="catalogos"]').hidden = !p.catalogos;
    this.el('navegacion').querySelector('[data-vista="usuarios"]').hidden = !p.usuarios;
    SRP.formulario.limpiar();
    this.mostrarVista(p.registrar ? 'registrar' : 'registros');
    SRP.conexion.refrescar();   // la pastilla cuenta los registros del alcance de quien entró (D83)
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
    this.el('navegacion').querySelectorAll('.pestana').forEach(b => {
      if (b.dataset.vista === nombre) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current');
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
  iniciarDialogos() {
    // Los botones fijos del HTML reciben aquí su icono, para no repetir el SVG en la página
    this.el('btn-cat-guardar').innerHTML = SRP.ICONOS.svg('palomita') + '<span>Guardar</span>';
    this.el('btn-usr-guardar').innerHTML = SRP.ICONOS.svg('palomita') + '<span>Guardar</span>';
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
