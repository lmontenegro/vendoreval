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

                // Usar getSession como fuente principal
                const { data, error: sessionError } = await supabase.auth.getSession();

                // Si tenemos una sesión, usarla sin importar los errores
                if (data?.session?.user) {
                    setUser(data.session.user);
                    setError(null);
                    console.log("[useUser] Usuario obtenido desde getSession:", data.session.user.id);
                    return;
                }

                // Si hay un error pero no fatal, lo registramos pero seguimos intentando con getUser
                if (sessionError) {
                    console.warn("[useUser] Error no fatal en getSession:", sessionError.message);
                }

                // Intentar con getUser como respaldo
                try {
                    const { data: userData, error: userError } = await supabase.auth.getUser();

                    if (userData?.user) {
                        setUser(userData.user);
                        setError(null);
                        console.log("[useUser] Usuario obtenido desde getUser:", userData.user.id);
                        return;
                    }

                    // Solo establecer error si ambos métodos fallan
                    if (userError) {
                        // Ignorar específicamente "Auth session missing" para SSR
                        if (!userError.message?.includes("Auth session missing")) {
                            throw userError;
                        } else {
                            console.warn("[useUser] Error AuthSessionMissing ignorado");
                        }
                    }
                } catch (userErr: any) {
                    console.warn("[useUser] Error en getUser:", userErr);
                    throw userErr; // Re-lanzar para manejo arriba
                }

                // Si llegamos aquí sin usuario, probablemente no hay sesión
                console.log("[useUser] No se encontró usuario autenticado");
                setUser(null);
            } catch (err) {
                console.error('[useUser] Error:', err);
                setError(err instanceof Error ? err : new Error('Error desconocido al obtener usuario'));
                setUser(null); // Asegurar que user es null en caso de error
            } finally {
                setIsLoading(false);
            }
        }

        getUser();

        // Suscribirse a cambios en el estado de autenticación
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            console.log("[useUser] Evento de autenticación:", event);
            if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
                if (session?.user) {
                    console.log("[useUser] Usuario actualizado desde evento:", session.user.id);
                    setUser(session.user);
                    setError(null);
                }
            } else if (event === 'SIGNED_OUT') {
                console.log("[useUser] Usuario cerró sesión");
                setUser(null);
            }
        });

        // Limpiar suscripción al desmontar
        return () => {
            console.log("[useUser] Limpiando suscripción de autenticación");
            subscription.unsubscribe();
        };
    }, []);

    return { user, isLoading, error };
} 