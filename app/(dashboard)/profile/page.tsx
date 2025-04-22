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
  BarChart3,
  AlertCircle
} from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface Profile {
  id: string;
  email: string;
  profile_id: string | null;
  role_id: string | null;
  vendor_id: string | null;
  created_at: string;
  updated_at: string | null;
  last_sign_in_at: string | null;
  profile?: {
    id: string;
    company_name: string;
    contact_phone: string | null;
    contact_email: string | null;
    avatar_url: string | null;
    company_logo: string | null;
    business_details: any;
    created_at: string | null;
    updated_at: string | null;
  } | null;
  role?: {
    id: string;
    name: string;
    description: string | null;
    created_at: string;
    updated_at: string;
  } | null;
  vendor?: {
    id: string;
    name: string;
  } | null;
}

interface ProfileStats {
  total_evaluations: number;
  completed_evaluations: number;
  average_rating: number;
}

export default function Profile() {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [stats, setStats] = useState<ProfileStats>({
    total_evaluations: 0,
    completed_evaluations: 0,
    average_rating: 0
  });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setError(null);
        // Verificar sesión
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        
        if (authError || !user) {
          router.push('/auth/login');
          return;
        }

        // Obtener perfil con relaciones
        const { data: profileData, error: profileError } = await supabase
          .from('users')
          .select(`
            *,
            profile:profile_id(*),
            role:role_id(*),
            vendor:vendor_id(*)
          `)
          .eq('id', user.id)
          .single();

        if (profileError) {
          throw new Error('No se pudo cargar la información del perfil');
        }

        setProfile(profileData);

        // TODO: Implementar obtención de estadísticas reales
        // Por ahora usamos datos de ejemplo
        setStats({
          total_evaluations: 45,
          completed_evaluations: 38,
          average_rating: 4.7
        });

      } catch (error: any) {
        setError(error.message);
        toast({
          title: "Error",
          description: error.message,
          variant: "destructive",
        });
      }
    };

    fetchProfile();
  }, [router, toast]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile || !profile.profile_id) return;
    setLoading(true);

    try {
      // Actualizar la información del perfil
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          contact_phone: profile.profile?.contact_phone,
          updated_at: new Date().toISOString()
        })
        .eq('id', profile.profile_id);

      if (profileError) throw profileError;

      toast({
        title: "Perfil actualizado",
        description: "Los cambios han sido guardados exitosamente.",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: "No se pudo actualizar el perfil. Por favor, intente nuevamente.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field: string, value: string) => {
    if (!profile) return;
    setProfile(prev => ({
      ...prev!,
      profile: {
        ...prev!.profile!,
        [field]: value
      }
    }));
  };

  if (error) {
    return (
      <div className="container mx-auto p-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-muted-foreground">Cargando perfil...</p>
      </div>
    );
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
            <div className="text-2xl font-bold">{stats.total_evaluations}</div>
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
            <div className="text-2xl font-bold">{stats.completed_evaluations}</div>
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
            <div className="text-2xl font-bold">{stats.average_rating}/5.0</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <form onSubmit={handleSubmit}>
          <CardHeader>
            <CardTitle>Información del Perfil</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {profile.vendor && (
                <div className="space-y-2">
                  <Label htmlFor="company_name" className="flex items-center gap-2">
                    <Building2 className="w-4 h-4" /> Empresa
                  </Label>
                  <Input
                    id="company_name"
                    value={profile.vendor.name}
                    disabled
                  />
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="email" className="flex items-center gap-2">
                  <Mail className="w-4 h-4" /> Correo Electrónico
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={profile.email}
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
                  value={profile.profile?.contact_phone || ''}
                  onChange={(e) => handleChange("contact_phone", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="role" className="flex items-center gap-2">
                  <UserCircle className="w-4 h-4" /> Rol en el Sistema
                </Label>
                <Input
                  id="role"
                  value={profile.role?.name || ''}
                  disabled
                />
              </div>
              <div className="space-y-2">
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
              {profile.last_sign_in_at && (
                <div className="space-y-2">
                  <Label htmlFor="last_login" className="flex items-center gap-2">
                    <Calendar className="w-4 h-4" /> Último Acceso
                  </Label>
                  <Input
                    id="last_login"
                    value={new Date(profile.last_sign_in_at).toLocaleDateString('es-ES', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                    disabled
                  />
                </div>
              )}
            </div>
          </CardContent>
          <CardFooter>
            <Button type="submit" className="w-full gap-2" disabled={loading}>
              <Save className="w-4 h-4" />
              {loading ? "Guardando cambios..." : "Guardar Cambios"}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}