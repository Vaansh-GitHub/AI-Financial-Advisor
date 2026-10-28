import { describe, it, expect } from "vitest";
import {
  calculateRiskCapacity,
  calculateRiskTolerance,
  evaluateRiskProfile,
} from "../lib/risk/scoring";

describe("Risk Profiling Engine", () => {
  it("calculates high risk capacity for financially resilient profiles", () => {
    // High income, low debt, 10-year horizon, 6+ months emergency reserve
    const capacity = calculateRiskCapacity({
      monthlyIncome: 300000,
      monthlyExpenses: 80000,
      existingSavings: 4000000,
      emergencyFundAmount: 800000, // 10 months burn
      monthlyEMI: 0,
      numberOfDependants: 1,
      investmentHorizonYears: 10,
      employmentType: "salaried_permanent",
      liquidityNeeds: "low",
    });

    expect(capacity.score).toBeGreaterThanOrEqual(70);
    expect(capacity.level).toBe("HIGH");
    expect(capacity.warnings.length).toBe(0);
  });

  it("calculates low risk capacity when emergency fund is missing and debt is high", () => {
    // Low reserves, 60% EMI to income ratio
    const capacity = calculateRiskCapacity({
      monthlyIncome: 60000,
      monthlyExpenses: 25000,
      existingSavings: 20000,
      emergencyFundAmount: 10000, // < 1 month
      monthlyEMI: 36000, // 60% debt burden
      numberOfDependants: 2,
      investmentHorizonYears: 2,
      employmentType: "salaried_contract",
      liquidityNeeds: "high",
    });

    expect(capacity.score).toBeLessThan(40);
    expect(capacity.level).toBe("LOW");
    expect(capacity.warnings.length).toBeGreaterThan(0);
  });

  it("calculates risk tolerance based on questionnaire responses", () => {
    const aggressiveTol = calculateRiskTolerance({
      marketLossReaction: "buy_more_at_discount",
      volatilityComfort: "thrives_on_volatility",
      investmentExperience: "advanced_derivatives_or_active_trading",
      acceptableDrawdown: "greater_than_20_percent",
      primaryObjective: "aggressive_capital_growth",
    });
    expect(aggressiveTol.score).toBeGreaterThanOrEqual(80);
    expect(aggressiveTol.level).toBe("AGGRESSIVE");

    const conservativeTol = calculateRiskTolerance({
      marketLossReaction: "panic_sell_all",
      volatilityComfort: "very_uncomfortable",
      investmentExperience: "none_or_beginner",
      acceptableDrawdown: "zero_loss",
      primaryObjective: "capital_preservation",
    });
    expect(conservativeTol.score).toBeLessThan(40);
    expect(conservativeTol.level).toBe("CONSERVATIVE");
  });

  it("CRITICAL RULE: Constrains aggressive tolerance when financial capacity is low", () => {
    // Client expresses aggressive appetite, but has high debt, low emergency fund
    const assessment = evaluateRiskProfile(
      {
        monthlyIncome: 50000,
        monthlyExpenses: 30000,
        existingSavings: 20000,
        emergencyFundAmount: 10000,
        monthlyEMI: 25000, // 50% EMI
        numberOfDependants: 1,
        investmentHorizonYears: 2,
        employmentType: "salaried_contract",
        liquidityNeeds: "high",
      },
      {
        marketLossReaction: "buy_more_at_discount",
        volatilityComfort: "thrives_on_volatility",
        investmentExperience: "advanced_derivatives_or_active_trading",
        acceptableDrawdown: "greater_than_20_percent",
        primaryObjective: "aggressive_capital_growth",
      }
    );

    expect(assessment.hasConflict).toBe(true);
    expect(assessment.capacityLevel).toBe("LOW");
    expect(assessment.toleranceLevel).toBe("AGGRESSIVE");
    // SYSTEM MUST NOT ASSIGN AGGRESSIVE!
    expect(assessment.combinedCategory).not.toBe("AGGRESSIVE");
    expect(assessment.combinedCategory).toBe("MODERATELY_CONSERVATIVE");
    expect(assessment.conflictDetails?.type).toBe("CAPACITY_LOWER_THAN_TOLERANCE");
  });
});
