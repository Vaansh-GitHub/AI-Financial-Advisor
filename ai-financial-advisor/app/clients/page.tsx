"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Users,
  Search,
  Filter,
  PlusCircle,
  Upload,
  Bot,
  FileText,
  Edit,
  Trash2,
  AlertTriangle,
  ArrowUpDown,
  CheckCircle2,
  ExternalLink,
  ChevronRight,
  ShieldCheck,
  TrendingUp,
  LayoutGrid,
  List,
} from "lucide-react";
import { useStorageData } from "@/lib/storage/useStorage";
import { deleteClient } from "@/lib/storage/localStorage";
import { formatINR } from "@/lib/utils";
import { StatusBadge, Badge } from "@/components/ui/Badge";
import { DataUploadModal } from "@/components/clients/DataUploadModal";

export default function ClientsListPage() {
  const router = useRouter();
  const { clients, refreshAll } = useStorageData();

  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [employmentFilter, setEmploymentFilter] = useState("ALL");
  const [emergencyFilter, setEmergencyFilter] = useState("ALL");
  const [sortBy, setSortBy] = useState<"name" | "income" | "savings" | "updated">("name");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [viewMode, setViewMode] = useState<"table" | "grid">("table");

  const [showUploadModal, setShowUploadModal] = useState(false);
  const [selectedClientForUpload, setSelectedClientForUpload] = useState<string | undefined>();
  const [clientToDelete, setClientToDelete] = useState<{ id: string; name: string } | null>(null);

  // Filter clients
  let filtered = clients.filter((c) => {
    // Search query
    const matchSearch =
      c.fullName.toLowerCase().includes(search.toLowerCase()) ||
      c.city.toLowerCase().includes(search.toLowerCase()) ||
      c.email.toLowerCase().includes(search.toLowerCase()) ||
      (c.phone && c.phone.includes(search));
    if (!matchSearch) return false;

    // Risk category filter
    if (categoryFilter !== "ALL" && c.riskProfile?.combinedCategory !== categoryFilter) {
      return false;
    }

    // Employment filter
    if (employmentFilter !== "ALL" && c.employmentType !== employmentFilter) {
      return false;
    }

    // Emergency reserve filter
    const monthlyBurn = c.monthlyExpenses + c.monthlyEMI;
    const runway = monthlyBurn > 0 ? c.emergencyFundAmount / monthlyBurn : 0;
    if (emergencyFilter === "DEFICIENT" && runway >= 3) return false;
    if (emergencyFilter === "MODERATE" && (runway < 3 || runway >= 6)) return false;
    if (emergencyFilter === "ADEQUATE" && runway < 6) return false;

    return true;
  });

  // Sorting
  filtered.sort((a, b) => {
    let diff = 0;
    if (sortBy === "income") {
      diff = (b.monthlyIncome || 0) - (a.monthlyIncome || 0);
    } else if (sortBy === "savings") {
      const aNet = (a.existingSavings || 0) + (a.existingInvestments || 0);
      const bNet = (b.existingSavings || 0) + (b.existingInvestments || 0);
      diff = bNet - aNet;
    } else if (sortBy === "updated") {
      diff = new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    } else {
      diff = (a.fullName || "").localeCompare(b.fullName || "");
    }
    return sortOrder === "asc" ? diff : -diff;
  });

  const handleDeleteConfirm = () => {
    if (!clientToDelete) return;
    deleteClient(clientToDelete.id);
    refreshAll();
    setClientToDelete(null);
  };

  return (
    <div className="space-y-6">
      {/* HEADER & QUICK ACTIONS */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Client Directory</h1>
          <p className="text-xs text-slate-500 mt-1">
            Managing {clients.length} local client records with SEBI RIA suitability profiles
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => {
              setSelectedClientForUpload(undefined);
              setShowUploadModal(true);
            }}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 font-semibold text-xs text-slate-700 transition"
          >
            <Upload className="w-3.5 h-3.5 text-slate-500" />
            <span>Upload Client Data</span>
          </button>

          <Link
            href="/clients/new"
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-semibold text-xs shadow-xs transition"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Add New Client</span>
          </Link>
        </div>
      </div>

      {/* SEARCH, FILTERS & CONTROLS BAR */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row items-center gap-3">
          {/* Search Input */}
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, city, email, phone..."
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-2 text-xs focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 text-slate-900"
            />
          </div>

          {/* Risk Filter */}
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-700 focus:ring-teal-500 w-full md:w-auto"
          >
            <option value="ALL">All Risk Profiles</option>
            <option value="CONSERVATIVE">Conservative</option>
            <option value="MODERATELY_CONSERVATIVE">Moderately Conservative</option>
            <option value="BALANCED">Balanced</option>
            <option value="GROWTH">Growth</option>
            <option value="AGGRESSIVE">Aggressive</option>
          </select>

          {/* Employment Filter */}
          <select
            value={employmentFilter}
            onChange={(e) => setEmploymentFilter(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-700 focus:ring-teal-500 w-full md:w-auto"
          >
            <option value="ALL">All Employment Types</option>
            <option value="salaried_permanent">Salaried Permanent</option>
            <option value="salaried_contract">Salaried Contract</option>
            <option value="self_employed_professional">Self Employed Professional</option>
            <option value="business_owner">Business Owner</option>
            <option value="retired">Retired</option>
          </select>

          {/* Emergency Runway Filter */}
          <select
            value={emergencyFilter}
            onChange={(e) => setEmergencyFilter(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-700 focus:ring-teal-500 w-full md:w-auto"
          >
            <option value="ALL">All Emergency Reserves</option>
            <option value="DEFICIENT">Deficient (&lt; 3 Months)</option>
            <option value="MODERATE">Moderate (3 - 6 Months)</option>
            <option value="ADEQUATE">Adequate (6+ Months)</option>
          </select>

          {/* View Mode Toggle */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl shrink-0">
            <button
              onClick={() => setViewMode("table")}
              className={`p-1.5 rounded-lg transition ${
                viewMode === "table" ? "bg-white text-slate-900 shadow-xs" : "text-slate-500 hover:text-slate-900"
              }`}
              title="Table View"
            >
              <List className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode("grid")}
              className={`p-1.5 rounded-lg transition ${
                viewMode === "grid" ? "bg-white text-slate-900 shadow-xs" : "text-slate-500 hover:text-slate-900"
              }`}
              title="Grid Cards View"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Sort Controls & Active Filters Count */}
        <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
          <div className="flex items-center gap-3">
            <span>
              Showing <strong>{filtered.length}</strong> of <strong>{clients.length}</strong> clients
            </span>
            {(categoryFilter !== "ALL" || employmentFilter !== "ALL" || emergencyFilter !== "ALL" || search) && (
              <button
                onClick={() => {
                  setSearch("");
                  setCategoryFilter("ALL");
                  setEmploymentFilter("ALL");
                  setEmergencyFilter("ALL");
                }}
                className="text-teal-600 font-semibold hover:underline"
              >
                Reset filters
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <span>Sort by:</span>
            <button
              onClick={() => {
                if (sortBy === "name") setSortOrder(sortOrder === "asc" ? "desc" : "asc");
                else { setSortBy("name"); setSortOrder("asc"); }
              }}
              className={`px-2 py-1 rounded-md font-medium transition ${
                sortBy === "name" ? "bg-slate-200 text-slate-900" : "hover:bg-slate-100"
              }`}
            >
              Name {sortBy === "name" && (sortOrder === "asc" ? "↑" : "↓")}
            </button>
            <button
              onClick={() => {
                if (sortBy === "income") setSortOrder(sortOrder === "asc" ? "desc" : "asc");
                else { setSortBy("income"); setSortOrder("asc"); }
              }}
              className={`px-2 py-1 rounded-md font-medium transition ${
                sortBy === "income" ? "bg-slate-200 text-slate-900" : "hover:bg-slate-100"
              }`}
            >
              Income {sortBy === "income" && (sortOrder === "asc" ? "↑" : "↓")}
            </button>
            <button
              onClick={() => {
                if (sortBy === "savings") setSortOrder(sortOrder === "asc" ? "desc" : "asc");
                else { setSortBy("savings"); setSortOrder("asc"); }
              }}
              className={`px-2 py-1 rounded-md font-medium transition ${
                sortBy === "savings" ? "bg-slate-200 text-slate-900" : "hover:bg-slate-100"
              }`}
            >
              Assets {sortBy === "savings" && (sortOrder === "asc" ? "↑" : "↓")}
            </button>
          </div>
        </div>
      </div>

      {/* CLIENTS CONTENT: TABLE VIEW */}
      {viewMode === "table" && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-3 px-4">Client Name</th>
                  <th className="py-3 px-3">City & Age</th>
                  <th className="py-3 px-3">Monthly Cashflow</th>
                  <th className="py-3 px-3">Emergency Buffer</th>
                  <th className="py-3 px-3">Total Assets / Debt</th>
                  <th className="py-3 px-3">Risk Classification</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.length > 0 ? (
                  filtered.map((client) => {
                    const monthlyBurn = client.monthlyExpenses + client.monthlyEMI;
                    const runway = monthlyBurn > 0 ? (client.emergencyFundAmount / monthlyBurn).toFixed(1) : "0.0";
                    const netSurplus = client.monthlyIncome - monthlyBurn;
                    const totalAssets = client.existingSavings + client.existingInvestments;
                    const hasConflict = client.riskProfile?.hasConflict;

                    return (
                      <tr key={client.id} className="hover:bg-slate-50/80 transition group">
                        {/* Name & Contact */}
                        <td className="py-3.5 px-4">
                          <Link
                            href={`/clients/${client.id}`}
                            className="font-bold text-slate-900 hover:text-teal-600 flex items-center gap-1.5"
                          >
                            <span>{client.fullName}</span>
                            {client.isDemoPersona && (
                              <span className="text-[9px] bg-slate-100 text-slate-600 px-1.5 py-0.2 rounded font-semibold border border-slate-200">
                                Persona
                              </span>
                            )}
                            {hasConflict && (
                              <span title="Risk Conflict Detected">
                                <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                              </span>
                            )}
                          </Link>
                          <p className="text-[11px] text-slate-400 mt-0.5">{client.email}</p>
                        </td>

                        {/* City & Age */}
                        <td className="py-3.5 px-3 text-slate-600">
                          <p className="font-medium text-slate-800">{client.city}</p>
                          <p className="text-[11px] text-slate-400">
                            Age {client.age} • {client.employmentType.replace(/_/g, " ")}
                          </p>
                        </td>

                        {/* Monthly Cashflow */}
                        <td className="py-3.5 px-3">
                          <p className="font-bold text-slate-900">{formatINR(client.monthlyIncome)}/mo</p>
                          <p className="text-[11px] text-emerald-600 font-medium">
                            Surplus: +{formatINR(netSurplus)}
                          </p>
                        </td>

                        {/* Emergency Fund */}
                        <td className="py-3.5 px-3">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold ${
                              Number(runway) >= 6
                                ? "bg-emerald-50 text-emerald-700"
                                : Number(runway) >= 3
                                ? "bg-amber-50 text-amber-700"
                                : "bg-rose-50 text-rose-700"
                            }`}
                          >
                            {runway} Months
                          </span>
                          <p className="text-[10px] text-slate-400 mt-0.5">
                            {formatINR(client.emergencyFundAmount)}
                          </p>
                        </td>

                        {/* Assets vs Debt */}
                        <td className="py-3.5 px-3">
                          <p className="font-semibold text-slate-800">{formatINR(totalAssets)}</p>
                          <p className="text-[11px] text-slate-400">
                            Debt: {client.outstandingLiabilities > 0 ? formatINR(client.outstandingLiabilities) : "₹0"}
                          </p>
                        </td>

                        {/* Risk Profile */}
                        <td className="py-3.5 px-3">
                          <span className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-800 font-semibold text-[10px]">
                            {client.riskProfile?.combinedCategory || "BALANCED"}
                          </span>
                          <p className="text-[10px] text-slate-400 mt-0.5">
                            Cap: {client.riskProfile?.capacityLevel} • Tol: {client.riskProfile?.toleranceLevel}
                          </p>
                        </td>

                        {/* Actions */}
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5 opacity-90 group-hover:opacity-100">
                            <Link
                              href={`/assistant?clientId=${client.id}`}
                              className="p-1.5 rounded-lg text-slate-500 hover:text-teal-600 hover:bg-slate-100 transition"
                              title="Chat with AI about this client"
                            >
                              <Bot className="w-4 h-4" />
                            </Link>

                            <button
                              onClick={() => {
                                setSelectedClientForUpload(client.id);
                                setShowUploadModal(true);
                              }}
                              className="p-1.5 rounded-lg text-slate-500 hover:text-teal-600 hover:bg-slate-100 transition"
                              title="Upload client financial statement / data"
                            >
                              <Upload className="w-4 h-4" />
                            </button>

                            <Link
                              href={`/clients/${client.id}/edit`}
                              className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition"
                              title="Edit Profile"
                            >
                              <Edit className="w-4 h-4" />
                            </Link>

                            <button
                              onClick={() => setClientToDelete({ id: client.id, name: client.fullName })}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                              title="Delete Client"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>

                            <Link
                              href={`/clients/${client.id}`}
                              className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-teal-50 hover:text-teal-700 text-slate-700 font-bold text-[11px] transition ml-1"
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
                    <td colSpan={7} className="py-12 text-center text-slate-400">
                      No clients found matching the selected filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* CLIENTS CONTENT: GRID CARDS VIEW */}
      {viewMode === "grid" && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((client) => {
            const monthlyBurn = client.monthlyExpenses + client.monthlyEMI;
            const runway = monthlyBurn > 0 ? (client.emergencyFundAmount / monthlyBurn).toFixed(1) : "0.0";
            const netSurplus = client.monthlyIncome - monthlyBurn;
            const hasConflict = client.riskProfile?.hasConflict;

            return (
              <div
                key={client.id}
                className="bg-white rounded-2xl p-5 border border-slate-200/80 hover:border-teal-500/50 hover:shadow-md transition flex flex-col justify-between space-y-4"
              >
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-[#0B192C] text-white flex items-center justify-center font-bold text-sm shrink-0">
                        {client.fullName.substring(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <Link
                          href={`/clients/${client.id}`}
                          className="font-bold text-slate-900 hover:text-teal-600 text-sm line-clamp-1"
                        >
                          {client.fullName}
                        </Link>
                        <p className="text-[11px] text-slate-400">{client.city} • {client.age} years</p>
                      </div>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700">
                      {client.riskProfile?.combinedCategory || "BALANCED"}
                    </span>
                  </div>

                  {hasConflict && (
                    <div className="mt-3 p-2 rounded-lg bg-amber-50 border border-amber-200/60 flex items-start gap-2 text-[10px] text-amber-800">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                      <span>Risk Conflict: Objective capacity constrains subjective tolerance.</span>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-2 mt-4 pt-3 border-t border-slate-100 text-[11px]">
                    <div>
                      <p className="text-slate-400 text-[10px]">Monthly Income</p>
                      <p className="font-bold text-slate-800">{formatINR(client.monthlyIncome)}</p>
                    </div>
                    <div>
                      <p className="text-slate-400 text-[10px]">Monthly Surplus</p>
                      <p className="font-bold text-emerald-600">+{formatINR(netSurplus)}</p>
                    </div>
                    <div>
                      <p className="text-slate-400 text-[10px]">Emergency Reserve</p>
                      <p className="font-bold text-slate-800">{runway} Months</p>
                    </div>
                    <div>
                      <p className="text-slate-400 text-[10px]">Invested Assets</p>
                      <p className="font-bold text-slate-800">{formatINR(client.existingInvestments)}</p>
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1">
                    <Link
                      href={`/assistant?clientId=${client.id}`}
                      className="p-1.5 rounded-lg text-slate-500 hover:text-teal-600 hover:bg-slate-100"
                      title="AI Chat"
                    >
                      <Bot className="w-4 h-4" />
                    </Link>
                    <button
                      onClick={() => {
                        setSelectedClientForUpload(client.id);
                        setShowUploadModal(true);
                      }}
                      className="p-1.5 rounded-lg text-slate-500 hover:text-teal-600 hover:bg-slate-100"
                      title="Upload Data"
                    >
                      <Upload className="w-4 h-4" />
                    </button>
                    <Link
                      href={`/clients/${client.id}/edit`}
                      className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100"
                      title="Edit Profile"
                    >
                      <Edit className="w-4 h-4" />
                    </Link>
                  </div>

                  <Link
                    href={`/clients/${client.id}`}
                    className="px-3 py-1.5 rounded-xl bg-teal-50 hover:bg-teal-100 text-teal-800 font-bold text-xs transition"
                  >
                    View Profile →
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {clientToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-sm w-full p-6 text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Delete Client Profile?</h3>
              <p className="text-xs text-slate-500 mt-1">
                Are you sure you want to delete <strong>{clientToDelete.name}</strong>? This will remove all their saved goals, reports, and AI chat records from local storage.
              </p>
            </div>
            <div className="flex items-center gap-2 pt-2">
              <button
                onClick={() => setClientToDelete(null)}
                className="flex-1 py-2 rounded-xl border border-slate-200 text-slate-700 font-semibold text-xs hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteConfirm}
                className="flex-1 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs transition"
              >
                Delete Client
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DATA UPLOAD MODAL */}
      <DataUploadModal
        isOpen={showUploadModal}
        defaultClientId={selectedClientForUpload}
        onClose={() => setShowUploadModal(false)}
        onSuccess={() => {
          refreshAll();
          setShowUploadModal(false);
        }}
      />
    </div>
  );
}
