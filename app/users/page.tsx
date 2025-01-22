"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, UserCircle, PencilIcon } from "lucide-react";
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

export default function Users() {
  const router = useRouter();
  const { toast } = useToast();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const { data, error } = await getUsers();
        
        if (error) throw error;
        if (data) setUsers(data);
      } catch (error) {
        toast({
          title: "Error",
          description: "No se pudieron cargar los usuarios.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, [toast]);

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
    const name = email.split('@')[0].replace('.', ' ');
    return name
      .split(' ')
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
    return <div className="flex items-center justify-center min-h-screen">
      <p className="text-muted-foreground">Cargando usuarios...</p>
    </div>;
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
                    <AvatarImage src={user.avatar_url} alt={user.contact_email} />
                    <AvatarFallback>{getInitials(user.contact_email)}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">{user.contact_email}</p>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <span>{user.business_details.position}</span>
                      <span>•</span>
                      <span>{user.department}</span>
                    </div>
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
                    <span className="text-xs text-muted-foreground">
                      Último acceso: {format(new Date(user.last_login), 'dd/MM/yyyy HH:mm')}
                    </span>
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