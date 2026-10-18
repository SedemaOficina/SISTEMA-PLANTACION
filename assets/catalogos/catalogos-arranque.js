/* CATÁLOGOS DE ARRANQUE: programas, áreas de la Secretaría, instituciones y quién solicita una jornada.
   Son los reales con que empieza el sistema; después la Administración global los cambia en Catálogos.
   En la base del servidor los carga el guion de datos de arranque del paquete de instalación
   (servidor/datos-arranque.js); en la versión de prueba los siembra js/datos-ficticios.js.
   Los ids son fijos (p-…, a-…, o-…, s-…): el código nombra algunos, como la Secretaría (o-sedema) y la
   solicitud especial (p-solicitud). Las alcaldías van sin la palabra «Alcaldía», que su tipo ya dice, y
   con el cvegeo del INEGI en su id. */
window.SRP = window.SRP || {};

(function () {
  const valor = (tipo, id, clave, nombre, extra) => Object.assign({ id, tipo, clave, nombre, activo: true }, extra || {});

  /* PROGRAMAS. `tipos_organizacion`: qué tipos de institución, además de la Secretaría, pueden usarlo;
     vacío, sólo la Secretaría. */
  const programas = [
    valor('programa', 'p-refor', 'REFOR_URBANA', 'Reforestación Urbana', { tipos_organizacion: ['Alcaldía', 'Gobierno de la CDMX', 'Organización civil'] }),
    valor('programa', 'p-centro', 'CENTRO_HISTORICO', 'Centro Histórico', { tipos_organizacion: ['Gobierno de la CDMX'] }),
    valor('programa', 'p-palmeras', 'PALMERAS', 'Palmeras', { tipos_organizacion: ['Empresa privada'] }),
    valor('programa', 'p-compensaciones', 'COMPENSACIONES', 'Compensaciones', { tipos_organizacion: [] }),
    valor('programa', 'p-territorios-paz', 'TERRITORIOS_PAZ', 'Territorios de Paz', { tipos_organizacion: [] }),
    valor('programa', 'p-utopias', 'UTOPIAS', 'Utopías', { tipos_organizacion: [] }),
    /* La jornada que atiende una solicitud de otra instancia: al elegirlo se piden quién lo solicita y la
       descripción */
    valor('programa', 'p-solicitud', 'SOLICITUD', 'Solicitud especial', { tipos_organizacion: [] })
  ];

  // ÁREAS de la Secretaría: sólo las cuentas de SEDEMA llevan área
  const areas = [
    valor('area', 'a-dgsanpava', 'DGSANPAVA', 'DGSANPAVA'),
    valor('area', 'a-oficina', 'OFICINA_SECRETARIA', 'Oficina de la Secretaría'),
    valor('area', 'a-sia', 'SIA', 'Sistema de Información Ambiental'),
    valor('area', 'a-dgeira', 'DGEIRA', 'DGEIRA')
  ];

  /* INSTITUCIONES: a cuál pertenece cada cuenta y cuál ejecutó cada jornada, de cuatro tipos fijos. Las 16
     alcaldías vienen dadas de alta e inactivas: la Administración activa cada una cuando empiece a usar el
     sistema. De Gobierno de la CDMX, empresas y organizaciones civiles vienen las primeras; las demás se
     agregan en Catálogos › Instituciones. */
  const ALCALDIAS = [['09002', 'AZC', 'Azcapotzalco'], ['09003', 'COY', 'Coyoacán'], ['09004', 'CUJ', 'Cuajimalpa de Morelos'],
    ['09005', 'GAM', 'Gustavo A. Madero'], ['09006', 'IZC', 'Iztacalco'], ['09007', 'IZP', 'Iztapalapa'],
    ['09008', 'MAC', 'La Magdalena Contreras'], ['09009', 'MLP', 'Milpa Alta'], ['09010', 'AOB', 'Álvaro Obregón'],
    ['09011', 'TLH', 'Tláhuac'], ['09012', 'TLP', 'Tlalpan'], ['09013', 'XOC', 'Xochimilco'], ['09014', 'BJU', 'Benito Juárez'],
    ['09015', 'CUH', 'Cuauhtémoc'], ['09016', 'MIH', 'Miguel Hidalgo'], ['09017', 'VCA', 'Venustiano Carranza']];
  const institucion = (id, clave, nombre, tipo, activo) => valor('organizacion', id, clave, nombre, { activo, tipo_organizacion: tipo });
  const instituciones = [
    institucion('o-sedema', 'SEDEMA', 'Secretaría del Medio Ambiente (SEDEMA)', 'Gobierno de la CDMX', true),
    institucion('o-paot', 'PAOT', 'Procuraduría Ambiental y del Ordenamiento Territorial (PAOT)', 'Gobierno de la CDMX', true),
    institucion('o-sobse', 'SOBSE', 'Secretaría de Obras y Servicios (SOBSE)', 'Gobierno de la CDMX', true),
    institucion('o-green-cover', 'GREEN_COVER', 'Green Cover', 'Empresa privada', true),
    institucion('o-reforestamos', 'REFORESTAMOS_MEXICO', 'Reforestamos México, A.C.', 'Organización civil', true)
  ].concat(ALCALDIAS.map(([cve, clave, nombre]) => institucion('o-alc-' + cve, 'ALC_' + clave, nombre, 'Alcaldía', false)));

  /* SOLICITANTES: quién solicita una jornada. Es un catálogo aparte del de instituciones: quien pide no es
     quien planta ni necesita cuenta. Sólo están activos los que piden con frecuencia: la Oficina de la
     Secretaría, la Jefatura de Gobierno y SOBSE. Los demás ya están dados de alta, inactivos, y se activan
     cuando hagan falta; los que falten se agregan en Catálogos › Solicitantes. */
  const SOLICITANTES_ACTIVOS = ['s-oficina-secretaria', 's-jefatura', 's-sobse'];
  const solicitante = (id, clave, nombre, tipo) => valor('solicitante', id, clave, nombre, { activo: SOLICITANTES_ACTIVOS.includes(id), tipo_solicitante: tipo });
  const solicitantes = ALCALDIAS.map(([cve, clave, nombre]) => solicitante('s-alc-' + cve, 'ALC_' + clave, nombre, 'Alcaldía')).concat([
    solicitante('s-oficina-secretaria', 'OFICINA_DE_LA_SECRETARIA', 'Oficina de la Secretaría', 'Dependencia de gobierno'),
    solicitante('s-sobse', 'SOBSE', 'Secretaría de Obras y Servicios (SOBSE)', 'Dependencia de gobierno'),
    solicitante('s-segiagua', 'SEGIAGUA', 'Secretaría de Gestión Integral del Agua (SEGIAGUA)', 'Dependencia de gobierno'),
    solicitante('s-jefatura', 'JEFATURA_DE_GOBIERNO', 'Jefatura de Gobierno', 'Dependencia de gobierno'),
    solicitante('s-diputados', 'DIPUTADAS_Y_DIPUTADOS', 'Diputadas y diputados', 'Congreso')
  ]);

  SRP.CATALOGOS_ARRANQUE = { programas, areas, instituciones, solicitantes };
})();
