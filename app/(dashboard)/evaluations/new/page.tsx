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
import { createEvaluation } from "@/lib/services/evaluation-service";
import { v4 as uuidv4 } from 'uuid';
import { VendorSelector } from "@/components/evaluations/VendorSelector";

// --- Interfaces Locales (Asegurarse que coincidan con el estado) ---
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
  options: any; // Podríamos tipar esto mejor si conocemos la estructura
  // Añadir propiedades que sí existen en el estado:
  answerOptions?: AnswerOption[];
  isDeleted?: boolean; 
  isNew?: boolean; // Aunque no se use en el submit de 'new', puede estar en el estado
}

interface Evaluation {
  id: string; // Aunque se genera en el backend, puede inicializarse en el estado
  title: string;
  description: string;
  type: string;
  start_date: string;
  end_date: string;
  status?: string; // Status se define en backend
  is_anonymous: boolean;
  settings: {
    allow_partial_save: boolean;
    require_comments: boolean;
    show_progress: boolean;
    notify_on_submit: boolean;
  };
  vendor_ids: string[];
  questions: Question[];
  metadata?: any;
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
    vendor_ids: [] as string[],
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

  const handleVendorSelect = (vendorIds: string[]) => {
    // Garantizar que vendor_ids es siempre un array válido
    const validIds = Array.isArray(vendorIds) ? vendorIds : [];

    setEvaluation(prev => ({
      ...prev,
      vendor_ids: validIds
    }));
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
      // Construir el payload a partir del estado 'evaluation'
      const payload = {
        title: evaluation.title,
        description: evaluation.description,
        type: evaluation.type,
        start_date: evaluation.start_date,
        end_date: evaluation.end_date,
        is_anonymous: evaluation.is_anonymous,
        settings: evaluation.settings,
        vendor_ids: evaluation.vendor_ids,
        questions: evaluation.questions
          .filter(q => !q.isDeleted) // No enviar preguntas marcadas para borrar si son nuevas
          .map(q => {
            const needsOptions = ['multiple_choice', 'single_choice', 'checkbox'].includes(q.type);
            // Preparar opciones para el payload, filtrando textos vacíos
            const answerOptions = (q.answerOptions || [])
              .filter((opt: AnswerOption) => opt.text && opt.text.trim() !== '')
              .map((opt: AnswerOption) => ({ id: opt.id, text: opt.text.trim() }));

            return {
              id: q.id, // El backend manejará si es nuevo o no si se lo indicamos (o genera uno nuevo)
              type: q.type,
              text: q.text,
              required: q.required,
              weight: q.weight,
              order: q.order,
              category: q.category || 'general',
              // Pasar las opciones limpias
              options: { 
                type: q.type, // Incluir tipo dentro de options
                ...(needsOptions && answerOptions.length > 0 ? { choices: answerOptions } : {}) // Incluir choices solo si son necesarias y válidas
              }
              // No necesitamos isNew/isDeleted para la creación inicial
            };
          })
      };
      
      // --- Validaciones (Ej: Fechas, preguntas mínimas, etc.) ---
      if (!validateDates(payload.start_date, payload.end_date)) {
        toast({
          title: "Error de Validación",
          description: "La fecha de fin debe ser posterior a la fecha de inicio.",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }
      if (payload.questions.length === 0) {
        toast({
          title: "Error de Validación",
          description: "Debe agregar al menos una pregunta a la evaluación.",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }
      // Añadir más validaciones si es necesario...

      // Llamar a la API POST
      const response = await fetch('/api/evaluations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload), // Enviar el payload construido
      });

      // Manejar la respuesta de la API
      if (!response.ok) {
        let errorData = { error: `Error ${response.status}` };
        try {
          if (response.headers.get('content-type')?.includes('application/json')) {
            errorData = await response.json();
          }
        } catch (parseError) {
          console.error("Error parsing error response:", parseError);
        }
        // Lanzar error con mensaje de la API
        throw new Error(errorData.error || `Error al crear la evaluación`); 
      }
      
      // Obtener ID de la respuesta (si la API lo devuelve en 'data.id')
      const { data: responseData } = await response.json();
      const newEvaluationId = responseData?.id; // Asumiendo que la API devuelve { data: { id: ... } }

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

  // Agregar useEffect para debugging
  useEffect(() => {
    console.log('vendor_ids actualizado:', evaluation.vendor_ids);
  }, [evaluation.vendor_ids]);

  return (
    <div className="container py-8">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => router.back()}
            aria-label="Volver"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-2xl font-bold">Nueva Evaluación</h1>
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
                  type="date"
                  value={evaluation.start_date}
                  onChange={(e) => handleChange("start_date", e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="end_date">Fecha de Fin</Label>
                <Input
                  id="end_date"
                  type="date"
                  value={evaluation.end_date}
                  onChange={(e) => handleChange("end_date", e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>Asignar Proveedores</Label>
                <VendorSelector
                  selectedVendorIds={evaluation.vendor_ids || []}
                  onSelect={handleVendorSelect}
                  adminMode={false}
                  disabled={loading}
                />
                <p className="text-sm text-muted-foreground">
                  Selecciona los proveedores que participarán en esta evaluación
                </p>
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
                  No hay preguntas aún. Haz clic en Agregar Pregunta para comenzar.
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