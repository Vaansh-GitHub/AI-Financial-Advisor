import { describe, it, expect, beforeEach } from "vitest";
import {
  calculateRequiredMonthlySIP,
  calculateGoalPlan,
  calculateInflationAdjustedCost,
} from "../lib/finance/calculations";
import {
  generateEmbedding,
  cosineSimilarity,
  retrieveRelevantPassages,
  validateCitations,
  indexUploadedDocument,
} from "../lib/services/ragService";

describe("Deterministic Financial Calculation Engine (Ordinary Annuity Math)", () => {
  it("computes exact inflation-adjusted future cost for ₹2,00,000 in 20y at 6% inflation", () => {
    // FV = 200,000 * (1.06)^20 = 641,427.09
    const fv = calculateInflationAdjustedCost(200000, 0.06, 20);
    expect(fv).toBe(641427);
  });

  it("calculates exact end-of-period ordinary annuity SIP of ₹648/mo (NOT ₹224) for ₹6,41,427 shortfall", () => {
    // Goal: 200k present cost, 20y horizon, 6% inflation => FV = 641,427
    // Annual return = 12% => r = 0.01/month, N = 240 months
    // Ordinary annuity SIP = FV * [r / ((1+r)^N - 1)]
    // SIP = 641,427.09 * [0.01 / ((1.01)^240 - 1)] = 6414.27 / 9.89255 = 648.39 => ₹648
    const plan = calculateGoalPlan({
      currentCost: 200000,
      targetHorizonYears: 20,
      expectedInflationRate: 0.06,
      expectedAnnualReturn: 0.12,
      existingSavings: 0,
      currentMonthlyContribution: 0,
      sipTiming: "end_of_period",
    });

    expect(plan.inflationAdjustedCost).toBe(641427);
    expect(plan.corpusShortfall).toBe(641427);
    expect(plan.requiredMonthlySIP).toBe(648);
    // Crucially confirm it is NOT the old flawed heuristic: (641427 * 0.007) / 20 = 224
    expect(plan.requiredMonthlySIP).not.toBe(224);
  });

  it("handles edge case of zero annual return (r = 0)", () => {
    // When r = 0, SIP = Target / N (targetShortfall, annualReturn, horizonYears)
    const sip = calculateRequiredMonthlySIP(120000, 0, 10, "end_of_period");
    expect(sip).toBe(1000); // 120,000 / 120 months = 1,000/mo
  });

  it("handles edge case of zero horizon (N = 0)", () => {
    const sip = calculateRequiredMonthlySIP(50000, 0.12, 0, "end_of_period");
    expect(sip).toBe(50000); // Immediate shortfall
  });

  it("accounts for compounding growth of existing dedicated savings", () => {
    // Present cost: 10 Lakhs, 10 years, 6% inflation => FV = 1,790,848
    // Existing savings: 2 Lakhs, compounding at 12% for 10y => FV_savings = 200,000 * (1.12)^10 = 621,170
    // Shortfall = 1,790,848 - 621,170 = 1,169,678
    const plan = calculateGoalPlan({
      currentCost: 1000000,
      targetHorizonYears: 10,
      expectedInflationRate: 0.06,
      expectedAnnualReturn: 0.12,
      existingSavings: 200000,
      currentMonthlyContribution: 0,
      sipTiming: "end_of_period",
    });

    expect(plan.futureValueOfExistingSavings).toBe(621170);
    expect(plan.corpusShortfall).toBe(1169678);
    expect(plan.requiredMonthlySIP).toBeGreaterThan(0);
    expect(plan.feasibilityStatus).toBe("UNDERFUNDED");
  });
});

describe("Genuine Vector RAG & Citation Validation Engine", () => {
  it("generates 128-dimensional unit-normalized dense embeddings", () => {
    const text = "SEBI Investment Advisers Regulations 2013 Suitability Mandate";
    const embedding = generateEmbedding(text);

    expect(embedding).toHaveLength(128);

    // Verify unit length (L2 norm = 1.0)
    let normSq = 0;
    for (const val of embedding) {
      normSq += val * val;
    }
    expect(Math.sqrt(normSq)).toBeCloseTo(1.0, 4);
  });

  it("retrieves official statutory passages with cosine similarity >= 0.25", () => {
    const query = "What is the SEBI RIA suitability mandate and risk conflict resolution?";
    const results = retrieveRelevantPassages(query, { maxResults: 3 });

    expect(results.length).toBeGreaterThan(0);
    expect(results[0].docTitle).toContain("SEBI (Investment Advisers) Regulations");
    expect(results[0].cosineScore).toBeGreaterThanOrEqual(0.25);
    expect(results[0].sourceCategory).toBe("REGULATORY_TAX");
    expect(results[0].sourceUrl).toContain("sebi.gov.in");
    expect(results[0].publicationDate).toBe("2013-01-21");
  });

  it("retrieves authentic AMFI mutual fund data with scheme codes and NAVs", () => {
    const query = "Parag Parikh Flexi Cap Fund direct growth NAV expense ratio TER";
    const results = retrieveRelevantPassages(query, { maxResults: 3 });

    expect(results.length).toBeGreaterThan(0);
    const ppfas = results.find((r) => r.docTitle.includes("Parag Parikh Flexi Cap"));
    expect(ppfas).toBeDefined();
    expect(ppfas?.schemeCode).toBe("122639");
    expect(ppfas?.snippet).toContain("NAV: ₹84.32");
    expect(ppfas?.snippet).toContain("0.58%");
    expect(ppfas?.sourceCategory).toBe("AMFI_MARKET_DATA");
  });

  it("returns zero chunks for completely unrelated queries (threshold enforcement)", () => {
    const irrelevantQuery = "quantum orbital astrophysics galaxy collision planetary mechanics";
    const results = retrieveRelevantPassages(irrelevantQuery, { minScoreThreshold: 0.35 });

    expect(results).toHaveLength(0);
  });

  it("strictly isolates client-uploaded passages by clientId", () => {
    const clientAId = "client_alpha_123";
    const clientBId = "client_beta_456";

    // Ingest client A's confidential statement
    indexUploadedDocument(
      "doc_alpha",
      "Client Alpha Bank Statement",
      "Salary credit of ₹1,50,000 from Alpha Tech Corp with HDFC Home Loan debit of ₹45,000.",
      clientAId
    );

    // Ingest client B's confidential statement
    indexUploadedDocument(
      "doc_beta",
      "Client Beta Demat Holdings",
      "Holding 500 shares of Reliance Industries and 200 units of SBI Gold ETF.",
      clientBId
    );

    // Query for Alpha as client B: must NOT find Alpha's documents
    const resultsForB = retrieveRelevantPassages("Alpha Tech Corp salary credit", {
      clientId: clientBId,
      maxResults: 5,
    });
    const leakedAlpha = resultsForB.find((r) => r.docTitle.includes("Client Alpha"));
    expect(leakedAlpha).toBeUndefined();

    // Query for Alpha as client A: must find Alpha's document
    const resultsForA = retrieveRelevantPassages("Alpha Tech Corp salary credit", {
      clientId: clientAId,
      maxResults: 5,
    });
    const foundAlpha = resultsForA.find((r) => r.docTitle.includes("Client Alpha"));
    expect(foundAlpha).toBeDefined();
  });

  it("server-side citation validation validates retrieved chunks and flags unsupported claims", () => {
    const retrieved = retrieveRelevantPassages("SEBI direct plan mutual funds", { maxResults: 2 });
    expect(retrieved.length).toBeGreaterThan(0);

    // Response citing valid retrieved doc
    const responseWithValidCitation = `According to SEBI (Investment Advisers) Regulations, 2013 Regulation 18, advisers must recommend Direct Plans with zero commission.`;
    const validation1 = validateCitations(responseWithValidCitation, retrieved);
    expect(validation1.isValid).toBe(true);
    expect(validation1.unsupportedClaims).toHaveLength(0);

    // Response claiming something not supported by the retrieved set
    const emptyRetrieved: any[] = [];
    const responseWithHallucination = `According to SEBI regulations, advisers must guarantee 15% returns.`;
    const validation2 = validateCitations(responseWithHallucination, emptyRetrieved);
    expect(validation2.validatedCitations).toHaveLength(0);
  });
});
