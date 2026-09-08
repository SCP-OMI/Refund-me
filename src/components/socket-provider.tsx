"use client"

import { useEffect, ReactNode } from "react"
import { useSocketStore } from "@/store/socket-store"
import { useSocketEvents } from "@/hooks/use-socket-events"

interface SocketProviderProps {
    children: ReactNode
    sessionToken: string | null
}

/**
 * Provider component that initializes WebSocket connection for authenticated users
 * and sets up event handlers for query invalidation
 */
export function SocketProvider({ children, sessionToken }: SocketProviderProps) {
    const connect = useSocketStore((state) => state.connect)
    const disconnect = useSocketStore((state) => state.disconnect)

    // Initialize socket events handler
    useSocketEvents()

    // Connect when session token is available
    useEffect(() => {
        if (sessionToken) {
            connect(sessionToken)
        }

        return () => {
            disconnect()
        }
    }, [sessionToken, connect, disconnect])

    return <>{children}</>
}
