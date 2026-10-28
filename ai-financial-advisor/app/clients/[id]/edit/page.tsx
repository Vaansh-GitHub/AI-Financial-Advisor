"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { ArrowLeft, Save, ShieldCheck, AlertCircle, CheckCircle2 } from "lucide-react";
import { getClientById, updateClient } from "@/lib/storage/localStorage";
import { EmploymentType, InvestmentExperience, RiskLevel, CapacityLevel } from "@/lib/storage/types";

const editClientSchema = z.object({
  fullName: z.string().min(2, "Full name must be at least 2 characters"),
  email: z.string().email("Valid email address required"),
  phone: z.string().optional().default(""),
  age: z.coerce.number().min(18).max(100),
  city: z.string().min(2, "City is required"),
  employmentType: z.enum([
    "salaried_permanent",
    "salaried_contract",
    "self_employed_professional",
    "business_owner",
    "retired",
    "student_or_other",
  ]),
  monthlyIncome: z.coerce.number().min(0),
  monthlyExpenses: z.coerce.number().min(0),
  existingSavings: z.coerce.number().min(0),
  emergencyFundAmount: z.coerce.number().min(0),
  existingInvestments: z.coerce.number().min(0),
  outstandingLiabilities: z.coerce.number().min(0),
  monthlyEMI: z.coerce.number().min(0),
  numberOfDependants: z.coerce.number().min(0),
  investmentExperience: z.enum([
    "none_or_beginner",
    "basic_mutual_funds",
    "active_equity_and_debt",
    "advanced_derivatives_or_active_trading",
  ]),
  riskTolerance: z.enum(["CONSERVATIVE", "MODERATE", "AGGRESSIVE"]),
  investmentHorizonYears: z.coerce.number().min(1).max(40),
  financialNotes: z.string().optional().default(""),
});

type EditFormData = z.infer<typeof editClientSchema>;

export default function EditClientPage() {
  const params = useParams();
  const router = useRouter();
  const clientId = params?.id as string;
  const [isSaved, setIsSaved] = useState(false);
  const [client, setClient] = useState<any>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const initializedIdRef = React.useRef<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<EditFormData>({
    resolver: zodResolver(editClientSchema) as any,
  });

  useEffect(() => {
    if (clientId && initializedIdRef.current !== clientId) {
      initializedIdRef.current = clientId;
      const data = getClientById(clientId);
      setClient(data);
      setIsLoaded(true);
      if (data) {
        reset({
          fullName: data.fullName,
          email: data.email,
          phone: data.phone || "",
          age: data.age,
          city: data.city,
          employmentType: data.employmentType,
          monthlyIncome: data.monthlyIncome,
          monthlyExpenses: data.monthlyExpenses,
          existingSavings: data.existingSavings,
          emergencyFundAmount: data.emergencyFundAmount,
          existingInvestments: data.existingInvestments,
          outstandingLiabilities: data.outstandingLiabilities,
          monthlyEMI: data.monthlyEMI,
          numberOfDependants: data.numberOfDependants,
          investmentExperience: data.investmentExperience,
          riskTolerance: data.riskTolerance || (data.riskProfile?.toleranceLevel as any) || "MODERATE",
          investmentHorizonYears: data.investmentHorizonYears,
          financialNotes: data.financialNotes || "",
        });
      }
    }
  }, [clientId, reset]);

  if (!isLoaded) {
    return (
      <div className="py-20 text-center text-xs text-slate-500">
        Loading client profile...
      </div>
    );
  }

  if (!client) {
    return (
      <div className="py-20 text-center space-y-4">
        <AlertCircle className="w-10 h-10 text-rose-500 mx-auto" />
        <h2 className="text-base font-bold text-slate-800">Client Not Found</h2>
        <Link href="/clients" className="text-xs text-teal-600 font-semibold hover:underline">
          Return to Clients
        </Link>
      </div>
    );
  }

  const onSubmit = (data: EditFormData) => {
    // Recalculate capacity score based on updated financial figures
    const monthlyBurn = data.monthlyExpenses + data.monthlyEMI;
    const emergencyMonths = monthlyBurn > 0 ? data.emergencyFundAmount / monthlyBurn : 0;
    const emiRatio = data.monthlyIncome > 0 ? (data.monthlyEMI / data.monthlyIncome) * 100 : 0;

    let capacityScore = 50;
    if (emergencyMonths >= 6) capacityScore += 20;
    else if (emergencyMonths < 3) capacityScore -= 15;
    if (emiRatio > 40) capacityScore -= 20;
    else if (emiRatio < 20) capacityScore += 10;
    if (data.age < 40) capacityScore += 15;
    else if (data.age > 60) capacityScore -= 15;
    capacityScore = Math.min(100, Math.max(10, capacityScore));

    const capacityLevel: CapacityLevel =
      capacityScore >= 70 ? "HIGH" : capacityScore >= 45 ? "MODERATE" : "LOW";

    const hasConflict =
      (capacityLevel === "LOW" && data.riskTolerance === "AGGRESSIVE") ||
      (capacityLevel === "HIGH" && data.riskTolerance === "CONSERVATIVE");

    let combinedCategory: any = "BALANCED";
    if (capacityLevel === "HIGH" && data.riskTolerance === "AGGRESSIVE") combinedCategory = "AGGRESSIVE";
    else if (capacityLevel === "HIGH" || data.riskTolerance === "AGGRESSIVE") combinedCategory = "GROWTH";
    else if (capacityLevel === "LOW" || data.riskTolerance === "CONSERVATIVE") combinedCategory = "CONSERVATIVE";

    updateClient(clientId, {
      ...data,
      riskCapacity: capacityLevel,
      riskProfile: {
        ...client.riskProfile,
        capacityScore,
        capacityLevel,
        toleranceScore: data.riskTolerance === "AGGRESSIVE" ? 85 : data.riskTolerance === "MODERATE" ? 60 : 35,
        toleranceLevel: data.riskTolerance,
        combinedCategory,
        hasConflict,
        conflictRationale: hasConflict
          ? `Objective loss capacity (${capacityLevel}) constrains behavioral tolerance (${data.riskTolerance}). Fiduciary safety rules apply.`
          : "Risk profile harmonized.",
        recommendedEquityPercent: combinedCategory === "AGGRESSIVE" ? 80 : combinedCategory === "GROWTH" ? 70 : 50,
        recommendedDebtPercent: combinedCategory === "CONSERVATIVE" ? 70 : 35,
        recommendedGoldCashPercent: 10,
        lastAssessedAt: new Date().toISOString(),
      },
    });

    setIsSaved(true);
    setTimeout(() => {
      router.push(`/clients/${clientId}`);
    }, 600);
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Back button */}
      <div className="flex items-center justify-between">
        <Link
          href={`/clients/${clientId}`}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 transition"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Profile</span>
        </Link>
        <span className="text-xs font-semibold text-slate-400">Editing: {client.fullName}</span>
      </div>

      <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs space-y-6">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Edit Client Profile</h1>
          <p className="text-xs text-slate-500 mt-1">
            Update personal demographics, income, commitments, and risk preferences.
          </p>
        </div>

        {isSaved && (
          <div className="p-3 bg-emerald-50 text-emerald-800 rounded-xl border border-emerald-200 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>Profile successfully updated in local storage! Redirecting...</span>
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 text-xs">
          {/* Section 1: Personal */}
          <div className="space-y-3">
            <h3 className="font-bold text-sm text-slate-800 border-b border-slate-100 pb-2">
              1. Personal Demographics
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Full Legal Name</label>
                <input
                  {...register("fullName")}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs"
                />
                {errors.fullName && <p className="text-rose-500 text-[10px] mt-1">{errors.fullName.message}</p>}
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Email Address</label>
                <input
                  {...register("email")}
                  type="email"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Phone Number</label>
                <input
                  {...register("phone")}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">City</label>
                <input
                  {...register("city")}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Age</label>
                <input
                  {...register("age")}
                  type="number"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Employment Type</label>
                <select
                  {...register("employmentType")}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs"
                >
                  <option value="salaried_permanent">Salaried Permanent</option>
                  <option value="salaried_contract">Salaried Contract</option>
                  <option value="self_employed_professional">Self Employed Professional</option>
                  <option value="business_owner">Business Owner</option>
                  <option value="retired">Retired</option>
                  <option value="student_or_other">Student / Other</option>
                </select>
              </div>
            </div>
          </div>

          {/* Section 2: Financial */}
          <div className="space-y-3">
            <h3 className="font-bold text-sm text-slate-800 border-b border-slate-100 pb-2">
              2. Financial Position & Cashflow
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Monthly Income (₹)</label>
                <input
                  {...register("monthlyIncome")}
                  type="number"
                  step={5000}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Monthly Expenses (₹)</label>
                <input
                  {...register("monthlyExpenses")}
                  type="number"
                  step={2000}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Monthly EMI Obligations (₹)</label>
                <input
                  {...register("monthlyEMI")}
                  type="number"
                  step={1000}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Emergency Fund Reserves (₹)</label>
                <input
                  {...register("emergencyFundAmount")}
                  type="number"
                  step={10000}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Bank Savings / FDs (₹)</label>
                <input
                  {...register("existingSavings")}
                  type="number"
                  step={25000}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Investments (Mutual Funds / Stocks) (₹)</label>
                <input
                  {...register("existingInvestments")}
                  type="number"
                  step={50000}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Outstanding Loans / Debt (₹)</label>
                <input
                  {...register("outstandingLiabilities")}
                  type="number"
                  step={50000}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Number of Dependants</label>
                <input
                  {...register("numberOfDependants")}
                  type="number"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Investment Horizon (Years)</label>
                <input
                  {...register("investmentHorizonYears")}
                  type="number"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs"
                />
              </div>
            </div>
          </div>

          {/* Section 3: Risk Profile & Notes */}
          <div className="space-y-3">
            <h3 className="font-bold text-sm text-slate-800 border-b border-slate-100 pb-2">
              3. Investment Profile & Advising Notes
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Investment Experience</label>
                <select
                  {...register("investmentExperience")}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs"
                >
                  <option value="none_or_beginner">Beginner (FDs only)</option>
                  <option value="basic_mutual_funds">Basic Mutual Funds / SIPs</option>
                  <option value="active_equity_and_debt">Active Equity & Debt</option>
                  <option value="advanced_derivatives_or_active_trading">Active F&O / Trading</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Risk Tolerance</label>
                <select
                  {...register("riskTolerance")}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs"
                >
                  <option value="CONSERVATIVE">Conservative</option>
                  <option value="MODERATE">Moderate</option>
                  <option value="AGGRESSIVE">Aggressive</option>
                </select>
              </div>

              <div className="sm:col-span-2">
                <label className="block font-semibold text-slate-700 mb-1">Adviser Notes</label>
                <textarea
                  {...register("financialNotes")}
                  rows={2}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs"
                />
              </div>
            </div>
          </div>

          <div className="pt-4 flex items-center justify-between border-t border-slate-100">
            <Link
              href={`/clients/${clientId}`}
              className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 font-semibold text-xs hover:bg-slate-50"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs shadow-md transition disabled:opacity-50 flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              <span>{isSubmitting ? "Saving Updates..." : "Save Profile Changes"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
