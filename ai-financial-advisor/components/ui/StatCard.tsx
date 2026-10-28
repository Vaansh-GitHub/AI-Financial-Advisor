import React from "react";
import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: LucideIcon;
  trend?: {
    value: string;
    isPositive?: boolean;
    isNeutral?: boolean;
  };
  accentColor?: "teal" | "navy" | "amber" | "rose" | "slate";
  className?: string;
  onClick?: () => void;
}

export function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  accentColor = "navy",
  className,
  onClick,
}: StatCardProps) {
  const accentBorders = {
    teal: "border-l-4 border-l-teal-500",
    navy: "border-l-4 border-l-[#0b192c]",
    amber: "border-l-4 border-l-amber-500",
    rose: "border-l-4 border-l-rose-500",
    slate: "border-l-4 border-l-slate-400",
  };

  const iconBg = {
    teal: "bg-teal-50 text-teal-600",
    navy: "bg-slate-100 text-[#0b192c]",
    amber: "bg-amber-50 text-amber-600",
    rose: "bg-rose-50 text-rose-600",
    slate: "bg-slate-100 text-slate-600",
  };

  return (
    <div
      onClick={onClick}
      className={cn(
        "bg-white rounded-xl p-5 border border-slate-200/80 shadow-sm transition-all duration-150",
        accentBorders[accentColor],
        onClick && "cursor-pointer hover:shadow-md hover:border-slate-300",
        className
      )}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-700">{title}</p>
          <h3 className="text-2xl font-bold tracking-tight text-slate-900 mt-1">{value}</h3>
          {subtitle && <p className="text-xs text-slate-600 mt-1">{subtitle}</p>}
        </div>
        {Icon && (
          <div className={cn("p-2.5 rounded-lg", iconBg[accentColor])}>
            <Icon className="w-5 h-5" />
          </div>
        )}
      </div>

      {trend && (
        <div className="mt-3 pt-3 border-t border-slate-100 flex items-center text-xs">
          <span
            className={cn(
              "font-semibold mr-1.5",
              trend.isNeutral
                ? "text-slate-600"
                : trend.isPositive
                ? "text-emerald-600"
                : "text-rose-600"
            )}
          >
            {trend.value}
          </span>
          <span className="text-slate-600">vs last period</span>
        </div>
      )}
    </div>
  );
}
