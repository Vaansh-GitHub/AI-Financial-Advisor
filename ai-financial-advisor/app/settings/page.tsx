"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Settings,
  HardDrive,
  User,
  Bot,
  Download,
  Upload,
  RotateCcw,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  ShieldCheck,
  Save,
  Key,
  Info,
} from "lucide-react";
import { useStorageData } from "@/lib/storage/useStorage";
import {
  saveAdviserSettings,
  exportAllData,
  importAllData,
  resetToDemo,
  clearAllData,
} from "@/lib/storage/localStorage";
import { AdviserSettings } from "@/lib/storage/types";

export default function SettingsPage() {
  const { settings, storageUsage, clients, refreshAll } = useStorageData();

  const [activeTab, setActiveTab] = useState<"adviser" | "storage" | "ai">("adviser");

  // Adviser Form State
  const [adviserName, setAdviserName] = useState(settings?.adviserName || "Adviser");
  const [riaNumber, setRiaNumber] = useState(settings?.riaNumber || "INA000000000");
  const [firmName, setFirmName] = useState(settings?.firmName || "Wealth Advisory Practice");
  const [email, setEmail] = useState(settings?.email || "adviser@example.com");
  const [phone, setPhone] = useState(settings?.phone || "");
  const [officeCity, setOfficeCity] = useState(settings?.officeCity || "Mumbai");

  // AI Form State
  const [aiProvider, setAiProvider] = useState<AdviserSettings["aiProvider"]>(
    settings?.aiProvider || "LOCAL_RULE_BASED"
  );
  const [apiKey, setApiKey] = useState(settings?.apiKey || "");
  const [selectedModel, setSelectedModel] = useState(settings?.selectedModel || "gemini-1.5-pro");

  const [feedbackMessage, setFeedbackMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Sync state when settings load
  React.useEffect(() => {
    if (settings) {
      setAdviserName(settings.adviserName);
      setRiaNumber(settings.riaNumber);
      setFirmName(settings.firmName);
      setEmail(settings.email);
      setPhone(settings.phone);
      setOfficeCity(settings.officeCity);
      setAiProvider(settings.aiProvider);
      setApiKey(settings.apiKey || "");
      setSelectedModel(settings.selectedModel || "gemini-1.5-pro");
    }
  }, [settings]);

  const handleSaveAdviser = (e: React.FormEvent) => {
    e.preventDefault();
    saveAdviserSettings({
      adviserName,
      riaNumber,
      firmName,
      email,
      phone,
      officeCity,
    });
    refreshAll();
    setFeedbackMessage({ type: "success", text: "Adviser profile credentials saved successfully!" });
    setTimeout(() => setFeedbackMessage(null), 3000);
  };

  const handleSaveAI = (e: React.FormEvent) => {
    e.preventDefault();
    saveAdviserSettings({
      aiProvider,
      apiKey: apiKey.trim(),
      selectedModel,
    });
    refreshAll();
    setFeedbackMessage({ type: "success", text: "AI Co-pilot configuration updated in browser storage!" });
    setTimeout(() => setFeedbackMessage(null), 3000);
  };

  const handleDownloadBackup = () => {
    const data = exportAllData();
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `artha-adviser-backup-${new Date().toISOString().split("T")[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setFeedbackMessage({ type: "success", text: "Full local data backup downloaded!" });
    setTimeout(() => setFeedbackMessage(null), 3000);
  };

  const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      const res = importAllData(content);
      if (res.success) {
        refreshAll();
        setFeedbackMessage({ type: "success", text: res.message });
      } else {
        setFeedbackMessage({ type: "error", text: res.message });
      }
      setTimeout(() => setFeedbackMessage(null), 4000);
    };
    reader.readAsText(file);
  };

  const handleResetToDemo = () => {
    if (confirm("Restore the default 6 realistic personas, sample reports, and research docs?")) {
      resetToDemo();
      refreshAll();
      setFeedbackMessage({ type: "success", text: "Seeded demo data restored successfully!" });
      setTimeout(() => setFeedbackMessage(null), 3000);
    }
  };

  const handleClearAll = () => {
    if (confirm("⚠️ CAUTION: Delete ALL clients, goals, reports, and chats permanently?")) {
      clearAllData();
      refreshAll();
      setFeedbackMessage({ type: "success", text: "All data cleared from local browser storage." });
      setTimeout(() => setFeedbackMessage(null), 3000);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">System & Adviser Settings</h1>
        <p className="text-xs text-slate-500 mt-1">
          Manage your RIA profile, local storage health, data backups, and AI Co-pilot configuration.
        </p>
      </div>

      {feedbackMessage && (
        <div
          className={`p-3 rounded-xl flex items-center gap-2 text-xs animate-in fade-in ${
            feedbackMessage.type === "success"
              ? "bg-emerald-50 text-emerald-900 border border-emerald-200"
              : "bg-rose-50 text-rose-900 border border-rose-200"
          }`}
        >
          {feedbackMessage.type === "success" ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          ) : (
            <AlertTriangle className="w-4 h-4 text-rose-600" />
          )}
          <span>{feedbackMessage.text}</span>
        </div>
      )}

      {/* Tabs */}
      <div className="flex rounded-xl bg-slate-100 p-1 text-xs">
        <button
          onClick={() => setActiveTab("adviser")}
          className={`flex-1 py-2 rounded-lg font-bold transition flex items-center justify-center gap-1.5 ${
            activeTab === "adviser" ? "bg-white text-slate-900 shadow-xs" : "text-slate-500 hover:text-slate-900"
          }`}
        >
          <User className="w-4 h-4" />
          <span>Adviser Profile & RIA</span>
        </button>
        <button
          onClick={() => setActiveTab("storage")}
          className={`flex-1 py-2 rounded-lg font-bold transition flex items-center justify-center gap-1.5 ${
            activeTab === "storage" ? "bg-white text-slate-900 shadow-xs" : "text-slate-500 hover:text-slate-900"
          }`}
        >
          <HardDrive className="w-4 h-4" />
          <span>Local Storage & Backup</span>
        </button>
        <button
          onClick={() => setActiveTab("ai")}
          className={`flex-1 py-2 rounded-lg font-bold transition flex items-center justify-center gap-1.5 ${
            activeTab === "ai" ? "bg-white text-slate-900 shadow-xs" : "text-slate-500 hover:text-slate-900"
          }`}
        >
          <Bot className="w-4 h-4" />
          <span>AI Co-Pilot Integration</span>
        </button>
      </div>

      {/* TAB 1: ADVISER PROFILE */}
      {activeTab === "adviser" && (
        <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Registered Investment Adviser Credentials</h2>
              <p className="text-xs text-slate-500">Appears automatically on all generated client reports and formal plans.</p>
            </div>
            <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-teal-50 text-teal-800 border border-teal-200 flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-teal-600" />
              <span>SEBI Licensed</span>
            </span>
          </div>

          <form onSubmit={handleSaveAdviser} className="space-y-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Adviser Full Name</label>
                <input
                  type="text"
                  value={adviserName}
                  onChange={(e) => setAdviserName(e.target.value)}
                  required
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">SEBI RIA Registration Number</label>
                <input
                  type="text"
                  value={riaNumber}
                  onChange={(e) => setRiaNumber(e.target.value)}
                  required
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-teal-500 font-mono"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Wealth Advisory Entity / Firm Name</label>
                <input
                  type="text"
                  value={firmName}
                  onChange={(e) => setFirmName(e.target.value)}
                  required
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Official Email Address</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Contact Telephone</label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Office City</label>
                <input
                  type="text"
                  value={officeCity}
                  onChange={(e) => setOfficeCity(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-teal-500"
                />
              </div>
            </div>

            {/* Capacity Meter */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2 mt-4">
              <div className="flex items-center justify-between font-bold text-slate-800">
                <span>Single-Adviser Capacity Scaling Gauge</span>
                <span className="text-teal-700">{clients.length} / 1,000 Clients</span>
              </div>
              <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-teal-500 h-full rounded-full transition-all"
                  style={{ width: `${Math.max(2, (clients.length / 1000) * 100)}%` }}
                />
              </div>
              <p className="text-[10px] text-slate-400">
                Zeckathon PS 04 Architecture Target: Scale safely from 1 to 1,000 clients using deterministic guardrails without fiduciary compromise.
              </p>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs shadow-xs transition flex items-center gap-1.5"
              >
                <Save className="w-4 h-4" />
                <span>Save Profile Credentials</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* TAB 2: LOCAL STORAGE MANAGEMENT */}
      {activeTab === "storage" && (
        <div className="space-y-6">
          {/* Storage Meter Card */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h2 className="text-sm font-bold text-slate-900">Browser Storage Meter</h2>
                <p className="text-xs text-slate-500">
                  Application state is saved 100% locally in your browser LocalStorage and IndexedDB.
                </p>
              </div>
              <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                {storageUsage?.status || "HEALTHY"}
              </span>
            </div>

            <div>
              <div className="flex items-center justify-between text-xs font-semibold mb-1 text-slate-700">
                <span>LocalStorage Used: {storageUsage?.kilobytesUsed || 0} KB</span>
                <span className="text-teal-700 font-bold">{storageUsage?.quotaPercent || 0}% of 5 MB Quota</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                <div
                  className="bg-teal-500 h-full rounded-full transition-all"
                  style={{ width: `${Math.max(3, storageUsage?.quotaPercent || 2)}%` }}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs pt-2">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/60">
                <p className="text-slate-400 text-[10px]">Client Records</p>
                <p className="text-base font-bold text-slate-900">{storageUsage?.clientCount || 0}</p>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/60">
                <p className="text-slate-400 text-[10px]">Goals Saved</p>
                <p className="text-base font-bold text-slate-900">{storageUsage?.goalCount || 0}</p>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/60">
                <p className="text-slate-400 text-[10px]">AI Chat Threads</p>
                <p className="text-base font-bold text-slate-900">{storageUsage?.chatCount || 0}</p>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/60">
                <p className="text-slate-400 text-[10px]">Generated Plans</p>
                <p className="text-base font-bold text-slate-900">{storageUsage?.reportCount || 0}</p>
              </div>
            </div>
          </div>

          {/* Backup, Import, and Reset Actions */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-slate-900">Backup, Restore & Reset Controls</h3>
            <p className="text-xs text-slate-500">
              Download your complete client book, chat history, and generated reports as a single JSON file.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              {/* Download Backup */}
              <button
                onClick={handleDownloadBackup}
                className="p-4 rounded-xl border border-slate-200 hover:border-teal-500/60 hover:bg-teal-50/20 text-left transition space-y-1"
              >
                <div className="flex items-center gap-2 text-teal-700 font-bold">
                  <Download className="w-4 h-4" />
                  <span>Download Backup JSON</span>
                </div>
                <p className="text-slate-500 text-[11px]">
                  Exports all clients, goals, reports, and activity logs.
                </p>
              </button>

              {/* Restore Backup */}
              <label className="p-4 rounded-xl border border-slate-200 hover:border-teal-500/60 hover:bg-teal-50/20 text-left transition space-y-1 cursor-pointer block">
                <div className="flex items-center gap-2 text-slate-800 font-bold">
                  <Upload className="w-4 h-4 text-slate-500" />
                  <span>Restore from JSON File</span>
                </div>
                <p className="text-slate-500 text-[11px]">
                  Click to select a backup JSON file to import.
                </p>
                <input
                  type="file"
                  accept=".json,application/json"
                  onChange={handleImportBackup}
                  className="hidden"
                />
              </label>

              {/* Reset to Demo Data */}
              <button
                onClick={handleResetToDemo}
                className="p-4 rounded-xl border border-slate-200 hover:bg-slate-50 text-left transition space-y-1"
              >
                <div className="flex items-center gap-2 text-slate-800 font-bold">
                  <RotateCcw className="w-4 h-4 text-slate-500" />
                  <span>Reset to 6 Demo Personas</span>
                </div>
                <p className="text-slate-500 text-[11px]">
                  Restores Aryan Verma, Rohan & Sneha, Rajesh, Dr. Ananya, Gen. Nambiar, Kabir Mehra.
                </p>
              </button>

              {/* Clear All */}
              <button
                onClick={handleClearAll}
                className="p-4 rounded-xl border border-rose-200 hover:bg-rose-50 text-left transition space-y-1"
              >
                <div className="flex items-center gap-2 text-rose-600 font-bold">
                  <Trash2 className="w-4 h-4" />
                  <span>Clear All Local Data</span>
                </div>
                <p className="text-rose-500 text-[11px]">
                  Wipes all local browser records and starts fresh.
                </p>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: AI ASSISTANT INTEGRATION */}
      {activeTab === "ai" && (
        <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div>
              <h2 className="text-sm font-bold text-slate-900">AI Co-Pilot Model Configuration</h2>
              <p className="text-xs text-slate-500">
                Configure your AI advisory co-pilot engine. By default, deterministic local financial mathematics are used.
              </p>
            </div>
            <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-teal-50 text-teal-800 border border-teal-200">
              {aiProvider === "LOCAL_RULE_BASED" ? "Local Deterministic Engine" : "External LLM Mode"}
            </span>
          </div>

          <form onSubmit={handleSaveAI} className="space-y-4 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Advisory Intelligence Provider</label>
              <select
                value={aiProvider}
                onChange={(e) => setAiProvider(e.target.value as any)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-teal-500 font-semibold"
              >
                <option value="LOCAL_RULE_BASED">
                  Local Deterministic Engine (Default • SEBI Suitability Rules • No API Key Needed)
                </option>
                <option value="GOOGLE_GEMINI">Google Gemini API (Live Generative Advisory Synthesis)</option>
                <option value="OPENAI">OpenAI GPT-4o (Phase 2 LLM Integration)</option>
                <option value="ANTHROPIC">Anthropic Claude 3.5 (Phase 2 LLM Integration)</option>
              </select>
            </div>

            {aiProvider !== "LOCAL_RULE_BASED" && (
              <div className="space-y-4 p-4 rounded-xl bg-slate-50 border border-slate-200/80 animate-in fade-in">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
                    <Key className="w-3.5 h-3.5 text-slate-500" />
                    API Key for {aiProvider.replace(/_/g, " ")}
                  </label>
                  <input
                    type="password"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder="Enter your API Key..."
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono focus:ring-2 focus:ring-teal-500"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">
                    Your key is stored strictly in your browser LocalStorage and never sent to our servers.
                  </p>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Target Model</label>
                  <select
                    value={selectedModel}
                    onChange={(e) => setSelectedModel(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs"
                  >
                    <option value="gemini-1.5-pro">gemini-1.5-pro</option>
                    <option value="gemini-1.5-flash">gemini-1.5-flash</option>
                    <option value="gpt-4o">gpt-4o</option>
                    <option value="claude-3-5-sonnet">claude-3-5-sonnet</option>
                  </select>
                </div>
              </div>
            )}

            <div className="p-3 bg-teal-50/60 rounded-xl border border-teal-200/60 text-[11px] text-teal-900 space-y-1">
              <div className="flex items-center gap-1.5 font-bold">
                <Info className="w-3.5 h-3.5 text-teal-600" />
                <span>Deterministic Advisory Guarantee:</span>
              </div>
              <p className="text-teal-700">
                In strict adherence to the problem statement specifications, all cashflow, emergency runway, SIP, and suitability evaluations remain 100% deterministic and testable.
              </p>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs shadow-xs transition flex items-center gap-1.5"
              >
                <Save className="w-4 h-4" />
                <span>Save AI Configuration</span>
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

