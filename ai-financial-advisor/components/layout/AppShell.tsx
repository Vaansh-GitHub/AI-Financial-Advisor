"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  Bot,
  FileText,
  BookOpen,
  Settings,
  Layers,
  Search,
  Plus,
  Upload,
  HardDrive,
  Sun,
  Moon,
  ChevronLeft,
  ChevronRight,
  Menu,
  X,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Download,
  FolderLock,
  ArrowUpRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useStorageData } from "@/lib/storage/useStorage";
import { DataUploadModal } from "@/components/clients/DataUploadModal";
import { exportAllData, resetToDemo } from "@/lib/storage/localStorage";

interface AppShellProps {
  children: React.ReactNode;
  breadcrumbs?: Array<{ label: string; href?: string }>;
  actions?: React.ReactNode;
  title?: string;
  description?: string;
}

export function AppShell({
  children,
  breadcrumbs,
  actions,
  title,
  description,
}: AppShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { clients, storageUsage, settings, refreshAll } = useStorageData();

  const [collapsed, setCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchFocused, setSearchFocused] = useState(false);
  const [showStorageModal, setShowStorageModal] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [darkMode, setDarkMode] = useState(false);

  // Synchronize dark theme with localStorage and document element
  useEffect(() => {
    try {
      const savedTheme = localStorage.getItem("zeckathon_theme") || settings?.theme;
      const isDark = savedTheme === "dark";
      setDarkMode(isDark);
      if (isDark) {
        document.documentElement.classList.add("dark");
      } else {
        document.documentElement.classList.remove("dark");
      }
    } catch {}
  }, [settings?.theme]);

  const handleToggleTheme = () => {
    const nextDark = !darkMode;
    setDarkMode(nextDark);
    try {
      localStorage.setItem("zeckathon_theme", nextDark ? "dark" : "light");
      if (nextDark) {
        document.documentElement.classList.add("dark");
      } else {
        document.documentElement.classList.remove("dark");
      }
    } catch {}
  };

  // Close mobile drawer on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  // Persistent 6 Sidebar Navigation items
  const navItems = [
    { label: "Overview", href: "/", icon: LayoutDashboard },
    { label: "Clients", href: "/clients", icon: Users, badge: clients.length ? `${clients.length}` : undefined },
    { label: "AI Assistant", href: "/assistant", icon: Bot, badge: "Co-pilot", badgeColor: "bg-teal-500" },
    { label: "Mutual Funds", href: "/funds", icon: Layers, badge: "Live AMFI", badgeColor: "bg-teal-600" },
    { label: "Financial Reports", href: "/reports", icon: FileText },
    { label: "Research Library", href: "/research", icon: BookOpen },
    { label: "Settings", href: "/settings", icon: Settings },
  ];

  // Filter clients for global search
  const searchResults = searchQuery.trim()
    ? clients.filter(
        (c) =>
          c.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
          c.city.toLowerCase().includes(searchQuery.toLowerCase()) ||
          c.email.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : [];

  const handleDownloadBackup = () => {
    const data = exportAllData();
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `artha-adviser-backup-${new Date().toISOString().split("T")[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleResetData = () => {
    if (confirm("Reset all local data back to initial demo personas and reports?")) {
      resetToDemo();
      refreshAll();
      setShowStorageModal(false);
    }
  };

  return (
    <div className={cn("min-h-screen flex bg-[#F8FAFC] text-slate-900 transition-colors", darkMode && "dark bg-slate-950 text-slate-100")}>
      {/* 1. PERSISTENT DEEP NAVY SIDEBAR (DESKTOP) */}
      <aside
        className={cn(
          "bg-[#0B192C] text-white flex flex-col transition-all duration-300 z-30 fixed inset-y-0 left-0 hidden md:flex border-r border-slate-800/80 shadow-xl",
          collapsed ? "w-20" : "w-64"
        )}
      >
        {/* Brand Header */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-slate-800">
          <Link href="/" className="flex items-center gap-3 overflow-hidden">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-teal-500 to-emerald-600 flex items-center justify-center font-bold text-white shadow-md shadow-teal-900/30 shrink-0">
              <ShieldCheck className="w-5 h-5 text-white" />
            </div>
            {!collapsed && (
              <div className="flex flex-col">
                <span className="font-bold text-sm tracking-wide text-white leading-tight">
                  Artha<span className="text-teal-400">Advisor</span>
                </span>
                <span className="text-[10px] text-teal-300/80 font-medium tracking-wider uppercase">
                  AI Investment Adviser
                </span>
              </div>
            )}
          </Link>
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition"
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>

        {/* Navigation Items (Exactly 6 Core Items) */}
        <nav className="flex-1 px-3 py-4 space-y-1.5 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              item.href === "/"
                ? pathname === "/"
                : pathname === item.href || pathname.startsWith(item.href + "/");

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all group relative",
                  isActive
                    ? "bg-teal-500 text-white font-semibold shadow-md shadow-teal-900/40"
                    : "text-slate-300 hover:bg-slate-800/60 hover:text-white"
                )}
                title={collapsed ? item.label : undefined}
              >
                <Icon
                  className={cn(
                    "w-5 h-5 shrink-0 transition-colors",
                    isActive ? "text-white" : "text-slate-400 group-hover:text-teal-400"
                  )}
                />
                {!collapsed && <span className="truncate">{item.label}</span>}
                {!collapsed && item.badge && (
                  <span
                    className={cn(
                      "ml-auto text-[10px] px-2 py-0.5 rounded-full font-bold",
                      item.badgeColor ? `${item.badgeColor} text-white` : "bg-slate-800 text-slate-300"
                    )}
                  >
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Storage Quick Summary in Sidebar Footer */}
        <div className="p-3 border-t border-slate-800">
          {!collapsed ? (
            <div
              onClick={() => setShowStorageModal(true)}
              className="bg-slate-900/80 hover:bg-slate-900 rounded-xl p-3 border border-slate-800/80 text-xs cursor-pointer transition group"
            >
              <div className="flex items-center justify-between text-teal-400 font-semibold mb-1">
                <span className="flex items-center gap-1.5 text-[11px]">
                  <HardDrive className="w-3.5 h-3.5 text-teal-400" />
                  Local-First Engine
                </span>
                <span className="text-[10px] text-slate-400 group-hover:text-white">
                  {storageUsage?.kilobytesUsed || 0} KB
                </span>
              </div>
              <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden my-1.5">
                <div
                  className="bg-teal-500 h-full rounded-full transition-all"
                  style={{ width: `${Math.max(4, storageUsage?.quotaPercent || 2)}%` }}
                />
              </div>
              <p className="text-[10px] text-slate-400">
                Encrypted in Browser • No Remote DB
              </p>
            </div>
          ) : (
            <button
              onClick={() => setShowStorageModal(true)}
              className="w-full flex justify-center text-teal-400 py-2 hover:bg-slate-800/50 rounded-lg transition"
              title="Storage Status"
            >
              <HardDrive className="w-5 h-5" />
            </button>
          )}
        </div>
      </aside>

      {/* MOBILE DRAWER */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden bg-slate-950/70 backdrop-blur-xs flex">
          <div className="w-72 bg-[#0B192C] text-white flex flex-col h-full shadow-2xl p-4">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <span className="font-bold text-sm tracking-wide text-white">
                Artha<span className="text-teal-400">Advisor</span>
              </span>
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <nav className="flex-1 py-4 space-y-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition",
                      isActive ? "bg-teal-500 text-white font-semibold" : "text-slate-300 hover:bg-slate-800"
                    )}
                  >
                    <Icon className="w-5 h-5" />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </nav>
          </div>
          <div className="flex-1" onClick={() => setMobileMenuOpen(false)} />
        </div>
      )}

      {/* 2. MAIN APPLICATION CONTENT AREA */}
      <div
        className={cn(
          "flex-1 flex flex-col transition-all duration-300 min-w-0",
          collapsed ? "md:ml-20" : "md:ml-64"
        )}
      >
        {/* TOP NAVIGATION BAR */}
        <header className="h-16 bg-white dark:bg-slate-900 border-b border-slate-200/80 dark:border-slate-800 sticky top-0 z-20 px-4 md:px-8 flex items-center justify-between shadow-xs">
          {/* Mobile Menu Button + Search */}
          <div className="flex items-center gap-3 flex-1 max-w-xl">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="p-2 rounded-lg text-slate-600 md:hidden hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* Global Search Bar with Autocomplete Dropdown */}
            <div className="relative w-full max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => setSearchFocused(true)}
                placeholder="Search clients by name, city, email..."
                className="w-full bg-slate-100/80 dark:bg-slate-800 border-0 rounded-xl pl-9 pr-4 py-2 text-xs focus:ring-2 focus:ring-teal-500 focus:bg-white dark:focus:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 transition"
              />

              {/* Autocomplete Dropdown */}
              {searchFocused && searchQuery.trim() && (
                <div
                  className="absolute left-0 right-0 top-full mt-2 bg-white dark:bg-slate-900 rounded-xl shadow-xl border border-slate-200 dark:border-slate-800 py-2 z-50 text-xs overflow-hidden"
                  onMouseDown={(e) => e.preventDefault()} // Prevent blur before click
                >
                  <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Matching Clients ({searchResults.length})
                  </div>
                  {searchResults.length > 0 ? (
                    searchResults.map((client) => (
                      <button
                        key={client.id}
                        onClick={() => {
                          router.push(`/clients/${client.id}`);
                          setSearchFocused(false);
                          setSearchQuery("");
                        }}
                        className="w-full text-left px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center justify-between group transition"
                      >
                        <div>
                          <p className="font-semibold text-slate-800 dark:text-slate-200 group-hover:text-teal-600">
                            {client.fullName}
                          </p>
                          <p className="text-[11px] text-slate-400">
                            {client.city} • {client.age}y • ₹{(client.monthlyIncome / 1000).toFixed(0)}k/mo
                          </p>
                        </div>
                        <ArrowUpRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-teal-600" />
                      </button>
                    ))
                  ) : (
                    <div className="px-3 py-2 text-slate-400 text-center">No clients match &ldquo;{searchQuery}&rdquo;</div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Right Header Utilities: Quick Add, Upload Data, Storage Indicator, Theme */}
          <div className="flex items-center gap-2.5">
            {/* Quick Add Client Button */}
            <Link
              href="/clients/new"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-semibold text-xs transition shadow-xs"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Add Client</span>
            </Link>

            {/* Quick Upload Data Button */}
            <button
              onClick={() => setShowUploadModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 font-semibold text-xs transition"
              title="Upload financial data (JSON, CSV, PDF)"
            >
              <Upload className="w-3.5 h-3.5 text-slate-500" />
              <span className="hidden md:inline">Upload Data</span>
            </button>

            {/* Local Storage Status Indicator Badge */}
            <button
              onClick={() => setShowStorageModal(true)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-medium transition"
              title="Local storage health & metrics"
            >
              <div
                className={cn(
                  "w-2 h-2 rounded-full",
                  storageUsage?.status === "CRITICAL"
                    ? "bg-rose-500 animate-pulse"
                    : storageUsage?.status === "HIGH"
                    ? "bg-amber-500"
                    : "bg-emerald-500"
                )}
              />
              <span className="hidden lg:inline text-[11px] font-semibold">
                Storage: {storageUsage?.kilobytesUsed || 0} KB
              </span>
            </button>

            {/* Theme Toggle */}
            <button
              onClick={handleToggleTheme}
              className="p-2 rounded-xl text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              title={darkMode ? "Switch to light mode" : "Switch to dark mode"}
            >
              {darkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
            </button>

            {/* Adviser Profile Avatar Pill */}
            <Link
              href="/settings"
              className="flex items-center gap-2 pl-2 pr-3 py-1 rounded-full border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
              title="Adviser Profile & Settings"
            >
              <div className="w-7 h-7 rounded-full bg-[#0B192C] text-white flex items-center justify-center font-bold text-xs">
                {settings?.adviserName
                  ? settings.adviserName
                      .split(" ")
                      .map((n) => n[0])
                      .join("")
                      .substring(0, 2)
                      .toUpperCase()
                  : "AD"}
              </div>
              <div className="text-left hidden xl:block">
                <p className="text-xs font-semibold text-slate-900 dark:text-slate-100 leading-none">
                  {settings?.adviserName || "Adviser"}
                </p>
                <p className="text-[10px] text-teal-600 font-medium leading-tight">
                  SEBI RIA Licensed
                </p>
              </div>
            </Link>
          </div>
        </header>

        {/* BREADCRUMBS & PAGE HEADER */}
        {(breadcrumbs || title || actions) && (
          <div className="px-4 md:px-8 pt-6 pb-2">
            {breadcrumbs && breadcrumbs.length > 0 && (
              <nav className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 mb-2 font-medium">
                {breadcrumbs.map((b, i) => (
                  <React.Fragment key={i}>
                    {i > 0 && <span className="text-slate-400">/</span>}
                    {b.href ? (
                      <Link href={b.href} className="hover:text-slate-900 dark:hover:text-slate-100 transition">
                        {b.label}
                      </Link>
                    ) : (
                      <span className="text-slate-900 dark:text-slate-100 font-semibold">{b.label}</span>
                    )}
                  </React.Fragment>
                ))}
              </nav>
            )}

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                {title && <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">{title}</h1>}
                {description && <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{description}</p>}
              </div>
              {actions && <div className="flex items-center gap-2.5">{actions}</div>}
            </div>
          </div>
        )}

        {/* MAIN BODY CONTENT */}
        <main className="flex-1 px-4 md:px-8 py-6">{children}</main>

        {/* PERSISTENT FOOTER */}
        <footer className="px-4 md:px-8 py-4 border-t border-slate-200/80 dark:border-slate-800 text-xs text-slate-400 dark:text-slate-500 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div>
            <span>ArthaAdvisor • Zeckathon Problem Statement 04: Local-First AI Investment Adviser</span>
          </div>
          <div className="flex items-center gap-3 text-[11px]">
            <span>100% Client-Side Local Storage</span>
            <span>•</span>
            <span>SEBI RIA Fiduciary Rules</span>
          </div>
        </footer>
      </div>

      {/* STORAGE MANAGEMENT MODAL */}
      {showStorageModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-md overflow-hidden text-xs">
            <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/60 dark:bg-slate-800/50">
              <div className="flex items-center gap-2">
                <HardDrive className="w-4 h-4 text-teal-600" />
                <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm">Browser Storage Health</h3>
              </div>
              <button
                onClick={() => setShowStorageModal(false)}
                className="p-1 rounded-md text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {/* Storage Meter */}
              <div>
                <div className="flex items-center justify-between text-xs font-semibold mb-1 text-slate-700 dark:text-slate-300">
                  <span>LocalStorage Used: {storageUsage?.kilobytesUsed || 0} KB</span>
                  <span className="text-teal-600">{storageUsage?.quotaPercent || 0}% of 5 MB</span>
                </div>
                <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-teal-500 h-full rounded-full transition-all"
                    style={{ width: `${Math.max(4, storageUsage?.quotaPercent || 2)}%` }}
                  />
                </div>
                <p className="text-[10px] text-slate-400 mt-1">
                  Status: <strong className="text-emerald-600 font-semibold">{storageUsage?.status || "HEALTHY"}</strong> — All client records, conversations, and reports are saved strictly in your local browser.
                </p>
              </div>

              {/* Counts Breakdown Grid */}
              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700">
                  <p className="text-slate-400">Client Profiles</p>
                  <p className="text-sm font-bold text-slate-900 dark:text-slate-100">{storageUsage?.clientCount || 0}</p>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700">
                  <p className="text-slate-400">Goals Tracked</p>
                  <p className="text-sm font-bold text-slate-900 dark:text-slate-100">{storageUsage?.goalCount || 0}</p>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700">
                  <p className="text-slate-400">Saved AI Conversations</p>
                  <p className="text-sm font-bold text-slate-900 dark:text-slate-100">{storageUsage?.chatCount || 0}</p>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700">
                  <p className="text-slate-400">Generated Reports</p>
                  <p className="text-sm font-bold text-slate-900 dark:text-slate-100">{storageUsage?.reportCount || 0}</p>
                </div>
              </div>

              {/* Actions */}
              <div className="pt-2 flex flex-col gap-2">
                <button
                  onClick={handleDownloadBackup}
                  className="w-full py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-semibold flex items-center justify-center gap-2 transition"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download Backup JSON</span>
                </button>
                <button
                  onClick={handleResetData}
                  className="w-full py-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold flex items-center justify-center gap-2 transition"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reset to 6 Demo Personas</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* DATA UPLOAD MODAL */}
      <DataUploadModal
        isOpen={showUploadModal}
        onClose={() => setShowUploadModal(false)}
        onSuccess={() => {
          refreshAll();
          setShowUploadModal(false);
        }}
      />
    </div>
  );
}
