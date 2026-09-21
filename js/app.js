/* ARRANQUE Y NAVEGACIÓN */
window.SRP = window.SRP || {};

SRP.app = {
  vista: null,
  el(id) { return document.getElementById(id); },

  async iniciar() {
    this.el('logo').src = SRP.LOGO_BASE64;
    this.el('version').textContent = SRP.CONFIG.VERSION;
    this.el('banda-ficticio').hidden = !SRP.CONFIG.ES_FICTICIO;
    try {
      await SRP.almacen.abrir();
      if (SRP.CONFIG.ES_FICTICIO) await SRP.almacen.sembrarSiVacio();
      await SRP.ref.recargar();
    } catch (err) {
      this.el('principal').innerHTML = '<div class="errores"><h2>No se pudo abrir el almacenamiento del dispositivo</h2>' +
        '<p>' + SRP.util.escapar(err.message) + '. Revise que el navegador no esté en modo privado.</p></div>';
      return;
    }
    SRP.formulario.iniciar();
    SRP.registros.iniciar();
    SRP.catalogos.iniciar();
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

  /* ---------- Acceso ---------- */
  iniciarAcceso() {
    this.el('form-alta').addEventListener('submit', async (e) => {
      e.preventDefault();
      const campos = [['alta-nombre', 'nombre', 'Escriba su nombre.'], ['alta-ap', 'apellido_paterno', 'Escriba su apellido paterno.'],
        ['alta-am', 'apellido_materno', 'Escriba su apellido materno.'], ['alta-area', 'area_id', 'Elija su área.'],
        ['alta-cargo', 'cargo_rol', 'Escriba su cargo y rol.']];
      const datos = {}; const errores = [];
      campos.forEach(([id, clave, msg]) => {
        const v = this.el(id).value.trim().replace(/\s+/g, ' ');
        datos[clave] = v;
        this.el(id).toggleAttribute('aria-invalid', !v);
        if (!v) errores.push('<li><a href="#' + id + '">' + msg + '</a></li>');
      });
      const caja = this.el('alta-errores');
      if (errores.length) { caja.innerHTML = '<ul>' + errores.join('') + '</ul>'; caja.hidden = false; caja.focus(); return; }
      caja.hidden = true;
      await SRP.sesion.registrarNuevo(datos);
      await SRP.ref.recargar();
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
    this.el('alta-area').innerHTML = '<option value="">Seleccione su área</option>' +
      SRP.ref.deTipo('area', true).map(a => '<option value="' + a.id + '">' + SRP.util.escapar(a.nombre) + '</option>').join('');
    const prueba = this.el('acceso-prueba');
    prueba.hidden = !SRP.CONFIG.ES_FICTICIO;
    if (!prueba.hidden) {
      this.el('sel-usuario-prueba').innerHTML = SRP.ref.usuarios.filter(u => u.activo).map(u =>
        '<option value="' + u.id + '">' + SRP.util.escapar(SRP.util.nombreCompleto(u)) + ' (' + SRP.permisos.de(u).etiqueta + ')</option>').join('');
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
    SRP.formulario.limpiar();
    this.mostrarVista(p.registrar ? 'registrar' : 'registros');
  },

  /* ---------- Vistas ---------- */
  mostrarVista(nombre) {
    // Doble candado: una vista sin permiso no se abre aunque se llame directamente
    const u = SRP.sesion.usuario;
    if (u) {
      const p = SRP.permisos.de(u);
      if ((nombre === 'registrar' && !p.registrar) || (nombre === 'catalogos' && !p.catalogos)) nombre = 'registros';
    }
    this.vista = nombre;
    document.querySelectorAll('.vista').forEach(v => { v.hidden = v.id !== 'vista-' + nombre; });
    this.el('navegacion').querySelectorAll('.pestana').forEach(b => {
      if (b.dataset.vista === nombre) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current');
    });
    if (nombre === 'registrar') SRP.formulario.preparar();
    if (nombre === 'registros') SRP.registros.preparar();
    if (nombre === 'catalogos') SRP.catalogos.preparar();
    const titulo = this.el('vista-' + nombre).querySelector('h1');
    if (titulo) { titulo.setAttribute('tabindex', '-1'); titulo.focus({ preventScroll: true }); }
    window.scrollTo(0, 0);
  },

  /* ---------- Diálogos ---------- */
  iniciarDialogos() {
    this.el('btn-confirmar-si').addEventListener('click', () => this.el('dlg-confirmar').close('si'));
    this.el('btn-confirmar-no').addEventListener('click', () => this.el('dlg-confirmar').close('no'));
  },

  confirmar(texto, textoBoton) {
    return new Promise((resolver) => {
      const dlg = this.el('dlg-confirmar');
      this.el('dlg-confirmar-texto').textContent = texto;
      this.el('btn-confirmar-si').textContent = textoBoton;
      dlg.returnValue = '';
      dlg.addEventListener('close', () => resolver(dlg.returnValue === 'si'), { once: true });
      dlg.showModal();
      this.el('btn-confirmar-no').focus();
    });
  }
};

document.addEventListener('DOMContentLoaded', () => SRP.app.iniciar());
