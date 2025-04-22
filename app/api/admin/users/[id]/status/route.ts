import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { updateUserStatus } from '@/lib/services/user-service';
import { getCurrentUserData } from '@/lib/services/auth-service'; // Para verificar permisos

export async function PUT(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const userIdToUpdate = params.id;
        const { isActive } = await request.json(); // Esperamos { isActive: boolean }

        if (typeof isActive !== 'boolean') {
            return NextResponse.json({ error: 'El estado \'isActive\' es requerido y debe ser booleano.' }, { status: 400 });
        }

        if (!userIdToUpdate) {
            return NextResponse.json({ error: 'ID de usuario no proporcionado en la URL.' }, { status: 400 });
        }

        const supabase = createServerClient();

        // 1. Verificar permisos (solo admin puede cambiar estado)
        const { isAdmin, user } = await getCurrentUserData(supabase);
        if (!isAdmin) {
            return NextResponse.json({ error: 'No tienes permisos para actualizar el estado del usuario.' }, { status: 403 });
        }

        // Evitar que un admin se desactive a sí mismo (opcional pero recomendado)
        if (user?.id === userIdToUpdate && !isActive) {
            return NextResponse.json({ error: 'Un administrador no puede desactivarse a sí mismo.' }, { status: 400 });
        }

        // 2. Actualizar estado si tiene permiso
        await updateUserStatus(supabase, userIdToUpdate, isActive);

        return NextResponse.json({ success: true, message: `Estado del usuario ${userIdToUpdate} actualizado a ${isActive}.` });

    } catch (error: any) {
        console.error(`Error en PUT /api/admin/users/${params.id}/status:`, error);
        if (error.message.includes('No has iniciado sesión')) {
            return NextResponse.json({ error: error.message }, { status: 401 });
        }
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