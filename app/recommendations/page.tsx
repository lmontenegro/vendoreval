"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MessageSquareWarning, CheckCircle2, Clock } from "lucide-react";
import { RecommendationDetails } from "@/components/ui/recommendation-details";
import { useToast } from "@/components/ui/use-toast";

// Mock data with extended details
const recommendations = [
  {
    id: "rec-1",
    title: "Mejorar tiempos de entrega",
    description: "Implementar sistema de seguimiento en tiempo real para optimizar la cadena de suministro",
    supplier: "Proveedor A",
    status: "pending",
    priority: "Alta",
    date: "2024-01-22",
    timeline: "3 meses",
    metrics: [
      { label: "Tiempo promedio de entrega", value: "48h", change: -15 },
      { label: "Tasa de entregas a tiempo", value: "85%", change: 5 },
      { label: "Satisfacción del cliente", value: "4.2/5", change: 0.3 }
    ],
    steps: [
      "Evaluar sistemas de seguimiento disponibles",
      "Seleccionar e implementar solución piloto",
      "Capacitar al personal en el nuevo sistema",
      "Realizar pruebas y ajustes",
      "Despliegue completo"
    ],
    benefits: [
      "Reducción en tiempos de entrega",
      "Mayor visibilidad de la cadena de suministro",
      "Mejora en la satisfacción del cliente",
      "Optimización de rutas y recursos"
    ],
    relatedRecommendations: [
      { id: "rec-4", title: "Actualizar flota de vehículos", status: "pending" },
      { id: "rec-5", title: "Implementar sistema de gestión de almacén", status: "in_progress" }
    ]
  },
  {
    id: "rec-2",
    title: "Actualizar certificaciones",
    description: "Renovar y obtener certificaciones clave para mantener competitividad en el mercado",
    supplier: "Proveedor B",
    status: "in_progress",
    priority: "Media",
    date: "2024-01-20",
    timeline: "6 meses",
    metrics: [
      { label: "Certificaciones vigentes", value: "4/6", change: 0 },
      { label: "Cumplimiento normativo", value: "92%", change: 2 },
      { label: "Auditorías aprobadas", value: "8/10", change: 1 }
    ],
    steps: [
      "Identificar certificaciones requeridas",
      "Preparar documentación necesaria",
      "Realizar auditorías internas",
      "Programar certificaciones oficiales",
      "Implementar mejoras sugeridas"
    ],
    benefits: [
      "Mayor acceso a mercados internacionales",
      "Mejora en la percepción de calidad",
      "Cumplimiento de requisitos regulatorios",
      "Ventaja competitiva en licitaciones"
    ],
    relatedRecommendations: [
      { id: "rec-6", title: "Implementar sistema de gestión de calidad", status: "completed" }
    ]
  },
  {
    id: "rec-3",
    title: "Optimizar costos operativos",
    description: "Análisis y reducción de costos operativos para mejorar la eficiencia",
    supplier: "Proveedor C",
    status: "completed",
    priority: "Baja",
    date: "2024-01-19",
    timeline: "2 meses",
    metrics: [
      { label: "Costos operativos", value: "$125k", change: -8 },
      { label: "Eficiencia energética", value: "78%", change: 12 },
      { label: "Desperdicios", value: "5%", change: -3 }
    ],
    steps: [
      "Realizar auditoría de costos",
      "Identificar áreas de mejora",
      "Implementar medidas de ahorro",
      "Monitorear resultados",
      "Ajustar estrategias según necesidad"
    ],
    benefits: [
      "Reducción de costos operativos",
      "Mayor eficiencia en procesos",
      "Mejora en márgenes de beneficio",
      "Sostenibilidad a largo plazo"
    ],
    relatedRecommendations: [
      { id: "rec-7", title: "Implementar programa de mantenimiento preventivo", status: "in_progress" },
      { id: "rec-8", title: "Optimizar rutas de distribución", status: "pending" }
    ]
  }
];

export default function Recommendations() {
  const { toast } = useToast();

  const handleStatusChange = (id: string, status: string) => {
    toast({
      title: "Estado actualizado",
      description: "El estado de la recomendación ha sido actualizado.",
    });
  };

  const handleCommentAdd = (id: string, comment: string) => {
    toast({
      title: "Comentario agregado",
      description: "El comentario ha sido agregado exitosamente.",
    });
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Recomendaciones</h1>
        <p className="text-muted-foreground">
          Seguimiento de mejoras y recomendaciones para proveedores
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recomendaciones Activas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {recommendations.map((recommendation) => (
              <div
                key={recommendation.id}
                className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <MessageSquareWarning className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">{recommendation.supplier}</p>
                    <p className="text-sm text-muted-foreground">
                      {recommendation.title}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Plazo: {recommendation.timeline}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <span
                    className={`px-2 py-1 rounded-full text-xs ${
                      recommendation.priority === "Alta"
                        ? "bg-red-100 text-red-700"
                        : recommendation.priority === "Media"
                        ? "bg-yellow-100 text-yellow-700"
                        : "bg-blue-100 text-blue-700"
                    }`}
                  >
                    {recommendation.priority}
                  </span>
                  <div className="flex items-center gap-1">
                    {recommendation.status === "completed" ? (
                      <CheckCircle2 className="w-4 h-4 text-green-600" />
                    ) : recommendation.status === "in_progress" ? (
                      <Clock className="w-4 h-4 text-blue-600" />
                    ) : (
                      <MessageSquareWarning className="w-4 h-4 text-orange-600" />
                    )}
                    <span className="text-sm">{recommendation.status}</span>
                  </div>
                  <RecommendationDetails
                    recommendation={recommendation}
                    onStatusChange={handleStatusChange}
                    onCommentAdd={handleCommentAdd}
                  />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}