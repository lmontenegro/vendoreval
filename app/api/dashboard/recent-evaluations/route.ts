import { createServerClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET() {
    const supabase = createServerClient();

    try {
        // Fetch the 5 most recently created evaluations along with vendor name
        const { data: recentEvaluations, error } = await supabase
            .from('evaluations')
            .select(`
        id,
        title,
        status,
        created_at,
        vendors ( name )
      `)
            .order('created_at', { ascending: false })
            .limit(5);

        if (error) {
            // Log the specific error for server-side debugging
            console.error("Error fetching recent evaluations:", error.message);
            // Check for specific errors if needed, e.g., RLS issues
            if (error.code === '42501') { // permission denied
                return NextResponse.json({ error: "Permission denied to access evaluations." }, { status: 403 });
            }
            // Throw a generic error for other cases
            throw new Error("Failed to fetch recent evaluations.");
        }

        // Ensure vendors relation is handled correctly (it might be null if no vendor is linked)
        const formattedData = recentEvaluations?.map(evaluation => ({
            ...evaluation,
            // Supabase returns the related record directly if the select is done right
            // Access vendor name safely, provide default if null/undefined
            vendor_name: evaluation.vendors?.name ?? 'Proveedor Desconocido'
        })) || [];


        return NextResponse.json(formattedData);

    } catch (error: any) {
        // Catch errors thrown manually or other unexpected errors
        console.error("API Route Error:", error.message || error);
        return NextResponse.json(
            { error: error.message || "Internal Server Error fetching recent evaluations" },
            { status: 500 }
        );
    }
} 