import { describe, it, expect } from "vitest";
import { validateStatusTransition } from "../lib/approvals/workflow";

describe("Approval Workflow State Machine", () => {
  it("permits standard transition from DRAFT to PENDING_REVIEW", () => {
    const result = validateStatusTransition("DRAFT", "SUBMIT_FOR_REVIEW", false, "adviser");
    expect(result.allowed).toBe(true);
    expect(result.nextStatus).toBe("PENDING_REVIEW");
  });

  it("permits approval only when plan is in PENDING_REVIEW", () => {
    // Attempting to approve a DRAFT plan directly is forbidden
    const fromDraft = validateStatusTransition("DRAFT", "APPROVE", false, "adviser");
    expect(fromDraft.allowed).toBe(false);

    // Permitted when in PENDING_REVIEW
    const fromPending = validateStatusTransition("PENDING_REVIEW", "APPROVE", false, "adviser");
    expect(fromPending.allowed).toBe(true);
    expect(fromPending.nextStatus).toBe("APPROVED");
  });

  it("CRITICAL RULE: Strictly prohibits approval when suitability guardrails are BLOCKED", () => {
    const result = validateStatusTransition(
      "PENDING_REVIEW",
      "APPROVE",
      true, // isBlockedBySuitability = true!
      "adviser"
    );
    expect(result.allowed).toBe(false);
    expect(result.errorMessage).toContain("Approval is blocked");
  });

  it("CRITICAL RULE: Invalidates approval and forces re-review when an approved plan is edited materially", () => {
    const result = validateStatusTransition(
      "APPROVED",
      "EDIT_PLAN",
      false,
      "adviser"
    );
    expect(result.allowed).toBe(true);
    expect(result.requiresReapproval).toBe(true);
    expect(result.nextStatus).toBe("DRAFT");
  });

  it("permits change requests and rejections from PENDING_REVIEW", () => {
    const changes = validateStatusTransition("PENDING_REVIEW", "REQUEST_CHANGES", false, "adviser");
    expect(changes.allowed).toBe(true);
    expect(changes.nextStatus).toBe("CHANGES_REQUESTED");

    const rejection = validateStatusTransition("PENDING_REVIEW", "REJECT", false, "adviser");
    expect(rejection.allowed).toBe(true);
    expect(rejection.nextStatus).toBe("REJECTED");
  });
});
