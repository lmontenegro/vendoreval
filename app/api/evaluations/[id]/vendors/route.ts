import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { assignVendorsToEvaluation, getEvaluationDetails } from '@/lib/services/evaluation-service';
import { getCurrentUserData } from '@/lib/services/auth-service';
import { getVendors } from '@/lib/services/vendor-service';

// GET endpoint to retrieve vendors assigned to an evaluation
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createServerClient();

    // 1. Verificar si el usuario está autenticado
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'No has iniciado sesión' }, { status: 401 });
    }

    const { user: currentUser, isAdmin } = await getCurrentUserData(supabase);
    if (!currentUser) {
      return NextResponse.json({ error: 'No has iniciado sesión' }, { status: 401 });
    }

    // 2. Obtener la evaluación para comprobar permisos
    const { data: evaluation, error: evalError } = await getEvaluationDetails(supabase, params.id);
    if (evalError) {
      return NextResponse.json(
        { error: evalError.message || 'Error obteniendo evaluación' },
        { status: 500 }
      );
    }

    if (!evaluation) {
      return NextResponse.json({ error: 'Evaluación no encontrada' }, { status: 404 });
    }

    // 3. Verificar permisos (admin o evaluador)
    const isEvaluator = evaluation.evaluator_id === user.id;
    if (!isAdmin && !isEvaluator) {
      return NextResponse.json(
        { error: 'No tienes permisos para ver los proveedores de esta evaluación' },
        { status: 403 }
      );
    }

    // 4. Obtener proveedores asignados
    const { data: assignedVendors, error: vendorsError } = await supabase
      .from('evaluation_vendors')
      .select(`
        id,
        vendor_id,
        status,
        assigned_at,
        assigned_by,
        completed_at,
        vendors(id, name, contact_email, contact_phone)
      `)
      .eq('evaluation_id', params.id);

    // Si ocurre un error al consultar la tabla, puede ser porque:
    // - La tabla no existe aún (primera ejecución)
    // - Error de permisos
    // - Otro error de base de datos
    if (vendorsError) {
      console.error("Error obteniendo proveedores asignados:", vendorsError);
      // En lugar de devolver un error, devolver un array vacío
      return NextResponse.json({ data: [] }, { status: 200 });
    }

    // Verificar que assignedVendors es un array
    const vendors = Array.isArray(assignedVendors) ? assignedVendors : [];

    // 5. Formatear los datos (solo si hay proveedores asignados)
    const formattedVendors = vendors.map(av => ({
      id: av.id,
      vendor_id: av.vendor_id,
      name: av.vendors?.name || 'Sin nombre',
      contact_email: av.vendors?.contact_email || null,
      contact_phone: av.vendors?.contact_phone || null,
      status: av.status || 'pending',
      assigned_at: av.assigned_at,
      assigned_by: av.assigned_by,
      completed_at: av.completed_at
    }));

    return NextResponse.json({ data: formattedVendors });
  } catch (error: any) {
    console.error('Error en GET /api/evaluations/[id]/vendors:', error);
    // En caso de error también devolver un array vacío
    return NextResponse.json({ data: [] }, { status: 200 });
  }
}

// POST endpoint to assign vendors to an evaluation
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createServerClient();

    // 1. Verificar si el usuario está autenticado
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'No has iniciado sesión' }, { status: 401 });
    }

    const { user: currentUser, isAdmin } = await getCurrentUserData(supabase);
    if (!currentUser) {
      return NextResponse.json({ error: 'No has iniciado sesión' }, { status: 401 });
    }

    // 2. Obtener los datos del cuerpo
    const requestData = await request.json();
    const { vendor_ids } = requestData;

    if (!vendor_ids || !Array.isArray(vendor_ids)) {
      return NextResponse.json(
        { error: 'Se requiere un array de IDs de proveedores' },
        { status: 400 }
      );
    }

    // 3. Obtener la evaluación para comprobar permisos
    const { data: evaluation, error: evalError } = await getEvaluationDetails(supabase, params.id);
    if (evalError) {
      return NextResponse.json(
        { error: evalError.message || 'Error obteniendo evaluación' },
        { status: 500 }
      );
    }

    if (!evaluation) {
      return NextResponse.json({ error: 'Evaluación no encontrada' }, { status: 404 });
    }

    // 4. Verificar permisos (admin o evaluador)
    const isEvaluator = evaluation.evaluator_id === user.id;
    if (!isAdmin && !isEvaluator) {
      return NextResponse.json(
        { error: 'No tienes permisos para asignar proveedores a esta evaluación' },
        { status: 403 }
      );
    }

    // 5. Verificar que los vendor_ids son válidos
    if (vendor_ids.length > 0) {
      const { data: vendors, error: vendorsError } = await getVendors(supabase);
      if (vendorsError) {
        return NextResponse.json(
          { error: vendorsError.message || 'Error obteniendo proveedores' },
          { status: 500 }
        );
      }

      const validVendorIds = vendors?.map(v => v.id) || [];
      const invalidIds = vendor_ids.filter(id => !validVendorIds.includes(id));

      if (invalidIds.length > 0) {
        return NextResponse.json(
          { error: `Los siguientes IDs de proveedores no son válidos: ${invalidIds.join(', ')}` },
          { status: 400 }
        );
      }
    }

    // 6. Asignar los proveedores
    const { success, error: assignError } = await assignVendorsToEvaluation(
      supabase,
      params.id,
      vendor_ids
    );

    if (!success) {
      return NextResponse.json(
        { error: assignError?.message || 'Error asignando proveedores' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Se han asignado ${vendor_ids.length} proveedores exitosamente`
    });
  } catch (error: any) {
    console.error('Error en POST /api/evaluations/[id]/vendors:', error);
    return NextResponse.json(
      { error: error.message || 'Error interno del servidor' },
      { status: 500 }
    );
  }
} 