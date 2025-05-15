import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { getRecommendationsForSupplier } from '@/lib/services/recommendation-service';
import { cookies } from 'next/headers';

export async function GET(request: Request) {
  try {
    console.log("[DEBUG API] Inicio de solicitud GET /api/recommendations/supplier");

    // Crear cliente de Supabase con cookies
    const cookieStore = cookies();
    const supabase = createServerClient();

    // Verificar autenticación usando getUser (más confiable en Next.js App Router)
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError) {
      console.error("[DEBUG API] Error de autenticación:", authError.message);
      return NextResponse.json(
        { error: "Error de autenticación: " + authError.message },
        { status: 401 }
      );
    }

    if (!user) {
      console.error("[DEBUG API] No hay usuario autenticado");
      return NextResponse.json(
        { error: "No has iniciado sesión o tu sesión ha expirado" },
        { status: 401 }
      );
    }

    console.log(`[DEBUG API] Usuario autenticado: ${user.id}`);

    // Obtener el rol del usuario con información detallada
    const { data: userData, error: userError } = await supabase
      .from("users")
      .select("role_id, vendor_id, role:role_id(name)")
      .eq("id", user.id)
      .single();

    if (userError || !userData) {
      console.error("[DEBUG API] Error al obtener datos del usuario:", userError?.message || "No se encontraron datos");
      return NextResponse.json(
        { error: "Error al obtener información del usuario" },
        { status: 500 }
      );
    }

    // Verificar que el usuario tenga rol de proveedor o sea admin/evaluador
    const roleName = userData.role?.name?.toLowerCase();

    console.log(`[DEBUG API] Rol del usuario: ${roleName}`);

    // Obtener recomendaciones utilizando la función del servicio
    console.log(`[DEBUG API] Llamando a getRecommendationsForSupplier para usuario ${user.id}`);

    // Llamar a la función de servicio con el cliente de Supabase y el ID del usuario
    const { data: recommendations, error: recError } = await getRecommendationsForSupplier(
      supabase,
      user.id
    );

    if (recError) {
      console.error("[DEBUG API] Error al obtener recomendaciones:", recError.message);
      return NextResponse.json(
        { error: "Error al obtener recomendaciones: " + recError.message },
        { status: 500 }
      );
    }

    console.log(`[DEBUG API] Se obtuvieron ${recommendations?.length || 0} recomendaciones`);

    return NextResponse.json({
      success: true,
      data: recommendations
    });

  } catch (error: any) {
    console.error("[DEBUG API] Error en API de recomendaciones:", error);
    return NextResponse.json(
      { error: "Error interno del servidor: " + error.message },
      { status: 500 }
    );
  }
}

// Añadir método PUT para actualizar el estado de las recomendaciones
export async function PUT(request: Request) {
  try {
    console.log("[DEBUG API] Inicio de solicitud PUT /api/recommendations/supplier");
    const supabase = createServerClient();

    // Verificar autenticación
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      console.error("[DEBUG API] Error de autenticación:", authError);
      return NextResponse.json(
        { error: "No autorizado" },
        { status: 401 }
      );
    }

    // Obtener datos de la solicitud
    const requestData = await request.json();
    const { recommendationId, status } = requestData;

    if (!recommendationId || !status) {
      return NextResponse.json(
        { error: "Datos incompletos" },
        { status: 400 }
      );
    }

    console.log(`[DEBUG API] Actualizando recomendación ${recommendationId} a estado ${status}`);

    // Verificar que el usuario tenga permiso para actualizar esta recomendación
    // Primero, obtener la recomendación
    const { data: recommendation, error: recError } = await supabase
      .from('recommendations')
      .select(`
        id,
        responses!recommendations_response_id_fkey(
          vendor_id
        )
      `)
      .eq('id', recommendationId)
      .single();

    if (recError) {
      console.error("[DEBUG API] Error al obtener recomendación:", recError);
      return NextResponse.json(
        { error: "Error al obtener recomendación" },
        { status: 500 }
      );
    }

    // Obtener el vendor_id del usuario
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('vendor_id')
      .eq('id', user.id)
      .single();

    if (userError) {
      console.error("[DEBUG API] Error al obtener vendor_id del usuario:", userError);
      return NextResponse.json(
        { error: "Error al verificar permisos" },
        { status: 500 }
      );
    }

    // Verificar que la recomendación pertenezca al vendor del usuario
    if (recommendation.responses.vendor_id !== userData.vendor_id) {
      console.error("[DEBUG API] Intento de actualizar recomendación de otro vendor");
      return NextResponse.json(
        { error: "No tienes permiso para actualizar esta recomendación" },
        { status: 403 }
      );
    }

    // Actualizar el estado de la recomendación
    const { data: updatedRec, error: updateError } = await supabase
      .from('recommendations')
      .update({
        status,
        updated_at: new Date().toISOString(),
        completed_at: status === 'implemented' ? new Date().toISOString() : null
      })
      .eq('id', recommendationId)
      .select();

    if (updateError) {
      console.error("[DEBUG API] Error al actualizar recomendación:", updateError);
      return NextResponse.json(
        { error: "Error al actualizar recomendación" },
        { status: 500 }
      );
    }

    console.log(`[DEBUG API] Recomendación actualizada correctamente`);
    return NextResponse.json({
      data: updatedRec[0],
      message: "Recomendación actualizada correctamente"
    });
  } catch (error: any) {
    console.error("[DEBUG API] Error en API PUT de recomendaciones:", error);
    return NextResponse.json(
      { error: "Error interno: " + error.message },
      { status: 500 }
    );
  }
} 