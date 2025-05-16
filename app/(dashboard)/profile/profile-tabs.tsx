"use client";

import { useEffect, useState } from "react";
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
  Calendar,
  BarChart3,
  AlertCircle,
  Key,
  LockKeyhole,
  User,
  Shield,
  Check,
  Info,
} from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

// Interface para permisos
interface Permission {
  name: string;
  module: string;
  action: string;
}

// Interface para el perfil de usuario
interface Profile {
  id: string;
  email: string;
  profile_id: string | null;
  role_id: string | null;
  vendor_id: string | null;
  created_at: string;
  updated_at: string | null;
  last_sign_in_at: string | null;
  contact_phone: string | null;
  profile?: {
    id: string;
    first_name?: string | null;
    last_name?: string | null;
    avatar_url?: string | null;
    company_logo?: string | null;
    created_at?: string | null;
    updated_at?: string | null;
    [key: string]: any;
  } | null;
  role?: {
    id: string;
    name: string;
    description: string | null;
    created_at?: string;
    updated_at?: string;
  } | null;
  vendor?: {
    id: string;
    name: string;
    [key: string]: any;
  } | null;
  [key: string]: any;
}

interface ProfileStats {
  total_evaluations: number;
  completed_evaluations: number;
  average_rating: number;
}

export default function ProfileTabs() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [profileDirectData, setProfileDirectData] = useState<any>(null); // Para almacenar datos directos del perfil
  const [stats, setStats] = useState<ProfileStats>({
    total_evaluations: 0,
    completed_evaluations: 0,
    average_rating: 0
  });
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: ""
  });
  const [passwordChangeOpen, setPasswordChangeOpen] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  // Función para obtener el perfil directamente a través de la API REST
  const fetchProfileDirectly = async (userId: string) => {
    try {
      // Obtener token de sesión actual
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData?.session) {
        console.log("No hay sesión para obtener el token");
        return null;
      }

      // Obtener clave anónima (normalmente está disponible en el cliente)
      // NOTA: Esto normalmente se extraería de process.env o configuración
      const ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBhZ3Zlb2FibmFpenR1ZHFnbHZoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MTIwOTY2MzQsImV4cCI6MjAyNzY3MjYzNH0.NlJoAj9B9Mg1U6aPnZJqkIbgLOiaNABgngBIo3RQJew";
      const token = sessionData.session.access_token;

      console.log("Consultando perfil mediante API REST directa");
      console.log(`ID de usuario: ${userId}`);
      console.log(`Token: ${token.substring(0, 10)}...`);

      // Realizar la solicitud a la API REST con los headers correctos
      const response = await fetch(
        `https://pagveoabnaiztudqglvh.supabase.co/rest/v1/profiles?id=eq.${userId}&select=*`,
        {
          method: 'GET',
          headers: {
            'apikey': ANON_KEY,
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          }
        }
      );

      // Verificar la respuesta
      if (!response.ok) {
        const errorData = await response.json();
        console.error("Error en consulta REST directa:", errorData);
        return null;
      }

      // Procesar la respuesta exitosa
      const data = await response.json();
      console.log("Éxito en consulta REST directa:", data);

      // La API REST devuelve un array, tomamos el primer elemento
      if (data && data.length > 0) {
        return data[0];
      }

      return null;
    } catch (err) {
      console.error("Error al consultar perfil directamente:", err);
      return null;
    }
  };

  // NUEVA SOLUCIÓN: Consultar el perfil del usuario directamente al inicio
  useEffect(() => {
    const getDirectProfileData = async () => {
      try {
        // Obtener el usuario actual
        const { data: sessionData } = await supabase.auth.getSession();
        if (!sessionData?.session?.user?.id) {
          console.log("No hay usuario loggeado para consulta directa");
          return;
        }

        const userId = sessionData.session.user.id;
        const authToken = sessionData.session.access_token;

        console.log("Consultando directamente el perfil para:", userId);
        console.log("IMPORTANTE - Para usar la API REST directamente, debes incluir el token de autenticación:");
        console.log(`
Para acceder correctamente a través de la API REST directamente, usa:
https://pagveoabnaiztudqglvh.supabase.co/rest/v1/profiles?select=*&id=eq.${userId}
Con estos headers:
- apikey: ANON_KEY
- Authorization: Bearer ${authToken}
`);

        // Intentar obtener el perfil mediante la API REST directa
        const directApiProfile = await fetchProfileDirectly(userId);
        if (directApiProfile) {
          console.log("ÉXITO - Perfil obtenido mediante API REST directa:", directApiProfile);
          setProfileDirectData(directApiProfile);
          return;
        }

        // Si la API REST falla, intentar con el cliente de Supabase
        const { data: directProfile, error: directProfileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .single();

        if (directProfileError) {
          console.error("Error en consulta directa de perfil con cliente Supabase:", directProfileError);
          return;
        }

        if (directProfile) {
          console.log("ÉXITO - Datos directos del perfil con cliente Supabase:", directProfile);
          setProfileDirectData(directProfile);
        }
      } catch (err) {
        console.error("Error en consulta directa:", err);
      }
    };

    getDirectProfileData();
  }, []);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setError(null);
        console.log("Iniciando carga de perfil...");

        // DEPURACIÓN: Verificar usuario específico por email
        console.log("Depuración: Buscando usuario admin1@test.com");
        const { data: debugUser, error: debugError } = await supabase
          .from('users')
          .select(`
            *,
            profile:profile_id(*)
          `)
          .eq('email', 'admin1@test.com')
          .single();

        if (debugError) {
          console.error("Error al buscar usuario de depuración:", debugError);
        } else {
          console.log("Depuración - Usuario encontrado:", debugUser);

          // Verificar si profile_id existe pero profile es nulo
          if (debugUser?.profile_id && !debugUser?.profile) {
            console.log("Depuración - Profile_id existe pero profile es nulo:", debugUser.profile_id);

            // Intentar cargar el perfil directamente
            const directApiProfile = await fetchProfileDirectly(debugUser.profile_id);
            if (directApiProfile) {
              console.log("DEPURACIÓN - Perfil cargado correctamente con API REST:", directApiProfile);
            } else {
              // Intentar con el cliente Supabase
              const { data: profileDetails, error: profileDetailsError } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', debugUser.profile_id)
                .single();

              if (profileDetailsError) {
                console.error("Error al cargar perfil de depuración:", profileDetailsError);
              } else {
                console.log("Depuración - Datos de perfil cargados directamente:", profileDetails);
              }
            }
          }
        }

        // Mejorado: intentar varias estrategias para obtener el ID de usuario
        let userId = null;
        let retryCount = 0;
        const maxRetries = 3;

        // Función de intento con retraso exponencial
        const attemptGetUser = async (attempt: number): Promise<string | null> => {
          try {
            // Estrategia 1: Obtener sesión
            const { data: sessionData } = await supabase.auth.getSession();
            if (sessionData?.session?.user?.id) {
              console.log(`Intento ${attempt}: ID de usuario obtenido de la sesión:`, sessionData.session.user.id);
              return sessionData.session.user.id;
            }

            // Estrategia 2: Usar getUser
            const { data } = await supabase.auth.getUser();
            if (data?.user?.id) {
              console.log(`Intento ${attempt}: ID de usuario obtenido de getUser:`, data.user.id);
              return data.user.id;
            }

            // Si llegamos aquí, no se pudo obtener el ID
            return null;
          } catch (error) {
            console.warn(`Error en intento ${attempt}:`, error);
            return null;
          }
        };

        // Intentar con retraso exponencial
        while (retryCount < maxRetries && !userId) {
          // Esperar con retraso exponencial excepto en el primer intento
          if (retryCount > 0) {
            const delay = Math.pow(2, retryCount - 1) * 500; // 0ms, 500ms, 1000ms, etc.
            console.log(`Esperando ${delay}ms antes del intento ${retryCount + 1}`);
            await new Promise(resolve => setTimeout(resolve, delay));
          }

          userId = await attemptGetUser(retryCount + 1);
          retryCount++;
        }

        // Si no se pudo obtener el ID, intentar la solución alternativa
        if (!userId) {
          console.log("No se pudo determinar el ID de usuario, intentando cargar perfil actual");

          // Intento genérico: obtener el primer perfil disponible (para desarrollo)
          try {
            const { data: myProfile, error: myProfileError } = await supabase
              .from('users')
              .select(`
                *,
                profile:profile_id(*),
                role:role_id(*),
                vendor:vendor_id(*)
              `)
              .limit(1)
              .single();

            if (!myProfileError && myProfile) {
              console.log("Perfil cargado correctamente sin ID de usuario");
              setProfile(myProfile);

              // Verificar si necesitamos cargar el perfil adicional
              if (myProfile.profile_id && !myProfile.profile) {
                console.log("Cargando perfil adicional para perfil genérico...");
                try {
                  const { data: profileDetails, error: profileDetailsError } = await supabase
                    .from('profiles')
                    .select('*')
                    .eq('id', myProfile.profile_id)
                    .single();

                  if (!profileDetailsError && profileDetails) {
                    console.log("Perfil adicional cargado correctamente");
                    setProfile(prev => ({
                      ...prev!,
                      profile: profileDetails
                    }));
                  }
                } catch (error) {
                  console.error("Error al cargar perfil adicional:", error);
                }
              }

              // También cargar estadísticas
              setStats({
                total_evaluations: 45,
                completed_evaluations: 38,
                average_rating: 4.7
              });

              // Cargar permisos del usuario
              await loadUserPermissions(myProfile.id);

              return;
            } else {
              console.log("No se pudo cargar el perfil sin ID de usuario");
              // Mostrar un estado en blanco que permita al usuario cancelar o intentar de nuevo
            }
          } catch (alternativeError) {
            console.error("Error en intento alternativo:", alternativeError);
          }

          return; // Salir sin mostrar error para mantener la interfaz limpia
        }

        // Si tenemos userId, obtener el perfil
        console.log("Obteniendo perfil con ID:", userId);
        const { data: profileData, error: profileError } = await supabase
          .from('users')
          .select(`
            *,
            profile:profile_id(*),
            role:role_id(*),
            vendor:vendor_id(*)
          `)
          .eq('id', userId)
          .single();

        if (profileError) {
          console.error("Error al cargar perfil:", profileError.message, profileError.details);
          throw new Error('No se pudo cargar la información del perfil');
        }

        console.log("Perfil cargado correctamente, datos:", profileData);
        setProfile(profileData);

        // CORRECCIÓN: Mejorar la lógica de carga del perfil cuando este viene nulo
        if (profileData.profile_id && !profileData.profile) {
          console.log("El perfil está null pero tenemos profile_id, cargando desde tabla profiles...");

          // Si el profile_id es igual al ID del usuario (caso identificado)
          if (profileData.profile_id === profileData.id) {
            console.log("El profile_id es igual al ID del usuario - caso especial detectado");
          }

          // NUEVO: Intentar primero con la API REST directa
          const directApiProfile = await fetchProfileDirectly(profileData.profile_id);
          if (directApiProfile) {
            console.log("Perfil cargado correctamente mediante API REST directa:", directApiProfile);
            // Actualizar el estado con los datos del perfil
            setProfile(prev => {
              const updatedProfile = {
                ...prev!,
                profile: directApiProfile
              };
              console.log("Perfil actualizado con datos de API REST directa:", updatedProfile);
              return updatedProfile;
            });
            // También actualizamos los datos directos para tenerlos disponibles
            setProfileDirectData(directApiProfile);

            // Continuar con el flujo normal
            await fetchUserStats(userId);
            await loadUserPermissions(userId);
            return; // Terminamos aquí si la API REST fue exitosa
          }

          // Si la API REST falló, continuamos con el enfoque anterior
          // Intentar cargar el perfil directamente desde la tabla profiles
          const { data: profileDetails, error: profileDetailsError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', profileData.profile_id)
            .single();

          if (!profileDetailsError && profileDetails) {
            console.log("Perfil adicional cargado correctamente:", profileDetails);
            // Actualizar el estado con los datos del perfil
            setProfile(prev => {
              const updatedProfile = {
                ...prev!,
                profile: profileDetails
              };
              console.log("Perfil actualizado con datos adicionales:", updatedProfile);
              return updatedProfile;
            });
          } else {
            console.error("Error al cargar detalles adicionales del perfil:", profileDetailsError);
            // Intento adicional en caso de fallo, verificar si el ID de usuario también funciona como ID de perfil
            console.log("Intentando alternativa: buscar perfil usando id de usuario");
            const { data: profileByUserId, error: profileByUserIdError } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', userId)  // Intenta usar el ID de usuario como ID de perfil
              .single();

            if (!profileByUserIdError && profileByUserId) {
              console.log("Alternativa exitosa - Perfil encontrado usando ID de usuario:", profileByUserId);
              setProfile(prev => ({
                ...prev!,
                profile: profileByUserId
              }));
            } else {
              console.error("Error en intento alternativo:", profileByUserIdError);
            }
          }
        }

        // Cargar estadísticas reales si es posible
        await fetchUserStats(userId);

        // Cargar permisos del usuario
        await loadUserPermissions(userId);

      } catch (error: any) {
        console.error("Error en fetchProfile:", error);

        // Solo mostrar error si es crítico, ignorar errores de sesión
        if (error.message && !error.message.includes('Auth session')) {
          setError(error.message);
          toast({
            title: "Error",
            description: error.message,
            variant: "destructive",
          });
        }
      }
    };

    fetchProfile();
  }, [toast]);

  const loadUserPermissions = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .rpc('get_user_permissions', { user_id: userId });

      if (error) {
        console.error("Error al cargar permisos:", error);
        return;
      }

      console.log("Permisos cargados:", data);
      setPermissions(data || []);
    } catch (error) {
      console.error("Error al cargar permisos:", error);
    }
  };

  const fetchUserStats = async (userId: string) => {
    try {
      // En un caso real, aquí consultaríamos estadísticas de evaluaciones del usuario
      // Por ahora usamos datos de ejemplo
      setStats({
        total_evaluations: 45,
        completed_evaluations: 38,
        average_rating: 4.7
      });
    } catch (error) {
      console.error("Error al cargar estadísticas:", error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    setLoading(true);

    try {
      // Preparar los datos que se actualizarán
      const firstName = getProfileValue('first_name');
      const lastName = getProfileValue('last_name');
      let updatedProfileData: any = null;

      console.log("Actualizando nombres:", { firstName, lastName });

      // Actualizar información en tabla profiles
      if (profile.profile_id) {
        const { error: profileError } = await supabase
          .from('profiles')
          .update({
            first_name: firstName,
            last_name: lastName,
            updated_at: new Date().toISOString()
          })
          .eq('id', profile.profile_id);

        if (profileError) {
          console.error("Error al actualizar perfil:", profileError);
          throw profileError;
        }

        console.log("Perfil actualizado exitosamente");

        // NUEVO: Cargar datos actualizados del perfil mediante API REST
        updatedProfileData = await fetchProfileDirectly(profile.profile_id);
        if (updatedProfileData) {
          console.log("Datos actualizados recuperados con éxito:", updatedProfileData);

          // Actualizar ambos estados con los datos más recientes
          setProfileDirectData(updatedProfileData);
          setProfile(prev => ({
            ...prev!,
            profile: updatedProfileData
          }));
        }
      }

      // Actualizar el teléfono de contacto en la tabla users
      const { error: userError } = await supabase
        .from('users')
        .update({
          contact_phone: profile.contact_phone,
          updated_at: new Date().toISOString()
        })
        .eq('id', profile.id);

      if (userError) {
        console.error("Error al actualizar usuario:", userError);
        throw userError;
      }

      console.log("Usuario actualizado exitosamente");

      toast({
        title: "Perfil actualizado",
        description: "Los cambios han sido guardados exitosamente.",
      });

      // Actualizar los datos locales si no pudimos obtenerlos directamente
      if (!updatedProfileData) {
        if (profile.profile) {
          setProfile(prev => ({
            ...prev!,
            profile: {
              ...prev!.profile!,
              first_name: firstName,
              last_name: lastName
            }
          }));
        }

        if (profileDirectData) {
          setProfileDirectData((prev: any) => ({
            ...prev,
            first_name: firstName,
            last_name: lastName
          }));
        }
      }

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

    // Si el campo está en el perfil anidado
    if (['first_name', 'last_name'].includes(field)) {
      // Actualizar el perfil principal si existe
      setProfile(prev => {
        if (!prev) return prev;

        // Si ya tenemos un objeto profile, lo actualizamos
        if (prev.profile) {
          return {
            ...prev,
            profile: {
              ...prev.profile,
              [field]: value
            }
          };
        }
        // Si no hay objeto profile pero tenemos profileDirectData, creamos un nuevo objeto profile
        else if (profileDirectData) {
          return {
            ...prev,
            profile: {
              ...profileDirectData,
              [field]: value
            }
          };
        }
        // Si no hay nada, devolvemos el estado anterior
        return prev;
      });

      // También actualizar los datos directos si existen
      if (profileDirectData) {
        setProfileDirectData((prev: any) => ({
          ...prev,
          [field]: value
        }));
      }
    } else {
      // Si el campo está en el usuario principal
      setProfile(prev => ({
        ...prev!,
        [field]: value
      }));
    }
  };

  const handlePasswordChange = (field: string, value: string) => {
    setPasswordData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);

    // Validaciones
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setPasswordError("Las contraseñas no coinciden");
      return;
    }

    if (passwordData.newPassword.length < 6) {
      setPasswordError("La contraseña debe tener al menos 6 caracteres");
      return;
    }

    setLoading(true);

    try {
      // Primero verificamos si la contraseña actual es correcta
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: profile?.email || "",
        password: passwordData.currentPassword,
      });

      if (signInError) {
        setPasswordError("La contraseña actual es incorrecta");
        setLoading(false);
        return;
      }

      // Si la contraseña actual es correcta, actualizamos a la nueva
      const { error } = await supabase.auth.updateUser({
        password: passwordData.newPassword
      });

      if (error) {
        throw new Error(error.message);
      }

      toast({
        title: "Contraseña actualizada",
        description: "Tu contraseña ha sido actualizada exitosamente.",
      });

      // Cerrar el diálogo y limpiar datos
      setPasswordChangeOpen(false);
      setPasswordData({
        currentPassword: "",
        newPassword: "",
        confirmPassword: ""
      });
    } catch (error: any) {
      setPasswordError(error.message);
    } finally {
      setLoading(false);
    }
  };

  // SOLUCIÓN: Cargar forzosamente el perfil si no está disponible
  useEffect(() => {
    const loadProfileDataDirectly = async () => {
      if (profile && profile.profile_id && !profile.profile) {
        console.log("SOLUCIÓN DE EMERGENCIA: Cargando perfil directamente porque no está disponible");

        try {
          const { data: profileData, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', profile.profile_id)
            .single();

          if (profileError) {
            console.error("Error en carga de emergencia del perfil:", profileError);
            return;
          }

          if (profileData) {
            console.log("SOLUCIÓN DE EMERGENCIA: Perfil cargado con éxito", profileData);
            setProfile(prev => ({
              ...prev!,
              profile: profileData
            }));
          }
        } catch (err) {
          console.error("Error en carga de emergencia:", err);
        }
      }
    };

    loadProfileDataDirectly();
  }, [profile?.profile_id, profile?.profile]);

  // Función auxiliar para obtener el nombre correcto
  const getProfileValue = (field: string) => {
    // Si tenemos el perfil normal y el campo, lo usamos
    if (profile?.profile && profile.profile[field] !== undefined && profile.profile[field] !== null) {
      return profile.profile[field];
    }

    // Si no, intentamos usar los datos directos del perfil
    if (profileDirectData && profileDirectData[field] !== undefined && profileDirectData[field] !== null) {
      return profileDirectData[field];
    }

    // Si no hay nada, retornamos cadena vacía
    return '';
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
      <div className="flex items-center justify-center py-10">
        <p className="text-muted-foreground">Cargando perfil...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
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

      <Tabs defaultValue="personal" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="personal">Información Personal</TabsTrigger>
          <TabsTrigger value="security">Seguridad</TabsTrigger>
          <TabsTrigger value="permissions">Permisos</TabsTrigger>
        </TabsList>

        <TabsContent value="personal">
          <Card>
            <form onSubmit={handleSubmit}>
              <CardHeader>
                <CardTitle>Información del Perfil</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="first_name" className="flex items-center gap-2">
                      <User className="w-4 h-4" /> Nombre
                    </Label>
                    <Input
                      id="first_name"
                      value={getProfileValue('first_name')}
                      onChange={(e) => handleChange("first_name", e.target.value)}
                      placeholder="Tu nombre"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="last_name" className="flex items-center gap-2">
                      <User className="w-4 h-4" /> Apellido
                    </Label>
                    <Input
                      id="last_name"
                      value={getProfileValue('last_name')}
                      onChange={(e) => handleChange("last_name", e.target.value)}
                      placeholder="Tu apellido"
                    />
                  </div>
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
                      value={profile.contact_phone || ''}
                      onChange={(e) => handleChange("contact_phone", e.target.value)}
                      placeholder="Tu teléfono"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="role" className="flex items-center gap-2">
                      <UserCircle className="w-4 h-4" /> Rol en el Sistema
                    </Label>
                    <Input
                      id="role"
                      value={profile.role?.name || 'Sin rol asignado'}
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
        </TabsContent>

        <TabsContent value="security">
          <Card>
            <CardHeader>
              <CardTitle>Seguridad</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-muted/50 p-4 rounded-md">
                <h3 className="flex items-center gap-2 font-medium">
                  <LockKeyhole className="w-4 h-4 text-muted-foreground" />
                  Contraseña
                </h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Cambiar tu contraseña periódicamente ayuda a mantener segura tu cuenta.
                </p>
                <Dialog open={passwordChangeOpen} onOpenChange={setPasswordChangeOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" className="mt-4">
                      <Key className="w-4 h-4 mr-2" /> Cambiar Contraseña
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                      <DialogTitle>Cambiar contraseña</DialogTitle>
                      <DialogDescription>
                        Ingresa tu contraseña actual y la nueva contraseña para actualizar.
                      </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handlePasswordSubmit}>
                      {passwordError && (
                        <Alert variant="destructive" className="mb-4">
                          <AlertCircle className="h-4 w-4" />
                          <AlertDescription>{passwordError}</AlertDescription>
                        </Alert>
                      )}
                      <div className="grid gap-4 py-4">
                        <div className="space-y-2">
                          <Label htmlFor="currentPassword">Contraseña actual</Label>
                          <Input
                            id="currentPassword"
                            type="password"
                            value={passwordData.currentPassword}
                            onChange={(e) => handlePasswordChange("currentPassword", e.target.value)}
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="newPassword">Nueva contraseña</Label>
                          <Input
                            id="newPassword"
                            type="password"
                            value={passwordData.newPassword}
                            onChange={(e) => handlePasswordChange("newPassword", e.target.value)}
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="confirmPassword">Confirmar nueva contraseña</Label>
                          <Input
                            id="confirmPassword"
                            type="password"
                            value={passwordData.confirmPassword}
                            onChange={(e) => handlePasswordChange("confirmPassword", e.target.value)}
                            required
                          />
                        </div>
                      </div>
                      <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setPasswordChangeOpen(false)}>
                          Cancelar
                        </Button>
                        <Button type="submit" disabled={loading}>
                          {loading ? "Actualizando..." : "Actualizar contraseña"}
                        </Button>
                      </DialogFooter>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="permissions">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5" /> Roles y Permisos
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Sección de rol */}
              <div>
                <h3 className="text-lg font-medium mb-2">Tu Rol</h3>
                <div className="bg-muted/50 p-4 rounded-md flex flex-col gap-3">
                  <div className="flex items-center gap-2">
                    <UserCircle className="w-5 h-5 text-primary" />
                    <span className="font-semibold text-primary">
                      {profile.role?.name || 'Sin rol asignado'}
                    </span>
                    <Badge variant="outline" className="ml-2">
                      {profile.role?.name === 'admin' ? 'Administrador' :
                        profile.role?.name === 'evaluator' ? 'Evaluador' :
                          profile.role?.name === 'supplier' ? 'Proveedor' : 'Usuario'}
                    </Badge>
                  </div>
                  {profile.role?.description && (
                    <p className="text-sm text-muted-foreground">
                      {profile.role.description}
                    </p>
                  )}
                </div>
              </div>

              {/* Lista de permisos */}
              <div>
                <h3 className="text-lg font-medium mb-2">Tus Permisos</h3>
                {permissions.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[50px]"></TableHead>
                        <TableHead>Nombre</TableHead>
                        <TableHead>Módulo</TableHead>
                        <TableHead>Acción</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {permissions.map((permission, index) => (
                        <TableRow key={`${permission.module}-${permission.action}-${index}`}>
                          <TableCell>
                            <Check className="w-4 h-4 text-green-500" />
                          </TableCell>
                          <TableCell className="font-medium">{permission.name}</TableCell>
                          <TableCell>{permission.module}</TableCell>
                          <TableCell>{permission.action}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4 flex items-center gap-3">
                    <Info className="w-5 h-5 text-yellow-500" />
                    <p className="text-yellow-700 text-sm">
                      No se encontraron permisos específicos asignados a tu usuario.
                      El acceso está basado en tu rol de sistema.
                    </p>
                  </div>
                )}
              </div>

              <div className="rounded-md border p-4">
                <h3 className="text-sm font-medium">¿Necesitas permisos adicionales?</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Si necesitas acceso a más funcionalidades, contacta al administrador del sistema.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
} 