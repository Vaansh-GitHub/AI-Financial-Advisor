import mongoose, { Schema, Model } from "mongoose";

export interface IFund {
  _id?: any;
  schemeCode: string;
  schemeName: string;
  amc: string;
  planType: "Direct" | "Regular";
  dividendOption: "Growth" | "IDCW";
  category: "Equity" | "Debt" | "Hybrid" | "Commodities";
  subCategory: string;
  benchmark: string;
  expenseRatio: number;
  aumCrores: number;
  aumAsOfDate: string;
  fundManager: {
    name: string;
    tenureYears: number;
    qualification?: string;
  };
  returns: {
    return1Y: number;
    return3Y: number;
    return5Y: number;
    sinceInception?: number;
  };
  riskMetrics: {
    standardDeviation: number;
    sharpeRatio: number;
    beta: number;
    maxDrawdown: number;
    trackingError?: number;
  };
  currentNAV: number;
  navDate: string;
  navHistory?: Array<{ date: string; nav: number }>;
  dataSource: "AMFI_MASTER_FEED" | "AMC_DISCLOSURE" | "DEVELOPMENT_FIXTURE";
  isSyntheticFixture: boolean;
  lastUpdated: string;
  createdAt?: Date;
  updatedAt?: Date;
}

const FundSchema = new Schema<IFund>(
  {
    schemeCode: { type: String, required: true, unique: true, index: true },
    schemeName: { type: String, required: true, index: true },
    amc: { type: String, required: true, index: true },
    planType: { type: String, enum: ["Direct", "Regular"], default: "Direct" },
    dividendOption: { type: String, enum: ["Growth", "IDCW"], default: "Growth" },
    category: { type: String, enum: ["Equity", "Debt", "Hybrid", "Commodities"], required: true },
    subCategory: { type: String, required: true, index: true },
    benchmark: { type: String, default: "NIFTY 50 TRI" },
    expenseRatio: { type: Number, required: true },
    aumCrores: { type: Number, default: 0 },
    aumAsOfDate: { type: String, default: "" },
    fundManager: {
      name: { type: String, default: "" },
      tenureYears: { type: Number, default: 0 },
      qualification: { type: String, default: "" },
    },
    returns: {
      return1Y: { type: Number, default: 0 },
      return3Y: { type: Number, default: 0 },
      return5Y: { type: Number, default: 0 },
      sinceInception: { type: Number, default: 0 },
    },
    riskMetrics: {
      standardDeviation: { type: Number, default: 0 },
      sharpeRatio: { type: Number, default: 0 },
      beta: { type: Number, default: 1 },
      maxDrawdown: { type: Number, default: 0 },
      trackingError: { type: Number, default: 0 },
    },
    currentNAV: { type: Number, required: true },
    navDate: { type: String, required: true },
    navHistory: [{ date: String, nav: Number }],
    dataSource: {
      type: String,
      enum: ["AMFI_MASTER_FEED", "AMC_DISCLOSURE", "DEVELOPMENT_FIXTURE"],
      default: "DEVELOPMENT_FIXTURE",
    },
    isSyntheticFixture: { type: Boolean, default: false },
    lastUpdated: { type: String, default: "" },
  },
  { timestamps: true }
);

FundSchema.index({ category: 1, subCategory: 1, planType: 1 });

export const FundModel: Model<IFund> =
  mongoose.models.Fund || mongoose.model<IFund>("Fund", FundSchema);
