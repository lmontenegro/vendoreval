"use client";

import React, { useState, useEffect } from 'react'
import { toast, useToast } from "@/components/ui/use-toast"
import { signInWithPasswordAction } from '../actions'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { Loader2 } from 'lucide-react'

// Limpiar cualquier resto de autenticación anterior
const cleanupAuth = () => {
  if (typeof window !== 'undefined') {
    localStorage.clear(); // Limpieza completa
  }
}

// Variable para controlar cuándo se realizó el último intento de login
let lastLoginAttempt = 0;
const MIN_RETRY_DELAY = 2000; // 2 segundos entre intentos

export default function Login() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [retryCount, setRetryCount] = useState(0)
  const { toast } = useToast()
  const router = useRouter()
  const supabase = createClientComponentClient()

  useEffect(() => {
    cleanupAuth();
    
    // Limitar la frecuencia de la verificación de sesión para evitar rate limits
    const checkSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (session) {
          router.push('/dashboard')
        }
      } catch (err) {
        console.error("Error al verificar sesión inicial:", err)
        // No mostrar errores al usuario en este punto
      }
    }
    
    checkSession()
  }, [router, supabase])
  
  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    
    // Verificar si hay que esperar antes de intentar nuevamente
    const now = Date.now();
    const timeSinceLastAttempt = now - lastLoginAttempt;
    
    if (timeSinceLastAttempt < MIN_RETRY_DELAY) {
      const waitTime = Math.ceil((MIN_RETRY_DELAY - timeSinceLastAttempt) / 1000);
      toast({
        title: "Por favor espera",
        description: `Demasiados intentos. Intenta nuevamente en ${waitTime} segundos.`,
        variant: "destructive"
      });
      return;
    }
    
    // Registrar el momento del intento
    lastLoginAttempt = now;
    
    setIsLoading(true)
    setError(null)
    
    const formData = new FormData(event.currentTarget)
    
    try {
      const result = await signInWithPasswordAction(formData)
      
      if (result?.error) {
        // Manejo específico para rate limit
        if (result.error.includes("rate limit")) {
          setRetryCount(prev => prev + 1);
          const delay = Math.min(10, retryCount + 1) * 1000; // Espera creciente: 1s, 2s, 3s...
          
          toast({
            title: "Límite de solicitudes alcanzado",
            description: `El servidor está ocupado. Espera ${Math.round(delay/1000)} segundos antes de intentar nuevamente.`,
            variant: "destructive"
          });
          
          setTimeout(() => {
            setIsLoading(false);
          }, delay);
          
          return;
        }
        
        throw new Error(result.error)
      }
      
      // Resetear contador de reintentos al tener éxito
      setRetryCount(0);
      
      // Actualizar la sesión en el cliente después de iniciar sesión correctamente
      try {
        await supabase.auth.getSession();
      } catch (sessionError) {
        console.error("Error al actualizar sesión después de login:", sessionError);
      }
      
      // Si tenemos un usuario y una URL de redirección, redirigir
      if (result?.user && result?.redirectTo) {
        console.log("Login exitoso, redirigiendo a:", result.redirectTo);
        router.push(result.redirectTo);
        router.refresh();
        return;
      }
      
      // En cualquier caso, intentar navegar al dashboard
      router.push('/dashboard');
      
    } catch (err: any) {
      console.error("Error en proceso de login:", err)
      
      // Manejo específico para errores de rate limit detectados en la excepción
      if (err.message && err.message.toLowerCase().includes("rate limit")) {
        setError("Has excedido el límite de intentos. Por favor espera unos minutos antes de intentar nuevamente.");
        
        // Incrementar contador de reintentos para manejar backoff
        setRetryCount(prev => prev + 1);
      } else {
        setError(err.message || "Ocurrió un error durante el inicio de sesión")
      }
      
      toast({
        variant: "destructive",
        title: "Error de acceso",
        description: err.message || "Ocurrió un error durante el inicio de sesión",
      })
    } finally {
      setIsLoading(false)
    }
  }
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="w-full max-w-md p-8 space-y-8 bg-white rounded-lg shadow-md">
        <div className="text-center">
          <div className="flex justify-center">
            <Image src="/logo.svg" alt="Logo" width={120} height={120} priority />
          </div>
          <h2 className="mt-6 text-3xl font-bold text-gray-900">Inicia sesión</h2>
          <p className="mt-2 text-sm text-gray-600">
            Accede a tu cuenta para continuar
          </p>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-6 rounded-md shadow-sm">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Correo electrónico
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                placeholder="correo@ejemplo.com"
              />
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Contraseña
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                placeholder="••••••••"
              />
            </div>
          </div>

          {error && (
            <div className="text-sm text-red-600">{error}</div>
          )}

          <div>
            <button
              type="submit"
              disabled={isLoading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Iniciando sesión...
                </>
              ) : (
                'Iniciar sesión'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}