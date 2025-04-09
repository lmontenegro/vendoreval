"use client";

import { createClient } from '@supabase/supabase-js'
import { Database } from './database.types';

// Obtener variables de entorno para la conexión a Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// Verificar que las variables de entorno estén definidas
if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Error: Supabase URL or Anonymous Key is not defined in environment variables')
}

// Crear y exportar el cliente de Supabase
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
    auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storage: typeof window !== 'undefined' ? window.localStorage : undefined,
    },
    global: {
        fetch: fetch,
    },
})