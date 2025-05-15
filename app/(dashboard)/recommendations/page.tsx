"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowUpRight,
  Search,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Calendar,
  BarChart2,
  Building,
  ListChecks,
} from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { format } from "date-fns";

// Definir interfaces para los tipos de datos
interface Recommendation {
  id: string;
  recommendation_text: string;
  question_text: string;
  evaluation_id: string;
  evaluation_title: string;
  answer: string;
  response_value: string;
  priority: number;
  status: string;
  due_date: string | null;
  created_at: string;
  evaluation_question_id: string;
  evaluation_vendor_id: string;
}

interface RecommendationGroup {
  evaluation_id: string;
  evaluation_title: string;
  recommendations: Recommendation[];
}

interface EvaluationWithRecommendations {
  id: string;
  title: string;
  vendor_name: string | null;
  created_at: string | null;
  recommendations_count: number;
  status: string;
}

export default function RecommendationsPage() {
  const [evaluations, setEvaluations] = useState<EvaluationWithRecommendations[]>([]);
  const [filteredEvaluations, setFilteredEvaluations] = useState<EvaluationWithRecommendations[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const { toast } = useToast();
  const router = useRouter();

  useEffect(() => {
    const fetchRecommendations = async () => {
      try {
        setLoading(true);
        console.log('Iniciando solicitud a /api/recommendations');
        const response = await fetch('/api/recommendations');

        if (!response.ok) {
          const errorData = await response.json();
          console.error('Error en la respuesta:', errorData);
          throw new Error(errorData.error || 'Error al cargar recomendaciones');
        }

        const data = await response.json();
        console.log('Datos de recomendaciones recibidos:', data);

        if (!data.data || data.data.length === 0) {
          console.log('No se encontraron recomendaciones');
          setEvaluations([]);
          setFilteredEvaluations([]);
          setLoading(false);
          return;
        }

        // Procesar los grupos de recomendaciones directamente
        const evaluationsArray = data.data.map((group: RecommendationGroup) => {
          return {
            id: group.evaluation_id,
            title: group.evaluation_title,
            vendor_name: null, // Se podría añadir si está disponible en la API
            created_at: group.recommendations[0]?.created_at || null,
            recommendations_count: group.recommendations.length,
            status: 'active' // Estado por defecto
          };
        });

        console.log('Evaluaciones procesadas:', evaluationsArray);

        setEvaluations(evaluationsArray);
        setFilteredEvaluations(evaluationsArray);

      } catch (error: any) {
        console.error('Error al cargar recomendaciones:', error);
        setError(error.message || 'Error al cargar recomendaciones');
        toast({
          title: "Error",
          description: error.message || "No se pudieron cargar las recomendaciones",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchRecommendations();
  }, [toast]);

  // Filtrar evaluaciones cuando cambie el término de búsqueda o el filtro de estado
  useEffect(() => {
    let filtered = evaluations;

    // Filtrar por término de búsqueda
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter((evaluation) =>
        evaluation.title.toLowerCase().includes(term)
      );
    }

    // Filtrar por estado
    if (filterStatus !== "all") {
      filtered = filtered.filter((evaluation) => evaluation.status === filterStatus);
    }

    setFilteredEvaluations(filtered);
  }, [searchTerm, filterStatus, evaluations]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case "in_progress":
        return <Clock className="h-4 w-4 text-blue-500" />;
      default:
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
    }
  };

  const handleViewRecommendations = (evaluationId: string) => {
    router.push(`/recommendations/${evaluationId}`);
  };

  return (
    <div className="flex flex-col space-y-6 p-6">
      <div className="flex flex-col space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Recomendaciones</h1>
        <p className="text-muted-foreground">
          Gestiona las recomendaciones para mejorar el cumplimiento.
        </p>
      </div>

      <div className="flex flex-col space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Buscar evaluaciones..."
                className="w-[250px] pl-8"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Select
              value={filterStatus}
              onValueChange={setFilterStatus}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filtrar por estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los estados</SelectItem>
                <SelectItem value="active">Activas</SelectItem>
                <SelectItem value="completed">Completadas</SelectItem>
                <SelectItem value="in_progress">En progreso</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center p-8">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-800 mx-auto"></div>
              <p className="mt-2">Cargando recomendaciones...</p>
            </div>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-red-300 p-8 text-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-red-50">
              <AlertTriangle className="h-10 w-10 text-red-500" />
            </div>
              <h3 className="mt-4 text-lg font-semibold">Error</h3>
              <p className="mb-4 mt-2 text-sm text-muted-foreground">
                {error}
              </p>
            </div>
          ) : filteredEvaluations.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-8 text-center">
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-muted">
                <ListChecks className="h-10 w-10 text-muted-foreground" />
              </div>
              <h3 className="mt-4 text-lg font-semibold">No hay recomendaciones</h3>
              <p className="mb-4 mt-2 text-sm text-muted-foreground">
                No se encontraron recomendaciones para las evaluaciones completadas.
              </p>
            </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {filteredEvaluations.map((evaluation) => (
                  <Card key={evaluation.id} className="overflow-hidden">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg font-semibold truncate">
                          {evaluation.title}
                        </CardTitle>
                        {getStatusIcon(evaluation.status)}
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <span className="text-muted-foreground">
                            {evaluation.created_at
                              ? format(new Date(evaluation.created_at), "dd/MM/yyyy")
                              : "Fecha no disponible"}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <BarChart2 className="h-4 w-4 text-muted-foreground" />
                          <span className="text-muted-foreground">
                            {evaluation.recommendations_count} recomendaciones
                          </span>
                        </div>
                        {evaluation.vendor_name && (
                          <div className="flex items-center gap-2 col-span-2">
                            <Building className="h-4 w-4 text-muted-foreground" />
                            <span className="text-muted-foreground truncate">
                              {evaluation.vendor_name}
                            </span>
                          </div>
                        )}
                      </div>
                      <Button
                        variant="outline"
                        className="mt-4 w-full"
                        onClick={() => handleViewRecommendations(evaluation.id)}
                      >
                        Ver recomendaciones
                        <ArrowUpRight className="ml-2 h-4 w-4" />
                      </Button>
                    </CardContent>
                  </Card>
                ))}
          </div>
        )}
      </div>
    </div>
  );
}