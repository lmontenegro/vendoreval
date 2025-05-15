"use client";

import { createClient, ensureSession } from "./supabase/client";

/**
 * Función para probar el estado de la sesión
 * Útil para depurar problemas de autenticación
 */
export async function testAuthSession() {
  const supabase = createClient();

  // 1. Verificar cookie directamente
  let authCookie = '';
  if (typeof document !== 'undefined') {
    const cookies = document.cookie.split(';');
    const authCookieObj = cookies.find(c => c.trim().startsWith('sb-pagveoabnaiztudqglvh-auth-token='));
    if (authCookieObj) {
      authCookie = authCookieObj.trim();
    }
  }

  // 2. Intentar obtener la sesión directamente
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();

  // 3. Intentar refrescar la sesión
  const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();

  // 4. Usar la función ensureSession
  const ensuredSession = await ensureSession();

  // 5. Obtener usuario actual
  const { data: userData, error: userError } = await supabase.auth.getUser();

  return {
    hasCookie: !!authCookie,
    cookieName: authCookie ? authCookie.split('=')[0] : null,
    directSession: {
      exists: !!sessionData?.session,
      error: sessionError?.message || null
    },
    refreshedSession: {
      exists: !!refreshData?.session,
      error: refreshError?.message || null
    },
    ensuredSession: {
      exists: !!ensuredSession,
      userId: ensuredSession?.user?.id || null
    },
    currentUser: {
      exists: !!userData?.user,
      id: userData?.user?.id || null,
      email: userData?.user?.email || null,
      error: userError?.message || null
    }
  };
} 