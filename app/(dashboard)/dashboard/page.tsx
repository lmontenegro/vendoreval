"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import {
  BarChart3,
  ClipboardList,
  Users,
  AlertCircle,
  Plus,
  ArrowUpRight,
} from "lucide-react";

export default function Dashboard() {
  const router = useRouter();

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">
            Bienvenido al panel de control de evaluación de proveedores
          </p>
        </div>
        <Button 
          className="gap-2"
          onClick={() => router.push('/evaluations/new')}
        >
          <Plus className="w-4 h-4" /> Nueva Evaluación
        </Button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              Evaluaciones Activas
            </CardTitle>
            <BarChart3 className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">12</div>
            <p className="text-xs text-muted-foreground">
              +2 desde el último mes
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              Proveedores Registrados
            </CardTitle>
            <Users className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">48</div>
            <p className="text-xs text-muted-foreground">
              +5 desde el último mes
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              Evaluaciones Completadas
            </CardTitle>
            <ClipboardList className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">89</div>
            <p className="text-xs text-muted-foreground">
              +12 desde el último mes
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              Acciones Pendientes
            </CardTitle>
            <AlertCircle className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">7</div>
            <p className="text-xs text-muted-foreground">
              -3 desde el último mes
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Evaluations */}
      <Card>
        <CardHeader>
          <CardTitle>Evaluaciones Recientes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[
              {
                supplier: "Proveedor A",
                status: "En Progreso",
                score: "85%",
                date: "2024-01-22",
              },
              {
                supplier: "Proveedor B",
                status: "Completada",
                score: "92%",
                date: "2024-01-20",
              },
              {
                supplier: "Proveedor C",
                status: "Pendiente",
                score: "-",
                date: "2024-01-19",
              },
            ].map((evaluation, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div className="space-y-1">
                  <p className="font-medium">{evaluation.supplier}</p>
                  <p className="text-sm text-muted-foreground">
                    {evaluation.date}
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <span
                    className={`text-sm ${
                      evaluation.status === "Completada"
                        ? "text-green-600"
                        : evaluation.status === "En Progreso"
                        ? "text-blue-600"
                        : "text-orange-600"
                    }`}
                  >
                    {evaluation.status}
                  </span>
                  <span className="font-medium">{evaluation.score}</span>
                  <Button variant="ghost" size="icon">
                    <ArrowUpRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}