"use client";

import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import type { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '../database.types';

// Singleton para el cliente de Supabase
let supabaseInstance: SupabaseClient<Database> | null = null;

/**
 * Cliente de Supabase para componentes del lado del cliente.
 * Configurado para usar autenticación basada en cookies.
 * Implementa patrón singleton para evitar múltiples instancias.
 * 
 * @returns SupabaseClient configurado con opciones para manejo de sesión
 */
export const createClient = (): SupabaseClient<Database> => {
    if (supabaseInstance) {
        return supabaseInstance;
    }

    // Crear cliente con la configuración por defecto (Next.js se encarga de configurar las cookies)
    supabaseInstance = createClientComponentClient<Database>();

    // Inicializar sesión al crear cliente - mejora la experiencia en SSR
    initSession(supabaseInstance);

    return supabaseInstance;
};

/**
 * Inicializa la sesión del cliente para evitar el error AuthSessionMissingError
 * Se usa internamente al crear el cliente
 */
async function initSession(client: SupabaseClient<Database>) {
    try {
        // Esto fuerza a Supabase a cargar la sesión desde las cookies
        // y previene el error AuthSessionMissingError
        await client.auth.getSession();
    } catch (err) {
        console.warn("[Supabase Client] Error al inicializar sesión:", err);
        // No rearroja el error para evitar problemas en renderizado
    }
}

// Cliente por defecto para uso directo (singleton)
export const supabase = createClient();

/**
 * Verifica si el usuario está autenticado usando getUser directamente
 * Más confiable que getSession en Next.js App Router
 */
export async function isAuthenticated(): Promise<boolean> {
    try {
        const client = createClient();
        // Primero verificar sesión para inicializar
        const { data: sessionData } = await client.auth.getSession();
        if (sessionData?.session) {
            return true;
        }

        // Como respaldo, verificar usuario
        const { data: { user }, error } = await client.auth.getUser();
        return !!user && !error;
    } catch (err) {
        console.error("[isAuthenticated] Error:", err);
        return false;
    }
}

/**
 * Obtiene el ID del usuario autenticado o null si no hay usuario
 */
export async function getCurrentUserId(): Promise<string | null> {
    try {
        const client = createClient();
        // Primero intentar con getSession
        const { data: sessionData } = await client.auth.getSession();
        if (sessionData?.session?.user) {
            return sessionData.session.user.id;
        }

        // Si falla, usar getUser como respaldo
        const { data: { user } } = await client.auth.getUser();
        return user?.id || null;
    } catch (err) {
        console.error("[getCurrentUserId] Error:", err);
        return null;
    }
}