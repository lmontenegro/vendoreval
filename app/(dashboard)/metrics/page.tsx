"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DatePickerWithRange } from "@/components/ui/date-range-picker";
import { addDays } from "date-fns";
import { DateRange } from "react-day-picker";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { Download } from "lucide-react";

export default function MetricsPage() {
  const [selectedProvider, setSelectedProvider] = useState<string>('all');
  const [category, setCategory] = useState<string>('all');
  const [date, setDate] = useState<DateRange | undefined>({
    from: addDays(new Date(), -30),
    to: new Date(),
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [vendorData, setVendorData] = useState<any[]>([]);
  const [complianceDistribution, setComplianceDistribution] = useState<any>({});
  const [topPerformers, setTopPerformers] = useState<any[]>([]);
  const [debugInfo, setDebugInfo] = useState<any>(null);
  const [globalCompletionRate, setGlobalCompletionRate] = useState<number | undefined>(undefined);
  const [evaluationStatusDistribution, setEvaluationStatusDistribution] = useState<Record<string, number>>({});

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch('/api/admin/metrics');
        if (!res.ok) {
          throw new Error('Error al obtener métricas');
        }
        const data = await res.json();
        if (data.error) {
          setError(data.error);
          setDebugInfo(data.debugInfo);
          return;
        }
        setVendorData(data.vendorData || []);
        setComplianceDistribution(data.complianceDistribution || {});
        setTopPerformers(data.topPerformers || []);
        setGlobalCompletionRate(data.globalCompletionRate);
        setEvaluationStatusDistribution(data.evaluationStatusDistribution || {});
      } catch (err: any) {
        setError(err.message || 'Error al cargar datos');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Transformar datos de proveedores para los gráficos
  const vendorChartData = vendorData?.map(vendor => ({
    name: vendor.name,
    cumplimiento: vendor.compliance,
    entregas: vendor.entregas ?? 0,
    calidad: vendor.calidad ?? 0,
    completedEvaluations: vendor.completedEvaluations ?? 0,
    pendingEvaluations: vendor.pendingEvaluations ?? 0
  })) || [];

  // Ordenar por cumplimiento para el gráfico de barras
  vendorChartData.sort((a, b) => b.cumplimiento - a.cumplimiento);

  // Filtrar por proveedor si hay uno seleccionado
  const filteredVendorData = selectedProvider === 'all'
    ? vendorChartData
    : vendorChartData.filter(v => v.name === selectedProvider);

  // Lista de proveedores para el filtro
  const providerOptions = [
    { value: 'all', label: 'Todos los proveedores' },
    ...(vendorData?.map(v => ({ value: v.name, label: v.name })) || [])
  ];

  // Transformar la distribución de cumplimiento para el gráfico
  const complianceDistributionData = complianceDistribution ? [
    { name: 'Excelente (>90%)', value: complianceDistribution.excellent, color: '#22c55e' },
    { name: 'Bueno (70-89%)', value: complianceDistribution.good, color: '#eab308' },
    { name: 'Regular (50-69%)', value: complianceDistribution.regular, color: '#fca5a5' },
    { name: 'Bajo (<50%)', value: complianceDistribution.poor, color: '#ef4444' },
  ] : [];

  // Preparar datos para el gráfico de torta de estados
  let statusDistributionData: { name: string; value: number; color: string }[] = [];
  const statusColors: Record<string, string> = {
    completed: '#22c55e',
    in_progress: '#eab308',
    pending: '#fca5a5',
    desconocido: '#a3a3a3',
    // Agrega más colores si hay más estados
  };
  if (selectedProvider === 'all') {
    statusDistributionData = Object.entries(evaluationStatusDistribution).map(([status, value]) => ({
      name: status,
      value,
      color: statusColors[status] || '#8884d8',
    }));
  } else {
    // Filtrar solo las evaluaciones del proveedor seleccionado
    const provider = vendorData.find(v => v.name === selectedProvider);
    if (provider) {
      // No tenemos el desglose por estado por proveedor en vendorData, así que lo calculamos desde cero
      // Necesitamos los datos de evaluaciones asignadas y su status por proveedor
      // Como workaround, si vendorData tiene evaluaciones completadas y pendientes, asumimos:
      // completed = completedEvaluations, pending = pendingEvaluations
      statusDistributionData = [
        { name: 'completed', value: provider.completedEvaluations ?? 0, color: statusColors.completed },
        { name: 'pending', value: provider.pendingEvaluations ?? 0, color: statusColors.pending },
      ];
    }
  }

  const handleDateChange = (newDate: DateRange | undefined) => {
    setDate(newDate);
  };

  const handleExport = () => {
    const csvContent = "data:text/csv;charset=utf-8," +
      "Proveedor,Cumplimiento,Entregas a Tiempo,Calidad\n" +
      vendorData.map(row => `${row.name},${row.compliance},${row.onTime},${row.quality}`).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "vendor_metrics.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Mostrar porcentaje global de avance
  const globalCompletionText = globalCompletionRate !== undefined
    ? `Porcentaje global de avance: ${globalCompletionRate}% de las evaluaciones asignadas han sido completadas por los proveedores.`
    : '';

  // Preparar datos para los gráficos
  const completedData = filteredVendorData.map(v => ({ name: v.name, completadas: v.completedEvaluations }));
  const pendingData = filteredVendorData.map(v => ({ name: v.name, pendientes: v.pendingEvaluations }));

  if (loading) {
    return <div className="p-8 text-center text-lg">Cargando métricas...</div>;
  }
  if (error) {
    return (
      <div className="p-8 text-center text-red-500 font-semibold">
        {error}
        {debugInfo && (
          <pre className="mt-4 text-xs text-left text-black bg-gray-100 p-2 rounded max-w-xl mx-auto overflow-x-auto">
            {JSON.stringify(debugInfo, null, 2)}
          </pre>
        )}
      </div>
    );
  }

  // Gráficos adaptados a los datos reales
  function CustomBarChart() {
    const chartMargin = { top: 20, right: 30, left: 20, bottom: 5 };
    const fontSize = 12;
    return (
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={filteredVendorData} margin={chartMargin}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="name" fontSize={fontSize} tickSize={8} tickLine={true} />
          <YAxis fontSize={fontSize} domain={[0, 100]} tickSize={8} tickLine={true} />
          <Tooltip contentStyle={{ backgroundColor: 'var(--background)', border: '1px solid var(--border)', borderRadius: '6px' }} />
          <Legend wrapperStyle={{ fontSize }} verticalAlign="bottom" height={36} />
          <Bar dataKey="cumplimiento" fill="hsl(var(--chart-1))" name="Cumplimiento (%)" radius={[4, 4, 0, 0]} />
          <Bar dataKey="entregas" fill="hsl(var(--chart-2))" name="Entregas a Tiempo (%)" radius={[4, 4, 0, 0]} />
          <Bar dataKey="calidad" fill="hsl(var(--chart-3))" name="Calidad (%)" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    );
  }

  function CustomPieChart() {
    const chartMargin = { top: 20, right: 30, left: 20, bottom: 5 };
    return (
      <ResponsiveContainer width="100%" height="100%">
        <PieChart margin={chartMargin}>
          <Pie data={statusDistributionData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={120} label>
            {statusDistributionData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} stroke="#fff" strokeWidth={2} />
            ))}
          </Pie>
          <Tooltip contentStyle={{ backgroundColor: 'var(--background)', border: '1px solid var(--border)', borderRadius: '6px' }} />
        </PieChart>
      </ResponsiveContainer>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Métricas de Desempeño</h1>
          <p className="text-muted-foreground">Análisis detallado del desempeño de proveedores</p>
        </div>
        <Button onClick={handleExport} className="gap-2">
          <Download className="w-4 h-4" /> Exportar Datos
        </Button>
      </div>
      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-4">
            <div className="flex items-center gap-2">
              <DatePickerWithRange date={date} setDate={handleDateChange} />
            </div>
            <div className="flex items-center gap-2">
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Categoría" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas las categorías</SelectItem>
                  <SelectItem value="materials">Materiales</SelectItem>
                  <SelectItem value="services">Servicios</SelectItem>
                  <SelectItem value="equipment">Equipamiento</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <Select value={selectedProvider} onValueChange={setSelectedProvider}>
                <SelectTrigger className="w-[220px]">
                  <SelectValue placeholder="Proveedor" />
                </SelectTrigger>
                <SelectContent>
                  {providerOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>
      {/* Porcentaje global de avance */}
      <div className="p-4 bg-blue-50 rounded text-blue-900 font-semibold text-center">
        {globalCompletionText}
      </div>
      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Compliance Bar Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Tasa de Cumplimiento por Proveedor</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[400px]">
              <CustomBarChart />
            </div>
          </CardContent>
        </Card>
        {/* Compliance Distribution Pie Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Distribución de Evaluaciones por Estado</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[400px]">
              <CustomPieChart />
            </div>
          </CardContent>
        </Card>
      </div>
      {/* Top Performers */}
      <Card>
        <CardHeader>
          <CardTitle>Proveedores Destacados (&gt;90% Cumplimiento)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {(() => {
              const destacados = filteredVendorData
                .filter((vendor) => vendor.cumplimiento > 90)
                .sort((a, b) => b.cumplimiento - a.cumplimiento);
              if (destacados.length === 0) {
                return (
                  <div className="text-center text-muted-foreground py-8">
                    No hay proveedores destacados con &gt;90% de cumplimiento en el periodo y filtros seleccionados.
                  </div>
                );
              }
              return destacados.map((vendor, idx) => (
                <div key={vendor.name} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                  <div className="flex items-center gap-3">
                    {idx === 0 && (
                      <span className="inline-block px-2 py-1 bg-yellow-400 text-xs font-bold rounded mr-2">TOP 1</span>
                    )}
                    <div>
                      <p className="font-medium">{vendor.name}</p>
                      <p className="text-sm text-muted-foreground">Cumplimiento: {vendor.cumplimiento}%</p>
                      <p className="text-xs text-muted-foreground">Evaluaciones completadas: {vendor.completedEvaluations ?? 0}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-sm">
                      <p>Entregas a Tiempo: {vendor.entregas ?? 0}%</p>
                      <p>Calidad: {vendor.calidad ?? 0}%</p>
                    </div>
                  </div>
                </div>
              ));
            })()}
          </div>
        </CardContent>
      </Card>
      {/* Gráfico de evaluaciones completadas */}
      <Card>
        <CardHeader>
          <CardTitle>Evaluaciones Completadas por Proveedor</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={completedData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="completadas" fill="#22c55e" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
      {/* Gráfico de evaluaciones pendientes */}
      <Card>
        <CardHeader>
          <CardTitle>Evaluaciones Pendientes por Proveedor</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={pendingData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="pendientes" fill="#f59e42" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}