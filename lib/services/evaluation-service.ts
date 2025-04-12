import { supabase } from '../supabase/client';
import { v4 as uuidv4 } from 'uuid';

export interface Question {
  id: string;
  category: string;
  subcategory?: string;
  question_text: string;
  description?: string;
  options: any;
  weight: number;
  is_required: boolean;
  order_index?: number;
}

export interface Response {
  id: string;
  question_id: string;
  response_value: string;
  score: number | null;
  notes?: string;
  evidence_urls?: string[];
  reviewed_by?: string;
  review_date?: string;
}

export interface Evaluation {
  id: string;
  title: string;
  description: string;
  vendor_id: string;
  vendor_name?: string;
  evaluator_id: string;
  status: string;
  progress: number;
  total_score: number | null;
  start_date: string;
  end_date: string;
  created_at: string;
  updated_at: string;
  questions?: Question[];
  responses?: Response[];
}

export async function getEvaluations(): Promise<{ data: Evaluation[] | null; error: Error | null }> {
  try {
    console.log("Iniciando getEvaluations");

    // Obtener el usuario actual desde la sesión
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      console.error("No hay sesión de usuario activa");
      throw new Error("No has iniciado sesión");
    }

    console.log("Usuario autenticado:", user.id);

    // Obtener el perfil del usuario para verificar su rol
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (profileError) {
      console.error("Error al obtener perfil:", profileError);
      throw profileError;
    }

    console.log("Perfil de usuario:", profile);

    // Construir la consulta para obtener las evaluaciones
    let query = supabase.from('evaluations').select(`
      id,
      created_at,
      updated_at,
      evaluator_id,
      status,
      progress,
      total_score,
      start_date,
      end_date,
      metadata,
      vendor_id,
      title,
      description,
      vendors:vendor_id (id, name)
    `);

    // Filtrar evaluaciones según el rol del usuario
    if (profile.role === 'supplier') {
      console.log("Usuario es proveedor, filtrando evaluaciones");
      // Verificar si el usuario está asociado a algún proveedor a través de vendor_users
      const { data: vendorUsers, error: vendorError } = await supabase
        .from('vendor_users')
        .select('vendor_id')
        .eq('user_id', user.id);

      if (vendorError) {
        console.error("Error al obtener vendor_users:", vendorError);
        throw vendorError;
      }

      if (vendorUsers && vendorUsers.length > 0) {
        // Si el usuario está asociado a uno o más proveedores, mostrar sus evaluaciones
        const vendorIds = vendorUsers.map(vu => vu.vendor_id);
        console.log("Filtrando por proveedores:", vendorIds);
        query = query.in('vendor_id', vendorIds);
      } else {
        // Si no está asociado a ningún proveedor, no mostrar evaluaciones
        console.log("Usuario no está asociado a ningún proveedor");
        return { data: [], error: null };
      }
    } else {
      console.log("Usuario es admin o evaluador, mostrando todas las evaluaciones");
    }

    // Ejecutar la consulta
    const { data, error } = await query;

    if (error) {
      console.error("Error en la consulta de evaluaciones:", error);
      throw error;
    }

    console.log("Evaluaciones obtenidas de la BD:", data);

    // Procesar los datos para el formato esperado
    const processedData = data.map(evaluation => {
      // Verificar si vendors es un arreglo o un objeto y extraer el nombre adecuadamente
      let vendorName = 'Proveedor no asignado';
      if (evaluation.vendors) {
        if (Array.isArray(evaluation.vendors)) {
          vendorName = evaluation.vendors.length > 0 ? evaluation.vendors[0].name : 'Proveedor no asignado';
        } else {
          // Usar una aserción de tipo para evitar el error de TypeScript
          const vendor = evaluation.vendors as any;
          vendorName = vendor?.name || 'Proveedor no asignado';
        }
      }

      return {
        ...evaluation,
        vendor_name: vendorName,
        // Asegurarse de que estos campos existan aunque estén vacíos
        questions: [],
        responses: [],
        // Si falta algún campo obligatorio en la interfaz, añadirlo con valor por defecto
        title: evaluation.title || 'Evaluación sin título',
        description: evaluation.description || 'Sin descripción',
      };
    });

    console.log("Datos procesados:", processedData);
    return { data: processedData, error: null };
  } catch (error) {
    console.error('Error completo en getEvaluations:', error);
    return { data: null, error: error as Error };
  }
}

export async function getEvaluationDetails(evaluationId: string): Promise<{ data: Evaluation | null; error: Error | null }> {
  try {
    // Obtener la evaluación
    const { data: evaluation, error: evaluationError } = await supabase
      .from('evaluations')
      .select(`
        *,\n        vendors:vendor_id (name)
      `)
      .eq('id', evaluationId)
      .single();

    if (evaluationError) throw evaluationError;
    if (!evaluation) throw new Error("Evaluación no encontrada");

    // Obtener las preguntas filtrando por el campo 'evaluation_id' dentro del JSONB 'metadata'
    const { data: questions, error: questionsError } = await supabase
      .from('questions')
      .select('*')
      // Usar el operador '->>' para filtrar por el valor de 'evaluation_id' como texto
      .eq('metadata->>evaluation_id', evaluationId)
      .order('order_index', { ascending: true });

    if (questionsError) {
      console.error("Error al filtrar preguntas por metadata:", questionsError);
      throw questionsError;
    }

    // Obtener las respuestas para esta evaluación
    const { data: responses, error: responsesError } = await supabase
      .from('responses')
      .select('*')
      .eq('evaluation_id', evaluationId);

    if (responsesError) throw responsesError;

    // Combinar datos
    const evaluationWithDetails: Evaluation = {
      ...evaluation,
      vendor_name: (evaluation.vendors as any)?.name || 'Proveedor no asignado',
      questions: questions || [], // Usar las preguntas filtradas
      responses: responses || []
    };

    return { data: evaluationWithDetails, error: null };
  } catch (error) {
    console.error('Error completo en getEvaluationDetails:', error);
    return { data: null, error: error as Error };
  }
}

interface CreateEvaluationData {
  title: string;
  description: string;
  type: string;
  start_date: string;
  end_date: string;
  is_anonymous: boolean;
  settings: {
    allow_partial_save: boolean;
    require_comments: boolean;
    show_progress: boolean;
    notify_on_submit: boolean;
  };
  questions: {
    id: string;
    type: string;
    text: string;
    required: boolean;
    weight: number;
    order: number;
    category?: string;
    options?: any;
  }[];
}

export async function createEvaluation(evaluationData: CreateEvaluationData): Promise<{ data: { id: string } | null; error: Error | null }> {
  try {
    // Obtener el usuario actual
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      throw new Error("No has iniciado sesión");
    }

    const evaluationId = uuidv4();

    // Crear la evaluación en la base de datos
    const { error: evaluationError } = await supabase
      .from('evaluations')
      .insert({
        id: evaluationId,
        title: evaluationData.title,
        description: evaluationData.description,
        evaluator_id: user.id,
        status: 'draft',
        progress: 0,
        start_date: new Date(evaluationData.start_date).toISOString(),
        end_date: new Date(evaluationData.end_date).toISOString(),
        total_score: null,
        metadata: {
          type: evaluationData.type,
          is_anonymous: evaluationData.is_anonymous,
          settings: evaluationData.settings
        }
      });

    if (evaluationError) {
      throw evaluationError;
    }

    // Crear las preguntas asociadas a la evaluación
    if (evaluationData.questions.length > 0) {
      const questionsToInsert = evaluationData.questions.map(question => ({
        id: question.id,
        question_text: question.text,
        category: question.category || 'general',
        subcategory: null,
        description: null,
        options: formatQuestionOptions(question),
        weight: question.weight,
        is_required: question.required,
        order_index: question.order,
        validation_rules: null,
        metadata: { evaluation_id: evaluationId }
      }));

      const { error: questionsError } = await supabase
        .from('questions')
        .insert(questionsToInsert);

      if (questionsError) {
        throw questionsError;
      }
    }

    return { data: { id: evaluationId }, error: null };
  } catch (error) {
    console.error('Error creating evaluation:', error);
    return { data: null, error: error as Error };
  }
}

interface UpdateEvaluationData {
  id: string;
  title: string;
  description: string;
  type: string;
  start_date: string;
  end_date: string;
  is_anonymous: boolean;
  settings: {
    allow_partial_save: boolean;
    require_comments: boolean;
    show_progress: boolean;
    notify_on_submit: boolean;
  };
  questions: {
    id: string;
    type: string;
    text: string;
    required: boolean;
    weight: number;
    order: number;
    category?: string;
    options?: any;
    isNew?: boolean; // Para identificar preguntas nuevas
    isDeleted?: boolean; // Para identificar preguntas a eliminar
  }[];
}

export async function updateEvaluation(evaluationData: UpdateEvaluationData): Promise<{ data: { id: string } | null; error: Error | null }> {
  try {
    // Obtener el usuario actual
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      throw new Error("No has iniciado sesión");
    }

    // Verificar que el usuario sea admin
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileError) throw profileError;

    if (profile.role !== 'admin') {
      throw new Error('No tienes permisos para editar evaluaciones');
    }

    // Actualizar la evaluación
    const { error: evaluationError } = await supabase
      .from('evaluations')
      .update({
        title: evaluationData.title,
        description: evaluationData.description,
        start_date: new Date(evaluationData.start_date).toISOString(),
        end_date: new Date(evaluationData.end_date).toISOString(),
        metadata: {
          type: evaluationData.type,
          is_anonymous: evaluationData.is_anonymous,
          settings: evaluationData.settings
        }
      })
      .eq('id', evaluationData.id);

    if (evaluationError) {
      throw evaluationError;
    }

    // Manejar las preguntas
    // 1. Filtrar preguntas a crear, actualizar y eliminar
    const questionsToCreate = evaluationData.questions.filter(q => q.isNew && !q.isDeleted);
    const questionsToUpdate = evaluationData.questions.filter(q => !q.isNew && !q.isDeleted);
    const questionsToDelete = evaluationData.questions.filter(q => q.isDeleted);

    // 2. Crear nuevas preguntas
    if (questionsToCreate.length > 0) {
      const newQuestions = questionsToCreate.map(question => ({
        id: question.id,
        question_text: question.text,
        category: question.category || 'general',
        subcategory: null,
        description: null,
        options: formatQuestionOptions(question),
        weight: question.weight,
        is_required: question.required,
        order_index: question.order,
        validation_rules: null,
        metadata: { evaluation_id: evaluationData.id }
      }));

      const { error: createError } = await supabase
        .from('questions')
        .insert(newQuestions);

      if (createError) throw createError;
    }

    // 3. Actualizar preguntas existentes
    for (const question of questionsToUpdate) {
      const { error: updateError } = await supabase
        .from('questions')
        .update({
          question_text: question.text,
          category: question.category || 'general',
          options: formatQuestionOptions(question),
          weight: question.weight,
          is_required: question.required,
          order_index: question.order
        })
        .eq('id', question.id);

      if (updateError) throw updateError;
    }

    // 4. Eliminar preguntas seleccionadas
    if (questionsToDelete.length > 0) {
      const questionIds = questionsToDelete.map(q => q.id);

      const { error: deleteError } = await supabase
        .from('questions')
        .delete()
        .in('id', questionIds);

      if (deleteError) throw deleteError;
    }

    return { data: { id: evaluationData.id }, error: null };
  } catch (error) {
    console.error('Error updating evaluation:', error);
    return { data: null, error: error as Error };
  }
}

// Función auxiliar para formatear las opciones de la pregunta según su tipo
function formatQuestionOptions(question: { type: string, options?: any }) {
  // Si ya vienen opciones específicas y tiene un campo choices, respetamos esas opciones
  if (question.options && question.options.choices) {
    return {
      type: question.type,
      ...question.options
    };
  }

  switch (question.type) {
    case 'rating_5':
      return {
        type: 'rating_5',
        min_label: "Muy malo",
        max_label: "Excelente"
      };
    case 'rating_10':
      return {
        type: 'rating_10',
        min_label: "Muy malo",
        max_label: "Excelente"
      };
    case 'yes_no':
      return {
        type: 'yes_no'
      };
    case 'multiple_choice':
      // Solo usar opciones por defecto si no hay opciones personalizadas
      return {
        type: 'multiple_choice',
        choices: question.options?.choices || ["Opción 1", "Opción 2", "Opción 3"]
      };
    case 'single_choice':
      return {
        type: 'single_choice',
        choices: question.options?.choices || ["Opción 1", "Opción 2", "Opción 3"]
      };
    case 'checkbox':
      return {
        type: 'checkbox',
        choices: question.options?.choices || ["Opción 1", "Opción 2", "Opción 3"]
      };
    case 'text_short':
      return {
        type: 'text_short'
      };
    case 'text_long':
      return {
        type: 'text_long'
      };
    default:
      return question.options || {};
  }
}

export function calculateEvaluationScore(evaluation: Evaluation): number | null {
  if (!evaluation.responses || evaluation.responses.length === 0) return null;

  const responses = evaluation.responses.filter(r => r.score !== null);

  if (responses.length === 0) return null;

  // Si hay preguntas con sus pesos
  if (evaluation.questions && evaluation.questions.length > 0) {
    let totalWeightedScore = 0;
    let totalWeight = 0;

    responses.forEach(response => {
      const question = evaluation.questions?.find(q => q.id === response.question_id);
      if (question && response.score !== null) {
        totalWeightedScore += response.score * question.weight;
        totalWeight += question.weight;
      }
    });

    return totalWeight > 0 ? Math.round((totalWeightedScore / totalWeight) * 100) / 100 : null;
  } else {
    // Si no hay información de preguntas, simplemente calculamos el promedio
    const sum = responses.reduce((acc, r) => acc + (r.score || 0), 0);
    return Math.round((sum / responses.length) * 100) / 100;
  }
}