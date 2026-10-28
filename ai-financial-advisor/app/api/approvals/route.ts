import { NextResponse } from "next/server";
import { getPlans, getClientById } from "@/lib/db/repo";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status") || undefined;

    const allPlans = await getPlans({ status });

    // Enrich with client details
    const enriched = await Promise.all(
      allPlans.map(async (p) => {
        const client = await getClientById(p.clientId);
        return {
          ...p,
          clientName: client?.fullName || p.clientName,
          clientCity: client?.city || "—",
          clientAge: client?.age,
          riskCategory: client?.riskProfile?.combinedCategory || "BALANCED",
        };
      })
    );

    return NextResponse.json({
      success: true,
      count: enriched.length,
      data: enriched,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to fetch approvals queue" }, { status: 500 });
  }
}
