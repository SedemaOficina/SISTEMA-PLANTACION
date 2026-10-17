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
