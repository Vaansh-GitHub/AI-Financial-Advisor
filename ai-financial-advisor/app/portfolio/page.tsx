"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  PieChart as PieIcon,
  Plus,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  ArrowRight,
  TrendingUp,
  Percent,
} from "lucide-react";
import { formatINR, formatPercent } from "@/lib/utils";
import { Badge } from "@/components/ui/Badge";
import { analyzePortfolioDiversification } from "@/lib/portfolio/backtest";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
} from "recharts";

export default function PortfolioAnalysisPage() {
  const [holdings, setHoldings] = useState([
    {
      schemeCode: "122639",
      schemeName: "Parag Parikh Flexi Cap Fund",
      category: "Equity" as const,
      subCategory: "Flexi Cap",
      weightPercent: 40,
      expenseRatio: 0.65,
    },
    {
      schemeCode: "118989",
      schemeName: "HDFC Mid-Cap Opportunities Fund",
      category: "Equity" as const,
      subCategory: "Mid Cap",
      weightPercent: 30,
      expenseRatio: 0.74,
    },
    {
      schemeCode: "119823",
      schemeName: "Aditya Birla Sun Life Corporate Bond Fund",
      category: "Debt" as const,
      subCategory: "Corporate Bond",
      weightPercent: 20,
      expenseRatio: 0.32,
    },
    {
      schemeCode: "119598",
      schemeName: "SBI Liquid Fund",
      category: "Debt" as const,
      subCategory: "Liquid",
      weightPercent: 10,
      expenseRatio: 0.18,
    },
  ]);

  const diversification = analyzePortfolioDiversification(holdings);

  const weightedTER = holdings.reduce(
    (acc, h) => acc + (h.expenseRatio * h.weightPercent) / 100,
    0
  );

  const equityWeight = (diversification.categoryBreakdown["Equity"] || 0);
  const debtWeight = (diversification.categoryBreakdown["Debt"] || 0);
  const hybridWeight = (diversification.categoryBreakdown["Hybrid"] || 0);

  const expectedBlendedReturn = (equityWeight * 0.14 + debtWeight * 0.075 + hybridWeight * 0.11) / 100;

  const allocationPieData = [
    { name: "Equity", value: equityWeight, color: "#0d9488" },
    { name: "Debt", value: debtWeight, color: "#0284c7" },
    { name: "Hybrid", value: hybridWeight, color: "#f59e0b" },
  ].filter((d) => d.value > 0);

  const handleWeightChange = (index: number, val: number) => {
    setHoldings((prev) => {
      const next = [...prev];
      next[index].weightPercent = val;
      return next;
    });
  };

  const removeHolding = (index: number) => {
    setHoldings((prev) => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Portfolio Construction & Diversification
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Build multi-scheme asset allocations, monitor category concentration, and calculate weighted expense ratios.
          </p>
        </div>

        <Link
          href="/backtesting"
          className="px-4 py-2 bg-[#0b192c] hover:bg-[#152945] text-white font-bold text-xs rounded-lg flex items-center gap-1.5 transition shadow-sm w-fit"
        >
          <TrendingUp className="w-4 h-4 text-teal-400" />
          <span>Run 10-Year Backtest →</span>
        </Link>
      </div>

      {/* Diversification Warnings & Validation */}
      {diversification.flags.length > 0 && (
        <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 space-y-1.5">
          <div className="flex items-center gap-2 text-xs font-bold text-amber-900">
            <AlertTriangle className="w-4 h-4 text-amber-600" />
            <span>Diversification & Allocation Alerts</span>
          </div>
          <ul className="text-xs text-amber-800 list-disc list-inside space-y-0.5">
            {diversification.flags.map((flag, idx) => (
              <li key={idx}>{flag}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Grid: Left Holdings Builder (8 Cols), Right Analytics Card (4 Cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Holdings Table & Weight Adjuster */}
        <div className="lg:col-span-8 bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Scheme Weights</h3>
              <p className="text-xs text-slate-500">
                Total Allocated Weight:{" "}
                <span className={`font-bold ${diversification.isValidWeightSum ? "text-emerald-600" : "text-rose-600"}`}>
                  {diversification.totalWeight}% / 100%
                </span>
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-100">
                <tr>
                  <th className="py-2.5 px-3">Scheme Name</th>
                  <th className="py-2.5 px-3">Category</th>
                  <th className="py-2.5 px-3">Expense Ratio</th>
                  <th className="py-2.5 px-3 w-44">Weight %</th>
                  <th className="py-2.5 px-3 text-right">Remove</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {holdings.map((h, i) => (
                  <tr key={i} className="hover:bg-slate-50/60">
                    <td className="py-3 px-3 font-semibold text-slate-900">
                      <div>{h.schemeName}</div>
                      <span className="text-[10px] text-slate-400 font-mono">#{h.schemeCode}</span>
                    </td>
                    <td className="py-3 px-3">
                      <Badge variant={h.category === "Equity" ? "teal" : "info"}>{h.category}</Badge>
                    </td>
                    <td className="py-3 px-3 font-medium text-slate-700">{h.expenseRatio}%</td>
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          min={0}
                          max={100}
                          value={h.weightPercent}
                          onChange={(e) => handleWeightChange(i, Number(e.target.value))}
                          className="w-16 bg-slate-50 border border-slate-200 rounded px-2 py-1 font-bold text-slate-800 text-xs"
                        />
                        <span className="text-slate-400 font-semibold">%</span>
                        <input
                          type="range"
                          min={0}
                          max={100}
                          value={h.weightPercent}
                          onChange={(e) => handleWeightChange(i, Number(e.target.value))}
                          className="w-20 accent-teal-600 cursor-pointer"
                        />
                      </div>
                    </td>
                    <td className="py-3 px-3 text-right">
                      <button
                        onClick={() => removeHolding(i)}
                        className="p-1 text-slate-400 hover:text-rose-600 transition"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Portfolio Metrics & Allocation Visualizer */}
        <div className="lg:col-span-4 bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4">
          <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2">
            Portfolio Health Metrics
          </h3>

          <div className="space-y-3 text-xs">
            <div className="flex justify-between py-1 border-b border-slate-50">
              <span className="text-slate-500">Weighted TER (Expense Ratio):</span>
              <span className="font-extrabold text-teal-700">{weightedTER.toFixed(2)}% p.a.</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-50">
              <span className="text-slate-500">Expected Blended Return:</span>
              <span className="font-extrabold text-slate-900">{(expectedBlendedReturn * 100).toFixed(2)}% p.a.</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-50">
              <span className="text-slate-500">Weight Allocation Sum:</span>
              <span className={`font-bold ${diversification.isValidWeightSum ? "text-emerald-600" : "text-rose-600"}`}>
                {diversification.totalWeight}%
              </span>
            </div>
          </div>

          <div className="h-44 w-full flex items-center justify-center pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={allocationPieData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={38}
                  outerRadius={58}
                  paddingAngle={4}
                >
                  {allocationPieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(v: any) => [`${v}%`, "Weight"]} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="flex justify-around text-xs border-t border-slate-100 pt-2">
            <span className="font-semibold text-teal-700">{equityWeight}% Equity</span>
            <span className="font-semibold text-sky-700">{debtWeight}% Debt</span>
          </div>

          <Link
            href="/backtesting"
            className="w-full mt-2 py-2 bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs rounded-lg flex items-center justify-center gap-1.5 transition shadow-xs"
          >
            Simulate 10-Year Backtest
          </Link>
        </div>
      </div>
    </div>
  );
}
