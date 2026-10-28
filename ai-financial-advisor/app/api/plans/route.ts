import { NextResponse } from "next/server";
import { getPlans, createPlan, getClientById } from "@/lib/db/repo";
import { getCurrentUser } from "@/lib/auth/session";
import { logAuditEvent } from "@/lib/audit/logger";
import { evaluateSuitabilityGuardrails } from "@/lib/suitability/rules";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const clientId = searchParams.get("clientId") || undefined;
    const status = searchParams.get("status") || undefined;

    const plans = await getPlans({ clientId, status });
    return NextResponse.json({ success: true, count: plans.length, data: plans });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to fetch plans" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    const body = await req.json();

    const {
      clientId,
      planTitle = "Comprehensive Wealth Advisory Plan",
      goals = [],
      recommendedAllocation = { equityPercent: 60, debtPercent: 35, goldOrCashPercent: 5 },
      fundSelections = [],
      calculatedMetrics = { totalTargetCorpus: 0, totalMonthlySIP: 0 },
    } = body;

    const client = await getClientById(clientId);
    if (!client) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    // Run deterministic suitability checks
    const guardrailResult = evaluateSuitabilityGuardrails({
      client: {
        age: client.age,
        monthlyIncome: client.monthlyIncome,
        monthlyExpenses: client.monthlyExpenses,
        emergencyFundAmount: client.emergencyFundAmount,
        monthlyEMI: client.monthlyEMI,
        financialNotes: client.financialNotes,
      },
      riskProfile: client.riskProfile as any,
      goals: goals.map((g: any) => ({
        title: g.title,
        targetHorizonYears: g.targetHorizonYears || 5,
        currentCost: g.targetCost || 100000,
        priority: "HIGH",
      })),
      portfolioAllocation: {
        equityPercent: recommendedAllocation.equityPercent,
        debtPercent: recommendedAllocation.debtPercent,
        singleSchemeMaxAllocation: Math.max(...fundSelections.map((f: any) => f.weightPercent || 0), 0),
      },
    });

    const newPlan = await createPlan({
      clientId,
      clientName: client.fullName,
      planTitle,
      version: 1,
      status: guardrailResult.isBlocked ? "BLOCKED" : "DRAFT",
      goals,
      recommendedAllocation,
      fundSelections,
      calculatedMetrics,
      suitabilityFindings: guardrailResult.findings as any,
      isBlockedBySuitability: guardrailResult.isBlocked,
      approvalHistory: [
        {
          decision: "SUBMITTED",
          actorId: user?.userId || "adviser_default",
          actorName: user?.name || "Priya Sharma, CFA",
          actorRole: user?.role || "adviser",
          planVersion: 1,
          reasonNotes: "Initial draft generated.",
          timestamp: new Date().toISOString(),
        },
      ],
    });

    await logAuditEvent({
      actorId: user?.userId || "system",
      actorName: user?.name || "Priya Sharma, CFA",
      actorRole: user?.role || "adviser",
      action: "PLAN_CREATED",
      entityType: "PLAN",
      entityId: String(newPlan._id),
      metadata: { planTitle: newPlan.planTitle, clientName: client.fullName },
    });

    return NextResponse.json({ success: true, data: newPlan }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to create plan" }, { status: 500 });
  }
}
