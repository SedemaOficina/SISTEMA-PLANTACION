/* r5 · Otra Coordinación de la misma institución hace un relevo en la jornada compartida de la Coordinación titular */
import { CUENTAS as K, entrar, enviar, op, jornadaNueva, arbolNuevo, bitacoraDePrueba } from './comun.mjs';
const corrida = process.argv[2] || '1';
const log = bitacoraDePrueba('e3_relevo_otra_coord_' + corrida + '.txt');
const coord = await entrar(K.coord), coord2 = await entrar(K.coord2), cabo1 = await entrar(K.cabo1);
const j = jornadaNueva('r5 relevo de otra coordinación c' + corrida);
const r = await enviar(coord, [op('jornada.crear', j), op('jornada.compartir', { id: j.id, agregar: [K.cabo1.id, K.cabo2.id] })]);
const rel = await enviar(coord2, [op('jornada.relevo', { id: j.id, version: r[1].version, cabo_id: K.cabo1.id })]);
const a = await enviar(coord, [op('registro.crear', arbolNuevo(j.id))]);
const v = rel[0].version;
const back = await enviar(coord2, [op('jornada.relevo', { id: j.id, version: v, cabo_id: K.coord.id })]);
const el = await enviar(cabo1, [op('jornada.eliminar', { id: j.id, version: back[0].version })]);
const s = (x) => x.map((y) => y.estado + (y.codigo ? ':' + y.codigo : '')).join(',');
log('Otra Coordinación hace relevo a cabo1 (de apoyo) en la compartida de la titular:', s(rel), '· la titular registra en su jornada:', s(a), a[0].mensaje || '',
  '· la otra Coordinación la devuelve a la titular:', s(back), '· cabo1 (apoyo, ex relevo) ELIMINA la jornada vacía:', s(el));
log.guardar(); process.exit(0);
