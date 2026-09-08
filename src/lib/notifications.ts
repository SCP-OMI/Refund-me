import { prisma } from "@/lib/prisma";
import { emitNotificationNew, emitToStaff } from "@/lib/ws-emitter";

export async function createNotification(data: {
  userId: string;
  title: string;
  message: string;
  type: "NEW_REQUEST" | "APPROVED" | "REJECTED" | "READY_TO_PAY" | "FULLY_PAID" | "INFO";
  refundId?: string;
}) {
  const notification = await prisma.notification.create({
    data: {
      userId: data.userId,
      title: data.title,
      message: data.message,
      type: data.type,
      refundId: data.refundId,
    },
  });

  // Emit WebSocket event for real-time updates
  emitNotificationNew(data.userId, {
    id: notification.id,
    title: notification.title,
    message: notification.message,
    type: notification.type,
    refundId: notification.refundId,
    createdAt: notification.createdAt,
  });
}

export async function notifyAllStaff(data: {
  title: string;
  message: string;
  type: "NEW_REQUEST" | "RECEIPT_UPLOADED";
  refundId?: string;
}) {
  try {
    const staffUsers = await prisma.user.findMany({
      where: { role: "STAFF" },
      select: { id: true },
    });

    const allStaff = [...staffUsers];

    if (allStaff.length === 0) {
      return;
    }

    const notifications = allStaff.map((user) => ({
      userId: user.id,
      title: data.title,
      message: data.message,
      type: data.type,
      refundId: data.refundId,
    }));

    await prisma.notification.createMany({
      data: notifications,
    });

    // Emit WebSocket event to staff room for real-time updates
    emitToStaff("notification:new", {
      title: data.title,
      message: data.message,
      type: data.type,
      refundId: data.refundId,
    });
  } catch {
    // Silent fail for notifications - don't break main flow
  }
}
