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
  AlertTriangle,
  Search,
  Building,
  CheckCircle2,
  XCircle,
  Minus,
  BarChart3,
  ArrowUpRight,
  TrendingDown,
  PieChart,
  Calendar,
  Users,
} from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

// Interfaces para los tipos de datos
interface AdminEvaluationFeedback {
  evaluation_id: string;
  evaluation_title: string;
  vendor_id: string;
  vendor_name: string;
  total_questions: number;
  answered_questions: number;
  no_answers_count: number;
  na_answers_count: number;
  recommendations_count: number;
  completion_percentage: number;
  status: string;
  completed_at: string | null;
  questions_with_issues: QuestionWithIssue[];
}

interface QuestionWithIssue {
  question_id: string;
  question_text: string;
  category: string;
  subcategory: string | null;
  answer: string | null;
  response_value: string;
  recommendation_text: string | null;
  priority: number | null;
  created_at: string | null;
}

interface FeedbackSummary {
  total_evaluations: number;
  total_vendors: number;
  total_issues: number;
  total_recommendations: number;
}

export default function AdminRecommendationsPage() {
  const [evaluations, setEvaluations] = useState<AdminEvaluationFeedback[]>([]);
  const [filteredEvaluations, setFilteredEvaluations] = useState<AdminEvaluationFeedback[]>([]);
  const [summary, setSummary] = useState<FeedbackSummary | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [filterIssues, setFilterIssues] = useState<string>("all");
  const { toast } = useToast();
  const router = useRouter();

  useEffect(() => {
    const fetchAdminData = async () => {
      try {
        setLoading(true);
        console.log('Obteniendo datos administrativos de recomendaciones');

        const response = await fetch('/api/recommendations/admin');

        if (!response.ok) {
          const errorData = await response.json();
          console.error('Error en la respuesta:', errorData);

          if (response.status === 403) {
            setError('No tienes permisos para acceder a esta información. Solo los administradores pueden ver estos datos.');
            return;
          }

          throw new Error(errorData.error || 'Error al cargar datos administrativos');
        }

        const data = await response.json();
        console.log('Datos administrativos recibidos:', data);

        setEvaluations(data.data || []);
        setFilteredEvaluations(data.data || []);
        setSummary(data.summary || null);

      } catch (error: any) {
        console.error('Error al cargar datos administrativos:', error);
        setError(error.message || 'Error al cargar datos administrativos');
        toast({
          title: "Error",
          description: error.message || "No se pudieron cargar los datos administrativos",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchAdminData();
  }, [toast]);

  // Filtrar evaluaciones cuando cambie el término de búsqueda o el filtro
  useEffect(() => {
    let filtered = evaluations;

    // Filtrar por término de búsqueda
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter((evaluation) =>
        evaluation.evaluation_title.toLowerCase().includes(term) ||
        evaluation.vendor_name.toLowerCase().includes(term)
      );
    }

    // Filtrar por problemas
    if (filterIssues !== "all") {
      if (filterIssues === "with_issues") {
        filtered = filtered.filter((evaluation) =>
          evaluation.no_answers_count > 0 || evaluation.na_answers_count > 0
        );
      } else if (filterIssues === "no_issues") {
        filtered = filtered.filter((evaluation) =>
          evaluation.no_answers_count === 0 && evaluation.na_answers_count === 0
        );
      } else if (filterIssues === "high_issues") {
        filtered = filtered.filter((evaluation) =>
          (evaluation.no_answers_count + evaluation.na_answers_count) >= 5
        );
      }
    }

    setFilteredEvaluations(filtered);
  }, [searchTerm, filterIssues, evaluations]);

  const getIssuesBadge = (evaluation: AdminEvaluationFeedback) => {
    const totalIssues = evaluation.no_answers_count + evaluation.na_answers_count;

    if (totalIssues === 0) {
      return <Badge variant="secondary" className="bg-green-100 text-green-800">Sin problemas</Badge>;
    } else if (totalIssues <= 2) {
      return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">{totalIssues} problemas</Badge>;
    } else if (totalIssues <= 5) {
      return <Badge variant="secondary" className="bg-orange-100 text-orange-800">{totalIssues} problemas</Badge>;
    } else {
      return <Badge variant="destructive">{totalIssues} problemas</Badge>;
    }
  };

  const getAnswerIcon = (answer: string | null) => {
    switch (answer) {
      case "Yes":
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case "No":
        return <XCircle className="h-4 w-4 text-red-500" />;
      case "N/A":
        return <Minus className="h-4 w-4 text-gray-500" />;
      default:
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
    }
  };

  const handleViewDetails = (evaluationId: string) => {
    router.push(`/recommendations/${evaluationId}`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-800 mx-auto"></div>
          <p className="mt-2">Cargando datos administrativos...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-red-300 p-8 text-center max-w-md">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-red-50">
            <AlertTriangle className="h-10 w-10 text-red-500" />
          </div>
          <h3 className="mt-4 text-lg font-semibold">Error de Acceso</h3>
          <p className="mb-4 mt-2 text-sm text-muted-foreground">
            {error}
          </p>
          <Button
            onClick={() => router.push('/recommendations')}
            variant="outline"
          >
            Volver a Recomendaciones
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col space-y-6 p-6">
      <div className="flex flex-col space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Panel Administrativo - Recomendaciones</h1>
        <p className="text-muted-foreground">
          Vista administrativa de todas las evaluaciones con análisis de cumplimiento y recomendaciones.
        </p>
      </div>

      {/* Tarjetas de resumen */}
      {summary && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total Evaluaciones
              </CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summary.total_evaluations}</div>
              <p className="text-xs text-muted-foreground">
                Evaluaciones completadas
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Proveedores Evaluados
              </CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summary.total_vendors}</div>
              <p className="text-xs text-muted-foreground">
                Vendors únicos
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Problemas Detectados
              </CardTitle>
              <TrendingDown className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{summary.total_issues}</div>
              <p className="text-xs text-muted-foreground">
                Respuestas No/N/A
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Recomendaciones
              </CardTitle>
              <PieChart className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{summary.total_recommendations}</div>
              <p className="text-xs text-muted-foreground">
                Recomendaciones generadas
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Controles de filtrado */}
      <div className="flex flex-col space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Buscar por evaluación o proveedor..."
                className="w-[300px] pl-8"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Select
              value={filterIssues}
              onValueChange={setFilterIssues}
            >
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Filtrar por problemas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las evaluaciones</SelectItem>
                <SelectItem value="with_issues">Con problemas</SelectItem>
                <SelectItem value="no_issues">Sin problemas</SelectItem>
                <SelectItem value="high_issues">Muchos problemas (5+)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Lista de evaluaciones */}
        {filteredEvaluations.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-8 text-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-muted">
              <BarChart3 className="h-10 w-10 text-muted-foreground" />
            </div>
            <h3 className="mt-4 text-lg font-semibold">No hay evaluaciones</h3>
            <p className="mb-4 mt-2 text-sm text-muted-foreground">
              No se encontraron evaluaciones que coincidan con los filtros aplicados.
            </p>
          </div>
        ) : (
          <div className="grid gap-4">
            {filteredEvaluations.map((evaluation) => (
              <Card key={evaluation.evaluation_id} className="overflow-hidden">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <CardTitle className="text-lg font-semibold">
                        {evaluation.evaluation_title}
                      </CardTitle>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Building className="h-4 w-4" />
                        <span>{evaluation.vendor_name}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {getIssuesBadge(evaluation)}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {/* Progreso de completitud */}
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Progreso de evaluación</span>
                        <span>{evaluation.completion_percentage}%</span>
                      </div>
                      <Progress value={evaluation.completion_percentage} className="h-2" />
                    </div>

                    {/* Estadísticas */}
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-blue-600">{evaluation.total_questions}</div>
                        <div className="text-muted-foreground">Total</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-green-600">{evaluation.answered_questions}</div>
                        <div className="text-muted-foreground">Respondidas</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-red-600">{evaluation.no_answers_count}</div>
                        <div className="text-muted-foreground">No</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-gray-600">{evaluation.na_answers_count}</div>
                        <div className="text-muted-foreground">N/A</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-purple-600">{evaluation.recommendations_count}</div>
                        <div className="text-muted-foreground">Recomendaciones</div>
                      </div>
                    </div>

                    {/* Fecha de completado */}
                    {evaluation.completed_at && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Calendar className="h-4 w-4" />
                        <span>
                          Completada el {format(new Date(evaluation.completed_at), "dd 'de' MMMM 'de' yyyy", { locale: es })}
                        </span>
                      </div>
                    )}

                    {/* Preguntas con problemas */}
                    {evaluation.questions_with_issues.length > 0 && (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <h4 className="text-sm font-medium">Preguntas con problemas</h4>
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button variant="ghost" size="sm">
                                Ver detalles
                                <ArrowUpRight className="ml-2 h-4 w-4" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                              <DialogHeader>
                                <DialogTitle>Preguntas con problemas - {evaluation.evaluation_title}</DialogTitle>
                                <DialogDescription>
                                  Proveedor: {evaluation.vendor_name}
                                </DialogDescription>
                              </DialogHeader>
                              <div className="space-y-4">
                                <Table>
                                  <TableHeader>
                                    <TableRow>
                                      <TableHead>Pregunta</TableHead>
                                      <TableHead>Categoría</TableHead>
                                      <TableHead>Respuesta</TableHead>
                                      <TableHead>Recomendación</TableHead>
                                      <TableHead>Prioridad</TableHead>
                                    </TableRow>
                                  </TableHeader>
                                  <TableBody>
                                    {evaluation.questions_with_issues.map((question, index) => (
                                      <TableRow key={index}>
                                        <TableCell>
                                          <div className="max-w-xs">
                                            <TooltipProvider>
                                              <Tooltip>
                                                <TooltipTrigger>
                                                  <p className="truncate text-left">
                                                    {question.question_text}
                                                  </p>
                                                </TooltipTrigger>
                                                <TooltipContent>
                                                  <p className="max-w-sm">{question.question_text}</p>
                                                </TooltipContent>
                                              </Tooltip>
                                            </TooltipProvider>
                                          </div>
                                        </TableCell>
                                        <TableCell>
                                          <div>
                                            <div className="font-medium">{question.category}</div>
                                            {question.subcategory && (
                                              <div className="text-xs text-muted-foreground">
                                                {question.subcategory}
                                              </div>
                                            )}
                                          </div>
                                        </TableCell>
                                        <TableCell>
                                          <div className="flex items-center gap-2">
                                            {getAnswerIcon(question.answer)}
                                            <span>{question.answer || 'Sin respuesta'}</span>
                                          </div>
                                        </TableCell>
                                        <TableCell>
                                          <div className="max-w-xs">
                                            {question.recommendation_text ? (
                                              <TooltipProvider>
                                                <Tooltip>
                                                  <TooltipTrigger>
                                                    <p className="truncate text-left">
                                                      {question.recommendation_text}
                                                    </p>
                                                  </TooltipTrigger>
                                                  <TooltipContent>
                                                    <p className="max-w-sm">{question.recommendation_text}</p>
                                                  </TooltipContent>
                                                </Tooltip>
                                              </TooltipProvider>
                                            ) : (
                                              <span className="text-muted-foreground">Sin recomendación</span>
                                            )}
                                          </div>
                                        </TableCell>
                                        <TableCell>
                                          {question.priority ? (
                                            <Badge
                                              variant={question.priority >= 4 ? "destructive" :
                                                question.priority >= 3 ? "secondary" : "outline"}
                                            >
                                              {question.priority}
                                            </Badge>
                                          ) : (
                                            <span className="text-muted-foreground">-</span>
                                          )}
                                        </TableCell>
                                      </TableRow>
                                    ))}
                                  </TableBody>
                                </Table>
                              </div>
                            </DialogContent>
                          </Dialog>
                        </div>

                        <div className="flex flex-wrap gap-1">
                          {evaluation.questions_with_issues.slice(0, 3).map((question, index) => (
                            <TooltipProvider key={index}>
                              <Tooltip>
                                <TooltipTrigger>
                                  <Badge variant="outline" className="text-xs">
                                    {question.category} ({question.answer})
                                  </Badge>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p className="max-w-sm">{question.question_text}</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          ))}
                          {evaluation.questions_with_issues.length > 3 && (
                            <Badge variant="secondary" className="text-xs">
                              +{evaluation.questions_with_issues.length - 3} más
                            </Badge>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Botones de acción */}
                    <div className="flex gap-2 pt-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleViewDetails(evaluation.evaluation_id)}
                      >
                        Ver recomendaciones completas
                        <ArrowUpRight className="ml-2 h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
} 