-- Tabla de relación muchos a muchos entre evaluaciones y proveedores
CREATE TABLE IF NOT EXISTS evaluation_vendors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  evaluation_id uuid REFERENCES evaluations(id) ON DELETE CASCADE NOT NULL,
  vendor_id uuid REFERENCES vendors(id) ON DELETE CASCADE NOT NULL,
  assigned_at timestamptz DEFAULT now() NOT NULL,
  assigned_by uuid REFERENCES profiles(id),
  status text DEFAULT 'pending',
  completed_at timestamptz,
  metadata jsonb DEFAULT '{}'::jsonb,
  UNIQUE(evaluation_id, vendor_id)
);

-- Indices para optimizar consultas frecuentes
CREATE INDEX IF NOT EXISTS idx_evaluation_vendors_evaluation_id ON evaluation_vendors(evaluation_id);
CREATE INDEX IF NOT EXISTS idx_evaluation_vendors_vendor_id ON evaluation_vendors(vendor_id);

-- Habilitar RLS
ALTER TABLE evaluation_vendors ENABLE ROW LEVEL SECURITY;

-- Políticas de seguridad
CREATE POLICY "Los administradores pueden gestionar asignaciones" ON evaluation_vendors
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND EXISTS (
        SELECT 1 FROM roles
        WHERE roles.id = users.role_id
        AND roles.name = 'admin'
      )
    )
  );

CREATE POLICY "Los evaluadores pueden ver sus asignaciones" ON evaluation_vendors
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM evaluations
      WHERE evaluations.id = evaluation_vendors.evaluation_id
      AND evaluations.evaluator_id = auth.uid()
    )
  );

CREATE POLICY "Los usuarios de proveedores pueden ver sus asignaciones" ON evaluation_vendors
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.vendor_id = evaluation_vendors.vendor_id
    )
  );

-- Trigger para actualizar timestamps
CREATE TRIGGER update_evaluation_vendors_timestamp
  BEFORE UPDATE ON evaluation_vendors
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column(); 