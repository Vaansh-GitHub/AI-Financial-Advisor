import { Client, Goal, UploadedFileMeta } from "../storage/types";
import { saveUploadedFileMeta } from "../storage/localStorage";
import { storeFileInIndexedDB } from "../storage/indexedDb";

export interface ParsedFinancialData {
  clientUpdates?: Partial<Client>;
  extractedGoals?: Partial<Goal>[];
  summaryText: string;
  recordsCount: number;
  fieldsDetected: string[];
}

/**
 * Universal Financial Data Parser
 * Supports:
 * 1. JSON profile / data records
 * 2. CSV bank / statement / holding exports
 * 3. PDF statement / factsheet uploads (stores in IndexedDB, indexes metadata)
 */

export async function parseUploadedFile(
  file: File,
  clientId?: string,
  clientName?: string
): Promise<{ meta: UploadedFileMeta; parsed: ParsedFinancialData }> {
  const fileExt = file.name.split(".").pop()?.toLowerCase();
  const fileId = `file_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

  let parsed: ParsedFinancialData = {
    summaryText: "",
    recordsCount: 0,
    fieldsDetected: [],
  };

  // 1. JSON File Processing
  if (fileExt === "json" || file.type.includes("json")) {
    const text = await file.text();
    parsed = parseJSONContent(text);
  }
  // 2. CSV File Processing
  else if (fileExt === "csv" || file.type.includes("csv")) {
    const text = await file.text();
    parsed = parseCSVContent(text);
  }
  // 3. PDF File Processing
  else if (fileExt === "pdf" || file.type.includes("pdf")) {
    // Store binary in IndexedDB
    await storeFileInIndexedDB(fileId, file.name, file.type, file);

    parsed = {
      summaryText: `Uploaded PDF document "${file.name}" (${Math.round(file.size / 1024)} KB). Stored safely in local IndexedDB. Ready for document review.`,
      recordsCount: 1,
      fieldsDetected: ["Document Name", "File Size", "PDF Blob Storage"],
    };
  } else {
    // Generic text/data fallback
    const text = await file.text();
    parsed = {
      summaryText: `Parsed ${file.name} (${Math.round(file.size / 1024)} KB text content).`,
      recordsCount: 1,
      fieldsDetected: ["Raw Text"],
    };
  }

  // Save metadata to LocalStorage
  const meta = saveUploadedFileMeta({
    id: fileId,
    clientId,
    clientName,
    fileName: file.name,
    fileType: fileExt?.toUpperCase() as any || "PDF",
    fileSizeBytes: file.size,
    summary: parsed.summaryText,
    parsedSummary: {
      recordsCount: parsed.recordsCount,
      fieldsExtracted: parsed.fieldsDetected,
      notes: parsed.summaryText,
    },
  });

  return { meta, parsed };
}

/**
 * Parses JSON content into client fields and goals
 */
export function parseJSONContent(jsonString: string): ParsedFinancialData {
  try {
    const raw = JSON.parse(jsonString);
    const data = Array.isArray(raw) ? raw[0] : raw;

    const clientUpdates: Partial<Client> = {};
    const extractedGoals: Partial<Goal>[] = [];
    const fieldsDetected: string[] = [];

    // Map common financial keys
    if (data.fullName || data.name) {
      clientUpdates.fullName = data.fullName || data.name;
      fieldsDetected.push("fullName");
    }
    if (data.email) {
      clientUpdates.email = data.email;
      fieldsDetected.push("email");
    }
    if (data.phone || data.mobile) {
      clientUpdates.phone = data.phone || data.mobile;
      fieldsDetected.push("phone");
    }
    if (data.city) {
      clientUpdates.city = data.city;
      fieldsDetected.push("city");
    }
    if (data.age) {
      clientUpdates.age = Number(data.age);
      fieldsDetected.push("age");
    }
    if (data.monthlyIncome || data.income) {
      clientUpdates.monthlyIncome = Number(data.monthlyIncome || data.income);
      fieldsDetected.push("monthlyIncome");
    }
    if (data.monthlyExpenses || data.expenses) {
      clientUpdates.monthlyExpenses = Number(data.monthlyExpenses || data.expenses);
      fieldsDetected.push("monthlyExpenses");
    }
    if (data.existingSavings || data.savings) {
      clientUpdates.existingSavings = Number(data.existingSavings || data.savings);
      fieldsDetected.push("existingSavings");
    }
    if (data.emergencyFundAmount || data.emergencyFund) {
      clientUpdates.emergencyFundAmount = Number(data.emergencyFundAmount || data.emergencyFund);
      fieldsDetected.push("emergencyFundAmount");
    }
    if (data.existingInvestments || data.investments) {
      clientUpdates.existingInvestments = Number(data.existingInvestments || data.investments);
      fieldsDetected.push("existingInvestments");
    }
    if (data.outstandingLiabilities || data.loans || data.debt) {
      clientUpdates.outstandingLiabilities = Number(data.outstandingLiabilities || data.loans || data.debt);
      fieldsDetected.push("outstandingLiabilities");
    }
    if (data.monthlyEMI || data.emi) {
      clientUpdates.monthlyEMI = Number(data.monthlyEMI || data.emi);
      fieldsDetected.push("monthlyEMI");
    }

    if (Array.isArray(data.goals)) {
      data.goals.forEach((g: any, idx: number) => {
        extractedGoals.push({
          title: g.title || g.name || `Goal ${idx + 1}`,
          category: g.category || "WEALTH_CREATION",
          currentCost: Number(g.currentCost || g.targetAmount || 1000000),
          targetHorizonYears: Number(g.targetHorizonYears || g.years || 5),
          expectedInflationRate: Number(g.expectedInflationRate || 0.06),
          expectedAnnualReturn: Number(g.expectedAnnualReturn || 0.12),
          existingSavings: Number(g.existingSavings || 0),
          currentMonthlyContribution: Number(g.currentMonthlyContribution || 0),
          priority: g.priority || "MEDIUM",
        });
      });
      fieldsDetected.push(`goals (${extractedGoals.length})`);
    }

    return {
      clientUpdates,
      extractedGoals,
      recordsCount: 1 + extractedGoals.length,
      fieldsDetected,
      summaryText: `Successfully parsed JSON record with ${fieldsDetected.length} fields detected (${fieldsDetected.join(
        ", "
      )}).`,
    };
  } catch (err: any) {
    return {
      recordsCount: 0,
      fieldsDetected: [],
      summaryText: `Failed to parse JSON: ${err?.message || "Invalid syntax"}`,
    };
  }
}

/**
 * Parses CSV statements or ledgers
 */
export function parseCSVContent(csvString: string): ParsedFinancialData {
  try {
    const lines = csvString
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);

    if (lines.length < 2) {
      return {
        recordsCount: 0,
        fieldsDetected: [],
        summaryText: "CSV file is empty or missing headers.",
      };
    }

    const headers = lines[0].split(",").map((h) => h.trim().toLowerCase().replace(/"/g, ""));
    const records = lines.slice(1);

    // Identify common columns: amount, type/category, description, date
    let totalIncome = 0;
    let totalExpenses = 0;
    let totalInvestments = 0;

    const amountIdx = headers.findIndex((h) => h.includes("amount") || h.includes("value") || h.includes("total"));
    const typeIdx = headers.findIndex((h) => h.includes("type") || h.includes("category") || h.includes("desc"));

    if (amountIdx !== -1) {
      records.forEach((row) => {
        const cols = row.split(",").map((c) => c.trim().replace(/"/g, ""));
        const amt = parseFloat(cols[amountIdx]);
        if (!isNaN(amt)) {
          const typeStr = (cols[typeIdx] || "").toLowerCase();
          if (typeStr.includes("income") || typeStr.includes("salary") || typeStr.includes("credit") || amt > 0) {
            totalIncome += Math.abs(amt);
          } else if (typeStr.includes("invest") || typeStr.includes("sip") || typeStr.includes("mutual")) {
            totalInvestments += Math.abs(amt);
          } else {
            totalExpenses += Math.abs(amt);
          }
        }
      });
    }

    const clientUpdates: Partial<Client> = {};
    if (totalIncome > 0) clientUpdates.monthlyIncome = Math.round(totalIncome);
    if (totalExpenses > 0) clientUpdates.monthlyExpenses = Math.round(totalExpenses);
    if (totalInvestments > 0) clientUpdates.existingInvestments = Math.round(totalInvestments);

    return {
      clientUpdates,
      recordsCount: records.length,
      fieldsDetected: headers,
      summaryText: `Parsed CSV with ${records.length} transactions across columns: ${headers.join(", ")}. Extracted Income: ₹${totalIncome.toLocaleString(
        "en-IN"
      )}, Expenses: ₹${totalExpenses.toLocaleString("en-IN")}.`,
    };
  } catch (err: any) {
    return {
      recordsCount: 0,
      fieldsDetected: [],
      summaryText: `CSV parsing error: ${err?.message || "Invalid formatting"}`,
    };
  }
}

