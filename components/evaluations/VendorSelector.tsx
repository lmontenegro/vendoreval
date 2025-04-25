import { useEffect, useState, useRef } from "react";
import { Check, ChevronsUpDown, X, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { Alert } from "@/components/ui/alert";

interface Vendor {
  id: string;
  name: string;
}

interface VendorSelectorProps {
  selectedVendorIds: string[];
  onSelect: (vendorIds: string[]) => void;
  disabled?: boolean;
  adminMode?: boolean;
}

export function VendorSelector({
  selectedVendorIds,
  onSelect,
  disabled = false,
  adminMode = false
}: VendorSelectorProps) {
  // Usar useRef para prevenir el bucle infinito
  const prevSelectedIdsRef = useRef<string[]>([]);

  const [open, setOpen] = useState(false);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedVendors, setSelectedVendors] = useState<Vendor[]>([]);
  const [loadingTimeout, setLoadingTimeout] = useState<boolean>(false);

  // Función para comprobar si los arrays de IDs han cambiado realmente
  const haveIdsChanged = (prevIds: string[], currentIds: string[] | undefined) => {
    if (!currentIds) return prevIds.length > 0;
    if (prevIds.length !== currentIds.length) return true;

    const validCurrentIds = currentIds.filter(id =>
      id !== undefined && id !== null && typeof id === 'string' && id.trim() !== ''
    );

    return validCurrentIds.some(id => !prevIds.includes(id)) ||
      prevIds.some(id => !validCurrentIds.includes(id));
  };

  useEffect(() => {
    // Añadir un timeout para mostrar un mensaje si la carga tarda demasiado
    const timeout = setTimeout(() => {
      setLoadingTimeout(true);
    }, 5000); // 5 segundos

    // Garantizar que selectedVendorIds siempre sea un array de strings válidos
    const validSelectedIds = Array.isArray(selectedVendorIds)
      ? selectedVendorIds.filter(id => id !== undefined && id !== null && typeof id === 'string' && id.trim() !== '')
      : [];

    // Solo ejecutar si los IDs realmente han cambiado
    if (!haveIdsChanged(prevSelectedIdsRef.current, validSelectedIds)) {
      clearTimeout(timeout);
      return () => clearTimeout(timeout);
    }

    // Actualizar la referencia con los nuevos IDs válidos
    prevSelectedIdsRef.current = [...validSelectedIds];

    console.log("VendorSelector: selectedVendorIds recibidos:", selectedVendorIds);
    console.log("VendorSelector: IDs válidos para fetch:", validSelectedIds);

    const fetchVendors = async () => {
      try {
        setLoading(true);
        setError(null);

        // 1. Obtener todos los vendors disponibles
        const vendorsEndpoint = adminMode ? '/api/admin/vendors' : '/api/evaluations/vendors';
        const vendorsResponse = await fetch(vendorsEndpoint);

        if (!vendorsResponse.ok) {
          if (vendorsResponse.status === 403) {
            setError("No tienes permisos para ver la lista de proveedores. Contacta a un administrador.");
            setVendors([]);
            setLoading(false);
            return;
          } else {
            throw new Error(`Error cargando proveedores: ${vendorsResponse.statusText}`);
          }
        }

        const { data: allVendors } = await vendorsResponse.json();

        // 2. Si hay IDs seleccionados, obtener los vendors asignados a esta evaluación
        const selectedVendorsData: Vendor[] = [];

        if (validSelectedIds.length > 0) {
          // Mapear los IDs a objetos vendor usando allVendors como referencia
          for (const id of validSelectedIds) {
            const vendor = Array.isArray(allVendors)
              ? allVendors.find((v: any) => v.id === id)
              : null;

            if (vendor && typeof vendor.id === 'string' && vendor.id.trim() !== '') {
              selectedVendorsData.push({
                id: vendor.id,
                name: vendor.name || 'Sin nombre'
              });
            }
          }
        }

        // Garantizar que allVendors siempre es un array de vendors válidos
        const vendorsList: Vendor[] = Array.isArray(allVendors)
          ? allVendors.filter((vendor: any) =>
            vendor &&
            typeof vendor === 'object' &&
            typeof vendor.id === 'string' && vendor.id.trim() !== '' &&
            typeof vendor.name === 'string'
          )
          : [];

        console.log("VendorSelector: vendors disponibles:", vendorsList);
        console.log("VendorSelector: vendors seleccionados:", selectedVendorsData);

        setVendors(vendorsList);
        setSelectedVendors(selectedVendorsData);

      } catch (error) {
        console.error("Error fetching vendors:", error);
        setError("Error al cargar los proveedores. Intenta de nuevo más tarde.");
        setVendors([]);
        setSelectedVendors([]);
      } finally {
        setLoading(false);
        clearTimeout(timeout);
      }
    };

    fetchVendors();

    return () => clearTimeout(timeout);
  }, [selectedVendorIds, adminMode]); // Mantener selectedVendorIds como dependencia

  const handleSelect = (vendor: Vendor) => {
    if (!vendor || typeof vendor.id !== 'string' || vendor.id.trim() === '') return;

    let updatedSelection;
    const isSelected = selectedVendors.some(v => v.id === vendor.id);

    if (isSelected) {
      updatedSelection = selectedVendors.filter(v => v.id !== vendor.id);
    } else {
      updatedSelection = [...selectedVendors, vendor];
    }

    setSelectedVendors(updatedSelection);
    // Garantizar que solo se devuelven ids válidos y no vacíos
    const validIds = updatedSelection
      .map(v => v.id)
      .filter(id => typeof id === 'string' && id.trim() !== '');
    onSelect(validIds);
  };

  const removeVendor = (vendorId: string) => {
    if (!vendorId || typeof vendorId !== 'string' || vendorId.trim() === '') return;

    const updatedSelection = selectedVendors.filter(v => v.id !== vendorId);
    setSelectedVendors(updatedSelection);
    // Garantizar que solo se devuelven ids válidos y no vacíos
    const validIds = updatedSelection
      .map(v => v.id)
      .filter(id => typeof id === 'string' && id.trim() !== '');
    onSelect(validIds);
  };

  // Garantizar que vendors siempre sea un array válido para el renderizado
  const safeVendors = Array.isArray(vendors)
    ? vendors.filter(v => v && typeof v.id === 'string' && v.id.trim() !== '')
    : [];

  // Garantizar que selectedVendors siempre sea un array válido para el renderizado
  const safeSelectedVendors = Array.isArray(selectedVendors)
    ? selectedVendors.filter(v => v && typeof v.id === 'string' && v.id.trim() !== '')
    : [];

  const buttonText = loading
    ? (loadingTimeout
      ? "La carga está tardando más de lo esperado..."
      : "Cargando proveedores...")
    : error
      ? "No se pudieron cargar los proveedores"
      : safeVendors.length === 0
        ? "No hay proveedores disponibles"
        : "Seleccionar proveedores";

  return (
    <div className="space-y-2">
      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertCircle className="h-4 w-4" />
          <div className="ml-2 text-sm">{error}</div>
        </Alert>
      )}

      {loadingTimeout && loading && (
        <Alert variant="default" className="mb-4">
          <AlertCircle className="h-4 w-4" />
          <div className="ml-2 text-sm">
            La carga de proveedores está tardando más de lo habitual.
            Si persiste el problema, intenta recargar la página.
          </div>
        </Alert>
      )}

      <Popover open={open && !disabled} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between"
            disabled={disabled || (loading && !loadingTimeout)}
          >
            {buttonText}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        {open && !disabled && (
          <PopoverContent className="w-full p-0">
            <Command>
              <CommandInput placeholder="Buscar proveedor..." />
              <CommandEmpty>
                {safeVendors.length === 0
                  ? "No hay proveedores disponibles."
                  : "No se encontraron proveedores."}
              </CommandEmpty>
              <CommandGroup className="max-h-64 overflow-y-auto">
                {safeVendors.map((vendor) => (
                  <CommandItem
                    key={vendor.id}
                    value={vendor.id}
                    onSelect={() => handleSelect(vendor)}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        safeSelectedVendors.some(v => v.id === vendor.id)
                          ? "opacity-100"
                          : "opacity-0"
                      )}
                    />
                    {vendor.name || "Sin nombre"}
                  </CommandItem>
                ))}
              </CommandGroup>
            </Command>
          </PopoverContent>
        )}
      </Popover>

      {safeSelectedVendors.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-2">
          {safeSelectedVendors.map((vendor) => (
            <Badge
              key={vendor.id}
              variant="secondary"
              className="flex items-center gap-1"
            >
              {vendor.name || "Sin nombre"}
              <button
                type="button"
                onClick={() => removeVendor(vendor.id)}
                className="ml-1 rounded-full hover:bg-muted p-0.5 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1"
                disabled={disabled}
              >
                <X className="h-3 w-3" />
                <span className="sr-only">
                  Eliminar {vendor.name || "proveedor"}
                </span>
              </button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
} 