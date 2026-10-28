import { NextResponse } from "next/server";
import { getGoalsByClientId, createGoal, getClientById } from "@/lib/db/repo";
import { GoalFormSchema } from "@/lib/validation/schemas";
import { calculateGoalPlan } from "@/lib/finance/calculations";
import { getCurrentUser } from "@/lib/auth/session";
import { logAuditEvent } from "@/lib/audit/logger";

export async function GET(
  req: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const params = await props.params;
    const goals = await getGoalsByClientId(params.id);
    return NextResponse.json({ success: true, count: goals.length, data: goals });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to fetch goals" }, { status: 500 });
  }
}

export async function POST(
  req: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const params = await props.params;
    const user = await getCurrentUser();
    const body = await req.json();

    const client = await getClientById(params.id);
    if (!client) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    const parsed = GoalFormSchema.safeParse({ ...body, clientId: params.id });
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const data = parsed.data;

    // Run deterministic calculation engine
    const calc = calculateGoalPlan({
      currentCost: data.currentCost,
      targetHorizonYears: data.targetHorizonYears,
      expectedInflationRate: data.expectedInflationRate,
      expectedAnnualReturn: data.expectedAnnualReturn,
      existingSavings: data.existingSavings,
      currentMonthlyContribution: data.currentMonthlyContribution,
    });

    const newGoal = await createGoal({
      ...data,
      clientId: params.id,
      calculationResults: {
        inflationAdjustedCost: calc.inflationAdjustedCost,
        futureValueOfExistingSavings: calc.futureValueOfExistingSavings,
        corpusShortfall: calc.corpusShortfall,
        requiredMonthlySIP: calc.requiredMonthlySIP,
        monthlySurplusOrShortfall: calc.monthlySurplusOrShortfall,
        feasibilityStatus: calc.feasibilityStatus,
        calculatedAt: new Date().toISOString(),
      },
    });

    await logAuditEvent({
      actorId: user?.userId || "system",
      actorName: user?.name || "Priya Sharma, CFA",
      actorRole: user?.role || "adviser",
      action: "GOAL_CREATED",
      entityType: "GOAL",
      entityId: String(newGoal._id),
      metadata: { goalTitle: newGoal.title, requiredSIP: calc.requiredMonthlySIP },
    });

    return NextResponse.json({ success: true, data: newGoal }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to create goal" }, { status: 500 });
  }
}
