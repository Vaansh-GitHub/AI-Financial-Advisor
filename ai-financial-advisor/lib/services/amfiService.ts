/**
 * AMFI Live Mutual Fund Data Service
 * Official data source: https://portal.amfiindia.com/spages/NAVAll.txt
 * 
 * Fetches, safely parses, normalizes, and caches real-time AMFI NAV records.
 * Follows strict SEBI RIA fiduciary rules:
 * - Real data only: Never fabricates NAVs or creates fake sample funds.
 * - Clear boundaries: NAVAll.txt contains Scheme Code, ISIN, Scheme Name, NAV, Date, Plan, Option.
 *   It does NOT contain Expense Ratio (TER), AUM, rolling returns, or portfolio holdings.
 */

export interface AmfiSchemeRecord {
  schemeCode: string;
  isinGrowth: string;
  isinReinvestment: string;
  schemeName: string;
  planType: "Direct" | "Regular" | "Other";
  optionType: "Growth" | "IDCW" | "Other";
  nav: number | null;
  navDate: string;
  category: string;
  amc: string;
}

export interface AmfiFeedResponse {
  success: boolean;
  schemes: AmfiSchemeRecord[];
  totalSchemes: number;
  filteredCount: number;
  lastFetchedAt: string;
  latestDataDate: string;
  source: string;
  fromCache: boolean;
  error?: string;
}

export interface AmfiFilterOptions {
  search?: string;
  plan?: "Direct" | "Regular" | "All";
  option?: "Growth" | "IDCW" | "All";
  category?: string;
  amc?: string;
  limit?: number;
  offset?: number;
}

interface CacheState {
  schemes: AmfiSchemeRecord[];
  fetchedAt: number;
  latestDataDate: string;
}

// In-memory server-side cache (15 minutes TTL)
let amfiCache: CacheState | null = null;
const CACHE_TTL_MS = 15 * 60 * 1000;
const AMFI_FEED_URL = "https://portal.amfiindia.com/spages/NAVAll.txt";

/**
 * Clean malformed characters from AMFI raw text (e.g. ?? or encoding glitches)
 */
function cleanAmfiText(text: string): string {
  return text
    .replace(/\uFFFD+/g, " ")
    .replace(/\?\?+/g, " ")
    .replace(/[^\x20-\x7E\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Safely parse the semicolon-delimited AMFI NAVAll.txt raw text
 */
export function parseAmfiNavAll(rawText: string): { schemes: AmfiSchemeRecord[]; latestDataDate: string } {
  if (!rawText || typeof rawText !== "string") {
    return { schemes: [], latestDataDate: "" };
  }

  const lines = rawText.split(/\r?\n/);
  const schemes: AmfiSchemeRecord[] = [];
  let currentCategory = "Other Schemes";
  let currentAmc = "General Mutual Fund";
  let latestDataDate = "";

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i].trim();
    if (!rawLine) continue;

    // Skip the main CSV header
    if (rawLine.startsWith("Scheme Code;")) continue;

    // Detect section headers (lines without semicolons)
    if (!rawLine.includes(";")) {
      const cleaned = cleanAmfiText(rawLine);
      if (
        cleaned.startsWith("Open Ended Schemes") ||
        cleaned.startsWith("Close Ended Schemes") ||
        cleaned.startsWith("Interval Fund")
      ) {
        currentCategory = cleaned;
      } else if (cleaned.length > 2) {
        currentAmc = cleaned;
      }
      continue;
    }

    // Split semicolon-delimited row
    const parts = rawLine.split(";").map((p) => cleanAmfiText(p));
    if (parts.length < 5) continue;

    const schemeCode = parts[0]?.trim();
    if (!schemeCode || isNaN(Number(schemeCode))) continue;

    let isinGrowth = parts[1] || "-";
    let isinReinvestment = parts[2] || "-";
    let schemeName = parts[3] || "";
    let rawPlan = "";
    let rawOption = "";
    let navStr = "";
    let navDate = "";

    if (parts.length >= 8) {
      // Standard 8-column format
      rawPlan = parts[4] || "";
      rawOption = parts[5] || "";
      navStr = parts[6] || "";
      navDate = parts[7] || "";
    } else if (parts.length === 6) {
      // 6-column format
      navStr = parts[4] || "";
      navDate = parts[5] || "";
    } else if (parts.length === 7) {
      // 7-column variation
      rawPlan = parts[4] || "";
      navStr = parts[5] || "";
      navDate = parts[6] || "";
    }

    if (!navDate && parts.length > 5) {
      navDate = parts[parts.length - 1];
    }

    // Parse NAV
    const parsedNav = parseFloat(navStr);
    const nav = !isNaN(parsedNav) && parsedNav > 0 ? parsedNav : null;

    // Detect Plan Type
    const combinedForPlan = `${rawPlan} ${schemeName}`.toLowerCase();
    let planType: "Direct" | "Regular" | "Other" = "Other";
    if (combinedForPlan.includes("direct")) {
      planType = "Direct";
    } else if (combinedForPlan.includes("regular")) {
      planType = "Regular";
    }

    // Detect Option Type
    const combinedForOption = `${rawOption} ${schemeName}`.toLowerCase();
    let optionType: "Growth" | "IDCW" | "Other" = "Other";
    if (combinedForOption.includes("growth")) {
      optionType = "Growth";
    } else if (
      combinedForOption.includes("idcw") ||
      combinedForOption.includes("dividend") ||
      combinedForOption.includes("payout") ||
      combinedForOption.includes("reinvestment")
    ) {
      optionType = "IDCW";
    }

    // Track latest date seen
    if (navDate && !latestDataDate) {
      latestDataDate = navDate;
    }

    schemes.push({
      schemeCode,
      isinGrowth: isinGrowth === "-" ? "" : isinGrowth,
      isinReinvestment: isinReinvestment === "-" ? "" : isinReinvestment,
      schemeName,
      planType,
      optionType,
      nav,
      navDate,
      category: currentCategory,
      amc: currentAmc,
    });
  }

  return { schemes, latestDataDate };
}

/**
 * Fetch live data from AMFI or return in-memory cached results
 */
export async function getLiveAmfiSchemes(forceRefresh = false): Promise<{
  schemes: AmfiSchemeRecord[];
  fromCache: boolean;
  latestDataDate: string;
  lastFetchedAt: string;
}> {
  const now = Date.now();

  if (!forceRefresh && amfiCache && now - amfiCache.fetchedAt < CACHE_TTL_MS) {
    return {
      schemes: amfiCache.schemes,
      fromCache: true,
      latestDataDate: amfiCache.latestDataDate,
      lastFetchedAt: new Date(amfiCache.fetchedAt).toISOString(),
    };
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 12000);

  try {
    const res = await fetch(AMFI_FEED_URL, {
      signal: controller.signal,
      headers: {
        "User-Agent": "ArthaAdvisor-Copilot/1.0 (SEBI RIA Certified Advisory System)",
        Accept: "text/plain, */*",
      },
      next: { revalidate: 900 }, // 15 min Next.js fetch revalidation
    });

    clearTimeout(timeoutId);

    if (!res.ok) {
      throw new Error(`AMFI portal returned HTTP status ${res.status}: ${res.statusText}`);
    }

    const text = await res.text();
    if (!text || text.length < 500) {
      throw new Error("AMFI feed returned an empty or truncated response.");
    }

    const { schemes, latestDataDate } = parseAmfiNavAll(text);

    if (schemes.length === 0) {
      throw new Error("Parsed 0 records from AMFI feed. File may be malformed or undergoing maintenance.");
    }

    amfiCache = {
      schemes,
      fetchedAt: now,
      latestDataDate: latestDataDate || new Date().toISOString().split("T")[0],
    };

    return {
      schemes,
      fromCache: false,
      latestDataDate: amfiCache.latestDataDate,
      lastFetchedAt: new Date(now).toISOString(),
    };
  } catch (err: any) {
    clearTimeout(timeoutId);

    // If fetch failed but we have previous cached data, return it with a note
    if (amfiCache && amfiCache.schemes.length > 0) {
      return {
        schemes: amfiCache.schemes,
        fromCache: true,
        latestDataDate: amfiCache.latestDataDate,
        lastFetchedAt: new Date(amfiCache.fetchedAt).toISOString(),
      };
    }

    // Do NOT invent fake NAVs. Report exact error to caller.
    throw new Error(
      `Unable to fetch live AMFI NAV feed (${err.message || "Network timeout"}). Official source: ${AMFI_FEED_URL}`
    );
  }
}

/**
 * Filter and search through parsed AMFI schemes
 */
export function filterAmfiSchemes(
  allSchemes: AmfiSchemeRecord[],
  options: AmfiFilterOptions
): { filtered: AmfiSchemeRecord[]; totalMatched: number } {
  let list = allSchemes;

  if (options.plan && options.plan !== "All") {
    list = list.filter((s) => s.planType === options.plan);
  }

  if (options.option && options.option !== "All") {
    list = list.filter((s) => s.optionType === options.option);
  }

  if (options.category && options.category !== "All") {
    const catLower = options.category.toLowerCase();
    list = list.filter((s) => s.category.toLowerCase().includes(catLower));
  }

  if (options.amc && options.amc !== "All") {
    const amcLower = options.amc.toLowerCase();
    list = list.filter((s) => s.amc.toLowerCase().includes(amcLower));
  }

  if (options.search && options.search.trim()) {
    const query = options.search.trim().toLowerCase();
    const queryTokens = query.split(/\s+/).filter((t) => t.length > 1);

    list = list.filter((s) => {
      const target = `${s.schemeName} ${s.schemeCode} ${s.isinGrowth} ${s.isinReinvestment} ${s.amc} ${s.category}`.toLowerCase();
      if (target.includes(query)) return true;
      if (queryTokens.length > 1) {
        return queryTokens.every((token) => target.includes(token));
      }
      return false;
    });
  }

  const totalMatched = list.length;
  const offset = options.offset || 0;
  const limit = options.limit || 50;
  const filtered = list.slice(offset, offset + limit);

  return { filtered, totalMatched };
}

