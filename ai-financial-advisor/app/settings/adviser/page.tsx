"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  User,
  ShieldCheck,
  CheckCircle2,
  Mail,
  Phone,
  Building,
  Target,
  Sliders,
  Bell,
} from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { StatCard } from "@/components/ui/StatCard";

export default function AdviserSettingsPage() {
  const [name, setName] = useState("Priya Sharma, CFA");
  const [email, setEmail] = useState("adviser@zeckathon.com");
  const [riaNumber, setRiaNumber] = useState("INA000019842");
  const [phone, setPhone] = useState("+91 98201 55443");
  const [capacityTarget, setCapacityTarget] = useState(1000);
  const [currentClients, setCurrentClients] = useState(6);
  const [saved, setSaved] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Adviser Profile & Capacity Management
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Registered Investment Adviser credentials, fiduciary boundaries, and 1,000-client capacity controls.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/settings/app"
            className="px-3.5 py-1.5 border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold text-xs rounded-lg transition"
          >
            System Settings →
          </Link>
        </div>
      </div>

      {saved && (
        <div className="p-3.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>Adviser profile settings updated successfully.</span>
        </div>
      )}

      {/* Capacity Utilization Progress Card */}
      <div className="bg-gradient-to-br from-[#0b192c] to-[#152945] rounded-xl p-6 text-white shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-teal-400 uppercase tracking-wider block">
              1,000 Client Fiduciary Scaling Gauge
            </span>
            <h3 className="text-lg font-bold text-white mt-0.5">
              Current Load: {currentClients} / {capacityTarget} Clients
            </h3>
          </div>
          <span className="text-xs px-2.5 py-1 rounded-full bg-teal-500/20 text-teal-300 font-bold border border-teal-500/30">
            Capacity Headroom: 99.4%
          </span>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-slate-800 rounded-full h-3 overflow-hidden p-0.5 border border-slate-700">
          <div
            className="bg-teal-500 h-full rounded-full transition-all duration-500"
            style={{ width: `${Math.max(1, (currentClients / capacityTarget) * 100)}%` }}
          />
        </div>

        <p className="text-[11px] text-slate-300 leading-relaxed">
          The deterministic safety engine auto-validates 100% of suitability criteria across all 1,000 clients, allowing one adviser to manage high volumes while maintaining SEBI fiduciary audit compliance.
        </p>
      </div>

      {/* Profile Form */}
      <form onSubmit={handleSave} className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-5">
        <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2 flex items-center gap-2">
          <User className="w-4 h-4 text-teal-600" />
          <span>Professional RIA Credentials</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Adviser Full Name *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 focus:outline-hidden focus:border-teal-500"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">SEBI RIA Registration Number *</label>
            <input
              type="text"
              value={riaNumber}
              onChange={(e) => setRiaNumber(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 font-mono focus:outline-hidden focus:border-teal-500"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Email Address *</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 focus:outline-hidden focus:border-teal-500"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Official Contact Phone *</label>
            <input
              type="text"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 focus:outline-hidden focus:border-teal-500"
            />
          </div>
        </div>

        <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <ShieldCheck className="w-4 h-4 text-teal-600" />
            <span>Digital signature attached to approved plans</span>
          </div>

          <button
            type="submit"
            className="px-4 py-2 bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs rounded-lg transition shadow-xs cursor-pointer"
          >
            Save Profile Credentials
          </button>
        </div>
      </form>
    </div>
  );
}
