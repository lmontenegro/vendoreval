'use client';

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { ArrowLeft, Save, Trash2 } from "lucide-react";
import { type VendorWithUsers } from '@/lib/services/vendor-service';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import {
  Building2,
  AlertCircle,
  Tag,
  Mail,
  Phone,
  Link as LinkIcon,
  MapPin,
  Calendar,
  FileText
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export default function VendorEditClient({ id }: { id: string }) {
  const router = useRouter();
  const { toast } = useToast();
  const [vendor, setVendor] = useState<VendorWithUsers | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [services, setServices] = useState<string>('');

  useEffect(() => {
    const fetchVendor = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(`/api/admin/vendors/${id}`);
        
        if (!response.ok) {
            const errorData = await response.json();
            if (response.status === 404) {
                 setError('Proveedor no encontrado.');
             } else if (response.status === 403) {
                 setError(errorData.error || "No tienes permisos para ver este proveedor.");
             } else if (response.status === 401) {
                 setError("Tu sesión ha expirado. Por favor, inicia sesión nuevamente.");
                 router.push('/auth/login');
             } else {
                 throw new Error(errorData.error || "Error al cargar proveedor desde la API");
             }
             setVendor(null);
        } else {
            const { data } = await response.json();
            setVendor(data || null);
            setServices(data?.services_provided?.join(', ') || '');
        }

      } catch (err: any) {
         console.error("Fetch vendor error:", err);
        setError(err.message || 'Error al cargar el proveedor');
         toast({
          title: "Error de Carga",
          description: err.message || "No se pudo cargar el proveedor.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchVendor();
  }, [id, router, toast]);

  const handleChange = (field: keyof VendorWithUsers, value: any) => {
    if (!vendor) return;
    setVendor(prev => ({
      ...(prev as VendorWithUsers),
      [field]: value
    }));
  };

  const handleServicesChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setServices(e.target.value);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const currentVendorData = { ...vendor }; 
    if (!currentVendorData.id) return;

    if (currentVendorData.website) {
      try {
        new URL(currentVendorData.website);
      } catch (err) {
        let fixedUrl = currentVendorData.website;
        if (!/^https?:\/\//i.test(fixedUrl)) {
          fixedUrl = `https://${fixedUrl}`;
          try {
            new URL(fixedUrl);
            handleChange('website', fixedUrl); 
            currentVendorData.website = fixedUrl;
          } catch (err) {
            toast({ title: "URL inválida", description: "El sitio web no es una URL válida, incluso con https://.", variant: "destructive" });
            return;
          }
        } else {
           toast({ title: "URL inválida", description: "El sitio web ingresado no es una URL válida.", variant: "destructive" });
           return;
        }
      }
    }
    
    setSaving(true);

    try {
      const servicesArray = services
        .split(',')
        .map(s => s.trim())
        .filter(s => s.length > 0);
        
      const vendorUpdatePayload = {
        name: vendor?.name,
        rut: vendor?.rut,
        description: vendor?.description,
        contact_email: vendor?.contact_email,
        contact_phone: vendor?.contact_phone,
        address: vendor?.address,
        website: vendor?.website,
        is_active: vendor?.is_active,
        services_provided: servicesArray
      };

      console.log("Client: Payload a enviar:", JSON.stringify(vendorUpdatePayload, null, 2)); 

      const response = await fetch(`/api/admin/vendors/${currentVendorData.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(vendorUpdatePayload),
      });
      
      if (!response.ok) {
          let errorData = { error: `Error ${response.status}` }; 
          try {
              if (response.headers.get('content-type')?.includes('application/json')) {
                 errorData = await response.json();
              }
          } catch (parseError) {
              console.error("Error parsing error response:", parseError);
          }
          
           if (response.status === 403) {
                throw new Error(errorData.error || "No tienes permisos para actualizar proveedores.");
            } else if (response.status === 401) {
                throw new Error("Tu sesión ha expirado. Por favor, inicia sesión nuevamente.");
            } else if (response.status === 400) {
                throw new Error(errorData.error || "Datos inválidos para la actualización.");
            } else {
                throw new Error(errorData.error || "Error desconocido al guardar el proveedor.");
            }
      }
      
      toast({
        title: "Proveedor actualizado",
        description: "La información del proveedor ha sido actualizada exitosamente."
      });
      
      /* <<< COMENTAR PARA NO NAVEGAR AL LISTADO >>> */
      // router.push('/vendors'); 

      // <<< AÑADIR PARA ACTUALIZAR DATOS EN LA PÁGINA ACTUAL >>>
      router.refresh();

    } catch (err: any) {
       console.error("Submit vendor error:", err);
       toast({
        title: "Error al Guardar",
        description: err.message || "No se pudo actualizar el proveedor.",
        variant: "destructive"
      });
       if (err.message.includes("sesión ha expirado")) {
            router.push('/auth/login');
        }
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex items-center gap-4 mb-6">
          <Button variant="outline" size="icon" disabled>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <Skeleton className="h-8 w-48" />
        </div>
        <Card>
          <CardHeader>
            <Skeleton className="h-8 w-48 mb-2" />
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-10 w-full" />
          </CardContent>
          <CardFooter>
            <Skeleton className="h-10 w-32" />
          </CardFooter>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-6">
        <Button 
          variant="outline" 
          size="icon" 
          onClick={() => router.push('/vendors')}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4 mr-2" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
        <Button onClick={() => router.push('/vendors')} className="mt-4">
          Volver a Proveedores
        </Button>
      </div>
    );
  }

  if (!vendor) {
    return (
      <div className="container mx-auto p-6">
        <Button 
          variant="outline" 
          size="icon" 
          onClick={() => router.push('/vendors')}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <Alert>
          <AlertDescription>No se encontró el proveedor solicitado.</AlertDescription>
        </Alert>
        <Button onClick={() => router.push('/vendors')} className="mt-4">
          Volver a Proveedores
        </Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button 
            variant="outline" 
            size="icon" 
            onClick={() => router.push('/vendors')}
            aria-label="Volver"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Detalles del Proveedor</h1>
            <p className="text-muted-foreground">
              {vendor.name} - Visualización y edición
            </p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Información del Proveedor
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="name" className="flex items-center gap-2">
                  <Building2 className="h-4 w-4" /> Nombre de la Empresa
                </Label>
                <Input
                  id="name"
                  value={vendor.name}
                  onChange={(e) => handleChange('name', e.target.value)}
                  placeholder="Nombre de la empresa"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="rut" className="flex items-center gap-2">
                  <Tag className="h-4 w-4" /> RUT
                </Label>
                <Input
                  id="rut"
                  value={vendor.rut}
                  onChange={(e) => handleChange('rut', e.target.value)}
                  placeholder="Número de RUT"
                  required
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="description" className="flex items-center gap-2">
                  <FileText className="h-4 w-4" /> Descripción
                </Label>
                <Textarea
                  id="description"
                  value={vendor.description || ''}
                  onChange={(e) => handleChange('description', e.target.value)}
                  placeholder="Descripción de la empresa y sus servicios"
                  rows={3}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="contact_email" className="flex items-center gap-2">
                  <Mail className="h-4 w-4" /> Correo Electrónico
                </Label>
                <Input
                  id="contact_email"
                  type="email"
                  value={vendor.contact_email || ''}
                  onChange={(e) => handleChange('contact_email', e.target.value)}
                  placeholder="correo@ejemplo.com"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="contact_phone" className="flex items-center gap-2">
                  <Phone className="h-4 w-4" /> Teléfono
                </Label>
                <Input
                  id="contact_phone"
                  value={vendor.contact_phone || ''}
                  onChange={(e) => handleChange('contact_phone', e.target.value)}
                  placeholder="+51 999 888 777"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="website" className="flex items-center gap-2">
                  <LinkIcon className="h-4 w-4" /> Sitio Web
                </Label>
                <Input
                  id="website"
                  value={vendor.website || ''}
                  onChange={(e) => {
                    let value = e.target.value.trim();
                    if (value && !/^https?:\/\//i.test(value)) {
                      value = `https://${value}`;
                    }
                    handleChange('website', value);
                  }}
                  placeholder="www.ejemplo.com"
                />
                <p className="text-xs text-muted-foreground">
                  Puedes ingresar el dominio sin http:// o https://, se agregará automáticamente
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="address" className="flex items-center gap-2">
                  <MapPin className="h-4 w-4" /> Dirección
                </Label>
                <Input
                  id="address"
                  value={vendor.address || ''}
                  onChange={(e) => handleChange('address', e.target.value)}
                  placeholder="Dirección de la empresa"
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="services" className="flex items-center gap-2">
                  <Tag className="h-4 w-4" /> Servicios Ofrecidos
                </Label>
                <Textarea
                  id="services"
                  value={services}
                  onChange={handleServicesChange}
                  placeholder="Servicios separados por comas (ej: Diseño web, Marketing digital, SEO)"
                  rows={2}
                />
                <p className="text-xs text-muted-foreground">
                  Ingresa los servicios separados por comas
                </p>
              </div>
              <div className="space-y-2 flex items-center gap-4">
                <Label htmlFor="is_active" className="flex items-center gap-2 cursor-pointer">
                  <Switch
                    id="is_active"
                    checked={vendor.is_active || false}
                    onCheckedChange={(checked) => handleChange('is_active', checked)}
                  />
                  <span>Proveedor Activo</span>
                </Label>
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex justify-between items-center">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => router.push('/vendors')}
            >
              Cancelar
            </Button>
            <Button 
              type="submit" 
              disabled={saving}
              className="gap-2"
            >
              {saving ? (
                <span className="animate-spin">⏳</span>
              ) : (
                <Save className="h-4 w-4" />
              )}
              Guardar Cambios
            </Button>
          </CardFooter>
        </Card>
      </form>
    </div>
  );
} 