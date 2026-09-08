"use client"

import { create } from "zustand"
import { io, Socket } from "socket.io-client"

interface SocketState {
    socket: Socket | null
    isConnected: boolean
    connect: (sessionToken: string) => void
    disconnect: () => void
}

export const useSocketStore = create<SocketState>((set, get) => ({
    socket: null,
    isConnected: false,

    connect: (sessionToken: string) => {
        const { socket: existingSocket } = get()
        
        if (existingSocket?.connected) {
            return
        }
        if (existingSocket) {
            existingSocket.disconnect()
        }

        const wsUrl = process.env.NEXT_PUBLIC_WS_URL || (typeof window !== "undefined" ? window.location.origin : "");
        
        if (!wsUrl) {
            console.error("[Socket] No WebSocket URL configured and not running in browser.");
            return;
        }

        const newSocket = io(wsUrl, {
            auth: { sessionToken },
            transports: ["websocket"],
            path: "/api/socket",
            reconnection: true,
            reconnectionAttempts: 10,
            reconnectionDelay: 1000,
            reconnectionDelayMax: 5000,
        })

        newSocket.on("connect", () => {
            console.log("[Socket] Connected to WebSocket server")
            set({ isConnected: true })
        })

        newSocket.on("disconnect", (reason) => {
            console.log("[Socket] Disconnected:", reason)
            set({ isConnected: false })
        })

        newSocket.on("connect_error", (error) => {
            console.error("[Socket] Connection error:", error.message, error)
            set({ isConnected: false })
        })

        newSocket.on("pong", () => {
        })

        set({ socket: newSocket })
    },

    disconnect: () => {
        const { socket } = get()
        if (socket) {
            socket.disconnect()
            set({ socket: null, isConnected: false })
        }
    }
}))

export const useSocket = () => useSocketStore((state) => state.socket)
export const useSocketConnected = () => useSocketStore((state) => state.isConnected)
