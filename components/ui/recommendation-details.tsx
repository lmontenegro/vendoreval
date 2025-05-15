import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import {
  CheckCircle2,
  Clock,
  AlertTriangle,
  XCircle,
  Calendar,
} from "lucide-react";

type RecommendationStatus = "pending" | "in_progress" | "implemented" | "rejected" | null;

type Recommendation = {
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
};

interface RecommendationDetailsProps {
  recommendation: Recommendation;
  onStatusChange?: (id: string, status: RecommendationStatus) => void;
  isSupplier?: boolean;
}

export function RecommendationDetails({
  recommendation,
  onStatusChange,
  isSupplier = false,
}: RecommendationDetailsProps) {
  const handleStatusChange = (status: RecommendationStatus) => {
    if (onStatusChange) {
      onStatusChange(recommendation.id, status);
    }
  };

  const getPriorityLabel = (priority: number) => {
    switch (priority) {
      case 1: return "Alta";
      case 2: return "Media";
      default: return "No definida";
    }
  };

  const getPriorityClass = (priority: number) => {
    switch (priority) {
      case 1: return "text-red-600 bg-red-50";
      case 2: return "text-blue-600 bg-blue-50";
      default: return "text-gray-600 bg-gray-50";
    }
  };

  const getStatusIcon = (status: RecommendationStatus) => {
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

  const getStatusLabel = (status: RecommendationStatus) => {
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

  const getStatusClass = (status: RecommendationStatus) => {
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

  const getAnswerLabel = (answer: string) => {
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

  const getAnswerClass = (answer: string) => {
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

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
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
            {format(new Date(recommendation.due_date), 'dd/MM/yyyy')}
          </div>
        )}
      </div>

      <div>
        <h3 className="text-sm font-medium">Pregunta:</h3>
        <p className="mt-1 text-sm text-gray-700">{recommendation.question_text}</p>
      </div>

      <div>
        <h3 className="text-sm font-medium">Recomendación:</h3>
        <p className="mt-1 text-sm text-gray-700">{recommendation.recommendation_text}</p>
      </div>

      {isSupplier && onStatusChange && (
        <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-gray-200">
          <Button
            size="sm"
            variant={recommendation.status === 'pending' ? 'default' : 'outline'}
            onClick={() => handleStatusChange('pending')}
          >
            <AlertTriangle className="w-4 h-4 mr-2" />
            Pendiente
          </Button>
          <Button
            size="sm"
            variant={recommendation.status === 'in_progress' ? 'default' : 'outline'}
            onClick={() => handleStatusChange('in_progress')}
          >
            <Clock className="w-4 h-4 mr-2" />
            En Progreso
          </Button>
          <Button
            size="sm"
            variant={recommendation.status === 'implemented' ? 'default' : 'outline'}
            onClick={() => handleStatusChange('implemented')}
          >
            <CheckCircle2 className="w-4 h-4 mr-2" />
            Implementada
          </Button>
          <Button
            size="sm"
            variant={recommendation.status === 'rejected' ? 'default' : 'outline'}
            onClick={() => handleStatusChange('rejected')}
          >
            <XCircle className="w-4 h-4 mr-2" />
            Rechazada
          </Button>
        </div>
      )}
    </div>
  );
}