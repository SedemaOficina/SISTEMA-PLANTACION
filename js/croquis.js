/* CROQUIS DE LA JORNADA PARA EL REPORTE (D115).

   Una imagen con los puntos de la jornada numerados en el mismo orden que la tabla «Ejemplares
   registrados», para la vista previa y el PDF. Con conexión lleva de fondo la imagen de satélite
   (los mismos mosaicos del mapa); sin ella, o si los mosaicos no llegan a tiempo o el servidor no
   permite copiarlos a un lienzo, va sobre fondo liso y lo dice. En los dos casos: puntos, números,
   barra de escala y norte.

   PESO. Sin imagen es un PNG de unos pocos KB; con imagen, un JPEG de 60–120 KB. El reporte
   sigue por debajo de lo que se comparte cómodamente por mensajería (D103).

   CACHÉ. La imagen se arma una vez por conjunto de puntos y se reutiliza entre la vista previa y
   el PDF; se vuelve a armar si cambian los registros.

   QUE SE VEAN TODOS (D163). El encuadre busca el acercamiento mayor en el que caben todos los
   puntos con aire alrededor, hasta el 20: más allá de lo que da el satélite (19) el mosaico se
   amplía. Si al acercamiento elegido le faltan mosaicos, se prueba uno o dos niveles más lejos
   antes de ir sin imagen. Los árboles plantados a un par de metros quedarían encimados: el
   círculo se achica cuando son muchos y, si aun así se tocan, cada número se aparta lo justo y
   una línea fina lo une a su punto. */
window.SRP = window.SRP || {};

SRP.croquis = {
  ANCHO: 1000, ALTO: 620,           // píxeles del lienzo; en el PDF ocupa el ancho útil de la hoja
  MARGEN: 0.14,                     // aire alrededor de los puntos, proporción del lienzo
  ZOOM_MAX: 20, ZOOM_UN_PUNTO: 18,
  NATIVO: 19,                       // el acercamiento más alto que da la imagen de satélite
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

  /* El acercamiento exacto en el que todos los puntos llenan el lienzo con aire alrededor (D163).
     Puede ser fraccionario (17.4): los mosaicos del nivel entero se amplían lo que falte. Antes se
     usaban sólo niveles enteros y los puntos podían quedar en la mitad del croquis. Un solo punto,
     o todos en el mismo lugar, va a un acercamiento fijo. */
  encuadre(registros) {
    const lats = registros.map(r => r.lat), lngs = registros.map(r => r.lng);
    const cLat = (Math.min(...lats) + Math.max(...lats)) / 2, cLng = (Math.min(...lngs) + Math.max(...lngs)) / 2;
    let z = this.ZOOM_UN_PUNTO;
    if (registros.length > 1) {
      const a = this.aPixel(Math.max(...lats), Math.min(...lngs), 0), b = this.aPixel(Math.min(...lats), Math.max(...lngs), 0);
      const zx = (b.x - a.x) > 0 ? Math.log2(this.ANCHO * (1 - 2 * this.MARGEN) / (b.x - a.x)) : Infinity;
      const zy = (b.y - a.y) > 0 ? Math.log2(this.ALTO * (1 - 2 * this.MARGEN) / (b.y - a.y)) : Infinity;
      z = Math.max(10, Math.min(this.ZOOM_MAX, zx, zy));
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

  /* Dibuja las capas del mapa en el lienzo con los mosaicos del nivel `tz` (igual o más lejano que
     el del encuadre: cada mosaico se amplía 2^(z−tz) veces). Devuelve 'ok', o por qué no:
     'sin-red', 'tiempo', 'faltan' (la base no llegó completa) o 'cors'. */
  async dibujarMosaicos(ctx, enc, tz) {
    if (!SRP.conexion.enLinea()) return 'sin-red';
    const n = Math.pow(2, tz), lado = 256 * Math.pow(2, enc.z - tz);
    const x0 = Math.floor(enc.origenX / lado), x1 = Math.floor((enc.origenX + this.ANCHO) / lado);
    const y0 = Math.floor(enc.origenY / lado), y1 = Math.floor((enc.origenY + this.ALTO) / lado);
    const tareas = [];
    SRP.CONFIG.MAPA.CAPAS.forEach(capa => {
      for (let x = x0; x <= x1; x++) for (let y = y0; y <= y1; y++) {
        if (y < 0 || y >= n) continue;
        const url = capa.url.replace('{z}', tz).replace('{x}', ((x % n) + n) % n).replace('{y}', y);
        tareas.push(this.cargarImagen(url).then(img => ({ capa, img, x, y }), () => ({ capa, img: null, x, y })));
      }
    });
    const limite = new Promise(res => setTimeout(() => res(null), this.ESPERA_MS));
    const resultado = await Promise.race([Promise.all(tareas), limite]);
    if (!resultado) return 'tiempo';
    if (resultado.some(t => t.capa.base && !t.img)) return 'faltan';
    // Las capas van en su orden: primero la base, encima las de nombres (si alguna falta, no importa)
    resultado.forEach(t => { if (t.img) ctx.drawImage(t.img, t.x * lado - enc.origenX, t.y * lado - enc.origenY, lado, lado); });
    try { ctx.getImageData(0, 0, 1, 1); } catch (e) { return 'cors'; }   // lienzo sucio: el servidor no dio CORS
    return 'ok';
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

  // El radio del círculo numerado: más chico cuantos más puntos (D163)
  radio(n) { return n > 40 ? 11 : n > 20 ? 13 : 16; },

  /* Aparta los círculos que se enciman (D163): cada par que se toca se separa a lo largo de la
     línea que los une, lo justo, hasta que ninguno toca a otro o se agotan las vueltas; siempre
     dentro del lienzo. Dos puntos exactamente iguales se abren en abanico, por su número. */
  acomodar(pos, r) {
    const p = pos.map(q => ({ x: q.x, y: q.y }));
    const min = 2 * r + 3;
    for (let vuelta = 0; vuelta < 150; vuelta++) {
      let movio = false;
      for (let i = 0; i < p.length; i++) {
        for (let k = i + 1; k < p.length; k++) {
          const dx = p[k].x - p[i].x, dy = p[k].y - p[i].y, d = Math.hypot(dx, dy);
          if (d >= min) continue;
          const ux = d > 0.01 ? dx / d : Math.cos(k * 2.4), uy = d > 0.01 ? dy / d : Math.sin(k * 2.4);
          const paso = (min - d) / 2 + 0.2;
          p[i].x -= ux * paso; p[i].y -= uy * paso; p[k].x += ux * paso; p[k].y += uy * paso;
          movio = true;
        }
      }
      p.forEach(q => { q.x = Math.min(this.ANCHO - r - 3, Math.max(r + 3, q.x)); q.y = Math.min(this.ALTO - r - 3, Math.max(r + 3, q.y)); });
      if (!movio) break;
    }
    return p;
  },

  puntos(ctx, registros, enc) {
    const C = n => SRP.util.colorBase(n);
    const r = this.radio(registros.length);
    const reales = registros.map(reg => { const q = this.aPixel(reg.lat, reg.lng, enc.z); return { x: q.x - enc.origenX, y: q.y - enc.origenY }; });
    const pos = this.acomodar(reales, r);
    // Primero las líneas y el punto real de los que se apartaron; encima, los círculos
    reales.forEach((q, i) => {
      if (Math.hypot(pos[i].x - q.x, pos[i].y - q.y) < 3) return;
      ctx.beginPath(); ctx.moveTo(q.x, q.y); ctx.lineTo(pos[i].x, pos[i].y);
      ctx.lineWidth = 4; ctx.strokeStyle = C('fondo'); ctx.stroke();
      ctx.lineWidth = 1.6; ctx.strokeStyle = C('pdf-guinda'); ctx.stroke();
      ctx.beginPath(); ctx.arc(q.x, q.y, 3.5, 0, Math.PI * 2);
      ctx.fillStyle = C('pdf-guinda'); ctx.fill(); ctx.lineWidth = 1.5; ctx.strokeStyle = C('fondo'); ctx.stroke();
    });
    ctx.font = 'bold ' + (r + 1) + 'px Roboto, Arial, sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    pos.forEach((q, i) => {
      ctx.beginPath(); ctx.arc(q.x, q.y, r, 0, Math.PI * 2);
      ctx.fillStyle = C(registros[i].sustituye_id ? 'sustituto' : 'pdf-guinda'); ctx.fill();
      ctx.lineWidth = 2.5; ctx.strokeStyle = C('fondo'); ctx.stroke();
      ctx.fillStyle = C('fondo'); ctx.fillText(String(i + 1), q.x, q.y + 1);
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
      // Si al nivel del encuadre le faltan mosaicos, uno o dos niveles más lejos (ampliados) (D163)
      const tope = Math.min(Math.floor(enc.z), this.NATIVO);
      for (let tz = tope; tz >= tope - 2 && !conImagen; tz--) {
        const base = document.createElement('canvas');
        base.width = this.ANCHO; base.height = this.ALTO;
        const res = await this.dibujarMosaicos(base.getContext('2d'), enc, tz);
        if (res === 'ok') { ctx.drawImage(base, 0, 0); conImagen = true; }
        else if (res !== 'faltan') break;
      }
    } catch (e) { conImagen = false; }
    if (!conImagen) this.fondoLiso(ctx);
    this.puntos(ctx, registros, enc);
    this.escalaYNorte(ctx, enc, conImagen);
    const credito = SRP.CONFIG.MAPA.CAPAS.filter(c => c.atribucion).map(c => c.atribucion).concat(SRP.CONFIG.MAPA.CREDITO_PROVEEDOR).join(' · ');
    // El crédito y el aviso de «sin imagen» van en el texto bajo el croquis (`nota`), no también sobre la imagen
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
