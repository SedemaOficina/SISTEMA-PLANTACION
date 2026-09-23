/* DERIVACIÓN TERRITORIAL: punto-en-polígono local contra SRP.CAPAS.
   Resultado orientativo para el registro de campo; no produce consecuencias jurídicas.
   Si en Fase 2 el dato se usa para turnar o validar, el cruce se hace en el servidor
   contra la capa completa (Norma 6.4).

   CAPAS. Vienen del SIA (assets/fuentes/, intactas) y se cargan compactadas por
   pruebas/generar_capas.py:
     alcaldias  16 polígonos, clave INEGI `cvegeo` (09012), nombre y clave corta (TLP)
     uga        1,624 hexágonos de ~1 km², clave `TLP-318`; el prefijo es la alcaldía
     colonias   1,837 unidades territoriales del IECM 2022, clave `CVEUT` (`10-001`). CAPA DE
                PRUEBA: se sustituye antes de liberar la etapa, con alcaldías y UGA.

   LO QUE SE SABE DE LA CAPA DE COLONIAS (medido al recibirla, D62):
   - No cubre el suelo de conservación: 532 km² al sur sin colonia. Un punto ahí se guarda con
     `colonia` nula y la pantalla dice «Sin colonia (fuera de zona urbana)».
   - 215 solapes (1.6 km²), casi siempre una unidad habitacional dibujada encima del pueblo o
     colonia que la rodea. Gana el polígono MÁS PEQUEÑO: es la unidad más específica.
   - Sus límites no coinciden con los de alcaldías: 12 colonias tienen el interior en otra
     alcaldía. La alcaldía sale de su capa, nunca de la demarcación que trae la colonia (D47).

   LO QUE SE SABE DE LA CAPA DE ALCALDÍAS. La definitiva (sia-2026-01-01, bloque 38) no tiene
   solapes ni huecos: los tres solapes y cinco huecos de la entrega anterior quedaron corregidos
   en la fuente. Las dos reglas se conservan como defensa, por si una entrega futura los trae:
   - En un solape gana el primer polígono de la capa que contiene el punto (el borde cuenta
     como dentro). Regla fija, para que el mismo punto derive siempre lo mismo.
   - En un hueco no se deriva alcaldía: el registro se guarda igual, con `alcaldia` nula y
     `capa_version` puesta, para volver a derivarlo. Un árbol real no se queda sin registrar
     por un defecto de la capa. */
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
    return this.buscarTodos(nombre, punto, lng, lat, true)[0] || null;
  },

  // Todos los features que contienen el punto (o sólo el primero, si `primero`)
  buscarTodos(nombre, punto, lng, lat, primero) {
    const capa = SRP.CAPAS[nombre];
    if (!capa) return [];
    const cajas = this.cajasDe(nombre);
    const fs = capa.geojson.features;
    const dentro = [];
    for (let i = 0; i < fs.length; i++) {
      const [o, s, e, n] = cajas[i];
      if (lng < o || lng > e || lat < s || lat > n) continue;
      if (window.turfPIP(punto, fs[i])) { dentro.push(fs[i]); if (primero) break; }
    }
    return dentro;
  },

  /* Área planar aproximada (grados², fórmula del zapatero), sólo para COMPARAR polígonos de la
     misma capa: en un solape de colonias gana el más pequeño (D62). No es una superficie real. */
  areaDe(feature) {
    if (feature._area === undefined) {
      let a = 0;
      feature.geometry.coordinates.forEach(pg => pg.forEach((anillo, k) => {
        let s = 0;
        for (let i = 0; i < anillo.length - 1; i++) s += anillo[i][0] * anillo[i + 1][1] - anillo[i + 1][0] * anillo[i][1];
        a += (k === 0 ? 1 : -1) * Math.abs(s) / 2;   // el anillo exterior suma; los huecos restan
      }));
      feature._area = a;
    }
    return feature._area;
  },

  derivar(lat, lng) {
    const r = { alcaldia_cve: null, alcaldia: null, colonia_cve: null, colonia: null, uga: null, capa_version: null, dentro: false };
    if (!SRP.CAPAS || typeof window.turfPIP !== 'function') return r;
    const punto = { type: 'Feature', properties: {}, geometry: { type: 'Point', coordinates: [lng, lat] } }; // GeoJSON: longitud primero

    // Qué versión de cada capa se usó, para que el dato se pueda rehacer después
    r.capa_version = ['alcaldias', 'uga', 'colonias']
      .filter(k => SRP.CAPAS[k]).map(k => k + '=' + SRP.CAPAS[k].meta.version).join(';') || null;

    const a = this.buscar('alcaldias', punto, lng, lat);
    if (a) { r.alcaldia_cve = a.properties.cvegeo; r.alcaldia = a.properties.nombre; r.dentro = true; }

    const u = this.buscar('uga', punto, lng, lat);
    if (u) r.uga = u.properties.clave;

    // Colonia: si el punto cae en varias, la más pequeña; si en ninguna, nula (D62)
    const cs = this.buscarTodos('colonias', punto, lng, lat, false);
    if (cs.length) {
      const c = cs.reduce((m, f) => this.areaDe(f) < this.areaDe(m) ? f : m, cs[0]);
      r.colonia_cve = c.properties.clave; r.colonia = c.properties.nombre;
    }

    return r;
  },

  /* El ámbito sigue siendo la caja de la ciudad, no la unión de las alcaldías: si fuera la
     unión, un árbol plantado en uno de los huecos de la capa no se podría registrar. */
  dentroDelAmbito(lat, lng) {
    const [[s, o], [n, e]] = SRP.CONFIG.MAPA.LIMITES;
    return lat >= s && lat <= n && lng >= o && lng <= e;
  }
};
