/**
 * Approval Workflow Engine
 * Enforces server-side financial plan state transitions, audit logging, and guardrails.
 */

export type PlanStatus =
  | "DRAFT"
  | "PENDING_REVIEW"
  | "APPROVED"
  | "CHANGES_REQUESTED"
  | "REJECTED"
  | "BLOCKED";

export interface PlanApprovalRecord {
  decision: "SUBMITTED" | "APPROVED" | "REJECTED" | "CHANGES_REQUESTED" | "RESET_ON_CHANGE";
  actorId: string;
  actorName: string;
  actorRole: "adviser" | "admin";
  planVersion: number;
  reasonNotes?: string;
  timestamp: string;
}

export interface TransitionValidationResult {
  allowed: boolean;
  nextStatus?: PlanStatus;
  errorMessage?: string;
  requiresReapproval?: boolean;
}

/**
 * Validates whether a proposed status transition is permitted under governance rules
 */
export function validateStatusTransition(
  currentStatus: PlanStatus,
  targetAction: "SUBMIT_FOR_REVIEW" | "APPROVE" | "REJECT" | "REQUEST_CHANGES" | "EDIT_PLAN",
  isBlockedBySuitability: boolean,
  userRole: "adviser" | "admin"
): TransitionValidationResult {
  // If suitability engine flagged BLOCKED rules, approval is strictly forbidden
  if (targetAction === "APPROVE" && isBlockedBySuitability) {
    return {
      allowed: false,
      errorMessage: "Approval is blocked: One or more critical suitability rules are violated. Resolve all BLOCKED findings before approving.",
    };
  }

  switch (targetAction) {
    case "SUBMIT_FOR_REVIEW":
      if (currentStatus === "APPROVED") {
        return {
          allowed: false,
          errorMessage: "Plan is already approved. Modify the plan to create a new draft version.",
        };
      }
      return {
        allowed: true,
        nextStatus: isBlockedBySuitability ? "BLOCKED" : "PENDING_REVIEW",
      };

    case "APPROVE":
      if (currentStatus !== "PENDING_REVIEW") {
        return {
          allowed: false,
          errorMessage: `Cannot approve a plan with status '${currentStatus}'. Plan must be in 'PENDING_REVIEW' state.`,
        };
      }
      return {
        allowed: true,
        nextStatus: "APPROVED",
      };

    case "REJECT":
      if (currentStatus !== "PENDING_REVIEW") {
        return {
          allowed: false,
          errorMessage: `Cannot reject a plan with status '${currentStatus}'. Plan must be in 'PENDING_REVIEW' state.`,
        };
      }
      return {
        allowed: true,
        nextStatus: "REJECTED",
      };

    case "REQUEST_CHANGES":
      if (currentStatus !== "PENDING_REVIEW") {
        return {
          allowed: false,
          errorMessage: `Cannot request changes on a plan with status '${currentStatus}'. Plan must be in 'PENDING_REVIEW' state.`,
        };
      }
      return {
        allowed: true,
        nextStatus: "CHANGES_REQUESTED",
      };

    case "EDIT_PLAN":
      // If an APPROVED plan is edited materially, it MUST lose its approved status!
      if (currentStatus === "APPROVED") {
        return {
          allowed: true,
          nextStatus: "DRAFT",
          requiresReapproval: true,
        };
      }
      return {
        allowed: true,
        nextStatus: currentStatus,
      };

    default:
      return {
        allowed: false,
        errorMessage: "Unknown transition requested.",
      };
  }
}
