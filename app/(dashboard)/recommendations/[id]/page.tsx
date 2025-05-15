"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
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
  ArrowLeft,
  Search,
  CheckCircle2,
  Clock,
  AlertTriangle,
  XCircle,
  Calendar,
  BarChart2,
  Building,
  ListChecks,
} from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { RecommendationCard, Recommendation } from "@/components/ui/recommendation-card";

interface RecommendationGroup {
  evaluation_id: string;
  evaluation_title: string;
  recommendations: Recommendation[];
}

export default function RecommendationDetails() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [evaluationTitle, setEvaluationTitle] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [error, setError] = useState<string | null>(null);
  const [selectedRecommendation, setSelectedRecommendation] = useState<Recommendation | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // Obtener el userRole del HTML (inyectado por el layout)
  const [userRole, setUserRole] = useState<string | null>(null);

  useEffect(() => {
    // Obtener el rol de usuario del dataset del elemento HTML
    const dashboardElement = document.getElementById('dashboard-client-layout');
    const role = dashboardElement?.dataset.userRole || null;
    setUserRole(role);

    console.log("Role obtenido del layout:", role);
  }, []);

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
          setRecommendations([]);
          setLoading(false);
          return;
        }

        const evaluationId = params.id as string;
        console.log('ID de evaluación:', evaluationId);

        // Buscar el grupo de recomendaciones para esta evaluación específica
        const recommendationGroup = data.data.find(
          (group: RecommendationGroup) => group.evaluation_id === evaluationId
        );

        if (!recommendationGroup) {
          console.log('No se encontró el grupo de recomendaciones para esta evaluación');
          setRecommendations([]);
          setLoading(false);
          return;
        }

        console.log('Grupo de recomendaciones encontrado:', recommendationGroup);
        setEvaluationTitle(recommendationGroup.evaluation_title);
        setRecommendations(recommendationGroup.recommendations);

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

    if (params.id) {
      fetchRecommendations();
    }
  }, [params.id, toast]);

  const getStatusIcon = (status: string | null) => {
    switch (status) {
      case 'implemented':
        return <CheckCircle2 className="w-4 h-4 text-green-600" />;
      case 'in_progress':
        return <Clock className="w-4 h-4 text-blue-600" />;
      case 'pending':
        return <AlertTriangle className="w-4 h-4 text-yellow-600" />;
      case 'rejected':
        return <XCircle className="w-4 h-4 text-red-600" />;
      default:
        return <AlertTriangle className="w-4 h-4 text-yellow-600" />;
    }
  };

  const getStatusLabel = (status: string | null) => {
    switch (status) {
      case 'implemented':
        return 'Implementada';
      case 'in_progress':
        return 'En Progreso';
      case 'pending':
        return 'Pendiente';
      case 'rejected':
        return 'Rechazada';
      default:
        return 'Pendiente';
    }
  };

  const getStatusClass = (status: string | null) => {
    switch (status) {
      case 'implemented':
        return 'bg-green-100 text-green-700';
      case 'in_progress':
        return 'bg-blue-100 text-blue-700';
      case 'pending':
        return 'bg-yellow-100 text-yellow-700';
      case 'rejected':
        return 'bg-red-100 text-red-700';
      default:
        return 'bg-yellow-100 text-yellow-700';
    }
  };

  const getPriorityLabel = (priority: number | null) => {
    switch (priority) {
      case 1:
        return 'Alta';
      case 2:
        return 'Media';
      default:
        return 'No definida';
    }
  };

  const getPriorityClass = (priority: number | null) => {
    switch (priority) {
      case 1:
        return 'bg-red-100 text-red-700';
      case 2:
        return 'bg-blue-100 text-blue-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const getAnswerLabel = (answer: string | null) => {
    if (!answer) return 'Sin respuesta';

    switch (answer.toLowerCase()) {
      case 'yes':
        return 'Sí';
      case 'no':
        return 'No';
      case 'n/a':
        return 'No Aplica';
      default:
        return answer;
    }
  };

  const getAnswerClass = (answer: string | null) => {
    if (!answer) return 'bg-gray-100 text-gray-700';

    switch (answer.toLowerCase()) {
      case 'yes':
        return 'bg-green-100 text-green-700';
      case 'no':
        return 'bg-red-100 text-red-700';
      case 'n/a':
        return 'bg-gray-100 text-gray-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const filteredRecommendations = recommendations
    .filter(recommendation => {
      const matchesSearch = recommendation.recommendation_text?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        recommendation.question_text?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === "all" || recommendation.status === statusFilter;

      return matchesSearch && matchesStatus;
    });

  const handleStatusChange = async (recommendationId: string, newStatus: Recommendation["status"]) => {
    try {
      console.log(`Actualizando estado de recomendación ${recommendationId} a ${newStatus}`);

      const response = await fetch('/api/recommendations/update-status', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          recommendation_id: recommendationId,
          status: newStatus,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Error en la respuesta:', errorData);
        throw new Error(errorData.error || 'Error al actualizar el estado');
      }

      const result = await response.json();
      console.log('Respuesta del servidor:', result);

      // Actualizar el estado localmente
      setRecommendations((prevRecommendations) =>
        prevRecommendations.map((rec) =>
          rec.id === recommendationId ? { ...rec, status: newStatus } : rec
        )
      );

      toast({
        title: "Estado actualizado",
        description: "El estado de la recomendación ha sido actualizado correctamente.",
      });
    } catch (error: any) {
      console.error('Error al actualizar estado:', error);
      toast({
        title: "Error",
        description: error.message || "No se pudo actualizar el estado",
        variant: "destructive",
      });
    }
  };

  const handleViewDetails = (recommendation: Recommendation) => {
    setSelectedRecommendation(recommendation);
    setIsDialogOpen(true);
  };

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-800 mx-auto"></div>
        <p className="mt-2">Cargando recomendaciones...</p>
      </div>
    </div>;
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center gap-2 mb-6">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.push('/recommendations')}
          aria-label="Volver a recomendaciones"
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold">{evaluationTitle}</h1>
          <p className="text-muted-foreground">
            Recomendaciones de mejora para implementar
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="flex items-center space-x-2">
          <Search className="w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar recomendación..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1"
          />
        </div>

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger>
            <SelectValue placeholder="Filtrar por estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los estados</SelectItem>
            <SelectItem value="pending">Pendientes</SelectItem>
            <SelectItem value="in_progress">En Progreso</SelectItem>
            <SelectItem value="implemented">Implementadas</SelectItem>
            <SelectItem value="rejected">Rechazadas</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {error ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-red-300 p-8 text-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-red-50">
            <AlertTriangle className="h-10 w-10 text-red-500" />
          </div>
          <h3 className="mt-4 text-lg font-semibold">Error</h3>
          <p className="mb-4 mt-2 text-sm text-muted-foreground">
            {error}
          </p>
        </div>
      ) : recommendations.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-8 text-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-muted">
            <ListChecks className="h-10 w-10 text-muted-foreground" />
          </div>
          <h3 className="mt-4 text-lg font-semibold">No hay recomendaciones</h3>
          <p className="mb-4 mt-2 text-sm text-muted-foreground">
            No se encontraron recomendaciones para esta evaluación.
          </p>
        </div>
      ) : (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Recomendaciones</CardTitle>
              <p className="text-sm text-muted-foreground">
                {filteredRecommendations.length} recomendaciones encontradas
              </p>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {filteredRecommendations.map((recommendation) => (
                <RecommendationCard
                  key={recommendation.id}
                  recommendation={recommendation}
                  onStatusChange={handleStatusChange}
                  isSupplier={userRole === 'supplier'}
                />
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Modal de detalle de recomendación */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Detalle de la recomendación</DialogTitle>
            <DialogDescription>
              Información completa sobre la recomendación
            </DialogDescription>
          </DialogHeader>

          {selectedRecommendation && (
            <div className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Estado</h3>
                  <Badge className={`mt-1 ${getStatusClass(selectedRecommendation.status)}`}>
                    <span className="flex items-center gap-1">
                      {getStatusIcon(selectedRecommendation.status)}
                      {getStatusLabel(selectedRecommendation.status)}
                    </span>
                  </Badge>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Prioridad</h3>
                  <Badge className={`mt-1 ${getPriorityClass(selectedRecommendation.priority)}`}>
                    {getPriorityLabel(selectedRecommendation.priority)}
                  </Badge>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-medium text-gray-500">Pregunta</h3>
                <p className="mt-1 text-sm">{selectedRecommendation.question_text}</p>
              </div>

              <div>
                <h3 className="text-sm font-medium text-gray-500">Respuesta</h3>
                <Badge className={`mt-1 ${getAnswerClass(selectedRecommendation.answer)}`}>
                  {getAnswerLabel(selectedRecommendation.answer)}
                </Badge>
              </div>

              <div>
                <h3 className="text-sm font-medium text-gray-500">Recomendación</h3>
                <div className="mt-1 p-3 bg-gray-50 rounded-md">
                  <p className="text-sm">{selectedRecommendation.recommendation_text}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Fecha de creación</h3>
                  <p className="mt-1 text-sm">
                    {format(new Date(selectedRecommendation.created_at), 'dd/MM/yyyy')}
                  </p>
                </div>
                {selectedRecommendation.due_date && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">Fecha límite</h3>
                    <p className="mt-1 text-sm">
                      {format(new Date(selectedRecommendation.due_date), 'dd/MM/yyyy')}
                    </p>
                  </div>
                )}
              </div>

              {userRole === 'supplier' && (
                <div className="pt-4 border-t border-gray-200">
                  <h3 className="text-sm font-medium text-gray-500 mb-2">Actualizar estado</h3>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      variant={selectedRecommendation.status === 'pending' ? 'default' : 'outline'}
                      onClick={() => {
                        handleStatusChange(selectedRecommendation.id, 'pending');
                        setIsDialogOpen(false);
                      }}
                    >
                      <AlertTriangle className="w-4 h-4 mr-2" />
                      Pendiente
                    </Button>
                    <Button
                      size="sm"
                      variant={selectedRecommendation.status === 'in_progress' ? 'default' : 'outline'}
                      onClick={() => {
                        handleStatusChange(selectedRecommendation.id, 'in_progress');
                        setIsDialogOpen(false);
                      }}
                    >
                      <Clock className="w-4 h-4 mr-2" />
                      En Progreso
                    </Button>
                    <Button
                      size="sm"
                      variant={selectedRecommendation.status === 'implemented' ? 'default' : 'outline'}
                      onClick={() => {
                        handleStatusChange(selectedRecommendation.id, 'implemented');
                        setIsDialogOpen(false);
                      }}
                    >
                      <CheckCircle2 className="w-4 h-4 mr-2" />
                      Implementada
                    </Button>
                    <Button
                      size="sm"
                      variant={selectedRecommendation.status === 'rejected' ? 'default' : 'outline'}
                      onClick={() => {
                        handleStatusChange(selectedRecommendation.id, 'rejected');
                        setIsDialogOpen(false);
                      }}
                    >
                      <XCircle className="w-4 h-4 mr-2" />
                      Rechazada
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
} 