import { Database } from "@/lib/database.types";
import { SupabaseClient } from "@supabase/supabase-js";

export type Profile = Database['public']['Tables']['profiles']['Row'];

export interface ProfileWithRelations extends Profile {
    user?: {
        id: string;
        email: string;
        role_id: string | null;
        vendor_id: string | null;
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
    } | null;
}

/**
 * Obtiene todos los perfiles disponibles.
 * La verificación de permisos (ej: admin) debe hacerse ANTES.
 * @param client Cliente Supabase (requerido)
 * @returns Promise<ProfileWithRelations[]>
 */
export async function getProfiles(
    client: SupabaseClient<Database>
): Promise<ProfileWithRelations[]> {
    try {
        // La verificación de permisos ya no se hace aquí

        // Obtener la lista de perfiles con sus relaciones
        const { data: profiles, error: profilesError } = await client
            .from('profiles')
            .select(`
                *,
                user:users!user_id_fkey (
                    id,
                    email,
                    role_id,
                    vendor_id
                ),
                role:users!user_id_fkey (
                    roles!users_role_id_fkey (
                        id,
                        name,
                        description
                    )
                ),
                vendor:users!user_id_fkey (
                    vendors!users_vendor_id_fkey (
                        id,
                        name,
                        rut,
                        description
                    )
                )
            `)
            .order('company_name', { ascending: true });

        if (profilesError) {
            console.error("Error fetching profiles:", profilesError);
            throw new Error("Error al obtener la lista de perfiles");
        }

        // Simplificar el mapeo si las relaciones anidadas ya funcionan
        // Necesitas verificar si las relaciones user->roles y user->vendors se resuelven correctamente así.
        // Si no, necesitas ajustar la consulta SELECT o el mapeo.
        return profiles.map((profile: any) => ({
            ...profile,
            // Ajustar según la estructura real devuelta por Supabase
            role: profile.role?.roles || profile.user?.role || null,
            vendor: profile.vendor?.vendors || profile.user?.vendor || null,
            user: profile.user // Mantener el usuario relacionado si se obtiene directamente
        }));

    } catch (error) {
        console.error('Error en getProfiles:', error);
        throw error;
    }
}

/**
 * Obtiene un perfil por su ID con todas sus relaciones.
 * La autorización debe manejarse en la capa superior.
 * @param client Cliente Supabase (requerido)
 * @param profileId ID del perfil
 * @returns Promise<ProfileWithRelations>
 */
export async function getProfileById(
    client: SupabaseClient<Database>,
    profileId: string
): Promise<ProfileWithRelations> {
    try {
        const { data: profile, error } = await client
            .from('profiles')
            .select(`
                *,
                user:users!user_id_fkey (
                    id,
                    email,
                    role_id,
                    vendor_id
                ),
                role:users!user_id_fkey (
                    roles!users_role_id_fkey (
                        id,
                        name,
                        description
                    )
                ),
                vendor:users!user_id_fkey (
                    vendors!users_vendor_id_fkey (
                        id,
                        name,
                        rut,
                        description
                    )
                )
            `)
            .eq('id', profileId)
            .single();

        if (error) {
            console.error(`Error fetching profile by ID ${profileId}:`, error);
            throw new Error("Error al obtener el perfil");
        }

        if (!profile) {
            throw new Error("Perfil no encontrado");
        }

        // Ajustar el mapeo como en getProfiles
        const profileData = profile as any; // Casteo temporal para acceder a relaciones anidadas
        return {
            ...profileData,
            role: profileData.role?.roles || profileData.user?.role || null,
            vendor: profileData.vendor?.vendors || profileData.user?.vendor || null,
            user: profileData.user
        };
    } catch (error) {
        console.error('Error en getProfileById:', error);
        throw error;
    }
}

/**
 * Actualiza un perfil.
 * La verificación de permisos debe hacerse ANTES.
 * @param client Cliente Supabase (requerido)
 * @param profileId ID del perfil a actualizar
 * @param profileData Datos del perfil a actualizar
 */
export async function updateProfile(
    client: SupabaseClient<Database>,
    profileId: string,
    profileData: Partial<Profile>
): Promise<void> {
    try {
        // Excluir campos que no deberían actualizarse directamente si es necesario
        // Mantenemos user_id si es parte del tipo Profile y puede ser actualizado (revisar si esto es correcto para tu lógica)
        const { id, created_at, ...updateData } = profileData;

        const { error } = await client
            .from('profiles')
            .update({
                ...updateData,
                updated_at: new Date().toISOString()
            })
            .eq('id', profileId);

        if (error) {
            console.error(`Error updating profile ${profileId}:`, error);
            throw new Error(`Error al actualizar el perfil: ${error.message}`);
        }
    } catch (error) {
        console.error('Error en updateProfile:', error);
        throw error;
    }
} 