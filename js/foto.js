/* FOTOGRAFÍA: compresión en el dispositivo antes de guardar.
   Lado mayor ≤ 800 px y lado menor ≤ 600 px, JPEG calidad 0.7 (CONFIG.FOTO). */
window.SRP = window.SRP || {};

SRP.foto = {
  comprimir(archivo) {
    return new Promise((resolver, rechazar) => {
      if (!archivo || !archivo.type.startsWith('image/')) { rechazar(new Error('El archivo no es una imagen.')); return; }
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
        lienzo.getContext('2d').drawImage(img, 0, 0, lienzo.width, lienzo.height);
        URL.revokeObjectURL(url);
        resolver(lienzo.toDataURL('image/jpeg', CALIDAD));
      };
      img.onerror = () => { URL.revokeObjectURL(url); rechazar(new Error('No se pudo leer la imagen.')); };
      img.src = url;
    });
  }
};
