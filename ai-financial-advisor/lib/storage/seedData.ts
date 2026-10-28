import {
  Client,
  Goal,
  ChatConversation,
  FinancialReport,
  ResearchDocument,
  ActivityLog,
  AdviserSettings,
} from "./types";

export const DEFAULT_ADVISER_SETTINGS: AdviserSettings = {
  adviserName: "Adviser",
  riaNumber: "INA000000000",
  firmName: "Wealth Advisory",
  email: "adviser@example.com",
  phone: "",
  officeCity: "Mumbai",
  aiProvider: "LOCAL_RULE_BASED",
  apiKey: "",
  selectedModel: "gemini-1.5-pro",
  theme: "light",
  currency: "INR",
};

// Clean slate: No pre-fed clients, goals, chats, reports, research, or activity logs
export const INITIAL_DEMO_CLIENTS: Client[] = [];

export const INITIAL_DEMO_GOALS: Goal[] = [];

export const INITIAL_DEMO_CHATS: ChatConversation[] = [];

export const INITIAL_DEMO_REPORTS: FinancialReport[] = [];

export const INITIAL_DEMO_RESEARCH: ResearchDocument[] = [];

export const INITIAL_DEMO_ACTIVITY: ActivityLog[] = [];
