/* CROQUIS DE LA JORNADA PARA EL REPORTE (D115).

   Una imagen con los puntos de la jornada numerados en el mismo orden que la tabla «Ejemplares
   registrados», para la vista previa y el PDF. Con conexión lleva de fondo la imagen de satélite
   (los mismos mosaicos del mapa); sin ella, o si los mosaicos no llegan a tiempo o el servidor no
   permite copiarlos a un lienzo, va sobre fondo liso y lo dice. En los dos casos: puntos, números,
   barra de escala y norte.

   PESO. Sin imagen es un PNG de unos pocos KB; con imagen, un JPEG de 60–120 KB. El reporte
   sigue por debajo de lo que se comparte cómodamente por mensajería (D103).

   CACHÉ. La imagen se arma una vez por conjunto de puntos y se reutiliza entre la vista previa y
   el PDF; se vuelve a armar si cambian los registros. */
window.SRP = window.SRP || {};

SRP.croquis = {
  ANCHO: 1000, ALTO: 620,           // píxeles del lienzo; en el PDF ocupa el ancho útil de la hoja
  MARGEN: 0.14,                     // aire alrededor de los puntos, proporción del lienzo
  ZOOM_MAX: 19, ZOOM_UN_PUNTO: 18,
  ESPERA_MS: 8000,                  // lo que se espera a los mosaicos antes de ir sin imagen
  _cache: {},

  clave(registros) { return registros.map(r => r.id + ':' + r.lat.toFixed(6) + ',' + r.lng.toFixed(6)).join('|'); },

  /* ---------- Web Mercator ---------- */
  // Coordenada → píxel del mundo al zoom z (mosaicos de 256 px)
  aPixel(lat, lng, z) {
    const n = 256 * Math.pow(2, z);
    const x = (lng + 180) / 360 * n;
    const s = Math.sin(lat * Math.PI / 180);
    const y = (0.5 - Math.log((1 + s) / (1 - s)) / (4 * Math.PI)) * n;
    return { x, y };
  },

  metrosPorPixel(lat, z) { return 156543.03392 * Math.cos(lat * Math.PI / 180) / Math.pow(2, z); },

  /* El zoom más cercano en el que todos los puntos caben con aire; un solo punto va a un zoom fijo */
  encuadre(registros) {
    const lats = registros.map(r => r.lat), lngs = registros.map(r => r.lng);
    const cLat = (Math.min(...lats) + Math.max(...lats)) / 2, cLng = (Math.min(...lngs) + Math.max(...lngs)) / 2;
    let z = this.ZOOM_UN_PUNTO;
    if (registros.length > 1) {
      for (z = this.ZOOM_MAX; z > 10; z--) {
        const a = this.aPixel(Math.max(...lats), Math.min(...lngs), z), b = this.aPixel(Math.min(...lats), Math.max(...lngs), z);
        if (b.x - a.x <= this.ANCHO * (1 - 2 * this.MARGEN) && b.y - a.y <= this.ALTO * (1 - 2 * this.MARGEN)) break;
      }
    }
    const c = this.aPixel(cLat, cLng, z);
    return { z, lat: cLat, lng: cLng, origenX: c.x - this.ANCHO / 2, origenY: c.y - this.ALTO / 2 };
  },

  /* ---------- Mosaicos ---------- */
  cargarImagen(url) {
    return new Promise((res, rej) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';   // sin esto el lienzo queda «sucio» y no se puede exportar
      img.onload = () => res(img);
      img.onerror = () => rej(new Error('mosaico'));
      img.src = url;
    });
  },

  // Dibuja las capas del mapa en el lienzo. Devuelve false si la base no llegó completa.
  async dibujarMosaicos(ctx, enc) {
    if (!SRP.conexion.enLinea()) return false;
    const n = Math.pow(2, enc.z);
    const x0 = Math.floor(enc.origenX / 256), x1 = Math.floor((enc.origenX + this.ANCHO) / 256);
    const y0 = Math.floor(enc.origenY / 256), y1 = Math.floor((enc.origenY + this.ALTO) / 256);
    const tareas = [];
    SRP.CONFIG.MAPA.CAPAS.forEach(capa => {
      for (let x = x0; x <= x1; x++) for (let y = y0; y <= y1; y++) {
        if (y < 0 || y >= n) continue;
        const url = capa.url.replace('{z}', enc.z).replace('{x}', ((x % n) + n) % n).replace('{y}', y);
        tareas.push(this.cargarImagen(url).then(img => ({ capa, img, x, y }), () => ({ capa, img: null, x, y })));
      }
    });
    const limite = new Promise(res => setTimeout(() => res(null), this.ESPERA_MS));
    const resultado = await Promise.race([Promise.all(tareas), limite]);
    if (!resultado) return false;
    if (resultado.some(t => t.capa.base && !t.img)) return false;
    // Las capas van en su orden: primero la base, encima las de nombres (si alguna falta, no importa)
    resultado.forEach(t => { if (t.img) ctx.drawImage(t.img, t.x * 256 - enc.origenX, t.y * 256 - enc.origenY); });
    try { ctx.getImageData(0, 0, 1, 1); } catch (e) { return false; }   // lienzo sucio: el servidor no dio CORS
    return true;
  },

  /* ---------- Dibujo ---------- */
  fondoLiso(ctx) {
    const C = n => SRP.util.colorBase(n);   // los colores, de la hoja (M13)
    ctx.fillStyle = C('croquis-fondo');
    ctx.fillRect(0, 0, this.ANCHO, this.ALTO);
    ctx.strokeStyle = C('croquis-reticula'); ctx.lineWidth = 1;
    for (let x = 0; x < this.ANCHO; x += 100) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, this.ALTO); ctx.stroke(); }
    for (let y = 0; y < this.ALTO; y += 100) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(this.ANCHO, y); ctx.stroke(); }
  },

  puntos(ctx, registros, enc) {
    const C = n => SRP.util.colorBase(n);
    ctx.font = 'bold 17px Roboto, Arial, sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    registros.forEach((r, i) => {
      const p = this.aPixel(r.lat, r.lng, enc.z);
      const x = p.x - enc.origenX, y = p.y - enc.origenY;
      ctx.beginPath(); ctx.arc(x, y, 17, 0, Math.PI * 2);
      ctx.fillStyle = C('guinda'); ctx.fill();
      ctx.lineWidth = 2.5; ctx.strokeStyle = C('fondo'); ctx.stroke();
      ctx.fillStyle = C('fondo'); ctx.fillText(String(i + 1), x, y + 1);
    });
  },

  escalaYNorte(ctx, enc, conImagen) {
    const mpp = this.metrosPorPixel(enc.lat, enc.z);
    const opciones = [5, 10, 20, 50, 100, 200, 500, 1000, 2000];
    const metros = opciones.reduce((m, o) => (Math.abs(o / mpp - 140) < Math.abs(m / mpp - 140) ? o : m), opciones[0]);
    const largo = metros / mpp;
    const x = 24, y = this.ALTO - 26;
    const C = n => SRP.util.colorBase(n);
    ctx.lineWidth = 3; ctx.strokeStyle = C('texto');
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + largo, y); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x, y - 7); ctx.lineTo(x, y + 7); ctx.moveTo(x + largo, y - 7); ctx.lineTo(x + largo, y + 7); ctx.stroke();
    ctx.font = 'bold 14px Roboto, Arial, sans-serif'; ctx.textAlign = 'left'; ctx.textBaseline = 'bottom';
    this.textoConHalo(ctx, (metros >= 1000 ? metros / 1000 + ' km' : metros + ' m'), x, y - 9, conImagen);
    // Norte: flecha y letra arriba a la derecha
    const nx = this.ANCHO - 34, ny = 30;
    ctx.beginPath(); ctx.moveTo(nx, ny); ctx.lineTo(nx - 9, ny + 26); ctx.lineTo(nx, ny + 19); ctx.lineTo(nx + 9, ny + 26); ctx.closePath();
    ctx.fillStyle = C('texto'); ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = C('fondo'); ctx.stroke();
    ctx.font = 'bold 15px Roboto, Arial, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
    this.textoConHalo(ctx, 'N', nx, ny - 2, conImagen);
  },

  // Sobre la imagen de satélite el texto lleva halo blanco para leerse
  textoConHalo(ctx, texto, x, y, halo) {
    if (halo) { ctx.lineWidth = 4; ctx.strokeStyle = SRP.util.colorBase('velo-halo'); ctx.lineJoin = 'round'; ctx.strokeText(texto, x, y); }
    ctx.fillStyle = SRP.util.colorBase('texto'); ctx.fillText(texto, x, y);
  },

  // El crédito completo ya no cabe en un renglón (D152): se parte por « · » en los renglones que hagan falta
  pieDeImagen(ctx, texto, conImagen) {
    ctx.font = '12px Roboto, Arial, sans-serif'; ctx.textAlign = 'right'; ctx.textBaseline = 'bottom';
    const max = this.ANCHO * 0.6, renglones = [];   // a la derecha: la escala y el norte van a la izquierda
    texto.split(' · ').forEach(parte => {
      const ultimo = renglones[renglones.length - 1];
      if (ultimo && ctx.measureText(ultimo + ' · ' + parte).width <= max) renglones[renglones.length - 1] = ultimo + ' · ' + parte;
      else renglones.push(parte);
    });
    renglones.reverse().forEach((r, i) => {
      const base = this.ALTO - 4 - i * 16;
      if (conImagen) { ctx.fillStyle = SRP.util.colorBase('velo-pie'); const w = ctx.measureText(r).width + 12; ctx.fillRect(this.ANCHO - w, base - 16, w, 18); }
      ctx.fillStyle = SRP.util.colorBase('texto'); ctx.fillText(r, this.ANCHO - 6, base);
    });
  },

  /* ---------- Entrada ---------- */
  /* Devuelve { datos (data URL), formato ('JPEG'|'PNG'), conImagen, nota } o null si no hay lienzo.
     Se arma una vez por conjunto de puntos. */
  async generar(registros) {
    if (!registros.length || typeof document === 'undefined') return null;
    const clave = this.clave(registros);
    if (this._cache.clave === clave) return this._cache.valor;
    const lienzo = document.createElement('canvas');
    lienzo.width = this.ANCHO; lienzo.height = this.ALTO;
    const ctx = lienzo.getContext('2d');
    if (!ctx) return null;
    const enc = this.encuadre(registros);
    // Los mosaicos van a un lienzo aparte: si el servidor no permite copiarlos, ese lienzo queda
    // «sucio» para siempre y el principal se conserva limpio
    let conImagen = false;
    try {
      const base = document.createElement('canvas');
      base.width = this.ANCHO; base.height = this.ALTO;
      conImagen = await this.dibujarMosaicos(base.getContext('2d'), enc);
      if (conImagen) ctx.drawImage(base, 0, 0);
    } catch (e) { conImagen = false; }
    if (!conImagen) this.fondoLiso(ctx);
    this.puntos(ctx, registros, enc);
    this.escalaYNorte(ctx, enc, conImagen);
    const credito = SRP.CONFIG.MAPA.CAPAS.filter(c => c.atribucion).map(c => c.atribucion).concat(SRP.CONFIG.MAPA.CREDITO_PROVEEDOR).join(' · ');
    this.pieDeImagen(ctx, conImagen ? credito : 'Sin imagen de fondo: se generó sin conexión', conImagen);
    let valor;
    try {
      valor = conImagen
        ? { datos: lienzo.toDataURL('image/jpeg', 0.78), formato: 'JPEG', conImagen: true,
            nota: 'Puntos numerados en el orden de la tabla de ejemplares. ' + credito + '.' }
        : { datos: lienzo.toDataURL('image/png'), formato: 'PNG', conImagen: false,
            nota: 'Puntos numerados en el orden de la tabla de ejemplares. Sin imagen de fondo: el croquis se generó sin conexión.' };
    } catch (e) { return null; }
    this._cache = { clave, valor };
    return valor;
  }
};
