"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  ShieldCheck,
  Clock,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  ChevronRight,
  Filter,
  Search,
} from "lucide-react";
import { formatINR } from "@/lib/utils";
import { StatusBadge, Badge } from "@/components/ui/Badge";

export default function ApprovalQueuePage() {
  const [plans, setPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"ALL" | "PENDING_REVIEW" | "BLOCKED" | "APPROVED" | "CHANGES_REQUESTED">("ALL");

  useEffect(() => {
    async function loadQueue() {
      try {
        const res = await fetch("/api/approvals");
        const json = await res.json();
        setPlans(json.data || []);
      } catch (err) {
        console.error("Failed to load approval queue:", err);
      } finally {
        setLoading(false);
      }
    }
    loadQueue();
  }, []);

  const filtered = plans.filter((p) => {
    if (activeTab === "ALL") return true;
    return p.status === activeTab;
  });

  const pendingCount = plans.filter((p) => p.status === "PENDING_REVIEW").length;
  const blockedCount = plans.filter((p) => p.status === "BLOCKED").length;
  const approvedCount = plans.filter((p) => p.status === "APPROVED").length;

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Adviser Approval & Compliance Queue
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Mandatory review console. No financial recommendation reaches a client without deterministic guardrail passage and adviser sign-off.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="warning" dot>{pendingCount} Pending Sign-Off</Badge>
          <Badge variant="danger" dot>{blockedCount} Blocked by Safety</Badge>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2 text-xs font-semibold">
        <button
          onClick={() => setActiveTab("ALL")}
          className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
            activeTab === "ALL" ? "bg-[#0b192c] text-white" : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          All Plans ({plans.length})
        </button>

        <button
          onClick={() => setActiveTab("PENDING_REVIEW")}
          className={`px-3 py-1.5 rounded-lg transition cursor-pointer flex items-center gap-1.5 ${
            activeTab === "PENDING_REVIEW" ? "bg-amber-500 text-slate-950 font-bold" : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          <span>Pending Review</span>
          <span className="bg-amber-100 text-amber-900 text-[10px] px-1.5 py-0.2 rounded-full font-bold">
            {pendingCount}
          </span>
        </button>

        <button
          onClick={() => setActiveTab("BLOCKED")}
          className={`px-3 py-1.5 rounded-lg transition cursor-pointer flex items-center gap-1.5 ${
            activeTab === "BLOCKED" ? "bg-rose-600 text-white font-bold" : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          <span>Blocked by Guardrails</span>
          <span className="bg-rose-100 text-rose-900 text-[10px] px-1.5 py-0.2 rounded-full font-bold">
            {blockedCount}
          </span>
        </button>

        <button
          onClick={() => setActiveTab("APPROVED")}
          className={`px-3 py-1.5 rounded-lg transition cursor-pointer flex items-center gap-1.5 ${
            activeTab === "APPROVED" ? "bg-emerald-600 text-white font-bold" : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          <span>Approved ({approvedCount})</span>
        </button>
      </div>

      {/* Queue Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-semibold">
              <tr>
                <th className="px-6 py-3.5">Plan Title & Client</th>
                <th className="px-4 py-3.5">Version</th>
                <th className="px-4 py-3.5">Status</th>
                <th className="px-4 py-3.5">Target Corpus</th>
                <th className="px-4 py-3.5 font-bold text-teal-800">Monthly SIP</th>
                <th className="px-4 py-3.5">Suitability Findings</th>
                <th className="px-6 py-3.5 text-right">Review Console</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((p) => {
                const blockedFindings = (p.suitabilityFindings || []).filter((f: any) => f.severity === "BLOCKED");
                const warningFindings = (p.suitabilityFindings || []).filter((f: any) => f.severity === "WARNING" || f.severity === "HIGH_RISK");

                return (
                  <tr key={p._id} className="hover:bg-slate-50/80 transition">
                    <td className="px-6 py-4">
                      <Link
                        href={`/approvals/${p._id}`}
                        className="font-bold text-slate-900 hover:text-teal-600 text-sm block"
                      >
                        {p.planTitle}
                      </Link>
                      <span className="text-slate-500 text-[11px] block mt-0.5">
                        Client: <strong>{p.clientName}</strong> ({p.clientCity || "—"})
                      </span>
                    </td>

                    <td className="px-4 py-4">
                      <Badge variant="navy">v{p.version}</Badge>
                    </td>

                    <td className="px-4 py-4">
                      <StatusBadge status={p.status} />
                    </td>

                    <td className="px-4 py-4 font-semibold text-slate-800">
                      {formatINR(p.calculatedMetrics?.totalTargetCorpus || 0)}
                    </td>

                    <td className="px-4 py-4 font-extrabold text-teal-700">
                      {formatINR(p.calculatedMetrics?.totalMonthlySIP || 0)}/mo
                    </td>

                    <td className="px-4 py-4">
                      {p.isBlockedBySuitability ? (
                        <div className="flex items-center gap-1.5 text-rose-600 font-bold">
                          <AlertCircle className="w-3.5 h-3.5" />
                          <span>{blockedFindings.length} Blocker(s)</span>
                        </div>
                      ) : warningFindings.length > 0 ? (
                        <div className="flex items-center gap-1.5 text-amber-600 font-medium">
                          <AlertTriangle className="w-3.5 h-3.5" />
                          <span>{warningFindings.length} Warning(s)</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 text-emerald-600 font-semibold">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Clean / Passed</span>
                        </div>
                      )}
                    </td>

                    <td className="px-6 py-4 text-right">
                      <Link
                        href={`/approvals/${p._id}`}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition inline-flex items-center gap-1 ${
                          p.status === "PENDING_REVIEW"
                            ? "bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-xs"
                            : "bg-white border border-slate-200 hover:bg-slate-50 text-slate-800"
                        }`}
                      >
                        <span>{p.status === "PENDING_REVIEW" ? "Review & Sign" : "Inspect"}</span>
                        <ChevronRight className="w-3 h-3" />
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
