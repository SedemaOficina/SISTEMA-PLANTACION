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

  const usuario = (id, nombre, ap, am, area_id, cargo_rol, perfil, jefe_id) => ({
    id, nombre, apellido_paterno: ap, apellido_materno: am, area_id, cargo_rol, perfil,
    jefe_id: jefe_id || null, activo: true, es_ficticio: true, fecha_alta: F
  });

  const usuarios = [
    usuario('u-reg-1', 'Fulana', 'de Tal', 'Ejemplo', 'a-div', 'Técnica de campo', 'REGISTRADOR', 'u-jefe-1'),
    usuario('u-reg-2', 'Mengano', 'Pérez', 'Ejemplo', 'a-div', 'Técnico de campo', 'REGISTRADOR', 'u-jefe-1'),
    // Caso incómodo: nombre largo y sin jefe asignado (el jefe no debe ver sus registros)
    usuario('u-reg-3', 'Zutana Maximiliana', 'de los Ángeles', 'Villaseñor Ejemplo', 'a-sia', 'Técnica de campo de apoyo a brigadas', 'REGISTRADOR', null),
    usuario('u-jefe-1', 'Perengano', 'Gómez', 'Ejemplo', 'a-div', 'Jefe de registradores', 'JEFE'),
    usuario('u-admin-1', 'Administración', 'SIA', 'Ejemplo', 'a-sia', 'Administración global', 'ADMIN'),
    usuario('u-lect-1', 'Consulta', 'Solo Lectura', 'Ejemplo', 'a-sia', 'Consulta', 'VIEWER')
  ];

  // Plantaciones: generador determinista (mismo resultado en cada carga)
  let semilla = 7;
  const azar = () => { semilla = (semilla * 16807) % 2147483647; return (semilla - 1) / 2147483646; };
  const autores = ['u-reg-1', 'u-reg-1', 'u-reg-1', 'u-reg-2', 'u-reg-2', 'u-reg-3', 'u-jefe-1', 'u-admin-1'];
  const especiesActivas = especies.filter(e => e.activo);
  const plantaciones = [];

  for (let i = 0; i < 34; i++) {
    const autor = autores[i % autores.length];
    const dia = new Date(2026, 6, 15 + Math.floor(azar() * 68));   // 15-jul a 21-sep-2026
    const fecha = dia.getFullYear() + '-' + String(dia.getMonth() + 1).padStart(2, '0') + '-' + String(dia.getDate()).padStart(2, '0');
    let lat = 19.30 + azar() * 0.16, lng = -99.20 + azar() * 0.12;
    if (i === 3) { lat = 19.372; lng = -99.14; }     // sobre el borde entre dos colonias
    if (i === 4) { lat = 19.38; lng = -99.11; }      // sobre el borde entre dos UGA
    if (i === 5) { lat = 19.25; lng = -99.10; }      // dentro de CDMX pero fuera de las capas
    const esp = especiesActivas[Math.floor(azar() * especiesActivas.length)];
    const otra = i === 6;                            // caso "Otra especie"
    lat = Number(lat.toFixed(6)); lng = Number(lng.toFixed(6));
    plantaciones.push({
      id: 'pl-fic-' + String(i + 1).padStart(3, '0'),
      es_ficticio: true,
      estatus: i === 7 ? 'eliminado' : 'activo',      // caso: registro retirado, no debe listarse
      registrador_id: autor,
      lat, lng, lat_original: lat, lng_original: lng,
      alcaldia: null, colonia: null, uga: null, capa_version: null,   // se derivan al sembrar
      especie_id: otra ? null : esp.id,              // el nombre se lee del catálogo (fuente única)
      especie_otra: otra ? 'Guayabo (por identificar)' : '',
      programa_id: i % 3 === 0 ? 'p-centro' : 'p-refor',
      foto_base64: null, foto_id: null,               // sin foto en los datos de prueba
      fecha_plantacion: fecha,
      fecha_registro: fecha + 'T12:00:00-06:00',
      fecha_ultima_edicion: null, editado_por_id: null
    });
  }

  SRP.DATOS_FICTICIOS = { catalogos: programas.concat(areas, especies), usuarios, plantaciones };
})();
