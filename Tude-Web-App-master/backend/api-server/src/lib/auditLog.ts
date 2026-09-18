import { db, auditLogsTable } from "@workspace/db";
import type { Request } from "express";

function extractIp(req: Request): string | null {
  return (
    (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ??
    req.socket?.remoteAddress ??
    null
  );
}

/** Log an admin-initiated action (uses req.user as actor). */
export async function logAdminAction(
  req: Request,
  action: string,
  targetType: string | null,
  targetId: number | null,
  details?: Record<string, unknown>,
) {
  const admin = (req as any).user;
  try {
    await db.insert(auditLogsTable).values({
      adminId: admin?.id ?? null,
      action,
      targetType: targetType ?? null,
      targetId: targetId ?? null,
      details: details ?? null,
      ipAddress: extractIp(req),
    });
  } catch (err) {
    console.error("[audit] Failed to write audit log:", err);
  }
}

/** Log any platform event (registration, login, purchase, etc.) — actorId can be the user themselves or null. */
export async function logEvent(
  req: Request,
  action: string,
  targetType: string | null,
  targetId: number | null,
  actorId: number | null,
  details?: Record<string, unknown>,
) {
  try {
    await db.insert(auditLogsTable).values({
      adminId: actorId,
      action,
      targetType: targetType ?? null,
      targetId: targetId ?? null,
      details: details ?? null,
      ipAddress: extractIp(req),
    });
  } catch (err) {
    console.error("[audit] Failed to write audit log:", err);
  }
}
