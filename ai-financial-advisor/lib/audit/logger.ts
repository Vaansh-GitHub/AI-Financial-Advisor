/**
 * Audit Logging Service
 * Immutable-style audit log recorder for all regulatory and advisory actions.
 */

export interface AuditRecord {
  id: string;
  actorId: string;
  actorName: string;
  actorRole: "adviser" | "admin" | "system";
  action:
    | "AUTH_LOGIN"
    | "AUTH_LOGOUT"
    | "CLIENT_CREATED"
    | "CLIENT_UPDATED"
    | "CLIENT_DELETED"
    | "RISK_ASSESSMENT_COMPLETED"
    | "GOAL_CREATED"
    | "GOAL_UPDATED"
    | "GOAL_DELETED"
    | "PLAN_CREATED"
    | "PLAN_CALCULATED"
    | "PLAN_SUBMITTED_FOR_REVIEW"
    | "PLAN_APPROVED"
    | "PLAN_REJECTED"
    | "PLAN_CHANGES_REQUESTED"
    | "SUITABILITY_EVALUATED"
    | "DOCUMENT_UPLOADED"
    | "DOCUMENT_DELETED"
    | "FUND_IMPORTED";
  entityType: "CLIENT" | "GOAL" | "PLAN" | "DOCUMENT" | "FUND" | "AUTH" | "SYSTEM";
  entityId: string;
  timestamp: string;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
}

// In-memory audit storage fallback (persisted in DB when connected)
const inMemoryAuditStore: AuditRecord[] = [];

export async function logAuditEvent(params: Omit<AuditRecord, "id" | "timestamp">): Promise<AuditRecord> {
  // Strip any accidental sensitive data
  const safeMeta = { ...(params.metadata || {}) };
  delete safeMeta.password;
  delete safeMeta.passwordHash;
  delete safeMeta.secret;
  delete safeMeta.token;

  const record: AuditRecord = {
    id: `audit_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
    ...params,
    metadata: safeMeta,
    timestamp: new Date().toISOString(),
  };

  inMemoryAuditStore.unshift(record);

  // In production with MongoDB connected, we also insert into AuditLog model
  try {
    const { AuditLogModel } = await import("@/models/AuditLog");
    if (AuditLogModel) {
      await AuditLogModel.create(record).catch(() => {});
    }
  } catch {
    // Falls back seamlessly to in-memory store
  }

  return record;
}

export async function getAuditLogs(filter?: {
  actorId?: string;
  entityType?: string;
  action?: string;
  limit?: number;
}): Promise<AuditRecord[]> {
  try {
    const { AuditLogModel } = await import("@/models/AuditLog");
    if (AuditLogModel) {
      const q: Record<string, unknown> = {};
      if (filter?.actorId) q.actorId = filter.actorId;
      if (filter?.entityType) q.entityType = filter.entityType;
      if (filter?.action) q.action = filter.action;
      const docs = await AuditLogModel.find(q)
        .sort({ timestamp: -1 })
        .limit(filter?.limit || 100)
        .lean();
      if (docs && docs.length > 0) {
        return docs as unknown as AuditRecord[];
      }
    }
  } catch {
    // fallback
  }

  // Filter in-memory
  let list = inMemoryAuditStore;
  if (filter?.actorId) list = list.filter((r) => r.actorId === filter.actorId);
  if (filter?.entityType) list = list.filter((r) => r.entityType === filter.entityType);
  if (filter?.action) list = list.filter((r) => r.action === filter.action);
  return list.slice(0, filter?.limit || 100);
}
