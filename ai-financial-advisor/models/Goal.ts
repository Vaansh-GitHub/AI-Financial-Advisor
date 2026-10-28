import mongoose, { Schema, Model } from "mongoose";

export interface IGoal {
  _id?: any;
  clientId: string;
  title: string;
  category: "EMERGENCY_FUND" | "CHILD_EDUCATION" | "HOME_PURCHASE" | "RETIREMENT" | "MEDICAL_RESERVE" | "WEALTH_CREATION" | "CUSTOM";
  currentCost: number;
  targetHorizonYears: number;
  targetDate?: string;
  expectedInflationRate: number;
  expectedAnnualReturn: number;
  existingSavings: number;
  currentMonthlyContribution: number;
  priority: "HIGH" | "MEDIUM" | "LOW";
  liquidityNeeds: "low" | "medium" | "high";
  notes?: string;
  calculationResults?: {
    inflationAdjustedCost: number;
    futureValueOfExistingSavings: number;
    corpusShortfall: number;
    requiredMonthlySIP: number;
    monthlySurplusOrShortfall: number;
    feasibilityStatus: string;
    calculatedAt: string;
  };
  createdAt?: Date;
  updatedAt?: Date;
}

const GoalSchema = new Schema<IGoal>(
  {
    clientId: { type: String, required: true, index: true },
    title: { type: String, required: true, trim: true },
    category: {
      type: String,
      enum: ["EMERGENCY_FUND", "CHILD_EDUCATION", "HOME_PURCHASE", "RETIREMENT", "MEDICAL_RESERVE", "WEALTH_CREATION", "CUSTOM"],
      default: "WEALTH_CREATION",
    },
    currentCost: { type: Number, required: true, default: 0 },
    targetHorizonYears: { type: Number, required: true, default: 5 },
    targetDate: { type: String, default: "" },
    expectedInflationRate: { type: Number, default: 0.06 },
    expectedAnnualReturn: { type: Number, default: 0.12 },
    existingSavings: { type: Number, default: 0 },
    currentMonthlyContribution: { type: Number, default: 0 },
    priority: { type: String, enum: ["HIGH", "MEDIUM", "LOW"], default: "HIGH" },
    liquidityNeeds: { type: String, enum: ["low", "medium", "high"], default: "medium" },
    notes: { type: String, default: "" },
    calculationResults: {
      inflationAdjustedCost: { type: Number },
      futureValueOfExistingSavings: { type: Number },
      corpusShortfall: { type: Number },
      requiredMonthlySIP: { type: Number },
      monthlySurplusOrShortfall: { type: Number },
      feasibilityStatus: { type: String },
      calculatedAt: { type: String },
    },
  },
  { timestamps: true }
);

export const GoalModel: Model<IGoal> =
  mongoose.models.Goal || mongoose.model<IGoal>("Goal", GoalSchema);
