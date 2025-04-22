import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { getVendors } from '@/lib/services/vendor-service';
import { getCurrentUserData } from '@/lib/services/auth-service';

export async function GET(request: Request) {
    try {
        const supabase = createServerClient();

        // 1. Verificar permisos (solo admin)
        const { isAdmin } = await getCurrentUserData(supabase);
        if (!isAdmin) {
            return NextResponse.json({ error: 'No tienes permisos para ver la lista de proveedores' }, { status: 403 });
        }

        // 2. Obtener proveedores
        const { data, error } = await getVendors(supabase);

        if (error) {
            // El servicio ya maneja el error y lo devuelve
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ data });

    } catch (error: any) {
        console.error('Error en GET /api/admin/vendors:', error);
        if (error.message.includes('No has iniciado sesión')) {
            return NextResponse.json({ error: error.message }, { status: 401 });
        }
        if (error.message.includes('Missing Supabase environment variables')) {
            return NextResponse.json({ error: 'Configuración del servidor incompleta.' }, { status: 500 });
        }
        return NextResponse.json({ error: error.message || 'Error interno del servidor' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const supabase = createServerClient();

        // 1. Verificar si el usuario está autenticado (necesario para RLS)
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            return NextResponse.json({ error: 'No has iniciado sesión' }, { status: 401 });
        }

        // 2. Obtener datos del cuerpo de la solicitud
        const vendorData = await request.json();

        // 3. Validación básica (puedes añadir más con Zod si quieres)
        if (!vendorData.name || !vendorData.rut || !vendorData.contact_email || !vendorData.contact_phone) {
            return NextResponse.json({ error: 'Faltan campos requeridos (nombre, rut, email, teléfono)' }, { status: 400 });
        }

        // 4. Llamar directamente a insert aquí (o a un servicio createVendor si lo creamos)
        const { data: newVendor, error: insertError } = await supabase
            .from('vendors')
            .insert({
                name: vendorData.name,
                rut: vendorData.rut,
                description: vendorData.description || null,
                contact_email: vendorData.contact_email,
                contact_phone: vendorData.contact_phone,
                address: vendorData.address || null,
                website: vendorData.website || null,
                is_active: vendorData.is_active !== undefined ? vendorData.is_active : true, // Default a true si no se envía
                services_provided: vendorData.services_provided || []
            })
            .select() // Opcional: devolver el vendor creado
            .single(); // Si esperas insertar solo uno

        if (insertError) {
            console.error("Error inserting vendor via API:", insertError);
            // Aquí sí debería capturar el error RLS 42501 si la política falla por alguna razón
            if (insertError.code === '42501') {
                return NextResponse.json({ error: 'Error de permisos al crear el proveedor (RLS).' }, { status: 403 });
            }
            // Otros posibles errores (ej: violación de unicidad de RUT)
            if (insertError.code === '23505') { // unique_violation
                return NextResponse.json({ error: 'Error: Ya existe un proveedor con ese RUT o identificador.' }, { status: 409 }); // Conflict
            }
            return NextResponse.json({ error: insertError.message || 'Error al crear el proveedor en la base de datos' }, { status: 500 });
        }

        return NextResponse.json({ data: newVendor }, { status: 201 }); // 201 Created

    } catch (error: any) {
        console.error('Error en POST /api/admin/vendors:', error);
        if (error instanceof SyntaxError) {
            return NextResponse.json({ error: 'Cuerpo de la solicitud inválido (JSON malformado)' }, { status: 400 });
        }
        return NextResponse.json({ error: error.message || 'Error interno del servidor' }, { status: 500 });
    }
} 