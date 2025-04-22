import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { getUsers } from '@/lib/services/user-service';
import { getCurrentUserData } from '@/lib/services/auth-service'; // Para verificar permisos
import { Database } from '@/lib/database.types';

export async function GET(request: Request) {
    try {
        const supabase = createServerClient();

        // 1. Verificar permisos (solo admin puede listar todos los usuarios)
        const { isAdmin } = await getCurrentUserData(supabase);
        if (!isAdmin) {
            return NextResponse.json({ error: 'No tienes permisos para ver la lista de usuarios' }, { status: 403 });
        }

        // 2. Obtener usuarios si tiene permiso
        const users = await getUsers(supabase);

        return NextResponse.json({ data: users });

    } catch (error: any) {
        console.error('Error en GET /api/admin/users:', error);
        if (error.message.includes('No has iniciado sesión')) {
            return NextResponse.json({ error: error.message }, { status: 401 });
        }
        if (error.message.includes('Missing Supabase environment variables')) {
            return NextResponse.json({ error: 'Configuración del servidor incompleta.' }, { status: 500 });
        }
        return NextResponse.json({ error: error.message || 'Error interno del servidor' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    const supabase = createServerClient();
    let authUserId: string | undefined = undefined; // Para limpieza en caso de error

    try {
        // 1. Verificar si el usuario que LLAMA a la API está autenticado (¿necesario?)
        // Depende de si CUALQUIERA puede llamar a esta API o solo admins/managers
        // Por ahora, asumimos que cualquiera autenticado puede (como pide la RLS de INSERT)
        const { data: { user: callingUser }, error: callingUserError } = await supabase.auth.getUser();
        if (callingUserError || !callingUser) {
            return NextResponse.json({ error: 'Acceso denegado: No autenticado' }, { status: 401 });
        }

        // 2. Obtener datos del cuerpo de la solicitud
        const { email, password, profileData, vendor_id, role_id } = await request.json();

        // 3. Validación básica de datos recibidos
        if (!email || !password || !profileData || !vendor_id || !role_id || !profileData.first_name || !profileData.last_name) {
            return NextResponse.json({ error: 'Faltan datos requeridos para crear el usuario.' }, { status: 400 });
        }
        if (password.length < 6) {
            return NextResponse.json({ error: 'La contraseña debe tener al menos 6 caracteres.' }, { status: 400 });
        }
        // Podrías añadir validación de email aquí también

        // --- INICIO: Secuencia de Creación ---

        // 4. Crear usuario en auth.users
        // Nota: No pasar datos sensibles en 'options.data' si no es necesario,
        // la información principal va en profiles y users.
        const { data: authData, error: signUpError } = await supabase.auth.signUp({
            email,
            password,
            options: {
                // Deshabilitar temporalmente email confirmation para prueba si es necesario
                // emailRedirectTo: `${request.headers.get('origin')}/auth/callback`, // Opcional
                // data: { ... } // Evitar si no es estrictamente necesario aquí
            }
        });

        if (signUpError) {
            console.error("Error en signUp:", signUpError);
            // Manejar errores comunes como "User already registered"
            if (signUpError.message.includes("User already registered")) {
                return NextResponse.json({ error: "Este correo electrónico ya está registrado." }, { status: 409 }); // Conflict
            }
            return NextResponse.json({ error: `Error al registrar usuario: ${signUpError.message}` }, { status: 500 });
        }

        if (!authData?.user) {
            // Esto no debería pasar si signUpError es null, pero por seguridad
            throw new Error("No se pudo obtener el usuario después del signUp.");
        }
        authUserId = authData.user.id; // Guardar ID para posible limpieza

        // (El trigger ya creó la fila básica en public.users)

        // 5. Crear perfil en public.profiles
        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .insert({
                id: authData.user.id,
                first_name: profileData.first_name,
                last_name: profileData.last_name,
                contact_email: email,
                is_active: true
            })
            .select('id')
            .single();

        if (profileError) {
            console.error("Error insertando perfil:", profileError);
            throw new Error(`Error al crear perfil: ${profileError.message}`);
        }
        if (!profile?.id) {
            throw new Error("No se pudo obtener el ID del perfil creado.");
        }


        // 6. Actualizar la fila en public.users (creada por el trigger)
        const { error: usersError } = await supabase
            .from('users')
            .update({
                profile_id: profile.id, // ID del perfil recién creado
                role_id: role_id,       // ID del rol seleccionado
                vendor_id: vendor_id,   // ID del vendor seleccionado
                // Podrías actualizar otros campos si fuera necesario
                is_active: true // Asegurar que esté activo
            })
            .eq('id', authData.user.id); // Condición WHERE para actualizar la fila correcta

        if (usersError) {
            console.error("Error actualizando public.users:", usersError);
            // Intentar limpiar auth user y profile? Complejo.
            throw new Error(`Error al vincular usuario: ${usersError.message}`);
        }

        // --- FIN: Secuencia de Creación ---

        // 7. Éxito
        // No devolver el objeto user completo por seguridad, quizás solo id y email.
        return NextResponse.json({ data: { id: authData.user.id, email: authData.user.email }, message: "Usuario creado exitosamente." }, { status: 201 });

    } catch (error: any) {
        console.error("Error general en POST /api/admin/users:", error);

        // Intento básico de limpieza si algo falló después de crear el usuario en auth
        // Esto requiere credenciales de admin para llamar a auth.admin.deleteUser
        // Es opcional y puede requerir configuración adicional.
        /*
        if (authUserId) {
            try {
                const adminSupabase = createServerClient({ isAdmin: true }); // Necesitarías una forma de obtener el cliente admin
                await adminSupabase.auth.admin.deleteUser(authUserId);
                console.log(`Limpieza: Usuario auth ${authUserId} eliminado.`);
            } catch (cleanupError: any) {
                console.error(`Error durante la limpieza del usuario auth ${authUserId}:`, cleanupError);
            }
        }
        */

        if (error instanceof SyntaxError) {
            return NextResponse.json({ error: 'Cuerpo de la solicitud inválido (JSON malformado)' }, { status: 400 });
        }
        return NextResponse.json({ error: error.message || 'Error interno del servidor' }, { status: 500 });
    }
} 