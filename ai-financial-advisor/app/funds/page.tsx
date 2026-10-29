"use client";

import React, { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import {
  Search,
  Filter,
  RefreshCw,
  ExternalLink,
  ShieldAlert,
  ShieldCheck,
  Building,
  CheckCircle2,
  AlertCircle,
  Database,
  Info,
  Calendar,
  Layers,
  Sparkles,
} from "lucide-react";
import { formatINR } from "@/lib/utils";
import { AmfiSchemeRecord } from "@/lib/services/amfiService";

export default function FundExplorerPage() {
  const [schemes, setSchemes] = useState<AmfiSchemeRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filters & Search
  const [search, setSearch] = useState("");
  const [planFilter, setPlanFilter] = useState<"All" | "Direct" | "Regular">("Direct");
  const [optionFilter, setOptionFilter] = useState<"All" | "Growth" | "IDCW">("Growth");
  const [categoryFilter, setCategoryFilter] = useState("All");

  // Metadata
  const [totalSchemes, setTotalSchemes] = useState(0);
  const [totalMatched, setTotalMatched] = useState(0);
  const [latestDataDate, setLatestDataDate] = useState("");
  const [lastFetchedAt, setLastFetchedAt] = useState("");
  const [fromCache, setFromCache] = useState(false);

  const fetchAmfiData = async (forceRefresh = false) => {
    if (forceRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (search.trim()) params.set("search", search.trim());
      if (planFilter !== "All") params.set("plan", planFilter);
      if (optionFilter !== "All") params.set("option", optionFilter);
      if (categoryFilter !== "All") params.set("category", categoryFilter);
      if (forceRefresh) params.set("refresh", "true");
      params.set("limit", "100");

      const res = await fetch(`/api/amfi/nav?${params.toString()}`);
      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.error || `HTTP ${res.status}`);
      }

      setSchemes(json.data || []);
      setTotalSchemes(json.totalSchemes || 0);
      setTotalMatched(json.totalMatched || 0);
      setLatestDataDate(json.latestDataDate || "");
      setLastFetchedAt(json.lastFetchedAt || "");
      setFromCache(Boolean(json.fromCache));
    } catch (err: any) {
      console.error("Failed to load AMFI data:", err);
      setError(err.message || "Failed to connect to AMFI feed.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Debounced search on typing
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchAmfiData(false);
    }, 300);
    return () => clearTimeout(timer);
  }, [search, planFilter, optionFilter, categoryFilter]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Top Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
              Live AMFI Mutual Fund Explorer
            </h1>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-teal-50 dark:bg-teal-950/60 text-teal-800 dark:text-teal-300 border border-teal-200 dark:border-teal-800">
              Official Feed
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Real-time daily NAV feed fetched directly from{" "}
            <a
              href="https://portal.amfiindia.com/spages/NAVAll.txt"
              target="_blank"
              rel="noreferrer"
              className="text-teal-600 dark:text-teal-400 hover:underline font-mono inline-flex items-center gap-0.5"
            >
              portal.amfiindia.com/spages/NAVAll.txt
              <ExternalLink className="w-2.5 h-2.5 inline" />
            </a>
            . Semicolon-delimited records parsed and cached with zero client data leakage.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => fetchAmfiData(true)}
            disabled={refreshing || loading}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 text-white dark:bg-teal-600 dark:hover:bg-teal-700 hover:bg-slate-800 text-xs font-semibold shadow-xs transition disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} />
            <span>{refreshing ? "Refreshing AMFI..." : "Refresh AMFI Feed"}</span>
          </button>
        </div>
      </div>

      {/* Feed Status and Fiduciary Disclosures */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-teal-50 dark:bg-teal-950/50 flex items-center justify-center text-teal-600 dark:text-teal-400 shrink-0">
            <Database className="w-4 h-4" />
          </div>
          <div className="text-xs">
            <p className="text-slate-400 dark:text-slate-500 text-[10px] uppercase font-bold tracking-wider">
              Feed Coverage
            </p>
            <p className="text-slate-900 dark:text-slate-100 font-bold text-sm mt-0.5">
              {totalSchemes > 0 ? `${totalSchemes.toLocaleString("en-IN")} Total Schemes` : "Loading..."}
            </p>
            <p className="text-[10px] text-slate-500 dark:text-slate-400">
              {fromCache ? "Serving in-memory cached copy" : "Fresh live download from portal"}
            </p>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950/50 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0">
            <Calendar className="w-4 h-4" />
          </div>
          <div className="text-xs">
            <p className="text-slate-400 dark:text-slate-500 text-[10px] uppercase font-bold tracking-wider">
              NAV Publication Date
            </p>
            <p className="text-slate-900 dark:text-slate-100 font-bold text-sm mt-0.5">
              {latestDataDate || "Awaiting feed..."}
            </p>
            <p className="text-[10px] text-slate-500 dark:text-slate-400">
              Last synced: {lastFetchedAt ? new Date(lastFetchedAt).toLocaleTimeString() : "—"}
            </p>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-amber-50 dark:bg-amber-950/50 flex items-center justify-center text-amber-600 dark:text-amber-400 shrink-0">
            <ShieldAlert className="w-4 h-4" />
          </div>
          <div className="text-xs">
            <p className="text-slate-400 dark:text-slate-500 text-[10px] uppercase font-bold tracking-wider">
              SEBI RIA Fiduciary Rule
            </p>
            <p className="text-slate-900 dark:text-slate-100 font-bold text-xs mt-0.5">
              Never Rank on NAV Alone
            </p>
            <p className="text-[10px] text-slate-500 dark:text-slate-400">
              TER & AUM require AMC factsheets
            </p>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row gap-3 items-center justify-between">
          {/* Search Box */}
          <div className="relative w-full md:w-96">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search scheme name, AMC, code, or ISIN..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-teal-500"
            />
          </div>

          {/* Plan & Option Selectors */}
          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto text-xs">
            <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700">
              <span className="text-slate-500 dark:text-slate-400 font-medium text-[11px]">Plan:</span>
              <select
                value={planFilter}
                onChange={(e) => setPlanFilter(e.target.value as any)}
                className="bg-transparent font-semibold text-slate-800 dark:text-slate-200 focus:outline-hidden cursor-pointer"
              >
                <option value="Direct">Direct Plan (Zero Comm.)</option>
                <option value="Regular">Regular Plan</option>
                <option value="All">All Plans</option>
              </select>
            </div>

            <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700">
              <span className="text-slate-500 dark:text-slate-400 font-medium text-[11px]">Option:</span>
              <select
                value={optionFilter}
                onChange={(e) => setOptionFilter(e.target.value as any)}
                className="bg-transparent font-semibold text-slate-800 dark:text-slate-200 focus:outline-hidden cursor-pointer"
              >
                <option value="Growth">Growth Option</option>
                <option value="IDCW">IDCW / Dividend</option>
                <option value="All">All Options</option>
              </select>
            </div>

            <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700">
              <span className="text-slate-500 dark:text-slate-400 font-medium text-[11px]">Category:</span>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="bg-transparent font-semibold text-slate-800 dark:text-slate-200 focus:outline-hidden cursor-pointer"
              >
                <option value="All">All Categories</option>
                <option value="Large Cap">Large Cap Fund</option>
                <option value="Mid Cap">Mid Cap Fund</option>
                <option value="Small Cap">Small Cap Fund</option>
                <option value="Flexi Cap">Flexi Cap Fund</option>
                <option value="Liquid">Liquid Fund</option>
                <option value="Debt">Debt / Corporate Bond</option>
                <option value="Banking">Banking & PSU</option>
                <option value="Children">Children&#39;s Fund</option>
              </select>
            </div>
          </div>
        </div>

        {/* Filter Summary */}
        <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 pt-1 border-t border-slate-100 dark:border-slate-800">
          <span>
            Showing <strong>{schemes.length}</strong> of <strong>{totalMatched.toLocaleString("en-IN")}</strong> matching records
          </span>
          <span className="text-teal-600 dark:text-teal-400 font-medium">
            SEBI RIA Mandate: Recommending Direct Plans preserves 0.5%–1.2% CAGR for clients
          </span>
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200 text-xs flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
          <div>
            <p className="font-bold">Failed to sync live AMFI feed</p>
            <p className="text-[11px] mt-0.5">{error}</p>
          </div>
        </div>
      )}

      {/* Funds Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/80 dark:bg-slate-800/60 border-b border-slate-200/80 dark:border-slate-800 text-slate-500 dark:text-slate-400 uppercase tracking-wider font-semibold text-[10px]">
              <tr>
                <th className="px-6 py-3.5">Scheme & AMC</th>
                <th className="px-4 py-3.5">Category</th>
                <th className="px-4 py-3.5">Plan / Option</th>
                <th className="px-4 py-3.5 font-bold text-teal-800 dark:text-teal-300">Net Asset Value (NAV)</th>
                <th className="px-4 py-3.5">NAV Date</th>
                <th className="px-4 py-3.5">Scheme Code / ISIN</th>
                <th className="px-6 py-3.5 text-right">Fiduciary Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {loading && schemes.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-16 text-center text-slate-400 dark:text-slate-500">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <RefreshCw className="w-6 h-6 animate-spin text-teal-600" />
                      <p className="text-xs font-semibold">Downloading and parsing live AMFI NAVAll.txt...</p>
                      <p className="text-[10px] text-slate-400">Over 14,000 schemes indexed locally</p>
                    </div>
                  </td>
                </tr>
              ) : schemes.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-slate-500 dark:text-slate-400">
                    <p className="font-semibold text-xs">No mutual funds match your search filters.</p>
                    <p className="text-[11px] text-slate-400 mt-1">
                      Try clearing filters or changing Plan to &quot;All Plans&quot;.
                    </p>
                  </td>
                </tr>
              ) : (
                schemes.map((scheme) => (
                  <tr
                    key={scheme.schemeCode}
                    className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition"
                  >
                    <td className="px-6 py-4 max-w-sm">
                      <div className="font-bold text-slate-900 dark:text-slate-100 text-xs">
                        {scheme.schemeName}
                      </div>
                      <div className="flex items-center gap-2 text-slate-400 dark:text-slate-500 text-[10px] mt-0.5">
                        <span className="font-medium text-slate-600 dark:text-slate-400">{scheme.amc}</span>
                      </div>
                    </td>

                    <td className="px-4 py-4 text-[11px] text-slate-600 dark:text-slate-400">
                      <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium">
                        {scheme.category.replace(/Open Ended Schemes\s*\(/i, "").replace(/\)$/, "").trim()}
                      </span>
                    </td>

                    <td className="px-4 py-4 text-[11px]">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                            scheme.planType === "Direct"
                              ? "bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800"
                              : "bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800"
                          }`}
                        >
                          {scheme.planType}
                        </span>
                        <span className="text-slate-600 dark:text-slate-400 font-medium">
                          {scheme.optionType}
                        </span>
                      </div>
                    </td>

                    <td className="px-4 py-4">
                      {scheme.nav !== null ? (
                        <div className="text-xs font-bold text-teal-700 dark:text-teal-400">
                          ₹{scheme.nav.toFixed(4)}
                        </div>
                      ) : (
                        <span className="text-xs font-mono text-slate-400">N.A.</span>
                      )}
                    </td>

                    <td className="px-4 py-4 text-[11px] text-slate-500 dark:text-slate-400">
                      {scheme.navDate}
                    </td>

                    <td className="px-4 py-4 text-[11px] font-mono text-slate-500 dark:text-slate-400">
                      <div>#{scheme.schemeCode}</div>
                      {scheme.isinGrowth && (
                        <div className="text-[10px] text-slate-400 dark:text-slate-500">{scheme.isinGrowth}</div>
                      )}
                    </td>

                    <td className="px-6 py-4 text-right">
                      <Link
                        href={`/assistant?q=${encodeURIComponent(`What is the latest NAV and category suitability for AMFI scheme ${scheme.schemeName} (Code: ${scheme.schemeCode})?`)}`}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-teal-50 dark:bg-teal-950/50 hover:bg-teal-100 dark:hover:bg-teal-900/60 text-teal-800 dark:text-teal-300 font-semibold text-[11px] border border-teal-200 dark:border-teal-800 transition"
                      >
                        <Sparkles className="w-3 h-3 text-teal-600" />
                        <span>Ask Co-Pilot</span>
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
