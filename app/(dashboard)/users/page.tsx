"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, UserCircle, PencilIcon, AlertCircle, Trash2 } from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { format } from "date-fns";
import { useToast } from "@/components/ui/use-toast";
import { type User } from "@/lib/services/user-service";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export default function Users() {
  const router = useRouter();
  const { toast } = useToast();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState("all");
  const [processing, setProcessing] = useState(false);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const response = await fetch('/api/admin/users');
        
        if (!response.ok) {
            const errorData = await response.json();
            if (response.status === 403) {
                setError(errorData.error || "No tienes permisos para acceder a esta sección.");
            } else if (response.status === 401) {
                setError("Tu sesión ha expirado. Por favor, inicia sesión nuevamente.");
                router.push('/auth/login');
            } else {
                throw new Error(errorData.error || "Error al cargar usuarios desde la API");
            }
            setUsers([]);
        } else {
            const { data } = await response.json();
            setUsers(data || []);
        }
        
      } catch (error: any) {
         console.error("Fetch users error:", error);
         setError("Ocurrió un error al cargar los usuarios. Por favor, intenta nuevamente.");
         toast({
            title: "Error de Carga",
            description: error.message || "No se pudieron cargar los usuarios.",
            variant: "destructive",
          });
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, [router, toast]);

  const handleDeactivateUser = async () => {
    if (!userToDelete) return;
    
    setProcessing(true);
    try {
      const response = await fetch(`/api/admin/users/${userToDelete.id}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ isActive: false })
      });
      
      if (!response.ok) {
          const errorData = await response.json();
          if (response.status === 403) {
              throw new Error(errorData.error || "No tienes permisos para desactivar usuarios.");
          } else if (response.status === 401) {
              throw new Error("Tu sesión ha expirado. Por favor, inicia sesión nuevamente.");
          } else if (response.status === 400) {
              throw new Error(errorData.error || "Error en la solicitud para desactivar usuario.");
          } else {
              throw new Error(errorData.error || "Error desconocido al desactivar usuario.");
          }
      }
      
      setUsers(users.map(u => 
        u.id === userToDelete.id ? { ...u, is_active: false, updated_at: new Date().toISOString() } : u
      ));
      
      toast({
        title: "Usuario desactivado",
        description: `El usuario ${userToDelete.email} ha sido desactivado exitosamente.`,
      });
      setUserToDelete(null);

    } catch (error: any) {
      console.error("Deactivate user error:", error);
      toast({
        title: "Error al Desactivar",
        description: error.message || "No se pudo desactivar el usuario.",
        variant: "destructive",
      });
       if (error.message.includes("sesión ha expirado")) {
           router.push('/auth/login');
       }
    } finally {
      setProcessing(false);
    }
  };

  const getRoleLabel = (role: User['role']) => {
    if (!role?.name) return 'Sin rol';
    
    switch (role.name) {
      case 'admin':
        return 'Administrador';
      case 'evaluator':
        return 'Evaluador';
      case 'supplier':
        return 'Proveedor';
      default:
        return role.name;
    }
  };

  const getInitials = (email: string) => {
    return email
      .split('@')[0]
      .split('.')
      .map(part => part.charAt(0).toUpperCase())
      .join('');
  };

  const filteredUsers = users.filter(user => {
    if (filter === "all") return true;
    if (filter === "active") return user.is_active;
    if (filter === "inactive") return !user.is_active;
    if (!user.role?.name) return false;
    return user.role.name === filter;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-muted-foreground">Cargando usuarios...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error de Acceso</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Usuarios</h1>
          <p className="text-muted-foreground">
            Gestiona los usuarios del sistema
          </p>
        </div>
        <Button 
          className="gap-2"
          onClick={() => router.push('/users/new')}
        >
          <Plus className="w-4 h-4" /> Nuevo Usuario
        </Button>
      </div>

      <div className="flex justify-between items-center">
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Filtrar usuarios" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los usuarios</SelectItem>
            <SelectItem value="active">Usuarios activos</SelectItem>
            <SelectItem value="inactive">Usuarios inactivos</SelectItem>
            <SelectItem value="admin">Administradores</SelectItem>
            <SelectItem value="evaluator">Evaluadores</SelectItem>
            <SelectItem value="supplier">Proveedores</SelectItem>
          </SelectContent>
        </Select>
        <p className="text-sm text-muted-foreground">
          {filteredUsers.length} usuarios encontrados
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Lista de Usuarios</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredUsers.map((user) => (
              <div
                key={user.id}
                className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <Avatar className="h-10 w-10">
                    {user.profile?.avatar_url ? (
                      <AvatarImage src={user.profile.avatar_url} alt={user.email} />
                    ) : (
                      <AvatarFallback>{getInitials(user.email)}</AvatarFallback>
                    )}
                  </Avatar>
                  <div>
                    <p className="font-medium">{user.email}</p>
                    <p className="text-sm text-muted-foreground">
                      {user.profile?.company_name || 'Sin empresa'}
                    </p>
                    <div className="text-xs text-muted-foreground mt-1">
                      {user.contact_phone || user.profile?.contact_phone || 'Sin teléfono'}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex flex-col items-end text-sm">
                    <span className="font-medium">{getRoleLabel(user.role)}</span>
                    <span className="text-xs text-muted-foreground">
                      Registro: {format(new Date(user.created_at), 'dd/MM/yyyy')}
                    </span>
                    {user.last_sign_in_at && (
                      <span className="text-xs text-muted-foreground">
                        Último acceso: {format(new Date(user.last_sign_in_at), 'dd/MM/yyyy HH:mm')}
                      </span>
                    )}
                  </div>
                  <span
                    className={`px-2 py-1 rounded-full text-xs ${
                      user.is_active
                        ? "bg-green-100 text-green-700"
                        : "bg-orange-100 text-orange-700"
                    }`}
                  >
                    {user.is_active ? "Activo" : "Inactivo"}
                  </span>
                  <div className="flex gap-2">
                    <Button 
                      variant="ghost" 
                      size="icon"
                      onClick={() => router.push(`/users/${user.id}/edit`)}
                    >
                      <PencilIcon className="w-4 h-4" />
                    </Button>
                    {user.is_active && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            disabled={processing && userToDelete?.id === user.id}
                            onClick={() => setUserToDelete(user)}
                          >
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>¿Desactivar Usuario?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Esta acción marcará al usuario {userToDelete?.email} como inactivo. 
                              No podrá iniciar sesión hasta ser reactivado. ¿Estás seguro?
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel onClick={() => setUserToDelete(null)}>Cancelar</AlertDialogCancel>
                            <AlertDialogAction onClick={handleDeactivateUser} disabled={processing}>
                              {processing ? "Desactivando..." : "Confirmar Desactivación"}
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}