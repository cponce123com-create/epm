import { db, auditLogsTable } from "@workspace/db";
import type { Request } from "express";
import { logger } from "./logger";

export type AuditAction =
  | "CREATE"
  | "UPDATE"
  | "DELETE"
  | "APPROVE"
  | "REJECT"
  | "PUBLISH"
  | "ARCHIVE"
  | "LOGIN"
  | "LOGOUT"
  | "ROLE_CHANGE"
  | "INVITE";

export type AuditTarget =
  | "article"
  | "comment"
  | "user"
  | "setting"
  | "category"
  | "tag"
  | "invitation";

export async function logAudit(params: {
  userId?: number | null;
  action: AuditAction;
  targetType: AuditTarget;
  targetId?: number | null;
  oldValues?: Record<string, unknown> | null;
  newValues?: Record<string, unknown> | null;
  ipAddress?: string | null;
}): Promise<void> {
  try {
    await db.insert(auditLogsTable).values({
      userId: params.userId ?? null,
      action: params.action,
      targetType: params.targetType,
      targetId: params.targetId ?? null,
      oldValues: params.oldValues ?? null,
      newValues: params.newValues ?? null,
      ipAddress: params.ipAddress ?? null,
    });
  } catch (err) {
    // Non-blocking: audit nunca debe romper la operación principal
    logger.error({ err }, "[AUDIT] Failed to write log:");
  }
}

/** Helper: extrae IP y userId de un Request de Express */
export function auditCtx(req: Request): { userId: number | null; ipAddress: string } {
   
  const user = (req as any).user;
  return {
    userId: user?.userId ?? null,
    ipAddress: req.ip ?? req.socket.remoteAddress ?? "unknown",
  };
}
