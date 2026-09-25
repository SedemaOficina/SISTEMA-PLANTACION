/* VALIDAR LO QUE ENTRA DE FUERA (D150).
   Un respaldo es un archivo que pasó por otras manos: antes de guardarlo, cada renglón se revisa
   contra el esquema (SRP.ESQUEMA, generado de esquema.json) y contra lo que ya existe en el
   teléfono. Es la misma revisión que hará el servidor en la Fase 2, por eso vive aparte y no dentro
   de la restauración.

   Qué se revisa: que estén los campos obligatorios; que cada valor tenga su tipo (texto, número,
   fecha, identificador…); que los valores de lista estén en su dominio; que las referencias
   (cabo, programa, especie, jornada) existan; que el punto caiga en el ámbito del mapa y que la
   foto sea una imagen. Los campos que el esquema no conoce se descartan: nada entra a la base sin
   estar declarado. Los identificadores sólo admiten letras, números, guion y guion bajo, así que un
   id no puede cerrar un atributo ni abrir una etiqueta. */
window.SRP = window.SRP || {};

SRP.validar = {
  ID: /^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$/,

  tipoValido(tipo, v) {
    if (tipo === 'uuid') return typeof v === 'string' && this.ID.test(v);
    if (tipo === 'uuid[]') return Array.isArray(v) && v.every(x => typeof x === 'string' && this.ID.test(x));
    if (tipo === 'boolean') return typeof v === 'boolean';
    if (tipo === 'integer') return Number.isInteger(v);
    if (/^(numeric|real)/.test(tipo)) return typeof v === 'number' && Number.isFinite(v);
    if (tipo === 'date') return typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) && !isNaN(Date.parse(v));
    if (tipo === 'timestamptz' || tipo === 'datetime') return typeof v === 'string' && v.length <= 40 && !isNaN(Date.parse(v));
    if (tipo === 'time') return typeof v === 'string' && (v === '' || /^\d{2}:\d{2}$/.test(v));
    const largo = /^(?:char|varchar)\((\d+)\)$/.exec(tipo);
    if (largo) return typeof v === 'string' && v.length <= Number(largo[1]);
    return typeof v === 'string';   // text
  },

  /* Un renglón contra su tabla. Devuelve { ok, motivo } o { ok: true, limpio } con sólo los campos
     declarados (los que falten y admitan nulo quedan en null). */
  registro(tabla, obj) {
    const campos = SRP.ESQUEMA.tablas[tabla];
    if (!campos) return { ok: false, motivo: 'tabla desconocida' };
    if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return { ok: false, motivo: 'no es un renglón' };
    const limpio = {};
    for (const [campo, tipo, nulo, dominio] of campos) {
      const v = obj[campo];
      if (v === undefined || v === null) {
        if (!nulo) return { ok: false, motivo: 'le falta «' + campo + '»' };
        limpio[campo] = null;
        continue;
      }
      if (!this.tipoValido(tipo, v)) return { ok: false, motivo: '«' + campo + '» no tiene el formato esperado' };
      if (dominio && !SRP.ESQUEMA.dominios[dominio].includes(v)) return { ok: false, motivo: '«' + campo + '» trae un valor que no existe' };
      limpio[campo] = v;
    }
    return { ok: true, limpio };
  },

  // Cómo se nombra, para quien lee el resumen, cada campo que apunta a otra tabla
  REFERENCIAS: { especie_id: 'la especie', programa_id: 'el programa', jornada_id: 'la jornada', cabo_id: 'la cuenta del cabo',
    encargado_id: 'la cuenta del encargado', creado_por_id: 'la cuenta que la creó', editado_por_id: 'la cuenta que lo editó' },

  // «la especie no existe…», «la especie y el programa no existen…»
  textoReferencias(rotas) {
    const n = rotas.map(c => this.REFERENCIAS[c] || '«' + c + '»');
    return (n.length > 1 ? n.slice(0, -1).join(', ') + ' y ' + n[n.length - 1] : n[0]) + (n.length > 1 ? ' no existen' : ' no existe') + ' en este teléfono';
  },

  // Las referencias de un renglón que no existen: en el teléfono (existentes) o en lo que llega (nuevos)
  referenciasRotas(tabla, obj, existentes) {
    const rotas = [];
    for (const [campo, , , , ref] of SRP.ESQUEMA.tablas[tabla]) {
      const v = obj[campo];
      if (!ref || v === null || v === undefined || Array.isArray(v)) continue;
      if (!existentes[ref] || !existentes[ref].has(v)) rotas.push(campo);
    }
    return rotas;
  },

  // Reglas que el esquema no expresa como tipo: el punto en el ámbito y la foto como imagen
  reglasExtra(tabla, obj) {
    if (obj.es_ficticio !== SRP.CONFIG.ES_FICTICIO) return SRP.CONFIG.ES_FICTICIO ? 'es un registro real y este sistema es de prueba' : 'es un registro de prueba';
    if (tabla !== 'plantaciones') return null;
    if (!SRP.derivacion.dentroDelAmbito(obj.lat, obj.lng)) return 'el punto cae fuera de la Ciudad de México';
    if (obj.foto_base64 && !SRP.util.fotoSegura(obj.foto_base64)) return 'la fotografía no es una imagen válida';
    return null;
  }
};
