import { useEffect, useState, useRef, ReactNode } from "react";
import { Check, ChevronsUpDown, X, AlertCircle, PlusCircle } from "lucide-react";
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

// Componente para manejar errores en el renderizado
function ErrorBoundary({ children, fallback }: { children: ReactNode, fallback: ReactNode }) {
  const [hasError, setHasError] = useState(false);

  // Usamos useEffect para simular el comportamiento de un error boundary
  useEffect(() => {
    const errorHandler = (event: ErrorEvent) => {
      event.preventDefault();
      setHasError(true);
      console.error("Error capturado en ErrorBoundary:", event.error);
    };

    window.addEventListener('error', errorHandler);

    return () => {
      window.removeEventListener('error', errorHandler);
    };
  }, []);

  if (hasError) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}

// Componente de fallback simple para el selector
function SimpleFallbackSelector({
  buttonText,
  vendors,
  selectedVendors,
  onSelect,
  disabled
}: {
  buttonText: string,
  vendors: Vendor[],
  selectedVendors: Vendor[],
  onSelect: (vendorIds: string[]) => void,
  disabled: boolean
}) {
  const [isOpen, setIsOpen] = useState(false);

  const toggleOpen = () => {
    if (!disabled) {
      setIsOpen(!isOpen);
    }
  };

  const selectVendor = (vendor: Vendor) => {
    const isSelected = selectedVendors.some(v => v.id === vendor.id);
    let updatedVendors: Vendor[];

    if (isSelected) {
      updatedVendors = selectedVendors.filter(v => v.id !== vendor.id);
    } else {
      updatedVendors = [...selectedVendors, vendor];
    }

    onSelect(updatedVendors.map(v => v.id));
    setIsOpen(false);
  };

  return (
    <div className="w-full relative">
      <Button
        variant="outline"
        className="w-full justify-between"
        onClick={toggleOpen}
        disabled={disabled}
      >
        {buttonText}
        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
      </Button>

      {isOpen && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white border rounded-md shadow-md">
          <div className="p-2">
            <input
              className="w-full p-2 border rounded-md mb-2"
              placeholder="Buscar proveedor..."
            />

            <div className="max-h-64 overflow-y-auto">
              {vendors.length === 0 ? (
                <div className="py-6 text-center text-sm">
                  No hay proveedores disponibles
                </div>
              ) : (
                vendors.map(vendor => (
                  <div
                    key={vendor.id}
                    className="flex items-center p-2 hover:bg-gray-100 cursor-pointer rounded-md"
                    onClick={() => selectVendor(vendor)}
                  >
                    <div className={cn(
                      "mr-2 h-4 w-4",
                      selectedVendors.some(v => v.id === vendor.id)
                        ? "text-blue-500"
                        : "opacity-0"
                    )}>
                      ✓
                    </div>
                    {vendor.name}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function VendorSelector({
  selectedVendorIds = [], // Garantizar que nunca sea undefined
  onSelect,
  disabled = false,
  adminMode = false
}: VendorSelectorProps) {
  // Usar useRef para prevenir el bucle infinito
  const prevSelectedIdsRef = useRef<string[]>([]);
  const abortControllerRef = useRef<AbortController | null>(null);
  const initialFetchDoneRef = useRef(false);

  const [open, setOpen] = useState(false);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedVendors, setSelectedVendors] = useState<Vendor[]>([]);
  const [loadingTimeout, setLoadingTimeout] = useState<boolean>(false);
  const [maxTimeReached, setMaxTimeReached] = useState<boolean>(false);
  const [noProvidersAssigned, setNoProvidersAssigned] = useState<boolean>(false);
  const [commandRenderError, setCommandRenderError] = useState<boolean>(false);

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

  // Función separada para listar todos los vendors disponibles
  const fetchAvailableVendors = async () => {
    try {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      abortControllerRef.current = new AbortController();

      console.log("[VendorSelector] Obteniendo lista de vendors disponibles");

      const vendorsEndpoint = adminMode ? '/api/admin/vendors' : '/api/evaluations/vendors';
      const vendorsResponse = await fetch(vendorsEndpoint, {
        signal: abortControllerRef.current?.signal,
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });

      // Si la petición fue abortada, no hacemos nada
      if (abortControllerRef.current?.signal.aborted) {
        return null;
      }

      if (!vendorsResponse.ok) {
        if (vendorsResponse.status === 403) {
          throw new Error("No tienes permisos para ver la lista de proveedores");
        } else {
          throw new Error(`Error cargando proveedores: ${vendorsResponse.statusText}`);
        }
      }

      const responseData = await vendorsResponse.json();
      return Array.isArray(responseData?.data) ? responseData.data : [];

    } catch (error: any) {
      // Manejar el caso de que la petición se haya abortada
      if (error.name === 'AbortError') {
        console.log('[VendorSelector] Fetch abortado');
        return null;
      }

      throw error;
    }
  };

  // Effect para cargar la lista de vendors disponibles al inicio
  useEffect(() => {
    if (initialFetchDoneRef.current) return;

    const loadVendors = async () => {
      try {
        setLoading(true);
        setError(null);

        const allVendors = await fetchAvailableVendors();

        if (allVendors === null) return; // La petición fue abortada

        console.log(`[VendorSelector] Vendors disponibles: ${allVendors?.length || 0}`);

        if (!Array.isArray(allVendors) || allVendors.length === 0) {
          setVendors([]);
          setError("No hay proveedores disponibles en el sistema.");
        } else {
          // Filtrar y formatear vendors válidos
          const vendorsList = allVendors.filter((vendor: any) =>
            vendor &&
            typeof vendor === 'object' &&
            typeof vendor.id === 'string' && vendor.id.trim() !== '' &&
            typeof vendor.name === 'string'
          );

          setVendors(vendorsList || []);
        }

        initialFetchDoneRef.current = true;
      } catch (error: any) {
        console.error("[VendorSelector] Error cargando lista de vendors:", error);
        setError(error.message || "Error al cargar los proveedores.");
        setVendors([]);
      } finally {
        setLoading(false);
      }
    };

    loadVendors();

    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [adminMode]);

  // Effect para manejar los vendors seleccionados
  useEffect(() => {
    // Validar que selectedVendorIds sea un array
    if (!Array.isArray(selectedVendorIds)) {
      console.warn("[VendorSelector] selectedVendorIds no es un array:", selectedVendorIds);
      return;
    }

    // Añadir un timeout para mostrar un mensaje si la carga tarda demasiado
    const loadingTimeoutId = setTimeout(() => {
      setLoadingTimeout(true);
    }, 5000); // 5 segundos

    // Limitar el tiempo máximo de carga a 15 segundos
    const maxTimeTimeout = setTimeout(() => {
      setMaxTimeReached(true);
      setLoading(false);
      setError("La carga ha excedido el tiempo máximo. Por favor, intenta de nuevo más tarde.");
    }, 15000); // 15 segundos máximo

    // Garantizar que selectedVendorIds siempre sea un array de strings válidos
    const validSelectedIds = selectedVendorIds.filter(id =>
      id !== undefined && id !== null && typeof id === 'string' && id.trim() !== ''
    );

    // Solo ejecutar si los IDs realmente han cambiado
    if (!haveIdsChanged(prevSelectedIdsRef.current, validSelectedIds)) {
      clearTimeout(loadingTimeoutId);
      clearTimeout(maxTimeTimeout);
      return () => {
        clearTimeout(loadingTimeoutId);
        clearTimeout(maxTimeTimeout);
      };
    }

    // Actualizar la referencia con los nuevos IDs válidos
    prevSelectedIdsRef.current = [...validSelectedIds];

    const updateSelectedVendors = async () => {
      try {
        setError(null);

        // Solo procesamos la selección si ya tenemos la lista de vendors cargada
        if (!Array.isArray(vendors) || vendors.length === 0) {
          if (!initialFetchDoneRef.current) {
            const allVendors = await fetchAvailableVendors();

            if (allVendors === null) return; // La petición fue abortada

            if (!Array.isArray(allVendors) || allVendors.length === 0) {
              setVendors([]);
              setNoProvidersAssigned(true);
              return;
            }

            // Filtrar y formatear vendors válidos
            const vendorsList = allVendors.filter((vendor: any) =>
              vendor &&
              typeof vendor === 'object' &&
              typeof vendor.id === 'string' && vendor.id.trim() !== '' &&
              typeof vendor.name === 'string'
            );

            const safeVendorsList = Array.isArray(vendorsList) ? vendorsList : [];
            setVendors(safeVendorsList);

            // Ahora procesamos la selección con la lista de vendors disponibles
            processSelectedVendors(safeVendorsList, validSelectedIds);
          }
        } else {
          // Ya tenemos la lista de vendors, solo procesamos la selección
          processSelectedVendors(vendors, validSelectedIds);
        }
      } catch (error: any) {
        console.error("[VendorSelector] Error actualizando vendors seleccionados:", error);
        // No modificamos el estado de vendors ni selectedVendors en caso de error
      } finally {
        setLoading(false);
        clearTimeout(loadingTimeoutId);
        clearTimeout(maxTimeTimeout);
      }
    };

    // Función para procesar los vendors seleccionados
    const processSelectedVendors = (vendorsList: Vendor[], validIds: string[]) => {
      if (!Array.isArray(vendorsList)) {
        console.warn("[VendorSelector] vendorsList no es un array:", vendorsList);
        return;
      }

      if (!Array.isArray(validIds)) {
        console.warn("[VendorSelector] validIds no es un array:", validIds);
        return;
      }

      // Si hay IDs seleccionados, mapearlos a objetos vendor
      const selectedVendorsData: Vendor[] = [];

      if (validIds.length > 0) {
        for (const id of validIds) {
          // Usar un bucle for normal para evitar problemas con find
          let foundVendor: Vendor | undefined = undefined;
          for (let i = 0; i < vendorsList.length; i++) {
            if (vendorsList[i] && vendorsList[i].id === id) {
              foundVendor = vendorsList[i];
              break;
            }
          }

          if (foundVendor) {
            selectedVendorsData.push(foundVendor);
          }
        }
      }

      // Actualizar estado
      setSelectedVendors(selectedVendorsData);
      setNoProvidersAssigned(selectedVendorsData.length === 0);
    };

    updateSelectedVendors();

    return () => {
      clearTimeout(loadingTimeoutId);
      clearTimeout(maxTimeTimeout);
    };
  }, [selectedVendorIds, vendors, adminMode]);

  const handleSelect = (vendor: Vendor) => {
    if (!vendor || typeof vendor.id !== 'string' || vendor.id.trim() === '') return;

    let updatedSelection: Vendor[] = [];

    // No usar some para evitar problemas
    let isSelected = false;
    if (Array.isArray(selectedVendors)) {
      for (let i = 0; i < selectedVendors.length; i++) {
        if (selectedVendors[i] && selectedVendors[i].id === vendor.id) {
          isSelected = true;
          break;
        }
      }
    }

    if (isSelected) {
      // No usar filter para evitar problemas
      if (Array.isArray(selectedVendors)) {
        updatedSelection = selectedVendors.filter(v => v && v.id !== vendor.id);
      }
    } else {
      updatedSelection = Array.isArray(selectedVendors) ?
        [...selectedVendors, vendor] :
        [vendor];
    }

    setSelectedVendors(updatedSelection);
    setNoProvidersAssigned(updatedSelection.length === 0);

    // Garantizar que solo se devuelven ids válidos y no vacíos
    const validIds: string[] = [];
    if (Array.isArray(updatedSelection)) {
      for (let i = 0; i < updatedSelection.length; i++) {
        const v = updatedSelection[i];
        if (v && typeof v.id === 'string' && v.id.trim() !== '') {
          validIds.push(v.id);
        }
      }
    }

    onSelect(validIds);
  };

  const removeVendor = (vendorId: string) => {
    if (!vendorId || typeof vendorId !== 'string' || vendorId.trim() === '') return;

    // No usar filter para evitar problemas
    const updatedSelection: Vendor[] = [];
    if (Array.isArray(selectedVendors)) {
      for (let i = 0; i < selectedVendors.length; i++) {
        if (selectedVendors[i] && selectedVendors[i].id !== vendorId) {
          updatedSelection.push(selectedVendors[i]);
        }
      }
    }

    setSelectedVendors(updatedSelection);
    setNoProvidersAssigned(updatedSelection.length === 0);

    // Garantizar que solo se devuelven ids válidos y no vacíos
    const validIds: string[] = [];
    if (Array.isArray(updatedSelection)) {
      for (let i = 0; i < updatedSelection.length; i++) {
        const v = updatedSelection[i];
        if (v && typeof v.id === 'string' && v.id.trim() !== '') {
          validIds.push(v.id);
        }
      }
    }

    onSelect(validIds);
  };

  // Método para recargar los proveedores manualmente
  const reloadVendors = async () => {
    try {
      setLoading(true);
      setError(null);
      setLoadingTimeout(false);
      setMaxTimeReached(false);
      setCommandRenderError(false);
      initialFetchDoneRef.current = false;
      prevSelectedIdsRef.current = []; // Forzar recarga

      const allVendors = await fetchAvailableVendors();

      if (allVendors === null) return; // La petición fue abortada

      if (!Array.isArray(allVendors) || allVendors.length === 0) {
        setVendors([]);
        setError("No hay proveedores disponibles en el sistema.");
      } else {
        // Filtrar y formatear vendors válidos
        const vendorsList = allVendors.filter((vendor: any) =>
          vendor &&
          typeof vendor === 'object' &&
          typeof vendor.id === 'string' && vendor.id.trim() !== '' &&
          typeof vendor.name === 'string'
        );

        setVendors(Array.isArray(vendorsList) ? vendorsList : []);
        initialFetchDoneRef.current = true;

        // Procesar vendedores seleccionados
        const validSelectedIds = Array.isArray(selectedVendorIds)
          ? selectedVendorIds.filter(id => id !== undefined && id !== null && typeof id === 'string' && id.trim() !== '')
          : [];

        // No usar map/find/filter para evitar problemas
        const selectedVendorsData: Vendor[] = [];
        for (let i = 0; i < validSelectedIds.length; i++) {
          const id = validSelectedIds[i];
          let foundVendor: Vendor | undefined = undefined;

          for (let j = 0; j < vendorsList.length; j++) {
            if (vendorsList[j] && vendorsList[j].id === id) {
              foundVendor = vendorsList[j];
              break;
            }
          }

          if (foundVendor) {
            selectedVendorsData.push(foundVendor);
          }
        }

        setSelectedVendors(selectedVendorsData);
        setNoProvidersAssigned(selectedVendorsData.length === 0);
      }
    } catch (error: any) {
      console.error("[VendorSelector] Error en reloadVendors:", error);
      setError(error.message || "Error al cargar los proveedores.");
      setVendors([]);
    } finally {
      setLoading(false);
    }
  };

  // Garantizar que vendors siempre sea un array válido para el renderizado
  const safeVendors = Array.isArray(vendors)
    ? vendors.filter(v => v && typeof v.id === 'string' && v.id.trim() !== '')
    : [];

  // Garantizar que selectedVendors siempre sea un array válido para el renderizado
  const safeSelectedVendors = Array.isArray(selectedVendors)
    ? selectedVendors.filter(v => v && typeof v.id === 'string' && v.id.trim() !== '')
    : [];

  // Determinar el texto del botón según el estado
  const buttonText = loading
    ? (loadingTimeout
      ? "La carga está tardando más de lo esperado..."
      : "Cargando proveedores...")
    : error
      ? "Seleccionar proveedores"
      : noProvidersAssigned
        ? "Asignar proveedores"
        : safeVendors.length === 0
          ? "No hay proveedores disponibles"
          : "Seleccionar proveedores";

  // Para evitar problemas con cmdk, siempre creamos un array vacío para que nunca sea undefined
  const renderableVendors = safeVendors || [];
  const renderableSelectedVendors = safeSelectedVendors || [];

  // Renderizar los elementos del CommandItem de forma segura
  const renderCommandItems = () => {
    if (renderableVendors.length === 0) {
      return null;
    }

    return renderableVendors.map((vendor, index) => {
      if (!vendor || !vendor.id) return null;

      // Verificación segura para la propiedad "some" 
      let isSelected = false;
      for (let i = 0; i < renderableSelectedVendors.length; i++) {
        if (renderableSelectedVendors[i] && renderableSelectedVendors[i].id === vendor.id) {
          isSelected = true;
          break;
        }
      }

      return (
        <CommandItem
          key={vendor.id || index}
          value={vendor.id}
          onSelect={() => handleSelect(vendor)}
        >
          <Check
            className={cn(
              "mr-2 h-4 w-4",
              isSelected
                ? "opacity-100"
                : "opacity-0"
            )}
          />
          {vendor.name}
        </CommandItem>
      );
    });
  };

  // Componente alternativo para cuando no hay proveedores
  const EmptyVendorsState = () => (
    <div className="py-6 text-center text-sm">
      No hay proveedores disponibles
    </div>
  );

  const renderCommandComponent = () => {
    // Inicializamos con un item "vacío" para casos en que no hay proveedores,
    // esto asegura que cmdk siempre tenga la misma estructura
    const itemsToRender = renderableVendors.length === 0 ? (
      <CommandItem value="empty" disabled className="opacity-50 text-muted-foreground">
        No hay proveedores disponibles
      </CommandItem>
    ) : renderableVendors.map((vendor, index) => {
      if (!vendor || !vendor.id) return null;

      // Verificación para la selección sin usar .some()
      let isSelected = false;
      for (let i = 0; i < renderableSelectedVendors.length; i++) {
        if (renderableSelectedVendors[i] && renderableSelectedVendors[i].id === vendor.id) {
          isSelected = true;
          break;
        }
      }

      return (
        <CommandItem
          key={vendor.id || index}
          value={vendor.id}
          onSelect={() => handleSelect(vendor)}
        >
          <Check
            className={cn(
              "mr-2 h-4 w-4",
              isSelected
                ? "opacity-100"
                : "opacity-0"
            )}
          />
          {vendor.name}
        </CommandItem>
      );
    });

    // Siempre retornamos la misma estructura de componente
    return (
      <Command>
        <CommandInput placeholder="Buscar proveedor..." />
        <CommandGroup className="max-h-64 overflow-y-auto">
          {itemsToRender}
        </CommandGroup>
      </Command>
    );
  };

  // Si hay un error en el renderizado, mostrar un fallback
  if (commandRenderError) {
    return (
      <SimpleFallbackSelector
        buttonText={buttonText}
        vendors={renderableVendors}
        selectedVendors={renderableSelectedVendors}
        onSelect={onSelect}
        disabled={disabled}
      />
    );
  }

  return (
    <div className="space-y-2">
      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertCircle className="h-4 w-4" />
          <div className="ml-2 text-sm">{error}</div>
          <Button
            variant="outline"
            size="sm"
            className="ml-auto"
            onClick={reloadVendors}
          >
            Intentar de nuevo
          </Button>
        </Alert>
      )}

      {loadingTimeout && loading && (
        <Alert variant="default" className="mb-4">
          <AlertCircle className="h-4 w-4" />
          <div className="ml-2 text-sm">
            La carga de proveedores está tardando más de lo habitual.
            {!maxTimeReached && "Si persiste el problema, intenta recargar la página."}
          </div>
          {!maxTimeReached && (
            <Button
              variant="outline"
              size="sm"
              className="ml-auto"
              onClick={reloadVendors}
            >
              Reintentar
            </Button>
          )}
        </Alert>
      )}

      {!loading && !error && noProvidersAssigned && (
        <Alert variant="default" className="mb-4 border-blue-200 bg-blue-50">
          <PlusCircle className="h-4 w-4 text-blue-500" />
          <div className="ml-2 text-sm">
            No hay proveedores asignados a esta evaluación.
            Utilice el selector para asignar uno o más proveedores.
          </div>
        </Alert>
      )}

      <Popover
        open={open && !disabled}
        onOpenChange={(isOpen) => {
          // Prevenir actualización de estado si está deshabilitado
          if (!disabled) {
            setOpen(isOpen);
          }
        }}
      >
        <PopoverTrigger asChild>
          <Button
            variant={noProvidersAssigned ? "default" : "outline"}
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between"
            disabled={disabled || (loading && !loadingTimeout)}
            onClick={() => {
              try {
                if (error || (renderableVendors.length === 0 && !loading)) {
                  // Si hay error o no hay proveedores, intentar cargar de nuevo
                  reloadVendors();
                }
              } catch (err) {
                console.error("[VendorSelector] Error en onClick:", err);
                setCommandRenderError(true);
              }
            }}
          >
            {buttonText}
            {noProvidersAssigned ? (
              <PlusCircle className="ml-2 h-4 w-4 shrink-0 opacity-70" />
            ) : (
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            )}
          </Button>
        </PopoverTrigger>

        {/* La clave es mantener PopoverContent siempre igual independientemente 
          * de si está abierto o no, evitando montajes/desmontajes que pueden 
          * causar problemas con cmdk */}
        <PopoverContent className="w-full p-0">
          <ErrorBoundary
            fallback={
              <div className="p-4">
                <div className="py-6 text-center text-sm">
                  No hay proveedores disponibles
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-2 w-full"
                  onClick={() => {
                    setCommandRenderError(true);
                    setOpen(false);
                  }}
                >
                  Usar selector alternativo
                </Button>
              </div>
            }
          >
            {renderCommandComponent()}
          </ErrorBoundary>
        </PopoverContent>
      </Popover>

      {renderableSelectedVendors.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-2">
          {renderableSelectedVendors.map((vendor, index) => {
            if (!vendor || !vendor.id) return null;
            return (
              <Badge key={vendor.id || index} variant="secondary" className="flex items-center gap-1 py-1 px-3">
                {vendor.name}
                <button
                  type="button"
                  className="ml-1 rounded-full text-muted-foreground hover:text-foreground"
                  onClick={() => removeVendor(vendor.id)}
                  disabled={disabled}
                >
                  <X className="h-3 w-3" />
                  <span className="sr-only">Eliminar {vendor.name}</span>
                </button>
              </Badge>
            );
          })}
        </div>
      )}
    </div>
  );
} 