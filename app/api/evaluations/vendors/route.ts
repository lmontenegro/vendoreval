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
    const supabase = createServerClient();

    // 1. Verificar si el usuario está autenticado
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      // Devolver un array vacío en lugar de un error de autenticación
      // Esto evita el error de iteración en el cliente
      return NextResponse.json({ data: [] }, { status: 200 });
    }

    // 2. Obtener la lista básica de proveedores (solo id y nombre)
    const { data: vendors, error: vendorsError } = await supabase
      .from('vendors')
      .select('id, name')
      .eq('is_active', true)
      .order('name');

    if (vendorsError) {
      console.error("Error obteniendo lista de proveedores:", vendorsError);
      // Devolver un array vacío en lugar de un error
      return NextResponse.json({ data: [] }, { status: 200 });
    }

    // Asegurarse de que vendors es un array
    const vendorsList = Array.isArray(vendors) ? vendors : [];
    return NextResponse.json({ data: vendorsList });
  } catch (error: any) {
    console.error('Error en GET /api/evaluations/vendors:', error);
    // Devolver un array vacío incluso en caso de error interno
    return NextResponse.json({ data: [] }, { status: 200 });
  }
} 