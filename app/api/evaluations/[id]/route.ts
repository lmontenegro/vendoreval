import { NextResponse } from 'next/server';
import { getEvaluationDetails, updateEvaluation } from '@/lib/services/evaluation-service';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { Database } from '@/lib/database.types';

// Función para obtener el cliente de Supabase en el servidor (REUTILIZABLE)
function createServerSupabaseClient() {
    const cookieStore = cookies();
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

    if (!supabaseUrl || !supabaseKey) {
        throw new Error("Supabase URL or Anon Key not configured in environment variables.");
    }

    return createClient<Database>(
        supabaseUrl,
        supabaseKey,
        {
            auth: {
                autoRefreshToken: true,
                detectSessionInUrl: false,
                storage: {
                    getItem: (key) => cookieStore.get(key)?.value ?? null,
                    setItem: (key, value) => { /* No hacer set desde aquí */ },
                    removeItem: (key) => { /* No hacer remove desde aquí */ },
                },
            },
        }
    );
}

export async function GET(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        console.log("[DEBUG] GET evaluación - ID:", params.id);
        const evaluationId = params.id;
        if (!evaluationId) {
            return NextResponse.json({ error: 'ID de evaluación no proporcionado' }, { status: 400 });
        }

        const supabase = createServerSupabaseClient();

        console.log("[DEBUG] Obteniendo detalles de evaluación...");
        const { data, error } = await getEvaluationDetails(supabase, evaluationId);

        if (error) {
            console.error('[DEBUG] Error al obtener detalles de evaluación:', error);
            if (error.message.includes('RLS') || error.message.includes('permission denied') || error.message.includes('Unauthorized')) {
                return NextResponse.json({ error: 'No tienes permisos para ver esta evaluación' }, { status: 401 });
            }
            return NextResponse.json({ error: error.message || 'Error al obtener la evaluación' }, { status: 500 });
        }

        if (!data) {
            console.log("[DEBUG] Evaluación no encontrada");
            return NextResponse.json({ error: 'Evaluación no encontrada' }, { status: 404 });
        }

        console.log("[DEBUG] Evaluación encontrada:", {
            id: data.id,
            title: data.title,
            questionsCount: data.questions?.length || 0
        });

        // Verificar si hay preguntas asociadas a la evaluación
        if (!data.questions || data.questions.length === 0) {
            console.log("[DEBUG] No hay preguntas asociadas a la evaluación. Obteniendo manualmente...");

            // Consulta mejorada para obtener todas las preguntas asociadas a la evaluación
            const { data: evalQuestions, error: evalQuestionsError } = await supabase
                .from("evaluation_questions")
                .select(`
                    id,
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
                        validation_rules,
                        metadata,
                        type
                    )
                `)
                .eq("evaluation_id", evaluationId);

            if (evalQuestionsError) {
                console.error("[DEBUG] Error al obtener preguntas manualmente:", evalQuestionsError);
                return NextResponse.json({
                    error: "Error al obtener las preguntas de la evaluación",
                    details: evalQuestionsError
                }, { status: 500 });
            }

            console.log("[DEBUG] Preguntas encontradas manualmente:", evalQuestions?.length || 0);

            if (!evalQuestions || evalQuestions.length === 0) {
                console.log("[DEBUG] No se encontraron preguntas para esta evaluación");
                // Definir questions como array vacío para evitar problemas en el cliente
                data.questions = [];
            } else {
            // Formatear las preguntas encontradas
                const formattedQuestions = evalQuestions
                    .filter(eq => eq.questions) // Asegurar que la pregunta existe
                    .map(eq => {
                        const question = eq.questions;
                        // Normalizar categoría - usar 'Sin categoría' para categorías vacías o nulas
                        const category = question.category && question.category.trim() !== ''
                            ? question.category
                            : 'Sin categoría';

                        return {
                            id: question.id,
                            category: category,
                            subcategory: question.subcategory,
                            question_text: question.question_text,
                            description: question.description,
                            options: question.options,
                            weight: question.weight || 1,
                            is_required: question.is_required !== null ? question.is_required : true,
                            order_index: eq.order_index || 0,
                            validation_rules: question.validation_rules,
                            metadata: question.metadata,
                            type: question.type
                        };
                    });

                // Agregar las preguntas encontradas a la respuesta
                data.questions = formattedQuestions;
                console.log("[DEBUG] Preguntas agregadas manualmente a la respuesta:", formattedQuestions.length);
                console.log("[DEBUG] Muestra de primera pregunta:", JSON.stringify(formattedQuestions[0]));
            }
        } else {
            console.log("[DEBUG] La evaluación ya tiene preguntas asociadas:", data.questions.length);
        }

        // Obtener las respuestas ya existentes
        try {
            console.log("[DEBUG] Obteniendo respuestas existentes para la evaluación");

            // Obtener el ID del vendor del usuario actual
            const { data: { user } } = await supabase.auth.getUser();

            if (user) {
                const { data: userData } = await supabase
                    .from('users')
                    .select('vendor_id')
                    .eq('id', user.id)
                    .single();

                if (userData?.vendor_id) {
                    console.log("[DEBUG] Buscando respuestas para vendor_id:", userData.vendor_id);

                    const { data: existingResponses, error: responsesError } = await supabase
                        .from('responses')
                        .select('*')
                        .eq('evaluation_id', evaluationId)
                        .eq('vendor_id', userData.vendor_id);

                    if (responsesError) {
                        console.error("[DEBUG] Error al obtener respuestas:", responsesError);
                    } else if (existingResponses && existingResponses.length > 0) {
                        console.log("[DEBUG] Respuestas encontradas:", existingResponses.length);
                        data.responses = existingResponses;
                    } else {
                        console.log("[DEBUG] No se encontraron respuestas existentes");
                        data.responses = [];
                    }
                } else {
                    console.log("[DEBUG] Usuario sin vendor_id asignado");
                    data.responses = [];
                }
            } else {
                console.log("[DEBUG] Usuario no autenticado");
                data.responses = [];
            }
        } catch (responseError) {
            console.error("[DEBUG] Error al procesar respuestas:", responseError);
            // No interrumpir el flujo por un error en las respuestas
            data.responses = [];
        }

        return NextResponse.json({ data });
    } catch (error: any) {
        console.error('[DEBUG] Error inesperado en GET:', error);
        return NextResponse.json({ error: error.message || 'Error interno del servidor' }, { status: 500 });
    }
}

export async function PUT(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const evaluationId = params.id;
        if (!evaluationId) {
            return NextResponse.json({ error: 'ID de evaluación no proporcionado' }, { status: 400 });
        }

        const supabase = createServerSupabaseClient();

        const updateData = await request.json();

        if (!updateData || !updateData.title) {
            return NextResponse.json({ error: 'Datos de evaluación incompletos' }, { status: 400 });
        }

        if (updateData.id && updateData.id !== evaluationId) {
            return NextResponse.json({ error: 'El ID en la URL no coincide con el ID en los datos' }, { status: 400 });
        }
        updateData.id = evaluationId;

        const { data, error } = await updateEvaluation(supabase, updateData);

        if (error) {
            console.error('Error al actualizar evaluación (desde servicio):', error);
            if (error.message.includes('No has iniciado sesión') || error.message.includes('No tienes permisos')) {
                return NextResponse.json({ error: error.message }, { status: 401 });
            }
            return NextResponse.json({ error: error.message || 'Error al actualizar la evaluación' }, { status: 500 });
        }

        return NextResponse.json({ data, success: true });
    } catch (error: any) {
        console.error('Error inesperado en PUT:', error);
        if (error.message.includes('Supabase URL or Anon Key not configured')) {
            return NextResponse.json({ error: 'Configuración del servidor incompleta.' }, { status: 500 });
        }
        return NextResponse.json({ error: error.message || 'Error interno del servidor' }, { status: 500 });
    }
} 