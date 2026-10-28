import React from "react";
import { cn } from "@/lib/utils";

interface BadgeProps {
  children: React.ReactNode;
  variant?:
    | "default"
    | "success"
    | "warning"
    | "danger"
    | "info"
    | "navy"
    | "teal"
    | "outline";
  className?: string;
  dot?: boolean;
}

export function Badge({ children, variant = "default", className, dot }: BadgeProps) {
  const variantStyles = {
    default: "bg-slate-100 text-slate-700 border-slate-200",
    success: "bg-emerald-50 text-emerald-700 border-emerald-200",
    warning: "bg-amber-50 text-amber-700 border-amber-200",
    danger: "bg-rose-50 text-rose-700 border-rose-200",
    info: "bg-sky-50 text-sky-700 border-sky-200",
    navy: "bg-[#0b192c] text-white border-[#1e3a5f]",
    teal: "bg-teal-50 text-teal-700 border-teal-200",
    outline: "bg-transparent text-slate-600 border-slate-300",
  };

  const dotColors = {
    default: "bg-slate-500",
    success: "bg-emerald-500",
    warning: "bg-amber-500",
    danger: "bg-rose-500",
    info: "bg-sky-500",
    navy: "bg-teal-400",
    teal: "bg-teal-500",
    outline: "bg-slate-400",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold tracking-wide border",
        variantStyles[variant],
        className
      )}
    >
      {dot && <span className={cn("w-1.5 h-1.5 rounded-full", dotColors[variant])} />}
      {children}
    </span>
  );
}

export function StatusBadge({ status }: { status: string }) {
  switch (status) {
    case "APPROVED":
      return <Badge variant="success" dot>Approved</Badge>;
    case "PENDING_REVIEW":
      return <Badge variant="warning" dot>Pending Review</Badge>;
    case "BLOCKED":
      return <Badge variant="danger" dot>Approval Blocked</Badge>;
    case "CHANGES_REQUESTED":
      return <Badge variant="danger" dot>Changes Requested</Badge>;
    case "REJECTED":
      return <Badge variant="danger" dot>Rejected</Badge>;
    case "DRAFT":
      return <Badge variant="default" dot>Draft</Badge>;
    case "COMPLETE":
      return <Badge variant="teal" dot>KYC Complete</Badge>;
    case "INCOMPLETE":
      return <Badge variant="warning" dot>Incomplete Profile</Badge>;
    case "HIGH_RISK":
      return <Badge variant="danger" dot>High Risk</Badge>;
    case "HIGH":
      return <Badge variant="teal">High</Badge>;
    case "MODERATE":
      return <Badge variant="info">Moderate</Badge>;
    case "LOW":
      return <Badge variant="default">Low</Badge>;
    case "CONSERVATIVE":
      return <Badge variant="info">Conservative</Badge>;
    case "GROWTH":
      return <Badge variant="teal">Growth</Badge>;
    case "AGGRESSIVE":
      return <Badge variant="danger">Aggressive</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
}
