"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  TrendingUp,
  History,
  AlertTriangle,
  ShieldCheck,
  Percent,
  Sliders,
  DollarSign,
  ArrowRight,
  Info,
} from "lucide-react";
import { formatINR, formatPercent } from "@/lib/utils";
import { Badge } from "@/components/ui/Badge";
import { StatCard } from "@/components/ui/StatCard";
import { runPortfolioBacktest } from "@/lib/portfolio/backtest";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
} from "recharts";

export default function BacktestingPage() {
  const [initialCapital, setInitialCapital] = useState(1000000); // 10 Lakhs
  const [durationYears, setDurationYears] = useState(10);
  const [rebalance, setRebalance] = useState<"ANNUAL" | "BUY_AND_HOLD">("ANNUAL");
  const [deductTER, setDeductTER] = useState(true);

  // Standard Balanced Growth 60:40 Model Portfolio
  const holdings = [
    {
      schemeCode: "122639",
      schemeName: "Parag Parikh Flexi Cap Fund",
      category: "Equity" as const,
      subCategory: "Flexi Cap",
      weightPercent: 35,
      expenseRatio: 0.65,
      inceptionDate: "2013-05-24",
    },
    {
      schemeCode: "120503",
      schemeName: "Mirae Asset Large & Midcap Fund",
      category: "Equity" as const,
      subCategory: "Large & Mid Cap",
      weightPercent: 25,
      expenseRatio: 0.61,
      inceptionDate: "2010-07-09",
    },
    {
      schemeCode: "119823",
      schemeName: "Aditya Birla Sun Life Corporate Bond Fund",
      category: "Debt" as const,
      subCategory: "Corporate Bond",
      weightPercent: 30,
      expenseRatio: 0.32,
      inceptionDate: "2011-03-03",
    },
    {
      schemeCode: "119598",
      schemeName: "SBI Liquid Fund",
      category: "Debt" as const,
      subCategory: "Liquid",
      weightPercent: 10,
      expenseRatio: 0.18,
      inceptionDate: "2003-11-24",
    },
  ];

  const startDate = `${2026 - durationYears}-01-01`;
  const endDate = "2026-01-01";

  // Run backtesting engine
  const backtest = runPortfolioBacktest(holdings, {
    startDate,
    endDate,
    initialInvestment: initialCapital,
    rebalanceFrequency: rebalance,
    expenseRatioDeduction: deductTER,
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Historical Portfolio Backtesting Engine
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Simulate 10-year historical risk & return metrics with annual rebalancing and expense ratio deductions.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="teal">Verified AMFI Data</Badge>
          <Badge variant="navy">NIFTY 50 TRI Benchmark</Badge>
        </div>
      </div>

      {/* Disclosures & Limitations Banner */}
      <div className="p-4 rounded-xl bg-slate-900 text-white shadow-xs space-y-2">
        <div className="flex items-center gap-2 text-teal-400 font-bold text-xs uppercase tracking-wider">
          <Info className="w-4 h-4" />
          <span>Mandatory Fiduciary Backtest Disclosures</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-[11px] text-slate-300">
          {backtest.limitationsAndDisclosures.map((disc, idx) => (
            <div key={idx} className="flex items-start gap-1.5">
              <span className="text-teal-400 font-bold">•</span>
              <span>{disc}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Controls & Assumptions */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs grid grid-cols-1 sm:grid-cols-4 gap-4 text-xs">
        <div>
          <label className="block font-semibold text-slate-700 mb-1">Initial Capital (₹)</label>
          <input
            type="number"
            step={100000}
            min={100000}
            value={initialCapital}
            onChange={(e) => setInitialCapital(Number(e.target.value))}
            className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 font-bold text-slate-900"
          />
        </div>

        <div>
          <label className="block font-semibold text-slate-700 mb-1">Backtest Duration</label>
          <select
            value={durationYears}
            onChange={(e) => setDurationYears(Number(e.target.value))}
            className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 font-medium text-slate-900"
          >
            <option value={10}>10 Years (2016 – 2026)</option>
            <option value={7}>7 Years (2019 – 2026)</option>
            <option value={5}>5 Years (2021 – 2026)</option>
            <option value={3}>3 Years (2023 – 2026)</option>
          </select>
        </div>

        <div>
          <label className="block font-semibold text-slate-700 mb-1">Rebalancing Frequency</label>
          <select
            value={rebalance}
            onChange={(e) => setRebalance(e.target.value as any)}
            className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 font-medium text-slate-900"
          >
            <option value="ANNUAL">Annual Rebalancing</option>
            <option value="BUY_AND_HOLD">Buy & Hold (No Rebalance)</option>
          </select>
        </div>

        <div>
          <label className="block font-semibold text-slate-700 mb-1">Expense Ratio (TER) Impact</label>
          <div className="flex items-center gap-2 mt-2">
            <input
              type="checkbox"
              id="deductTER"
              checked={deductTER}
              onChange={(e) => setDeductTER(e.target.checked)}
              className="accent-teal-600 rounded cursor-pointer"
            />
            <label htmlFor="deductTER" className="font-medium text-slate-700 cursor-pointer">
              Deduct Annual TER from Returns
            </label>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          title="Portfolio Final Value"
          value={formatINR(backtest.finalPortfolioValue)}
          subtitle={`From ${formatINR(initialCapital)} initial capital`}
          accentColor="teal"
        />
        <StatCard
          title="Portfolio CAGR"
          value={`${backtest.cagrPercent}%`}
          subtitle={`vs Benchmark: ${backtest.benchmarkCagrPercent}%`}
          accentColor="navy"
          trend={{ value: `${backtest.alphaPercent >= 0 ? "+" : ""}${backtest.alphaPercent}% Alpha`, isPositive: backtest.alphaPercent >= 0 }}
        />
        <StatCard
          title="Sharpe Ratio (Rf: 6.5%)"
          value={backtest.sharpeRatio}
          subtitle="Risk-adjusted efficiency"
          accentColor="slate"
        />
        <StatCard
          title="Maximum Historical Drawdown"
          value={`${backtest.maxDrawdownPercent}%`}
          subtitle={`vs Benchmark: ${backtest.benchmarkMaxDrawdownPercent}%`}
          accentColor="rose"
        />
      </div>

      {/* Backtest Growth Chart */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              Portfolio Growth vs Benchmark (NIFTY 50 Composite)
            </h3>
            <p className="text-xs text-slate-500">
              Time-series tracking {durationYears}-year performance from {startDate} to {endDate}
            </p>
          </div>
          <Badge variant="teal">{rebalance} Rebalanced</Badge>
        </div>

        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={backtest.yearlyTimeSeries} margin={{ top: 10, right: 20, left: 20, bottom: 0 }}>
              <XAxis dataKey="date" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `₹${(v / 100000).toFixed(0)}L`} />
              <Tooltip formatter={(v: any) => [formatINR(v), "Corpus Value"]} />
              <Legend wrapperStyle={{ fontSize: "11px", paddingTop: "8px" }} />
              <Line
                name="Recommended Portfolio"
                type="monotone"
                dataKey="portfolioValue"
                stroke="#0d9488"
                strokeWidth={3}
                dot={{ r: 4 }}
              />
              <Line
                name="Benchmark (NIFTY 50 Composite)"
                type="monotone"
                dataKey="benchmarkValue"
                stroke="#94a3b8"
                strokeWidth={2}
                strokeDasharray="4 4"
                dot={{ r: 3 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
