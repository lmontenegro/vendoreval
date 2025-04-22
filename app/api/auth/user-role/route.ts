import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { getUserRoleDetails } from '@/lib/services/auth-service';

export async function GET(request: Request) {
    try {
        const supabase = createServerClient();
        const { roleId, roleName } = await getUserRoleDetails(supabase);

        // Si no se encuentra rol (usuario no autenticado o error leve)
        if (!roleId || !roleName) {
            return NextResponse.json({ error: 'Usuario no autenticado o rol no encontrado' }, { status: 401 });
        }

        return NextResponse.json({ roleId, roleName });

    } catch (error: any) {
        console.error('Error en API user-role:', error);
        // Devolver 500 para errores inesperados
        return NextResponse.json({ error: error.message || 'Error interno del servidor' }, { status: 500 });
    }
} 