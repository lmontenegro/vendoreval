"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { DatePickerWithRange } from "@/components/ui/date-range-picker";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Plus,
  Search,
  ArrowUpRight,
  CheckCircle2,
  Clock,
  AlertTriangle,
  ArrowUpDown,
  Calendar,
  BarChart2,
  Building,
} from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { getEvaluations, type Evaluation } from "@/lib/services/evaluation-service";
import { addDays, format, isWithinInterval } from "date-fns";
import type { DateRange } from "react-day-picker";

export default function Evaluations() {
  const router = useRouter();
  const { toast } = useToast();
  const [evaluations, setEvaluations] = useState<Evaluation[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [complianceFilter, setComplianceFilter] = useState("all");
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: undefined,
    to: undefined,
  });
  const [sortConfig, setSortConfig] = useState({
    key: "created_at",
    direction: "desc",
  });

  useEffect(() => {
    setDateRange({
      from: addDays(new Date(), -30),
      to: new Date(),
    });
  }, []);

  useEffect(() => {
    const fetchEvaluations = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/evaluations');
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Error al obtener evaluaciones');
        }
        const { data } = await response.json();
        console.log("Datos recibidos de la API:", data);
        if (data) setEvaluations(data);
      } catch (error) {
        console.error("Error al obtener evaluaciones:", error);
        toast({
          title: "Error",
          description: "No se pudieron cargar las evaluaciones.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchEvaluations();
  }, [toast]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="w-4 h-4 text-green-600" />;
      case 'in_progress':
      case 'active':
        return <Clock className="w-4 h-4 text-blue-600" />;
      case 'draft':
        return <AlertTriangle className="w-4 h-4 text-yellow-600" />;
      default:
        return null;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'completed':
        return 'Completada';
      case 'in_progress':
      case 'active':
        return 'En Progreso';
      case 'draft':
        return 'Borrador';
      case 'pending_review':
        return 'Pendiente revisión';
      case 'archived':
        return 'Archivada';
      default:
        return status;
    }
  };

  const getStatusClass = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-700';
      case 'in_progress':
      case 'active':
        return 'bg-blue-100 text-blue-700';
      case 'draft':
        return 'bg-yellow-100 text-yellow-700';
      case 'pending_review':
        return 'bg-orange-100 text-orange-700';
      case 'archived':
        return 'bg-gray-100 text-gray-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const handleSort = (key: string) => {
    setSortConfig({
      key,
      direction:
        sortConfig.key === key && sortConfig.direction === "asc"
          ? "desc"
          : "asc",
    });
  };

  const handleDateRangeChange = (date: DateRange | undefined) => {
    if (date?.from && date?.to) {
      setDateRange({ from: date.from, to: date.to });
    }
  };

  // Añadir un log para ver qué contiene evaluations antes del filtrado
  console.log("Estado actual de evaluations:", evaluations);
  
  const filteredAndSortedEvaluations = evaluations
    .filter(evaluation => {
      const matchesSearch = evaluation.title?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false;
      const matchesStatus = statusFilter === "all" || evaluation.status === statusFilter;
      const matchesCompliance = complianceFilter === "all" ||
        (complianceFilter === "high" && (evaluation.total_score || 0) >= 90) ||
        (complianceFilter === "medium" && (evaluation.total_score || 0) >= 70 && (evaluation.total_score || 0) < 90) ||
        (complianceFilter === "low" && (evaluation.total_score || 0) < 70);
      
      let matchesDate = true;
      if (dateRange?.from && dateRange?.to && evaluation.created_at) {
        try {
          const startDate = new Date(dateRange.from);
          const endDate = new Date(dateRange.to);
          endDate.setHours(23, 59, 59, 999);
          const createdDate = new Date(evaluation.created_at);
          
          matchesDate = isWithinInterval(createdDate, {
            start: startDate,
            end: endDate
          });
        } catch (error) {
          console.error("Error al filtrar por fecha:", error);
          matchesDate = true;
        }
      }

      return matchesSearch && matchesStatus && matchesCompliance && matchesDate;
    })
    .sort((a, b) => {
      const direction = sortConfig.direction === "asc" ? 1 : -1;
      switch (sortConfig.key) {
        case "score":
          return ((a.total_score || 0) - (b.total_score || 0)) * direction;
        case "created_at":
          return ((new Date(a.created_at || 0)).getTime() - (new Date(b.created_at || 0)).getTime()) * direction;
        case "title":
          return (a.title || "").localeCompare(b.title || "") * direction;
        default:
          return 0;
      }
    });

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">
      <p className="text-muted-foreground">Cargando evaluaciones...</p>
    </div>;
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Evaluaciones</h1>
          <p className="text-muted-foreground">
            Gestiona y monitorea las evaluaciones de proveedores
          </p>
        </div>
        <Button 
          className="gap-2"
          onClick={() => router.push('/evaluations/new')}
        >
          <Plus className="w-4 h-4" /> Nueva Evaluación
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="flex items-center space-x-2">
          <Search className="w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar evaluación..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1"
          />
        </div>

        <DatePickerWithRange
          date={dateRange}
          setDate={handleDateRangeChange}
        />

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger>
            <SelectValue placeholder="Filtrar por estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los estados</SelectItem>
            <SelectItem value="completed">Completadas</SelectItem>
            <SelectItem value="in_progress">En Progreso</SelectItem>
            <SelectItem value="draft">Borradores</SelectItem>
            <SelectItem value="pending_review">Pendientes de revisión</SelectItem>
          </SelectContent>
        </Select>

        <Select value={complianceFilter} onValueChange={setComplianceFilter}>
          <SelectTrigger>
            <SelectValue placeholder="Filtrar por cumplimiento" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los niveles</SelectItem>
            <SelectItem value="high">Alto (≥90%)</SelectItem>
            <SelectItem value="medium">Medio (70-89%)</SelectItem>
            <SelectItem value="low">Bajo (&lt;70%)</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Lista de Evaluaciones</CardTitle>
            <p className="text-sm text-muted-foreground">
              {filteredAndSortedEvaluations.length} evaluaciones encontradas
            </p>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredAndSortedEvaluations.length > 0 ? (
              filteredAndSortedEvaluations.map((evaluation) => (
                <div
                  key={evaluation.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <BarChart2 className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">{evaluation.title}</p>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Calendar className="w-4 h-4" />
                        <span>
                          {evaluation.start_date ? format(new Date(evaluation.start_date), 'dd/MM/yyyy') : 'N/A'} - {evaluation.end_date ? format(new Date(evaluation.end_date), 'dd/MM/yyyy') : 'N/A'}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                        <Building className="w-4 h-4" />
                        <span>{evaluation.vendor_name || "Proveedor no asignado"}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex flex-col items-end">
                      <div className="flex items-center gap-2">
                        {getStatusIcon(evaluation.status)}
                        <span className={`px-2 py-1 rounded-full text-xs ${getStatusClass(evaluation.status)}`}>
                          {getStatusLabel(evaluation.status)}
                        </span>
                      </div>
                      {evaluation.total_score !== null && (
                        <span className="text-sm font-medium mt-1">
                          Cumplimiento: {evaluation.total_score}%
                        </span>
                      )}
                      <span className="text-xs text-muted-foreground mt-1">
                        Progreso: {evaluation.progress}%
                      </span>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="icon"
                      onClick={() => router.push(`/evaluations/${evaluation.id}/edit`)}
                    >
                      <ArrowUpRight className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))
            ) : (
              <div className="flex flex-col items-center justify-center p-8">
                <p className="text-muted-foreground mb-4">No se encontraron evaluaciones</p>
                <Button onClick={() => router.push('/evaluations/new')}>Crear una nueva evaluación</Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}