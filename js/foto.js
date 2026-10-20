/* FOTOGRAFÍA: compresión en el dispositivo antes de guardar.
   Lado mayor ≤ 800 px y lado menor ≤ 600 px, JPEG calidad 0.7 (CONFIG.FOTO).

   DE DÓNDE SALE LA QUE SE VE. La de un árbol que guarda el teléfono va dentro del registro. Con datos reales,
   la de lo ya enviado vive en el servidor: se pide por su foto_id sólo cuando se ve o se descarga, y ni el
   teléfono ni el navegador guardan copia. Una que el servidor no tiene —todavía no llega, o ya no se ve— no se
   enseña rota: se quita. */
window.SRP = window.SRP || {};

SRP.foto = {
  // Peso real de lo que se guarda, calculado del texto base64: cada 4 caracteres son 3 bytes
  pesoDe(dataUrl) {
    const b64 = dataUrl.slice(dataUrl.indexOf(',') + 1);
    const relleno = (b64.endsWith('==') ? 2 : b64.endsWith('=') ? 1 : 0);
    return Math.round(b64.length * 3 / 4) - relleno;
  },

  /* ---------- La que se ve ---------- */

  UUID: /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,

  // Lo que va en el src de la imagen; vacío si el árbol no tiene fotografía
  fuente(r) {
    const local = SRP.util.fotoSegura(r && r.foto_base64);
    if (local) return local;
    return r && SRP.remoto.activo() && this.UUID.test(String(r.foto_id || '')) ? SRP.CONFIG.API + '/fotos/' + r.foto_id : '';
  },

  // Los atributos de la imagen, con la marca que deja quitarla si el servidor no la tiene
  atributos(r) {
    const src = this.fuente(r);
    return 'src="' + src + '"' + (src.startsWith('data:') ? '' : ' data-foto-servidor');
  },

  // Los bytes y el tipo, para descargarla; null si no se pudo
  async bytes(r) {
    const local = SRP.util.fotoSegura(r.foto_base64);
    if (local) {
      const bin = atob(local.slice(local.indexOf(',') + 1));
      const datos = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) datos[i] = bin.charCodeAt(i);
      return { datos, tipo: local.slice(5, local.indexOf(';')) };
    }
    const src = this.fuente(r);
    if (!src) return null;
    try {
      const x = await fetch(src, { credentials: 'same-origin', cache: 'no-store' });
      return x.ok ? { datos: new Uint8Array(await x.arrayBuffer()), tipo: x.headers.get('content-type') || 'image/jpeg' } : null;
    } catch (e) {
      return null;
    }
  },

  /* Una del servidor que no llegó se quita; si a su lado está la miniatura vacía, ésa aparece, y en Fotografías
     se va el cuadro entero */
  iniciar() {
    document.addEventListener('error', (e) => {
      const img = e.target;
      if (!(img instanceof HTMLImageElement) || !('fotoServidor' in img.dataset)) return;
      img.hidden = true;
      const vacia = img.nextElementSibling;
      if (vacia && vacia.classList.contains('registro-sin-foto')) vacia.hidden = false;
      const cuadro = img.closest('.galeria-foto');
      if (cuadro) cuadro.closest('li').hidden = true;
    }, true);
  },

  formatearPeso(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(0) + ' KB';
    if (bytes < 1024 * 1024 * 1024) return (bytes / 1024 / 1024).toFixed(1) + ' MB';
    return (bytes / 1024 / 1024 / 1024).toFixed(1) + ' GB';   // el espacio del teléfono, en la guía
  },

  /* HEIC, el formato de las fotografías del iPhone: Safari la abre, y en el iPhone el navegador la entrega
     ya en JPEG; en computadora muchos navegadores no la abren, ni dicen que es una imagen. Se reconoce por
     el nombre o el tipo, para decir qué hacer con ella. */
  esHeic(archivo) { return /^image\/hei[cf]/.test(archivo.type) || /\.hei[cf]$/i.test(archivo.name || ''); },
  AVISO_HEIC: 'La fotografía está en formato HEIC, el de los iPhone, y este navegador no la puede abrir: guárdela como JPG o súbala desde el teléfono.',

  comprimir(archivo) {
    return new Promise((resolver, rechazar) => {
      // `guia`: el mensaje ya dice qué hacer
      const heic = archivo && this.esHeic(archivo), noSePuede = () => Object.assign(new Error(this.AVISO_HEIC), { guia: true });
      if (!archivo || !(archivo.type.startsWith('image/') || heic)) { rechazar(new Error('El archivo no es una imagen.')); return; }
      const url = URL.createObjectURL(archivo);
      const img = new Image();
      img.onload = () => {
        const { ANCHO_MAX, ALTO_MAX, CALIDAD } = SRP.CONFIG.FOTO;
        const vertical = img.naturalHeight > img.naturalWidth;
        const limiteAncho = vertical ? ALTO_MAX : ANCHO_MAX;
        const limiteAlto = vertical ? ANCHO_MAX : ALTO_MAX;
        const escala = Math.min(1, limiteAncho / img.naturalWidth, limiteAlto / img.naturalHeight);
        const lienzo = document.createElement('canvas');
        lienzo.width = Math.round(img.naturalWidth * escala);
        lienzo.height = Math.round(img.naturalHeight * escala);
        const g = lienzo.getContext('2d');
        // El JPEG no tiene transparencia: lo transparente de un PNG queda blanco, no negro
        g.fillStyle = SRP.util.colorBase('fondo'); g.fillRect(0, 0, lienzo.width, lienzo.height);
        g.drawImage(img, 0, 0, lienzo.width, lienzo.height);
        URL.revokeObjectURL(url);
        const datos = lienzo.toDataURL('image/jpeg', CALIDAD);
        resolver({ datos, nombre: archivo.name, bytes: SRP.foto.pesoDe(datos) });
      };
      img.onerror = () => { URL.revokeObjectURL(url); rechazar(heic ? noSePuede() : new Error('No se pudo leer la imagen.')); };
      img.src = url;
    });
  }
};
