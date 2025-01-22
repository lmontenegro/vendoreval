"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Building2, PencilIcon, CheckCircle2, AlertTriangle, XCircle } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getVendors, type Vendor } from "@/lib/services/vendor-service";

export default function Vendors() {
  const router = useRouter();
  const { toast } = useToast();
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    const fetchVendors = async () => {
      try {
        const { data, error } = await getVendors();
        
        if (error) throw error;
        if (data) setVendors(data);
      } catch (error) {
        toast({
          title: "Error",
          description: "No se pudieron cargar los proveedores.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchVendors();
  }, [toast]);

  const getComplianceIcon = (status: string) => {
    switch (status) {
      case 'compliant':
        return <CheckCircle2 className="w-5 h-5 text-green-600" />;
      case 'pending':
        return <AlertTriangle className="w-5 h-5 text-yellow-600" />;
      case 'non_compliant':
        return <XCircle className="w-5 h-5 text-red-600" />;
      default:
        return null;
    }
  };

  const getComplianceLabel = (status: string) => {
    switch (status) {
      case 'compliant':
        return 'Cumple';
      case 'pending':
        return 'En Revisión';
      case 'non_compliant':
        return 'No Cumple';
      default:
        return status;
    }
  };

  const getComplianceClass = (status: string) => {
    switch (status) {
      case 'compliant':
        return 'bg-green-100 text-green-700';
      case 'pending':
        return 'bg-yellow-100 text-yellow-700';
      case 'non_compliant':
        return 'bg-red-100 text-red-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const filteredVendors = vendors.filter(vendor => {
    if (filter === "all") return true;
    if (filter === "active") return vendor.status === "Activo";
    if (filter === "inactive") return vendor.status === "Inactivo";
    return vendor.category === filter;
  });

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">
      <p className="text-muted-foreground">Cargando proveedores...</p>
    </div>;
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
            <SelectItem value="Materiales">Materiales</SelectItem>
            <SelectItem value="Servicios">Servicios</SelectItem>
            <SelectItem value="Equipamiento">Equipamiento</SelectItem>
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
                      <span>{vendor.category}</span>
                      <span>•</span>
                      <span>{vendor.contact.email}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                      <span>Calificación: ⭐ {vendor.rating}</span>
                      <span>•</span>
                      <span>Certificaciones: {vendor.certifications.length}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex flex-col items-end">
                    <div className="flex items-center gap-2">
                      {getComplianceIcon(vendor.compliance_status || '')}
                      <span className={`px-2 py-1 rounded-full text-xs ${getComplianceClass(vendor.compliance_status || '')}`}>
                        {getComplianceLabel(vendor.compliance_status || '')}
                      </span>
                    </div>
                    <span className={`px-2 py-1 mt-2 rounded-full text-xs ${
                      vendor.status === "Activo"
                        ? "bg-green-100 text-green-700"
                        : "bg-orange-100 text-orange-700"
                    }`}>
                      {vendor.status}
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