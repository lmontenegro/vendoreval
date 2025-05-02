import { useEffect, useState, useRef, ReactNode } from "react";
import { Check, ChevronsUpDown, X, AlertCircle, PlusCircle, Search, Save } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
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
  lazyLoad?: boolean;
}

// Componente selector personalizado para reemplazar Command
function CustomSelector({
  vendors,
  selectedVendors,
  onSelectVendor,
  isOpen,
  setIsOpen,
  onApplyChanges
}: {
    vendors: Vendor[];
    selectedVendors: Vendor[];
    onSelectVendor: (vendor: Vendor) => void;
    isOpen: boolean;
    setIsOpen: (open: boolean) => void;
    onApplyChanges: () => void;
}) {
  const [searchTerm, setSearchTerm] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Enfocar input cuando se abre
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }

    // Cerrar al hacer clic fuera
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen, setIsOpen]);

  // Filtrar vendors basado en búsqueda
  const filteredVendors = vendors.filter(vendor =>
    vendor.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Verificar si un vendor está seleccionado
  const isSelected = (vendorId: string) => {
    return selectedVendors.some(v => v.id === vendorId);
  };

  if (!isOpen) return null;

  return (
    <div
      ref={containerRef}
      className="absolute z-50 w-full top-full left-0 mt-1 rounded-md border bg-white shadow-md"
    >
      <div className="flex items-center border-b p-2">
        <Search className="h-4 w-4 mr-2 opacity-50 flex-shrink-0" />
        <input
          ref={inputRef}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Buscar proveedor..."
          className="flex h-9 w-full rounded-md bg-transparent py-2 text-sm outline-none placeholder:text-muted-foreground"
        />
      </div>

      <div className="max-h-64 overflow-y-auto p-1">
        {filteredVendors.length === 0 && (
          <div className="py-6 text-center text-sm text-muted-foreground">
            {vendors.length === 0
              ? "No hay proveedores disponibles"
              : "No se encontraron proveedores"}
          </div>
        )}

        {filteredVendors.map(vendor => (
          <div
            key={vendor.id}
            onClick={() => onSelectVendor(vendor)}
            className={cn(
              "relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none",
              "hover:bg-accent hover:text-accent-foreground",
              "data-[selected=true]:bg-accent data-[selected=true]:text-accent-foreground"
            )}
            data-selected={isSelected(vendor.id)}
            role="option"
          >
            <Check
              className={cn(
                "mr-2 h-4 w-4",
                isSelected(vendor.id) ? "opacity-100" : "opacity-0"
              )}
            />
            {vendor.name}
          </div>
        ))}
      </div>

      <div className="p-2 border-t flex justify-end">
        <Button
          type="button"
          size="sm"
          onClick={() => {
            onApplyChanges();
            setIsOpen(false);
          }}
          className="gap-1"
        >
          <Save className="h-3 w-3" /> Aplicar
        </Button>
      </div>
    </div>
  );
}

export function VendorSelector({
  selectedVendorIds = [], // Garantizar que nunca sea undefined
  onSelect,
  disabled = false,
  adminMode = false,
  lazyLoad = false // Por defecto, cargar de forma normal (no lazy)
}: VendorSelectorProps) {
  // Prevenir actualizaciones reactivas usando refs
  const initialPropsProcessedRef = useRef<boolean>(false);
  const proccessingSelectRef = useRef<boolean>(false);
  const lastNotifiedIdsRef = useRef<string[]>([]);
  const abortControllerRef = useRef<AbortController | null>(null);
  const initialFetchDoneRef = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const [open, setOpen] = useState(false);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [localSelectedVendors, setLocalSelectedVendors] = useState<Vendor[]>([]);
  const [pendingSelectedVendors, setPendingSelectedVendors] = useState<Vendor[]>([]);
  const [loadingTimeout, setLoadingTimeout] = useState<boolean>(false);
  const [maxTimeReached, setMaxTimeReached] = useState<boolean>(false);
  const [noProvidersAssigned, setNoProvidersAssigned] = useState<boolean>(false);
  const [changesPending, setChangesPending] = useState<boolean>(false);

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
    if (initialFetchDoneRef.current || (lazyLoad && !open)) return;

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

    // Solo cargar al inicio, y solo una vez (o cuando se abra, si es lazy loading)
    loadVendors();

    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [open, lazyLoad, adminMode]);

  // Effect para procesar los vendors seleccionados SOLO UNA VEZ al inicio
  // Usamos useLayoutEffect para que se ejecute antes del renderizado
  useEffect(() => {
    if (proccessingSelectRef.current) {
      // No hacer nada si estamos en medio de una actualización generada por nosotros
      proccessingSelectRef.current = false;
      return;
    }

    // Si ya procesamos la selección inicial, no hacer nada
    if (initialPropsProcessedRef.current) {
      return;
    }

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

    // Guardar los IDs que recibimos en props para comparar después
    lastNotifiedIdsRef.current = [...validSelectedIds];

    const processSelectedVendors = async () => {
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

            // Mapear IDs a objetos vendor
            mapSelectedVendorsFromIds(safeVendorsList, validSelectedIds);
          }
        } else {
          // Ya tenemos la lista de vendors, mapeamos IDs a objetos
          mapSelectedVendorsFromIds(vendors, validSelectedIds);
        }
      } catch (error: any) {
        console.error("[VendorSelector] Error procesando vendors seleccionados:", error);
      } finally {
        setLoading(false);
        clearTimeout(loadingTimeoutId);
        clearTimeout(maxTimeTimeout);
        initialPropsProcessedRef.current = true;
      }
    };

    // Mapear IDs a objetos vendor
    const mapSelectedVendorsFromIds = (vendorsList: Vendor[], validIds: string[]) => {
      if (!Array.isArray(vendorsList) || !Array.isArray(validIds)) {
        return;
      }

      const selectedVendorsData: Vendor[] = [];

      if (validIds.length > 0) {
        for (const id of validIds) {
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

      // Actualizar estado local
      setLocalSelectedVendors(selectedVendorsData);
      setPendingSelectedVendors(selectedVendorsData);
      setNoProvidersAssigned(selectedVendorsData.length === 0);
    };

    processSelectedVendors();

    return () => {
      clearTimeout(loadingTimeoutId);
      clearTimeout(maxTimeTimeout);
    };
  }, [selectedVendorIds, vendors, adminMode]);

  // Cuando cambie vendors, actualizar los vendors seleccionados localmente sin notificar
  useEffect(() => {
    if (!initialPropsProcessedRef.current || !Array.isArray(vendors) || vendors.length === 0) {
      return;
    }

    // Extraer los IDs actuales
    const currentSelectedIds = localSelectedVendors.map(v => v.id);

    // Mapear IDs a los nuevos objetos vendor
    const selectedVendorsData: Vendor[] = [];

    for (const id of currentSelectedIds) {
      let foundVendor: Vendor | undefined = undefined;
      for (let i = 0; i < vendors.length; i++) {
        if (vendors[i] && vendors[i].id === id) {
          foundVendor = vendors[i];
          break;
        }
      }

      if (foundVendor) {
        selectedVendorsData.push(foundVendor);
      }
    }

    // Actualizar estado local sin triggear onSelect
    setLocalSelectedVendors(selectedVendorsData);
    setPendingSelectedVendors(selectedVendorsData);
    setNoProvidersAssigned(selectedVendorsData.length === 0);
  }, [vendors]);

  // Función que se llama cuando cambiamos la selección en el dropdown
  const handlePendingSelect = (vendor: Vendor) => {
    if (!vendor || typeof vendor.id !== 'string' || vendor.id.trim() === '') return;

    // No usar some para evitar problemas
    let isSelected = false;
    if (Array.isArray(pendingSelectedVendors)) {
      for (let i = 0; i < pendingSelectedVendors.length; i++) {
        if (pendingSelectedVendors[i] && pendingSelectedVendors[i].id === vendor.id) {
          isSelected = true;
          break;
        }
      }
    }

    let updatedSelection: Vendor[] = [];
    if (isSelected) {
      // Filtrar el vendor seleccionado
      updatedSelection = Array.isArray(pendingSelectedVendors)
        ? pendingSelectedVendors.filter(v => v && v.id !== vendor.id)
        : [];
    } else {
      // Añadir el vendor seleccionado
      updatedSelection = Array.isArray(pendingSelectedVendors)
        ? [...pendingSelectedVendors, vendor]
        : [vendor];
    }

    // Solo actualizar el estado pendiente
    setPendingSelectedVendors(updatedSelection);
    setChangesPending(true);
  };

  // Función para aplicar los cambios pendientes
  const applyPendingChanges = () => {
    // Solo notificar si realmente hay cambios
    const pendingIds = pendingSelectedVendors
      .filter(v => v && typeof v.id === 'string' && v.id.trim() !== '')
      .map(v => v.id);

    // Verificar si los IDs son diferentes de lo que ya notificamos
    const haveIdsChanged = () => {
      if (lastNotifiedIdsRef.current.length !== pendingIds.length) return true;

      // Verificar elemento por elemento
      for (const id of pendingIds) {
        if (!lastNotifiedIdsRef.current.includes(id)) return true;
      }

      // También verificar al revés
      for (const id of lastNotifiedIdsRef.current) {
        if (!pendingIds.includes(id)) return true;
      }

      return false;
    };

    // Solo notificar si realmente hay cambios
    if (haveIdsChanged()) {
      console.log('[VendorSelector] Notificando cambios en la selección:', pendingIds);

      // Actualizar la referencia
      lastNotifiedIdsRef.current = [...pendingIds];

      // Marcar que estamos procesando para ignorar el siguiente cambio en props
      proccessingSelectRef.current = true;

      // Notificar al componente padre
      onSelect(pendingIds);
    } else {
      console.log('[VendorSelector] No hay cambios que notificar');
    }

    // Actualizar el estado local con los cambios pendientes
    setLocalSelectedVendors(pendingSelectedVendors);
    setNoProvidersAssigned(pendingSelectedVendors.length === 0);
    setChangesPending(false);
  };

  const removeVendor = (vendorId: string) => {
    if (!vendorId || typeof vendorId !== 'string' || vendorId.trim() === '') return;

    // No usar filter para evitar problemas
    const updatedSelection: Vendor[] = [];
    if (Array.isArray(localSelectedVendors)) {
      for (let i = 0; i < localSelectedVendors.length; i++) {
        if (localSelectedVendors[i] && localSelectedVendors[i].id !== vendorId) {
          updatedSelection.push(localSelectedVendors[i]);
        }
      }
    }

    // Actualizar estado local y pendiente
    setLocalSelectedVendors(updatedSelection);
    setPendingSelectedVendors(updatedSelection);
    setNoProvidersAssigned(updatedSelection.length === 0);

    // Extraer IDs válidos
    const validIds = updatedSelection
      .filter(v => v && typeof v.id === 'string' && v.id.trim() !== '')
      .map(v => v.id);

    // Actualizar la referencia
    lastNotifiedIdsRef.current = [...validIds];

    // Marcar que estamos procesando para ignorar el siguiente cambio en props
    proccessingSelectRef.current = true;

    // Notificar cambio explícitamente
    onSelect(validIds);
  };

  // Método para recargar los proveedores manualmente
  const reloadVendors = async () => {
    try {
      setLoading(true);
      setError(null);
      setLoadingTimeout(false);
      setMaxTimeReached(false);
      initialFetchDoneRef.current = false;
      initialPropsProcessedRef.current = false;

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

        // Actualizar estados
        setLocalSelectedVendors(selectedVendorsData);
        setPendingSelectedVendors(selectedVendorsData);
        setNoProvidersAssigned(selectedVendorsData.length === 0);

        // Actualizar referencias para prevenir actualizaciones innecesarias
        lastNotifiedIdsRef.current = [...validSelectedIds];
        initialPropsProcessedRef.current = true;
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
  const safeSelectedVendors = Array.isArray(localSelectedVendors)
    ? localSelectedVendors.filter(v => v && typeof v.id === 'string' && v.id.trim() !== '')
    : [];

  // Estado pendiente para la interfaz del dropdown
  const safePendingSelectedVendors = Array.isArray(pendingSelectedVendors)
    ? pendingSelectedVendors.filter(v => v && typeof v.id === 'string' && v.id.trim() !== '')
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
          : changesPending
            ? "Aplicar cambios a selección"
            : "Seleccionar proveedores";

  // Función para alternar la apertura del dropdown sin enviar actualizaciones
  const toggleDropdown = () => {
    if (disabled) return;

    // Simplemente alternar el estado de apertura sin hacer peticiones
    if (changesPending && open) {
      // Revertir a la selección confirmada si hay cambios pendientes y estamos cerrando
      setPendingSelectedVendors(localSelectedVendors);
      setChangesPending(false);
    }
    setOpen(!open);
  };

  return (
    <div className="space-y-2">
      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertCircle className="h-4 w-4" />
          <div className="ml-2 text-sm">{error}</div>
          <Button
            type="button"
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
              type="button"
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

      {changesPending && (
        <Alert variant="default" className="mb-4 border-amber-200 bg-amber-50">
          <AlertCircle className="h-4 w-4 text-amber-500" />
          <div className="ml-2 text-sm">
            Hay cambios pendientes en la selección de proveedores.
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="ml-auto"
            onClick={applyPendingChanges}
          >
            Aplicar cambios
          </Button>
        </Alert>
      )}

      <div ref={containerRef} className="relative">
        <Button
          type="button"
          variant={noProvidersAssigned ? "default" : "outline"}
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
          disabled={disabled || (loading && !loadingTimeout)}
          onClick={toggleDropdown}
        >
          {buttonText}
          {noProvidersAssigned ? (
            <PlusCircle className="ml-2 h-4 w-4 shrink-0 opacity-70" />
          ) : (
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          )}
        </Button>

        {(error || (safeVendors.length === 0 && !loading && !noProvidersAssigned)) && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="mt-2 w-full text-xs"
            onClick={reloadVendors}
          >
            Recargar lista de proveedores
          </Button>
        )}

        <CustomSelector
          vendors={safeVendors}
          selectedVendors={safePendingSelectedVendors}
          onSelectVendor={handlePendingSelect}
          isOpen={open && !disabled}
          setIsOpen={setOpen}
          onApplyChanges={applyPendingChanges}
        />
      </div>

      {safeSelectedVendors.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-2">
          {safeSelectedVendors.map((vendor, index) => {
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