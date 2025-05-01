import { SupabaseClient, createClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';
import { Database } from '../database.types';

type Tables = Database['public']['Tables'];
type EvaluationStatus = Database['public']['Enums']['evaluation_status'];

export interface Question {
  id: string;
  category: string;
  subcategory?: string | null;
  question_text: string;
  description?: string | null;
  options: any;
  weight: number;
  is_required: boolean;
  order_index?: number | null;
}

export interface Response {
  id: string;
  question_id: string;
  response_value: string;
  score: number | null;
  notes?: string | null;
  evidence_urls?: string[] | null;
  reviewed_by?: string | null;
  review_date?: string | null;
}

export interface Evaluation {
  id: string;
  title: string;
  description: string;
  vendor_id: string | null;
  vendor_name?: string;
  vendors?: Array<{
    id: string;
    name: string;
    status?: string;
  }>;
  evaluator_id: string;
  status: EvaluationStatus;
  progress: number;
  total_score: number | null;
  start_date: string;
  end_date: string;
  created_at: string;
  updated_at: string;
  questions?: Question[];
  responses?: Response[];
  metadata?: any;
}

export interface DBQuestion extends Omit<Question, 'weight' | 'is_required'> {
  weight: number | null;
  is_required: boolean | null;
}

export async function getEvaluations(
  client: SupabaseClient<Database>,
  userId?: string
): Promise<{ data: Evaluation[] | null; error: Error | null }> {
  try {
    console.log("[DEBUG getEvaluations] Iniciando getEvaluations");

    let currentUserId: string | undefined = userId;

    if (!currentUserId) {
      try {
        const { data, error } = await client.auth.getUser();

        if (error) {
          console.error("[DEBUG getEvaluations] Error al obtener usuario:", error);
          throw error;
        }
        if (!data.user) {
          console.error("[DEBUG getEvaluations] No hay sesión de usuario activa");
          throw new Error("No has iniciado sesión");
        }
        currentUserId = data.user.id;
        console.log("[DEBUG getEvaluations] Usuario autenticado ID:", currentUserId);
      } catch (e) {
        console.error("[DEBUG getEvaluations] Error al obtener usuario/sesión:", e);
        throw new Error("Error al autenticar");
      }
    }

    if (!currentUserId) {
      console.error("[DEBUG getEvaluations] No se pudo determinar el ID del usuario");
      throw new Error("No se pudo determinar el ID del usuario");
    }

    const { data: testQuery, error: testError } = await client
      .from('evaluations')
      .select('id, title')
      .limit(5);

    console.log("[DEBUG getEvaluations] Test de datos en tabla:",
      testQuery ? `Encontrados: ${testQuery.length}` : "No hay datos",
      testError ? `Error: ${testError.message}` : "Sin errores");

    const { data: userData, error: userError } = await client
      .from('users')
      .select('role_id, vendor_id')
      .eq('id', currentUserId)
      .single();

    if (userError) {
      console.error("[DEBUG getEvaluations] Error al obtener rol:", userError);
      throw userError;
    }

    if (!userData?.role_id) {
      console.error("[DEBUG getEvaluations] Usuario sin rol asignado");
      throw new Error("Usuario sin rol asignado");
    }

    console.log("[DEBUG getEvaluations] Datos del usuario:",
      JSON.stringify({ role_id: userData.role_id, vendor_id: userData.vendor_id }));

    const { data: roleData, error: roleNameError } = await client
      .from('roles')
      .select('name')
      .eq('id', userData.role_id)
      .single();

    if (roleNameError) {
      console.error("[DEBUG getEvaluations] Error al obtener nombre del rol:", roleNameError);
      throw roleNameError;
    }

    if (!roleData) {
      console.error("[DEBUG getEvaluations] No se encontró el rol con ID:", userData.role_id);
      throw new Error("Rol no encontrado");
    }

    console.log("[DEBUG getEvaluations] Rol del usuario:", roleData.name);

    const query = client
      .from('evaluations')
      .select(`
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

    let filteredQuery = query;
    if (roleData.name.toLowerCase() !== 'admin') {
      console.log("[DEBUG getEvaluations] Usuario no es admin, obteniendo evaluaciones asignadas para vendor_id:", userData.vendor_id);

      if (!userData.vendor_id) {
        console.log("[DEBUG getEvaluations] Usuario no admin sin vendor_id asignado. Retornando vacío.");
        return { data: [], error: null };
      }

      // 1. Obtener los IDs de las evaluaciones asignadas a este vendor
      const { data: assignedEvals, error: assignedEvalsError } = await client
        .from('evaluation_vendors')
        .select('evaluation_id')
        .eq('vendor_id', userData.vendor_id);

      if (assignedEvalsError) {
        console.error("[DEBUG getEvaluations] Error obteniendo IDs de evaluaciones asignadas:", assignedEvalsError);
        throw assignedEvalsError;
      }

      const evaluationIds = assignedEvals.map(ev => ev.evaluation_id);

      if (!evaluationIds || evaluationIds.length === 0) {
        console.log("[DEBUG getEvaluations] Vendor ID", userData.vendor_id, "no tiene evaluaciones asignadas. Retornando vacío.");
        return { data: [], error: null };
      }

      console.log("[DEBUG getEvaluations] IDs de evaluaciones encontradas para el vendor:", evaluationIds);

      // 2. Filtrar la consulta principal por esos IDs
      filteredQuery = query.in('id', evaluationIds);

    } else {
      console.log("[DEBUG getEvaluations] Usuario es admin, mostrando todas las evaluaciones");
      // Para admin, no se aplica filtro adicional aquí, la query base ya está seleccionada
      // filteredQuery = query; // Esta línea es redundante ya que filteredQuery se inicializa con query
    }

    // Ejecutar la consulta (filtrada o no)
    const { data, error } = await filteredQuery;

    if (error) {
      console.error("[DEBUG getEvaluations] Error en la consulta:", error);
      throw error;
    }

    console.log("[DEBUG getEvaluations] Evaluaciones obtenidas:", data?.length || 0);
    if (data && data.length > 0) {
      console.log("[DEBUG getEvaluations] Primera evaluación:", JSON.stringify(data[0]));
    } else {
      console.log("[DEBUG getEvaluations] No se encontraron evaluaciones. Query ejecutado:",
        roleData.name.toLowerCase() === 'admin'
          ? "Todas las evaluaciones (sin filtro)"
          : `Filtrado por vendor_id: ${userData.vendor_id}`
      );

      const { data: allData, error: allError } = await client
        .from('evaluations')
        .select('id, title')
        .limit(5);

      console.log("[DEBUG getEvaluations] Prueba sin filtros:",
        allData ? `Encontradas: ${allData.length}` : "No hay datos",
        allError ? `Error: ${allError.message}` : "Sin errores");

      if (allData && allData.length > 0) {
        console.log("[DEBUG getEvaluations] Muestra de datos disponibles:", JSON.stringify(allData));
      }
    }

    const processedData = data?.map((evaluation: any) => {
      let vendorName = 'Proveedor no asignado';
      if (evaluation.vendors) {
        if (Array.isArray(evaluation.vendors)) {
          vendorName = evaluation.vendors.length > 0 ? evaluation.vendors[0].name : 'Proveedor no asignado';
        } else {
          vendorName = evaluation.vendors?.name || 'Proveedor no asignado';
        }
      }

      return {
        id: evaluation.id,
        title: evaluation.title || 'Evaluación sin título',
        description: evaluation.description || 'Sin descripción',
        vendor_id: evaluation.vendor_id,
        vendor_name: vendorName,
        evaluator_id: evaluation.evaluator_id,
        status: evaluation.status || 'draft',
        progress: evaluation.progress || 0,
        total_score: evaluation.total_score,
        start_date: evaluation.start_date || new Date().toISOString(),
        end_date: evaluation.end_date || new Date().toISOString(),
        created_at: evaluation.created_at || new Date().toISOString(),
        updated_at: evaluation.updated_at || new Date().toISOString(),
        questions: [],
        responses: [],
        metadata: evaluation.metadata || {}
      };
    }) || [];

    // For each evaluation, get the assigned vendors
    for (const evaluation of processedData) {
      const { data: assignedVendors, error: vendorsError } = await client
        .from('evaluation_vendors')
        .select(`
          vendor_id,
          status,
          vendors:vendor_id (id, name)
        `)
        .eq('evaluation_id', evaluation.id);

      if (vendorsError) {
        console.error(`Error obteniendo proveedores asignados para evaluación ${evaluation.id}:`, vendorsError);
        continue;
      }

      evaluation.vendors = (assignedVendors || []).map(av => ({
        id: av.vendors.id,
        name: av.vendors.name,
        status: av.status
      }));
    }

    console.log("[DEBUG getEvaluations] Datos procesados:", processedData.length);
    return { data: processedData, error: null };

  } catch (error) {
    console.error('[DEBUG getEvaluations] Error completo:', error);
    return { data: null, error: error as Error };
  }
}

export async function getEvaluationDetails(
  client: SupabaseClient<Database>,
  evaluationId: string
): Promise<{ data: Evaluation | null; error: Error | null }> {
  try {
    const { data: evaluation, error: evaluationError } = await client
      .from('evaluations')
      .select(`
        *,
        vendors:vendor_id (name)
      `)
      .eq('id', evaluationId)
      .single();

    if (evaluationError) throw evaluationError;
    if (!evaluation) throw new Error("Evaluación no encontrada");

    // Get assigned vendors
    const { data: assignedVendors, error: vendorsError } = await client
      .from('evaluation_vendors')
      .select(`
        vendor_id,
        status,
        vendors:vendor_id (id, name)
      `)
      .eq('evaluation_id', evaluationId);

    if (vendorsError) {
      console.error("Error obteniendo proveedores asignados:", vendorsError);
    }

    const { data: dbQuestions, error: questionsError } = await client
      .from('questions')
      .select('*')
      .eq('metadata->>evaluation_id', evaluationId)
      .order('order_index', { ascending: true });

    if (questionsError) throw questionsError;

    const questions: Question[] = (dbQuestions || []).map((q: Tables['questions']['Row']) => ({
      id: q.id,
      category: q.category,
      subcategory: q.subcategory,
      question_text: q.question_text,
      description: q.description,
      options: q.options,
      weight: q.weight || 0,
      is_required: q.is_required || false,
      order_index: q.order_index
    }));

    const { data: responses, error: responsesError } = await client
      .from('responses')
      .select('*')
      .eq('evaluation_id', evaluationId);

    if (responsesError) throw responsesError;

    let vendorName = 'Proveedor no asignado';
    if (evaluation.vendors) {
      vendorName = (evaluation.vendors as any)?.name || 'Proveedor no asignado';
    }

    // Format assigned vendors
    const vendors = (assignedVendors || []).map(av => ({
      id: av.vendors.id,
      name: av.vendors.name,
      status: av.status
    }));

    const evaluationWithDetails: Evaluation = {
      id: evaluation.id,
      title: evaluation.title || 'Evaluación sin título',
      description: evaluation.description || 'Sin descripción',
      vendor_id: evaluation.vendor_id,
      vendor_name: vendorName,
      vendors: vendors,
      evaluator_id: evaluation.evaluator_id,
      status: evaluation.status || 'draft',
      progress: evaluation.progress || 0,
      total_score: evaluation.total_score,
      start_date: evaluation.start_date || new Date().toISOString(),
      end_date: evaluation.end_date || new Date().toISOString(),
      created_at: evaluation.created_at || new Date().toISOString(),
      updated_at: evaluation.updated_at || new Date().toISOString(),
      questions: questions,
      responses: responses || [],
      metadata: evaluation.metadata || {}
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
  vendor_ids?: string[]; // Array of vendor IDs to assign
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

export async function createEvaluation(
  client: SupabaseClient<Database>,
  evaluationData: CreateEvaluationData,
  userId?: string
): Promise<{ data: { id: string } | null; error: Error | null }> {
  try {
    let currentUserId = userId;

    if (!currentUserId) {
      const { data: { user }, error: authError } = await client.auth.getUser();
      if (authError) throw authError;
      if (!user) throw new Error("No has iniciado sesión");
      currentUserId = user.id;
    }

    if (!currentUserId) {
      throw new Error("No se pudo determinar el ID del usuario");
    }

    const evaluationId = uuidv4();

    const { error: evaluationError } = await client
      .from('evaluations')
      .insert({
        id: evaluationId,
        title: evaluationData.title,
        description: evaluationData.description,
        evaluator_id: currentUserId,
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

    if (evaluationError) throw evaluationError;

    if (evaluationData.questions.length > 0) {
      const questionsToInsert = evaluationData.questions.map(question => ({
        id: question.id || uuidv4(),
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

      const { error: questionsError } = await client
        .from('questions')
        .insert(questionsToInsert);

      if (questionsError) {
        console.error("Error insertando preguntas, evaluación creada:", evaluationId);
        throw questionsError;
      }
    }

    // If vendors are specified, assign them to the evaluation
    if (evaluationData.vendor_ids && evaluationData.vendor_ids.length > 0) {
      const vendorAssignments = evaluationData.vendor_ids.map(vendorId => ({
        evaluation_id: evaluationId,
        vendor_id: vendorId,
        assigned_by: currentUserId,
        assigned_at: new Date().toISOString()
      }));

      const { error: assignmentError } = await client
        .from('evaluation_vendors')
        .insert(vendorAssignments);

      if (assignmentError) {
        console.error("Error asignando proveedores a la evaluación:", assignmentError);
        throw assignmentError;
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
  start_date: string;
  end_date: string;
  metadata: {
    type: string;
    is_anonymous: boolean;
    settings: {
      allow_partial_save: boolean;
      require_comments: boolean;
      show_progress: boolean;
      notify_on_submit: boolean;
    };
  };
  vendor_ids?: string[]; // Array of vendor IDs to assign
  questions: {
    id: string;
    type: string;
    text: string;
    required: boolean;
    weight: number;
    order: number;
    category?: string;
    options?: any;
    answerOptions?: { id: string; text: string }[];
    isNew?: boolean;
    isDeleted?: boolean;
  }[];
}

export async function updateEvaluation(
  client: SupabaseClient<Database>,
  evaluationData: UpdateEvaluationData
): Promise<{ data: { id: string } | null; error: Error | null }> {
  try {
    let userId: string;
    try {
      const { data: { user }, error: authError } = await client.auth.getUser();
      if (authError) throw authError;
      if (!user) throw new Error("No has iniciado sesión");
      userId = user.id;
      console.log("[DEBUG updateEvaluation] Usuario autenticado ID:", userId);
    } catch (error) {
      console.error('[DEBUG updateEvaluation] Error de autenticación:', error);
      throw new Error("No has iniciado sesión. Por favor, inicia sesión nuevamente.");
    }

    const { data: userData, error: userError } = await client
      .from('users')
      .select('role_id')
      .eq('id', userId)
      .single();

    if (userError) throw userError;
    if (!userData?.role_id) throw new Error('Usuario sin rol asignado');

    const { data: roleData, error: roleError } = await client
      .from('roles')
      .select('name')
      .eq('id', userData.role_id)
      .single();

    if (roleError) throw roleError;
    if (!roleData || roleData.name !== 'admin') {
      console.error("[DEBUG updateEvaluation] Permiso denegado. Rol:", roleData?.name);
      throw new Error('No tienes permisos para editar evaluaciones');
    }
    console.log("[DEBUG updateEvaluation] Permiso concedido. Rol:", roleData.name);
    console.log("[DEBUG updateEvaluation] Payload recibido completo:", JSON.stringify(evaluationData, null, 2));

    console.log("[DEBUG updateEvaluation] Metadata a actualizar en evaluations:", JSON.stringify(evaluationData.metadata, null, 2));

    const { error: evaluationError } = await client
      .from('evaluations')
      .update({
        title: evaluationData.title,
        description: evaluationData.description,
        start_date: new Date(evaluationData.start_date).toISOString(),
        end_date: new Date(evaluationData.end_date).toISOString(),
        metadata: evaluationData.metadata
      })
      .eq('id', evaluationData.id);

    if (evaluationError) {
      console.error("[DEBUG updateEvaluation] Error actualizando tabla evaluations:", JSON.stringify(evaluationError, null, 2));
    } else {
      console.log("[DEBUG updateEvaluation] Update en tabla evaluations ejecutado (puede que sin cambios si los datos eran iguales).");
    }

    // Update vendor assignments if specified
    if (evaluationData.vendor_ids) {
      // First, get current assignments
      const { data: currentAssignments, error: getAssignmentsError } = await client
        .from('evaluation_vendors')
        .select('vendor_id')
        .eq('evaluation_id', evaluationData.id);

      if (getAssignmentsError) {
        console.error("[DEBUG updateEvaluation] Error obteniendo asignaciones actuales:", getAssignmentsError);
        throw getAssignmentsError;
      }

      // Identify vendors to add and remove
      const currentVendorIds = (currentAssignments || []).map(a => a.vendor_id);
      const vendorsToAdd = evaluationData.vendor_ids.filter(id => !currentVendorIds.includes(id));
      const vendorsToRemove = currentVendorIds.filter(id => !evaluationData.vendor_ids.includes(id));

      // Remove unselected vendors
      if (vendorsToRemove.length > 0) {
        const { error: removeError } = await client
          .from('evaluation_vendors')
          .delete()
          .eq('evaluation_id', evaluationData.id)
          .in('vendor_id', vendorsToRemove);

        if (removeError) {
          console.error("[DEBUG updateEvaluation] Error eliminando asignaciones:", removeError);
          throw removeError;
        }
      }

      // Add new vendors
      if (vendorsToAdd.length > 0) {
        const vendorAssignments = vendorsToAdd.map(vendorId => ({
          evaluation_id: evaluationData.id,
          vendor_id: vendorId,
          assigned_by: userId,
          assigned_at: new Date().toISOString()
        }));

        const { error: addError } = await client
          .from('evaluation_vendors')
          .insert(vendorAssignments);

        if (addError) {
          console.error("[DEBUG updateEvaluation] Error añadiendo asignaciones:", addError);
          throw addError;
        }
      }
    }

    const questionsToCreate = evaluationData.questions.filter(q => q.isNew && !q.isDeleted);
    const questionsToUpdate = evaluationData.questions.filter(q => !q.isNew && !q.isDeleted);
    const questionsToDelete = evaluationData.questions.filter(q => q.isDeleted && !q.isNew);

    console.log(`[DEBUG updateEvaluation] Preguntas a crear: ${questionsToCreate.length}`);
    console.log(`[DEBUG updateEvaluation] Preguntas a actualizar: ${questionsToUpdate.length}`);
    console.log(`[DEBUG updateEvaluation] Preguntas a eliminar: ${questionsToDelete.length}`);

    let questionErrors: any[] = [];

    if (questionsToCreate.length > 0) {
      const newQuestions = questionsToCreate.map(question => ({
        id: question.id || uuidv4(),
        question_text: question.text,
        category: question.category || 'general',
        options: formatQuestionOptions(question),
        weight: question.weight,
        is_required: question.required,
        order_index: question.order,
        metadata: { evaluation_id: evaluationData.id }
      }));
      console.log("[DEBUG updateEvaluation] Intentando crear preguntas:", JSON.stringify(newQuestions.map(q => ({ id: q.id, text: q.question_text })), null, 2));
      const { error: createError } = await client.from('questions').insert(newQuestions);
      if (createError) {
        console.error("[DEBUG updateEvaluation] Error creando preguntas:", JSON.stringify(createError, null, 2));
        questionErrors.push({ operation: 'create', error: createError });
      } else {
        console.log("[DEBUG updateEvaluation] Creación de preguntas ejecutada.");
      }
    }

    if (questionsToUpdate.length > 0) {
      console.log("[DEBUG updateEvaluation] Intentando actualizar preguntas...");
      for (const question of questionsToUpdate) {
        const updatePayload = {
          question_text: question.text,
          category: question.category || 'general',
          options: formatQuestionOptions(question),
          weight: question.weight,
          is_required: question.required,
          order_index: question.order
        };
        console.log(`[DEBUG updateEvaluation] Actualizando pregunta ID ${question.id}...`);
        const { error: updateError } = await client
          .from('questions')
          .update(updatePayload)
          .eq('id', question.id);

        if (updateError) {
          console.error(`[DEBUG updateEvaluation] Error actualizando pregunta ${question.id}:`, JSON.stringify(updateError, null, 2));
          questionErrors.push({ operation: 'update', questionId: question.id, error: updateError });
        } else {
          console.log(`[DEBUG updateEvaluation] Actualización pregunta ${question.id} ejecutada.`);
        }
      }
    }

    if (questionsToDelete.length > 0) {
      const questionIds = questionsToDelete.map(q => q.id);
      console.log("[DEBUG updateEvaluation] Intentando eliminar preguntas IDs:", questionIds);
      const { error: deleteError } = await client
        .from('questions')
        .delete()
        .in('id', questionIds);

      if (deleteError) {
        console.error("[DEBUG updateEvaluation] Error eliminando preguntas:", JSON.stringify(deleteError, null, 2));
        questionErrors.push({ operation: 'delete', ids: questionIds, error: deleteError });
      } else {
        console.log("[DEBUG updateEvaluation] Eliminación de preguntas ejecutada.");
      }
    }

    if (evaluationError) {
      throw evaluationError;
    }
    if (questionErrors.length > 0) {
      console.error("[DEBUG updateEvaluation] Errores durante operaciones de preguntas:", questionErrors);
      const errorMessages = questionErrors.map(e =>
        `Operación ${e.operation}${e.questionId ? ' en pregunta ' + e.questionId : ''}: ${e.error.message}`
      ).join('; \n');
      throw new Error(`Errores al procesar preguntas: ${errorMessages}`);
    }

    console.log("[DEBUG updateEvaluation] Todas las operaciones completadas (aparentemente) sin errores lanzados.");
    return { data: { id: evaluationData.id }, error: null };

  } catch (error) {
    console.error('Error general capturado en updateEvaluation:', error);
    const finalError = error instanceof Error ? error : new Error('Error desconocido al actualizar evaluación');
    return { data: null, error: finalError };
  }
}

interface AnswerOption { id: string; text: string; }

function formatQuestionOptions(question: { type: string, options?: any, answerOptions?: AnswerOption[] }) {
  const needsChoices = ['multiple_choice', 'single_choice', 'checkbox'].includes(question.type);
  if (needsChoices && question.answerOptions && question.answerOptions.length > 0) {
    const validChoices = question.answerOptions
      .filter(opt => opt.text && opt.text.trim() !== '')
      .map(opt => ({ id: opt.id || uuidv4(), text: opt.text.trim() }));

    if (validChoices.length > 0) {
      return { type: question.type, choices: validChoices };
    } else {
      return { type: question.type };
    }
  }

  if (question.options && Array.isArray(question.options.choices)) {
    const validOriginalChoices = question.options.choices
      .map((choice: string | { id?: string; text: string }) =>
        typeof choice === 'string' ? { id: uuidv4(), text: choice } : choice
      )
      .filter((opt: any) => opt && opt.text && opt.text.trim() !== '')
      .map((opt: any) => ({ id: opt.id || uuidv4(), text: opt.text.trim() }));

    if (validOriginalChoices.length > 0) {
      return { type: question.type, choices: validOriginalChoices };
    } else {
      return { type: question.type };
    }
  }

  switch (question.type) {
    case 'rating_5': return { type: 'rating_5', min_label: "Muy malo", max_label: "Excelente" };
    case 'rating_10': return { type: 'rating_10', min_label: "Muy malo", max_label: "Excelente" };
    case 'yes_no': return { type: 'yes_no' };
    case 'multiple_choice':
    case 'single_choice':
    case 'checkbox':
      return { type: question.type };
    case 'text_short': return { type: 'text_short' };
    case 'text_long': return { type: 'text_long' };
    default:
      const originalOptions = { ...(question.options || {}) };
      delete originalOptions.choices;
      return { type: question.type, ...originalOptions };
  }
}

export function calculateEvaluationScore(evaluation: Evaluation): number | null {
  if (!evaluation.responses || evaluation.responses.length === 0) return null;

  const responses = evaluation.responses.filter(r => r.score !== null);

  if (responses.length === 0) return null;

  if (evaluation.questions && evaluation.questions.length > 0) {
    let totalWeightedScore = 0;
    let totalWeight = 0;

    responses.forEach(response => {
      const question = evaluation.questions?.find(q => q.id === response.question_id);
      if (question && response.score !== null && question.weight > 0) {
        totalWeightedScore += response.score * question.weight;
        totalWeight += question.weight;
      }
    });

    return totalWeight > 0 ? Math.round((totalWeightedScore / totalWeight) * 100) / 100 : 0;
  } else {
    const sum = responses.reduce((acc, r) => acc + (r.score || 0), 0);
    return Math.round((sum / responses.length) * 100) / 100;
  }
}

// Function to assign vendors to an evaluation
export async function assignVendorsToEvaluation(
  client: SupabaseClient<Database>,
  evaluationId: string,
  vendorIds: string[]
): Promise<{ success: boolean; error: Error | null }> {
  try {
    // Get the authenticated user
    const { data: { user }, error: authError } = await client.auth.getUser();
    if (authError) throw authError;
    if (!user) throw new Error("No has iniciado sesión");

    // Get current assignments
    const { data: currentAssignments, error: getAssignmentsError } = await client
      .from('evaluation_vendors')
      .select('vendor_id')
      .eq('evaluation_id', evaluationId);

    if (getAssignmentsError) {
      console.error("Error obteniendo asignaciones actuales:", getAssignmentsError);
      throw getAssignmentsError;
    }

    // Identify vendors to add and remove
    const currentVendorIds = (currentAssignments || []).map(a => a.vendor_id);
    const vendorsToAdd = vendorIds.filter(id => !currentVendorIds.includes(id));
    const vendorsToRemove = currentVendorIds.filter(id => !vendorIds.includes(id));

    // Remove unselected vendors
    if (vendorsToRemove.length > 0) {
      const { error: removeError } = await client
        .from('evaluation_vendors')
        .delete()
        .eq('evaluation_id', evaluationId)
        .in('vendor_id', vendorsToRemove);

      if (removeError) {
        console.error("Error eliminando asignaciones:", removeError);
        throw removeError;
      }
    }

    // Add new vendors
    if (vendorsToAdd.length > 0) {
      const vendorAssignments = vendorsToAdd.map(vendorId => ({
        evaluation_id: evaluationId,
        vendor_id: vendorId,
        assigned_by: user.id,
        assigned_at: new Date().toISOString()
      }));

      const { error: addError } = await client
        .from('evaluation_vendors')
        .insert(vendorAssignments);

      if (addError) {
        console.error("Error añadiendo asignaciones:", addError);
        throw addError;
      }
    }

    return { success: true, error: null };
  } catch (error) {
    console.error("Error asignando proveedores a evaluación:", error);
    return {
      success: false,
      error: error instanceof Error ? error : new Error('Error desconocido al asignar proveedores')
    };
  }
}