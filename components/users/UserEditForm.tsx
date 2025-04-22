"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { toast } from 'sonner';
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
import { ArrowLeft, Save, Loader2, Trash2 } from "lucide-react";
import { type User } from "@/lib/services/user-service";
import { Database } from "@/lib/database.types";
type Role = Database['public']['Tables']['roles']['Row'];
type Vendor = Database['public']['Tables']['vendors']['Row'];

interface EditableFormData {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  role_id: string | null;
  vendor_id: string | null;
  is_active: boolean;
}

interface UserEditFormProps {
  user: User;
}

export default function UserEditForm({ user }: UserEditFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  
  const [formData, setFormData] = useState<EditableFormData>({
    id: user.id,
    email: user.email ?? '',
    first_name: user.profile?.first_name ?? '',
    last_name: user.profile?.last_name ?? '',
    role_id: user.role_id ?? null,
    vendor_id: user.vendor_id ?? null,
    is_active: user.is_active ?? false,
  });

  const [roles, setRoles] = useState<Role[]>([]);
  const [loadingRoles, setLoadingRoles] = useState(true);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loadingVendors, setLoadingVendors] = useState(true);

  useEffect(() => {
    async function fetchFormData() {
      setLoadingRoles(true);
      setLoadingVendors(true);
      try {
        const [rolesResponse, vendorsResponse] = await Promise.all([
          fetch('/api/admin/roles'),
          fetch('/api/admin/vendors')
        ]);

        if (!rolesResponse.ok) throw new Error('Error fetching roles');
        const rolesData = await rolesResponse.json();
        setRoles(rolesData.data?.filter((r: Role) => r.name !== 'admin') || []);

        if (!vendorsResponse.ok) throw new Error('Error fetching vendors');
        const vendorsData = await vendorsResponse.json();
        setVendors(vendorsData.data || []);

      } catch (error) {
        console.error("Error loading form data (roles/vendors):", error);
        toast.error("No se pudieron cargar las opciones para el formulario.");
      } finally {
        setLoadingRoles(false);
        setLoadingVendors(false);
      }
    }

    fetchFormData();
  }, []);

  const handleChange = (field: keyof EditableFormData, value: string | boolean) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleRoleChange = (value: string) => {
    setFormData(prev => ({ ...prev, role_id: value }));
  };

  const handleVendorChange = (value: string) => {
    setFormData(prev => ({ ...prev, vendor_id: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (!formData.first_name || !formData.last_name || !formData.role_id || !formData.vendor_id) {
      toast.error("Por favor, complete nombre, apellido, rol y empresa.");
      setLoading(false);
      return;
    }

    const updatePayload = {
      first_name: formData.first_name,
      last_name: formData.last_name,
      role_id: formData.role_id,
      vendor_id: formData.vendor_id,
      is_active: formData.is_active,
    };

    try {
      const response = await fetch(`/api/admin/users/${formData.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updatePayload),
      });

      const result = await response.json();

      if (!response.ok) {
          throw new Error(result.error || `Error ${response.status}: No se pudo actualizar el usuario.`);
      }

      toast.success("Usuario actualizado exitosamente.");
      router.push('/users');

    } catch (error: any) {
      console.error("Submit user error:", error);
      toast.error(error.message || "No se pudo actualizar el usuario.");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const response = await fetch(`/api/admin/users/${formData.id}`, {
        method: 'DELETE',
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || `Error ${response.status}: No se pudo eliminar el usuario.`);
      }

      toast.success(result.message || 'Usuario eliminado correctamente.');
      router.push('/users');

    } catch (error: any) {
      console.error('Error deleting user:', error);
      toast.error(error.message || 'Error de red al intentar eliminar el usuario.');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <form onSubmit={handleSubmit}>
          <CardHeader>
            <CardTitle>Información del Usuario</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="email">Correo Electrónico</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  disabled
                  className="bg-gray-100 dark:bg-gray-800"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="first_name">Nombres</Label>
                <Input
                  id="first_name"
                  required
                  value={formData.first_name}
                  onChange={(e) => handleChange('first_name', e.target.value)}
                  placeholder="Nombres del usuario"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="last_name">Apellidos</Label>
                <Input
                  id="last_name"
                  required
                  value={formData.last_name}
                  onChange={(e) => handleChange('last_name', e.target.value)}
                  placeholder="Apellidos del usuario"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="role_id">Rol</Label>
                <Select
                  value={formData.role_id || ''}
                  onValueChange={handleRoleChange}
                  disabled={loadingRoles}
                  required
                >
                  <SelectTrigger id="role_id">
                    <SelectValue placeholder={loadingRoles ? "Cargando roles..." : "Seleccionar rol"} />
                  </SelectTrigger>
                  <SelectContent>
                    {loadingRoles ? (
                      <SelectItem value="loading" disabled>Cargando...</SelectItem>
                    ) : (
                      roles.map(role => (
                        <SelectItem key={role.id} value={role.id}>
                          {role.name}
                        </SelectItem>
                      ))
                    )}
                    {!loadingRoles && roles.length === 0 && (
                        <SelectItem value="noroles" disabled>No hay roles disponibles</SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="vendor_id">Empresa</Label>
                <Select
                  value={formData.vendor_id || ''}
                  onValueChange={handleVendorChange}
                  disabled={loadingVendors}
                  required
                >
                  <SelectTrigger id="vendor_id">
                    <SelectValue placeholder={loadingVendors ? "Cargando empresas..." : "Seleccionar empresa"} />
                  </SelectTrigger>
                  <SelectContent>
                    {loadingVendors ? (
                      <SelectItem value="loading-vendors" disabled>Cargando...</SelectItem>
                    ) : (
                      vendors.map(vendor => (
                        <SelectItem key={vendor.id} value={vendor.id}>
                          {vendor.name}
                        </SelectItem>
                      ))
                    )}
                    {!loadingVendors && vendors.length === 0 && (
                        <SelectItem value="no-vendors" disabled>No hay empresas disponibles</SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-4 pt-2 md:col-span-2">
                <Label htmlFor="is_active" className="cursor-pointer">Usuario Activo</Label>
                <Switch 
                  id="is_active" 
                  checked={formData.is_active}
                  onCheckedChange={(checked) => handleChange('is_active', checked)}
                />
              </div>
            </div>
          </CardContent>
          <CardFooter className="justify-between">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                 <Button variant="destructive" type="button" disabled={isDeleting} className="gap-2">
                  {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="w-4 h-4" />} 
                  {isDeleting ? 'Eliminando...' : 'Eliminar Usuario'}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>¿Está seguro?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Esta acción no se puede deshacer. Se eliminará permanentemente el usuario
                    ({formData.email}) y todos sus datos asociados.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDelete} disabled={isDeleting} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                    {isDeleting ? 'Eliminando...' : 'Eliminar'}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

            <Button type="submit" disabled={loading || isDeleting} className="gap-2">
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="w-4 h-4 mr-2" />} 
              {loading ? "Guardando..." : "Guardar Cambios"}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
} 