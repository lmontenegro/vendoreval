import { supabase } from "@/lib/supabase/client";

export interface User {
    id: string;
    email: string;
    role: string;
    company_name: string | null;
    contact_phone: string | null;
    created_at: string;
    last_sign_in_at: string | null;
    is_active: boolean;
    updated_at: string | null;
}

/**
 * Obtiene la lista de usuarios si el usuario actual es administrador
 * @returns Promise<User[]>
 * @throws Error si el usuario no tiene permisos de administrador
 */
export async function getUsers(): Promise<User[]> {
    // Verificar si el usuario actual es administrador
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
        throw new Error("No hay sesión activa");
    }

    // Obtener el rol del usuario actual desde public.users
    const { data: currentUser, error: userError } = await supabase
        .from('users')
        .select('role')
        .eq('id', user.id)
        .single();

    if (userError || !currentUser) {
        throw new Error("No se pudo verificar el rol del usuario");
    }

    // Verificar si es administrador
    if (currentUser.role !== 'admin') {
        throw new Error("No tienes permisos para ver la lista de usuarios");
    }

    // Obtener la lista de usuarios
    const { data: users, error: usersError } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false });

    if (usersError) {
        throw new Error("Error al obtener la lista de usuarios");
    }

    return users;
}

/**
 * Actualiza el estado activo/inactivo de un usuario
 * @param userId ID del usuario a actualizar
 * @param isActive nuevo estado
 */
export async function updateUserStatus(userId: string, isActive: boolean): Promise<void> {
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
        throw new Error("No hay sesión activa");
    }

    // Verificar si es administrador
    const { data: currentUser, error: userError } = await supabase
        .from('users')
        .select('role')
        .eq('id', user.id)
        .single();

    if (userError || !currentUser || currentUser.role !== 'admin') {
        throw new Error("No tienes permisos para actualizar usuarios");
    }

    const { error } = await supabase
        .from('users')
        .update({
            is_active: isActive,
            updated_at: new Date().toISOString()
        })
        .eq('id', userId);

    if (error) {
        throw new Error("Error al actualizar el estado del usuario");
    }
}

/**
 * Obtiene un usuario por su ID
 * @param userId ID del usuario
 * @returns Promise<User>
 */
export async function getUserById(userId: string): Promise<User> {
    const { data: user, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

    if (error) {
        throw new Error("Error al obtener el usuario");
    }

    if (!user) {
        throw new Error("Usuario no encontrado");
    }

    return user;
}

/**
 * Actualiza la información de un usuario
 * @param userId ID del usuario a actualizar
 * @param userData Datos a actualizar
 */
export async function updateUser(userId: string, userData: Partial<User>): Promise<void> {
    // Verificar si el usuario actual es admin o es su propio perfil
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
        throw new Error("No hay sesión activa");
    }

    // Obtener el rol del usuario actual
    const { data: currentUser, error: userError } = await supabase
        .from('users')
        .select('role')
        .eq('id', user.id)
        .single();

    if (userError || !currentUser) {
        throw new Error("No se pudo verificar el rol del usuario");
    }

    // Solo permitir actualización si es admin o su propio perfil
    if (currentUser.role !== 'admin' && user.id !== userId) {
        throw new Error("No tienes permisos para actualizar este usuario");
    }

    // No permitir actualizar campos sensibles si no es admin
    if (currentUser.role !== 'admin') {
        delete userData.role;
        delete userData.is_active;
    }

    const { error } = await supabase
        .from('users')
        .update({
            ...userData,
            updated_at: new Date().toISOString()
        })
        .eq('id', userId);

    if (error) {
        throw new Error("Error al actualizar el usuario");
    }
} 