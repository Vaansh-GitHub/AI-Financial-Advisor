"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  AlertCircle,
  Clock,
  History,
  FileCheck,
  XCircle,
  HelpCircle,
} from "lucide-react";
import { formatINR } from "@/lib/utils";
import { StatusBadge, Badge } from "@/components/ui/Badge";

export default function PlanReviewPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  const [plan, setPlan] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [decisionNotes, setDecisionNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    async function loadPlanData() {
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
    loadPlanData();
  }, [id]);

  const handleDecision = async (action: "APPROVE" | "REJECT" | "REQUEST_CHANGES") => {
    if (!decisionNotes.trim()) {
      setErrorMsg("Mandatory compliance audit note is required for all review decisions.");
      return;
    }

    setSubmitting(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const res = await fetch(`/api/plans/${id}/action`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          reasonNotes: decisionNotes.trim(),
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "Action rejected by governance engine.");
      }

      setPlan(json.data);
      setSuccessMsg(`Plan status transitioned to ${json.data.status} with timestamped audit signature.`);
      setDecisionNotes("");
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to submit decision.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="py-20 text-center text-xs text-slate-500">Loading plan review console...</div>;
  }

  if (!plan) {
    return (
      <div className="py-16 text-center space-y-3">
        <AlertCircle className="w-8 h-8 text-rose-500 mx-auto" />
        <h2 className="text-base font-bold text-slate-800">Plan Record Not Found</h2>
        <Link href="/approvals" className="text-xs text-teal-600 font-semibold hover:underline">
          Return to Queue
        </Link>
      </div>
    );
  }

  const isBlocked = plan.isBlockedBySuitability || plan.status === "BLOCKED";
  const blockedFindings = (plan.suitabilityFindings || []).filter((f: any) => f.severity === "BLOCKED");

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <Link
          href="/approvals"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 transition mb-2"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Approval Queue</span>
        </Link>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
                Plan Review & Adviser Sign-Off Console
              </h1>
              <Badge variant="navy">Version {plan.version}</Badge>
              <StatusBadge status={plan.status} />
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Client: <strong>{plan.clientName}</strong> • Target:{" "}
              <strong>{formatINR(plan.calculatedMetrics?.totalTargetCorpus || 0)}</strong> • Monthly SIP:{" "}
              <strong>{formatINR(plan.calculatedMetrics?.totalMonthlySIP || 0)}/mo</strong>
            </p>
          </div>
        </div>
      </div>

      {errorMsg && (
        <div className="p-3.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {successMsg && (
        <div className="p-3.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* BLOCKED WARNING BANNER */}
      {isBlocked && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-900 space-y-2">
          <div className="flex items-center gap-2 font-bold text-rose-900">
            <AlertCircle className="w-4 h-4 text-rose-600" />
            <span>Fiduciary Safety Lockout: Approval is Strictly Blocked</span>
          </div>
          <p className="text-[11px] leading-relaxed">
            One or more deterministic suitability rules are violated. Under regulatory governance, no adviser can approve or deliver this plan until critical blockers are rectified:
          </p>
          <ul className="list-disc list-inside space-y-1 text-[11px] text-rose-800 font-semibold pl-1">
            {blockedFindings.map((b: any, idx: number) => (
              <li key={idx}>
                {b.title}: {b.explanation}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Plan Details Card */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-5">
        <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2">
          Proposed Recommendation Structure
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
            <span className="text-slate-400 block text-[10px] font-semibold">ASSET ALLOCATION</span>
            <div className="font-bold text-slate-900 text-sm mt-0.5">
              {plan.recommendedAllocation?.equityPercent}% Equity / {plan.recommendedAllocation?.debtPercent}% Debt
            </div>
            <span className="text-[11px] text-slate-500 mt-1 block">
              {plan.recommendedAllocation?.rationale}
            </span>
          </div>

          <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
            <span className="text-slate-400 block text-[10px] font-semibold">RECOMMENDED MONTHLY SIP</span>
            <div className="font-extrabold text-teal-700 text-sm mt-0.5">
              {formatINR(plan.calculatedMetrics?.totalMonthlySIP || 0)}/mo
            </div>
            <span className="text-[11px] text-slate-500 mt-1 block">
              Advance beginning-of-month timing
            </span>
          </div>

          <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
            <span className="text-slate-400 block text-[10px] font-semibold">TARGET CORPUS (FV)</span>
            <div className="font-bold text-slate-900 text-sm mt-0.5">
              {formatINR(plan.calculatedMetrics?.totalTargetCorpus || 0)}
            </div>
            <span className="text-[11px] text-slate-500 mt-1 block">
              Inflation-adjusted target milestone
            </span>
          </div>
        </div>

        {/* Selected Schemes Table */}
        <div className="pt-2">
          <h4 className="text-xs font-bold text-slate-800 mb-2">Recommended Mutual Fund Schemes:</h4>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-100">
                <tr>
                  <th className="py-2 px-3">Scheme Name</th>
                  <th className="py-2 px-3">Category</th>
                  <th className="py-2 px-3">Weight</th>
                  <th className="py-2 px-3 font-bold text-teal-800">Monthly SIP</th>
                  <th className="py-2 px-3">Adviser Rationale</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(plan.fundSelections || []).map((f: any, i: number) => (
                  <tr key={i}>
                    <td className="py-2.5 px-3 font-semibold text-slate-900">{f.schemeName}</td>
                    <td className="py-2.5 px-3 text-slate-600">{f.category}</td>
                    <td className="py-2.5 px-3 font-bold">{f.weightPercent}%</td>
                    <td className="py-2.5 px-3 font-extrabold text-teal-700">
                      {formatINR(f.recommendedMonthlySIP)}/mo
                    </td>
                    <td className="py-2.5 px-3 text-slate-500 text-[11px]">{f.rationale}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Adviser Decision Console */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-4">
        <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2 flex items-center justify-between">
          <span>Adviser Compliance Decision & Digital Sign-off</span>
          <span className="text-[11px] text-slate-400">SEBI RIA Audit Standard</span>
        </h3>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Compliance Audit Rationale & Clinical Justification *
          </label>
          <textarea
            rows={3}
            value={decisionNotes}
            onChange={(e) => setDecisionNotes(e.target.value)}
            placeholder="e.g. Verified client KYC and cashflow resilience. Asset allocation aligns with 15-year horizon and conservative capacity constraints. Approved for client delivery."
            className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs focus:outline-hidden focus:border-teal-500"
          />
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100">
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleDecision("REJECT")}
              disabled={submitting}
              className="px-4 py-2 border border-rose-300 hover:bg-rose-50 text-rose-700 font-bold rounded-lg text-xs transition cursor-pointer"
            >
              Reject Plan
            </button>
            <button
              onClick={() => handleDecision("REQUEST_CHANGES")}
              disabled={submitting}
              className="px-4 py-2 border border-amber-300 hover:bg-amber-50 text-amber-800 font-bold rounded-lg text-xs transition cursor-pointer"
            >
              Request Changes
            </button>
          </div>

          <button
            onClick={() => handleDecision("APPROVE")}
            disabled={submitting || isBlocked}
            className={`px-5 py-2 font-bold rounded-lg text-xs flex items-center gap-1.5 transition shadow-xs ${
              isBlocked
                ? "bg-slate-200 text-slate-400 cursor-not-allowed"
                : "bg-emerald-600 hover:bg-emerald-500 text-white cursor-pointer"
            }`}
            title={isBlocked ? "Cannot approve: Fix suitability blockers first" : undefined}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>{isBlocked ? "Approval Blocked by Guardrails" : "Approve & Sign-Off Recommendation"}</span>
          </button>
        </div>
      </div>

      {/* Audit History */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-3">
        <h4 className="text-xs font-bold text-slate-900 border-b border-slate-100 pb-2 flex items-center gap-2">
          <History className="w-4 h-4 text-teal-600" />
          <span>Plan Version Audit Records</span>
        </h4>
        <div className="space-y-2 text-xs">
          {(plan.approvalHistory || []).map((h: any, i: number) => (
            <div key={i} className="flex justify-between items-start py-1.5 border-b border-slate-50 text-[11px]">
              <div>
                <span className="font-bold text-slate-800">{h.decision} (v{h.planVersion})</span>
                <span className="text-slate-500 ml-2">by {h.actorName} ({h.actorRole})</span>
                {h.reasonNotes && <p className="text-slate-600 italic mt-0.5">&ldquo;{h.reasonNotes}&rdquo;</p>}
              </div>
              <span className="text-slate-400">{h.timestamp ? new Date(h.timestamp).toLocaleDateString("en-IN") : "—"}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
