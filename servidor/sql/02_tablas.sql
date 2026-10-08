-- TABLAS DEL SRP. Generado por herramientas/generar_sql.py a partir de datos/esquema.json
-- (versión del esquema 2026-10-04): no se edita a mano. Lo corre la cuenta propietaria, dentro del
-- esquema srp, después de 01_esquema.sql.

SET ROLE srp_propietario;

CREATE TABLE srp.plantaciones (
  id                         uuid           NOT NULL,
  estatus                    text           NOT NULL,
  cabo_id                    uuid           NOT NULL,
  lat                        numeric(9,6)   NOT NULL,
  lng                        numeric(9,6)   NOT NULL,
  punto_origen               text           NOT NULL,
  gps_precision_m            integer        NULL,
  folio                      char(13)       NULL,
  especie_id                 text           NULL,
  especie_otra               text           NOT NULL,
  alcaldia_cve               char(5)        NULL,
  alcaldia                   text           NULL,
  colonia_cve                text           NULL,
  colonia                    text           NULL,
  uga                        char(7)        NULL,
  uga_borde_m                integer        NULL,
  capa_version               text           NULL,
  programa_id                text           NOT NULL,
  fecha_plantacion           date           NOT NULL,
  jornada_id                 uuid           NOT NULL,
  sustituye_id               uuid           NULL,
  motivo_sustitucion         text           NULL,
  motivo_sustitucion_otro    varchar(120)   NOT NULL,
  sustituido_por_id          uuid           NULL,
  comentarios                varchar(500)   NOT NULL,
  foto_base64                text           NULL,
  foto_id                    uuid           NULL,
  fecha_registro             timestamptz    NOT NULL,
  fecha_ultima_edicion       timestamptz    NULL,
  editado_por_id             uuid           NULL,
  CONSTRAINT plantaciones_pk PRIMARY KEY (id),
  CONSTRAINT plantaciones_estatus_valido CHECK (estatus IN ('activo', 'eliminado', 'sustituido')),
  CONSTRAINT plantaciones_punto_origen_valido CHECK (punto_origen IN ('gps', 'mapa', 'manual', 'ajustado')),
  CONSTRAINT plantaciones_motivo_sustitucion_valido CHECK (motivo_sustitucion IN ('VANDALISMO', 'IMPACTO_VEHICULAR', 'ROBO', 'MUERTE', 'OTRO')),
  CONSTRAINT plantaciones_folio_unico UNIQUE (folio),
  CONSTRAINT plantaciones_folio_patron CHECK (folio ~ '^[A-Z]{3}-\d{3}-\d{5}$'),
  CONSTRAINT plantaciones_especie_id_patron CHECK (especie_id ~ '^ESP-\d{4}$'),
  CONSTRAINT plantaciones_especie_o_escrita CHECK (especie_id IS NOT NULL OR especie_otra <> ''),
  CONSTRAINT plantaciones_motivo_otro CHECK (motivo_sustitucion IS DISTINCT FROM 'OTRO' OR motivo_sustitucion_otro <> ''),
  CONSTRAINT plantaciones_gps_precision CHECK (gps_precision_m IS NULL OR gps_precision_m >= 0),
  CONSTRAINT plantaciones_uga_borde CHECK (uga_borde_m IS NULL OR uga_borde_m >= 0)
);
CREATE INDEX plantaciones_estatus ON srp.plantaciones (estatus);
CREATE INDEX plantaciones_jornada_id ON srp.plantaciones (jornada_id);

CREATE TABLE srp.usuarios (
  id                         uuid           NOT NULL,
  correo                     text           NOT NULL,
  nombre_completo            text           NOT NULL,
  organizacion_id            text           NOT NULL,
  area_id                    text           NULL,
  cargo_rol                  text           NOT NULL,
  perfil                     text           NOT NULL,
  coordinadores_ids          uuid[]         NOT NULL,
  activo                     boolean        NOT NULL,
  fecha_creacion             timestamptz    NOT NULL,
  creado_por_id              uuid           NOT NULL,
  fecha_ultima_edicion       timestamptz    NULL,
  editado_por_id             uuid           NULL,
  CONSTRAINT usuarios_pk PRIMARY KEY (id),
  CONSTRAINT usuarios_correo_unico UNIQUE (correo),
  CONSTRAINT usuarios_perfil_valido CHECK (perfil IN ('CABO', 'COORDINADOR', 'DIRECTIVO', 'ADMIN')),
  CONSTRAINT usuarios_correo_minusculas CHECK (correo = lower(correo) AND correo LIKE '%_@_%')
);

CREATE TABLE srp.programas (
  id                         text           NOT NULL,
  clave                      text           NOT NULL,
  nombre                     text           NOT NULL,
  activo                     boolean        NOT NULL,
  creado_por_id              uuid           NULL,
  fecha_creacion             timestamptz    NOT NULL,
  editado_por_id             uuid           NULL,
  fecha_ultima_edicion       timestamptz    NULL,
  tipos_organizacion         varchar(30)[]  NOT NULL,
  CONSTRAINT programas_pk PRIMARY KEY (id),
  CONSTRAINT programas_clave_unico UNIQUE (clave),
  CONSTRAINT programas_nombre_unico UNIQUE (nombre),
  CONSTRAINT programas_tipos_organizacion_validos CHECK (tipos_organizacion <@ ARRAY['Alcaldía', 'Gobierno de la CDMX', 'Empresa privada', 'Organización civil']::varchar(30)[])
);

CREATE TABLE srp.areas (
  id                         text           NOT NULL,
  clave                      text           NOT NULL,
  nombre                     text           NOT NULL,
  activo                     boolean        NOT NULL,
  creado_por_id              uuid           NULL,
  fecha_creacion             timestamptz    NOT NULL,
  editado_por_id             uuid           NULL,
  fecha_ultima_edicion       timestamptz    NULL,
  CONSTRAINT areas_pk PRIMARY KEY (id),
  CONSTRAINT areas_clave_unico UNIQUE (clave),
  CONSTRAINT areas_nombre_unico UNIQUE (nombre)
);

CREATE TABLE srp.especies (
  id                         text           NOT NULL,
  clave                      text           NOT NULL,
  nombre                     text           NOT NULL,
  activo                     boolean        NOT NULL,
  creado_por_id              uuid           NULL,
  fecha_creacion             timestamptz    NOT NULL,
  editado_por_id             uuid           NULL,
  fecha_ultima_edicion       timestamptz    NULL,
  nombre_cientifico          varchar(140)   NOT NULL,
  otros_nombres_comunes      varchar(400)   NOT NULL,
  tipo_distribucion          text           NOT NULL,
  formadecrecimiento         varchar(100)   NOT NULL,
  paleta_vegetal             text           NOT NULL,
  fruto_comestible           text           NOT NULL,
  id_snib                    varchar(16)    NULL,
  id_enciclovida             integer        NULL,
  CONSTRAINT especies_pk PRIMARY KEY (id),
  CONSTRAINT especies_nombre_unico UNIQUE (nombre),
  CONSTRAINT especies_nombre_cientifico_unico UNIQUE (nombre_cientifico),
  CONSTRAINT especies_tipo_distribucion_valido CHECK (tipo_distribucion IN ('Nativa', 'Endémica', 'Exótica', 'Exótica-Invasora')),
  CONSTRAINT especies_paleta_vegetal_valido CHECK (paleta_vegetal IN ('Sí', 'No')),
  CONSTRAINT especies_fruto_comestible_valido CHECK (fruto_comestible IN ('Sí', 'No', 'Por determinar')),
  CONSTRAINT especies_id_patron CHECK (id ~ '^ESP-\d{4}$' AND clave = id)
);

CREATE TABLE srp.vehiculos (
  id                         text           NOT NULL,
  clave                      text           NOT NULL,
  nombre                     text           NOT NULL,
  activo                     boolean        NOT NULL,
  creado_por_id              uuid           NULL,
  fecha_creacion             timestamptz    NOT NULL,
  editado_por_id             uuid           NULL,
  fecha_ultima_edicion       timestamptz    NULL,
  modelo                     varchar(40)    NOT NULL,
  tipo_vehiculo              varchar(30)    NOT NULL,
  CONSTRAINT vehiculos_pk PRIMARY KEY (id),
  CONSTRAINT vehiculos_clave_unico UNIQUE (clave),
  CONSTRAINT vehiculos_nombre_unico UNIQUE (nombre)
);

CREATE TABLE srp.instituciones (
  id                         text           NOT NULL,
  clave                      text           NOT NULL,
  nombre                     text           NOT NULL,
  activo                     boolean        NOT NULL,
  creado_por_id              uuid           NULL,
  fecha_creacion             timestamptz    NOT NULL,
  editado_por_id             uuid           NULL,
  fecha_ultima_edicion       timestamptz    NULL,
  tipo_organizacion          varchar(30)    NOT NULL,
  CONSTRAINT instituciones_pk PRIMARY KEY (id),
  CONSTRAINT instituciones_clave_unico UNIQUE (clave),
  CONSTRAINT instituciones_nombre_unico UNIQUE (nombre),
  CONSTRAINT instituciones_tipo_organizacion_valido CHECK (tipo_organizacion IN ('Alcaldía', 'Gobierno de la CDMX', 'Empresa privada', 'Organización civil'))
);

CREATE TABLE srp.solicitantes (
  id                         text           NOT NULL,
  clave                      text           NOT NULL,
  nombre                     text           NOT NULL,
  activo                     boolean        NOT NULL,
  creado_por_id              uuid           NULL,
  fecha_creacion             timestamptz    NOT NULL,
  editado_por_id             uuid           NULL,
  fecha_ultima_edicion       timestamptz    NULL,
  tipo_solicitante           varchar(30)    NOT NULL,
  CONSTRAINT solicitantes_pk PRIMARY KEY (id),
  CONSTRAINT solicitantes_clave_unico UNIQUE (clave),
  CONSTRAINT solicitantes_nombre_unico UNIQUE (nombre),
  CONSTRAINT solicitantes_tipo_solicitante_valido CHECK (tipo_solicitante IN ('Dependencia de gobierno', 'Alcaldía', 'Congreso', 'Empresa', 'Organización civil', 'Escuela', 'Vecinos'))
);

CREATE TABLE srp.bitacora (
  id                         uuid           NOT NULL,
  fecha                      timestamptz    NOT NULL,
  usuario_id                 uuid           NOT NULL,
  usuario_nombre             text           NOT NULL,
  perfil                     text           NOT NULL,
  accion                     text           NOT NULL,
  entidad                    text           NOT NULL,
  entidad_id                 text           NOT NULL,
  detalle                    text           NOT NULL,
  CONSTRAINT bitacora_pk PRIMARY KEY (id),
  CONSTRAINT bitacora_perfil_valido CHECK (perfil IN ('CABO', 'COORDINADOR', 'DIRECTIVO', 'ADMIN')),
  CONSTRAINT bitacora_accion_valido CHECK (accion IN ('CREADO', 'EDITADO', 'ELIMINADO', 'RESTAURADO', 'SUSTITUIDO', 'RELEVO', 'ACTIVADO', 'DESACTIVADO', 'FOLIO_ASIGNADO')),
  CONSTRAINT bitacora_entidad_valido CHECK (entidad IN ('plantacion', 'usuario', 'catalogo', 'jornada', 'carga'))
);
CREATE INDEX bitacora_entidad_id ON srp.bitacora (entidad_id);

CREATE TABLE srp.jornadas (
  id                         uuid           NOT NULL,
  nombre                     text           NOT NULL,
  ubicacion                  text           NOT NULL,
  programa_id                text           NOT NULL,
  lat                        numeric(9,6)   NULL,
  lng                        numeric(9,6)   NULL,
  punto_origen               text           NULL,
  gps_precision_m            integer        NULL,
  alcaldia_cve               text           NULL,
  alcaldia                   text           NULL,
  colonia_cve                text           NULL,
  colonia                    text           NULL,
  fecha                      date           NOT NULL,
  comentarios                text           NOT NULL,
  cabo_id                    uuid           NOT NULL,
  organizacion_id            text           NOT NULL,
  estatus                    text           NOT NULL,
  fecha_inicio               timestamptz    NOT NULL,
  fecha_cierre               timestamptz    NULL,
  encargado_id               uuid           NULL,
  relevo_id                  uuid           NULL,
  relevos                    jsonb          NOT NULL,
  solicitante_id             text           NULL,
  solicitante_otro           text           NOT NULL,
  solicitud_descripcion      text           NOT NULL,
  editado_por_id             uuid           NULL,
  fecha_ultima_edicion       timestamptz    NULL,
  arboles_previstos          integer        NOT NULL,
  puntos_revisados           uuid[]         NOT NULL,
  reporte_en                 timestamptz    NULL,
  carga_id                   uuid           NULL,
  personal                   text           NOT NULL,
  apoyo                      text           NOT NULL,
  observaciones              text           NOT NULL,
  chofer                     text           NOT NULL,
  vehiculo_modelo            text           NOT NULL,
  vehiculo_placa             text           NOT NULL,
  vehiculo_tipo              text           NOT NULL,
  vehiculo_id                text           NULL,
  hora                       varchar(5)     NOT NULL,
  CONSTRAINT jornadas_pk PRIMARY KEY (id),
  CONSTRAINT jornadas_estatus_valido CHECK (estatus IN ('abierta', 'cerrada')),
  CONSTRAINT jornadas_arboles_previstos_rango CHECK (arboles_previstos BETWEEN 1 AND 9999),
  CONSTRAINT jornadas_hora_formato CHECK (hora = '' OR hora ~ '^([01]\d|2[0-3]):[0-5]\d$'),
  CONSTRAINT jornadas_relevos_lista CHECK (jsonb_typeof(relevos) = 'array')
);
CREATE INDEX jornadas_cabo_id ON srp.jornadas (cabo_id);

-- Llaves foráneas, cuando ya existen todas las tablas. Lo que está en uso no se elimina (se
-- desactiva), así que ninguna borra en cascada.
ALTER TABLE srp.plantaciones ADD CONSTRAINT plantaciones_cabo_id_fk FOREIGN KEY (cabo_id) REFERENCES srp.usuarios (id) DEFERRABLE INITIALLY IMMEDIATE;
ALTER TABLE srp.plantaciones ADD CONSTRAINT plantaciones_especie_id_fk FOREIGN KEY (especie_id) REFERENCES srp.especies (id) DEFERRABLE INITIALLY IMMEDIATE;
ALTER TABLE srp.plantaciones ADD CONSTRAINT plantaciones_programa_id_fk FOREIGN KEY (programa_id) REFERENCES srp.programas (id) DEFERRABLE INITIALLY IMMEDIATE;
ALTER TABLE srp.plantaciones ADD CONSTRAINT plantaciones_jornada_id_fk FOREIGN KEY (jornada_id) REFERENCES srp.jornadas (id) DEFERRABLE INITIALLY IMMEDIATE;
ALTER TABLE srp.plantaciones ADD CONSTRAINT plantaciones_sustituye_id_fk FOREIGN KEY (sustituye_id) REFERENCES srp.plantaciones (id) DEFERRABLE INITIALLY IMMEDIATE;
ALTER TABLE srp.plantaciones ADD CONSTRAINT plantaciones_sustituido_por_id_fk FOREIGN KEY (sustituido_por_id) REFERENCES srp.plantaciones (id) DEFERRABLE INITIALLY IMMEDIATE;
ALTER TABLE srp.plantaciones ADD CONSTRAINT plantaciones_editado_por_id_fk FOREIGN KEY (editado_por_id) REFERENCES srp.usuarios (id) DEFERRABLE INITIALLY IMMEDIATE;
ALTER TABLE srp.usuarios ADD CONSTRAINT usuarios_organizacion_id_fk FOREIGN KEY (organizacion_id) REFERENCES srp.instituciones (id) DEFERRABLE INITIALLY IMMEDIATE;
ALTER TABLE srp.usuarios ADD CONSTRAINT usuarios_area_id_fk FOREIGN KEY (area_id) REFERENCES srp.areas (id) DEFERRABLE INITIALLY IMMEDIATE;
ALTER TABLE srp.usuarios ADD CONSTRAINT usuarios_creado_por_id_fk FOREIGN KEY (creado_por_id) REFERENCES srp.usuarios (id) DEFERRABLE INITIALLY IMMEDIATE;
ALTER TABLE srp.usuarios ADD CONSTRAINT usuarios_editado_por_id_fk FOREIGN KEY (editado_por_id) REFERENCES srp.usuarios (id) DEFERRABLE INITIALLY IMMEDIATE;
ALTER TABLE srp.programas ADD CONSTRAINT programas_creado_por_id_fk FOREIGN KEY (creado_por_id) REFERENCES srp.usuarios (id) DEFERRABLE INITIALLY IMMEDIATE;
ALTER TABLE srp.programas ADD CONSTRAINT programas_editado_por_id_fk FOREIGN KEY (editado_por_id) REFERENCES srp.usuarios (id) DEFERRABLE INITIALLY IMMEDIATE;
ALTER TABLE srp.areas ADD CONSTRAINT areas_creado_por_id_fk FOREIGN KEY (creado_por_id) REFERENCES srp.usuarios (id) DEFERRABLE INITIALLY IMMEDIATE;
ALTER TABLE srp.areas ADD CONSTRAINT areas_editado_por_id_fk FOREIGN KEY (editado_por_id) REFERENCES srp.usuarios (id) DEFERRABLE INITIALLY IMMEDIATE;
ALTER TABLE srp.especies ADD CONSTRAINT especies_creado_por_id_fk FOREIGN KEY (creado_por_id) REFERENCES srp.usuarios (id) DEFERRABLE INITIALLY IMMEDIATE;
ALTER TABLE srp.especies ADD CONSTRAINT especies_editado_por_id_fk FOREIGN KEY (editado_por_id) REFERENCES srp.usuarios (id) DEFERRABLE INITIALLY IMMEDIATE;
ALTER TABLE srp.vehiculos ADD CONSTRAINT vehiculos_creado_por_id_fk FOREIGN KEY (creado_por_id) REFERENCES srp.usuarios (id) DEFERRABLE INITIALLY IMMEDIATE;
ALTER TABLE srp.vehiculos ADD CONSTRAINT vehiculos_editado_por_id_fk FOREIGN KEY (editado_por_id) REFERENCES srp.usuarios (id) DEFERRABLE INITIALLY IMMEDIATE;
ALTER TABLE srp.instituciones ADD CONSTRAINT instituciones_creado_por_id_fk FOREIGN KEY (creado_por_id) REFERENCES srp.usuarios (id) DEFERRABLE INITIALLY IMMEDIATE;
ALTER TABLE srp.instituciones ADD CONSTRAINT instituciones_editado_por_id_fk FOREIGN KEY (editado_por_id) REFERENCES srp.usuarios (id) DEFERRABLE INITIALLY IMMEDIATE;
ALTER TABLE srp.solicitantes ADD CONSTRAINT solicitantes_creado_por_id_fk FOREIGN KEY (creado_por_id) REFERENCES srp.usuarios (id) DEFERRABLE INITIALLY IMMEDIATE;
ALTER TABLE srp.solicitantes ADD CONSTRAINT solicitantes_editado_por_id_fk FOREIGN KEY (editado_por_id) REFERENCES srp.usuarios (id) DEFERRABLE INITIALLY IMMEDIATE;
ALTER TABLE srp.jornadas ADD CONSTRAINT jornadas_programa_id_fk FOREIGN KEY (programa_id) REFERENCES srp.programas (id) DEFERRABLE INITIALLY IMMEDIATE;
ALTER TABLE srp.jornadas ADD CONSTRAINT jornadas_cabo_id_fk FOREIGN KEY (cabo_id) REFERENCES srp.usuarios (id) DEFERRABLE INITIALLY IMMEDIATE;
ALTER TABLE srp.jornadas ADD CONSTRAINT jornadas_organizacion_id_fk FOREIGN KEY (organizacion_id) REFERENCES srp.instituciones (id) DEFERRABLE INITIALLY IMMEDIATE;
ALTER TABLE srp.jornadas ADD CONSTRAINT jornadas_encargado_id_fk FOREIGN KEY (encargado_id) REFERENCES srp.usuarios (id) DEFERRABLE INITIALLY IMMEDIATE;
ALTER TABLE srp.jornadas ADD CONSTRAINT jornadas_relevo_id_fk FOREIGN KEY (relevo_id) REFERENCES srp.usuarios (id) DEFERRABLE INITIALLY IMMEDIATE;
ALTER TABLE srp.jornadas ADD CONSTRAINT jornadas_solicitante_id_fk FOREIGN KEY (solicitante_id) REFERENCES srp.solicitantes (id) DEFERRABLE INITIALLY IMMEDIATE;
ALTER TABLE srp.jornadas ADD CONSTRAINT jornadas_editado_por_id_fk FOREIGN KEY (editado_por_id) REFERENCES srp.usuarios (id) DEFERRABLE INITIALLY IMMEDIATE;
ALTER TABLE srp.jornadas ADD CONSTRAINT jornadas_vehiculo_id_fk FOREIGN KEY (vehiculo_id) REFERENCES srp.vehiculos (id) DEFERRABLE INITIALLY IMMEDIATE;

-- Para quien administre la base: qué es cada tabla y cada campo, tomado del diccionario de datos
COMMENT ON TABLE srp.plantaciones IS 'Un renglón por ejemplar plantado. Es el registro individual de campo; todo lo demás (partes, tableros, cifra pública) se construye encima (D38).';
COMMENT ON COLUMN srp.plantaciones.id IS 'UUID v4; Se fija al abrir la ficha de revisión y es el que se guarda (idPrevisto); no cambia al editar. En Fase 2 es la clave de idempotencia del envío (R4)';
COMMENT ON COLUMN srp.plantaciones.estatus IS 'estatus_plantacion; Nace `activo`; «Eliminar» lo marca `eliminado`, nunca borra (D11, Norma 7.4). Un registro eliminado sigue contando en el uso de catálogos y cuentas. «Sustituir» lo marca `sustituido` al guardar su sustituto (D203): deja de contar como plantado y conserva su historial';
COMMENT ON COLUMN srp.plantaciones.cabo_id IS '→ usuarios.id; Quien captura. Al editar se conserva: el autor no cambia de manos aunque corrija un coordinador o la administración';
COMMENT ON COLUMN srp.plantaciones.lat IS 'Grados decimales WGS84, 6 decimales, dentro de CONFIG.MAPA.LIMITES; Del botón de ubicación, de tocar el mapa o de la captura a mano; se cambia moviendo el punto, no tecleando. Fuera del ámbito de la CDMX el punto se rechaza';
COMMENT ON COLUMN srp.plantaciones.lng IS 'Ídem; Ídem. Al guardar en GeoJSON el orden es [lng, lat]';
COMMENT ON COLUMN srp.plantaciones.punto_origen IS 'punto_origen; Lo determina la acción con la que se colocó el punto, no una elección. Es la prueba de cómo se obtuvo la coordenada cuando no hay fotografía';
COMMENT ON COLUMN srp.plantaciones.gps_precision_m IS 'Metros, entero; null salvo con GPS; Existe si y sólo si punto_origen = gps: al mover el punto a mano se borra. La auditoría lo comprueba. En Fase 2 alimenta la regla de duplicados (D69)';
COMMENT ON COLUMN srp.plantaciones.folio IS '`AAA-000-00000` (SRP.folio.PATRON): clave de la celda UGA y consecutivo de la celda; UNIQUE. AAA es el prefijo de la celda, no la alcaldía del árbol (difieren en el 4.3 % del territorio, D152); Con datos reales, nulo en toda la Fase 1: lo asigna el servidor una sola vez al sincronizar (R3), es inmutable (R7) y no lleva la especie ni el año (D67). El consecutivo sale de una secuencia perpetua por celda, nunca de MAX+1 (R5–R6). Con datos de prueba lo llena el servidor simulado (D110), marcado «(simulado)» en pantalla y en cada renglón del PDF; su secuencia vive en cada teléfono y dos teléfonos pueden repetir números. Sin alcaldía o con capas incompletas no se emite (D152)';
COMMENT ON COLUMN srp.plantaciones.especie_id IS '→ especies.id (id_especie ESP-0000); Obligatoria salvo con «Otra especie», donde queda nula. El registro guarda sólo la clave; género, epíteto, distribución, forma de crecimiento, id_snib e id_enciclovida se obtienen del catálogo (D84)';
COMMENT ON COLUMN srp.plantaciones.especie_otra IS 'Texto libre; '''' salvo con «Otra especie»; Obligatoria cuando especie_id es nula. Se vacía al elegir una especie del catálogo';
COMMENT ON COLUMN srp.plantaciones.alcaldia_cve IS 'alcaldia_cve; Derivada del punto contra la capa de alcaldías. Llave para unir con el esquema territorio del SIA. Nula si el punto cae en un hueco de la capa (se avisa, no se impide guardar)';
COMMENT ON COLUMN srp.plantaciones.alcaldia IS 'Nombre de la alcaldía según la capa; Copia del nombre para leerse sin cargar la capa. Se rederiva cada vez que el punto se mueve; se puede rederivar en lote si la capa cambia (capa_version). Un punto dentro del margen del límite toma la alcaldía más cercana (D152)';
COMMENT ON COLUMN srp.plantaciones.colonia_cve IS 'colonia_cve; Nula fuera de la zona urbana (suelo de conservación): no es defecto (D62). En solape gana la colonia más pequeña';
COMMENT ON COLUMN srp.plantaciones.colonia IS 'Nombre como viene en la capa, mayúsculas y tipo entre paréntesis; Capa definitiva (IECM 2022): las colonias del IECM son la unidad oficial de reporte';
COMMENT ON COLUMN srp.plantaciones.uga IS 'uga; Celda vigente del punto. Su prefijo es el de la celda y NO la alcaldía del punto (difieren en el 4.3 % del territorio); la alcaldía sale de su propia capa. Cambia si el punto se corrige; la celda con que se asignó el folio la congela el servidor (S-02)';
COMMENT ON COLUMN srp.plantaciones.uga_borde_m IS 'Metros enteros ≥ 0; nulo sin celda; Distancia del punto al borde de su celda UGA, al derivar (D152). Si es menor que gps_precision_m, la celda del folio podría ser la vecina: la pantalla lo dice y el servidor la confirma en la Fase 2';
COMMENT ON COLUMN srp.plantaciones.capa_version IS '`alcaldias=v;uga=v;colonias=v`; Con qué versión de cada capa se derivó; permite rehacer alcaldia/colonia/uga cuando el SIA entregue las capas definitivas';
COMMENT ON COLUMN srp.plantaciones.programa_id IS '→ programas.id; Es el de su jornada (D151): se toma al registrar, cambia cuando cambia el de la jornada —también en los eliminados, en la misma transacción— y al mover el árbol toma el de su jornada nueva';
COMMENT ON COLUMN srp.plantaciones.fecha_plantacion IS 'AAAA-MM-DD, ≤ hoy; El día en que se plantó el árbol, entre la fecha de su jornada y hoy. Arranca con la fecha de la jornada el día en que la jornada se inicia y con la de hoy los días siguientes; lo elegido se conserva para el árbol siguiente de la misma jornada. Un sustituto lleva la fecha de la sustitución, no anterior a la plantación del árbol perdido. Si cambia la fecha de la jornada, la toman los árboles del día de inicio (también los eliminados, en la misma transacción); al mover el árbol a otra jornada, la de la jornada nueva si era del día de inicio, y si no conserva la suya (nunca antes del inicio de la jornada nueva); al restaurarlo, la suya, salvo que la jornada empiece después';
COMMENT ON COLUMN srp.plantaciones.jornada_id IS '→ jornadas.id; La jornada activa al registrar (D119). Cambia sólo con «Mover a otra jornada» en Jornadas, que también ajusta fecha_plantacion y programa_id (D151)';
COMMENT ON COLUMN srp.plantaciones.sustituye_id IS '→ plantaciones.id; Sólo en el árbol que reemplaza a uno perdido (D203); nulo en los demás. Se registra en la jornada del árbol perdido';
COMMENT ON COLUMN srp.plantaciones.motivo_sustitucion IS 'motivo_sustitucion; Obligatorio en un sustituto; nulo en los demás (D203)';
COMMENT ON COLUMN srp.plantaciones.motivo_sustitucion_otro IS 'Texto libre ≤ 120; '''' salvo con motivo OTRO; Obligatorio cuando motivo_sustitucion es OTRO (D203)';
COMMENT ON COLUMN srp.plantaciones.sustituido_por_id IS '→ plantaciones.id; Sólo en el árbol perdido, junto con estatus `sustituido` (D203). Si se elimina el sustituto, vuelve a nulo y el árbol a `activo`';
COMMENT ON COLUMN srp.plantaciones.comentarios IS 'Texto libre ≤ 500; '''' si no se escribe; Reincorporado en D50. Entra al reporte PDF en «Comentarios por ejemplar», al final, sólo los árboles que lo tienen (D164). Registros anteriores a D50 no traen la llave y se leen como «Sin comentarios»';
COMMENT ON COLUMN srp.plantaciones.foto_base64 IS 'data:image/jpeg;base64,… ya comprimida (≤ 800×600, calidad 0.7); Incrustada en el registro en Fase 1. En Fase 2 sale a archivo, como en los otros módulos del SIA (pendiente «Dónde viven las fotografías»)';
COMMENT ON COLUMN srp.plantaciones.foto_id IS 'UUID v4; null sin foto; Identificador de la imagen, para cuando viva como archivo';
COMMENT ON COLUMN srp.plantaciones.fecha_registro IS 'ISO 8601 con zona (-06:00); Cuándo se guardó por primera vez. Distinta de fecha_plantacion';
COMMENT ON COLUMN srp.plantaciones.fecha_ultima_edicion IS 'ISO 8601; Nula hasta la primera edición; también se pone al eliminar';
COMMENT ON COLUMN srp.plantaciones.editado_por_id IS '→ usuarios.id; Quién hizo la última edición (o la eliminación)';
COMMENT ON TABLE srp.usuarios IS 'Cuentas del sistema. Una por persona; el perfil decide qué puede hacer (js/permisos.js, fuente única).';
COMMENT ON COLUMN srp.usuarios.id IS 'UUID v4 (las de arranque: u-admin-1, u-coord-1, u-cabo-1)';
COMMENT ON COLUMN srp.usuarios.correo IS 'Correo válido, en minúsculas, único; Identifica la cuenta y sirve para entrar; no se puede cambiar después. No tiene que ser institucional';
COMMENT ON COLUMN srp.usuarios.nombre_completo IS 'Texto, hasta 160: nombre y al menos un apellido; Un solo campo. Sustituye a nombre, apellido_paterno y apellido_materno: al abrir, las cuentas que los tenían se unen aquí (js/almacen.js normalizar)';
COMMENT ON COLUMN srp.usuarios.organizacion_id IS '→ instituciones.id; La institución de la cuenta. En el alta se elige primero el tipo (Alcaldía, Gobierno de la CDMX, Empresa privada, Organización civil) y luego la institución de la lista; las que falten las agrega la Administración en Catálogos › Instituciones, a solicitud. Sólo SEDEMA (o-sedema) tiene área y ADMIN; las cuentas de fuera son CABO o COORDINADOR, y el cabo depende de un coordinador de su misma institución (D192). Al abrir, las cuentas sin institución quedan en SEDEMA';
COMMENT ON COLUMN srp.usuarios.area_id IS '→ areas.id (DGSANPAVA, Oficina de la Secretaría, Sistema de Información Ambiental, DGEIRA); Obligatoria en cuentas de SEDEMA; nula en las de otras organizaciones';
COMMENT ON COLUMN srp.usuarios.cargo_rol IS 'Texto libre; Descriptivo; no gobierna permisos';
COMMENT ON COLUMN srp.usuarios.perfil IS 'perfil; Decide alcance y acciones. Una cuenta de administración no puede quitarse a sí misma el perfil ADMIN. Un perfil desconocido queda sin permisos y se avisa (D87). ADMIN sólo en SEDEMA; fuera, CABO, COORDINADOR o DIRECTIVO (D192, D224)';
COMMENT ON COLUMN srp.usuarios.coordinadores_ids IS '→ usuarios.id con perfil COORDINADOR; [] si no tiene; Sólo en cabos; puede tener más de uno, todos de su misma institución; [] en los demás perfiles. Es lo que define la cuadrilla: cada coordinador ve y edita los registros de los cabos que lo tienen asignado, nunca los de otra institución';
COMMENT ON COLUMN srp.usuarios.activo IS 'true/false; Inactiva no puede entrar; sus registros se conservan a su nombre. Con registros a su nombre no se elimina, se desactiva';
COMMENT ON COLUMN srp.usuarios.fecha_creacion IS 'ISO 8601; Cuándo se dio de alta la cuenta; mismo nombre que en catálogos';
COMMENT ON COLUMN srp.usuarios.creado_por_id IS '→ usuarios.id; Quién dio de alta la cuenta; mismo nombre que en catálogos';
COMMENT ON COLUMN srp.usuarios.fecha_ultima_edicion IS 'ISO 8601';
COMMENT ON COLUMN srp.usuarios.editado_por_id IS '→ usuarios.id';
COMMENT ON TABLE srp.programas IS 'Los programas de plantación. La jornada elige uno y sus árboles lo toman (D151). Cada programa dice qué tipos de institución, además de la Secretaría, pueden usarlo (D193).';
COMMENT ON COLUMN srp.programas.id IS 'UUID v4; los de arranque: p-refor, p-centro, p-palmeras, p-compensaciones; Es lo que guardan plantaciones.programa_id y jornadas.programa_id';
COMMENT ON COLUMN srp.programas.clave IS '`[A-Z0-9_]{2,30}`, única; Se sugiere del nombre, editable antes de guardar, fija después';
COMMENT ON COLUMN srp.programas.nombre IS 'Texto, único';
COMMENT ON COLUMN srp.programas.activo IS 'true/false; Inactivo deja de ofrecerse; los registros que ya lo usan no cambian. Con uso no se elimina (D08)';
COMMENT ON COLUMN srp.programas.creado_por_id IS '→ usuarios.id';
COMMENT ON COLUMN srp.programas.fecha_creacion IS 'ISO 8601';
COMMENT ON COLUMN srp.programas.editado_por_id IS '→ usuarios.id';
COMMENT ON COLUMN srp.programas.fecha_ultima_edicion IS 'ISO 8601';
COMMENT ON COLUMN srp.programas.tipos_organizacion IS 'Lista de tipo_organizacion; [] = sólo SEDEMA; Los tipos de institución que, además de SEDEMA, pueden elegir el programa al iniciar o editar una jornada; SEDEMA puede usar todos. Lo marca la Administración (D193). Un programa nuevo empieza vacío. De arranque: Reforestación Urbana, Alcaldía, Gobierno de la CDMX y Organización civil; Palmeras, Empresa privada; Centro Histórico y Compensaciones, vacío. Al abrir, un programa sin el dato recibe el de arranque o, si lo agregó la Administración, vacío';
COMMENT ON TABLE srp.areas IS 'Las áreas de la Secretaría a las que pertenece una cuenta. Las cuentas de otras instituciones no llevan área.';
COMMENT ON COLUMN srp.areas.id IS 'UUID v4; las de arranque: a-dgsanpava, a-oficina, a-sia, a-dgeira; Es lo que guarda usuarios.area_id';
COMMENT ON COLUMN srp.areas.clave IS '`[A-Z0-9_]{2,30}`, única; Se sugiere del nombre, editable antes de guardar, fija después';
COMMENT ON COLUMN srp.areas.nombre IS 'Texto, único';
COMMENT ON COLUMN srp.areas.activo IS 'true/false; Inactivo deja de ofrecerse; los registros que ya lo usan no cambian. Con uso no se elimina (D08)';
COMMENT ON COLUMN srp.areas.creado_por_id IS '→ usuarios.id';
COMMENT ON COLUMN srp.areas.fecha_creacion IS 'ISO 8601';
COMMENT ON COLUMN srp.areas.editado_por_id IS '→ usuarios.id';
COMMENT ON COLUMN srp.areas.fecha_ultima_edicion IS 'ISO 8601';
COMMENT ON TABLE srp.especies IS 'El catálogo de especies: el real del SIA (D84), 79 de arranque, más las que agregue la Administración. Lleva los datos taxonómicos, si pertenece a la paleta vegetal de la Secretaría, si su fruto es comestible y las llaves externas al SNIB y a EncicloVida.';
COMMENT ON COLUMN srp.especies.id IS 'id_especie; Es la propia clave ESP-0000. Es lo que guarda plantaciones.especie_id';
COMMENT ON COLUMN srp.especies.clave IS 'id_especie; Consecutivo ESP-0000 que asigna el sistema; nunca se escribe ni se reutiliza';
COMMENT ON COLUMN srp.especies.nombre IS 'Texto, único; Es el nombre_comun del catálogo del SIA: la etiqueta de campo';
COMMENT ON COLUMN srp.especies.activo IS 'true/false; Inactivo deja de ofrecerse; los registros que ya lo usan no cambian. Con uso no se elimina (D08)';
COMMENT ON COLUMN srp.especies.creado_por_id IS '→ usuarios.id; null en las especies del SIA';
COMMENT ON COLUMN srp.especies.fecha_creacion IS 'ISO 8601; en las especies del SIA, la fecha de corte';
COMMENT ON COLUMN srp.especies.editado_por_id IS '→ usuarios.id';
COMMENT ON COLUMN srp.especies.fecha_ultima_edicion IS 'ISO 8601';
COMMENT ON COLUMN srp.especies.nombre_cientifico IS 'Género + epíteto, sin autoría ni subgénero; único; Validado: inicial mayúscula y al menos dos palabras';
COMMENT ON COLUMN srp.especies.otros_nombres_comunes IS 'Nombres separados por coma y espacio; '''' si no hay; Un mismo nombre puede señalar a varias especies: la búsqueda las ofrece todas, nunca resuelve sola';
COMMENT ON COLUMN srp.especies.tipo_distribucion IS 'tipo_distribucion; Campo del SNIB; sustituye a Nativa/Introducida';
COMMENT ON COLUMN srp.especies.formadecrecimiento IS 'Árbol · Arbusto · Palma · Liana · Hierba · Sufrútice, varios separados por coma y espacio; '''' si no hay; Literal de la ficha técnica';
COMMENT ON COLUMN srp.especies.paleta_vegetal IS 'paleta_vegetal; Obligatorio al dar de alta. Sí en las 76 del catálogo original; No en las que se dieron de alta fuera de la paleta. Estar fuera no impide registrar árboles';
COMMENT ON COLUMN srp.especies.fruto_comestible IS 'fruto_comestible; Obligatorio al dar de alta: Sí, No o Por determinar, sin valor por omisión. Captura manual del área técnica; no sale de CONABIO';
COMMENT ON COLUMN srp.especies.id_snib IS 'Número + ANGIO o GIMNO (IdCAT); Llave externa al Catálogo Taxonómico de la Biota; puede venir vacía (Quercus rubra)';
COMMENT ON COLUMN srp.especies.id_enciclovida IS 'Entero; Llave para reconsultar la ficha (enciclovida.mx/especies/{id}.json); más completa que el IdCAT';
COMMENT ON TABLE srp.vehiculos IS 'Los vehículos de las cuadrillas (D162). Se eligen en el cierre de la jornada, que copia placa, modelo y tipo. En la versión de prueba llevan placas ficticias; los reales se cargan en el servidor.';
COMMENT ON COLUMN srp.vehiculos.id IS '«v-» más la placa sin espacios en los de arranque; UUID v4 en los que se agreguen; Es lo que guarda jornadas.vehiculo_id';
COMMENT ON COLUMN srp.vehiculos.clave IS 'La placa sin espacios ni guiones; única; Sale de la placa al darlo de alta y no se muestra; dos placas que sólo difieren en espacios son la misma (D162)';
COMMENT ON COLUMN srp.vehiculos.nombre IS 'Texto, único; Es la placa, en mayúsculas: «PRU 005» (D162). Se copia a jornadas.vehiculo_placa';
COMMENT ON COLUMN srp.vehiculos.activo IS 'true/false; Inactivo deja de ofrecerse; los registros que ya lo usan no cambian. Con uso no se elimina (D08)';
COMMENT ON COLUMN srp.vehiculos.creado_por_id IS '→ usuarios.id; null en los vehículos de arranque';
COMMENT ON COLUMN srp.vehiculos.fecha_creacion IS 'ISO 8601';
COMMENT ON COLUMN srp.vehiculos.editado_por_id IS '→ usuarios.id';
COMMENT ON COLUMN srp.vehiculos.fecha_ultima_edicion IS 'ISO 8601';
COMMENT ON COLUMN srp.vehiculos.modelo IS 'Texto, inicial mayúscula: «Dodge», «Internacional»; Obligatorio. Se copia a jornadas.vehiculo_modelo al elegir la placa en el cierre (D162)';
COMMENT ON COLUMN srp.vehiculos.tipo_vehiculo IS 'Texto, inicial mayúscula: Pipa · Pick up · Doble cabina · Estacas · Redilas · Grúa; se proponen los que ya hay; Obligatorio. Agrupa la lista de placas del cierre y se copia a jornadas.vehiculo_tipo (D162)';
COMMENT ON TABLE srp.instituciones IS 'Las instituciones que ejecutan plantaciones y tienen cuentas: la Secretaría, las 16 alcaldías, otras dependencias, empresas y organizaciones civiles (D186). De ellas depende el alcance de un directivo de fuera de la Secretaría (D224).';
COMMENT ON COLUMN srp.instituciones.id IS 'UUID v4; las de arranque: o-sedema, o-paot, o-sobse, o-green-cover, o-reforestamos, o-alc-09002…o-alc-09017; Es lo que guardan usuarios.organizacion_id y jornadas.organizacion_id';
COMMENT ON COLUMN srp.instituciones.clave IS '`[A-Z0-9_]{2,30}`, única; La pone el sistema a partir del nombre y no se muestra';
COMMENT ON COLUMN srp.instituciones.nombre IS 'Texto, único; Único entre todas; las alcaldías sin la palabra «Alcaldía» (la pone la pantalla)';
COMMENT ON COLUMN srp.instituciones.activo IS 'true/false; Inactivo deja de ofrecerse; los registros que ya lo usan no cambian. Con uso no se elimina (D08)';
COMMENT ON COLUMN srp.instituciones.creado_por_id IS '→ usuarios.id';
COMMENT ON COLUMN srp.instituciones.fecha_creacion IS 'ISO 8601';
COMMENT ON COLUMN srp.instituciones.editado_por_id IS '→ usuarios.id';
COMMENT ON COLUMN srp.instituciones.fecha_ultima_edicion IS 'ISO 8601';
COMMENT ON COLUMN srp.instituciones.tipo_organizacion IS 'tipo_organizacion; Obligatorio: se elige al agregarla en Catálogos (nunca Alcaldía: las 16 son fijas) y no cambia. Las alcaldías se guardan sin la palabra «Alcaldía» en el nombre';
COMMENT ON TABLE srp.solicitantes IS 'Quién solicita una jornada (D217, D229). No son quienes plantan ni tienen cuentas: por eso van aparte de las instituciones.';
COMMENT ON COLUMN srp.solicitantes.id IS 'UUID v4; los de arranque: s-alc-09002…s-alc-09017, s-oficina-secretaria, s-sobse, s-segiagua, s-jefatura, s-diputados; Es lo que guarda jornadas.solicitante_id';
COMMENT ON COLUMN srp.solicitantes.clave IS '`[A-Z0-9_]{2,30}`, única; La pone el sistema a partir del nombre y no se muestra';
COMMENT ON COLUMN srp.solicitantes.nombre IS 'Texto, único; Único entre todos; las alcaldías sin la palabra «Alcaldía»: su tipo las agrupa en la lista';
COMMENT ON COLUMN srp.solicitantes.activo IS 'true/false; Inactivo deja de ofrecerse; los registros que ya lo usan no cambian. Con uso no se elimina (D08)';
COMMENT ON COLUMN srp.solicitantes.creado_por_id IS '→ usuarios.id';
COMMENT ON COLUMN srp.solicitantes.fecha_creacion IS 'ISO 8601';
COMMENT ON COLUMN srp.solicitantes.editado_por_id IS '→ usuarios.id';
COMMENT ON COLUMN srp.solicitantes.fecha_ultima_edicion IS 'ISO 8601';
COMMENT ON COLUMN srp.solicitantes.tipo_solicitante IS 'tipo_solicitante; Obligatorio. Agrupa la lista «Quién lo solicita» y la tabla del catálogo. Se elige al agregarlo y se puede corregir después';
COMMENT ON TABLE srp.bitacora IS 'Quién, cuándo y qué, en cada alta, edición, eliminación, activación y desactivación (Norma 7.7, D10). Sólo se escribe; se lee en el historial del detalle de cada registro.';
COMMENT ON COLUMN srp.bitacora.id IS 'UUID v4';
COMMENT ON COLUMN srp.bitacora.fecha IS 'ISO 8601';
COMMENT ON COLUMN srp.bitacora.usuario_id IS '→ usuarios.id';
COMMENT ON COLUMN srp.bitacora.usuario_nombre IS 'Nombre completo; Copia a propósito: si la cuenta se elimina, el historial sigue diciendo quién actuó';
COMMENT ON COLUMN srp.bitacora.perfil IS 'perfil; Con qué perfil actuó en ese momento';
COMMENT ON COLUMN srp.bitacora.accion IS 'accion_bitacora';
COMMENT ON COLUMN srp.bitacora.entidad IS 'entidad_bitacora';
COMMENT ON COLUMN srp.bitacora.entidad_id IS 'id de la tabla correspondiente; Se escribe en la misma transacción que el dato (guardarConBitacora)';
COMMENT ON COLUMN srp.bitacora.detalle IS 'Texto; '''' si no aplica; En una edición, la lista de campos que cambiaron';
COMMENT ON TABLE srp.jornadas IS 'Una jornada de plantación: se declara antes de registrar el primer árbol (D119). Agrupa los registros, lleva la conciliación y la revisión, y guarda los datos de cierre del reporte (antes en la tabla cierres, retirada en el bloque 62).';
COMMENT ON COLUMN srp.jornadas.id IS 'UUID; Se fija al iniciar la jornada';
COMMENT ON COLUMN srp.jornadas.nombre IS 'Texto libre, hasta 120; Obligatorio al iniciar: el parque, la calle o el sitio. Es el nombre de la tarjeta en Jornadas y el «Jornada:» del reporte (D119)';
COMMENT ON COLUMN srp.jornadas.ubicacion IS 'Texto libre, hasta 200; '''' si no se escribe; Calle y número, entre calles o tramo (D165; antes dirección, parque o referencia, D120); la etiqueta pasó a «Dirección de la jornada» (D143). Va al reporte bajo el nombre de la jornada';
COMMENT ON COLUMN srp.jornadas.programa_id IS '→ programas.id; Obligatorio al iniciar (D130). Sus árboles lo toman siempre (D151): al registrar, al cambiarlo aquí y al moverlos a esta jornada. SEDEMA elige todos; las demás instituciones, los que tienen marcado su tipo en programas.tipos_organizacion (D193). Con un solo programa posible viene ya elegido. El programa «Solicitud» (id p-solicitud) marca la jornada que atiende una solicitud de otra instancia: con él se piden quién lo solicita y la descripción (D229). Es un valor del catálogo: la Administración puede renombrarlo o desactivarlo; el sistema lo reconoce por su id';
COMMENT ON COLUMN srp.jornadas.lat IS 'Grados decimales WGS84, 6 decimales; nulo sin ubicación; Latitud del punto de la jornada: detectado con el GPS al iniciar (D122) o escrito a mano cuando no hubo señal (D143). No es la de ningún árbol';
COMMENT ON COLUMN srp.jornadas.lng IS 'Grados decimales WGS84, 6 decimales; nulo sin ubicación; siempre negativa; Longitud del punto de la jornada (D122, D143)';
COMMENT ON COLUMN srp.jornadas.punto_origen IS '''gps'' o ''manual''; nulo sin ubicación; Cómo se obtuvo el punto de la jornada: con «Detectar ubicación» (gps) o escribiendo las coordenadas cuando no hubo señal en el sitio (manual) (D143). Lo determina la acción, no una elección';
COMMENT ON COLUMN srp.jornadas.gps_precision_m IS 'Metros enteros; nulo sin detección o con el punto escrito a mano; Margen del GPS al detectar (D122). Existe sólo si punto_origen es gps';
COMMENT ON COLUMN srp.jornadas.alcaldia_cve IS 'cvegeo INEGI (09012); nulo sin detección o en hueco; Derivada de la capa de alcaldías con el punto detectado (D122)';
COMMENT ON COLUMN srp.jornadas.alcaldia IS 'Nombre de la alcaldía; nulo sin detección; Va a la franja de la jornada, a Jornadas y al reporte (D122). No sustituye a la alcaldía de cada árbol';
COMMENT ON COLUMN srp.jornadas.colonia_cve IS 'CVEUT IECM; nulo sin detección o donde la capa no tiene colonia; Derivada de la capa de colonias con el punto detectado (D122)';
COMMENT ON COLUMN srp.jornadas.colonia IS 'Nombre de la colonia; nulo sin detección; Va a la franja, a Jornadas y al reporte (D122)';
COMMENT ON COLUMN srp.jornadas.fecha IS 'AAAA-MM-DD, no posterior a hoy; Día en que empieza la jornada. Sus árboles llevan cada uno su fecha de plantación, desde este día: una jornada puede durar varios días. Al cambiarla, la toman los árboles plantados el día de inicio; no puede quedar después de un árbol plantado otro día';
COMMENT ON COLUMN srp.jornadas.comentarios IS 'Texto libre, hasta 500; '''' si no se escribe; Van al reporte como «Comentarios de la jornada» (D119)';
COMMENT ON COLUMN srp.jornadas.cabo_id IS '→ usuarios.id; Titular: quien inició la jornada. No cambia con un relevo; cada árbol queda a nombre de quien lo capturó';
COMMENT ON COLUMN srp.jornadas.organizacion_id IS '→ instituciones.id; La institución que ejecuta la jornada: la de quien la inicia. Se fija al iniciar y no cambia aunque la cuenta cambie de organización. Al abrir, las jornadas sin organización quedan en SEDEMA (asignarOrganizacion). Las de otras instituciones no llevan chófer ni vehículo';
COMMENT ON COLUMN srp.jornadas.estatus IS 'estatus_jornada; Se cierra desde la franja o la revisión; se reabre desde la revisión o con «Registrar árbol» (D119, D153)';
COMMENT ON COLUMN srp.jornadas.fecha_inicio IS 'ISO 8601; Ordena las jornadas del día: «Jornada 2 de 3»';
COMMENT ON COLUMN srp.jornadas.fecha_cierre IS 'ISO 8601; Nulo mientras está abierta';
COMMENT ON COLUMN srp.jornadas.encargado_id IS '→ usuarios.id; Para un cabo es él mismo (no se pregunta ni se muestra en el cierre; el reporte lo imprime); quien ve a varias personas lo elige sólo entre los cabos con registros ese día (D57)';
COMMENT ON COLUMN srp.jornadas.relevo_id IS '→ usuarios.id; El cabo que registra en lugar del titular: lo elige la coordinación entre los cabos activos de su cuadrilla y de la institución de la jornada, con la jornada abierta. Nulo: registra el titular. Sólo quien registra en la jornada (este cabo o, sin relevo, el titular) agrega árboles en ella';
COMMENT ON COLUMN srp.jornadas.relevos IS '[{ cabo_id → usuarios.id, fecha ISO 8601, por_id → usuarios.id }]; [] sin relevos; Cada relevo hecho, también el que devuelve la jornada al titular: a quién se pasó, cuándo y quién lo hizo. Quien estuvo en un relevo sigue viendo la jornada y todos sus árboles, aunque sólo edita los suyos';
COMMENT ON COLUMN srp.jornadas.solicitante_id IS '→ solicitantes.id; Quién solicita la jornada, del catálogo de solicitantes (Catálogos › Solicitantes), que es aparte del de instituciones. No es quien ejecuta (organizacion_id): quien solicita no es quien planta. Nulo si la jornada es de otro programa o si la instancia no está en el catálogo. Obligatorio, este o solicitante_otro, con el programa «Solicitud»';
COMMENT ON COLUMN srp.jornadas.solicitante_otro IS 'Texto ≤ 120; '''' si no aplica; El nombre de la instancia que solicita cuando no está en el catálogo («Otra instancia»). Vacío con solicitante_id o en una jornada de otro programa';
COMMENT ON COLUMN srp.jornadas.solicitud_descripcion IS 'Texto ≤ 500, en varios renglones; '''' si no aplica; De qué se trata la solicitud; obligatoria con el programa «Solicitud». Vacía en una jornada de otro programa. Admite varios renglones: ahí cabe la referencia del oficio, si la hay';
COMMENT ON COLUMN srp.jornadas.editado_por_id IS '→ usuarios.id; nulo sin ediciones; Nulo hasta la primera edición, como en las demás tablas';
COMMENT ON COLUMN srp.jornadas.fecha_ultima_edicion IS 'ISO 8601; nulo sin ediciones; Nulo hasta la primera edición, como en las demás tablas';
COMMENT ON COLUMN srp.jornadas.arboles_previstos IS 'Entero 1–9999; Obligatorio al iniciar: cuántos árboles se van a plantar. Jornadas compara los registrados contra los previstos (faltan o sobran) y el reporte los imprime';
COMMENT ON COLUMN srp.jornadas.puntos_revisados IS '→ plantaciones.id; [] si nadie ha revisado; Puntos con aviso (duplicado, lejos, precisión) que alguien confirmó como correctos (D112); el aviso deja de contarse, no se borra. Al mover un árbol a otra jornada su marca sale de ésta (D151)';
COMMENT ON COLUMN srp.jornadas.reporte_en IS 'ISO 8601; nulo si no se ha generado o si dejó de estar vigente; Se fija cuando el PDF se entrega (se descarga o se comparte), no al abrir la vista previa. Vuelve a nulo, con constancia en la bitácora, si la jornada se reabre o si uno de sus árboles se elimina, restaura, edita, mueve o sustituye: el reporte se genera de nuevo';
COMMENT ON COLUMN srp.jornadas.carga_id IS 'UUID v4 del lote de carga masiva; nulo en las jornadas iniciadas en campo; Lo pone la carga masiva de Configuración (D196): todas las jornadas de un mismo archivo llevan la misma clave, que también es el entidad_id del renglón «carga» de la bitácora. Una jornada con carga_id no se cuenta como «sin reporte» en Supervisión';
COMMENT ON COLUMN srp.jornadas.personal IS 'Texto libre; Sólo en jornadas de SEDEMA; en las de otras instituciones no se pide y queda vacío (D192)';
COMMENT ON COLUMN srp.jornadas.apoyo IS 'Texto libre, varias líneas; Sólo en jornadas de SEDEMA; en las de otras instituciones no se pide y queda vacío (D192)';
COMMENT ON COLUMN srp.jornadas.observaciones IS 'Texto libre; Aquí se explica a mano una diferencia contra los árboles previstos';
COMMENT ON COLUMN srp.jornadas.chofer IS 'Texto libre; Sólo en jornadas de SEDEMA; en las de otras instituciones no se pide y queda vacío';
COMMENT ON COLUMN srp.jornadas.vehiculo_modelo IS 'Copia de vehiculos.modelo del vehículo elegido; '''' sin vehículo; Se copia del catálogo al guardar el cierre (D162); ya no se escribe a mano (D174). La migración 4 quitó lo escrito a mano y el `vehiculo` de antes del bloque 20';
COMMENT ON COLUMN srp.jornadas.vehiculo_placa IS 'Copia de vehiculos.nombre (la placa) del vehículo elegido; '''' sin vehículo; Se copia del catálogo al guardar el cierre (D162); ya no se escribe a mano (D174)';
COMMENT ON COLUMN srp.jornadas.vehiculo_tipo IS 'Copia de vehiculos.tipo_vehiculo del vehículo elegido; '''' sin vehículo; Se copia del catálogo al guardar el cierre (D162); ya no se escribe a mano (D174)';
COMMENT ON COLUMN srp.jornadas.vehiculo_id IS '→ vehiculos.id; El vehículo del catálogo; nulo sin vehículo. Con él se cuentan los que más usa cada encargado (D162). Sólo del catálogo: sin «Otro vehículo» (D174)';
COMMENT ON COLUMN srp.jornadas.hora IS 'HH:MM, de 00:00 a 23:59; '''' si no se elige';

RESET ROLE;
