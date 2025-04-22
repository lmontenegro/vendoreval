import { Suspense } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createServerComponentClient } from "@supabase/auth-helpers-nextjs";
import { Toaster } from "@/components/ui/toaster";
import "@/app/globals.css";
import DashboardClientLayout from "@/components/dashboard/DashboardClientLayout";
import { Database } from "@/lib/database.types";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = cookies();
  const supabase = createServerComponentClient<Database>({ cookies: () => cookieStore });
  
  // Verificar si el usuario está autenticado
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    redirect("/auth/login");
  }

  // Verificar si el usuario está activo y tiene un rol válido
  const { data: user, error: userError } = await supabase
    .from('users')
    .select(`
      profile:profiles!users_profile_id_fkey (
        is_active
      ),
      role:roles!users_role_id_fkey (
        name
      )
    `)
    .eq('id', session.user.id)
    .single();

  if (userError || !user) {
    console.error('Error al obtener usuario:', userError);
    await supabase.auth.signOut();
    redirect('/auth/login');
  }

  // Verificar si el usuario está activo
  if (!user.profile?.is_active) {
    console.error('Usuario inactivo');
    await supabase.auth.signOut();
    redirect('/auth/login');
  }

  // Verificar si tiene un rol válido
  if (!user.role?.name) {
    console.error('Usuario sin rol asignado');
    await supabase.auth.signOut();
    redirect('/auth/login');
  }

  // Obtener los permisos del usuario
  const { data: permissions, error: permissionsError } = await supabase
    .rpc('get_user_permissions', {
      user_id: session.user.id
    });

  if (permissionsError) {
    console.error('Error al obtener permisos:', permissionsError);
    await supabase.auth.signOut();
    redirect('/auth/login');
  }

  // Renderizar el layout del cliente con el rol de usuario y permisos
  return (
    <Suspense fallback={<div>Cargando...</div>}>
      <DashboardClientLayout 
        userRole={user.role.name}
        userPermissions={permissions.map(p => p.name)}
      >
        {children}
      </DashboardClientLayout>
      <Toaster />
    </Suspense>
  );
} 