import { createServerClient as _createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { Database } from '../database.types'

export function createServerClient() {
    const cookieStore = cookies()

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!supabaseUrl || !supabaseKey) {
        // Consider logging this error as well
        throw new Error('Missing Supabase environment variables');
    }

    return _createServerClient<Database>(
        supabaseUrl,
        supabaseKey,
        {
            cookies: {
                get(name: string) {
                    return cookieStore.get(name)?.value
                },
                set(name: string, value: string, options: CookieOptions) {
                    try {
                        cookieStore.set({ name, value, ...options })
                    } catch (error) {
                        // The `set` method was called from a Server Component.
                        // This can be ignored if you have middleware refreshing
                        // user sessions.
                    }
                },
                remove(name: string, options: CookieOptions) {
                    try {
                        cookieStore.set({ name, value: '', ...options })
                    } catch (error) {
                        // The `delete` method was called from a Server Component.
                        // This can be ignored if you have middleware refreshing
                        // user sessions.
                    }
                },
            },
            // Opcional: Configuración auth adicional si es necesaria
            // auth: {
            //   autoRefreshToken: true, 
            //   persistSession: true, 
            // }
        }
    )
}

// También puedes crear un cliente con rol de servicio si lo necesitas para operaciones específicas
// export function createServiceRoleClient() {
//   const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
//   const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY; // Necesitas esta variable

//   if (!supabaseUrl || !serviceKey) {
//     throw new Error('Missing Supabase URL or Service Role Key environment variables');
//   }

//   return createClient<Database>(supabaseUrl, serviceKey, {
//     auth: {
//       autoRefreshToken: false,
//       persistSession: false
//     }
//   });
// } 