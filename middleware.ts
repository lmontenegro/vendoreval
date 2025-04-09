import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export const config = {
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         * - public (public files)
         */
        '/((?!_next/static|_next/image|favicon.ico|public).*)',
    ],
}

export async function middleware(request: NextRequest) {
    let response = NextResponse.next({
        request: {
            headers: request.headers,
        },
    })

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                get(name: string) {
                    return request.cookies.get(name)?.value
                },
                set(name: string, value: string, options: any) {
                    request.cookies.set({
                        name,
                        value,
                        ...options,
                    })
                    response = NextResponse.next({
                        request: {
                            headers: request.headers,
                        },
                    })
                    response.cookies.set({
                        name,
                        value,
                        ...options,
                    })
                },
                remove(name: string, options: any) {
                    request.cookies.set({
                        name,
                        value: '',
                        ...options,
                    })
                    response = NextResponse.next({
                        request: {
                            headers: request.headers,
                        },
                    })
                    response.cookies.set({
                        name,
                        value: '',
                        ...options,
                    })
                },
            },
        }
    )

    // Rutas protegidas que requieren autenticación
    const protectedRoutes = ['/dashboard', '/evaluations', '/vendors', '/settings']

    // Rutas de autenticación que no deberían ser accesibles si ya está autenticado
    const authRoutes = ['/auth/login', '/auth/register', '/auth/reset-password']

    const { data: { session } } = await supabase.auth.getSession()
    const requestPath = new URL(request.url).pathname

    // Si la ruta es protegida y no hay sesión, redirigir al login
    if (protectedRoutes.some(route => requestPath.startsWith(route)) && !session) {
        return NextResponse.redirect(new URL('/auth/login', request.url))
    }

    // Si la ruta es de autenticación y hay sesión, redirigir al dashboard
    if (authRoutes.includes(requestPath) && session) {
        return NextResponse.redirect(new URL('/dashboard', request.url))
    }

    return response
} 