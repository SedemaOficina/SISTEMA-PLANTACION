/* r5 · E3 «Intentar romperlo» y E2 sobre la jornada compartida, contra el servicio real (puerto 3125, cuenta srp_api).
   Uso:  R5_CLAVE_ARCHIVO=<archivo> node evidencia/e3_compartida.mjs <corrida>
   Cada ataque empieza con una jornada nueva (estado limpio). Escribe evidencia/salidas/e3_compartida_<corrida>.txt.
   Sólo usa las cuentas de r5; todo lo que crea lo borra «node evidencia/cuentas.mjs quitar». */
import { CUENTAS as K, entrar, enviar, op, pedir, leerBase, jornadaNueva, arbolNuevo, uuid, bitacoraDePrueba } from './comun.mjs';

const corrida = process.argv[2] || '1';
const log = bitacoraDePrueba('e3_compartida_' + corrida + '.txt');
const S = {};
for (const k of ['admin', 'coord', 'cabo1', 'cabo2', 'cabo3', 'coord2', 'otroCabo', 'otroCoord']) S[k] = await entrar(K[k]);

const resumen = (rs) => (Array.isArray(rs) ? rs.map((r) => r.estado + (r.codigo ? ':' + r.codigo : '') + (r.repetido ? ':repetido' : '')) : rs);
const estadoJ = async (jid) => (await leerBase(
  `SELECT estatus, cabos_apoyo, relevo_id, to_char(coalesce(fecha_ultima_edicion, fecha_inicio) AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') AS version FROM srp.jornadas WHERE id = $1`, [jid]))[0];
const apoyos = (j) => (j ? j.cabos_apoyo.map((a) => [Object.keys(K).find((k) => K[k].id === a.cabo_id), a.fin]) : null);
const bitacora = async (jid) => (await leerBase(`SELECT accion, usuario_nombre AS quien, detalle FROM srp.bitacora WHERE entidad = 'jornada' AND entidad_id = $1 ORDER BY fecha`, [jid]))
  .map((b) => b.accion + ' · ' + b.quien + ' · ' + b.detalle);

async function compartida(nombre, cabos = ['cabo1', 'cabo2']) {
  const j = jornadaNueva('r5 ' + nombre + ' c' + corrida);
  const r = await enviar(S.coord, [op('jornada.crear', j), op('jornada.compartir', { id: j.id, agregar: cabos.map((c) => K[c].id), quitar: [] })]);
  if (r.some((x) => x.estado !== 'recibido')) throw new Error('No se pudo crear la compartida: ' + JSON.stringify(r));
  return { jid: j.id, version: r[1].version };
}
const version = async (jid) => (await estadoJ(jid)).version;
const arbol = (s, jid, extra) => enviar(s, [op('registro.crear', arbolNuevo(jid, extra))]);

log('== Corrida ' + corrida + ' · ' + new Date().toISOString());

/* A1. Dos cabos de apoyo y la Coordinación registrando a la vez, y la Coordinación agregando un tercero a la mitad */
{
  const { jid } = await compartida('A1 a la vez');
  const t0 = performance.now();
  const tareas = [];
  for (let i = 0; i < 15; i++) for (const k of ['coord', 'cabo1', 'cabo2']) tareas.push(arbol(S[k], jid));
  tareas.splice(20, 0, enviar(S.coord, [op('jornada.compartir', { id: jid, agregar: [K.cabo3.id], quitar: [] })]));
  const rs = (await Promise.all(tareas)).flat();
  const ms = Math.round(performance.now() - t0);
  const malos = rs.filter((r) => r.estado !== 'recibido');
  const fol = await leerBase(`SELECT count(*)::int AS n, count(DISTINCT folio)::int AS distintos, count(*) FILTER (WHERE folio IS NULL)::int AS sin_folio,
      count(*) FILTER (WHERE calle_estado IS NULL)::int AS sin_calle FROM srp.plantaciones WHERE jornada_id = $1`, [jid]);
  const cre = await leerBase(`SELECT count(*)::int AS n FROM srp.bitacora b JOIN srp.plantaciones p ON p.id::text = b.entidad_id WHERE p.jornada_id = $1 AND b.accion = 'CREADO'`, [jid]);
  log('A1 46 envíos simultáneos (45 árboles + 1 compartir):', ms + ' ms', 'rechazados:', malos.length, resumen(malos), 'árboles/folios distintos/sin folio/sin calle:', fol[0], 'CREADO en bitácora:', cre[0].n,
    'apoyos:', apoyos(await estadoJ(jid)));
}

/* A2. La Coordinación quita a un cabo que registró sin señal: su árbol llega después */
{
  const { jid } = await compartida('A2 quitar');
  const hecho = arbolNuevo(jid, { fecha_registro: new Date(Date.now() - 5 * 60000).toISOString() });   // lo registró hace 5 minutos, sin señal
  const q = await enviar(S.coord, [op('jornada.compartir', { id: jid, agregar: [], quitar: [K.cabo1.id] })]);
  const r = await enviar(S.cabo1, [op('registro.crear', hecho)]);
  log('A2 quitar:', resumen(q), '· árbol registrado ANTES de que lo quitaran llega después:', resumen(r), r[0].mensaje || '');
}

/* A3. «Terminar mi parte» y «Cerrar» a la vez (10 veces) */
{
  const salidas = {};
  for (let i = 0; i < 10; i++) {
    const { jid, version: v } = await compartida('A3 carrera ' + i, ['cabo1']);
    const [t, c] = await Promise.all([enviar(S.cabo1, [op('jornada.terminar', { id: jid, version: v })]), enviar(S.coord, [op('jornada.cerrar', { id: jid, version: v })])]);
    const e = await estadoJ(jid);
    const k = 'terminar=' + resumen(t) + ' cerrar=' + resumen(c) + ' → ' + e.estatus + ' ' + JSON.stringify(apoyos(e));
    salidas[k] = (salidas[k] || 0) + 1;
  }
  log('A3 terminar contra cerrar, 10 veces:', salidas);
}

/* A4. La Coordinación cierra, o elimina, con árboles de apoyo por enviar */
{
  const { jid, version: v } = await compartida('A4 cierre');
  const pendiente = arbolNuevo(jid, { fecha_registro: new Date(Date.now() - 10 * 60000).toISOString() });
  const c = await enviar(S.coord, [op('jornada.cerrar', { id: jid, version: v })]);
  const r1 = await enviar(S.cabo2, [op('registro.crear', pendiente)]);
  const ra = await enviar(S.coord, [op('jornada.reabrir', { id: jid, version: c[0].version })]);
  const r2 = await enviar(S.cabo2, [op('registro.crear', pendiente)]);
  log('A4 cerrar:', resumen(c), '· árbol de apoyo pendiente llega:', resumen(r1), r1[0].mensaje, '· reabrir:', resumen(ra), '· el mismo árbol otra vez (el teléfono NO lo reenvía solo):', resumen(r2));
  const e = await compartida('A4b eliminar');
  const d = await enviar(S.coord, [op('jornada.eliminar', { id: e.jid, version: e.version })]);
  const r3 = await arbol(S.cabo1, e.jid);
  log('A4b eliminar sin árboles en el servidor:', resumen(d), '· árbol de apoyo pendiente llega:', resumen(r3));
  const f = await compartida('A4c eliminar con árbol de apoyo');
  const ra3 = await arbol(S.cabo1, f.jid);
  const d2 = await enviar(S.coord, [op('jornada.eliminar', { id: f.jid, version: await version(f.jid) })]);
  const el = await enviar(S.cabo1, [op('registro.eliminar', { id: ra3[0].id, version: ra3[0].version })]);
  const d3 = await enviar(S.coord, [op('jornada.eliminar', { id: f.jid, version: await version(f.jid) })]);
  log('A4c con árbol de apoyo en el servidor:', resumen(d2), d2[0].mensaje, '· tras eliminar el árbol:', resumen(el), resumen(d3), d3[0].mensaje);
}

/* A5. Relevo dentro de una compartida */
{
  const { jid, version: v } = await compartida('A5 relevo');
  const r1 = await enviar(S.coord, [op('jornada.relevo', { id: jid, version: v, cabo_id: K.cabo3.id })]);
  const a1 = await arbol(S.coord, jid);
  const a2 = await arbol(S.cabo1, jid);
  const a3 = await arbol(S.cabo3, jid);
  // Relevo a un cabo que ya es de apoyo: ¿puede después cambiar la jornada?
  const r2 = await enviar(S.coord, [op('jornada.relevo', { id: jid, version: await version(jid), cabo_id: K.cabo1.id })]);
  const r3 = await enviar(S.coord, [op('jornada.relevo', { id: jid, version: await version(jid), cabo_id: K.coord.id })]);   // vuelve el titular
  const ed = await enviar(S.cabo1, [op('jornada.editar', { id: jid, version: await version(jid), cambios: { nombre: 'r5 A5 renombrada por el cabo de apoyo' } })]);
  const ce = await enviar(S.cabo1, [op('jornada.cerrar', { id: jid, version: await version(jid) })]);
  log('A5 relevo a cabo3:', resumen(r1), '· la Coordinación registra:', resumen(a1), '· apoyo cabo1 registra:', resumen(a2), '· relevo cabo3 registra:', resumen(a3),
    '· relevo a cabo1 (apoyo) y vuelta al titular:', resumen(r2), resumen(r3), '· cabo1, ya sin relevo, edita la jornada:', resumen(ed), '· y la cierra:', resumen(ce));
  log('A5 bitácora:', await bitacora(jid));
}

/* A6. El mismo cabo dos veces, identificadores raros y perfiles que no son cabo */
{
  const { jid } = await compartida('A6 duplicados', []);
  const casos = {
    'dos veces el mismo': { agregar: [K.cabo1.id, K.cabo1.id] },
    'otra vez el mismo, ya vigente': { agregar: [K.cabo1.id] },
    'agregar y quitar el mismo': { agregar: [K.cabo2.id], quitar: [K.cabo2.id] },
    'en mayúsculas': { agregar: [K.cabo3.id.toUpperCase()] },
    'no es uuid': { agregar: ['no-es-un-id'] },
    'uuid inexistente': { agregar: [uuid()] },
    'la propia Coordinación': { agregar: [K.coord.id] },
    'otra Coordinación': { agregar: [K.coord2.id] },
    'Administración': { agregar: [K.admin.id] },
    'agregar como texto': { agregar: K.cabo3.id },
    'agregar null, quitar objeto': { agregar: null, quitar: { a: 1 } },
    'quitar a quien no está': { quitar: [K.cabo3.id] },
  };
  for (const [nombre, d] of Object.entries(casos)) {
    const r = await enviar(S.coord, [op('jornada.compartir', { id: jid, ...d })]);
    log('A6', nombre + ':', resumen(r), r[0].errores ? JSON.stringify(r[0].errores) : '', '→', JSON.stringify(apoyos(await estadoJ(jid))));
  }
  log('A6 bitácora (APOYO):', (await bitacora(jid)).filter((x) => x.startsWith('APOYO')));
}

/* A7. Otra institución, metida a mano */
{
  const { jid, version: v } = await compartida('A7 otra institución', ['cabo1']);
  const r = {
    'Coordinación agrega cabo de otra institución': await enviar(S.coord, [op('jornada.compartir', { id: jid, agregar: [K.otroCabo.id] })]),
    'Coordinación de otra institución comparte': await enviar(S.otroCoord, [op('jornada.compartir', { id: jid, agregar: [K.otroCabo.id] })]),
    'Otra Coordinación de la misma institución comparte': await enviar(S.coord2, [op('jornada.compartir', { id: jid, agregar: [K.cabo3.id] })]),
    'cabo de otra institución registra': await arbol(S.otroCabo, jid),
    'cabo de otra institución termina': await enviar(S.otroCabo, [op('jornada.terminar', { id: jid, version: v })]),
    'cabo de la institución que no es de apoyo registra': await arbol(S.cabo3, jid),
    'cabo de la institución que no es de apoyo termina': await enviar(S.cabo3, [op('jornada.terminar', { id: jid })]),
  };
  for (const [k, x] of Object.entries(r)) log('A7', k + ':', resumen(x), (x[0] && x[0].mensaje) || '');
  const g = await pedir(S.otroCabo, 'GET', '/jornadas/' + jid);
  const g2 = await pedir(S.otroCoord, 'GET', '/jornadas/' + jid);
  log('A7 otra institución lee la jornada:', g.estado, g2.estado);
}

/* A8. Una compartida reabierta */
{
  const { jid } = await compartida('A8 reabierta', ['cabo1', 'cabo2']);
  await enviar(S.cabo2, [op('jornada.terminar', { id: jid })]);
  const c = await enviar(S.coord, [op('jornada.cerrar', { id: jid, version: await version(jid) })]);
  const ra = await enviar(S.coord, [op('jornada.reabrir', { id: jid, version: c[0].version })]);
  const a1 = await arbol(S.cabo1, jid), a2 = await arbol(S.cabo2, jid);
  log('A8 reabierta:', resumen(ra), '· cabo1 (vigente al cerrar) registra:', resumen(a1), '· cabo2 (terminó) registra:', resumen(a2), JSON.stringify(apoyos(await estadoJ(jid))));
}

/* A9. «Cabos de apoyo» en dos pestañas o teléfonos de la Coordinación a la vez */
{
  const { jid } = await compartida('A9 dos pestañas', ['cabo1', 'cabo2']);
  const [x, y] = await Promise.all([
    enviar(S.coord, [op('jornada.compartir', { id: jid, version: 'vieja', agregar: [], quitar: [K.cabo1.id] })]),
    enviar(S.coord, [op('jornada.compartir', { id: jid, version: 'vieja', agregar: [K.cabo3.id], quitar: [] })]),
  ]);
  log('A9 pestaña 1 quita cabo1 y pestaña 2 agrega cabo3 a la vez:', resumen(x), resumen(y), '→', JSON.stringify(apoyos(await estadoJ(jid))));
}

/* A10. Lo que ve y hace el cabo de apoyo con peticiones alteradas a mano */
{
  const { jid, version: v } = await compartida('A10 cabo de apoyo', ['cabo1', 'cabo2']);
  const de2 = (await arbol(S.cabo2, jid))[0];
  const deC = (await arbol(S.coord, jid))[0];
  const otraJ = jornadaNueva('r5 A10 propia de cabo1 c' + corrida);
  await enviar(S.cabo1, [op('jornada.crear', otraJ)]);
  const propio = (await arbol(S.cabo1, jid))[0];
  const intentos = {
    'editar árbol de otro cabo': op('registro.editar', { id: de2.id, version: de2.version, cambios: { comentarios: 'alterado por cabo1' } }),
    'eliminar árbol de la Coordinación': op('registro.eliminar', { id: deC.id, version: deC.version }),
    'sustituir árbol de otro cabo': op('registro.sustituir', { ...arbolNuevo(jid), sustituye_id: de2.id, motivo_sustitucion: 'ROBO' }),
    'mover árbol de otro cabo a su jornada': op('registro.mover', { id: de2.id, version: de2.version, jornada_id: otraJ.id }),
    'mover SU árbol fuera de la compartida': op('registro.mover', { id: propio.id, version: propio.version, jornada_id: otraJ.id }),
    'editar la jornada': op('jornada.editar', { id: jid, version: v, cambios: { nombre: 'alterada' } }),
    'cerrar la jornada': op('jornada.cerrar', { id: jid, version: v }),
    'eliminar la jornada': op('jornada.eliminar', { id: jid, version: v }),
    'revisar puntos': op('jornada.revisar', { id: jid, version: v, puntos_revisados: [de2.id] }),
    'relevo': op('jornada.relevo', { id: jid, version: v, cabo_id: K.cabo1.id }),
    'compartir': op('jornada.compartir', { id: jid, agregar: [K.cabo3.id] }),
  };
  for (const [k, o] of Object.entries(intentos)) {
    const r = await enviar(S.cabo1, [o]);
    log('A10 cabo1 (apoyo)', k + ':', resumen(r), r[0].mensaje || '');
  }
  const g = await pedir(S.cabo1, 'GET', '/jornadas/' + jid);
  log('A10 cabo1 ve la jornada:', g.estado, 'árboles visibles:', g.datos.plantaciones && g.datos.plantaciones.length);
  const ed = await enviar(S.coord2, [op('registro.editar', { id: de2.id, version: (await leerBase(`SELECT to_char(coalesce(fecha_ultima_edicion, fecha_registro) AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') AS v FROM srp.plantaciones WHERE id = $1`, [de2.id]))[0].v, cambios: { comentarios: 'corregido por otra Coordinación' } })]);
  log('A10 otra Coordinación de la institución corrige el árbol de un cabo de apoyo:', resumen(ed));
}

/* A11. Datos raros en compartir y terminar */
{
  const { jid } = await compartida('A11 datos raros', ['cabo1']);
  const muchos = Array.from({ length: 2000 }, () => uuid());
  const enormes = Array.from({ length: 6000 }, () => uuid());
  const t0 = performance.now();
  const r1 = await enviar(S.coord, [op('jornada.compartir', { id: jid, agregar: muchos })]);
  const ms1 = Math.round(performance.now() - t0);
  const r2 = await pedir(S.coord, 'POST', '/envios', { operaciones: [op('jornada.compartir', { id: jid, agregar: enormes })] });
  const r3 = await enviar(S.coord, [op('jornada.compartir', { id: uuid(), agregar: [K.cabo2.id] })]);
  const r4 = await enviar(S.coord, [op('jornada.compartir', { agregar: [K.cabo2.id] })]);
  const r5 = await enviar(S.cabo1, [op('jornada.terminar', { id: jid, version: '1999-01-01T00:00:00.000Z' })]);
  const r6 = await enviar(S.coord, [op('jornada.compartir', { id: jid, version: 'no es fecha', agregar: [K.cabo2.id] })]);
  const r7 = await enviar(S.cabo1, [op('jornada.terminar', { id: jid })]);
  log('A11 2,000 ids inexistentes:', resumen(r1), ms1 + ' ms', '· 6,000 ids (≈230 kB):', r2.estado, JSON.stringify(r2.datos).slice(0, 120), '· jornada inexistente:', resumen(r3), '· sin id:', resumen(r4));
  log('A11 terminar con versión de 1999:', resumen(r5), '· compartir con versión «no es fecha»:', resumen(r6), '· terminar otra vez:', resumen(r7), JSON.stringify(apoyos(await estadoJ(jid))));
}

/* A12. Doble envío y doble toque */
{
  const { jid } = await compartida('A12 doble', []);
  const c = op('jornada.compartir', { id: jid, agregar: [K.cabo1.id, K.cabo2.id] });
  const rs = await Promise.all([enviar(S.coord, [c]), enviar(S.coord, [c]), enviar(S.coord, [c])]);
  const t = op('jornada.terminar', { id: jid });
  const ts = await Promise.all([enviar(S.cabo1, [t]), enviar(S.cabo1, [t])]);
  const a = op('registro.crear', arbolNuevo(jid));
  const as = await Promise.all([enviar(S.cabo2, [a]), enviar(S.cabo2, [a]), enviar(S.cabo2, [a, a])]);
  const n = await leerBase(`SELECT count(*)::int AS n FROM srp.plantaciones WHERE jornada_id = $1`, [jid]);
  const b = (await bitacora(jid)).filter((x) => x.startsWith('APOYO'));
  log('A12 compartir x3 a la vez:', rs.map(resumen).join(' | '), '· terminar x2:', ts.map(resumen).join(' | '), '· mismo árbol x4:', as.map(resumen).join(' | '), '· árboles:', n[0].n, '· APOYO en bitácora:', b.length, b);
}

/* A13. Reenvío tras respuesta perdida (el teléfono reenvía «tal como salió» lo que no tuvo respuesta) */
{
  const { jid } = await compartida('A13 reenvío', []);
  const agregar = op('jornada.compartir', { id: jid, agregar: [K.cabo1.id], quitar: [] });
  const r1 = await enviar(S.coord, [agregar]);          // llegó, pero la respuesta se perdió
  const t = await enviar(S.cabo1, [op('jornada.terminar', { id: jid })]);   // el cabo termina su parte
  const antes = apoyos(await estadoJ(jid));
  const r2 = await enviar(S.coord, [agregar]);          // el teléfono de la Coordinación reenvía igual al volver la señal
  const despues = apoyos(await estadoJ(jid));
  const a = await arbol(S.cabo1, jid);
  log('A13 compartir llega:', resumen(r1), '· cabo1 termina:', resumen(t), JSON.stringify(antes), '· el MISMO compartir reenviado:', resumen(r2), '→', JSON.stringify(despues), '· cabo1 vuelve a poder registrar:', resumen(a));
  // Y al revés: «Terminar mi parte» cuya respuesta se perdió, reenviado después de que la Coordinación lo volvió a marcar
  const term = op('jornada.terminar', { id: jid });
  const r3 = await enviar(S.cabo1, [term]);
  const r4 = await enviar(S.coord, [op('jornada.compartir', { id: jid, agregar: [K.cabo1.id], quitar: [] })]);
  const r5 = await enviar(S.cabo1, [term]);
  log('A13b terminar llega:', resumen(r3), '· la Coordinación lo vuelve a marcar:', resumen(r4), '· el MISMO terminar reenviado:', resumen(r5), '→', JSON.stringify(apoyos(await estadoJ(jid))));
  log('A13 bitácora:', (await bitacora(jid)).filter((x) => x.startsWith('APOYO')));
}

/* A16. Quitado y luego «Terminar mi parte» desde su teléfono */
{
  const { jid } = await compartida('A16 quitado termina', ['cabo1']);
  await enviar(S.coord, [op('jornada.compartir', { id: jid, quitar: [K.cabo1.id] })]);
  const r = await enviar(S.cabo1, [op('jornada.terminar', { id: jid })]);
  log('A16 cabo quitado toca «Terminar mi parte»:', resumen(r), r[0].mensaje);
}

log.guardar();
process.exit(0);
