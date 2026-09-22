/* MAPA: ubicación del árbol.
   Pan con dos dedos (gestureHandling) para no pelear con el desplazamiento de la página;
   acercar y alejar con los botones +/−. Si el mapa base no carga, el punto se puede
   colocar igual o capturarse a mano (Norma 6.8 y 6.10). */
window.SRP = window.SRP || {};

SRP.mapa = {
  mapa: null, marcador: null, lat: null, lng: null, alCambiar: null,
  origen: null, precision: null,

  /* DE DÓNDE SALIÓ EL PUNTO.
     Cuando la fotografía es opcional —y en campo la mayoría de los registros no va a
     llevarla—, la coordenada carga con el peso de la prueba. Y no todas las coordenadas
     valen lo mismo: una tomada con el aparato en la mano junto al árbol no es lo mismo que
     una señalada en el mapa desde una oficina tres días después. El sistema ya sabe cuál de
     las cuatro fue; lo que faltaba era guardarlo. Es un dato que sólo existe en el instante
     de la captura: si no se escribe entonces, no se reconstruye nunca. */
  ORIGENES: {
    gps:      'GPS del dispositivo',
    mapa:     'Señalado en el mapa',
    manual:   'Capturado a mano',
    ajustado: 'Ajustado arrastrando el pin'
  },

  /* La precisión acompaña al origen y sólo tiene sentido con él: se guarda únicamente
     cuando el punto viene del GPS, así que nunca puede leerse como el margen de error de un
     punto que en realidad se señaló con el dedo. La auditoría comprueba esa regla. */
  textoOrigen(origen, precision) {
    const etiqueta = SRP.mapa.ORIGENES[origen];
    if (!etiqueta) return 'No registrado';
    return etiqueta + (origen === 'gps' && precision != null ? ' (±' + Math.round(precision) + ' m)' : '');
  },

  // Icono propio e incrustado: el de Leaflet se descarga de un servidor externo
  ICONO_SVG: '<svg width="24" height="32" viewBox="0 0 36 48" aria-hidden="true">' +
    '<path d="M18 2C9.2 2 2 9.1 2 17.9 2 30 18 46 18 46s16-16 16-28.1C34 9.1 26.8 2 18 2z" fill="#9D2148" stroke="#fff" stroke-width="2.5"/>' +
    '<circle cx="18" cy="18" r="6.5" fill="#fff" stroke="#B28E5C" stroke-width="3"/></svg>',

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
    // Sólo la capa de imagen avisa si no carga: las de nombres son complemento, y su ausencia
    // no impide colocar el punto.
    let fallas = 0;
    c.CAPAS.forEach(capa => {
      const capaLeaflet = L.tileLayer(capa.url, { attribution: capa.atribucion, maxZoom: c.ZOOM_MAX });
      if (capa.base) {
        capaLeaflet.on('tileerror', () => {
          fallas += 1;
          if (fallas === 3) this.estado('La imagen del mapa no cargó. Puede tocar el mapa para colocar el punto o capturar coordenadas a mano.', 'alerta');
        });
      }
      capaLeaflet.addTo(this.mapa);
    });
    // La punta del pin marca la coordenada exacta: el anclaje va en ella, no en el centro
    this.icono = L.divIcon({ className: 'pin', html: this.ICONO_SVG, iconSize: [24, 32], iconAnchor: [12, 31] });
    this.mapa.on('click', (e) => this.colocar(e.latlng.lat, e.latlng.lng, 'Punto colocado en el mapa.', { origen: 'mapa' }));
  },

  // Mientras se busca la señal, el botón avisa que está trabajando
  marcarBuscando(buscando) {
    const b = document.getElementById('btn-ubicacion');
    if (!b) return;
    b.disabled = buscando;
    b.setAttribute('aria-busy', String(buscando));
    if (buscando) b.innerHTML = SRP.ICONOS.svg('ubicacion', 20) + '<span>Buscando señal…</span>';
    else this.refrescarBotonUbicacion();
  },

  /* EL BOTÓN CAMBIA CON EL ESTADO DEL PUNTO.
     Sin punto es la acción principal de la pantalla: guinda relleno, icono de ubicación, y
     dice que va a registrarlo. Con punto puesto ya no se está capturando sino corrigiendo:
     dorado y la palabra «Actualizar». El icono es el mismo de ubicación en los dos estados
     (D48): el color no va solo porque el texto cambia (Norma 8.4). Así nadie vuelve a pulsarlo
     creyendo que aún no hay punto. */
  aparienciaBotonUbicacion() {
    return this.lat === null
      ? { clase: 'btn btn-primario btn-ancho', icono: 'ubicacion', texto: 'Registrar ubicación del punto' }
      : { clase: 'btn btn-editar btn-ancho',   icono: 'ubicacion', texto: 'Actualizar ubicación con mi posición' };
  },

  refrescarBotonUbicacion() {
    const b = document.getElementById('btn-ubicacion');
    if (!b || b.disabled) return;
    const a = this.aparienciaBotonUbicacion();
    b.className = a.clase;
    b.innerHTML = SRP.ICONOS.svg(a.icono, 20) + '<span>' + a.texto + '</span>';
  },

  estado(texto, tipo) {
    const p = document.getElementById('mapa-estado');
    p.textContent = texto;
    p.dataset.tipo = tipo || 'normal';
  },

  /* Coloca el punto y deja constancia de cómo llegó ahí.
     `op`: { origen, precision, centrar }. El origen es obligatorio en la práctica: sin él el
     registro no puede decir de dónde salió su coordenada. Devuelve false si cae fuera del ámbito. */
  colocar(lat, lng, mensaje, op) {
    op = op || {};
    if (!SRP.derivacion.dentroDelAmbito(lat, lng)) {
      this.estado('El punto está fuera de la Ciudad de México. Ubíquelo dentro del territorio.', 'alerta');
      return false;
    }
    this.lat = Number(lat.toFixed(6));
    this.lng = Number(lng.toFixed(6));
    this.origen = op.origen || null;
    // Sólo el GPS tiene precisión. Al mover el punto a mano, el margen del aparato deja de
    // describirlo, así que se borra en vez de quedarse mintiendo sobre la coordenada nueva.
    this.precision = op.origen === 'gps' && op.precision != null ? Math.round(op.precision) : null;
    if (this.mapa) {
      if (!this.marcador) {
        this.marcador = L.marker([this.lat, this.lng], { icon: this.icono, draggable: true, keyboard: true, title: 'Ubicación del árbol' }).addTo(this.mapa);
        this.marcador.on('dragend', () => {
          const p = this.marcador.getLatLng();
          this.colocar(p.lat, p.lng, 'Punto ajustado.', { origen: 'ajustado' });
        });
      } else {
        this.marcador.setLatLng([this.lat, this.lng]);
      }
      if (op.centrar) this.mapa.setView([this.lat, this.lng], Math.max(this.mapa.getZoom(), SRP.CONFIG.MAPA.ZOOM_PUNTO));
    }
    // Sin la coordenada: la franja dice qué pasó, y el dato vive en su campo del formulario
    this.estado(mensaje);
    this.refrescarBotonUbicacion();
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
          'Ubicación obtenida (precisión ±' + Math.round(pos.coords.accuracy) + ' m).',
          { origen: 'gps', precision: pos.coords.accuracy, centrar: true });
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
    this.origen = null; this.precision = null;
    this.refrescarBotonUbicacion();
  },

  // Leaflet necesita recalcular su tamaño cuando su contenedor pasa de oculto a visible
  refrescar() { if (this.mapa) setTimeout(() => this.mapa.invalidateSize(), 50); },

  /* Mapa de sólo lectura con un punto, para las fichas: confirma de un vistazo que el árbol
     está donde debe. Devuelve la instancia; quien la abre se encarga de destruirla al cerrar,
     porque un mapa vivo dentro de un diálogo oculto sigue contando como mapa. */
  estatico(idContenedor, lat, lng) {
    if (typeof L === 'undefined') return null;
    const c = SRP.CONFIG.MAPA;
    const m = L.map(idContenedor, {
      center: [lat, lng], zoom: c.ZOOM_PUNTO, zoomControl: false, attributionControl: false,
      dragging: false, scrollWheelZoom: false, doubleClickZoom: false, touchZoom: false, keyboard: false
    });
    c.CAPAS.forEach(capa => L.tileLayer(capa.url, { maxZoom: c.ZOOM_MAX }).addTo(m));
    L.marker([lat, lng], { icon: this.icono, interactive: false }).addTo(m);
    setTimeout(() => m.invalidateSize(), 60);
    return m;
  }
};
