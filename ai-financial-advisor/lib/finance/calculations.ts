/**
 * Financial Calculation Engine for AI Investment Adviser Co-pilot
 * Pure, deterministic, testable financial mathematics functions.
 * All amounts in INR (₹).
 */

export interface GoalCalculationInputs {
  currentCost: number; // Current estimated cost in INR
  targetHorizonYears: number; // Investment horizon in years
  expectedInflationRate: number; // e.g., 0.06 for 6%
  expectedAnnualReturn: number; // e.g., 0.12 for 12%
  existingSavings: number; // Existing dedicated investments in INR
  currentMonthlyContribution: number; // Current monthly savings towards this goal
  compoundingFrequency?: "monthly" | "annual";
  sipTiming?: "beginning_of_period" | "end_of_period";
}

export interface GoalCalculationResults {
  inflationAdjustedCost: number; // Total corpus needed at target date
  futureValueOfExistingSavings: number; // What existing savings will grow to
  corpusShortfall: number; // Net amount that needs to be funded via future contributions
  requiredMonthlySIP: number; // Recommended monthly SIP
  monthlySurplusOrShortfall: number; // current - required (positive is surplus, negative is shortfall)
  feasibilityStatus: "ON_TRACK" | "EXCEEDING_TARGET" | "STRETCH_REQUIRED" | "UNDERFUNDED";
  feasibilityRatio: number; // current / required
  totalInvestmentOverHorizon: number; // total out-of-pocket investment (existing + N*SIP)
  estimatedWealthGain: number; // inflationAdjustedCost - totalInvestment
  assumptions: {
    inflationRate: number;
    annualReturn: number;
    horizonYears: number;
    compounding: string;
    sipTiming: string;
  };
}

export interface ScenarioResult {
  scenarioName: string;
  inflationRate: number;
  expectedReturn: number;
  futureCorpus: number;
  requiredSIP: number;
  description: string;
}

export interface AssetAllocationBreakdown {
  equityPercent: number;
  debtPercent: number;
  goldOrCashPercent: number;
  rationale: string;
}

export interface GlidePathStep {
  yearFromNow: number;
  yearsRemaining: number;
  equityPercent: number;
  debtPercent: number;
  phase: "ACCUMULATION" | "CONSOLIDATION" | "PRESERVATION";
}

/**
 * Calculate the inflation-adjusted future cost of a goal.
 * Formula: FV = PV * (1 + i)^n
 */
export function calculateInflationAdjustedCost(
  currentCost: number,
  inflationRate: number,
  horizonYears: number
): number {
  if (currentCost <= 0) return 0;
  if (horizonYears <= 0) return Math.round(currentCost);
  if (inflationRate === 0) return Math.round(currentCost);

  const fv = currentCost * Math.pow(1 + inflationRate, horizonYears);
  return Math.round(fv);
}

/**
 * Calculate the future value of existing investments compounded annually.
 * Formula: FV = PV * (1 + r)^n
 */
export function calculateFutureValueOfSavings(
  existingSavings: number,
  annualReturn: number,
  horizonYears: number
): number {
  if (existingSavings <= 0) return 0;
  if (horizonYears <= 0) return Math.round(existingSavings);
  if (annualReturn === 0) return Math.round(existingSavings);

  const fv = existingSavings * Math.pow(1 + annualReturn, horizonYears);
  return Math.round(fv);
}

/**
 * Calculate required monthly SIP to reach target shortfall.
 * Standard end-of-month ordinary annuity formula (default):
 *   SIP = FV * r / ((1 + r)^N - 1)
 * Where:
 *   - r = nominal monthly rate (annualReturn / 12)
 *   - N = total number of contributions (horizonYears * 12)
 *
 * For r = 0 (zero return), straight-line division: SIP = FV / N
 * For N = 0 (zero horizon), immediate requirement: SIP = FV
 */
export function calculateRequiredMonthlySIP(
  targetShortfall: number,
  annualReturn: number,
  horizonYears: number,
  sipTiming: "beginning_of_period" | "end_of_period" = "end_of_period"
): number {
  if (targetShortfall <= 0) return 0;
  if (horizonYears <= 0) return Math.round(targetShortfall);

  const totalMonths = Math.round(horizonYears * 12);
  if (totalMonths <= 0) return Math.round(targetShortfall);

  // If return is zero, straight line division: SIP = Shortfall / N
  if (annualReturn === 0) {
    return Math.round(targetShortfall / totalMonths);
  }

  // Nominal monthly return rate (annual rate divided by 12)
  const monthlyRate = annualReturn / 12;

  if (sipTiming === "end_of_period") {
    // Ordinary annuity (end-of-month): FV = SIP * (( (1 + r)^N - 1 ) / r)
    // => SIP = FV * r / ((1 + r)^N - 1)
    const compoundFactor = Math.pow(1 + monthlyRate, totalMonths);
    const denominator = compoundFactor - 1;
    const sip = (targetShortfall * monthlyRate) / denominator;
    return Math.max(0, Math.round(sip));
  } else {
    // Annuity Due (beginning-of-month): FV = SIP * (( (1 + r)^N - 1 ) / r) * (1 + r)
    // => SIP = FV * r / ( ((1 + r)^N - 1) * (1 + r) )
    const compoundFactor = Math.pow(1 + monthlyRate, totalMonths);
    const denominator = (compoundFactor - 1) * (1 + monthlyRate);
    const sip = (targetShortfall * monthlyRate) / denominator;
    return Math.max(0, Math.round(sip));
  }
}

/**
 * Comprehensive Goal Plan Calculation
 */
export function calculateGoalPlan(inputs: GoalCalculationInputs): GoalCalculationResults {
  const {
    currentCost,
    targetHorizonYears,
    expectedInflationRate,
    expectedAnnualReturn,
    existingSavings,
    currentMonthlyContribution,
    sipTiming = "end_of_period",
  } = inputs;

  const inflationAdjustedCost = calculateInflationAdjustedCost(
    currentCost,
    expectedInflationRate,
    targetHorizonYears
  );

  const futureValueOfExistingSavings = calculateFutureValueOfSavings(
    existingSavings,
    expectedAnnualReturn,
    targetHorizonYears
  );

  const corpusShortfall = Math.max(0, inflationAdjustedCost - futureValueOfExistingSavings);

  const requiredMonthlySIP = calculateRequiredMonthlySIP(
    corpusShortfall,
    expectedAnnualReturn,
    targetHorizonYears,
    sipTiming
  );

  const monthlySurplusOrShortfall = currentMonthlyContribution - requiredMonthlySIP;

  let feasibilityRatio = 1;
  if (requiredMonthlySIP > 0) {
    feasibilityRatio = Number((currentMonthlyContribution / requiredMonthlySIP).toFixed(2));
  }

  let feasibilityStatus: GoalCalculationResults["feasibilityStatus"] = "ON_TRACK";
  if (requiredMonthlySIP === 0) {
    feasibilityStatus = "ON_TRACK";
  } else if (feasibilityRatio >= 1.2) {
    feasibilityStatus = "EXCEEDING_TARGET";
  } else if (feasibilityRatio >= 0.95) {
    feasibilityStatus = "ON_TRACK";
  } else if (feasibilityRatio >= 0.65) {
    feasibilityStatus = "STRETCH_REQUIRED";
  } else {
    feasibilityStatus = "UNDERFUNDED";
  }

  const totalMonths = Math.round(targetHorizonYears * 12);
  const totalInvestmentOverHorizon = existingSavings + requiredMonthlySIP * totalMonths;
  const estimatedWealthGain = Math.max(0, inflationAdjustedCost - totalInvestmentOverHorizon);

  return {
    inflationAdjustedCost,
    futureValueOfExistingSavings,
    corpusShortfall,
    requiredMonthlySIP,
    monthlySurplusOrShortfall,
    feasibilityStatus,
    feasibilityRatio,
    totalInvestmentOverHorizon,
    estimatedWealthGain,
    assumptions: {
      inflationRate: expectedInflationRate,
      annualReturn: expectedAnnualReturn,
      horizonYears: targetHorizonYears,
      compounding: "Monthly SIP with nominal annual rate",
      sipTiming,
    },
  };
}

/**
 * Generate Comparative Sensitivity Scenarios
 */
export function generateScenarioComparisons(
  currentCost: number,
  targetHorizonYears: number,
  baselineInflation: number,
  baselineReturn: number,
  existingSavings: number = 0
): ScenarioResult[] {
  const scenarios = [
    {
      name: "Conservative (High Inflation, Lower Return)",
      inflationDelta: 0.015,
      returnDelta: -0.025,
      description: "Prudent stress test for market downturns and persistent inflation.",
    },
    {
      name: "Baseline (Current Advisory Model)",
      inflationDelta: 0,
      returnDelta: 0,
      description: "Standard expected return benchmark and historical CPI trend.",
    },
    {
      name: "Optimistic (Low Inflation, Bull Market)",
      inflationDelta: -0.01,
      returnDelta: 0.02,
      description: "Favorable macroeconomic tailwinds and strong equity cycle.",
    },
  ];

  return scenarios.map((s) => {
    const inf = Math.max(0.01, baselineInflation + s.inflationDelta);
    const ret = Math.max(0.02, baselineReturn + s.returnDelta);

    const futureCost = calculateInflationAdjustedCost(currentCost, inf, targetHorizonYears);
    const futureSavings = calculateFutureValueOfSavings(existingSavings, ret, targetHorizonYears);
    const shortfall = Math.max(0, futureCost - futureSavings);
    const sip = calculateRequiredMonthlySIP(shortfall, ret, targetHorizonYears);

    return {
      scenarioName: s.name,
      inflationRate: Number((inf * 100).toFixed(1)),
      expectedReturn: Number((ret * 100).toFixed(1)),
      futureCorpus: futureCost,
      requiredSIP: sip,
      description: s.description,
    };
  });
}

/**
 * Suggest Asset Allocation Based on Investment Horizon and Risk Category
 */
export function suggestAssetAllocation(
  horizonYears: number,
  riskCategory: "CONSERVATIVE" | "MODERATELY_CONSERVATIVE" | "BALANCED" | "GROWTH" | "AGGRESSIVE" = "BALANCED"
): AssetAllocationBreakdown {
  let equity = 50;
  let debt = 45;
  let goldOrCash = 5;
  let rationale = "";

  if (horizonYears < 2) {
    equity = 0;
    debt = 85;
    goldOrCash = 15;
    rationale = "Capital preservation priority. Horizons under 2 years must avoid equity market volatility.";
  } else if (horizonYears <= 3) {
    equity = 20;
    debt = 70;
    goldOrCash = 10;
    rationale = "Short-term horizon. Conservative debt-dominant allocation with modest equity for inflation defense.";
  } else if (horizonYears <= 7) {
    equity = 55;
    debt = 40;
    goldOrCash = 5;
    rationale = "Medium-term horizon. Balanced equity-debt mix to harness compounding while tempering drawdowns.";
  } else if (horizonYears <= 10) {
    equity = 70;
    debt = 25;
    goldOrCash = 5;
    rationale = "Long-term horizon. Equity dominant to outpace long-term inflation and generate wealth.";
  } else {
    equity = 80;
    debt = 15;
    goldOrCash = 5;
    rationale = "Ultra long-term horizon (>10 years). High equity allocation maximizes compounding capacity.";
  }

  // Adjust for risk profile
  if (riskCategory === "CONSERVATIVE" && equity > 20) {
    equity -= 20;
    debt += 20;
    rationale += " Further trimmed equity exposure to align with client's conservative risk profile.";
  } else if (riskCategory === "MODERATELY_CONSERVATIVE" && equity > 30) {
    equity -= 10;
    debt += 10;
    rationale += " Adjusted toward fixed income to honor lower volatility tolerance.";
  } else if (riskCategory === "AGGRESSIVE" && horizonYears >= 5) {
    equity = Math.min(90, equity + 10);
    debt = Math.max(5, debt - 10);
    rationale += " Boosted equity weighting in accordance with aggressive growth capacity.";
  }

  return {
    equityPercent: Math.round(equity),
    debtPercent: Math.round(debt),
    goldOrCashPercent: Math.round(goldOrCash),
    rationale,
  };
}

/**
 * Generate Goal Glide Path
 * Gradually reduces equity exposure in the final 3-5 years to protect accumulated wealth.
 */
export function generateGlidePath(
  totalHorizonYears: number,
  initialEquityPercent: number
): GlidePathStep[] {
  const steps: GlidePathStep[] = [];
  const years = Math.max(1, Math.round(totalHorizonYears));

  for (let y = 0; y <= years; y++) {
    const yearsRemaining = years - y;
    let equity = initialEquityPercent;
    let phase: GlidePathStep["phase"] = "ACCUMULATION";

    if (yearsRemaining <= 1) {
      equity = Math.min(10, initialEquityPercent * 0.15);
      phase = "PRESERVATION";
    } else if (yearsRemaining <= 2) {
      equity = Math.min(25, initialEquityPercent * 0.35);
      phase = "PRESERVATION";
    } else if (yearsRemaining <= 3) {
      equity = Math.min(45, initialEquityPercent * 0.6);
      phase = "CONSOLIDATION";
    } else if (yearsRemaining <= 5) {
      equity = Math.min(65, initialEquityPercent * 0.85);
      phase = "CONSOLIDATION";
    } else {
      phase = "ACCUMULATION";
    }

    steps.push({
      yearFromNow: y,
      yearsRemaining,
      equityPercent: Math.round(equity),
      debtPercent: Math.round(100 - equity),
      phase,
    });
  }

  return steps;
}
