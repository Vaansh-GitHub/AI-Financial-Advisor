import {
  Client,
  Goal,
  ChatConversation,
  ChatMessage,
  FinancialReport,
  ResearchDocument,
  ActivityLog,
  UploadedFileMeta,
  AdviserSettings,
} from "./types";
import {
  DEFAULT_ADVISER_SETTINGS,
  INITIAL_DEMO_CLIENTS,
  INITIAL_DEMO_GOALS,
  INITIAL_DEMO_CHATS,
  INITIAL_DEMO_REPORTS,
  INITIAL_DEMO_RESEARCH,
  INITIAL_DEMO_ACTIVITY,
  OFFICIAL_PS04_TEST_PERSONAS,
} from "./seedData";

const STORAGE_KEYS = {
  CLIENTS: "zeckathon_clients_v3",
  GOALS: "zeckathon_goals_v3",
  CHATS: "zeckathon_chats_v3",
  REPORTS: "zeckathon_reports_v3",
  RESEARCH: "zeckathon_research_v3",
  ACTIVITY: "zeckathon_activity_v3",
  FILES: "zeckathon_files_v3",
  SETTINGS: "zeckathon_settings_v3",
  INITIALIZED: "zeckathon_initialized_v3",
};

export const STORAGE_CHANGE_EVENT = "zeckathon_storage_changed";

function isBrowser(): boolean {
  return typeof window !== "undefined" && typeof localStorage !== "undefined";
}

function notifyChange(key: string) {
  if (isBrowser()) {
    window.dispatchEvent(new CustomEvent(STORAGE_CHANGE_EVENT, { detail: { key } }));
  }
}

function getItem<T>(key: string, defaultValue: T): T {
  if (!isBrowser()) return defaultValue;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return defaultValue;
    return JSON.parse(raw) as T;
  } catch (err) {
    console.error(`Error reading ${key} from localStorage:`, err);
    return defaultValue;
  }
}

function setItem<T>(key: string, value: T): void {
  if (!isBrowser()) return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
    notifyChange(key);
  } catch (err) {
    console.error(`Error writing ${key} to localStorage:`, err);
    throw err;
  }
}

/**
 * Ensures clean storage exists on first run and removes legacy seeded demo data
 */
export function initializeLocalStorage(forceReset = false): void {
  if (!isBrowser()) return;

  // Clean out legacy v1 and v2 seeded demo keys if present in browser
  const LEGACY_KEYS = [
    "zeckathon_clients_v1",
    "zeckathon_goals_v1",
    "zeckathon_chats_v1",
    "zeckathon_reports_v1",
    "zeckathon_research_v1",
    "zeckathon_activity_v1",
    "zeckathon_files_v1",
    "zeckathon_settings_v1",
    "zeckathon_initialized_v1",
    "zeckathon_clients_v2",
    "zeckathon_goals_v2",
    "zeckathon_chats_v2",
    "zeckathon_reports_v2",
    "zeckathon_research_v2",
    "zeckathon_activity_v2",
    "zeckathon_files_v2",
    "zeckathon_settings_v2",
    "zeckathon_initialized_v2",
  ];
  LEGACY_KEYS.forEach((k) => {
    try {
      localStorage.removeItem(k);
    } catch {}
  });

  const alreadyInitialized = localStorage.getItem(STORAGE_KEYS.INITIALIZED);
  if (!alreadyInitialized || forceReset) {
    localStorage.setItem(STORAGE_KEYS.CLIENTS, JSON.stringify(INITIAL_DEMO_CLIENTS));
    localStorage.setItem(STORAGE_KEYS.GOALS, JSON.stringify(INITIAL_DEMO_GOALS));
    localStorage.setItem(STORAGE_KEYS.CHATS, JSON.stringify(INITIAL_DEMO_CHATS));
    localStorage.setItem(STORAGE_KEYS.REPORTS, JSON.stringify(INITIAL_DEMO_REPORTS));
    localStorage.setItem(STORAGE_KEYS.RESEARCH, JSON.stringify(INITIAL_DEMO_RESEARCH));
    localStorage.setItem(STORAGE_KEYS.ACTIVITY, JSON.stringify(INITIAL_DEMO_ACTIVITY));
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(DEFAULT_ADVISER_SETTINGS));
    localStorage.setItem(STORAGE_KEYS.FILES, JSON.stringify([]));
    localStorage.setItem(STORAGE_KEYS.INITIALIZED, "true");
    notifyChange("all");
  }
}

// -------------------------------------------------------------
// CLIENT OPERATIONS
// -------------------------------------------------------------

export function getClients(): Client[] {
  initializeLocalStorage();
  return getItem<Client[]>(STORAGE_KEYS.CLIENTS, INITIAL_DEMO_CLIENTS);
}

export function getClientById(id: string): Client | null {
  const clients = getClients();
  return clients.find((c) => c.id === id) || null;
}

export function saveClient(client: Omit<Client, "id" | "createdAt" | "updatedAt"> & { id?: string }): Client {
  const clients = getClients();
  const now = new Date().toISOString();
  const id = client.id || `client_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

  const newClient: Client = {
    ...client,
    id,
    createdAt: now,
    updatedAt: now,
  };

  clients.unshift(newClient);
  setItem(STORAGE_KEYS.CLIENTS, clients);

  logActivity({
    action: "Client Added",
    entityType: "CLIENT",
    entityName: newClient.fullName,
    entityId: newClient.id,
    details: `Added new client from ${newClient.city} with monthly income ₹${newClient.monthlyIncome.toLocaleString("en-IN")}.`,
  });

  return newClient;
}

export function updateClient(id: string, updates: Partial<Client>): Client | null {
  const clients = getClients();
  const index = clients.findIndex((c) => c.id === id);
  if (index === -1) return null;

  const updatedClient: Client = {
    ...clients[index],
    ...updates,
    id, // Keep original ID
    updatedAt: new Date().toISOString(),
  };

  clients[index] = updatedClient;
  setItem(STORAGE_KEYS.CLIENTS, clients);

  logActivity({
    action: "Client Profile Updated",
    entityType: "CLIENT",
    entityName: updatedClient.fullName,
    entityId: updatedClient.id,
    details: `Updated profile details and financial assumptions.`,
  });

  return updatedClient;
}

export function deleteClient(id: string): boolean {
  const clients = getClients();
  const target = clients.find((c) => c.id === id);
  if (!target) return false;

  const filtered = clients.filter((c) => c.id !== id);
  setItem(STORAGE_KEYS.CLIENTS, filtered);

  // Also remove associated goals, chats, and reports
  const goals = getGoals().filter((g) => g.clientId !== id);
  setItem(STORAGE_KEYS.GOALS, goals);

  const chats = getConversations().filter((c) => c.clientId !== id);
  setItem(STORAGE_KEYS.CHATS, chats);

  const reports = getReports().filter((r) => r.clientId !== id);
  setItem(STORAGE_KEYS.REPORTS, reports);

  logActivity({
    action: "Client Deleted",
    entityType: "CLIENT",
    entityName: target.fullName,
    entityId: target.id,
    details: `Removed client record and all linked financial data.`,
  });

  return true;
}

// -------------------------------------------------------------
// GOAL OPERATIONS
// -------------------------------------------------------------

export function getGoals(clientId?: string): Goal[] {
  initializeLocalStorage();
  const goals = getItem<Goal[]>(STORAGE_KEYS.GOALS, INITIAL_DEMO_GOALS);
  if (clientId) {
    return goals.filter((g) => g.clientId === clientId);
  }
  return goals;
}

export function getGoalById(id: string): Goal | null {
  const goals = getGoals();
  return goals.find((g) => g.id === id) || null;
}

export function saveGoal(goal: Omit<Goal, "id" | "createdAt" | "updatedAt"> & { id?: string }): Goal {
  const goals = getGoals();
  const now = new Date().toISOString();
  const id = goal.id || `goal_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

  const newGoal: Goal = {
    ...goal,
    id,
    createdAt: now,
    updatedAt: now,
  };

  goals.push(newGoal);
  setItem(STORAGE_KEYS.GOALS, goals);

  const client = getClientById(newGoal.clientId);
  logActivity({
    action: "Goal Added",
    entityType: "GOAL",
    entityName: newGoal.title,
    entityId: newGoal.id,
    details: `Goal created for ${client?.fullName || "Client"}: Target horizon ${newGoal.targetHorizonYears}y.`,
  });

  return newGoal;
}

export function updateGoal(id: string, updates: Partial<Goal>): Goal | null {
  const goals = getGoals();
  const index = goals.findIndex((g) => g.id === id);
  if (index === -1) return null;

  const updated: Goal = {
    ...goals[index],
    ...updates,
    id,
    updatedAt: new Date().toISOString(),
  };

  goals[index] = updated;
  setItem(STORAGE_KEYS.GOALS, goals);
  return updated;
}

export function deleteGoal(id: string): boolean {
  const goals = getGoals();
  const target = goals.find((g) => g.id === id);
  if (!target) return false;

  const filtered = goals.filter((g) => g.id !== id);
  setItem(STORAGE_KEYS.GOALS, filtered);
  return true;
}

// -------------------------------------------------------------
// CHAT CONVERSATIONS
// -------------------------------------------------------------

export function getConversations(clientId?: string): ChatConversation[] {
  initializeLocalStorage();
  const chats = getItem<ChatConversation[]>(STORAGE_KEYS.CHATS, INITIAL_DEMO_CHATS);
  if (clientId) {
    return chats.filter((c) => c.clientId === clientId);
  }
  return chats;
}

export function getConversationById(id: string): ChatConversation | null {
  const chats = getConversations();
  return chats.find((c) => c.id === id) || null;
}

export function saveConversation(
  conversation: Omit<ChatConversation, "id" | "createdAt" | "updatedAt"> & { id?: string }
): ChatConversation {
  const chats = getConversations();
  const now = new Date().toISOString();
  const id = conversation.id || `chat_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

  const newChat: ChatConversation = {
    ...conversation,
    id,
    createdAt: now,
    updatedAt: now,
  };

  chats.unshift(newChat);
  setItem(STORAGE_KEYS.CHATS, chats);

  logActivity({
    action: "AI Consultation Started",
    entityType: "CHAT",
    entityName: newChat.clientName,
    entityId: newChat.id,
    details: `Consultation session: "${newChat.title}".`,
  });

  return newChat;
}

export function addMessageToConversation(conversationId: string, message: Omit<ChatMessage, "id" | "timestamp">): ChatMessage | null {
  const chats = getConversations();
  const index = chats.findIndex((c) => c.id === conversationId);
  if (index === -1) return null;

  const fullMessage: ChatMessage = {
    ...message,
    id: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    timestamp: new Date().toISOString(),
  };

  chats[index].messages.push(fullMessage);
  chats[index].updatedAt = new Date().toISOString();

  setItem(STORAGE_KEYS.CHATS, chats);
  return fullMessage;
}

export function deleteConversation(id: string): boolean {
  const chats = getConversations();
  const filtered = chats.filter((c) => c.id !== id);
  if (filtered.length === chats.length) return false;
  setItem(STORAGE_KEYS.CHATS, filtered);
  return true;
}

export function updateConversationTitle(id: string, title: string): boolean {
  const chats = getConversations();
  const index = chats.findIndex((c) => c.id === id);
  if (index === -1) return false;
  chats[index].title = title.trim();
  chats[index].updatedAt = new Date().toISOString();
  setItem(STORAGE_KEYS.CHATS, chats);
  return true;
}

// -------------------------------------------------------------
// FINANCIAL REPORTS
// -------------------------------------------------------------

export function getReports(clientId?: string): FinancialReport[] {
  initializeLocalStorage();
  const reports = getItem<FinancialReport[]>(STORAGE_KEYS.REPORTS, INITIAL_DEMO_REPORTS);
  if (clientId) {
    return reports.filter((r) => r.clientId === clientId);
  }
  return reports;
}

export function getReportById(id: string): FinancialReport | null {
  const reports = getReports();
  return reports.find((r) => r.id === id) || null;
}

export function saveReport(report: Omit<FinancialReport, "id" | "createdAt"> & { id?: string }): FinancialReport {
  const reports = getReports();
  const now = new Date().toISOString();
  const id = report.id || `report_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

  const newReport: FinancialReport = {
    ...report,
    id,
    createdAt: now,
  };

  reports.unshift(newReport);
  setItem(STORAGE_KEYS.REPORTS, reports);

  logActivity({
    action: "Report Generated",
    entityType: "REPORT",
    entityName: newReport.clientName,
    entityId: newReport.id,
    details: `Generated "${newReport.title}" (${newReport.reportType}).`,
  });

  return newReport;
}

export function deleteReport(id: string): boolean {
  const reports = getReports();
  const target = reports.find((r) => r.id === id);
  if (!target) return false;

  const filtered = reports.filter((r) => r.id !== id);
  setItem(STORAGE_KEYS.REPORTS, filtered);

  logActivity({
    action: "Report Deleted",
    entityType: "REPORT",
    entityName: target.clientName,
    entityId: target.id,
    details: `Deleted report "${target.title}".`,
  });

  return true;
}

// -------------------------------------------------------------
// RESEARCH LIBRARY
// -------------------------------------------------------------

export function getResearchDocuments(): ResearchDocument[] {
  initializeLocalStorage();
  return getItem<ResearchDocument[]>(STORAGE_KEYS.RESEARCH, INITIAL_DEMO_RESEARCH);
}

export function getResearchDocumentById(id: string): ResearchDocument | null {
  const docs = getResearchDocuments();
  return docs.find((d) => d.id === id) || null;
}

export function saveResearchDocument(doc: Omit<ResearchDocument, "id" | "createdAt"> & { id?: string }): ResearchDocument {
  const docs = getResearchDocuments();
  const now = new Date().toISOString();
  const id = doc.id || `res_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

  const newDoc: ResearchDocument = {
    ...doc,
    id,
    createdAt: now,
  };

  docs.unshift(newDoc);
  setItem(STORAGE_KEYS.RESEARCH, docs);

  logActivity({
    action: "Research Uploaded",
    entityType: "FILE",
    entityName: newDoc.title,
    entityId: newDoc.id,
    details: `Added research document: "${newDoc.title}".`,
  });

  return newDoc;
}

export function deleteResearchDocument(id: string): boolean {
  const docs = getResearchDocuments();
  const filtered = docs.filter((d) => d.id !== id);
  if (filtered.length === docs.length) return false;
  setItem(STORAGE_KEYS.RESEARCH, filtered);
  return true;
}

// -------------------------------------------------------------
// UPLOADED FILE METADATA
// -------------------------------------------------------------

export function getUploadedFiles(clientId?: string): UploadedFileMeta[] {
  initializeLocalStorage();
  const files = getItem<UploadedFileMeta[]>(STORAGE_KEYS.FILES, []);
  if (clientId) {
    return files.filter((f) => f.clientId === clientId);
  }
  return files;
}

export function saveUploadedFileMeta(meta: Omit<UploadedFileMeta, "id" | "uploadedAt"> & { id?: string }): UploadedFileMeta {
  const files = getUploadedFiles();
  const now = new Date().toISOString();
  const id = meta.id || `file_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

  const newMeta: UploadedFileMeta = {
    ...meta,
    id,
    uploadedAt: now,
  };

  files.unshift(newMeta);
  setItem(STORAGE_KEYS.FILES, files);

  logActivity({
    action: "File Uploaded",
    entityType: "FILE",
    entityName: newMeta.fileName,
    entityId: newMeta.id,
    details: `Uploaded ${newMeta.fileType} file (${Math.round(newMeta.fileSizeBytes / 1024)} KB) for ${newMeta.clientName || "Client"}.`,
  });

  return newMeta;
}

export function deleteUploadedFileMeta(id: string): boolean {
  const files = getUploadedFiles();
  const filtered = files.filter((f) => f.id !== id);
  if (filtered.length === files.length) return false;
  setItem(STORAGE_KEYS.FILES, filtered);
  return true;
}

// -------------------------------------------------------------
// ACTIVITY TIMELINE
// -------------------------------------------------------------

export function getActivityLogs(limit = 20): ActivityLog[] {
  initializeLocalStorage();
  const logs = getItem<ActivityLog[]>(STORAGE_KEYS.ACTIVITY, INITIAL_DEMO_ACTIVITY);
  return logs.slice(0, limit);
}

export function logActivity(log: Omit<ActivityLog, "id" | "timestamp">): ActivityLog {
  const logs = getItem<ActivityLog[]>(STORAGE_KEYS.ACTIVITY, INITIAL_DEMO_ACTIVITY);
  const newLog: ActivityLog = {
    ...log,
    id: `act_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    timestamp: new Date().toISOString(),
  };

  logs.unshift(newLog);
  // Keep maximum 100 activity items to conserve storage
  const trimmed = logs.slice(0, 100);
  setItem(STORAGE_KEYS.ACTIVITY, trimmed);
  return newLog;
}

// -------------------------------------------------------------
// ADVISER SETTINGS
// -------------------------------------------------------------

export function getAdviserSettings(): AdviserSettings {
  initializeLocalStorage();
  return getItem<AdviserSettings>(STORAGE_KEYS.SETTINGS, DEFAULT_ADVISER_SETTINGS);
}

export function saveAdviserSettings(settings: Partial<AdviserSettings>): AdviserSettings {
  const current = getAdviserSettings();
  const updated: AdviserSettings = {
    ...current,
    ...settings,
  };
  setItem(STORAGE_KEYS.SETTINGS, updated);

  logActivity({
    action: "Settings Updated",
    entityType: "SETTINGS",
    entityName: updated.adviserName,
    details: "Updated adviser profile or AI configuration.",
  });

  return updated;
}

// -------------------------------------------------------------
// STORAGE METRICS & BACKUP MANAGEMENT
// -------------------------------------------------------------

export interface StorageUsageMetrics {
  bytesUsed: number;
  kilobytesUsed: number;
  quotaPercent: number; // Based on 5MB (5,242,880 bytes) standard localStorage limit
  clientCount: number;
  goalCount: number;
  chatCount: number;
  reportCount: number;
  researchCount: number;
  fileCount: number;
  status: "HEALTHY" | "MODERATE" | "HIGH" | "CRITICAL";
}

export function getStorageUsage(): StorageUsageMetrics {
  if (!isBrowser()) {
    return {
      bytesUsed: 0,
      kilobytesUsed: 0,
      quotaPercent: 0,
      clientCount: 0,
      goalCount: 0,
      chatCount: 0,
      reportCount: 0,
      researchCount: 0,
      fileCount: 0,
      status: "HEALTHY",
    };
  }

  let totalBytes = 0;
  for (const key in localStorage) {
    if (Object.prototype.hasOwnProperty.call(localStorage, key)) {
      totalBytes += (localStorage[key]?.length || 0) * 2; // UTF-16 character = 2 bytes
    }
  }

  const STANDARD_QUOTA = 5 * 1024 * 1024; // 5 MB
  const quotaPercent = Math.min(100, Math.round((totalBytes / STANDARD_QUOTA) * 1000) / 10);

  let status: StorageUsageMetrics["status"] = "HEALTHY";
  if (quotaPercent > 80) status = "CRITICAL";
  else if (quotaPercent > 50) status = "HIGH";
  else if (quotaPercent > 20) status = "MODERATE";

  return {
    bytesUsed: totalBytes,
    kilobytesUsed: Math.round(totalBytes / 1024),
    quotaPercent,
    clientCount: getClients().length,
    goalCount: getGoals().length,
    chatCount: getConversations().length,
    reportCount: getReports().length,
    researchCount: getResearchDocuments().length,
    fileCount: getUploadedFiles().length,
    status,
  };
}

export function exportAllData(): string {
  if (!isBrowser()) return "{}";
  const dump = {
    exportedAt: new Date().toISOString(),
    version: "1.0",
    clients: getClients(),
    goals: getGoals(),
    chats: getConversations(),
    reports: getReports(),
    research: getResearchDocuments(),
    activity: getActivityLogs(100),
    files: getUploadedFiles(),
    settings: getAdviserSettings(),
  };
  return JSON.stringify(dump, null, 2);
}

export function importAllData(jsonString: string): { success: boolean; message: string } {
  if (!isBrowser()) return { success: false, message: "Browser environment required." };
  try {
    const data = JSON.parse(jsonString);
    if (!data.clients || !Array.isArray(data.clients)) {
      return { success: false, message: "Invalid backup file: Missing client records." };
    }

    if (data.clients) setItem(STORAGE_KEYS.CLIENTS, data.clients);
    if (data.goals) setItem(STORAGE_KEYS.GOALS, data.goals);
    if (data.chats) setItem(STORAGE_KEYS.CHATS, data.chats);
    if (data.reports) setItem(STORAGE_KEYS.REPORTS, data.reports);
    if (data.research) setItem(STORAGE_KEYS.RESEARCH, data.research);
    if (data.activity) setItem(STORAGE_KEYS.ACTIVITY, data.activity);
    if (data.files) setItem(STORAGE_KEYS.FILES, data.files);
    if (data.settings) setItem(STORAGE_KEYS.SETTINGS, data.settings);

    notifyChange("all");
    return { success: true, message: `Successfully restored ${data.clients.length} clients and associated data!` };
  } catch (err: any) {
    return { success: false, message: err?.message || "Failed to parse JSON backup file." };
  }
}

export function resetToDemo(): void {
  initializeLocalStorage(true);
}

export function clearAllData(): void {
  if (!isBrowser()) return;
  Object.values(STORAGE_KEYS).forEach((k) => localStorage.removeItem(k));
  initializeLocalStorage(true);
}

export function loadOfficialPS04Personas(): { count: number } {
  if (!isBrowser()) return { count: 0 };
  const existing = getItem<Client[]>(STORAGE_KEYS.CLIENTS, []);
  const existingIds = new Set(existing.map((c) => c.id));
  const toAdd = OFFICIAL_PS04_TEST_PERSONAS.filter((p) => !existingIds.has(p.id));
  const merged = [...existing, ...toAdd];
  setItem(STORAGE_KEYS.CLIENTS, merged);
  notifyChange(STORAGE_KEYS.CLIENTS);
  return { count: toAdd.length };
}

