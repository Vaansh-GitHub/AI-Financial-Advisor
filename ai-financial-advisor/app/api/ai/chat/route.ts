import { NextRequest, NextResponse } from "next/server";
import * as z from "zod";
import { executeAITool, AI_AVAILABLE_TOOLS } from "@/lib/services/aiTools";
import {
  retrieveRelevantPassages,
  formatCitationsForPrompt,
  validateCitations,
  RetrievalDebugInfo,
} from "@/lib/services/ragService";
import { calculateGoalPlan } from "@/lib/finance/calculations";
import { formatINR } from "@/lib/utils";
import { getLiveAmfiSchemes, filterAmfiSchemes } from "@/lib/services/amfiService";

// Request Validation Schema
const chatRequestSchema = z.object({
  clientId: z.string().min(1, "Client ID is required"),
  conversationId: z.string().optional(),
  message: z.string().min(1, "Message content is required"),
  clientContext: z.any().optional(),
  history: z
    .array(
      z.object({
        role: z.enum(["user", "assistant", "system"]),
        content: z.string(),
      })
    )
    .optional()
    .default([]),
  stream: z.boolean().optional().default(false),
});

/**
 * Resolves AI Provider credentials from environment variables
 * Priority:
 * 1. AI_API_KEY & AI_BASE_URL
 * 2. CLOUDFLARE_ACCOUNT_ID & CLOUDFLARE_API_TOKEN
 * 3. Default fallback
 */
function resolveAIProviderConfig() {
  const cfAccountId = process.env.CLOUDFLARE_ACCOUNT_ID?.trim();
  const cfApiToken = process.env.CLOUDFLARE_API_TOKEN?.trim();

  let apiKey = process.env.AI_API_KEY?.trim() || cfApiToken || "";
  let baseUrl = process.env.AI_BASE_URL?.trim();
  let model = process.env.AI_MODEL?.trim();

  if (!baseUrl && cfAccountId) {
    baseUrl = `https://api.cloudflare.com/client/v4/accounts/${cfAccountId}/ai/v1`;
  }
  if (!baseUrl) {
    baseUrl = "https://api.openai.com/v1";
  }
  if (!model && cfAccountId) {
    model = "@cf/meta/llama-3.1-70b-instruct";
  }
  if (!model) {
    model = "gpt-4o-mini";
  }

  // Ensure baseUrl doesn't have trailing slash
  baseUrl = baseUrl.replace(/\/+$/, "");

  return { apiKey, baseUrl, model };
}

/**
 * Sanitizes client data removing unnecessary personal identifiers (PII)
 */
function sanitizeClientContext(client: any) {
  if (!client) return null;
  const { phone, email, ...safeData } = client;
  return safeData;
}

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.json();
    const validated = chatRequestSchema.safeParse(rawBody);

    if (!validated.success) {
      return NextResponse.json(
        {
          error: "Invalid request payload",
          details: validated.error.flatten(),
        },
        { status: 400 }
      );
    }

    const { clientId, conversationId, message, clientContext, history } = validated.data;
    const { apiKey, baseUrl, model } = resolveAIProviderConfig();

    const sanitizedClient = sanitizeClientContext(clientContext);
    const clientGoals = sanitizedClient?.goals || [];

    // 1. Retrieve RAG Passages & Citations for this query and client
    const citations = retrieveRelevantPassages(message, {
      clientId,
      maxResults: 3,
    });
    const formattedCitations = formatCitationsForPrompt(citations);

    // 1b. Retrieve Live AMFI Mutual Fund Data if query relates to funds, NAV, or schemes
    let amfiContext = "";
    if (/(fund|nav|amfi|scheme|mutual|small.?cap|mid.?cap|large.?cap|flexi|liquid|debt|equity|index|direct|growth|idcw)/i.test(message)) {
      try {
        const { schemes, latestDataDate } = await getLiveAmfiSchemes(false);
        const isSmallCap = /small.?cap/i.test(message);
        const isMidCap = /mid.?cap/i.test(message);
        const isLargeCap = /large.?cap/i.test(message);
        const isFlexiCap = /flexi/i.test(message);
        const isLiquid = /liquid/i.test(message);
        const isDebt = /debt|banking|psu/i.test(message);
        const isEquity = /equity/i.test(message);

        let categoryFilter: string | undefined = undefined;
        if (isSmallCap) categoryFilter = "Small Cap";
        else if (isMidCap) categoryFilter = "Mid Cap";
        else if (isLargeCap) categoryFilter = "Large Cap";
        else if (isFlexiCap) categoryFilter = "Flexi Cap";
        else if (isLiquid) categoryFilter = "Liquid";
        else if (isDebt) categoryFilter = "Debt";
        else if (isEquity) categoryFilter = "Equity";

        const amcMatches = message.match(/(hdfc|sbi|nippon|icici|axis|kotak|uti|parag\s+parikh|mirae|dsp|tata|bandhan)/i);
        const amcFilter = amcMatches ? amcMatches[0] : undefined;

        const isRegular = /regular/i.test(message);
        const planFilter = isRegular ? "Regular" : "Direct";

        const isIdcw = /idcw|dividend/i.test(message);
        const optionFilter = isIdcw ? "IDCW" : "Growth";

        const { filtered, totalMatched } = filterAmfiSchemes(schemes, {
          category: categoryFilter,
          amc: amcFilter,
          plan: planFilter,
          option: optionFilter,
          limit: 6,
        });

        if (filtered.length > 0) {
          amfiContext = `\n### OFFICIAL AMFI LIVE NAV FEED (Source: portal.amfiindia.com/spages/NAVAll.txt, Feed Date: ${latestDataDate}):
Total Matching Verified Schemes: ${totalMatched}
${filtered
  .map(
    (f) =>
      `- [Scheme #${f.schemeCode}] ${f.schemeName} | Plan: ${f.planType} | Option: ${f.optionType} | NAV: ${f.nav !== null ? `₹${f.nav}` : "N.A."} (${f.navDate}) | AMC: ${f.amc} | Category: ${f.category} | ISIN: ${f.isinGrowth || f.isinReinvestment || "N/A"}`
  )
  .join("\n")}

FIDUCIARY RULES FOR MUTUAL FUNDS:
1. NEVER rank funds as "better" or "cheaper" based on NAV alone. A lower or higher NAV does not indicate performance or valuation.
2. Official feed NAVAll.txt provides verified NAV, ISIN, scheme codes, and dates. It DOES NOT provide Expense Ratio (TER), AUM, rolling returns, drawdowns, or portfolio holdings. If asked for these metrics, state clearly that official AMC factsheets are required.
3. Recommendations require verified client suitability (goals, investment horizon, risk capacity, and risk tolerance).`;
        }
      } catch (e: any) {
        console.warn("Live AMFI context error:", e.message);
      }
    }

    // 2. Pre-calculate deterministic metrics
    const monthlyIncome = Number(sanitizedClient?.monthlyIncome) || 0;
    const monthlyExpenses = Number(sanitizedClient?.monthlyExpenses) || 0;
    const monthlyEMI = Number(sanitizedClient?.monthlyEMI) || 0;
    const emergencyFund = Number(sanitizedClient?.emergencyFundAmount) || 0;
    const burn = monthlyExpenses + monthlyEMI;
    const surplus = monthlyIncome - burn;
    const runway = burn > 0 ? (emergencyFund / burn).toFixed(1) : "0.0";
    const dti = monthlyIncome > 0 ? Math.round((monthlyEMI / monthlyIncome) * 100) : 0;
    const savingsRate = monthlyIncome > 0 ? Math.round((surplus / monthlyIncome) * 100) : 0;

    // 3. Construct System Prompt with SEBI RIA Fiduciary Guardrails
    const systemPrompt = `You are "ArthaAdvisor Co-Pilot", an elite AI investment adviser assistant designed for a SEBI-registered Investment Adviser (RIA) in India.

### CRITICAL FIDUCIARY GUARDRAILS:
1. NEVER promise or guarantee financial returns (violates SEBI RIA Regulations 2013).
2. All calculations must cite the exact deterministic values provided below. Do NOT recalculate or invent compound numbers.
3. Enforce the Fiduciary Constraint: Objective risk capacity strictly constrains subjective risk tolerance. If capacity is Low and tolerance is Aggressive, enforce a conservative/balanced allocation and flag the conflict.
4. Keep emergency buffer at a minimum of 6 months of living expenses + EMI. If runway is < 6 months, highlight the liquidity shortfall.
5. If recommending mutual funds, mention Direct Plans only with zero distribution commission.
6. When referencing facts from retrieved documents, cite the document and page number in brackets e.g. [Doc: SEBI Regulations, p. 15].

### VERIFIED CLIENT FINANCIAL DOSSIER (ID: ${clientId}):
- Client Name: ${sanitizedClient?.fullName || "Client"}
- Age: ${sanitizedClient?.age || "Not specified"}, City: ${sanitizedClient?.city || "India"}
- Employment: ${sanitizedClient?.employmentType?.replace(/_/g, " ") || "Salaried"}
- Monthly Income: ₹${monthlyIncome.toLocaleString("en-IN")}/mo
- Monthly Expenses: ₹${monthlyExpenses.toLocaleString("en-IN")}/mo
- Monthly Loan EMI: ₹${monthlyEMI.toLocaleString("en-IN")}/mo (DTI: ${dti}%, Prudential Ceiling: 40%)
- Monthly Disposable Surplus: ₹${surplus.toLocaleString("en-IN")}/mo (Savings Rate: ${savingsRate}%)
- Emergency Reserves: ₹${emergencyFund.toLocaleString("en-IN")} (Runway: ${runway} months, 6-Month Benchmark: ₹${(burn * 6).toLocaleString("en-IN")})
- Existing Savings: ₹${(Number(sanitizedClient?.existingSavings) || 0).toLocaleString("en-IN")}
- Existing Investments: ₹${(Number(sanitizedClient?.existingInvestments) || 0).toLocaleString("en-IN")}
- Outstanding Liabilities: ₹${(Number(sanitizedClient?.outstandingLiabilities) || 0).toLocaleString("en-IN")}
- Risk Profile: Capacity: ${sanitizedClient?.riskProfile?.capacityLevel || "MODERATE"}, Tolerance: ${sanitizedClient?.riskProfile?.toleranceLevel || "MODERATE"}, Combined: ${sanitizedClient?.riskProfile?.combinedCategory || "BALANCED"}
- Suitability Conflict: ${sanitizedClient?.riskProfile?.hasConflict ? "YES (Flagged: Capacity strictly constrains tolerance)" : "NO (Harmonized)"}
- Client Goals: ${
      clientGoals.length > 0
        ? clientGoals.map((g: any) => `${g.title} (${g.targetHorizonYears || 5}y, Target: ₹${(g.targetAmount || g.currentCost || 0).toLocaleString("en-IN")})`).join("; ")
        : "No specific financial goals created yet."
    }

### RETRIEVED DOCUMENT EVIDENCE (RAG):
${formattedCitations}
${amfiContext}

Provide an evidence-based, fiduciary advisory response. Use markdown formatting with clear headings, bullet points, and actionable next steps.`;

    // 4. Build Messages Array (Limited to last 10 messages for context efficiency)
    const messages = [
      { role: "system", content: systemPrompt },
      ...history.slice(-8).map((m) => ({
        role: m.role,
        content: m.content,
      })),
      { role: "user", content: message },
    ];

    // Check if we have an API Key configured
    if (!apiKey) {
      // Graceful local deterministic fallback when no API key is provided
      const localResult = await generateLocalFallbackResponse(message, sanitizedClient, clientGoals, citations);
      return NextResponse.json({
        success: true,
        text: localResult.text,
        model: "local-fiduciary-math-engine",
        intent: localResult.intent,
        citations,
        metrics: {
          monthlySurplus: surplus,
          emergencyRunwayMonths: Number(runway),
          dtiPercent: dti,
        },
        isPlaceholder: true,
        disclosureNote: "Local Fiduciary Advisory Engine (Configure AI_API_KEY for live LLM synthesis).",
      });
    }

    // 5. Send Request to Configured AI Provider (OpenAI / Cloudflare Workers AI)
    const completionsUrl = `${baseUrl}/chat/completions`;

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 25000); // 25s timeout

      const aiResponse = await fetch(completionsUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages,
          temperature: 0.2, // Low temperature for high financial fidelity
          max_tokens: 1500,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!aiResponse.ok) {
        const errorText = await aiResponse.text();
        console.warn(`AI Provider returned HTTP ${aiResponse.status}:`, errorText);

        // Graceful fallback to deterministic advisory engine on provider error
        const localResult = await generateLocalFallbackResponse(
          message,
          sanitizedClient,
          clientGoals,
          citations,
          `Provider error (HTTP ${aiResponse.status})`
        );

        const consultedSources = Array.from(new Set(citations.map((c) => c.sourceCategory)));
        const validation = validateCitations(localResult.text, citations);

        const retrievalDebug: RetrievalDebugInfo = {
          totalIndexedPassages: 14,
          chunksRetrievedCount: citations.length,
          similarityThreshold: 0.25,
          consultedSources,
          retrievedChunks: validation.validatedCitations,
          validationStatus: citations.length === 0 ? "NO_EVIDENCE_FOUND" : validation.isValid ? "ALL_VALIDATED" : "PARTIALLY_VALIDATED",
          isDeterministicMath: true,
        };

        return NextResponse.json({
          success: true,
          text: localResult.text,
          model: `local-engine (fallback from ${model})`,
          intent: localResult.intent,
          citations,
          retrievalDebug,
          metrics: {
            monthlySurplus: surplus,
            emergencyRunwayMonths: Number(runway),
            dtiPercent: dti,
          },
          isPlaceholder: true,
          disclosureNote: `AI model call failed (${aiResponse.statusText}). Fiduciary analysis generated deterministically.`,
        });
      }

      const aiData = await aiResponse.json();
      const assistantText =
        aiData?.choices?.[0]?.message?.content ||
        aiData?.result?.response ||
        "I have analyzed the client financial profile according to SEBI fiduciary guidelines.";

      const consultedSources = Array.from(new Set(citations.map((c) => c.sourceCategory)));
      const validation = validateCitations(assistantText, citations);

      const retrievalDebug: RetrievalDebugInfo = {
        totalIndexedPassages: 14,
        chunksRetrievedCount: citations.length,
        similarityThreshold: 0.25,
        consultedSources,
        retrievedChunks: validation.validatedCitations,
        validationStatus: citations.length === 0 ? "NO_EVIDENCE_FOUND" : validation.isValid ? "ALL_VALIDATED" : "PARTIALLY_VALIDATED",
        isDeterministicMath: true,
      };

      return NextResponse.json({
        success: true,
        text: assistantText,
        model,
        citations,
        retrievalDebug,
        metrics: {
          monthlySurplus: surplus,
          emergencyRunwayMonths: Number(runway),
          dtiPercent: dti,
          riskCategory: sanitizedClient?.riskProfile?.combinedCategory || "BALANCED",
        },
        isPlaceholder: false,
        disclosureNote: `Generated live by ${model} via configured AI API.`,
      });
    } catch (fetchErr: any) {
      console.warn("AI Provider connection error, falling back locally:", fetchErr.message);

      const localResult = await generateLocalFallbackResponse(
        message,
        sanitizedClient,
        clientGoals,
        citations,
        fetchErr.message
      );

      const consultedSources = Array.from(new Set(citations.map((c) => c.sourceCategory)));
      const validation = validateCitations(localResult.text, citations);

      const retrievalDebug: RetrievalDebugInfo = {
        totalIndexedPassages: 14,
        chunksRetrievedCount: citations.length,
        similarityThreshold: 0.25,
        consultedSources,
        retrievedChunks: validation.validatedCitations,
        validationStatus: citations.length === 0 ? "NO_EVIDENCE_FOUND" : validation.isValid ? "ALL_VALIDATED" : "PARTIALLY_VALIDATED",
        isDeterministicMath: true,
      };

      return NextResponse.json({
        success: true,
        text: localResult.text,
        model: `local-engine (offline)`,
        intent: localResult.intent,
        citations,
        retrievalDebug,
        metrics: {
          monthlySurplus: surplus,
          emergencyRunwayMonths: Number(runway),
          dtiPercent: dti,
        },
        isPlaceholder: true,
        disclosureNote: `Live AI connection unavailable (${fetchErr.message}). Analysis computed via deterministic math engine.`,
      });
    }
  } catch (err: any) {
    console.error("Unhandled error in /api/ai/chat:", err);
    return NextResponse.json(
      {
        error: "Advisory Co-pilot error",
        message: err?.message || "Internal server error",
      },
      { status: 500 }
    );
  }
}

/**
 * Local Deterministic Advisory Engine Fallback
 * Guarantees zero downtime and mathematical exactness even when API is offline or ratelimited.
 */
async function generateLocalFallbackResponse(
  prompt: string,
  client: any,
  goals: any[],
  citations: any[],
  errorReason?: string
) {
  const q = prompt.toLowerCase();
  const monthlyIncome = Number(client?.monthlyIncome) || 0;
  const monthlyExpenses = Number(client?.monthlyExpenses) || 0;
  const monthlyEMI = Number(client?.monthlyEMI) || 0;
  const emergencyFund = Number(client?.emergencyFundAmount) || 0;
  const burn = monthlyExpenses + monthlyEMI;
  const surplus = monthlyIncome - burn;
  const runway = burn > 0 ? (emergencyFund / burn).toFixed(1) : "0.0";
  const dti = monthlyIncome > 0 ? Math.round((monthlyEMI / monthlyIncome) * 100) : 0;
  const clientName = client?.fullName || "this client";

  let intent = "PORTFOLIO_REVIEW";
  let responseText = "";

  if (q.includes("emergency") || q.includes("runway") || q.includes("buffer")) {
    intent = "EMERGENCY_FUND_AUDIT";
    const benchmark = burn * 6;
    const gap = Math.max(0, benchmark - emergencyFund);

    responseText = `### 🛡️ Emergency Reserve Audit for ${clientName}

- **Current Reserves**: ${formatINR(emergencyFund)}
- **Monthly Fixed Commitments (Burn)**: ${formatINR(burn)}
- **Current Runway**: **${runway} Months** (Benchmark: 6.0 Months)
- **Status**: ${
      Number(runway) >= 6
        ? "✅ **Adequate** — Exceeds the 6-month safety benchmark."
        : Number(runway) >= 3
        ? "⚠️ **Moderate Shortfall** — Requires structured top-up."
        : "🚨 **Critical Deficit** — Vulnerable to income interruption."
    }

${
  gap > 0
    ? `> **Fiduciary Recommendation**: Allocate **${formatINR(Math.min(surplus * 0.5, gap / 6))}/month** from the disposable surplus of ${formatINR(surplus)} into liquid mutual funds to close the ${formatINR(gap)} deficit.`
    : `> **Surplus Deployment**: The emergency runway is fully capitalized. Monthly surplus of ${formatINR(surplus)} can be channeled into long-term goals.`
}`;
  } else if (q.includes("risk") || q.includes("conflict") || q.includes("tolerance") || q.includes("capacity")) {
    intent = "SUITABILITY_AUDIT";
    const capacity = client?.riskProfile?.capacityLevel || "MODERATE";
    const tolerance = client?.riskProfile?.toleranceLevel || "MODERATE";
    const hasConflict = client?.riskProfile?.hasConflict;

    responseText = `### ⚖️ Risk Suitability & Fiduciary Guardrail Assessment

- **Objective Risk Capacity**: **${capacity}** (Based on income, runway, liabilities, and age)
- **Subjective Risk Tolerance**: **${tolerance}** (Behavioral questionnaire)
- **Combined Category**: **${client?.riskProfile?.combinedCategory || "BALANCED"}**
- **Fiduciary Conflict**: ${hasConflict ? "⚠️ **YES — Conflict Detected**" : "✅ **Harmonized**"}

${
  hasConflict
    ? `> **SEBI Fiduciary Rule**: Objective financial capacity (${capacity}) strictly constrains subjective tolerance (${tolerance}). High speculative or concentrated exposure is blocked to protect capital.`
    : `> Both risk capacity and behavioral tolerance are aligned. The portfolio can maintain a standard diversified allocation.`
}`;
  } else if (q.includes("sip") || q.includes("goal") || q.includes("future cost") || q.includes("calculate")) {
    intent = "GOAL_SIP_ANALYSIS";
    const primaryGoal = goals[0];

    if (primaryGoal) {
      const cost = primaryGoal.currentCost || 1000000;
      const horizon = primaryGoal.targetHorizonYears || 5;
      
      const plan = calculateGoalPlan({
        currentCost: cost,
        targetHorizonYears: horizon,
        expectedInflationRate: 0.06,
        expectedAnnualReturn: 0.12,
        existingSavings: primaryGoal.existingSavings || 0,
        currentMonthlyContribution: primaryGoal.currentMonthlyContribution || 0,
        sipTiming: "end_of_period",
      });
      const fv = plan.inflationAdjustedCost;
      const sip = plan.requiredMonthlySIP;

      responseText = `### 🎯 Goal Funding & SIP Calculation for "${primaryGoal.title}"

- **Current Estimated Cost**: ${formatINR(cost)}
- **Investment Horizon**: **${horizon} years** (Assumed inflation: 6.0%)
- **Inflation-Adjusted Future Corpus**: **${formatINR(fv)}**
- **Recommended Monthly SIP**: **${formatINR(sip)}/month** (Exact ordinary annuity at 12% annual compounding)
- **Monthly Surplus Available**: ${formatINR(surplus)}

${
  surplus >= sip
    ? `✅ **Goal is Feasible**: Monthly surplus of ${formatINR(surplus)} comfortably covers the required SIP of ${formatINR(sip)}.`
    : `⚠️ **Savings Gap Detected**: Required SIP (${formatINR(sip)}) exceeds current monthly surplus (${formatINR(surplus)}) by ${formatINR(sip - surplus)}/month. Consider extending the horizon or rationalizing expenses.`
}`;
    } else {
      responseText = `### 🎯 Financial Goals Overview for ${clientName}

No specific financial goals are currently recorded for ${clientName}. 

To calculate future corpus requirements and monthly SIPs:
1. Navigate to the client's **Goals tab** and click **"+ Add Goal"**.
2. Specify target horizon and present-day cost.`;
    }
  } else if (
    q.includes("fund") ||
    q.includes("nav") ||
    q.includes("amfi") ||
    q.includes("scheme") ||
    q.includes("small cap") ||
    q.includes("large cap") ||
    q.includes("mid cap") ||
    q.includes("direct")
  ) {
    intent = "AMFI_MUTUAL_FUND_RESEARCH";
    try {
      const { schemes, latestDataDate } = await getLiveAmfiSchemes(false);
      let category: string | undefined = undefined;
      if (q.includes("small cap")) category = "Small Cap";
      else if (q.includes("large cap")) category = "Large Cap";
      else if (q.includes("mid cap")) category = "Mid Cap";
      else if (q.includes("liquid")) category = "Liquid";
      else if (q.includes("debt")) category = "Debt";
      else if (q.includes("equity")) category = "Equity";

      const plan = q.includes("regular") ? "Regular" : "Direct";
      const option = q.includes("idcw") || q.includes("dividend") ? "IDCW" : "Growth";

      const { filtered, totalMatched } = filterAmfiSchemes(schemes, {
        category,
        plan,
        option,
        limit: 5,
      });

      responseText = `### 📊 Live AMFI Mutual Fund Master Feed (portal.amfiindia.com)

**Source**: Official AMFI Daily NAV Feed • **Data Date**: **${latestDataDate}** • **Total Matching Verified Schemes**: **${totalMatched.toLocaleString("en-IN")}**

| Scheme Code | Scheme Name | Plan & Option | Latest NAV | NAV Date | ISIN |
| :--- | :--- | :--- | :--- | :--- | :--- |
${filtered
  .map(
    (s) =>
      `| \`${s.schemeCode}\` | **${s.schemeName}** | ${s.planType} • ${s.optionType} | **${s.nav !== null ? `₹${s.nav.toFixed(4)}` : "N.A."}** | ${s.navDate} | \`${s.isinGrowth || s.isinReinvestment || "—"}\` |`
  )
  .join("\n")}

---

### 🛡️ SEBI RIA Fiduciary Disclosures & Boundaries:
- **NAV Is Not Performance**: Schemes must **never** be ranked as better or cheaper investments based on NAV alone. A unit NAV of ₹15 vs ₹1,500 has zero bearing on investment value or returns.
- **Data Scope**: The official AMFI \`NAVAll.txt\` feed supplies verified statutory NAV, ISIN, and scheme codes. It **does not** contain Total Expense Ratio (TER), AUM, rolling returns, drawdowns, or fund manager tenure. Official AMC monthly factsheets are required for these metrics.
- **Client Suitability Requirement**: Recommending any scheme for ${clientName} requires alignment with their **${client?.riskProfile?.combinedCategory || "BALANCED"}** profile and target goals. Direct plans with zero distribution commission are mandated.`;
    } catch (amfiErr: any) {
      responseText = `### ⚠️ Live AMFI Data Feed Notice

Unable to reach the live AMFI portal feed (\`portal.amfiindia.com/spages/NAVAll.txt\`): ${amfiErr.message}.

Per SEBI RIA fiduciary rules, fake NAVs or fabricated fund returns are never generated. Please check your network connection or verify the feed URL directly.`;
    }
  } else {
    responseText = `### 📋 Comprehensive Financial Executive Summary for ${clientName}

- **Cashflow**: Monthly Income ${formatINR(monthlyIncome)} vs Fixed Burn ${formatINR(burn)} (Surplus: **${formatINR(surplus)}/month**)
- **Debt Service**: Monthly EMI ${formatINR(monthlyEMI)} (DTI: **${dti}%**, Ceiling: 40%)
- **Liquid Reserves**: ${formatINR(emergencyFund)} (**${runway} months** of emergency runway)
- **Net Worth**: ${formatINR((Number(client?.existingSavings) || 0) + (Number(client?.existingInvestments) || 0) - (Number(client?.outstandingLiabilities) || 0))}
- **Risk Category**: ${client?.riskProfile?.combinedCategory || "BALANCED"} (${client?.riskProfile?.hasConflict ? "Conflict Flagged" : "Harmonized"})
- **Active Goals**: ${goals.length} goals recorded

${
  citations.length > 0
    ? `\n#### 📚 Grounding Citations:\n` +
      citations.map((c) => `- *${c.docTitle}* (p. ${c.pageNumber}): "${c.snippet}"`).join("\n")
    : ""
}`;
  }

  return { intent, text: responseText };
}

