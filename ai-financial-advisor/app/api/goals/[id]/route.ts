import { NextResponse } from "next/server";
import { updateGoal, deleteGoal } from "@/lib/db/repo";
import { GoalFormSchema } from "@/lib/validation/schemas";
import { calculateGoalPlan } from "@/lib/finance/calculations";
import { getCurrentUser } from "@/lib/auth/session";
import { logAuditEvent } from "@/lib/audit/logger";

export async function PATCH(
  req: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const params = await props.params;
    const user = await getCurrentUser();
    const body = await req.json();

    const parsed = GoalFormSchema.partial().safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const data = parsed.data;
    let calculationResults = undefined;

    if (data.currentCost && data.targetHorizonYears) {
      const calc = calculateGoalPlan({
        currentCost: data.currentCost,
        targetHorizonYears: data.targetHorizonYears,
        expectedInflationRate: data.expectedInflationRate || 0.06,
        expectedAnnualReturn: data.expectedAnnualReturn || 0.12,
        existingSavings: data.existingSavings || 0,
        currentMonthlyContribution: data.currentMonthlyContribution || 0,
      });
      calculationResults = {
        inflationAdjustedCost: calc.inflationAdjustedCost,
        futureValueOfExistingSavings: calc.futureValueOfExistingSavings,
        corpusShortfall: calc.corpusShortfall,
        requiredMonthlySIP: calc.requiredMonthlySIP,
        monthlySurplusOrShortfall: calc.monthlySurplusOrShortfall,
        feasibilityStatus: calc.feasibilityStatus,
        calculatedAt: new Date().toISOString(),
      };
    }

    const updated = await updateGoal(params.id, {
      ...data,
      ...(calculationResults ? { calculationResults } : {}),
    });

    await logAuditEvent({
      actorId: user?.userId || "system",
      actorName: user?.name || "Priya Sharma, CFA",
      actorRole: user?.role || "adviser",
      action: "GOAL_UPDATED",
      entityType: "GOAL",
      entityId: params.id,
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to update goal" }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const params = await props.params;
    const user = await getCurrentUser();
    await deleteGoal(params.id);

    await logAuditEvent({
      actorId: user?.userId || "system",
      actorName: user?.name || "Priya Sharma, CFA",
      actorRole: user?.role || "adviser",
      action: "GOAL_DELETED",
      entityType: "GOAL",
      entityId: params.id,
    });

    return NextResponse.json({ success: true, message: "Goal deleted successfully" });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to delete goal" }, { status: 500 });
  }
}
