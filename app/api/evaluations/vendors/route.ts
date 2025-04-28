import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { getCurrentUserData } from '@/lib/services/auth-service';

/**
 * Endpoint para obtener la lista básica de proveedores para evaluadores
 * Este endpoint es accesible para todo usuario autenticado,
 * y devuelve solo la información básica necesaria para seleccionar proveedores
 */
export async function GET(request: Request) {
  try {
    console.log("[API] Inicio de solicitud GET /api/evaluations/vendors");
    const supabase = createServerClient();

    // 1. Verificar si el usuario está autenticado
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError) {
      console.error("[API] Error de autenticación:", authError.message);
      return NextResponse.json({ data: [], error: 'Error de autenticación' }, { status: 401 });
    }

    if (!user) {
      console.warn("[API] No se encontró un usuario autenticado");
      return NextResponse.json({ data: [], error: 'Usuario no autenticado' }, { status: 401 });
    }

    console.log(`[API] Usuario autenticado: ${user.id}`);

    // Obtener datos del usuario actual para diagnóstico
    try {
      const userData = await getCurrentUserData(supabase);
      console.log(`[API] Rol del usuario: ${userData.role?.name || 'sin rol'}, isAdmin: ${userData.isAdmin}`);
      console.log(`[API] Usuario tiene vendor_id: ${userData.vendor?.id ? 'Sí' : 'No'}`);
    } catch (userDataError) {
      console.warn("[API] No se pudo obtener datos adicionales del usuario:", userDataError);
    }

    // 2. Obtener la lista básica de proveedores (solo id y nombre)
    const { data: vendors, error: vendorsError } = await supabase
      .from('vendors')
      .select('id, name')
      .eq('is_active', true)
      .order('name');

    if (vendorsError) {
      console.error("[API] Error obteniendo lista de proveedores:", vendorsError.message);

      // Verificar si es un error de permisos (RLS)
      if (vendorsError.code === 'PGRST301' || vendorsError.message.includes('permission denied')) {
        return NextResponse.json({
          data: [],
          error: 'No tienes permisos para ver la lista de proveedores'
        }, { status: 403 });
      }

      // Para otros errores, devolver un array vacío con código 200 para evitar errores en cliente
      return NextResponse.json({ data: [], error: vendorsError.message }, { status: 200 });
    }

    // Asegurarse de que vendors es un array
    const vendorsList = Array.isArray(vendors) ? vendors : [];
    console.log(`[API] Proveedores encontrados: ${vendorsList.length}`);

    return NextResponse.json({
      data: vendorsList,
      count: vendorsList.length
    });
  } catch (error: any) {
    console.error('[API] Error en GET /api/evaluations/vendors:', error);
    // Devolver un array vacío incluso en caso de error interno
    return NextResponse.json({
      data: [],
      error: 'Error interno del servidor',
      message: error.message
    }, { status: 500 });
  }
} 