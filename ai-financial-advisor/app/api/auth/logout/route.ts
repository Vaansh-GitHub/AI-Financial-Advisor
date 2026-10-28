import { NextResponse } from "next/server";
import { getSessionCookieOptions, getCurrentUser } from "@/lib/auth/session";
import { logAuditEvent } from "@/lib/audit/logger";

export async function POST() {
  const user = await getCurrentUser();
  if (user) {
    await logAuditEvent({
      actorId: user.userId,
      actorName: user.name,
      actorRole: user.role,
      action: "AUTH_LOGOUT",
      entityType: "AUTH",
      entityId: user.userId,
    });
  }

  const response = NextResponse.json({ success: true, message: "Logged out successfully" });
  const cookieOpts = getSessionCookieOptions();
  response.cookies.delete(cookieOpts.name);
  return response;
}
