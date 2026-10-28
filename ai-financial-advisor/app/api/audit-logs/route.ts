import { NextResponse } from "next/server";
import { getAuditLogs } from "@/lib/audit/logger";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const actorId = searchParams.get("actorId") || undefined;
    const entityType = searchParams.get("entityType") || undefined;
    const action = searchParams.get("action") || undefined;
    const limit = searchParams.get("limit") ? Number(searchParams.get("limit")) : 100;

    const logs = await getAuditLogs({ actorId, entityType, action, limit });
    return NextResponse.json({ success: true, count: logs.length, data: logs });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to fetch audit logs" }, { status: 500 });
  }
}
