"use client"

import { ReactNode } from "react"
import { SocketProvider } from "@/components/socket-provider"

interface DashboardClientWrapperProps {
    children: ReactNode
    sessionToken: string | null
}

/**
 * Client-side wrapper for dashboard pages that initializes WebSocket connection
 * Receives session token from server layout and passes to SocketProvider
 */
export function DashboardClientWrapper({ children, sessionToken }: DashboardClientWrapperProps) {
    return (
        <SocketProvider sessionToken={sessionToken}>
            {children}
        </SocketProvider>
    )
}
