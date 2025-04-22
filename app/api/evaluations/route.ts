import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server'; // Usar el cliente centralizado
import { getEvaluations, createEvaluation } from '@/lib/services/evaluation-service';

// Obtener Evaluaciones
export async function GET(request: Request) {
    try {
        // Crear cliente Supabase del servidor
        const supabase = createServerClient();

        // Llamar al servicio pasando el cliente
        const { data, error } = await getEvaluations(supabase);

        if (error) {
            console.error('Error al obtener evaluaciones (desde servicio):', error);
            // Diferenciar errores de autenticación/permisos de otros errores
            if (error.message.includes('No has iniciado sesión') || error.message.includes('Error al autenticar')) {
                return NextResponse.json({ error: error.message }, { status: 401 });
            } else if (error.message.includes('RLS') || error.message.includes('permission denied')) {
                return NextResponse.json({ error: 'No tienes permisos para ver evaluaciones' }, { status: 403 });
            }
            // Error general
            return NextResponse.json({ error: error.message || 'Error al obtener las evaluaciones' }, { status: 500 });
        }

        // Devolver los datos si todo está OK
        return NextResponse.json({ data });

    } catch (error: any) {
        // Capturar errores inesperados (ej: fallo al crear cliente)
        console.error('Error inesperado en GET /api/evaluations:', error);
        if (error.message.includes('Missing Supabase environment variables')) {
            return NextResponse.json({ error: 'Configuración del servidor incompleta.' }, { status: 500 });
        }
        return NextResponse.json({ error: error.message || 'Error interno del servidor' }, { status: 500 });
    }
}

// Crear Nueva Evaluación
export async function POST(request: Request) {
    try {
        // Crear cliente Supabase del servidor
        const supabase = createServerClient();

        // Obtener datos del cuerpo de la solicitud
        const evaluationData = await request.json();

        // Validar datos (puedes añadir validación más robusta con Zod)
        if (!evaluationData || !evaluationData.title || !evaluationData.questions) {
            return NextResponse.json({ error: 'Datos de evaluación incompletos' }, { status: 400 });
        }

        // Llamar al servicio pasando el cliente
        // No necesitamos pasar userId explícitamente si createEvaluation lo obtiene
        const { data, error } = await createEvaluation(supabase, evaluationData);

        if (error) {
            console.error('Error al crear evaluación (desde servicio):', error);
            // Diferenciar errores
            if (error.message.includes('No has iniciado sesión')) {
                return NextResponse.json({ error: error.message }, { status: 401 });
            } else if (error.message.includes('RLS') || error.message.includes('permission denied') || error.message.includes('No tienes permisos')) {
                return NextResponse.json({ error: 'No tienes permisos para crear evaluaciones' }, { status: 403 });
            }
            return NextResponse.json({ error: error.message || 'Error al crear la evaluación' }, { status: 500 });
        }

        // Devolver el ID de la nueva evaluación
        return NextResponse.json({ data }, { status: 201 }); // 201 Created

    } catch (error: any) {
        console.error('Error inesperado en POST /api/evaluations:', error);
        if (error.message.includes('Missing Supabase environment variables')) {
            return NextResponse.json({ error: 'Configuración del servidor incompleta.' }, { status: 500 });
        }
        // Capturar error de JSON malformado
        if (error instanceof SyntaxError) {
            return NextResponse.json({ error: 'Cuerpo de la solicitud inválido (JSON malformado)' }, { status: 400 });
        }
        return NextResponse.json({ error: error.message || 'Error interno del servidor' }, { status: 500 });
    }
} 