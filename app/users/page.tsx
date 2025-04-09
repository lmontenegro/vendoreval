"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, UserCircle, PencilIcon, AlertCircle } from "lucide-react";
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
import { getUsers, type User } from "@/lib/services/user-service";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export default function Users() {
  const router = useRouter();
  const { toast } = useToast();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setError(null);
        const data = await getUsers();
        setUsers(data);
      } catch (error: any) {
        // Manejar diferentes tipos de errores
        if (error.message === "No hay sesión activa") {
          router.push('/auth/login');
          return;
        }
        
        if (error.message === "No tienes permisos para ver la lista de usuarios") {
          setError("No tienes permisos para acceder a esta sección. Por favor, contacta al administrador si crees que esto es un error.");
        } else {
          setError("Ocurrió un error al cargar los usuarios. Por favor, intenta nuevamente.");
          toast({
            title: "Error",
            description: error.message || "No se pudieron cargar los usuarios.",
            variant: "destructive",
          });
        }
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, [router, toast]);

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'admin':
        return 'Administrador';
      case 'evaluator':
        return 'Evaluador';
      case 'supplier':
        return 'Proveedor';
      default:
        return role;
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
    return user.role === filter;
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
                    <AvatarFallback>{getInitials(user.email)}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">{user.email}</p>
                    <p className="text-sm text-muted-foreground">
                      {user.company_name}
                    </p>
                    <div className="text-xs text-muted-foreground mt-1">
                      {user.contact_phone}
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
                  <Button 
                    variant="ghost" 
                    size="icon"
                    onClick={() => router.push(`/users/${user.id}`)}
                  >
                    <PencilIcon className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}