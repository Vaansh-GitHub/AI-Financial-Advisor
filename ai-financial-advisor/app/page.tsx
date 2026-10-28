"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Users,
  FileText,
  Bot,
  AlertTriangle,
  PlusCircle,
  Upload,
  MessageSquare,
  FileCheck2,
  TrendingUp,
  ArrowUpRight,
  ShieldAlert,
  ShieldCheck,
  CheckCircle2,
  Clock,
  ChevronRight,
  Sparkles,
  PieChart as PieChartIcon,
} from "lucide-react";
import { useStorageData } from "@/lib/storage/useStorage";
import { StatCard } from "@/components/ui/StatCard";
import { StatusBadge, Badge } from "@/components/ui/Badge";
import { formatINR } from "@/lib/utils";
import { DataUploadModal } from "@/components/clients/DataUploadModal";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
} from "recharts";

export default function OverviewDashboardPage() {
  const router = useRouter();
  const { clients, goals, chats, reports, activity, isLoaded, refreshAll } = useStorageData();
  const [showUploadModal, setShowUploadModal] = useState(false);

  // 1. Metric Calculations directly from stored LocalStorage records
  const totalClients = clients.length;
  const totalReports = reports.length;
  const totalChats = chats.length;

  // Pending reviews: Clients with risk conflicts OR emergency reserves < 3 months
  const pendingReviewsCount = clients.filter(
    (c) =>
      c.riskProfile?.hasConflict ||
      c.emergencyFundAmount < (c.monthlyExpenses + c.monthlyEMI) * 3
  ).length;

  // 2. Client Goal Distribution Data for Recharts
  const goalCategoryCounts: Record<string, number> = {};
  goals.forEach((g) => {
    const cat = g.category ? g.category.replace(/_/g, " ") : "OTHER";
    goalCategoryCounts[cat] = (goalCategoryCounts[cat] || 0) + 1;
  });

  const goalChartData = Object.entries(goalCategoryCounts).map(([name, count]) => ({
    name,
    count,
  }));

  // 3. Risk-Profile Distribution Data for Recharts
  const riskCategoryCounts: Record<string, number> = {
    CONSERVATIVE: 0,
    MODERATELY_CONSERVATIVE: 0,
    BALANCED: 0,
    GROWTH: 0,
    AGGRESSIVE: 0,
  };

  clients.forEach((c) => {
    const cat = c.riskProfile?.combinedCategory || "BALANCED";
    if (riskCategoryCounts[cat] !== undefined) {
      riskCategoryCounts[cat]++;
    } else {
      riskCategoryCounts[cat] = 1;
    }
  });

  const RISK_COLORS: Record<string, string> = {
    CONSERVATIVE: "#0284C7", // Sky blue
    MODERATELY_CONSERVATIVE: "#0D9488", // Teal
    BALANCED: "#10B981", // Emerald
    GROWTH: "#F59E0B", // Amber
    AGGRESSIVE: "#F43F5E", // Rose
  };

  const riskChartData = Object.entries(riskCategoryCounts)
    .filter(([_, count]) => count > 0)
    .map(([category, count]) => ({
      name: category.replace(/_/g, " "),
      value: count,
      rawCat: category,
    }));

  // 4. Recently Added Clients & Recently Updated Profiles
  const recentlyAddedClients = [...clients]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5);

  const recentlyUpdatedClients = [...clients]
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, 5);

  const recentReports = [...reports]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 4);

  return (
    <div className="space-y-6">
      {/* EXECUTIVE WELCOME & QUICK ACTIONS BANNER */}
      <div className="bg-gradient-to-r from-[#0B192C] to-[#1E3E62] text-white rounded-2xl p-6 shadow-md border border-slate-800">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-1.5 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-teal-500/20 text-teal-300 text-xs font-semibold border border-teal-500/30">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Local-First AI Investment Adviser Co-Pilot</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-white">
              Adviser Cockpit & Executive Overview
            </h1>
            <p className="text-xs text-slate-300 leading-relaxed">
              Real-time portfolio analytics, suitability guardrails, and deterministic financial calculations for your client practice. All data is persisted privately in local browser storage.
            </p>
          </div>

          {/* Quick Actions Bar */}
          <div className="flex flex-wrap items-center gap-2.5">
            <Link
              href="/clients/new"
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-teal-500 hover:bg-teal-400 text-white font-semibold text-xs shadow-sm transition"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Add Client</span>
            </Link>
            <button
              onClick={() => setShowUploadModal(true)}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white font-semibold text-xs transition border border-white/10"
            >
              <Upload className="w-4 h-4 text-teal-400" />
              <span>Upload Client Data</span>
            </button>
            <Link
              href="/assistant"
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white font-semibold text-xs transition border border-white/10"
            >
              <Bot className="w-4 h-4 text-teal-400" />
              <span>AI Conversation</span>
            </Link>
            <Link
              href="/reports"
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white font-semibold text-xs transition border border-white/10"
            >
              <FileText className="w-4 h-4 text-teal-400" />
              <span>Generate Report</span>
            </Link>
          </div>
        </div>
      </div>

      {/* 4 CORE KPI METRIC CARDS (Calculated Live from LocalStorage) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Active Clients"
          value={totalClients}
          trend={{ value: `${clients.length} in LocalStorage`, isPositive: true }}
          icon={Users}
          accentColor="teal"
          subtitle="Client-side managed"
        />
        <StatCard
          title="Financial Plans & Reports"
          value={totalReports}
          trend={{ value: `${reports.length} generated`, isPositive: true }}
          icon={FileText}
          accentColor="navy"
          subtitle="Structured advisory plans"
        />
        <StatCard
          title="Saved AI Conversations"
          value={totalChats}
          trend={{ value: `${chats.length} active threads`, isPositive: true }}
          icon={Bot}
          accentColor="teal"
          subtitle="Saved locally per client"
        />
        <StatCard
          title="Pending Reviews & Flags"
          value={pendingReviewsCount}
          trend={{
            value: pendingReviewsCount > 0 ? "Action Required" : "All Clear",
            isPositive: pendingReviewsCount === 0,
          }}
          icon={ShieldAlert}
          accentColor={pendingReviewsCount > 0 ? "amber" : "teal"}
          subtitle="Suitability & reserve checks"
        />
      </div>

      {/* TWO CHARTS ROW: GOAL DISTRIBUTION & RISK PROFILE BREAKDOWN */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart 1: Client Goal Distribution */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-bold text-sm text-slate-900">Client Goal Distribution</h3>
                <p className="text-xs text-slate-500">Distribution of client financial planning objectives</p>
              </div>
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-100 text-slate-700">
                {goals.length} Goals Tracked
              </span>
            </div>
            <div className="h-64 w-full flex items-center justify-center">
              {goalChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={goalChartData} margin={{ top: 10, right: 10, left: -10, bottom: 25 }}>
                    <XAxis
                      dataKey="name"
                      tick={{ fontSize: 10, fill: "#64748B" }}
                      angle={-15}
                      textAnchor="end"
                      interval={0}
                    />
                    <YAxis tick={{ fontSize: 11, fill: "#64748B" }} allowDecimals={false} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#0B192C",
                        color: "#fff",
                        borderRadius: "12px",
                        border: "none",
                        fontSize: "12px",
                      }}
                    />
                    <Bar dataKey="count" fill="#0D9488" radius={[6, 6, 0, 0]} name="Goals" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="text-center text-slate-400 text-xs">No client financial goals recorded yet.</div>
              )}
            </div>
          </div>
          <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>Deterministic annuity-due SIP calculation</span>
            <Link href="/clients" className="text-teal-600 font-semibold hover:underline">
              View all goals →
            </Link>
          </div>
        </div>

        {/* Chart 2: Risk-Profile Distribution */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-bold text-sm text-slate-900">Risk Profile Distribution</h3>
                <p className="text-xs text-slate-500">Harmonized risk capacity vs tolerance tiers</p>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-teal-600 font-semibold">
                <ShieldCheck className="w-4 h-4" />
                <span>SEBI Fiduciary Guardrails</span>
              </div>
            </div>
            <div className="h-64 w-full flex items-center justify-center">
              {riskChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={riskChartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={85}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {riskChartData.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={RISK_COLORS[entry.rawCat] || "#10B981"}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#0B192C",
                        color: "#fff",
                        borderRadius: "12px",
                        border: "none",
                        fontSize: "12px",
                      }}
                    />
                    <Legend verticalAlign="bottom" height={36} wrapperStyle={{ fontSize: "11px" }} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="text-center text-slate-400 text-xs">No client risk profiles calculated yet.</div>
              )}
            </div>
          </div>
          <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>Capacity strictly constrains subjective tolerance</span>
            <span className="font-semibold text-slate-700">{clients.length} Clients Assessed</span>
          </div>
        </div>
      </div>

      {/* TWO COLUMN ROW: CLIENT DIRECTORY SNIPPET & ACTIVITY TIMELINE */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Recently Added / Updated Clients */}
        <div className="lg:col-span-2 bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-sm text-slate-900">Recently Updated Client Profiles</h3>
              <p className="text-xs text-slate-500">Latest profile updates, cashflows, and risk assessments</p>
            </div>
            <Link
              href="/clients"
              className="text-xs font-semibold text-teal-600 hover:text-teal-700 flex items-center gap-1"
            >
              <span>View all clients ({clients.length})</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-slate-400 font-semibold uppercase tracking-wider text-[10px]">
                  <th className="pb-3 pl-2">Client Name</th>
                  <th className="pb-3">Location / Age</th>
                  <th className="pb-3">Monthly Income</th>
                  <th className="pb-3">Emergency Buffer</th>
                  <th className="pb-3">Risk Tier</th>
                  <th className="pb-3 text-right pr-2">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recentlyUpdatedClients.length > 0 ? (
                  recentlyUpdatedClients.map((client) => {
                    const monthlyBurn = client.monthlyExpenses + client.monthlyEMI;
                    const runway = monthlyBurn > 0 ? (client.emergencyFundAmount / monthlyBurn).toFixed(1) : "0.0";
                    const hasConflict = client.riskProfile?.hasConflict;

                    return (
                      <tr key={client.id} className="hover:bg-slate-50/80 transition group">
                        <td className="py-3 pl-2">
                          <Link href={`/clients/${client.id}`} className="font-semibold text-slate-900 hover:text-teal-600 flex items-center gap-1.5">
                            <span>{client.fullName}</span>
                            {hasConflict && (
                              <span title="Suitability conflict detected">
                                <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                              </span>
                            )}
                          </Link>
                          <p className="text-[11px] text-slate-400">{client.email}</p>
                        </td>
                        <td className="py-3 text-slate-600">
                          {client.city} • {client.age}y
                        </td>
                        <td className="py-3 font-semibold text-slate-800">
                          {formatINR(client.monthlyIncome)}
                        </td>
                        <td className="py-3">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              Number(runway) >= 6
                                ? "bg-emerald-50 text-emerald-700"
                                : Number(runway) >= 3
                                ? "bg-amber-50 text-amber-700"
                                : "bg-rose-50 text-rose-700"
                            }`}
                          >
                            {runway} mo
                          </span>
                        </td>
                        <td className="py-3">
                          <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-medium text-[10px]">
                            {client.riskProfile?.combinedCategory || "BALANCED"}
                          </span>
                        </td>
                        <td className="py-3 text-right pr-2">
                          <div className="flex items-center justify-end gap-1.5 opacity-90 group-hover:opacity-100">
                            <Link
                              href={`/assistant?clientId=${client.id}`}
                              className="p-1 rounded-md text-slate-400 hover:text-teal-600 hover:bg-slate-100"
                              title="Chat with AI about this client"
                            >
                              <Bot className="w-3.5 h-3.5" />
                            </Link>
                            <Link
                              href={`/clients/${client.id}`}
                              className="px-2 py-1 rounded-md bg-slate-100 hover:bg-teal-50 hover:text-teal-700 text-slate-700 font-medium text-[11px] transition"
                            >
                              Profile
                            </Link>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={6} className="py-10 text-center text-slate-400">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <Users className="w-8 h-8 text-slate-300 stroke-[1.5]" />
                        <p className="font-semibold text-slate-700 text-xs">No client profiles created yet</p>
                        <p className="text-[11px] text-slate-400 max-w-xs">
                          Add a client manually or upload CSV, JSON, or PDF financial data.
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <Link
                            href="/clients/new"
                            className="px-3 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-500 text-white font-semibold text-xs transition"
                          >
                            + Add Client
                          </Link>
                          <button
                            type="button"
                            onClick={() => setShowUploadModal(true)}
                            className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs transition"
                          >
                            Upload Data
                          </button>
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right 1 Col: Recent Activity Timeline */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-bold text-sm text-slate-900">Recent Activity Timeline</h3>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">
                Audit Trail
              </span>
            </div>
            <p className="text-xs text-slate-500 mb-4">Immutable local audit log of all adviser actions</p>

            <div className="space-y-4">
              {activity.length > 0 ? (
                activity.slice(0, 5).map((act) => (
                  <div key={act.id} className="flex items-start gap-3 text-xs">
                    <div className="w-7 h-7 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center shrink-0 mt-0.5 font-bold">
                      {act.entityType === "CLIENT" ? (
                        <Users className="w-3.5 h-3.5 text-teal-600" />
                      ) : act.entityType === "REPORT" ? (
                        <FileText className="w-3.5 h-3.5 text-emerald-600" />
                      ) : act.entityType === "CHAT" ? (
                        <Bot className="w-3.5 h-3.5 text-sky-600" />
                      ) : (
                        <Clock className="w-3.5 h-3.5 text-slate-500" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <p className="font-semibold text-slate-800 truncate">{act.action}</p>
                        <span className="text-[10px] text-slate-400 shrink-0">
                          {new Date(act.timestamp).toLocaleDateString("en-IN", { month: "short", day: "numeric" })}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 line-clamp-2 mt-0.5 leading-relaxed">
                        {act.details || act.entityName}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-8 text-center text-slate-400">
                  <Clock className="w-6 h-6 text-slate-300 stroke-[1.5] mx-auto mb-1.5" />
                  <p className="font-medium text-slate-500 text-xs">No activity logged yet</p>
                  <p className="text-[11px] text-slate-400">Actions will appear here as you manage clients.</p>
                </div>
              )}
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100">
            <Link
              href="/reports"
              className="text-xs font-semibold text-teal-600 hover:text-teal-700 flex items-center justify-between"
            >
              <span>Explore saved reports & audits</span>
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>

      {/* RECENTLY GENERATED REPORTS ROW */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-bold text-sm text-slate-900">Recently Generated Client Reports</h3>
            <p className="text-xs text-slate-500">Structured financial plans and compliance summaries ready for export</p>
          </div>
          <Link
            href="/reports"
            className="text-xs font-semibold text-teal-600 hover:text-teal-700 flex items-center gap-1"
          >
            <span>Manage all reports ({reports.length})</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {recentReports.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {recentReports.map((report) => (
              <div
                key={report.id}
                className="p-4 rounded-xl border border-slate-200/80 hover:border-teal-500/50 hover:shadow-md transition bg-slate-50/50 flex flex-col justify-between"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-teal-100 text-teal-800">
                      {report.reportType.replace(/_/g, " ")}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      {new Date(report.createdAt).toLocaleDateString("en-IN", { month: "short", day: "numeric" })}
                    </span>
                  </div>
                  <h4 className="font-bold text-slate-900 text-xs line-clamp-1">{report.title}</h4>
                  <p className="text-[11px] text-slate-500 line-clamp-2 leading-relaxed">
                    {report.summary}
                  </p>
                </div>

                <div className="pt-3 border-t border-slate-200/60 mt-3 flex items-center justify-between">
                  <span className="text-[10px] text-slate-400 font-medium">{report.clientName}</span>
                  <Link
                    href={`/reports/${report.id}`}
                    className="text-xs font-semibold text-teal-600 hover:text-teal-700 flex items-center gap-1"
                  >
                    <span>View Plan</span>
                    <ArrowUpRight className="w-3 h-3" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-8 text-center text-slate-400 border border-dashed border-slate-200 rounded-xl">
            <FileText className="w-7 h-7 text-slate-300 stroke-[1.5] mx-auto mb-1.5" />
            <p className="font-semibold text-slate-600 text-xs">No financial reports generated yet</p>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Generate investment policy statements or comprehensive plans from client profiles or the AI Assistant.
            </p>
          </div>
        )}
      </div>

      {/* UPLOAD MODAL */}
      <DataUploadModal
        isOpen={showUploadModal}
        onClose={() => setShowUploadModal(false)}
        onSuccess={() => {
          refreshAll();
          setShowUploadModal(false);
        }}
      />
    </div>
  );
}
