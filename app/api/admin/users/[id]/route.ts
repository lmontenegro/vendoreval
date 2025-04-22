import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { getUserById, updateUser } from '@/lib/services/user-service';
import { getCurrentUserData } from '@/lib/services/auth-service';
import { Database } from '@/lib/database.types';

export async function GET(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const userIdToFetch = params.id;
        if (!userIdToFetch) {
            return NextResponse.json({ error: 'ID de usuario no proporcionado.' }, { status: 400 });
        }

        const supabase = createServerClient();

        // 1. Verificar permisos (¿Admin o el propio usuario pueden ver detalles?)
        // Por ahora, permitiremos si es admin O si es el mismo usuario pidiendo sus datos
        const { user: callingUser, isAdmin } = await getCurrentUserData(supabase);
        if (!callingUser) {
            return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
        }

        const isSelf = callingUser.id === userIdToFetch;

        if (!isAdmin && !isSelf) {
            return NextResponse.json({ error: 'No tienes permisos para ver este usuario.' }, { status: 403 });
        }

        // 2. Obtener datos del usuario usando el servicio
        // getUserById ya incluye profile, role, vendor
        const user = await getUserById(supabase, userIdToFetch);

        // El servicio getUserById lanza error si no se encuentra
        return NextResponse.json({ data: user });

    } catch (error: any) {
        console.error(`Error en GET /api/admin/users/${params.id}:`, error);
        if (error.message === 'User not found') {
            return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
        }
        if (error.message.includes('No has iniciado sesión')) {
            return NextResponse.json({ error: error.message }, { status: 401 });
        }
        // Otros errores capturados por el servicio o inesperados
        return NextResponse.json({ error: error.message || 'Error interno del servidor' }, { status: 500 });
    }
}

export async function PUT(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const userIdToUpdate = params.id;
        if (!userIdToUpdate) {
            return NextResponse.json({ error: 'ID de usuario no proporcionado.' }, { status: 400 });
        }

        // Obtener los datos actualizados del cuerpo
        const updatePayload = await request.json();

        // Validación básica (mejorar con Zod si es necesario)
        if (!updatePayload || typeof updatePayload !== 'object' || Object.keys(updatePayload).length === 0) {
            return NextResponse.json({ error: 'Datos de actualización inválidos o vacíos.' }, { status: 400 });
        }
        // Podrías añadir validación específica para email, first_name, last_name, role_id, vendor_id aquí

        const supabase = createServerClient();

        // 1. Verificar permisos (Admin o el propio usuario)
        const { user: callingUser, isAdmin } = await getCurrentUserData(supabase);
        if (!callingUser) {
            return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
        }
        const isSelf = callingUser.id === userIdToUpdate;
        if (!isAdmin && !isSelf) {
            // Solo admin o el propio usuario pueden intentar actualizar
            return NextResponse.json({ error: 'No tienes permisos para actualizar este usuario.' }, { status: 403 });
        }

        // 2. Separar datos para `users` y `profiles` según lo que espera el servicio `updateUser`
        //    El servicio updateUser espera un objeto que puede tener una propiedad `profile`
        const userDataForService: {
            email?: string;
            role_id?: string | null;
            vendor_id?: string | null;
            is_active?: boolean;
            profile?: {
                first_name?: string;
                last_name?: string;
                is_active?: boolean; // ¿Actualizar is_active en profile también?
                // Añadir otros campos de profile si se editan
            }
        } = {};

        // Mapear campos del payload a la estructura esperada por updateUser
        // Campos directos de la tabla 'users'
        if (updatePayload.email) userDataForService.email = updatePayload.email; // Permitir cambio de email? Usualmente no
        if (updatePayload.role_id) userDataForService.role_id = updatePayload.role_id;
        if (updatePayload.vendor_id) userDataForService.vendor_id = updatePayload.vendor_id;
        if (updatePayload.is_active !== undefined) userDataForService.is_active = updatePayload.is_active;

        // Campos de la tabla 'profiles' (van dentro del objeto 'profile')
        userDataForService.profile = {};
        if (updatePayload.first_name) userDataForService.profile.first_name = updatePayload.first_name;
        if (updatePayload.last_name) userDataForService.profile.last_name = updatePayload.last_name;
        // Decidir si is_active también debe actualizarse en profile
        if (updatePayload.is_active !== undefined) userDataForService.profile.is_active = updatePayload.is_active;


        // 3. Llamar al servicio para actualizar
        await updateUser(supabase, userIdToUpdate, userDataForService as any);

        // 4. Éxito
        return NextResponse.json({ message: `Usuario ${userIdToUpdate} actualizado correctamente.` });

    } catch (error: any) {
        console.error(`Error en PUT /api/admin/users/${params.id}:`, error);
        // Manejar errores específicos que pueda lanzar el servicio updateUser
        if (error.message.includes('Could not find profile link')) {
            return NextResponse.json({ error: 'No se pudo encontrar el perfil asociado para actualizar.' }, { status: 404 });
        }
        if (error.message.includes('RLS') || error.message.includes('permission denied')) {
            return NextResponse.json({ error: 'Error de permisos al actualizar (RLS).' }, { status: 403 });
        }
        if (error instanceof SyntaxError) {
            return NextResponse.json({ error: 'Cuerpo de la solicitud inválido (JSON malformado)' }, { status: 400 });
        }
        return NextResponse.json({ error: error.message || 'Error interno del servidor al actualizar usuario' }, { status: 500 });
    }
}

export async function DELETE(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const userIdToDelete = params.id;
        if (!userIdToDelete) {
            return NextResponse.json({ error: 'ID de usuario no proporcionado.' }, { status: 400 });
        }

        const supabase = createServerClient();

        // 1. Verificar permisos (SOLO Admin puede borrar)
        const { isAdmin } = await getCurrentUserData(supabase);
        if (!isAdmin) {
            return NextResponse.json({ error: 'No tienes permisos para eliminar usuarios.' }, { status: 403 });
        }

        // 2. Llamar a Supabase Auth Admin para eliminar el usuario
        // IMPORTANTE: createServerClient DEBE poder obtener la service_role key
        //             para que auth.admin funcione. Asegúrate que las variables de entorno
        //             SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY estén disponibles en el servidor.
        const { data: deletionData, error: deleteError } = await supabase.auth.admin.deleteUser(
            userIdToDelete
        );

        if (deleteError) {
            console.error(`Error deleting user ${userIdToDelete} from auth:`, deleteError);
            // Manejar errores específicos como "User not found"
            if (deleteError.message.includes('User not found')) {
                return NextResponse.json({ error: 'Usuario no encontrado en Supabase Auth.' }, { status: 404 });
            }
            return NextResponse.json({ error: `Error al eliminar usuario: ${deleteError.message}` }, { status: 500 });
        }

        // 3. Éxito
        console.log(`User ${userIdToDelete} deleted successfully by admin.`);
        return NextResponse.json({ message: `Usuario ${userIdToDelete} eliminado correctamente.` });

    } catch (error: any) {
        console.error(`Error en DELETE /api/admin/users/${params.id}:`, error);
        return NextResponse.json({ error: error.message || 'Error interno del servidor al eliminar usuario' }, { status: 500 });
    }
} 