"use client";

import React, { useState } from "react";
import {
  Upload,
  FileText,
  FileSpreadsheet,
  FileCode,
  CheckCircle2,
  AlertCircle,
  X,
  Loader2,
  User,
} from "lucide-react";
import { getClients, updateClient, saveClient } from "@/lib/storage/localStorage";
import { parseUploadedFile, parseJSONContent, parseCSVContent } from "@/lib/services/fileParser";
import { Client } from "@/lib/storage/types";

interface DataUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultClientId?: string;
  onSuccess?: () => void;
}

export function DataUploadModal({
  isOpen,
  onClose,
  defaultClientId,
  onSuccess,
}: DataUploadModalProps) {
  const [selectedClientId, setSelectedClientId] = useState<string>(defaultClientId || "");
  const [activeTab, setActiveTab] = useState<"file" | "json" | "csv">("file");
  const [isProcessing, setIsProcessing] = useState(false);
  const [resultMessage, setResultMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Raw text inputs for JSON / CSV paste tabs
  const [rawJSON, setRawJSON] = useState("");
  const [rawCSV, setRawCSV] = useState("");

  const clients = getClients();

  if (!isOpen) return null;

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    setResultMessage(null);

    try {
      const selectedClient = clients.find((c) => c.id === selectedClientId);
      const { meta, parsed } = await parseUploadedFile(file, selectedClientId, selectedClient?.fullName);

      // If client updates are present and a client is selected, apply them:
      if (selectedClientId && parsed.clientUpdates && Object.keys(parsed.clientUpdates).length > 0) {
        updateClient(selectedClientId, parsed.clientUpdates);
      } else if (!selectedClientId && parsed.clientUpdates && parsed.clientUpdates.fullName) {
        // Auto-create client from JSON if no client selected
        saveClient({
          fullName: parsed.clientUpdates.fullName,
          email: parsed.clientUpdates.email || `${parsed.clientUpdates.fullName.toLowerCase().replace(/\s+/g, ".")}@example.com`,
          age: parsed.clientUpdates.age || 30,
          city: parsed.clientUpdates.city || "Mumbai",
          employmentType: parsed.clientUpdates.employmentType || "salaried_permanent",
          monthlyIncome: parsed.clientUpdates.monthlyIncome || 0,
          monthlyExpenses: parsed.clientUpdates.monthlyExpenses || 0,
          existingSavings: parsed.clientUpdates.existingSavings || 0,
          emergencyFundAmount: parsed.clientUpdates.emergencyFundAmount || 0,
          existingInvestments: parsed.clientUpdates.existingInvestments || 0,
          outstandingLiabilities: parsed.clientUpdates.outstandingLiabilities || 0,
          monthlyEMI: parsed.clientUpdates.monthlyEMI || 0,
          numberOfDependants: parsed.clientUpdates.numberOfDependants || 0,
          investmentExperience: parsed.clientUpdates.investmentExperience || "basic_mutual_funds",
          riskTolerance: parsed.clientUpdates.riskTolerance || "MODERATE",
          riskCapacity: parsed.clientUpdates.riskCapacity || "MODERATE",
          investmentHorizonYears: parsed.clientUpdates.investmentHorizonYears || 10,
        });
      }

      setResultMessage({
        type: "success",
        text: `Uploaded "${file.name}" (${Math.round(file.size / 1024)} KB). ${parsed.summaryText}`,
      });

      if (onSuccess) onSuccess();
    } catch (err: any) {
      setResultMessage({
        type: "error",
        text: err?.message || "Failed to parse and store file.",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleApplyJSON = () => {
    if (!rawJSON.trim()) return;
    setIsProcessing(true);
    setResultMessage(null);

    try {
      const parsed = parseJSONContent(rawJSON);
      if (parsed.recordsCount === 0) {
        throw new Error("Could not detect financial fields in JSON.");
      }

      if (selectedClientId && parsed.clientUpdates) {
        updateClient(selectedClientId, parsed.clientUpdates);
      }

      setResultMessage({
        type: "success",
        text: `JSON processed! ${parsed.summaryText}`,
      });
      setRawJSON("");
      if (onSuccess) onSuccess();
    } catch (err: any) {
      setResultMessage({
        type: "error",
        text: err?.message || "JSON parsing error.",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleApplyCSV = () => {
    if (!rawCSV.trim()) return;
    setIsProcessing(true);
    setResultMessage(null);

    try {
      const parsed = parseCSVContent(rawCSV);
      if (parsed.recordsCount === 0) {
        throw new Error("Could not detect data rows in CSV.");
      }

      if (selectedClientId && parsed.clientUpdates) {
        updateClient(selectedClientId, parsed.clientUpdates);
      }

      setResultMessage({
        type: "success",
        text: `CSV processed! ${parsed.summaryText}`,
      });
      setRawCSV("");
      if (onSuccess) onSuccess();
    } catch (err: any) {
      setResultMessage({
        type: "error",
        text: err?.message || "CSV parsing error.",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/60">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-teal-50 text-teal-700 flex items-center justify-center font-bold">
              <Upload className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Upload Client Financial Data</h2>
              <p className="text-xs text-slate-500">Local-first ingestion: JSON, CSV, PDF, or Form</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-200/50 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5 overflow-y-auto flex-1 text-xs">
          {/* Client Target Selection */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1.5 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-slate-500" />
              Target Client Profile
            </label>
            <select
              value={selectedClientId}
              onChange={(e) => setSelectedClientId(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
            >
              <option value="">-- Create New Client from Ingested Data --</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.fullName} ({c.city} • {c.age}y • ₹{(c.monthlyIncome / 1000).toFixed(0)}k/mo)
                </option>
              ))}
            </select>
          </div>

          {/* Mode Tabs */}
          <div className="flex rounded-lg bg-slate-100 p-1">
            <button
              onClick={() => setActiveTab("file")}
              className={`flex-1 py-1.5 rounded-md font-semibold text-center transition flex items-center justify-center gap-1.5 ${
                activeTab === "file" ? "bg-white text-slate-900 shadow-xs" : "text-slate-500 hover:text-slate-900"
              }`}
            >
              <Upload className="w-3.5 h-3.5" />
              File Upload (PDF/CSV/JSON)
            </button>
            <button
              onClick={() => setActiveTab("json")}
              className={`flex-1 py-1.5 rounded-md font-semibold text-center transition flex items-center justify-center gap-1.5 ${
                activeTab === "json" ? "bg-white text-slate-900 shadow-xs" : "text-slate-500 hover:text-slate-900"
              }`}
            >
              <FileCode className="w-3.5 h-3.5" />
              Paste JSON
            </button>
            <button
              onClick={() => setActiveTab("csv")}
              className={`flex-1 py-1.5 rounded-md font-semibold text-center transition flex items-center justify-center gap-1.5 ${
                activeTab === "csv" ? "bg-white text-slate-900 shadow-xs" : "text-slate-500 hover:text-slate-900"
              }`}
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              Paste CSV
            </button>
          </div>

          {/* Tab 1: File Dropzone */}
          {activeTab === "file" && (
            <div className="border-2 border-dashed border-slate-300 hover:border-teal-500 rounded-xl p-8 text-center transition bg-slate-50/50 hover:bg-teal-50/20 relative cursor-pointer">
              <input
                type="file"
                accept=".json,.csv,.pdf,application/json,text/csv,application/pdf"
                onChange={handleFileUpload}
                disabled={isProcessing}
                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
              />
              <div className="flex flex-col items-center justify-center space-y-2">
                <div className="w-12 h-12 rounded-full bg-teal-100 text-teal-700 flex items-center justify-center mb-1">
                  <Upload className="w-6 h-6" />
                </div>
                <p className="font-semibold text-slate-800 text-sm">
                  Click or drag financial document to upload
                </p>
                <p className="text-slate-400 text-[11px]">
                  Supports PDF statements, CSV ledgers, and JSON client profiles
                </p>
                <div className="flex items-center gap-2 mt-2 pt-2 text-[10px] text-slate-500">
                  <span className="px-2 py-0.5 rounded-md bg-white border border-slate-200">PDF → IndexedDB</span>
                  <span className="px-2 py-0.5 rounded-md bg-white border border-slate-200">JSON → Auto-Map</span>
                  <span className="px-2 py-0.5 rounded-md bg-white border border-slate-200">CSV → Totals</span>
                </div>
              </div>
            </div>
          )}

          {/* Tab 2: Paste JSON */}
          {activeTab === "json" && (
            <div className="space-y-3">
              <textarea
                value={rawJSON}
                onChange={(e) => setRawJSON(e.target.value)}
                placeholder={`{\n  "fullName": "Pooja Hegde",\n  "monthlyIncome": 125000,\n  "monthlyExpenses": 45000,\n  "existingSavings": 400000,\n  "emergencyFund": 200000\n}`}
                rows={7}
                className="w-full font-mono text-xs p-3 bg-slate-900 text-slate-100 rounded-xl border border-slate-700 focus:outline-hidden focus:ring-2 focus:ring-teal-500"
              />
              <button
                onClick={handleApplyJSON}
                disabled={isProcessing || !rawJSON.trim()}
                className="w-full py-2 rounded-lg bg-teal-600 hover:bg-teal-700 text-white font-semibold transition disabled:opacity-50"
              >
                {isProcessing ? "Processing JSON..." : "Parse & Update Profile"}
              </button>
            </div>
          )}

          {/* Tab 3: Paste CSV */}
          {activeTab === "csv" && (
            <div className="space-y-3">
              <textarea
                value={rawCSV}
                onChange={(e) => setRawCSV(e.target.value)}
                placeholder={`Date,Description,Category,Amount\n2026-10-01,Salary Credit,Income,150000\n2026-10-05,Rent Payment,Expenses,-40000\n2026-10-10,HDFC MF SIP,Investments,25000`}
                rows={7}
                className="w-full font-mono text-xs p-3 bg-slate-900 text-slate-100 rounded-xl border border-slate-700 focus:outline-hidden focus:ring-2 focus:ring-teal-500"
              />
              <button
                onClick={handleApplyCSV}
                disabled={isProcessing || !rawCSV.trim()}
                className="w-full py-2 rounded-lg bg-teal-600 hover:bg-teal-700 text-white font-semibold transition disabled:opacity-50"
              >
                {isProcessing ? "Processing CSV..." : "Parse & Update Profile"}
              </button>
            </div>
          )}

          {/* Processing / Result Feedback */}
          {isProcessing && (
            <div className="flex items-center justify-center gap-2 p-3 bg-teal-50 text-teal-800 rounded-xl font-medium">
              <Loader2 className="w-4 h-4 animate-spin text-teal-600" />
              <span>Parsing and persisting financial records locally...</span>
            </div>
          )}

          {resultMessage && (
            <div
              className={`p-3 rounded-xl flex items-start gap-2.5 ${
                resultMessage.type === "success"
                  ? "bg-emerald-50 text-emerald-900 border border-emerald-200"
                  : "bg-rose-50 text-rose-900 border border-rose-200"
              }`}
            >
              {resultMessage.type === "success" ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              )}
              <p className="text-xs leading-relaxed">{resultMessage.text}</p>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 border-t border-slate-100 bg-slate-50/60 flex items-center justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-100 font-semibold text-xs transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

