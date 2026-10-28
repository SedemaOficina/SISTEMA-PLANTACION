/* DATOS FICTICIOS DE DESARROLLO (Norma 3)
   Mismo esquema que tendrá la base real: sustituirlos es cambiar el origen, nada más.
   Son de prueba las cuentas y los vehículos, que llevan placas ficticias. Los catálogos de arranque
   (assets/catalogos/catalogos-arranque.js) y el de especies son los reales. Viven en la base de prueba
   (srp_db), separada de la real. Ningún nombre corresponde a una persona real.
   La versión real no carga este archivo. */
window.SRP = window.SRP || {};

(function () {
  const F = '2026-09-01T09:00:00-06:00';
  const deArranque = c => Object.assign({}, c, { creado_por_id: 'u-admin-1', fecha_creacion: F, editado_por_id: null, fecha_ultima_edicion: null });
  const A = SRP.CATALOGOS_ARRANQUE;

  /* PROGRAMAS. La Administración cambia quién puede usar cada uno en Catálogos › Programas. */
  const programas = A.programas.map(deArranque);
  // Programas de arranque que se retiraron: en un teléfono con capturas se quitan o, si se usaron, se desactivan
  const programasRetirados = ['p-voluntariado'];

  const areas = A.areas.map(deArranque);
  /* Áreas de arranque que se retiraron y a cuál pasan sus cuentas en un teléfono con capturas
     (js/almacen.js completarCatalogos) */
  const areasRetiradas = { 'a-div': 'a-dgsanpava' };

  // INSTITUCIONES: en la versión de prueba siguen activas Coyoacán e Iztapalapa, que tienen cuentas y datos de demostración
  const ALCALDIAS_ACTIVAS = ['o-alc-09003', 'o-alc-09007'];
  const organizaciones = A.instituciones.map(c => deArranque(ALCALDIAS_ACTIVAS.includes(c.id) ? Object.assign({}, c, { activo: true }) : c));

  const solicitantes = A.solicitantes.map(deArranque);

  /* ESPECIES: catálogo real del SIA (assets/catalogos/catalogo-especies.js). No son ficticias:
     se siembran tal cual, con su id ESP-0000 como llave. */
  const especies = SRP.CATALOGO_ESPECIES.especies.map(e => Object.assign({}, e));
  // VEHÍCULOS: los de prueba, con placas ficticias (assets/catalogos/catalogo-vehiculos.js)
  const vehiculos = SRP.CATALOGO_VEHICULOS.vehiculos.map(v => Object.assign({}, v));

  // Correos en @ejemplo.local: dominio reservado, nunca entregable (Norma 3)
  /* CUENTAS DE ARRANQUE: una por tipo. En la Secretaría, una por perfil (Administración global,
     Coordinación y Cabo); fuera, por tipo de institución (Alcaldía, Gobierno de la CDMX, Empresa
     privada, Organización civil), un coordinador y su cabo, sin área. Nombres inventados, apellido
     «Ejemplo»; correos en @ejemplo.local: dominio reservado, nunca entregable (Norma 3). */
  // La Coordinación trabaja con todos los cabos de su institución: las cuentas no llevan coordinadores
  const usuario = (id, correo, nombre_completo, area_id, cargo_rol, perfil, organizacion_id) => ({
    id, correo, nombre_completo, organizacion_id: organizacion_id || 'o-sedema', area_id, cargo_rol, perfil,
    activo: true,
    fecha_creacion: F, creado_por_id: 'u-admin-1', fecha_ultima_edicion: null, editado_por_id: null
  });

  const usuarios = [
    usuario('u-admin-1', 'administracion@ejemplo.local', 'Administración SIA Ejemplo', 'a-sia', 'Administración global', 'ADMIN'),
    usuario('u-dir-1', 'direccion@ejemplo.local', 'Zutana Ríos Ejemplo', 'a-dgsanpava', 'Directora de área', 'DIRECTIVO'),
    usuario('u-coord-1', 'coordinador@ejemplo.local', 'Perengano Gómez Ejemplo', 'a-dgsanpava', 'Coordinador de cuadrilla', 'COORDINADOR'),
    usuario('u-cabo-1', 'cabo@ejemplo.local', 'Fulana de Tal Ejemplo', 'a-dgsanpava', 'Cabo de cuadrilla', 'CABO'),
    usuario('u-dir-alc', 'direccion.alcaldia@ejemplo.local', 'Mengano Paz Ejemplo', null, 'Director de área', 'DIRECTIVO', 'o-alc-09007'),
    usuario('u-coord-alc', 'coordinador.alcaldia@ejemplo.local', 'Sergio Navarro Ejemplo', null, 'Coordinador de cuadrilla', 'COORDINADOR', 'o-alc-09007'),
    usuario('u-cabo-alc', 'cabo.alcaldia@ejemplo.local', 'Ramiro Torres Ejemplo', null, 'Cabo de cuadrilla', 'CABO', 'o-alc-09007'),
    usuario('u-coord-gob', 'coordinador.gobierno@ejemplo.local', 'Mariana Vega Ejemplo', null, 'Coordinador de cuadrilla', 'COORDINADOR', 'o-paot'),
    usuario('u-cabo-gob', 'cabo.gobierno@ejemplo.local', 'Lucía Méndez Ejemplo', null, 'Cabo de cuadrilla', 'CABO', 'o-paot'),
    usuario('u-coord-emp', 'coordinador.empresa@ejemplo.local', 'Héctor Salinas Ejemplo', null, 'Coordinador de cuadrilla', 'COORDINADOR', 'o-green-cover'),
    usuario('u-cabo-emp', 'cabo.empresa@ejemplo.local', 'Óscar Rivas Ejemplo', null, 'Cabo de cuadrilla', 'CABO', 'o-green-cover'),
    usuario('u-coord-osc', 'coordinador.civil@ejemplo.local', 'Carmen Ibarra Ejemplo', null, 'Coordinador de cuadrilla', 'COORDINADOR', 'o-reforestamos'),
    usuario('u-cabo-osc', 'cabo.civil@ejemplo.local', 'Andrea Solís Ejemplo', null, 'Cabo de cuadrilla', 'CABO', 'o-reforestamos')
  ];

  // Sin plantaciones: el sistema arranca vacío y se llena con lo que se capture.
  const plantaciones = [];

  SRP.DATOS_FICTICIOS = { catalogos: programas.concat(areas, organizaciones, solicitantes, especies, vehiculos), usuarios, plantaciones, areasRetiradas, programasRetirados };
})();
