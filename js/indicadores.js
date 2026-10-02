/* INDICADORES DE SUPERVISIÓN (D157). Un solo cálculo para la pestaña Supervisión («Mi avance» del
   cabo) y para los informes por periodo en PDF y CSV: lo que se ve en pantalla es lo mismo que se
   imprime y se descarga. Reglas decididas por Liber (25-09-2026):
   - Sólo cuentan las jornadas CERRADAS: una abierta todavía cambia. Las abiertas del periodo se
     dicen aparte («en curso») y las de días anteriores aparecen en «Qué atender».
   - Cada árbol cuenta en el periodo de su fecha de plantación, no en el de su jornada: una jornada
     puede durar varios días y un sustituto se planta después. Una jornada es del periodo si empezó
     en él o si tiene árboles plantados en él.
   - «Quién registró» es quien capturó cada árbol: en una jornada con relevo, cada cabo cuenta los
     suyos. Las jornadas, la meta y los pendientes son del titular.
   - Semana de lunes a domingo; mes y año de calendario; o un rango de fechas.
   - Cada quien ve su alcance: el cabo lo suyo, la coordinación su cuadrilla y lo suyo, la
     administración todo. En la Etapa 1 es lo que hay en este teléfono; en la Fase 2, el servidor.
   - Lo que plantan las alcaldías, PAOT, SOBSE y las empresas suma a las cifras de la Ciudad, y se
     desglosa por institución; el filtro de institución deja sólo la elegida.
   - Se cuentan los árboles activos. Los eliminados y los editados se cuentan aparte, como
     trazabilidad, sin restarse ni sumarse a nada.
   Las definiciones están también en datos/esquema.json («indicadores»), para que el SIA calcule igual. */
window.SRP = window.SRP || {};

SRP.indicadores = {
  /* ---------- Periodos ---------- */

  // 'AAAA-MM-DD' ⇄ Date a mediodía: sin sobresaltos por horario de verano
  aFecha(t) { const [a, m, d] = t.split('-').map(Number); return new Date(a, m - 1, d, 12); },
  aTexto(f) { return f.getFullYear() + '-' + String(f.getMonth() + 1).padStart(2, '0') + '-' + String(f.getDate()).padStart(2, '0'); },
  sumarDias(t, n) { const f = this.aFecha(t); f.setDate(f.getDate() + n); return this.aTexto(f); },
  // El lunes de la semana de una fecha (la semana va de lunes a domingo)
  lunes(t) { const f = this.aFecha(t); return this.sumarDias(t, -((f.getDay() + 6) % 7)); },

  TIPOS: { semana: 'Semana', mes: 'Mes', anio: 'Año', rango: 'Un periodo', todo: 'Todo' },

  /* Un periodo: { tipo, desde, hasta, etiqueta }. `ref` es cualquier fecha dentro del periodo
     (por omisión, hoy); en un rango, `ref` es su inicio y `hasta` su fin. «todo» no tiene límites. */
  periodo(tipo, ref, hasta) {
    ref = ref || SRP.util.fechaHoy();
    let desde, fin;
    if (tipo === 'semana') { desde = this.lunes(ref); fin = this.sumarDias(desde, 6); }
    else if (tipo === 'mes') { desde = ref.slice(0, 7) + '-01'; const f = this.aFecha(desde); f.setMonth(f.getMonth() + 1, 0); fin = this.aTexto(f); }
    else if (tipo === 'anio') { desde = ref.slice(0, 4) + '-01-01'; fin = ref.slice(0, 4) + '-12-31'; }
    else if (tipo === 'rango') { desde = ref <= (hasta || ref) ? ref : hasta; fin = ref <= (hasta || ref) ? (hasta || ref) : ref; }
    else { tipo = 'todo'; desde = ''; fin = ''; }
    const p = { tipo, desde, hasta: fin };
    p.etiqueta = this.etiqueta(p);
    return p;
  },

  etiqueta(p) {
    const F = t => SRP.util.formatearFecha(t);
    if (p.tipo === 'semana') return 'Semana del ' + F(p.desde) + ' al ' + F(p.hasta);
    if (p.tipo === 'mes') return SRP.util.nombreMes(p.desde.slice(0, 7));
    if (p.tipo === 'anio') return 'Año ' + p.desde.slice(0, 4);
    if (p.tipo === 'rango') return p.desde === p.hasta ? F(p.desde) : 'Del ' + F(p.desde) + ' al ' + F(p.hasta);
    return 'Todo el registro';
  },

  // El periodo anterior (−1) o el siguiente (+1) del mismo tipo; un rango se corre su propio largo
  mover(p, paso) {
    if (p.tipo === 'semana') return this.periodo('semana', this.sumarDias(p.desde, 7 * paso));
    if (p.tipo === 'mes') { const f = this.aFecha(p.desde); f.setMonth(f.getMonth() + paso, 1); return this.periodo('mes', this.aTexto(f)); }
    if (p.tipo === 'anio') return this.periodo('anio', (Number(p.desde.slice(0, 4)) + paso) + '-01-01');
    if (p.tipo === 'rango') {
      const largo = Math.round((this.aFecha(p.hasta) - this.aFecha(p.desde)) / 864e5) + 1;
      return this.periodo('rango', this.sumarDias(p.desde, largo * paso), this.sumarDias(p.hasta, largo * paso));
    }
    return p;
  },

  // ¿Ya llegó el periodo siguiente? No se ofrece avanzar hacia un futuro sin datos
  hayPosterior(p) { return p.tipo !== 'todo' && !!p.hasta && p.hasta < SRP.util.fechaHoy(); },
  contiene(p, fecha) { return !!fecha && (!p.desde || fecha >= p.desde) && (!p.hasta || fecha <= p.hasta); },

  /* ---------- Datos ---------- */

  /* Lo que alcanza quien entró: sus jornadas con sus árboles activos, los árboles eliminados y lo
     que la bitácora dice de ediciones. Una sola lectura: el cálculo de después es puro. */
  async cargar() {
    const u = SRP.sesion.usuario;
    const alcanza = r => SRP.permisos.alcanza(u, r, SRP.ref.usuarioPorId);
    const jornadas = await SRP.jornadas.jornadasAlcance();
    const eliminados = (await SRP.almacen.porIndice('plantaciones', 'estatus', 'eliminado')).filter(alcanza);
    // Los árboles del alcance ya están en las jornadas y en los eliminados: no se vuelven a leer
    const arbol = {};
    jornadas.forEach(j => j.registros.forEach(r => { arbol[r.id] = r; }));
    eliminados.forEach(r => { arbol[r.id] = r; });
    const ediciones = (await SRP.almacen.todos('bitacora'))
      .filter(b => b.entidad === 'plantacion' && b.accion === 'EDITADO' && arbol[b.entidad_id])
      .map(b => ({ fecha: b.fecha, arbol: arbol[b.entidad_id], usuario_id: b.usuario_id }));
    // En «Mi avance» del cabo cuentan sus árboles: en una jornada con relevo, los del otro cabo no
    return { jornadas, eliminados, ediciones, usuario: u, cabos: this.cabosAsignados(u), soloDe: SRP.permisos.de(u).alcance === 'propios' ? u.id : null };
  },

  // Los cabos de quien entra: el propio cabo; los de la cuadrilla; todos los activos para administración
  cabosAsignados(u) {
    const alcance = SRP.permisos.de(u).alcance;
    if (alcance === 'propios') return [u.id];
    const cabos = SRP.ref.usuarios.filter(x => x.activo && x.perfil === 'CABO');
    return (alcance === 'equipo' ? cabos.filter(x => x.coordinador_id === u.id) : cabos).map(x => x.id);
  },

  /* ---------- Cálculo ---------- */

  // La institución que ejecutó una jornada (de las agrupadas de SRP.jornadas); sin dato, la Secretaría
  organizacionDe(j) { return (j && j.dato && j.dato.organizacion_id) || SRP.CONFIG.ORGANIZACION_SEDEMA; },

  // Nativa quiere decir de aquí: nativa o endémica (catálogo SNIB/CONABIO)
  esNativa(distribucion) { return /^(nativa|end[eé]mica)/i.test(distribucion || ''); },
  mediana(v) { if (!v.length) return null; const s = v.slice().sort((a, b) => a - b), k = s.length >> 1; return s.length % 2 ? s[k] : (s[k - 1] + s[k]) / 2; },
  pct(a, b) { return b ? Math.round(a * 100 / b) : null; },

  /* El modelo de todo lo que se ve y se imprime. `filtros`: { alcaldia, programa, origen, cabo, organizacion },
     cada uno vacío para «todos». Con alcaldía, cuentan los árboles de esa alcaldía y las jornadas que
     tienen alguno ahí (o que la declararon, si no tienen árboles). `hoy`, sólo para probar. */
  calcular(datos, periodo, filtros, hoy) {
    filtros = filtros || {};
    hoy = hoy || SRP.util.fechaHoy();
    const esDeAlcaldia = r => !filtros.alcaldia || r.alcaldia === filtros.alcaldia;
    // Institución de cada árbol: la de su jornada (o, sin jornada a la vista, la de su cabo)
    const orgPorJornada = {}, datoPorJornada = {}; datos.jornadas.forEach(j => { orgPorJornada[j.id] = this.organizacionDe(j); datoPorJornada[j.id] = j.dato; });
    const orgArbol = r => orgPorJornada[r.jornada_id] || ((SRP.ref.usuarioPorId[r.cabo_id] || {}).organizacion_id) || SRP.CONFIG.ORGANIZACION_SEDEMA;
    // El árbol que cuenta: de la alcaldía elegida, de quien registró (si se eligió) y, en «Mi avance» del cabo, suyo
    const delCabo = r => (!filtros.cabo || r.cabo_id === filtros.cabo) && (!datos.soloDe || r.cabo_id === datos.soloDe);
    const cuentaArbol = r => esDeAlcaldia(r) && delCabo(r);
    const enPeriodo = r => this.contiene(periodo, r.fecha_plantacion);
    const pasa = j => (!filtros.organizacion || this.organizacionDe(j) === filtros.organizacion) && (!filtros.tipo || SRP.util.tipoDe(this.organizacionDe(j)) === filtros.tipo) &&
      (!filtros.cabo || j.cabo_id === filtros.cabo || j.registros.some(r => r.cabo_id === filtros.cabo)) && (!filtros.programa || (j.dato && j.dato.programa_id) === filtros.programa) &&
      SRP.pedido.cumpleFiltro(j.dato, filtros.origen) &&
      (!filtros.alcaldia || j.registros.some(esDeAlcaldia) || (!j.registros.length && j.dato && j.dato.alcaldia === filtros.alcaldia));
    const delPeriodo = datos.jornadas.filter(j => pasa(j) && (this.contiene(periodo, j.fecha) || j.registros.some(r => enPeriodo(r) && cuentaArbol(r))));
    const cerradas = delPeriodo.filter(j => j.estatus !== 'abierta');
    const enCurso = delPeriodo.filter(j => j.estatus === 'abierta');
    const arboles = [];
    cerradas.forEach(j => j.registros.filter(r => cuentaArbol(r) && enPeriodo(r)).forEach(r => arboles.push({ r, j })));
    const n = arboles.length;

    // Meta: la de las jornadas cerradas que la tienen, contra sus propios árboles
    const conMeta = cerradas.filter(j => SRP.jornadas.previstosDe(j) !== null);
    const meta = conMeta.reduce((s, j) => s + SRP.jornadas.previstosDe(j), 0);
    // El avance de una jornada es contra todos sus árboles, de cualquier día: la meta es de la jornada
    const arbolesConMeta = conMeta.reduce((s, j) => s + j.registros.filter(esDeAlcaldia).length, 0);

    // Pendientes de cada jornada: puntos marcados sin «Está bien» y reporte sin generar
    const pendientes = j => SRP.jornadas.pendientes(j, SRP.jornadas.avisos(j), j.dato).length;
    const especieDe = r => SRP.ref.especieDe(r);

    // Calidad del dato
    const gps = arboles.filter(a => a.r.punto_origen === 'gps');
    const calidad = {
      conFoto: arboles.filter(a => a.r.foto_id || a.r.foto_base64).length,
      gps: gps.length,
      mapa: arboles.filter(a => a.r.punto_origen === 'mapa').length,
      aMano: arboles.filter(a => a.r.punto_origen === 'manual').length,
      precisionMediana: this.mediana(gps.map(a => a.r.gps_precision_m).filter(x => x != null))
    };
    calidad.conFotoPct = this.pct(calidad.conFoto, n);
    // Sustitutos: árboles que reemplazan a uno perdido. Cuentan como plantados; aquí se dicen aparte, por motivo
    const sust = arboles.filter(a => a.r.sustituye_id);
    calidad.sustitutos = sust.length;
    calidad.sustitutosMotivo = SRP.CONFIG.MOTIVOS_SUSTITUCION.map(([k, t]) => [t, sust.filter(a => a.r.motivo_sustitucion === k).length]).filter(x => x[1]);
    calidad.gpsPct = this.pct(calidad.gps, n);

    // Por especie, alcaldía, colonia y programa
    const cuenta = (lista, clave, extra) => {
      const m = new Map();
      lista.forEach(x => { const k = clave(x); if (k == null) return; const e = m.get(k) || Object.assign({ clave: k, arboles: 0, jornadas: new Set() }, extra ? extra(x) : {}); e.arboles++; e.jornadas.add(x.j.id); m.set(k, e); });
      return [...m.values()].map(e => Object.assign(e, { jornadas: e.jornadas.size })).sort((a, b) => b.arboles - a.arboles || String(a.clave).localeCompare(String(b.clave), 'es'));
    };
    const porEspecie = cuenta(arboles, a => { const e = especieDe(a.r); return e.comun + '|' + e.cientifico; },
      a => { const e = especieDe(a.r); return { comun: e.comun, cientifico: e.cientifico, distribucion: e.distribucion, nativa: this.esNativa(e.distribucion) }; });
    const porAlcaldia = cuenta(arboles, a => a.r.alcaldia || 'Sin alcaldía', a => ({ alcaldia: a.r.alcaldia || 'Sin alcaldía' }));
    porAlcaldia.forEach(e => { const cols = new Set(arboles.filter(a => (a.r.alcaldia || 'Sin alcaldía') === e.clave && a.r.colonia).map(a => a.r.colonia)); e.colonias = cols.size; });
    const porColonia = cuenta(arboles.filter(a => a.r.colonia), a => a.r.colonia + '|' + (a.r.alcaldia || ''), a => ({ colonia: a.r.colonia, alcaldia: a.r.alcaldia || '' }));
    const porPrograma = cuenta(arboles, a => SRP.ref.nombreCatalogo(a.r.programa_id) || 'Sin programa', a => ({ programa: SRP.ref.nombreCatalogo(a.r.programa_id) || 'Sin programa' }));
    // Por institución: quién ejecutó, con su tipo; la Secretaría primero cuando empatan
    const porOrganizacion = cuenta(arboles, a => this.organizacionDe(a.j), a => {
      const id = this.organizacionDe(a.j), o = SRP.ref.catalogoPorId[id] || {};
      return { organizacion: SRP.ref.nombreOrganizacion(id), tipo: SRP.ref.esSedema(id) ? 'Secretaría' : o.tipo_organizacion || '', sedema: SRP.ref.esSedema(id) };
    });
    const nativas = arboles.filter(a => this.esNativa(especieDe(a.r).distribucion)).length;
    // Pedidos especiales: las jornadas cerradas que pidió otra instancia, con sus árboles del periodo, por solicitante
    const pedidas = cerradas.filter(j => SRP.pedido.esPedido(j.dato));
    const pedidos = { jornadas: pedidas.length, arboles: arboles.filter(a => SRP.pedido.esPedido(a.j.dato)).length,
      solicitantes: [...new Set(pedidas.map(j => SRP.pedido.clave(j.dato)))].map(k => ({ clave: k, solicitante: SRP.pedido.nombreClave(k),
        jornadas: pedidas.filter(j => SRP.pedido.clave(j.dato) === k).length, arboles: arboles.filter(a => SRP.pedido.clave(a.j.dato) === k).length }))
        .sort((a, b) => b.arboles - a.arboles || a.solicitante.localeCompare(b.solicitante, 'es')) };
    // Por prioridad de la colonia donde cayó cada árbol (modelo de priorización); se cruza con el punto, no se guarda
    const prioridad = SRP.prioritarias.hay() ? SRP.prioritarias.contar(arboles.map(a => a.r)) : null;
    if (prioridad) prioridad.altas = prioridad.niveles.filter(x => x.prioridad >= 3).reduce((s, x) => s + x.n, 0);

    // Trazabilidad del periodo: árboles eliminados y ediciones, del alcance y con los filtros
    const pasaArbol = r => (!filtros.organizacion || orgArbol(r) === filtros.organizacion) && (!filtros.tipo || SRP.util.tipoDe(orgArbol(r)) === filtros.tipo) &&
      delCabo(r) && (!filtros.programa || r.programa_id === filtros.programa) && SRP.pedido.cumpleFiltro(datoPorJornada[r.jornada_id], filtros.origen) && esDeAlcaldia(r);
    const eliminados = datos.eliminados.filter(r => this.contiene(periodo, this.dia(r.fecha_ultima_edicion)) && pasaArbol(r));
    const ediciones = datos.ediciones.filter(e => this.contiene(periodo, this.dia(e.fecha)) && pasaArbol(e.arbol));

    // Una jornada de carga masiva no tiene reporte de campo que generar: no se pide
    const faltaReporte = j => !(j.dato && (j.dato.reporte_en || j.dato.carga_id));
    // Por cabo: todos los de su alcance, también los que no trabajaron (así se ve quién falta)
    // Con institución elegida, sólo sus cabos
    const orgCabo = id => (SRP.ref.usuarioPorId[id] || {}).organizacion_id || SRP.CONFIG.ORGANIZACION_SEDEMA;
    const deLaOrg = id => (!filtros.organizacion || orgCabo(id) === filtros.organizacion) && (!filtros.tipo || SRP.util.tipoDe(orgCabo(id)) === filtros.tipo);
    const cabosOrg = datos.cabos.filter(deLaOrg);
    const idsCabos = [...new Set(cabosOrg.concat(delPeriodo.map(j => j.cabo_id)))].filter(id => !filtros.cabo || id === filtros.cabo);
    const abiertasViejas = datos.jornadas.filter(j => j.estatus === 'abierta' && j.fecha < hoy && pasa(j));
    const porCabo = idsCabos.map(id => {
      const js = cerradas.filter(j => j.cabo_id === id);
      const jm = js.filter(j => SRP.jornadas.previstosDe(j) !== null);
      const m = jm.reduce((s, j) => s + SRP.jornadas.previstosDe(j), 0);
      const am = jm.reduce((s, j) => s + j.registros.filter(esDeAlcaldia).length, 0);
      return {
        cabo_id: id, nombre: SRP.ref.nombreUsuario(id),
        // Las jornadas son del titular; los árboles, de quien los capturó
        jornadas: js.length, arboles: arboles.filter(a => a.r.cabo_id === id).length,
        meta: m, avance: this.pct(am, m), enCurso: enCurso.filter(j => j.cabo_id === id).length,
        ultima: js.map(j => j.fecha).sort().pop() || null,
        abiertasViejas: abiertasViejas.filter(j => j.cabo_id === id).length,
        sinRevisar: js.reduce((s, j) => s + pendientes(j), 0),
        sinReporte: js.filter(faltaReporte).length,
        eliminados: eliminados.filter(r => r.cabo_id === id).length,
        editados: ediciones.filter(e => e.arbol.cabo_id === id).length
      };
    }).sort((a, b) => b.arboles - a.arboles || a.nombre.localeCompare(b.nombre, 'es'));

    // Qué atender: lo que alguien tiene que hacer, con las jornadas a las que lleva
    const sinRevisar = cerradas.filter(j => pendientes(j) > 0);
    const sinReporte = cerradas.filter(faltaReporte);
    const atender = [
      { tipo: 'abiertas', n: abiertasViejas.length, ids: abiertasViejas.map(j => j.id),
        texto: abiertasViejas.length === 1 ? '1 jornada de un día anterior sigue abierta' : abiertasViejas.length + ' jornadas de días anteriores siguen abiertas' },
      { tipo: 'revisar', n: sinRevisar.length, ids: sinRevisar.map(j => j.id),
        texto: sinRevisar.length === 1 ? '1 jornada cerrada tiene puntos sin revisar' : sinRevisar.length + ' jornadas cerradas tienen puntos sin revisar' },
      { tipo: 'reporte', n: sinReporte.length, ids: sinReporte.map(j => j.id),
        texto: sinReporte.length === 1 ? '1 jornada cerrada no tiene reporte' : sinReporte.length + ' jornadas cerradas no tienen reporte' }
    ].filter(a => a.n > 0);

    return {
      periodo, filtros, generado: SRP.util.ahoraISO(),
      cifras: {
        arboles: n, jornadas: cerradas.length, enCurso: enCurso.length, meta, arbolesConMeta,
        avance: this.pct(arbolesConMeta, meta),
        promedio: cerradas.length ? Math.round(n * 10 / cerradas.length) / 10 : null,
        // «X de Y cabos trabajaron»: sólo cabos; lo que registra quien coordina cuenta en los árboles, no aquí
        cabosActivos: new Set(cerradas.map(j => j.cabo_id).filter(id => cabosOrg.includes(id))).size, cabosAsignados: cabosOrg.length,
        instituciones: porOrganizacion.length,
        especies: porEspecie.length, nativas, nativasPct: this.pct(nativas, n),
        alcaldias: porAlcaldia.filter(e => e.clave !== 'Sin alcaldía').length, colonias: porColonia.length
      },
      calidad,
      serie: this.serie(periodo, arboles, cerradas),
      porCabo, porAlcaldia, porColonia, porEspecie, porPrograma, porOrganizacion, prioridad, pedidos,
      jornadas: cerradas.slice().sort((a, b) => b.fecha.localeCompare(a.fecha)).map(j => ({
        id: j.id, fecha: j.fecha, nombre: j.nombre, cabo: SRP.ref.nombreUsuario(j.cabo_id), cabo_id: j.cabo_id,
        organizacion: SRP.ref.nombreOrganizacion(this.organizacionDe(j)), externa: !SRP.ref.esSedema(this.organizacionDe(j)),
        // Los árboles de la jornada que cuentan en el periodo: así la suma de la tabla es el total
        programa: SRP.ref.nombreCatalogo(j.dato && j.dato.programa_id) || '', arboles: arboles.filter(a => a.j === j).length, meta: SRP.jornadas.previstosDe(j),
        lugar: SRP.jornadas.lugarDe(j), reporte: !!(j.dato && j.dato.reporte_en), pendientes: pendientes(j), solicitante: SRP.pedido.solicitante(j.dato),
        prioridad: SRP.prioritarias.hay() ? ((j.prioridad || SRP.prioritarias.deJornada(j.registros, j.dato) || {}).texto || 'Sin dato') : ''
      })),
      enCurso: enCurso.map(j => ({ id: j.id, fecha: j.fecha, nombre: j.nombre, cabo: SRP.ref.nombreUsuario(j.cabo_id), arboles: j.registros.length })),
      atender,
      trazabilidad: { eliminados: eliminados.length, editados: ediciones.length },
      // Un renglón por árbol contado: la tabla que se descarga en CSV (D159)
      detalle: arboles.map(({ r, j }) => {
        const e = especieDe(r);
        return { folio: SRP.folio.valido(r.folio) ? r.folio : 'PROVISIONAL', fecha: r.fecha_plantacion, jornada: j.nombre, organizacion: SRP.ref.nombreOrganizacion(this.organizacionDe(j)),
          cabo: SRP.ref.nombreUsuario(r.cabo_id),
          programa: SRP.ref.nombreCatalogo(r.programa_id) || '', especie: e.comun, cientifico: e.cientifico, distribucion: e.distribucion || '',
          alcaldia: r.alcaldia || '', colonia: r.colonia || '', uga: r.uga || '', lat: r.lat, lng: r.lng, origen: SRP.mapa.textoOrigen(r.punto_origen),
          precision: r.punto_origen === 'gps' && r.gps_precision_m != null ? Math.round(r.gps_precision_m) : '', foto: r.foto_id || r.foto_base64 ? 'Sí' : 'No',
          reporte: j.dato && j.dato.reporte_en ? 'Generado' : 'Pendiente', sustituto: r.sustituye_id ? 'Sí' : 'No', motivo: SRP.ref.motivoSustitucion(r),
          origenJornada: SRP.pedido.textoOrigen(j.dato), solicitante: SRP.pedido.solicitante(j.dato), pedidoDescripcion: SRP.pedido.esPedido(j.dato) ? j.dato.pedido_descripcion || '' : '',
          prioridad: prioridad ? ((SRP.prioritarias.de(r.lat, r.lng) || {}).texto || 'Sin dato') : '' };
      })
    };
  },

  // El día local de una marca de tiempo ISO
  dia(iso) { const f = new Date(iso); return isNaN(f) ? '' : this.aTexto(f); },

  /* La serie para la gráfica: por día en una semana; por semana en un mes; por mes en un año; en
     un rango, por día hasta 31 días, por semana hasta 26 semanas y luego por mes; en «todo», por
     mes o, pasados dos años, por año. Cada casilla trae árboles y jornadas cerradas. */
  serie(periodo, arboles, cerradas) {
    const fechas = cerradas.map(j => j.fecha).concat(arboles.map(a => a.r.fecha_plantacion)).sort();
    const desde = periodo.desde || fechas[0], hasta = periodo.hasta || fechas[fechas.length - 1];
    if (!desde || !hasta) return { unidad: 'dia', casillas: [] };
    const dias = Math.round((this.aFecha(hasta) - this.aFecha(desde)) / 864e5) + 1;
    const unidad = periodo.tipo === 'semana' ? 'dia' : periodo.tipo === 'mes' ? 'semana' : periodo.tipo === 'anio' ? 'mes'
      : dias <= 31 ? 'dia' : dias <= 182 ? 'semana' : dias <= 731 ? 'mes' : 'anio';
    const clave = t => unidad === 'dia' ? t : unidad === 'semana' ? this.lunes(t) : unidad === 'mes' ? t.slice(0, 7) : t.slice(0, 4);
    const casillas = [];
    const poner = k => casillas.push({ clave: k, etiqueta: this.etiquetaCasilla(unidad, k), arboles: 0, jornadas: 0 });
    if (unidad === 'dia') for (let t = desde; t <= hasta; t = this.sumarDias(t, 1)) poner(t);
    else if (unidad === 'semana') for (let t = this.lunes(desde); t <= hasta; t = this.sumarDias(t, 7)) poner(t);
    else if (unidad === 'mes') {
      let [a, m] = desde.split('-').map(Number);
      for (let k = desde.slice(0, 7); k <= hasta.slice(0, 7); ) { poner(k); m++; if (m > 12) { m = 1; a++; } k = a + '-' + String(m).padStart(2, '0'); }
    } else for (let a = Number(desde.slice(0, 4)); a <= Number(hasta.slice(0, 4)); a++) poner(String(a));
    const pos = new Map(casillas.map((c, i) => [c.clave, i]));
    arboles.forEach(a => { const i = pos.get(clave(a.r.fecha_plantacion)); if (i !== undefined) casillas[i].arboles++; });
    /* Cada jornada cuenta una vez, en la casilla de su primer árbol del periodo: una jornada de
       varios días que empezó antes cae donde plantó, y la columna suma lo mismo que el total. */
    const primero = new Map();
    arboles.forEach(a => { const f = a.r.fecha_plantacion; if (!primero.has(a.j) || f < primero.get(a.j)) primero.set(a.j, f); });
    cerradas.forEach(j => {
      const k = clave(primero.get(j) || j.fecha);
      const i = pos.has(k) ? pos.get(k) : casillas.length ? (k < casillas[0].clave ? 0 : casillas.length - 1) : undefined;
      if (i !== undefined) casillas[i].jornadas++;
    });
    return { unidad, casillas };
  },

  etiquetaCasilla(unidad, k) {
    const MESES = ['ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN', 'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC'];
    if (unidad === 'dia') { const f = this.aFecha(k); return ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'][f.getDay()] + ' ' + f.getDate(); }
    if (unidad === 'semana') { const f = this.aFecha(k); return f.getDate() + '-' + MESES[f.getMonth()]; }
    if (unidad === 'mes') return MESES[Number(k.slice(5, 7)) - 1] + (k.slice(0, 4) !== String(new Date().getFullYear()) ? ' ' + k.slice(2, 4) : '');
    return k;
  }
};
