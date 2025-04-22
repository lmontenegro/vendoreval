import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { type NextRequest } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
    const requestUrl = new URL(request.url)
    const code = requestUrl.searchParams.get('code')

    console.log('Auth callback route hit', { hasCode: !!code })

    if (code) {
        const cookieStore = cookies()
        const supabase = createServerClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            {
                cookies: {
                    get(name: string) {
                        return cookieStore.get(name)?.value
                    },
                    set(name: string, value: string, options: any) {
                        cookieStore.set({ name, value, ...options })
                    },
                    remove(name: string, options: any) {
                        cookieStore.set({ name, value: '', ...options })
                    },
                },
            }
        )

        try {
            const { data, error } = await supabase.auth.exchangeCodeForSession(code)

            if (error) {
                console.error('Error exchanging code for session:', error)
                return NextResponse.redirect(`${requestUrl.origin}/auth/login?error=callback_error`)
            }

            // Verify session was successfully created
            console.log('Session created successfully', { hasUser: !!data?.user })

            // Check if session is available
            const { data: sessionData } = await supabase.auth.getSession()
            if (!sessionData.session) {
                console.error('No session available after code exchange')
                return NextResponse.redirect(`${requestUrl.origin}/auth/login?error=no_session`)
            }
        } catch (error) {
            console.error('Error exchanging code for session:', error)
            return NextResponse.redirect(`${requestUrl.origin}/auth/login?error=callback_error`)
        }
    } else {
        console.warn('No code provided in callback URL')
        return NextResponse.redirect(`${requestUrl.origin}/auth/login?error=no_code`)
    }

    // URL to redirect to after sign in process completes
    console.log('Redirecting to dashboard')
    return NextResponse.redirect(`${requestUrl.origin}/dashboard`)
} 