"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  HelpCircle,
  TrendingDown,
  Sparkles,
  Info,
} from "lucide-react";
import { StatusBadge, Badge } from "@/components/ui/Badge";
import { calculateRiskCapacity, calculateRiskTolerance, evaluateRiskProfile } from "@/lib/risk/scoring";
import { formatINR } from "@/lib/utils";

export default function RiskAssessmentPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  const [client, setClient] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState(false);

  // Questionnaire state
  const [answers, setAnswers] = useState({
    marketLossReaction: "hold_and_do_nothing",
    volatilityComfort: "comfortable_with_fluctuations",
    investmentExperience: "basic_mutual_funds",
    acceptableDrawdown: "up_to_20_percent",
    primaryObjective: "balanced_wealth_accumulation",
  });

  useEffect(() => {
    async function fetchClient() {
      if (!id) return;
      try {
        const res = await fetch(`/api/clients/${id}`);
        const json = await res.json();
        if (json.success && json.data) {
          setClient(json.data);
          if (json.data.riskProfile?.questionnaireResponses) {
            setAnswers((prev) => ({
              ...prev,
              ...json.data.riskProfile.questionnaireResponses,
            }));
          }
        }
      } catch (err) {
        console.error("Failed to load client:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchClient();
  }, [id]);

  if (loading) {
    return <div className="py-20 text-center text-xs text-slate-500">Loading risk engine...</div>;
  }

  if (!client) {
    return <div className="py-20 text-center text-xs text-slate-500">Client not found.</div>;
  }

  // Live calculation of objective Risk Capacity from client financial fields
  const capacity = calculateRiskCapacity({
    monthlyIncome: client.monthlyIncome || 0,
    monthlyExpenses: client.monthlyExpenses || 0,
    existingSavings: client.existingSavings || 0,
    emergencyFundAmount: client.emergencyFundAmount || 0,
    monthlyEMI: client.monthlyEMI || 0,
    numberOfDependants: client.numberOfDependants || 0,
    investmentHorizonYears: client.investmentHorizonYears || 5,
    employmentType: client.employmentType || "salaried_permanent",
    liquidityNeeds: "medium",
  });

  // Live calculation of subjective Risk Tolerance from questionnaire
  const tolerance = calculateRiskTolerance(answers as any);

  // Live conflict evaluation
  const liveAssessment = evaluateRiskProfile(
    {
      monthlyIncome: client.monthlyIncome || 0,
      monthlyExpenses: client.monthlyExpenses || 0,
      existingSavings: client.existingSavings || 0,
      emergencyFundAmount: client.emergencyFundAmount || 0,
      monthlyEMI: client.monthlyEMI || 0,
      numberOfDependants: client.numberOfDependants || 0,
      investmentHorizonYears: client.investmentHorizonYears || 5,
      employmentType: client.employmentType || "salaried_permanent",
      liquidityNeeds: "medium",
    },
    answers as any
  );

  const handleSelect = (question: string, value: string) => {
    setAnswers((prev) => ({ ...prev, [question]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/clients/${id}/risk`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(answers),
      });
      const json = await res.json();
      if (json.success) {
        setSuccessMsg(true);
        setTimeout(() => setSuccessMsg(false), 3000);
      }
    } catch (err) {
      console.error("Save error:", err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <Link
          href={`/clients/${id}`}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 transition mb-2"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to {client.fullName}&apos;s Profile</span>
        </Link>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Risk Profiling & Conflict Resolution Console
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Separates objective loss-absorption capacity from subjective behavioral tolerance.
            </p>
          </div>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs rounded-lg transition disabled:opacity-60 shrink-0 shadow-sm cursor-pointer"
          >
            {saving ? "Saving Assessment..." : "Persist Risk Assessment"}
          </button>
        </div>
      </div>

      {successMsg && (
        <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>Risk assessment saved successfully and recorded in audit log.</span>
        </div>
      )}

      {/* Dynamic Score Ribbon */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Capacity Score */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
            1. Risk Capacity (Objective)
          </span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-3xl font-extrabold text-slate-900">{capacity.score}</span>
            <span className="text-xs text-slate-400">/ 100</span>
            <StatusBadge status={capacity.level} />
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            Emergency Fund: {capacity.factors.emergencyFundMonths} mo • EMI: {(capacity.factors.emiToIncomeRatio * 100).toFixed(0)}% of income
          </p>
        </div>

        {/* Tolerance Score */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
            2. Risk Tolerance (Behavioral)
          </span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-3xl font-extrabold text-slate-900">{tolerance.score}</span>
            <span className="text-xs text-slate-400">/ 100</span>
            <StatusBadge status={tolerance.level} />
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            Evaluated live from the 5 questionnaire responses below.
          </p>
        </div>

        {/* Reconciled Category */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
            3. Final Suitability Profile
          </span>
          <div className="mt-2">
            <StatusBadge status={liveAssessment.combinedCategory} />
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            {liveAssessment.hasConflict ? "Capacity ceiling enforced" : "Capacity and tolerance in alignment"}
          </p>
        </div>
      </div>

      {/* Conflict Resolution Banner */}
      {liveAssessment.hasConflict && (
        <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="text-xs space-y-1">
            <p className="font-bold text-amber-900">
              Governance Conflict: {liveAssessment.conflictDetails?.type}
            </p>
            <p className="text-amber-800 leading-relaxed">
              {liveAssessment.conflictDetails?.description}
            </p>
            <p className="text-amber-900 font-semibold pt-1">
              {liveAssessment.conflictDetails?.resolutionRule}
            </p>
            <p className="text-[11px] text-amber-700 italic">
              Adviser Action: {liveAssessment.conflictDetails?.suggestedReviewAction}
            </p>
          </div>
        </div>
      )}

      {/* Behavioral Questionnaire */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-6">
        <div className="border-b border-slate-100 pb-3">
          <h3 className="text-sm font-bold text-slate-900">
            Psychological & Behavioral Risk Questionnaire
          </h3>
          <p className="text-xs text-slate-500">
            Select the client&apos;s verified response to assess psychological drawdown tolerance
          </p>
        </div>

        {/* Q1 */}
        <div className="space-y-2 text-xs">
          <label className="font-semibold text-slate-800 block">
            1. If equity markets drop 20% over 3 months, how would the client instinctively react?
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {[
              { id: "panic_sell_all", label: "Panic sell all investments to protect remaining capital", pts: "Low" },
              { id: "sell_some_to_reduce_risk", label: "Sell a portion of holdings to lower volatility", pts: "Mod-Low" },
              { id: "hold_and_do_nothing", label: "Hold steady, understanding cycles are temporary", pts: "Moderate" },
              { id: "buy_more_at_discount", label: "Invest additional surplus to accumulate units at a discount", pts: "High" },
            ].map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => handleSelect("marketLossReaction", opt.id)}
                className={`p-3 rounded-lg border text-left transition cursor-pointer flex items-start justify-between ${
                  answers.marketLossReaction === opt.id
                    ? "bg-teal-50/80 border-teal-500 ring-1 ring-teal-500 text-teal-950"
                    : "border-slate-200 hover:border-slate-300 text-slate-700"
                }`}
              >
                <span>{opt.label}</span>
                <span className="text-[10px] text-slate-400 font-medium shrink-0 ml-2">{opt.pts}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Q2 */}
        <div className="space-y-2 text-xs">
          <label className="font-semibold text-slate-800 block">
            2. Comfort with portfolio day-to-day NAV fluctuations:
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {[
              { id: "very_uncomfortable", label: "Very uncomfortable (Cannot tolerate negative statements)", pts: "Low" },
              { id: "mildly_uncomfortable", label: "Mildly uncomfortable, but accepts small variations", pts: "Mod-Low" },
              { id: "comfortable_with_fluctuations", label: "Comfortable with medium volatility for long-term gains", pts: "Moderate" },
              { id: "thrives_on_volatility", label: "Actively embraces volatility to capture superior returns", pts: "High" },
            ].map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => handleSelect("volatilityComfort", opt.id)}
                className={`p-3 rounded-lg border text-left transition cursor-pointer flex items-start justify-between ${
                  answers.volatilityComfort === opt.id
                    ? "bg-teal-50/80 border-teal-500 ring-1 ring-teal-500 text-teal-950"
                    : "border-slate-200 hover:border-slate-300 text-slate-700"
                }`}
              >
                <span>{opt.label}</span>
                <span className="text-[10px] text-slate-400 font-medium shrink-0 ml-2">{opt.pts}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Q3 */}
        <div className="space-y-2 text-xs">
          <label className="font-semibold text-slate-800 block">
            3. Prior investment experience in market-linked instruments:
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {[
              { id: "none_or_beginner", label: "Beginner (Only fixed deposits, savings accounts, gold)", pts: "Low" },
              { id: "basic_mutual_funds", label: "Basic (Invested in equity/debt mutual funds or SIPs)", pts: "Moderate" },
              { id: "active_equity_and_debt", label: "Seasoned (Direct equity, debt funds, balanced allocations)", pts: "Growth" },
              { id: "advanced_derivatives_or_active_trading", label: "Active Trader (Derivatives, F&O, intraday trading)", pts: "Aggressive" },
            ].map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => handleSelect("investmentExperience", opt.id)}
                className={`p-3 rounded-lg border text-left transition cursor-pointer flex items-start justify-between ${
                  answers.investmentExperience === opt.id
                    ? "bg-teal-50/80 border-teal-500 ring-1 ring-teal-500 text-teal-950"
                    : "border-slate-200 hover:border-slate-300 text-slate-700"
                }`}
              >
                <span>{opt.label}</span>
                <span className="text-[10px] text-slate-400 font-medium shrink-0 ml-2">{opt.pts}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Q4 */}
        <div className="space-y-2 text-xs">
          <label className="font-semibold text-slate-800 block">
            4. Maximum acceptable temporary portfolio drawdown over a 12-month period:
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {[
              { id: "zero_loss", label: "Zero Loss: Absolute capital protection is mandatory", pts: "0%" },
              { id: "up_to_10_percent", label: "Conservative Drawdown: Tolerates up to 10% dip", pts: "≤ 10%" },
              { id: "up_to_20_percent", label: "Moderate Drawdown: Tolerates 10% - 20% drawdown", pts: "≤ 20%" },
              { id: "greater_than_20_percent", label: "High Drawdown: Willing to endure >20% cyclical drawdowns", pts: "> 20%" },
            ].map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => handleSelect("acceptableDrawdown", opt.id)}
                className={`p-3 rounded-lg border text-left transition cursor-pointer flex items-start justify-between ${
                  answers.acceptableDrawdown === opt.id
                    ? "bg-teal-50/80 border-teal-500 ring-1 ring-teal-500 text-teal-950"
                    : "border-slate-200 hover:border-slate-300 text-slate-700"
                }`}
              >
                <span>{opt.label}</span>
                <span className="text-[10px] text-slate-400 font-medium shrink-0 ml-2">{opt.pts}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Q5 */}
        <div className="space-y-2 text-xs">
          <label className="font-semibold text-slate-800 block">
            5. Primary investment objective for this portfolio:
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {[
              { id: "capital_preservation", label: "Capital Preservation: Prevent any loss of initial investment", pts: "Debt" },
              { id: "stable_income", label: "Regular Income: Generate steady quarterly/monthly cashflows", pts: "Hybrid" },
              { id: "balanced_wealth_accumulation", label: "Balanced Growth: Outpace inflation with controlled volatility", pts: "Balanced" },
              { id: "aggressive_capital_growth", label: "Aggressive Wealth Creation: Maximize long-term equity compounding", pts: "Equity" },
            ].map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => handleSelect("primaryObjective", opt.id)}
                className={`p-3 rounded-lg border text-left transition cursor-pointer flex items-start justify-between ${
                  answers.primaryObjective === opt.id
                    ? "bg-teal-50/80 border-teal-500 ring-1 ring-teal-500 text-teal-950"
                    : "border-slate-200 hover:border-slate-300 text-slate-700"
                }`}
              >
                <span>{opt.label}</span>
                <span className="text-[10px] text-slate-400 font-medium shrink-0 ml-2">{opt.pts}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Regulatory Disclaimers Notice */}
      <div className="p-4 rounded-xl bg-slate-100 border border-slate-200 text-slate-500 text-[11px] leading-relaxed">
        <p className="font-semibold text-slate-700 mb-0.5">SEBI Safe Harbor Notice:</p>
        {liveAssessment.disclaimer}
      </div>
    </div>
  );
}
