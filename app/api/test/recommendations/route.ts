import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
  try {
    const supabase = createServerClient();

    // Verificar autenticación
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "No autorizado" },
        { status: 401 }
      );
    }

    // Obtener el rol y vendor_id del usuario
    const { data: userData, error: userError } = await supabase
      .from("users")
      .select("role_id, vendor_id, profile_id")
      .eq("id", user.id)
      .single();

    if (userError) {
      return NextResponse.json(
        { error: "Error al obtener datos del usuario: " + userError.message },
        { status: 500 }
      );
    }

    // Obtener el nombre del rol
    const { data: roleData, error: roleError } = await supabase
      .from("roles")
      .select("name")
      .eq("id", userData.role_id)
      .single();

    if (roleError) {
      return NextResponse.json(
        { error: "Error al obtener el rol del usuario: " + roleError.message },
        { status: 500 }
      );
    }

    // Verificar si hay respuestas para este vendor
    let responseIds: string[] = [];

    if (userData.vendor_id) {
      const { data: responses, error: respError } = await supabase
        .from('responses')
        .select('id')
        .eq('vendor_id', userData.vendor_id as string);

      if (respError) {
        return NextResponse.json(
          { error: "Error al obtener respuestas: " + respError.message },
          { status: 500 }
        );
      }

      responseIds = responses?.map(r => r.id) || [];
    }

    // Obtener recomendaciones para estas respuestas
    let recommendations: any[] = [];
    if (responseIds.length > 0) {
      const { data: recs, error: recError } = await supabase
        .from('recommendations')
        .select(`
          id,
          recommendation_text,
          priority,
          status,
          assigned_to,
          due_date,
          response_id,
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
        return NextResponse.json(
          { error: "Error al obtener recomendaciones: " + recError.message },
          { status: 500 }
        );
      }

      recommendations = recs || [];
    }

    // Devolver información del usuario y recomendaciones
    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        role: roleData.name,
        vendor_id: userData.vendor_id || null,
        profile_id: userData.profile_id || null
      },
      recommendations: {
        count: recommendations.length,
        items: recommendations
      },
      responses: {
        count: responseIds.length,
        ids: responseIds
      }
    });
  } catch (error: any) {
    console.error("Error en test de recomendaciones:", error);
    return NextResponse.json(
      { error: "Error interno: " + error.message },
      { status: 500 }
    );
  }
} 