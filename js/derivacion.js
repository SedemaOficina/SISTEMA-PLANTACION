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
   - No cubre el suelo de conservación: 532 km² al sur sin colonia; y quedan 31 km² urbanos sin
     colonia. Un punto ahí se guarda con `colonia` nula y la pantalla dice «Sin colonia en la capa»
     (D152): no siempre es zona no urbana, y el rótulo anterior lo afirmaba.
   - 215 solapes (1.6 km²), casi siempre una unidad habitacional dibujada encima del pueblo o
     colonia que la rodea. Gana el polígono MÁS PEQUEÑO: es la unidad más específica.
   - Sus límites no coinciden con los de alcaldías: 12 colonias tienen el interior en otra
     alcaldía. La alcaldía sale de su capa, nunca de la demarcación que trae la colonia (D47).

   ÁMBITO (D152). La Ciudad de México es la unión de las alcaldías, no un rectángulo: la caja de
   antes aceptaba Nezahualcóyotl, Naucalpan o Huixquilucan (47 % de su superficie queda fuera) y
   hasta les daba celda UGA de borde. Se admite un margen de MARGEN_AMBITO_M metros alrededor del
   límite, porque el GPS de un árbol plantado junto al límite puede caer unos metros afuera; ese
   punto toma la alcaldía más cercana y la pantalla lo dice.

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

  /* Distancia en metros de un punto al borde de un polígono, en una proyección local (unos
     centímetros de error dentro de la ciudad): sirve para el margen del ámbito y para saber qué tan
     cerca del borde de su celda UGA cayó el árbol. */
  distanciaBorde(feature, lat, lng) {
    const kx = 111320 * Math.cos(lat * Math.PI / 180), ky = 110574;
    let min = Infinity;
    feature.geometry.coordinates.forEach(pg => pg.forEach(anillo => {
      for (let i = 0; i < anillo.length - 1; i++) {
        const ax = (anillo[i][0] - lng) * kx, ay = (anillo[i][1] - lat) * ky;
        const dx = (anillo[i + 1][0] - lng) * kx - ax, dy = (anillo[i + 1][1] - lat) * ky - ay;
        const l2 = dx * dx + dy * dy;
        const t = l2 ? Math.max(0, Math.min(1, -(ax * dx + ay * dy) / l2)) : 0;
        const d = (ax + t * dx) ** 2 + (ay + t * dy) ** 2;
        if (d < min) min = d;
      }
    }));
    return Math.sqrt(min);
  },

  // La alcaldía más cercana a un punto que no cae en ninguna, si está a `margen` metros o menos
  cercana(lat, lng, margen) {
    const capa = SRP.CAPAS && SRP.CAPAS.alcaldias;
    if (!capa) return null;
    const cajas = this.cajasDe('alcaldias');
    const gy = margen / 110574, gx = margen / (111320 * Math.cos(lat * Math.PI / 180));
    let mejor = null;
    capa.geojson.features.forEach((f, i) => {
      const [o, s, e, n] = cajas[i];
      if (lng < o - gx || lng > e + gx || lat < s - gy || lat > n + gy) return;
      const d = this.distanciaBorde(f, lat, lng);
      if (d <= margen && (!mejor || d < mejor.d)) mejor = { f, d };
    });
    return mejor;
  },

  // ¿Están las tres capas y la biblioteca del cruce? El arranque lo exige (D152)
  capasCompletas() {
    return !!(SRP.CAPAS && ['alcaldias', 'uga', 'colonias'].every(k => SRP.CAPAS[k] && SRP.CAPAS[k].geojson && SRP.CAPAS[k].geojson.features.length) &&
      typeof window.turfPIP === 'function');
  },

  /* `fuera_m`: si el punto cae fuera de las alcaldías pero dentro del margen, a cuántos metros del
     límite quedó (la alcaldía es la más cercana). `uga_borde_m`: a cuántos metros del borde de su
     celda: si es menos que la precisión del GPS, la celda del folio no es segura (D152). */
  derivar(lat, lng) {
    const r = { alcaldia_cve: null, alcaldia: null, colonia_cve: null, colonia: null, uga: null, capa_version: null, dentro: false, fuera_m: 0, uga_borde_m: null };
    if (!SRP.CAPAS || typeof window.turfPIP !== 'function') return r;
    const punto = { type: 'Feature', properties: {}, geometry: { type: 'Point', coordinates: [lng, lat] } }; // GeoJSON: longitud primero

    // Qué versión de cada capa se usó, para que el dato se pueda rehacer después
    r.capa_version = ['alcaldias', 'uga', 'colonias']
      .filter(k => SRP.CAPAS[k]).map(k => k + '=' + SRP.CAPAS[k].meta.version).join(';') || null;

    const a = this.buscar('alcaldias', punto, lng, lat);
    const cerca = a ? null : this.cercana(lat, lng, SRP.CONFIG.MAPA.MARGEN_AMBITO_M);
    const alc = a || (cerca && cerca.f);
    if (alc) { r.alcaldia_cve = alc.properties.cvegeo; r.alcaldia = alc.properties.nombre; r.dentro = true; }
    if (cerca) r.fuera_m = Math.max(1, Math.round(cerca.d));

    const u = this.buscar('uga', punto, lng, lat);
    if (u) { r.uga = u.properties.clave; r.uga_borde_m = Math.round(this.distanciaBorde(u, lat, lng)); }

    // Colonia: si el punto cae en varias, la más pequeña; si en ninguna, nula (D62)
    const cs = this.buscarTodos('colonias', punto, lng, lat, false);
    if (cs.length) {
      const c = cs.reduce((m, f) => this.areaDe(f) < this.areaDe(m) ? f : m, cs[0]);
      r.colonia_cve = c.properties.clave; r.colonia = c.properties.nombre;
    }

    return r;
  },

  /* El ámbito es la unión de las alcaldías más el margen (D152). La capa definitiva no tiene
     huecos (bloque 38), así que ya no hace falta la caja para no dejar fuera un árbol real. La caja
     sigue como primer filtro, y como único si faltara la capa (el arranque no lo permite). */
  dentroDelAmbito(lat, lng) {
    if (typeof lat !== 'number' || typeof lng !== 'number' || !isFinite(lat) || !isFinite(lng)) return false;
    const [[s, o], [n, e]] = SRP.CONFIG.MAPA.LIMITES;
    if (lat < s || lat > n || lng < o || lng > e) return false;
    if (!this.capasCompletas()) return true;
    const punto = { type: 'Feature', properties: {}, geometry: { type: 'Point', coordinates: [lng, lat] } };
    return !!this.buscar('alcaldias', punto, lng, lat) || !!this.cercana(lat, lng, SRP.CONFIG.MAPA.MARGEN_AMBITO_M);
  }
};
