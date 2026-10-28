import { NextResponse } from "next/server";
import { getClientById, updateClient } from "@/lib/db/repo";
import { RiskQuestionnaireSchema } from "@/lib/validation/schemas";
import { evaluateRiskProfile } from "@/lib/risk/scoring";
import { getCurrentUser } from "@/lib/auth/session";
import { logAuditEvent } from "@/lib/audit/logger";

export async function GET(
  req: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const params = await props.params;
    const client = await getClientById(params.id);
    if (!client) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: client.riskProfile || null,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to fetch risk assessment" }, { status: 500 });
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

    const parsed = RiskQuestionnaireSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    // Evaluate Risk Profile using deterministic engine
    const assessment = evaluateRiskProfile(
      {
        monthlyIncome: client.monthlyIncome,
        monthlyExpenses: client.monthlyExpenses,
        existingSavings: client.existingSavings,
        emergencyFundAmount: client.emergencyFundAmount,
        monthlyEMI: client.monthlyEMI,
        numberOfDependants: client.numberOfDependants,
        investmentHorizonYears: client.investmentHorizonYears,
        employmentType: client.employmentType,
        liquidityNeeds: "medium",
      },
      parsed.data
    );

    // Save updated risk profile to client record
    const updatedClient = await updateClient(params.id, {
      riskProfile: {
        capacityScore: assessment.capacityScore,
        capacityLevel: assessment.capacityLevel,
        toleranceScore: assessment.toleranceScore,
        toleranceLevel: assessment.toleranceLevel,
        combinedCategory: assessment.combinedCategory,
        hasConflict: assessment.hasConflict,
        conflictRationale: assessment.conflictDetails?.description || "",
        questionnaireResponses: parsed.data as any,
        lastAssessedAt: assessment.calculatedAt,
      },
    });

    await logAuditEvent({
      actorId: user?.userId || "system",
      actorName: user?.name || "Priya Sharma, CFA",
      actorRole: user?.role || "adviser",
      action: "RISK_ASSESSMENT_COMPLETED",
      entityType: "CLIENT",
      entityId: params.id,
      metadata: {
        combinedCategory: assessment.combinedCategory,
        hasConflict: assessment.hasConflict,
        capacityScore: assessment.capacityScore,
        toleranceScore: assessment.toleranceScore,
      },
    });

    return NextResponse.json({
      success: true,
      assessment,
      client: updatedClient,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to submit risk assessment" }, { status: 500 });
  }
}
