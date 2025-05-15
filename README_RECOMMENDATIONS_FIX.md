# Corrección de Recomendaciones para Proveedores

Este documento explica las correcciones realizadas para solucionar los problemas con las recomendaciones en el sistema de evaluación.

## Problemas identificados

1. **Recomendaciones no visibles para proveedores**: Los usuarios con rol "supplier" no podían ver las recomendaciones en la página de recomendaciones a pesar de estar autenticados.

2. **Error de UUID en la base de datos**: Se producía un error "invalid input syntax for type uuid: ''" porque el código intentaba usar `vendor_id` como el campo `assigned_to` en las recomendaciones, pero `assigned_to` debe hacer referencia a `profiles.id` y no a `vendors.id`.

## Soluciones implementadas

### 1. Correcciones en la página de recomendaciones

Se han realizado las siguientes mejoras en `app/(dashboard)/recommendations/page.tsx`:

- Verificación adecuada de la sesión del usuario
- Manejo mejorado de errores en la consulta de datos de usuario
- Obtención y visualización de nombres de proveedores
- Corrección del filtrado de recomendaciones para usuarios con rol "supplier"
- Mejora en la visualización de información de recomendaciones

### 2. Corrección de la estructura de la base de datos

Se ha creado un script de migración (`migrations/fix_recommendations_assigned_to.sql`) para corregir el campo `assigned_to` en la tabla `recommendations`:

- Limpia los valores inválidos en el campo `assigned_to`
- Asegura que la restricción de clave foránea esté correctamente configurada
- Añade un comentario explicativo al campo

## Cómo aplicar la corrección de la base de datos

Para aplicar la corrección a la base de datos, ejecute el script SQL incluido en `migrations/fix_recommendations_assigned_to.sql` en su proyecto de Supabase:

1. Acceda al panel de administración de Supabase
2. Vaya a la sección "SQL Editor"
3. Copie y pegue el contenido del archivo `migrations/fix_recommendations_assigned_to.sql`
4. Ejecute la consulta

## Verificación

Después de aplicar los cambios:

1. Inicie sesión con un usuario que tenga rol "supplier"
2. Navegue a la página de recomendaciones
3. Verifique que se muestren las recomendaciones asociadas a su proveedor
4. Compruebe que puede cambiar el estado de las recomendaciones correctamente

## Notas técnicas adicionales

- El campo `assigned_to` en la tabla `recommendations` debe hacer referencia a `profiles.id` (no a `vendors.id`)
- Las recomendaciones están vinculadas a los proveedores a través de la tabla `responses` (campo `vendor_id`)
- La página de recomendaciones filtra por `vendor_id` del usuario cuando el rol es "supplier" 