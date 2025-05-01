import { useState, useEffect, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { VendorSelectorContainer } from "./VendorSelectorContainer";
import { useToast } from "@/components/ui/use-toast";
import { Building2, CheckCircle2, Users } from "lucide-react";
import { Skeleton } from "../ui/skeleton";
import Link from "next/link";

interface Vendor {
  id: string;
  vendor_id: string;
  name: string;
  contact_email: string | null;
  contact_phone: string | null;
  status: string;
  assigned_at: string;
  completed_at: string | null;
}

interface VendorAssignmentProps {
  evaluationId: string;
  canManage?: boolean;
}

export function VendorAssignment({ evaluationId, canManage = false }: VendorAssignmentProps) {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const initialLoadComplete = useRef(false);

  // Estados para manejar los IDs de los proveedores seleccionados
  const [selectedVendorIds, setSelectedVendorIds] = useState<string[]>([]);

  const { toast } = useToast();

  // Cargar los proveedores asignados cuando se monta el componente
  useEffect(() => {
    if (!initialLoadComplete.current) {
      fetchVendors();
    }
  }, [evaluationId]);

  const fetchVendors = async () => {
    try {
      setLoading(true);
      console.log(`🔄 Obteniendo proveedores para evaluación: ${evaluationId}`);

      const response = await fetch(`/api/evaluations/${evaluationId}/vendors`);

      if (!response.ok) {
        if (response.status === 404) {
          // No vendors found, not an error
          setVendors([]);
          setSelectedVendorIds([]);
          return;
        }
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }

      const { data } = await response.json();

      // Asegurar que data siempre es un array
      const vendorsList = Array.isArray(data) ? data : [];
      setVendors(vendorsList);

      // Extraer IDs de vendor, asegurando que no hay undefined
      const vendorIds = vendorsList
        .map((v: Vendor) => v.vendor_id)
        .filter(Boolean);

      console.log(`✅ Proveedores cargados: ${vendorIds.length}`);

      // Actualizar el estado
      setSelectedVendorIds(vendorIds);
      initialLoadComplete.current = true;
    } catch (error) {
      console.error("Error fetching vendors:", error);
      // En caso de error, establecer arrays vacíos para evitar undefined
      setVendors([]);
      setSelectedVendorIds([]);

      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudieron cargar los proveedores asignados"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleVendorSelect = (vendorIds: string[]) => {
    // Actualizamos el estado local sin hacer peticiones adicionales
    setSelectedVendorIds(vendorIds);
  };

  const startEditing = (e: React.MouseEvent) => {
    // Prevenir cualquier propagación del evento que pueda causar comportamientos inesperados
    e.preventDefault();
    e.stopPropagation();

    console.log("Iniciando modo de edición");
    setEditing(true);
  };

  const cancelEditing = () => {
    setEditing(false);
    // Recargar datos si el usuario cancela para volver al estado original
    const vendorIds = vendors
      .map(v => v.vendor_id)
      .filter(Boolean);

    setSelectedVendorIds(vendorIds);
  };

  const saveVendors = async () => {
    try {
      setSaving(true);
      console.log(`💾 Guardando ${selectedVendorIds.length} proveedores para evaluación ${evaluationId}`);

      const response = await fetch(`/api/evaluations/${evaluationId}/vendors`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ vendor_ids: selectedVendorIds })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Error ${response.status}`);
      }

      // Actualizar el listado de proveedores después de guardar
      await fetchVendors();
      setEditing(false);

      toast({
        title: "Proveedores actualizados",
        description: "Los proveedores se han asignado correctamente"
      });
    } catch (error: any) {
      console.error("Error saving vendors:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "No se pudieron guardar los cambios"
      });
    } finally {
      setSaving(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed':
        return (
          <Badge variant="secondary" className="flex items-center gap-1 bg-green-100 text-green-800 hover:bg-green-200">
            <CheckCircle2 className="w-3 h-3" />
            Completada
          </Badge>
        );
      case 'in_progress':
        return (
          <Badge variant="secondary" className="flex items-center gap-1 bg-amber-100 text-amber-800 hover:bg-amber-200">
            <Users className="w-3 h-3" />
            En progreso
          </Badge>
        );
      case 'pending':
      default:
        return (
          <Badge variant="outline" className="flex items-center gap-1">
            <Users className="w-3 h-3" />
            Pendiente
          </Badge>
        );
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Proveedores Asignados
          </CardTitle>
          <CardDescription>
            Gestiona los proveedores asignados a esta evaluación
          </CardDescription>
        </div>

        {canManage && !editing && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={startEditing}
            disabled={loading}
          >
            Editar asignaciones
          </Button>
        )}

        {editing && (
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={cancelEditing}
              disabled={saving}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              variant="default"
              size="sm"
              onClick={saveVendors}
              disabled={saving}
            >
              {saving ? "Guardando..." : "Guardar"}
            </Button>
          </div>
        )}
      </CardHeader>

      <CardContent>
        {loading ? (
          <div className="space-y-4">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        ) : editing ? (
            <VendorSelectorContainer
              selectedVendorIds={selectedVendorIds}
              onSelect={handleVendorSelect}
              disabled={saving}
            />
        ) : vendors.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground">
            <p>No hay proveedores asignados a esta evaluación</p>
            {canManage && (
              <Button
                    type="button"
                variant="outline"
                size="sm"
                onClick={startEditing}
                className="mt-4"
              >
                Asignar proveedores
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {vendors.map(vendor => (
              <div key={vendor.id} className="border rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/vendors/${vendor.vendor_id}`}
                        className="font-medium hover:underline text-primary"
                      >
                        {vendor.name}
                      </Link>
                      {getStatusBadge(vendor.status)}
                    </div>

                    <div className="text-sm text-muted-foreground">
                      {vendor.contact_email && (
                        <div className="flex items-center gap-1 mt-1">
                          <span>Email:</span>
                          <a href={`mailto:${vendor.contact_email}`} className="hover:underline">
                            {vendor.contact_email}
                          </a>
                        </div>
                      )}

                      {vendor.contact_phone && (
                        <div className="flex items-center gap-1 mt-1">
                          <span>Teléfono:</span>
                          <a href={`tel:${vendor.contact_phone}`} className="hover:underline">
                            {vendor.contact_phone}
                          </a>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="text-sm text-muted-foreground">
                    <div>Asignado: {formatDate(vendor.assigned_at)}</div>
                    {vendor.completed_at && (
                      <div>Completado: {formatDate(vendor.completed_at)}</div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}