-- Habilitar RLS para la tabla vendors si no está habilitado
ALTER TABLE IF EXISTS vendors ENABLE ROW LEVEL SECURITY;

-- Eliminar cualquier política duplicada o conflictiva
DROP POLICY IF EXISTS "Todos los usuarios autenticados pueden ver proveedores activos" ON vendors;
DROP POLICY IF EXISTS "Authenticated users can view active vendors" ON vendors;

-- Crear una política clara que permita a cualquier usuario autenticado ver todos los proveedores activos
CREATE POLICY "Todos los usuarios autenticados pueden ver proveedores activos" 
    ON vendors 
    FOR SELECT 
    USING (
        auth.role() = 'authenticated' AND 
        (is_active IS NULL OR is_active = true)
    );

-- Asegurarse de que los administradores pueden gestionar todos los proveedores
DROP POLICY IF EXISTS "Los administradores pueden gestionar proveedores" ON vendors;
CREATE POLICY "Los administradores pueden gestionar proveedores" 
    ON vendors 
    FOR ALL 
    USING (
        EXISTS (
            SELECT 1 FROM users
            JOIN roles ON users.role_id = roles.id
            WHERE users.id = auth.uid()
            AND roles.name = 'admin'
        )
    );

-- Asegurarse de que los usuarios pueden ver su propio proveedor
DROP POLICY IF EXISTS "Los usuarios pueden ver su propio proveedor" ON vendors;
CREATE POLICY "Los usuarios pueden ver su propio proveedor" 
    ON vendors 
    FOR SELECT 
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.vendor_id = vendors.id
        )
    );

-- Crear índices para mejorar el rendimiento
CREATE INDEX IF NOT EXISTS idx_vendors_is_active ON vendors(is_active); 