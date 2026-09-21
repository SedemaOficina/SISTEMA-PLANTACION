/* CONFIGURACIÓN ÚNICA DEL SISTEMA
   Todo valor que cambie entre ambientes vive aquí (Norma 1.6). Si al publicar en otro
   sitio hay que tocar otro archivo, el diseño está mal. */
window.SRP = window.SRP || {};

SRP.CONFIG = {
  VERSION: '0.1.0 (Bloque 1)',

  // Mientras sea true: aviso visible de datos ficticios y herramientas de prueba
  // (cambiar de perfil, restablecer datos). En producción debe ser false.
  ES_FICTICIO: true,

  DB_NOMBRE: 'srp_db',
  DB_VERSION: 1,
  CLAVE_SESION: 'srp_sesion_usuario_id',

  // [pendiente] Fase 2: proveedor institucional de identidad. Hoy el acceso es simulado.
  AUTENTICACION: { PROVEEDOR: 'simulado' },

  MAPA: {
    CENTRO: [19.4326, -99.1332],        // [latitud, longitud]: orden de Leaflet, no de GeoJSON
    ZOOM_INICIAL: 12,
    ZOOM_MIN: 10,
    ZOOM_MAX: 19,
    ZOOM_PUNTO: 17,
    LIMITES: [[19.04, -99.37], [19.60, -98.94]],   // ámbito CDMX; fuera de aquí el punto no es válido
    // [pendiente] OpenStreetMap no admite uso institucional intensivo: definir proveedor antes de producción.
    MOSAICOS_URL: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
    MOSAICOS_ATRIBUCION: '&copy; colaboradores de OpenStreetMap',
    GPS_ESPERA_MS: 15000
  },

  FOTO: { ANCHO_MAX: 800, ALTO_MAX: 600, CALIDAD: 0.7 },

  LISTA_PAGINA: 20
};
