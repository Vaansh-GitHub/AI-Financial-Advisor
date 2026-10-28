import { NextResponse } from "next/server";
import { getPlanById, updatePlan } from "@/lib/db/repo";
import { getCurrentUser } from "@/lib/auth/session";
import { logAuditEvent } from "@/lib/audit/logger";
import { validateStatusTransition, PlanStatus } from "@/lib/approvals/workflow";
import { PlanApprovalActionSchema } from "@/lib/validation/schemas";

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

    const body = await req.json();
    const parsed = PlanApprovalActionSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { action, reasonNotes } = parsed.data;

    // Validate state transition through governance engine
    const validation = validateStatusTransition(
      plan.status as PlanStatus,
      action,
      plan.isBlockedBySuitability,
      user?.role || "adviser"
    );

    if (!validation.allowed) {
      return NextResponse.json(
        { error: validation.errorMessage || "Status transition not permitted" },
        { status: 403 }
      );
    }

    const nextStatus = validation.nextStatus!;
    const approvalHistory = [...(plan.approvalHistory || [])];

    approvalHistory.push({
      decision: action === "SUBMIT_FOR_REVIEW" ? "SUBMITTED" : action,
      actorId: user?.userId || "adviser_default",
      actorName: user?.name || "Priya Sharma, CFA",
      actorRole: user?.role || "adviser",
      planVersion: plan.version || 1,
      reasonNotes,
      timestamp: new Date().toISOString(),
    });

    const updateFields: any = {
      status: nextStatus,
      approvalHistory,
    };

    if (action === "APPROVE") {
      updateFields.approvedAt = new Date().toISOString();
      updateFields.approvedBy = user?.name || "Priya Sharma, CFA";
    }

    const updated = await updatePlan(params.id, updateFields);

    let auditAction: any = "PLAN_SUBMITTED_FOR_REVIEW";
    if (action === "APPROVE") auditAction = "PLAN_APPROVED";
    else if (action === "REJECT") auditAction = "PLAN_REJECTED";
    else if (action === "REQUEST_CHANGES") auditAction = "PLAN_CHANGES_REQUESTED";

    await logAuditEvent({
      actorId: user?.userId || "adviser_default",
      actorName: user?.name || "Priya Sharma, CFA",
      actorRole: user?.role || "adviser",
      action: auditAction,
      entityType: "PLAN",
      entityId: params.id,
      metadata: { previousStatus: plan.status, nextStatus, reasonNotes },
    });

    return NextResponse.json({
      success: true,
      message: `Plan status successfully transitioned to ${nextStatus}`,
      data: updated,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to execute action" }, { status: 500 });
  }
}
