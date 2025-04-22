/**
 * Este archivo define los permisos necesarios para acceder a cada ruta de la aplicación,
 * utilizando el sistema de roles y permisos implementado en la base de datos.
 */

interface AccessRequirement {
    module: string;
    action: string;
    requiredRoles?: string[];
    fallbackPath?: string;
}

type RoutePermissions = {
    [route: string]: AccessRequirement | null; // null significa que no requiere permisos
};

/**
 * Define los permisos requeridos para cada ruta de la aplicación
 */
export const routePermissions: RoutePermissions = {
    // Rutas públicas o que sólo requieren autenticación, sin permisos específicos
    '/dashboard': null, // Todos pueden acceder al dashboard
    '/profile': null, // Todos pueden acceder a su perfil
    '/settings': null, // Todos pueden acceder a configuración

    // Rutas protegidas con permisos específicos
    '/evaluations': {
        module: 'evaluations',
        action: 'view',
        requiredRoles: ['admin', 'evaluator', 'supplier'],
        fallbackPath: '/dashboard'
    },
    '/evaluations/new': {
        module: 'evaluations',
        action: 'create',
        requiredRoles: ['admin', 'evaluator'],
        fallbackPath: '/evaluations'
    },
    '/evaluations/edit': {
        module: 'evaluations',
        action: 'edit',
        requiredRoles: ['admin', 'evaluator'],
        fallbackPath: '/evaluations'
    },

    '/vendors': {
        module: 'vendors',
        action: 'view',
        requiredRoles: ['admin', 'evaluator'],
        fallbackPath: '/dashboard'
    },
    '/vendors/new': {
        module: 'vendors',
        action: 'create',
        requiredRoles: ['admin'],
        fallbackPath: '/vendors'
    },

    '/users': {
        module: 'users',
        action: 'view',
        requiredRoles: ['admin'],
        fallbackPath: '/dashboard'
    },
    '/users/new': {
        module: 'users',
        action: 'create',
        requiredRoles: ['admin'],
        fallbackPath: '/users'
    },

    '/metrics': {
        module: 'metrics',
        action: 'view',
        requiredRoles: ['admin', 'evaluator'],
        fallbackPath: '/dashboard'
    },

    '/recommendations': {
        module: 'recommendations',
        action: 'view',
        requiredRoles: ['admin', 'evaluator', 'supplier'],
        fallbackPath: '/dashboard'
    }
};

/**
 * Obtiene los requisitos de acceso para una ruta específica
 * @param path La ruta a verificar
 * @returns Los requisitos de acceso, o null si la ruta no tiene requisitos específicos
 */
export function getAccessRequirements(path: string): AccessRequirement | null {
    // Primero intentar encontrar una coincidencia exacta
    if (routePermissions[path]) {
        return routePermissions[path];
    }

    // Si no hay coincidencia exacta, buscar una ruta base que coincida
    // Útil para rutas dinámicas como /evaluations/[id]
    const baseRoutes = Object.keys(routePermissions).filter(route =>
        path.startsWith(route + '/') || path === route
    );

    if (baseRoutes.length > 0) {
        // Usar la ruta base más específica (la más larga)
        const mostSpecificRoute = baseRoutes.sort((a, b) => b.length - a.length)[0];
        return routePermissions[mostSpecificRoute];
    }

    // Si no se encuentra ninguna coincidencia, no hay requisitos específicos
    return null;
} 