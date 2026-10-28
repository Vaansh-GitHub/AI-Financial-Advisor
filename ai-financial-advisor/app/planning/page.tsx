"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Target,
  Calculator,
  TrendingUp,
  Sliders,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  ShieldAlert,
  Info,
  Calendar,
} from "lucide-react";
import { formatINR, formatPercent } from "@/lib/utils";
import { Badge, StatusBadge } from "@/components/ui/Badge";
import {
  calculateGoalPlan,
  generateScenarioComparisons,
  suggestAssetAllocation,
  generateGlidePath,
} from "@/lib/finance/calculations";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
} from "recharts";

export default function GoalPlanningWizardPage() {
  const router = useRouter();
  const [clients, setClients] = useState<any[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<string>("");

  // Goal Inputs State
  const [goalTitle, setGoalTitle] = useState("Child's Higher Education");
  const [category, setCategory] = useState("CHILD_EDUCATION");
  const [currentCost, setCurrentCost] = useState(2500000); // 25 Lakhs
  const [horizonYears, setHorizonYears] = useState(12);
  const [inflationRate, setInflationRate] = useState(0.07); // 7%
  const [annualReturn, setAnnualReturn] = useState(0.125); // 12.5%
  const [existingSavings, setExistingSavings] = useState(300000); // 3 Lakhs
  const [currentContribution, setCurrentContribution] = useState(15000); // 15K/mo
  const [riskCategory, setRiskCategory] = useState<any>("GROWTH");
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    async function loadClients() {
      try {
        const res = await fetch("/api/clients");
        const json = await res.json();
        if (json.data && json.data.length > 0) {
          setClients(json.data);
          setSelectedClientId(json.data[0]._id);
        }
      } catch (err) {
        console.error("Failed to load clients:", err);
      }
    }
    loadClients();
  }, []);

  // When selected client changes, update baseline assumptions
  useEffect(() => {
    if (!selectedClientId) return;
    const client = clients.find((c) => c._id === selectedClientId);
    if (client) {
      if (client.riskProfile?.combinedCategory) {
        setRiskCategory(client.riskProfile.combinedCategory);
      }
    }
  }, [selectedClientId, clients]);

  // LIVE DETERMINISTIC CALCULATIONS
  const calculation = calculateGoalPlan({
    currentCost,
    targetHorizonYears: horizonYears,
    expectedInflationRate: inflationRate,
    expectedAnnualReturn: annualReturn,
    existingSavings,
    currentMonthlyContribution: currentContribution,
    sipTiming: "beginning_of_period",
  });

  const scenarios = generateScenarioComparisons(
    currentCost,
    horizonYears,
    inflationRate,
    annualReturn,
    existingSavings
  );

  const allocation = suggestAssetAllocation(horizonYears, riskCategory);
  const glidePath = generateGlidePath(horizonYears, allocation.equityPercent);

  // Asset allocation pie data
  const allocationData = [
    { name: "Equity", value: allocation.equityPercent, color: "#0d9488" },
    { name: "Debt / Fixed Income", value: allocation.debtPercent, color: "#0284c7" },
    { name: "Liquid / Cash", value: allocation.goldOrCashPercent, color: "#94a3b8" },
  ];

  const handleSaveGoal = async () => {
    if (!selectedClientId) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/clients/${selectedClientId}/goals`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: goalTitle,
          category,
          currentCost,
          targetHorizonYears: horizonYears,
          expectedInflationRate: inflationRate,
          expectedAnnualReturn: annualReturn,
          existingSavings,
          currentMonthlyContribution: currentContribution,
          priority: "HIGH",
          liquidityNeeds: horizonYears < 3 ? "high" : "medium",
        }),
      });
      const json = await res.json();
      if (json.success) {
        setSaveSuccess(true);
        setTimeout(() => {
          setSaveSuccess(false);
          router.push(`/clients/${selectedClientId}`);
        }, 1500);
      }
    } catch (err) {
      console.error("Failed to save goal:", err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Goal-Based Financial Planning Engine
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Real-time mathematical modeling: Inflation compounding, annuity-due monthly SIP, feasibility, sensitivity scenarios, and glide path.
          </p>
        </div>

        <button
          onClick={handleSaveGoal}
          disabled={saving || !selectedClientId}
          className="px-4 py-2 bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs rounded-lg flex items-center gap-1.5 transition disabled:opacity-60 shadow-sm cursor-pointer shrink-0"
        >
          <CheckCircle2 className="w-4 h-4" />
          <span>{saving ? "Saving to Client..." : "Attach Goal to Client Profile"}</span>
        </button>
      </div>

      {saveSuccess && (
        <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>Goal successfully saved to client profile! Redirecting...</span>
        </div>
      )}

      {/* Main Grid: Left Inputs Form, Right Live Financial Model */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* LEFT COLUMN: ASSUMPTIONS & INPUTS (5 Cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4">
            <div className="border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Sliders className="w-4 h-4 text-teal-600" />
                <span>Client & Milestone Parameters</span>
              </h3>
            </div>

            {/* Client Picker */}
            <div className="text-xs">
              <label className="block font-semibold text-slate-700 mb-1">Target Client Profile</label>
              <select
                value={selectedClientId}
                onChange={(e) => setSelectedClientId(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 focus:outline-hidden focus:border-teal-500 font-medium"
              >
                {clients.map((c) => (
                  <option key={c._id} value={c._id}>
                    {c.fullName} ({c.demoPersonaTag || c.city})
                  </option>
                ))}
              </select>
            </div>

            {/* Goal Title & Category */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Goal Milestone Title</label>
                <input
                  type="text"
                  value={goalTitle}
                  onChange={(e) => setGoalTitle(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 focus:outline-hidden focus:border-teal-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 focus:outline-hidden focus:border-teal-500"
                >
                  <option value="CHILD_EDUCATION">Child Education</option>
                  <option value="RETIREMENT">Retirement Corpus</option>
                  <option value="HOME_PURCHASE">Home Purchase</option>
                  <option value="EMERGENCY_FUND">Emergency Buffer</option>
                  <option value="MEDICAL_RESERVE">Medical Reserve</option>
                  <option value="WEALTH_CREATION">Wealth Compounding</option>
                  <option value="CUSTOM">Custom Milestone</option>
                </select>
              </div>
            </div>

            {/* Sliders: Today's Estimated Cost */}
            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between">
                <label className="font-semibold text-slate-700">Today&apos;s Estimated Cost (PV):</label>
                <span className="font-bold text-teal-700">{formatINR(currentCost)}</span>
              </div>
              <input
                type="range"
                min={100000}
                max={20000000}
                step={100000}
                value={currentCost}
                onChange={(e) => setCurrentCost(Number(e.target.value))}
                className="w-full accent-teal-600 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-400">
                <span>₹1 Lakh</span>
                <span>₹2 Crore</span>
              </div>
            </div>

            {/* Sliders: Horizon in Years */}
            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between">
                <label className="font-semibold text-slate-700">Investment Horizon:</label>
                <span className="font-bold text-teal-700">{horizonYears} Years ({horizonYears * 12} Months)</span>
              </div>
              <input
                type="range"
                min={1}
                max={35}
                step={1}
                value={horizonYears}
                onChange={(e) => setHorizonYears(Number(e.target.value))}
                className="w-full accent-teal-600 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-400">
                <span>1 Year (Preservation)</span>
                <span>35 Years (Ultra Long)</span>
              </div>
            </div>

            {/* Sliders: Inflation Rate */}
            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between">
                <label className="font-semibold text-slate-700">Expected Annual Inflation Rate:</label>
                <span className="font-bold text-teal-700">{(inflationRate * 100).toFixed(1)}% p.a.</span>
              </div>
              <input
                type="range"
                min={0.02}
                max={0.15}
                step={0.005}
                value={inflationRate}
                onChange={(e) => setInflationRate(Number(e.target.value))}
                className="w-full accent-teal-600 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-400">
                <span>2.0% (CPI low)</span>
                <span>15.0% (Education/Medical high)</span>
              </div>
            </div>

            {/* Sliders: Annual Portfolio Return */}
            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between">
                <label className="font-semibold text-slate-700">Expected Annual Return Rate (CAGR):</label>
                <span className="font-bold text-teal-700">{(annualReturn * 100).toFixed(1)}% p.a.</span>
              </div>
              <input
                type="range"
                min={0.05}
                max={0.18}
                step={0.005}
                value={annualReturn}
                onChange={(e) => setAnnualReturn(Number(e.target.value))}
                className="w-full accent-teal-600 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-400">
                <span>5.0% (Liquid/Debt)</span>
                <span>18.0% (Aggressive Equity)</span>
              </div>
            </div>

            {/* Existing Savings & Current Contribution */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs pt-2 border-t border-slate-100">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Existing Dedicated Savings (₹)</label>
                <input
                  type="number"
                  min={0}
                  step={25000}
                  value={existingSavings}
                  onChange={(e) => setExistingSavings(Number(e.target.value))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 focus:outline-hidden focus:border-teal-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Current Monthly Savings (₹)</label>
                <input
                  type="number"
                  min={0}
                  step={1000}
                  value={currentContribution}
                  onChange={(e) => setCurrentContribution(Number(e.target.value))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 focus:outline-hidden focus:border-teal-500"
                />
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: CALCULATION RESULTS & VISUALIZATIONS (7 Cols) */}
        <div className="lg:col-span-7 space-y-5">
          {/* Main Key Figures Highlight */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-gradient-to-br from-[#0b192c] to-[#152945] rounded-xl p-5 text-white shadow-sm border border-slate-700/60">
              <span className="text-[11px] font-bold text-teal-400 uppercase tracking-wider block">
                Inflation-Adjusted Future Corpus (FV)
              </span>
              <div className="text-2xl sm:text-3xl font-extrabold text-white mt-1">
                {formatINR(calculation.inflationAdjustedCost)}
              </div>
              <p className="text-[11px] text-slate-300 mt-2">
                Today&apos;s {formatINR(currentCost)} compounding at {(inflationRate * 100).toFixed(1)}% over {horizonYears} years.
              </p>
              <div className="mt-3 pt-2 border-t border-white/10 text-[11px] text-slate-400 flex justify-between">
                <span>Existing savings growth:</span>
                <span className="text-white font-semibold">
                  {formatINR(calculation.futureValueOfExistingSavings)}
                </span>
              </div>
            </div>

            <div className="bg-teal-50 border border-teal-200/80 rounded-xl p-5 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-teal-900 uppercase tracking-wider">
                  Required Monthly SIP
                </span>
                <Badge variant={calculation.feasibilityStatus === "UNDERFUNDED" ? "danger" : "teal"}>
                  {calculation.feasibilityStatus}
                </Badge>
              </div>
              <div className="text-2xl sm:text-3xl font-extrabold text-teal-950 mt-1">
                {formatINR(calculation.requiredMonthlySIP)}/mo
              </div>
              <p className="text-[11px] text-teal-800 mt-2">
                Beginning-of-month advance annuity to bridge net shortfall of {formatINR(calculation.corpusShortfall)}.
              </p>
              <div className="mt-3 pt-2 border-t border-teal-200/60 text-[11px] flex justify-between">
                <span className="text-teal-900">Monthly Surplus / Shortfall:</span>
                <span className={`font-bold ${calculation.monthlySurplusOrShortfall >= 0 ? "text-emerald-700" : "text-rose-700"}`}>
                  {calculation.monthlySurplusOrShortfall >= 0 ? "+" : ""}
                  {formatINR(calculation.monthlySurplusOrShortfall)}
                </span>
              </div>
            </div>
          </div>

          {/* Allocation & Glide Path Visualizers */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Suggested Asset Allocation */}
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
              <h4 className="text-xs font-bold text-slate-900 mb-1">
                Suggested Asset Allocation
              </h4>
              <p className="text-[11px] text-slate-500 mb-3">{allocation.rationale}</p>

              <div className="h-40 w-full flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={allocationData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={38}
                      outerRadius={58}
                      paddingAngle={3}
                    >
                      {allocationData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(val: any) => [`${val}%`, "Share"]} />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div className="flex items-center justify-around text-xs mt-2 border-t border-slate-100 pt-2">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-teal-600" />
                  <span className="text-slate-700 font-semibold">{allocation.equityPercent}% Equity</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-sky-600" />
                  <span className="text-slate-700 font-semibold">{allocation.debtPercent}% Debt</span>
                </div>
              </div>
            </div>

            {/* Glide Path Progression */}
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
              <h4 className="text-xs font-bold text-slate-900 mb-1">
                Goal Glide Path (De-Risking)
              </h4>
              <p className="text-[11px] text-slate-500 mb-2">
                Automated equity taper in final 3 years to prevent sequence-of-returns risk.
              </p>

              <div className="h-40 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={glidePath} margin={{ top: 5, right: 10, left: -25, bottom: 0 }}>
                    <XAxis dataKey="yearFromNow" tick={{ fontSize: 9 }} label={{ value: "Year", position: "insideBottomRight", offset: -5, fontSize: 9 }} />
                    <YAxis domain={[0, 100]} unit="%" tick={{ fontSize: 9 }} />
                    <Tooltip formatter={(val: any) => [`${val}%`, "Equity Exposure"]} />
                    <Line type="monotone" dataKey="equityPercent" stroke="#0d9488" strokeWidth={2.5} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              <div className="text-[10px] text-slate-400 mt-2 text-center">
                Accumulation Phase → Consolidation Phase → Preservation Phase
              </div>
            </div>
          </div>

          {/* Sensitivity Scenarios Table */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
            <h4 className="text-xs font-bold text-slate-900 mb-2">
              Sensitivity & Stress-Test Scenarios
            </h4>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-100 text-slate-500 font-semibold">
                  <tr>
                    <th className="py-2 px-3">Scenario</th>
                    <th className="py-2 px-3">Inflation</th>
                    <th className="py-2 px-3">Return</th>
                    <th className="py-2 px-3">Future Corpus</th>
                    <th className="py-2 px-3 font-bold text-teal-800">Required Monthly SIP</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {scenarios.map((sc, i) => (
                    <tr key={i} className="hover:bg-slate-50/60">
                      <td className="py-2.5 px-3 font-semibold text-slate-800">{sc.scenarioName}</td>
                      <td className="py-2.5 px-3 text-slate-600">{sc.inflationRate}%</td>
                      <td className="py-2.5 px-3 text-slate-600">{sc.expectedReturn}%</td>
                      <td className="py-2.5 px-3 text-slate-800">{formatINR(sc.futureCorpus)}</td>
                      <td className="py-2.5 px-3 font-bold text-teal-700">{formatINR(sc.requiredSIP)}/mo</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
