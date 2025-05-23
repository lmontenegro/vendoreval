import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { createClient } from '@supabase/supabase-js';
import { Database } from '@/lib/database.types';

// Define interfaces for our data structures
interface Recommendation {
  id: string;
  recommendation_text: string;
  question_text: string;
  evaluation_id: string;
  evaluation_title: string;
  answer: string;
  response_value: string;
  priority: number;
  status: string;
  due_date: string | null;
  created_at: string;
  evaluation_question_id: string;
  evaluation_vendor_id: string;
}

interface RecommendationGroup {
  evaluation_id: string;
  evaluation_title: string;
  recommendations: Recommendation[];
}

// Crear un cliente de Supabase con la clave de servicio para operaciones administrativas
const supabaseAdmin = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

export async function GET() {
  try {
    console.log('=== INICIO DE OBTENCIÓN DE RECOMENDACIONES ===');
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
      .select('id, role_id, vendor_id, role:role_id(name)')
      .eq('id', session.user.id)
      .single();

    if (userError) {
      console.error('Error al obtener datos del usuario:', userError);
      return NextResponse.json(
        { error: 'Error al obtener datos del usuario' },
        { status: 500 }
      );
    }

    // 3. Verificar permisos basados en el rol
    const userRole = userData?.role?.name;
    const vendorId = userData?.vendor_id;

    console.log('Información del usuario:');
    console.log('- ID:', userData?.id);
    console.log('- Rol:', userRole);
    console.log('- Vendor ID:', vendorId);

    // Permitir acceso a administradores y proveedores
    const isAdmin = userRole === 'admin';
    const isSupplier = userRole === 'supplier' && vendorId;

    if (!isAdmin && !isSupplier) {
      return NextResponse.json(
        { error: 'Acceso no autorizado. Solo administradores y proveedores pueden ver recomendaciones.' },
        { status: 403 }
      );
    }

    // 4. Obtener las evaluaciones según el rol del usuario
    let completedEvaluationVendors;

    if (isAdmin) {
      // Los administradores pueden ver todas las evaluaciones completadas
      console.log('Usuario administrador: obteniendo todas las evaluaciones');
      const { data: allEvaluationVendors, error: evError } = await supabaseAdmin
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
          )
        `)
        .eq('status', 'completed');

      if (evError) {
        console.error('Error al obtener todas las evaluaciones:', evError);
        return NextResponse.json(
          { error: 'Error al obtener evaluaciones' },
          { status: 500 }
        );
      }

      completedEvaluationVendors = allEvaluationVendors;
    } else {
      // Los proveedores solo ven sus evaluaciones
      console.log('Usuario proveedor: obteniendo evaluaciones del vendor ID:', vendorId);
      const { data: vendorEvaluationVendors, error: evError } = await supabaseAdmin
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
          )
        `)
        .eq('vendor_id', vendorId!)
        .eq('status', 'completed');

      if (evError) {
        console.error('Error al obtener evaluaciones del proveedor:', evError);
        return NextResponse.json(
          { error: 'Error al obtener evaluaciones asignadas' },
          { status: 500 }
        );
      }

      completedEvaluationVendors = vendorEvaluationVendors;
    }

    console.log('Evaluaciones completadas encontradas:', completedEvaluationVendors?.length || 0);

    if (!completedEvaluationVendors || completedEvaluationVendors.length === 0) {
      console.log('No se encontraron evaluaciones completadas');
      return NextResponse.json({ data: [] });
    }

    // Extraer IDs de evaluation_vendors
    const evaluationVendorIds = completedEvaluationVendors.map(ev => ev.id);
    console.log('IDs de evaluation_vendors:', evaluationVendorIds);

    // Crear un mapa para acceso rápido a las evaluaciones
    const evaluationsMap = new Map();
    completedEvaluationVendors.forEach(ev => {
      if (ev.evaluations) {
        evaluationsMap.set(ev.evaluation_id, ev.evaluations);
      }
    });

    // 5. Obtener todas las respuestas para estas evaluaciones usando evaluation_vendor_id
    // Usamos supabaseAdmin para evitar restricciones de RLS
    console.log(`Buscando respuestas para evaluaciones completadas con evaluation_vendor_id`);
    const { data: allResponses, error: allResponsesError } = await supabaseAdmin
      .from('responses')
      .select(`
        id,
        response_value,
        answer,
        question_id,
        evaluation_question_id,
        evaluation_vendor_id,
        evaluation_id
      `)
      .in('evaluation_vendor_id', evaluationVendorIds);

    if (allResponsesError) {
      console.error('Error al obtener todas las respuestas:', allResponsesError);
      return NextResponse.json(
        { error: 'Error al obtener respuestas' },
        { status: 500 }
      );
    }

    console.log(`Total de respuestas para las evaluaciones: ${allResponses?.length || 0}`);

    // Verificar si hay respuestas
    if (!allResponses || allResponses.length === 0) {
      console.log('No se encontraron respuestas para las evaluaciones completadas');

      // Intentar obtener respuestas con el método alternativo (usando evaluation_id)
      const evaluationIds = completedEvaluationVendors.map(ev => ev.evaluation_id);
      console.log('Intentando método alternativo con evaluation_ids:', evaluationIds);

      let alternativeResponses;
      if (isAdmin) {
        // Para admin, obtener todas las respuestas de estas evaluaciones
        const { data: adminResponses, error: altResponsesError } = await supabaseAdmin
          .from('responses')
          .select(`
            id,
            response_value,
            answer,
            question_id,
            evaluation_question_id,
            evaluation_vendor_id,
            evaluation_id
          `)
          .in('evaluation_id', evaluationIds);

        if (altResponsesError) {
          console.error('Error al obtener respuestas con método alternativo (admin):', altResponsesError);
          return NextResponse.json({ data: [] });
        }
        alternativeResponses = adminResponses;
      } else {
        // Para proveedor, filtrar por vendor_id
        const { data: supplierResponses, error: altResponsesError } = await supabaseAdmin
          .from('responses')
          .select(`
            id,
            response_value,
            answer,
            question_id,
            evaluation_question_id,
            evaluation_vendor_id,
            evaluation_id
          `)
          .in('evaluation_id', evaluationIds)
          .eq('vendor_id', vendorId!);

        if (altResponsesError) {
          console.error('Error al obtener respuestas con método alternativo (proveedor):', altResponsesError);
          return NextResponse.json({ data: [] });
        }
        alternativeResponses = supplierResponses;
      }

      console.log(`Respuestas encontradas con método alternativo: ${alternativeResponses?.length || 0}`);

      if (!alternativeResponses || alternativeResponses.length === 0) {
        console.log('No se encontraron respuestas con ningún método');
        return NextResponse.json({ data: [] });
      }

      // Si encontramos respuestas con el método alternativo, usarlas
      console.log('Usando respuestas del método alternativo');
      return processResponses(alternativeResponses, evaluationsMap);
    }

    // Procesar las respuestas encontradas
    return processResponses(allResponses, evaluationsMap);

  } catch (error) {
    console.error('Error al obtener recomendaciones:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

// Función auxiliar para procesar las respuestas y generar las recomendaciones
async function processResponses(responses: any[], evaluationsMap: Map<string, any>) {
  try {
    // 6. Filtrar las respuestas "No" o "N/A"
    const negativeResponses = responses.filter(r => {
      // Verificar primero el campo answer (que es tipado)
      if (r.answer === 'No' || r.answer === 'N/A') {
        return true;
      }

      // Verificar response_value como respaldo
      const responseValueLower = r.response_value ? String(r.response_value).toLowerCase() : '';
      return responseValueLower === 'no' || responseValueLower === 'n/a';
    });

    console.log('Respuestas negativas encontradas:', negativeResponses.length);

    if (negativeResponses.length === 0) {
      console.log('No se encontraron respuestas negativas');
      return NextResponse.json({ data: [] });
    }

    // 7. Extraer los IDs de evaluation_question_id de las respuestas negativas
    const evaluationQuestionIds = negativeResponses
      .filter(r => r.evaluation_question_id)
      .map(r => r.evaluation_question_id);

    console.log('IDs de evaluation_questions a buscar:', evaluationQuestionIds.length);

    if (evaluationQuestionIds.length === 0) {
      console.log('No se encontraron evaluation_question_ids en las respuestas');
      return NextResponse.json({ data: [] });
    }

    // 8. Obtener información de evaluation_questions junto con la información de las preguntas
    const { data: evaluationQuestions, error: evQuestionsError } = await supabaseAdmin
      .from('evaluation_questions')
      .select(`
        id,
        question_id,
        evaluation_id,
        questions:question_id(
          id,
          question_text,
          recommendation_text,
          options
        )
      `)
      .in('id', evaluationQuestionIds);

    if (evQuestionsError) {
      console.error('Error al obtener evaluation_questions:', evQuestionsError);
      return NextResponse.json(
        { error: 'Error al obtener detalles de preguntas de evaluación' },
        { status: 500 }
      );
    }

    console.log('Evaluation Questions encontradas:', evaluationQuestions?.length || 0);

    if (!evaluationQuestions || evaluationQuestions.length === 0) {
      console.log('No se encontraron detalles de preguntas');

      // Intentar obtener las preguntas directamente
      const questionIds = negativeResponses.map(r => r.question_id);
      console.log('Intentando obtener preguntas directamente:', questionIds.length);

      const { data: questions, error: questionsError } = await supabaseAdmin
        .from('questions')
        .select('id, question_text, recommendation_text, options')
        .in('id', questionIds);

      if (questionsError || !questions || questions.length === 0) {
        console.error('Error al obtener preguntas directamente:', questionsError);
        return NextResponse.json({ data: [] });
      }

      console.log('Preguntas encontradas directamente:', questions.length);

      // Crear un mapa de preguntas
      const questionsMap = new Map();
      questions.forEach(q => {
        questionsMap.set(q.id, q);
      });

      // Procesar con las preguntas directamente
      return processWithDirectQuestions(negativeResponses, questionsMap, evaluationsMap);
    }

    // Crear un mapa de evaluation_questions para acceso rápido
    const evQuestionsMap = new Map();
    evaluationQuestions.forEach(eq => {
      evQuestionsMap.set(eq.id, eq);
    });

    // 9. Combinar toda la información para generar las recomendaciones
    const formattedRecommendations = negativeResponses
      .map(response => {
        // Solo procesar respuestas que tengan evaluation_question_id
        if (!response.evaluation_question_id) {
          console.log(`Respuesta ${response.id} sin evaluation_question_id`);
          return null;
        }

        // Obtener la información de la pregunta a través de evaluation_question_id
        const evaluationQuestion = evQuestionsMap.get(response.evaluation_question_id);
        if (!evaluationQuestion || !evaluationQuestion.questions) {
          console.log(`No se encontró información para evaluation_question_id ${response.evaluation_question_id}`);
          return null;
        }

        const question = evaluationQuestion.questions;

        // Obtener información de la evaluación
        const evaluation = evaluationsMap.get(response.evaluation_id);
        if (!evaluation) {
          console.log(`No se encontró la evaluación para la respuesta ${response.id}`);
          return null;
        }

        // Buscar el texto de recomendación en el campo recommendation_text o en options
        let recommendationText = '';

        // Primero verificar si hay recommendation_text directo
        if (question.recommendation_text && question.recommendation_text.trim() !== '') {
          recommendationText = question.recommendation_text;
        }
        // Si no hay recommendation_text directo, buscar en options
        else if (question.options && typeof question.options === 'object') {
          // Si options es un objeto (no un array)
          if (!Array.isArray(question.options)) {
            // Verificar si tiene la propiedad recommendation_text
            const optionsRecText = question.options.recommendation_text;
            if (optionsRecText && typeof optionsRecText === 'string' && optionsRecText.trim() !== '') {
              recommendationText = optionsRecText;
            }
          }
        }

        // Solo incluir respuestas que tengan un texto de recomendación y que no esté vacío
        if (!recommendationText || recommendationText.trim() === '') {
          console.log(`No se encontró recommendation_text para la pregunta ${question.id}`);
          return null;
        }

        // Determinar el valor de answer (usar response_value como fallback si answer no está establecido)
        const answer = response.answer || response.response_value;
        const responseValueLower = answer ? String(answer).toLowerCase() : '';

        return {
          id: response.id,
          recommendation_text: recommendationText,
          question_text: question.question_text || 'Pregunta sin texto',
          evaluation_id: response.evaluation_id,
          evaluation_title: evaluation.title || 'Evaluación sin título',
          answer: answer || '',
          response_value: response.response_value,
          evaluation_question_id: response.evaluation_question_id,
          evaluation_vendor_id: response.evaluation_vendor_id || null,
          priority: (response.answer === 'No' || responseValueLower === 'no') ? 1 : 2, // Prioridad alta para No, media para N/A
          status: 'pending', // Estado pendiente por defecto
          due_date: null,
          created_at: new Date().toISOString(),
        } as Recommendation;
      })
      .filter((item): item is Recommendation => item !== null);

    console.log(`Recomendaciones formateadas: ${formattedRecommendations.length}`);

    // 10. Agrupar recomendaciones por evaluación
    const recommendationsByEvaluation = formattedRecommendations.reduce<Record<string, RecommendationGroup>>((acc, rec) => {
      const evalId = rec.evaluation_id;
      if (!acc[evalId]) {
        acc[evalId] = {
          evaluation_id: evalId,
          evaluation_title: rec.evaluation_title,
          recommendations: []
        };
      }
      acc[evalId].recommendations.push(rec);
      return acc;
    }, {});

    // Convertir a array para la respuesta
    const result = Object.values(recommendationsByEvaluation);

    console.log(`Grupos de recomendaciones: ${result.length}`);
    console.log('=== FIN DE OBTENCIÓN DE RECOMENDACIONES ===');

    return NextResponse.json({ data: result });
  } catch (error) {
    console.error('Error al procesar respuestas:', error);
    return NextResponse.json(
      { error: 'Error al procesar respuestas' },
      { status: 500 }
    );
  }
}

// Función para procesar respuestas cuando solo tenemos acceso directo a las preguntas
async function processWithDirectQuestions(responses: any[], questionsMap: Map<string, any>, evaluationsMap: Map<string, any>) {
  try {
    // Combinar información para generar recomendaciones
    const formattedRecommendations = responses
      .map(response => {
        // Obtener la información de la pregunta directamente
        const question = questionsMap.get(response.question_id);
        if (!question) {
          console.log(`No se encontró la pregunta ${response.question_id}`);
          return null;
        }

        // Obtener información de la evaluación
        const evaluation = evaluationsMap.get(response.evaluation_id);
        if (!evaluation) {
          console.log(`No se encontró la evaluación para la respuesta ${response.id}`);
          return null;
        }

        // Buscar el texto de recomendación
        let recommendationText = '';

        if (question.recommendation_text && question.recommendation_text.trim() !== '') {
          recommendationText = question.recommendation_text;
        } else if (question.options && typeof question.options === 'object') {
          if (!Array.isArray(question.options)) {
            const optionsRecText = question.options.recommendation_text;
            if (optionsRecText && typeof optionsRecText === 'string' && optionsRecText.trim() !== '') {
              recommendationText = optionsRecText;
            }
          }
        }

        if (!recommendationText || recommendationText.trim() === '') {
          console.log(`No se encontró recommendation_text para la pregunta ${question.id}`);
          return null;
        }

        const answer = response.answer || response.response_value;
        const responseValueLower = answer ? String(answer).toLowerCase() : '';

        return {
          id: response.id,
          recommendation_text: recommendationText,
          question_text: question.question_text || 'Pregunta sin texto',
          evaluation_id: response.evaluation_id,
          evaluation_title: evaluation.title || 'Evaluación sin título',
          answer: answer || '',
          response_value: response.response_value,
          evaluation_question_id: response.evaluation_question_id || null,
          evaluation_vendor_id: response.evaluation_vendor_id || null,
          priority: (response.answer === 'No' || responseValueLower === 'no') ? 1 : 2,
          status: 'pending',
          due_date: null,
          created_at: new Date().toISOString(),
        } as Recommendation;
      })
      .filter((item): item is Recommendation => item !== null);

    console.log(`Recomendaciones formateadas (método directo): ${formattedRecommendations.length}`);

    // Agrupar por evaluación
    const recommendationsByEvaluation = formattedRecommendations.reduce<Record<string, RecommendationGroup>>((acc, rec) => {
      const evalId = rec.evaluation_id;
      if (!acc[evalId]) {
        acc[evalId] = {
          evaluation_id: evalId,
          evaluation_title: rec.evaluation_title,
          recommendations: []
        };
      }
      acc[evalId].recommendations.push(rec);
      return acc;
    }, {});

    const result = Object.values(recommendationsByEvaluation);
    console.log(`Grupos de recomendaciones (método directo): ${result.length}`);

    return NextResponse.json({ data: result });
  } catch (error) {
    console.error('Error al procesar con preguntas directas:', error);
    return NextResponse.json(
      { error: 'Error al procesar con preguntas directas' },
      { status: 500 }
    );
  }
}