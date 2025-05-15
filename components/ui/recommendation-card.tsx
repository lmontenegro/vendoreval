import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { format } from "date-fns";
import {
  CheckCircle2,
  Clock,
  AlertTriangle,
  XCircle,
  Calendar,
  ExternalLink,
} from "lucide-react";

type RecommendationStatus = "pending" | "in_progress" | "implemented" | "rejected" | null;

export interface Recommendation {
  id: string;
  recommendation_text: string;
  question_text: string;
  evaluation_id: string;
  evaluation_title: string;
  answer: string;
  response_value: string;
  priority: number;
  status: RecommendationStatus;
  due_date: string | null;
  created_at: string;
  evaluation_question_id: string;
  evaluation_vendor_id: string;
}

interface RecommendationCardProps {
  recommendation: Recommendation;
  onStatusChange?: (id: string, status: RecommendationStatus) => void;
  isSupplier?: boolean;
}

export function RecommendationCard({
  recommendation,
  onStatusChange,
  isSupplier = false,
}: RecommendationCardProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const handleStatusChange = (status: RecommendationStatus) => {
    if (onStatusChange) {
      onStatusChange(recommendation.id, status);
    }
  };

  const getPriorityLabel = (priority: number) => {
    switch (priority) {
      case 1:
        return "Alta";
      case 2:
        return "Media";
      default:
        return "No definida";
    }
  };

  const getPriorityClass = (priority: number) => {
    switch (priority) {
      case 1:
        return "bg-red-100 text-red-700";
      case 2:
        return "bg-blue-100 text-blue-700";
      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  const getStatusIcon = (status: RecommendationStatus) => {
    switch (status) {
      case "implemented":
        return <CheckCircle2 className="w-4 h-4 text-green-600" />;
      case "in_progress":
        return <Clock className="w-4 h-4 text-blue-600" />;
      case "pending":
        return <AlertTriangle className="w-4 h-4 text-yellow-600" />;
      case "rejected":
        return <XCircle className="w-4 h-4 text-red-600" />;
      default:
        return <AlertTriangle className="w-4 h-4 text-yellow-600" />;
    }
  };

  const getStatusLabel = (status: RecommendationStatus) => {
    switch (status) {
      case "implemented":
        return "Implementada";
      case "in_progress":
        return "En Progreso";
      case "pending":
        return "Pendiente";
      case "rejected":
        return "Rechazada";
      default:
        return "Pendiente";
    }
  };

  const getStatusClass = (status: RecommendationStatus) => {
    switch (status) {
      case "implemented":
        return "bg-green-100 text-green-700";
      case "in_progress":
        return "bg-blue-100 text-blue-700";
      case "pending":
        return "bg-yellow-100 text-yellow-700";
      case "rejected":
        return "bg-red-100 text-red-700";
      default:
        return "bg-yellow-100 text-yellow-700";
    }
  };

  const getAnswerLabel = (answer: string) => {
    if (!answer) return "Sin respuesta";

    switch (answer.toLowerCase()) {
      case "yes":
        return "Sí";
      case "no":
        return "No";
      case "n/a":
        return "No Aplica";
      default:
        return answer;
    }
  };

  const getAnswerClass = (answer: string) => {
    if (!answer) return "bg-gray-100 text-gray-700";

    switch (answer.toLowerCase()) {
      case "yes":
        return "bg-green-100 text-green-700";
      case "no":
        return "bg-red-100 text-red-700";
      case "n/a":
        return "bg-gray-100 text-gray-700";
      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  return (
    <>
      <Card className="overflow-hidden">
        <CardHeader className="bg-muted/30 p-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge className={getPriorityClass(recommendation.priority)}>
                Prioridad: {getPriorityLabel(recommendation.priority)}
              </Badge>
              <Badge className={getStatusClass(recommendation.status)}>
                <span className="flex items-center gap-1">
                  {getStatusIcon(recommendation.status)}
                  {getStatusLabel(recommendation.status)}
                </span>
              </Badge>
              <Badge className={getAnswerClass(recommendation.answer)}>
                Respuesta: {getAnswerLabel(recommendation.answer)}
              </Badge>
            </div>
            {recommendation.due_date && (
              <div className="flex items-center text-sm text-muted-foreground">
                <Calendar className="w-4 h-4 mr-1" />
                Fecha límite: {format(new Date(recommendation.due_date), "dd/MM/yyyy")}
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-4">
          <div className="mb-4">
            <h3 className="font-semibold mb-1">Pregunta:</h3>
            <p className="text-sm text-gray-700">{recommendation.question_text}</p>
          </div>
          <div className="mb-4">
            <h3 className="font-semibold mb-1">Recomendación:</h3>
            <p className="text-sm text-gray-700 line-clamp-3">{recommendation.recommendation_text}</p>
          </div>

          <div className="flex justify-between mt-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsDialogOpen(true)}
            >
              Ver detalles
              <ExternalLink className="ml-2 h-4 w-4" />
            </Button>

            {isSupplier && onStatusChange && (
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant={recommendation.status === "pending" ? "default" : "outline"}
                  onClick={() => handleStatusChange("pending")}
                >
                  <AlertTriangle className="w-4 h-4 mr-2" />
                  Pendiente
                </Button>
                <Button
                  size="sm"
                  variant={recommendation.status === "in_progress" ? "default" : "outline"}
                  onClick={() => handleStatusChange("in_progress")}
                >
                  <Clock className="w-4 h-4 mr-2" />
                  En Progreso
                </Button>
                <Button
                  size="sm"
                  variant={recommendation.status === "implemented" ? "default" : "outline"}
                  onClick={() => handleStatusChange("implemented")}
                >
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Implementada
                </Button>
                <Button
                  size="sm"
                  variant={recommendation.status === "rejected" ? "default" : "outline"}
                  onClick={() => handleStatusChange("rejected")}
                >
                  <XCircle className="w-4 h-4 mr-2" />
                  Rechazada
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Modal de detalle de recomendación */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Detalle de la recomendación</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <h3 className="text-sm font-medium text-gray-500">Estado</h3>
                <Badge className={`mt-1 ${getStatusClass(recommendation.status)}`}>
                  <span className="flex items-center gap-1">
                    {getStatusIcon(recommendation.status)}
                    {getStatusLabel(recommendation.status)}
                  </span>
                </Badge>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500">Prioridad</h3>
                <Badge className={`mt-1 ${getPriorityClass(recommendation.priority)}`}>
                  {getPriorityLabel(recommendation.priority)}
                </Badge>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-medium text-gray-500">Pregunta</h3>
              <p className="mt-1 text-sm">{recommendation.question_text}</p>
            </div>

            <div>
              <h3 className="text-sm font-medium text-gray-500">Respuesta</h3>
              <Badge className={`mt-1 ${getAnswerClass(recommendation.answer)}`}>
                {getAnswerLabel(recommendation.answer)}
              </Badge>
            </div>

            <div>
              <h3 className="text-sm font-medium text-gray-500">Recomendación</h3>
              <div className="mt-1 p-3 bg-gray-50 rounded-md">
                <p className="text-sm">{recommendation.recommendation_text}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <h3 className="text-sm font-medium text-gray-500">Fecha de creación</h3>
                <p className="mt-1 text-sm">
                  {format(new Date(recommendation.created_at), "dd/MM/yyyy")}
                </p>
              </div>
              {recommendation.due_date && (
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Fecha límite</h3>
                  <p className="mt-1 text-sm">
                    {format(new Date(recommendation.due_date), "dd/MM/yyyy")}
                  </p>
                </div>
              )}
            </div>

            {isSupplier && onStatusChange && (
              <div className="pt-4 border-t border-gray-200">
                <h3 className="text-sm font-medium text-gray-500 mb-2">Actualizar estado</h3>
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant={recommendation.status === "pending" ? "default" : "outline"}
                    onClick={() => {
                      handleStatusChange("pending");
                      setIsDialogOpen(false);
                    }}
                  >
                    <AlertTriangle className="w-4 h-4 mr-2" />
                    Pendiente
                  </Button>
                  <Button
                    size="sm"
                    variant={recommendation.status === "in_progress" ? "default" : "outline"}
                    onClick={() => {
                      handleStatusChange("in_progress");
                      setIsDialogOpen(false);
                    }}
                  >
                    <Clock className="w-4 h-4 mr-2" />
                    En Progreso
                  </Button>
                  <Button
                    size="sm"
                    variant={recommendation.status === "implemented" ? "default" : "outline"}
                    onClick={() => {
                      handleStatusChange("implemented");
                      setIsDialogOpen(false);
                    }}
                  >
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                    Implementada
                  </Button>
                  <Button
                    size="sm"
                    variant={recommendation.status === "rejected" ? "default" : "outline"}
                    onClick={() => {
                      handleStatusChange("rejected");
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
        </DialogContent>
      </Dialog>
    </>
  );
} 