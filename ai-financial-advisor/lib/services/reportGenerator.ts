import { Client, Goal, FinancialReport, ReportType, FeasibilityStatus } from "../storage/types";
import { saveReport, getAdviserSettings } from "../storage/localStorage";
import { calculateGoalPlan } from "../finance/calculations";
import { formatINR } from "../utils";

export interface GenerateReportParams {
  client: Client;
  goals: Goal[];
  reportType: ReportType;
  customNotes?: string;
}

export function generateStructuredReport({
  client,
  goals,
  reportType,
  customNotes,
}: GenerateReportParams): FinancialReport {
  const settings = getAdviserSettings();

  const monthlyBurn = client.monthlyExpenses + client.monthlyEMI;
  const monthlySurplus = client.monthlyIncome - monthlyBurn;
  const savingsRate = client.monthlyIncome > 0 ? Math.round((monthlySurplus / client.monthlyIncome) * 100) : 0;
  const emergencyMonths = monthlyBurn > 0 ? Math.round((client.emergencyFundAmount / monthlyBurn) * 10) / 10 : 0;
  const emiRatio = client.monthlyIncome > 0 ? Math.round((client.monthlyEMI / client.monthlyIncome) * 100) : 0;
  const totalAssets = client.existingSavings + client.existingInvestments;
  const netWorth = totalAssets - client.outstandingLiabilities;

  // Process goals roadmap
  let totalGoalCorpusNeeded = 0;
  let totalRequiredMonthlySIP = 0;

  const goalRoadmap = goals.map((g) => {
    const calc = g.calculationResults || calculateGoalPlan({
      currentCost: g.currentCost,
      targetHorizonYears: g.targetHorizonYears,
      expectedInflationRate: g.expectedInflationRate || 0.06,
      expectedAnnualReturn: g.expectedAnnualReturn || 0.12,
      existingSavings: g.existingSavings || 0,
      currentMonthlyContribution: g.currentMonthlyContribution || 0,
      sipTiming: "end_of_period",
    });

    const inflationAdjustedCost = calc.inflationAdjustedCost;
    const requiredMonthlySIP = calc.requiredMonthlySIP;
    const status: FeasibilityStatus = calc.feasibilityStatus || (g.currentMonthlyContribution >= requiredMonthlySIP ? "ON_TRACK" : "STRETCH_REQUIRED");

    totalGoalCorpusNeeded += inflationAdjustedCost;
    totalRequiredMonthlySIP += requiredMonthlySIP;

    return {
      title: g.title,
      targetHorizonYears: g.targetHorizonYears,
      inflationAdjustedCost,
      existingSavings: g.existingSavings,
      requiredMonthlySIP,
      status,
    };
  });

  // Determine Allocation
  const rp = client.riskProfile;
  const equityPercent = rp?.recommendedEquityPercent ?? 50;
  const debtPercent = rp?.recommendedDebtPercent ?? 35;
  const goldOrCashPercent = rp?.recommendedGoldCashPercent ?? 5;

  // Generate Suitability Findings
  const suitabilityFindings: FinancialReport["suitabilityFindings"] = [];

  if (emergencyMonths < 3) {
    suitabilityFindings.push({
      severity: "CRITICAL",
      title: "Severely Deficient Emergency Reserves",
      description: `Current reserves cover only ${emergencyMonths} months of living commitments (₹${client.emergencyFundAmount.toLocaleString("en-IN")}).`,
      action: "Pause high-risk investments; prioritize building a minimum 3-6 month liquid reserve.",
    });
  } else if (emergencyMonths < 6) {
    suitabilityFindings.push({
      severity: "WARNING",
      title: "Sub-Optimal Emergency Reserves",
      description: `Current emergency fund covers ${emergencyMonths} months. Standard prudential benchmark is 6 months (₹${(monthlyBurn * 6).toLocaleString("en-IN")}).`,
      action: "Allocate 20% of monthly surplus to top up liquid reserves over the next 12 months.",
    });
  } else {
    suitabilityFindings.push({
      severity: "INFO",
      title: "Robust Emergency Fund Runway",
      description: `Reserves cover ${emergencyMonths} months of fixed burn, providing a strong cushion against market drawdowns.`,
      action: "Maintain current liquid allocation in overnight / liquid funds.",
    });
  }

  if (emiRatio > 40) {
    suitabilityFindings.push({
      severity: "WARNING",
      title: "Elevated Debt-to-Income Ratio",
      description: `Monthly EMI accounts for ${emiRatio}% of gross income, exceeding the 40% prudential ceiling.`,
      action: "Avoid incurring additional credit liabilities; consider accelerated debt amortization.",
    });
  }

  if (rp?.hasConflict) {
    suitabilityFindings.push({
      severity: "WARNING",
      title: "Risk Capacity vs Tolerance Conflict",
      description: rp.conflictRationale || "Objective capacity diverges from subjective risk tolerance.",
      action: "Fiduciary mandate requires following the more conservative ceiling to preserve capital.",
    });
  }

  // Titles & Summaries by Type
  let title = `Comprehensive Financial Plan — ${client.fullName}`;
  let summary = `A comprehensive holistic wealth roadmap for ${client.fullName} (${client.age}y, ${client.city}) integrating cashflow, liquidity buffers, and multi-goal asset compounding.`;

  if (reportType === "NET_WORTH_AND_CASHFLOW_AUDIT") {
    title = `Net Worth & Cash Flow Audit — ${client.fullName}`;
    summary = `Detailed diagnostic audit analyzing ${client.fullName}'s monthly inflows, outflows, EMI obligations, and liquid balance sheet resilience.`;
  } else if (reportType === "RETIREMENT_READINESS") {
    title = `Retirement Readiness & Longevity Plan — ${client.fullName}`;
    summary = `Retirement sustainability analysis mapping post-career cashflow requirements and capital preservation guardrails.`;
  } else if (reportType === "RISK_AND_SUITABILITY_REVIEW") {
    title = `Risk Profile & Asset Allocation Review — ${client.fullName}`;
    summary = `Statutory SEBI suitability audit evaluating ${client.fullName}'s risk capacity score against behavioral risk tolerance.`;
  } else if (reportType === "GOAL_FUNDING_STRATEGY") {
    title = `Strategic Goal Funding & SIP Roadmap — ${client.fullName}`;
    summary = `Goal-oriented investment plan specifying required SIPs and inflation-adjusted corpus requirements across ${goals.length} defined objectives.`;
  }

  if (customNotes) {
    summary += `\n\nAdviser Special Notes: ${customNotes}`;
  }

  // Action Plan
  const actionPlan: string[] = [
    `Deploy monthly surplus of ${formatINR(monthlySurplus)} across recommended target weights (${equityPercent}% Equity, ${debtPercent}% Debt, ${goldOrCashPercent}% Gold/Cash).`,
    emergencyMonths < 6
      ? `Direct ₹${Math.min(monthlySurplus * 0.4, (monthlyBurn * 6 - client.emergencyFundAmount) / 12).toFixed(0)}/mo into high-liquidity funds to close emergency reserve gap.`
      : `Channel entire savings surplus towards defined goal SIPs.`,
    `Establish automated monthly SIPs on the 5th or 10th of every month aligned with salary credits.`,
    `Schedule annual advisory review in 12 months to monitor goal drift and rebalance portfolio allocations.`,
  ];

  const report = saveReport({
    clientId: client.id,
    clientName: client.fullName,
    reportType,
    title,
    adviserName: settings.adviserName,
    adviserRiaNumber: settings.riaNumber,
    summary,
    keyMetrics: {
      monthlyIncome: client.monthlyIncome,
      monthlyExpenses: client.monthlyExpenses,
      monthlySurplus,
      savingsRatePercent: savingsRate,
      emergencyFundMonths: emergencyMonths,
      debtToIncomePercent: emiRatio,
      netWorth,
      totalGoalCorpusNeeded,
      totalRequiredMonthlySIP,
    },
    recommendedAllocation: {
      equityPercent,
      debtPercent,
      goldOrCashPercent,
      rationale:
        rp?.conflictRationale ||
        `Balanced target allocation tailored to client's ${client.investmentHorizonYears}-year horizon and ${rp?.combinedCategory || "BALANCED"} risk classification.`,
    },
    goalRoadmap,
    suitabilityFindings,
    actionPlan,
    fiduciaryNotes: `Prepared by ${settings.adviserName}, SEBI Registered Investment Adviser (${settings.riaNumber}) in strict compliance with SEBI (Investment Advisers) Regulations, 2013.`,
  });

  return report;
}

