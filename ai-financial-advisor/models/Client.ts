import mongoose, { Schema, Model } from "mongoose";

export interface IClient {
  _id?: any;
  fullName: string;
  email: string;
  phone: string;
  age: number;
  dateOfBirth?: string;
  city: string;
  employmentType: "salaried_permanent" | "salaried_contract" | "self_employed_professional" | "business_owner" | "retired" | "student_or_other";
  monthlyIncome: number;
  monthlyExpenses: number;
  existingSavings: number;
  outstandingLiabilities: number;
  monthlyEMI: number;
  numberOfDependants: number;
  emergencyFundAmount: number;
  investmentExperience: "none_or_beginner" | "basic_mutual_funds" | "active_equity_and_debt" | "advanced_derivatives_or_active_trading";
  investmentHorizonYears: number;
  financialNotes?: string;
  assignedAdviserId: string;
  assignedAdviserName: string;
  profileCompletionStatus: "INCOMPLETE" | "PARTIAL" | "COMPLETE";
  
  riskProfile?: {
    capacityScore: number;
    capacityLevel: "LOW" | "MODERATE" | "HIGH";
    toleranceScore: number;
    toleranceLevel: "CONSERVATIVE" | "MODERATE" | "AGGRESSIVE";
    combinedCategory: "CONSERVATIVE" | "MODERATELY_CONSERVATIVE" | "BALANCED" | "GROWTH" | "AGGRESSIVE";
    hasConflict: boolean;
    conflictRationale?: string;
    questionnaireResponses?: Record<string, string>;
    lastAssessedAt: string;
  };

  isDemoPersona?: boolean;
  demoPersonaTag?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

const ClientSchema = new Schema<IClient>(
  {
    fullName: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true },
    phone: { type: String, default: "" },
    age: { type: Number, required: true },
    dateOfBirth: { type: String, default: "" },
    city: { type: String, default: "Mumbai" },
    employmentType: {
      type: String,
      enum: ["salaried_permanent", "salaried_contract", "self_employed_professional", "business_owner", "retired", "student_or_other"],
      default: "salaried_permanent",
    },
    monthlyIncome: { type: Number, required: true, default: 0 },
    monthlyExpenses: { type: Number, required: true, default: 0 },
    existingSavings: { type: Number, default: 0 },
    outstandingLiabilities: { type: Number, default: 0 },
    monthlyEMI: { type: Number, default: 0 },
    numberOfDependants: { type: Number, default: 0 },
    emergencyFundAmount: { type: Number, default: 0 },
    investmentExperience: {
      type: String,
      enum: ["none_or_beginner", "basic_mutual_funds", "active_equity_and_debt", "advanced_derivatives_or_active_trading"],
      default: "basic_mutual_funds",
    },
    investmentHorizonYears: { type: Number, default: 5 },
    financialNotes: { type: String, default: "" },
    assignedAdviserId: { type: String, default: "adviser_default" },
    assignedAdviserName: { type: String, default: "Priya Sharma, CFA" },
    profileCompletionStatus: {
      type: String,
      enum: ["INCOMPLETE", "PARTIAL", "COMPLETE"],
      default: "COMPLETE",
    },
    riskProfile: {
      capacityScore: { type: Number, default: 50 },
      capacityLevel: { type: String, default: "MODERATE" },
      toleranceScore: { type: Number, default: 50 },
      toleranceLevel: { type: String, default: "MODERATE" },
      combinedCategory: { type: String, default: "BALANCED" },
      hasConflict: { type: Boolean, default: false },
      conflictRationale: { type: String, default: "" },
      questionnaireResponses: { type: Schema.Types.Mixed, default: {} },
      lastAssessedAt: { type: String, default: "" },
    },
    isDemoPersona: { type: Boolean, default: false },
    demoPersonaTag: { type: String, default: "" },
  },
  { timestamps: true }
);

ClientSchema.index({ fullName: "text", email: "text", city: "text" });
ClientSchema.index({ assignedAdviserId: 1 });

export const ClientModel: Model<IClient> =
  mongoose.models.Client || mongoose.model<IClient>("Client", ClientSchema);
