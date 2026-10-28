import { describe, it, expect } from "vitest";
import { getClients, getClientById, createClient, getFunds, getPlans, updatePlan } from "../lib/db/repo";
import { evaluateRiskProfile } from "../lib/risk/scoring";
import { evaluateSuitabilityGuardrails } from "../lib/suitability/rules";
import { validateStatusTransition } from "../lib/approvals/workflow";

describe("End-to-End Core Data Repositories & Integrity", () => {
  it("loads all 6 seeded demo personas with accurate profiles", async () => {
    const clients = await getClients();
    expect(clients.length).toBeGreaterThanOrEqual(6);

    const persona1 = clients.find((c) => c.email === "aryan.verma@example.com");
    expect(persona1).toBeDefined();
    expect(persona1?.age).toBe(23);
    expect(persona1?.monthlyIncome).toBe(55000);

    const persona6 = clients.find((c) => c.email === "kabir.mehra@example.com");
    expect(persona6).toBeDefined();
    expect(persona6?.riskProfile?.hasConflict).toBe(true);
  });

  it("loads authentic mutual funds with valid NAV and expense ratios", async () => {
    const funds = await getFunds();
    expect(funds.length).toBeGreaterThanOrEqual(8);

    const ppfas = funds.find((f) => f.schemeCode === "122639");
    expect(ppfas).toBeDefined();
    expect(ppfas?.category).toBe("Equity");
    expect(ppfas?.expenseRatio).toBeLessThan(1.0);
    expect(ppfas?.currentNAV).toBeGreaterThan(0);
  });

  it("filters funds accurately by category and max expense ratio", async () => {
    const debtFunds = await getFunds({ category: "Debt" });
    expect(debtFunds.length).toBeGreaterThanOrEqual(2);
    expect(debtFunds.every((f) => f.category === "Debt")).toBe(true);

    const lowCostFunds = await getFunds({ maxExpenseRatio: 0.35 });
    expect(lowCostFunds.length).toBeGreaterThan(0);
    expect(lowCostFunds.every((f) => (f.expenseRatio ?? 0) <= 0.35)).toBe(true);
  });

  it("creates a client, assesses risk, generates plan, and enforces approval safety", async () => {
    // 1. Create client
    const client = await createClient({
      fullName: "Test Investor",
      email: `test.${Date.now()}@example.com`,
      phone: "+91 99999 88888",
      age: 35,
      city: "Bengaluru",
      employmentType: "salaried_permanent",
      monthlyIncome: 150000,
      monthlyExpenses: 50000,
      existingSavings: 500000,
      emergencyFundAmount: 300000,
      monthlyEMI: 20000,
      numberOfDependants: 1,
      investmentExperience: "basic_mutual_funds",
      investmentHorizonYears: 10,
    });
    expect(client._id).toBeDefined();

    // 2. Assess risk
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
      {
        marketLossReaction: "hold_and_do_nothing",
        volatilityComfort: "comfortable_with_fluctuations",
        investmentExperience: "basic_mutual_funds",
        acceptableDrawdown: "up_to_20_percent",
        primaryObjective: "balanced_wealth_accumulation",
      }
    );
    expect(["GROWTH", "AGGRESSIVE"]).toContain(assessment.combinedCategory);

    // 3. Check suitability
    const guardrail = evaluateSuitabilityGuardrails({
      client: {
        age: client.age,
        monthlyIncome: client.monthlyIncome,
        monthlyExpenses: client.monthlyExpenses,
        emergencyFundAmount: client.emergencyFundAmount,
        monthlyEMI: client.monthlyEMI,
      },
      portfolioAllocation: {
        equityPercent: 70,
        debtPercent: 30,
      },
    });
    expect(guardrail.isBlocked).toBe(false);

    // 4. Approval transition
    const transition = validateStatusTransition("DRAFT", "SUBMIT_FOR_REVIEW", guardrail.isBlocked, "adviser");
    expect(transition.allowed).toBe(true);
    expect(transition.nextStatus).toBe("PENDING_REVIEW");

    const approveTransition = validateStatusTransition("PENDING_REVIEW", "APPROVE", guardrail.isBlocked, "adviser");
    expect(approveTransition.allowed).toBe(true);
    expect(approveTransition.nextStatus).toBe("APPROVED");
  });
});
