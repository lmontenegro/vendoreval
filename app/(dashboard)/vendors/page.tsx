"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Building2, PencilIcon, AlertCircle, ExternalLink, Phone, Mail, MapPin } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { type VendorWithUsers } from "@/lib/services/vendor-service";
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { format } from "date-fns";

// Definir variantes personalizadas para el Badge
const statusVariants = {
  active: "bg-green-100 text-green-700 hover:bg-green-200",
  inactive: "bg-orange-100 text-orange-700 hover:bg-orange-200"
} as const;

export default function Vendors() {
  const router = useRouter();
  const { toast } = useToast();
  const [vendors, setVendors] = useState<VendorWithUsers[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    async function loadVendors() {
      try {
        setLoading(true);
        setError(null);
        
        // Llamar a la API GET
        const response = await fetch('/api/admin/vendors');
        
        if (!response.ok) {
          const errorData = await response.json();
          if (response.status === 401) {
            setError("Tu sesión ha expirado. Por favor, inicia sesión nuevamente.");
            router.push('/auth/login');
          } else if (response.status === 403) {
             setError(errorData.error || "No tienes permisos para ver esta sección.");
          } else {
             throw new Error(errorData.error || "Error al cargar proveedores desde la API");
          }
          setVendors([]); // Poner array vacío en caso de error de permisos/auth
        } else {
          const { data } = await response.json();
          setVendors(data || []); // Asegurar array
        }
      } catch (err: any) {
        console.error("Fetch vendors error:", err);
        setError(err.message || "Error al cargar proveedores");
        toast({ // Mostrar toast en caso de error de fetch
          title: "Error de Carga",
          description: err.message || "No se pudieron cargar los proveedores.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    }

    loadVendors();
  }, [router, toast]); // Añadir toast a las dependencias

  const filteredVendors = vendors?.filter(vendor => {
    if (filter === "all") return true;
    if (filter === "active") return vendor.is_active;
    if (filter === "inactive") return !vendor.is_active;
    return true;
  }) || [];

  if (loading) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Proveedores</h1>
            <Skeleton className="h-4 w-48 mt-2" />
          </div>
          <Skeleton className="h-10 w-36" />
        </div>
        <div className="flex justify-between items-center">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-4 w-32" />
        </div>
        <Card>
          <CardHeader><Skeleton className="h-6 w-40" /></CardHeader>
          <CardContent className="space-y-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-4">
                  <Skeleton className="h-10 w-10 rounded-md" />
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-40" />
                    <Skeleton className="h-3 w-32" />
                  </div>
                </div>
                <div className="flex items-center gap-4 flex-shrink-0 ml-4">
                  <Skeleton className="h-6 w-20 rounded-full" />
                  <Skeleton className="h-8 w-8 rounded-md" />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-6">
        <Alert variant="destructive" className="mb-4">
          <AlertCircle className="h-4 w-4 mr-2" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
        <Button onClick={() => router.push('/dashboard')} className="mt-4">
          Volver al Dashboard
        </Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Proveedores</h1>
          <p className="text-muted-foreground">
            Gestiona y monitorea tus proveedores
          </p>
        </div>
        <Button 
          className="gap-2"
          onClick={() => router.push('/vendors/new')}
        >
          <Plus className="w-4 h-4" /> Nuevo Proveedor
        </Button>
      </div>

      <div className="flex justify-between items-center">
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Filtrar proveedores" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los proveedores</SelectItem>
            <SelectItem value="active">Proveedores activos</SelectItem>
            <SelectItem value="inactive">Proveedores inactivos</SelectItem>
          </SelectContent>
        </Select>
        <p className="text-sm text-muted-foreground">
          {filteredVendors.length} proveedores encontrados
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Lista de Proveedores</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredVendors.length > 0 ? (
              filteredVendors.map((vendor) => (
                <div
                  key={vendor.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                    <div className="p-2 bg-primary/10 rounded-lg flex-shrink-0">
                      <Building2 className="w-5 h-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate" title={vendor.name}>{vendor.name}</p>
                      <p className="text-sm text-muted-foreground">
                        RUT: {vendor.rut}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 flex-shrink-0 ml-4">
                    <Badge className={`text-xs ${vendor.is_active ? statusVariants.active : statusVariants.inactive}`}>
                      {vendor.is_active ? "Activo" : "Inactivo"}
                    </Badge>
                    
                    <TooltipProvider>
                      {vendor.website && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={(e) => {
                                e.stopPropagation();
                                window.open(vendor.website?.startsWith('http') ? vendor.website : `https://${vendor.website}`, '_blank');
                              }}
                            >
                              <ExternalLink className="w-4 h-4 text-muted-foreground hover:text-primary" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent><p>Visitar sitio web</p></TooltipContent>
                        </Tooltip>
                      )}
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button 
                            variant="ghost" 
                            size="icon"
                            onClick={(e) => {
                              e.stopPropagation(); 
                              router.push(`/vendors/${vendor.id}/edit`);
                            }}
                          >
                            <PencilIcon className="w-4 h-4 text-muted-foreground hover:text-primary" />
                          </Button>
                        </TooltipTrigger>
                         <TooltipContent><p>Editar Proveedor</p></TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                 No se encontraron proveedores con los filtros seleccionados.
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}