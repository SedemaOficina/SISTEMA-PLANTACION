/* DERIVACIÓN TERRITORIAL: punto-en-polígono local contra SRP.CAPAS.
   Resultado orientativo para el registro de campo; no produce consecuencias jurídicas.
   Si en Fase 2 el dato se usa para turnar o validar, el cruce se hace en el servidor
   contra la capa completa (Norma 6.4).
   Precedencia en bordes: gana el primer polígono de la capa que contiene el punto
   (el borde cuenta como dentro). Documentado en DECISIONES.md. */
window.SRP = window.SRP || {};

SRP.derivacion = {
  derivar(lat, lng) {
    const resultado = { alcaldia: null, colonia: null, uga: null, capa_version: null, dentro: false };
    if (!SRP.CAPAS || typeof window.turfPIP !== 'function') return resultado;
    const punto = { type: 'Feature', properties: {}, geometry: { type: 'Point', coordinates: [lng, lat] } }; // GeoJSON: longitud primero

    const col = SRP.CAPAS.alcaldias_colonias;
    if (col) {
      resultado.capa_version = col.meta.version;
      const f = col.geojson.features.find(x => window.turfPIP(punto, x));
      if (f) { resultado.alcaldia = f.properties.alcaldia; resultado.colonia = f.properties.colonia; resultado.dentro = true; }
    }
    const uga = SRP.CAPAS.uga;
    if (uga) {
      const f = uga.geojson.features.find(x => window.turfPIP(punto, x));
      if (f) resultado.uga = f.properties.id_uga;
    }
    return resultado;
  },

  dentroDelAmbito(lat, lng) {
    const [[s, o], [n, e]] = SRP.CONFIG.MAPA.LIMITES;
    return lat >= s && lat <= n && lng >= o && lng <= e;
  }
};
