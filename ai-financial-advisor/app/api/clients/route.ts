import { NextResponse } from "next/server";
import { getClients, createClient } from "@/lib/db/repo";
import { ClientFormSchema } from "@/lib/validation/schemas";
import { getCurrentUser } from "@/lib/auth/session";
import { logAuditEvent } from "@/lib/audit/logger";
import { calculateRiskCapacity } from "@/lib/risk/scoring";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search") || undefined;
    const adviserId = searchParams.get("adviserId") || undefined;

    const clients = await getClients({ search, adviserId });
    return NextResponse.json({ success: true, count: clients.length, data: clients });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to fetch clients" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    const body = await req.json();

    const parsed = ClientFormSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const data = parsed.data;

    // Automatic initial Risk Capacity computation
    const capacityResult = calculateRiskCapacity({
      monthlyIncome: data.monthlyIncome,
      monthlyExpenses: data.monthlyExpenses,
      existingSavings: data.existingSavings,
      emergencyFundAmount: data.emergencyFundAmount,
      monthlyEMI: data.monthlyEMI,
      numberOfDependants: data.numberOfDependants,
      investmentHorizonYears: data.investmentHorizonYears,
      employmentType: data.employmentType,
      liquidityNeeds: "medium",
    });

    const newClient = await createClient({
      ...data,
      assignedAdviserId: user?.userId || "adviser_default",
      assignedAdviserName: user?.name || "Priya Sharma, CFA",
      profileCompletionStatus: "COMPLETE",
      riskProfile: {
        capacityScore: capacityResult.score,
        capacityLevel: capacityResult.level,
        toleranceScore: 50,
        toleranceLevel: "MODERATE",
        combinedCategory: capacityResult.level === "LOW" ? "CONSERVATIVE" : "BALANCED",
        hasConflict: false,
        conflictRationale: "Initial baseline assessment pending risk tolerance questionnaire.",
        lastAssessedAt: new Date().toISOString(),
      },
    });

    await logAuditEvent({
      actorId: user?.userId || "system",
      actorName: user?.name || "Priya Sharma, CFA",
      actorRole: user?.role || "adviser",
      action: "CLIENT_CREATED",
      entityType: "CLIENT",
      entityId: String(newClient._id),
      metadata: { clientName: newClient.fullName, email: newClient.email },
    });

    return NextResponse.json({ success: true, data: newClient }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to create client" }, { status: 500 });
  }
}
