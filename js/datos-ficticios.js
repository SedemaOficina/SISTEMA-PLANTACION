/* DATOS FICTICIOS DE DESARROLLO (Norma 3)
   Mismo esquema que tendrá la base real: sustituirlos es cambiar el origen, nada más.
   Todo es de prueba, salvo el catálogo de especies, que es el real del SIA; los vehículos llevan
   placas ficticias. Viven en la base de prueba (srp_db), separada de la real.
   Ningún nombre corresponde a una persona real. */
window.SRP = window.SRP || {};

(function () {
  const F = '2026-09-01T09:00:00-06:00';
  const cat = (tipo, id, clave, nombre, extra) => Object.assign({
    id, tipo, clave, nombre, activo: true,
    creado_por_id: 'u-admin-1', fecha_creacion: F, editado_por_id: null, fecha_ultima_edicion: null
  }, extra || {});

  /* PROGRAMAS. `tipos_organizacion`: qué tipos de institución, además de la Secretaría, pueden usarlo;
     vacío, sólo la Secretaría. La Administración lo cambia en Catálogos › Programas. */
  const programas = [
    cat('programa', 'p-refor', 'REFOR_URBANA', 'Reforestación Urbana', { tipos_organizacion: ['Alcaldía', 'Gobierno de la CDMX', 'Organización civil'] }),
    cat('programa', 'p-centro', 'CENTRO_HISTORICO', 'Centro Histórico', { tipos_organizacion: [] }),
    cat('programa', 'p-palmeras', 'PALMERAS', 'Palmeras', { tipos_organizacion: ['Empresa privada'] }),
    cat('programa', 'p-compensaciones', 'COMPENSACIONES', 'Compensaciones', { tipos_organizacion: [] }),
    /* La jornada que atiende una solicitud de otra instancia: al elegirlo se piden quién lo solicita y la
       descripción. De arranque es de la Secretaría; la Administración lo abre a otros tipos de institución
       en Catálogos › Programas */
    cat('programa', 'p-solicitud', 'SOLICITUD', 'Solicitud', { tipos_organizacion: [] })
  ];
  // Programas de arranque que ya no vienen: en un teléfono con capturas se quitan o, si se usaron, se desactivan
  const programasRetirados = ['p-voluntariado'];

  // ÁREAS de la Secretaría: sólo las cuentas de SEDEMA llevan área
  const areas = [
    cat('area', 'a-dgsanpava', 'DGSANPAVA', 'DGSANPAVA'),
    cat('area', 'a-oficina', 'OFICINA_SECRETARIA', 'Oficina de la Secretaría'),
    cat('area', 'a-sia', 'SIA', 'Sistema de Información Ambiental'),
    cat('area', 'a-dgeira', 'DGEIRA', 'DGEIRA')
  ];
  /* Áreas de arranque que ya no vienen y a cuál pasan sus cuentas en un teléfono con capturas
     (js/almacen.js completarCatalogos) */
  const areasRetiradas = { 'a-div': 'a-dgsanpava' };

  /* INSTITUCIONES: a cuál pertenece cada cuenta y cuál ejecutó cada jornada. Cuatro tipos fijos. Las
     16 alcaldías ya vienen dadas de alta, sin la palabra «Alcaldía» (el tipo ya lo dice), con el cvegeo
     INEGI en su id, e inactivas: la Administración activa cada una cuando empiece a usar el sistema. En
     la versión de prueba siguen activas Iztapalapa y Coyoacán, que tienen cuentas y datos de
     demostración. De Gobierno de la CDMX, empresas y organizaciones civiles vienen las primeras; las
     demás se agregan en Catálogos. */
  const org = (id, clave, nombre, tipo, extra) => cat('organizacion', id, clave, nombre, Object.assign({ tipo_organizacion: tipo }, extra || {}));
  const ALCALDIAS_ACTIVAS = ['09003', '09007'];
  const ALCALDIAS = [['09002', 'AZC', 'Azcapotzalco'], ['09003', 'COY', 'Coyoacán'], ['09004', 'CUJ', 'Cuajimalpa de Morelos'],
    ['09005', 'GAM', 'Gustavo A. Madero'], ['09006', 'IZC', 'Iztacalco'], ['09007', 'IZP', 'Iztapalapa'],
    ['09008', 'MAC', 'La Magdalena Contreras'], ['09009', 'MLP', 'Milpa Alta'], ['09010', 'AOB', 'Álvaro Obregón'],
    ['09011', 'TLH', 'Tláhuac'], ['09012', 'TLP', 'Tlalpan'], ['09013', 'XOC', 'Xochimilco'], ['09014', 'BJU', 'Benito Juárez'],
    ['09015', 'CUH', 'Cuauhtémoc'], ['09016', 'MIH', 'Miguel Hidalgo'], ['09017', 'VCA', 'Venustiano Carranza']];
  const organizaciones = [
    org('o-sedema', 'SEDEMA', 'Secretaría del Medio Ambiente (SEDEMA)', 'Gobierno de la CDMX'),
    org('o-paot', 'PAOT', 'Procuraduría Ambiental y del Ordenamiento Territorial (PAOT)', 'Gobierno de la CDMX'),
    org('o-sobse', 'SOBSE', 'Secretaría de Obras y Servicios (SOBSE)', 'Gobierno de la CDMX'),
    org('o-green-cover', 'GREEN_COVER', 'Green Cover', 'Empresa privada'),
    org('o-reforestamos', 'REFORESTAMOS_MEXICO', 'Reforestamos México, A.C.', 'Organización civil')
  ].concat(ALCALDIAS.map(([cve, clave, nombre]) => org('o-alc-' + cve, 'ALC_' + clave, nombre, 'Alcaldía', { activo: ALCALDIAS_ACTIVAS.includes(cve) })));

  /* SOLICITANTES: quién solicita una jornada. Catálogo aparte del de instituciones: quien pide no
     es quien planta ni necesita cuenta. Las alcaldías van sin la palabra «Alcaldía» (su tipo ya lo
     dice) y su id lleva el cvegeo INEGI. Los demás se agregan en Catálogos › Solicitantes. */
  /* De arranque sólo están activos los que piden con frecuencia: la Oficina de la Secretaría, la Jefatura
     de Gobierno y SOBSE. Los demás ya están dados de alta, inactivos, y se activan cuando hagan falta. */
  const SOLICITANTES_ACTIVOS = ['s-oficina-secretaria', 's-jefatura', 's-sobse'];
  const sol = (id, clave, nombre, tipo) => cat('solicitante', id, clave, nombre, { tipo_solicitante: tipo, activo: SOLICITANTES_ACTIVOS.includes(id) });
  const solicitantes = ALCALDIAS.map(([cve, clave, nombre]) => sol('s-alc-' + cve, 'ALC_' + clave, nombre, 'Alcaldía')).concat([
    sol('s-oficina-secretaria', 'OFICINA_DE_LA_SECRETARIA', 'Oficina de la Secretaría', 'Dependencia de gobierno'),
    sol('s-sobse', 'SOBSE', 'Secretaría de Obras y Servicios (SOBSE)', 'Dependencia de gobierno'),
    sol('s-segiagua', 'SEGIAGUA', 'Secretaría de Gestión Integral del Agua (SEGIAGUA)', 'Dependencia de gobierno'),
    sol('s-jefatura', 'JEFATURA_DE_GOBIERNO', 'Jefatura de Gobierno', 'Dependencia de gobierno'),
    sol('s-diputados', 'DIPUTADAS_Y_DIPUTADOS', 'Diputadas y diputados', 'Congreso')
  ]);

  /* ESPECIES: catálogo real del SIA (assets/catalogos/catalogo-especies.js, D84). No son ficticias:
     se siembran tal cual, con su id ESP-0000 como llave. */
  const especies = SRP.CATALOGO_ESPECIES.especies.map(e => Object.assign({}, e));
  // VEHÍCULOS: los de las cuadrillas (assets/catalogos/catalogo-vehiculos.js, D162); tampoco son ficticios
  const vehiculos = SRP.CATALOGO_VEHICULOS.vehiculos.map(v => Object.assign({}, v));

  // Correos en @ejemplo.local: dominio reservado, nunca entregable (Norma 3)
  /* CUENTAS DE ARRANQUE: una por tipo. En la Secretaría, una por perfil (Administración global,
     Coordinación y Cabo); fuera, por tipo de institución (Alcaldía, Gobierno de la CDMX, Empresa
     privada, Organización civil), un coordinador y su cabo, sin área. Nombres inventados, apellido
     «Ejemplo»; correos en @ejemplo.local: dominio reservado, nunca entregable (Norma 3). */
  const usuario = (id, correo, nombre_completo, area_id, cargo_rol, perfil, coordinador_id, organizacion_id) => ({
    id, correo, nombre_completo, organizacion_id: organizacion_id || 'o-sedema', area_id, cargo_rol, perfil,
    coordinadores_ids: coordinador_id ? [coordinador_id] : [], activo: true,
    fecha_creacion: F, creado_por_id: 'u-admin-1', fecha_ultima_edicion: null, editado_por_id: null
  });

  const usuarios = [
    usuario('u-admin-1', 'administracion@ejemplo.local', 'Administración SIA Ejemplo', 'a-sia', 'Administración global', 'ADMIN'),
    usuario('u-dir-1', 'direccion@ejemplo.local', 'Zutana Ríos Ejemplo', 'a-dgsanpava', 'Directora de área', 'DIRECTIVO'),
    usuario('u-coord-1', 'coordinador@ejemplo.local', 'Perengano Gómez Ejemplo', 'a-dgsanpava', 'Coordinador de cuadrilla', 'COORDINADOR'),
    usuario('u-cabo-1', 'cabo@ejemplo.local', 'Fulana de Tal Ejemplo', 'a-dgsanpava', 'Cabo de cuadrilla', 'CABO', 'u-coord-1'),
    usuario('u-dir-alc', 'direccion.alcaldia@ejemplo.local', 'Mengano Paz Ejemplo', null, 'Director de área', 'DIRECTIVO', null, 'o-alc-09007'),
    usuario('u-coord-alc', 'coordinador.alcaldia@ejemplo.local', 'Sergio Navarro Ejemplo', null, 'Coordinador de cuadrilla', 'COORDINADOR', null, 'o-alc-09007'),
    usuario('u-cabo-alc', 'cabo.alcaldia@ejemplo.local', 'Ramiro Torres Ejemplo', null, 'Cabo de cuadrilla', 'CABO', 'u-coord-alc', 'o-alc-09007'),
    usuario('u-coord-gob', 'coordinador.gobierno@ejemplo.local', 'Mariana Vega Ejemplo', null, 'Coordinador de cuadrilla', 'COORDINADOR', null, 'o-paot'),
    usuario('u-cabo-gob', 'cabo.gobierno@ejemplo.local', 'Lucía Méndez Ejemplo', null, 'Cabo de cuadrilla', 'CABO', 'u-coord-gob', 'o-paot'),
    usuario('u-coord-emp', 'coordinador.empresa@ejemplo.local', 'Héctor Salinas Ejemplo', null, 'Coordinador de cuadrilla', 'COORDINADOR', null, 'o-green-cover'),
    usuario('u-cabo-emp', 'cabo.empresa@ejemplo.local', 'Óscar Rivas Ejemplo', null, 'Cabo de cuadrilla', 'CABO', 'u-coord-emp', 'o-green-cover'),
    usuario('u-coord-osc', 'coordinador.civil@ejemplo.local', 'Carmen Ibarra Ejemplo', null, 'Coordinador de cuadrilla', 'COORDINADOR', null, 'o-reforestamos'),
    usuario('u-cabo-osc', 'cabo.civil@ejemplo.local', 'Andrea Solís Ejemplo', null, 'Cabo de cuadrilla', 'CABO', 'u-coord-osc', 'o-reforestamos')
  ];

  // Sin plantaciones: el sistema arranca vacío y se llena con lo que se capture.
  const plantaciones = [];

  SRP.DATOS_FICTICIOS = { catalogos: programas.concat(areas, organizaciones, solicitantes, especies, vehiculos), usuarios, plantaciones, areasRetiradas, programasRetirados };
})();
