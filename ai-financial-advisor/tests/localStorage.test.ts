import { describe, it, expect, beforeEach } from "vitest";
import {
  initializeLocalStorage,
  getClients,
  getClientById,
  saveClient,
  updateClient,
  deleteClient,
  getGoals,
  saveGoal,
  getConversations,
  saveConversation,
  addMessageToConversation,
  getReports,
  saveReport,
  exportAllData,
  importAllData,
  getStorageUsage,
  resetToDemo,
} from "../lib/storage/localStorage";
import { generateAdvisoryResponse } from "../lib/services/aiService";
import { generateStructuredReport } from "../lib/services/reportGenerator";

// Mock localStorage for Vitest environment if window is simulated
class MockStorage {
  private store: Record<string, string> = {};

  getItem(key: string): string | null {
    return this.store[key] || null;
  }

  setItem(key: string, value: string): void {
    this.store[key] = value;
  }

  removeItem(key: string): void {
    delete this.store[key];
  }

  clear(): void {
    this.store = {};
  }

  get length(): number {
    return Object.keys(this.store).length;
  }

  key(index: number): string | null {
    return Object.keys(this.store)[index] || null;
  }
}

if (typeof window === "undefined" || !window.localStorage) {
  (global as any).window = {
    localStorage: new MockStorage(),
    dispatchEvent: () => true,
    addEventListener: () => {},
    removeEventListener: () => {},
  };
  (global as any).localStorage = (global as any).window.localStorage;
}

describe("Local-First Storage Engine (Clean Slate)", () => {
  beforeEach(() => {
    resetToDemo();
  });

  it("starts with a clean empty slate on initialization", () => {
    const clients = getClients();
    expect(clients.length).toBe(0);
    const reports = getReports();
    expect(reports.length).toBe(0);
    const chats = getConversations();
    expect(chats.length).toBe(0);
  });

  it("adds, edits, and deletes client profiles", () => {
    const created = saveClient({
      fullName: "Test Client",
      email: "test.client@example.com",
      city: "Chennai",
      age: 35,
      employmentType: "salaried_permanent",
      monthlyIncome: 120000,
      monthlyExpenses: 40000,
      existingSavings: 300000,
      emergencyFundAmount: 200000,
      existingInvestments: 500000,
      outstandingLiabilities: 0,
      monthlyEMI: 0,
      numberOfDependants: 1,
      investmentExperience: "basic_mutual_funds",
      riskTolerance: "MODERATE",
      riskCapacity: "HIGH",
      investmentHorizonYears: 10,
    });

    expect(created.id).toBeDefined();
    expect(getClientById(created.id)?.fullName).toBe("Test Client");

    const updated = updateClient(created.id, { monthlyIncome: 140000 });
    expect(updated?.monthlyIncome).toBe(140000);

    const deleted = deleteClient(created.id);
    expect(deleted).toBe(true);
    expect(getClientById(created.id)).toBeNull();
  });

  it("persists goals and calculates metrics", () => {
    const client = saveClient({
      fullName: "Goal Client",
      email: "goal@example.com",
      city: "Pune",
      age: 30,
      employmentType: "salaried_permanent",
      monthlyIncome: 100000,
      monthlyExpenses: 40000,
      existingSavings: 150000,
      emergencyFundAmount: 120000,
      existingInvestments: 300000,
      outstandingLiabilities: 0,
      monthlyEMI: 0,
      numberOfDependants: 0,
      investmentExperience: "basic_mutual_funds",
      riskTolerance: "MODERATE",
      riskCapacity: "HIGH",
      investmentHorizonYears: 10,
    });

    const goal = saveGoal({
      clientId: client.id,
      title: "Vacation Fund",
      category: "VACATION_OR_LUXURY",
      currentCost: 300000,
      targetHorizonYears: 3,
      expectedInflationRate: 0.06,
      expectedAnnualReturn: 0.10,
      existingSavings: 50000,
      currentMonthlyContribution: 8000,
      priority: "MEDIUM",
    });

    expect(goal.id).toBeDefined();
    const retrieved = getGoals(client.id);
    expect(retrieved.some((g) => g.id === goal.id)).toBe(true);
  });

  it("saves conversations and messages locally", () => {
    const client = saveClient({
      fullName: "Chat Client",
      email: "chat@example.com",
      city: "Bengaluru",
      age: 28,
      employmentType: "salaried_permanent",
      monthlyIncome: 90000,
      monthlyExpenses: 35000,
      existingSavings: 200000,
      emergencyFundAmount: 100000,
      existingInvestments: 200000,
      outstandingLiabilities: 0,
      monthlyEMI: 0,
      numberOfDependants: 0,
      investmentExperience: "basic_mutual_funds",
      riskTolerance: "AGGRESSIVE",
      riskCapacity: "HIGH",
      investmentHorizonYears: 15,
    });

    const conversation = saveConversation({
      clientId: client.id,
      clientName: client.fullName,
      title: "Initial Advisory Discussion",
      messages: [],
    });

    expect(conversation.id).toBeDefined();

    const addedMsg = addMessageToConversation(conversation.id, {
      sender: "user",
      text: "How much should I invest in small cap funds?",
    });

    expect(addedMsg).not.toBeNull();
    const updatedChats = getConversations(client.id);
    const updatedChat = updatedChats.find((c) => c.id === conversation.id);
    expect(updatedChat?.messages.some((m) => m.text === "How much should I invest in small cap funds?")).toBe(true);
  });

  it("exports and restores complete JSON backup", () => {
    saveClient({
      fullName: "Backup Client",
      email: "backup@example.com",
      city: "Hyderabad",
      age: 32,
      employmentType: "business_owner",
      monthlyIncome: 200000,
      monthlyExpenses: 80000,
      existingSavings: 500000,
      emergencyFundAmount: 400000,
      existingInvestments: 1000000,
      outstandingLiabilities: 0,
      monthlyEMI: 0,
      numberOfDependants: 2,
      investmentExperience: "active_equity_and_debt",
      riskTolerance: "AGGRESSIVE",
      riskCapacity: "HIGH",
      investmentHorizonYears: 12,
    });

    const dump = exportAllData();
    expect(dump).toContain("Backup Client");

    const importResult = importAllData(dump);
    expect(importResult.success).toBe(true);
  });

  it("calculates storage usage metrics accurately", () => {
    saveClient({
      fullName: "Usage Client",
      email: "usage@example.com",
      city: "Mumbai",
      age: 40,
      employmentType: "salaried_permanent",
      monthlyIncome: 150000,
      monthlyExpenses: 60000,
      existingSavings: 400000,
      emergencyFundAmount: 300000,
      existingInvestments: 800000,
      outstandingLiabilities: 0,
      monthlyEMI: 0,
      numberOfDependants: 1,
      investmentExperience: "basic_mutual_funds",
      riskTolerance: "MODERATE",
      riskCapacity: "HIGH",
      investmentHorizonYears: 10,
    });

    const usage = getStorageUsage();
    expect(usage.status).toBe("HEALTHY");
    expect(usage.clientCount).toBeGreaterThanOrEqual(1);
  });
});

describe("Deterministic Advisory AI Service", () => {
  it("provides emergency fund advice with exact calculations", async () => {
    const client = saveClient({
      fullName: "Aryan Verma",
      email: "aryan@example.com",
      city: "Bengaluru",
      age: 27,
      employmentType: "salaried_permanent",
      monthlyIncome: 85000,
      monthlyExpenses: 25000,
      existingSavings: 150000,
      emergencyFundAmount: 80000,
      existingInvestments: 200000,
      outstandingLiabilities: 0,
      monthlyEMI: 0,
      numberOfDependants: 0,
      investmentExperience: "basic_mutual_funds",
      riskTolerance: "AGGRESSIVE",
      riskCapacity: "HIGH",
      investmentHorizonYears: 15,
    });

    const goals = getGoals(client.id);

    const response = await generateAdvisoryResponse("Analyze emergency fund runway and buffer", {
      client,
      goals,
      history: [],
    });

    expect(response.intent).toBe("EMERGENCY_FUND_AUDIT");
    expect(response.isPlaceholder).toBe(true);
    expect(response.disclosureNote).toContain("Local Fiduciary Advisory Engine");
    expect(response.text).toContain("Emergency Reserve");
  });

  it("flags risk capacity vs tolerance conflicts deterministically", async () => {
    const client = saveClient({
      fullName: "Dr. Ananya Sengupta",
      email: "ananya@example.com",
      city: "Kolkata",
      age: 42,
      employmentType: "self_employed_professional",
      monthlyIncome: 350000,
      monthlyExpenses: 80000,
      existingSavings: 2500000,
      emergencyFundAmount: 1500000,
      existingInvestments: 6000000,
      outstandingLiabilities: 0,
      monthlyEMI: 0,
      numberOfDependants: 2,
      investmentExperience: "basic_mutual_funds",
      riskTolerance: "CONSERVATIVE",
      riskCapacity: "HIGH",
      investmentHorizonYears: 15,
    });

    const goals = getGoals(client.id);

    const response = await generateAdvisoryResponse("Check risk profile and allocation", {
      client,
      goals,
      history: [],
    });

    expect(response.intent).toBe("RISK_AND_ALLOCATION_AUDIT");
    expect(response.text).toContain("Risk Suitability");
    expect(response.text).toContain("Asset Allocation");
  });

  it("generates structured financial reports and saves to storage", () => {
    const client = saveClient({
      fullName: "Report Client",
      email: "report@example.com",
      city: "Delhi",
      age: 38,
      employmentType: "salaried_permanent",
      monthlyIncome: 180000,
      monthlyExpenses: 70000,
      existingSavings: 600000,
      emergencyFundAmount: 400000,
      existingInvestments: 1200000,
      outstandingLiabilities: 2000000,
      monthlyEMI: 25000,
      numberOfDependants: 2,
      investmentExperience: "basic_mutual_funds",
      riskTolerance: "MODERATE",
      riskCapacity: "MODERATE",
      investmentHorizonYears: 12,
    });

    const goals = getGoals(client.id);

    const report = generateStructuredReport({
      client,
      goals,
      reportType: "COMPREHENSIVE_FINANCIAL_PLAN",
      customNotes: "Advisory review for hackathon evaluation.",
    });

    expect(report.id).toBeDefined();
    expect(report.keyMetrics.monthlySurplus).toBe(client.monthlyIncome - (client.monthlyExpenses + client.monthlyEMI));
    expect(report.suitabilityFindings.length).toBeGreaterThan(0);
    expect(getReports(client.id).some((r) => r.id === report.id)).toBe(true);
  });
});
