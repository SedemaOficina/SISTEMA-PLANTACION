/* MAPA: ubicación del árbol.
   Pan con dos dedos (gestureHandling) para no pelear con el desplazamiento de la página;
   acercar y alejar con los botones +/−. Si el mapa base no carga, el punto se puede
   colocar igual o capturarse a mano (Norma 6.8 y 6.10). */
window.SRP = window.SRP || {};

SRP.mapa = {
  mapa: null, marcador: null, lat: null, lng: null, alCambiar: null,

  // Icono propio e incrustado: el de Leaflet se descarga de un servidor externo
  ICONO_SVG: '<svg width="36" height="48" viewBox="0 0 36 48" aria-hidden="true">' +
    '<path d="M18 2C9.2 2 2 9.1 2 17.9 2 30 18 46 18 46s16-16 16-28.1C34 9.1 26.8 2 18 2z" fill="#9D2148" stroke="#fff" stroke-width="2"/>' +
    '<circle cx="18" cy="18" r="6.5" fill="#fff" stroke="#B28E5C" stroke-width="2.5"/></svg>',

  iniciar(alCambiar) {
    this.alCambiar = alCambiar;
    if (typeof L === 'undefined') {
      this.estado('No se pudo cargar el mapa. Capture las coordenadas a mano.', 'alerta');
      return;
    }
    const c = SRP.CONFIG.MAPA;
    this.mapa = L.map('mapa', {
      center: c.CENTRO, zoom: c.ZOOM_INICIAL, minZoom: c.ZOOM_MIN, maxZoom: c.ZOOM_MAX,
      maxBounds: c.LIMITES, maxBoundsViscosity: 1, gestureHandling: true
    });
    let fallas = 0;
    L.tileLayer(c.MOSAICOS_URL, { attribution: c.MOSAICOS_ATRIBUCION, maxZoom: c.ZOOM_MAX })
      .on('tileerror', () => {
        fallas += 1;
        if (fallas === 3) this.estado('El mapa base no cargó. Puede tocar el mapa para colocar el punto o capturar coordenadas a mano.', 'alerta');
      })
      .addTo(this.mapa);
    this.icono = L.divIcon({ className: 'pin', html: this.ICONO_SVG, iconSize: [36, 48], iconAnchor: [18, 46] });
    this.mapa.on('click', (e) => this.colocar(e.latlng.lat, e.latlng.lng, 'Punto colocado en el mapa.'));
    this.agregarControlUbicacion();
  },

  /* Control de ubicación dentro del mapa, abajo a la derecha: queda al alcance del pulgar
     mientras se sostiene el teléfono, que es como se usa en campo. */
  agregarControlUbicacion() {
    const Control = L.Control.extend({
      options: { position: 'bottomright' },
      onAdd: () => {
        const b = L.DomUtil.create('button', 'ctrl-ubicacion');
        b.type = 'button';
        b.title = 'Usar mi ubicación';
        b.setAttribute('aria-label', 'Usar mi ubicación');
        b.innerHTML = '<svg viewBox="0 0 24 24" width="26" height="26" aria-hidden="true" focusable="false">' +
          '<path fill="currentColor" d="M12 8a4 4 0 100 8 4 4 0 000-8zm8.94 3a9 9 0 00-7.94-7.94V1h-2v2.06A9 9 0 003.06 11H1v2h2.06A9 9 0 0011 20.94V23h2v-2.06A9 9 0 0020.94 13H23v-2h-2.06zM12 19a7 7 0 110-14 7 7 0 010 14z"/></svg>';
        L.DomEvent.disableClickPropagation(b);
        L.DomEvent.on(b, 'click', (e) => { L.DomEvent.stop(e); this.ubicar(); });
        return b;
      }
    });
    this.controlUbicacion = new Control().addTo(this.mapa);
  },

  // Mientras se busca la señal, el control avisa que está trabajando
  marcarBuscando(buscando) {
    const b = document.querySelector('.ctrl-ubicacion');
    if (!b) return;
    b.disabled = buscando;
    b.setAttribute('aria-busy', String(buscando));
  },

  estado(texto, tipo) {
    const p = document.getElementById('mapa-estado');
    p.textContent = texto;
    p.dataset.tipo = tipo || 'normal';
  },

  // Devuelve false si el punto está fuera del ámbito
  colocar(lat, lng, mensaje, centrar) {
    if (!SRP.derivacion.dentroDelAmbito(lat, lng)) {
      this.estado('El punto está fuera de la Ciudad de México. Ubíquelo dentro del territorio.', 'alerta');
      return false;
    }
    this.lat = Number(lat.toFixed(6));
    this.lng = Number(lng.toFixed(6));
    if (this.mapa) {
      if (!this.marcador) {
        this.marcador = L.marker([this.lat, this.lng], { icon: this.icono, draggable: true, keyboard: true, title: 'Ubicación del árbol' }).addTo(this.mapa);
        this.marcador.on('dragend', () => { const p = this.marcador.getLatLng(); this.colocar(p.lat, p.lng, 'Punto ajustado.'); });
      } else {
        this.marcador.setLatLng([this.lat, this.lng]);
      }
      if (centrar) this.mapa.setView([this.lat, this.lng], Math.max(this.mapa.getZoom(), SRP.CONFIG.MAPA.ZOOM_PUNTO));
    }
    this.estado(mensaje + ' ' + this.lat.toFixed(6) + ', ' + this.lng.toFixed(6));
    if (this.alCambiar) this.alCambiar(this.lat, this.lng);
    return true;
  },

  ubicar() {
    if (!navigator.geolocation) {
      this.estado('Este dispositivo no ofrece ubicación. Toque el mapa o capture coordenadas.', 'alerta');
      return;
    }
    this.estado('Obteniendo su ubicación…');
    this.marcarBuscando(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        this.marcarBuscando(false);
        this.colocar(pos.coords.latitude, pos.coords.longitude,
          'Ubicación obtenida (precisión ±' + Math.round(pos.coords.accuracy) + ' m).', true);
      },
      (err) => {
        this.marcarBuscando(false);
        const motivo = err.code === 1 ? 'no se concedió el permiso de ubicación'
          : err.code === 3 ? 'la señal tardó demasiado' : 'no hay señal de ubicación';
        this.estado('No se obtuvo la ubicación: ' + motivo + '. Toque el mapa o capture coordenadas.', 'alerta');
      },
      { enableHighAccuracy: true, timeout: SRP.CONFIG.MAPA.GPS_ESPERA_MS, maximumAge: 0 }
    );
  },

  limpiar() {
    if (this.marcador) { this.marcador.remove(); this.marcador = null; }
    this.lat = null; this.lng = null;
  },

  // Leaflet necesita recalcular su tamaño cuando su contenedor pasa de oculto a visible
  refrescar() { if (this.mapa) setTimeout(() => this.mapa.invalidateSize(), 50); }
};
