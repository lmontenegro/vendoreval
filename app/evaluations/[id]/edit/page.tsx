"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/components/ui/use-toast";
import { ArrowLeft, Save, Plus, Trash2 } from "lucide-react";
import { evaluationTypes, questionTypes } from "@/lib/supabase/mock-data";
import { getEvaluationDetails, updateEvaluation } from "@/lib/services/evaluation-service";
import { v4 as uuidv4 } from 'uuid';

interface AnswerOption {
  id: string;
  text: string;
}

interface Question {
  id: string;
  type: string;
  text: string;
  required: boolean;
  weight: number;
  order: number;
  category?: string;
  options: any;
  answerOptions?: AnswerOption[];
  isNew?: boolean;
  isDeleted?: boolean;
}

interface Evaluation {
  id: string;
  title: string;
  description: string;
  type: string;
  start_date: string;
  end_date: string;
  status: string;
  is_anonymous: boolean;
  settings: {
    allow_partial_save: boolean;
    require_comments: boolean;
    show_progress: boolean;
    notify_on_submit: boolean;
  };
  questions: Question[];
  metadata?: any;
}

export default function EditEvaluation({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [evaluation, setEvaluation] = useState<Evaluation | null>(null);

  useEffect(() => {
    const fetchEvaluation = async () => {
      setLoading(true);
      try {
        const { data, error } = await getEvaluationDetails(params.id);
        
        if (error || !data) {
          throw error || new Error("No se encontró la evaluación");
        }
        
        // Extraer metadatos
        const metadata = (data as any).metadata || {};
        
        // Convertir los datos obtenidos al formato esperado por el componente
        const formattedEvaluation: Evaluation = {
          id: data.id,
          title: data.title,
          description: data.description,
          status: data.status,
          start_date: data.start_date,
          end_date: data.end_date,
          // Extraer los datos del metadata
          type: metadata.type || 'performance',
          is_anonymous: metadata.is_anonymous || false,
          settings: metadata.settings || {
            allow_partial_save: true,
            require_comments: false,
            show_progress: true,
            notify_on_submit: true
          },
          // Formatear las preguntas
          questions: (data.questions || []).map(q => {
            // Assume choices are stored in q.options.choices
            // Map them to answerOptions, ensuring each has a unique ID
            const choices = q.options?.choices || [];
            const answerOptions = choices.map((choice: any) => ({
              // Use existing ID if available, generate one if not (or handle based on backend structure)
              id: choice.id || uuidv4(), 
              text: typeof choice === 'string' ? choice : choice.text || '' 
            }));

            return {
              id: q.id,
              type: q.options?.type || 'rating_5',
              text: q.question_text,
              required: q.is_required,
              weight: q.weight,
              order: q.order_index || 0,
              category: q.category,
              options: q.options || {},
              answerOptions: answerOptions,
              isNew: false,
              isDeleted: false
            };
          })
        };
        
        setEvaluation(formattedEvaluation);
      } catch (error: any) {
        console.error("Error cargando evaluación:", error);
        toast({
          title: "Error",
          description: error.message || "No se pudo cargar la evaluación",
          variant: "destructive",
        });
        router.push("/evaluations");
      } finally {
        setLoading(false);
      }
    };

    fetchEvaluation();
  }, [params.id, router, toast]);

  const handleChange = (field: string, value: any) => {
    if (!evaluation) return;

    if (field.includes('.')) {
      const [parent, child] = field.split('.');
      setEvaluation(prev => {
        if (!prev) return prev;
        const parentObj = prev[parent as keyof Evaluation];
        if (typeof parentObj === 'object' && parentObj !== null) {
          return {
            ...prev,
            [parent]: {
              ...parentObj,
              [child]: value
            }
          };
        }
        return prev;
      });
    } else {
      setEvaluation(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          [field as keyof Evaluation]: value
        };
      });
    }
  };

  const handleQuestionChange = (index: number, field: string, value: any) => {
    if (!evaluation) return;

    const newQuestions = [...evaluation.questions];
    
    // Manejo especial para answerOptions para asegurar que siempre sea un array
    if (field === 'answerOptions') {
      newQuestions[index] = {
        ...newQuestions[index],
        answerOptions: Array.isArray(value) ? value : []
      };
    } else {
      newQuestions[index] = {
        ...newQuestions[index],
        [field]: value
      };
      
      // Si cambiando type, resetear answerOptions si el nuevo tipo no las necesita
      if (field === 'type' && !['multiple_choice', 'single_choice', 'checkbox'].includes(value)) {
          newQuestions[index].answerOptions = [];
      }
    }

    setEvaluation(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        questions: newQuestions
      };
    });
  };

  const addQuestion = () => {
    if (!evaluation) return;
    const defaultType = 'rating_5'; // Or perhaps 'multiple_choice' if that's more common?
    const needsOptions = ['multiple_choice', 'single_choice', 'checkbox'].includes(defaultType);

    const newQuestion: Question = {
      id: uuidv4(),
      type: defaultType, 
      text: '',
      required: true,
      weight: 1.0,
      order: evaluation.questions.filter(q => !q.isDeleted).length + 1, // Correct order based on visible questions
      category: 'general',
      options: {}, // Keep this structure for now?
      answerOptions: needsOptions ? [{ id: uuidv4(), text: '' }] : [], // Initialize if needed
      isNew: true
    };

    setEvaluation(prev => {
      if (!prev) return prev;
      // Append to the end, reordering happens on delete/submit if necessary
      return {
        ...prev,
        questions: [...prev.questions, newQuestion] 
      };
    });
  };

  const removeQuestion = (index: number) => {
    if (!evaluation) return;

    const allQuestions = [...evaluation.questions];
    const questionToRemove = allQuestions.find((q, idx) => {
        // Find the actual question in the full list corresponding 
        // to the visible index `index`
        let visibleCount = 0;
        for(let i=0; i < allQuestions.length; i++) {
            if (!allQuestions[i].isDeleted) {
                if (visibleCount === index) return true;
                visibleCount++;
            }
        }
        return false;
    });

    if (!questionToRemove) return; // Should not happen

    // Find the real index in the full array
    const realIndex = allQuestions.findIndex(q => q.id === questionToRemove.id);
    
    if (realIndex === -1) return; // Should not happen

    // If it's a new question not saved yet, remove it completely
    if (allQuestions[realIndex].isNew) {
        allQuestions.splice(realIndex, 1);
    } else {
        // Otherwise, mark it as deleted
        allQuestions[realIndex].isDeleted = true;
    }

    // Re-calculate order for visible questions
    let currentOrder = 1;
    const updatedQuestions = allQuestions.map(q => {
        if (!q.isDeleted) {
            q.order = currentOrder++;
        }
        return q;
    });

    setEvaluation(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        questions: updatedQuestions
      };
    });
  };

  const validateDates = (start: string, end: string) => {
    if (!start || !end) return false;
    return new Date(end) > new Date(start);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!evaluation) return;
    
    if (!validateDates(evaluation.start_date, evaluation.end_date)) {
      toast({
        title: "Error",
        description: "La fecha de fin debe ser posterior a la fecha de inicio.",
        variant: "destructive",
      });
      return;
    }
    
    setLoading(true);

    try {
      const questionsPayload = evaluation.questions
        .filter(q => !(q.isNew && q.isDeleted))
        .map(q => {
          const needsOptions = ['multiple_choice', 'single_choice', 'checkbox'].includes(q.type);
          
          // Prepare options specifically for the payload
          const payloadOptions: any = {
            type: q.type // Siempre incluir el tipo en las opciones
          };
          
          // Incluir choices solo si el tipo lo necesita y hay opciones definidas
          if (needsOptions && q.answerOptions && q.answerOptions.length > 0) {
            payloadOptions.choices = q.answerOptions.map(opt => ({ 
              id: opt.id, 
              text: opt.text 
            }));
          }

          return {
            // Aligning keys with the expected type from the linter error
            id: q.id,
            text: q.text,                 // Renamed from question_text
            type: q.type,                 // Moved type to top level
            required: q.required,         // Renamed from is_required
            weight: q.weight,
            order: q.order,               // Renamed from order_index
            category: q.category,
            options: payloadOptions,      // Incluir opciones con la estructura correcta
            isNew: q.isNew && !q.isDeleted ? true : undefined,
            isDeleted: q.isDeleted ? true : undefined,
          };
      });

      // Now the type should better match what updateEvaluation expects
      const { data, error } = await updateEvaluation({
        id: evaluation.id,
        title: evaluation.title,
        description: evaluation.description,
        type: evaluation.type,
        is_anonymous: evaluation.is_anonymous,
        settings: evaluation.settings,
        start_date: evaluation.start_date,
        end_date: evaluation.end_date,
        questions: questionsPayload // Pass the correctly structured payload
      });
      
      if (error) {
        throw error;
      }

      toast({
        title: "Evaluación actualizada",
        description: "Los cambios han sido guardados exitosamente.",
      });
      
      // Optionally refetch or update state to remove 'isNew', 'isDeleted' flags after successful save
       router.push(`/evaluations/${evaluation.id}`); // Or refetch the data

    } catch (error: any) {
      console.error("Error al actualizar evaluación:", error);
      toast({
        title: "Error",
        description: error.message || "No se pudo actualizar la evaluación. Por favor, intente nuevamente.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading && !evaluation) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-muted-foreground">Cargando evaluación...</p>
      </div>
    );
  }

  if (!evaluation) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <p className="text-lg">No se encontró la evaluación solicitada</p>
        <Button onClick={() => router.push("/evaluations")}>Volver a evaluaciones</Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            onClick={() => router.back()}
            className="gap-2"
          >
            <ArrowLeft className="w-4 h-4" /> Volver
          </Button>
          <h1 className="text-3xl font-bold">Editar Evaluación</h1>
        </div>
        <div className="flex items-center gap-2">
          <span className={`px-2 py-1 rounded-full text-xs ${
            evaluation.status === 'completed' ? 'bg-green-100 text-green-700' :
            evaluation.status === 'in_progress' ? 'bg-blue-100 text-blue-700' :
            evaluation.status === 'draft' ? 'bg-yellow-100 text-yellow-700' :
            'bg-gray-100 text-gray-700'
          }`}>
            {evaluation.status === 'completed' ? 'Completada' :
             evaluation.status === 'in_progress' ? 'En Progreso' :
             evaluation.status === 'draft' ? 'Borrador' : evaluation.status}
          </span>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Información General</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="title">Título</Label>
                <Input
                  id="title"
                  value={evaluation.title}
                  onChange={(e) => handleChange("title", e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="type">Tipo de Evaluación</Label>
                <Select
                  value={evaluation.type}
                  onValueChange={(value) => handleChange("type", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    {evaluationTypes.map((type) => (
                      <SelectItem key={type.id} value={type.id}>
                        {type.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="description">Descripción</Label>
                <Textarea
                  id="description"
                  value={evaluation.description}
                  onChange={(e) => handleChange("description", e.target.value)}
                  rows={3}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="start_date">Fecha de Inicio</Label>
                <Input
                  id="start_date"
                  type="datetime-local"
                  value={evaluation.start_date.slice(0, 16)}
                  onChange={(e) => handleChange("start_date", e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="end_date">Fecha de Fin</Label>
                <Input
                  id="end_date"
                  type="datetime-local"
                  value={evaluation.end_date.slice(0, 16)}
                  onChange={(e) => handleChange("end_date", e.target.value)}
                  required
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Configuración</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="is_anonymous">Respuestas Anónimas</Label>
                <Switch
                  id="is_anonymous"
                  checked={evaluation.is_anonymous}
                  onCheckedChange={(checked) => handleChange("is_anonymous", checked)}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="allow_partial">Guardar Parcialmente</Label>
                <Switch
                  id="allow_partial"
                  checked={evaluation.settings.allow_partial_save}
                  onCheckedChange={(checked) => handleChange("settings.allow_partial_save", checked)}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="require_comments">Requerir Comentarios</Label>
                <Switch
                  id="require_comments"
                  checked={evaluation.settings.require_comments}
                  onCheckedChange={(checked) => handleChange("settings.require_comments", checked)}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="show_progress">Mostrar Progreso</Label>
                <Switch
                  id="show_progress"
                  checked={evaluation.settings.show_progress}
                  onCheckedChange={(checked) => handleChange("settings.show_progress", checked)}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Preguntas</CardTitle>
            <Button type="button" onClick={addQuestion} className="gap-2">
              <Plus className="w-4 h-4" /> Agregar Pregunta
            </Button>
          </CardHeader>
          <CardContent className="space-y-6">
            {evaluation.questions
              .filter(q => !q.isDeleted)
              .sort((a, b) => a.order - b.order)
              .map((question, visibleIndex) => {
                // Find the original index in the full array if needed for handlers
                const originalIndex = evaluation.questions.findIndex(q => q.id === question.id);

                // Determine if the current question type requires answer options
                const needsOptions = ['multiple_choice', 'single_choice', 'checkbox'].includes(question.type);

                return (
                  <div 
                    key={question.id}
                    className={`p-4 border rounded-lg space-y-4 ${question.isNew ? 'border-green-300 bg-green-50' : ''}`}
                  >
                    <div className="flex items-center justify-between">
                      <h3 className="font-medium">
                        Pregunta {question.order}
                        {question.isNew && <span className="ml-2 text-xs text-green-600">(Nueva)</span>}
                      </h3>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeQuestion(visibleIndex)}
                      >
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2 md:col-span-2">
                        <Label htmlFor={`q-${question.id}-text`}>Texto de la Pregunta</Label>
                        <Input
                          id={`q-${question.id}-text`}
                          value={question.text}
                          onChange={(e) => handleQuestionChange(originalIndex, "text", e.target.value)}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor={`q-${question.id}-type`}>Tipo de Pregunta</Label>
                        <Select
                          value={question.type}
                          onValueChange={(value) => handleQuestionChange(originalIndex, "type", value)}
                        >
                          <SelectTrigger id={`q-${question.id}-type`}>
                            <SelectValue placeholder="Seleccionar tipo" />
                          </SelectTrigger>
                          <SelectContent>
                            {questionTypes.map((type) => (
                              <SelectItem key={type.id} value={type.id}>
                                {type.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor={`q-${question.id}-category`}>Categoría</Label>
                        <Input
                          id={`q-${question.id}-category`}
                          value={question.category || ""}
                          onChange={(e) => handleQuestionChange(originalIndex, "category", e.target.value)}
                          placeholder="Ej: seguridad, calidad, etc."
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor={`q-${question.id}-weight`}>Peso</Label>
                        <Input
                          id={`q-${question.id}-weight`}
                          type="number"
                          min="0"
                          max="1"
                          step="0.1"
                          value={question.weight}
                          onChange={(e) => handleQuestionChange(originalIndex, "weight", parseFloat(e.target.value) || 0)}
                        />
                      </div>
                      <div className="flex items-center justify-between pt-4">
                        <Label htmlFor={`q-${question.id}-required`}>Obligatoria</Label>
                        <Switch
                          id={`q-${question.id}-required`}
                          checked={question.required}
                          onCheckedChange={(checked) => handleQuestionChange(originalIndex, "required", checked)}
                        />
                      </div>

                      {needsOptions && (
                        <div className="space-y-3 md:col-span-2 pt-4">
                          <Label className="font-medium">Opciones de Respuesta</Label>
                          {question.answerOptions?.map((option, optionIndex) => (
                            <div key={option.id} className="flex items-center gap-2">
                              <Input
                                value={option.text}
                                onChange={(e) => {
                                  const updatedOptions = [...(question.answerOptions || [])];
                                  updatedOptions[optionIndex] = { ...option, text: e.target.value };
                                  handleQuestionChange(originalIndex, "answerOptions", updatedOptions);
                                }}
                                placeholder={`Opción ${optionIndex + 1}`}
                                required
                              />
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => {
                                  const updatedOptions = [...(question.answerOptions || [])];
                                  updatedOptions.splice(optionIndex, 1);
                                  handleQuestionChange(originalIndex, "answerOptions", updatedOptions);
                                }}
                                disabled={question.answerOptions && question.answerOptions.length <= 1}
                              >
                                <Trash2 className="w-4 h-4 text-destructive" />
                              </Button>
                            </div>
                          ))}
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              const updatedOptions = [...(question.answerOptions || []), { id: uuidv4(), text: '' }];
                              handleQuestionChange(originalIndex, "answerOptions", updatedOptions);
                            }}
                            className="gap-1 mt-2"
                          >
                            <Plus className="w-3 h-3" /> Agregar Opción
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            
            {evaluation.questions.filter(q => !q.isDeleted).length === 0 && (
              <div className="p-4 border rounded-lg border-dashed text-center">
                <p className="text-muted-foreground">
                  No hay preguntas activas. Haz clic en "Agregar Pregunta" para comenzar.
                </p>
              </div>
            )}
          </CardContent>
          <CardFooter>
            <Button type="submit" disabled={loading} className="ml-auto gap-2">
              <Save className="w-4 h-4" />
              {loading ? "Guardando..." : "Guardar Cambios"}
            </Button>
          </CardFooter>
        </Card>
      </form>
    </div>
  );
}