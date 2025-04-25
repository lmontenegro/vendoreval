-- Agregar políticas adicionales para el acceso a proveedores asignados a evaluaciones

-- Política para permitir a los evaluadores asignar proveedores a las evaluaciones que crearon
CREATE POLICY "Los evaluadores pueden asignar proveedores a sus evaluaciones" ON evaluation_vendors
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM evaluations
      WHERE evaluations.id = evaluation_vendors.evaluation_id
      AND evaluations.evaluator_id = auth.uid()
    )
);

-- Política para permitir a los evaluadores eliminar proveedores de sus evaluaciones
CREATE POLICY "Los evaluadores pueden eliminar proveedores de sus evaluaciones" ON evaluation_vendors
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM evaluations
      WHERE evaluations.id = evaluation_vendors.evaluation_id
      AND evaluations.evaluator_id = auth.uid()
    )
);

-- Política para permitir a los usuarios ver los proveedores de evaluaciones en las que son evaluadores
CREATE POLICY "Los usuarios pueden ver las evaluaciones asignadas a sus proveedores" ON evaluations
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM evaluation_vendors
      WHERE evaluation_vendors.evaluation_id = evaluations.id
      AND EXISTS (
        SELECT 1 FROM users
        WHERE users.id = auth.uid()
        AND users.vendor_id = evaluation_vendors.vendor_id
      )
    )
);

-- Política para usuarios de proveedores ver sus propias evaluaciones
CREATE POLICY "Los proveedores pueden ver sus evaluaciones asignadas" ON evaluations
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.vendor_id IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM evaluation_vendors
        WHERE evaluation_vendors.evaluation_id = evaluations.id
        AND evaluation_vendors.vendor_id = users.vendor_id
      )
    )
);

-- Política que permite a los usuarios obtener datos de proveedores para evaluaciones
CREATE POLICY "Todos los usuarios autenticados pueden ver proveedores activos" ON vendors
  FOR SELECT USING (
    auth.role() = 'authenticated' AND
    (is_active IS NULL OR is_active = true)
);

-- Política para permitir que los administradores gestionen cualquier proveedor
CREATE POLICY "Los administradores pueden gestionar proveedores" ON vendors
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users
      JOIN roles ON users.role_id = roles.id
      WHERE users.id = auth.uid()
      AND roles.name = 'admin'
    )
);

-- Política para usuarios de un proveedor específico
CREATE POLICY "Los usuarios pueden ver su propio proveedor" ON vendors
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.vendor_id = vendors.id
    )
);
