/* DERIVACIÓN TERRITORIAL: punto-en-polígono local contra SRP.CAPAS.
   Resultado orientativo para el registro de campo; no produce consecuencias jurídicas.
   Si en Fase 2 el dato se usa para turnar o validar, el cruce se hace en el servidor
   contra la capa completa (Norma 6.4).

   CAPAS. Vienen del SIA (assets/fuentes/, intactas) y se cargan compactadas por
   pruebas/generar_capas.py:
     alcaldias  16 polígonos, clave INEGI `cvegeo` (09012), nombre y clave corta (TLP)
     uga        1,624 hexágonos de ~1 km², clave `TLP-318`; el prefijo es la alcaldía
   No hay capa de colonias todavía: `colonia` se guarda nula y la pantalla lo dice.

   LO QUE SE SABE DE LA CAPA DE ALCALDÍAS (medido al recibirla, ver DECISIONES.md):
   entre polígonos vecinos hay tres solapes (el mayor, GAM–VCA, de 2.5 ha) y cinco huecos
   (el mayor, de 1.2 ha, cerca de 19.4838, -99.1499). Son de la fuente, no se corrigen aquí.
   - En un solape gana el primer polígono de la capa que contiene el punto (el borde cuenta
     como dentro). Regla fija, para que el mismo punto derive siempre lo mismo.
   - En un hueco no se deriva alcaldía: el registro se guarda igual, con `alcaldia` nula y
     `capa_version` puesta, para volver a derivarlo cuando la capa se corrija. Un árbol real
     plantado ahí no puede quedarse sin registrar por un defecto de la capa. */
window.SRP = window.SRP || {};

SRP.derivacion = {
  // Cajas por feature, calculadas una vez: descartar por caja cuesta cuatro comparaciones y
  // evita cruzar 1,624 hexágonos y 17 mil vértices en cada toque al mapa.
  cajas: {},

  cajasDe(nombre) {
    if (this.cajas[nombre]) return this.cajas[nombre];
    const capa = SRP.CAPAS[nombre];
    this.cajas[nombre] = capa.geojson.features.map(f => {
      let o = Infinity, s = Infinity, e = -Infinity, n = -Infinity;
      f.geometry.coordinates.forEach(pg => pg.forEach(anillo => anillo.forEach(([x, y]) => {
        if (x < o) o = x; if (x > e) e = x; if (y < s) s = y; if (y > n) n = y;
      })));
      return [o, s, e, n];
    });
    return this.cajas[nombre];
  },

  // Primer feature de la capa que contiene el punto, o null
  buscar(nombre, punto, lng, lat) {
    const capa = SRP.CAPAS[nombre];
    if (!capa) return null;
    const cajas = this.cajasDe(nombre);
    const fs = capa.geojson.features;
    for (let i = 0; i < fs.length; i++) {
      const [o, s, e, n] = cajas[i];
      if (lng < o || lng > e || lat < s || lat > n) continue;
      if (window.turfPIP(punto, fs[i])) return fs[i];
    }
    return null;
  },

  derivar(lat, lng) {
    const r = { alcaldia_cve: null, alcaldia: null, colonia: null, uga: null, capa_version: null, dentro: false };
    if (!SRP.CAPAS || typeof window.turfPIP !== 'function') return r;
    const punto = { type: 'Feature', properties: {}, geometry: { type: 'Point', coordinates: [lng, lat] } }; // GeoJSON: longitud primero

    // Qué versión de cada capa se usó, para que el dato se pueda rehacer después
    r.capa_version = ['alcaldias', 'uga']
      .filter(k => SRP.CAPAS[k]).map(k => k + '=' + SRP.CAPAS[k].meta.version).join(';') || null;

    const a = this.buscar('alcaldias', punto, lng, lat);
    if (a) { r.alcaldia_cve = a.properties.cvegeo; r.alcaldia = a.properties.nombre; r.dentro = true; }

    const u = this.buscar('uga', punto, lng, lat);
    if (u) r.uga = u.properties.clave;

    return r;
  },

  /* El ámbito sigue siendo la caja de la ciudad, no la unión de las alcaldías: si fuera la
     unión, un árbol plantado en uno de los huecos de la capa no se podría registrar. */
  dentroDelAmbito(lat, lng) {
    const [[s, o], [n, e]] = SRP.CONFIG.MAPA.LIMITES;
    return lat >= s && lat <= n && lng >= o && lng <= e;
  }
};
