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

    // Obtener el peso y tipo de la pregunta
    const { data: question, error: questionError } = await supabaseAdmin
      .from('questions')
      .select('weight, type')
      .eq('id', questionId)
      .single();

    if (questionError || !question) {
      return NextResponse.json({
        error: 'No se pudo obtener la información de la pregunta',
        details: questionError?.message
      }, { status: 500 });
    }

    // Definir la respuesta de ejemplo (puedes adaptar esto a tu flujo real)
    const responseValue = 'Sí'; // Cambia a 'No' o 'No Aplica' para probar otros casos

    // Calcular el score según la lógica de negocio
    let score = 0;
    if (question.type === 'si/no/no aplica') {
      if (responseValue === 'Sí') score = question.weight;
      else score = 0;
    } else if (question.type === 'escala 1-5') {
      const value = parseInt(responseValue);
      if (!isNaN(value)) score = (value / 5) * question.weight;
    }

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
          response_value: responseValue,
          notes: 'Nota de prueba actualizada',
          score,
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
          response_value: responseValue,
          notes: 'Nota de prueba',
          vendor_id: userData.vendor_id,
          score
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