import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { createClient } from '@supabase/supabase-js';
import { Database } from "@/lib/database.types";

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

    console.log("[DEBUG] Evaluación verificada, ID de asignación:", evaluationData.id);

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
    console.log("[DEBUG] Iniciando procesamiento de respuesta a evaluación");
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
      .select("id")
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

    console.log("[DEBUG] Evaluación verificada, ID de asignación:", evaluationData.id);

    // Obtener los datos del cuerpo de la solicitud
    const { responses, status, progress } = await request.json();
    console.log("[DEBUG] Datos recibidos:", {
      responsesCount: responses?.length || 0,
      status,
      progress
    });

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
      .select("id, question_id")
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
        existingResponseMap.set(response.question_id, response.id);
      });
    }

    console.log(`[DEBUG] Se encontraron ${existingResponseMap.size} respuestas existentes`);

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

      // Preparar datos validados
      const validatedData: {
        evaluation_id: string;
        question_id: string;
        response_value: string;
        notes: string | null;
        evidence_urls: string[] | null;
        vendor_id: string;
        score: number;
        answer?: 'Yes' | 'No' | 'N/A';
      } = {
        evaluation_id: evaluationId,
        question_id,
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
        const responseId = existingResponseMap.get(question_id);
        updateResponses.push({
          id: responseId,
          ...validatedData,
          updated_at: new Date().toISOString()
        });
        console.log(`[DEBUG] Actualizando respuesta existente con ID: ${responseId}`);
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

    // Actualizar el estado y progreso de la evaluación usando el cliente admin
    if (status) {
      // Convertir el estado a un valor válido según la restricción valid_evaluation_status
      let validStatus = status;
      if (status === 'pending_review') {
        validStatus = 'completed'; // Usar 'completed' en lugar de 'pending_review'
      }

      console.log("[DEBUG] Actualizando estado de evaluación a:", validStatus);
      const { error: updateEvalError } = await supabaseAdmin
        .from("evaluations")
        .update({
          status: validStatus,
          progress,
          updated_at: new Date().toISOString(),
        })
        .eq("id", evaluationId);

      if (updateEvalError) {
        console.error("[DEBUG] Error al actualizar evaluación:", updateEvalError);
        // No devolver error para que al menos las respuestas se guarden
        console.error("Continuando a pesar del error de actualización de estado de evaluación");
      }

      // También actualizar el estado en evaluation_vendors
      const newVendorStatus = status === "completed" ? "completed" : "in_progress";
      const completedAt = status === "completed" ? new Date().toISOString() : null;

      console.log("[DEBUG] Actualizando estado de asignación a:", newVendorStatus);
      const { error: updateVendorError } = await supabaseAdmin
        .from("evaluation_vendors")
        .update({
          status: newVendorStatus,
          completed_at: completedAt,
        })
        .eq("evaluation_id", evaluationId)
        .eq("vendor_id", userData.vendor_id);

      if (updateVendorError) {
        console.error("[DEBUG] Error al actualizar estado en evaluation_vendors:", updateVendorError);
        // No devolver error para que al menos las respuestas se guarden
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