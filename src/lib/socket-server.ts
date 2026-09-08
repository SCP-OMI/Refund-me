import { Server as SocketIOServer } from "socket.io";

const SOCKET_SERVER_KEY = Symbol.for("app.socket.server");

type GlobalWithSocket = typeof globalThis & {
    [SOCKET_SERVER_KEY]?: SocketIOServer;
};

const globalForSocket = globalThis as GlobalWithSocket;

export const setSocketServer = (server: SocketIOServer) => {
    globalForSocket[SOCKET_SERVER_KEY] = server;
};

export const getSocketServer = (): SocketIOServer | null => {
    return globalForSocket[SOCKET_SERVER_KEY] || null;
};
