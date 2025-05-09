"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/components/ui/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { createClient } from "@/lib/supabase/client";
import { Evaluation, Question, Response } from "@/lib/services/evaluation-service";
import { ArrowLeft, ArrowRight, Save, Send, AlertTriangle, FileText, PieChart } from "lucide-react";
import { format } from "date-fns";
import { Database } from "@/lib/database.types";

type QuestionType = Database['public']['Enums']['question_type'];

export default function RespondEvaluation({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { toast } = useToast();
  const [evaluation, setEvaluation] = useState<Evaluation | null>(null);
  const [responses, setResponses] = useState<Record<string, Response>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string>("Todas");
  const [progress, setProgress] = useState(0);
  const [categories, setCategories] = useState<string[]>([]);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const supabase = createClient();
  // Estados para paginación
  const [currentPage, setCurrentPage] = useState(1);
  const [questionsPerPage] = useState(5);
  const [showSummary, setShowSummary] = useState(false);

  useEffect(() => {
    const fetchEvaluationDetails = async () => {
      try {
        setLoading(true);

        // 1. Obtener los detalles de la evaluación
        const evalResponse = await fetch(`/api/evaluations/${params.id}`);
        if (!evalResponse.ok) {
          throw new Error("No se pudo cargar la evaluación");
        }

        const { data } = await evalResponse.json();

        if (!data) {
          throw new Error("No se encontró la evaluación");
        }

        console.log("Datos de evaluación cargados:", {
          id: data.id,
          title: data.title,
          questionsCount: data.questions?.length || 0
        });

        // Normalizar categorías en los datos recibidos
        if (data.questions && data.questions.length > 0) {
          data.questions = data.questions.map((q: Question) => ({
            ...q,
            category: q.category && q.category.trim() !== '' ? q.category : 'Sin categoría'
          }));
        }

        console.log("Preguntas cargadas:", data.questions?.length || 0);

        // Añadir opción "Todas" a las categorías
        const allCategories = ['Todas'];
        const uniqueCategories = Array.from(
          new Set(data.questions.map((q: Question) => q.category))
        ).filter(Boolean) as string[];

        // Combinar "Todas" con las categorías únicas
        const combinedCategories = [...allCategories, ...uniqueCategories];

        console.log("Categorías únicas:", combinedCategories);

        setEvaluation(data);
        setCategories(combinedCategories);
        setActiveCategory(combinedCategories[0]); // Por defecto, seleccionar "Todas"

        // 2. Obtener las respuestas existentes para este proveedor directamente del endpoint /respond
        console.log("Obteniendo respuestas existentes...");
        const respResponse = await fetch(`/api/evaluations/${params.id}/respond`);

        if (!respResponse.ok) {
          console.warn("Error al cargar respuestas:", respResponse.status);
          toast({
            title: "Advertencia",
            description: "No se pudieron cargar las respuestas guardadas anteriormente",
            variant: "destructive",
          });
        } else {
          const responseData = await respResponse.json();
          console.log("Datos de respuesta recibidos:", responseData);

          // Verificar si la evaluación ya está completada/enviada
          if (responseData?.data?.status === 'completed' ||
            responseData?.data?.evaluation_status === 'completed') {
            setIsSubmitted(true);
            console.log("La evaluación ya fue enviada - modo solo lectura");

            toast({
              title: "Evaluación enviada",
              description: "Esta evaluación ya fue enviada y no puede ser modificada",
              duration: 6000,
            });
          }

          if (responseData?.data?.responses && Array.isArray(responseData.data.responses)) {
            // Inicializar respuestas a partir de los datos existentes
            const initialResponses: Record<string, Response> = {};

            responseData.data.responses.forEach((response: Response) => {
              if (response && response.question_id) {
                initialResponses[response.question_id] = response;
              }
            });

            console.log("Respuestas iniciales cargadas:", Object.keys(initialResponses).length);

            if (Object.keys(initialResponses).length > 0) {
              setResponses(initialResponses);

              // Si hay un progreso definido en la respuesta, usarlo
              if (responseData.data.progress !== undefined && responseData.data.progress !== null) {
                setProgress(responseData.data.progress);
              } else {
                // Calcular el progreso con las respuestas cargadas
                const calculatedProgress = calculateProgress(initialResponses, data.questions);
                setProgress(calculatedProgress);
              }

              console.log("Progreso establecido:", responseData.data.progress || "calculado");
            } else {
              console.log("No se encontraron respuestas para cargar");
            }
          } else {
            console.warn("Formato de respuestas no válido:", responseData);
          }
        }
      } catch (error) {
        console.error("Error fetching evaluation:", error);
        toast({
          title: "Error",
          description: "No se pudo cargar la evaluación",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchEvaluationDetails();
  }, [params.id, toast]);

  const calculateProgress = (currentResponses: Record<string, Response>, questions: Question[]) => {
    if (!questions || questions.length === 0) return 0;

    const requiredQuestions = questions.filter(q => q.is_required);
    if (requiredQuestions.length === 0) return 100;

    const answeredRequired = requiredQuestions.filter(q =>
      currentResponses[q.id] && currentResponses[q.id].response_value
    ).length;

    // Calcular el progreso con decimales y redondear para mayor precisión
    const calculatedProgress = (answeredRequired / requiredQuestions.length) * 100;
    const newProgress = Math.round(calculatedProgress);

    console.log(`Progreso calculado: ${newProgress}% (${answeredRequired} de ${requiredQuestions.length} preguntas requeridas)`);

    setProgress(newProgress);
    return newProgress;
  };

  // Utility function to normalize response values between API and UI
  const normalizeResponseValue = (value: string | null | undefined, type: string): string => {
    if (!value) return '';

    // For yes/no/na questions, normalize between Spanish UI and English API values
    if (type === 'si/no/no aplica') {
      const valueMap: Record<string, string> = {
        'sí': 'Yes',
        'yes': 'Yes',
        'Yes': 'Yes',
        'no': 'No',
        'No': 'No',
        'no aplica': 'N/A',
        'N/A': 'N/A',
        'n/a': 'N/A',
      };

      return valueMap[value.toLowerCase()] || value;
    }

    return value;
  };

  const handleResponseChange = (questionId: string, value: string) => {
    const updatedResponses = {
      ...responses,
      [questionId]: {
        ...responses[questionId],
        question_id: questionId,
        response_value: value,
      },
    };

    setResponses(updatedResponses);

    if (evaluation?.questions) {
      calculateProgress(updatedResponses, evaluation.questions);
    }
  };

  const handleNotesChange = (questionId: string, notes: string) => {
    setResponses({
      ...responses,
      [questionId]: {
        ...responses[questionId],
        question_id: questionId,
        notes,
      },
    });
  };

  const handleSaveResponses = async (submitFinal: boolean = false) => {
    if (!evaluation) return;

    // Si estamos enviando la evaluación final, validar que todas las preguntas requeridas estén respondidas
    if (submitFinal) {
      const requiredQuestions = evaluation.questions.filter(q => q.is_required);
      const unansweredRequired = requiredQuestions.filter(q =>
        !responses[q.id] || !responses[q.id].response_value
      );

      if (unansweredRequired.length > 0) {
        toast({
          title: "Preguntas requeridas sin responder",
          description: `Tienes ${unansweredRequired.length} preguntas obligatorias sin responder. Por favor, responde todas las preguntas marcadas como obligatorias.`,
          variant: "destructive",
        });

        // Activar la categoría donde está la primera pregunta sin responder
        const firstUnanswered = unansweredRequired[0];
        if (firstUnanswered.category) {
          setActiveCategory(firstUnanswered.category);
        } else {
          setActiveCategory('Todas');
        }

        // Encontrar la página donde está la primera pregunta sin responder
        const allQuestions = activeCategory === 'Todas' ?
          evaluation.questions :
          evaluation.questions.filter(q => q.category === activeCategory);

        const questionIndex = allQuestions.findIndex(q => q.id === firstUnanswered.id);
        if (questionIndex >= 0) {
          const page = Math.floor(questionIndex / questionsPerPage) + 1;
          setCurrentPage(page);
        }

        return;
      }
    }

    try {
      submitFinal ? setSubmitting(true) : setSaving(true);

      // Convert responses object to array
      const responsesArray = Object.values(responses).filter(r => r.question_id);

      console.log("Enviando respuestas:", {
        responsesArray,
        status: submitFinal ? 'completed' : 'in_progress',
        progress
      });

      const newStatus = submitFinal ? 'completed' : 'in_progress';

      const response = await fetch(`/api/evaluations/${params.id}/respond`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          responses: responsesArray,
          status: newStatus,
          progress: progress,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error("Error response:", errorData);
        throw new Error(errorData.error || errorData.message || "Error al guardar las respuestas");
      }

      toast({
        title: submitFinal ? "Evaluación enviada" : "Respuestas guardadas",
        description: submitFinal
          ? "La evaluación ha sido enviada para revisión"
          : "Tus respuestas han sido guardadas correctamente",
      });

      if (submitFinal) {
        // Actualizar estado local para modo solo lectura
        setIsSubmitted(true);

        // Recargar la página para obtener la última información
        setTimeout(() => {
          window.location.reload();
        }, 1500);
      }
    } catch (error) {
      console.error("Error saving responses:", error);

      // Mostrar mensaje de error más detallado
      let errorMessage = "Error desconocido";
      if (error instanceof Error) {
        errorMessage = error.message;
      }

      toast({
        title: "Error",
        description: `No se pudieron guardar las respuestas: ${errorMessage}`,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
      setSubmitting(false);
    }
  };

  const renderQuestionInput = (question: Question) => {
    const response = responses[question.id];
    const responseValue = normalizeResponseValue(
      response?.response_value || "",
      question.type
    );

    // Handle different question types based on the schema
    if (question.type === "escala 1-5") {
      return (
        <RadioGroup
          value={responseValue}
          onValueChange={(value) => !isSubmitted && handleResponseChange(question.id, value)}
          className="mt-2 flex items-center space-x-2"
          disabled={isSubmitted}
        >
          {[1, 2, 3, 4, 5].map((num) => (
            <div key={num} className="flex flex-col items-center">
              <RadioGroupItem
                value={num.toString()}
                id={`${question.id}-${num}`}
                disabled={isSubmitted}
              />
              <Label
                htmlFor={`${question.id}-${num}`}
                className={`mt-1 ${isSubmitted ? "text-muted-foreground" : ""}`}
              >
                {num}
              </Label>
            </div>
          ))}
        </RadioGroup>
      );
    } else if (question.type === "si/no/no aplica") {
      return (
        <RadioGroup
          value={responseValue}
          onValueChange={(value) => !isSubmitted && handleResponseChange(question.id, value)}
          className="mt-2 flex items-center space-x-4"
          disabled={isSubmitted}
        >
          <div className="flex items-center space-x-2">
            <RadioGroupItem
              value="Yes"
              id={`${question.id}-yes`}
              disabled={isSubmitted}
            />
            <Label
              htmlFor={`${question.id}-yes`}
              className={isSubmitted ? "text-muted-foreground" : ""}
            >
              Sí
            </Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem
              value="No"
              id={`${question.id}-no`}
              disabled={isSubmitted}
            />
            <Label
              htmlFor={`${question.id}-no`}
              className={isSubmitted ? "text-muted-foreground" : ""}
            >
              No
            </Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem
              value="N/A"
              id={`${question.id}-na`}
              disabled={isSubmitted}
            />
            <Label
              htmlFor={`${question.id}-na`}
              className={isSubmitted ? "text-muted-foreground" : ""}
            >
              No Aplica
            </Label>
          </div>
        </RadioGroup>
      );
    } else if (question.type === "texto") {
      return (
        <Textarea
          value={responseValue}
          onChange={(e) => !isSubmitted && handleResponseChange(question.id, e.target.value)}
          className={`mt-2 ${isSubmitted ? "bg-muted cursor-not-allowed" : ""}`}
          rows={4}
          placeholder="Escribe tu respuesta aquí..."
          disabled={isSubmitted}
        />
      );
    } else if (question.type === "selección múltiple") {
      // Check if options is an array and not empty
      const options = Array.isArray(question.options) ? question.options : [];
      if (options.length === 0) {
        return <p className="text-red-500 mt-2">Error: No hay opciones definidas para esta pregunta.</p>;
      }

      const selectedValues = responseValue ? responseValue.split(',') : [];

      return (
        <div className="mt-2 space-y-2">
          {options.map((option: string, idx: number) => (
            <div key={idx} className="flex items-center space-x-2">
              <Checkbox
                id={`${question.id}-${idx}`}
                checked={selectedValues.includes(option)}
                onCheckedChange={(checked) => {
                  if (!isSubmitted) {
                    const newValues = checked
                      ? [...selectedValues, option]
                      : selectedValues.filter(v => v !== option);
                    handleResponseChange(question.id, newValues.join(','));
                  }
                }}
                disabled={isSubmitted}
              />
              <Label
                htmlFor={`${question.id}-${idx}`}
                className={isSubmitted ? "text-muted-foreground" : ""}
              >
                {option}
              </Label>
            </div>
          ))}
        </div>
      );
    } else if (question.type === "selección única") {
      // Check if options is an array and not empty
      const options = Array.isArray(question.options) ? question.options : [];
      if (options.length === 0) {
        return <p className="text-red-500 mt-2">Error: No hay opciones definidas para esta pregunta.</p>;
      }

      return (
        <RadioGroup
          value={responseValue}
          onValueChange={(value) => !isSubmitted && handleResponseChange(question.id, value)}
          className="mt-2 space-y-2"
          disabled={isSubmitted}
        >
          {options.map((option: string, idx: number) => (
            <div key={idx} className="flex items-center space-x-2">
              <RadioGroupItem
                value={option}
                id={`${question.id}-${idx}`}
                disabled={isSubmitted}
              />
              <Label
                htmlFor={`${question.id}-${idx}`}
                className={isSubmitted ? "text-muted-foreground" : ""}
              >
                {option}
              </Label>
            </div>
          ))}
        </RadioGroup>
      );
    } else {
      return (
        <div className="text-yellow-600 mt-2">
          <AlertTriangle className="inline mr-2" size={16} />
          Tipo de pregunta no soportado: {question.type}
        </div>
      );
    }
  };

  // Función para calcular el resumen por categoría
  const calculateSummaryByCategory = () => {
    if (!evaluation?.questions) return {};

    const summary: Record<string, { total: number; completed: number; progress: number }> = {};

    // Agrupar preguntas por categoría y contar completadas
    evaluation.questions.forEach(question => {
      const category = question.category || 'Sin categoría';

      if (!summary[category]) {
        summary[category] = { total: 0, completed: 0, progress: 0 };
      }

      summary[category].total++;

      // Verificar si hay respuesta para esta pregunta
      if (responses[question.id]?.response_value) {
        summary[category].completed++;
      }
    });

    // Calcular progreso por categoría
    Object.keys(summary).forEach(category => {
      const { total, completed } = summary[category];
      summary[category].progress = total > 0 ? Math.round((completed / total) * 100) : 0;
    });

    return summary;
  };

  // Filtrar preguntas según la categoría seleccionada
  const filteredQuestions = evaluation?.questions
    ? activeCategory === 'Todas'
      ? evaluation.questions
      : evaluation.questions.filter(q => q.category === activeCategory)
    : [];

  // Calcular paginación
  const indexOfLastQuestion = currentPage * questionsPerPage;
  const indexOfFirstQuestion = indexOfLastQuestion - questionsPerPage;
  const currentQuestions = filteredQuestions.slice(indexOfFirstQuestion, indexOfLastQuestion);
  const totalPages = Math.ceil(filteredQuestions.length / questionsPerPage);

  // Manejar navegación de páginas
  const handleNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
      window.scrollTo(0, 0);
    }
  };

  const handlePrevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
      window.scrollTo(0, 0);
    }
  };

  // Función para manejar el guardado global de respuestas
  const handleSaveAllResponses = async () => {
    await handleSaveResponses(false);
  };

  // Navegación a página específica
  const goToPage = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
      window.scrollTo(0, 0);
    }
  };

  // Componente de indicador de paginación
  const PaginationIndicator = () => {
    return (
      <div className="flex items-center justify-center space-x-2 my-4">
        <Button
          variant="outline"
          size="sm"
          onClick={() => goToPage(1)}
          disabled={currentPage === 1 || isSubmitted}
        >
          Primera
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={handlePrevPage}
          disabled={currentPage === 1 || isSubmitted}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>

        <span className="text-sm">
          Página {currentPage} de {totalPages}
        </span>

        <Button
          variant="outline"
          size="sm"
          onClick={handleNextPage}
          disabled={currentPage === totalPages || isSubmitted}
        >
          <ArrowRight className="h-4 w-4" />
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={() => goToPage(totalPages)}
          disabled={currentPage === totalPages || isSubmitted}
        >
          Última
        </Button>
      </div>
    );
  };

  // Componente de resumen de progreso
  const ProgressSummary = () => {
    const summary = calculateSummaryByCategory();
    const categories = Object.keys(summary);

    if (categories.length === 0) return null;

    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Resumen de Progreso</CardTitle>
          <CardDescription>
            Progreso por categoría de preguntas
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {categories.map(category => (
            <div key={category} className="space-y-1">
              <div className="flex justify-between text-sm">
                <span>{category}</span>
                <span>{summary[category].completed} de {summary[category].total} ({summary[category].progress}%)</span>
              </div>
              <Progress value={summary[category].progress} className="h-2" />
            </div>
          ))}
          <div className="pt-4 border-t">
            <div className="flex justify-between font-medium">
              <span>Progreso total</span>
              <span>{progress}%</span>
            </div>
            <Progress value={progress} className="h-3 mt-1" />
          </div>
        </CardContent>
      </Card>
    );
  };

  if (loading) {
    return (
      <div className="container mx-auto py-10 space-y-8">
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-2 text-center">
              <p>Cargando evaluación...</p>
              <Progress value={undefined} className="animate-pulse" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!evaluation) {
    return (
      <div className="container mx-auto py-10 space-y-8">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center text-red-500">
              <AlertTriangle className="inline mr-2" />
              No se pudo cargar la evaluación. Por favor, intenta nuevamente.
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-8">
      {isSubmitted && (
        <Card className="bg-muted border-primary">
          <CardContent className="pt-6 pb-4">
            <div className="flex items-center gap-3 text-primary">
              <AlertTriangle className="h-6 w-6" />
              <div>
                <h3 className="font-medium">Evaluación enviada</h3>
                <p className="text-sm text-muted-foreground">
                  Esta evaluación ya fue enviada y no puede ser modificada. Puedes revisar tus respuestas en modo de solo lectura.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{evaluation.title}</h1>
          <p className="text-muted-foreground">
            {evaluation.description || "Sin descripción disponible"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => router.push(`/evaluations`)}
            className="gap-1"
          >
            <ArrowLeft className="h-4 w-4" /> Regresar
          </Button>

          {!isSubmitted && (
            <>
              <Button
                onClick={handleSaveAllResponses}
                disabled={saving}
                className="gap-1"
              >
                {saving ? "Guardando..." : <><Save className="h-4 w-4" /> Guardar</>}
              </Button>
              <Button
                variant="default"
                onClick={() => handleSaveResponses(true)}
                disabled={submitting || progress < 100}
                className="gap-1"
              >
                {submitting
                  ? "Enviando..."
                  : progress < 100
                    ? "Completa todas las preguntas requeridas"
                    : <><Send className="h-4 w-4" /> Enviar</>
                }
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex justify-between items-center">
                <CardTitle className="text-xl">Preguntas de la evaluación</CardTitle>
                <div className="flex items-center text-sm text-muted-foreground">
                  <span className="mr-2">Progreso:</span>
                  <span className="font-medium">{progress}%</span>
                </div>
              </div>
              <Progress value={progress} className="h-2" />
            </CardHeader>
            <CardContent>
              <Tabs defaultValue={activeCategory} onValueChange={setActiveCategory}>
                <TabsList className="mb-4 flex flex-wrap">
                  {categories.map((category) => (
                    <TabsTrigger
                      key={category}
                      value={category}
                      onClick={() => {
                        setActiveCategory(category);
                        setCurrentPage(1); // Resetear a primera página cuando cambia la categoría
                      }}
                    >
                      {category}
                    </TabsTrigger>
                  ))}
                </TabsList>

                {categories.map((category) => (
                  <TabsContent key={category} value={category} className="space-y-4 pt-2">
                    {currentQuestions.length === 0 ? (
                      <div className="text-center py-6 text-muted-foreground">
                        No hay preguntas en esta categoría.
                      </div>
                    ) : (
                      <>
                        {/* Contador de preguntas mostradas */}
                        <div className="text-sm text-muted-foreground mb-4">
                          Mostrando {indexOfFirstQuestion + 1}-{Math.min(indexOfLastQuestion, filteredQuestions.length)} de {filteredQuestions.length} preguntas
                        </div>

                        {/* Lista de preguntas actuales */}
                        {currentQuestions.map((question) => (
                          <Card
                            key={question.id}
                            className={`mb-6 ${isSubmitted ? "border border-muted-foreground/20" : ""}`}
                          >
                            <CardContent className="pt-6">
                              <div className="space-y-4">
                                <div>
                                  <div className="flex justify-between mb-1">
                                    <div className="font-medium flex items-start gap-2">
                                      <span className="bg-muted text-muted-foreground text-xs px-2 py-1 rounded">
                                        {question.category || "Sin categoría"}
                                      </span>
                                      {question.is_required && (
                                        <span className="text-red-500 text-xs">* Obligatorio</span>
                                      )}
                                      {isSubmitted && (
                                        <span className="text-primary text-xs bg-primary/10 px-2 py-1 rounded">
                                          Solo lectura
                                        </span>
                                      )}
                                    </div>
                                    <span className="text-xs text-muted-foreground">
                                      Tipo: {question.type}
                                    </span>
                                  </div>
                                  <div>{question.question_text}</div>
                                  {question.description && (
                                    <div className="text-sm text-muted-foreground mt-1">
                                      {question.description}
                                    </div>
                                  )}
                                </div>

                                {renderQuestionInput(question)}

                                <div className="mt-4">
                                  <Label htmlFor={`notes-${question.id}`}>
                                    Notas adicionales {isSubmitted ? "(solo lectura)" : "(opcional)"}
                                  </Label>
                                  <Textarea
                                    id={`notes-${question.id}`}
                                    value={responses[question.id]?.notes || ""}
                                    onChange={(e) => !isSubmitted && handleNotesChange(question.id, e.target.value)}
                                    placeholder={isSubmitted ? "No se pueden agregar notas adicionales" : "Añade cualquier información adicional aquí..."}
                                    className={`mt-1 ${isSubmitted ? "bg-muted cursor-not-allowed" : ""}`}
                                    disabled={isSubmitted}
                                  />
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))}

                        {/* Controles de paginación */}
                        {filteredQuestions.length > questionsPerPage && (
                          <PaginationIndicator />
                        )}
                      </>
                    )}
                  </TabsContent>
                ))}
              </Tabs>
            </CardContent>
          </Card>

          <div className="flex justify-between mt-6">
            <Button
              variant="outline"
              onClick={handlePrevPage}
              disabled={currentPage <= 1 || isSubmitted}
              className="gap-1"
            >
              <ArrowLeft className="h-4 w-4" /> Anterior
            </Button>

            {!isSubmitted && (
              <Button
                onClick={handleSaveAllResponses}
                disabled={saving}
                className="gap-1"
              >
                {saving ? "Guardando..." : <><Save className="h-4 w-4" /> Guardar progreso</>}
              </Button>
            )}

            <Button
              variant="outline"
              onClick={handleNextPage}
              disabled={currentPage >= totalPages || isSubmitted}
              className="gap-1"
            >
              Siguiente <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="space-y-6">
          <ProgressSummary />

          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <FileText className="h-5 w-5" /> Detalles de la evaluación
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="text-sm font-medium">Periodo de evaluación:</div>
                <div className="text-sm">
                  {evaluation.start_date && evaluation.end_date
                    ? `${format(new Date(evaluation.start_date), 'dd/MM/yyyy')} - ${format(new Date(evaluation.end_date), 'dd/MM/yyyy')}`
                    : "No especificado"}
                </div>
              </div>

              <div>
                <div className="text-sm font-medium">Total de preguntas:</div>
                <div className="text-sm">{evaluation.questions?.length || 0}</div>
              </div>

              <div>
                <div className="text-sm font-medium">Preguntas requeridas:</div>
                <div className="text-sm">
                  {evaluation.questions?.filter(q => q.is_required).length || 0}
                </div>
              </div>

              <div>
                <div className="text-sm font-medium">Categorías:</div>
                <div className="text-sm">
                  {categories.filter(c => c !== 'Todas').join(', ') || 'Ninguna'}
                </div>
              </div>

              <div className="pt-4 border-t">
                <Button
                  variant="outline"
                  className="w-full gap-1"
                  onClick={() => setShowSummary(!showSummary)}
                >
                  <PieChart className="h-4 w-4" />
                  {showSummary ? "Ocultar resumen" : "Ver resumen de respuestas"}
                </Button>
              </div>

              {showSummary && (
                <div className="space-y-2 pt-2">
                  <div className="text-sm font-medium">Respuestas completadas:</div>
                  <div className="text-sm">
                    {Object.keys(responses).filter(key => responses[key]?.response_value).length} de {evaluation.questions?.length || 0}
                  </div>

                  <div className="text-sm font-medium mt-2">Estado:</div>
                  <div className="text-sm">
                    {isSubmitted
                      ? <span className="text-primary">Enviada</span>
                      : progress < 100
                        ? "Incompleto"
                        : "Listo para enviar"
                    }
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
} 