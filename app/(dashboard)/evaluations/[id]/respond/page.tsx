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
import { ArrowLeft, Save, Send, AlertTriangle, FileText } from "lucide-react";
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
  const [activeCategory, setActiveCategory] = useState<string>("");
  const [progress, setProgress] = useState(0);
  const [categories, setCategories] = useState<string[]>([]);
  const supabase = createClient();

  useEffect(() => {
    const fetchEvaluationDetails = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/evaluations/${params.id}`);
        if (!response.ok) {
          throw new Error("No se pudo cargar la evaluación");
        }

        const { data } = await response.json();

        if (!data) {
          throw new Error("No se encontró la evaluación");
        }

        console.log("Datos de evaluación cargados:", {
          id: data.id,
          title: data.title,
          questionsCount: data.questions?.length || 0,
          responsesCount: data.responses?.length || 0
        });

        console.log("Preguntas cargadas:", data.questions);

        // Extract unique categories from questions
        const uniqueCategories = Array.from(
          new Set(data.questions.map((q: Question) => q.category))
        ).filter(Boolean) as string[];

        console.log("Categorías únicas:", uniqueCategories);

        setEvaluation(data);
        setCategories(uniqueCategories);

        if (uniqueCategories.length > 0) {
          setActiveCategory(uniqueCategories[0]);
        }

        // Initialize responses from existing data
        const initialResponses: Record<string, Response> = {};
        if (data.responses && data.responses.length > 0) {
          data.responses.forEach((response: Response) => {
            initialResponses[response.question_id] = response;
          });
          console.log("Respuestas iniciales cargadas:", Object.keys(initialResponses).length);
        }

        setResponses(initialResponses);
        calculateProgress(initialResponses, data.questions);
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

    const newProgress = Math.round((answeredRequired / requiredQuestions.length) * 100);
    setProgress(newProgress);
    return newProgress;
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

    try {
      submitFinal ? setSubmitting(true) : setSaving(true);

      // Convert responses object to array
      const responsesArray = Object.values(responses).filter(r => r.question_id);

      const newStatus = submitFinal ? 'pending_review' : 'in_progress';

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
        router.push("/evaluations");
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
    const responseValue = response?.response_value || "";

    // Handle different question types based on the schema
    if (question.type === "escala 1-5") {
      return (
        <RadioGroup
          value={responseValue}
          onValueChange={(value) => handleResponseChange(question.id, value)}
          className="mt-2 flex items-center space-x-2"
        >
          {[1, 2, 3, 4, 5].map((num) => (
            <div key={num} className="flex flex-col items-center">
              <RadioGroupItem value={num.toString()} id={`${question.id}-${num}`} />
              <Label htmlFor={`${question.id}-${num}`} className="mt-1">{num}</Label>
            </div>
          ))}
        </RadioGroup>
      );
    } else if (question.type === "si/no/no aplica") {
      return (
        <RadioGroup
          value={responseValue}
          onValueChange={(value) => handleResponseChange(question.id, value)}
          className="mt-2 space-y-2"
        >
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="Yes" id={`${question.id}-yes`} />
            <Label htmlFor={`${question.id}-yes`}>Sí</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="No" id={`${question.id}-no`} />
            <Label htmlFor={`${question.id}-no`}>No</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="N/A" id={`${question.id}-na`} />
            <Label htmlFor={`${question.id}-na`}>No aplica</Label>
          </div>
        </RadioGroup>
      );
    } else {
      // Default to text input for any other type
      return (
        <Textarea
          value={responseValue}
          onChange={(e) => handleResponseChange(question.id, e.target.value)}
          placeholder="Escribe tu respuesta aquí..."
          className="mt-2"
        />
      );
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-muted-foreground">Cargando evaluación...</p>
      </div>
    );
  }

  if (!evaluation) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <AlertTriangle className="w-12 h-12 text-yellow-500 mb-4" />
        <h2 className="text-2xl font-bold mb-2">Evaluación no encontrada</h2>
        <p className="text-muted-foreground mb-6">No se pudo encontrar la evaluación solicitada</p>
        <Button onClick={() => router.push('/evaluations')}>
          Volver a evaluaciones
        </Button>
      </div>
    );
  }

  const questionsInCategory = evaluation.questions.filter(
    (q) => q.category === activeCategory
  );

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center gap-4 mb-6">
        <Button variant="outline" size="icon" onClick={() => router.push('/evaluations')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold">{evaluation.title}</h1>
          <p className="text-muted-foreground">
            {evaluation.description}
          </p>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-6">
        <div className="md:w-1/4 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Información</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm font-medium">Estado</p>
                <p className="text-sm text-muted-foreground">
                  {evaluation.status === 'draft' ? 'Borrador' :
                    evaluation.status === 'in_progress' ? 'En progreso' :
                      evaluation.status === 'pending_review' ? 'Pendiente de revisión' :
                        evaluation.status === 'completed' ? 'Completada' : 'Desconocido'}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium">Fecha de inicio</p>
                <p className="text-sm text-muted-foreground">
                  {evaluation.start_date ? format(new Date(evaluation.start_date), 'dd/MM/yyyy') : 'No definida'}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium">Fecha límite</p>
                <p className="text-sm text-muted-foreground">
                  {evaluation.end_date ? format(new Date(evaluation.end_date), 'dd/MM/yyyy') : 'No definida'}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium">Progreso</p>
                <Progress value={progress} className="h-2 mt-2" />
                <p className="text-xs text-muted-foreground text-right mt-1">{progress}%</p>
              </div>
            </CardContent>
          </Card>

          <div className="sticky top-6 space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Categorías</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {categories.map((category) => (
                    <Button
                      key={category}
                      variant={activeCategory === category ? "default" : "outline"}
                      className="w-full justify-start"
                      onClick={() => setActiveCategory(category)}
                    >
                      {category}
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>

            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => handleSaveResponses(false)}
                disabled={saving || submitting}
              >
                <Save className="h-4 w-4 mr-2" />
                {saving ? "Guardando..." : "Guardar"}
              </Button>
              <Button
                className="flex-1"
                onClick={() => handleSaveResponses(true)}
                disabled={saving || submitting || progress < 100}
              >
                <Send className="h-4 w-4 mr-2" />
                {submitting ? "Enviando..." : "Enviar"}
              </Button>
            </div>
          </div>
        </div>

        <div className="md:w-3/4">
          <Card>
            <CardHeader>
              <CardTitle>{activeCategory}</CardTitle>
              <CardDescription>
                Responde a las siguientes preguntas
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-8">
                {questionsInCategory.map((question) => (
                  <div key={question.id} className="p-4 border rounded-lg">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-medium">
                          {question.is_required && (
                            <span className="text-red-500 mr-1">*</span>
                          )}
                          {question.question_text}
                        </h3>
                        {question.description && (
                          <p className="text-sm text-muted-foreground mt-1">
                            {question.description}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="mt-4">
                      {renderQuestionInput(question)}
                    </div>

                    <div className="mt-4">
                      <Label htmlFor={`notes-${question.id}`} className="text-sm">
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4" />
                          Notas adicionales (opcional)
                        </div>
                      </Label>
                      <Textarea
                        id={`notes-${question.id}`}
                        value={responses[question.id]?.notes || ""}
                        onChange={(e) => handleNotesChange(question.id, e.target.value)}
                        placeholder="Añade cualquier información adicional relevante..."
                        className="mt-2"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
} 