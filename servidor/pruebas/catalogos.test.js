/* CATÁLOGOS: el servidor valida como el editor de catálogos de la aplicación (js/catalogos.js), que se
   carga tal cual y se compara caso por caso; las rutas dan de alta, editan, activan, desactivan y eliminan
   con las reglas de la aplicación y lo anotan en la bitácora igual; y sólo la Administración los cambia.
   Crea sus propios valores y cuentas, y al terminar los quita. */
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { conectar, limpiar, RAIZ } from './apoyo.js';
import { leerConfig, crearGrupo, crearApp, derivar, catalogos as K } from '../dist/independiente.js';

const CORRIDA = Date.now();
const CLAVE = 'Catalogos de prueba 2026';
const ADMIN = { id: crypto.randomUUID(), correo: 'admin.catalogos.prueba.' + CORRIDA + '@ejemplo.local' };
const CABO = { id: crypto.randomUUID(), correo: 'cabo.catalogos.prueba.' + CORRIDA + '@ejemplo.local' };
const ALCALDIA = { id: 'o-prueba-cat-' + CORRIDA, nombre: 'Alcaldía de prueba ' + CORRIDA };
const creados = { programas: [], areas: [], especies: [], vehiculos: [], instituciones: [ALCALDIA.id], solicitantes: [] };
const JORNADA = crypto.randomUUID();

/* ---------- La validación, contra la de la aplicación ---------- */

// js/util.js, js/referencias.js y js/catalogos.js tal cual, sin pantalla
function editorDeLaAplicacion() {
  const ctx = { console, crypto: globalThis.crypto };
  ctx.window = ctx;
  vm.createContext(ctx);
  const cargar = (f) => vm.runInContext(fs.readFileSync(path.join(RAIZ, f), 'utf8'), ctx, { filename: f });
  cargar('js/util.js');
  ctx.SRP.util.proteger = () => {};
  cargar('js/referencias.js');
  cargar('js/catalogos.js');
  return ctx.SRP;
}

// Los campos del formulario de la aplicación y las columnas del servidor
const CAMPO = { 'cat-nombre': 'nombre', 'cat-clave': 'clave', 'cat-tipo-org': 'tipo_organizacion', 'cat-tipo-sol': 'tipo_solicitante', 'cat-cientifico': 'nombre_cientifico',
  'cat-paleta': 'paleta_vegetal', 'cat-fruto': 'fruto_comestible', 'cat-enciclovida': 'id_enciclovida', 'cat-snib': 'id_snib', 'cat-modelo': 'modelo', 'cat-tipo-vehiculo': 'tipo_vehiculo', 'cat-otros-nombres': 'otros_nombres_comunes' };

const EXISTENTES = {
  programas: [{ id: 'p1', clave: 'REFOR_URBANA', nombre: 'Reforestación Urbana', activo: true, tipos_organizacion: [] },
    { id: 'p2', clave: 'VIEJO', nombre: 'Programa inactivo', activo: false, tipos_organizacion: ['Alcaldía'] }],
  areas: [{ id: 'a1', clave: 'SIA', nombre: 'Sistema de Información Ambiental', activo: true }],
  especies: [{ id: 'ESP-0001', clave: 'ESP-0001', nombre: 'Fresno', nombre_cientifico: 'Fraxinus uhdei', activo: true },
    { id: 'ESP-0007', clave: 'ESP-0007', nombre: 'Encino', nombre_cientifico: 'Quercus rugosa', activo: false }],
  vehiculos: [{ id: 'v1', clave: '1234AB', nombre: '1234 AB', modelo: 'Nissan', tipo_vehiculo: 'Pipa', activo: true }],
  instituciones: [{ id: 'o-sedema', clave: 'SEDEMA', nombre: 'Secretaría del Medio Ambiente', tipo_organizacion: 'Gobierno de la CDMX', activo: true },
    { id: 'o-alc', clave: 'COYOACAN', nombre: 'Coyoacán', tipo_organizacion: 'Alcaldía', activo: true },
    { id: 'o-emp', clave: 'EMPRESA', nombre: 'Empresa X', tipo_organizacion: 'Empresa privada', activo: false }],
  solicitantes: [{ id: 's1', clave: 'VECINOS_DE_X', nombre: 'Vecinos de X', tipo_solicitante: 'Vecinos', activo: true }],
};

// Todas las combinaciones de los valores de cada campo
const combinar = (opciones) => Object.entries(opciones).reduce((acc, [k, vs]) => acc.flatMap((o) => vs.map((v) => ({ ...o, [k]: v }))), [{}]);
const CASOS = {
  programas: combinar({ nombre: ['', 'Nuevo programa', 'reforestacion URBANA', 'Programa  inactivo', '  Con   espacios  ', 'P'.repeat(121)], clave: ['', 'A', 'nuevo_programa', 'REFOR_URBANA', 'CON ESPACIO', 'X'.repeat(31)], tipos_organizacion: [[], ['Empresa privada', 'Alcaldía']] }),
  areas: combinar({ nombre: ['', 'Área nueva', 'sistema de informacion ambiental', 'A'.repeat(121)], clave: ['', 'SIA', 'NUEVA', 'ñ'] }),
  especies: combinar({ nombre: ['', 'Fresno', 'Ahuehuete', 'E'.repeat(121)], clave: ['', 'ESP-0008', 'ESP-1', 'esp-0009'], nombre_cientifico: ['', 'quercus rugosa', 'Quercus  rugosa', 'Taxodium mucronatum', 'Fraxinus', 'Quercus ' + 'a'.repeat(140)],
    otros_nombres_comunes: ['', 'Uno, dos', 'x'.repeat(401)],
    paleta_vegetal: ['', 'Sí', 'Tal vez'], fruto_comestible: ['', 'Por determinar'], id_enciclovida: [null, '', '123', 'abc', 12, 1.5], id_snib: [null, '26796angio', '26796'], tipo_distribucion: ['Nativa'] }),
  vehiculos: combinar({ nombre: ['', '1234 ab', '1234-AB', 'ABCD', '12', '1234567890123', ' 9876  xy '], modelo: ['', 'Nissan', 'M'.repeat(41)], tipo_vehiculo: ['', 'pipa', 't'.repeat(31)] }),
  instituciones: combinar({ nombre: ['', 'empresa x', 'Nueva institución', 'COYOACAN', 'Secretaría del Medio Ambiente', 'I'.repeat(121)], tipo_organizacion: ['', 'Alcaldía', 'Empresa privada', 'Organización civil'] }),
  solicitantes: combinar({ nombre: ['', 'vecinos de x', 'Escuela 1', 'S'.repeat(121)], tipo_solicitante: ['', 'Escuela', 'Alcaldía', 'Inventado'] }),
};

test('el servidor valida cada catálogo como la aplicación, caso por caso, al dar de alta y al editar', () => {
  const SRP = editorDeLaAplicacion();
  const E = SRP.catalogos;
  SRP.ref.catalogos = Object.entries(EXISTENTES).flatMap(([t, filas]) => filas.map((f) => ({ ...f, tipo: K.TIPO_DE_TABLA[t] })));
  let casos = 0;
  for (const [tabla, filas] of Object.entries(EXISTENTES)) {
    E.tipo = K.TIPO_DE_TABLA[tabla];
    for (const editando of [null, ...filas]) {
      E.editando = editando && { ...editando, tipo: E.tipo };
      for (const cuerpo of CASOS[tabla]) {
        const d = K.datosDe(tabla, cuerpo, editando, filas);
        const servidor = K.validarCatalogo(tabla, d, filas, editando);
        const aplicacion = Array.from(E.validar(d), ([campo, mensaje]) => [CAMPO[campo], mensaje]);
        assert.deepEqual(servidor, aplicacion, tabla + (editando ? ' editando ' + editando.id : ' alta') + ' con ' + JSON.stringify(cuerpo));
        casos++;
      }
    }
  }
  assert.ok(casos > 15_000, casos + ' casos');
});

test('las claves se sacan del nombre, se completan con _2, _3… y el consecutivo de especies sigue al mayor, como en la aplicación', () => {
  const SRP = editorDeLaAplicacion();
  SRP.ref.catalogos = Object.entries(EXISTENTES).flatMap(([t, filas]) => filas.map((f) => ({ ...f, tipo: K.TIPO_DE_TABLA[t] })));
  const nombres = ['Reforestación Urbana', '  Ñandú & Cía. ', 'Árbol—Ébano', '', '***', 'Una institución con un nombre larguísimo que no cabe'];
  for (const n of nombres) {
    assert.equal(K.claveDesdeNombre(n), SRP.util.claveDesdeNombre(n), n);
    assert.equal(K.normalizar(n), SRP.util.normalizar(n), n);
    assert.equal(K.clavePlaca(n), SRP.catalogos.clavePlaca(n), n);
  }
  const usadas = ['EMPRESA', 'EMPRESA_2', 'X'.repeat(30), 'X'.repeat(28) + '_2'];
  SRP.ref.catalogos = usadas.map((clave, i) => ({ id: 'o' + i, clave, nombre: clave, tipo: 'organizacion' }));
  for (const base of ['EMPRESA', 'NUEVA', 'X'.repeat(30), '']) assert.equal(K.claveLibre(usadas, base), SRP.catalogos.claveLibreDe('organizacion', base), base);
  SRP.ref.catalogos = EXISTENTES.especies.map((f) => ({ ...f, tipo: 'especie' }));
  assert.equal(K.siguienteClaveEspecie(EXISTENTES.especies), SRP.catalogos.siguienteClaveEspecie());
  assert.equal(K.siguienteClaveEspecie(EXISTENTES.especies), 'ESP-0008');
  // Lo que pone el sistema: la clave de instituciones y solicitantes, la placa en mayúsculas y el tipo con inicial mayúscula
  assert.equal(K.datosDe('instituciones', { nombre: 'Empresa' }, null, EXISTENTES.instituciones).clave, 'EMPRESA_2');
  assert.equal(K.datosDe('instituciones', { nombre: 'Otro nombre' }, EXISTENTES.instituciones[2], EXISTENTES.instituciones).clave, 'EMPRESA', 'al renombrar, la clave no cambia');
  assert.equal(K.datosDe('solicitantes', { nombre: '***' }, null, EXISTENTES.solicitantes).clave, 'SOLICITANTE');
  const v = K.datosDe('vehiculos', { nombre: ' 9876  xy ', tipo_vehiculo: 'redilas' }, null, EXISTENTES.vehiculos);
  assert.deepEqual([v.nombre, v.clave, v.tipo_vehiculo], ['9876 XY', '9876XY', 'Redilas']);
  assert.equal(K.datosDe('especies', { nombre: 'Ahuehuete' }, null, EXISTENTES.especies).clave, 'ESP-0008');
});

/* ---------- Las rutas ---------- */

let admin, grupo, servidor, base;
const config = leerConfig({ SRP_COOKIE_SEGURA: 'no' });

before(async () => {
  admin = await conectar();
  await admin.query('GRANT srp_api TO CURRENT_USER WITH INHERIT FALSE, SET TRUE');
  await admin.query('BEGIN');
  await admin.query(`INSERT INTO srp.instituciones VALUES ('o-sedema', 'SEDEMA', 'Secretaría del Medio Ambiente', true, NULL, now(), NULL, NULL, 'Gobierno de la CDMX') ON CONFLICT DO NOTHING`);
  await admin.query(`INSERT INTO srp.areas VALUES ('a-sia', 'SIA', 'Sistema de Información Ambiental', true, NULL, now(), NULL, NULL) ON CONFLICT DO NOTHING`);
  await admin.query(`INSERT INTO srp.instituciones VALUES ($1, $2, $3, true, NULL, now(), NULL, NULL, 'Alcaldía')`, [ALCALDIA.id, 'ALC_PRUEBA_' + CORRIDA, ALCALDIA.nombre]);
  const derivada = await derivar(CLAVE);
  for (const [u, perfil, nombre] of [[ADMIN, 'ADMIN', 'Administración Prueba Catálogos'], [CABO, 'CABO', 'Cabo Prueba Catálogos']]) {
    await admin.query(`INSERT INTO srp.usuarios VALUES ($1, $2, $3, 'o-sedema', 'a-sia', $4, $4, '{}', true, now(), $1, NULL, NULL)`, [u.id, u.correo, nombre, perfil]);
    await admin.query(`INSERT INTO srp.credenciales VALUES ($1, $2, false, NULL, 0, NULL, now(), $1)`, [u.id, derivada]);
  }
  await admin.query('COMMIT');
  grupo = crearGrupo({ rol: 'srp_api' });
  servidor = crearApp({ pool: grupo, config, proxy: 0 }).listen(0);
  await new Promise((r) => servidor.once('listening', r));
  base = 'http://127.0.0.1:' + servidor.address().port + config.ruta;
});

after(async () => {
  servidor && servidor.close();
  grupo && await grupo.end();
  const cuentas = [ADMIN.id, CABO.id];
  const ids = Object.values(creados).flat();
  await limpiar(admin, async () => {
    await admin.query('DELETE FROM srp.jornadas WHERE id = $1', [JORNADA]);
    for (const [tabla, lista] of Object.entries(creados)) await admin.query(`DELETE FROM srp.${tabla} WHERE id = ANY($1)`, [lista]);
    for (const t of ['bitacora', 'bitacora_acceso']) await admin.query(`ALTER TABLE srp.${t} DISABLE TRIGGER bitacora_inmutable`);
    await admin.query('DELETE FROM srp.bitacora WHERE usuario_id = ANY($1::uuid[]) OR entidad_id = ANY($2)', [cuentas, ids]);
    await admin.query('DELETE FROM srp.bitacora_acceso WHERE usuario_id = ANY($1::uuid[])', [cuentas]);
    for (const t of ['bitacora', 'bitacora_acceso']) await admin.query(`ALTER TABLE srp.${t} ENABLE TRIGGER bitacora_inmutable`);
    await admin.query('DELETE FROM srp.usuarios WHERE id = ANY($1::uuid[])', [cuentas]);
  });
});

async function sesion(u) {
  const r = await fetch(base + '/acceso/entrar', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ correo: u.correo, contrasena: CLAVE }) });
  assert.equal(r.status, 200);
  const cookie = (r.headers.get('set-cookie') || '').split(';')[0];
  return async (metodo, ruta, cuerpo) => {
    const x = await fetch(base + ruta, { method: metodo, headers: { cookie, 'content-type': 'application/json' }, body: cuerpo === undefined ? undefined : JSON.stringify(cuerpo) });
    return { estado: x.status, datos: await x.json() };
  };
}
const bitacoraDe = async (id) => (await admin.query('SELECT accion, entidad, detalle, usuario_id FROM srp.bitacora WHERE entidad_id = $1 ORDER BY fecha, accion', [id])).rows;

test('con sesión se leen los seis catálogos; sólo la Administración los cambia', async () => {
  const cabo = await sesion(CABO);
  const r = await cabo('GET', '/catalogos');
  assert.equal(r.estado, 200);
  assert.deepEqual(Object.keys(r.datos).sort(), [...K.TABLAS].sort());
  assert.ok(r.datos.instituciones.some((o) => o.id === ALCALDIA.id), 'también trae lo que hay en la base');
  assert.deepEqual(await cabo('POST', '/catalogos/programas', { nombre: 'X', clave: 'XX' }), { estado: 403, datos: { codigo: 'SIN_PERMISO', mensaje: 'No tiene permiso para administrar los catálogos.' } });
  assert.equal((await cabo('GET', '/catalogos/programas/usos')).estado, 403);
  assert.equal((await fetch(base + '/catalogos')).status, 401, 'sin sesión');
  const a = await sesion(ADMIN);
  assert.deepEqual((await a('GET', '/catalogos/otra')).datos.codigo, 'NO_EXISTE');
});

test('un programa se da de alta, se edita, se desactiva y, sin uso, se elimina; cada paso queda en la bitácora', async () => {
  const a = await sesion(ADMIN);
  const clave = 'PRUEBA_' + CORRIDA;
  const alta = await a('POST', '/catalogos/programas', { nombre: '  Programa   de prueba ' + CORRIDA, clave: clave.toLowerCase(), tipos_organizacion: ['Organización civil', 'Alcaldía'] });
  assert.equal(alta.estado, 201);
  creados.programas.push(alta.datos.id);
  assert.deepEqual([alta.datos.nombre, alta.datos.clave, alta.datos.activo, alta.datos.creado_por_id], ['Programa de prueba ' + CORRIDA, clave, true, ADMIN.id]);
  assert.deepEqual(alta.datos.tipos_organizacion, ['Alcaldía', 'Organización civil'], 'los tipos, en el orden de la lista');
  const otra = await a('POST', '/catalogos/programas', { nombre: 'programa de PRUEBA ' + CORRIDA, clave });
  assert.deepEqual(otra.datos.errores, [['nombre', 'Ya existe un valor con ese nombre.'], ['clave', 'Esa clave ya está en uso.']]);
  assert.deepEqual((await a('POST', '/catalogos/programas', { nombre: 'Otro ' + CORRIDA, clave: 'OTRO_' + CORRIDA, tipos_organizacion: ['Cooperativa'] })).datos.errores,
    [['tipos_organizacion', 'Elija los tipos de institución de la lista.']]);

  const edicion = await a('PUT', '/catalogos/programas/' + alta.datos.id, { nombre: 'Programa renombrado ' + CORRIDA, clave: 'NO_CAMBIA', tipos_organizacion: [] });
  assert.equal(edicion.estado, 200);
  assert.deepEqual([edicion.datos.nombre, edicion.datos.clave, edicion.datos.tipos_organizacion, edicion.datos.editado_por_id], ['Programa renombrado ' + CORRIDA, clave, [], ADMIN.id]);
  assert.equal((await a('POST', '/catalogos/programas/' + alta.datos.id + '/estado', { activo: false })).datos.activo, false);
  await a('POST', '/catalogos/programas/' + alta.datos.id + '/estado', { activo: false });
  assert.equal((await a('POST', '/catalogos/programas/' + alta.datos.id + '/estado', { activo: true })).datos.activo, true);
  assert.deepEqual(await a('DELETE', '/catalogos/programas/' + alta.datos.id), { estado: 200, datos: { ok: true } });
  assert.equal((await admin.query('SELECT count(*)::int AS n FROM srp.programas WHERE id = $1', [alta.datos.id])).rows[0].n, 0);
  // Lo mismo que anota la aplicación; desactivar lo que ya estaba desactivado no es un cambio
  assert.deepEqual((await bitacoraDe(alta.datos.id)).map((b) => [b.accion, b.entidad, b.detalle, b.usuario_id]), [
    ['CREADO', 'catalogo', 'programa ' + clave, ADMIN.id],
    ['EDITADO', 'catalogo', 'Campos: nombre, tipos_organizacion', ADMIN.id],
    ['DESACTIVADO', 'catalogo', '', ADMIN.id],
    ['ACTIVADO', 'catalogo', '', ADMIN.id],
    ['ELIMINADO', 'catalogo', 'programa ' + clave + ': Programa renombrado ' + CORRIDA, ADMIN.id],
  ]);
});

test('un valor en uso no se elimina: se dice dónde aparece y se ofrece desactivarlo', async () => {
  const a = await sesion(ADMIN);
  const alta = await a('POST', '/catalogos/programas', { nombre: 'Programa en uso ' + CORRIDA, clave: 'EN_USO_' + CORRIDA });
  creados.programas.push(alta.datos.id);
  await admin.query(`INSERT INTO srp.jornadas (id, nombre, ubicacion, programa_id, fecha, comentarios, cabo_id, organizacion_id, estatus, fecha_inicio, relevos,
      solicitante_otro, solicitud_descripcion, arboles_previstos, puntos_revisados, personal, apoyo, observaciones, chofer, vehiculo_modelo, vehiculo_placa, vehiculo_tipo, hora)
    VALUES ($1, 'Jornada de prueba', '', $2, '2026-10-05', '', $3, 'o-sedema', 'abierta', now(), '[]', '', '', 10, '{}', '', '', '', '', '', '', '', '')`, [JORNADA, alta.datos.id, CABO.id]);
  assert.deepEqual((await a('GET', '/catalogos/programas/usos')).datos[alta.datos.id], { jornadas: 1 });
  assert.deepEqual(await a('DELETE', '/catalogos/programas/' + alta.datos.id),
    { estado: 409, datos: { codigo: 'EN_USO', mensaje: 'No se puede eliminar: aparece en 1 jornada. Desactívelo: eso sí se deshace.' } });
  assert.equal((await a('POST', '/catalogos/programas/' + alta.datos.id + '/estado', { activo: false })).datos.activo, false, 'desactivarlo sí se puede');
  assert.equal((await admin.query('SELECT programa_id FROM srp.jornadas WHERE id = $1', [JORNADA])).rows[0].programa_id, alta.datos.id, 'la jornada no cambia');
});

test('una especie nueva toma el consecutivo que sigue y su id es la clave; el científico se revisa como en la aplicación', async () => {
  const a = await sesion(ADMIN);
  const mayor = (await admin.query("SELECT coalesce(max(substr(id, 5)::int), 0) AS n FROM srp.especies")).rows[0].n;
  const esperada = 'ESP-' + String(mayor + 1).padStart(4, '0');
  const mala = await a('POST', '/catalogos/especies', { nombre: 'Árbol de prueba ' + CORRIDA, nombre_cientifico: 'arbolus', tipo_distribucion: 'Nativa', paleta_vegetal: 'Sí', fruto_comestible: 'Por determinar', id_enciclovida: 'x' });
  assert.deepEqual(mala.datos.errores.map((e) => e[0]), ['nombre_cientifico', 'id_enciclovida']);
  const alta = await a('POST', '/catalogos/especies', { nombre: 'Árbol de prueba ' + CORRIDA, nombre_cientifico: 'Arbolus pruebae' + CORRIDA, tipo_distribucion: 'Nativa',
    otros_nombres_comunes: 'uno ,  dos,,tres', formadecrecimiento: 'Árbol', paleta_vegetal: 'No', fruto_comestible: 'Sí', id_snib: '26796angio', id_enciclovida: '123' });
  assert.equal(alta.estado, 201);
  creados.especies.push(alta.datos.id);
  assert.deepEqual([alta.datos.id, alta.datos.clave, alta.datos.otros_nombres_comunes, alta.datos.id_snib, alta.datos.id_enciclovida], [esperada, esperada, 'uno, dos, tres', '26796ANGIO', 123]);
  assert.deepEqual((await a('POST', '/catalogos/especies', { nombre: 'Otra ' + CORRIDA, nombre_cientifico: 'Otrus ' + CORRIDA, tipo_distribucion: 'De otro planeta', paleta_vegetal: 'Sí', fruto_comestible: 'No' })).datos.errores,
    [['tipo_distribucion', 'Elija el tipo de distribución.']]);
});

test('la placa se guarda en mayúsculas y no se repite aunque cambien los espacios; el sistema pone su clave', async () => {
  const a = await sesion(ADMIN);
  const placa = String(CORRIDA).slice(-4);
  const alta = await a('POST', '/catalogos/vehiculos', { nombre: placa + '-zz', modelo: 'Modelo de prueba', tipo_vehiculo: 'estacas' });
  assert.equal(alta.estado, 201);
  creados.vehiculos.push(alta.datos.id);
  assert.deepEqual([alta.datos.nombre, alta.datos.clave, alta.datos.tipo_vehiculo], [placa + '-ZZ', placa + 'ZZ', 'Estacas']);
  assert.deepEqual((await a('POST', '/catalogos/vehiculos', { nombre: placa + ' zz', modelo: 'Otro', tipo_vehiculo: 'Pipa' })).datos.errores, [['nombre', 'Ya existe un vehículo con esa placa.']]);
});

test('instituciones: el sistema pone la clave y el tipo no cambia; las alcaldías no se agregan ni se renombran; ninguna se elimina; la Secretaría no se desactiva', async () => {
  const a = await sesion(ADMIN);
  const nombre = 'Empresa de prueba ' + CORRIDA;
  const alta = await a('POST', '/catalogos/instituciones', { nombre, tipo_organizacion: 'Empresa privada', clave: 'IGNORADA' });
  assert.equal(alta.estado, 201);
  creados.instituciones.push(alta.datos.id);
  // La clave sale del nombre, recortada a 30 caracteres
  const claveBase = K.claveDesdeNombre(nombre);
  assert.match(claveBase, /^EMPRESA_DE_PRUEBA_\d+$/);
  assert.deepEqual([alta.datos.clave, alta.datos.tipo_organizacion], [claveBase, 'Empresa privada']);
  const segunda = await a('POST', '/catalogos/instituciones', { nombre: 'Empresa de prueba ' + CORRIDA + '!', tipo_organizacion: 'Organización civil' });
  creados.instituciones.push(segunda.datos.id);
  assert.equal(segunda.datos.clave, claveBase.slice(0, 28) + '_2', 'una clave que ya existe se completa');
  const renombrada = await a('PUT', '/catalogos/instituciones/' + alta.datos.id, { nombre: nombre + ' renombrada', tipo_organizacion: 'Alcaldía' });
  assert.deepEqual([renombrada.datos.nombre, renombrada.datos.tipo_organizacion, renombrada.datos.clave], [nombre + ' renombrada', 'Empresa privada', alta.datos.clave]);
  assert.deepEqual((await a('POST', '/catalogos/instituciones', { nombre: 'Otra alcaldía ' + CORRIDA, tipo_organizacion: 'Alcaldía' })).datos.errores,
    [['tipo_organizacion', 'Las alcaldías ya están dadas de alta: actívela en la lista.']]);
  assert.deepEqual((await a('PUT', '/catalogos/instituciones/' + ALCALDIA.id, { nombre: 'Otro nombre ' + CORRIDA })).datos.errores, [['nombre', 'Las alcaldías no se renombran.']]);
  assert.equal((await a('POST', '/catalogos/instituciones/' + ALCALDIA.id + '/estado', { activo: false })).datos.activo, false, 'una alcaldía sí se desactiva');
  assert.equal((await a('DELETE', '/catalogos/instituciones/' + alta.datos.id)).datos.codigo, 'NO_SE_ELIMINA');
  assert.equal((await a('POST', '/catalogos/instituciones/o-sedema/estado', { activo: false })).datos.codigo, 'PROTEGIDO');
  assert.equal((await admin.query("SELECT activo FROM srp.instituciones WHERE id = 'o-sedema'")).rows[0].activo, true);
});

test('un solicitante lleva un tipo de la lista y el sistema pone su clave', async () => {
  const a = await sesion(ADMIN);
  assert.deepEqual((await a('POST', '/catalogos/solicitantes', { nombre: 'Vecinos ' + CORRIDA, tipo_solicitante: 'Inventado' })).datos.errores, [['tipo_solicitante', 'Elija el tipo de solicitante.']]);
  const alta = await a('POST', '/catalogos/solicitantes', { nombre: 'Vecinos ' + CORRIDA, tipo_solicitante: 'Vecinos' });
  creados.solicitantes.push(alta.datos.id);
  assert.deepEqual([alta.estado, alta.datos.clave], [201, 'VECINOS_' + CORRIDA]);
  const cambio = await a('PUT', '/catalogos/solicitantes/' + alta.datos.id, { nombre: 'Vecinos ' + CORRIDA, tipo_solicitante: 'Escuela' });
  assert.equal(cambio.datos.tipo_solicitante, 'Escuela', 'el tipo de un solicitante sí se corrige');
  assert.deepEqual((await bitacoraDe(alta.datos.id)).map((b) => b.detalle), ['solicitante VECINOS_' + CORRIDA, 'Campos: tipo_solicitante']);
});

test('lo que cuenta como uso son las mismas llaves foráneas que tiene la base', async () => {
  const { rows } = await admin.query(`SELECT c.confrelid::regclass::text AS destino, c.conrelid::regclass::text AS origen, a.attname AS campo
      FROM pg_constraint c JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = c.conkey[1]
     WHERE c.contype = 'f' AND c.connamespace = 'srp'::regnamespace`);
  const sin = (t) => t.replace(/^srp\./, '');
  for (const tabla of K.TABLAS) {
    const enBase = rows.filter((r) => sin(r.destino) === tabla).map((r) => sin(r.origen) + '.' + r.campo).sort();
    assert.deepEqual(K.REFERENCIAS[tabla].map(([o, c]) => o + '.' + c).sort(), enBase, tabla);
  }
});

test('editar un valor trae su versión: si otra Administración lo cambió mientras tanto, no escribe encima', async () => {
  const a = await sesion(ADMIN);
  const alta = await a('POST', '/catalogos/solicitantes', { nombre: 'Solicitante versión ' + CORRIDA, tipo_solicitante: 'Vecinos' });
  assert.equal(alta.estado, 201, JSON.stringify(alta.datos));
  creados.solicitantes.push(alta.datos.id);
  const ruta = '/catalogos/solicitantes/' + alta.datos.id, v0 = alta.datos.fecha_creacion;
  const r1 = await a('PUT', ruta, { nombre: 'Solicitante versión uno ' + CORRIDA, tipo_solicitante: 'Vecinos', version: v0 });
  assert.equal(r1.estado, 200, JSON.stringify(r1.datos));
  const vieja = await a('PUT', ruta, { nombre: 'Solicitante encima ' + CORRIDA, tipo_solicitante: 'Vecinos', version: v0 });
  assert.deepEqual([vieja.estado, vieja.datos.codigo, vieja.datos.mensaje], [409, 'VERSION_VIEJA', 'Alguien más cambió este valor mientras usted lo editaba.']);
  assert.equal((await admin.query('SELECT nombre FROM srp.solicitantes WHERE id = $1', [alta.datos.id])).rows[0].nombre, 'Solicitante versión uno ' + CORRIDA);
  assert.equal((await a('PUT', ruta, { nombre: 'Solicitante versión dos ' + CORRIDA, tipo_solicitante: 'Vecinos', version: r1.datos.fecha_ultima_edicion })).estado, 200);
  // Un texto más largo que su columna, si se escapa de las reglas, es un dato que corregir, no un error interno
  const largo = await a('POST', '/catalogos/vehiculos', { nombre: '9988 ZZ', modelo: 'M'.repeat(41), tipo_vehiculo: 'Pipa' });
  assert.deepEqual([largo.estado, largo.datos.errores], [400, [['modelo', 'El modelo lleva hasta 40 caracteres.']]]);
});
