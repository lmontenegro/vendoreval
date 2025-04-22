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
export async function getCurrentUserData(
    client: SupabaseClient<Database>
): Promise<CurrentUserData> {
    try {
        // Obtener datos del usuario autenticado usando el cliente proporcionado
        const { data: { user }, error: authError } = await client.auth.getUser();

        if (authError || !user) {
            // Si hay error o no hay usuario, devolver estructura vacía
            console.warn('getCurrentUserData: No user session found or auth error:', authError?.message);
            return {
                user: null,
                profile: null,
                role: null,
                vendor: null,
                isAdmin: false
            };
        }

        // Obtener el usuario con sus relaciones usando el cliente proporcionado
        const { data: userData, error: userError } = await client
            .from('users') // Asumiendo tabla 'users' pública
            .select(`
                id,
                email,
                profile:profiles!users_profile_id_fkey (*),
                role:roles!users_role_id_fkey (
                    id,
                    name,
                    description
                ),
                vendor:vendors!users_vendor_id_fkey (*)
            `)
            .eq('id', user.id)
            .single();

        if (userError) {
            console.error('Error fetching user data (profile, role, vendor): ', userError);
            // Devolver usuario de auth pero resto nulo
            return {
                user,
                profile: null,
                role: null,
                vendor: null,
                isAdmin: false
            };
        }

        // Si userData es null (no debería pasar si user existe, pero por seguridad)
        if (!userData) {
            console.warn('User found in auth but not in public.users table:', user.id);
            return {
                user,
                profile: null,
                role: null,
                vendor: null,
                isAdmin: false
            };
        }

        // Determinar si es admin
        const isAdmin = userData.role?.name === 'admin';

        return {
            user, // Objeto User de Supabase Auth
            profile: userData.profile, // Objeto Profile de tu tabla
            role: userData.role, // Objeto Role de tu tabla
            vendor: userData.vendor, // Objeto Vendor de tu tabla
            isAdmin
        };
    } catch (error) {
        console.error('Unexpected error in getCurrentUserData:', error);
        return {
            user: null,
            profile: null,
            role: null,
            vendor: null,
            isAdmin: false
        };
    }
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