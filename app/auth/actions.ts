'use server'

import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { Database } from '@/lib/database.types'

export async function signInWithPasswordAction(formData: FormData) {
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;
    const cookieStore = cookies();

    console.log("ServerAction: Starting signInWithPassword");

    const supabase = createServerClient<Database>(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                get(name: string) {
                    return cookieStore.get(name)?.value
                },
                set(name: string, value: string, options: CookieOptions) {
                    cookieStore.set({
                        name,
                        value,
                        ...options,
                        // Asegurarnos que las cookies sean accesibles en el cliente
                        httpOnly: true,
                        secure: process.env.NODE_ENV === 'production',
                        sameSite: 'lax',
                        path: '/'
                    })
                },
                remove(name: string, options: CookieOptions) {
                    cookieStore.delete({
                        name,
                        ...options,
                        path: '/'
                    })
                },
            },
        }
    );

    const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
    });

    if (error) {
        console.error("ServerAction: signInWithPassword Error:", error.message);
        return { error: `Error de autenticación: ${error.message}` };
    }

    console.log("ServerAction: signInWithPassword exitoso, verificando usuario");
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
        console.error("ServerAction: No se pudo obtener el usuario:", userError?.message);
        return { error: "Error: No se pudo verificar la autenticación" };
    }

    try {
        console.log("ServerAction: Verificando usuario:", user.id);

        // Primero verificamos si el usuario existe y tiene rol asignado
        const { data: userData, error: userError } = await supabase
            .from('users')
            .select('role_id')
            .eq('id', user.id)
            .single();

        if (userError || !userData) {
            console.error("ServerAction: No se encontró usuario:", userError?.message);
            await supabase.auth.signOut();
            return { error: "Error: No se pudo verificar el usuario. Por favor contacte al administrador." };
        }

        if (!userData.role_id) {
            console.error("ServerAction: Usuario sin rol asignado");
            await supabase.auth.signOut();
            return { error: "No tiene un rol asignado. Contacte al administrador del sistema." };
        }

        // Ahora obtenemos los detalles completos
        const { data: userDetails, error: detailsError } = await supabase
            .from('users')
            .select(`
                email,
                profile:profiles!inner (
                    is_active
                ),
                role:roles!inner (
                    name,
                    description
                )
            `)
            .eq('id', user.id)
            .single();

        if (detailsError || !userDetails) {
            console.error("ServerAction: Error al obtener detalles:", detailsError?.message);
            await supabase.auth.signOut();
            return { error: "Error al obtener los detalles del usuario. Por favor contacte al administrador." };
        }

        // Verificar si el usuario está activo
        if (!userDetails.profile.is_active) {
            console.error("ServerAction: Acceso denegado - Usuario inactivo");
            await supabase.auth.signOut();
            return { error: "Su cuenta ha sido desactivada. Contacte al administrador del sistema." };
        }

        console.log("ServerAction: Usuario verificado correctamente:", userDetails);
    } catch (error) {
        console.error("ServerAction: Error al verificar el usuario:", error);
        await supabase.auth.signOut();
        return { error: "Error en la verificación del usuario. Por favor, inténtelo de nuevo." };
    }

    console.log("ServerAction: Revalidando y redirigiendo");
    revalidatePath('/', 'layout');

    const allCookies = cookieStore.getAll();
    console.log("ServerAction: Cookies establecidas:", allCookies.map(c => c.name));

    // Verifica específicamente la cookie de Supabase con el nombre correcto
    const hasAuthCookie = cookieStore.has('sb-pagveoabnaiztudqglvh-auth-token');
    console.log("ServerAction: Auth Cookies presentes:", { hasAuthCookie });

    if (!hasAuthCookie) {
        console.warn("ServerAction: No se encontraron cookies de autenticación");
        // Devuelve los datos para que el cliente maneje la redirección
        return {
            user,
            redirectTo: '/dashboard'
        };
    }

    redirect('/dashboard');
} 