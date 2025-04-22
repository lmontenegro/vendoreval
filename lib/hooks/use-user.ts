import { useEffect, useState } from 'react';
import { User } from '@supabase/auth-helpers-nextjs';
import { supabase } from '@/lib/supabase/client';

interface UseUserResult {
    user: User | null;
    isLoading: boolean;
    error: Error | null;
}

export function useUser(): UseUserResult {
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [error, setError] = useState<Error | null>(null);

    useEffect(() => {
        async function getUser() {
            try {
                setIsLoading(true);

                // Obtener el usuario actual
                const { data: { user }, error } = await supabase.auth.getUser();

                if (error) {
                    throw error;
                }

                setUser(user);
            } catch (err) {
                setError(err instanceof Error ? err : new Error('Error al obtener el usuario'));
                console.error('Error en useUser:', err);
            } finally {
                setIsLoading(false);
            }
        }

        getUser();

        // Suscribirse a cambios en el estado de autenticación
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            if (event === 'SIGNED_IN' && session?.user) {
                setUser(session.user);
            } else if (event === 'SIGNED_OUT') {
                setUser(null);
            }
        });

        // Limpiar suscripción al desmontar
        return () => {
            subscription.unsubscribe();
        };
    }, []);

    return { user, isLoading, error };
} 