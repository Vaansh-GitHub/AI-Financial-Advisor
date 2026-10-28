"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  BookOpen,
  Upload,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  AlertCircle,
  ExternalLink,
  ChevronRight,
  ShieldCheck,
  FileText,
  Tag,
  Trash2,
  X,
  FileCode,
} from "lucide-react";
import { useStorageData } from "@/lib/storage/useStorage";
import {
  saveResearchDocument,
  deleteResearchDocument,
} from "@/lib/storage/localStorage";
import { storeFileInIndexedDB } from "@/lib/storage/indexedDb";
import { ResearchDocument } from "@/lib/storage/types";

export default function ResearchLibraryPage() {
  const { research, refreshAll } = useStorageData();

  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [activeReadingDoc, setActiveReadingDoc] = useState<ResearchDocument | null>(null);

  // Upload Form
  const [newTitle, setNewTitle] = useState("");
  const [newCategory, setNewCategory] = useState<ResearchDocument["category"]>("REGULATORY");
  const [newSource, setNewSource] = useState("");
  const [newSummary, setNewSummary] = useState("");
  const [newContent, setNewContent] = useState("");
  const [newTags, setNewTags] = useState("");
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const filteredDocs = research.filter((d) => {
    const matchesSearch =
      d.title.toLowerCase().includes(search.toLowerCase()) ||
      d.source.toLowerCase().includes(search.toLowerCase()) ||
      d.summary.toLowerCase().includes(search.toLowerCase()) ||
      d.tags.some((t) => t.toLowerCase().includes(search.toLowerCase()));
    const matchesCategory = categoryFilter === "ALL" || d.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    setIsUploading(true);
    let fileId: string | undefined = undefined;
    let fileName: string | undefined = undefined;
    let fileSizeBytes: number | undefined = undefined;

    if (uploadFile) {
      fileId = `res_file_${Date.now()}`;
      fileName = uploadFile.name;
      fileSizeBytes = uploadFile.size;
      await storeFileInIndexedDB(fileId, uploadFile.name, uploadFile.type, uploadFile);
    }

    saveResearchDocument({
      title: newTitle.trim(),
      category: newCategory,
      source: newSource.trim() || "Independent RIA Practice",
      publicationDate: new Date().toISOString().split("T")[0],
      summary: newSummary.trim() || "Uploaded research document.",
      fullContent: newContent.trim() || undefined,
      fileId,
      fileName,
      fileSizeBytes,
      tags: newTags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
    });

    refreshAll();
    setIsUploading(false);
    setShowUploadModal(false);
    setNewTitle("");
    setNewSource("");
    setNewSummary("");
    setNewContent("");
    setNewTags("");
    setUploadFile(null);
  };

  const handleDelete = (id: string) => {
    if (confirm("Delete this research document?")) {
      deleteResearchDocument(id);
      refreshAll();
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-teal-50 text-teal-800 text-[11px] font-bold border border-teal-200 mb-1">
            <BookOpen className="w-3.5 h-3.5 text-teal-600" />
            <span>Statutory Knowledge Base</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Research & Regulatory Library</h1>
          <p className="text-xs text-slate-500">
            SEBI (Investment Advisers) Regulations, AMFI circulars, taxation tax slabs, and wealth management literature.
          </p>
        </div>

        <button
          onClick={() => setShowUploadModal(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs shadow-xs transition"
        >
          <Upload className="w-4 h-4" />
          <span>Upload Research Document</span>
        </button>
      </div>

      {/* Search & Filter Bar */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs flex flex-col md:flex-row items-center gap-3 text-xs">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search documents by regulation, tag, circular name..."
            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-2 text-xs focus:ring-2 focus:ring-teal-500"
          />
        </div>

        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-700 w-full md:w-auto"
        >
          <option value="ALL">All Categories</option>
          <option value="REGULATORY">SEBI / AMFI Regulatory</option>
          <option value="TAXATION">Income Tax & Capital Gains</option>
          <option value="ASSET_CLASSES">Asset Class Studies</option>
          <option value="USER_UPLOAD">User Uploads</option>
        </select>
      </div>

      {/* Document Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {filteredDocs.map((doc) => (
          <div
            key={doc.id}
            className="bg-white rounded-2xl p-6 border border-slate-200/80 hover:border-teal-500/50 hover:shadow-md transition flex flex-col justify-between space-y-4"
          >
            <div>
              <div className="flex items-center justify-between text-[10px] text-slate-400 mb-1.5">
                <span className="font-bold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700">
                  {doc.category}
                </span>
                <span>Published: {new Date(doc.publicationDate).toLocaleDateString("en-IN")}</span>
              </div>

              <h3 className="font-bold text-slate-900 text-sm leading-snug mt-1">
                {doc.title}
              </h3>

              <p className="text-[11px] text-teal-700 font-semibold mt-1">
                Source: {doc.source}
              </p>

              <p className="text-xs text-slate-600 mt-2 line-clamp-3 leading-relaxed">
                {doc.summary}
              </p>

              {/* Tags */}
              <div className="flex flex-wrap gap-1.5 mt-3 pt-3 border-t border-slate-100">
                {doc.tags.map((t, idx) => (
                  <span
                    key={idx}
                    className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-slate-50 text-slate-600 border border-slate-200/60"
                  >
                    #{t}
                  </span>
                ))}
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
              <button
                onClick={() => handleDelete(doc.id)}
                className="text-slate-400 hover:text-rose-600 p-1"
                title="Delete Document"
              >
                <Trash2 className="w-4 h-4" />
              </button>

              <button
                onClick={() => setActiveReadingDoc(doc)}
                className="px-3 py-1.5 rounded-xl bg-teal-50 hover:bg-teal-100 text-teal-800 font-bold text-xs transition flex items-center gap-1"
              >
                <span>Read Full Document</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {filteredDocs.length === 0 && (
        <div className="bg-white rounded-2xl p-16 text-center border border-slate-200/80 space-y-3">
          <BookOpen className="w-12 h-12 text-slate-300 mx-auto" />
          <h3 className="font-bold text-slate-800 text-base">No Documents Found</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Try adjusting your search query or upload a new regulatory factsheet.
          </p>
        </div>
      )}

      {/* DOCUMENT VIEWER MODAL */}
      {activeReadingDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col text-xs">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/60">
              <div className="min-w-0 pr-4">
                <span className="text-[10px] font-bold text-teal-700 uppercase">
                  {activeReadingDoc.category}
                </span>
                <h3 className="font-bold text-slate-900 text-sm truncate">{activeReadingDoc.title}</h3>
              </div>
              <button
                onClick={() => setActiveReadingDoc(null)}
                className="p-1 rounded-md text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 text-slate-800 leading-relaxed flex-1">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/60 text-xs text-slate-600">
                <p>
                  <strong>Source Authority:</strong> {activeReadingDoc.source}
                </p>
                <p>
                  <strong>Publication Date:</strong> {activeReadingDoc.publicationDate}
                </p>
                {activeReadingDoc.fileName && (
                  <p>
                    <strong>Attached Binary File:</strong> {activeReadingDoc.fileName} (Stored in local IndexedDB)
                  </p>
                )}
              </div>

              <div>
                <h4 className="font-bold text-xs uppercase tracking-wider text-slate-400 mb-1">Summary</h4>
                <p className="text-xs">{activeReadingDoc.summary}</p>
              </div>

              {activeReadingDoc.fullContent ? (
                <div>
                  <h4 className="font-bold text-xs uppercase tracking-wider text-slate-400 mb-1">
                    Document Text & Regulatory Clauses
                  </h4>
                  <div className="whitespace-pre-line p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs font-mono">
                    {activeReadingDoc.fullContent}
                  </div>
                </div>
              ) : (
                <div className="p-6 text-center text-slate-400">
                  Full text indexed from uploaded binary attachment.
                </div>
              )}
            </div>

            <div className="px-6 py-3 border-t border-slate-100 bg-slate-50/60 flex justify-end">
              <button
                onClick={() => setActiveReadingDoc(null)}
                className="px-4 py-1.5 rounded-xl border border-slate-200 font-semibold text-slate-700 hover:bg-slate-100"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* UPLOAD MODAL */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden text-xs">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/60">
              <h3 className="font-bold text-slate-900 text-sm">Upload Regulatory / Research Document</h3>
              <button
                onClick={() => setShowUploadModal(false)}
                className="p-1 rounded-md text-slate-400 hover:text-slate-700"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleUploadSubmit} className="p-6 space-y-4">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Document Title *</label>
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g. SEBI Circular on Total Expense Ratio (TER) Limits"
                  required
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Category</label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value as any)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs"
                  >
                    <option value="REGULATORY">Regulatory (SEBI/AMFI)</option>
                    <option value="TAXATION">Taxation (CBDT)</option>
                    <option value="ASSET_CLASSES">Asset Class Study</option>
                    <option value="USER_UPLOAD">User Upload / Memo</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Source Authority</label>
                  <input
                    type="text"
                    value={newSource}
                    onChange={(e) => setNewSource(e.target.value)}
                    placeholder="e.g. SEBI / AMFI"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Summary Overview</label>
                <textarea
                  value={newSummary}
                  onChange={(e) => setNewSummary(e.target.value)}
                  rows={2}
                  placeholder="Brief summary of regulatory mandate or research conclusions..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Full Text / Regulatory Clauses</label>
                <textarea
                  value={newContent}
                  onChange={(e) => setNewContent(e.target.value)}
                  rows={4}
                  placeholder="Paste raw text, circular clauses, or advisory notes..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-mono"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Attach File (PDF/CSV/MD)</label>
                <input
                  type="file"
                  accept=".pdf,.csv,.md,.txt"
                  onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 text-xs"
                />
                <p className="text-[10px] text-slate-400 mt-1">Binary files are saved directly in browser IndexedDB.</p>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Tags (comma separated)</label>
                <input
                  type="text"
                  value={newTags}
                  onChange={(e) => setNewTags(e.target.value)}
                  placeholder="Compliance, SEBI, Fiduciary, TER"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowUploadModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUploading || !newTitle.trim()}
                  className="px-5 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold transition disabled:opacity-50"
                >
                  {isUploading ? "Saving..." : "Save to Library"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
