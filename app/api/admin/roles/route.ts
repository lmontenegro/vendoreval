import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { getCurrentUserData } from '@/lib/services/auth-service'; // Opcional si restringes quién ve roles

export async function GET(request: Request) {
    try {
        const supabase = createServerClient();

        // Verificar si el usuario está autenticado (mínimo necesario para ver roles)
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
        }

        // Obtener roles de la BD
        const { data: roles, error: rolesError } = await supabase
            .from('roles')
            .select('*') // id, name, description
            .order('name', { ascending: true });

        if (rolesError) {
            console.error("Error fetching roles from DB:", rolesError);
            return NextResponse.json({ error: 'Error al obtener roles' }, { status: 500 });
        }

        // Devolver en el formato esperado por el frontend
        return NextResponse.json({ data: roles || [] });

    } catch (error: any) {
        console.error('Error en GET /api/admin/roles:', error);
        return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
    }
} 