"use client"

import { useEffect } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { useSocket } from "@/store/socket-store"

/**
 * Hook that subscribes to WebSocket events and invalidates TanStack Query cache
 * when real-time updates arrive. This triggers automatic refetches.
 */
export function useSocketEvents() {
    const socket = useSocket()
    const queryClient = useQueryClient()

    useEffect(() => {
        if (!socket) return

        // Notification events
        const handleNotificationNew = () => {
            console.log("[Socket] Received notification:new - invalidating queries")
            queryClient.invalidateQueries({ queryKey: ["notifications"] })
            queryClient.invalidateQueries({ queryKey: ["notificationCount"] })
        }

        // Refund events
        const handleRefundNew = () => {
            console.log("[Socket] Received refund:new - invalidating queries")
            queryClient.invalidateQueries({ queryKey: ["refunds"] })
            queryClient.invalidateQueries({ queryKey: ["staffTabCounts"] })
            queryClient.invalidateQueries({ queryKey: ["analytics"] }) // Update analytics
        }

        const handleRefundUpdated = (data: { refundId: string; status: string }) => {
            console.log("[Socket] Received refund:updated:", data.refundId)
            // Invalidate specific refund query
            queryClient.invalidateQueries({ queryKey: ["refund", data.refundId] })
            // Invalidate audit logs for this refund (real-time Activity History)
            queryClient.invalidateQueries({ queryKey: ["auditLogs", data.refundId] })
            // Also invalidate list queries
            queryClient.invalidateQueries({ queryKey: ["refunds"] })
            queryClient.invalidateQueries({ queryKey: ["staffTabCounts"] })
            queryClient.invalidateQueries({ queryKey: ["student-history"] }) // Update student history
            queryClient.invalidateQueries({ queryKey: ["analytics"] }) // Update analytics

            // Invalidate notifications since status changes create notifications
            queryClient.invalidateQueries({ queryKey: ["notifications"] })
            queryClient.invalidateQueries({ queryKey: ["notificationCount"] })
        }

        const handleRefundReceipt = () => {
            console.log("[Socket] Received refund:receipt - invalidating queries")
            queryClient.invalidateQueries({ queryKey: ["refunds"] })
            queryClient.invalidateQueries({ queryKey: ["staffTabCounts"] })
        }

        // Subscribe to events
        socket.on("notification:new", handleNotificationNew)
        socket.on("refund:new", handleRefundNew)
        socket.on("refund:updated", handleRefundUpdated)
        socket.on("refund:receipt", handleRefundReceipt)

        // Cleanup
        return () => {
            socket.off("notification:new", handleNotificationNew)
            socket.off("refund:new", handleRefundNew)
            socket.off("refund:updated", handleRefundUpdated)
            socket.off("refund:receipt", handleRefundReceipt)
        }
    }, [socket, queryClient])
}
