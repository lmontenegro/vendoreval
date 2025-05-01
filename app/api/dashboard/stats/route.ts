import { createServerClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function GET() {
    const supabase = createServerClient();

    try {
        // Fetch active evaluations count
        const { count: activeEvaluationsCount, error: activeError } = await supabase
            .from("evaluations")
            .select("*", { count: "exact", head: true })
            .eq("status", "in_progress");

        if (activeError) throw activeError;

        // Fetch registered vendors count
        const { count: registeredVendorsCount, error: vendorsError } = await supabase
            .from("vendors")
            .select("*", { count: "exact", head: true });

        if (vendorsError) throw vendorsError;

        // Fetch completed evaluations count
        const { count: completedEvaluationsCount, error: completedError } = await supabase
            .from("evaluations")
            .select("*", { count: "exact", head: true })
            .eq("status", "completed");

        if (completedError) throw completedError;

        // Fetch pending actions count (assuming 'pending_review' status)
        const { count: pendingActionsCount, error: pendingError } = await supabase
            .from("evaluations")
            .select("*", { count: "exact", head: true })
            .eq("status", "pending_review"); // Adjust status if needed

        if (pendingError) throw pendingError;

        return NextResponse.json({
            activeEvaluations: activeEvaluationsCount ?? 0,
            registeredVendors: registeredVendorsCount ?? 0,
            completedEvaluations: completedEvaluationsCount ?? 0,
            pendingActions: pendingActionsCount ?? 0,
        });
    } catch (error) {
        console.error("Error fetching dashboard stats:", error);
        return NextResponse.json(
            { error: "Internal Server Error" },
            { status: 500 }
        );
    }
} 