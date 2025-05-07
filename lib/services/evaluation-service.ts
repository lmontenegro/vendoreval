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
    if (!isValidUUID(evaluationId)) {
      throw new Error("ID de evaluación no válido");
    }

    // Obtener los datos básicos de la evaluación
    const { data: evaluationData, error: evaluationError } = await client
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
        vendor:vendor_id(id, name)
      `)
      .eq('id', evaluationId)
      .single();

    if (evaluationError) {
      console.error("Error al obtener detalles de la evaluación:", evaluationError);
      throw evaluationError;
    }

    if (!evaluationData) {
      throw new Error("Evaluación no encontrada");
    }

    // Obtener las preguntas específicas de esta evaluación a través de evaluation_questions
    const { data: evaluationQuestions, error: questionsError } = await client
      .from('evaluation_questions')
      .select(`
        question_id,
        order_index,
        questions:question_id (
          id,
          category,
          subcategory,
          question_text,
          description,
          options,
          weight,
          is_required,
          order_index,
          type
        )
      `)
      .eq('evaluation_id', evaluationId)
      .order('order_index', { ascending: true, nullsFirst: false });

    if (questionsError) {
      console.error("Error al obtener preguntas de la evaluación:", questionsError);
      throw questionsError;
    }

    // Extraer y formatear las preguntas desde los resultados
    const questions = evaluationQuestions.map(eq => {
      const question = eq.questions;
      return {
        id: question.id,
        category: question.category,
        subcategory: question.subcategory,
        question_text: question.question_text,
        description: question.description,
        options: question.options,
        weight: question.weight || 1,
        is_required: question.is_required || false,
        order_index: eq.order_index || 0,
        type: question.type
      };
    });

    // Obtener las respuestas existentes para esta evaluación
    const { data: responsesData, error: responsesError } = await client
      .from('responses')
      .select(`
        id,
        question_id,
        response_value,
        score,
        notes,
        evidence_urls,
        reviewed_by,
        review_date,
        vendor_id,
        answer
      `)
      .eq('evaluation_id', evaluationId);

    if (responsesError) {
      console.error("Error al obtener respuestas de la evaluación:", responsesError);
      throw responsesError;
    }

    // Obtener los vendors asignados a esta evaluación
    const { data: vendorsData, error: vendorsError } = await client
      .from('evaluation_vendors')
      .select(`
        id,
        vendor:vendor_id (id, name),
        status
      `)
      .eq('evaluation_id', evaluationId);

    if (vendorsError) {
      console.error("Error al obtener vendors asignados:", vendorsError);
      throw vendorsError;
    }

    const assignedVendors = vendorsData.map(v => ({
      id: v.vendor?.id || '',
      name: v.vendor?.name || '',
      status: v.status
    }));

    // Construir el objeto de evaluación completo
    const evaluation: Evaluation = {
      id: evaluationData.id,
      title: evaluationData.title,
      description: evaluationData.description,
      vendor_id: evaluationData.vendor_id,
      vendor_name: evaluationData.vendor?.name || undefined,
      vendors: assignedVendors,
      evaluator_id: evaluationData.evaluator_id,
      status: evaluationData.status,
      progress: evaluationData.progress,
      total_score: evaluationData.total_score,
      start_date: evaluationData.start_date,
      end_date: evaluationData.end_date,
      created_at: evaluationData.created_at || new Date().toISOString(),
      updated_at: evaluationData.updated_at,
      questions,
      responses: responsesData || [],
      metadata: evaluationData.metadata
    };

    return { data: evaluation, error: null };
  } catch (error) {
    console.error("Error en getEvaluationDetails:", error);
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
    clientId?: string; // ID temporal generado por el cliente
    tempId?: string;   // Otro posible ID temporal
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
    console.log("[DEBUG updateEvaluation] ========== INICIO ACTUALIZACIÓN ==========");
    console.log("[DEBUG updateEvaluation] ID Evaluación:", evaluationData.id);

    // Inicializar variable de errores
    let questionErrors: any[] = []; // Array para almacenar errores de preguntas
    let evaluationError: Error | null = null; // Para almacenar error principal

    let userId: string;
    let userVendorId: string | null = null; // Variable to store the vendor ID
    let isAdminUser = false; // Flag for admin permission
    try {
      const { data: { user }, error: authError } = await client.auth.getUser();
      if (authError) throw authError;
      if (!user) throw new Error("No has iniciado sesión");
      userId = user.id;
      console.log("[DEBUG updateEvaluation] Usuario autenticado:", userId);

      // Resto del código de autenticación...

      // --- DETECCIÓN DE PREGUNTAS NUEVAS ---
      if (evaluationData.questions && evaluationData.questions.length > 0) {
        console.log("[DEBUG updateEvaluation] === DETECTANDO PREGUNTAS NUEVAS ===");
        console.log("[DEBUG updateEvaluation] Cantidad total de preguntas recibidas:", evaluationData.questions.length);

        try {
          // Obtener todas las preguntas vinculadas actualmente a esta evaluación
          const { data: existingLinked, error: linkedError } = await client
            .from('evaluation_questions')
            .select('question_id')
            .eq('evaluation_id', evaluationData.id);

          if (linkedError) {
            console.error(`[DEBUG updateEvaluation] Error al obtener preguntas vinculadas: ${linkedError.message}`);
          } else {
            console.log(`[DEBUG updateEvaluation] Preguntas ya vinculadas a evaluación: ${existingLinked.length}`);

            // Obtener los IDs de preguntas ya vinculadas
            const linkedQuestionIds = existingLinked.map(eq => eq.question_id);
            console.log(`[DEBUG updateEvaluation] IDs de preguntas vinculadas: ${JSON.stringify(linkedQuestionIds)}`);

            // Marcar automáticamente como nuevas las preguntas que no estén vinculadas
            evaluationData.questions = evaluationData.questions.map(q => {
              const isAlreadyLinked = linkedQuestionIds.includes(q.id);
              if (!isAlreadyLinked) {
                console.log(`[DEBUG updateEvaluation] Pregunta ${q.id} marcada como NUEVA (no vinculada previamente)`);
                return { ...q, isNew: true };
              }
              return q;
            });
          }
        } catch (err) {
          console.error(`[DEBUG updateEvaluation] Error verificando vínculos existentes: ${err}`);
        }

        // Análisis detallado de preguntas (mantener este código para diagnóstico)
        console.log("[DEBUG updateEvaluation] ANÁLISIS DETALLADO DE CADA PREGUNTA (DESPUÉS DE PROCESAMIENTO):");
        evaluationData.questions.forEach((q, idx) => {
          console.log(`[DEBUG updateEvaluation] Pregunta #${idx} - Estructura actualizada:`);
          // Listar todas las propiedades de la pregunta de forma segura
          const props = Object.keys(q).map(key => {
            const value = key in q ? (q as any)[key] : undefined;
            return `${key}: ${JSON.stringify(value)}`;
          });
          console.log(`[DEBUG updateEvaluation]   Propiedades: ${props.join(', ')}`);

          // Verificar específicamente la propiedad isNew
          console.log(`[DEBUG updateEvaluation]   isNew = ${q.isNew} (tipo: ${typeof q.isNew})`);
          console.log(`[DEBUG updateEvaluation]   isDeleted = ${q.isDeleted} (tipo: ${typeof q.isDeleted})`);
          console.log(`[DEBUG updateEvaluation]   id = ${q.id} (¿es UUID válido? ${isValidUUID(q.id)})`);
        });
      }
    } catch (e) {
      console.error("[DEBUG updateEvaluation] Error al obtener usuario/sesión:", e);
      throw new Error("Error al autenticar");
    }

    // Filtrar preguntas según acción requerida
    console.log("[DEBUG updateEvaluation] === PREPARANDO PROCESAMIENTO DE PREGUNTAS ===");

    // Log antes del filtrado
    console.log("[DEBUG updateEvaluation] Preguntas ANTES de filtrar:", evaluationData.questions?.length || 0);

    // Identificar preguntas por acción a realizar
    // Una pregunta es nueva si:
    // 1. Tiene isNew=true explícitamente
    // 2. No tiene ID o su ID no es un UUID válido 
    // 3. Tiene un campo temporal como clientId o tempId (añadido por frontend)
    const questionsToCreate = evaluationData.questions?.filter((q, idx) => {
      const explicitlyNew = q.isNew === true;
      const hasInvalidId = !q.id || !isValidUUID(q.id);
      const hasTempId = (q as any).clientId || (q as any).tempId;

      // Es nueva si cumple cualquiera de estas condiciones Y no está marcada para eliminar
      const shouldCreate = (explicitlyNew || hasInvalidId || hasTempId) && !q.isDeleted;

      console.log(`[DEBUG updateEvaluation] Analizando pregunta #${idx} para creación:`);
      console.log(`  ID: ${q.id || 'sin ID'}`);
      console.log(`  isNew: ${q.isNew} (${typeof q.isNew})`);
      console.log(`  explicitlyNew: ${explicitlyNew}`);
      console.log(`  hasInvalidId: ${hasInvalidId}`);
      console.log(`  hasTempId: ${hasTempId}`);
      console.log(`  isDeleted: ${q.isDeleted}`);
      console.log(`  RESULTADO: ${shouldCreate ? 'SE CREARÁ' : 'NO SE CREARÁ'}`);

      return shouldCreate;
    }) || [];

    const questionsToUpdate = evaluationData.questions?.filter(q => !q.isNew && !q.isDeleted && q.id) || [];
    const questionsToDelete = evaluationData.questions?.filter(q => q.isDeleted === true) || [];

    console.log(`[DEBUG updateEvaluation] Resumen de preguntas: 
      - ${questionsToCreate.length} a CREAR
      - ${questionsToUpdate.length} a ACTUALIZAR
      - ${questionsToDelete.length} a ELIMINAR`);

    // Mostrar detalles de preguntas a crear
    if (questionsToCreate.length > 0) {
      console.log("[DEBUG updateEvaluation] Detalles de preguntas a crear:");
      questionsToCreate.forEach((q, idx) => {
        console.log(`  [${idx}] ID=${q.id || 'nuevo'} | Texto="${q.text?.substring(0, 30)}" | Tipo=${q.type} | Cat=${q.category || 'general'}`);
      });
    }

    // --- CREAR NUEVAS PREGUNTAS ---
    if (questionsToCreate.length > 0) {
      console.log(`[DEBUG updateEvaluation] ===== CREACIÓN DE PREGUNTAS NUEVAS: ${questionsToCreate.length} =====`);

      // Log completo de cada pregunta
      questionsToCreate.forEach((q, idx) => {
        console.log(`[DEBUG updateEvaluation] Pregunta a crear #${idx + 1}:`, JSON.stringify(q, null, 2));
      });

      try {
        // Paso 0: Asegurarse de que todas las preguntas nuevas tengan un ID válido
        const preparedQuestionsToCreate = questionsToCreate.map(q => {
          // Si no tiene ID o no es válido, asignar uno nuevo
          if (!q.id || !isValidUUID(q.id)) {
            const newId = uuidv4();
            console.log(`[DEBUG updateEvaluation] Generando UUID para pregunta nueva: ${newId}`);
            return { ...q, id: newId };
          }
          return q;
        });

        console.log(`[DEBUG updateEvaluation] Total de preguntas a crear: ${preparedQuestionsToCreate.length}`);

        // Paso 1: Crear las preguntas en la tabla questions
        const questionsToInsert = preparedQuestionsToCreate.map(q => ({
          id: q.id,
          question_text: q.text,
          type: q.type,
          category: q.category || 'general',
          subcategory: q.subcategory || null,
          description: q.description || null,
          options: q.options || {},
          weight: q.weight || 1,
          is_required: q.required,
          order_index: q.order || 1
        }));

        console.log(`[DEBUG updateEvaluation] Insertando ${questionsToInsert.length} preguntas en la base de datos:`);
        console.log(JSON.stringify(questionsToInsert, null, 2));

        // Obtener autenticación actual y permisos para diagnóstico
        const { data: sessionData } = await client.auth.getSession();
        console.log(`[DEBUG updateEvaluation] Sesión actual:`, {
          tieneToken: !!sessionData?.session?.access_token,
          expiraEn: sessionData?.session?.expires_in,
          rol: sessionData?.session?.user?.role
        });

        // Verificar rol del usuario antes de insertar
        try {
          const { data: userData, error: userError } = await client
            .from('users')
            .select('id, email, role:role_id(id, name)')
            .eq('id', userId)
            .single();

          if (userError) {
            console.log(`[DEBUG updateEvaluation] Error obteniendo rol del usuario: ${userError.message}`);
          } else {
            console.log(`[DEBUG updateEvaluation] Usuario: ${userData.email}, Rol:`, userData.role);
          }
        } catch (e) {
          console.log(`[DEBUG updateEvaluation] Error al verificar rol de usuario: ${e}`);
        }

        // INSERCIÓN DIRECTA CON INSTRUCCIÓN SQL NATIVA PARA DIAGNOSTICO
        // Este bloque es solo para diagnóstico y debe eliminarse después
        for (const q of questionsToInsert) {
          console.log(`[DEBUG SQL] Ejecutando inserción directa para pregunta ${q.id}`);
          try {
            const { data: directResult, error: directError } = await client.rpc(
              'debug_insert_question' as any,
              {
                question_id: q.id,
                question_text: q.question_text,
                question_type: q.type,
                question_category: q.category
              }
            );
            console.log(`[DEBUG SQL] Resultado inserción directa:`, directResult || 'No data');
            console.log(`[DEBUG SQL] Error inserción directa:`, directError ? JSON.stringify(directError) : 'No error');
          } catch (rpcError) {
            console.log(`[DEBUG SQL] Excepción en RPC: ${rpcError}`);
          }
        }

        console.log(`[DEBUG updateEvaluation] === INTENTANDO INSERCIÓN VÍA CLIENTE SUPABASE ===`);
        try {
          const { data: insertedQuestions, error: insertError } = await client
            .from('questions')
            .insert(questionsToInsert)
            .select();

          if (insertError) {
            console.error(`[DEBUG updateEvaluation] ERROR AL INSERTAR PREGUNTAS:`, insertError);
            console.error(`[DEBUG updateEvaluation] Código: ${insertError.code}, Detalles: ${insertError.details}`);
            console.error(`[DEBUG updateEvaluation] Mensaje: ${insertError.message}`);
            console.error(`[DEBUG updateEvaluation] Hint: ${(insertError as any).hint}`);
            questionErrors.push({ message: 'Error al crear preguntas', details: insertError });
            throw new Error(`Error al crear preguntas: ${insertError.message}`);
          }

          console.log(`[DEBUG updateEvaluation] Preguntas creadas con éxito:`,
            insertedQuestions ? insertedQuestions.length : 'ninguna');

          if (insertedQuestions && insertedQuestions.length > 0) {
            console.log(`[DEBUG updateEvaluation] Primera pregunta creada:`, JSON.stringify(insertedQuestions[0], null, 2));

            try {
              // Paso 2: Vincular las preguntas con la evaluación
              const questionLinks = insertedQuestions.map((q, index) => ({
                evaluation_id: evaluationData.id,
                question_id: q.id,
                order_index: preparedQuestionsToCreate[index]?.order || index + 1
              }));

              console.log(`[DEBUG updateEvaluation] Creando ${questionLinks.length} vínculos entre preguntas y evaluación:`,
                JSON.stringify(questionLinks, null, 2));

              console.log(`[DEBUG updateEvaluation] === INTENTANDO CREAR VÍNCULOS EN TABLA evaluation_questions ===`);
              const { data: linkedQuestions, error: linkError } = await client
                .from('evaluation_questions')
                .insert(questionLinks)
                .select();

              if (linkError) {
                console.error(`[DEBUG updateEvaluation] ERROR AL VINCULAR PREGUNTAS CON EVALUACIÓN:`, linkError);
                console.error(`[DEBUG updateEvaluation] Código de error: ${linkError.code}, Detalles: ${linkError.details}`);
                console.error(`[DEBUG updateEvaluation] Mensaje: ${linkError.message}`);
                console.error(`[DEBUG updateEvaluation] Hint: ${(linkError as any).hint}`);

                // Intentar diagnóstico: Verificar si los vínculos existen
                try {
                  console.log(`[DEBUG updateEvaluation] Verificando si existen vínculos...`);
                  const { data: existingLinks, error: checkError } = await client
                    .from('evaluation_questions')
                    .select('question_id, evaluation_id')
                    .eq('evaluation_id', evaluationData.id)
                    .in('question_id', questionLinks.map(link => link.question_id));

                  if (checkError) {
                    console.error(`[DEBUG updateEvaluation] Error al verificar vínculos: ${checkError.message}`);
                  } else {
                    console.log(`[DEBUG updateEvaluation] Vínculos existentes: ${existingLinks?.length || 0}`,
                      existingLinks ? JSON.stringify(existingLinks) : 'ninguno');
                  }
                } catch (e) {
                  console.error(`[DEBUG updateEvaluation] Error en diagnóstico de vínculos: ${e}`);
                }

                questionErrors.push({ message: 'Error al vincular preguntas', details: linkError });
              } else {
                console.log(`[DEBUG updateEvaluation] Vínculos creados con éxito:`,
                  linkedQuestions ? linkedQuestions.length : 'ninguno');
                if (linkedQuestions && linkedQuestions.length > 0) {
                  console.log(`[DEBUG updateEvaluation] Primer vínculo creado:`, JSON.stringify(linkedQuestions[0], null, 2));
                }
              }
            } catch (linkError) {
              console.error(`[DEBUG updateEvaluation] EXCEPCIÓN AL VINCULAR PREGUNTAS:`, linkError);
              questionErrors.push({ message: 'Excepción al vincular preguntas', details: linkError });
            }
          } else {
            console.log(`[DEBUG updateEvaluation] No se recibieron preguntas del servidor después de la inserción`);
          }
        } catch (error) {
          console.error(`[DEBUG updateEvaluation] EXCEPCIÓN GENERAL EN CREACIÓN DE PREGUNTAS:`, error);
          questionErrors.push({ message: 'Excepción en creación de preguntas', details: error });
        }
      } catch (error) {
        console.error(`[DEBUG updateEvaluation] EXCEPCIÓN GENERAL EN CREACIÓN DE PREGUNTAS:`, error);
        questionErrors.push({ message: 'Excepción en creación de preguntas', details: error });
      }
    }

    // --- ACTUALIZAR PREGUNTAS EXISTENTES ---
    if (questionsToUpdate.length > 0) {
      console.log("[DEBUG updateEvaluation] ===== ACTUALIZACIÓN DE PREGUNTAS EXISTENTES =====");
      console.log("[DEBUG updateEvaluation] Total de preguntas a actualizar:", questionsToUpdate.length);

      // Actualizar una por una para mejor manejo de errores
      for (const question of questionsToUpdate) {
        try {
          console.log(`[DEBUG updateEvaluation] Procesando actualización de pregunta ID=${question.id}, Texto="${question.text?.substring(0, 30)}"`);

          // Validar tipo
          const questionType: Enums['question_type'] | undefined =
            question.type === 'escala 1-5' || question.type === 'si/no/no aplica'
              ? question.type
              : undefined;

          if (!questionType) {
            console.warn(`[DEBUG updateEvaluation] Tipo inválido para actualizar pregunta ${question.id}, omitiendo.`);
            continue;
          }

          // Preparar payload de actualización
          const updatePayload: Tables['questions']['Update'] = {
            question_text: question.text,
            category: question.category,
            subcategory: question.subcategory || null,
            description: question.description || null,
            options: formatQuestionOptions(question),
            weight: question.weight,
            is_required: question.required,
            type: questionType
          };

          // Filtrar campos undefined
          Object.keys(updatePayload).forEach(key => {
            if (updatePayload[key as keyof typeof updatePayload] === undefined) {
              delete updatePayload[key as keyof typeof updatePayload];
            }
          });

          // Ejecutar actualización
          const { data: updateResult, error: updateError } = await client
            .from('questions')
            .update(updatePayload)
            .eq('id', question.id)
            .select();

          if (updateError) {
            console.error(`[DEBUG updateEvaluation] Error actualizando pregunta ${question.id}:`, updateError);
            questionErrors.push({ op: 'updateQuestion', id: question.id, error: updateError });
          } else {
            console.log(`[DEBUG updateEvaluation] Pregunta ${question.id} actualizada correctamente:`, updateResult);
          }
        } catch (error) {
          console.error(`[DEBUG updateEvaluation] Error procesando pregunta ${question.id}:`, error);
          questionErrors.push({ op: 'updateQuestion', id: question.id, error });
        }
      }
    }

    // --- ELIMINAR PREGUNTAS (DESVINCULAR) ---
    if (questionsToDelete.length > 0) {
      console.log("[DEBUG updateEvaluation] ===== ELIMINACIÓN DE PREGUNTAS =====");
      console.log("[DEBUG updateEvaluation] Preguntas a eliminar:", questionsToDelete.length);

      const questionIdsToUnlink = questionsToDelete
        .map(q => q.id)
        .filter(id => !!id); // Filtrar IDs válidos

      if (questionIdsToUnlink.length > 0) {
        console.log(`[DEBUG updateEvaluation] IDs de preguntas a desvincular:`, questionIdsToUnlink);

        // Eliminar de la tabla de relación
        try {
          const { data: unlinkResult, error: unlinkError } = await client
            .from('evaluation_questions')
            .delete()
            .eq('evaluation_id', evaluationData.id)
            .in('question_id', questionIdsToUnlink)
            .select();

          if (unlinkError) {
            console.error("[DEBUG updateEvaluation] Error desvinculando preguntas:", unlinkError);
            questionErrors.push({ op: 'unlinkQuestions', error: unlinkError });
          } else {
            console.log(`[DEBUG updateEvaluation] Preguntas desvinculadas: ${unlinkResult?.length || 0}`);
          }
        } catch (unlinkException) {
          console.error("[DEBUG updateEvaluation] Excepción al desvincular preguntas:", unlinkException);
          questionErrors.push({ op: 'unlinkQuestionsException', error: unlinkException });
        }
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
      console.error("[DEBUG updateEvaluation] Errores durante el proceso:", errorMessages);
      throw new Error(`Errores al procesar preguntas: ${errorMessages}`);
    }

    console.log("[DEBUG updateEvaluation] ========== FIN DE ACTUALIZACIÓN ==========");
    console.log("[DEBUG updateEvaluation] Operación completada con éxito para Evaluación ID:", evaluationData.id);
    return { data: { id: evaluationData.id }, error: null };

  } catch (error) {
    console.error('[DEBUG updateEvaluation] ERROR FINAL:', error);
    const finalError = error instanceof Error ? error : new Error('Error desconocido al actualizar evaluación');
    return { data: null, error: finalError };
  }
}

// Función auxiliar para validar UUIDs
function isValidUUID(id: string | undefined): boolean {
  if (!id) return false;
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(id);
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