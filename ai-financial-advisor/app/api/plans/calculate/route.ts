import { NextResponse } from "next/server";
import {
  calculateGoalPlan,
  generateScenarioComparisons,
  suggestAssetAllocation,
  generateGlidePath,
} from "@/lib/finance/calculations";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      currentCost = 1000000,
      targetHorizonYears = 10,
      expectedInflationRate = 0.06,
      expectedAnnualReturn = 0.12,
      existingSavings = 0,
      currentMonthlyContribution = 0,
      riskCategory = "BALANCED",
      sipTiming = "beginning_of_period",
    } = body;

    // 1. Goal Plan Core Calculations
    const planResults = calculateGoalPlan({
      currentCost: Number(currentCost),
      targetHorizonYears: Number(targetHorizonYears),
      expectedInflationRate: Number(expectedInflationRate),
      expectedAnnualReturn: Number(expectedAnnualReturn),
      existingSavings: Number(existingSavings),
      currentMonthlyContribution: Number(currentMonthlyContribution),
      sipTiming,
    });

    // 2. Sensitivity Scenarios
    const scenarios = generateScenarioComparisons(
      Number(currentCost),
      Number(targetHorizonYears),
      Number(expectedInflationRate),
      Number(expectedAnnualReturn),
      Number(existingSavings)
    );

    // 3. Asset Allocation Suggestion
    const allocation = suggestAssetAllocation(
      Number(targetHorizonYears),
      riskCategory as any
    );

    // 4. Glide Path
    const glidePath = generateGlidePath(
      Number(targetHorizonYears),
      allocation.equityPercent
    );

    return NextResponse.json({
      success: true,
      calculation: planResults,
      scenarios,
      suggestedAllocation: allocation,
      glidePath,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to calculate plan" },
      { status: 500 }
    );
  }
}
