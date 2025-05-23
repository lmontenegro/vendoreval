import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { createClient } from '@supabase/supabase-js';
import { Database } from '@/lib/database.types';

// Crear un cliente de Supabase con la clave de servicio para operaciones administrativas
const supabaseAdmin = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

// Interfaces para los tipos de datos
interface AdminEvaluationFeedback {
  evaluation_id: string;
  evaluation_title: string;
  vendor_id: string;
  vendor_name: string;
  total_questions: number;
  answered_questions: number;
  no_answers_count: number;
  na_answers_count: number;
  recommendations_count: number;
  completion_percentage: number;
  status: string;
  completed_at: string | null;
  questions_with_issues: QuestionWithIssue[];
}

interface QuestionWithIssue {
  question_id: string;
  question_text: string;
  category: string;
  subcategory: string | null;
  answer: string | null;
  response_value: string;
  recommendation_text: string | null;
  priority: number | null;
  created_at: string | null;
}

export async function GET() {
  try {
    console.log('=== INICIO DE OBTENCIÓN DE FEEDBACK ADMINISTRATIVO ===');
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

    // 2. Verificar que el usuario sea administrador
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id, role_id, role:role_id(name)')
      .eq('id', session.user.id)
      .single();

    if (userError) {
      console.error('Error al obtener datos del usuario:', userError);
      return NextResponse.json(
        { error: 'Error al obtener datos del usuario' },
        { status: 500 }
      );
    }

    // 3. Verificar que el usuario tenga rol de administrador
    const userRole = userData?.role?.name;

    if (userRole !== 'admin') {
      console.log('Acceso denegado - Usuario no es administrador:', { userId: userData?.id, role: userRole });
      return NextResponse.json(
        { error: 'Acceso denegado. Solo los administradores pueden acceder a esta información.' },
        { status: 403 }
      );
    }

    console.log('Usuario administrador verificado:', userData.id);

    // 4. Obtener todas las evaluaciones completadas con sus vendors asociados
    const { data: evaluationsData, error: evaluationsError } = await supabaseAdmin
      .from('evaluation_vendors')
      .select(`
        id,
        evaluation_id,
        vendor_id,
        status,
        completed_at,
        evaluations:evaluation_id(
          id,
          title,
          status
        ),
        vendors:vendor_id(
          id,
          name
        )
      `)
      .eq('status', 'completed');

    if (evaluationsError) {
      console.error('Error al obtener evaluaciones:', evaluationsError);
      return NextResponse.json(
        { error: 'Error al obtener evaluaciones' },
        { status: 500 }
      );
    }

    console.log('Evaluaciones completadas encontradas:', evaluationsData?.length || 0);

    if (!evaluationsData || evaluationsData.length === 0) {
      return NextResponse.json({ data: [] });
    }

    const evaluationVendorIds = evaluationsData.map(ev => ev.id);

    // 5. Obtener todas las respuestas con respuestas "No" o "N/A"
    const { data: problemResponses, error: responsesError } = await supabaseAdmin
      .from('responses')
      .select(`
        id,
        response_value,
        answer,
        question_id,
        evaluation_question_id,
        evaluation_vendor_id,
        evaluation_id,
        created_at,
        questions:question_id(
          id,
          question_text,
          category,
          subcategory,
          recommendation_text
        )
      `)
      .in('evaluation_vendor_id', evaluationVendorIds)
      .in('answer', ['No', 'N/A']);

    if (responsesError) {
      console.error('Error al obtener respuestas problemáticas:', responsesError);
      return NextResponse.json(
        { error: 'Error al obtener respuestas' },
        { status: 500 }
      );
    }

    console.log('Respuestas problemáticas encontradas:', problemResponses?.length || 0);

    // 6. Obtener recomendaciones asociadas a estas respuestas
    const responseIds = problemResponses?.map(r => r.id) || [];
    let recommendationsData: any[] = [];

    if (responseIds.length > 0) {
      const { data: recommendations, error: recommendationsError } = await supabaseAdmin
        .from('recommendations')
        .select(`
          id,
          response_id,
          recommendation_text,
          priority,
          status,
          created_at
        `)
        .in('response_id', responseIds);

      if (recommendationsError) {
        console.error('Error al obtener recomendaciones:', recommendationsError);
      } else {
        recommendationsData = recommendations || [];
      }
    }

    // 7. Obtener estadísticas completas para cada evaluación
    const evaluationStats: AdminEvaluationFeedback[] = [];

    for (const evalData of evaluationsData) {
      const evaluationVendorId = evalData.id;

      // Obtener todas las respuestas para esta evaluación
      const { data: allResponses, error: allResponsesError } = await supabaseAdmin
        .from('responses')
        .select('id, answer')
        .eq('evaluation_vendor_id', evaluationVendorId);

      if (allResponsesError) {
        console.error('Error al obtener todas las respuestas:', allResponsesError);
        continue;
      }

      // Filtrar respuestas problemáticas para esta evaluación
      const evalProblemResponses = problemResponses?.filter(
        r => r.evaluation_vendor_id === evaluationVendorId
      ) || [];

      // Crear mapa de recomendaciones por response_id
      const recommendationsMap = new Map();
      recommendationsData.forEach(rec => {
        recommendationsMap.set(rec.response_id, rec);
      });

      // Procesar preguntas con problemas
      const questionsWithIssues: QuestionWithIssue[] = evalProblemResponses.map(response => {
        const recommendation = recommendationsMap.get(response.id);
        return {
          question_id: response.question_id,
          question_text: response.questions?.question_text || 'Pregunta no disponible',
          category: response.questions?.category || 'Sin categoría',
          subcategory: response.questions?.subcategory,
          answer: response.answer,
          response_value: response.response_value,
          recommendation_text: recommendation?.recommendation_text || response.questions?.recommendation_text,
          priority: recommendation?.priority || null,
          created_at: response.created_at
        };
      });

      // Calcular estadísticas
      const totalQuestions = allResponses?.length || 0;
      const answeredQuestions = allResponses?.filter(r => r.answer).length || 0;
      const noAnswers = allResponses?.filter(r => r.answer === 'No').length || 0;
      const naAnswers = allResponses?.filter(r => r.answer === 'N/A').length || 0;
      const recommendationsCount = evalProblemResponses.filter(r =>
        recommendationsMap.has(r.id) || r.questions?.recommendation_text
      ).length;

      const evaluationFeedback: AdminEvaluationFeedback = {
        evaluation_id: evalData.evaluation_id,
        evaluation_title: evalData.evaluations?.title || 'Evaluación sin título',
        vendor_id: evalData.vendor_id,
        vendor_name: evalData.vendors?.name || 'Vendor desconocido',
        total_questions: totalQuestions,
        answered_questions: answeredQuestions,
        no_answers_count: noAnswers,
        na_answers_count: naAnswers,
        recommendations_count: recommendationsCount,
        completion_percentage: totalQuestions > 0 ? Math.round((answeredQuestions / totalQuestions) * 100) : 0,
        status: evalData.status || 'completed',
        completed_at: evalData.completed_at || null,
        questions_with_issues: questionsWithIssues
      };

      evaluationStats.push(evaluationFeedback);
    }

    // 8. Ordenar por número de problemas (respuestas No + N/A) descendente
    evaluationStats.sort((a, b) => {
      const problemsA = a.no_answers_count + a.na_answers_count;
      const problemsB = b.no_answers_count + b.na_answers_count;
      return problemsB - problemsA;
    });

    console.log('Estadísticas procesadas para evaluaciones:', evaluationStats.length);

    return NextResponse.json({
      data: evaluationStats,
      summary: {
        total_evaluations: evaluationStats.length,
        total_vendors: new Set(evaluationStats.map(e => e.vendor_id)).size,
        total_issues: evaluationStats.reduce((sum, e) => sum + e.no_answers_count + e.na_answers_count, 0),
        total_recommendations: evaluationStats.reduce((sum, e) => sum + e.recommendations_count, 0)
      }
    });

  } catch (error: any) {
    console.error('Error en GET /api/recommendations/admin:', error);
    return NextResponse.json(
      { error: error.message || 'Error interno del servidor' },
      { status: 500 }
    );
  }
} 