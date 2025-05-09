import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Caché simple para reducir las solicitudes a Supabase
const sessionCache = new Map();
const SESSION_CACHE_TTL = 10 * 1000; // 10 segundos

export async function middleware(req: NextRequest) {
    // Rutas que no requieren verificación de sesión (para reducir llamadas a Supabase)
    const publicRoutes = [
        '/',
        '/auth/login',
        '/auth/register',
        '/auth/reset-password',
        '/auth/update-password',
        '/api/public'
    ];

    // Si la ruta es pública, no verificamos sesión para evitar rate limits
    const isPublicRoute = publicRoutes.some(route =>
        req.nextUrl.pathname === route ||
        req.nextUrl.pathname.startsWith('/api/public') ||
        req.nextUrl.pathname.startsWith('/_next') ||
        req.nextUrl.pathname.startsWith('/public') ||
        req.nextUrl.pathname.startsWith('/assets')
    );

    if (isPublicRoute) {
        return NextResponse.next();
    }

    const res = NextResponse.next();

    // Verificar si tenemos una sesión en caché para esta cookie
    const cookieHeader = req.headers.get('cookie') || '';
    const cacheKey = `session_${cookieHeader}`;

    const cachedSession = sessionCache.get(cacheKey);
    if (cachedSession) {
        // Si la sesión está en caché, verificamos si es válida
        if (cachedSession.session) {
            return handleProtectedRoutes(req, res, cachedSession.session);
        } else if (!cachedSession.session && !isPublicRoute) {
            // Si no hay sesión en caché y no es una ruta pública, redirigir al login
            return NextResponse.redirect(new URL('/auth/login', req.url));
        }
        return res;
    }

    // Si no tenemos caché, procedemos a verificar con Supabase
    try {
        // Usar createServerClient de @supabase/ssr
        const supabase = createServerClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            {
                cookies: {
                    get(name: string) {
                        return req.cookies.get(name)?.value;
                    },
                    set(name: string, value: string, options) {
                        // Si estamos en producción, usar secure cookies
                        const secure = process.env.NODE_ENV === 'production';

                        // Configurar como cookie HTTP-only para mejorar la seguridad
                        res.cookies.set({
                            name,
                            value,
                            ...options,
                            httpOnly: true,
                            secure,
                            sameSite: 'lax',
                            path: '/',
                            maxAge: 60 * 60 * 24 * 7, // 7 días
                        });
                    },
                    remove(name: string, options) {
                        res.cookies.delete({
                            name,
                            ...options,
                            path: '/',
                        });
                    },
                },
            }
        );

        // Intentar obtener la sesión y manejar errores
        const { data: { session } } = await supabase.auth.getSession();

        // Guardar en caché el resultado de la sesión
        sessionCache.set(cacheKey, { session });
        setTimeout(() => sessionCache.delete(cacheKey), SESSION_CACHE_TTL);

        return handleProtectedRoutes(req, res, session);
    } catch (error) {
        console.error('Error en middleware:', error);

        // En caso de rate limit, intentamos ser menos restrictivos
        if (error instanceof Error && error.message.includes('rate limit')) {
            console.warn('Rate limit en middleware, permitiendo acceso con validación mínima');

            // Verificamos específicamente la cookie de Supabase con el nombre correcto
            const hasAuthCookie = req.cookies.has('sb-pagveoabnaiztudqglvh-auth-token');

            if (hasAuthCookie) {
                // Permitir acceso pero con caché negativa corta
                sessionCache.set(cacheKey, { session: null });
                setTimeout(() => sessionCache.delete(cacheKey), 5000); // Caché más corta en este caso
                return res;
            }
        }

        // En caso de error, permitir acceso a rutas públicas y redireccionar a login en rutas protegidas
        if (req.nextUrl.pathname.startsWith('/auth') ||
            req.nextUrl.pathname === '/' ||
            req.nextUrl.pathname.startsWith('/public')) {
            return res;
        }

        return NextResponse.redirect(new URL('/auth/login', req.url));
    }
}

// Función helper para manejar las rutas protegidas
function handleProtectedRoutes(req: NextRequest, res: NextResponse, session: any) {
    // Rutas protegidas que requieren autenticación
    const protectedRoutes = [
        '/dashboard',
        '/evaluations',
        '/vendors',
        '/metrics',
        '/users',
        '/recommendations',
        '/profile',
        '/settings'
    ];

    // Verificar si la ruta actual está protegida
    const isProtectedRoute = protectedRoutes.some(route =>
        req.nextUrl.pathname.startsWith(route)
    );

    // Si es una ruta protegida y no hay sesión, redirigir al login
    if (isProtectedRoute && !session) {
        return NextResponse.redirect(new URL('/auth/login', req.url));
    }

    // Si hay sesión y el usuario intenta acceder a auth, redirigir al dashboard
    if (session && req.nextUrl.pathname.startsWith('/auth')) {
        return NextResponse.redirect(new URL('/dashboard', req.url));
    }

    return res;
}

// Configurar las rutas que deben ser manejadas por el middleware
export const config = {
    matcher: [
        /*
         * Match all request paths except:
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         * - public (public files)
         */
        '/((?!_next/static|_next/image|favicon.ico|public|.*\\.).*)',
    ],
} 