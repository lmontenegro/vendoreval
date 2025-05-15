import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '../database.types';
import { v4 as uuidv4 } from 'uuid';

export interface Recommendation {
  id: string;
  recommendation_text: string;
  question_id: string;
  response_id: string;
  priority: number | null;
  status: 'pending' | 'in_progress' | 'implemented' | 'rejected' | null;
  assigned_to: string | null;
  due_date: string | null;
  action_plan: string | null;
  created_at: string | null;
  updated_at: string | null;
}

/**
 * Crea recomendaciones para preguntas con respuestas "No" o "N/A"
 * @param client Cliente de Supabase
 * @param responseId ID de la respuesta
 * @param questionId ID de la pregunta
 * @param answer Respuesta (No o N/A)
 * @param recommendationText Texto de la recomendación
 * @param profileId ID del perfil a asignar (opcional)
 */
export async function createRecommendationForResponse(
  client: SupabaseClient<Database>,
  responseId: string,
  questionId: string,
  answer: 'No' | 'N/A',
  recommendationText: string,
  profileId: string | null = null
): Promise<{ success: boolean; error: Error | null; recommendationId?: string }> {
  try {
    if (!responseId || !questionId || !recommendationText) {
      console.error("[createRecommendationForResponse] Datos incompletos:", { responseId, questionId, recommendationText });
      return { success: false, error: new Error("Datos incompletos para crear recomendación") };
    }

    console.log(`[createRecommendationForResponse] Creando recomendación para respuesta ${responseId}`);

    const recommendationData = {
      id: uuidv4(), // Generar un nuevo UUID
      question_id: questionId,
      response_id: responseId,
      recommendation_text: recommendationText,
      status: "pending" as const, // Tipo constante para evitar error de tipo
      assigned_to: profileId, // Asignar al perfil si se proporciona (NO al vendor_id)
      priority: answer === "No" ? 1 : 2, // Prioridad alta para No, media para N/A
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    // Verificar si ya existe una recomendación para esta respuesta
    const { data: existingRec, error: existingError } = await client
      .from("recommendations")
      .select("id")
      .eq("response_id", responseId)
      .single();

    if (existingError && !existingError.message.includes("No rows found")) {
      console.error("[createRecommendationForResponse] Error al verificar recomendación existente:", existingError);
      return { success: false, error: existingError };
    }

    if (existingRec) {
      console.log(`[createRecommendationForResponse] Ya existe una recomendación para esta respuesta: ${existingRec.id}`);

      // Actualizar la recomendación existente
      const { data: updatedRec, error: updateError } = await client
        .from("recommendations")
        .update({
          recommendation_text: recommendationText,
          updated_at: new Date().toISOString()
        })
        .eq("id", existingRec.id)
        .select()
        .single();

      if (updateError) {
        console.error("[createRecommendationForResponse] Error al actualizar recomendación:", updateError);
        return { success: false, error: updateError };
      }

      return {
        success: true,
        error: null,
        recommendationId: existingRec.id
      };
    }

    // Crear la recomendación
    const { data: insertedRec, error: insertError } = await client
      .from("recommendations")
      .insert(recommendationData)
      .select()
      .single();

    if (insertError) {
      console.error("[createRecommendationForResponse] Error al crear recomendación:", insertError);
      return { success: false, error: insertError };
    }

    console.log(`[createRecommendationForResponse] Recomendación creada: ${insertedRec.id}`);
    return {
      success: true,
      error: null,
      recommendationId: insertedRec.id
    };
  } catch (error) {
    console.error("[createRecommendationForResponse] Error inesperado:", error);
    return {
      success: false,
      error: error instanceof Error ? error : new Error("Error desconocido")
    };
  }
}

/**
 * Obtiene el texto de recomendación de una pregunta
 * @param client Cliente de Supabase
 * @param questionId ID de la pregunta
 */
export async function getRecommendationTextFromQuestion(
  client: SupabaseClient<Database>,
  questionId: string
): Promise<{ recommendationText: string | null; error: Error | null }> {
  try {
    if (!questionId) {
      return { recommendationText: null, error: new Error("ID de pregunta no proporcionado") };
    }

    const { data: questionData, error: questionError } = await client
      .from("questions")
      .select("recommendation_text, options")
      .eq("id", questionId)
      .single();

    if (questionError) {
      console.error(`[getRecommendationTextFromQuestion] Error al obtener pregunta ${questionId}:`, questionError);
      return { recommendationText: null, error: questionError };
    }

    if (!questionData) {
      return { recommendationText: null, error: null };
    }

    // Primero intentamos obtener el texto del campo recommendation_text
    if (questionData.recommendation_text) {
      return { recommendationText: questionData.recommendation_text, error: null };
    }

    // Si no existe, intentamos obtenerlo del campo options como fallback (para compatibilidad)
    if (questionData.options) {
      // Convertir options a un objeto si es necesario
      let optionsObj = questionData.options;

      // Si options es string, intentar parsearlo
      if (typeof optionsObj === 'string') {
        try {
          optionsObj = JSON.parse(optionsObj);
        } catch (e) {
          console.error("[getRecommendationTextFromQuestion] Error al parsear options:", e);
          return { recommendationText: null, error: null };
        }
      }

      // Acceder a recommendation_text si existe
      if (optionsObj && typeof optionsObj === 'object' && !Array.isArray(optionsObj)) {
        const typedOptions = optionsObj as { recommendation_text?: string };
        return { recommendationText: typedOptions.recommendation_text || null, error: null };
      }
    }

    return { recommendationText: null, error: null };
  } catch (error) {
    console.error("[getRecommendationTextFromQuestion] Error inesperado:", error);
    return {
      recommendationText: null,
      error: error instanceof Error ? error : new Error("Error desconocido")
    };
  }
}

/**
 * Obtiene las recomendaciones por ID de proveedor.
 * @param client Cliente de Supabase
 * @param vendorId ID del proveedor
 * @returns Promise con array de recomendaciones
 */
export async function getRecommendationsByVendorId(
  client: SupabaseClient<Database>,
  vendorId: string
): Promise<Recommendation[]> {
  // Primero obtenemos los IDs de respuestas asociadas a este proveedor
  const { data: responses, error: responsesError } = await client
    .from('responses')
    .select('id')
    .eq('vendor_id', vendorId);

  if (responsesError) {
    console.error('Error al obtener respuestas:', responsesError);
    throw responsesError;
  }

  if (!responses || responses.length === 0) {
    return [];
  }

  const responseIds = responses.map(r => r.id);

  // Luego obtenemos las recomendaciones asociadas a esas respuestas
  const { data: recommendations, error: recommendationsError } = await client
    .from('recommendations')
    .select(`
      *,
      questions!recommendations_question_id_fkey(question_text),
      responses!recommendations_response_id_fkey(
        evaluation_id,
        evaluations!responses_evaluation_id_fkey(title)
      )
    `)
    .in('response_id', responseIds);

  if (recommendationsError) {
    console.error('Error al obtener recomendaciones:', recommendationsError);
    throw recommendationsError;
  }

  return recommendations as unknown as Recommendation[];
}

/**
 * Asigna una recomendación a un perfil de usuario.
 * @param client Cliente de Supabase
 * @param recommendationId ID de la recomendación
 * @param profileId ID del perfil (NO vendor_id)
 * @returns Promise con la recomendación actualizada
 */
export async function assignRecommendationToProfile(
  client: SupabaseClient<Database>,
  recommendationId: string,
  profileId: string
): Promise<Recommendation> {
  // Verificar que el perfil existe
  const { data: profile, error: profileError } = await client
    .from('profiles')
    .select('id')
    .eq('id', profileId)
    .single();

  if (profileError) {
    console.error('Error al verificar perfil:', profileError);
    throw new Error(`El perfil con ID ${profileId} no existe`);
  }

  // Asignar la recomendación al perfil
  const { data: updatedRecommendation, error: updateError } = await client
    .from('recommendations')
    .update({ assigned_to: profileId, updated_at: new Date().toISOString() })
    .eq('id', recommendationId)
    .select()
    .single();

  if (updateError) {
    console.error('Error al asignar recomendación:', updateError);
    throw updateError;
  }

  return updatedRecommendation as unknown as Recommendation;
}

/**
 * Actualiza el estado de una recomendación.
 * @param client Cliente de Supabase
 * @param recommendationId ID de la recomendación
 * @param status Nuevo estado
 * @returns Promise con la recomendación actualizada
 */
export async function updateRecommendationStatus(
  client: SupabaseClient<Database>,
  recommendationId: string,
  status: 'pending' | 'in_progress' | 'implemented' | 'rejected'
): Promise<Recommendation> {
  const updates: any = {
    status,
    updated_at: new Date().toISOString()
  };

  // Si se marca como implementada, registrar la fecha de finalización
  if (status === 'implemented') {
    updates.completed_at = new Date().toISOString();
  }

  const { data: updatedRecommendation, error } = await client
    .from('recommendations')
    .update(updates)
    .eq('id', recommendationId)
    .select()
    .single();

  if (error) {
    console.error('Error al actualizar estado de recomendación:', error);
    throw error;
  }

  return updatedRecommendation as unknown as Recommendation;
}

/**
 * Obtiene las recomendaciones para un usuario con rol supplier
 * @param client Cliente de Supabase
 * @param userId ID del usuario supplier
 * @returns Recomendaciones asociadas a las respuestas del proveedor del usuario
 */
export async function getRecommendationsForSupplier(
  client: SupabaseClient<Database>,
  userId: string
): Promise<{ data: any[] | null; error: Error | null }> {
  try {
    console.log(`[getRecommendationsForSupplier] Iniciando búsqueda para usuario ${userId}`);

    // Obtener datos completos del usuario (rol y vendor_id)
    const { data: userData, error: userError } = await client
      .from('users')
      .select('vendor_id, role:role_id(name)')
      .eq('id', userId)
      .single();

    if (userError) {
      console.error('[getRecommendationsForSupplier] Error al obtener datos del usuario:', userError);
      return { data: null, error: userError };
    }

    // Si es admin o evaluator, permitir acceso sin vendor_id
    const isAdminOrEvaluator = userData.role?.name?.toLowerCase() === 'admin' ||
      userData.role?.name?.toLowerCase() === 'evaluator';

    // Si es supplier y no tiene vendor_id, es un error
    if (!isAdminOrEvaluator && !userData.vendor_id) {
      console.log('[getRecommendationsForSupplier] Usuario supplier sin vendor_id asignado');
      return { data: [], error: new Error('Usuario sin vendor_id asignado') };
    }

    console.log(`[getRecommendationsForSupplier] Rol del usuario: ${userData.role?.name}, Vendor ID: ${userData.vendor_id || 'N/A'}`);

    // Si es admin o evaluator, podemos mostrar todas las recomendaciones o filtrar de otra manera
    // Por ahora, para simplificar, mostraremos las del vendor específico o una lista reciente

    // Determinar qué vendor_id usar
    const targetVendorId = userData.vendor_id;

    if (!targetVendorId && !isAdminOrEvaluator) {
      return { data: [], error: null };
    }

    // Paso 1: Si es usuario supplier, obtener las respuestas de este vendor
    let responseIds: string[] = [];

    if (targetVendorId) {
      const { data: responses, error: respError } = await client
        .from('responses')
        .select('id')
        .eq('vendor_id', targetVendorId);

      if (respError) {
        console.error('[getRecommendationsForSupplier] Error al obtener respuestas:', respError);
        return { data: null, error: respError };
      }

      if (!responses || responses.length === 0) {
        console.log('[getRecommendationsForSupplier] No se encontraron respuestas para este vendor');
        return { data: [], error: null };
      }

      console.log(`[getRecommendationsForSupplier] Encontradas ${responses.length} respuestas`);
      responseIds = responses.map(r => r.id);
    } else if (isAdminOrEvaluator) {
      // Si es admin/evaluator sin vendor específico, obtener las más recientes
      const { data: recentResponses, error: recentRespError } = await client
        .from('responses')
        .select('id')
        .order('created_at', { ascending: false })
        .limit(50); // Limitar para no sobrecargar

      if (!recentRespError && recentResponses && recentResponses.length > 0) {
        responseIds = recentResponses.map(r => r.id);
        console.log(`[getRecommendationsForSupplier] Admin/Evaluator: usando ${responseIds.length} respuestas recientes`);
      }
    }

    if (responseIds.length === 0) {
      console.log('[getRecommendationsForSupplier] No hay IDs de respuestas para consultar');
      return { data: [], error: null };
    }

    // Paso 2: Consultar recomendaciones vinculadas a esas respuestas
    const { data: recommendations, error: recError } = await client
      .from('recommendations')
      .select(`
        id,
        recommendation_text,
        priority,
        status,
        assigned_to,
        due_date,
        response_id,
        question_id,
        questions!recommendations_question_id_fkey(id, question_text),
        responses!recommendations_response_id_fkey(
          id, 
          evaluation_id,
          vendor_id,
          evaluations!responses_evaluation_id_fkey(title)
        )
      `)
      .in('response_id', responseIds);

    if (recError) {
      console.error('[getRecommendationsForSupplier] Error al obtener recomendaciones:', recError);
      return { data: null, error: recError };
    }

    console.log(`[getRecommendationsForSupplier] Encontradas ${recommendations?.length || 0} recomendaciones existentes`);

    // Si no hay recomendaciones, verificar si hay respuestas con "No" o "N/A" 
    // que deberían tener recomendaciones y crearlas automáticamente
    if (!recommendations || recommendations.length === 0) {
      console.log('[getRecommendationsForSupplier] No se encontraron recomendaciones, buscando respuestas negativas');

      // Obtener respuestas con No o N/A
      const { data: negativeResponses, error: negRespError } = await client
        .from('responses')
        .select(`
          id,
          question_id,
          answer,
          evaluation_id
        `)
        .in('id', responseIds)
        .in('answer', ['No', 'N/A']);

      if (!negRespError && negativeResponses && negativeResponses.length > 0) {
        console.log(`[getRecommendationsForSupplier] Encontradas ${negativeResponses.length} respuestas negativas`);

        let createdRecommendations = [];
        // Crear recomendaciones para estas respuestas
        for (const response of negativeResponses) {
          try {
            const { recommendationText, error: recTextError } = await getRecommendationTextFromQuestion(
              client,
              response.question_id
            );

            if (!recTextError && recommendationText) {
              console.log(`[getRecommendationsForSupplier] Creando recomendación para respuesta ${response.id} (pregunta ${response.question_id})`);
              const { success, recommendationId } = await createRecommendationForResponse(
                client,
                response.id,
                response.question_id,
                response.answer as 'No' | 'N/A',
                recommendationText
              );

              if (success && recommendationId) {
                createdRecommendations.push(recommendationId);
              }
            } else {
              console.log(`[getRecommendationsForSupplier] No hay texto de recomendación para pregunta ${response.question_id}`);
            }
          } catch (recCreateError) {
            console.error(`[getRecommendationsForSupplier] Error al crear recomendación:`, recCreateError);
            // Continuar con el siguiente
          }
        }

        // Si se crearon recomendaciones, obtenerlas
        if (createdRecommendations.length > 0) {
          console.log(`[getRecommendationsForSupplier] Se crearon ${createdRecommendations.length} recomendaciones, consultando`);

          const { data: newRecommendations, error: newRecError } = await client
            .from('recommendations')
            .select(`
              id,
              recommendation_text,
              priority,
              status,
              assigned_to,
              due_date,
              response_id,
              question_id,
              questions!recommendations_question_id_fkey(id, question_text),
              responses!recommendations_response_id_fkey(
                id, 
                evaluation_id,
                vendor_id,
                evaluations!responses_evaluation_id_fkey(title)
              )
            `)
            .in('id', createdRecommendations);

          if (!newRecError && newRecommendations) {
            console.log(`[getRecommendationsForSupplier] Obtenidas ${newRecommendations.length} recomendaciones recién creadas`);
            return { data: newRecommendations, error: null };
          } else if (newRecError) {
            console.error('[getRecommendationsForSupplier] Error al obtener recomendaciones recién creadas:', newRecError);
          }
        }
      }
    }

    return { data: recommendations || [], error: null };
  } catch (error) {
    console.error('[getRecommendationsForSupplier] Error inesperado:', error);
    return {
      data: null,
      error: error instanceof Error ? error : new Error('Error desconocido')
    };
  }
} 