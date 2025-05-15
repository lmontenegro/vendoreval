import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';

export async function GET(
  request: Request,
  { params }: { params: { evaluationId: string } }
) {
  try {
    const evaluationId = params.evaluationId;
    if (!evaluationId) {
      return NextResponse.json(
        { error: 'ID de evaluación no proporcionado' },
        { status: 400 }
      );
    }

    const cookieStore = cookies();
    const supabase = createServerClient();

    // 1. Verificar la sesión del usuario
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();

    if (sessionError || !session) {
      console.error('Error de sesión:', sessionError);
      return NextResponse.json(
        { error: 'No se encontró una sesión activa' },
        { status: 401 }
      );
    }

    // 2. Obtener datos del usuario, incluyendo el rol y vendor_id
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('role_id, vendor_id, role:role_id(name)')
      .eq('id', session.user.id)
      .single();

    if (userError) {
      console.error('Error al obtener datos del usuario:', userError);
      return NextResponse.json(
        { error: 'Error al obtener datos del usuario' },
        { status: 500 }
      );
    }

    // Verificar si el usuario es un proveedor
    const userRole = userData?.role?.name;
    const vendorId = userData?.vendor_id;

    if (!vendorId) {
      return NextResponse.json(
        { error: 'Datos de proveedor no encontrados' },
        { status: 403 }
      );
    }

    // 3. Obtener datos de la evaluación
    const { data: evaluation, error: evaluationError } = await supabase
      .from('evaluations')
      .select('*')
      .eq('id', evaluationId)
      .single();

    if (evaluationError) {
      console.error('Error al obtener la evaluación:', evaluationError);
      return NextResponse.json(
        { error: 'Error al obtener la evaluación' },
        { status: 500 }
      );
    }

    if (!evaluation) {
      return NextResponse.json(
        { error: 'Evaluación no encontrada' },
        { status: 404 }
      );
    }

    // 4. Obtener todas las respuestas para esta evaluación
    let allResponses: any[] = [];
    const responsesResult = await supabase
      .from('responses')
      .select('*')
      .eq('evaluation_id', evaluationId)
      .eq('vendor_id', vendorId);

    if (responsesResult.error) {
      console.error('Error al obtener respuestas:', responsesResult.error);
      return NextResponse.json(
        { error: 'Error al obtener respuestas' },
        { status: 500 }
      );
    } else {
      allResponses = responsesResult.data || [];
    }

    // Analizar los campos de las respuestas
    const responseFields = new Set<string>();
    if (allResponses.length > 0) {
      Object.keys(allResponses[0]).forEach(key => responseFields.add(key));
    }

    // 5. Filtrar respuestas No/N/A - Solo usando response_value
    const noResponses = allResponses.filter(r => {
      // Normalizar response_value para comparación insensible a mayúsculas/minúsculas
      const responseValueLower = r.response_value ? String(r.response_value).toLowerCase() : '';

      // Verificar SOLO el campo response_value
      return responseValueLower === 'no' || responseValueLower === 'n/a';
    });

    // 6. Obtener las preguntas relacionadas con las respuestas
    const questionIds = Array.from(new Set(allResponses.map(r => r.question_id)));

    let questions: any[] = [];
    if (questionIds.length > 0) {
      const questionsResult = await supabase
        .from('questions')
        .select('*')
        .in('id', questionIds);

      if (questionsResult.error) {
        console.error('Error al obtener preguntas:', questionsResult.error);
        return NextResponse.json(
          { error: 'Error al obtener preguntas' },
          { status: 500 }
        );
      } else {
        questions = questionsResult.data || [];
      }
    }

    // Crear un mapa de preguntas para acceso rápido
    const questionsMap = new Map();
    questions.forEach(q => {
      questionsMap.set(q.id, q);
    });

    // 7. Generar recomendaciones potenciales
    const potentialRecommendations = noResponses
      .map(response => {
        const question = questionsMap.get(response.question_id);
        if (!question) return null;

        // Buscar el texto de recomendación
        let recommendationText = '';
        let recommendationSource = '';

        // Primero verificar si hay recommendation_text directo
        if (question.recommendation_text && question.recommendation_text.trim() !== '') {
          recommendationText = question.recommendation_text;
          recommendationSource = 'campo directo';
        }
        // Si no hay recommendation_text directo, buscar en options
        else if (question.options && typeof question.options === 'object') {
          // Si options es un objeto (no un array)
          if (!Array.isArray(question.options)) {
            // Verificar si tiene la propiedad recommendation_text
            const optionsRecText = question.options.recommendation_text;
            if (optionsRecText && typeof optionsRecText === 'string' && optionsRecText.trim() !== '') {
              recommendationText = optionsRecText;
              recommendationSource = 'campo options';
            }
          }
        }

        return {
          response_id: response.id,
          question_id: question.id,
          question_text: question.question_text,
          answer: response.answer,
          response_value: response.response_value,
          recommendation_text: recommendationText,
          recommendation_source: recommendationSource,
          has_recommendation: !!recommendationText && recommendationText.trim() !== '',
        };
      })
      .filter((item): item is NonNullable<typeof item> => item !== null);

    // 8. Analizar los valores de 'answer' y 'response_value' que existen
    const answerValues = new Set<string>();
    const responseValues = new Set<string>();

    allResponses.forEach(response => {
      if (response.answer !== null && response.answer !== undefined) {
        answerValues.add(response.answer);
      }
      if (response.response_value !== null && response.response_value !== undefined) {
        responseValues.add(response.response_value);
      }
    });

    // 9. Obtener datos de evaluation_vendors para esta evaluación
    let evaluationVendors: any[] = [];
    const evResult = await supabase
      .from('evaluation_vendors')
      .select('*')
      .eq('evaluation_id', evaluationId);

    if (evResult.error) {
      console.error('Error al obtener evaluation_vendors:', evResult.error);
    } else {
      evaluationVendors = evResult.data || [];
    }

    // 10. Preparar el resultado
    const result = {
      evaluation,
      statistics: {
        totalResponses: allResponses.length,
        noResponses: noResponses.length,
        potentialRecommendations: potentialRecommendations.length,
        validRecommendations: potentialRecommendations.filter(r => r.has_recommendation).length,
        uniqueAnswerValues: Array.from(answerValues),
        uniqueResponseValues: Array.from(responseValues),
        responseFields: Array.from(responseFields)
      },
      evaluationVendors,
      responses: {
        all: allResponses.slice(0, 10), // Limitar a 10 para no sobrecargar la respuesta
        noResponses: noResponses.slice(0, 10),
      },
      questions: questions.slice(0, 10),
      potentialRecommendations,
      // Análisis detallado de valores
      valueAnalysis: {
        responsesByAnswerValue: Array.from(answerValues).map(value => ({
          value,
          count: allResponses.filter(r => r.answer === value).length
        })),
        responsesByResponseValue: Array.from(responseValues).map(value => ({
          value,
          count: allResponses.filter(r => r.response_value === value).length
        }))
      }
    };

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error en el endpoint de prueba:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
} 