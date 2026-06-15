import { io, Socket } from "socket.io-client";

let socket: Socket | null = null;

const BACKEND_URL = import.meta.env.VITE_API_URL ?? "https://smartorder-ai-qi7q.onrender.com";

export function createSocket(): Socket {
  if (!socket) {
    socket = io(BACKEND_URL, {
      path: "/api/socket.io",
      transports: ["websocket", "polling"],
    });
  }
  return socket;
}

export function getIO(): Socket | null {
  return socket;
}

export function emitOrderUpdate(businessId: string, order: unknown): void {
  if (!socket) return;
  socket.emit("order:updated", order);
}

export function emitNewOrder(businessId: string, order: unknown): void {
  if (!socket) return;
  socket.emit("order:new", order);
  socket.emit("stats:refresh");
}

export function emitStatsRefresh(businessId: string): void {
  if (!socket) return;
  socket.emit("stats:refresh");
}

export function emitNewReservation(businessId: string, reservation: unknown): void {
  if (!socket) return;
  socket.emit("reservation:new", reservation);
}

export function emitReservationUpdate(businessId: string, reservation: unknown): void {
  if (!socket) return;
  socket.emit("reservation:updated", reservation);
}
