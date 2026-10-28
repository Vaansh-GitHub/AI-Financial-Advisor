import { NextResponse } from "next/server";
import { runPortfolioBacktest } from "@/lib/portfolio/backtest";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      holdings = [],
      startDate = "2016-01-01",
      endDate = "2026-01-01",
      initialInvestment = 1000000,
      rebalanceFrequency = "ANNUAL",
      expenseRatioDeduction = true,
    } = body;

    const result = runPortfolioBacktest(holdings, {
      startDate,
      endDate,
      initialInvestment: Number(initialInvestment),
      rebalanceFrequency,
      expenseRatioDeduction: Boolean(expenseRatioDeduction),
    });

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to run portfolio backtest" }, { status: 500 });
  }
}
