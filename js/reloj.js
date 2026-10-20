/* LA HORA DEL TELÉFONO. Las fechas de los registros salen del reloj del teléfono: si va adelantado, el servidor
   rechaza lo de «hoy» por posterior a hoy; si va atrasado, un árbol de hoy queda en otro día, o en otro año. Cada
   respuesta del servicio trae su hora (la cabecera Date): si la del teléfono difiere más de MINUTOS_RELOJ, una
   franja ámbar lo dice arriba, con cuánto y qué hacer. Sin señal no se mide: queda lo último que se supo. */
window.SRP = window.SRP || {};

SRP.reloj = {
  diferencia: 0,   // milisegundos que el teléfono va adelantado (más) o atrasado (menos) respecto del servidor

  // Un intermediario que agrega la suya deja dos, juntas: vale la primera
  anotar(cabecera) {
    const m = String(cabecera || '').match(/[A-Z][a-z]{2}, \d{2} [A-Z][a-z]{2} \d{4} \d{2}:\d{2}:\d{2} GMT/);
    const servidor = m ? Date.parse(m[0]) : NaN;
    if (Number.isNaN(servidor)) return;
    this.diferencia = Date.now() - servidor;
    this.pintar();
  },

  mal() { return Math.abs(this.diferencia) > SRP.CONFIG.MINUTOS_RELOJ * 60000; },

  // «3 días», «2 horas», «25 minutos»
  cuanto() {
    const d = Math.abs(this.diferencia), n = (x, uno, varios) => (x === 1 ? '1 ' + uno : x + ' ' + varios);
    if (d >= 864e5) return n(Math.round(d / 864e5), 'día', 'días');
    if (d >= 36e5) return n(Math.round(d / 36e5), 'hora', 'horas');
    return n(Math.round(d / 6e4), 'minuto', 'minutos');
  },

  pintar() {
    const f = document.getElementById('franja-reloj');
    if (!f) return;
    f.hidden = !this.mal();
    if (f.hidden) return;
    document.getElementById('franja-reloj-texto').innerHTML = '<strong>La hora de este teléfono está mal:</strong> va ' + this.cuanto() +
      (this.diferencia > 0 ? ' adelantada' : ' atrasada') + '. Corríjala en los ajustes del teléfono: las fechas de los registros se toman de ella.';
  }
};
