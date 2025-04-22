import { notFound } from 'next/navigation';
import { createServerClient } from '@/lib/supabase/server'; 
import { getUserById } from '@/lib/services/user-service';
import UserEditForm from '@/components/users/UserEditForm'; // Importar el componente del formulario
import { Button } from '@/components/ui/button'; // Para el botón Volver
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link'; // Para el botón Volver

// La página ahora es un Server Component async
export default async function EditUserPage({ params }: { params: { id: string } }) {
  const userId = params.id;
  const supabase = createServerClient();

  let user;
  try {
    // Llamar directamente al servicio desde el servidor
    user = await getUserById(supabase, userId);
  } catch (error: any) {
    console.error(`Failed to fetch user ${userId}:`, error);
    // Si el usuario no se encuentra (asumiendo que getUserById lanza error específico o devuelve null/undefined)
    if (error.message.toLowerCase().includes('not found')) {
      notFound(); // Mostrar página 404 de Next.js
    }
    // Para otros errores, podrías mostrar un mensaje genérico
    // O lanzar el error para que lo capture un Error Boundary superior
    // throw error; // O manejarlo aquí:
    return (
        <div className="container mx-auto p-6 text-center">
            <p className="text-red-600">Error al cargar los datos del usuario.</p>
            <Link href="/users">
                 <Button variant="outline" className="mt-4">Volver a Usuarios</Button>
            </Link>
        </div>
        );
  }

  // Si el usuario se carga correctamente, renderizar el formulario cliente
  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between mb-4">
        {/* Encabezado y botón volver principal */}
        <div className="flex items-center gap-4">
           <Button variant="ghost" asChild>
              <Link href="/users" className="gap-2">
                <ArrowLeft className="w-4 h-4" /> Volver
              </Link>
            </Button>
           <h1 className="text-3xl font-bold">Editar Usuario</h1>
        </div>
         {/* El botón de eliminar ahora debería estar DENTRO de UserEditForm */}
      </div>
      
      {/* Renderizar el componente cliente con los datos */}
      <UserEditForm user={user} />
    </div>
  );
}

/*
ELIMINAR TODO EL CÓDIGO ANTERIOR DE ESTE ARCHIVO QUE ERA DE CLIENTE:
- "use client";
- Imports de hooks (useState, useEffect, useRouter, useParams)
- Imports de componentes de formulario (Input, Select, Switch, Card...)
- Imports de AlertDialog, toast
- Definiciones de tipos locales (EditableUser, UserApiResponse)
- Todos los estados (loading, saving, deleting, user, roles, vendors...)
- Todos los useEffects (fetchUser, fetchRolesData, fetchVendors)
- Todas las funciones handler (handleChange, handleRoleChange, handleVendorChange, handleSubmit, handleDelete)
- Todo el JSX del formulario dentro del return (Card, form, inputs, selects...)
*/