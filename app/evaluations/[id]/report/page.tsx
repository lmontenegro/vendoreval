"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, FileDown, Printer } from "lucide-react";
import { PDFDownloadLink } from '@react-pdf/renderer';
import { EvaluationReport } from '@/lib/report-generator';

// Mock evaluation data
const mockEvaluation = {
  id: "eval-1",
  title: "Evaluación Anual 2024",
  supplier: "Proveedor A",
  date: new Date().toISOString(),
  overallScore: 85,
  categories: [
    {
      name: "Calidad",
      score: 90,
      maxScore: 100,
      findings: [
        "Excelente control de calidad",
        "Documentación completa",
      ],
    },
    {
      name: "Entregas",
      score: 80,
      maxScore: 100,
      findings: [
        "Algunas demoras menores",
        "Buena comunicación de retrasos",
      ],
    },
  ],
  recommendations: [
    {
      priority: "Alta",
      text: "Implementar sistema de seguimiento en tiempo real",
      timeline: "3 meses",
    },
    {
      priority: "Media",
      text: "Mejorar documentación de procesos",
      timeline: "6 meses",
    },
  ],
  risks: [
    {
      severity: "Alta",
      description: "Dependencia crítica en componentes clave",
      impact: "Posible interrupción de la cadena de suministro",
    },
    {
      severity: "Media",
      description: "Certificaciones próximas a vencer",
      impact: "Cumplimiento regulatorio en riesgo",
    },
  ],
};

export default function EvaluationReportPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

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
          <PDFDownloadLink
            document={<EvaluationReport evaluation={mockEvaluation} />}
            fileName={`evaluacion-${params.id}.pdf`}
          >
            {({ loading }) => (
              <Button disabled={loading} className="gap-2">
                <FileDown className="w-4 h-4" />
                {loading ? "Generando..." : "Descargar PDF"}
              </Button>
            )}
          </PDFDownloadLink>
        </div>
      </div>

      {/* Preview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Resumen Ejecutivo</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground">Proveedor</p>
                <p className="font-medium">{mockEvaluation.supplier}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Calificación General</p>
                <p className="font-medium">{mockEvaluation.overallScore}%</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recomendaciones Principales</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {mockEvaluation.recommendations.map((rec, index) => (
                <div key={index}>
                  <p className="text-sm text-muted-foreground">
                    Prioridad {rec.priority}
                  </p>
                  <p className="font-medium">{rec.text}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Advertencias de Riesgo</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {mockEvaluation.risks.map((risk, index) => (
                <div key={index} className="p-4 border rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <p className="font-medium">Severidad: {risk.severity}</p>
                  </div>
                  <p className="text-sm text-muted-foreground mb-2">
                    {risk.description}
                  </p>
                  <p className="text-sm">
                    <span className="font-medium">Impacto:</span> {risk.impact}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}