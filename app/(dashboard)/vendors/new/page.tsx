"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { ArrowLeft, Save } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";

export default function NewVendor() {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    rut: "",
    description: "",
    contact_email: "",
    contact_phone: "",
    address: "",
    website: "",
    is_active: true,
    services: ""
  });

  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Convertir servicios a array
      const servicesArray = formData.services
        .split(',')
        .map(s => s.trim())
        .filter(s => s.length > 0);
        
      // Validar sitio web si existe
      let website = formData.website;
      if (website) {
        try {
          new URL(website);
        } catch (err) {
          if (!/^https?:\/\//i.test(website)) {
            website = `https://${website}`;
            try {
              new URL(website); // Verificar si ahora es válida
            } catch (err) {
              toast({
                title: "URL inválida",
                description: "El sitio web ingresado no es una URL válida.",
                variant: "destructive"
              });
              setLoading(false);
              return;
            }
          } else {
            toast({
              title: "URL inválida",
              description: "El sitio web ingresado no es una URL válida.",
              variant: "destructive"
            });
            setLoading(false);
            return;
          }
        }
      }

      // Construir payload para la API
      const payload = {
          name: formData.name,
          rut: formData.rut,
          description: formData.description || null,
          contact_email: formData.contact_email,
          contact_phone: formData.contact_phone,
          address: formData.address || null,
          website: website || null, // Usar la variable 'website' posiblemente corregida
          is_active: formData.is_active,
          services_provided: servicesArray
      };

      // Llamar a la API POST
      const response = await fetch('/api/admin/vendors', {
          method: 'POST',
          headers: {
              'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
      });

      // Manejar la respuesta de la API
      if (!response.ok) {
          const errorData = await response.json();
          // Usar el mensaje de error proporcionado por la API
          throw new Error(errorData.error || `Error ${response.status} al crear proveedor`); 
      }

      toast({
        title: "Proveedor creado",
        description: "El proveedor ha sido creado exitosamente."
      });

      router.push('/vendors');
    } catch (error: any) {
      console.error('Error al crear proveedor:', error);
      toast({
        title: "Error",
        description: error.message || "No se pudo crear el proveedor. Por favor, intente nuevamente.",
        variant: "destructive"
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
          onClick={() => router.push('/vendors')}
          className="gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <h1 className="text-3xl font-bold">Nuevo Proveedor</h1>
      </div>

      <Card>
        <form onSubmit={handleSubmit}>
          <CardHeader>
            <CardTitle>Información del Proveedor</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="name">Nombre del Proveedor</Label>
                <Input
                  id="name"
                  required
                  value={formData.name}
                  onChange={(e) => handleChange("name", e.target.value)}
                  placeholder="Nombre de la empresa"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="rut">RUT</Label>
                <Input
                  id="rut"
                  required
                  value={formData.rut}
                  onChange={(e) => handleChange("rut", e.target.value)}
                  placeholder="Número de RUT"
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="description">Descripción</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => handleChange("description", e.target.value)}
                  placeholder="Descripción de la empresa y sus servicios"
                  rows={3}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="contact_email">Correo Electrónico</Label>
                <Input
                  id="contact_email"
                  type="email"
                  required
                  value={formData.contact_email}
                  onChange={(e) => handleChange("contact_email", e.target.value)}
                  placeholder="correo@ejemplo.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="contact_phone">Teléfono</Label>
                <Input
                  id="contact_phone"
                  required
                  value={formData.contact_phone}
                  onChange={(e) => handleChange("contact_phone", e.target.value)}
                  placeholder="+51 999 888 777"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="website">Sitio Web</Label>
                <Input
                  id="website"
                  value={formData.website}
                  onChange={(e) => {
                    let value = e.target.value.trim();
                    handleChange("website", value);
                  }}
                  placeholder="www.ejemplo.com"
                />
                <p className="text-xs text-muted-foreground">
                  Puedes ingresar el dominio sin http:// o https://, se agregará automáticamente
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="address">Dirección</Label>
                <Input
                  id="address"
                  value={formData.address}
                  onChange={(e) => handleChange("address", e.target.value)}
                  placeholder="Dirección de la empresa"
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="services">Servicios Ofrecidos</Label>
                <Textarea
                  id="services"
                  value={formData.services}
                  onChange={(e) => handleChange("services", e.target.value)}
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
                    checked={formData.is_active}
                    onCheckedChange={(checked) => handleChange('is_active', checked)}
                  />
                  <span>Proveedor Activo</span>
                </Label>
              </div>
            </div>
          </CardContent>
          <CardFooter>
            <Button 
              type="button"
              variant="outline"
              onClick={() => router.push('/vendors')}
              className="mr-auto"
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={loading} className="gap-2">
              <Save className="w-4 h-4" />
              {loading ? "Guardando..." : "Guardar Proveedor"}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}