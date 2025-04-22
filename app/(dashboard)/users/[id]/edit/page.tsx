"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { type User } from "@/lib/services/user-service";
import UserEditForm from "@/components/users/UserEditForm";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

export default function EditUserPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { toast } = useToast();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const response = await fetch(`/api/admin/users/${params.id}`);
        
        if (!response.ok) {
            const errorData = await response.json();
             if (response.status === 404) {
                 setError('Usuario no encontrado.');
             } else if (response.status === 403) {
                 setError(errorData.error || "No tienes permisos para ver este usuario.");
             } else if (response.status === 401) {
                 setError("Tu sesión ha expirado. Por favor, inicia sesión nuevamente.");
                 router.push('/auth/login');
             } else {
                 throw new Error(errorData.error || "Error al cargar usuario desde la API");
             }
             setUser(null);
        } else {
            const { data } = await response.json();
            setUser(data || null);
        }

      } catch (error: any) {
        console.error("Error al cargar el usuario:", error);
        setError("No se pudo cargar la información del usuario. " + error.message);
        toast({
          title: "Error de Carga",
          description: error.message || "No se pudo cargar la información del usuario",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, [params.id, toast, router]);

  if (loading) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            onClick={() => router.back()}
            className="gap-2"
          >
            <ArrowLeft className="w-4 h-4" /> Volver
          </Button>
          <h1 className="text-3xl font-bold">Editar Usuario</h1>
        </div>
        <div className="flex justify-center items-center p-12">
          <p className="text-muted-foreground">Cargando información del usuario...</p>
        </div>
      </div>
    );
  }

  if (error || !user) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            onClick={() => router.back()}
            className="gap-2"
          >
            <ArrowLeft className="w-4 h-4" /> Volver
          </Button>
          <h1 className="text-3xl font-bold">Error</h1>
        </div>
        <div className="p-6 bg-destructive/10 rounded-md text-destructive">
          <p>{error || "No se pudo encontrar el usuario solicitado"}</p>
          <Button 
            className="mt-4" 
            onClick={() => router.push("/users")}
          >
            Volver al listado de usuarios
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          onClick={() => router.back()}
          className="gap-2"
        >
          <ArrowLeft className="w-4 h-4" /> Volver
        </Button>
        <h1 className="text-3xl font-bold">Editar Usuario</h1>
      </div>
      <UserEditForm user={user} />
    </div>
  );
} 