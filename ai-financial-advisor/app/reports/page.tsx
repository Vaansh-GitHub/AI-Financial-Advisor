"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import {
  FileText,
  PlusCircle,
  Search,
  Filter,
  Download,
  Trash2,
  ArrowUpRight,
  ShieldCheck,
  Calendar,
  User,
  CheckCircle2,
  AlertTriangle,
  Printer,
  Sparkles,
} from "lucide-react";
import { useStorageData } from "@/lib/storage/useStorage";
import { deleteReport, getClientById, getGoals } from "@/lib/storage/localStorage";
import { generateStructuredReport } from "@/lib/services/reportGenerator";
import { ReportType, FinancialReport } from "@/lib/storage/types";
import { formatINR } from "@/lib/utils";

export default function ReportsPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { clients, reports, refreshAll } = useStorageData();

  const queryClientId = searchParams?.get("clientId") || "";
  const queryAutoGenerate = searchParams?.get("generate") === "true";

  const [search, setSearch] = useState("");
  const [selectedClientFilter, setSelectedClientFilter] = useState<string>(queryClientId || "ALL");
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<string>("ALL");

  // Generate Report Modal State
  const [showGenerateModal, setShowGenerateModal] = useState(queryAutoGenerate);
  const [modalClientId, setModalClientId] = useState<string>(queryClientId || (clients[0]?.id || ""));
  const [modalReportType, setModalReportType] = useState<ReportType>("COMPREHENSIVE_FINANCIAL_PLAN");
  const [modalCustomNotes, setModalCustomNotes] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    if (queryClientId) {
      setSelectedClientFilter(queryClientId);
      setModalClientId(queryClientId);
    }
    if (queryAutoGenerate) {
      setShowGenerateModal(true);
    }
  }, [queryClientId, queryAutoGenerate]);

  // Filter reports
  const filteredReports = reports.filter((r) => {
    const matchesSearch =
      r.title.toLowerCase().includes(search.toLowerCase()) ||
      r.clientName.toLowerCase().includes(search.toLowerCase()) ||
      r.summary.toLowerCase().includes(search.toLowerCase());
    if (!matchesSearch) return false;

    if (selectedClientFilter !== "ALL" && r.clientId !== selectedClientFilter) {
      return false;
    }

    if (selectedTypeFilter !== "ALL" && r.reportType !== selectedTypeFilter) {
      return false;
    }

    return true;
  });

  const handleGenerateReport = (e: React.FormEvent) => {
    e.preventDefault();
    if (!modalClientId) return;

    setIsGenerating(true);
    const targetClient = clients.find((c) => c.id === modalClientId) || getClientById(modalClientId);
    if (!targetClient) return;

    const targetGoals = getGoals(modalClientId);

    const generated = generateStructuredReport({
      client: targetClient,
      goals: targetGoals,
      reportType: modalReportType,
      customNotes: modalCustomNotes.trim() || undefined,
    });

    refreshAll();
    setIsGenerating(false);
    setShowGenerateModal(false);
    router.push(`/reports/${generated.id}`);
  };

  const handleDeleteReport = (id: string) => {
    if (confirm("Are you sure you want to delete this generated report?")) {
      deleteReport(id);
      refreshAll();
    }
  };

  return (
    <div className="space-y-6">
      {/* HEADER & QUICK ACTIONS */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-teal-50 text-teal-800 text-[11px] font-bold border border-teal-200 mb-1">
            <ShieldCheck className="w-3.5 h-3.5 text-teal-600" />
            <span>SEBI RIA Fiduciary Documentation</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Financial Reports & Plans</h1>
          <p className="text-xs text-slate-500">
            Structured client advisory plans, net worth diagnostics, and compliance audit summaries.
          </p>
        </div>

        <button
          onClick={() => setShowGenerateModal(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs shadow-xs transition"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Generate New Report</span>
        </button>
      </div>

      {/* SEARCH & FILTERS BAR */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs flex flex-col md:flex-row items-center gap-3 text-xs">
        {/* Search */}
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search reports by title, client name, summary..."
            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-2 text-xs focus:ring-2 focus:ring-teal-500"
          />
        </div>

        {/* Client Filter */}
        <select
          value={selectedClientFilter}
          onChange={(e) => setSelectedClientFilter(e.target.value)}
          className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-700 w-full md:w-auto"
        >
          <option value="ALL">All Clients</option>
          {clients.map((c) => (
            <option key={c.id} value={c.id}>
              {c.fullName}
            </option>
          ))}
        </select>

        {/* Report Type Filter */}
        <select
          value={selectedTypeFilter}
          onChange={(e) => setSelectedTypeFilter(e.target.value)}
          className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-700 w-full md:w-auto"
        >
          <option value="ALL">All Report Types</option>
          <option value="COMPREHENSIVE_FINANCIAL_PLAN">Comprehensive Financial Plan</option>
          <option value="NET_WORTH_AND_CASHFLOW_AUDIT">Net Worth & Cashflow Audit</option>
          <option value="RETIREMENT_READINESS">Retirement Readiness</option>
          <option value="RISK_AND_SUITABILITY_REVIEW">Risk & Suitability Review</option>
          <option value="GOAL_FUNDING_STRATEGY">Goal Funding Strategy</option>
        </select>
      </div>

      {/* REPORTS GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredReports.map((report) => (
          <div
            key={report.id}
            className="bg-white rounded-2xl p-5 border border-slate-200/80 hover:border-teal-500/50 hover:shadow-md transition flex flex-col justify-between space-y-4"
          >
            <div>
              <div className="flex items-center justify-between text-[10px] text-slate-400 mb-1.5">
                <span className="font-bold px-2.5 py-0.5 rounded-full bg-teal-100 text-teal-800">
                  {report.reportType.replace(/_/g, " ")}
                </span>
                <span>{new Date(report.createdAt).toLocaleDateString("en-IN", { month: "short", day: "numeric", year: "numeric" })}</span>
              </div>

              <h3 className="font-bold text-slate-900 text-sm leading-snug mt-1">
                {report.title}
              </h3>

              <div className="flex items-center gap-2 text-xs text-slate-500 mt-2">
                <User className="w-3.5 h-3.5 text-slate-400" />
                <span className="font-semibold text-slate-800">{report.clientName}</span>
                <span>•</span>
                <span className="text-[11px]">Adviser: {report.adviserName}</span>
              </div>

              <p className="text-xs text-slate-600 mt-3 line-clamp-3 leading-relaxed">
                {report.summary}
              </p>

              {/* Metrics Highlights Snippet */}
              <div className="grid grid-cols-3 gap-2 mt-4 pt-3 border-t border-slate-100 text-[11px]">
                <div>
                  <p className="text-slate-400 text-[10px]">Surplus</p>
                  <p className="font-bold text-emerald-600">+{formatINR(report.keyMetrics.monthlySurplus)}</p>
                </div>
                <div>
                  <p className="text-slate-400 text-[10px]">Runway</p>
                  <p className="font-bold text-slate-800">{report.keyMetrics.emergencyFundMonths} Mo</p>
                </div>
                <div>
                  <p className="text-slate-400 text-[10px]">Equity Target</p>
                  <p className="font-bold text-teal-700">{report.recommendedAllocation.equityPercent}%</p>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
              <button
                onClick={() => handleDeleteReport(report.id)}
                className="text-slate-400 hover:text-rose-600 p-1 transition"
                title="Delete Report"
              >
                <Trash2 className="w-4 h-4" />
              </button>

              <Link
                href={`/reports/${report.id}`}
                className="px-3 py-1.5 rounded-xl bg-teal-50 hover:bg-teal-100 text-teal-800 font-bold text-xs transition flex items-center gap-1"
              >
                <span>Open Full Plan</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        ))}
      </div>

      {filteredReports.length === 0 && (
        <div className="bg-white rounded-2xl p-16 text-center border border-slate-200/80 space-y-3">
          <FileText className="w-12 h-12 text-slate-300 mx-auto" />
          <h3 className="font-bold text-slate-800 text-base">No Financial Reports Found</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Generate your first formal financial advisory plan for a client with calculated net worth and asset allocations.
          </p>
          <button
            onClick={() => setShowGenerateModal(true)}
            className="px-4 py-2 rounded-xl bg-teal-600 text-white font-semibold text-xs hover:bg-teal-700 transition"
          >
            + Generate Report
          </button>
        </div>
      )}

      {/* GENERATE REPORT MODAL */}
      {showGenerateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden text-xs">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/60">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-teal-600" />
                <h3 className="font-bold text-slate-900 text-sm">Generate Structured Client Report</h3>
              </div>
              <button
                onClick={() => setShowGenerateModal(false)}
                className="p-1 rounded-md text-slate-400 hover:text-slate-700"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleGenerateReport} className="p-6 space-y-4">
              {/* Select Client */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Select Target Client</label>
                <select
                  value={modalClientId}
                  onChange={(e) => setModalClientId(e.target.value)}
                  required
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-teal-500 font-semibold"
                >
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.fullName} ({c.city} • ₹{(c.monthlyIncome / 1000).toFixed(0)}k/mo • {c.riskProfile?.combinedCategory || "BALANCED"})
                    </option>
                  ))}
                </select>
              </div>

              {/* Select Report Template */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Report Template</label>
                <select
                  value={modalReportType}
                  onChange={(e) => setModalReportType(e.target.value as ReportType)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-teal-500"
                >
                  <option value="COMPREHENSIVE_FINANCIAL_PLAN">
                    Comprehensive Financial Plan (Holistic Cashflow, Goals & Allocation)
                  </option>
                  <option value="NET_WORTH_AND_CASHFLOW_AUDIT">
                    Net Worth & Cash Flow Audit (Balance Sheet & Liquidity Buffer)
                  </option>
                  <option value="RETIREMENT_READINESS">
                    Retirement Readiness & Longevity Plan (SWP & Capital Preservation)
                  </option>
                  <option value="RISK_AND_SUITABILITY_REVIEW">
                    Risk Profile & Suitability Review (SEBI Suitability Guardrails)
                  </option>
                  <option value="GOAL_FUNDING_STRATEGY">
                    Goal Funding Strategy (Required Monthly SIPs & Glide Path)
                  </option>
                </select>
              </div>

              {/* Custom Notes */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Adviser Customized Notes & Strategy Remarks (Optional)
                </label>
                <textarea
                  value={modalCustomNotes}
                  onChange={(e) => setModalCustomNotes(e.target.value)}
                  rows={3}
                  placeholder="e.g. Recommended debt rebalancing in Q4, priority on building 6-month liquid buffer..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div className="p-3 bg-teal-50/60 rounded-xl border border-teal-200/60 text-[11px] text-teal-900 space-y-1">
                <p className="font-semibold">Deterministic Math Engine Execution:</p>
                <p className="text-teal-700">
                  Calculates exact future value of goals, required SIP annuities, emergency fund runways, and generates fiduciary suitability disclosures.
                </p>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowGenerateModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isGenerating || !modalClientId}
                  className="px-5 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold transition disabled:opacity-50"
                >
                  {isGenerating ? "Generating Plan..." : "Generate & View Report"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

