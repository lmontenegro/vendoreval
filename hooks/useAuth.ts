import { useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { User, Session } from '@supabase/supabase-js'

export const useAuth = () => {
    const router = useRouter()
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [user, setUser] = useState<User | null>(null)
    const [session, setSession] = useState<Session | null>(null)

    useEffect(() => {
        // Inicializar la sesión cuando el componente se monta
        const initSession = async () => {
            try {
                const { data: { session } } = await supabase.auth.getSession()
                setSession(session)
                setUser(session?.user ?? null)

                // Suscribirse a cambios en la autenticación
                const { data: { subscription } } = await supabase.auth.onAuthStateChange(
                    (event, currentSession) => {
                        setSession(currentSession)
                        setUser(currentSession?.user ?? null)
                    }
                )

                // Limpiar la suscripción cuando el componente se desmonte
                return () => subscription.unsubscribe()
            } catch (err: any) {
                console.error('Error initializing auth session:', err.message)
            }
        }

        initSession()
    }, [])

    const signIn = async (email: string, password: string) => {
        try {
            setLoading(true)
            setError(null)

            const { data, error } = await supabase.auth.signInWithPassword({
                email,
                password,
            })

            if (error) throw error

            // Obtener el perfil del usuario
            const { data: profile, error: profileError } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', data.user.id)
                .single()

            if (profileError) throw profileError

            router.push('/dashboard')
            return { data, profile }
        } catch (err: any) {
            setError(err.message)
            return { error: err.message }
        } finally {
            setLoading(false)
        }
    }

    const signUp = async (email: string, password: string, userData: any) => {
        try {
            setLoading(true)
            setError(null)

            // Registrar el usuario
            const { data, error } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    data: {
                        company_name: userData.company_name,
                        role: userData.role || 'supplier',
                    },
                    emailRedirectTo: `${window.location.origin}/auth/callback`,
                }
            })

            if (error) throw error

            if (data.user) {
                // Crear el perfil del usuario
                const { error: profileError } = await supabase
                    .from('profiles')
                    .insert([
                        {
                            id: data.user.id,
                            ...userData,
                            contact_email: email,
                        },
                    ])

                if (profileError) throw profileError
            }

            router.push('/auth/verify-email')
            return { data }
        } catch (err: any) {
            setError(err.message)
            return { error: err.message }
        } finally {
            setLoading(false)
        }
    }

    const signOut = async () => {
        try {
            setLoading(true)
            const { error } = await supabase.auth.signOut()
            if (error) throw error

            setUser(null)
            setSession(null)
            router.push('/auth/login')
        } catch (err: any) {
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    const resetPassword = async (email: string) => {
        try {
            setLoading(true)
            setError(null)

            const { error } = await supabase.auth.resetPasswordForEmail(email, {
                redirectTo: `${window.location.origin}/auth/update-password`,
            })

            if (error) throw error

            return { success: true }
        } catch (err: any) {
            setError(err.message)
            return { error: err.message }
        } finally {
            setLoading(false)
        }
    }

    const updatePassword = async (newPassword: string) => {
        try {
            setLoading(true)
            setError(null)

            const { error } = await supabase.auth.updateUser({
                password: newPassword,
            })

            if (error) throw error

            router.push('/dashboard')
            return { success: true }
        } catch (err: any) {
            setError(err.message)
            return { error: err.message }
        } finally {
            setLoading(false)
        }
    }

    return {
        signIn,
        signUp,
        signOut,
        resetPassword,
        updatePassword,
        loading,
        error,
        user,
        session,
        isAuthenticated: !!user,
    }
} 