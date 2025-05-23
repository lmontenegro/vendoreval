# Panel Administrativo de Recomendaciones

## Descripción

Esta funcionalidad permite a los administradores del sistema obtener una vista completa y gráfica de todas las evaluaciones completadas, identificando específicamente las respuestas problemáticas (respuestas "No" y "N/A") y sus recomendaciones asociadas.

## Características Principales

### 1. Vista Administrativa Completa
- **Acceso restringido**: Solo usuarios con rol `admin` pueden acceder
- **Datos consolidados**: Muestra todas las evaluaciones completadas de todos los proveedores
- **Análisis de cumplimiento**: Identifica automáticamente problemas en las evaluaciones

### 2. Métricas y Estadísticas
- **Total de evaluaciones completadas**
- **Número de proveedores únicos evaluados**
- **Cantidad total de problemas detectados** (respuestas No/N/A)
- **Número total de recomendaciones generadas**

### 3. Filtros y Búsqueda
- **Búsqueda por texto**: Filtrar por nombre de evaluación o proveedor
- **Filtros por problemas**:
  - Todas las evaluaciones
  - Solo evaluaciones con problemas
  - Solo evaluaciones sin problemas
  - Evaluaciones con muchos problemas (5+)

### 4. Vista Detallada por Evaluación
Para cada evaluación se muestra:
- **Información básica**: Título, proveedor, fecha de completado
- **Progreso de completitud**: Porcentaje de preguntas respondidas
- **Estadísticas detalladas**:
  - Total de preguntas
  - Preguntas respondidas
  - Respuestas "No"
  - Respuestas "N/A"
  - Recomendaciones generadas
- **Preguntas problemáticas**: Lista detallada con categorías y recomendaciones

### 5. Modal de Detalles
- **Tabla completa** de preguntas con problemas
- **Información de cada pregunta**:
  - Texto completo de la pregunta
  - Categoría y subcategoría
  - Respuesta dada
  - Recomendación asociada
  - Prioridad de la recomendación

## Estructura Técnica

### API Endpoint
```
GET /api/recommendations/admin
```

**Autenticación**: Requiere sesión activa y rol de administrador

**Respuesta**:
```json
{
  "data": [
    {
      "evaluation_id": "uuid",
      "evaluation_title": "string",
      "vendor_id": "uuid", 
      "vendor_name": "string",
      "total_questions": "number",
      "answered_questions": "number",
      "no_answers_count": "number",
      "na_answers_count": "number",
      "recommendations_count": "number",
      "completion_percentage": "number",
      "status": "string",
      "completed_at": "string | null",
      "questions_with_issues": [
        {
          "question_id": "uuid",
          "question_text": "string",
          "category": "string",
          "subcategory": "string | null",
          "answer": "string | null",
          "response_value": "string",
          "recommendation_text": "string | null",
          "priority": "number | null",
          "created_at": "string | null"
        }
      ]
    }
  ],
  "summary": {
    "total_evaluations": "number",
    "total_vendors": "number", 
    "total_issues": "number",
    "total_recommendations": "number"
  }
}
```

### Página Frontend
```
/recommendations/admin
```

**Componentes utilizados**:
- Cards para métricas de resumen
- Tabla para detalles de preguntas
- Modal para vista expandida
- Filtros y búsqueda
- Badges para indicadores de estado
- Progress bars para completitud

## Consultas de Base de Datos

### Principales tablas involucradas:
- `evaluation_vendors`: Evaluaciones asignadas a proveedores
- `evaluations`: Información de evaluaciones
- `vendors`: Información de proveedores
- `responses`: Respuestas a preguntas de evaluación
- `questions`: Preguntas del sistema
- `recommendations`: Recomendaciones generadas

### Lógica de filtrado:
1. **Obtener evaluaciones completadas**: `evaluation_vendors.status = 'completed'`
2. **Filtrar respuestas problemáticas**: `responses.answer IN ('No', 'N/A')`
3. **Asociar recomendaciones**: Join con tabla `recommendations`
4. **Calcular estadísticas**: Agregaciones por evaluación

## Seguridad

### Control de Acceso
- **Verificación de sesión**: Usuario debe estar autenticado
- **Verificación de rol**: Solo usuarios con rol `admin`
- **Cliente administrativo**: Usa `SUPABASE_SERVICE_ROLE_KEY` para operaciones privilegiadas

### Políticas RLS
- La API utiliza el cliente administrativo para evitar restricciones RLS
- El frontend verifica permisos antes de mostrar la navegación

## Navegación

### Menú de navegación
- **Nombre**: "Panel Admin - Recomendaciones"
- **Icono**: BarChart3
- **Ruta**: `/recommendations/admin`
- **Visibilidad**: Solo para rol `admin`

## Casos de Uso

### 1. Auditoría de Cumplimiento
Los administradores pueden identificar rápidamente:
- Qué proveedores tienen más problemas de cumplimiento
- Qué categorías de preguntas generan más respuestas negativas
- Cuáles evaluaciones requieren seguimiento prioritario

### 2. Análisis de Tendencias
- Comparar el desempeño entre diferentes proveedores
- Identificar patrones en las respuestas problemáticas
- Evaluar la efectividad de las recomendaciones

### 3. Gestión de Riesgos
- Priorizar acciones correctivas basadas en la cantidad de problemas
- Identificar proveedores que requieren atención inmediata
- Generar reportes para stakeholders

## Instalación y Configuración

### Variables de Entorno Requeridas
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### Permisos de Base de Datos
El usuario del service role debe tener permisos de lectura en:
- `evaluation_vendors`
- `evaluations` 
- `vendors`
- `responses`
- `questions`
- `recommendations`
- `users`
- `roles`

## Próximas Mejoras

### Funcionalidades Futuras
1. **Exportación de datos**: PDF, Excel, CSV
2. **Gráficos y visualizaciones**: Charts para tendencias
3. **Filtros avanzados**: Por fecha, categoría, prioridad
4. **Notificaciones**: Alertas para problemas críticos
5. **Reportes programados**: Envío automático de resúmenes

### Optimizaciones Técnicas
1. **Caché de datos**: Redis para consultas frecuentes
2. **Paginación**: Para grandes volúmenes de datos
3. **Índices de BD**: Optimizar consultas complejas
4. **Lazy loading**: Cargar detalles bajo demanda 