"use client";

import React, { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Printer,
  Download,
  Copy,
  Check,
  ShieldCheck,
  AlertTriangle,
  User,
  Calendar,
  CheckCircle2,
  Trash2,
  AlertCircle,
  FileText,
  PieChart as PieChartIcon,
} from "lucide-react";
import { useStorageData } from "@/lib/storage/useStorage";
import { getReportById, deleteReport } from "@/lib/storage/localStorage";
import { formatINR } from "@/lib/utils";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
} from "recharts";

export default function ReportDetailPage() {
  const params = useParams();
  const router = useRouter();
  const reportId = params?.id as string;
  const { reports, refreshAll } = useStorageData();

  const [copied, setCopied] = useState(false);

  const report = reports.find((r) => r.id === reportId) || getReportById(reportId);

  if (!report) {
    return (
      <div className="py-20 text-center space-y-4 max-w-md mx-auto">
        <AlertCircle className="w-12 h-12 text-rose-500 mx-auto" />
        <h2 className="text-base font-bold text-slate-800">Report Not Found</h2>
        <p className="text-xs text-slate-500">
          The requested report may have been deleted or does not exist in local storage.
        </p>
        <Link
          href="/reports"
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-teal-600 text-white font-semibold text-xs hover:bg-teal-700 transition"
        >
          Return to Reports
        </Link>
      </div>
    );
  }

  const allocData = [
    { name: "Equity", value: report.recommendedAllocation.equityPercent, fill: "#0D9488" },
    { name: "Debt", value: report.recommendedAllocation.debtPercent, fill: "#0284C7" },
    { name: "Gold / Cash", value: report.recommendedAllocation.goldOrCashPercent, fill: "#F59E0B" },
  ];

  const handlePrint = () => {
    window.print();
  };

  const handleCopySummary = () => {
    const text = `ADVISORY REPORT: ${report.title}\nClient: ${report.clientName}\nAdviser: ${report.adviserName} (${report.adviserRiaNumber})\n\nSummary:\n${report.summary}\n\nKey Metrics:\n- Net Worth: ₹${report.keyMetrics.netWorth.toLocaleString("en-IN")}\n- Monthly Surplus: ₹${report.keyMetrics.monthlySurplus.toLocaleString("en-IN")}\n- Emergency Runway: ${report.keyMetrics.emergencyFundMonths} months\n- Recommended Allocation: ${report.recommendedAllocation.equityPercent}% Equity, ${report.recommendedAllocation.debtPercent}% Debt, ${report.recommendedAllocation.goldOrCashPercent}% Gold/Cash`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDelete = () => {
    if (confirm("Are you sure you want to delete this report?")) {
      deleteReport(report.id);
      refreshAll();
      router.push("/reports");
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12">
      {/* Top Navigation & Action Controls (Hidden when printing) */}
      <div className="flex items-center justify-between print:hidden">
        <Link
          href="/reports"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 transition"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to All Reports</span>
        </Link>

        <div className="flex items-center gap-2">
          <button
            onClick={handleCopySummary}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 font-semibold text-xs text-slate-700 transition"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? "Copied!" : "Copy Summary"}</span>
          </button>

          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs shadow-xs transition"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print / Save as PDF</span>
          </button>

          <button
            onClick={handleDelete}
            className="p-1.5 rounded-xl border border-slate-200 hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition"
            title="Delete Report"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* PRINTABLE REPORT CONTAINER */}
      <div className="bg-white rounded-2xl border border-slate-200 p-8 shadow-xs space-y-8 text-slate-800 print:border-none print:shadow-none print:p-0">
        {/* Formal Fiduciary Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b-2 border-slate-800 gap-4">
          <div className="space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-widest text-teal-700">
              SEBI Registered Investment Advisory Report
            </span>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">{report.title}</h1>
            <p className="text-xs text-slate-500">
              Prepared for: <strong className="text-slate-800">{report.clientName}</strong>
            </p>
          </div>

          <div className="text-left sm:text-right space-y-0.5 text-xs text-slate-600">
            <p className="font-bold text-slate-900 text-sm">{report.adviserName}</p>
            <p className="text-[11px] text-teal-700 font-semibold">SEBI Reg No: {report.adviserRiaNumber}</p>
            <p className="text-[10px] text-slate-400">
              Date: {new Date(report.createdAt).toLocaleDateString("en-IN", { month: "long", day: "numeric", year: "numeric" })}
            </p>
          </div>
        </div>

        {/* Executive Summary */}
        <div className="space-y-2">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">
            1. Executive Summary & Diagnostic Scope
          </h2>
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs leading-relaxed text-slate-700 whitespace-pre-line font-normal">
            {report.summary}
          </div>
        </div>

        {/* 2. Key Diagnostic Scorecard */}
        <div className="space-y-3">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">
            2. Core Financial Health Scorecard
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50">
              <span className="text-slate-400 text-[10px] uppercase font-semibold">Monthly Surplus</span>
              <p className="text-base font-bold text-emerald-600 mt-1">
                +{formatINR(report.keyMetrics.monthlySurplus)}
              </p>
              <p className="text-[10px] text-slate-500 mt-0.5">
                Savings rate: {report.keyMetrics.savingsRatePercent}%
              </p>
            </div>

            <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50">
              <span className="text-slate-400 text-[10px] uppercase font-semibold">Estimated Net Worth</span>
              <p className="text-base font-bold text-slate-900 mt-1">
                {formatINR(report.keyMetrics.netWorth)}
              </p>
              <p className="text-[10px] text-slate-500 mt-0.5">Assets minus liabilities</p>
            </div>

            <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50">
              <span className="text-slate-400 text-[10px] uppercase font-semibold">Emergency Fund</span>
              <p className="text-base font-bold text-slate-900 mt-1">
                {report.keyMetrics.emergencyFundMonths} Months
              </p>
              <p className="text-[10px] text-slate-500 mt-0.5">
                Benchmark: 6 months burn
              </p>
            </div>

            <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50">
              <span className="text-slate-400 text-[10px] uppercase font-semibold">Debt Service (DTI)</span>
              <p className="text-base font-bold text-slate-900 mt-1">
                {report.keyMetrics.debtToIncomePercent}%
              </p>
              <p className="text-[10px] text-slate-500 mt-0.5">Ceiling: 40% gross income</p>
            </div>
          </div>
        </div>

        {/* 3. Goal Funding Roadmap */}
        {report.goalRoadmap && report.goalRoadmap.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              3. Strategic Goal Compounding Roadmap
            </h2>
            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold text-[10px] uppercase">
                  <tr>
                    <th className="py-2.5 px-3">Goal Objective</th>
                    <th className="py-2.5 px-3">Horizon</th>
                    <th className="py-2.5 px-3">Target Corpus (FV)</th>
                    <th className="py-2.5 px-3">Existing Dedicated</th>
                    <th className="py-2.5 px-3">Required Monthly SIP</th>
                    <th className="py-2.5 px-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {report.goalRoadmap.map((g, idx) => (
                    <tr key={idx} className="hover:bg-slate-50">
                      <td className="py-2.5 px-3 font-semibold text-slate-900">{g.title}</td>
                      <td className="py-2.5 px-3 text-slate-600">{g.targetHorizonYears} Years</td>
                      <td className="py-2.5 px-3 font-bold text-teal-800">{formatINR(g.inflationAdjustedCost)}</td>
                      <td className="py-2.5 px-3 text-slate-600">{formatINR(g.existingSavings)}</td>
                      <td className="py-2.5 px-3 font-bold text-slate-900">{formatINR(g.requiredMonthlySIP)}/mo</td>
                      <td className="py-2.5 px-3">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700">
                          {g.status.replace(/_/g, " ")}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 4. Target Asset Allocation Breakdown */}
        <div className="space-y-3">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">
            4. Recommended Asset Allocation & Glide Path
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 p-5 rounded-xl border border-slate-200 bg-slate-50/40 items-center">
            <div className="h-40 flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={allocData}
                    cx="50%"
                    cy="50%"
                    innerRadius={35}
                    outerRadius={55}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {allocData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ fontSize: "11px", borderRadius: "8px" }} />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="md:col-span-2 space-y-3 text-xs">
              <div className="flex items-center gap-6">
                <div>
                  <span className="text-slate-400 text-[10px]">Equity Allocation</span>
                  <p className="text-lg font-bold text-teal-700">{report.recommendedAllocation.equityPercent}%</p>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px]">Debt Allocation</span>
                  <p className="text-lg font-bold text-sky-700">{report.recommendedAllocation.debtPercent}%</p>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px]">Gold / Cash</span>
                  <p className="text-lg font-bold text-amber-700">{report.recommendedAllocation.goldOrCashPercent}%</p>
                </div>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed italic">
                &ldquo;{report.recommendedAllocation.rationale}&rdquo;
              </p>
            </div>
          </div>
        </div>

        {/* 5. Statutory Suitability & Guardrail Audit */}
        <div className="space-y-3">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">
            5. SEBI Suitability Guardrails & Audit Findings
          </h2>
          <div className="space-y-2 text-xs">
            {report.suitabilityFindings.map((finding, idx) => (
              <div
                key={idx}
                className={`p-3.5 rounded-xl border flex items-start gap-3 ${
                  finding.severity === "CRITICAL"
                    ? "bg-rose-50 border-rose-200 text-rose-900"
                    : finding.severity === "WARNING"
                    ? "bg-amber-50 border-amber-200 text-amber-900"
                    : "bg-teal-50 border-teal-200 text-teal-900"
                }`}
              >
                {finding.severity === "CRITICAL" ? (
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                ) : finding.severity === "WARNING" ? (
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                ) : (
                  <CheckCircle2 className="w-4 h-4 text-teal-600 shrink-0 mt-0.5" />
                )}
                <div className="space-y-1">
                  <h4 className="font-bold">{finding.title}</h4>
                  <p className="leading-relaxed opacity-90">{finding.description}</p>
                  <p className="font-semibold text-[11px] pt-1">Action: {finding.action}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 6. Action Plan & Review Timeline */}
        <div className="space-y-3">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">
            6. Structured Execution Milestones
          </h2>
          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-2 text-xs">
            {report.actionPlan.map((step, idx) => (
              <div key={idx} className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-teal-600 text-white flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">
                  {idx + 1}
                </span>
                <p className="text-slate-700 leading-relaxed">{step}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Fiduciary Footnote */}
        <div className="pt-6 border-t border-slate-200 text-[11px] text-slate-500 space-y-1">
          <p className="font-semibold text-slate-800">Fiduciary Disclosure & Statutory Representation:</p>
          <p className="leading-relaxed text-slate-400">
            {report.fiduciaryNotes} Past performance of asset classes does not guarantee future returns. Investments in mutual funds and securities are subject to market risks.
          </p>
        </div>
      </div>
    </div>
  );
}

