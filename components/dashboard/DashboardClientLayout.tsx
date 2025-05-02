"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import Navigation from '@/components/Navigation';

interface DashboardClientLayoutProps {
  children: React.ReactNode;
  userRole: string;
  userPermissions: string[];
}

export default function DashboardClientLayout({ children, userRole, userPermissions }: DashboardClientLayoutProps) {
  const pathname = usePathname();
  
  // Puedes agregar hooks o lógica de cliente aquí
  useEffect(() => {
    // Ejemplo: analytics, cargar preferencias del usuario, etc.
    console.log("Dashboard layout montado, rol:", userRole);
    console.log("Permisos del usuario:", userPermissions);
  }, [userRole, userPermissions]);

  return (
    <div id="dashboard-client-layout" data-user-role={userRole} className="min-h-screen bg-gray-100 dark:bg-gray-950">
      {/* Navigation es position: fixed por lo que necesitamos un div que ocupe el mismo espacio */}
      <div className="w-64 flex-shrink-0" /> {/* Placeholder para el sidebar */}
      <div className="flex">
        <Navigation userRole={userRole} userPermissions={userPermissions} />
        <div className="flex-1 ml-64"> {/* ml-64 corresponde al ancho del sidebar */}
          <main className="p-8">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
} 