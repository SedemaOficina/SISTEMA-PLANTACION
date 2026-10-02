/* CATÁLOGO DE VEHÍCULOS DE PRUEBA. Dieciséis vehículos con los modelos y tipos de las cuadrillas y
   placas ficticias («PRU 001» a «PRU 016»): el repositorio y el sitio son públicos y las placas
   reales no se publican. La lista real queda fuera del repositorio, en
   originales/vehiculos_reales_2026-09-26.csv, y en la Fase 2 se carga en el servidor.
   El id es «v-» más la placa sin espacios; la administración los edita en Catálogos › Vehículos. */
window.SRP = window.SRP || {};
SRP.CATALOGO_VEHICULOS = {
  meta: { fuente: 'Vehículos de prueba con placas ficticias', fecha_corte: '2026-09-28', total: 16 },
  vehiculos: [
    ['PRU 001', 'Internacional', 'Pipa'],
    ['PRU 002', 'Chevrolet', 'Pipa'],
    ['PRU 003', 'Ford', 'Pick up'],
    ['PRU 004', 'Nissan', 'Doble cabina'],
    ['PRU 005', 'Dodge', 'Estacas'],
    ['PRU 006', 'Dodge', 'Estacas'],
    ['PRU 007', 'Dodge', 'Estacas'],
    ['PRU 008', 'Dodge', 'Estacas'],
    ['PRU 009', 'Internacional', 'Redilas'],
    ['PRU 010', 'Internacional', 'Redilas'],
    ['PRU 011', 'Internacional', 'Grúa'],
    ['PRU 012', 'Ford', 'Estacas'],
    ['PRU 013', 'Ford', 'Estacas'],
    ['PRU 014', 'Ford', 'Estacas'],
    ['PRU 015', 'Ford', 'Estacas'],
    ['PRU 016', 'Chevrolet', 'Redilas']
  ].map(([placa, modelo, tipo]) => {
    const clave = placa.replace(/[^A-Z0-9]/g, '');
    return {
      id: 'v-' + clave, tipo: 'vehiculo', clave, nombre: placa, activo: true,
      creado_por_id: null, fecha_creacion: '2026-09-28T12:00:00-06:00', editado_por_id: null, fecha_ultima_edicion: null,
      modelo, tipo_vehiculo: tipo
    };
  })
};
