'use server'

import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'

export async function signInWithPasswordAction(formData: FormData) {
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;
    const cookieStore = cookies(); // Get cookies from the server context

    // Crear cliente Supabase específico para Server Actions/Server Components
    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                get(name: string) {
                    return cookieStore.get(name)?.value
                },
                set(name: string, value: string, options: CookieOptions) {
                    try {
                        cookieStore.set({ name, value, ...options })
                    } catch (error) {
                        // Manejar error si ocurre durante server-side rendering
                        console.error("ServerAction: Error setting cookie", error);
                    }
                },
                remove(name: string, options: CookieOptions) {
                    try {
                        cookieStore.set({ name, value: '', ...options })
                    } catch (error) {
                        // Manejar error si ocurre durante server-side rendering
                        console.error("ServerAction: Error removing cookie", error);
                    }
                },
            },
        }
    );

    // Intentar iniciar sesión
    const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
    });

    if (error) {
        console.error("ServerAction: signInWithPassword Error:", error.message);
        // Devolver un objeto de error en lugar de lanzar una excepción
        // para poder mostrar un mensaje específico en el cliente
        return { error: `Error de autenticación: ${error.message}` };
    }

    // Si tiene éxito:
    console.log("ServerAction: signInWithPassword exitoso.");
    revalidatePath('/', 'layout'); // Revalidar toda la app puede ser necesario
    redirect('/dashboard'); // Redirigir desde el servidor

    // Nota: redirect() lanza una excepción especial, por lo que el código
    // después de él no se ejecutará si la redirección tiene éxito.
} 