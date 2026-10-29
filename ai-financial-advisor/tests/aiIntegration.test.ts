import { describe, it, expect } from "vitest";
import { executeAITool, AI_AVAILABLE_TOOLS, ToolSchemas } from "../lib/services/aiTools";
import { retrieveRelevantPassages, indexPassage } from "../lib/services/ragService";
import { POST } from "../app/api/ai/chat/route";
import { NextRequest } from "next/server";
import { Client, Goal } from "../lib/storage/types";

const mockClient: Client = {
  id: "client_test_123",
  fullName: "Vikram Malhotra",
  email: "vikram@example.com",
  phone: "+91 98201 00000",
  age: 34,
  city: "Mumbai",
  employmentType: "salaried_permanent",
  monthlyIncome: 180000,
  monthlyExpenses: 60000,
  existingSavings: 400000,
  emergencyFundAmount: 360000,
  existingInvestments: 1200000,
  outstandingLiabilities: 0,
  monthlyEMI: 0,
  numberOfDependants: 1,
  investmentExperience: "basic_mutual_funds",
  riskTolerance: "MODERATE",
  riskCapacity: "HIGH",
  investmentHorizonYears: 10,
  riskProfile: {
    capacityScore: 80,
    capacityLevel: "HIGH",
    toleranceScore: 60,
    toleranceLevel: "MODERATE",
    combinedCategory: "GROWTH",
    hasConflict: false,
    lastAssessedAt: new Date().toISOString(),
  },
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

const mockGoals: Goal[] = [
  {
    id: "goal_edu_1",
    clientId: "client_test_123",
    title: "Child Higher Education",
    category: "CHILD_EDUCATION",
    currentCost: 2500000,
    targetAmount: 4477119,
    targetHorizonYears: 10,
    expectedInflationRate: 0.06,
    expectedAnnualReturn: 0.12,
    existingSavings: 200000,
    currentMonthlyContribution: 15000,
    priority: "HIGH",
    calculationResults: {
      inflationAdjustedCost: 4477119,
      futureValueOfExistingSavings: 621169,
      corpusShortfall: 3855950,
      requiredMonthlySIP: 16762,
      feasibilityStatus: "ON_TRACK",
      monthlySurplusOrShortfall: -1762,
      calculatedAt: new Date().toISOString(),
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

describe("AI Server Tools & Deterministic Execution", () => {
  it("declares all 11 required fiduciary tools with Zod schemas", () => {
    expect(AI_AVAILABLE_TOOLS.length).toBe(11);
    const names = AI_AVAILABLE_TOOLS.map((t) => t.function.name);
    expect(names).toContain("get_client_summary");
    expect(names).toContain("get_client_goals");
    expect(names).toContain("calculate_future_corpus");
    expect(names).toContain("calculate_required_sip");
    expect(names).toContain("calculate_savings_gap");
    expect(names).toContain("analyze_income_expenses");
    expect(names).toContain("calculate_emergency_fund_coverage");
    expect(names).toContain("get_existing_portfolio_summary");
    expect(names).toContain("get_missing_client_information");
    expect(names).toContain("generate_financial_report");
    expect(names).toContain("search_amfi_mutual_funds");
  });

  it("calculates future corpus deterministically via tool", async () => {
    const res = await executeAITool(
      "calculate_future_corpus",
      { currentCost: 1000000, inflationRate: 0.06, horizonYears: 10 },
      { client: mockClient, goals: mockGoals }
    );

    expect(res.success).toBe(true);
    expect(res.result.futureCorpusRequired).toBe(1790848);
  });

  it("calculates required monthly SIP via annuity-due formula", async () => {
    const res = await executeAITool(
      "calculate_required_sip",
      { targetCorpus: 2000000, existingSavings: 0, expectedReturnRate: 0.12, horizonYears: 10 },
      { client: mockClient, goals: mockGoals }
    );

    expect(res.success).toBe(true);
    expect(res.result.recommendedMonthlySIP).toBeGreaterThan(8000);
    expect(res.result.recommendedMonthlySIP).toBeLessThan(9000);
  });

  it("audits emergency runway and fixed burn correctly", async () => {
    const res = await executeAITool(
      "calculate_emergency_fund_coverage",
      { emergencyFundAmount: 360000, monthlyExpenses: 60000, monthlyEMI: 0 },
      { client: mockClient, goals: mockGoals }
    );

    expect(res.success).toBe(true);
    expect(res.result.runwayMonths).toBe(6);
    expect(res.result.adequacyStatus).toBe("ADEQUATE");
  });

  it("blocks non-allowlisted arbitrary tool execution", async () => {
    const res = await executeAITool(
      "execute_arbitrary_shell_command",
      {},
      { client: mockClient, goals: mockGoals }
    );

    expect(res.success).toBe(false);
    expect(res.error).toContain("Unrecognized tool");
  });
});

describe("Document RAG & Grounded Citations", () => {
  it("retrieves SEBI RIA suitability citations for conflict questions", () => {
    const citations = retrieveRelevantPassages("How to resolve conflict between capacity and tolerance?", {
      clientId: mockClient.id,
      maxResults: 3,
    });

    expect(citations.length).toBeGreaterThan(0);
    expect(citations.some((c) => c.docTitle.includes("SEBI (Investment Advisers) Regulations"))).toBe(true);
    expect(citations[0].pageNumber).toBeGreaterThan(0);
    expect(citations[0].snippet).toContain("Regulation");
  });

  it("indexes client-uploaded documents and surfaces citations", () => {
    indexPassage({
      id: "test_doc_salary_slip",
      docId: "doc_123",
      docTitle: "HDFC Bank Salary Statement.pdf",
      pageNumber: 2,
      textSnippet: "Net monthly salary credited: INR 1,80,000 via corporate direct deposit.",
      sourceType: "CLIENT_UPLOAD",
      clientId: mockClient.id,
      keywords: ["salary", "hdfc", "deposit", "income", "monthly"],
    });

    const citations = retrieveRelevantPassages("What is the verified salary deposit from HDFC?", {
      clientId: mockClient.id,
      maxResults: 2,
    });

    expect(citations.length).toBeGreaterThan(0);
    expect(citations[0].docTitle).toBe("HDFC Bank Salary Statement.pdf");
    expect(citations[0].pageNumber).toBe(2);
    expect(citations[0].snippet).toContain("1,80,000");
  });
});

describe("Server-Side AI Chat Route POST /api/ai/chat", () => {
  it("validates request payload and rejects missing message or clientId", async () => {
    const req = new NextRequest("http://localhost:3000/api/ai/chat", {
      method: "POST",
      body: JSON.stringify({ message: "Hello" }), // Missing clientId
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe("Invalid request payload");
  });

  it("handles client advisory query with deterministic metrics and RAG citations", async () => {
    const req = new NextRequest("http://localhost:3000/api/ai/chat", {
      method: "POST",
      body: JSON.stringify({
        clientId: mockClient.id,
        message: "Analyze emergency fund runway and liquidity",
        clientContext: mockClient,
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.text).toContain("Emergency");
    expect(data.metrics.emergencyRunwayMonths).toBe(6);
    expect(data.citations).toBeDefined();
  });
});
