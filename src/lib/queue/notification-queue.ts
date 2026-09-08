import { Queue } from "bullmq"
import { logger } from "@/lib/logger"

const redisUrl = process.env.REDIS_URL || "redis://localhost:6379"
export interface NotificationJobData {
    type: "notification:new" | "refund:new" | "refund:updated" | "refund:receipt"
    payload: Record<string, unknown>
    target: {
        type: "user" | "staff" | "all"
        userId?: string
    }
}

export const notificationQueue = new Queue<NotificationJobData, unknown, NotificationJobData["type"]>("notifications", {
    connection: {
        url: redisUrl,
    },
    defaultJobOptions: {
        attempts: 3,
        backoff: {
            type: "exponential",
            delay: 1000,    
        },
        removeOnComplete: {
            age: 3600, 
            count: 100, 
        },
        removeOnFail: {
            age: 86400, 
        },
    },
})

export async function queueNotification(data: NotificationJobData) {
    try {
        const safeType = data.type.replace(/:/g, "-")
        const job = await notificationQueue.add(data.type, data, {
            jobId: `${safeType}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        })
        logger.info(`[Queue] Added job ${job.id}: ${data.type}`)
        return job
    } catch (error) {
        logger.error({ err: error }, "[Queue] Failed to add job")
        throw error
    }
}

export async function queueNotificationNew(userId: string, payload: Record<string, unknown>) {
    return queueNotification({
        type: "notification:new",
        payload,
        target: { type: "user", userId },
    })
}

export async function queueNotificationToStaff(payload: Record<string, unknown>) {
    return queueNotification({
        type: "notification:new",
        payload,
        target: { type: "staff" },
    })
}

export async function queueRefundNew(payload: Record<string, unknown>) {
    return queueNotification({
        type: "refund:new",
        payload,
        target: { type: "staff" },
    })
}

export async function queueRefundUpdated(
    userId: string,
    refundId: string,
    status: string
) {
    await queueNotification({
        type: "refund:updated",
        payload: { refundId, status },
        target: { type: "user", userId },
    })
    await queueNotification({
        type: "refund:updated",
        payload: { refundId, status },
        target: { type: "staff" },
    })
}

export async function queueReceiptUploaded(refundId: string) {
    return queueNotification({
        type: "refund:receipt",
        payload: { refundId },
        target: { type: "staff" },
    })
}
