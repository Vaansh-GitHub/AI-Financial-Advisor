import { NextResponse } from "next/server";
import { getPlanById, updatePlan, getClientById } from "@/lib/db/repo";
import { getCurrentUser } from "@/lib/auth/session";
import { logAuditEvent } from "@/lib/audit/logger";
import { evaluateSuitabilityGuardrails } from "@/lib/suitability/rules";
import { validateStatusTransition } from "@/lib/approvals/workflow";

export async function GET(
  req: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const params = await props.params;
    const plan = await getPlanById(params.id);
    if (!plan) {
      return NextResponse.json({ error: "Plan not found" }, { status: 404 });
    }
    const client = await getClientById(plan.clientId);
    return NextResponse.json({ success: true, data: { ...plan, client } });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to fetch plan" }, { status: 500 });
  }
}

export async function PATCH(
  req: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const params = await props.params;
    const user = await getCurrentUser();
    const existingPlan = await getPlanById(params.id);
    if (!existingPlan) {
      return NextResponse.json({ error: "Plan not found" }, { status: 404 });
    }

    const body = await req.json();
    const client = await getClientById(existingPlan.clientId);

    const mergedAllocation = body.recommendedAllocation || existingPlan.recommendedAllocation;
    const mergedGoals = body.goals || existingPlan.goals;
    const mergedFundSelections = body.fundSelections || existingPlan.fundSelections;

    // Run suitability guardrails
    let guardrailResult = { isBlocked: false, findings: existingPlan.suitabilityFindings };
    if (client) {
      guardrailResult = evaluateSuitabilityGuardrails({
        client: {
          age: client.age,
          monthlyIncome: client.monthlyIncome,
          monthlyExpenses: client.monthlyExpenses,
          emergencyFundAmount: client.emergencyFundAmount,
          monthlyEMI: client.monthlyEMI,
          financialNotes: client.financialNotes,
        },
        riskProfile: client.riskProfile as any,
        goals: mergedGoals.map((g: any) => ({
          title: g.title,
          targetHorizonYears: g.targetHorizonYears || 5,
          currentCost: g.targetCost || 100000,
          priority: "HIGH",
        })),
        portfolioAllocation: {
          equityPercent: mergedAllocation.equityPercent,
          debtPercent: mergedAllocation.debtPercent,
          singleSchemeMaxAllocation: Math.max(
            ...mergedFundSelections.map((f: any) => f.weightPercent || 0),
            0
          ),
        },
      });
    }

    // Material change rule: if plan was APPROVED, invalidate approval!
    let nextStatus = existingPlan.status;
    let nextVersion = existingPlan.version;
    const approvalHistory = [...(existingPlan.approvalHistory || [])];

    if (existingPlan.status === "APPROVED") {
      const transition = validateStatusTransition("APPROVED", "EDIT_PLAN", guardrailResult.isBlocked, user?.role || "adviser");
      if (transition.requiresReapproval) {
        nextStatus = guardrailResult.isBlocked ? "BLOCKED" : "DRAFT";
        nextVersion = (existingPlan.version || 1) + 1;
        approvalHistory.push({
          decision: "RESET_ON_CHANGE",
          actorId: user?.userId || "system",
          actorName: user?.name || "Priya Sharma, CFA",
          actorRole: user?.role || "adviser",
          planVersion: nextVersion,
          reasonNotes: "Plan was materially modified after previous approval. Approval has been invalidated and re-review is required.",
          timestamp: new Date().toISOString(),
        });
      }
    } else if (guardrailResult.isBlocked) {
      nextStatus = "BLOCKED";
    }

    const updated = await updatePlan(params.id, {
      ...body,
      version: nextVersion,
      status: nextStatus,
      suitabilityFindings: guardrailResult.findings as any,
      isBlockedBySuitability: guardrailResult.isBlocked,
      approvalHistory,
    });

    await logAuditEvent({
      actorId: user?.userId || "system",
      actorName: user?.name || "Priya Sharma, CFA",
      actorRole: user?.role || "adviser",
      action: "PLAN_CALCULATED",
      entityType: "PLAN",
      entityId: params.id,
      metadata: { newVersion: nextVersion, status: nextStatus },
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to update plan" }, { status: 500 });
  }
}
