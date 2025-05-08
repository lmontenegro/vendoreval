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
    const email = url.searchParams.get('email') || 'luis.montenegro@ciprodata.cl';

    // Buscar el usuario por email
    const { data: userData, error: userError } = await supabaseAdmin
      .from('users')
      .select('id, email, role_id, vendor_id')
      .eq('email', email)
      .single();

    if (userError || !userData) {
      return NextResponse.json({
        error: 'Error al buscar el usuario o usuario no encontrado',
        details: userError?.message
      }, { status: 500 });
    }

    // Verificar si el usuario tiene un vendor_id
    if (!userData.vendor_id) {
      return NextResponse.json({
        error: 'El usuario no tiene un vendor_id asignado'
      }, { status: 400 });
    }

    // Datos de la evaluación y pregunta
    const evaluationId = '7b269786-075f-4074-a178-d0600b9571c7';
    const questionId = '832005c1-5477-4375-8131-3c55e3ed3aeb';

    // Verificar si ya existe una respuesta para esta pregunta
    const { data: existingResponse, error: findError } = await supabaseAdmin
      .from('responses')
      .select('id')
      .eq('evaluation_id', evaluationId)
      .eq('question_id', questionId)
      .eq('vendor_id', userData.vendor_id)
      .maybeSingle();

    if (existingResponse) {
      // Actualizar la respuesta existente
      const { data: updatedResponse, error: updateError } = await supabaseAdmin
        .from('responses')
        .update({
          response_value: '4', // Valor de ejemplo
          notes: 'Nota de prueba actualizada',
          updated_at: new Date().toISOString()
        })
        .eq('id', existingResponse.id)
        .select()
        .single();

      if (updateError) {
        return NextResponse.json({
          error: 'Error al actualizar la respuesta',
          details: updateError.message
        }, { status: 500 });
      }

      return NextResponse.json({
        message: 'Respuesta actualizada correctamente',
        response: updatedResponse
      });
    } else {
      // Crear una nueva respuesta
      const { data: newResponse, error: insertError } = await supabaseAdmin
        .from('responses')
        .insert({
          evaluation_id: evaluationId,
          question_id: questionId,
          response_value: '3', // Valor de ejemplo
          notes: 'Nota de prueba',
          vendor_id: userData.vendor_id,
          score: 0 // Valor inicial
        })
        .select()
        .single();

      if (insertError) {
        return NextResponse.json({
          error: 'Error al crear la respuesta',
          details: insertError.message
        }, { status: 500 });
      }

      return NextResponse.json({
        message: 'Respuesta creada correctamente',
        response: newResponse
      });
    }

  } catch (error: any) {
    return NextResponse.json({
      error: 'Error interno del servidor',
      details: error.message
    }, { status: 500 });
  }
} 