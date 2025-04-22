import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { getVendorById } from '@/lib/services/vendor-service';
import { getCurrentUserData } from '@/lib/services/auth-service';
import { updateVendor } from '@/lib/services/vendor-service';

export async function GET(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const vendorIdToFetch = params.id;
        if (!vendorIdToFetch) {
            return NextResponse.json({ error: 'ID de proveedor no proporcionado.' }, { status: 400 });
        }

        const supabase = createServerClient();

        // 1. Verificar permisos (admin o usuario asociado al vendor)
        const { user: currentUser, isAdmin, vendor: userVendor } = await getCurrentUserData(supabase);
        if (!currentUser) {
            return NextResponse.json({ error: 'No has iniciado sesión' }, { status: 401 });
        }

        const isAssociated = currentUser.id === userVendor?.id; // Ajusta si la FK está en user.vendor_id
        // O si hay una tabla intermedia user_vendors?
        // const isAssociated = userVendor?.id === vendorIdToFetch;

        if (!isAdmin && !isAssociated) { // Permitir si es admin O está asociado
            return NextResponse.json({ error: 'No tienes permisos para ver este proveedor.' }, { status: 403 });
        }

        // 2. Obtener datos del vendor
        const { data, error } = await getVendorById(supabase, vendorIdToFetch);

        if (error) {
            if (error.message === 'Proveedor no encontrado') {
                return NextResponse.json({ error: error.message }, { status: 404 });
            }
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ data });

    } catch (error: any) {
        console.error(`Error en GET /api/admin/vendors/${params.id}:`, error);
        if (error.message.includes('No has iniciado sesión')) {
            return NextResponse.json({ error: error.message }, { status: 401 });
        }
        if (error.message.includes('Missing Supabase environment variables')) {
            return NextResponse.json({ error: 'Configuración del servidor incompleta.' }, { status: 500 });
        }
        return NextResponse.json({ error: error.message || 'Error interno del servidor' }, { status: 500 });
    }
}

export async function PUT(
    request: Request,
    { params }: { params: { id: string } }
) {
    const supabase = createServerClient();

    try {
        const vendorIdToUpdate = params.id;
        if (!vendorIdToUpdate) {
            return NextResponse.json({ error: 'ID de proveedor no proporcionado' }, { status: 400 });
        }

        const vendorData = await request.json(); // Recibe el payload del cliente

        console.log("API Route: Payload recibido:", JSON.stringify(vendorData, null, 2));

        // Verificar permiso 'admin' (o el necesario)
        const { isAdmin } = await getCurrentUserData(supabase);
        if (!isAdmin) {
            return NextResponse.json({ error: 'No tienes permisos para actualizar proveedores' }, { status: 403 });
        }

        // Llamar al servicio para actualizar
        const { success, error } = await updateVendor(supabase, vendorIdToUpdate, vendorData);

        if (error) {
            console.error("Error from updateVendor service:", error);
            // Verificar si el error es por RLS u otro problema de Supabase
            if (error.message.includes("permission denied")) {
                return NextResponse.json({ error: 'Error de base de datos: Permiso denegado.' }, { status: 500 });
            }
            return NextResponse.json({ error: error.message || 'Error al actualizar el proveedor en la base de datos' }, { status: 500 });
        }

        return NextResponse.json({ message: 'Proveedor actualizado correctamente' });

    } catch (error) {
        console.error("Error in PUT /api/admin/vendors/[id]:", error);
        let errorMessage = 'Error interno del servidor';
        if (error instanceof Error) {
            errorMessage = error.message;
        }
        return NextResponse.json({ error: errorMessage }, { status: 500 });
    }
} 