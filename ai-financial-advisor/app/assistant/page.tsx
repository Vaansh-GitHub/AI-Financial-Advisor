"use client";

import React, { useState, useEffect, useRef, useTransition } from "react";
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
} from "lucide-react";
import { useStorageData } from "@/lib/storage/useStorage";
import {
  saveConversation,
  addMessageToConversation,
  deleteConversation,
  getClientById,
  getGoals,
  getReports,
  getUploadedFiles,
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

  // Active Client
  const [selectedClientId, setSelectedClientId] = useState<string>("");
  // Active Conversation ID
  const [selectedChatId, setSelectedChatId] = useState<string>("");
  const [inputMessage, setInputMessage] = useState("");
  const [isResponding, setIsResponding] = useState(false);
  const [copiedMsgId, setCopiedMsgId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

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
  const clientConversations = chats.filter((c) => c.clientId === selectedClientId);

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
  }, [activeConversation?.messages]);

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

I can perform live fiduciary calculations based on ${selectedClient.fullName}'s verified financial data:
- **Income**: ${formatINR(selectedClient.monthlyIncome)}/mo · **Surplus**: ${formatINR(netSurplus)}/mo
- **Emergency Reserve**: ${formatINR(selectedClient.emergencyFundAmount)} (${emergencyMonths} months)
- **Risk Category**: ${selectedClient.riskProfile?.combinedCategory || "BALANCED"}
- **Active Goals**: ${clientGoals.length} recorded

Select a suggested prompt below or type your query.`,
          timestamp: new Date().toISOString(),
          metadata: {
            isPlaceholder: true,
            disclosureNote:
              "Local Fiduciary Advisory Engine. Deterministic analysis adhering to SEBI RIA suitability rules.",
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
        title: text.substring(0, 40) + "...",
        messages: [],
      });
      targetChatId = created.id;
      setSelectedChatId(created.id);
    }

    // 1. Add user message locally
    addMessageToConversation(targetChatId, {
      sender: "user",
      text: text.trim(),
    });

    setInputMessage("");
    setIsResponding(true);
    refreshAll();

    try {
      // 2. Generate response via AI Service
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
          recommendations: result.recommendations,
          isPlaceholder: result.isPlaceholder,
          disclosureNote: result.disclosureNote,
        },
      });

      refreshAll();
    } catch (err) {
      console.error("AI Assistant error:", err);
      addMessageToConversation(targetChatId, {
        sender: "assistant",
        text: `⚠️ **Advisory Engine Error**: Unable to evaluate calculation. Please ensure client financial profile values are valid.`,
      });
      refreshAll();
    } finally {
      setIsResponding(false);
    }
  };

  const handleDeleteConversation = (id: string) => {
    if (confirm("Delete this saved conversation thread?")) {
      deleteConversation(id);
      refreshAll();
    }
  };

  const handleCopyMessage = (msgId: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedMsgId(msgId);
    setTimeout(() => setCopiedMsgId(null), 2000);
  };

  // Suggested Advisory Prompts
  const suggestedPrompts = [
    {
      label: "Evaluate emergency fund runway & shortfall",
      prompt: "Analyze emergency fund adequacy: How many months of burn does it cover, and what is the recommended top-up?",
    },
    {
      label: "Check risk tolerance vs capacity conflict",
      prompt: "Evaluate client risk suitability: Is there a conflict between objective loss capacity and subjective risk tolerance?",
    },
    {
      label: "Calculate required SIP for primary goal",
      prompt: "Calculate required monthly SIP for the primary goal with inflation adjustment and expected equity compounding.",
    },
    {
      label: "Asset allocation review (Equity/Debt/Gold)",
      prompt: "Review asset allocation: What are the recommended weights for Equity, Debt, and Gold under SEBI suitability rules?",
    },
    {
      label: "Audit debt-to-income and EMI obligations",
      prompt: "Audit debt-to-income (DTI) ratio: Is the current EMI obligation within the 40% prudential ceiling?",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-teal-50 text-teal-800 text-[11px] font-bold border border-teal-200 mb-1">
            <Sparkles className="w-3.5 h-3.5 text-teal-600" />
            <span>Fiduciary Advisory Co-Pilot</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">AI Investment Adviser Co-Pilot</h1>
          <p className="text-xs text-slate-500">
            Fiduciary consultative engine with deterministic financial math and local conversational persistence.
          </p>
        </div>

        {/* Client Selector Dropdown */}
        {clients.length > 0 && (
          <div className="flex items-center gap-2">
            <label className="text-xs font-semibold text-slate-600 shrink-0">Consulting on:</label>
            <select
              value={selectedClientId}
              onChange={(e) => {
                setSelectedClientId(e.target.value);
                router.push(`/assistant?clientId=${e.target.value}`);
              }}
              className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:ring-2 focus:ring-teal-500 shadow-xs"
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
        <div className="bg-white rounded-2xl p-12 border border-slate-200/80 shadow-xs text-center max-w-xl mx-auto my-12 space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-teal-50 text-teal-600 mx-auto flex items-center justify-center">
            <Bot className="w-8 h-8" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900">No Client Profiles Available</h2>
            <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
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
              className="px-4 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs transition"
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
            <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
                  Client Context
                </span>
                <Link
                  href={`/clients/${selectedClient.id}`}
                  className="text-[11px] text-teal-600 font-bold hover:underline flex items-center gap-0.5"
                >
                  <span>Profile</span>
                  <ExternalLink className="w-3 h-3" />
                </Link>
              </div>

              <div>
                <h3 className="font-bold text-slate-900 text-sm">{selectedClient.fullName}</h3>
                <p className="text-[11px] text-slate-400">
                  Age {selectedClient.age} • {selectedClient.city} • {selectedClient.employmentType.replace(/_/g, " ")}
                </p>
              </div>

              {/* Conflict Alert if any */}
              {selectedClient.riskProfile?.hasConflict && (
                <div className="p-2 rounded-lg bg-amber-50 border border-amber-200/70 text-[10px] text-amber-900 flex items-start gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                  <span>
                    <strong>Conflict:</strong> Capacity ({selectedClient.riskProfile.capacityLevel}) constrains tolerance.
                  </span>
                </div>
              )}

              {/* Key Metric Snapshot */}
              <div className="space-y-2 text-xs pt-1">
                <div className="flex items-center justify-between text-slate-600">
                  <span>Monthly Income</span>
                  <strong className="text-slate-900">{formatINR(selectedClient.monthlyIncome)}</strong>
                </div>
                <div className="flex items-center justify-between text-slate-600">
                  <span>Monthly Surplus</span>
                  <strong className="text-emerald-600">+{formatINR(netSurplus)}</strong>
                </div>
                <div className="flex items-center justify-between text-slate-600">
                  <span>Emergency Fund</span>
                  <span
                    className={`font-bold px-1.5 py-0.2 rounded text-[10px] ${
                      Number(emergencyMonths) >= 6
                        ? "bg-emerald-50 text-emerald-700"
                        : "bg-amber-50 text-amber-700"
                    }`}
                  >
                    {emergencyMonths} Months
                  </span>
                </div>
                <div className="flex items-center justify-between text-slate-600">
                  <span>Debt-to-Income</span>
                  <strong className="text-slate-900">{emiRatio}%</strong>
                </div>
                <div className="flex items-center justify-between text-slate-600">
                  <span>Risk Category</span>
                  <strong className="text-teal-700 font-bold">
                    {selectedClient.riskProfile?.combinedCategory || "BALANCED"}
                  </strong>
                </div>
              </div>
            </div>
          )}

          {/* Saved Conversations List */}
          <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
                Saved Threads ({clientConversations.length})
              </span>
              <button
                onClick={handleStartNewChat}
                className="text-[11px] text-teal-600 font-bold hover:underline flex items-center gap-1"
                title="Start a new chat session for this client"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>New Session</span>
              </button>
            </div>

            <div className="space-y-1.5 max-h-60 overflow-y-auto text-xs">
              {clientConversations.map((c) => (
                <div
                  key={c.id}
                  onClick={() => setSelectedChatId(c.id)}
                  className={`p-2.5 rounded-xl cursor-pointer transition flex items-center justify-between group ${
                    selectedChatId === c.id
                      ? "bg-teal-50 text-teal-900 font-bold border border-teal-200"
                      : "hover:bg-slate-50 text-slate-700"
                  }`}
                >
                  <div className="min-w-0 pr-2">
                    <p className="truncate text-xs">{c.title}</p>
                    <p className="text-[10px] text-slate-400 font-normal">
                      {c.messages.length} msgs • {new Date(c.updatedAt).toLocaleDateString("en-IN", { month: "short", day: "numeric" })}
                    </p>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteConversation(c.id);
                    }}
                    className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-rose-600 transition"
                    title="Delete thread"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ))}

              {clientConversations.length === 0 && (
                <div className="p-3 text-center text-slate-400 text-xs">
                  No saved conversations for this client yet.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: ACTIVE CHAT THREAD & INTERACTIVE COMPASS (3 Cols) */}
        <div className="lg:col-span-3 bg-white rounded-2xl border border-slate-200/80 shadow-xs flex flex-col h-[740px] overflow-hidden">
          {/* Chat Header */}
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/60">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#0B192C] to-[#1E3E62] text-white flex items-center justify-center font-bold shadow-xs">
                <Bot className="w-5 h-5 text-teal-400" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-900">
                  {activeConversation ? activeConversation.title : `Consultation: ${selectedClient?.fullName}`}
                </h2>
                <p className="text-[11px] text-slate-400">
                  Persistent local thread • Fiduciary SEBI suitability models
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleStartNewChat}
                className="px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-100 font-semibold text-xs text-slate-700 transition flex items-center gap-1.5"
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
                          ? "bg-slate-50 border border-slate-200/80 text-slate-800"
                          : "bg-teal-600 text-white"
                      }`}
                    >
                      {/* Message Content */}
                      <div className="whitespace-pre-line text-xs font-normal">
                        {msg.text}
                      </div>

                      {/* Disclosure / Metadata Footer for Assistant */}
                      {isAssistant && msg.metadata && (
                        <div className="pt-2 border-t border-slate-200/60 text-[10px] text-slate-400 space-y-1">
                          {msg.metadata.disclosureNote && (
                            <div className="flex items-center gap-1 text-slate-500 font-medium">
                              <Info className="w-3 h-3 text-teal-600 shrink-0" />
                              <span>{msg.metadata.disclosureNote}</span>
                            </div>
                          )}

                          {msg.metadata.recommendations && msg.metadata.recommendations.length > 0 && (
                            <div className="mt-2 space-y-1">
                              <strong className="text-slate-700 uppercase tracking-wider text-[9px]">
                                Action Recommendations:
                              </strong>
                              <ul className="list-disc pl-4 space-y-0.5 text-slate-600">
                                {msg.metadata.recommendations.map((rec, i) => (
                                  <li key={i}>{rec}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Timestamp & Copy Action */}
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
                            className="hover:opacity-100 flex items-center gap-1 text-slate-500"
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
                <div className="w-12 h-12 rounded-2xl bg-teal-50 text-teal-600 flex items-center justify-center font-bold">
                  <Bot className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Consultation with {selectedClient?.fullName}
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Ask any question about {selectedClient?.fullName}&apos;s cashflow, emergency buffer, asset allocation, or goals.
                  </p>
                </div>
              </div>
            )}

            {isResponding && (
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-xl bg-[#0B192C] text-teal-400 flex items-center justify-center shrink-0">
                  <Bot className="w-4 h-4 animate-spin" />
                </div>
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-xs text-slate-500 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-teal-500 animate-ping" />
                  <span>Evaluating suitability rules and deterministic financial models...</span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Quick Suggested Prompt Pills */}
          <div className="px-6 py-2.5 bg-slate-50/60 border-t border-slate-100 flex items-center gap-2 overflow-x-auto text-xs">
            <span className="text-[10px] font-bold uppercase text-slate-400 shrink-0">Prompts:</span>
            {suggestedPrompts.map((p, idx) => (
              <button
                key={idx}
                onClick={() => handleSendMessage(p.prompt)}
                disabled={isResponding}
                className="whitespace-nowrap px-3 py-1 rounded-full bg-white hover:bg-teal-50 hover:text-teal-800 border border-slate-200 text-slate-700 text-[11px] font-medium transition shrink-0 shadow-2xs"
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Input Box */}
          <div className="p-4 border-t border-slate-200/80 bg-white">
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
                className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs focus:ring-2 focus:ring-teal-500 text-slate-900"
              />
              <button
                onClick={() => handleSendMessage()}
                disabled={isResponding || !inputMessage.trim() || !selectedClient}
                className="px-4 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-bold text-xs shadow-xs transition disabled:opacity-40 flex items-center gap-1.5"
              >
                <span>Send</span>
                <Send className="w-3.5 h-3.5" />
              </button>
            </div>
            <p className="text-[10px] text-slate-400 mt-1.5 text-center">
              Co-pilot analyzes local verified client data. Ready for live API integration via Settings.
            </p>
          </div>
        </div>
      </div>
      )}
    </div>
  );
}

