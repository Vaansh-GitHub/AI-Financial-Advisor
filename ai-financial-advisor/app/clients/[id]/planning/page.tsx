"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import GoalPlanningWizardPage from "@/app/planning/page";

export default function ClientGoalPlanningPage() {
  const params = useParams();
  const id = params?.id as string;

  return (
    <div className="space-y-4">
      <Link
        href={`/clients/${id}`}
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 transition"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        <span>Back to Client Profile</span>
      </Link>
      <GoalPlanningWizardPage />
    </div>
  );
}
