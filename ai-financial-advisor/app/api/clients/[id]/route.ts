import { NextResponse } from "next/server";
import { getClientById, updateClient, deleteClient, getGoalsByClientId, getPlans } from "@/lib/db/repo";
import { ClientFormSchema } from "@/lib/validation/schemas";
import { getCurrentUser } from "@/lib/auth/session";
import { logAuditEvent } from "@/lib/audit/logger";
import { calculateRiskCapacity } from "@/lib/risk/scoring";

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

    const goals = await getGoalsByClientId(params.id);
    const plans = await getPlans({ clientId: params.id });

    return NextResponse.json({
      success: true,
      data: {
        ...client,
        goals,
        plans,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to fetch client" }, { status: 500 });
  }
}

export async function PATCH(
  req: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const params = await props.params;
    const user = await getCurrentUser();
    const body = await req.json();

    const existing = await getClientById(params.id);
    if (!existing) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    // Partial validation
    const parsed = ClientFormSchema.partial().safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const merged = { ...existing, ...parsed.data };

    // Recompute Risk Capacity
    const capacityResult = calculateRiskCapacity({
      monthlyIncome: merged.monthlyIncome,
      monthlyExpenses: merged.monthlyExpenses,
      existingSavings: merged.existingSavings,
      emergencyFundAmount: merged.emergencyFundAmount,
      monthlyEMI: merged.monthlyEMI,
      numberOfDependants: merged.numberOfDependants,
      investmentHorizonYears: merged.investmentHorizonYears,
      employmentType: merged.employmentType,
      liquidityNeeds: "medium",
    });

    const updatedRiskProfile = {
      ...(existing.riskProfile || {}),
      capacityScore: capacityResult.score,
      capacityLevel: capacityResult.level,
      lastAssessedAt: new Date().toISOString(),
    };

    const updated = await updateClient(params.id, {
      ...parsed.data,
      riskProfile: updatedRiskProfile as any,
    });

    await logAuditEvent({
      actorId: user?.userId || "system",
      actorName: user?.name || "Priya Sharma, CFA",
      actorRole: user?.role || "adviser",
      action: "CLIENT_UPDATED",
      entityType: "CLIENT",
      entityId: params.id,
      metadata: { changes: Object.keys(parsed.data) },
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to update client" }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const params = await props.params;
    const user = await getCurrentUser();
    const existing = await getClientById(params.id);
    if (!existing) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    await deleteClient(params.id);

    await logAuditEvent({
      actorId: user?.userId || "system",
      actorName: user?.name || "Priya Sharma, CFA",
      actorRole: user?.role || "adviser",
      action: "CLIENT_DELETED",
      entityType: "CLIENT",
      entityId: params.id,
      metadata: { clientName: existing.fullName },
    });

    return NextResponse.json({ success: true, message: "Client deleted successfully" });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to delete client" }, { status: 500 });
  }
}
