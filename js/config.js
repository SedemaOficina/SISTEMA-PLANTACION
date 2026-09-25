/* CONFIGURACIÓN ÚNICA DEL SISTEMA
   Todo valor que cambie entre ambientes vive aquí (Norma 1.6). Si al publicar en otro
   sitio hay que tocar otro archivo, el diseño está mal. */
window.SRP = window.SRP || {};

// La versión se lee de la marca ?v= con que index.html pide este archivo: un solo lugar
// donde escribirla (Norma 10.2). Si falta la marca, se dice, porque sin ella el navegador
// puede estar sirviendo una mezcla de versiones.
SRP.CONFIG = {
  VERSION: (function () {
    const src = document.currentScript ? document.currentScript.src : '';
    const m = src.match(/[?&]v=([^&]+)/);
    return m ? decodeURIComponent(m[1]) : 'sin marca de versión';
  })(),
  ETAPA: 'Bloque 91',

  // Mientras sea true: aviso visible de datos ficticios y herramientas de prueba
  // (cambiar de perfil, restablecer datos). En producción debe ser false.
  ES_FICTICIO: true,

  DB_NOMBRE: 'srp_db',

  /* SELLO DE LOS DATOS DE PRUEBA. Se cambia cada vez que cambian los datos ficticios o el
     significado de alguno de sus campos. El dispositivo guarda el sello con el que sembró; si
     no coincide con este, vuelve a sembrar. Sin esto, un teléfono que ya había abierto el
     sistema se queda con los datos anteriores: al renombrar los perfiles, todas las cuentas
     aparecían con un perfil que ya no existía. */
  SELLO_DATOS: '2026-09-23-jornadas',   // bloque 62: los registros de prueba anteriores no llevan jornada y se descartan (D119)
  CLAVE_SELLO: 'srp_sello_datos',
  DB_VERSION: 2,   // 2: tabla jornadas, sin cierres (D119)
  CLAVE_SESION: 'srp_sesion_usuario_id',
  CLAVE_CONTRASTE: 'srp_contraste',
  CLAVE_ULTIMO_RESPALDO: 'srp_ultimo_respaldo',   // fecha del último respaldo de este teléfono (D149)
  RESPALDO_MAX_MB: 60,   // un respaldo más grande no se lee: protege la memoria del teléfono (D150)
  CLAVE_SECUENCIAS_PRUEBA: 'srp_secuencias_folio_prueba',   // secuencias del servidor simulado (D110)
  // Envío simulado (D111): lo «recibido» por el servidor de prueba y el interruptor «Simular sin señal»
  CLAVE_ENVIOS_PRUEBA: 'srp_envios_prueba',
  CLAVE_SIN_SENAL_PRUEBA: 'srp_sin_senal_prueba',
  DEMORA_ENVIO_PRUEBA_MS: 1200,     // lo que tarda el «envío», para que se vea «Enviando…»
  REINTENTO_ENVIO_MS: 60000,        // reintento mientras haya pendientes
  HORA_CIERRE_JORNADA: 17,          // desde esta hora, lo de hoy sin enviar ya es atraso
  // Revisión de jornadas (D112): umbrales de los avisos y de la partición por sitio, en metros
  JORNADA: { DUPLICADO_M: 3, FUERA_M: 150, SEPARAR_M: 500 },

  // [pendiente] Fase 2: proveedor institucional de identidad. Hoy el acceso es simulado, y con
  // ES_FICTICIO: false el acceso simulado queda cerrado hasta conectar el proveedor (D150).
  AUTENTICACION: { PROVEEDOR: 'simulado' },

  MAPA: {
    CENTRO: [19.4326, -99.1332],        // [latitud, longitud]: orden de Leaflet, no de GeoJSON
    ZOOM_INICIAL: 12,
    ZOOM_MIN: 10,
    ZOOM_MAX: 19,
    ZOOM_PUNTO: 17,
    ZOOM_JORNADA: 22,      // hasta dónde se acerca el mapa de la jornada, escalando la imagen (D116)
    LIMITES: [[19.04, -99.37], [19.60, -98.94]],   // ámbito CDMX; fuera de aquí el punto no es válido

    /* CAPAS DEL MAPA BASE, en orden de dibujo: la imagen de satélite abajo y, encima, una capa
       transparente con los nombres de calles y lugares. En campo se ubica el árbol por lo que se
       ve —la banqueta, el camellón, el árbol vecino—, no por el trazo de la calle, pero sin los
       nombres nadie sabe dónde está parado.
       [pendiente] Proveedor para producción (Norma 6.8): el servicio de Esri se usa aquí con su
       atribución, pero su uso gratuito tiene límites que hay que revisar antes de operar con
       cientos de personas en campo.
       Si cambia el dominio del proveedor, se cambia también en la política de seguridad de
       index.html (img-src), o el mapa dejará de verse (D150). */
    CAPAS: [
      { url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        atribucion: 'Imagen: Esri, Maxar, Earthstar Geographics y la comunidad de usuarios de Esri',
        base: true },
      { url: 'https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Transportation/MapServer/tile/{z}/{y}/{x}',
        atribucion: 'Vías: Esri', base: false },
      { url: 'https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}',
        atribucion: '', base: false }
    ],
    GPS_ESPERA_MS: 15000,
    /* Niveles de la precisión del GPS que se muestran junto al mapa (D96). Con ±10 m el punto cae
       en la misma banqueta; hasta ±30 m sirve si se revisa en el mapa; más allá conviene esperar o
       ajustar a mano. Son una guía para el cabo: no impiden guardar. */
    PRECISION_BUENA_M: 10,
    PRECISION_ACEPTABLE_M: 30
  },

  FOTO: { ANCHO_MAX: 800, ALTO_MAX: 600, CALIDAD: 0.7 },

  LISTA_PAGINA: 20
};
