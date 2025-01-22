"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  LayoutDashboard,
  ClipboardList,
  Users,
  UserCircle,
  Settings,
  Menu,
  X,
  LogOut,
  Building2,
  MessageSquareWarning,
  BarChart2,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { Breadcrumb } from "@/components/ui/breadcrumb";

const getBreadcrumbItems = (pathname: string) => {
  const paths = pathname.split('/').filter(Boolean);
  const items = [];

  for (let i = 0; i < paths.length; i++) {
    const href = `/${paths.slice(0, i + 1).join('/')}`;
    const label = paths[i].charAt(0).toUpperCase() + paths[i].slice(1);
    items.push({ label, href });
  }

  // Remove href from last item to make it non-clickable
  if (items.length > 0) {
    items[items.length - 1] = { label: items[items.length - 1].label };
  }

  return items;
};

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { toast } = useToast();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      const supabase = createClient();
      const { data: { user }, error } = await supabase.auth.getUser();

      if (error || !user) {
        router.push('/auth/login');
        return;
      }
      setLoading(false);
    };

    checkAuth();
  }, [router]);

  const navigation = [
    {
      name: "Dashboard",
      href: "/dashboard",
      icon: LayoutDashboard,
    },
    {
      name: "Evaluaciones",
      href: "/evaluations",
      icon: ClipboardList,
    },
    {
      name: "Proveedores",
      href: "/vendors",
      icon: Building2,
    },
    {
      name: "Métricas de Desempeño",
      href: "/metrics",
      icon: BarChart2,
    },
    {
      name: "Usuarios",
      href: "/users",
      icon: Users,
    },
    {
      name: "Recomendaciones",
      href: "/recommendations",
      icon: MessageSquareWarning,
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
      const supabase = createClient();
      await supabase.auth.signOut();
      router.push('/auth/login');
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo cerrar la sesión. Por favor, intente nuevamente.",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return <div className="min-h-screen bg-background flex items-center justify-center">
      Cargando...
    </div>;
  }

  const breadcrumbItems = getBreadcrumbItems(pathname);

  return (
    <div className="min-h-screen bg-background">
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
        className={`fixed inset-y-0 left-0 z-40 w-64 transform bg-card shadow-lg transition-transform duration-200 ease-in-out ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        } lg:translate-x-0`}
      >
        <div className="flex h-full flex-col">
          {/* Logo */}
          <div className="flex h-16 items-center justify-center border-b px-4">
            <h1 className="text-xl font-bold">SupplierEval Pro</h1>
          </div>

          {/* Navigation */}
          <nav className="flex-1 space-y-1 px-2 py-4">
            {navigation.map((item) => {
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

      {/* Main content */}
      <div className={`${sidebarOpen ? "lg:pl-64" : ""} flex min-h-screen flex-col`}>
        {/* Breadcrumb */}
        <div className="sticky top-0 z-10 bg-background border-b">
          <div className="container mx-auto px-6 py-4">
            <Breadcrumb items={breadcrumbItems} />
          </div>
        </div>
        <main className="flex-1">{children}</main>
      </div>
    </div>
  );
}