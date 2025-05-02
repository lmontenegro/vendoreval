import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { X, ChevronsUpDown, PlusCircle, Loader2 } from "lucide-react";

interface Vendor {
  id: string;
  name: string;
  status?: string;
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
  const [allVendors, setAllVendors] = useState<Vendor[]>([]);
  const [selectedVendors, setSelectedVendors] = useState<Vendor[]>([]);
  const [availableVendors, setAvailableVendors] = useState<Vendor[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const initialFetchDoneRef = useRef<boolean>(false);

  // Efecto para cargar los vendors al montar el componente
  useEffect(() => {
    const fetchVendors = async () => {
      // Si ya hemos hecho la carga inicial, no hacerla nuevamente
      if (initialFetchDoneRef.current) return;

      setLoading(true);
      try {
        console.log("Cargando inicialmente todos los vendors disponibles");
        const response = await fetch('/api/evaluations/vendors');
        if (!response.ok) {
          throw new Error(`Error ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        const vendorsList = data.data || [];
        
        // Guardar todos los vendors disponibles
        setAllVendors(vendorsList);
        initialFetchDoneRef.current = true;

        // Procesar los vendors seleccionados inicialmente
        const validSelectedIds = Array.isArray(selectedVendorIds)
          ? selectedVendorIds.filter(id => typeof id === 'string' && id.trim() !== '')
          : [];
        
        if (validSelectedIds.length > 0) {
          // Filtrar vendors seleccionados usando los IDs proporcionados
          const selected = vendorsList.filter((v: Vendor) => 
            validSelectedIds.includes(v.id)
          ).map((v: Vendor) => ({
            ...v,
            status: v.status || 'pending' // Asegurar que tengan status por defecto
          }));
          
          setSelectedVendors(selected);
          setAvailableVendors(vendorsList.filter((v: Vendor) => !validSelectedIds.includes(v.id)));
        } else {
          // Si no hay seleccionados, todos están disponibles
          setSelectedVendors([]);
          setAvailableVendors(vendorsList);
        }
      } catch (error) {
        console.error("Error cargando vendors:", error);
        setAllVendors([]);
        setAvailableVendors([]);
      } finally {
        setLoading(false);
      }
    };

    fetchVendors();
  }, []);

  // Efecto para actualizar la selección basada en props sin hacer peticiones API
  useEffect(() => {
    // Si todavía no hemos cargado los vendors, no hacer nada
    if (allVendors.length === 0) return;

    console.log("Actualizando selección local de vendors sin peticiones API");

    // Garantizar que selectedVendorIds sea un array válido
    const validSelectedIds = Array.isArray(selectedVendorIds)
      ? selectedVendorIds.filter(id => typeof id === 'string' && id.trim() !== '')
      : [];

    if (validSelectedIds.length > 0) {
      // Filtrar vendors seleccionados del listado completo
      const selected = allVendors.filter((v: Vendor) =>
        validSelectedIds.includes(v.id)
      ).map((v: Vendor) => ({
        ...v,
        status: v.status || 'pending' // Asegurar que tengan status por defecto
      }));

      // Actualizar estado local
      setSelectedVendors(selected);

      // Actualizar vendors disponibles (los que no están seleccionados)
      setAvailableVendors(allVendors.filter((v: Vendor) => !validSelectedIds.includes(v.id)));
    } else {
      // Si no hay seleccionados, todos están disponibles
      setSelectedVendors([]);
      setAvailableVendors([...allVendors]);
    }
  }, [selectedVendorIds, allVendors]);

  const handleVendorSelection = (vendor: Vendor) => {
    // Verificar si el vendor ya está seleccionado
    const isSelected = selectedVendors.some(v => v.id === vendor.id);

    if (isSelected) {
      // Si ya está seleccionado, lo quitamos
      const updatedVendors = selectedVendors.filter(v => v.id !== vendor.id);
      setSelectedVendors(updatedVendors);
      onSelect(updatedVendors.map(v => v.id));

      // Agregarlo a los disponibles
      setAvailableVendors([...availableVendors, vendor]);
    } else {
      // Si no está seleccionado, lo agregamos con status "pending" por defecto
      const vendorWithStatus = { ...vendor, status: "pending" };
      const updatedVendors = [...selectedVendors, vendorWithStatus];
      setSelectedVendors(updatedVendors);
      onSelect(updatedVendors.map(v => v.id));

      // Quitarlo de los disponibles
      setAvailableVendors(availableVendors.filter(v => v.id !== vendor.id));
    }
  };

  const removeVendor = (vendorId: string) => {
    const vendorToRemove = selectedVendors.find(v => v.id === vendorId);
    const updatedVendors = selectedVendors.filter(v => v.id !== vendorId);
    setSelectedVendors(updatedVendors);
    onSelect(updatedVendors.map(v => v.id));
    
    // Agregarlo a los disponibles
    if (vendorToRemove) {
      // Al removerlo, lo agregamos sin status para la lista de disponibles
      const vendorForAvailable = {
        id: vendorToRemove.id,
        name: vendorToRemove.name
      };
      setAvailableVendors([...availableVendors, vendorForAvailable]);
    }
  };

  const toggleDropdown = (event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    setIsOpen(!isOpen);
  };

  const buttonText = selectedVendors.length > 0
    ? "Cambiar proveedores"
    : "Asignar proveedores";

  // Función para obtener el color de badge según el status
  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'in_progress':
        return 'bg-blue-100 text-blue-800';
      case 'pending':
      default:
        return 'bg-amber-100 text-amber-800';
    }
  };

  // Función para traducir el status
  const translateStatus = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'completed':
        return 'Completado';
      case 'in_progress':
        return 'En progreso';
      case 'pending':
      default:
        return 'Pendiente';
    }
  };

  return (
    <div className="space-y-4">
      {/* Mostrar los vendors seleccionados como badges */}
      <div className="flex flex-wrap gap-2 min-h-[32px]">
        {selectedVendors.length > 0 ? (
          selectedVendors.map(vendor => (
            <Badge key={vendor.id} variant="secondary" className="flex items-center gap-1 py-1 px-3">
              <div className="flex items-center">
                <span>{vendor.name}</span>
                {vendor.status && (
                  <span className={`ml-2 text-xs px-1.5 py-0.5 rounded-full ${getStatusColor(vendor.status)}`}>
                    {translateStatus(vendor.status)}
                  </span>
                )}
              </div>
              <button
                type="button"
                className="ml-1 rounded-full text-muted-foreground hover:text-foreground"
                onClick={() => removeVendor(vendor.id)}
                disabled={disabled}
              >
                <X className="h-3 w-3" />
                <span className="sr-only">Eliminar</span>
              </button>
            </Badge>
          ))
        ) : (
          <p className="text-sm text-muted-foreground">
              No hay proveedores asignados a esta evaluación. Utilice el selector para asignar proveedores.
          </p>
        )}
      </div>

      {/* Botón para mostrar/ocultar el dropdown */}
      <Button
        type="button"
        variant={selectedVendors.length > 0 ? "outline" : "default"}
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
              {selectedVendors.length > 0 ? (
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
          <h4 className="text-sm font-medium mb-2">Seleccionar proveedores:</h4>

          {loading ? (
            <div className="py-4 text-center flex items-center justify-center">
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              <span className="text-sm text-muted-foreground">Cargando proveedores...</span>
            </div>
          ) : availableVendors.length > 0 ? (
            <div className="max-h-[200px] overflow-y-auto">
              <ul className="space-y-1 py-1">
                  {availableVendors.map(vendor => {
                  return (
                    <li key={vendor.id}>
                      <button
                        type="button"
                        className="w-full text-left px-2 py-2 rounded flex items-center text-sm hover:bg-gray-100"
                        onClick={() => handleVendorSelection(vendor)}
                        disabled={disabled}
                      >
                        {vendor.name}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground py-2 text-center">
                  {selectedVendors.length > 0
                    ? "Todos los proveedores disponibles ya han sido seleccionados."
                    : "No se encontraron proveedores disponibles."}
            </p>
          )}
          
          <div className="mt-4 flex justify-between">
            <div className="text-xs text-muted-foreground">
              {selectedVendors.length > 0 ?
                `${selectedVendors.length} proveedor${selectedVendors.length !== 1 ? 'es' : ''} seleccionado${selectedVendors.length !== 1 ? 's' : ''}` :
                'Haga clic en un proveedor para seleccionarlo'
              }
            </div>
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