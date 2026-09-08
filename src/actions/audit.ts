"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { auditLogger } from "@/lib/logger";

export type AuditLogWithUser = {
    id: string;
    userId: string;
    action: string;
    entityId: string;
    details: Record<string, unknown>;
    createdAt: Date;
    user: {
        name: string | null;
        email: string;
        image: string | null;
        role: string;
    };
};

export async function getRefundAuditLogs(
    refundId: string
): Promise<AuditLogWithUser[]> {
    const session = await auth.api.getSession({ headers: await headers() });

    if (!session) {
        auditLogger.warn({ refundId }, "Unauthorized audit log access attempt");
        throw new Error("Unauthorized");
    }

    // Check permission: Staff
    const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { role: true },
    });

    const request = await prisma.refundRequest.findUnique({
        where: { id: refundId },
        select: { userId: true },
    });

    const isStaff = user?.role === "STAFF";
    const isOwner = request?.userId === session.user.id;

    if (!isStaff && !isOwner) {
        auditLogger.warn(
            { refundId, userId: session.user.id },
            "Access denied to audit logs"
        );
        throw new Error("Unauthorized: Access denied");
    }

    auditLogger.info(
        { refundId, requestedBy: session.user.name || session.user.email || session.user.id },
        "Fetching audit logs"
    );

    const logs = await prisma.auditLog.findMany({
        where: { entityId: refundId },
        include: {
            user: { select: { name: true, email: true, image: true, role: true } },
        },
        orderBy: { createdAt: "desc" },
    });

    return logs as AuditLogWithUser[];
}
