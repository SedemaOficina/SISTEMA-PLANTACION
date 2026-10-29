-- INSTALACIÓN COMPLETA DEL ESQUEMA srp POR LA ENTRADA ESTÁNDAR, en una sola transacción: o queda todo o no queda
-- nada. Trae juntos, en el orden de instalar.sql, los guiones 01 a 10: por la entrada estándar, `\ir` no encuentra los
-- archivos. Lo corre quien administra la base, desde cualquier carpeta. Requiere PostGIS y el esquema territorio con
-- su rol territorio_lectura.
--
--   psql -d <base> -v ON_ERROR_STOP=on < srp-instalar-por-stdin.sql
--
-- NO SE EDITA: lo arma el SRP a partir de los guiones (herramientas/instalar_por_stdin.py), y la entrega se detiene si
-- no coinciden. Después siguen los pasos de la cuenta srp_api, al principio de 10-srp-rol-y-grants.sql.

\set ON_ERROR_STOP on
BEGIN;

-- ═══ 01-srp-esquema.sql ═══
-- ESQUEMA srp · Sistema de Registro de Plantaciones. Lo corre quien administra la base, dentro de
-- instalar.sql. Requiere PostGIS y el esquema compartido territorio (alcaldías, colonias y malla UGA),
-- que el SRP sólo lee.
--
-- Una instalación nunca escribe sobre otra: si el esquema ya tiene sus tablas, se detiene sin tocar
-- nada. Los cambios posteriores van como migraciones numeradas, anotadas en srp.migraciones.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'postgis') THEN
    RAISE EXCEPTION 'PostGIS no está instalado en esta base: lo instala quien la administra antes del SRP';
  END IF;
  IF to_regclass('territorio.alcaldia') IS NULL OR to_regclass('territorio.malla_uga_1km') IS NULL
     OR to_regclass('territorio.colonias_iecm_2022') IS NULL THEN
    RAISE EXCEPTION 'Falta el esquema territorio (alcaldia, malla_uga_1km, colonias_iecm_2022): el SRP lo lee, no lo crea';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'territorio_lectura') THEN
    RAISE EXCEPTION 'Falta el rol territorio_lectura: con él la cuenta del SRP lee territorio';
  END IF;
  IF to_regclass('srp.migraciones') IS NOT NULL THEN
    RAISE EXCEPTION 'El esquema srp ya está instalado (versión %): los cambios van como migración, no como instalación',
      (SELECT max(version) FROM srp.migraciones);
  END IF;
  -- Las funciones del SRP toman al crearse la ruta de búsqueda de esta transacción (SET search_path FROM CURRENT):
  -- se fija aquí, para que no dependa de la sesión de quien instala. El esquema srp y el de PostGIS, nada más.
  PERFORM set_config('search_path', 'srp, ' || (SELECT quote_ident(n.nspname) FROM pg_extension e JOIN pg_namespace n ON n.oid = e.extnamespace
                                                 WHERE e.extname = 'postgis'), true);
END $$;

CREATE SCHEMA IF NOT EXISTS srp;

COMMENT ON SCHEMA srp IS 'Sistema de Registro de Plantaciones (SRP): jornadas y árboles plantados, catálogos, cuentas y bitácora.';

-- Nadie más usa el esquema salvo a quien se le concede en 10-srp-rol-y-grants.sql
REVOKE ALL ON SCHEMA srp FROM PUBLIC;

-- Qué versiones del esquema están aplicadas. La instalación es la 1; cada migración agrega la suya.
CREATE TABLE srp.migraciones (
  version      integer      NOT NULL,
  nombre       text         NOT NULL,
  aplicada_en  timestamptz  NOT NULL DEFAULT now(),
  CONSTRAINT migraciones_pk PRIMARY KEY (version)
);
COMMENT ON TABLE srp.migraciones IS 'Versiones del esquema aplicadas, en orden. La instalación es la 1.';

-- El sello de los datos: nace con la instalación y cambia cuando el servidor se vacía (vaciar-tras-prueba.sql). Cada
-- teléfono lo recibe al entrar y lo manda con lo que envía: si el del servidor es más nuevo, el servicio no acepta lo
-- que manda y el teléfono borra lo que guardaba, para que los datos de la prueba no vuelvan al servidor limpio. Empieza
-- con la fecha y la hora en UTC, así que ordenarlos como texto es ordenarlos en el tiempo: si un día se restaura un
-- respaldo de antes del vaciado, el sello del servidor queda más viejo que el de los teléfonos y nadie borra nada.
-- `nota` deja la constancia de cuándo se instaló o se vació, y qué se borró.
CREATE FUNCTION srp.sello_nuevo() RETURNS text LANGUAGE sql VOLATILE SET search_path = pg_catalog, pg_temp AS $$
  SELECT to_char(clock_timestamp() AT TIME ZONE 'UTC', 'YYYYMMDD"T"HH24MISS.US') || '-' || substr(md5(random()::text), 1, 8)
$$;
CREATE TABLE srp.sello (
  unico  boolean      NOT NULL DEFAULT true,
  valor  text         NOT NULL,
  desde  timestamptz  NOT NULL DEFAULT now(),
  nota   text         NOT NULL,
  CONSTRAINT sello_pk PRIMARY KEY (unico),
  CONSTRAINT sello_uno CHECK (unico)
);
COMMENT ON TABLE srp.sello IS 'Un solo renglón: el sello de los datos del servidor, ordenable en el tiempo. Cambia al vaciarlo después de la prueba; nota dice qué pasó.';
INSERT INTO srp.sello (valor, nota) VALUES (srp.sello_nuevo(), 'Instalación');

-- ═══ 02-srp-tablas.sql ═══
-- TABLAS DEL SRP. Generado por herramientas/generar_sql.py a partir de datos/esquema.json
-- (versión del esquema 2026-10-28): no se edita a mano. Lo corre quien administra la base, dentro de
-- instalar.sql, después de 01-srp-esquema.sql.

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
  sitio_plantacion           text           NOT NULL DEFAULT 'suelo',
  comentarios                varchar(500)   NOT NULL,
  foto_base64                text           NULL,
  foto_id                    uuid           NULL,
  fecha_registro             timestamptz    NOT NULL,
  fecha_ultima_edicion       timestamptz    NULL,
  editado_por_id             uuid           NULL,
  calle_estado               text           NULL,
  calle_clave                text           NULL,
  calle_version              text           NULL,
  calle                      text           NULL,
  calle_entre_1              text           NULL,
  calle_entre_2              text           NULL,
  calle_esquina              text           NULL,
  vialidad_red               text           NULL,
  vialidad_tipo              text           NULL,
  calle_atiende              text           NULL,
  calle_llave                text           NULL,
  calle_distancia_m          integer        NULL,
  CONSTRAINT plantaciones_pk PRIMARY KEY (id),
  CONSTRAINT plantaciones_estatus_valido CHECK (estatus IN ('activo', 'eliminado', 'sustituido')),
  CONSTRAINT plantaciones_punto_origen_valido CHECK (punto_origen IN ('gps', 'mapa', 'manual', 'ajustado')),
  CONSTRAINT plantaciones_motivo_sustitucion_valido CHECK (motivo_sustitucion IN ('VANDALISMO', 'IMPACTO_VEHICULAR', 'ROBO', 'MUERTE', 'OTRO')),
  CONSTRAINT plantaciones_sitio_plantacion_valido CHECK (sitio_plantacion IN ('suelo', 'maceton')),
  CONSTRAINT plantaciones_calle_estado_valido CHECK (calle_estado IN ('ok', 'lejos')),
  CONSTRAINT plantaciones_vialidad_red_valido CHECK (vialidad_red IN ('primaria', 'secundaria', 'carretera o camino')),
  CONSTRAINT plantaciones_folio_unico UNIQUE (folio),
  CONSTRAINT plantaciones_folio_patron CHECK (folio ~ '^[A-Z]{3}-\d{3}-\d{5}$'),
  CONSTRAINT plantaciones_especie_id_patron CHECK (especie_id ~ '^ESP-\d{4}$'),
  CONSTRAINT plantaciones_especie_o_escrita CHECK (especie_id IS NOT NULL OR especie_otra <> ''),
  CONSTRAINT plantaciones_motivo_otro CHECK (motivo_sustitucion IS DISTINCT FROM 'OTRO' OR motivo_sustitucion_otro <> ''),
  CONSTRAINT plantaciones_gps_precision CHECK (gps_precision_m IS NULL OR gps_precision_m >= 0),
  CONSTRAINT plantaciones_uga_borde CHECK (uga_borde_m IS NULL OR uga_borde_m >= 0),
  CONSTRAINT plantaciones_calle_distancia CHECK (calle_distancia_m IS NULL OR calle_distancia_m BETWEEN 0 AND 40),
  CONSTRAINT plantaciones_calle_ok CHECK (calle_estado IS DISTINCT FROM 'ok' OR (calle_clave IS NOT NULL AND calle IS NOT NULL AND calle_distancia_m IS NOT NULL)),
  CONSTRAINT plantaciones_calle_lejos CHECK (calle_estado IS DISTINCT FROM 'lejos' OR num_nonnulls(calle_clave, calle, calle_entre_1, calle_entre_2, calle_esquina, vialidad_red, vialidad_tipo, calle_atiende, calle_llave, calle_distancia_m) = 0),
  CONSTRAINT plantaciones_calle_por_calcular CHECK (calle_estado IS NOT NULL OR num_nonnulls(calle_version, calle_clave, calle, calle_entre_1, calle_entre_2, calle_esquina, vialidad_red, vialidad_tipo, calle_atiende, calle_llave, calle_distancia_m) = 0)
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
  CONSTRAINT bitacora_accion_valido CHECK (accion IN ('CREADO', 'EDITADO', 'ELIMINADO', 'RESTAURADO', 'SUSTITUIDO', 'RELEVO', 'APOYO', 'ACTIVADO', 'DESACTIVADO', 'FOLIO_ASIGNADO')),
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
  cabos_apoyo                jsonb          NOT NULL DEFAULT '[]'::jsonb,
  CONSTRAINT jornadas_pk PRIMARY KEY (id),
  CONSTRAINT jornadas_estatus_valido CHECK (estatus IN ('abierta', 'cerrada')),
  CONSTRAINT jornadas_arboles_previstos_rango CHECK (arboles_previstos BETWEEN 1 AND 9999),
  CONSTRAINT jornadas_hora_formato CHECK (hora = '' OR hora ~ '^([01]\d|2[0-3]):[0-5]\d$'),
  CONSTRAINT jornadas_relevos_lista CHECK (jsonb_typeof(relevos) = 'array'),
  CONSTRAINT jornadas_cabos_apoyo_lista CHECK (jsonb_typeof(cabos_apoyo) = 'array'),
  CONSTRAINT jornadas_cabos_apoyo_forma CHECK (NOT (cabos_apoyo @? '$[*] ? (@.type() != "object" || !exists(@.cabo_id) || @.cabo_id.type() != "string" || !(@.cabo_id like_regex "^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$") || !exists(@.desde) || !exists(@.por_id) || (exists(@.fin) && @.fin != null && @.fin != "terminado" && @.fin != "quitado"))'))
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
COMMENT ON TABLE srp.plantaciones IS 'Un renglón por ejemplar plantado. Es el registro individual de campo; todo lo demás (partes, tableros, cifra pública) se construye encima.';
COMMENT ON COLUMN srp.plantaciones.id IS 'UUID v4; Se fija al abrir la ficha de revisión y es el que se guarda (idPrevisto); no cambia al editar. En Fase 2 es la clave de idempotencia del envío (R4)';
COMMENT ON COLUMN srp.plantaciones.estatus IS 'estatus_plantacion; Nace `activo`; «Eliminar» lo marca `eliminado`, nunca borra (Norma 7.4). Un registro eliminado sigue contando en el uso de catálogos y cuentas. «Sustituir» lo marca `sustituido` al guardar su sustituto: deja de contar como plantado y conserva su historial';
COMMENT ON COLUMN srp.plantaciones.cabo_id IS '→ usuarios.id; Quien captura. Al editar se conserva: el autor no cambia de manos aunque corrija un coordinador o la administración';
COMMENT ON COLUMN srp.plantaciones.lat IS 'Grados decimales WGS84, 6 decimales, dentro de CONFIG.MAPA.LIMITES; Del botón de ubicación, de tocar el mapa o de la captura a mano; se cambia moviendo el punto, no tecleando. Fuera del ámbito de la CDMX el punto se rechaza';
COMMENT ON COLUMN srp.plantaciones.lng IS 'Ídem; Ídem. Al guardar en GeoJSON el orden es [lng, lat]';
COMMENT ON COLUMN srp.plantaciones.punto_origen IS 'punto_origen; Lo determina la acción con la que se colocó el punto, no una elección. Es la prueba de cómo se obtuvo la coordenada cuando no hay fotografía';
COMMENT ON COLUMN srp.plantaciones.gps_precision_m IS 'Metros, entero; null salvo con GPS; Existe si y sólo si punto_origen = gps: al mover el punto a mano se borra. La auditoría lo comprueba. En Fase 2 alimenta la regla de duplicados';
COMMENT ON COLUMN srp.plantaciones.folio IS '`AAA-000-00000` (SRP.folio.PATRON): clave de la celda UGA y consecutivo de la celda; UNIQUE. AAA es el prefijo de la celda, no la alcaldía del árbol (difieren en el 4.3 % del territorio); Con datos reales, nulo en toda la Fase 1: lo asigna el servidor una sola vez al sincronizar (R3), es inmutable (R7) y no lleva la especie ni el año. El consecutivo sale de una secuencia perpetua por celda, nunca de MAX+1 (R5–R6). Con datos de prueba lo llena el servidor simulado, marcado «(simulado)» en pantalla y en cada renglón del PDF; su secuencia vive en cada teléfono y dos teléfonos pueden repetir números. Sin alcaldía o con capas incompletas no se emite';
COMMENT ON COLUMN srp.plantaciones.especie_id IS '→ especies.id (id_especie ESP-0000); Obligatoria salvo con «Otra especie», donde queda nula. El registro guarda sólo la clave; género, epíteto, distribución, forma de crecimiento, id_snib e id_enciclovida se obtienen del catálogo';
COMMENT ON COLUMN srp.plantaciones.especie_otra IS 'Texto libre; '''' salvo con «Otra especie»; Obligatoria cuando especie_id es nula. Se vacía al elegir una especie del catálogo';
COMMENT ON COLUMN srp.plantaciones.alcaldia_cve IS 'alcaldia_cve; Derivada del punto contra la capa de alcaldías. Llave para unir con el esquema territorio del SIA. Nula si el punto cae en un hueco de la capa (se avisa, no se impide guardar)';
COMMENT ON COLUMN srp.plantaciones.alcaldia IS 'Nombre de la alcaldía según la capa; Copia del nombre para leerse sin cargar la capa. Se rederiva cada vez que el punto se mueve; se puede rederivar en lote si la capa cambia (capa_version). Un punto dentro del margen del límite toma la alcaldía más cercana';
COMMENT ON COLUMN srp.plantaciones.colonia_cve IS 'colonia_cve; Nula fuera de la zona urbana (suelo de conservación): no es defecto. En solape gana la colonia más pequeña';
COMMENT ON COLUMN srp.plantaciones.colonia IS 'Nombre como viene en la capa, mayúsculas y tipo entre paréntesis; Capa definitiva (IECM 2022): las colonias del IECM son la unidad oficial de reporte';
COMMENT ON COLUMN srp.plantaciones.uga IS 'uga; Celda vigente del punto. Su prefijo es el de la celda y NO la alcaldía del punto (difieren en el 4.3 % del territorio); la alcaldía sale de su propia capa. Cambia si el punto se corrige; la celda con que se asignó el folio la congela el servidor (S-02)';
COMMENT ON COLUMN srp.plantaciones.uga_borde_m IS 'Metros enteros ≥ 0; nulo sin celda; Distancia del punto al borde de su celda UGA, al derivar. Si es menor que gps_precision_m, la celda del folio podría ser la vecina: el servidor la decide con la regla que fije el SIA';
COMMENT ON COLUMN srp.plantaciones.capa_version IS '`alcaldias=v;uga=v;colonias=v`; Con qué versión de cada capa se derivó; permite rehacer alcaldia/colonia/uga cuando el SIA entregue las capas definitivas';
COMMENT ON COLUMN srp.plantaciones.programa_id IS '→ programas.id; Es el de su jornada: se toma al registrar, cambia cuando cambia el de la jornada —también en los eliminados, en la misma transacción— y al mover el árbol toma el de su jornada nueva';
COMMENT ON COLUMN srp.plantaciones.fecha_plantacion IS 'AAAA-MM-DD, ≤ hoy; El día en que se plantó el árbol, entre la fecha de su jornada y hoy. Arranca con la fecha de la jornada el día en que la jornada se inicia y con la de hoy los días siguientes; lo elegido se conserva para el árbol siguiente de la misma jornada. Un sustituto lleva la fecha de la sustitución, no anterior a la plantación del árbol perdido. Si cambia la fecha de la jornada, la toman los árboles del día de inicio (también los eliminados, en la misma transacción); al mover el árbol a otra jornada, la de la jornada nueva si era del día de inicio, y si no conserva la suya (nunca antes del inicio de la jornada nueva); al restaurarlo, la suya, salvo que la jornada empiece después';
COMMENT ON COLUMN srp.plantaciones.jornada_id IS '→ jornadas.id; La jornada activa al registrar. Cambia sólo con «Mover a otra jornada» en Jornadas, que también ajusta fecha_plantacion y programa_id';
COMMENT ON COLUMN srp.plantaciones.sustituye_id IS '→ plantaciones.id; Sólo en el árbol que reemplaza a uno perdido; nulo en los demás. Se registra en la jornada del árbol perdido';
COMMENT ON COLUMN srp.plantaciones.motivo_sustitucion IS 'motivo_sustitucion; Obligatorio en un sustituto; nulo en los demás';
COMMENT ON COLUMN srp.plantaciones.motivo_sustitucion_otro IS 'Texto libre ≤ 120; '''' salvo con motivo OTRO; Obligatorio cuando motivo_sustitucion es OTRO';
COMMENT ON COLUMN srp.plantaciones.sustituido_por_id IS '→ plantaciones.id; Sólo en el árbol perdido, junto con estatus `sustituido`. Si se elimina el sustituto, vuelve a nulo y el árbol a `activo`';
COMMENT ON COLUMN srp.plantaciones.sitio_plantacion IS 'sitio_plantacion; Cada árbol nuevo empieza en `suelo`; el sustituto toma el del árbol que reemplaza y la carga masiva pone `suelo`. Los árboles guardados antes de existir el campo quedan en `suelo` (migración 11 del teléfono); el servidor pone `suelo` si una versión anterior de la aplicación no lo manda';
COMMENT ON COLUMN srp.plantaciones.comentarios IS 'Texto libre ≤ 500; '''' si no se escribe; Entra al reporte PDF en «Comentarios por ejemplar», al final, sólo los árboles que lo tienen. Un registro sin la llave se lee como «Sin comentarios»';
COMMENT ON COLUMN srp.plantaciones.foto_base64 IS 'data:image/jpeg;base64,… ya comprimida (≤ 800×600, calidad 0.7); Incrustada en el registro en Fase 1. En Fase 2 sale a archivo, como en los otros módulos del SIA (pendiente «Dónde viven las fotografías»)';
COMMENT ON COLUMN srp.plantaciones.foto_id IS 'UUID v4; null sin foto; Identificador de la imagen, para cuando viva como archivo';
COMMENT ON COLUMN srp.plantaciones.fecha_registro IS 'ISO 8601 con zona (-06:00); Cuándo se guardó por primera vez. Distinta de fecha_plantacion';
COMMENT ON COLUMN srp.plantaciones.fecha_ultima_edicion IS 'ISO 8601; Nula hasta la primera edición; también se pone al eliminar';
COMMENT ON COLUMN srp.plantaciones.editado_por_id IS '→ usuarios.id; Quién hizo la última edición (o la eliminación)';
COMMENT ON COLUMN srp.plantaciones.calle_estado IS 'calle_estado; Lo pone el servidor al recibir el árbol y cada vez que se corrige el punto, con la capa territorio.calles: `ok` si hay un tramo a 40 m o menos, `lejos` si no. Nulo mientras no se calcula: un árbol sin enviar, o un servidor que todavía no tiene la capa. Con datos de prueba lo pone el servidor simulado, con la copia ligera de la capa (assets/calles/)';
COMMENT ON COLUMN srp.plantaciones.calle_clave IS 'Clave INEGI del tramo, de 19 dígitos, válida para su calle_version; El tramo más cercano. Una clave sólo vale para su versión de la capa: con otra versión se pasa por territorio.calles_equivalencia';
COMMENT ON COLUMN srp.plantaciones.calle_version IS 'Versión vigente de territorio.calles con que se calculó, como `1.0.0`: la de territorio.version_capa del SIA o, si no la registró, la del paquete (srp.version_calles); CALL srp.recalcular_calles() vuelve a calcular, por tandas, los árboles sin calle o de otra versión, después de instalar o actualizar la capa';
COMMENT ON COLUMN srp.plantaciones.calle IS 'Nombre del tramo (`nombre` de la capa); «calle sin nombre» si no tiene; Sólo con calle_estado = ok; si no, nulo, como los demás campos de la calle';
COMMENT ON COLUMN srp.plantaciones.calle_entre_1 IS 'La calle de una esquina del tramo (`entre_1`); nula si el tramo no tiene salida por ese lado; Con una sola esquina, o con la misma calle en las dos, la pantalla dice «a la altura de»';
COMMENT ON COLUMN srp.plantaciones.calle_entre_2 IS 'La calle de la otra esquina (`entre_2`)';
COMMENT ON COLUMN srp.plantaciones.calle_esquina IS 'Otra calle casi igual de cerca: a menos de 4 m más que la del tramo; Avisa que el árbol podría contarse en la otra calle';
COMMENT ON COLUMN srp.plantaciones.vialidad_red IS 'vialidad_red; `red_vial` del tramo';
COMMENT ON COLUMN srp.plantaciones.vialidad_tipo IS 'En la red primaria, «Vía primaria» o «Vía de acceso controlado» (`tipo_via`); nulo en las demás';
COMMENT ON COLUMN srp.plantaciones.calle_atiende IS 'Quién atiende el tramo (`atiende`): «Gobierno de CDMX», «Alcaldía X», «Alcaldías X y Y», «Concesión», «Gobierno Federal» o «Particular»; Todo tramo de la capa lo dice; si faltara, la pantalla dice «quién la atiende, por confirmar», nunca «de la alcaldía»';
COMMENT ON COLUMN srp.plantaciones.calle_llave IS 'Nombre para comparar (`llave`): sin tipo, acentos ni mayúsculas; nulo sin nombre; En el informe y en Supervisión, una misma calle es su llave dentro de la alcaldía del árbol';
COMMENT ON COLUMN srp.plantaciones.calle_distancia_m IS 'Metros enteros del árbol al tramo, de 0 a 40';
COMMENT ON TABLE srp.usuarios IS 'Cuentas del sistema. Una por persona; el perfil decide qué puede hacer (js/permisos.js, fuente única).';
COMMENT ON COLUMN srp.usuarios.id IS 'UUID v4; en el servidor, también la primera cuenta, que crea el SIA. Sólo la versión de prueba usa identificadores como `u-admin-1`';
COMMENT ON COLUMN srp.usuarios.correo IS 'Correo válido, en minúsculas, único; Identifica la cuenta y sirve para entrar; no se puede cambiar después. No tiene que ser institucional';
COMMENT ON COLUMN srp.usuarios.nombre_completo IS 'Texto, hasta 160: nombre y al menos un apellido; Un solo campo. Sustituye a nombre, apellido_paterno y apellido_materno: al abrir, las cuentas que los tenían se unen aquí (js/almacen.js normalizar)';
COMMENT ON COLUMN srp.usuarios.organizacion_id IS '→ instituciones.id; La institución de la cuenta. En el alta se elige primero el tipo (Alcaldía, Gobierno de la CDMX, Empresa privada, Organización civil) y luego la institución de la lista; las que falten las agrega la Administración en Catálogos › Instituciones, a solicitud. Sólo SEDEMA (o-sedema) tiene área y ADMIN; las cuentas de fuera son CABO o COORDINADOR, y el cabo depende de un coordinador de su misma institución. Al abrir, las cuentas sin institución quedan en SEDEMA';
COMMENT ON COLUMN srp.usuarios.area_id IS '→ areas.id (DGSANPAVA, Oficina de la Secretaría, Sistema de Información Ambiental, DGEIRA); Obligatoria en cuentas de SEDEMA; nula en las de otras organizaciones';
COMMENT ON COLUMN srp.usuarios.cargo_rol IS 'Texto libre; Descriptivo; no gobierna permisos';
COMMENT ON COLUMN srp.usuarios.perfil IS 'perfil; Decide alcance y acciones. Una cuenta de administración no puede quitarse a sí misma el perfil ADMIN. Un perfil desconocido queda sin permisos y se avisa. ADMIN sólo en SEDEMA; fuera, CABO, COORDINADOR o DIRECTIVO';
COMMENT ON COLUMN srp.usuarios.activo IS 'true/false; Inactiva no puede entrar; sus registros se conservan a su nombre. Con registros a su nombre no se elimina, se desactiva';
COMMENT ON COLUMN srp.usuarios.fecha_creacion IS 'ISO 8601; Cuándo se dio de alta la cuenta; mismo nombre que en catálogos';
COMMENT ON COLUMN srp.usuarios.creado_por_id IS '→ usuarios.id; Quién dio de alta la cuenta; mismo nombre que en catálogos';
COMMENT ON COLUMN srp.usuarios.fecha_ultima_edicion IS 'ISO 8601';
COMMENT ON COLUMN srp.usuarios.editado_por_id IS '→ usuarios.id';
COMMENT ON TABLE srp.programas IS 'Los programas de plantación. La jornada elige uno y sus árboles lo toman. Cada programa dice qué tipos de institución, además de la Secretaría, pueden usarlo.';
COMMENT ON COLUMN srp.programas.id IS 'UUID v4; los de arranque: p-refor, p-centro, p-palmeras, p-compensaciones; Es lo que guardan plantaciones.programa_id y jornadas.programa_id';
COMMENT ON COLUMN srp.programas.clave IS '`[A-Z0-9_]{2,30}`, única; Se sugiere del nombre, editable antes de guardar, fija después';
COMMENT ON COLUMN srp.programas.nombre IS 'Texto, único';
COMMENT ON COLUMN srp.programas.activo IS 'true/false; Inactivo deja de ofrecerse; los registros que ya lo usan no cambian. Con uso no se elimina';
COMMENT ON COLUMN srp.programas.creado_por_id IS '→ usuarios.id';
COMMENT ON COLUMN srp.programas.fecha_creacion IS 'ISO 8601';
COMMENT ON COLUMN srp.programas.editado_por_id IS '→ usuarios.id';
COMMENT ON COLUMN srp.programas.fecha_ultima_edicion IS 'ISO 8601';
COMMENT ON COLUMN srp.programas.tipos_organizacion IS 'Lista de tipo_organizacion; [] = sólo SEDEMA; Los tipos de institución que, además de SEDEMA, pueden elegir el programa al iniciar o editar una jornada; SEDEMA puede usar todos. Lo marca la Administración. Un programa nuevo empieza vacío. De arranque: Reforestación Urbana, Alcaldía, Gobierno de la CDMX y Organización civil; Centro Histórico, Gobierno de la CDMX; Palmeras, Empresa privada; Compensaciones, Territorios de Paz, Utopías y Solicitud especial, vacío. Al abrir, un programa sin el dato recibe el de arranque o, si lo agregó la Administración, vacío';
COMMENT ON TABLE srp.areas IS 'Las áreas de la Secretaría a las que pertenece una cuenta. Las cuentas de otras instituciones no llevan área.';
COMMENT ON COLUMN srp.areas.id IS 'UUID v4; las de arranque: a-dgsanpava, a-oficina, a-sia, a-dgeira; Es lo que guarda usuarios.area_id';
COMMENT ON COLUMN srp.areas.clave IS '`[A-Z0-9_]{2,30}`, única; Se sugiere del nombre, editable antes de guardar, fija después';
COMMENT ON COLUMN srp.areas.nombre IS 'Texto, único';
COMMENT ON COLUMN srp.areas.activo IS 'true/false; Inactivo deja de ofrecerse; los registros que ya lo usan no cambian. Con uso no se elimina';
COMMENT ON COLUMN srp.areas.creado_por_id IS '→ usuarios.id';
COMMENT ON COLUMN srp.areas.fecha_creacion IS 'ISO 8601';
COMMENT ON COLUMN srp.areas.editado_por_id IS '→ usuarios.id';
COMMENT ON COLUMN srp.areas.fecha_ultima_edicion IS 'ISO 8601';
COMMENT ON TABLE srp.especies IS 'El catálogo de especies: el real del SIA, 79 de arranque, más las que agregue la Administración. Lleva los datos taxonómicos, si pertenece a la paleta vegetal de la Secretaría, si su fruto es comestible y las llaves externas al SNIB y a EncicloVida.';
COMMENT ON COLUMN srp.especies.id IS 'id_especie; Es la propia clave ESP-0000. Es lo que guarda plantaciones.especie_id';
COMMENT ON COLUMN srp.especies.clave IS 'id_especie; Consecutivo ESP-0000 que asigna el sistema; nunca se escribe ni se reutiliza';
COMMENT ON COLUMN srp.especies.nombre IS 'Texto, único; Es el nombre_comun del catálogo del SIA: la etiqueta de campo';
COMMENT ON COLUMN srp.especies.activo IS 'true/false; Inactivo deja de ofrecerse; los registros que ya lo usan no cambian. Con uso no se elimina';
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
COMMENT ON TABLE srp.vehiculos IS 'Los vehículos de las cuadrillas. Se eligen en el cierre de la jornada, que copia placa, modelo y tipo. En la versión de prueba llevan placas ficticias; los reales se cargan en el servidor.';
COMMENT ON COLUMN srp.vehiculos.id IS '«v-» más la placa sin espacios en los de arranque; UUID v4 en los que se agreguen; Es lo que guarda jornadas.vehiculo_id';
COMMENT ON COLUMN srp.vehiculos.clave IS 'La placa sin espacios ni guiones; única; Sale de la placa al darlo de alta y no se muestra; dos placas que sólo difieren en espacios son la misma';
COMMENT ON COLUMN srp.vehiculos.nombre IS 'Texto, único; Es la placa, en mayúsculas: «PRU 005». Se copia a jornadas.vehiculo_placa';
COMMENT ON COLUMN srp.vehiculos.activo IS 'true/false; Inactivo deja de ofrecerse; los registros que ya lo usan no cambian. Con uso no se elimina';
COMMENT ON COLUMN srp.vehiculos.creado_por_id IS '→ usuarios.id; null en los vehículos de arranque';
COMMENT ON COLUMN srp.vehiculos.fecha_creacion IS 'ISO 8601';
COMMENT ON COLUMN srp.vehiculos.editado_por_id IS '→ usuarios.id';
COMMENT ON COLUMN srp.vehiculos.fecha_ultima_edicion IS 'ISO 8601';
COMMENT ON COLUMN srp.vehiculos.modelo IS 'Texto, inicial mayúscula: «Dodge», «Internacional»; Obligatorio. Se copia a jornadas.vehiculo_modelo al elegir la placa en el cierre';
COMMENT ON COLUMN srp.vehiculos.tipo_vehiculo IS 'Texto, inicial mayúscula: Pipa · Pick up · Doble cabina · Estacas · Redilas · Grúa; se proponen los que ya hay; Obligatorio. Agrupa la lista de placas del cierre y se copia a jornadas.vehiculo_tipo';
COMMENT ON TABLE srp.instituciones IS 'Las instituciones que ejecutan plantaciones y tienen cuentas: la Secretaría, las 16 alcaldías, otras dependencias, empresas y organizaciones civiles. De ellas depende el alcance de un directivo de fuera de la Secretaría.';
COMMENT ON COLUMN srp.instituciones.id IS 'UUID v4; las de arranque: o-sedema, o-paot, o-sobse, o-green-cover, o-reforestamos, o-alc-09002…o-alc-09017; Es lo que guardan usuarios.organizacion_id y jornadas.organizacion_id';
COMMENT ON COLUMN srp.instituciones.clave IS '`[A-Z0-9_]{2,30}`, única; La pone el sistema a partir del nombre y no se muestra';
COMMENT ON COLUMN srp.instituciones.nombre IS 'Texto, único; Único entre todas; las alcaldías sin la palabra «Alcaldía» (la pone la pantalla)';
COMMENT ON COLUMN srp.instituciones.activo IS 'true/false; Inactivo deja de ofrecerse; los registros que ya lo usan no cambian. Con uso no se elimina';
COMMENT ON COLUMN srp.instituciones.creado_por_id IS '→ usuarios.id';
COMMENT ON COLUMN srp.instituciones.fecha_creacion IS 'ISO 8601';
COMMENT ON COLUMN srp.instituciones.editado_por_id IS '→ usuarios.id';
COMMENT ON COLUMN srp.instituciones.fecha_ultima_edicion IS 'ISO 8601';
COMMENT ON COLUMN srp.instituciones.tipo_organizacion IS 'tipo_organizacion; Obligatorio: se elige al agregarla en Catálogos (nunca Alcaldía: las 16 son fijas) y no cambia. Las alcaldías se guardan sin la palabra «Alcaldía» en el nombre';
COMMENT ON TABLE srp.solicitantes IS 'Quién solicita una jornada. No son quienes plantan ni tienen cuentas: por eso van aparte de las instituciones.';
COMMENT ON COLUMN srp.solicitantes.id IS 'UUID v4; los de arranque: s-alc-09002…s-alc-09017, s-oficina-secretaria, s-sobse, s-segiagua, s-jefatura, s-diputados; Es lo que guarda jornadas.solicitante_id';
COMMENT ON COLUMN srp.solicitantes.clave IS '`[A-Z0-9_]{2,30}`, única; La pone el sistema a partir del nombre y no se muestra';
COMMENT ON COLUMN srp.solicitantes.nombre IS 'Texto, único; Único entre todos; las alcaldías sin la palabra «Alcaldía»: su tipo las agrupa en la lista';
COMMENT ON COLUMN srp.solicitantes.activo IS 'true/false; Inactivo deja de ofrecerse; los registros que ya lo usan no cambian. Con uso no se elimina';
COMMENT ON COLUMN srp.solicitantes.creado_por_id IS '→ usuarios.id';
COMMENT ON COLUMN srp.solicitantes.fecha_creacion IS 'ISO 8601';
COMMENT ON COLUMN srp.solicitantes.editado_por_id IS '→ usuarios.id';
COMMENT ON COLUMN srp.solicitantes.fecha_ultima_edicion IS 'ISO 8601';
COMMENT ON COLUMN srp.solicitantes.tipo_solicitante IS 'tipo_solicitante; Obligatorio. Agrupa la lista «Quién lo solicita» y la tabla del catálogo. Se elige al agregarlo y se puede corregir después';
COMMENT ON TABLE srp.bitacora IS 'Quién, cuándo y qué, en cada alta, edición, eliminación, activación y desactivación (Norma 7.7). Sólo se escribe; se lee en el historial del detalle de cada registro.';
COMMENT ON COLUMN srp.bitacora.id IS 'UUID v4';
COMMENT ON COLUMN srp.bitacora.fecha IS 'ISO 8601';
COMMENT ON COLUMN srp.bitacora.usuario_id IS '→ usuarios.id';
COMMENT ON COLUMN srp.bitacora.usuario_nombre IS 'Nombre completo; Copia a propósito: si la cuenta se elimina, el historial sigue diciendo quién actuó';
COMMENT ON COLUMN srp.bitacora.perfil IS 'perfil; Con qué perfil actuó en ese momento';
COMMENT ON COLUMN srp.bitacora.accion IS 'accion_bitacora';
COMMENT ON COLUMN srp.bitacora.entidad IS 'entidad_bitacora';
COMMENT ON COLUMN srp.bitacora.entidad_id IS 'id de la tabla correspondiente; Se escribe en la misma transacción que el dato (guardarConBitacora)';
COMMENT ON COLUMN srp.bitacora.detalle IS 'Texto; '''' si no aplica; En una edición, la lista de campos que cambiaron';
COMMENT ON TABLE srp.jornadas IS 'Una jornada de plantación: se declara antes de registrar el primer árbol. Agrupa los registros, lleva la conciliación y la revisión, y guarda los datos de cierre del reporte.';
COMMENT ON COLUMN srp.jornadas.id IS 'UUID; Se fija al iniciar la jornada';
COMMENT ON COLUMN srp.jornadas.nombre IS 'Texto libre, hasta 120; Obligatorio al iniciar: el parque, la calle o el sitio. Es el nombre de la tarjeta en Jornadas y el «Jornada:» del reporte';
COMMENT ON COLUMN srp.jornadas.ubicacion IS 'Texto libre, hasta 200; '''' si no se escribe; Calle y número, entre calles o tramo, en «Dirección de la jornada». Va al reporte bajo el nombre de la jornada';
COMMENT ON COLUMN srp.jornadas.programa_id IS '→ programas.id; Obligatorio al iniciar. Sus árboles lo toman siempre: al registrar, al cambiarlo aquí y al moverlos a esta jornada. SEDEMA elige todos; las demás instituciones, los que tienen marcado su tipo en programas.tipos_organizacion. Con un solo programa posible viene ya elegido. El programa «Solicitud especial» (id p-solicitud) marca la jornada que atiende una solicitud de otra instancia: con él se piden quién lo solicita y la descripción. Es un valor del catálogo: la Administración puede renombrarlo o desactivarlo; el sistema lo reconoce por su id';
COMMENT ON COLUMN srp.jornadas.lat IS 'Grados decimales WGS84, 6 decimales; nulo sin ubicación; Latitud del punto de la jornada: detectado con el GPS al iniciar o escrito a mano cuando no hubo señal. No es la de ningún árbol';
COMMENT ON COLUMN srp.jornadas.lng IS 'Grados decimales WGS84, 6 decimales; nulo sin ubicación; siempre negativa; Longitud del punto de la jornada';
COMMENT ON COLUMN srp.jornadas.punto_origen IS '''gps'' o ''manual''; nulo sin ubicación; Cómo se obtuvo el punto de la jornada: con «Detectar ubicación» (gps) o escribiendo las coordenadas cuando no hubo señal en el sitio (manual). Lo determina la acción, no una elección';
COMMENT ON COLUMN srp.jornadas.gps_precision_m IS 'Metros enteros; nulo sin detección o con el punto escrito a mano; Margen del GPS al detectar. Existe sólo si punto_origen es gps';
COMMENT ON COLUMN srp.jornadas.alcaldia_cve IS 'cvegeo INEGI (09012); nulo sin detección o en hueco; Derivada de la capa de alcaldías con el punto detectado';
COMMENT ON COLUMN srp.jornadas.alcaldia IS 'Nombre de la alcaldía; nulo sin detección; Va a la franja de la jornada, a Jornadas y al reporte. No sustituye a la alcaldía de cada árbol';
COMMENT ON COLUMN srp.jornadas.colonia_cve IS 'CVEUT IECM; nulo sin detección o donde la capa no tiene colonia; Derivada de la capa de colonias con el punto detectado';
COMMENT ON COLUMN srp.jornadas.colonia IS 'Nombre de la colonia; nulo sin detección; Va a la franja, a Jornadas y al reporte';
COMMENT ON COLUMN srp.jornadas.fecha IS 'AAAA-MM-DD, no posterior a hoy; Día en que empieza la jornada. Sus árboles llevan cada uno su fecha de plantación, desde este día: una jornada puede durar varios días. Al cambiarla, la toman los árboles plantados el día de inicio; no puede quedar después de un árbol plantado otro día';
COMMENT ON COLUMN srp.jornadas.comentarios IS 'Texto libre, hasta 500; '''' si no se escribe; Van al reporte como «Comentarios de la jornada»';
COMMENT ON COLUMN srp.jornadas.cabo_id IS '→ usuarios.id; Titular: quien inició la jornada. No cambia con un relevo; cada árbol queda a nombre de quien lo capturó';
COMMENT ON COLUMN srp.jornadas.organizacion_id IS '→ instituciones.id; La institución que ejecuta la jornada: la de quien la inicia. Se fija al iniciar y no cambia aunque la cuenta cambie de organización. Al abrir, las jornadas sin organización quedan en SEDEMA (asignarOrganizacion). Las de otras instituciones no llevan chófer ni vehículo';
COMMENT ON COLUMN srp.jornadas.estatus IS 'estatus_jornada; Se cierra desde la franja o la revisión; se reabre desde la revisión o con «Registrar árbol»';
COMMENT ON COLUMN srp.jornadas.fecha_inicio IS 'ISO 8601; Ordena las jornadas del día: «Jornada 2 de 3»';
COMMENT ON COLUMN srp.jornadas.fecha_cierre IS 'ISO 8601; Nulo mientras está abierta';
COMMENT ON COLUMN srp.jornadas.encargado_id IS '→ usuarios.id; Para un cabo es él mismo (no se pregunta ni se muestra en el cierre; el reporte lo imprime); quien ve a varias personas lo elige sólo entre los cabos con registros ese día';
COMMENT ON COLUMN srp.jornadas.relevo_id IS '→ usuarios.id; El cabo que registra en lugar del titular: lo elige la coordinación entre los cabos activos de la institución de la jornada, con la jornada abierta. Nulo: registra el titular. Sólo quien registra en la jornada (este cabo o, sin relevo, el titular) agrega árboles en ella';
COMMENT ON COLUMN srp.jornadas.relevos IS '[{ cabo_id → usuarios.id, fecha ISO 8601, por_id → usuarios.id }]; [] sin relevos; Cada relevo hecho, también el que devuelve la jornada al titular: a quién se pasó, cuándo y quién lo hizo. Quien estuvo en un relevo sigue viendo la jornada y todos sus árboles, aunque sólo edita los suyos';
COMMENT ON COLUMN srp.jornadas.solicitante_id IS '→ solicitantes.id; Quién solicita la jornada, del catálogo de solicitantes (Catálogos › Solicitantes), que es aparte del de instituciones. No es quien ejecuta (organizacion_id): quien solicita no es quien planta. Nulo si la jornada es de otro programa o si la instancia no está en el catálogo. Obligatorio, este o solicitante_otro, con el programa «Solicitud especial»';
COMMENT ON COLUMN srp.jornadas.solicitante_otro IS 'Texto ≤ 120; '''' si no aplica; El nombre de la instancia que solicita cuando no está en el catálogo («Otra instancia»). Vacío con solicitante_id o en una jornada de otro programa';
COMMENT ON COLUMN srp.jornadas.solicitud_descripcion IS 'Texto ≤ 500, en varios renglones; '''' si no aplica; De qué se trata la solicitud; obligatoria con el programa «Solicitud especial». Vacía en una jornada de otro programa. Admite varios renglones: ahí cabe la referencia del oficio, si la hay';
COMMENT ON COLUMN srp.jornadas.editado_por_id IS '→ usuarios.id; nulo sin ediciones; Nulo hasta la primera edición, como en las demás tablas';
COMMENT ON COLUMN srp.jornadas.fecha_ultima_edicion IS 'ISO 8601; nulo sin ediciones; Nulo hasta la primera edición, como en las demás tablas';
COMMENT ON COLUMN srp.jornadas.arboles_previstos IS 'Entero 1–9999; Obligatorio al iniciar: cuántos árboles se van a plantar. Jornadas compara los registrados contra los previstos (faltan o sobran) y el reporte los imprime';
COMMENT ON COLUMN srp.jornadas.puntos_revisados IS '→ plantaciones.id; [] si nadie ha revisado; Puntos con aviso (duplicado, lejos, precisión) que alguien confirmó como correctos; el aviso deja de contarse, no se borra. Al mover un árbol a otra jornada su marca sale de ésta';
COMMENT ON COLUMN srp.jornadas.reporte_en IS 'ISO 8601; nulo si no se ha generado o si dejó de estar vigente; Se fija cuando el PDF se entrega (se descarga o se comparte), no al abrir la vista previa. Vuelve a nulo, con constancia en la bitácora, si la jornada se reabre o si uno de sus árboles se elimina, restaura, edita, mueve o sustituye: el reporte se genera de nuevo';
COMMENT ON COLUMN srp.jornadas.carga_id IS 'UUID v4 del lote de carga masiva; nulo en las jornadas iniciadas en campo; Lo pone la carga masiva de Configuración: todas las jornadas de un mismo archivo llevan la misma clave, que también es el entidad_id del renglón «carga» de la bitácora. Una jornada con carga_id no se cuenta como «sin reporte» en Supervisión';
COMMENT ON COLUMN srp.jornadas.personal IS 'Texto libre; Sólo en jornadas de SEDEMA; en las de otras instituciones no se pide y queda vacío';
COMMENT ON COLUMN srp.jornadas.apoyo IS 'Texto libre, varias líneas; Sólo en jornadas de SEDEMA; en las de otras instituciones no se pide y queda vacío';
COMMENT ON COLUMN srp.jornadas.observaciones IS 'Texto libre; Aquí se explica a mano una diferencia contra los árboles previstos';
COMMENT ON COLUMN srp.jornadas.chofer IS 'Texto libre; Sólo en jornadas de SEDEMA; en las de otras instituciones no se pide y queda vacío';
COMMENT ON COLUMN srp.jornadas.vehiculo_modelo IS 'Copia de vehiculos.modelo del vehículo elegido; '''' sin vehículo; Se copia del catálogo al guardar el cierre; no se escribe a mano. La migración 4 quita lo escrito a mano y el campo `vehiculo` de versiones anteriores';
COMMENT ON COLUMN srp.jornadas.vehiculo_placa IS 'Copia de vehiculos.nombre (la placa) del vehículo elegido; '''' sin vehículo; Se copia del catálogo al guardar el cierre; no se escribe a mano';
COMMENT ON COLUMN srp.jornadas.vehiculo_tipo IS 'Copia de vehiculos.tipo_vehiculo del vehículo elegido; '''' sin vehículo; Se copia del catálogo al guardar el cierre; no se escribe a mano';
COMMENT ON COLUMN srp.jornadas.vehiculo_id IS '→ vehiculos.id; El vehículo del catálogo; nulo sin vehículo. Con él se cuentan los que más usa cada encargado. Sólo del catálogo: sin «Otro vehículo»';
COMMENT ON COLUMN srp.jornadas.hora IS 'HH:MM, de 00:00 a 23:59; '''' si no se elige; La aplicación no arma la vista previa del reporte sin ella; '''' en las jornadas que todavía no tienen datos de cierre y en las anteriores a esta regla';
COMMENT ON COLUMN srp.jornadas.cabos_apoyo IS '[{ cabo_id → usuarios.id, desde ISO 8601, por_id → usuarios.id, hasta ISO 8601 o nulo, fin «terminado», «quitado» o nulo }]; [] en una jornada de un solo cabo; Jornada compartida: la abre la Coordinación, que queda como titular, y le agrega cabos activos de su institución, que registran a la vez. Un cabo de apoyo vigente (sin hasta) registra hasta que toca «Terminar mi parte» (fin «terminado») o la Coordinación lo quita (fin «quitado»); volver a marcarlo lo deja vigente otra vez. Cada cabo aparece una vez. Quien fue cabo de apoyo sigue viendo la jornada y todos sus árboles, pero sólo corrige los suyos; no cambia los datos de la jornada ni la cierra';

-- ═══ 03-srp-acceso.sql ═══
-- ACCESO Y BITÁCORA: contraseñas, sesiones y la bitácora que no se edita ni se borra. Contraseñas y
-- sesiones son propias del servidor: el teléfono nunca las recibe, por eso no van en la tabla usuarios,
-- que es la misma del teléfono. Tienen la forma del módulo `acceso` del SIA. Lo corre quien administra la
-- base, dentro de instalar.sql.

-- Una contraseña por cuenta. Nunca se guarda en claro: sólo el resultado de un algoritmo de derivación
-- lento y con sal, con sus parámetros en el mismo texto para poder subirlos después sin perder las
-- contraseñas que ya existen.
CREATE TABLE srp.credenciales (
  usuario_id          uuid         NOT NULL,
  derivada            text         NOT NULL,
  temporal            boolean      NOT NULL,
  temporal_expira_en  timestamptz  NULL,
  intentos_fallidos   integer      NOT NULL DEFAULT 0,
  bloqueada_hasta     timestamptz  NULL,
  cambiada_en         timestamptz  NOT NULL,
  cambiada_por_id     uuid         NOT NULL,
  CONSTRAINT credenciales_pk PRIMARY KEY (usuario_id),
  CONSTRAINT credenciales_intentos CHECK (intentos_fallidos >= 0),
  CONSTRAINT credenciales_temporal_expira CHECK (temporal OR temporal_expira_en IS NULL)
);
COMMENT ON TABLE srp.credenciales IS 'La contraseña de cada cuenta, derivada con sal; nunca en claro. La da y la restablece sólo la Administración global, como temporal de un solo uso.';
COMMENT ON COLUMN srp.credenciales.derivada IS 'Algoritmo, parámetros, sal y resultado en un solo texto.';
COMMENT ON COLUMN srp.credenciales.temporal IS 'Verdadero mientras sea la temporal que dio la Administración: el primer acceso obliga a cambiarla.';
COMMENT ON COLUMN srp.credenciales.intentos_fallidos IS 'Intentos seguidos sin entrar; se anota cada uno antes de verificar y vuelve a 0 al entrar.';
COMMENT ON COLUMN srp.credenciales.bloqueada_hasta IS 'Tras varios intentos fallidos la cuenta no entra hasta esta hora.';
COMMENT ON COLUMN srp.credenciales.cambiada_por_id IS 'La propia cuenta o la Administración global que la restableció.';

-- Una sesión por equipo en que se entra. Del lado del teléfono viaja un testigo al azar en una cookie
-- sólo HTTP; aquí se guarda únicamente su resumen sha256 en hexadecimal, de modo que quien lea la tabla
-- no pueda usarla.
CREATE TABLE srp.sesiones (
  id                 uuid         NOT NULL DEFAULT gen_random_uuid(),
  testigo_resumen    text         NOT NULL,
  usuario_id         uuid         NOT NULL,
  creada_en          timestamptz  NOT NULL DEFAULT now(),
  ultima_actividad   timestamptz  NOT NULL DEFAULT now(),
  expira_en          timestamptz  NOT NULL,
  cerrada_en         timestamptz  NULL,
  motivo_cierre      text         NULL,
  agente             text         NOT NULL DEFAULT '',
  CONSTRAINT sesiones_pk PRIMARY KEY (id),
  CONSTRAINT sesiones_testigo_unico UNIQUE (testigo_resumen),
  CONSTRAINT sesiones_testigo_resumen CHECK (testigo_resumen ~ '^[0-9a-f]{64}$'),
  CONSTRAINT sesiones_motivo_valido CHECK (motivo_cierre IN ('SALIDA', 'VENCIDA', 'CUENTA_DESACTIVADA', 'INSTITUCION_DESACTIVADA', 'CONTRASENA_CAMBIADA', 'CONTRASENA_RESTABLECIDA')),
  CONSTRAINT sesiones_cierre CHECK ((cerrada_en IS NULL) = (motivo_cierre IS NULL))
);
CREATE INDEX sesiones_usuario_id ON srp.sesiones (usuario_id);
COMMENT ON TABLE srp.sesiones IS 'Sesiones abiertas y cerradas. Se guarda el resumen del testigo, no el testigo. Al desactivar una cuenta o su institución, o al cambiar o restablecer la contraseña, se cierran sus sesiones.';
COMMENT ON COLUMN srp.sesiones.agente IS 'Navegador y equipo desde donde se entró, para que la persona reconozca sus sesiones.';

-- EL REGISTRO DE ENTRADAS Y SALIDAS, como `acceso.bitacora` del SIA: cada intento de entrar, logrado o
-- no, cada bloqueo, cada salida y cada cambio de contraseña, con la procedencia de la petición. Es para
-- el forense, no identifica a nadie: la dirección es la que llega al servidor. Lo que la Administración
-- hace con las cuentas (altas, restablecimientos, activaciones) va en srp.bitacora.
CREATE TABLE srp.bitacora_acceso (
  id                 bigint       GENERATED ALWAYS AS IDENTITY,
  momento            timestamptz  NOT NULL DEFAULT now(),
  evento             text         NOT NULL,
  usuario_id         uuid         NULL,
  correo_intentado   text         NULL,
  ip                 inet         NULL,
  agente             text         NULL,
  CONSTRAINT bitacora_acceso_pk PRIMARY KEY (id),
  CONSTRAINT bitacora_acceso_evento CHECK (evento IN ('ENTRADA', 'ENTRADA_FALLIDA', 'BLOQUEO', 'SALIDA', 'CONTRASENA_CAMBIADA')),
  CONSTRAINT bitacora_acceso_correo_intentado CHECK (correo_intentado IS NULL OR length(correo_intentado) <= 254),
  CONSTRAINT bitacora_acceso_quien CHECK (usuario_id IS NULL OR correo_intentado IS NULL),
  CONSTRAINT bitacora_acceso_agente CHECK (agente IS NULL OR length(agente) <= 400)
);
CREATE INDEX bitacora_acceso_usuario_id ON srp.bitacora_acceso (usuario_id, momento);
-- Las entradas fallidas recientes de una misma dirección, que el servicio cuenta antes de verificar nada
CREATE INDEX bitacora_acceso_ip ON srp.bitacora_acceso (ip, momento);
COMMENT ON TABLE srp.bitacora_acceso IS 'Entradas, intentos fallidos, bloqueos, salidas y cambios de contraseña, con su procedencia. Sólo crece; se guarda un año (srp.recortar_acceso).';
COMMENT ON COLUMN srp.bitacora_acceso.usuario_id IS 'La cuenta del intento, si el correo existe. Una cuenta que ya intentó entrar no se elimina: se desactiva.';
COMMENT ON COLUMN srp.bitacora_acceso.correo_intentado IS 'Sólo cuando el correo no tiene cuenta: el identificador no sirve para el forense y el correo sí. Lo que no tiene forma de correo se anota como «(no es un correo)».';
COMMENT ON COLUMN srp.bitacora_acceso.ip IS 'Dirección de origen de la petición, como la da el módulo común de procedencia del SIA.';
ALTER TABLE srp.bitacora_acceso ADD CONSTRAINT bitacora_acceso_usuario_id_fk FOREIGN KEY (usuario_id) REFERENCES srp.usuarios (id) ON DELETE RESTRICT;

-- Al eliminar una cuenta (sólo se puede si no tiene registros) se van con ella su contraseña y sus sesiones
ALTER TABLE srp.credenciales ADD CONSTRAINT credenciales_usuario_id_fk FOREIGN KEY (usuario_id) REFERENCES srp.usuarios (id) ON DELETE CASCADE;
ALTER TABLE srp.credenciales ADD CONSTRAINT credenciales_cambiada_por_id_fk FOREIGN KEY (cambiada_por_id) REFERENCES srp.usuarios (id) DEFERRABLE INITIALLY IMMEDIATE;
ALTER TABLE srp.sesiones ADD CONSTRAINT sesiones_usuario_id_fk FOREIGN KEY (usuario_id) REFERENCES srp.usuarios (id) ON DELETE CASCADE;

-- LAS BITÁCORAS SÓLO CRECEN: la de los cambios y la de las entradas. La cuenta del servicio ya no puede
-- editarlas ni borrarlas por sus permisos; los disparadores lo impiden también a quien administra la
-- base, aunque sea por error. La única excepción es el recorte de un año del registro de entradas, que
-- hace srp.recortar_acceso(), abajo: sólo borra lo que tiene más de un año, y sólo desde esa función.
CREATE FUNCTION srp.bitacora_inmutable() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'DELETE' AND TG_TABLE_NAME = 'bitacora_acceso' THEN
    IF current_setting('srp.recorte_anual', true) = 'si' AND OLD.momento < now() - interval '1 year' THEN
      RETURN OLD;
    END IF;
  END IF;
  RAISE EXCEPTION 'La bitácora del SRP no se edita ni se borra (%)', TG_TABLE_NAME;
END $$;
CREATE TRIGGER bitacora_inmutable BEFORE UPDATE OR DELETE ON srp.bitacora
  FOR EACH ROW EXECUTE FUNCTION srp.bitacora_inmutable();
CREATE TRIGGER bitacora_sin_vaciar BEFORE TRUNCATE ON srp.bitacora
  FOR EACH STATEMENT EXECUTE FUNCTION srp.bitacora_inmutable();
CREATE TRIGGER bitacora_inmutable BEFORE UPDATE OR DELETE ON srp.bitacora_acceso
  FOR EACH ROW EXECUTE FUNCTION srp.bitacora_inmutable();
CREATE TRIGGER bitacora_sin_vaciar BEFORE TRUNCATE ON srp.bitacora_acceso
  FOR EACH STATEMENT EXECUTE FUNCTION srp.bitacora_inmutable();

/* UN AÑO DE REGISTRO DE ENTRADAS Y DE SESIONES. El registro de entradas y las sesiones que ya terminaron
   (cerradas o vencidas) se guardan un año y se borran solos: el servicio llama a esta función una vez al día.
   Corre con los permisos de quien instaló el esquema, porque la cuenta del servicio no borra ninguna de las dos
   tablas; sólo ella puede llamarla, y sólo borra lo que tiene más de un año. Si el SIA fija otro plazo para sus
   sistemas, se cambia aquí. Devuelve cuántos renglones borró de cada una. */
CREATE FUNCTION srp.recortar_acceso(OUT entradas integer, OUT sesiones integer)
  LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, pg_temp
AS $$
BEGIN
  PERFORM set_config('srp.recorte_anual', 'si', true);
  DELETE FROM srp.bitacora_acceso WHERE momento < now() - interval '1 year';
  GET DIAGNOSTICS entradas = ROW_COUNT;
  PERFORM set_config('srp.recorte_anual', '', true);
  DELETE FROM srp.sesiones WHERE coalesce(cerrada_en, expira_en) < now() - interval '1 year';
  GET DIAGNOSTICS sesiones = ROW_COUNT;
END $$;
COMMENT ON FUNCTION srp.recortar_acceso() IS 'Borra el registro de entradas y las sesiones terminadas de hace más de un año. La llama el servicio una vez al día.';

-- El Registro de cambios de Configuración lee la bitácora por tipo, de lo más reciente a lo más antiguo, por
-- páginas: así no recorre la de todos los árboles
CREATE INDEX bitacora_entidad_fecha ON srp.bitacora (entidad, fecha, id);

-- ═══ 04-srp-sobre-territorio.sql ═══
-- EL SRP SOBRE territorio: la derivación de alcaldía, colonia y celda UGA de un punto, el folio que se
-- arma con esa celda, la única capa que es propia del programa y la prioridad que se congela con ella. Lo
-- corre quien administra la base, dentro de instalar.sql.
--
-- Alcaldías, colonias del IECM y malla UGA viven en el esquema compartido territorio, de sólo lectura:
-- existirían aunque el SRP no existiera, así que el SRP no guarda copia. Las colonias prioritarias para
-- reforestar sí son del programa: viven aquí, con su propia geometría, porque son otro marco de colonias
-- (2,243, no las 1,837 del IECM).

-- Qué versión de la capa propia está cargada
CREATE TABLE srp.capas (
  nombre       text         NOT NULL,
  version      text         NOT NULL,
  fecha_corte  text         NOT NULL,
  origen       text         NOT NULL,
  elementos    integer      NOT NULL,
  cargada_en   timestamptz  NOT NULL DEFAULT now(),
  CONSTRAINT capas_pk PRIMARY KEY (nombre),
  CONSTRAINT capas_nombre_valido CHECK (nombre IN ('prioritarias'))
);
COMMENT ON TABLE srp.capas IS 'Versión cargada de la capa propia del SRP, la misma de assets/capas/ en la aplicación.';

CREATE TABLE srp.capa_prioritarias (
  id         integer                       NOT NULL,
  colonia    text                          NOT NULL,
  alcaldia   text                          NOT NULL,
  prioridad  smallint                      NOT NULL,
  geom       geometry(MultiPolygon, 4326)  NOT NULL,
  CONSTRAINT capa_prioritarias_pk PRIMARY KEY (id),
  CONSTRAINT capa_prioritarias_prioridad CHECK (prioridad BETWEEN 0 AND 4)
);
CREATE INDEX capa_prioritarias_geom ON srp.capa_prioritarias USING gist (geom);
COMMENT ON TABLE srp.capa_prioritarias IS 'Colonias prioritarias para reforestar, prioridad 0 (muy baja) a 4 (muy alta). Modelo de priorización propio del programa.';

-- El punto de un árbol o de una jornada. Las tablas guardan latitud y longitud, como el teléfono; el
-- punto se calcula y tiene su índice espacial, sin agregar campos a las tablas.
CREATE FUNCTION srp.punto(lat numeric, lng numeric) RETURNS geometry
  LANGUAGE sql IMMUTABLE PARALLEL SAFE SET search_path FROM CURRENT
  AS $$ SELECT ST_SetSRID(ST_MakePoint(lng::float8, lat::float8), 4326) $$;
CREATE INDEX plantaciones_punto ON srp.plantaciones USING gist (srp.punto(lat, lng));
CREATE INDEX jornadas_punto ON srp.jornadas USING gist (srp.punto(lat, lng));

/* DERIVACIÓN TERRITORIAL: las mismas reglas que la aplicación (js/derivacion.js), sobre territorio.
   · Alcaldía (territorio.alcaldia): la que contiene el punto; el borde cuenta como dentro. Si ninguna
     lo contiene pero hay una a `margen_m` metros o menos, la más cercana, y `fuera_m` dice a cuántos
     metros quedó (al menos 1). La clave es cvegeo ('09015').
   · Celda UGA (territorio.malla_uga_1km): la que lo contiene, y a cuántos metros de su borde cayó.
   · Colonia (territorio.colonias_iecm_2022): entre las que lo contienen, la más pequeña; si no cae en
     ninguna, nula. El nombre va sin espacios dobles, como en la aplicación.
   · Donde dos polígonos empatan (un punto sobre un borde compartido) gana la clave menor, igual que en
     la aplicación, que lleva sus capas en orden de clave.
   · capa_version: la versión vigente de cada capa en territorio.version_capa, con los nombres que
     escribe la aplicación.
   Las distancias se miden sobre el elipsoide; la aplicación usa una proyección local, así que pueden
   diferir en uno o dos metros. */
CREATE FUNCTION srp.derivar(lat numeric, lng numeric, margen_m integer DEFAULT 100)
  RETURNS TABLE (alcaldia_cve text, alcaldia text, colonia_cve text, colonia text, uga text,
                 uga_borde_m integer, capa_version text, dentro boolean, fuera_m integer)
  LANGUAGE sql STABLE PARALLEL SAFE SET search_path FROM CURRENT
AS $$
  WITH p AS (SELECT srp.punto(lat, lng) AS g),
  a AS (
    SELECT x.cvegeo::text AS cve, x.nombre::text AS nombre, NULL::float8 AS d FROM territorio.alcaldia x, p
     WHERE ST_Intersects(x.geom, p.g) ORDER BY x.cvegeo LIMIT 1),
  cerca AS (
    SELECT x.cvegeo::text, x.nombre::text, ST_Distance(x.geom::geography, p.g::geography) FROM territorio.alcaldia x, p
     WHERE NOT EXISTS (SELECT 1 FROM a) AND ST_DWithin(x.geom::geography, p.g::geography, margen_m)
     ORDER BY 3, x.cvegeo LIMIT 1),
  alc AS (SELECT * FROM a UNION ALL SELECT * FROM cerca),
  u AS (
    SELECT x.clave::text AS clave, ST_Distance(ST_Boundary(x.geom)::geography, p.g::geography) AS d
      FROM territorio.malla_uga_1km x, p
     WHERE ST_Intersects(x.geom, p.g) ORDER BY x.clave LIMIT 1),
  col AS (
    SELECT x.cveut::text AS clave, btrim(regexp_replace(x.ut, ' {2,}', ' ', 'g')) AS nombre
      FROM territorio.colonias_iecm_2022 x, p
     WHERE ST_Intersects(x.geom, p.g) ORDER BY ST_Area(x.geom), x.cveut LIMIT 1),
  vigente AS (
    SELECT DISTINCT ON (v.capa) v.capa, v.version FROM territorio.version_capa v
     WHERE v.vigente AND v.capa IN ('alcaldia', 'malla_uga_1km', 'colonias_iecm_2022')
     ORDER BY v.capa, v.cargada_en DESC),
  ver AS (
    SELECT string_agg(n.app || '=' || v.version, ';' ORDER BY n.orden) AS v
      FROM vigente v JOIN (VALUES ('alcaldia', 'alcaldias', 1), ('malla_uga_1km', 'uga', 2), ('colonias_iecm_2022', 'colonias', 3))
        AS n(capa, app, orden) USING (capa))
  SELECT alc.cve, alc.nombre, col.clave, col.nombre, u.clave, round(u.d)::integer, ver.v,
         alc.cve IS NOT NULL, CASE WHEN alc.d IS NULL THEN 0 ELSE greatest(1, round(alc.d))::integer END
    FROM ver LEFT JOIN alc ON true LEFT JOIN u ON true LEFT JOIN col ON true
$$;
COMMENT ON FUNCTION srp.derivar(numeric, numeric, integer) IS 'Alcaldía, colonia y celda UGA de un punto sobre territorio, con las mismas reglas que la aplicación (js/derivacion.js).';

-- EL FOLIO DEL EJEMPLAR: AAA-000-00000, la celda UGA del punto y un consecutivo de esa celda. Lo asigna el
-- servidor una sola vez, al recibir el árbol, en la misma transacción (R3), con el id del árbol como
-- clave (R4). El consecutivo sale de una secuencia por celda, perpetua y que sólo avanza: se lee y se
-- incrementa en un solo paso, nunca con MAX(folio)+1 ni contando árboles (R5). Los huecos se aceptan;
-- repetir un número, no. Al llegar a 99,999 la celda deja de dar folios y el árbol queda PROVISIONAL hasta
-- que el SIA decida (R6). Un folio no cambia ni se anula (R7). EXT-000 es la celda de un punto fuera de la
-- malla.
CREATE TABLE srp.folio_secuencias (
  celda    char(7)  NOT NULL,
  ultimo   integer  NOT NULL,
  CONSTRAINT folio_secuencias_pk PRIMARY KEY (celda),
  CONSTRAINT folio_secuencias_celda CHECK (celda ~ '^[A-Z]{3}-\d{3}$'),
  CONSTRAINT folio_secuencias_rango CHECK (ultimo BETWEEN 1 AND 99999)
);
COMMENT ON TABLE srp.folio_secuencias IS 'El último consecutivo dado en cada celda UGA. Sólo avanza: no se reinicia por ejercicio, administración ni versión.';

-- Lo que se congela al asignar el folio (R8): la celda, la versión de las capas y el punto con que se
-- asignó. Son datos del servidor: el teléfono sólo recibe el folio. Nada de esto se edita ni se borra.
CREATE TABLE srp.folios (
  plantacion_id        uuid          NOT NULL,
  folio                char(13)      NOT NULL,
  folio_uga            char(7)       NOT NULL,
  folio_capa_version   text          NOT NULL,
  folio_lat            numeric(9,6)  NOT NULL,
  folio_lng            numeric(9,6)  NOT NULL,
  asignado_en          timestamptz   NOT NULL DEFAULT now(),
  CONSTRAINT folios_pk PRIMARY KEY (plantacion_id),
  CONSTRAINT folios_folio_unico UNIQUE (folio),
  CONSTRAINT folios_folio_patron CHECK (folio ~ '^[A-Z]{3}-\d{3}-\d{5}$' AND left(folio, 7) = folio_uga)
);
COMMENT ON TABLE srp.folios IS 'Cada folio emitido, con la celda, la versión de capas y el punto congelados al asignarlo (R8).';
ALTER TABLE srp.folios ADD CONSTRAINT folios_plantacion_id_fk FOREIGN KEY (plantacion_id) REFERENCES srp.plantaciones (id) ON DELETE RESTRICT;

CREATE FUNCTION srp.folio_inmutable() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_TABLE_NAME = 'plantaciones' THEN
    IF OLD.folio IS NOT NULL AND NEW.folio IS DISTINCT FROM OLD.folio THEN
      RAISE EXCEPTION 'El folio % no cambia ni se anula', OLD.folio;
    END IF;
    RETURN NEW;
  END IF;
  RAISE EXCEPTION 'Un folio emitido no se edita ni se borra';
END $$;
CREATE TRIGGER plantaciones_folio_inmutable BEFORE UPDATE OF folio ON srp.plantaciones
  FOR EACH ROW EXECUTE FUNCTION srp.folio_inmutable();
CREATE TRIGGER folios_inmutables BEFORE UPDATE OR DELETE ON srp.folios
  FOR EACH ROW EXECUTE FUNCTION srp.folio_inmutable();
CREATE TRIGGER folios_sin_vaciar BEFORE TRUNCATE ON srp.folios
  FOR EACH STATEMENT EXECUTE FUNCTION srp.folio_inmutable();

-- LA PRIORIDAD DE LA COLONIA donde cae un punto, sobre la capa propia: la del polígono que lo contiene; si se
-- enciman, la del más pequeño, como en la aplicación (js/prioritarias.js). Sin colonia de la capa, ninguna fila.
CREATE FUNCTION srp.prioridad(lat numeric, lng numeric)
  RETURNS TABLE (colonia_id integer, prioridad smallint)
  LANGUAGE sql STABLE PARALLEL SAFE SET search_path FROM CURRENT
AS $$
  SELECT x.id, x.prioridad FROM srp.capa_prioritarias x
   WHERE ST_Intersects(x.geom, srp.punto(lat, lng))
   ORDER BY ST_Area(x.geom), x.id LIMIT 1
$$;
COMMENT ON FUNCTION srp.prioridad(numeric, numeric) IS 'Prioridad (0 muy baja a 4 muy alta) de la colonia de la capa propia donde cae el punto.';

-- LA PRIORIDAD CONGELADA: la de cada árbol y cada jornada al recibirlos, con la versión de la capa con que se
-- calculó. Si la capa cambia, lo ya recibido conserva la suya, y un reporte regenerado dice la misma. Sólo se
-- vuelve a calcular si se corrige el punto. Sin colonia de la capa, la prioridad queda vacía: «Sin dato».
CREATE TABLE srp.prioridades (
  id              bigint       GENERATED ALWAYS AS IDENTITY,
  plantacion_id   uuid         NULL,
  jornada_id      uuid         NULL,
  colonia_id      integer      NULL,
  prioridad       smallint     NULL,
  capa_version    text         NOT NULL,
  congelada_en    timestamptz  NOT NULL DEFAULT now(),
  CONSTRAINT prioridades_pk PRIMARY KEY (id),
  CONSTRAINT prioridades_plantacion_unica UNIQUE (plantacion_id),
  CONSTRAINT prioridades_jornada_unica UNIQUE (jornada_id),
  CONSTRAINT prioridades_de_uno CHECK ((plantacion_id IS NULL) <> (jornada_id IS NULL)),
  CONSTRAINT prioridades_rango CHECK (prioridad BETWEEN 0 AND 4),
  CONSTRAINT prioridades_juntas CHECK ((colonia_id IS NULL) = (prioridad IS NULL))
);
COMMENT ON TABLE srp.prioridades IS 'La prioridad de la colonia de cada árbol y de cada jornada, congelada al recibirlos con la versión de la capa.';
-- Es de un árbol o de una jornada, y se va con él
ALTER TABLE srp.prioridades ADD CONSTRAINT prioridades_plantacion_id_fk FOREIGN KEY (plantacion_id) REFERENCES srp.plantaciones (id) ON DELETE CASCADE;
ALTER TABLE srp.prioridades ADD CONSTRAINT prioridades_jornada_id_fk FOREIGN KEY (jornada_id) REFERENCES srp.jornadas (id) ON DELETE CASCADE;

-- ═══ 05-srp-fotografias.sql ═══
-- LAS FOTOGRAFÍAS, fuera de la base. Cada una es un archivo en la carpeta que define el SIA para el SRP
-- (SRP_FOTOS_DIR), fuera de lo que se publica, nombrado por su id, que es el `foto_id` de su árbol. Aquí queda
-- sólo su registro: de qué árbol es, qué tipo de imagen, cuánto pesa, su huella y quién la mandó. Una
-- fotografía no se cambia: una nueva lleva otro id. Lo corre quien administra la base, dentro de instalar.sql.
--
-- El respaldo de la base no incluye los archivos: la carpeta se respalda aparte.

CREATE TABLE srp.fotografias (
  id                uuid         NOT NULL,
  plantacion_id     uuid         NOT NULL,
  tipo              text         NOT NULL,
  bytes             integer      NOT NULL,
  sha256            text         NOT NULL,
  recibida_en       timestamptz  NOT NULL DEFAULT now(),
  recibida_por_id   uuid         NOT NULL,
  CONSTRAINT fotografias_pk PRIMARY KEY (id),
  CONSTRAINT fotografias_tipo CHECK (tipo IN ('image/jpeg', 'image/png', 'image/webp')),
  CONSTRAINT fotografias_bytes CHECK (bytes > 0),
  CONSTRAINT fotografias_sha256 CHECK (sha256 ~ '^[0-9a-f]{64}$')
);
CREATE INDEX fotografias_plantacion_id ON srp.fotografias (plantacion_id);
CREATE INDEX fotografias_recibida_en ON srp.fotografias (recibida_en);
-- Al llegar una fotografía se busca su árbol por el foto_id
CREATE INDEX plantaciones_foto_id ON srp.plantaciones (foto_id) WHERE foto_id IS NOT NULL;
COMMENT ON TABLE srp.fotografias IS 'El registro de cada fotografía recibida; el archivo vive fuera de la base, en la carpeta del SRP, y se respalda aparte.';
COMMENT ON COLUMN srp.fotografias.id IS 'El foto_id del árbol, y el nombre de su archivo.';
COMMENT ON COLUMN srp.fotografias.sha256 IS 'La huella del archivo: un reenvío con la misma huella es la misma fotografía.';
ALTER TABLE srp.fotografias ADD CONSTRAINT fotografias_plantacion_id_fk FOREIGN KEY (plantacion_id) REFERENCES srp.plantaciones (id) ON DELETE RESTRICT;
ALTER TABLE srp.fotografias ADD CONSTRAINT fotografias_recibida_por_id_fk FOREIGN KEY (recibida_por_id) REFERENCES srp.usuarios (id) ON DELETE RESTRICT;

-- ═══ 06-srp-parametros.sql ═══
-- LOS PARÁMETROS: los valores con que el sistema revisa puntos, GPS y envíos (distancias de los avisos de
-- jornada, niveles de precisión, margen del límite de la Ciudad, espera del GPS, hora de atraso, reintento de
-- envío, tamaño de la fotografía y renglones por página). Sus valores de arranque, sus rangos y su
-- descripción viven en el módulo (src/modulos/srp/parametros.ts); aquí sólo los que la Administración global
-- cambió, para todos los teléfonos a la vez. Lo corre quien administra la base, dentro de instalar.sql.

CREATE TABLE srp.parametros (
  clave                  text           NOT NULL,
  valor                  numeric        NOT NULL,
  editado_por_id         uuid           NOT NULL,
  fecha_ultima_edicion   timestamptz    NOT NULL,
  CONSTRAINT parametros_pk PRIMARY KEY (clave),
  CONSTRAINT parametros_clave CHECK (clave ~ '^[A-Z_]+(\.[A-Z_]+)?$')
);
COMMENT ON TABLE srp.parametros IS 'Los parámetros que la Administración global cambió; los demás valen lo de arranque, que dice el módulo.';
COMMENT ON COLUMN srp.parametros.clave IS 'El nombre que tiene en la configuración de la aplicación: JORNADA.DUPLICADO_M, MAPA.GPS_ESPERA_MS…';
ALTER TABLE srp.parametros ADD CONSTRAINT parametros_editado_por_id_fk FOREIGN KEY (editado_por_id) REFERENCES srp.usuarios (id) ON DELETE RESTRICT;

-- ═══ 07-srp-duplicados.sql ═══
-- LOS POSIBLES DUPLICADOS. Al recibir un árbol, el servidor busca otro árbol activo de la misma especie a menos de
-- la incertidumbre combinada de los dos puntos: la suma de sus precisiones, nunca menos que el piso que dice el
-- parámetro de puntos duplicados. Si es de la misma institución, se lo avisa a quien lo mandó. Si es de otra, recibe el
-- árbol de todos modos y anota la pareja en la bandeja que atiende la Administración global: ninguna de las
-- dos instituciones ve esa marca ni los datos de la otra. Lo corre quien administra la base, dentro de
-- instalar.sql.

-- La peor precisión registrada, que da el tamaño de la búsqueda, sale de este índice sin recorrer la tabla
CREATE INDEX plantaciones_gps_precision_m ON srp.plantaciones (gps_precision_m);

-- LA ESPECIE DE UN ÁRBOL, para comparar: la del catálogo o, si se escribió en «Otra especie», ese texto sin
-- acentos, mayúsculas ni espacios en los extremos, como lo compara la aplicación (js/jornadas.js)
CREATE FUNCTION srp.especie_clave(especie_id text, especie_otra text)
  RETURNS text LANGUAGE sql IMMUTABLE PARALLEL SAFE
AS $$
  SELECT coalesce(nullif(especie_id, ''), 'otra:' || lower(btrim(regexp_replace(normalize(coalesce(especie_otra, ''), NFD), '[\u0300-\u036f]', '', 'g'))))
$$;
COMMENT ON FUNCTION srp.especie_clave(text, text) IS 'La especie de un árbol para compararla: su id del catálogo, u «otra:» y lo escrito sin acentos ni mayúsculas.';

-- LOS VECINOS DE UN ÁRBOL que podrían ser el mismo: el más cercano de su institución y el más cercano de otra,
-- activos, de la misma especie y a menos de la incertidumbre combinada. Un árbol distinto a pocos metros es lo
-- normal en una banqueta o un parque; el mismo árbol registrado dos veces casi siempre lleva la misma especie.
-- Quedan fuera los de su misma jornada, que el teléfono revisa con sus propios avisos. La institución de un
-- árbol es la de quien lo capturó. Si el árbol no está activo, ninguna fila.
CREATE FUNCTION srp.vecinos(arbol uuid, piso_m numeric)
  RETURNS TABLE (misma_institucion boolean, cercano_id uuid, distancia_m numeric, umbral_m numeric)
  LANGUAGE sql STABLE PARALLEL SAFE SET search_path FROM CURRENT
AS $$
  WITH x AS (
    SELECT p.id, p.jornada_id, srp.punto(p.lat, p.lng) AS g, coalesce(p.gps_precision_m, 0) AS pr, u.organizacion_id AS org,
           srp.especie_clave(p.especie_id, p.especie_otra) AS especie
      FROM srp.plantaciones p JOIN srp.usuarios u ON u.id = p.cabo_id
     WHERE p.id = arbol AND p.estatus = 'activo'
  ),
  -- La caja que se busca en el índice del punto alcanza al vecino de peor precisión. En la Ciudad un grado mide
  -- más de 100 km, así que dividir los metros entre 100,000 da una caja un poco mayor que la necesaria
  caja AS (
    SELECT ST_Expand(x.g, greatest(x.pr + coalesce((SELECT max(gps_precision_m) FROM srp.plantaciones), 0), piso_m) / 100000.0) AS b FROM x
  ),
  cerca AS (
    SELECT uy.organizacion_id = x.org AS misma, y.id,
           ST_Distance(x.g::geography, srp.punto(y.lat, y.lng)::geography) AS d,
           greatest(x.pr + coalesce(y.gps_precision_m, 0), piso_m) AS umbral
      FROM x, caja, srp.plantaciones y JOIN srp.usuarios uy ON uy.id = y.cabo_id
     WHERE srp.punto(y.lat, y.lng) && caja.b
       AND y.estatus = 'activo' AND y.id <> x.id AND y.jornada_id IS DISTINCT FROM x.jornada_id
       AND srp.especie_clave(y.especie_id, y.especie_otra) = x.especie
  )
  SELECT DISTINCT ON (misma) misma, id, round(d::numeric, 1), round(umbral::numeric, 1)
    FROM cerca WHERE d < umbral
   ORDER BY misma, d, id
$$;
COMMENT ON FUNCTION srp.vecinos(uuid, numeric) IS 'El árbol activo más cercano de la misma institución y el de otra, de otra jornada y de la misma especie, a menos de la suma de las precisiones de los dos puntos (con piso).';

-- LA BANDEJA: cada pareja de árboles de la misma especie y de instituciones distintas que podrían ser el mismo,
-- una sola vez. La
-- Administración global la revisa y dice si es el mismo árbol o son distintos; una revisión no se cambia. Un
-- árbol que se elimina deja de estar pendiente, porque ya no cuenta dos veces.
CREATE TABLE srp.duplicados (
  id               bigint        GENERATED ALWAYS AS IDENTITY,
  plantacion_id    uuid          NOT NULL,
  cercano_id       uuid          NOT NULL,
  distancia_m      numeric(9,1)  NOT NULL,
  umbral_m         numeric(9,1)  NOT NULL,
  detectado_en     timestamptz   NOT NULL DEFAULT now(),
  resolucion       text          NULL,
  nota             text          NOT NULL DEFAULT '',
  revisado_por_id  uuid          NULL,
  revisado_en      timestamptz   NULL,
  CONSTRAINT duplicados_pk PRIMARY KEY (id),
  CONSTRAINT duplicados_pareja_distinta CHECK (plantacion_id <> cercano_id),
  CONSTRAINT duplicados_resolucion CHECK (resolucion IN ('mismo', 'distintos')),
  CONSTRAINT duplicados_revision CHECK ((resolucion IS NULL) = (revisado_por_id IS NULL) AND (resolucion IS NULL) = (revisado_en IS NULL)),
  CONSTRAINT duplicados_nota CHECK (length(nota) <= 500)
);
CREATE UNIQUE INDEX duplicados_pareja ON srp.duplicados (least(plantacion_id, cercano_id), greatest(plantacion_id, cercano_id));
CREATE INDEX duplicados_cercano_id ON srp.duplicados (cercano_id);
CREATE INDEX duplicados_pendientes ON srp.duplicados (id) WHERE resolucion IS NULL;
COMMENT ON TABLE srp.duplicados IS 'Parejas de árboles de instituciones distintas que podrían ser el mismo: la bandeja de revisión de la Administración global.';
COMMENT ON COLUMN srp.duplicados.plantacion_id IS 'El árbol que llegó.';
COMMENT ON COLUMN srp.duplicados.cercano_id IS 'El de otra institución que ya estaba cerca.';
COMMENT ON COLUMN srp.duplicados.resolucion IS 'mismo: los dos registros son un solo árbol; distintos: son dos árboles. Vacío mientras está pendiente.';
-- La pareja se va con sus árboles
ALTER TABLE srp.duplicados ADD CONSTRAINT duplicados_plantacion_id_fk FOREIGN KEY (plantacion_id) REFERENCES srp.plantaciones (id) ON DELETE CASCADE;
ALTER TABLE srp.duplicados ADD CONSTRAINT duplicados_cercano_id_fk FOREIGN KEY (cercano_id) REFERENCES srp.plantaciones (id) ON DELETE CASCADE;
ALTER TABLE srp.duplicados ADD CONSTRAINT duplicados_revisado_por_id_fk FOREIGN KEY (revisado_por_id) REFERENCES srp.usuarios (id) ON DELETE RESTRICT;

-- ═══ 08-srp-cargas.sql ═══
-- LA CARGA MASIVA DEL HISTÓRICO: cada lote que sube la Administración global desde un archivo.
--
-- Un lote llega en tandas: cada tanda guarda sus árboles y sus jornadas con su folio, pero nada del lote se ve
-- mientras no esté completo. Al confirmar que llegaron todas, el lote se ve entero. Deshacerlo lo oculta: sus
-- árboles quedan eliminados y sus jornadas dejan de verse. No se borra nada, porque un árbol con folio no se
-- borra (R8): su folio no se vuelve a usar.

CREATE TABLE srp.cargas (
  id               uuid          NOT NULL,
  estado           text          NOT NULL DEFAULT 'subiendo',
  archivo          text          NOT NULL,
  arboles          integer       NOT NULL DEFAULT 0,
  jornadas         integer       NOT NULL DEFAULT 0,
  instituciones    integer       NOT NULL DEFAULT 0,
  creada_por_id    uuid          NOT NULL,
  creada_en        timestamptz   NOT NULL DEFAULT now(),
  completa_en      timestamptz   NULL,
  deshecha_por_id  uuid          NULL,
  deshecha_en      timestamptz   NULL,
  CONSTRAINT cargas_pk PRIMARY KEY (id),
  CONSTRAINT cargas_estado_valido CHECK (estado IN ('subiendo', 'completa', 'deshecha')),
  CONSTRAINT cargas_deshecha_con_quien CHECK ((estado = 'deshecha') = (deshecha_por_id IS NOT NULL AND deshecha_en IS NOT NULL))
);
COMMENT ON TABLE srp.cargas IS 'Cada lote de carga masiva: subiendo (no se ve), completa (se ve) o deshecha (oculta, con sus árboles eliminados). La clave es el carga_id de sus jornadas.';
COMMENT ON COLUMN srp.cargas.estado IS 'subiendo: llegan sus tandas y nada se ve; completa: se ve entero; deshecha: oculto, sus árboles eliminados';
ALTER TABLE srp.cargas ADD CONSTRAINT cargas_creada_por_id_fk FOREIGN KEY (creada_por_id) REFERENCES srp.usuarios (id);
ALTER TABLE srp.cargas ADD CONSTRAINT cargas_deshecha_por_id_fk FOREIGN KEY (deshecha_por_id) REFERENCES srp.usuarios (id);
CREATE INDEX jornadas_carga_id_idx ON srp.jornadas (carga_id) WHERE carga_id IS NOT NULL;

-- Lo que no se ve: las jornadas de un lote que no está completo, y sus árboles
CREATE FUNCTION srp.de_carga_oculta(carga uuid) RETURNS boolean
  LANGUAGE sql STABLE PARALLEL SAFE SET search_path FROM CURRENT
AS $$
  SELECT carga IS NOT NULL AND EXISTS (SELECT 1 FROM srp.cargas k WHERE k.id = carga AND k.estado <> 'completa')
$$;
COMMENT ON FUNCTION srp.de_carga_oculta(uuid) IS 'Si una jornada con ese carga_id no se ve: su lote todavía sube o se deshizo. Sin lote registrado, se ve.';

-- ═══ 09-srp-calles.sql ═══
-- LA CALLE DE CADA ÁRBOL, sobre territorio.calles (la capa de calles de la Ciudad de México, paquete calles-cdmx).
-- Lo corre quien administra la base, dentro de instalar.sql.
--
-- La capa vive en territorio, de sólo lectura, como las alcaldías y las colonias: el SRP no guarda copia. Puede
-- no estar instalada todavía: entonces los árboles quedan sin calle (calle_estado nulo) y nada falla. Después
-- de instalar la capa, o una versión nueva, quien administra la base corre una vez, fuera de una transacción:
--
--   CALL srp.recalcular_calles();
--
-- y cada árbol sin calle, o calculado con otra versión, recibe la suya.

/* LA VERSIÓN VIGENTE DE LA CAPA: la que el SIA tiene por vigente en territorio.version_capa, como las alcaldías,
   las colonias y la malla UGA (04-srp-sobre-territorio.sql). Si el SIA todavía no la registró ahí, la del propio
   paquete de calles (territorio.calles_version). Nula si no hay ninguna. */
CREATE FUNCTION srp.version_calles() RETURNS text
  LANGUAGE plpgsql STABLE PARALLEL SAFE SET search_path FROM CURRENT
AS $$
DECLARE
  v text;
BEGIN
  SELECT x.version INTO v FROM territorio.version_capa x WHERE x.capa = 'calles' AND x.vigente ORDER BY x.cargada_en DESC LIMIT 1;
  IF v IS NULL AND to_regclass('territorio.calles_version') IS NOT NULL THEN
    SELECT x.version INTO v FROM territorio.calles_version x ORDER BY x.instalada DESC LIMIT 1;
  END IF;
  RETURN v;
END $$;
COMMENT ON FUNCTION srp.version_calles() IS 'La versión vigente de territorio.calles: la de territorio.version_capa y, si el SIA no la ha registrado ahí, la del paquete de calles.';

/* LA CALLE DE UN PUNTO: el tramo más cercano, a 40 m o menos, con las mismas reglas que el servidor simulado de
   la versión de prueba (js/calles.js calcular).
   · Entre los 12 tramos más cercanos en grados, el de menor distancia sobre el elipsoide; si empatan, la clave
     menor. A más de 40 m: «lejos», sin tramo.
   · Esquina: otro tramo de otra calle (otra llave) a menos de 4 m más que el elegido; el más cercano de ellos.
   · Un tramo sin nombre se llama «calle sin nombre», como sugiere la capa.
   · calle_version: la versión vigente de la capa (srp.version_calles).
   Sin la capa, o sin punto, una fila vacía: el árbol queda por calcular. */
CREATE FUNCTION srp.calle(lat numeric, lng numeric)
  RETURNS TABLE (calle_estado text, calle_clave text, calle_version text, calle text, calle_entre_1 text, calle_entre_2 text,
                 calle_esquina text, vialidad_red text, vialidad_tipo text, calle_atiende text, calle_llave text, calle_distancia_m integer)
  LANGUAGE plpgsql STABLE PARALLEL SAFE SET search_path FROM CURRENT
AS $$
#variable_conflict use_column
DECLARE
  p geometry;
  v text;
BEGIN
  IF lat IS NULL OR lng IS NULL OR to_regclass('territorio.calles') IS NULL THEN
    RETURN QUERY SELECT NULL::text, NULL::text, NULL::text, NULL::text, NULL::text, NULL::text, NULL::text, NULL::text, NULL::text, NULL::text, NULL::text, NULL::integer;
    RETURN;
  END IF;
  p := srp.punto(lat, lng);
  v := srp.version_calles();
  RETURN QUERY
  WITH cerca AS (
    SELECT c.clave, c.nombre, c.entre_1, c.entre_2, c.red_vial, c.tipo_via, c.atiende, c.llave, ST_Distance(c.geom::geography, p::geography) AS m
      FROM territorio.calles c ORDER BY c.geom <-> p LIMIT 12),
  t AS (SELECT * FROM cerca x WHERE x.m <= 40 ORDER BY x.m, x.clave LIMIT 1),
  e AS (
    SELECT coalesce(x.nombre, 'calle sin nombre') AS nombre FROM cerca x, t
     WHERE x.clave <> t.clave AND x.llave IS DISTINCT FROM t.llave AND x.m - t.m < 4 ORDER BY x.m, x.clave LIMIT 1)
  SELECT CASE WHEN t.clave IS NULL THEN 'lejos' ELSE 'ok' END, t.clave, v,
         CASE WHEN t.clave IS NULL THEN NULL ELSE coalesce(t.nombre, 'calle sin nombre') END, t.entre_1, t.entre_2, e.nombre,
         t.red_vial, t.tipo_via, t.atiende, t.llave, round(t.m)::integer
    FROM (SELECT 1) uno LEFT JOIN t ON true LEFT JOIN e ON true;
END $$;
COMMENT ON FUNCTION srp.calle(numeric, numeric) IS 'La calle de un punto sobre territorio.calles: el tramo más cercano a 40 m o menos, entre qué calles va, su red vial y quién la atiende. Vacía si la capa no está instalada.';

-- Al recibir un árbol y al corregir su punto, la base pone su calle: vale aunque alguien escriba sin pasar por la
-- aplicación, y lo que mande el teléfono en esos campos no cuenta
CREATE FUNCTION srp.poner_calle() RETURNS trigger
  LANGUAGE plpgsql SET search_path FROM CURRENT
AS $$
BEGIN
  SELECT x.calle_estado, x.calle_clave, x.calle_version, x.calle, x.calle_entre_1, x.calle_entre_2, x.calle_esquina, x.vialidad_red, x.vialidad_tipo,
         x.calle_atiende, x.calle_llave, x.calle_distancia_m
    INTO NEW.calle_estado, NEW.calle_clave, NEW.calle_version, NEW.calle, NEW.calle_entre_1, NEW.calle_entre_2, NEW.calle_esquina, NEW.vialidad_red,
         NEW.vialidad_tipo, NEW.calle_atiende, NEW.calle_llave, NEW.calle_distancia_m
    FROM srp.calle(NEW.lat, NEW.lng) x;
  RETURN NEW;
END $$;
CREATE TRIGGER plantaciones_calle_alta BEFORE INSERT ON srp.plantaciones
  FOR EACH ROW EXECUTE FUNCTION srp.poner_calle();
CREATE TRIGGER plantaciones_calle_punto BEFORE UPDATE OF lat, lng ON srp.plantaciones
  FOR EACH ROW WHEN (NEW.lat IS DISTINCT FROM OLD.lat OR NEW.lng IS DISTINCT FROM OLD.lng) EXECUTE FUNCTION srp.poner_calle();

/* Después de instalar la capa, o una versión nueva: calcula la calle de cada árbol sin calle o de otra versión, por
   tandas de 2,000 árboles, y confirma cada tanda. Si se interrumpe, lo confirmado se queda; se vuelve a correr y
   sigue con lo que falta. Es un procedimiento, no una función, para poder confirmar por tandas: se llama con CALL
   fuera de una transacción abierta, y no lleva su propia ruta de búsqueda porque un procedimiento que confirma no
   puede tenerla; todo lo que usa va con su esquema. Avisa cuántos lleva y devuelve cuántos calculó. */
CREATE PROCEDURE srp.recalcular_calles(INOUT calculados integer DEFAULT 0)
  LANGUAGE plpgsql
AS $$
DECLARE
  v text;
  n integer;
BEGIN
  IF pg_catalog.to_regclass('territorio.calles') IS NULL THEN
    RAISE EXCEPTION 'territorio.calles no está instalada: primero se instala la capa de calles';
  END IF;
  calculados := 0;
  LOOP
    -- La versión se vuelve a leer en cada tanda: si cambia a la mitad, se sigue con la nueva y el ciclo termina
    v := srp.version_calles();
    UPDATE srp.plantaciones x
       SET (calle_estado, calle_clave, calle_version, calle, calle_entre_1, calle_entre_2, calle_esquina, vialidad_red, vialidad_tipo,
            calle_atiende, calle_llave, calle_distancia_m) = (SELECT * FROM srp.calle(x.lat, x.lng))
     WHERE x.id IN (SELECT y.id FROM srp.plantaciones y WHERE y.calle_version IS DISTINCT FROM v LIMIT 2000);
    GET DIAGNOSTICS n = ROW_COUNT;
    EXIT WHEN n = 0;
    calculados := calculados + n;
    COMMIT;
    RAISE NOTICE 'Calle calculada: % árboles', calculados;
  END LOOP;
END $$;
COMMENT ON PROCEDURE srp.recalcular_calles(integer) IS 'Calcula, por tandas de 2,000 confirmadas una por una, la calle de los árboles sin calle o calculados con otra versión de territorio.calles. La corre quien administra la base, con CALL, después de instalar o actualizar la capa.';

-- ═══ 10-srp-rol-y-grants.sql ═══
-- LA CUENTA DEL SERVICIO · srp_api, con lo mínimo para operar. Lo corre quien administra la base, al
-- final de instalar.sql, y anota la versión 1 del esquema.
--
-- La cuenta se crea SIN contraseña. Después, fuera de este guion:
--   1. quien administra la base le pone contraseña de forma interactiva (\password srp_api en psql),
--      para que no quede en ningún registro;
--   2. se habilita su entrada cifrada en la configuración de acceso de PostgreSQL;
--   3. se anotan SRP_DB_USER y SRP_DB_PASS en el archivo de entorno del backend;
--   4. y sólo entonces se despliega el backend con el módulo: sin sus variables, el módulo no arranca.
-- La contraseña nunca va en este guion ni en el repositorio.
--
-- Lo que puede:
--   · Usar el esquema srp, sin crear nada en él ni fuera de él.
--   · Leer, agregar y cambiar renglones de las tablas de datos. Borra sólo lo que el sistema permite
--     borrar: un valor de catálogo o una cuenta sin uso, y una jornada sin árboles. Al borrar una cuenta,
--     la base se lleva su contraseña y sus sesiones; la cuenta del servicio no las borra por su cuenta, y
--     un árbol nunca se borra: se marca eliminado.
--   · Cada consulta suya termina en 50 segundos o se cancela: el servidor web corta la API al minuto, y
--     así nada sigue corriendo en la base después.
--   · Registrar los lotes de carga masiva y marcarlos completos o deshechos; no los borra.
--   · A las bitácoras (la de cambios y la de entradas), sólo leerlas y agregarles renglones.
--   · Avanzar la secuencia de folios de cada celda y agregar folios; un folio emitido no lo cambia ni lo borra.
--   · Registrar fotografías; no las cambia ni las borra.
--   · Leer y cambiar los parámetros.
--   · Congelar la prioridad de la colonia de cada árbol y cada jornada al recibirlos.
--   · Buscar los vecinos de un árbol, anotar en la bandeja los posibles duplicados entre instituciones y
--     marcarlos revisados; no los borra.
--   · Leer territorio, por el rol de grupo territorio_lectura, y la capa propia de prioritarias.
--   · Calcular la calle de un árbol; volver a calcular la de todos lo hace quien administra la base.
--   · Recortar una vez al día el registro de entradas y las sesiones de hace más de un año, sólo con la función
--     que lo hace (srp.recortar_acceso).
-- Lo que no puede: crear, cambiar o borrar tablas; editar o borrar la bitácora; anotar versiones del
-- esquema; escribir en territorio; ver otros esquemas del SIA.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'srp_api') THEN
    -- INHERIT: sin él, el permiso de territorio_lectura no le llega
    CREATE ROLE srp_api LOGIN INHERIT
      NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS
      CONNECTION LIMIT 20;
  END IF;
END $$;

ALTER ROLE srp_api SET search_path = srp, public;
ALTER ROLE srp_api SET statement_timeout = '50s';

REVOKE CREATE ON SCHEMA public FROM srp_api;

GRANT USAGE ON SCHEMA srp TO srp_api;

GRANT SELECT, INSERT, UPDATE ON srp.plantaciones, srp.credenciales, srp.sesiones TO srp_api;
GRANT SELECT, INSERT, UPDATE, DELETE ON
  srp.jornadas, srp.usuarios,
  srp.programas, srp.areas, srp.especies, srp.vehiculos, srp.instituciones, srp.solicitantes
TO srp_api;

GRANT SELECT, INSERT ON srp.bitacora, srp.bitacora_acceso TO srp_api;

-- El folio: la secuencia de cada celda avanza; los folios emitidos sólo se agregan
GRANT SELECT, INSERT, UPDATE ON srp.folio_secuencias TO srp_api;
GRANT SELECT, INSERT ON srp.folios TO srp_api;

-- El registro de las fotografías sólo crece: una fotografía no se cambia
GRANT SELECT, INSERT ON srp.fotografias TO srp_api;

-- La prioridad congelada: se agrega al recibir y se vuelve a calcular si se corrige el punto
GRANT SELECT, INSERT, UPDATE ON srp.prioridades TO srp_api;

-- La bandeja de posibles duplicados: se anota al recibir y la Administración la revisa
GRANT SELECT, INSERT, UPDATE ON srp.duplicados TO srp_api;

-- Los lotes de carga masiva: se registran, se completan y se deshacen; ninguno se borra
GRANT SELECT, INSERT, UPDATE ON srp.cargas TO srp_api;

-- Los parámetros: la Administración los cambia; volver al valor de arranque es escribirlo
GRANT SELECT, INSERT, UPDATE ON srp.parametros TO srp_api;
GRANT SELECT ON srp.migraciones TO srp_api;
-- El sello de los datos, sólo para leerlo: lo cambia el guion de vaciado, que corre quien administra la base
GRANT SELECT ON srp.sello TO srp_api;

-- La capa propia sólo se lee: la carga quien administra la base
GRANT SELECT ON srp.capas, srp.capa_prioritarias TO srp_api;
REVOKE ALL ON FUNCTION srp.punto(numeric, numeric), srp.derivar(numeric, numeric, integer), srp.prioridad(numeric, numeric), srp.especie_clave(text, text), srp.vecinos(uuid, numeric), srp.de_carga_oculta(uuid), srp.calle(numeric, numeric), srp.version_calles(), srp.recortar_acceso(), srp.sello_nuevo() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION srp.punto(numeric, numeric), srp.derivar(numeric, numeric, integer), srp.prioridad(numeric, numeric), srp.especie_clave(text, text), srp.vecinos(uuid, numeric), srp.de_carga_oculta(uuid), srp.calle(numeric, numeric), srp.version_calles(), srp.recortar_acceso() TO srp_api;
-- Volver a calcular la calle de todos los árboles es de quien administra la base, después de instalar la capa
REVOKE ALL ON PROCEDURE srp.recalcular_calles(integer) FROM PUBLIC;

-- territorio, de sólo lectura, como cualquier módulo del SIA
GRANT territorio_lectura TO srp_api;

INSERT INTO srp.migraciones (version, nombre)
VALUES (1, 'Instalación de la versión 1.0.0: diez tablas del SRP, contraseñas, sesiones, registro de entradas, prioritarias, derivación sobre territorio, folio, fotografías, parámetros, prioridad congelada, posibles duplicados, lotes de carga masiva, la calle de cada árbol, la jornada compartida y el sello de los datos')
ON CONFLICT (version) DO NOTHING;

/*
  VERIFICACIÓN · como srp_api, no como quien administra la base. En psql, conectado como quien la administra:
      SET ROLE srp_api;
      SELECT current_user;                                       -- srp_api: si dice otra cuenta, NO siga
  y al terminar, RESET ROLE. (También sirve entrar como srp_api desde el servidor de aplicaciones.)

  Debe funcionar:
      SELECT count(*) FROM srp.plantaciones;
      SELECT count(*) FROM territorio.alcaldia;                  -- 16, por territorio_lectura
      SELECT * FROM srp.derivar(19.4326, -99.1332);              -- Cuauhtémoc, su colonia y su celda
      SELECT * FROM srp.calle(19.4326, -99.1332);                -- su calle, si territorio.calles está instalada
      SELECT srp.version_calles();                               -- la versión vigente de la capa de calles
      SELECT has_table_privilege('srp.bitacora', 'INSERT');      -- t
      SELECT has_table_privilege('srp.bitacora_acceso', 'INSERT');  -- t
      SELECT rolconfig FROM pg_roles WHERE rolname = 'srp_api';  -- trae statement_timeout=50s

  Debe fallar (permiso denegado); si alguna pasa, la cuenta quedó abierta de más. Cada una va en su propia transacción
  que se deshace: si por error se corre como quien administra la base, no cambia nada:
      BEGIN; UPDATE srp.bitacora SET detalle = 'x'; ROLLBACK;
      BEGIN; DELETE FROM srp.bitacora; ROLLBACK;
      BEGIN; DELETE FROM srp.bitacora_acceso; ROLLBACK;
      BEGIN; DELETE FROM srp.folios; ROLLBACK;
      BEGIN; DELETE FROM srp.fotografias; ROLLBACK;
      BEGIN; DELETE FROM srp.duplicados; ROLLBACK;
      BEGIN; DELETE FROM srp.cargas; ROLLBACK;
      BEGIN; DELETE FROM srp.plantaciones; ROLLBACK;
      BEGIN; DELETE FROM srp.sesiones; ROLLBACK;
      BEGIN; TRUNCATE srp.plantaciones; ROLLBACK;
      BEGIN; CREATE TABLE srp.otra (x int); ROLLBACK;
      BEGIN; CREATE TABLE public.otra (x int); ROLLBACK;
      BEGIN; INSERT INTO srp.migraciones VALUES (2, 'x'); ROLLBACK;
      CALL srp.recalcular_calles();                              -- solo: confirma por tandas y no corre dentro de BEGIN
      BEGIN; UPDATE territorio.alcaldia SET nombre = 'x'; ROLLBACK;

  Y el control global, que debe dar 0: ningún permiso directo fuera de srp
      SELECT count(*) FROM information_schema.role_table_grants
       WHERE grantee = 'srp_api' AND table_schema <> 'srp';
*/

COMMIT;
