"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { ArrowLeft, Save, Loader2 } from "lucide-react";
import { Database } from "@/lib/database.types";

type Role = Database['public']['Tables']['roles']['Row'];

// Interface for Vendor data needed for the dropdown
interface VendorOption {
  id: string;
  name: string;
}

// Función simple para validar formato básico de email
const isValidEmail = (email: string): boolean => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};

export default function NewUser() {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [loadingRoles, setLoadingRoles] = useState(true);
  const [roles, setRoles] = useState<Role[]>([]);
  const [vendors, setVendors] = useState<VendorOption[]>([]);
  const [loadingVendors, setLoadingVendors] = useState(true);
  const [formData, setFormData] = useState({
    first_name: "",
    last_name: "",
    email: "",
    password: "",
    confirm_password: "",
    vendor_id: "",
    role_id: "",
  });
  const [emailError, setEmailError] = useState("");

  // Fetch roles
  useEffect(() => {
    const fetchRolesData = async () => {
      setLoadingRoles(true);
      try {
        // Fetch roles from API instead of direct client
        const response = await fetch('/api/admin/roles');
        if (!response.ok) {
          throw new Error('Failed to fetch roles');
        }
        const { data } = await response.json();
        // Asignar un tipo explícito a 'r' en el filter si es necesario
        setRoles(data?.filter((r: Role) => r.name !== 'admin') || []);
      } catch (error) {
        console.error("Error fetching roles:", error);
        toast({
          title: "Error",
          description: "No se pudieron cargar los roles. Intente de nuevo.",
          variant: "destructive",
        });
      } finally {
        setLoadingRoles(false);
      }
    };
    fetchRolesData();
  }, [toast]);

  // Fetch vendors
  useEffect(() => {
    async function fetchVendors() {
      setLoadingVendors(true);
      try {
        const response = await fetch('/api/admin/vendors');
        if (!response.ok) {
          throw new Error('Failed to fetch vendors');
        }
        const { data } = await response.json();
        setVendors(data || []);
      } catch (error) {
        console.error("Error fetching vendors:", error);
        toast({
          title: "Error",
          description: "No se pudieron cargar las empresas. Intente de nuevo.",
          variant: "destructive",
        });
      } finally {
        setLoadingVendors(false);
      }
    }
    fetchVendors();
  }, [toast]);

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));

    // Validar email al cambiar
    if (field === 'email') {
      if (!isValidEmail(value)) {
        setEmailError("Por favor, ingrese un correo electrónico válido.");
      } else {
        setEmailError("");
      }
    }
  };

  const handleVendorChange = (value: string) => {
    setFormData((prev) => ({
      ...prev,
      vendor_id: value,
    }));
  };

  const handleRoleChange = (value: string) => {
    setFormData((prev) => ({
      ...prev,
      role_id: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setEmailError("");

    // --- Validaciones ---
    if (!formData.first_name || !formData.last_name || !formData.email || !formData.password || !formData.role_id || !formData.vendor_id) {
      toast({
        title: "Campos Incompletos",
        description: "Por favor, complete todos los campos obligatorios.",
        variant: "destructive",
      });
      return;
    }
    if (!isValidEmail(formData.email)) {
      setEmailError("Por favor, ingrese un correo electrónico válido.");
      toast({ title: "Error", description: "Correo electrónico inválido.", variant: "destructive" });
      return;
    }
    if (formData.password !== formData.confirm_password) {
      toast({ title: "Error", description: "Las contraseñas no coinciden.", variant: "destructive" });
      return;
    }
    if (formData.password.length < 6) {
      toast({ title: "Error", description: "La contraseña debe tener al menos 6 caracteres.", variant: "destructive" });
      return;
    }
    // --- Fin Validaciones ---

    setLoading(true);

    try {
      // Construir payload para la API
      const payload = {
        email: formData.email,
        password: formData.password,
        // Datos adicionales para perfil y usuario
        profileData: {
          first_name: formData.first_name,
          last_name: formData.last_name,
        },
        vendor_id: formData.vendor_id,
        role_id: formData.role_id,
      };

      // Llamar a la API POST
      const response = await fetch('/api/admin/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Error ${response.status} al crear usuario`);
      }

      toast({
        title: "Usuario Creado",
        description: "El usuario ha sido creado exitosamente. Revisa el correo para confirmar.", // O mensaje apropiado
      });

      router.push('/users'); // Redirigir a la lista de usuarios

    } catch (error: any) {
      console.error('Error al crear usuario:', error);
      toast({
        title: "Error al Crear Usuario",
        description: error.message || "No se pudo crear el usuario. Intente de nuevo.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center gap-4">
        <Button
          variant="outline"
          size="icon"
          onClick={() => router.push('/users')}
          className="gap-2"
          aria-label="Volver"
        >
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <h1 className="text-3xl font-bold">Nuevo Usuario</h1>
      </div>

      <Card>
        <form onSubmit={handleSubmit}>
          <CardHeader>
            <CardTitle>Información del Usuario</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="first_name">Nombres</Label>
                <Input
                  id="first_name"
                  required
                  value={formData.first_name}
                  onChange={(e) => handleChange("first_name", e.target.value)}
                  placeholder="Nombres"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="last_name">Apellidos</Label>
                <Input
                  id="last_name"
                  required
                  value={formData.last_name}
                  onChange={(e) => handleChange("last_name", e.target.value)}
                  placeholder="Apellidos"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Correo Electrónico</Label>
                <Input
                  id="email"
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => handleChange("email", e.target.value)}
                  placeholder="correo@ejemplo.com"
                />
                {emailError && <p className="text-sm text-destructive">{emailError}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Contraseña</Label>
                <Input
                  id="password"
                  type="password"
                  required
                  value={formData.password}
                  onChange={(e) => handleChange("password", e.target.value)}
                  placeholder="Contraseña (mínimo 6 caracteres)"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm_password">Confirmar Contraseña</Label>
                <Input
                  id="confirm_password"
                  type="password"
                  required
                  value={formData.confirm_password}
                  onChange={(e) => handleChange("confirm_password", e.target.value)}
                  placeholder="Confirmar contraseña"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="role_id">Rol</Label>
                <Select
                  value={formData.role_id}
                  onValueChange={handleRoleChange}
                  disabled={loadingRoles}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder={loadingRoles ? "Cargando roles..." : "Seleccionar rol"} />
                  </SelectTrigger>
                  <SelectContent>
                    {loadingRoles ? (
                      <SelectItem value="loading" disabled>Cargando roles...</SelectItem>
                    ) : (
                      roles.map(role => (
                        <SelectItem key={role.id} value={role.id}>
                          {role.name}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="vendor_id">Empresa</Label>
                <Select
                  value={formData.vendor_id}
                  onValueChange={handleVendorChange}
                  disabled={loadingVendors}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder={loadingVendors ? "Cargando empresas..." : "Seleccionar empresa"} />
                  </SelectTrigger>
                  <SelectContent>
                    {loadingVendors ? (
                      <SelectItem value="loading" disabled>Cargando empresas...</SelectItem>
                    ) : (
                      vendors.map(vendor => (
                        <SelectItem key={vendor.id} value={vendor.id}>
                          {vendor.name}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
          <CardFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push('/users')}
              className="mr-auto"
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={loading} className="gap-2">
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
              {loading ? "Guardando..." : "Guardar Usuario"}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}