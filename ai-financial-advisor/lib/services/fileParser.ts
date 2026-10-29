import { Client, Goal, UploadedFileMeta } from "../storage/types";
import { saveUploadedFileMeta } from "../storage/localStorage";
import { storeFileInIndexedDB } from "../storage/indexedDb";
import { indexUploadedDocument } from "./ragService";

export interface ParsedFinancialData {
  clientUpdates?: Partial<Client>;
  extractedGoals?: Partial<Goal>[];
  summaryText: string;
  recordsCount: number;
  fieldsDetected: string[];
}

/**
 * Extracts readable text streams and page markers from uploaded PDF files
 */
async function extractTextFromPDFFile(
  file: File
): Promise<{
  text: string;
  pages: Array<{ pageNumber: number; text: string }>;
  status: "SUCCESS" | "FAILED_EXTRACTION";
  reason?: string;
}> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);
    const latin1 = new TextDecoder("latin1").decode(bytes);

    // Look for text operators between BT and ET across PDF page objects
    const pageMatches = latin1.split(/\/Type\s*\/Page[^s]/i);
    const pages: Array<{ pageNumber: number; text: string }> = [];

    if (pageMatches.length > 1) {
      pageMatches.slice(1).forEach((pageContent, idx) => {
        const textParts: string[] = [];
        const textRegex = /\(([^)]+)\)\s*Tj/g;
        let m;
        while ((m = textRegex.exec(pageContent)) !== null) {
          textParts.push(m[1]);
        }
        const tjRegex = /\[([^\]]+)\]\s*TJ/g;
        while ((m = tjRegex.exec(pageContent)) !== null) {
          const innerMatches = m[1].match(/\(([^)]+)\)/g);
          if (innerMatches) {
            textParts.push(innerMatches.map((s) => s.slice(1, -1)).join(""));
          }
        }
        const extracted = textParts.join(" ").replace(/\\([()\\])/g, "$1").trim();
        if (extracted) {
          pages.push({ pageNumber: idx + 1, text: extracted });
        }
      });
    }

    if (pages.length === 0) {
      return {
        text: "",
        pages: [],
        status: "FAILED_EXTRACTION",
        reason: "No readable text stream found in PDF (scanned image, encrypted, or compressed raster format).",
      };
    }

    const fullText = pages.map((p) => `[Page ${p.pageNumber}] ${p.text}`).join("\n\n");
    return {
      text: fullText,
      pages,
      status: "SUCCESS",
    };
  } catch (e: any) {
    return {
      text: "",
      pages: [],
      status: "FAILED_EXTRACTION",
      reason: `PDF parsing error: ${e?.message || "Unknown read error"}`,
    };
  }
}

/**
 * Universal Financial Data Parser
 * Supports:
 * 1. JSON profile / data records
 * 2. CSV bank / statement / holding exports
 * 3. PDF statement / factsheet uploads (stores in IndexedDB, indexes metadata, extracts RAG passages)
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
    indexUploadedDocument(fileId, file.name, text, clientId);
  }
  // 2. CSV File Processing
  else if (fileExt === "csv" || file.type.includes("csv")) {
    const text = await file.text();
    parsed = parseCSVContent(text);
    indexUploadedDocument(fileId, file.name, text, clientId);
  }
  // 3. PDF File Processing
  else if (fileExt === "pdf" || file.type.includes("pdf")) {
    // Store binary in IndexedDB
    await storeFileInIndexedDB(fileId, file.name, file.type, file);
    const pdfData = await extractTextFromPDFFile(file);

    if (pdfData.status === "FAILED_EXTRACTION") {
      parsed = {
        summaryText: `Uploaded PDF "${file.name}" stored in IndexedDB. Text extraction unviable: ${pdfData.reason}`,
        recordsCount: 0,
        fieldsDetected: ["Binary Stored in IndexedDB"],
      };
    } else {
      parsed = {
        summaryText: `Uploaded PDF "${file.name}" (${Math.round(file.size / 1024)} KB, ${pdfData.pages.length} pages verified). Ready for RAG grounding citations.`,
        recordsCount: pdfData.pages.length,
        fieldsDetected: ["Document Name", "Page Snippets", "RAG Passages", "PDF Storage"],
      };
      indexUploadedDocument(fileId, file.name, pdfData.text, clientId, pdfData.pages);
    }
  } else {
    // Generic text/data fallback
    const text = await file.text();
    parsed = {
      summaryText: `Parsed ${file.name} (${Math.round(file.size / 1024)} KB text content).`,
      recordsCount: 1,
      fieldsDetected: ["Raw Text"],
    };
    indexUploadedDocument(fileId, file.name, text, clientId);
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

