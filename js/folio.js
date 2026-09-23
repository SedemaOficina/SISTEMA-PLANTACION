/* FOLIO DEL EJEMPLAR — nomenclatura adoptada (D67) y lo que de ella vive en el dispositivo.

   FORMA: AAA-000-00000, 13 caracteres fijos, dos segmentos congelados al asignar (D67):
     AAA-000    celda UGA del punto, por cruce contra la malla vigente al alta (EXT-000 si el
                punto queda fuera de la malla por deriva del receptor)
     00000      consecutivo de la celda, de una tabla de secuencias PERPETUA y MONOTÓNICA:
                no se reinicia por ejercicio, administración ni versión del sistema (R5–R6)
   El origen del registro y el ejercicio no van en el folio: son campos de la base.
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
  PATRON: /^[A-Z]{3}-\d{3}-\d{5}$/,
  LARGO: 13,
  TECHO: 99999,   // consecutivo máximo por celda; al llegar aquí la celda no admite más folios (R6)
  PROVISIONAL: 'PROVISIONAL',

  // Los cuatro campos que se congelan en el registro al asignar el folio (R8)
  CAMPOS: ['folio', 'folio_uga', 'folio_capa_version', 'folio_lat', 'folio_lng'],

  valido(f) { return typeof f === 'string' && this.PATRON.test(f); },

  /* Arma un folio a partir de sus partes. Sólo valida y compone: el consecutivo lo da la tabla
     de secuencias del servidor (R5), nunca MAX(folio)+1 ni un conteo de registros. La celda
     EXT-000 es la reservada para un punto fuera de la malla. Un consecutivo fuera de 1–99999 se
     rechaza: el desbordamiento se atiende con la regla de R6, no recortando ni reiniciando. */
  armar(uga, consecutivo) {
    const celda = uga && /^[A-Z]{3}-\d{3}$/.test(uga) ? uga : 'EXT-000';
    const n = Number(consecutivo);
    if (!Number.isInteger(n) || n < 1 || n > this.TECHO) throw new Error('Consecutivo fuera de rango para la celda ' + celda + ': ' + consecutivo);
    const f = celda + '-' + String(n).padStart(5, '0');
    if (!this.valido(f)) throw new Error('Folio mal formado: ' + f);
    return f;
  },

  // Lo que la pantalla enseña donde va el folio: el folio, o la leyenda mientras no exista
  texto(registro) {
    return registro && this.valido(registro.folio) ? registro.folio : this.PROVISIONAL;
  },

  /* ---------- SERVIDOR SIMULADO (D110): sólo con datos de prueba ----------
     En la Etapa 1 no hay servidor, pero para ver el folio en pantalla, lista, detalle y PDF, con
     datos ficticios se simula la emisión tal como la hará el servidor: al haber conexión, cada
     registro sin folio recibe el suyo, una sola vez, con el consecutivo de una secuencia por celda
     que sólo avanza (R5–R6) y se congelan celda, versión de capas y coordenada (R8). La secuencia
     vive en este dispositivo: dos teléfonos de prueba pueden repetir números, que es justo lo que
     el servidor real evitará. Con ES_FICTICIO en false nada de esto corre. */
  simulado() { return !!SRP.CONFIG.ES_FICTICIO; },

  leerSecuencias() {
    try { return JSON.parse(localStorage.getItem(SRP.CONFIG.CLAVE_SECUENCIAS_PRUEBA) || '{}'); } catch (e) { return {}; }
  },

  // Lee e incrementa: nunca MAX(folio)+1 ni conteo de registros (R5–R6)
  siguiente(celda) {
    const s = this.leerSecuencias();
    const n = (s[celda] || 0) + 1;
    if (n > this.TECHO) throw new Error('La celda ' + celda + ' llegó al tope de ' + this.TECHO + ' folios (R6)');
    s[celda] = n;
    try { localStorage.setItem(SRP.CONFIG.CLAVE_SECUENCIAS_PRUEBA, JSON.stringify(s)); } catch (e) { /* sin persistencia */ }
    return n;
  },

  // Emite el folio de los registros de prueba que no lo tienen, en el orden en que se registraron
  async emitirPendientes() {
    if (!this.simulado() || !SRP.conexion.enLinea() || !SRP.sesion.usuario || !SRP.almacen.db) return 0;
    const pendientes = (await SRP.almacen.todos('plantaciones'))
      .filter(r => r.es_ficticio && !this.valido(r.folio))
      .sort((a, b) => String(a.fecha_registro).localeCompare(String(b.fecha_registro)));
    for (const r of pendientes) {
      const celda = r.uga && /^[A-Z]{3}-\d{3}$/.test(r.uga) ? r.uga : 'EXT-000';
      const folio = this.armar(celda, this.siguiente(celda));
      const nuevo = Object.assign({}, r, { folio, folio_uga: celda, folio_capa_version: r.capa_version || null, folio_lat: r.lat, folio_lng: r.lng });
      await SRP.almacen.guardarConBitacora('plantaciones', nuevo,
        SRP.bitacora.entrada('FOLIO_ASIGNADO', 'plantacion', r.id, 'Folio ' + folio + ' (simulado, datos de prueba)'));
    }
    return pendientes.length;
  },

  // Cómo se escribe el folio junto a su aviso: los simulados lo dicen para que nadie los tome por reales
  textoLargo(registro) {
    if (!this.valido(registro.folio)) return this.PROVISIONAL;
    return registro.folio + (registro.es_ficticio ? ' (simulado)' : '');
  },

  /* Etiqueta de campo (no es llave): folio · especie · alcaldía · fecha. Se recalcula sola de
     los atributos; si la especie se corrige, la etiqueta cambia y el folio no. */
  etiqueta(registro) {
    const e = SRP.ref.especieDe(registro);
    return [this.texto(registro), e.cientifico || e.comun, SRP.ref.alcaldia(registro.alcaldia),
            SRP.util.formatearFecha(registro.fecha_plantacion)].join(' · ');
  }
};
