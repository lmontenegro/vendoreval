"use client";

import { useState } from "react";
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

// Mock data for vendor performance
const vendorData = [
  { name: "Proveedor A", compliance: 95, onTime: 98, quality: 92 },
  { name: "Proveedor B", compliance: 88, onTime: 85, quality: 90 },
  { name: "Proveedor C", compliance: 75, onTime: 70, quality: 80 },
  { name: "Proveedor D", compliance: 92, onTime: 95, quality: 88 },
  { name: "Proveedor E", compliance: 85, onTime: 82, quality: 87 },
];

const complianceDistribution = [
  { name: "Alto (>90%)", value: 2, color: "#22c55e" },
  { name: "Medio (70-89%)", value: 2, color: "#eab308" },
  { name: "Bajo (<70%)", value: 1, color: "#ef4444" },
];

const topPerformers = vendorData.filter(vendor => vendor.compliance > 90);

function CustomBarChart() {
  const chartMargin = { top: 20, right: 30, left: 20, bottom: 5 };
  const fontSize = 12;

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={vendorData} margin={chartMargin}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis 
          dataKey="name" 
          fontSize={fontSize}
          tickSize={8}
          tickLine={true}
        />
        <YAxis 
          fontSize={fontSize}
          domain={[0, 100]}
          tickSize={8}
          tickLine={true}
        />
        <Tooltip 
          contentStyle={{ 
            backgroundColor: 'var(--background)',
            border: '1px solid var(--border)',
            borderRadius: '6px'
          }}
        />
        <Legend 
          wrapperStyle={{ fontSize }}
          verticalAlign="bottom"
          height={36}
        />
        <Bar
          dataKey="compliance"
          fill="hsl(var(--chart-1))"
          name="Cumplimiento (%)"
          radius={[4, 4, 0, 0]}
        />
        <Bar
          dataKey="onTime"
          fill="hsl(var(--chart-2))"
          name="Entregas a Tiempo (%)"
          radius={[4, 4, 0, 0]}
        />
        <Bar
          dataKey="quality"
          fill="hsl(var(--chart-3))"
          name="Calidad (%)"
          radius={[4, 4, 0, 0]}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}

function CustomPieChart() {
  const chartMargin = { top: 20, right: 30, left: 20, bottom: 5 };

  const renderCustomLabel = ({
    cx,
    cy,
    midAngle,
    innerRadius,
    outerRadius,
    value,
    index
  }: {
    cx: number;
    cy: number;
    midAngle: number;
    innerRadius: number;
    outerRadius: number;
    value: number;
    index: number;
  }) => {
    const RADIAN = Math.PI / 180;
    const radius = 25 + innerRadius + (outerRadius - innerRadius);
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    return (
      <text
        x={x}
        y={y}
        fill={complianceDistribution[index].color}
        textAnchor={x > cx ? 'start' : 'end'}
        dominantBaseline="central"
        fontSize={12}
      >
        {`${complianceDistribution[index].name} (${value})`}
      </text>
    );
  };

  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart margin={chartMargin}>
        <Pie
          data={complianceDistribution}
          dataKey="value"
          nameKey="name"
          cx="50%"
          cy="50%"
          outerRadius={150}
          label={renderCustomLabel}
        >
          {complianceDistribution.map((entry, index) => (
            <Cell 
              key={`cell-${index}`} 
              fill={entry.color}
              stroke="var(--background)"
              strokeWidth={2}
            />
          ))}
        </Pie>
        <Tooltip
          contentStyle={{ 
            backgroundColor: 'var(--background)',
            border: '1px solid var(--border)',
            borderRadius: '6px'
          }}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}

export default function MetricsPage() {
  const [date, setDate] = useState({
    from: new Date(),
    to: addDays(new Date(), 30),
  });
  const [category, setCategory] = useState("all");

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

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Métricas de Desempeño</h1>
          <p className="text-muted-foreground">
            Análisis detallado del desempeño de proveedores
          </p>
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
              <DatePickerWithRange date={date} setDate={setDate} />
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
          </div>
        </CardContent>
      </Card>

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
            <CardTitle>Distribución de Cumplimiento</CardTitle>
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
          <CardTitle>Proveedores Destacados (>90% Cumplimiento)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {topPerformers.map((vendor) => (
              <div
                key={vendor.name}
                className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div>
                  <p className="font-medium">{vendor.name}</p>
                  <p className="text-sm text-muted-foreground">
                    Cumplimiento: {vendor.compliance}%
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-sm">
                    <p>Entregas a Tiempo: {vendor.onTime}%</p>
                    <p>Calidad: {vendor.quality}%</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}