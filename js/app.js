/* ARRANQUE Y NAVEGACIÓN */
window.SRP = window.SRP || {};

SRP.app = {
  vista: null,
  el(id) { return document.getElementById(id); },

  async iniciar() {
    if (!this.comprobarVersionCompleta()) return;
    this.el('logo').src = SRP.LOGO_BASE64;
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
    SRP.registros.iniciar();
    SRP.catalogos.iniciar();
    SRP.usuarios.iniciar();
    this.iniciarAcceso();
    this.iniciarDialogos();

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
      ['dlg-guardado', 'el aviso de registro guardado'],
      ['revision-lista', 'la ficha de revisión']
    ].filter(([id]) => !document.getElementById(id)).map(([, que]) => que);
    const modulos = ['util', 'ICONOS', 'permisos', 'sesion', 'almacen', 'ref', 'formulario', 'registros', 'catalogos', 'usuarios']
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
    this.el('btn-cambiar-perfil').addEventListener('click', () => {
      SRP.formulario.limpiar();
      SRP.sesion.cerrar();
      this.mostrarAcceso();
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
    this.el('usuario-nombre').textContent = SRP.util.nombreCompleto(u);
    this.el('usuario-perfil').textContent = p.etiqueta;
    this.el('encabezado-usuario').hidden = false;
    this.el('navegacion').hidden = false;
    this.el('herramientas-prueba').hidden = !SRP.CONFIG.ES_FICTICIO;
    this.el('navegacion').querySelector('[data-vista="registrar"]').hidden = !p.registrar;
    this.el('navegacion').querySelector('[data-vista="catalogos"]').hidden = !p.catalogos;
    this.el('navegacion').querySelector('[data-vista="usuarios"]').hidden = !p.usuarios;
    SRP.formulario.limpiar();
    this.mostrarVista(p.registrar ? 'registrar' : 'registros');
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
