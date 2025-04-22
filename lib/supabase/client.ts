"use client";

import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import type { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '../database.types';

/**
 * Cliente de Supabase para componentes del lado del cliente.
 * Configurado para usar autenticación basada en cookies.
 */
export const createClient = () => {
    return createClientComponentClient<Database>({
        cookieOptions: {
            name: 'sb-pagveoabnaiztudqglvh-auth-token', // Nombre específico de la cookie
            domain: typeof window !== 'undefined' ? window.location.hostname : '',
            path: '/',
            sameSite: 'lax',
            secure: process.env.NODE_ENV === 'production'
        }
    });
};

// Cliente por defecto para uso directo
export const supabase = createClient();