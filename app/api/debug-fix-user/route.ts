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

    // Actualizar el usuario para asignarle el rol de proveedor y asociarlo a Crown Security
    const { data: updatedUser, error: updateError } = await supabase
      .from('users')
      .update({
        role_id: 'ecaf2e27-0f37-4532-a245-9ceb09c28593', // ID del rol supplier
        vendor_id: '09254052-6bae-4bce-bf8b-3840e2b5ffdf' // ID de Crown Security
      })
      .eq('id', user.id)
      .select(`
        id,
        email,
        role_id,
        vendor_id,
        roles:role_id (id, name),
        vendors:vendor_id (id, name)
      `)
      .single();

    if (updateError) {
      return NextResponse.json({
        error: 'Error al actualizar el usuario',
        details: updateError.message
      }, { status: 500 });
    }

    // Verificar permisos para la evaluación específica
    const evaluationId = '7b269786-075f-4074-a178-d0600b9571c7';

    if (updatedUser.vendor_id) {
      const { data: evalPermission, error: evalError } = await supabase
        .from('evaluation_vendors')
        .select('id, status')
        .eq('evaluation_id', evaluationId)
        .eq('vendor_id', updatedUser.vendor_id)
        .maybeSingle();

      return NextResponse.json({
        message: 'Usuario actualizado correctamente',
        user: {
          id: user.id,
          email: user.email,
          role: updatedUser.roles?.name,
          vendor: updatedUser.vendors?.name,
          vendor_id: updatedUser.vendor_id
        },
        evaluation_permission: evalPermission || null,
        has_permission: !!evalPermission
      });
    } else {
      return NextResponse.json({
        message: 'Usuario actualizado correctamente, pero no tiene vendor_id',
        user: {
          id: user.id,
          email: user.email,
          role: updatedUser.roles?.name,
          vendor: null,
          vendor_id: null
        },
        evaluation_permission: null,
        has_permission: false
      });
    }

  } catch (error: any) {
    return NextResponse.json({
      error: 'Error interno del servidor',
      details: error.message
    }, { status: 500 });
  }
} 