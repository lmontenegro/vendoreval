import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { getProfiles } from '@/lib/services/profile-service'; // Usar el servicio refactorizado
import { getCurrentUserData } from '@/lib/services/auth-service'; // Para verificar permisos

export async function GET(request: Request) {
    try {
        const supabase = createServerClient();

        // 1. Verificar permisos (asumiendo que solo admin puede ver todos los perfiles)
        // Ajusta esta lógica si otros roles pueden necesitar la lista de perfiles
        const { isAdmin } = await getCurrentUserData(supabase);
        if (!isAdmin) {
            // Podríamos decidir devolver una lista vacía o un error si no es admin
            // return NextResponse.json({ data: [] }); 
            return NextResponse.json({ error: 'No tienes permisos para ver la lista de perfiles' }, { status: 403 });
        }

        // 2. Obtener perfiles si tiene permiso
        const profiles = await getProfiles(supabase);

        return NextResponse.json({ data: profiles });

    } catch (error: any) {
        console.error('Error en GET /api/admin/profiles:', error);
        if (error.message.includes('No has iniciado sesión')) {
            return NextResponse.json({ error: error.message }, { status: 401 });
        }
        if (error.message.includes('Missing Supabase environment variables')) {
            return NextResponse.json({ error: 'Configuración del servidor incompleta.' }, { status: 500 });
        }
        return NextResponse.json({ error: error.message || 'Error interno del servidor' }, { status: 500 });
    }
} 