'use client';

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import { ArrowLeft, Edit, ExternalLink } from "lucide-react";
import { getVendorById, type VendorWithUsers } from '@/lib/services/vendor-service';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import {
  Building2,
  AlertCircle,
  Tag,
  Mail,
  Phone,
  Link as LinkIcon,
  MapPin,
  Calendar,
  FileText,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export default function VendorClient({ id }: { id: string }) {
  const router = useRouter();
  const { toast } = useToast();
  const [vendor, setVendor] = useState<VendorWithUsers | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
      } catch (err: any) {
        setError(err.message || 'Error al cargar el proveedor');
      } finally {
        setLoading(false);
      }
    };

    fetchVendor();
  }, [id]);

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
              Detalle del proveedor
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Badge className={vendor.is_active ? "bg-green-100 text-green-800" : "bg-orange-100 text-orange-800"}>
            {vendor.is_active ? "Activo" : "Inactivo"}
          </Badge>
          <Button 
            variant="outline" 
            className="gap-2"
            onClick={() => router.push(`/vendors/${id}/edit`)}
          >
            <Edit className="h-4 w-4" /> Editar
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Información del Proveedor
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2 mb-1">
                <Building2 className="h-4 w-4" /> Nombre de la Empresa
              </h3>
              <p className="text-lg font-medium">{vendor.name}</p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2 mb-1">
                <Tag className="h-4 w-4" /> RUT
              </h3>
              <p className="text-lg font-medium">{vendor.rut}</p>
            </div>
            {vendor.description && (
              <div className="md:col-span-2">
                <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2 mb-1">
                  <FileText className="h-4 w-4" /> Descripción
                </h3>
                <p className="text-base">{vendor.description}</p>
              </div>
            )}
            <div>
              <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2 mb-1">
                <Mail className="h-4 w-4" /> Correo Electrónico
              </h3>
              <p className="text-base">
                <a href={`mailto:${vendor.contact_email}`} className="text-primary hover:underline">
                  {vendor.contact_email}
                </a>
              </p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2 mb-1">
                <Phone className="h-4 w-4" /> Teléfono
              </h3>
              <p className="text-base">
                <a href={`tel:${vendor.contact_phone}`} className="text-primary hover:underline">
                  {vendor.contact_phone}
                </a>
              </p>
            </div>
            {vendor.website && (
              <div>
                <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2 mb-1">
                  <LinkIcon className="h-4 w-4" /> Sitio Web
                </h3>
                <p className="text-base">
                  <a href={vendor.website} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline flex items-center gap-1">
                    {vendor.website.replace(/^https?:\/\//, '')}
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </p>
              </div>
            )}
            {vendor.address && (
              <div>
                <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2 mb-1">
                  <MapPin className="h-4 w-4" /> Dirección
                </h3>
                <p className="text-base">{vendor.address}</p>
              </div>
            )}
            {vendor.services_provided && vendor.services_provided.length > 0 && (
              <div className="md:col-span-2">
                <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2 mb-1">
                  <Tag className="h-4 w-4" /> Servicios Ofrecidos
                </h3>
                <div className="flex flex-wrap gap-2 mt-2">
                  {vendor.services_provided.map((service, index) => (
                    <Badge key={index} variant="secondary">
                      {service}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>

          <Separator className="my-4" />
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <h3 className="text-xs font-medium text-muted-foreground flex items-center gap-2 mb-1">
                <Calendar className="h-3 w-3" /> Fecha de registro
              </h3>
              <p>
                {format(new Date(vendor.created_at), "PPP", { locale: es })}
              </p>
            </div>
            <div>
              <h3 className="text-xs font-medium text-muted-foreground flex items-center gap-2 mb-1">
                <Calendar className="h-3 w-3" /> Última actualización
              </h3>
              <p>
                {vendor.updated_at && format(new Date(vendor.updated_at), "PPP", { locale: es })}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 