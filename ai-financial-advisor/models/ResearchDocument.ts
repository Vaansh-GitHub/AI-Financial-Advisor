import mongoose, { Schema, Model } from "mongoose";

export interface IResearchDocument {
  _id?: any;
  title: string;
  fundName: string;
  schemeCode?: string;
  amc: string;
  documentType: "FACTSHEET" | "SID_SCHEME_INFORMATION_DOCUMENT" | "KIM_KEY_INFORMATION_MEMORANDUM" | "PORTFOLIO_DISCLOSURE" | "ANNUAL_REPORT" | "RESEARCH_NOTE";
  publicationDate: string;
  fileUrl: string;
  fileSizeBytes: number;
  mimeType: string;
  processingStatus: "UPLOADED" | "PENDING_PROCESSING" | "INDEXED" | "FAILED";
  pageCount: number;
  extractedTextPreview?: string;
  pageSnippets?: Array<{ pageNumber: number; text: string }>;
  uploadedBy: string;
  createdAt?: Date;
  updatedAt?: Date;
}

const ResearchDocumentSchema = new Schema<IResearchDocument>(
  {
    title: { type: String, required: true },
    fundName: { type: String, required: true },
    schemeCode: { type: String, default: "" },
    amc: { type: String, required: true },
    documentType: {
      type: String,
      enum: ["FACTSHEET", "SID_SCHEME_INFORMATION_DOCUMENT", "KIM_KEY_INFORMATION_MEMORANDUM", "PORTFOLIO_DISCLOSURE", "ANNUAL_REPORT", "RESEARCH_NOTE"],
      default: "FACTSHEET",
    },
    publicationDate: { type: String, required: true },
    fileUrl: { type: String, required: true },
    fileSizeBytes: { type: Number, default: 0 },
    mimeType: { type: String, default: "application/pdf" },
    processingStatus: {
      type: String,
      enum: ["UPLOADED", "PENDING_PROCESSING", "INDEXED", "FAILED"],
      default: "UPLOADED",
    },
    pageCount: { type: Number, default: 1 },
    extractedTextPreview: { type: String, default: "" },
    pageSnippets: [{ pageNumber: Number, text: String }],
    uploadedBy: { type: String, default: "Adviser" },
  },
  { timestamps: true }
);

export const ResearchDocumentModel: Model<IResearchDocument> =
  mongoose.models.ResearchDocument || mongoose.model<IResearchDocument>("ResearchDocument", ResearchDocumentSchema);
