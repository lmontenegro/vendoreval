'use client';

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { ArrowLeft, Save, Trash2 } from "lucide-react";
import { getVendorById, updateVendor, type VendorWithUsers } from '@/lib/services/vendor-service';
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

export default function VendorClient({ id }: { id: string }) {
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
        const { data, error } = await getVendorById(id);
        if (error) {
          setError(error.message);
          return;
        }
        setVendor(data);
        // Convertir array de servicios a string para edición
        setServices(data?.services_provided?.join(', ') || '');
      } catch (err: any) {
        setError(err.message || 'Error al cargar el proveedor');
      } finally {
        setLoading(false);
      }
    };

    fetchVendor();
  }, [id]);

  const handleChange = (field: string, value: any) => {
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
    if (!vendor) return;
    
    setSaving(true);
    try {
      // Convertir string de servicios a array
      const servicesArray = services
        .split(',')
        .map(s => s.trim())
        .filter(s => s.length > 0);
      
      const { success, error } = await updateVendor(vendor.id, {
        ...vendor,
        services_provided: servicesArray
      });
      
      if (error) throw error;
      
      toast({
        title: "Proveedor actualizado",
        description: "La información del proveedor ha sido actualizada exitosamente."
      });
      
      // Redirigir a la lista de proveedores
      router.push('/vendors');
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "No se pudo actualizar el proveedor.",
        variant: "destructive"
      });
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
            <h1 className="text-3xl font-bold">{vendor.name}</h1>
            <p className="text-muted-foreground">
              Proveedor de servicios
            </p>
          </div>
        </div>
        <div>
          <Badge className={vendor.is_active ? "bg-green-100 text-green-800" : "bg-orange-100 text-orange-800"}>
            {vendor.is_active ? "Activo" : "Inactivo"}
          </Badge>
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
                <Label htmlFor="ruc" className="flex items-center gap-2">
                  <Tag className="h-4 w-4" /> RUC
                </Label>
                <Input
                  id="ruc"
                  value={vendor.ruc}
                  onChange={(e) => handleChange('ruc', e.target.value)}
                  placeholder="Número de RUC"
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
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="services" className="flex items-center gap-2">
                  <Tag className="h-4 w-4" /> Servicios Ofrecidos (separados por comas)
                </Label>
                <Textarea
                  id="services"
                  value={services}
                  onChange={handleServicesChange}
                  placeholder="Perforación, Voladura, Consultoría, etc."
                  rows={2}
                />
              </div>
            </div>

            <Separator />

            <div className="space-y-4">
              <h3 className="text-lg font-medium">Información de Contacto</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="contact_email" className="flex items-center gap-2">
                    <Mail className="h-4 w-4" /> Correo Electrónico
                  </Label>
                  <Input
                    id="contact_email"
                    type="email"
                    value={vendor.contact_email}
                    onChange={(e) => handleChange('contact_email', e.target.value)}
                    placeholder="correo@ejemplo.com"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="contact_phone" className="flex items-center gap-2">
                    <Phone className="h-4 w-4" /> Teléfono de Contacto
                  </Label>
                  <Input
                    id="contact_phone"
                    value={vendor.contact_phone}
                    onChange={(e) => handleChange('contact_phone', e.target.value)}
                    placeholder="+51 999 888 777"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="website" className="flex items-center gap-2">
                    <LinkIcon className="h-4 w-4" /> Sitio Web
                  </Label>
                  <Input
                    id="website"
                    value={vendor.website || ''}
                    onChange={(e) => handleChange('website', e.target.value)}
                    placeholder="https://ejemplo.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="address" className="flex items-center gap-2">
                    <MapPin className="h-4 w-4" /> Dirección
                  </Label>
                  <Input
                    id="address"
                    value={vendor.address || ''}
                    onChange={(e) => handleChange('address', e.target.value)}
                    placeholder="Av. Ejemplo 123, Lima"
                  />
                </div>
              </div>
            </div>

            <Separator />

            <div className="space-y-4">
              <h3 className="text-lg font-medium">Estado y Configuración</h3>
              <div className="flex items-center space-x-2">
                <Switch
                  id="is_active"
                  checked={vendor.is_active}
                  onCheckedChange={(checked) => handleChange('is_active', checked)}
                />
                <Label htmlFor="is_active">Proveedor Activo</Label>
              </div>
              <div className="text-sm text-muted-foreground space-y-2">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" /> 
                  <span>Creado: {new Date(vendor.created_at).toLocaleDateString('es-ES', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}</span>
                </div>
                {vendor.updated_at && (
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" /> 
                    <span>Última actualización: {new Date(vendor.updated_at).toLocaleDateString('es-ES', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}</span>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button variant="outline" type="button" onClick={() => router.push('/vendors')}>
              Cancelar
            </Button>
            <Button type="submit" className="gap-2" disabled={saving}>
              <Save className="w-4 h-4" />
              {saving ? "Guardando..." : "Guardar Cambios"}
            </Button>
          </CardFooter>
        </Card>
      </form>
    </div>
  );
} 