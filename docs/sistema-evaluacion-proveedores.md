# Sistema de Evaluación de Proveedores CCMIN

## Descripción General

El Sistema de Evaluación de Proveedores CCMIN es una plataforma integral diseñada para gestionar y evaluar proveedores. Permite a los usuarios administrar proveedores, realizar evaluaciones de desempeño, analizar métricas y generar recomendaciones para la mejora continua.

## Stack Tecnológico

- **Frontend**: Next.js, TypeScript, React, TailwindCSS, Shadcn/UI
- **Base de datos**: Supabase
- **Infraestructura**: AWS (Amplify, Lambda, CloudWatch)

## Estructura de la Base de Datos

El sistema utiliza una base de datos PostgreSQL a través de Supabase con las siguientes tablas principales:

- **profiles**: Perfiles de usuario con roles (admin, evaluator, supplier)
- **vendors**: Información de proveedores
- **evaluations**: Evaluaciones realizadas a proveedores
- **recommendations**: Recomendaciones de mejora para proveedores

## Módulos del Sistema

### 1. Autenticación y Gestión de Usuarios

**Archivos principales**: `app/auth/`, `middleware.ts`

**Funcionalidades**:
- Registro de usuarios
- Inicio de sesión
- Gestión de perfiles
- Control de acceso basado en roles (admin, evaluator, supplier)

### 2. Dashboard

**Archivos principales**: `app/dashboard/`

**Funcionalidades**:
- Vista general del sistema
- Resumen de estadísticas clave (evaluaciones activas, proveedores registrados, etc.)
- Acceso rápido a las principales funciones del sistema
- Visualización de evaluaciones recientes

### 3. Gestión de Proveedores

**Archivos principales**: `app/vendors/`

**Funcionalidades**:
- Listado de proveedores
- Creación y edición de proveedores
- Filtrado por estado (activo/inactivo)
- Visualización de información detallada de proveedores
- Gestión de datos de contacto e información comercial

### 4. Evaluaciones

**Archivos principales**: `app/evaluations/`

**Funcionalidades**:
- Creación de nuevas evaluaciones
- Asignación de evaluaciones a proveedores
- Seguimiento del estado de las evaluaciones (borrador, en progreso, completada)
- Filtrado de evaluaciones por diversos criterios (estado, cumplimiento, fecha)
- Visualización de evaluaciones detalladas

### 5. Métricas y Análisis

**Archivos principales**: `app/metrics/`

**Funcionalidades**:
- Visualización de métricas de desempeño de proveedores
- Gráficos interactivos (barras, distribución)
- Análisis comparativo entre proveedores
- Filtrado por categoría y período de tiempo
- Exportación de datos en formato CSV

### 6. Recomendaciones

**Archivos principales**: `app/recommendations/`

**Funcionalidades**:
- Generación de recomendaciones basadas en evaluaciones
- Seguimiento del estado de implementación de recomendaciones
- Asignación de prioridades a las recomendaciones
- Gestión de planes de acción

### 7. Generación de Reportes

**Archivos principales**: `lib/report-generator.tsx`

**Funcionalidades**:
- Creación de reportes en formato PDF
- Exportación de datos para análisis externo
- Personalización de informes según necesidades

## Servicios y Utilidades

### Supabase Integration

**Archivos principales**: `lib/supabase/`

**Funcionalidades**:
- Configuración de conexión a Supabase
- Tipos de datos para la base de datos
- Funciones de autenticación y autorización
- Operaciones CRUD para entidades del sistema

### Servicios

**Archivos principales**: `lib/services/`

**Funcionalidades**:
- Servicios para interactuar con proveedores
- Servicios para gestionar evaluaciones
- Funciones auxiliares para procesar datos

## Estado Actual y Próximos Pasos

El sistema cuenta con una implementación funcional de:
- Autenticación de usuarios
- Gestión básica de proveedores
- Creación y seguimiento de evaluaciones
- Visualización de métricas preliminares

Para continuar el desarrollo, se recomienda:
1. Completar la integración con el módulo de recomendaciones
2. Mejorar los filtros y búsqueda en las listas
3. Implementar notificaciones para usuarios
4. Expandir las capacidades de generación de reportes
5. Mejorar la visualización de métricas con datos en tiempo real
6. Implementar funcionalidad de exportación e importación masiva 