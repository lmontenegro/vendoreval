import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { X, ChevronsUpDown, PlusCircle, Loader2 } from "lucide-react";

interface Vendor {
  id: string;
  name: string;
}

interface VendorSelectorContainerProps {
  selectedVendorIds: string[];
  onSelect: (vendorIds: string[]) => void;
  disabled?: boolean;
  adminMode?: boolean;
}

export function VendorSelectorContainer({
  selectedVendorIds,
  onSelect,
  disabled = false,
  adminMode = false
}: VendorSelectorContainerProps) {
  const [loading, setLoading] = useState(false);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [selectedVendor, setSelectedVendor] = useState<Vendor | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  // Efecto para cargar los vendors al montar el componente
  useEffect(() => {
    const fetchVendors = async () => {
      setLoading(true);
      try {
        console.log("Cargando todos los vendors disponibles");
        
        const response = await fetch('/api/evaluations/vendors');
        if (!response.ok) {
          throw new Error(`Error ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        const vendorsList = data.data || [];
        
        setVendors(vendorsList);
        
        // Si hay vendors seleccionados (tomamos solo el primero)
        if (selectedVendorIds.length > 0) {
          const selectedId = selectedVendorIds[0]; // Solo tomamos el primero
          const found = vendorsList.find((v: Vendor) => v.id === selectedId);
          setSelectedVendor(found || null);
          
          // Si el componente padre tiene múltiples IDs, actualizamos para tener solo uno
          if (selectedVendorIds.length > 1) {
            onSelect([selectedId]);
          }
        } else {
          setSelectedVendor(null);
        }
      } catch (error) {
        console.error("Error cargando vendors:", error);
        setVendors([]);
      } finally {
        setLoading(false);
      }
    };

    fetchVendors();
  }, [selectedVendorIds, onSelect]);

  const handleVendorSelection = (vendor: Vendor) => {
    // Si ya está seleccionado este vendor, lo quitamos
    if (selectedVendor && selectedVendor.id === vendor.id) {
      setSelectedVendor(null);
      onSelect([]);
    } else {
      // Seleccionamos el nuevo vendor (reemplazando cualquier selección anterior)
      setSelectedVendor(vendor);
      onSelect([vendor.id]);
    }
    
    // Cerrar el dropdown después de seleccionar
    setIsOpen(false);
  };

  const removeVendor = () => {
    setSelectedVendor(null);
    onSelect([]);
  };

  const toggleDropdown = (event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    setIsOpen(!isOpen);
  };

  const buttonText = selectedVendor
    ? "Cambiar proveedor"
    : "Asignar proveedor";

  return (
    <div className="space-y-4">
      {/* Mostrar el vendor seleccionado como badge */}
      <div className="flex flex-wrap gap-2 min-h-[32px]">
        {selectedVendor ? (
          <Badge variant="secondary" className="flex items-center gap-1 py-1 px-3">
            {selectedVendor.name}
            <button
              type="button"
              className="ml-1 rounded-full text-muted-foreground hover:text-foreground"
              onClick={removeVendor}
              disabled={disabled}
            >
              <X className="h-3 w-3" />
              <span className="sr-only">Eliminar</span>
            </button>
          </Badge>
        ) : (
          <p className="text-sm text-muted-foreground">
            No hay proveedor asignado a esta evaluación. Utilice el selector para asignar un proveedor.
          </p>
        )}
      </div>

      {/* Botón para mostrar/ocultar el dropdown */}
      <Button
        type="button"
        variant={selectedVendor ? "outline" : "default"}
        className="w-full justify-between"
        onClick={toggleDropdown}
        disabled={disabled}
      >
        {loading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Cargando proveedores...
          </>
        ) : (
          <>
            {buttonText}
            {selectedVendor ? (
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            ) : (
              <PlusCircle className="ml-2 h-4 w-4 shrink-0 opacity-70" />
            )}
          </>
        )}
      </Button>

      {/* Dropdown con la lista de vendors como opciones de menú */}
      {isOpen && (
        <div className="border rounded-md p-4 mt-2 bg-background shadow-md z-50">
          <h4 className="text-sm font-medium mb-2">Seleccionar proveedor:</h4>

          {loading ? (
            <div className="py-4 text-center flex items-center justify-center">
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              <span className="text-sm text-muted-foreground">Cargando proveedores...</span>
            </div>
          ) : vendors.length > 0 ? (
            <div className="max-h-[200px] overflow-y-auto">
              <ul className="space-y-1 py-1">
                {vendors.map(vendor => {
                  const isSelected = selectedVendor?.id === vendor.id;
                  return (
                    <li key={vendor.id}>
                      <button
                        type="button"
                        className={`w-full text-left px-2 py-2 rounded flex items-center text-sm
                          ${isSelected 
                            ? 'bg-amber-100 text-amber-800 font-medium' 
                            : 'hover:bg-gray-100'
                          }`}
                        onClick={() => handleVendorSelection(vendor)}
                        disabled={disabled}
                      >
                        {vendor.name}
                        {isSelected && (
                          <span className="ml-auto text-xs bg-amber-200 text-amber-800 px-2 py-0.5 rounded-full">
                            Seleccionado
                          </span>
                        )}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground py-2 text-center">
              No se encontraron proveedores disponibles.
            </p>
          )}
          
          {/* Botón para cerrar el dropdown */}
          <div className="mt-4 flex justify-end">
            <Button 
              type="button"
              size="sm"
              variant="outline"
              onClick={toggleDropdown}
            >
              Cerrar
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}