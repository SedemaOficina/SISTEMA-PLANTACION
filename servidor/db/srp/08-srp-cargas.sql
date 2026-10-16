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
