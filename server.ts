import fs from "fs";
import { createServer } from "http";
import next from "next";
import path from "path";
import { Server as SocketIOServer } from "socket.io";
import { parse } from "url";
import { auth } from "./src/lib/auth";
import { prisma } from "./src/lib/prisma";
import { setSocketServer } from "./src/lib/socket-server";

const dev = process.env.NODE_ENV !== "production";
const hostname = "0.0.0.0"; // Always listen on all interfaces for Docker compatibility
const port = parseInt(process.env.PORT || "3000", 10);

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const httpServer = createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url!, true);

      // Do not handle socket.io requests with Next.js
      if (parsedUrl.pathname?.startsWith("/api/socket")) {
        return;
      }

      if (parsedUrl.pathname?.startsWith("/uploads/")) {
        const uploadsDir = path.join(process.cwd(), "public", "uploads");
        const requestedPath = path.join(process.cwd(), "public", parsedUrl.pathname);
        const relative = path.relative(uploadsDir, requestedPath);

        // Prevent path traversal: ensure path is inside uploadsDir and not pointing to parent directories
        if (relative.startsWith("..") || path.isAbsolute(relative)) {
          res.statusCode = 403;
          res.end("Forbidden");
          return;
        }

        // Security: Authenticate user before serving file
        try {
          const headers = new Headers();
          for (const [key, value] of Object.entries(req.headers)) {
            if (value === undefined) continue;
            if (Array.isArray(value)) {
              value.forEach((v) => headers.append(key, v));
            } else {
              headers.append(key, value);
            }
          }

          const session = await auth.api.getSession({
            headers,
          });

          if (!session) {
            res.statusCode = 403;
            res.end("Unauthorized");
            return;
          }
        } catch (e) {
          console.error("Auth check failed for upload access", e);
          res.statusCode = 500;
          res.end("Internal Error");
          return;
        }

        if (fs.existsSync(requestedPath)) {
          const ext = path.extname(requestedPath).toLowerCase();
          const mimeTypes: Record<string, string> = {
            ".jpg": "image/jpeg",
            ".jpeg": "image/jpeg",
            ".png": "image/png",
          };
          res.setHeader(
            "Content-Type",
            mimeTypes[ext] || "application/octet-stream",
          );
          fs.createReadStream(requestedPath).pipe(res);
          return;
        }
      }

      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error("Error handling request:", err);
      res.statusCode = 500;
      res.end("Internal server error");
    }
  });

  // Consolidated WebSocket Server on the default path
  const io = new SocketIOServer(httpServer, {
    path: "/api/socket",
    cors: {
      origin: true,
      methods: ["GET", "POST"],
      credentials: true,
    },
    transports: ["websocket"],
    allowEIO3: true,
    serveClient: false,
    cookie: false,
  });

  setSocketServer(io);

  io.use(async (socket, next) => {
    try {
      const sessionToken = socket.handshake.auth.sessionToken;

      if (!sessionToken) {
        console.log("[WS-AUTH] Failed: No session token");
        return next(new Error("No session token provided"));
      }

      const session = await prisma.session.findUnique({
        where: { token: sessionToken },
        include: { user: { select: { id: true, role: true } } },
      });

      if (!session || new Date(session.expiresAt) < new Date()) {
        console.log("[WS-AUTH] Failed: Invalid or expired session");
        return next(new Error("Invalid or expired session"));
      }

      socket.data.userId = session.user.id;
      socket.data.userRole = session.user.role;

      console.log(`[WS-AUTH] Success for user: ${session.user.id}`);
      next();
    } catch (error) {
      console.error("Socket auth error:", error);
      next(new Error("Authentication failed"));
    }
  });

  io.on("connection", (socket) => {
    const userId = socket.data.userId;
    const userRole = socket.data.userRole;

    console.log(`[WS] User connected: ${userId} (${userRole})`);

    socket.join(`user:${userId}`);

    if (userRole === "STAFF") {
      socket.join("staff");
      console.log(`[WS] User ${userId} joined staff room`);
    }

    socket.on("disconnect", (reason) => {
      console.log(`[WS] User disconnected: ${userId} (${reason})`);
    });
    socket.on("ping", () => {
      socket.emit("pong");
    });
  });
  (async () => {
    try {
      console.log("> Starting notification queue worker...");
      const { initNotificationWorker } = await import("@/lib/queue/worker");
      initNotificationWorker(io);
      console.log("> Notification queue worker started successfully");
    } catch (error) {
      console.error("> FAILED to start notification queue worker:", error);
    }
  })();

  httpServer.listen(port, () => {
    console.log(`> Server ready on http://${hostname}:${port}`);
    console.log(`> WebSockets active on the same port`);
  });
});
