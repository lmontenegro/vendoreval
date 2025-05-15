import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { createClient } from '@supabase/supabase-js';
import { Database } from "@/lib/database.types";

// Crear un cliente de Supabase con la clave de servicio para operaciones administrativas
const supabaseAdmin = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

export async function PUT(request: Request) {
  try {
    console.log("[DEBUG] Iniciando actualización de estado de recomendación");
    const cookieStore = cookies();
    const supabase = createServerClient();

    // Verificar la sesión del usuario
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();

    if (sessionError || !session) {
      console.error("[DEBUG] Error de sesión:", sessionError);
      return NextResponse.json(
        { error: 'No se encontró una sesión activa' },
        { status: 401 }
      );
    }

    console.log("[DEBUG] Usuario autenticado:", session.user.id);

    // Obtener datos del usuario, incluyendo el rol y vendor_id
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('role_id, vendor_id, role:role_id(name)')
      .eq('id', session.user.id)
      .single();

    if (userError) {
      console.error("[DEBUG] Error al obtener datos del usuario:", userError);
      return NextResponse.json(
        { error: 'Error al obtener datos del usuario' },
        { status: 500 }
      );
    }

    // Verificar si el usuario es un proveedor
    const userRole = userData?.role?.name;
    const vendorId = userData?.vendor_id;

    console.log("[DEBUG] Datos del usuario:", {
      role: userRole,
      vendor_id: vendorId
    });

    if (userRole !== 'supplier' || !vendorId) {
      return NextResponse.json(
        { error: 'Acceso no autorizado o datos de proveedor no encontrados' },
        { status: 403 }
      );
    }

    // Obtener datos de la solicitud
    const requestData = await request.json();
    console.log("[DEBUG] Datos recibidos:", requestData);

    const { recommendation_id, status } = requestData;

    if (!recommendation_id || !status) {
      return NextResponse.json(
        { error: 'Faltan datos requeridos (recommendation_id o status)' },
        { status: 400 }
      );
    }

    // Validar el estado
    const validStatuses = ['pending', 'in_progress', 'implemented', 'rejected'];
    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        { error: 'Estado no válido' },
        { status: 400 }
      );
    }

    // Primero verificar si existe la recomendación en la tabla recommendations
    const { data: existingRecommendation, error: recError } = await supabase
      .from('recommendations')
      .select('*')
      .eq('id', recommendation_id)
      .single();

    if (existingRecommendation) {
      console.log("[DEBUG] Recomendación encontrada en la tabla recommendations:", existingRecommendation.id);

      // Actualizar la recomendación existente
      const { data, error } = await supabaseAdmin
        .from('recommendations')
        .update({
          status,
          updated_at: new Date().toISOString(),
          completed_at: status === 'implemented' ? new Date().toISOString() : null
        })
        .eq('id', existingRecommendation.id)
        .select();

      if (error) {
        console.error("[DEBUG] Error al actualizar la recomendación:", error);
        return NextResponse.json(
          { error: 'Error al actualizar el estado de la recomendación' },
          { status: 500 }
        );
      }

      console.log("[DEBUG] Recomendación actualizada correctamente:", data);
      return NextResponse.json({ success: true, data });
    }

    // Si no existe en la tabla recommendations, verificar si es una respuesta
    console.log("[DEBUG] Verificando si es una respuesta:", recommendation_id);

    // Verificar si la respuesta existe y pertenece al proveedor
    const { data: response, error: responseError } = await supabase
      .from('responses')
      .select('id, vendor_id, question_id, evaluation_id')
      .eq('id', recommendation_id)
      .eq('vendor_id', vendorId)
      .single();

    if (responseError) {
      console.error("[DEBUG] Error al verificar la respuesta:", responseError);
      return NextResponse.json(
        { error: 'No se encontró la respuesta o no tienes permiso para actualizarla' },
        { status: 404 }
      );
    }

    console.log("[DEBUG] Respuesta encontrada:", response);

    // Obtener el texto de recomendación de la pregunta
    const { data: question, error: questionError } = await supabase
      .from('questions')
      .select('recommendation_text')
      .eq('id', response.question_id)
      .single();

    if (questionError || !question?.recommendation_text) {
      console.error("[DEBUG] Error al obtener la recomendación de la pregunta:", questionError);
      return NextResponse.json(
        { error: 'No se encontró una recomendación para esta pregunta' },
        { status: 404 }
      );
    }

    console.log("[DEBUG] Texto de recomendación encontrado:", question.recommendation_text);

    // Obtener el profile_id del usuario para asignar la recomendación
    const { data: userProfile, error: profileError } = await supabase
      .from("users")
      .select("profile_id")
      .eq("id", session.user.id)
      .single();

    if (profileError || !userProfile?.profile_id) {
      console.error("[DEBUG] Error al obtener profile_id del usuario:", profileError);
      return NextResponse.json(
        { error: 'Error al obtener el perfil del usuario' },
        { status: 500 }
      );
    }

    // Crear una nueva recomendación
    const { data, error } = await supabaseAdmin
      .from('recommendations')
      .insert({
        question_id: response.question_id,
        response_id: recommendation_id,
        recommendation_text: question.recommendation_text,
        status,
        priority: 3, // Prioridad media por defecto
        assigned_to: userProfile.profile_id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        completed_at: status === 'implemented' ? new Date().toISOString() : null
      })
      .select();

    if (error) {
      console.error("[DEBUG] Error al crear la recomendación:", error);
      return NextResponse.json(
        { error: 'Error al crear la recomendación' },
        { status: 500 }
      );
    }

    console.log("[DEBUG] Recomendación creada correctamente:", data);
    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error("[DEBUG] Error en el endpoint de actualización de estado:", error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
} 