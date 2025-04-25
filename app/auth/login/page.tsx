"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { useToast } from "@/components/ui/use-toast"
import { signInWithPasswordAction } from "../actions"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { useRouter } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import { Loader2, Lock, Mail } from "lucide-react"

// Limpiar cualquier resto de autenticación anterior
const cleanupAuth = () => {
  if (typeof window !== "undefined") {
    localStorage.clear() // Limpieza completa
  }
}

// Variable para controlar cuándo se realizó el último intento de login
let lastLoginAttempt = 0
const MIN_RETRY_DELAY = 2000 // 2 segundos entre intentos

export default function Login() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [retryCount, setRetryCount] = useState(0)
  const { toast } = useToast()
  const router = useRouter()
  const supabase = createClientComponentClient()

  useEffect(() => {
    cleanupAuth()

    // Limitar la frecuencia de la verificación de sesión para evitar rate limits
    const checkSession = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession()
        if (session) {
          router.push("/dashboard")
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
    const now = Date.now()
    const timeSinceLastAttempt = now - lastLoginAttempt

    if (timeSinceLastAttempt < MIN_RETRY_DELAY) {
      const waitTime = Math.ceil((MIN_RETRY_DELAY - timeSinceLastAttempt) / 1000)
      toast({
        title: "Por favor espera",
        description: `Demasiados intentos. Intenta nuevamente en ${waitTime} segundos.`,
        variant: "destructive",
      })
      return
    }

    // Registrar el momento del intento
    lastLoginAttempt = now

    setIsLoading(true)
    setError(null)

    const formData = new FormData(event.currentTarget)

    try {
      const result = await signInWithPasswordAction(formData)

      if (result?.error) {
        // Manejo específico para rate limit
        if (result.error.includes("rate limit")) {
          setRetryCount((prev) => prev + 1)
          const delay = Math.min(10, retryCount + 1) * 1000 // Espera creciente: 1s, 2s, 3s...

          toast({
            title: "Límite de solicitudes alcanzado",
            description: `El servidor está ocupado. Espera ${Math.round(delay / 1000)} segundos antes de intentar nuevamente.`,
            variant: "destructive",
          })

          setTimeout(() => {
            setIsLoading(false)
          }, delay)

          return
        }

        throw new Error(result.error)
      }

      // Resetear contador de reintentos al tener éxito
      setRetryCount(0)

      // Actualizar la sesión en el cliente después de iniciar sesión correctamente
      try {
        await supabase.auth.getSession()
      } catch (sessionError) {
        console.error("Error al actualizar sesión después de login:", sessionError)
      }

      // Si tenemos un usuario y una URL de redirección, redirigir
      if (result?.user && result?.redirectTo) {
        console.log("Login exitoso, redirigiendo a:", result.redirectTo)
        router.push(result.redirectTo)
        router.refresh()
        return
      }

      // En cualquier caso, intentar navegar al dashboard
      router.push("/dashboard")
    } catch (err: any) {
      console.error("Error en proceso de login:", err)

      // Manejo específico para errores de rate limit detectados en la excepción
      if (err.message && err.message.toLowerCase().includes("rate limit")) {
        setError("Has excedido el límite de intentos. Por favor espera unos minutos antes de intentar nuevamente.")

        // Incrementar contador de reintentos para manejar backoff
        setRetryCount((prev) => prev + 1)
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
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-full max-w-md p-6 space-y-5 bg-white rounded-xl shadow-lg border border-slate-100">
        <div className="text-center">
          <div className="flex justify-center">
            <div className="relative w-20 h-20 bg-slate-50 rounded-full p-3 shadow-sm">
              <Image
                src="/ccmin-logo.png"
                alt="Logo"
                width={120}
                height={120}
                priority
                className="object-contain"
              />
            </div>
          </div>
          <h2 className="mt-6 text-3xl font-bold text-slate-800">Inicia sesión</h2>
          <p className="mt-2 text-sm text-slate-500">Accede a tu cuenta para continuar</p>
        </div>

        <form className="mt-5 space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-5">
            <div className="relative">
              <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-1">
                Correo electrónico
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-slate-400" />
                </div>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  className="block w-full pl-10 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg shadow-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all duration-200 sm:text-sm"
                  placeholder="correo@ejemplo.com"
                />
              </div>
            </div>

            <div className="relative">
              <label htmlFor="password" className="block text-sm font-medium text-slate-700 mb-1">
                Contraseña
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-slate-400" />
                </div>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  className="block w-full pl-10 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg shadow-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all duration-200 sm:text-sm"
                  placeholder="••••••••"
                />
              </div>
            </div>
          </div>

          {error && <div className="text-sm text-red-600 bg-red-50 p-3 rounded-lg border border-red-100">{error}</div>}

          <div className="pt-2">
            <button
              type="submit"
              disabled={isLoading}
              className="group relative w-full flex justify-center py-2.5 px-4 border border-transparent text-sm font-medium rounded-lg text-white bg-teal-600 hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-sm"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Iniciando sesión...
                </>
              ) : (
                  "Iniciar sesión"
              )}
            </button>
          </div>

          <div className="text-center text-sm text-slate-500 mt-2">
            <Link href="#" className="font-medium text-teal-600 hover:text-teal-500 transition-colors">
              ¿Olvidaste tu contraseña?
            </Link>
          </div>
        </form>

        <div className="relative my-3">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-slate-200"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-white text-slate-500">¿No tienes una cuenta?</span>
          </div>
        </div>

        <div className="text-center">
          <Link
            href="/register"
            className="inline-flex justify-center py-2 px-4 border border-slate-300 shadow-sm text-sm font-medium rounded-lg text-slate-700 bg-white hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 transition-all duration-200"
          >
            Crear cuenta
          </Link>
        </div>
      </div>
    </div>
  )
}
