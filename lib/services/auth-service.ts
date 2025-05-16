import { User, SupabaseClient } from '@supabase/supabase-js';
import { Database } from "@/lib/database.types";

export interface Permission {
    name: string;
    module: string;
    action: string;
}

export interface CurrentUserData {
    user: User | null;
    profile: Database['public']['Tables']['profiles']['Row'] | null;
    role: {
        id: string;
        name: string;
        description: string | null;
    } | null;
    vendor: Database['public']['Tables']['vendors']['Row'] | null;
    isAdmin: boolean;
}

/**
 * Obtiene los datos completos del usuario actual (auth + profile + role + vendor)
 * Esta función centraliza la lógica de validación de usuario y debe usarse en todos los servicios
 * @param client Cliente Supabase (requerido)
 * @returns Promise<CurrentUserData> con los datos del usuario y su perfil
 */
// Variable estática para caché de sesión entre llamadas
let sessionCache: {
    user: any | null;
    profile: any | null;
    role: any | null;
    vendor: any | null;
    isAdmin: boolean;
    timestamp: number; // Cuándo se guardó la caché
} | null = null;

const SESSION_CACHE_TTL = 30000; // 30 segundos de vida para la caché

/**
 * Obtiene los datos completos del usuario actual (auth + profile + role + vendor)
 * Esta función centraliza la lógica de validación de usuario y debe usarse en todos los servicios
 * @param client Cliente Supabase (requerido)
 * @returns Promise<CurrentUserData> con los datos del usuario y su perfil
 */
export async function getCurrentUserData(
    client: SupabaseClient<Database>
): Promise<CurrentUserData> {
    console.log('[DEBUG] getCurrentUserData: Iniciando obtención de datos');

    // MEJORA 1: Usar caché para evitar múltiples llamadas en poco tiempo
    // Esto arregla el problema de muchas llamadas en cascada durante la carga inicial
    if (sessionCache && (Date.now() - sessionCache.timestamp < SESSION_CACHE_TTL)) {
        console.log('[DEBUG] getCurrentUserData: Usando datos en caché');
        return {
            user: sessionCache.user,
            profile: sessionCache.profile,
            role: sessionCache.role,
            vendor: sessionCache.vendor,
            isAdmin: sessionCache.isAdmin
        };
    }

    try {
        // MEJORA 2: Si estamos en el cliente y después de un login/redirect, verificamos URLSearchParams
        // Esto es una optimización para cuando venimos de una redirección post-login
        if (typeof window !== 'undefined') {
            const urlParams = new URLSearchParams(window.location.search);
            const hasAuthParam = urlParams.has('authSuccess');

            if (hasAuthParam) {
                console.log('[DEBUG] getCurrentUserData: Detectada redirección post-login');
                // Esperar un momento para que las cookies se establezcan correctamente
                await new Promise(resolve => setTimeout(resolve, 500));
            }
        }

        // MEJORA 3: Tryouts ordenados por probabilidad de éxito para minimizar latencia

        // Intento 1: Obtener sesión actual (caso común)
        try {
            console.log('[DEBUG] getCurrentUserData: Intentando getSession');
            const { data: sessionData } = await client.auth.getSession();

            if (sessionData?.session?.user) {
                const user = sessionData.session.user;
                console.log('[DEBUG] getCurrentUserData: ✅ Usuario obtenido desde getSession', { userId: user.id });

                const result = await getUserDataFromDatabase(client, user);

                // Guardar en caché
                sessionCache = {
                    ...result,
                    timestamp: Date.now()
                };

                return result;
            }
        } catch (sessionError) {
            console.log('[DEBUG] getCurrentUserData: Error en getSession', sessionError);
        }

        // Intento 2: Refrescar sesión (útil si la sesión está por expirar)
        try {
            console.log('[DEBUG] getCurrentUserData: Intentando refreshSession');
            const { data: refreshData } = await client.auth.refreshSession();

            if (refreshData?.session?.user) {
                const user = refreshData.session.user;
                console.log('[DEBUG] getCurrentUserData: ✅ Usuario obtenido desde refreshSession', { userId: user.id });

                const result = await getUserDataFromDatabase(client, user);

                // Guardar en caché
                sessionCache = {
                    ...result,
                    timestamp: Date.now()
                };

                return result;
            }
        } catch (refreshError) {
            console.log('[DEBUG] getCurrentUserData: Error en refreshSession', refreshError);
        }

        // MEJORA 4: Hacer un último intento después de una espera
        // Las cookies de Supabase son HttpOnly y no pueden ser detectadas por document.cookie
        // Esto es una medida de seguridad para proteger contra ataques XSS
        console.log('[DEBUG] getCurrentUserData: Haciendo un último intento después de espera');

        // Esperar un momento antes del último intento
        await new Promise(resolve => setTimeout(resolve, 800));

        try {
            // Intento final de getSession
            const { data: retryData } = await client.auth.getSession();
            if (retryData?.session?.user) {
                const user = retryData.session.user;
                console.log('[DEBUG] getCurrentUserData: ✅ Usuario obtenido en intento final');

                const result = await getUserDataFromDatabase(client, user);

                // Guardar en caché
                sessionCache = {
                    ...result,
                    timestamp: Date.now()
                };

                return result;
            }
        } catch (retryError) {
            // Silenciar este error en particular
            if (process.env.NODE_ENV !== 'development') {
                // No loguear en producción
            } else {
                console.log('[DEBUG] getCurrentUserData: Error en intento final', retryError);
            }
        }

        // MEJORA 5: Todo falló, pero no queremos bloquear la UI o mostrar errores innecesarios
        // Devolver un objeto vacío pero sin error para evitar bloqueos
        if (process.env.NODE_ENV !== 'development') {
            // No mostrar advertencias en producción
            console.log('[INFO] getCurrentUserData: Usuario no encontrado');
        } else {
            console.warn('[DEBUG] getCurrentUserData: No se pudo obtener el usuario después de todos los intentos');
        }

        // Limpiar caché si existía
        sessionCache = null;

        return { user: null, profile: null, role: null, vendor: null, isAdmin: false };
    } catch (error) {
        console.error('[DEBUG] getCurrentUserData: Error general', error);

        // Limpiar caché en caso de error
        sessionCache = null;

        return { user: null, profile: null, role: null, vendor: null, isAdmin: false };
    }
}

/**
 * Función auxiliar para obtener los datos del usuario de la base de datos
 * @param client Cliente Supabase
 * @param user Usuario autenticado
 * @returns Promise<CurrentUserData>
 */
async function getUserDataFromDatabase(
    client: SupabaseClient<Database>,
    user: any
): Promise<CurrentUserData> {
    const { data: userData, error: userError } = await client
        .from('users')
        .select(`
            id, email,
            profile:profiles!users_profile_id_fkey (*),
            role:roles!users_role_id_fkey (id, name, description),
            vendor:vendors!users_vendor_id_fkey (*)
        `)
        .eq('id', user.id)
        .single();

    if (userError) {
        console.error('[DEBUG] getUserDataFromDatabase: Error fetching user data', userError);
        return { user, profile: null, role: null, vendor: null, isAdmin: false };
    }

    if (!userData) {
        console.warn('[DEBUG] getUserDataFromDatabase: No se encontró el usuario en la tabla users', user.id);
        return { user, profile: null, role: null, vendor: null, isAdmin: false };
    }

    const isAdmin = userData.role?.name === 'admin';
    return { 
        user,
        profile: userData.profile,
        role: userData.role,
        vendor: userData.vendor,
        isAdmin
    };
}

/**
 * Obtiene el rol del usuario actual
 * @param client Cliente Supabase (requerido)
 * @returns Promise<string | null> Rol del usuario o null si no está autenticado
 */
export async function getUserRole(
    client: SupabaseClient<Database>
): Promise<string | null> {
    try {
        const { role } = await getCurrentUserData(client);
        return role?.name || null;
    } catch (error) {
        console.error('Error in getUserRole:', error);
        return null;
    }
}

/**
 * Obtiene el role_id y nombre del rol del usuario actual
 * @param client Cliente Supabase (requerido)
 * @returns Promise<{roleId: string | null, roleName: string | null}> 
 */
export async function getUserRoleDetails(
    client: SupabaseClient<Database>
): Promise<{ roleId: string | null, roleName: string | null }> {
    try {
        const { role } = await getCurrentUserData(client);

        if (!role) {
            return { roleId: null, roleName: null };
        }

        return {
            roleId: role.id,
            roleName: role.name
        };
    } catch (error) {
        console.error('Error in getUserRoleDetails:', error);
        return { roleId: null, roleName: null };
    }
}

/**
 * Verifica si el usuario actual tiene un permiso específico
 * @param client Cliente Supabase (requerido)
 * @param module Módulo al que se intenta acceder
 * @param action Acción que se intenta realizar
 * @returns Promise<boolean> indicando si tiene permiso
 */
export async function checkPermission(
    client: SupabaseClient<Database>,
    module: string,
    action: string
): Promise<boolean> {
    try {
        // Obtener solo el usuario para verificar si está autenticado
        const { data: { user }, error: authError } = await client.auth.getUser();

        if (authError || !user) {
            console.warn('checkPermission: No user session found.');
            return false;
        }

        // Llamar a la función RPC que verifica permisos
        const { data, error } = await client
            .rpc('has_permission', { // Asegúrate que esta función RPC existe y funciona
                user_id: user.id, // Usar nombre sugerido por linter
                module: module,
                action: action
            });

        if (error) {
            console.error('Error calling RPC has_permission:', error);
            return false;
        }

        return data === true; // Asegurarse que la RPC devuelve booleano
    } catch (error) {
        console.error('Unexpected error in checkPermission:', error);
        return false;
    }
}

/**
 * Obtiene todos los permisos del usuario actual
 * @param client Cliente Supabase (requerido)
 * @returns Promise<Permission[]> Lista de permisos del usuario
 */
export async function getUserPermissions(
    client: SupabaseClient<Database>
): Promise<Permission[]> {
    try {
        const { data: { user }, error: authError } = await client.auth.getUser();

        if (authError || !user) {
            console.warn('getUserPermissions: No user session found.');
            return [];
        }

        // Obtener los permisos del usuario
        const { data, error } = await client
            .rpc('get_user_permissions', { user_id: user.id }); // Usar nombre sugerido por linter

        if (error) {
            console.error('Error calling RPC get_user_permissions:', error);
            return [];
        }

        // Asumiendo que la RPC devuelve un array del tipo correcto o null
        return (data || []) as Permission[];
    } catch (error) {
        console.error('Unexpected error in getUserPermissions:', error);
        return [];
    }
}

/**
 * Hook para proteger rutas basado en permisos
 * @param client Cliente Supabase (requerido)
 * @param module Módulo que se intenta acceder
 * @param action Acción que se intenta realizar
 * @returns Promise<boolean> indicando si tiene acceso
 */
export async function hasAccess(
    client: SupabaseClient<Database>,
    module: string,
    action: string
): Promise<boolean> {
    try {
        const { data: { user } } = await client.auth.getUser();
        if (!user) return false;

        // Verificar permiso usando la función refactorizada
        const hasPermission = await checkPermission(client, module, action);
        return hasPermission;
    } catch (error) {
        console.error('Error in hasAccess:', error);
        return false;
    }
} 