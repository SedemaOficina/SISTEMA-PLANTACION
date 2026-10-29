/* ARRANQUE Y NAVEGACIÓN */
window.SRP = window.SRP || {};

SRP.app = {
  vista: null,
  el(id) { return document.getElementById(id); },

  /* ICONOS DEL SET CDMX EN ACCESO, PESTAÑAS Y ACCIONES. Se ponen aquí, una vez, para que
     el HTML no cargue con trazados y el icono viva en un solo lugar (js/iconos.js). */
  ponerIconos() {
    const I = SRP.ICONOS;
    I.poner(document.querySelector('label[for="acceso-correo"]'), 'correo', 'medio');
    I.poner(document.querySelector('label[for="acceso-clave"]'), 'candado', 'medio');
    I.poner(this.el('form-acceso').querySelector('button[type="submit"]'), 'entrar', 'medio');
    const pestana = { supervision: 'avance', registrar: 'mas', registros: 'registros', jornadas: 'jornadas', configuracion: 'tuerca' };
    this.el('navegacion').querySelectorAll('.pestana').forEach(b => I.poner(b, pestana[b.dataset.vista], 'grande'));
    I.poner(this.el('btn-usr-agregar'), 'usuarioMas', 'medio');
    I.poner(this.el('btn-subir'), 'subir', 'grande');
    ['btn-ini-coord-aplicar', 'btn-coord-aplicar'].forEach(id => I.poner(this.el(id), 'ubicacion', 'medio'));
    ['btn-filtros', 'jornada-btn-filtros'].forEach(id => I.poner(this.el(id), 'filtros', 'medio'));
    // Menú de la cuenta con icono en cada opción: el sol y la puerta por petición del área, y el resto por consistencia
    // Cancelar lleva tache y va en rojo de contorno
    I.poner(this.el('btn-cancelar-edicion'), 'cerrar', 'medio');
    I.poner(this.el('btn-confirmar-no'), 'cerrar', 'medio');
    [['btn-contraste', 'sol'], ['btn-cerrar-sesion', 'salir']].forEach(([id, icono]) => I.poner(this.el(id), icono, 'medio'));
    if (SRP.prueba) SRP.prueba.ponerIconos();
    // Los buscadores llevan la lupa dentro del campo, desde la hoja de estilos
    // Avisos informativos: el icono va al frente del texto
    document.querySelectorAll('.aviso-simulado').forEach(a => a.insertAdjacentHTML('afterbegin', I.svg('info', 'medio')));
  },

  async iniciar() {
    const vp = SRP.util.versionEnPantalla();   // primero: también se ve si la versión llegó mezclada
    this.el('version-sia').textContent = vp.texto;
    this.el('version-sia').className = ('version-sia ' + vp.clase).trim();
    if (!this.comprobarVersionCompleta()) { this.marcarListo(); return; }
    SRP.util.redDeSeguridad();     // ningún fallo se queda mudo
    SRP.turno.iniciar();           // se trabaja en una pestaña a la vez: ésta toma el turno
    this.el('version').textContent = SRP.util.textoVersion();
    if (SRP.prueba) SRP.prueba.mostrarBanda();
    // Con datos reales, los últimos parámetros que mandó el servidor, antes de que los use nadie
    SRP.remoto.aplicarParametrosGuardados();
    try {
      await SRP.almacen.abrir();
      let arranque = null;
      if (SRP.CONFIG.ES_FICTICIO) arranque = await SRP.almacen.sembrarSiVacio();
      SRP.almacen.arranque = arranque;   // queda a la vista para diagnosticar y para las pruebas
      await SRP.ref.recargar();
      await SRP.cola.cargar();   // con datos reales, lo que espera envío
      // Sólo se rehacen los datos de ejemplo cuando no hay nada capturado; si lo hay, se conserva
      if (arranque === 'resembrado') setTimeout(() => SRP.util.anunciar('Se actualizaron las cuentas y los catálogos de prueba a la versión nueva.', 'aviso'), 400);
      if (arranque === 'reiniciado') setTimeout(() => SRP.util.anunciar('Se reiniciaron los datos de prueba: una cuenta por tipo y los catálogos al día. Lo capturado antes, que era de prueba, se quitó.', 'aviso'), 400);
      const c = SRP.almacen.conservados;
      if (c && (c.arboles || c.jornadas)) {
        const txt = (c.arboles === 1 ? '1 árbol' : c.arboles + ' árboles') + ' y ' + (c.jornadas === 1 ? '1 jornada' : c.jornadas + ' jornadas');
        setTimeout(() => SRP.util.anunciar('La base del teléfono se actualizó y se conservó todo lo guardado: ' + txt + '.', 'aviso'), 600);
      }
    } catch (err) {
      this.el('principal').innerHTML = '<div class="errores"><h2>No se pudo abrir el almacenamiento de este equipo</h2>' +
        '<p>' + SRP.util.escapar(err.message) + '. Revise que el navegador no esté en modo privado.</p></div>';
      this.marcarListo();
      return;
    }
    SRP.foto.iniciar();           // la fotografía del servidor que no llega no se ve rota
    SRP.formulario.iniciar();
    if (SRP.espejo) SRP.espejo.iniciar();   // sólo en la versión de prueba
    SRP.registros.iniciar();
    SRP.reportes.iniciar();
    SRP.catalogos.iniciar();
    SRP.usuarios.iniciar();
    SRP.configuracion.iniciar();
    SRP.duplicados.iniciar();
    SRP.carga.iniciar();
    SRP.especiesRevision.iniciar();
    this.cuidarCampoEnVentana();
    SRP.conexion.iniciar();
    SRP.sesion.avisarVaciado();
    // Con datos reales, al volver la señal se confirma la sesión y se trae lo enviado que faltaba
    window.addEventListener('online', () => { if (SRP.sesion.usuario && !SRP.remoto.listo()) SRP.sesion.confirmar(); });
    SRP.jornadas.iniciar();
    SRP.galeria.iniciar();
    SRP.supervision.iniciar();   // Supervisión y Mi avance
    if (SRP.demo) SRP.demo.iniciar();   // datos de demostración, al pie: sólo con datos de prueba
    SRP.activa.iniciar();          // la jornada se declara antes de registrar
    // Contadores de caracteres, y el error de un campo se va en cuanto se corrige
    SRP.util.iniciarContadores();
    const alCorregir = (e) => { const c = e.target; if (c && c.id && document.getElementById(c.id + '-error')) SRP.util.quitarErrorCampo(c); };
    document.addEventListener('input', alCorregir);
    document.addEventListener('change', alCorregir);
    SRP.envio.iniciar();           // el envío: real con datos reales, simulado con datos de prueba
    SRP.rechazos.iniciar();        // lo que el servidor no aceptó, con datos reales
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
      // Tocar la pestaña de la sección en que se está sube a su inicio, como en las apps del teléfono
      if (b.dataset.vista === this.vista) { this.alInicio(true); return; }
      // Un árbol a medias no se pierde en silencio
      if (this.vista === 'registrar' && b.dataset.vista !== 'registrar' && SRP.formulario.aMedias()) {
        const ok = await this.confirmar({ titulo: 'Descartar el árbol', pregunta: 'El árbol que está capturando no se ha guardado. ¿Descartarlo y salir?',
          puntosTitulo: 'Se pierde lo capturado:', puntos: SRP.formulario.resumenAMedias(), irreversible: true, boton: 'Descartar el árbol', icono: 'basura' });
        if (!ok) return;
        SRP.formulario.limpiar();
      }
      if ((SRP.formulario.estado.editando || SRP.formulario.estado.sustitucion) && b.dataset.vista !== 'registrar') SRP.formulario.limpiar();
      this.mostrarVista(b.dataset.vista);
    });

    /* EL BOTÓN «ATRÁS» DEL NAVEGADOR. Con una ventana abierta, la cierra. Si no, vuelve a la sección
       anterior. Con un árbol a medias no sale de «Nuevo registro»: pide guardarlo o descartarlo. */
    window.addEventListener('popstate', (e) => {
      // Sin el turno, el aviso de la otra pestaña se queda: sólo «Usar aquí» lo quita
      if (!SRP.sesion.usuario || !SRP.turno.mia()) return;
      const quedarse = () => { try { history.pushState({ vista: this.vista }, ''); } catch (err) { /* sin historial */ } };
      const abierta = document.querySelector('dialog[open]');
      if (abierta) { abierta.close(); quedarse(); return; }
      const destino = e.state && e.state.vista;
      if (!destino || destino === this.vista) return;
      const f = SRP.formulario;
      if (this.vista === 'registrar' && (f.aMedias() || f.estado.editando || f.estado.sustitucion)) {
        quedarse();
        SRP.util.anunciar(f.aMedias() ? 'Guarde el árbol o descártelo antes de salir de «Nuevo registro».' : 'Guarde los cambios o cancele antes de salir.', 'aviso');
        return;
      }
      this.mostrarVista(destino, true);
    });

    const u = await SRP.sesion.leer();
    if (u) this.entrar(); else this.mostrarAcceso();
    this.marcarListo();
    // Con el servidor, se entra sin esperarlo y después se confirma la sesión, si hay señal
    if (u) SRP.sesion.confirmar();
  },

  /* Terminó de arrancar, o se detuvo con su aviso. Las pruebas esperan esta marca en lugar de un tiempo
     fijo: un navegador más lento o un equipo ocupado no las adelantan. */
  marcarListo() { document.documentElement.dataset.listo = 'true'; },

  /* Un navegador que ya abrió una versión anterior puede servir unos archivos de su memoria y
     otros de la red, y esa mezcla no arranca: antes quedaba la pantalla en blanco, sin explicación.
     Se comprueba que las piezas que deben existir estén, y si no, se dice qué hacer. */
  comprobarVersionCompleta() {
    const faltan = [
      ['form-acceso', 'la pantalla de acceso'],
      ['vista-usuarios', 'la pantalla de usuarios'],
      ['dlg-cierre', 'el formulario del reporte'],
      ['franja-guardado', 'la franja de registro guardado'],
      ['revision-lista', 'la ficha de revisión']
      // El espejo de campos no se exige: es sólo de la versión de prueba y la app debe abrir sin él
    ].filter(([id]) => !document.getElementById(id)).map(([, que]) => que);
    // Las cuentas y la demostración son sólo de la versión de prueba: la real no las carga
    const modulos = ['util', 'ICONOS', 'permisos', 'sesion', 'almacen', 'ref', 'formulario', 'registros', 'catalogos', 'usuarios', 'configuracion', 'excel', 'carga', 'ESQUEMA', 'derivacion', 'indicadores', 'supervision', 'informes', 'CATALOGOS_ARRANQUE', 'turno', 'reloj']
      .concat(SRP.CONFIG.ES_FICTICIO ? ['DATOS_FICTICIOS', 'demo'] : [])
      .filter(m => !SRP[m]);
    /* Las tres capas y la biblioteca del cruce también se exigen: sin ellas la app abría y
       los árboles se guardaban sin alcaldía ni colonia, y con folio EXT-000. La de colonias pesa
       3 MB y es la que más se corta en una primera carga con mala señal. */
    const sinCapas = !modulos.length && !SRP.derivacion.capasCompletas();
    if (!faltan.length && !modulos.length && !sinCapas) return true;
    const mezcla = faltan.length || modulos.length;
    // Nunca se sugiere borrar los datos del sitio: ahí viven los árboles capturados
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

  // Entrar falló por algo que no es un dato del formulario: el recuadro lo dice sin marcar ningún campo
  noSePudoEntrar(caja, campos, err, texto) {
    SRP.util.erroresEnCampos([], campos);
    texto = texto || (SRP.util.esFaltaDeEspacio(err)
      ? 'El teléfono no tiene espacio libre para guardar los catálogos. Libere espacio (fotos o aplicaciones que no use) y vuelva a tocar «Entrar».'
      : SRP.util.mensajeError(err, 'entrar'));
    caja.innerHTML = '<h2>No se pudo entrar</h2><p></p>';
    caja.querySelector('p').textContent = texto;
    caja.hidden = false;
    if (!caja.hasAttribute('tabindex')) caja.setAttribute('tabindex', '-1');
    caja.focus();
  },

  iniciarAcceso() {
    this.el('form-acceso').addEventListener('submit', async (e) => {
      e.preventDefault();
      const correo = this.el('acceso-correo').value.trim();
      const clave = this.el('acceso-clave').value;
      const errores = [];
      if (!correo) errores.push(['acceso-correo', 'Escriba su correo.']);
      if (!clave) errores.push(['acceso-clave', 'Escriba su contraseña.']);
      const caja = this.el('acceso-errores'), campos = ['acceso-correo', 'acceso-clave'];
      if (SRP.util.resumenErrores(caja, errores, campos)) return;
      // Con el servidor, entrar tarda lo que tarde la red: el botón no se puede tocar dos veces
      const boton = this.el('form-acceso').querySelector('button[type="submit"]');
      if (boton.disabled) return;
      boton.disabled = true; boton.setAttribute('aria-busy', 'true');
      // Un fallo al guardar lo que baja (el teléfono sin espacio) no deja el botón apagado: se dice qué pasó
      let r;
      try { r = await SRP.sesion.autenticar(correo, clave); }
      catch (err) { r = { ok: false, fallo: err }; }
      finally { boton.disabled = false; boton.removeAttribute('aria-busy'); }
      if (r.fallo) { this.noSePudoEntrar(caja, campos, r.fallo); return; }
      if (r.temporal) { caja.hidden = true; this.el('acceso-clave').value = ''; this.mostrarTemporal(r.cuenta); return; }
      if (!r.ok && r.general) { this.noSePudoEntrar(caja, campos, null, r.motivo); return; }
      if (!r.ok) { SRP.util.resumenErrores(caja, [['acceso-correo', r.motivo]], campos); return; }
      caja.hidden = true;
      this.el('acceso-clave').value = '';
      this.entrar();
    });

    this.iniciarTemporal();

    // Cerrar sesión y cambiar de usuario (js/herramientas-prueba.js) hacen lo mismo por dentro; se separan porque una
    // es del sistema y la otra sólo existe mientras haya datos de prueba.
    const salir = () => {
      SRP.formulario.limpiar(true);
      SRP.sesion.cerrar();
      this.mostrarAcceso();
    };
    this.el('btn-cerrar-sesion').addEventListener('click', async () => { this.menuCuenta(false); if (await this.salirConPendientes()) salir(); });
    // Menú de la cuenta: abre y cierra con el botón; se cierra al tocar fuera o con Escape
    this.el('btn-cuenta').innerHTML = SRP.ICONOS.svg('usuario', 'grande');
    this.el('btn-cuenta').addEventListener('click', () => this.menuCuenta(this.el('menu-cuenta').hidden));
    document.addEventListener('click', (e) => { if (!e.target.closest('.cuenta')) this.menuCuenta(false); });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !this.el('menu-cuenta').hidden) { this.menuCuenta(false); this.el('btn-cuenta').focus(); }
    });
    if (SRP.prueba) SRP.prueba.iniciar(salir);
  },

  /* Cerrar sesión con algo sin enviar: se queda en el teléfono y sale cuando esa persona vuelva a entrar aquí,
     nunca con la cuenta de otra. Se dice antes, y se ofrece enviarlo; si sale todo, la sesión se cierra. */
  async salirConPendientes() {
    const p = await SRP.envio.pendientesTodos();
    if (!p || !p.total) return true;
    const r = await this.elegir({ titulo: 'Cerrar sesión', pregunta: 'Tiene ' + SRP.envio.textoPendientes(p) + ' sin enviar.',
      puntos: ['Se quedan en este teléfono y se envían cuando usted vuelva a entrar aquí.', 'Si entra otra persona, no se envían con su cuenta.'],
      otro: { texto: 'Enviar ahora', icono: 'senal' }, boton: 'Cerrar sesión de todos modos', icono: 'salir', linea: true });
    if (r !== 'otro') return r === 'si';
    await SRP.envio.enviar({ manual: true });
    const quedan = await SRP.envio.pendientesTodos();
    return !quedan || !quedan.total;
  },

  /* Menús de acciones de los renglones. Un solo manejador para las tres tablas: la tuerca
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

  /* EL CAMPO QUE SE ESCRIBE, A LA VISTA. En teléfono, al tocar un campo dentro de una ventana el
     teclado ocupa media pantalla y la ventana se encoge: el campo podía quedar tapado por el pie
     fijo. Al enfocar un campo de una ventana, y otra vez cuando el teclado termina de salir, el
     campo se lleva al centro de la ventana. Con el teclado fuera, el pie deja de estar fijo
     (clase `con-teclado`) para dejarle el espacio al campo. */
  cuidarCampoEnVentana() {
    const vv = window.visualViewport, raiz = document.documentElement;
    const escribible = el => !!el && el.matches && el.matches('textarea, select, input:not([type=checkbox]):not([type=radio]):not([type=file]):not([type=button]):not([type=range])');
    const acomodar = () => {
      const el = document.activeElement;
      if (escribible(el) && el.closest('dialog[open]')) el.scrollIntoView({ block: 'center' });
    };
    document.addEventListener('focusin', (e) => { if (escribible(e.target) && e.target.closest('dialog[open]')) setTimeout(acomodar, 300); });
    if (!vv) return;
    vv.addEventListener('resize', () => {
      const conTeclado = vv.height < window.innerHeight * 0.75;
      raiz.classList.toggle('con-teclado', conTeclado);
      raiz.style.setProperty('--alto-visible', Math.round(vv.height) + 'px');
      if (conTeclado) setTimeout(acomodar, 60);
    });
  },

  /* CONTRASEÑA TEMPORAL. Con datos reales, quien entra con la temporal que le dio la Administración escribe
     una propia antes de seguir. Se revisa aquí con las reglas del servicio, para decir de una vez qué falta, y
     el servicio la vuelve a revisar. */
  iniciarTemporal() {
    const campos = ['temporal-nueva', 'temporal-otra'];
    this.el('temporal-regla-largo').textContent = 'Al menos ' + SRP.CONFIG.CONTRASENA_MINIMA + ' caracteres.';
    this.el('btn-temporal-mostrar').addEventListener('click', (e) => {
      const ver = e.currentTarget.getAttribute('aria-pressed') !== 'true';
      e.currentTarget.setAttribute('aria-pressed', String(ver));
      e.currentTarget.innerHTML = SRP.ICONOS.svg('ver', 'chico') + '<span>' + (ver ? 'Ocultar lo que escribo' : 'Mostrar lo que escribo') + '</span>';
      campos.forEach(id => { this.el(id).type = ver ? 'text' : 'password'; });
    });
    SRP.ICONOS.poner(this.el('btn-temporal-mostrar'), 'ver', 'chico');
    this.el('btn-temporal-guardar').innerHTML = SRP.ICONOS.svg('candado', 'medio') + '<span>Guardar y entrar</span>';
    this.el('btn-temporal-salir').innerHTML = SRP.ICONOS.svg('salir', 'medio') + '<span>Salir sin cambiarla</span>';
    this.el('btn-temporal-salir').addEventListener('click', () => { SRP.sesion.salirDeTemporal(); this.mostrarAcceso(); });
    this.el('form-temporal').addEventListener('submit', async (e) => {
      e.preventDefault();
      const caja = this.el('temporal-errores'), boton = this.el('btn-temporal-guardar');
      const nueva = this.el('temporal-nueva').value, otra = this.el('temporal-otra').value;
      const errores = [];
      const motivo = this.revisarContrasena(nueva);
      if (motivo) errores.push(['temporal-nueva', motivo]);
      if (!otra) errores.push(['temporal-otra', 'Escríbala otra vez.']);
      else if (!motivo && otra !== nueva) errores.push(['temporal-otra', 'Las dos no coinciden: escríbalas igual.']);
      if (SRP.util.resumenErrores(caja, errores, campos) || boton.disabled) return;
      const libre = SRP.util.ocupado(boton, 'Guardando…', 'candado');
      let r;
      try { r = await SRP.sesion.cambiarTemporal(nueva); } finally { libre(); }
      if (!r.ok) { SRP.util.resumenErrores(caja, [['temporal-nueva', r.motivo]], campos); return; }
      caja.hidden = true;
      this.entrar();
      SRP.util.anunciar('Listo: su contraseña quedó cambiada. Desde ahora entra con ella.', 'exito');
    });
  },

  // Lo que el servicio pide a una contraseña nueva; '' si está bien
  revisarContrasena(nueva) {
    const t = SRP.sesion.temporal, min = SRP.CONFIG.CONTRASENA_MINIMA;
    if (!nueva) return 'Escriba su contraseña nueva.';
    if (nueva.length < min) return 'La contraseña debe tener al menos ' + min + ' caracteres.';
    if (!/[A-Za-zÁÉÍÓÚÑáéíóúñ]/.test(nueva) || !/\d/.test(nueva)) return 'La contraseña debe llevar letras y números.';
    const usuario = String((t && t.cuenta.correo) || '').split('@')[0].toLowerCase();
    if (usuario.length >= 4 && nueva.toLowerCase().includes(usuario)) return 'La contraseña no puede contener su correo.';
    if (t && nueva === t.actual) return 'La contraseña nueva debe ser distinta de la temporal.';
    return '';
  },

  mostrarTemporal(cuenta) {
    this.el('form-acceso').hidden = true;
    const f = this.el('form-temporal');
    f.reset();
    this.el('temporal-errores').hidden = true;
    this.el('temporal-quien').innerHTML = 'Entró con una contraseña temporal, <b>' + SRP.util.escapar(SRP.util.nombreCompleto(cuenta) || cuenta.correo) + '</b>. ' +
      'Antes de seguir, escriba una propia: sólo usted la sabrá.';
    f.hidden = false;
    this.el('temporal-nueva').focus();
  },

  mostrarAcceso() {
    this.campoClave(true);
    this.menuCuenta(false);
    this.el('navegacion').hidden = true;
    this.el('encabezado-usuario').hidden = true;
    if (SRP.prueba) SRP.prueba.alSalir();
    // Ninguna ventana de la sesión que terminó se queda encima de la entrada
    document.querySelectorAll('dialog[open]').forEach(d => d.close());
    this.el('form-acceso').hidden = false;
    this.el('form-temporal').hidden = true;
    this.el('franja-envio').hidden = true;
    this.el('form-acceso').reset();
    this.el('acceso-errores').hidden = true;
    SRP.util.erroresEnCampos([], ['acceso-correo', 'acceso-clave']);
    if (SRP.prueba) SRP.prueba.ofrecerCuentas();
    this.mostrarVista('acceso');
  },

  entrar() {
    const u = SRP.sesion.usuario;
    const p = SRP.permisos.de(u);
    this.el('usuario-nombre').textContent = SRP.util.nombreCompleto(u);
    this.el('btn-cuenta').setAttribute('aria-label', 'Cuenta: ' + SRP.util.nombreCompleto(u) + ', ' + p.etiqueta + '. Abrir menú');
    this.el('usuario-perfil').textContent = p.etiqueta;
    this.el('encabezado-usuario').hidden = false;
    this.el('navegacion').hidden = false;
    if (SRP.prueba) SRP.prueba.alEntrar();
    if (SRP.demo) SRP.demo.pintar();
    const nav = this.el('navegacion');
    nav.querySelector('[data-vista="registrar"]').hidden = !p.registrar;
    /* Supervisión: primera para quien sólo consulta; para quien registra —cabo y coordinación—
       va al final de su barra, después de Registros, y el cabo la lee «Mi avance». Usuarios, Catálogos y lo demás que administra la Administración global, en Configuración, la última pestaña de su barra */
    const sup = nav.querySelector('[data-vista="supervision"]'), cabo = p.alcance === 'propios';
    sup.hidden = p.alcance === 'ninguno';
    this.el('pestana-supervision-texto').textContent = cabo ? 'Mi avance' : 'Supervisión';
    if (p.registrar) nav.appendChild(sup); else nav.insertBefore(sup, nav.firstElementChild);
    const cfg = nav.querySelector('[data-vista="configuracion"]');
    cfg.hidden = !(p.catalogos && p.usuarios);
    nav.appendChild(cfg);
    SRP.formulario.limpiar(true);
    this.campoClave(false);
    // La jornada abierta de quien entra queda activa; se avisa si es de otro día
    SRP.activa.conAvisos(() => SRP.activa.alEntrar().then(() => { if (this.vista === 'registrar') SRP.activa.preparar(); })
      .then(() => SRP.activa.avisarRelevos()).then(() => SRP.activa.avisarApoyos()));
    // Quien supervisa entra a Supervisión; el cabo, a registrar
    this.mostrarVista(['institucion', 'todos'].includes(p.alcance) ? 'supervision' : p.registrar ? 'registrar' : 'registros');
    SRP.conexion.refrescar();
    // Con datos de prueba, al entrar se envía lo pendiente y, si no sale, lo dice la franja
    SRP.conexion.sugerirInstalar();   // en iPhone desde Safari, una vez por sesión y antes de capturar
    SRP.envio.alEntrar();   // la pastilla cuenta los registros del alcance de quien entró
    SRP.calles.asignarRecibidas();   // con datos de prueba, lo recibido sin calle porque no bajaron sus celdas
    SRP.remoto.pintar();    // con datos reales, los avisos de lo enviado que todavía no llega
  },

  /* MENOS AUTOLLENADO DE SAFARI. Con un campo de contraseña en la página, Safari trata
     cualquier campo de texto como posible inicio de sesión y pone sobre el teclado la llave, la
     tarjeta y la ubicación. Mientras hay sesión, el campo de contraseña sale de la página y se
     devuelve al volver al acceso. Safari decide al final; esto sólo le quita motivos. */
  campoClave(poner) {
    if (!poner && !this._campoClave) {
      const c = this.el('acceso-clave').closest('.campo');
      this._marcaClave = document.createComment('campo de contraseña fuera mientras hay sesión');
      c.replaceWith(this._marcaClave);
      this._campoClave = c;
    } else if (poner && this._campoClave) {
      this._marcaClave.replaceWith(this._campoClave);
      this._campoClave = null;
    }
  },

  // Fuera del acceso ningún campo pide autollenado: especies, comentarios y datos de cierre no son de contacto
  sinAutollenado() {
    document.querySelectorAll('input, textarea, form').forEach(e => {
      if (e.closest('#form-acceso') || e.type === 'file' || e.type === 'hidden') return;
      e.setAttribute('autocomplete', 'off');
    });
  },

  /* ---------- Vistas ---------- */
  /* `desdeHistorial`: la vista se abre porque se pulsó «atrás» o «adelante» en el navegador; en ese
     caso no se anota otra vez en el historial. */
  mostrarVista(nombre, desdeHistorial) {
    // Doble candado: una vista sin permiso no se abre aunque se llame directamente
    const u = SRP.sesion.usuario;
    if (u) {
      const p = SRP.permisos.de(u);
      const admin = p.catalogos && p.usuarios;
      // Quien no registra árboles nuevos pero sí puede corregirlos (la Administración global) entra a «Nuevo registro» sólo a editar
      const editando = !!(SRP.formulario && SRP.formulario.estado && (SRP.formulario.estado.editando || SRP.formulario.estado.sustitucion));
      if ((nombre === 'registrar' && !p.registrar && !editando) || (nombre === 'catalogos' && !p.catalogos) || (nombre === 'galeria' && !p.galeria) || (nombre === 'supervision' && p.alcance === 'ninguno') ||
          (nombre === 'usuarios' && !p.usuarios) || (['configuracion', 'parametros', 'cambios', 'acerca', 'carga', 'revision-especies'].includes(nombre) && !admin) ||
          (nombre === 'duplicados' && !SRP.duplicados.disponible())) nombre = 'registros';
    }
    // Una sección que no existe (un «atrás» hacia una sección de una versión anterior) lleva a Jornadas
    if (!document.getElementById('vista-' + nombre)) nombre = 'jornadas';
    this.vista = nombre;
    // Cada sección queda en el historial del navegador: «atrás» vuelve a la sección anterior
    if (u && !desdeHistorial) {
      try { if (!history.state || history.state.vista !== nombre) history.pushState({ vista: nombre }, ''); } catch (e) { /* sin historial */ }
    }
    document.querySelectorAll('.vista').forEach(v => { v.hidden = v.id !== 'vista-' + nombre; });
    // Al editar se está dentro de Registros, de donde se llegó: «Nuevo registro» no se marca
    // Fotografías vive dentro de Supervisión: su pestaña es la que queda marcada
    // Lo que se abre desde Configuración deja marcada su pestaña
    const deConfiguracion = ['usuarios', 'catalogos', 'parametros', 'cambios', 'acerca', 'carga', 'revision-especies', 'duplicados'];
    const marcada = nombre === 'registrar' && (SRP.formulario.estado.editando || SRP.formulario.estado.sustitucion) ? (SRP.jornadas.volverAlDetalle ? 'jornadas' : 'registros') : nombre === 'galeria' ? 'supervision' : deConfiguracion.includes(nombre) ? 'configuracion' : nombre;
    this.el('navegacion').querySelectorAll('.pestana').forEach(b => {
      if (b.dataset.vista === marcada) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current');
    });
    if (nombre === 'registrar') SRP.formulario.preparar();
    if (nombre === 'registros') SRP.registros.preparar();
    if (nombre === 'jornadas') SRP.jornadas.preparar();
    if (nombre === 'galeria') SRP.galeria.preparar();
    if (nombre === 'supervision') SRP.supervision.preparar();
    if (nombre === 'catalogos') SRP.catalogos.preparar();
    if (nombre === 'usuarios') SRP.usuarios.preparar();
    if (nombre === 'configuracion') SRP.configuracion.preparar();
    if (nombre === 'parametros') SRP.configuracion.prepararParametros();
    if (nombre === 'cambios') SRP.configuracion.prepararCambios();
    if (nombre === 'duplicados') SRP.duplicados.preparar();
    if (nombre === 'acerca') SRP.configuracion.prepararAcerca();
    if (nombre === 'carga') SRP.carga.preparar();
    if (nombre === 'revision-especies') SRP.especiesRevision.preparar();
    const titulo = this.el('vista-' + nombre).querySelector('h1');
    if (titulo) { titulo.setAttribute('tabindex', '-1'); titulo.focus({ preventScroll: true }); }
    this.alInicio();
  },

  /* CADA PÁGINA EMPIEZA ARRIBA. Al cambiar de sección, o de la lista de jornadas a una ficha
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

  /* BOTÓN «SUBIR AL INICIO». Aparece al bajar más de tres cuartos de pantalla y se queda en
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
  // cuadrito de la derecha. En teléfono el navegador ya lo hace solo.
  /* TEXTO GUÍA EN FECHAS Y HORAS VACÍAS. Cada <input data-vacio="…"> se envuelve con su
     texto guía, que se ve sólo mientras el campo está vacío. Hay valores que el código pone o
     quita sin evento (limpiar, editar, restaurar filtros): una revisión ligera cada medio segundo
     los alcanza sin tener que avisar desde cada módulo. */
  /* MODO SOL. Sube el contraste para leer a pleno sol: texto negro, contornos oscuros y
     campos blancos con borde. Se usa en campo, bajo el sol: arranca activado, y si la persona lo
     apaga se recuerda en el dispositivo. */
  iniciarContraste() {
    const clave = SRP.CONFIG.CLAVE_CONTRASTE;
    let guardado = null;
    try { guardado = localStorage.getItem(clave); } catch (e) { /* almacenamiento bloqueado */ }
    const poner = (alto) => {
      if (alto) document.documentElement.dataset.contraste = 'alto';
      else delete document.documentElement.dataset.contraste;
      this.el('btn-contraste').setAttribute('aria-checked', String(alto));
    };
    poner(guardado ? guardado === 'alto' : true);
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
      const f = e.target.closest('.zona-filtros input[type="date"], .fecha-con-hoy input[type="date"]');
      if (f && typeof f.showPicker === 'function') { try { f.showPicker(); } catch (_) { /* sin gesto válido: se queda con el foco */ } }
    });
  },

  iniciarDialogos() {
    // Los botones fijos del HTML reciben aquí su icono, para no repetir el SVG en la página
    // Iconos fijos por significado: disco = guardar, palomita = confirmar/aprobar
    this.el('btn-cat-guardar').innerHTML = SRP.ICONOS.svg('disco') + '<span>Guardar</span>';
    this.el('btn-usr-guardar').innerHTML = SRP.ICONOS.svg('disco') + '<span>Guardar</span>';
    this.el('btn-par-guardar').innerHTML = SRP.ICONOS.svg('disco') + '<span>Guardar</span>';
    const I = (id, icono, texto, tam) => { const b = this.el(id); if (b) b.innerHTML = SRP.ICONOS.svg(icono, tam || 'medio') + '<span>' + texto + '</span>'; };
    I('btn-cierre-generar', 'ver', 'Ver vista previa', 'medio');
    I('btn-previa-corregir', 'lapiz', 'Corregir datos');
    I('btn-enviar-ahora', 'senal', 'Enviar ahora');
    I('btn-filtrar', 'buscar', 'Aplicar');
    I('btn-reiniciar-filtros', 'cerrar', 'Quitar filtros', 'chico');   // un nombre por acción
    I('btn-coord-aplicar', 'ubicacion', 'Colocar punto');
    I('btn-cambiar-nueva', 'mas', 'Iniciar otra jornada');
    I('btn-clave-temporal-listo', 'palomita', 'Listo');
    // Toda × de cabecera cierra su propio diálogo; cada módulo reacciona al evento «close» si lo necesita
    document.querySelectorAll('.dialogo-cerrar').forEach(b => {
      b.innerHTML = SRP.ICONOS.svg('cerrar', 'grande');
      b.addEventListener('click', () => { const d = b.closest('dialog'); if (d) d.close(); });
    });
    this.el('btn-confirmar-si').addEventListener('click', () => this.el('dlg-confirmar').close('si'));
    this.el('btn-confirmar-no').addEventListener('click', () => this.el('dlg-confirmar').close('no'));
    this.el('btn-confirmar-otro').addEventListener('click', () => this.el('dlg-confirmar').close('otro'));
    // Con palabra de confirmación, el botón se activa cuando lo escrito coincide; Intro confirma
    this.el('confirmar-palabra').addEventListener('input', () => this.revisarPalabra());
    this.el('confirmar-palabra').addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { e.preventDefault(); if (!this.el('btn-confirmar-si').disabled) this.el('dlg-confirmar').close('si'); }
    });
  },

  /* CONFIRMAR. La confirmación queda para lo que no se deshace —eliminar una jornada, una
     cuenta o un valor del catálogo, restablecer los datos, descartar un árbol sin guardar— y para
     decisiones con consecuencias que conviene ver antes (cerrar con pendientes, guardar en una
     jornada de otro día). Lo reversible se hace de una vez y ofrece «Deshacer»: así, que
     aparezca este diálogo significa algo.
     Forma estructurada: { titulo, pregunta, puntosTitulo, puntos: [], nota, irreversible, boton,
     icono, cancelar }. La corta (texto, textoBoton, icono) sirve para una pregunta simple.
     icono: 'basura' elimina (rojo), 'palomita' confirma (verde), 'candado' cierra (acento). */
  confirmar(texto, textoBoton, icono) {
    return this.elegir(typeof texto === 'object' ? texto : { pregunta: texto, boton: textoBoton, icono }).then(r => r === 'si');
  },

  /* La misma ventana con una salida más, primero y en el color de la acción: `otro` { texto, icono }. Devuelve
     'si', 'otro' o '' (cancelar). `linea`: el botón principal va de contorno, porque la acción es la otra. */
  elegir(o) {
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
      b.className = 'btn ' + (o.soloAceptar ? 'btn-primario' : o.icono === 'palomita' ? 'btn-exito' : o.icono === 'candado' ? (o.linea ? 'btn-secundario' : 'btn-primario') : o.linea ? 'btn-peligro-linea' : 'btn-peligro');
      const otro = this.el('btn-confirmar-otro');
      otro.hidden = !o.otro;
      otro.innerHTML = o.otro ? SRP.ICONOS.svg(o.otro.icono, 'medio') + '<span>' + SRP.util.escapar(o.otro.texto) + '</span>' : '';
      // Un aviso que sólo se lee (`soloAceptar`) no lleva «Cancelar»
      this.el('btn-confirmar-no').hidden = !!o.soloAceptar;
      // `cancelar`: cómo se llama la otra salida cuando no es cancelar («Dejar en 3»)
      // y entonces va neutra, sin tache: no cancela nada, es la otra respuesta
      const no = this.el('btn-confirmar-no');
      no.className = 'btn ' + (o.cancelar ? 'btn-editar' : 'btn-cancelar');
      no.innerHTML = (o.cancelar ? '' : SRP.ICONOS.svg('cerrar', 'medio')) + '<span>' + SRP.util.escapar(o.cancelar || 'Cancelar') + '</span>';
      /* `escribir`: lo que hay que teclear para confirmar algo que no se deshace. No distingue
         mayúsculas ni espacios al inicio o al final: lo que se pide es una pausa, no una prueba */
      const caja = this.el('dlg-confirmar-escribir'), campo = this.el('confirmar-palabra');
      this.palabra = o.escribir ? String(o.escribir) : '';
      caja.hidden = !this.palabra;
      campo.value = '';
      this.el('confirmar-palabra-etiqueta').innerHTML = this.palabra ? SRP.util.escapar(o.escribirEtiqueta || 'Para confirmar, escriba') + ' <b>' + SRP.util.escapar(this.palabra) + '</b>' : '';
      this.revisarPalabra();
      dlg.returnValue = '';
      dlg.addEventListener('close', () => resolver(['si', 'otro'].includes(dlg.returnValue) ? dlg.returnValue : ''), { once: true });
      dlg.showModal();
      (this.palabra ? campo : o.soloAceptar ? b : this.el('btn-confirmar-no')).focus();
    });
  },

  palabra: '',
  revisarPalabra() {
    const igual = t => String(t).trim().toLocaleLowerCase('es');
    this.el('btn-confirmar-si').disabled = !!this.palabra && igual(this.el('confirmar-palabra').value) !== igual(this.palabra);
  }
};

document.addEventListener('DOMContentLoaded', () => SRP.app.iniciar());
