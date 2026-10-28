"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { ShieldCheck, Lock, Mail, ArrowRight, CheckCircle2, AlertCircle } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("adviser@zeckathon.com");
  const [password, setPassword] = useState("Adviser@12345");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Authentication failed.");
      }

      router.push("/");
      router.refresh();
    } catch (err: any) {
      setError(err.message || "Invalid credentials.");
    } finally {
      setLoading(false);
    }
  };

  const autofill = (role: "adviser" | "admin") => {
    if (role === "adviser") {
      setEmail("adviser@zeckathon.com");
      setPassword("Adviser@12345");
    } else {
      setEmail("admin@zeckathon.com");
      setPassword("Admin@12345");
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col justify-center items-center px-4 py-12 relative overflow-hidden">
      {/* Background Decorative Accents */}
      <div className="absolute top-0 -left-40 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 -right-40 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md z-10">
        {/* Header Branding */}
        <div className="text-center mb-8">
          <div className="w-12 h-12 rounded-xl bg-teal-500 mx-auto flex items-center justify-center shadow-lg shadow-teal-500/20 mb-4">
            <ShieldCheck className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            Artha<span className="text-teal-400">Advisor</span> Co-Pilot
          </h1>
          <p className="text-slate-400 text-xs mt-1">
            Zeckathon PS 04 — Safely Empowering One Adviser to Serve 1,000 Clients
          </p>
        </div>

        {/* Login Card */}
        <div className="bg-slate-800/90 border border-slate-700/80 rounded-2xl p-7 shadow-2xl backdrop-blur-md">
          {error && (
            <div className="mb-5 p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Registered Work Email
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="adviser@zeckathon.com"
                  className="w-full bg-slate-900/80 border border-slate-700 rounded-lg pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-hidden focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Secure Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="••••••••••••"
                  className="w-full bg-slate-900/80 border border-slate-700 rounded-lg pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-hidden focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold py-2.5 px-4 rounded-lg text-xs flex items-center justify-center gap-2 transition disabled:opacity-60 shadow-md shadow-teal-500/20 cursor-pointer"
            >
              {loading ? "Authenticating Adviser..." : "Sign In to Advisory Console"}
              {!loading && <ArrowRight className="w-4 h-4" />}
            </button>
          </form>

          {/* Quick Demo Credentials Autofill */}
          <div className="mt-6 pt-5 border-t border-slate-700/80">
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2.5 text-center">
              Evaluation Demo Credentials
            </p>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => autofill("adviser")}
                className="p-2 rounded-lg bg-slate-900/60 border border-slate-700 hover:border-teal-500/50 text-left transition text-xs group cursor-pointer"
              >
                <div className="flex items-center gap-1.5 text-teal-400 font-semibold text-[11px]">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Adviser Persona</span>
                </div>
                <p className="text-[10px] text-slate-400 mt-0.5 truncate">Priya Sharma, CFA</p>
              </button>

              <button
                type="button"
                onClick={() => autofill("admin")}
                className="p-2 rounded-lg bg-slate-900/60 border border-slate-700 hover:border-blue-500/50 text-left transition text-xs group cursor-pointer"
              >
                <div className="flex items-center gap-1.5 text-blue-400 font-semibold text-[11px]">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Compliance Admin</span>
                </div>
                <p className="text-[10px] text-slate-400 mt-0.5 truncate">Vikram Malhotra</p>
              </button>
            </div>
          </div>
        </div>

        {/* Security & Regulatory Notice */}
        <div className="mt-6 text-center text-slate-500 text-[11px] space-y-1">
          <p>SEBI RIA Safe Harbor Architecture • Role-Based Session Enforcement</p>
          <p className="text-[10px] text-slate-400">All advisory actions immutable & auditable.</p>
        </div>
      </div>
    </div>
  );
}
