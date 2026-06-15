import { Server as SocketIOServer } from "socket.io";
import type { Server as HttpServer } from "http";
import { logger } from "./logger";

let io: SocketIOServer | null = null;

export function initSocket(httpServer: HttpServer): SocketIOServer {
  io = new SocketIOServer(httpServer, {
    path: "/api/socket.io",
    cors: {
      origin: (origin, callback) => {
        if (!origin) return callback(null, true);
        const allowed =
          /^https:\/\/[\w-]+(\.[\w-]+)*\.vercel\.app$/.test(origin) ||
          origin === (process.env["FRONTEND_URL"] ?? "");
        callback(null, allowed ? origin : false);
      },
      methods: ["GET", "POST"],
      credentials: true,
    },
    transports: ["websocket", "polling"],
  });

  io.on("connection", (socket) => {
    logger.info({ socketId: socket.id }, "Socket connected");

    socket.on("join", (businessId: string) => {
      socket.join(`business:${businessId}`);
      logger.info({ socketId: socket.id, businessId }, "Socket joined room");
    });

    socket.on("disconnect", () => {
      logger.info({ socketId: socket.id }, "Socket disconnected");
    });
  });

  return io;
}

export function getIO(): SocketIOServer | null {
  return io;
}

export function emitOrderUpdate(businessId: string, order: unknown): void {
  if (!io) return;
  io.to(`business:${businessId}`).emit("order:updated", order);
}

export function emitNewOrder(businessId: string, order: unknown): void {
  if (!io) return;
  io.to(`business:${businessId}`).emit("order:new", order);
  io.to(`business:${businessId}`).emit("stats:refresh");
}

export function emitStatsRefresh(businessId: string): void {
  if (!io) return;
  io.to(`business:${businessId}`).emit("stats:refresh");
}

export function emitNewReservation(businessId: string, reservation: unknown): void {
  if (!io) return;
  io.to(`business:${businessId}`).emit("reservation:new", reservation);
}

export function emitReservationUpdate(businessId: string, reservation: unknown): void {
  if (!io) return;
  io.to(`business:${businessId}`).emit("reservation:updated", reservation);
}
