import { NextResponse } from 'next/server';
import { getEvaluationDetails, updateEvaluation } from '@/lib/services/evaluation-service';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { Database } from '@/lib/database.types';
import { v4 as uuidv4 } from 'uuid';

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

                        // Extraer recommendation_text de options
                        let recommendationText = '';
                        if (question.options) {
                            try {
                                const options = typeof question.options === 'string'
                                    ? JSON.parse(question.options)
                                    : question.options;

                                if (options && typeof options === 'object' && 'recommendation_text' in options) {
                                    recommendationText = options.recommendation_text || '';
                                }
                            } catch (e) {
                                console.error("[DEBUG] Error al extraer recommendation_text de options:", e);
                            }
                        }

                        return {
                            id: question.id,
                            category: category,
                            subcategory: question.subcategory,
                            question_text: question.question_text,
                            description: question.description,
                            options: question.options,
                            recommendation_text: recommendationText,
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

                // Mostrar claramente el campo recommendation_text en el log para cada pregunta
                formattedQuestions.forEach((q, index) => {
                    console.log(`[DEBUG] Pregunta ${index + 1} (ID: ${q.id}):`, {
                        question_text: q.question_text,
                        type: q.type,
                        recommendation_text: q.recommendation_text || 'no tiene'
                    });
                });
            }
        } else {
            console.log("[DEBUG] La evaluación ya tiene preguntas asociadas:", data.questions.length);

            // Asegurarse de que todas las preguntas tengan 'recommendation_text' extraído del objeto 'options'
            data.questions = data.questions.map(q => {
                let recommendationText = '';
                if (q.options) {
                    try {
                        const options = typeof q.options === 'string'
                            ? JSON.parse(q.options)
                            : q.options;

                        if (options && typeof options === 'object' && 'recommendation_text' in options) {
                            recommendationText = options.recommendation_text || '';
                        }
                    } catch (e) {
                        console.error("[DEBUG] Error al extraer recommendation_text de options:", e);
                    }
                }

                return {
                    ...q,
                    recommendation_text: recommendationText
                };
            });
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

        // Log de verificación para recommendation_text en preguntas
        if (updateData.questions && Array.isArray(updateData.questions)) {
            console.log(`[DEBUG PUT] Verificando ${updateData.questions.length} preguntas para recommendation_text`);

            // Verificar si las preguntas tienen recommendation_text
            updateData.questions.forEach((q: any, i: number) => {
                console.log(`[DEBUG PUT] Verificando pregunta #${i + 1} (${q.id})`);

                // Verificar recommendation_text directo
                if (q.recommendation_text) {
                    console.log(`[DEBUG PUT] Tiene recommendation_text directo: "${q.recommendation_text.substring(0, 30)}..."`);
                } else {
                    console.log("[DEBUG PUT] No tiene recommendation_text directo");
                }

                // Verificar recommendation_text en options
                if (q.options && typeof q.options === 'object') {
                    if (q.options.recommendation_text) {
                        console.log(`[DEBUG PUT] Tiene recommendation_text en options: "${q.options.recommendation_text.substring(0, 30)}..."`);
                    } else {
                        console.log("[DEBUG PUT] No tiene recommendation_text en options");
                    }
                }
            });

            // Asegurar que recommendation_text siempre esté en options
            updateData.questions = updateData.questions.map((q: any) => {
                if (q.recommendation_text && (!q.options || !q.options.recommendation_text)) {
                    console.log("[DEBUG PUT] Copiando recommendation_text a options");
                    // Si options no es un objeto, inicializarlo
                    if (typeof q.options !== 'object' || q.options === null || Array.isArray(q.options)) {
                        q.options = {};
                    }
                    // Copiar recommendation_text a options
                    q.options.recommendation_text = q.recommendation_text;
                }
                return q;
            });
        }

        // Llamar al servicio para actualizar la evaluación
        const { data, error } = await updateEvaluation(supabase, updateData);

        if (error) {
            console.error("Error al actualizar evaluación:", error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        // Después de actualizar la evaluación, crear o actualizar recomendaciones
        // para preguntas que tienen recommendation_text
        if (updateData.questions && Array.isArray(updateData.questions)) {
            console.log("[DEBUG PUT] Procesando recomendaciones para preguntas actualizadas");

            // Para cada pregunta con recommendation_text, verificar si hay respuestas "No" o "N/A"
            for (const question of updateData.questions) {
                // Si la pregunta no tiene recommendation_text, continuar con la siguiente
                if (!question.recommendation_text &&
                    (!question.options || !question.options.recommendation_text)) {
                    continue;
                }

                const recommendationText = question.recommendation_text ||
                    (question.options && question.options.recommendation_text) || '';

                if (!recommendationText) {
                    continue;
                }

                console.log(`[DEBUG PUT] Pregunta ${question.id} tiene recommendation_text, buscando respuestas No/N/A`);

                // Buscar respuestas "No" o "N/A" para esta pregunta
                const { data: noResponses, error: respError } = await supabase
                    .from("responses")
                    .select(`
                        id, 
                        vendor_id,
                        answer
                    `)
                    .eq("question_id", question.id)
                    .in("answer", ["No", "N/A"]);

                if (respError) {
                    console.error(`[DEBUG PUT] Error al buscar respuestas No/N/A para pregunta ${question.id}:`, respError);
                    continue;
                }

                if (!noResponses || noResponses.length === 0) {
                    console.log(`[DEBUG PUT] No se encontraron respuestas No/N/A para pregunta ${question.id}`);
                    continue;
                }

                console.log(`[DEBUG PUT] Se encontraron ${noResponses.length} respuestas No/N/A para pregunta ${question.id}`);

                // Para cada respuesta, crear o actualizar recomendación
                for (const response of noResponses) {
                    // Verificar si ya existe una recomendación para esta respuesta
                    const { data: existingRec, error: existingError } = await supabase
                        .from("recommendations")
                        .select("id")
                        .eq("response_id", response.id)
                        .single();

                    if (existingError && !existingError.message.includes("No rows found")) {
                        console.error(`[DEBUG PUT] Error al verificar recomendación existente para respuesta ${response.id}:`, existingError);
                        continue;
                    }

                    // Buscar un perfil asociado al vendor_id para asignar la recomendación
                    let profileId = null;
                    if (response.vendor_id) {
                        // Buscar un usuario asociado a este vendor_id
                        const { data: userData, error: userError } = await supabase
                            .from("users")
                            .select("profile_id")
                            .eq("vendor_id", response.vendor_id)
                            .limit(1)
                            .single();

                        if (userError) {
                            console.error(`[DEBUG PUT] Error al buscar usuario para vendor_id ${response.vendor_id}:`, userError);
                        } else if (userData && userData.profile_id) {
                            profileId = userData.profile_id;
                            console.log(`[DEBUG PUT] Encontrado profile_id ${profileId} para vendor_id ${response.vendor_id}`);
                        }
                    }

                    if (existingRec) {
                        console.log(`[DEBUG PUT] Actualizando recomendación existente ${existingRec.id} para respuesta ${response.id}`);

                        // Actualizar la recomendación existente
                        const { error: updateError } = await supabase
                            .from("recommendations")
                            .update({
                                recommendation_text: recommendationText,
                                updated_at: new Date().toISOString()
                            })
                            .eq("id", existingRec.id);

                        if (updateError) {
                            console.error(`[DEBUG PUT] Error al actualizar recomendación ${existingRec.id}:`, updateError);
                        }
                    } else {
                        console.log(`[DEBUG PUT] Creando nueva recomendación para respuesta ${response.id}`);

                        // Crear nueva recomendación
                        const { error: insertError } = await supabase
                            .from("recommendations")
                            .insert({
                                id: uuidv4(),
                                question_id: question.id,
                                response_id: response.id,
                                recommendation_text: recommendationText,
                                status: "pending",
                                assigned_to: profileId, // Usar profileId en lugar de vendor_id
                                priority: response.answer === "No" ? 1 : 2, // Prioridad alta para No, media para N/A
                                created_at: new Date().toISOString(),
                                updated_at: new Date().toISOString()
                            });

                        if (insertError) {
                            console.error(`[DEBUG PUT] Error al crear recomendación para respuesta ${response.id}:`, insertError);
                        }
                    }
                }
            }
        }

        return NextResponse.json({
            data,
            message: 'Evaluación actualizada exitosamente'
        });
    } catch (error) {
        console.error("Error en PUT /api/evaluations/[id]:", error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Error desconocido' },
            { status: 500 }
        );
    }
} 