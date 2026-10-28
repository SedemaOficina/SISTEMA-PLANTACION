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
