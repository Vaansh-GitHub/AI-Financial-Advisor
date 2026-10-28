import { describe, it, expect } from "vitest";
import { evaluateSuitabilityGuardrails } from "../lib/suitability/rules";

describe("Suitability and Guardrails Rules Engine", () => {
  it("blocks plan when client profile is incomplete or income is zero", () => {
    const result = evaluateSuitabilityGuardrails({
      client: {
        profileCompletionStatus: "INCOMPLETE",
        monthlyIncome: 0,
        monthlyExpenses: 0,
        emergencyFundAmount: 0,
        monthlyEMI: 0,
      },
    });

    expect(result.isBlocked).toBe(true);
    const blockedFinding = result.findings.find((f) => f.ruleId === "RULE_INCOMPLETE_PROFILE");
    expect(blockedFinding).toBeDefined();
    expect(blockedFinding?.severity).toBe("BLOCKED");
  });

  it("blocks high small-cap allocation for senior citizen/retiree", () => {
    const result = evaluateSuitabilityGuardrails({
      client: {
        age: 68,
        monthlyIncome: 35000,
        monthlyExpenses: 60000,
        emergencyFundAmount: 500000,
        monthlyEMI: 0,
        profileCompletionStatus: "COMPLETE",
      },
      portfolioAllocation: {
        equityPercent: 70,
        debtPercent: 30,
        smallCapPercent: 35, // Prohibited for retiree!
      },
    });

    expect(result.isBlocked).toBe(true);
    const smallCapBlocked = result.findings.find((f) => f.ruleId === "RULE_RETIREE_SMALLCAP_BLOCKED");
    expect(smallCapBlocked).toBeDefined();
    expect(smallCapBlocked?.severity).toBe("BLOCKED");
  });

  it("blocks proposals demanding guaranteed high returns", () => {
    const result = evaluateSuitabilityGuardrails({
      client: {
        age: 30,
        monthlyIncome: 100000,
        monthlyExpenses: 40000,
        emergencyFundAmount: 200000,
        monthlyEMI: 10000,
        financialNotes: "Client demands guaranteed 20% annual returns without downside risk.",
        profileCompletionStatus: "COMPLETE",
      },
      portfolioAllocation: {
        equityPercent: 60,
        debtPercent: 40,
      },
    });

    expect(result.isBlocked).toBe(true);
    const guaranteedFinding = result.findings.find((f) => f.ruleId === "RULE_UNREALISTIC_GUARANTEED_RETURNS");
    expect(guaranteedFinding).toBeDefined();
  });

  it("flags high risk when equity allocation is high for short horizon goals", () => {
    const result = evaluateSuitabilityGuardrails({
      client: {
        age: 32,
        monthlyIncome: 120000,
        monthlyExpenses: 50000,
        emergencyFundAmount: 300000,
        monthlyEMI: 0,
        profileCompletionStatus: "COMPLETE",
      },
      goals: [
        {
          title: "Car Purchase",
          targetHorizonYears: 1.5, // Short horizon (<3 years)
          currentCost: 800000,
          priority: "HIGH",
        },
      ],
      portfolioAllocation: {
        equityPercent: 70, // Inappropriate for 1.5 year goal
        debtPercent: 30,
      },
    });

    expect(result.hasHighRisk).toBe(true);
    const horizonMismatch = result.findings.find((f) => f.ruleId === "RULE_HORIZON_MISMATCH");
    expect(horizonMismatch).toBeDefined();
    expect(horizonMismatch?.severity).toBe("HIGH_RISK");
  });
});
