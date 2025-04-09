import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { supabase } from "@/lib/supabase/client";

export interface Vendor {
  id: string;
  name: string;
  ruc: string;
  description: string | null;
  services_provided: string[];
  contact_email: string;
  contact_phone: string;
  address: string | null;
  website: string | null;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface VendorWithUsers extends Vendor {
  users: {
    user_id: string;
    role: 'owner' | 'manager' | 'staff';
    is_primary_contact: boolean;
  }[];
}

/**
 * Obtiene la lista de empresas proveedoras.
 * Solo accesible por administradores del sistema.
 */
export async function getVendors(): Promise<{ data: VendorWithUsers[] | null; error: Error | null }> {
  try {
    // Usar el cliente de Supabase importado para mantener consistencia con el resto de la aplicación
    // en lugar de crear una nueva instancia con createClientComponentClient

    // Verificar si el usuario está autenticado y es admin
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError) throw authError;

    if (!user) {
      throw new Error("No has iniciado sesión");
    }

    const { data: userRole } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!userRole) {
      throw new Error("No se encontró información del usuario");
    }

    if (userRole.role !== 'admin') {
      throw new Error('No tienes permisos para ver la lista de proveedores');
    }

    // Obtener vendors con sus usuarios asociados
    const { data: vendors, error: vendorsError } = await supabase
      .from('vendors')
      .select(`
        *,
        vendor_users (
          user_id,
          role,
          is_primary_contact
        )
      `);

    if (vendorsError) throw vendorsError;

    // Transformar los datos al formato esperado
    const vendorsWithUsers = vendors.map(vendor => ({
      ...vendor,
      users: vendor.vendor_users || []
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
 * Solo accesible por administradores o usuarios asociados al proveedor.
 */
export async function getVendorById(vendorId: string): Promise<{ data: VendorWithUsers | null; error: Error | null }> {
  try {
    // Usar el cliente importado en lugar de crear una nueva instancia
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError) throw authError;

    if (!user) {
      throw new Error("No has iniciado sesión");
    }

    // Obtener el vendor con sus usuarios asociados
    const { data: vendor, error: vendorError } = await supabase
      .from('vendors')
      .select(`
        *,
        vendor_users (
          user_id,
          role,
          is_primary_contact
        )
      `)
      .eq('id', vendorId)
      .single();

    if (vendorError) throw vendorError;

    // Verificar permisos
    const { data: userRole } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!userRole) {
      throw new Error("No se encontró información del usuario");
    }

    const isAdmin = userRole.role === 'admin';
    const isAssociatedUser = vendor.vendor_users.some((vu: { user_id: string }) => vu.user_id === user.id);

    if (!isAdmin && !isAssociatedUser) {
      throw new Error('No tienes permisos para ver este proveedor');
    }

    return {
      data: {
        ...vendor,
        users: vendor.vendor_users || []
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
 * @param vendorId ID del proveedor a actualizar
 * @param vendorData Datos a actualizar
 */
export async function updateVendor(vendorId: string, vendorData: Partial<Vendor>): Promise<{ success: boolean; error: Error | null }> {
  try {
    // Verificar si el usuario está autenticado y es admin
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError) throw authError;

    if (!user) {
      throw new Error("No has iniciado sesión");
    }

    const { data: userRole } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!userRole) {
      throw new Error("No se encontró información del usuario");
    }

    // Solo administradores pueden actualizar proveedores
    if (userRole.role !== 'admin') {
      throw new Error('No tienes permisos para actualizar proveedores');
    }

    // Actualizar el proveedor
    const { error } = await supabase
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