"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  Bot,
  User,
  Send,
  Sparkles,
  AlertTriangle,
  ShieldCheck,
  CheckCircle2,
  Trash2,
  Plus,
  RefreshCw,
  Info,
  ChevronRight,
  TrendingUp,
  Target,
  HardDrive,
  Copy,
  Check,
  ExternalLink,
  Edit2,
  Search,
  BookOpen,
  Square,
  RotateCcw,
  ArrowUpRight,
} from "lucide-react";
import { useStorageData } from "@/lib/storage/useStorage";
import {
  saveConversation,
  addMessageToConversation,
  deleteConversation,
  updateConversationTitle,
  getGoals,
} from "@/lib/storage/localStorage";
import { generateAdvisoryResponse } from "@/lib/services/aiService";
import { formatINR } from "@/lib/utils";
import { Client, ChatConversation, ChatMessage } from "@/lib/storage/types";

export default function AssistantPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { clients, chats, settings, refreshAll } = useStorageData();

  const queryClientId = searchParams?.get("clientId") || "";
  const queryChatId = searchParams?.get("chatId") || "";
  const queryQ = searchParams?.get("q") || "";

  // Active Client
  const [selectedClientId, setSelectedClientId] = useState<string>("");
  // Active Conversation ID
  const [selectedChatId, setSelectedChatId] = useState<string>("");
  const [inputMessage, setInputMessage] = useState("");

  useEffect(() => {
    if (queryQ) {
      setInputMessage(queryQ);
    }
  }, [queryQ]);
  const [isResponding, setIsResponding] = useState(false);
  const [copiedMsgId, setCopiedMsgId] = useState<string | null>(null);
  const [searchThreadQuery, setSearchThreadQuery] = useState("");
  const [editingChatId, setEditingChatId] = useState<string | null>(null);
  const [editingChatTitle, setEditingChatTitle] = useState("");
  const [lastPrompt, setLastPrompt] = useState<string>("");

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Initialize client from query param or fallback to first client
  useEffect(() => {
    if (clients.length > 0) {
      if (queryClientId && clients.some((c) => c.id === queryClientId)) {
        setSelectedClientId(queryClientId);
      } else if (!selectedClientId) {
        setSelectedClientId(clients[0].id);
      }
    }
  }, [clients, queryClientId, selectedClientId]);

  // Selected client record
  const selectedClient = clients.find((c) => c.id === selectedClientId) || null;
  const clientGoals = selectedClientId ? getGoals(selectedClientId) : [];

  // Filter conversations for this selected client
  const clientConversations = useMemo(() => {
    return chats.filter((c) => c.clientId === selectedClientId);
  }, [chats, selectedClientId]);

  // Filter threads by search query
  const filteredConversations = useMemo(() => {
    if (!searchThreadQuery.trim()) return clientConversations;
    return clientConversations.filter((c) =>
      c.title.toLowerCase().includes(searchThreadQuery.toLowerCase())
    );
  }, [clientConversations, searchThreadQuery]);

  // Initialize or synchronize active conversation
  useEffect(() => {
    if (queryChatId && clientConversations.some((c) => c.id === queryChatId)) {
      setSelectedChatId(queryChatId);
    } else if (clientConversations.length > 0) {
      if (!selectedChatId || !clientConversations.some((c) => c.id === selectedChatId)) {
        setSelectedChatId(clientConversations[0].id);
      }
    } else {
      setSelectedChatId("");
    }
  }, [selectedClientId, clientConversations, queryChatId, selectedChatId]);

  const activeConversation = clientConversations.find((c) => c.id === selectedChatId) || null;

  // Auto scroll to bottom when messages update
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeConversation?.messages, isResponding]);

  // Financial Diagnostics of selected client
  const monthlyBurn = selectedClient ? selectedClient.monthlyExpenses + selectedClient.monthlyEMI : 0;
  const netSurplus = selectedClient ? selectedClient.monthlyIncome - monthlyBurn : 0;
  const emergencyMonths =
    selectedClient && monthlyBurn > 0
      ? (selectedClient.emergencyFundAmount / monthlyBurn).toFixed(1)
      : "0.0";
  const emiRatio =
    selectedClient && selectedClient.monthlyIncome > 0
      ? Math.round((selectedClient.monthlyEMI / selectedClient.monthlyIncome) * 100)
      : 0;

  // Handle Starting a New Conversation for this client
  const handleStartNewChat = () => {
    if (!selectedClient) return;
    const newChat = saveConversation({
      clientId: selectedClient.id,
      clientName: selectedClient.fullName,
      title: `Advisory Consultation (${new Date().toLocaleDateString("en-IN", {
        month: "short",
        day: "numeric",
      })})`,
      messages: [
        {
          id: `msg_welcome_${Date.now()}`,
          sender: "assistant",
          text: `Welcome! I am your **Advisory Co-pilot** for **${selectedClient.fullName}** (${selectedClient.age}y, ${selectedClient.city}). 

I operate on verified financial records and SEBI RIA fiduciary guidelines:
- **Monthly Income**: ${formatINR(selectedClient.monthlyIncome)} · **Surplus**: ${formatINR(netSurplus)}/mo
- **Emergency Reserve**: ${formatINR(selectedClient.emergencyFundAmount)} (${emergencyMonths} months burn)
- **Risk Category**: ${selectedClient.riskProfile?.combinedCategory || "BALANCED"} (${selectedClient.riskProfile?.hasConflict ? "Conflict Flagged" : "Harmonized"})
- **Active Goals**: ${clientGoals.length} recorded

Ask me any question about ${selectedClient.fullName}'s financial situation, goal funding requirements, or regulatory suitability.`,
          timestamp: new Date().toISOString(),
          metadata: {
            isPlaceholder: false,
            modelUsed: "@cf/meta/llama-3.3-70b-instruct",
            disclosureNote:
              "Client data is processed privately via server API & configured AI model. Deterministic math enforces SEBI RIA guardrails.",
          },
        },
      ],
    });

    refreshAll();
    setSelectedChatId(newChat.id);
  };

  // Send Message Handler
  const handleSendMessage = async (textToSend?: string) => {
    const text = textToSend || inputMessage;
    if (!text.trim() || !selectedClient || isResponding) return;

    let targetChatId = selectedChatId;

    // If no conversation exists yet, create one first
    if (!targetChatId || !activeConversation) {
      const created = saveConversation({
        clientId: selectedClient.id,
        clientName: selectedClient.fullName,
        title: text.substring(0, 36) + "...",
        messages: [],
      });
      targetChatId = created.id;
      setSelectedChatId(created.id);
    }

    // 1. Add user message locally before dispatching API request
    addMessageToConversation(targetChatId, {
      sender: "user",
      text: text.trim(),
    });

    setLastPrompt(text.trim());
    setInputMessage("");
    setIsResponding(true);
    refreshAll();

    // Setup abort controller
    abortControllerRef.current = new AbortController();

    try {
      // 2. Generate response via AI Service (Calls server route /api/ai/chat)
      const result = await generateAdvisoryResponse(text.trim(), {
        client: selectedClient,
        goals: clientGoals,
        history: activeConversation?.messages || [],
        settings: settings || undefined,
      });

      // 3. Add assistant response to storage
      addMessageToConversation(targetChatId, {
        sender: "assistant",
        text: result.text,
        metadata: {
          intent: result.intent,
          metrics: result.metrics,
          citations: result.citations,
          retrievalDebug: result.retrievalDebug,
          recommendations: result.recommendations,
          isPlaceholder: result.isPlaceholder,
          disclosureNote: result.disclosureNote,
        },
      });

      refreshAll();
    } catch (err: any) {
      console.error("AI Assistant error:", err);
      addMessageToConversation(targetChatId, {
        sender: "assistant",
        text: `⚠️ **Advisory Co-pilot Notice**: Unable to reach live model endpoint (${err?.message || "Request interrupted"}). Please check network connectivity or retry below.`,
      });
      refreshAll();
    } finally {
      setIsResponding(false);
      abortControllerRef.current = null;
    }
  };

  const handleStopGeneration = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setIsResponding(false);
  };

  const handleRetryLast = () => {
    if (lastPrompt) {
      handleSendMessage(lastPrompt);
    }
  };

  const handleDeleteConversation = (id: string) => {
    if (confirm("Delete this saved conversation thread?")) {
      deleteConversation(id);
      refreshAll();
    }
  };

  const handleSaveRename = (id: string) => {
    if (editingChatTitle.trim()) {
      updateConversationTitle(id, editingChatTitle);
      setEditingChatId(null);
      refreshAll();
    }
  };

  const handleCopyMessage = (msgId: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedMsgId(msgId);
    setTimeout(() => setCopiedMsgId(null), 2000);
  };

  // Dynamic Suggested Prompts computed from actual client data
  const suggestedPrompts = useMemo(() => {
    if (!selectedClient) return [];
    const list: Array<{ label: string; prompt: string }> = [];

    // Emergency fund adequacy
    if (Number(emergencyMonths) < 6) {
      list.push({
        label: `Audit emergency buffer shortfall (${emergencyMonths} mo)`,
        prompt: `Audit emergency fund adequacy for ${selectedClient.fullName}: current reserves cover only ${emergencyMonths} months of burn. What is the recommended top-up plan?`,
      });
    } else {
      list.push({
        label: "Evaluate monthly surplus deployment",
        prompt: `Given ${selectedClient.fullName}'s healthy ${emergencyMonths}-month emergency buffer, how should the disposable surplus of ${formatINR(netSurplus)}/month be allocated?`,
      });
    }

    // Risk capacity vs tolerance conflict
    if (selectedClient.riskProfile?.hasConflict) {
      list.push({
        label: "Check risk tolerance vs capacity conflict",
        prompt: `Evaluate client risk suitability for ${selectedClient.fullName}: Objective capacity (${selectedClient.riskProfile.capacityLevel}) diverges from subjective tolerance (${selectedClient.riskProfile.toleranceLevel}). Explain the SEBI fiduciary constraint.`,
      });
    } else {
      list.push({
        label: `Review ${selectedClient.riskProfile?.combinedCategory || "portfolio"} asset allocation`,
        prompt: `Review the recommended asset allocation across Equity, Debt, and Cash for ${selectedClient.fullName}'s ${selectedClient.riskProfile?.combinedCategory || "Balanced"} profile.`,
      });
    }

    // Financial goals
    if (clientGoals.length > 0) {
      const g = clientGoals[0];
      list.push({
        label: `Calculate required SIP for "${g.title}"`,
        prompt: `Calculate the inflation-adjusted future corpus and required monthly SIP for ${selectedClient.fullName}'s goal "${g.title}" (${g.targetHorizonYears}y horizon).`,
      });
    } else {
      list.push({
        label: "Identify missing planning information",
        prompt: `Identify what missing information and goal inputs are required before finalizing a statutory financial plan for ${selectedClient.fullName}.`,
      });
    }

    // Debt / DTI
    if (selectedClient.monthlyEMI > 0) {
      list.push({
        label: `Audit Debt-to-Income (${emiRatio}%)`,
        prompt: `Audit ${selectedClient.fullName}'s Debt-to-Income ratio (${emiRatio}%) against the 40% prudential ceiling and evaluate debt sustainability.`,
      });
    }

    // Mutual Fund AMFI live queries
    list.push({
      label: "Show direct-growth equity mutual funds (AMFI)",
      prompt: `Show direct-growth equity mutual funds from the official live AMFI feed for ${selectedClient.fullName}.`,
    });
    list.push({
      label: "Find funds in small-cap category (AMFI)",
      prompt: `Find funds in the small-cap category from the live AMFI master feed and review latest NAVs.`,
    });
    list.push({
      label: "Search mutual funds for this client's profile",
      prompt: `Search mutual funds for ${selectedClient.fullName}'s profile (${selectedClient.riskProfile?.combinedCategory || "BALANCED"} category) from the live AMFI feed.`,
    });

    // Executive summary
    list.push({
      label: "Generate executive financial summary",
      prompt: `Generate a structured fiduciary summary for ${selectedClient.fullName} covering cashflow, emergency buffer, net worth, and risk suitability findings.`,
    });

    return list.slice(0, 6);
  }, [selectedClient, clientGoals, emergencyMonths, emiRatio, netSurplus]);

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-teal-50 dark:bg-teal-950/40 text-teal-800 dark:text-teal-300 text-[11px] font-bold border border-teal-200 dark:border-teal-800 mb-1">
            <Sparkles className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
            <span>Fiduciary Advisory Co-Pilot</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">AI Investment Adviser Co-Pilot</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Fiduciary consultative engine with deterministic financial math, local conversation persistence, and RAG document grounding.
          </p>
        </div>

        {/* Client Selector Dropdown */}
        {clients.length > 0 && (
          <div className="flex items-center gap-2">
            <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 shrink-0">Consulting on:</label>
            <select
              value={selectedClientId}
              onChange={(e) => {
                setSelectedClientId(e.target.value);
                router.push(`/assistant?clientId=${e.target.value}`);
              }}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-teal-500 shadow-xs"
            >
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.fullName} ({c.city} • {c.age}y • ₹{(c.monthlyIncome / 1000).toFixed(0)}k/mo)
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {clients.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-12 border border-slate-200/80 dark:border-slate-800 shadow-xs text-center max-w-xl mx-auto my-12 space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-teal-50 dark:bg-teal-950/40 text-teal-600 dark:text-teal-400 mx-auto flex items-center justify-center">
            <Bot className="w-8 h-8" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">No Client Profiles Available</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed">
              The AI Co-pilot requires client financial data (income, expenses, emergency reserves, and goals) to provide fiduciary suitability evaluations and math-driven recommendations.
            </p>
          </div>
          <div className="flex items-center justify-center gap-3 pt-2">
            <Link
              href="/clients/new"
              className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-semibold text-xs shadow-xs transition"
            >
              + Add First Client
            </Link>
            <Link
              href="/clients"
              className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 text-slate-700 dark:text-slate-300 font-semibold text-xs transition"
            >
              View Client Directory
            </Link>
          </div>
        </div>
      ) : (
        /* MAIN CO-PILOT WORKSPACE GRID */
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
          {/* LEFT COLUMN: CLIENT CONTEXT DRAWER & CONVERSATION THREADS (1 Col) */}
          <div className="space-y-4">
            {/* Client Financial Snapshot Card */}
            {selectedClient && (
              <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
                    Client Context
                  </span>
                  <Link
                    href={`/clients/${selectedClient.id}`}
                    className="text-[11px] text-teal-600 dark:text-teal-400 font-bold hover:underline flex items-center gap-0.5"
                  >
                    <span>Profile</span>
                    <ExternalLink className="w-3 h-3" />
                  </Link>
                </div>

                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white text-sm">{selectedClient.fullName}</h3>
                  <p className="text-[11px] text-slate-400">
                    Age {selectedClient.age} • {selectedClient.city} • {selectedClient.employmentType.replace(/_/g, " ")}
                  </p>
                </div>

                {/* Conflict Alert if any */}
                {selectedClient.riskProfile?.hasConflict && (
                  <div className="p-2 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200/70 dark:border-amber-800/70 text-[10px] text-amber-900 dark:text-amber-300 flex items-start gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                    <span>
                      <strong>Conflict:</strong> Capacity ({selectedClient.riskProfile.capacityLevel}) strictly constrains tolerance.
                    </span>
                  </div>
                )}

                {/* Key Metric Snapshot */}
                <div className="space-y-2 text-xs pt-1">
                  <div className="flex items-center justify-between text-slate-600 dark:text-slate-400">
                    <span>Monthly Income</span>
                    <strong className="text-slate-900 dark:text-slate-100">{formatINR(selectedClient.monthlyIncome)}</strong>
                  </div>
                  <div className="flex items-center justify-between text-slate-600 dark:text-slate-400">
                    <span>Monthly Surplus</span>
                    <strong className="text-emerald-600 dark:text-emerald-400">+{formatINR(netSurplus)}</strong>
                  </div>
                  <div className="flex items-center justify-between text-slate-600 dark:text-slate-400">
                    <span>Emergency Fund</span>
                    <span
                      className={`font-bold px-1.5 py-0.2 rounded text-[10px] ${
                        Number(emergencyMonths) >= 6
                          ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300"
                          : "bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300"
                      }`}
                    >
                      {emergencyMonths} Months
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-slate-600 dark:text-slate-400">
                    <span>Debt-to-Income</span>
                    <strong className="text-slate-900 dark:text-slate-100">{emiRatio}%</strong>
                  </div>
                  <div className="flex items-center justify-between text-slate-600 dark:text-slate-400">
                    <span>Risk Category</span>
                    <strong className="text-teal-700 dark:text-teal-400 font-bold">
                      {selectedClient.riskProfile?.combinedCategory || "BALANCED"}
                    </strong>
                  </div>
                </div>
              </div>
            )}

            {/* Saved Conversations List with Search & Rename */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
                  Threads ({clientConversations.length})
                </span>
                <button
                  onClick={handleStartNewChat}
                  className="text-[11px] text-teal-600 dark:text-teal-400 font-bold hover:underline flex items-center gap-1"
                  title="Start a new chat session for this client"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>New</span>
                </button>
              </div>

              {/* Thread Search Box */}
              {clientConversations.length > 2 && (
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                  <input
                    type="text"
                    value={searchThreadQuery}
                    onChange={(e) => setSearchThreadQuery(e.target.value)}
                    placeholder="Search conversations..."
                    className="w-full bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-lg pl-8 pr-2.5 py-1.5 text-[11px] text-slate-800 dark:text-slate-200"
                  />
                </div>
              )}

              {/* Threads List */}
              <div className="space-y-1.5 max-h-64 overflow-y-auto text-xs">
                {filteredConversations.map((c) => (
                  <div
                    key={c.id}
                    onClick={() => setSelectedChatId(c.id)}
                    className={`p-2.5 rounded-xl cursor-pointer transition flex items-center justify-between group ${
                      selectedChatId === c.id
                        ? "bg-teal-50 dark:bg-teal-950/50 text-teal-900 dark:text-teal-200 font-bold border border-teal-200 dark:border-teal-800"
                        : "hover:bg-slate-50 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-300"
                    }`}
                  >
                    <div className="min-w-0 pr-2 flex-1">
                      {editingChatId === c.id ? (
                        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="text"
                            value={editingChatTitle}
                            onChange={(e) => setEditingChatTitle(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") handleSaveRename(c.id);
                              if (e.key === "Escape") setEditingChatId(null);
                            }}
                            autoFocus
                            className="bg-white dark:bg-slate-900 border border-teal-500 rounded px-1.5 py-0.5 text-xs text-slate-800 dark:text-slate-100 w-full"
                          />
                          <button
                            onClick={() => handleSaveRename(c.id)}
                            className="text-teal-600 hover:text-teal-700 p-0.5"
                          >
                            <Check className="w-3 h-3" />
                          </button>
                        </div>
                      ) : (
                        <>
                          <p className="truncate text-xs">{c.title}</p>
                          <p className="text-[10px] text-slate-400 font-normal">
                            {c.messages.length} msgs • {new Date(c.updatedAt).toLocaleDateString("en-IN", { month: "short", day: "numeric" })}
                          </p>
                        </>
                      )}
                    </div>

                    <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingChatId(c.id);
                          setEditingChatTitle(c.title);
                        }}
                        className="p-1 text-slate-400 hover:text-teal-600 transition"
                        title="Rename thread"
                      >
                        <Edit2 className="w-3 h-3" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteConversation(c.id);
                        }}
                        className="p-1 text-slate-400 hover:text-rose-600 transition"
                        title="Delete thread"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ))}

                {filteredConversations.length === 0 && (
                  <div className="p-3 text-center text-slate-400 text-xs">
                    {searchThreadQuery ? "No matching conversations." : "No saved conversations yet."}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: ACTIVE CHAT THREAD & INTERACTIVE WORKSPACE (3 Cols) */}
          <div className="lg:col-span-3 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col h-[740px] overflow-hidden">
            {/* Chat Header */}
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/60 dark:bg-slate-800/40">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#0B192C] to-[#1E3E62] text-white flex items-center justify-center font-bold shadow-xs">
                  <Bot className="w-5 h-5 text-teal-400" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                    {activeConversation ? activeConversation.title : `Consultation: ${selectedClient?.fullName}`}
                  </h2>
                  <p className="text-[11px] text-slate-400 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span>Cloudflare AI / Llama-3.3-70B • SEBI Fiduciary Mathematical Guardrails</span>
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleStartNewChat}
                  className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 font-semibold text-xs text-slate-700 dark:text-slate-300 transition flex items-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5 text-slate-500" />
                  <span>New Session</span>
                </button>
              </div>
            </div>

            {/* Chat Messages Body */}
            <div className="flex-1 p-6 overflow-y-auto space-y-4 text-xs">
              {activeConversation && activeConversation.messages.length > 0 ? (
                activeConversation.messages.map((msg) => {
                  const isAssistant = msg.sender === "assistant";

                  return (
                    <div
                      key={msg.id}
                      className={`flex items-start gap-3 ${isAssistant ? "" : "flex-row-reverse"}`}
                    >
                      {/* Avatar */}
                      <div
                        className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 font-bold text-xs ${
                          isAssistant
                            ? "bg-[#0B192C] text-teal-400 shadow-xs"
                            : "bg-teal-600 text-white shadow-xs"
                        }`}
                      >
                        {isAssistant ? <Bot className="w-4 h-4" /> : <User className="w-4 h-4" />}
                      </div>

                      {/* Message Bubble */}
                      <div
                        className={`max-w-[85%] rounded-2xl p-4 space-y-2 leading-relaxed ${
                          isAssistant
                            ? "bg-slate-50 dark:bg-slate-800/70 border border-slate-200/80 dark:border-slate-700/80 text-slate-800 dark:text-slate-100"
                            : "bg-teal-600 text-white"
                        }`}
                      >
                        {/* Message Content */}
                        <div className="whitespace-pre-line text-xs font-normal leading-relaxed">
                          {msg.text}
                        </div>

                        {/* Verified Grounding Citations & Retrieval Provenance Inspector */}
                        {isAssistant && msg.metadata?.citations && msg.metadata.citations.length > 0 && (
                          <div className="mt-3 pt-2.5 border-t border-slate-200/60 dark:border-slate-700/60 space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] font-bold uppercase tracking-wider text-teal-700 dark:text-teal-400 flex items-center gap-1">
                                <BookOpen className="w-3 h-3" />
                                <span>Verified Citations ({msg.metadata.citations.length}):</span>
                              </span>
                              <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 font-semibold border border-emerald-200 dark:border-emerald-800 flex items-center gap-1">
                                <ShieldCheck className="w-2.5 h-2.5" />
                                <span>RAG Validated</span>
                              </span>
                            </div>

                            <div className="space-y-1.5">
                              {msg.metadata.citations.map((c: any, idx: number) => (
                                <div
                                  key={idx}
                                  className="p-2.5 rounded-xl bg-teal-50/50 dark:bg-teal-950/20 border border-teal-200/70 dark:border-teal-800/60 text-[11px] space-y-1"
                                >
                                  <div className="flex items-start justify-between gap-2 font-semibold text-teal-950 dark:text-teal-200">
                                    <span className="flex items-center gap-1">
                                      <span>📄</span>
                                      <span>{c.docTitle}</span>
                                    </span>
                                    <div className="flex items-center gap-1 shrink-0">
                                      {c.cosineScore && (
                                        <span className="text-[9px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-1.5 py-0.2 rounded font-mono">
                                          cos: {c.cosineScore}
                                        </span>
                                      )}
                                      <span className="text-[9px] bg-teal-100 dark:bg-teal-900/60 text-teal-800 dark:text-teal-200 px-1.5 py-0.2 rounded">
                                        Page {c.pageNumber}
                                      </span>
                                    </div>
                                  </div>

                                  <p className="text-[10px] text-slate-600 dark:text-slate-400 italic leading-relaxed">
                                    &ldquo;{c.snippet}&rdquo;
                                  </p>

                                  {(c.sourceUrl || c.publicationDate || c.chunkId) && (
                                    <div className="flex items-center justify-between text-[9px] text-slate-400 pt-1 border-t border-teal-100 dark:border-teal-900/40">
                                      <span className="font-mono text-slate-400">ID: {c.chunkId || `chunk_${idx}`}</span>
                                      {c.sourceUrl && (
                                        <a
                                          href={c.sourceUrl}
                                          target="_blank"
                                          rel="noreferrer"
                                          className="text-teal-600 dark:text-teal-400 hover:underline flex items-center gap-0.5"
                                        >
                                          <span>Verified Source</span>
                                          <ArrowUpRight className="w-2.5 h-2.5" />
                                        </a>
                                      )}
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>

                            {/* Expandable Provenance & Retrieval Inspector */}
                            <details className="mt-2 text-[10px] bg-slate-50 dark:bg-slate-800/50 rounded-xl p-2 border border-slate-200/60 dark:border-slate-700/60 group">
                              <summary className="font-semibold text-slate-600 dark:text-slate-400 cursor-pointer flex items-center justify-between select-none">
                                <span className="flex items-center gap-1">
                                  <Sparkles className="w-3 h-3 text-teal-600" />
                                  <span>Retrieval & Calculation Provenance Inspector</span>
                                </span>
                                <span className="text-[9px] text-slate-400 group-open:rotate-180 transition">▼</span>
                              </summary>
                              <div className="mt-2 pt-2 border-t border-slate-200/40 dark:border-slate-700/40 space-y-1 text-slate-500 dark:text-slate-400">
                                <div className="flex justify-between">
                                  <span>Vector Embedding Space:</span>
                                  <strong className="text-slate-700 dark:text-slate-300">128-D Dense Feature Hashing</strong>
                                </div>
                                <div className="flex justify-between">
                                  <span>Cosine Threshold (τ):</span>
                                  <strong className="text-slate-700 dark:text-slate-300">≥ 0.25 Minimum Similarity</strong>
                                </div>
                                <div className="flex justify-between">
                                  <span>Consulted Repositories:</span>
                                  <strong className="text-slate-700 dark:text-slate-300">AMFI, SEBI RIA 2013, Finance Act 2024, Client Files</strong>
                                </div>
                                <div className="flex justify-between">
                                  <span>Financial Calculations:</span>
                                  <strong className="text-emerald-600 dark:text-emerald-400">Exact Ordinary Annuity Math (Zero Hallucination)</strong>
                                </div>
                              </div>
                            </details>
                          </div>
                        )}

                        {/* Disclosure / Metadata Footer for Assistant */}
                        {isAssistant && msg.metadata && (
                          <div className="pt-2 border-t border-slate-200/60 dark:border-slate-700/60 text-[10px] text-slate-400 space-y-1">
                            {msg.metadata.disclosureNote && (
                              <div className="flex items-center gap-1 text-slate-500 dark:text-slate-400 font-medium">
                                <Info className="w-3 h-3 text-teal-600 shrink-0" />
                                <span>{msg.metadata.disclosureNote}</span>
                              </div>
                            )}

                            {msg.metadata.recommendations && msg.metadata.recommendations.length > 0 && (
                              <div className="mt-2 space-y-1">
                                <strong className="text-slate-700 dark:text-slate-300 uppercase tracking-wider text-[9px]">
                                  Action Recommendations:
                                </strong>
                                <ul className="list-disc pl-4 space-y-0.5 text-slate-600 dark:text-slate-400">
                                  {msg.metadata.recommendations.map((rec, i) => (
                                    <li key={i}>{rec}</li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Timestamp & Actions */}
                        <div className="flex items-center justify-between text-[10px] opacity-70 pt-1">
                          <span>
                            {new Date(msg.timestamp).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                          {isAssistant && (
                            <button
                              onClick={() => handleCopyMessage(msg.id, msg.text)}
                              className="hover:opacity-100 flex items-center gap-1 text-slate-500 dark:text-slate-400"
                              title="Copy advisory response"
                            >
                              {copiedMsgId === msg.id ? (
                                <Check className="w-3 h-3 text-emerald-600" />
                              ) : (
                                <Copy className="w-3 h-3" />
                              )}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-center space-y-4 max-w-md mx-auto py-12">
                  <div className="w-12 h-12 rounded-2xl bg-teal-50 dark:bg-teal-950/40 text-teal-600 dark:text-teal-400 flex items-center justify-center font-bold">
                    <Bot className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white">
                      Consultation with {selectedClient?.fullName}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      Ask any question about {selectedClient?.fullName}&apos;s cashflow, emergency buffer, asset allocation, or goals.
                    </p>
                  </div>
                </div>
              )}

              {/* Typing / Responding Indicator with Stop Button */}
              {isResponding && (
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-xl bg-[#0B192C] text-teal-400 flex items-center justify-center shrink-0">
                    <Bot className="w-4 h-4 animate-spin" />
                  </div>
                  <div className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-4 text-xs text-slate-500 dark:text-slate-300 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-teal-500 animate-ping" />
                      <span>Synthesizing fiduciary advice via AI model & deterministic math...</span>
                    </div>
                    <button
                      onClick={handleStopGeneration}
                      className="px-2 py-1 rounded-lg bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 text-[10px] font-bold border border-rose-200 dark:border-rose-800 hover:bg-rose-100 flex items-center gap-1 transition"
                    >
                      <Square className="w-2.5 h-2.5 fill-current" />
                      <span>Stop</span>
                    </button>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Quick Suggested Prompt Pills */}
            <div className="px-6 py-2.5 bg-slate-50/60 dark:bg-slate-800/40 border-t border-slate-100 dark:border-slate-800 flex items-center gap-2 overflow-x-auto text-xs">
              <span className="text-[10px] font-bold uppercase text-slate-400 shrink-0">Prompts:</span>
              {suggestedPrompts.map((p, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSendMessage(p.prompt)}
                  disabled={isResponding}
                  className="whitespace-nowrap px-3 py-1 rounded-full bg-white dark:bg-slate-900 hover:bg-teal-50 dark:hover:bg-slate-800 hover:text-teal-800 dark:hover:text-teal-300 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-[11px] font-medium transition shrink-0 shadow-2xs"
                >
                  {p.label}
                </button>
              ))}
            </div>

            {/* Input Box */}
            <div className="p-4 border-t border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-2">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                  placeholder={`Ask co-pilot about ${selectedClient?.fullName || "client"}'s portfolio, runway, or SIP...`}
                  disabled={isResponding || !selectedClient}
                  className="flex-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-xs focus:ring-2 focus:ring-teal-500 text-slate-900 dark:text-slate-100"
                />

                {isResponding ? (
                  <button
                    onClick={handleStopGeneration}
                    className="px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold text-xs shadow-xs transition flex items-center gap-1.5"
                  >
                    <Square className="w-3.5 h-3.5 fill-current" />
                    <span>Stop</span>
                  </button>
                ) : (
                  <button
                    onClick={() => handleSendMessage()}
                    disabled={!inputMessage.trim() || !selectedClient}
                    className="px-4 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-bold text-xs shadow-xs transition disabled:opacity-40 flex items-center gap-1.5"
                  >
                    <span>Send</span>
                    <Send className="w-3.5 h-3.5" />
                  </button>
                )}

                {lastPrompt && !isResponding && (
                  <button
                    onClick={handleRetryLast}
                    className="p-2.5 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl text-slate-600 dark:text-slate-300 transition"
                    title="Retry last query"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Privacy and Provider Transparency Notice */}
              <div className="flex items-center justify-between text-[10px] text-slate-400 px-1">
                <span>
                  🔒 Fiduciary Guardrails: Deterministic mathematical calculations override generative model outputs.
                </span>
                <span>
                  Provider: Cloudflare AI (@cf/meta/llama-3.3-70b-instruct)
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
