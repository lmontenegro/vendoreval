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
} from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { getEvaluations, type Evaluation } from "@/lib/services/evaluation-service";
import { addDays, format, isWithinInterval } from "date-fns";

export default function Evaluations() {
  const router = useRouter();
  const { toast } = useToast();
  const [evaluations, setEvaluations] = useState<Evaluation[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [complianceFilter, setComplianceFilter] = useState("all");
  const [dateRange, setDateRange] = useState({
    from: addDays(new Date(), -30),
    to: new Date(),
  });
  const [sortConfig, setSortConfig] = useState({
    key: "created_at",
    direction: "desc",
  });

  useEffect(() => {
    const fetchEvaluations = async () => {
      try {
        const { data, error } = await getEvaluations();
        if (error) throw error;
        if (data) setEvaluations(data);
      } catch (error) {
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
      case 'active':
        return 'En Progreso';
      case 'draft':
        return 'Borrador';
      default:
        return status;
    }
  };

  const getStatusClass = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-700';
      case 'active':
        return 'bg-blue-100 text-blue-700';
      case 'draft':
        return 'bg-yellow-100 text-yellow-700';
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

  const filteredAndSortedEvaluations = evaluations
    .filter(evaluation => {
      const matchesSearch = evaluation.title.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === "all" || evaluation.status === statusFilter;
      const matchesCompliance = complianceFilter === "all" ||
        (complianceFilter === "high" && (evaluation.score || 0) >= 90) ||
        (complianceFilter === "medium" && (evaluation.score || 0) >= 70 && (evaluation.score || 0) < 90) ||
        (complianceFilter === "low" && (evaluation.score || 0) < 70);
      const matchesDate = dateRange.from && dateRange.to
        ? isWithinInterval(new Date(evaluation.created_at), {
            start: dateRange.from,
            end: dateRange.to,
          })
        : true;

      return matchesSearch && matchesStatus && matchesCompliance && matchesDate;
    })
    .sort((a, b) => {
      const direction = sortConfig.direction === "asc" ? 1 : -1;
      switch (sortConfig.key) {
        case "score":
          return ((a.score || 0) - (b.score || 0)) * direction;
        case "created_at":
          return (new Date(a.created_at).getTime() - new Date(b.created_at).getTime()) * direction;
        case "title":
          return a.title.localeCompare(b.title) * direction;
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
          setDate={setDateRange}
        />

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger>
            <SelectValue placeholder="Filtrar por estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los estados</SelectItem>
            <SelectItem value="completed">Completadas</SelectItem>
            <SelectItem value="active">En Progreso</SelectItem>
            <SelectItem value="draft">Borradores</SelectItem>
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
            {filteredAndSortedEvaluations.map((evaluation) => (
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
                        {format(new Date(evaluation.start_date), 'dd/MM/yyyy')} - {format(new Date(evaluation.end_date), 'dd/MM/yyyy')}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {evaluation.categories.map((category, index) => (
                        <span
                          key={index}
                          className="px-2 py-1 text-xs bg-muted rounded-full"
                        >
                          {category.name}: {category.score !== null ? `${category.score}%` : 'N/A'}
                        </span>
                      ))}
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
                    {evaluation.score !== null && (
                      <span className="text-sm font-medium mt-1">
                        Cumplimiento: {evaluation.score}%
                      </span>
                    )}
                    <span className="text-xs text-muted-foreground mt-1">
                      Por: {evaluation.evaluator_name}
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
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}