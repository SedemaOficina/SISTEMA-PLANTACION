/* r5 · E2 (bitácora inmutable con la cuenta del servicio, versiones) y E3 de la calle (mover el punto, punto lejos, fechas),
   contra el servicio real. Uso: R5_CLAVE_ARCHIVO=<archivo> node evidencia/e2_bitacora_calle.mjs <corrida>
   Las pruebas de la bitácora se hacen con SET ROLE srp_api dentro de BEGIN … ROLLBACK, y sólo sobre renglones de r5. */
import path from 'node:path';
import { CUENTAS as K, RAIZ, entrar, enviar, op, leerBase, jornadaNueva, arbolNuevo, bitacoraDePrueba, HOY } from './comun.mjs';

const corrida = process.argv[2] || '1';
const log = bitacoraDePrueba('e2_bitacora_calle_' + corrida + '.txt');
const S = { coord: await entrar(K.coord), cabo1: await entrar(K.cabo1) };
const res = (rs) => rs.map((r) => r.estado + (r.codigo ? ':' + r.codigo : '') + (r.repetido ? ':repetido' : '') + (r.errores ? ' ' + JSON.stringify(r.errores) : ''));
const ayer = new Date(Date.parse(HOY + 'T12:00:00Z') - 86400000).toISOString().slice(0, 10);
const manana = new Date(Date.parse(HOY + 'T12:00:00Z') + 86400000).toISOString().slice(0, 10);

// --- E2: la bitácora no se edita ni se borra con la cuenta del servicio
{
  const { conectar } = await import('file:///' + path.join(RAIZ, 'servidor', 'bd.js').replace(/\\/g, '/'));
  const k = await conectar();
  const mio = (await k.query(`SELECT id FROM srp.bitacora WHERE usuario_id = $1 AND accion = 'APOYO' LIMIT 1`, [K.coord.id])).rows[0];
  const probar = async (sql) => {
    await k.query('BEGIN'); await k.query('SET LOCAL ROLE srp_api');
    try { const r = await k.query(sql, [mio.id]); return 'PASÓ (' + r.rowCount + ')'; } catch (e) { return 'negado: ' + e.code + ' ' + e.message; } finally { await k.query('ROLLBACK'); }
  };
  log('E2 bitácora con srp_api · UPDATE de un renglón APOYO de r5:', await probar(`UPDATE srp.bitacora SET detalle = 'alterado' WHERE id = $1`));
  log('E2 bitácora con srp_api · DELETE de un renglón APOYO de r5:', await probar(`DELETE FROM srp.bitacora WHERE id = $1`));
  // Y con la cuenta dueña de las tablas (más que srp_api): el disparador también lo detiene
  await k.query('BEGIN');
  try { await k.query(`UPDATE srp.bitacora SET detalle = 'alterado' WHERE id = $1`, [mio.id]); log('E2 bitácora con la cuenta dueña: PASÓ'); }
  catch (e) { log('E2 bitácora con la cuenta dueña · UPDATE:', 'negado: ' + e.code + ' ' + e.message); } finally { await k.query('ROLLBACK'); }
  const acciones = (await k.query(`SELECT accion, count(*)::int AS n FROM srp.bitacora WHERE usuario_id = ANY($1::uuid[]) AND accion IN ('APOYO', 'RELEVO') GROUP BY 1`, [Object.values(K).map((x) => x.id)])).rows;
  log('E2 renglones APOYO y RELEVO de las cuentas r5 hasta ahora:', acciones);
  await k.end();
}

// --- La calle: alta, mover el punto, punto lejos de toda calle
{
  const j = jornadaNueva('r5 calle c' + corrida, { lat: 19.4326, lng: -99.1332 });
  await enviar(S.coord, [op('jornada.crear', j)]);
  const a = arbolNuevo(j.id, { lat: 19.4326, lng: -99.1332 });
  const r1 = await enviar(S.coord, [op('registro.crear', a)]);
  const f1 = r1[0].fila;
  const r2 = await enviar(S.coord, [op('registro.editar', { id: a.id, version: r1[0].version, cambios: { lat: 19.4342, lng: -99.1386 } })]);
  const f2 = r2[0].fila;
  const bit = await leerBase(`SELECT detalle FROM srp.bitacora WHERE entidad_id = $1 AND accion = 'EDITADO' ORDER BY fecha DESC LIMIT 1`, [a.id]);
  log('Calle · alta en el Zócalo:', [f1.calle_estado, f1.calle, f1.calle_distancia_m, f1.calle_version], '→ punto movido 600 m:', [f2.calle_estado, f2.calle, f2.calle_distancia_m],
    '· la bitácora del cambio dice:', bit[0].detalle);
  // Un punto lejos de toda calle, dentro de la Ciudad (suelo de conservación, Milpa Alta)
  const lejos = arbolNuevo(j.id, { lat: 19.12, lng: -99.03 });
  const r3 = await enviar(S.coord, [op('registro.crear', lejos)]);
  const f3 = r3[0].fila || {};
  log('Calle · punto lejos de toda calle:', res(r3), [f3.calle_estado, f3.calle, f3.calle_distancia_m, f3.calle_clave, f3.alcaldia, f3.folio]);
  // Mover un punto a otro igual (sin cambio) no recalcula
  const r4 = await enviar(S.coord, [op('registro.editar', { id: a.id, version: r2[0].version, cambios: { lat: 19.4342, lng: -99.1386 } })]);
  log('Calle · reenvío del mismo punto:', res(r4));
}

// --- El reloj: una compartida abierta ayer, seguida hoy; árboles con fecha de mañana y de antes de la jornada
{
  const j = jornadaNueva('r5 reloj c' + corrida, { fecha: ayer, fecha_inicio: new Date(Date.now() - 86400000).toISOString() });
  const rj = await enviar(S.coord, [op('jornada.crear', j), op('jornada.compartir', { id: j.id, agregar: [K.cabo1.id] })]);
  const hoy = await enviar(S.cabo1, [op('registro.crear', arbolNuevo(j.id, { fecha_plantacion: HOY }))]);
  const deAyer = await enviar(S.cabo1, [op('registro.crear', arbolNuevo(j.id, { fecha_plantacion: ayer }))]);
  const deManana = await enviar(S.cabo1, [op('registro.crear', arbolNuevo(j.id, { fecha_plantacion: manana }))]);
  const antes = await enviar(S.cabo1, [op('registro.crear', arbolNuevo(j.id, { fecha_plantacion: '2026-01-01' }))]);
  const futuro = await enviar(S.cabo1, [op('registro.crear', arbolNuevo(j.id, { fecha_plantacion: HOY, fecha_registro: '2030-01-01T00:00:00Z' }))]);
  const reg = futuro[0].fila ? futuro[0].fila.fecha_registro : null;
  // La Coordinación mueve la fecha de la jornada a hoy, con árboles de apoyo de ayer
  const ed = await enviar(S.coord, [op('jornada.editar', { id: j.id, version: rj[1].version, cambios: { fecha: HOY } })]);
  log('Reloj · compartida de ayer:', res(rj), '· árbol de hoy:', res(hoy), '· de ayer:', res(deAyer), '· de mañana (reloj adelantado):', res(deManana), '· de antes de la jornada:', res(antes));
  log('Reloj · fecha_registro de 2030 queda como:', reg, '· la Coordinación pasa la jornada a hoy con un árbol de apoyo de ayer:', res(ed));
}
log.guardar();
process.exit(0);
