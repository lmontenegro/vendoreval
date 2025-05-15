import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';

export async function GET() {
  try {
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

    // 3. Verificar si el usuario es un proveedor
    const userRole = userData?.role?.name;
    const vendorId = userData?.vendor_id;

    if (!vendorId) {
      return NextResponse.json(
        { error: 'Datos de proveedor no encontrados' },
        { status: 403 }
      );
    }

    console.log('Vendor ID:', vendorId);

    // Obtener datos de las tablas relevantes
    const [
      evaluationVendorsResult,
      evaluationsResult,
      questionsResult,
      responsesResult,
      questionEvaluationResult
    ] = await Promise.all([
      // 1. Evaluaciones asignadas al proveedor
      supabase
        .from('evaluation_vendors')
        .select('*')
        .eq('vendor_id', vendorId),

      // 2. Todas las evaluaciones
      supabase
        .from('evaluations')
        .select('*'),

      // 3. Preguntas con recomendaciones
      supabase
        .from('questions')
        .select('*'),

      // 4. Respuestas del proveedor
      supabase
        .from('responses')
        .select('*')
        .eq('vendor_id', vendorId),

      // 5. Relaciones entre evaluaciones y preguntas
      supabase
        .from('evaluation_questions')
        .select('*')
    ]);

    // Obtener todas las evaluaciones completadas
    const completedEvaluationVendors = evaluationVendorsResult.data?.filter(ev => ev.status === 'completed') || [];
    const completedEvaluationIds = completedEvaluationVendors.map(ev => ev.evaluation_id);

    // Obtener respuestas específicas para las evaluaciones completadas
    const responsesForCompletedEvaluations = responsesResult.data?.filter(r =>
      completedEvaluationIds.includes(r.evaluation_id)
    ) || [];

    // Contar respuestas No/N/A usando SOLO el campo response_value
    const noResponses = responsesResult.data?.filter(r => {
      // Normalizar response_value para comparación insensible a mayúsculas/minúsculas
      const responseValueLower = r.response_value ? String(r.response_value).toLowerCase() : '';

      // Verificar SOLO el campo response_value
      return responseValueLower === 'no' || responseValueLower === 'n/a';
    }) || [];

    // Contar respuestas No/N/A para evaluaciones completadas
    const noResponsesForCompletedEvaluations = responsesForCompletedEvaluations.filter(r => {
      // Normalizar response_value para comparación insensible a mayúsculas/minúsculas
      const responseValueLower = r.response_value ? String(r.response_value).toLowerCase() : '';

      // Verificar SOLO el campo response_value
      return responseValueLower === 'no' || responseValueLower === 'n/a';
    });

    // Analizar los valores de 'answer' y 'response_value' que existen
    const answerValues = new Set();
    const responseValues = new Set();
    responsesResult.data?.forEach(r => {
      if (r.answer !== null && r.answer !== undefined) answerValues.add(r.answer);
      if (r.response_value !== null && r.response_value !== undefined) responseValues.add(r.response_value);
    });

    // Analizar los campos disponibles en las respuestas
    const responseFields = new Set<string>();
    if (responsesResult.data && responsesResult.data.length > 0) {
      Object.keys(responsesResult.data[0]).forEach(key => responseFields.add(key));
    }

    // Obtener estructura de una pregunta para ver dónde está recommendation_text
    const sampleQuestions = questionsResult.data?.slice(0, 5).map(q => ({
      id: q.id,
      question_text: q.question_text,
      recommendation_text: q.recommendation_text,
      options: q.options
    })) || [];

    // Recopilar estadísticas
    const stats = {
      user: {
        id: session.user.id,
        role: userRole,
        vendor_id: vendorId
      },
      counts: {
        evaluationVendors: evaluationVendorsResult.data?.length || 0,
        completedEvaluationVendors: completedEvaluationVendors.length,
        evaluations: evaluationsResult.data?.length || 0,
        questions: questionsResult.data?.length || 0,
        questionsWithRecommendationText: questionsResult.data?.filter(q => q.recommendation_text).length || 0,
        questionsWithRecommendationInOptions: questionsResult.data?.filter(q => {
          if (!q.options || typeof q.options !== 'object') return false;

          // Si es un objeto (no un array), verificar si tiene la propiedad recommendation_text
          if (!Array.isArray(q.options)) {
            return 'recommendation_text' in q.options;
          }

          return false;
        }).length || 0,
        responses: responsesResult.data?.length || 0,
        responsesForCompletedEvaluations: responsesForCompletedEvaluations.length,
        noResponses: noResponses.length,
        noResponsesForCompletedEvaluations: noResponsesForCompletedEvaluations.length,
        questionEvaluations: questionEvaluationResult.data?.length || 0
      },
      answerValues: Array.from(answerValues),
      responseValues: Array.from(responseValues),
      responseFields: Array.from(responseFields),
      samples: {
        evaluationVendors: evaluationVendorsResult.data?.slice(0, 2) || [],
        completedEvaluationVendors: completedEvaluationVendors.slice(0, 2),
        completedEvaluationIds,
        questions: sampleQuestions,
        noResponses: noResponses.slice(0, 5) || [],
        noResponsesForCompletedEvaluations: noResponsesForCompletedEvaluations.slice(0, 5),
        // Añadir muestras de respuestas para ver su estructura
        responses: responsesResult.data?.slice(0, 3) || [],
        responsesForCompletedEvaluations: responsesForCompletedEvaluations.slice(0, 3)
      },
      // Análisis detallado de valores
      valueAnalysis: {
        responsesByAnswerValue: Array.from(answerValues).map(value => ({
          value,
          count: responsesResult.data?.filter(r => r.answer === value).length || 0,
          completedCount: responsesForCompletedEvaluations.filter(r => r.answer === value).length
        })),
        responsesByResponseValue: Array.from(responseValues).map(value => ({
          value,
          count: responsesResult.data?.filter(r => r.response_value === value).length || 0,
          completedCount: responsesForCompletedEvaluations.filter(r => r.response_value === value).length
        }))
      }
    };

    return NextResponse.json(stats);
  } catch (error) {
    console.error('Error en el endpoint de diagnóstico:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
} 