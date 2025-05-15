import { createServerClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const supabase = createServerClient();

    // Verificar autenticación
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    // Verificar si el usuario es administrador
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('role_id')
      .eq('id', user.id)
      .single();

    if (userError) {
      return NextResponse.json({ error: 'Error al verificar rol de usuario' }, { status: 500 });
    }

    // Obtener todas las preguntas que tienen recommendation_text en options
    const { data: questions, error: questionsError } = await supabase
      .from('questions')
      .select('id, options')
      .is('recommendation_text', null)
      .not('options', 'is', null);

    if (questionsError) {
      return NextResponse.json({ error: 'Error al obtener preguntas' }, { status: 500 });
    }

    console.log(`Encontradas ${questions?.length || 0} preguntas para migrar`);

    // Actualizar cada pregunta para mover recommendation_text desde options
    const updates = [];
    const errors = [];

    for (const question of questions || []) {
      try {
        let options = question.options;
        let recommendationText: string | null = null;

        // Si options es string, intentar parsearlo
        if (typeof options === 'string') {
          try {
            options = JSON.parse(options);
          } catch (e) {
            console.error(`Error al parsear options para pregunta ${question.id}:`, e);
            errors.push({ id: question.id, error: 'Error al parsear options' });
            continue;
          }
        }

        // Extraer recommendation_text si existe
        if (options && typeof options === 'object' && !Array.isArray(options)) {
          const typedOptions = options as { recommendation_text?: string };
          recommendationText = typedOptions.recommendation_text || null;
        }

        if (recommendationText) {
          // Actualizar la pregunta con el nuevo campo
          const { error: updateError } = await supabase
            .from('questions')
            .update({ recommendation_text: recommendationText })
            .eq('id', question.id);

          if (updateError) {
            console.error(`Error al actualizar pregunta ${question.id}:`, updateError);
            errors.push({ id: question.id, error: updateError });
          } else {
            updates.push(question.id);
          }
        }
      } catch (error) {
        console.error(`Error procesando pregunta ${question.id}:`, error);
        errors.push({ id: question.id, error: 'Error inesperado' });
      }
    }

    return NextResponse.json({
      success: true,
      updated: updates.length,
      errors: errors.length > 0 ? errors : null
    });
  } catch (error) {
    console.error('Error en migración de recomendaciones:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
} 