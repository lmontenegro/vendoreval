import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { Database } from "@/lib/database.types"; // Import Database types

export async function GET() {
    const cookieStore = cookies();
    // Use createRouteHandlerClient for Route Handlers
    const supabase = createRouteHandlerClient<Database>({ cookies: () => cookieStore });

    try {
        // 1. Get Authenticated User
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            console.error("Authentication error:", authError);
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // 2. Get User Role and Vendor ID from public.users
        const { data: userData, error: userError } = await supabase
            .from('users')
            .select('role_id, vendor_id')
            .eq('id', user.id)
            .single();

        if (userError || !userData) {
            console.error("Error fetching user data:", userError);
            return NextResponse.json({ error: "Failed to fetch user data" }, { status: 500 });
        }

        // Ensure role_id exists before proceeding
        if (!userData.role_id) {
            console.error(`User ${user.id} does not have a role_id assigned.`);
            return NextResponse.json({ error: "User role not assigned" }, { status: 500 });
        }

        // 3. Get Role Name
        const { data: roleData, error: roleError } = await supabase
            .from('roles')
            .select('name')
            .eq('id', userData.role_id) // Now guaranteed to be non-null
            .single();

        if (roleError || !roleData) {
            console.error("Error fetching role data:", roleError);
            return NextResponse.json({ error: "Failed to fetch role data" }, { status: 500 });
        }

        const isAdmin = roleData.name.toLowerCase() === 'admin';
        const userVendorId = userData.vendor_id;

        let activeEvaluationsCount = 0;
        let registeredVendorsCount = 0;
        let completedEvaluationsCount = 0;
        let pendingActionsCount = 0;

        // 4. Fetch Stats based on Role
        if (isAdmin) {
            // Admin: Fetch global stats (original logic)
            const { count: activeCount, error: activeError } = await supabase
                .from("evaluations")
                .select("*", { count: "exact", head: true })
                .eq("status", "in_progress");
            if (activeError) throw activeError;
            activeEvaluationsCount = activeCount ?? 0;

            const { count: vendorsCount, error: vendorsError } = await supabase
                .from("vendors")
                .select("*", { count: "exact", head: true });
            if (vendorsError) throw vendorsError;
            registeredVendorsCount = vendorsCount ?? 0;

            const { count: completedCount, error: completedError } = await supabase
                .from("evaluations")
                .select("*", { count: "exact", head: true })
                .eq("status", "completed");
            if (completedError) throw completedError;
            completedEvaluationsCount = completedCount ?? 0;

            const { count: pendingCount, error: pendingError } = await supabase
                .from("evaluations")
                .select("*", { count: "exact", head: true })
                .eq("status", "pending_review");
            if (pendingError) throw pendingError;
            pendingActionsCount = pendingCount ?? 0;

        } else if (userVendorId) {
            // Non-Admin with Vendor ID: Fetch filtered stats using evaluation_vendors

            // Active Evaluations for this vendor
            const { count: activeCount, error: activeError } = await supabase
                .from("evaluation_vendors")
                .select(`
                    evaluations!inner ( status )
                `, { count: "exact", head: true })
                .eq("vendor_id", userVendorId)
                .eq("evaluations.status", "in_progress");
            if (activeError) throw activeError;
            activeEvaluationsCount = activeCount ?? 0;

            // Registered Vendors: Represents the user's own vendor in this context.
            registeredVendorsCount = 1; // User has a vendor ID, so their vendor is "registered" in this context.

            // Completed Evaluations for this vendor
            const { count: completedCount, error: completedError } = await supabase
                .from("evaluation_vendors")
                .select(`
                    evaluations!inner ( status )
                `, { count: "exact", head: true })
                .eq("vendor_id", userVendorId)
                .eq("evaluations.status", "completed");
            if (completedError) throw completedError;
            completedEvaluationsCount = completedCount ?? 0;

            // Pending Actions for this vendor
            const { count: pendingCount, error: pendingError } = await supabase
                .from("evaluation_vendors")
                .select(`
                    evaluations!inner ( status )
                `, { count: "exact", head: true })
                .eq("vendor_id", userVendorId)
                .eq("evaluations.status", "pending_review");
            if (pendingError) throw pendingError;
            pendingActionsCount = pendingCount ?? 0;

        } else {
            // Non-Admin without Vendor ID: Show 0 for all stats
            console.warn(`User ${user.id} is not an admin and has no vendor_id.`);
            // Counts remain 0 as initialized
            registeredVendorsCount = 0; // Explicitly set to 0
        }

        return NextResponse.json({
            activeEvaluations: activeEvaluationsCount,
            registeredVendors: registeredVendorsCount,
            completedEvaluations: completedEvaluationsCount,
            pendingActions: pendingActionsCount,
        });
    } catch (error) {
        console.error("Error fetching dashboard stats:", error);
        const errorMessage = error instanceof Error ? error.message : "Internal Server Error";
        return NextResponse.json(
            { error: `Internal Server Error: ${errorMessage}` },
            { status: 500 }
        );
    }
} 