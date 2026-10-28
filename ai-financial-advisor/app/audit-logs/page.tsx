"use client";

import React, { useEffect, useState } from "react";
import {
  History,
  Search,
  Filter,
  ShieldCheck,
  CheckCircle2,
  Calendar,
  User,
  Activity,
} from "lucide-react";
import { Badge } from "@/components/ui/Badge";

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [entityFilter, setEntityFilter] = useState("ALL");

  useEffect(() => {
    async function fetchLogs() {
      try {
        const queryParams = new URLSearchParams();
        if (entityFilter !== "ALL") queryParams.set("entityType", entityFilter);
        const res = await fetch(`/api/audit-logs?${queryParams.toString()}`);
        const json = await res.json();
        setLogs(json.data || []);
      } catch (err) {
        console.error("Failed to load audit logs:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchLogs();
  }, [entityFilter]);

  const filtered = logs.filter((l) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      l.action?.toLowerCase().includes(s) ||
      l.actorName?.toLowerCase().includes(s) ||
      l.entityId?.toLowerCase().includes(s)
    );
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Immutable Regulatory Audit Logs
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Complete, chronological record of all adviser logins, client updates, risk assessments, calculations, guardrails, and approvals.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="teal">Tamper-Proof Logging</Badge>
          <Badge variant="navy">SEBI RIA Retention Standard</Badge>
        </div>
      </div>

      {/* Filters and Search Bar */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative w-full md:w-96">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search audit records by actor, action, or ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-4 py-1.5 text-xs focus:outline-hidden focus:border-teal-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto text-xs">
          <Filter className="w-3.5 h-3.5 text-slate-400" />
          <select
            value={entityFilter}
            onChange={(e) => setEntityFilter(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-hidden font-medium"
          >
            <option value="ALL">All Entity Types</option>
            <option value="CLIENT">Client Records</option>
            <option value="PLAN">Advisory Plans</option>
            <option value="GOAL">Financial Goals</option>
            <option value="DOCUMENT">Research Documents</option>
            <option value="AUTH">Authentication Events</option>
            <option value="SYSTEM">System Events</option>
          </select>
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-semibold">
              <tr>
                <th className="px-6 py-3.5">Timestamp (IST)</th>
                <th className="px-4 py-3.5">Actor & Role</th>
                <th className="px-4 py-3.5">Action Executed</th>
                <th className="px-4 py-3.5">Target Entity</th>
                <th className="px-6 py-3.5">Audit Metadata Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
              {filtered.map((log, i) => (
                <tr key={log.id || i} className="hover:bg-slate-50/80 transition">
                  <td className="px-6 py-3 text-slate-500 whitespace-nowrap">
                    {new Date(log.timestamp).toLocaleString("en-IN")}
                  </td>

                  <td className="px-4 py-3">
                    <span className="font-bold text-slate-800">{log.actorName}</span>
                    <span className="text-[10px] text-slate-400 block font-sans">Role: {log.actorRole}</span>
                  </td>

                  <td className="px-4 py-3">
                    <span
                      className={`px-2 py-0.5 rounded font-bold text-[10px] ${
                        log.action.includes("APPROVED")
                          ? "bg-emerald-100 text-emerald-800"
                          : log.action.includes("DELETED") || log.action.includes("REJECTED")
                          ? "bg-rose-100 text-rose-800"
                          : "bg-slate-100 text-slate-800"
                      }`}
                    >
                      {log.action}
                    </span>
                  </td>

                  <td className="px-4 py-3">
                    <span className="font-semibold text-slate-700">{log.entityType}</span>
                    <span className="text-slate-400 block text-[10px]">{log.entityId}</span>
                  </td>

                  <td className="px-6 py-3 font-sans text-slate-600 max-w-md">
                    {log.metadata ? (
                      <span className="text-[11px] truncate block text-slate-500 font-mono">
                        {JSON.stringify(log.metadata)}
                      </span>
                    ) : (
                      "—"
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
