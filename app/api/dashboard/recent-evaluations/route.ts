import { createServerClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { cookies } from 'next/headers'; // Import cookies

export async function GET() {
    const cookieStore = cookies(); // Get cookies
    const supabase = createServerClient(cookieStore); // Pass cookies to client

    try {
        // 1. Get Authenticated User
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            console.error("Authentication error:", authError?.message);
            return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
        }

        // 2. Get User Role and Vendor ID from public.users
        const { data: userData, error: userError } = await supabase
            .from('users')
            .select(`
              vendor_id,
              roles ( name )
            `)
            .eq('id', user.id)
            .single(); // Use single() as there should only be one user

        if (userError) {
            console.error("Error fetching user data:", userError.message);
            // Check if the error is 'PGRST116' (No rows found) which might happen if user sync is missing
            if (userError.code === 'PGRST116') {
                return NextResponse.json({ error: "User profile not found." }, { status: 404 });
            }
            return NextResponse.json({ error: "Failed to fetch user details." }, { status: 500 });
        }

        if (!userData) {
            // This case should ideally be caught by userError.code === 'PGRST116', but good to double check
            console.error("User data is null for user:", user.id);
            return NextResponse.json({ error: "User profile data not found." }, { status: 404 });
        }

        const userRole = userData.roles?.name; // Safely access role name
        const userVendorId = userData.vendor_id;

        // 3. Build the query based on role
        let evaluationIds: string[] = [];

        // If user is not admin, first fetch their assigned evaluation IDs
        if (userRole !== 'admin') {
            if (!userVendorId) {
                console.warn(`User ${user.id} with role ${userRole} has no vendor_id. Returning empty list.`);
                return NextResponse.json([]);
            }

            const { data: assignedEvaluations, error: assignedEvalError } = await supabase
                .from('evaluation_vendors')
                .select('evaluation_id')
                .eq('vendor_id', userVendorId);

            if (assignedEvalError) {
                console.error("Error fetching assigned evaluation IDs:", assignedEvalError.message);
                return NextResponse.json({ error: "Failed to fetch assigned evaluations." }, { status: 500 });
            }

            evaluationIds = assignedEvaluations.map(ev => ev.evaluation_id);

            // If the user has no assigned evaluations, return empty list
            if (evaluationIds.length === 0) {
                return NextResponse.json([]);
            }
        }

        // 4. Fetch Evaluation details
        let query = supabase
            .from('evaluations')
            .select(`
              id,
              title,
              status,
              created_at,
              vendors ( name )
            `)
            .order('created_at', { ascending: false });

        // Apply filters: ID filter for non-admins, limit for admins or non-admins with results
        if (userRole !== 'admin') {
            query = query.in('id', evaluationIds); // Filter by the fetched IDs
        } else {
            query = query.limit(5); // Admins see the latest 5 overall
        }

        // Add limit for non-admins as well, after filtering by ID
        if (userRole !== 'admin') {
            query = query.limit(5);
        }

        // 5. Execute the query
        const { data: recentEvaluations, error: queryError } = await query;

        if (queryError) {
            // Log the specific error for server-side debugging
            console.error("Error fetching recent evaluations:", queryError.message);
            // Check for specific errors if needed, e.g., RLS issues
            if (queryError.code === '42501') { // permission denied
                return NextResponse.json({ error: "Permission denied to access evaluations." }, { status: 403 });
            }
            // Throw a generic error for other cases to be caught below
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