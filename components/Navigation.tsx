'use client';

import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import {
  LayoutDashboard,
  ClipboardList,
  Building2,
  BarChart2,
  Users,
  MessageSquareWarning,
  UserCircle,
  Settings,
  LogOut,
  Menu,
  X
} from 'lucide-react';

interface NavigationProps {
  userRole: string;
  userPermissions: string[];
}

export default function Navigation({ userRole, userPermissions }: NavigationProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { toast } = useToast();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Definición de navegación con verificación de permisos
  const navigation = [
    {
      name: "Dashboard",
      href: "/dashboard",
      icon: LayoutDashboard,
      permission: "view_dashboard",
      alwaysShow: true // Siempre visible, todos los usuarios tienen acceso al dashboard
    },
    {
      name: "Evaluaciones",
      href: "/evaluations",
      icon: ClipboardList,
      permission: "view_evaluations",
      alwaysShow: false
    },
    {
      name: "Proveedores",
      href: "/vendors",
      icon: Building2,
      permission: "view_vendors",
      alwaysShow: false
    },
    {
      name: "Métricas de Desempeño",
      href: "/metrics",
      icon: BarChart2,
      permission: "view_metrics",
      alwaysShow: false
    },
    {
      name: "Usuarios",
      href: "/users",
      icon: Users,
      permission: "view_users",
      alwaysShow: false
    },
    {
      name: "Recomendaciones",
      href: "/recommendations",
      icon: MessageSquareWarning,
      permission: "view_recommendations",
      alwaysShow: false
    },
  ];

  const userNavigation = [
    {
      name: "Mi Perfil",
      href: "/profile",
      icon: UserCircle,
    },
    {
      name: "Configuración",
      href: "/settings",
      icon: Settings,
    },
  ];

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      router.push('/auth/login?loggedout=true');
    } catch (error) {
      console.error("Error al cerrar sesión:", error);
      toast({
        title: "Error",
        description: "No se pudo cerrar la sesión. Por favor, intente nuevamente.",
        variant: "destructive",
      });
    }
  };

  // Filtrar navegación según permisos
  const filteredNavigation = navigation.filter(item => {
    const shouldShow = item.alwaysShow || userPermissions.includes(item.permission);
    console.log(`Item ${item.name}: alwaysShow=${item.alwaysShow}, hasPermission=${userPermissions.includes(item.permission)}, shouldShow=${shouldShow}`);
    return shouldShow;
  });

  return (
    <>
      {/* Mobile sidebar toggle */}
      <div className="lg:hidden fixed top-4 left-4 z-50">
        <Button
          variant="outline"
          size="icon"
          onClick={() => setSidebarOpen(!sidebarOpen)}
        >
          {sidebarOpen ? (
            <X className="h-4 w-4" />
          ) : (
            <Menu className="h-4 w-4" />
          )}
        </Button>
      </div>

      {/* Sidebar Backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 lg:hidden z-40"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div
        className={`fixed inset-y-0 left-0 z-50 w-64 transform bg-card shadow-lg transition-transform duration-200 ease-in-out ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        } lg:translate-x-0`}
      >
        <div className="flex h-full flex-col">
          {/* Logo */}
          <div className="flex h-16 items-center justify-center border-b px-4">
            <Image
              src="/ccmin-logo.png"
              alt="CCMIN Logo"
              width={180}
              height={60}
              priority
            />
          </div>

          {/* User info with role */}
          {userRole && (
            <div className="px-4 py-2 bg-muted/30 border-b">
              <p className="text-sm font-medium text-primary">{userRole}</p>
            </div>
          )}

          {/* Navigation */}
          <nav className="flex-1 space-y-1 px-2 py-4">
            {filteredNavigation.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={() => setSidebarOpen(false)}
                  className={`group flex items-center rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-muted"
                  }`}
                >
                  <item.icon className="mr-3 h-5 w-5" />
                  {item.name}
                </Link>
              );
            })}
          </nav>

          {/* User navigation */}
          <div className="border-t p-4">
            <div className="space-y-1">
              {userNavigation.map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={() => setSidebarOpen(false)}
                  className="group flex items-center rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted"
                >
                  <item.icon className="mr-3 h-5 w-5" />
                  {item.name}
                </Link>
              ))}
              <Button
                variant="ghost"
                className="w-full justify-start text-muted-foreground hover:bg-muted"
                onClick={handleLogout}
              >
                <LogOut className="mr-3 h-5 w-5" />
                Cerrar Sesión
              </Button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
} 