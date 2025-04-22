'use client';

import { useRouter } from 'next/navigation';
import { useState, useEffect, ReactNode } from 'react';
import { useUser } from '@/lib/hooks/use-user';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

interface AuthGuardProps {
  children: ReactNode;
  requiredModule?: string;
  requiredAction?: string;
  requiredRoles?: string[];
  fallbackPath?: string;
}

export default function AuthGuard({
  children,
  requiredModule,
  requiredAction,
  requiredRoles,
  fallbackPath = '/auth/login'
}: AuthGuardProps) {
  const router = useRouter();
  const { user, isLoading: userLoading } = useUser();
  const { toast } = useToast();

  // Estados para controlar el flujo
  const [isChecking, setIsChecking] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);

  useEffect(() => {
    async function checkAccess() {
      // Si el hook de usuario está cargando, esperar
      if (userLoading) {
        return;
      }

      // Si no hay usuario después de cargar, redirigir
      if (!user) {
        console.log('AuthGuard: No user found, redirecting to login.');
        router.push(fallbackPath);
        setIsChecking(false);
        return;
      }

      // Si hay usuario, verificar permisos y roles si son requeridos
      let hasRequiredPermission = true;
      let hasRequiredRole = true;

      try {
        // Verificar Permiso si es necesario
        if (requiredModule && requiredAction) {
          const permResponse = await fetch('/api/auth/check-permission', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ module: requiredModule, action: requiredAction })
          });

          if (permResponse.status === 403) { // Específicamente buscar 403
            hasRequiredPermission = false;
            console.log(`AuthGuard: Permission denied for ${requiredModule}:${requiredAction}`);
          } else if (!permResponse.ok) {
             // Otros errores de la API de permisos
            const errorData = await permResponse.json();
            throw new Error(errorData.error || 'Error checking permissions');
          }
          // Si es 200 OK, hasRequiredPermission sigue true
        }

        // Verificar Rol si es necesario y si aún tiene permiso (optimización)
        if (hasRequiredPermission && requiredRoles && requiredRoles.length > 0) {
          const roleResponse = await fetch('/api/auth/user-role');

          if (!roleResponse.ok) {
            if (roleResponse.status === 401) {
              // El usuario podría haberse deslogueado entretanto
              console.log('AuthGuard: User unauthenticated during role check, redirecting.');
              router.push(fallbackPath);
              setIsChecking(false);
              return;
            }
            const errorData = await roleResponse.json();
            throw new Error(errorData.error || 'Error fetching user role');
          }

          const { roleName } = await roleResponse.json();
          if (!requiredRoles.includes(roleName)) {
            hasRequiredRole = false;
            console.log(`AuthGuard: Role \'${roleName}\' not in required roles [${requiredRoles.join(', ')}]`);
          }
        }

        // Determinar autorización final
        const authorized = hasRequiredPermission && hasRequiredRole;
        setIsAuthorized(authorized);

        if (!authorized) {
          console.log('AuthGuard: Access denied, redirecting...');
          // Opcional: Mostrar un toast antes de redirigir
          toast({
              title: "Acceso Denegado",
              description: "No tienes los permisos o el rol necesario para acceder a esta página.",
              variant: "destructive",
          });
          // Dar tiempo a que se vea el toast antes de redirigir
          setTimeout(() => router.push('/dashboard'), 1500); // Redirigir a dashboard o una página de "acceso denegado"
        }

      } catch (error: any) {
        console.error("AuthGuard: Error during access check:", error);
        toast({
            title: "Error de Verificación",
            description: error.message || "Ocurrió un error al verificar tu acceso.",
            variant: "destructive",
        });
        setIsAuthorized(false); // Asumir no autorizado en caso de error
        router.push('/dashboard'); // Redirigir a una página segura
      } finally {
        setIsChecking(false); // Marcar la verificación como completa
      }
    }

    checkAccess();

  }, [user, userLoading, router, requiredModule, requiredAction, requiredRoles, fallbackPath, toast]);

  // Mostrar Loader mientras el hook de usuario carga o mientras se verifica el acceso
  if (userLoading || isChecking) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2">Verificando acceso...</span>
      </div>
    );
  }

  // Si está autorizado después de verificar, mostrar contenido
  if (isAuthorized) {
    return <>{children}</>;
  }

  // Si no está autorizado (y ya no está cargando/verificando), no mostrar nada 
  // (la redirección ya se inició en el useEffect)
  return null;
} 