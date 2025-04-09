"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Building2, PencilIcon, AlertCircle } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getVendors, type VendorWithUsers } from "@/lib/services/vendor-service";
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { ExternalLink, Phone, Mail, MapPin } from 'lucide-react';

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
        const { data, error } = await getVendors();
        
        if (error) {
          if (error.message.includes("No has iniciado sesión")) {
            router.push('/auth/login');
            return;
          }
          setError(error.message);
        } else {
          setVendors(data);
        }
      } catch (err: any) {
        setError(err.message || "Error al cargar proveedores");
      } finally {
        setLoading(false);
      }
    }

    loadVendors();
  }, [router]);

  const filteredVendors = vendors?.filter(vendor => {
    if (filter === "all") return true;
    if (filter === "active") return vendor.is_active;
    if (filter === "inactive") return !vendor.is_active;
    // Eliminamos el filtro por categoría ya que no existe en la nueva interfaz
    return true;
  }) || [];

  if (loading) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <h1 className="text-3xl font-bold mb-6">Proveedores</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="w-full">
              <CardHeader>
                <Skeleton className="h-8 w-3/4" />
              </CardHeader>
              <CardContent className="space-y-4">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="h-4 w-1/2" />
              </CardContent>
            </Card>
          ))}
        </div>
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
            {filteredVendors.map((vendor) => (
              <div
                key={vendor.id}
                className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <Building2 className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">{vendor.name}</p>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <span>RUC: {vendor.ruc}</span>
                      <span>•</span>
                      <span>{vendor.contact_email}</span>
                    </div>
                    {vendor.services_provided && vendor.services_provided.length > 0 && (
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                        <span>Servicios: {vendor.services_provided.join(', ')}</span>
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex flex-col items-end">
                    <span className={`px-2 py-1 mt-2 rounded-full text-xs ${
                      vendor.is_active
                        ? "bg-green-100 text-green-700"
                        : "bg-orange-100 text-orange-700"
                    }`}>
                      {vendor.is_active ? "Activo" : "Inactivo"}
                    </span>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="icon"
                    onClick={() => router.push(`/vendors/${vendor.id}`)}
                  >
                    <PencilIcon className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}