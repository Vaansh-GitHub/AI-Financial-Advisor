import * as z from "zod";
import { Client, Goal, ReportType } from "../storage/types";
import {
  calculateInflationAdjustedCost,
  calculateFutureValueOfSavings,
  calculateRequiredMonthlySIP,
  calculateGoalPlan,
} from "../finance/calculations";
import { generateStructuredReport } from "./reportGenerator";
import { formatINR } from "../utils";
import { getLiveAmfiSchemes, filterAmfiSchemes } from "./amfiService";

/**
 * Server-side AI Tools allowlist for Fiduciary Advisory Co-Pilot
 * Executes deterministic TypeScript code with Zod validation.
 */

// 1. Zod Argument Schemas
export const ToolSchemas = {
  get_client_summary: z.object({
    clientId: z.string().optional(),
  }),

  get_client_goals: z.object({
    clientId: z.string().optional(),
  }),

  calculate_future_corpus: z.object({
    currentCost: z.number().min(0, "Current cost must be positive"),
    inflationRate: z.number().min(0).max(0.5, "Inflation rate must be between 0 and 50%"),
    horizonYears: z.number().min(1).max(50, "Horizon must be between 1 and 50 years"),
  }),

  calculate_required_sip: z.object({
    targetCorpus: z.number().min(0),
    existingSavings: z.number().min(0).default(0),
    expectedReturnRate: z.number().min(0).max(0.4, "Expected return must be between 0 and 40%"),
    horizonYears: z.number().min(1).max(50),
    sipTiming: z.enum(["beginning_of_period", "end_of_period"]).default("beginning_of_period"),
  }),

  calculate_savings_gap: z.object({
    monthlyIncome: z.number().min(0),
    monthlyExpenses: z.number().min(0),
    monthlyEMI: z.number().min(0).default(0),
    targetMonthlySIP: z.number().min(0),
  }),

  analyze_income_expenses: z.object({
    monthlyIncome: z.number().min(0),
    monthlyExpenses: z.number().min(0),
    monthlyEMI: z.number().min(0).default(0),
  }),

  calculate_emergency_fund_coverage: z.object({
    emergencyFundAmount: z.number().min(0),
    monthlyExpenses: z.number().min(0),
    monthlyEMI: z.number().min(0).default(0),
  }),

  get_existing_portfolio_summary: z.object({
    existingSavings: z.number().min(0),
    existingInvestments: z.number().min(0),
    outstandingLiabilities: z.number().min(0),
  }),

  get_missing_client_information: z.object({
    clientId: z.string().optional(),
  }),

  generate_financial_report: z.object({
    reportType: z.enum([
      "COMPREHENSIVE_FINANCIAL_PLAN",
      "NET_WORTH_AND_CASHFLOW_AUDIT",
      "RETIREMENT_READINESS",
      "RISK_AND_SUITABILITY_REVIEW",
      "GOAL_FUNDING_STRATEGY",
    ]),
    customNotes: z.string().optional(),
  }),

  search_amfi_mutual_funds: z.object({
    search: z.string().optional(),
    plan: z.enum(["Direct", "Regular", "All"]).optional().default("Direct"),
    option: z.enum(["Growth", "IDCW", "All"]).optional().default("Growth"),
    category: z.string().optional(),
    amc: z.string().optional(),
    limit: z.number().min(1).max(25).optional().default(10),
  }),
};

// 2. OpenAI Function Tool Specifications
export const AI_AVAILABLE_TOOLS = [
  {
    type: "function",
    function: {
      name: "get_client_summary",
      description: "Retrieves complete financial, demographic, and risk overview of the selected client.",
      parameters: {
        type: "object",
        properties: {
          clientId: { type: "string", description: "Optional client ID to inspect" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_client_goals",
      description: "Fetches all recorded financial goals, inflation targets, and current funding progress.",
      parameters: {
        type: "object",
        properties: {
          clientId: { type: "string", description: "Optional client ID" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "calculate_future_corpus",
      description: "Calculates the inflation-adjusted future corpus required for a financial goal using formula FV = PV * (1 + i)^n.",
      parameters: {
        type: "object",
        properties: {
          currentCost: { type: "number", description: "Current present-day cost in INR" },
          inflationRate: { type: "number", description: "Annual inflation rate as decimal (e.g. 0.06 for 6%)" },
          horizonYears: { type: "number", description: "Time horizon in years" },
        },
        required: ["currentCost", "inflationRate", "horizonYears"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "calculate_required_sip",
      description: "Calculates the exact monthly SIP required using deterministic annuity-due mutual fund compounding.",
      parameters: {
        type: "object",
        properties: {
          targetCorpus: { type: "number", description: "Total target corpus needed at maturity" },
          existingSavings: { type: "number", description: "Existing dedicated investments already in place" },
          expectedReturnRate: { type: "number", description: "Annualized expected return as decimal (e.g. 0.12 for 12%)" },
          horizonYears: { type: "number", description: "Horizon in years" },
          sipTiming: { type: "string", enum: ["beginning_of_period", "end_of_period"] },
        },
        required: ["targetCorpus", "expectedReturnRate", "horizonYears"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "calculate_savings_gap",
      description: "Compares client's actual disposable surplus against required SIP investments to detect shortfalls or surplus capacity.",
      parameters: {
        type: "object",
        properties: {
          monthlyIncome: { type: "number" },
          monthlyExpenses: { type: "number" },
          monthlyEMI: { type: "number" },
          targetMonthlySIP: { type: "number" },
        },
        required: ["monthlyIncome", "monthlyExpenses", "targetMonthlySIP"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "analyze_income_expenses",
      description: "Audits monthly cashflow, calculates savings rate %, and checks Debt-to-Income (DTI) against 40% prudential ceiling.",
      parameters: {
        type: "object",
        properties: {
          monthlyIncome: { type: "number" },
          monthlyExpenses: { type: "number" },
          monthlyEMI: { type: "number" },
        },
        required: ["monthlyIncome", "monthlyExpenses"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "calculate_emergency_fund_coverage",
      description: "Calculates months of emergency reserve runway based on fixed living expenses and loan EMI commitments.",
      parameters: {
        type: "object",
        properties: {
          emergencyFundAmount: { type: "number" },
          monthlyExpenses: { type: "number" },
          monthlyEMI: { type: "number" },
        },
        required: ["emergencyFundAmount", "monthlyExpenses"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_existing_portfolio_summary",
      description: "Summarizes liquid savings, market investments, outstanding liabilities, and total net worth.",
      parameters: {
        type: "object",
        properties: {
          existingSavings: { type: "number" },
          existingInvestments: { type: "number" },
          outstandingLiabilities: { type: "number" },
        },
        required: ["existingSavings", "existingInvestments", "outstandingLiabilities"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_missing_client_information",
      description: "Audits the client profile for missing information required for statutory SEBI financial planning.",
      parameters: {
        type: "object",
        properties: {
          clientId: { type: "string" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "generate_financial_report",
      description: "Generates a structured financial planning summary and statutory RIA report.",
      parameters: {
        type: "object",
        properties: {
          reportType: {
            type: "string",
            enum: [
              "COMPREHENSIVE_FINANCIAL_PLAN",
              "NET_WORTH_AND_CASHFLOW_AUDIT",
              "RETIREMENT_READINESS",
              "RISK_AND_SUITABILITY_REVIEW",
              "GOAL_FUNDING_STRATEGY",
            ],
          },
          customNotes: { type: "string" },
        },
        required: ["reportType"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "search_amfi_mutual_funds",
      description: "Searches official live AMFI mutual fund master NAV feed (portal.amfiindia.com). Provides verified scheme codes, ISINs, NAV, and date. Note: NAVAll.txt does not provide TER (expense ratio), AUM, or returns. Fiduciary rule: Mutual funds must never be ranked by NAV alone.",
      parameters: {
        type: "object",
        properties: {
          search: { type: "string", description: "Search query (scheme name, category, AMC, or scheme code)" },
          plan: { type: "string", enum: ["Direct", "Regular", "All"], description: "Filter plan type. Defaults to 'Direct'" },
          option: { type: "string", enum: ["Growth", "IDCW", "All"], description: "Filter option type. Defaults to 'Growth'" },
          category: { type: "string", description: "Filter by category (e.g. 'Equity', 'Small Cap', 'Debt')" },
          amc: { type: "string", description: "Filter by AMC name (e.g. 'HDFC', 'SBI', 'Nippon')" },
          limit: { type: "number", description: "Maximum number of schemes to return (max 25, default 10)" },
        },
      },
    },
  },
];

/**
 * Executes an allowlisted tool function deterministically with Zod validation
 */
export async function executeAITool(
  toolName: string,
  args: any,
  context: { client: Client; goals: Goal[] }
): Promise<{ success: boolean; result?: any; error?: string }> {
  try {
    const { client, goals } = context;

    switch (toolName) {
      case "get_client_summary": {
        const validated = ToolSchemas.get_client_summary.parse(args || {});
        const monthlyBurn = client.monthlyExpenses + client.monthlyEMI;
        const monthlySurplus = client.monthlyIncome - monthlyBurn;
        const runway = monthlyBurn > 0 ? (client.emergencyFundAmount / monthlyBurn).toFixed(1) : "0.0";
        const netWorth = client.existingSavings + client.existingInvestments - client.outstandingLiabilities;

        return {
          success: true,
          result: {
            clientName: client.fullName,
            age: client.age,
            city: client.city,
            employment: client.employmentType,
            monthlyIncome: client.monthlyIncome,
            monthlyExpenses: client.monthlyExpenses,
            monthlyEMI: client.monthlyEMI,
            monthlySurplus,
            emergencyReserve: client.emergencyFundAmount,
            emergencyRunwayMonths: Number(runway),
            netWorth,
            riskCapacity: client.riskProfile?.capacityLevel || "MODERATE",
            riskTolerance: client.riskProfile?.toleranceLevel || "MODERATE",
            combinedCategory: client.riskProfile?.combinedCategory || "BALANCED",
            hasConflict: client.riskProfile?.hasConflict || false,
            conflictRationale: client.riskProfile?.conflictRationale,
          },
        };
      }

      case "get_client_goals": {
        return {
          success: true,
          result: goals.map((g) => ({
            id: g.id,
            title: g.title,
            category: g.category,
            currentCost: g.currentCost,
            horizonYears: g.targetHorizonYears,
            futureTargetAmount: g.targetAmount,
            monthlySIPRequired: g.calculationResults?.requiredMonthlySIP || 0,
            status: g.calculationResults?.feasibilityStatus || "UNDERFUNDED",
          })),
        };
      }

      case "calculate_future_corpus": {
        const validated = ToolSchemas.calculate_future_corpus.parse(args);
        const fv = calculateInflationAdjustedCost(
          validated.currentCost,
          validated.inflationRate,
          validated.horizonYears
        );
        return {
          success: true,
          result: {
            currentCost: validated.currentCost,
            inflationRate: `${(validated.inflationRate * 100).toFixed(1)}%`,
            horizonYears: validated.horizonYears,
            futureCorpusRequired: fv,
            formattedFutureCorpus: formatINR(fv),
            formula: "FV = PV * (1 + inflationRate)^horizonYears",
          },
        };
      }

      case "calculate_required_sip": {
        const validated = ToolSchemas.calculate_required_sip.parse(args);
        const fvExisting = calculateFutureValueOfSavings(
          validated.existingSavings,
          validated.expectedReturnRate,
          validated.horizonYears
        );
        const netShortfall = Math.max(0, validated.targetCorpus - fvExisting);
        const sip = calculateRequiredMonthlySIP(
          netShortfall,
          validated.expectedReturnRate,
          validated.horizonYears,
          validated.sipTiming as any
        );

        return {
          success: true,
          result: {
            targetCorpus: validated.targetCorpus,
            existingSavings: validated.existingSavings,
            futureValueOfExistingSavings: fvExisting,
            netFundingShortfall: netShortfall,
            recommendedMonthlySIP: sip,
            formattedMonthlySIP: formatINR(sip),
            expectedReturn: `${(validated.expectedReturnRate * 100).toFixed(1)}%`,
            horizonYears: validated.horizonYears,
            sipTiming: validated.sipTiming,
          },
        };
      }

      case "calculate_savings_gap": {
        const validated = ToolSchemas.calculate_savings_gap.parse(args);
        const burn = validated.monthlyExpenses + validated.monthlyEMI;
        const surplus = validated.monthlyIncome - burn;
        const gap = validated.targetMonthlySIP - surplus;

        return {
          success: true,
          result: {
            monthlyIncome: validated.monthlyIncome,
            monthlySurplus: surplus,
            targetMonthlySIP: validated.targetMonthlySIP,
            surplusOrGap: gap > 0 ? "SHORTFALL" : "SURPLUS_COVERED",
            gapAmount: Math.abs(gap),
            feasibilityNote:
              gap > 0
                ? `Shortfall of ${formatINR(gap)}/mo. The required SIP exceeds disposable surplus. Consider extending horizon or rationalizing expenses.`
                : `Surplus covers the required SIP with ${formatINR(Math.abs(gap))}/mo remaining buffer.`,
          },
        };
      }

      case "analyze_income_expenses": {
        const validated = ToolSchemas.analyze_income_expenses.parse(args);
        const burn = validated.monthlyExpenses + validated.monthlyEMI;
        const surplus = validated.monthlyIncome - burn;
        const savingsRate = validated.monthlyIncome > 0 ? Math.round((surplus / validated.monthlyIncome) * 100) : 0;
        const dti = validated.monthlyIncome > 0 ? Math.round((validated.monthlyEMI / validated.monthlyIncome) * 100) : 0;

        return {
          success: true,
          result: {
            monthlyIncome: validated.monthlyIncome,
            totalBurn: burn,
            monthlySurplus: surplus,
            savingsRatePercent: savingsRate,
            dtiPercent: dti,
            isDTIPrudential: dti <= 40,
            prudentialEvaluation:
              dti > 40
                ? "⚠️ Warning: DTI exceeds 40% prudential ceiling. Debt reduction must take priority."
                : "✅ DTI is within healthy limits (<= 40%).",
          },
        };
      }

      case "calculate_emergency_fund_coverage": {
        const validated = ToolSchemas.calculate_emergency_fund_coverage.parse(args);
        const burn = validated.monthlyExpenses + validated.monthlyEMI;
        const runway = burn > 0 ? Math.round((validated.emergencyFundAmount / burn) * 10) / 10 : 0;
        const targetBenchmark = burn * 6;
        const shortfall = Math.max(0, targetBenchmark - validated.emergencyFundAmount);

        return {
          success: true,
          result: {
            emergencyFundAmount: validated.emergencyFundAmount,
            monthlyFixedBurn: burn,
            runwayMonths: runway,
            benchmarkMonths: 6,
            shortfallAmount: shortfall,
            adequacyStatus:
              runway >= 6 ? "ADEQUATE" : runway >= 3 ? "MODERATE_SHORTFALL" : "CRITICAL_DEFICIT",
          },
        };
      }

      case "get_existing_portfolio_summary": {
        const validated = ToolSchemas.get_existing_portfolio_summary.parse(args);
        const totalAssets = validated.existingSavings + validated.existingInvestments;
        const netWorth = totalAssets - validated.outstandingLiabilities;
        const debtToAsset = totalAssets > 0 ? Math.round((validated.outstandingLiabilities / totalAssets) * 100) : 0;

        return {
          success: true,
          result: {
            liquidSavings: validated.existingSavings,
            marketInvestments: validated.existingInvestments,
            totalAssets,
            outstandingLiabilities: validated.outstandingLiabilities,
            netWorth,
            debtToAssetRatioPercent: debtToAsset,
          },
        };
      }

      case "get_missing_client_information": {
        const missing: string[] = [];
        if (!client.emergencyFundAmount || client.emergencyFundAmount === 0) {
          missing.push("Emergency fund balance not declared or zero.");
        }
        if (!client.numberOfDependants && client.numberOfDependants !== 0) {
          missing.push("Dependants count not specified.");
        }
        if (goals.length === 0) {
          missing.push("No client financial goals recorded.");
        }
        if (client.monthlyExpenses === 0) {
          missing.push("Monthly household expenses not provided.");
        }
        if (!client.investmentExperience) {
          missing.push("Prior investment experience not documented.");
        }

        return {
          success: true,
          result: {
            clientId: client.id,
            clientName: client.fullName,
            missingFieldsCount: missing.length,
            missingItems: missing,
            isCompleteForPlan: missing.length === 0,
            adviserActionRecommended:
              missing.length > 0
                ? "Request clarifying documents or onboarding interview before finalizing statutory financial plan."
                : "Profile has sufficient demographic and cashflow details for fiduciary plan generation.",
          },
        };
      }

      case "generate_financial_report": {
        const validated = ToolSchemas.generate_financial_report.parse(args);
        const report = generateStructuredReport({
          client,
          goals,
          reportType: validated.reportType as ReportType,
          customNotes: validated.customNotes,
        });

        return {
          success: true,
          result: {
            reportId: report.id,
            title: report.title,
            reportType: report.reportType,
            summary: report.summary,
            monthlySurplus: report.keyMetrics.monthlySurplus,
            emergencyRunwayMonths: report.keyMetrics.emergencyFundMonths,
            totalGoalsValued: report.keyMetrics.totalGoalCorpusNeeded,
            suitabilityFindingsCount: report.suitabilityFindings.length,
          },
        };
      }

      case "search_amfi_mutual_funds": {
        const validated = ToolSchemas.search_amfi_mutual_funds.parse(args);
        const { schemes, latestDataDate } = await getLiveAmfiSchemes(false);
        const { filtered, totalMatched } = filterAmfiSchemes(schemes, {
          search: validated.search,
          plan: validated.plan,
          option: validated.option,
          category: validated.category,
          amc: validated.amc,
          limit: validated.limit,
        });

        return {
          success: true,
          result: {
            source: "https://portal.amfiindia.com/spages/NAVAll.txt",
            latestDataDate,
            totalMatched,
            count: filtered.length,
            schemes: filtered.map((s) => ({
              schemeCode: s.schemeCode,
              schemeName: s.schemeName,
              amc: s.amc,
              category: s.category,
              planType: s.planType,
              optionType: s.optionType,
              currentNAV: s.nav !== null ? `₹${s.nav}` : "N.A.",
              navDate: s.navDate,
              isin: s.isinGrowth || s.isinReinvestment || "N/A",
            })),
            fiduciaryMandate:
              "Official AMFI NAV master feed. Funds must NEVER be ranked by NAV alone. Expense ratio (TER), AUM, and portfolio holdings require official AMC factsheets. Suitability must be verified against client goals, horizon, and risk capacity.",
          },
        };
      }

      default:
        return {
          success: false,
          error: `Unrecognized tool: "${toolName}". Only allowlisted fiduciary tools can be executed.`,
        };
    }
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || `Failed to execute tool ${toolName}`,
    };
  }
}
