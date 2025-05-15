import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { createClient } from '@supabase/supabase-js';
import { Database } from "@/lib/database.types";
import { getRecommendationTextFromQuestion } from "@/lib/services/recommendation-service";
import { v4 as uuidv4 } from 'uuid';

// Crear un cliente de Supabase con la clave de servicio para operaciones administrativas
const supabaseAdmin = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

interface ResponseData {
  question_id: string;
  response_value: string;
  notes?: string | null;
  evidence_urls?: string[] | null;
}

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    console.log("[DEBUG] Iniciando obtención de respuestas para evaluación");
    const evaluationId = params.id;
    console.log("[DEBUG] ID de evaluación:", evaluationId);

    const supabase = createServerClient();

    // Verificar autenticación
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      console.log("[DEBUG] Error de autenticación:", authError);
      return NextResponse.json(
        { error: "No autorizado" },
        { status: 401 }
      );
    }

    console.log("[DEBUG] Usuario autenticado:", user.id);

    // Obtener el rol y vendor_id del usuario
    const { data: userData, error: userError } = await supabase
      .from("users")
      .select("role_id, vendor_id")
      .eq("id", user.id)
      .single();

    if (userError || !userData) {
      console.log("[DEBUG] Error al obtener datos del usuario:", userError);
      return NextResponse.json(
        { error: "Error al obtener datos del usuario" },
        { status: 500 }
      );
    }

    console.log("[DEBUG] Datos del usuario:", {
      role_id: userData.role_id,
      vendor_id: userData.vendor_id,
      user_id: user.id
    });

    if (!userData.role_id) {
      return NextResponse.json(
        { error: "Usuario sin rol asignado" },
        { status: 400 }
      );
    }

    if (!userData.vendor_id) {
      return NextResponse.json(
        { error: "Usuario no asociado a un proveedor" },
        { status: 400 }
      );
    }

    // Obtener el nombre del rol
    const { data: roleData, error: roleError } = await supabase
      .from("roles")
      .select("name")
      .eq("id", userData.role_id)
      .single();

    if (roleError || !roleData) {
      console.log("[DEBUG] Error al obtener rol:", roleError);
      return NextResponse.json(
        { error: "Error al obtener el rol del usuario" },
        { status: 500 }
      );
    }

    console.log("[DEBUG] Rol del usuario:", roleData.name);

    // Verificar que la evaluación exista y esté asignada al vendor del usuario
    console.log("[DEBUG] Verificando asignación de evaluación al proveedor:", {
      evaluation_id: evaluationId,
      vendor_id: userData.vendor_id
    });

    const { data: evaluationData, error: evaluationError } = await supabase
      .from("evaluation_vendors")
      .select("id, status")
      .eq("evaluation_id", evaluationId)
      .eq("vendor_id", userData.vendor_id)
      .single();

    if (evaluationError) {
      console.log("[DEBUG] Error al verificar asignación de evaluación:", evaluationError);
      console.log("[DEBUG] Detalles del error:", JSON.stringify(evaluationError));
    }

    if (!evaluationData) {
      console.log("[DEBUG] Evaluación no encontrada o no asignada a este proveedor");
      return NextResponse.json(
        { error: "Evaluación no encontrada o no asignada a este proveedor" },
        { status: 404 }
      );
    }

    const evaluationVendorId = evaluationData.id;
    console.log("[DEBUG] Evaluación verificada, ID de asignación:", evaluationVendorId);

    // Obtener las respuestas existentes para esta evaluación y proveedor
    // Uso del cliente admin para asegurar obtener todas las respuestas sin restricciones de RLS
    const { data: existingResponses, error: responsesError } = await supabaseAdmin
      .from("responses")
      .select(`
        id,
        question_id,
        response_value,
        notes,
        evidence_urls,
        score,
        reviewed_by,
        review_date,
        created_at,
        updated_at
      `)
      .eq("evaluation_id", evaluationId)
      .eq("vendor_id", userData.vendor_id);

    if (responsesError) {
      console.log("[DEBUG] Error al obtener respuestas:", responsesError);
      return NextResponse.json(
        { error: "Error al obtener respuestas existentes" },
        { status: 500 }
      );
    }

    console.log("[DEBUG] Respuestas obtenidas:", existingResponses?.length || 0);
    if (existingResponses && existingResponses.length > 0) {
      console.log("[DEBUG] Muestra de respuestas:", existingResponses.slice(0, 2));
    } else {
      console.log("[DEBUG] No se encontraron respuestas para esta evaluación y proveedor");
    }

    // Obtener el progreso actual de la evaluación
    const { data: evaluationInfo, error: evaluationInfoError } = await supabase
      .from("evaluations")
      .select("progress, status")
      .eq("id", evaluationId)
      .single();

    if (evaluationInfoError) {
      console.log("[DEBUG] Error al obtener información de la evaluación:", evaluationInfoError);
    }

    // Format the responses for the client
    const formattedResponses = existingResponses?.map(response => ({
      id: response.id,
      question_id: response.question_id,
      response_value: response.response_value,
      notes: response.notes,
      evidence_urls: response.evidence_urls,
      score: response.score,
      reviewed_by: response.reviewed_by,
      review_date: response.review_date,
      created_at: response.created_at,
      updated_at: response.updated_at
    })) || [];

    return NextResponse.json({
      data: {
        responses: formattedResponses,
        status: evaluationData.status || 'pending',
        evaluation_status: evaluationInfo?.status || 'draft',
        progress: evaluationInfo?.progress || 0
      }
    });
  } catch (error) {
    console.error("[DEBUG] Error al procesar la solicitud:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    console.error("==== INICIO DE PROCESAMIENTO DE RESPUESTA ====");
    console.error(`Evaluación ID: ${params.id}`);

    const evaluationId = params.id;
    console.log("[DEBUG] ID de evaluación:", evaluationId);

    const supabase = createServerClient();

    // Verificar autenticación
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      console.log("[DEBUG] Error de autenticación:", authError);
      return NextResponse.json(
        { error: "No autorizado" },
        { status: 401 }
      );
    }

    console.log("[DEBUG] Usuario autenticado:", user.id);

    // Obtener el rol y vendor_id del usuario
    const { data: userData, error: userError } = await supabase
      .from("users")
      .select("role_id, vendor_id")
      .eq("id", user.id)
      .single();

    if (userError || !userData) {
      console.log("[DEBUG] Error al obtener datos del usuario:", userError);
      return NextResponse.json(
        { error: "Error al obtener datos del usuario" },
        { status: 500 }
      );
    }

    console.log("[DEBUG] Datos del usuario:", {
      role_id: userData.role_id,
      vendor_id: userData.vendor_id,
      user_id: user.id
    });

    if (!userData.role_id) {
      return NextResponse.json(
        { error: "Usuario sin rol asignado" },
        { status: 400 }
      );
    }

    if (!userData.vendor_id) {
      return NextResponse.json(
        { error: "Usuario no asociado a un proveedor" },
        { status: 400 }
      );
    }

    // Obtener el nombre del rol
    const { data: roleData, error: roleError } = await supabase
      .from("roles")
      .select("name")
      .eq("id", userData.role_id)
      .single();

    if (roleError || !roleData) {
      console.log("[DEBUG] Error al obtener rol:", roleError);
      return NextResponse.json(
        { error: "Error al obtener el rol del usuario" },
        { status: 500 }
      );
    }

    console.log("[DEBUG] Rol del usuario:", roleData.name);

    // Verificar que el usuario sea un supplier
    if (roleData.name !== "supplier") {
      return NextResponse.json(
        { error: "Solo los proveedores pueden responder evaluaciones" },
        { status: 403 }
      );
    }

    // Verificar que la evaluación exista y esté asignada al vendor del usuario
    console.log("[DEBUG] Verificando asignación de evaluación al proveedor:", {
      evaluation_id: evaluationId,
      vendor_id: userData.vendor_id
    });

    const { data: evaluationData, error: evaluationError } = await supabase
      .from("evaluation_vendors")
      .select("id, status")
      .eq("evaluation_id", evaluationId)
      .eq("vendor_id", userData.vendor_id)
      .single();

    if (evaluationError) {
      console.log("[DEBUG] Error al verificar asignación de evaluación:", evaluationError);
      console.log("[DEBUG] Detalles del error:", JSON.stringify(evaluationError));
    }

    if (!evaluationData) {
      console.log("[DEBUG] Evaluación no encontrada o no asignada a este proveedor");
      return NextResponse.json(
        { error: "Evaluación no encontrada o no asignada a este proveedor" },
        { status: 404 }
      );
    }

    const evaluationVendorId = evaluationData.id;
    console.log("[DEBUG] Evaluación verificada, ID de asignación:", evaluationVendorId);

    // Obtener los datos del cuerpo de la solicitud
    const { responses, status, progress } = await request.json();
    console.error("DATOS RECIBIDOS:");
    console.error(`- Status: ${status}`);
    console.error(`- Progress: ${progress}`);
    console.error(`- Responses: ${responses?.length || 0} respuestas`);

    console.log("[DEBUG] Datos recibidos:", {
      responsesCount: responses?.length || 0,
      status,
      progress
    });

    // Verificar si se está enviando como completada
    const isCompletingEvaluation = status === "completed";
    if (isCompletingEvaluation) {
      console.log("[DEBUG] Se está enviando la evaluación como completada");
    }

    // Validar los datos
    if (!responses || !Array.isArray(responses)) {
      return NextResponse.json(
        { error: "Formato de respuestas inválido" },
        { status: 400 }
      );
    }

    // Verificar si la evaluación tiene preguntas asociadas
    const { data: evalQuestions, error: evalQuestionsError } = await supabase
      .from("evaluation_questions")
      .select("question_id")
      .eq("evaluation_id", evaluationId);

    if (evalQuestionsError) {
      console.log("[DEBUG] Error al obtener preguntas de la evaluación:", evalQuestionsError);
      return NextResponse.json(
        { error: "Error al obtener las preguntas de la evaluación" },
        { status: 500 }
      );
    }

    const validQuestionIds = new Set(evalQuestions.map(q => q.question_id));

    // Filtrar respuestas para asegurar que solo procesamos preguntas válidas
    const validResponses = responses.filter(response => {
      const isValid = validQuestionIds.has(response.question_id);

      if (!isValid) {
        console.log(`[DEBUG] Ignorando respuesta para pregunta no asociada: ${response.question_id}`);
      }

      return isValid;
    });

    if (validResponses.length === 0) {
      console.log("[DEBUG] No hay respuestas válidas para procesar");
      return NextResponse.json(
        { error: "No se encontraron respuestas válidas para guardar" },
        { status: 400 }
      );
    }

    console.log(`[DEBUG] Procesando ${validResponses.length} respuestas válidas...`);

    // Obtener las respuestas existentes para esta evaluación y proveedor
    const { data: existingResponses, error: findError } = await supabaseAdmin
      .from("responses")
      .select("id, question_id, evaluation_question_id, evaluation_vendor_id")
      .eq("evaluation_id", evaluationId)
      .eq("vendor_id", userData.vendor_id);

    if (findError) {
      console.log("[DEBUG] Error al buscar respuestas existentes:", findError);
      return NextResponse.json(
        { error: "Error al verificar respuestas existentes" },
        { status: 500 }
      );
    }

    // Mapear respuestas existentes por question_id para acceso rápido
    const existingResponseMap = new Map();
    if (existingResponses) {
      existingResponses.forEach(response => {
        existingResponseMap.set(response.question_id, {
          id: response.id,
          evaluation_question_id: response.evaluation_question_id,
          evaluation_vendor_id: response.evaluation_vendor_id
        });
      });
    }

    console.log(`[DEBUG] Se encontraron ${existingResponseMap.size} respuestas existentes`);

    // Obtener los evaluation_question_id para cada question_id
    const { data: evaluationQuestions, error: evalQuestionsMapError } = await supabase
      .from("evaluation_questions")
      .select("id, question_id")
      .eq("evaluation_id", evaluationId)
      .in("question_id", validResponses.map(r => r.question_id));

    if (evalQuestionsMapError) {
      console.log("[DEBUG] Error al obtener mapeo de evaluation_questions:", evalQuestionsMapError);
      return NextResponse.json(
        { error: "Error al obtener mapeo de preguntas de la evaluación" },
        { status: 500 }
      );
    }

    // Crear un mapa de question_id a evaluation_question_id
    const questionToEvalQuestionMap = new Map();
    if (evaluationQuestions) {
      evaluationQuestions.forEach(eq => {
        questionToEvalQuestionMap.set(eq.question_id, eq.id);
      });
    }

    // Respuestas para actualizar y respuestas para insertar
    const updateResponses = [];
    const insertResponses = [];

    // Separar las respuestas en actualizaciones e inserciones
    for (const response of validResponses) {
      const { question_id, response_value, notes, evidence_urls } = response;

      if (!question_id || !response_value) {
        console.log("[DEBUG] Respuesta incompleta, saltando:", question_id);
        continue; // Saltar respuestas incompletas
      }

      console.log(`[DEBUG] Procesando respuesta para pregunta ${question_id}: "${response_value}"`);

      // Obtener el evaluation_question_id correspondiente
      const evaluation_question_id = questionToEvalQuestionMap.get(question_id);

      if (!evaluation_question_id) {
        console.log(`[DEBUG] No se encontró evaluation_question_id para question_id ${question_id}, saltando`);
        continue;
      }

      // Preparar datos validados
      const validatedData: {
        evaluation_id: string;
        evaluation_vendor_id: string;
        question_id: string;
        evaluation_question_id: string;
        response_value: string;
        notes: string | null;
        evidence_urls: string[] | null;
        vendor_id: string;
        score: number;
        answer?: 'Yes' | 'No' | 'N/A';
      } = {
        evaluation_id: evaluationId,
        evaluation_vendor_id: evaluationVendorId,
        question_id,
        evaluation_question_id,
        response_value,
        notes: notes || null,
        evidence_urls: evidence_urls || null,
        vendor_id: userData.vendor_id,
        score: 0, // Campo obligatorio según el esquema
      };

      // Manejar el campo answer si es de tipo si/no/no aplica
      if (response_value === 'Yes' || response_value === 'No' || response_value === 'N/A') {
        validatedData.answer = response_value as 'Yes' | 'No' | 'N/A';
        console.log(`[DEBUG] Asignando valor de answer: ${validatedData.answer}`);
      }

      // Verificar si ya existe una respuesta para esta pregunta
      if (existingResponseMap.has(question_id)) {
        // Si ya existe una respuesta para esta pregunta, actualizar el registro existente
        const responseData = existingResponseMap.get(question_id);
        updateResponses.push({
          id: responseData.id,
          ...validatedData,
          updated_at: new Date().toISOString()
        });
        console.log(`[DEBUG] Actualizando respuesta existente con ID: ${responseData.id}`);
      } else {
        // Si no existe una respuesta previa para esta pregunta, crear un nuevo registro
        insertResponses.push(validatedData);
        console.log(`[DEBUG] Creando nueva respuesta para pregunta: ${question_id}`);
      }
    }

    console.log(`[DEBUG] Respuestas a actualizar: ${updateResponses.length}, a insertar: ${insertResponses.length}`);

    // Procesar actualizaciones e inserciones en lotes para mejor rendimiento
    let updateErrors = [];
    let insertErrors = [];

    // Procesar actualizaciones en grupos de 10
    if (updateResponses.length > 0) {
      for (let i = 0; i < updateResponses.length; i += 10) {
        const batch = updateResponses.slice(i, i + 10);

        try {
          const { error } = await supabaseAdmin
            .from("responses")
            .upsert(batch, {
              onConflict: 'id',
              ignoreDuplicates: false
            });

          if (error) {
            console.error(`[DEBUG] Error al actualizar lote ${i}-${i + batch.length}:`, error);
            updateErrors.push(error);
          }
        } catch (error) {
          console.error(`[DEBUG] Excepción al actualizar lote ${i}-${i + batch.length}:`, error);
          updateErrors.push(error);
        }
      }
    }

    // Procesar inserciones en grupos de 10
    if (insertResponses.length > 0) {
      for (let i = 0; i < insertResponses.length; i += 10) {
        const batch = insertResponses.slice(i, i + 10);

        try {
          const { error } = await supabaseAdmin
            .from("responses")
            .insert(batch);

          if (error) {
            console.error(`[DEBUG] Error al insertar lote ${i}-${i + batch.length}:`, error);
            insertErrors.push(error);
          }
        } catch (error) {
          console.error(`[DEBUG] Excepción al insertar lote ${i}-${i + batch.length}:`, error);
          insertErrors.push(error);
        }
      }
    }

    if (updateErrors.length > 0 || insertErrors.length > 0) {
      console.error(`[DEBUG] Se encontraron errores: ${updateErrors.length} actualizaciones, ${insertErrors.length} inserciones`);

      // Registrar errores pero continuar con la actualización de estado
      console.error("[DEBUG] Errores de actualización:", updateErrors);
      console.error("[DEBUG] Errores de inserción:", insertErrors);
    }

    // Después de guardar todas las respuestas y antes de actualizar el estado de la evaluación

    // Crear recomendaciones para las respuestas "No" o "N/A"
    if (status === 'completed') {
      console.log("[DEBUG] Evaluación completada, creando recomendaciones para respuestas No/N/A");

      // Obtener todas las respuestas 'No' o 'N/A' para esta evaluación del proveedor
      const { data: noResponses, error: noRespError } = await supabaseAdmin
        .from("responses")
        .select(`
          id, 
          question_id,
          evaluation_question_id,
          evaluation_vendor_id,
          answer
        `)
        .eq("evaluation_id", evaluationId)
        .eq("vendor_id", userData.vendor_id)
        .in("answer", ["No", "N/A"]);

      if (noRespError) {
        console.error("[DEBUG] Error al obtener respuestas No/N/A:", noRespError);
      } else if (noResponses && noResponses.length > 0) {
        console.log(`[DEBUG] Se encontraron ${noResponses.length} respuestas No/N/A`);

        // Obtener el profile_id del usuario actual
        const { data: userProfile, error: profileError } = await supabaseAdmin
          .from("users")
          .select("profile_id")
          .eq("id", user.id)
          .single();

        if (profileError) {
          console.error("[DEBUG] Error al obtener profile_id del usuario:", profileError);
        } else if (!userProfile || !userProfile.profile_id) {
          console.error("[DEBUG] El usuario no tiene profile_id asignado");
        } else {
          const profileId = userProfile.profile_id;
          console.log(`[DEBUG] Profile ID del usuario: ${profileId}`);

          // Para cada respuesta, verificar si hay una recomendación en la tabla de preguntas
          for (const response of noResponses) {
            // Obtener el texto de recomendación para esta pregunta
            const { recommendationText, error: recTextError } = await getRecommendationTextFromQuestion(
              supabaseAdmin,
              response.question_id
            );

            if (recTextError) {
              console.error(`[DEBUG] Error al obtener recomendación para pregunta ${response.question_id}:`, recTextError);
              continue;
            }

            // Si no tiene recommendationText, no crear recomendación
            if (!recommendationText) {
              console.log(`[DEBUG] La pregunta ${response.question_id} no tiene recomendación configurada`);
              continue;
            }

            console.log(`[DEBUG] Creando recomendación para respuesta ${response.id}`);

            // Verificar si ya existe una recomendación para esta respuesta
            const { data: existingRec, error: existingError } = await supabaseAdmin
              .from("recommendations")
              .select("id")
              .eq("response_id", response.id)
              .single();

            if (existingError && !existingError.message.includes("No rows found")) {
              console.error("[DEBUG] Error al verificar recomendación existente:", existingError);
              continue;
            }

            if (existingRec) {
              console.log(`[DEBUG] Actualizando recomendación existente: ${existingRec.id}`);

              // Actualizar la recomendación existente
              const { error: updateError } = await supabaseAdmin
                .from("recommendations")
                .update({
                  recommendation_text: recommendationText,
                  updated_at: new Date().toISOString()
                })
                .eq("id", existingRec.id);

              if (updateError) {
                console.error("[DEBUG] Error al actualizar recomendación:", updateError);
              }
            } else {
              // Crear nueva recomendación
              const newRecommendation = {
                id: uuidv4(), // Generar un nuevo UUID
                question_id: response.question_id,
                evaluation_question_id: response.evaluation_question_id,
                evaluation_vendor_id: response.evaluation_vendor_id,
                response_id: response.id,
                recommendation_text: recommendationText,
                status: "pending" as const,
                assigned_to: profileId, // Usar el profile_id del usuario
                priority: response.answer === "No" ? 1 : 2, // Prioridad alta para No, media para N/A
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
              };

              const { data: insertedRec, error: insertRecError } = await supabaseAdmin
                .from("recommendations")
                .insert(newRecommendation)
                .select()
                .single();

              if (insertRecError) {
                console.error("[DEBUG] Error al crear recomendación:", insertRecError);
              } else if (insertedRec) {
                console.log(`[DEBUG] Recomendación creada: ${insertedRec.id}`);
              }
            }
          }
        }
      } else {
        console.log("[DEBUG] No se encontraron respuestas No/N/A para esta evaluación");
      }
    }

    // Actualizar el estado y progreso de la evaluación usando el cliente admin
    if (status) {
      // IMPORTANTE: Actualizar el estado en evaluation_vendors
      // Esta es la tabla principal que determina el estado de la evaluación para un proveedor específico
      if (status) {
        try {
          console.error("ACTUALIZANDO EVALUATION_VENDORS - INICIO");

          // Verificar la estructura de la tabla primero
          console.error("VERIFICANDO ESTRUCTURA DE LA TABLA EVALUATION_VENDORS");
          const { data: tableInfo, error: tableError } = await supabaseAdmin
            .from("evaluation_vendors")
            .select("*")
            .limit(1);

          if (tableError) {
            console.error("ERROR AL VERIFICAR ESTRUCTURA:", tableError.message);
          } else if (tableInfo && tableInfo.length > 0) {
            const columns = Object.keys(tableInfo[0]);
            console.error("COLUMNAS DISPONIBLES:", columns.join(", "));
          }

          if (status === "completed") {
            // Crear timestamp actual
            const now = new Date().toISOString();
            console.error(`ACTUALIZANDO A ESTADO COMPLETADO - Timestamp: ${now}`);

            // Primero intentar actualizar solo el estado
            console.error("PRIMER INTENTO: ACTUALIZAR SOLO EL ESTADO");
            const { data: stateUpdate, error: stateError } = await supabaseAdmin
              .from("evaluation_vendors")
              .update({ status: "completed" })
              .eq("evaluation_id", evaluationId)
              .eq("vendor_id", userData.vendor_id)
              .select();

            if (stateError) {
              console.error("ERROR AL ACTUALIZAR ESTADO:", stateError.message);
            } else {
              console.error("ACTUALIZACIÓN DE ESTADO EXITOSA:", stateUpdate);
            }

            // Luego intentar actualizar solo completed_at
            console.error("SEGUNDO INTENTO: ACTUALIZAR SOLO COMPLETED_AT");
            const { data: dateUpdate, error: dateError } = await supabaseAdmin
              .from("evaluation_vendors")
              .update({ completed_at: now })
              .eq("evaluation_id", evaluationId)
              .eq("vendor_id", userData.vendor_id)
              .select();

            if (dateError) {
              console.error("ERROR AL ACTUALIZAR COMPLETED_AT:", dateError.message);
            } else {
              console.error("ACTUALIZACIÓN DE COMPLETED_AT EXITOSA:", dateUpdate);
            }

            // Actualización directa
            console.error("TERCER INTENTO: ACTUALIZACIÓN COMBINADA");
            const { data: directUpdate, error: directError } = await supabaseAdmin
              .from("evaluation_vendors")
              .update({
                status: "completed",
                completed_at: now
              })
              .eq("evaluation_id", evaluationId)
              .eq("vendor_id", userData.vendor_id);

            if (directError) {
              console.error("ERROR EN ACTUALIZACIÓN DIRECTA:", directError.message);

              // Plan B: Intentar una segunda vez con un pequeño retraso
              await new Promise(resolve => setTimeout(resolve, 100));
              console.error("EJECUTANDO PLAN B - SEGUNDO INTENTO");

              const { error: retryError } = await supabaseAdmin
                .from("evaluation_vendors")
                .update({
                  status: "completed",
                  completed_at: now
                })
                .eq("evaluation_id", evaluationId)
                .eq("vendor_id", userData.vendor_id);

              if (retryError) {
                console.error("ERROR EN SEGUNDO INTENTO:", retryError.message);
              } else {
                console.error("SEGUNDO INTENTO EXITOSO");
              }
            } else {
              console.error("ACTUALIZACIÓN DIRECTA EXITOSA");
            }
          } else {
            // Para estados que no son "completed"
            console.error(`ACTUALIZANDO A ESTADO: ${status}`);
            const { error } = await supabaseAdmin
              .from("evaluation_vendors")
              .update({
                status: "in_progress"
              })
              .eq("evaluation_id", evaluationId)
              .eq("vendor_id", userData.vendor_id);

            if (error) {
              console.error("ERROR EN ACTUALIZACIÓN:", error.message);
            } else {
              console.error("ACTUALIZACIÓN EXITOSA");
            }
          }

          // Verificar la actualización
          const { data: verifyData, error: verifyError } = await supabaseAdmin
            .from("evaluation_vendors")
            .select("id, status, completed_at")
            .eq("evaluation_id", evaluationId)
            .eq("vendor_id", userData.vendor_id)
            .single();

          if (verifyError) {
            console.error("ERROR EN VERIFICACIÓN:", verifyError.message);
          } else {
            console.error("VERIFICACIÓN EXITOSA:");
            console.error(`- ID: ${verifyData?.id}`);
            console.error(`- Status: ${verifyData?.status}`);
            console.error(`- Completed At: ${verifyData?.completed_at}`);

            // Verificar si el estado está correcto
            if (status === "completed" && verifyData?.status !== "completed") {
              console.error("¡ALERTA! El estado no se actualizó correctamente.");

              // Último intento con SQL directo
              try {
                console.error("EJECUTANDO ACTUALIZACIÓN FINAL DIRECTA");
                const { data: rawResult, error: rawError } = await supabaseAdmin
                  .from("evaluation_vendors")
                  .update({ status: "completed" })
                  .eq("id", verifyData?.id)
                  .select();

                if (rawError) {
                  console.error("ERROR EN ACTUALIZACIÓN FINAL:", rawError.message);
                } else {
                  console.error("ACTUALIZACIÓN FINAL EXITOSA:", rawResult);
                }
              } catch (finalError) {
                console.error("ERROR EN ACTUALIZACIÓN FINAL:", finalError);
              }
            }

            // Verificar si completed_at está vacío cuando debería estar establecido
            if (status === "completed" && !verifyData?.completed_at) {
              console.error("¡ALERTA! El campo completed_at no se actualizó correctamente.");

              try {
                console.error("INTENTANDO ACTUALIZACIÓN ALTERNATIVA");

                // Obtener todos los campos disponibles para diagnosticar
                const { data: sampleData } = await supabaseAdmin
                  .from("evaluation_vendors")
                  .select("*")
                  .eq("id", verifyData?.id)
                  .single();

                console.error("CAMPOS DISPONIBLES:", Object.keys(sampleData || {}).join(", "));

                // Intentar actualizar solo el estado como último recurso
                const { error: finalError } = await supabaseAdmin
                  .from("evaluation_vendors")
                  .update({ status: "completed" })
                  .eq("id", verifyData?.id);

                if (finalError) {
                  console.error("ERROR EN ACTUALIZACIÓN FINAL:", finalError.message);
                } else {
                  console.error("ACTUALIZACIÓN DE ESTADO EXITOSA COMO ÚLTIMO RECURSO");
                }
              } catch (alternativeError) {
                console.error("ERROR EN ENFOQUE ALTERNATIVO:", alternativeError);
              }
            }
          }

          console.error("ACTUALIZANDO EVALUATION_VENDORS - FIN");
        } catch (error) {
          console.error("ERROR CRÍTICO AL ACTUALIZAR EVALUATION_VENDORS:", error);
        }

        // También actualizar el estado y progreso en la tabla evaluations
        console.error("ACTUALIZANDO TABLA EVALUATIONS");
        const { error: updateEvalError } = await supabaseAdmin
          .from("evaluations")
          .update({
            status: status === 'pending_review' ? 'completed' : status,
            progress,
            updated_at: new Date().toISOString(),
          })
          .eq("id", evaluationId);

        if (updateEvalError) {
          console.error("ERROR AL ACTUALIZAR EVALUATIONS:", updateEvalError.message);
        } else {
          console.error("ACTUALIZACIÓN DE EVALUATIONS EXITOSA");
        }
      }
    }

    // Si hay errores pero se han procesado algunas respuestas, devolver éxito parcial
    if ((updateErrors.length > 0 || insertErrors.length > 0) &&
      (updateResponses.length > updateErrors.length || insertResponses.length > insertErrors.length)) {
      console.log("[DEBUG] Proceso completado con errores parciales");
      return NextResponse.json({
        success: true,
        partial: true,
        message: "Algunas respuestas se guardaron correctamente, pero otras fallaron",
        saved: (updateResponses.length - updateErrors.length) + (insertResponses.length - insertErrors.length),
        failed: updateErrors.length + insertErrors.length
      });
    }

    // Si todos los errores, devolver un error general
    if (updateErrors.length === updateResponses.length && insertErrors.length === insertResponses.length &&
      (updateResponses.length > 0 || insertResponses.length > 0)) {
      console.error("[DEBUG] Todas las operaciones fallaron");
      return NextResponse.json(
        { error: "No se pudo guardar ninguna respuesta" },
        { status: 500 }
      );
    }

    console.log("[DEBUG] Proceso completado correctamente");
    console.error("==== FIN DE PROCESAMIENTO DE RESPUESTA ====");
    console.error(`Evaluación ${evaluationId} procesada con éxito`);
    console.error(`Status final: ${status}`);
    return NextResponse.json({
      success: true,
      message: "Respuestas guardadas correctamente",
      saved: updateResponses.length + insertResponses.length
    });
  } catch (error) {
    console.error("[DEBUG] Error al procesar la solicitud:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
} 