/* DATOS FICTICIOS DE DESARROLLO (Norma 3)
   Mismo esquema que tendrá la base real: sustituirlos es cambiar el origen, nada más.
   Todo lleva es_ficticio: true. Ningún nombre corresponde a una persona real. */
window.SRP = window.SRP || {};

(function () {
  const F = '2026-09-01T09:00:00-06:00';
  const cat = (tipo, id, clave, nombre, extra) => Object.assign({
    id, tipo, clave, nombre, activo: true, es_ficticio: true,
    creado_por_id: 'u-admin-1', fecha_creacion: F, editado_por_id: null, fecha_ultima_edicion: null
  }, extra || {});

  const programas = [
    cat('programa', 'p-refor', 'REFOR_URBANA', 'Reforestación Urbana'),
    cat('programa', 'p-centro', 'CENTRO_HISTORICO', 'Centro Histórico')
  ];

  const areas = [
    cat('area', 'a-div', 'DIV', 'Dirección de Infraestructura Verde'),
    cat('area', 'a-sia', 'SIA', 'Coordinación del SIA')
  ];

  // [pendiente] Catálogo y grupo (origen) por validar con el área técnica.
  const especiesBase = [
    ['Fresno', 'Fraxinus uhdei', 'Nativa'], ['Encino quiebra hacha', 'Quercus rugosa', 'Nativa'],
    ['Encino laurelillo', 'Quercus laurina', 'Nativa'], ['Encino', 'Quercus castanea', 'Nativa'],
    ['Ahuehuete', 'Taxodium mucronatum', 'Nativa'], ['Ahuejote', 'Salix bonplandiana', 'Nativa'],
    ['Colorín', 'Erythrina coralloides', 'Nativa'], ['Capulín', 'Prunus serotina subsp. capuli', 'Nativa'],
    ['Tejocote', 'Crataegus mexicana', 'Nativa'], ['Madroño', 'Arbutus xalapensis', 'Nativa'],
    ['Tepozán', 'Buddleja cordata', 'Nativa'], ['Aile', 'Alnus acuminata', 'Nativa'],
    ['Cedro blanco', 'Cupressus lusitanica', 'Nativa'], ['Pino ayacahuite', 'Pinus ayacahuite', 'Nativa'],
    ['Pino de Moctezuma', 'Pinus montezumae', 'Nativa'], ['Pino patula', 'Pinus patula', 'Nativa'],
    ['Palo dulce', 'Eysenhardtia polystachya', 'Nativa'], ['Tronadora', 'Tecoma stans', 'Nativa'],
    ['Liquidámbar', 'Liquidambar styraciflua', 'Nativa'], ['Sicomoro', 'Platanus mexicana', 'Nativa'],
    ['Sauce llorón', 'Salix babylonica', 'Introducida'], ['Jacaranda', 'Jacaranda mimosifolia', 'Introducida'],
    ['Pirul', 'Schinus molle', 'Introducida'], ['Trueno', 'Ligustrum lucidum', 'Introducida']
  ];
  const especies = especiesBase.map((e, i) => cat('especie', 'e-' + String(i + 1).padStart(3, '0'),
    'ESP' + String(i + 1).padStart(3, '0'), e[0], { nombre_cientifico: e[1], grupo: e[2] }));
  especies[especies.length - 1].activo = false;   // caso de prueba: especie desactivada

  // Correos en @ejemplo.local: dominio reservado, nunca entregable (Norma 3)
  /* CUENTAS DE ARRANQUE. Una por perfil operativo, que es lo que pidió Liber para empezar
     limpio. Correos en @ejemplo.local: dominio reservado, nunca entregable (Norma 3).
     El perfil de Consulta existe en el sistema pero todavía no tiene cuenta: se crea desde
     Usuarios cuando haga falta. */
  const usuario = (id, correo, nombre, ap, am, area_id, cargo_rol, perfil, coordinador_id) => ({
    id, correo, nombre, apellido_paterno: ap, apellido_materno: am, area_id, cargo_rol, perfil,
    coordinador_id: coordinador_id || null, activo: true, es_ficticio: true,
    fecha_alta: F, alta_por_id: 'u-admin-1', fecha_ultima_edicion: null, editado_por_id: null
  });

  const usuarios = [
    usuario('u-admin-1', 'administracion@ejemplo.local', 'Administración', 'SIA', 'Ejemplo',
            'a-sia', 'Administración global', 'ADMIN'),
    usuario('u-coord-1', 'coordinador@ejemplo.local', 'Perengano', 'Gómez', 'Ejemplo',
            'a-div', 'Coordinador de cuadrilla', 'COORDINADOR'),
    usuario('u-cabo-1', 'cabo@ejemplo.local', 'Fulana', 'de Tal', 'Ejemplo',
            'a-div', 'Cabo de cuadrilla', 'CABO', 'u-coord-1')
  ];

  // Sin plantaciones: el sistema arranca vacío y se llena con lo que se capture.
  const plantaciones = [];

  SRP.DATOS_FICTICIOS = { catalogos: programas.concat(areas, especies), usuarios, plantaciones };
})();
