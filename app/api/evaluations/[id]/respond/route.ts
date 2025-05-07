import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import { Database } from "@/lib/database.types";

interface ResponseData {
  question_id: string;
  response_value: string;
  notes?: string | null;
  evidence_urls?: string[] | null;
}

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    console.log("[DEBUG] Iniciando procesamiento de respuesta a evaluación");
    const evaluationId = params.id;
    console.log("[DEBUG] ID de evaluación:", evaluationId);

    const cookieStore = cookies();
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

    // Iniciar una transacción para guardar las respuestas
    const { data: client } = await supabase.auth.getSession();

    // Guardar o actualizar las respuestas
    for (const response of responses) {
      const { question_id, response_value, notes, evidence_urls } = response;
      console.log("[DEBUG] Procesando respuesta para pregunta:", question_id);

      if (!question_id || !response_value) {
        console.log("[DEBUG] Respuesta incompleta, saltando");
        continue; // Saltar respuestas incompletas
      }

      // Verificar si la pregunta existe y está asociada a la evaluación
      const { data: evalQuestionData, error: evalQuestionError } = await supabase
        .from("evaluation_questions")
        .select("id")
        .eq("evaluation_id", evaluationId)
        .eq("question_id", question_id)
        .single();

      if (evalQuestionError) {
        console.log("[DEBUG] Error al verificar asociación de pregunta con evaluación:", evalQuestionError);
        return NextResponse.json(
          { error: `La pregunta ${question_id} no está asociada a esta evaluación` },
          { status: 400 }
        );
      }

      console.log("[DEBUG] Pregunta verificada y asociada a la evaluación:", evalQuestionData.id);

      // Verificar si ya existe una respuesta para esta pregunta en esta evaluación
      const { data: existingResponse, error: findError } = await supabase
        .from("responses")
        .select("id")
        .eq("evaluation_id", evaluationId)
        .eq("question_id", question_id)
        .eq("vendor_id", userData.vendor_id)
        .maybeSingle();

      if (findError) {
        console.log("[DEBUG] Error al buscar respuesta existente:", findError);
      }

      if (existingResponse) {
        // Actualizar respuesta existente
        console.log("[DEBUG] Actualizando respuesta existente:", existingResponse.id);
        const { error: updateError } = await supabase
          .from("responses")
          .update({
            response_value,
            notes,
            evidence_urls,
            updated_at: new Date().toISOString(),
          })
          .eq("id", existingResponse.id);

        if (updateError) {
          console.error("[DEBUG] Error al actualizar respuesta:", updateError);
          console.error("[DEBUG] Detalles del error:", JSON.stringify(updateError));
          return NextResponse.json(
            { error: "Error al actualizar respuesta" },
            { status: 500 }
          );
        }
      } else {
        // Crear nueva respuesta
        console.log("[DEBUG] Creando nueva respuesta");

        // Verificar el esquema de la tabla responses
        const { data: tableInfo, error: tableError } = await supabase
          .from("responses")
          .select()
          .limit(0);

        if (tableError) {
          console.error("[DEBUG] Error al verificar esquema de tabla:", tableError);
        } else {
          console.log("[DEBUG] Esquema de tabla responses:", Object.keys(tableInfo));
        }

        try {
          // Validar explícitamente los campos que se van a insertar
          const validatedInsertData: {
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
            validatedInsertData.answer = response_value as 'Yes' | 'No' | 'N/A';
          }

          console.log("[DEBUG] Datos validados a insertar:", validatedInsertData);

          // Verificar permisos RLS
          console.log("[DEBUG] Verificando permisos RLS para inserción");
          const { data: rls_check, error: rls_error } = await supabase
            .from("responses")
            .select("id")
            .limit(1);

          if (rls_error) {
            console.error("[DEBUG] Error al verificar permisos RLS:", rls_error);
          } else {
            console.log("[DEBUG] Permisos RLS verificados correctamente");
          }

          // Intentar insertar la respuesta
          console.log("[DEBUG] Intentando insertar respuesta...");
          const { data: insertedData, error: insertError } = await supabase
            .from("responses")
            .insert(validatedInsertData)
            .select();

          if (insertError) {
            console.error("[DEBUG] Error al crear respuesta:", insertError);
            console.error("[DEBUG] Detalles completos del error:", JSON.stringify(insertError));
            console.error("[DEBUG] Código:", insertError.code);
            console.error("[DEBUG] Mensaje:", insertError.message);
            console.error("[DEBUG] Detalles:", insertError.details);

            // Manejar error de restricción única
            if (insertError.code === '23505') { // Código para violación de restricción única
              return NextResponse.json(
                { error: "Ya existe una respuesta para esta pregunta" },
                { status: 409 }
              );
            }

            // Manejar error de RLS
            if (insertError.message && insertError.message.includes('violates row-level security policy')) {
              console.error("[DEBUG] Error de política RLS. Verificando detalles del usuario y la evaluación...");

              // Verificar si el usuario tiene el rol correcto
              const { data: roleCheck } = await supabase
                .from("roles")
                .select("name")
                .eq("id", userData.role_id)
                .single();

              console.log("[DEBUG] Rol del usuario:", roleCheck?.name);

              // Verificar si la evaluación está asignada al proveedor
              const { data: assignmentCheck } = await supabase
                .from("evaluation_vendors")
                .select("*")
                .eq("evaluation_id", evaluationId)
                .eq("vendor_id", userData.vendor_id);

              console.log("[DEBUG] Asignaciones encontradas:", assignmentCheck?.length || 0);
              if (assignmentCheck) {
                console.log("[DEBUG] Detalles de asignación:", assignmentCheck);
              }

              return NextResponse.json(
                {
                  error: "Error de permisos: No tienes autorización para responder a esta evaluación",
                  details: "Verifica que tu usuario esté correctamente asociado al proveedor y que la evaluación esté asignada a tu empresa."
                },
                { status: 403 }
              );
            }

            return NextResponse.json(
              { error: "Error al crear respuesta: " + insertError.message },
              { status: 500 }
            );
          }

          console.log("[DEBUG] Respuesta creada correctamente:", insertedData);
        } catch (error) {
          console.error("[DEBUG] Excepción al crear respuesta:", error);
          return NextResponse.json(
            { error: "Error inesperado al crear respuesta" },
            { status: 500 }
          );
        }
      }
    }

    // Actualizar el estado y progreso de la evaluación
    if (status) {
      console.log("[DEBUG] Actualizando estado de evaluación a:", status);
      const { error: updateEvalError } = await supabase
        .from("evaluations")
        .update({
          status,
          progress,
          updated_at: new Date().toISOString(),
        })
        .eq("id", evaluationId);

      if (updateEvalError) {
        console.error("[DEBUG] Error al actualizar evaluación:", updateEvalError);
        return NextResponse.json(
          { error: "Error al actualizar el estado de la evaluación" },
          { status: 500 }
        );
      }

      // También actualizar el estado en evaluation_vendors
      const newVendorStatus = status === "pending_review" ? "completed" : "in_progress";
      const completedAt = status === "pending_review" ? new Date().toISOString() : null;

      console.log("[DEBUG] Actualizando estado de asignación a:", newVendorStatus);
      const { error: updateVendorError } = await supabase
        .from("evaluation_vendors")
        .update({
          status: newVendorStatus,
          completed_at: completedAt,
        })
        .eq("evaluation_id", evaluationId)
        .eq("vendor_id", userData.vendor_id);

      if (updateVendorError) {
        console.error("[DEBUG] Error al actualizar estado en evaluation_vendors:", updateVendorError);
      }
    }

    console.log("[DEBUG] Proceso completado correctamente");
    return NextResponse.json({
      success: true,
      message: "Respuestas guardadas correctamente",
    });
  } catch (error) {
    console.error("[DEBUG] Error al procesar la solicitud:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
} 