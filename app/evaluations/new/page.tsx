"use client";

import { useState } from "react";
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
import { createEvaluation } from "@/lib/services/evaluation-service";
import { v4 as uuidv4 } from 'uuid';

interface Question {
  id: string;
  type: string;
  text: string;
  required: boolean;
  weight: number;
  order: number;
  options: any;
  category?: string;
}

export default function NewEvaluation() {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [evaluation, setEvaluation] = useState({
    title: "",
    description: "",
    type: "performance",
    start_date: "",
    end_date: "",
    is_anonymous: false,
    settings: {
      allow_partial_save: true,
      require_comments: false,
      show_progress: true,
      notify_on_submit: true
    },
    questions: [] as Question[]
  });

  const handleChange = (field: string, value: any) => {
    if (field.includes('.')) {
      const [parent, child] = field.split('.');
      setEvaluation(prev => {
        const parentObj = prev[parent as keyof typeof prev];
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
      setEvaluation(prev => ({
        ...prev,
        [field]: value
      }));
    }
  };

  const handleQuestionChange = (index: number, field: string, value: any) => {
    const newQuestions = [...evaluation.questions];
    newQuestions[index] = {
      ...newQuestions[index],
      [field]: value
    };

    setEvaluation(prev => ({
      ...prev,
      questions: newQuestions
    }));
  };

  const addQuestion = () => {
    const newQuestion: Question = {
      id: uuidv4(),
      type: 'rating_5',
      text: '',
      required: true,
      weight: 1.0,
      order: evaluation.questions.length + 1,
      category: 'general',
      options: {}
    };

    setEvaluation(prev => ({
      ...prev,
      questions: [...prev.questions, newQuestion]
    }));
  };

  const removeQuestion = (index: number) => {
    const newQuestions = evaluation.questions.filter((_, i) => i !== index);
    setEvaluation(prev => ({
      ...prev,
      questions: newQuestions
    }));
  };

  const validateDates = (start: string, end: string) => {
    if (!start || !end) return true;
    return new Date(end) > new Date(start);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!evaluation.title.trim()) {
      toast({
        title: "Error",
        description: "El título de la evaluación es obligatorio.",
        variant: "destructive",
      });
      return;
    }
    
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
      // Usar el servicio para crear la evaluación
      const { data, error } = await createEvaluation(evaluation);
      
      if (error) {
        throw error;
      }

      toast({
        title: "Evaluación creada",
        description: "La evaluación ha sido creada exitosamente.",
      });

      router.push("/evaluations");
    } catch (error: any) {
      console.error("Error al crear evaluación:", error);
      toast({
        title: "Error",
        description: error.message || "No se pudo crear la evaluación. Por favor, intente nuevamente.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Función para formatear las opciones de la pregunta según su tipo
  const getQuestionOptions = (question: Question) => {
    const questionType = questionTypes.find(type => type.id === question.type);
    
    switch (question.type) {
      case 'rating_5':
        return {
          type: 'rating_5',
          min_label: "Muy malo",
          max_label: "Excelente"
        };
      case 'rating_10':
        return {
          type: 'rating_10',
          min_label: "Muy malo",
          max_label: "Excelente"
        };
      case 'yes_no':
        return {
          type: 'yes_no'
        };
      case 'multiple_choice':
        return {
          type: 'multiple_choice',
          choices: ["Opción 1", "Opción 2", "Opción 3"]
        };
      case 'multiple_answer':
        return {
          type: 'multiple_answer',
          choices: ["Opción 1", "Opción 2", "Opción 3"]
        };
      case 'text_short':
        return {
          type: 'text_short'
        };
      case 'text_long':
        return {
          type: 'text_long'
        };
      default:
        return question.options;
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          onClick={() => router.back()}
          className="gap-2"
        >
          <ArrowLeft className="w-4 h-4" /> Volver
        </Button>
        <h1 className="text-3xl font-bold">Nueva Evaluación</h1>
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
                  required
                  value={evaluation.title}
                  onChange={(e) => handleChange("title", e.target.value)}
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
                  value={evaluation.start_date}
                  onChange={(e) => handleChange("start_date", e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="end_date">Fecha de Fin</Label>
                <Input
                  id="end_date"
                  type="datetime-local"
                  value={evaluation.end_date}
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
            {evaluation.questions.length === 0 && (
              <div className="p-4 border rounded-lg border-dashed text-center">
                <p className="text-muted-foreground">
                  No hay preguntas aún. Haz clic en "Agregar Pregunta" para comenzar.
                </p>
              </div>
            )}
            {evaluation.questions.map((question, index) => (
              <div key={question.id} className="p-4 border rounded-lg space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-medium">Pregunta {index + 1}</h3>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeQuestion(index)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2 md:col-span-2">
                    <Label>Texto de la Pregunta</Label>
                    <Input
                      value={question.text}
                      onChange={(e) => handleQuestionChange(index, "text", e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Tipo de Pregunta</Label>
                    <Select
                      value={question.type}
                      onValueChange={(value) => handleQuestionChange(index, "type", value)}
                    >
                      <SelectTrigger>
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
                    <Label>Categoría</Label>
                    <Input
                      value={question.category || ""}
                      onChange={(e) => handleQuestionChange(index, "category", e.target.value)}
                      placeholder="Ej: seguridad, calidad, etc."
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Peso</Label>
                    <Input
                      type="number"
                      min="0"
                      max="1"
                      step="0.1"
                      value={question.weight}
                      onChange={(e) => handleQuestionChange(index, "weight", parseFloat(e.target.value))}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label>Obligatoria</Label>
                    <Switch
                      checked={question.required}
                      onCheckedChange={(checked) => handleQuestionChange(index, "required", checked)}
                    />
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
          <CardFooter>
            <Button type="submit" disabled={loading} className="ml-auto gap-2">
              <Save className="w-4 h-4" />
              {loading ? "Guardando..." : "Crear Evaluación"}
            </Button>
          </CardFooter>
        </Card>
      </form>
    </div>
  );
}