"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  ArrowLeft,
  UserPlus,
  AlertTriangle,
  Sparkles,
} from "lucide-react";
import { saveClient, saveGoal } from "@/lib/storage/localStorage";
import { formatINR } from "@/lib/utils";
import { EmploymentType, InvestmentExperience, RiskLevel, CapacityLevel } from "@/lib/storage/types";

// Zod Validation Schema for Client Onboarding Form
const clientFormSchema = z.object({
  // Personal Info
  fullName: z.string().min(2, "Full name must be at least 2 characters"),
  email: z.string().email("Valid email address required"),
  phone: z.string().optional().default(""),
  age: z.coerce.number().min(18, "Age must be at least 18").max(100, "Age must be under 100"),
  dateOfBirth: z.string().optional().default(""),
  city: z.string().min(2, "City is required"),
  employmentType: z.enum([
    "salaried_permanent",
    "salaried_contract",
    "self_employed_professional",
    "business_owner",
    "retired",
    "student_or_other",
  ]),

  // Financial Info
  monthlyIncome: z.coerce.number().min(0, "Monthly income cannot be negative"),
  monthlyExpenses: z.coerce.number().min(0, "Monthly expenses cannot be negative"),
  existingSavings: z.coerce.number().min(0, "Savings cannot be negative").default(0),
  emergencyFundAmount: z.coerce.number().min(0, "Emergency fund cannot be negative").default(0),
  existingInvestments: z.coerce.number().min(0, "Existing investments cannot be negative").default(0),
  outstandingLiabilities: z.coerce.number().min(0, "Liabilities cannot be negative").default(0),
  monthlyEMI: z.coerce.number().min(0, "Monthly EMI cannot be negative").default(0),
  numberOfDependants: z.coerce.number().min(0, "Dependants cannot be negative").default(0),

  // Investment Profile
  investmentExperience: z.enum([
    "none_or_beginner",
    "basic_mutual_funds",
    "active_equity_and_debt",
    "advanced_derivatives_or_active_trading",
  ]),
  riskTolerance: z.enum(["CONSERVATIVE", "MODERATE", "AGGRESSIVE"]),
  riskCapacity: z.enum(["LOW", "MODERATE", "HIGH"]),
  investmentHorizonYears: z.coerce.number().min(1).max(40).default(10),
  financialNotes: z.string().optional().default(""),

  // Primary Goal (Optional Quick Creation)
  goalTitle: z.string().optional().default(""),
  goalCurrentCost: z.coerce.number().optional().default(0),
  goalHorizonYears: z.coerce.number().optional().default(5),
  goalPriority: z.enum(["HIGH", "MEDIUM", "LOW"]).optional().default("HIGH"),
});

type ClientFormData = z.infer<typeof clientFormSchema>;

export default function NewClientPage() {
  const router = useRouter();
  const [activeStep, setActiveStep] = useState<1 | 2 | 3>(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<ClientFormData>({
    resolver: zodResolver(clientFormSchema) as any,
    defaultValues: {
      fullName: "",
      email: "",
      phone: "",
      age: "" as any,
      dateOfBirth: "",
      city: "",
      employmentType: "salaried_permanent",
      monthlyIncome: "" as any,
      monthlyExpenses: "" as any,
      existingSavings: "" as any,
      emergencyFundAmount: "" as any,
      existingInvestments: "" as any,
      outstandingLiabilities: "" as any,
      monthlyEMI: "" as any,
      numberOfDependants: "" as any,
      investmentExperience: "basic_mutual_funds",
      riskTolerance: "MODERATE",
      riskCapacity: "MODERATE",
      investmentHorizonYears: "" as any,
      financialNotes: "",
      goalTitle: "",
      goalCurrentCost: "" as any,
      goalHorizonYears: "" as any,
      goalPriority: "HIGH",
    },
  });

  // Watch key values for live calculation metrics
  const watchedIncome = Number(watch("monthlyIncome")) || 0;
  const watchedExpenses = Number(watch("monthlyExpenses")) || 0;
  const watchedEMI = Number(watch("monthlyEMI")) || 0;
  const watchedEmergencyFund = Number(watch("emergencyFundAmount")) || 0;
  const watchedAge = Number(watch("age")) || 0;
  const watchedRiskTolerance = watch("riskTolerance") || "MODERATE";

  const hasCashflowInput = watchedIncome > 0 || watchedExpenses > 0;
  const monthlyBurn = watchedExpenses + watchedEMI;
  const monthlySurplus = watchedIncome - monthlyBurn;
  const savingsRate = watchedIncome > 0 ? Math.round((monthlySurplus / watchedIncome) * 100) : 0;
  const emergencyMonths = monthlyBurn > 0 ? (watchedEmergencyFund / monthlyBurn).toFixed(1) : "0.0";
  const emiRatio = watchedIncome > 0 ? Math.round((watchedEMI / watchedIncome) * 100) : 0;

  // Live Deterministic Capacity Calculation
  let liveCapacityScore = 50;
  if (hasCashflowInput) {
    if (Number(emergencyMonths) >= 6) liveCapacityScore += 20;
    else if (Number(emergencyMonths) < 3) liveCapacityScore -= 15;
    if (emiRatio > 40) liveCapacityScore -= 20;
    else if (emiRatio < 20) liveCapacityScore += 10;
    if (watchedAge > 0 && watchedAge < 40) liveCapacityScore += 15;
    else if (watchedAge > 60) liveCapacityScore -= 15;
    liveCapacityScore = Math.min(100, Math.max(10, liveCapacityScore));
  }

  const liveCapacityLevel: CapacityLevel = !hasCashflowInput
    ? "MODERATE"
    : liveCapacityScore >= 70
    ? "HIGH"
    : liveCapacityScore >= 45
    ? "MODERATE"
    : "LOW";

  // Check for conflict
  const hasConflict =
    hasCashflowInput &&
    ((liveCapacityLevel === "LOW" && watchedRiskTolerance === "AGGRESSIVE") ||
      (liveCapacityLevel === "HIGH" && watchedRiskTolerance === "CONSERVATIVE"));

  // Determine combined category
  let combinedCategory: any = "BALANCED";
  if (liveCapacityLevel === "HIGH" && watchedRiskTolerance === "AGGRESSIVE") combinedCategory = "AGGRESSIVE";
  else if (liveCapacityLevel === "HIGH" || watchedRiskTolerance === "AGGRESSIVE") combinedCategory = "GROWTH";
  else if (liveCapacityLevel === "LOW" || watchedRiskTolerance === "CONSERVATIVE") combinedCategory = "CONSERVATIVE";

  const onSubmit = async (data: ClientFormData) => {
    setIsSubmitting(true);
    try {
      const newClient = saveClient({
        fullName: data.fullName,
        email: data.email,
        phone: data.phone,
        age: data.age,
        dateOfBirth: data.dateOfBirth,
        city: data.city,
        employmentType: data.employmentType as EmploymentType,
        monthlyIncome: data.monthlyIncome,
        monthlyExpenses: data.monthlyExpenses,
        existingSavings: data.existingSavings,
        emergencyFundAmount: data.emergencyFundAmount,
        existingInvestments: data.existingInvestments,
        outstandingLiabilities: data.outstandingLiabilities,
        monthlyEMI: data.monthlyEMI,
        numberOfDependants: data.numberOfDependants,
        investmentExperience: data.investmentExperience as InvestmentExperience,
        riskTolerance: data.riskTolerance as RiskLevel,
        riskCapacity: liveCapacityLevel,
        investmentHorizonYears: data.investmentHorizonYears || 10,
        financialNotes: data.financialNotes,
        riskProfile: {
          toleranceScore: data.riskTolerance === "AGGRESSIVE" ? 85 : data.riskTolerance === "MODERATE" ? 60 : 35,
          toleranceLevel: data.riskTolerance as RiskLevel,
          capacityScore: liveCapacityScore,
          capacityLevel: liveCapacityLevel,
          combinedCategory,
          hasConflict,
          conflictRationale: hasConflict
            ? `Objective loss capacity (${liveCapacityLevel}) does not match behavioral preference (${data.riskTolerance}). Fiduciary safety rules applied.`
            : "Risk tolerance and financial capacity are aligned.",
          recommendedEquityPercent: combinedCategory === "AGGRESSIVE" ? 80 : combinedCategory === "GROWTH" ? 70 : 50,
          recommendedDebtPercent: combinedCategory === "CONSERVATIVE" ? 70 : 35,
          recommendedGoldCashPercent: 10,
          lastAssessedAt: new Date().toISOString(),
        },
      });

      // If user provided a primary goal, save it
      if (data.goalTitle && data.goalTitle.trim()) {
        const horizon = Number(data.goalHorizonYears) || 5;
        const currentCost = Number(data.goalCurrentCost) || 0;
        const targetDate = new Date();
        targetDate.setFullYear(targetDate.getFullYear() + horizon);

        saveGoal({
          clientId: newClient.id,
          title: data.goalTitle.trim(),
          category: "WEALTH_CREATION",
          priority: data.goalPriority || "HIGH",
          currentCost: currentCost,
          targetAmount: currentCost * Math.pow(1.06, horizon),
          targetDate: targetDate.toISOString().split("T")[0],
          targetHorizonYears: horizon,
          expectedInflationRate: 0.06,
          expectedAnnualReturn: combinedCategory === "AGGRESSIVE" ? 0.12 : 0.10,
          existingSavings: 0,
          currentMonthlyContribution: 0,
        });
      }

      router.push(`/clients/${newClient.id}`);
    } catch (err) {
      console.error("Failed to save new client:", err);
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Back button and Header Pill */}
      <div className="flex items-center justify-between">
        <Link
          href="/clients"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 transition"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Client Directory</span>
        </Link>
        <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-teal-50 dark:bg-teal-950/40 text-teal-800 dark:text-teal-300 border border-teal-200 dark:border-teal-800">
          Local-First Client Onboarding
        </span>
      </div>

      <div className="flex flex-col lg:flex-row gap-6 items-start">
        {/* Left Column: Multi-Step Form */}
        <div className="flex-1 bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-6 w-full">
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">Add New Client Profile</h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Enter complete demographic, cashflow, and risk assumptions. Saved directly to local browser storage.
            </p>
          </div>

          {/* Step Pills */}
          <div className="flex rounded-xl bg-slate-100 dark:bg-slate-800 p-1 text-xs">
            <button
              type="button"
              onClick={() => setActiveStep(1)}
              className={`flex-1 py-1.5 rounded-lg font-semibold transition ${
                activeStep === 1
                  ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs"
                  : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
              }`}
            >
              1. Personal Demographics
            </button>
            <button
              type="button"
              onClick={() => setActiveStep(2)}
              className={`flex-1 py-1.5 rounded-lg font-semibold transition ${
                activeStep === 2
                  ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs"
                  : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
              }`}
            >
              2. Financial & Liabilities
            </button>
            <button
              type="button"
              onClick={() => setActiveStep(3)}
              className={`flex-1 py-1.5 rounded-lg font-semibold transition ${
                activeStep === 3
                  ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs"
                  : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
              }`}
            >
              3. Risk & Goals
            </button>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* STEP 1: PERSONAL INFORMATION */}
            {activeStep === 1 && (
              <div className="space-y-4 animate-in fade-in duration-150">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Full Legal Name <span className="text-rose-500">*</span>
                    </label>
                    <input
                      {...register("fullName")}
                      placeholder="Client full name"
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:ring-2 focus:ring-teal-500"
                    />
                    {errors.fullName && (
                      <p className="text-rose-500 text-[11px] mt-1">{errors.fullName.message}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Email Address <span className="text-rose-500">*</span>
                    </label>
                    <input
                      {...register("email")}
                      type="email"
                      placeholder="client@example.com"
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:ring-2 focus:ring-teal-500"
                    />
                    {errors.email && (
                      <p className="text-rose-500 text-[11px] mt-1">{errors.email.message}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Contact Phone</label>
                    <input
                      {...register("phone")}
                      placeholder="+91 ..."
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:ring-2 focus:ring-teal-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">City of Residence</label>
                    <input
                      {...register("city")}
                      placeholder="City name"
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:ring-2 focus:ring-teal-500"
                    />
                    {errors.city && (
                      <p className="text-rose-500 text-[11px] mt-1">{errors.city.message}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Age <span className="text-rose-500">*</span>
                    </label>
                    <input
                      {...register("age")}
                      type="number"
                      placeholder="Age"
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:ring-2 focus:ring-teal-500"
                    />
                    {errors.age && (
                      <p className="text-rose-500 text-[11px] mt-1">{errors.age.message}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Date of Birth</label>
                    <input
                      {...register("dateOfBirth")}
                      type="date"
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-teal-500"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Employment Type</label>
                    <select
                      {...register("employmentType")}
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-teal-500"
                    >
                      <option value="salaried_permanent">Salaried Permanent (MNC / Corporate)</option>
                      <option value="salaried_contract">Salaried Contract / Fixed Term</option>
                      <option value="self_employed_professional">Self Employed Professional (Doctor, Lawyer, CA)</option>
                      <option value="business_owner">MSME / Business Owner</option>
                      <option value="retired">Retired / Pensioner</option>
                      <option value="student_or_other">Student / Other</option>
                    </select>
                  </div>
                </div>

                <div className="pt-4 flex justify-end">
                  <button
                    type="button"
                    onClick={() => setActiveStep(2)}
                    className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-semibold text-xs transition"
                  >
                    Next: Financial Information →
                  </button>
                </div>
              </div>
            )}

            {/* STEP 2: FINANCIAL INFORMATION */}
            {activeStep === 2 && (
              <div className="space-y-4 animate-in fade-in duration-150">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Monthly Take-Home Income (₹) <span className="text-rose-500">*</span>
                    </label>
                    <input
                      {...register("monthlyIncome")}
                      type="number"
                      step={5000}
                      placeholder="0"
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:ring-2 focus:ring-teal-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Monthly Household Expenses (₹) <span className="text-rose-500">*</span>
                    </label>
                    <input
                      {...register("monthlyExpenses")}
                      type="number"
                      step={2000}
                      placeholder="0"
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:ring-2 focus:ring-teal-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Emergency Fund Reserves (₹)
                    </label>
                    <input
                      {...register("emergencyFundAmount")}
                      type="number"
                      step={10000}
                      placeholder="0"
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:ring-2 focus:ring-teal-500"
                    />
                    <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">Liquid bank balances or overnight funds</p>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Existing Bank Savings / FDs (₹)
                    </label>
                    <input
                      {...register("existingSavings")}
                      type="number"
                      step={25000}
                      placeholder="0"
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:ring-2 focus:ring-teal-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Existing Market Investments (₹)
                    </label>
                    <input
                      {...register("existingInvestments")}
                      type="number"
                      step={50000}
                      placeholder="0"
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:ring-2 focus:ring-teal-500"
                    />
                    <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">Mutual funds, equities, bonds, PPF</p>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Outstanding Loans / Debt (₹)
                    </label>
                    <input
                      {...register("outstandingLiabilities")}
                      type="number"
                      step={50000}
                      placeholder="0"
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:ring-2 focus:ring-teal-500"
                    />
                    <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">Home loan, vehicle, personal loan principal</p>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Monthly EMI Obligations (₹)
                    </label>
                    <input
                      {...register("monthlyEMI")}
                      type="number"
                      step={1000}
                      placeholder="0"
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:ring-2 focus:ring-teal-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Number of Dependants</label>
                    <input
                      {...register("numberOfDependants")}
                      type="number"
                      placeholder="0"
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:ring-2 focus:ring-teal-500"
                    />
                  </div>
                </div>

                <div className="pt-4 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => setActiveStep(1)}
                    className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-semibold text-xs hover:bg-slate-50 dark:hover:bg-slate-800"
                  >
                    ← Back
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveStep(3)}
                    className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-semibold text-xs transition"
                  >
                    Next: Risk & Goals →
                  </button>
                </div>
              </div>
            )}

            {/* STEP 3: INVESTMENT PROFILE & INITIAL GOAL */}
            {activeStep === 3 && (
              <div className="space-y-5 animate-in fade-in duration-150">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Investment Experience
                    </label>
                    <select
                      {...register("investmentExperience")}
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-teal-500"
                    >
                      <option value="none_or_beginner">Beginner (Bank FDs only)</option>
                      <option value="basic_mutual_funds">Basic Mutual Funds / SIPs</option>
                      <option value="active_equity_and_debt">Active Equity, Direct Stocks & Debt</option>
                      <option value="advanced_derivatives_or_active_trading">Active F&O / Trading</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Subjective Risk Tolerance
                    </label>
                    <select
                      {...register("riskTolerance")}
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-teal-500"
                    >
                      <option value="CONSERVATIVE">Conservative (Capital preservation priority)</option>
                      <option value="MODERATE">Moderate (Balanced growth & volatility tolerance)</option>
                      <option value="AGGRESSIVE">Aggressive (High growth, high drawdown comfort)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Overall Investment Horizon (Years)
                    </label>
                    <input
                      {...register("investmentHorizonYears")}
                      type="number"
                      placeholder="e.g. 5 or 10"
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:ring-2 focus:ring-teal-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Primary Goal Name
                    </label>
                    <input
                      {...register("goalTitle")}
                      placeholder="e.g. Higher Education or Retirement"
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:ring-2 focus:ring-teal-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Goal Present Cost (₹)
                    </label>
                    <input
                      {...register("goalCurrentCost")}
                      type="number"
                      step={50000}
                      placeholder="0"
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:ring-2 focus:ring-teal-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Goal Target Horizon (Years)
                    </label>
                    <input
                      {...register("goalHorizonYears")}
                      type="number"
                      placeholder="e.g. 5"
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:ring-2 focus:ring-teal-500"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Advisory Notes & Special Circumstances
                    </label>
                    <textarea
                      {...register("financialNotes")}
                      rows={2}
                      placeholder="Notes, tax status, or specific circumstances..."
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:ring-2 focus:ring-teal-500"
                    />
                  </div>
                </div>

                <div className="pt-4 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => setActiveStep(2)}
                    className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-semibold text-xs hover:bg-slate-50 dark:hover:bg-slate-800"
                  >
                    ← Back
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-6 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs shadow-md transition disabled:opacity-50 flex items-center gap-2"
                  >
                    <UserPlus className="w-4 h-4" />
                    <span>{isSubmitting ? "Saving Client..." : "Complete & Save Client Profile"}</span>
                  </button>
                </div>
              </div>
            )}
          </form>
        </div>

        {/* Right Column: Live Deterministic Calculation Preview Panel */}
        <div className="w-full lg:w-80 bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4 shrink-0">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
            <Sparkles className="w-4 h-4 text-teal-600 dark:text-teal-400" />
            <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm">Live Fiduciary Diagnostics</h3>
          </div>

          <div className="space-y-3 text-xs">
            {/* Monthly Surplus */}
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-800">
              <p className="text-slate-400 dark:text-slate-500 text-[10px] uppercase font-semibold">Monthly Disposable Surplus</p>
              <p className="text-base font-bold text-slate-900 dark:text-slate-100 mt-0.5">
                {hasCashflowInput ? formatINR(monthlySurplus) : "₹0"}
              </p>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                {hasCashflowInput ? (
                  <>Savings rate: <strong>{savingsRate}%</strong> of income</>
                ) : (
                  "Enter monthly income & expenses to calculate"
                )}
              </p>
            </div>

            {/* Emergency Reserve */}
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-800">
              <div className="flex items-center justify-between">
                <p className="text-slate-400 dark:text-slate-500 text-[10px] uppercase font-semibold">Emergency Runway</p>
                <span
                  className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                    !hasCashflowInput || monthlyBurn === 0
                      ? "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400"
                      : Number(emergencyMonths) >= 6
                      ? "bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300"
                      : Number(emergencyMonths) >= 3
                      ? "bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300"
                      : "bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300"
                  }`}
                >
                  {hasCashflowInput && monthlyBurn > 0 ? `${emergencyMonths} Months` : "—"}
                </span>
              </div>
              <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 mt-1">
                {watchedEmergencyFund > 0 ? `${formatINR(watchedEmergencyFund)} reserved` : "₹0 reserved"}
              </p>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                {hasCashflowInput && monthlyBurn > 0
                  ? `Target 6mo benchmark: ${formatINR(monthlyBurn * 6)}`
                  : "Target 6mo benchmark: Awaiting monthly expenses"}
              </p>
            </div>

            {/* Debt Ratio */}
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-800">
              <div className="flex items-center justify-between">
                <p className="text-slate-400 dark:text-slate-500 text-[10px] uppercase font-semibold">Debt-to-Income (DTI)</p>
                <span
                  className={`text-[10px] font-bold ${
                    !hasCashflowInput
                      ? "text-slate-500 dark:text-slate-400"
                      : emiRatio > 40
                      ? "text-rose-600 dark:text-rose-400"
                      : "text-slate-800 dark:text-slate-200"
                  }`}
                >
                  {hasCashflowInput ? `${emiRatio}%` : "0%"}
                </span>
              </div>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">
                EMI: {watchedEMI > 0 ? `${formatINR(watchedEMI)}/mo` : "₹0/mo"} • Ceiling: 40%
              </p>
            </div>

            {/* Calculated Risk Capacity */}
            <div className="p-3 rounded-xl bg-teal-50/50 dark:bg-teal-950/40 border border-teal-200/60 dark:border-teal-800/60">
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase font-bold text-teal-800 dark:text-teal-300">
                  Calculated Risk Capacity
                </span>
                <span className="text-xs font-bold text-teal-700 dark:text-teal-400">
                  {hasCashflowInput ? `${liveCapacityLevel} (${liveCapacityScore}/100)` : "Pending (—)"}
                </span>
              </div>
              <p className="text-[10px] text-teal-900/70 dark:text-teal-300/80 mt-1 leading-relaxed">
                Combined category: <strong>{hasCashflowInput ? combinedCategory : "Awaiting cashflow input"}</strong>
              </p>
            </div>

            {/* Conflict Alert */}
            {hasConflict && (
              <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-[11px] text-amber-900 dark:text-amber-200 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                <p>
                  <strong>Conflict Detected</strong>: High capacity with conservative tolerance (or vice versa). Will be flagged on the profile.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
