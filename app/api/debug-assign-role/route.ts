import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Database } from '@/lib/database.types';

// Crear un cliente de Supabase con la clave de servicio
const supabaseAdmin = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

export async function GET(request: Request) {
  try {
    // Obtener el email del usuario de los query params
    const url = new URL(request.url);
    const email = url.searchParams.get('email');

    if (!email) {
      return NextResponse.json({ error: 'Debes proporcionar un email' }, { status: 400 });
    }

    // Buscar el usuario por email
    const { data: userData, error: userError } = await supabaseAdmin
      .from('users')
      .select('id, email, role_id, vendor_id')
      .eq('email', email)
      .single();

    if (userError) {
      return NextResponse.json({
        error: 'Error al buscar el usuario',
        details: userError.message
      }, { status: 500 });
    }

    if (!userData) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
    }

    // Actualizar el usuario para asignarle el rol de proveedor y asociarlo a Crown Security
    const { data: updatedUser, error: updateError } = await supabaseAdmin
      .from('users')
      .update({
        role_id: 'ecaf2e27-0f37-4532-a245-9ceb09c28593', // ID del rol supplier
        vendor_id: '09254052-6bae-4bce-bf8b-3840e2b5ffdf' // ID de Crown Security
      })
      .eq('id', userData.id)
      .select('id, email, role_id, vendor_id')
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
      const { data: evalPermission, error: evalError } = await supabaseAdmin
        .from('evaluation_vendors')
        .select('id, status')
        .eq('evaluation_id', evaluationId)
        .eq('vendor_id', updatedUser.vendor_id)
        .maybeSingle();

      return NextResponse.json({
        message: 'Usuario actualizado correctamente',
        user: updatedUser,
        evaluation_permission: evalPermission || null,
        has_permission: !!evalPermission
      });
    } else {
      return NextResponse.json({
        message: 'Usuario actualizado correctamente, pero no tiene vendor_id',
        user: updatedUser,
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