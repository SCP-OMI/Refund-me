import { prisma } from "@/lib/prisma";
import { AuditAction, Prisma } from "@prisma/client";
import { auditLogger } from "./logger";

export async function logActivity(
  userId: string,
  userName: string, // Added userName
  action: AuditAction,
  entityId: string,
  details?: Record<string, unknown>
) {
  // 1. Structured Pino Log (for production monitoring & log aggregators)
  auditLogger.info(
    {
      event: "audit_action",
      userId,
      userName,
      action,
      entityId,
      details,
    },
    `Audit: ${action} on entity ${entityId} by user ${userName || userId}`
  );

  // 2. Database Log (for in-app history UI)
  try {
    await prisma.auditLog.create({
      data: {
        userId,
        action,
        entityId,
        details: (details ?? {}) as Prisma.InputJsonValue,
      },
    });
  } catch (error) {
    auditLogger.error(
      { error, userId, action, entityId },
      "Failed to create audit log in database"
    );
    // We don't throw here to avoid failing the main action just because logging failed
  }
}
