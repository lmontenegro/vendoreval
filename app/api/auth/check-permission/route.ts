import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { checkPermission } from '@/lib/services/auth-service';

export async function POST(request: Request) {
    try {
        const { module, action } = await request.json();

        if (!module || !action) {
            return NextResponse.json({ error: 'Módulo y acción son requeridos' }, { status: 400 });
        }

        const supabase = createServerClient();
        const hasPermission = await checkPermission(supabase, module, action);

        // Devolver 403 (Forbidden) si no tiene permiso
        if (!hasPermission) {
            return NextResponse.json({ hasPermission: false, error: 'Permiso denegado' }, { status: 403 });
        }

        // Devolver 200 si tiene permiso
        return NextResponse.json({ hasPermission: true });

    } catch (error: any) {
        console.error('Error en API check-permission:', error);
        // Si el error es por no estar autenticado, la función checkPermission debería manejarlo
        // y potencialmente devolver 403. Si es otro error, 500.
        return NextResponse.json({ error: error.message || 'Error interno del servidor' }, { status: 500 });
    }
} 