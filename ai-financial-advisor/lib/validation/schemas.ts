import { z } from "zod";

export const LoginSchema = z.object({
  email: z.string().email("Please provide a valid email address."),
  password: z.string().min(6, "Password must be at least 6 characters."),
});

export const ClientFormSchema = z.object({
  fullName: z.string().min(2, "Full name must be at least 2 characters."),
  email: z.string().email("Invalid email address."),
  phone: z.string().min(10, "Phone number must be at least 10 digits."),
  age: z.coerce.number().min(18, "Age must be at least 18.").max(105, "Age must be under 105."),
  dateOfBirth: z.string().optional(),
  city: z.string().min(2, "City name is required."),
  employmentType: z.enum([
    "salaried_permanent",
    "salaried_contract",
    "self_employed_professional",
    "business_owner",
    "retired",
    "student_or_other",
  ]),
  monthlyIncome: z.coerce.number().min(0, "Monthly income cannot be negative."),
  monthlyExpenses: z.coerce.number().min(0, "Monthly expenses cannot be negative."),
  existingSavings: z.coerce.number().min(0, "Existing savings cannot be negative."),
  outstandingLiabilities: z.coerce.number().min(0, "Liabilities cannot be negative."),
  monthlyEMI: z.coerce.number().min(0, "Monthly EMI cannot be negative."),
  numberOfDependants: z.coerce.number().min(0, "Number of dependants cannot be negative."),
  emergencyFundAmount: z.coerce.number().min(0, "Emergency fund cannot be negative."),
  investmentExperience: z.enum([
    "none_or_beginner",
    "basic_mutual_funds",
    "active_equity_and_debt",
    "advanced_derivatives_or_active_trading",
  ]),
  investmentHorizonYears: z.coerce.number().min(1, "Horizon must be at least 1 year.").max(50),
  financialNotes: z.string().optional(),
});

export const GoalFormSchema = z.object({
  clientId: z.string().min(1, "Client ID is required."),
  title: z.string().min(2, "Goal title is required."),
  category: z.enum([
    "EMERGENCY_FUND",
    "CHILD_EDUCATION",
    "HOME_PURCHASE",
    "RETIREMENT",
    "MEDICAL_RESERVE",
    "WEALTH_CREATION",
    "CUSTOM",
  ]),
  currentCost: z.coerce.number().min(1000, "Current estimated cost must be at least ₹1,000."),
  targetHorizonYears: z.coerce.number().min(1, "Target horizon must be at least 1 year.").max(40),
  expectedInflationRate: z.coerce.number().min(0).max(0.3, "Inflation rate between 0% and 30%."),
  expectedAnnualReturn: z.coerce.number().min(0).max(0.35, "Expected return between 0% and 35%."),
  existingSavings: z.coerce.number().min(0).default(0),
  currentMonthlyContribution: z.coerce.number().min(0).default(0),
  priority: z.enum(["HIGH", "MEDIUM", "LOW"]).default("HIGH"),
  liquidityNeeds: z.enum(["low", "medium", "high"]).default("medium"),
  notes: z.string().optional(),
});

export const RiskQuestionnaireSchema = z.object({
  marketLossReaction: z.enum([
    "panic_sell_all",
    "sell_some_to_reduce_risk",
    "hold_and_do_nothing",
    "buy_more_at_discount",
  ]),
  volatilityComfort: z.enum([
    "very_uncomfortable",
    "mildly_uncomfortable",
    "comfortable_with_fluctuations",
    "thrives_on_volatility",
  ]),
  investmentExperience: z.enum([
    "none_or_beginner",
    "basic_mutual_funds",
    "active_equity_and_debt",
    "advanced_derivatives_or_active_trading",
  ]),
  acceptableDrawdown: z.enum([
    "zero_loss",
    "up_to_10_percent",
    "up_to_20_percent",
    "greater_than_20_percent",
  ]),
  primaryObjective: z.enum([
    "capital_preservation",
    "stable_income",
    "balanced_wealth_accumulation",
    "aggressive_capital_growth",
  ]),
});

export const PlanApprovalActionSchema = z.object({
  action: z.enum(["SUBMIT_FOR_REVIEW", "APPROVE", "REJECT", "REQUEST_CHANGES"]),
  reasonNotes: z.string().min(3, "Mandatory reason notes required for audit compliance."),
});
