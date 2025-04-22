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
import { ArrowLeft, Edit, FileText } from "lucide-react";
import { getEvaluationDetails } from "@/lib/services/evaluation-service";
import { useToast } from "@/components/ui/use-toast";

export default function EvaluationDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [evaluation, setEvaluation] = useState<any>(null);

  useEffect(() => {
    const fetchEvaluation = async () => {
      try {
        const { data, error } = await getEvaluationDetails(params.id);
        
        if (error || !data) {
          throw error || new Error("No se encontró la evaluación");
        }
        
        setEvaluation(data);
      } catch (error: any) {
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

  if (loading) {
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
          <h1 className="text-3xl font-bold">{evaluation.title}</h1>
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Información General</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="font-semibold">Descripción</h3>
                <p className="text-muted-foreground">{evaluation.description || "Sin descripción"}</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h3 className="font-semibold">Tipo</h3>
                  <p className="text-muted-foreground">{evaluation.type || "No especificado"}</p>
                </div>
                <div>
                  <h3 className="font-semibold">Proveedor</h3>
                  <p className="text-muted-foreground">{evaluation.vendor_name || "No asignado"}</p>
                </div>
                <div>
                  <h3 className="font-semibold">Fecha de Inicio</h3>
                  <p className="text-muted-foreground">
                    {new Date(evaluation.start_date).toLocaleDateString('es-ES', {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                </div>
                <div>
                  <h3 className="font-semibold">Fecha de Fin</h3>
                  <p className="text-muted-foreground">
                    {new Date(evaluation.end_date).toLocaleDateString('es-ES', {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Preguntas</CardTitle>
            </CardHeader>
            <CardContent>
              {evaluation.questions && evaluation.questions.length > 0 ? (
                <div className="space-y-4">
                  {evaluation.questions.map((question: any, index: number) => (
                    <div key={question.id} className="p-4 border rounded-lg">
                      <h3 className="font-medium">
                        {index + 1}. {question.question_text}
                        {question.is_required && <span className="text-red-500 ml-1">*</span>}
                      </h3>
                      <div className="mt-2 text-sm text-muted-foreground">
                        <p>Tipo: {question.options?.type || "No especificado"}</p>
                        {question.category && <p>Categoría: {question.category}</p>}
                        <p>Peso: {question.weight || 1}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-4">
                  <p className="text-muted-foreground">Sin preguntas definidas</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Acciones</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button 
                variant="outline" 
                className="w-full gap-2"
                onClick={() => router.push(`/evaluations/${params.id}/edit`)}
              >
                <Edit className="w-4 h-4" /> Editar Evaluación
              </Button>
              <Button 
                variant="outline" 
                className="w-full gap-2"
                onClick={() => router.push(`/evaluations/${params.id}/report`)}
              >
                <FileText className="w-4 h-4" /> Ver Reporte
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Configuración</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between">
                <span>Respuestas Anónimas</span>
                <span>{evaluation.is_anonymous ? "Sí" : "No"}</span>
              </div>
              {evaluation.settings && (
                <>
                  <div className="flex justify-between">
                    <span>Guardar Parcialmente</span>
                    <span>{evaluation.settings.allow_partial_save ? "Permitido" : "No permitido"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Requerir Comentarios</span>
                    <span>{evaluation.settings.require_comments ? "Sí" : "No"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Mostrar Progreso</span>
                    <span>{evaluation.settings.show_progress ? "Sí" : "No"}</span>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
} 