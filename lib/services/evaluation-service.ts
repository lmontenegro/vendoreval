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
  recommendation_text?: string | null; // Nuevo campo para texto de recomendación
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
    let currentUserId: string | undefined = userId;

    if (!currentUserId) {
      try {
        const { data, error } = await client.auth.getUser();

        if (error) {
          throw error;
        }
        if (!data.user) {
          throw new Error("No has iniciado sesión");
        }
        currentUserId = data.user.id;
      } catch (e) {
        throw new Error("Error al autenticar");
      }
    }

    if (!currentUserId) {
      throw new Error("No se pudo determinar el ID del usuario");
    }

    const { data: testQuery, error: testError } = await client
      .from('evaluations')
      .select('id, title')
      .limit(5);

    const { data: userData, error: userError } = await client
      .from('users')
      .select('role_id, vendor_id')
      .eq('id', currentUserId)
      .single();

    if (userError) {
      throw userError;
    }

    if (!userData?.role_id) {
      throw new Error("Usuario sin rol asignado");
    }

    const { data: roleData, error: roleNameError } = await client
      .from('roles')
      .select('name')
      .eq('id', userData.role_id)
      .single();

    if (roleNameError) {
      throw roleNameError;
    }

    if (!roleData) {
      throw new Error("Rol no encontrado");
    }

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
      if (!userData.vendor_id) {
        return { data: [], error: null };
      }

      const { data: assignedEvals, error: assignedEvalsError } = await client
        .from('evaluation_vendors')
        .select('evaluation_id')
        .eq('vendor_id', userData.vendor_id);

      if (assignedEvalsError) {
        throw assignedEvalsError;
      }

      const evaluationIds = assignedEvals.map(ev => ev.evaluation_id);

      if (!evaluationIds || evaluationIds.length === 0) {
        return { data: [], error: null };
      }

      filteredQuery = query.in('id', evaluationIds);

    }

    const { data, error } = await filteredQuery;

    if (error) {
      throw error;
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
        continue;
      }

      evaluation.vendors = (assignedVendors || []).map(av => ({
        id: (av.vendors as { id: string }).id,
        name: (av.vendors as { name: string }).name,
        status: av.status
      }));
    }

    return { data: processedData, error: null };

  } catch (error) {
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
      throw evaluationError;
    }

    if (!evaluationData) {
      throw new Error("Evaluación no encontrada");
    }

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
      throw questionsError;
    }

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
      throw responsesError;
    }

    const { data: vendorsData, error: vendorsError } = await client
      .from('evaluation_vendors')
      .select(`
        id,
        vendor:vendor_id (id, name),
        status
      `)
      .eq('evaluation_id', evaluationId);

    if (vendorsError) {
      throw vendorsError;
    }

    const assignedVendors = vendorsData.map(v => ({
      id: v.vendor?.id || '',
      name: v.vendor?.name || '',
      status: v.status
    }));

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

    const { error: evaluationError } = await client
      .from('evaluations')
      .insert({
        id: newEvaluationId,
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

    if (evaluationData.questions && evaluationData.questions.length > 0) {
      const questionsToInsertGlobally: Tables['questions']['Insert'][] = evaluationData.questions.map(question => {
        const questionType: Enums['question_type'] | undefined =
          question.type === 'escala 1-5' || question.type === 'si/no/no aplica'
            ? question.type
            : undefined;

        if (!questionType) {
          return null;
        }

        let recommendationText = '';
        if ('recommendation_text' in question && question.recommendation_text) {
          recommendationText = question.recommendation_text;
        } else if (question.options && typeof question.options === 'object' && 'recommendation_text' in question.options) {
          recommendationText = question.options.recommendation_text;
        }

        return {
          id: question.id || uuidv4(),
          question_text: question.text,
          category: question.category || 'general',
          subcategory: null,
          description: null,
          options: formatQuestionOptions(question),
          weight: question.weight,
          is_required: question.required,
          order_index: question.order,
          type: questionType,
          recommendation_text: recommendationText
        };
      }).filter(q => q !== null) as Tables['questions']['Insert'][];

      if (questionsToInsertGlobally.length > 0) {
        const { data: insertedQuestions, error: questionsError } = await client
          .from('questions')
          .insert(questionsToInsertGlobally)
          .select('id');

        if (questionsError) {
          throw questionsError;
        }

        const questionLinks = (insertedQuestions || []).map((q, index) => ({
          evaluation_id: newEvaluationId,
          question_id: q.id,
          order_index: evaluationData.questions[index]?.order
        }));

        if (questionLinks.length > 0) {
          const { error: linkError } = await client
            .from('evaluation_questions')
            .insert(questionLinks);

          if (linkError) {
            throw linkError;
          }
        }
      }
    }

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
        throw assignmentError;
      }
    }

    return { data: { id: newEvaluationId }, error: null };
  } catch (error) {
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
  vendor_ids?: string[] | null;
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
    recommendation_text?: string | null;
    answerOptions?: AnswerOption[];
    isNew?: boolean;
    isDeleted?: boolean;
    clientId?: string;
    tempId?: string;
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
    let questionErrors: any[] = [];
    let evaluationError: Error | null = null;

    let userId: string;
    let userVendorId: string | null = null;
    let isAdminUser = false;
    try {
      const { data: { user }, error: authError } = await client.auth.getUser();
      if (authError) throw authError;
      if (!user) throw new Error("No has iniciado sesión");
      userId = user.id;

      const { data: { role_id } } = await client
        .from('users')
        .select('role_id')
        .eq('id', userId)
        .single();

      if (!role_id) {
        throw new Error("Usuario sin rol asignado");
      }

      if (role_id === 'admin') {
        isAdminUser = true;
      } else {
        userVendorId = await client
          .from('users')
          .select('vendor_id')
          .eq('id', userId)
          .single()
          .then(data => data?.vendor_id);
      }
    } catch (e) {
      throw new Error("Error al autenticar");
    }

    if (evaluationData.questions && evaluationData.questions.length > 0) {
      try {
        const { data: existingLinked, error: linkedError } = await client
          .from('evaluation_questions')
          .select('question_id')
          .eq('evaluation_id', evaluationData.id);

        if (linkedError) {
        } else {
          const linkedQuestionIds = existingLinked.map(eq => eq.question_id);

          evaluationData.questions = evaluationData.questions.map(q => {
            const isAlreadyLinked = linkedQuestionIds.includes(q.id);
            if (!isAlreadyLinked) {
              return { ...q, isNew: true };
            }
            return q;
          });
        }
      } catch (err) {
      }

      evaluationData.questions.forEach((q, idx) => {
        console.log(`Pregunta #${idx} - Estructura actualizada:`);
        const props = Object.keys(q).map(key => {
          const value = key in q ? (q as any)[key] : undefined;
          return `${key}: ${JSON.stringify(value)}`;
        });
        console.log(`  Propiedades: ${props.join(', ')}`);

        console.log(`  isNew = ${q.isNew} (tipo: ${typeof q.isNew})`);
        console.log(`  isDeleted = ${q.isDeleted} (tipo: ${typeof q.isDeleted})`);
        console.log(`  id = ${q.id} (¿es UUID válido? ${isValidUUID(q.id)})`);
      });
    }

    console.log("Preguntas ANTES de filtrar:", evaluationData.questions?.length || 0);

    const questionsToCreate = evaluationData.questions?.filter((q, idx) => {
      const explicitlyNew = q.isNew === true;
      const hasInvalidId = !q.id || !isValidUUID(q.id);
      const hasTempId = (q as any).clientId || (q as any).tempId;

      const shouldCreate = (explicitlyNew || hasInvalidId || hasTempId) && !q.isDeleted;

      console.log(`Analizando pregunta #${idx} para creación:`);
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

    console.log(`Resumen de preguntas: 
      - ${questionsToCreate.length} a CREAR
      - ${questionsToUpdate.length} a ACTUALIZAR
      - ${questionsToDelete.length} a ELIMINAR`);

    if (questionsToCreate.length > 0) {
      questionsToCreate.forEach((q, idx) => {
        console.log(`  [${idx}] ID=${q.id || 'nuevo'} | Texto="${q.text?.substring(0, 30)}" | Tipo=${q.type} | Cat=${q.category || 'general'}`);
      });
    }

    if (questionsToCreate.length > 0) {
      try {
        const preparedQuestionsToCreate = questionsToCreate.map(q => {
          if (!q.id || !isValidUUID(q.id)) {
            const newId = uuidv4();
            return { ...q, id: newId };
          }
          return q;
        });

        console.log(`Total de preguntas a crear: ${preparedQuestionsToCreate.length}`);

        const questionsToInsert = preparedQuestionsToCreate.map(q => ({
          question_text: q.text,
          category: q.category || 'General',
          subcategory: q.subcategory || null,
          description: q.description || null,
          options: formatQuestionOptions(q),
          weight: q.weight || 1,
          is_required: q.required !== undefined ? q.required : true,
          type: q.type,
          recommendation_text: q.recommendation_text || q.options?.recommendation_text || null
        }));

        console.log(`Insertando ${questionsToInsert.length} preguntas en la base de datos:`);
        console.log(JSON.stringify(questionsToInsert, null, 2));

        const { data: insertedQuestions, error: insertError } = await client
          .from('questions')
          .insert(questionsToInsert)
          .select();

        if (insertError) {
          questionErrors.push({ message: 'Error al crear preguntas', details: insertError });
          throw new Error(`Error al crear preguntas: ${insertError.message}`);
        }

        console.log(`Preguntas creadas con éxito:`,
          insertedQuestions ? insertedQuestions.length : 'ninguna');

        if (insertedQuestions && insertedQuestions.length > 0) {
          console.log(`Primera pregunta creada:`, JSON.stringify(insertedQuestions[0], null, 2));

          try {
            const questionLinks = insertedQuestions.map((q, index) => ({
              evaluation_id: evaluationData.id,
              question_id: q.id,
              order_index: preparedQuestionsToCreate[index]?.order || index + 1
            }));

            console.log(`Creando ${questionLinks.length} vínculos entre preguntas y evaluación:`,
              JSON.stringify(questionLinks, null, 2));

            const { data: linkedQuestions, error: linkError } = await client
              .from('evaluation_questions')
              .insert(questionLinks)
              .select();

            if (linkError) {
              questionErrors.push({ message: 'Error al vincular preguntas', details: linkError });
            } else {
              console.log(`Vínculos creados con éxito:`,
                linkedQuestions ? linkedQuestions.length : 'ninguno');
              if (linkedQuestions && linkedQuestions.length > 0) {
                console.log(`Primer vínculo creado:`, JSON.stringify(linkedQuestions[0], null, 2));
              }
            }
          } catch (linkError) {
            questionErrors.push({ message: 'Excepción al vincular preguntas', details: linkError });
          }
        } else {
          console.log(`No se recibieron preguntas del servidor después de la inserción`);
        }
      } catch (error) {
        questionErrors.push({ message: 'Excepción en creación de preguntas', details: error });
      }
    }

    if (questionsToUpdate.length > 0) {
      console.log("Total de preguntas a actualizar:", questionsToUpdate.length);

      for (const question of questionsToUpdate) {
        try {
          console.log(`Procesando actualización de pregunta ID=${question.id}, Texto="${question.text?.substring(0, 30)}"`);

          const questionType: Enums['question_type'] | undefined =
            question.type === 'escala 1-5' || question.type === 'si/no/no aplica'
              ? question.type
              : undefined;

          if (!questionType) {
            continue;
          }

          const updatePayload: Tables['questions']['Update'] = {
            question_text: question.text,
            category: question.category,
            subcategory: question.subcategory || null,
            description: question.description || null,
            options: formatQuestionOptions(question),
            weight: question.weight,
            is_required: question.required,
            type: questionType,
            recommendation_text: question.recommendation_text || question.options?.recommendation_text || null
          };

          Object.keys(updatePayload).forEach(key => {
            if (updatePayload[key as keyof typeof updatePayload] === undefined) {
              delete updatePayload[key as keyof typeof updatePayload];
            }
          });

          const { data: updateResult, error: updateError } = await client
            .from('questions')
            .update(updatePayload)
            .eq('id', question.id)
            .select();

          if (updateError) {
            questionErrors.push({ op: 'updateQuestion', id: question.id, error: updateError });
          } else {
          }
        } catch (error) {
          questionErrors.push({ op: 'updateQuestion', id: question.id, error });
        }
      }
    }

    if (questionsToDelete.length > 0) {
      console.log("Preguntas a eliminar:", questionsToDelete.length);

      const questionIdsToUnlink = questionsToDelete
        .map(q => q.id)
        .filter(id => !!id);

      if (questionIdsToUnlink.length > 0) {
        const { data: unlinkResult, error: unlinkError } = await client
          .from('evaluation_questions')
          .delete()
          .eq('evaluation_id', evaluationData.id)
          .in('question_id', questionIdsToUnlink)
          .select();

        if (unlinkError) {
          questionErrors.push({ op: 'unlinkQuestions', error: unlinkError });
        } else {
        }
      }
    }

    if (evaluationData.responses && Array.isArray(evaluationData.responses) && evaluationData.responses.length > 0) {
      const submitterVendorId = userVendorId;

      if (!submitterVendorId) {
        throw new Error("Usuario no asociado a un proveedor no puede enviar respuestas.");
      }

      console.log(`Procesando ${evaluationData.responses.length} respuestas para Vendor ID: ${submitterVendorId}`);
      console.log('[Payload de respuestas recibido:', JSON.stringify(evaluationData.responses, null, 2));

      const questionIds = evaluationData.responses.map(r => r.question_id).filter(id => !!id);
      const { data: questionsData, error: qError } = await client
        .from('questions')
        .select('id, weight, type')
        .in('id', questionIds);

      if (qError) throw new Error("Error al obtener datos de preguntas para puntaje.");
      const questionInfoMap = new Map(questionsData?.map(q => [q.id, { weight: q.weight || 0, type: q.type }]));

      const responsesToUpsert: Tables['responses']['Insert'][] = evaluationData.responses.map(response => {
        const questionInfo = questionInfoMap.get(response.question_id);
        const questionWeight = questionInfo?.weight ?? 0;
        const questionType = questionInfo?.type;

        let calculatedScore = calculateResponseScore(response, questionWeight, questionType);

        const upsertPayload: Tables['responses']['Insert'] = {
          evaluation_id: evaluationData.id,
          question_id: response.question_id,
          vendor_id: submitterVendorId,
          response_value: response.response_value,
          answer: response.answer,
          notes: response.notes,
          evidence_urls: response.evidence_urls,
          score: calculatedScore
        };
        return upsertPayload;
      }).filter(r => !!r.question_id);

      if (responsesToUpsert.length > 0) {
        console.log("[Intentando Upsert para respuestas:", responsesToUpsert.length);
        const { error: upsertError } = await client
          .from('responses')
          .upsert(responsesToUpsert, {
            onConflict: 'evaluation_id, question_id, vendor_id'
          });

        if (upsertError) {
          throw new Error(`Error al guardar respuestas: ${upsertError.message}`);
        }
        console.log("[Upsert de respuestas completado.");
      }
    }

    if (evaluationError) throw evaluationError;
    if (questionErrors.length > 0) {
      const errorMessages = questionErrors.map(e => `Op:${e.op} Id:${e.id || 'N/A'} Msg:${e.error.message}`).join('; ');
      throw new Error(`Errores al procesar preguntas: ${errorMessages}`);
    }

    return { data: { id: evaluationData.id }, error: null };

  } catch (error) {
    const finalError = error instanceof Error ? error : new Error('Error desconocido al actualizar evaluación');
    return { data: null, error: finalError };
  }
}

function isValidUUID(id: string | undefined): boolean {
  if (!id) return false;
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(id);
}

interface AnswerOption { id: string; text: string; }

function formatQuestionOptions(question: { type: string, options?: any, answerOptions?: AnswerOption[], recommendation_text?: string | null }) {
  const recommendationText = question.recommendation_text ||
    (question.options && typeof question.options === 'object' && !Array.isArray(question.options)
      ? question.options.recommendation_text
      : '');

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
    case 'si/no/no aplica': return { type: 'si/no/no aplica' };
    case 'escala 1-5': return { type: 'escala 1-5', min_label: "Muy malo", max_label: "Excelente" };
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

export async function assignVendorsToEvaluation(
  client: SupabaseClient<Database>,
  evaluationId: string,
  vendorIds: string[]
): Promise<{ success: boolean; error: Error | null }> {
  try {
    const { data: { user }, error: authError } = await client.auth.getUser();
    if (authError) throw authError;
    if (!user) throw new Error("No has iniciado sesión");

    const { data: currentAssignments, error: getAssignmentsError } = await client
      .from('evaluation_vendors')
      .select('vendor_id')
      .eq('evaluation_id', evaluationId);

    if (getAssignmentsError) {
      throw getAssignmentsError;
    }

    const currentVendorIds = (currentAssignments || []).map(a => a.vendor_id);
    const vendorsToAdd = vendorIds.filter(id => !currentVendorIds.includes(id));
    const vendorsToRemove = currentVendorIds.filter(id => !vendorIds.includes(id));

    if (vendorsToRemove.length > 0) {
      const { error: removeError } = await client
        .from('evaluation_vendors')
        .delete()
        .eq('evaluation_id', evaluationId)
        .in('vendor_id', vendorsToRemove);

      if (removeError) {
        throw removeError;
      }
    }

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
        throw addError;
      }
    }

    return { success: true, error: null };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error : new Error('Error desconocido al asignar proveedores')
    };
  }
}

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
      else if (response.answer === 'N/A') score = 0;

    } else if (questionType === 'escala 1-5') {
      const scaleValue = parseInt(response.response_value);
      if (!isNaN(scaleValue)) {
        score = Math.max(0, (scaleValue - 1) / 4) * questionWeight;
      }
    } else {
      console.warn(`Unhandled question type for score calculation: ${questionType}`);
    }
  } catch (e) {
    score = 0;
  }
  return Math.max(0, score);
}