"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { EvaluationReport } from '@/lib/report-generator';
import { mockEvaluations } from '@/lib/supabase/mock-data';
import { useToast } from "@/components/ui/use-toast";
import { PDFViewer } from '@react-pdf/renderer';

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

export default function PDFReportPage({ params }: { params: { id: string } }) {
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
    <div className="fixed inset-0 bg-white">
      <PDFViewer style={{ width: '100%', height: '100%' }}>
        <EvaluationReport evaluation={adaptEvaluationForReport(evaluation)} />
      </PDFViewer>
    </div>
  );
} 