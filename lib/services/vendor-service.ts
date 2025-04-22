import { Database } from '@/lib/database.types';
import { SupabaseClient } from '@supabase/supabase-js';

export type Vendor = Database['public']['Tables']['vendors']['Row'];

export interface VendorWithUsers extends Vendor {
  users: Array<{
    id: string;
    email: string;
    profile: {
      id: string;
      company_name: string;
      contact_email: string | null;
      contact_phone: string | null;
    } | null;
    role: {
      id: string;
      name: string;
    } | null;
  }>;
}

/**
 * Obtiene la lista de empresas proveedoras.
 * La verificación de permisos (admin) debe hacerse ANTES.
 * @param client Cliente Supabase (requerido)
 */
export async function getVendors(
  client: SupabaseClient<Database>
): Promise<{ data: VendorWithUsers[] | null; error: Error | null }> {
  try {
    // La verificación de permisos ya no se hace aquí

    // Obtener vendors con sus usuarios asociados
    const { data: vendors, error: vendorsError } = await client
      .from('vendors')
      .select(`
                *,
                users!users_vendor_id_fkey (
                    id,
                    email,
                    profile:profiles!users_profile_id_fkey (*),
                    role:roles!users_role_id_fkey (*)
                )
            `);

    if (vendorsError) throw vendorsError;

    // Transformar los datos al formato esperado
    // Asegurarse que `users` existe y es un array
    const vendorsWithUsers = (vendors || []).map((vendor: any) => ({
      ...vendor,
      users: vendor.users || []
    }));

    return { data: vendorsWithUsers, error: null };
  } catch (error) {
    console.error('Error al obtener proveedores:', error);
    return {
      data: null,
      error: error instanceof Error ? error : new Error('Error desconocido al obtener proveedores')
    };
  }
}

/**
 * Obtiene un proveedor específico por ID.
 * La verificación de permisos (admin o usuario asociado) debe hacerse ANTES.
 * @param client Cliente Supabase (requerido)
 * @param vendorId ID del proveedor
 */
export async function getVendorById(
  client: SupabaseClient<Database>,
  vendorId: string
): Promise<{ data: VendorWithUsers | null; error: Error | null }> {
  try {
    // La verificación de permisos ya no se hace aquí

    // Obtener el vendor con sus usuarios asociados
    const { data: vendor, error: vendorError } = await client
      .from('vendors')
      .select(`
                *,
                users!users_vendor_id_fkey (
                    id,
                    email,
                    profile:profiles!users_profile_id_fkey (*),
                    role:roles!users_role_id_fkey (*)
                )
            `)
      .eq('id', vendorId)
      .single();

    if (vendorError) throw vendorError;
    if (!vendor) throw new Error('Proveedor no encontrado'); // Manejar caso no encontrado

    // Transformar datos
    const vendorData = vendor as any;
    return {
      data: {
        ...vendorData,
        users: vendorData.users || []
      },
      error: null
    };
  } catch (error) {
    console.error('Error al obtener proveedor:', error);
    return {
      data: null,
      error: error instanceof Error ? error : new Error('Error desconocido al obtener proveedor')
    };
  }
}

/**
 * Actualiza la información de un proveedor
 * La verificación de permisos (admin) debe hacerse ANTES.
 * @param client Cliente Supabase (requerido)
 * @param vendorId ID del proveedor a actualizar
 * @param vendorData Datos a actualizar
 */
export async function updateVendor(
  client: SupabaseClient<Database>,
  vendorId: string,
  vendorData: Partial<Omit<Vendor, 'id' | 'created_at' | 'updated_at'>>
): Promise<{ success: boolean; error: Error | null }> {
  try {
    // La verificación de permisos ya no se hace aquí

    // ---- AÑADIR ESTE LOG ----
    console.log("Service (updateVendor): Datos recibidos para actualizar:", JSON.stringify(vendorData, null, 2));
    // ---- FIN LOG ----

    // Actualizar el proveedor
    const { error } = await client
      .from('vendors')
      .update({
        ...vendorData,
        updated_at: new Date().toISOString()
      })
      .eq('id', vendorId);

    if (error) throw error;

    return { success: true, error: null };
  } catch (error) {
    console.error('Error al actualizar proveedor:', error);
    return {
      success: false,
      error: error instanceof Error ? error : new Error('Error desconocido al actualizar proveedor')
    };
  }
}