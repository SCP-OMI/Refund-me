import { Worker, Job } from "bullmq"
import { Server as SocketIOServer } from "socket.io"
import { NotificationJobData } from "./notification-queue"
import { logger } from "@/lib/logger"

const redisUrl = process.env.REDIS_URL || "redis://localhost:6379"

let worker: Worker<NotificationJobData> | null = null

/**
 * Initialize the notification queue worker
 * Must be called after Socket.IO server is ready
 */
export function initNotificationWorker(io: SocketIOServer) {
    if (worker) {
        logger.info("[Worker] Already initialized")
        return worker
    }

    worker = new Worker<NotificationJobData>(
        "notifications",
        async (job: Job<NotificationJobData>) => {
            const { type, payload, target } = job.data
            logger.info(`[Worker] Processing job ${job.id}: ${type}`)

            try {
                switch (target.type) {
                    case "user":
                        if (target.userId) {
                            io.to(`user:${target.userId}`).emit(type, payload)
                            logger.info(`[Worker] Emitted ${type} to user:${target.userId}`)
                        }
                        break
                    case "staff":
                        io.to("staff").emit(type, payload)
                        logger.info(`[Worker] Emitted ${type} to staff room`)
                        break
                    case "all":
                        io.emit(type, payload)
                        logger.info(`[Worker] Emitted ${type} to all`)
                        break
                }

                return { success: true, emittedAt: new Date().toISOString() }
            } catch (error) {
                logger.error({ err: error }, `[Worker] Failed to process job ${job.id}`)
                throw error 
            }
        },
        {
            connection: {
                url: redisUrl,
            },
            concurrency: 5,
        }
    )

    worker.on("completed", (job) => {
        logger.info(`[Worker] Job ${job.id} completed`)
    })

    worker.on("failed", (job, err) => {
        logger.error({ err }, `[Worker] Job ${job?.id} failed`)
    })

    worker.on("error", (err) => {
        logger.error({ err }, "[Worker] Error")
    })

    logger.info("[Worker] Notification worker initialized")
    return worker
}

export async function shutdownWorker() {
    if (worker) {
        await worker.close()
        worker = null
        logger.info("[Worker] Shutdown complete")
    }
}
