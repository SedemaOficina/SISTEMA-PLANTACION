-- ACCESO: contraseñas y sesiones. Son propias del servidor: el teléfono nunca las recibe, por eso no
-- van en la tabla usuarios, que es la misma del teléfono. Lo corre quien administra la base, dentro de
-- instalar.sql.

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
COMMENT ON COLUMN srp.credenciales.intentos_fallidos IS 'Intentos fallidos seguidos; vuelve a 0 al entrar.';
COMMENT ON COLUMN srp.credenciales.bloqueada_hasta IS 'Tras varios intentos fallidos la cuenta no entra hasta esta hora.';
COMMENT ON COLUMN srp.credenciales.cambiada_por_id IS 'La propia cuenta o la Administración global que la restableció.';

-- Una sesión por equipo en que se entra. Del lado del teléfono viaja un testigo al azar en una cookie
-- sólo HTTP; aquí se guarda únicamente su resumen, de modo que quien lea la tabla no pueda usarla.
CREATE TABLE srp.sesiones (
  id                 uuid         NOT NULL DEFAULT gen_random_uuid(),
  testigo_resumen    bytea        NOT NULL,
  usuario_id         uuid         NOT NULL,
  creada_en          timestamptz  NOT NULL DEFAULT now(),
  ultima_actividad   timestamptz  NOT NULL DEFAULT now(),
  expira_en          timestamptz  NOT NULL,
  cerrada_en         timestamptz  NULL,
  motivo_cierre      text         NULL,
  agente             text         NOT NULL DEFAULT '',
  CONSTRAINT sesiones_pk PRIMARY KEY (id),
  CONSTRAINT sesiones_testigo_unico UNIQUE (testigo_resumen),
  CONSTRAINT sesiones_motivo_valido CHECK (motivo_cierre IN ('SALIDA', 'VENCIDA', 'CUENTA_DESACTIVADA', 'INSTITUCION_DESACTIVADA', 'CONTRASENA_CAMBIADA', 'CONTRASENA_RESTABLECIDA')),
  CONSTRAINT sesiones_cierre CHECK ((cerrada_en IS NULL) = (motivo_cierre IS NULL))
);
CREATE INDEX sesiones_usuario_id ON srp.sesiones (usuario_id);
COMMENT ON TABLE srp.sesiones IS 'Sesiones abiertas y cerradas. Se guarda el resumen del testigo, no el testigo. Al desactivar una cuenta o su institución, o al cambiar o restablecer la contraseña, se cierran sus sesiones.';
COMMENT ON COLUMN srp.sesiones.agente IS 'Navegador y equipo desde donde se entró, para que la persona reconozca sus sesiones.';

-- Al eliminar una cuenta (sólo se puede si no tiene registros) se van con ella su contraseña y sus sesiones
ALTER TABLE srp.credenciales ADD CONSTRAINT credenciales_usuario_id_fk FOREIGN KEY (usuario_id) REFERENCES srp.usuarios (id) ON DELETE CASCADE;
ALTER TABLE srp.credenciales ADD CONSTRAINT credenciales_cambiada_por_id_fk FOREIGN KEY (cambiada_por_id) REFERENCES srp.usuarios (id) DEFERRABLE INITIALLY IMMEDIATE;
ALTER TABLE srp.sesiones ADD CONSTRAINT sesiones_usuario_id_fk FOREIGN KEY (usuario_id) REFERENCES srp.usuarios (id) ON DELETE CASCADE;
