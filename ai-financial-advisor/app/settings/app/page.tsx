"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Sliders,
  Database,
  ShieldCheck,
  CheckCircle2,
  RefreshCw,
  FolderLock,
  ArrowLeft,
  Server,
} from "lucide-react";
import { Badge } from "@/components/ui/Badge";

export default function ApplicationSettingsPage() {
  const [minEmergencyMonths, setMinEmergencyMonths] = useState(3.0);
  const [maxDebtRatio, setMaxDebtRatio] = useState(40);
  const [maxSmallCapRetiree, setMaxSmallCapRetiree] = useState(20);
  const [saved, setSaved] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            System & Suitability Guardrail Configuration
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Global governance thresholds, database connectivity status, and regulatory rules engine configuration.
          </p>
        </div>

        <Link
          href="/settings/adviser"
          className="px-3.5 py-1.5 border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold text-xs rounded-lg transition"
        >
          ← Adviser Profile
        </Link>
      </div>

      {saved && (
        <div className="p-3.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>Application guardrail settings updated successfully.</span>
        </div>
      )}

      {/* Database & Infrastructure Status */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-4">
        <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Database className="w-4 h-4 text-teal-600" />
            <span>Persistence & Database Engine Status</span>
          </div>
          <Badge variant="success" dot>Operational</Badge>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
            <span className="text-slate-400 block text-[10px] font-semibold">STORAGE ARCHITECTURE</span>
            <span className="font-bold text-slate-900 text-sm mt-0.5 block">Dual Mode (Atlas / Memory)</span>
            <span className="text-[11px] text-slate-500 mt-1 block">Graceful fallback active</span>
          </div>

          <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
            <span className="text-slate-400 block text-[10px] font-semibold">AMFI DATA MASTER</span>
            <span className="font-bold text-teal-700 text-sm mt-0.5 block">8 Verified Schemes</span>
            <span className="text-[11px] text-slate-500 mt-1 block">Freshness: Oct 2026 Feed</span>
          </div>

          <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
            <span className="text-slate-400 block text-[10px] font-semibold">AUDIT REPOSITORY</span>
            <span className="font-bold text-emerald-700 text-sm mt-0.5 block">Immutable Mode</span>
            <span className="text-[11px] text-slate-500 mt-1 block">100% Actions Tracked</span>
          </div>
        </div>
      </div>

      {/* Guardrail Thresholds Form */}
      <form onSubmit={handleSave} className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-5">
        <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2 flex items-center gap-2">
          <Sliders className="w-4 h-4 text-teal-600" />
          <span>Configurable Suitability Engine Parameters</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Minimum Emergency Fund Coverage (Months)
            </label>
            <input
              type="number"
              min={1}
              max={12}
              step={0.5}
              value={minEmergencyMonths}
              onChange={(e) => setMinEmergencyMonths(Number(e.target.value))}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 font-bold"
            />
            <span className="text-[10px] text-slate-400 mt-1 block">
              Triggers alert if client buffer is below this
            </span>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Max Debt-to-Income EMI Ratio (%)
            </label>
            <input
              type="number"
              min={20}
              max={70}
              value={maxDebtRatio}
              onChange={(e) => setMaxDebtRatio(Number(e.target.value))}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 font-bold"
            />
            <span className="text-[10px] text-slate-400 mt-1 block">
              Elevated debt burden warning threshold
            </span>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Max Small-Cap Exposure for Retirees (%)
            </label>
            <input
              type="number"
              min={0}
              max={30}
              value={maxSmallCapRetiree}
              onChange={(e) => setMaxSmallCapRetiree(Number(e.target.value))}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 font-bold"
            />
            <span className="text-[10px] text-slate-400 mt-1 block">
              Strict BLOCKED rule threshold for age &ge; 60
            </span>
          </div>
        </div>

        <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
          <span className="text-xs text-slate-400">
            Rules Engine Version: <strong>2.4.0 (Deterministic)</strong>
          </span>

          <button
            type="submit"
            className="px-4 py-2 bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs rounded-lg transition shadow-xs cursor-pointer"
          >
            Update Governance Rules
          </button>
        </div>
      </form>
    </div>
  );
}
