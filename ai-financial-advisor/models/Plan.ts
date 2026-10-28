import mongoose, { Schema, Model } from "mongoose";

export interface IPlan {
  _id?: any;
  clientId: string;
  clientName: string;
  planTitle: string;
  version: number;
  status: "DRAFT" | "PENDING_REVIEW" | "APPROVED" | "CHANGES_REQUESTED" | "REJECTED" | "BLOCKED";
  isCurrent: boolean;
  goals: Array<{
    goalId?: string;
    title: string;
    targetCost: number;
    inflationAdjustedCost: number;
    requiredMonthlySIP: number;
    targetHorizonYears: number;
  }>;
  recommendedAllocation: {
    equityPercent: number;
    debtPercent: number;
    goldOrCashPercent: number;
    rationale: string;
  };
  fundSelections: Array<{
    schemeCode: string;
    schemeName: string;
    category: string;
    weightPercent: number;
    recommendedMonthlySIP: number;
    rationale: string;
  }>;
  calculatedMetrics: {
    totalTargetCorpus: number;
    totalMonthlySIP: number;
    projectedGrowthMultiple: number;
    estimatedWealthGain: number;
  };
  suitabilityFindings: Array<{
    ruleId: string;
    severity: "INFO" | "WARNING" | "HIGH_RISK" | "BLOCKED";
    title: string;
    explanation: string;
    recommendedAction: string;
  }>;
  isBlockedBySuitability: boolean;
  approvalHistory: Array<{
    decision: string;
    actorId: string;
    actorName: string;
    actorRole: string;
    planVersion: number;
    reasonNotes?: string;
    timestamp: string;
  }>;
  approvedAt?: string;
  approvedBy?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

const PlanSchema = new Schema<IPlan>(
  {
    clientId: { type: String, required: true, index: true },
    clientName: { type: String, required: true },
    planTitle: { type: String, default: "Comprehensive Wealth Advisory Plan" },
    version: { type: Number, default: 1 },
    status: {
      type: String,
      enum: ["DRAFT", "PENDING_REVIEW", "APPROVED", "CHANGES_REQUESTED", "REJECTED", "BLOCKED"],
      default: "DRAFT",
    },
    isCurrent: { type: Boolean, default: true },
    goals: [
      {
        goalId: String,
        title: String,
        targetCost: Number,
        inflationAdjustedCost: Number,
        requiredMonthlySIP: Number,
        targetHorizonYears: Number,
      },
    ],
    recommendedAllocation: {
      equityPercent: { type: Number, default: 60 },
      debtPercent: { type: Number, default: 35 },
      goldOrCashPercent: { type: Number, default: 5 },
      rationale: { type: String, default: "" },
    },
    fundSelections: [
      {
        schemeCode: String,
        schemeName: String,
        category: String,
        weightPercent: Number,
        recommendedMonthlySIP: Number,
        rationale: String,
      },
    ],
    calculatedMetrics: {
      totalTargetCorpus: { type: Number, default: 0 },
      totalMonthlySIP: { type: Number, default: 0 },
      projectedGrowthMultiple: { type: Number, default: 1 },
      estimatedWealthGain: { type: Number, default: 0 },
    },
    suitabilityFindings: [
      {
        ruleId: String,
        severity: String,
        title: String,
        explanation: String,
        recommendedAction: String,
      },
    ],
    isBlockedBySuitability: { type: Boolean, default: false },
    approvalHistory: [
      {
        decision: String,
        actorId: String,
        actorName: String,
        actorRole: String,
        planVersion: Number,
        reasonNotes: String,
        timestamp: String,
      },
    ],
    approvedAt: { type: String },
    approvedBy: { type: String },
  },
  { timestamps: true }
);

PlanSchema.index({ clientId: 1, status: 1 });

export const PlanModel: Model<IPlan> =
  mongoose.models.Plan || mongoose.model<IPlan>("Plan", PlanSchema);
