import { SupabaseClient, createClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';
import { Database, Json } from '../database.types';

type Tables = Database['public']['Tables'];
type Enums = Database['public']['Enums'];

// Define interfaces for clearer type checking
export interface QuestionOption {
  id: string;
  text: string;
  // Add other option properties if needed
}

export interface Question {
  id: string;
  category: string; // Assuming NOT NULL in DB based on previous errors
  subcategory: string | null;
  question_text: string; // Assuming NOT NULL in DB
  description: string | null;
  options: any; // Consider defining a stricter type based on actual options structure
  weight: number;
  is_required: boolean;
  order_index: number | null;
  type: Enums['question_type']; // Use the enum type
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
  vendor_id?: string | null; // Added vendor_id
}

export interface AssignedVendor {
  id: string;
  name: string;
  status: string | null; // Allow null status
}

export interface Evaluation {
  id: string;
  title: string;
  description: string | null;
  vendor_id?: string | null; // Keep optional if direct link is still used sometimes
  vendor_name?: string;
  vendors?: AssignedVendor[]; // Array of assigned vendors
  evaluator_id: string;
  status: Enums['evaluation_status'] | null;
  progress: number | null;
  total_score: number | null;
  start_date: string | null;
  end_date: string | null;
  created_at: string;
  updated_at: string | null;
  questions: Question[]; // Questions associated via evaluation_questions
  responses: Response[]; // Responses associated with this evaluation
  metadata: any; // Use specific type if metadata structure is known
}

// Interface for the object structure within getEvaluations loop
interface ProcessedEvaluationData {
  id: string;
  title: string;
  description: string | null;
  vendor_id: string | null;
  vendor_name: string;
  evaluator_id: string;
  status: Enums['evaluation_status'] | null;
  progress: number | null;
  total_score: number | null;
  start_date: string | null;
  end_date: string | null;
  created_at: string;
  updated_at: string | null;
  questions: Question[];
  responses: Response[];
  metadata: any;
  vendors?: AssignedVendor[]; // Make vendors optional here initially
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

    const processedData: ProcessedEvaluationData[] = data?.map((evaluation: any) => {
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
        description: evaluation.description || null,
        vendor_id: evaluation.vendor_id || null,
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
        id: (av.vendors as { id: string }).id,
        name: (av.vendors as { name: string }).name,
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

    // Get questions associated with this evaluation via the join table
    const { data: evaluationQuestionsData, error: eqError } = await client
      .from('evaluation_questions')
      .select(`
        order_index,
        question:questions (*)
      `)
      .eq('evaluation_id', evaluationId)
      .order('order_index', { ascending: true });

    if (eqError) throw eqError;

    // Process the fetched questions
    const questions: Question[] = (evaluationQuestionsData || []).map((eq) => {
      if (!eq.question) {
        console.warn("Found evaluation_question link with null question data for evaluation:", evaluationId);
        return null;
      }
      return {
        id: eq.question.id,
        category: eq.question.category,
        subcategory: eq.question.subcategory,
        question_text: eq.question.question_text,
        description: eq.question.description,
        options: eq.question.options,
        weight: eq.question.weight || 0,
        is_required: eq.question.is_required ?? false,
        order_index: eq.order_index,
        type: eq.question.type
      };
    }).filter((q): q is Question => q !== null);

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
    id?: string; // Optional ID if reusing existing?
    type: Enums['question_type'];
    text: string;
    required: boolean;
    weight: number;
    order: number;
    category?: string;
    options?: any; // Consider a stricter type
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

    const newEvaluationId = uuidv4();

    // 1. Insert the main evaluation record
    const { error: evaluationError } = await client
      .from('evaluations')
      .insert({
        id: newEvaluationId, // Use the generated ID
        title: evaluationData.title,
        description: evaluationData.description,
        evaluator_id: currentUserId,
        status: 'draft', // Default status
        progress: 0,
        start_date: new Date(evaluationData.start_date).toISOString(),
        end_date: new Date(evaluationData.end_date).toISOString(),
        total_score: null,
        metadata: { // Keep relevant metadata here
          type: evaluationData.type,
          is_anonymous: evaluationData.is_anonymous,
          settings: evaluationData.settings
        }
      });

    if (evaluationError) throw evaluationError;

    // 2. Handle Questions: Create globally then link
    if (evaluationData.questions && evaluationData.questions.length > 0) {
      const questionsToInsertGlobally: Tables['questions']['Insert'][] = evaluationData.questions.map(question => {
        // Validate type
        const questionType: Enums['question_type'] | undefined =
          question.type === 'escala 1-5' || question.type === 'si/no/no aplica'
            ? question.type
            : undefined;

        if (!questionType) {
          console.error(`Tipo de pregunta inválido o faltante para la pregunta: ${question.text}. Saltando.`);
          return null; // Skip invalid questions
        }

        return {
          id: question.id || uuidv4(), // Allow providing ID or generate new one
          question_text: question.text,
          category: question.category || 'general',
          // Include other necessary fields for 'questions' table
          subcategory: null, // Add default or check input if subcategory is used
          description: null, // Add default or check input
          options: formatQuestionOptions(question), // Ensure this formats correctly
          weight: question.weight,
          is_required: question.required,
          order_index: question.order, // Note: order_index is in evaluation_questions now primarily
          type: questionType
          // Removed metadata: { evaluation_id: newEvaluationId }
        };
      }).filter(q => q !== null) as Tables['questions']['Insert'][]; // Filter out skipped and assert type

      if (questionsToInsertGlobally.length > 0) {
        // 2a. Insert into global 'questions' table
        const { data: insertedQuestions, error: questionsError } = await client
          .from('questions')
          .insert(questionsToInsertGlobally)
          .select('id'); // Select the IDs of the inserted questions

        if (questionsError) {
          console.error("Error insertando preguntas globales, evaluación creada:", newEvaluationId);
          // Consider rolling back evaluation creation or logging inconsistency
          throw questionsError;
        }

        // 2b. Link questions to the evaluation in 'evaluation_questions'
        const questionLinks = (insertedQuestions || []).map((q, index) => ({
          evaluation_id: newEvaluationId,
          question_id: q.id,
          // Use order from original input array if available
          order_index: evaluationData.questions[index]?.order
        }));

        if (questionLinks.length > 0) {
          const { error: linkError } = await client
            .from('evaluation_questions')
            .insert(questionLinks);

          if (linkError) {
            console.error("Error creando enlaces evaluation_questions:", linkError);
            // Consider implications of partial success
            throw linkError;
          }
        }
      }
    }

    // 3. Assign Vendors (existing logic)
    if (evaluationData.vendor_ids && evaluationData.vendor_ids.length > 0) {
      const vendorAssignments = evaluationData.vendor_ids.map(vendorId => ({
        evaluation_id: newEvaluationId,
        vendor_id: vendorId,
        assigned_by: currentUserId,
        assigned_at: new Date().toISOString()
      }));

      const { error: assignmentError } = await client
        .from('evaluation_vendors')
        .insert(vendorAssignments);

      if (assignmentError) {
        console.error("Error asignando proveedores a la evaluación:", assignmentError);
        // Consider implications
        throw assignmentError;
      }
    }

    return { data: { id: newEvaluationId }, error: null };
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
  vendor_ids?: string[] | null; // Allow null for vendor updates
  questions?: {
    id: string;
    type: Enums['question_type'];
    text: string;
    required: boolean;
    weight: number;
    order: number;
    category?: string;
    subcategory?: string | null;
    description?: string | null;
    options?: any;
    answerOptions?: AnswerOption[];
    isNew?: boolean;
    isDeleted?: boolean;
  }[];
  responses?: {
    question_id: string;
    response_value: string;
    answer?: Enums['answer_enum'] | null;
    notes?: string | null;
    evidence_urls?: string[] | null;
  }[];
}

export async function updateEvaluation(
  client: SupabaseClient<Database>,
  evaluationData: UpdateEvaluationData
): Promise<{ data: { id: string } | null; error: Error | null }> {
  try {
    let userId: string;
    let userVendorId: string | null = null; // Variable to store the vendor ID
    let isAdminUser = false; // Flag for admin permission
    try {
      const { data: { user }, error: authError } = await client.auth.getUser();
      if (authError) throw authError;
      if (!user) throw new Error("No has iniciado sesión");
      userId = user.id;
      console.log("[DEBUG updateEvaluation] Usuario autenticado ID:", userId);

      const { data: publicUserData, error: publicUserError } = await client
        .from('users')
        .select('vendor_id, role_id')
        .eq('id', userId)
        .single();

      if (publicUserError) throw new Error("Error al obtener datos del perfil de usuario.");
      if (!publicUserData) throw new Error("Perfil de usuario no encontrado en public.users.");

      userVendorId = publicUserData.vendor_id;
      const userRoleId = publicUserData.role_id;
      console.log(`[DEBUG updateEvaluation] User Role ID: ${userRoleId}, Vendor ID: ${userVendorId}`);

      if (!userRoleId) throw new Error('Usuario sin rol asignado');
      const { data: roleData, error: roleError } = await client
        .from('roles')
        .select('name')
        .eq('id', userRoleId)
        .single();

      if (roleError) throw roleError;

      // Allow admin or evaluator to update core evaluation data
      // Suppliers might only update responses (handled later)
      isAdminUser = roleData?.name === 'admin';
      const isEvaluator = roleData?.name === 'evaluator';

      if (!isAdminUser && !isEvaluator) {
        // If also not a supplier submitting responses, deny
        // Logic below handles supplier response submission specifically
        if (!userVendorId) {
          console.error("[DEBUG updateEvaluation] Permiso denegado. Rol no admin/evaluator y no es proveedor:", roleData?.name);
          throw new Error('No tienes permisos para editar evaluaciones o enviar respuestas.');
        }
        // If it's a supplier, allow proceeding but only response updates should occur
        console.log("[DEBUG updateEvaluation] Usuario es proveedor, solo se procesarán respuestas.");
      } else {
        console.log("[DEBUG updateEvaluation] Permiso concedido para edición general. Rol:", roleData.name);
      }

    } catch (error) {
      console.error('[DEBUG updateEvaluation] Error de autenticación o obtención de perfil:', error);
      if (error instanceof Error && error.message.includes("No has iniciado sesión")) {
        throw error;
      }
      throw new Error("Error de autenticación o perfil. Por favor, inicia sesión nuevamente.");
    }

    // --- Update Evaluation Core Fields (Only if Admin/Evaluator) ---
    // Initialize error variable for core update
    let evaluationError: Error | null = null;
    if (isAdminUser || /* isEvaluator - add if evaluators can update core */ false) {
      console.log("[DEBUG updateEvaluation] Actualizando campos principales de la evaluación...");
      const { error } = await client
        .from('evaluations')
        .update({
          title: evaluationData.title,
          description: evaluationData.description,
          start_date: new Date(evaluationData.start_date).toISOString(),
          end_date: new Date(evaluationData.end_date).toISOString(),
          metadata: evaluationData.metadata
        })
        .eq('id', evaluationData.id);
      evaluationError = error; // Assign error result

      if (evaluationError) {
        console.error("[DEBUG updateEvaluation] Error actualizando tabla evaluations:", JSON.stringify(evaluationError, null, 2));
      } else {
        console.log("[DEBUG updateEvaluation] Update en tabla evaluations ejecutado.");
      }
    }

    // --- Update Vendor Assignments (Only if Admin/Evaluator) ---
    if (isAdminUser || /* isEvaluator - add if needed */ false) {
      if (evaluationData.vendor_ids !== undefined && evaluationData.vendor_ids !== null) {
        console.log("[DEBUG updateEvaluation] Actualizando asignaciones de vendor...");
        // Logic to get current assignments, calculate diff, add/remove from evaluation_vendors
        // ... (This logic seems correct from previous state) ...
        const { data: currentAssignments, error: getAssignmentsError } = await client
          .from('evaluation_vendors')
          .select('vendor_id')
          .eq('evaluation_id', evaluationData.id);
        if (getAssignmentsError) throw getAssignmentsError;
        const currentVendorIds = (currentAssignments || []).map(a => a.vendor_id);
        const newVendorIds = Array.isArray(evaluationData.vendor_ids) ? evaluationData.vendor_ids : [];
        const vendorsToAdd = newVendorIds.filter(id => !currentVendorIds.includes(id));
        const vendorsToRemove = currentVendorIds.filter(id => !newVendorIds.includes(id));

        // Remove
        if (vendorsToRemove.length > 0) {
            const { error: removeError } = await client.from('evaluation_vendors').delete().eq('evaluation_id', evaluationData.id).in('vendor_id', vendorsToRemove);
            if (removeError) throw removeError;
          }
        // Add
        if (vendorsToAdd.length > 0) {
            const vendorAssignments = vendorsToAdd.map(vendorId => ({ evaluation_id: evaluationData.id, vendor_id: vendorId, assigned_by: userId, assigned_at: new Date().toISOString() }));
            const { error: addError } = await client.from('evaluation_vendors').insert(vendorAssignments);
            if (addError) throw addError;
          }
      } else {
        console.log("[DEBUG updateEvaluation] No se proporcionaron vendor_ids, no se actualizan asignaciones.");
      }
    }

    // --- Handle Questions (Only if Admin/Evaluator) ---
    let questionErrors: any[] = []; // Initialize here
    if (isAdminUser || /* isEvaluator - add if needed */ false) {
      const questionsToCreate = evaluationData.questions?.filter(q => q.isNew && !q.isDeleted) || [];
      const questionsToUpdate = evaluationData.questions?.filter(q => !q.isNew && !q.isDeleted) || [];
      const questionsToDelete = evaluationData.questions?.filter(q => q.isDeleted && !q.isNew) || [];
      console.log(`[DEBUG updateEvaluation] Procesando ${questionsToCreate.length} crear, ${questionsToUpdate.length} actualizar, ${questionsToDelete.length} eliminar preguntas/enlaces...`);

      // Create new questions and link them
      if (questionsToCreate.length > 0) {
        // ... (Logic to insert into 'questions' then insert into 'evaluation_questions' - seems correct from previous state) ...
        const newQuestions = questionsToCreate.map(question => { /* map logic */
          const questionType = question.type; // Assuming type is already validated
          if (!questionType) return null;
          return { id: question.id || uuidv4(), question_text: question.text, category: question.category || 'general', options: formatQuestionOptions(question), weight: question.weight, is_required: question.required, order_index: question.order, type: questionType, metadata: {} };
        }).filter(q => q !== null);

        if (newQuestions.length > 0) {
          const { data: insertedQs, error: createError } = await client.from('questions').insert(newQuestions as any).select('id');
          if (createError) questionErrors.push({ op: 'createQ', error: createError });
          else {
            const links = (insertedQs || []).map((q, idx) => ({ evaluation_id: evaluationData.id, question_id: q.id, order_index: questionsToCreate[idx].order }));
            const { error: linkError } = await client.from('evaluation_questions').insert(links);
            if (linkError) questionErrors.push({ op: 'linkQ', error: linkError });
          }
        }
      }

      // Update existing questions (global definition)
      if (questionsToUpdate.length > 0) {
        // ... (Logic to update 'questions' table - seems correct from previous state) ...
        const updatePromises = questionsToUpdate.map(question => { /* map logic to build updatePayload */
          const questionType = question.type;
          if (!questionType) return Promise.resolve();
          const updatePayload = { /* build payload */ question_text: question.text, category: question.category, subcategory: question.subcategory, description: question.description, options: formatQuestionOptions(question), weight: question.weight, is_required: question.required, order_index: question.order, type: questionType };
          if (Object.keys(updatePayload).length === 0) return Promise.resolve();
          return client.from('questions').update(updatePayload as any).eq('id', question.id);
        });
        const results = await Promise.allSettled(updatePromises);
        results.forEach((r, i) => { if (r.status === 'rejected') questionErrors.push({ op: 'updateQ', id: questionsToUpdate[i].id, error: r.reason }); });
      }

      // Unlink (delete from evaluation_questions) questions marked for deletion
      if (questionsToDelete.length > 0) {
        // ... (Logic to delete from 'evaluation_questions' - seems correct from previous state) ...
        const idsToUnlink = questionsToDelete.map(q => q.id);
        const { error: unlinkError } = await client.from('evaluation_questions').delete().eq('evaluation_id', evaluationData.id).in('question_id', idsToUnlink);
        if (unlinkError) questionErrors.push({ op: 'unlinkQ', error: unlinkError });
        }
    }

    // --- Handle Response Submission/Update (Suppliers or Admins/Evaluators) ---
    if (evaluationData.responses && Array.isArray(evaluationData.responses) && evaluationData.responses.length > 0) {
      const submitterVendorId = userVendorId; // Use the logged-in user's vendor ID

      // Ensure the user submitting responses is actually a vendor
      if (!submitterVendorId) {
        // This case should ideally be caught by the initial permission check if only suppliers can submit
        console.error("[DEBUG updateEvaluation] Intento de envío de respuestas por usuario sin vendor_id asociado.");
        throw new Error("Usuario no asociado a un proveedor no puede enviar respuestas.");
      }
      console.log(`[DEBUG updateEvaluation] Procesando ${evaluationData.responses.length} respuestas para Vendor ID: ${submitterVendorId}`);

      // Fetch question weights needed for score calculation
      const questionIds = evaluationData.responses.map(r => r.question_id).filter(id => !!id);
      const { data: questionsData, error: qError } = await client
        .from('questions')
        .select('id, weight, type') // Also get type for scoring logic
        .in('id', questionIds);

      if (qError) throw new Error("Error al obtener datos de preguntas para puntaje.");
      const questionInfoMap = new Map(questionsData?.map(q => [q.id, { weight: q.weight || 0, type: q.type }]));

      const responsesToUpsert: Tables['responses']['Insert'][] = evaluationData.responses.map(response => {
        const questionInfo = questionInfoMap.get(response.question_id);
        const questionWeight = questionInfo?.weight ?? 0;
        const questionType = questionInfo?.type;

        // Calculate score based on type and response_value/answer
        let calculatedScore = calculateResponseScore(response, questionWeight, questionType);

        // Prepare payload for upsert, ensure type compatibility
        const upsertPayload: Tables['responses']['Insert'] = {
          evaluation_id: evaluationData.id,
          question_id: response.question_id,
          vendor_id: submitterVendorId,
          response_value: response.response_value,
          answer: response.answer, // Use the enum type from UpdateEvaluationData
          notes: response.notes,
          evidence_urls: response.evidence_urls,
          score: calculatedScore
        };
        return upsertPayload;
      }).filter(r => !!r.question_id); // Filter out any potential invalid entries

      if (responsesToUpsert.length > 0) {
        console.log("[DEBUG updateEvaluation] Intentando Upsert para respuestas:", responsesToUpsert.length);
        const { error: upsertError } = await client
          .from('responses')
          .upsert(responsesToUpsert, {
            onConflict: 'evaluation_id, question_id, vendor_id'
          });

        if (upsertError) {
          console.error("[DEBUG updateEvaluation] Error en upsert de respuestas:", upsertError);
          throw new Error(`Error al guardar respuestas: ${upsertError.message}`);
        }
        console.log("[DEBUG updateEvaluation] Upsert de respuestas completado.");

        // TODO: After successful response upsert, recalculate and update evaluation total_score and progress
        // This might involve fetching all responses for this vendor/evaluation again
        // Or perform calculation client-side before calling update, or use a DB function.
        console.warn("[TODO] Recalcular y actualizar evaluation.total_score y evaluation.progress después de guardar respuestas.")

      }
    }

    // Throw combined errors if any occurred
    if (evaluationError) throw evaluationError; // Throw error from core update if it happened
    if (questionErrors.length > 0) {
      const errorMessages = questionErrors.map(e => `Op:${e.op} Id:${e.id || 'N/A'} Msg:${e.error.message}`).join('; ');
      throw new Error(`Errores al procesar preguntas: ${errorMessages}`);
    }

    console.log("[DEBUG updateEvaluation] Operación completada para Evaluación ID:", evaluationData.id);
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

// Helper function for score calculation (extracted for clarity)
function calculateResponseScore(
  response: { response_value: string; answer?: Enums['answer_enum'] | null },
  questionWeight: number,
  questionType?: Enums['question_type'] | null
): number {
  let score = 0;
  try {
    if (questionType === 'si/no/no aplica') {
      if (response.answer === 'Yes') score = questionWeight;
      else if (response.answer === 'No') score = 0;
      else if (response.answer === 'N/A') score = 0; // Or handle N/A differently

    } else if (questionType === 'escala 1-5') {
      const scaleValue = parseInt(response.response_value);
      if (!isNaN(scaleValue)) {
        // Example scaling: 1=0, 2=0.25*W, 3=0.5*W, 4=0.75*W, 5=1*W
        score = Math.max(0, (scaleValue - 1) / 4) * questionWeight;
      }
    } else {
      // Default or handle other types
      console.warn(`Unhandled question type for score calculation: ${questionType}`);
    }
  } catch (e) {
    console.error("Error calculating score for response:", response, e);
    score = 0; // Default to 0 on error
  }
  // Ensure score is not negative and potentially cap at weight if needed
  return Math.max(0, score);
}