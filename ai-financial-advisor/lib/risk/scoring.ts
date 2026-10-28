/**
 * Risk Profiling Engine
 * Separates Risk Capacity (objective ability to absorb loss) from Risk Tolerance (subjective willingness to take risk).
 * Enforces conflict resolution: Capacity strictly constrains Tolerance.
 */

export interface RiskCapacityInputs {
  monthlyIncome: number;
  monthlyExpenses: number;
  existingSavings: number;
  emergencyFundAmount: number;
  monthlyEMI: number;
  numberOfDependants: number;
  investmentHorizonYears: number;
  employmentType: "salaried_permanent" | "salaried_contract" | "self_employed_professional" | "business_owner" | "retired" | "student_or_other";
  liquidityNeeds: "low" | "medium" | "high";
}

export interface RiskToleranceQuestionnaire {
  // 1. Reaction to a 20% portfolio decline
  marketLossReaction: "panic_sell_all" | "sell_some_to_reduce_risk" | "hold_and_do_nothing" | "buy_more_at_discount";
  // 2. Volatility comfort
  volatilityComfort: "very_uncomfortable" | "mildly_uncomfortable" | "comfortable_with_fluctuations" | "thrives_on_volatility";
  // 3. Investment experience
  investmentExperience: "none_or_beginner" | "basic_mutual_funds" | "active_equity_and_debt" | "advanced_derivatives_or_active_trading";
  // 4. Maximum tolerable drawdown over 12 months
  acceptableDrawdown: "zero_loss" | "up_to_10_percent" | "up_to_20_percent" | "greater_than_20_percent";
  // 5. Primary investment objective
  primaryObjective: "capital_preservation" | "stable_income" | "balanced_wealth_accumulation" | "aggressive_capital_growth";
}

export type RiskCategory = "CONSERVATIVE" | "MODERATELY_CONSERVATIVE" | "BALANCED" | "GROWTH" | "AGGRESSIVE";

export interface RiskProfileAssessment {
  capacityScore: number; // 0 - 100
  capacityLevel: "LOW" | "MODERATE" | "HIGH";
  capacityFactors: {
    emergencyFundMonths: number;
    emiToIncomeRatio: number;
    savingsToIncomeRatio: number;
    horizonScore: number;
    employmentScore: number;
    dependantsImpact: number;
  };
  capacityExplanation: string;

  toleranceScore: number; // 0 - 100
  toleranceLevel: "CONSERVATIVE" | "MODERATE" | "AGGRESSIVE";
  toleranceExplanation: string;

  combinedCategory: RiskCategory;
  hasConflict: boolean;
  conflictDetails?: {
    type: "CAPACITY_LOWER_THAN_TOLERANCE" | "TOLERANCE_LOWER_THAN_CAPACITY";
    description: string;
    resolutionRule: string;
    suggestedReviewAction: string;
  };

  dataQualityWarnings: string[];
  disclaimer: string;
  calculatedAt: string;
  scoringVersion: string;
}

export const SCORING_ENGINE_VERSION = "2.1.0-zeckathon";

/**
 * Calculates Risk Capacity Score (0-100)
 */
export function calculateRiskCapacity(inputs: RiskCapacityInputs): {
  score: number;
  level: "LOW" | "MODERATE" | "HIGH";
  factors: RiskProfileAssessment["capacityFactors"];
  explanation: string;
  warnings: string[];
} {
  const warnings: string[] = [];
  const {
    monthlyIncome,
    monthlyExpenses,
    emergencyFundAmount,
    monthlyEMI,
    numberOfDependants,
    investmentHorizonYears,
    employmentType,
  } = inputs;

  if (monthlyIncome <= 0) {
    warnings.push("Monthly income reported as zero or missing. Capacity defaults to minimal.");
  }

  // 1. Emergency Fund Coverage (Max 25 pts)
  const monthlyBurn = monthlyExpenses + monthlyEMI;
  const emergencyMonths = monthlyBurn > 0 ? emergencyFundAmount / monthlyBurn : 0;
  let emergencyScore = 0;
  if (emergencyMonths >= 6) emergencyScore = 25;
  else if (emergencyMonths >= 3) emergencyScore = 18;
  else if (emergencyMonths >= 1) emergencyScore = 10;
  else {
    emergencyScore = 3;
    warnings.push("Emergency fund covers less than 1 month of living expenses.");
  }

  // 2. Debt Burden / EMI-to-Income Ratio (Max 25 pts)
  const emiRatio = monthlyIncome > 0 ? (monthlyEMI / monthlyIncome) : 1;
  let emiScore = 0;
  if (emiRatio <= 0.15) emiScore = 25;
  else if (emiRatio <= 0.30) emiScore = 20;
  else if (emiRatio <= 0.45) emiScore = 12;
  else if (emiRatio <= 0.60) emiScore = 5;
  else {
    emiScore = 0;
    warnings.push("High debt burden: Monthly EMI exceeds 60% of take-home income.");
  }

  // 3. Investment Horizon (Max 25 pts)
  let horizonScore = 0;
  if (investmentHorizonYears >= 10) horizonScore = 25;
  else if (investmentHorizonYears >= 7) horizonScore = 20;
  else if (investmentHorizonYears >= 4) horizonScore = 14;
  else if (investmentHorizonYears >= 2) horizonScore = 8;
  else {
    horizonScore = 3;
    warnings.push("Short investment horizon (<2 years) significantly limits risk absorption capacity.");
  }

  // 4. Employment & Income Stability (Max 15 pts)
  let employmentScore = 10;
  switch (employmentType) {
    case "salaried_permanent":
      employmentScore = 15;
      break;
    case "self_employed_professional":
      employmentScore = 12;
      break;
    case "business_owner":
      employmentScore = 9; // Higher variability
      break;
    case "salaried_contract":
      employmentScore = 7;
      break;
    case "retired":
      employmentScore = 6; // Fixed capital depletion phase
      break;
    default:
      employmentScore = 4;
      break;
  }

  // 5. Dependants Burden (Max 10 pts)
  let dependantsScore = 10;
  if (numberOfDependants === 0) dependantsScore = 10;
  else if (numberOfDependants <= 2) dependantsScore = 7;
  else if (numberOfDependants <= 4) dependantsScore = 4;
  else dependantsScore = 1;

  const totalScore = Math.min(100, Math.max(0, emergencyScore + emiScore + horizonScore + employmentScore + dependantsScore));

  let level: "LOW" | "MODERATE" | "HIGH" = "MODERATE";
  if (totalScore < 40) level = "LOW";
  else if (totalScore >= 70) level = "HIGH";

  const explanation = `Client demonstrates a ${level.toLowerCase()} capacity score of ${totalScore}/100. Emergency reserves cover ${emergencyMonths.toFixed(1)} months of burn, EMI obligation is ${(emiRatio * 100).toFixed(0)}% of income, and target horizon is ${investmentHorizonYears} years.`;

  return {
    score: totalScore,
    level,
    factors: {
      emergencyFundMonths: Number(emergencyMonths.toFixed(1)),
      emiToIncomeRatio: Number(emiRatio.toFixed(2)),
      savingsToIncomeRatio: monthlyIncome > 0 ? Number((inputs.existingSavings / (monthlyIncome * 12)).toFixed(1)) : 0,
      horizonScore,
      employmentScore,
      dependantsImpact: dependantsScore,
    },
    explanation,
    warnings,
  };
}

/**
 * Calculates Risk Tolerance Score (0-100) from questionnaire
 */
export function calculateRiskTolerance(q: RiskToleranceQuestionnaire): {
  score: number;
  level: "CONSERVATIVE" | "MODERATE" | "AGGRESSIVE";
  explanation: string;
} {
  // 1. Loss Reaction (25 pts)
  let lossPts = 5;
  if (q.marketLossReaction === "panic_sell_all") lossPts = 3;
  else if (q.marketLossReaction === "sell_some_to_reduce_risk") lossPts = 10;
  else if (q.marketLossReaction === "hold_and_do_nothing") lossPts = 18;
  else if (q.marketLossReaction === "buy_more_at_discount") lossPts = 25;

  // 2. Volatility Comfort (20 pts)
  let volPts = 5;
  if (q.volatilityComfort === "very_uncomfortable") volPts = 4;
  else if (q.volatilityComfort === "mildly_uncomfortable") volPts = 10;
  else if (q.volatilityComfort === "comfortable_with_fluctuations") volPts = 16;
  else if (q.volatilityComfort === "thrives_on_volatility") volPts = 20;

  // 3. Investment Experience (20 pts)
  let expPts = 5;
  if (q.investmentExperience === "none_or_beginner") expPts = 4;
  else if (q.investmentExperience === "basic_mutual_funds") expPts = 10;
  else if (q.investmentExperience === "active_equity_and_debt") expPts = 16;
  else if (q.investmentExperience === "advanced_derivatives_or_active_trading") expPts = 20;

  // 4. Acceptable Drawdown (20 pts)
  let ddPts = 5;
  if (q.acceptableDrawdown === "zero_loss") ddPts = 3;
  else if (q.acceptableDrawdown === "up_to_10_percent") ddPts = 9;
  else if (q.acceptableDrawdown === "up_to_20_percent") ddPts = 15;
  else if (q.acceptableDrawdown === "greater_than_20_percent") ddPts = 20;

  // 5. Objective (15 pts)
  let objPts = 3;
  if (q.primaryObjective === "capital_preservation") objPts = 3;
  else if (q.primaryObjective === "stable_income") objPts = 6;
  else if (q.primaryObjective === "balanced_wealth_accumulation") objPts = 11;
  else if (q.primaryObjective === "aggressive_capital_growth") objPts = 15;

  const totalScore = Math.min(100, Math.max(0, lossPts + volPts + expPts + ddPts + objPts));

  let level: "CONSERVATIVE" | "MODERATE" | "AGGRESSIVE" = "MODERATE";
  if (totalScore < 40) level = "CONSERVATIVE";
  else if (totalScore >= 70) level = "AGGRESSIVE";

  const explanation = `Questionnaire reveals a ${level.toLowerCase()} behavioral tolerance score of ${totalScore}/100 based on stated loss recovery response, volatility comfort, and drawdown tolerance.`;

  return {
    score: totalScore,
    level,
    explanation,
  };
}

/**
 * Reconcile Capacity and Tolerance into a Unified Suitability Category
 * CRITICAL RULE: When Capacity is Low but Tolerance is High, Capacity MUST constrain Tolerance.
 */
export function evaluateRiskProfile(
  capacityInputs: RiskCapacityInputs,
  toleranceInputs: RiskToleranceQuestionnaire
): RiskProfileAssessment {
  const capacityResult = calculateRiskCapacity(capacityInputs);
  const toleranceResult = calculateRiskTolerance(toleranceInputs);

  const warnings = [...capacityResult.warnings];
  let combinedCategory: RiskCategory = "BALANCED";
  let hasConflict = false;
  let conflictDetails: RiskProfileAssessment["conflictDetails"] = undefined;

  // Scoring matrix & conflict resolution
  if (capacityResult.level === "LOW" && toleranceResult.level === "AGGRESSIVE") {
    // CONFLICT: High tolerance but low capacity.
    // Client wants high risk, but cannot afford drawdowns (e.g., F&O trader with high debt or graduate with no reserves).
    hasConflict = true;
    combinedCategory = "MODERATELY_CONSERVATIVE"; // Constrained by capacity!
    conflictDetails = {
      type: "CAPACITY_LOWER_THAN_TOLERANCE",
      description: "Client expresses an aggressive appetite for risk, but financial capacity metrics (high debt, low emergency reserves, or short horizon) do not support high volatility.",
      resolutionRule: "Suitability Rule S-01: Risk Capacity acts as a hard ceiling. Portfolio allocation is downgraded to protect against irreversible financial distress.",
      suggestedReviewAction: "Discuss discrepancy with client during onboarding. Build emergency reserves and pay down liabilities before escalating equity exposure.",
    };
    warnings.push("Risk Capacity constraint applied: Aggressive tolerance was overridden due to fragile financial capacity.");
  } else if (capacityResult.level === "LOW" && toleranceResult.level === "MODERATE") {
    combinedCategory = "CONSERVATIVE";
  } else if (capacityResult.level === "LOW" && toleranceResult.level === "CONSERVATIVE") {
    combinedCategory = "CONSERVATIVE";
  } else if (capacityResult.level === "HIGH" && toleranceResult.level === "CONSERVATIVE") {
    // High capacity, but client is psychologically loss-averse (e.g. Doctor with high income who fears market crashes)
    hasConflict = true;
    combinedCategory = "MODERATELY_CONSERVATIVE";
    conflictDetails = {
      type: "TOLERANCE_LOWER_THAN_CAPACITY",
      description: "Client possesses high financial capacity to absorb volatility, but subjective tolerance is conservative.",
      resolutionRule: "Suitability Rule S-02: Never force risk on an unwilling client. Respect behavioral comfort to prevent panic liquidation during market downturns.",
      suggestedReviewAction: "Educate client on inflation risk and propose conservative debt-oriented hybrid funds with gradual equity SIPs.",
    };
  } else if (capacityResult.level === "HIGH" && toleranceResult.level === "AGGRESSIVE") {
    combinedCategory = "AGGRESSIVE";
  } else if (capacityResult.level === "HIGH" && toleranceResult.level === "MODERATE") {
    combinedCategory = "GROWTH";
  } else if (capacityResult.level === "MODERATE" && toleranceResult.level === "AGGRESSIVE") {
    combinedCategory = "GROWTH";
  } else if (capacityResult.level === "MODERATE" && toleranceResult.level === "CONSERVATIVE") {
    combinedCategory = "MODERATELY_CONSERVATIVE";
  } else {
    combinedCategory = "BALANCED";
  }

  const disclaimer = "Notice: This prototype assessment model is an educational and analytical aid for advisers. It does not constitute a formally certified SEBI RIA suitability declaration.";

  return {
    capacityScore: capacityResult.score,
    capacityLevel: capacityResult.level,
    capacityFactors: capacityResult.factors,
    capacityExplanation: capacityResult.explanation,
    toleranceScore: toleranceResult.score,
    toleranceLevel: toleranceResult.level,
    toleranceExplanation: toleranceResult.explanation,
    combinedCategory,
    hasConflict,
    conflictDetails,
    dataQualityWarnings: warnings,
    disclaimer,
    calculatedAt: new Date().toISOString(),
    scoringVersion: SCORING_ENGINE_VERSION,
  };
}
