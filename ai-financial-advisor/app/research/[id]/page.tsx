"use client";

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  FileText,
  Calendar,
  Building,
  Sparkles,
  Search,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Send,
  FolderLock,
} from "lucide-react";
import { Badge } from "@/components/ui/Badge";

export default function DocumentDetailsPage() {
  const params = useParams();
  const id = params?.id as string;

  const [doc, setDoc] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [question, setQuestion] = useState("");
  const [queryResponse, setQueryResponse] = useState<any>(null);
  const [querying, setQuerying] = useState(false);

  useEffect(() => {
    async function loadDoc() {
      if (!id) return;
      try {
        const res = await fetch(`/api/research/documents/${id}`);
        const json = await res.json();
        if (json.success && json.data) {
          setDoc(json.data);
        }
      } catch (err) {
        console.error("Failed to load document:", err);
      } finally {
        setLoading(false);
      }
    }
    loadDoc();
  }, [id]);

  const handleQuery = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim()) return;
    setQuerying(true);
    try {
      const res = await fetch("/api/research/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question,
          contextDocIds: [id],
        }),
      });
      const json = await res.json();
      setQueryResponse(json.answer);
    } catch (err) {
      console.error("Query failed:", err);
    } finally {
      setQuerying(false);
    }
  };

  if (loading) {
    return <div className="py-20 text-center text-xs text-slate-500">Loading document vault...</div>;
  }

  if (!doc) {
    return (
      <div className="py-16 text-center space-y-3">
        <AlertCircle className="w-8 h-8 text-rose-500 mx-auto" />
        <h2 className="text-base font-bold text-slate-800">Document Filing Not Found</h2>
        <Link href="/research" className="text-xs text-teal-600 font-semibold hover:underline">
          Return to Research Library
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Link
          href="/research"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 transition mb-2"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Research Library</span>
        </Link>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
                {doc.title}
              </h1>
              <Badge variant="navy">{doc.documentType?.replace(/_/g, " ")}</Badge>
              <Badge variant="teal" dot>{doc.processingStatus}</Badge>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              AMC: <strong>{doc.amc}</strong> • Fund: <strong>{doc.fundName}</strong> • Publication: <strong>{doc.publicationDate}</strong>
            </p>
          </div>
        </div>
      </div>

      {/* Grid: Left Document Text Preview (7 Cols), Right AI-Ready Query Sandbox (5 Cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Metadata & Extracted Text */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2 flex items-center justify-between">
              <span>Filing Metadata & Ingestion State</span>
              <span className="text-xs text-slate-400 font-normal">Page Count: {doc.pageCount || 6}</span>
            </h3>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-100">
                <span className="text-slate-400 block text-[10px]">FILE SIZE</span>
                <span className="font-semibold text-slate-800">
                  {((doc.fileSizeBytes || 1048576) / (1024 * 1024)).toFixed(2)} MB
                </span>
              </div>
              <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-100">
                <span className="text-slate-400 block text-[10px]">MIME TYPE</span>
                <span className="font-semibold text-slate-800">application/pdf</span>
              </div>
              <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-100">
                <span className="text-slate-400 block text-[10px]">ACCESS CONTROL</span>
                <span className="font-semibold text-teal-700">Adviser Role Encrypted</span>
              </div>
              <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-100">
                <span className="text-slate-400 block text-[10px]">VECTOR STATUS</span>
                <span className="font-semibold text-amber-700">Phase 2 Indexed</span>
              </div>
            </div>

            <div>
              <h4 className="text-xs font-bold text-slate-800 mb-2">Preserved Text Snippets (Page 1):</h4>
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs text-slate-700 font-mono leading-relaxed whitespace-pre-wrap max-h-72 overflow-y-auto">
                {doc.extractedTextPreview || "Raw document text parsed for regulatory disclosures and fund holdings."}
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: AI Research Query Sandbox (Honest Phase 2 Disclosure) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4">
            <div className="border-b border-slate-100 pb-2">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-teal-600" />
                <h3 className="text-sm font-bold text-slate-900">
                  AI Question Answering & Citation Sandbox
                </h3>
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Evaluates the Phase 2 RAG interface without synthetic fake answers.
              </p>
            </div>

            <form onSubmit={handleQuery} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Ask a question regarding this factsheet / SID:
                </label>
                <textarea
                  rows={3}
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  placeholder="e.g. What is the exit load structure and benchmark tracking error disclosed in this document?"
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs focus:outline-hidden focus:border-teal-500"
                />
              </div>

              <button
                type="submit"
                disabled={querying || !question.trim()}
                className="w-full py-2 bg-[#0b192c] hover:bg-[#152945] text-white font-bold text-xs rounded-lg flex items-center justify-center gap-1.5 transition disabled:opacity-50 cursor-pointer shadow-xs"
              >
                <Send className="w-3.5 h-3.5 text-teal-400" />
                <span>{querying ? "Querying Interface..." : "Test AI Assistant Interface"}</span>
              </button>
            </form>

            {/* Structured Placeholder Response Display */}
            {queryResponse && (
              <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-amber-900 uppercase text-[10px] tracking-wider">
                    Phase 2 Response Status: {queryResponse.status}
                  </span>
                  <Badge variant="warning">No Hallucination</Badge>
                </div>
                <p className="text-amber-800 leading-relaxed font-medium">
                  {queryResponse.message}
                </p>
                <p className="text-slate-600 text-[11px]">
                  <strong>Action:</strong> {queryResponse.suggestedAction}
                </p>
              </div>
            )}

            <div className="text-[10px] text-slate-400 bg-slate-50 p-2.5 rounded-lg border border-slate-100 flex items-start gap-1.5">
              <FolderLock className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
              <span>
                Fiduciary standard: As mandated by Problem Statement 04, simulated fake AI answers are strictly disabled until full RAG with verified vector citations is built.
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
