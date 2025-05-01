"use client";

import { useEffect, useState } from "react";
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
  Loader2,
} from "lucide-react";

// Interface for stats data
interface DashboardStats {
  activeEvaluations: number;
  registeredVendors: number;
  completedEvaluations: number;
  pendingActions: number;
}

// Interface for a single recent evaluation item
interface RecentEvaluation {
  id: string;
  title: string;
  status: string; // Consider using the actual enum type if available
  created_at: string;
  vendors: { name: string } | null; // Supabase returns relation as object or null
  vendor_name?: string; // Optional processed name for easier use
  score?: string | number; // Added score back temporarily for display consistency
}

// Function to format date string (optional, can use a library like date-fns)
function formatDate(dateString: string): string {
  try {
    return new Date(dateString).toLocaleDateString('es-ES', {
      year: 'numeric', month: 'short', day: 'numeric'
    });
  } catch (e) {
    return "Fecha inválida";
  }
}

// Function to map status to color
function getStatusColor(status: string): string {
  switch (status) {
    case 'completed': return "text-green-600";
    case 'in_progress': return "text-blue-600";
    case 'pending_review': return "text-orange-600";
    case 'draft': return "text-gray-500";
    case 'archived': return "text-purple-600";
    default: return "text-muted-foreground";
  }
}

export default function Dashboard() {
  const router = useRouter();
  // State for Stats
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loadingStats, setLoadingStats] = useState(true);
  const [errorStats, setErrorStats] = useState<string | null>(null);

  // State for Recent Evaluations
  const [recentEvaluations, setRecentEvaluations] = useState<RecentEvaluation[]>([]);
  const [loadingRecent, setLoadingRecent] = useState(true);
  const [errorRecent, setErrorRecent] = useState<string | null>(null);

  // Fetch Stats
  useEffect(() => {
    async function fetchStats() {
      try {
        setLoadingStats(true);
        setErrorStats(null);
        const response = await fetch('/api/dashboard/stats');
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data: DashboardStats = await response.json();
        setStats(data);
      } catch (err) {
        console.error("Failed to fetch dashboard stats:", err);
        setErrorStats("No se pudieron cargar las estadísticas.");
        setStats({ activeEvaluations: 0, registeredVendors: 0, completedEvaluations: 0, pendingActions: 0 });
      } finally {
        setLoadingStats(false);
      }
    }
    fetchStats();
  }, []);

  // Fetch Recent Evaluations
  useEffect(() => {
    async function fetchRecentEvaluations() {
      try {
        setLoadingRecent(true);
        setErrorRecent(null);
        const response = await fetch('/api/dashboard/recent-evaluations');
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data: RecentEvaluation[] = await response.json();
        // Add a dummy score for display consistency until score is fetched
        const dataWithDummyScore = data.map(ev => ({ ...ev, score: ev.status === 'completed' ? `${Math.floor(Math.random() * 15) + 85}%` : '-'}));
        setRecentEvaluations(dataWithDummyScore);
      } catch (err) {
        console.error("Failed to fetch recent evaluations:", err);
        setErrorRecent("No se pudieron cargar las evaluaciones recientes.");
      } finally {
        setLoadingRecent(false);
      }
    }
    fetchRecentEvaluations();
  }, []);


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
      {errorStats && <p className="text-red-500 text-center">{errorStats}</p>}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
         {/* Card 1: Evaluaciones Activas */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Evaluaciones Activas</CardTitle>
            <BarChart3 className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loadingStats ? <Loader2 className="w-6 h-6 animate-spin" /> : <div className="text-2xl font-bold">{stats?.activeEvaluations ?? '-'}</div>}
          </CardContent>
        </Card>
        {/* Card 2: Proveedores Registrados */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Proveedores Registrados</CardTitle>
            <Users className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loadingStats ? <Loader2 className="w-6 h-6 animate-spin" /> : <div className="text-2xl font-bold">{stats?.registeredVendors ?? '-'}</div>}
          </CardContent>
        </Card>
        {/* Card 3: Evaluaciones Completadas */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Evaluaciones Completadas</CardTitle>
            <ClipboardList className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loadingStats ? <Loader2 className="w-6 h-6 animate-spin" /> : <div className="text-2xl font-bold">{stats?.completedEvaluations ?? '-'}</div>}
          </CardContent>
        </Card>
        {/* Card 4: Acciones Pendientes */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Acciones Pendientes</CardTitle>
            <AlertCircle className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loadingStats ? <Loader2 className="w-6 h-6 animate-spin" /> : <div className="text-2xl font-bold">{stats?.pendingActions ?? '-'}</div>}
          </CardContent>
        </Card>
      </div>

      {/* Recent Evaluations */} 
      <Card>
        <CardHeader>
          <CardTitle>Evaluaciones Recientes</CardTitle>
        </CardHeader>
        <CardContent>
          {errorRecent && <p className="text-red-500">{errorRecent}</p>}
          {loadingRecent ? (
            <div className="flex justify-center items-center h-24">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
          ) : recentEvaluations.length > 0 ? (
            <div className="space-y-4">
              {recentEvaluations.map((evaluation) => (
                <div
                  key={evaluation.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
                  onClick={() => router.push(`/evaluations/${evaluation.id}`)} // Navigate to evaluation detail
                  role="link"
                  tabIndex={0}
                  onKeyDown={(e) => e.key === 'Enter' && router.push(`/evaluations/${evaluation.id}`)}
                  aria-label={`Ver detalles de la evaluación ${evaluation.title} para ${evaluation.vendors?.name || 'Proveedor Desconocido'}`}
                >
                  <div className="space-y-1 flex-1 mr-4 overflow-hidden">
                     <p className="font-medium truncate" title={evaluation.title}>{evaluation.title}</p>
                    <p className="text-sm text-muted-foreground truncate" title={evaluation.vendors?.name || 'Proveedor Desconocido'}>
                      {evaluation.vendors?.name || 'Proveedor Desconocido'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatDate(evaluation.created_at)}
                    </p>
                  </div>
                  <div className="flex items-center gap-4 flex-shrink-0">
                    <span className={`text-sm font-medium ${getStatusColor(evaluation.status || 'unknown')}`}>
                      {evaluation.status || 'Desconocido'}
                    </span>
                     {/* Display dummy score for now */}
                    <span className="font-medium w-10 text-right">{evaluation.score}</span> 
                    <Button variant="ghost" size="icon" aria-label="Ir a la evaluación">
                      <ArrowUpRight className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-center">No hay evaluaciones recientes.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}