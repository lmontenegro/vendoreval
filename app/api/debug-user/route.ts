import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
  try {
    const supabase = createServerClient();

    // Obtener el usuario actual
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'No has iniciado sesión' }, { status: 401 });
    }

    // Obtener información adicional del usuario
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select(`
        id,
        email,
        role_id,
        vendor_id,
        roles:role_id (id, name),
        vendors:vendor_id (id, name)
      `)
      .eq('id', user.id)
      .single();

    if (userError) {
      return NextResponse.json({
        error: 'Error al obtener datos del usuario',
        details: userError.message
      }, { status: 500 });
    }

    // Verificar permisos para la evaluación específica
    const evaluationId = '7b269786-075f-4074-a178-d0600b9571c7';

    // Verificar si el usuario tiene un vendor_id
    if (userData.vendor_id) {
      const { data: evalPermission, error: evalError } = await supabase
        .from('evaluation_vendors')
        .select('id, status')
        .eq('evaluation_id', evaluationId)
        .eq('vendor_id', userData.vendor_id)
        .maybeSingle();

      return NextResponse.json({
        user: {
          id: user.id,
          email: user.email,
          role: userData.roles?.name,
          vendor: userData.vendors?.name,
          vendor_id: userData.vendor_id
        },
        evaluation_permission: evalPermission || null,
        has_permission: !!evalPermission,
        auth_user: user,
        public_user: userData
      });
    } else {
      // Si el usuario no tiene vendor_id
      return NextResponse.json({
        user: {
          id: user.id,
          email: user.email,
          role: userData.roles?.name,
          vendor: null,
          vendor_id: null
        },
        evaluation_permission: null,
        has_permission: false,
        auth_user: user,
        public_user: userData,
        error: "Usuario no asociado a un proveedor"
      });
    }

  } catch (error: any) {
    return NextResponse.json({
      error: 'Error interno del servidor',
      details: error.message
    }, { status: 500 });
  }
} 