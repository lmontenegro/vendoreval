import { useState, useEffect, useRef, memo } from "react";
import { VendorSelector } from "./VendorSelector";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { Save } from "lucide-react";

interface VendorSelectorContainerProps {
  selectedVendorIds: string[];
  onSelect: (vendorIds: string[]) => void;
  disabled?: boolean;
  adminMode?: boolean;
}

/**
 * Componente contenedor que aísla VendorSelector para prevenir actualizaciones automáticas
 * Solo notifica al componente padre cuando se presiona el botón de guardar
 */
export const VendorSelectorContainer = memo(function VendorSelectorContainer({
  selectedVendorIds = [],
  onSelect,
  disabled = false,
  adminMode = false
}: VendorSelectorContainerProps) {
  // Guardar internamente los IDs seleccionados
  const [internalSelectedIds, setInternalSelectedIds] = useState<string[]>([]);
  const [hasChanges, setHasChanges] = useState(false);
  const initializedRef = useRef(false);
  const processingUpdateRef = useRef(false);

  // Ref para mantener los IDs actuales sin causar re-renders
  const currentIdsRef = useRef<string[]>([]);

  // Inicializar los IDs internos solo una vez al montar o cuando cambian los selectedVendorIds
  useEffect(() => {
    // Evitar ciclos de actualización si nosotros iniciamos el cambio
    if (processingUpdateRef.current) {
      processingUpdateRef.current = false;
      return;
    }

    // Garantizar que selectedVendorIds es un array válido
    const validIds = Array.isArray(selectedVendorIds)
      ? selectedVendorIds.filter(id => typeof id === 'string' && id.trim() !== '')
      : [];

    // Actualizar la referencia
    currentIdsRef.current = [...validIds];

    // Actualizar el estado (solo si es necesario)
    if (!initializedRef.current || JSON.stringify(internalSelectedIds) !== JSON.stringify(validIds)) {
      setInternalSelectedIds(validIds);
      initializedRef.current = true;

      // Resetear el estado de cambios cuando llegan nuevas props
      setHasChanges(false);
    }
  }, [selectedVendorIds]);

  // Manejar cambios de selección localmente sin propagar hacia arriba
  const handleInternalSelect = (ids: string[]) => {
    // Prevenir ciclos de actualización
    if (processingUpdateRef.current) {
      processingUpdateRef.current = false;
      return;
    }

    // Garantizar que ids es un array válido
    const validIds = Array.isArray(ids)
      ? ids.filter(id => typeof id === 'string' && id.trim() !== '')
      : [];

    // Actualizar el estado interno
    setInternalSelectedIds(validIds);

    // Determinar si hay cambios comparando con la referencia actual
    const originalIds = currentIdsRef.current;

    // Verificar si hay diferencias usando método seguro
    const hasDifferences =
      originalIds.length !== validIds.length ||
      !originalIds.every(id => validIds.includes(id)) ||
      !validIds.every(id => originalIds.includes(id));

    setHasChanges(hasDifferences);

    // Actualizar la referencia para futuras comparaciones
    // pero NO notificar al componente padre todavía
  };

  // Enviar cambios al componente padre solo cuando se presiona el botón
  const saveChanges = () => {
    if (hasChanges) {
      console.log("[VendorSelectorContainer] Notificando cambios explícitamente:", internalSelectedIds);

      // Marcar que estamos procesando para evitar ciclos de actualización
      processingUpdateRef.current = true;

      // Actualizar la referencia con los nuevos valores
      currentIdsRef.current = [...internalSelectedIds];

      // Notificar al componente padre solo cuando se presiona el botón
      onSelect(internalSelectedIds);
      setHasChanges(false);
    }
  };

  return (
    <div className="space-y-4">
      <VendorSelector
        selectedVendorIds={internalSelectedIds}
        onSelect={handleInternalSelect}
        disabled={disabled}
        adminMode={adminMode}
      />

      {hasChanges && (
        <div className="flex justify-end">
          <Button
            onClick={saveChanges}
            disabled={disabled}
            className="gap-2"
          >
            <Save className="h-4 w-4" />
            Guardar cambios de proveedores
          </Button>
        </div>
      )}
    </div>
  );
}); 