/* LA COLA DE ENVÍO, con datos reales; con datos de prueba el envío es simulado (js/envio.js) y esto no corre.

   QUÉ SE ANOTA. Cada cambio que este teléfono le hace a una jornada o a un árbol queda en el almacén `envios`
   como la operación del servidor que le corresponde (la lista está en servidor/src/modulos/srp/recepcion.ts),
   en la misma transacción que el cambio: o quedan los dos o ninguno. Lo que el servidor hace por su cuenta con
   ese cambio —el árbol que un sustituto reemplaza, el reporte que deja de estar vigente, los árboles que toman
   el programa de su jornada— no se anota: el servidor lo hace y lo devuelve.
     · Una operación lleva la versión que el servidor tenía del registro antes del cambio (S-16). Si otra
       operación del mismo registro espera, la versión se sabe cuando el servidor responde ésa. Por eso una
       corrección que al final dejó todo igual también viaja: su respuesta trae la versión.
     · Lo que viaja se arma al enviar, con el registro como esté entonces. Un alta lleva el registro completo,
       y lo que se le corrija antes de enviarla viaja con ella. Varias ediciones de un registro ya enviado se
       juntan en una, con sólo los campos que cambiaron respecto de lo que tenía el servidor.
     · Lo que ya salió y no tuvo respuesta —se fue la señal a medio envío— se vuelve a mandar tal como salió,
       y el servidor lo reconoce. Lo que se cambie mientras tanto va en otra operación, después.
     · Una fotografía nueva se anota aparte y sube después de su árbol. Sólo sale de la cola cuando el
       servicio confirma esa fotografía: cualquier otra respuesta es como no tener señal.

   CÓMO SE ENVÍA. En el orden en que se hizo, hasta cien operaciones por vez y nunca dos del mismo registro en
   el mismo envío. Lo que el servidor recibe sale de la cola y su respuesta manda: el folio, el territorio y la
   versión. Lo que rechaza se queda con su motivo y detiene lo que sigue de ese registro. Sólo se envía lo de
   quien tiene la sesión, y sólo desde la pestaña que trabaja (js/turno.js).

   UNA JORNADA ELIMINADA EN EL SERVIDOR ya no se espera: sale del teléfono, y sus árboles sin enviar quedan en
   «Revisar» para pasarlos a otra jornada.

   LO QUE EL SERVIDOR NO ACEPTA no se vuelve a enviar solo: la persona decide qué hacer con cada cambio
   (js/rechazos.js). Uno rechazado por sus datos se vuelve a intentar cuando se corrige el registro.

   QUÉ SE QUEDA EN EL TELÉFONO (S-11). Lo que espera envío, y la jornada abierta —o cerrada sin su reporte—
   con sus árboles. Lo demás, ya recibido, sale del teléfono con su historial: se sigue viendo como lo enviado
   (js/remoto.js). */
window.SRP = window.SRP || {};

SRP.cola = {
  ops: [],               // lo del almacén `envios`, en el orden en que se hizo
  recibidos: new Map(),  // registro → cuándo lo confirmó el servidor, en esta sesión
  sinSalir: new Map(),   // operación → desde cuándo no sale aunque hubo conexión, en esta sesión
  ALTAS: ['jornada.crear', 'registro.crear', 'registro.sustituir'],
  EDICIONES: ['jornada.editar', 'registro.editar'],
  // Lo que el servidor no aceptó y se vuelve a intentar en cuanto se corrige el registro
  CORREGIBLES: ['DATOS_INVALIDOS', 'JORNADA_ELIMINADA'],
  // Los campos que viajan en una edición: los que el servidor deja cambiar
  CAMPOS: {
    plantaciones: ['lat', 'lng', 'punto_origen', 'gps_precision_m', 'especie_id', 'especie_otra', 'fecha_plantacion', 'comentarios', 'foto_id'],
    jornadas: ['nombre', 'ubicacion', 'programa_id', 'arboles_previstos', 'fecha', 'comentarios', 'solicitante_id', 'solicitante_otro', 'solicitud_descripcion']
  },
  // Lo que pone el servidor en un registro que todavía tiene cambios por enviar
  DEL_SERVIDOR: ['folio', 'alcaldia_cve', 'alcaldia', 'colonia_cve', 'colonia', 'uga', 'uga_borde_m', 'capa_version'],
  LOTE: 100,

  activa() { return SRP.remoto.activo(); },

  async cargar() {
    this.ops = this.activa() ? (await SRP.almacen.todosLocales('envios')).sort((a, b) => a.n - b.n) : [];
  },

  /* Antes de enviar, la cola como está en el almacén: lo que anotó otra pestaña justo al perder el turno también
     sale. Lo que ya estaba en memoria se queda como está. */
  async releer() {
    const enMemoria = new Map(this.ops.map(o => [o.n, o]));
    this.ops = (await SRP.almacen.todosLocales('envios')).map(o => enMemoria.get(o.n) || o).sort((a, b) => a.n - b.n);
  },

  de(id) { return this.ops.filter(o => o.registro_id === id); },

  /* rechazado: el servidor no aceptó algo suyo; por_enviar: su alta no ha salido; cambios: ya está en el
     servidor y algo suyo espera; recibido: nada espera */
  estado(id) {
    const p = this.de(id);
    if (!p.length) return 'recibido';
    if (p.some(o => o.rechazo)) return 'rechazado';
    return p.some(o => this.ALTAS.includes(o.tipo)) ? 'por_enviar' : 'cambios';
  },

  // Lo que el servidor no aceptó de quien tiene la sesión
  rechazadas() {
    const u = SRP.sesion.usuario;
    return u ? this.ops.filter(o => o.rechazo && o.usuario_id === u.id) : [];
  },

  // La versión de un registro como la dejó el servidor: el momento de su último cambio, o el de su alta
  version(tabla, r) { return r ? (r.fecha_ultima_edicion || (tabla === 'jornadas' ? r.fecha_inicio : r.fecha_registro) || null) : null; },

  /* ---------- Anotar ---------- */

  /* Dentro de la transacción del cambio (js/almacen.js). `antes`: el registro como estaba, del teléfono o de lo
     enviado; `despues`: como queda, o null si se borró. */
  anotar(tx, tipo, tabla, antes, despues) {
    const id = (despues || antes).id, esperan = this.de(id);
    // Lo que el servidor no aceptó por sus datos, o porque su jornada ya no está, se vuelve a intentar con el registro corregido
    const corregidas = esperan.filter(o => o.rechazo && this.CORREGIBLES.includes(o.rechazo.codigo) && o.tipo !== 'foto');
    const nuevas = [];
    if (!this.EDICIONES.includes(tipo)) nuevas.push({ tipo });
    // Con su alta o con otra edición esperando, la edición viaja con ésa; si ésa ya salió sin respuesta, va aparte
    else if (!esperan.some(o => !o.enviado && (this.ALTAS.includes(o.tipo) || o.tipo === tipo))) nuevas.push({ tipo, antes: antes || null });
    if (tabla === 'plantaciones' && despues && despues.foto_id && SRP.util.fotoSegura(despues.foto_base64) && (!antes || antes.foto_id !== despues.foto_id)) {
      nuevas.push({ tipo: 'foto', foto_id: despues.foto_id });
    }
    if (!nuevas.length && !corregidas.length) return;
    const ahora = SRP.util.ahoraISO(), almacen = tx.objectStore('envios'), usuario = SRP.sesion.usuario ? SRP.sesion.usuario.id : null;
    corregidas.forEach(o => almacen.put(Object.assign({}, o, { rechazo: null })));
    // Una fotografía que espera no cambia la versión del registro
    const previas = esperan.filter(o => o.tipo !== 'foto');
    nuevas.forEach(o => {
      const conVersion = !previas.length && !this.ALTAS.includes(o.tipo) && o.tipo !== 'foto';
      Object.assign(o, { tabla, registro_id: id, usuario_id: usuario, version: conVersion ? this.version(tabla, antes) : null, creada: ahora, rechazo: null });
      const r = almacen.add(o);
      r.onsuccess = () => { o.n = r.result; };
    });
    tx.addEventListener('complete', () => {
      corregidas.forEach(o => { o.rechazo = null; });
      this.ops.push(...nuevas.filter(o => !this.ops.some(x => x.n === o.n)));
      this.ops.sort((a, b) => a.n - b.n);
      if (corregidas.length) SRP.envio.pintarFranja();
      SRP.envio.pronto();
    });
  },

  /* ---------- Enviar ---------- */

  igual(a, b) { return JSON.stringify(a == null || a === '' ? null : a) === JSON.stringify(b == null || b === '' ? null : b); },

  sinFoto(r) { const x = Object.assign({}, r); delete x.foto_base64; return x; },

  // Lo que viaja de una operación, con el registro como está ahora; null si ya no hay qué enviar
  async datos(o) {
    const r = await SRP.almacen.unoLocal(o.tabla, o.registro_id);
    const base = { id: o.registro_id, version: o.version };
    if (this.ALTAS.includes(o.tipo)) return r ? this.sinFoto(r) : null;
    if (o.tipo === 'jornada.eliminar') return base;
    if (!r) return null;
    if (this.EDICIONES.includes(o.tipo)) {
      // Una corrección que al final dejó todo igual también viaja, vacía: el servidor la reconoce y responde con
      // el registro como lo tiene, que vuelve al teléfono con su versión, y la que sigue de ese registro la toma
      const cambios = {};
      this.CAMPOS[o.tabla].forEach(k => { if (!this.igual(r[k], (o.antes || {})[k])) cambios[k] = r[k] == null ? null : r[k]; });
      return Object.assign(base, { cambios });
    }
    if (o.tipo === 'registro.mover') return Object.assign(base, { jornada_id: r.jornada_id });
    if (o.tipo === 'jornada.revisar') return Object.assign(base, { puntos_revisados: r.puntos_revisados || [] });
    if (o.tipo === 'jornada.relevo') return Object.assign(base, { cabo_id: r.relevo_id || r.cabo_id });
    if (o.tipo === 'jornada.cierre') {
      ['encargado_id', 'personal', 'apoyo', 'observaciones', 'chofer', 'vehiculo_id', 'hora'].forEach(k => { base[k] = r[k] == null ? null : r[k]; });
    }
    return base;   // eliminar, restaurar, cerrar, reabrir, reporte y cierre
  },

  /* Envía lo de quien tiene la sesión. Devuelve { enviados: árboles recibidos, cortado: se fue la señal,
     rechazados, error }. */
  async enviar() {
    const u = SRP.sesion.usuario, res = { enviados: new Set(), cortado: false, rechazados: 0, error: null, eliminadas: [] };
    if (!this.activa() || !u || !SRP.turno.mia()) return res;
    await this.releer();
    await this.reparar(u);
    const esperan = new Set();   // registros con algo antes que no salió: lo suyo espera
    const eliminadas = new Set();   // jornadas que el servidor dice que se eliminaron
    for (;;) {
      const lote = [], ids = new Set(), sobran = new Set();
      for (const o of this.ops) {
        if (o.tipo === 'foto' || o.usuario_id !== u.id || ids.has(o.registro_id) || sobran.has(o)) continue;
        if (o.rechazo || esperan.has(o.registro_id) || (o.version === null && !this.ALTAS.includes(o.tipo))) { esperan.add(o.registro_id); continue; }
        // Lo que ya salió sin respuesta viaja otra vez tal como salió: el servidor lo reconoce
        const d = o.enviado || await this.datos(o);
        if (d === null) {
          // Un alta que ya no está en el teléfono —se borró antes de salir—: nada de ese registro tiene que llegar
          if (this.ALTAS.includes(o.tipo)) { this.de(o.registro_id).forEach(x => sobran.add(x)); ids.add(o.registro_id); }
          // Un cambio de un registro que ya no está en el teléfono no viaja, y el que sigue de ese registro toma su versión
          else { sobran.add(o); await this.heredar(o, o.version); }
          continue;
        }
        lote.push({ o, op: { tipo: o.tipo, datos: d } });
        ids.add(o.registro_id);
        if (lote.length === this.LOTE) break;
      }
      for (const o of sobran) await this.borrar(o);
      if (!lote.length) break;
      await this.salen(lote);
      const r = await SRP.servidor.pedir('POST', '/envios', { operaciones: lote.map(x => x.op) });
      const resultados = r.ok && Array.isArray(r.datos.resultados) ? r.datos.resultados : null;
      if (!resultados) { res.cortado = !r.ok && !!r.sinRed; res.error = res.cortado ? null : r.ok ? 'El servidor respondió algo que no se entiende.' : r.mensaje; break; }
      let avanzo = false;
      for (let i = 0; i < lote.length; i++) {
        const o = lote[i].o, x = resultados[i];
        if (x && x.estado === 'recibido') {
          await this.recibida(o, x);
          if (o.tabla === 'plantaciones') res.enviados.add(o.registro_id);
          avanzo = true;
        } else if (x && (x.codigo === 'JORNADA_PENDIENTE' || x.codigo === 'SIN_SERVICIO')) {
          // Su jornada todavía no llega, o el servidor no tuvo la base: se intenta después, con lo que se corrija
          esperan.add(o.registro_id);
          await this.noSalio(o);
        } else if (x && x.codigo === 'JORNADA_ELIMINADA') {
          eliminadas.add(o.tabla === 'jornadas' ? o.registro_id : ((await SRP.almacen.unoLocal('plantaciones', o.registro_id)) || {}).jornada_id);
          if (o.tabla === 'plantaciones') { await this.rechazada(o, x); res.rechazados++; }
          avanzo = true;
        } else {
          await this.rechazada(o, x || { codigo: 'SIN_RESPUESTA', mensaje: 'El servidor no respondió por esta operación.' });
          res.rechazados++;
          avanzo = true;
        }
      }
      for (const id of eliminadas) if (id) res.eliminadas.push(await this.jornadaEliminada(id, res));
      eliminadas.clear();
      if (!avanzo) break;
    }
    if (!res.cortado && !res.error) await this.subirFotos(res);
    await this.limpiar();
    this.vigilar(u, res);
    return res;
  },

  /* Lo que sale en este envío queda marcado con lo que lleva, antes de salir: si la respuesta no llega, se vuelve
     a mandar igual, y lo que se cambie mientras tanto no se le junta */
  async salen(lote) {
    const nuevas = lote.filter(x => !x.o.enviado);
    nuevas.forEach(x => { x.o.enviado = x.op.datos; });
    if (nuevas.length) await SRP.almacen.ponerLocales('envios', nuevas.map(x => x.o));
  },

  // El servidor respondió sin aplicarla: lo que se corrija después vuelve a viajar con ella
  async noSalio(o) {
    if (!o.enviado) return;
    o.enviado = null;
    await this.guardar(o);
  },

  // La que sigue de un registro, que esperaba la versión de ésta, la toma. Se guarda antes de soltar ésta
  async heredar(o, version) {
    const siguiente = this.de(o.registro_id).find(s => s !== o && s.tipo !== 'foto' && s.version === null && !this.ALTAS.includes(s.tipo));
    if (siguiente && version) { siguiente.version = version; await this.guardar(siguiente); }
  },

  /* Una operación que espera la versión de otra que ya no está nunca saldría: toma la del registro como lo tiene
     el servidor. Si no es la vigente, el servidor lo dice y se resuelve en «Revisar», a la vista. */
  async reparar(u) {
    for (const o of this.ops) {
      if (o.usuario_id !== u.id || o.tipo === 'foto' || o.version !== null || this.ALTAS.includes(o.tipo)) continue;
      if (this.ops.some(x => x.registro_id === o.registro_id && x.tipo !== 'foto' && x.n < o.n)) continue;
      const v = this.version(o.tabla, SRP.remoto.uno(o.tabla, o.registro_id) || await SRP.almacen.unoLocal(o.tabla, o.registro_id));
      if (v) { o.version = v; await this.guardar(o); }
    }
  },

  /* Lo que lleva más de MINUTOS_ENVIO_ATORADO sin salir aunque hubo conexión se avisa: la pastilla se pone en rojo
     (js/conexion.js) */
  vigilar(u, res) {
    if (res.cortado || res.error) return;
    const ahora = Date.now(), siguen = new Set();
    this.ops.filter(o => o.usuario_id === u.id && !o.rechazo).forEach(o => {
      siguen.add(o.n);
      if (!this.sinSalir.has(o.n)) this.sinSalir.set(o.n, ahora);
    });
    [...this.sinSalir.keys()].filter(n => !siguen.has(n)).forEach(n => this.sinSalir.delete(n));
  },

  atorada() {
    const limite = Date.now() - SRP.CONFIG.MINUTOS_ENVIO_ATORADO * 60000;
    return [...this.sinSalir.values()].some(t => t < limite);
  },

  async recibida(o, x) {
    // La que sigue de este registro ya sabe su versión. Lo que dijo el servidor se pone en el teléfono antes de
    // soltar ésta: si el teléfono se apaga o se queda sin espacio en medio, ésta se vuelve a enviar y el servidor
    // la reconoce
    await this.heredar(o, x.version);
    if (o.tipo === 'jornada.eliminar') SRP.remoto.jornadas.delete(o.registro_id);
    else if (x.fila) await this.aplicar(o.tabla, x.fila, o);
    for (const y of x.otras || []) await this.aplicar(y.tabla, y.fila, o);
    await this.borrar(o);
    this.recibidos.set(o.registro_id, SRP.util.ahoraISO());
  },

  /* Lo que el servidor no aceptó se queda con su motivo —y el de cada campo, si lo dio— y lo que sigue de ese
     registro espera. `fila`: el registro como está en el servidor, cuando lo manda. `jornada`: el nombre de la
     jornada que se eliminó, que ya no está en el teléfono para decirlo. */
  async rechazada(o, x) {
    o.rechazo = { codigo: x.codigo || x.estado || 'ERROR', mensaje: x.mensaje || '', errores: x.errores || null, fila: x.fila || null, en: SRP.util.ahoraISO(),
      jornada: x.jornada || (o.rechazo && o.rechazo.jornada) || null };
    o.enviado = null;
    await this.guardar(o);
  },

  /* Una jornada que se eliminó en el servidor sale del teléfono con lo suyo que esperaba envío: ya no tiene a
     dónde llegar. Sus árboles sin enviar se quedan, en «Revisar», para pasarlos a otra jornada o eliminarlos; si
     era la jornada activa, se elige o se inicia otra. Devuelve su nombre. */
  async jornadaEliminada(id, res) {
    const j = await SRP.almacen.unoLocal('jornadas', id);
    const nombre = j ? j.nombre || 'sin nombre' : null;
    for (const o of this.de(id)) await this.borrar(o);
    for (const r of await SRP.almacen.porIndiceLocal('plantaciones', 'jornada_id', id)) {
      for (const o of this.de(r.id).filter(o => o.tipo !== 'foto' && (o.rechazo ? o.rechazo.codigo === 'JORNADA_ELIMINADA' : this.ALTAS.includes(o.tipo) || o.tipo === 'registro.mover'))) {
        if (!o.rechazo) res.rechazados++;
        await this.rechazada(o, { codigo: 'JORNADA_ELIMINADA', mensaje: 'Esa jornada se eliminó en el servidor.', jornada: nombre });
      }
    }
    if (j) await SRP.almacen.quitarLocales({ jornadas: [id] });
    SRP.remoto.jornadas.delete(id);
    if (SRP.activa.jornada && SRP.activa.jornada.id === id) SRP.activa.jornada = null;
    return nombre;
  },

  /* Lo que respondió el servidor de un registro: se ve en lo enviado y, si el teléfono lo guarda, se pone al día.
     Con algo suyo por enviar, sólo toma lo que pone el servidor; la fotografía que guarda el teléfono se queda.
     `de`: la operación que respondió, que todavía está en la cola. */
  async aplicar(tabla, fila, de) {
    if (!fila || !fila.id) return;
    SRP.remoto[tabla].set(fila.id, fila);
    const local = await SRP.almacen.unoLocal(tabla, fila.id);
    if (!local) return;
    const espera = this.de(fila.id).some(o => o !== de && o.tipo !== 'foto');
    const nuevo = espera
      ? Object.assign({}, local, Object.fromEntries(this.DEL_SERVIDOR.filter(k => k in fila).map(k => [k, fila[k]])))
      : this.conFoto(fila, local);
    await SRP.almacen.ponerLocal(tabla, nuevo);
  },

  // Las fotografías nuevas, cada una después de su árbol; la que el servidor no acepta se queda con su motivo
  async subirFotos(res) {
    const u = SRP.sesion.usuario;
    for (const o of this.ops.filter(x => x.tipo === 'foto' && !x.rechazo && x.usuario_id === u.id)) {
      if (this.de(o.registro_id).some(p => p !== o && p.tipo !== 'foto')) continue;
      const r = await SRP.almacen.unoLocal('plantaciones', o.registro_id);
      const b = r && r.foto_id === o.foto_id && SRP.util.fotoSegura(r.foto_base64) ? await SRP.foto.bytes(r) : null;
      if (!b) { await this.borrar(o); continue; }
      const x = await SRP.servidor.subir('/fotos/' + o.foto_id, b.datos, b.tipo);
      // Sólo la confirmación del servicio, con el id de la fotografía, la saca de la cola
      if (x.ok && x.datos.id === o.foto_id) { await this.borrar(o); continue; }
      if (x.ok || x.sinRed) { res.cortado = true; break; }
      // Su árbol todavía no llega, o el servidor aún no recibe fotografías: se intenta después
      if (x.codigo === 'ARBOL_PENDIENTE' || x.estado === 503) continue;
      if (x.estado === 401) break;
      await this.rechazada(o, x);
      res.rechazados++;
    }
  },

  /* S-11: sale del teléfono lo ya recibido, salvo la jornada abierta —o cerrada sin su reporte— con sus
     árboles, y lo que espera envío. Con su historial. Lo que espera se lee del almacén, no de la memoria: así
     nada que haya anotado otra pestaña sale del teléfono. */
  async limpiar() {
    const [jornadas, arboles, cola] = await Promise.all(['jornadas', 'plantaciones', 'envios'].map(t => SRP.almacen.todosLocales(t)));
    const pendientes = new Set(cola.concat(this.ops).map(o => o.registro_id));
    const espera = id => pendientes.has(id);
    const quedan = new Set(jornadas.filter(j => espera(j.id) || j.estatus === 'abierta' || !j.reporte_en).map(j => j.id));
    const fuera = {
      jornadas: jornadas.filter(j => !quedan.has(j.id)).map(j => j.id),
      plantaciones: arboles.filter(r => !espera(r.id) && !quedan.has(r.jornada_id)).map(r => r.id)
    };
    if (fuera.jornadas.length || fuera.plantaciones.length) await SRP.almacen.quitarLocales(fuera);
  },

  /* ---------- Lo que el servidor no aceptó: lo que decide la persona ---------- */

  // Se envía otra vez; si alguien más cambió el registro antes, sobre lo que hay ahora
  async reenviar(o) {
    const f = o.rechazo && o.rechazo.fila;
    if (o.rechazo && o.rechazo.codigo === 'VERSION_VIEJA' && f) {
      o.version = this.version(o.tabla, f);
      SRP.remoto[o.tabla].set(f.id, f);
    }
    o.rechazo = null;
    await this.guardar(o);
  },

  /* El cambio no se envía: sale de la cola con todo lo que esperaba detrás de él, y el registro del teléfono
     vuelve a como está en el servidor. Si no se sabe cómo está, una corrección se deshace con lo que había
     antes; lo demás se queda como está. Una fotografía sale sola: el árbol sigue sin ella. */
  async descartar(o) {
    if (o.tipo === 'foto') { await this.borrar(o); return; }
    const f = await this.delServidor(o.tabla, o.registro_id, o.rechazo && o.rechazo.fila);
    const local = await SRP.almacen.unoLocal(o.tabla, o.registro_id);
    for (const x of this.de(o.registro_id)) await this.borrar(x);
    if (f) {
      SRP.remoto[o.tabla].set(f.id, f);
      if (local) await SRP.almacen.ponerLocal(o.tabla, this.conFoto(f, local));
    } else if (local && this.EDICIONES.includes(o.tipo) && o.antes) {
      await SRP.almacen.ponerLocal(o.tabla, Object.assign({}, local, Object.fromEntries(this.CAMPOS[o.tabla].map(k => [k, o.antes[k] == null ? null : o.antes[k]]))));
    }
    await this.limpiar();
  },

  /* Un alta que nunca llegó sale del teléfono con su historial y lo que esperaba detrás de ella. El árbol que
     sustituía vuelve a contar como plantado. */
  async eliminarAlta(o) {
    const local = await SRP.almacen.unoLocal(o.tabla, o.registro_id);
    for (const x of this.de(o.registro_id)) await this.borrar(x);
    await SRP.almacen.quitarLocales({ [o.tabla]: [o.registro_id] });
    const original = local && local.sustituye_id ? await SRP.almacen.unoLocal('plantaciones', local.sustituye_id) : null;
    if (original && original.sustituido_por_id === o.registro_id) {
      const f = await this.delServidor('plantaciones', original.id);
      await SRP.almacen.ponerLocal('plantaciones', f ? this.conFoto(f, original) : Object.assign({}, original, { estatus: 'activo', sustituido_por_id: null }));
    }
    await this.limpiar();
  },

  // Cómo tiene el servidor un registro: lo que vino con el rechazo, lo enviado o, si falta, lo que se vuelve a traer
  async delServidor(tabla, id, fila) {
    if (fila && fila.id === id) return fila;
    if (!SRP.remoto.uno(tabla, id) && SRP.remoto.estado !== 'listo' && SRP.conexion.enLinea()) await SRP.remoto.cargar();
    return SRP.remoto.uno(tabla, id) || null;
  },

  // El registro del servidor, con la fotografía que guarda el teléfono si es la misma
  conFoto(f, local) { return Object.assign({}, f, local.foto_base64 && local.foto_id === f.foto_id ? { foto_base64: local.foto_base64 } : {}); },

  /* ---------- El almacén de la cola ---------- */

  async guardar(o) { await SRP.almacen.ponerLocal('envios', o); },

  async borrar(o) {
    await SRP.almacen.quitarLocal('envios', o.n);
    this.ops = this.ops.filter(x => x !== o);
  }
};
