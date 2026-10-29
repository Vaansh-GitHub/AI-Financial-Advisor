"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  User,
  Target,
  ShieldCheck,
  AlertTriangle,
  FileText,
  Clock,
  ArrowLeft,
  Edit,
  PlusCircle,
  TrendingUp,
  DollarSign,
  PieChart as PieChartIcon,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Upload,
  Bot,
  Trash2,
  FileSpreadsheet,
  FileCode,
  Download,
  Calendar,
  Layers,
  ArrowUpRight,
  ShieldAlert,
} from "lucide-react";
import { useStorageData } from "@/lib/storage/useStorage";
import {
  getClientById,
  getGoals,
  getConversations,
  getReports,
  getUploadedFiles,
  deleteGoal,
  deleteClient,
  saveGoal,
} from "@/lib/storage/localStorage";
import { calculateGoalPlan } from "@/lib/finance/calculations";
import { formatINR } from "@/lib/utils";
import { StatusBadge, Badge } from "@/components/ui/Badge";
import { StatCard } from "@/components/ui/StatCard";
import { DataUploadModal } from "@/components/clients/DataUploadModal";
import { Goal, GoalCategory, GoalPriority } from "@/lib/storage/types";
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
} from "recharts";

export default function ClientProfilePage() {
  const params = useParams();
  const router = useRouter();
  const clientId = params?.id as string;

  const { clients, goals, chats, reports, files, refreshAll } = useStorageData();

  const [activeTab, setActiveTab] = useState<
    "overview" | "goals" | "risk" | "files" | "chats" | "reports"
  >("overview");

  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showAddGoalModal, setShowAddGoalModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // New Goal Form State
  const [newGoalTitle, setNewGoalTitle] = useState("");
  const [newGoalCategory, setNewGoalCategory] = useState<GoalCategory>("WEALTH_CREATION");
  const [newGoalCurrentCost, setNewGoalCurrentCost] = useState(0);
  const [newGoalHorizon, setNewGoalHorizon] = useState(5);
  const [newGoalInflation, setNewGoalInflation] = useState(6);
  const [newGoalExistingSavings, setNewGoalExistingSavings] = useState(0);
  const [newGoalMonthlyContrib, setNewGoalMonthlyContrib] = useState(0);
  const [newGoalPriority, setNewGoalPriority] = useState<GoalPriority>("HIGH");

  const client = clients.find((c) => c.id === clientId) || getClientById(clientId);
  const clientGoals = goals.filter((g) => g.clientId === clientId);
  const clientChats = chats.filter((c) => c.clientId === clientId);
  const clientReports = reports.filter((r) => r.clientId === clientId);
  const clientFiles = files.filter((f) => f.clientId === clientId);

  if (!client) {
    return (
      <div className="py-20 text-center space-y-4 max-w-md mx-auto">
        <AlertCircle className="w-12 h-12 text-rose-500 mx-auto" />
        <h2 className="text-lg font-bold text-slate-800">Client Profile Not Found</h2>
        <p className="text-xs text-slate-500">
          The requested client record may have been deleted or does not exist in local storage.
        </p>
        <Link
          href="/clients"
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-teal-600 text-white font-semibold text-xs hover:bg-teal-700 transition"
        >
          Return to Client Directory
        </Link>
      </div>
    );
  }

  // Financial Metrics
  const monthlyBurn = client.monthlyExpenses + client.monthlyEMI;
  const netSurplus = client.monthlyIncome - monthlyBurn;
  const savingsRate = client.monthlyIncome > 0 ? Math.round((netSurplus / client.monthlyIncome) * 100) : 0;
  const emergencyCoverageMonths = monthlyBurn > 0 ? (client.emergencyFundAmount / monthlyBurn).toFixed(1) : "0.0";
  const emiRatio = client.monthlyIncome > 0 ? Math.round((client.monthlyEMI / client.monthlyIncome) * 100) : 0;
  const totalAssets = client.existingSavings + client.existingInvestments;
  const netWorth = totalAssets - client.outstandingLiabilities;
  const hasConflict = client.riskProfile?.hasConflict;

  // Dynamic Asset Allocation calculation from actual client assets:
  // Equity: existingInvestments, Debt / Fixed Income: existingSavings, Cash: emergencyFundAmount
  const equityAsset = client.existingInvestments || 0;
  const debtAsset = client.existingSavings || 0;
  const cashAsset = client.emergencyFundAmount || 0;
  const totalRecordedAssets = equityAsset + debtAsset + cashAsset;

  const hasRecordedAssets = totalRecordedAssets > 0 || (
    client.existingPortfolioAllocation &&
    ((client.existingPortfolioAllocation.equityPercent || 0) > 0 ||
     (client.existingPortfolioAllocation.debtPercent || 0) > 0 ||
     (client.existingPortfolioAllocation.goldOrCashPercent || 0) > 0)
  );

  const equityPercent = totalRecordedAssets > 0
    ? Math.round((equityAsset / totalRecordedAssets) * 100)
    : (client.existingPortfolioAllocation?.equityPercent ?? 0);

  const debtPercent = totalRecordedAssets > 0
    ? Math.round((debtAsset / totalRecordedAssets) * 100)
    : (client.existingPortfolioAllocation?.debtPercent ?? 0);

  const cashPercent = totalRecordedAssets > 0
    ? Math.max(0, 100 - equityPercent - debtPercent)
    : (client.existingPortfolioAllocation?.goldOrCashPercent ?? 0);

  const allocData = hasRecordedAssets ? [
    { name: "Equity", value: equityPercent, fill: "#0D9488" },
    { name: "Debt / Fixed Income", value: debtPercent, fill: "#0284C7" },
    { name: "Gold / Cash", value: cashPercent, fill: "#F59E0B" },
  ] : [
    { name: "Unallocated", value: 100, fill: "#64748B" }
  ];

  const handleCreateGoal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGoalTitle.trim()) return;

    const inflationRate = newGoalInflation / 100;
    
    // Deterministic ordinary annuity calculation: SIP = FV * [r / ((1+r)^N - 1)]
    const plan = calculateGoalPlan({
      currentCost: newGoalCurrentCost,
      targetHorizonYears: newGoalHorizon,
      expectedInflationRate: inflationRate,
      expectedAnnualReturn: 0.12,
      existingSavings: newGoalExistingSavings,
      currentMonthlyContribution: newGoalMonthlyContrib,
      sipTiming: "end_of_period",
    });

    saveGoal({
      clientId: client.id,
      title: newGoalTitle,
      category: newGoalCategory,
      currentCost: newGoalCurrentCost,
      targetAmount: plan.inflationAdjustedCost,
      targetHorizonYears: newGoalHorizon,
      expectedInflationRate: inflationRate,
      expectedAnnualReturn: 0.12,
      existingSavings: newGoalExistingSavings,
      currentMonthlyContribution: newGoalMonthlyContrib,
      priority: newGoalPriority,
      calculationResults: {
        ...plan,
        calculatedAt: new Date().toISOString(),
      },
    });

    refreshAll();
    setShowAddGoalModal(false);
    setNewGoalTitle("");
  };

  const handleDeleteClient = () => {
    deleteClient(client.id);
    refreshAll();
    router.push("/clients");
  };

  return (
    <div className="space-y-6">
      {/* Top Back Navigation */}
      <div className="flex items-center justify-between">
        <Link
          href="/clients"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 transition"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Clients</span>
        </Link>
        <span className="text-[10px] text-slate-400 font-medium">
          Profile ID: <code className="font-mono">{client.id}</code>
        </span>
      </div>

      {/* CLIENT HEADER CARD */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 rounded-2xl bg-[#0B192C] text-white flex items-center justify-center font-bold text-xl shrink-0 shadow-sm">
            {client.fullName.substring(0, 2).toUpperCase()}
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-xl font-bold tracking-tight text-slate-900">{client.fullName}</h1>
              {client.isDemoPersona && (
                <span className="text-[10px] bg-slate-100 text-slate-700 font-semibold px-2 py-0.5 rounded-full border border-slate-200">
                  {client.demoPersonaTag || "Demo Persona"}
                </span>
              )}
              <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-teal-100 text-teal-800">
                {client.riskProfile?.combinedCategory || "BALANCED"}
              </span>
            </div>

            <p className="text-xs text-slate-500">
              Age {client.age} • {client.city} • {client.employmentType.replace(/_/g, " ")} • {client.email} {client.phone && `• ${client.phone}`}
            </p>

            <div className="flex items-center gap-4 text-xs text-slate-500 pt-0.5">
              <span>
                Horizon: <strong>{client.investmentHorizonYears} Years</strong>
              </span>
              <span>•</span>
              <span>
                Experience: <strong className="capitalize">{client.investmentExperience.replace(/_/g, " ")}</strong>
              </span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <Link
            href={`/assistant?clientId=${client.id}`}
            className="px-3.5 py-2 bg-teal-600 hover:bg-teal-700 text-white font-semibold text-xs rounded-xl transition flex items-center gap-1.5 shadow-xs"
          >
            <Bot className="w-4 h-4" />
            <span>Chat AI</span>
          </Link>

          <Link
            href={`/reports?clientId=${client.id}&generate=true`}
            className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold text-xs rounded-xl transition flex items-center gap-1.5"
          >
            <FileText className="w-4 h-4 text-slate-600" />
            <span>Generate Report</span>
          </Link>

          <button
            onClick={() => setShowUploadModal(true)}
            className="px-3 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold text-xs rounded-xl transition flex items-center gap-1.5"
          >
            <Upload className="w-3.5 h-3.5 text-slate-500" />
            <span>Upload Data</span>
          </button>

          <Link
            href={`/clients/${client.id}/edit`}
            className="px-3 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold text-xs rounded-xl transition flex items-center gap-1.5"
          >
            <Edit className="w-3.5 h-3.5 text-slate-500" />
            <span>Edit</span>
          </Link>

          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="p-2 border border-slate-200 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-xl transition"
            title="Delete Client"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* RISK CONFLICT ALERT BANNER */}
      {hasConflict && (
        <div className="p-4 rounded-2xl bg-amber-50/80 border border-amber-200/80 flex items-start gap-3 text-xs text-amber-900">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-bold">Fiduciary Risk Conflict Flagged (SEBI RIA Suitability Rule)</p>
            <p className="text-amber-800 leading-relaxed">
              {client.riskProfile?.conflictRationale ||
                "Client subjective risk tolerance diverges from objective financial loss capacity. Advisory recommendations must strictly observe capacity boundaries."}
            </p>
          </div>
        </div>
      )}

      {/* TAB NAVIGATION */}
      <div className="border-b border-slate-200 flex items-center gap-6 text-xs font-semibold text-slate-500 overflow-x-auto">
        <button
          onClick={() => setActiveTab("overview")}
          className={`pb-3 transition relative cursor-pointer whitespace-nowrap ${
            activeTab === "overview" ? "text-teal-600 border-b-2 border-teal-500 font-bold" : "hover:text-slate-800"
          }`}
        >
          Financial Overview
        </button>
        <button
          onClick={() => setActiveTab("goals")}
          className={`pb-3 transition relative cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
            activeTab === "goals" ? "text-teal-600 border-b-2 border-teal-500 font-bold" : "hover:text-slate-800"
          }`}
        >
          <span>Financial Goals</span>
          <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-100 text-slate-600 font-bold">
            {clientGoals.length}
          </span>
        </button>
        <button
          onClick={() => setActiveTab("risk")}
          className={`pb-3 transition relative cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
            activeTab === "risk" ? "text-teal-600 border-b-2 border-teal-500 font-bold" : "hover:text-slate-800"
          }`}
        >
          <span>Risk & Suitability</span>
          {hasConflict && <span className="w-2 h-2 rounded-full bg-amber-500" />}
        </button>
        <button
          onClick={() => setActiveTab("files")}
          className={`pb-3 transition relative cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
            activeTab === "files" ? "text-teal-600 border-b-2 border-teal-500 font-bold" : "hover:text-slate-800"
          }`}
        >
          <span>Uploaded Files</span>
          <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-100 text-slate-600 font-bold">
            {clientFiles.length}
          </span>
        </button>
        <button
          onClick={() => setActiveTab("chats")}
          className={`pb-3 transition relative cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
            activeTab === "chats" ? "text-teal-600 border-b-2 border-teal-500 font-bold" : "hover:text-slate-800"
          }`}
        >
          <span>AI Conversations</span>
          <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-100 text-slate-600 font-bold">
            {clientChats.length}
          </span>
        </button>
        <button
          onClick={() => setActiveTab("reports")}
          className={`pb-3 transition relative cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
            activeTab === "reports" ? "text-teal-600 border-b-2 border-teal-500 font-bold" : "hover:text-slate-800"
          }`}
        >
          <span>Generated Reports</span>
          <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-100 text-slate-600 font-bold">
            {clientReports.length}
          </span>
        </button>
      </div>

      {/* TAB 1: FINANCIAL OVERVIEW */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          {/* Key Metric StatCards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              title="Monthly Disposable Surplus"
              value={formatINR(netSurplus)}
              subtitle={`Income ${formatINR(client.monthlyIncome)} · Burn ${formatINR(monthlyBurn)}`}
              accentColor="teal"
            />
            <StatCard
              title="Estimated Net Worth"
              value={formatINR(netWorth)}
              subtitle={`Assets ${formatINR(totalAssets)} · Debt ${formatINR(client.outstandingLiabilities)}`}
              accentColor="navy"
            />
            <StatCard
              title="Emergency Fund Runway"
              value={`${emergencyCoverageMonths} Mo`}
              subtitle={`${formatINR(client.emergencyFundAmount)} liquid reserve`}
              accentColor="teal"
            />
            <StatCard
              title="Debt-to-Income (DTI)"
              value={`${emiRatio}%`}
              subtitle={`EMI ${formatINR(client.monthlyEMI)}/mo (Max 40%)`}
              accentColor="amber"
            />
          </div>

          {/* Balance Sheet & Asset Allocation Row */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left 2 Cols: Comprehensive Balance Sheet */}
            <div className="lg:col-span-2 bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs space-y-4">
              <h3 className="font-bold text-sm text-slate-900">Financial Balance Sheet & Cashflow Breakdown</h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                {/* Assets Column */}
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/60 space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-200 text-teal-800 font-bold">
                    <span>ASSETS & SAVINGS</span>
                    <span>{formatINR(totalAssets)}</span>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-slate-600">
                      <span>Emergency Liquid Fund</span>
                      <strong className="text-slate-900">{formatINR(client.emergencyFundAmount)}</strong>
                    </div>
                    <div className="flex items-center justify-between text-slate-600">
                      <span>Bank Savings & FDs</span>
                      <strong className="text-slate-900">{formatINR(client.existingSavings)}</strong>
                    </div>
                    <div className="flex items-center justify-between text-slate-600">
                      <span>Market Investments</span>
                      <strong className="text-slate-900">{formatINR(client.existingInvestments)}</strong>
                    </div>
                  </div>
                </div>

                {/* Liabilities Column */}
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/60 space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-200 text-rose-800 font-bold">
                    <span>LIABILITIES & DEBT</span>
                    <span>{formatINR(client.outstandingLiabilities)}</span>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-slate-600">
                      <span>Outstanding Principal</span>
                      <strong className="text-slate-900">{formatINR(client.outstandingLiabilities)}</strong>
                    </div>
                    <div className="flex items-center justify-between text-slate-600">
                      <span>Monthly EMI Outflow</span>
                      <strong className="text-slate-900">{formatINR(client.monthlyEMI)}/mo</strong>
                    </div>
                    <div className="flex items-center justify-between text-slate-600">
                      <span>Monthly Living Expenses</span>
                      <strong className="text-slate-900">{formatINR(client.monthlyExpenses)}/mo</strong>
                    </div>
                  </div>
                </div>
              </div>

              {/* Notes */}
              {client.financialNotes && (
                <div className="p-3.5 rounded-xl bg-slate-50 text-xs text-slate-600 border border-slate-200/60">
                  <span className="font-bold text-slate-800">Adviser Notes: </span>
                  {client.financialNotes}
                </div>
              )}
            </div>

            {/* Right 1 Col: Asset Allocation Donut */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col justify-between">
              <div>
                <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100 mb-1">Portfolio Allocation</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
                  {hasRecordedAssets ? "Current asset class exposure" : "Awaiting balance sheet data"}
                </p>

                {hasRecordedAssets ? (
                  <>
                    <div className="h-48 w-full flex items-center justify-center">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={allocData}
                            cx="50%"
                            cy="50%"
                            innerRadius={45}
                            outerRadius={70}
                            paddingAngle={4}
                            dataKey="value"
                          >
                            {allocData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.fill} />
                            ))}
                          </Pie>
                          <Tooltip contentStyle={{ borderRadius: "10px", fontSize: "11px" }} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>

                    <div className="space-y-1.5 pt-2 text-xs">
                      {allocData.map((a) => (
                        <div key={a.name} className="flex items-center justify-between text-slate-600 dark:text-slate-300">
                          <span className="flex items-center gap-1.5">
                            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: a.fill }} />
                            {a.name}
                          </span>
                          <strong className="text-slate-900 dark:text-slate-100">{a.value}%</strong>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <div className="py-8 text-center space-y-2 bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4 border border-dashed border-slate-200 dark:border-slate-700">
                    <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">0% Allocated</p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                      No recorded portfolio holdings. Add savings/investments or upload a statement to calculate current allocation.
                    </p>
                    <div className="grid grid-cols-3 gap-1 pt-2 text-[10px] text-slate-400">
                      <div>Equity: <strong>0%</strong></div>
                      <div>Debt: <strong>0%</strong></div>
                      <div>Cash: <strong>0%</strong></div>
                    </div>
                  </div>
                )}
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-400 dark:text-slate-500">
                Recommended target: {client.riskProfile?.recommendedEquityPercent ?? 50}% Equity
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: FINANCIAL GOALS */}
      {activeTab === "goals" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-sm text-slate-900">Financial Goals & SIP Roadmap</h3>
              <p className="text-xs text-slate-500">Compounding projections calculated with annuity-due mathematical models</p>
            </div>
            <button
              onClick={() => setShowAddGoalModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-semibold text-xs transition"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>Add Goal</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {clientGoals.map((goal) => {
              const calc = goal.calculationResults || calculateGoalPlan({
                currentCost: goal.currentCost,
                targetHorizonYears: goal.targetHorizonYears,
                expectedInflationRate: goal.expectedInflationRate || 0.06,
                expectedAnnualReturn: goal.expectedAnnualReturn || 0.12,
                existingSavings: goal.existingSavings || 0,
                currentMonthlyContribution: goal.currentMonthlyContribution || 0,
              });
              const fv = calc.inflationAdjustedCost;
              const reqSIP = calc.requiredMonthlySIP;
              const currSIP = goal.currentMonthlyContribution;

              return (
                <div
                  key={goal.id}
                  className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs flex flex-col justify-between space-y-4"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-teal-50 text-teal-800">
                          {goal.category.replace(/_/g, " ")}
                        </span>
                        <h4 className="font-bold text-slate-900 text-sm mt-1">{goal.title}</h4>
                      </div>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          goal.priority === "HIGH"
                            ? "bg-rose-50 text-rose-700"
                            : "bg-slate-100 text-slate-700"
                        }`}
                      >
                        {goal.priority} Priority
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 mt-4 pt-3 border-t border-slate-100 text-xs">
                      <div>
                        <p className="text-slate-400 text-[10px]">Current Cost (PV)</p>
                        <p className="font-bold text-slate-800">{formatINR(goal.currentCost)}</p>
                      </div>
                      <div>
                        <p className="text-slate-400 text-[10px]">Target Corpus ({goal.targetHorizonYears}y FV)</p>
                        <p className="font-bold text-teal-700">{formatINR(fv)}</p>
                      </div>
                      <div>
                        <p className="text-slate-400 text-[10px]">Required Monthly SIP</p>
                        <p className="font-bold text-slate-800">{formatINR(reqSIP)}/mo</p>
                      </div>
                      <div>
                        <p className="text-slate-400 text-[10px]">Current Monthly SIP</p>
                        <p className="font-bold text-emerald-600">{formatINR(currSIP)}/mo</p>
                      </div>
                    </div>

                    {goal.notes && (
                      <p className="text-[11px] text-slate-500 mt-3 bg-slate-50 p-2 rounded-lg leading-relaxed">
                        {goal.notes}
                      </p>
                    )}
                  </div>

                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                    <span className="text-[10px] text-slate-400">
                      Assumed Inflation: {(goal.expectedInflationRate * 100).toFixed(0)}%
                    </span>
                    <button
                      onClick={() => {
                        deleteGoal(goal.id);
                        refreshAll();
                      }}
                      className="text-slate-400 hover:text-rose-600 transition p-1"
                      title="Delete Goal"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {clientGoals.length === 0 && (
            <div className="bg-white rounded-2xl p-12 text-center border border-slate-200/80 space-y-3">
              <Target className="w-10 h-10 text-slate-300 mx-auto" />
              <h4 className="font-bold text-slate-800 text-sm">No Goals Created Yet</h4>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Define the client&apos;s financial goals to calculate required inflation-adjusted SIPs and funding roadmaps.
              </p>
              <button
                onClick={() => setShowAddGoalModal(true)}
                className="px-4 py-2 rounded-xl bg-teal-600 text-white font-semibold text-xs hover:bg-teal-700 transition"
              >
                + Add First Goal
              </button>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: RISK & SUITABILITY */}
      {activeTab === "risk" && (
        <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs space-y-6">
          <div>
            <h3 className="font-bold text-sm text-slate-900">SEBI Suitability & Risk Profile</h3>
            <p className="text-xs text-slate-500">
              Separates objective loss-absorption capacity from behavioral risk tolerance
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            {/* Capacity Card */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/60 space-y-2">
              <span className="text-[10px] uppercase font-bold text-teal-800">
                Objective Risk Capacity
              </span>
              <p className="text-lg font-bold text-slate-900">
                {client.riskProfile?.capacityLevel || "MODERATE"}
              </p>
              <p className="text-slate-500 text-[11px] leading-relaxed">
                Score: <strong>{client.riskProfile?.capacityScore ?? 65}/100</strong>. Driven by age ({client.age}y), emergency buffer ({emergencyCoverageMonths} mo), and DTI ratio ({emiRatio}%).
              </p>
            </div>

            {/* Tolerance Card */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/60 space-y-2">
              <span className="text-[10px] uppercase font-bold text-sky-800">
                Behavioral Risk Tolerance
              </span>
              <p className="text-lg font-bold text-slate-900">
                {client.riskProfile?.toleranceLevel || "MODERATE"}
              </p>
              <p className="text-slate-500 text-[11px] leading-relaxed">
                Score: <strong>{client.riskProfile?.toleranceScore ?? 60}/100</strong>. Psychological reaction to market drawdown and investment experience.
              </p>
            </div>

            {/* Combined Category */}
            <div className="p-4 rounded-xl bg-teal-50/60 border border-teal-200/60 space-y-2">
              <span className="text-[10px] uppercase font-bold text-teal-800">
                Combined Fiduciary Tier
              </span>
              <p className="text-lg font-bold text-teal-900">
                {client.riskProfile?.combinedCategory || "BALANCED"}
              </p>
              <p className="text-teal-900/70 text-[11px] leading-relaxed">
                Recommended asset allocation ceiling: {client.riskProfile?.recommendedEquityPercent ?? 60}% Equity.
              </p>
            </div>
          </div>

          {/* Conflict Rationale */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1.5">
            <h4 className="font-bold text-slate-800">Conflict Resolution & Fiduciary Rationale</h4>
            <p className="text-slate-600 leading-relaxed">
              {client.riskProfile?.conflictRationale ||
                "Client capacity and psychological tolerance are aligned for the investment horizon."}
            </p>
          </div>
        </div>
      )}

      {/* TAB 4: UPLOADED FILES */}
      {activeTab === "files" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-sm text-slate-900">Uploaded Financial Data & Files</h3>
              <p className="text-xs text-slate-500">JSON profiles, CSV bank statements, and PDF documents stored locally</p>
            </div>
            <button
              onClick={() => setShowUploadModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-semibold text-xs transition"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Upload New File</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {clientFiles.map((f) => (
              <div
                key={f.id}
                className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs flex items-start gap-3"
              >
                <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center shrink-0">
                  {f.fileType === "PDF" ? (
                    <FileText className="w-5 h-5" />
                  ) : f.fileType === "CSV" ? (
                    <FileSpreadsheet className="w-5 h-5" />
                  ) : (
                    <FileCode className="w-5 h-5" />
                  )}
                </div>
                <div className="flex-1 min-w-0 text-xs">
                  <p className="font-bold text-slate-900 truncate">{f.fileName}</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    {f.fileType} • {Math.round(f.fileSizeBytes / 1024)} KB •{" "}
                    {new Date(f.uploadedAt).toLocaleDateString("en-IN")}
                  </p>
                  {f.summary && (
                    <p className="text-[11px] text-slate-600 mt-2 bg-slate-50 p-2 rounded-lg line-clamp-2">
                      {f.summary}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>

          {clientFiles.length === 0 && (
            <div className="bg-white rounded-2xl p-12 text-center border border-slate-200/80 space-y-3">
              <Upload className="w-10 h-10 text-slate-300 mx-auto" />
              <h4 className="font-bold text-slate-800 text-sm">No Files Uploaded Yet</h4>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Upload bank statements (CSV), client profile JSON exports, or PDF factsheets to link them with this client.
              </p>
              <button
                onClick={() => setShowUploadModal(true)}
                className="px-4 py-2 rounded-xl bg-teal-600 text-white font-semibold text-xs hover:bg-teal-700 transition"
              >
                Upload File Now
              </button>
            </div>
          )}
        </div>
      )}

      {/* TAB 5: AI CONVERSATIONS */}
      {activeTab === "chats" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-sm text-slate-900">Saved AI Conversations</h3>
              <p className="text-xs text-slate-500">Adviser AI co-pilot consultations saved locally for this client</p>
            </div>
            <Link
              href={`/assistant?clientId=${client.id}`}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-semibold text-xs transition"
            >
              <Bot className="w-3.5 h-3.5" />
              <span>Start New Consultation</span>
            </Link>
          </div>

          <div className="space-y-3">
            {clientChats.map((chat) => (
              <div
                key={chat.id}
                className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs flex items-center justify-between gap-4"
              >
                <div className="space-y-1">
                  <h4 className="font-bold text-slate-900 text-sm">{chat.title}</h4>
                  <p className="text-xs text-slate-500">
                    {chat.messages.length} messages • Last updated:{" "}
                    {new Date(chat.updatedAt).toLocaleDateString("en-IN", {
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                  {chat.messages[chat.messages.length - 1] && (
                    <p className="text-[11px] text-slate-600 line-clamp-1 italic mt-1">
                      &ldquo;{chat.messages[chat.messages.length - 1].text.substring(0, 120)}...&rdquo;
                    </p>
                  )}
                </div>

                <Link
                  href={`/assistant?clientId=${client.id}&chatId=${chat.id}`}
                  className="px-3 py-1.5 rounded-xl bg-teal-50 hover:bg-teal-100 text-teal-800 font-bold text-xs transition shrink-0"
                >
                  Continue Chat →
                </Link>
              </div>
            ))}
          </div>

          {clientChats.length === 0 && (
            <div className="bg-white rounded-2xl p-12 text-center border border-slate-200/80 space-y-3">
              <Bot className="w-10 h-10 text-slate-300 mx-auto" />
              <h4 className="font-bold text-slate-800 text-sm">No Saved Conversations</h4>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Consult with the AI co-pilot regarding asset allocation, emergency fund adequacy, or retirement feasibility for this client.
              </p>
              <Link
                href={`/assistant?clientId=${client.id}`}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-teal-600 text-white font-semibold text-xs hover:bg-teal-700 transition"
              >
                Open AI Assistant
              </Link>
            </div>
          )}
        </div>
      )}

      {/* TAB 6: GENERATED REPORTS */}
      {activeTab === "reports" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-sm text-slate-900">Generated Financial Reports</h3>
              <p className="text-xs text-slate-500">Formal advisory plans, audits, and compliance records</p>
            </div>
            <Link
              href={`/reports?clientId=${client.id}&generate=true`}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-semibold text-xs transition"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Generate New Report</span>
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {clientReports.map((report) => (
              <div
                key={report.id}
                className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs flex flex-col justify-between space-y-4"
              >
                <div>
                  <div className="flex items-center justify-between text-[10px] text-slate-400 mb-1">
                    <span className="font-bold px-2 py-0.5 rounded-full bg-teal-100 text-teal-800">
                      {report.reportType.replace(/_/g, " ")}
                    </span>
                    <span>{new Date(report.createdAt).toLocaleDateString("en-IN")}</span>
                  </div>
                  <h4 className="font-bold text-slate-900 text-sm mt-1">{report.title}</h4>
                  <p className="text-xs text-slate-500 mt-2 line-clamp-2 leading-relaxed">
                    {report.summary}
                  </p>
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                  <span className="text-[10px] text-slate-400">Adviser: {report.adviserName}</span>
                  <Link
                    href={`/reports/${report.id}`}
                    className="font-bold text-teal-600 hover:text-teal-700 flex items-center gap-1"
                  >
                    <span>View Full Plan</span>
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            ))}
          </div>

          {clientReports.length === 0 && (
            <div className="bg-white rounded-2xl p-12 text-center border border-slate-200/80 space-y-3">
              <FileText className="w-10 h-10 text-slate-300 mx-auto" />
              <h4 className="font-bold text-slate-800 text-sm">No Reports Generated Yet</h4>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Generate a formal Comprehensive Financial Plan or Net Worth Audit for {client.fullName}.
              </p>
              <Link
                href={`/reports?clientId=${client.id}&generate=true`}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-teal-600 text-white font-semibold text-xs hover:bg-teal-700 transition"
              >
                Generate First Report
              </Link>
            </div>
          )}
        </div>
      )}

      {/* ADD GOAL MODAL */}
      {showAddGoalModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden text-xs">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/60">
              <h3 className="font-bold text-slate-900 text-sm">Plan Financial Goal for {client.fullName}</h3>
              <button
                onClick={() => setShowAddGoalModal(false)}
                className="p-1 rounded-md text-slate-400 hover:text-slate-700"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateGoal} className="p-6 space-y-4">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Goal Title</label>
                <input
                  type="text"
                  value={newGoalTitle}
                  onChange={(e) => setNewGoalTitle(e.target.value)}
                  placeholder="e.g. Daughter Overseas Master's Degree"
                  required
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Goal Category</label>
                  <select
                    value={newGoalCategory}
                    onChange={(e) => setNewGoalCategory(e.target.value as GoalCategory)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs"
                  >
                    <option value="WEALTH_CREATION">Wealth Creation</option>
                    <option value="RETIREMENT">Retirement</option>
                    <option value="CHILD_EDUCATION">Child Education</option>
                    <option value="EMERGENCY_FUND">Emergency Buffer</option>
                    <option value="HOME_PURCHASE">Real Estate / Home</option>
                    <option value="VACATION_OR_LUXURY">Vacation / Luxury</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Priority</label>
                  <select
                    value={newGoalPriority}
                    onChange={(e) => setNewGoalPriority(e.target.value as GoalPriority)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs"
                  >
                    <option value="HIGH">High Priority</option>
                    <option value="MEDIUM">Medium Priority</option>
                    <option value="LOW">Low Priority</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Present Cost (₹)</label>
                  <input
                    type="number"
                    step={50000}
                    value={newGoalCurrentCost}
                    onChange={(e) => setNewGoalCurrentCost(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Horizon (Years)</label>
                  <input
                    type="number"
                    min={1}
                    max={40}
                    value={newGoalHorizon}
                    onChange={(e) => setNewGoalHorizon(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Expected Inflation (% p.a.)</label>
                  <input
                    type="number"
                    step={0.5}
                    value={newGoalInflation}
                    onChange={(e) => setNewGoalInflation(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Monthly Contribution (₹)</label>
                  <input
                    type="number"
                    step={1000}
                    value={newGoalMonthlyContrib}
                    onChange={(e) => setNewGoalMonthlyContrib(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs"
                  />
                </div>
              </div>

              {/* Dynamic Projection Preview */}
              <div className="p-3 bg-teal-50/60 rounded-xl border border-teal-200/60 text-[11px] space-y-1 text-teal-900">
                <p>
                  Inflation-Adjusted Target Cost ({newGoalHorizon}y):{" "}
                  <strong>
                    {formatINR(Math.round(newGoalCurrentCost * Math.pow(1 + newGoalInflation / 100, newGoalHorizon)))}
                  </strong>
                </p>
                <p className="text-teal-700">
                  Compounding with beginning-of-period SIP formula at 12% expected annual equity return.
                </p>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddGoalModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold transition"
                >
                  Save Goal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE CLIENT CONFIRMATION MODAL */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-sm w-full p-6 text-center space-y-4 text-xs">
            <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Delete {client.fullName}?</h3>
              <p className="text-slate-500 mt-1">
                This will permanently delete this client record along with all their saved goals, reports, and AI chat sessions from browser storage.
              </p>
            </div>
            <div className="flex items-center gap-2 pt-2">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 py-2 rounded-xl border border-slate-200 text-slate-700 font-semibold hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteClient}
                className="flex-1 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-semibold transition"
              >
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DATA UPLOAD MODAL */}
      <DataUploadModal
        isOpen={showUploadModal}
        defaultClientId={client.id}
        onClose={() => setShowUploadModal(false)}
        onSuccess={() => {
          refreshAll();
          setShowUploadModal(false);
        }}
      />
    </div>
  );
}
