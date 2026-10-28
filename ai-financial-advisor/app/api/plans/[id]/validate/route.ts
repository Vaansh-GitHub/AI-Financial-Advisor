import { NextResponse } from "next/server";
import { getPlanById, getClientById, updatePlan } from "@/lib/db/repo";
import { evaluateSuitabilityGuardrails } from "@/lib/suitability/rules";
import { logAuditEvent } from "@/lib/audit/logger";
import { getCurrentUser } from "@/lib/auth/session";

export async function POST(
  req: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const params = await props.params;
    const user = await getCurrentUser();
    const plan = await getPlanById(params.id);
    if (!plan) {
      return NextResponse.json({ error: "Plan not found" }, { status: 404 });
    }

    const client = await getClientById(plan.clientId);
    if (!client) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

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
      goals: (plan.goals || []).map((g: any) => ({
        title: g.title,
        targetHorizonYears: g.targetHorizonYears || 5,
        currentCost: g.targetCost || 100000,
        priority: "HIGH",
      })),
      portfolioAllocation: {
        equityPercent: plan.recommendedAllocation?.equityPercent || 60,
        debtPercent: plan.recommendedAllocation?.debtPercent || 35,
        singleSchemeMaxAllocation: Math.max(
          ...(plan.fundSelections || []).map((f: any) => f.weightPercent || 0),
          0
        ),
      },
    });

    await updatePlan(params.id, {
      suitabilityFindings: guardrailResult.findings as any,
      isBlockedBySuitability: guardrailResult.isBlocked,
      status: guardrailResult.isBlocked ? "BLOCKED" : plan.status,
    });

    await logAuditEvent({
      actorId: user?.userId || "system",
      actorName: user?.name || "Priya Sharma, CFA",
      actorRole: user?.role || "adviser",
      action: "SUITABILITY_EVALUATED",
      entityType: "PLAN",
      entityId: params.id,
      metadata: {
        blockedCount: guardrailResult.summary.blockedCount,
        highRiskCount: guardrailResult.summary.highRiskCount,
      },
    });

    return NextResponse.json({
      success: true,
      validation: guardrailResult,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to validate plan" }, { status: 500 });
  }
}
