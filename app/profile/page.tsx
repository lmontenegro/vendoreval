"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { 
  Save, 
  UserCircle, 
  Building2, 
  Mail, 
  Phone, 
  Globe, 
  MapPin,
  Calendar,
  BarChart3
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface Profile {
  id: string;
  company_name: string;
  contact_email: string;
  contact_phone: string;
  role: string;
  created_at: string;
  business_details: {
    address?: string;
    website?: string;
    description?: string;
  };
  stats: {
    total_evaluations: number;
    completed_evaluations: number;
    average_rating: number;
  };
}

export default function Profile() {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);

  useEffect(() => {
    const fetchProfile = async () => {
      const supabase = createClient();
      
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        router.push('/auth/login');
        return;
      }

      // Mock profile data
      const mockProfile: Profile = {
        id: user.id,
        company_name: "Tech Solutions Inc.",
        contact_email: user.email || "user@example.com",
        contact_phone: "+1 (555) 123-4567",
        role: "admin",
        created_at: "2024-01-15T10:00:00Z",
        business_details: {
          address: "123 Business Ave, Tech City",
          website: "https://techsolutions.example.com",
          description: "Leading provider of enterprise solutions"
        },
        stats: {
          total_evaluations: 45,
          completed_evaluations: 38,
          average_rating: 4.7
        }
      };

      setProfile(mockProfile);
    };

    fetchProfile();
  }, [router, toast]);

  const handleChange = (field: string, value: string) => {
    if (!profile) return;

    if (field.includes('.')) {
      const [parent, child] = field.split('.');
      setProfile(prev => ({
        ...prev!,
        [parent]: {
          ...prev![parent as keyof Profile],
          [child]: value
        }
      }));
    } else {
      setProfile(prev => ({
        ...prev!,
        [field]: value
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    setLoading(true);

    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));

      toast({
        title: "Perfil actualizado",
        description: "Los cambios han sido guardados exitosamente.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo actualizar el perfil. Por favor, intente nuevamente.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (!profile) {
    return <div>Cargando...</div>;
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center gap-4">
        <div className="p-3 bg-primary/10 rounded-lg">
          <UserCircle className="w-8 h-8 text-primary" />
        </div>
        <div>
          <h1 className="text-3xl font-bold">Mi Perfil</h1>
          <p className="text-muted-foreground">
            Gestiona tu información personal y preferencias
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              Evaluaciones Totales
            </CardTitle>
            <BarChart3 className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{profile.stats.total_evaluations}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              Evaluaciones Completadas
            </CardTitle>
            <BarChart3 className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{profile.stats.completed_evaluations}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              Calificación Promedio
            </CardTitle>
            <BarChart3 className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{profile.stats.average_rating}/5.0</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <form onSubmit={handleSubmit}>
          <CardHeader>
            <CardTitle>Información de la Empresa</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="company_name" className="flex items-center gap-2">
                  <Building2 className="w-4 h-4" /> Nombre de la Empresa
                </Label>
                <Input
                  id="company_name"
                  required
                  value={profile.company_name}
                  onChange={(e) => handleChange("company_name", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email" className="flex items-center gap-2">
                  <Mail className="w-4 h-4" /> Correo Electrónico
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={profile.contact_email}
                  disabled
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="contact_phone" className="flex items-center gap-2">
                  <Phone className="w-4 h-4" /> Teléfono de Contacto
                </Label>
                <Input
                  id="contact_phone"
                  type="tel"
                  value={profile.contact_phone}
                  onChange={(e) => handleChange("contact_phone", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="website" className="flex items-center gap-2">
                  <Globe className="w-4 h-4" /> Sitio Web
                </Label>
                <Input
                  id="website"
                  type="url"
                  value={profile.business_details?.website || ""}
                  onChange={(e) => handleChange("business_details.website", e.target.value)}
                  placeholder="https://"
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="address" className="flex items-center gap-2">
                  <MapPin className="w-4 h-4" /> Dirección
                </Label>
                <Input
                  id="address"
                  value={profile.business_details?.address || ""}
                  onChange={(e) => handleChange("business_details.address", e.target.value)}
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="created_at" className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" /> Fecha de Registro
                </Label>
                <Input
                  id="created_at"
                  value={new Date(profile.created_at).toLocaleDateString('es-ES', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                  disabled
                />
              </div>
            </div>
          </CardContent>
          <CardFooter>
            <Button type="submit" disabled={loading} className="ml-auto gap-2">
              <Save className="w-4 h-4" />
              {loading ? "Guardando..." : "Guardar Cambios"}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}