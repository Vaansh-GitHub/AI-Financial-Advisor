import type { Metadata } from "next";
import { Suspense } from "react";
import "./globals.css";
import { AppShell } from "@/components/layout/AppShell";

export const metadata: Metadata = {
  title: "ArthaAdvisor Co-Pilot — 1 Adviser to 1,000 Clients Safely",
  description: "AI Investment Adviser Co-pilot with deterministic financial calculations, suitability guardrails, and audit workflows for Zeckathon Problem Statement 04.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen bg-slate-50 text-slate-900 antialiased dark:bg-[#070E18] dark:text-slate-100">
        <Suspense fallback={<div className="min-h-screen bg-slate-50 dark:bg-[#070E18] flex items-center justify-center text-xs text-slate-400">Loading ArthaAdvisor...</div>}>
          <AppShell>{children}</AppShell>
        </Suspense>
      </body>
    </html>
  );
}
