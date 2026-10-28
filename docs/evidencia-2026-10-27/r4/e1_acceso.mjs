/* E1 · CONTROL DE ACCESO DE LO NUEVO (bloques 252 y 253), con peticiones armadas a mano contra el servicio.
   Revisor r4, auditoría del 27-10-2026. Sólo crea cuentas r4.*@ejemplo.local y lo que ellas hacen; al final
   lo borra todo con evidencia/e1_limpiar.mjs (sin quitarle el rol srp_api a la cuenta local, para no tumbar
   los servicios de los demás revisores).

   Uso (desde la raíz de la copia r4, con el servicio en 3124):
     node evidencia/e1_acceso.mjs [corrida]      → evidencia/e1_acceso.<corrida>.json y la tabla en pantalla

   Cada caso dice quién lo intenta, qué, lo esperado y lo observado. */
import { spawnSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { writeFileSync } from 'node:fs';

const API = 'http://127.0.0.1:3124/api/srp';
const corrida = process.argv[2] || '1';
const CLAVE = process.env.R4_CLAVE;   // contraseña de las cuentas de prueba: se pasa por la variable R4_CLAVE (se quitó del archivo)
if (!CLAVE) throw new Error('Falta R4_CLAVE');
const X = 'o-paot', Y = 'o-reforestamos', S = 'o-sedema';

const cuentas = {
  cx1: ['COORDINADOR', X], cx2: ['COORDINADOR', X], cy: ['COORDINADOR', Y],
  k1: ['CABO', X], k2: ['CABO', X], k3: ['CABO', X], ky: ['CABO', Y],
  dx: ['DIRECTIVO', X], dy: ['DIRECTIVO', Y], ds: ['DIRECTIVO', S], ad: ['ADMIN', S],
};
const ids = Object.fromEntries(Object.keys(cuentas).map((k) => [k, randomUUID()]));
writeFileSync(`evidencia/e1_acceso.${corrida}.ids.json`, JSON.stringify(ids, null, 1));

const apoyo = (orden, datos) => {
  const r = spawnSync('node', ['pruebas/apoyo_servidor.mjs', orden], { input: JSON.stringify(datos), encoding: 'utf8' });
  const s = JSON.parse(r.stdout || '{}');
  if (!s.ok && orden !== 'apoyos') throw new Error(orden + ': ' + (s.error || r.stderr));
  return s;
};
apoyo('preparar', { cuentas: Object.entries(cuentas).map(([k, [perfil, org]]) => ({
  id: ids[k], correo: `r4.${k}.${corrida}@ejemplo.local`, nombre: `R4 ${k} ${corrida}`, perfil, organizacion_id: org, clave: CLAVE, temporal: false })) });

const galletas = {};
async function entrar(k) {
  const r = await fetch(API + '/acceso/entrar', { method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ correo: `r4.${k}.${corrida}@ejemplo.local`, contrasena: CLAVE }) });
  const c = r.headers.get('set-cookie');
  if (r.status !== 200 || !c) throw new Error('No entró ' + k + ': ' + r.status + ' ' + (await r.text()));
  galletas[k] = c.split(';')[0];
}
for (const k of Object.keys(cuentas)) await entrar(k);

const pedir = async (k, metodo, ruta, cuerpo) => {
  const r = await fetch(API + ruta, { method: metodo, headers: { 'content-type': 'application/json', cookie: galletas[k] }, body: cuerpo ? JSON.stringify(cuerpo) : undefined });
  let j = null; try { j = await r.json(); } catch { /* sin cuerpo */ }
  return { estado: r.status, j };
};
const op = async (k, tipo, datos) => {
  const r = await pedir(k, 'POST', '/envios', { operaciones: [{ tipo, datos }] });
  return r.j?.resultados?.[0] ?? { estado: 'HTTP ' + r.estado, codigo: r.j?.codigo };
};
const resumen = (res) => res.estado === 'recibido' ? (res.repetido ? 'recibido(repetido)' : 'recibido') : (res.codigo || res.estado);

const casos = [];
let n = 0;
function anotar(quien, que, esperado, observado, nota = '') {
  const ok = Array.isArray(esperado) ? esperado.includes(observado) : esperado === observado;
  casos.push({ n: ++n, quien, que, esperado: Array.isArray(esperado) ? esperado.join('|') : esperado, observado, ok, nota });
}
const hoy = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Mexico_City' }).format(new Date());
const ahora = () => new Date().toISOString();
const jornadaNueva = (id, nombre, extra = {}) => ({ id, nombre, ubicacion: '', programa_id: 'p-refor', lat: 19.3601, lng: -99.1503, punto_origen: 'manual',
  gps_precision_m: 5, arboles_previstos: 20, fecha: hoy, fecha_inicio: ahora(), comentarios: '', ...extra });
let paso = 0;
const arbolNuevo = (jornadaId, extra = {}) => ({ id: randomUUID(), jornada_id: jornadaId, lat: 19.3601 + (++paso) * 0.00012, lng: -99.1503, punto_origen: 'gps',
  gps_precision_m: 5, especie_id: 'ESP-0001', fecha_plantacion: hoy, sitio_plantacion: 'suelo', comentarios: '', fecha_registro: ahora(), ...extra });
const versionDe = (f) => f?.fecha_ultima_edicion ?? f?.fecha_registro ?? f?.fecha_inicio;
async function jornadaComo(k, id) { return (await pedir(k, 'GET', '/jornadas/' + id)).j?.jornada; }

/* ---------- 1. La jornada compartida de la Coordinación de X ---------- */
const J = randomUUID();
let r = await op('cx1', 'jornada.crear', jornadaNueva(J, 'R4 compartida ' + corrida));
anotar('cx1 (Coord X)', 'jornada.crear J', 'recibido', resumen(r));

// Asignación masiva: un cabo que crea su jornada con cabos_apoyo ya puestos
const JK = randomUUID();
r = await op('k1', 'jornada.crear', jornadaNueva(JK, 'R4 de k1 ' + corrida, { cabos_apoyo: [{ cabo_id: ids.k2, desde: ahora(), por_id: ids.k1, hasta: null, fin: null }], relevo_id: ids.k3, organizacion_id: Y, cabo_id: ids.k3 }));
anotar('k1 (Cabo X)', 'jornada.crear con cabos_apoyo/relevo_id/organizacion_id/cabo_id inyectados', 'recibido', resumen(r));
anotar('k1 (Cabo X)', '… el servidor ignora lo inyectado (cabos_apoyo=[], relevo nulo, org=X, cabo=k1)', 'sí',
  JSON.stringify(r.fila?.cabos_apoyo) === '[]' && r.fila?.relevo_id === null && r.fila?.organizacion_id === X && r.fila?.cabo_id === ids.k1 ? 'sí' : 'no: ' + JSON.stringify({ a: r.fila?.cabos_apoyo, rel: r.fila?.relevo_id, org: r.fila?.organizacion_id }));

/* ---------- 2. jornada.compartir: nadie más que la Coordinación titular ---------- */
for (const k of ['k1', 'k3', 'cx2', 'cy', 'ky', 'dx', 'dy', 'ds', 'ad']) {
  r = await op(k, 'jornada.compartir', { id: J, agregar: [ids.k1, ids.k2] });
  anotar(k, 'jornada.compartir en J (titular cx1)', 'SIN_PERMISO', resumen(r));
}
r = await op('k1', 'jornada.compartir', { id: JK, agregar: [ids.k2] });
anotar('k1', 'jornada.compartir en su propia jornada (un cabo no comparte)', 'SIN_PERMISO', resumen(r));
r = await op('cx1', 'jornada.compartir', { id: J, agregar: [ids.ky] });
anotar('cx1', 'agregar un cabo de OTRA institución', 'DATOS_INVALIDOS', resumen(r));
r = await op('cx1', 'jornada.compartir', { id: J, agregar: [ids.cx2] });
anotar('cx1', 'agregar a otra Coordinación como cabo de apoyo', 'DATOS_INVALIDOS', resumen(r));
r = await op('cx1', 'jornada.compartir', { id: J, agregar: [ids.dx] });
anotar('cx1', 'agregar a un Directivo como cabo de apoyo', 'DATOS_INVALIDOS', resumen(r));
r = await op('cx1', 'jornada.compartir', { id: J, agregar: ["x' OR 1=1 --", 42, null, { a: 1 }] });
anotar('cx1', 'agregar valores que no son identificadores (inyección)', 'recibido(repetido)', resumen(r), 'se descartan; nada cambia');
r = await op('cx1', 'jornada.compartir', { id: J, agregar: [ids.k1, ids.k2] });
anotar('cx1', 'agregar k1 y k2 (cabos de X)', 'recibido', resumen(r));
anotar('—', '… quedan 2 vigentes', 2, (r.fila?.cabos_apoyo || []).filter((a) => !a.hasta).length);

/* ---------- 3. jornada.terminar: sólo el cabo de apoyo vigente ---------- */
for (const k of ['k3', 'ky', 'cx1', 'cx2', 'cy', 'dx', 'ds', 'ad']) {
  r = await op(k, 'jornada.terminar', { id: J });
  anotar(k, 'jornada.terminar en J sin ser cabo de apoyo', 'SIN_PERMISO', resumen(r));
}

/* ---------- 4. Registrar en la compartida ---------- */
const A1 = arbolNuevo(J), A2 = arbolNuevo(J);
anotar('k1', 'registro.crear en J (apoyo vigente)', 'recibido', resumen(await op('k1', 'registro.crear', A1)));
anotar('k2', 'registro.crear en J (apoyo vigente)', 'recibido', resumen(await op('k2', 'registro.crear', A2)));
for (const k of ['k3', 'ky', 'cx2', 'cy']) anotar(k, 'registro.crear en J sin ser titular ni apoyo', 'SIN_PERMISO', resumen(await op(k, 'registro.crear', arbolNuevo(J))));
for (const k of ['dx', 'ds', 'ad']) anotar(k, 'registro.crear en J (perfil que no registra)', 'SIN_PERMISO', resumen(await op(k, 'registro.crear', arbolNuevo(J))));

/* ---------- 5. «Terminar mi parte» y lo que pasa después ---------- */
anotar('k1', 'jornada.terminar (apoyo vigente)', 'recibido', resumen(await op('k1', 'jornada.terminar', { id: J })));
anotar('k1', 'jornada.terminar otra vez', 'recibido(repetido)', resumen(await op('k1', 'jornada.terminar', { id: J })));
anotar('k1', 'registro.crear en J después de terminar', 'SIN_PERMISO', resumen(await op('k1', 'registro.crear', arbolNuevo(J))));
r = await op('cx1', 'jornada.compartir', { id: J, quitar: [ids.k2] });
anotar('cx1', 'quitar a k2', 'recibido', resumen(r));
anotar('k2', 'registro.crear en J después de que lo quitaron', 'SIN_PERMISO', resumen(await op('k2', 'registro.crear', arbolNuevo(J))));
anotar('k2', 'jornada.terminar después de que lo quitaron', 'SIN_PERMISO', resumen(await op('k2', 'jornada.terminar', { id: J })));

/* ---------- 6. El que fue cabo de apoyo no cambia la jornada ---------- */
let v = versionDe(await jornadaComo('cx1', J));
for (const k of ['k1', 'k2']) {
  anotar(k, 'jornada.editar J (fue apoyo)', 'SIN_PERMISO', resumen(await op(k, 'jornada.editar', { id: J, version: v, cambios: { nombre: 'cambiado por ' + k } })));
  anotar(k, 'jornada.cerrar J (fue apoyo)', 'SIN_PERMISO', resumen(await op(k, 'jornada.cerrar', { id: J, version: v })));
  anotar(k, 'jornada.revisar J (fue apoyo)', 'SIN_PERMISO', resumen(await op(k, 'jornada.revisar', { id: J, version: v, puntos_revisados: [A1.id] })));
  anotar(k, 'jornada.eliminar J (fue apoyo)', 'SIN_PERMISO', resumen(await op(k, 'jornada.eliminar', { id: J, version: v })));
  anotar(k, 'jornada.relevo J (fue apoyo)', 'SIN_PERMISO', resumen(await op(k, 'jornada.relevo', { id: J, version: v, cabo_id: k === 'k1' ? ids.k1 : ids.k2 })));
  anotar(k, 'jornada.compartir J para volver a entrar', 'SIN_PERMISO', resumen(await op(k, 'jornada.compartir', { id: J, agregar: [ids[k]] })));
  anotar(k, 'jornada.reporte J (fue apoyo)', 'SIN_PERMISO', resumen(await op(k, 'jornada.reporte', { id: J, version: v })));
}

/* ---------- 7. Árboles de otros en la compartida ---------- */
const arbol = async (k, id) => (await pedir(k, 'GET', '/jornadas/' + J)).j?.plantaciones?.find((x) => x.id === id);
const a2 = await arbol('cx1', A2.id);
for (const k of ['k1', 'k3', 'ky', 'cy']) {
  anotar(k, 'registro.editar el árbol de k2', 'SIN_PERMISO', resumen(await op(k, 'registro.editar', { id: A2.id, version: versionDe(a2), cambios: { comentarios: 'por ' + k } })));
  anotar(k, 'registro.eliminar el árbol de k2', 'SIN_PERMISO', resumen(await op(k, 'registro.eliminar', { id: A2.id, version: versionDe(a2) })));
  anotar(k, 'registro.mover el árbol de k2', 'SIN_PERMISO', resumen(await op(k, 'registro.mover', { id: A2.id, version: versionDe(a2), jornada_id: JK })));
  anotar(k, 'registro.sustituir el árbol de k2', 'SIN_PERMISO', resumen(await op(k, 'registro.sustituir', { ...arbolNuevo(J), sustituye_id: A2.id, motivo_sustitucion: 'muerto' })));
}
for (const k of ['dx', 'ds']) anotar(k, 'registro.editar el árbol de k2 (Directivo)', 'SIN_PERMISO', resumen(await op(k, 'registro.editar', { id: A2.id, version: versionDe(a2), cambios: { comentarios: 'por ' + k } })));
const a1 = await arbol('cx1', A1.id);
anotar('k1', 'registro.editar SU árbol después de terminar (por diseño: corrige los suyos)', 'recibido', resumen(await op('k1', 'registro.editar', { id: A1.id, version: versionDe(a1), cambios: { comentarios: 'corregido por k1' } })));
const a2b = await arbol('cx1', A2.id);
anotar('cx2', 'registro.editar el árbol de k2 (Coord X, toda su institución: por diseño)', 'recibido', resumen(await op('cx2', 'registro.editar', { id: A2.id, version: versionDe(a2b), cambios: { comentarios: 'corregido por cx2' } })));

/* ---------- 8. GET /jornadas/:id ---------- */
const verJ = { k1: 200, k2: 200, k3: 404, ky: 404, cx1: 200, cx2: 200, cy: 404, dx: 200, dy: 404, ds: 200, ad: 200 };
for (const [k, e] of Object.entries(verJ)) {
  const g = await pedir(k, 'GET', '/jornadas/' + J);
  anotar(k, 'GET /jornadas/J', e, g.estado, g.estado === 200 ? (g.j.plantaciones.length + ' árboles') : '');
}
const gk1 = await pedir('k1', 'GET', '/jornadas/' + J);
anotar('k1', '… ve también el árbol de k2 (por diseño: quien fue apoyo ve todos)', 'sí', gk1.j?.plantaciones?.some((x) => x.id === A2.id) ? 'sí' : 'no');
anotar('k1', 'GET /jornadas/no-es-uuid', 400, (await pedir('k1', 'GET', '/jornadas/1%27%20OR%201=1')).estado);
anotar('k1', 'GET /jornadas/<uuid inexistente>', 404, (await pedir('k1', 'GET', '/jornadas/' + randomUUID())).estado);
anotar('k3', 'GET /jornadas/JK (jornada de otro cabo de su institución)', 404, (await pedir('k3', 'GET', '/jornadas/' + JK)).estado);
anotar('cy', 'GET /jornadas/JK (Coordinación de otra institución)', 404, (await pedir('cy', 'GET', '/jornadas/' + JK)).estado);
anotar('cx2', 'GET /jornadas/JK (Coordinación de su institución)', 200, (await pedir('cx2', 'GET', '/jornadas/' + JK)).estado);
// Sin sesión
const sinSesion = await fetch(API + '/jornadas/' + J);
anotar('sin sesión', 'GET /jornadas/J', 401, sinSesion.status);

/* ---------- 9. Listados: lo que se ve de la compartida ---------- */
const anterior = (uuid) => { const h = uuid.replace(/-/g, ''); const b = (BigInt('0x' + h) - 1n).toString(16).padStart(32, '0');
  return `${b.slice(0, 8)}-${b.slice(8, 12)}-${b.slice(12, 16)}-${b.slice(16, 20)}-${b.slice(20)}`; };
const enLista = async (k, tabla, id) => { const g = await pedir(k, 'GET', `/${tabla}?despues=${anterior(id)}&limite=1`); return (g.j?.filas || []).some((x) => x.id === id) ? 'sí' : 'no'; };
for (const [k, e] of [['k1', 'sí'], ['k3', 'no'], ['ky', 'no'], ['cy', 'no'], ['dy', 'no'], ['cx2', 'sí'], ['dx', 'sí']]) {
  anotar(k, 'GET /jornadas lista J', e, await enLista(k, 'jornadas', J));
  anotar(k, 'GET /plantaciones lista el árbol de k2', e, await enLista(k, 'plantaciones', A2.id));
}
for (const [k, e] of [['k1', 200], ['k3', 404], ['cy', 404], ['dy', 404]]) anotar(k, 'GET /plantaciones/<árbol de k2>/historial', e, (await pedir(k, 'GET', `/plantaciones/${A2.id}/historial`)).estado);
// Cuentas: el cabo de apoyo no recibe correos; la Coordinación de Y no ve las cuentas de X
const ck1 = (await pedir('k1', 'GET', '/cuentas')).j?.filas || [];
anotar('k1', 'GET /cuentas: ningún correo', 'sí', ck1.every((x) => !('correo' in x)) ? 'sí' : 'no');
anotar('k1', 'GET /cuentas: ve a k2 (aparece en la compartida)', 'sí', ck1.some((x) => x.id === ids.k2) ? 'sí' : 'no');
anotar('k1', 'GET /cuentas: no ve a k3 (no aparece en nada que vea)', 'no', ck1.some((x) => x.id === ids.k3) ? 'sí' : 'no');
const ccy = (await pedir('cy', 'GET', '/cuentas')).j?.filas || [];
anotar('cy', 'GET /cuentas: no ve cuentas de X', 0, ccy.filter((x) => x.organizacion_id === X && Object.values(ids).includes(x.id)).length);

/* ---------- 10. Relevo dentro de una compartida ---------- */
v = versionDe(await jornadaComo('cx1', J));
anotar('cy', 'jornada.relevo J a k3 (Coord de otra institución)', 'SIN_PERMISO', resumen(await op('cy', 'jornada.relevo', { id: J, version: v, cabo_id: ids.k3 })));
anotar('dx', 'jornada.relevo J a k3 (Directivo)', 'SIN_PERMISO', resumen(await op('dx', 'jornada.relevo', { id: J, version: v, cabo_id: ids.k3 })));
anotar('cx2', 'jornada.relevo J a ky (cabo de otra institución)', 'DATOS_INVALIDOS', resumen(await op('cx2', 'jornada.relevo', { id: J, version: v, cabo_id: ids.ky })));
r = await op('cx2', 'jornada.relevo', { id: J, version: v, cabo_id: ids.k3 });
anotar('cx2', 'jornada.relevo J a k3 (otra Coord de X: por diseño, toda la institución)', 'recibido', resumen(r));
anotar('k3', 'registro.crear en J como relevo', 'recibido', resumen(await op('k3', 'registro.crear', arbolNuevo(J))));
anotar('cx1', 'registro.crear en J siendo titular con relevo puesto', 'SIN_PERMISO', resumen(await op('cx1', 'registro.crear', arbolNuevo(J))));
anotar('k3', 'jornada.compartir J siendo relevo (un cabo no comparte)', 'SIN_PERMISO', resumen(await op('k3', 'jornada.compartir', { id: J, agregar: [ids.k2] })));
anotar('cx2', 'jornada.compartir J (Coord de X que no es titular)', 'SIN_PERMISO', resumen(await op('cx2', 'jornada.compartir', { id: J, agregar: [ids.k2] })));
anotar('cx1', 'jornada.compartir J con relevo puesto: vuelve k2', 'recibido', resumen(await op('cx1', 'jornada.compartir', { id: J, agregar: [ids.k2] })));
anotar('k2', 'registro.crear en J (vigente otra vez)', 'recibido', resumen(await op('k2', 'registro.crear', arbolNuevo(J))));

/* ---------- 10b. Un árbol eliminado, pedido para «sustituir» por quien no lo alcanza ---------- */
const A3 = arbolNuevo(J, { comentarios: 'R4 comentario privado de k2' });
anotar('k2', 'registro.crear A3 en J', 'recibido', resumen(r = await op('k2', 'registro.crear', A3)));
anotar('k2', 'registro.eliminar A3 (su árbol)', 'recibido', resumen(await op('k2', 'registro.eliminar', { id: A3.id, version: r.version })));
for (const k of ['ky', 'cy', 'k3']) {
  const s = await op(k, 'registro.sustituir', { ...arbolNuevo(J), sustituye_id: A3.id, motivo_sustitucion: 'muerto' });
  const fuga = (s.otras || []).find((o) => o.fila?.id === A3.id)?.fila;
  anotar(k, 'registro.sustituir A3 (eliminado, de otro cabo' + (k === 'k3' ? '' : ', de otra institución') + ')', 'SIN_PERMISO', resumen(s),
    fuga ? 'la respuesta trae el árbol completo: ' + Object.keys(fuga).length + ' campos, entre ellos cabo_id, lat, lng, comentarios=«' + fuga.comentarios + '»' : 'sin datos del árbol');
}

/* ---------- 11. Con la jornada cerrada ---------- */
v = versionDe(await jornadaComo('cx1', J));
r = await op('cx1', 'jornada.cerrar', { id: J, version: v });
anotar('cx1', 'jornada.cerrar J (titular)', ['recibido', 'DATOS_INVALIDOS', 'PUNTOS_SIN_REVISAR'], resumen(r), r.mensaje || '');
if (resumen(r) === 'recibido') {
  anotar('k2', 'jornada.terminar con J cerrada', 'SIN_PERMISO', resumen(await op('k2', 'jornada.terminar', { id: J })));
  anotar('k2', 'registro.crear con J cerrada', 'SIN_PERMISO', resumen(await op('k2', 'registro.crear', arbolNuevo(J))));
  anotar('cx1', 'jornada.compartir con J cerrada', 'SIN_PERMISO', resumen(await op('cx1', 'jornada.compartir', { id: J, agregar: [ids.k1] })));
}
const final = apoyo('apoyos', { id: J });

const fallas = casos.filter((c) => !c.ok);
const salida = { corrida, fecha: new Date().toISOString(), total: casos.length, fallas: fallas.length, casos, apoyos_final: final };
writeFileSync(`evidencia/e1_acceso.${corrida}.json`, JSON.stringify(salida, null, 1));
for (const c of casos) console.log(`${c.ok ? 'ok   ' : 'FALLA'} ${String(c.n).padStart(3)} ${c.quien.padEnd(14)} ${c.que} → esperado ${c.esperado}, observado ${c.observado}${c.nota ? ' (' + c.nota + ')' : ''}`);
console.log(`\n${casos.length} casos, ${fallas.length} fuera de lo esperado`);
