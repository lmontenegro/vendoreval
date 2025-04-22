"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, FileDown, FileText } from "lucide-react";
import { PDFDownloadLink, BlobProvider } from '@react-pdf/renderer';
import { EvaluationReport } from '@/lib/report-generator';
import { mockEvaluations } from '@/lib/supabase/mock-data';
import { useToast } from "@/components/ui/use-toast";
import Link from 'next/link';

const adaptEvaluationForReport = (evaluation: typeof mockEvaluations[0]) => ({
  id: evaluation.id,
  title: evaluation.title,
  supplier: evaluation.evaluator_name,
  date: evaluation.created_at,
  overallScore: evaluation.score || 0,
  categories: evaluation.categories.map(cat => ({
    name: cat.name,
    score: cat.score || 0,
    maxScore: 100,
    findings: [cat.comments]
  })),
  recommendations: [],
  risks: []
});

export default function EvaluationReportPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { toast } = useToast();
  const [evaluation, setEvaluation] = useState(mockEvaluations.find(e => e.id === params.id));

  useEffect(() => {
    if (!evaluation) {
      toast({
        title: "Error",
        description: "No se encontró la evaluación",
        variant: "destructive",
      });
      router.push("/evaluations");
    }
  }, [evaluation, router, toast]);

  if (!evaluation) return null;

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
          <h1 className="text-3xl font-bold">Reporte de Evaluación</h1>
        </div>
        <div className="flex gap-2">
          <BlobProvider document={<EvaluationReport evaluation={adaptEvaluationForReport(evaluation)} />}>
            {({ loading, url }) => (
              <Button 
                disabled={loading} 
                className="gap-2"
                onClick={() => {
                  if (url) {
                    const link = document.createElement('a');
                    link.href = url;
                    link.download = `evaluacion-${params.id}.pdf`;
                    link.click();
                  }
                }}
              >
                <FileDown className="w-4 h-4" />
                {loading ? "Generando..." : "Descargar PDF"}
              </Button>
            )}
          </BlobProvider>
          <Link href={`/evaluations/${params.id}/report/pdf`}>
            <Button variant="outline" className="gap-2">
              <FileText className="w-4 h-4" />
              Ver PDF
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Resumen Ejecutivo</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground">Evaluador</p>
                <p className="font-medium">{evaluation.evaluator_name}</p>
                <p className="text-sm text-muted-foreground mt-1">{evaluation.evaluator_role}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Calificación General</p>
                <p className="font-medium">{evaluation.score !== null ? `${evaluation.score}%` : 'Pendiente'}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Estado</p>
                <p className="font-medium capitalize">{evaluation.status}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Categorías Evaluadas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {evaluation.categories.map((category, index) => (
                <div key={index}>
                  <p className="text-sm text-muted-foreground">
                    {category.name} (Peso: {category.weight * 100}%)
                  </p>
                  <p className="font-medium">
                    {category.score !== null ? `${category.score}%` : 'Pendiente'}
                  </p>
                  {category.comments && (
                    <p className="text-sm mt-1">{category.comments}</p>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Comentarios</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {evaluation.comments.map((comment, index) => (
                <div key={index} className="p-4 border rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <p className="font-medium">{comment.author}</p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(comment.date).toLocaleDateString()}
                    </p>
                  </div>
                  <p className="text-sm">{comment.text}</p>
                </div>
              ))}
              {evaluation.comments.length === 0 && (
                <p className="text-sm text-muted-foreground">No hay comentarios registrados</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}