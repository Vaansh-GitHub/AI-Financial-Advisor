import { describe, it, expect } from "vitest";
import {
  calculateInflationAdjustedCost,
  calculateFutureValueOfSavings,
  calculateRequiredMonthlySIP,
  calculateGoalPlan,
  suggestAssetAllocation,
  generateGlidePath,
} from "../lib/finance/calculations";

describe("Financial Calculation Engine", () => {
  it("calculates inflation-adjusted future corpus correctly", () => {
    // Current cost ₹10 Lakhs, 6% inflation over 10 years
    // FV = 1,000,000 * (1.06)^10 = ~1,790,848
    const result = calculateInflationAdjustedCost(1000000, 0.06, 10);
    expect(result).toBeCloseTo(1790848, -2);
  });

  it("handles zero inflation, zero horizon, and negative values safely", () => {
    expect(calculateInflationAdjustedCost(500000, 0, 10)).toBe(500000);
    expect(calculateInflationAdjustedCost(500000, 0.07, 0)).toBe(500000);
    expect(calculateInflationAdjustedCost(0, 0.07, 10)).toBe(0);
    expect(calculateInflationAdjustedCost(-100, 0.07, 10)).toBe(0);
  });

  it("calculates future value of existing investments accurately", () => {
    // ₹5 Lakhs at 12% p.a. over 5 years
    // FV = 500,000 * (1.12)^5 = ~881,171
    const result = calculateFutureValueOfSavings(500000, 0.12, 5);
    expect(result).toBeCloseTo(881171, -2);
  });

  it("calculates required monthly SIP for advance annuity (beginning of month)", () => {
    // Shortfall: ₹10,00,000 over 5 years (60 months) at 12% annual return
    const sip = calculateRequiredMonthlySIP(1000000, 0.12, 5, "beginning_of_period");
    // Should be around ₹12,126
    expect(sip).toBeGreaterThan(11500);
    expect(sip).toBeLessThan(12500);
  });

  it("handles zero return rate in monthly SIP safely (straight-line division)", () => {
    // ₹12,00,000 over 10 years (120 months) at 0% return -> exactly ₹10,000/month
    const sip = calculateRequiredMonthlySIP(1200000, 0, 10);
    expect(sip).toBe(10000);
  });

  it("handles zero horizon in monthly SIP safely", () => {
    // Zero horizon requires full immediate funding
    const sip = calculateRequiredMonthlySIP(500000, 0.12, 0);
    expect(sip).toBe(500000);
  });

  it("produces full goal plan calculation with shortfall and feasibility", () => {
    const plan = calculateGoalPlan({
      currentCost: 2000000,
      targetHorizonYears: 10,
      expectedInflationRate: 0.06,
      expectedAnnualReturn: 0.12,
      existingSavings: 300000,
      currentMonthlyContribution: 15000,
      sipTiming: "beginning_of_period",
    });

    expect(plan.inflationAdjustedCost).toBeGreaterThan(3500000);
    expect(plan.futureValueOfExistingSavings).toBeGreaterThan(900000);
    expect(plan.corpusShortfall).toBe(plan.inflationAdjustedCost - plan.futureValueOfExistingSavings);
    expect(plan.requiredMonthlySIP).toBeGreaterThan(0);
    expect(["ON_TRACK", "EXCEEDING_TARGET", "STRETCH_REQUIRED", "UNDERFUNDED"]).toContain(plan.feasibilityStatus);
  });

  it("suggests appropriate asset allocation based on horizon and risk category", () => {
    // Short horizon (<2 years) must be 0% equity
    const ultraShort = suggestAssetAllocation(1, "BALANCED");
    expect(ultraShort.equityPercent).toBe(0);
    expect(ultraShort.debtPercent).toBeGreaterThanOrEqual(80);

    // Long horizon (>10 years) with aggressive profile
    const longAggressive = suggestAssetAllocation(12, "AGGRESSIVE");
    expect(longAggressive.equityPercent).toBeGreaterThanOrEqual(80);

    // Medium horizon (5 years) with conservative profile
    const medConservative = suggestAssetAllocation(5, "CONSERVATIVE");
    expect(medConservative.debtPercent).toBeGreaterThan(medConservative.equityPercent);
  });

  it("generates progressive glide path reducing equity exposure in the final 3-5 years", () => {
    const steps = generateGlidePath(10, 70);
    expect(steps.length).toBe(11);

    // Year 0 (10 years remaining): accumulation phase, high equity
    expect(steps[0].equityPercent).toBe(70);
    expect(steps[0].phase).toBe("ACCUMULATION");

    // Year 10 (0-1 years remaining): preservation phase, low equity <= 15%
    const finalStep = steps[steps.length - 1];
    expect(finalStep.equityPercent).toBeLessThanOrEqual(15);
    expect(finalStep.phase).toBe("PRESERVATION");
  });
});
