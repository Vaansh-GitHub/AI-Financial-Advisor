/**
 * Deterministic Suitability & Guardrail Rules Engine
 * Independent of AI/LLM. Produces auditable structured findings.
 */

export type FindingSeverity = "INFO" | "WARNING" | "HIGH_RISK" | "BLOCKED";

export interface SuitabilityFinding {
  ruleId: string;
  severity: FindingSeverity;
  title: string;
  explanation: string;
  relatedEntity: "CLIENT" | "GOAL" | "PORTFOLIO" | "FUND" | "PLAN";
  evidence: Record<string, unknown>;
  recommendedAction: string;
  ruleVersion: string;
  timestamp: string;
}

export interface SuitabilityValidationContext {
  client: {
    age?: number;
    employmentType?: string;
    monthlyIncome: number;
    monthlyExpenses: number;
    emergencyFundAmount: number;
    monthlyEMI: number;
    profileCompletionStatus?: "INCOMPLETE" | "PARTIAL" | "COMPLETE";
    financialNotes?: string;
  };
  riskProfile?: {
    capacityLevel: "LOW" | "MODERATE" | "HIGH";
    toleranceLevel: "CONSERVATIVE" | "MODERATE" | "AGGRESSIVE";
    combinedCategory: string;
    hasConflict: boolean;
  };
  goals?: Array<{
    title: string;
    targetHorizonYears: number;
    currentCost: number;
    priority: "HIGH" | "MEDIUM" | "LOW";
    liquidityNeeds?: "low" | "medium" | "high";
    notes?: string;
  }>;
  portfolioAllocation?: {
    equityPercent: number;
    debtPercent: number;
    smallCapPercent?: number;
    singleSchemeMaxAllocation?: number;
  };
  funds?: Array<{
    schemeName: string;
    category: string;
    expenseRatio: number;
    dataFreshnessDays?: number;
    hasMissingObservations?: boolean;
  }>;
}

export const SUITABILITY_RULES_VERSION = "2.4.0";

export function evaluateSuitabilityGuardrails(
  ctx: SuitabilityValidationContext
): {
  isBlocked: boolean;
  hasHighRisk: boolean;
  findings: SuitabilityFinding[];
  summary: {
    blockedCount: number;
    highRiskCount: number;
    warningCount: number;
    infoCount: number;
  };
} {
  const findings: SuitabilityFinding[] = [];
  const now = new Date().toISOString();

  const addFinding = (
    ruleId: string,
    severity: FindingSeverity,
    title: string,
    explanation: string,
    relatedEntity: SuitabilityFinding["relatedEntity"],
    evidence: Record<string, unknown>,
    recommendedAction: string
  ) => {
    findings.push({
      ruleId,
      severity,
      title,
      explanation,
      relatedEntity,
      evidence,
      recommendedAction,
      ruleVersion: SUITABILITY_RULES_VERSION,
      timestamp: now,
    });
  };

  const { client, riskProfile, goals, portfolioAllocation, funds } = ctx;

  // 1. Missing Client Information (RULE_INCOMPLETE_PROFILE)
  if (client.profileCompletionStatus === "INCOMPLETE" || client.monthlyIncome <= 0) {
    addFinding(
      "RULE_INCOMPLETE_PROFILE",
      "BLOCKED",
      "Client Financial Profile Incomplete",
      "Mandatory financial profile data (income, living expenses, or verification status) is missing. Regulatory standards prohibit delivering formal financial recommendations without complete fact-finding.",
      "CLIENT",
      { profileStatus: client.profileCompletionStatus, monthlyIncome: client.monthlyIncome },
      "Complete client onboarding questionnaire, verify monthly income, and obtain KYC before proceeding."
    );
  }

  // 2. Inadequate Emergency Reserves (RULE_EMERGENCY_RESERVES)
  const monthlyBurn = (client.monthlyExpenses || 0) + (client.monthlyEMI || 0);
  const emergencyCoverageMonths = monthlyBurn > 0 ? (client.emergencyFundAmount || 0) / monthlyBurn : 0;
  if (emergencyCoverageMonths < 1.0 && monthlyBurn > 0) {
    addFinding(
      "RULE_EMERGENCY_RESERVES_CRITICAL",
      "HIGH_RISK",
      "Critically Low Emergency Reserves",
      `Client possesses only ${emergencyCoverageMonths.toFixed(1)} months of emergency buffer. Market downturns could force distress liquidation of equity investments.`,
      "CLIENT",
      { emergencyFund: client.emergencyFundAmount, monthlyBurn, coverageMonths: emergencyCoverageMonths },
      "Allocate initial monthly cash flows to an overnight or liquid fund until at least 3-6 months of expenses are secured."
    );
  } else if (emergencyCoverageMonths < 3.0 && monthlyBurn > 0) {
    addFinding(
      "RULE_EMERGENCY_RESERVES_LOW",
      "WARNING",
      "Sub-optimal Emergency Fund",
      `Emergency fund covers ${emergencyCoverageMonths.toFixed(1)} months of expenses (recommended minimum is 3 to 6 months).`,
      "CLIENT",
      { coverageMonths: emergencyCoverageMonths },
      "Incorporate an Emergency Fund goal to build up liquidity reserves alongside long-term SIPs."
    );
  }

  // 3. High Debt Burden (RULE_HIGH_DEBT_RATIO)
  if (client.monthlyIncome > 0) {
    const emiRatio = (client.monthlyEMI || 0) / client.monthlyIncome;
    if (emiRatio >= 0.50) {
      addFinding(
        "RULE_HIGH_DEBT_BURDEN",
        "HIGH_RISK",
        "Excessive Debt Service Obligation (>50% Income)",
        `Monthly EMI obligations consume ${(emiRatio * 100).toFixed(1)}% of net income, indicating significant financial fragility.`,
        "CLIENT",
        { monthlyEMI: client.monthlyEMI, monthlyIncome: client.monthlyIncome, emiRatio },
        "Prioritize debt reduction and liability refinancing prior to scaling speculative investment strategies."
      );
    } else if (emiRatio >= 0.35) {
      addFinding(
        "RULE_MODERATE_DEBT_BURDEN",
        "WARNING",
        "Elevated Debt-to-Income Ratio",
        `Debt service absorbs ${(emiRatio * 100).toFixed(1)}% of income. Discretionary savings capacity may be tight.`,
        "CLIENT",
        { emiRatio },
        "Monitor debt repayment schedules before committing to large recurring SIP commitments."
      );
    }
  }

  // 4. Retiree Aggressive Allocation Guardrail (RULE_RETIREE_SPECULATIVE_RISK)
  if (client.age && client.age >= 60) {
    if (portfolioAllocation && portfolioAllocation.equityPercent > 50) {
      addFinding(
        "RULE_RETIREE_HIGH_EQUITY",
        "HIGH_RISK",
        "Excessive Equity Exposure for Senior Citizen / Retiree",
        `Proposed asset allocation designates ${portfolioAllocation.equityPercent}% in equities for a client aged ${client.age}. Capital preservation and regular pension cash flows are at risk.`,
        "PORTFOLIO",
        { age: client.age, equityPercent: portfolioAllocation.equityPercent },
        "Reduce equity exposure to under 30-40% or utilize Conservative Hybrid / SWP-oriented debt funds."
      );
    }
    if (portfolioAllocation && (portfolioAllocation.smallCapPercent || 0) > 20) {
      addFinding(
        "RULE_RETIREE_SMALLCAP_BLOCKED",
        "BLOCKED",
        "Prohibited High Small-Cap Exposure for Retiree",
        `A high small-cap allocation (${portfolioAllocation.smallCapPercent}%) for a retiree violates fiduciary safety standards due to severe drawdown and illiquidity risk.`,
        "PORTFOLIO",
        { smallCapPercent: portfolioAllocation.smallCapPercent, clientAge: client.age },
        "Remove high-volatility small-cap funds from the retiree's core recommendation portfolio."
      );
    }
  }

  // 5. Short Investment Horizon with Volatile Equity (RULE_HORIZON_MISMATCH)
  if (goals) {
    for (const goal of goals) {
      if (goal.targetHorizonYears < 3 && portfolioAllocation && portfolioAllocation.equityPercent > 30) {
        addFinding(
          "RULE_HORIZON_MISMATCH",
          "HIGH_RISK",
          `Volatile Allocation for Short Horizon Goal (${goal.title})`,
          `Goal '${goal.title}' has a horizon of only ${goal.targetHorizonYears} years, but the portfolio holds ${portfolioAllocation.equityPercent}% in volatile equities. Equities require a 5+ year cycle to absorb drawdown risks.`,
          "GOAL",
          { goal: goal.title, horizonYears: goal.targetHorizonYears, equityPercent: portfolioAllocation.equityPercent },
          "Shift short-term goal allocation to low-duration debt, money market, or arbitrage funds."
        );
      }
    }
  }

  // 6. Portfolio Concentration Risk (RULE_CONCENTRATION_RISK)
  if (portfolioAllocation?.singleSchemeMaxAllocation && portfolioAllocation.singleSchemeMaxAllocation > 35) {
    addFinding(
      "RULE_SINGLE_SCHEME_CONCENTRATION",
      "WARNING",
      "High Single-Scheme Concentration",
      `A single mutual fund scheme accounts for ${portfolioAllocation.singleSchemeMaxAllocation}% of the recommended portfolio, exceeding the 30% concentration threshold.`,
      "PORTFOLIO",
      { singleSchemeAllocation: portfolioAllocation.singleSchemeMaxAllocation },
      "Diversify holdings across at least 3-4 schemes to reduce manager and AMC-specific risk."
    );
  }

  // 7. Guaranteed Returns Solicitation Check (RULE_GUARANTEED_RETURNS_DETECTED)
  const allNotes = `${client.financialNotes || ""} ${goals?.map((g) => g.notes || "").join(" ")}`.toLowerCase();
  if (allNotes.includes("guaranteed") || allNotes.includes("fixed 15%") || allNotes.includes("fixed 20%") || allNotes.includes("assured return")) {
    addFinding(
      "RULE_UNREALISTIC_GUARANTEED_RETURNS",
      "BLOCKED",
      "Unlawful or Unrealistic Guaranteed Return Expectation",
      "Client notes or objectives mention 'guaranteed' or 'assured' market returns. Market-linked securities cannot legally guarantee returns under SEBI regulations.",
      "CLIENT",
      { snippet: "Guaranteed/assured return terminology detected in client mandate" },
      "Deliver explicit written disclaimer that mutual fund investments are subject to market risks and no returns are guaranteed."
    );
  }

  // 8. Stale or Missing Fund Data Check (RULE_STALE_FUND_DATA)
  if (funds && funds.length > 0) {
    for (const fund of funds) {
      if (fund.dataFreshnessDays && fund.dataFreshnessDays > 30) {
        addFinding(
          "RULE_STALE_FUND_DATA",
          "WARNING",
          `Stale NAV & Factsheet Data: ${fund.schemeName}`,
          `Fund data is ${fund.dataFreshnessDays} days old. Recommendations should be founded on fresh NAV data.`,
          "FUND",
          { scheme: fund.schemeName, freshnessDays: fund.dataFreshnessDays },
          "Refresh fund NAV and portfolio disclosures from AMFI data feeds before final approval."
        );
      }
      if (fund.hasMissingObservations) {
        addFinding(
          "RULE_FUND_DATA_INSUFFICIENT",
          "WARNING",
          `Missing Historical Observations: ${fund.schemeName}`,
          "Scheme history has missing data observations. Historical backtest metrics may be incomplete.",
          "FUND",
          { scheme: fund.schemeName },
          "Review historical data sufficiency before presenting 10-year backtest charts to client."
        );
      }
    }
  }

  // 9. Risk Capacity vs Tolerance Conflict Check (RULE_RISK_CONFLICT)
  if (riskProfile?.hasConflict) {
    addFinding(
      "RULE_RISK_PROFILE_CONFLICT",
      "WARNING",
      "Risk Capacity & Tolerance Divergence",
      "Client's objective financial capacity diverges from subjective behavioral risk tolerance. Risk capacity must act as the primary constraint.",
      "CLIENT",
      { capacity: riskProfile.capacityLevel, tolerance: riskProfile.toleranceLevel },
      "Review the automated conflict resolution rationale with client before executing recommendations."
    );
  }

  const blockedCount = findings.filter((f) => f.severity === "BLOCKED").length;
  const highRiskCount = findings.filter((f) => f.severity === "HIGH_RISK").length;
  const warningCount = findings.filter((f) => f.severity === "WARNING").length;
  const infoCount = findings.filter((f) => f.severity === "INFO").length;

  return {
    isBlocked: blockedCount > 0,
    hasHighRisk: highRiskCount > 0,
    findings,
    summary: {
      blockedCount,
      highRiskCount,
      warningCount,
      infoCount,
    },
  };
}
