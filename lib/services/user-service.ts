import { Database } from '@/lib/database.types'
import { SupabaseClient } from '@supabase/supabase-js'

export interface User {
    id: string;
    email: string;
    contact_phone: string | null;
    created_at: string;
    last_sign_in_at: string | null;
    is_active: boolean | null;
    updated_at: string | null;
    profile_id: string | null;
    role_id: string | null;
    vendor_id: string | null;
    profile: {
        id: string;
        first_name: string | null;
        last_name: string | null;
        company_name: string;
        company_logo: string | null;
        contact_email: string | null;
        business_details: any | null;
        is_active: boolean | null;
        last_login: string | null;
        metadata: any | null;
        department: string | null;
        avatar_url: string | null;
        created_at: string | null;
        updated_at: string | null;
    } | null;
    role?: {
        id: string;
        name: string;
        description: string | null;
    } | null;
    vendor?: {
        id: string;
        name: string;
        rut: string;
        description: string | null;
        services_provided: string[] | null;
        contact_email: string | null;
        contact_phone: string | null;
        address: string | null;
        website: string | null;
        is_active: boolean | null;
    } | null;
}

/**
 * Obtiene la lista de usuarios.
 * La autorización (ej: solo admin) debe manejarse en la capa superior (API Route o RLS).
 * @param client Cliente Supabase (requerido)
 * @returns Promise<User[]>
 */
export async function getUsers(
    client: SupabaseClient<Database>
): Promise<User[]> {
    const { data: users, error } = await client
        .from('users')
        .select(`
            *,
            profile:profiles!users_profile_id_fkey (*),
            role:roles!users_role_id_fkey (*),
            vendor:vendors!users_vendor_id_fkey (*)
        `);

    if (error) {
        console.error("Error fetching users:", error);
        throw error;
    }

    return users as User[];
}

/**
 * Actualiza el estado activo/inactivo de un usuario.
 * La verificación de permisos (ej: admin) debe hacerse ANTES de llamar a esta función.
 * @param client Cliente Supabase (requerido)
 * @param userId ID del usuario a actualizar
 * @param isActive nuevo estado
 */
export async function updateUserStatus(
    client: SupabaseClient<Database>,
    userId: string,
    isActive: boolean
): Promise<void> {
    try {
        // Actualizar estado en users
        const { error: userUpdateError } = await client
            .from('users')
            .update({
                is_active: isActive,
                updated_at: new Date().toISOString()
            })
            .eq('id', userId);

        if (userUpdateError) {
            throw new Error(`Error updating user status: ${userUpdateError.message}`);
        }

        // Actualizar estado en profiles (si existe la relación)
        // Necesitamos el profile_id del usuario para esto
        const { data: userData, error: fetchUserError } = await client
            .from('users')
            .select('profile_id')
            .eq('id', userId)
            .single();

        if (fetchUserError || !userData || !userData.profile_id) {
            console.warn(`Could not find profile_id for user ${userId}, skipping profile status update.`);
        } else {
            const { error: profileUpdateError } = await client
                .from('profiles')
                .update({
                    is_active: isActive,
                    updated_at: new Date().toISOString()
                })
                .eq('id', userData.profile_id);

            if (profileUpdateError) {
                console.error(`Error updating profile status for profile ${userData.profile_id}: ${profileUpdateError.message}`);
            }
        }
    } catch (error) {
        console.error("Error in updateUserStatus service:", error);
        throw error instanceof Error ? error : new Error("Unknown error updating user status");
    }
}

/**
 * Obtiene un usuario por su ID.
 * La autorización debe manejarse en la capa superior.
 * @param client Cliente Supabase (requerido)
 * @param id ID del usuario
 * @returns Promise<User>
 */
export async function getUserById(
    client: SupabaseClient<Database>,
    id: string
): Promise<User> {
    const { data, error } = await client
        .from('users')
        .select(`
             *,
            profile:profiles!users_profile_id_fkey (*),
            role:roles!users_role_id_fkey (*),
            vendor:vendors!users_vendor_id_fkey (*)
        `)
        .eq('id', id)
        .single();

    if (error) {
        console.error(`Error fetching user by ID ${id}:`, error);
        throw error;
    }
    if (!data) {
        throw new Error('User not found');
    }

    return data as User;
}

/**
 * Actualiza la información de un usuario (datos en tabla users y profiles).
 * La verificación de permisos (admin o propio usuario) debe hacerse ANTES.
 * @param client Cliente Supabase (requerido)
 * @param userId ID del usuario a actualizar
 * @param userData Datos a actualizar (puede incluir `profile`)
 */
export async function updateUser(
    client: SupabaseClient<Database>,
    userId: string,
    // La interfaz del parámetro userDataForService que recibe la API
    userData: {
        email?: string; // Email usualmente no se cambia
        role_id?: string | null;
        vendor_id?: string | null;
        is_active?: boolean;
        profile?: {
            first_name?: string;
            last_name?: string;
            is_active?: boolean;
            // Añadir otros campos de profile si se editan
        }
    }
): Promise<void> {
    try {
        // Datos para la tabla 'users'
        const userUpdateData: Partial<Database['public']['Tables']['users']['Row']> = {};
        if (userData.role_id !== undefined) userUpdateData.role_id = userData.role_id;
        if (userData.vendor_id !== undefined) userUpdateData.vendor_id = userData.vendor_id;
        if (userData.is_active !== undefined) userUpdateData.is_active = userData.is_active;

        // Datos para la tabla 'profiles'
        const profileData = userData.profile || {};
        // Añadir campos de profile que sí queremos actualizar
        const profileUpdateData: Partial<Database['public']['Tables']['profiles']['Row']> = {};
        if (profileData.first_name !== undefined) profileUpdateData.first_name = profileData.first_name;
        if (profileData.last_name !== undefined) profileUpdateData.last_name = profileData.last_name;
        if (profileData.is_active !== undefined) profileUpdateData.is_active = profileData.is_active; // Estado en profiles?

        // Iniciar transacción (o confiar en la implícita)

        // 1. Actualizar tabla 'users' si hay datos para ella
        if (Object.keys(userUpdateData).length > 0) {
            userUpdateData.updated_at = new Date().toISOString();
            console.log(`[updateUser] Updating users table for ${userId}:`, userUpdateData);
            const { error: userUpdateError } = await client
                .from('users')
                .update(userUpdateData)
                .eq('id', userId);
            if (userUpdateError) {
                console.error(`[updateUser] Error updating users table:`, userUpdateError);
                throw new Error(`Error updating user data: ${userUpdateError.message}`);
            }
        }

        // 2. Actualizar tabla 'profiles' si hay datos para ella
        if (Object.keys(profileUpdateData).length > 0) {
            // Obtener profile_id del usuario (necesario para la condición WHERE)
            const { data: userProfileLink, error: linkError } = await client
                .from('users')
                .select('profile_id')
                .eq('id', userId)
                .single();

            if (linkError || !userProfileLink?.profile_id) {
                console.error(`[updateUser] Could not find profile link for user ${userId}. Profile data not updated.`);
                // Decidir si lanzar error o solo advertir. Lanzar error es más seguro.
                throw new Error('Could not find profile link for user to update.');
            }

            profileUpdateData.updated_at = new Date().toISOString();
            console.log(`[updateUser] Updating profiles table for profile ${userProfileLink.profile_id}:`, profileUpdateData);
            const { error: profileUpdateError } = await client
                .from('profiles')
                .update(profileUpdateData)
                .eq('id', userProfileLink.profile_id);

            if (profileUpdateError) {
                console.error(`[updateUser] Error updating profiles table:`, profileUpdateError);
                throw new Error(`Error updating profile data: ${profileUpdateError.message}`);
            }
        }

        // Si ambas actualizaciones tuvieron éxito (o no eran necesarias), la operación se completa.

    } catch (error) {
        console.error(`[updateUser] Error in service for user ${userId}:`, error);
        throw error; // Re-lanzar para que la API Route lo maneje
    }
} 