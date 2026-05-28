import { Router, type IRouter, type Request, type Response } from "express";
import { db, auditLogsTable, usersTable } from "@workspace/db";
import { eq, desc, count, and, gte, lte, inArray, ilike } from "drizzle-orm";
import { requireAuth } from "../middlewares/requireAuth";

const router: IRouter = Router();

router.get("/admin/audit-logs", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const user = (req as any).user;
  if (user.role !== "superadmin" && user.role !== "admin") {
    res.status(403).json({ error: "Solo administradores pueden ver los logs de auditoría" });
    return;
  }

  const page = Math.max(1, parseInt(req.query.page as string ?? "1", 10));
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string ?? "25", 10)));
  const offset = (page - 1) * limit;

  const userId = req.query.userId ? parseInt(req.query.userId as string, 10) : undefined;
  const action = req.query.action as string | undefined;
  const targetType = req.query.targetType as string | undefined;
  const dateFrom = req.query.dateFrom as string | undefined;
  const dateTo = req.query.dateTo as string | undefined;

  const conditions = [];

  if (userId && !isNaN(userId)) conditions.push(eq(auditLogsTable.userId, userId));
  if (action) conditions.push(eq(auditLogsTable.action, action));
  if (targetType) conditions.push(eq(auditLogsTable.targetType, targetType));
  if (dateFrom) conditions.push(gte(auditLogsTable.createdAt, new Date(dateFrom)));
  if (dateTo) conditions.push(lte(auditLogsTable.createdAt, new Date(dateTo)));

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const [totalResult] = await db
    .select({ total: count() })
    .from(auditLogsTable)
    .where(whereClause);

  const logs = await db
    .select({
      id: auditLogsTable.id,
      userId: auditLogsTable.userId,
      userName: usersTable.displayName,
      userEmail: usersTable.email,
      action: auditLogsTable.action,
      targetType: auditLogsTable.targetType,
      targetId: auditLogsTable.targetId,
      oldValues: auditLogsTable.oldValues,
      newValues: auditLogsTable.newValues,
      ipAddress: auditLogsTable.ipAddress,
      createdAt: auditLogsTable.createdAt,
    })
    .from(auditLogsTable)
    .leftJoin(usersTable, eq(auditLogsTable.userId, usersTable.id))
    .where(whereClause)
    .orderBy(desc(auditLogsTable.createdAt))
    .limit(limit)
    .offset(offset);

  res.json({
    logs: logs.map(l => ({
      ...l,
      createdAt: l.createdAt.toISOString(),
    })),
    total: Number(totalResult?.total ?? 0),
    page,
    limit,
    totalPages: Math.ceil(Number(totalResult?.total ?? 0) / limit),
  });
});

// Get unique actions for filter dropdown
router.get("/admin/audit-logs/actions", requireAuth, async (_req: Request, res: Response): Promise<void> => {
  const rows = await db
    .select({ action: auditLogsTable.action })
    .from(auditLogsTable)
    .groupBy(auditLogsTable.action)
    .orderBy(auditLogsTable.action);

  res.json(rows.map(r => r.action));
});

export default router;
