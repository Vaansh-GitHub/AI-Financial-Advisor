"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  ShieldCheck,
  AlertTriangle,
  Clock,
  CheckCircle2,
  PieChart,
  Target,
  FileText,
  History,
  AlertCircle,
  ExternalLink,
} from "lucide-react";
import { formatINR } from "@/lib/utils";
import { StatusBadge, Badge } from "@/components/ui/Badge";
import {
  ResponsiveContainer,
  PieChart as RechartsPie,
  Pie,
  Cell,
  Tooltip,
} from "recharts";

export default function PlanResultsPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  const [plan, setPlan] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [actionNotes, setActionNotes] = useState("");
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    async function loadPlan() {
      if (!id) return;
      try {
        const res = await fetch(`/api/plans/${id}`);
        const json = await res.json();
        if (json.success && json.data) {
          setPlan(json.data);
        }
      } catch (err) {
        console.error("Failed to load plan:", err);
      } finally {
        setLoading(false);
      }
    }
    loadPlan();
  }, [id]);

  if (loading) {
    return <div className="py-20 text-center text-xs text-slate-500">Loading plan results...</div>;
  }

  if (!plan) {
    return (
      <div className="py-16 text-center space-y-3">
        <AlertCircle className="w-8 h-8 text-rose-500 mx-auto" />
        <h2 className="text-base font-bold text-slate-800">Plan Not Found</h2>
        <Link href="/approvals" className="text-xs text-teal-600 font-semibold hover:underline">
          Return to Approval Queue
        </Link>
      </div>
    );
  }

  const allocationData = [
    { name: "Equity", value: plan.recommendedAllocation?.equityPercent || 60, color: "#0d9488" },
    { name: "Debt / Fixed Income", value: plan.recommendedAllocation?.debtPercent || 35, color: "#0284c7" },
    { name: "Gold / Cash Buffer", value: plan.recommendedAllocation?.goldOrCashPercent || 5, color: "#94a3b8" },
  ];

  const handleAction = async (action: "SUBMIT_FOR_REVIEW" | "APPROVE" | "REJECT" | "REQUEST_CHANGES") => {
    setSubmitting(true);
    setActionError(null);
    try {
      const res = await fetch(`/api/plans/${id}/action`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          reasonNotes: actionNotes.trim() || `Adviser sign-off transition to ${action}.`,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "Action failed.");
      }
      setPlan(json.data);
      setActionNotes("");
    } catch (err: any) {
      setActionError(err.message || "Failed to process transition.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Link
          href={`/clients/${plan.clientId}`}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 transition mb-2"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to {plan.clientName}&apos;s Profile</span>
        </Link>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">{plan.planTitle}</h1>
              <Badge variant="navy">Version {plan.version}</Badge>
              <StatusBadge status={plan.status} />
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Client: <strong>{plan.clientName}</strong> • Target Corpus:{" "}
              <strong>{formatINR(plan.calculatedMetrics?.totalTargetCorpus || 0)}</strong> • Monthly SIP:{" "}
              <strong>{formatINR(plan.calculatedMetrics?.totalMonthlySIP || 0)}/mo</strong>
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href={`/approvals/${id}`}
              className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-lg transition shadow-xs flex items-center gap-1.5"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>Open Approval Review Console</span>
            </Link>
          </div>
        </div>
      </div>

      {actionError && (
        <div className="p-3.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{actionError}</span>
        </div>
      )}

      {/* Plan Summary Highlights */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
            Target Future Corpus
          </span>
          <div className="text-2xl font-extrabold text-slate-900 mt-1">
            {formatINR(plan.calculatedMetrics?.totalTargetCorpus || 0)}
          </div>
          <span className="text-[10px] text-slate-400">Inflation-adjusted target</span>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
            Recommended Monthly SIP
          </span>
          <div className="text-2xl font-extrabold text-teal-700 mt-1">
            {formatINR(plan.calculatedMetrics?.totalMonthlySIP || 0)}/mo
          </div>
          <span className="text-[10px] text-slate-400">Advance Annuity (Due)</span>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
            Projected Wealth Gain
          </span>
          <div className="text-2xl font-extrabold text-emerald-700 mt-1">
            {formatINR(plan.calculatedMetrics?.estimatedWealthGain || 0)}
          </div>
          <span className="text-[10px] text-slate-400">Net compounding multiple</span>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
            Governance & Sign-Off
          </span>
          <div className="mt-1">
            <StatusBadge status={plan.status} />
          </div>
          <span className="text-[10px] text-slate-400 mt-1 block">
            {plan.approvedBy ? `Approved by ${plan.approvedBy}` : "Pending Adviser Review"}
          </span>
        </div>
      </div>

      {/* Recommended Funds Breakdown & Asset Allocation */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Recommended Funds Table (8 Cols) */}
        <div className="lg:col-span-8 bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4">
          <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900">
              Recommended Mutual Fund Scheme Construction
            </h3>
            <span className="text-xs text-slate-400">Direct Plans • Growth Option</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-100">
                <tr>
                  <th className="py-2.5 px-3">Scheme Name</th>
                  <th className="py-2.5 px-3">Category</th>
                  <th className="py-2.5 px-3">Weight %</th>
                  <th className="py-2.5 px-3 font-bold text-teal-800">Recommended SIP</th>
                  <th className="py-2.5 px-3">Adviser Rationale</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(plan.fundSelections || []).map((f: any, i: number) => (
                  <tr key={i} className="hover:bg-slate-50/60">
                    <td className="py-3 px-3 font-semibold text-slate-900">
                      <div>{f.schemeName}</div>
                      <span className="text-[10px] text-slate-400 font-mono">Code: {f.schemeCode}</span>
                    </td>
                    <td className="py-3 px-3 text-slate-600">{f.category}</td>
                    <td className="py-3 px-3 font-semibold text-slate-800">{f.weightPercent}%</td>
                    <td className="py-3 px-3 font-extrabold text-teal-700">
                      {formatINR(f.recommendedMonthlySIP)}/mo
                    </td>
                    <td className="py-3 px-3 text-slate-600 max-w-xs text-[11px] leading-relaxed">
                      {f.rationale}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Asset Allocation Chart (4 Cols) */}
        <div className="lg:col-span-4 bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4">
          <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2">
            Asset Class Exposure
          </h3>

          <div className="h-44 w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <RechartsPie>
                <Pie
                  data={allocationData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={42}
                  outerRadius={65}
                  paddingAngle={4}
                >
                  {allocationData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(val: any) => [`${val}%`, "Weight"]} />
              </RechartsPie>
            </ResponsiveContainer>
          </div>

          <div className="space-y-2 text-xs border-t border-slate-100 pt-3">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 font-medium text-slate-700">
                <span className="w-2.5 h-2.5 rounded-full bg-teal-600" /> Equity
              </span>
              <span className="font-bold text-slate-900">{plan.recommendedAllocation?.equityPercent}%</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 font-medium text-slate-700">
                <span className="w-2.5 h-2.5 rounded-full bg-sky-600" /> Debt / Fixed Income
              </span>
              <span className="font-bold text-slate-900">{plan.recommendedAllocation?.debtPercent}%</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 font-medium text-slate-700">
                <span className="w-2.5 h-2.5 rounded-full bg-slate-400" /> Cash / Gold
              </span>
              <span className="font-bold text-slate-900">{plan.recommendedAllocation?.goldOrCashPercent}%</span>
            </div>
          </div>

          <p className="text-[11px] text-slate-500 bg-slate-50 p-2.5 rounded border border-slate-100">
            {plan.recommendedAllocation?.rationale}
          </p>
        </div>
      </div>

      {/* Suitability Findings & Guardrails Checklist */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-3">
        <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2 flex items-center justify-between">
          <span>Automated Suitability Findings Checklist</span>
          {plan.isBlockedBySuitability ? (
            <Badge variant="danger">Blocked Findings Active</Badge>
          ) : (
            <Badge variant="success">All Critical Guardrails Passed</Badge>
          )}
        </h3>

        {(plan.suitabilityFindings || []).length === 0 ? (
          <p className="text-xs text-emerald-700 bg-emerald-50 p-3 rounded-lg border border-emerald-200 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" />
            <span>Plan passes all 9 deterministic suitability guardrails with zero compliance findings.</span>
          </p>
        ) : (
          <div className="space-y-2.5 text-xs">
            {plan.suitabilityFindings.map((f: any, i: number) => (
              <div
                key={i}
                className={`p-3 rounded-lg border flex items-start gap-3 ${
                  f.severity === "BLOCKED"
                    ? "bg-rose-50 border-rose-200"
                    : f.severity === "HIGH_RISK"
                    ? "bg-amber-50 border-amber-200"
                    : "bg-slate-50 border-slate-200"
                }`}
              >
                {f.severity === "BLOCKED" ? (
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                )}
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900">{f.title}</span>
                    <Badge variant={f.severity === "BLOCKED" ? "danger" : "warning"}>{f.severity}</Badge>
                  </div>
                  <p className="text-slate-600 text-[11px] mt-1">{f.explanation}</p>
                  <p className="text-slate-800 text-[11px] font-semibold mt-1">
                    Recommended Action: {f.recommendedAction}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Immutable Approval History Timeline */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-3">
        <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2 flex items-center gap-2">
          <History className="w-4 h-4 text-teal-600" />
          <span>Governance & Approval Decision History</span>
        </h3>

        <div className="space-y-3 text-xs">
          {(plan.approvalHistory || []).map((h: any, i: number) => (
            <div key={i} className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg border border-slate-100">
              <div className="w-6 h-6 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center font-bold text-[10px] shrink-0">
                {i + 1}
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900">{h.decision}</span>
                    <Badge variant="navy">v{h.planVersion}</Badge>
                  </div>
                  <span className="text-[11px] text-slate-400">{h.timestamp ? new Date(h.timestamp).toLocaleString("en-IN") : "—"}</span>
                </div>
                <p className="text-slate-600 text-[11px] mt-1">
                  Actor: <strong>{h.actorName}</strong> ({h.actorRole})
                </p>
                {h.reasonNotes && (
                  <p className="text-slate-700 font-medium text-[11px] mt-1 italic">
                    &ldquo;{h.reasonNotes}&rdquo;
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
