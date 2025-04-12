import { createServerClient, type CookieOptions } from '@supabase/ssr'
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
         * - api (API routes)
         */
        '/((?!_next/static|_next/image|favicon.ico|public|api).*)',
    ],
}

export async function middleware(request: NextRequest) {
    let response = NextResponse.next({
        request: {
            headers: request.headers,
        },
    })
    const requestPath = new URL(request.url).pathname;

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                get(name: string) {
                    const cookie = request.cookies.get(name)?.value;
                    return cookie;
                },
                set(name: string, value: string, options: CookieOptions) {
                    request.cookies.set({ name, value, ...options });
                    response = NextResponse.next({
                        request: { headers: request.headers },
                    });
                    response.cookies.set({ name, value, ...options });
                },
                remove(name: string, options: CookieOptions) {
                    request.cookies.set({ name, value: '', ...options });
                    response = NextResponse.next({
                        request: { headers: request.headers },
                    });
                    response.cookies.set({ name, value: '', ...options });
                },
            },
        }
    )

    const { data: { session }, error: sessionError } = await supabase.auth.getSession();


    // Rutas protegidas que requieren autenticación
    const protectedRoutes = ['/dashboard', '/evaluations', '/vendors', '/settings', '/profile'];
    const authRoutes = ['/auth/login', '/auth/register', '/auth/reset-password', '/auth/update-password'];

    // Si la ruta es protegida y no hay sesión, redirigir al login
    if (!session && protectedRoutes.some(route => requestPath.startsWith(route))) {
        const redirectUrl = new URL('/auth/login', request.url);
        redirectUrl.searchParams.set('redirectedFrom', requestPath);
        return NextResponse.redirect(redirectUrl);
    }

    // Si la ruta es de autenticación y hay sesión, redirigir al dashboard
    if (session && authRoutes.includes(requestPath)) {
        const redirectUrl = new URL('/dashboard', request.url);
        return NextResponse.redirect(redirectUrl);
    }

    return response;
} 