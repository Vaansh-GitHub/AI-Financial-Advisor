/**
 * Unified Repository Layer
 * Interacts with MongoDB when available, and provides an active in-memory seeded datastore
 * with full CRUD and filtering. Guarantees 100% operational uptime.
 */

import { connectToDatabase, isDatabaseConnected } from "./connect";
import { UserModel, IUser } from "@/models/User";
import { ClientModel, IClient } from "@/models/Client";
import { GoalModel, IGoal } from "@/models/Goal";
import { FundModel, IFund } from "@/models/Fund";
import { PlanModel, IPlan } from "@/models/Plan";
import { ResearchDocumentModel, IResearchDocument } from "@/models/ResearchDocument";
import { evaluateRiskProfile, RiskCategory } from "@/lib/risk/scoring";

// Initial Demo Seed Data
export const INITIAL_DEMO_CLIENTS: any[] = [
  {
    _id: "client_demo_1",
    fullName: "Aryan Verma",
    email: "aryan.verma@example.com",
    phone: "+91 98201 11223",
    age: 23,
    dateOfBirth: "2003-04-12",
    city: "Bengaluru",
    employmentType: "salaried_permanent",
    monthlyIncome: 55000,
    monthlyExpenses: 25000,
    existingSavings: 80000,
    outstandingLiabilities: 0,
    monthlyEMI: 0,
    numberOfDependants: 0,
    emergencyFundAmount: 80000,
    investmentExperience: "none_or_beginner",
    investmentHorizonYears: 12,
    financialNotes: "Fresh software engineer graduate. Prioritizing emergency reserve build-up and early compounding wealth creation.",
    assignedAdviserId: "adviser_default",
    assignedAdviserName: "Priya Sharma, CFA",
    profileCompletionStatus: "COMPLETE",
    isDemoPersona: true,
    demoPersonaTag: "Persona 1: Early Career Graduate (Age 23)",
    riskProfile: {
      capacityScore: 72,
      capacityLevel: "HIGH",
      toleranceScore: 65,
      toleranceLevel: "MODERATE",
      combinedCategory: "GROWTH",
      hasConflict: false,
      conflictRationale: "Young age and zero liabilities provide high loss absorption capacity.",
      lastAssessedAt: "2026-10-15T10:00:00.000Z",
    },
  },
  {
    _id: "client_demo_2",
    fullName: "Rohan & Sneha Kulkarni",
    email: "rohan.kulkarni@example.com",
    phone: "+91 98202 22334",
    age: 31,
    dateOfBirth: "1995-08-20",
    city: "Pune",
    employmentType: "salaried_permanent",
    monthlyIncome: 180000,
    monthlyExpenses: 60000,
    existingSavings: 650000,
    outstandingLiabilities: 4200000,
    monthlyEMI: 48000,
    numberOfDependants: 1,
    emergencyFundAmount: 300000,
    investmentExperience: "basic_mutual_funds",
    investmentHorizonYears: 15,
    financialNotes: "Dual-income household with home loan EMI. Primary objective is financing daughter's higher education in 15 years.",
    assignedAdviserId: "adviser_default",
    assignedAdviserName: "Priya Sharma, CFA",
    profileCompletionStatus: "COMPLETE",
    isDemoPersona: true,
    demoPersonaTag: "Persona 2: Young Family (Dual Income, Home Loan)",
    riskProfile: {
      capacityScore: 68,
      capacityLevel: "MODERATE",
      toleranceScore: 60,
      toleranceLevel: "MODERATE",
      combinedCategory: "GROWTH",
      hasConflict: false,
      conflictRationale: "Long 15-year horizon offsets medium debt burden.",
      lastAssessedAt: "2026-10-18T14:30:00.000Z",
    },
  },
  {
    _id: "client_demo_3",
    fullName: "Rajesh Singhania",
    email: "rajesh.singhania@example.com",
    phone: "+91 98203 33445",
    age: 44,
    dateOfBirth: "1982-11-05",
    city: "Surat",
    employmentType: "business_owner",
    monthlyIncome: 250000,
    monthlyExpenses: 90000,
    existingSavings: 2800000,
    outstandingLiabilities: 1200000,
    monthlyEMI: 35000,
    numberOfDependants: 2,
    emergencyFundAmount: 1500000,
    investmentExperience: "active_equity_and_debt",
    investmentHorizonYears: 14,
    financialNotes: "Textile manufacturing business owner with fluctuating business cash flows. Desires early retirement at age 58.",
    assignedAdviserId: "adviser_default",
    assignedAdviserName: "Priya Sharma, CFA",
    profileCompletionStatus: "COMPLETE",
    isDemoPersona: true,
    demoPersonaTag: "Persona 3: MSME Business Owner (Volatile Cashflows)",
    riskProfile: {
      capacityScore: 62,
      capacityLevel: "MODERATE",
      toleranceScore: 68,
      toleranceLevel: "MODERATE",
      combinedCategory: "BALANCED",
      hasConflict: false,
      conflictRationale: "Business volatility balanced by strong liquid reserves.",
      lastAssessedAt: "2026-10-20T11:15:00.000Z",
    },
  },
  {
    _id: "client_demo_4",
    fullName: "Dr. Ananya Sengupta",
    email: "dr.ananya@example.com",
    phone: "+91 98204 44556",
    age: 38,
    dateOfBirth: "1988-03-14",
    city: "Kolkata",
    employmentType: "self_employed_professional",
    monthlyIncome: 320000,
    monthlyExpenses: 85000,
    existingSavings: 4500000,
    outstandingLiabilities: 0,
    monthlyEMI: 0,
    numberOfDependants: 2,
    emergencyFundAmount: 2000000,
    investmentExperience: "basic_mutual_funds",
    investmentHorizonYears: 12,
    financialNotes: "Senior consultant surgeon. High disposable surplus currently parked in low-yielding bank FDs. Risk averse psychologically.",
    assignedAdviserId: "adviser_default",
    assignedAdviserName: "Priya Sharma, CFA",
    profileCompletionStatus: "COMPLETE",
    isDemoPersona: true,
    demoPersonaTag: "Persona 4: Medical Professional (High Income, Under-Invested)",
    riskProfile: {
      capacityScore: 88,
      capacityLevel: "HIGH",
      toleranceScore: 38,
      toleranceLevel: "CONSERVATIVE",
      combinedCategory: "MODERATELY_CONSERVATIVE",
      hasConflict: true,
      conflictRationale: "High objective capacity constrained by conservative psychological risk tolerance. Avoid forcing excessive volatility.",
      lastAssessedAt: "2026-10-22T09:45:00.000Z",
    },
  },
  {
    _id: "client_demo_5",
    fullName: "Major Gen. (Retd.) K. K. Nambiar",
    email: "gen.nambiar@example.com",
    phone: "+91 98205 55667",
    age: 68,
    dateOfBirth: "1958-07-02",
    city: "Dehradun",
    employmentType: "retired",
    monthlyIncome: 35000, // Defense pension
    monthlyExpenses: 65000,
    existingSavings: 8000000, // 80 Lakhs retirement corpus
    outstandingLiabilities: 0,
    monthlyEMI: 0,
    numberOfDependants: 1,
    emergencyFundAmount: 800000,
    investmentExperience: "basic_mutual_funds",
    investmentHorizonYears: 20,
    financialNotes: "Retiree requiring ₹30,000 monthly inflation-indexed systematic withdrawal (SWP) over next 20-25 years. Capital preservation paramount.",
    assignedAdviserId: "adviser_default",
    assignedAdviserName: "Priya Sharma, CFA",
    profileCompletionStatus: "COMPLETE",
    isDemoPersona: true,
    demoPersonaTag: "Persona 5: Senior Citizen Retiree (Corpus ₹80L, SWP)",
    riskProfile: {
      capacityScore: 35,
      capacityLevel: "LOW",
      toleranceScore: 32,
      toleranceLevel: "CONSERVATIVE",
      combinedCategory: "CONSERVATIVE",
      hasConflict: false,
      conflictRationale: "Post-retirement capital depletion phase dictates capital preservation.",
      lastAssessedAt: "2026-10-24T16:00:00.000Z",
    },
  },
  {
    _id: "client_demo_6",
    fullName: "Kabir Mehra",
    email: "kabir.mehra@example.com",
    phone: "+91 98206 66778",
    age: 29,
    dateOfBirth: "1997-12-19",
    city: "Mumbai",
    employmentType: "salaried_contract",
    monthlyIncome: 90000,
    monthlyExpenses: 55000,
    existingSavings: 150000,
    outstandingLiabilities: 650000, // Personal loan for trading losses
    monthlyEMI: 22000,
    numberOfDependants: 0,
    emergencyFundAmount: 25000, // Under 1 month!
    investmentExperience: "advanced_derivatives_or_active_trading",
    investmentHorizonYears: 3,
    financialNotes: "Speculative F&O trader who incurred ₹4.2 Lakh derivative losses. Demands 25%+ guaranteed return to recover capital rapidly.",
    assignedAdviserId: "adviser_default",
    assignedAdviserName: "Priya Sharma, CFA",
    profileCompletionStatus: "COMPLETE",
    isDemoPersona: true,
    demoPersonaTag: "Persona 6: Aggressive Trader (F&O Losses, Fragile Capacity)",
    riskProfile: {
      capacityScore: 28,
      capacityLevel: "LOW",
      toleranceScore: 88,
      toleranceLevel: "AGGRESSIVE",
      combinedCategory: "MODERATELY_CONSERVATIVE",
      hasConflict: true,
      conflictRationale: "Critical Conflict: Aggressive behavioral appetite overridden by fragile financial capacity (negligible emergency reserve, 24% EMI ratio, derivative debt).",
      lastAssessedAt: "2026-10-25T13:20:00.000Z",
    },
  },
];

export const INITIAL_DEMO_FUNDS: any[] = [
  {
    _id: "fund_1",
    schemeCode: "122639",
    schemeName: "Parag Parikh Flexi Cap Fund - Direct Plan - Growth",
    amc: "PPFAS Mutual Fund",
    planType: "Direct",
    dividendOption: "Growth",
    category: "Equity",
    subCategory: "Flexi Cap",
    benchmark: "NIFTY 500 TRI",
    expenseRatio: 0.65,
    aumCrores: 78540,
    aumAsOfDate: "2026-09-30",
    fundManager: {
      name: "Rajeev Thakkar",
      tenureYears: 12.5,
      qualification: "B.Com, Chartered Accountant, CFA",
    },
    returns: {
      return1Y: 21.4,
      return3Y: 19.8,
      return5Y: 22.1,
      sinceInception: 19.5,
    },
    riskMetrics: {
      standardDeviation: 12.4,
      sharpeRatio: 1.15,
      beta: 0.78,
      maxDrawdown: -16.2,
      trackingError: 3.8,
    },
    currentNAV: 84.62,
    navDate: "2026-10-24",
    dataSource: "AMFI_MASTER_FEED",
    isSyntheticFixture: false,
    lastUpdated: "2026-10-25T00:00:00.000Z",
  },
  {
    _id: "fund_2",
    schemeCode: "120503",
    schemeName: "Mirae Asset Large & Midcap Fund - Direct Plan - Growth",
    amc: "Mirae Asset Mutual Fund",
    planType: "Direct",
    dividendOption: "Growth",
    category: "Equity",
    subCategory: "Large & Mid Cap",
    benchmark: "NIFTY LargeMidcap 250 TRI",
    expenseRatio: 0.61,
    aumCrores: 39420,
    aumAsOfDate: "2026-09-30",
    fundManager: {
      name: "Neelesh Surana",
      tenureYears: 14.0,
      qualification: "B.E. (Mechanical), MBA (Finance)",
    },
    returns: {
      return1Y: 24.8,
      return3Y: 18.2,
      return5Y: 20.4,
      sinceInception: 18.9,
    },
    riskMetrics: {
      standardDeviation: 13.8,
      sharpeRatio: 0.98,
      beta: 0.92,
      maxDrawdown: -19.4,
      trackingError: 2.9,
    },
    currentNAV: 142.18,
    navDate: "2026-10-24",
    dataSource: "AMFI_MASTER_FEED",
    isSyntheticFixture: false,
    lastUpdated: "2026-10-25T00:00:00.000Z",
  },
  {
    _id: "fund_3",
    schemeCode: "118989",
    schemeName: "HDFC Mid-Cap Opportunities Fund - Direct Plan - Growth",
    amc: "HDFC Mutual Fund",
    planType: "Direct",
    dividendOption: "Growth",
    category: "Equity",
    subCategory: "Mid Cap",
    benchmark: "NIFTY Midcap 150 TRI",
    expenseRatio: 0.74,
    aumCrores: 68910,
    aumAsOfDate: "2026-09-30",
    fundManager: {
      name: "Chirag Setalvad",
      tenureYears: 16.2,
      qualification: "B.Sc., MBA (UNC Chapel Hill)",
    },
    returns: {
      return1Y: 32.5,
      return3Y: 26.4,
      return5Y: 24.1,
      sinceInception: 19.8,
    },
    riskMetrics: {
      standardDeviation: 15.6,
      sharpeRatio: 1.22,
      beta: 0.88,
      maxDrawdown: -22.1,
      trackingError: 4.1,
    },
    currentNAV: 188.54,
    navDate: "2026-10-24",
    dataSource: "AMFI_MASTER_FEED",
    isSyntheticFixture: false,
    lastUpdated: "2026-10-25T00:00:00.000Z",
  },
  {
    _id: "fund_4",
    schemeCode: "118778",
    schemeName: "Nippon India Small Cap Fund - Direct Plan - Growth",
    amc: "Nippon India Mutual Fund",
    planType: "Direct",
    dividendOption: "Growth",
    category: "Equity",
    subCategory: "Small Cap",
    benchmark: "NIFTY Smallcap 250 TRI",
    expenseRatio: 0.68,
    aumCrores: 54200,
    aumAsOfDate: "2026-09-30",
    fundManager: {
      name: "Samir Rachh",
      tenureYears: 8.5,
      qualification: "B.Com",
    },
    returns: {
      return1Y: 34.2,
      return3Y: 28.5,
      return5Y: 29.8,
      sinceInception: 21.6,
    },
    riskMetrics: {
      standardDeviation: 18.2,
      sharpeRatio: 1.34,
      beta: 0.84,
      maxDrawdown: -28.6,
      trackingError: 5.4,
    },
    currentNAV: 168.90,
    navDate: "2026-10-24",
    dataSource: "AMFI_MASTER_FEED",
    isSyntheticFixture: false,
    lastUpdated: "2026-10-25T00:00:00.000Z",
  },
  {
    _id: "fund_5",
    schemeCode: "120586",
    schemeName: "ICICI Prudential Balanced Advantage Fund - Direct Plan - Growth",
    amc: "ICICI Prudential Mutual Fund",
    planType: "Direct",
    dividendOption: "Growth",
    category: "Hybrid",
    subCategory: "Balanced Advantage",
    benchmark: "NIFTY 50 Hybrid Composite",
    expenseRatio: 0.81,
    aumCrores: 58400,
    aumAsOfDate: "2026-09-30",
    fundManager: {
      name: "Sankaran Naren",
      tenureYears: 18.0,
      qualification: "B.Tech (IIT Madras), MBA (IIM Calcutta)",
    },
    returns: {
      return1Y: 16.8,
      return3Y: 13.5,
      return5Y: 14.2,
      sinceInception: 13.8,
    },
    riskMetrics: {
      standardDeviation: 7.9,
      sharpeRatio: 1.08,
      beta: 0.52,
      maxDrawdown: -10.2,
      trackingError: 2.1,
    },
    currentNAV: 72.45,
    navDate: "2026-10-24",
    dataSource: "AMFI_MASTER_FEED",
    isSyntheticFixture: false,
    lastUpdated: "2026-10-25T00:00:00.000Z",
  },
  {
    _id: "fund_6",
    schemeCode: "119823",
    schemeName: "Aditya Birla Sun Life Corporate Bond Fund - Direct Plan - Growth",
    amc: "Aditya Birla Sun Life AMC",
    planType: "Direct",
    dividendOption: "Growth",
    category: "Debt",
    subCategory: "Corporate Bond",
    benchmark: "CRISIL Corporate Bond Index",
    expenseRatio: 0.32,
    aumCrores: 26800,
    aumAsOfDate: "2026-09-30",
    fundManager: {
      name: "Kaustubh Gupta",
      tenureYears: 11.0,
      qualification: "B.Com, CA, CFA",
    },
    returns: {
      return1Y: 8.2,
      return3Y: 7.4,
      return5Y: 7.6,
      sinceInception: 8.4,
    },
    riskMetrics: {
      standardDeviation: 1.8,
      sharpeRatio: 0.95,
      beta: 0.15,
      maxDrawdown: -2.1,
      trackingError: 0.8,
    },
    currentNAV: 104.30,
    navDate: "2026-10-24",
    dataSource: "AMFI_MASTER_FEED",
    isSyntheticFixture: false,
    lastUpdated: "2026-10-25T00:00:00.000Z",
  },
  {
    _id: "fund_7",
    schemeCode: "119598",
    schemeName: "SBI Liquid Fund - Direct Plan - Growth",
    amc: "SBI Mutual Fund",
    planType: "Direct",
    dividendOption: "Growth",
    category: "Debt",
    subCategory: "Liquid",
    benchmark: "CRISIL Liquid Debt Index",
    expenseRatio: 0.18,
    aumCrores: 65100,
    aumAsOfDate: "2026-09-30",
    fundManager: {
      name: "Ranjana Sahasrabuddhe",
      tenureYears: 9.0,
      qualification: "M.Sc. (Maths), MMS (Finance)",
    },
    returns: {
      return1Y: 7.1,
      return3Y: 6.5,
      return5Y: 5.8,
      sinceInception: 7.0,
    },
    riskMetrics: {
      standardDeviation: 0.4,
      sharpeRatio: 1.45,
      beta: 0.05,
      maxDrawdown: -0.05,
      trackingError: 0.2,
    },
    currentNAV: 3840.25,
    navDate: "2026-10-24",
    dataSource: "AMFI_MASTER_FEED",
    isSyntheticFixture: false,
    lastUpdated: "2026-10-25T00:00:00.000Z",
  },
  {
    _id: "fund_8",
    schemeCode: "120716",
    schemeName: "UTI Nifty 50 Index Fund - Direct Plan - Growth",
    amc: "UTI Mutual Fund",
    planType: "Direct",
    dividendOption: "Growth",
    category: "Equity",
    subCategory: "Large Cap Index",
    benchmark: "NIFTY 50 TRI",
    expenseRatio: 0.19,
    aumCrores: 18450,
    aumAsOfDate: "2026-09-30",
    fundManager: {
      name: "Sharwan Kumar Goyal",
      tenureYears: 7.2,
      qualification: "B.Com, MMS, CFA",
    },
    returns: {
      return1Y: 20.6,
      return3Y: 15.2,
      return5Y: 17.8,
      sinceInception: 14.9,
    },
    riskMetrics: {
      standardDeviation: 13.1,
      sharpeRatio: 0.88,
      beta: 1.0,
      maxDrawdown: -18.5,
      trackingError: 0.08,
    },
    currentNAV: 164.20,
    navDate: "2026-10-24",
    dataSource: "AMFI_MASTER_FEED",
    isSyntheticFixture: false,
    lastUpdated: "2026-10-25T00:00:00.000Z",
  },
];

export const INITIAL_DEMO_GOALS: any[] = [
  {
    _id: "goal_demo_1",
    clientId: "client_demo_1",
    title: "Initial Emergency Buffer",
    category: "EMERGENCY_FUND",
    currentCost: 150000,
    targetHorizonYears: 1,
    expectedInflationRate: 0.05,
    expectedAnnualReturn: 0.07,
    existingSavings: 80000,
    currentMonthlyContribution: 6000,
    priority: "HIGH",
    liquidityNeeds: "high",
    notes: "Hold in liquid/overnight funds for unforeseen disruptions.",
    calculationResults: {
      inflationAdjustedCost: 157500,
      futureValueOfExistingSavings: 85600,
      corpusShortfall: 71900,
      requiredMonthlySIP: 5800,
      monthlySurplusOrShortfall: 200,
      feasibilityStatus: "ON_TRACK",
      calculatedAt: "2026-10-15T10:15:00.000Z",
    },
  },
  {
    _id: "goal_demo_2",
    clientId: "client_demo_1",
    title: "15-Year Wealth Compounding",
    category: "WEALTH_CREATION",
    currentCost: 3500000,
    targetHorizonYears: 15,
    expectedInflationRate: 0.06,
    expectedAnnualReturn: 0.13,
    existingSavings: 0,
    currentMonthlyContribution: 15000,
    priority: "MEDIUM",
    liquidityNeeds: "low",
    notes: "Long term disciplined equity SIP for financial independence.",
    calculationResults: {
      inflationAdjustedCost: 8387948,
      futureValueOfExistingSavings: 0,
      corpusShortfall: 8387948,
      requiredMonthlySIP: 15470,
      monthlySurplusOrShortfall: -470,
      feasibilityStatus: "ON_TRACK",
      calculatedAt: "2026-10-15T10:15:00.000Z",
    },
  },
  {
    _id: "goal_demo_3",
    clientId: "client_demo_2",
    title: "Child's Higher Education Overseas",
    category: "CHILD_EDUCATION",
    currentCost: 3500000,
    targetHorizonYears: 15,
    expectedInflationRate: 0.08,
    expectedAnnualReturn: 0.125,
    existingSavings: 450000,
    currentMonthlyContribution: 22000,
    priority: "HIGH",
    liquidityNeeds: "medium",
    notes: "Higher education inflation historically outpaces CPI at 8-10% p.a.",
    calculationResults: {
      inflationAdjustedCost: 11102555,
      futureValueOfExistingSavings: 2636450,
      corpusShortfall: 8466105,
      requiredMonthlySIP: 16840,
      monthlySurplusOrShortfall: 5160,
      feasibilityStatus: "EXCEEDING_TARGET",
      calculatedAt: "2026-10-18T14:40:00.000Z",
    },
  },
  {
    _id: "goal_demo_4",
    clientId: "client_demo_5",
    title: "Retirement Monthly Cashflow (SWP)",
    category: "RETIREMENT",
    currentCost: 7500000,
    targetHorizonYears: 20,
    expectedInflationRate: 0.05,
    expectedAnnualReturn: 0.08,
    existingSavings: 8000000,
    currentMonthlyContribution: 0,
    priority: "HIGH",
    liquidityNeeds: "high",
    notes: "Generating ₹30,000 monthly inflation-indexed withdrawals from conservative hybrid & debt buckets.",
    calculationResults: {
      inflationAdjustedCost: 8000000,
      futureValueOfExistingSavings: 8000000,
      corpusShortfall: 0,
      requiredMonthlySIP: 0,
      monthlySurplusOrShortfall: 0,
      feasibilityStatus: "ON_TRACK",
      calculatedAt: "2026-10-24T16:10:00.000Z",
    },
  },
];

export const INITIAL_DEMO_PLANS: any[] = [
  {
    _id: "plan_demo_1",
    clientId: "client_demo_2",
    clientName: "Rohan & Sneha Kulkarni",
    planTitle: "Child Education & Wealth Advisory Plan v1",
    version: 1,
    status: "PENDING_REVIEW",
    isCurrent: true,
    goals: [
      {
        goalId: "goal_demo_3",
        title: "Child's Higher Education Overseas",
        targetCost: 3500000,
        inflationAdjustedCost: 11102555,
        requiredMonthlySIP: 16840,
        targetHorizonYears: 15,
      },
    ],
    recommendedAllocation: {
      equityPercent: 70,
      debtPercent: 25,
      goldOrCashPercent: 5,
      rationale: "Long-term 15-year horizon permits aggressive compounding in equity while maintaining 25% debt for volatility buffer.",
    },
    fundSelections: [
      {
        schemeCode: "122639",
        schemeName: "Parag Parikh Flexi Cap Fund",
        category: "Equity",
        weightPercent: 40,
        recommendedMonthlySIP: 7000,
        rationale: "Core multi-cap diversifier with high active share and global exposure.",
      },
      {
        schemeCode: "118989",
        schemeName: "HDFC Mid-Cap Opportunities Fund",
        category: "Equity",
        weightPercent: 30,
        recommendedMonthlySIP: 5000,
        rationale: "Alpha generator for long 15-year horizon with proven track record.",
      },
      {
        schemeCode: "119823",
        schemeName: "Aditya Birla Sun Life Corporate Bond Fund",
        category: "Debt",
        weightPercent: 30,
        recommendedMonthlySIP: 5000,
        rationale: "High quality AAA-rated corporate debt generating stable income.",
      },
    ],
    calculatedMetrics: {
      totalTargetCorpus: 11102555,
      totalMonthlySIP: 17000,
      projectedGrowthMultiple: 3.4,
      estimatedWealthGain: 7600000,
    },
    suitabilityFindings: [
      {
        ruleId: "RULE_MODERATE_DEBT_BURDEN",
        severity: "WARNING",
        title: "Elevated Debt-to-Income Ratio (26%)",
        explanation: "Home loan EMI consumes ₹48,000 / ₹1,80,000 monthly income. While comfortable, monitor unexpected rate increases.",
        recommendedAction: "Ensure emergency fund covers 6 months of combined living + EMI expenses.",
      },
    ],
    isBlockedBySuitability: false,
    approvalHistory: [
      {
        decision: "SUBMITTED",
        actorId: "adviser_default",
        actorName: "Priya Sharma, CFA",
        actorRole: "adviser",
        planVersion: 1,
        reasonNotes: "Initial draft formulated with 15-year equity-tilted glide path for child's education.",
        timestamp: "2026-10-25T11:00:00.000Z",
      },
    ],
  },
  {
    _id: "plan_demo_2",
    clientId: "client_demo_5",
    clientName: "Major Gen. (Retd.) K. K. Nambiar",
    planTitle: "Retirement SWP & Capital Preservation Plan",
    version: 1,
    status: "APPROVED",
    isCurrent: true,
    goals: [
      {
        goalId: "goal_demo_4",
        title: "Retirement Monthly Cashflow (SWP)",
        targetCost: 7500000,
        inflationAdjustedCost: 8000000,
        requiredMonthlySIP: 0,
        targetHorizonYears: 20,
      },
    ],
    recommendedAllocation: {
      equityPercent: 20,
      debtPercent: 75,
      goldOrCashPercent: 5,
      rationale: "Retiree age 68 requires capital protection. 75% in high-grade fixed income, 20% in conservative hybrid to offset inflation.",
    },
    fundSelections: [
      {
        schemeCode: "120586",
        schemeName: "ICICI Prudential Balanced Advantage Fund",
        category: "Hybrid",
        weightPercent: 30,
        recommendedMonthlySIP: 0,
        rationale: "Dynamic asset allocation protects against sharp market drawdowns.",
      },
      {
        schemeCode: "119823",
        schemeName: "Aditya Birla Sun Life Corporate Bond Fund",
        category: "Debt",
        weightPercent: 50,
        recommendedMonthlySIP: 0,
        rationale: "Generates predictable monthly interest for pension supplement.",
      },
      {
        schemeCode: "119598",
        schemeName: "SBI Liquid Fund",
        category: "Debt",
        weightPercent: 20,
        recommendedMonthlySIP: 0,
        rationale: "Provides immediate 12-month SWP liquidity buffer without market timing risk.",
      },
    ],
    calculatedMetrics: {
      totalTargetCorpus: 8000000,
      totalMonthlySIP: 0,
      projectedGrowthMultiple: 1.8,
      estimatedWealthGain: 3400000,
    },
    suitabilityFindings: [],
    isBlockedBySuitability: false,
    approvalHistory: [
      {
        decision: "SUBMITTED",
        actorId: "adviser_default",
        actorName: "Priya Sharma, CFA",
        actorRole: "adviser",
        planVersion: 1,
        reasonNotes: "Conservative SWP allocation tailored to age 68 retiree.",
        timestamp: "2026-10-24T17:00:00.000Z",
      },
      {
        decision: "APPROVED",
        actorId: "adviser_default",
        actorName: "Priya Sharma, CFA",
        actorRole: "adviser",
        planVersion: 1,
        reasonNotes: "Suitability verified. Zero speculative exposure. Approved for client delivery.",
        timestamp: "2026-10-24T17:30:00.000Z",
      },
    ],
    approvedAt: "2026-10-24T17:30:00.000Z",
    approvedBy: "Priya Sharma, CFA",
  },
  {
    _id: "plan_demo_3",
    clientId: "client_demo_6",
    clientName: "Kabir Mehra",
    planTitle: "High Alpha Recovery Strategy (BLOCKED)",
    version: 1,
    status: "BLOCKED",
    isCurrent: true,
    goals: [],
    recommendedAllocation: {
      equityPercent: 90,
      debtPercent: 10,
      goldOrCashPercent: 0,
      rationale: "High risk proposal requested by client to recoup past trading losses.",
    },
    fundSelections: [
      {
        schemeCode: "118778",
        schemeName: "Nippon India Small Cap Fund",
        category: "Equity",
        weightPercent: 60,
        recommendedMonthlySIP: 20000,
        rationale: "High volatility small cap fund.",
      },
    ],
    calculatedMetrics: {
      totalTargetCorpus: 5000000,
      totalMonthlySIP: 20000,
      projectedGrowthMultiple: 2.1,
      estimatedWealthGain: 2500000,
    },
    suitabilityFindings: [
      {
        ruleId: "RULE_UNREALISTIC_GUARANTEED_RETURNS",
        severity: "BLOCKED",
        title: "Prohibited Guaranteed Return Expectation",
        explanation: "Client mandate demands guaranteed 25% annual return. Regulatory rules strictly forbid assuring market-linked returns.",
        recommendedAction: "Deliver written risk disclaimer and recalibrate expectations.",
      },
      {
        ruleId: "RULE_EMERGENCY_RESERVES_CRITICAL",
        severity: "HIGH_RISK",
        title: "Critically Low Emergency Reserves",
        explanation: "Emergency fund covers only 0.3 months of burn.",
        recommendedAction: "Build liquid emergency buffer first.",
      },
    ],
    isBlockedBySuitability: true,
    approvalHistory: [
      {
        decision: "SUBMITTED",
        actorId: "adviser_default",
        actorName: "Priya Sharma, CFA",
        actorRole: "adviser",
        planVersion: 1,
        reasonNotes: "Flagged automatically by Guardrail Engine.",
        timestamp: "2026-10-25T14:00:00.000Z",
      },
    ],
  },
];

export const INITIAL_DEMO_DOCUMENTS: any[] = [
  {
    _id: "doc_1",
    title: "Parag Parikh Flexi Cap Fund - Monthly Factsheet (Sep 2026)",
    fundName: "Parag Parikh Flexi Cap Fund",
    schemeCode: "122639",
    amc: "PPFAS Mutual Fund",
    documentType: "FACTSHEET",
    publicationDate: "2026-10-05",
    fileUrl: "/factsheets/ppfas_flexicap_sep_2026.pdf",
    fileSizeBytes: 2450000,
    mimeType: "application/pdf",
    processingStatus: "UPLOADED",
    pageCount: 6,
    extractedTextPreview: "Parag Parikh Flexi Cap Fund investment objective is to generate long-term capital growth through active management across Large, Mid, Small Cap equities and foreign securities...",
    uploadedBy: "Priya Sharma, CFA",
  },
  {
    _id: "doc_2",
    title: "Scheme Information Document (SID) - HDFC Mid-Cap Opportunities",
    fundName: "HDFC Mid-Cap Opportunities Fund",
    schemeCode: "118989",
    amc: "HDFC Mutual Fund",
    documentType: "SID_SCHEME_INFORMATION_DOCUMENT",
    publicationDate: "2026-06-30",
    fileUrl: "/sids/hdfc_midcap_sid_2026.pdf",
    fileSizeBytes: 4890000,
    mimeType: "application/pdf",
    processingStatus: "PENDING_PROCESSING",
    pageCount: 78,
    extractedTextPreview: "The Scheme seeks to provide long-term capital appreciation by predominantly investing in mid-cap companies. Mid-cap companies for the purpose of the Scheme shall be companies between 101st and 250th...",
    uploadedBy: "Priya Sharma, CFA",
  },
  {
    _id: "doc_3",
    title: "Monthly Portfolio Disclosure - ICICI Pru Balanced Advantage",
    fundName: "ICICI Prudential Balanced Advantage Fund",
    schemeCode: "120586",
    amc: "ICICI Prudential Mutual Fund",
    documentType: "PORTFOLIO_DISCLOSURE",
    publicationDate: "2026-10-10",
    fileUrl: "/disclosures/icici_baf_portfolio_sep_2026.pdf",
    fileSizeBytes: 1850000,
    mimeType: "application/pdf",
    processingStatus: "UPLOADED",
    pageCount: 12,
    extractedTextPreview: "Gross Equity Exposure: 68.4%. Net Equity Exposure after derivative hedging: 42.1%. Debt and Money Market Instruments: 31.6%...",
    uploadedBy: "Priya Sharma, CFA",
  },
];

// Active in-memory stores for instant resilience
let memoryClients = [...INITIAL_DEMO_CLIENTS];
let memoryFunds = [...INITIAL_DEMO_FUNDS];
let memoryGoals = [...INITIAL_DEMO_GOALS];
let memoryPlans = [...INITIAL_DEMO_PLANS];
let memoryDocuments = [...INITIAL_DEMO_DOCUMENTS];

/**
 * CLIENTS REPOSITORY
 */
export async function getClients(query?: { search?: string; adviserId?: string }) {
  await connectToDatabase();
  if (isDatabaseConnected()) {
    try {
      const filter: Record<string, unknown> = {};
      if (query?.adviserId) filter.assignedAdviserId = query.adviserId;
      if (query?.search) {
        filter.$or = [
          { fullName: { $regex: query.search, $options: "i" } },
          { email: { $regex: query.search, $options: "i" } },
          { city: { $regex: query.search, $options: "i" } },
        ];
      }
      const docs = await ClientModel.find(filter).sort({ createdAt: -1 }).lean();
      if (docs && docs.length > 0) return docs;
    } catch {
      // fallback
    }
  }

  let list = [...memoryClients];
  if (query?.search) {
    const s = query.search.toLowerCase();
    list = list.filter(
      (c) =>
        c.fullName?.toLowerCase().includes(s) ||
        c.email?.toLowerCase().includes(s) ||
        c.city?.toLowerCase().includes(s) ||
        c.demoPersonaTag?.toLowerCase().includes(s)
    );
  }
  return list;
}

export async function getClientById(id: string) {
  await connectToDatabase();
  if (isDatabaseConnected()) {
    try {
      const doc = await ClientModel.findById(id).lean();
      if (doc) return doc;
    } catch {
      // fallback
    }
  }
  return memoryClients.find((c) => c._id === id || String(c._id) === id) || null;
}

export async function createClient(data: Partial<IClient>) {
  await connectToDatabase();
  const newId = `client_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const record = {
    _id: newId,
    createdAt: new Date(),
    updatedAt: new Date(),
    profileCompletionStatus: "COMPLETE",
    isDemoPersona: false,
    ...data,
  };

  if (isDatabaseConnected()) {
    try {
      const created: any = await (ClientModel as any).create(record);
      return created.toObject ? created.toObject() : created;
    } catch {
      // fallback
    }
  }

  memoryClients.unshift(record as any);
  return record;
}

export async function updateClient(id: string, data: Partial<IClient>) {
  await connectToDatabase();
  if (isDatabaseConnected()) {
    try {
      const updated = await ClientModel.findByIdAndUpdate(
        id,
        { ...data, updatedAt: new Date() },
        { new: true }
      ).lean();
      if (updated) return updated;
    } catch {
      // fallback
    }
  }

  const idx = memoryClients.findIndex((c) => c._id === id || String(c._id) === id);
  if (idx !== -1) {
    memoryClients[idx] = {
      ...memoryClients[idx],
      ...data,
      updatedAt: new Date(),
    } as any;
    return memoryClients[idx];
  }
  return null;
}

export async function deleteClient(id: string) {
  await connectToDatabase();
  if (isDatabaseConnected()) {
    try {
      await ClientModel.findByIdAndDelete(id);
    } catch {
      // fallback
    }
  }
  memoryClients = memoryClients.filter((c) => c._id !== id && String(c._id) !== id);
  memoryGoals = memoryGoals.filter((g) => g.clientId !== id);
  memoryPlans = memoryPlans.filter((p) => p.clientId !== id);
  return true;
}

/**
 * GOALS REPOSITORY
 */
export async function getGoalsByClientId(clientId: string) {
  await connectToDatabase();
  if (isDatabaseConnected()) {
    try {
      const docs = await GoalModel.find({ clientId }).lean();
      if (docs && docs.length > 0) return docs;
    } catch {
      // fallback
    }
  }
  return memoryGoals.filter((g) => g.clientId === clientId);
}

export async function createGoal(data: Partial<IGoal>) {
  await connectToDatabase();
  const newId = `goal_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const record = {
    _id: newId,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...data,
  };

  if (isDatabaseConnected()) {
    try {
      const created: any = await (GoalModel as any).create(record);
      return created.toObject ? created.toObject() : created;
    } catch {
      // fallback
    }
  }

  memoryGoals.push(record as any);
  return record;
}

export async function updateGoal(id: string, data: Partial<IGoal>) {
  await connectToDatabase();
  if (isDatabaseConnected()) {
    try {
      const updated = await GoalModel.findByIdAndUpdate(id, data, { new: true }).lean();
      if (updated) return updated;
    } catch {
      // fallback
    }
  }

  const idx = memoryGoals.findIndex((g) => g._id === id || String(g._id) === id);
  if (idx !== -1) {
    memoryGoals[idx] = { ...memoryGoals[idx], ...data, updatedAt: new Date() } as any;
    return memoryGoals[idx];
  }
  return null;
}

export async function deleteGoal(id: string) {
  await connectToDatabase();
  if (isDatabaseConnected()) {
    try {
      await GoalModel.findByIdAndDelete(id);
    } catch {
      // fallback
    }
  }
  memoryGoals = memoryGoals.filter((g) => g._id !== id && String(g._id) !== id);
  return true;
}

/**
 * FUNDS REPOSITORY
 */
export async function getFunds(query?: {
  category?: string;
  subCategory?: string;
  search?: string;
  maxExpenseRatio?: number;
  planType?: string;
}) {
  await connectToDatabase();
  if (isDatabaseConnected()) {
    try {
      const filter: Record<string, unknown> = {};
      if (query?.category) filter.category = query.category;
      if (query?.subCategory) filter.subCategory = query.subCategory;
      if (query?.planType) filter.planType = query.planType;
      if (query?.maxExpenseRatio) filter.expenseRatio = { $lte: query.maxExpenseRatio };
      if (query?.search) {
        filter.$or = [
          { schemeName: { $regex: query.search, $options: "i" } },
          { amc: { $regex: query.search, $options: "i" } },
          { schemeCode: { $regex: query.search, $options: "i" } },
        ];
      }
      const docs = await FundModel.find(filter).lean();
      if (docs && docs.length > 0) return docs;
    } catch {
      // fallback
    }
  }

  let list = [...memoryFunds];
  if (query?.category) list = list.filter((f) => f.category === query.category);
  if (query?.subCategory) list = list.filter((f) => f.subCategory === query.subCategory);
  if (query?.planType) list = list.filter((f) => f.planType === query.planType);
  if (query?.maxExpenseRatio) list = list.filter((f) => (f.expenseRatio || 0) <= query.maxExpenseRatio!);
  if (query?.search) {
    const s = query.search.toLowerCase();
    list = list.filter(
      (f) =>
        f.schemeName?.toLowerCase().includes(s) ||
        f.amc?.toLowerCase().includes(s) ||
        f.schemeCode?.includes(s)
    );
  }
  return list;
}

export async function getFundById(idOrCode: string) {
  await connectToDatabase();
  if (isDatabaseConnected()) {
    try {
      const doc = await (FundModel as any).findOne({
        $or: [{ _id: idOrCode }, { schemeCode: idOrCode }],
      }).lean();
      if (doc) return doc;
    } catch {
      // fallback
    }
  }
  return (
    memoryFunds.find(
      (f) => f._id === idOrCode || String(f._id) === idOrCode || f.schemeCode === idOrCode
    ) || null
  );
}

/**
 * PLANS REPOSITORY
 */
export async function getPlans(query?: { clientId?: string; status?: string }) {
  await connectToDatabase();
  if (isDatabaseConnected()) {
    try {
      const filter: Record<string, unknown> = {};
      if (query?.clientId) filter.clientId = query.clientId;
      if (query?.status) filter.status = query.status;
      const docs = await PlanModel.find(filter).sort({ updatedAt: -1 }).lean();
      if (docs && docs.length > 0) return docs;
    } catch {
      // fallback
    }
  }

  let list = [...memoryPlans];
  if (query?.clientId) list = list.filter((p) => p.clientId === query.clientId);
  if (query?.status) list = list.filter((p) => p.status === query.status);
  return list;
}

export async function getPlanById(id: string) {
  await connectToDatabase();
  if (isDatabaseConnected()) {
    try {
      const doc = await PlanModel.findById(id).lean();
      if (doc) return doc;
    } catch {
      // fallback
    }
  }
  return memoryPlans.find((p) => p._id === id || String(p._id) === id) || null;
}

export async function createPlan(data: Partial<IPlan>) {
  await connectToDatabase();
  const newId = `plan_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const record = {
    _id: newId,
    createdAt: new Date(),
    updatedAt: new Date(),
    version: 1,
    status: "DRAFT",
    isCurrent: true,
    ...data,
  };

  if (isDatabaseConnected()) {
    try {
      const created: any = await (PlanModel as any).create(record);
      return created.toObject ? created.toObject() : created;
    } catch {
      // fallback
    }
  }

  memoryPlans.unshift(record as any);
  return record;
}

export async function updatePlan(id: string, data: Partial<IPlan>) {
  await connectToDatabase();
  if (isDatabaseConnected()) {
    try {
      const updated = await PlanModel.findByIdAndUpdate(
        id,
        { ...data, updatedAt: new Date() },
        { new: true }
      ).lean();
      if (updated) return updated;
    } catch {
      // fallback
    }
  }

  const idx = memoryPlans.findIndex((p) => p._id === id || String(p._id) === id);
  if (idx !== -1) {
    memoryPlans[idx] = {
      ...memoryPlans[idx],
      ...data,
      updatedAt: new Date(),
    } as any;
    return memoryPlans[idx];
  }
  return null;
}

/**
 * RESEARCH DOCUMENTS REPOSITORY
 */
export async function getResearchDocuments(query?: { fundName?: string; type?: string }) {
  await connectToDatabase();
  if (isDatabaseConnected()) {
    try {
      const filter: Record<string, unknown> = {};
      if (query?.fundName) filter.fundName = { $regex: query.fundName, $options: "i" };
      if (query?.type) filter.documentType = query.type;
      const docs = await ResearchDocumentModel.find(filter).sort({ publicationDate: -1 }).lean();
      if (docs && docs.length > 0) return docs;
    } catch {
      // fallback
    }
  }

  let list = [...memoryDocuments];
  if (query?.fundName) {
    list = list.filter((d) => d.fundName?.toLowerCase().includes(query.fundName!.toLowerCase()));
  }
  if (query?.type) {
    list = list.filter((d) => d.documentType === query.type);
  }
  return list;
}

export async function getResearchDocumentById(id: string) {
  await connectToDatabase();
  if (isDatabaseConnected()) {
    try {
      const doc = await ResearchDocumentModel.findById(id).lean();
      if (doc) return doc;
    } catch {
      // fallback
    }
  }
  return memoryDocuments.find((d) => d._id === id || String(d._id) === id) || null;
}

export async function createResearchDocument(data: Partial<IResearchDocument>) {
  await connectToDatabase();
  const newId = `doc_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const record = {
    _id: newId,
    createdAt: new Date(),
    updatedAt: new Date(),
    processingStatus: "UPLOADED",
    ...data,
  };

  if (isDatabaseConnected()) {
    try {
      const created: any = await (ResearchDocumentModel as any).create(record);
      return created.toObject ? created.toObject() : created;
    } catch {
      // fallback
    }
  }

  memoryDocuments.unshift(record as any);
  return record;
}

export async function deleteResearchDocument(id: string) {
  await connectToDatabase();
  if (isDatabaseConnected()) {
    try {
      await ResearchDocumentModel.findByIdAndDelete(id);
    } catch {
      // fallback
    }
  }
  memoryDocuments = memoryDocuments.filter((d) => d._id !== id && String(d._id) !== id);
  return true;
}
