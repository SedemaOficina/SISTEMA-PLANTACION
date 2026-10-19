/* UNA PESTAÑA A LA VEZ. Con el SRP abierto en dos pestañas del mismo teléfono —o en la aplicación instalada y en
   el navegador—, cada una tendría su propia idea de lo que espera envío y de la jornada activa, y lo que una
   limpia del teléfono la otra lo pierde. Por eso trabaja una sola, la que tiene el turno: la última que se abrió.
   Las demás muestran un aviso con «Usar aquí», que trae el trabajo a esa pestaña: se recarga, para leer lo
   guardado como lo dejó la otra, y al abrir toma el turno.

   El turno se anota en localStorage, que todas las pestañas del sitio comparten y que avisa a las demás cuando
   cambia. Si el navegador no deja guardarlo, cada pestaña trabaja sola, como antes. */
window.SRP = window.SRP || {};

SRP.turno = {
  CLAVE: 'srp_turno',
  id: null,
  fuera: false,   // otra pestaña tomó el turno

  mia() { return !this.fuera; },

  iniciar() {
    this.id = SRP.util.generarId();
    // Primero se toma el turno y luego se escucha: el aviso de otra pestaña siempre llega después de anotarlo
    try { localStorage.setItem(this.CLAVE, this.id); } catch (e) { return; }
    window.addEventListener('storage', (e) => {
      if (e.key !== this.CLAVE) return;
      let turno = null;
      try { turno = localStorage.getItem(this.CLAVE); } catch (err) { return; }
      if (turno && turno !== this.id) this.ceder();
    });
    document.getElementById('dlg-turno-titulo').insertAdjacentHTML('afterbegin', SRP.ICONOS.svg('info', 'medio'));
    document.getElementById('btn-turno-usar').addEventListener('click', () => location.reload());
    // El aviso no se cierra con Escape: sólo «Usar aquí» trae el trabajo
    document.getElementById('dlg-turno').addEventListener('cancel', (e) => e.preventDefault());
  },

  ceder() {
    if (this.fuera) return;
    this.fuera = true;
    const d = document.getElementById('dlg-turno');
    if (!d.open) d.showModal();
  }
};
