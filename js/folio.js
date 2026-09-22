/* FOLIO DEL EJEMPLAR — nomenclatura adoptada (D67) y lo que de ella vive en el dispositivo.

   FORMA: SRP-AAA-000-AAAA-00000, 22 caracteres fijos, cuatro segmentos congelados al asignar:
     SRP        constante; distingue el folio cuando se cita fuera del sistema
     AAA-000    celda UGA del punto, por cruce contra la malla vigente al alta (EXT-000 si el
                punto queda fuera de la malla por deriva del receptor)
     AAAA       año de asignación
     00000      consecutivo por celda y año, de una tabla de secuencias que sólo avanza
   La clave de especie NO forma parte del folio: un ejemplar se reidentifica cuantas veces haga
   falta sin que su folio cambie.

   QUÉ HACE ESTE ARCHIVO Y QUÉ NO. Aquí viven el patrón, la validación y la etiqueta de campo:
   es el código que el servidor reutilizará tal cual. Aquí NO se emite ningún folio: la
   asignación ocurre una sola vez, en el servidor, al sincronizar (R3), con el UUID del registro
   como clave de idempotencia (R4). Mientras eso no exista, todo registro es PROVISIONAL y así lo
   dice la pantalla (R1); ningún rótulo, placa ni reporte definitivo puede salir de él (R2).

   CUÁNDO PODRÁ EMITIRSE. Cuando el SIA entregue la malla UGA corregida, versionada y congelada
   como capa de referencia (DECISIONES, pendientes). Hasta entonces `folio` es nulo en todos. */
window.SRP = window.SRP || {};

SRP.folio = {
  PATRON: /^SRP-[A-Z]{3}-\d{3}-\d{4}-\d{5}$/,
  PROVISIONAL: 'PROVISIONAL',

  // Los cuatro campos que se congelan en el registro al asignar el folio (R8)
  CAMPOS: ['folio', 'folio_uga', 'folio_capa_version', 'folio_lat', 'folio_lng'],

  valido(f) { return typeof f === 'string' && this.PATRON.test(f); },

  /* Arma un folio a partir de sus partes. Sólo valida y compone: el consecutivo lo da la tabla
     de secuencias del servidor (R5). La celda EXT-000 es la reservada para un punto fuera de la
     malla. */
  armar(uga, anio, consecutivo) {
    const celda = uga && /^[A-Z]{3}-\d{3}$/.test(uga) ? uga : 'EXT-000';
    const f = 'SRP-' + celda + '-' + String(anio) + '-' + String(consecutivo).padStart(5, '0');
    if (!this.valido(f)) throw new Error('Folio mal formado: ' + f);
    return f;
  },

  // Lo que la pantalla enseña donde va el folio: el folio, o la leyenda mientras no exista
  texto(registro) {
    return registro && this.valido(registro.folio) ? registro.folio : this.PROVISIONAL;
  },

  /* Etiqueta de campo (no es llave): folio · especie · alcaldía · fecha. Se recalcula sola de
     los atributos; si la especie se corrige, la etiqueta cambia y el folio no. */
  etiqueta(registro) {
    const e = SRP.ref.especieDe(registro);
    return [this.texto(registro), e.cientifico || e.comun, SRP.ref.alcaldia(registro.alcaldia),
            SRP.util.formatearFecha(registro.fecha_plantacion)].join(' · ');
  }
};
