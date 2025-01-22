import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  BarChart2,
  Calendar,
  CheckCircle2,
  Clock,
  FileText,
  MessageSquare,
  Target,
  XCircle,
} from "lucide-react";
import { useState } from "react";

interface RecommendationDetailsProps {
  recommendation: {
    id: string;
    title: string;
    description: string;
    priority: string;
    status: string;
    timeline: string;
    metrics: {
      label: string;
      value: string;
      change: number;
    }[];
    steps: string[];
    benefits: string[];
    relatedRecommendations: {
      id: string;
      title: string;
      status: string;
    }[];
  };
  onStatusChange?: (id: string, status: string) => void;
  onCommentAdd?: (id: string, comment: string) => void;
}

export function RecommendationDetails({
  recommendation,
  onStatusChange,
  onCommentAdd,
}: RecommendationDetailsProps) {
  const [comment, setComment] = useState("");
  const [newStatus, setNewStatus] = useState(recommendation.status);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle2 className="w-4 h-4 text-green-600" />;
      case "in_progress":
        return <Clock className="w-4 h-4 text-blue-600" />;
      case "pending":
        return <Clock className="w-4 h-4 text-yellow-600" />;
      case "rejected":
        return <XCircle className="w-4 h-4 text-red-600" />;
      default:
        return null;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "completed":
        return "Completada";
      case "in_progress":
        return "En Progreso";
      case "pending":
        return "Pendiente";
      case "rejected":
        return "Rechazada";
      default:
        return status;
    }
  };

  const handleStatusChange = (status: string) => {
    setNewStatus(status);
    onStatusChange?.(recommendation.id, status);
  };

  const handleCommentSubmit = () => {
    if (comment.trim()) {
      onCommentAdd?.(recommendation.id, comment);
      setComment("");
    }
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon">
          <FileText className="w-4 h-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">{recommendation.title}</DialogTitle>
          <DialogDescription className="text-base">
            {recommendation.description}
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
          {/* Status and Priority */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Estado</span>
              <Select value={newStatus} onValueChange={handleStatusChange}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pendiente</SelectItem>
                  <SelectItem value="in_progress">En Progreso</SelectItem>
                  <SelectItem value="completed">Completada</SelectItem>
                  <SelectItem value="rejected">Rechazada</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Prioridad</span>
              <span className={`px-2 py-1 rounded-full text-xs ${
                recommendation.priority === "Alta"
                  ? "bg-red-100 text-red-700"
                  : recommendation.priority === "Media"
                  ? "bg-yellow-100 text-yellow-700"
                  : "bg-blue-100 text-blue-700"
              }`}>
                {recommendation.priority}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Plazo</span>
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm">{recommendation.timeline}</span>
              </div>
            </div>
          </div>

          {/* Metrics */}
          <Card className="p-4">
            <h3 className="font-medium mb-4 flex items-center gap-2">
              <BarChart2 className="w-4 h-4" /> Métricas Clave
            </h3>
            <div className="space-y-3">
              {recommendation.metrics.map((metric, index) => (
                <div key={index} className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">
                    {metric.label}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{metric.value}</span>
                    <span className={`text-xs ${
                      metric.change > 0
                        ? "text-green-600"
                        : metric.change < 0
                        ? "text-red-600"
                        : "text-muted-foreground"
                    }`}>
                      {metric.change > 0 ? "+" : ""}
                      {metric.change}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Implementation Steps */}
          <Card className="p-4">
            <h3 className="font-medium mb-4 flex items-center gap-2">
              <Target className="w-4 h-4" /> Pasos de Implementación
            </h3>
            <ul className="space-y-2">
              {recommendation.steps.map((step, index) => (
                <li key={index} className="flex items-start gap-2">
                  <span className="text-sm font-medium min-w-[24px]">
                    {index + 1}.
                  </span>
                  <span className="text-sm">{step}</span>
                </li>
              ))}
            </ul>
          </Card>

          {/* Expected Benefits */}
          <Card className="p-4">
            <h3 className="font-medium mb-4">Beneficios Esperados</h3>
            <ul className="space-y-2">
              {recommendation.benefits.map((benefit, index) => (
                <li key={index} className="text-sm flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5" />
                  <span>{benefit}</span>
                </li>
              ))}
            </ul>
          </Card>

          {/* Related Recommendations */}
          {recommendation.relatedRecommendations.length > 0 && (
            <div className="md:col-span-2">
              <h3 className="font-medium mb-4">Recomendaciones Relacionadas</h3>
              <div className="space-y-2">
                {recommendation.relatedRecommendations.map((related) => (
                  <div
                    key={related.id}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <span className="text-sm">{related.title}</span>
                    <div className="flex items-center gap-2">
                      {getStatusIcon(related.status)}
                      <span className="text-sm">
                        {getStatusLabel(related.status)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Comments Section */}
          <div className="md:col-span-2 space-y-4">
            <h3 className="font-medium flex items-center gap-2">
              <MessageSquare className="w-4 h-4" /> Comentarios
            </h3>
            <div className="flex gap-2">
              <Textarea
                placeholder="Agregar un comentario..."
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                className="flex-1"
              />
              <Button onClick={handleCommentSubmit}>Enviar</Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}