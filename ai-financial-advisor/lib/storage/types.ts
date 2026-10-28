export type EmploymentType =
  | "salaried_permanent"
  | "salaried_contract"
  | "self_employed_professional"
  | "business_owner"
  | "retired"
  | "student_or_other";

export type InvestmentExperience =
  | "none_or_beginner"
  | "basic_mutual_funds"
  | "active_equity_and_debt"
  | "advanced_derivatives_or_active_trading";

export type RiskLevel = "CONSERVATIVE" | "MODERATE" | "AGGRESSIVE";
export type CapacityLevel = "LOW" | "MODERATE" | "HIGH";
export type CombinedRiskCategory =
  | "CONSERVATIVE"
  | "MODERATELY_CONSERVATIVE"
  | "BALANCED"
  | "GROWTH"
  | "AGGRESSIVE";

export interface RiskProfile {
  capacityScore: number; // 0 - 100
  capacityLevel: CapacityLevel;
  toleranceScore: number; // 0 - 100
  toleranceLevel: RiskLevel;
  combinedCategory: CombinedRiskCategory;
  hasConflict: boolean;
  conflictRationale?: string;
  recommendedEquityPercent?: number;
  recommendedDebtPercent?: number;
  recommendedGoldCashPercent?: number;
  lastAssessedAt: string;
}

export interface Client {
  id: string;
  fullName: string;
  email: string;
  phone?: string;
  age: number;
  dateOfBirth?: string;
  city: string;
  employmentType: EmploymentType;

  // Financial Information
  monthlyIncome: number;
  monthlyExpenses: number;
  existingSavings: number;
  emergencyFundAmount: number;
  existingInvestments: number;
  outstandingLiabilities: number;
  monthlyEMI: number;
  numberOfDependants: number;

  // Investment Profile
  investmentExperience: InvestmentExperience;
  riskTolerance: RiskLevel;
  riskCapacity: CapacityLevel;
  investmentHorizonYears: number;
  existingPortfolioAllocation?: {
    equityPercent: number;
    debtPercent: number;
    goldOrCashPercent: number;
    realEstatePercent?: number;
  };
  financialPreferences?: {
    preferDirectPlans?: boolean;
    avoidHighVolatility?: boolean;
    taxOptimizationPriority?: boolean;
    esgFocus?: boolean;
    liquidityPriority?: "low" | "medium" | "high";
  };
  financialNotes?: string;

  // Calculated Risk Profile & Metadata
  riskProfile?: RiskProfile;
  assignedAdviserName?: string;
  isDemoPersona?: boolean;
  demoPersonaTag?: string;
  createdAt: string;
  updatedAt: string;
}

export type GoalCategory =
  | "EMERGENCY_FUND"
  | "RETIREMENT"
  | "CHILD_EDUCATION"
  | "WEALTH_CREATION"
  | "HOME_PURCHASE"
  | "VACATION_OR_LUXURY"
  | "DEBT_PAYOFF"
  | "OTHER";

export type GoalPriority = "HIGH" | "MEDIUM" | "LOW";
export type FeasibilityStatus =
  | "ON_TRACK"
  | "EXCEEDING_TARGET"
  | "STRETCH_REQUIRED"
  | "UNDERFUNDED";

export interface GoalCalculationResults {
  inflationAdjustedCost: number;
  futureValueOfExistingSavings: number;
  corpusShortfall: number;
  requiredMonthlySIP: number;
  monthlySurplusOrShortfall: number;
  feasibilityStatus: FeasibilityStatus;
  calculatedAt: string;
}

export interface Goal {
  id: string;
  clientId: string;
  title: string;
  category: GoalCategory;
  currentCost: number; // Present cost in INR
  targetAmount?: number; // Target corpus (inflation adjusted or nominal)
  targetHorizonYears: number; // Years from now
  targetDate?: string;
  expectedInflationRate: number; // e.g. 0.06 for 6%
  expectedAnnualReturn: number; // e.g. 0.12 for 12%
  existingSavings: number; // Current funds allocated to this goal
  currentMonthlyContribution: number; // Monthly ongoing savings
  priority: GoalPriority;
  calculationResults?: GoalCalculationResults;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ChatMessage {
  id: string;
  sender: "user" | "assistant" | "system";
  text: string;
  timestamp: string;
  metadata?: {
    intent?: string;
    metrics?: Record<string, any>;
    recommendations?: string[];
    isPlaceholder?: boolean;
    disclosureNote?: string;
  };
}

export interface ChatConversation {
  id: string;
  clientId: string;
  clientName: string;
  title: string;
  messages: ChatMessage[];
  createdAt: string;
  updatedAt: string;
}

export type ReportType =
  | "COMPREHENSIVE_FINANCIAL_PLAN"
  | "NET_WORTH_AND_CASHFLOW_AUDIT"
  | "RETIREMENT_READINESS"
  | "RISK_AND_SUITABILITY_REVIEW"
  | "GOAL_FUNDING_STRATEGY";

export interface FinancialReport {
  id: string;
  clientId: string;
  clientName: string;
  reportType: ReportType;
  title: string;
  adviserName: string;
  adviserRiaNumber: string;
  createdAt: string;
  summary: string;
  keyMetrics: {
    monthlyIncome: number;
    monthlyExpenses: number;
    monthlySurplus: number;
    savingsRatePercent: number;
    emergencyFundMonths: number;
    debtToIncomePercent: number;
    netWorth: number;
    totalGoalCorpusNeeded: number;
    totalRequiredMonthlySIP: number;
  };
  recommendedAllocation: {
    equityPercent: number;
    debtPercent: number;
    goldOrCashPercent: number;
    rationale: string;
  };
  goalRoadmap: Array<{
    title: string;
    targetHorizonYears: number;
    inflationAdjustedCost: number;
    existingSavings: number;
    requiredMonthlySIP: number;
    status: FeasibilityStatus;
  }>;
  suitabilityFindings: Array<{
    severity: "INFO" | "WARNING" | "CRITICAL";
    title: string;
    description: string;
    action: string;
  }>;
  actionPlan: string[];
  fiduciaryNotes: string;
}

export interface ResearchDocument {
  id: string;
  title: string;
  category: "REGULATORY" | "TAXATION" | "ASSET_CLASSES" | "CASE_STUDY" | "USER_UPLOAD";
  source: string;
  publicationDate: string;
  summary: string;
  fullContent?: string;
  fileId?: string; // Reference to IndexedDB file if uploaded
  fileName?: string;
  fileSizeBytes?: number;
  tags: string[];
  createdAt: string;
}

export interface ActivityLog {
  id: string;
  action: string;
  entityType: "CLIENT" | "GOAL" | "CHAT" | "REPORT" | "FILE" | "SETTINGS";
  entityName: string;
  entityId?: string;
  details?: string;
  timestamp: string;
}

export interface UploadedFileMeta {
  id: string;
  clientId?: string;
  clientName?: string;
  fileName: string;
  fileType: "JSON" | "CSV" | "PDF" | "FORM";
  fileSizeBytes: number;
  uploadedAt: string;
  summary?: string;
  parsedSummary?: {
    recordsCount?: number;
    fieldsExtracted?: string[];
    notes?: string;
  };
}

export interface AdviserSettings {
  adviserName: string;
  riaNumber: string;
  firmName: string;
  email: string;
  phone: string;
  officeCity: string;
  aiProvider: "LOCAL_RULE_BASED" | "GOOGLE_GEMINI" | "OPENAI" | "ANTHROPIC";
  apiKey?: string;
  selectedModel?: string;
  theme: "light" | "dark" | "system";
  currency: "INR";
}

