"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  Search,
  Filter,
  TrendingUp,
  Percent,
  CheckCircle2,
  ExternalLink,
  ChevronRight,
  ShieldCheck,
  Building,
} from "lucide-react";
import { formatINR, formatPercent } from "@/lib/utils";
import { Badge } from "@/components/ui/Badge";

export default function FundExplorerPage() {
  const [funds, setFunds] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [maxExpenseRatio, setMaxExpenseRatio] = useState<number>(1.5);
  const [sortBy, setSortBy] = useState<"name" | "return1Y" | "return3Y" | "expense">("return3Y");

  useEffect(() => {
    async function loadFunds() {
      try {
        const queryParams = new URLSearchParams();
        if (search) queryParams.set("search", search);
        if (categoryFilter !== "ALL") queryParams.set("category", categoryFilter);
        queryParams.set("maxExpenseRatio", String(maxExpenseRatio));

        const res = await fetch(`/api/funds?${queryParams.toString()}`);
        const json = await res.json();
        setFunds(json.data || []);
      } catch (err) {
        console.error("Failed to load funds:", err);
      } finally {
        setLoading(false);
      }
    }
    loadFunds();
  }, [search, categoryFilter, maxExpenseRatio]);

  const sortedFunds = [...funds].sort((a, b) => {
    if (sortBy === "return1Y") return (b.returns?.return1Y || 0) - (a.returns?.return1Y || 0);
    if (sortBy === "return3Y") return (b.returns?.return3Y || 0) - (a.returns?.return3Y || 0);
    if (sortBy === "expense") return (a.expenseRatio || 0) - (b.expenseRatio || 0);
    return (a.schemeName || "").localeCompare(b.schemeName || "");
  });

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Mutual Fund Research Explorer
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            AMFI Master Feed authenticated schemes across Large, Mid, Small Cap, Hybrid, and Debt with verified expense ratios.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="teal">AMFI Master Feed Active</Badge>
          <Badge variant="navy">Direct Growth Only</Badge>
        </div>
      </div>

      {/* Filter and Search Controls */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative w-full md:w-96">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by scheme name, AMC, or AMFI code..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-4 py-1.5 text-xs focus:outline-hidden focus:border-teal-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto text-xs">
          <div className="flex items-center gap-1 text-slate-500">
            <Filter className="w-3.5 h-3.5" />
            <span>Category:</span>
          </div>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-hidden"
          >
            <option value="ALL">All Categories</option>
            <option value="Equity">Equity</option>
            <option value="Debt">Debt</option>
            <option value="Hybrid">Hybrid</option>
          </select>

          <div className="flex items-center gap-1.5 text-slate-600 pl-2">
            <span>Max TER:</span>
            <span className="font-bold text-teal-700">{maxExpenseRatio}%</span>
            <input
              type="range"
              min={0.1}
              max={1.5}
              step={0.05}
              value={maxExpenseRatio}
              onChange={(e) => setMaxExpenseRatio(Number(e.target.value))}
              className="w-24 accent-teal-600 cursor-pointer"
            />
          </div>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-hidden"
          >
            <option value="return3Y">Sort by 3Y CAGR</option>
            <option value="return1Y">Sort by 1Y Return</option>
            <option value="expense">Sort by Lowest Expense Ratio</option>
            <option value="name">Sort by Name</option>
          </select>
        </div>
      </div>

      {/* Funds Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-semibold">
              <tr>
                <th className="px-6 py-3.5">Scheme & AMC</th>
                <th className="px-4 py-3.5">Category / Sub-Category</th>
                <th className="px-4 py-3.5">Current NAV</th>
                <th className="px-4 py-3.5">Expense Ratio (TER)</th>
                <th className="px-4 py-3.5">AUM (Cr)</th>
                <th className="px-4 py-3.5">1Y Return</th>
                <th className="px-4 py-3.5 font-bold text-teal-800">3Y CAGR</th>
                <th className="px-4 py-3.5">Max Drawdown</th>
                <th className="px-6 py-3.5 text-right">Research</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sortedFunds.map((fund) => (
                <tr key={fund._id} className="hover:bg-slate-50/80 transition">
                  <td className="px-6 py-4">
                    <Link
                      href={`/funds/${fund._id}`}
                      className="font-bold text-slate-900 hover:text-teal-600 text-sm block"
                    >
                      {fund.schemeName}
                    </Link>
                    <div className="flex items-center gap-2 text-slate-400 text-[11px] mt-0.5">
                      <span>{fund.amc}</span>
                      <span>•</span>
                      <span className="font-mono">AMFI #{fund.schemeCode}</span>
                    </div>
                  </td>

                  <td className="px-4 py-4">
                    <Badge variant={fund.category === "Equity" ? "teal" : fund.category === "Debt" ? "info" : "navy"}>
                      {fund.category}
                    </Badge>
                    <span className="text-[11px] text-slate-500 block mt-1">{fund.subCategory}</span>
                  </td>

                  <td className="px-4 py-4 font-semibold text-slate-900">
                    ₹{fund.currentNAV?.toFixed(2)}
                    <span className="block text-[10px] text-slate-400">{fund.navDate}</span>
                  </td>

                  <td className="px-4 py-4 font-bold text-slate-800">
                    {fund.expenseRatio}%
                  </td>

                  <td className="px-4 py-4 text-slate-700">
                    ₹{fund.aumCrores?.toLocaleString("en-IN")} Cr
                  </td>

                  <td className="px-4 py-4 font-semibold text-emerald-700">
                    {formatPercent(fund.returns?.return1Y)}
                  </td>

                  <td className="px-4 py-4 font-extrabold text-teal-700">
                    {formatPercent(fund.returns?.return3Y)}
                  </td>

                  <td className="px-4 py-4 font-medium text-rose-600">
                    {fund.riskMetrics?.maxDrawdown}%
                  </td>

                  <td className="px-6 py-4 text-right">
                    <Link
                      href={`/funds/${fund._id}`}
                      className="px-3 py-1 bg-white border border-slate-200 hover:border-slate-300 hover:bg-slate-50 rounded-md text-xs font-semibold text-slate-700 transition inline-flex items-center gap-1"
                    >
                      <span>Analyze</span>
                      <ChevronRight className="w-3 h-3" />
                    </Link>
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
