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
            console.log("[DEBUG] No hay preguntas asociadas a la evaluación. Verificando manualmente...");

            // Consulta manual para verificar si hay preguntas asociadas
            const { data: evalQuestions, error: evalQuestionsError } = await supabase
                .from("evaluation_questions")
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
                .eq("evaluation_id", evaluationId);

            if (evalQuestionsError) {
                console.error("[DEBUG] Error al verificar preguntas manualmente:", evalQuestionsError);
            } else {
                console.log("[DEBUG] Preguntas encontradas manualmente:", evalQuestions?.length || 0);
                if (evalQuestions && evalQuestions.length > 0) {
                    // Formatear las preguntas encontradas
                    const formattedQuestions = evalQuestions.map(eq => {
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

                    // Agregar las preguntas encontradas a la respuesta
                    data.questions = formattedQuestions;
                    console.log("[DEBUG] Preguntas agregadas manualmente a la respuesta:", formattedQuestions.length);
                }
            }
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